"use client";

import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#f0f5f2] text-slate-950 transition-colors",
        className
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={cn(
            `
            absolute -inset-[10px] opacity-60 blur-[12px] will-change-transform
            [--white:rgba(255,255,255,0.9)]
            [--transparent:transparent]
            [--teal-1:rgba(13,148,136,0.45)]
            [--teal-2:rgba(0,104,95,0.35)]
            [--amber-1:rgba(245,158,11,0.28)]
            [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
            [--aurora:repeating-linear-gradient(100deg,var(--teal-1)_10%,var(--teal-2)_18%,var(--amber-1)_26%,var(--teal-1)_34%,var(--teal-2)_42%)]
            [background-image:var(--white-gradient),var(--aurora)]
            [background-size:300%,_220%]
            [background-position:50%_50%,50%_50%]
            after:content-[""] after:absolute after:inset-0
            after:[background-image:var(--white-gradient),var(--aurora)]
            after:[background-size:200%,_130%]
            after:[background-attachment:fixed]
            after:[animation:aurora_60s_linear_infinite]
            after:mix-blend-multiply`,
            showRadialGradient &&
              "[mask-image:radial-gradient(ellipse_at_100%_0%,black_12%,var(--transparent)_72%)]"
          )}
        />
      </div>
      {children}
    </div>
  );
};

