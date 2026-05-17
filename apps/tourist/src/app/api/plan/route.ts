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

export type PlaceCard = {
  slug: string;
  name: string;
  category: string;
  region: string;
  rating: number;
  summary: string;
  url: string;
  lat: number | null;
  lng: number | null;
};

export type DayPlan = {
  dayNumber: number;
  title: string;
  description: string;
  places: PlaceCard[];
};

export type GeneratedPlan = {
  title: string;
  subtitle: string;
  days: DayPlan[];
  totalPlaces: number;
};

// ── Interest → category slug map ───────────────────────────────────────────────

const INTEREST_TO_SLUG: Record<string, string> = {
  "Patrimonio Cultural": "heritage",
  "Naturaleza":          "nature",
  "Gastronomía":         "food",
  "Playa":               "beach",
  "Aventura":            "adventure",
  "Religioso":           "religion",
  "Arte y Museos":       "arts",
};

// ── Departure city → preferred region slugs ────────────────────────────────────

const DEPARTURE_REGIONS: Record<string, string[]> = {
  "Tegucigalpa": ["francisco-morazan", "comayagua", "copan"],
  "San Pedro Sula": ["cortes", "santa-barbara", "copan"],
  "La Ceiba": ["atlantida", "colon", "islas-de-la-bahia"],
  "Otra": [],
};

// ── Distribute places across days ──────────────────────────────────────────────

function distributePlaces(places: PlaceCard[], days: number): PlaceCard[][] {
  if (places.length === 0) return Array.from({ length: days }, () => []);

  const maxPerDay = 3;
  const minPerDay = 1;
  const result: PlaceCard[][] = Array.from({ length: days }, () => []);

  // Shuffle slightly to avoid same-category clustering
  const shuffled = [...places].sort(() => Math.random() - 0.5);

  // Fill days greedily: try to fill each day to maxPerDay, last days get remainder
  let idx = 0;
  for (let d = 0; d < days && idx < shuffled.length; d++) {
    const remaining = shuffled.length - idx;
    const daysLeft = days - d;
    const forThisDay = Math.min(maxPerDay, Math.max(minPerDay, Math.ceil(remaining / daysLeft)));
    result[d] = shuffled.slice(idx, idx + forThisDay);
    idx += forThisDay;
  }

  return result;
}

// ── Region name from slug ──────────────────────────────────────────────────────

