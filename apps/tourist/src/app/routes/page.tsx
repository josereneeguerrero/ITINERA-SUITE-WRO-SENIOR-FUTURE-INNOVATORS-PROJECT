import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AIFloatingButton } from "@/components/ai/ai-floating-button";
import { Map, MapPin, Clock, Share2, Lock, Globe, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import { RouteCardActions } from "./route-card-actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stop = {
  seq: number;
  notes_i18n: Record<string, string>;
  places: { name_i18n: Record<string, string>; slug: string } | null;
};

type Itinerary = {
  id: string;
  title_i18n: Record<string, string>;
  public: boolean;
  created_at: string;
  itinerary_stops: Stop[];
};

// ── Curated routes (predefined for tourists) ─────────────────────────────────

const CURATED = [
  {
    id: "ruta-maya-copan",
    title: "Ruta Maya — Copán",
    description: "Descubre el corazón del legado maya: ruinas, museos y el fascinante Bosque Copán.",
    stops: ["Ruinas de Copán", "Museo Regional de Arqueología", "Parque Nacional Cerro Azul Meámbar"],
    duration: "1 día",
    color: "#0D9488",
  },
  {
    id: "ruta-colonial-comayagua",
    title: "Comayagua Colonial",
    description: "Pasea por la primera capital de Honduras: catedrales, plazas e iglesias coloniales.",
    stops: ["Catedral de Comayagua", "Museo de Arte Religioso Colonial", "Iglesia La Merced"],
    duration: "Medio día",
    color: "#3B82F6",
  },
  {
    id: "ruta-islas-bahia",
    title: "Islas de la Bahía",
    description: "Playas de arena blanca, arrecifes de coral y vida marina única en el Caribe.",
    stops: ["Playa West Bay", "Arrecife Mesoamericano", "Half Moon Bay"],
    duration: "2 días",
    color: "#8B5CF6",
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function RoutesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let myRoutes: Itinerary[] = [];

  if (user) {
    const { data } = await supabase
      .from("itineraries")
      .select(`id, title_i18n, public, created_at, itinerary_stops(seq, notes_i18n, places(name_i18n, slug))`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    myRoutes = (data ?? []) as unknown as Itinerary[];
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-jakarta text-3xl font-bold text-[#0F172A]">Rutas</h1>
            <p className="mt-1 font-inter text-base text-[#64748B]">
              Itinerarios guardados y rutas culturales de Honduras
            </p>
          </div>
          <Link
            href="/explore"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#0D9488] px-4 py-2.5 font-inter text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva ruta
          </Link>
        </div>

        {/* My saved routes */}
        {user && (
          <section className="mb-10">
            <h2 className="mb-4 font-jakarta text-lg font-bold text-[#0F172A]">
              Mis rutas guardadas
            </h2>

            {myRoutes.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center">
                <Map className="mx-auto mb-3 h-8 w-8 text-[#CBD5E1]" />
                <p className="font-jakarta text-base font-semibold text-[#0F172A]">Sin rutas guardadas aún</p>
                <p className="mt-1 font-inter text-sm text-[#64748B]">
                  Ve a explorar, arma una ruta y guárdala desde el panel de paradas.
                </p>
                <Link
                  href="/explore"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-4 py-2.5 font-inter text-sm font-semibold text-white"
                >
                  <MapPin className="h-4 w-4" />
                  Ir al mapa
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {myRoutes.map((route) => {
                  const title = (route.title_i18n as Record<string, string>)?.es ?? "Mi ruta";
                  const stops = [...route.itinerary_stops].sort((a, b) => a.seq - b.seq);
                  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/routes/${route.id}`;

                  return (
                    <div
                      key={route.id}
                      className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
                    >
                      {/* Title + visibility */}
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-jakarta text-base font-bold text-[#0F172A] leading-tight">{title}</h3>
                          <p className="mt-0.5 font-inter text-xs text-[#94A3B8]">
                            {new Date(route.created_at).toLocaleDateString("es-HN", { day: "2-digit", month: "long", year: "numeric" })}
                          </p>
                        </div>
                        <span
                          className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 font-inter text-[10px] font-semibold"
                          style={
                            route.public
                              ? { backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488", border: "1px solid rgba(13,148,136,0.2)" }
                              : { backgroundColor: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }
                          }
                        >
                          {route.public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          {route.public ? "Pública" : "Privada"}
                        </span>
                      </div>

                      {/* Stops */}
                      <div className="mb-4 flex-1 space-y-1.5">
                        {stops.slice(0, 4).map((stop, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6FFFB] font-jakarta text-[10px] font-bold text-[#0D9488]">
                              {i + 1}
                            </span>
                            <span className="truncate font-inter text-sm text-[#334155]">
                              {stop.places?.name_i18n?.es ?? (stop.notes_i18n as Record<string, string>)?.es ?? "—"}
                            </span>
                          </div>
                        ))}
                        {stops.length > 4 && (
                          <p className="pl-7 font-inter text-xs text-[#94A3B8]">+{stops.length - 4} paradas más</p>
                        )}
                      </div>

                      {/* Actions */}
                      <RouteCardActions
                        routeId={route.id}
                        isPublic={route.public}
                        shareUrl={shareUrl}
                        currentTitle={title}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Curated cultural routes */}
        <section>
          <h2 className="mb-4 font-jakarta text-lg font-bold text-[#0F172A]">
            Rutas culturales recomendadas
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {CURATED.map((route) => (
              <div
                key={route.id}
                className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
              >
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${route.color}15` }}
                >
                  <MapPin className="h-5 w-5" style={{ color: route.color }} />
                </div>
                <h3 className="font-jakarta text-base font-bold text-[#0F172A] leading-tight">{route.title}</h3>
                <p className="mt-1.5 font-inter text-sm leading-relaxed text-[#64748B] flex-1">{route.description}</p>
                <div className="mt-3 mb-4 space-y-1">
                  {route.stops.map((stop, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-jakarta text-[9px] font-bold text-white" style={{ backgroundColor: route.color }}>
                        {i + 1}
                      </span>
                      <span className="font-inter text-xs text-[#475569]">{stop}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-inter text-xs text-[#94A3B8]">
                    <Clock className="h-3.5 w-3.5" />
                    {route.duration}
                  </span>
                  <Link
                    href="/explore"
                    className="rounded-lg px-3 py-1.5 font-inter text-xs font-semibold transition-colors"
                    style={{ backgroundColor: `${route.color}15`, color: route.color }}
                  >
                    Explorar →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer />
      <AIFloatingButton context={{ page: "routes" }} />
    </div>
  );
}
