"use client";

import { useState } from "react";
import { Star, Send, CheckCircle, AlertCircle } from "lucide-react";
import { submitReview } from "@/app/places/[slug]/actions";

export function ReviewForm({ placeId, placeSlug }: { placeId: string; placeSlug: string }) {
  const [rating, setRating]   = useState(0);
  const [hovered, setHovered] = useState(0);
  const [body, setBody]       = useState("");
  const [status, setStatus]   = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setErrorMsg("Selecciona una calificación"); return; }
    setStatus("loading");
    setErrorMsg("");
    const result = await submitReview(placeId, placeSlug, rating, body);
    if ("error" in result) {
      setStatus("error");
      setErrorMsg(result.error);
    } else {
      setStatus("ok");
      setRating(0);
      setBody("");
    }
  }

  if (status === "ok") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center rounded-2xl border border-[#E2E8F0] bg-white">
        <CheckCircle className="w-10 h-10 text-[#0D9488]" />
        <p className="font-jakarta font-bold text-base text-[#0F172A]">¡Gracias por tu reseña!</p>
        <p className="font-inter text-sm text-[#64748B]">Tu experiencia está en moderación y se publicará pronto.</p>
        <button
          onClick={() => setStatus("idle")}
          className="font-inter text-sm font-semibold text-[#0D9488] hover:underline cursor-pointer"
        >
          Escribir otra reseña
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[#E2E8F0] bg-white p-5 space-y-4">
      <h3 className="font-jakarta font-bold text-base text-[#0F172A]">Escribe tu reseña</h3>

      {/* Star rating */}
      <div>
        <p className="font-inter text-xs font-medium text-[#64748B] mb-2">Tu calificación *</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="p-0.5 transition-transform duration-100 hover:scale-110 cursor-pointer"
              aria-label={`${star} estrella${star !== 1 ? "s" : ""}`}
            >
              <Star
                className="w-7 h-7 transition-colors duration-100"
                style={{
                  color:  (hovered || rating) >= star ? "#FBBF24" : "#E2E8F0",
                  fill:   (hovered || rating) >= star ? "#FBBF24" : "#E2E8F0",
                }}
              />
            </button>
          ))}
          {(hovered || rating) > 0 && (
            <span className="ml-2 font-inter text-xs text-[#64748B]">
              {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][hovered || rating]}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div>
        <label htmlFor="review-body" className="block font-inter text-xs font-medium text-[#64748B] mb-2">
          Tu experiencia <span className="text-[#94A3B8]">(opcional)</span>
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Comparte lo que viviste aquí..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl font-inter text-sm text-[#0F172A] placeholder:text-[#CBD5E1] outline-none resize-none transition-colors"
          style={{ border: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}
          onFocus={(e) => (e.target.style.borderColor = "#0D9488")}
          onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
        />
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 font-inter text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading" || rating === 0}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-inter font-semibold text-sm text-white transition-all duration-200 cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#0D9488" }}
      >
        <Send className="w-3.5 h-3.5" />
        {status === "loading" ? "Enviando..." : "Publicar reseña"}
      </button>
    </form>
  );
}
