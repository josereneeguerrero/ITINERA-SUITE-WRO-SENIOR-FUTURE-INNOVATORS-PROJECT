import Link from "next/link";
import { Volume2, BookOpen, ArrowRight } from "lucide-react";

interface Story {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  summary_i18n: Record<string, string>;
  audio_storage_path: string | null;
  regions: { name_i18n: Record<string, string> } | null;
}

export function LandingStories({ story }: { story: Story | null }) {
  const title   = story?.title_i18n?.es;
  const summary = story?.summary_i18n?.es;
  const region  = (story?.regions as { name_i18n: Record<string,string> } | null)?.name_i18n?.es;

  return (
    <section className="bg-white py-0 overflow-hidden section-contained">
      <div className="flex flex-col lg:flex-row min-h-[320px]">

        {/* Left: teal panel */}
        <div
          className="flex-1 flex flex-col justify-between px-8 py-12 relative overflow-hidden"
          style={{ background: "linear-gradient(160deg, #0D9488 0%, #064E3B 100%)" }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-10 bg-white" />
          <div className="absolute -bottom-20 right-10 w-80 h-80 rounded-full opacity-5 bg-white" />

          <div className="relative z-10">
            <span
              className="inline-block font-inter font-semibold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full mb-5"
              style={{ backgroundColor: "rgba(245,158,11,0.2)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              HISTORIAS CULTURALES
            </span>
            <h2
              className="font-jakarta font-bold text-white leading-snug mb-4 max-w-sm"
              style={{ fontSize: "clamp(22px, 3vw, 32px)" }}
            >
              Las historias que Honduras quiere contarte.
            </h2>
            <p className="font-inter text-white/70 text-sm mb-6 max-w-xs">
              Descubre la riqueza cultural a través de relatos narrados por IA.
            </p>
          </div>

          <Link
            href="/stories"
            className="relative z-10 w-fit flex items-center gap-2 font-inter font-semibold text-sm text-[#0D9488] bg-white px-5 py-2.5 rounded-xl transition-all hover:shadow-md"
          >
            Explorar historias <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Right: featured story */}
        {story ? (
          <div
            className="flex-1 flex flex-col justify-end px-8 py-12 relative overflow-hidden"
            style={{ backgroundColor: "#1E293B" }}
          >
            {/* Book icon decoration */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04]">
              <BookOpen className="w-64 h-64 text-white" />
            </div>

            <div className="relative z-10">
              {region && (
                <span
                  className="inline-block font-inter font-semibold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full mb-4"
                  style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}
                >
                  PATRIMONIO · {region.toUpperCase()}
                </span>
              )}
              <h3
                className="font-jakarta font-bold text-white mb-2 leading-tight"
                style={{ fontSize: "clamp(18px, 2.5vw, 24px)" }}
              >
                {title}
              </h3>
              {summary && (
                <p className="font-inter text-sm leading-relaxed mb-5 line-clamp-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {summary}
                </p>
              )}
              <div className="flex items-center gap-3">
                <Link
                  href={`/stories/${story.slug}`}
                  className="btn-teal font-inter font-semibold text-sm px-4 py-2 rounded-xl inline-flex items-center gap-1.5"
                >
                  Leer historia →
                </Link>
                {story.audio_storage_path && (
                  <span className="flex items-center gap-1.5 font-inter text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <Volume2 className="w-3.5 h-3.5" />
                    Audio disponible
                  </span>
                )}
              </div>
              <p className="font-inter text-[10px] mt-3 italic" style={{ color: "rgba(255,255,255,0.3)" }}>
                Narrada por Itinera IA
              </p>
            </div>
          </div>
        ) : (
          <div
            className="flex-1 flex items-center justify-center"
            style={{ backgroundColor: "#1E293B" }}
          >
            <div className="text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20 text-white" />
              <Link href="/stories" className="font-inter text-sm text-white/50 hover:text-white/80 transition-colors">
                Ver todas las historias →
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
