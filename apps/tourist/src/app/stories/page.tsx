import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;
import { Navbar } from "@/components/layout/navbar";

import { AIFloatingButton } from "@/components/ai/ai-floating-button";

import { Footer } from "@/components/layout/footer";

import { StoriesHero } from "@/components/stories/stories-hero";

import { StoriesGrid } from "@/components/stories/stories-grid";


export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const { region } = await searchParams;
  const supabase = await createClient();

  // Fetch regions for filter pills
  const { data: regions } = await supabase
    .from("regions")
    .select("id, slug, name_i18n")
    .order("sort_order");

  // Resolve region slug â†’ id for filtering
  let regionId: string | null = null;
  if (region) {
    const found = regions?.find((r) => r.slug === region);
    regionId = found?.id ?? null;
  }

  // Fetch stories â€” filter by region_id if provided
  let query = supabase
    .from("stories")
    .select(`
      id, slug, title_i18n, summary_i18n,
      audio_storage_path, featured, created_at, region_id,
      regions(id, slug, name_i18n)
    `)
    .eq("status", "published")
    .eq("moderation_status", "approved")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (regionId) {
    query = query.eq("region_id", regionId);
  }

  const { data: stories } = await query;

  // Featured = first featured story (shown in hero AND grid)
  const featured = stories?.find((s) => s.featured) ?? stories?.[0] ?? null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <StoriesHero featured={featured as never} />
      <StoriesGrid
        stories={(stories ?? []) as never}
        regions={(regions ?? []) as never}
        activeRegion={region}
      />
      <Footer />
      <AIFloatingButton context={{ page: "stories" }} />
    </div>
  );
}

