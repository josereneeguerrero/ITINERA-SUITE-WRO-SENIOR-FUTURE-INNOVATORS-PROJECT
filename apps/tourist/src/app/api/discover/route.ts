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
  curiosity: string;     // AI-generated 1-sentence cultural fact
  url: string;
  imageUrl: string | null; // Thumbnail — null until media_assets is populated
  matchedMood: string | null; // Which mood triggered this card
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

    // Resolve category slugs → actual UUIDs (PostgREST can't filter on embedded slug)
    const { data: catRows } = await db
      .from("place_categories")
      .select("id")
      .in("slug", categorySlugs);
    const categoryIds = (catRows ?? []).map((c: { id: string }) => c.id);

    // Fetch places matching those category IDs
    const { data: rawPlaces } = await db
      .from("places")
      .select(`
        slug, name_i18n, ai_summary_i18n, aggregated_rating,
        place_categories(name_i18n, slug),
        regions(name_i18n)
      `)
      .eq("status", "published")
      .in("category_id", categoryIds.length > 0 ? categoryIds : ["00000000-0000-0000-0000-000000000000"])
      .order("featured", { ascending: false })
      .order("aggregated_rating", { ascending: false })
      .limit(30);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filtered = ((rawPlaces ?? []) as any[]).filter(p => p.place_categories);

    // Track which moods were actually found vs missing (for honest UX)
    const foundSlugs = new Set(filtered.map((p: { place_categories?: { slug?: string } }) => p.place_categories?.slug));
    const missingMoods = moods.filter(m =>
      (MOOD_TO_SLUGS[m] ?? []).every(s => !foundSlugs.has(s))
    );

    // Fallback: if < 3 results for selected moods, expand to all featured places
    if (filtered.length < 3) {
      const { data: fallbackPlaces } = await db
        .from("places")
        .select(`
          slug, name_i18n, ai_summary_i18n, aggregated_rating,
          place_categories(name_i18n, slug),
          regions(name_i18n)
        `)
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("aggregated_rating", { ascending: false })
        .limit(40);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fallbackFiltered = ((fallbackPlaces ?? []) as any[]).filter(p => p.place_categories);
      const existingSlugs = new Set(filtered.map((p: { slug: string }) => p.slug));
      const extras = fallbackFiltered.filter((p: { slug: string }) => !existingSlugs.has(p.slug));
      filtered = [...filtered, ...extras];
    }

    if (filtered.length === 0) {
      return Response.json({
        error: "no_places",
        message: "No encontramos lugares para esos moods. Prueba otra combinación.",
      }, { status: 200 });
    }

    // Build slug→mood map for card tagging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slugToMood = new Map<string, string>();
    filtered.forEach((p: { place_categories?: { slug?: string } }) => {
      const catSlug = p.place_categories?.slug ?? "";
      for (const mood of moods) {
        if ((MOOD_TO_SLUGS[mood] ?? []).includes(catSlug) && !slugToMood.has(catSlug)) {
          slugToMood.set(catSlug, mood);
        }
      }
    });

    // Shuffle for variety on each call — Fisher-Yates
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }

    // Pick 6 random places from the shuffled pool
    const picked = filtered.slice(0, 6);

    // Generate 1-sentence punchy curiosity per place in parallel
    const curiosities = await Promise.all(
      picked.map(async (p) => {
        const name    = p.name_i18n?.es ?? p.slug;
        const summary = p.ai_summary_i18n?.es ?? "";
        try {
          const result = await generateText({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            model: (groq as any)("llama-3.3-70b-versatile"),
            system: `Eres Itinera IA. Escribe UNA frase MUY CORTA (máximo 15 palabras) sobre "${name}" con un dato sorprendente, poco conocido o evocador. ${summary ? `Contexto: ${summary}` : ""} Elige UN ángulo: cifra récord, leyenda, animal único, hecho histórico insólito, dato geográfico raro. En español. Solo la frase, sin comillas ni puntos al final.`,
            messages: [{ role: "user", content: `#${Math.floor(Math.random() * 9999)}` }],
            temperature: 0.95,
          });
          return result.text.trim().replace(/^["'¡¿]|["'!?.]$/g, "");
        } catch {
          return summary ? summary.slice(0, 80) : "Un lugar que vale la pena descubrir";
        }
      })
    );

    const cards: DiscoverCard[] = picked.map((p, i) => {
      const catSlug = p.place_categories?.slug ?? "";
      return {
        slug:         p.slug,
        name:         p.name_i18n?.es ?? p.slug,
        category:     p.place_categories?.name_i18n?.es ?? "",
        categorySlug: catSlug,
        region:       p.regions?.name_i18n?.es ?? "",
        rating:       Number(p.aggregated_rating ?? 0),
        curiosity:    curiosities[i],
        url:          `/places/${p.slug}`,
        imageUrl:     null, // Ready for media_assets — populate when photos available
        matchedMood:  slugToMood.get(catSlug) ?? null,
      };
    });

    // Collect interests for planner pre-fill
    const interestSet = new Set<string>();
    moods.forEach(m => (MOOD_TO_INTERESTS[m] ?? []).forEach(i => interestSet.add(i)));

    return Response.json({ cards, plannerInterests: [...interestSet], missingMoods });
  } catch (err) {
    console.error("[Discover API Error]", err);
    return Response.json({ error: "Error al descubrir lugares. Intenta de nuevo." }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ status: "ok", endpoint: "discover-v1" });
}
