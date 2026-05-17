"use client";

import { useEffect, useRef, useState } from "react";
import { Map, MapMarker, MarkerContent, MapRoute, type MapRef } from "@/components/ui/map";
import type { DayPlan } from "@/app/api/plan/route";

const DAY_COLORS = [
  "#0D9488", "#7C3AED", "#D97706", "#0284C7", "#E11D48", "#059669", "#9333EA",
];

interface MiniPlace {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  stopNumber: number;
  dayColor: string;
}

// Fetch real road route from OSRM — same API used in /explore
async function fetchRoadRoute(coords: [number, number][]): Promise<[number, number][]> {
  if (coords.length < 2) return coords;
  try {
    const waypoints = coords.map(([lng, lat]) => `${lng},${lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return coords;
    const data = await res.json() as {
      routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
    };
    const roadCoords = data.routes?.[0]?.geometry?.coordinates;
    return roadCoords && roadCoords.length > 1 ? roadCoords : coords;
  } catch {
    return coords; // fallback to straight lines silently
  }
}

export function PlannerMiniMap({ days }: { days: DayPlan[] }) {
  const mapRef = useRef<MapRef>(null);

  // Flatten places with valid coords
  const places: MiniPlace[] = [];
  let stop = 0;
  days.forEach((day, dayIdx) => {
    day.places.forEach(p => {
      if (typeof p.lat === "number" && typeof p.lng === "number") {
        stop++;
        places.push({
          slug: p.slug, name: p.name,
          lat: p.lat, lng: p.lng,
          stopNumber: stop,
          dayColor: DAY_COLORS[dayIdx % DAY_COLORS.length],
        });
      }
    });
  });

  const stopCoords: [number, number][] = places.map(p => [p.lng, p.lat]);

  // Road route state — full OSRM geometry
  const [fullRoute, setFullRoute] = useState<[number, number][]>([]);
  // Animated slice — grows frame by frame
  const [visibleRoute, setVisibleRoute] = useState<[number, number][]>([]);
  const coordsKey = stopCoords.map(c => c.join(",")).join("|");

  // 1. Fetch road route when places change
  useEffect(() => {
    if (stopCoords.length < 2) return;
    setFullRoute([]);
    setVisibleRoute([]);
    fetchRoadRoute(stopCoords).then(setFullRoute);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey]);

  // 2. Animate the route drawing once we have it
  useEffect(() => {
    if (fullRoute.length < 2) return;
    setVisibleRoute([fullRoute[0]]);
    let idx = 1;
    // Reveal ~4 road points every 20ms → smooth animation, ~total 1.5-3s
    const id = setInterval(() => {
      idx = Math.min(idx + 4, fullRoute.length);
      setVisibleRoute(fullRoute.slice(0, idx));
      if (idx >= fullRoute.length) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  }, [fullRoute]);

  // 3. fitBounds after map loads to show all stops
  useEffect(() => {
    if (places.length < 1) return;
    const lats = places.map(p => p.lat);
    const lngs = places.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latPad = Math.max(0.12, (maxLat - minLat) * 0.3);
    const lngPad = Math.max(0.12, (maxLng - minLng) * 0.3);
    const timeout = setTimeout(() => {
      mapRef.current?.fitBounds(
        [[minLng - lngPad, minLat - latPad], [maxLng + lngPad, maxLat + latPad]],
        { duration: 600, padding: 50 }
      );
    }, 350);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey]);

  if (places.length === 0) return null;

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
        {/* Road route — animates along real roads */}
        <MapRoute
          coordinates={visibleRoute}
          color="#0D9488"
          width={4}
          opacity={0.9}
        />

        {/* Numbered markers — always visible */}
        {places.map((place) => (
          <MapMarker key={place.slug} longitude={place.lng} latitude={place.lat}>
            <MarkerContent>
              <div style={{
                width: 32, height: 32,
                borderRadius: "50%",
                backgroundColor: place.dayColor,
                border: "3px solid white",
                boxShadow: `0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px ${place.dayColor}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-jakarta), sans-serif",
                fontSize: 13, fontWeight: 700, color: "white", cursor: "default",
              }}>
                {place.stopNumber}
              </div>
            </MarkerContent>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}
