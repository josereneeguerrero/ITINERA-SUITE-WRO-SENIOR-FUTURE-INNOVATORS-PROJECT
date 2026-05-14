"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Bookmark, Eye, Navigation, Star, X } from "lucide-react";
import { getCategoryColor } from "@/lib/category-theme";

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

type UserLocation = {
  lng: number;
  lat: number;
  accuracy?: number;
};

type RouteMeta = {
  distanceKm?: number;
  durationMin?: number;
  approximate?: boolean;
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
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(value: number) {
  return value < 1 ? `${Math.round(value * 1000)} m` : `${value.toFixed(1)} km`;
}

function makeAccuracyCircle(center: [number, number], radiusMeters: number) {
  const [lng, lat] = center;
  const points: [number, number][] = [];
  const earthRadius = 6371000;
  const latRad = toRad(lat);

  for (let i = 0; i <= 64; i += 1) {
    const angle = (i / 64) * Math.PI * 2;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    const pointLat = lat + (dy / earthRadius) * (180 / Math.PI);
    const pointLng = lng + (dx / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);
    points.push([pointLng, pointLat]);
  }

  return points;
}

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const tooltipRef = useRef<maplibregl.Popup | null>(null);
  const suppressMapClickUntilRef = useRef(0);
  const selectedPlaceRef = useRef<Place | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
  }, [selectedPlace]);

  const fitAllPlaces = useCallback((duration = 700) => {
    if (!map.current) return;
    const coords = places
      .map((place) =>
        typeof place.lng === "number" && typeof place.lat === "number"
          ? ([place.lng, place.lat] as [number, number])
          : null
      )
      .filter((value): value is [number, number] => Boolean(value));

    if (coords.length >= 2) {
      const bounds = coords.reduce(
        (currentBounds, coordsItem) => currentBounds.extend(coordsItem),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.current.fitBounds(bounds, {
        padding: { top: 140, right: 80, left: 80, bottom: 170 },
        maxZoom: 8.6,
        duration,
      });
      return;
    }

    map.current.flyTo({ center: HONDURAS_CENTER, zoom: HONDURAS_ZOOM, duration });
  }, [places]);

  const buildTooltipHTML = useCallback((place: Place) => {
    const name = place.name_i18n?.es ?? place.slug;
    const cat = place.place_categories;
    const icon = ICON_MAP[cat?.icon_name ?? ""] ?? "M";
    const catName = cat?.name_i18n?.es ?? "";
    const rating = Number(place.aggregated_rating).toFixed(1);

    return `
      <div style="padding:10px 12px;font-family:Inter,sans-serif;min-width:150px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="font-size:14px;">${icon}</span>
          <span style="font-weight:700;font-size:13px;color:#0F172A;">${name}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;color:#0D9488;font-weight:600;">${catName}</span>
          <span style="font-size:11px;color:#64748B;">${rating}</span>
        </div>
      </div>`;
  }, []);

  function closeSelectedPlace() {
    setCardVisible(false);
    window.setTimeout(() => {
      onSelectPlace(null);
      fitAllPlaces(720);
    }, 120);
  }

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
      if (Date.now() < suppressMapClickUntilRef.current) return;
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

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    places.forEach((place) => {
      const coords =
        typeof place.lng === "number" && typeof place.lat === "number"
          ? ([place.lng, place.lat] as [number, number])
          : null;
      if (!coords) return;

      const category = place.place_categories;
      const color = getCategoryColor({
        slug: category?.slug ?? "",
        iconName: category?.icon_name ?? "",
        label: category?.name_i18n?.es ?? category?.name_i18n?.en ?? "",
      });
      const icon = ICON_MAP[category?.icon_name ?? ""] ?? "M";
      const isSelected = selectedPlace?.slug === place.slug;
      const isVisible = visibleSlugs ? visibleSlugs.has(place.slug) : true;

      const wrapper = document.createElement("div");
      Object.assign(wrapper.style, { cursor: "pointer", willChange: "transform" });

      const pin = document.createElement("div");
      Object.assign(pin.style, {
        width: "40px",
        height: "40px",
        background: color,
        border: isSelected ? "3px solid #F59E0B" : "3px solid white",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        boxShadow: isSelected
          ? "0 4px 18px rgba(245,158,11,0.5)"
          : "0 2px 8px rgba(0,0,0,0.25)",
        opacity: isVisible ? "1" : "0.35",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      });
      pin.textContent = icon;
      wrapper.appendChild(pin);

      wrapper.addEventListener("mouseenter", () => {
        pin.style.transform = "scale(1.16)";
        pin.style.boxShadow = "0 4px 16px rgba(0,0,0,0.35)";
        tooltipRef.current?.remove();
        tooltipRef.current = new maplibregl.Popup({
          offset: 22,
          closeButton: false,
          closeOnClick: false,
          anchor: "bottom",
          className: "itinera-tooltip",
        })
          .setLngLat(coords)
          .setHTML(buildTooltipHTML(place))
          .addTo(map.current!);
      });

      wrapper.addEventListener("mouseleave", () => {
        pin.style.transform = "scale(1)";
        pin.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
        tooltipRef.current?.remove();
        tooltipRef.current = null;
      });

      wrapper.addEventListener("click", (event) => {
        event.stopPropagation();
        suppressMapClickUntilRef.current = Date.now() + 400;
        tooltipRef.current?.remove();
        tooltipRef.current = null;
        onSelectPlace(place);
        setCardVisible(true);

        window.setTimeout(() => {
          map.current?.flyTo({
            center: coords,
            zoom: Math.max(map.current.getZoom(), 12),
            offset: [180, 12],
            duration: 760,
          });
        }, 140);
      });

      const marker = new maplibregl.Marker({ element: wrapper, anchor: "center" })
        .setLngLat(coords)
        .addTo(map.current!);
      markers.current.push(marker);
    });
  }, [places, mapReady, selectedPlace, visibleSlugs, buildTooltipHTML, onSelectPlace]);

  useEffect(() => {
    if (!map.current || !mapCenter) return;
    map.current.flyTo({
      center: mapCenter,
      zoom: mapZoom ?? Math.max(map.current.getZoom(), 9),
      duration: 900,
    });
  }, [mapCenter, mapZoom]);

  useEffect(() => {
    if (!map.current || !mapReady) return;
    fitAllPlaces(0);
  }, [mapReady, fitAllPlaces]);

  useEffect(() => {
    if (!map.current || !mapReady) return;
    const sourceId = "itinera-route-source";
    const legacyLineId = "itinera-route-line";
    const solidLineId = "itinera-route-line-solid";
    const approximateLineId = "itinera-route-line-approximate";
    const pointId = "itinera-route-points";
    const coords = routeStops
      .map((stop) => places.find((place) => place.slug === stop.slug))
      .filter((place): place is Place => Boolean(place))
      .map((place) =>
        typeof place.lng === "number" && typeof place.lat === "number"
          ? ([place.lng, place.lat] as [number, number])
          : null
      )
      .filter((value): value is [number, number] => Boolean(value));

    if (map.current.getLayer(legacyLineId)) map.current.removeLayer(legacyLineId);
    if (map.current.getLayer(solidLineId)) map.current.removeLayer(solidLineId);
    if (map.current.getLayer(approximateLineId)) map.current.removeLayer(approximateLineId);
    if (map.current.getLayer(pointId)) map.current.removeLayer(pointId);
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

    const lineCoords = routeGeometry && routeGeometry.length >= 2 ? routeGeometry : coords;
    const lineSegments =
      routeSegments && routeSegments.length > 0
        ? routeSegments
        : [{ coordinates: lineCoords, approximate: Boolean(routeMeta?.approximate) }];

    if (coords.length < 2 || lineCoords.length < 2 || lineSegments.length < 1) return;

    map.current.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          ...lineSegments.map((segment) => ({
            type: "Feature" as const,
            geometry: { type: "LineString" as const, coordinates: segment.coordinates },
            properties: { approximate: segment.approximate },
          })),
          ...coords.map((coord, index) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: coord },
            properties: { order: index + 1 },
          })),
        ],
      },
    });

    map.current.addLayer({
      id: solidLineId,
      type: "line",
      source: sourceId,
      filter: ["all", ["==", ["geometry-type"], "LineString"], ["!=", ["get", "approximate"], true]],
      paint: {
        "line-color": "#0D9488",
        "line-width": 4,
        "line-opacity": 0.85,
      },
    });

    map.current.addLayer({
      id: approximateLineId,
      type: "line",
      source: sourceId,
      filter: ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "approximate"], true]],
      paint: {
        "line-color": "#0D9488",
        "line-width": 4,
        "line-opacity": 0.75,
        "line-dasharray": [1.2, 1],
      },
    });

    map.current.addLayer({
      id: pointId,
      type: "circle",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": "#ffffff",
        "circle-stroke-color": "#0D9488",
        "circle-stroke-width": 3,
        "circle-radius": 6,
      },
    });
  }, [mapReady, places, routeStops, routeGeometry, routeSegments, routeMeta]);

  useEffect(() => {
    if (!map.current || !mapReady) return;

    const sourceId = "itinera-user-location-source";
    const fillId = "itinera-user-location-accuracy";
    const outlineId = "itinera-user-location-accuracy-outline";
    const pointId = "itinera-user-location-point";

    if (map.current.getLayer(pointId)) map.current.removeLayer(pointId);
    if (map.current.getLayer(outlineId)) map.current.removeLayer(outlineId);
    if (map.current.getLayer(fillId)) map.current.removeLayer(fillId);
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

    if (!userLocation) return;

    const center: [number, number] = [userLocation.lng, userLocation.lat];
    const accuracy = Math.min(Math.max(userLocation.accuracy ?? 60, 25), 5000);

    map.current.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature" as const,
            geometry: { type: "Polygon" as const, coordinates: [makeAccuracyCircle(center, accuracy)] },
            properties: { kind: "accuracy" },
          },
          {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: center },
            properties: { kind: "user" },
          },
        ],
      },
    });

    map.current.addLayer({
      id: fillId,
      type: "fill",
      source: sourceId,
      filter: ["==", ["get", "kind"], "accuracy"],
      paint: {
        "fill-color": "#0EA5E9",
        "fill-opacity": 0.13,
      },
    });

    map.current.addLayer({
      id: outlineId,
      type: "line",
      source: sourceId,
      filter: ["==", ["get", "kind"], "accuracy"],
      paint: {
        "line-color": "#0EA5E9",
        "line-width": 1,
        "line-opacity": 0.38,
      },
    });

    map.current.addLayer({
      id: pointId,
      type: "circle",
      source: sourceId,
      filter: ["==", ["get", "kind"], "user"],
      paint: {
        "circle-color": "#0D9488",
        "circle-radius": 7,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3,
      },
    });
  }, [mapReady, userLocation]);

  useEffect(() => {
    if (!selectedPlace) {
      setCardVisible(false);
      return;
    }
    setDescriptionExpanded(false);
  }, [selectedPlace]);

  const selectedCategory = selectedPlace?.place_categories;
  const selectedColor = getCategoryColor({
    slug: selectedCategory?.slug ?? "",
    iconName: selectedCategory?.icon_name ?? "",
    label: selectedCategory?.name_i18n?.es ?? selectedCategory?.name_i18n?.en ?? "",
  });
  const selectedDescription = pickBestDescription({
    aiSummary: selectedPlace?.ai_summary_i18n?.es,
    description: selectedPlace?.description_i18n?.es,
    fallback: getPlaceShortDescription({
      name: selectedPlace?.name_i18n?.es ?? selectedPlace?.slug ?? "Este destino",
      category: selectedCategory?.name_i18n?.es ?? "Lugar cultural",
      region: selectedPlace?.regions?.name_i18n?.es ?? "Honduras",
    }),
  });
  const selectedImage = getPlaceImage(selectedPlace?.slug ?? "");
  const categoryFallbackImage = getCategoryFallbackImage(
    selectedCategory?.name_i18n?.es ?? "Destino",
    selectedColor
  );
  const price = selectedPlace?.price_level ? "$".repeat(selectedPlace.price_level) : "Gratis";
  const selectedInRoute = selectedPlace ? routeStopSlugs.includes(selectedPlace.slug) : false;
  const selectedRouteFeedback =
    selectedPlace && routeFeedback?.placeSlug === selectedPlace.slug ? routeFeedback : null;
  const selectedDistance =
    selectedPlace &&
    userLocation &&
    typeof selectedPlace.lng === "number" &&
    typeof selectedPlace.lat === "number"
      ? distanceKm([userLocation.lng, userLocation.lat], [selectedPlace.lng, selectedPlace.lat])
      : null;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      {selectedPlace ? (
        <div
          className="pointer-events-auto absolute left-4 top-20 z-30 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#D9E5E2] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.22)] transition-all duration-200 md:left-8 md:top-24 md:w-[340px]"
          style={{
            opacity: cardVisible ? 1 : 0,
            transform: cardVisible ? "translateY(0)" : "translateY(8px)",
          }}
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={closeSelectedPlace}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="h-[170px] w-full bg-[#ECFDF5] p-2 pb-0 sm:h-[184px] md:h-[196px]">
            <img
              src={selectedImage}
              alt={selectedPlace.name_i18n?.es ?? selectedPlace.slug}
              className="h-full w-full rounded-xl object-cover"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = categoryFallbackImage;
              }}
            />
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
              <button
                type="button"
                aria-label="Guardar"
                onClick={() => selectedPlace && onToggleSave?.(selectedPlace)}
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] transition-colors hover:bg-[#F8FAFC]"
              >
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

            <p
              className={`font-inter text-[13px] leading-6 text-[#334155] ${
                descriptionExpanded ? "" : "line-clamp-5"
              }`}
            >
              {selectedDescription}
            </p>
            {selectedDescription.length > 180 ? (
              <button
                type="button"
                onClick={() => setDescriptionExpanded((value) => !value)}
                className="text-xs font-semibold text-[#0D9488] transition-colors hover:text-[#0f766e]"
              >
                {descriptionExpanded ? "Ver menos" : "Ver más"}
              </button>
            ) : null}
            {recommendationReason ? (
              <div className="rounded-lg border border-[#99F6E4] bg-[#ECFEFF] px-2.5 py-2 font-inter text-[11px] text-[#0F766E]">
                <span className="font-semibold">IA:</span> {recommendationReason}
              </div>
            ) : null}
            {selectedRouteFeedback ? (
              <div
                className={`rounded-lg border px-2.5 py-2 font-inter text-[11px] font-semibold ${
                  selectedRouteFeedback.kind === "added"
                    ? "border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E]"
                    : "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
                }`}
              >
                {selectedRouteFeedback.message}
              </div>
            ) : null}
            <div className="h-px bg-[#E2E8F0]" />
            <a
              href={`/places/${selectedPlace.slug}`}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#0D9488] font-inter text-sm font-bold text-white transition-colors hover:bg-[#0f766e]"
            >
              <Eye className="h-3.5 w-3.5" />
              Ver detalle
            </a>
            <button
              type="button"
              onClick={() => selectedPlace && onAddToRoute?.(selectedPlace)}
              className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border font-inter text-sm font-bold transition-colors ${
                selectedInRoute
                  ? "border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E] hover:bg-[#CCFBF1]"
                  : "border-[#0D9488] text-[#0D9488] hover:bg-[#F0FDFA]"
              }`}
            >
              <Navigation className="h-3.5 w-3.5" />
              {selectedInRoute ? "En ruta" : "Agregar a ruta"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getPlaceImage(slug: string) {
  const pool: Record<string, string> = {
    "ruinas-copan":
      "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?q=80&w=1200&auto=format&fit=crop",
    "catedral-comayagua":
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&auto=format&fit=crop",
    "playa-west-bay-roatan":
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
  };

  return (
    pool[slug] ??
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop"
  );
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
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getPlaceShortDescription({
  name,
  category,
  region,
}: {
  name: string;
  category: string;
  region: string;
}) {
  const normalized = category.toLowerCase();

  if (normalized.includes("religioso")) {
    return `${name} es un punto de valor historico y espiritual en ${region}, ideal para conocer tradiciones locales.`;
  }

  if (normalized.includes("patrimonio") || normalized.includes("muse")) {
    return `${name} destaca por su legado cultural en ${region}, con detalles historicos que enriquecen la visita.`;
  }

  if (normalized.includes("naturaleza")) {
    return `${name} ofrece una experiencia natural en ${region}, perfecta para explorar paisajes y biodiversidad.`;
  }

  if (normalized.includes("gastronom")) {
    return `${name} conecta con los sabores de ${region}, ideal para descubrir cocina y tradiciones culinarias.`;
  }

  if (normalized.includes("aventura")) {
    return `${name} es una opcion recomendada en ${region} para actividades al aire libre y experiencias activas.`;
  }

  if (normalized.includes("playa")) {
    return `${name} es un destino costero en ${region} para disfrutar mar, descanso y actividades junto a la playa.`;
  }

  return `${name} es un lugar recomendado en ${region} para descubrir contexto local y cultura hondurena.`;
}

function pickBestDescription({
  aiSummary,
  description,
  fallback,
}: {
  aiSummary?: string;
  description?: string;
  fallback: string;
}) {
  const genericPhrases = [
    "destino recomendado para explorar",
    "lugar recomendado para explorar",
    "destino cultural de honduras",
  ];

  const normalize = (text?: string) => (text ?? "").trim();
  const isGeneric = (text?: string) => {
    const value = normalize(text).toLowerCase();
    if (!value) return true;
    return genericPhrases.some((phrase) => value.includes(phrase));
  };

  const ai = normalize(aiSummary);
  if (ai && !isGeneric(ai)) return ai;

  const raw = normalize(description);
  if (raw && !isGeneric(raw)) return raw;

  return fallback;
}
