import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getGroq() {
  return createGroq({ apiKey: process.env.GROQ_API_KEY! });
}

function getDB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Semantic search via Supabase AI (gte-small embeddings) ────────────────

interface SemanticPlace {
  slug: string;
  name_es: string;
  summary_es: string;
  category_es: string;
  region_es: string;
  aggregated_rating: number;
  similarity: number;
}

interface SemanticDocumentResult {
  slug: string;
  title: string;
  summary: string;
  category_name: string;
  region_name: string;
  rating: number;
  combined_score: number;
}

// ── Keyword extraction for semantic search ────────────────────────────────
// Strips stop words and navigation phrases so the RPC receives clean keywords
// e.g. "Muéstrame lugares relacionados con Mayas" → "mayas"
const SEMANTIC_STOP_WORDS = new Set([
  "muestrame","ensename","muestra","abre","ver","quiero","llevame","ir","pon","ponme",
  "dame","dime","busca","buscar","busco","encuentra","encontrar","informacion","sobre",
  "lugares","lugar","sitios","sitio","relacionados","relacionado","con","para","que",
  "hay","tiene","tienes","cerca","del","por","las","los","una","uno","sus","mis",
  "como","donde","cuando","cuales","cual","este","esta","estos","estas",
  "el","la","de","en","y","o","a","e","u","al","lo",
]);

function extractKeywords(text: string): string {
  const words = norm(text)
    .split(/\s+/)
    .filter(w => w.length >= 3 && !SEMANTIC_STOP_WORDS.has(w));
  return words.join(" ") || norm(text);
}

async function semanticSearch(query: string): Promise<SemanticPlace[]> {
  try {
    // Extract meaningful keywords from conversational query
    // "Muéstrame lugares relacionados con Mayas" → "mayas"
    const keywords = extractKeywords(query);
    if (!keywords.trim()) return [];

    const db = getDB();

    // Hybrid search: full-text on keywords + semantic embeddings (if available)
    // Threshold 0 → return all matches ranked by combined_score, even low ones
    const { data, error } = await db.rpc("search_semantic_documents", {
      p_query: keywords,
      p_query_embedding: null,
      p_entity_types: ["place"],
      p_region_slug: null,
      p_category_slug: null,
      p_locale: "es",
      p_match_count: 5,
      p_match_threshold: 0, // No threshold — return best matches regardless of score
    });

    if (error) {
      console.error("[semanticSearch] RPC error:", error.message);
      return [];
    }
    if (!data || (data as SemanticDocumentResult[]).length === 0) return [];

    return (data as SemanticDocumentResult[]).map(doc => ({
      slug: doc.slug,
      name_es: doc.title,
      summary_es: doc.summary || "",
      category_es: doc.category_name || "",
      region_es: doc.region_name || "",
      aggregated_rating: doc.rating || 0,
      similarity: Math.max(0, Math.min(1, (doc.combined_score || 0) / 4.75)),
    }));
  } catch (err) {
    console.error("[semanticSearch] exception:", err);
    return [];
  }
}

// ── Normalization ──────────────────────────────────────────────────────

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// ── Region Detection ──────────────────────────────────────────────────

const REGIONS = [
  { slug: "comayagua",     keywords: ["comayagua"] },
  { slug: "copan",         keywords: ["copan", "copán", "ruinas", "copan ruinas", "copán ruinas"] },
  { slug: "bay-islands",   keywords: ["roatan", "roatán", "islas de la bahia", "bahia", "islas", "utila", "guanaja"] },
  { slug: "francisco-morazan", keywords: ["tegucigalpa", "tegus", "francisco morazan", "morazan", "capital"] },
  { slug: "cortes",        keywords: ["cortes", "cortés", "san pedro sula", "sps"] },
  { slug: "atlantida",     keywords: ["la ceiba", "ceiba", "atlantida", "atlántida", "tela", "lancetilla"] },
  { slug: "colon",         keywords: ["colon", "colón", "trujillo"] },
  { slug: "olancho",       keywords: ["olancho", "juticalpa"] },
  { slug: "santa-barbara", keywords: ["santa barbara", "santa bárbara"] },
  { slug: "lempira",       keywords: ["lempira", "gracias", "gracias a dios"] },
  { slug: "choluteca",     keywords: ["choluteca"] },
  { slug: "yoro",          keywords: ["yoro"] },
];

