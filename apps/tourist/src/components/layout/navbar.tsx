"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Menu, X } from "lucide-react";
import { NavbarSearch } from "./navbar-search";

const NAV_LINKS = [
  { href: "/explore",  label: "Explorar" },
  { href: "/stories",  label: "Historias" },
  { href: "/routes",   label: "Rutas" },
];

export function Navbar({
  transparent = false,
  showSearch = false,
}: {
  transparent?: boolean;
  showSearch?: boolean;
}) {
  const pathname  = usePathname();
  const [scrolled, setScrolled]   = useState(false);
  const [lang, setLang]           = useState<"es" | "en">("es");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!transparent) return;
    const handler = () => setScrolled(window.scrollY > 60);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [transparent]);

  const isWhite = !transparent || scrolled;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={
        isWhite
          ? { backgroundColor: "rgba(255,255,255,0.97)", backdropFilter: "blur(8px)", borderBottom: "1px solid #E2E8F0" }
          : { backgroundColor: "transparent" }
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">

        {/* Logo */}
        <Link
          href="/"
          className="font-jakarta font-bold text-xl shrink-0 transition-opacity hover:opacity-80"
          style={{ color: "#0D9488" }}
        >
          Itinera
        </Link>

        {/* Center: functional search or nav links */}
        {showSearch ? (
          <NavbarSearch />
        ) : (
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="font-inter font-medium text-sm transition-colors relative"
                  style={{
                    color: isWhite
                      ? active ? "#0D9488" : "#64748B"
                      : active ? "#0D9488" : "rgba(255,255,255,0.8)",
                  }}
                >
                  {label}
                  {active && (
                    <span
                      className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                      style={{ backgroundColor: "#0D9488" }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-inter font-medium text-xs transition-colors"
            style={{
              color: isWhite ? "#64748B" : "rgba(255,255,255,0.8)",
              border: isWhite ? "1px solid #E2E8F0" : "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <Globe className="w-3 h-3" />
            {lang.toUpperCase()}
          </button>

          <Link
            href="/login"
            className="hidden md:block font-inter font-medium text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: isWhite ? "#64748B" : "rgba(255,255,255,0.85)" }}
          >
            Iniciar sesión
          </Link>

          <Link
            href="/register"
            className="hidden md:block btn-teal font-inter font-semibold text-sm px-4 py-1.5 rounded-lg"
          >
            Registrarse
          </Link>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-1.5 rounded-lg"
            style={{ color: isWhite ? "#64748B" : "white" }}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[#E2E8F0] px-4 py-4 space-y-2">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="block font-inter font-medium text-sm py-2.5 px-3 rounded-lg transition-colors hover:bg-[#F8FAFC]"
              style={{ color: pathname.startsWith(href) ? "#0D9488" : "#64748B" }}
            >
              {label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2 border-t border-[#E2E8F0]">
            <Link href="/login" onClick={() => setMobileOpen(false)}
              className="flex-1 text-center font-inter text-sm py-2 rounded-lg border border-[#E2E8F0] text-[#64748B]">
              Iniciar sesión
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)}
              className="flex-1 text-center btn-teal font-inter font-semibold text-sm py-2 rounded-lg">
              Registrarse
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
