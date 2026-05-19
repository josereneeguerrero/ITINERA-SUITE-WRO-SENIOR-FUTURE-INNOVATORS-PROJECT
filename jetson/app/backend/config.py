"""
config.py — Itinera Terminal
Carga variables de entorno y expone constantes globales.
Un solo lugar para cambiar cualquier valor del sistema.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Busca .env en jetson/app/ (un nivel arriba del backend)
_APP_DIR = Path(__file__).resolve().parent.parent
_ENV_PATH = _APP_DIR / ".env"
load_dotenv(_ENV_PATH)


def _require(key: str) -> str:
    val = os.environ.get(key, "").strip()
    if not val:
        raise RuntimeError(
            f"Variable de entorno requerida no encontrada: {key}\n"
            f"Copia jetson/app/.env.example a jetson/app/.env y complétala."
        )
    return val


def _optional(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL: str = _require("SUPABASE_URL")
SUPABASE_ANON_KEY: str = _require("SUPABASE_ANON_KEY")

# Solo necesario en la primera ejecución (registro del device).
# Puede borrarse del .env después de registrar.
DEVICE_SETUP_SECRET: str = _optional("DEVICE_SETUP_SECRET")

# ── IA ────────────────────────────────────────────────────────────────────────
GROQ_API_KEY: str = _optional("GROQ_API_KEY")
ELEVENLABS_API_KEY: str = _optional("ELEVENLABS_API_KEY")

# ── Device ────────────────────────────────────────────────────────────────────
DEVICE_LABEL: str = _optional("DEVICE_LABEL", "jetson-itinera-01")
DEVICE_CREDS_PATH: Path = Path(
    _optional("DEVICE_CREDS_PATH", str(_APP_DIR / "device.json"))
)

# ── Datos locales ─────────────────────────────────────────────────────────────
SQLITE_PATH: Path = Path(
    _optional("SQLITE_PATH", str(_APP_DIR / "itinera.db"))
)

# ── Ubicación del stand WRO (usada cuando no hay GPS) ────────────────────────
# Por defecto: Tegucigalpa centro — actualizar con coords reales del venue WRO
WRO_VENUE_LAT: float = float(_optional("WRO_VENUE_LAT", "14.0818"))
WRO_VENUE_LNG: float = float(_optional("WRO_VENUE_LNG", "-87.2068"))

# ── Idioma por defecto ────────────────────────────────────────────────────────
LOCALE: str = _optional("LOCALE", "es")

# ── Intervalos de background tasks (segundos) ─────────────────────────────────
SYNC_INTERVAL_SEC: int = int(_optional("SYNC_INTERVAL_MIN", "60")) * 60
CONNECTIVITY_CHECK_INTERVAL_SEC: int = int(_optional("CONNECTIVITY_CHECK_INTERVAL_SEC", "30"))
EVENT_FLUSH_INTERVAL_SEC: int = int(_optional("EVENT_FLUSH_INTERVAL_SEC", "300"))  # 5 min

# ── Servidor ──────────────────────────────────────────────────────────────────
HOST: str = _optional("HOST", "0.0.0.0")
PORT: int = int(_optional("PORT", "8000"))

# ── URL para verificar conectividad ──────────────────────────────────────────
CONNECTIVITY_CHECK_URL: str = _optional(
    "CONNECTIVITY_CHECK_URL",
    f"{SUPABASE_URL}/rest/v1/",
)
