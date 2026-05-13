"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import { CloudSun, ExternalLink, MapPin, Navigation } from "lucide-react";

type Relation<T> = T | T[] | null;

export type DashboardHomeMapPlace = {
  id: string;
  slug: string;
  name_i18n: Record<string, string> | null;
  aggregated_rating: number | null;
  lat?: number | null;
  lng?: number | null;
  regions: Relation<{
    id?: string | null;
    slug: string | null;
    name_i18n: Record<string, string> | null;
  }>;
  place_categories: Relation<{
    name_i18n: Record<string, string> | null;
    icon_name: string | null;
    slug: string | null;
  }>;
};

type RegionFilter = {
  slug: string;
  label: string;
};

type WeatherState =
  | { status: "loading"; label: string; temperature?: never }
  | { status: "ready"; label: string; temperature: number }
  | { status: "error"; label: string; temperature?: never };

const HONDURAS_CENTER: [number, number] = [-86.8, 15.2];
const HONDURAS_ZOOM = 6.2;

function getText(value: Record<string, string> | null | undefined, fallback: string) {
  return value?.es ?? value?.en ?? fallback;
}

function firstRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] : value;
}

function weatherCodeLabel(code?: number) {
  if (code == null) return "Clima disponible";
  if (code === 0) return "Despejado";
  if ([1, 2, 3].includes(code)) return "Parcialmente nublado";
  if ([45, 48].includes(code)) return "Neblina";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Lluvia probable";
  if ([95, 96, 99].includes(code)) return "Tormenta posible";
  return "Condicion variable";
}

function getRegion(place: DashboardHomeMapPlace) {
  return firstRelation(place.regions);
}

function getCoords(places: DashboardHomeMapPlace[]): [number, number] {
  const coords = places
    .filter((place) => typeof place.lat === "number" && typeof place.lng === "number")
    .map((place) => [place.lng as number, place.lat as number] as [number, number]);

  if (!coords.length) return HONDURAS_CENTER;

  const [lngTotal, latTotal] = coords.reduce(
    ([lngAcc, latAcc], [lng, lat]) => [lngAcc + lng, latAcc + lat],
    [0, 0]
  );

  return [lngTotal / coords.length, latTotal / coords.length];
}

