import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

function getGroq() { return createGroq({ apiKey: process.env.GROQ_API_KEY! }); }
function getDB()   { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }

interface AgentContext {
  page?: string;
  placeSlug?: string;
  storySlug?: string;
  placeName?: string;
  storyTitle?: string;
  activeRouteSlugs?: string[];
  filters?: Record<string, unknown>;
  visibleSlugs?: string[];
}

type ChatMessage = { role: string; content: string };

type Intent = "search_places" | "get_story" | "recommend_route" | "get_place" | "explain_sponsor" | "get_nearby" | "general";

type GazetteerEntry = { slug: string; terms: string[]; regionSlug?: string };
type Gazetteer = { regions: GazetteerEntry[]; places: GazetteerEntry[]; categories: GazetteerEntry[] };

type SemanticMatch = {
  entity_type: string; slug: string; title: string; summary?: string;
  category_slug?: string | null; category_name?: string | null;
  region_slug?: string | null; region_name?: string | null;
  rating?: number | null; metadata?: Record<string, unknown>;
  combined_score?: number; match_reason?: string;
};

// ─── Region / Place aliases (used for fallback grounding when LLM misses) ────

const REGION_ALIASES: Array<{ slug: string; terms: string[] }> = [
  { slug: "copan",           terms: ["copan", "copán"] },
  { slug: "comayagua",       terms: ["comayagua"] },
  { slug: "san-pedro-sula",  terms: ["san pedro sula", "sps"] },
  { slug: "francisco-morazan", terms: ["francisco morazan", "tegucigalpa", "tegus", "morazan"] },
  { slug: "cortes",          terms: ["cortes", "cortés", "la ceiba"] },
  { slug: "islas-de-la-bahia", terms: ["islas de la bahia", "roatan", "roatán", "bay islands", "utila", "guanaja"] },
];

const PLACE_ALIASES: Array<{ slug: string; terms: string[] }> = [
  { slug: "catedral-comayagua",      terms: ["catedral de comayagua", "catedral comayagua"] },
  { slug: "ruinas-copan",            terms: ["ruinas de copan", "ruinas de copán", "ruinas copan", "copan ruins"] },
  { slug: "playa-west-bay-roatan",   terms: ["west bay", "playa west bay", "west bay roatan", "west bay roatán"] },
  { slug: "parque-nacional-cusuco",  terms: ["cusuco", "parque nacional cusuco"] },
  { slug: "parque-nacional-la-tigra",terms: ["la tigra", "parque nacional la tigra"] },
];

// ─── Text utilities ───────────────────────────────────────────────────────────

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueTerms(...values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean).map(v => normalizeText(v as string)).filter(Boolean)));
}

function labelFromSlug(slug: string) { return slug.replace(/-/g, " "); }

function inferRegionFromText(text: string): string | null {
  const n = normalizeText(text);
  for (const r of REGION_ALIASES) {
    if (r.terms.some(t => n.includes(normalizeText(t)))) return r.slug;
  }
  return null;
}

function inferPlaceSlugFromText(text: string): string | null {
  const n = normalizeText(text);
  for (const p of PLACE_ALIASES) {
    if (p.terms.some(t => n.includes(normalizeText(t)))) return p.slug;
  }
  return null;
}

// Match a text against gazetteer entries — requires term length >= 4 to avoid false positives
function inferEntryFromText(text: string, entries: GazetteerEntry[], minTermLength = 4): GazetteerEntry | null {
  const n = normalizeText(text);
  const hits = entries
    .map(entry => {
      const matched = entry.terms
        .filter(t => t.length >= minTermLength && n.includes(t))
        .sort((a, b) => b.length - a.length)[0];
      return matched ? { entry, length: matched.length } : null;
    })
    .filter(Boolean) as Array<{ entry: GazetteerEntry; length: number }>;
  return hits.sort((a, b) => b.length - a.length)[0]?.entry ?? null;
}

