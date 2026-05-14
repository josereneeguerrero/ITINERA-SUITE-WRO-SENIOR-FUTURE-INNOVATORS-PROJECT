"use client";

import { useMemo, useState } from "react";
import { MapPin, Search, Star } from "lucide-react";
import SuggestiveSearch from "@/components/ui/suggestive-search";
import { ExploreMap } from "@/components/explore/explore-map";
import { getCategoryColor } from "@/lib/category-theme";

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

function scorePlace(place: Place, query: string) {
  const q = normalize(query);
  if (!q) return 0;

  const name = normalize(getEs(place.name_i18n, place.slug));
  const category = normalize(getEs(place.place_categories?.name_i18n, ""));
  const region = normalize(getEs(place.regions?.name_i18n, ""));
  const slug = normalize(place.slug);

  let score = 0;
  if (name === q) score += 100;
  if (name.startsWith(q)) score += 60;
  if (name.includes(q)) score += 40;
  if (slug.includes(q)) score += 30;
  if (category.includes(q)) score += 20;
  if (region.includes(q)) score += 15;
  score += Number(place.aggregated_rating ?? 0);
  return score;
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
  const searchSuggestions = useMemo(() => {
    const q = normalize(query);
    if (q.length < 1) return [];
    return places
      .map((place) => ({ place, score: scorePlace(place, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
      .map((item) => item.place);
  }, [places, query]);
  const showSearchPanel = query.trim().length > 0 && searchSuggestions.length > 0;

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

  function selectPlaceFromSearch(place: Place) {
    setSelectedPlaceSlug(place.slug);
    setMapCenter(typeof place.lng === "number" && typeof place.lat === "number" ? [place.lng, place.lat] : null);
    setMapZoom(12);
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
              const first = searchSuggestions[0] ?? filteredPlaces[0];
              if (first) selectPlaceFromSearch(first);
            }}
            onTrailingClick={() => setShowFilters((prev) => !prev)}
            suggestions={["Buscar destinos...", "Buscar por categoria...", "Buscar por region..."]}
            effect="fade"
          />

          {showSearchPanel ? (
            <div className="mt-2 overflow-hidden rounded-2xl border border-[#D9E5E2] bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.16)] backdrop-blur-md">
              <div className="border-b border-[#E2E8F0] px-4 py-2 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
                Sugerencias
              </div>
              <div className="max-h-[360px] overflow-y-auto p-2">
                {searchSuggestions.map((place) => {
                  const category = place.place_categories;
                  const color = getCategoryColor({
                    slug: category?.slug ?? "",
                    iconName: category?.icon_name ?? "",
                    label: category?.name_i18n?.es ?? category?.name_i18n?.en ?? "",
                  });

                  return (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => selectPlaceFromSearch(place)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#F8FAFC]"
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                        style={{ backgroundColor: color }}
                      >
                        <MapPin className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-jakarta text-sm font-bold text-[#0F172A]">
                          {getEs(place.name_i18n, place.slug)}
                        </span>
                        <span className="mt-0.5 block truncate font-inter text-xs text-[#64748B]">
                          {getEs(category?.name_i18n, "Lugar")} · {getEs(place.regions?.name_i18n, "Honduras")}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 font-inter text-xs font-semibold text-[#64748B]">
                        <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                        {Number(place.aggregated_rating).toFixed(1)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : query.trim().length > 0 ? (
            <div className="mt-2 rounded-2xl border border-[#D9E5E2] bg-white/95 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-md">
              <div className="flex items-center gap-3 font-inter text-sm text-[#64748B]">
                <Search className="h-4 w-4" />
                No encontramos destinos parecidos.
              </div>
            </div>
          ) : null}

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

    </section>
  );
}
