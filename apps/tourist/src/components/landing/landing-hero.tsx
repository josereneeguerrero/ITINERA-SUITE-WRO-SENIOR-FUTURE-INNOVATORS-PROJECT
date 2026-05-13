"use client";

import Link from "next/link";
import { Star } from "lucide-react";

const FLOATING_CARDS = [
  {
    slug:  "ruinas-copan",
    name:  "Ruinas de Copán",
    sub:   "★4.8 · UNESCO",
    color: "linear-gradient(135deg, #0D9488 0%, #064E3B 100%)",
    icon:  "🏛️",
    zIndex: 1,
  },
  {
    slug:  "playa-west-bay-roatan",
    name:  "Playa West Bay",
    sub:   "★4.9 · Roatán",
    color: "linear-gradient(135deg, #0369A1 0%, #0C4A6E 100%)",
    icon:  "🏖️",
    zIndex: 2,
  },
  {
    slug:  "catedral-comayagua",
    name:  "Catedral Comayagua",
    sub:   "★4.6 · Patrimonio",
    color: "linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)",
    icon:  "⛪",
    zIndex: 3,
  },
];

// Cards stack: back rotated left, center slight, front upright
// All cards fan from center so all 3 are visible
const CARD_POSITIONS = [
  { top: "0px",   left: "10px",  rotate: "-7deg", scale: "0.88", shadow: "0 6px 18px rgba(0,0,0,0.12)" },
  { top: "30px",  left: "40px",  rotate: "-2deg", scale: "0.95", shadow: "0 10px 28px rgba(0,0,0,0.14)" },
  { top: "60px",  left: "70px",  rotate:  "2deg", scale: "1",    shadow: "0 20px 40px rgba(0,0,0,0.18)" },
];

export function LandingHero() {
  return (
    <section className="pt-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

          {/* Left: Content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 font-inter font-semibold text-xs tracking-wide"
              style={{ backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#92400E" }}
            >
              ✦ HONDURAS · IA CULTURAL
            </div>

            {/* H1 */}
            <h1
              className="font-jakarta font-bold leading-[1.08] mb-4"
              style={{ fontSize: "clamp(34px, 5vw, 60px)", letterSpacing: "-0.02em", color: "#0F172A" }}
            >
              Descubre Honduras<br />como nunca antes.
            </h1>

            {/* Subtitle */}
            <p
              className="font-inter text-lg mb-2 max-w-xl mx-auto lg:mx-0"
              style={{ color: "#64748B", lineHeight: "1.6" }}
            >
              Guiado por IA. Narrado por la historia. Diseñado para ti.
            </p>

            {/* Stats */}
            <p className="font-inter text-sm mb-7" style={{ color: "#94A3B8" }}>
              5 destinos · 2 historias · 1 guía IA
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start">
              <Link
                href="/bienvenida?redirect=/explore"
                className="btn-teal font-inter font-semibold text-sm px-6 py-3 rounded-xl inline-flex items-center gap-2"
              >
                Explorar ahora →
              </Link>
              <Link
                href="/bienvenida?redirect=/stories"
                className="btn-ghost-teal font-inter font-semibold text-sm px-6 py-3 rounded-xl inline-flex items-center gap-2"
              >
                Ver historias
              </Link>
            </div>
          </div>

          {/* Right: Floating cards stack — visible on desktop */}
          <div className="shrink-0 relative hidden lg:block" style={{ width: "360px", height: "280px" }}>
            {FLOATING_CARDS.map((card, i) => {
              const pos = CARD_POSITIONS[i];
              return (
                <Link
                  key={card.slug}
                  href={`/places/${card.slug}`}
                  className="absolute rounded-2xl overflow-hidden"
                  style={{
                    width: "220px",
                    top: pos.top,
                    left: pos.left,
                    zIndex: card.zIndex,
                    transform: `rotate(${pos.rotate}) scale(${pos.scale})`,
                    transformOrigin: "center top",
                    boxShadow: pos.shadow,
                    transition: "transform 0.25s ease, box-shadow 0.25s ease, z-index 0s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = `rotate(0deg) scale(1.03)`;
                    el.style.boxShadow = "0 24px 48px rgba(0,0,0,0.22)";
                    el.style.zIndex = "10";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = `rotate(${pos.rotate}) scale(${pos.scale})`;
                    el.style.boxShadow = pos.shadow;
                    el.style.zIndex = String(card.zIndex);
                  }}
                >
                  {/* Card image */}
                  <div
                    className="h-32 flex items-center justify-center text-4xl"
                    style={{ background: card.color }}
                  >
                    {card.icon}
                  </div>
                  {/* Card content */}
                  <div className="bg-white px-3.5 py-3">
                    <p className="font-jakarta font-semibold text-[14px] text-[#0F172A] truncate">
                      {card.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-inter text-xs" style={{ color: "#64748B" }}>
                        {card.sub.replace("★", "").trim()}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Mobile: horizontal card strip */}
          <div className="flex lg:hidden gap-3 overflow-x-auto no-scrollbar pb-1 w-full">
            {FLOATING_CARDS.map((card) => (
              <Link
                key={card.slug}
                href={`/places/${card.slug}`}
                className="shrink-0 w-44 rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
              >
                <div className="h-20 flex items-center justify-center text-2xl"
                  style={{ background: card.color }}>
                  {card.icon}
                </div>
                <div className="bg-white p-2.5">
                  <p className="font-jakarta font-semibold text-xs text-[#0F172A] truncate">{card.name}</p>
                  <p className="font-inter text-[10px] mt-0.5" style={{ color: "#94A3B8" }}>{card.sub}</p>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
