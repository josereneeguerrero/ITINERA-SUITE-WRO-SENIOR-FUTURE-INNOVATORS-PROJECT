import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";

interface Place {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  aggregated_rating: number;
  review_count: number;
  place_categories: { name_i18n: Record<string, string>; icon_name: string; slug: string } | null;
}

const CARD_COLORS = [
  "linear-gradient(135deg, #0D9488 0%, #064E3B 100%)",
  "linear-gradient(135deg, #0369A1 0%, #0C4A6E 100%)",
  "linear-gradient(135deg, #059669 0%, #065F46 100%)",
  "linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)",
];

const ICON_MAP: Record<string, string> = {
  landmark: "🏛️", leaf: "🌿", utensils: "🍽️",
  waves: "🏖️", zap: "⚡", church: "⛪",
};

export function LandingPlaces({ places }: { places: Place[] }) {
  return (
    <section className="bg-[#F8FAFC] py-16 section-contained">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2
              className="font-jakarta font-bold text-[#0F172A]"
              style={{ fontSize: "clamp(24px, 3vw, 36px)" }}
            >
              Descubre Honduras
            </h2>
            <p className="font-inter text-sm mt-1" style={{ color: "#64748B" }}>
              Los destinos más valorados del país
            </p>
          </div>
          <Link
            href="/explore"
            className="hidden sm:flex items-center gap-1.5 font-inter font-medium text-sm transition-colors hover:opacity-80"
            style={{ color: "#0D9488" }}
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {places.map((place, i) => {
            const name    = place.name_i18n?.es ?? place.slug;
            const desc    = (place as { description_i18n?: Record<string,string> }).description_i18n?.es ?? "";
            const cat     = place.place_categories as { name_i18n: Record<string,string>; icon_name: string; slug: string } | null;
            const catName = cat?.name_i18n?.es;
            const icon    = ICON_MAP[cat?.icon_name ?? ""] ?? "📍";

            return (
              <Link
                key={place.id}
                href={`/places/${place.slug}`}
                className="card-hover group rounded-2xl overflow-hidden bg-white"
                style={{ border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
              >
                {/* Color band */}
                <div
                  className="h-44 flex items-center justify-center relative overflow-hidden"
                  style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}
                >
                  <span className="text-5xl opacity-20 select-none">{icon}</span>
                  {/* Category badge */}
                  {catName && (
                    <span
                      className="absolute top-3 left-3 font-inter font-medium text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full text-white"
                      style={{ backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
                    >
                      {catName}
                    </span>
                  )}
                  {/* Rating badge */}
                  <div
                    className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg"
                    style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
                  >
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-inter font-semibold text-xs text-white">
                      {Number(place.aggregated_rating).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-jakarta font-semibold text-[15px] text-[#0F172A] mb-0.5 truncate">
                    {name}
                  </h3>
                  {desc && (
                    <p className="font-inter text-[11px] leading-relaxed mb-1.5 line-clamp-2" style={{ color: "#94A3B8" }}>
                      {desc.slice(0, 70)}{desc.length > 70 ? "..." : ""}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-inter text-xs" style={{ color: "#94A3B8" }}>
                      {place.review_count > 0 ? `${place.review_count} reseñas` : "Sé el primero"}
                    </span>
                    <span
                      className="font-inter font-medium text-xs transition-opacity group-hover:opacity-100 opacity-0"
                      style={{ color: "#0D9488" }}
                    >
                      Ver más →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <div className="sm:hidden text-center mt-6">
          <Link href="/explore" className="btn-teal font-inter font-semibold text-sm px-6 py-2.5 rounded-xl inline-block">
            Ver todos los lugares
          </Link>
        </div>
      </div>
    </section>
  );
}