function detectRegion(text: string): string | null {
  const n = norm(text);
  if (!n) return null;
  const words = n.split(/\s+/);

  for (const region of REGIONS) {
    for (const keyword of region.keywords) {
      const nk = norm(keyword);
      // Multi-word keyword: substring match
      if (nk.includes(" ")) {
        if (n.includes(nk)) return region.slug;
        continue;
      }
      // Single word: exact match or starts-with (prefix)
      if (words.some(w => w === nk || w.startsWith(nk))) {
        return region.slug;
      }
    }
  }
  return null;
}

// ── Category Detection ──────────────────────────────────────────────────

const CATEGORIES = [
  { slug: "beach",     keywords: ["playa", "playas", "beach", "mar", "buceo", "snorkel", "caribe", "costa"] },
  { slug: "nature",    keywords: ["naturaleza", "parque", "parques", "bosque", "sendero", "senderos", "ecoturismo", "flora", "fauna", "reserva"] },
  { slug: "heritage",  keywords: ["patrimonio", "ruinas", "historico", "historicos", "arqueologia", "colonial", "prehispanico"] },
  { slug: "religion",  keywords: ["iglesia", "iglesias", "catedral", "catedrales", "religioso", "religiosos", "templo", "templos", "capilla", "capillas", "basilica", "santuario"] },
  { slug: "food",      keywords: ["comida", "restaurant", "restaurante", "restaurantes", "restaurants", "gastronomia", "tipico", "comer", "cocina", "cena", "almuerzo", "desayuno", "cafe", "cafeteria", "bar", "comedor"] },
  { slug: "adventure", keywords: ["aventura", "aventuras", "senderismo", "escalada", "adrenalina", "extremo", "outdoor"] },
  { slug: "arts",      keywords: ["museo", "museos", "galeria", "galerias", "arte", "artes", "cultura", "artesania"] },
];

function detectCategory(text: string): string | null {
  const n = norm(text);
  if (!n) return null;
  // Split into individual words for prefix-aware matching (handles plurals)
  const words = n.split(/\s+/);

  for (const category of CATEGORIES) {
    for (const keyword of category.keywords) {
      const nk = norm(keyword);
      // Multi-word keyword (e.g. "san pedro sula"): check substring
      if (nk.includes(" ")) {
        if (n.includes(nk)) return category.slug;
        continue;
      }
      // Single word: exact match OR word starts with keyword (plural/inflection)
      // e.g. "religioso" matches "religiosos", "iglesia" matches "iglesias"
      if (words.some(w => w === nk || w.startsWith(nk))) {
        return category.slug;
      }
    }
  }
  return null;
}

// ── Region Names ───────────────────────────────────────────────────────

const REGION_NAMES: Record<string, string> = {
  comayagua:           "Comayagua",
  copan:               "Copán",
  "bay-islands":       "Islas de la Bahía",
  "francisco-morazan": "Tegucigalpa / Francisco Morazán",
  cortes:              "Cortés",
  atlantida:           "Atlántida",
  colon:               "Colón",
  olancho:             "Olancho",
  "santa-barbara":     "Santa Bárbara",
  lempira:             "Lempira",
  choluteca:           "Choluteca",
  yoro:                "Yoro",
};

// ── Follow-up Detection ─────────────────────────────────────────────────
// Detects short vague messages that continue a previous topic
// "dame una lista", "sí", "cuáles son", "muéstrame" → inherit last context

const FOLLOWUP_TRIGGERS = [
  "lista", "si", "dale", "ok", "cuales", "muestrame", "ensename",
  "dame", "dime", "adelante", "claro", "exacto", "esos", "esas",
  "esos mismos", "cuales son", "los que dijiste", "mencionaste",
];

function isFollowUp(text: string): boolean {
  const n = norm(text);
  const words = n.split(/\s+/);
  // Short message (≤6 words) with at least one follow-up trigger word
  return words.length <= 6 && FOLLOWUP_TRIGGERS.some(t => {
    const nt = norm(t);
    return words.some(w => w === nt || w.startsWith(nt));
  });
}

// ── Greeting Detection ──────────────────────────────────────────────────

const GREETING_WORDS = ["hola", "hi", "hey", "hello", "buenas", "buenos dias", "buenos", "saludos"];

function isGreeting(text: string): boolean {
  const n = norm(text);
  return GREETING_WORDS.some(g => n.startsWith(norm(g)) || n === norm(g));
}

// ── Clear Commands ──────────────────────────────────────────────────────

const CLEAR_WORDS = ["limpiar", "borrar", "reset", "clear", "quitar"];

function isClear(text: string): boolean {
  const n = norm(text);
  return CLEAR_WORDS.some(c => n.includes(norm(c)));
}

