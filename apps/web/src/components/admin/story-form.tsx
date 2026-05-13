"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Save, ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";

interface Place { id: string; name_i18n: Record<string, string> }

interface StoryFormProps {
  mode: "create" | "edit";
  storyId?: string;
  initialData?: FormState;
  places: Place[];
}

interface FormState {
  title_es: string; title_en: string;
  summary_es: string;
  body_es: string;
  status: string;
  featured: boolean;
  linkedPlaceIds: string[];
}

const DEFAULT: FormState = {
  title_es: "", title_en: "",
  summary_es: "",
  body_es: "",
  status: "draft",
  featured: false,
  linkedPlaceIds: [],
};

export function StoryForm({ mode, storyId, initialData, places }: StoryFormProps) {
  const [form, setForm]     = useState<FormState>(initialData ?? DEFAULT);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const router   = useRouter();
  const supabase = createClient();

  function set(key: keyof FormState, value: string | boolean | string[]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlace(placeId: string) {
    setForm((prev) => ({
      ...prev,
      linkedPlaceIds: prev.linkedPlaceIds.includes(placeId)
        ? prev.linkedPlaceIds.filter((id) => id !== placeId)
        : [...prev.linkedPlaceIds, placeId],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);

    const payload = {
      title_i18n:          { es: form.title_es, en: form.title_en },
      summary_i18n:        { es: form.summary_es },
      body_markdown_i18n:  { es: form.body_es },
      status:              form.status,
      featured:            form.featured,
      moderation_status:   "approved",
    };

    let storyId_ = storyId;
    let err;

    if (mode === "create") {
      const slug = form.title_es
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
      const { data, error: e } = await supabase.from("stories").insert({ ...payload, slug }).select("id").single();
      err = e;
      storyId_ = data?.id;
    } else {
      const { error: e } = await supabase.from("stories").update(payload).eq("id", storyId!);
      err = e;
    }

    if (err) { setError(err.message); setSaving(false); return; }

    // Sync linked places
    if (storyId_) {
      await supabase.from("story_places").delete().eq("story_id", storyId_);
      if (form.linkedPlaceIds.length > 0) {
        await supabase.from("story_places").insert(
          form.linkedPlaceIds.map((place_id) => ({ story_id: storyId_, place_id }))
        );
      }
    }

    router.push("/stories");
    router.refresh();
  }

  const inputCls = "w-full px-3 py-2 rounded-lg font-inter text-sm text-white bg-[#0A0F0F] border border-[#1F2937] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 transition-all placeholder:text-[#374151]";
  const labelCls = "block font-inter font-medium text-[11px] uppercase tracking-widest mb-1.5 text-[#6B7280]";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/stories" className="back-btn-hover">
          <ArrowLeft className="w-4 h-4" style={{ color: "#6B7280" }} />
        </Link>
        <div>
          <p className="font-inter text-xs text-[#6B7280]">
            Historias / {mode === "create" ? "Nueva" : "Editar"}
          </p>
          <h1 className="font-jakarta font-bold text-[24px] text-white leading-tight">
            {mode === "create" ? "Nueva historia" : form.title_es || "Editar historia"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Contenido */}
        <section className="rounded-lg p-5 space-y-4" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" style={{ color: "#3B82F6" }} />
            <h2 className="font-jakarta font-semibold text-sm text-white">Contenido</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Título (ES) *</label>
              <input className={inputCls} value={form.title_es} onChange={(e) => set("title_es", e.target.value)} required placeholder="El Legado Maya de Copán" />
            </div>
            <div>
              <label className={labelCls}>Título (EN)</label>
              <input className={inputCls} value={form.title_en} onChange={(e) => set("title_en", e.target.value)} placeholder="The Mayan Legacy of Copán" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Resumen (ES)</label>
            <textarea rows={2} className={inputCls} value={form.summary_es} onChange={(e) => set("summary_es", e.target.value)} placeholder="Breve descripción de la historia..." />
          </div>
          <div>
            <label className={labelCls}>Cuerpo (Markdown, ES)</label>
            <textarea rows={8} className={`${inputCls} font-mono text-xs`} value={form.body_es} onChange={(e) => set("body_es", e.target.value)} placeholder="## Título&#10;&#10;Contenido en Markdown..." />
          </div>
        </section>

        {/* Vinculación */}
        <section className="rounded-lg p-5 space-y-4" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
          <h2 className="font-jakarta font-semibold text-sm text-white">Lugares vinculados</h2>
          <div className="flex flex-wrap gap-2">
            {places.map((place) => {
              const linked = form.linkedPlaceIds.includes(place.id);
              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => togglePlace(place.id)}
                  className="px-3 py-1.5 rounded-lg font-inter font-medium text-xs transition-all"
                  style={
                    linked
                      ? { backgroundColor: "rgba(13,148,136,0.15)", border: "1px solid rgba(13,148,136,0.5)", color: "#0D9488" }
                      : { backgroundColor: "transparent", border: "1px solid #1F2937", color: "#6B7280" }
                  }
                >
                  {place.name_i18n?.es}
                </button>
              );
            })}
          </div>
        </section>

        {/* Configuración */}
        <section className="rounded-lg p-5 space-y-4" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
          <h2 className="font-jakarta font-semibold text-sm text-white">Configuración</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Estado</label>
              <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="draft">Borrador</option>
                <option value="published">Publicada</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="w-4 h-4 rounded accent-teal-500" />
            <span className="font-inter text-sm text-[#9CA3AF]">Historia destacada</span>
          </label>
        </section>

        {error && (
          <div className="px-4 py-3 rounded-lg font-inter text-sm text-[#EF4444]"
            style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)" }}>
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="btn-teal-hover flex items-center gap-2 px-5 py-2.5 rounded-lg font-inter font-semibold text-sm text-white disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : mode === "create" ? "Crear historia" : "Guardar cambios"}
          </button>
          <Link href="/stories" className="btn-cancel-hover px-5 py-2.5 rounded-lg font-inter font-medium text-sm">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
