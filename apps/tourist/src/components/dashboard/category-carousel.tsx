"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Landmark, Trees, Utensils, Tent, Church, Waves, Palette, ChevronLeft, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { getCategoryColor, getCategoryKey } from "@/lib/category-theme";

type Category = {
  id: string;
  slug: string;
  name_i18n: Record<string, string> | null;
  icon_name: string | null;
};

const iconBySlug: Record<string, LucideIcon> = {
  heritage:  Landmark,
  nature:    Trees,
  food:      Utensils,
  adventure: Tent,
  religion:  Church,
  beach:     Waves,
  arts:      Palette,
};

function getText(value: Record<string, string> | null | undefined, fallback: string) {
  return value?.es ?? value?.en ?? fallback;
}

export function CategoryCarousel({
  categories,
  isGuest,
}: {
  categories: Category[];
  isGuest: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const SCROLL_AMOUNT = 640;

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [update]);

  function scroll(dir: "prev" | "next") {
    trackRef.current?.scrollBy({ left: dir === "next" ? SCROLL_AMOUNT : -SCROLL_AMOUNT, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {/* Left arrow */}
      <button
        onClick={() => scroll("prev")}
        aria-label="Anterior"
        className={`absolute -left-4 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-[#d7e2de] bg-white shadow-md transition-all duration-200 hover:border-[#0D9488] hover:text-[#0D9488] ${canPrev ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Track — hidden scrollbar */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`.cat-track::-webkit-scrollbar { display: none; }`}</style>

        {categories.map((cat) => {
          const label      = getText(cat.name_i18n, cat.slug);
          const categoryKey = getCategoryKey({ slug: cat.slug, iconName: cat.icon_name, label });
          const Icon       = iconBySlug[categoryKey] ?? iconBySlug[cat.slug] ?? Landmark;
          const color      = getCategoryColor({ slug: cat.slug, iconName: cat.icon_name, label });
          const href       = isGuest
            ? `/explore?guest=true&category=${cat.slug}`
            : `/explore?category=${cat.slug}`;

          return (
            <Link
              key={cat.id}
              href={href}
              title={`Ver lugares de ${label} en el mapa`}
              className="group relative flex min-h-28 min-w-[160px] shrink-0 flex-col items-center justify-center rounded-xl bg-white px-4 py-5 shadow-sm transition-all duration-200 hover:-translate-y-1.5 hover:shadow-lg cursor-pointer active:scale-95"
              style={{ border: `1px solid ${color}44` }}
            >
              <span
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-115 group-hover:shadow-md"
                style={{ backgroundColor: `${color}1F`, color }}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-center font-inter text-sm font-semibold text-[#171d1c]">
                {label}
              </span>
              {/* Map hint badge — visible on hover */}
              <span
                className="absolute top-2 right-2 rounded-full px-1.5 py-0.5 font-inter text-[9px] font-bold uppercase tracking-wide opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ backgroundColor: `${color}18`, color }}
              >
                Ver mapa →
              </span>
              <span
                className="absolute inset-x-4 bottom-0 h-[3px] rounded-t-full transition-all duration-200 group-hover:inset-x-1"
                style={{ backgroundColor: `${color}A6` }}
              />
            </Link>
          );
        })}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll("next")}
        aria-label="Siguiente"
        className={`absolute -right-4 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-[#d7e2de] bg-white shadow-md transition-all duration-200 hover:border-[#0D9488] hover:text-[#0D9488] ${canNext ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