// ── Place Fetching ──────────────────────────────────────────────────────

type PlaceRow = {
  slug: string;
  name: string;
  summary: string;
  rating: number;
  category: string;
  region: string;
};

async function fetchPlaces(regionSlug: string | null, categorySlug: string | null): Promise<PlaceRow[]> {
  const db = getDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = db
    .from("places")
    .select("slug,name_i18n,ai_summary_i18n,aggregated_rating,place_categories(name_i18n,slug),regions(name_i18n,slug)")
    .eq("status", "published")
    .order("aggregated_rating", { ascending: false })
    .limit(8);

  if (regionSlug) {
    const { data: region } = await db.from("regions").select("id").eq("slug", regionSlug).single();
    if (region) {
      query = query.eq("region_id", (region as { id: string }).id);
    }
  }

  if (categorySlug) {
    const { data: cat } = await db.from("place_categories").select("id").eq("slug", categorySlug).single();
    if (cat) {
      query = query.eq("category_id", (cat as { id: string }).id);
    }
  }

  const { data } = await query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any): PlaceRow => ({
    slug: p.slug,
    name: p.name_i18n?.es ?? p.slug,
    summary: p.ai_summary_i18n?.es ?? "",
    rating: Number(p.aggregated_rating ?? 0),
    category: p.place_categories?.name_i18n?.es ?? "",
    region: p.regions?.name_i18n?.es ?? "",
  }));
}

// ── Direct place search by name ─────────────────────────────────────────
// Used when user asks for a specific place without category/region keywords.
// Searches using the most significant word (4+ chars) from the message.

async function fetchPlaceByName(msg: string): Promise<PlaceRow[]> {
  const db = getDB();
  const cleaned = norm(msg)
    .replace(/\b(muestrame|ensename|abre|ver|quiero|llevame|ir|pon|ponme|muestra|otro|otros|otra|otras|el|la|los|las|un|una|de|del|en|y|o)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const significantWords = cleaned.split(" ").filter(w => w.length >= 4);
  if (significantWords.length === 0) return [];

  // Use the longest word as main search term (most distinctive)
  const mainWord = significantWords.sort((a, b) => b.length - a.length)[0];

  const { data } = await db
    .from("places")
    .select("slug,name_i18n,ai_summary_i18n,aggregated_rating,place_categories(name_i18n,slug),regions(name_i18n,slug)")
    .eq("status", "published")
    .ilike("name_i18n->>es", `%${mainWord}%`)
    .order("aggregated_rating", { ascending: false })
    .limit(10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any): PlaceRow => ({
    slug: p.slug,
    name: p.name_i18n?.es ?? p.slug,
    summary: p.ai_summary_i18n?.es ?? "",
    rating: Number(p.aggregated_rating ?? 0),
    category: p.place_categories?.name_i18n?.es ?? "",
    region: p.regions?.name_i18n?.es ?? "",
  }));
}

// ── Named place detection ───────────────────────────────────────────────
// Checks if the user mentioned a specific place name from the result list.
// Words with 4+ chars are compared; if most match, treat it as named-place request.

function wordIn(word: string, text: string): boolean {
  return (
    text === word ||
    text.startsWith(word + " ") ||
    text.includes(" " + word + " ") ||
    text.endsWith(" " + word)
  );
}

