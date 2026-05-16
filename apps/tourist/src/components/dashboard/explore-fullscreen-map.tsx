"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Bookmark, Check, Locate, MapPin, Save, Search, Sparkles, Star, Trash2, X } from "lucide-react";
import { saveRoute } from "@/app/routes/actions";
import SuggestiveSearch from "@/components/ui/suggestive-search";
import { ExploreMap } from "@/components/explore/explore-map";
import { FloatingAiAssistant } from "@/components/ui/glowing-ai-chat-assistant";
import { getCategoryColor } from "@/lib/category-theme";
import { createClient } from "@/lib/supabase/client";
import type { UIActionsChunk } from "@/hooks/use-streaming-chat";

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
  roadSegments?: number;
  approximateSegments?: number;
};

type RouteSegment = {
  coordinates: [number, number][];
  approximate: boolean;
};

type RouteWaypoint = {
  coordinates: [number, number];
  regionSlug?: string;
};

type RouteFeedback = {
  kind: "added" | "exists";
  placeSlug: string;
  message: string;
};

type SearchIntent = "idle" | "literal_search" | "recommendation_intent" | "invalid_search";

const RECENT_SEARCHES_KEY = "itinera-explore-recent-searches";
const SAVED_PLACES_KEY = "itinera-explore-saved-slugs";
const ROUTE_KEY_PREFIX = "itinera-explore-active-route";
const LA_CEIBA_FERRY_PORT: [number, number] = [-86.793, 15.781];
const ISLAND_REGION_HINTS = ["islas-de-la-bahia", "islas de la bahia", "bay-islands", "bay islands"];

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

function isRecommendationIntent(value: string) {
  const q = normalize(value);
  if (!q) return false;
  const phrases = [
    "otra opcion",
    "otras opciones",
    "otro lugar",
    "otros lugares",
    "que hay",
    "que lugares hay",
    "que mas hay",
    "que mas puedo ver",
    "algo mas",
    "algo diferente",
    "alguna recomendacion",
    "recomiendame algo",
    "recomienda algo",
    "sorprendeme",
    "no se",
    "dame opciones",
    "mas opciones",
    "mostrar mas",
    "mas lugares",
  ];
  return phrases.some((phrase) => q.includes(phrase));
}

