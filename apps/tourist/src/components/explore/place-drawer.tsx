"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  X, Star, MapPin, Sparkles, Navigation,
  ArrowRight, Plus, Heart, Landmark, Leaf, UtensilsCrossed,
  Waves, Zap, Church, Accessibility, Phone, Globe, Clock,
} from "lucide-react";

interface Place {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  ai_summary_i18n: Record<string, string>;
  aggregated_rating: number;
  review_count: number;
  price_level: number;
  accessibility: boolean;
  local_favorite: boolean;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  website?: string | null;
  address_i18n?: Record<string, string> | null;
  place_categories: { name_i18n: Record<string, string>; icon_name: string } | null;
  regions: { name_i18n: Record<string, string> } | null;
}

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  landmark: Landmark, leaf: Leaf, utensils: UtensilsCrossed,
  waves: Waves, zap: Zap, church: Church,
};

const BG_COLORS: Record<string, string> = {
  "ruinas-copan":             "linear-gradient(135deg, #0D9488, #064E3B)",
  "catedral-comayagua":       "linear-gradient(135deg, #7C3AED, #4C1D95)",
  "parque-nacional-cusuco":   "linear-gradient(135deg, #059669, #065F46)",
  "playa-west-bay-roatan":    "linear-gradient(135deg, #0369A1, #0C4A6E)",
  "parque-nacional-la-tigra": "linear-gradient(135deg, #16A34A, #14532D)",
};

const PRICE = ["", "$", "$$", "$$$", "$$$$"];

interface PlaceDrawerProps {
  place: Place | null;
  onClose: () => void;
  onAddToRoute?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}

