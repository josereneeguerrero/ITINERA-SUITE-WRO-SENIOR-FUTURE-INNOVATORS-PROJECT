import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// VERSION MARKER — bump on every meaningful change to verify deployment
// ─────────────────────────────────────────────────────────────────────────────
const ROUTE_VERSION = "v5-region-strict-2026-05-15";

export const maxDuration = 30;
export const dynamic = "force-dynamic";
export const revalidate = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGroq() { return createGroq({ apiKey: process.env.GROQ_API_KEY! }); }
function getDB()   { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }

// ─── Text normalization ──────────────────────────────────────────────────────

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // strip combining diacritics
    .trim();
}

// ─── Region detection — deterministic ────────────────────────────────────────

const REGIONS: Array<{ slug: string; keywords: string[] }> = [
  { slug: "comayagua",         keywords: ["comayagua"] },
  { slug: "copan",             keywords: ["copan", "copan ruinas", "ruinas de copan"] },
  { slug: "bay-islands",       keywords: ["roatan", "utila", "guanaja", "islas de la bahia", "bay islands", "islas bahia"] },
  { slug: "tegucigalpa",       keywords: ["tegucigalpa", "tegus", "francisco morazan", "morazan", "distrito central"] },
  { slug: "cortes",            keywords: ["cortes", "san pedro sula", "sps"] },
  { slug: "la-ceiba",          keywords: ["la ceiba", "ceiba"] },
  { slug: "olancho",           keywords: ["olancho", "juticalpa"] },
  { slug: "santa-barbara",     keywords: ["santa barbara"] },
  { slug: "choluteca",         keywords: ["choluteca"] },
  { slug: "lempira",           keywords: ["lempira", "gracias"] },
  { slug: "intibuca",          keywords: ["intibuca", "la esperanza"] },
  { slug: "ocotepeque",        keywords: ["ocotepeque"] },
  { slug: "yoro",              keywords: ["yoro"] },
  { slug: "el-paraiso",        keywords: ["el paraiso", "danli"] },
  { slug: "colon",             keywords: ["colon", "trujillo"] },
  { slug: "atlantida",         keywords: ["atlantida", "tela"] },
];

function detectRegion(text: string): string | null {
  const n = norm(text);
  if (!n) return null;
  for (const r of REGIONS) {
    for (const k of r.keywords) {
      if (n.includes(norm(k))) return r.slug;
    }
  }
  return null;
}

// ─── Category detection — deterministic ──────────────────────────────────────

const CATEGORIES: Array<{ slug: string; keywords: string[] }> = [
  { slug: "beach",     keywords: ["playa", "playas", "beach", "mar", "caribe", "buceo", "snorkel", "arrecife", "costa"] },
  { slug: "nature",    keywords: ["naturaleza", "nature", "parque nacional", "parques", "bosque", "sendero", "fauna", "flora", "reserva", "ecoturismo", "verde"] },
  { slug: "heritage",  keywords: ["patrimonio", "heritage", "ruinas", "arqueologia", "maya", "colonial", "historico", "historia", "historicos", "arqueologico", "prehispanico"] },
  { slug: "religion",  keywords: ["religion", "religioso", "religiosos", "iglesia", "iglesias", "catedral", "catedrales", "capilla", "templo", "fe", "santo", "virgen", "basilica", "sagrado"] },
  { slug: "food",      keywords: ["comida", "food", "gastronomia", "restaurante", "restaurantes", "comer", "tipico", "platos", "cocina", "gastronomico", "sabores"] },
  { slug: "adventure", keywords: ["aventura", "adventure", "aventuras", "adrenalina", "senderismo", "escalada", "rapel", "tirolesa", "extremo", "outdoor"] },
  { slug: "arts",      keywords: ["arte", "arts", "museo", "museos", "galeria", "artesania", "cultura", "exhibicion", "exposicion"] },
];

function detectCategory(text: string): string | null {
  const n = norm(text);
  if (!n) return null;
  for (const cat of CATEGORIES) {
    for (const k of cat.keywords) {
      if (n.includes(norm(k))) return cat.slug;
    }
  }
  return null;
}

// ─── Region display names ────────────────────────────────────────────────────

const REGION_NAMES: Record<string, string> = {
  "comayagua":          "Comayagua",
  "copan":              "Copán",
  "bay-islands":        "Islas de la Bahía",
  "tegucigalpa":        "Tegucigalpa",
  "cortes":             "Cortés",
  "la-ceiba":           "La Ceiba",
  "atlantida":          "Atlántida",
  "olancho":            "Olancho",
  "santa-barbara":      "Santa Bárbara",
  "choluteca":          "Choluteca",
  "lempira":            "Lempira",
  "intibuca":           "Intibucá",
  "ocotepeque":         "Ocotepeque",
  "yoro":               "Yoro",
  "el-paraiso":         "El Paraíso",
  "colon":              "Colón",
};

