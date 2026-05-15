import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const revalidate = 0;
import { Navbar } from "@/components/layout/navbar";
import { AIFloatingButton } from "@/components/ai/ai-floating-button";
import { PlaceHero } from "@/components/place/place-hero";
import { PlaceContent } from "@/components/place/place-content";
import { PlaceAIPanel } from "@/components/place/place-ai-panel";
import { Footer } from "@/components/layout/footer";

export default async function PlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const [{ data: place }, { data: stories }, { data: reviews }] =
    await Promise.all([
      supabase
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
        .single(),

      supabase
        .from("story_places")
        .select("stories(id, slug, title_i18n, summary_i18n, audio_storage_path)")
        .eq("place_id",
          // we'll resolve place_id after first query — handled via filter below
          "00000000-0000-0000-0000-000000000000"
        )
        .limit(3),

      supabase
        .from("reviews")
        .select("id, rating, body_i18n, source, created_at, profiles(display_name)")
        .eq("moderation_status", "approved")
        .eq("visibility", "full")
        .limit(5),
    ]);

  if (!place) notFound();

  // Fetch stories linked to this specific place
  const { data: linkedStories } = await supabase
    .from("story_places")
    .select("stories(id, slug, title_i18n, summary_i18n, audio_storage_path, status, moderation_status)")
    .eq("place_id", place.id);

  const { data: placeReviews } = await supabase
    .from("reviews")
    .select("id, rating, body_i18n, source, created_at, profiles(display_name)")
    .eq("place_id", place.id)
    .eq("moderation_status", "approved")
    .eq("visibility", "full")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      {/* Hero */}
      <PlaceHero place={place as never} />

      {/* Main content + AI panel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8 items-start">

          {/* Left: content */}
          <div className="flex-1 min-w-0">
            <PlaceContent
              place={place as never}
              stories={(linkedStories ?? []) as never}
              reviews={(placeReviews ?? []) as never}
            />
          </div>

          {/* Right: AI panel (sticky) */}
          <div className="w-[340px] shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <PlaceAIPanel place={place as never} />
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <AIFloatingButton
        context={{
          page: "place",
          placeSlug: slug,
          placeName: (place.name_i18n as Record<string,string>)?.es,
        }}
      />
    </div>
  );
}
