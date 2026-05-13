import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  Bot,
  Compass,
  Cpu,
  EyeOff,
  Globe2,
  Laptop,
  Lock,
  Map,
  MapPin,
  MessageSquareWarning,
  Navigation,
  Route,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ImageAutoSlider, type ImageAutoSliderItem } from "@/components/ui/image-auto-slider";

type Place = {
  id: string;
  slug: string;
  name_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  aggregated_rating: number | null;
  review_count: number | null;
  place_categories:
    | {
    name_i18n: Record<string, string> | null;
    icon_name: string | null;
    slug: string | null;
  }
    | Array<{
        name_i18n: Record<string, string> | null;
        icon_name: string | null;
        slug: string | null;
      }>
    | null;
};

const PROBLEM_CARDS: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
}> = [
  {
    title: "Sin contexto cultural",
    description:
      "Los mapas tradicionales te llevan del punto A al B, pero ignoran la historia, las leyendas y la importancia cultural del lugar por el que pasas.",
    icon: EyeOff,
    tone: "text-red-300 bg-red-500/10 border-red-400/20",
  },
  {
    title: "Reseñas poco honestas",
    description:
      "Plataformas llenas de recomendaciones genéricas, sesgadas por el turismo comercial y alejadas de la verdadera experiencia local.",
    icon: MessageSquareWarning,
    tone: "text-amber-300 bg-amber-500/10 border-amber-400/20",
  },
  {
    title: "Destinos inexplorados",
    description:
      "Honduras es vasta, pero el turismo se concentra en pocos destinos, dejando pueblos históricos y maravillas naturales fuera del mapa.",
    icon: Compass,
    tone: "text-sky-300 bg-sky-500/10 border-sky-400/20",
  },
];

const UNSPLASH_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1974&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=2152&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=2126&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1482881497185-d4a9ddbe4151?q=80&w=1965&auto=format&fit=crop",
  "https://plus.unsplash.com/premium_photo-1673264933212-d78737f38e48?q=80&w=1974&auto=format&fit=crop",
  "https://plus.unsplash.com/premium_photo-1711434824963-ca894373272e?q=80&w=2030&auto=format&fit=crop",
  "https://plus.unsplash.com/premium_photo-1675705721263-0bbeec261c49?q=80&w=1940&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524799526615-766a9833dec0?q=80&w=1935&auto=format&fit=crop",
];

const FALLBACK_DESTINATIONS: Array<{
  name: string;
  description: string;
  href: string;
  iconName: string;
}> = [
  {
    name: "Copan Ruinas",
    description: "Historia maya antigua y cultura viva.",
    href: "/places/ruinas-copan",
    iconName: "landmark",
  },
  {
    name: "Roatan",
    description: "Arrecifes, Caribe e historias de puerto.",
    href: "/places/playa-west-bay-roatan",
    iconName: "waves",
  },
  {
    name: "La Tigra",
    description: "Bosque nublado cerca de la capital.",
    href: "/places/parque-nacional-la-tigra",
    iconName: "leaf",
  },
  {
    name: "Comayagua",
    description: "Arquitectura colonial y tradiciones vivas.",
    href: "/places/catedral-comayagua",
    iconName: "church",
  },
];

const INNOVATION_CARDS: Array<{
  title: string;
  description: string;
  badge?: string;
  icon: LucideIcon;
  color: string;
}> = [
  {
    title: "Terminal Robot",
    description:
      "Kioscos fisicos de Itinera ubicados en puntos clave, impulsados por edge AI para orientar turistas incluso con conectividad limitada.",
    badge: "NVIDIA Jetson",
    icon: Bot,
    color: "text-[#89f5e7]",
  },
  {
    title: "Web Dashboard",
    description:
      "Explora el mapa, consulta historias y construye rutas culturales desde una experiencia web pensada para planificar con claridad.",
    icon: Laptop,
    color: "text-[#95d3ba]",
  },
  {
    title: "App Movil",
    description:
      "La siguiente pieza del ecosistema: una guia de bolsillo para llevar rutas, favoritos y narracion cultural durante el viaje.",
    icon: Smartphone,
    color: "text-[#ffb59a]",
  },
];

