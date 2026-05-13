"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export function ModerationButtons({
  reviewId,
  currentStatus,
}: {
  reviewId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(currentStatus);
  const router   = useRouter();
  const supabase = createClient();

  async function moderate(newStatus: "approved" | "rejected") {
    setLoading(true);
    await supabase.from("reviews").update({ moderation_status: newStatus }).eq("id", reviewId);
    setStatus(newStatus);
    router.refresh();
    setLoading(false);
  }

  if (status === "approved") {
    return (
      <button
        onClick={() => moderate("rejected")}
        disabled={loading}
        className="flex items-center gap-1 font-inter font-medium text-xs px-2.5 py-1 rounded-md transition-all disabled:opacity-40"
        style={{ color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}
      >
        <X className="w-3 h-3" />
        Rechazar
      </button>
    );
  }

  if (status === "rejected") {
    return (
      <button
        onClick={() => moderate("approved")}
        disabled={loading}
        className="flex items-center gap-1 font-inter font-medium text-xs px-2.5 py-1 rounded-md transition-all disabled:opacity-40"
        style={{ color: "#0D9488", border: "1px solid rgba(13,148,136,0.25)" }}
      >
        <Check className="w-3 h-3" />
        Aprobar
      </button>
    );
  }

  // pending — show both
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => moderate("approved")}
        disabled={loading}
        className="flex items-center gap-1 font-inter font-medium text-xs px-2.5 py-1 rounded-md transition-all disabled:opacity-40"
        style={{ color: "#0D9488", border: "1px solid rgba(13,148,136,0.25)", backgroundColor: "rgba(13,148,136,0.06)" }}
      >
        <Check className="w-3 h-3" />
        Aprobar
      </button>
      <button
        onClick={() => moderate("rejected")}
        disabled={loading}
        className="flex items-center gap-1 font-inter font-medium text-xs px-2.5 py-1 rounded-md transition-all disabled:opacity-40"
        style={{ color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)", backgroundColor: "rgba(239,68,68,0.06)" }}
      >
        <X className="w-3 h-3" />
        Rechazar
      </button>
    </div>
  );
}
