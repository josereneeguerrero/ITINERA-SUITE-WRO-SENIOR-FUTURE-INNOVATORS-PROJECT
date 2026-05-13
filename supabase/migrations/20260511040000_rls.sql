-- =============================================================================
-- 004 — Row Level Security (RLS)
-- Roles:
--   anon        → read published/approved content, sponsor data, search
--   authenticated → own profile, favorites, itineraries, reviews, routes
--   admin       → full write access via is_admin()
--   service_role → bypass RLS (Edge Fns)
-- =============================================================================

-- Enable RLS on all user-facing tables
alter table public.regions              enable row level security;
alter table public.place_categories     enable row level security;
alter table public.place_types          enable row level security;
alter table public.tags                 enable row level security;
alter table public.places               enable row level security;
alter table public.place_tags           enable row level security;
alter table public.media_assets         enable row level security;
alter table public.stories              enable row level security;
alter table public.story_places         enable row level security;
alter table public.profiles             enable row level security;
alter table public.reviews              enable row level security;
alter table public.moderation_audit_log enable row level security;
alter table public.sponsors             enable row level security;
alter table public.sponsor_campaigns    enable row level security;
alter table public.sponsor_campaign_places enable row level security;
alter table public.sponsor_impressions  enable row level security;
alter table public.host_sites           enable row level security;
alter table public.host_agreements      enable row level security;
alter table public.favorites            enable row level security;
alter table public.itineraries          enable row level security;
alter table public.itinerary_stops      enable row level security;
alter table public.routes               enable row level security;
alter table public.route_points         enable row level security;
alter table public.devices              enable row level security;
alter table public.interaction_events   enable row level security;
alter table public.conversations        enable row level security;
alter table public.messages             enable row level security;
alter table public.badges               enable row level security;
alter table public.user_badges          enable row level security;

-- =============================================================================
-- TAXONOMY — public read
-- =============================================================================
create policy "taxonomy read all"  on public.regions          for select using (true);
create policy "taxonomy read all"  on public.place_categories for select using (true);
create policy "taxonomy read all"  on public.place_types      for select using (true);
create policy "taxonomy read all"  on public.tags             for select using (true);
create policy "taxonomy read all"  on public.place_tags       for select using (true);

-- Admin write
create policy "admin write regions"          on public.regions          for all using (public.is_admin());
create policy "admin write categories"       on public.place_categories for all using (public.is_admin());
create policy "admin write types"            on public.place_types      for all using (public.is_admin());
create policy "admin write tags"             on public.tags             for all using (public.is_admin());

-- =============================================================================
-- PLACES — public read published; admin write
-- =============================================================================
create policy "places read published" on public.places
  for select using (status = 'published' or public.is_admin());

create policy "admin write places" on public.places
  for all using (public.is_admin());

-- =============================================================================
-- MEDIA ASSETS — public read; admin write
-- =============================================================================
create policy "media read all"   on public.media_assets for select using (true);
create policy "admin write media" on public.media_assets for all using (public.is_admin());

-- Authenticated can insert review photos (entity_type = 'review')
create policy "auth insert review media" on public.media_assets
  for insert with check (
    auth.uid() is not null and entity_type = 'review'
  );

-- =============================================================================
-- STORIES — public read approved+published; admin write
-- =============================================================================
create policy "stories read published" on public.stories
  for select using (
    (status = 'published' and moderation_status = 'approved')
    or public.is_admin()
  );

create policy "admin write stories"  on public.stories    for all using (public.is_admin());
create policy "story_places read"    on public.story_places for select using (true);
create policy "admin write story_places" on public.story_places for all using (public.is_admin());

-- =============================================================================
-- PROFILES — own profile; admin reads all
-- =============================================================================
create policy "profiles read own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles update own" on public.profiles
  for update using (id = auth.uid());

create policy "admin write profiles" on public.profiles
  for all using (public.is_admin());

-- =============================================================================
-- REVIEWS — read approved; insert authenticated/anon; admin all
-- =============================================================================
create policy "reviews read approved" on public.reviews
  for select using (
    (moderation_status = 'approved' and visibility = 'full')
    or public.is_admin()
  );

-- Trigger handles user_id/session_id assignment; constraint enforces at least one
create policy "reviews insert auth" on public.reviews
  for insert with check (auth.uid() is not null or session_id is not null);

