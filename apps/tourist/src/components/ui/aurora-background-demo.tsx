"use client";

import { motion } from "framer-motion";
import React from "react";
import { AuroraBackground } from "@/components/ui/aurora-background";

export function AuroraBackgroundDemo() {
  return (
    <AuroraBackground className="h-[320px] rounded-2xl border border-[#d7e2de]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.55, ease: "easeInOut" }}
        className="relative flex flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <p className="font-inter text-xs font-semibold uppercase tracking-[0.16em] text-[#00685f]">
          Inicio
        </p>
        <h2 className="font-jakarta text-3xl font-bold text-[#0f172a] md:text-5xl">
          Bienvenido a Itinera
        </h2>
        <p className="max-w-2xl font-inter text-sm text-[#334155] md:text-base">
          Tu punto de partida para descubrir lugares, historias y rutas culturales de Honduras.
        </p>
      </motion.div>
    </AuroraBackground>
  );
}

