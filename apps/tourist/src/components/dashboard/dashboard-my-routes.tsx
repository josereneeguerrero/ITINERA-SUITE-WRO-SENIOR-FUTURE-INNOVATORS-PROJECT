import Link from "next/link";
import { ArrowRight, MapPin, Plus, Route } from "lucide-react";

type Stop = {
  seq: number;
  places: { name_i18n: Record<string, string>; slug: string } | null;
};

type Itinerary = {
  id: string;
  title_i18n: Record<string, string>;
  public: boolean;
  created_at: string;
  itinerary_stops: Stop[];
};

function getText(v: Record<string, string> | null | undefined, fb: string) {
  return v?.es ?? v?.en ?? fb;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-HN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function DashboardMyRoutes({
  routes,
  isGuest,
}: {
  routes: Itinerary[];
  isGuest: boolean;
}) {
  if (isGuest) {
    return (
      <section className="mx-auto w-full max-w-6xl px-6 md:px-10">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="font-jakarta text-2xl font-bold text-[#171d1c] md:text-3xl">
            Mis Rutas
          </h2>
        </div>
        <div className="rounded-2xl border border-dashed border-[#bcc9c6] bg-white/60 p-8 text-center">
          <Route className="mx-auto mb-3 h-8 w-8 text-[#94a3b8]" aria-hidden />
          <p className="font-jakarta text-base font-bold text-[#334155]">
            Crea tu primera ruta cultural
          </p>
          <p className="mt-1.5 font-inter text-sm text-[#64748b]">
            Guarda lugares, ordénalos y comparte tu itinerario con otros viajeros.
          </p>
          <Link
            href="/bienvenida?redirect=/explore"
            className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0D9488] px-5 py-2.5 font-inter text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#0f766e]"
          >
            <Plus className="h-4 w-4" aria-hidden /> Crear cuenta gratis
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 md:px-10">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-jakarta text-2xl font-bold text-[#171d1c] md:text-3xl">
          Mis Rutas
        </h2>
        <Link
          href="/routes"
          className="inline-flex cursor-pointer items-center gap-1.5 font-inter text-sm font-bold text-[#0D9488] transition-opacity hover:opacity-75"
        >
          Ver todas <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {routes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#bcc9c6] bg-white/60 p-8 text-center">
          <Route className="mx-auto mb-3 h-8 w-8 text-[#94a3b8]" aria-hidden />
          <p className="font-jakarta text-base font-bold text-[#334155]">
            Aún no tienes rutas guardadas
          </p>
          <p className="mt-1.5 font-inter text-sm text-[#64748b]">
            Explora el mapa, agrega lugares y guarda tu itinerario.
          </p>
          <Link
            href="/explore"
            className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#d7e2de] bg-white px-5 py-2.5 font-inter text-sm font-bold text-[#334155] shadow-sm transition-all duration-200 hover:border-[#0D9488]/30 hover:text-[#0D9488]"
          >
            <MapPin className="h-4 w-4 text-[#0D9488]" aria-hidden /> Explorar mapa
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {routes.slice(0, 3).map((route) => {
            const stops = [...route.itinerary_stops].sort((a, b) => a.seq - b.seq);
            const title = getText(route.title_i18n, "Ruta sin título");
            return (
              <Link
                key={route.id}
                href={`/routes/${route.id}`}
                className="group cursor-pointer rounded-2xl border border-[#d7e2de] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0D9488]/30 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="font-jakarta text-sm font-bold leading-snug text-[#0f172a] group-hover:text-[#0D9488] transition-colors">
                    {title}
                  </p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 font-inter text-[10px] font-bold ${
                    route.public
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-50 text-slate-500 border border-slate-200"
                  }`}>
                    {route.public ? "Pública" : "Privada"}
                  </span>
                </div>
                {stops.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {stops.slice(0, 3).map((s) => s.places && (
                      <div key={s.seq} className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0D9488]" />
                        <span className="font-inter text-xs text-[#334155] truncate">
                          {getText(s.places.name_i18n, s.places.slug)}
                        </span>
                      </div>
                    ))}
                    {stops.length > 3 && (
                      <p className="font-inter text-xs text-[#94a3b8] pl-3">
                        +{stops.length - 3} más
                      </p>
                    )}
                  </div>
                )}
                <p className="font-inter text-[11px] text-[#94a3b8]">
                  {formatDate(route.created_at)} · {stops.length} {stops.length === 1 ? "parada" : "paradas"}
                </p>
              </Link>
            );
          })}

          {/* Create new CTA */}
          <Link
            href="/explore"
            className="group cursor-pointer flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#bcc9c6] bg-white/60 p-6 text-center transition-all duration-200 hover:border-[#0D9488]/40 hover:bg-white"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0D9488]/10 transition-colors group-hover:bg-[#0D9488]/15">
              <Plus className="h-5 w-5 text-[#0D9488]" aria-hidden />
            </div>
            <span className="font-inter text-sm font-semibold text-[#64748b] group-hover:text-[#0D9488] transition-colors">
              Nueva ruta
            </span>
          </Link>
        </div>
      )}
    </section>
  );
}
