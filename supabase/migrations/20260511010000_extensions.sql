-- =============================================================================
-- 001 — Extensions
-- PostGIS: geographic queries (nearby search)
-- pgcrypto: device token hashing
-- =============================================================================

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
