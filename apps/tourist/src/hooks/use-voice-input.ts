"use client";

import { useState, useRef, useCallback } from "react";

export type VoiceStatus = "idle" | "listening" | "processing" | "error" | "unsupported";

interface UseVoiceInputOptions {
  lang?: string;
  onTranscript: (text: string) => void;
  onError?: (msg: string) => void;
}

export function useVoiceInput({
  lang = "es-HN",
  onTranscript,
  onError,
}: UseVoiceInputOptions) {
  const [status, setStatus] = useState<VoiceStatus>(() => {
    if (typeof window === "undefined") return "idle";
    return ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
      ? "idle"
      : "unsupported";
  });

  const recRef = useRef<SpeechRecognition | null>(null);

  const start = useCallback(() => {
    if (status === "unsupported") return;
    if (status === "listening") {
      recRef.current?.stop();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { setStatus("unsupported"); return; }

    const rec: SpeechRecognition = new SR();
    rec.lang              = lang;
    rec.continuous        = false;
    rec.interimResults    = false;
    rec.maxAlternatives   = 1;

    rec.onstart  = () => setStatus("listening");
    rec.onspeechend = () => setStatus("processing");

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) onTranscript(transcript.trim());
      setStatus("idle");
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "no-speech") {
        setStatus("idle");
      } else {
        setStatus("error");
        onError?.(e.error);
        setTimeout(() => setStatus("idle"), 2000);
      }
    };

    rec.onend = () => {
      if (status !== "processing") setStatus("idle");
    };

    recRef.current = rec;
    rec.start();
  }, [lang, onTranscript, onError, status]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setStatus("idle");
  }, []);

  return { status, start, stop };
}
