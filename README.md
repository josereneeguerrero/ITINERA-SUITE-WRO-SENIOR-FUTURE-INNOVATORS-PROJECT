# Itinera Suite - WRO 2026

Itinera Suite = sistema turismo cultural INNOVAKERS, WRO 2026. Vision: unir web, admin panel, terminal fisica, futura app movil → descubrir Honduras con datos reales, contexto cultural, IA guiada.

## Apps del monorepo

| App | Ruta | Proposito |
| --- | --- | --- |
| Tourist Web | `apps/tourist` | Landing, auth, inicio, mapa `/explore`, lugares, historias, rutas, widget IA. |
| Admin Web | `apps/web` | Panel admin → lugares, historias, resenas, sponsors, dispositivos, contenido. |
| Supabase | `supabase` | DB, migraciones, Storage, Auth, Edge Functions, seeds. |
| Shared Types | `types` | Tipos generados Supabase para apps. |

## Stack actual

| Capa | Tecnologia |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui style, lucide-react |
| Tourist AI | Vercel AI SDK, Groq, `/api/chat`, acciones UI mapa y rutas |
| Mapas | MapLibre GL, CARTO/OpenStreetMap, OSRM demo rutas |
| Backend / DB | Supabase: Postgres, PostGIS, Auth, Storage, Edge Functions |
| Busqueda actual | `tsvector` full-text + PostGIS geo |
| Busqueda semantica | pgvector + Supabase `gte-small` embeddings + busqueda hibrida |
| Terminal fisica | Python 3.11 + SQLite en NVIDIA Jetson Orin Nano 8GB |

## Supabase

- Project ID: `hwsddziticyusncajyes`
- URL: `https://hwsddziticyusncajyes.supabase.co`
- No commitear secretos: `service_role`, device tokens, `DEVICE_SETUP_SECRET`, claves proveedores IA.

### Migraciones actuales

| Orden | Archivo | Contenido |
| --- | --- | --- |
| 1 | `20260511010000_extensions.sql` | Extensiones base: PostGIS, pgcrypto. |
| 2 | `20260511020000_core_schema.sql` | Enums, tablas principales, triggers `updated_at`, columnas busqueda. |
| 3 | `20260511030000_auth_functions.sql` | Auth hook, admin helpers, ratings, device RPCs. |
| 4 | `20260511040000_rls.sql` | Politicas RLS, reglas reviews. |
| 5 | `20260511050000_search.sql` | RPCs busqueda textual y cercana. |
| 6 | `20260511060000_storage.sql` | Buckets y politicas Storage. |
| 7 | `20260511080000_helpers.sql` | Helpers posteriores. |

### Edge Functions actuales

| Funcion | Metodo | Auth | Proposito |
| --- | --- | --- | --- |
| `device-register` | POST | `x-device-setup-secret` | Registrar terminal Jetson. |
| `export-terminal-data` | GET | Bearer token + `x-device-id` | Exportar snapshot JSON → SQLite local. |
| `ingest-terminal-events` | POST | Bearer token + `x-device-id` | Recibir eventos terminal. |

## Estado funcional

### Tourist Web

- Landing publica, narrativa Itinera.
- Auth + flujo guest.
- `/dashboard` home general.
- Mapa `/explore` full-screen: search bar tipo Maps, pines categoria, card lugar, rutas OSRM + tramos aproximados, dock inferior, widget Itinera IA.
- Paginas lugares/historias → datos reales.

### Admin Web

- Panel admin gestiona contenido.
- Base lista: lugares, historias, regiones, categorias → experiencia publica.
- Guardar/editar/publicar desde admin dispara rebuild semantico automatico (`changed`) via API interna.
- Dashboard admin muestra observabilidad semantica (`semantic_documents`) y permite ejecutar `changed/backfill`.
- Pendiente: herramientas calidad semantica, estado embeddings.

Cobertura admin actual:
- Si: lugares, historias, resenas, sponsors, terminales, disparo semantico manual.
- No aun: CRUD de regiones/categorias, historial de jobs semanticos, vista de errores semanticos por entidad.

### IA actual

- Carga lugares reales desde Supabase.
- Groq interpreta y responde.
- Emite acciones UI: abrir lugar, filtro, agregar ruta, limpiar.
- Capa semantica v1: `semantic_documents`, embeddings `gte-small`, busqueda hibrida → candidatos reales antes de responder.

## Lo que sigue

Proximo bloque: IA semantica adaptable. Sin dependencia destinos actuales ni reglas hardcodeadas. Usa significado datos reales, se adapta cuando DB crece.

Documento principal:

- [`docs/ITINERA_AI_SEMANTIC_ROADMAP.md`](docs/ITINERA_AI_SEMANTIC_ROADMAP.md)

Roadmap cubre: que tenemos, conexiones existentes, que falla hoy, como funciona busqueda semantica, cambios Supabase, que recibe `/api/chat`, que prueba el siguiente agente.

## Comandos utiles

```bash
# Tourist Web
cd apps/tourist
npm install
npm run dev
npm run build
npm run lint

# Admin Web
cd apps/web
npm install
npm run dev
npm run build
npm run lint

# Supabase
supabase login
supabase link --project-ref hwsddziticyusncajyes
supabase db push
supabase gen types typescript --project-id hwsddziticyusncajyes -o types/database.ts

# Semantica v1
supabase functions deploy semantic-embeddings
supabase secrets set SEMANTIC_REBUILD_SECRET=<secret>
# web server env
# SEMANTIC_REBUILD_SECRET=<same secret>
```

## Reglas de trabajo

- No editar migraciones aplicadas en produccion; nueva migracion por cambio schema.
- No inventar datos: IA responde solo desde Supabase o declara sin datos.
- Mantener `README.md` como indice principal.
- Documentar cambios estructurales en `docs/`.
- Mantener `/dashboard` inicio general, `/explore` mapa operativo.
