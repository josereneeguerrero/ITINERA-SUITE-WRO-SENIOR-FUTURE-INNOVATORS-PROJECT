"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  inViewMargin?: string;
  blur?: string; // kept for API compatibility, no longer used
}

export function BlurFade({
  children,
  className,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  inView = false,
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!inView); // if inView=false, always visible

  useEffect(() => {
    if (!inView) return;

    // Use IntersectionObserver when available
    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0, rootMargin: "0px" }
      );
      if (ref.current) observer.observe(ref.current);

      // Fallback: force visible after duration+delay+300ms
      const fallback = setTimeout(
        () => setVisible(true),
        (duration + delay) * 1000 + 300
      );

      return () => {
        observer.disconnect();
        clearTimeout(fallback);
      };
    } else {
      // No IntersectionObserver → show immediately
      setVisible(true);
    }
  }, [inView, duration, delay]);

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity:          visible ? 1 : 0,
        transform:        visible ? "translateY(0px)" : `translateY(${yOffset}px)`,
        transition:       `opacity ${duration}s ease-out, transform ${duration}s ease-out`,
        transitionDelay:  `${delay}s`,
        willChange:       "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
