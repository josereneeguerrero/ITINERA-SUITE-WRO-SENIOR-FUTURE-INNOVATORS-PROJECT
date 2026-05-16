# Itinera Suite - WRO 2026

Itinera Suite es el sistema de turismo cultural de INNOVAKERS para WRO 2026. La vision es unir una experiencia web, un panel administrativo, una terminal fisica y una futura app movil para descubrir Honduras con datos reales, contexto cultural e inteligencia artificial guiada.

## Apps del monorepo

| App | Ruta | Proposito |
| --- | --- | --- |
| Tourist Web | `apps/tourist` | Landing, autenticacion, inicio, mapa `/explore`, lugares, historias, rutas y widget de IA. |
| Admin Web | `apps/web` | Panel para administrar lugares, historias, resenas, sponsors, dispositivos y contenido operativo. |
| Supabase | `supabase` | Base de datos, migraciones, Storage, Auth, Edge Functions y seeds. |
| Shared Types | `types` | Tipos generados desde Supabase para uso en las apps. |

## Stack actual

| Capa | Tecnologia |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui style, lucide-react |
| Tourist AI | Vercel AI SDK, Groq, `/api/chat`, acciones UI para mapa y rutas |
| Mapas | MapLibre GL, CARTO/OpenStreetMap, OSRM demo para rutas |
| Backend / DB | Supabase: Postgres, PostGIS, Auth, Storage, Edge Functions |
| Busqueda actual | `tsvector` full-text + PostGIS geo |
| Busqueda semantica | pgvector + Supabase `gte-small` embeddings + busqueda hibrida |
| Terminal fisica | Python 3.11 + SQLite en NVIDIA Jetson Orin Nano 8GB |

## Supabase

- Project ID: `hwsddziticyusncajyes`
- URL: `https://hwsddziticyusncajyes.supabase.co`
- No commitear secretos: `service_role`, device tokens, `DEVICE_SETUP_SECRET`, claves de proveedores IA.

### Migraciones actuales

| Orden | Archivo | Contenido |
| --- | --- | --- |
| 1 | `20260511010000_extensions.sql` | Extensiones base: PostGIS, pgcrypto. |
| 2 | `20260511020000_core_schema.sql` | Enums, tablas principales, triggers `updated_at`, columnas de busqueda. |
| 3 | `20260511030000_auth_functions.sql` | Auth hook, admin helpers, ratings y device RPCs. |
| 4 | `20260511040000_rls.sql` | Politicas RLS y reglas de reviews. |
| 5 | `20260511050000_search.sql` | RPCs de busqueda textual y cercana. |
| 6 | `20260511060000_storage.sql` | Buckets y politicas de Storage. |
| 7 | `20260511080000_helpers.sql` | Helpers posteriores del proyecto. |

### Edge Functions actuales

| Funcion | Metodo | Auth | Proposito |
| --- | --- | --- | --- |
| `device-register` | POST | `x-device-setup-secret` | Registrar terminal Jetson. |
| `export-terminal-data` | GET | Bearer token + `x-device-id` | Exportar snapshot JSON para SQLite local. |
| `ingest-terminal-events` | POST | Bearer token + `x-device-id` | Recibir eventos de la terminal. |

## Estado funcional

### Tourist Web

- Landing publica con narrativa Itinera.
- Auth y flujo guest.
- Inicio `/dashboard` como home general.
- Mapa `/explore` full-screen con:
  - search bar tipo Maps,
  - pines por categoria,
  - card de lugar,
  - rutas con OSRM y tramos aproximados,
  - dock inferior,
  - widget de Itinera IA.
- Paginas de lugares e historias conectadas a datos reales.

### Admin Web

- Panel administrativo para gestionar contenido.
- Base preparada para que lugares, historias, regiones y categorias alimenten la experiencia publica.
- Pendiente: herramientas de calidad semantica y estado de embeddings.

### IA actual

- Usa Supabase para cargar lugares reales.
- Usa Groq para interpretar y responder.
- Puede emitir acciones UI como abrir lugar, aplicar filtro, agregar ruta o limpiar.
- La capa semantica v1 usa `semantic_documents`, embeddings `gte-small` y busqueda hibrida para recuperar candidatos reales antes de responder.

## Lo que sigue

El siguiente bloque grande es construir la IA semantica adaptable de Itinera. No debe depender de los destinos actuales ni de reglas hardcodeadas. Debe usar el significado de los datos reales y adaptarse cuando la base crezca.

Documento principal:

- [`docs/ITINERA_AI_SEMANTIC_ROADMAP.md`](docs/ITINERA_AI_SEMANTIC_ROADMAP.md)

Ese roadmap explica:

- que tenemos,
- que conexiones existen,
- que falla hoy,
- como debe funcionar la busqueda semantica,
- que cambios necesita Supabase,
- que debe recibir `/api/chat`,
- que debe probar el siguiente agente.

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
```

## Reglas de trabajo

- No editar migraciones ya aplicadas en produccion; crear una nueva migracion por cambio de schema.
- No inventar datos turisticos: la IA solo debe responder desde Supabase o decir que no tiene datos.
- Mantener `README.md` como indice principal.
- Documentar cambios estructurales en `docs/`.
- Mantener `/dashboard` como inicio general y `/explore` como mapa operativo.
