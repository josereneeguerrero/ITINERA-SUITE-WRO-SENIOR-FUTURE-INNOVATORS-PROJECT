"use client";

import { useState } from "react";
import { Dock } from "@/components/ui/dock-two";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Compass,
  Sparkles,
  BookOpen,
  Route,
  User,
  LogIn,
  X,
} from "lucide-react";

// Returns true if the current path belongs to a section
function isActive(pathname: string, section: string): boolean {
  if (section === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === section || pathname.startsWith(section + "/");
}

export function DashboardDockDemo({ isGuest = false }: { isGuest?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const goProtected = (path: string) => {
    if (isGuest) {
      setShowAuthPrompt(true);
      return;
    }
    router.push(path);
  };

  const goExplore = () => {
    router.push(isGuest ? "/explore?guest=true" : "/explore");
  };

  const goIa = () => {
    router.push(isGuest ? "/ia?guest=true" : "/ia");
  };

  const goStories = () => {
    router.push(isGuest ? "/stories?guest=true" : "/stories");
  };

  const homeHref = isGuest ? "/dashboard?guest=true" : "/dashboard";

  return (
    <>
      {/* Auth prompt — aparece encima del dock cuando guest toca sección protegida */}
      {showAuthPrompt && (
        <div className="fixed bottom-24 left-1/2 z-[46] w-full max-w-sm -translate-x-1/2 px-4">
          <div className="rounded-2xl border border-[#d7e2de] bg-white px-5 py-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-jakarta text-sm font-bold text-[#0f172a]">
                  Necesitas una cuenta
                </p>
                <p className="mt-1 font-inter text-xs text-[#64748b]">
                  Rutas y Perfil requieren iniciar sesión para guardar tu progreso.
                </p>
              </div>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="shrink-0 cursor-pointer rounded-lg p-1 text-[#94a3b8] hover:text-[#64748b]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { setShowAuthPrompt(false); router.push("/register"); }}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#0D9488] px-4 py-2 font-inter text-xs font-bold text-white transition-colors hover:bg-[#0f766e]"
              >
                Crear cuenta gratis
              </button>
              <button
                onClick={() => { setShowAuthPrompt(false); router.push("/login"); }}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#d7e2de] px-4 py-2 font-inter text-xs font-semibold text-[#475569] transition-colors hover:border-[#0D9488]/30 hover:text-[#0D9488]"
              >
                <LogIn className="h-3.5 w-3.5" />
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="fixed bottom-3 left-1/2 z-[45] w-full -translate-x-1/2 px-4">
      <Dock
        className="h-auto p-0"
        items={[
          {
            icon: Home,
            label: "Inicio",
            active: isActive(pathname, "/dashboard"),
            onClick: () => router.push(homeHref),
          },
          {
            icon: Compass,
            label: "Explorar",
            active: isActive(pathname, "/explore") || isActive(pathname, "/places"),
            onClick: goExplore,
          },
          {
            icon: Sparkles,
            label: "IA",
            active: isActive(pathname, "/ia"),
            onClick: goIa,
          },
          {
            icon: BookOpen,
            label: "Historias",
            active: isActive(pathname, "/stories"),
            onClick: goStories,
          },
          {
            icon: Route,
            label: "Rutas",
            active: isActive(pathname, "/routes"),
            onClick: () => goProtected("/routes"),
            locked: isGuest,
          },
          {
            icon: User,
            label: "Perfil",
            active: isActive(pathname, "/profile"),
            onClick: () => goProtected("/profile"),
            locked: isGuest,
          },
        ]}
      />
    </div>
    </>
  );
}