function normalizeCategoryParam(value?: string): string {
  const n = normalizeText(value ?? "");
  if (n.includes("heritage") || n.includes("patrimonio"))  return "heritage";
  if (n.includes("nature")   || n.includes("naturaleza"))  return "nature";
  if (n.includes("food")     || n.includes("gastronomia")) return "food";
  if (n.includes("adventure")|| n.includes("aventura"))    return "adventure";
  if (n.includes("beach")    || n.includes("playa"))       return "beach";
  if (n.includes("relig"))                                  return "religion";
  if (n.includes("museum")   || n.includes("museo") || n.includes("arte")) return "arts";
  return value ?? "";
}

function isRecommendationRequest(text: string) {
  const n = normalizeText(text);
  return ["otra opcion","otras opciones","otro lugar","otros lugares","que mas hay","que mas puedo ver",
    "algo mas","algo diferente","alguna recomendacion","recomiendame algo","recomienda algo",
    "dame opciones","mas opciones","no se","sorprendeme",
  ].some(t => n.includes(t));
}

function looksLikePlaceSearch(text: string) {
  const n = normalizeText(text);
  return [
    "que lugares","que sitios","recomienda","recomendame","donde ir","que ver","lugares para visitar",
    "me indicas","indicame","como llegar","como llego","donde queda","ubicacion",
    // conversational follow-ups that imply "show me / tell me about this place/region"
    "que tienes","que hay","hay algo","muestrame","a ver","dime","cuales","cuales son","que tienen",
    "y que","digame","cuentame","platícame","platicame","que puedo","puedo visitar",
  ].some(t => n.includes(t));
}

function isPureGreeting(text: string) {
  return /^(hola|hi|hey|hello|buenas|buen dia|buenos dias|buenas tardes|buenas noches|saludos|good morning|good afternoon|good evening)[\s!?.,]*$/i.test(normalizeText(text));
}

function cleanSearchQuery(query?: string, grounding?: { region?: string; category?: string }): string {
  if (!query) return "";
  let n = normalizeText(query);
  for (const token of [grounding?.region, grounding?.category]) {
    if (token) n = n.replaceAll(normalizeText(token), " ");
  }
  n = n.replace(/\s+/g, " ").trim();

  const fillerWords = new Set([
    "tienes","tiene","hay","alguna","algun","otra","otro","opcion","opciones",
    "bonita","bonito","linda","lindo","hermosa","hermoso","buena","buen",
    "recomienda","recomendame","busco","quiero","para","visitar","conocer",
    "destino","destinos","lugar","lugares","sitio","sitios","que","cuales",
    "una","un","de","del","la","el","en","por","favor","con","hay","ahi",
    "playa","playas","beach","naturaleza","nature","patrimonio","cultural",
    "gastronomia","comida","aventura","religioso","religion","arte","museo","museos",
  ]);
  const remaining = n.split(" ").filter(t => t.length > 2 && !fillerWords.has(t));
  if (remaining.length === 0) return "";

  return remaining.join(" ");
}

// ─── Gazetteer builder ────────────────────────────────────────────────────────

