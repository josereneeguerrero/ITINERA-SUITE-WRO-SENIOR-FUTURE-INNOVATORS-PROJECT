"use client";

import { useState } from "react";
import {
  ArrowRight, BookMarked, CalendarDays, Check, Compass,
  Loader2, MapPin, RotateCcw, Route, Save, Sparkles, Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { GeneratedPlan } from "@/app/api/plan/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const INTEREST_OPTIONS = [
  { label: "Patrimonio Cultural", icon: BookMarked, color: "#7C3AED" },
  { label: "Naturaleza",          icon: Compass,    color: "#059669" },
  { label: "Gastronomía",         icon: Sparkles,   color: "#D97706" },
  { label: "Playa",               icon: MapPin,     color: "#0284C7" },
  { label: "Aventura",            icon: Route,      color: "#E11D48" },
  { label: "Religioso",           icon: Star,       color: "#9333EA" },
  { label: "Arte y Museos",       icon: Sparkles,   color: "#0D9488" },
] as const;

const DAY_OPTIONS = [1, 2, 3, 5, 7];

const DEPARTURE_OPTIONS = ["Tegucigalpa", "San Pedro Sula", "La Ceiba", "Otra"];

const GROUP_OPTIONS = [
  { value: "Solo",    emoji: "🧍" },
  { value: "Pareja",  emoji: "👫" },
  { value: "Familia", emoji: "👨‍👩‍👧" },
  { value: "Amigos",  emoji: "👥" },
];

type PlannerState = "form" | "generating" | "result" | "saved";

// ─── Component ────────────────────────────────────────────────────────────────

