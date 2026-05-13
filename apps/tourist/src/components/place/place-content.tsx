"use client";

import { useState } from "react";
import { Star, Volume2, BookOpen, MessageSquare, MapPin, Phone, Globe, Clock } from "lucide-react";
import Link from "next/link";

interface Place {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  ai_summary_i18n: Record<string, string>;
  ai_tips_i18n: Record<string, string>;
  address_i18n: Record<string, string>;
  aggregated_rating: number;
  review_count: number;
  price_level: number;
  accessibility: boolean;
  local_favorite: boolean;
  featured: boolean;
  phone: string | null;
  website: string | null;
  hours: Record<string, unknown>;
  place_categories: { name_i18n: Record<string, string>; icon_name: string } | null;
  regions: { name_i18n: Record<string, string> } | null;
}

interface Story {
  stories: {
    id: string;
    slug: string;
    title_i18n: Record<string, string>;
    summary_i18n: Record<string, string>;
    audio_storage_path: string | null;
  } | null;
}

interface Review {
  id: string;
  rating: number;
  body_i18n: Record<string, string>;
  source: string;
  created_at: string;
  profiles: { display_name: string } | null;
}

const PRICE_LABELS = ["", "$ Económico", "$$ Moderado", "$$$ Caro", "$$$$ Premium"];

const TABS = [
  { id: "info",      label: "Información",  icon: MapPin },
  { id: "stories",   label: "Historias",    icon: BookOpen },
  { id: "reviews",   label: "Reseñas",      icon: MessageSquare },
];

