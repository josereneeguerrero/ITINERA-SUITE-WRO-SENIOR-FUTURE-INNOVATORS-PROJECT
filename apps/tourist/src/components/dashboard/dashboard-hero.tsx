"use client";

import { Typewriter } from "@/components/ui/typewriter";
import { AuroraBackground } from "@/components/ui/aurora-background";

export function DashboardHero() {
  return (
    <AuroraBackground className="h-[260px] rounded-2xl border border-[#d7e2de] md:h-[300px]">
      <div className="relative flex max-w-3xl flex-col items-center px-6 text-center">
        <p className="font-inter text-xs font-semibold uppercase tracking-[0.16em] text-[#00685f]">
          Inicio
        </p>
        <h1 className="mt-3 font-jakarta text-3xl font-bold leading-tight text-[#0f172a] md:text-5xl">
          Bienvenido a Itinera
        </h1>
        {/* Typewriter subtitle */}
        <p className="mt-5 font-inter text-base leading-7 text-[#334155] md:text-lg">
          Tu punto de partida para descubrir{" "}
          <Typewriter
            text={[
              "Lugares Culturales.",
              "Historias Locales.",
              "Rutas Auténticas.",
              "Honduras Profunda.",
              "Contexto Cultural Real.",
            ]}
            speed={55}
            deleteSpeed={30}
            waitTime={2200}
            initialDelay={800}
            cursorChar="_"
            className="font-bold text-[#0D9488]"
            cursorClassName="text-[#0D9488] ml-0.5"
          />
        </p>
      </div>
    </AuroraBackground>
  );
}
