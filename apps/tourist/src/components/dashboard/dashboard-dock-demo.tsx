"use client";

import { Dock } from "@/components/ui/dock-two";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Compass,
  Sparkles,
  BookOpen,
  Route,
  User,
} from "lucide-react";

// Returns true if the current path belongs to a section
function isActive(pathname: string, section: string): boolean {
  if (section === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === section || pathname.startsWith(section + "/");
}

export function DashboardDockDemo({ isGuest = false }: { isGuest?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  const goProtected = (path: string) => {
    if (isGuest) {
      router.push(`/bienvenida?redirect=${encodeURIComponent(path)}`);
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
  );
}
