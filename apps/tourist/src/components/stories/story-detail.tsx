import Link from "next/link";
import {
  ArrowLeft, BookMarked, BookOpen, Landmark, Leaf,
  MapPin, Sparkles, Star, Utensils, Volume2, Waves,
  type LucideIcon,
} from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { StoryAIPanel } from "./story-ai-panel";
import { NarratorPlayer } from "./narrator-player";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ICON_BY_CATEGORY: Record<string, LucideIcon> = {
  landmark: Landmark,
  leaf: Leaf,
  utensils: Utensils,
  waves: Waves,
};

const RELATED_ACCENTS = [
  { border: "#7C3AED", iconBg: "bg-violet-50", icon: "text-violet-600" },
  { border: "#D97706", iconBg: "bg-amber-50",  icon: "text-amber-600"  },
  { border: "#0284C7", iconBg: "bg-sky-50",    icon: "text-sky-600"    },
];

// Minimal markdown → HTML for story body
function parseMarkdown(text: string): string {
  // Normalize escaped \n (stored literally in DB) → real newlines
  const normalized = text.replace(/\\n/g, "\n");
  return normalized
    .replace(/^# (.+)$/gm,  '<h2 class="story-h2">$1</h2>')
    .replace(/^## (.+)$/gm, '<h2 class="story-h2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="story-h3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="story-strong">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="story-li">$1</li>')
    .replace(/\n\n/g, '</p><p class="story-p">')
    .replace(/\n/g, '<br/>')
    .trim();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StoryDetail({
  story,
  related,
  isGuest = false,
}: {
  story: Story;
  related: RelatedStory[];
  isGuest?: boolean;
}) {
  const title   = story.title_i18n?.es ?? story.slug;
  const summary = story.summary_i18n?.es ?? "";
  const body    = story.body_markdown_i18n?.es ?? "";
  const region  = story.regions as { name_i18n: Record<string, string>; slug: string } | null;
  const regName = region?.name_i18n?.es;
  const places  = story.story_places ?? [];
  const pullQuote = summary.split(".")[0] + ".";

  return (
    <article>

      {/* ── Hero — AuroraBackground ──────────────────────────────── */}
      <div className="mx-auto w-full max-w-6xl px-6 pt-8 md:px-10 md:pt-10">
        <AuroraBackground className="rounded-2xl border border-[#d7e2de] items-start justify-start">
          <div className="relative z-10 w-full px-6 py-8 md:px-8 md:py-10">

            {/* Back link */}
            <Link
              href="/stories"
              className="mb-6 inline-flex cursor-pointer items-center gap-1.5 font-inter text-sm font-semibold text-[#64748b] transition-colors hover:text-[#0D9488]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver a Historias
            </Link>

            {/* Badges */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {regName && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d7e2de] bg-white/80 px-3 py-1 font-inter text-xs font-bold text-[#334155]">
                  <MapPin className="h-3 w-3 text-[#0D9488]" aria-hidden />
                  {regName}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0D9488]/25 bg-[#0D9488]/10 px-3 py-1 font-inter text-xs font-bold text-[#00685f]">
                <Sparkles className="h-3 w-3" aria-hidden />
                Narrada por Itinera IA
              </span>
              {story.featured && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-inter text-xs font-bold text-amber-700">
                  Destacada
                </span>
              )}
            </div>

            {/* Title */}
            <h1
              className="max-w-3xl font-jakarta font-extrabold leading-tight text-[#0f172a]"
              style={{ fontSize: "clamp(24px, 4vw, 44px)" }}
            >
              {title}
            </h1>

            {/* Summary + audio */}
            <p className="mt-4 max-w-2xl font-inter text-base leading-7 text-[#334155]">
              {summary}
            </p>

            {/* Narrator player — always available via ElevenLabs TTS */}
            <div className="mt-5 max-w-md">
              <NarratorPlayer
                text={body ?? summary}
                storyTitle={title}
              />
            </div>
          </div>
        </AuroraBackground>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="mx-auto mt-8 w-full max-w-6xl px-6 md:px-10">
        <div className="flex items-start gap-8">

          {/* ── Left: article body ── */}
          <div className="min-w-0 flex-1">

            {/* Pull quote */}
            <blockquote className="mb-8 rounded-2xl border border-[#d7e2de] border-l-4 border-l-[#0D9488] bg-white px-6 py-5 shadow-sm">
              <Sparkles className="mb-2 h-5 w-5 text-[#0D9488]" aria-hidden />
              <p className="font-jakarta text-lg font-semibold leading-relaxed text-[#0f172a]">
                &ldquo;{pullQuote}&rdquo;
              </p>
              <p className="mt-2 font-inter text-xs italic text-[#94a3b8]">
                Fragmento de la historia
              </p>
            </blockquote>

            {/* Body */}
            {body ? (
              <div
                className="story-body rounded-2xl border border-[#d7e2de] bg-white px-6 py-8 shadow-sm md:px-8"
                dangerouslySetInnerHTML={{
                  __html: `<p class="story-p">${parseMarkdown(body)}</p>`,
                }}
              />
            ) : (
              <div className="rounded-2xl border border-[#d7e2de] bg-white px-6 py-10 text-center shadow-sm">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-[#bcc9c6]" aria-hidden />
                <p className="font-jakarta text-base font-bold text-[#0f172a]">Historia en preparación</p>
                <p className="mt-1.5 font-inter text-sm text-[#64748b]">
                  Próximamente disponible con narración completa.
                </p>
              </div>
            )}

            {/* Linked places */}
            {places.length > 0 && (
              <div className="mt-6 rounded-2xl border border-[#d7e2de] bg-white p-5 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 font-jakarta text-base font-bold text-[#0f172a]">
                  <MapPin className="h-4 w-4 text-[#0D9488]" aria-hidden />
                  Lugares de esta historia
                </h2>
                <div className="space-y-2.5">
                  {places.map((sp, i) => {
                    const place = sp.places;
                    if (!place) return null;
                    const pName    = place.name_i18n?.es ?? place.slug;
                    const pCat     = place.place_categories as { name_i18n: Record<string, string>; icon_name: string } | null;
                    const pCatName = pCat?.name_i18n?.es;
                    const PlaceIcon = ICON_BY_CATEGORY[pCat?.icon_name ?? ""] ?? Landmark;

                    return (
                      <Link
                        key={i}
                        href={`/places/${place.slug}`}
                        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[#d7e2de] bg-[#f0f5f2] p-3 transition-all duration-200 hover:border-[#0D9488]/30 hover:bg-white hover:shadow-sm"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#d7e2de]">
                          <PlaceIcon className="h-5 w-5 text-[#0D9488]" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-jakarta text-sm font-bold text-[#0f172a] group-hover:text-[#0D9488] transition-colors">
                            {pName}
                          </p>
                          {pCatName && (
                            <p className="font-inter text-xs text-[#64748b]">{pCatName}</p>
                          )}
                        </div>
                        {place.aggregated_rating > 0 && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                            <span className="font-inter text-xs font-semibold text-[#334155]">
                              {Number(place.aggregated_rating).toFixed(1)}
                            </span>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Related stories */}
            {related.length > 0 && (
              <div className="mt-6 mb-6">
                <h2 className="mb-4 font-jakarta text-xl font-bold text-[#0f172a]">
                  Más historias culturales
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {related.map((r, i) => {
                    const accent = RELATED_ACCENTS[i % RELATED_ACCENTS.length];
                    return (
                      <Link
                        key={r.id}
                        href={`/stories/${r.slug}`}
                        className="group cursor-pointer overflow-hidden rounded-2xl border border-[#d7e2de] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0D9488]/30 hover:shadow-md"
                        style={{ borderTop: `3px solid ${accent.border}` }}
                      >
                        <div className="p-4">
                          <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg ${accent.iconBg}`}>
                            <BookMarked className={`h-4 w-4 ${accent.icon}`} aria-hidden />
                          </div>
                          <h3 className="font-jakarta text-sm font-bold leading-snug text-[#0f172a] line-clamp-2 group-hover:text-[#0D9488] transition-colors">
                            {r.title_i18n?.es ?? r.slug}
                          </h3>
                          <div className="mt-3 flex items-center justify-between">
                            {r.audio_storage_path && (
                              <span className="inline-flex items-center gap-1 font-inter text-[10px] font-bold text-[#0D9488]">
                                <Volume2 className="h-3 w-3" aria-hidden /> Audio
                              </span>
                            )}
                            <span className="ml-auto font-inter text-xs font-bold text-[#0D9488]">
                              Leer →
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: AI panel (desktop) ── */}
          <aside className="hidden w-[300px] shrink-0 lg:block">
            <div className="sticky top-8">
              <StoryAIPanel story={story as never} />
            </div>
          </aside>

        </div>
      </div>

    </article>
  );
}
