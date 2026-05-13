import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

function getGroq() { return createGroq({ apiKey: process.env.GROQ_API_KEY! }); }
function getDB()   { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }

interface AgentContext {
  page?: string; placeSlug?: string; storySlug?: string;
  placeName?: string; storyTitle?: string;
}

const REGION_ALIASES: Array<{ slug: string; terms: string[] }> = [
  { slug: "copan", terms: ["copan", "copán"] },
  { slug: "comayagua", terms: ["comayagua"] },
  { slug: "san-pedro-sula", terms: ["san pedro sula", "sps"] },
  { slug: "tegucigalpa", terms: ["tegucigalpa", "tegus"] },
  { slug: "la-ceiba", terms: ["la ceiba"] },
  { slug: "roatan", terms: ["roatan", "roatán"] },
];

function inferRegionFromText(text: string): string | null {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const region of REGION_ALIASES) {
    if (region.terms.some((term) => normalized.includes(term.normalize("NFD").replace(/[̀-ͯ]/g, "")))) {
      return region.slug;
    }
  }
  return null;
}

function looksLikePlaceSearch(text: string): boolean {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return [
    "que lugares",
    "qué lugares",
    "recomienda",
    "recomendame",
    "donde ir",
    "qué ver",
    "que ver",
    "lugares para visitar",
  ].some((term) => normalized.includes(term.normalize("NFD").replace(/[̀-ͯ]/g, "")));
}

// ─── System prompt ───────────────────────────────────────────────────────────
function buildSystem(ctx: AgentContext, dbData?: unknown): string {
  const ctxBlock = ctx.page
    ? `\nCONTEXTO: Página=${ctx.page}${ctx.placeName ? ` Lugar="${ctx.placeName}"` : ""}${ctx.storyTitle ? ` Historia="${ctx.storyTitle}"` : ""}`
    : "";
  const dataBlock = dbData
    ? `\n\nDATA DEL SISTEMA (ÚSALA para responder con detalle):\n${JSON.stringify(dbData, null, 2)}`
    : "";

  return `Eres Itinera IA, guía cultural apasionado de Honduras.

PERSONALIDAD: Cálido y entusiasta base. Adaptable totalmente al usuario.
Evita repetir introducciones; responde primero a la solicitud concreta del usuario.
Nunca listes datos en seco — NARRA con emoción, contexto histórico y personalidad.
Sé conciso pero impactante.

IDIOMA: Responde SIEMPRE en el mismo idioma que el usuario (español o inglés).

CRÍTICO: SOLO menciona lugares que estén en la DATA DEL SISTEMA. NUNCA inventes lugares, negocios o atracciones. Si no tienes data de una región, dilo honestamente y sugiere explorar el mapa.

Ejemplos:
❌ "Cusuco: categoría Naturaleza, 4.7 estrellas"
✅ "¡Cusuco es una joya escondida! Bosques nubosos a 30 min de San Pedro Sula, hogar del quetzal 🌿"

Hoy: ${new Date().toLocaleDateString("es-HN")}${ctxBlock}${dataBlock}`;
}

// ─── Intent extraction (step 1) ──────────────────────────────────────────────
async function extractIntent(userMsg: string, ctx: AgentContext): Promise<{
  intent: "search_places" | "get_story" | "recommend_route" | "get_place" | "explain_sponsor" | "get_nearby" | "general";
  params: Record<string, string>;
}> {
  const systemContext = ctx.placeName ? `El usuario está viendo el lugar: ${ctx.placeName}` : "";
  const systemStory   = ctx.storyTitle ? `El usuario está leyendo: ${ctx.storyTitle}` : "";

  try {
    const result = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: (getGroq() as any)("llama-3.1-8b-instant"),
      system: `Extract intent from user message. ${systemContext} ${systemStory}
Return ONLY valid JSON (no markdown):
{"intent":"search_places|get_story|recommend_route|get_place|explain_sponsor|get_nearby|general","params":{"query":"...","region":"copan|tegucigalpa|la-ceiba|roatan|comayagua|san-pedro-sula","category":"heritage|nature|food|adventure|beach","slug":"place-slug-here"}}

Intent rules (be AGGRESSIVE classifying place/travel queries):
- search_places: ANY mention of visiting, going to a city/region, "qué ver", "qué lugares", "recomienda", "recomendas", travel plans to Honduras
- get_story: history, culture, traditions, how/why something happened
- recommend_route: day plan, itinerary, "qué hacer en un día", route
- get_place: asking about ONE specific place by name
- explain_sponsor: sponsors, why places appear first, business model
- get_nearby: nearby places, "cerca de mí", "near me", "alrededor"
- general: ONLY pure greetings (Hola, Hi) or very abstract questions NOT about travel/places

IMPORTANT: If the user mentions ANY city, region or travel in Honduras → search_places`,
      messages: [{ role: "user", content: userMsg }],
    });

    const text = result.text.trim();
    const json = text.startsWith("{") ? text : text.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
    const parsed = JSON.parse(json) as { intent?: string; params?: Record<string, string> };
    const allowedIntents = new Set([
      "search_places",
      "get_story",
      "recommend_route",
      "get_place",
      "explain_sponsor",
      "get_nearby",
      "general",
    ]);
    const intent = allowedIntents.has(parsed.intent ?? "") ? parsed.intent : "general";
    return {
      intent: intent as "search_places" | "get_story" | "recommend_route" | "get_place" | "explain_sponsor" | "get_nearby" | "general",
      params: parsed.params ?? {},
    };
  } catch {
    return { intent: "general", params: {} };
  }
}

