import Link from "next/link";
import { BookOpen, Volume2, ArrowRight } from "lucide-react";

interface Story {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  summary_i18n: Record<string, string>;
  audio_storage_path: string | null;
  regions: { name_i18n: Record<string, string> } | null;
}

export function StoriesHero({ featured }: { featured: Story | null }) {
  return (
    <section className="mt-16">
      {/* Editorial hero — split */}
      <div className="flex min-h-[400px]">

        {/* Left: teal panel */}
        <div
          className="flex-1 flex flex-col justify-between px-10 py-12 relative overflow-hidden"
          style={{ background: "linear-gradient(160deg, #0D9488 0%, #064E3B 100%)" }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-10"
            style={{ backgroundColor: "white" }} />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-5"
            style={{ backgroundColor: "white" }} />

          <div className="relative z-10">
            <span
              className="inline-block font-inter font-semibold text-[10px] uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-5"
              style={{ backgroundColor: "rgba(245,158,11,0.25)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              HISTORIAS CULTURALES
            </span>
            <h1 className="font-jakarta font-bold text-white leading-tight mb-3"
              style={{ fontSize: "clamp(28px, 4vw, 42px)" }}>
              Las historias que<br />Honduras quiere contarte
            </h1>
            <p className="font-inter text-white/75 text-base max-w-sm">
              Descubre la riqueza cultural a través de relatos narrados por IA
            </p>
          </div>

          <Link
            href="/explore"
            className="relative z-10 w-fit flex items-center gap-2 px-5 py-2.5 rounded-full font-inter font-semibold text-sm text-[#0D9488] bg-white transition-all hover:shadow-md"
          >
            Explorar lugares <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Right: featured story */}
        {featured ? (
          <div
            className="w-[45%] shrink-0 flex flex-col justify-end p-8 relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, #1E293B, #0F172A)" }}
          >
            {/* Decorative book icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5">
              <BookOpen className="w-64 h-64 text-white" />
            </div>

            <div className="relative z-10">
              {/* Region badge */}
              {(featured.regions as { name_i18n: Record<string,string> } | null)?.name_i18n?.es && (
                <span
                  className="inline-block font-inter font-semibold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full mb-3"
                  style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}
                >
                  PATRIMONIO · {(featured.regions as { name_i18n: Record<string,string> }).name_i18n?.es?.toUpperCase()}
                </span>
              )}

              <h2 className="font-jakarta font-bold text-white text-2xl mb-2 leading-tight">
                {featured.title_i18n?.es}
              </h2>
              <p className="font-inter text-white/60 text-sm leading-relaxed mb-4 line-clamp-2">
                {featured.summary_i18n?.es}
              </p>

              <div className="flex items-center gap-3">
                <Link
                  href={`/stories/${featured.slug}`}
                  className="flex items-center gap-1.5 font-inter font-semibold text-sm text-white px-4 py-2 rounded-full transition-all"
                  style={{ backgroundColor: "#0D9488" }}
                >
                  Leer historia →
                </Link>
                {featured.audio_storage_path && (
                  <span className="flex items-center gap-1.5 font-inter text-xs text-white/60">
                    <Volume2 className="w-3.5 h-3.5" />
                    Audio disponible
                  </span>
                )}
              </div>

              <p className="font-inter text-[10px] text-white/30 mt-3 italic">
                Narrada por Itinera IA
              </p>
            </div>
          </div>
        ) : (
          <div
            className="w-[45%] shrink-0 flex items-center justify-center"
            style={{ backgroundColor: "#1E293B" }}
          >
            <BookOpen className="w-16 h-16 text-white/10" />
          </div>
        )}
      </div>
    </section>
  );
}
