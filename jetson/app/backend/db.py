"""
db.py — Itinera Terminal
Esquema SQLite local + queries. Todo el acceso a datos pasa por aquí.
El esquema aplana los campos JSONB de Supabase para trabajar con SQLite nativo.
"""
from __future__ import annotations

import json
import math
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Generator

from config import SQLITE_PATH

# ---------------------------------------------------------------------------
# Conexión
# ---------------------------------------------------------------------------

@contextmanager
def _conn() -> Generator[sqlite3.Connection, None, None]:
    """Context manager: abre conexión, devuelve rows como dicts, cierra."""
    con = sqlite3.connect(SQLITE_PATH, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")   # mejor concurrencia lectura/escritura
    con.execute("PRAGMA foreign_keys=ON")
    try:
        yield con
    finally:
        con.close()


# ---------------------------------------------------------------------------
# Inicialización del esquema
# ---------------------------------------------------------------------------

_SCHEMA = """
-- ── Catálogo (reconstruido en cada sync) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    slug        TEXT UNIQUE NOT NULL,
    name_es     TEXT,
    icon_name   TEXT,
    sort_order  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS regions (
    id      TEXT PRIMARY KEY,
    slug    TEXT UNIQUE NOT NULL,
    name_es TEXT
);

CREATE TABLE IF NOT EXISTS places (
    id                 TEXT PRIMARY KEY,
    slug               TEXT UNIQUE NOT NULL,
    -- Nombres e i18n (aplanados desde JSONB)
    name_es            TEXT,
    name_en            TEXT,
    description_es     TEXT,
    description_en     TEXT,
    ai_summary_es      TEXT,
    ai_summary_en      TEXT,
    ai_tips_es         TEXT,
    ai_tips_en         TEXT,
    address_es         TEXT,
    -- Contacto
    phone              TEXT,
    website            TEXT,
    hours_es           TEXT,
    -- Geo
    lat                REAL,
    lng                REAL,
    -- Atributos
    price_level        INTEGER DEFAULT 0,
    accessibility      INTEGER DEFAULT 0,
    local_favorite     INTEGER DEFAULT 0,
    featured           INTEGER DEFAULT 0,
    aggregated_rating  REAL DEFAULT 0,
    review_count       INTEGER DEFAULT 0,
    -- Relaciones (IDs + datos desnormalizados para evitar joins)
    category_id        TEXT,
    region_id          TEXT,
    category_slug      TEXT,
    category_name_es   TEXT,
    region_slug        TEXT,
    region_name_es     TEXT,
    -- Embedding semántico (vacío hasta Sprint 6)
    embedding          BLOB
);

CREATE INDEX IF NOT EXISTS places_category_idx ON places (category_slug);
CREATE INDEX IF NOT EXISTS places_region_idx   ON places (region_slug);
CREATE INDEX IF NOT EXISTS places_featured_idx ON places (featured);

CREATE TABLE IF NOT EXISTS stories (
    id               TEXT PRIMARY KEY,
    slug             TEXT UNIQUE NOT NULL,
    title_es         TEXT,
    title_en         TEXT,
    summary_es       TEXT,
    summary_en       TEXT,
    body_markdown_es TEXT,
    region_id        TEXT,
    region_slug      TEXT,
    region_name_es   TEXT,
    featured         INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS stories_region_idx ON stories (region_slug);

CREATE TABLE IF NOT EXISTS story_places (
    story_id  TEXT NOT NULL,
    place_id  TEXT NOT NULL,
    PRIMARY KEY (story_id, place_id)
);

-- ── Estado interno del dispositivo ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS device_state (
    key   TEXT PRIMARY KEY,
    value TEXT    -- almacenado como JSON string
);

-- ── Cola de telemetría offline ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_queue (
    rowid            INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id         TEXT UNIQUE NOT NULL,
    session_id       TEXT,
    occurred_at      TEXT,
    intent           TEXT,
    entities         TEXT DEFAULT '{}',
    place_ids_shown  TEXT DEFAULT '[]',
    selected_place_id TEXT,
    lat              REAL,
    lng              REAL,
    duration_ms      INTEGER,
    payload          TEXT DEFAULT '{}',
    flushed          INTEGER DEFAULT 0,
    created_at       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS event_queue_flushed_idx ON event_queue (flushed);
"""


def init_db() -> None:
    """Crea todas las tablas si no existen. Idempotente."""
    with _conn() as con:
        con.executescript(_SCHEMA)
        con.commit()
    print(f"[db] SQLite inicializada en {SQLITE_PATH}")


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _i18n(obj: Any, locale: str = "es", fallback: str = "en") -> str:
    """Extrae texto de un campo i18n (dict o JSON string)."""
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


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distancia en km entre dos coordenadas."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)


# ---------------------------------------------------------------------------
# Estado del device
# ---------------------------------------------------------------------------

def get_state(key: str) -> Any:
    with _conn() as con:
        row = con.execute("SELECT value FROM device_state WHERE key = ?", (key,)).fetchone()
    if row is None:
        return None
    try:
        return json.loads(row["value"])
    except (json.JSONDecodeError, TypeError):
        return row["value"]


def set_state(key: str, value: Any) -> None:
    with _conn() as con:
        con.execute(
            "INSERT INTO device_state(key, value) VALUES(?,?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, json.dumps(value, ensure_ascii=False)),
        )
        con.commit()


# ---------------------------------------------------------------------------
# Queries de catálogo
# ---------------------------------------------------------------------------

def list_categories() -> list[dict]:
    with _conn() as con:
        rows = con.execute(
            "SELECT id, slug, name_es, icon_name FROM categories ORDER BY sort_order"
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


def list_regions() -> list[dict]:
    with _conn() as con:
        rows = con.execute(
            "SELECT id, slug, name_es FROM regions ORDER BY name_es"
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Queries de places
# ---------------------------------------------------------------------------

def _places_base_select() -> str:
    return """
        SELECT id, slug,
               name_es, name_en,
               ai_summary_es, ai_summary_en,
               ai_tips_es, ai_tips_en,
               address_es, phone, website, hours_es,
               lat, lng, price_level, accessibility,
               local_favorite, featured,
               aggregated_rating, review_count,
               category_id, category_slug, category_name_es,
               region_id, region_slug, region_name_es
        FROM places
    """


def list_places(
    limit: int = 20,
    category_slug: str | None = None,
    region_slug: str | None = None,
    featured_only: bool = False,
    locale: str = "es",
) -> list[dict]:
    conditions: list[str] = []
    params: list[Any] = []

    if category_slug:
        conditions.append("category_slug = ?")
        params.append(category_slug)
    if region_slug:
        conditions.append("region_slug = ?")
        params.append(region_slug)
    if featured_only:
        conditions.append("featured = 1")

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    sql = f"{_places_base_select()} {where} ORDER BY featured DESC, aggregated_rating DESC LIMIT ?"
    params.append(limit)

    with _conn() as con:
        rows = con.execute(sql, params).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_place(slug: str) -> dict | None:
    with _conn() as con:
        row = con.execute(
            f"""
            SELECT id, slug,
                   name_es, name_en,
                   description_es, description_en,
                   ai_summary_es, ai_summary_en,
                   ai_tips_es, ai_tips_en,
                   address_es, phone, website, hours_es,
                   lat, lng, price_level, accessibility,
                   local_favorite, featured,
                   aggregated_rating, review_count,
                   category_id, category_slug, category_name_es,
                   region_id, region_slug, region_name_es
            FROM places WHERE slug = ?
            """,
            (slug,),
        ).fetchone()
    return _row_to_dict(row) if row else None


def search_places_text(query: str, limit: int = 10) -> list[dict]:
    """Búsqueda simple por texto en nombre y descripción (LIKE). Sprint 6 agrega semántica."""
    pattern = f"%{query}%"
    sql = f"""
        {_places_base_select()}
        WHERE name_es LIKE ?
           OR name_en LIKE ?
           OR ai_summary_es LIKE ?
           OR description_es LIKE ?
        ORDER BY
            CASE WHEN name_es LIKE ? THEN 0 ELSE 1 END,
            aggregated_rating DESC
        LIMIT ?
    """
    params = [pattern, pattern, pattern, pattern, f"{query}%", limit]
    with _conn() as con:
        rows = con.execute(sql, params).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_places_near(
    lat: float,
    lng: float,
    radius_km: float = 100,
    limit: int = 10,
    category_slug: str | None = None,
) -> list[dict]:
    """Distancia Haversine calculada en Python (SQLite no tiene funciones geo)."""
    conditions = ["lat IS NOT NULL", "lng IS NOT NULL"]
    params: list[Any] = []

    if category_slug:
        conditions.append("category_slug = ?")
        params.append(category_slug)

    where = "WHERE " + " AND ".join(conditions)
    sql = f"{_places_base_select()} {where}"

    with _conn() as con:
        rows = con.execute(sql, params).fetchall()

    results = []
    for row in rows:
        d = _haversine_km(lat, lng, row["lat"], row["lng"])
        if d <= radius_km:
            r = _row_to_dict(row)
            r["distance_km"] = round(d, 2)
            results.append(r)

    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]


# ---------------------------------------------------------------------------
# Queries de stories
# ---------------------------------------------------------------------------

def list_stories(
    limit: int = 10,
    region_slug: str | None = None,
    featured_only: bool = False,
) -> list[dict]:
    conditions: list[str] = []
    params: list[Any] = []

    if region_slug:
        conditions.append("region_slug = ?")
        params.append(region_slug)
    if featured_only:
        conditions.append("featured = 1")

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    sql = f"""
        SELECT id, slug, title_es, title_en, summary_es,
               region_slug, region_name_es, featured
        FROM stories {where}
        ORDER BY featured DESC, title_es
        LIMIT ?
    """
    params.append(limit)

    with _conn() as con:
        rows = con.execute(sql, params).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_story(slug: str) -> dict | None:
    with _conn() as con:
        row = con.execute(
            """
            SELECT id, slug, title_es, title_en,
                   summary_es, summary_en,
                   body_markdown_es,
                   region_slug, region_name_es, featured
            FROM stories WHERE slug = ?
            """,
            (slug,),
        ).fetchone()
    return _row_to_dict(row) if row else None


def get_stories_for_place(place_id: str) -> list[dict]:
    with _conn() as con:
        rows = con.execute(
            """
            SELECT s.id, s.slug, s.title_es, s.summary_es, s.region_name_es, s.featured
            FROM stories s
            JOIN story_places sp ON sp.story_id = s.id
            WHERE sp.place_id = ?
            ORDER BY s.featured DESC
            """,
            (place_id,),
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_places_for_story(story_id: str) -> list[dict]:
    with _conn() as con:
        rows = con.execute(
            f"""
            SELECT p.id, p.slug, p.name_es, p.ai_summary_es,
                   p.lat, p.lng, p.category_slug, p.region_name_es,
                   p.aggregated_rating
            FROM places p
            JOIN story_places sp ON sp.place_id = p.id
            WHERE sp.story_id = ?
            ORDER BY p.featured DESC
            """,
            (story_id,),
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Cola de eventos
# ---------------------------------------------------------------------------

def queue_event(
    event_id: str,
    session_id: str | None = None,
    occurred_at: str | None = None,
    intent: str = "other",
    entities: dict | None = None,
    place_ids_shown: list[str] | None = None,
    selected_place_id: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    duration_ms: int | None = None,
    payload: dict | None = None,
) -> None:
    with _conn() as con:
        con.execute(
            """
            INSERT OR IGNORE INTO event_queue
              (event_id, session_id, occurred_at, intent, entities,
               place_ids_shown, selected_place_id, lat, lng, duration_ms, payload)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                event_id,
                session_id,
                occurred_at,
                intent,
                json.dumps(entities or {}, ensure_ascii=False),
                json.dumps(place_ids_shown or [], ensure_ascii=False),
                selected_place_id,
                lat,
                lng,
                duration_ms,
                json.dumps(payload or {}, ensure_ascii=False),
            ),
        )
        con.commit()


def get_pending_events(limit: int = 50) -> list[dict]:
    with _conn() as con:
        rows = con.execute(
            "SELECT * FROM event_queue WHERE flushed = 0 ORDER BY rowid LIMIT ?",
            (limit,),
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


def mark_events_flushed(rowids: list[int]) -> None:
    if not rowids:
        return
    placeholders = ",".join("?" * len(rowids))
    with _conn() as con:
        con.execute(
            f"UPDATE event_queue SET flushed = 1 WHERE rowid IN ({placeholders})",
            rowids,
        )
        con.commit()


def count_pending_events() -> int:
    with _conn() as con:
        row = con.execute(
            "SELECT COUNT(*) AS n FROM event_queue WHERE flushed = 0"
        ).fetchone()
    return row["n"] if row else 0
