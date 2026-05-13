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

type GazetteerEntry = {
  slug: string;
  terms: string[];
  regionSlug?: string;
};

type Gazetteer = {
  regions: GazetteerEntry[];
  places: GazetteerEntry[];
  categories: GazetteerEntry[];
};

const REGION_ALIASES: Array<{ slug: string; terms: string[] }> = [
  { slug: "copan", terms: ["copan", "copán"] },
  { slug: "comayagua", terms: ["comayagua"] },
  { slug: "san-pedro-sula", terms: ["san pedro sula", "sps"] },
  { slug: "tegucigalpa", terms: ["tegucigalpa", "tegus"] },
  { slug: "la-ceiba", terms: ["la ceiba"] },
  { slug: "roatan", terms: ["roatan", "roatán"] },
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueTerms(...values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean).map((value) => normalizeText(value as string)).filter(Boolean)));
}

function inferRegionFromText(text: string): string | null {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const region of REGION_ALIASES) {
    if (region.terms.some((term) => normalized.includes(term.normalize("NFD").replace(/[̀-ͯ]/g, "")))) {
      return region.slug;
    }
  }
  return null;
}

const PLACE_ALIASES: Array<{ slug: string; terms: string[] }> = [
  { slug: "catedral-comayagua", terms: ["catedral de comayagua", "catedral comayagua"] },
  { slug: "ruinas-copan", terms: ["ruinas de copan", "ruinas de copán", "copan ruins"] },
  { slug: "playa-west-bay-roatan", terms: ["west bay", "playa west bay", "west bay roatan", "west bay roatán"] },
  { slug: "parque-nacional-cusuco", terms: ["cusuco", "parque nacional cusuco"] },
  { slug: "parque-nacional-la-tigra", terms: ["la tigra", "parque nacional la tigra"] },
];

function inferPlaceSlugFromText(text: string): string | null {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const place of PLACE_ALIASES) {
    if (place.terms.some((term) => normalized.includes(term.normalize("NFD").replace(/[̀-ͯ]/g, "")))) {
      return place.slug;
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
    "me indicas",
    "indicame",
    "como llegar",
    "como llego",
    "donde queda",
    "ubicacion",
  ].some((term) => normalized.includes(term.normalize("NFD").replace(/[̀-ͯ]/g, "")));
}

// ─── System prompt ───────────────────────────────────────────────────────────
function inferEntryFromText(text: string, entries: GazetteerEntry[]) {
  const normalized = normalizeText(text);
  const matches = entries
    .map((entry) => {
      const matchedTerm = entry.terms
        .filter((term) => term.length >= 3 && normalized.includes(term))
        .sort((a, b) => b.length - a.length)[0];
      return matchedTerm ? { entry, length: matchedTerm.length } : null;
    })
    .filter(Boolean) as Array<{ entry: GazetteerEntry; length: number }>;
  return matches.sort((a, b) => b.length - a.length)[0]?.entry ?? null;
}

function cleanSearchQuery(query?: string, grounding?: { region?: string; category?: string; slug?: string }) {
  if (!query) return "";
  let normalized = normalizeText(query);
  for (const token of [grounding?.region, grounding?.category, grounding?.slug]) {
    if (token) normalized = normalized.replaceAll(normalizeText(token), " ");
  }
  normalized = normalized.replace(/\s+/g, " ").trim();
  const genericTerms = [
    "que lugares tiene",
    "que lugares hay",
    "que ver",
    "donde ir",
    "recomienda",
    "recomendame",
    "lugares",
    "sitios",
    "atracciones",
    "me indicas",
  ];
  if (!normalized || genericTerms.some((term) => normalized === normalizeText(term) || normalized.includes(normalizeText(term)))) {
    return "";
  }
  return query.trim();
}

function labelFromSlug(slug: string) {
  return slug.replace(/-/g, " ");
}