create policy "reviews update own" on public.reviews
  for update using (user_id = auth.uid());

create policy "admin write reviews" on public.reviews
  for all using (public.is_admin());

create policy "admin write audit_log" on public.moderation_audit_log
  for all using (public.is_admin());

-- =============================================================================
-- SPONSORS — public read active; admin write
-- =============================================================================
create policy "sponsors read active" on public.sponsors
  for select using (
    (active = true and (ends_at is null or ends_at > now()))
    or public.is_admin()
  );

create policy "campaigns read active" on public.sponsor_campaigns
  for select using (
    (active = true and starts_at <= now() and ends_at >= now())
    or public.is_admin()
  );

create policy "campaign_places read" on public.sponsor_campaign_places
  for select using (true);

-- Impressions: insert allowed for anon/auth (via track_impression fn)
-- Reading impressions: admin only
create policy "impressions insert" on public.sponsor_impressions
  for insert with check (true);

create policy "impressions admin read" on public.sponsor_impressions
  for select using (public.is_admin());

create policy "admin write sponsors"   on public.sponsors                for all using (public.is_admin());
create policy "admin write campaigns"  on public.sponsor_campaigns       for all using (public.is_admin());
create policy "admin write camp_plac"  on public.sponsor_campaign_places for all using (public.is_admin());

-- =============================================================================
-- HOST SITES — admin only
-- =============================================================================
create policy "admin host_sites"      on public.host_sites     for all using (public.is_admin());
create policy "admin host_agreements" on public.host_agreements for all using (public.is_admin());

-- =============================================================================
-- IDENTITY: favorites, itineraries
-- =============================================================================
create policy "favorites own" on public.favorites
  for all using (user_id = auth.uid());

create policy "itineraries read"     on public.itineraries
  for select using (user_id = auth.uid() or public = true or public.is_admin());

create policy "itineraries write own" on public.itineraries
  for all using (user_id = auth.uid());

create policy "itinerary_stops own"  on public.itinerary_stops
  for all using (
    itinerary_id in (
      select id from public.itineraries where user_id = auth.uid()
    )
  );

-- =============================================================================
-- ROUTES — public read published; auth create; admin all
-- =============================================================================
create policy "routes read published" on public.routes
  for select using (status = 'published' or created_by = auth.uid() or public.is_admin());

create policy "routes insert auth" on public.routes
  for insert with check (auth.uid() is not null);

create policy "routes update own" on public.routes
  for update using (created_by = auth.uid());

create policy "route_points read" on public.route_points
  for select using (
    route_id in (select id from public.routes where status = 'published')
    or public.is_admin()
  );

create policy "route_points write own" on public.route_points
  for all using (
    route_id in (
      select id from public.routes where created_by = auth.uid()
    )
  );

-- =============================================================================
-- DEVICES / TELEMETRY — service_role via Edge Fns; admin read
-- (no direct client policies — all writes go through SECURITY DEFINER fns)
-- =============================================================================
create policy "admin read devices"            on public.devices           for select using (public.is_admin());
create policy "admin read interaction_events" on public.interaction_events for select using (public.is_admin());
create policy "admin read conversations"      on public.conversations      for select using (public.is_admin());
create policy "admin read messages"           on public.messages           for select using (public.is_admin());

-- =============================================================================
-- GAMIFICATION — public read badges; own user_badges
-- =============================================================================
create policy "badges read all"     on public.badges      for select using (true);
create policy "user_badges read own" on public.user_badges for select using (user_id = auth.uid());
create policy "admin write badges"   on public.badges      for all using (public.is_admin());
create policy "admin write user_badges" on public.user_badges for all using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Enforce review defaults trigger
-- Ensures reviews always have user_id if authenticated
-- ---------------------------------------------------------------------------
create or replace function public.enforce_review_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- assign user_id from auth.uid() if not provided and user is authenticated
  if new.user_id is null and auth.uid() is not null then
    new.user_id := auth.uid();
  end if;

  -- ensure at least one identifier
  if new.user_id is null and new.session_id is null then
    raise exception 'review requires user_id or session_id';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_review_defaults on public.reviews;
create trigger enforce_review_defaults
  before insert on public.reviews
  for each row execute function public.enforce_review_defaults();
