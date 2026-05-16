# Itinera Admin Web

Panel admin para operar contenido Itinera. Maneja lugares, historias, resenas, sponsors, dispositivos y datos pa web turistica y terminal.

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

- Crear/editar lugares.
- Crear/editar historias.
- Revisar contenido y resenas.
- Mantener datos listos pa consumo publico.
- Sig fase: monitorear calidad semantica de entidades.

## Relacion con IA semantica

Admin = punto entrada pa datos nuevos. Cada lugar, historia, region o categoria debe poder alimentar capa semantica sin cambiar codigo.

Automatizacion v1:
- Cada guardar/editar en places y stories dispara `POST /api/semantic/rebuild` (server-side).
- Los toggles Publicar/Ocultar tambien disparan rebuild en modo `changed`.
- Endpoint interno llama `supabase/functions/v1/semantic-embeddings` con `x-semantic-secret`, sin exponer secreto en cliente.
- Dashboard admin incluye panel de observabilidad semantica (total/ready/pending/error + ultima ejecucion + botones Sync changed / Backfill).

## Cobertura admin (hoy)

Controlado desde panel:
- Lugares: crear, editar, publicar/ocultar.
- Historias: crear, editar, publicar/ocultar, relacionar lugares.
- Resenas: moderacion.
- Sponsors: vista operativa basica.
- Terminales: estado y actividad.
- Semantica: observabilidad en dashboard + ejecucion manual `changed/backfill`.

Brechas detectadas:
- Regiones y categorias no tienen CRUD dedicado en admin (hoy dependen de DB directa).
- No existe historial persistente de corridas semanticas (solo estado actual + ultimo resultado en UI).
- Falta vista de salud semantica por entidad (ej: top errores por `entity_type`).

Roadmap:

- [`../../docs/ITINERA_AI_SEMANTIC_ROADMAP.md`](../../docs/ITINERA_AI_SEMANTIC_ROADMAP.md)
