/**
 * Edge Function: semantic-embeddings
 * Builds and embeds Itinera semantic documents with Supabase gte-small.
 *
 * Request:
 *   POST /functions/v1/semantic-embeddings
 *   Headers:
 *     x-semantic-secret: <SEMANTIC_REBUILD_SECRET>
 *     Content-Type: application/json
 *   Body:
 *     { mode?: "changed" | "backfill" | "search", limit?: number }
 *
 * Response 200:
 *   { upserted: number, embedded: number, skipped: number, errors: number }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Supabase: {
  ai: {
    Session: new (model: string) => {
      run: (
        input: string,
        options: { mean_pool: boolean; normalize: boolean }
      ) => Promise<number[]>;
    };
  };
};

type Mode = "changed" | "backfill" | "search";

type SemanticDocumentInput = {
  entity_type: "place" | "story" | "region" | "category";
  entity_id: string;
  locale: "es";
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  content_hash: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-semantic-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "gte-small";
const MAX_EMBED_CHARS = 6000;

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getEs(value?: Record<string, string> | null, fallback = "") {
  return value?.es ?? value?.en ?? fallback;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function withHash(doc: Omit<SemanticDocumentInput, "content_hash">) {
  const content_hash = await sha256(
    JSON.stringify({
      entity_type: doc.entity_type,
      entity_id: doc.entity_id,
      locale: doc.locale,
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata,
      model: MODEL,
    })
  );
  return { ...doc, content_hash };
}

async function buildSemanticDocuments(supabase: ReturnType<typeof createClient>) {
  const [placesRes, storiesRes, regionsRes, categoriesRes] = await Promise.all([
    supabase
      .from("places")
      .select(
        "id,slug,name_i18n,description_i18n,ai_summary_i18n,ai_tips_i18n,address_i18n,accessibility,price_level,local_favorite,featured,aggregated_rating,review_count,status,place_categories(slug,name_i18n),regions(slug,name_i18n)"
      )
      .eq("status", "published"),
    supabase
      .from("stories")
      .select("id,slug,title_i18n,summary_i18n,body_markdown_i18n,featured,status,moderation_status,regions(slug,name_i18n)")
      .eq("status", "published")
      .eq("moderation_status", "approved"),
    supabase.from("regions").select("id,slug,name_i18n,sort_order"),
    supabase.from("place_categories").select("id,slug,name_i18n,icon_name,sort_order"),
  ]);

  const errors = [placesRes, storiesRes, regionsRes, categoriesRes]
    .filter((res) => res.error)
    .map((res) => res.error?.message);
  if (errors.length) throw new Error(errors.join("; "));

  const docs: SemanticDocumentInput[] = [];

  for (const rawPlace of placesRes.data ?? []) {
    const place = rawPlace as Record<string, any>;
    const category = firstRelation(place.place_categories);
    const region = firstRelation(place.regions);
    const title = getEs(place.name_i18n, place.slug);
    const categoryName = getEs(category?.name_i18n, "");
    const regionName = getEs(region?.name_i18n, "");
    const content = cleanText(
      [
        title,
        `Categoria: ${categoryName}`,
        `Region: ${regionName}`,
        getEs(place.description_i18n),
        getEs(place.ai_summary_i18n),
        getEs(place.ai_tips_i18n),
        getEs(place.address_i18n),
        place.accessibility ? "Accesible" : "",
        place.local_favorite ? "Favorito local" : "",
      ]
        .filter(Boolean)
        .join("\n")
    );

    docs.push(
      await withHash({
        entity_type: "place",
        entity_id: place.id,
        locale: "es",
        title,
        content,
        metadata: {
          slug: place.slug,
          category_slug: category?.slug ?? null,
          category_name: categoryName || null,
          region_slug: region?.slug ?? null,
          region_name: regionName || null,
          rating: Number(place.aggregated_rating ?? 0),
          review_count: place.review_count ?? 0,
          price_level: place.price_level ?? null,
          featured: Boolean(place.featured),
        },
      })
    );
  }

  for (const rawStory of storiesRes.data ?? []) {
    const story = rawStory as Record<string, any>;
    const region = firstRelation(story.regions);
    const title = getEs(story.title_i18n, story.slug);
    const regionName = getEs(region?.name_i18n, "");
    const content = cleanText(
      [
        title,
        regionName ? `Region: ${regionName}` : "",
        getEs(story.summary_i18n),
        getEs(story.body_markdown_i18n),
      ]
        .filter(Boolean)
        .join("\n")
    );

    docs.push(
      await withHash({
        entity_type: "story",
        entity_id: story.id,
        locale: "es",
        title,
        content,
        metadata: {
          slug: story.slug,
          region_slug: region?.slug ?? null,
          region_name: regionName || null,
          featured: Boolean(story.featured),
        },
      })
    );
  }

  for (const rawRegion of regionsRes.data ?? []) {
    const region = rawRegion as Record<string, any>;
    const title = getEs(region.name_i18n, region.slug);
    docs.push(
      await withHash({
        entity_type: "region",
        entity_id: region.id,
        locale: "es",
        title,
        content: cleanText([title, `Region turistica de Honduras: ${title}`].join("\n")),
        metadata: { slug: region.slug, region_slug: region.slug, region_name: title },
      })
    );
  }

  for (const rawCategory of categoriesRes.data ?? []) {
    const category = rawCategory as Record<string, any>;
    const title = getEs(category.name_i18n, category.slug);
    docs.push(
      await withHash({
        entity_type: "category",
        entity_id: category.id,
        locale: "es",
        title,
        content: cleanText([title, `Categoria turistica: ${title}`, category.slug].join("\n")),
        metadata: {
          slug: category.slug,
          category_slug: category.slug,
          category_name: title,
          icon_name: category.icon_name ?? null,
        },
      })
    );
  }

  return docs;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  if (req.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  const expectedSecret = Deno.env.get("SEMANTIC_REBUILD_SECRET");
  const secret = req.headers.get("x-semantic-secret");
  if (!expectedSecret || secret !== expectedSecret) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  let body: {
    mode?: Mode;
    limit?: number;
    query?: string;
    entityTypes?: string[];
    regionSlug?: string;
    categorySlug?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400, headers: CORS_HEADERS });
  }

  const mode: Mode = body.mode === "backfill" || body.mode === "search" ? body.mode : "changed";
  const limit = Math.max(1, Math.min(Number(body.limit ?? 50), 100));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    if (mode === "search") {
      const query = cleanText(body.query ?? "");
      if (!query) {
        return Response.json({ matches: [] }, { headers: CORS_HEADERS });
      }

      const model = new Supabase.ai.Session(MODEL);
      const embedding = await model.run(query.slice(0, MAX_EMBED_CHARS), {
        mean_pool: true,
        normalize: true,
      });

      if (!Array.isArray(embedding) || embedding.length !== 384) {
        throw new Error(`embedding dimension ${Array.isArray(embedding) ? embedding.length : "invalid"}`);
      }

      const { data, error } = await supabase.rpc("search_semantic_documents", {
        p_query: query,
        p_query_embedding: JSON.stringify(embedding),
        p_entity_types: Array.isArray(body.entityTypes) && body.entityTypes.length ? body.entityTypes : ["place"],
        p_region_slug: body.regionSlug ?? null,
        p_category_slug: body.categorySlug ?? null,
        p_locale: "es",
        p_match_count: Math.min(limit, 30),
        p_match_threshold: 0.18,
      });

      if (error) throw error;
      return Response.json({ matches: data ?? [] }, { headers: CORS_HEADERS });
    }

    const docs = await buildSemanticDocuments(supabase);
    const { data: existingRows, error: existingError } = await supabase
      .from("semantic_documents")
      .select("entity_type,entity_id,locale,content_hash,embedding_status");

    if (existingError) throw existingError;

    const existing = new Map(
      (existingRows ?? []).map((row: Record<string, string>) => [
        `${row.entity_type}:${row.entity_id}:${row.locale}`,
        row,
      ])
    );

    const changedDocs = docs.filter((doc) => {
      const current = existing.get(`${doc.entity_type}:${doc.entity_id}:${doc.locale}`);
      if (!current) return true;
      if (current.content_hash !== doc.content_hash) return true;
      return mode === "backfill" && current.embedding_status !== "ready";
    });

    if (changedDocs.length) {
      const { error: upsertError } = await supabase.from("semantic_documents").upsert(
        changedDocs.map((doc) => ({
          ...doc,
          embedding: null,
          embedding_model: MODEL,
          embedding_status: "pending",
          embedding_error: null,
          last_embedded_at: null,
        })),
        { onConflict: "entity_type,entity_id,locale" }
      );
      if (upsertError) throw upsertError;
    }

    const { data: pendingDocs, error: pendingError } = await supabase
      .from("semantic_documents")
      .select("id,content")
      .eq("embedding_model", MODEL)
      .in("embedding_status", ["pending", "error"])
      .limit(limit);

    if (pendingError) throw pendingError;

    const model = new Supabase.ai.Session(MODEL);
    let embedded = 0;
    let errors = 0;

    for (const doc of pendingDocs ?? []) {
      try {
        const embedding = await model.run(String(doc.content).slice(0, MAX_EMBED_CHARS), {
          mean_pool: true,
          normalize: true,
        });

        if (!Array.isArray(embedding) || embedding.length !== 384) {
          throw new Error(`embedding dimension ${Array.isArray(embedding) ? embedding.length : "invalid"}`);
        }

        const { error: updateError } = await supabase
          .from("semantic_documents")
          .update({
            embedding: JSON.stringify(embedding),
            embedding_status: "ready",
            embedding_error: null,
            last_embedded_at: new Date().toISOString(),
          })
          .eq("id", doc.id);

        if (updateError) throw updateError;
        embedded++;
      } catch (error) {
        errors++;
        await supabase
          .from("semantic_documents")
          .update({
            embedding_status: "error",
            embedding_error: error instanceof Error ? error.message : "unknown error",
          })
          .eq("id", doc.id);
      }
    }

    return Response.json(
      {
        mode,
        upserted: changedDocs.length,
        embedded,
        skipped: docs.length - changedDocs.length,
        errors,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("semantic-embeddings error", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "internal error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
