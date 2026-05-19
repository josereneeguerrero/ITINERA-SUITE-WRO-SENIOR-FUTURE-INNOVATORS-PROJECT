"""
main.py — Itinera Terminal
FastAPI server: startup, background tasks, endpoints del Sprint 0.

Secuencia de arranque:
  1. Cargar config (.env)
  2. Inicializar SQLite (CREATE TABLE IF NOT EXISTS)
  3. Registrar / cargar credenciales del device
  4. Verificar conectividad
  5. Si online: sync inicial
  6. Iniciar FastAPI + background tasks
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import db
import device
import ingest
import sync
from config import (
    CONNECTIVITY_CHECK_INTERVAL_SEC,
    CONNECTIVITY_CHECK_URL,
    EVENT_FLUSH_INTERVAL_SEC,
    HOST,
    PORT,
    SUPABASE_ANON_KEY,
    SUPABASE_URL,
    SYNC_INTERVAL_SEC,
    WRO_VENUE_LAT,
    WRO_VENUE_LNG,
)

# ---------------------------------------------------------------------------
# Estado global de conectividad (compartido entre background tasks y endpoints)
# ---------------------------------------------------------------------------

_online: bool = False


def is_online() -> bool:
    return _online


def _set_online(val: bool) -> None:
    global _online
    _online = val


# ---------------------------------------------------------------------------
# Verificación de conectividad
# ---------------------------------------------------------------------------

async def _check_connectivity() -> bool:
    """HEAD request silencioso a Supabase. True = hay red."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.head(
                CONNECTIVITY_CHECK_URL,
                headers={"apikey": SUPABASE_ANON_KEY},
            )
            return resp.status_code < 500
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Background tasks
# ---------------------------------------------------------------------------

async def _connectivity_monitor() -> None:
    """Cada 30s verifica si hay red. Si cambia el estado, loguea y actúa."""
    prev_online = None
    while True:
        online = await _check_connectivity()
        _set_online(online)

        if online != prev_online:
            status = "ONLINE ✓" if online else "OFFLINE ✗"
            print(f"[connectivity] {status}")
            if online and prev_online is False:
                # Volvió la red → sync inmediato
                print("[connectivity] Red recuperada — sincronizando...")
                await asyncio.get_event_loop().run_in_executor(None, sync.sync_now)

        prev_online = online
        await asyncio.sleep(CONNECTIVITY_CHECK_INTERVAL_SEC)


async def _sync_scheduler() -> None:
    """Cada SYNC_INTERVAL_SEC sincroniza si hay red."""
    await asyncio.sleep(SYNC_INTERVAL_SEC)  # primer sync ya se hizo en startup
    while True:
        if is_online():
            await asyncio.get_event_loop().run_in_executor(None, sync.sync_now)
        await asyncio.sleep(SYNC_INTERVAL_SEC)


async def _event_flusher() -> None:
    """Cada EVENT_FLUSH_INTERVAL_SEC envía eventos pendientes si hay red."""
    while True:
        await asyncio.sleep(EVENT_FLUSH_INTERVAL_SEC)
        if is_online() and db.count_pending_events() > 0:
            await asyncio.get_event_loop().run_in_executor(None, ingest.flush_pending)


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    print("\n" + "═" * 50)
    print("  Itinera Terminal — iniciando")
    print("═" * 50)

    # 1. SQLite
    db.init_db()

    # 2. Device credentials
    device.load_or_register()

    # 3. Conectividad inicial
    online = await _check_connectivity()
    _set_online(online)
    print(f"[startup] Conectividad: {'ONLINE' if online else 'OFFLINE'}")

    # 4. Sync inicial si hay red
    if online:
        await asyncio.get_event_loop().run_in_executor(None, sync.sync_now)
    else:
        place_count = db.get_state("place_count") or 0
        print(f"[startup] Sin red — sirviendo desde SQLite ({place_count} lugares)")

    # 5. Registrar evento de inicio de sesión
    ingest.record(
        intent="sesion_inicio",
        entities={"locale": "es", "build": "sprint-0"},
        payload={"online_at_start": online},
    )

    # 6. Background tasks
    tasks = [
        asyncio.create_task(_connectivity_monitor()),
        asyncio.create_task(_sync_scheduler()),
        asyncio.create_task(_event_flusher()),
    ]

    print(f"[startup] Servidor listo en http://{HOST}:{PORT}")
    print("═" * 50 + "\n")

    yield  # ← FastAPI sirve requests aquí

    # ── Shutdown ─────────────────────────────────────────────────────────────
    print("\n[shutdown] Cerrando...")
    for task in tasks:
        task.cancel()
    # Intentar flush final antes de apagar
    if is_online() and db.count_pending_events() > 0:
        await asyncio.get_event_loop().run_in_executor(None, ingest.flush_pending)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Itinera Terminal API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",   # útil para desarrollo; desactivar en producción
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Solo localhost, pero "*" facilita desarrollo
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir el frontend (Sprint 1+) desde jetson/app/frontend/
# Se monta DESPUÉS de los endpoints /api para que no colisionen.
# StaticFiles se agrega al final para no bloquear si la carpeta no existe aún.
try:
    from pathlib import Path
    _FRONTEND = Path(__file__).parent.parent / "frontend"
    if _FRONTEND.is_dir():
        app.mount("/", StaticFiles(directory=str(_FRONTEND), html=True), name="frontend")
