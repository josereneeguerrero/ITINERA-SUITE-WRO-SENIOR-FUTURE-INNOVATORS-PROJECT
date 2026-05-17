import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles, Volume2 } from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";

interface Story {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  summary_i18n: Record<string, string>;
  audio_storage_path: string | null;
  regions: { name_i18n: Record<string, string> } | null;
}

export function StoriesHero({ featured }: { featured: Story | null }) {
  const title   = featured?.title_i18n?.es ?? featured?.title_i18n?.en ?? null;
  const summary = featured?.summary_i18n?.es ?? featured?.summary_i18n?.en ?? null;
  const region  = (featured?.regions as { name_i18n: Record<string, string> } | null)?.name_i18n?.es ?? null;

  return (
    <AuroraBackground className="min-h-[260px] rounded-2xl border border-[#d7e2de] md:min-h-[300px] items-start justify-start">
      <div className="relative z-10 w-full px-6 py-8 md:px-8 md:py-9 flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-12">

        {/* Left — eyebrow + headline */}
        <div className="flex-1">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#0D9488]/25 bg-[#0D9488]/10 px-3.5 py-1.5 font-inter text-xs font-bold uppercase tracking-[0.16em] text-[#00685f]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Historias culturales · IA
          </div>
          <h1 className="font-jakarta font-extrabold leading-tight text-[#0f172a]"
            style={{ fontSize: "clamp(24px, 3.5vw, 40px)" }}>
            Las historias que<br className="hidden sm:block" /> Honduras quiere contarte
          </h1>
          <p className="mt-3 max-w-md font-inter text-sm leading-6 text-[#334155] md:text-base">
            Relatos narrados con inteligencia artificial sobre cultura, historia y tradiciones de cada rincón del país.
          </p>
        </div>

        {/* Right — featured story card */}
        {featured && title ? (
          <Link
            href={`/stories/${featured.slug}`}
            className="group w-full cursor-pointer rounded-2xl border border-[#d7e2de] bg-white/90 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0D9488]/30 hover:shadow-md lg:w-[340px] lg:shrink-0"
          >
            {/* Card header */}
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0D9488]/10">
                <BookOpen className="h-5 w-5 text-[#0D9488]" aria-hidden />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {region && (
                  <span className="rounded-full border border-[#d7e2de] bg-white px-2.5 py-0.5 font-inter text-[10px] font-bold uppercase tracking-wide text-[#334155]">
                    {region}
                  </span>
                )}
                {featured.audio_storage_path && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 font-inter text-[10px] font-bold text-[#0D9488]">
                    <Volume2 className="h-3 w-3" aria-hidden />
                    Audio
                  </span>
                )}
              </div>
            </div>

            {/* Card body */}
            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#0D9488]">
              Historia destacada
            </p>
            <h2 className="mt-1 font-jakarta text-base font-bold leading-snug text-[#0f172a] line-clamp-2 group-hover:text-[#0D9488] transition-colors">
              {title}
            </h2>
            {summary && (
              <p className="mt-2 font-inter text-xs leading-5 text-[#64748b] line-clamp-2">
                {summary}
              </p>
            )}

            {/* CTA */}
            <div className="mt-4 flex items-center gap-1.5 font-inter text-sm font-bold text-[#0D9488]">
              Leer historia
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </div>
          </Link>
        ) : (
          <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-dashed border-[#bcc9c6] bg-white/60 lg:w-[300px] lg:shrink-0">
            <BookOpen className="h-10 w-10 text-[#bcc9c6]" aria-hidden />
          </div>
        )}
      </div>
    </AuroraBackground>
  );
}
