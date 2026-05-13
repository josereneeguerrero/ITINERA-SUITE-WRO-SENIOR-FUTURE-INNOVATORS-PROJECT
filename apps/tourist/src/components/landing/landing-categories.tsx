"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CATEGORIES = [
  { slug: "heritage",  label: "Patrimonio",  icon: "🏛️" },
  { slug: "nature",    label: "Naturaleza",   icon: "🌿" },
  { slug: "food",      label: "Gastronomía",  icon: "🍽️" },
  { slug: "beach",     label: "Playa",        icon: "🏖️" },
  { slug: "adventure", label: "Aventura",     icon: "⚡" },
  { slug: "ai",        label: "IA Recomienda",icon: "✨" },
];

export function LandingCategories() {
  const router  = useRouter();
  const [active, setActive] = useState(""); // "Todos" active by default

  function handleClick(slug: string) {
    setActive(slug);
    if (slug === "ai") {
      router.push("/bienvenida?redirect=/explore");
    } else {
      router.push(`/bienvenida?redirect=${encodeURIComponent(`/explore?category=${slug}`)}`);
    }
  }

  return (
    <section
      className="bg-white border-y"
      style={{ borderColor: "#E2E8F0" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Todos pill */}
          <button
            onClick={() => { setActive(""); router.push("/explore?guest=true"); }}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-inter font-medium text-sm transition-all whitespace-nowrap"
            style={active === "" ? { backgroundColor: "#0D9488", color: "white" } : { backgroundColor: "#F8FAFC", color: "#64748B", border: "1px solid #E2E8F0" }}
          >
            Todos
          </button>

          {CATEGORIES.map(({ slug, label, icon }) => {
            const isActive = active === slug;
            return (
              <button
                key={slug}
                onClick={() => handleClick(slug)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-inter font-medium text-sm transition-all whitespace-nowrap"
                style={
                  isActive
                    ? { backgroundColor: "#0D9488", color: "white" }
                    : { backgroundColor: "#F8FAFC", color: "#64748B", border: "1px solid #E2E8F0" }
                }
              >
                <span className="text-sm">{icon}</span>
                {label}
                {isActive && (
                  <span
                    className="w-1 h-1 rounded-full bg-white/60 ml-0.5"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
