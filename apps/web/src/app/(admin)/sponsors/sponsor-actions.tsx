"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, Save, ToggleLeft, ToggleRight } from "lucide-react";

// ── Toggle campaign active ────────────────────────────────────────────────────

export function CampaignToggle({ id, active }: { id: string; active: boolean }) {
  const [on, setOn]       = useState(active);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function toggle() {
    setLoading(true);
    await supabase.from("sponsor_campaigns").update({ active: !on }).eq("id", id);
    setOn(!on);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={on ? "Desactivar" : "Activar"}
      className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-inter font-medium text-xs transition-all disabled:opacity-50"
      style={
        on
          ? { backgroundColor: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.4)", color: "#0D9488" }
          : { backgroundColor: "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.3)", color: "#6B7280" }
      }
    >
      {on ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
      {on ? "Activa" : "Inactiva"}
    </button>
  );
}

// ── Create sponsor modal ──────────────────────────────────────────────────────

export function NewSponsorButton() {
  const [open, setOpen]     = useState(false);
  const [name, setName]     = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError(null);

    const slug = name.toLowerCase()
      .normalize("NFD").replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

    const { error: err } = await supabase.from("sponsors").insert({
      slug,
      name_i18n: { es: name.trim(), en: name.trim() },
      website: website.trim() || null,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }
    setOpen(false); setName(""); setWebsite("");
    router.refresh();
  }

  const inputCls = "w-full px-3 py-2.5 rounded-lg font-inter text-sm text-white outline-none bg-[#0D1117] border border-[#1F2937] focus:border-[#0D9488] transition-all";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-inter font-medium text-sm"
        style={{ backgroundColor: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.4)", color: "#0D9488" }}
      >
        <Plus className="w-4 h-4" />
        Nuevo sponsor
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-xl p-6 space-y-5" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-jakarta font-semibold text-base text-white">Nuevo sponsor</h2>
              <button onClick={() => setOpen(false)} style={{ color: "#6B7280" }}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-inter text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>Nombre del sponsor *</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Restaurante El Torito" required />
              </div>
              <div>
                <label className="block font-inter text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>Sitio web</label>
                <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
              </div>
              {error && <p className="font-inter text-xs" style={{ color: "#F87171" }}>{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2 rounded-lg font-inter font-medium text-sm" style={{ border: "1px solid #1F2937", color: "#6B7280" }}>Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-inter font-medium text-sm disabled:opacity-50" style={{ backgroundColor: "#0D9488", color: "white" }}>
                  <Save className="w-4 h-4" />
                  {saving ? "Guardando..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Create campaign modal ─────────────────────────────────────────────────────

export function NewCampaignButton({ sponsorId, sponsorName }: { sponsorId: string; sponsorName: string }) {
  const [open, setOpen]   = useState(false);
  const [name, setName]   = useState("");
  const [boost, setBoost] = useState("20");
  const [starts, setStarts] = useState("");
  const [ends, setEnds]     = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const { error: err } = await supabase.from("sponsor_campaigns").insert({
      sponsor_id:   sponsorId,
      name:         name.trim(),
      target:       "global",
      boost_weight: Number(boost) / 100,
      boost_cap:    0.15,
      starts_at:    starts || new Date().toISOString(),
      ends_at:      ends   || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      active:       true,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setOpen(false); setName(""); setBoost("20"); setStarts(""); setEnds("");
    router.refresh();
  }

  const inputCls = "w-full px-3 py-2.5 rounded-lg font-inter text-sm text-white outline-none bg-[#0D1117] border border-[#1F2937] focus:border-[#0D9488] transition-all";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2 py-1 rounded-md font-inter text-xs transition-all"
        style={{ backgroundColor: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316" }}
        title={`Nueva campaña para ${sponsorName}`}
      >
        <Plus className="w-3 h-3" />
        Campaña
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-xl p-6 space-y-5" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-jakarta font-semibold text-base text-white">Nueva campaña</h2>
                <p className="font-inter text-xs mt-0.5" style={{ color: "#6B7280" }}>Sponsor: {sponsorName}</p>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "#6B7280" }}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-inter text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>Nombre de la campaña *</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Promoción Verano 2026" required />
              </div>
              <div>
                <label className="block font-inter text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>Boost ({boost}%)</label>
                <input type="range" min="5" max="50" value={boost} onChange={(e) => setBoost(e.target.value)} className="w-full accent-teal-500" />
                <div className="flex justify-between font-mono text-[10px] mt-1" style={{ color: "#6B7280" }}>
                  <span>5%</span><span className="font-semibold" style={{ color: "#F97316" }}>+{boost}%</span><span>50%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-inter text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>Inicio</label>
                  <input type="date" className={inputCls} value={starts} onChange={(e) => setStarts(e.target.value)} />
                </div>
                <div>
                  <label className="block font-inter text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>Fin</label>
                  <input type="date" className={inputCls} value={ends} onChange={(e) => setEnds(e.target.value)} />
                </div>
              </div>
              {error && <p className="font-inter text-xs" style={{ color: "#F87171" }}>{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2 rounded-lg font-inter font-medium text-sm" style={{ border: "1px solid #1F2937", color: "#6B7280" }}>Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-inter font-medium text-sm disabled:opacity-50" style={{ backgroundColor: "#0D9488", color: "white" }}>
                  <Save className="w-4 h-4" />
                  {saving ? "Creando..." : "Crear campaña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
