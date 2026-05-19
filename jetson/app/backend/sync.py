"""
sync.py — Itinera Terminal
Descarga el snapshot completo desde Supabase (export-terminal-data)
y reconstruye las tablas del SQLite local en una transacción atómica.

Si el sync falla por cualquier motivo, la DB anterior queda intacta.
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any

import httpx

import db
from config import SQLITE_PATH, SUPABASE_URL
from device import auth_headers

_EXPORT_URL = f"{SUPABASE_URL}/functions/v1/export-terminal-data"


# ---------------------------------------------------------------------------
# Punto de entrada principal
# ---------------------------------------------------------------------------

def sync_now() -> dict[str, Any]:
    """
    Descarga y reconstruye el SQLite local.
    Devuelve un dict con el resultado:
      { ok, exported_at, place_count, story_count, error? }
    """
    print("[sync] Iniciando sincronización con Supabase...")

    # 1. Descargar snapshot
    try:
        snapshot = _fetch_snapshot()
    except Exception as e:
        msg = f"Error descargando snapshot: {e}"
        print(f"[sync] ✗ {msg}")
        db.set_state("sync_status", "error")
        db.set_state("sync_error", str(e))
        return {"ok": False, "error": msg}

    # 2. Reconstruir SQLite
    try:
        _rebuild_db(snapshot)
    except Exception as e:
        msg = f"Error reconstruyendo SQLite: {e}"
        print(f"[sync] ✗ {msg}")
        db.set_state("sync_status", "error")
        db.set_state("sync_error", str(e))
        return {"ok": False, "error": msg}

    # 3. Actualizar estado
    exported_at = snapshot.get("exported_at", datetime.now(timezone.utc).isoformat())
    place_count = len(snapshot.get("places", []))
    story_count = len(snapshot.get("stories", []))

    db.set_state("last_sync_at", exported_at)
    db.set_state("sync_status", "ok")
    db.set_state("sync_error", None)
    db.set_state("place_count", place_count)
    db.set_state("story_count", story_count)

    print(f"[sync] ✓ {place_count} lugares · {story_count} historias · {exported_at}")
    return {
        "ok": True,
        "exported_at": exported_at,
        "place_count": place_count,
        "story_count": story_count,
    }


# ---------------------------------------------------------------------------
# Descarga del snapshot
# ---------------------------------------------------------------------------

def _fetch_snapshot() -> dict:
    headers = auth_headers()

    try:
        resp = httpx.get(_EXPORT_URL, headers=headers, timeout=60.0)
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise RuntimeError(
            f"HTTP {e.response.status_code}: {e.response.text[:300]}"
        ) from e
    except httpx.RequestError as e:
        raise RuntimeError(f"No se pudo conectar a Supabase: {e}") from e

    data = resp.json()
    if not isinstance(data, dict) or "places" not in data:
        raise RuntimeError(f"Respuesta inesperada del export: {str(data)[:200]}")

    return data


# ---------------------------------------------------------------------------
# Reconstrucción atómica del SQLite
# ---------------------------------------------------------------------------

def _rebuild_db(snapshot: dict) -> None:
    places     = snapshot.get("places", [])
    stories    = snapshot.get("stories", [])
    categories = snapshot.get("categories", [])
    regions    = snapshot.get("regions", [])
    story_places = snapshot.get("story_places", [])

    # Lookups para desnormalización
    cat_map: dict[str, dict] = {c["id"]: c for c in categories if c.get("id")}
    reg_map: dict[str, dict] = {r["id"]: r for r in regions if r.get("id")}

    # Abrimos la conexión directamente para usar una sola transacción
    con = sqlite3.connect(SQLITE_PATH, timeout=15)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=OFF")  # desactivar durante rebuild masivo

    try:
        with con:  # BEGIN / COMMIT automático; ROLLBACK si hay excepción
            # Limpiar tablas del catálogo (event_queue y device_state se preservan)
            con.execute("DELETE FROM story_places")
            con.execute("DELETE FROM stories")
            con.execute("DELETE FROM places")
            con.execute("DELETE FROM categories")
            con.execute("DELETE FROM regions")

            # Insertar en orden correcto (FK: categories/regions antes que places)
            _insert_categories(con, categories)
            _insert_regions(con, regions)
            _insert_places(con, places, cat_map, reg_map)
            _insert_stories(con, stories, reg_map)
            _insert_story_places(con, story_places)

    finally:
        con.execute("PRAGMA foreign_keys=ON")
        con.close()


# ---------------------------------------------------------------------------
# Inserciones
# ---------------------------------------------------------------------------

def _i18n(obj: Any, locale: str = "es", fallback: str = "en") -> str:
    """Extrae texto de campo i18n (dict o JSON string). Mismo helper que db.py."""
    if obj is None:
        return ""
    if isinstance(obj, str):
        try:
            obj = json.loads(obj)
        except (json.JSONDecodeError, ValueError):
            return obj
    if isinstance(obj, dict):
        return obj.get(locale) or obj.get(fallback) or ""
    return str(obj)


def _bool(val: Any) -> int:
    if isinstance(val, bool):
        return 1 if val else 0
    if isinstance(val, int):
        return 1 if val else 0
    return 0


def _insert_categories(con: sqlite3.Connection, categories: list[dict]) -> None:
    rows = []
    for c in categories:
        if not c.get("id") or not c.get("slug"):
            continue
        rows.append((
            c["id"],
            c["slug"],
            _i18n(c.get("name_i18n")),
            c.get("icon_name") or "",
            c.get("sort_order") or 0,
        ))
    con.executemany(
        "INSERT OR REPLACE INTO categories(id, slug, name_es, icon_name, sort_order) VALUES(?,?,?,?,?)",
        rows,
    )
    print(f"[sync]   categories: {len(rows)}")


def _insert_regions(con: sqlite3.Connection, regions: list[dict]) -> None:
    rows = []
    for r in regions:
        if not r.get("id") or not r.get("slug"):
            continue
        rows.append((
            r["id"],
            r["slug"],
            _i18n(r.get("name_i18n")),
        ))
    con.executemany(
        "INSERT OR REPLACE INTO regions(id, slug, name_es) VALUES(?,?,?)",
        rows,
    )
    print(f"[sync]   regions: {len(rows)}")


def _insert_places(
    con: sqlite3.Connection,
    places: list[dict],
    cat_map: dict[str, dict],
    reg_map: dict[str, dict],
) -> None:
    rows = []
    for p in places:
        if not p.get("id") or not p.get("slug"):
            continue

        cat_id = p.get("category_id") or ""
        reg_id = p.get("region_id") or ""
        cat = cat_map.get(cat_id, {})
        reg = reg_map.get(reg_id, {})

        # lat/lng: la migración 20260515 los expone como columnas generadas.
        # Si no vienen como columnas directas, intentamos extraer de location.
        lat = p.get("lat")
        lng = p.get("lng")
        if lat is None and p.get("location"):
            loc = p["location"]
            if isinstance(loc, dict):
                coords = loc.get("coordinates", [])
                if len(coords) >= 2:
                    lng, lat = coords[0], coords[1]

        rows.append((
            p["id"],
            p["slug"],
            _i18n(p.get("name_i18n")),
            _i18n(p.get("name_i18n"), "en"),
            _i18n(p.get("description_i18n")),
            _i18n(p.get("description_i18n"), "en"),
            _i18n(p.get("ai_summary_i18n")),
            _i18n(p.get("ai_summary_i18n"), "en"),
            _i18n(p.get("ai_tips_i18n")),
            _i18n(p.get("ai_tips_i18n"), "en"),
            _i18n(p.get("address_i18n")),
            p.get("phone") or "",
            p.get("website") or "",
            _i18n(p.get("hours")),
            lat,
            lng,
            p.get("price_level") or 0,
            _bool(p.get("accessibility")),
            _bool(p.get("local_favorite")),
            _bool(p.get("featured")),
            p.get("aggregated_rating") or 0.0,
            p.get("review_count") or 0,
            cat_id,
            reg_id,
            cat.get("slug") or "",
            _i18n(cat.get("name_i18n")),
            reg.get("slug") or "",
            _i18n(reg.get("name_i18n")),
        ))

    con.executemany(
        """INSERT OR REPLACE INTO places(
            id, slug,
            name_es, name_en,
            description_es, description_en,
            ai_summary_es, ai_summary_en,
            ai_tips_es, ai_tips_en,
            address_es, phone, website, hours_es,
            lat, lng,
            price_level, accessibility, local_favorite, featured,
            aggregated_rating, review_count,
            category_id, region_id,
            category_slug, category_name_es,
            region_slug, region_name_es
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        rows,
    )
    print(f"[sync]   places: {len(rows)}")


