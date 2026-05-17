# Itinera Suite — Estado del Proyecto
> **Punto de control:** 17 mayo 2026 — Sesión 5
> **Commit HEAD:** `0ac876a` — fix(mobile): landing / permitida en movil, resto bloqueado
> **Rama:** main

---

## Resumen ejecutivo

| Módulo | Estado | Observaciones |
|--------|--------|---------------|
| Backend Supabase | ✅ Completo | 7 migraciones, RLS, Storage, Edge Functions, embeddings |
| Búsqueda semántica | ✅ Activa | `gte-small` 384-dim, **185 docs** indexados, cron horario |
| Landing `/` | ✅ Completo | Visible en móvil, animaciones CSS puras (sin blur filter) |
| Auth (`/bienvenida`, `/login`, `/register`) | ✅ Completo | Light mode unificado |
| Dashboard `/dashboard` | ✅ Completo | Mapa con **126 lugares**, stats, Mis Rutas |
| `/explore` | ✅ Completo | Drawer mejorado: Cómo llegar, contacto, heart funcional |
| `/places/[slug]` | ✅ Completo | IA panel consciente del lugar, clima, reseñas funcionales |
| `/stories` | ✅ Completo | Narrador IA consciente del contenido real de cada historia |
| `/stories/[slug]` | ✅ Completo | Lugares vinculados → tarjetas, sugerencias dinámicas |
| `/profile` | ✅ Completo | Stats, quick actions (perfil solo lectura, pendiente edición) |
| `/profile/saved` | ✅ Completo | Grid de favoritos, Lucide icons |
| `/ia` — Chat IA | ✅ Completo | Lenguaje natural: plural, follow-up, narrativa, nearby |
| `/ia` — Planificador | ✅ Completo | OSRM, nearest-neighbor, category filter corregido |
| `/ia` — Descubrir | ✅ Completo | 10 moods, cards con curiosidades IA, image slot, mood tag |
| `/mobile` | ✅ Completo | Middleware server-side, landing permitida, resto bloqueado |
| Admin Panel | ✅ Completo | 126 lugares · 30 historias · 185 embeddings |
| Jetson | ⏳ Pendiente | **Próxima sesión** |
| Contenido DB | ✅ Crecido | **126 lugares · 30 historias · 185 embeddings** |

---

## Commits sesión 5 (selección)

### Mobile & Config
| Hash | Descripción |
|------|-------------|
| `6b7a9d6` | feat(mobile): middleware server-side — landing permitida, resto /mobile |
| `0ac876a` | fix(mobile): landing / permitida en móvil |
| `e19b22b` | fix(mobile): BlurFade inViewMargin 0px |
| `18efd92` | fix(mobile): BlurFade reescrito CSS puro, sin framer-motion |
| `2f006c9` | fix(mobile): quitar backdrop-blur-xl del nav |
| `9f720a3` | fix(config): qualities [68,75,85,90] + supabase remotePattern |
| `ff9c997` | fix(dev): proxy→middleware rename, hydration mismatch stories |

### IA Narrador
| Hash | Descripción |
|------|-------------|
| `5000348` | feat(stories): Narrador IA consciente del contenido real |
| `b7992c4` | fix(ts): as unknown as para regions join en story page |
| `dca8ae5` | feat(places): IA panel consciente del lugar |

### Explore & Dock
| Hash | Descripción |
|------|-------------|
| `4af3df0` | feat(explore): drawer — Cómo llegar, contacto, heart funcional |
| `132a003` | feat(explore-map): Cómo llegar + contacto en card del mapa |
| `7f914ee` | fix(explore): Navigation→ExternalLink en Cómo llegar |
| `332a643` | fix(dock): active state por prefijo, Historias, items bloqueados guests |
| `55a2706` | fix(dock): z-index ordenado, reduced-motion, spring suavizado |

### Chat IA
| Hash | Descripción |
|------|-------------|
| `22de8ab` | feat(chat): cobertura total — 18 departamentos Honduras |
| `9f9e12d` | fix(chat): plural-aware detection + follow-up inheritance |
| `0608d42` | feat(chat): narrative intent — cuentame/hablame genera respuesta rica |
| `5b1b1b8` | fix(chat): nearby intent — qué más hay en X |

---

## 1. Web App — Estado final sesión 5

### Chat IA `/ia` — Modo 1 ✅
- **18 departamentos** detectados con keywords locales
- Detección plural-aware (religiosos→religion, iglesias→iglesia)
- Follow-up inheritance ("Dame una lista" hereda contexto)
- Narrative intent ("Cuéntame sobre X" → 2-3 párrafos + tarjeta)
- Nearby intent ("¿Qué más hay en X?" → todas las categorías)
- Scan de mensajes asistente para contextRegion
- 0 resultados → LLM honesto + sugerencias

