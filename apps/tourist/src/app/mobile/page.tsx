import { Smartphone, Monitor, Globe } from "lucide-react";
import Link from "next/link";

export default function MobilePage() {
  return (
    <main className="min-h-screen bg-[#f0f5f2] flex flex-col items-center justify-center px-6 text-center">

      {/* Logo */}
      <div className="mb-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0D9488]">
          <span className="font-jakarta text-2xl font-bold text-white">I</span>
        </div>
        <p className="mt-3 font-jakarta text-xl font-bold text-[#0f172a]">Itinera</p>
        <p className="font-inter text-sm text-[#64748b]">Honduras · WRO 2026</p>
      </div>

      {/* Main message */}
      <div className="w-full max-w-sm rounded-2xl border border-[#d7e2de] bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0D9488]/10">
          <Smartphone className="h-7 w-7 text-[#0D9488]" />
        </div>

        <h1 className="font-jakarta text-xl font-bold text-[#0f172a]">
          App móvil próximamente
        </h1>
        <p className="mt-3 font-inter text-sm leading-relaxed text-[#64748b]">
          Estamos desarrollando la aplicación móvil nativa de Itinera. Por ahora, la experiencia web completa está optimizada para navegadores de escritorio.
        </p>

        <div className="my-6 h-px bg-[#f1f5f9]" />

        {/* Desktop CTA */}
        <div className="flex items-start gap-3 rounded-xl bg-[#f0f5f2] p-3.5 text-left">
          <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-[#0D9488]" />
          <div>
            <p className="font-inter text-sm font-semibold text-[#0f172a]">
              Abre en tu computadora
            </p>
            <p className="mt-0.5 font-inter text-xs text-[#64748b]">
              Visita <span className="font-semibold text-[#0D9488]">itinera.hn</span> desde Chrome, Safari o Edge en tu escritorio para la experiencia completa.
            </p>
          </div>
        </div>

        {/* Still let them see landing */}
        <a
          href="https://itinera-suite-wro-senior-future-inn.vercel.app"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#d7e2de] bg-white px-4 py-2.5 font-inter text-sm font-semibold text-[#475569] transition-colors hover:border-[#0D9488]/30 hover:text-[#0D9488]"
        >
          <Globe className="h-4 w-4" />
          Abrir en navegador de escritorio
        </a>
      </div>

      {/* Badge */}
      <p className="mt-6 font-inter text-xs text-[#94a3b8]">
        World Robot Olympiad 2026 · Future Innovators · Honduras
      </p>
    </main>
  );
}
