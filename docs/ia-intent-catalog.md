# Catálogo de intents y `entities` (terminal / `interaction_events`)

Valores estables para el campo **`interaction_events.intent`** (texto libre con convención *snake_case*). El campo **`entities`** es **JSONB** arbitrario; aquí se define el **esquema recomendado** por intent para que Jetson, Edge y analítica compartan el mismo vocabulario.

Referencia de columnas en base: migración core (`interaction_events`), cuerpo del POST en [terminal-ingest.md](terminal-ingest.md).

---

## 1. Reglas generales

- **`intent`:** una sola cadena por evento; usar solo minúsculas y guiones bajos. Versionado del catálogo: añadir intents nuevos al final de este documento y registrar fecha en el changelog interno del equipo.
- **`entities`:** objeto JSON plano (sin anidar profundamente salvo `filters`). Claves en **snake_case**. Valores escalares o arreglos de strings/UUID.
- **Desconocido / NLU fallido:** `intent: "other"` y `entities: { "raw_transcript": "..." }` solo si la política de privacidad del stand lo permite (evitar guardar frases personales; preferir `payload.internal_note` en desarrollo).
- **Coherencia con RPC:** si el usuario pidió búsqueda por ubicación, incluir en el evento `lat` / `lng` a nivel raíz del JSON del body (como ya define el contrato de ingesta), además de reflejar filtros útiles en `entities`.

---

## 2. Catálogo de intents (v1)

| `intent` | Descripción | `entities` obligatorias / opcionales |
|----------|-------------|----------------------------------------|
| `buscar_lugar` | Búsqueda o recomendación de lugares (geo o tema). | Opcional: `categoria_slug`, `region_slug`, `query_text`, `place_type_slug`. |
| `ver_detalle_lugar` | Usuario abrió o pidió detalle de un sitio concreto. | Opcional: `place_slug`. El ID definitivo va en `selected_place_id` del body. |
| `listar_cercanos` | Explícitamente “qué hay cerca” sin texto adicional. | Opcional: `radius_km_suggested`. |
| `historia_relacionada` | Pregunta por narrativa / historia vinculada a un lugar o tema. | Opcional: `story_slug`, `topic`. |
| `navegacion_ui` | Taps en la interfaz (sin NLU): categoría, filtro, atrás. | Recomendado: `ui_target`, `ui_value`. |
| `sesion_inicio` | Arranque de sesión en el kiosko. | Opcional: `locale` (`es` \| `en`). |
| `sesion_fin` | Fin o timeout de sesión. | Opcional: `reason` (`timeout` \| `user_exit` \| `error`). |
| `error_pipeline` | Fallo ASR, LLM timeout, red. | Recomendado: `stage` (`asr` \| `llm` \| `network` \| `rpc`), `recoverable` (bool). |
| `other` | Resto no clasificado. | Opcional: `label_corta` (sin datos personales). |

---

## 3. Esquema recomendado por campo (dentro de `entities`)

```json
{
  "categoria_slug": "food",
  "region_slug": "tegucigalpa",
  "place_type_slug": "typical_food",
  "query_text": "comida típica cerca",
  "story_slug": "honduras-cultural-trails",
  "topic": "mayan_heritage",
  "locale": "es",
  "ui_target": "category_chip",
  "ui_value": "heritage",
  "radius_km_suggested": 25,
  "stage": "llm",
  "recoverable": true
}
```

No es necesario enviar todas las claves; solo las pertinentes al intent.

---

## 4. Mapeo a columnas del body HTTP (ingesta)

| Columna / clave en JSON | Origen típico |
|-------------------------|---------------|
| `intent` | Clasificador NLU o reglas del kiosko. |
| `entities` | Slots extraídos o estado de UI. |
| `place_ids_shown` | Lista de UUID devueltos por `search_places_nearby` o por consulta `places` mostrada en pantalla. |
| `selected_place_id` | UUID del lugar elegido por el usuario o por defecto del flujo. |
| `lat`, `lng` | Coordenadas del contexto (“aquí” del kiosko o última búsqueda). |
| `duration_ms` | Tiempo de la interacción o de la ronda NLU. |
| `optional_user_id` | Si hay vinculación QR con `auth.users`. |
| `demographics_demo` | Solo agregados acordados (ver [terminal-ingest.md](terminal-ingest.md)). |
| `payload` | Metadatos no semánticos: versión de firmware, modelo ASR, latencias, flags debug (evitar PII). |

---

## 5. Ejemplos mínimos

**Búsqueda por categoría (como en terminal-ingest.md):**

```json
{
  "intent": "buscar_lugar",
  "entities": { "categoria_slug": "food" }
}
```

**Tap en chip de patrimonio:**

```json
{
  "intent": "navegacion_ui",
  "entities": { "ui_target": "category_chip", "ui_value": "heritage" }
}
```

---

## 6. Changelog (mantener en PRs)

| Fecha | Cambio |
|-------|--------|
| 2026-05-09 | Versión inicial v1 del catálogo. |
