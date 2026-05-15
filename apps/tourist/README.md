# Itinera Tourist Web

App publica Itinera pa turistas. Landing, auth, `/dashboard`, mapa `/explore`, lugares, historias, rutas, widget IA.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase SSR/client
- MapLibre GL
- Vercel AI SDK + Groq
- Supabase pgvector + `gte-small` embeddings pa busqueda semantica

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Variables IA semantica

Ver `.env.local.example`. Busqueda semantica usa Supabase `gte-small`, no necesita `OPENAI_API_KEY`.

## Partes clave

- `/`: landing publica.
- `/dashboard`: inicio post-login.
- `/explore`: mapa full-screen tipo Maps.
- `/places/[slug]`: detalle destino.
- `/stories`: historias culturales.
- `/api/chat`: endpoint Itinera IA.

## IA y mapa

IA controla acciones `/explore` via eventos UI, usa capa semantica v1:

- [`../../docs/ITINERA_AI_SEMANTIC_ROADMAP.md`](../../docs/ITINERA_AI_SEMANTIC_ROADMAP.md)

Regla: IA no inventa destinos ni categorias. Toda respuesta accionable sale de Supabase.