"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export function LandingNav() {
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // Show when near top (< 60px) or scrolling up; hide when scrolling down past threshold
      if (y < 60) {
        setVisible(true);
      } else if (y > lastY + 6) {
        setVisible(false); // scrolling down
      } else if (y < lastY - 6) {
        setVisible(true);  // scrolling up
      }
      setLastY(y);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastY]);

  return (
    <header
      className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-7xl transition-all duration-300"
      style={{
        transform: visible ? "translateY(0)" : "translateY(-120%)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="flex items-center justify-between rounded-2xl border border-[#d7e2de]/80 bg-white px-5 py-3 shadow-sm">
        <Link
          href="/"
          className="cursor-pointer font-jakarta text-lg font-bold text-[#0D9488] transition-opacity hover:opacity-80"
        >
          Itinera
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="cursor-pointer font-inter text-sm font-semibold text-[#334155] transition-colors hover:text-[#0D9488]"
          >
            Entrar
          </Link>
          <Link
            href="/bienvenida?redirect=/dashboard"
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-[#0D9488] px-4 py-2 font-inter text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#0f766e] hover:shadow-md active:scale-95"
          >
            Explorar <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
