-- =============================================================================
-- 009 - Semantic search v1
-- pgvector + hybrid retrieval for Itinera IA.
-- =============================================================================

set search_path to public, extensions;

create extension if not exists vector with schema extensions;

create table public.semantic_documents (
  id                 uuid primary key default gen_random_uuid(),
  entity_type        text not null check (entity_type in ('place', 'story', 'region', 'category')),
  entity_id          uuid not null,
  locale             text not null default 'es',
  title              text not null,
  content            text not null,
  metadata           jsonb not null default '{}',
  content_hash       text not null,
  embedding          extensions.vector(384),
  embedding_model    text not null default 'gte-small',
  embedding_status   text not null default 'pending'
    check (embedding_status in ('pending', 'ready', 'error')),
  embedding_error    text,
  last_embedded_at   timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  search_vector      tsvector generated always as (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(content, '')), 'B')
  ) stored,
  unique (entity_type, entity_id, locale)
);

create index semantic_documents_entity_idx
  on public.semantic_documents (entity_type, entity_id, locale);

create index semantic_documents_status_idx
  on public.semantic_documents (embedding_status, embedding_model);

create index semantic_documents_metadata_region_idx
  on public.semantic_documents ((metadata->>'region_slug'));

create index semantic_documents_metadata_category_idx
  on public.semantic_documents ((metadata->>'category_slug'));

create index semantic_documents_search_idx
  on public.semantic_documents using gin (search_vector);

create index semantic_documents_embedding_hnsw_idx
  on public.semantic_documents
  using hnsw (embedding vector_ip_ops)
  where embedding is not null;

create trigger set_semantic_documents_updated_at
  before update on public.semantic_documents
  for each row execute function public.set_updated_at();

alter table public.semantic_documents enable row level security;

create policy "semantic documents public read real entities"
  on public.semantic_documents
  for select
  using (
    (
      entity_type = 'place'
      and exists (
        select 1
        from public.places p
        where p.id = semantic_documents.entity_id
          and (p.status = 'published' or public.is_admin())
      )
    )
    or (
      entity_type = 'story'
      and exists (
        select 1
        from public.stories s
        where s.id = semantic_documents.entity_id
          and (
            (s.status = 'published' and s.moderation_status = 'approved')
            or public.is_admin()
          )
      )
    )
    or entity_type in ('region', 'category')
    or public.is_admin()
  );

