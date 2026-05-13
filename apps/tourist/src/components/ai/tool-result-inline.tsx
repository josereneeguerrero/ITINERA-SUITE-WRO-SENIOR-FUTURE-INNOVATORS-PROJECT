"use client";

import { MapPin, BookOpen, ChevronRight, Plus, ArrowRight } from "lucide-react";

// Compact tool result renderer — used in PlaceAIPanel and StoryAIPanel
export function ToolResultInline({ toolName, result }: { toolName: string; result: unknown }) {
  const data = result as Record<string, unknown>;

  if (toolName === "navigate_to") {
    return (
      <a href={data.navigate as string}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-inter"
        style={{ backgroundColor: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.15)", color: "#0D9488" }}>
        <ArrowRight className="w-3.5 h-3.5" />
        Ir a {data.navigate as string} →
      </a>
    );
  }

  if (toolName === "build_itinerary") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ backgroundColor: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.15)" }}>
        <Plus className="w-3 h-3" style={{ color: "#0D9488" }} />
        <span className="font-inter text-xs font-medium" style={{ color: "#0D9488" }}>
          {data.message as string}
        </span>
      </div>
    );
  }

  if ((toolName === "search_places" || toolName === "get_place_detail" || toolName === "get_place") && (Array.isArray(data.places) || data.place || data.slug)) {
    const places = Array.isArray(data.places)
      ? data.places as { slug: string; name: string; rating: number; category?: string; url: string }[]
      : data.place
        ? [data.place as { slug: string; name: string; rating: number; category?: string; url: string }]
        : [{ slug: data.slug as string, name: data.name as string, rating: data.rating as number, category: data.category as string, url: `/places/${data.slug}` }];
    return (
      <div className="space-y-1.5">
        {places.slice(0, 3).map((p) => (
          <a key={p.slug} href={p.url}
            className="flex items-center gap-2 p-2 rounded-xl transition-all hover:shadow-sm"
            style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: "#0D9488" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-jakarta font-semibold text-[11px] text-[#0F172A] truncate">{p.name}</p>
              <p className="flex items-center gap-1 font-inter text-[10px]" style={{ color: "#0D9488" }}>
                {p.category} · ★{Number(p.rating).toFixed(1)}
              </p>
            </div>
            <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "#0D9488" }} />
          </a>
        ))}
      </div>
    );
  }

  if (toolName === "get_story" && Array.isArray(data.stories)) {
    const stories = data.stories as { slug: string; title: string; url: string }[];
    return (
      <div className="space-y-1.5">
        {stories.slice(0, 2).map((s) => (
          <a key={s.slug} href={s.url}
            className="flex items-center gap-2 p-2 rounded-xl"
            style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(59,130,246,0.08)" }}>
              <BookOpen className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />
            </div>
            <p className="font-jakarta font-semibold text-[11px] text-[#0F172A] flex-1 line-clamp-1">{s.title}</p>
            <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "#3B82F6" }} />
          </a>
        ))}
      </div>
    );
  }

  if (toolName === "recommend_route" && (Array.isArray(data.route) || Array.isArray(data.stops))) {
    const route = (Array.isArray(data.route) ? data.route : data.stops) as { order: number; timeOfDay: string; name: string; url: string }[];
    const icons: Record<string, string> = { morning: "🌅", afternoon: "☀️", evening: "🌙", any: "📍" };
    return (
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
        {route.map((s, i) => (
          <a key={i} href={s.url}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
            style={{ backgroundColor: "white", borderBottom: i < route.length-1 ? "1px solid #F1F5F9" : "none" }}>
            <span className="text-sm shrink-0">{icons[s.timeOfDay]}</span>
            <p className="font-jakarta font-semibold text-[11px] text-[#0F172A] flex-1 truncate">{s.name}</p>
            <ArrowRight className="w-3 h-3 shrink-0" style={{ color: "#0D9488" }} />
          </a>
        ))}
      </div>
    );
  }

  return null;
}
