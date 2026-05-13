"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { BookOpen, Volume2, ChevronRight, Lock } from "lucide-react";

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

const STORY_COLORS = [
  "linear-gradient(135deg, #0D9488, #064E3B)",
  "linear-gradient(135deg, #7C3AED, #4C1D95)",
  "linear-gradient(135deg, #D97706, #92400E)",
  "linear-gradient(135deg, #0369A1, #0C4A6E)",
  "linear-gradient(135deg, #DC2626, #7F1D1D)",
  "linear-gradient(135deg, #059669, #065F46)",
];

// Placeholder stories to fill the grid visually
const COMING_SOON = [
  { title: "Los Garífunas de la Costa Caribe", region: "La Ceiba" },
  { title: "La Ruta del Café Hondureño", region: "Copán" },
  { title: "Mosquitia: La Selva Inexplorada", region: "Trujillo" },
  { title: "Las Mariposas de Lancetilla", region: "Tela" },
];

export function StoriesGrid({
  stories,
  regions,
  activeRegion,
}: {
  stories: Story[];
  regions: Region[];
  activeRegion?: string;
}) {
  const router   = useRouter();
  const pathname = usePathname();

  function setRegion(slug: string) {
    router.push(slug ? `${pathname}?region=${slug}` : pathname);
  }

  // How many "coming soon" to show to fill grid nicely
  const fillerCount = Math.max(0, 3 - stories.length);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        <button
          onClick={() => setRegion("")}
          className="px-4 py-1.5 rounded-full font-inter font-medium text-sm transition-all"
          style={
            !activeRegion
              ? { backgroundColor: "#0D9488", color: "white" }
              : { backgroundColor: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }
          }
        >
          Todas
        </button>
        {regions.map((r) => (
          <button
            key={r.id}
            onClick={() => setRegion(r.slug)}
            className="px-4 py-1.5 rounded-full font-inter font-medium text-sm transition-all"
            style={
              activeRegion === r.slug
                ? { backgroundColor: "#0D9488", color: "white" }
                : { backgroundColor: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }
            }
          >
            {r.name_i18n?.es}
          </button>
        ))}
      </div>

      {/* Section title */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-jakarta font-bold text-xl text-[#0F172A]">
          {activeRegion
            ? `Historias de ${regions.find(r => r.slug === activeRegion)?.name_i18n?.es ?? activeRegion}`
            : "Todas las historias"
          }
        </h2>
        <span className="font-inter text-sm" style={{ color: "#94A3B8" }}>
          {stories.length} historia{stories.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Real stories */}
        {stories.map((story, i) => {
          const title   = story.title_i18n?.es ?? story.slug;
          const summary = story.summary_i18n?.es ?? "";
          const region  = story.regions as { slug: string; name_i18n: Record<string,string> } | null;
          const regName = region?.name_i18n?.es;

          return (
            <Link
              key={story.id}
              href={`/stories/${story.slug}`}
              className="group rounded-2xl overflow-hidden bg-white flex flex-col cursor-pointer"
              style={{
                border: story.featured ? "2px solid rgba(13,148,136,0.4)" : "1px solid #E2E8F0",
                boxShadow: story.featured
                  ? "0 4px 20px rgba(13,148,136,0.1)"
                  : "0 1px 4px rgba(0,0,0,0.05)",
                transition: "box-shadow 0.2s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = story.featured
                  ? "0 4px 20px rgba(13,148,136,0.1)"
                  : "0 1px 4px rgba(0,0,0,0.05)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              }}
            >
              {/* Image area */}
              <div
                className="h-44 relative flex items-center justify-center"
                style={{ background: STORY_COLORS[i % STORY_COLORS.length] }}
              >
                <BookOpen className="w-14 h-14 text-white opacity-20" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
                  {story.featured && (
                    <span
                      className="font-inter font-semibold text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "rgba(245,158,11,0.25)", color: "#FCD34D", backdropFilter: "blur(4px)" }}
                    >
                      ★ Destacada
                    </span>
                  )}
                  {regName && (
                    <span
                      className="font-inter font-semibold text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white", backdropFilter: "blur(4px)" }}
                    >
                      {regName}
                    </span>
                  )}
                </div>

                {story.audio_storage_path && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(13,148,136,0.3)", backdropFilter: "blur(4px)" }}>
                    <Volume2 className="w-3 h-3 text-white" />
                    <span className="font-inter text-[10px] text-white">Audio</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-jakarta font-semibold text-[15px] text-[#0F172A] mb-2 line-clamp-2 leading-snug">
                  {title}
                </h3>
                <p className="font-inter text-xs leading-relaxed line-clamp-3 flex-1"
                  style={{ color: "#64748B" }}>
                  {summary}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3"
                  style={{ borderTop: "1px solid #F1F5F9" }}>
                  <span className="font-inter text-[10px] italic" style={{ color: "#94A3B8" }}>
                    Narrada por Itinera IA
                  </span>
                  <span
                    className="flex items-center gap-0.5 font-inter font-medium text-xs"
                    style={{ color: "#0D9488" }}
                  >
                    Leer <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        {/* Coming soon placeholders */}
        {!activeRegion && COMING_SOON.slice(0, fillerCount + 2).map((item, i) => (
          <div
            key={`soon-${i}`}
            className="rounded-2xl overflow-hidden bg-white flex flex-col opacity-60"
            style={{ border: "1px solid #E2E8F0", borderStyle: "dashed" }}
          >
            <div
              className="h-44 relative flex items-center justify-center"
              style={{ backgroundColor: "#F1F5F9" }}
            >
              <Lock className="w-8 h-8" style={{ color: "#CBD5E1" }} />
              <span
                className="absolute top-3 left-3 font-inter font-semibold text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#E2E8F0", color: "#94A3B8" }}
              >
                {item.region}
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-jakarta font-semibold text-[15px] text-[#CBD5E1] mb-2 line-clamp-2 leading-snug">
                {item.title}
              </h3>
              <p className="font-inter text-xs" style={{ color: "#CBD5E1" }}>
                Próximamente
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state when filtering */}
      {stories.length === 0 && activeRegion && (
        <div className="py-16 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#94A3B8" }} />
          <p className="font-jakarta font-semibold text-base text-[#0F172A] mb-1">
            Sin historias en esta región aún
          </p>
          <button
            onClick={() => setRegion("")}
            className="font-inter text-sm mt-2"
            style={{ color: "#0D9488" }}
          >
            Ver todas las historias →
          </button>
        </div>
      )}
    </section>
  );
}
