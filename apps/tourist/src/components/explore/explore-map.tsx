"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import { getCategoryColor } from "@/lib/category-theme";

interface Place {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  aggregated_rating: number;
  review_count: number;
  lat?: number | null;
  lng?: number | null;
  place_categories: { name_i18n: Record<string, string>; icon_name: string; slug?: string } | null;
  regions: { name_i18n: Record<string, string> } | null;
}

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

export function ExploreMap({
  places,
  visibleSlugs,
  selectedPlace,
  mapCenter,
  mapZoom,
  onSelectPlace,
}: {
  places: Place[];
  visibleSlugs?: Set<string>;
  selectedPlace: Place | null;
  mapCenter?: [number, number] | null;
  mapZoom?: number | null;
  onSelectPlace: (place: Place | null) => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const tooltipRef = useRef<maplibregl.Popup | null>(null);
  const hadSelectionRef = useRef(false);
  const suppressMapClickUntilRef = useRef(0);
  const selectedPlaceRef = useRef<Place | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedScreenPoint, setSelectedScreenPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
  }, [selectedPlace]);

  const buildTooltipHTML = useCallback((place: Place) => {
    const name = place.name_i18n?.es ?? place.slug;
    const cat = place.place_categories;
    const icon = ICON_MAP[cat?.icon_name ?? ""] ?? "M";
    const catName = cat?.name_i18n?.es ?? "";
    const rating = Number(place.aggregated_rating).toFixed(1);
    return `
      <div style="padding:10px 12px;font-family:Inter,sans-serif;min-width:140px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="font-size:14px;">${icon}</span>
          <span style="font-weight:600;font-size:13px;color:#0F172A;">${name}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;color:#0D9488;font-weight:500;">${catName}</span>
          <span style="display:flex;align-items:center;gap:2px;font-size:11px;color:#64748B;">
            <span style="color:#FBBF24;">★</span>${rating}
          </span>
        </div>
      </div>`;
  }, []);

  const updateSelectedScreenPoint = useCallback(() => {
    const currentPlace = selectedPlaceRef.current;
    if (!map.current || !currentPlace) {
      setSelectedScreenPoint(null);
      return;
    }
    if (typeof currentPlace.lng !== "number" || typeof currentPlace.lat !== "number") {
      setSelectedScreenPoint(null);
      return;
    }
    const point = map.current.project([currentPlace.lng, currentPlace.lat]);
    setSelectedScreenPoint({ x: point.x, y: point.y });
  }, []);

  const fitAllPlaces = useCallback(() => {
    if (!map.current) return;
    const coords = places
      .map((p) => (typeof p.lng === "number" && typeof p.lat === "number" ? [p.lng, p.lat] as [number, number] : null))
      .filter((v): v is [number, number] => !!v);

    if (coords.length >= 2) {
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.current.fitBounds(bounds, {
        padding: { top: 140, right: 80, left: 80, bottom: 170 },
        maxZoom: 8.6,
        duration: 700,
      });
      return;
    }

    map.current.flyTo({ center: HONDURAS_CENTER, zoom: HONDURAS_ZOOM, duration: 700 });
  }, [places]);

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
      onSelectPlace(null);
    });
    map.current.on("move", updateSelectedScreenPoint);
    map.current.on("zoom", updateSelectedScreenPoint);

    return () => {
      setMapReady(false);
      map.current?.remove();
      map.current = null;
    };
  }, [onSelectPlace, updateSelectedScreenPoint]);

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    places.forEach((place) => {
      const coords = typeof place.lng === "number" && typeof place.lat === "number" ? [place.lng, place.lat] as [number, number] : null;
      if (!coords) return;

      const cat = place.place_categories;
      const icon = ICON_MAP[cat?.icon_name ?? ""] ?? "M";
      const bg = getCategoryColor({
        slug: cat?.slug ?? "",
        iconName: cat?.icon_name ?? "",
        label: cat?.name_i18n?.es ?? cat?.name_i18n?.en ?? "",
      });
      const isSelected = selectedPlace?.slug === place.slug;
      const isVisible = visibleSlugs ? visibleSlugs.has(place.slug) : true;

      const wrapper = document.createElement("div");
      Object.assign(wrapper.style, { cursor: "pointer", willChange: "transform" });

      const el = document.createElement("div");
      Object.assign(el.style, {
        width: "40px",
        height: "40px",
        background: bg,
        border: isSelected ? "3px solid #F59E0B" : "3px solid white",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        boxShadow: isSelected ? "0 4px 18px rgba(245,158,11,0.5)" : "0 2px 8px rgba(0,0,0,0.25)",
        opacity: isVisible ? "1" : "0.35",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      });
      el.textContent = icon;
      wrapper.appendChild(el);

      wrapper.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.16)";
        el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.35)";
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
        el.style.transform = "scale(1)";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
        tooltipRef.current?.remove();
        tooltipRef.current = null;
      });

      wrapper.addEventListener("click", (event) => {
        event.stopPropagation();
        suppressMapClickUntilRef.current = Date.now() + 350;
        tooltipRef.current?.remove();
        tooltipRef.current = null;
        onSelectPlace(place);
        const point = map.current!.project(coords);
        setSelectedScreenPoint({ x: point.x, y: point.y });

        map.current?.flyTo({
          center: coords,
          zoom: Math.max(map.current.getZoom(), 10),
          offset: [0, -60],
          duration: 650,
        });
      });

      const marker = new maplibregl.Marker({ element: wrapper, anchor: "center" }).setLngLat(coords).addTo(map.current!);
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
    fitAllPlaces();
  }, [mapReady, fitAllPlaces]);

  useEffect(() => {
    if (!selectedPlace || !map.current) return;
    hadSelectionRef.current = true;
  }, [selectedPlace]);

  useEffect(() => {
    if (!map.current) return;
    if (selectedPlace) return;
    if (!hadSelectionRef.current) return;
    hadSelectionRef.current = false;
    setSelectedScreenPoint(null);
    fitAllPlaces();
  }, [selectedPlace, fitAllPlaces]);

  useEffect(() => {
    updateSelectedScreenPoint();
  }, [selectedPlace, updateSelectedScreenPoint]);

  const selectedCategory = selectedPlace?.place_categories;
  const selectedColor = getCategoryColor({
    slug: selectedCategory?.slug ?? "",
    iconName: selectedCategory?.icon_name ?? "",
    label: selectedCategory?.name_i18n?.es ?? selectedCategory?.name_i18n?.en ?? "",
  });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      {selectedPlace && selectedScreenPoint ? (
        <div
          className="pointer-events-auto absolute z-20 w-[268px] overflow-hidden rounded-2xl border border-[#D9E5E2] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.22)]"
          style={{
            left: selectedScreenPoint.x,
            top: selectedScreenPoint.y,
            transform: "translate(-50%, calc(-100% - 30px))",
          }}
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => onSelectPlace(null)}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 font-inter text-sm font-bold text-white backdrop-blur-sm"
          >
            x
          </button>
          <div
            className="flex h-[78px] items-center justify-center font-jakarta text-3xl font-bold text-white"
            style={{ backgroundColor: selectedColor }}
          >
            {ICON_MAP[selectedCategory?.icon_name ?? ""] ?? "M"}
          </div>
          <div className="space-y-2 p-3">
            <div>
              <h3 className="font-jakarta text-base font-bold leading-tight text-[#0F172A]">
                {selectedPlace.name_i18n?.es ?? selectedPlace.slug}
              </h3>
              <div className="mt-1 flex items-center gap-2 font-inter text-xs">
                <span className="font-semibold text-[#0D9488]">
                  {selectedCategory?.name_i18n?.es ?? "Lugar"}
                </span>
                <span className="text-[#F59E0B]">★</span>
                <span className="font-semibold text-[#475569]">
                  {Number(selectedPlace.aggregated_rating).toFixed(1)}
                </span>
              </div>
            </div>
            <a
              href={`/places/${selectedPlace.slug}`}
              className="flex h-9 items-center justify-center rounded-lg bg-[#0D9488] font-inter text-xs font-bold text-white transition-colors hover:bg-[#0f766e]"
            >
              Ver detalle
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