def _insert_stories(
    con: sqlite3.Connection,
    stories: list[dict],
    reg_map: dict[str, dict],
) -> None:
    rows = []
    for s in stories:
        if not s.get("id") or not s.get("slug"):
            continue
        reg_id = s.get("region_id") or ""
        reg = reg_map.get(reg_id, {})
        rows.append((
            s["id"],
            s["slug"],
            _i18n(s.get("title_i18n")),
            _i18n(s.get("title_i18n"), "en"),
            _i18n(s.get("summary_i18n")),
            _i18n(s.get("summary_i18n"), "en"),
            _i18n(s.get("body_markdown_i18n")),
            reg_id,
            reg.get("slug") or "",
            _i18n(reg.get("name_i18n")),
            _bool(s.get("featured")),
        ))
    con.executemany(
        """INSERT OR REPLACE INTO stories(
            id, slug,
            title_es, title_en,
            summary_es, summary_en,
            body_markdown_es,
            region_id, region_slug, region_name_es,
            featured
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        rows,
    )
    print(f"[sync]   stories: {len(rows)}")


def _insert_story_places(con: sqlite3.Connection, story_places: list[dict]) -> None:
    rows = [
        (sp["story_id"], sp["place_id"])
        for sp in story_places
        if sp.get("story_id") and sp.get("place_id")
    ]
    con.executemany(
        "INSERT OR IGNORE INTO story_places(story_id, place_id) VALUES(?,?)",
        rows,
    )
    print(f"[sync]   story_places: {len(rows)}")
