# Itinera Suite — Estado del Proyecto
> **Punto de control:** 16 mayo 2026  
> **Commit HEAD:** `fdde2c2` — fix(chat): clear history before auto-sending category initialMessage  
> **Rama:** main

---

## Resumen ejecutivo

| Módulo | Estado | Observaciones |
|--------|--------|---------------|
| Backend Supabase | ✅ Completo | 7 migraciones, RLS, Storage, Edge Functions, embeddings activos |
| Búsqueda semántica | ✅ Activa | `gte-small` 384-dim, 16 lugares indexados, cron horario |
| Tourist Web (`/apps/tourist`) | ✅ Completo | Todas las rutas implementadas y pulidas |
| Admin Panel (`/apps/web`) | ✅ Completo | CRUD, analytics, roles, registro de terminales |
| Integración Jetson | ⏳ Pendiente | Edge Functions listas; cliente Python por instalar en hardware |
| /stories — polish final | ⏳ Pendiente | Página existe, falta UX pass |
| Contenido (places) | ⚠️ Limitado | 16 lugares publicados en DB |

---

## 1. Backend Supabase

### Migraciones (aplicadas en orden)

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `20260508010000_extensions.sql` | `postgis`, `pgcrypto` |
| 2 | `20260508020000_core_schema.sql` | Enums, places, stories, profiles, reviews, sponsors, devices, conversaciones |
| 3 | `20260508030000_auth_ratings_devices.sql` | Auth hooks, ratings agregados, `register_device`, `verify_device_token`, `ingest_interaction_event` |
| 4 | `20260508040000_rls.sql` | Row Level Security + políticas por rol |
| 5 | `20260508050000_search.sql` | `search_places_nearby` (PostGIS + boost sponsors) |
| 6 | `20260508060000_storage.sql` | Buckets + políticas storage |
| 7 | `20260508070000_fix_enforce_review_defaults_admin.sql` | Fix trigger reseñas admin |

### Búsqueda semántica (pgvector)

- **Modelo:** `gte-small` (384 dimensiones) — gratuito en Supabase
- **Tabla:** `place_embeddings(place_id, embedding vector(384), model_id, updated_at)`
- **RPC:** `match_places_by_embedding(query_embedding, match_threshold, match_count)`
- **Sync script:** `scripts/sync-embeddings.ts` — modos `all` y `changed`
- **GitHub Actions cron:** `.github/workflows/sync-embeddings.yml` — cada hora con `mode=changed`
- **Estado:** 16 embeddings activos, threshold configurado en 0 (sin corte de similitud)

### Edge Functions

| Función | Estado |
|---------|--------|
| `device-register` | Código desplegado; listo para Jetson |
| `ingest-terminal-events` | Código desplegado; listo para telemetría |

---

## 2. Tourist Web (`apps/tourist`)

### Rutas implementadas

| Ruta | Estado | Notas |
|------|--------|-------|
| `/` (landing) | ✅ | Hero + categorías + CTA |
| `/bienvenida` | ✅ | Onboarding login/guest |
| `/dashboard` | ✅ | AuroraBackground hero, categorías, clima, mapa preview |
| `/explore` | ✅ | MapLibre fullscreen, rutas, AI chat, categorías |
| `/places/[slug]` | ✅ | Hero Aurora, tabs Info/Historias/Reseñas, AI panel, foto slider |
| `/stories/[slug]` | ✅ | Vista completa de historia |
| `/routes` | ✅ | Lista de rutas guardadas del usuario |
| `/routes/[id]` | ✅ | Vista compartible de ruta |
| `/profile` | ✅ | Datos reales del usuario |
| `/profile/saved` | ✅ | Favoritos del usuario |

### Componentes clave

#### Mapa (`explore-fullscreen-map.tsx` + `explore-map.tsx`)
- MapLibre GL con marcadores reactivos
- Rutas: crear, guardar en DB, compartir por URL
- Place card con z-index `z-50` (encima del route panel `z-40`)
- Route panels movidos a `bottom-24` para no tapar botones de la card
- `flyTo` espera `mapReady`; initial fit con guardia `if (mapCenter) return`
- Integración bidireccional `/places/[slug]?addToRoute=` y `?place=`

#### AI Chat (`glowing-ai-chat-assistant.tsx`)
- `initialMessage` prop para auto-envío desde tarjetas de categoría
- `clear()` antes de `send()` en el auto-envío → evita contaminación de historial
- `didAutoSend` ref previene re-envíos en re-renders
- Suggestions, tool results inline, streaming
- `sessionStorage` para device ID y región/categoría recordada

#### /places redesign
- Hero con `AuroraBackground` (mismo DNA que dashboard)
- Iconos Lucide (sin emojis)
- Botón Guardar hidrata desde DB en mount
- Links "Ver en mapa" y "Agregar a ruta" pasan `?guest=true` para usuarios no autenticados
- `isGuest = !user` (basado en auth, NO en URL param)
- `PlacePhotoSlider` carga desde `media_assets` en DB
- Widget de clima con Open-Meteo API por coordenadas del lugar
- AI panel (desktop sticky / mobile below content)

