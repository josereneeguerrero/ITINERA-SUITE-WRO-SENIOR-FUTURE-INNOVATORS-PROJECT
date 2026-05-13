"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type BuiltinEffect = "fade" | "none";

type SuggestiveSearchProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  onTrailingClick?: () => void;
  suggestions?: string[];
  className?: string;
  effect?: BuiltinEffect;
  placeholder?: string;
  showTrailing?: boolean;
  LeadingIcon?: ComponentType<{ className?: string }>;
  TrailingIcon?: ComponentType<{ className?: string }>;
};

export default function SuggestiveSearch({
  value,
  onValueChange,
  onSubmit,
  onTrailingClick,
  suggestions = ["Buscar destinos...", "Buscar por categoria...", "Buscar por region..."],
  className,
  effect = "fade",
  placeholder = "",
  showTrailing = true,
  LeadingIcon = Search,
  TrailingIcon = SlidersHorizontal,
}: SuggestiveSearchProps) {
  const [index, setIndex] = useState(0);
  const activeSuggestion = useMemo(() => suggestions[index] ?? "", [index, suggestions]);

  useEffect(() => {
    if (value || effect === "none" || suggestions.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % suggestions.length);
    }, 2100);
    return () => window.clearInterval(id);
  }, [value, effect, suggestions]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value);
      }}
      className={cn(
        "relative flex h-12 w-full items-center rounded-full border border-[#D9E5E2] bg-white/95 px-4 shadow-[0_8px_22px_rgba(15,23,42,0.09)] backdrop-blur-sm transition-[box-shadow,border-color] duration-200",
        "focus-within:border-[#0D9488]/50 focus-within:shadow-[0_10px_30px_rgba(13,148,136,0.2)]",
        className
      )}
    >
      <LeadingIcon className="mr-2 h-4 w-4 shrink-0 text-[#64748B]" />
      <div className="relative min-w-0 flex-1">
        <input
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          className="h-8 w-full bg-transparent font-inter text-sm text-[#0F172A] outline-none placeholder:text-transparent"
          aria-label="Buscar en mapa"
        />
        {!value && effect === "fade" ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={activeSuggestion}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="font-inter text-sm text-[#64748B]"
              >
                {activeSuggestion}
              </motion.span>
            </AnimatePresence>
          </div>
        ) : null}
      </div>
      {showTrailing ? (
        <button
          type="button"
          onClick={onTrailingClick}
          className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#0D9488] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/50"
          aria-label="Abrir filtros"
        >
          <TrailingIcon className="h-4 w-4" />
        </button>
      ) : null}
    </form>
  );
}

