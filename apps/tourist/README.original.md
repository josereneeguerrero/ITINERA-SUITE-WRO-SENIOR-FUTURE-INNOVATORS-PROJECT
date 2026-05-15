# Itinera Tourist Web

App publica de Itinera para turistas. Contiene landing, autenticacion, inicio `/dashboard`, mapa `/explore`, paginas de lugares, historias, rutas y widget de Itinera IA.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase SSR/client
- MapLibre GL
- Vercel AI SDK + Groq
- Supabase pgvector + `gte-small` embeddings para recuperacion semantica

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Variables IA semantica

Ver `.env.local.example`. La busqueda semantica usa Supabase `gte-small`, por eso no necesita `OPENAI_API_KEY`.

## Partes clave

- `/`: landing publica.
- `/dashboard`: inicio general despues de entrar.
- `/explore`: mapa full-screen tipo Maps.
- `/places/[slug]`: detalle de destino.
- `/stories`: historias culturales.
- `/api/chat`: endpoint de Itinera IA.

## IA y mapa

La IA controla acciones de `/explore` por eventos UI y usa la capa semantica v1 descrita en:

- [`../../docs/ITINERA_AI_SEMANTIC_ROADMAP.md`](../../docs/ITINERA_AI_SEMANTIC_ROADMAP.md)

Regla principal: la IA no debe inventar destinos ni categorias. Toda respuesta accionable debe salir de Supabase.