#### UX polish (aplicado globalmente)
- Scroll-reveal animations con Intersection Observer
- `cursor-pointer` en todos los elementos clickeables
- Dock labels + estados activos
- Transiciones 150–300ms

---

## 3. Admin Panel (`apps/web`)

### Secciones

| Sección | Estado |
|---------|--------|
| Places CRUD | ✅ Completo (slug regex, hours field, type safety) |
| Stories CRUD | ✅ Completo (region field añadido) |
| Sponsors CRUD | ✅ Completo |
| Devices | ✅ Modal registro de terminal Jetson con token seguro |
| Analytics | ✅ Gráfico diario, top places, intent breakdown |
| Roles | ✅ Control de acceso por rol |

### Bugs corregidos en esta sesión

| Bug | Fix |
|-----|-----|
| `focusRingColor` CSS inválido | Removido del inline style |
| `slugs` no en UIAction | `slugs?: string[]` añadido a interfaz |
| `hours` variable conflict | Renombrada a `hoursEs` |
| `hours` field faltaba en initialData | Añadido al edit page |
| `" use client"` con espacio | Removido en image-auto-slider.tsx |
| Slug regex roto | Reemplazado con `\p{M}/gu` Unicode |
| `as never` cast en PlacesTable | Tipo normalizado correctamente |

---

## 4. Flujos integrados

### Categoría → Mapa → AI Chat
1. Usuario toca tarjeta de categoría en `/dashboard`
2. Navega a `/explore?category=food` (o similar)
3. Mapa pre-filtra marcadores a esa categoría
4. AI Chat abre automáticamente con mensaje contextual (ej: "Muéstrame restaurantes en Honduras")
5. `clear()` previene contaminación de sesiones anteriores

### Place → Mapa → Ruta
1. Usuario en `/places/[slug]` toca "Agregar a ruta"
2. Navega a `/explore?addToRoute=slug&name=Nombre`
3. Mapa abre con el lugar seleccionado y panel de rutas activo
4. "Ver en mapa" → `/explore?place=slug` → flyTo del marcador

### Guest flow
- Sin login: botones de guardar/ruta redirigen a `/bienvenida?redirect=/places/[slug]`
- Links del hero incluyen `?guest=true` para mantener contexto
- `isGuest` calculado en servidor con `!user` (no URL-param)

---

## 5. Pendientes para WRO

### Alta prioridad
- [ ] **Contenido:** añadir más lugares a la DB (actualmente 16; meta: 40+)
- [ ] **Jetson:** instalar cliente Python de referencia en hardware real
- [ ] **Deploy Edge Functions** al proyecto de producción con secretos

### Media prioridad
- [ ] **`/stories` UX pass:** audio player, timeline, foto highlight
- [ ] **QA final:** test en móvil (iOS Safari, Android Chrome) a 375px
- [ ] **Proyecto Supabase Producción:** nuevo proyecto, mismas migraciones, claves rotadas

### Baja prioridad
- [ ] **pgvector híbrido:** combinar `search_places_nearby` + similitud coseno en RPC
- [ ] **Más fotos:** subir `media_assets` reales para los 16 lugares existentes
- [ ] **Reseñas de demo:** añadir reseñas semilla aprobadas para los lugares principales

---

## 6. Decisiones técnicas clave (registro)

| Decisión | Razón |
|----------|-------|
| `gte-small` (384-dim) en vez de OpenAI | Gratuito en Supabase; suficiente precisión para 16–100 lugares |
| `threshold=0` en match_places | Evita que consultas válidas no retornen resultados por umbral muy alto |
| `z-50` en place card | Route panel usa `z-40`; card debe quedar encima para que botones sean clickeables |
| `bottom-24` en route panels | Evitar que tapen botones de la place card |
| `clear()` antes de auto-send | Evita contaminación: categoría anterior en historial afectaba respuestas futuras |
| `mapReady` en deps de flyTo | Sin esto, flyTo disparaba antes de que el mapa estuviera listo |
| `if (mapCenter) return` en initial fit | Evita que el fit inicial compita con flyTo cuando se viene de /places |
| `isGuest = !user` server-side | URL param `?guest=true` no es fiable; el estado real es el auth |
| AuroraBackground en hero de /places | DNA visual consistente con /dashboard; misma componente, misma clase |

---

## 7. Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Estilos | Tailwind CSS v4, Lucide icons |
| Mapa | MapLibre GL JS |
| Backend | Supabase (Postgres + PostGIS + pgvector + Storage + Edge) |
| Auth | Supabase Auth (email/password + magic link) |
| Embeddings | `gte-small` via `supabase.functions.invoke('embed')` |
| Clima | Open-Meteo API (sin API key, gratis) |
| AI Chat | Claude (streaming SSE) via `/api/chat` route |
| Monorepo | Turborepo — `apps/tourist` (web pública) + `apps/web` (admin) |
| CI | GitHub Actions (sync-embeddings cron horario) |

---

*Documento generado en punto de control del 16/05/2026. Próxima actualización al completar integración Jetson o al alcanzar 40+ lugares publicados.*
