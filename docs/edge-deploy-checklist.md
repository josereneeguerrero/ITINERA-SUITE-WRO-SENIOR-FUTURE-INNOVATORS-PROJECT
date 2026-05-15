# Checklist: despliegue Edge y validación E2E (terminales)

Cuando el Jetson o un portátil de prueba pueda llamar a HTTPS del proyecto Supabase enlazado, seguir esta secuencia. Complementa [README.md](../README.md) (sección Edge Functions) y [terminal-ingest.md](terminal-ingest.md).

---

## 1. Prerrequisitos

- [ ] `supabase link` al proyecto correcto (dev o prod).
- [ ] Migraciones aplicadas (`supabase db push` o CI) incluyendo tablas `devices` e `interaction_events`.
- [ ] `DEVICE_SETUP_SECRET` generado (longitud ≥ 8, alta entropía).

---

## 2. Secretos y despliegue

```bash
supabase secrets set DEVICE_SETUP_SECRET=<valor>
supabase functions deploy device-register
supabase functions deploy ingest-terminal-events
```

- [ ] `device-register` responde 401 sin header correcto.
- [ ] `ingest-terminal-events` responde 401 sin `Authorization` + `x-device-id`.

---

## 3. Registro de dispositivo (una vez por terminal)

**Request:**

```http
POST https://<project-ref>.supabase.co/functions/v1/device-register
x-device-setup-secret: <DEVICE_SETUP_SECRET>
Content-Type: application/json

{ "label": "lab-jetson-01" }
```

**Checks:**

- [ ] Respuesta 200 con `device_id` y `device_token`.
- [ ] El token se guarda en almacenamiento **persistente y restringido** del dispositivo (no en repo git).
- [ ] Si se pierde el token, registrar de nuevo o rotar vía proceso DBA (no hay “recuperar token” por diseño).

---

## 4. Ingesta de prueba (E2E)

**Request:**

```http
POST https://<project-ref>.supabase.co/functions/v1/ingest-terminal-events
Authorization: Bearer <device_token>
x-device-id: <device_id>
Content-Type: application/json

{
  "event_id": "00000000-0000-4000-8000-000000000001",
  "occurred_at": "2026-05-09T12:00:00.000Z",
  "intent": "sesion_inicio",
  "entities": { "locale": "es" },
  "place_ids_shown": [],
  "payload": { "terminal_prototype": "jetson/prototype" }
}
```

**Checks:**

- [ ] Respuesta 200 `{ "ok": true }`.
- [ ] Reenvío con el **mismo** `event_id` no duplica filas (idempotencia).
- [ ] `event_id` mal formado o cuerpo inválido → 400 con mensaje claro.
- [ ] Token incorrecto o `x-device-id` que no coincide → 401.

**Verificación en base (service role / SQL Editor):**

```sql
select event_id, device_id, intent, occurred_at
from public.interaction_events
order by occurred_at desc
limit 10;
```

---

## 5. Campo y contrato semántico

- [ ] `intent` y forma de `entities` siguen [ia-intent-catalog.md](ia-intent-catalog.md).
- [ ] No se envía audio, video ni PII en `payload` o `entities` sin decisión explícita.

---

## 6. Producción / stand WRO

- [ ] `DEVICE_SETUP_SECRET` solo en canal seguro de equipo; rotación si se filtra.
- [ ] Firewall del stand permite salida HTTPS a `*.supabase.co` (o dominio del proyecto).
- [ ] Plan B offline documentado en [ia-scope-v1.md](ia-scope-v1.md) (caché local si cae la red).
