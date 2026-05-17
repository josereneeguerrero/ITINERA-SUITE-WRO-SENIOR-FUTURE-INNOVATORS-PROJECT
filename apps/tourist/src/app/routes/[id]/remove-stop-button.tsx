"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { removeStop } from "../actions";

export function RemoveStopButton({ stopId, routeId }: { stopId: string; routeId: string }) {
  const [removing, setRemoving] = useState(false);
  const router = useRouter();

  async function handle() {
    if (!confirm("¿Quitar esta parada de la ruta?")) return;
    setRemoving(true);
    await removeStop(stopId, routeId);
    router.refresh();
  }

  return (
    <button
      onClick={handle}
      disabled={removing}
      title="Quitar parada"
      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#94A3B8] transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626] disabled:opacity-40"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
