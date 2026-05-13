import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FloatingAiAssistant } from "@/components/ui/glowing-ai-chat-assistant";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";

export default async function DashboardPage({
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
    redirect("/bienvenida?redirect=/dashboard");
  }

  return (
    <main className="min-h-screen w-full bg-white">
      <DashboardDockDemo />
      <FloatingAiAssistant />
    </main>
  );
}
