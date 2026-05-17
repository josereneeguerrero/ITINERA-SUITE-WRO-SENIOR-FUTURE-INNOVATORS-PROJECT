"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface DockProps {
  className?: string;
  items: {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    active?: boolean;
    locked?: boolean; // guest-blocked item
  }[];
}

interface DockIconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
  locked?: boolean;
  className?: string;
}

const DockIconButton = React.forwardRef<HTMLButtonElement, DockIconButtonProps>(
  ({ icon: Icon, label, onClick, active, locked, className }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={active ? undefined : { scale: 1.12, y: -3 }}
        whileTap={{ scale: 0.93 }}
        onClick={onClick}
        title={locked ? `${label} — inicia sesión` : label}
        aria-label={locked ? `${label} — requiere cuenta` : label}
        className={cn(
          "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 cursor-pointer",
          "transition-colors duration-150",
          active ? "" : "hover:bg-[#0D9488]/15",
          locked ? "opacity-40" : "",
          className
        )}
        type="button"
      >
        {active ? (
          <motion.span
            layoutId="dock-active-indicator"
            className="absolute inset-0 rounded-xl bg-[#0D9488]/20"
            transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.5 }}
          />
        ) : null}
        <Icon className={cn("relative z-10 h-5 w-5", active ? "text-[#065F46]" : "text-[#0F766E]")} />
        <span className={cn(
          "relative z-10 font-inter text-[10px] font-semibold",
          active ? "text-[#065F46]" : "text-[#0F766E]/70"
        )}>
          {label}
        </span>
      </motion.button>
    );
  }
);
DockIconButton.displayName = "DockIconButton";

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  ({ items, className }, ref) => {
    return (
      <div ref={ref} className={cn("flex w-full items-end justify-center p-0", className)}>
        <div className="relative flex w-full max-w-4xl items-end justify-center rounded-2xl">
          <div
            className={cn(
              "flex items-center gap-0.5 rounded-2xl px-2 py-1.5",
              "border border-[#0D9488]/35 bg-[#0D9488]/10 shadow-[0_8px_24px_rgba(13,148,136,0.2)] backdrop-blur-lg",
              "transition-shadow duration-300 hover:shadow-[0_12px_32px_rgba(13,148,136,0.28)]"
            )}
          >
            {items.map((item) => (
              <DockIconButton key={item.label} {...item} locked={item.locked} />
            ))}
          </div>
        </div>
      </div>
    );
  }
);
Dock.displayName = "Dock";

export { Dock };
