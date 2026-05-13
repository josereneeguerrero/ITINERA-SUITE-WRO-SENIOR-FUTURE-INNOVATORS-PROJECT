import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Heart, Sparkles } from "lucide-react";

export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/bienvenida?redirect=/profile/saved");

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0D9488]/10">
            <Heart className="h-5 w-5 text-[#0D9488]" />
          </div>
          <div>
            <h1 className="font-jakarta text-2xl font-bold text-[#0F172A]">Guardados</h1>
            <p className="font-inter text-sm text-[#64748B]">
              Tus favoritos aparecerán aquí.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#99F6E4] bg-[#F0FDFA] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0F766E]" />
            <p className="font-inter text-sm font-semibold text-[#0F766E]">
              Próximo paso
            </p>
          </div>
          <p className="font-inter text-sm text-[#0F172A]">
            Vamos a conectar el botón Guardar del dashboard con la tabla `favorites`.
          </p>
        </div>

        <Link
          href="/explore"
          className="mt-6 inline-flex rounded-xl bg-[#0D9488] px-4 py-2.5 font-inter text-sm font-semibold text-white"
        >
          Volver a explorar
        </Link>
      </div>
    </main>
  );
}
