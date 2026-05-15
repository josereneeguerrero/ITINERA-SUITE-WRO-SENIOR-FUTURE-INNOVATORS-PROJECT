import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGroq() { return createGroq({ apiKey: process.env.GROQ_API_KEY! }); }
function getDB()   { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }

// ─── Region detection — deterministic, no LLM ────────────────────────────────

const REGIONS: Array<{ slug: string; keywords: string[] }> = [
  { slug: "comayagua",         keywords: ["comayagua"] },
  { slug: "copan",             keywords: ["copan", "copán", "copan ruinas", "ruinas de copan"] },
  { slug: "bay-islands",       keywords: ["roatan", "roatán", "utila", "guanaja", "islas de la bahia", "bay islands", "islas bahia"] },
  { slug: "tegucigalpa",       keywords: ["tegucigalpa", "tegus", "francisco morazan", "morazan", "distrito central"] },
  { slug: "cortes",            keywords: ["cortes", "cortés", "san pedro sula", "sps"] },
  { slug: "la-ceiba",          keywords: ["la ceiba", "ceiba"] },
  { slug: "olancho",           keywords: ["olancho", "juticalpa"] },
  { slug: "santa-barbara",     keywords: ["santa barbara", "santa bárbara"] },
  { slug: "choluteca",         keywords: ["choluteca"] },
  { slug: "lempira",           keywords: ["lempira", "gracias"] },
  { slug: "intibuca",          keywords: ["intibuca", "intibucá", "la esperanza"] },
  { slug: "ocotepeque",        keywords: ["ocotepeque"] },
  { slug: "yoro",              keywords: ["yoro"] },
  { slug: "el-paraiso",        keywords: ["el paraiso", "el paraíso", "danli", "danlí"] },
  { slug: "colon",             keywords: ["colon", "colón", "trujillo"] },
  { slug: "atlantida",         keywords: ["atlantida", "atlántida", "la ceiba", "tela"] },
];

function norm(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function detectRegion(text: string): string | null {
  const n = norm(text);
  for (const r of REGIONS) {
    if (r.keywords.some(k => n.includes(norm(k)))) return r.slug;
  }
  return null;
}

// ─── Fetch real places before calling LLM ────────────────────────────────────

type PlaceRow = {
  slug: string;
  name: string;
  summary: string;
  rating: number;
  category: string;
  region: string;
  regionSlug: string;
};

async function fetchPlaces(regionSlug: string | null, categorySlug: string | null = null): Promise<PlaceRow[]> {
  const db = getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = db
    .from("places")
    .select("slug,name_i18n,ai_summary_i18n,aggregated_rating,place_categories(name_i18n,slug),regions(name_i18n,slug)")
    .eq("status", "published")
    .order("aggregated_rating", { ascending: false })
    .limit(8);

  if (regionSlug) {
    const { data: region } = await db.from("regions").select("id").eq("slug", regionSlug).single();
    if (region) q = q.eq("region_id", (region as { id: string }).id);
  }

  if (categorySlug) {
    const { data: cat } = await db.from("place_categories").select("id").eq("slug", categorySlug).single();
    if (cat) q = q.eq("category_id", (cat as { id: string }).id);
  }

  const { data } = await q;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any): PlaceRow => ({
    slug:       p.slug,
    name:       p.name_i18n?.es ?? p.slug,
    summary:    p.ai_summary_i18n?.es ?? "",
    rating:     Number(p.aggregated_rating ?? 0),
    category:   p.place_categories?.name_i18n?.es ?? "",
    region:     p.regions?.name_i18n?.es ?? "",
    regionSlug: p.regions?.slug ?? "",
  }));
}

// ─── Category detection — deterministic ──────────────────────────────────────

