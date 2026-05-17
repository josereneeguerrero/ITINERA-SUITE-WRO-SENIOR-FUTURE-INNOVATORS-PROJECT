# Itinera Suite — Estado del Proyecto
> **Punto de control:** 16 mayo 2026 — Sesión 2
> **Commit HEAD:** `81888eb` — fix(search): wire dashboard search bar end-to-end to explore map
> **Rama:** main

---

## Resumen ejecutivo

| Módulo | Estado | Observaciones |
|--------|--------|---------------|
| Backend Supabase | ✅ Completo | 7 migraciones, RLS, Storage, Edge Functions, embeddings activos |
| Búsqueda semántica | ✅ Activa | `gte-small` 384-dim, 16 lugares, cron horario |
| Landing `/` | ✅ Rediseñada | Light mode, aurora estática, animaciones, INNOVAKERS real |
| Auth pages (`/bienvenida`, `/login`, `/register`) | ✅ Rediseñadas | Light mode, DNA unificado con dashboard |
| Dashboard (`/dashboard`) | ✅ Mejorado | Search, stats, Mis Rutas, typewriter hero |
| `/explore` | ✅ Search end-to-end | `?q=` pasa a ExploreFullscreenMap via `initialQuery` |
| `/places/[slug]` | ✅ Completo | Hero Aurora, tabs, AI panel, foto slider, clima |
| Admin Panel (`/apps/web`) | ✅ Completo | CRUD, analytics, roles, terminales |
| Integración Jetson | ⏳ Pendiente | Edge Functions listas; cliente Python por instalar |
| `/stories` — polish final | ⏳ Pendiente | Página existe, falta UX pass |
| Contenido (places) | ⚠️ Limitado | 16 lugares publicados en DB |

---

## Commits desde el último checkpoint (14 commits)

| Hash | Descripción |
|------|-------------|
| `81888eb` | fix(search): search bar end-to-end — URL bug + initialQuery prop |
| `d454e84` | feat(dashboard): search bar + quick stats + Mis Rutas |
| `7a8af24` | feat: typewriter dashboard hero + login/register/bienvenida redesign |
| `88ba8ea` | feat(landing): HeroHighlight en headline |
| `681a821` | fix(landing): chips estáticos, sin conteos dinámicos |
| `0ede651` | feat(landing): BlurFade entrance animations |
| `9a388e5` | feat(landing): integrantes reales INNOVAKERS + UNICAH |
| `1fa7a02` | feat(landing): medalla de bronce WRO Americas 2025 |
| `510cc05` | fix(vercel): ignoreCommand monorepo |
| `e56d112` | perf(landing): AuroraBackground → gradiente estático (fix lag) |
| `d2206c9` | fix(landing): nav scroll-aware, quitar links de sección |
| `724c538` | feat(landing): rediseño completo — light mode, DNA dashboard |

---

## 1. Backend Supabase

### Migraciones (aplicadas en orden)

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `20260508010000_extensions.sql` | `postgis`, `pgcrypto` |
| 2 | `20260508020000_core_schema.sql` | Enums, places, stories, profiles, reviews, sponsors, devices |
| 3 | `20260508030000_auth_ratings_devices.sql` | Auth hooks, ratings, `register_device`, `ingest_interaction_event` |
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
- **Estado:** 16 embeddings activos, threshold=0

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
| `/` (landing) | ✅ | Rediseño completo light mode — ver sección 2a |
| `/bienvenida` | ✅ | Light mode, BlurFade, 3 opciones auth |
| `/login` | ✅ | Light mode, inputs teal focus, form funcional |
| `/register` | ✅ | Light mode, misma estructura que login |
| `/dashboard` | ✅ | Search bar, stats, typewriter, Mis Rutas — ver sección 2b |
| `/explore` | ✅ | Search end-to-end desde dashboard `?q=` |
| `/places/[slug]` | ✅ | Hero Aurora, tabs, AI panel, foto slider, clima |
| `/stories/[slug]` | ✅ | Vista completa de historia |
| `/routes` | ✅ | Lista + curated routes |
| `/routes/[id]` | ✅ | Vista compartible |
| `/profile` | ✅ | Datos reales del usuario |
| `/profile/saved` | ✅ | Favoritos del usuario |

