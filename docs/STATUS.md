# Itinera Suite — Estado del Proyecto
> **Punto de control:** 17 mayo 2026 — Sesión 3
> **Commit HEAD:** `b3cdd46` — feat(planner): nearest-neighbor routing para orden geográfico óptimo
> **Rama:** main

---

## Resumen ejecutivo

| Módulo | Estado | Observaciones |
|--------|--------|---------------|
| Backend Supabase | ✅ Completo | 7 migraciones, RLS, Storage, Edge Functions, embeddings |
| Búsqueda semántica | ✅ Activa | `gte-small` 384-dim, **45 lugares** indexados, cron horario |
| Landing `/` | ✅ Completo | Light mode, animaciones, INNOVAKERS real, sin lag |
| Auth (`/bienvenida`, `/login`, `/register`) | ✅ Completo | Light mode unificado |
| Dashboard `/dashboard` | ✅ Completo | Search, stats, Mis Rutas, typewriter |
| `/explore` | ✅ Completo | Search end-to-end, planRoute URL param |
| `/places/[slug]` | ✅ Completo | Hero, tabs, AI panel, foto slider, clima |
| `/stories` | ✅ Rediseñado | Light mode, AuroraBackground, FloatingAiAssistant |
| `/stories/[slug]` | ✅ Rediseñado | Hero Aurora, prose en globals.css |
| `/profile` | ✅ Rediseñado | Light mode, stats grid, quick actions |
| `/profile/saved` | ✅ Rediseñado | Lucide icons, Tailwind hover, DNA correcto |
| `/ia` — Chat IA | ✅ Completo | StreamingText, auto-scroll, contexto bifurcado |
| `/ia` — Planificador | ✅ Completo | OSRM, nearest-neighbor, mapa tour, 9 mejoras |
| `/ia` — Descubrir | ⏳ Pendiente | Tab "Próx." — siguiente prioridad |
| Admin Panel | ✅ Completo | Sin cambios en sesión 3 |
| Jetson | ⏳ Pendiente | Edge Functions listas |
| Contenido DB | ✅ Mejorado | **45 lugares · 12 historias** (era 16/2) |

---

## Commits sesión 3 (30 commits)

### /stories redesign
| Hash | Descripción |
|------|-------------|
| `138f2b2` | feat(stories): redesign completo — light mode, DNA |
| `52efae5` | feat(stories): [slug] redesign + FloatingAiAssistant |
| `eec8528` | fix(stories): styled-jsx → globals.css |

### UX global
| Hash | Descripción |
|------|-------------|
| `8f71ba7` | fix(ux): ScrollToTop — reset scroll en cada navegación |
| `9b42866` | fix(scroll): AI panels no hijackean scroll de página |
| `6b4b0c8` | feat(ux): StreamingText typewriter en todos los paneles IA |
| `5144c49` | feat(ux): auto-scroll + velocidad legible (18ms/2chars) |
| `626f92c` | fix(ux): no re-animar mensajes históricos al recargar |

### Centro IA `/ia`
| Hash | Descripción |
|------|-------------|
| `27af951` | feat(ia): Centro IA — Chat IA full-screen |
| `b30d67c` | feat(ia): bifurcar API por contexto (ia-center vs map) |
| `f0c50c3` | feat(ia): personalidad cultural profunda para Centro IA |
| `bc712f7` | fix(ia): respuestas conversacionales 2-3 párrafos |
| `a675962` | fix(ia): 3 fixes anti-alucinación + contextRegion |
| `309640b` | fix(ia): map button → /explore + texto corto con cards |
| `742a747` | fix: </p> stray + guest map URL en ToolResultInline |

### Planificador (Modo 2)
| Hash | Descripción |
|------|-------------|
| `f805828` | feat(ia): Planificador de Viajes — Modo 2 completo |
| `fac2977` | feat(planner): mini mapa animado con ruta |
| `1644a40` | fix(planner-map): fitBounds + markers siempre visibles |
| `7ea06d3` | feat(planner-map): OSRM rutas reales por carretera |
| `85006e4` | fix(planner-map): markers 22px para menos solapamiento |
| `9220ed8` | feat(planner-map): auto-tour cinematográfico con card flotante |
| `3264bef` | perf(planner-map): animación 3.5x más rápida |
| `3895dbc` | feat(planner): 5 mejoras (stats, regenerar, persistencia, ver mapa, título) |
| `1ceeb8a` | feat(planner): 'Ver en mapa' pasa ruta completa al /explore |
| `b3cdd46` | feat(planner): nearest-neighbor ordering geográfico óptimo |

