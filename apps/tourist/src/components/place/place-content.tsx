"use client";

import { useState } from "react";
import {
  Info, BookOpen, MessageSquare,
  Star, MapPin, Phone, Globe, Clock, Volume2,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { ReviewForm } from "./review-form";
import { PlaceWeatherWidget } from "./place-weather-widget";

// ── Types ─────────────────────────────────────────────────────────────────

interface Place {
  id: string; slug: string;
  description_i18n: Record<string, string>;
  ai_summary_i18n: Record<string, string>;
  ai_tips_i18n: Record<string, string> | null;
  address_i18n: Record<string, string>;
  aggregated_rating: number; review_count: number; price_level: number;
  accessibility: boolean; phone: string | null; website: string | null;
  hours: Record<string, unknown> | null;
}

interface Story {
  stories: {
    slug: string; title_i18n: Record<string, string>;
    summary_i18n: Record<string, string>; audio_storage_path: string | null;
    status?: string; moderation_status?: string;
  } | null;
}

interface Review {
  id: string; rating: number;
  body_i18n: Record<string, string>;
  created_at: string;
  profiles: { display_name: string } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const TABS = [
  { id: "info",    label: "Información",  icon: Info },
  { id: "stories", label: "Historias",    icon: BookOpen },
  { id: "reviews", label: "Reseñas",      icon: MessageSquare },
];

const PRICE_LABELS = ["", "$ Económico", "$$ Moderado", "$$$ Caro", "$$$$ Premium"];

// ── Component ─────────────────────────────────────────────────────────────

export function PlaceContent({ place, stories, reviews, lat, lng, placeName }: {
  place: Place;
  stories: Story[];
  reviews: Review[];
  lat?: number | null;
  lng?: number | null;
  placeName?: string;
}) {
  const [tab, setTab] = useState("info");

  const desc    = place.description_i18n?.es;
  const aiSumm  = place.ai_summary_i18n?.es;
  const aiTips  = place.ai_tips_i18n?.es;
  const address = place.address_i18n?.es;
  const avgRating = Number(place.aggregated_rating ?? 0);

  // Parse hours — handle both string and {día: string} object
  const hoursRaw = place.hours;
  const hoursEs: string | null = hoursRaw
    ? typeof hoursRaw === "string"
      ? hoursRaw
      : (hoursRaw as Record<string, string>)?.es ?? null
    : null;

  // Real rating distribution from reviews array
  const ratingCounts = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: reviews.filter(r => Math.round(r.rating) === s).length,
  }));

  const pubStories = stories.filter(
    sp => sp.stories &&
      (!sp.stories.status || sp.stories.status === "published") &&
      (!sp.stories.moderation_status || sp.stories.moderation_status === "approved")
  );

  // ── Shared card wrapper ───────────────────────────────────────────────
  const card = "rounded-2xl bg-white border border-[#E2E8F0]";

  return (
    <div>
      {/* ── Tabs — dashboard-style section label ── */}
      <div role="tablist" className="flex gap-0 mb-6" style={{ borderBottom: "2px solid #E2E8F0" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-4 py-3 font-inter font-medium text-sm cursor-pointer transition-colors relative whitespace-nowrap"
            style={{
              color: tab === id ? "#0D9488" : "#64748B",
              borderBottom: tab === id ? "2px solid #0D9488" : "2px solid transparent",
              marginBottom: "-2px",
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id === "reviews" && place.review_count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full font-bold text-[10px]"
                style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488" }}>
                {place.review_count}
              </span>
            )}
            {id === "stories" && pubStories.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full font-bold text-[10px]"
                style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3B82F6" }}>
                {pubStories.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─────────────────── INFO ─────────────────── */}
      {tab === "info" && (
        <div className="space-y-4">

          {/* Description */}
          {desc && (
            <div className={`${card} px-5 py-4`}>
              <p className="font-inter text-[15px] leading-relaxed text-[#334155]">{desc}</p>
            </div>
          )}

          {/* AI Summary — same teal accent as dashboard */}
          {aiSumm && (
            <div className={`${card} px-5 py-4`} style={{ borderLeft: "3px solid #0D9488" }}>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(13,148,136,0.1)" }}>
                  <Star className="w-3 h-3 text-[#0D9488]" />
                </div>
                <span className="font-inter font-bold text-xs uppercase tracking-widest text-[#0D9488]">
                  Resumen IA
                </span>
              </div>
              <p className="font-inter text-sm leading-relaxed text-[#334155]">{aiSumm}</p>
              <button
                disabled
                title="Narración de audio próximamente"
                className="flex items-center gap-1.5 mt-3 font-inter font-medium text-xs text-[#94A3B8] cursor-not-allowed opacity-60"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Escuchar narración
              </button>
            </div>
          )}

          {/* AI Tips */}
          {aiTips && (
            <div className={`${card} px-5 py-4`} style={{ borderLeft: "3px solid #F59E0B" }}>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
                  <Star className="w-3 h-3 text-[#F59E0B]" />
                </div>
                <span className="font-inter font-bold text-xs uppercase tracking-widest text-[#92400E]">
                  Consejos IA
                </span>
              </div>
              <p className="font-inter text-sm leading-relaxed text-[#334155]">{aiTips}</p>
            </div>
          )}

          {/* Quick chips */}
          <div className="flex flex-wrap gap-2">
            {place.price_level > 0 && (
              <span className="px-3 py-1.5 rounded-full font-inter text-xs font-medium text-[#475569] bg-[#F1F5F9] border border-[#E2E8F0]">
                {PRICE_LABELS[place.price_level]}
              </span>
            )}
            {place.accessibility && (
              <span className="px-3 py-1.5 rounded-full font-inter text-xs font-medium text-[#0D9488] border"
                style={{ backgroundColor: "rgba(13,148,136,0.06)", borderColor: "rgba(13,148,136,0.2)" }}>
                ♿ Accesible
              </span>
            )}
          </div>

          {/* Contact info card */}
          {(address || hoursEs || place.phone || place.website) && (
            <div className={card}>
              <div className="px-5 py-3.5 border-b border-[#F1F5F9]">
                <p className="font-jakarta font-bold text-sm text-[#0F172A]">Información de visita</p>
              </div>
              <div className="divide-y divide-[#F8FAFC]">
                {address && (
                  <div className="flex items-start gap-3 px-5 py-3.5">
                    <MapPin className="w-4 h-4 text-[#0D9488] mt-0.5 shrink-0" />
                    <span className="font-inter text-sm text-[#334155]">{address}</span>
                  </div>
                )}
                {hoursEs && (
                  <div className="flex items-start gap-3 px-5 py-3.5">
                    <Clock className="w-4 h-4 text-[#0D9488] mt-0.5 shrink-0" />
                    <span className="font-inter text-sm text-[#334155]">{hoursEs}</span>
                  </div>
                )}
                {place.phone && (
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <Phone className="w-4 h-4 text-[#0D9488] shrink-0" />
                    <a href={`tel:${place.phone}`} className="font-inter text-sm text-[#0D9488] hover:underline">
                      {place.phone}
                    </a>
                  </div>
                )}
                {place.website && (
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <Globe className="w-4 h-4 text-[#0D9488] shrink-0" />
                    <a href={place.website} target="_blank" rel="noopener noreferrer"
                      className="font-inter text-sm text-[#0D9488] hover:underline truncate">
                      {place.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────── STORIES ─────────────────── */}
      {tab === "stories" && (
        <div className="space-y-3">
          {pubStories.length === 0 ? (
            <div className={`${card} py-14 text-center`}>
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-[#CBD5E1]" />
              <p className="font-jakarta font-bold text-base text-[#0F172A] mb-1">Sin historias aún</p>
              <p className="font-inter text-sm text-[#64748B]">Las historias de este lugar aparecerán aquí.</p>
            </div>
          ) : pubStories.map((sp, i) => {
            const s = sp.stories!;
            return (
              <Link key={i} href={`/stories/${s.slug}`}
                className={`${card} group flex items-start gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#0D9488]/25 cursor-pointer`}
              >
                <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.1), rgba(13,148,136,0.04))" }}>
                  <BookOpen className="w-5 h-5 text-[#0D9488]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-jakarta font-bold text-sm text-[#0F172A] group-hover:text-[#0D9488] transition-colors">
                      {s.title_i18n?.es}
                    </p>
                    {s.audio_storage_path && <Volume2 className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />}
                  </div>
                  {s.summary_i18n?.es && (
                    <p className="font-inter text-xs text-[#64748B] line-clamp-2 leading-relaxed">{s.summary_i18n.es}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#0D9488] transition-colors shrink-0 mt-0.5" />
              </Link>
            );
          })}
        </div>
      )}

      {/* ─────────────────── REVIEWS ─────────────────── */}
      {tab === "reviews" && (
        <div className="space-y-4">
          {/* Summary card */}
          {place.review_count > 0 && (
            <div className={`${card} flex items-center gap-5 px-5 py-4`}>
              <div className="text-center shrink-0">
                <p className="font-jakarta font-extrabold text-4xl text-[#0F172A]">{avgRating.toFixed(1)}</p>
                <div className="flex items-center justify-center gap-0.5 my-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className="w-3.5 h-3.5"
                      style={{ fill: s <= Math.round(avgRating) ? "#FBBF24" : "#E2E8F0", color: s <= Math.round(avgRating) ? "#FBBF24" : "#E2E8F0" }} />
                  ))}
                </div>
                <p className="font-inter text-[11px] text-[#94A3B8]">{place.review_count} reseñas</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {ratingCounts.map(({ star, count }) => {
                  const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="font-inter text-[11px] text-[#94A3B8] w-8 shrink-0 text-right">{star}★</span>
                      <div className="flex-1 h-1.5 rounded-full bg-[#F1F5F9]">
                        <div className="h-full rounded-full bg-[#FBBF24] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-inter text-[10px] text-[#CBD5E1] w-4 shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Review list */}
          {reviews.length === 0 ? (
            <div className={`${card} py-10 text-center`}>
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-[#CBD5E1]" />
              <p className="font-jakarta font-bold text-base text-[#0F172A] mb-1">Sin reseñas aún</p>
              <p className="font-inter text-sm text-[#64748B]">Sé el primero en compartir tu experiencia.</p>
            </div>
          ) : reviews.map(r => {
            const profile = r.profiles as { display_name: string } | null;
            const body = (r.body_i18n as Record<string, string>)?.es ?? "";
            return (
              <div key={r.id} className={`${card} px-5 py-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-jakarta font-bold text-xs text-white shrink-0"
                      style={{ backgroundColor: "#0D9488" }}>
                      {(profile?.display_name ?? "V")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-inter font-semibold text-sm text-[#0F172A]">{profile?.display_name ?? "Visitante"}</p>
                      <p className="font-inter text-[11px] text-[#94A3B8]">
                        {new Date(r.created_at).toLocaleDateString("es-HN", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className="w-3.5 h-3.5"
                        style={{ fill: s <= r.rating ? "#FBBF24" : "#E2E8F0", color: s <= r.rating ? "#FBBF24" : "#E2E8F0" }} />
                    ))}
                  </div>
                </div>
                {body && <p className="font-inter text-sm leading-relaxed text-[#334155]">{body}</p>}
              </div>
            );
          })}

          {/* Review form */}
          <ReviewForm placeId={place.id} placeSlug={place.slug} />
        </div>
      )}

      {/* ── Weather widget — inside Info tab, after contact info ── */}
      {tab === "info" && (
        <PlaceWeatherWidget
          lat={lat ?? null}
          lng={lng ?? null}
          placeName={placeName ?? place.slug}
        />
      )}
    </div>
  );
}