export function PlaceDrawer({ place, onClose, onAddToRoute, onSave, isSaved }: PlaceDrawerProps) {
  const [visible, setVisible] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  useEffect(() => {
    if (place) {
      setVisible(true);
      const summary = (place.ai_summary_i18n as Record<string,string>)?.es
        ?? (place.description_i18n as Record<string,string>)?.es
        ?? "";
      setAiMessage(summary.slice(0, 140) + (summary.length > 140 ? "..." : ""));
    } else {
      setVisible(false);
    }
  }, [place]);

  if (!place) return null;

  const name    = (place.name_i18n as Record<string,string>)?.es ?? place.slug;
  const cat     = place.place_categories as { name_i18n: Record<string,string>; icon_name: string } | null;
  const region  = place.regions as { name_i18n: Record<string,string> } | null;
  const catName = cat?.name_i18n?.es;
  const regName = region?.name_i18n?.es;
  const Icon    = ICON_MAP[cat?.icon_name ?? ""] ?? MapPin;
  const bg      = BG_COLORS[place.slug] ?? "linear-gradient(135deg, #0D9488, #064E3B)";
  const address = (place.address_i18n as Record<string,string> | null)?.es ?? null;

  // Google Maps "Cómo llegar" link — uses coords if available, else name+region search
  const mapsUrl = place.lat && place.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} Honduras`)}`;

  // Clean website for display
  const websiteDisplay = place.website
    ? place.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-20 transition-opacity duration-300"
        style={{
          backgroundColor: "rgba(0,0,0,0.2)",
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="absolute top-0 right-0 bottom-0 z-30 flex flex-col overflow-hidden"
        style={{
          width: "360px",
          backgroundColor: "white",
          boxShadow: "-8px 0 30px rgba(0,0,0,0.12)",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Hero area */}
        <div
          className="relative h-44 shrink-0 flex items-center justify-center"
          style={{ background: bg }}
        >
          <Icon className="h-16 w-16 text-white/30" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Favorite — now functional, shows filled heart when saved */}
          <button
            onClick={onSave}
            className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
            style={{ backgroundColor: isSaved ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.35)" }}
            aria-label={isSaved ? "Quitar de guardados" : "Guardar lugar"}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-white text-white" : "text-white"}`} />
          </button>

          {/* Category badge */}
          {catName && (
            <div
              className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full font-inter font-medium text-xs text-white"
              style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />{catName}
              </span>
            </div>
          )}

          {/* "Cómo llegar" — Google Maps */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full font-inter font-semibold text-xs text-white cursor-pointer transition-opacity hover:opacity-90"
            style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            aria-label="Cómo llegar en Google Maps"
          >
            <Navigation className="w-3 h-3" />
            Cómo llegar
          </a>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* Title + meta */}
            <div>
              <h2 className="font-jakarta font-bold text-[20px] text-[#0F172A] leading-tight mb-1.5">
                {name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {place.aggregated_rating > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-inter font-semibold text-[#0F172A]">
                      {Number(place.aggregated_rating).toFixed(1)}
                    </span>
                    <span className="font-inter text-[#94A3B8]">({place.review_count})</span>
                  </div>
                )}
                {regName && (
                  <div className="flex items-center gap-0.5 text-[#64748B]">
                    <MapPin className="w-3 h-3" />
                    <span className="font-inter">{regName}</span>
                  </div>
                )}
                {place.price_level > 0 && (
                  <span className="font-inter text-[#64748B]">{PRICE[place.price_level]}</span>
                )}
                {place.accessibility && (
                  <span className="font-inter inline-flex items-center gap-1 text-[#0D9488]">
                    <Accessibility className="h-3.5 w-3.5" />Accesible
                  </span>
                )}
                {place.local_favorite && (
                  <span className="font-inter inline-flex items-center gap-1 text-amber-500">
                    <Heart className="h-3.5 w-3.5 fill-current" />Local
                  </span>
                )}
              </div>
            </div>

            {/* AI Summary */}
            {aiMessage && (
              <div
                className="rounded-xl p-3"
                style={{
                  background: "rgba(13,148,136,0.04)",
                  border: "1px solid rgba(13,148,136,0.15)",
                  borderLeft: "3px solid #0D9488",
                }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 text-[#0D9488]" />
                  <span className="font-inter font-semibold text-[10px] uppercase tracking-wide text-[#0D9488]">
                    Resumen IA
                  </span>
                </div>
                <p className="font-inter text-xs leading-relaxed text-[#334155]">{aiMessage}</p>
              </div>
            )}

            {/* Contact info — phone, website, address */}
            {(place.phone || place.website || address) && (
              <div className="space-y-2">
                {place.phone && (
                  <a
                    href={`tel:${place.phone}`}
                    className="flex items-center gap-2.5 rounded-xl border border-[#E2E8F0] px-3 py-2.5 transition-colors hover:border-[#0D9488]/30 hover:bg-[#f0f5f2] cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0 text-[#0D9488]" />
                    <span className="font-inter text-xs text-[#334155]">{place.phone}</span>
                  </a>
                )}
                {place.website && (
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-xl border border-[#E2E8F0] px-3 py-2.5 transition-colors hover:border-[#0D9488]/30 hover:bg-[#f0f5f2] cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0 text-[#0D9488]" />
                    <span className="font-inter text-xs text-[#0D9488] truncate">{websiteDisplay}</span>
                  </a>
                )}
                {address && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#E2E8F0] px-3 py-2.5">
                    <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#94A3B8]" />
                    <span className="font-inter text-xs text-[#64748B]">{address}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onAddToRoute}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-inter font-medium text-xs transition-colors cursor-pointer"
                style={{
                  backgroundColor: "rgba(13,148,136,0.06)",
                  border: "1px solid rgba(13,148,136,0.2)",
                  color: "#0D9488",
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar a ruta
              </button>
              <button
                onClick={onSave}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-inter font-medium text-xs transition-colors cursor-pointer"
                style={{
                  backgroundColor: isSaved ? "rgba(239,68,68,0.06)" : "#F8FAFC",
                  border: isSaved ? "1px solid rgba(239,68,68,0.25)" : "1px solid #E2E8F0",
                  color: isSaved ? "#EF4444" : "#64748B",
                }}
              >
                <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
                {isSaved ? "Guardado" : "Guardar"}
              </button>
            </div>

            {/* AI chat teaser */}
            <div className="rounded-xl p-3" style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#0D9488]">
                  <span className="font-jakarta font-bold text-white text-[9px]">I</span>
                </div>
                <span className="font-inter font-medium text-xs text-[#0F172A]">Itinera IA</span>
              </div>
              <p className="font-inter text-xs text-[#64748B]">
                ¿Tienes preguntas sobre {name}? La IA puede contarte su historia, cultura y más.
              </p>
              <Link
                href={`/places/${place.slug}`}
                className="flex items-center gap-1.5 mt-2 font-inter font-medium text-xs text-[#0D9488]"
              >
                <Sparkles className="w-3 h-3" />
                Chatear con IA sobre este lugar
              </Link>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 shrink-0" style={{ borderTop: "1px solid #E2E8F0" }}>
          <Link
            href={`/places/${place.slug}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-inter font-semibold text-sm text-white bg-[#0D9488] hover:bg-[#0f766e] transition-colors"
          >
            Ver página completa
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