function getDiverseRecommendations(places: Place[], limit = 4) {
  const seenCategories = new Set<string>();
  const seenRegions = new Set<string>();
  const ranked = [...places].sort((a, b) => Number(b.aggregated_rating ?? 0) - Number(a.aggregated_rating ?? 0));
  const diverse: Place[] = [];

  for (const place of ranked) {
    const category = place.place_categories?.slug ?? "";
    const region = place.regions?.slug ?? "";
    if (diverse.length < limit && (!seenCategories.has(category) || !seenRegions.has(region))) {
      diverse.push(place);
      if (category) seenCategories.add(category);
      if (region) seenRegions.add(region);
    }
  }

  for (const place of ranked) {
    if (diverse.length >= limit) break;
    if (!diverse.some((item) => item.slug === place.slug)) diverse.push(place);
  }

  return diverse;
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

function isIslandWaypoint(waypoint: RouteWaypoint) {
  const region = normalize(waypoint.regionSlug ?? "");
  return ISLAND_REGION_HINTS.some((hint) => region.includes(normalize(hint)));
}

async function buildSingleSegment(start: RouteWaypoint, end: RouteWaypoint) {
  try {
    const route = await fetchOsrmRoute([start.coordinates, end.coordinates]);
    return {
      segments: [{ coordinates: route.coordinates, approximate: false }],
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
    };
  } catch {
    const startIsIsland = isIslandWaypoint(start);
    const endIsIsland = isIslandWaypoint(end);
    if (startIsIsland === endIsIsland) {
      return {
        segments: [{ coordinates: [start.coordinates, end.coordinates], approximate: true }],
        distanceKm: distanceKm(start.coordinates, end.coordinates),
        durationMin: undefined,
      };
    }

    const landStart = startIsIsland ? LA_CEIBA_FERRY_PORT : start.coordinates;
    const landEnd = endIsIsland ? LA_CEIBA_FERRY_PORT : end.coordinates;
    const orderedSegments: RouteSegment[] = [];
    let landDistance = 0;
    let landDuration = 0;

    if (startIsIsland) {
      orderedSegments.push({ coordinates: [start.coordinates, LA_CEIBA_FERRY_PORT], approximate: true });
    }

    try {
      const landRoute = await fetchOsrmRoute([landStart, landEnd]);
      orderedSegments.push({ coordinates: landRoute.coordinates, approximate: false });
      landDistance = landRoute.distanceKm ?? 0;
      landDuration = landRoute.durationMin ?? 0;
    } catch {
      orderedSegments.push({ coordinates: [landStart, landEnd], approximate: true });
      landDistance = distanceKm(landStart, landEnd);
    }

    if (endIsIsland) {
      orderedSegments.push({ coordinates: [LA_CEIBA_FERRY_PORT, end.coordinates], approximate: true });
    }

    const seaDistance = startIsIsland
      ? distanceKm(start.coordinates, LA_CEIBA_FERRY_PORT)
      : endIsIsland
        ? distanceKm(LA_CEIBA_FERRY_PORT, end.coordinates)
        : 0;

    return {
      segments: orderedSegments.filter((segment) => segment.coordinates.length >= 2),
      distanceKm: landDistance + seaDistance,
      durationMin: landDuration ? landDuration + Math.round((seaDistance / 35) * 60) : undefined,
    };
  }
}

async function buildSegmentedRoute(waypoints: RouteWaypoint[]) {
  const segments = await Promise.all(
    waypoints.slice(0, -1).map(async (start, index) => {
      const end = waypoints[index + 1];
      return buildSingleSegment(start, end);
    })
  );
  const routeSegments = segments.flatMap((item) => item.segments);

  return {
    segments: routeSegments,
    coordinates: routeSegments.flatMap((segment, index) =>
      index === 0 ? segment.coordinates : segment.coordinates.slice(1)
    ),
    distanceKm: segments.reduce((sum, item) => sum + (item.distanceKm ?? 0), 0),
    durationMin: segments.some((item) => typeof item.durationMin !== "number")
      ? undefined
      : segments.reduce((sum, item) => sum + (item.durationMin ?? 0), 0),
    approximate: routeSegments.some((segment) => segment.approximate),
  };
}

function formatRouteMeta(meta: RouteMeta | null) {
  if (!meta) return "";
  const parts: string[] = [];
  parts.push(meta.mixed ? "Ruta mixta" : meta.approximate ? "Ruta aproximada" : "Ruta por carretera");
  if (typeof meta.distanceKm === "number") parts.push(`${Math.round(meta.distanceKm)} km`);
  if (typeof meta.durationMin === "number") {
    const hours = Math.floor(meta.durationMin / 60);
    const minutes = meta.durationMin % 60;
    parts.push(hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`);
  }
  return parts.join(" · ");
}

function formatRouteSegments(meta: RouteMeta | null) {
  if (!meta) return "";
  const parts: string[] = [];
  if (meta.roadSegments) parts.push(`${meta.roadSegments} tramo${meta.roadSegments === 1 ? "" : "s"} por carretera`);
  if (meta.approximateSegments) {
    parts.push(`${meta.approximateSegments} tramo${meta.approximateSegments === 1 ? "" : "s"} aproximado${meta.approximateSegments === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

function normalizeCategorySlug(value: string) {
  const normalized = normalize(value);
  if (normalized.includes("patrimonio") || normalized.includes("heritage")) return "heritage";
  if (normalized.includes("naturaleza") || normalized.includes("nature")) return "nature";
  if (normalized.includes("aventura") || normalized.includes("adventure")) return "adventure";
  if (normalized.includes("gastronomia") || normalized.includes("food")) return "food";
  if (normalized.includes("religioso") || normalized.includes("religion")) return "religion";
  if (normalized.includes("playa") || normalized.includes("beach")) return "beach";
  if (normalized.includes("arte") || normalized.includes("museo")) return "arts";
  return "";
}

function normalizeRegionSlug(value: string) {
  const normalized = normalize(value);
  const regionMap: Record<string, string> = {
    copan: "copan",
    ruinas: "copan",
    "islas de la bahia": "islas-de-la-bahia",
    roatan: "islas-de-la-bahia",
    "bay islands": "islas-de-la-bahia",
    comayagua: "comayagua",
    catedral: "comayagua",
    "francisco morazan": "francisco-morazan",
    tegucigalpa: "francisco-morazan",
    cortes: "cortes",
    "la ceiba": "cortes",
    honduras: "",
  };
  for (const [keyword, slug] of Object.entries(regionMap)) {
    if (normalized.includes(keyword)) return slug;
  }
  return "";
}

function getCategoryLabel(categories: Category[], slug: string) {
  const category = categories.find((item) => item.slug === slug);
  return getEs(category?.name_i18n, slug);
}

function cleanNaturalSearchQuery(value: string, categorySlug = "") {
  const normalized = normalize(value);
  if (!normalized) return "";

  const inferredCategory = categorySlug || normalizeCategorySlug(value);
  const inferredRegion = normalizeRegionSlug(value);
  const regionWords = new Set([
    "copan",
    "ruinas",
    "islas",
    "bahia",
    "roatan",
    "comayagua",
    "catedral",
    "francisco",
    "morazan",
    "tegucigalpa",
    "cortes",
    "ceiba",
  ]);

  if (inferredCategory) {
    const categoryWords = new Set([
      ...normalize(inferredCategory).split(" "),
      ...normalize(inferredCategory.replace(/-/g, " ")).split(" "),
      "playa",
      "playas",
      "beach",
      "naturaleza",
      "nature",
      "patrimonio",
      "cultural",
      "gastronomia",
      "comida",
      "aventura",
      "religioso",
      "religion",
      "arte",
      "museo",
      "museos",
    ]);
    const fillerWords = new Set([
      "tienes",
      "tiene",
      "hay",
      "alguna",
      "algun",
      "otra",
      "otro",
      "opcion",
      "opciones",
      "bonita",
      "bonito",
      "linda",
      "lindo",
      "hermosa",
      "hermoso",
      "buena",
      "buen",
      "recomienda",
      "recomendame",
      "busco",
      "quiero",
      "para",
      "visitar",
      "conocer",
      "destino",
      "destinos",
      "lugar",
      "lugares",
      "una",
      "un",
      "de",
      "del",
      "la",
      "el",
      "en",
      "por",
      "favor",
    ]);
    const meaningful = normalized
      .split(" ")
      .filter((token) => token.length > 2 && !categoryWords.has(token) && !fillerWords.has(token) && !regionWords.has(token));
    if (meaningful.length === 0) return "";
  }

  return value.trim();
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
  initialCategory = "",
  initialPlace = "",
  initialRouteSlug = "",
  initialRouteName = "",
}: {
  places: Place[];
  categories: Category[];
  isGuest: boolean;
  userId: string | null;
  initialCategory?: string;
  initialPlace?: string;
  initialRouteSlug?: string;
  initialRouteName?: string;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  // Build AI initial message from category slug → category name
  const initialAiMessage = useMemo(() => {
    if (!initialCategory) return undefined;
    const cat = categories.find(c => c.slug === initialCategory);
    const name = cat ? (cat.name_i18n as Record<string, string>)?.es ?? initialCategory : initialCategory;
    return `Muéstrame lugares de ${name}`;
  }, [initialCategory, categories]);

  // Auto-select place from URL param (coming from /places "Ver en mapa")
  useEffect(() => {
    if (!initialPlace || !places.length) return;
    const found = places.find(p => p.slug === initialPlace);
    if (found) {
      setSelectedPlaceSlug(found.slug);
      if (typeof found.lng === "number" && typeof found.lat === "number") {
        setMapCenter([found.lng, found.lat]);
        setMapZoom(14);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlace, places.length]);

  // Auto-add to route from URL param (coming from /places "Agregar a ruta")
  useEffect(() => {
    if (!initialRouteSlug) return;
    const routeName = initialRouteName || initialRouteSlug;
    setActiveRoute(prev => {
      if (prev?.stops.some(s => s.slug === initialRouteSlug)) return prev;
      const stops = [...(prev?.stops ?? []), {
        order: (prev?.stops.length ?? 0) + 1,
        slug: initialRouteSlug,
        name: routeName,
      }];
      return { title: prev?.title ?? "Mi ruta", stops };
    });
    setRoutePanelExpanded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRouteSlug]);
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
  const [routeSaved, setRouteSaved] = useState<"idle" | "saving" | "done">("idle");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const routeStorageKey = `${ROUTE_KEY_PREFIX}:${isGuest ? "guest" : userId ?? "anon"}`;
  const isRecommendationQuery = useMemo(() => isRecommendationIntent(query), [query]);
  const queryCategorySlug = useMemo(() => normalizeCategorySlug(query), [query]);
  const queryRegionSlug = useMemo(() => normalizeRegionSlug(query), [query]);
  const semanticQuery = useMemo(() => cleanNaturalSearchQuery(query, queryCategorySlug), [query, queryCategorySlug]);

  useEffect(() => {
    if (queryRegionSlug && !activeRegion) {
      setActiveRegion(queryRegionSlug);
    }
  }, [queryRegionSlug, activeRegion]);

  const filteredPlaces = useMemo(() => {
    const q = isRecommendationQuery ? "" : normalize(semanticQuery);
    const terms = expandSynonyms(q);
    const effectiveCategory = activeCategory || queryCategorySlug;
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
      const strictMatch = !q || isStrictlyRelevant(place, semanticQuery);
      const matchesCategory = !effectiveCategory || place.place_categories?.slug === effectiveCategory;
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
  }, [places, semanticQuery, isRecommendationQuery, activeCategory, queryCategorySlug, activeRegion, minRating, savedOnly, savedSlugs, userLocation]);

  const visibleSlugs = useMemo(() => new Set(filteredPlaces.map((item) => item.slug)), [filteredPlaces]);
  const selectedPlace = useMemo(
    () => places.find((item) => item.slug === selectedPlaceSlug) ?? null,
    [places, selectedPlaceSlug]
  );
  const searchSuggestions = useMemo(() => {
    const q = normalize(semanticQuery);
    if (isRecommendationQuery) return [];
    if (queryCategorySlug && !q) return filteredPlaces.slice(0, 7);
    if (q.length < 1) return [];
    const minimumScore = q.length >= 5 ? 32 : 20;
    return places
      .map((place) => ({ place, score: scorePlace(place, semanticQuery) }))
      .filter((item) => item.score >= minimumScore && isStrictlyRelevant(item.place, semanticQuery))
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
      .map((item) => item.place);
  }, [places, semanticQuery, isRecommendationQuery, queryCategorySlug, filteredPlaces]);

  const categorySuggestions = useMemo(() => {
    const q = normalize(query);
    if (isRecommendationQuery) return [];
    if (!q) return [];
    return categories
      .filter((cat) => normalize(getEs(cat.name_i18n, cat.slug)).includes(q))
      .slice(0, 4);
  }, [categories, query, isRecommendationQuery]);

  const regionSuggestions = useMemo(() => {
    const q = normalize(query);
    if (isRecommendationQuery) return [] as Array<{ slug: string; label: string }>;
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
  }, [places, query, isRecommendationQuery]);
  const recentSearchMatches = useMemo(() => {
    const q = normalize(query);
    if (isRecommendationQuery) return [];
    if (!q) return [];
    return recentSearches.filter((item) => normalize(item).includes(q)).slice(0, 4);
  }, [isRecommendationQuery, query, recentSearches]);
  const hasSearchResults =
    recentSearchMatches.length > 0 ||
    searchSuggestions.length > 0 ||
    categorySuggestions.length > 0 ||
    regionSuggestions.length > 0;
  const searchIntent = useMemo<SearchIntent>(() => {
    if (!query.trim()) return "idle";
    if (isRecommendationQuery) return "recommendation_intent";
    return hasSearchResults ? "literal_search" : "invalid_search";
  }, [hasSearchResults, isRecommendationQuery, query]);
  const recommendedPlaces = useMemo(() => getDiverseRecommendations(places, 4), [places]);

  const uiMode = useMemo<"idle" | "searching" | "filters" | "placeSelected">(() => {
    if (selectedPlace) return "placeSelected";
    if (showFilters) return "filters";
    if (query.trim().length > 0) return "searching";
    return "idle";
  }, [selectedPlace, showFilters, query]);

  const shouldShowSuggestionsPanel = uiMode === "searching" && searchIntent === "literal_search";
  const shouldShowRecommendationsPanel = uiMode === "searching" && searchIntent === "recommendation_intent";
  const shouldShowEmptySearchPanel = uiMode === "searching" && searchIntent === "invalid_search";
  const hasActiveRoute = Boolean(activeRoute?.stops.length);
  const shouldCompactRoutePanel = hasActiveRoute && Boolean(selectedPlace) && !routePanelExpanded;
  const shouldShowFullRoutePanel = hasActiveRoute && (!selectedPlace || routePanelExpanded);
  const routeMetaLabel = formatRouteMeta(routeMeta);
  const routeSegmentsLabel = formatRouteSegments(routeMeta);
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
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (searchIntent === "literal_search" && semanticQuery.trim()) chips.push({ key: "query", label: `Búsqueda: ${semanticQuery.trim()}` });
    const effectiveCategory = activeCategory || queryCategorySlug;
    if (effectiveCategory) {
      chips.push({ key: "category", label: getCategoryLabel(categories, effectiveCategory) });
    }
    if (activeRegion) {
      const region = regionFilterOptions.find((item) => item.slug === activeRegion);
      chips.push({ key: "region", label: region?.label ?? activeRegion });
    }
    if (minRating) chips.push({ key: "rating", label: `${minRating}+ estrellas` });
    if (savedOnly) chips.push({ key: "saved", label: "Guardados" });
    if (userLocation) chips.push({ key: "nearby", label: "Cerca de mí" });
    return chips;
  }, [activeCategory, activeRegion, categories, minRating, queryCategorySlug, regionFilterOptions, savedOnly, searchIntent, semanticQuery, userLocation]);

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

    const routePlaces =
      activeRoute?.stops
        .map((stop) => places.find((place) => place.slug === stop.slug))
        .filter((place): place is Place => Boolean(place)) ?? [];
    const waypoints = routePlaces
      .map<RouteWaypoint | null>((place) =>
        typeof place.lng === "number" && typeof place.lat === "number"
          ? { coordinates: [place.lng, place.lat], regionSlug: place.regions?.slug }
          : null
      )
      .filter((value): value is RouteWaypoint => Boolean(value));
    const coords = waypoints.map((waypoint) => waypoint.coordinates);

    if (coords.length < 2) {
      setRouteGeometry(null);
      setRouteSegments(null);
      setRouteMeta(null);
      return () => {
        cancelled = true;
      };
    }

    buildSegmentedRoute(waypoints)
      .then((route) => {
        if (cancelled) return;
        setRouteGeometry(route.coordinates);
        setRouteSegments(route.segments);
        setRouteMeta({
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
          approximate: route.approximate,
          mixed: route.approximate && route.segments.some((segment) => !segment.approximate),
          roadSegments: route.segments.filter((segment) => !segment.approximate).length,
          approximateSegments: route.segments.filter((segment) => segment.approximate).length,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setRouteGeometry(coords);
        setRouteSegments([{ coordinates: coords, approximate: true }]);
        setRouteMeta({ approximate: true, approximateSegments: 1 });
      });

    return () => {
      cancelled = true;
    };
  }, [activeRoute, places]);


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
    setShowFilters(false);
  }

  const REGION_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
    "comayagua":         { center: [-87.637, 14.456], zoom: 13 },
    "copan":             { center: [-89.14,  14.84],  zoom: 13 },
    "bay-islands":       { center: [-86.55,  16.3],   zoom: 12 },
    "islas-de-la-bahia": { center: [-86.55,  16.3],   zoom: 12 },
    "tegucigalpa":       { center: [-87.192, 14.072], zoom: 13 },
    "francisco-morazan": { center: [-87.192, 14.072], zoom: 13 },
    "cortes":            { center: [-88.024, 15.506], zoom: 13 },
    "la-ceiba":          { center: [-86.793, 15.781], zoom: 13 },
    "atlantida":         { center: [-86.793, 15.781], zoom: 12 },
    "olancho":           { center: [-85.76,  14.87],  zoom: 11 },
    "santa-barbara":     { center: [-88.234, 14.917], zoom: 12 },
    "choluteca":         { center: [-87.196, 13.3],   zoom: 12 },
    "lempira":           { center: [-88.567, 14.467], zoom: 12 },
    "intibuca":          { center: [-88.166, 14.316], zoom: 12 },
    "ocotepeque":        { center: [-89.183, 14.433], zoom: 12 },
    "yoro":              { center: [-87.133, 15.133], zoom: 12 },
    "el-paraiso":        { center: [-86.583, 13.867], zoom: 12 },
    "colon":             { center: [-85.9,   15.9],   zoom: 11 },
  };

  const handleAiActions = useCallback((chunk: UIActionsChunk) => {
    for (const action of chunk.actions ?? []) {
      if (action.type === "filter_region" && action.slug) {
        setActiveRegion(action.slug);
        setQuery("");
        setActiveCategory("");
        setSelectedPlaceSlug(null);
        const regionView = REGION_CENTERS[action.slug];
        if (regionView) {
          setMapCenter(regionView.center);
          setMapZoom(regionView.zoom);
        }
      }
      if (action.type === "filter_category" && action.slug) {
        setActiveCategory(action.slug as string);
        setQuery("");
        setSelectedPlaceSlug(null);
      }

      if (action.type === "show_place" && action.slug) {
        const slug = action.slug as string;
        console.log("[AI] show_place slug recibido:", slug, "| places disponibles:", places.map(p => p.slug));
        const place = places.find(p => p.slug === slug)
          ?? places.find(p => p.slug.includes(slug) || slug.includes(p.slug));
        console.log("[AI] place encontrado:", place?.slug ?? "NINGUNO");
        if (place) {
          setSelectedPlaceSlug(place.slug);
          setShowFilters(false);
          if (typeof place.lng === "number" && typeof place.lat === "number") {
            setMapCenter([place.lng, place.lat]);
            setMapZoom(14);
          }
        }
      }
      // Show multiple semantic results: fit all pins in view, open best match
      if (action.type === "show_places" && Array.isArray(action.slugs) && action.slugs.length > 0) {
        clearFilters();
        setShowFilters(false);

        const slugSet = new Set(action.slugs as string[]);
        const matched = places.filter(p =>
          slugSet.has(p.slug) &&
          typeof p.lng === "number" &&
          typeof p.lat === "number"
        );

        if (matched.length === 1) {
          // Single result → zoom directly to it
          setSelectedPlaceSlug(matched[0].slug);
          setMapCenter([matched[0].lng!, matched[0].lat!]);
          setMapZoom(14);
        } else if (matched.length > 1) {
          // Multiple results → open best match + fit bounding box
          setSelectedPlaceSlug(matched[0].slug);
          const lngs = matched.map(p => p.lng!);
          const lats = matched.map(p => p.lat!);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const centerLng = (minLng + maxLng) / 2;
          const centerLat = (minLat + maxLat) / 2;
          // Zoom based on bounding box spread
          const spread = Math.max(maxLng - minLng, maxLat - minLat);
          const zoom = spread < 0.05 ? 13 : spread < 0.5 ? 10 : spread < 2 ? 8 : 7;
          setMapCenter([centerLng, centerLat]);
          setMapZoom(zoom);
        }
      }
      if (action.type === "clear") {
        clearFilters();
        setMapCenter([-86.8, 15.2]);
        setMapZoom(6.5);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  // Listen for global itinera:ui-actions events (emitted by chat cards, etc.)
  useEffect(() => {
    function onGlobalAction(e: Event) {
      handleAiActions((e as CustomEvent).detail as UIActionsChunk);
    }
    window.addEventListener("itinera:ui-actions", onGlobalAction);
    return () => window.removeEventListener("itinera:ui-actions", onGlobalAction);
  }, [handleAiActions]);

  function applyNearby() {
    if (!navigator.geolocation) return;
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
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  function removeActiveChip(key: string) {
    if (key === "query") setQuery("");
    if (key === "category") {
      setActiveCategory("");
      if (queryCategorySlug) setQuery("");
    }
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
              const first =
                searchIntent === "recommendation_intent"
                  ? recommendedPlaces[0]
                  : searchIntent === "literal_search"
                    ? searchSuggestions[0] ?? filteredPlaces[0]
                    : null;
              if (first) selectPlaceFromSearch(first);
            }}
            onTrailingClick={() => setShowFilters((prev) => !prev)}
            suggestions={["Buscar destinos...", "Buscar por categoría...", "Buscar por región..."]}
            effect="fade"
          />


          {activeChips.length > 0 && uiMode !== "placeSelected" ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <button
                  key={`${chip.key}-${chip.label}`}
                  type="button"
                  onClick={() => removeActiveChip(chip.key)}
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
                {recentSearchMatches.length > 0 ? (
                  <>
                    <div className="px-2 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
                      Recientes
                    </div>
                    <div className="mb-2 space-y-1">
                      {recentSearchMatches.map((item) => (
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
                            setActiveRegion(region.slug);
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
          ) : null}

          {shouldShowRecommendationsPanel ? (
            <div className="mt-2 overflow-hidden rounded-2xl border border-[#D9E5E2] bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.16)] backdrop-blur-md">
              <div className="p-3">
                <div className="flex items-start justify-between gap-3 px-1 pb-2">
                  <div>
                    <p className="font-jakarta text-sm font-bold text-[#0F172A]">Opciones recomendadas</p>
                    <p className="mt-0.5 font-inter text-xs text-[#64748B]">No lo tomé como búsqueda literal; aquí tienes alternativas reales.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="rounded-full border border-[#D9E5E2] px-3 py-1.5 font-inter text-xs font-bold text-[#0F766E] transition-colors hover:bg-[#F0FDFA]"
                  >
                    Limpiar
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {recommendedPlaces.map((place) => {
                    const category = place.place_categories;
                    const color = getCategoryColor({
                      slug: category?.slug ?? "",
                      iconName: category?.icon_name ?? "",
                      label: category?.name_i18n?.es ?? category?.name_i18n?.en ?? "",
                    });
                    return (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => selectPlaceFromSearch(place)}
                        className="flex min-w-0 items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[#F8FAFC]"
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                          style={{ backgroundColor: color }}
                        >
                          <MapPin className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-jakarta text-sm font-bold text-[#0F172A]">
                            {getEs(place.name_i18n, place.slug)}
                          </span>
                          <span className="block truncate font-inter text-xs text-[#64748B]">
                            {getEs(category?.name_i18n, "Lugar")} - {getEs(place.regions?.name_i18n, "Honduras")}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 flex flex-wrap gap-2 border-t border-[#E2E8F0] px-1 pt-3">
                  {[
                    { label: "Patrimonio", slug: "patrimonio-cultural" },
                    { label: "Naturaleza", slug: "naturaleza" },
                    { label: "Playas", slug: "playa" },
                  ].map((item) => (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setActiveCategory(item.slug);
                      }}
                      className="rounded-full border border-[#D9E5E2] bg-white px-3 py-1.5 font-inter text-xs font-bold text-[#0F766E] transition-colors hover:bg-[#F0FDFA]"
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={applyNearby}
                    className="rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-3 py-1.5 font-inter text-xs font-bold text-[#0F766E]"
                  >
                    Cerca de mí
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {shouldShowEmptySearchPanel ? (
            <div className="mt-2 rounded-2xl border border-[#D9E5E2] bg-white/95 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-md">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0FDFA] text-[#0D9488]">
                  <Search className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-jakarta text-sm font-bold text-[#0F172A]">No encontré ese destino</p>
                  <p className="mt-1 font-inter text-sm text-[#64748B]">
                    Puedo mostrarte opciones reales disponibles.
                    {hasActiveRoute ? " Tu ruta sigue activa en el mapa." : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setQuery("otra opción")}
                      className="rounded-full bg-[#0D9488] px-3 py-1.5 font-inter text-xs font-bold text-white transition-colors hover:bg-[#0F766E]"
                    >
                      Ver recomendados
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setShowFilters(true);
                      }}
                      className="rounded-full border border-[#D9E5E2] px-3 py-1.5 font-inter text-xs font-bold text-[#0F766E] transition-colors hover:bg-[#F0FDFA]"
                    >
                      Explorar categorías
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="rounded-full border border-[#E2E8F0] px-3 py-1.5 font-inter text-xs font-bold text-[#475569] transition-colors hover:bg-[#F8FAFC]"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {uiMode === "filters" ? (
            <div className="mt-2 space-y-3 rounded-2xl border border-[#D9E5E2] bg-white/95 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.14)] backdrop-blur-sm transition-all duration-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]">Filtros</p>
                  <p className="mt-0.5 font-inter text-xs text-[#64748B]">Ajusta lo visible en el mapa.</p>
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full border border-[#D9E5E2] px-3 py-1.5 font-inter text-xs font-bold text-[#0F766E] transition-colors hover:bg-[#F0FDFA]"
                >
                  Limpiar todo
                </button>
              </div>

              <div className="space-y-2">
                <p className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Categoría</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("")}
                    className="rounded-full border px-3 py-1.5 font-inter text-xs font-semibold transition-colors"
                    style={{
                      borderColor: activeCategory ? "#E2E8F0" : "#0D9488",
                      color: activeCategory ? "#475569" : "#0F766E",
                      backgroundColor: activeCategory ? "white" : "rgba(13,148,136,0.08)",
                    }}
                  >
                    Todas
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.slug)}
                      className="rounded-full border px-3 py-1.5 font-inter text-xs font-semibold transition-colors"
                      style={{
                        borderColor: activeCategory === cat.slug ? "#0D9488" : "#E2E8F0",
                        color: activeCategory === cat.slug ? "#0F766E" : "#475569",
                        backgroundColor: activeCategory === cat.slug ? "rgba(13,148,136,0.08)" : "white",
                      }}
                    >
                      {getEs(cat.name_i18n, cat.slug)}
                    </button>
                  ))}
                </div>
              </div>

              {regionFilterOptions.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Región</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveRegion("")}
                      className="rounded-full border px-3 py-1.5 font-inter text-xs font-semibold transition-colors"
                      style={{
                        borderColor: activeRegion ? "#E2E8F0" : "#0D9488",
                        color: activeRegion ? "#475569" : "#0F766E",
                        backgroundColor: activeRegion ? "white" : "rgba(13,148,136,0.08)",
                      }}
                    >
                      Todas
                    </button>
                    {regionFilterOptions.map((region) => (
                      <button
                        key={region.slug}
                        type="button"
                        onClick={() => {
                          setActiveRegion(region.slug);
                        }}
                        className="rounded-full border px-3 py-1.5 font-inter text-xs font-semibold transition-colors"
                        style={{
                          borderColor: activeRegion === region.slug ? "#0D9488" : "#E2E8F0",
                          color: activeRegion === region.slug ? "#0F766E" : "#475569",
                          backgroundColor: activeRegion === region.slug ? "rgba(13,148,136,0.08)" : "white",
                        }}
                      >
                        {region.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Preferencias</p>
                <div className="flex flex-wrap gap-2">
                  {[4, 4.5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => {
                        setMinRating(rating);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-inter text-xs font-semibold transition-colors"
                      style={{
                        borderColor: minRating === rating ? "#F59E0B" : "#FDE68A",
                        backgroundColor: minRating === rating ? "#FEF3C7" : "#FFFBEB",
                        color: "#92400E",
                      }}
                    >
                      <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                      {rating}+
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSavedOnly(!savedOnly);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-inter text-xs font-semibold transition-colors"
                    style={{
                      borderColor: savedOnly ? "#0D9488" : "#E2E8F0",
                      backgroundColor: savedOnly ? "rgba(13,148,136,0.08)" : "white",
                      color: savedOnly ? "#0F766E" : "#475569",
                    }}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    Guardados
                  </button>
                  <button
                    type="button"
                    onClick={applyNearby}
                    className="inline-flex items-center gap-1 rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-3 py-1.5 font-inter text-xs font-semibold text-[#0F766E]"
                  >
                    <Locate className="h-3.5 w-3.5" />
                    Cerca de mí
                  </button>
                </div>
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
              {routeSegmentsLabel ? (
                <p className="mt-0.5 truncate text-[11px] font-medium text-[#0F766E]">{routeSegmentsLabel}</p>
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
              <div className="mb-2 rounded-xl bg-[#F8FAFC] px-2.5 py-1.5">
                <p className="text-xs font-semibold text-[#64748B]">{routeMetaLabel}</p>
                {routeSegmentsLabel ? <p className="mt-0.5 text-[11px] font-medium text-[#0F766E]">{routeSegmentsLabel}</p> : null}
              </div>
            ) : null}

            {/* Save route button */}
            {!isGuest && userId && (
              <button
                type="button"
                disabled={routeSaved !== "idle"}
                onClick={async () => {
                  if (!activeRoute || routeSaved !== "idle") return;
                  setRouteSaved("saving");
                  const res = await saveRoute(activeRoute.title, activeRoute.stops);
                  setRouteSaved(res.error ? "idle" : "done");
                  if (res.id) setTimeout(() => setRouteSaved("idle"), 3000);
                }}
                className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all"
                style={
                  routeSaved === "done"
                    ? { backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#16A34A" }
                    : { backgroundColor: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.25)", color: "#0D9488" }
                }
              >
                {routeSaved === "saving" ? (
                  <><Save className="h-3.5 w-3.5 animate-pulse" />Guardando...</>
                ) : routeSaved === "done" ? (
                  <><Check className="h-3.5 w-3.5" />¡Ruta guardada!</>
                ) : (
                  <><Save className="h-3.5 w-3.5" />Guardar ruta</>
                )}
              </button>
            )}

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

      <FloatingAiAssistant
        storageKey="itinera-ai-explore"
        onUIActions={handleAiActions}
        initialMessage={initialAiMessage}
      />
    </section>
  );
}
