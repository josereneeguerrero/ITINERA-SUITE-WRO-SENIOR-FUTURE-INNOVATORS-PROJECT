import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;
import { redirect } from "next/navigation";

import Link from "next/link";

import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";

import {

  ImageAutoSlider,
  type ImageAutoSliderItem,
} from "@/components/ui/image-auto-slider";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";

import {

  DashboardHomeMap,
  type DashboardHomeMapPlace,
} from "@/components/dashboard/dashboard-home-map";
import {

  DashboardHomeStories,
  type DashboardHomeStory,
} from "@/components/dashboard/dashboard-home-stories";
import { getCategoryColor, getCategoryKey } from "@/lib/category-theme";
import { CategoryCarousel } from "@/components/dashboard/category-carousel";

type Category = {
  id: string;
  slug: string;
  name_i18n: Record<string, string> | null;
  icon_name: string | null;
};

type Place = {
  id: string;
  slug: string;
  name_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  aggregated_rating: number | null;
  lat?: number | null;
  lng?: number | null;
  place_categories:
    | {
        name_i18n: Record<string, string> | null;
        icon_name: string | null;
        slug: string | null;
      }
    | Array<{
        name_i18n: Record<string, string> | null;
        icon_name: string | null;
        slug: string | null;
      }>
    | null;
  regions:
    | {
        id?: string | null;
        name_i18n: Record<string, string> | null;
        slug: string | null;
      }
    | Array<{
        id?: string | null;
        name_i18n: Record<string, string> | null;
        slug: string | null;
      }>
    | null;
};

const FALLBACK_DESTINATIONS: Array<{
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  badge: string;
  lat: number;
  lng: number;
}> = [
  {
    id: "fallback-copan",
    slug: "ruinas-copan",
    title: "Ruinas de Copan",
    description: "Sitio arqueologico maya en el occidente de Honduras.",
    category: "Patrimonio Cultural",
    badge: "Copan",
    lat: 14.84,
    lng: -89.14,
  },
  {
    id: "fallback-roatan",
    slug: "playa-west-bay-roatan",
    title: "Playa West Bay",
    description: "Arena blanca y arrecifes en Islas de la Bahia.",
    category: "Playa",
    badge: "Islas de la Bahia",
    lat: 16.279,
    lng: -86.592,
  },
  {
    id: "fallback-comayagua",
    slug: "catedral-comayagua",
    title: "Catedral de Comayagua",
    description: "Centro historico colonial y patrimonio religioso.",
    category: "Religioso",
    badge: "Comayagua",
    lat: 14.456,
    lng: -87.637,
  },
  {
    id: "fallback-tigra",
    slug: "parque-nacional-la-tigra",
    title: "Parque Nacional La Tigra",
    description: "Bosque nublado y senderos cerca de Tegucigalpa.",
    category: "Naturaleza",
    badge: "Francisco Morazan",
    lat: 14.153,
    lng: -87.151,
  },
];

type Story = {
  id: string;
  slug: string;
  title_i18n: Record<string, string> | null;
  summary_i18n: Record<string, string> | null;
  audio_storage_path: string | null;
  featured: boolean | null;
  created_at?: string | null;
  regions:
    | {
        name_i18n: Record<string, string> | null;
        slug: string | null;
      }
    | Array<{
        name_i18n: Record<string, string> | null;
        slug: string | null;
      }>
    | null;
};

const UNSPLASH_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1974&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=2152&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=2126&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1482881497185-d4a9ddbe4151?q=80&w=1965&auto=format&fit=crop",
  "https://plus.unsplash.com/premium_photo-1673264933212-d78737f38e48?q=80&w=1974&auto=format&fit=crop",
  "https://plus.unsplash.com/premium_photo-1711434824963-ca894373272e?q=80&w=2030&auto=format&fit=crop",
  "https://plus.unsplash.com/premium_photo-1675705721263-0bbeec261c49?q=80&w=1940&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524799526615-766a9833dec0?q=80&w=1935&auto=format&fit=crop",
];

