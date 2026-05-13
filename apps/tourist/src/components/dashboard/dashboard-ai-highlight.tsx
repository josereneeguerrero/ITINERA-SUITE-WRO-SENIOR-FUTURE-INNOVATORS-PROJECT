"use client";

import { Sparkles, ArrowRight } from "lucide-react";

const DEMO_CHIPS = [
  "¿Qué ver en Copán?",
  "Plan para un día",
  "Lugares baratos",
  "Historia Maya",
];

export function DashboardAIHighlight({ onOpenAI }: { onOpenAI?: () => void }) {
  return (
    <div
      className="rounded-2xl overflow-hidden mt-4"
      style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Left: description */}
        <div
          className="flex-1 p-5"
          style={{ borderLeft: "4px solid #0D9488" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(13,148,136,0.08)" }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#0D9488" }} />
            </div>
            <span
              className="font-inter font-semibold text-[10px] uppercase tracking-widest"
              style={{ color: "#0D9488" }}
            >
              ITINERA IA
            </span>
          </div>
          <h3 className="font-jakarta font-semibold text-base text-[#0F172A] mb-1">
            Habla con tu guía cultural
          </h3>
          <p className="font-inter text-sm leading-relaxed mb-3" style={{ color: "#64748B" }}>
            Busca lugares, arma rutas y descubre historias — todo en una conversación.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={onOpenAI}
                className="font-inter text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                style={{ border: "1px solid rgba(13,148,136,0.3)", color: "#0D9488", backgroundColor: "rgba(13,148,136,0.04)" }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Right: CTA */}
        <div
          className="flex items-center justify-center px-6 py-4 lg:border-l shrink-0"
          style={{ borderColor: "#E2E8F0" }}
        >
          <button
            onClick={onOpenAI}
            className="flex items-center gap-2 btn-teal font-inter font-semibold text-sm px-5 py-2.5 rounded-xl"
          >
            <Sparkles className="w-4 h-4" />
            Abrir Itinera IA
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
