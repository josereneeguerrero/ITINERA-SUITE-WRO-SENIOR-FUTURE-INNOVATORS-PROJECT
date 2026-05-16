"use client";

import { useState } from "react";
import {
  Star, Volume2, BookOpen, MessageSquare, MapPin, Phone, Globe, Clock,
  ChevronRight, Info,
} from "lucide-react";
import Link from "next/link";
import { ReviewForm } from "./review-form";

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
  hours: Record<string, unknown> | null;
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
    status?: string;
    moderation_status?: string;
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
  { id: "info",     label: "Información",  icon: Info },
  { id: "stories",  label: "Historias",    icon: BookOpen },
  { id: "reviews",  label: "Reseñas",      icon: MessageSquare },
];

// ── Rating bar ────────────────────────────────────────────────────────────
function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="font-inter text-xs text-[#64748B] w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[#F1F5F9]">
        <div className="h-full rounded-full bg-[#FBBF24] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-inter text-xs text-[#94A3B8] w-6 text-right">{count}</span>
    </div>
  );
}

export function PlaceContent({ place, stories, reviews }: {
  place: Place;
  stories: Story[];
  reviews: Review[];
}) {
  const [activeTab, setActiveTab] = useState("info");

  const desc    = place.description_i18n?.es;
  const aiSumm  = place.ai_summary_i18n?.es;
  const address = place.address_i18n?.es;
  const hoursEs = place.hours ? (place.hours as Record<string, string>)?.es : null;

  // Rating distribution (mock from available data)
  const totalReviews = place.review_count;
  const avgRating = Number(place.aggregated_rating ?? 0);

  const publishedStories = stories.filter(
    sp => sp.stories &&
    (sp.stories.status === "published" || !sp.stories.status) &&
    (sp.stories.moderation_status === "approved" || !sp.stories.moderation_status)
  );

  return (
    <div>
      {/* ── Tabs ── */}
      <div
        className="flex items-center gap-0 mb-7 sticky top-16 bg-[#F8FAFC] z-10"
        style={{ borderBottom: "2px solid #E2E8F0" }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-4 py-3.5 font-inter font-medium text-sm transition-all duration-150 relative cursor-pointer whitespace-nowrap"
            style={{
              color: activeTab === id ? "#0D9488" : "#64748B",
              borderBottom: activeTab === id ? "2px solid #0D9488" : "2px solid transparent",
              marginBottom: "-2px",
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id === "reviews" && totalReviews > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full font-inter font-bold text-[10px]"
                style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488" }}
              >
                {totalReviews}
              </span>
            )}
            {id === "stories" && publishedStories.length > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full font-inter font-bold text-[10px]"
                style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3B82F6" }}
              >
                {publishedStories.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── INFO tab ── */}
      {activeTab === "info" && (
        <div className="space-y-6">

          {/* Description */}
          {desc && (
            <p className="font-inter text-[15px] leading-relaxed text-[#334155]">{desc}</p>
          )}

          {/* AI Summary */}
          {aiSumm && (
            <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.04), rgba(13,148,136,0.02))", border: "1px solid rgba(13,148,136,0.15)", borderLeft: "3px solid #0D9488" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(13,148,136,0.1)" }}>
                  <Star className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden />
                </div>
                <span className="font-inter font-bold text-xs uppercase tracking-widest text-[#0D9488]">
                  Resumen IA
                </span>
              </div>
              <p className="font-inter text-sm leading-relaxed text-[#334155]">{aiSumm}</p>
              <button className="flex items-center gap-1.5 mt-3 font-inter font-medium text-xs text-[#0D9488] cursor-pointer hover:opacity-80 transition-opacity">
                <Volume2 className="w-3.5 h-3.5" />
                Escuchar narración
              </button>
            </div>
          )}

          {/* Quick info chips */}
          <div className="flex flex-wrap gap-2">
            {place.price_level > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter text-xs font-medium text-[#475569] bg-[#F1F5F9] border border-[#E2E8F0]">
                {PRICE_LABELS[place.price_level]}
              </span>
            )}
            {place.accessibility && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter text-xs font-medium text-[#0D9488] bg-[rgba(13,148,136,0.06)] border border-[rgba(13,148,136,0.15)]">
                ♿ Accesible
              </span>
            )}
            {place.local_favorite && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter text-xs font-medium text-[#BE185D] bg-[rgba(236,72,153,0.06)] border border-[rgba(236,72,153,0.15)]">
                ♥ Favorito local
              </span>
            )}
          </div>

          {/* Contact card */}
          {(place.phone || place.website || address || hoursEs) && (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
                <p className="font-jakarta font-bold text-sm text-[#0F172A]">Información de visita</p>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
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

      {/* ── STORIES tab ── */}
      {activeTab === "stories" && (
        <div className="space-y-3">
          {publishedStories.length === 0 ? (
            <div className="py-14 text-center rounded-2xl border border-[#E2E8F0] bg-white">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-[#CBD5E1]" />
              <p className="font-jakarta font-bold text-base text-[#0F172A] mb-1">Sin historias aún</p>
              <p className="font-inter text-sm text-[#64748B]">
                Las historias culturales de este lugar aparecerán aquí.
              </p>
            </div>
          ) : (
            publishedStories.map((sp, i) => {
              const story = sp.stories!;
              return (
                <Link
                  key={i}
                  href={`/stories/${story.slug}`}
                  className="group flex items-start gap-4 p-4 rounded-2xl border border-[#E2E8F0] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#0D9488]/30 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.1), rgba(13,148,136,0.05))" }}>
                    <BookOpen className="w-5 h-5 text-[#0D9488]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-jakarta font-bold text-sm text-[#0F172A] group-hover:text-[#0D9488] transition-colors">
                        {story.title_i18n?.es}
                      </p>
                      {story.audio_storage_path && (
                        <Volume2 className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                      )}
                    </div>
                    {story.summary_i18n?.es && (
                      <p className="font-inter text-xs leading-relaxed text-[#64748B] line-clamp-2">
                        {story.summary_i18n.es}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#0D9488] transition-colors shrink-0 mt-1" />
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* ── REVIEWS tab ── */}
      {activeTab === "reviews" && (
        <div className="space-y-5">

          {/* Rating summary */}
          {totalReviews > 0 && (
            <div className="flex items-center gap-6 p-5 rounded-2xl bg-white border border-[#E2E8F0]">
              <div className="text-center shrink-0">
                <p className="font-jakarta font-extrabold text-5xl text-[#0F172A]">{avgRating.toFixed(1)}</p>
                <div className="flex items-center justify-center gap-0.5 my-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4"
                      style={{ fill: s <= Math.round(avgRating) ? "#FBBF24" : "#E2E8F0", color: s <= Math.round(avgRating) ? "#FBBF24" : "#E2E8F0" }}
                    />
                  ))}
                </div>
                <p className="font-inter text-xs text-[#94A3B8]">{totalReviews} reseñas</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((s) => {
                  const approx = s === Math.round(avgRating) ? Math.ceil(totalReviews * 0.5)
                    : s === Math.round(avgRating) - 1 ? Math.ceil(totalReviews * 0.3)
                    : Math.ceil(totalReviews * 0.07);
                  return <RatingBar key={s} label={`${s} estrella${s !== 1 ? "s" : ""}`} count={Math.min(approx, totalReviews)} total={totalReviews} />;
                })}
              </div>
            </div>
          )}

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <div className="py-10 text-center rounded-2xl border border-[#E2E8F0] bg-white">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-[#CBD5E1]" />
              <p className="font-jakarta font-bold text-base text-[#0F172A] mb-1">Sin reseñas aún</p>
              <p className="font-inter text-sm text-[#64748B]">Sé el primero en compartir tu experiencia.</p>
            </div>
          ) : (
            reviews.map((review) => {
              const profile = review.profiles as { display_name: string } | null;
              const body    = (review.body_i18n as Record<string, string>)?.es ?? "";
              const initials = (profile?.display_name ?? "V").slice(0, 2).toUpperCase();
              return (
                <div key={review.id} className="p-5 rounded-2xl bg-white border border-[#E2E8F0]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-jakarta font-bold text-xs text-white shrink-0"
                        style={{ backgroundColor: "#0D9488" }}>
                        {initials}
                      </div>
                      <div>
                        <p className="font-inter font-semibold text-sm text-[#0F172A]">
                          {profile?.display_name ?? "Visitante"}
                        </p>
                        <p className="font-inter text-[11px] text-[#94A3B8]">
                          {new Date(review.created_at).toLocaleDateString("es-HN", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <Star key={j} className="w-3.5 h-3.5"
                          style={{ color: j <= review.rating ? "#FBBF24" : "#E2E8F0", fill: j <= review.rating ? "#FBBF24" : "#E2E8F0" }}
                        />
                      ))}
                    </div>
                  </div>
                  {body && <p className="font-inter text-sm leading-relaxed text-[#334155]">{body}</p>}
                </div>
              );
            })
          )}

          {/* Review form */}
          <ReviewForm placeId={place.id} placeSlug={place.slug} />
        </div>
      )}
    </div>
  );
}
