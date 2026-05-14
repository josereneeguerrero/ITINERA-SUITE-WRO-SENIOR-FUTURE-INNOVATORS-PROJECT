"use client";

import { useMemo, useState } from "react";
import SuggestiveSearch from "@/components/ui/suggestive-search";
import { ExploreMap } from "@/components/explore/explore-map";
import { PlaceDrawer } from "@/components/explore/place-drawer";

type Place = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  ai_summary_i18n?: Record<string, string>;
  aggregated_rating: number;
  review_count: number;
  price_level: number;
  accessibility?: boolean;
  local_favorite: boolean;
  featured: boolean;
  lat?: number | null;
  lng?: number | null;
  place_categories: { name_i18n: Record<string, string>; icon_name: string; slug: string } | null;
  regions: { name_i18n: Record<string, string>; slug: string } | null;
};

type Category = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  icon_name: string;
};

function getEs(value?: Record<string, string> | null, fallback = "") {
  return value?.es ?? value?.en ?? fallback;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ExploreFullscreenMap({
  places,
  categories,
}: {
  places: Place[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedPlaceSlug, setSelectedPlaceSlug] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);

  const filteredPlaces = useMemo(() => {
    const q = normalize(query);
    return places.filter((place) => {
      const name = normalize(getEs(place.name_i18n, place.slug));
      const category = normalize(getEs(place.place_categories?.name_i18n, ""));
      const region = normalize(getEs(place.regions?.name_i18n, ""));
      const matchesQuery = !q || name.includes(q) || category.includes(q) || region.includes(q);
      const matchesCategory = !activeCategory || place.place_categories?.slug === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [places, query, activeCategory]);

  const visibleSlugs = useMemo(() => new Set(filteredPlaces.map((item) => item.slug)), [filteredPlaces]);
  const selectedPlace = useMemo(
    () => places.find((item) => item.slug === selectedPlaceSlug) ?? null,
    [places, selectedPlaceSlug]
  );

  function clearFilters() {
    setQuery("");
    setActiveCategory("");
    setSelectedPlaceSlug(null);
    setMapCenter(null);
    setMapZoom(null);
  }

  function applyNearby() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMapCenter([coords.longitude, coords.latitude]);
        setMapZoom(11);
      },
      () => undefined
    );
  }

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-[#E5E7EB]">
      <div className="absolute inset-0">
        <ExploreMap
          places={places as never}
          visibleSlugs={visibleSlugs}
          selectedPlace={selectedPlace as never}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          onSelectPlace={(place) => setSelectedPlaceSlug((place as Place | null)?.slug ?? null)}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-6 z-20 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-[820px]">
          <SuggestiveSearch
            value={query}
            onValueChange={setQuery}
            onSubmit={(text) => {
              if (!text.trim()) return;
              const first = filteredPlaces[0];
              if (first) setSelectedPlaceSlug(first.slug);
            }}
            onTrailingClick={() => setShowFilters((prev) => !prev)}
            suggestions={["Buscar destinos...", "Buscar por categoria...", "Buscar por region..."]}
            effect="fade"
          />

          {showFilters ? (
            <div className="mt-2 rounded-2xl border border-[#D9E5E2] bg-white/95 p-2 shadow-[0_10px_28px_rgba(15,23,42,0.14)] backdrop-blur-sm">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory("")}
                  className="rounded-full border border-[#E2E8F0] px-3 py-1 font-inter text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Todas
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.slug)}
                    className="rounded-full border px-3 py-1 font-inter text-xs font-semibold"
                    style={{
                      borderColor: activeCategory === cat.slug ? "#0D9488" : "#E2E8F0",
                      color: activeCategory === cat.slug ? "#0F766E" : "#475569",
                      backgroundColor: activeCategory === cat.slug ? "rgba(13,148,136,0.08)" : "white",
                    }}
                  >
                    {getEs(cat.name_i18n, cat.slug)}
                  </button>
                ))}
                <button
                  onClick={applyNearby}
                  className="rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-3 py-1 font-inter text-xs font-semibold text-[#0F766E]"
                >
                  Cerca de mi
                </button>
                <button
                  onClick={clearFilters}
                  className="rounded-full border border-[#E2E8F0] px-3 py-1 font-inter text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Limpiar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <PlaceDrawer
        place={selectedPlace as never}
        onClose={() => setSelectedPlaceSlug(null)}
        onAddToRoute={() => undefined}
        onSave={() => undefined}
      />
    </section>
  );
}

