import Link from "next/link";
import { ArrowRight, BookOpen, Volume2 } from "lucide-react";

export type DashboardHomeStory = {
  id: string;
  slug: string;
  title_i18n: Record<string, string> | null;
  summary_i18n: Record<string, string> | null;
  audio_storage_path: string | null;
  featured: boolean | null;
  regions:
    | {
        name_i18n: Record<string, string> | null;
        slug: string | null;
      }
    | Array<{
        name_i18n: Record<string, string> | null;
        slug: string | null;
      }>
    | null;
};

function getText(value: Record<string, string> | null | undefined, fallback: string) {
  return value?.es ?? value?.en ?? fallback;
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function DashboardHomeStories({ story }: { story: DashboardHomeStory | null }) {
  const region = firstRelation(story?.regions);
  const title = getText(story?.title_i18n, "Historia de Honduras");
  const summary = getText(
    story?.summary_i18n,
    "Relatos culturales publicados por Itinera para descubrir Honduras con contexto local."
  );
  const regionName = getText(region?.name_i18n, "");

  return (
    <section className="mx-auto mt-14 w-full max-w-6xl px-6 md:px-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-jakarta text-2xl font-bold text-[#171d1c] md:text-3xl">
          Historias y Tradiciones
        </h2>
        <Link
          href="/stories"
          className="inline-flex items-center gap-1.5 font-inter text-sm font-bold text-[#00685f] transition-opacity hover:opacity-80"
        >
          Ver más <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {story ? (
        <Link
          href={`/stories/${story.slug}`}
          className="group relative block min-h-[340px] overflow-hidden rounded-2xl border border-[#123f3a]/20 bg-[#0f172a] p-7 shadow-[0_18px_50px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(13,148,136,0.18)] md:min-h-[380px] md:p-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(13,148,136,0.35),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(245,158,11,0.18),transparent_30%),linear-gradient(135deg,#0a2f2c_0%,#17211f_48%,#0f172a_100%)]" />
          <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(135deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:22px_22px]" />
          <BookOpen
            className="absolute right-6 top-6 h-28 w-28 text-white/10 transition-transform duration-300 group-hover:scale-105 md:right-10 md:top-10 md:h-36 md:w-36"
            aria-hidden="true"
          />

          <div className="relative flex min-h-[286px] max-w-2xl flex-col justify-end md:min-h-[300px]">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#f59e0b]/35 bg-[#f59e0b]/15 px-3 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.18em] text-[#facc15]">
                {regionName ? regionName : "Historia destacada"}
              </span>
              {story.audio_storage_path && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 font-inter text-[10px] font-semibold text-white/75">
                  <Volume2 className="h-3 w-3" aria-hidden="true" />
                  Audio disponible
                </span>
              )}
            </div>

            <h3 className="font-jakarta text-3xl font-bold leading-tight text-white md:text-5xl">
              {title}
            </h3>
            <p className="mt-4 max-w-xl font-inter text-sm leading-7 text-white/72 md:text-base">
              {summary}
            </p>

            <span className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 font-inter text-sm font-bold text-[#00685f] shadow-sm transition-transform duration-300 group-hover:translate-x-1">
              Leer historia <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </Link>
      ) : (
        <div className="rounded-2xl border border-[#dee4e1] bg-white px-6 py-10 text-center shadow-sm">
          <BookOpen className="mx-auto mb-3 h-9 w-9 text-[#0d9488]" aria-hidden="true" />
          <p className="font-jakarta text-lg font-bold text-[#171d1c]">
            Aún no hay historias destacadas publicadas.
          </p>
          <Link
            href="/stories"
            className="mt-3 inline-flex items-center gap-1.5 font-inter text-sm font-bold text-[#00685f]"
          >
            Ver historias <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}