async function buildGazetteer(): Promise<Gazetteer> {
  const db = getDB();
  const [regionsRes, placesRes, categoriesRes] = await Promise.all([
    db.from("regions").select("slug,name_i18n"),
    db.from("places").select("slug,name_i18n,regions(slug)").eq("status", "published"),
    db.from("place_categories").select("slug,name_i18n"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regions = (regionsRes.data ?? []).map((region: any) => ({
    slug: region.slug as string,
    terms: uniqueTerms(region.slug, labelFromSlug(region.slug), region.name_i18n?.es, region.name_i18n?.en),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const places = (placesRes.data ?? []).map((place: any) => ({
    slug: place.slug as string,
    regionSlug: place.regions?.slug as string | undefined,
    terms: uniqueTerms(place.slug, labelFromSlug(place.slug), place.name_i18n?.es, place.name_i18n?.en),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories = (categoriesRes.data ?? []).map((category: any) => ({
    slug: category.slug as string,
    terms: uniqueTerms(category.slug, labelFromSlug(category.slug), category.name_i18n?.es, category.name_i18n?.en),
  }));

  return { regions, places, categories };
}

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

Si CONTEXTO indica Pagina=place, responde como guia del lugar actual: no recomiendes listas de otros destinos ni devuelvas "lugares que tiene"; esa exploracion pertenece al mapa /explore.

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
    const searchQuery = cleanSearchQuery(safeParams.query, {
      region: safeParams.region,
      category: safeParams.category,
      slug: safeParams.slug,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = db.from("places")
      .select("slug,name_i18n,ai_summary_i18n,aggregated_rating,price_level,local_favorite,place_categories(name_i18n,slug),regions(name_i18n)")
      .eq("status", "published").order("aggregated_rating", { ascending: false }).limit(4);
    if (searchQuery) q = q.textSearch("search_vector", searchQuery, { type: "websearch", config: "spanish" });
    if (safeParams.region) {
      const normalizedRegion = inferRegionFromText(safeParams.region) ?? safeParams.region;
      const { data: r } = await db.from("regions").select("id").eq("slug", normalizedRegion).single();
      if (r) q = q.eq("region_id", r.id);
      else return { type: "places", places: [] };
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
      query: cleanSearchQuery(safeParams.query, safeParams) || (safeParams.region ? labelFromSlug(safeParams.region) : ""),
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
        const groundingText = `${recentUserContext} ${lastUserMsg}`;
        const gazetteer = await buildGazetteer();
        const currentPlace = inferEntryFromText(lastUserMsg, gazetteer.places);
        const currentRegion = inferEntryFromText(lastUserMsg, gazetteer.regions);
        const groundedPlace = currentPlace ?? (currentRegion ? null : inferEntryFromText(groundingText, gazetteer.places));
        const groundedRegion = currentRegion ?? inferEntryFromText(groundingText, gazetteer.regions);
        const groundedCategory = inferEntryFromText(lastUserMsg, gazetteer.categories) ?? inferEntryFromText(groundingText, gazetteer.categories);
        const inferredRegion = groundedRegion?.slug ?? inferRegionFromText(groundingText);
        const asksForDirections = ["me indicas", "indicame", "como llegar", "como llego", "donde queda", "ubicacion"]
          .some((term) => normalizeText(lastUserMsg).includes(term));
        const inferredPlaceSlug = groundedPlace?.slug ?? (asksForDirections ? context.placeSlug : null) ?? inferPlaceSlugFromText(groundingText);
        if (intent === "general" && looksLikePlaceSearch(groundingText)) {
          intent = "search_places";
        }
        if (context.page === "place" && (intent === "search_places" || intent === "general")) {
          intent = "get_place";
          if (context.placeSlug) normalizedParams.slug = context.placeSlug;
        }
        if (inferredPlaceSlug) {
          intent = "get_place";
          normalizedParams.slug = inferredPlaceSlug;
          if (!normalizedParams.region && groundedPlace?.regionSlug) normalizedParams.region = groundedPlace.regionSlug;
        }
        if (!normalizedParams.region && inferredRegion) {
          normalizedParams.region = inferredRegion;
        }
        if (!normalizedParams.category && groundedCategory?.slug) {
          normalizedParams.category = groundedCategory.slug;
        }
        normalizedParams.query = cleanSearchQuery(normalizedParams.query, normalizedParams);

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
