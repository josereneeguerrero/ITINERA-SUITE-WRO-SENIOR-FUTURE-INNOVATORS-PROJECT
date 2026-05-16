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

// ── Main Handler ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { messages } = await req.json() as { messages: { role: string; content: string }[] };

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
            // Fall through to PATH 5 with this region + historyCategory
            // We do this by setting category to historyCategory and falling through
            const places = await fetchPlaces(region, historyCategory);

            emit({
              type: "ui-actions",
              intent: "filter_region",
              actions: [{ type: "filter_region", slug: region }],
              entities: { region },
            });

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
          const text = `${regionName} te espera en el mapa. ¿Qué tipo de experiencia buscas — playas, naturaleza, patrimonio, religioso, gastronomía, aventura o arte?`;

          emit({ type: "text-delta", textDelta: text });
          emit({
            type: "ui-actions",
            intent: "filter_region",
            actions: [{ type: "filter_region", slug: region }],
            entities: { region },
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
            const text = `${place.name} — ${place.summary || "Atracción turística"} ⭐${place.rating}`;
            emit({ type: "text-delta", textDelta: text });
            emit({
              type: "tool-result",
              toolName: "search_places",
              result: {
                places: [{ slug: place.slug, name: place.name, rating: place.rating, url: `/places/${place.slug}` }],
              },
            });
            emit({
              type: "ui-actions",
              intent: "show_place",
              actions: [{ type: "show_place", slug: place.slug }],
              entities: {},
            });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          // ── Multiple results → LLM describes, list shown ──────────────────
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

        // ── 6. Default: use LLM to guide ───────────────────────────────────

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
