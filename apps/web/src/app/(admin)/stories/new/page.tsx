import { createClient } from "@/lib/supabase/server";
import { StoryForm } from "@/components/admin/story-form";

export default async function NewStoryPage() {
  const supabase = await createClient();
  const { data: places } = await supabase
    .from("places")
    .select("id, name_i18n")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return (
    <StoryForm
      mode="create"
      places={(places ?? []) as { id: string; name_i18n: Record<string, string> }[]}
    />
  );
}
