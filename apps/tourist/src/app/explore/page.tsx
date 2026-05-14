import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";
import { FloatingAiAssistant } from "@/components/ui/glowing-ai-chat-assistant";
import { ExploreFullscreenMap } from "@/components/dashboard/explore-fullscreen-map";

type Category = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  icon_name: string;
};

type RawPlace = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  ai_summary_i18n?: Record<string, string>;
  aggregated_rating: number;
  review_count: number;
  price_level: number;
  accessibility?: boolean;
  local_favorite: boolean;
  featured: boolean;
  lat?: number | null;
  lng?: number | null;
  place_categories:
    | { name_i18n: Record<string, string>; icon_name: string; slug: string }
    | Array<{ name_i18n: Record<string, string>; icon_name: string; slug: string }>
    | null;
  regions:
    | { name_i18n: Record<string, string>; slug: string }
    | Array<{ name_i18n: Record<string, string>; slug: string }>
    | null;
};

type ExplorePlace = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  ai_summary_i18n?: Record<string, string>;
  aggregated_rating: number;
  review_count: number;
  price_level: number;
  accessibility?: boolean;
  local_favorite: boolean;
  featured: boolean;
  lat?: number | null;
  lng?: number | null;
  place_categories: { name_i18n: Record<string, string>; icon_name: string; slug: string } | null;
  regions: { name_i18n: Record<string, string>; slug: string } | null;
};

const FALLBACK_COORDS_BY_SLUG: Record<string, { lat: number; lng: number }> = {
  "ruinas-copan": { lat: 14.84, lng: -89.14 },
  "playa-west-bay-roatan": { lat: 16.279, lng: -86.592 },
  "catedral-comayagua": { lat: 14.456, lng: -87.637 },
  "parque-nacional-la-tigra": { lat: 14.153, lng: -87.151 },
};

const FALLBACK_COORDS_BY_REGION: Record<string, { lat: number; lng: number }> = {
  copan: { lat: 14.84, lng: -89.14 },
  "islas-de-la-bahia": { lat: 16.3, lng: -86.55 },
  comayagua: { lat: 14.456, lng: -87.637 },
  "francisco-morazan": { lat: 14.072, lng: -87.192 },
  cortes: { lat: 15.506, lng: -88.024 },
};

const FALLBACK_PLACES: Array<{
  slug: string;
  name: string;
  category: { name: string; icon_name: string; slug: string };
  region: { name: string; slug: string };
  lat: number;
  lng: number;
}> = [
  {
    slug: "ruinas-copan",
    name: "Ruinas de Copan",
    category: { name: "Patrimonio Cultural", icon_name: "landmark", slug: "patrimonio-cultural" },
    region: { name: "Copan", slug: "copan" },
    lat: 14.84,
    lng: -89.14,
  },
  {
    slug: "playa-west-bay-roatan",
    name: "Playa West Bay",
    category: { name: "Playa", icon_name: "waves", slug: "playa" },
    region: { name: "Islas de la Bahia", slug: "islas-de-la-bahia" },
    lat: 16.279,
    lng: -86.592,
  },
  {
    slug: "catedral-comayagua",
    name: "Catedral de Comayagua",
    category: { name: "Religioso", icon_name: "church", slug: "religioso" },
    region: { name: "Comayagua", slug: "comayagua" },
    lat: 14.456,
    lng: -87.637,
  },
  {
    slug: "parque-nacional-la-tigra",
    name: "Parque Nacional La Tigra",
    category: { name: "Naturaleza", icon_name: "leaf", slug: "naturaleza" },
    region: { name: "Francisco Morazan", slug: "francisco-morazan" },
    lat: 14.153,
    lng: -87.151,
  },
];

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function withFallbackCoordinates(place: ExplorePlace): ExplorePlace {
  if (typeof place.lat === "number" && typeof place.lng === "number") return place;
  const normalizedSlug = normalizeKey(place.slug);
  const bySlug = FALLBACK_COORDS_BY_SLUG[normalizedSlug] ?? FALLBACK_COORDS_BY_SLUG[place.slug];
  const regionSlug = place.regions?.slug ? normalizeKey(place.regions.slug) : "";
  const byRegion = regionSlug ? FALLBACK_COORDS_BY_REGION[regionSlug] : undefined;
  const fallback = bySlug ?? byRegion;
  if (!fallback) return place;
  return { ...place, lat: fallback.lat, lng: fallback.lng };
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ guest?: string }>;
}) {
  const { guest } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = !user && guest === "true";

  if (!user && !isGuest) {
    redirect("/bienvenida?redirect=/explore");
  }

  const [{ data: categoriesData }, { data: placesData }] = await Promise.all([
    supabase.from("place_categories").select("id,slug,name_i18n,icon_name").order("slug"),
    supabase
      .from("places")
      .select(
        "id,slug,name_i18n,description_i18n,ai_summary_i18n,aggregated_rating,review_count,price_level,accessibility,local_favorite,featured,lat,lng,place_categories(name_i18n,icon_name,slug),regions(name_i18n,slug)"
      )
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("aggregated_rating", { ascending: false })
      .limit(300),
  ]);

  const categories = (categoriesData ?? []) as Category[];
  const places = ((placesData ?? []) as RawPlace[]).map((place) => {
    const normalized: ExplorePlace = {
      ...place,
      place_categories: firstRelation(place.place_categories),
      regions: firstRelation(place.regions),
    };
    return withFallbackCoordinates(normalized);
  });
  const placesWithCoords = places.filter((item) => typeof item.lat === "number" && typeof item.lng === "number");
  const finalPlaces: ExplorePlace[] =
    placesWithCoords.length > 0
      ? places
      : FALLBACK_PLACES.map((item, index) => ({
          id: `fallback-${index + 1}`,
          slug: item.slug,
          name_i18n: { es: item.name, en: item.name },
          description_i18n: { es: "Destino cultural de Honduras.", en: "Cultural destination in Honduras." },
          ai_summary_i18n: { es: "Destino recomendado para explorar.", en: "Recommended destination to explore." },
          aggregated_rating: 4.6,
          review_count: 0,
          price_level: 1,
          accessibility: true,
          local_favorite: false,
          featured: true,
          lat: item.lat,
          lng: item.lng,
          place_categories: {
            name_i18n: { es: item.category.name, en: item.category.name },
            icon_name: item.category.icon_name,
            slug: item.category.slug,
          },
          regions: {
            name_i18n: { es: item.region.name, en: item.region.name },
            slug: item.region.slug,
          },
        }));

  return (
    <main className="min-h-screen w-full bg-white">
      <ExploreFullscreenMap places={finalPlaces} categories={categories} />
      <DashboardDockDemo isGuest={isGuest} />
      <div id="ia">
        <FloatingAiAssistant context={{ page: "explore" }} storageKey="itinera-ai-explore" />
      </div>
    </main>
  );
}
