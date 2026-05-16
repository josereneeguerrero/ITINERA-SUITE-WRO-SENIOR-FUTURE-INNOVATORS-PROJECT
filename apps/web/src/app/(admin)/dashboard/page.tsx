import { createClient } from "@/lib/supabase/server";
import {
  MapPin,
  BookOpen,
  Star,
  Monitor,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { SemanticRebuildPanel } from "@/components/admin/semantic-rebuild-panel";

async function getStats() {
  const supabase = await createClient();
  const nowMs = Date.now();

  const [
    placesRes,
    storiesRes,
    pendingRes,
    devicesRes,
    impressionsRes,
    recentEventsRes,
  ] = await Promise.all([
    supabase.from("places").select("id, status"),
    supabase.from("stories").select("id, status"),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "pending"),
    supabase.from("devices").select("id, label, last_sync_at"),
    supabase
      .from("sponsor_impressions")
      .select("id", { count: "exact", head: true })
      .gte("occurred_at", new Date(nowMs - 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("interaction_events")
      .select("intent, selected_place_id, occurred_at, places!selected_place_id(name_i18n)")
      .order("occurred_at", { ascending: false })
      .limit(5),
  ]);

  const places = placesRes.data ?? [];
  const stories = storiesRes.data ?? [];

  let semanticTotal = 0;
  let semanticReady = 0;
  let semanticPending = 0;
  let semanticError = 0;
  let semanticLastEmbeddedAt: string | null = null;
  let semanticAvailable = false;

  const semanticResults = await Promise.all([
    supabase.from("semantic_documents").select("id", { count: "exact", head: true }),
    supabase.from("semantic_documents").select("id", { count: "exact", head: true }).eq("embedding_status", "ready"),
    supabase.from("semantic_documents").select("id", { count: "exact", head: true }).eq("embedding_status", "pending"),
    supabase.from("semantic_documents").select("id", { count: "exact", head: true }).eq("embedding_status", "error"),
    supabase
      .from("semantic_documents")
      .select("last_embedded_at")
      .not("last_embedded_at", "is", null)
      .order("last_embedded_at", { ascending: false })
      .limit(1),
  ]);

  const semanticHasError = semanticResults.some((res) => Boolean(res.error));
  if (!semanticHasError) {
    semanticAvailable = true;
    semanticTotal = semanticResults[0].count ?? 0;
    semanticReady = semanticResults[1].count ?? 0;
    semanticPending = semanticResults[2].count ?? 0;
    semanticError = semanticResults[3].count ?? 0;
    semanticLastEmbeddedAt =
      (semanticResults[4].data?.[0] as { last_embedded_at?: string } | undefined)
        ?.last_embedded_at ?? null;
  }

  return {
    totalPlaces: places.length,
    publishedPlaces: places.filter((p) => p.status === "published").length,
    totalStories: stories.length,
    publishedStories: stories.filter((s) => s.status === "published").length,
    pendingReviews: pendingRes.count ?? 0,
    totalDevices: devicesRes.data?.length ?? 0,
    lastSync: devicesRes.data?.[0]?.last_sync_at ?? null,
    impressions24h: impressionsRes.count ?? 0,
    recentEvents: recentEventsRes.data ?? [],
    semantic: {
      total: semanticTotal,
      ready: semanticReady,
      pending: semanticPending,
      error: semanticError,
      lastEmbeddedAt: semanticLastEmbeddedAt,
      available: semanticAvailable,
    },
    nowMs,
  };
}

function timeSince(date: string, nowMs: number) {
  const ms = nowMs - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      label: "LUGARES",
      value: stats.totalPlaces,
      sub: `${stats.publishedPlaces} publicados`,
      icon: MapPin,
      color: "#0D9488",
      bgColor: "rgba(13,148,136,0.08)",
    },
    {
      label: "HISTORIAS",
      value: stats.totalStories,
      sub: `${stats.publishedStories} publicadas`,
      icon: BookOpen,
      color: "#3B82F6",
      bgColor: "rgba(59,130,246,0.08)",
    },
    {
      label: "RESENAS PENDIENTES",
      value: stats.pendingReviews,
      sub: "requieren moderacion",
      icon: Star,
      color: stats.pendingReviews > 0 ? "#F59E0B" : "#6B7280",
      bgColor:
        stats.pendingReviews > 0
          ? "rgba(245,158,11,0.08)"
          : "rgba(107,114,128,0.08)",
    },
    {
      label: "TERMINALES",
      value: stats.totalDevices,
      sub: stats.lastSync ? timeSince(stats.lastSync, stats.nowMs) : "sin sync",
      icon: Monitor,
      color: "#8B5CF6",
      bgColor: "rgba(139,92,246,0.08)",
    },
    {
      label: "IMPRESIONES HOY",
      value: stats.impressions24h,
      sub: "ultimas 24 horas",
      icon: TrendingUp,
      color: "#F97316",
      bgColor: "rgba(249,115,22,0.08)",
    },
  ];

  return (
    <div className="space-y-7">
      <div>
        <p className="font-inter text-xs mb-2" style={{ color: "#6B7280" }}>
          Dashboard
        </p>
        <h1 className="font-jakarta font-bold text-[32px] leading-none text-white">
          Dashboard
        </h1>
        <p className="font-inter text-sm mt-1.5" style={{ color: "#6B7280" }}>
          Itinera · Honduras · WRO 2026
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map(({ label, value, sub, icon: Icon, color, bgColor }) => (
          <div
            key={label}
            className="rounded-lg p-5"
            style={{
              backgroundColor: "#111827",
              border: "1px solid #1F2937",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="font-inter font-medium text-[10px] uppercase tracking-widest"
                style={{ color: "#6B7280" }}
              >
                {label}
              </span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: bgColor }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <p
              className="font-jakarta font-bold text-[36px] leading-none"
              style={{ color: label === "RESENAS PENDIENTES" && value > 0 ? color : "#F9FAFB" }}
            >
              {value}
            </p>
            <p className="font-inter text-xs mt-1.5" style={{ color: "#6B7280" }}>
              {sub}
            </p>
          </div>
        ))}
      </div>

      {stats.pendingReviews > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{
            backgroundColor: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#F59E0B" }} />
          <p className="font-inter text-sm flex-1" style={{ color: "#F59E0B" }}>
            <span className="font-semibold">{stats.pendingReviews}</span>{" "}
            resena{stats.pendingReviews > 1 ? "s" : ""} esperando moderacion
          </p>
          <Link
            href="/reviews"
            className="flex items-center gap-1 font-inter font-medium text-xs transition-opacity hover:opacity-80"
            style={{ color: "#F59E0B" }}
          >
            Ir a moderacion
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      <div>
        <h2 className="font-jakarta font-semibold text-base text-white mb-3">
          Actividad reciente
        </h2>
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #1F2937" }}>
          <div
            className="grid grid-cols-3 px-4 py-2.5"
            style={{ backgroundColor: "#0D1117", borderBottom: "1px solid #1F2937" }}
          >
            {["HORA", "INTENT", "LUGAR SELECCIONADO"].map((h) => (
              <span
                key={h}
                className="font-inter font-medium text-[10px] uppercase tracking-widest"
                style={{ color: "#6B7280" }}
              >
                {h}
              </span>
            ))}
          </div>

          {stats.recentEvents.length === 0 ? (
            <div className="px-4 py-6 text-center font-inter text-sm" style={{ color: "#6B7280" }}>
              Sin actividad reciente
            </div>
          ) : (
            stats.recentEvents.map((ev, i) => {
              const place = ev.places as unknown as { name_i18n: Record<string, string> } | null;
              return (
                <div
                  key={i}
                  className="row-activity-hover grid grid-cols-3 px-4 py-3"
                  style={{ borderBottom: i < stats.recentEvents.length - 1 ? "1px solid #1F2937" : "none" }}
                >
                  <span className="font-mono text-xs" style={{ color: "#0D9488" }}>
                    {new Date(ev.occurred_at).toLocaleTimeString("es-HN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="font-mono text-xs" style={{ color: "#F59E0B" }}>
                    {ev.intent ?? "—"}
                  </span>
                  <span className="font-inter text-xs text-white">
                    {place?.name_i18n?.es ?? "—"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {stats.semantic.available ? (
        <SemanticRebuildPanel
          total={stats.semantic.total}
          ready={stats.semantic.ready}
          pending={stats.semantic.pending}
          failed={stats.semantic.error}
          lastEmbeddedAt={stats.semantic.lastEmbeddedAt}
        />
      ) : (
        <div
          className="px-4 py-3 rounded-lg font-inter text-sm"
          style={{
            backgroundColor: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "#F59E0B",
          }}
        >
          Tabla semantic_documents no disponible todavia en este entorno.
        </div>
      )}
    </div>
  );
}
