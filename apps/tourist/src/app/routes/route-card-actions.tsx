"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Share2, Trash2, Globe, Lock, Check, Copy } from "lucide-react";
import { deleteRoute, toggleRoutePublic } from "./actions";

export function RouteCardActions({
  routeId,
  isPublic,
  shareUrl,
}: {
  routeId: string;
  isPublic: boolean;
  shareUrl: string;
}) {
  const router = useRouter();
  const [pub, setPub]       = useState(isPublic);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleTogglePublic() {
    await toggleRoutePublic(routeId, !pub);
    setPub(!pub);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta ruta?")) return;
    setDeleting(true);
    await deleteRoute(routeId);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 border-t border-[#F1F5F9] pt-3">
      {/* Toggle public */}
      <button
        onClick={handleTogglePublic}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-inter text-xs font-medium transition-colors hover:bg-[#F8FAFC]"
        style={{ color: pub ? "#0D9488" : "#64748B" }}
        title={pub ? "Hacer privada" : "Hacer pública"}
      >
        {pub ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        {pub ? "Pública" : "Privada"}
      </button>

      {/* Copy link (only if public) */}
      {pub && (
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-inter text-xs font-medium transition-colors hover:bg-[#F8FAFC]"
          style={{ color: copied ? "#16A34A" : "#64748B" }}
          title="Copiar enlace"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "¡Copiado!" : "Copiar link"}
        </button>
      )}

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-inter text-xs font-medium transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626] disabled:opacity-50"
        style={{ color: "#94A3B8" }}
        title="Eliminar ruta"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {deleting ? "Eliminando..." : "Eliminar"}
      </button>
    </div>
  );
}
