import { createClient } from "@/lib/supabase/server";
import { Star, MapPin } from "lucide-react";
import { ModerationButtons } from "./moderation-buttons";
import { ReviewTabs } from "./review-tabs";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "pending" } = await searchParams;
  const supabase = await createClient();

  const { data: allReviews } = await supabase
    .from("reviews")
    .select(`
      id, rating, title_i18n, body_i18n,
      source, moderation_status, session_id,
      created_at,
      places(name_i18n),
      profiles(display_name)
    `)
    .order("created_at", { ascending: false });

  const pending  = allReviews?.filter((r) => r.moderation_status === "pending")  ?? [];
  const approved = allReviews?.filter((r) => r.moderation_status === "approved") ?? [];
  const rejected = allReviews?.filter((r) => r.moderation_status === "rejected") ?? [];

  const reviews =
    tab === "approved" ? approved :
    tab === "rejected" ? rejected :
    pending;

  function timeSince(date: string) {
    const ms   = Date.now() - new Date(date).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `hace ${hrs}h`;
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="font-inter text-xs mb-1.5" style={{ color: "#6B7280" }}>Reseñas</p>
        <h1 className="font-jakarta font-bold text-[28px] text-white leading-none">
          Moderación de Reseñas
        </h1>
        <p
          className="font-inter text-sm mt-1"
          style={{ color: pending.length > 0 ? "#F59E0B" : "#6B7280" }}
        >
          {pending.length > 0
            ? `${pending.length} pendiente${pending.length > 1 ? "s" : ""} de revisión`
            : "Sin reseñas pendientes"}
        </p>
      </div>

      {/* Tabs */}
      <ReviewTabs
        pending={pending.length}
        approved={approved.length}
        rejected={rejected.length}
        activeTab={tab}
      />

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}
      >
        {/* Header */}
        <div
          className="grid px-4 py-3"
          style={{
            gridTemplateColumns: "1.5fr 2.5fr 1fr 1fr 1fr 1.2fr",
            backgroundColor: "#0D1117",
            borderBottom: "1px solid #1F2937",
          }}
        >
          {["LUGAR", "RESEÑA", "RATING", "FUENTE", "ESTADO", "ACCIONES"].map((h) => (
            <span key={h} className="font-inter font-medium text-[10px] uppercase tracking-widest" style={{ color: "#6B7280" }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {reviews.length === 0 ? (
          <div className="px-4 py-8 text-center font-inter text-sm" style={{ color: "#6B7280" }}>
            Sin reseñas en esta categoría
          </div>
        ) : (
          reviews.map((review, i) => {
            const place   = review.places   as unknown as { name_i18n: Record<string, string> } | null;
            const profile = review.profiles as unknown as { display_name: string } | null;
            const body    = (review.body_i18n as Record<string, string>)?.es;
            const isPending = review.moderation_status === "pending";
            const isLast  = i === reviews.length - 1;

            return (
              <div
                key={review.id}
                className="table-row-hover grid px-4 py-3.5 items-start"
                style={{
                  gridTemplateColumns: "1.5fr 2.5fr 1fr 1fr 1fr 1.2fr",
                  borderBottom: isLast ? "none" : "1px solid #1F2937",
                  borderLeft: isPending ? "3px solid #F59E0B" : "3px solid transparent",
                }}
              >
                {/* Place */}
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "#0D9488" }} />
                  <span className="font-inter text-sm text-white truncate">
                    {place?.name_i18n?.es ?? "—"}
                  </span>
                </div>

                {/* Review text */}
                <div className="min-w-0 pr-2">
                  <p className="font-inter text-sm text-white/90 truncate">
                    {body || "(sin texto)"}
                  </p>
                  <p className="font-mono text-[10px] mt-0.5 truncate" style={{ color: "#6B7280" }}>
                    {review.source} ·{" "}
                    {profile?.display_name ?? review.session_id?.slice(0, 10) ?? "anónimo"} ·{" "}
                    {timeSince(review.created_at)}
                  </p>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className="w-3 h-3"
                      style={{
                        color: j < review.rating ? "#FBBF24" : "#374151",
                        fill:  j < review.rating ? "#FBBF24" : "none",
                      }}
                    />
                  ))}
                </div>

                {/* Source badge */}
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] w-fit"
                  style={{ backgroundColor: "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.25)", color: "#9CA3AF" }}
                >
                  {review.source}
                </span>

                {/* Status badge */}
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md font-inter font-medium text-xs w-fit"
                  style={
                    review.moderation_status === "approved"
                      ? { backgroundColor: "rgba(13,148,136,0.08)",  border: "1px solid rgba(13,148,136,0.4)",  color: "#0D9488" }
                      : review.moderation_status === "rejected"
                      ? { backgroundColor: "rgba(239,68,68,0.08)",   border: "1px solid rgba(239,68,68,0.4)",   color: "#EF4444" }
                      : { backgroundColor: "rgba(245,158,11,0.08)",  border: "1px solid rgba(245,158,11,0.4)",  color: "#F59E0B" }
                  }
                >
                  {review.moderation_status === "approved" ? "Aprobada" :
                   review.moderation_status === "rejected" ? "Rechazada" : "Pendiente"}
                </span>

                {/* Actions */}
                <ModerationButtons
                  reviewId={review.id}
                  currentStatus={review.moderation_status}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Stats bar */}
      <p className="font-inter text-xs" style={{ color: "#6B7280" }}>
        {(allReviews?.length ?? 0)} total ·{" "}
        <span style={{ color: "#F59E0B" }}>{pending.length} pendientes</span> ·{" "}
        <span style={{ color: "#0D9488" }}>{approved.length} aprobadas</span> ·{" "}
        <span style={{ color: "#EF4444" }}>{rejected.length} rechazadas</span>
      </p>
    </div>
  );
}