async function buildGazetteer(): Promise<Gazetteer> {
  const db = getDB();
  const [regionsRes, placesRes, categoriesRes] = await Promise.all([
    db.from("regions").select("slug,name_i18n"),
    db.from("places").select("slug,name_i18n,regions(slug)").eq("status", "published"),
    db.from("place_categories").select("slug,name_i18n"),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regions = (regionsRes.data ?? []).map((r: any) => ({
    slug: r.slug as string,
    terms: uniqueTerms(r.slug, labelFromSlug(r.slug), r.name_i18n?.es, r.name_i18n?.en),
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const places = (placesRes.data ?? []).map((p: any) => ({
    slug: p.slug as string,
    regionSlug: p.regions?.slug as string | undefined,
    terms: uniqueTerms(p.slug, labelFromSlug(p.slug), p.name_i18n?.es, p.name_i18n?.en),
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories = (categoriesRes.data ?? []).map((c: any) => ({
    slug: c.slug as string,
    terms: uniqueTerms(c.slug, labelFromSlug(c.slug), c.name_i18n?.es, c.name_i18n?.en),
  }));
  return { regions, places, categories };
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystem(ctx: AgentContext, dbData?: unknown, actionConfirmation?: string): string {
  const ctxParts: string[] = [];
  if (ctx.page)               ctxParts.push(`Página=${ctx.page}`);
  if (ctx.placeName)          ctxParts.push(`LugarActivo="${ctx.placeName}"`);
  if (ctx.storyTitle)         ctxParts.push(`Historia="${ctx.storyTitle}"`);
  if (ctx.activeRouteSlugs?.length) ctxParts.push(`RutaActiva=${ctx.activeRouteSlugs.length} paradas: ${ctx.activeRouteSlugs.join(", ")}`);
  if (ctx.filters && Object.keys(ctx.filters).some(k => ctx.filters![k])) {
    const f = ctx.filters;
    const filterStr = [
      f.region    ? `región=${f.region}` : "",
      f.category  ? `categoría=${f.category}` : "",
      f.query     ? `búsqueda="${f.query}"` : "",
      f.minRating ? `rating≥${f.minRating}` : "",
      f.savedOnly ? "soloGuardados" : "",
    ].filter(Boolean).join(", ");
    if (filterStr) ctxParts.push(`FiltrosMapa=${filterStr}`);
  }
  if (ctx.visibleSlugs?.length) ctxParts.push(`LugaresVisibles=${ctx.visibleSlugs.length}: ${ctx.visibleSlugs.slice(0, 8).join(", ")}`);

  const ctxBlock   = ctxParts.length ? `\n\nCONTEXTO UI: ${ctxParts.join(" | ")}` : "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placesData = (dbData as any)?.places;
  const hasPlaces  = Array.isArray(placesData) && placesData.length > 0;
  const placeDetail = (dbData as any)?.place;

  let dataBlock = "";
  if (hasPlaces) {
    dataBlock = `\n\nLUGARES REALES EN LA BASE DE DATOS (USA ESTO — no inventes nada adicional):\n${JSON.stringify(placesData, null, 2)}`;
  } else if (placeDetail) {
    dataBlock = `\n\nDETALLE DEL LUGAR (USA ESTO):\n${JSON.stringify(placeDetail, null, 2)}`;
  } else if (dbData) {
    dataBlock = `\n\nDATA:\n${JSON.stringify(dbData, null, 2)}`;
  }

  const noDataNote = dbData && !hasPlaces && !placeDetail && (dbData as any)?.type === "places"
    ? "\n\nNOTA: No encontré lugares en la base de datos para esta búsqueda. Díselo al usuario claramente y sugiere explorar el mapa manualmente."
    : "";

  const actionNote = actionConfirmation
    ? `\n\nACCIÓN YA EJECUTADA EN EL MAPA: "${actionConfirmation}" — no la repitas. Complementa describiendo los lugares encontrados.`
    : "";

  return `Eres Itinera IA, guía turística de Honduras. Eres directo, concreto e informativo.

REGLAS ESTRICTAS:
1. USA SIEMPRE la DATA REAL. Si tienes lugares en la data, descríbelos por nombre: qué son, qué tienen, por qué visitarlos.
2. NUNCA inventes lugares, fechas, precios, horarios ni datos que no estén en la data. Si no tienes info, dilo.
3. Si hay lugares en la data: menciona 2-3 con nombre específico y algo concreto de cada uno.
4. Sin "con gusto", "claro que sí", introducciones vacías. Ve al punto.
5. Si el usuario hace follow-up ("a ver", "y qué más", "aja"), describe los lugares disponibles en la data.
6. Responde en el mismo idioma que el usuario.
7. En /explore: la UI ya mueve el mapa — tú explicas los lugares con contexto real.

SI page=place: eres guía del lugar activo únicamente.

Hoy: ${new Date().toLocaleDateString("es-HN")}${ctxBlock}${dataBlock}${noDataNote}${actionNote}`;
}

// ─── Intent extraction ────────────────────────────────────────────────────────

async function extractIntent(
  userMsg: string,
  ctx: AgentContext,
  recentHistory: ChatMessage[]
): Promise<{ intent: Intent; params: Record<string, string> }> {
  const historySnippet = recentHistory
    .slice(-4)
    .map(m => `${m.role === "user" ? "Usuario" : "IA"}: ${m.content.slice(0, 120)}`)
    .join("\n");

  const ctxHint = [
    ctx.placeName  ? `Lugar visto actualmente: ${ctx.placeName}` : "",
    ctx.storyTitle ? `Historia leída: ${ctx.storyTitle}` : "",
    historySnippet ? `Conversación reciente:\n${historySnippet}` : "",
  ].filter(Boolean).join("\n");

  try {
    const result = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: (getGroq() as any)("llama-3.1-8b-instant"),
      system: `Eres un clasificador de intent para una app turística de Honduras. Analiza el último mensaje del usuario.
${ctxHint ? `\nContexto de conversación:\n${ctxHint}` : ""}

Devuelve SOLO JSON válido (sin markdown):
{"intent":"<intent>","params":{"query":"<texto limpio>","region":"<slug>","category":"<slug>","slug":"<slug-lugar>"}}

Slugs de región: copan, comayagua, san-pedro-sula, francisco-morazan, cortes, islas-de-la-bahia
Slugs de categoría: heritage, nature, food, adventure, beach, religion, arts

REGLAS DE INTENT:
- search_places: ciudad/región, "qué ver/hay/tienen/tienes", "recomienda", viajes, turismo en Honduras. TAMBIÉN aplica para frases cortas de seguimiento ("a ver", "cuáles", "dime", "muestrame", "que tienes", "y qué", "aja") SI el historial habla de una ciudad/región → extrae esa región.
- get_place: UN lugar específico por nombre ("Ruinas de Copán", "Catedral de Comayagua", "West Bay")
- recommend_route: itinerario, ruta de un día, plan de viaje
- get_story: historia, cultura, tradiciones, por qué algo pasó
- get_nearby: "cerca de mí", "alrededor", "nearby"
- explain_sponsor: sponsors, modelo de negocio
- general: SOLO saludos puros sin contexto (Hola, Hi, Buenas) — nada más

REGLA CRÍTICA: "Comayagua", "Copán", "Roatán" solos = search_places con esa región. Frases cortas de seguimiento con ciudad en historial = search_places con esa ciudad. La ciudad/región siempre va en params.region como slug.`,
      messages: [{ role: "user", content: userMsg }],
    });

    const text = result.text.trim();
    const json = text.startsWith("{") ? text : (text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const parsed = JSON.parse(json) as { intent?: string; params?: Record<string, string> };
    const allowed = new Set(["search_places","get_story","recommend_route","get_place","explain_sponsor","get_nearby","general"]);
    return {
      intent: (allowed.has(parsed.intent ?? "") ? parsed.intent : "general") as Intent,
      params: parsed.params ?? {},
    };
  } catch {
    return { intent: "general", params: {} };
  }
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchData(intent: Intent, params: Record<string, string>, ctx: AgentContext, rawMessage = ""): Promise<any> {
  const db = getDB();

  if (intent === "search_places") {
    // Try semantic search first
    const semanticSecret = process.env.SEMANTIC_REBUILD_SECRET;
    const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (semanticSecret && supabaseUrl) {
      const categorySlug = normalizeCategoryParam(params.category);
      const regionSlug   = params.region ? (inferRegionFromText(params.region) ?? params.region) : "";
      const q = cleanSearchQuery(params.query, { region: regionSlug, category: categorySlug });
      const queryStr = [q || rawMessage, categorySlug ? labelFromSlug(categorySlug) : "", regionSlug ? labelFromSlug(regionSlug) : ""].filter(Boolean).join(" ");
      if (queryStr.trim()) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/semantic-embeddings`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-semantic-secret": semanticSecret },
            body: JSON.stringify({ mode: "search", query: queryStr, entityTypes: ["place"], regionSlug: regionSlug || null, categorySlug: categorySlug || null, limit: 6 }),
          });
          if (res.ok) {
            const payload = await res.json() as { matches?: SemanticMatch[] };
            const matches = payload.matches ?? [];
            if (matches.length) {
              return {
                type: "places",
                places: matches.map(m => ({
                  slug: m.slug, name: m.title, summary: m.summary,
                  rating: Number(m.rating ?? m.metadata?.rating ?? 0),
                  category: m.category_name, categorySlug: m.category_slug,
                  region: m.region_name, regionSlug: m.region_slug,
                  url: `/places/${m.slug}`,
                })),
              };
            }
          }
        } catch (e) { console.error("semantic search error", e); }
      }
    }

    // Fallback: Supabase REST query
    const regionSlug = params.region ? (inferRegionFromText(params.region) ?? params.region) : "";
    const categorySlug = normalizeCategoryParam(params.category);
    const searchQuery = cleanSearchQuery(params.query, { region: regionSlug, category: categorySlug });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = db.from("places")
      .select("slug,name_i18n,ai_summary_i18n,aggregated_rating,price_level,local_favorite,place_categories(name_i18n,slug),regions(name_i18n,slug)")
      .eq("status", "published").order("aggregated_rating", { ascending: false }).limit(6);

    if (regionSlug) {
      const { data: regionRow } = await db.from("regions").select("id").eq("slug", regionSlug).single();
      if (regionRow) q = q.eq("region_id", regionRow.id);
      else {
        // Region not found by slug — try ILIKE on name
        const { data: regionFuzzy } = await db.from("regions").select("id").ilike("slug", `%${regionSlug.split("-")[0]}%`).limit(1).single();
        if (regionFuzzy) q = q.eq("region_id", regionFuzzy.id);
      }
    }

    if (categorySlug) {
      const { data: catRow } = await db.from("place_categories").select("id").eq("slug", categorySlug).single();
      if (catRow) q = q.eq("category_id", catRow.id);
    }

    if (searchQuery) {
      // Try full-text, fall back to ilike if that fails
      const { data: ftData, error: ftError } = await q.textSearch("search_vector", searchQuery, { type: "websearch", config: "spanish" });
      if (!ftError && ftData?.length) {
        return {
          type: "places",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          places: ftData.map((p: any) => ({
            slug: p.slug, name: p.name_i18n?.es, summary: p.ai_summary_i18n?.es,
            rating: Number(p.aggregated_rating), localFavorite: p.local_favorite,
            category: p.place_categories?.name_i18n?.es, categorySlug: p.place_categories?.slug,
            region: p.regions?.name_i18n?.es, regionSlug: p.regions?.slug,
            url: `/places/${p.slug}`,
          })),
        };
      }
      // textSearch failed or returned empty — query without it
    }

    const { data } = await q;
    return {
      type: "places",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      places: (data ?? []).map((p: any) => ({
        slug: p.slug, name: p.name_i18n?.es, summary: p.ai_summary_i18n?.es,
        rating: Number(p.aggregated_rating), localFavorite: p.local_favorite,
        category: p.place_categories?.name_i18n?.es, categorySlug: p.place_categories?.slug,
        region: p.regions?.name_i18n?.es, regionSlug: p.regions?.slug,
        url: `/places/${p.slug}`,
      })),
    };
  }

  if (intent === "get_place") {
    const slug = params.slug ?? ctx.placeSlug;
    if (!slug) return null;
    const { data } = await db.from("places")
      .select("slug,name_i18n,ai_summary_i18n,ai_tips_i18n,aggregated_rating,price_level,phone,website,place_categories(name_i18n,slug),regions(name_i18n,slug)")
      .eq("slug", slug).eq("status", "published").single();
    if (!data) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = data as any;
    return {
      type: "place_detail",
      place: {
        slug: p.slug, name: p.name_i18n?.es, summary: p.ai_summary_i18n?.es, tips: p.ai_tips_i18n?.es,
        rating: Number(p.aggregated_rating), price: p.price_level, phone: p.phone, website: p.website,
        category: p.place_categories?.name_i18n?.es, categorySlug: p.place_categories?.slug,
        region: p.regions?.name_i18n?.es, regionSlug: p.regions?.slug,
        url: `/places/${p.slug}`,
      },
    };
  }

  if (intent === "get_story") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = db.from("stories")
      .select("slug,title_i18n,summary_i18n,body_markdown_i18n,audio_storage_path")
      .eq("status", "published").eq("moderation_status", "approved").limit(2);
    if (params.query) q = q.textSearch("search_vector", params.query, { type: "websearch", config: "spanish" });
    const { data } = await q;
    return {
      type: "stories",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stories: (data ?? []).map((s: any) => ({ slug: s.slug, title: s.title_i18n?.es, summary: s.summary_i18n?.es, hasAudio: !!s.audio_storage_path, url: `/stories/${s.slug}` })),
    };
  }

  if (intent === "recommend_route") {
    const regionSlug = inferRegionFromText(params.region ?? "") ?? (params.region ?? "copan").toLowerCase().replace(/\s+/g, "-");
    const { data: regionRow } = await db.from("regions").select("id").eq("slug", regionSlug).single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = db.from("places")
      .select("slug,name_i18n,ai_summary_i18n,place_categories(name_i18n,slug)")
      .eq("status", "published").order("aggregated_rating", { ascending: false }).limit(5);
    if (regionRow) q = q.eq("region_id", regionRow.id);
    const { data } = await q;
    return {
      type: "route", region: params.region ?? "Honduras",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stops: (data ?? []).map((p: any, i: number) => ({
        order: i + 1, timeOfDay: ["mañana","mañana","tarde","tarde","noche"][i],
        slug: p.slug, name: p.name_i18n?.es, summary: p.ai_summary_i18n?.es,
        category: p.place_categories?.name_i18n?.es, url: `/places/${p.slug}`,
      })),
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

// ─── UI Actions ───────────────────────────────────────────────────────────────

function deriveUIActions(
  intent: Intent,
  params: Record<string, string>,
  dbData: unknown,
  rawMessage = ""
) {
  const msg = normalizeText(rawMessage);
  const isRec = isRecommendationRequest(rawMessage);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = dbData as any;
  const actions: Array<Record<string, unknown>> = [];
  const entities: Record<string, unknown> = {};

  if (params.query)    entities.query    = params.query;
  if (params.category) entities.category = normalizeCategoryParam(params.category);
  if (params.region)   entities.region   = params.region;
  if (params.slug)     entities.slug     = params.slug;

  // Explicit meta-commands
  if (["limpiar filtros","quitar filtros","quita filtros","reset filtros","borrar filtros"].some(t => msg.includes(t))) {
    actions.push({ type: "clear_filters" });
  }
  if (["limpiar ruta","borrar ruta","quitar ruta","quita ruta","reiniciar ruta"].some(t => msg.includes(t))) {
    actions.push({ type: "clear_route" });
  }

  if (intent === "search_places") {
    if (isRec) return { intent, entities, actions };

    const ratingMatch = msg.match(/(?:rating|estrellas?|valoracion)\s*(?:de\s*)?([4-5](?:\.\d)?)/);
    const category    = normalizeCategoryParam(params.category);
    const region      = params.region ?? "";
    const query       = cleanSearchQuery(params.query, { region, category });

    // When switching region/category, apply fresh filter (UI listener handles replacing old state)
    actions.push({
      type: "apply_filter",
      query,
      category,
      region,
      minRating:  ratingMatch ? Number(ratingMatch[1]) : undefined,
      savedOnly:  ["guardados","favoritos"].some(t => msg.includes(t)) || undefined,
    });
    // NEVER auto select_place in search_places — user must choose from map
  }

  if (intent === "get_place") {
    const placeSlug = data?.place?.slug;
    if (placeSlug) {
      actions.push({ type: "select_place", slug: placeSlug });
      const wantsAdd    = ["agrega","agregar","anade","añade","poner","mete","incluye"].some(t => msg.includes(t));
      const wantsRemove = ["quita","quitar","elimina","eliminar","saca","remueve"].some(t => msg.includes(t));
      if (msg.includes("ruta") && wantsAdd)    actions.push({ type: "add_route_stop",    slug: placeSlug });
      if (msg.includes("ruta") && wantsRemove) actions.push({ type: "remove_route_stop", slug: placeSlug });
    }
  }

  if (intent === "recommend_route" && Array.isArray(data?.stops) && data.stops.length) {
    actions.push({
      type: "set_route",
      title: `Ruta recomendada${data.region ? ` · ${data.region}` : ""}`,
      stops: data.stops.map((s: { order: number; slug: string; name: string; timeOfDay?: string; url?: string }) => ({
        order: s.order, slug: s.slug, name: s.name, timeOfDay: s.timeOfDay, url: s.url,
      })),
    });
  }

  if (intent === "get_nearby") actions.push({ type: "get_nearby" });

  return { intent, entities, actions };
}

// Only return a mechanical confirmation for pure state-mutation actions.
// For everything else, the LLM generates a real informative response.
function getMechanicalConfirmation(actions: Array<Record<string, unknown>>): string {
  const types = new Set(actions.map(a => a.type));
  if (types.has("clear_route"))        return "Limpié la ruta del mapa.";
  if (types.has("clear_filters"))      return "Quité los filtros y dejé el mapa limpio.";
  if (types.has("get_nearby"))         return "Activé tu ubicación para ordenar destinos cercanos.";
  if (types.has("add_route_stop"))     return "Agregué ese lugar a tu ruta.";
  if (types.has("remove_route_stop"))  return "Quité esa parada de tu ruta.";
  return "";
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { messages, context = {} } = await req.json() as { messages: ChatMessage[]; context?: AgentContext };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function emit(obj: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      try {
        const lastUserMsg    = messages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";
        const previousMsgs   = messages.slice(0, -1); // everything before last user message
        const recentHistory  = previousMsgs.slice(-6); // last 6 messages (3 exchanges) for context

        // Build grounding context from recent conversation (for region/category continuity)
        const groundingText = recentHistory.filter(m => m.role === "user").map(m => m.content).join(" ");

        // ── Step 1: Extract intent with conversation context ──────────────────
        const extracted = await extractIntent(lastUserMsg, context, recentHistory);
        let intent = extracted.intent;
        const params: Record<string, string> = { ...extracted.params };

        const isExploreRec = context.page === "explore" && isRecommendationRequest(lastUserMsg);

        if (isExploreRec) {
          intent = "search_places";
          delete params.slug;
          delete params.region;
          delete params.category;
          params.query = "";
        }

        // ── Step 2: Grounding — enrich params from gazetteer ─────────────────
        const gazetteer = await buildGazetteer();

        // Always look for region in current message first, then history
        const currentRegion   = inferEntryFromText(lastUserMsg, gazetteer.regions);
        const historicRegion  = inferEntryFromText(groundingText, gazetteer.regions);
        const groundedRegion  = isExploreRec ? null : (currentRegion ?? historicRegion);
        const inferredRegion  = isExploreRec ? null : (groundedRegion?.slug ?? inferRegionFromText(lastUserMsg) ?? inferRegionFromText(groundingText));

        // Category from current message only (don't inherit from history)
        const groundedCategory = isExploreRec ? null : inferEntryFromText(lastUserMsg, gazetteer.categories);

        // Specific place — ONLY when intent is explicitly get_place
        // For search_places, a region mention should NEVER become a place slug
        const asksForDirections  = ["me indicas","indicame","como llegar","como llego","donde queda","ubicacion"].some(t => normalizeText(lastUserMsg).includes(t));
        const routePronounTarget = context.page === "explore" && Boolean(context.placeSlug)
          && ["agregala","agregalo","agrega ese","agrega esa","anadela","anadelo","incluyela","incluyelo"].some(t => normalizeText(lastUserMsg).includes(t));

        let inferredPlaceSlug: string | null = null;
        if (!isExploreRec && intent !== "search_places") {
          // Only resolve a specific place for get_place / directions / route pronouns
          inferredPlaceSlug = inferEntryFromText(lastUserMsg, gazetteer.places)?.slug
            ?? inferPlaceSlugFromText(lastUserMsg)
            ?? ((asksForDirections || routePronounTarget) ? context.placeSlug ?? null : null);
        } else if (routePronounTarget) {
          inferredPlaceSlug = context.placeSlug ?? null;
        }

        // ── Step 3: Override intents based on context ─────────────────────────

        if (intent === "general" && looksLikePlaceSearch(lastUserMsg + " " + groundingText)) {
          intent = "search_places";
        }

        // Key upgrade: if LLM returned "general" for a non-greeting message that has region context
        // from history, treat it as a follow-up search in that region
        if (intent === "general" && inferredRegion && !isPureGreeting(lastUserMsg)) {
          intent = "search_places";
          if (!params.region) params.region = inferredRegion;
        }

        // If on a place page, treat search_places/general as get_place for that place
        if (context.page === "place" && (intent === "search_places" || intent === "general")) {
          intent = "get_place";
          if (context.placeSlug) params.slug = context.placeSlug;
        }

        // Promote to get_place if we resolved a specific place slug
        if (inferredPlaceSlug && intent !== "recommend_route") {
          intent = "get_place";
          params.slug = inferredPlaceSlug;
        }

        // Fill region if missing
        if (!params.region && inferredRegion && !isExploreRec) {
          params.region = inferredRegion;
        }

        // Fill category if missing
        if (!params.category && groundedCategory?.slug) {
          params.category = groundedCategory.slug;
        }

        // Clean query
        params.query = cleanSearchQuery(params.query, { region: params.region, category: params.category });

        // ── Step 4: Fetch data ────────────────────────────────────────────────
        const dbData = await fetchData(intent, params, context, lastUserMsg);

        // ── Step 5: Derive UI actions ─────────────────────────────────────────
        const uiActions    = deriveUIActions(intent, params, dbData, lastUserMsg);
        const mechanical   = context.page === "explore" ? getMechanicalConfirmation(uiActions.actions) : "";

        if (mechanical) emit({ type: "text-delta", textDelta: mechanical + "\n\n" });

        // ── Step 6: Generate full LLM response ───────────────────────────────
        const llmResult = await generateText({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          model: (getGroq() as any)("llama-3.3-70b-versatile"),
          system: buildSystem(context, dbData, mechanical || undefined),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages: messages as any,
          temperature: 0.45,
          maxOutputTokens: 400,
        });

        if (llmResult.text) emit({ type: "text-delta", textDelta: llmResult.text });

        if (dbData) emit({ type: "tool-result", toolName: intent, result: dbData });
        emit({ type: "ui-actions", ...uiActions });

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