const CATEGORIES: Array<{ slug: string; keywords: string[] }> = [
  { slug: "beach",    keywords: ["playa", "playas", "mar", "caribe", "buceo", "snorkel", "arrecife", "costa", "beach"] },
  { slug: "nature",   keywords: ["naturaleza", "parque nacional", "bosque", "sendero", "fauna", "flora", "reserva", "nature"] },
  { slug: "heritage", keywords: ["patrimonio", "ruinas", "arqueologia", "arqueológico", "maya", "colonial", "historico", "historia"] },
  { slug: "religion", keywords: ["iglesia", "catedral", "religioso", "templo", "basilica", "capilla", "santo", "virgen"] },
  { slug: "food",     keywords: ["comida", "gastronomia", "restaurante", "comer", "tipico", "típico", "plato", "cocina", "food"] },
  { slug: "adventure",keywords: ["aventura", "adrenalina", "senderismo", "escalada", "rapel", "tirolesa", "extremo"] },
  { slug: "arts",     keywords: ["arte", "museo", "galeria", "galería", "artesania", "artesanía", "cultura"] },
];

function detectCategory(text: string): string | null {
  const n = norm(text);
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(k => n.includes(norm(k)))) return cat.slug;
  }
  return null;
}

// ─── Deterministic commands (no LLM needed) ──────────────────────────────────

const CLEAR_COMMANDS = ["limpiar", "quitar filtros", "borrar filtros", "reset", "limpiar filtros", "clear", "reiniciar", "volver"];

function isClearCommand(text: string): boolean {
  const n = norm(text);
  return CLEAR_COMMANDS.some(c => n.includes(c));
}

const GREETING_PATTERN = /^(hola|hi|hey|hello|buenas|buen dia|buenos dias|buenas tardes|buenas noches|saludos|good morning|good afternoon|good evening|ey|epa|que tal|como estas|que hubo)[\s!?.,¡¿]*$/i;

function isGreeting(text: string): boolean {
  return GREETING_PATTERN.test(norm(text));
}

// ─── LLM response shape ───────────────────────────────────────────────────────

type AiAction =
  | { type: "filter_region";   slug: string }
  | { type: "filter_category"; slug: string }
  | { type: "show_place";      slug: string }
  | { type: "clear" };

