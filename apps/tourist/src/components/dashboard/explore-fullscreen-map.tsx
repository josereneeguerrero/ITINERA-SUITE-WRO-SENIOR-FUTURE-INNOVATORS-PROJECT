"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Bookmark, Locate, MapPin, Search, Sparkles, Star, Trash2, X } from "lucide-react";
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

type UserLocation = {
  lng: number;
  lat: number;
  accuracy?: number;
};

type RouteMeta = {
  distanceKm?: number;
  durationMin?: number;
  approximate?: boolean;
  mixed?: boolean;
};

type RouteSegment = {
  coordinates: [number, number][];
  approximate: boolean;
};

type RouteFeedback = {
  kind: "added" | "exists";
  placeSlug: string;
  message: string;
};

type UIAction = {
  type:
    | "apply_filter"
    | "select_place"
    | "set_route"
    | "add_route_stop"
    | "remove_route_stop"
    | "reorder_route"
    | "get_nearby"
    | "clear_filters"
    | "clear_route"
    | "center_map";
  slug?: string;
  query?: string;
  category?: string;
  region?: string;
  minRating?: number;
  savedOnly?: boolean;
  fromIndex?: number;
  toIndex?: number;
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
  key: "query" | "category" | "region" | "rating" | "saved" | "nearby";
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

async function fetchOsrmRoute(coords: [number, number][]) {
  const coordinateString = coords.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("OSRM route request failed");
  const payload = (await response.json()) as {
    routes?: Array<{
      distance?: number;
      duration?: number;
      geometry?: { coordinates?: [number, number][] };
    }>;
  };
  const route = payload.routes?.[0];
  const coordinates = route?.geometry?.coordinates;
  if (!route) throw new Error("OSRM route missing");
  if (!coordinates?.length) throw new Error("OSRM route geometry missing");
  return {
    coordinates,
    distanceKm: typeof route.distance === "number" ? route.distance / 1000 : undefined,
    durationMin: typeof route.duration === "number" ? Math.round(route.duration / 60) : undefined,
  };
}

async function buildSegmentedRoute(coords: [number, number][]) {
  const segments = await Promise.all(
    coords.slice(0, -1).map(async (start, index) => {
      const end = coords[index + 1];
      try {
        const route = await fetchOsrmRoute([start, end]);
        return {
          segment: { coordinates: route.coordinates, approximate: false },
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
        };
      } catch {
        return {
          segment: { coordinates: [start, end], approximate: true },
          distanceKm: distanceKm(start, end),
          durationMin: undefined,
        };
      }
    })
  );

  return {
    segments: segments.map((item) => item.segment),
    coordinates: segments.flatMap((item, index) =>
      index === 0 ? item.segment.coordinates : item.segment.coordinates.slice(1)
    ),
    distanceKm: segments.reduce((sum, item) => sum + (item.distanceKm ?? 0), 0),
    durationMin: segments.some((item) => typeof item.durationMin !== "number")
      ? undefined
      : segments.reduce((sum, item) => sum + (item.durationMin ?? 0), 0),
    approximate: segments.some((item) => item.segment.approximate),
  };
}

function formatRouteMeta(meta: RouteMeta | null) {
  if (!meta) return "";
  const parts: string[] = [];
  parts.push(meta.mixed ? "Ruta mixta" : meta.approximate ? "Ruta aproximada" : "Ruta por OSRM");
  if (typeof meta.distanceKm === "number") parts.push(`${Math.round(meta.distanceKm)} km`);
  if (typeof meta.durationMin === "number") {
    const hours = Math.floor(meta.durationMin / 60);
    const minutes = meta.durationMin % 60;
    parts.push(hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`);
  }
  return parts.join(" · ");
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
  const [activeRegion, setActiveRegion] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedPlaceSlug, setSelectedPlaceSlug] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [routeFeedback, setRouteFeedback] = useState<RouteFeedback | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[] | null>(null);
  const [routeMeta, setRouteMeta] = useState<RouteMeta | null>(null);
  const [routePanelExpanded, setRoutePanelExpanded] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
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
      const matchesRegion = !activeRegion || place.regions?.slug === activeRegion;
      const matchesRating = !minRating || Number(place.aggregated_rating ?? 0) >= minRating;
      const matchesSaved = !savedOnly || savedSlugs.includes(place.slug);
      return matchesQuery && strictMatch && matchesCategory && matchesRegion && matchesRating && matchesSaved;
    });
    if (!userLocation) return base;
    return [...base].sort((a, b) => {
      const aCoords = typeof a.lng === "number" && typeof a.lat === "number" ? ([a.lng, a.lat] as [number, number]) : null;
      const bCoords = typeof b.lng === "number" && typeof b.lat === "number" ? ([b.lng, b.lat] as [number, number]) : null;
      if (!aCoords && !bCoords) return 0;
      if (!aCoords) return 1;
      if (!bCoords) return -1;
      const userCoords: [number, number] = [userLocation.lng, userLocation.lat];
      return distanceKm(userCoords, aCoords) - distanceKm(userCoords, bCoords);
    });
  }, [places, query, activeCategory, activeRegion, minRating, savedOnly, savedSlugs, userLocation]);

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
  const hasActiveRoute = Boolean(activeRoute?.stops.length);
  const shouldCompactRoutePanel = hasActiveRoute && Boolean(selectedPlace) && !routePanelExpanded;
  const shouldShowFullRoutePanel = hasActiveRoute && (!selectedPlace || routePanelExpanded);
  const routeMetaLabel = formatRouteMeta(routeMeta);
  const regionFilterOptions = useMemo(() => {
    const set = new Set<string>();
    return places
      .map((place) => ({
        slug: place.regions?.slug ?? "",
        label: getEs(place.regions?.name_i18n, "Honduras"),
      }))
      .filter((region) => {
        if (!region.slug || set.has(region.slug)) return false;
        set.add(region.slug);
        return true;
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [places]);

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
    if (!routeFeedback) return;
    const timeout = window.setTimeout(() => setRouteFeedback(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [routeFeedback]);

  useEffect(() => {
    if (selectedPlace) setRoutePanelExpanded(false);
  }, [selectedPlace]);

  useEffect(() => {
    let cancelled = false;

    const coords =
      activeRoute?.stops
        .map((stop) => places.find((place) => place.slug === stop.slug))
        .filter((place): place is Place => Boolean(place))
        .map((place) =>
          typeof place.lng === "number" && typeof place.lat === "number"
            ? ([place.lng, place.lat] as [number, number])
            : null
        )
        .filter((value): value is [number, number] => Boolean(value)) ?? [];

    if (coords.length < 2) {
      setRouteGeometry(null);
      setRouteSegments(null);
      setRouteMeta(null);
      return () => {
        cancelled = true;
      };
    }

    buildSegmentedRoute(coords)
      .then((route) => {
        if (cancelled) return;
        setRouteGeometry(route.coordinates);
        setRouteSegments(route.segments);
        setRouteMeta({
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
          approximate: route.approximate,
          mixed: route.approximate && route.segments.some((segment) => !segment.approximate),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setRouteGeometry(coords);
        setRouteSegments([{ coordinates: coords, approximate: true }]);
        setRouteMeta({ approximate: true });
      });

    return () => {
      cancelled = true;
    };
  }, [activeRoute, places]);

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
          if (typeof action.region === "string") {
            const region = regionFilterOptions.find(
              (item) => item.slug === action.region || normalize(item.label) === normalize(action.region ?? "")
            );
            setActiveRegion(region?.slug ?? action.region);
          }
          if (typeof action.minRating === "number") setMinRating(action.minRating);
          if (typeof action.savedOnly === "boolean") setSavedOnly(action.savedOnly);
          setAiChips((prev) => {
            let next = [...prev];
            if (typeof action.query === "string" && action.query.trim()) {
              next = upsertChip(next, { key: "query", label: `Búsqueda: ${action.query}` });
            }
            if (typeof action.category === "string" && action.category.trim()) {
              next = upsertChip(next, { key: "category", label: `Categoría: ${action.category}` });
            }
            if (typeof action.region === "string" && action.region.trim()) {
              const region = regionFilterOptions.find((item) => item.slug === action.region);
              next = upsertChip(next, { key: "region", label: `Region: ${region?.label ?? action.region}` });
            }
            if (typeof action.minRating === "number" && action.minRating > 0) {
              next = upsertChip(next, { key: "rating", label: `${action.minRating}+ estrellas` });
            }
            if (action.savedOnly) {
              next = upsertChip(next, { key: "saved", label: "Guardados" });
            }
            return next;
          });
          setAiRecommendationReason("IA filtró destinos según tu intención y contexto.");
        }
        if (action.type === "select_place" && action.slug) {
          const place = places.find((item) => item.slug === action.slug);
          if (!place) return;
          setSelectedPlaceSlug(place.slug);
          setShowFilters(false);
          setRoutePanelExpanded(false);
          if (typeof place.lng === "number" && typeof place.lat === "number") {
            setMapCenter([place.lng, place.lat]);
            setMapZoom(12);
          }
          setAiRecommendationReason("IA priorizó este lugar por coincidencia semántica con tu búsqueda.");
        }
        if (action.type === "set_route" && Array.isArray(action.stops)) {
          setActiveRoute({
            title: action.title || "Ruta recomendada por IA",
            stops: normalizeRouteStops(action.stops),
          });
          setRoutePanelExpanded(false);
          const firstStop = action.stops[0];
          const firstPlace = firstStop?.slug ? places.find((item) => item.slug === firstStop.slug) : null;
          if (firstPlace && typeof firstPlace.lng === "number" && typeof firstPlace.lat === "number") {
            setMapCenter([firstPlace.lng, firstPlace.lat]);
            setMapZoom(10.8);
          }
          setAiRecommendationReason("Ruta sugerida por IA balanceando cercanía, categoría y valoración.");
        }
        if (action.type === "add_route_stop" && action.slug) {
          const place = places.find((item) => item.slug === action.slug);
          if (place) addToRoute(place);
        }
        if (action.type === "remove_route_stop" && action.slug) {
          removeRouteStop(action.slug);
        }
        if (action.type === "reorder_route" && typeof action.fromIndex === "number" && typeof action.toIndex === "number") {
          reorderRouteStop(action.fromIndex, action.toIndex);
        }
        if (action.type === "clear_filters") {
          clearFilters();
        }
        if (action.type === "clear_route") {
          clearRoute();
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
  }, [places, regionFilterOptions]);

  function persistRecent(next: string[]) {
    setRecentSearches(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    }
  }

  function clearFilters() {
    setQuery("");
    setActiveCategory("");
    setActiveRegion("");
    setMinRating(0);
    setSavedOnly(false);
    setSelectedPlaceSlug(null);
    setMapCenter(null);
    setMapZoom(null);
    setUserLocation(null);
    setAiChips([]);
    setAiRecommendationReason(null);
    setShowFilters(false);
  }

  function applyNearby() {
    if (!navigator.geolocation) {
      setAiHint("Tu navegador no permite obtener ubicacion.");
      window.setTimeout(() => setAiHint(null), 2600);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point: UserLocation = {
          lng: coords.longitude,
          lat: coords.latitude,
          accuracy: coords.accuracy,
        };
        const zoom = coords.accuracy <= 100 ? 13 : coords.accuracy <= 1000 ? 11.5 : 10.5;
        setUserLocation(point);
        setMapCenter([coords.longitude, coords.latitude]);
        setMapZoom(zoom);
        if (coords.accuracy > 1000) {
          setAiHint("Ubicacion aproximada: ordenamos destinos cercanos con menor precision.");
          window.setTimeout(() => setAiHint(null), 3200);
        }
        setAiChips((prev) => upsertChip(prev, { key: "nearby", label: "Cerca de mí" }));
      },
      () => {
        setAiHint("No pudimos obtener tu ubicacion. Revisa permisos del navegador.");
        window.setTimeout(() => setAiHint(null), 3200);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  function removeAiChip(key: AiFilterChip["key"]) {
    setAiChips((prev) => prev.filter((chip) => chip.key !== key));
    if (key === "query") setQuery("");
    if (key === "category") setActiveCategory("");
    if (key === "region") setActiveRegion("");
    if (key === "rating") setMinRating(0);
    if (key === "saved") setSavedOnly(false);
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

  function clearRoute() {
    setActiveRoute(null);
    setRouteFeedback(null);
    setRoutePanelExpanded(false);
  }

  function normalizeRouteStops(stops: RouteStop[]) {
    return stops.map((stop, index) => ({ ...stop, order: index + 1 }));
  }

  function openRouteStop(slug: string) {
    const place = places.find((item) => item.slug === slug);
    if (!place) return;
    selectPlaceFromSearch(place);
    setRoutePanelExpanded(false);
  }

  function removeRouteStop(slug: string) {
    setActiveRoute((prev) => {
      if (!prev) return prev;
      const nextStops = normalizeRouteStops(prev.stops.filter((stop) => stop.slug !== slug));
      if (!nextStops.length) return null;
      return { ...prev, stops: nextStops };
    });
    setRouteFeedback({ kind: "added", placeSlug: slug, message: "Parada removida de tu ruta" });
  }

  function reorderRouteStop(fromIndex: number, toIndex: number) {
    setActiveRoute((prev) => {
      if (!prev || toIndex < 0 || toIndex >= prev.stops.length) return prev;
      const nextStops = [...prev.stops];
      const [moved] = nextStops.splice(fromIndex, 1);
      if (!moved) return prev;
      nextStops.splice(toIndex, 0, moved);
      return { ...prev, stops: normalizeRouteStops(nextStops) };
    });
    setRoutePanelExpanded(true);
  }

  function addToRoute(place: Place) {
    const alreadyInRoute = activeRoute?.stops.some((stop) => stop.slug === place.slug) ?? false;
    setRouteFeedback({
      kind: alreadyInRoute ? "exists" : "added",
      placeSlug: place.slug,
      message: alreadyInRoute ? "Ya esta en tu ruta" : "Agregado a tu ruta",
    });

    if (alreadyInRoute) return;

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
    setRoutePanelExpanded(false);
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
          routeGeometry={routeGeometry}
          routeSegments={routeSegments}
          routeMeta={routeMeta}
          routeStopSlugs={activeRoute?.stops.map((stop) => stop.slug) ?? []}
          routeFeedback={routeFeedback}
          userLocation={userLocation}
          onSelectPlace={(place) => {
            const nextSlug = (place as Place | null)?.slug ?? null;
            setSelectedPlaceSlug(nextSlug);
            if (nextSlug) {
              setShowFilters(false);
              setQuery("");
              setRoutePanelExpanded(false);
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
                            ? distanceKm([userLocation.lng, userLocation.lat], [place.lng, place.lat])
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
                {regionFilterOptions.map((region) => (
                  <button
                    key={region.slug}
                    type="button"
                    onClick={() => {
                      setActiveRegion(region.slug);
                      setAiChips((prev) => upsertChip(prev, { key: "region", label: region.label }));
                    }}
                    className="rounded-full border px-3 py-1 font-inter text-xs font-semibold"
                    style={{
                      borderColor: activeRegion === region.slug ? "#0D9488" : "#E2E8F0",
                      color: activeRegion === region.slug ? "#0F766E" : "#475569",
                      backgroundColor: activeRegion === region.slug ? "rgba(13,148,136,0.08)" : "white",
                    }}
                  >
                    {region.label}
                  </button>
                ))}
                {[4, 4.5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => {
                      setMinRating(rating);
                      setAiChips((prev) => upsertChip(prev, { key: "rating", label: `${rating}+ estrellas` }));
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1 font-inter text-xs font-semibold text-[#B45309]"
                  >
                    <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                    {rating}+
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const next = !savedOnly;
                    setSavedOnly(next);
                    setAiChips((prev) => (next ? upsertChip(prev, { key: "saved", label: "Guardados" }) : prev.filter((chip) => chip.key !== "saved")));
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] px-3 py-1 font-inter text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  Guardados
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {activeRoute && shouldCompactRoutePanel ? (
        <div className={`pointer-events-none absolute bottom-28 left-1/2 ${Z.routeCard} w-[min(520px,calc(100vw-1.5rem))] -translate-x-1/2 px-2`}>
          <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-[#99F6E4] bg-white/95 px-3 py-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.16)] backdrop-blur-md">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Locate className="h-4 w-4 shrink-0 text-[#0D9488]" />
                <span className="truncate text-sm font-bold text-[#0F172A]">{activeRoute.title}</span>
                <span className="shrink-0 rounded-full bg-[#E6FFFB] px-2 py-0.5 text-[10px] font-bold text-[#0D9488]">
                  {activeRoute.stops.length} paradas
                </span>
              </div>
              {routeMetaLabel ? (
                <p className="mt-0.5 truncate text-xs font-semibold text-[#64748B]">{routeMetaLabel}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRoutePanelExpanded(true)}
                className="rounded-full bg-[#0D9488] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#0f766e]"
              >
                Ver ruta
              </button>
              <button
                type="button"
                onClick={clearRoute}
                className="rounded-full p-1.5 text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                aria-label="Limpiar ruta"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeRoute && shouldShowFullRoutePanel ? (
        <div
          className={`pointer-events-none absolute ${Z.routeCard} w-[min(360px,calc(100vw-1.5rem))] ${
            selectedPlace
              ? "bottom-28 left-1/2 -translate-x-1/2"
              : "bottom-28 left-4 md:left-6"
          }`}
        >
          <div className="pointer-events-auto rounded-2xl border border-[#D9E5E2] bg-white/95 p-3 shadow-[0_14px_30px_rgba(15,23,42,0.15)] backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                <Locate className="h-4 w-4 text-[#0D9488]" />
                {activeRoute.title}
                <span className="rounded-full bg-[#E6FFFB] px-2 py-0.5 text-[10px] font-bold text-[#0D9488]">
                  {activeRoute.stops.length} paradas
                </span>
              </div>
              <button
                type="button"
                onClick={selectedPlace ? () => setRoutePanelExpanded(false) : clearRoute}
                className="rounded-full p-1 text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                aria-label={selectedPlace ? "Compactar ruta" : "Limpiar ruta"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {routeMetaLabel ? (
              <div className="mb-2 rounded-xl bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-semibold text-[#64748B]">
                {routeMetaLabel}
              </div>
            ) : null}
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {activeRoute.stops.map((stop, index) => (
                <div
                  key={stop.slug}
                  className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-1.5 py-1.5 transition-colors hover:bg-[#F8FAFC]"
                >
                  <button
                    type="button"
                    onClick={() => openRouteStop(stop.slug)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left focus:outline-none focus:ring-2 focus:ring-[#99F6E4]"
                  >
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#E6FFFB] px-1 text-[10px] font-bold text-[#0D9488]">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-[#0F172A]">{stop.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => reorderRouteStop(index, index - 1)}
                    disabled={index === 0}
                    className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={`Subir ${stop.name}`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => reorderRouteStop(index, index + 1)}
                    disabled={index === activeRoute.stops.length - 1}
                    className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={`Bajar ${stop.name}`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRouteStop(stop.slug)}
                    className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                    aria-label={`Quitar ${stop.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
