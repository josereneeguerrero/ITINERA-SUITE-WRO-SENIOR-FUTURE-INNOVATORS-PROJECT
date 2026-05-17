"use client";

import { useRef, useEffect } from "react";
import { useState } from "react";
import {
  ArrowRight, Bot, CalendarDays, Compass, Map, Mic,
  RotateCcw, Send, Sparkles, X,
} from "lucide-react";
import { useStreamingChat } from "@/hooks/use-streaming-chat";
import { ToolResultInline } from "@/components/ai/tool-result-inline";
import { StreamingText } from "@/components/ui/streaming-text";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "chat",        label: "Chat IA",      icon: Sparkles,    available: true  },
  { id: "planner",     label: "Planificador",  icon: CalendarDays, available: false },
  { id: "discover",    label: "Descubrir",     icon: Compass,      available: false },
] as const;

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: Map,      text: "¿Qué hacer en Copán Ruinas?" },
  { icon: Sparkles, text: "Cuéntame la historia de la civilización maya en Honduras" },
  { icon: Map,      text: "Las mejores playas de Honduras" },
  { icon: Compass,  text: "Recomiéndame destinos poco conocidos" },
  { icon: Map,      text: "Ruta cultural desde Tegucigalpa" },
  { icon: Sparkles, text: "¿Cuándo es mejor visitar las Islas de la Bahía?" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function IaChatCenter({
  isGuest,
  userName,
}: {
  isGuest: boolean;
  userName: string | null;
}) {
  const [tab, setTab]     = useState<"chat" | "planner" | "discover">("chat");
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, send, clear, suggestions } = useStreamingChat(
    { page: "ia-center" },
    { storageKey: "itinera-ia-center", deviceId: "" }
  );

  // Scroll to bottom — used both on new messages and on each typewriter tick
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (messages.length > 0 || isLoading) scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || isLoading) return;
    setMessage("");
    await send(text);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const greeting = userName ? `Hola, ${userName.split(" ")[0]}` : "Hola";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-4 pb-3 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-3">

          {/* Floating pill — minimal, centered */}
          <div className="flex items-center justify-between rounded-2xl border border-[#d7e2de]/80 bg-white/92 px-5 py-3 shadow-sm backdrop-blur-xl">
            <div className="w-20" /> {/* spacer */}
            <h1 className="font-jakarta text-base font-bold text-[#0f172a]">Itinera IA</h1>
            <div className="flex w-20 justify-end">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  title="Nueva conversación"
                  className="flex cursor-pointer items-center gap-1 font-inter text-xs font-semibold text-[#94a3b8] transition-colors hover:text-[#0D9488]"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-[#d7e2de] bg-white p-1 shadow-sm" role="tablist">
            {TABS.map(({ id, label, icon: Icon, available }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                disabled={!available}
                onClick={() => available && setTab(id as typeof tab)}
                className={`relative flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-inter text-sm font-semibold transition-all duration-150 ${
                  tab === id
                    ? "bg-[#0D9488] text-white shadow-sm"
                    : available
                      ? "text-[#64748b] hover:text-[#334155]"
                      : "cursor-not-allowed text-[#bcc9c6]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
                {!available && (
                  <span className="ml-0.5 rounded-full bg-[#f1f5f9] px-1.5 py-0.5 font-inter text-[9px] font-bold uppercase text-[#94a3b8]">
                    Próx.
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Messages area ──────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
      >
        <div className="mx-auto max-w-3xl space-y-5">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center pt-4 text-center">
              {/* Greeting */}
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0D9488]/10">
                <Bot className="h-8 w-8 text-[#0D9488]" aria-hidden />
              </div>
              <h2 className="mt-3 font-jakarta text-xl font-bold text-[#0f172a]">
                {greeting}, soy Itinera IA
              </h2>
              <p className="mt-2 max-w-sm font-inter text-sm text-[#64748b]">
                Pregúntame sobre destinos, historias, rutas y la cultura de Honduras. Estoy conectada a la base de datos real de Itinera.
              </p>

              {/* Suggestion chips */}
              <div className="mt-8 grid grid-cols-1 gap-2 w-full sm:grid-cols-2">
                {SUGGESTIONS.map(({ icon: Icon, text }) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => void send(text)}
                    disabled={isLoading}
                    className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#d7e2de] bg-white p-3.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0D9488]/30 hover:shadow-md disabled:opacity-50"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" aria-hidden />
                    <span className="font-inter text-sm font-medium text-[#334155]">{text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {/* AI avatar */}
              {msg.role === "assistant" && (
                <div className="mr-2.5 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0D9488]">
                  <Bot className="h-4 w-4 text-white" aria-hidden />
                </div>
              )}

              <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                {/* Text content */}
                {msg.content && (
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "rounded-tr-sm bg-[#0D9488] text-white"
                        : "rounded-tl-sm border border-[#d7e2de] bg-white text-[#0f172a]"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="font-inter text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <StreamingText
                        key={`msg-${i}`}
                        content={msg.content}
                        isStreaming={isLoading && i === messages.length - 1}
                        onReveal={i === messages.length - 1 ? scrollToBottom : undefined}
                        className="font-inter text-sm leading-relaxed"
                      />
                    )}
                  </div>
                )}

                {/* Tool results — place cards, stories, routes */}
                {msg.toolResults?.length ? (
                  <div className="w-full space-y-1.5">
                    {msg.toolResults.map((tool, j) => (
                      <ToolResultInline
                        key={`${tool.toolName}-${j}`}
                        toolName={tool.toolName}
                        result={tool.result}
                        mapMode={false}
                      />
                    ))}
                  </div>
                ) : null}

                {/* Thinking placeholder */}
                {!msg.content && msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-[#d7e2de] bg-white px-4 py-3">
                    {[0, 1, 2].map((j) => (
                      <span
                        key={j}
                        className="h-2 w-2 animate-bounce rounded-full bg-[#94a3b8]"
                        style={{ animationDelay: `${j * 0.15}s` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="mr-2.5 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0D9488]">
                <Bot className="h-4 w-4 text-white" aria-hidden />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-[#d7e2de] bg-white px-4 py-3">
                {[0, 1, 2].map((j) => (
                  <span
                    key={j}
                    className="h-2 w-2 animate-bounce rounded-full bg-[#94a3b8]"
                    style={{ animationDelay: `${j * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* AI suggestions after response */}
          {suggestions.length > 0 && !isLoading && (
            <div className="flex flex-wrap gap-2 pl-9">
              {suggestions.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => void send(s.value)}
                  className="cursor-pointer rounded-full border border-[#0D9488]/30 px-3 py-1.5 font-inter text-xs font-semibold text-[#0D9488] transition-colors hover:bg-[#0D9488] hover:text-white"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Input bar — in flex flow, never overlaps messages ──────────── */}
      <div className="shrink-0 px-4 pb-24 pt-2 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-[#d7e2de] bg-white px-3 py-2 shadow-lg">
            {/* Mic */}
            <button
              type="button"
              className="mb-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#d7e2de] text-[#94a3b8] transition-colors hover:border-[#0D9488]/30 hover:text-[#0D9488]"
              aria-label="Comando por voz"
            >
              <Mic className="h-4 w-4" aria-hidden />
            </button>

            {/* Textarea */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={isLoading}
              placeholder="Pregunta sobre Honduras..."
              className="max-h-[100px] min-h-[36px] flex-1 resize-none bg-transparent py-1.5 font-inter text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8] disabled:opacity-60"
              style={{ scrollbarWidth: "none" }}
            />

            {/* Clear message if typing */}
            {message && (
              <button
                type="button"
                onClick={() => setMessage("")}
                className="mb-0.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#334155]"
                aria-label="Limpiar"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}

            {/* Send */}
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isLoading || !message.trim()}
              className="mb-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#0D9488] text-white shadow-sm transition-all duration-200 hover:bg-[#0f766e] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Enviar mensaje"
            >
              {isLoading
                ? <ArrowRight className="h-4 w-4 animate-pulse" aria-hidden />
                : <Send className="h-4 w-4" aria-hidden />
              }
            </button>
          </div>
          <p className="mt-1.5 px-1 text-center font-inter text-[11px] text-[#94a3b8]">
            Enter para enviar · Shift+Enter nueva línea
          </p>
        </div>
      </div>
    </div>
  );
}
