import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExploreDashboardShell } from "@/components/dashboard/explore-dashboard-shell";

const FALLBACK_COORDS: Record<string, { lat: number; lng: number }> = {
  "ruinas-copan": { lat: 14.8383, lng: -89.1422 },
  "catedral-comayagua": { lat: 14.4607, lng: -87.6375 },
  "parque-nacional-cusuco": { lat: 15.4833, lng: -88.231 },
  "playa-west-bay-roatan": { lat: 16.3198, lng: -83.9669 },
  "parque-nacional-la-tigra": { lat: 14.1167, lng: -87.0833 },
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; guest?: string }>;
}) {
  const { q, category, guest } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = !user && guest === "true";

  if (!user && !isGuest) {
    redirect("/bienvenida?redirect=/explore");
  }

  const [{ data: places }, { data: categories }] = await Promise.all([
    supabase
      .from("places")
      .select(
        `
        id, slug, name_i18n, description_i18n, ai_summary_i18n,
        aggregated_rating, review_count, local_favorite, featured, price_level, accessibility,
        place_categories(name_i18n, icon_name, slug),
        regions(name_i18n, slug)
      `
      )
      .eq("status", "published")
      .order("aggregated_rating", { ascending: false }),
    supabase
      .from("place_categories")
      .select("id, slug, name_i18n, icon_name")
      .order("sort_order"),
  ]);

  const placesWithCoords = await Promise.all(
    (places ?? []).map(async (place) => {
      const { data: coords } = await supabase.rpc("get_place_coords", { p_id: place.id });
      const first = Array.isArray(coords) ? coords[0] : null;
      const fallback = FALLBACK_COORDS[place.slug];
      return {
        ...place,
        lat: typeof first?.lat === "number" ? first.lat : fallback?.lat ?? null,
        lng: typeof first?.lng === "number" ? first.lng : fallback?.lng ?? null,
      };
    })
  );

  const heritageCategory = (categories ?? []).find((c) => c.slug === "heritage")
    ?? (categories ?? []).find((c) => c.slug.toLowerCase().includes("patrimonio"))
    ?? null;

  return (
    <ExploreDashboardShell
      places={placesWithCoords as never}
      categories={(categories ?? []) as never}
      isGuest={isGuest}
      userId={user?.id ?? null}
      heritageCategorySlug={heritageCategory?.slug ?? null}
      initialQuery={q}
      initialCategory={category}
    />
  );
}
