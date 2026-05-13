"use client";

import { useRouter } from "next/navigation";

interface ReviewTabsProps {
  pending: number;
  approved: number;
  rejected: number;
  activeTab: string;
}

export function ReviewTabs({ pending, approved, rejected, activeTab }: ReviewTabsProps) {
  const router = useRouter();

  const tabs = [
    { key: "pending",  label: `Pendientes`, count: pending },
    { key: "approved", label: "Aprobadas",  count: approved },
    { key: "rejected", label: "Rechazadas", count: rejected },
  ];

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-lg w-fit"
      style={{ backgroundColor: "#0D1117", border: "1px solid #1F2937" }}
    >
      {tabs.map(({ key, label, count }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => router.push(`/reviews?tab=${key}`)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-inter font-medium text-sm transition-all"
            style={
              active
                ? { backgroundColor: "#111827", color: "#F9FAFB", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }
                : { color: "#6B7280" }
            }
          >
            {label}
            <span
              className="font-inter font-semibold text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
              style={
                active && key === "pending"
                  ? { backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }
                  : active && key === "approved"
                  ? { backgroundColor: "rgba(13,148,136,0.15)", color: "#0D9488", border: "1px solid rgba(13,148,136,0.3)" }
                  : active && key === "rejected"
                  ? { backgroundColor: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }
                  : { backgroundColor: "rgba(107,114,128,0.1)", color: "#6B7280" }
              }
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
