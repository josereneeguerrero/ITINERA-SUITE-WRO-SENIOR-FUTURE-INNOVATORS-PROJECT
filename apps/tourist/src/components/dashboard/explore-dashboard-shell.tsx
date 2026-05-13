"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  Compass,
  Heart,
  LocateFixed,
  MapPin,
  Route,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { ExploreMap } from "@/components/explore/explore-map";
import { PlaceDrawer } from "@/components/explore/place-drawer";
import { useStreamingChat, type ChatContext, type UIActionsChunk } from "@/hooks/use-streaming-chat";
import { ToolResultInline } from "@/components/ai/tool-result-inline";

type Place = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  ai_summary_i18n?: Record<string, string>;
  aggregated_rating: number;
  review_count: number;
  price_level: number;
  accessibility?: boolean;
  local_favorite: boolean;
  featured: boolean;
  place_categories: { name_i18n: Record<string, string>; icon_name: string; slug: string } | null;
  regions: { name_i18n: Record<string, string>; slug: string } | null;
};

type Category = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  icon_name: string;
};

type RouteStop = {
  order: number;
  slug: string;
  name: string;
  timeOfDay?: string;
  url?: string;
};

type RouteState = {
  title: string;
  stops: RouteStop[];
} | null;

const ICON_MAP: Record<string, string> = {
  landmark: "🏛️",
  leaf: "🌿",
  utensils: "🍽️",
  waves: "🏖️",
  zap: "⚡",
  church: "⛪",
};

function getEs(value?: Record<string, string> | null, fallback = "") {
  return value?.es ?? value?.en ?? fallback;
}

function scorePlace(place: Place, query: string, category: string) {
  let score = Number(place.aggregated_rating ?? 0);
  const name = getEs(place.name_i18n, place.slug).toLowerCase();
  const catName = getEs(place.place_categories?.name_i18n).toLowerCase();
  const region = getEs(place.regions?.name_i18n).toLowerCase();
  const q = query.trim().toLowerCase();
  if (q && (name.includes(q) || catName.includes(q) || region.includes(q) || place.slug.includes(q))) score += 1.5;
  if (category && place.place_categories?.slug === category) score += 1.1;
  if (place.featured) score += 0.5;
  if (place.local_favorite) score += 0.3;
  return score;
}

