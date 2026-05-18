"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex cursor-pointer items-center gap-2 font-inter text-sm font-semibold text-[#ef4444] transition-colors hover:text-[#dc2626] disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {loading ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  );
}
