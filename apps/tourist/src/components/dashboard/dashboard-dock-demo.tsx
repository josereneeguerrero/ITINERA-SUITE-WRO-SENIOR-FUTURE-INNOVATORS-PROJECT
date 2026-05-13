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

  return (
    <div className="fixed bottom-3 left-1/2 z-[40] w-full -translate-x-1/2 px-4">
      <Dock
        className="h-auto p-0"
        items={[
          { icon: Home, label: "Inicio", active: pathname === "/dashboard", onClick: () => router.push("/dashboard") },
          { icon: Compass, label: "Explorar", active: pathname === "/explore", onClick: goExplore },
          { icon: Sparkles, label: "IA", onClick: goExplore },
          { icon: Route, label: "Rutas", onClick: () => goProtected("/routes") },
          { icon: Heart, label: "Guardados", onClick: () => goProtected("/profile/saved") },
          { icon: User, label: "Perfil", onClick: () => goProtected("/profile") },
        ]}
      />
    </div>
  );
}
