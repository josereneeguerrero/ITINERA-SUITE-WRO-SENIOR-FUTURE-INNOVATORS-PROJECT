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

async function semanticSearch(query: string): Promise<SemanticPlace[]> {
  try {
    // Hybrid search: combines semantic + full-text + metadata scoring
    // Uses Supabase AI gte-small embeddings (384 dimensions) stored in semantic_documents
    // Gracefully falls back to full-text search if no embeddings available
    const db = getDB();

    // Call the hybrid RPC: combines semantic similarity + full-text search + metadata
    // p_query: text search (matches against title + content via tsvector)
    // p_query_embedding: can be null, RPC handles text-only search
    // Scoring: 70% semantic + 90% text_rank + title match bonus + rating boost
    const { data, error } = await db.rpc("search_semantic_documents", {
      p_query: query,
      p_query_embedding: null, // RPC handles text-only fallback
      p_entity_types: ["place"],
      p_region_slug: null,
      p_category_slug: null,
      p_locale: "es",
      p_match_count: 5,
      p_match_threshold: 0.18,
    });

    if (error || !data) return [];

    // Map semantic_documents RPC result to SemanticPlace interface
    return (data as SemanticDocumentResult[]).map(doc => ({
      slug: doc.slug,
      name_es: doc.title,
      summary_es: doc.summary || "",
      category_es: doc.category_name || "",
      region_es: doc.region_name || "",
      aggregated_rating: doc.rating || 0,
      // combined_score from RPC: title match (2.0) + semantic (0.7) + text rank (0.9) + rating (0.15)
      // Normalize to 0-1 range for display
      similarity: Math.max(0, Math.min(1, (doc.combined_score || 0) / 4.75)),
    }));
  } catch {
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
  { slug: "comayagua", keywords: ["comayagua"] },
  { slug: "copan", keywords: ["copan", "copán", "ruinas"] },
  { slug: "bay-islands", keywords: ["roatan", "islas de la bahia", "bahia", "islas"] },
  { slug: "tegucigalpa", keywords: ["tegucigalpa", "tegus", "francisco morazan", "morazan", "capital"] },
  { slug: "cortes", keywords: ["cortes", "san pedro sula", "sps"] },
  { slug: "la-ceiba", keywords: ["la ceiba", "ceiba"] },
];

function detectRegion(text: string): string | null {
  const n = norm(text);
  if (!n) return null;

  for (const region of REGIONS) {
    for (const keyword of region.keywords) {
      const nk = norm(keyword);
      // Can be more lenient for regions (multi-word like "islas de la bahia")
      // Accept full match or as a word in the text
      const hasRegion =
        n === nk ||
        n.startsWith(nk + " ") ||
        n.includes(" " + nk + " ") ||
        n.endsWith(" " + nk) ||
        (nk.includes(" ") && n.includes(nk)); // Multi-word regions like "islas de la bahia"

      if (hasRegion) {
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
  { slug: "food",      keywords: ["comida", "restaurant", "restaurante", "restaurantes", "gastronomia", "tipico", "comer", "cocina"] },
  { slug: "adventure", keywords: ["aventura", "aventuras", "senderismo", "escalada", "adrenalina", "extremo", "outdoor"] },
  { slug: "arts",      keywords: ["museo", "museos", "galeria", "galerias", "arte", "artes", "cultura", "artesania"] },
];

function detectCategory(text: string): string | null {
  const n = norm(text);
  if (!n) return null;

  for (const category of CATEGORIES) {
    for (const keyword of category.keywords) {
      const nk = norm(keyword);
      // Word-boundary check: keyword must be a whole word in the text
      const hasWord =
        n === nk ||
        n.startsWith(nk + " ") ||
        n.includes(" " + nk + " ") ||
        n.endsWith(" " + nk);

      if (hasWord) {
        return category.slug;
      }
    }
  }
  return null;
}

// ── Region Names ───────────────────────────────────────────────────────

const REGION_NAMES: Record<string, string> = {
  comayagua: "Comayagua",
  copan: "Copán",
  "bay-islands": "Islas de la Bahía",
  tegucigalpa: "Tegucigalpa",
  cortes: "Cortés",
  "la-ceiba": "La Ceiba",
};

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
  const { messages, deviceId } = await req.json() as { messages: { role: string; content: string }[]; deviceId?: string };

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
            system: "Eres Itinera IA. El usuario saludó. Responde con UN saludo breve (máximo 1 frase) y pregunta qué quiere explorar. NUNCA listes lugares.",
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
          emit({ type: "text-delta", textDelta: "Listo, limpié los filtros." });
          emit({ type: "ui-actions", intent: "clear", actions: [{ type: "clear" }], entities: {} });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── 3. Detect region and category ──────────────────────────────────

        const region = detectRegion(lastMsg);
        const category = detectCategory(lastMsg);

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

            // Apply both region and category filters on the map
            emit({ type: "ui-actions", intent: "filter_region", actions: [{ type: "filter_region", slug: region }], entities: { region } });
            emit({ type: "ui-actions", intent: "filter_category", actions: [{ type: "filter_category", slug: historyCategory }], entities: { category: historyCategory } });

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
              emit({ type: "ui-actions", intent: "show_place", actions: [{ type: "show_place", slug: place.slug }], entities: {} });
              // Log selection
              await logInteraction("select_place", { region, category: historyCategory, place: place.slug }, [], place.slug);
            } else {
              const llmResult = await generateText({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                model: (getGroq() as any)("llama-3.3-70b-versatile"),
                system: `Eres Itinera IA, guía de Honduras. Describe brevemente estos lugares al usuario. Máximo 3 frases. Solo info real. Responde en español.\n\n${places.map(p => `• ${p.name} — ${p.summary || "Atracción"} | ⭐${p.rating}`).join("\n")}`,
                messages: [{ role: "user", content: lastMsg }],
                temperature: 0.3,
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

          // No category in history either — orient the user and ask
          const regionName = REGION_NAMES[region] || region;
          const text = `${regionName} te espera en el mapa. ¿Qué tipo de experiencia buscas?`;

          // Log region-only search (awaiting category)
          await logInteraction("search_region_only", { region });

          emit({ type: "text-delta", textDelta: text });
          emit({
            type: "ui-actions",
            intent: "filter_region",
            actions: [{ type: "filter_region", slug: region }],
            entities: { region },
          });
          emit({
            type: "suggestions",
            suggestions: [
              { label: "Restaurantes", value: "restaurantes" },
              { label: "Iglesias",     value: "iglesias" },
              { label: "Naturaleza",   value: "naturaleza" },
              { label: "Playas",       value: "playas" },
              { label: "Patrimonio",   value: "patrimonio" },
              { label: "Aventura",     value: "aventura" },
              { label: "Arte",         value: "museos" },
            ],
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── 5. Category present → search places ─────────────────────────────

        if (category) {
          // Look for region in history if not in current message
          let searchRegion = region;
          if (!searchRegion) {
            for (const msg of messages.filter(m => m.role === "user").slice(-5, -1)) {
              const r = detectRegion(msg.content);
              if (r) {
                searchRegion = r;
                break;
              }
            }
          }

          const places = await fetchPlaces(searchRegion, category);

          // Log the search
          await logInteraction("search_category", {
            region: searchRegion,
            category,
            resultCount: places.length,
          }, places.map(p => p.slug));

          // ── Always apply map filters for region + category ─────────────────
          if (searchRegion) {
            emit({ type: "ui-actions", intent: "filter_region", actions: [{ type: "filter_region", slug: searchRegion }], entities: { region: searchRegion } });
          }
          emit({ type: "ui-actions", intent: "filter_category", actions: [{ type: "filter_category", slug: category }], entities: { category } });

          // ── Zero results ──────────────────────────────────────────────────
          if (places.length === 0) {
            emit({ type: "text-delta", textDelta: "No encontré lugares registrados para esa búsqueda en Honduras." });
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
            emit({ type: "ui-actions", intent: "show_place", actions: [{ type: "show_place", slug: place.slug }], entities: {} });
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
            emit({ type: "ui-actions", intent: "show_place", actions: [{ type: "show_place", slug: namedPlace.slug }], entities: {} });
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
            system: `Eres Itinera IA, guía de Honduras.

Lugares encontrados (${context}):
${placesText}

Describe brevemente estos lugares al usuario. Máximo 3 frases. Solo información real. Responde en español. No inventes.`,
            messages: messages as { role: "user" | "assistant"; content: string }[],
            temperature: 0.3,
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

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

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
            emit({ type: "ui-actions", intent: "show_place", actions: [{ type: "show_place", slug: match.slug }], entities: {} });
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
            emit({ type: "ui-actions", intent: "show_place", actions: [{ type: "show_place", slug: p.slug }], entities: {} });
          } else {
            const placesText = semanticPlaces.map(p =>
              `• ${p.name_es} (${p.category_es}${p.region_es ? ", " + p.region_es : ""}) — ${p.summary_es || ""} | ⭐${Number(p.aggregated_rating ?? 0).toFixed(1)}`
            ).join("\n");

            const semanticResult = await generateText({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              model: (getGroq() as any)("llama-3.3-70b-versatile"),
              system: `Eres Itinera IA, guía de Honduras. El usuario buscó en lenguaje natural y encontramos estos lugares relevantes:\n\n${placesText}\n\nDescribe brevemente estos lugares. Máximo 3 frases. Solo información real. Responde en español.`,
              messages: [{ role: "user", content: lastMsg }],
              temperature: 0.3,
            });

            emit({ type: "text-delta", textDelta: semanticResult.text });
            emit({ type: "tool-result", toolName: "search_places", result: { places: semanticPlaces.map(p => ({ slug: p.slug, name: p.name_es, url: `/places/${p.slug}` })) } });
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── 8. Default: use LLM to guide ───────────────────────────────────

        const defaultResult = await generateText({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          model: (getGroq() as any)("llama-3.3-70b-versatile"),
          system: "Eres Itinera IA de Honduras. El usuario hizo una pregunta. Responde de forma breve, amigable. Pregunta qué región o tipo de lugar busca. NUNCA inventes lugares.",
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
