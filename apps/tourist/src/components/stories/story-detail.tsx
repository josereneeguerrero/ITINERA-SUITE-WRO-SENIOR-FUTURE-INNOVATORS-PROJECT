import Link from "next/link";
import {
  ArrowLeft, Volume2, BookOpen,
  MapPin, Star, ChevronRight, Sparkles,
} from "lucide-react";
import { StoryAIPanel } from "./story-ai-panel";

interface StoryPlace {
  places: {
    id: string;
    slug: string;
    name_i18n: Record<string, string>;
    aggregated_rating: number;
    place_categories: { name_i18n: Record<string, string>; icon_name: string } | null;
  } | null;
}

interface Story {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  summary_i18n: Record<string, string>;
  body_markdown_i18n: Record<string, string>;
  audio_storage_path: string | null;
  featured: boolean;
  regions: { name_i18n: Record<string, string>; slug: string } | null;
  story_places: StoryPlace[];
}

interface RelatedStory {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  summary_i18n: Record<string, string>;
  audio_storage_path: string | null;
}

const ICON_MAP: Record<string, string> = {
  landmark: "🏛️", leaf: "🌿", utensils: "🍽️",
  waves: "🏖️", zap: "⚡", church: "⛪",
};

const RELATED_COLORS = [
  "linear-gradient(135deg, #7C3AED, #4C1D95)",
  "linear-gradient(135deg, #D97706, #92400E)",
  "linear-gradient(135deg, #0369A1, #0C4A6E)",
];

// Render markdown to rich HTML
function parseMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm,
      '<h2 style="font-family:var(--font-jakarta),sans-serif;font-weight:700;font-size:22px;color:#0F172A;margin-top:2.5rem;margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:2px solid rgba(13,148,136,0.2);">$1</h2>')
    .replace(/^### (.+)$/gm,
      '<h3 style="font-family:var(--font-jakarta),sans-serif;font-weight:600;font-size:17px;color:#0F172A;margin-top:1.75rem;margin-bottom:0.5rem;">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g,
      '<strong style="font-weight:600;color:#0F172A;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm,
      '<li style="margin-left:1.25rem;margin-bottom:0.25rem;color:#334155;font-size:15px;">$1</li>')
    .replace(/\n\n/g,
      '</p><p style="font-family:var(--font-inter),sans-serif;font-size:15px;line-height:1.8;color:#334155;margin-bottom:1rem;">')
    .trim();
}

