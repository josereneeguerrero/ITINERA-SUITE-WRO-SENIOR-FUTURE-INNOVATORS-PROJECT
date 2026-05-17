"use client";

import { Dock } from "@/components/ui/dock-two";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Compass,
  Sparkles,
  Heart,
  Route,
  User,
} from "lucide-react";

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

  const homeHref = isGuest ? "/dashboard?guest=true" : "/dashboard";

  return (
    <div className="fixed bottom-3 left-1/2 z-[40] w-full -translate-x-1/2 px-4">
      <Dock
        className="h-auto p-0"
        items={[
          { icon: Home, label: "Inicio", active: pathname === "/dashboard", onClick: () => router.push(homeHref) },
          { icon: Compass, label: "Explorar", active: pathname === "/explore", onClick: goExplore },
          { icon: Sparkles, label: "IA", active: pathname === "/ia", onClick: () => router.push(isGuest ? "/ia?guest=true" : "/ia") },
          { icon: Route, label: "Rutas", active: pathname === "/routes", onClick: () => goProtected("/routes") },
          { icon: Heart, label: "Guardados", active: pathname === "/profile/saved", onClick: () => goProtected("/profile/saved") },
          { icon: User, label: "Perfil", active: pathname === "/profile", onClick: () => goProtected("/profile") },
        ]}
      />
    </div>
  );
}
