"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type RouteStop = {
  order: number;
  slug: string;
  name: string;
  timeOfDay?: string;
  url?: string;
};

export type RouteState = {
  title: string;
  stops: RouteStop[];
} | null;

type DashboardContextValue = {
  query: string;
  category: string;
  selectedPlaceSlug: string | null;
  mapCenter: [number, number] | null;
  mapZoom: number | null;
  activeRoute: RouteState;
  aiState: { intent?: string; error?: string };
  setQuery: (value: string) => void;
  setCategory: (value: string) => void;
  setSelectedPlaceSlug: (value: string | null) => void;
  setMapViewport: (center: [number, number] | null, zoom: number | null) => void;
  setActiveRoute: (value: RouteState) => void;
  setAiState: (value: { intent?: string; error?: string }) => void;
  clearFilters: () => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  children,
  initialQuery = "",
  initialCategory = "",
}: {
  children: React.ReactNode;
  initialQuery?: string;
  initialCategory?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [selectedPlaceSlug, setSelectedPlaceSlug] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteState>(null);
  const [aiState, setAiState] = useState<{ intent?: string; error?: string }>({});

  const value = useMemo<DashboardContextValue>(
    () => ({
      query,
      category,
      selectedPlaceSlug,
      mapCenter,
      mapZoom,
      activeRoute,
      aiState,
      setQuery,
      setCategory,
      setSelectedPlaceSlug,
      setMapViewport: (center, zoom) => {
        setMapCenter(center);
        setMapZoom(zoom);
      },
      setActiveRoute,
      setAiState,
      clearFilters: () => {
        setQuery("");
        setCategory("");
        setSelectedPlaceSlug(null);
        setActiveRoute(null);
        setAiState({});
      },
    }),
    [query, category, selectedPlaceSlug, mapCenter, mapZoom, activeRoute, aiState]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider");
  return ctx;
}