function getText(value: Record<string, string> | null | undefined, fallback: string) {
  return value?.es ?? value?.en ?? fallback;
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function MetricChip({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2.5 text-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.16)] backdrop-blur-md transition-colors duration-200 hover:border-white/20 sm:min-h-12 sm:gap-3 sm:px-5 sm:py-3">
      <Icon className="h-4 w-4 shrink-0 text-[#89f5e7] sm:h-5 sm:w-5" aria-hidden="true" />
      <span className="min-w-0 font-inter text-xs font-semibold sm:text-sm">{label}</span>
    </div>
  );
}

function SectionEyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`mb-4 block font-inter text-[11px] font-bold uppercase tracking-[0.24em] ${
        dark ? "text-[#F59E0B]" : "text-[#00685f]"
      }`}
    >
      {children}
    </span>
  );
}

function LandingNav() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#0A0F0F]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-jakarta text-xl font-bold text-[#89f5e7] transition-opacity duration-200 hover:opacity-85"
        >
          Itinera
        </Link>

        <div className="flex items-center gap-2">
          <Link className="hidden font-inter text-sm font-semibold text-white/70 transition-colors hover:text-white sm:inline-flex" href="/login">
            Conectar
          </Link>
          <Link
            className="hidden min-h-10 items-center rounded-lg bg-[#00685f] px-5 py-2 font-inter text-sm font-bold text-white shadow-lg shadow-teal-950/30 transition-colors duration-200 hover:bg-[#008378] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#89f5e7] sm:inline-flex"
            href="/bienvenida?redirect=/dashboard"
          >
            Empezar
          </Link>
        </div>
      </div>
    </header>
  );
}

