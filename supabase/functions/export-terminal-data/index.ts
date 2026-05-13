/**
 * Edge Function: export-terminal-data
 * Returns a full snapshot of published content for the Jetson SQLite sync.
 *
 * Request:
 *   GET /functions/v1/export-terminal-data
 *   Headers:
 *     Authorization: Bearer <device_token_plaintext>
 *     x-device-id: <device_uuid>
 *
 * Response 200:
 *   {
 *     exported_at: string (ISO),
 *     places: Place[],
 *     stories: Story[],
 *     categories: Category[],
 *     regions: Region[],
 *     tags: Tag[]
 *   }
 *
 * The Jetson Python script calls this on startup (when WiFi available)
 * and rebuilds its local SQLite from the snapshot.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-device-id",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Validate device credentials
  const deviceId = req.headers.get("x-device-id");
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!deviceId || !token) {
    return new Response(JSON.stringify({ error: "x-device-id and Bearer token required" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Verify device token
  const { data: valid, error: verifyErr } = await supabase.rpc(
    "verify_device_token",
    { p_device_id: deviceId, p_token_plaintext: token }
  );

  if (verifyErr || !valid) {
    return new Response(JSON.stringify({ error: "invalid device credentials" }), {
      status: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Fetch all data in parallel
  const [placesRes, storiesRes, categoriesRes, regionsRes, tagsRes, storyPlacesRes] =
    await Promise.all([
      supabase
        .from("places")
        .select(`
          id, slug, name_i18n, description_i18n, ai_summary_i18n, ai_tips_i18n,
          place_type_id, category_id, region_id,
          location, address_i18n, phone, website, hours,
          accessibility, price_level, local_favorite, featured,
          aggregated_rating, review_count
        `)
        .eq("status", "published"),

      supabase
        .from("stories")
        .select("id, slug, title_i18n, summary_i18n, body_markdown_i18n, audio_storage_path, region_id, featured")
        .eq("status", "published")
        .eq("moderation_status", "approved"),

      supabase
        .from("place_categories")
        .select("id, slug, name_i18n, icon_name, sort_order")
        .order("sort_order"),

      supabase
        .from("regions")
        .select("id, slug, name_i18n, sort_order")
        .order("sort_order"),

      supabase
        .from("tags")
        .select("id, slug, name_i18n"),

      supabase
        .from("story_places")
        .select("story_id, place_id"),
    ]);

  // Check for errors
  const errors = [placesRes, storiesRes, categoriesRes, regionsRes, tagsRes, storyPlacesRes]
    .filter((r) => r.error)
    .map((r) => r.error?.message);

  if (errors.length > 0) {
    console.error("export errors:", errors);
    return new Response(JSON.stringify({ error: "internal error", details: errors }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const payload = {
    exported_at: new Date().toISOString(),
    places: placesRes.data ?? [],
    stories: storiesRes.data ?? [],
    categories: categoriesRes.data ?? [],
    regions: regionsRes.data ?? [],
    tags: tagsRes.data ?? [],
    story_places: storyPlacesRes.data ?? [],
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
