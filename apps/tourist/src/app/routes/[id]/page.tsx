import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MapPin, Clock, Lock, Globe, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function SharedRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: route } = await supabase
    .from("itineraries")
    .select(`id, title_i18n, public, created_at, itinerary_stops(seq, notes_i18n, places(name_i18n, slug, ai_summary_i18n, aggregated_rating, place_categories(name_i18n)))`)
    .eq("id", id)
    .single();

  if (!route) notFound();

  // Only show public routes (or owner — simplified for now)
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === (route as any).user_id;
  if (!route.public && !isOwner) notFound();

  const title = (route.title_i18n as Record<string, string>)?.es ?? "Ruta cultural";
  const stops = [...(route.itinerary_stops as any[])].sort((a, b) => a.seq - b.seq);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-28 sm:px-6">

        {/* Header */}
        <div className="mb-6 rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-inter text-[10px] font-semibold"
              style={
                route.public
                  ? { backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488", border: "1px solid rgba(13,148,136,0.2)" }
                  : { backgroundColor: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }
              }
            >
              {route.public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {route.public ? "Ruta pública" : "Ruta privada"}
            </span>
          </div>
          <h1 className="font-jakarta text-2xl font-bold text-[#0F172A]">{title}</h1>
          <div className="mt-2 flex items-center gap-3 font-inter text-sm text-[#64748B]">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {stops.length} paradas
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {new Date(route.created_at).toLocaleDateString("es-HN", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Stops */}
        <div className="space-y-3 mb-6">
          {stops.map((stop: any, i: number) => {
            const place = stop.places;
            const name = place?.name_i18n?.es ?? stop.notes_i18n?.es ?? `Parada ${i + 1}`;
            const summary = place?.ai_summary_i18n?.es ?? "";
            const category = place?.place_categories?.name_i18n?.es ?? "";
            const rating = place?.aggregated_rating;
            const slug = place?.slug;

            return (
              <div key={i} className="flex gap-4">
                {/* Step number + connector */}
                <div className="flex flex-col items-center">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-jakarta text-sm font-bold text-white" style={{ backgroundColor: "#0D9488" }}>
                    {i + 1}
                  </span>
                  {i < stops.length - 1 && <div className="mt-1 flex-1 w-px bg-[#E2E8F0]" style={{ minHeight: "24px" }} />}
                </div>

                {/* Content */}
                <div className="flex-1 pb-3">
                  <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-jakarta text-base font-semibold text-[#0F172A]">{name}</p>
                        {category && <p className="mt-0.5 font-inter text-xs text-[#0D9488]">{category}</p>}
                      </div>
                      {rating && (
                        <span className="flex items-center gap-1 font-inter text-xs font-semibold text-[#F59E0B]">
                          ⭐ {Number(rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                    {summary && <p className="mt-2 font-inter text-sm leading-relaxed text-[#64748B] line-clamp-2">{summary}</p>}
                    {slug && (
                      <Link
                        href={`/places/${slug}`}
                        className="mt-2 flex items-center gap-1 font-inter text-xs font-semibold text-[#0D9488] hover:underline"
                      >
                        Ver detalle <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 text-center">
          <p className="font-jakarta text-base font-bold text-[#0F172A] mb-1">¿Te animas a explorar Honduras?</p>
          <p className="font-inter text-sm text-[#64748B] mb-4">Descubre estos lugares y crea tu propia ruta con IA.</p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-5 py-2.5 font-inter text-sm font-semibold text-white"
          >
            <MapPin className="h-4 w-4" />
            Abrir en el mapa
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
