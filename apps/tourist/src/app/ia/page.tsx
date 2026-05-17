import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";
import { IaChatCenter } from "@/components/ia/ia-chat-center";

export const revalidate = 0;

export default async function IaPage({
  searchParams,
}: {
  searchParams: Promise<{ guest?: string }>;
}) {
  const { guest } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const isGuest = !user && guest === "true";

  if (!user && !isGuest) {
    redirect("/bienvenida?redirect=/ia");
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#f0f5f2]">
      <IaChatCenter isGuest={isGuest} userName={user?.user_metadata?.full_name ?? null} />
      <DashboardDockDemo isGuest={isGuest} />
    </main>
  );
}
