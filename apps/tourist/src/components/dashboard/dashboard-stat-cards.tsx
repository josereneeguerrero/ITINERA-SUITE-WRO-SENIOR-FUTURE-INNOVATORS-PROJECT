import Link from "next/link";
import { MapPin, BookOpen, Sparkles } from "lucide-react";

export function DashboardStatCards({
  totalPlaces,
  totalStories = 0,
}: {
  totalPlaces: number;
  totalStories?: number;
}) {
  const cards = [
    {
      label:  "LUGARES",
      value:  String(totalPlaces || 5),
      sub:    "destinos culturales",
      cta:    "Ver en mapa →",
      href:   "/explore",
      icon:   MapPin,
      color:  "#0D9488",
      iconBg: "rgba(13,148,136,0.10)",
      topBar: "#0D9488",
    },
    {
      label:  "HISTORIAS IA",
      value:  String(totalStories || 0),
      sub:    "narradas con IA",
      cta:    "Leer →",
      href:   "/stories",
      icon:   BookOpen,
      color:  "#D97706",
      iconBg: "rgba(217,119,6,0.10)",
      topBar: "#F59E0B",
    },
    {
      label:  "TU GUÍA IA",
      value:  "∞",
      sub:    "siempre disponible",
      cta:    "Chatear →",
      href:   "/explore#ai",
      icon:   Sparkles,
      color:  "#7C3AED",
      iconBg: "rgba(124,58,237,0.10)",
      topBar: "#7C3AED",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ label, value, sub, cta, href, icon: Icon, color, iconBg, topBar }) => (
        <div
          key={label}
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "white",
            border: "1px solid #E2E8F0",            // neutral border, NOT accent color
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)", // slightly more elevated
          }}
        >
          {/* 4px top accent bar */}
          <div className="h-1" style={{ backgroundColor: topBar }} />

          <div className="p-4">
            {/* Label row + icon circle */}
            <div className="flex items-center justify-between mb-3">
              <p
                className="font-inter font-semibold text-[10px] uppercase tracking-[0.08em]"
                style={{ color: "#94A3B8" }}
              >
                {label}
              </p>
              {/* CIRCLE icon container (not square) */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: iconBg }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>

            {/* Value — 36px PJS Bold */}
            <p
              className="font-jakarta font-bold leading-none mb-1"
              style={{ fontSize: "36px", color }}
            >
              {value}
            </p>

            {/* Sub label */}
            <p
              className="font-inter text-xs mb-3.5"
              style={{ color: "#64748B" }}
            >
              {sub}
            </p>

            {/* CTA link */}
            <Link
              href={href}
              className="font-inter font-semibold text-xs transition-opacity hover:opacity-70"
              style={{ color }}
            >
              {cta}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
