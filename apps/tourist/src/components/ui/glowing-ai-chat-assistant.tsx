"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Send, Bot, X } from "lucide-react";
import { useStreamingChat, type ChatContext, type UIActionsChunk, type Suggestion } from "@/hooks/use-streaming-chat";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { ToolResultInline } from "@/components/ai/tool-result-inline";
import { StreamingText } from "@/components/ui/streaming-text";

function ToolButton({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      className={`group relative rounded-lg p-2 text-slate-500 transition-all duration-200 hover:scale-105 hover:bg-teal-50 hover:text-[#0D9488] ${className ?? ""}`}
      type="button"
    >
      {children}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-teal-100 bg-white/95 px-3 py-2 text-xs text-[#0F766E] opacity-0 shadow-lg backdrop-blur-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:opacity-100">
        {label}
        <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/95" />
      </div>
    </button>
  );
}

function generateDeviceId(): string {
  // Simple UUID v4-like ID for session tracking
  return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  const key = "itinera-device-id";
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = generateDeviceId();
    try {
      window.sessionStorage.setItem(key, id);
    } catch {
      // ignore storage errors
    }
  }
  return id;
}

export function FloatingAiAssistant({
  context = {},
  storageKey = "itinera-ai-floating",
  onUIActions,
  initialMessage,
}: {
  context?: ChatContext;
  storageKey?: string;
  onUIActions?: (chunk: UIActionsChunk) => void;
  initialMessage?: string;
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [charCount, setCharCount] = useState(0);

  const { status: voiceStatus, start: startVoice } = useVoiceInput({
    onTranscript: (text) => {
      const next = message ? `${message} ${text}` : text;
      setMessage(next);
      setCharCount(next.length);
    },
  });
  const [deviceId, setDeviceId] = useState("");
  const maxChars = 2000;
  const chatRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const didAutoSend = useRef(false);
  const historicalCount = useRef<number | null>(null);

  // Initialize device ID on mount
  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());
  }, []);

  const { messages, isLoading, send, clear, suggestions } = useStreamingChat(context, {
    storageKey,
    deviceId,
    onUIActions: (chunk) => {
      // Save region/category to session memory
      if (typeof window !== "undefined") {
        try {
          if (chunk.entities?.region) {
            window.sessionStorage.setItem("itinera-last-region", chunk.entities.region as string);
          }
          if (chunk.entities?.category) {
            window.sessionStorage.setItem("itinera-last-category", chunk.entities.category as string);
          }
        } catch {
          // ignore storage errors
        }
      }
      onUIActions?.(chunk);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("itinera:ui-actions", { detail: chunk }));
      }
    },
  });
  // Auto-open chat and send initialMessage (e.g. from category card click)
  // Clear previous history first so old category messages don't affect future queries
  useEffect(() => {
    if (!initialMessage || !deviceId || didAutoSend.current) return;
    didAutoSend.current = true;
    const timer = setTimeout(() => {
      clear(); // wipe old history before sending category auto-message
      setIsChatOpen(true);
      send(initialMessage);
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, initialMessage]);

  if (historicalCount.current === null) historicalCount.current = messages.length;

  const hasConversation = messages.length > 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    setCharCount(value.length);
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text || isLoading) return;
    setMessage("");
    setCharCount(0);
    await send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSuggestion = async (s: Suggestion) => {
    if (isLoading) return;
    await send(s.value);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (chatRef.current && !chatRef.current.contains(target)) {
        if (!target.closest(".floating-ai-button")) {
          setIsChatOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isChatOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        className={`floating-ai-button relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-500 ${isChatOpen ? "rotate-90" : "rotate-0"}`}
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{
          background: "linear-gradient(135deg, rgba(13,148,136,0.88) 0%, rgba(0,104,95,0.9) 100%)",
          boxShadow:
            "0 0 20px rgba(13,148,136,0.65), 0 0 40px rgba(0,104,95,0.45), 0 0 60px rgba(15,23,42,0.3)",
          border: "2px solid rgba(255, 255, 255, 0.2)",
        }}
        type="button"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-30" />
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="relative z-10">
          {isChatOpen ? <X className="h-7 w-7 text-white" /> : <Bot className="h-8 w-8 text-white" />}
        </div>
        <div className="absolute inset-0 rounded-full bg-teal-500 opacity-20 animate-ping" />
      </button>

      {isChatOpen && (
        <div
          ref={chatRef}
          className="absolute bottom-20 right-0 w-[calc(100vw-2rem)] max-w-[430px] origin-bottom-right sm:right-0"
          style={{ animation: "popIn 0.24s cubic-bezier(0.2, 0.8, 0.2, 1) forwards" }}
        >
          <div className="relative flex h-[360px] max-h-[62vh] flex-col overflow-hidden rounded-[26px] border border-[#BFE8E3] bg-white/82 shadow-[0_22px_70px_rgba(15,23,42,0.22)] backdrop-blur-2xl">
            <div className="shrink-0 flex items-center justify-between border-b border-[#E2E8F0]/70 px-4 pb-2.5 pt-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-xs font-bold text-[#0F172A]">Itinera IA</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-2xl border border-[#99F6E4] bg-[#F0FDFA] px-2 py-1 text-xs font-bold text-[#0F766E]">
                  En línea
                </span>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">
              {hasConversation ? (
                <>
                {messages.map((chatMessage, index) => (
                  <div
                    key={`${chatMessage.role}-${index}`}
                    className={`flex ${chatMessage.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                        chatMessage.role === "user"
                          ? "bg-[#0D9488] text-white"
                          : "border border-[#D9E5E2] bg-white text-[#0F172A]"
                      }`}
                    >
                      {chatMessage.content ? (
                        chatMessage.role === "user" ? (
                          <p className="whitespace-pre-wrap">{chatMessage.content}</p>
                        ) : (
                          <StreamingText
                            key={`widget-${index}`}
                            content={chatMessage.content}
                            isStreaming={isLoading && index === messages.length - 1}
                            animate={index >= (historicalCount.current ?? 0)}
                            speed={15}
                            charsPerTick={2}
                            className="text-sm leading-relaxed"
                          />
                        )
                      ) : (
                        <p className="text-slate-500">Pensando...</p>
                      )}
                      {chatMessage.toolResults?.length ? (
                        <div className="mt-3 space-y-2">
                          {chatMessage.toolResults.map((tool, toolIndex) => (
                            <ToolResultInline
                              key={`${tool.toolName}-${toolIndex}`}
                              toolName={tool.toolName}
                              result={tool.result}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center">
                  <p className="max-w-[280px] font-inter text-sm leading-6 text-slate-500">
                    Pide rutas, contexto histórico o recomendaciones culturales de Honduras.
                  </p>
                </div>
              )}
            </div>

            {suggestions.length > 0 && !isLoading && (
              <div className="shrink-0 flex gap-1.5 overflow-x-auto px-3.5 py-2 scrollbar-none">
                {suggestions.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => void handleSuggestion(s)}
                    className="shrink-0 rounded-full border border-[#0D9488] px-3 py-1 text-xs font-semibold text-[#0D9488] transition-colors hover:bg-[#0D9488] hover:text-white"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <div className="shrink-0 border-t border-[#E2E8F0]/80 px-3.5 pb-3 pt-2.5">
              <div className="flex min-h-11 items-end gap-2 rounded-2xl border border-[#D9E5E2] bg-white/90 px-2.5 py-1.5 shadow-inner">
                <button
                  type="button"
                  onClick={startVoice}
                  disabled={voiceStatus === "unsupported" || isLoading}
                  aria-label={voiceStatus === "listening" ? "Detener grabación" : "Hablar con la IA"}
                  className={`shrink-0 rounded-lg p-2 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed border border-[#E2E8F0] ${
                    voiceStatus === "listening"
                      ? "animate-pulse bg-red-50 text-red-500 border-red-200"
                      : voiceStatus === "processing"
                        ? "bg-amber-50 text-amber-500 border-amber-200"
                        : "text-slate-500 hover:bg-teal-50 hover:text-[#0D9488]"
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </button>
                <textarea
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="max-h-[58px] min-h-8 flex-1 resize-none border-none bg-transparent px-1 py-1.5 text-sm leading-5 text-[#0F172A] outline-none placeholder:text-slate-400 disabled:opacity-60"
                  placeholder="Pregunta a Itinera IA..."
                  maxLength={maxChars}
                  disabled={isLoading}
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                />
                <span className="hidden shrink-0 pb-1.5 text-[11px] font-medium text-slate-400 sm:inline">
                  {charCount}/{maxChars}
                </span>
                <button
                  onClick={() => void handleSend()}
                  className="group relative shrink-0 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#00685f] p-2.5 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-[#0fb3a3] hover:to-[#0D9488] hover:shadow-xl hover:shadow-teal-500/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-55"
                  type="button"
                  disabled={isLoading || !message.trim()}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.animation = "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.animation = "none";
                  }}
                >
                  <Send className="h-4.5 w-4.5 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:rotate-12 group-hover:scale-110" />
                  <div className="absolute inset-0 scale-110 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#00685f] opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-50" />
                </button>
              </div>

              <p className="mt-1.5 px-1 font-inter text-[11px] text-slate-400">Enter para enviar. Shift + Enter para nueva línea.</p>
            </div>

            <div
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{
                background: "linear-gradient(135deg, rgba(13,148,136,0.08), transparent, rgba(34,211,238,0.06))",
              }}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes ping {
          75%,
          100% {
            transform: scale(1.1);
            opacity: 0;
          }
        }

        .floating-ai-button:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 0 30px rgba(13, 148, 136, 0.85), 0 0 50px rgba(0, 104, 95, 0.7),
            0 0 70px rgba(15, 23, 42, 0.5);
        }
      `}</style>
    </div>
  );
}
