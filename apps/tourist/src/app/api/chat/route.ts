import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGroq() { return createGroq({ apiKey: process.env.GROQ_API_KEY! }); }
function getDB()   { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }

// ─── Region detection — deterministic, no LLM ────────────────────────────────

const REGIONS: Array<{ slug: string; keywords: string[] }> = [
  { slug: "comayagua",           keywords: ["comayagua"] },
  { slug: "copan",               keywords: ["copan", "copán"] },
  { slug: "islas-de-la-bahia",   keywords: ["roatan", "roatán", "utila", "guanaja", "islas de la bahia", "bay islands"] },
  { slug: "francisco-morazan",   keywords: ["tegucigalpa", "tegus", "francisco morazan"] },
  { slug: "cortes",              keywords: ["cortes", "cortés", "san pedro sula"] },
  { slug: "la-ceiba",            keywords: ["la ceiba"] },
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

async function fetchPlaces(regionSlug: string | null): Promise<PlaceRow[]> {
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

// ─── LLM response shape ───────────────────────────────────────────────────────

type AiAction =
  | { type: "filter_region"; slug: string }
  | { type: "show_place";    slug: string }
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

        // Step 1 — Detect region deterministically (no LLM)
        const regionSlug = detectRegion(lastMsg) ?? detectRegion(recentContext);

        // Step 2 — Fetch REAL places from DB before calling LLM
        const places = await fetchPlaces(regionSlug);

        // Step 3 — Build context with real data embedded
        const placesText = places.length > 0
          ? places.map(p =>
              `• ${p.name} (slug:${p.slug}) — ${p.summary || "Atracción turística"} | ⭐${p.rating} | ${p.category}${p.region ? ` | ${p.region}` : ""}`
            ).join("\n")
          : "Sin lugares registrados en la base de datos para esta región.";

        const regionLabel = regionSlug ?? "Honduras";

        const system = `Eres Itinera IA, guía turística de Honduras. Respondes SOLO con información real.

DATOS REALES DE LA BASE DE DATOS (región: ${regionLabel}):
${placesText}

Devuelve ÚNICAMENTE JSON válido con esta estructura exacta (sin markdown, sin texto extra):
{"text":"<respuesta>","action":<acción o null>}

Acciones posibles:
  Filtrar región → {"type":"filter_region","slug":"<region-slug>"}
  Abrir lugar   → {"type":"show_place","slug":"<slug-exacto-del-lugar>"}
  Limpiar       → {"type":"clear"}
  Sin acción    → null

REGLAS ESTRICTAS:
1. Solo menciona lugares que aparecen en DATOS REALES. Nunca inventes.
2. Si hay lugares en la lista, descríbelos: nombre real, algo concreto de su summary, rating.
3. Si el usuario menciona una región → acción filter_region con el slug de esa región.
4. Si pide ver un lugar específico → acción show_place con el slug EXACTO de la lista.
5. Si no hay datos para lo que pide → díselo honestamente, sin inventar.
6. Responde máximo 3 frases. Ve al punto.
7. Responde en el mismo idioma que el usuario.

Slugs de región válidos: comayagua, copan, islas-de-la-bahia, francisco-morazan, cortes, la-ceiba`;

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
