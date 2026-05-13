"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PlaceDrawer } from "@/components/explore/place-drawer";
import { MapPin, Star, List } from "lucide-react";

const ExploreMap = dynamic(() => import("@/components/explore/explore-map").then(m => m.ExploreMap), {
  ssr: false,
  loading: () => (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #0D9488", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
    </div>
  ),
});

interface Place {
  id: string; slug: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  aggregated_rating: number; review_count: number;
  local_favorite: boolean; featured: boolean; price_level: number;
  place_categories: unknown; regions: unknown;
}

interface Category { id: string; slug: string; name_i18n: Record<string,string>; icon_name: string }

const ICON_MAP: Record<string, string> = {
  landmark: "🏛️", leaf: "🌿", utensils: "🍽️",
  waves: "🏖️", zap: "⚡", church: "⛪", palette: "🎨",
};

const CARD_COLORS = [
  "linear-gradient(135deg, #0D9488, #064E3B)",
  "linear-gradient(135deg, #0369A1, #0C4A6E)",
  "linear-gradient(135deg, #D97706, #92400E)",
  "linear-gradient(135deg, #7C3AED, #4C1D95)",
  "linear-gradient(135deg, #059669, #065F46)",
];

export function DashboardExploreMap({
  places, categories, initialQuery, initialCategory,
}: {
  places: Place[]; categories: Category[];
  initialQuery?: string; initialCategory?: string;
}) {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [view, setView] = useState<"map" | "list">("map");

  const filtered = useMemo(() => {
    const q   = (initialQuery ?? "").toLowerCase().trim();
    const cat = initialCategory ?? "";
    return places.filter((p) => {
      const name    = (p.name_i18n as Record<string,string>)?.es?.toLowerCase() ?? "";
      const slug    = p.slug.toLowerCase();
      const pCat    = (p.place_categories as { name_i18n: Record<string,string>; slug: string } | null);
      const pRegion = (p.regions as { name_i18n: Record<string,string>; slug: string } | null);
      const catName = pCat?.name_i18n?.es?.toLowerCase() ?? "";
      const regName = pRegion?.name_i18n?.es?.toLowerCase() ?? "";
      return (!q   || name.includes(q) || slug.includes(q) || catName.includes(q) || regName.includes(q))
          && (!cat || pCat?.slug === cat);
    });
  }, [places, initialQuery, initialCategory]);

  return (
    <>
      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-3">
        {/* Left: title + count */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: "#0D9488" }} />
          <h3
            className="font-jakarta font-semibold"
            style={{ fontSize: "15px", color: "#0F172A" }}
          >
            Destinos en Honduras
          </h3>
          <span
            className="font-inter font-medium text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#F1F5F9", color: "#64748B" }}
          >
            {filtered.length} lugar{filtered.length !== 1 ? "es" : ""}
          </span>
        </div>

        {/* Right: view toggle */}
        <div
          className="flex items-center p-0.5 rounded-lg"
          style={{ backgroundColor: "#F1F5F9", border: "1px solid #E2E8F0" }}
        >
          <button
            onClick={() => setView("map")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-inter font-medium text-xs transition-all"
            style={
              view === "map"
                ? { backgroundColor: "white", color: "#0F172A", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { color: "#64748B" }
            }
          >
            🗺️ Mapa
          </button>
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-inter font-medium text-xs transition-all"
            style={
              view === "list"
                ? { backgroundColor: "white", color: "#0F172A", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { color: "#64748B" }
            }
          >
            <List className="w-3.5 h-3.5" />
            Lista
          </button>
        </div>
      </div>

      {/* ── Map + List panel ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          height: "clamp(320px, calc(100vh - 380px), 560px)",
          border: "1px solid #E2E8F0",
          backgroundColor: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* LIST VIEW — full width grid */}
        {view === "list" && (
          <div className="h-full overflow-y-auto p-4">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "8px",
                alignContent: "start",
              }}
            >
              {filtered.length === 0 ? (
                <div className="py-8 text-center col-span-full">
                  <p className="font-inter text-xs" style={{ color: "#94A3B8" }}>Sin resultados</p>
                </div>
              ) : (
                filtered.map((place, i) => {
                  const name    = (place.name_i18n as Record<string,string>)?.es ?? place.slug;
                  const pCat    = (place.place_categories as { name_i18n: Record<string,string>; icon_name: string; slug: string } | null);
                  const catName = pCat?.name_i18n?.es;
                  const icon    = ICON_MAP[pCat?.icon_name ?? ""] ?? "📍";
                  const isActive = selectedPlace?.id === place.id;

                  return (
                    <Link key={place.id} href={`/places/${place.slug}`}>
                      <button
                        onClick={() => setSelectedPlace(place)}
                        className="w-full text-left flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all"
                        style={{
                          border: isActive ? "1.5px solid #0D9488" : "1px solid #F1F5F9",
                          backgroundColor: isActive ? "rgba(13,148,136,0.04)" : "transparent",
                        }}
                      >
                        {/* Compact icon square */}
                        <div
                          className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg"
                          style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}
                        >
                          {icon}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-jakarta font-semibold text-[13px] text-[#0F172A] truncate leading-tight">
                            {name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {catName && (
                              <span
                                className="font-inter font-medium text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488" }}
                              >
                                {catName}
                              </span>
                            )}
                            <span className="flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                              <span className="font-inter text-[11px]" style={{ color: "#64748B" }}>
                                {Number(place.aggregated_rating).toFixed(1)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </button>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* MAP VIEW — full height */}
        {view === "map" && (
          <div className="relative overflow-hidden h-full">
            <ExploreMap
              places={filtered as never}
              selectedPlace={selectedPlace as never}
              onSelectPlace={(p) => setSelectedPlace(p as Place)}
            />
            <PlaceDrawer
              place={selectedPlace as never}
              onClose={() => setSelectedPlace(null)}
            />
          </div>
        )}
      </div>

    </>
  );
}
