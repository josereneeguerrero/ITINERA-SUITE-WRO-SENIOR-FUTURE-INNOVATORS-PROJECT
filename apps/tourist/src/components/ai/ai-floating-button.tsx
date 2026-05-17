"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { AIDrawer } from "./ai-drawer";
import { AIErrorBoundary } from "./ai-error-boundary";
import { type ChatContext } from "@/hooks/use-streaming-chat";

export function AIFloatingButton({ context = {} }: { context?: ChatContext }) {
  const [open, setOpen] = useState(false);

  return (
    <AIErrorBoundary>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-24 right-4 z-[46] flex items-center gap-2 rounded-full font-inter font-semibold text-sm text-white shadow-lg transition-all"
        style={{
          backgroundColor: "#0D9488",
          padding: open ? "10px 16px" : "14px",
          boxShadow: "0 4px 20px rgba(13,148,136,0.4)",
          position: "fixed",
        }}
        aria-label="Abrir asistente IA"
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <>
            <span className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ backgroundColor: "#0D9488" }} />
            <Sparkles className="w-5 h-5 relative z-10" />
            <span className="relative z-10 hidden sm:inline">Itinera IA</span>
          </>
        )}
      </button>

      {/* Drawer — only mount when opened to avoid hook issues while hidden */}
      {open && (
        <AIDrawer
          open={open}
          onClose={() => setOpen(false)}
          context={context}
        />
      )}
    </AIErrorBoundary>
  );
}
