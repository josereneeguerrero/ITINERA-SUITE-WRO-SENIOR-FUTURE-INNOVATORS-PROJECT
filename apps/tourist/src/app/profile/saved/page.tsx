import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";
import { ArrowLeft, ArrowRight, Heart, Landmark, Leaf, MapPin, Star, Utensils, Waves } from "lucide-react";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";

export const revalidate = 0;

const ICON_BY_CAT: Record<string, LucideIcon> = {
  heritage: Landmark, nature: Leaf, food: Utensils, beach: Waves,
};

function getText(v: Record<string, string> | null | undefined, fb: string) {
  return v?.es ?? v?.en ?? fb;
}

export default async function SavedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/bienvenida?redirect=/profile/saved");

  const { data: favorites } = await supabase
    .from("favorites")
    .select(`
      created_at,
      places(
        slug, name_i18n, ai_summary_i18n, aggregated_rating,
        place_categories(name_i18n, slug),
        regions(name_i18n)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const places = (favorites ?? [])
    .map(f => f.places as {
      slug: string;
      name_i18n: Record<string, string>;
      ai_summary_i18n: Record<string, string> | null;
      aggregated_rating: number;
      place_categories: { name_i18n: Record<string, string>; slug: string } | null;
      regions: { name_i18n: Record<string, string> } | null;
    })
    .filter(Boolean);

  return (
    <main className="min-h-screen w-full bg-[#f0f5f2] pb-28">

      {/* Header */}
      <section className="mx-auto w-full max-w-4xl px-5 pt-8 md:px-6 md:pt-10">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/profile"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[#d7e2de] bg-white shadow-sm transition-colors hover:border-[#0D9488]/30 hover:text-[#0D9488]"
            aria-label="Volver al perfil"
          >
            <ArrowLeft className="h-4 w-4 text-[#64748b]" aria-hidden />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 border border-pink-100">
              <Heart className="h-5 w-5 text-pink-500" aria-hidden />
            </div>
            <div>
              <h1 className="font-jakarta text-xl font-bold text-[#0f172a]">Mis Favoritos</h1>
              <p className="font-inter text-sm text-[#64748b]">
                {places.length > 0
                  ? `${places.length} lugar${places.length !== 1 ? "es" : ""} guardado${places.length !== 1 ? "s" : ""}`
                  : "Aún no tienes favoritos"}
              </p>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {places.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#bcc9c6] bg-white/60 p-12 text-center">
            <Heart className="mx-auto mb-3 h-10 w-10 text-[#bcc9c6]" aria-hidden />
            <p className="font-jakarta text-base font-bold text-[#0f172a]">Ningún favorito aún</p>
            <p className="mt-1.5 font-inter text-sm text-[#64748b]">
              En cualquier lugar, toca el botón Guardar para añadirlo aquí.
            </p>
            <Link
              href="/explore"
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0D9488] px-5 py-2.5 font-inter text-sm font-bold text-white shadow-sm transition-all hover:bg-[#0f766e]"
            >
              <MapPin className="h-4 w-4" aria-hidden /> Explorar lugares
            </Link>
          </div>
        )}

        {/* Places grid */}
        {places.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {places.map((place) => {
              const catSlug = place.place_categories?.slug ?? "";
              const PlaceIcon = ICON_BY_CAT[catSlug] ?? Landmark;
              const catName = place.place_categories
                ? getText(place.place_categories.name_i18n, "")
                : "";
              const regName = place.regions ? getText(place.regions.name_i18n, "") : "";

              return (
                <Link
                  key={place.slug}
                  href={`/places/${place.slug}`}
                  className="group flex cursor-pointer gap-4 rounded-2xl border border-[#d7e2de] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0D9488]/30 hover:shadow-md"
                >
                  {/* Icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d7e2de] bg-[#f0f5f2]">
                    <PlaceIcon className="h-6 w-6 text-[#0D9488]" aria-hidden />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-jakarta text-base font-bold text-[#0f172a] group-hover:text-[#0D9488] transition-colors">
                      {getText(place.name_i18n, place.slug)}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-inter text-xs text-[#64748b]">
                      {catName && <span className="text-[#0D9488] font-semibold">{catName}</span>}
                      {regName && <span>· {regName}</span>}
                    </div>
                    {place.aggregated_rating > 0 && (
                      <div className="mt-1 flex items-center gap-1 font-inter text-xs font-semibold text-amber-500">
                        <Star className="h-3 w-3 fill-current" aria-hidden />
                        {Number(place.aggregated_rating).toFixed(1)}
                      </div>
                    )}
                    {place.ai_summary_i18n?.es && (
                      <p className="mt-1.5 line-clamp-2 font-inter text-xs leading-5 text-[#94a3b8]">
                        {place.ai_summary_i18n.es}
                      </p>
                    )}
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 self-center text-[#bcc9c6] transition-all group-hover:translate-x-0.5 group-hover:text-[#0D9488]" aria-hidden />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <DashboardDockDemo isGuest={false} />
    </main>
  );
}
