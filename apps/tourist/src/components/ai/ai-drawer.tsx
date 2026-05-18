"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Mic } from "lucide-react";
import { useStreamingChat, type ChatContext } from "@/hooks/use-streaming-chat";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { ToolResultInline } from "./tool-result-inline";

const SUGGESTIONS = [
  "¿Qué ver en Copán?",
  "Plan para un día en Tegucigalpa",
  "Lugares naturales baratos",
  "Historia de los mayas en Honduras",
];

export function AIDrawer({
  open,
  onClose,
  context = {},
}: {
  open: boolean;
  onClose: () => void;
  context?: ChatContext;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const { messages, isLoading, send } = useStreamingChat(context);

  const { status: voiceStatus, start: startVoice } = useVoiceInput({
    onTranscript: (text) => setInput(prev => prev ? `${prev} ${text}` : text),
  });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
    setInput("");
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[48]"
          style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
          onClick={onClose}
        />
      )}

      <div className="fixed bottom-0 right-0 z-[49] flex flex-col bg-white"
        style={{
          width: "min(420px, 100vw)",
          height: "min(680px, 90vh)",
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 shrink-0"
          style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)", borderRadius: "16px 16px 0 0" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-inter font-semibold text-sm text-white">Itinera IA</p>
            <p className="font-inter text-[10px] text-white/60">
              Tu guía cultural · Honduras
              {context.placeName && ` · ${context.placeName}`}
              {context.storyTitle && ` · ${(context.storyTitle).slice(0,20)}...`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-inter text-[10px] text-white/50">En línea</span>
            <button onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          style={{ backgroundColor: "#F8FAFC" }}>

          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)" }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 px-3.5 py-3 rounded-2xl rounded-tl-sm shadow-sm"
                  style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}>
                  <p className="font-inter text-sm text-[#0F172A] leading-relaxed">
                    ¡Hola! Soy tu guía cultural de Honduras 🌿<br />
                    Puedo ayudarte a encontrar lugares, contarte historias y armar rutas personalizadas.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="font-inter text-xs px-3 py-1.5 rounded-full transition-all"
                    style={{ border: "1px solid #0D9488", color: "#0D9488", backgroundColor: "rgba(13,148,136,0.04)" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm max-w-[82%]"
                    style={{ backgroundColor: "#0D9488" }}>
                    <p className="font-inter text-sm text-white leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)" }}>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    {msg.content && (
                      <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm shadow-sm"
                        style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}>
                        <p className="font-inter text-sm text-[#0F172A] leading-relaxed whitespace-pre-line">
                          {msg.content}
                        </p>
                      </div>
                    )}
                    {msg.toolResults?.map((tr, j) => (
                      <ToolResultInline key={j} toolName={tr.toolName} result={tr.result} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)" }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1"
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

        {/* Input */}
        <form onSubmit={handleSubmit}
          className="flex items-center gap-2 px-3 py-3 shrink-0"
          style={{ borderTop: "1px solid #E2E8F0", backgroundColor: "white" }}>
          <div className="flex items-center gap-2 flex-1 px-3.5 py-2.5 rounded-full"
            style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <input ref={inputRef} value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta o pide algo..."
              className="flex-1 font-inter text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none bg-transparent"
            />
          </div>
          <button
            type="button"
            onClick={startVoice}
            disabled={voiceStatus === "unsupported" || isLoading}
            aria-label={voiceStatus === "listening" ? "Detener grabación" : "Hablar"}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
              voiceStatus === "listening"
                ? "animate-pulse bg-red-50 text-red-500"
                : voiceStatus === "processing"
                  ? "bg-amber-50 text-amber-500"
                  : "text-[#94A3B8] hover:text-[#0D9488]"
            }`}
            style={{ border: "1px solid #E2E8F0" }}>
            <Mic className="w-4 h-4" />
          </button>
          <button type="submit" disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
            style={{ backgroundColor: "#0D9488" }}>
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </>
  );
}