const ORIENT_TEMPLATES = [
  (n: string) => `${n} te espera en el mapa. ¿Qué tipo de experiencia buscas — historia y patrimonio, gastronomía, naturaleza, religioso, arte o aventura?`,
  (n: string) => `El mapa ya muestra ${n}. ¿Qué te llama más — lugares históricos, buena comida, naturaleza, sitios religiosos o algo de aventura?`,
  (n: string) => `Listo, estamos en ${n}. ¿Qué quieres explorar: patrimonio colonial, gastronomía local, naturaleza, arte o vida religiosa?`,
];

function buildOrientText(regionSlug: string): string {
  const name = REGION_NAMES[regionSlug] ?? regionSlug;
  return ORIENT_TEMPLATES[Math.floor(Math.random() * ORIENT_TEMPLATES.length)](name);
}

// ─── Greeting + clear command detection ──────────────────────────────────────

const GREETING_PATTERN = /^(hola|hi|hey|hello|buenas|buen dia|buenos dias|buenas tardes|buenas noches|saludos|good morning|good afternoon|good evening|ey|epa|que tal|como estas|que hubo)[\s!?.,¡¿]*$/i;

function isGreeting(text: string): boolean {
  return GREETING_PATTERN.test(norm(text));
}

const CLEAR_COMMANDS = ["limpiar", "quitar filtros", "borrar filtros", "reset", "limpiar filtros", "clear", "reiniciar", "volver"];

function isClearCommand(text: string): boolean {
  const n = norm(text);
  return CLEAR_COMMANDS.some(c => n.includes(c));
}

// ─── Place fetching ──────────────────────────────────────────────────────────

type PlaceRow = {
  slug: string;
  name: string;
  summary: string;
  rating: number;
  category: string;
  region: string;
  regionSlug: string;
};

