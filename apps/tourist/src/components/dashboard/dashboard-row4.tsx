"use client";

import Link from "next/link";
import { Sparkles, Volume2, MapPin, ArrowRight, Send, Mic } from "lucide-react";
import { useState } from "react";
import { useStreamingChat } from "@/hooks/use-streaming-chat";

interface Story {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  summary_i18n: Record<string, string>;
  audio_storage_path: string | null;
}

const STORY_ICONS = ["🏛️", "⛪", "🌿", "🏖️"];

export function DashboardRow4({ stories }: { stories: Story[] }) {
  const [input, setInput] = useState("");
  const { messages, isLoading, send } = useStreamingChat({ page: "explore" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
    setInput("");
  }

  // Last AI message
  const lastAI = messages.filter(m => m.role === "assistant").slice(-1)[0];
  const lastUser = messages.filter(m => m.role === "user").slice(-1)[0];

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4"
    >

      {/* ── LEFT: Historias Culturales (dark card) ── */}
      <div
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "#0F172A", minHeight: "200px" }}
      >
        <div className="p-5 flex-1">
          {/* Amber label */}
          <span
            className="inline-block font-inter font-semibold text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full mb-4"
            style={{
              backgroundColor: "rgba(245,158,11,0.15)",
              color: "#F59E0B",
              border: "1px solid rgba(245,158,11,0.25)",
            }}
          >
            HISTORIAS IA
          </span>

          {/* Title */}
          <h3
            className="font-jakarta font-bold text-white leading-snug mb-4"
            style={{ fontSize: "18px" }}
          >
            Las historias que Honduras<br />quiere contarte.
          </h3>

          {/* Story rows */}
          <div className="space-y-2">
            {stories.length === 0 ? (
              // Placeholder when no stories loaded
              [
                { slug: "legado-maya-copan",     title: "El Legado Maya de Copán",     icon: "🏛️" },
                { slug: "reloj-arabe-comayagua",  title: "El Reloj Árabe de Comayagua", icon: "⛪" },
              ].map((s, i) => (
                <Link
                  key={i}
                  href={`/stories/${s.slug}`}
                  className="flex items-center gap-3 p-3 rounded-xl group transition-colors"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                >
                  <span className="text-base shrink-0">{s.icon}</span>
                  <p className="font-jakarta font-semibold text-sm text-white flex-1 truncate">
                    {s.title}
                  </p>
                  <ArrowRight
                    className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                    style={{ color: "#0D9488" }}
                  />
                </Link>
              ))
            ) : (
              stories.map((s, i) => (
                <Link
                  key={s.id}
                  href={`/stories/${s.slug}`}
                  className="flex items-center gap-3 p-3 rounded-xl group transition-colors"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                >
                  <span className="text-base shrink-0">{STORY_ICONS[i % STORY_ICONS.length]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-jakarta font-semibold text-sm text-white truncate">
                      {(s.title_i18n as Record<string,string>)?.es}
                    </p>
                    {s.audio_storage_path && (
                      <span className="flex items-center gap-1 mt-0.5">
                        <Volume2 className="w-3 h-3" style={{ color: "#0D9488" }} />
                        <span className="font-inter text-[10px]" style={{ color: "#0D9488" }}>Audio</span>
                      </span>
                    )}
                  </div>
                  <ArrowRight
                    className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                    style={{ color: "#0D9488" }}
                  />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Bottom link */}
        <div className="px-5 pb-4">
          <Link
            href="/stories"
            className="font-inter font-semibold text-xs transition-opacity hover:opacity-70"
            style={{ color: "#0D9488" }}
          >
            Ver todas las historias →
          </Link>
        </div>
      </div>

      {/* ── RIGHT: AI Panel ── */}
      <div
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: "white",
          border: "1px solid #E2E8F0",
          borderLeft: "4px solid #0D9488",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          minHeight: "200px",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid #E2E8F0" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(13,148,136,0.1)" }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#0D9488" }} />
          </div>
          <p className="font-jakarta font-semibold text-sm text-[#0F172A] flex-1">
            Itinera IA
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-inter text-[11px]" style={{ color: "#94A3B8" }}>En línea</span>
          </div>
        </div>

        {/* Chat preview area */}
        <div
          className="flex-1 px-3 py-3 space-y-2.5 overflow-y-auto"
          style={{ backgroundColor: "#F8FAFC", minHeight: "100px" }}
        >
          {messages.length === 0 ? (
            /* Default demo state */
            <>
              {/* AI welcome */}
              <div className="flex gap-2 items-start">
                <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)" }}>
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
                <div
                  className="px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm text-xs font-inter leading-relaxed"
                  style={{ backgroundColor: "white", border: "1px solid #E2E8F0", color: "#0F172A", maxWidth: "85%" }}
                >
                  ¡Hola! Soy tu guía cultural de Honduras 🌿 ¿Qué quieres explorar hoy?
                </div>
              </div>

              {/* Demo user question */}
              <div className="flex justify-end">
                <div
                  className="px-3 py-2 rounded-2xl rounded-tr-sm text-xs font-inter text-white"
                  style={{ backgroundColor: "#0D9488", maxWidth: "85%" }}
                >
                  ¿Qué hay en Comayagua?
                </div>
              </div>

              {/* Demo AI response with embedded place */}
              <div className="flex gap-2 items-start">
                <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)" }}>
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div
                    className="px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm"
                    style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}
                  >
                    <p className="font-inter text-xs leading-relaxed text-[#0F172A]">
                      ¡Comayagua es una joya colonial! El imperdible es la Catedral 🏛️ — tiene el reloj árabe más antiguo del mundo.
                    </p>
                  </div>
                  {/* Embedded PlaceCard */}
                  <Link
                    href="/places/catedral-comayagua"
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
                    style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}
                  >
                    <div
                      className="w-9 h-7 rounded-lg shrink-0 flex items-center justify-center text-sm"
                      style={{ background: "linear-gradient(135deg, #7C3AED, #4C1D95)" }}
                    >
                      ⛪
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-jakarta font-semibold text-[11px] text-[#0F172A] truncate">
                        Catedral de Comayagua
                      </p>
                      <p className="font-inter text-[10px]" style={{ color: "#0D9488" }}>★4.6 · Patrimonio</p>
                    </div>
                    <MapPin className="w-3 h-3 shrink-0" style={{ color: "#0D9488" }} />
                  </Link>
                </div>
              </div>
            </>
          ) : (
            /* Real chat messages */
            <>
              {lastUser && (
                <div className="flex justify-end">
                  <div className="px-3 py-2 rounded-2xl rounded-tr-sm text-xs font-inter text-white"
                    style={{ backgroundColor: "#0D9488", maxWidth: "85%" }}>
                    {lastUser.content}
                  </div>
                </div>
              )}
              {lastAI && (
                <div className="flex gap-2 items-start">
                  <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)" }}>
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div className="px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm text-xs font-inter leading-relaxed"
                    style={{ backgroundColor: "white", border: "1px solid #E2E8F0", color: "#0F172A", maxWidth: "85%" }}>
                    {isLoading ? (
                      <div className="flex gap-1">
                        {[0,1,2].map(j => (
                          <span key={j} className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]"
                            style={{ animation: `bounce 1s ease ${j*0.15}s infinite` }} />
                        ))}
                      </div>
                    ) : lastAI.content}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input bar */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-3 py-2.5 shrink-0"
          style={{ borderTop: "1px solid #E2E8F0", backgroundColor: "white" }}
        >
          <div
            className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta algo sobre Honduras..."
              className="flex-1 font-inter text-xs text-[#0F172A] placeholder:text-[#94A3B8] outline-none bg-transparent"
            />
          </div>
          <button type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ border: "1px solid #E2E8F0", color: "#94A3B8" }}>
            <Mic className="w-3.5 h-3.5" />
          </button>
          <button type="submit" disabled={isLoading || !input.trim()}
            className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40"
            style={{ backgroundColor: "#0D9488" }}>
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
