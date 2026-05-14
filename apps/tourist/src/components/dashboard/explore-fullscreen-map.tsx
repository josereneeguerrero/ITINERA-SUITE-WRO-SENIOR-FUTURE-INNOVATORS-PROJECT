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

type AiFilterChip = {
  key: "query" | "category" | "nearby";
  label: string;
};

const RECENT_SEARCHES_KEY = "itinera-explore-recent-searches";
const SAVED_PLACES_KEY = "itinera-explore-saved-slugs";
const ROUTE_KEY_PREFIX = "itinera-explore-active-route";

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

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));
  for (let i = 0; i <= b.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

function expandSynonyms(term: string) {
  const normalized = normalize(term);
  const buckets: Array<{ seeds: string[]; aliases: string[] }> = [
    { seeds: ["copan", "copan ruinas"], aliases: ["ruinas", "maya", "arqueologia"] },
    { seeds: ["roatan", "west bay", "playa"], aliases: ["islas de la bahia", "mar", "costa"] },
    { seeds: ["comayagua", "catedral"], aliases: ["reloj arabe", "iglesia", "religioso"] },
    { seeds: ["la tigra", "cusuco", "naturaleza"], aliases: ["bosque", "parque", "sendero"] },
  ];
  const extra = buckets.find((bucket) => bucket.seeds.some((seed) => normalized.includes(seed)));
  return extra ? [normalized, ...extra.aliases] : [normalized];
}

function getPreviewImage(slug: string) {
  const pool: Record<string, string> = {
    "ruinas-copan": "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?q=80&w=640&auto=format&fit=crop",
    "playa-west-bay-roatan": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=640&auto=format&fit=crop",
    "catedral-comayagua": "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=640&auto=format&fit=crop",
    "parque-nacional-la-tigra": "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=640&auto=format&fit=crop",
  };
  return pool[slug] ?? "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=640&auto=format&fit=crop";
}

function scorePlace(place: Place, query: string) {
  const q = normalize(query);
  if (!q) return 0;
  const terms = expandSynonyms(query);
  const name = normalize(getEs(place.name_i18n, place.slug));
  const category = normalize(getEs(place.place_categories?.name_i18n, ""));
  const region = normalize(getEs(place.regions?.name_i18n, ""));
  const slug = normalize(place.slug);

  let score = 0;
  let hasTextMatch = false;
  for (const term of terms) {
    if (name === term) {
      score += 100;
      hasTextMatch = true;
    }
    if (name.startsWith(term)) {
      score += 60;
      hasTextMatch = true;
    }
    if (name.includes(term)) {
      score += 40;
      hasTextMatch = true;
    }
    if (slug.includes(term)) {
      score += 30;
      hasTextMatch = true;
    }
    if (category.includes(term)) {
      score += 20;
      hasTextMatch = true;
    }
    if (region.includes(term)) {
      score += 15;
      hasTextMatch = true;
    }
    const d = levenshtein(name.slice(0, term.length + 2), term);
    if (d <= 2) {
      score += 12 - d * 3;
      hasTextMatch = true;
    }
  }
  if (!hasTextMatch) return 0;
  score += Number(place.aggregated_rating ?? 0);
  return score;
}

function isStrictlyRelevant(place: Place, query: string) {
  const q = normalize(query);
  if (!q) return true;

  const stopWords = new Set(["de", "del", "la", "el", "los", "las", "y", "en"]);
  const tokens = q.split(" ").filter((token) => token.length >= 3 && !stopWords.has(token));
  if (!tokens.length) return true;

  const name = normalize(getEs(place.name_i18n, place.slug));
  const category = normalize(getEs(place.place_categories?.name_i18n, ""));
  const region = normalize(getEs(place.regions?.name_i18n, ""));
  const haystack = `${name} ${category} ${region}`;

  let matched = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      matched += 1;
      continue;
    }
    const fuzzy = levenshtein(name.slice(0, token.length + 2), token) <= 1;
    if (fuzzy) matched += 1;
  }

  return matched / tokens.length >= 0.6;
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

function upsertChip(chips: AiFilterChip[], chip: AiFilterChip) {
  const next = chips.filter((item) => item.key !== chip.key);
  next.push(chip);
  return next;
}

