"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function PublishToggle({
  placeId,
  currentStatus,
}: {
  placeId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const router = useRouter();
  const supabase = createClient();

  async function toggle() {
    setLoading(true);
    const newStatus = status === "published" ? "draft" : "published";
    await supabase.from("places").update({ status: newStatus }).eq("id", placeId);
    setStatus(newStatus);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={status === "published" ? "btn-publish-hover" : "btn-unpublish-hover"}
      style={{ opacity: loading ? 0.5 : 1 }}
    >
      {loading ? "..." : status === "published" ? "Ocultar" : "Publicar"}
    </button>
  );
}
