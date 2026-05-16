"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { triggerSemanticRebuild } from "@/lib/semantic/rebuild-client";
import { Save, ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";

/** Converts a display name to a URL-safe slug, correctly removing diacritics */
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")          // strip all Unicode combining marks (ó→o, é→e, etc.)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Category { id: string; name_i18n: Record<string, string> }
interface Region   { id: string; name_i18n: Record<string, string> }

interface PlaceFormProps {
  mode: "create" | "edit";
  placeId?: string;
  initialData?: FormState;
  categories: Category[];
  regions: Region[];
}

interface FormState {
  name_es: string; name_en: string;
  description_es: string; description_en: string;
  ai_summary_es: string;
  lat: string; lng: string;
  address_es: string;
  phone: string; website: string;
  hours: string;
  price_level: string;
  accessibility: boolean;
  local_favorite: boolean;
  featured: boolean;
  category_id: string;
  region_id: string;
  status: string;
}

const DEFAULT: FormState = {
  name_es: "", name_en: "",
  description_es: "", description_en: "",
  ai_summary_es: "",
  lat: "", lng: "",
  address_es: "",
  phone: "", website: "",
  hours: "",
  price_level: "2",
  accessibility: false,
  local_favorite: false,
  featured: false,
  category_id: "",
  region_id: "",
  status: "draft",
};

export function PlaceForm({ mode, placeId, initialData, categories, regions }: PlaceFormProps) {
  const [form, setForm]     = useState<FormState>(initialData ?? DEFAULT);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const router  = useRouter();
  const supabase = createClient();

  function set(key: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.lat || !form.lng) { setError("Latitud y longitud son obligatorias."); return; }
    setSaving(true); setError(null);

    const payload = {
      name_i18n:        { es: form.name_es, en: form.name_en },
      description_i18n: { es: form.description_es, en: form.description_en },
      ai_summary_i18n:  { es: form.ai_summary_es },
      address_i18n:     { es: form.address_es },
      location:         `SRID=4326;POINT(${form.lng} ${form.lat})`,
      phone:            form.phone || null,
      website:          form.website || null,
      hours:            form.hours ? { es: form.hours } : null,
      price_level:      Number(form.price_level),
      accessibility:    form.accessibility,
      local_favorite:   form.local_favorite,
      featured:         form.featured,
      category_id:      form.category_id || null,
      region_id:        form.region_id || null,
      status:           form.status,
    };

    let err;
    if (mode === "create") {
      const slug = toSlug(form.name_es);
      const { error: e } = await supabase.from("places").insert({ ...payload, slug });
      err = e;
    } else {
      const { error: e } = await supabase.from("places").update(payload).eq("id", placeId!);
      err = e;
    }

    if (err) { setError(err.message); setSaving(false); return; }
    await triggerSemanticRebuild({ mode: "changed", limit: 5 });
    router.push("/places");
    router.refresh();
  }

  const inputCls = "w-full px-3 py-2 rounded-lg font-inter text-sm text-white bg-[#0A0F0F] border border-[#1F2937] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 transition-all placeholder:text-[#374151]";
  const labelCls = "block font-inter font-medium text-[11px] uppercase tracking-widest mb-1.5 text-[#6B7280]";

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/places" className="back-btn-hover">
          <ArrowLeft className="w-4 h-4" style={{ color: "#6B7280" }} />
        </Link>
        <div>
          <p className="font-inter text-xs text-[#6B7280]">
            Lugares / {mode === "create" ? "Nuevo" : "Editar"}
          </p>
          <h1 className="font-jakarta font-bold text-[24px] text-white leading-tight">
            {mode === "create" ? "Nuevo lugar" : form.name_es || "Editar lugar"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Información básica */}
        <section className="rounded-lg p-5 space-y-4" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" style={{ color: "#0D9488" }} />
            <h2 className="font-jakarta font-semibold text-sm text-white">Información básica</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre (ES) *</label>
              <input className={inputCls} value={form.name_es} onChange={(e) => set("name_es", e.target.value)} required placeholder="Ruinas de Copán" />
            </div>
            <div>
              <label className={labelCls}>Nombre (EN)</label>
              <input className={inputCls} value={form.name_en} onChange={(e) => set("name_en", e.target.value)} placeholder="Copán Ruins" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Descripción (ES)</label>
            <textarea rows={3} className={inputCls} value={form.description_es} onChange={(e) => set("description_es", e.target.value)} placeholder="Descripción del lugar..." />
          </div>
          <div>
            <label className={labelCls}>Resumen IA (ES)</label>
            <textarea rows={2} className={inputCls} value={form.ai_summary_es} onChange={(e) => set("ai_summary_es", e.target.value)} placeholder="Resumen generado por IA para el terminal..." />
          </div>
        </section>

        {/* Ubicación */}
        <section className="rounded-lg p-5 space-y-4" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
          <h2 className="font-jakarta font-semibold text-sm text-white">Ubicación</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Latitud *</label>
              <input className={inputCls} value={form.lat} onChange={(e) => set("lat", e.target.value)} required placeholder="14.8383" type="number" step="any" />
            </div>
            <div>
              <label className={labelCls}>Longitud *</label>
              <input className={inputCls} value={form.lng} onChange={(e) => set("lng", e.target.value)} required placeholder="-89.1422" type="number" step="any" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Dirección (ES)</label>
            <input className={inputCls} value={form.address_es} onChange={(e) => set("address_es", e.target.value)} placeholder="Copán Ruinas, Copán, Honduras" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+504 2651-0000" />
            </div>
            <div>
              <label className={labelCls}>Sitio web</label>
              <input className={inputCls} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div>
            <label className={labelCls}>Horario de atención</label>
            <input className={inputCls} value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder="Lun–Vie 8am–5pm, Sáb 9am–3pm" />
          </div>
        </section>

        {/* Clasificación */}
        <section className="rounded-lg p-5 space-y-4" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
          <h2 className="font-jakarta font-semibold text-sm text-white">Clasificación</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Categoría</label>
              <select className={inputCls} value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name_i18n?.es}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Región</label>
              <select className={inputCls} value={form.region_id} onChange={(e) => set("region_id", e.target.value)}>
                <option value="">Sin región</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name_i18n?.es}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nivel de precio</label>
              <select className={inputCls} value={form.price_level} onChange={(e) => set("price_level", e.target.value)}>
                <option value="1">$ Económico</option>
                <option value="2">$$ Moderado</option>
                <option value="3">$$$ Caro</option>
                <option value="4">$$$$ Premium</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-6 pt-1">
            {([["accessibility","Accesible"],["local_favorite","Favorito local"],["featured","Destacado"]] as [keyof FormState, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[key] as boolean} onChange={(e) => set(key, e.target.checked)} className="w-4 h-4 rounded accent-teal-500" />
                <span className="font-inter text-sm text-[#9CA3AF]">{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-lg font-inter text-sm text-[#EF4444]"
            style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)" }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="btn-teal-hover flex items-center gap-2 px-5 py-2.5 rounded-lg font-inter font-semibold text-sm text-white disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : mode === "create" ? "Crear lugar" : "Guardar cambios"}
          </button>
          <Link href="/places" className="btn-cancel-hover px-5 py-2.5 rounded-lg font-inter font-medium text-sm">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
