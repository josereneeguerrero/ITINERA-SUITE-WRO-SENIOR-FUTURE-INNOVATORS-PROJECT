-- =============================================================================
-- 005 — Search functions
-- geo search + full-text search + sponsor boost
-- =============================================================================

set search_path to public, extensions;

-- ---------------------------------------------------------------------------
-- Active sponsor boost for a place (capped per campaign)
-- ---------------------------------------------------------------------------
create or replace function public.active_boost_for_place(p_place_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select coalesce(
    max(least(c.boost_weight, c.boost_cap)),
    0::numeric
  )
  from public.sponsor_campaigns c
  join public.places p on p.id = p_place_id
  left join public.sponsor_campaign_places scp
    on scp.campaign_id = c.id and scp.place_id = p_place_id
  where c.active = true
    and c.starts_at <= now()
    and c.ends_at   >= now()
    and (
      c.target = 'global'
      or (c.target = 'category' and c.target_id = p.category_id)
      or (c.target = 'region'   and c.target_id = p.region_id)
      or (c.target = 'places'   and scp.place_id is not null)
    );
$$;

-- ---------------------------------------------------------------------------
-- Geo search: places near a point, with optional category filter,
-- full-text filter, and sponsor boost
--
-- Scoring formula:
--   base = (rating/5) * 0.55  +  proximity_score * 0.45
--   rank = base * (1 + active_boost)
--
-- proximity_score = 1 / (1 + dist_km)  →  1.0 at same point, → 0 at infinity
-- ---------------------------------------------------------------------------
create or replace function public.search_places_nearby(
  p_lat              double precision,
  p_lng              double precision,
  p_radius_km        double precision default 50,
  p_category_id      uuid             default null,
  p_query            text             default null,   -- optional text search
  p_limit            int              default 20,
  p_apply_boost      boolean          default true
)
returns table (
  id                uuid,
  slug              text,
  name_i18n         jsonb,
  description_i18n  jsonb,
  aggregated_rating numeric,
  review_count      int,
  distance_m        double precision,
  active_boost      numeric,
  rank_score        double precision,
  category_id       uuid,
  region_id         uuid,
  price_level       smallint,
  featured          boolean
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with point as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as geog
  ),
  candidates as (
    select
      pl.*,
      st_distance(pl.location, (select geog from point)) as dist_m
    from public.places pl
    where pl.status = 'published'
      and (p_category_id is null or pl.category_id = p_category_id)
      and st_dwithin(
        pl.location,
        (select geog from point),
        p_radius_km * 1000
      )
      -- optional full-text filter
      and (
        p_query is null
        or pl.search_vector @@ websearch_to_tsquery('spanish', p_query)
        or pl.search_vector @@ websearch_to_tsquery('english', p_query)
      )
  ),
  scored as (
    select
      c.id, c.slug, c.name_i18n, c.description_i18n,
      c.aggregated_rating, c.review_count,
      c.dist_m,
      c.category_id, c.region_id, c.price_level, c.featured,
      case when p_apply_boost
        then public.active_boost_for_place(c.id)
        else 0::numeric
      end as boost,
      (
        (coalesce(c.aggregated_rating, 0) / 5.0) * 0.55
        + (1.0 / (1.0 + (c.dist_m / 1000.0)))   * 0.45
      ) as base_score
    from candidates c
  )
  select
    s.id, s.slug, s.name_i18n, s.description_i18n,
    s.aggregated_rating, s.review_count,
    s.dist_m                                                      as distance_m,
    s.boost                                                       as active_boost,
    (s.base_score * (1 + s.boost))::double precision              as rank_score,
    s.category_id, s.region_id, s.price_level, s.featured
  from scored s
  order by rank_score desc
  limit greatest(1, least(p_limit, 50));
$$;

-- ---------------------------------------------------------------------------
-- Text-only search (no location required — for web/app search bar)
-- ---------------------------------------------------------------------------
create or replace function public.search_places_text(
  p_query       text,
  p_category_id uuid    default null,
  p_limit       int     default 20
)
returns table (
  id                uuid,
  slug              text,
  name_i18n         jsonb,
  description_i18n  jsonb,
  aggregated_rating numeric,
  review_count      int,
  category_id       uuid,
  region_id         uuid,
  rank              double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    pl.id, pl.slug, pl.name_i18n, pl.description_i18n,
    pl.aggregated_rating, pl.review_count,
    pl.category_id, pl.region_id,
    ts_rank(
      pl.search_vector,
      coalesce(
        websearch_to_tsquery('spanish', p_query),
        websearch_to_tsquery('english', p_query)
      )
    )::double precision as rank
  from public.places pl
  where pl.status = 'published'
    and (p_category_id is null or pl.category_id = p_category_id)
    and (
      pl.search_vector @@ websearch_to_tsquery('spanish', p_query)
      or pl.search_vector @@ websearch_to_tsquery('english', p_query)
    )
  order by rank desc
  limit greatest(1, least(p_limit, 50));
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.search_places_nearby(double precision, double precision, double precision, uuid, text, int, boolean)
  to anon, authenticated;

grant execute on function public.search_places_text(text, uuid, int)
  to anon, authenticated;
