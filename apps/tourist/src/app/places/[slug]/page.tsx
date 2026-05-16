import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";
import { PlaceHero } from "@/components/place/place-hero";
import { PlaceContent } from "@/components/place/place-content";
import { PlaceAIPanel } from "@/components/place/place-ai-panel";
import { AIFloatingButton } from "@/components/ai/ai-floating-button";

export const revalidate = 0;

export default async function PlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ guest?: string }>;
}) {
  const { slug }  = await params;
  const { guest } = await searchParams;
  const supabase  = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const isGuest = !user && guest === "true";

  const { data: place } = await supabase
    .from("places")
    .select(`
      id, slug, name_i18n, description_i18n,
      ai_summary_i18n, ai_tips_i18n, address_i18n,
      aggregated_rating, review_count,
      price_level, accessibility, local_favorite, featured,
      phone, website, hours,
      place_categories(name_i18n, icon_name),
      regions(name_i18n)
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!place) notFound();

  const [{ data: linkedStories }, { data: placeReviews }] = await Promise.all([
    supabase
      .from("story_places")
      .select("stories(id, slug, title_i18n, summary_i18n, audio_storage_path, status, moderation_status)")
      .eq("place_id", place.id),
    supabase
      .from("reviews")
      .select("id, rating, body_i18n, created_at, profiles(display_name)")
      .eq("place_id", place.id)
      .eq("moderation_status", "approved")
      .eq("visibility", "full")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Flatten category / region
  const cat    = Array.isArray(place.place_categories) ? place.place_categories[0] : place.place_categories;
  const region = Array.isArray(place.regions) ? place.regions[0] : place.regions;
  const name   = (place.name_i18n as Record<string, string>)?.es ?? slug;
  const catName = (cat?.name_i18n as Record<string, string>)?.es ?? "";
  const catSlug = (cat?.icon_name ?? "").toLowerCase();
  const regName = (region?.name_i18n as Record<string, string>)?.es ?? "";

  return (
    // ── Same root pattern as /dashboard ──────────────────────────────────
    <main className="min-h-screen w-full bg-[#f0f5f2] pb-28">

      {/* ── 1. BANNER — AuroraBackground, same as dashboard hero ── */}
      <PlaceHero
        id={place.id}
        slug={slug}
        name={name}
        catName={catName}
        catSlug={catSlug}
        regName={regName}
        rating={Number(place.aggregated_rating ?? 0)}
        reviewCount={place.review_count ?? 0}
        priceLevel={place.price_level ?? 0}
        accessibility={place.accessibility ?? false}
        localFavorite={place.local_favorite ?? false}
        featured={place.featured ?? false}
        isGuest={isGuest}
      />

      {/* ── 2. CONTENT — max-w-6xl like dashboard sections ── */}
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-10 mt-6">
        <div className="flex gap-6 items-start">

          {/* Left — tabs (Info / Historias / Reseñas) */}
          <div className="flex-1 min-w-0">
            <PlaceContent
              place={place as never}
              stories={(linkedStories ?? []) as never}
              reviews={(placeReviews ?? []) as never}
            />
          </div>

          {/* Right — AI Panel sticky (desktop) */}
          <aside className="w-[340px] shrink-0 hidden lg:block">
            <div className="sticky top-6">
              <PlaceAIPanel place={place as never} />
            </div>
          </aside>

        </div>
      </section>

      {/* Mobile — AI panel below content */}
      <section className="lg:hidden mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-10 mt-6">
        <PlaceAIPanel place={place as never} />
      </section>

      {/* ── 3. DOCK — identical to /dashboard ── */}
      <DashboardDockDemo isGuest={isGuest} />
      <AIFloatingButton context={{ page: "place", placeSlug: slug, placeName: name }} />
    </main>
  );
}
