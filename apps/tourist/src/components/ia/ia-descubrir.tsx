"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Church, Compass, Flame, Landmark, Leaf,
  Mountain, Palette, RefreshCw, Star, TreePine, Users,
  Utensils, Waves, Zap,
} from "lucide-react";
import type { DiscoverCard } from "@/app/api/discover/route";

// ── Mood definitions ───────────────────────────────────────────────────────────

const MOODS = [
  { id: "Aventura",        label: "Aventura",        icon: Zap,       color: "text-amber-500",  bg: "bg-amber-50",  border: "border-amber-200"  },
  { id: "Historia Viva",   label: "Historia Viva",   icon: Landmark,  color: "text-stone-500",  bg: "bg-stone-50",  border: "border-stone-200"  },
  { id: "Misterio Maya",   label: "Misterio Maya",   icon: Flame,     color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200" },
  { id: "Mar & Playa",     label: "Mar & Playa",     icon: Waves,     color: "text-sky-500",    bg: "bg-sky-50",    border: "border-sky-200"    },
  { id: "Naturaleza",      label: "Naturaleza",      icon: TreePine,  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200"  },
  { id: "Gourmet",         label: "Gourmet",         icon: Utensils,  color: "text-rose-500",   bg: "bg-rose-50",   border: "border-rose-200"   },
  { id: "Fe & Espíritu",   label: "Fe & Espíritu",   icon: Church,    color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200" },
  { id: "Arte & Cultura",  label: "Arte & Cultura",  icon: Palette,   color: "text-pink-500",   bg: "bg-pink-50",   border: "border-pink-200"   },
  { id: "Paisajes Épicos", label: "Paisajes Épicos", icon: Mountain,  color: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-200" },
  { id: "En Familia",      label: "En Familia",      icon: Users,     color: "text-teal-600",   bg: "bg-teal-50",   border: "border-teal-200"   },
] as const;

// Category slug → Lucide icon
const CAT_ICON: Record<string, React.ElementType> = {
  heritage:  Landmark,
  nature:    Leaf,
  food:      Utensils,
  beach:     Waves,
  adventure: Zap,
  religion:  Church,
  arts:      Palette,
};

// ── Component ──────────────────────────────────────────────────────────────────

export function IaDescubrir({
  onPlanWith,
}: {
  onPlanWith?: (interests: string[]) => void;
}) {
  const [selected,  setSelected]  = useState<string[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [cards,         setCards]         = useState<DiscoverCard[]>([]);
  const [plannerInterests, setPlannerInterests] = useState<string[]>([]);
  const [missingMoods,  setMissingMoods]  = useState<string[]>([]);
  const [error,         setError]         = useState<string | null>(null);
  const [hasResult,     setHasResult]     = useState(false);

  function toggleMood(id: string) {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(m => m !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
  }

  async function handleDiscover() {
    if (selected.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setCards([]);
    setHasResult(false);

    try {
      const res  = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moods: selected }),
      });
      const data = await res.json() as {
        cards?: DiscoverCard[];
        plannerInterests?: string[];
        missingMoods?: string[];
        error?: string;
        message?: string;
      };

      if (data.error && data.error !== "no_places") {
        setError(data.message ?? data.error);
      } else if (!data.cards || data.cards.length === 0) {
        setError(data.message ?? "No encontramos lugares para esa combinación. Prueba otros moods.");
      } else {
        setCards(data.cards);
        setPlannerInterests(data.plannerInterests ?? []);
        setMissingMoods(data.missingMoods ?? []);
        setHasResult(true);
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setCards([]);
    setHasResult(false);
    setError(null);
    setPlannerInterests([]);
    setMissingMoods([]);
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-28 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0D9488]/10">
            <Compass className="h-6 w-6 text-[#0D9488]" aria-hidden />
          </div>
          <h2 className="font-jakarta text-xl font-bold text-[#0f172a]">Descubre Honduras</h2>
          <p className="mt-1.5 font-inter text-sm text-[#64748b]">
            ¿Qué tipo de experiencia buscas hoy?{" "}
            <span className="text-[#94a3b8]">Elige hasta 3 moods.</span>
          </p>
        </div>

        {/* ── Mood pills ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-2">
          {MOODS.map(({ id, label, icon: Icon, color, bg, border }) => {
            const active = selected.includes(id);
            const maxed  = selected.length >= 3 && !active;
            return (
              <button
                key={id}
                type="button"
                disabled={maxed}
                onClick={() => toggleMood(id)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 font-inter text-sm font-semibold transition-all duration-150 ${
                  active
                    ? `${bg} ${border} ${color} shadow-sm`
                    : maxed
                      ? "border-[#e2e8f0] bg-[#f8fafc] text-[#cbd5e1] cursor-not-allowed"
                      : "border-[#d7e2de] bg-white text-[#475569] hover:border-[#0D9488]/40 hover:text-[#0D9488]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── CTA button ─────────────────────────────────────────────────── */}
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={hasResult ? handleReset : handleDiscover}
            disabled={selected.length === 0 || loading}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#0D9488] px-6 py-2.5 font-inter text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#0f766e] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                Descubriendo...
              </>
            ) : hasResult ? (
              <>
                <RefreshCw className="h-4 w-4" aria-hidden />
                Descubrir de nuevo
              </>
            ) : (
              <>
                <Compass className="h-4 w-4" aria-hidden />
                Descubrir
              </>
            )}
          </button>
        </div>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center font-inter text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Missing moods notice ───────────────────────────────────────── */}
        {missingMoods.length > 0 && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 font-inter text-xs text-amber-700">
            <span className="font-semibold">Sin resultados aún para:</span>{" "}
            {missingMoods.join(", ")} — estamos agregando más contenido pronto.
          </div>
        )}

        {/* ── Cards grid ─────────────────────────────────────────────────── */}
        {cards.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {cards.map((card) => {
                const CatIcon = CAT_ICON[card.categorySlug] ?? Landmark;
                return (
                  <div
                    key={card.slug}
                    className="group flex flex-col rounded-2xl border border-[#d7e2de] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0D9488]/30 hover:shadow-md overflow-hidden"
                  >
                    {/* Image slot — shows photo when available, elegant placeholder when not */}
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="h-36 w-full object-cover"
                      />
                    ) : (
                      <div className="h-28 w-full bg-gradient-to-br from-[#f0f5f2] to-[#e2ede9] flex items-center justify-center">
                        <CatIcon className="h-8 w-8 text-[#0D9488]/30" aria-hidden />
                      </div>
                    )}

                    <div className="flex flex-col gap-2 p-4">
                      {/* Category + mood tag + rating */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-inter text-xs font-semibold text-[#0D9488]">
                            {card.category}
                          </span>
                          {card.matchedMood && (
                            <span className="rounded-full bg-[#0D9488]/8 px-2 py-0.5 font-inter text-[10px] font-semibold text-[#0D9488]">
                              {card.matchedMood}
                            </span>
                          )}
                        </div>
                        {card.rating > 0 && (
                          <div className="flex items-center gap-1 font-inter text-xs font-semibold text-amber-500">
                            <Star className="h-3 w-3 fill-current" aria-hidden />
                            {card.rating.toFixed(1)}
                          </div>
                        )}
                      </div>

                      {/* Name + region */}
                      <div>
                        <p className="font-jakarta text-sm font-bold text-[#0f172a] group-hover:text-[#0D9488] transition-colors leading-snug">
                          {card.name}
                        </p>
                        {card.region && (
                          <p className="mt-0.5 font-inter text-[11px] text-[#94a3b8]">{card.region}</p>
                        )}
                      </div>

                      {/* AI curiosity — short, punchy */}
                      <p className="font-inter text-xs leading-5 text-[#64748b] italic line-clamp-2">
                        {card.curiosity}
                      </p>

                      {/* Action */}
                      <Link
                        href={card.url}
                        className="mt-1 flex cursor-pointer items-center gap-1 self-end font-inter text-xs font-bold text-[#0D9488] transition-all hover:gap-2"
                      >
                        Ver lugar
                        <ArrowRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Planner CTA */}
            {onPlanWith && plannerInterests.length > 0 && (
              <button
                type="button"
                onClick={() => onPlanWith(plannerInterests)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#0D9488]/30 bg-[#0D9488]/5 px-5 py-3 font-inter text-sm font-bold text-[#0D9488] transition-all duration-200 hover:bg-[#0D9488]/10"
              >
                Planificar con estos destinos
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </>
        )}

      </div>
    </div>
  );
}