function findNamedPlace(msg: string, places: PlaceRow[]): PlaceRow | null {
  const n = norm(msg)
    .replace(/^(muestrame|ensename|abre|ver|quiero ver|llevame a|ir a|pon|ponme|muestra)\s+/i, "")
    .replace(/\b(el|la|los|las|un|una|de|del|en)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const place of places) {
    const nameNorm = norm(place.name)
      .replace(/\b(el|la|los|las|de|del)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Only consider words 4+ chars (skip generic short words)
    const words = nameNorm.split(" ").filter(w => w.length >= 4);
    if (words.length === 0) continue;

    // Require whole-word match (not substring) to avoid "restaurantes" → "restaurante"
    const matches = words.filter(w => wordIn(w, n)).length;

    // Need majority of the specific name words to match
    if (matches >= Math.max(1, words.length - 1)) {
      return place;
    }
  }
  return null;
}

// ── Main Handler ────────────────────────────────────────────────────────

// ── Logging interaction events ──────────────────────────────────────────────

async function logInteraction(
  intent: string,
  entities: Record<string, unknown>,
  placesShown: string[] = [],
  selectedPlace: string | null = null
) {
  try {
    const db = getDB();
    const deviceId = (globalThis as any).currentDeviceId;

    await db.from("interaction_events").insert({
      event_id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      device_id: deviceId,
      intent,
      entities,
      place_ids_shown: placesShown,
      selected_place_id: selectedPlace,
    });
  } catch (err) {
    console.error("[Chat Logging Error]", err);
    // Don't throw; logging failure shouldn't break chat
  }
}

export async function POST(req: Request) {
  const { messages, context, deviceId } = await req.json() as {
    messages: { role: string; content: string }[];
    context?: { page?: string; [key: string]: unknown };
    deviceId?: string;
  };

  // ia-center = no map. All other pages (explore, places, stories) = map mode.
  const isMapMode = context?.page !== "ia-center";

  // ── Sistema dedicado para el Centro IA ────────────────────────────────────
  // Usado en TODOS los llamados LLM cuando !isMapMode.
  const IA_CENTER_SYSTEM = `Eres Itinera IA, guía cultural experta de Honduras.

CONTEXTO: Estás en el Centro IA de Itinera — una interfaz de chat dedicada, sin mapa.
Tu misión es ser un compañero cultural conversacional: informativo, apasionado por Honduras y sus historias.

CÓMO RESPONDES:
- Respuestas ricas pero enfocadas (2-3 párrafos por defecto, más solo si el tema lo exige)
- Incluye contexto histórico, cultural y geográfico real y verificado
- Cuando menciones destinos, invita a explorar: "puedes ver más en /explore"
- NUNCA digas "te muestro en el mapa", "filtré el mapa" ni "aparece en el mapa"

REGLA CRÍTICA — ANTI-ALUCINACIÓN:
- NUNCA inventes nombres específicos de restaurantes, hoteles, negocios o establecimientos
- NUNCA inventes nombres de personas, fechas exactas ni datos estadísticos que no sean de conocimiento general verificado
- Si el usuario pide restaurantes u otros negocios específicos y NO tienes datos reales de la base de datos de Itinera, dilo claramente:
  "No tengo información de restaurantes verificados en nuestra base de datos para esta zona aún. Te recomiendo explorar en /explore donde encontrarás lugares con reseñas reales, o buscar en plataformas como Google Maps para negocios locales actualizados."
- Solo menciona nombres específicos de lugares si provienen de los datos reales que te proporciona el sistema

TEMAS EN LOS QUE DESTACAS:
- Historia: civilización maya, época colonial, independencia, personajes ilustres de Honduras
- Destinos: descripción vívida, qué ver, gastronomía típica (en general), cuándo ir
- Cultura: tradiciones, artesanías, música, festivales, leyendas
- Planificación: itinerarios por días, combinaciones de destinos, consejos prácticos
- Curiosidades: datos únicos, récords, mitos y leyendas de Honduras

TONO: Como un guía local experto — apasionado, preciso y honesto cuando no tiene datos.`;

  // Store device ID for logging (thread-local alternative to params)
  (globalThis as any).currentDeviceId = deviceId;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function emit(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const lastMsg = (messages.filter(m => m.role === "user").pop()?.content ?? "").trim();

        if (!lastMsg) {
          emit({ type: "text-delta", textDelta: "¿En qué te puedo ayudar?" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── 1. Greeting ────────────────────────────────────────────────────

        if (isGreeting(lastMsg)) {
          const result = await generateText({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            model: (getGroq() as any)("llama-3.3-70b-versatile"),
            system: isMapMode
              ? "Eres Itinera IA. El usuario saludó. Responde con UN saludo breve (máximo 1 frase) y pregunta qué quiere explorar. NUNCA listes lugares."
              : `${IA_CENTER_SYSTEM}\n\nEl usuario saludó. Dale una bienvenida cálida al Centro IA de Itinera (máximo 2 frases). Menciona brevemente que puedes hablar de historia, destinos, cultura, itinerarios y curiosidades de Honduras. Invítalo a preguntar lo que quiera.`,
            messages: [{ role: "user", content: lastMsg }],
            temperature: 0.9,
          });

          emit({ type: "text-delta", textDelta: result.text });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── 2. Clear command ───────────────────────────────────────────────

        if (isClear(lastMsg)) {
          emit({ type: "text-delta", textDelta: isMapMode ? "Listo, limpié los filtros." : "Listo, cuéntame qué quieres explorar." });
          if (isMapMode) emit({ type: "ui-actions", intent: "clear", actions: [{ type: "clear" }], entities: {} });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── 3. Detect region and category ──────────────────────────────────
        // Also scan recent history so "adjunta restaurants" after "Comayagua" works

        let region = detectRegion(lastMsg);
        let category = detectCategory(lastMsg);

        // ── 3a. Follow-up inheritance ──────────────────────────────────────
        // "Dame una lista", "sí", "cuáles son" → inherit last known region+category
        // from the full conversation history (user + assistant messages)
        if (isFollowUp(lastMsg) && !region && !category) {
          const allRecent = [...messages].reverse().slice(0, 10); // last 10 msgs, newest first
          for (const m of allRecent) {
            if (!region)   region   = detectRegion(m.content);
            if (!category) category = detectCategory(m.content);
            if (region && category) break;
          }
        }

        // If no region in current message, look in recent user messages first
        let contextRegion = region;
        if (!contextRegion) {
          for (const m of messages.filter(m => m.role === "user").slice(-6)) {
            const r = detectRegion(m.content);
            if (r) { contextRegion = r; break; }
          }
        }
        // Still no region? Scan last 2 assistant messages (e.g. AI said "Atlántida" and user replies "y para comer ahí?")
        if (!contextRegion) {
          for (const m of messages.filter(m => m.role === "assistant").slice(-2)) {
            const r = detectRegion(m.content);
            if (r) { contextRegion = r; break; }
          }
        }

        // ── 4. Region only (no category in current message) ───────────────
        // Before asking for a category, check if there's one already in history.
        // This allows: "Un restaurante" → "Comayagua" → auto-search restaurants in Comayagua

        if (region && !category) {
          // Look for recent category in conversation history
          let historyCategory: string | null = null;
          for (const msg of messages.filter(m => m.role === "user").slice(-5, -1)) {
            const c = detectCategory(msg.content);
            if (c) {
              historyCategory = c;
              break;
            }
          }

          // If user had a category in mind, search directly with region + that category
          if (historyCategory) {
            const places = await fetchPlaces(region, historyCategory);

            // Log the search
            await logInteraction("search_region_category", {
              region,
              category: historyCategory,
              resultCount: places.length,
            }, places.map(p => p.slug));

            // Apply both region and category filters on the map (map mode only)
            if (isMapMode) {
              emit({ type: "ui-actions", intent: "filter_region", actions: [{ type: "filter_region", slug: region }], entities: { region } });
              emit({ type: "ui-actions", intent: "filter_category", actions: [{ type: "filter_category", slug: historyCategory }], entities: { category: historyCategory } });
            }

            if (places.length === 0) {
              emit({ type: "text-delta", textDelta: `No encontré lugares de ese tipo en ${REGION_NAMES[region] || region}.` });
            } else if (places.length === 1) {
              const place = places[0];
              emit({ type: "text-delta", textDelta: `${place.name} — ${place.summary || "Atracción turística"} ⭐${place.rating}` });
              emit({
                type: "tool-result",
                toolName: "search_places",
                result: { places: [{ slug: place.slug, name: place.name, rating: place.rating, url: `/places/${place.slug}` }] },
              });
              if (isMapMode) emit({ type: "ui-actions", intent: "show_place", actions: [{ type: "show_place", slug: place.slug }], entities: {} });
              // Log selection
              await logInteraction("select_place", { region, category: historyCategory, place: place.slug }, [], place.slug);
            } else {
              const llmResult = await generateText({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                model: (getGroq() as any)("llama-3.3-70b-versatile"),
                system: isMapMode
                  ? `Eres Itinera IA, guía de Honduras. Describe brevemente estos lugares al usuario. Máximo 3 frases. Solo info real. Responde en español.\n\n${places.map(p => `• ${p.name} — ${p.summary || "Atracción"} | ⭐${p.rating}`).join("\n")}`
                  : `${IA_CENTER_SYSTEM}\n\nLugares encontrados en la base de datos:\n${places.map(p => `• ${p.name} (${p.category}${p.region ? ", " + p.region : ""}) — ${p.summary || "Atracción turística"} | ⭐${p.rating}`).join("\n")}\n\nIMPORTANTE: Las tarjetas de estos lugares se mostrarán automáticamente al usuario. Tu respuesta debe ser MUY BREVE — máximo 1-2 frases — como introducción antes de las tarjetas. Ejemplo: "Aquí tienes algunas opciones en Comayagua:" o "Encontré estos lugares que podrían interesarte:". NO repitas la información de las tarjetas. Responde en español.`,
                messages: [{ role: "user", content: lastMsg }],
                temperature: 0.4,
              });
              emit({ type: "text-delta", textDelta: llmResult.text });
              emit({
                type: "tool-result",
                toolName: "search_places",
                result: { places: places.map(p => ({ slug: p.slug, name: p.name, rating: p.rating, url: `/places/${p.slug}` })) },
              });
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          // No category in history either
          const regionName = REGION_NAMES[region] || region;
          await logInteraction("search_region_only", { region });

          if (isMapMode) {
            emit({ type: "text-delta", textDelta: `${regionName} te espera en el mapa. ¿Qué tipo de experiencia buscas?` });
            emit({ type: "ui-actions", intent: "filter_region", actions: [{ type: "filter_region", slug: region }], entities: { region } });
            emit({ type: "suggestions", suggestions: [
              { label: "Restaurantes", value: "restaurantes" },
              { label: "Iglesias",     value: "iglesias" },
              { label: "Naturaleza",   value: "naturaleza" },
              { label: "Playas",       value: "playas" },
              { label: "Patrimonio",   value: "patrimonio" },
              { label: "Aventura",     value: "aventura" },
              { label: "Arte",         value: "museos" },
            ]});
          } else {
            // Centro IA — overview enganchador, NO todo de golpe
            const regionResult = await generateText({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              model: (getGroq() as any)("llama-3.3-70b-versatile"),
              system: `${IA_CENTER_SYSTEM}

El usuario mencionó ${regionName}. Da un overview cultural atractivo de 2 a 3 párrafos máximo.
IMPORTANTE: NO cubras todo (historia + gastronomía + clima + cómo llegar) en esta primera respuesta.
Presenta la esencia y el encanto de la región de forma que el usuario quiera saber más.
Menciona 1-2 elementos icónicos. El resto lo explorarán con los botones de sugerencia.
Termina con una frase breve invitando a explorar un tema específico.`,
              messages: [{ role: "user", content: lastMsg }],
              temperature: 0.6,
            });
            emit({ type: "text-delta", textDelta: regionResult.text });
            emit({ type: "suggestions", suggestions: [
              { label: `Historia de ${regionName}`,      value: `Cuéntame la historia de ${regionName}` },
              { label: "¿Cuándo visitar?",               value: `¿Cuál es el mejor momento para visitar ${regionName}?` },
              { label: "Gastronomía típica",             value: `¿Qué platos típicos tiene ${regionName}?` },
              { label: "Itinerario de 2 días",           value: `Arma un itinerario de 2 días en ${regionName}` },
            ]});
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── 5. Category present → search places ─────────────────────────────

        if (category) {
          // Look for region in history if not in current message
          // Use contextRegion (already includes history scan done above)
          let searchRegion = contextRegion;

          const places = await fetchPlaces(searchRegion, category);

          // Log the search
          await logInteraction("search_category", {
            region: searchRegion,
            category,
            resultCount: places.length,
          }, places.map(p => p.slug));

          // ── Apply map filters (map mode only) ─────────────────────────────
          if (isMapMode) {
            if (searchRegion) {
              emit({ type: "ui-actions", intent: "filter_region", actions: [{ type: "filter_region", slug: searchRegion }], entities: { region: searchRegion } });
            }
            emit({ type: "ui-actions", intent: "filter_category", actions: [{ type: "filter_category", slug: category }], entities: { category } });
          }

          // ── Zero results → LLM cultural response + honest DB note ────────
          if (places.length === 0) {
            const regionName = searchRegion ? (REGION_NAMES[searchRegion] || searchRegion) : "Honduras";
            const zeroResult = await generateText({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              model: (getGroq() as any)("llama-3.3-70b-versatile"),
              system: isMapMode
                ? `Eres Itinera IA. No encontraste lugares de esa categoría en la DB para ${regionName}. Informa brevemente (1 frase) que no tienes datos registrados de eso aún y sugiere explorar en /explore o preguntar por otra cosa. No inventes nombres.`
                : `${IA_CENTER_SYSTEM}

No encontraste lugares registrados de esa categoría en la base de datos para ${regionName}.
Responde honestamente en 2-3 frases: menciona que la gastronomía / categoría solicitada no está completamente registrada en Itinera aún, ofrece contexto cultural general real si lo sabes (platos típicos de la zona, mercados conocidos, etc.) y sugiere buscar en /explore o en Google Maps para negocios actualizados. Nunca inventes nombres de restaurantes o negocios.`,
              messages: [{ role: "user", content: lastMsg }],
              temperature: 0.5,
            });
            emit({ type: "text-delta", textDelta: zeroResult.text });
            emit({ type: "suggestions", suggestions: [
              { label: "¿Qué comer en Honduras?",      value: "¿Cuáles son los platos típicos de Honduras?" },
              { label: "Explorar la zona",              value: `¿Qué más hay para ver en ${regionName}?` },
              { label: "Planificar itinerario",         value: `Arma un itinerario de 2 días en ${regionName}` },
            ]});
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          // ── Single result → deterministically open the card ───────────────
          if (places.length === 1) {
            const place = places[0];
            emit({ type: "text-delta", textDelta: `${place.name} — ${place.summary || "Atracción turística"} ⭐${place.rating}` });
            emit({
              type: "tool-result",
              toolName: "search_places",
              result: { places: [{ slug: place.slug, name: place.name, rating: place.rating, url: `/places/${place.slug}` }] },
            });
            if (isMapMode) emit({ type: "ui-actions", intent: "show_place", actions: [{ type: "show_place", slug: place.slug }], entities: {} });
            // Log selection
            await logInteraction("select_place", { region: searchRegion, category, place: place.slug }, [], place.slug);
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          // ── Multiple results: check if user named a specific place ────────
          const namedPlace = findNamedPlace(lastMsg, places);

          if (namedPlace) {
            emit({ type: "text-delta", textDelta: `${namedPlace.name} — ${namedPlace.summary || "Atracción turística"} ⭐${namedPlace.rating}` });
            emit({
              type: "tool-result",
              toolName: "search_places",
              result: { places: [{ slug: namedPlace.slug, name: namedPlace.name, rating: namedPlace.rating, url: `/places/${namedPlace.slug}` }] },
            });
            if (isMapMode) emit({ type: "ui-actions", intent: "show_place", actions: [{ type: "show_place", slug: namedPlace.slug }], entities: {} });
            // Log selection from multiple results
            await logInteraction("select_place", { region: searchRegion, category, place: namedPlace.slug }, [], namedPlace.slug);
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          // ── Multiple results, no specific name → LLM describes, list all ──
          const placesText = places
            .map(p => `• ${p.name} (slug:${p.slug}) — ${p.summary || "Atracción turística"} | ⭐${p.rating}`)
            .join("\n");

          const context = [searchRegion, category].filter(Boolean).join(" + ") || "Honduras";

          const llmResult = await generateText({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            model: (getGroq() as any)("llama-3.3-70b-versatile"),
            system: isMapMode
              ? `Eres Itinera IA, guía de Honduras.\n\nLugares encontrados (${context}):\n${placesText}\n\nDescribe brevemente estos lugares al usuario. Máximo 3 frases. Solo información real. Responde en español. No inventes.`
              : `${IA_CENTER_SYSTEM}\n\nContexto: ${context}\nLugares en DB:\n${placesText}\n\nIMPORTANTE: Las tarjetas se mostrarán automáticamente. Escribe SOLO 1-2 frases de introducción antes de las tarjetas. No repitas la información de cada lugar. Responde en español.`,
            messages: messages as { role: "user" | "assistant"; content: string }[],
            temperature: isMapMode ? 0.3 : 0.5,
          });

          emit({ type: "text-delta", textDelta: llmResult.text });
          emit({
            type: "tool-result",
            toolName: "search_places",
            result: {
              places: places.map(p => ({
                slug: p.slug,
                name: p.name,
                rating: p.rating,
                url: `/places/${p.slug}`,
              })),
            },
          });
          // Show all places on map (map mode only)
          if (isMapMode) emit({ type: "ui-actions", intent: "show_places_list", actions: [{ type: "show_places", slugs: places.map(p => p.slug) }], entities: {} });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── 5b. Category detected but no region yet — use contextRegion ────────
        // Handles: "adjunta restaurants" after "Comayagua" was mentioned earlier

        // ── 6. Direct place-name search (no category/region detected) ─────────
        // Handles "Muestrame La Atoniana Gastro Pub", "el otro El Torito", etc.
        // Uses navigation-intent words as signal, then searches DB by name.

        const NAV_WORDS = ["muestrame", "ensename", "muestra", "abre", "quiero", "ver", "otro", "otra"];
        const hasNavIntent = NAV_WORDS.some(w => wordIn(w, norm(lastMsg)));

        if (hasNavIntent) {
          const candidates = await fetchPlaceByName(lastMsg);
          if (candidates.length > 0) {
            const match = findNamedPlace(lastMsg, candidates) ?? candidates[0];
            emit({ type: "text-delta", textDelta: `${match.name} — ${match.summary || "Atracción turística"} ⭐${match.rating}` });
            emit({
              type: "tool-result",
              toolName: "search_places",
              result: { places: [{ slug: match.slug, name: match.name, rating: match.rating, url: `/places/${match.slug}` }] },
            });
            if (isMapMode) emit({ type: "ui-actions", intent: "show_place", actions: [{ type: "show_place", slug: match.slug }], entities: {} });
            // Log direct place search
            await logInteraction("search_place_by_name", { place: match.slug }, [], match.slug);
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }
        }

        // ── 7. Semantic search (pgvector) ──────────────────────────────────
        // Fallback before generic LLM: embed the user query and find semantically
        // similar places. Only runs when OPENAI_API_KEY is set.

        const semanticPlaces = await semanticSearch(lastMsg);

        if (semanticPlaces.length > 0) {
          await logInteraction("semantic_search", { query: lastMsg, resultCount: semanticPlaces.length }, semanticPlaces.map(p => p.slug));

          if (semanticPlaces.length === 1) {
            const p = semanticPlaces[0];
            emit({ type: "text-delta", textDelta: `${p.name_es} — ${p.summary_es || p.category_es} ⭐${Number(p.aggregated_rating ?? 0).toFixed(1)}` });
            emit({ type: "tool-result", toolName: "search_places", result: { places: [{ slug: p.slug, name: p.name_es, url: `/places/${p.slug}` }] } });
            if (isMapMode) emit({ type: "ui-actions", intent: "show_place", actions: [{ type: "show_place", slug: p.slug }], entities: {} });
          } else {
            const placesText = semanticPlaces.map(p =>
              `• ${p.name_es} (${p.category_es}${p.region_es ? ", " + p.region_es : ""}) — ${p.summary_es || ""} | ⭐${Number(p.aggregated_rating ?? 0).toFixed(1)}`
            ).join("\n");

            const semanticResult = await generateText({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              model: (getGroq() as any)("llama-3.3-70b-versatile"),
              system: isMapMode
                ? `Eres Itinera IA, guía de Honduras. El usuario buscó en lenguaje natural y encontramos estos lugares relevantes:\n\n${placesText}\n\nDescribe brevemente estos lugares. Máximo 3 frases. Solo información real. Responde en español.`
                : `${IA_CENTER_SYSTEM}\n\nBúsqueda: "${lastMsg}"\nLugares encontrados:\n${placesText}\n\nIMPORTANTE: Las tarjetas se mostrarán automáticamente. Escribe SOLO 1-2 frases conectando la búsqueda del usuario con los resultados. No describas cada lugar en detalle. Responde en español.`,
              messages: [{ role: "user", content: lastMsg }],
              temperature: 0.4,
            });

            emit({ type: "text-delta", textDelta: semanticResult.text });
            emit({ type: "tool-result", toolName: "search_places", result: { places: semanticPlaces.map(p => ({ slug: p.slug, name: p.name_es, url: `/places/${p.slug}` })) } });
            // Show all semantic places on map (map mode only)
            if (isMapMode) emit({ type: "ui-actions", intent: "show_semantic_places", actions: [{ type: "show_places", slugs: semanticPlaces.map(p => p.slug) }], entities: {} });
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── 8. Default: use LLM to guide ───────────────────────────────────

        const defaultResult = await generateText({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          model: (getGroq() as any)("llama-3.3-70b-versatile"),
          system: isMapMode
            ? "Eres Itinera IA de Honduras. El usuario hizo una pregunta. Responde de forma breve, amigable. Pregunta qué región o tipo de lugar busca. NUNCA inventes lugares."
            : `${IA_CENTER_SYSTEM}\n\nEl usuario hizo una pregunta o comentario libre. Responde de forma conversacional en 2-3 párrafos — suficiente para ser útil e interesante, sin volcar todo lo que sabes de una vez. Si hay más que explorar, termina con una pregunta o invitación breve para seguir la conversación.`,
          messages: [{ role: "user", content: lastMsg }],
          temperature: 0.7,
        });

        emit({ type: "text-delta", textDelta: defaultResult.text });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Error desconocido";
        console.error("[API Chat Error]", msg);
        emit({ type: "text-delta", textDelta: "Error temporal. Intenta de nuevo." });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Connection: "keep-alive",
    },
  });
}

export async function GET() {
  return Response.json({ status: "ok", version: "v1-fresh-2026-05-15" });
}
