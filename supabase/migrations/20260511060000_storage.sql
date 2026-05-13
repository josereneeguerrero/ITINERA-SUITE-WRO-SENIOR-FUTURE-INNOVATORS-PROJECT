-- =============================================================================
-- 006 — Storage buckets & policies
-- Buckets:
--   place-media     → public (places photos/videos)
--   story-media     → public (stories audio/photos)
--   avatars         → public (profile avatars)
--   sponsor-logos   → public (sponsor logos)
--   review-photos   → private (review photos, auth only)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('place-media',   'place-media',   true,  52428800,  -- 50MB
   array['image/jpeg','image/png','image/webp','video/mp4','video/webm']),
  ('story-media',   'story-media',   true,  52428800,
   array['image/jpeg','image/png','image/webp','audio/mpeg','audio/ogg','audio/wav']),
  ('avatars',       'avatars',       true,  5242880,   -- 5MB
   array['image/jpeg','image/png','image/webp']),
  ('sponsor-logos', 'sponsor-logos', true,  5242880,
   array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('review-photos', 'review-photos', false, 10485760,  -- 10MB, private
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- place-media — public read; admin write
-- ---------------------------------------------------------------------------
create policy "place-media public read"
  on storage.objects for select
  using (bucket_id = 'place-media');

create policy "place-media admin write"
  on storage.objects for insert
  with check (bucket_id = 'place-media' and public.is_admin());

create policy "place-media admin delete"
  on storage.objects for delete
  using (bucket_id = 'place-media' and public.is_admin());

-- ---------------------------------------------------------------------------
-- story-media — public read; admin write
-- ---------------------------------------------------------------------------
create policy "story-media public read"
  on storage.objects for select
  using (bucket_id = 'story-media');

create policy "story-media admin write"
  on storage.objects for insert
  with check (bucket_id = 'story-media' and public.is_admin());

create policy "story-media admin delete"
  on storage.objects for delete
  using (bucket_id = 'story-media' and public.is_admin());

-- ---------------------------------------------------------------------------
-- avatars — public read; owner write (path = user_id/*)
-- ---------------------------------------------------------------------------
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- sponsor-logos — public read; admin write
-- ---------------------------------------------------------------------------
create policy "sponsor-logos public read"
  on storage.objects for select
  using (bucket_id = 'sponsor-logos');

create policy "sponsor-logos admin write"
  on storage.objects for insert
  with check (bucket_id = 'sponsor-logos' and public.is_admin());

create policy "sponsor-logos admin delete"
  on storage.objects for delete
  using (bucket_id = 'sponsor-logos' and public.is_admin());

-- ---------------------------------------------------------------------------
-- review-photos — private; owner read/write (path = user_id/*)
-- ---------------------------------------------------------------------------
create policy "review-photos owner read"
  on storage.objects for select
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "review-photos owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'review-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "review-photos owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin can read all review photos
create policy "review-photos admin read"
  on storage.objects for select
  using (bucket_id = 'review-photos' and public.is_admin());
