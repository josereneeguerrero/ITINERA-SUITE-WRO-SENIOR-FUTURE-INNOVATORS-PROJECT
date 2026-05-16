"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Camera } from "lucide-react";

// ── Curated Unsplash pools by category ───────────────────────────────────
const PHOTOS_BY_CATEGORY: Record<string, string[]> = {
  heritage: [
    "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1482881497185-d4a9ddbe4151?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1524799526615-766a9833dec0?q=80&w=1200&auto=format&fit=crop",
  ],
  nature: [
    "https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518729571851-5e6e5b4e4e3b?q=80&w=1200&auto=format&fit=crop",
  ],
  beach: [
    "https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1200&auto=format&fit=crop",
  ],
  food: [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1200&auto=format&fit=crop",
  ],
  adventure: [
    "https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200&auto=format&fit=crop",
  ],
  religion: [
    "https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519500099198-fd81846b8d4b?q=80&w=1200&auto=format&fit=crop",
  ],
  arts: [
    "https://images.unsplash.com/photo-1541367777708-7905fe3296c0?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1578301978018-3005759f48f7?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1570722212218-619b6d22f6ab?q=80&w=1200&auto=format&fit=crop",
  ],
};

const DEFAULT_PHOTOS = [
  "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=1200&auto=format&fit=crop",
];

export function PlacePhotoSlider({
  categorySlug,
  placeName,
}: {
  categorySlug: string;
  placeName: string;
}) {
  const photos = PHOTOS_BY_CATEGORY[categorySlug] ?? DEFAULT_PHOTOS;
  const [idx, setIdx] = useState(0);

  function prev() { setIdx(i => (i - 1 + photos.length) % photos.length); }
  function next() { setIdx(i => (i + 1) % photos.length); }

  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden"
      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>

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
          src={photos[idx]}
          alt={`${placeName} — foto ${idx + 1}`}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, 640px"
          priority={idx === 0}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Nav buttons */}
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
      </div>

      {/* Caption */}
      <div className="px-5 py-3 flex items-center justify-between">
        <p className="font-inter text-xs text-[#94A3B8]">{placeName}</p>
        <p className="font-inter text-[10px] text-[#CBD5E1]">Unsplash</p>
      </div>
    </div>
  );
}
