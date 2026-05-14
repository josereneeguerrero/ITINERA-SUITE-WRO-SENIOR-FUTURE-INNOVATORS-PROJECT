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
  const selectedPopupRef = useRef<maplibregl.Popup | null>(null);
  const hadSelectionRef = useRef(false);
  const suppressMapClickUntilRef = useRef(0);
  const [mapReady, setMapReady] = useState(false);

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

  const buildPopupHTML = useCallback((place: Place) => {
    const name = place.name_i18n?.es ?? place.slug;
    const cat = place.place_categories;
    const icon = ICON_MAP[cat?.icon_name ?? ""] ?? "M";
    const bg = getCategoryColor({
      slug: cat?.slug ?? "",
      iconName: cat?.icon_name ?? "",
      label: cat?.name_i18n?.es ?? cat?.name_i18n?.en ?? "",
    });
    const rating = Number(place.aggregated_rating).toFixed(1);
    return `
      <div style="width:262px;border-radius:16px;overflow:hidden;font-family:Inter,sans-serif;box-shadow:0 8px 28px rgba(15,23,42,0.2);">
        <div style="height:78px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:1.9rem;color:white;">
          ${icon}
        </div>
        <div style="padding:12px;background:white;">
          <p style="font-weight:700;font-size:16px;line-height:1.2;color:#0F172A;margin:0 0 6px;">${name}</p>
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:10px;">
            <span style="color:#FBBF24;font-size:12px;">★</span>
            <span style="font-size:12px;font-weight:600;color:#0F172A;">${rating}</span>
          </div>
          <a href="/places/${place.slug}" style="display:inline-flex;align-items:center;justify-content:center;width:100%;height:34px;border-radius:10px;background:#0D9488;color:white;text-decoration:none;font-size:12px;font-weight:700;">
            Ver detalle
          </a>
        </div>
      </div>`;
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
      selectedPopupRef.current?.remove();
      selectedPopupRef.current = null;
      onSelectPlace(null);
    });

    return () => {
      setMapReady(false);
      map.current?.remove();
      map.current = null;
    };
  }, [onSelectPlace]);

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
        selectedPopupRef.current?.remove();
        selectedPopupRef.current = null;
        onSelectPlace(place);

        selectedPopupRef.current = new maplibregl.Popup({
          offset: 24,
          closeButton: true,
          closeOnClick: false,
          closeOnMove: false,
          className: "itinera-place-popup",
          anchor: "bottom",
        })
          .setLngLat(coords)
          .setHTML(buildPopupHTML(place))
          .addTo(map.current!);

        selectedPopupRef.current.on("close", () => onSelectPlace(null));

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
  }, [places, mapReady, selectedPlace, visibleSlugs, buildTooltipHTML, buildPopupHTML, onSelectPlace]);

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
    selectedPopupRef.current?.remove();
    selectedPopupRef.current = null;
    fitAllPlaces();
  }, [selectedPlace, fitAllPlaces]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
