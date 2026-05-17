import Link from "next/link";
import { BookOpen, Lock, Volume2, ArrowRight, BookMarked } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

interface Story {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  summary_i18n: Record<string, string>;
  audio_storage_path: string | null;
  featured: boolean;
  regions: { slug: string; name_i18n: Record<string, string> } | null;
}

interface Region {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
}

// Accent palette — matches brand DNA
const ACCENTS = [
  { border: "#0D9488", iconBg: "bg-teal-50",    icon: "text-[#0D9488]" },
  { border: "#7C3AED", iconBg: "bg-violet-50",  icon: "text-violet-600" },
  { border: "#D97706", iconBg: "bg-amber-50",   icon: "text-amber-600"  },
  { border: "#0284C7", iconBg: "bg-sky-50",     icon: "text-sky-600"    },
  { border: "#E11D48", iconBg: "bg-rose-50",    icon: "text-rose-600"   },
  { border: "#059669", iconBg: "bg-emerald-50", icon: "text-emerald-600"},
];

// Coming-soon teasers to fill empty grid
const COMING_SOON = [
  { title: "Los Garífunas de la Costa Caribe", region: "Atlántida" },
  { title: "La Ruta del Café Hondureño",       region: "Copán"     },
  { title: "Mosquitia: La Selva Inexplorada",  region: "Gracias a Dios" },
  { title: "Las Mariposas de Lancetilla",      region: "Atlántida" },
];

export function StoriesGrid({
  stories,
  regions,
  activeRegion,
}: {
  stories: Story[];
  regions: Region[];
  activeRegion?: string;
  isGuest?: boolean;
}) {
  const activeRegionName = regions.find((r) => r.slug === activeRegion)?.name_i18n?.es ?? activeRegion;
  const fillerCount = Math.max(0, 4 - stories.length);

  return (
    <div>

      {/* ── Filter pills ──────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link
          href="/stories"
          className={`cursor-pointer rounded-full px-4 py-1.5 font-inter text-sm font-semibold transition-all duration-200 ${
            !activeRegion
              ? "bg-[#0D9488] text-white shadow-sm"
              : "border border-[#d7e2de] bg-white text-[#334155] hover:border-[#0D9488]/30 hover:text-[#0D9488]"
          }`}
        >
          Todas
        </Link>
        {regions.map((r) => (
          <Link
            key={r.id}
            href={`/stories?region=${r.slug}`}
            className={`cursor-pointer rounded-full px-4 py-1.5 font-inter text-sm font-semibold transition-all duration-200 ${
              activeRegion === r.slug
                ? "bg-[#0D9488] text-white shadow-sm"
                : "border border-[#d7e2de] bg-white text-[#334155] hover:border-[#0D9488]/30 hover:text-[#0D9488]"
            }`}
          >
            {r.name_i18n?.es}
          </Link>
        ))}
      </div>

      {/* ── Section header ────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-jakarta text-2xl font-bold text-[#0f172a] md:text-3xl">
          {activeRegion
            ? `Historias de ${activeRegionName}`
            : "Todas las historias"}
        </h2>
        <span className="font-inter text-sm text-[#64748b]">
          {stories.length} {stories.length === 1 ? "historia" : "historias"}
        </span>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {stories.length === 0 && activeRegion && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d7e2de] bg-white">
            <BookOpen className="h-8 w-8 text-[#bcc9c6]" aria-hidden />
          </div>
          <p className="font-jakarta text-lg font-bold text-[#0f172a]">
            Sin historias en esta región aún
          </p>
          <p className="mt-1.5 font-inter text-sm text-[#64748b]">
            Estamos trabajando en más contenido para {activeRegionName}.
          </p>
          <Link
            href="/stories"
            className="mt-5 inline-flex cursor-pointer items-center gap-1.5 font-inter text-sm font-bold text-[#0D9488] hover:underline"
          >
            Ver todas las historias <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      )}

      {/* ── Stories grid ──────────────────────────────────────────────── */}
      {stories.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

          {stories.map((story, i) => {
            const accent  = ACCENTS[i % ACCENTS.length];
            const title   = story.title_i18n?.es ?? story.title_i18n?.en ?? story.slug;
            const summary = story.summary_i18n?.es ?? story.summary_i18n?.en ?? "";
            const region  = story.regions as { slug: string; name_i18n: Record<string, string> } | null;
            const regName = region?.name_i18n?.es;

            return (
              <ScrollReveal key={story.id} delay={Math.min(i * 60, 300)}>
                <Link
                  href={`/stories/${story.slug}`}
                  className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#d7e2de] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0D9488]/30 hover:shadow-md"
                  style={{ borderTop: `3px solid ${accent.border}` }}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3 p-5 pb-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.iconBg}`}>
                      <BookMarked className={`h-5 w-5 ${accent.icon}`} aria-hidden />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {story.featured && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-inter text-[10px] font-bold text-amber-700">
                          Destacada
                        </span>
                      )}
                      {story.audio_storage_path && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 font-inter text-[10px] font-bold text-[#0D9488]">
                          <Volume2 className="h-3 w-3" aria-hidden />
                          Audio
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-1 flex-col px-5 pb-5">
                    <h3 className="font-jakarta text-base font-bold leading-snug text-[#0f172a] line-clamp-2 group-hover:text-[#0D9488] transition-colors duration-200">
                      {title}
                    </h3>
                    {summary && (
                      <p className="mt-2 font-inter text-xs leading-5 text-[#64748b] line-clamp-3 flex-1">
                        {summary}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-[#f1f5f9] pt-3">
                      <div className="flex items-center gap-1.5">
                        {regName && (
                          <span className="font-inter text-[11px] font-semibold text-[#64748b]">
                            {regName}
                          </span>
                        )}
                        <span className="font-inter text-[10px] italic text-[#94a3b8]">
                          {regName ? "· " : ""}Narrada por Itinera IA
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 font-inter text-xs font-bold text-[#0D9488] transition-transform duration-200 group-hover:translate-x-0.5">
                        Leer <ArrowRight className="h-3 w-3" aria-hidden />
                      </span>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}

          {/* Coming soon fillers */}
          {!activeRegion && COMING_SOON.slice(0, fillerCount).map((item, i) => (
            <div
              key={`soon-${i}`}
              className="flex flex-col overflow-hidden rounded-2xl border border-dashed border-[#bcc9c6] bg-white/60 opacity-55"
            >
              <div className="flex items-start gap-3 p-5 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9]">
                  <Lock className="h-5 w-5 text-[#bcc9c6]" aria-hidden />
                </div>
                <span className="mt-1 rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-0.5 font-inter text-[10px] font-semibold text-[#94a3b8]">
                  {item.region}
                </span>
              </div>
              <div className="px-5 pb-5">
                <h3 className="font-jakarta text-sm font-bold leading-snug text-[#bcc9c6] line-clamp-2">
                  {item.title}
                </h3>
                <p className="mt-2 font-inter text-xs text-[#cbd5e1]">Próximamente</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