// ─── Data fetcher (step 2) ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchData(intent: string, params: Record<string, string>, ctx: AgentContext): Promise<any> {
  const safeParams = params ?? {};
  const db = getDB();

  if (intent === "search_places") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = db.from("places")
      .select("slug,name_i18n,ai_summary_i18n,aggregated_rating,price_level,local_favorite,place_categories(name_i18n,slug),regions(name_i18n)")
      .eq("status", "published").order("aggregated_rating", { ascending: false }).limit(4);
    if (safeParams.query) q = q.textSearch("search_vector", safeParams.query, { type: "websearch", config: "spanish" });
    if (safeParams.region) {
      const { data: r } = await db.from("regions").select("id").eq("slug", safeParams.region).single();
      if (r) q = q.eq("region_id", r.id);
    }
    if (safeParams.category) {
      const { data: c } = await db.from("place_categories").select("id").eq("slug", safeParams.category).single();
      if (c) q = q.eq("category_id", c.id);
    }
    const { data } = await q;
    return {
      type: "places",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      places: (data ?? []).map((p: any) => ({
        slug: p.slug,
        name: p.name_i18n?.es,
        summary: p.ai_summary_i18n?.es,
        rating: Number(p.aggregated_rating),
        price: p.price_level,
        localFavorite: p.local_favorite,
        category: p.place_categories?.name_i18n?.es,
        region: p.regions?.name_i18n?.es,
        url: `/places/${p.slug}`,
      })),
    };
  }

  if (intent === "get_place") {
    const slug = safeParams.slug ?? ctx.placeSlug;
    if (!slug) return null;
    const { data } = await db.from("places")
      .select("slug,name_i18n,ai_summary_i18n,ai_tips_i18n,aggregated_rating,price_level,phone,website,place_categories(name_i18n),regions(name_i18n)")
      .eq("slug", slug).eq("status", "published").single();
    if (!data) return null;
    return {
      type: "place_detail",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      place: { slug: data.slug, name: (data as any).name_i18n?.es, summary: (data as any).ai_summary_i18n?.es, tips: (data as any).ai_tips_i18n?.es, rating: Number(data.aggregated_rating), price: data.price_level, phone: data.phone, website: data.website, category: (data as any).place_categories?.name_i18n?.es, region: (data as any).regions?.name_i18n?.es, url: `/places/${data.slug}` },
    };
  }

  if (intent === "get_story") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = db.from("stories")
      .select("slug,title_i18n,summary_i18n,body_markdown_i18n,audio_storage_path")
      .eq("status", "published").eq("moderation_status", "approved").limit(2);
    if (safeParams.query) q = q.textSearch("search_vector", safeParams.query, { type: "websearch", config: "spanish" });
    const { data } = await q;
    return {
      type: "stories",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stories: (data ?? []).map((s: any) => ({ slug: s.slug, title: s.title_i18n?.es, summary: s.summary_i18n?.es, hasAudio: !!s.audio_storage_path, url: `/stories/${s.slug}` })),
    };
  }

  if (intent === "recommend_route") {
    const regionSlug = (safeParams.region ?? "copan").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");
    const { data: reg } = await db.from("regions").select("id").eq("slug", regionSlug).single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = db.from("places").select("slug,name_i18n,place_categories(name_i18n)").eq("status","published").order("aggregated_rating",{ascending:false}).limit(4);
    if (reg) q = q.eq("region_id", reg.id);
    const { data } = await q;
    return {
      type: "route",
      region: safeParams.region ?? "Honduras",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stops: (data ?? []).map((p: any, i: number) => ({ order: i+1, timeOfDay: ["morning","morning","afternoon","evening"][i], slug: p.slug, name: p.name_i18n?.es, category: p.place_categories?.name_i18n?.es, url: `/places/${p.slug}` })),
    };
  }

  if (intent === "explain_sponsor") {
    return { type: "sponsor_info", maxBoost: "15%", algorithm: "rating 55% + proximidad 45% × (1 + boost)" };
  }

  if (intent === "get_nearby") {
    return { type: "nearby_request" };
  }

  return null;
}

