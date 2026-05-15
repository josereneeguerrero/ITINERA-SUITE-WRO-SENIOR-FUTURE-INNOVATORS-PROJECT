# Itinera — documentación integral del backend Supabase

Este documento consolida el estado del backend en **Postgres (Supabase)**: esquema, seguridad, storage, búsqueda, datos semilla, despliegue, pruebas y referencias a otros archivos del repo y planes relacionados.

---

## 1. Alcance

- **Incluye:** modelo relacional, RLS, triggers, funciones SQL (`search`, auth, ratings, dispositivos), buckets Storage, seed demo, Edge Functions (código en repo), playground HTML de prueba.
- **No incluye:** frontend web/app, Jetson embarcado, pasarela de pago, pgvector (fase 2 del plan de producto).

La suite Itinera enlaza **PLACES, STORIES, IDENTITY, sponsors, terminal**; el datastore central definido aquí reemplaza el enfoque Firestore del plan maestro de producto.

---

## 2. Proyecto Supabase (referencia)

| Dato | Valor |
|------|--------|
| URL | `https://xttpowzrqavotnlhljox.supabase.co` |
| Project ref / `project_id` (CLI) | `xttpowzrqavotnlhljox` (ver `supabase/config.toml`) |
| Entorno | **Dev** operativo; **producción** debe ser otro proyecto con mismas migraciones y claves nuevas |

Credenciales: **Dashboard → Project Settings → API** (`anon` en cliente; `service_role` solo servidor/Edge).

---

## 3. Migraciones SQL (orden canónico)

Archivos bajo `supabase/migrations/` (nombres oficiales aplicables con `supabase db push` o equivalente):

| Orden | Archivo | Contenido |
|------|---------|-----------|
| 1 | `20260508010000_extensions.sql` | `postgis`, `pgcrypto` |
| 2 | `20260508020000_core_schema.sql` | Enums, taxonomía, places, stories, profiles, reviews, sponsors, identity, devices, conversaciones, triggers `updated_at` |
| 3 | `20260508030000_auth_ratings_devices.sql` | `handle_new_user`, `is_admin`, agregación de ratings, `register_device` / `verify_device_token` / `ingest_interaction_event` + grants a `service_role` |
| 4 | `20260508040000_rls.sql` | `enforce_review_defaults`, RLS + políticas |
| 5 | `20260508050000_search.sql` | `active_boost_for_place`, `search_places_nearby` + grant a `anon`, `authenticated` |
| 6 | `20260508060000_storage.sql` | Buckets + políticas `storage.objects` |
| 7 | `20260508070000_fix_enforce_review_defaults_admin.sql` | Ajuste trigger reseñas: `user_id` también para **admin** (CHECK `reviews_user_or_session`) |

### Notas técnicas aplicadas

- **`pgcrypto` en hosted Supabase:** las funciones usan `set search_path = public`; `digest()` vive en el esquema **`extensions`**. En `20260508030000` se usa **`extensions.digest(...)`** dentro de `encode(..., 'hex')` para hash de tokens de dispositivo.
- **Triggers PostgreSQL 14+:** sintaxis `execute function` en migraciones; si un host antiguo fallara, probar `execute procedure`.
- **Reseñas:** restricción `reviews_user_or_session` exige `user_id` o `session_id`. Tras el fix `700`, cualquier usuario autenticado sin `session_id` recibe `user_id = auth.uid()` si ambos venían vacíos. **Default** de columna `moderation_status` sigue siendo `pending`; admins pueden aprobar vía Studio/SQL o la app puede enviar estado explícito según reglas de negocio.

---

## 4. Datos semilla

- **`supabase/seed.sql`:** Honduras demo (regiones, categorías, lugares `*-demo`, historia, sponsor UNICAH, campaña boost, host site, acuerdo, reseñas aprobadas seeds). Idempotente con `NOT EXISTS` / conflictos donde aplica.
- Aplicación: SQL Editor, `execute_sql` (MCP), o `psql -f` contra la base.

---

## 5. SQL auxiliar (no es migración versionada)

| Archivo | Uso |
|---------|-----|
| `supabase/promote_latest_user_to_admin.sql` | Dev: promueve al último usuario en `auth.users` a `admin` (revisar si hay varias cuentas). |
| `supabase/migrations/_*.sql`, `_mcp_*.json`, `build_mcp_apply.js` | Artefactos de ayuda para aplicar SQL grande vía MCP; **opcional en git** o borrar en limpieza. |

---

