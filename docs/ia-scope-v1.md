# Itinera — alcance de IA v1 y vínculo WRO

Documento operativo para el equipo: qué hace la capa de IA en la primera versión, qué datos consume, modos de interacción y cómo se separa la narrativa del **kiosko informativo** frente al **robot autónomo** en competición WRO Future Innovators.

---

## 1. Dos sistemas distintos (obligatorio para el informe y la demo)

| Aspecto | Kiosko / terminal (Jetson + pantalla) | Robot / plataforma móvil en campo |
|--------|----------------------------------------|-----------------------------------|
| Rol en la historia | Información cultural, lugares, historias, recomendación tipo “guía”; puede usar voz o texto | Demuestra **autonomía**, sensores, actuadores, decisión bajo reglas de carrera |
| IA permitida sin conflicto conceptual | ASR/LLM/RAG sobre **contenido ya publicado** en Supabase; telemetría agregada | Control y percepción acorde a reglas; no se “sustituye” autonomía con un chat remoto |
| Documentación WRO | Declarar modelos, fines, límites (qué datos entran/salen) | Declarar sensores, decisión autónoma, excepciones de teleop si aplica |

**Conclusión:** La IA del kiosko **no cuenta como sustituto** de la autonomía del robot. En el informe conviene dos subsecciones explícitas: *Asistente cultural (kiosko)* y *Navegación / tareas robóticas*.

---

## 2. Alcance funcional IA v1 (kiosko)

### 2.1 Incluido en v1

- **Consulta de catálogo:** lugares publicados (`places`), textos multilocale incluyendo `ai_description_i18n` y `ai_tips_i18n` cuando existan.
- **Búsqueda geográfica y ranking:** llamada a `search_places_nearby` (PostGIS + boost de campañas acorde a datos en vivo).
- **Narración breve:** respuestas en español (e inglés si el modelo/prompt lo soporta) basadas en fichas y resultados de búsqueda; sin inventar hechos que no estén en la ficha o en reglas explícitas del equipo.
- **Registro de interacción:** envío de eventos al backend vía Edge `ingest-terminal-events` cuando el dispositivo esté provisionado (ver [ia-intent-catalog.md](ia-intent-catalog.md) y [terminal-ingest.md](terminal-ingest.md)).
- **Estado de sesión local:** caché SQLite (u otro almacenamiento embebido) en el Jetson para turnos recientes, últimos `place_ids_shown` y contexto mínimo sin depender de red permanente.

### 2.2 Fuera de v1 (o solo prototipo aislado)

- **pgvector / embeddings en nube:** ~~evaluación diferida~~ → **IMPLEMENTADO** (16/05/2026). Modelo `gte-small` 384-dim activo; ver [ia-pgvector-roadmap.md](ia-pgvector-roadmap.md).
- **GPT multimodal sobre cámara del kiosko** con retención de imagen en servidor: no alineado a la política actual de privacidad de `interaction_events`; cualquier visión debe acotarse por el equipo y por normativa.
- **Sincronización obligatoria de historial conversacional en Postgres:** opcional; las tablas `conversations` / `messages` existen si más adelante se desea.

### 2.3 Modo voz vs solo texto

| Modo | v1 | Notas |
|------|----|--------|
| **Solo texto** (teclado táctil o API interna) | Soportado | Menor complejidad; útil para laboratorio sin micrófono. |
| **Voz (ASR + TTS)** | Opcional según hardware | Latencia y ruido del stand; definir umbral de fallback a texto. Recomendación: mismo flujo NLU sustituyendo entrada de texto por transcripción normalizada. |

La lógica de negocio (intents, `entities`, llamada a `search_places_nearby`) debe ser **idéntica** salvo la capa de entrada/salida audio.

---

## 3. Datos que consume la IA v1

- **Origen principal:** API pública Supabase con clave `anon`.
  - `GET /rest/v1/places?status=eq.published` con selección de columnas necesarias.
  - `POST /rest/v1/rpc/search_places_nearby` con `p_lat`, `p_lng`, `p_radius_km`, etc.
- **Contenido enriquecido:** campos JSONB `name_i18n`, `description_i18n`, `ai_description_i18n`, `ai_tips_i18n` (filtrar subcampo `es` o `en` según preferencia del visitante).
- **Historias (opcional v1):** `stories` publicadas y aprobadas para respuestas de tipo “cuéntame más”.
- **No consumir en v1 sin decisión explícita:** datos `draft`, reseñas `pending`, tablas `devices` / `interaction_events` desde el cliente (salvo envío de eventos ya definido).

---

## 4. Degradación y seguridad de contenido

- **Sin red:** respuestas solo desde caché local o mensaje estándar “conéctate para datos actualizados”.
- **Modelo o API fallida:** respuesta basada en plantilla + lista de lugares desde caché o ranking por defecto.
- **Alucinación:** política de producto: no afirmar horarios, precios o hechos no presentes en la ficha; el prompt de sistema debe incluir esta restricción.

---

## 5. Referencias cruzadas

- Catálogo de intents y `entities`: [ia-intent-catalog.md](ia-intent-catalog.md).
- Contrato HTTP de ingesta: [terminal-ingest.md](terminal-ingest.md).
- Prototipo de referencia (Python, stdlib): [jetson/prototype/README.md](../jetson/prototype/README.md).
- Despliegue Edge y prueba E2E: [edge-deploy-checklist.md](edge-deploy-checklist.md).
