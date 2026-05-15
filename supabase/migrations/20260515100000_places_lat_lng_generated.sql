-- =============================================================================
-- Add generated lat/lng columns to places table
-- These are computed automatically from the PostGIS geography column.
-- Allows REST queries to select lat,lng directly without PostGIS functions.
-- =============================================================================

alter table public.places
  add column if not exists lat double precision
    generated always as (st_y(location::geometry)) stored,
  add column if not exists lng double precision
    generated always as (st_x(location::geometry)) stored;

-- Verify
select slug, lat, lng from public.places limit 5;
