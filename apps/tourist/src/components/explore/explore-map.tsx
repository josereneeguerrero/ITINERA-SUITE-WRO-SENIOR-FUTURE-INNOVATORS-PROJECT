"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Bookmark, Eye, Navigation, Star, X } from "lucide-react";
import { getCategoryColor } from "@/lib/category-theme";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Place {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  description_i18n?: Record<string, string>;
  ai_summary_i18n?: Record<string, string>;
  aggregated_rating: number;
  review_count: number;
  price_level?: number;
  accessibility?: boolean;
  local_favorite?: boolean;
  lat?: number | null;
  lng?: number | null;
  place_categories: { name_i18n: Record<string, string>; icon_name: string; slug?: string } | null;
  regions: { name_i18n: Record<string, string> } | null;
}

type UserLocation = { lng: number; lat: number; accuracy?: number };
type RouteMeta    = { distanceKm?: number; durationMin?: number; approximate?: boolean };
type RouteSegment = { coordinates: [number, number][]; approximate: boolean };
type RouteFeedback = { kind: "added" | "exists"; placeSlug: string; message: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const HONDURAS_CENTER: [number, number] = [-86.8, 15.2];
const HONDURAS_ZOOM = 6.5;

const ICON_MAP: Record<string, string> = {
  landmark: "L",
  leaf: "N",
  utensils: "G",
  waves: "P",
  zap: "A",
  church: "R",
};

const PLACES_SOURCE  = "itinera-places-source";
const PINS_LAYER     = "itinera-places-pins";
const SEL_LAYER      = "itinera-places-selected";

// ── Pin image generation ──────────────────────────────────────────────────────
// Creates a 48×48 canvas with a colored circle, white letter, and optional
// gold border (selected state). Used to register custom icons in MapLibre.

const PIN_SIZE = 48;

function createPinCanvas(color: string, letter: string, selected: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width  = PIN_SIZE;
  canvas.height = PIN_SIZE;
  const ctx = canvas.getContext("2d")!;
  const cx = PIN_SIZE / 2;
  const cy = PIN_SIZE / 2;
  const r  = PIN_SIZE / 2 - 3;

  // Drop shadow
  ctx.shadowColor  = "rgba(0,0,0,0.28)";
  ctx.shadowBlur   = 5;
  ctx.shadowOffsetY = 2;

  // Fill
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Clear shadow before border/text
  ctx.shadowColor = "transparent";

  // Border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = selected ? "#F59E0B" : "#ffffff";
  ctx.lineWidth   = selected ? 3.5 : 2.5;
  ctx.stroke();

  // Letter
  const fontSize = Math.round(PIN_SIZE * 0.36);
  ctx.fillStyle    = "#ffffff";
  ctx.font         = `700 ${fontSize}px -apple-system, Inter, Arial, sans-serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, cx, cy + 0.5);

  return canvas;
}

function pinImageId(categorySlug: string, selected: boolean) {
  return `itinera-pin-${selected ? "sel-" : ""}${categorySlug || "default"}`;
}

// ── GeoJSON builder ───────────────────────────────────────────────────────────

function placeSortKey(place: Place): number {
  // Lower = higher placement priority (placed first, wins collisions)
  const rating = Number(place.aggregated_rating ?? 0);
  const tier   = place.local_favorite || rating >= 4.5 ? 1
               : rating >= 3.5 ? 2 : 3;
  // tier 1 high-rating → small number (high priority)
  return tier * 1000 - Math.round(rating * 100);
}

function buildGeoJSON(
  places: Place[],
  selectedSlug: string | null | undefined
) {
  return {
    type: "FeatureCollection" as const,
    features: places
      .filter(p => typeof p.lng === "number" && typeof p.lat === "number")
      .map(place => {
        const cat     = place.place_categories;
        const catSlug = cat?.slug ?? "default";
        const color   = getCategoryColor({
          slug: catSlug,
          iconName: cat?.icon_name ?? "",
          label: cat?.name_i18n?.es ?? cat?.name_i18n?.en ?? "",
        });
        const letter = ICON_MAP[cat?.icon_name ?? ""] ?? "M";
        const isSel  = place.slug === selectedSlug;
        return {
          type:     "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [place.lng!, place.lat!] },
          properties: {
            slug:       place.slug,
            name:       place.name_i18n?.es ?? place.slug,
            catName:    cat?.name_i18n?.es ?? "",
            rating:     Number(place.aggregated_rating ?? 0).toFixed(1),
            icon:       letter,
            color,
            iconId:     pinImageId(catSlug, false),
            iconSelId:  pinImageId(catSlug, true),
            isSelected: isSel ? 1 : 0,
            sortKey:    placeSortKey(place),
          },
        };
      }),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toRad(v: number) { return (v * Math.PI) / 180; }

function distanceKm(from: [number, number], to: [number, number]) {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDistance(v: number) {
  return v < 1 ? `${Math.round(v*1000)} m` : `${v.toFixed(1)} km`;
}

function makeAccuracyCircle(center: [number, number], radiusMeters: number) {
  const [lng, lat] = center;
  const pts: [number, number][] = [];
  const er = 6371000;
  const lr = toRad(lat);
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    pts.push([
      lng + (radiusMeters * Math.cos(angle) / (er * Math.cos(lr))) * (180 / Math.PI),
      lat + (radiusMeters * Math.sin(angle) / er) * (180 / Math.PI),
    ]);
  }
  return pts;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExploreMap({
  places,
  visibleSlugs,
  selectedPlace,
  mapCenter,
  mapZoom,
  isSaved = false,
  routeStops = [],
  routeGeometry,
  routeSegments,
  routeMeta,
  routeStopSlugs = [],
  routeFeedback,
  userLocation,
  recommendationReason,
  onSelectPlace,
  onToggleSave,
  onAddToRoute,
}: {
  places: Place[];
  visibleSlugs?: Set<string>;
  selectedPlace: Place | null;
  mapCenter?: [number, number] | null;
  mapZoom?: number | null;
  isSaved?: boolean;
  routeStops?: Array<{ slug: string }>;
  routeGeometry?: [number, number][] | null;
  routeSegments?: RouteSegment[] | null;
  routeMeta?: RouteMeta | null;
  routeStopSlugs?: string[];
  routeFeedback?: RouteFeedback | null;
  userLocation?: UserLocation | null;
  recommendationReason?: string | null;
  onSelectPlace: (place: Place | null) => void;
  onToggleSave?: (place: Place) => void;
  onAddToRoute?: (place: Place) => void;
}) {
  const mapContainer     = useRef<HTMLDivElement>(null);
  const map              = useRef<maplibregl.Map | null>(null);
  const tooltipRef       = useRef<maplibregl.Popup | null>(null);
  const suppressClickRef = useRef(0);
  const selectedPlaceRef = useRef<Place | null>(null);
  const placesRef        = useRef<Place[]>(places);
  const onSelectRef      = useRef(onSelectPlace);
  const addedImages      = useRef<Set<string>>(new Set());

  const [mapReady, setMapReady]                   = useState(false);
  const [cardVisible, setCardVisible]             = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => { selectedPlaceRef.current = selectedPlace; }, [selectedPlace]);
  useEffect(() => { placesRef.current = places; },             [places]);
  useEffect(() => { onSelectRef.current = onSelectPlace; },    [onSelectPlace]);

  // ── fitAllPlaces ─────────────────────────────────────────────────────────────
  const fitAllPlaces = useCallback((duration = 700) => {
    if (!map.current) return;
    const coords = places
      .filter(p => typeof p.lng === "number" && typeof p.lat === "number")
      .map(p => [p.lng!, p.lat!] as [number, number]);

    if (coords.length >= 2) {
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.current.fitBounds(bounds, {
        padding: { top: 140, right: 80, left: 80, bottom: 170 },
        maxZoom: 8.6,
        duration,
      });
    } else {
      map.current.flyTo({ center: HONDURAS_CENTER, zoom: HONDURAS_ZOOM, duration });
    }
  }, [places]);

  function closeSelectedPlace() {
    setCardVisible(false);
    window.setTimeout(() => {
      onSelectPlace(null);
      fitAllPlaces(720);
    }, 120);
  }

  // ── Map init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: HONDURAS_CENTER,
      zoom: HONDURAS_ZOOM,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), "top-left");
    map.current.on("load", () => setMapReady(true));
    map.current.on("click", () => {
      if (Date.now() < suppressClickRef.current) return;
      tooltipRef.current?.remove();
      tooltipRef.current = null;
      if (selectedPlaceRef.current) closeSelectedPlace();
    });

    return () => {
      setMapReady(false);
      map.current?.remove();
      map.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Symbol layers init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const m = map.current;

    // Empty source — data injected by the sync effect below
    m.addSource(PLACES_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    // All non-selected places — GPU handles collision detection
    m.addLayer({
      id: PINS_LAYER,
      type: "symbol",
      source: PLACES_SOURCE,
      minzoom: 9,
      filter: ["==", ["get", "isSelected"], 0],
      layout: {
        "icon-image":             ["get", "iconId"],
        "icon-size":              ["interpolate", ["linear"], ["zoom"], 9, 0.5, 13, 0.85, 17, 1.1],
        "icon-allow-overlap":     false,
        "icon-ignore-placement":  false,
        "symbol-sort-key":        ["get", "sortKey"],
      },
      paint: {
        // Fade in as pins appear — no abrupt toggle
        "icon-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0, 9.8, 1],
      },
    });

    // Selected place — always on top, always visible
    m.addLayer({
      id: SEL_LAYER,
      type: "symbol",
      source: PLACES_SOURCE,
      filter: ["==", ["get", "isSelected"], 1],
      layout: {
        "icon-image":            ["get", "iconSelId"],
        "icon-size":             ["interpolate", ["linear"], ["zoom"], 9, 0.5, 13, 0.85, 17, 1.1],
        "icon-allow-overlap":    true,
        "icon-ignore-placement": true,
      },
    });

    // ── Click ──────────────────────────────────────────────────────────────────
    const handleClick = (
      e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }
    ) => {
      suppressClickRef.current = Date.now() + 400;
      tooltipRef.current?.remove();
      tooltipRef.current = null;
      const slug = e.features?.[0]?.properties?.slug as string | undefined;
      if (!slug) return;
      const place = placesRef.current.find(p => p.slug === slug);
      if (!place) return;
      onSelectRef.current(place);
      setCardVisible(true);
      const coords: [number, number] = [place.lng!, place.lat!];
      window.setTimeout(() => {
        m.flyTo({ center: coords, zoom: Math.max(m.getZoom(), 13), offset: [180, 12], duration: 760 });
      }, 140);
    };

    // ── Hover tooltip ──────────────────────────────────────────────────────────
    const handleEnter = (
      e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }
    ) => {
      m.getCanvas().style.cursor = "pointer";
      if (!e.features?.length) return;
      const p = e.features[0].properties ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const coords = (e.features[0].geometry as any).coordinates as [number, number];
      tooltipRef.current?.remove();
      tooltipRef.current = new maplibregl.Popup({
        offset: 26, closeButton: false, closeOnClick: false, anchor: "bottom",
        className: "itinera-tooltip",
      })
        .setLngLat(coords)
        .setHTML(`
          <div style="padding:10px 12px;font-family:Inter,sans-serif;min-width:150px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="font-size:14px;">${String(p.icon ?? "M")}</span>
              <span style="font-weight:700;font-size:13px;color:#0F172A;">${String(p.name ?? "")}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:11px;color:#0D9488;font-weight:600;">${String(p.catName ?? "")}</span>
              <span style="font-size:11px;color:#64748B;">⭐ ${String(p.rating ?? "")}</span>
            </div>
          </div>`)
        .addTo(m);
    };

    const handleLeave = () => {
      m.getCanvas().style.cursor = "";
      tooltipRef.current?.remove();
      tooltipRef.current = null;
    };

    for (const layer of [PINS_LAYER, SEL_LAYER]) {
      m.on("click",      layer, handleClick);
      m.on("mouseenter", layer, handleEnter);
      m.on("mouseleave", layer, handleLeave);
    }

    return () => {
      try {
        for (const layer of [PINS_LAYER, SEL_LAYER]) {
          m.off("click",      layer, handleClick);
          m.off("mouseenter", layer, handleEnter);
          m.off("mouseleave", layer, handleLeave);
          if (m.getLayer(layer)) m.removeLayer(layer);
        }
        if (m.getSource(PLACES_SOURCE)) m.removeSource(PLACES_SOURCE);
      } catch { /* map already destroyed */ }
    };
  }, [mapReady]);

  // ── Data sync: register icons + update GeoJSON ────────────────────────────────
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const m = map.current;

    // Register any pin image that hasn't been added yet
    places.forEach(place => {
      const cat     = place.place_categories;
      const catSlug = cat?.slug ?? "default";
      const color   = getCategoryColor({
        slug: catSlug,
        iconName: cat?.icon_name ?? "",
        label: cat?.name_i18n?.es ?? cat?.name_i18n?.en ?? "",
      });
      const letter = ICON_MAP[cat?.icon_name ?? ""] ?? "M";

      for (const selected of [false, true]) {
        const id = pinImageId(catSlug, selected);
        if (addedImages.current.has(id)) continue;
        const canvas = createPinCanvas(color, letter, selected);
        const ctx    = canvas.getContext("2d")!;
        const data   = ctx.getImageData(0, 0, PIN_SIZE, PIN_SIZE);
        m.addImage(id, { width: PIN_SIZE, height: PIN_SIZE, data: new Uint8Array(data.data.buffer) });
        addedImages.current.add(id);
      }
    });

    const source = m.getSource(PLACES_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    // Apply visibleSlugs dimming via filter on PINS_LAYER
    if (visibleSlugs) {
      const slugArr = Array.from(visibleSlugs);
      m.setFilter(PINS_LAYER, ["all",
        ["==", ["get", "isSelected"], 0],
        ["in", ["get", "slug"], ["literal", slugArr]],
      ]);
    } else {
      m.setFilter(PINS_LAYER, ["==", ["get", "isSelected"], 0]);
    }

    source.setData(buildGeoJSON(places, selectedPlace?.slug));
  }, [mapReady, places, selectedPlace, visibleSlugs]);

  // ── Fly to region ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current) return;
    if (!mapCenter) { fitAllPlaces(800); return; }
    map.current.flyTo({
      center: mapCenter,
      zoom: mapZoom ?? Math.max(map.current.getZoom(), 9),
      duration: 900,
    });
  }, [mapCenter, mapZoom, fitAllPlaces]);

  // ── Initial fit ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !mapReady) return;
    fitAllPlaces(0);
  }, [mapReady, fitAllPlaces]);

  // ── Route layers ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const sourceId = "itinera-route-source";
    const legacyLineId = "itinera-route-line";
    const solidLineId = "itinera-route-line-solid";
    const approximateLineId = "itinera-route-line-approximate";
    const pointId = "itinera-route-points";

    const coords = routeStops
      .map(s => places.find(p => p.slug === s.slug))
      .filter((p): p is Place => Boolean(p))
      .map(p => typeof p.lng === "number" && typeof p.lat === "number" ? [p.lng, p.lat] as [number, number] : null)
      .filter((c): c is [number, number] => Boolean(c));

    if (map.current.getLayer(legacyLineId))      map.current.removeLayer(legacyLineId);
    if (map.current.getLayer(solidLineId))       map.current.removeLayer(solidLineId);
    if (map.current.getLayer(approximateLineId)) map.current.removeLayer(approximateLineId);
    if (map.current.getLayer(pointId))           map.current.removeLayer(pointId);
    if (map.current.getSource(sourceId))         map.current.removeSource(sourceId);

    const lineCoords  = routeGeometry && routeGeometry.length >= 2 ? routeGeometry : coords;
    const lineSegments = routeSegments && routeSegments.length > 0
      ? routeSegments
      : [{ coordinates: lineCoords, approximate: Boolean(routeMeta?.approximate) }];

    if (coords.length < 2 || lineCoords.length < 2 || lineSegments.length < 1) return;

    map.current.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          ...lineSegments.map(seg => ({
            type: "Feature" as const,
            geometry: { type: "LineString" as const, coordinates: seg.coordinates },
            properties: { approximate: seg.approximate },
          })),
          ...coords.map((coord, i) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: coord },
            properties: { order: i + 1 },
          })),
        ],
      },
    });

    map.current.addLayer({ id: solidLineId, type: "line", source: sourceId,
      filter: ["all", ["==", ["geometry-type"], "LineString"], ["!=", ["get", "approximate"], true]],
      paint: { "line-color": "#0D9488", "line-width": 4, "line-opacity": 0.85 },
    });
    map.current.addLayer({ id: approximateLineId, type: "line", source: sourceId,
      filter: ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "approximate"], true]],
      paint: { "line-color": "#0D9488", "line-width": 4, "line-opacity": 0.75, "line-dasharray": [1.2, 1] },
    });
    map.current.addLayer({ id: pointId, type: "circle", source: sourceId,
      filter: ["==", ["geometry-type"], "Point"],
      paint: { "circle-color": "#ffffff", "circle-stroke-color": "#0D9488", "circle-stroke-width": 3, "circle-radius": 6 },
    });
  }, [mapReady, places, routeStops, routeGeometry, routeSegments, routeMeta]);

  // ── User location ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const sourceId = "itinera-user-location-source";
    const fillId    = "itinera-user-location-accuracy";
    const outlineId = "itinera-user-location-accuracy-outline";
    const pointId   = "itinera-user-location-point";

    if (map.current.getLayer(pointId))   map.current.removeLayer(pointId);
    if (map.current.getLayer(outlineId)) map.current.removeLayer(outlineId);
    if (map.current.getLayer(fillId))    map.current.removeLayer(fillId);
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
    if (!userLocation) return;

    const center: [number, number] = [userLocation.lng, userLocation.lat];
    const accuracy = Math.min(Math.max(userLocation.accuracy ?? 60, 25), 5000);

    map.current.addSource(sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [
        { type: "Feature" as const, geometry: { type: "Polygon" as const, coordinates: [makeAccuracyCircle(center, accuracy)] }, properties: { kind: "accuracy" } },
        { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: center }, properties: { kind: "user" } },
      ]},
    });
    map.current.addLayer({ id: fillId,    type: "fill",   source: sourceId, filter: ["==", ["get", "kind"], "accuracy"], paint: { "fill-color": "#0EA5E9", "fill-opacity": 0.13 } });
    map.current.addLayer({ id: outlineId, type: "line",   source: sourceId, filter: ["==", ["get", "kind"], "accuracy"], paint: { "line-color": "#0EA5E9", "line-width": 1, "line-opacity": 0.38 } });
    map.current.addLayer({ id: pointId,   type: "circle", source: sourceId, filter: ["==", ["get", "kind"], "user"],     paint: { "circle-color": "#0D9488", "circle-radius": 7, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });
  }, [mapReady, userLocation]);

  // ── Card visibility ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPlace) { setCardVisible(false); return; }
    setCardVisible(true);
    setDescriptionExpanded(false);
  }, [selectedPlace]);

  // ── Derived values for card ───────────────────────────────────────────────────
  const selectedCategory = selectedPlace?.place_categories;
  const selectedColor = getCategoryColor({
    slug: selectedCategory?.slug ?? "",
    iconName: selectedCategory?.icon_name ?? "",
    label: selectedCategory?.name_i18n?.es ?? selectedCategory?.name_i18n?.en ?? "",
  });
  const selectedDescription = pickBestDescription({
    aiSummary:   selectedPlace?.ai_summary_i18n?.es,
    description: selectedPlace?.description_i18n?.es,
    fallback: getPlaceShortDescription({
      name:     selectedPlace?.name_i18n?.es ?? selectedPlace?.slug ?? "Este destino",
      category: selectedCategory?.name_i18n?.es ?? "Lugar cultural",
      region:   selectedPlace?.regions?.name_i18n?.es ?? "Honduras",
    }),
  });
  const selectedImage         = getPlaceImage(selectedPlace?.slug ?? "");
  const categoryFallbackImage = getCategoryFallbackImage(selectedCategory?.name_i18n?.es ?? "Destino", selectedColor);
  const price           = selectedPlace?.price_level ? "$".repeat(selectedPlace.price_level) : "Gratis";
  const selectedInRoute = selectedPlace ? routeStopSlugs.includes(selectedPlace.slug) : false;
  const selectedRouteFeedback = selectedPlace && routeFeedback?.placeSlug === selectedPlace.slug ? routeFeedback : null;
  const selectedDistance = selectedPlace && userLocation &&
    typeof selectedPlace.lng === "number" && typeof selectedPlace.lat === "number"
      ? distanceKm([userLocation.lng, userLocation.lat], [selectedPlace.lng, selectedPlace.lat])
      : null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      {selectedPlace ? (
        <div
          className="pointer-events-auto absolute left-4 top-20 z-30 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#D9E5E2] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.22)] transition-all duration-200 md:left-8 md:top-24 md:w-[340px]"
          style={{ opacity: cardVisible ? 1 : 0, transform: cardVisible ? "translateY(0)" : "translateY(8px)" }}
        >
          <button type="button" aria-label="Cerrar" onClick={closeSelectedPlace}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/50">
            <X className="h-4 w-4" />
          </button>
          <div className="h-[170px] w-full bg-[#ECFDF5] p-2 pb-0 sm:h-[184px] md:h-[196px]">
            <img src={selectedImage} alt={selectedPlace.name_i18n?.es ?? selectedPlace.slug}
              className="h-full w-full rounded-xl object-cover" loading="lazy"
              onError={e => { e.currentTarget.src = categoryFallbackImage; }} />
          </div>
          <div className="space-y-3 p-4 pt-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-jakarta text-[34px] font-bold leading-[1.1] tracking-[-0.01em] text-[#0F172A]">
                  {selectedPlace.name_i18n?.es ?? selectedPlace.slug}
                </h3>
                <div className="mt-2 flex items-center gap-1.5 font-inter text-[11px] font-semibold text-[#0D9488]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedColor }} />
                  <span>{selectedCategory?.name_i18n?.es ?? "Lugar"}</span>
                  <span>-</span>
                  <span>{selectedPlace.regions?.name_i18n?.es ?? "Honduras"}</span>
                </div>
              </div>
              <button type="button" aria-label="Guardar" onClick={() => selectedPlace && onToggleSave?.(selectedPlace)}
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] transition-colors hover:bg-[#F8FAFC]">
                <Bookmark className={`h-4 w-4 ${isSaved ? "fill-[#0D9488] text-[#0D9488]" : ""}`} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-inter text-[11px] text-[#64748B]">
              <span className="inline-flex items-center gap-1 font-semibold text-[#0F172A]">
                <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                {Number(selectedPlace.aggregated_rating).toFixed(1)}
              </span>
              <span>{selectedPlace.review_count ?? 0} resenas</span>
              <span>{price}</span>
              {selectedDistance !== null ? <span>{formatDistance(selectedDistance)} de ti</span> : null}
              {selectedPlace.accessibility ? <span>Accesible</span> : null}
              {selectedPlace.local_favorite ? <span>Favorito local</span> : null}
            </div>
            <p className={`font-inter text-[13px] leading-6 text-[#334155] ${descriptionExpanded ? "" : "line-clamp-5"}`}>
              {selectedDescription}
            </p>
            {selectedDescription.length > 180 ? (
              <button type="button" onClick={() => setDescriptionExpanded(v => !v)}
                className="text-xs font-semibold text-[#0D9488] transition-colors hover:text-[#0f766e]">
                {descriptionExpanded ? "Ver menos" : "Ver más"}
              </button>
            ) : null}
            {recommendationReason ? (
              <div className="rounded-lg border border-[#99F6E4] bg-[#ECFEFF] px-2.5 py-2 font-inter text-[11px] text-[#0F766E]">
                <span className="font-semibold">IA:</span> {recommendationReason}
              </div>
            ) : null}
            {selectedRouteFeedback ? (
              <div className={`rounded-lg border px-2.5 py-2 font-inter text-[11px] font-semibold ${
                selectedRouteFeedback.kind === "added"
                  ? "border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E]"
                  : "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
              }`}>{selectedRouteFeedback.message}</div>
            ) : null}
            <div className="h-px bg-[#E2E8F0]" />
            <a href={`/places/${selectedPlace.slug}`}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#0D9488] font-inter text-sm font-bold text-white transition-colors hover:bg-[#0f766e]">
              <Eye className="h-3.5 w-3.5" />Ver detalle
            </a>
            <button type="button" onClick={() => selectedPlace && onAddToRoute?.(selectedPlace)}
              className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border font-inter text-sm font-bold transition-colors ${
                selectedInRoute
                  ? "border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E] hover:bg-[#CCFBF1]"
                  : "border-[#0D9488] text-[#0D9488] hover:bg-[#F0FDFA]"
              }`}>
              <Navigation className="h-3.5 w-3.5" />
              {selectedInRoute ? "En ruta" : "Agregar a ruta"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Bottom helpers ────────────────────────────────────────────────────────────

function getPlaceImage(slug: string) {
  const pool: Record<string, string> = {
    "ruinas-copan": "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?q=80&w=1200&auto=format&fit=crop",
    "catedral-comayagua": "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&auto=format&fit=crop",
    "playa-west-bay-roatan": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
  };
  return pool[slug] ?? "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop";
}

function getCategoryFallbackImage(categoryLabel: string, color: string) {
  const safeLabel = (categoryLabel || "Destino").toUpperCase().slice(0, 26);
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700' viewBox='0 0 1200 700'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='${color}' stop-opacity='0.95'/>
          <stop offset='100%' stop-color='#0f172a' stop-opacity='0.95'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='700' fill='url(#g)'/>
      <circle cx='1000' cy='120' r='220' fill='white' fill-opacity='0.08'/>
      <circle cx='180' cy='620' r='260' fill='white' fill-opacity='0.06'/>
      <text x='70' y='620' fill='white' fill-opacity='0.92' font-family='Inter, Arial, sans-serif' font-size='78' font-weight='700'>${safeLabel}</text>
    </svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getPlaceShortDescription({ name, category, region }: { name: string; category: string; region: string }) {
  const n = category.toLowerCase();
  if (n.includes("religioso")) return `${name} es un punto de valor historico y espiritual en ${region}, ideal para conocer tradiciones locales.`;
  if (n.includes("patrimonio") || n.includes("muse")) return `${name} destaca por su legado cultural en ${region}, con detalles historicos que enriquecen la visita.`;
  if (n.includes("naturaleza")) return `${name} ofrece una experiencia natural en ${region}, perfecta para explorar paisajes y biodiversidad.`;
  if (n.includes("gastronom")) return `${name} conecta con los sabores de ${region}, ideal para descubrir cocina y tradiciones culinarias.`;
  if (n.includes("aventura")) return `${name} es una opcion recomendada en ${region} para actividades al aire libre y experiencias activas.`;
  if (n.includes("playa")) return `${name} es un destino costero en ${region} para disfrutar mar, descanso y actividades junto a la playa.`;
  return `${name} es un lugar recomendado en ${region} para descubrir contexto local y cultura hondurena.`;
}

function pickBestDescription({ aiSummary, description, fallback }: { aiSummary?: string; description?: string; fallback: string }) {
  const genericPhrases = ["destino recomendado para explorar", "lugar recomendado para explorar", "destino cultural de honduras"];
  const norm = (t?: string) => (t ?? "").trim();
  const isGeneric = (t?: string) => { const v = norm(t).toLowerCase(); return !v || genericPhrases.some(p => v.includes(p)); };
  const ai = norm(aiSummary);
  if (ai && !isGeneric(ai)) return ai;
  const raw = norm(description);
  if (raw && !isGeneric(raw)) return raw;
  return fallback;
}
