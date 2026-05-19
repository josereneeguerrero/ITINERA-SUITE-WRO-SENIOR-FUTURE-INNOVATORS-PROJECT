#!/bin/bash
# start.sh — Itinera Terminal
# Inicia el backend. En el Jetson también lanzará Chromium en kiosk mode (Sprint 1).

set -e  # salir si cualquier comando falla

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
VENV_DIR="$SCRIPT_DIR/venv"

echo "╔══════════════════════════════════╗"
echo "║     Itinera Terminal v0.1        ║"
echo "╚══════════════════════════════════╝"

# ── Verificar .env ────────────────────────────────────────────────────────────
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "ERROR: No se encontró $SCRIPT_DIR/.env"
    echo "Copia .env.example a .env y completa los valores."
    exit 1
fi

# ── Activar virtualenv ────────────────────────────────────────────────────────
if [ -d "$VENV_DIR" ]; then
    source "$VENV_DIR/bin/activate"
    echo "Virtualenv activado."
else
    echo "AVISO: No se encontró venv en $VENV_DIR"
    echo "Ejecuta: python3 -m venv venv && pip install -r requirements.txt"
fi

# ── Iniciar backend ───────────────────────────────────────────────────────────
echo "Iniciando backend en http://localhost:8000 ..."
cd "$BACKEND_DIR"
python main.py &
BACKEND_PID=$!

echo "Backend PID: $BACKEND_PID"

# ── Sprint 1+: Chromium kiosk ─────────────────────────────────────────────────
# Descomenta cuando el frontend esté listo:
# sleep 3
# chromium-browser \
#   --kiosk \
#   --disable-restore-session-state \
#   --noerrdialogs \
#   --disable-infobars \
#   http://localhost:8000

# ── Esperar al backend ────────────────────────────────────────────────────────
wait $BACKEND_PID
