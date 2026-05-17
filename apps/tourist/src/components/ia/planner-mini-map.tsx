"use client";

import { useEffect, useRef, useState } from "react";
import { Map, MapMarker, MarkerContent, MapRoute, type MapRef } from "@/components/ui/map";
import type { DayPlan } from "@/app/api/plan/route";

const DAY_COLORS = [
  "#0D9488", // teal   — día 1
  "#7C3AED", // violet — día 2
  "#D97706", // amber  — día 3
  "#0284C7", // sky    — día 4
  "#E11D48", // rose   — día 5
  "#059669", // green  — día 6
  "#9333EA", // purple — día 7
];

interface MiniPlace {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  stopNumber: number;
  dayColor: string;
}

export function PlannerMiniMap({ days }: { days: DayPlan[] }) {
  const mapRef = useRef<MapRef>(null);

  // Flatten all places with valid coordinates
  const places: MiniPlace[] = [];
  let stop = 0;
  days.forEach((day, dayIdx) => {
    day.places.forEach(p => {
      if (typeof p.lat === "number" && typeof p.lng === "number") {
        stop++;
        places.push({
          slug: p.slug,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          stopNumber: stop,
          dayColor: DAY_COLORS[dayIdx % DAY_COLORS.length],
        });
      }
    });
  });

  const allCoords: [number, number][] = places.map(p => [p.lng, p.lat]);

  // Animated route — only the LINE animates, markers are always visible
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const coordsKey = allCoords.map(c => c.join(",")).join("|");

  useEffect(() => {
    if (allCoords.length < 2) return;
    setRouteCoords([]);
    let step = 0;
    const id = setInterval(() => {
      step++;
      setRouteCoords(allCoords.slice(0, step + 1));
      if (step + 1 >= allCoords.length) clearInterval(id);
    }, 600);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey]);

  // Use fitBounds after map loads to show ALL places
  useEffect(() => {
    if (places.length < 2) return;
    const lats = places.map(p => p.lat);
    const lngs = places.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latPad = Math.max(0.15, (maxLat - minLat) * 0.25);
    const lngPad = Math.max(0.15, (maxLng - minLng) * 0.25);

    // Wait for map to initialize, then fit bounds
    const timeout = setTimeout(() => {
      mapRef.current?.fitBounds(
        [[minLng - lngPad, minLat - latPad], [maxLng + lngPad, maxLat + latPad]],
        { duration: 800, padding: 40 }
      );
    }, 400);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey]);

  if (places.length === 0) return null;

  // Initial center for first render (before fitBounds fires)
  const lats = places.map(p => p.lat);
  const lngs = places.map(p => p.lng);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#d7e2de] shadow-sm"
      style={{ height: 340 }}>
      <Map
        ref={mapRef}
        theme="light"
        center={[centerLng, centerLat]}
        zoom={7}
        interactive={false}
        attributionControl={{ compact: true }}
      >
        {/* Route line — animates progressively */}
        <MapRoute
          coordinates={routeCoords}
          color="#0D9488"
          width={4}
          opacity={0.9}
          dashArray={[8, 4]}
        />

        {/* All markers — always visible, no animation needed */}
        {places.map((place) => (
          <MapMarker key={place.slug} longitude={place.lng} latitude={place.lat}>
            <MarkerContent>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: place.dayColor,
                  border: "3px solid white",
                  boxShadow: `0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px ${place.dayColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "white",
                  cursor: "default",
                }}
              >
                {place.stopNumber}
              </div>
            </MarkerContent>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}