function ProductMockup() {
  return (
    <div className="mx-auto max-w-[920px] overflow-hidden rounded-xl border border-[#bcc9c6] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.2)]">
      <div className="flex h-11 items-center gap-2 border-b border-[#dee4e1] bg-[#eaefed] px-4">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <div className="mx-auto hidden h-6 w-1/2 items-center gap-2 rounded-md border border-[#bcc9c6] bg-white px-3 text-left sm:flex">
          <Lock className="h-3 w-3 text-[#6d7a77]" aria-hidden="true" />
          <span className="font-inter text-[10px] font-semibold text-[#3d4947]">app.itinera.hn</span>
        </div>
      </div>

      <div className="grid min-h-[460px] grid-cols-[56px_minmax(0,1fr)] bg-[#f5faf8] md:grid-cols-[180px_minmax(0,1fr)_260px]">
        <aside className="border-r border-[#dee4e1] bg-[#f0f5f2] p-4">
          <div className="mb-8 h-8 rounded-lg bg-[#bcc9c6]/35 md:w-24" />
          <div className="space-y-4">
            <div className="h-4 rounded bg-[#bcc9c6]/35" />
            <div className="h-4 rounded bg-[#bcc9c6]/35" />
            <div className="h-4 rounded bg-[#bcc9c6]/35 md:w-3/4" />
          </div>
        </aside>

        <div className="relative min-h-[460px] overflow-hidden bg-white">
          <div className="absolute inset-0 opacity-[0.13] [background-image:radial-gradient(#00685f_1px,transparent_1px)] [background-size:22px_22px]" />
          <div className="absolute left-[12%] top-[16%] h-24 w-40 rounded-full border border-[#00685f]/25" />
          <div className="absolute bottom-[14%] right-[16%] h-32 w-52 rounded-full border border-[#3B82F6]/20" />
          <div className="absolute left-[24%] top-[27%]">
            <MapPinLabel title="Copan Ruinas" />
          </div>
          <div className="absolute right-[22%] top-[53%]">
            <MapPinLabel title="Comayagua" compact />
          </div>
          <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {["Patrimonio", "Naturaleza", "Historias"].map((item) => (
              <div key={item} className="rounded-lg border border-[#dee4e1] bg-white/90 px-3 py-2 text-left shadow-sm backdrop-blur">
                <span className="font-inter text-[11px] font-bold text-[#00685f]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="hidden border-l border-[#dee4e1] bg-[#f0f5f2] p-4 md:flex md:flex-col">
          <div className="mb-4 flex items-center gap-2 font-jakarta text-sm font-bold text-[#171d1c]">
            <Bot className="h-5 w-5 text-[#00685f]" aria-hidden="true" />
            Asistente Itinera
          </div>
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="rounded-lg border border-[#dee4e1] bg-white p-3 text-left shadow-sm">
              <p className="font-inter text-[11px] leading-relaxed text-[#3d4947]">
                La Escalinata de los Jeroglificos conserva una de las narraciones mas importantes del mundo maya.
              </p>
            </div>
            <div className="ml-auto w-4/5 rounded-lg border border-[#00685f]/20 bg-[#adedd3]/35 p-3 text-right shadow-sm">
              <p className="font-inter text-[11px] leading-relaxed text-[#171d1c]">Construye una ruta cultural para hoy.</p>
            </div>
            <div className="rounded-lg border border-[#dee4e1] bg-white p-3 text-left shadow-sm">
              <p className="font-inter text-[11px] leading-relaxed text-[#3d4947]">
                Lista una ruta con Copan, Comayagua y recomendaciones cercanas.
              </p>
            </div>
          </div>
          <div className="mt-4 flex h-9 items-center gap-2 rounded-full border border-[#dee4e1] bg-white px-3">
            <Search className="h-3.5 w-3.5 text-[#6d7a77]" aria-hidden="true" />
            <span className="font-inter text-[11px] text-[#6d7a77]">Pregunta sobre Honduras...</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MapPinLabel({ title, compact = false }: { title: string; compact?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00685f] text-white shadow-lg shadow-teal-900/25 ring-4 ring-white">
        <MapPin className="h-4 w-4" aria-hidden="true" />
      </div>
      {!compact && (
        <div className="mt-2 rounded-md border border-[#dee4e1] bg-white px-2 py-1 shadow-sm">
          <span className="font-inter text-[10px] font-bold text-[#171d1c]">{title}</span>
        </div>
      )}
    </div>
  );
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: places }, { count: placeCount }, { count: storyCount }] = await Promise.all([
    supabase
      .from("places")
      .select(
        "id, slug, name_i18n, description_i18n, aggregated_rating, review_count, place_categories(name_i18n, icon_name, slug), regions(name_i18n, slug)"
      )
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("aggregated_rating", { ascending: false })
      .limit(20),
    supabase.from("places").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("moderation_status", "approved"),
  ]);

  const destinationPlaces = shuffle((places ?? []) as Place[]).slice(0, 12);
  const sliderItems: ImageAutoSliderItem[] =
    destinationPlaces.length > 0
      ? destinationPlaces.map((place, index) => {
          const category = firstRelation(place.place_categories);
          return {
            id: place.id,
            title: getText(place.name_i18n, place.slug),
            description: getText(place.description_i18n, "Destino cultural de Honduras."),
            href: `/places/${place.slug}`,
            imageUrl: UNSPLASH_IMAGE_POOL[index % UNSPLASH_IMAGE_POOL.length],
            category: category ? getText(category.name_i18n, "") : undefined,
            rating: typeof place.aggregated_rating === "number" ? Number(place.aggregated_rating) : null,
            badge:
              typeof place.review_count === "number"
                ? place.review_count > 0
                  ? formatCount(place.review_count, "resena", "resenas")
                  : "Nuevo"
                : "Nuevo",
          };
        })
      : FALLBACK_DESTINATIONS.map((fallback, index) => ({
          id: fallback.href,
          title: fallback.name,
          description: fallback.description,
          href: fallback.href,
          imageUrl: UNSPLASH_IMAGE_POOL[index % UNSPLASH_IMAGE_POOL.length],
          badge: "Nuevo",
        }));
  const metrics = [
    {
      icon: Map,
      label: placeCount ? formatCount(placeCount, "destino publicado", "destinos publicados") : "Destinos culturales",
    },
    {
      icon: Globe2,
      label: "Honduras cultural",
    },
    {
      icon: Sparkles,
      label: storyCount ? formatCount(storyCount, "historia publicada", "historias publicadas") : "Historias con IA",
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5faf8] text-[#171d1c]">
      <LandingNav />

      <section className="itinera-topo relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0F0F] px-4 pb-20 pt-28 text-center sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(13,148,136,0.2),transparent_35%),radial-gradient(circle_at_20%_78%,rgba(245,158,11,0.12),transparent_30%)]" />
        <div className="itinera-reveal relative z-10 mx-auto flex max-w-7xl flex-col items-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-3 py-1.5 font-inter text-xs font-bold uppercase tracking-[0.16em] text-[#F59E0B]">
            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
            WRO 2026
          </div>
          <h1 className="mx-auto max-w-[21rem] text-balance font-jakarta text-[34px] font-extrabold leading-[1.08] text-white sm:max-w-5xl sm:text-[64px] sm:leading-[1.05] lg:text-[80px]">
            <span className="block sm:inline">Honduras tiene</span>{" "}
            <span className="block sm:inline">mas de lo que</span>{" "}
            <span className="block sm:inline">te cuentan</span>
          </h1>
          <p className="mx-auto mt-7 max-w-[21rem] text-balance font-inter text-[15px] leading-7 text-white/70 sm:max-w-2xl sm:text-lg sm:leading-8">
            Itinera es tu guia cultural impulsada por inteligencia artificial. Descubre historias locales, rutas autenticas y el verdadero contexto de cada rincon.
          </p>
          <Link
            className="mt-10 inline-flex min-h-14 items-center gap-2 rounded-lg bg-[#00685f] px-8 py-4 font-inter text-sm font-bold text-white shadow-xl shadow-teal-950/30 transition-all duration-200 hover:bg-[#008378] hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#89f5e7]"
            href="/bienvenida?redirect=/dashboard"
          >
            Empezar a explorar <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="mt-16 flex max-w-full flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            {metrics.map((metric) => (
              <MetricChip key={metric.label} icon={metric.icon} label={metric.label} />
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-[#0F172A] to-transparent" />
      </section>

      <section className="relative bg-[#0F172A] px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="itinera-reveal text-center">
            <SectionEyebrow dark>El problema</SectionEyebrow>
            <h2 className="font-jakarta text-3xl font-bold text-white sm:text-4xl">Siempre los mismos lugares</h2>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PROBLEM_CARDS.map(({ title, description, icon: Icon, tone }) => (
              <article
                key={title}
                className="itinera-reveal rounded-xl border border-white/10 bg-[#1E293B] p-8 shadow-lg shadow-black/10 transition-colors duration-200 hover:border-white/20"
              >
                <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-lg border ${tone}`}>
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="font-jakarta text-xl font-bold text-white">{title}</h3>
                <p className="mt-4 font-inter text-sm leading-6 text-white/62">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="overflow-hidden bg-white px-4 py-28 sm:px-6 lg:py-32">
        <div className="mx-auto max-w-7xl text-center">
          <div className="itinera-reveal mb-12">
            <SectionEyebrow>Como funciona</SectionEyebrow>
            <h2 className="font-jakarta text-3xl font-bold text-[#171d1c] sm:text-4xl">Tu companero inteligente de viaje</h2>
          </div>
          <div className="itinera-reveal">
            <ProductMockup />
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {[
              { icon: Map, label: "Mapa en tiempo real" },
              { icon: Sparkles, label: "Historias con IA" },
              { icon: Route, label: "Rutas personalizadas" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="inline-flex items-center gap-2 rounded-full border border-[#dee4e1] bg-white px-5 py-2.5 shadow-sm">
                <Icon className="h-4 w-4 text-[#00685f]" aria-hidden="true" />
                <span className="font-inter text-sm font-bold text-[#171d1c]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f0f5f2] px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="itinera-reveal mb-12">
            <SectionEyebrow dark>Descubre Honduras</SectionEyebrow>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-jakarta text-3xl font-bold text-[#171d1c] sm:text-4xl">Comienza tu viaje</h2>
                <p className="mt-3 max-w-2xl font-inter text-sm leading-6 text-[#3d4947]">
                  Destinos publicados desde la base real de Itinera, listos para explorar con contexto cultural.
                </p>
              </div>
              <Link className="inline-flex items-center gap-2 font-inter text-sm font-bold text-[#00685f] transition-opacity hover:opacity-80" href="/dashboard">
                Ver mapa completo <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <ImageAutoSlider items={sliderItems} />
        </div>
      </section>

      <section className="bg-[#0F172A] px-4 py-24 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="itinera-reveal mb-12">
            <SectionEyebrow>Mas que una app</SectionEyebrow>
            <h2 className="font-jakarta text-3xl font-bold sm:text-4xl">Un ecosistema completo</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {INNOVATION_CARDS.map(({ title, description, badge, icon: Icon, color }) => (
              <article key={title} className="itinera-reveal relative overflow-hidden rounded-xl border border-white/10 bg-[#1E293B] p-8 shadow-lg shadow-black/10 transition-colors duration-200 hover:border-white/20">
                {badge ? (
                  <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded border border-amber-400/25 bg-amber-500/15 px-2 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-amber-300">
                    <Cpu className="h-3 w-3" aria-hidden="true" />
                    {badge}
                  </div>
                ) : null}
                <Icon className={`mb-7 h-10 w-10 ${color}`} aria-hidden="true" />
                <h3 className="font-jakarta text-2xl font-bold">{title}</h3>
                <p className="mt-3 font-inter text-sm leading-6 text-white/62">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#00685f] to-[#004d46] px-4 py-24 text-center text-white sm:px-6">
        <div className="absolute -left-56 -top-56 h-[520px] w-[520px] rounded-full border border-white/8" />
        <div className="absolute -bottom-72 -right-72 h-[760px] w-[760px] rounded-full border border-white/8" />
        <div className="itinera-reveal relative z-10 mx-auto flex max-w-3xl flex-col items-center">
          <ShieldCheck className="mb-6 h-12 w-12 text-[#89f5e7]" aria-hidden="true" />
          <h2 className="font-jakarta text-[40px] font-extrabold leading-tight sm:text-[52px]">Listo para descubrir Honduras?</h2>
          <p className="mt-5 max-w-2xl font-inter text-base leading-7 text-white/72">
            Explora destinos, escucha historias y prepara rutas con una guia cultural creada para mostrar el pais con mas profundidad.
          </p>
          <Link
            className="mt-9 inline-flex min-h-14 items-center gap-2 rounded-lg bg-white px-8 py-4 font-inter text-sm font-bold text-[#00685f] shadow-xl transition-colors duration-200 hover:bg-[#f0f5f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            href="/bienvenida?redirect=/dashboard"
          >
            Empezar ahora <Navigation className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <footer className="relative z-10 mx-auto mt-24 flex max-w-7xl flex-col items-center justify-between gap-6 border-t border-white/10 pt-10 md:flex-row">
          <p className="font-inter text-sm text-white/70">WRO 2026 · INNOVAKERS · UNICAH · Honduras</p>
          <div className="flex gap-6">
            <Link className="font-inter text-sm text-white/70 transition-colors hover:text-white" href="/profile">
              Perfil
            </Link>
            <Link className="font-inter text-sm text-white/70 transition-colors hover:text-white" href="/stories">
              Historias
            </Link>
            <Link className="font-inter text-sm text-white/70 transition-colors hover:text-white" href="/routes">
              Rutas
            </Link>
          </div>
        </footer>
      </section>
    </main>
  );
}
