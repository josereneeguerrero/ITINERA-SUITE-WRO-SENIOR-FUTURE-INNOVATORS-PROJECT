"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Mic, Plus, Calendar } from "lucide-react";
import { useStreamingChat } from "@/hooks/use-streaming-chat";
import { ToolResultInline } from "@/components/ai/tool-result-inline";

interface Place {
  slug: string;
  name_i18n: Record<string, string>;
  place_categories: { name_i18n: Record<string, string> } | null;
}

const PLACE_CHIPS = [
  "¿Qué me recomiendas ver aquí?",
  "Cuéntame la historia de este lugar",
  "¿Cuáles son los horarios?",
  "Dame consejos para visitarlo",
];

export function PlaceAIPanel({ place }: { place: Place }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const name = (place.name_i18n as Record<string,string>)?.es ?? place.slug;

  const { messages, isLoading, send } = useStreamingChat({
    page:      "place",
    placeSlug: place.slug,
    placeName: name,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
    setInput("");
  }

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", height: "520px" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 shrink-0"
        style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)" }}>
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-inter font-semibold text-sm text-white">Itinera IA</p>
          <p className="font-inter text-[10px] text-white/60 truncate">Pregunta sobre {name}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="font-inter text-[10px] text-white/50">En línea</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
        style={{ backgroundColor: "#F8FAFC" }}>

        {/* Welcome */}
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)" }}>
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex-1"
                style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}>
                <p className="font-inter text-xs text-[#0F172A] leading-relaxed">
                  ¡Hola! Soy tu guía para <strong>{name}</strong>. ¿Qué quieres saber?
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-8">
              {PLACE_CHIPS.map((chip) => (
                <button key={chip} onClick={() => send(chip)}
                  className="font-inter text-[10px] px-2.5 py-1 rounded-full transition-colors"
                  style={{ border: "1px solid #0D9488", color: "#0D9488", backgroundColor: "rgba(13,148,136,0.04)" }}>
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="px-3 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%]"
                  style={{ backgroundColor: "#0D9488" }}>
                  <p className="font-inter text-xs text-white leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)" }}>
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  {msg.content && (
                    <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm shadow-sm"
                      style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}>
                      <p className="font-inter text-xs text-[#0F172A] leading-relaxed whitespace-pre-line">
                        {msg.content}
                      </p>
                    </div>
                  )}
                  {msg.toolResults
                    ?.filter((tr) => !["search_places", "get_place", "get_place_detail"].includes(tr.toolName))
                    .map((tr, j) => (
                      <ToolResultInline key={j} toolName={tr.toolName} result={tr.result} />
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing */}
        {isLoading && (
          <div className="flex gap-2 items-start">
            <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)" }}>
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1"
              style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}>
              {[0,1,2].map((j) => (
                <span key={j} className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]"
                  style={{ animation: `bounce 1s ease ${j*0.15}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderTop: "1px solid #E2E8F0", backgroundColor: "white" }}>
        <button onClick={() => send("Agregar a mi ruta")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter font-medium text-[11px] flex-1 justify-center"
          style={{ backgroundColor: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.2)", color: "#0D9488" }}>
          <Plus className="w-3 h-3" /> Agregar a ruta
        </button>
        <button onClick={() => send("¿Cuáles son los horarios?")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter font-medium text-[11px] flex-1 justify-center"
          style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B" }}>
          <Calendar className="w-3 h-3" /> Horarios
        </button>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ borderTop: "1px solid #E2E8F0", backgroundColor: "white" }}>
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-full"
          style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre este lugar..."
            className="flex-1 font-inter text-xs text-[#0F172A] placeholder:text-[#94A3B8] outline-none bg-transparent" />
        </div>
        <button type="button"
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ border: "1px solid #E2E8F0", color: "#94A3B8" }}>
          <Mic className="w-3.5 h-3.5" />
        </button>
        <button type="submit" disabled={isLoading || !input.trim()}
          className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
          style={{ backgroundColor: "#0D9488" }}>
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </form>
    </div>
  );
}