function getText(value: Record<string, string> | null | undefined, fallback: string) {
  return value?.es ?? value?.en ?? fallback;
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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

function withFallbackCoordinates(place: Place): Place {
  if (typeof place.lat === "number" && typeof place.lng === "number") return place;

  const region = firstRelation(place.regions);
  const bySlug = FALLBACK_COORDS_BY_SLUG[place.slug];
  const byRegion = region?.slug ? FALLBACK_COORDS_BY_REGION[region.slug] : undefined;
  const fallback = bySlug ?? byRegion;
  if (!fallback) return place;

  return {
    ...place,
    lat: fallback.lat,
    lng: fallback.lng,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; guest?: string }>;
}) {
  const { guest } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = !user && guest === "true";

  if (!user && !isGuest) {
    redirect("/bienvenida?redirect=/dashboard");
  }

  const [{ data: categoriesData }, { data: placesData }, { data: storiesData }] =
    await Promise.all([
    supabase.from("place_categories").select("id,slug,name_i18n,icon_name").limit(12),
    supabase
      .from("places")
      .select(
        "id,slug,name_i18n,description_i18n,aggregated_rating,lat,lng,place_categories(name_i18n,icon_name,slug),regions(id,name_i18n,slug)"
      )
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("aggregated_rating", { ascending: false })
      .limit(24),
    supabase
      .from("stories")
      .select(
        "id,slug,title_i18n,summary_i18n,audio_storage_path,featured,created_at,regions(name_i18n,slug)"
      )
      .eq("status", "published")
      .eq("moderation_status", "approved")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const categories = (categoriesData ?? []) as Category[];
  const places = ((placesData ?? []) as Place[]).map(withFallbackCoordinates);
  const featuredStories = shuffle((storiesData ?? []) as Story[]);
  const shuffledPlaces = shuffle(places);
  const sliderItems: ImageAutoSliderItem[] =
    shuffledPlaces.length > 0
      ? shuffledPlaces.slice(0, 12).map((place, index) => {
          const category = firstRelation(place.place_categories);
          const region = firstRelation(place.regions);

          return {
            id: place.id,
            title: getText(place.name_i18n, place.slug),
            description: getText(place.description_i18n, "Destino cultural de Honduras."),
            href: `/places/${place.slug}`,
            imageUrl: UNSPLASH_IMAGE_POOL[index % UNSPLASH_IMAGE_POOL.length],
            category: category ? getText(category.name_i18n, "") : undefined,
            rating: typeof place.aggregated_rating === "number" ? Number(place.aggregated_rating) : null,
            badge: region ? getText(region.name_i18n, "Honduras") : "Honduras",
          };
        })
      : FALLBACK_DESTINATIONS.map((fallback, index) => ({
          id: fallback.id,
          title: fallback.title,
          description: fallback.description,
          href: `/places/${fallback.slug}`,
          imageUrl: UNSPLASH_IMAGE_POOL[index % UNSPLASH_IMAGE_POOL.length],
          category: fallback.category,
          badge: fallback.badge,
        }));

  const mapPlaces: DashboardHomeMapPlace[] =
    places.length > 0
      ? (places as DashboardHomeMapPlace[])
      : FALLBACK_DESTINATIONS.map((item) => ({
          id: item.id,
          slug: item.slug,
          name_i18n: { es: item.title },
          aggregated_rating: null,
          lat: item.lat,
          lng: item.lng,
          place_categories: { name_i18n: { es: item.category }, icon_name: null, slug: null },
          regions: { id: null, slug: item.badge.toLowerCase().replace(/\s+/g, "-"), name_i18n: { es: item.badge } },
        }));

  return (
    <main className="min-h-screen w-full bg-[#f0f5f2]">
      <section className="mx-auto w-full max-w-6xl px-6 pt-8 md:px-10 md:pt-10">
        <DashboardHero />
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-6 md:mt-12 md:px-10">
        <h2 className="font-jakarta text-2xl font-bold text-[#171d1c] md:text-3xl">
          Explorar por categoría
        </h2>
        <div className="relative mt-6 px-4">
          <CategoryCarousel categories={categories} isGuest={isGuest} />
        </div>
      </section>

      <DashboardHomeMap places={mapPlaces} isGuest={isGuest} />

      <DashboardHomeStories stories={featuredStories as DashboardHomeStory[]} />

      <section className="mx-auto mt-14 w-full max-w-6xl px-6 pb-36 md:px-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 className="font-jakarta text-2xl font-bold text-[#171d1c] md:text-3xl">
            Destinos destacados
          </h3>
          <Link
            href={isGuest ? "/explore?guest=true" : "/explore"}
            className="font-inter text-sm font-bold text-[#00685f] transition-opacity hover:opacity-80"
          >
            Ver todos →
          </Link>
        </div>

        {sliderItems.length > 0 ? (
          <ImageAutoSlider items={sliderItems} durationSeconds={28} />
        ) : (
          <div className="rounded-xl border border-[#dee4e1] bg-white px-5 py-8 font-inter text-sm text-[#3d4947]">
            Aún no hay destinos destacados publicados.
          </div>
        )}
      </section>

      <DashboardDockDemo isGuest={isGuest} />
    </main>
  );
}