create policy "admin write semantic documents"
  on public.semantic_documents
  for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.search_semantic_documents(
  p_query text default null,
  p_query_embedding extensions.vector(384) default null,
  p_entity_types text[] default array['place']::text[],
  p_region_slug text default null,
  p_category_slug text default null,
  p_locale text default 'es',
  p_match_count int default 8,
  p_match_threshold double precision default 0.18
)
returns table (
  document_id uuid,
  entity_type text,
  entity_id uuid,
  slug text,
  title text,
  summary text,
  category_slug text,
  category_name text,
  region_slug text,
  region_name text,
  rating numeric,
  lat double precision,
  lng double precision,
  metadata jsonb,
  semantic_score double precision,
  text_rank double precision,
  combined_score double precision,
  match_reason text
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with limited as (
    select greatest(1, least(coalesce(p_match_count, 8), 30)) as lim
  ),
  query_terms as (
    select
      nullif(trim(coalesce(p_query, '')), '') as q,
      case
        when nullif(trim(coalesce(p_query, '')), '') is null then null
        else websearch_to_tsquery('spanish', trim(p_query))
      end as tsq
  ),
  candidates as (
    select
      sd.*,
      case
        when p_query_embedding is null or sd.embedding is null then 0::double precision
        else (sd.embedding <#> p_query_embedding) * -1
      end as semantic_score,
      case
        when (select tsq from query_terms) is null then 0::double precision
        else ts_rank(sd.search_vector, (select tsq from query_terms))::double precision
      end as text_rank
    from public.semantic_documents sd
    where sd.locale = coalesce(p_locale, 'es')
      and sd.embedding_status = 'ready'
      and (p_entity_types is null or sd.entity_type = any(p_entity_types))
      and (p_region_slug is null or sd.metadata->>'region_slug' = p_region_slug)
      and (p_category_slug is null or sd.metadata->>'category_slug' = p_category_slug)
      and (
        sd.entity_type = 'region'
        or sd.entity_type = 'category'
        or (
          sd.entity_type = 'place'
          and exists (
            select 1
            from public.places p
            where p.id = sd.entity_id
              and p.status = 'published'
          )
        )
        or (
          sd.entity_type = 'story'
          and exists (
            select 1
            from public.stories s
            where s.id = sd.entity_id
              and s.status = 'published'
              and s.moderation_status = 'approved'
          )
        )
      )
      and (
        (select q from query_terms) is null
        or sd.search_vector @@ (select tsq from query_terms)
        or sd.title ilike ('%' || (select q from query_terms) || '%')
        or p_query_embedding is not null
      )
  ),
  scored as (
    select
      c.*,
      (
        case
          when (select q from query_terms) is not null
            and lower(c.title) = lower((select q from query_terms))
            then 2.0
          when (select q from query_terms) is not null
            and lower(c.title) like '%' || lower((select q from query_terms)) || '%'
            then 1.4
          else 0
        end
        + least(greatest(c.semantic_score, 0), 1) * 0.7
        + least(c.text_rank, 1) * 0.9
        + coalesce((c.metadata->>'rating')::numeric, 0)::double precision / 5.0 * 0.15
      ) as combined_score
    from candidates c
    where
      p_query_embedding is null
      or c.semantic_score >= p_match_threshold
      or c.text_rank > 0
      or lower(c.title) like '%' || lower(coalesce((select q from query_terms), '')) || '%'
  )
  select
    s.id as document_id,
    s.entity_type,
    s.entity_id,
    coalesce(p.slug, st.slug, r.slug, pc.slug) as slug,
    s.title,
    left(s.content, 360) as summary,
    coalesce(pc.slug, s.metadata->>'category_slug') as category_slug,
    coalesce(pc.name_i18n->>'es', s.metadata->>'category_name') as category_name,
    coalesce(r.slug, s.metadata->>'region_slug') as region_slug,
    coalesce(r.name_i18n->>'es', s.metadata->>'region_name') as region_name,
    p.aggregated_rating as rating,
    case when p.location is null then null else st_y(p.location::geometry) end as lat,
    case when p.location is null then null else st_x(p.location::geometry) end as lng,
    s.metadata,
    s.semantic_score,
    s.text_rank,
    s.combined_score,
    case
      when s.text_rank > 0 then 'text'
      when s.semantic_score > 0 then 'semantic'
      else 'metadata'
    end as match_reason
  from scored s
  left join public.places p
    on s.entity_type = 'place' and p.id = s.entity_id and p.status = 'published'
  left join public.stories st
    on s.entity_type = 'story'
   and st.id = s.entity_id
   and st.status = 'published'
   and st.moderation_status = 'approved'
  left join public.regions r
    on (
      (s.entity_type = 'region' and r.id = s.entity_id)
      or (s.entity_type = 'place' and r.id = p.region_id)
      or (s.entity_type = 'story' and r.id = st.region_id)
    )
  left join public.place_categories pc
    on (
      (s.entity_type = 'category' and pc.id = s.entity_id)
      or (s.entity_type = 'place' and pc.id = p.category_id)
    )
  where
    s.entity_type in ('region', 'category')
    or p.id is not null
    or st.id is not null
  order by s.combined_score desc, s.text_rank desc, s.semantic_score desc
  limit (select lim from limited);
$$;

grant select on public.semantic_documents to anon, authenticated;
grant execute on function public.search_semantic_documents(
  text,
  extensions.vector(384),
  text[],
  text,
  text,
  text,
  int,
  double precision
) to anon, authenticated, service_role;
