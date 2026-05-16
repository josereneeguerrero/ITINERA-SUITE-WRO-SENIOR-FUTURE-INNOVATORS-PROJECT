import { createClient } from "@/lib/supabase/server";
import { PlaceForm } from "@/components/admin/place-form";
import { notFound } from "next/navigation";

export default async function EditPlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: place }, { data: categories }, { data: regions }, { data: coords }] =
    await Promise.all([
      supabase.from("places").select("*").eq("id", id).single(),
      supabase.from("place_categories").select("id, name_i18n").order("sort_order"),
      supabase.from("regions").select("id, name_i18n").order("sort_order"),
      supabase.rpc("get_place_coords", { p_id: id }),
    ]);

  if (!place) notFound();

  const name    = place.name_i18n    as Record<string, string>;
  const desc    = place.description_i18n as Record<string, string>;
  const summary = place.ai_summary_i18n  as Record<string, string>;
  const addr    = place.address_i18n  as Record<string, string>;
  const coordRow = coords?.[0] as { lat: number; lng: number } | undefined;

  return (
    <PlaceForm
      mode="edit"
      placeId={id}
      initialData={{
        name_es:        name?.es ?? "",
        name_en:        name?.en ?? "",
        description_es: desc?.es ?? "",
        description_en: desc?.en ?? "",
        ai_summary_es:  summary?.es ?? "",
        lat:            coordRow?.lat ? String(coordRow.lat) : "",
        lng:            coordRow?.lng ? String(coordRow.lng) : "",
        address_es:     addr?.es ?? "",
        phone:          place.phone ?? "",
        website:        place.website ?? "",
        hours:          (place.hours as Record<string, string>)?.es ?? "",
        price_level:    String(place.price_level ?? 2),
        accessibility:  place.accessibility ?? false,
        local_favorite: place.local_favorite ?? false,
        featured:       place.featured ?? false,
        category_id:    place.category_id ?? "",
        region_id:      place.region_id ?? "",
        status:         place.status ?? "draft",
      }}
      categories={(categories ?? []) as { id: string; name_i18n: Record<string, string> }[]}
      regions={(regions ?? []) as { id: string; name_i18n: Record<string, string> }[]}
    />
  );
}
