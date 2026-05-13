import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExploreDashboardShell } from "@/components/dashboard/explore-dashboard-shell";

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

  return (
    <ExploreDashboardShell
      places={(places ?? []) as never}
      categories={(categories ?? []) as never}
      isGuest={isGuest}
      initialQuery={q}
      initialCategory={category}
    />
  );
}