const Z = {
  mapCard: "z-30",
  routeCard: "z-40",
  searchLayer: "z-50",
};

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
  const [aiChips, setAiChips] = useState<AiFilterChip[]>([]);
  const routeStorageKey = `${ROUTE_KEY_PREFIX}:${isGuest ? "guest" : userId ?? "anon"}`;

  const filteredPlaces = useMemo(() => {
    const q = normalize(query);
    const terms = expandSynonyms(q);
    const base = places.filter((place) => {
      const name = normalize(getEs(place.name_i18n, place.slug));
      const category = normalize(getEs(place.place_categories?.name_i18n, ""));
      const region = normalize(getEs(place.regions?.name_i18n, ""));
      const matchesQuery =
        !q ||
        terms.some((term) => {
          const fuzzy = levenshtein(name.slice(0, term.length + 2), term) <= 2;
          return name.includes(term) || category.includes(term) || region.includes(term) || fuzzy;
        });
      const strictMatch = !q || isStrictlyRelevant(place, query);
      const matchesCategory = !activeCategory || place.place_categories?.slug === activeCategory;
      return matchesQuery && strictMatch && matchesCategory;
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
      .filter((item) => item.score >= 20 && isStrictlyRelevant(item.place, query))
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
      .map((item) => item.place);
  }, [places, query]);

  const categorySuggestions = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return categories
      .filter((cat) => normalize(getEs(cat.name_i18n, cat.slug)).includes(q))
      .slice(0, 4);
  }, [categories, query]);

  const regionSuggestions = useMemo(() => {
    const q = normalize(query);
    if (!q) return [] as Array<{ slug: string; label: string }>;
    const set = new Set<string>();
    const rows: Array<{ slug: string; label: string }> = [];
    for (const place of places) {
      const slug = place.regions?.slug ?? "";
      const label = getEs(place.regions?.name_i18n, "Honduras");
      if (!slug || set.has(slug)) continue;
      if (normalize(label).includes(q)) {
        rows.push({ slug, label });
        set.add(slug);
      }
      if (rows.length >= 4) break;
    }
    return rows;
  }, [places, query]);

  const uiMode = useMemo<"idle" | "searching" | "filters" | "placeSelected">(() => {
    if (selectedPlace) return "placeSelected";
    if (showFilters) return "filters";
    if (query.trim().length > 0) return "searching";
    return "idle";
  }, [selectedPlace, showFilters, query]);

  const shouldShowSuggestionsPanel = uiMode === "searching";

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
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(routeStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ActiveRoute;
      if (parsed?.stops?.length) setActiveRoute(parsed);
    } catch {
      // no-op
    }
  }, [routeStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeRoute || !activeRoute.stops.length) {
      window.localStorage.removeItem(routeStorageKey);
      return;
    }
    window.localStorage.setItem(routeStorageKey, JSON.stringify(activeRoute));
  }, [activeRoute, routeStorageKey]);

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
          setAiChips((prev) => {
            let next = [...prev];
            if (typeof action.query === "string" && action.query.trim()) {
              next = upsertChip(next, { key: "query", label: `Búsqueda: ${action.query}` });
            }
            if (typeof action.category === "string" && action.category.trim()) {
              next = upsertChip(next, { key: "category", label: `Categoría: ${action.category}` });
            }
            return next;
          });
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
          setAiChips((prev) => upsertChip(prev, { key: "nearby", label: "Cerca de mí" }));
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
    setAiChips([]);
    setShowFilters(false);
  }

  function applyNearby() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point: [number, number] = [coords.longitude, coords.latitude];
        setUserLocation(point);
        setMapCenter([coords.longitude, coords.latitude]);
        setMapZoom(11);
        setAiChips((prev) => upsertChip(prev, { key: "nearby", label: "Cerca de mí" }));
      },
      () => undefined
    );
  }

  function removeAiChip(key: AiFilterChip["key"]) {
    setAiChips((prev) => prev.filter((chip) => chip.key !== key));
    if (key === "query") setQuery("");
    if (key === "category") setActiveCategory("");
    if (key === "nearby") {
      setUserLocation(null);
      setMapCenter(null);
      setMapZoom(null);
    }
  }

  function selectPlaceFromSearch(place: Place) {
    setSelectedPlaceSlug(place.slug);
    setMapCenter(typeof place.lng === "number" && typeof place.lat === "number" ? [place.lng, place.lat] : null);
    setMapZoom(12);
    setShowFilters(false);
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

  const previewPlace = uiMode === "idle" && query.trim().length > 0 ? searchSuggestions[0] ?? null : null;

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
          onSelectPlace={(place) => {
            const nextSlug = (place as Place | null)?.slug ?? null;
            setSelectedPlaceSlug(nextSlug);
            if (nextSlug) {
              setShowFilters(false);
              setQuery("");
            }
          }}
        />
      </div>

      <div className={`pointer-events-none absolute inset-x-0 top-6 ${Z.searchLayer} flex justify-center px-4`}>
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
            suggestions={["Buscar destinos...", "Buscar por categoría...", "Buscar por región..."]}
            effect="fade"
          />

          {aiHint && uiMode !== "placeSelected" ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#99F6E4] bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#0F766E] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {aiHint}
            </div>
          ) : null}

          {aiChips.length > 0 && uiMode !== "placeSelected" ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {aiChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => removeAiChip(chip.key)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#99F6E4] bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#0F766E] shadow-sm transition-colors hover:bg-[#F0FDFA]"
                >
                  {chip.label}
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          ) : null}

          {previewPlace ? (
            <div className="mt-2 max-w-[380px] overflow-hidden rounded-2xl border border-[#D9E5E2] bg-white/95 shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur-sm transition-all duration-200">
              <div className="flex gap-3 p-2.5">
                <img
                  src={getPreviewImage(previewPlace.slug)}
                  alt={getEs(previewPlace.name_i18n, previewPlace.slug)}
                  className="h-16 w-16 rounded-xl object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-jakarta text-sm font-bold text-[#0F172A]">
                    {getEs(previewPlace.name_i18n, previewPlace.slug)}
                  </p>
                  <p className="mt-0.5 truncate font-inter text-xs text-[#64748B]">
                    {getEs(previewPlace.place_categories?.name_i18n, "Lugar")} - {getEs(previewPlace.regions?.name_i18n, "Honduras")}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectPlaceFromSearch(previewPlace)}
                      className="rounded-lg bg-[#0D9488] px-2.5 py-1 font-inter text-xs font-semibold text-white"
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      onClick={() => addToRoute(previewPlace)}
                      className="rounded-lg border border-[#99F6E4] bg-[#F0FDFA] px-2.5 py-1 font-inter text-xs font-semibold text-[#0F766E]"
                    >
                      En ruta
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {shouldShowSuggestionsPanel ? (
            <div className="mt-2 overflow-hidden rounded-2xl border border-[#D9E5E2] bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.16)] backdrop-blur-md">
              <div className="max-h-[380px] overflow-y-auto p-2">
                {recentSearches.length > 0 ? (
                  <>
                    <div className="px-2 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
                      Recientes
                    </div>
                    <div className="mb-2 space-y-1">
                      {recentSearches.slice(0, 4).map((item) => (
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
                  </>
                ) : null}

                {searchSuggestions.length > 0 ? (
                  <>
                    <div className="px-2 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
                      Destinos
                    </div>
                    <div className="mb-2 space-y-1">
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
                  </>
                ) : null}

                {categorySuggestions.length > 0 ? (
                  <>
                    <div className="px-2 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
                      Categorías
                    </div>
                    <div className="mb-2 flex flex-wrap gap-2 px-2 pb-1">
                      {categorySuggestions.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setActiveCategory(cat.slug);
                            setQuery(getEs(cat.name_i18n, cat.slug));
                          }}
                          className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#F8FAFC]"
                        >
                          {getEs(cat.name_i18n, cat.slug)}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                {regionSuggestions.length > 0 ? (
                  <>
                    <div className="px-2 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
                      Regiones
                    </div>
                    <div className="flex flex-wrap gap-2 px-2 pb-1">
                      {regionSuggestions.map((region) => (
                        <button
                          key={region.slug}
                          type="button"
                          onClick={() => {
                            setQuery(region.label);
                            const regionPlace = places.find((item) => item.regions?.slug === region.slug);
                            if (regionPlace && typeof regionPlace.lng === "number" && typeof regionPlace.lat === "number") {
                              setMapCenter([regionPlace.lng, regionPlace.lat]);
                              setMapZoom(9.6);
                            }
                          }}
                          className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#F8FAFC]"
                        >
                          {region.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : query.trim().length > 0 ? (
            <div className="mt-2 rounded-2xl border border-[#D9E5E2] bg-white/95 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-md">
              <div className="flex items-center gap-3 font-inter text-sm text-[#64748B]">
                <Search className="h-4 w-4" />
                No encontramos destinos parecidos.
              </div>
            </div>
          ) : null}

          {uiMode === "filters" ? (
            <div className="mt-2 rounded-2xl border border-[#D9E5E2] bg-white/95 p-2 shadow-[0_10px_28px_rgba(15,23,42,0.14)] backdrop-blur-sm transition-all duration-200">
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
                  Cerca de mí
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

      {activeRoute && activeRoute.stops.length > 0 && uiMode !== "placeSelected" ? (
        <div className={`pointer-events-none absolute bottom-28 left-4 ${Z.routeCard} w-[min(360px,calc(100vw-1.5rem))] md:left-6`}>
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
