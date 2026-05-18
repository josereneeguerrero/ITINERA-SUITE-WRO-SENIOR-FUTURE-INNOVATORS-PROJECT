# Itinera Suite — Estado del Proyecto
> **Punto de control:** 17 mayo 2026 — Sesión 6
> **Commit HEAD:** `e775512` — feat(profile): logout button
> **Rama:** main

---

## Resumen ejecutivo

| Módulo | Estado | Observaciones |
|--------|--------|---------------|
| Backend Supabase | ✅ Completo | 7 migraciones, RLS, Storage, Edge Functions, embeddings |
| Búsqueda semántica | ✅ Activa | `gte-small` 384-dim, 185 docs indexados |
| Landing `/` | ✅ Completo | BlurFade CSS puro, funciona en todos los browsers |
| Auth | ✅ Completo | Login, register, logout en perfil |
| Dashboard `/dashboard` | ✅ Completo | 126 lugares en mapa |
| `/explore` | ✅ Completo | Drawer con Cómo llegar, contacto, heart funcional |
| `/places/[slug]` | ✅ Completo | IA panel consciente del lugar, clima, reseñas, fotos |
| `/stories` | ✅ Completo | **Narración IA con ElevenLabs (Antoni)**, 50 historias 400-800 words |
| `/stories/[slug]` | ✅ Completo | Narrador player, narrador IA consciente, lugares vinculados |
| `/profile` | ✅ Completo | Stats reales, logout button, quick actions |
| `/profile/saved` | ✅ Completo | Grid de favoritos |
| `/ia` — Chat IA | ✅ Completo | Voz (Web Speech API), 18 regiones, narrative/follow-up/nearby |
| `/ia` — Planificador | ✅ Completo | OSRM, nearest-neighbor, category filter corregido |
| `/ia` — Descubrir | ✅ Completo | 10 moods, curiosidades IA, image slot, mood tag |
| `/routes` | ✅ Completo | Crear, ver, renombrar, eliminar paradas, compartir |
| `/mobile` | ✅ Completo | Middleware server-side, redirige todos los móviles |
| Admin Panel | ✅ Completo | 126 lugares · 50 historias · 185 embeddings |
| Jetson | ⏳ **Próxima sesión** | Edge Functions listas |

---

## Commits sesión 6

| Hash | Descripción |
|------|-------------|
| `e775512` | feat(profile): logout button + ocultar stat Chats IA |
| `633f399` | feat(content): 50 historias reescritas 400-800 palabras con Groq |
| `cd78b56` | fix(stories): corregir \\n literales en DB + parser |
| `79f86c2` | feat(stories): narración IA ElevenLabs play/pause/stop |
| `65c0194` / `7f39723` | fix(narrate): voces Adam → Antoni (más cálida) |
| `097f5c3` | fix(dock): mini modal para guests — sin bypass por bienvenida |
| `240c6a9` | feat(ia): voz en ai-drawer + glowing-assistant, fix tooltip |
| `ad3df2f` | feat(ia): Web Speech API — entrada de voz en Chat IA |
| `cc4e3eb` | feat(rutas): renombrar + eliminar paradas individuales |
| `0e27192` | feat(fotos): external URL support + 17 lugares Unsplash |
| `36532c2` | fix(mobile): middleware server-side |
| `18efd92` | fix(mobile): BlurFade CSS puro sin framer-motion |

---

## 1. Narración IA en Stories ✅

- **ElevenLabs TTS** — voz Antoni, `eleven_multilingual_v2`, español Honduras
- **`/api/narrate`** — recibe body de historia, strip markdown, llama ElevenLabs, stream audio
- **`NarratorPlayer`** — player completo: play/pause/stop, barra de progreso, tiempo actual/total
- **50 historias** reescritas con Groq: 400-800 palabras, 3 secciones, prosa cultural rica
- **`ELEVENLABS_API_KEY`** configurado en Vercel

## 2. Entrada de Voz en IA ✅

- **`useVoiceInput` hook** — Web Speech API nativa, sin API key, sin costo
- Activo en: Chat IA `/ia`, AI Drawer `/explore`, FloatingAiAssistant `/stories`, `/places`
- Estados visuales: idle / listening (rojo pulsando) / processing (amber) / error / unsupported
- Idioma: `es-HN`

## 3. Seguridad Guest Mode ✅

- **Mini modal en dock** — guest que toca Rutas/Perfil ve popup "Crear cuenta / Entrar"
- Sin bypass por `/bienvenida → Continuar como invitado`

## 4. Contenido DB — Estado final

| Métrica | Sesión 5 | Sesión 6 |
|---------|----------|----------|
| Lugares publicados | 126 | **126** |
| Historias publicadas | 30 | **50** |
| Historias reescritas | 0 | **50** (400-800 words cada una) |
| Embeddings | 185 | **185** |
| Lugares con fotos | 10 | **17** |

## 5. Pendientes para WRO

### Terminal Jetson (Sesión 7)
- [ ] Cliente Python en hardware real
- [ ] Interfaz de display en terminal
- [ ] Flujo de demostración WRO
- [ ] Edge Functions conectadas al hardware

### Web — baja prioridad
- [ ] Perfil editable (nombre, contraseña)
- [ ] Fotos reales para los 126 lugares
- [ ] Voz mejorada (Azure TTS cuando disponible)

---

## 6. Stack técnico actualizado

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Estilos | Tailwind CSS v4, Lucide icons |
| Animaciones | CSS transitions (BlurFade), framer-motion (dock) |
| Mapa | MapLibre GL JS + OSRM |
| Backend | Supabase (Postgres + PostGIS + pgvector + Storage) |
| Auth | Supabase Auth — logout en perfil |
| AI Chat | Groq llama-3.3-70b-versatile |
| Narración | ElevenLabs Antoni — `eleven_multilingual_v2` |
| Voz input | Web Speech API (browser nativo) |
| Mobile | middleware.ts server-side → /mobile |
| Deploy | Vercel — ELEVENLABS_API_KEY configurado |

---

*Checkpoint: 17/05/2026 — Sesión 6. Web completa y en producción. Próxima sesión: Terminal Jetson.*
