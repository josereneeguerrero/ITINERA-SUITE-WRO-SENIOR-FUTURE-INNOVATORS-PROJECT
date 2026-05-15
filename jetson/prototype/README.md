# Prototipo Jetson / terminal (referencia Python)

Cliente **mínimo funcional** en Python 3 para el Jetson / kiosko. Demuestra:

- Lecturas públicas vía REST Supabase (`anon`).
- RPC `search_places_nearby` (geo + boost).
- Persistencia local con **SQLite**.
- Envío de eventos post-interacción a `ingest-terminal-events` (con device-register).

**No incluye:** ASR, TTS, LLM. Base para enchufar modelo local (llama.cpp, Whisper) o API remota. Ver [docs/ia-scope-v1.md](../../docs/ia-scope-v1.md).

---

## Requisitos

- Python 3.10+
- `requests` library (pip install requests)
- Variables entorno: `.env` con `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DEVICE_SETUP_SECRET` (si vas a registrar)

---

## Setup

```bash
cd jetson/prototype
python3 -m venv venv
source venv/bin/activate  # o . venv/Scripts/activate (Windows)
pip install requests

# Copiar plantilla
cp .env.example .env
# Editar .env:
# SUPABASE_URL=https://xttpowzrqavotnlhljox.supabase.co
# SUPABASE_ANON_KEY=eyJh...
```

---

## Uso rápido

```bash
# Listar lugares (no requiere device)
python3 terminal_client.py places --limit 5

# Búsqueda geo
python3 terminal_client.py search 14.0818 -87.20681 --radius 50

# Demo completo con sesión
python3 terminal_client.py demo

# Registrar device (requiere DEVICE_SETUP_SECRET)
python3 terminal_client.py register "jetson-lab-01"
```

---

## Ejemplos de código

### 1. Fetch lugares publicados

```python
from terminal_client import SupabaseClient

client = SupabaseClient()
places = client.fetch_places(limit=10)
for p in places:
    print(f"{p['id']}: {p['name_i18n']['es']} @ {p['lat']}, {p['lng']}")
```

### 2. Búsqueda geográfica

```python
places = client.search_nearby(
    lat=14.0818,
    lng=-87.20681,
    radius_km=50,
    limit=5
)
print(f"Encontrados: {len(places)} lugares cercanos")
```

### 3. Registrar device + enviar evento

```python
from terminal_client import register_device, ingest_event
import uuid

# Una sola vez:
device_id, device_token = register_device(
    label="jetson-aeropuerto-t1",
    setup_secret="<DEVICE_SETUP_SECRET>"
)
# → guardar device_token en almacenamiento persistente

# Después de cada interacción:
event_id = str(uuid.uuid4())
ingest_event(
    event_id=event_id,
    device_id=device_id,
    device_token=device_token,
    intent="buscar_lugar",
    entities={"categoria_slug": "food"},
    place_ids_shown=["uuid-1", "uuid-2"],
    selected_place_id="uuid-1",
    lat=14.0818,
    lng=-87.20681,
    duration_ms=2500
)
```

### 4. State local (SQLite)

```python
from terminal_client import LocalState

state = LocalState("state.sqlite")
state.save_session(device_id=dev_id, last_places_shown=[...])
last = state.get_session(dev_id)
print(f"Última búsqueda: {last['places_shown']}")
```

---

## Archivos esperados

| Archivo | Rol |
|---------|-----|
| `terminal_client.py` | Módulo principal: HTTP + SQLite + CLI |
| `.env.example` | Plantilla vars (nunca commitear `.env` con secrets) |
| `state.sqlite` | Local sesión; ignorado en git |
| `requirements.txt` | `requests` y deps (si las hay) |

---

## Flujo típico (Jetson + IA local)

1. **Inicio sesión:** `client.fetch_places()` → caché en SQLite.
2. **Usuario pregunta (voz/texto):** → NLU local → extrae intent + entities.
3. **Ranking:** `client.search_nearby(...)` con filtros de NLU.
4. **Respuesta:** modelo local genera narrativa sobre top-1 lugar.
5. **Telemetría:** `ingest_event(...)` con place_ids_shown, selected_place_id, intent.
6. **Sin red:** devolver caché local + "conéctate para datos nuevos".

---

## Integración posterior

- Reemplazar función entrada texto por ASR (Whisper, etc.).
- Reemplazar generación respuesta fija por LLM (llama.cpp, Ollama, etc.).
- Sincronizar estado sesión con backend si hay QR / auth de usuario.
- Llamadas RPC persisten el mismo; solo wrap de entrada/salida.

Ver [docs/ia-scope-v1.md](../../docs/ia-scope-v1.md) para alcance; [docs/ia-intent-catalog.md](../../docs/ia-intent-catalog.md) para intents; [docs/edge-deploy-checklist.md](../../docs/edge-deploy-checklist.md) para despliegue device.
