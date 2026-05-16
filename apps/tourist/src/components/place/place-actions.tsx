"use client";

import { useState } from "react";
import { Heart, Share2, MapPin, Plus, Check, Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface PlaceActionsProps {
  placeId: string;
  placeSlug: string;
  placeName: string;
  isGuest?: boolean;
}

export function PlaceActions({ placeId, placeSlug, placeName, isGuest }: PlaceActionsProps) {
  const router = useRouter();
  const [saved, setSaved]   = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSave() {
    if (isGuest) {
      router.push(`/bienvenida?redirect=/places/${placeSlug}`);
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (saved) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("place_id", placeId);
      setSaved(false);
    } else {
      await supabase.from("favorites").upsert({ user_id: user.id, place_id: placeId });
      setSaved(true);
    }
  }

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleOpenMap() {
    // Emit global event so the map in /explore can show this place
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("itinera:ui-actions", {
          detail: { intent: "show_place", actions: [{ type: "show_place", slug: placeSlug }] },
        })
      );
    }
    router.push(`/explore?place=${placeSlug}`);
  }

  function handleAddToRoute() {
    router.push(`/explore?addToRoute=${placeSlug}&name=${encodeURIComponent(placeName)}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Save */}
      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 rounded-full px-3 py-2 font-inter text-xs font-semibold transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
        style={
          saved
            ? { backgroundColor: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.3)", color: "#BE185D" }
            : { backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white" }
        }
        aria-label={saved ? "Quitar de favoritos" : "Guardar en favoritos"}
      >
        <Heart className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
        {saved ? "Guardado" : "Guardar"}
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 rounded-full px-3 py-2 font-inter text-xs font-semibold transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
        style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white" }}
        aria-label="Compartir enlace"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
        {copied ? "¡Copiado!" : "Compartir"}
      </button>

      {/* Open in map */}
      <button
        onClick={handleOpenMap}
        className="flex items-center gap-1.5 rounded-full px-3 py-2 font-inter text-xs font-semibold transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
        style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white" }}
        aria-label="Ver en el mapa"
      >
        <MapPin className="w-3.5 h-3.5" />
        Ver en mapa
      </button>

      {/* Add to route */}
      <button
        onClick={handleAddToRoute}
        className="flex items-center gap-1.5 rounded-full px-4 py-2 font-inter text-xs font-bold transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
        style={{ backgroundColor: "white", color: "#0D9488" }}
        aria-label="Agregar a ruta"
      >
        <Plus className="w-3.5 h-3.5" />
        Agregar a ruta
      </button>
    </div>
  );
}