function deriveUIActions(intent: string, params: Record<string, string>, dbData: unknown) {
  const safeParams = params ?? {};
  const data = dbData as {
    places?: { slug?: string }[];
    place?: { slug?: string };
    region?: string;
    stops?: Array<{ order: number; slug: string; name: string; timeOfDay?: string; url?: string }>;
  };
  const actions: Array<Record<string, unknown>> = [];
  const entities: Record<string, unknown> = {};

  if (safeParams.query) entities.query = safeParams.query;
  if (safeParams.category) entities.category = safeParams.category;
  if (safeParams.region) entities.region = safeParams.region;
  if (safeParams.slug) entities.slug = safeParams.slug;

  if (intent === "search_places") {
    actions.push({
      type: "apply_filter",
      query: safeParams.query ?? "",
      category: safeParams.category ?? "",
    });
    if (data?.places?.[0]?.slug) {
      actions.push({ type: "select_place", slug: data.places[0].slug });
    }
  }

  if (intent === "get_place" && data?.place?.slug) {
    actions.push({ type: "select_place", slug: data.place.slug });
  }

  if (intent === "recommend_route" && Array.isArray(data?.stops)) {
    actions.push({
      type: "set_route",
      title: `Ruta recomendada${data?.region ? ` · ${data.region}` : ""}`,
      stops: data.stops.map((s) => ({
        order: s.order,
        slug: s.slug,
        name: s.name,
        timeOfDay: s.timeOfDay,
        url: s.url,
      })),
    });
  }

  if (intent === "get_nearby") {
    actions.push({ type: "get_nearby" });
  }

  return { intent, entities, actions };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const { messages, context = {} } = await req.json() as {
    messages: { role: string; content: string }[];
    context?: AgentContext;
  };

  const encoder = new TextEncoder();
  const stream  = new ReadableStream({
    async start(controller) {
      function emit(obj: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      try {
        const lastUserMsg = messages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";

        // Step 1: Extract intent (fast, cheap model)
        const extracted = await extractIntent(lastUserMsg, context);
        let intent = extracted.intent;
        const params = extracted.params;
        const normalizedParams = { ...(params ?? {}) };
        const recentUserContext = messages
          .filter((m) => m.role === "user")
          .slice(-4)
          .map((m) => m.content)
          .join(" ");
        const inferredRegion = inferRegionFromText(`${recentUserContext} ${lastUserMsg}`);
        if (intent === "general" && looksLikePlaceSearch(`${recentUserContext} ${lastUserMsg}`)) {
          intent = "search_places";
        }
        if (!normalizedParams.region && inferredRegion) {
          normalizedParams.region = inferredRegion;
        }

        // Step 2: Fetch data from Supabase if needed
        const dbData = await fetchData(intent, normalizedParams, context);

        // Step 3: Generate response with data context
        const result = await generateText({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          model: (getGroq() as any)("llama-3.3-70b-versatile"),
          system: buildSystem(context, dbData),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages: messages as any,
          temperature: 0.55,
        });

        if (result.text) emit({ type: "text-delta", textDelta: result.text });
        if (dbData)      emit({ type: "tool-result", toolName: intent, result: dbData });
        emit({ type: "ui-actions", ...deriveUIActions(intent, normalizedParams, dbData) });

      } catch (err) {
        console.error("api/chat error", err);
        emit({ type: "text-delta", textDelta: "Lo siento, tuve un problema temporal. Intenta de nuevo." });
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
