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
  speed = 18,
  charsPerTick = 2,
  className,
  onReveal,
  animate = true,   // false → show full text instantly (historical messages)
}: {
  content: string;
  isStreaming?: boolean;
  speed?: number;
  charsPerTick?: number;
  className?: string;
  onReveal?: () => void;
  animate?: boolean;
}) {
  const noAnimation = !animate ||
    (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const [shown, setShown] = useState(() => noAnimation ? content.length : 0);
  const targetRef         = useRef(content);

  // Keep target up-to-date as streaming appends chars
  useEffect(() => {
    targetRef.current = content;
    if (noAnimation) setShown(content.length);
  }, [content, noAnimation]);

  // Single interval per component instance — only when animation is enabled
  useEffect(() => {
    if (noAnimation) return;

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
