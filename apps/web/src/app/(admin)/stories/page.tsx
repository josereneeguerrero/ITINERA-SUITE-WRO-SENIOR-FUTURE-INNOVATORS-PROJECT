import { createClient } from "@/lib/supabase/server";
import { BookOpen, Plus, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { StoryPublishToggle } from "./story-publish-toggle";

export default async function StoriesPage() {
  const supabase = await createClient();

  const { data: stories } = await supabase
    .from("stories")
    .select(`
      id, slug, title_i18n, summary_i18n,
      status, moderation_status, featured,
      audio_storage_path, region_id,
      regions(name_i18n),
      story_places(places(id, name_i18n))
    `)
    .order("created_at", { ascending: false });

  const published = stories?.filter((s) => s.status === "published").length ?? 0;
  const draft     = stories?.filter((s) => s.status === "draft").length ?? 0;
  const linked    = stories?.filter((s) => (s.story_places as unknown[])?.length > 0).length ?? 0;

  return (
    <div className="flex gap-5 h-full">

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-inter text-xs mb-1.5" style={{ color: "#6B7280" }}>Historias</p>
            <h1 className="font-jakarta font-bold text-[28px] text-white leading-none">Historias</h1>
            <p className="font-inter text-sm mt-1" style={{ color: "#6B7280" }}>
              Contenido cultural de Honduras
            </p>
          </div>
          <Link
            href="/stories/new"
            className="btn-teal-hover flex items-center gap-2 px-4 py-2 rounded-lg font-inter font-medium text-sm text-white shrink-0 mt-1"
          >
            <Plus className="w-4 h-4" />
            Nueva historia
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: `${published} historias publicadas`, color: "#0D9488", bg: "rgba(13,148,136,0.08)", border: "rgba(13,148,136,0.3)" },
            { label: `${draft} en borrador`,              color: "#6B7280", bg: "rgba(107,114,128,0.06)", border: "rgba(107,114,128,0.2)" },
            { label: `${linked} vinculadas a lugares`,    color: "#3B82F6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.3)" },
          ].map(({ label, color, bg, border }) => (
            <div
              key={label}
              className="px-4 py-3 rounded-lg font-inter font-medium text-sm"
              style={{ backgroundColor: bg, border: `1px solid ${border}`, color }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>

          {/* Header */}
          <div
            className="grid px-4 py-3"
            style={{
              gridTemplateColumns: "2.5fr 1fr 1.5fr 0.5fr 1fr 1fr",
              backgroundColor: "#0D1117",
              borderBottom: "1px solid #1F2937",
            }}
          >
            {["TÍTULO", "REGIÓN", "LUGAR VINCULADO", "AUDIO", "ESTADO", "ACCIONES"].map((h) => (
              <span key={h} className="font-inter font-medium text-[10px] uppercase tracking-widest" style={{ color: "#6B7280" }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {!stories?.length ? (
            <div className="px-4 py-8 text-center font-inter text-sm" style={{ color: "#6B7280" }}>
              Sin historias. Crea la primera.
            </div>
          ) : (
            stories.map((story, i) => {
              const title   = (story.title_i18n as Record<string, string>)?.es ?? story.slug;
              const region  = (story.regions as unknown as { name_i18n: Record<string, string> } | null)?.name_i18n?.es;
              const places  = story.story_places as unknown as { places: { id: string; name_i18n: Record<string, string> } }[];
              const firstPlace = places?.[0]?.places;
              const isLast  = i === (stories?.length ?? 0) - 1;

              return (
                <div
                  key={story.id}
                  className="table-row-hover grid px-4 py-3.5 items-center"
                  style={{
                    gridTemplateColumns: "2.5fr 1fr 1.5fr 0.5fr 1fr 1fr",
                    borderBottom: isLast ? "none" : "1px solid #1F2937",
                  }}
                >
                  {/* Title */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>
                      <BookOpen className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-inter font-medium text-sm text-white truncate">{title}</p>
                      <p className="font-mono text-[10px] truncate" style={{ color: "#6B7280" }}>{story.slug}</p>
                    </div>
                  </div>

                  {/* Region */}
                  <span className="font-inter text-sm" style={{ color: "#9CA3AF" }}>{region ?? "—"}</span>

                  {/* Linked place */}
                  <div>
                    {firstPlace ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md font-inter font-medium text-xs"
                        style={{ backgroundColor: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.3)", color: "#0D9488" }}
                      >
                        {firstPlace.name_i18n?.es}
                      </span>
                    ) : (
                      <span className="font-inter text-xs" style={{ color: "#6B7280" }}>—</span>
                    )}
                  </div>

                  {/* Audio */}
                  <div>
                    {story.audio_storage_path ? (
                      <Volume2 className="w-4 h-4" style={{ color: "#0D9488" }} />
                    ) : (
                      <VolumeX className="w-4 h-4" style={{ color: "#374151" }} />
                    )}
                  </div>

                  {/* Status */}
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md font-inter font-medium text-xs w-fit"
                    style={
                      story.status === "published"
                        ? { backgroundColor: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.4)", color: "#0D9488" }
                        : { backgroundColor: "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.3)", color: "#6B7280" }
                    }
                  >
                    {story.status === "published" ? "Publicada" : "Borrador"}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Link href={`/stories/${story.id}`} className="btn-ghost-hover">Editar</Link>
                    <StoryPublishToggle storyId={story.id} currentStatus={story.status} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Preview Panel ── */}
      {stories && stories.length > 0 && (
        <div
          className="w-[300px] shrink-0 rounded-lg flex flex-col"
          style={{ backgroundColor: "#111827", border: "1px solid #1F2937", height: "fit-content", position: "sticky", top: "32px" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
            <p className="font-jakarta font-semibold text-sm text-white">Vista previa</p>
          </div>
          <div className="p-4 space-y-3 flex-1">
            {/* First story preview */}
            {(() => {
              const s = stories[0];
              const title   = (s.title_i18n as Record<string, string>)?.es;
              const summary = (s.summary_i18n as Record<string, string>)?.es;
              const places  = s.story_places as unknown as { places: { name_i18n: Record<string, string> } }[];

              return (
                <>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>
                    <BookOpen className="w-4 h-4" style={{ color: "#3B82F6" }} />
                  </div>
                  <h3 className="font-jakarta font-semibold text-sm text-white leading-snug">{title}</h3>
                  <p className="font-inter text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                    {summary?.slice(0, 150)}{summary && summary.length > 150 ? "..." : ""}
                  </p>
                  {places?.length > 0 && (
                    <div>
                      <p className="font-inter font-medium text-[10px] uppercase tracking-widest mb-2" style={{ color: "#6B7280" }}>
                        Lugares vinculados
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {places.map((sp, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded-md font-inter text-xs"
                            style={{ backgroundColor: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.3)", color: "#0D9488" }}
                          >
                            {sp.places?.name_i18n?.es}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <Link
                    href={`/stories/${s.id}`}
                    className="btn-teal-hover flex items-center justify-center gap-2 w-full py-2 rounded-lg font-inter font-medium text-sm text-white mt-2"
                  >
                    Editar en completo
                  </Link>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
