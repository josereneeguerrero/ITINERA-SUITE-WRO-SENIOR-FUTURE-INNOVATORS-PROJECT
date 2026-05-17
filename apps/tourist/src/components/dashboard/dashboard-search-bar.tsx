"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function DashboardSearchBar({ isGuest }: { isGuest: boolean }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const base = isGuest ? "/explore?guest=true" : "/explore";
    router.push(`${base}&q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} role="search" aria-label="Buscar en Itinera">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94a3b8]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca lugares, historias, regiones..."
          aria-label="Buscar lugares, historias y regiones de Honduras"
          className="h-[52px] w-full rounded-2xl border border-[#d7e2de] bg-white pl-12 pr-28 font-inter text-sm text-[#0f172a] shadow-sm outline-none placeholder:text-[#94a3b8] transition-all duration-200 focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/12 hover:border-[#b0c4c0]"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-xl bg-[#0D9488] px-4 py-2 font-inter text-sm font-bold text-white transition-all duration-200 hover:bg-[#0f766e] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
