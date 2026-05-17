"use client";

import { useEffect, useState } from "react";
import { Map, MapMarker, MarkerContent, MapRoute } from "@/components/ui/map";
import type { DayPlan } from "@/app/api/plan/route";

// One color per day (up to 7)
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
  // Flatten all places that have coordinates
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

  // Animated route — grow one point at a time
  const [visibleCoords, setVisibleCoords] = useState<[number, number][]>(
    allCoords.length > 0 ? [allCoords[0]] : []
  );
  const [visibleStops, setVisibleStops] = useState(allCoords.length > 0 ? 1 : 0);

  const coordsKey = allCoords.map(c => c.join(",")).join("|");

  useEffect(() => {
    if (allCoords.length < 2) return;
    setVisibleCoords([allCoords[0]]);
    setVisibleStops(1);
    let step = 1;
    const id = setInterval(() => {
      step++;
      setVisibleCoords(prev => [...prev, allCoords[step - 1]]);
      setVisibleStops(step);
      if (step >= allCoords.length) clearInterval(id);
    }, 650);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey]);

  // Nothing to show without coords
  if (places.length === 0) return null;

  // Auto-center + zoom from bounding box
  const lats = places.map(p => p.lat);
  const lngs = places.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const spread = Math.max(maxLat - minLat, maxLng - minLng);
  const zoom = spread < 0.3 ? 11 : spread < 0.8 ? 9.5 : spread < 2 ? 8 : spread < 4 ? 7 : 6;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#d7e2de] shadow-sm"
      style={{ height: 340 }}>
      <Map
        theme="light"
        center={[centerLng, centerLat]}
        zoom={zoom}
        interactive={false}
        attributionControl={{ compact: true }}
      >
        {/* Animated route line — always mounted */}
        <MapRoute
          coordinates={visibleCoords}
          color="#0D9488"
          width={4}
          opacity={0.85}
          dashArray={[8, 4]}
        />

        {/* Markers — appear one by one as route draws */}
        {places.map((place, i) => {
          const visible = i < visibleStops;
          return (
            <MapMarker key={place.slug} longitude={place.lng} latitude={place.lat}>
              <MarkerContent>
                <div
                  className="flex items-center justify-center rounded-full font-jakarta font-bold text-white shadow-lg transition-all duration-500"
                  style={{
                    width: 32,
                    height: 32,
                    fontSize: 13,
                    backgroundColor: visible ? place.dayColor : "transparent",
                    border: `3px solid ${place.dayColor}`,
                    color: visible ? "white" : place.dayColor,
                    opacity: visible ? 1 : 0,
                    transform: visible ? "scale(1)" : "scale(0.3)",
                    boxShadow: visible ? `0 2px 8px ${place.dayColor}60, 0 0 0 3px white` : "none",
                  }}
                >
                  {place.stopNumber}
                </div>
              </MarkerContent>
            </MapMarker>
          );
        })}
      </Map>
    </div>
  );
}