export function PlaceContent({
  place,
  stories,
  reviews,
}: {
  place: Place;
  stories: Story[];
  reviews: Review[];
}) {
  const [activeTab, setActiveTab] = useState("info");

  const cat     = place.place_categories as { name_i18n: Record<string, string>; icon_name: string } | null;
  const catName = cat?.name_i18n?.es;
  const name    = place.name_i18n?.es;
  const desc    = place.description_i18n?.es;
  const aiSumm  = place.ai_summary_i18n?.es;
  const address = place.address_i18n?.es;

  return (
    <div>
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {catName && (
          <span className="badge-teal px-3 py-1 rounded-full font-inter font-medium text-xs">
            {catName}
          </span>
        )}
        {place.featured && (
          <span className="badge-amber px-3 py-1 rounded-full font-inter font-medium text-xs">
            ★ Destacado
          </span>
        )}
        {place.local_favorite && (
          <span
            className="px-3 py-1 rounded-full font-inter font-medium text-xs"
            style={{ backgroundColor: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", color: "#9D174D" }}
          >
            ♥ Favorito local
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="font-jakarta font-bold text-[36px] text-[#0F172A] leading-tight mb-3">
        {name}
      </h1>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="font-inter font-semibold text-sm text-[#0F172A]">
            {Number(place.aggregated_rating).toFixed(1)}
          </span>
          <span className="font-inter text-sm" style={{ color: "#94A3B8" }}>
            ({place.review_count} reseñas)
          </span>
        </div>
        {address && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" style={{ color: "#64748B" }} />
            <span className="font-inter text-sm" style={{ color: "#64748B" }}>{address}</span>
          </div>
        )}
        {place.price_level && (
          <span className="font-inter text-sm" style={{ color: "#64748B" }}>
            {PRICE_LABELS[place.price_level]}
          </span>
        )}
        {place.accessibility && (
          <span className="font-inter text-sm" style={{ color: "#0D9488" }}>
            ♿ Accesible
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 mb-6" style={{ borderBottom: "1px solid #E2E8F0" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-4 py-3 font-inter font-medium text-sm transition-colors relative"
            style={{
              color: activeTab === id ? "#0D9488" : "#64748B",
              borderBottom: activeTab === id ? "2px solid #0D9488" : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id === "reviews" && place.review_count > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full font-inter font-semibold text-[10px]"
                style={{ backgroundColor: "rgba(13,148,136,0.1)", color: "#0D9488" }}
              >
                {place.review_count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "info" && (
        <div className="space-y-5">
          {/* Description */}
          {desc && (
            <p className="font-inter text-[15px] leading-relaxed text-[#334155]">{desc}</p>
          )}

          {/* AI Summary box */}
          {aiSumm && (
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(13,148,136,0.04)",
                border: "1px solid rgba(13,148,136,0.15)",
                borderLeft: "3px solid #0D9488",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">✨</span>
                <span className="font-inter font-semibold text-xs uppercase tracking-wide" style={{ color: "#0D9488" }}>
                  Resumen IA
                </span>
              </div>
              <p className="font-inter text-sm leading-relaxed text-[#334155]">{aiSumm}</p>
              <button
                className="flex items-center gap-1.5 mt-3 font-inter font-medium text-xs transition-colors"
                style={{ color: "#0D9488" }}
              >
                <Volume2 className="w-3.5 h-3.5" />
                Escuchar narración
              </button>
            </div>
          )}

          {/* Contact info */}
          {(place.phone || place.website || address) && (
            <div
              className="rounded-xl p-4 space-y-2.5"
              style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
            >
              <p className="font-jakarta font-semibold text-sm text-[#0F172A] mb-3">
                Información de contacto
              </p>
              {address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: "#0D9488" }} />
                  <span className="font-inter text-sm" style={{ color: "#334155" }}>{address}</span>
                </div>
              )}
              {place.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0" style={{ color: "#0D9488" }} />
                  <a href={`tel:${place.phone}`} className="font-inter text-sm" style={{ color: "#0D9488" }}>
                    {place.phone}
                  </a>
                </div>
              )}
              {place.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 shrink-0" style={{ color: "#0D9488" }} />
                  <a href={place.website} target="_blank" rel="noopener noreferrer"
                    className="font-inter text-sm truncate" style={{ color: "#0D9488" }}>
                    {place.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "stories" && (
        <div className="space-y-4">
          {stories.length === 0 ? (
            <div className="py-10 text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: "#94A3B8" }} />
              <p className="font-inter text-sm" style={{ color: "#64748B" }}>
                Sin historias vinculadas aún
              </p>
            </div>
          ) : (
            stories.map((sp, i) => {
              const story = sp.stories;
              if (!story) return null;
              const stTitle = story.title_i18n?.es;
              const stSumm  = story.summary_i18n?.es;

              return (
                <Link
                  key={i}
                  href={`/stories/${story.slug}`}
                  className="flex items-start gap-4 p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}
                >
                  <div
                    className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: "rgba(13,148,136,0.1)" }}
                  >
                    <BookOpen className="w-5 h-5" style={{ color: "#0D9488" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-jakarta font-semibold text-sm text-[#0F172A]">{stTitle}</p>
                      {story.audio_storage_path && (
                        <span className="shrink-0">
                          <Volume2 className="w-3.5 h-3.5" style={{ color: "#0D9488" }} />
                        </span>
                      )}
                    </div>
                    <p className="font-inter text-xs leading-relaxed line-clamp-2" style={{ color: "#64748B" }}>
                      {stSumm}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="space-y-4">
          {/* Write review CTA */}
          <div className="flex items-center justify-between mb-2">
            <p className="font-jakarta font-semibold text-base text-[#0F172A]">
              Reseñas ({place.review_count})
            </p>
            <button
              className="btn-teal px-4 py-2 rounded-full font-inter font-medium text-sm"
            >
              Escribir reseña
            </button>
          </div>

          {reviews.length === 0 ? (
            <div
              className="py-10 text-center rounded-xl"
              style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
            >
              <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: "#94A3B8" }} />
              <p className="font-jakarta font-semibold text-sm text-[#0F172A] mb-1">
                Sé el primero en reseñar este lugar
              </p>
              <p className="font-inter text-xs" style={{ color: "#64748B" }}>
                Tu experiencia ayuda a otros viajeros
              </p>
            </div>
          ) : (
            reviews.map((review) => {
              const profile = review.profiles as { display_name: string } | null;
              const body    = (review.body_i18n as Record<string, string>)?.es ?? "";
              return (
                <div
                  key={review.id}
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-jakarta font-bold text-xs text-white"
                        style={{ backgroundColor: "#0D9488" }}
                      >
                        {(profile?.display_name ?? "A")[0].toUpperCase()}
                      </div>
                      <span className="font-inter font-medium text-sm text-[#0F172A]">
                        {profile?.display_name ?? "Visitante"}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className="w-3 h-3"
                          style={{
                            color: j < review.rating ? "#FBBF24" : "#E2E8F0",
                            fill:  j < review.rating ? "#FBBF24" : "#E2E8F0",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  {body && (
                    <p className="font-inter text-sm leading-relaxed" style={{ color: "#334155" }}>
                      {body}
                    </p>
                  )}
                  <p className="font-inter text-[10px] mt-2" style={{ color: "#94A3B8" }}>
                    {new Date(review.created_at).toLocaleDateString("es-HN")} · {review.source}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
