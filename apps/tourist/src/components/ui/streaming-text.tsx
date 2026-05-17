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
  speed = 10,      // ms per tick
  charsPerTick = 3, // chars revealed per tick (higher = faster)
  className,
}: {
  content: string;
  isStreaming?: boolean;
  speed?: number;
  charsPerTick?: number;
  className?: string;
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
      setShown((prev) => Math.min(prev + charsPerTick, targetRef.current.length));
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