export function DashboardHomeMap({
  places,
  isGuest,
}: {
  places: DashboardHomeMapPlace[];
  isGuest: boolean;
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [activeRegion, setActiveRegion] = useState("");
  const [weather, setWeather] = useState<WeatherState>({
    status: "loading",
    label: "Consultando clima",
  });

  const placesWithCoords = useMemo(
    () => places.filter((place) => typeof place.lat === "number" && typeof place.lng === "number"),
    [places]
  );

  const regions = useMemo<RegionFilter[]>(() => {
    const bySlug = new Map<string, RegionFilter>();
    for (const place of places) {
      const region = getRegion(place);
      if (!region?.slug) continue;
      bySlug.set(region.slug, {
        slug: region.slug,
        label: getText(region.name_i18n, region.slug),
      });
    }
    return Array.from(bySlug.values()).slice(0, 5);
  }, [places]);

  const filteredPlaces = useMemo(
    () =>
      activeRegion
        ? placesWithCoords.filter((place) => getRegion(place)?.slug === activeRegion)
        : placesWithCoords,
    [activeRegion, placesWithCoords]
  );

  const activeRegionLabel =
    regions.find((region) => region.slug === activeRegion)?.label ?? "Honduras";
  const mapHref = isGuest
    ? `/explore?guest=true${activeRegion ? `&region=${activeRegion}` : ""}`
    : `/explore${activeRegion ? `?region=${activeRegion}` : ""}`;

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: HONDURAS_CENTER,
      zoom: HONDURAS_ZOOM,
      attributionControl: false,
      interactive: true,
      renderWorldCopies: false,
    });

    map.scrollZoom.disable();
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    filteredPlaces.forEach((place) => {
      const el = document.createElement("button");
      const name = getText(place.name_i18n, place.slug);
      const category = firstRelation(place.place_categories);
      const categoryName = getText(category?.name_i18n, "Destino");
      el.type = "button";
      el.title = name;
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "999px";
      el.style.border = "3px solid white";
      el.style.background = "#00796f";
      el.style.boxShadow = "0 8px 20px rgba(15,23,42,0.22)";
      el.style.cursor = "pointer";

      const popup = new maplibregl.Popup({
        offset: 14,
        closeButton: false,
        closeOnClick: true,
        maxWidth: "220px",
      }).setHTML(`
        <div style="padding:10px 12px;font-family:Inter,system-ui,sans-serif;">
          <strong style="display:block;font-size:12px;color:#0f172a;margin-bottom:3px;">${name}</strong>
          <span style="font-size:11px;color:#00796f;">${categoryName}</span>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([place.lng as number, place.lat as number])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (filteredPlaces.length > 1) {
      const coords = filteredPlaces.map((place) => [place.lng as number, place.lat as number] as [number, number]);
      const bounds = coords.reduce(
        (acc, coord) => acc.extend(coord),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 8.8, duration: 500 });
      return;
    }

    map.easeTo({
      center: filteredPlaces[0]
        ? [filteredPlaces[0].lng as number, filteredPlaces[0].lat as number]
        : HONDURAS_CENTER,
      zoom: filteredPlaces[0] ? 8 : HONDURAS_ZOOM,
      duration: 500,
    });
  }, [filteredPlaces]);

  useEffect(() => {
    const controller = new AbortController();
    const [lng, lat] = getCoords(filteredPlaces.length ? filteredPlaces : placesWithCoords);

    async function loadWeather() {
      setWeather({ status: "loading", label: "Consultando clima" });
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,weather_code&timezone=auto`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`Weather ${res.status}`);
        const data = (await res.json()) as {
          current?: { temperature_2m?: number; weather_code?: number };
        };
        const temperature = data.current?.temperature_2m;
        if (typeof temperature !== "number") throw new Error("Missing temperature");
        setWeather({
          status: "ready",
          temperature,
          label: weatherCodeLabel(data.current?.weather_code),
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setWeather({ status: "error", label: "Clima no disponible ahora" });
      }
    }

    loadWeather();
    return () => controller.abort();
  }, [activeRegion, filteredPlaces, placesWithCoords]);

  return (
    <section className="mx-auto mt-14 w-full max-w-6xl px-6 md:px-10">
      <h2 className="font-jakarta text-2xl font-bold text-[#171d1c] md:text-3xl">
        Mapa Interactivo
      </h2>

      <div className="mt-6 grid gap-6 rounded-2xl border border-[#d7e2de] bg-[#eaf2ef] p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_260px] lg:p-6">
        <div className="relative min-h-[300px] overflow-hidden rounded-xl border border-[#d7e2de] bg-white shadow-sm md:min-h-[360px]">
          <div ref={mapContainer} className="absolute inset-0" />
          {!placesWithCoords.length && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="font-inter text-sm text-[#64748B]">
                Aun no hay coordenadas disponibles para mostrar pins.
              </p>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div>
            <p className="font-inter text-xs font-bold uppercase tracking-[0.08em] text-[#334155]">
              Territorio
            </p>
            <div className="mt-3 rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e0f3ef] text-[#00796f]">
                  <CloudSun className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-inter text-xs font-semibold text-[#64748B]">
                    Clima en {activeRegionLabel}
                  </p>
                  <p className="mt-1 font-jakarta text-2xl font-bold text-[#00796f]">
                    {weather.status === "ready" ? `${Math.round(weather.temperature)}°C` : "--"}
                  </p>
                  <p className="font-inter text-xs text-[#64748B]">{weather.label}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e0f3ef] text-[#00796f]">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-inter text-xs font-semibold text-[#64748B]">
                    Destinos disponibles
                  </p>
                  <p className="mt-1 font-jakarta text-2xl font-bold text-[#00796f]">
                    {filteredPlaces.length}
                  </p>
                  <p className="font-inter text-xs text-[#64748B]">Con pins activos en el mapa</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="font-inter text-xs font-bold uppercase tracking-[0.08em] text-[#334155]">
              Filtrar por departamento
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveRegion("")}
                className="rounded-full px-4 py-2 font-inter text-xs font-bold transition-colors"
                style={{
                  backgroundColor: activeRegion ? "white" : "#00796f",
                  color: activeRegion ? "#475569" : "white",
                }}
              >
                Todos
              </button>
              {regions.map((region) => (
                <button
                  key={region.slug}
                  type="button"
                  onClick={() => setActiveRegion(region.slug)}
                  className="rounded-full px-4 py-2 font-inter text-xs font-bold transition-colors"
                  style={{
                    backgroundColor: activeRegion === region.slug ? "#00796f" : "white",
                    color: activeRegion === region.slug ? "white" : "#475569",
                  }}
                >
                  {region.label}
                </button>
              ))}
            </div>
          </div>

          <Link
            href={mapHref}
            className="mt-auto inline-flex min-h-12 items-center justify-between rounded-xl bg-[#cfe7e2] px-4 font-inter text-sm font-bold text-[#00796f] transition-colors hover:bg-[#bfe0d9]"
          >
            <span className="inline-flex items-center gap-2">
              <Navigation className="h-4 w-4" aria-hidden="true" />
              Abrir Mapa Completo
            </span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </section>
  );
}
