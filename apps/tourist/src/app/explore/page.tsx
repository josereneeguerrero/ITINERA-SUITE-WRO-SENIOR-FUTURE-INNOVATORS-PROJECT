import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";
import { ExploreSearchOnly } from "@/components/dashboard/explore-search-only";
import { FloatingAiAssistant } from "@/components/ui/glowing-ai-chat-assistant";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ guest?: string }>;
}) {
  const { guest } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = !user && guest === "true";

  if (!user && !isGuest) {
    redirect("/bienvenida?redirect=/explore");
  }

  return (
    <main className="min-h-screen w-full bg-white">
      <section className="relative flex min-h-screen items-start justify-center px-4 pt-10">
        <div className="w-full max-w-[640px]">
          <ExploreSearchOnly />
        </div>
      </section>

      <DashboardDockDemo isGuest={isGuest} />
      <div id="ia">
        <FloatingAiAssistant context={{ page: "explore" }} storageKey="itinera-ai-explore" />
      </div>
    </main>
  );
}
