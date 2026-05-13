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
  }[];
}

interface DockIconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-2, 2, -2],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

const DockIconButton = React.forwardRef<HTMLButtonElement, DockIconButtonProps>(
  ({ icon: Icon, label, onClick, active, className }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
          "relative rounded-lg p-3 text-[#0F766E]",
          "transition-colors hover:bg-[#0D9488]/18",
          className
        )}
        type="button"
      >
        {active ? (
          <motion.span
            layoutId="dock-active-indicator"
            className="absolute inset-0 rounded-lg bg-[#0D9488]/22"
            transition={{ type: "spring", stiffness: 340, damping: 30, mass: 0.55 }}
          />
        ) : null}
        <Icon className={cn("relative z-10 h-5 w-5 text-[#0F766E]", active ? "text-[#065F46]" : "")} />
        <span
          className={cn(
            "pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap",
            "rounded bg-[#0D9488] px-2 py-1 text-xs text-white",
            "opacity-0 transition-opacity group-hover:opacity-100"
          )}
        >
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
          <motion.div
            initial="initial"
            animate="animate"
            variants={floatingAnimation}
            className={cn(
              "flex items-center gap-1 rounded-2xl p-2",
              "border border-[#0D9488]/35 bg-[#0D9488]/12 shadow-[0_10px_28px_rgba(13,148,136,0.25)] backdrop-blur-lg",
              "transition-shadow duration-300 hover:shadow-xl"
            )}
          >
            {items.map((item) => (
              <div key={item.label} className="group">
                <DockIconButton {...item} />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }
);
Dock.displayName = "Dock";

export { Dock };