### Perfil + Contenido
| Hash | Descripción |
|------|-------------|
| `a28acc0` | feat(profile): /profile + /saved redesign light mode |
| `e362e6a` | docs: CONTENT_GUIDE.md para expansión de contenido |

---

## 1. Centro IA `/ia` — detalle completo

### Modo 1: Chat IA ✅
- Full-screen conversacional, separado del asistente de mapa
- `isMapMode = context.page !== "ia-center"` — bifurca toda la lógica del API
- Personalidad cultural profunda: 2-3 párrafos, nunca inventa lugares
- Guardrail anti-alucinación para restaurantes y negocios específicos
- `contextRegion` global — "adjunta restaurantes" después de "Comayagua" funciona
- StreamingText typewriter en todas las respuestas IA
- Auto-scroll sigue al cursor mientras escribe
- Mensajes históricos (sessionStorage) se muestran instantáneamente sin re-animar
- `onReveal` callback por tick sincroniza el scroll con el typewriter

### Modo 2: Planificador ✅

**Formulario:**
- Días: [1][2][3][5][7] pills
- Intereses: chip toggle multi-select con 7 categorías + colores
- Salida: [Tegucigalpa][SPS][La Ceiba][Otra] pills
- ¿Con quién?: [Solo][Pareja][Familia][Amigos]

**API `/api/plan`:**
- Busca lugares reales de DB por intereses → categorías
- **Nearest-neighbor ordering** desde coordenadas de la ciudad de salida
  - `haversineKm()` para distancias reales GPS
  - Algoritmo greedy: siempre el más cercano no visitado
  - Elimina zigzag geográfico, coherencia regional por día
- Distribuye en días (max 3/día) respetando el orden geográfico
- LLM genera título poético (5 palabras, sin mencionar el grupo)
- LLM genera descripción cultural por día en paralelo
- Guards: sin coords → no aparece en ruta; sin datos → mensaje honesto

**Mini mapa OSRM:**
- Ruta real por carreteras: `router.project-osrm.org`
- `fitBounds` automático para mostrar todos los lugares
- Animación ruta: 14pts/16ms → ~0.8s para ruta completa
- Auto-tour cinematográfico en loop:
  - Overview → flyTo parada 1 → card (nombre + categoría + región) → flyTo parada 2 → ... → overview → loop
  - Timings: fly 1.2s · view 2s · return 1.2s · pause 1.6s
  - Cleanup correcto en unmount y re-render

**9 mejoras del planificador:**
1. Distancia total km + tiempo OSRM en el header del resultado
2. Botón "Regenerar" (mismas preferencias, nueva generación)
3. Persistencia del plan a través del auth (sessionStorage → banner restaurar)
4. "Ver en mapa interactivo" → `/explore?planRoute=slug1,slug2,...`
   - ExploreFullscreenMap lee `initialPlanSlugs` y pre-carga el panel de rutas
5. Título más natural (poético, sin grupo al inicio)
6. Nearest-neighbor ordering geográfico
7. Marcadores 22px (menos solapamiento que 32px)
8. `onRouteReady` callback reporta stats desde OSRM al padre
9. `handleGuestSave` persiste plan antes de redirigir a auth

### Modo 3: Descubrir ⏳
- Tab visible, badge "Próx."
- Siguiente prioridad de implementación

---

## 2. /stories — Redesign completo

### `/stories` (lista)
- `bg-[#f0f5f2]` + AuroraBackground hero
- Filter pills como `<Link>` (server-side, no useRouter)
- Story cards: 3px top border por color rotativo (6 acentos)
- `BookMarked` icon en círculo de color
- Coming soon: dashed border + opacity-55
- `ScrollReveal` escalonado
- `FloatingAiAssistant` (nuevo widget) en lugar de `AIFloatingButton` viejo
- `DashboardDockDemo` en lugar de Navbar + Footer

### `/stories/[slug]`
- Hero con `AuroraBackground` rounded-2xl
- Back link, badges de región + IA
- Prose en `globals.css` (`.story-body`) — Server Component compatible
- Linked places con iconos Lucide (no emojis)
- Related stories con 3px border accent
- `FloatingAiAssistant` contextual

---

## 3. /profile redesign

