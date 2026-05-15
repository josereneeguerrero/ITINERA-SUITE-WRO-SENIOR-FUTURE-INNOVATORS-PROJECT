import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const revalidate = 0;
import { Navbar } from "@/components/layout/navbar";
import { AIFloatingButton } from "@/components/ai/ai-floating-button";
import { Footer } from "@/components/layout/footer";
import { StoryDetail } from "@/components/stories/story-detail";

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase  = await createClient();

  const { data: story } = await supabase
    .from("stories")
    .select(`
      id, slug, title_i18n, summary_i18n,
      body_markdown_i18n, audio_storage_path, featured,
      regions(name_i18n, slug),
      story_places(places(id, slug, name_i18n, aggregated_rating, place_categories(name_i18n, icon_name)))
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!story) notFound();

  // Related stories from same region
  const regionSlug = (story.regions as unknown as { slug: string } | null)?.slug;
  const { data: related } = regionSlug
    ? await supabase
        .from("stories")
        .select("id, slug, title_i18n, summary_i18n, audio_storage_path")
        .eq("status", "published")
        .neq("id", story.id)
        .limit(3)
    : { data: [] };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <StoryDetail
        story={story as never}
        related={(related ?? []) as never}
      />
      <Footer />
      <AIFloatingButton
        context={{
          page: "story",
          storySlug: slug,
          storyTitle: (story.title_i18n as Record<string,string>)?.es,
        }}
      />
    </div>
  );
}
