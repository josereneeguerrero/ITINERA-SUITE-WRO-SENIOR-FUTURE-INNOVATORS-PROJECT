# Contrato: ingesta desde terminal (Jetson)

Valores recomendados para `intent` y forma de `entities`: [ia-intent-catalog.md](ia-intent-catalog.md).

`POST /functions/v1/ingest-terminal-events`

## Headers

- `Authorization: Bearer <device_token>` — token devuelto **una sola vez** por `device-register`.
- `x-device-id: <uuid>` — mismo `device_id` devuelto al registrar.
- `Content-Type: application/json`

## Cuerpo JSON

```json
{
  "event_id": "uuid-v4-o-ulid-unico-por-evento",
  "occurred_at": "2026-05-08T12:34:56.000Z",
  "intent": "buscar_lugar",
  "entities": { "categoria_slug": "food" },
  "place_ids_shown": ["uuid-lugar-1", "uuid-lugar-2"],
  "selected_place_id": "uuid-lugar-1",
  "lat": 14.0818,
  "lng": -87.20681,
  "duration_ms": 3200,
  "optional_user_id": null,
  "demographics_demo": { "age_bucket": "25-34", "confidence_band": "low" },
  "payload": { "terminal_build": "0.1.0" }
}
```

## Idempotencia

`event_id` es **único** (`interaction_events.event_id`). Reintentos con el mismo `event_id` no duplican filas (`ON CONFLICT DO NOTHING`).

## Privacidad

No enviar imágenes, embeddings faciales ni audio crudo. Solo agregados acordados (p. ej. bucket de edad).

## Registro de dispositivo

`POST /functions/v1/device-register`

Headers: `x-device-setup-secret: <DEVICE_SETUP_SECRET>`

Body: `{ "label": "aeropuerto-toncontin-t1" }`

Respuesta: `{ "device_id", "device_token", "message" }` — guardar `device_token` en almacenamiento seguro del Jetson.
