import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Heart, MapPin, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";

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
        place_categories(name_i18n),
        regions(name_i18n)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const places = (favorites ?? [])
    .map(f => f.places as any)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-28 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0D9488]/10">
            <Heart className="h-5 w-5 text-[#0D9488]" />
          </div>
          <div>
            <h1 className="font-jakarta text-2xl font-bold text-[#0F172A]">Mis favoritos</h1>
            <p className="font-inter text-sm text-[#64748B]">
              {places.length > 0
                ? `${places.length} lugar${places.length !== 1 ? "es" : ""} guardado${places.length !== 1 ? "s" : ""}`
                : "Aún no has guardado ningún lugar"}
            </p>
          </div>
        </div>

        {places.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center">
            <Heart className="mx-auto mb-3 h-8 w-8 text-[#CBD5E1]" />
            <p className="font-jakarta text-base font-semibold text-[#0F172A]">Ningún favorito aún</p>
            <p className="mt-1 font-inter text-sm text-[#64748B]">
              En el mapa, toca el icono 🔖 en cualquier lugar para guardarlo aquí.
            </p>
            <Link
              href="/explore"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-4 py-2.5 font-inter text-sm font-semibold text-white"
            >
              <MapPin className="h-4 w-4" />
              Ir a explorar
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {places.map((place: any) => (
              <Link
                key={place.slug}
                href={`/places/${place.slug}`}
                className="group flex gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition-all hover:border-[#0D9488]/30 hover:shadow-md"
              >
                {/* Icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0D9488]/08">
                  <MapPin className="h-6 w-6 text-[#0D9488]" />
                </div>
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-jakarta text-base font-semibold text-[#0F172A] group-hover:text-[#0D9488]">
                    {place.name_i18n?.es ?? place.slug}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 font-inter text-xs text-[#64748B]">
                    {place.place_categories?.name_i18n?.es && (
                      <span className="text-[#0D9488]">{place.place_categories.name_i18n.es}</span>
                    )}
                    {place.regions?.name_i18n?.es && (
                      <span>· {place.regions.name_i18n.es}</span>
                    )}
                  </div>
                  {place.aggregated_rating > 0 && (
                    <div className="mt-1 flex items-center gap-1 font-inter text-xs font-semibold text-[#F59E0B]">
                      <Star className="h-3 w-3 fill-current" />
                      {Number(place.aggregated_rating).toFixed(1)}
                    </div>
                  )}
                  {place.ai_summary_i18n?.es && (
                    <p className="mt-1 line-clamp-2 font-inter text-xs text-[#94A3B8]">
                      {place.ai_summary_i18n.es}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 self-center text-[#CBD5E1] group-hover:text-[#0D9488]" />
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
      <DashboardDockDemo isGuest={false} />
    </div>
  );
}
