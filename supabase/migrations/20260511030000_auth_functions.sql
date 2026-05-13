-- =============================================================================
-- 003 — Auth functions, admin helper, rating aggregation, device ops
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Admin check (used in RLS policies)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Promote user to admin (dev helper — run manually in SQL editor)
-- ---------------------------------------------------------------------------
-- UPDATE public.profiles SET role = 'admin' WHERE id = '<auth.users.id>';

-- ---------------------------------------------------------------------------
-- Place rating aggregation
-- Called by trigger after every review insert/update/delete
-- ---------------------------------------------------------------------------
create or replace function public.refresh_place_rating(p_place_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.places
  set
    aggregated_rating = coalesce(sub.avg_rating, 0),
    review_count      = coalesce(sub.cnt, 0)
  from (
    select
      round(avg(rating)::numeric, 2) as avg_rating,
      count(*)::int                  as cnt
    from public.reviews
    where place_id         = p_place_id
      and moderation_status = 'approved'
      and visibility        = 'full'
  ) sub
  where id = p_place_id;
$$;

create or replace function public.trg_refresh_place_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  pid := case when tg_op = 'DELETE' then old.place_id else new.place_id end;
  perform public.refresh_place_rating(pid);
  -- also refresh old place if place_id changed on UPDATE
  if tg_op = 'UPDATE' and old.place_id is distinct from new.place_id then
    perform public.refresh_place_rating(old.place_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.trg_refresh_place_rating();

-- ---------------------------------------------------------------------------
-- Device registration (called by Edge Fn device-register)
-- service_role only — never exposed to clients
-- ---------------------------------------------------------------------------
create or replace function public.register_device(
  p_label          text,
  p_token_plaintext text,
  p_host_site_id   uuid default null
)
returns table (device_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid := gen_random_uuid();
  v_hash text := encode(extensions.digest(p_token_plaintext, 'sha256'), 'hex');
begin
  insert into public.devices (id, label, token_hash, host_site_id)
  values (v_id, p_label, v_hash, p_host_site_id);

  -- link host_site if provided
  if p_host_site_id is not null then
    update public.host_sites
    set terminal_device_id = v_id
    where id = p_host_site_id;
  end if;

  return query select v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Device token verification
-- ---------------------------------------------------------------------------
create or replace function public.verify_device_token(
  p_device_id      uuid,
  p_token_plaintext text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.devices
    where id         = p_device_id
      and token_hash = encode(extensions.digest(p_token_plaintext, 'sha256'), 'hex')
  );
$$;

-- ---------------------------------------------------------------------------
-- Ingest interaction event (called by Edge Fn ingest-terminal-events)
-- Idempotent: ON CONFLICT DO NOTHING on event_id
-- ---------------------------------------------------------------------------
create or replace function public.ingest_interaction_event(
  p_event_id          text,
  p_device_id         uuid,
  p_device_token      text,
  p_occurred_at       timestamptz,
  p_intent            text,
  p_entities          jsonb,
  p_place_ids_shown   uuid[],
  p_selected_place_id uuid,
  p_lat               double precision,
  p_lng               double precision,
  p_duration_ms       int,
  p_optional_user_id  uuid,
  p_session_id        text,
  p_payload           jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_device_token(p_device_id, p_device_token) then
    raise exception 'invalid device credentials';
  end if;

  insert into public.interaction_events (
    event_id, device_id, occurred_at, intent, entities,
    place_ids_shown, selected_place_id, lat, lng,
    duration_ms, optional_user_id, session_id, payload
  )
  values (
    p_event_id, p_device_id,
    coalesce(p_occurred_at, now()),
    p_intent,
    coalesce(p_entities, '{}'),
    coalesce(p_place_ids_shown, '{}'),
    p_selected_place_id,
    p_lat, p_lng,
    p_duration_ms,
    p_optional_user_id,
    p_session_id,
    coalesce(p_payload, '{}')
  )
  on conflict (event_id) do nothing;

  update public.devices set last_sync_at = now() where id = p_device_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Track sponsor impression (called by web/app/terminal)
-- ---------------------------------------------------------------------------
create or replace function public.track_impression(
  p_place_id    uuid,
  p_source      review_source,
  p_campaign_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
begin
  -- resolve campaign if not provided
  v_campaign_id := coalesce(
    p_campaign_id,
    (
      select c.id
      from public.sponsor_campaigns c
      left join public.sponsor_campaign_places scp on scp.campaign_id = c.id
      join public.places pl on pl.id = p_place_id
      where c.active = true
        and c.starts_at <= now()
        and c.ends_at   >= now()
        and (
          c.target = 'global'
          or (c.target = 'category' and c.target_id = pl.category_id)
          or (c.target = 'region'   and c.target_id = pl.region_id)
          or (c.target = 'places'   and scp.place_id = p_place_id)
        )
      limit 1
    )
  );

  if v_campaign_id is not null then
    insert into public.sponsor_impressions (campaign_id, place_id, source)
    values (v_campaign_id, p_place_id, p_source);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: lock to service_role
-- ---------------------------------------------------------------------------
revoke all on function public.register_device(text, text, uuid)                  from public;
revoke all on function public.verify_device_token(uuid, text)                    from public;
revoke all on function public.ingest_interaction_event(text,uuid,text,timestamptz,text,jsonb,uuid[],uuid,double precision,double precision,int,uuid,text,jsonb) from public;

grant execute on function public.register_device(text, text, uuid)                 to service_role;
grant execute on function public.verify_device_token(uuid, text)                   to service_role;
grant execute on function public.ingest_interaction_event(text,uuid,text,timestamptz,text,jsonb,uuid[],uuid,double precision,double precision,int,uuid,text,jsonb) to service_role;

-- track_impression available to anon + authenticated (web/app call it)
grant execute on function public.track_impression(uuid, review_source, uuid) to anon, authenticated;
