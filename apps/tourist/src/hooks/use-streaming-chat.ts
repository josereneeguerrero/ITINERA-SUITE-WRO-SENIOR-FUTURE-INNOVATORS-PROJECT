"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface ChatMessage {
  role:        "user" | "assistant";
  content:     string;
  toolResults?: { toolName: string; result: unknown }[];
}

export interface ChatContext {
  page?:       string;
  placeSlug?:  string;
  storySlug?:  string;
  placeName?:  string;
  storyTitle?: string;
}

export interface UIAction {
  type: string;
  slug?: string;
  query?: string;
  category?: string;
  title?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stops?: any[];
}

export interface UIActionsChunk {
  intent: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entities?: Record<string, any>;
  actions: UIAction[];
}

export function useStreamingChat(
  context: ChatContext = {},
  opts?: {
    onUIActions?: (chunk: UIActionsChunk) => void;
    storageKey?: string;
  }
) {
  const [messages,  setMessages]  = useState<ChatMessage[]>(() => {
    if (!opts?.storageKey || typeof window === "undefined") return [];
    try {
      const raw = window.sessionStorage.getItem(opts.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ChatMessage[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!opts?.storageKey || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(opts.storageKey, JSON.stringify(messages));
    } catch {
      // ignore storage errors
    }
  }, [messages, opts?.storageKey]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setIsLoading(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          context,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";
      let   fullText = "";
      const toolResults: { toolName: string; result: unknown }[] = [];

      // Add empty assistant message to stream into
      setMessages((prev) => [...prev, { role: "assistant", content: "", toolResults: [] }]);

      const updateLast = (patch: Partial<ChatMessage>) =>
        setMessages((prev) => {
          const updated = [...prev];
          const last    = updated[updated.length - 1];
          if (last?.role === "assistant") updated[updated.length - 1] = { ...last, ...patch };
          return updated;
        });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]" || !raw) continue;

          try {
            const chunk = JSON.parse(raw);

            if (chunk.type === "text-delta") {
              fullText += chunk.textDelta;
              updateLast({ content: fullText });
            }

            if (chunk.type === "tool-result") {
              toolResults.push({ toolName: chunk.toolName, result: chunk.result });
              updateLast({ toolResults: [...toolResults] });
            }

            if (chunk.type === "ui-actions" && opts?.onUIActions) {
              opts.onUIActions({
                intent: chunk.intent,
                entities: chunk.entities ?? {},
                actions: chunk.actions ?? [],
              });
            }
          } catch { /* ignore parse errors on partial chunks */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          const last    = updated[updated.length - 1];
          if (last?.role === "assistant" && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content: "Lo siento, hubo un error. Intenta de nuevo.",
            };
          }
          return updated;
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, context, opts]);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, isLoading, send, clear };
}
