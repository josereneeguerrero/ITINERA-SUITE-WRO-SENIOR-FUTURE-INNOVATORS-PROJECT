import { createClient } from "@/lib/supabase/server";
import { PlaceForm } from "@/components/admin/place-form";

export default async function NewPlacePage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: regions }] = await Promise.all([
    supabase.from("place_categories").select("id, name_i18n").order("sort_order"),
    supabase.from("regions").select("id, name_i18n").order("sort_order"),
  ]);

  return (
    <PlaceForm
      mode="create"
      categories={(categories ?? []) as { id: string; name_i18n: Record<string, string> }[]}
      regions={(regions ?? []) as { id: string; name_i18n: Record<string, string> }[]}
    />
  );
}
