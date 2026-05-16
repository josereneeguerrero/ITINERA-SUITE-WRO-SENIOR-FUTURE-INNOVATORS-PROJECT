"use client";

import { useState } from "react";
import { Plus, Copy, Check, Monitor, X } from "lucide-react";
import { registerDevice } from "./actions";

export function RegisterDeviceForm() {
  const [open, setOpen]     = useState(false);
  const [label, setLabel]   = useState("");
  const [result, setResult] = useState<{ token: string; id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setLoading(true);
    setError(null);
    const res = await registerDevice(label.trim());
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setResult({ token: res.token!, id: res.id! });
    }
  }

  function copyToken() {
    if (!result) return;
    navigator.clipboard.writeText(result.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setOpen(false);
    setLabel("");
    setResult(null);
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-inter font-medium text-sm transition-all"
        style={{ backgroundColor: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.4)", color: "#0D9488" }}
      >
        <Plus className="w-4 h-4" />
        Registrar terminal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-xl p-6 space-y-5" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(139,92,246,0.1)" }}>
                  <Monitor className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                </div>
                <h2 className="font-jakarta font-semibold text-base text-white">Nueva terminal</h2>
              </div>
              <button onClick={handleClose} style={{ color: "#6B7280" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {!result ? (
              /* Registration form */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-inter text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>
                    Nombre del dispositivo
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Terminal WRO — Copán"
                    className="w-full px-3 py-2.5 rounded-lg font-inter text-sm text-white outline-none focus:ring-1"
                    style={{
                      backgroundColor: "#0D1117",
                      border: "1px solid #1F2937",
                    }}
                    required
                  />
                </div>

                {error && (
                  <p className="font-inter text-xs" style={{ color: "#F87171" }}>{error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 rounded-lg font-inter font-medium text-sm"
                    style={{ border: "1px solid #1F2937", color: "#6B7280" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !label.trim()}
                    className="flex-1 px-4 py-2 rounded-lg font-inter font-medium text-sm transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: "#0D9488", color: "white" }}
                  >
                    {loading ? "Registrando..." : "Registrar"}
                  </button>
                </div>
              </form>
            ) : (
              /* Token display — show only once */
              <div className="space-y-4">
                <div className="rounded-lg p-4 space-y-2" style={{ backgroundColor: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.25)" }}>
                  <p className="font-inter text-xs font-semibold" style={{ color: "#0D9488" }}>
                    ✓ Terminal registrada
                  </p>
                  <p className="font-inter text-xs" style={{ color: "#9CA3AF" }}>
                    Guarda este token ahora — no volverá a mostrarse.
                  </p>
                </div>

                <div>
                  <p className="font-inter text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>Token de autenticación</p>
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                    style={{ backgroundColor: "#0D1117", border: "1px solid #374151" }}
                  >
                    <p className="font-mono text-xs flex-1 truncate" style={{ color: "#F9FAFB" }}>
                      {result.token}
                    </p>
                    <button onClick={copyToken} style={{ color: copied ? "#22C55E" : "#6B7280" }}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="font-inter text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>Device ID</p>
                  <p className="font-mono text-xs" style={{ color: "#6B7280" }}>{result.id}</p>
                </div>

                <p className="font-inter text-xs" style={{ color: "#4B5563" }}>
                  Configura la terminal Jetson con este token en la variable <span className="font-mono" style={{ color: "#0D9488" }}>ITINERA_DEVICE_TOKEN</span>.
                </p>

                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2 rounded-lg font-inter font-medium text-sm"
                  style={{ backgroundColor: "#1F2937", color: "#F9FAFB" }}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
