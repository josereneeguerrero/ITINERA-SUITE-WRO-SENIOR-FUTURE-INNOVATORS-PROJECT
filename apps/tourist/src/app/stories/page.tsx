import { createClient } from "@/lib/supabase/server";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";
import { FloatingAiAssistant } from "@/components/ui/glowing-ai-chat-assistant";
import { StoriesHero } from "@/components/stories/stories-hero";
import { StoriesGrid } from "@/components/stories/stories-grid";

export const revalidate = 0;

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; guest?: string }>;
}) {
  const { region, guest } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const isGuest = !user && guest === "true";

  const { data: regions } = await supabase
    .from("regions")
    .select("id, slug, name_i18n")
    .order("sort_order");

  let regionId: string | null = null;
  if (region) {
    const found = regions?.find((r) => r.slug === region);
    regionId = found?.id ?? null;
  }

  let query = supabase
    .from("stories")
    .select("id, slug, title_i18n, summary_i18n, audio_storage_path, featured, created_at, region_id, regions(id, slug, name_i18n)")
    .eq("status", "published")
    .eq("moderation_status", "approved")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (regionId) query = query.eq("region_id", regionId);

  const { data: stories } = await query;
  const featured = stories?.find((s) => s.featured) ?? stories?.[0] ?? null;

  return (
    <main className="min-h-screen w-full bg-[#f0f5f2] pb-28">
      <section className="mx-auto w-full max-w-6xl px-6 pt-8 md:px-10 md:pt-10">
        <StoriesHero featured={featured as never} />
      </section>
      <section className="mx-auto mt-10 w-full max-w-6xl px-6 md:px-10">
        <StoriesGrid
          stories={(stories ?? []) as never}
          regions={(regions ?? []) as never}
          activeRegion={region}
          isGuest={isGuest}
        />
      </section>
      <DashboardDockDemo isGuest={isGuest} />
      <FloatingAiAssistant context={{ page: "stories" }} />
    </main>
  );
}
