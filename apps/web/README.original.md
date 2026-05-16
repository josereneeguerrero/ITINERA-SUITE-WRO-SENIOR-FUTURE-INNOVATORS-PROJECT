# Itinera Admin Web

Panel administrativo para operar el contenido de Itinera. Administra lugares, historias, resenas, sponsors, dispositivos y datos que alimentan la web turistica y la terminal.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase SSR/client

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Responsabilidad del admin

- Crear y editar lugares.
- Crear y editar historias.
- Revisar contenido y resenas.
- Mantener datos listos para consumo publico.
- En la siguiente fase, ayudar a monitorear la calidad semantica de cada entidad.

## Relacion con IA semantica

El admin sera el punto de entrada para nuevos datos. Cada nuevo lugar, historia, region o categoria debe poder alimentar la capa semantica sin cambiar codigo.

Roadmap:

- [`../../docs/ITINERA_AI_SEMANTIC_ROADMAP.md`](../../docs/ITINERA_AI_SEMANTIC_ROADMAP.md)
