"use server";

import { createClient } from "@/lib/supabase/server";

export interface RouteStop { slug: string; name: string; order: number }

export async function saveRoute(title: string, stops: RouteStop[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión para guardar rutas" };
  if (!stops.length) return { error: "La ruta no tiene paradas" };

  // Resolve place_ids from slugs
  const slugs = stops.map(s => s.slug);
  const { data: places } = await supabase
    .from("places")
    .select("id, slug")
    .in("slug", slugs);

  const slugToId = Object.fromEntries((places ?? []).map(p => [p.slug, p.id]));

  // Create itinerary
  const { data: itinerary, error: iErr } = await supabase
    .from("itineraries")
    .insert({ user_id: user.id, title_i18n: { es: title, en: title }, public: false })
    .select("id")
    .single();

  if (iErr || !itinerary) return { error: iErr?.message ?? "Error al guardar" };

  // Insert stops
  const stopsPayload = stops
    .map((s, i) => ({ itinerary_id: itinerary.id, place_id: slugToId[s.slug] ?? null, seq: i + 1, notes_i18n: { es: s.name } }));

  await supabase.from("itinerary_stops").insert(stopsPayload);

  return { id: itinerary.id };
}

export async function deleteRoute(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  await supabase.from("itineraries").delete().eq("id", id).eq("user_id", user.id);
  return { ok: true };
}

export async function toggleRoutePublic(id: string, isPublic: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  await supabase.from("itineraries").update({ public: isPublic }).eq("id", id).eq("user_id", user.id);
  return { ok: true };
}
