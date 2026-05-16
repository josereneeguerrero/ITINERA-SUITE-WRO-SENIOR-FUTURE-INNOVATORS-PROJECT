import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";
import { AIFloatingButton } from "@/components/ai/ai-floating-button";
import { PlaceHero } from "@/components/place/place-hero";
import { PlaceContent } from "@/components/place/place-content";
import { PlaceAIPanel } from "@/components/place/place-ai-panel";
import { Footer } from "@/components/layout/footer";

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
      .select("id, rating, body_i18n, source, created_at, profiles(display_name)")
      .eq("place_id", place.id)
      .eq("moderation_status", "approved")
      .eq("visibility", "full")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const placeName = (place.name_i18n as Record<string, string>)?.es ?? slug;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* Hero — full width, name inside, no top navbar offset needed */}
      <PlaceHero place={place as never} isGuest={isGuest} />

      {/* Main layout — max-w-6xl centered */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 pb-20">
        <div className="flex gap-8 items-start">

          {/* Left: content (tabs) */}
          <div className="flex-1 min-w-0">
            <PlaceContent
              place={place as never}
              stories={(linkedStories ?? []) as never}
              reviews={(placeReviews ?? []) as never}
            />
          </div>

          {/* Right: AI panel sticky (desktop only) */}
          <aside className="w-[340px] shrink-0 hidden lg:block">
            <div className="sticky top-20">
              <PlaceAIPanel place={place as never} />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile AI panel — shown below content */}
      <div className="lg:hidden mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <PlaceAIPanel place={place as never} />
      </div>

      <Footer />
      <DashboardDockDemo isGuest={isGuest} />
      <AIFloatingButton
        context={{ page: "place", placeSlug: slug, placeName }}
      />
    </div>
  );
}