export function StoryDetail({
  story,
  related,
}: {
  story: Story;
  related: RelatedStory[];
}) {
  const title   = story.title_i18n?.es ?? story.slug;
  const summary = story.summary_i18n?.es ?? "";
  const body    = story.body_markdown_i18n?.es ?? "";
  const region  = story.regions as { name_i18n: Record<string,string>; slug: string } | null;
  const regName = region?.name_i18n?.es;
  const places  = story.story_places ?? [];

  // Extract first sentence for pull quote
  const pullQuote = summary.split(".")[0] + ".";

  return (
    <article className="pt-16">

      {/* Editorial header */}
      <div
        className="px-6 py-16 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)" }}
      >
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute right-0 top-0 bottom-0 w-[40%] opacity-5 flex items-center justify-center">
          <BookOpen className="w-[300px] h-[300px] text-white" />
        </div>

        <div className="max-w-3xl mx-auto relative z-10">
          <Link
            href="/stories"
            className="inline-flex items-center gap-1.5 font-inter text-sm text-white/40 hover:text-white/80 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Historias
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-5">
            {regName && (
              <span
                className="font-inter font-semibold text-[10px] uppercase tracking-[0.15em] px-3 py-1 rounded-full"
                style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                PATRIMONIO · {regName.toUpperCase()}
              </span>
            )}
            <span
              className="font-inter font-semibold text-[10px] uppercase tracking-[0.15em] px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(13,148,136,0.15)", color: "#6EE7B7", border: "1px solid rgba(13,148,136,0.25)" }}
            >
              ✨ NARRADA POR IA
            </span>
          </div>

          <h1
            className="font-jakarta font-bold text-white leading-tight mb-5"
            style={{ fontSize: "clamp(28px, 4.5vw, 48px)" }}
          >
            {title}
          </h1>

          <p className="font-inter text-white/65 text-lg leading-relaxed max-w-2xl mb-7">
            {summary}
          </p>

          {/* Meta + audio */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-inter text-xs text-white/30 italic">
              Narrada por Itinera IA · Honduras
            </span>
            {story.audio_storage_path && (
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full font-inter font-semibold text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: "#0D9488", color: "white" }}
              >
                <Volume2 className="w-4 h-4" />
                Escuchar narración
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main: article + AI panel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex gap-8 items-start">

          {/* ── Article body ── */}
          <div className="flex-1 min-w-0">

            {/* Pull quote */}
            <blockquote
              className="mb-8 px-6 py-5 rounded-2xl relative"
              style={{
                background: "linear-gradient(135deg, rgba(13,148,136,0.06), rgba(13,148,136,0.02))",
                border: "1px solid rgba(13,148,136,0.15)",
                borderLeft: "4px solid #0D9488",
              }}
            >
              <Sparkles className="w-5 h-5 mb-2" style={{ color: "#0D9488" }} />
              <p className="font-jakarta font-semibold text-lg leading-relaxed text-[#0F172A]">
                &ldquo;{pullQuote}&rdquo;
              </p>
              <p className="font-inter text-xs mt-2 italic" style={{ color: "#94A3B8" }}>
                Fragmento de la historia
              </p>
            </blockquote>

            {/* Body text */}
            {body ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: `<p style="font-family:var(--font-inter),sans-serif;font-size:15px;line-height:1.8;color:#334155;margin-bottom:1rem;">${parseMarkdown(body)}</p>`,
                }}
              />
            ) : (
              <p className="font-inter text-[15px] leading-relaxed text-[#64748B]">
                Historia en preparación. Próximamente disponible con narración completa.
              </p>
            )}

            {/* Linked places */}
            {places.length > 0 && (
              <div
                className="mt-10 rounded-2xl p-5"
                style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
              >
                <h2 className="font-jakarta font-bold text-base text-[#0F172A] mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: "#0D9488" }} />
                  Lugares de esta historia
                </h2>
                <div className="space-y-3">
                  {places.map((sp, i) => {
                    const place = sp.places;
                    if (!place) return null;
                    const pName    = place.name_i18n?.es;
                    const pCat     = place.place_categories as { name_i18n: Record<string,string>; icon_name: string } | null;
                    const pIcon    = ICON_MAP[pCat?.icon_name ?? ""] ?? "📍";
                    const pCatName = pCat?.name_i18n?.es;

                    return (
                      <Link
                        key={i}
                        href={`/places/${place.slug}`}
                        className="flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-md"
                        style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg"
                          style={{ backgroundColor: "rgba(13,148,136,0.08)" }}
                        >
                          {pIcon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-jakarta font-semibold text-sm text-[#0F172A]">{pName}</p>
                          {pCatName && (
                            <p className="font-inter text-[11px]" style={{ color: "#0D9488" }}>{pCatName}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="font-inter text-xs text-[#64748B]">
                            {Number(place.aggregated_rating).toFixed(1)}
                          </span>
                          <ChevronRight className="w-4 h-4 ml-1" style={{ color: "#0D9488" }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Related stories */}
            {related.length > 0 && (
              <div className="mt-10">
                <h2 className="font-jakarta font-bold text-lg text-[#0F172A] mb-5">
                  Más historias culturales
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {related.map((r, i) => (
                    <Link
                      key={r.id}
                      href={`/stories/${r.slug}`}
                      className="p-4 rounded-xl transition-all hover:shadow-md"
                      style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}
                    >
                      <div
                        className="h-20 rounded-lg mb-3 flex items-center justify-center"
                        style={{ background: RELATED_COLORS[i % RELATED_COLORS.length] }}
                      >
                        <BookOpen className="w-8 h-8 text-white opacity-30" />
                      </div>
                      <h3 className="font-jakarta font-semibold text-sm text-[#0F172A] line-clamp-2 mb-1">
                        {r.title_i18n?.es}
                      </h3>
                      <span className="font-inter font-medium text-xs" style={{ color: "#0D9488" }}>
                        Leer →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── AI Narration Panel ── */}
          <div className="w-[320px] shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <StoryAIPanel story={story as never} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
