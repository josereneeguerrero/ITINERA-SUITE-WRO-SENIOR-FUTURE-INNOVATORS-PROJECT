import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FloatingAiAssistant } from "@/components/ui/glowing-ai-chat-assistant";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; guest?: string }>;
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
      <section className="flex min-h-screen items-center justify-center">
        <p className="font-inter text-sm text-[#64748B]">Explorar (mapa) en construcción</p>
      </section>
      <DashboardDockDemo isGuest={isGuest} />
      <div id="ia">
        <FloatingAiAssistant
          context={{ page: "explore" }}
          storageKey="itinera-ai-explore"
        />
      </div>
    </main>
  );
}
