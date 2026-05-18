"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Square, Volume2, Loader2 } from "lucide-react";

interface NarratorPlayerProps {
  text: string;         // story body markdown (will be stripped server-side)
  storyTitle: string;
}

type PlayerState = "idle" | "loading" | "playing" | "paused" | "error";

export function NarratorPlayer({ text, storyTitle }: NarratorPlayerProps) {
  const [state, setState]       = useState<PlayerState>("idle");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef   = useRef<string | null>(null);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      audioRef.current?.pause();
    };
  }, []);

  async function handlePlay() {
    // If already have audio → just resume
    if (audioRef.current && state === "paused") {
      audioRef.current.play();
      setState("playing");
      return;
    }

    setState("loading");

    try {
      const res = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Error generando narración");

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      urlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
      audio.addEventListener("timeupdate", () => {
        setProgress(audio.currentTime / (audio.duration || 1));
      });
      audio.addEventListener("ended", () => {
        setState("idle");
        setProgress(0);
      });
      audio.addEventListener("error", () => setState("error"));

      audio.play();
      setState("playing");
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  function handlePause() {
    audioRef.current?.pause();
    setState("paused");
  }

  function handleStop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState("idle");
    setProgress(0);
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || state === "idle" || state === "loading") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * audioRef.current.duration;
    setProgress(ratio);
  }

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const currentTime = audioRef.current ? audioRef.current.currentTime : 0;

  return (
    <div className="rounded-2xl border border-[#0D9488]/20 bg-gradient-to-r from-[#0D9488]/5 to-[#064E3B]/5 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0D9488]/10">
          <Volume2 className="h-4 w-4 text-[#0D9488]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-inter text-xs font-bold uppercase tracking-wide text-[#0D9488]">
            Narración IA
          </p>
          <p className="truncate font-inter text-[11px] text-[#64748b]">{storyTitle}</p>
        </div>
        {state === "loading" && (
          <span className="font-inter text-[10px] text-[#94a3b8] animate-pulse">
            Generando...
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="mb-3 h-1.5 w-full cursor-pointer rounded-full bg-[#d7e2de] overflow-hidden"
        onClick={handleSeek}
      >
        <div
          className="h-full rounded-full bg-[#0D9488] transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Time */}
      {duration > 0 && (
        <div className="mb-3 flex justify-between font-inter text-[10px] text-[#94a3b8]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {state === "loading" ? (
          <button disabled
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0D9488] text-white opacity-70">
            <Loader2 className="h-4 w-4 animate-spin" />
          </button>
        ) : state === "playing" ? (
          <button onClick={handlePause}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#0D9488] text-white transition-opacity hover:opacity-90">
            <Pause className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={handlePlay}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#0D9488] text-white transition-opacity hover:opacity-90">
            <Play className="h-4 w-4 translate-x-0.5" />
          </button>
        )}

        {(state === "playing" || state === "paused") && (
          <button onClick={handleStop}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#d7e2de] text-[#64748b] transition-colors hover:border-red-200 hover:text-red-400">
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        )}

        <p className="ml-1 font-inter text-xs text-[#64748b]">
          {state === "idle"    && "Escuchar narración completa"}
          {state === "loading" && "Generando audio con IA..."}
          {state === "playing" && "Reproduciendo"}
          {state === "paused"  && "En pausa"}
          {state === "error"   && "Error — intenta de nuevo"}
        </p>
      </div>
    </div>
  );
}
