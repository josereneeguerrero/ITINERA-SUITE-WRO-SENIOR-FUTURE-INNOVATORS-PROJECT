import { createClient } from "@/lib/supabase/server";
import { BarChart3, TrendingUp, MessageSquare, MapPin, Zap } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function last14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

const INTENT_LABELS: Record<string, string> = {
  search_category:      "Categoría",
  search_region_only:   "Región",
  search_region_category: "Región + Cat.",
  search_place_by_name: "Nombre",
  semantic_search:      "Semántico",
  select_place:         "Selección",
  greeting:             "Saludo",
  clear:                "Limpiar",
  get_nearby:           "Cercanos",
};

const INTENT_COLORS: Record<string, string> = {
  search_category:        "#0D9488",
  search_region_only:     "#3B82F6",
  search_region_category: "#8B5CF6",
  search_place_by_name:   "#F59E0B",
  semantic_search:        "#EC4899",
  select_place:           "#22C55E",
  greeting:               "#6B7280",
  clear:                  "#6B7280",
  get_nearby:             "#F97316",
};

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getAnalytics() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [eventsRes, topPlacesRes, totalRes] = await Promise.all([
    supabase
      .from("interaction_events")
      .select("intent, occurred_at, selected_place_id")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: true }),
    supabase
      .from("interaction_events")
      .select("selected_place_id, places!selected_place_id(name_i18n, slug)")
      .not("selected_place_id", "is", null)
      .gte("occurred_at", since),
    supabase
      .from("interaction_events")
      .select("id", { count: "exact", head: true })
      .gte("occurred_at", since),
  ]);

  const events = eventsRes.data ?? [];
  const days = last14Days();

  // Interactions per day
  const byDay = Object.fromEntries(days.map((d) => [d, 0]));
  for (const ev of events) {
    const day = ev.occurred_at.split("T")[0];
    if (day in byDay) byDay[day]++;
  }

  // Intent breakdown
  const intentCounts: Record<string, number> = {};
  for (const ev of events) {
    if (ev.intent) intentCounts[ev.intent] = (intentCounts[ev.intent] ?? 0) + 1;
  }
  const intentsSorted = Object.entries(intentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Top places
  const placeCount: Record<string, { name: string; slug: string; count: number }> = {};
  for (const ev of topPlacesRes.data ?? []) {
    const place = ev.places as unknown as { name_i18n: Record<string, string>; slug: string } | null;
    if (!ev.selected_place_id || !place) continue;
    const id = ev.selected_place_id;
    if (!placeCount[id]) placeCount[id] = { name: place.name_i18n?.es ?? "—", slug: place.slug, count: 0 };
    placeCount[id].count++;
  }
  const topPlaces = Object.values(placeCount).sort((a, b) => b.count - a.count).slice(0, 5);

  const maxDay = Math.max(...Object.values(byDay), 1);
  const maxIntent = intentsSorted[0]?.[1] ?? 1;

  return {
    total14d: totalRes.count ?? 0,
    semanticCount: intentCounts["semantic_search"] ?? 0,
    days,
    byDay,
    maxDay,
    intentsSorted,
    maxIntent,
    topPlaces,
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const data = await getAnalytics();

  return (
    <div className="space-y-7">

      {/* Header */}
      <div>
        <p className="font-inter text-xs mb-1.5" style={{ color: "#6B7280" }}>Analytics</p>
        <h1 className="font-jakarta font-bold text-[28px] text-white leading-none">Analytics</h1>
        <p className="font-inter text-sm mt-1" style={{ color: "#6B7280" }}>
          Últimos 14 días · interacciones del chat
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "INTERACCIONES", value: data.total14d, icon: MessageSquare, color: "#0D9488" },
          { label: "BÚSQUEDAS SEMÁNTICAS", value: data.semanticCount, icon: Zap, color: "#EC4899" },
          { label: "LUGARES TOP VISTOS", value: data.topPlaces.length, icon: MapPin, color: "#F59E0B" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg p-5" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-inter font-medium text-[10px] uppercase tracking-widest" style={{ color: "#6B7280" }}>
                {label}
              </span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <p className="font-jakarta font-bold text-[36px] leading-none" style={{ color: value > 0 ? "#F9FAFB" : "#374151" }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="rounded-lg p-6" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4" style={{ color: "#0D9488" }} />
          <h2 className="font-jakarta font-semibold text-base text-white">Interacciones por día</h2>
        </div>
        <div className="flex items-end gap-1.5 h-36">
          {data.days.map((day) => {
            const count = data.byDay[day] ?? 0;
            const pct = data.maxDay > 0 ? (count / data.maxDay) * 100 : 0;
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full flex flex-col justify-end" style={{ height: "108px" }}>
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                      backgroundColor: count > 0 ? "#0D9488" : "#1F2937",
                      opacity: count > 0 ? 1 : 0.4,
                    }}
                    title={`${shortDate(day)}: ${count}`}
                  />
                </div>
                <span className="font-mono text-[9px]" style={{ color: "#4B5563" }}>
                  {shortDate(day)}
                </span>
              </div>
            );
          })}
        </div>
        {data.total14d === 0 && (
          <p className="text-center font-inter text-sm mt-4" style={{ color: "#6B7280" }}>
            Sin interacciones registradas aún — el chat está listo para recibir usuarios.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">

        {/* Intent breakdown */}
        <div className="rounded-lg p-6" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4" style={{ color: "#3B82F6" }} />
            <h2 className="font-jakarta font-semibold text-base text-white">Por tipo de búsqueda</h2>
          </div>
          {data.intentsSorted.length === 0 ? (
            <p className="font-inter text-sm" style={{ color: "#6B7280" }}>Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {data.intentsSorted.map(([intent, count]) => {
                const pct = Math.round((count / data.maxIntent) * 100);
                const color = INTENT_COLORS[intent] ?? "#6B7280";
                const label = INTENT_LABELS[intent] ?? intent;
                return (
                  <div key={intent}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-inter text-xs" style={{ color: "#9CA3AF" }}>{label}</span>
                      <span className="font-mono text-xs font-semibold" style={{ color }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: "#1F2937" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top places */}
        <div className="rounded-lg p-6" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center gap-2 mb-5">
            <MapPin className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <h2 className="font-jakarta font-semibold text-base text-white">Lugares más vistos</h2>
          </div>
          {data.topPlaces.length === 0 ? (
            <p className="font-inter text-sm" style={{ color: "#6B7280" }}>Sin datos aún</p>
          ) : (
            <div className="space-y-2">
              {data.topPlaces.map((place, i) => (
                <div
                  key={place.slug}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ backgroundColor: "#0D1117", border: "1px solid #1F2937" }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center font-jakarta font-bold text-[10px] shrink-0"
                    style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#F59E0B" }}
                  >
                    {i + 1}
                  </span>
                  <p className="font-inter text-sm text-white flex-1 truncate">{place.name}</p>
                  <span className="font-mono text-xs font-semibold" style={{ color: "#F59E0B" }}>
                    ×{place.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
