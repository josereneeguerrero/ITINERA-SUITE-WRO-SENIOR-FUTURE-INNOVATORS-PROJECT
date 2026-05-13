# Itinera Suite — WRO 2026 · INNOVAKERS · UNICAH

> **Robots for Culture** — Terminal física + Web + App Móvil para turismo cultural en Honduras.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend / DB | Supabase (Postgres + PostGIS + Auth + Storage + Edge Functions) |
| Web | Next.js 15 (App Router) + Tailwind + shadcn/ui |
| Mobile | Expo (React Native) + NativeWind |
| Terminal | Python 3.11 + SQLite en NVIDIA Jetson Orin Nano 8GB |
| Búsqueda | PostGIS (geo) + tsvector (full-text) |

## Supabase Project

- **Project ID:** `hwsddziticyusncajyes`
- **URL:** `https://hwsddziticyusncajyes.supabase.co`

## Setup rápido

```bash
# 1. Instalar Supabase CLI
npm install -g supabase@latest

# 2. Login y link
supabase login
supabase link --project-ref hwsddziticyusncajyes

# 3. Aplicar migraciones
supabase db push

# 4. Cargar seed (en SQL Editor de Supabase dashboard)
#    pegar contenido de supabase/seed.sql

# 5. Generar tipos TypeScript
supabase gen types typescript --project-id hwsddziticyusncajyes -o types/database.ts

# 6. Deploy Edge Functions
supabase functions deploy device-register
supabase functions deploy export-terminal-data
supabase functions deploy ingest-terminal-events

# 7. Configurar secrets
supabase secrets set DEVICE_SETUP_SECRET=<tu-secreto>
```

## Migraciones (orden)

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `20260511010000_extensions.sql` | PostGIS, pgcrypto |
| 2 | `20260511020000_core_schema.sql` | Enums, tablas, triggers updated_at |
| 3 | `20260511030000_auth_functions.sql` | Auth hook, is_admin, rating trigger, device RPCs |
| 4 | `20260511040000_rls.sql` | RLS + enforce_review_defaults |
| 5 | `20260511050000_search.sql` | search_places_nearby, search_places_text, boost |
| 6 | `20260511060000_storage.sql` | Buckets + políticas storage |

## Edge Functions

| Fn | Método | Auth | Propósito |
|---|---|---|---|
| `device-register` | POST | `x-device-setup-secret` | Registrar terminal Jetson |
| `export-terminal-data` | GET | `Bearer <token>` + `x-device-id` | Snapshot JSON para SQLite Jetson |
| `ingest-terminal-events` | POST | `Bearer <token>` + `x-device-id` | Push eventos de interacción desde terminal |

## Roles

- `profiles.role = 'admin'` → acceso completo admin
- Promover admin: `UPDATE public.profiles SET role = 'admin' WHERE id = '<uuid>';`

## Reglas críticas

- ❌ No commitear: `service_role key`, tokens de dispositivo, `DEVICE_SETUP_SECRET`
- ✅ Nueva migración por cambio de schema (nunca editar migraciones aplicadas en prod)
- ✅ Actualizar docs/ si el cambio es estructural

## Arquitectura de producto

```
JETSON ORIN NANO (offline-first)
  Python + SQLite + Rasa/Whisper/OpenCV
      │ WiFi sync
      ▼
SUPABASE CLOUD (hwsddziticyusncajyes)
  Postgres + PostGIS + Auth + Storage + Edge Functions
      │ REST / Realtime
      ├── Next.js Web (admin + tourist portal)
      └── Expo Mobile (tourist app)
```
