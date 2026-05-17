import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";
import { FloatingAiAssistant } from "@/components/ui/glowing-ai-chat-assistant";
import { StoryDetail } from "@/components/stories/story-detail";

export const revalidate = 0;

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const isGuest = !user;

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

  const { data: related } = await supabase
    .from("stories")
    .select("id, slug, title_i18n, summary_i18n, audio_storage_path")
    .eq("status", "published")
    .eq("moderation_status", "approved")
    .neq("id", story.id)
    .limit(3);

  return (
    <main className="min-h-screen w-full bg-[#f0f5f2] pb-28">
      <StoryDetail
        story={story as never}
        related={(related ?? []) as never}
        isGuest={isGuest}
      />
      <DashboardDockDemo isGuest={isGuest} />
      <FloatingAiAssistant
        context={{
          page: "story",
          storySlug: slug,
          storyTitle: (story.title_i18n as Record<string, string>)?.es,
        }}
      />
    </main>
  );
}
