"use client";

import { Dock } from "@/components/ui/dock-two";
import {
  Home,
  Search,
  Sparkles,
  Heart,
  Plus,
  User,
  Settings,
} from "lucide-react";

export function DashboardDockDemo() {
  return (
    <div className="fixed bottom-3 left-1/2 z-[40] w-full -translate-x-1/2 px-4">
      <Dock
        className="h-auto p-0"
        items={[
          { icon: Home, label: "Inicio" },
          { icon: Search, label: "Buscar" },
          { icon: Sparkles, label: "IA" },
          { icon: Heart, label: "Favoritos" },
          { icon: Plus, label: "Nuevo" },
          { icon: User, label: "Perfil" },
          { icon: Settings, label: "Ajustes" },
        ]}
      />
    </div>
  );
}
