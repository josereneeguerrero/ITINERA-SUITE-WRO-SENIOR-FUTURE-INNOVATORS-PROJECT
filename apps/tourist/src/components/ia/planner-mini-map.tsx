"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Map, MapMarker, MarkerContent, MapRoute, type MapRef } from "@/components/ui/map";
import type { DayPlan } from "@/app/api/plan/route";

const DAY_COLORS = [
  "#0D9488", "#7C3AED", "#D97706", "#0284C7", "#E11D48", "#059669", "#9333EA",
];

interface MiniPlace {
  slug: string;
  name: string;
  category: string;
  region: string;
  lat: number;
  lng: number;
  stopNumber: number;
  dayColor: string;
}

interface RouteResult {
  coords: [number, number][];
  distanceKm: number | null;
  durationMin: number | null;
}

async function fetchRoadRoute(coords: [number, number][]): Promise<RouteResult> {
  if (coords.length < 2) return { coords, distanceKm: null, durationMin: null };
  try {
    const waypoints = coords.map(([lng, lat]) => `${lng},${lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return { coords, distanceKm: null, durationMin: null };
    const data = await res.json() as {
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
      }>;
    };
    const route = data.routes?.[0];
    const roadCoords = route?.geometry?.coordinates;
    return {
      coords: roadCoords && roadCoords.length > 1 ? roadCoords : coords,
      distanceKm: typeof route?.distance === "number" ? Math.round(route.distance / 1000) : null,
      durationMin: typeof route?.duration === "number" ? Math.round(route.duration / 60) : null,
    };
  } catch {
    return { coords, distanceKm: null, durationMin: null };
  }
}

// ─── Tour timing constants ─────────────────────────────────────────────────────
const FLY_DURATION   = 1400; // ms — flyTo each stop
const VIEW_DURATION  = 2600; // ms — pause at each stop
const RETURN_DURATION = 1600; // ms — flyTo back to overview
const OVERVIEW_PAUSE  = 2200; // ms — pause on full route before repeating
const ZOOM_IN        = 13;   // zoom level for individual stop
const TOUR_START_DELAY = 1800; // ms after route is drawn before tour begins

export function PlannerMiniMap({
  days,
  onRouteReady,
}: {
  days: DayPlan[];
  onRouteReady?: (stats: { distanceKm: number; durationMin: number }) => void;
}) {
  const mapRef    = useRef<MapRef>(null);
  const tourTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flatten places with coords
  const places: MiniPlace[] = [];
  let stop = 0;
  days.forEach((day, dayIdx) => {
    day.places.forEach(p => {
      if (typeof p.lat === "number" && typeof p.lng === "number") {
        stop++;
        places.push({
          slug: p.slug, name: p.name,
          category: p.category, region: p.region,
          lat: p.lat, lng: p.lng,
          stopNumber: stop,
          dayColor: DAY_COLORS[dayIdx % DAY_COLORS.length],
        });
      }
    });
  });

  const stopCoords: [number, number][] = places.map(p => [p.lng, p.lat]);
  const coordsKey = stopCoords.map(c => c.join(",")).join("|");

  // Bounds calculation
  const lats = places.map(p => p.lat);
  const lngs = places.map(p => p.lng);
  const minLat = places.length ? Math.min(...lats) : 14;
  const maxLat = places.length ? Math.max(...lats) : 15;
  const minLng = places.length ? Math.min(...lngs) : -87.5;
  const maxLng = places.length ? Math.max(...lngs) : -86.5;
  const latPad = Math.max(0.12, (maxLat - minLat) * 0.3);
  const lngPad = Math.max(0.12, (maxLng - minLng) * 0.3);
  const overviewBounds: [[number, number], [number, number]] = [
    [minLng - lngPad, minLat - latPad],
    [maxLng + lngPad, maxLat + latPad],
  ];

  // Route animation state
  const [fullRoute,    setFullRoute]    = useState<[number, number][]>([]);
  const [visibleRoute, setVisibleRoute] = useState<[number, number][]>([]);
  const [routeDone,    setRouteDone]    = useState(false);

  // Tour state
  const [tourCard, setTourCard] = useState<MiniPlace | null>(null);

  const flyToOverview = useCallback(() => {
    mapRef.current?.fitBounds(overviewBounds, { duration: RETURN_DURATION, padding: 50 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey]);

  // Tour loop — recursive via setTimeout
  const startTour = useCallback(() => {
    if (!places.length) return;

    function visitPlace(index: number) {
      if (index >= places.length) {
        // All stops visited → fly back to full overview
        flyToOverview();
        setTourCard(null);
        tourTimer.current = setTimeout(() => startTour(), RETURN_DURATION + OVERVIEW_PAUSE);
        return;
      }
      const p = places[index];
      mapRef.current?.flyTo({
        center: [p.lng, p.lat],
        zoom: ZOOM_IN,
        duration: FLY_DURATION,
        essential: true,
      });
      tourTimer.current = setTimeout(() => {
        setTourCard(p);
        tourTimer.current = setTimeout(() => {
          setTourCard(null);
          visitPlace(index + 1);
        }, VIEW_DURATION);
      }, FLY_DURATION);
    }

    visitPlace(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey, places.length]);

  // 1. Fetch road route when places change
  useEffect(() => {
    if (stopCoords.length < 2) return;
    setFullRoute([]); setVisibleRoute([]); setRouteDone(false); setTourCard(null);
    if (tourTimer.current) clearTimeout(tourTimer.current);
    fetchRoadRoute(stopCoords).then(result => {
      setFullRoute(result.coords);
      if (result.distanceKm && result.durationMin) {
        onRouteReady?.({ distanceKm: result.distanceKm, durationMin: result.durationMin });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey]);

  // 2. Animate the route drawing
  useEffect(() => {
    if (fullRoute.length < 2) return;
    setVisibleRoute([fullRoute[0]]);
    let idx = 1;
    const id = setInterval(() => {
      idx = Math.min(idx + 4, fullRoute.length);
      setVisibleRoute(fullRoute.slice(0, idx));
      if (idx >= fullRoute.length) {
        clearInterval(id);
        setRouteDone(true);
      }
    }, 20);
    return () => clearInterval(id);
  }, [fullRoute]);

  // 3. Start tour after route is fully drawn
  useEffect(() => {
    if (!routeDone || places.length < 1) return;
    tourTimer.current = setTimeout(() => startTour(), TOUR_START_DELAY);
    return () => { if (tourTimer.current) clearTimeout(tourTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeDone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (tourTimer.current) clearTimeout(tourTimer.current); };
  }, []);

  // 4. fitBounds after map loads to show all places initially
  useEffect(() => {
    if (places.length < 1) return;
    const t = setTimeout(() => {
      mapRef.current?.fitBounds(overviewBounds, { duration: 600, padding: 50 });
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey]);

  if (places.length === 0) return null;

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return (
    <div style={{ position: "relative", height: 340 }}>
      {/* Map */}
      <div className="overflow-hidden rounded-2xl border border-[#d7e2de] shadow-sm h-full">
        <Map
          ref={mapRef}
          theme="light"
          center={[centerLng, centerLat]}
          zoom={7}
          interactive={false}
          attributionControl={{ compact: true }}
        >
          <MapRoute coordinates={visibleRoute} color="#0D9488" width={4} opacity={0.9} />

          {places.map((place) => (
            <MapMarker key={place.slug} longitude={place.lng} latitude={place.lat}
              anchor="bottom" offset={[0, 4]}>
              <MarkerContent>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  backgroundColor: place.dayColor,
                  border: "2.5px solid white",
                  boxShadow: `0 1px 6px rgba(0,0,0,0.35), 0 0 0 1px ${place.dayColor}80`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-jakarta), sans-serif",
                  fontSize: 11, fontWeight: 700, color: "white", cursor: "default",
                }}>
                  {place.stopNumber}
                </div>
              </MarkerContent>
            </MapMarker>
          ))}
        </Map>
      </div>

      {/* Tour card — floats over the map while zoomed into a stop */}
      <div
        className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 transition-all duration-300"
        style={{ opacity: tourCard ? 1 : 0, transform: `translateX(-50%) translateY(${tourCard ? "0" : "8px"})` }}
      >
        {tourCard && (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#d7e2de] bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-sm">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-jakarta text-[11px] font-bold text-white"
              style={{ backgroundColor: tourCard.dayColor }}
            >
              {tourCard.stopNumber}
            </div>
            <div className="min-w-0">
              <p className="font-jakarta text-sm font-bold text-[#0f172a] leading-tight">{tourCard.name}</p>
              {(tourCard.category || tourCard.region) && (
                <p className="font-inter text-[11px] text-[#64748b] leading-tight">
                  {[tourCard.category, tourCard.region].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
