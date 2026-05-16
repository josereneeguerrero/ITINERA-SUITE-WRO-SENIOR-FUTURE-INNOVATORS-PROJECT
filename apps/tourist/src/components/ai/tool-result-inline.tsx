"use client";

import { MapPin, BookOpen, ChevronRight, Plus, ArrowRight, Star, Map } from "lucide-react";

function showOnMap(slug: string) {
  window.dispatchEvent(
    new CustomEvent("itinera:ui-actions", {
      detail: {
        intent: "show_place",
        actions: [{ type: "show_place", slug }],
      },
    })
  );
}

export function ToolResultInline({ toolName, result }: { toolName: string; result: unknown }) {
  const data = result as Record<string, unknown>;

  if (toolName === "navigate_to") {
    return (
      <a
        href={data.navigate as string}
        className="flex items-center gap-2 rounded-xl px-3 py-2 font-inter text-xs"
        style={{
          backgroundColor: "rgba(13,148,136,0.06)",
          border: "1px solid rgba(13,148,136,0.15)",
          color: "#0D9488",
        }}
      >
        <ArrowRight className="h-3.5 w-3.5" />
        Ir a {data.navigate as string}
      </a>
    );
  }

  if (toolName === "build_itinerary") {
    return (
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ backgroundColor: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.15)" }}
      >
        <Plus className="h-3 w-3" style={{ color: "#0D9488" }} />
        <span className="font-inter text-xs font-medium" style={{ color: "#0D9488" }}>
          {data.message as string}
        </span>
      </div>
    );
  }

  if (
    (toolName === "search_places" || toolName === "get_place_detail" || toolName === "get_place") &&
    (Array.isArray(data.places) || data.place || data.slug)
  ) {
    const places = Array.isArray(data.places)
      ? (data.places as { slug: string; name: string; rating: number; category?: string; url: string }[])
      : data.place
        ? [data.place as { slug: string; name: string; rating: number; category?: string; url: string }]
        : [
            {
              slug: data.slug as string,
              name: data.name as string,
              rating: data.rating as number,
              category: data.category as string,
              url: `/places/${data.slug}`,
            },
          ];

    return (
      <div className="space-y-1.5">
        {places.slice(0, 3).map((p) => (
          <div
            key={p.slug}
            className="flex items-center gap-2 rounded-xl p-2 transition-all hover:shadow-sm"
            style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}
          >
            {/* Icon */}
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: "rgba(13,148,136,0.08)" }}
            >
              <MapPin className="h-3.5 w-3.5" style={{ color: "#0D9488" }} />
            </div>

            {/* Info — click lleva a /places */}
            <a href={p.url} className="min-w-0 flex-1">
              <p className="truncate font-jakarta text-[11px] font-semibold text-[#0F172A]">{p.name}</p>
              <p className="flex items-center gap-1 font-inter text-[10px]" style={{ color: "#0D9488" }}>
                {p.category}
                {typeof p.rating === "number" ? (
                  <>
                    <span>|</span>
                    <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
                    {Number(p.rating).toFixed(1)}
                  </>
                ) : null}
              </p>
            </a>

            {/* Ver en mapa */}
            <button
              onClick={() => showOnMap(p.slug)}
              title="Ver en el mapa"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-teal-50"
              style={{ color: "#0D9488" }}
            >
              <Map className="h-3.5 w-3.5" />
            </button>

            {/* Ver detalle → /places */}
            <a href={p.url} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-gray-50">
              <ChevronRight className="h-3 w-3" style={{ color: "#94A3B8" }} />
            </a>
          </div>
        ))}
      </div>
    );
  }

  if (toolName === "get_story" && Array.isArray(data.stories)) {
    const stories = data.stories as { slug: string; title: string; url: string }[];
    return (
      <div className="space-y-1.5">
        {stories.slice(0, 2).map((s) => (
          <a
            key={s.slug}
            href={s.url}
            className="flex items-center gap-2 rounded-xl p-2"
            style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: "rgba(59,130,246,0.08)" }}
            >
              <BookOpen className="h-3.5 w-3.5" style={{ color: "#3B82F6" }} />
            </div>
            <p className="line-clamp-1 flex-1 font-jakarta text-[11px] font-semibold text-[#0F172A]">{s.title}</p>
            <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "#3B82F6" }} />
          </a>
        ))}
      </div>
    );
  }

  if (toolName === "recommend_route" && (Array.isArray(data.route) || Array.isArray(data.stops))) {
    const route = (Array.isArray(data.route) ? data.route : data.stops) as {
      order: number;
      timeOfDay: string;
      name: string;
      url: string;
    }[];
    const labels: Record<string, string> = { morning: "Manana", afternoon: "Tarde", evening: "Noche", any: "Parada" };

    return (
      <div className="overflow-hidden rounded-xl" style={{ border: "1px solid #E2E8F0" }}>
        {route.map((s, i) => (
          <a
            key={`${s.order}-${s.name}`}
            href={s.url}
            className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-gray-50"
            style={{ backgroundColor: "white", borderBottom: i < route.length - 1 ? "1px solid #F1F5F9" : "none" }}
          >
            <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 font-inter text-[10px] font-semibold text-[#0D9488]">
              {labels[s.timeOfDay] ?? "Parada"}
            </span>
            <p className="flex-1 truncate font-jakarta text-[11px] font-semibold text-[#0F172A]">{s.name}</p>
            <ArrowRight className="h-3 w-3 shrink-0" style={{ color: "#0D9488" }} />
          </a>
        ))}
      </div>
    );
  }

  return null;
}