export function IaPlanner({ isGuest }: { isGuest: boolean }) {
  const [state, setState] = useState<PlannerState>("form");
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedRouteId, setSavedRouteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [days, setDays] = useState(2);
  const [interests, setInterests] = useState<string[]>([]);
  const [departure, setDeparture] = useState("Tegucigalpa");
  const [groupType, setGroupType] = useState("Amigos");

  const toggleInterest = (label: string) => {
    setInterests(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  const canGenerate = interests.length > 0;

  // ── Generate plan ──────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!canGenerate) return;
    setState("generating");
    setError(null);
    setPlan(null);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, interests, departure, groupType }),
      });

      const json = await res.json();

      if (json.error && !json.plan) {
        setError(json.message ?? json.error);
        setState("form");
        return;
      }

      setPlan(json.plan);
      setState("result");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setState("form");
    }
  }

  // ── Save as route ──────────────────────────────────────────────────────────

  async function handleSave() {
    if (!plan || isGuest) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }

      // Create itinerary
      const { data: itinerary, error: iErr } = await supabase
        .from("itineraries")
        .insert({
          user_id: user.id,
          title_i18n: { es: plan.title, en: plan.title },
          public: false,
        })
        .select("id")
        .single();

      if (iErr || !itinerary) throw iErr;

      // Create stops from all days
      const stops = plan.days.flatMap((day, dayIdx) =>
        day.places.map((place, placeIdx) => ({
          itinerary_id: itinerary.id,
          seq: dayIdx * 10 + placeIdx + 1,
          notes_i18n: { es: `Día ${day.dayNumber} — ${day.title}` },
          place_slug: place.slug,
        }))
      );

      // Resolve slugs → place IDs
      const slugs = stops.map(s => s.place_slug);
      const { data: placesData } = await supabase
        .from("places")
        .select("id, slug")
        .in("slug", slugs);

      const slugToId = Object.fromEntries((placesData ?? []).map(p => [p.slug, p.id]));

      const stopsWithIds = stops
        .map(s => ({ ...s, place_id: slugToId[s.place_slug] }))
        .filter(s => s.place_id);

      if (stopsWithIds.length > 0) {
        await supabase.from("itinerary_stops").insert(
          stopsWithIds.map(s => ({
            itinerary_id: s.itinerary_id,
            seq: s.seq,
            notes_i18n: s.notes_i18n,
            place_id: s.place_id,
          }))
        );
      }

      setSavedRouteId(itinerary.id);
      setState("saved");
    } catch {
      setError("Error al guardar la ruta. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setState("form");
    setPlan(null);
    setError(null);
    setSavedRouteId(null);
    setInterests([]);
    setDays(2);
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-28 sm:px-6">
      <div className="mx-auto max-w-2xl">

        {/* ── FORM ── */}
        {state === "form" && (
          <div className="space-y-5">
            {/* Header */}
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#0D9488]/25 bg-[#0D9488]/10 px-3 py-1 font-inter text-xs font-bold uppercase tracking-[0.14em] text-[#00685f]">
                <CalendarDays className="h-3 w-3" aria-hidden /> Planificador de Viajes
              </div>
              <h2 className="mt-2 font-jakarta text-xl font-bold text-[#0f172a]">
                ¿A dónde y cómo quieres ir?
              </h2>
              <p className="mt-1 font-inter text-sm text-[#64748b]">
                Cuéntanos tus preferencias y generamos tu itinerario cultural personalizado.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-inter text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Días */}
            <div className="rounded-2xl border border-[#d7e2de] bg-white p-5 shadow-sm">
              <label className="mb-3 block font-inter text-xs font-bold uppercase tracking-[0.14em] text-[#64748b]">
                ¿Cuántos días tienes?
              </label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`cursor-pointer rounded-xl px-5 py-2.5 font-jakarta text-sm font-bold transition-all duration-200 ${
                      days === d
                        ? "bg-[#0D9488] text-white shadow-md shadow-teal-500/20"
                        : "border border-[#d7e2de] bg-[#f0f5f2] text-[#334155] hover:border-[#0D9488]/30 hover:bg-white"
                    }`}
                  >
                    {d} {d === 1 ? "día" : "días"}
                  </button>
                ))}
              </div>
            </div>

            {/* Intereses */}
            <div className="rounded-2xl border border-[#d7e2de] bg-white p-5 shadow-sm">
              <label className="mb-3 block font-inter text-xs font-bold uppercase tracking-[0.14em] text-[#64748b]">
                ¿Qué te interesa explorar? <span className="text-[#0D9488]">(elige varios)</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {INTEREST_OPTIONS.map(({ label, icon: Icon, color }) => {
                  const active = interests.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleInterest(label)}
                      className={`group flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                        active
                          ? "border-[#0D9488]/40 bg-[#0D9488]/8 shadow-sm"
                          : "border-[#d7e2de] bg-[#f0f5f2] hover:border-[#0D9488]/20 hover:bg-white"
                      }`}
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${color}18` }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color }} aria-hidden />
                      </div>
                      <span className={`font-inter text-xs font-semibold leading-tight ${active ? "text-[#0D9488]" : "text-[#334155]"}`}>
                        {label}
                      </span>
                      {active && (
                        <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-[#0D9488]" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Salida + Grupo */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Salida */}
              <div className="rounded-2xl border border-[#d7e2de] bg-white p-5 shadow-sm">
                <label className="mb-3 block font-inter text-xs font-bold uppercase tracking-[0.14em] text-[#64748b]">
                  ¿Desde dónde sales?
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEPARTURE_OPTIONS.map(city => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setDeparture(city)}
                      className={`cursor-pointer rounded-xl px-3 py-2 font-inter text-xs font-semibold transition-all duration-200 ${
                        departure === city
                          ? "bg-[#0D9488] text-white shadow-sm"
                          : "border border-[#d7e2de] bg-[#f0f5f2] text-[#334155] hover:border-[#0D9488]/30"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grupo */}
              <div className="rounded-2xl border border-[#d7e2de] bg-white p-5 shadow-sm">
                <label className="mb-3 block font-inter text-xs font-bold uppercase tracking-[0.14em] text-[#64748b]">
                  ¿Con quién vas?
                </label>
                <div className="flex flex-wrap gap-2">
                  {GROUP_OPTIONS.map(({ value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGroupType(value)}
                      className={`cursor-pointer rounded-xl px-3 py-2 font-inter text-xs font-semibold transition-all duration-200 ${
                        groupType === value
                          ? "bg-[#0D9488] text-white shadow-sm"
                          : "border border-[#d7e2de] bg-[#f0f5f2] text-[#334155] hover:border-[#0D9488]/30"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#0D9488] px-6 py-4 font-jakarta text-base font-bold text-white shadow-lg shadow-teal-500/20 transition-all duration-200 hover:bg-[#0f766e] hover:shadow-xl hover:shadow-teal-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CalendarDays className="h-5 w-5" aria-hidden />
              Generar mi itinerario
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>

            {!canGenerate && (
              <p className="text-center font-inter text-xs text-[#94a3b8]">
                Selecciona al menos un interés para continuar
              </p>
            )}
          </div>
        )}

        {/* ── GENERATING ── */}
        {state === "generating" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0D9488]/10">
              <Loader2 className="h-10 w-10 animate-spin text-[#0D9488]" aria-hidden />
            </div>
            <h3 className="font-jakarta text-xl font-bold text-[#0f172a]">
              Diseñando tu itinerario...
            </h3>
            <p className="mt-2 max-w-xs font-inter text-sm text-[#64748b]">
              Buscando los mejores destinos de Honduras para tus preferencias.
            </p>

            {/* Skeleton days */}
            <div className="mt-10 w-full space-y-3">
              {Array.from({ length: days }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-[#d7e2de] bg-white p-5 shadow-sm">
                  <div className="mb-3 h-4 w-32 animate-pulse rounded-full bg-[#e2e8f0]" />
                  <div className="mb-4 h-3 w-full animate-pulse rounded-full bg-[#f1f5f9]" />
                  <div className="flex gap-3">
                    <div className="h-16 flex-1 animate-pulse rounded-xl bg-[#f1f5f9]" />
                    <div className="h-16 flex-1 animate-pulse rounded-xl bg-[#f1f5f9]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {state === "result" && plan && (
          <div className="space-y-5">
            {/* Plan header */}
            <div className="rounded-2xl border border-[#0D9488]/20 bg-gradient-to-br from-[#0D9488]/8 to-transparent p-5">
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#0D9488]/25 bg-white/80 px-2.5 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#00685f]">
                <Sparkles className="h-3 w-3" aria-hidden /> Tu itinerario personalizado
              </div>
              <h2 className="mt-2 font-jakarta text-2xl font-extrabold text-[#0f172a]">{plan.title}</h2>
              <p className="mt-1 font-inter text-sm text-[#64748b]">{plan.subtitle}</p>
            </div>

            {/* Day cards */}
            {plan.days.map(day => (
              <div key={day.dayNumber} className="rounded-2xl border border-[#d7e2de] bg-white shadow-sm overflow-hidden">
                {/* Day header */}
                <div className="border-b border-[#f1f5f9] bg-[#f8fafc] px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0D9488] font-jakarta text-xs font-bold text-white">
                      {day.dayNumber}
                    </div>
                    <h3 className="font-jakarta text-sm font-bold text-[#0f172a]">{day.title}</h3>
                  </div>
                  {day.description && (
                    <p className="mt-1.5 pl-9 font-inter text-xs leading-5 text-[#64748b] italic">
                      {day.description}
                    </p>
                  )}
                </div>

                {/* Places */}
                <div className="divide-y divide-[#f1f5f9]">
                  {day.places.map((place, j) => (
                    <a
                      key={place.slug}
                      href={`/places/${place.slug}`}
                      className="group flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#f8fafc]"
                    >
                      {/* Step number */}
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#d7e2de] bg-white font-inter text-[10px] font-bold text-[#64748b]">
                        {j + 1}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-jakarta text-sm font-bold text-[#0f172a] group-hover:text-[#0D9488] transition-colors">
                          {place.name}
                        </p>
                        <div className="flex items-center gap-1.5 font-inter text-xs text-[#64748b]">
                          {place.category && <span className="text-[#0D9488] font-semibold">{place.category}</span>}
                          {place.region && <span>· {place.region}</span>}
                        </div>
                      </div>

                      {/* Rating */}
                      {place.rating > 0 && (
                        <div className="flex shrink-0 items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                          <span className="font-inter text-xs font-semibold text-[#334155]">
                            {place.rating.toFixed(1)}
                          </span>
                        </div>
                      )}

                      <ArrowRight className="h-4 w-4 shrink-0 text-[#bcc9c6] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0D9488]" aria-hidden />
                    </a>
                  ))}
                </div>
              </div>
            ))}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-inter text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {isGuest ? (
                <a
                  href="/bienvenida?redirect=/routes"
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#0D9488] px-6 py-4 font-jakarta text-base font-bold text-white shadow-lg shadow-teal-500/20 transition-all duration-200 hover:bg-[#0f766e]"
                >
                  <Save className="h-5 w-5" aria-hidden />
                  Crear cuenta para guardar
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#0D9488] px-6 py-4 font-jakarta text-base font-bold text-white shadow-lg shadow-teal-500/20 transition-all duration-200 hover:bg-[#0f766e] disabled:opacity-60"
                >
                  {saving ? (
                    <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Guardando...</>
                  ) : (
                    <><Save className="h-5 w-5" aria-hidden /> Guardar como ruta</>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#d7e2de] bg-white px-6 py-3 font-inter text-sm font-semibold text-[#334155] transition-all duration-200 hover:border-[#0D9488]/30 hover:text-[#0D9488]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden /> Planificar otro viaje
              </button>
            </div>
          </div>
        )}

        {/* ── SAVED ── */}
        {state === "saved" && savedRouteId && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0D9488]/10">
              <Check className="h-10 w-10 text-[#0D9488]" aria-hidden />
            </div>
            <h3 className="font-jakarta text-2xl font-bold text-[#0f172a]">
              ¡Ruta guardada!
            </h3>
            <p className="mt-2 max-w-xs font-inter text-sm text-[#64748b]">
              Tu itinerario ya está en Mis Rutas. Puedes compartirlo o editarlo cuando quieras.
            </p>
            <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
              <a
                href={`/routes/${savedRouteId}`}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#0D9488] px-6 py-3.5 font-jakarta text-sm font-bold text-white shadow-lg transition-all hover:bg-[#0f766e]"
              >
                <Route className="h-4 w-4" aria-hidden /> Ver mi ruta
              </a>
              <button
                type="button"
                onClick={handleReset}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#d7e2de] bg-white px-6 py-3 font-inter text-sm font-semibold text-[#334155] transition-all hover:border-[#0D9488]/30 hover:text-[#0D9488]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden /> Planificar otro
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
