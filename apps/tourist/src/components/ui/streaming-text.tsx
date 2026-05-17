"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveals AI-streamed text character by character with a blinking cursor.
 * Respects prefers-reduced-motion → shows full text instantly.
 * Use a unique key per message so each instance starts at 0.
 */
export function StreamingText({
  content,
  isStreaming = false,
  speed = 18,       // ms per tick — slower = more readable
  charsPerTick = 2, // chars revealed per tick
  className,
  onReveal,         // fired on every tick so parent can scroll
}: {
  content: string;
  isStreaming?: boolean;
  speed?: number;
  charsPerTick?: number;
  className?: string;
  onReveal?: () => void;
}) {
  const [shown, setShown]     = useState(0);
  const targetRef             = useRef(content);
  const reducedMotion         = useRef(
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // Keep target up-to-date as streaming appends chars
  useEffect(() => {
    targetRef.current = content;
    if (reducedMotion.current) setShown(content.length);
  }, [content]);

  // Single interval per component instance — runs for the component lifetime
  useEffect(() => {
    if (reducedMotion.current) {
      setShown(content.length);
      return;
    }

    const id = setInterval(() => {
      setShown((prev) => {
        const next = Math.min(prev + charsPerTick, targetRef.current.length);
        if (next !== prev) onReveal?.();
        return next;
      });
    }, speed);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — one interval per mount, reads targetRef live

  const displayText = targetRef.current.slice(0, shown);
  const isBehind    = shown < targetRef.current.length;
  const showCursor  = (isStreaming || isBehind) && !reducedMotion.current;

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {displayText}
      {showCursor && (
        <span
          aria-hidden
          className="ml-px inline-block w-0.5 animate-pulse rounded-full bg-current align-middle opacity-50"
          style={{ height: "0.85em" }}
        />
      )}
    </span>
  );
}
