"""
device.py — Itinera Terminal
Registro único del dispositivo con Supabase + gestión de credenciales locales.

Flujo:
  Primera ejecución → genera token → llama device-register → guarda device.json
  Ejecuciones siguientes → lee device.json → listo

El token se genera en el cliente (secrets.token_hex), el servidor lo hashea.
Guardamos el plaintext porque lo necesitamos en cada request de autenticación.
"""
from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from pathlib import Path

import httpx

from config import (
    DEVICE_CREDS_PATH,
    DEVICE_LABEL,
    DEVICE_SETUP_SECRET,
    SUPABASE_URL,
)

# Credenciales cargadas en memoria una vez en startup
_device_id: str | None = None
_device_token: str | None = None


# ---------------------------------------------------------------------------
# Carga / registro
# ---------------------------------------------------------------------------

def load_or_register() -> tuple[str, str]:
    """
    Devuelve (device_id, device_token).
    - Si device.json existe: lo carga.
    - Si no existe: registra el device en Supabase y guarda device.json.
    Llama esto una sola vez al inicio; luego usa get_credentials().
    """
    global _device_id, _device_token

    path = Path(DEVICE_CREDS_PATH)

    if path.is_file():
        _device_id, _device_token = _load_from_file(path)
        print(f"[device] Credenciales cargadas — device_id: {_device_id[:8]}...")
    else:
        print("[device] Primera ejecución — registrando dispositivo en Supabase...")
        _device_id, _device_token = _register()
        _save_to_file(path, _device_id, _device_token)
        print(f"[device] Registrado — device_id: {_device_id}")
        print(f"[device] Credenciales guardadas en {path}")
        print("[device] IMPORTANTE: No commitear device.json al repositorio.")

    return _device_id, _device_token


def get_credentials() -> tuple[str, str]:
    """Devuelve credenciales ya cargadas. Llama load_or_register() primero."""
    if _device_id is None or _device_token is None:
        raise RuntimeError(
            "Credenciales no cargadas. Llama load_or_register() durante el startup."
        )
    return _device_id, _device_token


# ---------------------------------------------------------------------------
# Registro en Supabase
# ---------------------------------------------------------------------------

def _register() -> tuple[str, str]:
    if not DEVICE_SETUP_SECRET:
        raise RuntimeError(
            "DEVICE_SETUP_SECRET no está configurado en .env.\n"
            "Es necesario para el primer registro del dispositivo.\n"
            "Después de registrar puedes eliminarlo del .env."
        )

    token = secrets.token_hex(32)  # 64 chars hex, 256 bits de entropía

    url = f"{SUPABASE_URL}/functions/v1/device-register"
    headers = {
        "x-device-setup-secret": DEVICE_SETUP_SECRET,
        "Content-Type": "application/json",
    }
    body = {"label": DEVICE_LABEL, "token": token}

    try:
        resp = httpx.post(url, headers=headers, json=body, timeout=30.0)
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        detail = e.response.text
        raise RuntimeError(
            f"Error registrando dispositivo (HTTP {e.response.status_code}): {detail}"
        ) from e
    except httpx.RequestError as e:
        raise RuntimeError(
            f"No se pudo conectar a Supabase para registrar: {e}\n"
            "Verifica tu conexión a internet y SUPABASE_URL en .env"
        ) from e

    data = resp.json()
    device_id = data.get("device_id")
    if not device_id:
        raise RuntimeError(f"Respuesta inesperada de device-register: {data}")

    return device_id, token


# ---------------------------------------------------------------------------
# Persistencia local
# ---------------------------------------------------------------------------

def _save_to_file(path: Path, device_id: str, device_token: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = {
        "device_id": device_id,
        "device_token": device_token,
        "label": DEVICE_LABEL,
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }
    path.write_text(json.dumps(content, indent=2), encoding="utf-8")

    # En sistemas Unix: restricción de permisos (solo owner puede leer)
    try:
        import stat
        path.chmod(stat.S_IRUSR | stat.S_IWUSR)  # 600
    except (AttributeError, OSError):
        pass  # Windows no soporta chmod, ignorar silenciosamente


def _load_from_file(path: Path) -> tuple[str, str]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        raise RuntimeError(
            f"No se puede leer {path}: {e}\n"
            "Elimina device.json para forzar un nuevo registro."
        ) from e

    device_id = data.get("device_id", "").strip()
    device_token = data.get("device_token", "").strip()

    if not device_id or not device_token:
        raise RuntimeError(
            f"device.json está incompleto o corrupto ({path}).\n"
            "Elimina el archivo para forzar un nuevo registro."
        )

    return device_id, device_token


# ---------------------------------------------------------------------------
# Headers de autenticación (usados por sync.py e ingest.py)
# ---------------------------------------------------------------------------

def auth_headers() -> dict[str, str]:
    """Headers para llamadas autenticadas de device a Edge Functions."""
    device_id, device_token = get_credentials()
    return {
        "Authorization": f"Bearer {device_token}",
        "x-device-id": device_id,
        "Content-Type": "application/json",
    }
