import Link from "next/link";
import {
  MapPin, Star, Landmark, Leaf, Utensils, Waves, Tent, Church, Palette,
  ArrowLeft, type LucideIcon,
} from "lucide-react";
import { PlaceActions } from "./place-actions";

interface Place {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  aggregated_rating: number;
  review_count: number;
  price_level: number;
  accessibility: boolean;
  local_favorite: boolean;
  featured: boolean;
  place_categories: { name_i18n: Record<string, string>; icon_name: string } | null;
  regions: { name_i18n: Record<string, string> } | null;
}

// ── Category → Lucide icon (no emojis) ────────────────────────────────────
const ICON_BY_SLUG: Record<string, LucideIcon> = {
  heritage:  Landmark,
  nature:    Leaf,
  food:      Utensils,
  beach:     Waves,
  adventure: Tent,
  religion:  Church,
  arts:      Palette,
};

// ── Hero gradients per place slug ─────────────────────────────────────────
const HERO_GRADIENTS: Record<string, string> = {
  "ruinas-copan":              "linear-gradient(150deg, #064E3B 0%, #065F46 45%, #0D9488 100%)",
  "catedral-comayagua":        "linear-gradient(150deg, #1E1B4B 0%, #4C1D95 50%, #7C3AED 100%)",
  "parque-nacional-cusuco":    "linear-gradient(150deg, #052e16 0%, #14532D 50%, #16A34A 100%)",
  "playa-west-bay-roatan":     "linear-gradient(150deg, #0C4A6E 0%, #075985 50%, #0369A1 100%)",
  "parque-nacional-la-tigra":  "linear-gradient(150deg, #052e16 0%, #166534 50%, #22C55E 100%)",
  "iglesia-la-merced-comayagua":"linear-gradient(150deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)",
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  heritage:  "linear-gradient(150deg, #064E3B, #0D9488)",
  nature:    "linear-gradient(150deg, #052e16, #16A34A)",
  food:      "linear-gradient(150deg, #431407, #EA580C)",
  beach:     "linear-gradient(150deg, #0C4A6E, #0EA5E9)",
  adventure: "linear-gradient(150deg, #1C1917, #78350F)",
  religion:  "linear-gradient(150deg, #1E1B4B, #4338CA)",
  arts:      "linear-gradient(150deg, #4A044E, #A21CAF)",
};

const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

function getGradient(slug: string, categorySlug: string | null | undefined): string {
  return HERO_GRADIENTS[slug]
    ?? CATEGORY_GRADIENTS[categorySlug ?? ""]
    ?? "linear-gradient(150deg, #064E3B, #0D9488)";
}

// ── Topographic dot pattern overlay ──────────────────────────────────────
const DOT_PATTERN = `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='white' fill-opacity='0.06'/%3E%3C/svg%3E")`;

export function PlaceHero({ place, isGuest }: { place: Place; isGuest?: boolean }) {
  const name     = place.name_i18n?.es ?? place.slug;
  const cat      = place.place_categories as { name_i18n: Record<string, string>; icon_name: string } | null;
  const region   = place.regions as { name_i18n: Record<string, string> } | null;
  const catName  = cat?.name_i18n?.es ?? "";
  const catSlug  = cat?.icon_name?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  const regName  = region?.name_i18n?.es ?? "";
  const gradient = getGradient(place.slug, catSlug);
  const Icon     = ICON_BY_SLUG[catSlug] ?? Landmark;

  const rating   = Number(place.aggregated_rating ?? 0);
  const reviews  = place.review_count ?? 0;
  const price    = PRICE_LABELS[place.price_level] ?? "";

  return (
    <div
      className="relative overflow-hidden"
      style={{ minHeight: "480px", background: gradient }}
    >
      {/* Dot pattern overlay */}
      <div className="absolute inset-0 opacity-100" style={{ backgroundImage: DOT_PATTERN }} />

      {/* Bottom gradient fade to page bg */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{ background: "linear-gradient(to top, #F8FAFC, transparent)" }}
      />

      {/* ── TOP BAR ── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5">
        {/* Back button + breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href="/explore"
            className="flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-white/20 cursor-pointer"
            style={{ backgroundColor: "rgba(0,0,0,0.2)", backdropFilter: "blur(8px)" }}
            aria-label="Volver al mapa"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </Link>
          <nav className="hidden sm:flex items-center gap-1.5 text-white/55 font-inter text-xs">
            <Link href="/dashboard" className="hover:text-white/90 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/explore" className="hover:text-white/90 transition-colors">Explorar</Link>
            {catName && (
              <>
                <span>/</span>
                <span className="text-white/70">{catName}</span>
              </>
            )}
          </nav>
        </div>

        {/* Region badge */}
        {regName && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter text-xs text-white/90"
            style={{ backgroundColor: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)" }}
          >
            <MapPin className="w-3 h-3 text-white/70" />
            {regName}, Honduras
          </div>
        )}
      </div>

      {/* ── CENTER CONTENT ── */}
      <div className="relative z-10 px-6 pt-10 pb-20">
        {/* Category chip */}
        <div className="flex items-center gap-2 mb-5">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter font-semibold text-xs text-white"
            style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
            {catName}
          </span>
          {place.featured && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-inter font-bold text-[10px] uppercase tracking-wide"
              style={{ backgroundColor: "rgba(245,158,11,0.25)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              ★ Destacado
            </span>
          )}
          {place.local_favorite && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-inter font-bold text-[10px] uppercase tracking-wide"
              style={{ backgroundColor: "rgba(236,72,153,0.2)", color: "#F9A8D4", border: "1px solid rgba(236,72,153,0.3)" }}
            >
              ♥ Favorito local
            </span>
          )}
        </div>

        {/* Place name — the hero */}
        <h1 className="font-jakarta font-extrabold text-white leading-tight mb-4"
          style={{ fontSize: "clamp(28px, 5vw, 52px)", textShadow: "0 2px 12px rgba(0,0,0,0.2)", maxWidth: "720px" }}>
          {name}
        </h1>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {rating > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-inter font-bold text-sm text-white">{rating.toFixed(1)}</span>
              <span className="font-inter text-sm text-white/60">({reviews} reseñas)</span>
            </div>
          )}
          {price && (
            <span className="font-inter font-semibold text-sm text-white/75">{price}</span>
          )}
          {place.accessibility && (
            <span className="font-inter text-sm text-white/75 flex items-center gap-1">
              <span aria-label="Accesible">♿</span> Accesible
            </span>
          )}
        </div>

        {/* Action buttons */}
        <PlaceActions
          placeId={place.id}
          placeSlug={place.slug}
          placeName={name}
          isGuest={isGuest}
        />
      </div>
    </div>
  );
}
