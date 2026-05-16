import { createClient } from "@/lib/supabase/server";
import { Globe, Smartphone, Monitor, TrendingUp, Zap } from "lucide-react";
import { CampaignToggle, NewSponsorButton, NewCampaignButton } from "./sponsor-actions";

export default async function SponsorsPage() {
  const supabase = await createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: campaigns }, { data: impressions }] = await Promise.all([
    supabase
      .from("sponsor_campaigns")
      .select(`id, name, target, boost_weight, boost_cap, starts_at, ends_at, active, sponsors(name_i18n)`)
      .order("created_at", { ascending: false }),
    supabase
      .from("sponsor_impressions")
      .select("source")
      .gte("occurred_at", sevenDaysAgo),
  ]);

  const webCount      = impressions?.filter((i) => i.source === "web").length      ?? 0;
  const appCount      = impressions?.filter((i) => i.source === "app").length      ?? 0;
  const terminalCount = impressions?.filter((i) => i.source === "terminal").length ?? 0;
  const total         = webCount + appCount + terminalCount;

  function pct(n: number) {
    return total === 0 ? 0 : Math.round((n / total) * 100);
  }

  const statCards = [
    { label: "WEB",      value: webCount,      icon: Globe,       color: "#3B82F6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.25)" },
    { label: "APP",      value: appCount,       icon: Smartphone,  color: "#8B5CF6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.25)" },
    { label: "TERMINAL", value: terminalCount,  icon: Monitor,     color: "#0D9488", bg: "rgba(13,148,136,0.08)", border: "rgba(13,148,136,0.25)" },
  ];

  const chartBars = [
    { label: "Web",      pct: pct(webCount),      color: "#3B82F6" },
    { label: "App",      pct: pct(appCount),       color: "#8B5CF6" },
    { label: "Terminal", pct: pct(terminalCount),  color: "#0D9488" },
  ];

  return (
    <div className="space-y-7">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-inter text-xs mb-1.5" style={{ color: "#6B7280" }}>Sponsors</p>
          <h1 className="font-jakarta font-bold text-[28px] text-white leading-none">
            Sponsors & Campañas
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="font-inter text-sm" style={{ color: "#6B7280" }}>
              Modelo de negocio — boost patrocinado en búsquedas
            </p>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full font-inter font-medium text-xs"
              style={{ backgroundColor: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.3)", color: "#0D9488" }}
            >
              Como Google Ads, pero para turismo cultural
            </span>
          </div>
        </div>
        <NewSponsorButton />
      </div>

      {/* Impressions section */}
      <div>
        <h2 className="font-jakarta font-semibold text-base text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: "#F97316" }} />
          Impresiones — Últimos 7 días
        </h2>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
            <div
              key={label}
              className="rounded-lg p-5"
              style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-inter font-medium text-[10px] uppercase tracking-widest" style={{ color: "#6B7280" }}>
                  {label} (7d)
                </span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
              </div>
              <p className="font-jakarta font-bold text-[32px] leading-none text-white">{value}</p>
              <p className="font-inter text-xs mt-1" style={{ color: "#6B7280" }}>impresiones</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div
          className="rounded-lg p-5 space-y-3"
          style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}
        >
          <p className="font-inter font-medium text-xs uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>
            Distribución por canal
          </p>
          {chartBars.map(({ label, pct: p, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="font-inter text-xs w-16 shrink-0" style={{ color: "#9CA3AF" }}>{label}</span>
              <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "#1F2937" }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${p}%`, backgroundColor: color, minWidth: p > 0 ? "4px" : "0" }}
                />
              </div>
              <span className="font-mono text-xs w-8 text-right" style={{ color: "#6B7280" }}>
                {p}%
              </span>
            </div>
          ))}
          <p className="font-inter text-xs pt-1" style={{ color: "#6B7280" }}>
            {total} impresiones totales esta semana
          </p>
        </div>
      </div>

      {/* Campaigns table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-jakarta font-semibold text-base text-white">Campañas activas</h2>
        </div>
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}
        >
          <div
            className="grid px-4 py-3"
            style={{
              gridTemplateColumns: "1.5fr 2fr 1fr 1fr 2fr 1fr auto",
              backgroundColor: "#0D1117",
              borderBottom: "1px solid #1F2937",
            }}
          >
            {["SPONSOR", "CAMPAÑA", "TARGET", "BOOST", "VIGENCIA", "ESTADO", ""].map((h) => (
              <span key={h} className="font-inter font-medium text-[10px] uppercase tracking-widest" style={{ color: "#6B7280" }}>
                {h}
              </span>
            ))}
          </div>

          {!campaigns?.length ? (
            <div className="px-4 py-8 text-center font-inter text-sm" style={{ color: "#6B7280" }}>
              Sin campañas configuradas
            </div>
          ) : (
            campaigns.map((c, i) => {
              const sponsor = c.sponsors as unknown as { name_i18n: Record<string, string> } | null;
              const isLast  = i === campaigns.length - 1;

              return (
                <div
                  key={c.id}
                  className="table-row-hover grid px-4 py-3.5 items-center"
                  style={{
                    gridTemplateColumns: "1.5fr 2fr 1fr 1fr 2fr 1fr auto",
                    borderBottom: isLast ? "none" : "1px solid #1F2937",
                  }}
                >
                  {/* Sponsor */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.2)" }}>
                      <span className="font-jakarta font-bold text-[9px]" style={{ color: "#0D9488" }}>
                        {sponsor?.name_i18n?.es?.slice(0, 1) ?? "S"}
                      </span>
                    </div>
                    <span className="font-inter font-medium text-sm text-white truncate">
                      {sponsor?.name_i18n?.es?.split(" ")[0] ?? "—"}
                    </span>
                  </div>

                  {/* Campaign name */}
                  <span className="font-inter text-sm text-white/80 truncate pr-2">{c.name}</span>

                  {/* Target */}
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md font-inter font-medium text-xs w-fit"
                    style={{ backgroundColor: "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.25)", color: "#9CA3AF" }}
                  >
                    {c.target}
                  </span>

                  {/* Boost */}
                  <div>
                    <span className="font-mono font-semibold text-sm" style={{ color: "#F97316" }}>
                      +{(Number(c.boost_weight) * 100).toFixed(0)}%
                    </span>
                    <span className="font-mono text-[10px] ml-1" style={{ color: "#6B7280" }}>
                      (cap {(Number(c.boost_cap) * 100).toFixed(0)}%)
                    </span>
                  </div>

                  {/* Dates */}
                  <span className="font-mono text-[11px]" style={{ color: "#6B7280" }}>
                    {new Date(c.starts_at).toLocaleDateString("es-HN", { month: "short", year: "numeric" })}
                    {" → "}
                    {new Date(c.ends_at).toLocaleDateString("es-HN", { month: "short", year: "numeric" })}
                  </span>

                  {/* Status toggle */}
                  <CampaignToggle id={c.id} active={c.active} />

                  {/* New campaign for this sponsor */}
                  <NewCampaignButton
                    sponsorId={c.id}
                    sponsorName={sponsor?.name_i18n?.es ?? "Sponsor"}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Boost explanation card */}
      <div
        className="rounded-lg p-5"
        style={{ backgroundColor: "#111827", border: "1px solid rgba(245,158,11,0.35)" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: "rgba(245,158,11,0.1)" }}
          >
            <Zap className="w-4 h-4" style={{ color: "#F59E0B" }} />
          </div>
          <div>
            <h3 className="font-jakarta font-semibold text-sm mb-1.5" style={{ color: "#F59E0B" }}>
              ¿Cómo funciona el boost?
            </h3>
            <p className="font-inter text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
              Los sponsors pagan para que sus lugares aparezcan primero en búsquedas.
              El algoritmo aplica un peso máximo del <span className="text-white font-medium">15%</span> sobre
              el score natural (rating + proximidad).
            </p>
            <p className="font-inter text-xs mt-2" style={{ color: "#6B7280" }}>
              Transparente para usuarios. Rentable para el proyecto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
