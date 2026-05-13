import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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
      <section className="mx-auto w-full max-w-6xl px-6 pt-16 pb-10 md:px-10 md:pt-20">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Bienvenido a Itinera
          </h1>
          <p className="mt-4 text-base text-slate-600 md:text-lg">
            Tu punto de partida para descubrir lugares, historias y rutas
            culturales de Honduras.
          </p>
          <div className="mt-7 flex flex-col items-start gap-3">
            <Link
              href={isGuest ? "/explore?guest=true" : "/explore"}
              className="inline-flex items-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Ir a Explorar
            </Link>
            <Link
              href="/stories"
              className="text-sm font-semibold text-teal-700 transition-colors hover:text-teal-800"
            >
              Ver historias
            </Link>
          </div>
        </div>
      </section>
      <DashboardDockDemo isGuest={isGuest} />
      <div id="ia">
        <FloatingAiAssistant />
      </div>
    </main>
  );
}