### Chat IA `/ia` — Modo 2 Planificador ✅
- Bug crítico corregido: `.in("place_categories.slug")` → slug→UUID lookup
- Nearest-neighbor ordering, OSRM, auto-tour cinematográfico

### Chat IA `/ia` — Modo 3 Descubrir ✅
- 10 moods, Fisher-Yates shuffle, fallback si mood sin lugares
- Image slot listo para media_assets
- Mood tag en cada card, curiosidades máx 15 palabras
- `missingMoods` aviso amber

### Narrador IA en Stories ✅
- Pasa body (1500 chars), summary, region, story_places al API
- Rama story-aware antes de detección region/categoría
- "¿Dónde vivir esto?" → fetch story_places → tarjetas reales
- Sugerencias dinámicas según contenido

### IA Panel en Places ✅
- summary, tips, category, region, rating como contexto
- System prompt experto en el lugar específico
- Sugerencias: historia, consejos, cuándo visitar

### Explore `/explore` ✅
- Drawer: heart funcional (rojo cuando guardado), Cómo llegar (ExternalLink → Google Maps), phone, website, address
- Card del mapa: mismos features
- ExplorePlace type incluye phone, website, address_i18n

### Dock ✅
- Active state con startsWith (subrutas iluminan correctamente)
- Historias (BookOpen) reemplaza Guardados
- Items protegidos con opacity-40 para guests
- Z-index ordenado: dock 45 > drawer backdrop 48 > drawer 49
- prefers-reduced-motion respetado, spring suavizado

### Mobile ✅
- middleware.ts server-side: intercepta antes de renderizar
- Landing `/` permitida en móvil
- Todo lo demás → `/mobile` con "App próximamente"
- Página `/mobile` con instrucción de usar desktop

---

## 2. Contenido DB — Estado final

| Métrica | Sesión 3 | Sesión 4 | Sesión 5 |
|---------|----------|----------|----------|
| Lugares publicados | 45 | 126 | **126** |
| Historias publicadas | 12 | 30 | **30** |
| Embeddings | 45 | 185 | **185** |
| Lugares con coords | 45 | 126 | **126** |

---

## 3. Pendientes para WRO

### Para la terminal Jetson (Sesión 6+)
- [ ] **Cliente Python** — conectar al backend Supabase/API
- [ ] **Edge Functions** — ya están listas en Supabase
- [ ] **Pantalla/display** — interfaz en el hardware
- [ ] **Flujo de demostración** — qué hace la terminal en WRO

### Web — pendiente baja prioridad
- [ ] **Perfil editable** — nombre, password
- [ ] **Rutas editables** — modificar paradas después de guardar
- [ ] **Fotos** — media_assets para los 126 lugares
- [ ] **Deploy Vercel** — resetea límite cada 24h

---

## 4. Decisiones técnicas sesión 5

| Decisión | Razón |
|----------|-------|
| middleware.ts server-side para mobile | MobileGuard cliente causaba flash durante hidratación |
| BlurFade reescrito en CSS puro | framer-motion + filter:blur causaba GPU compositing invisible en Android |
| ExternalLink para "Cómo llegar" | Navigation icon confundía con "Agregar a ruta" |
| slug→UUID en category filter | PostgREST ignora .in() sobre recursos embebidos silenciosamente |
| Rama place/story-aware antes de region/category | Evita que preguntas sobre un lugar caigan en búsqueda genérica |

---

## 5. Stack técnico (sin cambios)

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Estilos | Tailwind CSS v4, Lucide icons |
| Animaciones | CSS transitions (BlurFade), framer-motion (dock, planner map) |
| Mapa | MapLibre GL JS + OSRM |
| Backend | Supabase (Postgres + PostGIS + pgvector + Storage + Edge) |
| Auth | Supabase Auth (email/password) |
| AI Chat | Groq (llama-3.3-70b-versatile) via `/api/chat` streaming SSE |
| Discover/Plan | `/api/discover` + `/api/plan` — Groq + nearest-neighbor |
| Monorepo | `apps/tourist` (web) + `apps/web` (admin) |
| CI | GitHub Actions — sync-embeddings cron horario |
| Deploy | Vercel (tourist) — límite 100 deploys/día free tier |

---

*Checkpoint: 17/05/2026 — Sesión 5. Web completa. Próxima sesión: Terminal Jetson.*
