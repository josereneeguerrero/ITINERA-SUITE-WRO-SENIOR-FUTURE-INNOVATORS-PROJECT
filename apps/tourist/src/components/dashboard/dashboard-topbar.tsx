"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X, Bell, Globe, UserCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Category { id: string; slug: string; name_i18n: Record<string,string>; icon_name: string }

const ICON_MAP: Record<string, string> = {
  landmark: "🏛️", leaf: "🌿", utensils: "🍽️", waves: "🏖️", zap: "⚡", church: "⛪",
};

export function DashboardTopBar({
  categories,
  initialCategory,
  initialQuery,
}: {
  categories: Category[];
  initialCategory?: string;
  initialQuery?: string;
}) {
  const router    = useRouter();
  const pathname  = usePathname();
  const [query,    setQuery]    = useState(initialQuery ?? "");
  const [activeCat, setActiveCat] = useState(initialCategory ?? "");
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserName(
          data.user.user_metadata?.full_name
          ?? data.user.email?.split("@")[0]
          ?? null
        );
      }
    });
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query)     params.set("q", query);
    if (activeCat) params.set("category", activeCat);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleCategory(slug: string) {
    const next = activeCat === slug ? "" : slug;
    setActiveCat(next);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (next)  params.set("category", next);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      className="shrink-0 flex flex-col"
      style={{ backgroundColor: "white", borderBottom: "1px solid #E2E8F0" }}
    >
      {/* Top row */}
      <div className="flex items-center gap-4 px-5 py-3">
        {/* Breadcrumb */}
        <p className="font-inter text-sm hidden md:block" style={{ color: "#94A3B8" }}>
          Explorar / Honduras
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#94A3B8" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en Honduras..."
            className="w-full pl-9 pr-8 h-9 rounded-xl font-inter text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all"
            style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); router.replace(pathname); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
            </button>
          )}
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button className="p-2 rounded-lg transition-colors hover:bg-[#F8FAFC]" style={{ color: "#64748B" }}>
            <Bell className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-inter text-xs font-medium"
            style={{ border: "1px solid #E2E8F0", color: "#64748B" }}>
            <Globe className="w-3.5 h-3.5" />
            ES
          </button>
          {userName ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-inter font-medium text-xs transition-colors hover:bg-[#F8FAFC]"
              style={{ border: "1px solid #E2E8F0", color: "#0F172A" }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: "#0D9488" }}
              >
                {userName[0].toUpperCase()}
              </div>
              {userName.split(" ")[0]}
            </Link>
          ) : (
            <Link href="/bienvenida?redirect=/explore"
              className="btn-teal font-inter font-semibold text-xs px-3.5 py-1.5 rounded-lg">
              Registrarse
            </Link>
          )}
        </div>
      </div>

      {/* Category pills row */}
      <div className="flex items-center gap-1.5 px-5 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleCategory("")}
          className="shrink-0 px-3.5 py-1.5 rounded-full font-inter font-medium text-xs transition-all whitespace-nowrap"
          style={!activeCat ? { backgroundColor: "#0D9488", color: "white" } : { backgroundColor: "#F8FAFC", color: "#64748B", border: "1px solid #E2E8F0" }}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategory(cat.slug)}
            className="shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full font-inter font-medium text-xs transition-all whitespace-nowrap"
            style={activeCat === cat.slug ? { backgroundColor: "#0D9488", color: "white" } : { backgroundColor: "#F8FAFC", color: "#64748B", border: "1px solid #E2E8F0" }}
          >
            <span>{ICON_MAP[cat.icon_name] ?? "📍"}</span>
            {cat.name_i18n?.es}
          </button>
        ))}
      </div>
    </div>
  );
}
