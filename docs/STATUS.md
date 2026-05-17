# Itinera Suite — Estado del Proyecto
> **Punto de control:** 17 mayo 2026 — Sesión 4
> **Commit HEAD:** `e1e1b03` — feat(discover): image slot, mood tag, curiosidades cortas, aviso moods sin resultados
> **Rama:** main

---

## Resumen ejecutivo

| Módulo | Estado | Observaciones |
|--------|--------|---------------|
| Backend Supabase | ✅ Completo | 7 migraciones, RLS, Storage, Edge Functions, embeddings |
| Búsqueda semántica | ✅ Activa | `gte-small` 384-dim, **185 docs** indexados, cron horario |
| Landing `/` | ✅ Completo | Light mode, animaciones, INNOVAKERS real, sin lag |
| Auth (`/bienvenida`, `/login`, `/register`) | ✅ Completo | Light mode unificado |
| Dashboard `/dashboard` | ✅ Mejorado | Mapa con 126 lugares (fix limit 24→200) |
| `/explore` | ✅ Completo | Search end-to-end, planRoute URL param |
| `/places/[slug]` | ✅ Completo | Hero, tabs, AI panel, foto slider, clima |
| `/stories` | ✅ Rediseñado | Light mode, AuroraBackground, FloatingAiAssistant |
| `/stories/[slug]` | ✅ Rediseñado | Hero Aurora, prose en globals.css |
| `/profile` | ✅ Rediseñado | Light mode, stats grid, quick actions |
| `/profile/saved` | ✅ Rediseñado | Lucide icons, Tailwind hover, DNA correcto |
| `/ia` — Chat IA | ✅ Mejorado | +inteligencia natural: plural, follow-up, narrativa, nearby |
| `/ia` — Planificador | ✅ Completo | OSRM, nearest-neighbor, mapa tour, fix category filter |
| `/ia` — Descubrir | ✅ Completo | 10 moods, cards con curiosidades IA, mood tag, image slot |
| Admin Panel | ✅ Completo | Sin cambios en sesión 4 |
| Jetson | ⏳ Pendiente | Edge Functions listas |
| Contenido DB | ✅ Crecido | **126 lugares · 30 historias · 185 embeddings** |

---

## Commits sesión 4 (12 commits)

### Fixes de build / deploy
| Hash | Descripción |
|------|-------------|
| `3c1595a` | fix(ts): reducedMotion.current → noAnimation en streaming-text |
| `01262ed` | fix(ts): as unknown as para type cast en profile/saved |

### Dashboard
| Hash | Descripción |
|------|-------------|
| `9f17eb2` | fix(dashboard): limit 24→200 — mapa mostraba solo 24 de 126 lugares |

### Modo 3: Descubrir
| Hash | Descripción |
|------|-------------|
| `5ffec86` | feat(ia): Modo 3 Descubrir — moods, cards, curiosidades IA, pre-fill planificador |
| `a05758f` | fix(descubrir): pb-28 para que navbar no tape el CTA |
| `583050c` | fix(discover): fallback cuando mood sin lugares + shuffle para variedad |
| `9ca8738` | fix(api): category filter — slug→UUID lookup, corrige /discover y /plan |
| `e1e1b03` | feat(discover): image slot, mood tag, curiosidades cortas, aviso moods sin resultados |

### Chat IA — Inteligencia natural
| Hash | Descripción |
|------|-------------|
| `3b9f850` | fix(chat): regiones expandidas (6→12), scan asistente, 0 resultados con LLM |
| `9f9e12d` | fix(chat): plural-aware detection + follow-up context inheritance |
| `0608d42` | feat(chat): narrative intent — cuentame/hablame genera respuesta rica + tarjeta |
| `5b1b1b8` | fix(chat): nearby intent — "qué más hay en X" busca todas las categorías |

---

## 1. Centro IA `/ia` — detalle completo

### Modo 1: Chat IA ✅ (mejorado en sesión 4)

**Inteligencia de lenguaje natural:**
- **12 regiones detectadas** (antes 6): Atlántida, Colón, Olancho, Santa Bárbara, Lempira, Choluteca, Yoro + keywords como "tela", "lancetilla", "trujillo", "juticalpa"
- **Detección plural-aware**: "religiosos" detecta `religion`, "restaurantes" detecta `food`, "iglesias" detecta `religion`
- **Follow-up inheritance**: "Dame una lista", "sí", "cuáles son" hereda último region+categoría de toda la conversación (user + assistant)
- **Scan de mensajes asistente**: "y para comer ahí?" funciona aunque la región la dijo el asistente ("Atlántida")
- **Narrative intent**: "Cuéntame sobre X", "Háblame de X", "Explícame" → 2-3 párrafos ricos (historia, detalles, curiosidades) + tarjeta al final + sugerencias
- **Nearby intent**: "¿Qué más hay en X?", "qué puedo visitar", "cerca de" → busca TODAS las categorías en la región (no solo la última)
- **0 resultados → LLM honesto**: en vez de mensaje muerto, respuesta cultural + sugerencias de follow-up
- **6 regiones aún faltantes**: El Paraíso, Gracias a Dios, Intibucá, La Paz, Ocotepeque, Valle

