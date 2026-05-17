import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 45;
export const dynamic = "force-dynamic";

function getGroq() {
  return createGroq({ apiKey: process.env.GROQ_API_KEY! });
}

function getDB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type DiscoverCard = {
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  region: string;
  rating: number;
  curiosity: string;   // AI-generated 1-sentence cultural fact
  url: string;
};

// ── Mood → category slug(s) ───────────────────────────────────────────────────

const MOOD_TO_SLUGS: Record<string, string[]> = {
  "Aventura":        ["adventure", "nature"],
  "Historia Viva":   ["heritage"],
  "Misterio Maya":   ["heritage"],
  "Mar & Playa":     ["beach"],
  "Naturaleza":      ["nature"],
  "Gourmet":         ["food"],
  "Fe & Espíritu":   ["religion", "heritage"],
  "Arte & Cultura":  ["arts", "heritage"],
  "Paisajes Épicos": ["nature", "beach"],
  "En Familia":      ["nature", "beach", "heritage"],
};

// Mood → interests labels for planner pre-fill
export const MOOD_TO_INTERESTS: Record<string, string[]> = {
  "Aventura":        ["Aventura", "Naturaleza"],
  "Historia Viva":   ["Patrimonio Cultural"],
  "Misterio Maya":   ["Patrimonio Cultural"],
  "Mar & Playa":     ["Playa"],
  "Naturaleza":      ["Naturaleza"],
  "Gourmet":         ["Gastronomía"],
  "Fe & Espíritu":   ["Religioso", "Patrimonio Cultural"],
  "Arte & Cultura":  ["Arte y Museos", "Patrimonio Cultural"],
  "Paisajes Épicos": ["Naturaleza", "Playa"],
  "En Familia":      ["Naturaleza", "Playa", "Patrimonio Cultural"],
};

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { moods } = await req.json() as { moods: string[] };

    if (!moods || moods.length === 0) {
      return Response.json({ error: "Selecciona al menos un mood" }, { status: 400 });
    }

    const db  = getDB();
    const groq = getGroq();

    // Collect unique category slugs from selected moods
    const slugSet = new Set<string>();
    moods.forEach(m => (MOOD_TO_SLUGS[m] ?? []).forEach(s => slugSet.add(s)));
    const categorySlugs = [...slugSet];

    if (categorySlugs.length === 0) {
      return Response.json({ error: "Moods no reconocidos" }, { status: 400 });
    }

    // Fetch places matching those categories
    const { data: rawPlaces } = await db
      .from("places")
      .select(`
        slug, name_i18n, ai_summary_i18n, aggregated_rating,
        place_categories(name_i18n, slug),
        regions(name_i18n)
      `)
      .eq("status", "published")
      .in("place_categories.slug", categorySlugs)
      .order("featured", { ascending: false })
      .order("aggregated_rating", { ascending: false })
      .limit(18);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = ((rawPlaces ?? []) as any[]).filter(p => p.place_categories);

    if (filtered.length === 0) {
      return Response.json({
        error: "no_places",
        message: "No encontramos lugares para esos moods. Prueba otra combinación.",
      }, { status: 200 });
    }

    // Pick 6 best (already sorted by featured + rating)
    const picked = filtered.slice(0, 6);

    // Generate 1-sentence curiosity per place in parallel
    const curiosities = await Promise.all(
      picked.map(async (p) => {
        const name    = p.name_i18n?.es ?? p.slug;
        const summary = p.ai_summary_i18n?.es ?? "";
        try {
          const result = await generateText({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            model: (groq as any)("llama-3.3-70b-versatile"),
            system: `Eres Itinera IA, guía cultural de Honduras. Escribe UNA sola frase corta e interesante sobre este lugar: "${name}". ${summary ? `Contexto: ${summary}` : ""} Sé evocador, usa datos reales o detalles únicos. En español. Sin comillas. Sin mencionar "Honduras" explícitamente.`,
            messages: [{ role: "user", content: "curiosidad" }],
            temperature: 0.8,
          });
          return result.text.trim().replace(/^["']|["']$/g, "");
        } catch {
          return summary ? summary.slice(0, 120) : "Un lugar que vale la pena descubrir.";
        }
      })
    );

    const cards: DiscoverCard[] = picked.map((p, i) => ({
      slug:         p.slug,
      name:         p.name_i18n?.es ?? p.slug,
      category:     p.place_categories?.name_i18n?.es ?? "",
      categorySlug: p.place_categories?.slug ?? "",
      region:       p.regions?.name_i18n?.es ?? "",
      rating:       Number(p.aggregated_rating ?? 0),
      curiosity:    curiosities[i],
      url:          `/places/${p.slug}`,
    }));

    // Collect interests for planner pre-fill
    const interestSet = new Set<string>();
    moods.forEach(m => (MOOD_TO_INTERESTS[m] ?? []).forEach(i => interestSet.add(i)));

    return Response.json({ cards, plannerInterests: [...interestSet] });
  } catch (err) {
    console.error("[Discover API Error]", err);
    return Response.json({ error: "Error al descubrir lugares. Intenta de nuevo." }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ status: "ok", endpoint: "discover-v1" });
}
