"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Globe, Lock, Check, Copy, Pencil, X } from "lucide-react";
import { deleteRoute, toggleRoutePublic, renameRoute } from "./actions";

export function RouteCardActions({
  routeId,
  isPublic,
  shareUrl,
  currentTitle,
}: {
  routeId: string;
  isPublic: boolean;
  shareUrl: string;
  currentTitle: string;
}) {
  const router = useRouter();
  const [pub, setPub]           = useState(isPublic);
  const [copied, setCopied]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(currentTitle);
  const [saving, setSaving]     = useState(false);

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

  async function handleRename() {
    if (!newTitle.trim() || newTitle === currentTitle) { setRenaming(false); return; }
    setSaving(true);
    await renameRoute(routeId, newTitle.trim());
    setSaving(false);
    setRenaming(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 border-t border-[#F1F5F9] pt-3">
      {/* Rename input */}
      {renaming && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void handleRename(); if (e.key === "Escape") setRenaming(false); }}
            className="flex-1 rounded-lg border border-[#0D9488]/40 px-2.5 py-1.5 font-inter text-sm text-[#0F172A] outline-none"
          />
          <button onClick={handleRename} disabled={saving}
            className="rounded-lg bg-[#0D9488] px-3 py-1.5 font-inter text-xs font-semibold text-white disabled:opacity-50">
            {saving ? "..." : "OK"}
          </button>
          <button onClick={() => setRenaming(false)}
            className="rounded-lg p-1.5 text-[#94A3B8] hover:text-[#64748B]">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
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

      {/* Rename */}
      <button
        onClick={() => setRenaming(true)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-inter text-xs font-medium text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#0D9488]"
        title="Renombrar ruta"
      >
        <Pencil className="h-3.5 w-3.5" />
        Renombrar
      </button>

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
    </div>
  );
}
