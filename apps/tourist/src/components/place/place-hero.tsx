"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Star, MapPin, Heart, Share2, Plus, Check,
  Landmark, Leaf, Utensils, Waves, Tent, Church, Palette,
  type LucideIcon,
} from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { createClient } from "@/lib/supabase/client";

// ── Icon map (Lucide only, no emojis) ────────────────────────────────────
const ICON_BY_SLUG: Record<string, LucideIcon> = {
  heritage: Landmark, nature: Leaf, food: Utensils,
  beach: Waves, adventure: Tent, religion: Church, arts: Palette,
};

const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

interface PlaceHeroProps {
  id: string;
  slug: string;
  name: string;
  catName: string;
  catSlug: string;
  regName: string;
  rating: number;
  reviewCount: number;
  priceLevel: number;
  accessibility: boolean;
  localFavorite: boolean;
  featured: boolean;
  isGuest?: boolean;
}

export function PlaceHero({
  id, slug, name, catName, catSlug, regName,
  rating, reviewCount, priceLevel, accessibility, localFavorite, featured,
  isGuest,
}: PlaceHeroProps) {
  const router = useRouter();
  const [saved, setSaved]   = useState(false);
  const [copied, setCopied] = useState(false);

  // Hydrate saved state from DB on mount
  useEffect(() => {
    if (isGuest) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("favorites")
        .select("place_id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("place_id", id)
        .then(({ count }) => { if ((count ?? 0) > 0) setSaved(true); });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const Icon  = ICON_BY_SLUG[catSlug] ?? Landmark;
  const price = PRICE_LABELS[priceLevel] ?? "";

  async function handleSave() {
    if (isGuest) { router.push(`/bienvenida?redirect=/places/${slug}`); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (saved) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("place_id", id);
      setSaved(false);
    } else {
      await supabase.from("favorites").upsert({ user_id: user.id, place_id: id });
      setSaved(true);
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-10 pt-6 md:pt-8">

      {/* Back link — matches dashboard breadcrumb style */}
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 font-inter text-sm text-[#64748B] hover:text-[#0D9488] transition-colors duration-150 mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al mapa
      </Link>

      {/* ── Aurora banner — same component & style as dashboard hero ── */}
      <AuroraBackground className="rounded-2xl border border-[#d7e2de] min-h-[260px] md:min-h-[300px] items-start justify-start">
        <div className="relative z-10 w-full px-6 py-7 md:px-8 md:py-8 flex flex-col gap-5">

          {/* Top row: category + region + actions */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category chip */}
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter font-semibold text-xs"
                style={{ backgroundColor: "rgba(13,148,136,0.12)", color: "#065F46", border: "1px solid rgba(13,148,136,0.2)" }}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden />
                {catName}
              </span>

              {featured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-inter font-bold text-[10px] uppercase tracking-wide"
                  style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#92400E", border: "1px solid rgba(245,158,11,0.25)" }}>
                  ★ Destacado
                </span>
              )}
              {localFavorite && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-inter font-bold text-[10px] uppercase tracking-wide"
                  style={{ backgroundColor: "rgba(236,72,153,0.1)", color: "#9D174D", border: "1px solid rgba(236,72,153,0.2)" }}>
                  ♥ Favorito local
                </span>
              )}
            </div>

            {/* Save + share — top right */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter font-semibold text-xs cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
                style={
                  saved
                    ? { backgroundColor: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.3)", color: "#BE185D" }
                    : { backgroundColor: "rgba(255,255,255,0.7)", border: "1px solid #d7e2de", color: "#475569" }
                }
                aria-label={saved ? "Quitar de favoritos" : "Guardar"}
              >
                <Heart className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
                {saved ? "Guardado" : "Guardar"}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter font-semibold text-xs cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
                style={{ backgroundColor: "rgba(255,255,255,0.7)", border: "1px solid #d7e2de", color: "#475569" }}
                aria-label="Compartir"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? "¡Copiado!" : "Compartir"}
              </button>
            </div>
          </div>

          {/* Place name */}
          <div>
            <h1 className="font-jakarta font-extrabold text-[#0f172a] leading-tight"
              style={{ fontSize: "clamp(26px, 4vw, 42px)" }}>
              {name}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5">
              {rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-jakarta font-bold text-sm text-[#0f172a]">{Number(rating).toFixed(1)}</span>
                  <span className="font-inter text-sm text-[#64748B]">({reviewCount} reseñas)</span>
                </div>
              )}
              {regName && (
                <div className="flex items-center gap-1 text-[#64748B]">
                  <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span className="font-inter text-sm">{regName}, Honduras</span>
                </div>
              )}
              {price && <span className="font-inter text-sm text-[#64748B]">{price}</span>}
              {accessibility && (
                <span className="font-inter text-sm text-[#0D9488]">♿ Accesible</span>
              )}
            </div>
          </div>

          {/* Primary actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href={`/explore${isGuest ? "?guest=true&" : "?"}addToRoute=${slug}&name=${encodeURIComponent(name)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-inter font-bold text-sm text-white transition-all duration-150 hover:opacity-90 active:scale-95 cursor-pointer"
              style={{ backgroundColor: "#0D9488" }}
            >
              <Plus className="w-4 h-4" />
              Agregar a ruta
            </Link>
            <Link
              href={`/explore${isGuest ? "?guest=true&" : "?"}place=${slug}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-inter font-semibold text-sm transition-all duration-150 hover:bg-white cursor-pointer"
              style={{ backgroundColor: "rgba(255,255,255,0.7)", border: "1px solid #d7e2de", color: "#334155" }}
            >
              <MapPin className="w-4 h-4 text-[#0D9488]" />
              Ver en mapa
            </Link>
          </div>
        </div>
      </AuroraBackground>
    </div>
  );
}
