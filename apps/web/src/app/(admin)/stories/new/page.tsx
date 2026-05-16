import { createClient } from "@/lib/supabase/server";
import { StoryForm } from "@/components/admin/story-form";

export default async function NewStoryPage() {
  const supabase = await createClient();
  const [{ data: places }, { data: regions }] = await Promise.all([
    supabase.from("places").select("id, name_i18n").eq("status", "published").order("created_at", { ascending: false }),
    supabase.from("regions").select("id, name_i18n").order("name_i18n->es"),
  ]);

  return (
    <StoryForm
      mode="create"
      places={(places ?? []) as { id: string; name_i18n: Record<string, string> }[]}
      regions={(regions ?? []) as { id: string; name_i18n: Record<string, string> }[]}
    />
  );
}
