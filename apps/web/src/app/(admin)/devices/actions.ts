"use server";

import { createClient } from "@/lib/supabase/server";
import { createHash, randomBytes } from "crypto";

export async function registerDevice(label: string): Promise<{ token?: string; id?: string; error?: string }> {
  const supabase = await createClient();

  // Verify caller is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin")) {
    return { error: "Sin permisos" };
  }

  // Generate a secure random token
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const { data, error } = await supabase
    .from("devices")
    .insert({ label, token_hash: tokenHash })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Error al registrar" };
  }

  return { token: rawToken, id: data.id };
}
