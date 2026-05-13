-- =============================================================================
-- 002 — Core Schema
-- i18n strategy: JSONB { "es": "...", "en": "..." }
--   - always populate "es"; "en" optional (frontend falls back to "es")
-- =============================================================================

-- PostGIS lives in extensions schema on hosted Supabase
-- This makes geography, geometry, ST_* visible without qualification
set search_path to public, extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role         as enum ('user', 'admin');
create type public.content_status    as enum ('draft', 'published');
create type public.moderation_status as enum ('pending', 'approved', 'rejected');
create type public.review_source     as enum ('web', 'app', 'terminal');
create type public.media_kind        as enum ('photo', 'video', 'audio', 'document');
create type public.campaign_target   as enum ('global', 'category', 'region', 'places');
create type public.agreement_status  as enum ('draft', 'active', 'ended');

-- ---------------------------------------------------------------------------
-- Shared: updated_at trigger function
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Taxonomy
-- ---------------------------------------------------------------------------
create table public.regions (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,
  name_i18n   jsonb       not null default '{}',
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

create table public.place_categories (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,
  name_i18n   jsonb       not null default '{}',
  icon_name   text,                           -- icon key for UI (e.g. "museum", "food")
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

create table public.place_types (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,
  name_i18n   jsonb       not null default '{}',
  category_id uuid        references public.place_categories(id) on delete set null,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

create table public.tags (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,
  name_i18n   jsonb       not null default '{}',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Places
-- ---------------------------------------------------------------------------
create table public.places (
  id                  uuid           primary key default gen_random_uuid(),
  slug                text           not null unique,
  name_i18n           jsonb          not null default '{}',
  description_i18n    jsonb          not null default '{}',
  ai_summary_i18n     jsonb          not null default '{}',   -- AI-generated cultural summary
  ai_tips_i18n        jsonb          not null default '{}',   -- AI-generated visitor tips
  place_type_id       uuid           references public.place_types(id) on delete set null,
  category_id         uuid           references public.place_categories(id) on delete set null,
  region_id           uuid           references public.regions(id) on delete set null,
  location            geography(point, 4326) not null,
  address_i18n        jsonb          not null default '{}',
  phone               text,
  website             text,
  hours               jsonb          not null default '{}',   -- { mon: {open:"09:00", close:"18:00"}, ... }
  accessibility       boolean        not null default false,
  price_level         smallint       check (price_level between 1 and 4),
  local_favorite      boolean        not null default false,
  featured            boolean        not null default false,
  sponsorship_eligible boolean       not null default true,
  aggregated_rating   numeric(3,2)   not null default 0 check (aggregated_rating between 0 and 5),
  review_count        int            not null default 0 check (review_count >= 0),
  status              content_status not null default 'draft',
  created_at          timestamptz    not null default now(),
  updated_at          timestamptz    not null default now()
);

create index places_location_gix  on public.places using gist (location);
create index places_category_idx  on public.places (category_id);
create index places_region_idx    on public.places (region_id);
create index places_status_idx    on public.places (status);

-- Full-text search vector (es + en concatenated)
alter table public.places
  add column search_vector tsvector
    generated always as (
      setweight(to_tsvector('spanish', coalesce(name_i18n->>'es', '')), 'A') ||
      setweight(to_tsvector('spanish', coalesce(description_i18n->>'es', '')), 'B') ||
      setweight(to_tsvector('english', coalesce(name_i18n->>'en', '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description_i18n->>'en', '')), 'B')
    ) stored;

create index places_search_idx on public.places using gin (search_vector);

create table public.place_tags (
  place_id uuid not null references public.places(id) on delete cascade,
  tag_id   uuid not null references public.tags(id)   on delete cascade,
  primary key (place_id, tag_id)
);

-- Polymorphic media (files live in Storage; this is metadata)
create table public.media_assets (
  id              uuid        primary key default gen_random_uuid(),
  entity_type     text        not null check (entity_type in ('place','story','review','profile','sponsor')),
  entity_id       uuid        not null,
  storage_bucket  text        not null,
  storage_path    text        not null,
  kind            media_kind  not null default 'photo',
  sort_order      int         not null default 0,
  alt_i18n        jsonb       not null default '{}',
  created_at      timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index media_assets_entity_idx on public.media_assets (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Stories (cultural content)
-- ---------------------------------------------------------------------------
create table public.stories (
  id                    uuid               primary key default gen_random_uuid(),
  slug                  text               not null unique,
  title_i18n            jsonb              not null default '{}',
  summary_i18n          jsonb              not null default '{}',
  body_markdown_i18n    jsonb              not null default '{}',
  audio_storage_path    text,
  region_id             uuid               references public.regions(id) on delete set null,
  author_user_id        uuid               references auth.users(id) on delete set null,
  featured              boolean            not null default false,
  status                content_status     not null default 'draft',
  moderation_status     moderation_status  not null default 'approved',
  created_at            timestamptz        not null default now(),
  updated_at            timestamptz        not null default now()
);

-- Full-text on stories too
alter table public.stories
  add column search_vector tsvector
    generated always as (
      setweight(to_tsvector('spanish', coalesce(title_i18n->>'es', '')), 'A') ||
      setweight(to_tsvector('spanish', coalesce(summary_i18n->>'es', '')), 'B') ||
      setweight(to_tsvector('english', coalesce(title_i18n->>'en', '')), 'A') ||
      setweight(to_tsvector('english', coalesce(summary_i18n->>'en', '')), 'B')
    ) stored;

create index stories_search_idx on public.stories using gin (search_vector);
create index stories_region_idx on public.stories (region_id);

-- Link stories to places (M:N)
create table public.story_places (
  story_id uuid not null references public.stories(id) on delete cascade,
  place_id uuid not null references public.places(id)  on delete cascade,
  primary key (story_id, place_id)
);

create index story_places_place_idx on public.story_places (place_id);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users, auto-created on signup)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  display_name        text,
  avatar_url          text,
  preferred_locale    text        not null default 'es',
  interests           text[]      not null default '{}',
  accessibility_needs text[]      not null default '{}',
  role                user_role   not null default 'user',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reviews & moderation
-- ---------------------------------------------------------------------------
create table public.reviews (
  id                  uuid               primary key default gen_random_uuid(),
  place_id            uuid               not null references public.places(id) on delete cascade,
  user_id             uuid               references auth.users(id) on delete set null,
  session_id          text,              -- for terminal/anonymous reviews
  rating              smallint           not null check (rating between 1 and 5),
  title_i18n          jsonb              not null default '{}',
  body_i18n           jsonb              not null default '{}',
  source              review_source      not null default 'web',
  moderation_status   moderation_status  not null default 'pending',
  moderation_reason   text,
  visibility          text               not null default 'full'
                        check (visibility in ('full', 'hidden', 'stats_only')),
  created_at          timestamptz        not null default now(),
  updated_at          timestamptz        not null default now(),
  constraint reviews_user_or_session check (user_id is not null or session_id is not null)
);

create index reviews_place_idx  on public.reviews (place_id);
create index reviews_status_idx on public.reviews (moderation_status);

create table public.moderation_audit_log (
  id          uuid        primary key default gen_random_uuid(),
  entity_type text        not null,   -- 'review' | 'story' | 'place'
  entity_id   uuid        not null,
  action      text        not null,   -- 'approve' | 'reject' | 'hide'
  actor_id    uuid        references auth.users(id) on delete set null,
  detail      jsonb       not null default '{}',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sponsors & campaigns
-- ---------------------------------------------------------------------------
create table public.sponsors (
  id                  uuid        primary key default gen_random_uuid(),
  slug                text        not null unique,
  name_i18n           jsonb       not null default '{}',
  website             text,
  logo_storage_path   text,
  active              boolean     not null default true,
  starts_at           timestamptz,
  ends_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.sponsor_campaigns (
  id               uuid             primary key default gen_random_uuid(),
  sponsor_id       uuid             not null references public.sponsors(id) on delete cascade,
  name             text             not null,
  target           campaign_target  not null default 'global',
  target_id        uuid,            -- category_id | region_id | null for global
  boost_weight     numeric(6,4)     not null default 0 check (boost_weight between 0 and 1),
  boost_cap        numeric(6,4)     not null default 0.15 check (boost_cap between 0 and 1),
  placement_config jsonb            not null default '{}',  -- extra UI hints
  starts_at        timestamptz      not null,
  ends_at          timestamptz      not null,
  active           boolean          not null default true,
  created_at       timestamptz      not null default now(),
  updated_at       timestamptz      not null default now()
);

create index sponsor_campaigns_sponsor_idx on public.sponsor_campaigns (sponsor_id);
create index sponsor_campaigns_active_idx  on public.sponsor_campaigns (active, starts_at, ends_at);

-- Specific places targeted by a campaign (when target = 'places')
create table public.sponsor_campaign_places (
  campaign_id uuid not null references public.sponsor_campaigns(id) on delete cascade,
  place_id    uuid not null references public.places(id)            on delete cascade,
  primary key (campaign_id, place_id)
);

-- Analytics: every time a sponsored place is shown
create table public.sponsor_impressions (
  id          uuid        primary key default gen_random_uuid(),
  campaign_id uuid        not null references public.sponsor_campaigns(id) on delete cascade,
  place_id    uuid        not null references public.places(id) on delete cascade,
  source      review_source not null default 'web',  -- reuse enum: web|app|terminal
  occurred_at timestamptz not null default now()
);

create index sponsor_impressions_campaign_idx on public.sponsor_impressions (campaign_id);
create index sponsor_impressions_occurred_idx on public.sponsor_impressions (occurred_at);

-- ---------------------------------------------------------------------------
-- Host sites (physical locations where terminals are deployed)
-- ---------------------------------------------------------------------------
create table public.host_sites (
  id                 uuid        primary key default gen_random_uuid(),
  slug               text        not null unique,
  name_i18n          jsonb       not null default '{}',
  location           geography(point, 4326),
  address_i18n       jsonb       not null default '{}',
  contact_email      text,
  terminal_device_id uuid,       -- set after device registration
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.host_agreements (
  id                   uuid             primary key default gen_random_uuid(),
  host_site_id         uuid             not null references public.host_sites(id) on delete cascade,
  status               agreement_status not null default 'draft',
  starts_at            date,
  ends_at              date,
  notes                text,
  billing_external_ref text,           -- future Stripe reference
  created_at           timestamptz      not null default now(),
  updated_at           timestamptz      not null default now()
);

create index host_agreements_site_idx on public.host_agreements (host_site_id);

-- ---------------------------------------------------------------------------
-- Identity: favorites, itineraries, routes
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id    uuid        not null references auth.users(id)  on delete cascade,
  place_id   uuid        not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table public.itineraries (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  title_i18n jsonb       not null default '{}',
  public     boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.itinerary_stops (
  id             uuid  primary key default gen_random_uuid(),
  itinerary_id   uuid  not null references public.itineraries(id) on delete cascade,
  place_id       uuid  references public.places(id) on delete set null,
  seq            int   not null,
  notes_i18n     jsonb not null default '{}'
);

create index itinerary_stops_itin_idx on public.itinerary_stops (itinerary_id);

create table public.routes (
  id              uuid           primary key default gen_random_uuid(),
  slug            text           not null unique,
  title_i18n      jsonb          not null default '{}',
  description_i18n jsonb         not null default '{}',
  created_by      uuid           references auth.users(id) on delete set null,
  status          content_status not null default 'draft',
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now()
);

create table public.route_points (
  id         uuid                    primary key default gen_random_uuid(),
  route_id   uuid                    not null references public.routes(id) on delete cascade,
  seq        int                     not null,
  place_id   uuid                    references public.places(id) on delete set null,
  geom       geography(point, 4326),
  note_i18n  jsonb                   not null default '{}',
  unique (route_id, seq)
);

create index route_points_route_idx on public.route_points (route_id);

-- ---------------------------------------------------------------------------
-- Devices & telemetry (terminal)
-- ---------------------------------------------------------------------------
create table public.devices (
  id           uuid        primary key default gen_random_uuid(),
  label        text        not null,
  token_hash   text        not null unique,
  host_site_id uuid        references public.host_sites(id) on delete set null,
  last_sync_at timestamptz,
  metadata     jsonb       not null default '{}',
  created_at   timestamptz not null default now()
);

create table public.interaction_events (
  id               uuid        primary key default gen_random_uuid(),
  event_id         text        not null unique,   -- client-side idempotency key
  device_id        uuid        references public.devices(id) on delete set null,
  occurred_at      timestamptz not null default now(),
  intent           text,                          -- NLU intent e.g. "search_food"
  entities         jsonb       not null default '{}',  -- extracted entities
  place_ids_shown  uuid[]      not null default '{}',
  selected_place_id uuid       references public.places(id) on delete set null,
  lat              double precision,
  lng              double precision,
  duration_ms      int,
  optional_user_id uuid        references auth.users(id) on delete set null,
  session_id       text,
  payload          jsonb       not null default '{}',
  created_at       timestamptz not null default now()
);

create index interaction_events_device_idx   on public.interaction_events (device_id);
create index interaction_events_occurred_idx on public.interaction_events (occurred_at);

-- Conversation history sync (terminal AI context)
create table public.conversations (
  id         uuid        primary key default gen_random_uuid(),
  device_id  uuid        references public.devices(id) on delete set null,
  user_id    uuid        references auth.users(id) on delete set null,
  session_id text,
  context    jsonb       not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  role            text        not null check (role in ('user', 'assistant', 'system')),
  content         text        not null,
  metadata        jsonb       not null default '{}',
  created_at      timestamptz not null default now()
);

create index messages_conv_idx on public.messages (conversation_id);

-- ---------------------------------------------------------------------------
-- Gamification (minimal v1)
-- ---------------------------------------------------------------------------
create table public.badges (
  id              uuid        primary key default gen_random_uuid(),
  slug            text        not null unique,
  name_i18n       jsonb       not null default '{}',
  description_i18n jsonb      not null default '{}',
  icon_name       text,
  tier            text        check (tier in ('bronze', 'silver', 'gold')),
  created_at      timestamptz not null default now()
);

create table public.user_badges (
  user_id    uuid        not null references auth.users(id)   on delete cascade,
  badge_id   uuid        not null references public.badges(id) on delete cascade,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger set_places_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

create trigger set_stories_updated_at
  before update on public.stories
  for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_sponsors_updated_at
  before update on public.sponsors
  for each row execute function public.set_updated_at();

create trigger set_sponsor_campaigns_updated_at
  before update on public.sponsor_campaigns
  for each row execute function public.set_updated_at();

create trigger set_host_sites_updated_at
  before update on public.host_sites
  for each row execute function public.set_updated_at();

create trigger set_host_agreements_updated_at
  before update on public.host_agreements
  for each row execute function public.set_updated_at();

create trigger set_itineraries_updated_at
  before update on public.itineraries
  for each row execute function public.set_updated_at();

create trigger set_routes_updated_at
  before update on public.routes
  for each row execute function public.set_updated_at();

create trigger set_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();
