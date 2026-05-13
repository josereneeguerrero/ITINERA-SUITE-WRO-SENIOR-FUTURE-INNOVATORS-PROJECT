import { Dock } from "@/components/ui/dock-two";
import {
  Home,
  Search,
  Music,
  Heart,
  Settings,
  Plus,
  User,
} from "lucide-react";

function DockDemo() {
  const items = [
    { icon: Home, label: "Inicio" },
    { icon: Search, label: "Buscar" },
    { icon: Music, label: "Audio" },
    { icon: Heart, label: "Favoritos" },
    { icon: Plus, label: "Nuevo" },
    { icon: User, label: "Perfil" },
    { icon: Settings, label: "Ajustes" },
  ];

  return <Dock items={items} />;
}

export { DockDemo };
