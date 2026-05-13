-- =============================================================================
-- 008 — Helper functions (admin utilities)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- get_place_coords: extract lat/lng from a place's geography column
-- Used by the admin place-edit form to pre-fill coordinate fields
-- ---------------------------------------------------------------------------
create or replace function public.get_place_coords(p_id uuid)
returns table (lat double precision, lng double precision)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    st_y(location::geometry) as lat,
    st_x(location::geometry) as lng
  from public.places
  where id = p_id;
$$;

grant execute on function public.get_place_coords(uuid) to authenticated, service_role;
