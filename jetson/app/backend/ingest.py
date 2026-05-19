"""
ingest.py — Itinera Terminal
Cola offline de eventos de telemetría → flush a Supabase cuando hay red.

Todo evento pasa PRIMERO por SQLite (event_queue), nunca directo a Supabase.
Esto garantiza que ninguna interacción se pierde si cae la red en el stand.
El flush envía hasta 50 eventos en batch (la Edge Function acepta arrays).
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

import db
from config import SUPABASE_URL, WRO_VENUE_LAT, WRO_VENUE_LNG
from device import auth_headers

_INGEST_URL = f"{SUPABASE_URL}/functions/v1/ingest-terminal-events"
_BATCH_SIZE = 50


# ---------------------------------------------------------------------------
# API pública — registrar evento
# ---------------------------------------------------------------------------

def record(
    intent: str,
    session_id: str | None = None,
    entities: dict | None = None,
    place_ids_shown: list[str] | None = None,
    selected_place_id: str | None = None,
    duration_ms: int | None = None,
    lat: float | None = None,
    lng: float | None = None,
    payload: dict | None = None,
) -> str:
    """
    Encola un evento de telemetría en SQLite.
    Devuelve el event_id generado (UUID).
    No hace ninguna llamada de red — el flush ocurre en background.
    """
    event_id = str(uuid.uuid4())
    occurred_at = datetime.now(timezone.utc).isoformat()

    db.queue_event(
        event_id=event_id,
        session_id=session_id,
        occurred_at=occurred_at,
        intent=intent,
        entities=entities or {},
        place_ids_shown=place_ids_shown or [],
        selected_place_id=selected_place_id,
        lat=lat if lat is not None else WRO_VENUE_LAT,
        lng=lng if lng is not None else WRO_VENUE_LNG,
        duration_ms=duration_ms,
        payload=payload or {},
    )
    return event_id


# ---------------------------------------------------------------------------
# Flush a Supabase
# ---------------------------------------------------------------------------

def flush_pending() -> dict[str, int]:
    """
    Envía eventos pendientes a Supabase en batches de 50.
    Devuelve { flushed, skipped, remaining }.
    Llamado por el background task en main.py cuando hay conectividad.
    """
    pending = db.get_pending_events(limit=_BATCH_SIZE)
    if not pending:
        return {"flushed": 0, "skipped": 0, "remaining": 0}

    # Construir payload para el Edge Function
    events_payload = []
    rowids = []
    for ev in pending:
        rowids.append(ev["rowid"])
        events_payload.append({
            "event_id":          ev["event_id"],
            "occurred_at":       ev["occurred_at"],
            "intent":            ev["intent"],
            "entities":          _parse_json(ev["entities"], {}),
            "place_ids_shown":   _parse_json(ev["place_ids_shown"], []),
            "selected_place_id": ev["selected_place_id"],
            "lat":               ev["lat"],
            "lng":               ev["lng"],
            "duration_ms":       ev["duration_ms"],
            "session_id":        ev["session_id"],
            "payload":           _parse_json(ev["payload"], {}),
        })

    try:
        resp = httpx.post(
            _INGEST_URL,
            headers=auth_headers(),
            json=events_payload,
            timeout=20.0,
        )
        resp.raise_for_status()
        result = resp.json()
    except httpx.HTTPStatusError as e:
        print(f"[ingest] ✗ HTTP {e.response.status_code}: {e.response.text[:200]}")
        return {"flushed": 0, "skipped": len(pending), "remaining": db.count_pending_events()}
    except httpx.RequestError as e:
        print(f"[ingest] ✗ Error de red: {e}")
        return {"flushed": 0, "skipped": len(pending), "remaining": db.count_pending_events()}

    # Marcar como enviados
    db.mark_events_flushed(rowids)

    ingested = result.get("ingested", 0)
    skipped  = result.get("skipped", 0)
    remaining = db.count_pending_events()

    print(f"[ingest] ✓ Enviados: {ingested} · Saltados: {skipped} · Restantes: {remaining}")
    return {"flushed": ingested, "skipped": skipped, "remaining": remaining}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_json(val: Any, default: Any) -> Any:
    if val is None:
        return default
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return default
