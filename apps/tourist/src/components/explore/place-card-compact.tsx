"use client";

import { Star, MapPin } from "lucide-react";

interface Place {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  aggregated_rating: number;
  review_count: number;
  price_level: number;
  local_favorite: boolean;
  featured: boolean;
  place_categories: { name_i18n: Record<string, string>; icon_name: string } | null;
  regions: { name_i18n: Record<string, string> } | null;
  distanceKm?: number;
  aiHighlighted?: boolean;
}

const ICON_MAP: Record<string, string> = {
  landmark: "🏛️",
  leaf: "🌿",
  utensils: "🍽️",
  waves: "🏖️",
  zap: "⚡",
  church: "⛪",
  palette: "🎨",
  default: "📍",
};

const BG_COLORS = [
  "linear-gradient(135deg, #0D9488, #064E3B)",
  "linear-gradient(135deg, #0369A1, #0C4A6E)",
  "linear-gradient(135deg, #D97706, #92400E)",
  "linear-gradient(135deg, #7C3AED, #4C1D95)",
  "linear-gradient(135deg, #059669, #065F46)",
];

export function PlaceCardCompact({
  place,
  onClick,
  isActive,
  index = 0,
}: {
  place: Place;
  onClick?: () => void;
  isActive?: boolean;
  index?: number;
}) {
  const name    = place.name_i18n?.es ?? place.slug;
  const cat     = (place.place_categories as unknown as { name_i18n: Record<string, string>; icon_name: string } | null);
  const region  = (place.regions as unknown as { name_i18n: Record<string, string> } | null);
  const catName = cat?.name_i18n?.es;
  const icon    = ICON_MAP[cat?.icon_name ?? "default"] ?? "📍";
  const regionName = region?.name_i18n?.es;

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        border: isActive
          ? "2px solid #0D9488"
          : place.aiHighlighted
          ? "2px solid rgba(13,148,136,0.5)"
          : "1px solid #E2E8F0",
        backgroundColor: isActive ? "rgba(13,148,136,0.04)" : "white",
        boxShadow: place.aiHighlighted && !isActive
          ? "0 0 0 3px rgba(13,148,136,0.08)"
          : "none",
      }}
    >
      {/* Photo placeholder */}
      <div
        className="w-[100px] h-[72px] rounded-lg shrink-0 flex items-center justify-center text-2xl"
        style={{ background: BG_COLORS[index % BG_COLORS.length] }}
      >
        {icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className="font-jakarta font-semibold text-sm text-[#0F172A] line-clamp-1 flex-1">
            {name}
          </p>
          {place.aiHighlighted && (
            <span className="text-[10px] font-inter font-semibold px-1.5 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: "rgba(13,148,136,0.1)", color: "#0D9488" }}>
              IA
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mb-1.5">
          {catName && (
            <span
              className="font-inter font-medium text-[10px] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488", border: "1px solid rgba(13,148,136,0.15)" }}
            >
              {catName}
            </span>
          )}
          {regionName && (
            <span className="font-inter text-[10px]" style={{ color: "#94A3B8" }}>
              · {regionName}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="font-inter font-medium text-xs text-[#0F172A]">
              {Number(place.aggregated_rating).toFixed(1)}
            </span>
            <span className="font-inter text-[10px]" style={{ color: "#94A3B8" }}>
              ({place.review_count})
            </span>
          </div>
          {place.distanceKm !== undefined && (
            <span className="font-mono text-[10px]" style={{ color: "#0D9488" }}>
              {place.distanceKm.toFixed(1)} km
            </span>
          )}
          {place.local_favorite && (
            <span className="font-inter text-[10px]" style={{ color: "#F59E0B" }}>♥ Local</span>
          )}
        </div>
      </div>
    </button>
  );
}
