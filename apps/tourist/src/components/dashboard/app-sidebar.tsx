"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Globe, Map, Star, BookOpen, Landmark, Navigation,
  Sparkles, User, LogIn, ChevronRight, Search, X, Menu,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_SECTIONS = [
  {
    label: "EXPLORAR",
    items: [
      { href: "/explore",   label: "Explorar",   icon: Globe },
      { href: "/routes",    label: "Mi Ruta",    icon: Map },
      { href: "/profile",   label: "Guardados",  icon: Star },
    ],
  },
  {
    label: "CONTENIDO",
    items: [
      { href: "/stories",   label: "Historias",  icon: BookOpen },
      { href: "/explore?category=heritage", label: "Patrimonio", icon: Landmark },
      { href: "/explore?nearby=true", label: "Cerca de mí", icon: Navigation },
    ],
  },
  {
    label: "ASISTENTE IA",
    items: [
      { href: "/explore#ai", label: "Itinera IA", icon: Sparkles, badge: "BETA" },
    ],
  },
];

export function AppSidebar() {
  const pathname     = usePathname();
  const searchParams = useSearchParams(); // safe — no window
  const router       = useRouter();
  const [query,     setQuery]     = useState("");
  const [user,      setUser]      = useState<{ email?: string; name?: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Fetch user on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email,
          name:  data.user.user_metadata?.full_name ?? data.user.email?.split("@")[0],
        });
      }
    });
  }, []);

  function isActive(href: string) {
    const [base, query] = href.split("?");
    const cleanBase = base.split("#")[0];
    if (pathname !== cleanBase) return false;

    if (query) {
      const itemParams = new URLSearchParams(query);
      for (const [key, val] of itemParams.entries()) {
        if (searchParams.get(key) !== val) return false;
      }
    } else {
      if (cleanBase === "/explore" && searchParams.has("category")) return false;
    }
    return true;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
    }
  }

  // Collapsed (mobile/narrow) view
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center py-4 gap-4 shrink-0"
        style={{ width: "56px", backgroundColor: "white", borderRight: "1px solid #E2E8F0" }}
      >
        <button onClick={() => setCollapsed(false)} className="p-2 rounded-lg hover:bg-[#F8FAFC]" style={{ color: "#64748B" }}>
          <Menu className="w-4 h-4" />
        </button>
        {NAV_SECTIONS.flatMap(s => s.items).map(({ href, icon: Icon }) => (
          <Link key={href} href={href}
            className="p-2 rounded-lg transition-colors hover:bg-[#F0FDF9]"
            style={{ color: isActive(href) ? "#0D9488" : "#94A3B8" }}>
            <Icon className="w-4 h-4" />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <aside
      className="w-[260px] shrink-0 flex flex-col overflow-y-auto transition-all"
      style={{ backgroundColor: "white", borderRight: "1px solid #E2E8F0", height: "100%" }}
    >
      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <div>
          <Link href="/" className="font-jakarta font-bold text-xl" style={{ color: "#0D9488" }}>
            Itinera
          </Link>
          <p className="font-inter text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>
            Honduras Cultural
          </p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg transition-colors hover:bg-[#F8FAFC]"
          style={{ color: "#CBD5E1" }}
          title="Colapsar sidebar"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <form onSubmit={handleSearch}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "#94A3B8" }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar lugares..."
              className="flex-1 font-inter text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none bg-transparent"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}>
                <X className="w-3 h-3" style={{ color: "#94A3B8" }} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-4 pb-4 pt-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="font-inter font-semibold text-[10px] uppercase tracking-widest px-3 mb-1"
              style={{ color: "#94A3B8" }}>
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const { href, label, icon: Icon } = item;
                const badge  = "badge" in item ? item.badge : undefined;
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl font-inter font-medium text-sm transition-all ${
                      active ? "nav-item-active" : "nav-item-inactive"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {badge && (
                      <span
                        className="font-inter font-semibold text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: "rgba(124,58,237,0.1)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.2)" }}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 shrink-0" style={{ borderTop: "1px solid #E2E8F0", paddingTop: "12px" }}>
        {user ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
            style={{ backgroundColor: "#F8FAFC" }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-jakarta font-bold text-xs text-white"
              style={{ backgroundColor: "#0D9488" }}
            >
              {(user.name ?? "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-inter font-medium text-xs text-[#0F172A] truncate">{user.name}</p>
              <p className="font-inter text-[10px] truncate" style={{ color: "#94A3B8" }}>{user.email}</p>
            </div>
            <Link href="/profile">
              <ChevronRight className="w-3.5 h-3.5" style={{ color: "#CBD5E1" }} />
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Link
              href="/bienvenida?redirect=/explore"
              className="flex items-center gap-3 px-3 py-2 rounded-xl font-inter font-medium text-sm transition-all nav-item-inactive"
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Crear cuenta</span>
            </Link>
            <Link
              href="/login?redirect=/explore"
              className="flex items-center gap-3 px-3 py-2 rounded-xl font-inter font-medium text-sm transition-all nav-item-inactive"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Iniciar sesión</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
