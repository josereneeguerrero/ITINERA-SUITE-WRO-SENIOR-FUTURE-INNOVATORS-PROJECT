"use client";

import { useEffect, useMemo, useState } from "react";
import { Locate, MapPin, Search, Sparkles, Star, X } from "lucide-react";
import SuggestiveSearch from "@/components/ui/suggestive-search";
import { ExploreMap } from "@/components/explore/explore-map";
import { getCategoryColor } from "@/lib/category-theme";
import { createClient } from "@/lib/supabase/client";

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
  lat?: number | null;
  lng?: number | null;
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

type ActiveRoute = {
  title: string;
  stops: RouteStop[];
};

type UIAction = {
  type: "apply_filter" | "select_place" | "set_route" | "get_nearby" | "clear_route" | "center_map";
  slug?: string;
  query?: string;
  category?: string;
  title?: string;
  center?: [number, number];
  zoom?: number;
  stops?: RouteStop[];
};

type UIActionsChunk = {
  intent: string;
  actions: UIAction[];
  entities?: Record<string, unknown>;
};

const RECENT_SEARCHES_KEY = "itinera-explore-recent-searches";
const SAVED_PLACES_KEY = "itinera-explore-saved-slugs";

function getEs(value?: Record<string, string> | null, fallback = "") {
  return value?.es ?? value?.en ?? fallback;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scorePlace(place: Place, query: string) {
  const q = normalize(query);
  if (!q) return 0;

  const name = normalize(getEs(place.name_i18n, place.slug));
  const category = normalize(getEs(place.place_categories?.name_i18n, ""));
  const region = normalize(getEs(place.regions?.name_i18n, ""));
  const slug = normalize(place.slug);

  let score = 0;
  if (name === q) score += 100;
  if (name.startsWith(q)) score += 60;
  if (name.includes(q)) score += 40;
  if (slug.includes(q)) score += 30;
  if (category.includes(q)) score += 20;
  if (region.includes(q)) score += 15;
  score += Number(place.aggregated_rating ?? 0);
  return score;
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(from: [number, number], to: [number, number]) {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
}

function normalizeCategorySlug(value: string) {
  const normalized = normalize(value);
  if (normalized.includes("patrimonio") || normalized.includes("heritage")) return "patrimonio-cultural";
  if (normalized.includes("naturaleza") || normalized.includes("nature")) return "naturaleza";
  if (normalized.includes("aventura") || normalized.includes("adventure")) return "aventura";
  if (normalized.includes("gastronomia") || normalized.includes("food")) return "gastronomia";
  if (normalized.includes("religioso") || normalized.includes("religion")) return "religioso";
  if (normalized.includes("playa") || normalized.includes("beach")) return "playa";
  if (normalized.includes("arte") || normalized.includes("museo")) return "arte-y-museos";
  return "";
}

export function ExploreFullscreenMap({
  places,
  categories,
  isGuest,
  userId,
}: {
  places: Place[];
  categories: Category[];
  isGuest: boolean;
  userId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedPlaceSlug, setSelectedPlaceSlug] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [aiRecommendationReason, setAiRecommendationReason] = useState<string | null>(null);

  const filteredPlaces = useMemo(() => {
    const q = normalize(query);
    const base = places.filter((place) => {
      const name = normalize(getEs(place.name_i18n, place.slug));
      const category = normalize(getEs(place.place_categories?.name_i18n, ""));
      const region = normalize(getEs(place.regions?.name_i18n, ""));
      const matchesQuery = !q || name.includes(q) || category.includes(q) || region.includes(q);
      const matchesCategory = !activeCategory || place.place_categories?.slug === activeCategory;
      return matchesQuery && matchesCategory;
    });
    if (!userLocation) return base;
    return [...base].sort((a, b) => {
      const aCoords = typeof a.lng === "number" && typeof a.lat === "number" ? ([a.lng, a.lat] as [number, number]) : null;
      const bCoords = typeof b.lng === "number" && typeof b.lat === "number" ? ([b.lng, b.lat] as [number, number]) : null;
      if (!aCoords && !bCoords) return 0;
      if (!aCoords) return 1;
      if (!bCoords) return -1;
      return distanceKm(userLocation, aCoords) - distanceKm(userLocation, bCoords);
    });
  }, [places, query, activeCategory, userLocation]);

  const visibleSlugs = useMemo(() => new Set(filteredPlaces.map((item) => item.slug)), [filteredPlaces]);
  const selectedPlace = useMemo(
    () => places.find((item) => item.slug === selectedPlaceSlug) ?? null,
    [places, selectedPlaceSlug]
  );
  const searchSuggestions = useMemo(() => {
    const q = normalize(query);
    if (q.length < 1) return [];
    return places
      .map((place) => ({ place, score: scorePlace(place, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
      .map((item) => item.place);
  }, [places, query]);
  const showSearchPanel = query.trim().length > 0 && searchSuggestions.length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedRecent = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]");
      if (Array.isArray(storedRecent)) setRecentSearches(storedRecent.slice(0, 6));
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (isGuest || !userId) {
      if (typeof window !== "undefined") {
        try {
          const storedSaved = JSON.parse(window.localStorage.getItem(SAVED_PLACES_KEY) ?? "[]");
          if (Array.isArray(storedSaved)) setSavedSlugs(storedSaved);
        } catch {
          // no-op
        }
      }
      return;
    }

    const supabase = createClient();
    supabase
      .from("favorites")
      .select("places(slug)")
      .eq("user_id", userId)
      .then(({ data }) => {
        const slugs = (data ?? [])
          .map((row: { places?: { slug?: string } | { slug?: string }[] | null }) => {
            const related = Array.isArray(row.places) ? row.places[0] : row.places;
            return related?.slug ?? null;
          })
          .filter((slug): slug is string => Boolean(slug));
        setSavedSlugs(slugs);
      });
  }, [isGuest, userId]);

  useEffect(() => {
    const onActions = (event: Event) => {
      const detail = (event as CustomEvent<UIActionsChunk>).detail;
      if (!detail?.actions?.length) return;
      setAiHint(`IA aplicada: ${detail.intent.replaceAll("_", " ")}`);
      window.setTimeout(() => setAiHint(null), 2600);

      detail.actions.forEach((action) => {
        if (action.type === "apply_filter") {
          if (typeof action.query === "string") setQuery(action.query);
          if (typeof action.category === "string") {
            const slug = normalizeCategorySlug(action.category);
            if (slug) setActiveCategory(slug);
          }
          setAiRecommendationReason("IA filtró destinos según tu intención y contexto.");
        }
        if (action.type === "select_place" && action.slug) {
          const place = places.find((item) => item.slug === action.slug);
          if (!place) return;
          setSelectedPlaceSlug(place.slug);
          if (typeof place.lng === "number" && typeof place.lat === "number") {
            setMapCenter([place.lng, place.lat]);
            setMapZoom(12);
          }
          setAiRecommendationReason("IA priorizó este lugar por coincidencia semántica con tu búsqueda.");
        }
        if (action.type === "set_route" && Array.isArray(action.stops)) {
          setActiveRoute({
            title: action.title || "Ruta recomendada por IA",
            stops: action.stops,
          });
          const firstStop = action.stops[0];
          const firstPlace = firstStop?.slug ? places.find((item) => item.slug === firstStop.slug) : null;
          if (firstPlace && typeof firstPlace.lng === "number" && typeof firstPlace.lat === "number") {
            setMapCenter([firstPlace.lng, firstPlace.lat]);
            setMapZoom(10.8);
          }
          setAiRecommendationReason("Ruta sugerida por IA balanceando cercanía, categoría y valoración.");
        }
        if (action.type === "clear_route") {
          setActiveRoute(null);
        }
        if (action.type === "center_map" && action.center) {
          setMapCenter(action.center);
          setMapZoom(action.zoom ?? 10);
        }
        if (action.type === "get_nearby") {
          applyNearby();
        }
      });
    };

    window.addEventListener("itinera:ui-actions", onActions as EventListener);
    return () => window.removeEventListener("itinera:ui-actions", onActions as EventListener);
  }, [places]);

  function persistRecent(next: string[]) {
    setRecentSearches(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    }
  }

  function clearFilters() {
    setQuery("");
    setActiveCategory("");
    setSelectedPlaceSlug(null);
    setMapCenter(null);
    setMapZoom(null);
    setUserLocation(null);
  }

  function applyNearby() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point: [number, number] = [coords.longitude, coords.latitude];
        setUserLocation(point);
        setMapCenter([coords.longitude, coords.latitude]);
        setMapZoom(11);
      },
      () => undefined
    );
  }

  function selectPlaceFromSearch(place: Place) {
    setSelectedPlaceSlug(place.slug);
    setMapCenter(typeof place.lng === "number" && typeof place.lat === "number" ? [place.lng, place.lat] : null);
    setMapZoom(12);
    const name = getEs(place.name_i18n, place.slug);
    const next = [name, ...recentSearches.filter((item) => item !== name)].slice(0, 6);
    persistRecent(next);
  }

  function toggleSave(place: Place) {
    const isSaved = savedSlugs.includes(place.slug);

    if (!isGuest && userId) {
      const supabase = createClient();
      if (isSaved) {
        supabase.from("favorites").delete().eq("user_id", userId).eq("place_id", place.id);
        setSavedSlugs((prev) => prev.filter((slug) => slug !== place.slug));
        return;
      }
      supabase.from("favorites").insert({ user_id: userId, place_id: place.id });
      setSavedSlugs((prev) => [...prev, place.slug]);
      return;
    }

    const next = isSaved ? savedSlugs.filter((slug) => slug !== place.slug) : [...savedSlugs, place.slug];
    setSavedSlugs(next);
    if (typeof window !== "undefined") window.localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(next));
  }

  function addToRoute(place: Place) {
    setActiveRoute((prev) => {
      if (!prev) {
        return {
          title: "Ruta personalizada",
          stops: [{ order: 1, slug: place.slug, name: getEs(place.name_i18n, place.slug) }],
        };
      }
      if (prev.stops.some((stop) => stop.slug === place.slug)) return prev;
      const nextStops = [...prev.stops, { order: prev.stops.length + 1, slug: place.slug, name: getEs(place.name_i18n, place.slug) }];
      return { ...prev, stops: nextStops };
    });
  }

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-[#E5E7EB]">
      <div className="absolute inset-0">
        <ExploreMap
          places={places as never}
          visibleSlugs={visibleSlugs}
          selectedPlace={selectedPlace as never}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          isSaved={selectedPlace ? savedSlugs.includes(selectedPlace.slug) : false}
          onToggleSave={(place) => toggleSave(place as Place)}
          onAddToRoute={(place) => addToRoute(place as Place)}
          recommendationReason={aiRecommendationReason}
          routeStops={activeRoute?.stops ?? []}
          onSelectPlace={(place) => setSelectedPlaceSlug((place as Place | null)?.slug ?? null)}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-6 z-20 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-[820px]">
          <SuggestiveSearch
            value={query}
            onValueChange={setQuery}
            onSubmit={(text) => {
              if (!text.trim()) return;
              const first = searchSuggestions[0] ?? filteredPlaces[0];
              if (first) selectPlaceFromSearch(first);
            }}
            onTrailingClick={() => setShowFilters((prev) => !prev)}
            suggestions={["Buscar destinos...", "Buscar por categoria...", "Buscar por region..."]}
            effect="fade"
          />
          {aiHint ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#99F6E4] bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#0F766E] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {aiHint}
            </div>
          ) : null}

          {showSearchPanel ? (
            <div className="mt-2 overflow-hidden rounded-2xl border border-[#D9E5E2] bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.16)] backdrop-blur-md">
              <div className="border-b border-[#E2E8F0] px-4 py-2 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
                Sugerencias
              </div>
              <div className="max-h-[360px] overflow-y-auto p-2">
                {searchSuggestions.map((place) => {
                  const category = place.place_categories;
                  const color = getCategoryColor({
                    slug: category?.slug ?? "",
                    iconName: category?.icon_name ?? "",
                    label: category?.name_i18n?.es ?? category?.name_i18n?.en ?? "",
                  });

                  const placeDistance =
                    userLocation && typeof place.lng === "number" && typeof place.lat === "number"
                      ? distanceKm(userLocation, [place.lng, place.lat])
                      : null;
                  return (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => selectPlaceFromSearch(place)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#F8FAFC]"
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                        style={{ backgroundColor: color }}
                      >
                        <MapPin className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-jakarta text-sm font-bold text-[#0F172A]">
                          {getEs(place.name_i18n, place.slug)}
                        </span>
                        <span className="mt-0.5 block truncate font-inter text-xs text-[#64748B]">
                          {getEs(category?.name_i18n, "Lugar")} - {getEs(place.regions?.name_i18n, "Honduras")}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 font-inter text-xs font-semibold text-[#64748B]">
                        <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                        {Number(place.aggregated_rating).toFixed(1)}
                      </span>
                      {placeDistance !== null ? (
                        <span className="shrink-0 font-inter text-[11px] font-semibold text-[#0D9488]">
                          {placeDistance < 1 ? `${Math.round(placeDistance * 1000)} m` : `${placeDistance.toFixed(1)} km`}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : query.trim().length > 0 ? (
            <div className="mt-2 rounded-2xl border border-[#D9E5E2] bg-white/95 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-md">
              <div className="flex items-center gap-3 font-inter text-sm text-[#64748B]">
                <Search className="h-4 w-4" />
                No encontramos destinos parecidos.
              </div>
            </div>
          ) : recentSearches.length > 0 ? (
            <div className="mt-2 rounded-2xl border border-[#D9E5E2] bg-white/95 p-2 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-md">
              <div className="px-2 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
                Busquedas recientes
              </div>
              <div className="space-y-1">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuery(item)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#334155] transition-colors hover:bg-[#F8FAFC]"
                  >
                    <Search className="h-3.5 w-3.5 text-[#94A3B8]" />
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {showFilters ? (
            <div className="mt-2 rounded-2xl border border-[#D9E5E2] bg-white/95 p-2 shadow-[0_10px_28px_rgba(15,23,42,0.14)] backdrop-blur-sm">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory("")}
                  className="rounded-full border border-[#E2E8F0] px-3 py-1 font-inter text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Todas
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.slug)}
                    className="rounded-full border px-3 py-1 font-inter text-xs font-semibold"
                    style={{
                      borderColor: activeCategory === cat.slug ? "#0D9488" : "#E2E8F0",
                      color: activeCategory === cat.slug ? "#0F766E" : "#475569",
                      backgroundColor: activeCategory === cat.slug ? "rgba(13,148,136,0.08)" : "white",
                    }}
                  >
                    {getEs(cat.name_i18n, cat.slug)}
                  </button>
                ))}
                <button
                  onClick={applyNearby}
                  className="rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-3 py-1 font-inter text-xs font-semibold text-[#0F766E]"
                >
                  Cerca de mi
                </button>
                <button
                  onClick={clearFilters}
                  className="rounded-full border border-[#E2E8F0] px-3 py-1 font-inter text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Limpiar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {activeRoute && activeRoute.stops.length > 0 ? (
        <div className="pointer-events-none absolute bottom-28 left-4 z-20 w-[min(360px,calc(100vw-1.5rem))] md:left-6">
          <div className="pointer-events-auto rounded-2xl border border-[#D9E5E2] bg-white/95 p-3 shadow-[0_14px_30px_rgba(15,23,42,0.15)] backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                <Locate className="h-4 w-4 text-[#0D9488]" />
                {activeRoute.title}
              </div>
              <button
                type="button"
                onClick={() => setActiveRoute(null)}
                className="rounded-full p-1 text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                aria-label="Limpiar ruta"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {activeRoute.stops.slice(0, 4).map((stop) => (
                <button
                  key={stop.slug}
                  type="button"
                  onClick={() => {
                    const place = places.find((item) => item.slug === stop.slug);
                    if (place) selectPlaceFromSearch(place);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl border border-[#E2E8F0] px-2.5 py-2 text-left transition-colors hover:bg-[#F8FAFC]"
                >
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E6FFFB] px-1 text-[10px] font-bold text-[#0D9488]">
                    {stop.order}
                  </span>
                  <span className="truncate text-sm text-[#0F172A]">{stop.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}

