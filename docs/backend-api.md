# Itinera — mapeo backend (Supabase)

Referencia para cuando exista la capa HTTP (Next.js, Expo, etc.). Hoy el acceso es vía **PostgREST** automático de Supabase (`/rest/v1/...`) y RPC.

## Recursos principales

| Recurso | Tabla / RPC | Rol típico |
|---------|-------------|------------|
| Lugares publicados | `places` | `anon`, `authenticated` |
| Historias publicadas | `stories` + `story_places` | `anon` |
| Reseñas visibles | `reviews` (`moderation_status=approved`) | `anon` |
| Sponsors activos | `sponsors`, `sponsor_campaigns`, `sponsor_campaign_places` | `anon` |
| Perfil | `profiles` | propio usuario |
| Favoritos / itinerarios | `favorites`, `itineraries`, `itinerary_stops` | dueño |
| Rutas publicadas | `routes`, `route_points` | `anon` |
| Búsqueda geo + boost | `rpc/search_places_nearby` | `anon` |
| Registro terminal | Edge `device-register` → `register_device` | service (Edge) |
| Telemetría terminal | Edge `ingest-terminal-events` → `ingest_interaction_event` | service (Edge) |

## Headers PostgREST

- `apikey`: clave `anon` o `service_role` (nunca uses service en cliente público).
- `Authorization: Bearer <jwt>` para usuarios autenticados (Supabase Auth).

## Filtros útiles

- Lugares: `status=eq.published`
- Historias: `status=eq.published&moderation_status=eq.approved`
- Reseñas públicas: `moderation_status=eq.approved&visibility=eq.full`

## Moderación

Los administradores actualizan `reviews.moderation_status` y opcionalmente escriben en `moderation_audit_log` (vía SQL o panel futuro).

## Pagos / Stripe

Fuera de v1; tablas `host_agreements` y `sponsors` incluyen columnas reservadas (`billing_external_ref`, `stripe_customer_id`).
