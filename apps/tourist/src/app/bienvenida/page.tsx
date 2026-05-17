import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  LogIn,
  Map,
  Route,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";

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
    <main className="relative min-h-screen overflow-hidden bg-[#f0f5f2]">

      {/* Aurora static gradient — same palette as landing hero */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 70% 60% at 10% 15%, rgba(13,148,136,0.16) 0%, transparent 60%)",
            "radial-gradient(ellipse 55% 50% at 90% 80%, rgba(0,104,95,0.12) 0%, transparent 55%)",
            "radial-gradient(ellipse 45% 35% at 60% 95%, rgba(245,158,11,0.06) 0%, transparent 50%)",
          ].join(", "),
        }}
        aria-hidden
      />

      {/* Nav */}
      <header className="relative z-20 flex h-16 items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="cursor-pointer font-jakarta text-lg font-bold text-[#0D9488] transition-opacity hover:opacity-80"
        >
          Itinera
        </Link>
        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-1.5 font-inter text-sm font-semibold text-[#334155] transition-colors hover:text-[#0D9488]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al inicio
        </Link>
      </header>

      {/* Content */}
      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pb-16 pt-8 sm:px-8 lg:flex-row lg:items-center lg:gap-12 lg:pt-12">

        {/* ── Left: value prop ── */}
        <div className="flex-1">
          <BlurFade delay={0.1} inView duration={0.5} yOffset={8}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0D9488]/25 bg-[#0D9488]/10 px-3.5 py-1.5 font-inter text-xs font-bold uppercase tracking-[0.16em] text-[#00685f]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Honduras te espera
            </div>
          </BlurFade>

          <BlurFade delay={0.2} inView duration={0.6} yOffset={10} blur="8px">
            <h1 className="max-w-lg text-balance font-jakarta font-extrabold leading-[1.08] text-[#0f172a]"
              style={{ fontSize: "clamp(30px, 4.5vw, 52px)" }}>
              Empieza a descubrir Honduras con contexto cultural real
            </h1>
          </BlurFade>

          <BlurFade delay={0.3} inView duration={0.5} yOffset={6}>
            <p className="mt-5 max-w-md font-inter text-[15px] leading-7 text-[#334155]">
              Crea tu cuenta para guardar favoritos, construir rutas y conversar con Itinera IA durante todo tu viaje.
            </p>
          </BlurFade>

          <BlurFade delay={0.4} inView duration={0.5} yOffset={6}>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: Map,      label: "Destinos culturales verificados" },
                { icon: BookOpen, label: "Historias narradas con IA" },
                { icon: Route,    label: "Rutas guardables y compartibles" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#d7e2de] bg-white/80 p-4 shadow-sm backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 text-[#0D9488]" aria-hidden />
                  <p className="mt-2 font-inter text-xs leading-5 text-[#334155]">{label}</p>
                </div>
              ))}
            </div>
          </BlurFade>
        </div>

        {/* ── Right: auth card ── */}
        <BlurFade delay={0.25} inView duration={0.6} yOffset={12} blur="6px"
          className="w-full lg:w-[400px] lg:shrink-0">
          <div className="rounded-2xl border border-[#d7e2de] bg-white p-6 shadow-[0_8px_40px_rgba(15,23,42,0.08)] sm:p-7">

            <p className="mb-5 font-jakarta text-lg font-bold text-[#0f172a]">
              Elige cómo continuar
            </p>

            <div className="space-y-3">
              {/* Register */}
              <Link
                href={`/register?redirect=${encodeURIComponent(redirect)}`}
                className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl bg-[#0D9488] px-4 py-3.5 text-white shadow-md shadow-teal-500/20 transition-all duration-200 hover:bg-[#0f766e] hover:shadow-lg hover:shadow-teal-500/25 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                    <UserPlus className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-left">
                    <span className="block font-inter text-sm font-bold">Crear cuenta gratis</span>
                    <span className="block font-inter text-xs text-white/75">Tarda menos de 1 minuto</span>
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-white/80 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
              </Link>

              {/* Login */}
              <Link
                href={`/login?redirect=${encodeURIComponent(redirect)}`}
                className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#d7e2de] bg-[#f0f5f2] px-4 py-3.5 text-[#0f172a] transition-all duration-200 hover:border-[#0D9488]/30 hover:bg-white active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d7e2de] bg-white">
                    <LogIn className="h-4 w-4 text-[#0D9488]" aria-hidden />
                  </span>
                  <span className="text-left">
                    <span className="block font-inter text-sm font-bold">Ya tengo cuenta</span>
                    <span className="block font-inter text-xs text-[#64748b]">Iniciar sesión</span>
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#94a3b8] transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
              </Link>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-[#e2e8f0]" />
                <span className="font-inter text-xs text-[#94a3b8]">o</span>
                <div className="h-px flex-1 bg-[#e2e8f0]" />
              </div>

              {/* Guest */}
              <Link
                href={guestUrl}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#d7e2de] bg-white px-4 py-3 font-inter text-sm font-semibold text-[#334155] transition-all duration-200 hover:border-[#0D9488]/30 hover:text-[#0D9488] active:scale-[0.98]"
              >
                Continuar como invitado
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>

            <p className="mt-5 text-center font-inter text-[11px] leading-5 text-[#94a3b8]">
              Al registrarte aceptas los términos de uso de Itinera.
            </p>
          </div>
        </BlurFade>

      </section>

      {/* Footer */}
      <footer className="relative z-10 pb-8 text-center">
        <p className="font-inter text-[11px] text-[#94a3b8]">
          WRO 2026 · INNOVAKERS · UNICAH · Honduras
        </p>
      </footer>

    </main>
  );
}