type AiResponse = { text: string; action: AiAction | null };

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { messages } = await req.json() as { messages: { role: string; content: string }[] };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function emit(obj: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      try {
        const lastMsg       = messages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";
        const recentContext = messages.filter(m => m.role === "user").slice(-4).map(m => m.content).join(" ");

        // Step 0 — Deterministic commands bypass LLM entirely
        if (isGreeting(lastMsg)) {
          const greetResult = await generateText({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            model: (getGroq() as any)("llama-3.3-70b-versatile"),
            system: `Eres Itinera IA, guía turística de Honduras. El usuario te saludó. Responde con UN saludo breve y cálido (máximo 1 frase) y pregunta adónde quiere ir o qué quiere explorar. Varía el tono: a veces entusiasta, a veces relajado. NUNCA listes lugares. Responde en el mismo idioma del usuario.`,
            messages: [{ role: "user", content: lastMsg }],
            temperature: 0.9,
          });
          emit({ type: "text-delta", textDelta: greetResult.text });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        if (isClearCommand(lastMsg)) {
          emit({ type: "text-delta", textDelta: "Listo, quité todos los filtros." });
          emit({ type: "ui-actions", intent: "clear", actions: [{ type: "clear" }], entities: {} });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // Step 1 — Detect region and category deterministically (no LLM)
        const regionSlug   = detectRegion(lastMsg)   ?? detectRegion(recentContext);
        const categorySlug = detectCategory(lastMsg) ?? null;

        // Two-step flow:
        // Step A — Region only (no category) → orient user, ask what they want
        // Step B — Region + category (or category alone) → fetch and show real places
        const isRegionOnly = Boolean(regionSlug) && !categorySlug;

        // Step 2 — Fetch places only when we have enough context (category or explicit place intent)
        const places = isRegionOnly ? [] : await fetchPlaces(regionSlug, categorySlug);

        // Step 3 — Build system prompt based on intent
        let system: string;

        if (isRegionOnly) {
          // Region-only: describe briefly, invite to explore by category
          system = `Eres Itinera IA, guía turística de Honduras. El usuario mencionó una región o ciudad.

Devuelve ÚNICAMENTE JSON válido (sin markdown, sin texto extra):
{"text":"<respuesta>","action":{"type":"filter_region","slug":"${regionSlug}"}}

INSTRUCCIONES:
- La acción SIEMPRE es filter_region con el slug indicado.
- En "text": describe la región en 1-2 frases con su esencia (historia, naturaleza, gastronomía, etc.).
- Luego invita al usuario a explorar mencionando 2-3 tipos de experiencias disponibles (sin listar lugares específicos): por ejemplo "¿Te interesa la arquitectura colonial, la gastronomía local o la naturaleza?"
- Máximo 3 frases en total. Cálido y directo.
- Responde en el mismo idioma que el usuario.`;
        } else {
          // Region + category (or category alone): fetch and show real places
          const placesText = places.length > 0
            ? places.map(p =>
                `• ${p.name} (slug:${p.slug}) — ${p.summary || "Atracción turística"} | ⭐${p.rating} | ${p.category}${p.region ? ` | ${p.region}` : ""}`
              ).join("\n")
            : "Sin lugares registrados en la base de datos para esta búsqueda.";

          const contextLabel = [regionSlug, categorySlug].filter(Boolean).join(" + ") || "Honduras";

          system = `Eres Itinera IA, guía turística de Honduras. Respondes SOLO con información real.

DATOS REALES (${contextLabel}):
${placesText}

Devuelve ÚNICAMENTE JSON válido (sin markdown, sin texto extra):
{"text":"<respuesta>","action":<acción o null>}

Acciones posibles:
  Filtrar categoría → {"type":"filter_category","slug":"<slug>"}
  Abrir lugar       → {"type":"show_place","slug":"<slug-exacto>"}
  Filtrar región    → {"type":"filter_region","slug":"<slug>"}
  Limpiar           → {"type":"clear"}
  Sin acción        → null

REGLAS:
1. Solo menciona lugares en DATOS REALES. Nunca inventes.
2. Si hay lugares: descríbelos por nombre con algo concreto de su summary y rating. Máximo 3.
3. Si el usuario pide una categoría → filter_category.
4. Si el usuario pide un lugar específico por nombre → show_place con slug exacto de la lista.
5. Si no hay datos → díselo honestamente.
6. Máximo 3 frases. Responde en el idioma del usuario.`;
        }

        const result = await generateText({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          model: (getGroq() as any)("llama-3.3-70b-versatile"),
          system,
          messages: messages as { role: "user" | "assistant"; content: string }[],
          temperature: 0.25,
        });

        // Step 4 — Parse JSON response
        let parsed: AiResponse = { text: result.text, action: null };
        try {
          const raw  = result.text.trim();
          const json = raw.startsWith("{") ? raw : (raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
          const obj  = JSON.parse(json) as AiResponse;
          if (typeof obj.text === "string") parsed = obj;
        } catch {
          // LLM didn't return JSON — use raw text, no action
          parsed = { text: result.text, action: null };
        }

        // Step 5 — Emit
        emit({ type: "text-delta", textDelta: parsed.text });

        // Emit tool-result cards only when we have specific places to show
        // (never on region-only step — user hasn't specified what they want yet)
        if (!isRegionOnly && places.length > 0 && parsed.action?.type !== "show_place") {
          emit({
            type: "tool-result",
            toolName: "search_places",
            result: {
              places: places.map(p => ({
                slug:     p.slug,
                name:     p.name,
                rating:   p.rating,
                category: p.category,
                url:      `/places/${p.slug}`,
              })),
            },
          });
        }

        if (parsed.action) {
          emit({
            type:    "ui-actions",
            intent:  parsed.action.type,
            actions: [parsed.action],
            entities: {},
          });
        }

      } catch (err) {
        console.error("api/chat error", err);
        emit({ type: "text-delta", textDelta: "Error temporal. Intenta de nuevo." });
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
