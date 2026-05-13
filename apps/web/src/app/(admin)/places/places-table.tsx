"use client";

import { useState, useMemo } from "react";
import { MapPin, Plus, Search, Star, X } from "lucide-react";
import Link from "next/link";
import { PublishToggle } from "./publish-toggle";

interface Place {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  status: string;
  aggregated_rating: number;
  review_count: number;
  place_categories: { name_i18n: Record<string, string> } | null;
  regions: { name_i18n: Record<string, string> } | null;
}

export function PlacesTable({ places }: { places: Place[] }) {
  const [query,  setQuery]  = useState("");
  const [status, setStatus] = useState("");

  // Client-side filtering — instant, no server roundtrip
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return places.filter((p) => {
      const name   = p.name_i18n?.es?.toLowerCase() ?? "";
      const slug   = p.slug.toLowerCase();
      const cat    = (p.place_categories as unknown as { name_i18n: Record<string, string> } | null)?.name_i18n?.es?.toLowerCase() ?? "";
      const region = (p.regions as unknown as { name_i18n: Record<string, string> } | null)?.name_i18n?.es?.toLowerCase() ?? "";

      const matchesQuery  = !q || name.includes(q) || slug.includes(q) || cat.includes(q) || region.includes(q);
      const matchesStatus = !status || p.status === status;

      return matchesQuery && matchesStatus;
    });
  }, [places, query, status]);

  return (
    <div className="space-y-4">

      {/* Filter bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg"
        style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}
      >
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6B7280" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar lugares..."
            className="w-full pl-9 pr-8 h-8 rounded-lg font-inter text-sm text-white placeholder:text-[#374151] bg-[#0A0F0F] border border-[#1F2937] outline-none focus:border-[#0D9488] transition-all"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "#6B7280" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 px-3 rounded-lg font-inter text-xs bg-transparent border border-[#1F2937] outline-none focus:border-[#0D9488] transition-all cursor-pointer ml-auto"
          style={{ color: "#6B7280" }}
        >
          <option value="">Estado</option>
          <option value="published">Publicados</option>
          <option value="draft">Borradores</option>
        </select>
      </div>

      {/* Result count */}
      {query && (
        <p className="font-inter text-xs" style={{ color: "#6B7280" }}>
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para &quot;{query}&quot;
        </p>
      )}

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#111827", border: "1px solid #1F2937" }}>
        <div
          className="grid px-4 py-3"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", backgroundColor: "#0D1117", borderBottom: "1px solid #1F2937" }}
        >
          {["NOMBRE", "CATEGORÍA", "REGIÓN", "RATING", "ESTADO", "ACCIONES"].map((h) => (
            <span key={h} className="font-inter font-medium text-[10px] uppercase tracking-widest" style={{ color: "#6B7280" }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="font-inter text-sm" style={{ color: "#6B7280" }}>
              {query ? `Sin resultados para "${query}"` : "Sin lugares"}
            </p>
          </div>
        ) : (
          filtered.map((place, i) => {
            const name = place.name_i18n?.es ?? place.slug;
            const cat  = (place.place_categories as unknown as { name_i18n: Record<string, string> } | null)?.name_i18n?.es;
            const reg  = (place.regions as unknown as { name_i18n: Record<string, string> } | null)?.name_i18n?.es;
            const isLast = i === filtered.length - 1;

            return (
              <div
                key={place.id}
                className="table-row-hover grid px-4 py-3.5 items-center"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", borderBottom: isLast ? "none" : "1px solid #1F2937" }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(13,148,136,0.1)" }}>
                    <MapPin className="w-3.5 h-3.5" style={{ color: "#0D9488" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-inter font-medium text-sm text-white truncate">{name}</p>
                    <p className="font-mono text-[10px] truncate" style={{ color: "#6B7280" }}>{place.slug}</p>
                  </div>
                </div>

                <span className="font-inter text-sm" style={{ color: "#9CA3AF" }}>{cat ?? "—"}</span>
                <span className="font-inter text-sm" style={{ color: "#9CA3AF" }}>{reg ?? "—"}</span>

                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-inter font-medium text-sm text-white">{Number(place.aggregated_rating).toFixed(1)}</span>
                  <span className="font-inter text-xs" style={{ color: "#6B7280" }}>({place.review_count})</span>
                </div>

                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md font-inter font-medium text-xs w-fit"
                  style={
                    place.status === "published"
                      ? { backgroundColor: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.4)", color: "#0D9488" }
                      : { backgroundColor: "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.3)", color: "#6B7280" }
                  }
                >
                  {place.status === "published" ? "Publicado" : "Borrador"}
                </span>

                <div className="flex items-center gap-1">
                  <Link href={`/places/${place.id}`} className="btn-ghost-hover">Editar</Link>
                  <PublishToggle placeId={place.id} currentStatus={place.status} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="font-inter text-xs" style={{ color: "#6B7280" }}>
        Mostrando {filtered.length} de {places.length} lugares
      </p>
    </div>
  );
}
