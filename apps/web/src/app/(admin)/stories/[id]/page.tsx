import { createClient } from "@/lib/supabase/server";
import { StoryForm } from "@/components/admin/story-form";
import { notFound } from "next/navigation";

export default async function EditStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: story }, { data: places }, { data: linkedPlaces }] =
    await Promise.all([
      supabase.from("stories").select("*").eq("id", id).single(),
      supabase.from("places").select("id, name_i18n").eq("status", "published"),
      supabase.from("story_places").select("place_id").eq("story_id", id),
    ]);

  if (!story) notFound();

  const title   = story.title_i18n as Record<string, string>;
  const summary = story.summary_i18n as Record<string, string>;
  const body    = story.body_markdown_i18n as Record<string, string>;

  return (
    <StoryForm
      mode="edit"
      storyId={id}
      initialData={{
        title_es:   title?.es ?? "",
        title_en:   title?.en ?? "",
        summary_es: summary?.es ?? "",
        body_es:    body?.es ?? "",
        status:     story.status ?? "draft",
        featured:   story.featured ?? false,
        linkedPlaceIds: (linkedPlaces ?? []).map((lp) => lp.place_id),
      }}
      places={(places ?? []) as { id: string; name_i18n: Record<string, string> }[]}
    />
  );
}