except Exception:
    pass  # Frontend no construido todavía (Sprint 0 normal)


# ---------------------------------------------------------------------------
# Modelos Pydantic
# ---------------------------------------------------------------------------

class EventIn(BaseModel):
    intent: str
    session_id: str | None = None
    entities: dict = {}
    place_ids_shown: list[str] = []
    selected_place_id: str | None = None
    duration_ms: int | None = None
    lat: float | None = None
    lng: float | None = None
    payload: dict = {}


class SyncResult(BaseModel):
    ok: bool
    exported_at: str | None = None
    place_count: int | None = None
    story_count: int | None = None
    error: str | None = None


# ---------------------------------------------------------------------------
# Endpoints — Sistema
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health() -> dict[str, Any]:
    """Estado del sistema: conectividad, última sync, conteos."""
    device_id, _ = device.get_credentials()
    return {
        "status": "ok",
        "online": is_online(),
        "device_id": device_id[:8] + "...",   # parcial por seguridad
        "last_sync_at": db.get_state("last_sync_at"),
        "sync_status": db.get_state("sync_status") or "never",
        "sync_error": db.get_state("sync_error"),
        "place_count": db.get_state("place_count") or 0,
        "story_count": db.get_state("story_count") or 0,
        "pending_events": db.count_pending_events(),
        "server_time": datetime.now(timezone.utc).isoformat(),
        "venue_lat": WRO_VENUE_LAT,
        "venue_lng": WRO_VENUE_LNG,
    }


@app.post("/api/sync", response_model=SyncResult)
async def trigger_sync() -> SyncResult:
    """Dispara una sincronización manual. Requiere red."""
    if not is_online():
        raise HTTPException(
            status_code=503,
            detail="Sin conexión a internet. El sync no puede ejecutarse."
        )
    result = await asyncio.get_event_loop().run_in_executor(None, sync.sync_now)
    return SyncResult(**result)


# ---------------------------------------------------------------------------
# Endpoints — Catálogo
# ---------------------------------------------------------------------------

@app.get("/api/categories")
def get_categories() -> list[dict]:
    """Lista de categorías disponibles."""
    return db.list_categories()


@app.get("/api/regions")
def get_regions() -> list[dict]:
    """Lista de regiones disponibles."""
    return db.list_regions()


# ---------------------------------------------------------------------------
# Endpoints — Places
# ---------------------------------------------------------------------------

@app.get("/api/places")
def get_places(
    limit: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None, description="Slug de categoría"),
    region: str | None = Query(default=None, description="Slug de región"),
    featured: bool | None = Query(default=None),
    search: str | None = Query(default=None, description="Búsqueda por texto"),
    near: bool = Query(default=False, description="Ordenar por distancia al venue WRO"),
    radius_km: float = Query(default=100.0),
) -> list[dict]:
    """
    Lista lugares con filtros opcionales.
    ?category=heritage&region=copan&featured=true&search=ruinas&near=true
    """
    if search and search.strip():
        return db.search_places_text(search.strip(), limit=limit)

    if near:
        return db.get_places_near(
            WRO_VENUE_LAT, WRO_VENUE_LNG,
            radius_km=radius_km,
            limit=limit,
            category_slug=category,
        )

    return db.list_places(
        limit=limit,
        category_slug=category,
        region_slug=region,
        featured_only=bool(featured),
    )


@app.get("/api/places/{slug}")
def get_place(slug: str) -> dict:
    """Detalle completo de un lugar + historias relacionadas."""
    place = db.get_place(slug)
    if not place:
        raise HTTPException(status_code=404, detail=f"Lugar no encontrado: {slug}")

    place["stories"] = db.get_stories_for_place(place["id"])
    return place


# ---------------------------------------------------------------------------
# Endpoints — Stories
# ---------------------------------------------------------------------------

@app.get("/api/stories")
def get_stories(
    limit: int = Query(default=10, ge=1, le=50),
    region: str | None = Query(default=None),
    featured: bool | None = Query(default=None),
) -> list[dict]:
    return db.list_stories(
        limit=limit,
        region_slug=region,
        featured_only=bool(featured),
    )


@app.get("/api/stories/{slug}")
def get_story(slug: str) -> dict:
    """Detalle completo de una historia + lugares relacionados."""
    story = db.get_story(slug)
    if not story:
        raise HTTPException(status_code=404, detail=f"Historia no encontrada: {slug}")

    story["places"] = db.get_places_for_story(story["id"])
    return story


# ---------------------------------------------------------------------------
# Endpoints — Telemetría
# ---------------------------------------------------------------------------

@app.post("/api/events")
def post_event(event: EventIn) -> dict:
    """
    El frontend registra una interacción.
    Se guarda en SQLite y se envía a Supabase cuando hay red.
    """
    event_id = ingest.record(
        intent=event.intent,
        session_id=event.session_id,
        entities=event.entities,
        place_ids_shown=event.place_ids_shown,
        selected_place_id=event.selected_place_id,
        duration_ms=event.duration_ms,
        lat=event.lat,
        lng=event.lng,
        payload=event.payload,
    )
    return {"ok": True, "event_id": event_id, "queued": True}


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=False,   # reload=True útil en desarrollo local, False en Jetson
        log_level="info",
    )