### 2a. Landing page (`/`) — Rediseño completo

**Estructura de secciones:**
1. **Nav flotante** — glass white, scroll-aware (oculta al bajar, reaparece al subir)
2. **Hero** — gradiente radial estático (teal), BlurFade escalonado por elemento, `Highlight` en "inteligencia artificial", chips de métricas estáticos
3. **El problema** — dark slate, 3 pain points
4. **La solución** — feature grid blanco, 5 cards (Mapa wide, Historias IA, Rutas, Búsqueda Semántica, Modelo de Negocio)
5. **Demo** — product mockup mejorado (browser chrome + mapa + AI panel)
6. **Destinos** — ImageAutoSlider desde DB
7. **Ecosistema** — dark, Terminal Jetson / Web / App
8. **Equipo INNOVAKERS** — datos reales verificados:
   - Medalla de Bronce 🥉 WRO Open Championship Americas 2025, Panamá (91.75 pts)
   - COHEP + Honduras STEM Foundation
   - Universidad Católica de Honduras (UNICAH) — 2026
   - 3 integrantes: José Renée Guerrero G. · Pablo David Cruz H. · Oscar Alejandro Portillo U.
9. **CTA + Footer** — teal gradient, 2 CTAs

**Animaciones:**
- `BlurFade` (framer-motion) — escalonado en todos los elementos hero
- `Highlight` (framer-motion) — relleno teal en "inteligencia artificial"
- `Typewriter` — usado en dashboard (ver 2b)
- `HeroHighlight` — dot pattern con mouse-follow en `hero-highlight.tsx`

**Performance:**
- `AuroraBackground` removido del hero (causaba lag en browser)
- Reemplazado con `radial-gradient()` estáticos → cero animación CSS, cero blur

### 2b. Dashboard (`/dashboard`) — Mejoras

**Nuevos elementos:**
- **Buscador** (`DashboardSearchBar`) — `h-[52px]` rounded-2xl, redirige a `/explore?q=<query>` — funcional end-to-end
- **Quick stats** — 4 pills centradas: destinos (live DB) · 18 departamentos · historias (live DB) · IA activo
- **Mis Rutas** (`DashboardMyRoutes`) — para logueados: top 3 rutas desde `itineraries` table + CTA "Nueva ruta"; para guests: CTA crear cuenta
- **Hero con Typewriter** (`DashboardHero`) — "Tu punto de partida para descubrir [Lugares Culturales / Historias Locales / Rutas Auténticas / Honduras Profunda / Contexto Cultural Real]" en teal bold

**Orden de secciones:**
Hero → Buscador → Stats → Categorías → Mapa → Mis Rutas → Historias → Destinos

### 2c. Search flow — end-to-end

```
DashboardSearchBar
  → /explore?q=<query>          (URL correcta: ? no &)
  → explore/page.tsx lee q de searchParams
  → pasa initialQuery a ExploreFullscreenMap
  → useState(initialQuery) pre-popula el buscador del mapa
  → búsqueda semántica + filtros disparan inmediatamente
```

### 2d. Auth pages — DNA unificado

Las 3 páginas (`/bienvenida`, `/login`, `/register`) comparten ahora:
- `bg-[#f0f5f2]` + aurora radial estática
- Nav mínima: logo teal + "Volver"
- Layout 2 columnas: left (value prop + feature chips) / right (card blanca)
- Inputs `border-[#d7e2de]` + `focus:border-[#0D9488] focus:ring-2`
- Botón primario `#0D9488` con shadow teal
- Sin nada dark

---

## 3. Componentes UI nuevos (esta sesión)

| Componente | Ruta | Descripción |
|------------|------|-------------|
| `BlurFade` | `ui/blur-fade.tsx` | Blur + fade + translateY entrada, `once: true` |
| `HeroHighlight` | `ui/hero-highlight.tsx` | Dot pattern + mouse-follow + `Highlight` span |
| `Typewriter` | `ui/typewriter.tsx` | Cyclo de textos con tipo/borrado, cursor parpadeante |
| `DashboardHero` | `dashboard/dashboard-hero.tsx` | AuroraBackground + Typewriter (client component) |
| `DashboardSearchBar` | `dashboard/dashboard-search-bar.tsx` | Buscador → `/explore?q=` |
| `DashboardRegions` | `dashboard/dashboard-regions.tsx` | 18 departamentos (disponible, no en dashboard) |
| `DashboardMyRoutes` | `dashboard/dashboard-my-routes.tsx` | Rutas del usuario desde DB |
| `LandingNav` | `landing/landing-nav.tsx` | Nav scroll-aware (client component) |

