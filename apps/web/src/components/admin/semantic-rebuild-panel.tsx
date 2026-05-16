"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

type SemanticRebuildResponse = {
  mode?: string;
  upserted?: number;
  embedded?: number;
  skipped?: number;
  errors?: number;
  error?: string;
};

export function SemanticRebuildPanel({
  total,
  ready,
  pending,
  failed,
  lastEmbeddedAt,
}: {
  total: number;
  ready: number;
  pending: number;
  failed: number;
  lastEmbeddedAt: string | null;
}) {
  const [loading, setLoading] = useState<"changed" | "backfill" | null>(null);
  const [lastRun, setLastRun] = useState<SemanticRebuildResponse | null>(null);
  const router = useRouter();

  async function run(mode: "changed" | "backfill") {
    setLoading(mode);
    try {
      const res = await fetch("/api/semantic/rebuild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, limit: mode === "backfill" ? 20 : 5 }),
      });
      const data = (await res.json()) as SemanticRebuildResponse;
      setLastRun(data);
      router.refresh();
    } catch {
      setLastRun({ error: "No se pudo ejecutar rebuild semantico." });
    } finally {
      setLoading(null);
    }
  }

  return (
    <section
      className="rounded-lg p-5 space-y-4"
      style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-jakarta font-semibold text-base text-white">Observabilidad semantica</h2>
          <p className="font-inter text-xs mt-1" style={{ color: "#6B7280" }}>
            Ultimo embed: {lastEmbeddedAt ? new Date(lastEmbeddedAt).toLocaleString("es-HN") : "sin datos"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="btn-cancel-hover px-3 py-2 rounded-lg font-inter text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refrescar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "TOTAL DOCS", value: total, color: "#F9FAFB" },
          { label: "READY", value: ready, color: "#10B981" },
          { label: "PENDING", value: pending, color: "#F59E0B" },
          { label: "ERROR", value: failed, color: "#EF4444" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg px-3 py-2.5"
            style={{ backgroundColor: "#0D1117", border: "1px solid #1F2937" }}
          >
            <p className="font-inter text-[10px] uppercase tracking-widest" style={{ color: "#6B7280" }}>
              {item.label}
            </p>
            <p className="font-jakarta font-bold text-2xl mt-1" style={{ color: item.color }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => run("changed")}
          disabled={loading !== null}
          className="btn-teal-hover px-4 py-2 rounded-lg font-inter font-semibold text-xs text-white disabled:opacity-50"
        >
          {loading === "changed" ? "Sync changed..." : "Sync changed"}
        </button>
        <button
          type="button"
          onClick={() => run("backfill")}
          disabled={loading !== null}
          className="btn-cancel-hover px-4 py-2 rounded-lg font-inter font-medium text-xs disabled:opacity-50"
        >
          {loading === "backfill" ? "Backfill..." : "Backfill"}
        </button>
      </div>

      {lastRun ? (
        <div
          className="rounded-lg px-3 py-2 font-mono text-xs"
          style={{ backgroundColor: "#0D1117", border: "1px solid #1F2937", color: "#9CA3AF" }}
        >
          {lastRun.error
            ? `error=${lastRun.error}`
            : `mode=${lastRun.mode ?? "-"} upserted=${lastRun.upserted ?? 0} embedded=${lastRun.embedded ?? 0} skipped=${lastRun.skipped ?? 0} errors=${lastRun.errors ?? 0}`}
        </div>
      ) : null}
    </section>
  );
}
