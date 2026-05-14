"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Send, Info, Bot, X } from "lucide-react";
import { useStreamingChat, type ChatContext, type UIActionsChunk } from "@/hooks/use-streaming-chat";
import { ToolResultInline } from "@/components/ai/tool-result-inline";

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
      className={`group relative rounded-lg p-2.5 text-zinc-500 transition-all duration-300 hover:scale-105 hover:bg-zinc-800/80 ${className ?? ""}`}
      type="button"
    >
      {children}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-700/50 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-200 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:opacity-100">
        {label}
        <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900/95" />
      </div>
    </button>
  );
}

export function FloatingAiAssistant({
  context = {},
  storageKey = "itinera-ai-floating",
  onUIActions,
}: {
  context?: ChatContext;
  storageKey?: string;
  onUIActions?: (chunk: UIActionsChunk) => void;
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [charCount, setCharCount] = useState(0);
  const maxChars = 2000;
  const chatRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { messages, isLoading, send } = useStreamingChat(context, {
    storageKey,
    onUIActions: (chunk) => {
      onUIActions?.(chunk);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("itinera:ui-actions", { detail: chunk }));
      }
    },
  });
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
          className="absolute bottom-20 right-0 w-[calc(100vw-2rem)] max-w-[500px] origin-bottom-right"
          style={{ animation: "popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards" }}
        >
          <div className="relative flex h-[420px] max-h-[78vh] flex-col overflow-hidden rounded-3xl border border-zinc-500/50 bg-gradient-to-br from-zinc-800/80 to-zinc-900/90 shadow-2xl backdrop-blur-3xl">
            <div className="shrink-0 flex items-center justify-between px-6 pb-2 pt-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-xs font-medium text-zinc-400">Itinera IA</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-2xl bg-zinc-800/60 px-2 py-1 text-xs font-medium text-zinc-300">
                  Modelo cultural
                </span>
                <span className="rounded-2xl border border-teal-400/20 bg-teal-500/10 px-2 py-1 text-xs font-medium text-teal-300">
                  En linea
                </span>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="rounded-full p-1.5 transition-colors hover:bg-zinc-700/50"
                  type="button"
                >
                  <X className="h-4 w-4 text-zinc-400" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
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
                          : "border border-zinc-700/60 bg-zinc-950/45 text-zinc-100"
                      }`}
                    >
                      {chatMessage.content ? (
                        <p className="whitespace-pre-wrap">{chatMessage.content}</p>
                      ) : (
                        <p className="text-zinc-400">Pensando...</p>
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
                  <p className="max-w-[320px] font-inter text-sm leading-6 text-zinc-400">
                    Pide rutas, contexto historico o recomendaciones culturales de Honduras.
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-zinc-800/50 px-4 pb-4 pt-3">
              <div className="flex min-h-12 items-end gap-2 rounded-2xl border border-zinc-700/40 bg-zinc-950/25 px-2.5 py-2">
                <ToolButton label="Comando por voz" className="shrink-0 border border-zinc-700/30 p-2 hover:border-teal-400/30 hover:text-teal-300">
                  <Mic className="h-4 w-4 transition-all duration-300 group-hover:-rotate-3 group-hover:scale-125" />
                </ToolButton>
                <textarea
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="max-h-[76px] min-h-9 flex-1 resize-none border-none bg-transparent px-1 py-2 text-sm leading-5 text-zinc-100 outline-none placeholder:text-zinc-500 disabled:opacity-60"
                  placeholder="Pregunta a Itinera IA..."
                  maxLength={maxChars}
                  disabled={isLoading}
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                />
                <span className="hidden shrink-0 pb-2 text-[11px] font-medium text-zinc-500 sm:inline">
                  {charCount}/{maxChars}
                </span>
                <button
                  onClick={() => void handleSend()}
                  className="group relative shrink-0 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#00685f] p-2.5 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-[#0fb3a3] hover:to-[#0D9488] hover:shadow-xl hover:shadow-teal-500/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-55"
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

              <div className="mt-2 flex items-center justify-between gap-6 text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <Info className="h-3 w-3" />
                  <span>
                    Presiona{" "}
                    <kbd className="rounded border border-zinc-600 bg-zinc-800 px-1.5 py-1 font-mono text-xs text-zinc-400 shadow-sm">
                      Shift + Enter
                    </kbd>{" "}
                    para nueva linea
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span>Sistema operativo</span>
                </div>
              </div>
            </div>

            <div
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(13,148,136,0.08), transparent, rgba(34,211,238,0.06))",
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
