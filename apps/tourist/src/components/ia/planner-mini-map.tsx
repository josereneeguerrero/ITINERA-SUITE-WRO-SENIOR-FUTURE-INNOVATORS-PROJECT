"use client";

import { useEffect, useRef, useState } from "react";
import { Map, MapMarker, MarkerContent, MapRoute } from "@/components/ui/map";
import type { PlaceCard, DayPlan } from "@/app/api/plan/route";

// Colors per day (up to 7 days)
const DAY_COLORS = [
  "#0D9488", // teal  — día 1
  "#7C3AED", // violet — día 2
  "#D97706", // amber — día 3
  "#0284C7", // sky   — día 4
  "#E11D48", // rose  — día 5
  "#059669", // green — día 6
  "#9333EA", // purple — día 7
];

interface MiniMapPlace extends PlaceCard {
  stopNumber: number;
  dayNumber: number;
  dayColor: string;
}

export function PlannerMiniMap({ days }: { days: DayPlan[] }) {
  // Flatten all places with coordinates, in day order
  const allPlaces: MiniMapPlace[] = days.flatMap((day, dayIdx) =>
    day.places
      .filter((p): p is PlaceCard & { lat: number; lng: number } =>
        typeof p.lat === "number" && typeof p.lng === "number"
      )
      .map((p, placeIdx) => ({
        ...p,
        stopNumber: days.slice(0, dayIdx).reduce((acc, d) => acc + d.places.filter(pp => pp.lat && pp.lng).length, 0) + placeIdx + 1,
        dayNumber: day.dayNumber,
        dayColor: DAY_COLORS[(dayIdx) % DAY_COLORS.length],
      }))
  );

  const allCoords: [number, number][] = allPlaces.map(p => [p.lng, p.lat]);

  // Animated route: reveal one coordinate at a time
  const [visibleCoords, setVisibleCoords] = useState<[number, number][]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const animDone = useRef(false);

  useEffect(() => {
    if (allCoords.length < 2 || animDone.current) return;
    animDone.current = true;

    // Start with first point immediately
    setVisibleCoords([allCoords[0]]);
    setVisibleCount(1);

    let step = 1;
    const interval = setInterval(() => {
      step++;
      setVisibleCoords(allCoords.slice(0, step));
      setVisibleCount(step);
      if (step >= allCoords.length) clearInterval(interval);
    }, 700); // 700ms per stop — dramatic and visible

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute center and bounds for initial viewport
  const lats = allPlaces.map(p => p.lat);
  const lngs = allPlaces.map(p => p.lng);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

  // Fit zoom based on bounding box spread
  const latSpread = Math.max(...lats) - Math.min(...lats);
  const lngSpread = Math.max(...lngs) - Math.min(...lngs);
  const spread = Math.max(latSpread, lngSpread);
  const zoom = spread < 0.5 ? 10 : spread < 1.5 ? 8.5 : spread < 3 ? 7.5 : 6.5;

  if (allPlaces.length < 2) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#d7e2de] shadow-sm" style={{ height: 300 }}>
      <Map
        theme="light"
        center={[centerLng, centerLat]}
        zoom={zoom}
        interactive={false}
        attributionControl={{ compact: true }}
      >
        {/* Animated route line */}
        {visibleCoords.length >= 2 && (
          <MapRoute
            coordinates={visibleCoords}
            color="#0D9488"
            width={3}
            opacity={0.9}
            dashArray={[6, 3]}
          />
        )}

        {/* Place markers — appear as the route reaches them */}
        {allPlaces.map((place, i) => {
          const isVisible = i < visibleCount;
          return (
            <MapMarker
              key={place.slug}
              longitude={place.lng}
              latitude={place.lat}
            >
              <MarkerContent>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full font-jakarta text-[11px] font-bold text-white shadow-md ring-2 ring-white transition-all duration-500"
                  style={{
                    backgroundColor: isVisible ? place.dayColor : "transparent",
                    border: isVisible ? "none" : `2px solid ${place.dayColor}`,
                    color: isVisible ? "white" : place.dayColor,
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "scale(1)" : "scale(0.5)",
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
