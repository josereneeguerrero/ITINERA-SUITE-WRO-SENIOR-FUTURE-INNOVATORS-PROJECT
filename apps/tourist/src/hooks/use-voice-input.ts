"use client";

import { useState, useRef, useCallback } from "react";

// Web Speech API types — declarados explícitamente para compatibilidad
// con versiones de TypeScript que no los incluyen en lib.dom
declare global {
  interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
  }
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionResult {
    readonly length: number;
    readonly isFinal: boolean;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onstart:     ((this: SpeechRecognition, ev: Event) => void) | null;
    onend:       ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult:    ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror:     ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }
  declare const SpeechRecognition: {
    new (): SpeechRecognition;
    prototype: SpeechRecognition;
  };
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

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