---

## 4. Admin Panel (`apps/web`)

Sin cambios en esta sesión. Estado del checkpoint anterior:

| Sección | Estado |
|---------|--------|
| Places CRUD | ✅ |
| Stories CRUD | ✅ |
| Sponsors CRUD | ✅ |
| Devices (Jetson) | ✅ |
| Analytics | ✅ |
| Roles | ✅ |

---

## 5. Flujos integrados

### Búsqueda desde Dashboard
```
Dashboard → escribe query → /explore?q=query
→ ExploreFullscreenMap(initialQuery) → semantic search activo
```

### Categoría → Mapa → AI Chat
```
Dashboard categoría card → /explore?category=slug
→ mapa filtrado → AI chat abre con mensaje contextual
→ clear() antes de send() evita contaminación de historial
```

### Place → Mapa → Ruta
```
/places/[slug] "Agregar a ruta" → /explore?addToRoute=slug&name=Nombre
/places/[slug] "Ver en mapa" → /explore?place=slug → flyTo marcador
```

### Guest flow
- Sin login: acciones redirigen a `/bienvenida?redirect=...`
- `?guest=true` propagado en todos los links relevantes
- `isGuest = !user` server-side (no URL-param)

---

## 6. Pendientes para WRO

### Alta prioridad
- [ ] **Contenido:** más lugares en DB (meta: 40+)
- [ ] **Jetson:** instalar cliente Python en hardware real
- [ ] **Deploy producción:** Edge Functions + secretos en proyecto Supabase prod

### Media prioridad
- [ ] **`/stories` UX pass:** audio player, timeline, foto highlight
- [ ] **QA móvil:** iOS Safari + Android Chrome a 375px
- [ ] **Supabase producción:** nuevo proyecto, migraciones, claves rotadas

### Baja prioridad
- [ ] **Fotos reales:** subir `media_assets` para los 16 lugares
- [ ] **Reseñas semilla:** aprobadas para los lugares principales
- [ ] **pgvector híbrido:** combinar geo + coseno en una RPC

---

## 7. Decisiones técnicas (acumuladas)

| Decisión | Razón |
|----------|-------|
| AuroraBackground → radial-gradient estático en landing hero | Eliminaba lag en browser (blur-[12px] + background-attachment:fixed + mix-blend-mode + 60s animation) |
| `initialQuery` prop en ExploreFullscreenMap | Permite pre-poblar search desde URL `?q=` sin lógica adicional |
| `useState(initialQuery)` directo (sin useEffect) | El valor solo cambia en mount; useEffect innecesario |
| Nav scroll-aware con delta de 6px | Evita parpadeo en trackpads con micromovimientos |
| BlurFade `once: true` | La animación ocurre solo al entrar, no se repite en scroll |
| Chips de métricas estáticos (sin conteos) | Números dinámicos envejecen mal visualmente |
| INNOVAKERS — datos reales verificados | Instituto Felipe Enrique Agustinus → UNICAH 2026; bronce WRO Americas |

---

## 8. Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Estilos | Tailwind CSS v4, Lucide icons |
| Animaciones | framer-motion v12 (BlurFade, HeroHighlight, Typewriter) |
| Mapa | MapLibre GL JS |
| Backend | Supabase (Postgres + PostGIS + pgvector + Storage + Edge) |
| Auth | Supabase Auth (email/password) |
| Embeddings | `gte-small` via Supabase |
| Clima | Open-Meteo API (gratis, sin API key) |
| AI Chat | Claude (streaming SSE) via `/api/chat` |
| Monorepo | `apps/tourist` (web pública) + `apps/web` (admin) |
| CI | GitHub Actions — sync-embeddings cron horario |
| Deploy | Vercel (tourist) — límite 100 deploys/día en free tier |

---

*Checkpoint: 16/05/2026 — Sesión 2. Próxima actualización: /stories polish o integración Jetson.*
