"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, X } from "lucide-react";

const SUGGESTIONS = [
  "Ruinas de Copán",
  "Playa West Bay",
  "Historia Maya",
  "Naturaleza Honduras",
  "Gastronomía típica",
];

export function NavbarSearch() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [query,   setQuery]   = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    const dest = q
      ? `/explore?q=${encodeURIComponent(q)}`
      : "/explore";
    router.push(`/bienvenida?redirect=${encodeURIComponent(dest)}`);
    setFocused(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function handleSuggestion(s: string) {
    router.push(`/bienvenida?redirect=${encodeURIComponent(`/explore?q=${encodeURIComponent(s)}`)}`);
    setFocused(false);
    setQuery("");
  }

  return (
    <div className="hidden md:block flex-1 max-w-md mx-auto relative">
      <form onSubmit={handleSubmit}>
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-full cursor-text transition-all"
          style={{
            backgroundColor: "white",
            border: focused ? "1.5px solid #0D9488" : "1px solid #E2E8F0",
            boxShadow: focused
              ? "0 0 0 3px rgba(13,148,136,0.1)"
              : "0 2px 8px rgba(0,0,0,0.06)",
          }}
          onClick={() => inputRef.current?.focus()}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: focused ? "#0D9488" : "#94A3B8" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="¿A dónde quieres ir?"
            className="flex-1 font-inter text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none bg-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="shrink-0 p-0.5 rounded-full transition-colors hover:bg-[#F1F5F9]"
            >
              <X className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
            </button>
          )}
          <button
            type="submit"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-inter font-semibold text-white shrink-0 transition-all hover:opacity-90"
            style={{ backgroundColor: "#0D9488" }}
          >
            <Sparkles className="w-3 h-3" />
            IA
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {focused && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
          style={{ backgroundColor: "white", border: "1px solid #E2E8F0", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}
        >
          <div className="px-4 py-2.5" style={{ borderBottom: "1px solid #F1F5F9" }}>
            <p className="font-inter text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#94A3B8" }}>
              BÚSQUEDAS POPULARES
            </p>
          </div>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#F8FAFC]"
            >
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "#94A3B8" }} />
              <span className="font-inter text-sm text-[#0F172A]">{s}</span>
            </button>
          ))}
          <div className="px-4 py-3" style={{ borderTop: "1px solid #F1F5F9" }}>
            <p className="font-inter text-xs" style={{ color: "#94A3B8" }}>
              Presiona <kbd className="px-1.5 py-0.5 rounded text-[10px]"
                style={{ backgroundColor: "#F1F5F9", color: "#64748B" }}>Enter</kbd> para buscar con IA
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
