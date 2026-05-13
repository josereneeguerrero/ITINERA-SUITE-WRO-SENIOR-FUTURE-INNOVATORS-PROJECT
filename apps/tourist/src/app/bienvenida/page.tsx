import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  LogIn,
  MapPin,
  Sparkles,
  Star,
  UserPlus,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BienvenidaPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirect = params.redirect ?? "/dashboard";
  const guestUrl = `${redirect}${redirect.includes("?") ? "&" : "?"}guest=true`;

  return (
    <main className="itinera-topo relative min-h-screen overflow-hidden bg-[#0A0F0F] px-4 pb-8 pt-24 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(13,148,136,0.24),transparent_35%),radial-gradient(circle_at_80%_88%,rgba(245,158,11,0.12),transparent_36%)]" />

      <header className="absolute left-0 right-0 top-0 z-20 border-b border-white/10 bg-[#0A0F0F]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="font-jakarta text-xl font-bold text-[#89f5e7] transition-opacity duration-200 hover:opacity-85"
          >
            Itinera
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-inter text-sm font-semibold text-white/72 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-stretch">
        <article className="itinera-reveal flex-1 rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-3 py-1.5 font-inter text-xs font-bold uppercase tracking-[0.16em] text-[#F59E0B]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Honduras te espera
          </div>

          <h1 className="mt-6 max-w-xl text-balance font-jakarta text-[36px] font-extrabold leading-[1.08] text-white sm:text-[46px]">
            Empieza a descubrir Honduras con contexto cultural real
          </h1>

          <p className="mt-5 max-w-2xl font-inter text-base leading-7 text-white/72">
            Crea tu cuenta para guardar favoritos, construir rutas y conversar con Itinera IA durante todo tu viaje.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: MapPin, text: "Destinos culturales publicados" },
              { icon: BookOpen, text: "Historias locales validadas" },
              { icon: Star, text: "Asistente IA contextual" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="rounded-xl border border-white/12 bg-white/[0.03] p-4"
              >
                <Icon className="h-4 w-4 text-[#89f5e7]" aria-hidden="true" />
                <p className="mt-2 font-inter text-xs leading-5 text-white/72">{text}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="itinera-reveal w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-5 lg:w-[430px]">
          <div className="space-y-3">
            <Link
              href={`/register?redirect=${encodeURIComponent(redirect)}`}
              className="group flex w-full items-center justify-between gap-3 rounded-xl bg-[#00685f] px-4 py-4 text-white shadow-lg shadow-teal-950/30 transition-colors duration-200 hover:bg-[#008378]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/18">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-left">
                  <span className="block font-inter text-sm font-bold">Crear cuenta gratis</span>
                  <span className="block font-inter text-xs text-white/72">Tarda menos de 1 minuto</span>
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-white/75 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>

            <Link
              href={`/login?redirect=${encodeURIComponent(redirect)}`}
              className="group flex w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-4 text-white transition-colors duration-200 hover:bg-white/[0.08]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/12">
                  <LogIn className="h-4 w-4 text-[#89f5e7]" aria-hidden="true" />
                </span>
                <span className="text-left">
                  <span className="block font-inter text-sm font-bold">Ya tengo cuenta</span>
                  <span className="block font-inter text-xs text-white/68">Iniciar sesion</span>
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-white/72 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-white/16" />
              <span className="font-inter text-xs text-white/55">o</span>
              <div className="h-px flex-1 bg-white/16" />
            </div>

            <Link
              href={guestUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 font-inter text-sm font-semibold text-white/80 transition-colors duration-200 hover:bg-white/[0.07] hover:text-white"
            >
              Continuar como invitado
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <p className="mt-5 text-center font-inter text-[11px] leading-5 text-white/52">
            Al registrarte aceptas los terminos de uso de Itinera.
          </p>
        </aside>
      </section>

      <footer className="relative z-10 mt-10 text-center">
        <p className="font-inter text-[11px] text-white/45">
          WRO 2026 · INNOVAKERS · UNICAH · Honduras
        </p>
      </footer>
    </main>
  );
}