**Capacidades previas mantenidas:**
- `isMapMode` bifurca lógica
- Personalidad cultural profunda, anti-alucinación
- StreamingText, auto-scroll, históricos instantáneos

### Modo 2: Planificador ✅
- Sin cambios funcionales en sesión 4
- **Bug crítico corregido**: `.in("place_categories.slug")` no filtraba en PostgREST → fix: slug→UUID lookup antes de `.in("category_id")`
- Ahora filtra correctamente por categoría

### Modo 3: Descubrir ✅ (nuevo en sesión 4)

**UI:**
- Header con icono Compass + título
- 10 mood pills (selección 1-3): Aventura, Historia Viva, Misterio Maya, Mar & Playa, Naturaleza, Gourmet, Fe & Espíritu, Arte & Cultura, Paisajes Épicos, En Familia
- Botón "Descubrir" → "Descubrir de nuevo" tras primer resultado
- Aviso amber cuando un mood no tiene lugares en DB aún
- 6 cards en grid 2 cols

**Cada card:**
- Slot de imagen listo (placeholder degradado elegante hasta tener fotos)
- Categoría + mood tag badge
- Nombre + región + rating
- Curiosidad IA (max 15 palabras, dato sorprendente/récord/leyenda)
- Link "Ver lugar →"

**CTA:** "Planificar con estos destinos →" — pre-llena intereses en el Planificador

**API `/api/discover`:**
- Moods → category slugs → UUIDs → `category_id` filter (correcto)
- Fisher-Yates shuffle → variedad en cada llamada
- Fallback a featured si < 3 resultados por categoría
- `missingMoods` reporta qué moods no tienen lugares
- Curiosidades en paralelo con Groq (temperature 0.95)

---

## 2. Contenido DB — Estado actualizado

| Métrica | Sesión 1 | Sesión 2 | Sesión 3 | Sesión 4 |
|---------|----------|----------|----------|----------|
| Lugares publicados | 16 | 16 | 45 | **126** |
| Historias publicadas | 2 | 2 | 12 | **30** |
| Embeddings (docs) | 16 | 16 | 45 | **185** |
| Lugares con coords | 16 | 16 | 45 | **126** (todos) |

---

## 3. Pendientes para WRO

### Alta prioridad
- [ ] **6 regiones faltantes** en chat: El Paraíso, Gracias a Dios, Intibucá, La Paz, Ocotepeque, Valle
- [ ] **QA móvil** — iOS Safari + Android Chrome a 375px
- [ ] **Fotos** — `media_assets` para lugares → activar image slot en cards Descubrir

### Media prioridad
- [ ] **Supabase producción** — nuevo proyecto, migraciones, claves rotadas
- [ ] **Jetson** — cliente Python en hardware real
- [ ] **Más contenido DB** — restaurantes/gastronomía (categoría `food` tiene pocos lugares)

### Baja prioridad
- [ ] **Reseñas semilla** — para lugares principales
- [ ] **pgvector híbrido** — geo + coseno en RPC

---

## 4. Decisiones técnicas sesión 4

| Decisión | Razón |
|----------|-------|
| `slug → UUID` antes de `.in("category_id")` | PostgREST ignora `.in("embedded.slug")` silenciosamente — bug crítico en plan y discover |
| Prefix match para detección de categoría/región | Cubre plurales (religiosos→religion) sin mantener lista exhaustiva |
| Follow-up scan en toda la conversación (user+assistant) | "ahí" y "dame una lista" pierden contexto si solo se mira el último mensaje |
| Narrative intent antes de category/region branches | Evita que "Cuéntame sobre X" caiga en búsqueda de categoría |
| `missingMoods` en respuesta del API | UX honesta: el usuario sabe que Gourmet no tiene datos aún |
| Image slot con `imageUrl: null` | Listo para media_assets sin romper nada — placeholder elegante mientras tanto |

---

## 5. Stack técnico (sin cambios)

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Estilos | Tailwind CSS v4, Lucide icons |
| Animaciones | framer-motion v12 |
| Mapa | MapLibre GL JS + OSRM (router.project-osrm.org) |
| Routing | Nearest-neighbor greedy (haversine distance) |
| Backend | Supabase (Postgres + PostGIS + pgvector + Storage + Edge) |
| Auth | Supabase Auth (email/password) |
| Embeddings | `gte-small` 384-dim via Supabase |
| Clima | Open-Meteo API |
| AI Chat | Groq (llama-3.3-70b-versatile) via `/api/chat` streaming SSE |
| Discover API | `/api/discover` — Groq + shuffle + category filter |
| Plan API | `/api/plan` — OSRM + Groq + nearest-neighbor + category filter |
| Monorepo | `apps/tourist` (web) + `apps/web` (admin) |
| CI | GitHub Actions — sync-embeddings cron horario |
| Deploy | Vercel (tourist) — límite 100 deploys/día free tier |

---

*Checkpoint: 17/05/2026 — Sesión 4. Próxima: 6 regiones faltantes + QA móvil + fotos media_assets.*