## 6. Row Level Security (resumen)

- **`anon`:** lectura de contenido publicado/aprobado; sponsors activos en ventana; `search_places_nearby`.
- **`authenticated`:** perfil propio; favoritos e itinerarios; insert reseñas (políticas + trigger); storage bajo reglas (avatars, review-photos, etc.).
- **`admin`:** `is_admin()` → gestión de lugares, historias, sponsors, host sites, media de contenido, moderación de reseñas, etc.
- **`devices` / `interaction_events`:** sin políticas útiles para cliente; escritura vía **funciones `SECURITY DEFINER`** + **`service_role`** (Edge).

Detalle de tablas/políticas: comentarios en `20260508040000_rls.sql`.

---

## 7. Storage

Buckets: `place-media`, `story-media`, `avatars`, `sponsor-logos`, `review-photos` (privado). Políticas en `20260508060000_storage.sql`.

---

## 8. Edge Functions (código en repo)

| Carpeta | Rol |
|---------|-----|
| `supabase/functions/device-register/` | Provisión de terminal; header `x-device-setup-secret` → `DEVICE_SETUP_SECRET`. |
| `supabase/functions/ingest-terminal-events/` | Ingesta eventos; bearer = token de dispositivo + `x-device-id`. |

Variables inyectadas por Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Despliegue y secretos: ver [README.md](../README.md) y [terminal-ingest.md](terminal-ingest.md).

**Estado:** código presente; el despliegue en un proyecto concreto es paso operativo (`supabase functions deploy`, secrets).

---

## 9. Pruebas locales

- **`playground/supabase-test/index.html`:** consola para anon RPC/select, auth (email/contraseña), reseñas, favoritos, copia de SQL para admin. Requiere servidor HTTP (p. ej. `npx serve . -p 3333`) por CORS.
- **Dashboard:** Table Editor, SQL Editor.

---

## 10. CLI rápido

```bash
supabase login
supabase link --project-ref xttpowzrqavotnlhljox
supabase db push
# seed: pegar seed.sql en SQL Editor o psql
supabase gen types typescript --project-id xttpowzrqavotnlhljox -o types/database.ts
```

---

## 11. Documentación relacionada en este repo

| Documento | Contenido |
|-----------|-----------|
| [README.md](../README.md) | Puesta en marcha, Edge, convenciones i18n, checklist RLS |
| [backend-api.md](backend-api.md) | Mapeo recursos ↔ PostgREST / roles |
| [terminal-ingest.md](terminal-ingest.md) | Contrato JSON Jetson ↔ Edge |
| [ia-scope-v1.md](ia-scope-v1.md) | Alcance IA kiosko v1, voz/texto, datos, WRO |
| [ia-intent-catalog.md](ia-intent-catalog.md) | Catálogo `intent` / `entities` para `interaction_events` |
| [edge-deploy-checklist.md](edge-deploy-checklist.md) | Despliegue Edge + prueba E2E de terminales |
| [ia-pgvector-roadmap.md](ia-pgvector-roadmap.md) | Cuándo y cómo evaluar embeddings en nube |
| [jetson/prototype/README.md](../jetson/prototype/README.md) | Cliente Python de referencia (anon + RPC) |
| Este archivo | Visión unificada + decisiones técnicas + historial de fixes |

---

## 12. Planes y fuentes de producto (fuera o parcialmente fuera de esta carpeta)

- **Plan backend Supabase (Cursor):** puede vivir como `itinera_supabase_backend_*.plan.md` bajo el directorio de planes del IDE (referencia de decisiones: auth combinado, JSONB i18n, moderación `pending`, dos proyectos dev/prod, mapas en cliente / PostGIS en backend, telemetría agregada, Stripe posterior).
- **Visión arquitectura suite / plan maestro WRO:** documentos como `Itinera_Suite_Architecture_Innovadora.md` y `Itinera_Master_Action_Plan.md` si están en el directorio padre del workspace; alinean módulos y competición, no sustituyen este README técnico.

---

## 13. Próximos pasos sugeridos (backend / borde)

1. Desplegar Edge + `DEVICE_SETUP_SECRET` cuando el Jetson consuma API.
2. Proyecto **producción** + rotación de claves.
3. Generar y versionar **tipos TypeScript** al crear el paquete frontend.
4. (Fase 2) `pgvector`, embeddings, jobs de re-embed según plan de producto.

---

*Última revisión coherente con migraciones hasta `20260508070000_fix_enforce_review_defaults_admin.sql`.*