### `/profile`
- AuroraBackground hero con avatar inicial + nombre + badge
- 2x2 grid: Favoritos / Rutas / Reseñas / Chats IA con colores
- Quick actions: Explorar / Favoritos / Nueva ruta
- No Navbar/Footer → DashboardDockDemo

### `/profile/saved`
- Back arrow → /profile
- Lucide icons por categoría: Landmark/Leaf/Utensils/Waves
- Tailwind hover classes (no inline JS)
- Empty state con dashed border

---

## 4. UX global — Mejoras de sesión 3

| Mejora | Impacto |
|--------|---------|
| `ScrollToTop` en root layout | Todas las páginas cargan desde arriba |
| AI panels: `scrollTop = scrollHeight` | No hijackean el scroll de la página |
| `StreamingText` typewriter | Toda respuesta IA se revela caracter a caracter |
| `animate={false}` para históricos | Al recargar, chat no re-anima mensajes viejos |
| `onReveal` callback | Auto-scroll sincronizado con el typewriter |
| `scroll-behavior: smooth` en html | Anchor links con transición |

---

## 5. Contenido DB — Estado actualizado

| Métrica | Sesión 1 | Sesión 2 | Sesión 3 |
|---------|----------|----------|----------|
| Lugares publicados | 16 | 16 | **45** |
| Historias publicadas | 2 | 2 | **12** |
| Vínculos story-place | ~4 | ~4 | **16** |
| Embeddings | 16 | 16 | **45** (sync post-seed) |

El agente de contenido pobló la DB siguiendo `docs/CONTENT_GUIDE.md`.

---

## 6. Pendientes para WRO

### Alta prioridad
- [ ] **Modo 3 Descubrir** — feed diario, recomendaciones, curiosidades
- [ ] **QA móvil** — iOS Safari + Android Chrome a 375px
- [ ] **Vercel producción** — resetea límite cada 24h; push pendiente de varios commits

### Media prioridad
- [ ] **Supabase producción** — nuevo proyecto, migraciones, claves rotadas
- [ ] **Jetson** — cliente Python en hardware real
- [ ] **Más fotos** — `media_assets` para los 45 lugares

### Baja prioridad
- [ ] **Reseñas semilla** — para los lugares principales
- [ ] **pgvector híbrido** — geo + coseno en RPC

---

## 7. Decisiones técnicas sesión 3

| Decisión | Razón |
|----------|-------|
| `isMapMode = context.page !== "ia-center"` | Un flag simple bifurca toda la lógica del API sin duplicar código |
| Nearest-neighbor greedy (no exacto) | TSP exacto es NP-hard; greedy da 90%+ de la calidad en <<1ms |
| `fitBounds` en lugar de zoom manual | MapLibre calcula automáticamente; manual siempre queda mal con spreads variables |
| Tour cinematográfico en mini mapa | Elimina el problema de solapamiento de markers mostrándolos uno a uno |
| `planRoute=slug1,slug2` en URL | Patrón limpio; ExploreFullscreenMap ya tiene el mecanismo de carga de rutas |
| `contextRegion` scan global | Evita que "adjunta restaurantes" pierda el contexto de "Comayagua" |
| `animate={false}` para mensajes históricos | `historicalCount` ref captura el count al mount; solo anima los nuevos |

---

## 8. Stack técnico (actualizado)

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Estilos | Tailwind CSS v4, Lucide icons |
| Animaciones | framer-motion v12 (BlurFade, HeroHighlight, Typewriter, StreamingText) |
| Mapa | MapLibre GL JS + OSRM (router.project-osrm.org) |
| Routing | Nearest-neighbor greedy (haversine distance) |
| Backend | Supabase (Postgres + PostGIS + pgvector + Storage + Edge) |
| Auth | Supabase Auth (email/password) |
| Embeddings | `gte-small` 384-dim via Supabase |
| Clima | Open-Meteo API |
| AI Chat | Groq (llama-3.3-70b-versatile) via `/api/chat` streaming SSE |
| Plan API | `/api/plan` — OSRM + Groq + nearest-neighbor |
| Monorepo | `apps/tourist` (web) + `apps/web` (admin) |
| CI | GitHub Actions — sync-embeddings cron horario |
| Deploy | Vercel (tourist) — límite 100 deploys/día free tier |

---

*Checkpoint: 17/05/2026 — Sesión 3. Próxima: Modo 3 Descubrir + QA móvil + Vercel push.*
