"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";

interface Place {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  aggregated_rating: number;
  review_count: number;
  lat?: number | null;
  lng?: number | null;
  place_categories: { name_i18n: Record<string, string>; icon_name: string } | null;
  regions: { name_i18n: Record<string, string> } | null;
}

const HONDURAS_CENTER: [number, number] = [-86.8, 15.2];
const HONDURAS_ZOOM = 6.5;

const ICON_MAP: Record<string, string> = {
  landmark: "L", leaf: "N", utensils: "G",
  waves: "P", zap: "A", church: "C",
};

const BG_COLORS: Record<string, string> = {
  "ruinas-copan": "#0D9488",
  "catedral-comayagua": "#7C3AED",
  "parque-nacional-cusuco": "#059669",
  "playa-west-bay-roatan": "#0369A1",
  "parque-nacional-la-tigra": "#065F46",
};

export function ExploreMap({
  places,
  selectedPlace,
  onSelectPlace,
}: {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place | null) => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map          = useRef<maplibregl.Map | null>(null);
  const markers    = useRef<maplibregl.Marker[]>([]);
  const tooltipRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Build hover tooltip HTML (compact, no actions)
  const buildTooltipHTML = useCallback((place: Place) => {
    const name   = place.name_i18n?.es ?? place.slug;
    const cat    = place.place_categories as { name_i18n: Record<string,string>; icon_name: string } | null;
    const icon   = ICON_MAP[cat?.icon_name ?? ""] ?? "M";
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
        <div style="font-size:10px;color:#94A3B8;margin-top:3px;">Click para ver detalle</div>
      </div>`;
  }, []);

  // Build click popup HTML (compact, no actions)
  const buildPopupHTML = useCallback((place: Place) => {
    const name = place.name_i18n?.es ?? place.slug;
    const cat  = place.place_categories as { name_i18n: Record<string,string>; icon_name: string } | null;
    const icon = ICON_MAP[cat?.icon_name ?? ""] ?? "M";
    const bg   = BG_COLORS[place.slug] ?? "#0D9488";
    const rating = Number(place.aggregated_rating).toFixed(1);

    return `
      <div style="width:220px;border-radius:12px;overflow:hidden;font-family:Inter,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
        <div style="height:80px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:2rem;">
          ${icon}
        </div>
        <div style="padding:12px;background:white;">
          <p style="font-weight:600;font-size:13px;color:#0F172A;margin:0 0 4px;">${name}</p>
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:10px;">
            <span style="color:#FBBF24;font-size:12px;">★</span>
            <span style="font-size:12px;font-weight:500;color:#0F172A;">${rating}</span>
            <span style="font-size:10px;color:#94A3B8;">· IA recomienda</span>
          </div>
          <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:#0D9488;font-weight:500;font-family:Inter,sans-serif;">
            <span>Toca para ver detalle</span>
          </div>
        </div>
      </div>`;
  }, []);

  // Init map
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

    // Close drawer on map click (backdrop handled by drawer itself)
    map.current.on("click", () => {
      onSelectPlace(null);
    });

    return () => {
      setMapReady(false);
      map.current?.remove();
      map.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when places change
  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach(m => m.remove());
    markers.current = [];

    places.forEach((place) => {
      const coords = typeof place.lng === "number" && typeof place.lat === "number"
        ? [place.lng, place.lat] as [number, number]
        : null;
      if (!coords) return;

      const cat  = place.place_categories as { icon_name: string } | null;
      const icon = ICON_MAP[cat?.icon_name ?? ""] ?? "M";
      const bg   = BG_COLORS[place.slug] ?? "#0D9488";

      // Marker element
      // Wrapper: MapLibre owns this element's transform for positioning
      const wrapper = document.createElement("div");
      Object.assign(wrapper.style, {
        cursor: "pointer",
        willChange: "transform",
      });

      // Inner el: we apply our own hover/scale transform here (never on wrapper)
      const el = document.createElement("div");
      Object.assign(el.style, {
        width: "40px",
        height: "40px",
        background: bg,
        border: "3px solid white",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      });
      el.textContent = icon;
      el.title = place.name_i18n?.es ?? place.slug;
      wrapper.appendChild(el);

      wrapper.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)";
        el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.35)";

        // Show hover tooltip
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

      wrapper.addEventListener("click", (e) => {
        e.stopPropagation();
        // Remove hover tooltip immediately
        tooltipRef.current?.remove();
        tooltipRef.current = null;
        // Open drawer via parent state
        onSelectPlace(place);
        // Fly to pin
        map.current?.flyTo({
          center: coords,
          zoom: Math.max(map.current.getZoom(), 9),
          offset: [0, -60],
          duration: 800,
        });
      });

      const marker = new maplibregl.Marker({ element: wrapper, anchor: "center" })
        .setLngLat(coords)
        .addTo(map.current!);

      markers.current.push(marker);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, mapReady]);

  // Fly to selected place (when triggered from list click)
  useEffect(() => {
    if (!selectedPlace || !map.current) return;
    const coords = typeof selectedPlace.lng === "number" && typeof selectedPlace.lat === "number"
      ? [selectedPlace.lng, selectedPlace.lat] as [number, number]
      : null;
    if (!coords) return;
    map.current.flyTo({
      center: coords,
      zoom: Math.max(map.current.getZoom(), 9),
      offset: [0, -60],
      duration: 800,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlace]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
