import { createClient } from "@/lib/supabase/server";
import { Monitor, Wifi, WifiOff, Info } from "lucide-react";
import { RegisterDeviceForm } from "./register-device-form";

function timeSince(date: string | null) {
  if (!date) return "Nunca";
  const ms   = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1)  return "Ahora mismo";
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

function isOnline(lastSync: string | null) {
  if (!lastSync) return false;
  return Date.now() - new Date(lastSync).getTime() < 10 * 60 * 1000; // 10 min
}

export default async function DevicesPage() {
  const supabase = await createClient();

  const [{ data: devices }, { data: events }] = await Promise.all([
    supabase
      .from("devices")
      .select("id, label, last_sync_at, metadata, created_at, host_site_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("interaction_events")
      .select("intent, selected_place_id, occurred_at, duration_ms, places!selected_place_id(name_i18n)")
      .order("occurred_at", { ascending: false })
      .limit(5),
  ]);

  const onlineCount = devices?.filter((d) => isOnline(d.last_sync_at)).length ?? 0;
  const firstDevice = devices?.[0] ?? null;

  return (
    <div className="space-y-7">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-inter text-xs mb-1.5" style={{ color: "#6B7280" }}>Terminales</p>
          <h1 className="font-jakarta font-bold text-[28px] text-white leading-none">Terminales</h1>
          <p className="font-inter text-sm mt-1" style={{ color: "#6B7280" }}>
            {devices?.length ?? 0} dispositivo{(devices?.length ?? 0) !== 1 ? "s" : ""} registrado{(devices?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <RegisterDeviceForm />
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg p-5" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-inter font-medium text-[10px] uppercase tracking-widest" style={{ color: "#6B7280" }}>
              TERMINALES ACTIVAS
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(13,148,136,0.1)" }}>
              <Monitor className="w-3.5 h-3.5" style={{ color: "#0D9488" }} />
            </div>
          </div>
          <p className="font-jakarta font-bold text-[36px] leading-none" style={{ color: "#0D9488" }}>
            {onlineCount}
          </p>
          {firstDevice && (
            <p className="font-mono text-[11px] mt-1.5 truncate" style={{ color: "#6B7280" }}>
              {firstDevice.label}
            </p>
          )}
        </div>

        <div className="rounded-lg p-5" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-inter font-medium text-[10px] uppercase tracking-widest" style={{ color: "#6B7280" }}>
              ÚLTIMO SYNC
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: firstDevice && isOnline(firstDevice.last_sync_at) ? "#22C55E" : "#374151" }}
              />
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.1)" }}>
                <Wifi className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />
              </div>
            </div>
          </div>
          <p className="font-jakarta font-bold text-[28px] leading-none text-white">
            {timeSince(firstDevice?.last_sync_at ?? null)}
          </p>
          <p className="font-inter text-xs mt-1.5" style={{ color: firstDevice && isOnline(firstDevice.last_sync_at) ? "#22C55E" : "#6B7280" }}>
            {firstDevice && isOnline(firstDevice.last_sync_at) ? "conexión estable" : "sin conexión reciente"}
          </p>
        </div>
      </div>

      {/* Device table */}
      <div>
        <h2 className="font-jakarta font-semibold text-base text-white mb-3">Dispositivos</h2>
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
          <div
            className="grid px-4 py-3"
            style={{
              gridTemplateColumns: "2fr 1.5fr 2fr 1fr",
              backgroundColor: "#0D1117",
              borderBottom: "1px solid #1F2937",
            }}
          >
            {["DISPOSITIVO", "UBICACIÓN", "ÚLTIMO SYNC", "ESTADO"].map((h) => (
              <span key={h} className="font-inter font-medium text-[10px] uppercase tracking-widest" style={{ color: "#6B7280" }}>
                {h}
              </span>
            ))}
          </div>

          {!devices?.length ? (
            <div className="px-4 py-8 text-center font-inter text-sm" style={{ color: "#6B7280" }}>
              Sin terminales registradas
            </div>
          ) : (
            devices.map((device, i) => {
              const online = isOnline(device.last_sync_at);
              const isLast = i === devices.length - 1;

              return (
                <div
                  key={device.id}
                  className="table-row-hover grid px-4 py-4 items-center"
                  style={{
                    gridTemplateColumns: "2fr 1.5fr 2fr 1fr",
                    borderBottom: isLast ? "none" : "1px solid #1F2937",
                  }}
                >
                  {/* Device */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "rgba(139,92,246,0.1)" }}>
                      <Monitor className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                    </div>
                    <div>
                      <p className="font-inter font-medium text-sm text-white">{device.label}</p>
                      <p className="font-mono text-[10px] truncate" style={{ color: "#6B7280" }}>
                        {device.id.slice(0, 8)}...{device.id.slice(-4)}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <span className="font-inter text-sm" style={{ color: "#9CA3AF" }}>
                    Sin asignar
                  </span>

                  {/* Last sync */}
                  <span className="font-mono text-sm" style={{ color: "#0D9488" }}>
                    {device.last_sync_at
                      ? new Date(device.last_sync_at).toLocaleString("es-HN", {
                          month: "2-digit", day: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "—"}
                  </span>

                  {/* Status */}
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-inter font-medium text-xs w-fit"
                    style={
                      online
                        ? { backgroundColor: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.4)", color: "#0D9488" }
                        : { backgroundColor: "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.3)", color: "#6B7280" }
                    }
                  >
                    {online
                      ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Online</>
                      : <><WifiOff className="w-3 h-3" />Offline</>
                    }
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recent interactions */}
      <div>
        <h2 className="font-jakarta font-semibold text-base text-white mb-3">
          Últimas interacciones del robot
        </h2>
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
          <div
            className="grid px-4 py-3"
            style={{
              gridTemplateColumns: "1fr 1.5fr 2fr 1fr",
              backgroundColor: "#0D1117",
              borderBottom: "1px solid #1F2937",
            }}
          >
            {["HORA", "INTENT", "LUGAR SELECCIONADO", "DURACIÓN"].map((h) => (
              <span key={h} className="font-inter font-medium text-[10px] uppercase tracking-widest" style={{ color: "#6B7280" }}>
                {h}
              </span>
            ))}
          </div>

          {!events?.length ? (
            <div className="px-4 py-6 text-center font-inter text-sm" style={{ color: "#6B7280" }}>
              Sin interacciones registradas
            </div>
          ) : (
            events.map((ev, i) => {
              const place  = ev.places as unknown as { name_i18n: Record<string, string> } | null;
              const isLast = i === events.length - 1;

              return (
                <div
                  key={i}
                  className="row-activity-hover grid px-4 py-3 items-center"
                  style={{
                    gridTemplateColumns: "1fr 1.5fr 2fr 1fr",
                    borderBottom: isLast ? "none" : "1px solid #1F2937",
                  }}
                >
                  <span className="font-mono text-xs" style={{ color: "#0D9488" }}>
                    {new Date(ev.occurred_at).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="font-mono text-xs" style={{ color: "#F59E0B" }}>
                    {ev.intent ?? "—"}
                  </span>
                  <span className="font-inter text-xs text-white">
                    {place?.name_i18n?.es ?? "—"}
                  </span>
                  <span className="font-mono text-xs" style={{ color: "#6B7280" }}>
                    {ev.duration_ms ? `${(ev.duration_ms / 1000).toFixed(1)}s` : "—"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sync protocol card */}
      <div
        className="rounded-lg p-5"
        style={{ backgroundColor: "#111827", border: "1px solid rgba(13,148,136,0.35)" }}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: "rgba(13,148,136,0.1)" }}>
            <Info className="w-4 h-4" style={{ color: "#0D9488" }} />
          </div>
          <div className="space-y-2">
            <h3 className="font-jakarta font-semibold text-sm text-white">
              Protocolo de sincronización
            </h3>
            <p className="font-inter text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
              El robot descarga datos al arrancar con WiFi disponible vía{" "}
              <span className="font-mono text-xs" style={{ color: "#0D9488" }}>export-terminal-data</span>.
              Los eventos de interacción se envían en batch mediante{" "}
              <span className="font-mono text-xs" style={{ color: "#0D9488" }}>ingest-terminal-events</span>.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {[
                "GET /export-terminal-data",
                "POST /ingest-terminal-events",
              ].map((endpoint) => (
                <span
                  key={endpoint}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg font-mono text-xs"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.3)", color: "#0D9488" }}
                >
                  {endpoint}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