export function ExploreDashboardShell({
  places,
  categories,
  isGuest,
  initialQuery,
  initialCategory,
}: {
  places: Place[];
  categories: Category[];
  isGuest: boolean;
  initialQuery?: string;
  initialCategory?: string;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteState>(null);
  const [aiState, setAiState] = useState<{ intent?: string; error?: string }>({});

  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places
      .filter((p) => {
        const name = getEs(p.name_i18n, p.slug).toLowerCase();
        const catName = getEs(p.place_categories?.name_i18n).toLowerCase();
        const region = getEs(p.regions?.name_i18n).toLowerCase();
        const matchesQuery = !q || name.includes(q) || catName.includes(q) || region.includes(q) || p.slug.includes(q);
        const matchesCategory = !category || p.place_categories?.slug === category;
        return matchesQuery && matchesCategory;
      })
      .sort((a, b) => scorePlace(b, query, category) - scorePlace(a, query, category));
  }, [places, query, category]);

  const topMatch = filteredPlaces[0] ?? null;
  const routeSlugs = useMemo(() => new Set((activeRoute?.stops ?? []).map((s) => s.slug)), [activeRoute]);

  function applyNearby() {
    if (!navigator.geolocation) {
      setAiState({ intent: "get_nearby", error: "Tu navegador no soporta geolocalización." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setAiState({ intent: "get_nearby" });
      },
      () => {
        setAiState({ intent: "get_nearby", error: "No pudimos acceder a tu ubicación." });
      }
    );
  }

  function applyUIActions(chunk: UIActionsChunk) {
    setAiState({ intent: chunk.intent, error: undefined });
    for (const action of chunk.actions ?? []) {
      if (action.type === "apply_filter") {
        if (typeof action.query === "string") setQuery(action.query);
        if (typeof action.category === "string") setCategory(action.category);
      }
      if (action.type === "select_place" && action.slug) {
        const found = places.find((p) => p.slug === action.slug);
        if (found) setSelectedPlace(found);
      }
      if (action.type === "set_route" && Array.isArray(action.stops)) {
        setActiveRoute({
          title: action.title ?? "Ruta recomendada",
          stops: action.stops as RouteStop[],
        });
      }
      if (action.type === "clear_route") {
        setActiveRoute(null);
      }
      if (action.type === "get_nearby") {
        applyNearby();
      }
    }
  }

  function clearFilters() {
    setQuery("");
    setCategory("");
    setActiveRoute(null);
    setAiState({});
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <aside className="w-[260px] shrink-0 border-r border-[#E2E8F0] bg-white">
        <div className="border-b border-[#E2E8F0] px-4 py-4">
          <Link href="/" className="font-jakarta text-xl font-bold text-[#0D9488]">
            Itinera
          </Link>
          <p className="mt-0.5 font-inter text-[11px] text-[#94A3B8]">Dashboard Cultural</p>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
            <Search className="h-3.5 w-3.5 text-[#94A3B8]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar lugares..."
              className="w-full bg-transparent font-inter text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
            />
            {query ? (
              <button onClick={() => setQuery("")} className="text-[#94A3B8]">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <nav className="space-y-1 px-3">
          {[
            { href: "/explore", label: "Explorar", icon: Compass },
            { href: "#nearby", label: "Cerca de mí", icon: LocateFixed, action: applyNearby },
            { href: "/stories", label: "Historias", icon: BookOpen },
            { href: "#heritage", label: "Patrimonio", icon: MapPin, action: () => setCategory("heritage") },
            { href: "/routes", label: "Mi Ruta", icon: Route },
            { href: "/profile/saved", label: "Guardados", icon: Heart },
            { href: "#ia", label: "Itinera IA", icon: Sparkles },
          ].map((item) =>
            item.href.startsWith("/") && !item.action ? (
              <Link
                key={item.label}
                href={item.href}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-inter text-sm font-medium text-[#475569] transition-colors hover:bg-[#F0FDF9] hover:text-[#0D9488]"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ) : (
              <button
                key={item.label}
                onClick={() => (item.action ? item.action() : undefined)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-inter text-sm font-medium text-[#475569] transition-colors hover:bg-[#F0FDF9] hover:text-[#0D9488]"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            )
          )}
        </nav>

        <div className="px-3 pt-2">
          <p className="mb-1 px-3 font-inter text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
            Categorías
          </p>
          <div className="flex flex-wrap gap-1.5 px-3">
            <button
              onClick={() => setCategory("")}
              className="rounded-full border px-2.5 py-1 font-inter text-[11px] font-semibold"
              style={{
                borderColor: !category ? "#0D9488" : "#E2E8F0",
                color: !category ? "#0D9488" : "#64748B",
                backgroundColor: !category ? "rgba(13,148,136,0.06)" : "white",
              }}
            >
              Todas
            </button>
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.slug)}
                className="rounded-full border px-2.5 py-1 font-inter text-[11px] font-semibold"
                style={{
                  borderColor: category === cat.slug ? "#0D9488" : "#E2E8F0",
                  color: category === cat.slug ? "#0D9488" : "#64748B",
                  backgroundColor: category === cat.slug ? "rgba(13,148,136,0.06)" : "white",
                }}
              >
                {getEs(cat.name_i18n, cat.slug)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto border-t border-[#E2E8F0] p-3">
          <div className="flex items-center gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0D9488] text-white">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-inter text-xs font-semibold text-[#0F172A]">
                {isGuest ? "Invitado" : "Explorador"}
              </p>
              <p className="truncate font-inter text-[11px] text-[#94A3B8]">
                {isGuest ? "Modo visitante" : "Cuenta activa"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {isGuest ? (
          <div className="shrink-0 border-b border-[#99F6E4] bg-[#ECFEFF] px-4 py-2 font-inter text-sm text-[#0F766E]">
            Estás explorando como invitado.{" "}
            <Link href="/register?redirect=/explore" className="font-semibold underline">
              Crea una cuenta
            </Link>{" "}
            para guardar favoritos y rutas.
          </div>
        ) : null}

        {aiState.intent ? (
          <div className="shrink-0 border-b border-[#99F6E4] bg-[#F0FDFA] px-4 py-2 font-inter text-xs text-[#0F766E]">
            Itinera IA aplicó: <strong>{aiState.intent}</strong>
            {aiState.error ? ` · ${aiState.error}` : ""}
          </div>
        ) : null}

        <section className="flex min-h-0 flex-1 flex-col p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-jakarta text-sm font-bold text-[#0F172A]">
              {filteredPlaces.length} lugar{filteredPlaces.length === 1 ? "" : "es"} encontrados
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={clearFilters}
                className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 font-inter text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Limpiar filtros
              </button>
              <button
                onClick={applyNearby}
                className="rounded-lg border border-[#99F6E4] bg-[#F0FDFA] px-3 py-1.5 font-inter text-xs font-semibold text-[#0F766E]"
              >
                Cerca de mí
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
            <div className="relative h-[62%] min-h-[320px] border-b border-[#E2E8F0]">
              <ExploreMap
                places={(filteredPlaces.length ? filteredPlaces : places) as never}
                selectedPlace={selectedPlace as never}
                onSelectPlace={(p) => setSelectedPlace((p as Place) ?? null)}
              />
              <PlaceDrawer place={selectedPlace as never} onClose={() => setSelectedPlace(null)} />
            </div>

            <div className="h-[38%] overflow-y-auto p-3">
              {activeRoute ? (
                <div className="mb-3 rounded-xl border border-[#BAE6FD] bg-[#F0F9FF] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-jakarta text-sm font-bold text-[#0C4A6E]">{activeRoute.title}</p>
                    <button
                      onClick={() => setActiveRoute(null)}
                      className="font-inter text-xs font-semibold text-[#0369A1]"
                    >
                      Quitar ruta
                    </button>
                  </div>
                  <div className="space-y-1">
                    {activeRoute.stops.map((stop) => (
                      <button
                        key={`${stop.slug}-${stop.order}`}
                        onClick={() => {
                          const found = places.find((p) => p.slug === stop.slug);
                          if (found) setSelectedPlace(found);
                        }}
                        className="flex w-full items-center justify-between rounded-lg bg-white px-2 py-1.5 text-left"
                      >
                        <span className="font-inter text-xs text-[#0F172A]">
                          {stop.order}. {stop.name}
                        </span>
                        <span className="font-inter text-[11px] text-[#64748B]">{stop.timeOfDay ?? "parada"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {(filteredPlaces.length ? filteredPlaces : places).slice(0, 12).map((place) => {
                  const categoryName = getEs(place.place_categories?.name_i18n, "Lugar");
                  const icon = ICON_MAP[place.place_categories?.icon_name ?? ""] ?? "📍";
                  const isTop = topMatch?.id === place.id;
                  const inRoute = routeSlugs.has(place.slug);
                  return (
                    <button
                      key={place.id}
                      onClick={() => setSelectedPlace(place)}
                      className="rounded-xl border px-3 py-2 text-left transition-colors hover:bg-[#F8FAFC]"
                      style={{
                        borderColor: isTop ? "#0D9488" : inRoute ? "#38BDF8" : "#E2E8F0",
                        backgroundColor: isTop ? "rgba(13,148,136,0.04)" : "white",
                      }}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <p className="truncate font-jakarta text-sm font-semibold text-[#0F172A]">
                          {getEs(place.name_i18n, place.slug)}
                        </p>
                        <span className="font-inter text-xs text-[#64748B]">★ {Number(place.aggregated_rating).toFixed(1)}</span>
                      </div>
                      <p className="font-inter text-xs text-[#64748B]">
                        {icon} {categoryName}
                        {isTop ? " · Top match IA" : inRoute ? " · En ruta" : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      <ExploreAIPanel
        context={{ page: "explore" }}
        onApplyActions={applyUIActions}
        onQuickAction={(prompt) => {
          if (prompt === "ver_cercanos") applyNearby();
          if (prompt === "limpiar") clearFilters();
        }}
      />
    </div>
  );
}

function ExploreAIPanel({
  context,
  onApplyActions,
  onQuickAction,
}: {
  context: ChatContext;
  onApplyActions: (chunk: UIActionsChunk) => void;
  onQuickAction: (key: "contar_historia" | "agregar_ruta" | "ver_cercanos" | "limpiar") => void;
}) {
  const [input, setInput] = useState("");
  const { messages, isLoading, send } = useStreamingChat(context, {
    onUIActions: onApplyActions,
    storageKey: "itinera_explore_chat_v1",
  });

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-[#E2E8F0] bg-white">
      <div className="border-b border-[#E2E8F0] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0D9488] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-jakarta text-sm font-bold text-[#0F172A]">Itinera IA</p>
            <p className="font-inter text-[11px] text-[#94A3B8]">Control del mapa en vivo</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button onClick={() => { onQuickAction("contar_historia"); send("Cuéntame una historia breve del lugar más recomendado"); }} className="rounded-full border border-[#E2E8F0] px-2.5 py-1 font-inter text-[11px] font-semibold text-[#475569]">
            Contar historia
          </button>
          <button onClick={() => { onQuickAction("agregar_ruta"); send("Recomiéndame una ruta de 3 paradas"); }} className="rounded-full border border-[#E2E8F0] px-2.5 py-1 font-inter text-[11px] font-semibold text-[#475569]">
            Agregar ruta
          </button>
          <button onClick={() => { onQuickAction("ver_cercanos"); send("Muéstrame lugares cercanos"); }} className="rounded-full border border-[#E2E8F0] px-2.5 py-1 font-inter text-[11px] font-semibold text-[#475569]">
            Ver cercanos
          </button>
          <button onClick={() => onQuickAction("limpiar")} className="rounded-full border border-[#E2E8F0] px-2.5 py-1 font-inter text-[11px] font-semibold text-[#475569]">
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <p className="font-inter text-xs text-[#64748B]">
              Escribe algo como: &quot;¿Qué lugares históricos recomiendas en Copán?&quot;.
            </p>
          </div>
        ) : null}
        <div className="space-y-2">
          {messages.map((m, i) => (
            <div key={i}>
              {m.role === "user" ? (
                <div className="ml-auto w-[90%] rounded-xl bg-[#0D9488] px-3 py-2">
                  <p className="font-inter text-xs text-white">{m.content}</p>
                </div>
              ) : (
                <div className="w-[96%] space-y-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2">
                  <p className="whitespace-pre-line font-inter text-xs text-[#0F172A]">{m.content}</p>
                  {m.toolResults?.map((tr, idx) => (
                    <ToolResultInline key={idx} toolName={tr.toolName} result={tr.result} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading ? <p className="font-inter text-xs text-[#94A3B8]">Pensando...</p> : null}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
          setInput("");
        }}
        className="border-t border-[#E2E8F0] p-3"
      >
        <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta a Itinera IA..."
            className="w-full bg-transparent font-inter text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-[#0D9488] px-2.5 py-1 font-inter text-xs font-semibold text-white disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </form>
    </aside>
  );
}
