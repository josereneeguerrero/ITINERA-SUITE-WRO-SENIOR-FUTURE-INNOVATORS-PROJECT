import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FloatingAiAssistant } from "@/components/ui/glowing-ai-chat-assistant";
import { Dock } from "@/components/ui/dock-two";
import {
  Home,
  Search,
  Sparkles,
  Heart,
  Plus,
  User,
  Settings,
} from "lucide-react";

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
      <div className="fixed bottom-6 left-1/2 z-[40] w-full -translate-x-1/2 px-4">
        <Dock
          className="h-auto p-0"
          items={[
            { icon: Home, label: "Inicio" },
            { icon: Search, label: "Buscar" },
            { icon: Sparkles, label: "IA" },
            { icon: Heart, label: "Favoritos" },
            { icon: Plus, label: "Nuevo" },
            { icon: User, label: "Perfil" },
            { icon: Settings, label: "Ajustes" },
          ]}
        />
      </div>
      <FloatingAiAssistant />
    </main>
  );
}
