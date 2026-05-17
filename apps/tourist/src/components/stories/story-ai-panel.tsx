"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Mic, BookOpen } from "lucide-react";
import { useStreamingChat } from "@/hooks/use-streaming-chat";
import { ToolResultInline } from "@/components/ai/tool-result-inline";
import { StreamingText } from "@/components/ui/streaming-text";

interface Story {
  slug: string;
  title_i18n: Record<string, string>;
  summary_i18n: Record<string, string>;
  audio_storage_path: string | null;
  regions: { name_i18n: Record<string, string> } | null;
}

const STORY_CHIPS = [
  "¿Qué hace especial esta historia?",
  "Cuéntame más sobre los personajes",
  "¿Dónde puedo vivir esta historia?",
  "¿Qué relación tiene con Honduras hoy?",
];

export function StoryAIPanel({ story }: { story: Story }) {
  const [input, setInput] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const title  = (story.title_i18n as Record<string,string>)?.es ?? story.slug;
  const region = (story.regions as { name_i18n: Record<string,string> } | null)?.name_i18n?.es;

  const { messages, isLoading, send } = useStreamingChat({
    page:       "story",
    storySlug:  story.slug,
    storyTitle: title,
  });

  // Scroll only the internal container — never the whole page
  useEffect(() => {
    if ((messages.length > 0 || isLoading) && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
    setInput("");
  }

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", height: "500px" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 shrink-0"
        style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "rgba(13,148,136,0.25)" }}>
          <BookOpen className="w-4 h-4" style={{ color: "#6EE7B7" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-inter font-semibold text-sm text-white">Narrador IA</p>
          <p className="font-inter text-[10px] text-white/50 truncate">
            {title.slice(0, 30)}{title.length > 30 ? "..." : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="font-inter text-[10px] text-white/40">En vivo</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
        style={{ backgroundColor: "#F8FAFC" }}>

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
                  Estás leyendo <strong>&ldquo;{title}&rdquo;</strong>{region ? ` — una historia de ${region}` : ""} 📖<br />
                  ¿Qué quieres saber?
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-8">
              {STORY_CHIPS.map((chip) => (
                <button key={chip} onClick={() => send(chip)}
                  className="font-inter text-[10px] px-2.5 py-1 rounded-full transition-colors"
                  style={{ border: "1px solid #0D9488", color: "#0D9488", backgroundColor: "rgba(13,148,136,0.04)" }}>
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

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
                      <StreamingText
                            key={`story-${i}`}
                            content={msg.content}
                            isStreaming={isLoading && i === messages.length - 1}
                            speed={8}
                            charsPerTick={2}
                            className="font-inter text-xs leading-relaxed"
                          />
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
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ borderTop: "1px solid #E2E8F0", backgroundColor: "white" }}>
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-full"
          style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre esta historia..."
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
