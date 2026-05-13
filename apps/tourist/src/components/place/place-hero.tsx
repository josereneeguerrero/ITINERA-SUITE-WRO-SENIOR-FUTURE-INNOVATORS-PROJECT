import Link from "next/link";
import { MapPin, Heart, Share2 } from "lucide-react";

interface Place {
  slug: string;
  name_i18n: Record<string, string>;
  place_categories: { name_i18n: Record<string, string>; icon_name: string } | null;
  regions: { name_i18n: Record<string, string> } | null;
}

const ICON_MAP: Record<string, string> = {
  landmark: "🏛️", leaf: "🌿", utensils: "🍽️",
  waves: "🏖️", zap: "⚡", church: "⛪",
};

const HERO_GRADIENTS: Record<string, string> = {
  "ruinas-copan":             "linear-gradient(160deg, #064E3B 0%, #0D9488 40%, #065F46 100%)",
  "catedral-comayagua":       "linear-gradient(160deg, #1E1B4B 0%, #7C3AED 50%, #4C1D95 100%)",
  "parque-nacional-cusuco":   "linear-gradient(160deg, #064E3B 0%, #059669 50%, #065F46 100%)",
  "playa-west-bay-roatan":    "linear-gradient(160deg, #0C4A6E 0%, #0369A1 50%, #075985 100%)",
  "parque-nacional-la-tigra": "linear-gradient(160deg, #064E3B 0%, #16A34A 50%, #14532D 100%)",
};

export function PlaceHero({ place }: { place: Place }) {
  const name    = place.name_i18n?.es ?? place.slug;
  const cat     = place.place_categories as { name_i18n: Record<string, string>; icon_name: string } | null;
  const region  = place.regions as { name_i18n: Record<string, string> } | null;
  const catName = cat?.name_i18n?.es;
  const icon    = ICON_MAP[cat?.icon_name ?? ""] ?? "📍";
  const regName = region?.name_i18n?.es;
  const gradient = HERO_GRADIENTS[place.slug] ?? "linear-gradient(160deg, #064E3B, #0D9488)";

  return (
    <div className="relative h-[420px] overflow-hidden mt-16">
      {/* Background gradient (placeholder for real photo) */}
      <div className="absolute inset-0" style={{ background: gradient }}>
        {/* Decorative icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 text-[200px]">
          {icon}
        </div>
        {/* Bottom gradient overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: "linear-gradient(to top, rgba(248,250,252,0.6), transparent)" }}
        />
      </div>

      {/* Breadcrumb bottom-left */}
      <div className="absolute bottom-5 left-6">
        <nav className="flex items-center gap-1.5 text-white/70 text-xs font-inter">
          <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
          <span>/</span>
          <Link href="/explore" className="hover:text-white transition-colors">Explorar</Link>
          {catName && (
            <>
              <span>/</span>
              <span className="text-white/80">{catName}</span>
            </>
          )}
          <span>/</span>
          <span className="text-white font-medium">{name}</span>
        </nav>
      </div>

      {/* Actions top-right */}
      <div className="absolute top-5 right-5 flex items-center gap-2">
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
          aria-label="Guardar en favoritos"
        >
          <Heart className="w-4 h-4 text-white" />
        </button>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
          aria-label="Compartir"
        >
          <Share2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Region badge top-left */}
      {regName && (
        <div className="absolute top-5 left-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
          <MapPin className="w-3 h-3 text-white/80" />
          <span className="font-inter text-xs text-white/90">{regName}, Honduras</span>
        </div>
      )}
    </div>
  );
}
