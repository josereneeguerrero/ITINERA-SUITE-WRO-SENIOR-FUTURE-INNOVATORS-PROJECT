"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Camera, ImageOff } from "lucide-react";

interface Photo {
  id: string;
  storage_bucket: string;
  storage_path: string;
  alt_i18n: Record<string, string>;
  sort_order: number;
}

function buildUrl(bucket: string, path: string): string {
  // External URLs (Unsplash, CDN, etc.) stored directly in storage_path
  if (bucket === "external" || path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function PlacePhotoSlider({
  photos,
  placeName,
}: {
  photos: Photo[];
  placeName: string;
}) {
  const [idx, setIdx] = useState(0);

  // ── No photos ──────────────────────────────────────────────────────────
  if (photos.length === 0) {
    return (
      <div
        className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#0D9488]" />
            <p className="font-jakarta font-bold text-sm text-[#0F172A]">Galería de imágenes</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(13,148,136,0.06)" }}
          >
            <ImageOff className="w-6 h-6 text-[#CBD5E1]" />
          </div>
          <p className="font-jakarta font-bold text-sm text-[#0F172A]">Sin fotos aún</p>
          <p className="font-inter text-xs text-[#94A3B8] max-w-xs leading-relaxed">
            Las fotos de <strong>{placeName}</strong> aparecerán aquí cuando sean agregadas por el equipo.
          </p>
        </div>
      </div>
    );
  }

  // ── With photos ────────────────────────────────────────────────────────
  function prev() { setIdx(i => (i - 1 + photos.length) % photos.length); }
  function next() { setIdx(i => (i + 1) % photos.length); }

  const current = photos[idx];
  const src = buildUrl(current.storage_bucket, current.storage_path);
  const alt = current.alt_i18n?.es ?? `${placeName} — foto ${idx + 1}`;

  return (
    <div
      className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden"
      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#0D9488]" />
          <p className="font-jakarta font-bold text-sm text-[#0F172A]">Galería de imágenes</p>
        </div>
        <p className="font-inter text-xs text-[#94A3B8]">{idx + 1} / {photos.length}</p>
      </div>

      {/* Image */}
      <div className="relative aspect-[16/9] bg-[#F8FAFC]">
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, 640px"
          priority={idx === 0}
        />

        {/* Gradient overlay bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

        {/* Nav buttons */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
              style={{ backgroundColor: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-5 h-5 text-[#334155]" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
              style={{ backgroundColor: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}
              aria-label="Foto siguiente"
            >
              <ChevronRight className="w-5 h-5 text-[#334155]" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className="rounded-full transition-all cursor-pointer"
                  style={{
                    width: i === idx ? "20px" : "6px",
                    height: "6px",
                    backgroundColor: i === idx ? "white" : "rgba(255,255,255,0.5)",
                  }}
                  aria-label={`Foto ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Caption */}
      {alt && (
        <div className="px-5 py-3">
          <p className="font-inter text-xs text-[#64748B]">{alt}</p>
        </div>
      )}
    </div>
  );
}