function dayTitle(places: PlaceCard[], dayNum: number): string {
  if (places.length === 0) return `Día ${dayNum}`;
  const regions = [...new Set(places.map(p => p.region).filter(Boolean))];
  if (regions.length === 1) return `Día ${dayNum} — ${regions[0]}`;
  if (regions.length === 2) return `Día ${dayNum} — ${regions[0]} & ${regions[1]}`;
  return `Día ${dayNum} — Ruta múltiple`;
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { days, interests, departure, groupType } = await req.json() as {
      days: number;
      interests: string[];
      departure: string;
      groupType: string;
    };

    // Validate
    if (!days || days < 1 || days > 7) {
      return Response.json({ error: "Días inválidos" }, { status: 400 });
    }
    if (!interests || interests.length === 0) {
      return Response.json({ error: "Selecciona al menos un interés" }, { status: 400 });
    }

    const db = getDB();

    // Map interests → category slugs
    const categorySlugs = interests
      .map(i => INTEREST_TO_SLUG[i])
      .filter(Boolean);

    // Preferred regions based on departure
    const preferredRegions = DEPARTURE_REGIONS[departure] ?? [];

    // Fetch places matching categories — prefer nearby regions first
    const limit = days * 3 + 3;
    let placesQuery = db
      .from("places")
      .select(`
        slug, name_i18n, ai_summary_i18n, aggregated_rating, lat, lng,
        place_categories(name_i18n, slug),
        regions(name_i18n, slug)
      `)
      .eq("status", "published")
      .in("place_categories.slug", categorySlugs)
      .order("featured", { ascending: false })
      .order("aggregated_rating", { ascending: false })
      .limit(limit * 2); // fetch extra to filter/sort

    const { data: rawPlaces } = await placesQuery;

    if (!rawPlaces || rawPlaces.length === 0) {
      return Response.json({
        error: "no_places",
        message: `No encontramos destinos en nuestra base de datos para esos intereses aún. Estamos agregando más contenido — intenta con otras categorías o vuelve pronto.`,
      }, { status: 200 });
    }

    // Normalize places
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allPlaces: PlaceCard[] = (rawPlaces as any[])
      .filter(p => p.place_categories)
      .map(p => ({
        slug: p.slug,
        name: p.name_i18n?.es ?? p.slug,
        category: p.place_categories?.name_i18n?.es ?? "",
        region: p.regions?.name_i18n?.es ?? "",
        rating: Number(p.aggregated_rating ?? 0),
        summary: p.ai_summary_i18n?.es ?? "",
        url: `/places/${p.slug}`,
        lat: typeof p.lat === "number" ? p.lat : null,
        lng: typeof p.lng === "number" ? p.lng : null,
      }));

    // Sort: preferred regions first, then by rating
    const sorted = [
      ...allPlaces.filter(p => preferredRegions.some(r => p.region.toLowerCase().includes(r.replace(/-/g, " ")))),
      ...allPlaces.filter(p => !preferredRegions.some(r => p.region.toLowerCase().includes(r.replace(/-/g, " ")))),
    ].slice(0, limit);

    if (sorted.length < days) {
      return Response.json({
        error: "insufficient_places",
        message: `Solo encontramos ${sorted.length} destino${sorted.length !== 1 ? "s" : ""} para esos criterios. Intenta seleccionar más intereses o menos días.`,
        count: sorted.length,
      }, { status: 200 });
    }

    // Distribute across days
    const dayGroups = distributePlaces(sorted, days);

    // Generate plan title
    const interestLabels = interests.slice(0, 2).join(" y ");
    const groupLabel = groupType === "Solo" ? "para viajero solo" :
                       groupType === "Pareja" ? "para dos" :
                       groupType === "Familia" ? "en familia" : "con amigos";

    const planTitleResult = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: (getGroq() as any)("llama-3.3-70b-versatile"),
      system: `Eres Itinera IA. Crea un título poético de máximo 5 palabras en español natural y correcto para un itinerario de Honduras.
El título debe ser descriptivo del viaje, no mencionar el tipo de grupo.
Usa frases como: "Ruta Maya del Occidente", "Fe y Sabor en Comayagua", "Playas del Caribe Hondureño".
Intereses: ${interestLabels}. Salida: ${departure}. Días: ${days}.
SOLO el título, sin comillas, sin puntuación extra.`,
      messages: [{ role: "user", content: "título" }],
      temperature: 0.85,
    });

    // Generate day descriptions in parallel
    const dayDescriptions = await Promise.all(
      dayGroups.map(async (places, i) => {
        if (places.length === 0) return "Día libre para explorar.";
        const placeNames = places.map(p => p.name).join(", ");
        const result = await generateText({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          model: (getGroq() as any)("llama-3.3-70b-versatile"),
          system: `Eres Itinera IA, guía cultural de Honduras. En 1-2 frases, describe el tema cultural del Día ${i + 1} del itinerario basado en estos lugares: ${placeNames}. Sé evocador y breve. En español. Sin mencionar los nombres exactos de los lugares — habla del espíritu del día.`,
          messages: [{ role: "user", content: "descripción del día" }],
          temperature: 0.7,
        });
        return result.text.trim();
      })
    );

    // Build the final plan
    const plan: GeneratedPlan = {
      title: planTitleResult.text.trim().replace(/['"]/g, ""),
      subtitle: `${days} día${days !== 1 ? "s" : ""} · ${groupLabel} · Salida desde ${departure}`,
      totalPlaces: sorted.length,
      days: dayGroups.map((places, i) => ({
        dayNumber: i + 1,
        title: dayTitle(places, i + 1),
        description: dayDescriptions[i],
        places,
      })),
    };

    return Response.json({ plan });
  } catch (err) {
    console.error("[Plan API Error]", err);
    return Response.json({ error: "Error generando el plan. Intenta de nuevo." }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ status: "ok", endpoint: "plan-v1" });
}