async function fetchPlaces(regionSlug: string | null, categorySlug: string | null): Promise<PlaceRow[]> {
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

// ─── LLM response shape ──────────────────────────────────────────────────────

type AiAction =
  | { type: "filter_region";   slug: string }
  | { type: "filter_category"; slug: string }
  | { type: "show_place";      slug: string }
  | { type: "clear" };

type AiResponse = { text: string; action: AiAction | null };

// ─── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { messages } = await req.json() as { messages: { role: string; content: string }[] };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function emit(obj: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      function close() {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }

      // ─── AUDIT LOGGING - declare before try so catch block can access it ────
      const auditId = Math.random().toString(36).slice(2, 8);

      try {
        // ─── Extract ONLY the latest user message ───────────────────────────
        // CRITICAL: intent classification is based on the CURRENT message only.
        // Conversation history is NOT used for region/category detection.
        const lastUserMsg = (messages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "").trim();

        console.error(`[AUDIT-${auditId}] [${ROUTE_VERSION}] START - Input: "${lastUserMsg.slice(0, 80)}${lastUserMsg.length > 80 ? '...' : ''}"`);

        if (!lastUserMsg) {
          console.error(`[AUDIT-${auditId}] PATH-A: Empty message`);
          emit({ type: "text-delta", textDelta: "¿En qué te puedo ayudar?", _path: "empty", _v: ROUTE_VERSION, _audit: auditId });
          return close();
        }

        // ─── PATH A: Greeting ───────────────────────────────────────────────
        if (isGreeting(lastUserMsg)) {
          console.error(`[AUDIT-${auditId}] PATH-A: Greeting detected`);
          const greetResult = await generateText({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            model: (getGroq() as any)("llama-3.3-70b-versatile"),
            system: `Eres Itinera IA, guía turística de Honduras. El usuario te saludó. Responde con UN saludo breve y cálido (máximo 1 frase) y pregunta adónde quiere ir o qué quiere explorar. Varía el tono. NUNCA listes lugares. Responde en el idioma del usuario.`,
            messages: [{ role: "user", content: lastUserMsg }],
            temperature: 0.9,
          });
          emit({ type: "text-delta", textDelta: greetResult.text, _path: "greeting", _v: ROUTE_VERSION, _audit: auditId });
          return close();
        }

        // ─── PATH B: Clear command ──────────────────────────────────────────
        if (isClearCommand(lastUserMsg)) {
          console.error(`[AUDIT-${auditId}] PATH-B: Clear command detected`);
          emit({ type: "text-delta", textDelta: "Listo, quité todos los filtros.", _path: "clear", _v: ROUTE_VERSION, _audit: auditId });
          emit({ type: "ui-actions", intent: "clear", actions: [{ type: "clear" }], entities: {}, _audit: auditId });
          return close();
        }

        // ─── Detect intent FROM CURRENT MESSAGE ONLY ─────────────────────────
        const regionInMsg   = detectRegion(lastUserMsg);
        const categoryInMsg = detectCategory(lastUserMsg);

        // ─── AUDIT LOGGING ──────────────────────────────────────────────────
        console.error(`[AUDIT-${auditId}] Detection: region="${regionInMsg}" category="${categoryInMsg}"`);

        // ─── PATH C: Region only → orient (no LLM, no DB, deterministic) ────
        // Rule: if the user mentioned a region BUT NOT a category, never recommend
        // a specific place. Just navigate the map and ask what they want.
        if (regionInMsg && !categoryInMsg) {
          console.error(`[AUDIT-${auditId}] PATH-C: Region-only (no DB, no LLM)`);
          const text = buildOrientText(regionInMsg);
          console.error(`[AUDIT-${auditId}] Emitting orient text: "${text.slice(0, 80)}..."`);
          emit({
            type: "text-delta",
            textDelta: text,
            _path: "region-only",
            _v: ROUTE_VERSION,
            _region: regionInMsg,
            _audit: auditId,
          });
          emit({
            type: "ui-actions",
            intent: "filter_region",
            actions: [{ type: "filter_region", slug: regionInMsg }],
            entities: { region_slug: regionInMsg },
            _audit: auditId,
          });
          console.error(`[AUDIT-${auditId}] PATH-C: Complete`);
          return close();
        }

        // ─── PATH D: Category present → fetch places + LLM describes ────────
        // Region context can come from current msg OR session history (only as
        // a SCOPE for the search, NOT as a trigger for recommendation).
        console.error(`[AUDIT-${auditId}] PATH-D: Category detected, starting place search`);
        let regionForSearch = regionInMsg;
        if (!regionForSearch) {
          console.error(`[AUDIT-${auditId}] No region in current msg, checking history...`);
          const history = messages.filter(m => m.role === "user").slice(-4, -1);
          for (const m of history) {
            const r = detectRegion(m.content);
            if (r) {
              regionForSearch = r;
              console.error(`[AUDIT-${auditId}] Found region in history: "${r}"`);
              break;
            }
          }
        }

        console.error(`[AUDIT-${auditId}] Fetching places: region="${regionForSearch}" category="${categoryInMsg}"`);
        const places = await fetchPlaces(regionForSearch, categoryInMsg);
        console.error(`[AUDIT-${auditId}] Found ${places.length} places`);

        const placesText = places.length > 0
          ? places.map(p =>
              `• ${p.name} (slug:${p.slug}) — ${p.summary || "Atracción turística"} | ⭐${p.rating} | ${p.category}${p.region ? ` | ${p.region}` : ""}`
            ).join("\n")
          : "Sin lugares registrados en la base de datos para esta búsqueda.";

        const contextLabel = [regionForSearch, categoryInMsg].filter(Boolean).join(" + ") || "Honduras";

        const system = `Eres Itinera IA, guía turística de Honduras. Respondes SOLO con información real.

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

        console.error(`[AUDIT-${auditId}] Calling LLM with context: ${contextLabel}`);
        const result = await generateText({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          model: (getGroq() as any)("llama-3.3-70b-versatile"),
          system,
          messages: messages as { role: "user" | "assistant"; content: string }[],
          temperature: 0.25,
        });
        console.error(`[AUDIT-${auditId}] LLM response: "${result.text.slice(0, 100)}..."`);

        // ─── Parse LLM response ──────────────────────────────────────────────
        let parsed: AiResponse = { text: result.text, action: null };
        try {
          const raw  = result.text.trim();
          const json = raw.startsWith("{") ? raw : (raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
          const obj  = JSON.parse(json) as AiResponse;
          if (typeof obj.text === "string") parsed = obj;
        } catch {
          parsed = { text: result.text, action: null };
        }

        console.error(`[AUDIT-${auditId}] Emitting place-search response, places=${places.length}, action=${parsed.action?.type ?? "none"}`);
        emit({
          type: "text-delta",
          textDelta: parsed.text,
          _path: "place-search",
          _v: ROUTE_VERSION,
          _region: regionForSearch,
          _category: categoryInMsg,
          _audit: auditId,
        });

        if (places.length > 0 && parsed.action?.type !== "show_place") {
          console.error(`[AUDIT-${auditId}] Emitting ${places.length} places`);
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
          console.error(`[AUDIT-${auditId}] Emitting action: ${parsed.action.type}`);
          emit({
            type:    "ui-actions",
            intent:  parsed.action.type,
            actions: [parsed.action],
            entities: {},
            _audit: auditId,
          });
        }

        console.error(`[AUDIT-${auditId}] PATH-D: Complete`);
        return close();

      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[AUDIT-${auditId}] [${ROUTE_VERSION}] api/chat error:`, errMsg);
        emit({ type: "text-delta", textDelta: "Error temporal. Intenta de nuevo.", _path: "error", _v: ROUTE_VERSION, _audit: auditId });
        return close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Connection":    "keep-alive",
      "X-Itinera-Route-Version": ROUTE_VERSION,
      "X-Itinera-Debug": `enabled-audit-logs-in-vercel`,
    },
  });
}

// Optional GET to verify which version is deployed without sending a chat
export async function GET() {
  return Response.json({ version: ROUTE_VERSION, deployed_at: new Date().toISOString() });
}
