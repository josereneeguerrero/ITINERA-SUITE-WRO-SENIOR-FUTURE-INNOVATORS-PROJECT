"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ReviewResult = { ok: true } | { error: string };

export async function submitReview(
  placeId: string,
  placeSlug: string,
  rating: number,
  body: string
): Promise<ReviewResult> {
  if (rating < 1 || rating > 5) return { error: "Selecciona una calificación válida" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("reviews").insert({
    place_id:          placeId,
    user_id:           user?.id ?? null,
    session_id:        user ? null : `guest-${Date.now()}`,
    rating,
    body_i18n:         { es: body.trim() },
    title_i18n:        {},
    source:            "web",
    moderation_status: "pending",
    visibility:        "full",
  });

  if (error) return { error: error.message };
  revalidatePath(`/places/${placeSlug}`);
  return { ok: true };
}
