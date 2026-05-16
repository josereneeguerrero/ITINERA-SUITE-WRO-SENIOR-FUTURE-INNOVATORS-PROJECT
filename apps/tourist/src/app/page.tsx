import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { ImageAutoSlider, type ImageAutoSliderItem } from "@/components/ui/image-auto-slider";
import { LandingNav } from "@/components/landing/landing-nav";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Brain,
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
  Smartphone,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Place = {
  id: string;
  slug: string;
  name_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  aggregated_rating: number | null;
  review_count: number | null;
  place_categories:
    | { name_i18n: Record<string, string> | null; icon_name: string | null; slug: string | null }
    | Array<{ name_i18n: Record<string, string> | null; icon_name: string | null; slug: string | null }>
    | null;
};

// ─── Static Data ──────────────────────────────────────────────────────────────

const PROBLEM_CARDS: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}> = [
  {
    title: "Sin contexto cultural",
    description:
      "Los mapas tradicionales te llevan del punto A al B, pero ignoran la historia, las leyendas y la importancia cultural del lugar por el que pasas.",
    icon: EyeOff,
    accent: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
  {
    title: "Reseñas poco honestas",
    description:
      "Plataformas llenas de recomendaciones genéricas, sesgadas por el turismo comercial y alejadas de la verdadera experiencia local.",
    icon: MessageSquareWarning,
    accent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    title: "Destinos inexplorados",
    description:
      "Honduras es vasta, pero el turismo se concentra en pocos destinos, dejando pueblos históricos y maravillas naturales fuera del mapa.",
    icon: Compass,
    accent: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
];

const FEATURE_CARDS: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor: string;
  bg: string;
  border: string;
  wide?: boolean;
}> = [
  {
    icon: Map,
    title: "Mapa Interactivo",
    description:
      "Explora Honduras en tiempo real. Filtra por categoría, consulta detalles de cada lugar y construye rutas directamente sobre el mapa con MapLibre GL.",
    iconColor: "#0D9488",
    bg: "bg-teal-50",
    border: "border-teal-100",
    wide: true,
  },
  {
    icon: Sparkles,
    title: "Historias con IA",
    description:
      "Cada lugar tiene una historia. Narración cultural generada con contexto histórico verificado, disponible en español.",
    iconColor: "#7C3AED",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    icon: Route,
    title: "Rutas Personalizadas",
    description:
      "Crea, guarda y comparte itinerarios culturales. Agrega lugares al vuelo desde el mapa y exporta tu ruta.",
    iconColor: "#D97706",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    icon: Brain,
    title: "Búsqueda Semántica",
    description:
      "Pregunta en lenguaje natural. Itinera entiende consultas como 'lugares con historia maya' y devuelve resultados relevantes con pgvector.",
    iconColor: "#0284C7",
    bg: "bg-sky-50",
    border: "border-sky-100",
  },
];

const ECOSYSTEM_CARDS: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  badge?: string;
  badgeColor?: string;
}> = [
  {
    icon: Bot,
    title: "Terminal Jetson",
    description:
      "Kioscos físicos en puntos clave del país, impulsados por NVIDIA Jetson. Edge AI que orienta turistas incluso con conectividad limitada.",
    color: "text-[#89f5e7]",
    badge: "NVIDIA Jetson",
    badgeColor: "text-amber-300 bg-amber-500/15 border-amber-400/25",
  },
  {
    icon: Laptop,
    title: "Web Dashboard",
    description:
      "Planifica tu visita desde el navegador. Mapa completo, historias, rutas y asistente IA disponibles desde cualquier dispositivo.",
    color: "text-[#95d3ba]",
  },
  {
    icon: Smartphone,
    title: "App Móvil",
    description:
      "La siguiente pieza del ecosistema: guía de bolsillo para llevar rutas, favoritos y narración cultural durante el recorrido.",
    color: "text-[#ffb59a]",
    badge: "Próximamente",
    badgeColor: "text-rose-300 bg-rose-500/15 border-rose-400/25",
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

const FALLBACK_DESTINATIONS = [
  { name: "Copan Ruinas", description: "Historia maya antigua y cultura viva.", href: "/places/ruinas-copan" },
  { name: "Roatan", description: "Arrecifes, Caribe e historias de puerto.", href: "/places/playa-west-bay-roatan" },
  { name: "La Tigra", description: "Bosque nublado cerca de la capital.", href: "/places/parque-nacional-la-tigra" },
  { name: "Comayagua", description: "Arquitectura colonial y tradiciones vivas.", href: "/places/catedral-comayagua" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getText(value: Record<string, string> | null | undefined, fallback: string) {
  return value?.es ?? value?.en ?? fallback;
}
function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}
function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e2de] bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm">
      <Icon className="h-4 w-4 shrink-0 text-[#0D9488]" aria-hidden />
      <span className="font-inter text-xs font-semibold text-[#334155]">{label}</span>
    </div>
  );
}

function PinLabel({ title, compact = false }: { title: string; compact?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0D9488] shadow-lg shadow-teal-900/20 ring-[3px] ring-white">
        <MapPin className="h-3.5 w-3.5 text-white" aria-hidden />
      </div>
      {!compact && (
        <div className="mt-1.5 rounded-lg border border-[#dee4e1] bg-white/95 px-2 py-1 shadow-sm backdrop-blur-sm">
          <span className="font-inter text-[10px] font-bold text-[#0f172a]">{title}</span>
        </div>
      )}
    </div>
  );
}

function ProductMockup() {
  return (
    <div className="mx-auto max-w-[940px] overflow-hidden rounded-2xl border border-[#bcc9c6] bg-white shadow-[0_32px_100px_rgba(15,23,42,0.14)]">
      {/* Browser chrome */}
      <div className="flex h-11 items-center gap-2 border-b border-[#dee4e1] bg-[#f0f5f2] px-4">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <div className="mx-auto hidden h-6 w-2/5 items-center gap-2 rounded-md border border-[#bcc9c6] bg-white/80 px-3 sm:flex">
          <Lock className="h-3 w-3 text-[#6d7a77]" aria-hidden />
          <span className="font-inter text-[10px] font-semibold text-[#3d4947]">app.itinera.hn</span>
        </div>
      </div>

      {/* App layout */}
      <div className="grid min-h-[480px] grid-cols-[52px_1fr] md:grid-cols-[172px_1fr_280px]">
        {/* Sidebar */}
        <aside className="border-r border-[#dee4e1] bg-[#f0f5f2] p-3 md:p-4">
          <div className="mb-6 h-7 w-full rounded-lg bg-[#bcc9c6]/40" />
          <div className="space-y-3">
            {["Dashboard", "Explorar", "Rutas", "Historias"].map((item) => (
              <div key={item} className="hidden h-4 w-full rounded bg-[#bcc9c6]/30 md:block" />
            ))}
            <div className="hidden h-4 w-3/4 rounded bg-[#0D9488]/30 md:block" />
          </div>
        </aside>

        {/* Map area */}
        <div className="relative min-h-[480px] overflow-hidden bg-[#eaf3ef]">
          <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#00685f_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="absolute left-[8%] top-[12%] h-32 w-52 rounded-full border border-[#0D9488]/15 bg-[#0D9488]/6" />
          <div className="absolute bottom-[18%] right-[10%] h-24 w-40 rounded-full border border-teal-400/15 bg-teal-400/6" />
          {/* Dashed route line */}
          <svg className="absolute inset-0 h-full w-full opacity-25" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path
              d="M 80 200 Q 200 110 300 170 T 500 130"
              stroke="#0D9488"
              strokeWidth="2"
              fill="none"
              strokeDasharray="7,5"
            />
          </svg>
          {/* Pins */}
          <div className="absolute left-[20%] top-[26%]">
            <PinLabel title="Copan Ruinas" />
          </div>
          <div className="absolute right-[26%] top-[54%]">
            <PinLabel title="Comayagua" compact />
          </div>
          <div className="absolute left-[50%] top-[40%]">
            <PinLabel title="Tegucigalpa" compact />
          </div>
          {/* Category chips */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
            {["Patrimonio", "Naturaleza", "Gastronomía"].map((cat, i) => (
              <div
                key={cat}
                className={`rounded-full border px-3 py-1.5 font-inter text-[10px] font-bold shadow-sm backdrop-blur-sm ${
                  i === 0
                    ? "border-[#0D9488]/30 bg-[#0D9488] text-white"
                    : "border-[#dee4e1] bg-white/90 text-[#0D9488]"
                }`}
              >
                {cat}
              </div>
            ))}
          </div>
        </div>

        {/* AI Panel */}
        <aside className="hidden border-l border-[#dee4e1] bg-[#f0f5f2] p-4 md:flex md:flex-col">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0D9488]">
              <Bot className="h-4 w-4 text-white" aria-hidden />
            </div>
            <span className="font-jakarta text-sm font-bold text-[#0f172a]">Itinera IA</span>
            <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          </div>
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="rounded-xl border border-[#dee4e1] bg-white p-3 shadow-sm">
              <p className="font-inter text-[11px] leading-relaxed text-[#334155]">
                La Escalinata Jeroglífica de Copan conserva uno de los textos mayas más largos del mundo.
              </p>
            </div>
            <div className="ml-auto max-w-[88%] rounded-xl border border-[#0D9488]/20 bg-[#f0fdfa] p-3 shadow-sm">
              <p className="font-inter text-[11px] leading-relaxed text-[#0f172a]">
                Crea una ruta cultural para hoy.
              </p>
            </div>
            <div className="rounded-xl border border-[#dee4e1] bg-white p-3 shadow-sm">
              <p className="font-inter text-[11px] leading-relaxed text-[#334155]">
                Ruta sugerida: Copan → Comayagua → Tegucigalpa. 5h · 3 paradas culturales.
              </p>
            </div>
          </div>
          <div className="mt-4 flex h-9 items-center gap-2 rounded-full border border-[#dee4e1] bg-white px-3 shadow-inner">
            <Search className="h-3.5 w-3.5 text-[#6d7a77]" aria-hidden />
            <span className="font-inter text-[10px] text-[#6d7a77]">Pregunta sobre Honduras...</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: places }, { count: placeCount }, { count: storyCount }] = await Promise.all([
    supabase
      .from("places")
      .select(
        "id, slug, name_i18n, description_i18n, aggregated_rating, review_count, place_categories(name_i18n, icon_name, slug)"
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

  const shuffled = shuffle((places ?? []) as Place[]).slice(0, 12);
  const sliderItems: ImageAutoSliderItem[] =
    shuffled.length > 0
      ? shuffled.map((place, index) => {
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
              typeof place.review_count === "number" && place.review_count > 0
                ? formatCount(place.review_count, "reseña", "reseñas")
                : "Nuevo",
          };
        })
      : FALLBACK_DESTINATIONS.map((f, index) => ({
          id: f.href,
          title: f.name,
          description: f.description,
          href: f.href,
          imageUrl: UNSPLASH_IMAGE_POOL[index % UNSPLASH_IMAGE_POOL.length],
          badge: "Nuevo",
        }));

  const metrics: Array<{ icon: LucideIcon; label: string }> = [
    {
      icon: Map,
      label: placeCount
        ? formatCount(placeCount, "destino publicado", "destinos publicados")
        : "Destinos culturales",
    },
    { icon: Globe2, label: "Honduras, en profundidad" },
    {
      icon: Sparkles,
      label: storyCount
        ? formatCount(storyCount, "historia con IA", "historias con IA")
        : "Historias con IA",
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f0f5f2] text-[#0f172a]">
      <LandingNav />

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      {/* Static radial gradients — same look as aurora, zero GPU/animation cost */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-28 sm:px-6"
        style={{
          background: [
            "radial-gradient(ellipse 80% 60% at 15% 20%, rgba(13,148,136,0.18) 0%, transparent 60%)",
            "radial-gradient(ellipse 60% 50% at 85% 70%, rgba(0,104,95,0.14) 0%, transparent 55%)",
            "radial-gradient(ellipse 50% 40% at 55% 90%, rgba(245,158,11,0.07) 0%, transparent 50%)",
            "#f0f5f2",
          ].join(", "),
        }}
      >
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center text-center">

          {/* WRO badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#0D9488]/25 bg-[#0D9488]/10 px-4 py-2 font-inter text-xs font-bold uppercase tracking-[0.18em] text-[#00685f]">
            <Trophy className="h-3.5 w-3.5" aria-hidden />
            WRO Future Innovators 2026
          </div>

          {/* Headline */}
          <h1
            className="mx-auto max-w-[18rem] text-balance font-jakarta font-extrabold leading-[1.07] text-[#0f172a] sm:max-w-4xl"
            style={{ fontSize: "clamp(38px, 6vw, 80px)" }}
          >
            Honduras tiene más de lo que te cuentan
          </h1>

          <p className="mx-auto mt-7 max-w-[20rem] text-balance font-inter text-[15px] leading-7 text-[#334155] sm:max-w-2xl sm:text-lg">
            Itinera es una guía cultural impulsada por inteligencia artificial. Descubre historias locales,
            rutas auténticas y el verdadero contexto de cada rincón de Honduras.
          </p>

          {/* Primary CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/bienvenida?redirect=/dashboard"
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-[#0D9488] px-7 py-3 font-inter text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-all duration-200 hover:bg-[#0f766e] hover:shadow-xl hover:shadow-teal-500/25 active:scale-95"
            >
              Explorar Honduras <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href="#demo"
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-[#d7e2de] bg-white/80 px-7 py-3 font-inter text-sm font-bold text-[#334155] backdrop-blur-sm transition-all duration-200 hover:border-[#0D9488]/40 hover:bg-white hover:text-[#0D9488]"
            >
              Ver cómo funciona
            </a>
          </div>

          {/* Live metric chips */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
            {metrics.map((m) => (
              <HeroChip key={m.label} icon={m.icon} label={m.label} />
            ))}
          </div>

          {/* Tech stack credits */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {["MapLibre GL", "Supabase pgvector", "NVIDIA Jetson", "Next.js 16"].map((tech, i, arr) => (
              <span key={tech} className="font-inter text-[11px] font-medium text-[#94a3b8]">
                {tech}
                {i < arr.length - 1 && <span className="ml-3 text-[#d7e2de]">·</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. PROBLEMA ──────────────────────────────────────────────────── */}
      <section id="problema" className="bg-[#0f172a] px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <span className="mb-4 block text-center font-inter text-[11px] font-bold uppercase tracking-[0.22em] text-[#F59E0B]">
              El problema
            </span>
            <h2 className="mb-5 text-center font-jakarta text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              El turismo tradicional<br className="hidden sm:block" /> te pierde lo mejor
            </h2>
            <p className="mx-auto mb-16 max-w-2xl text-center font-inter text-sm leading-6 text-white/60 sm:text-base">
              Honduras es uno de los países más ricos culturalmente en Centroamérica. Pero pocas plataformas lo cuentan así.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {PROBLEM_CARDS.map(({ title, description, icon: Icon, accent }, i) => (
              <ScrollReveal key={title} delay={i * 120}>
                <article className="h-full rounded-2xl border border-white/8 bg-[#1E293B] p-7 transition-all duration-200 hover:border-white/15 hover:bg-[#243447]">
                  <div className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border ${accent}`}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="font-jakarta text-lg font-bold text-white">{title}</h3>
                  <p className="mt-3 font-inter text-sm leading-6 text-white/60">{description}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. FEATURES GRID ─────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <span className="mb-4 block text-center font-inter text-[11px] font-bold uppercase tracking-[0.22em] text-[#0D9488]">
              La solución
            </span>
            <h2 className="mb-4 text-center font-jakarta text-3xl font-bold text-[#0f172a] sm:text-4xl md:text-5xl">
              Una plataforma diseñada<br className="hidden sm:block" /> para ir más lejos
            </h2>
            <p className="mx-auto mb-16 max-w-2xl text-center font-inter text-sm leading-6 text-[#334155] sm:text-base">
              Itinera integra mapas, narrativa cultural, rutas y búsqueda semántica en una sola experiencia.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURE_CARDS.map(({ icon: Icon, title, description, iconColor, bg, border, wide }, i) => (
              <ScrollReveal
                key={title}
                delay={i * 100}
                className={wide ? "sm:col-span-2" : ""}
              >
                <article
                  className={`group h-full rounded-2xl border ${border} ${bg} p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white bg-white shadow-sm">
                    <Icon className="h-5 w-5" style={{ color: iconColor }} aria-hidden />
                  </div>
                  <h3 className="font-jakarta text-lg font-bold text-[#0f172a]">{title}</h3>
                  <p className="mt-3 font-inter text-sm leading-6 text-[#334155]">{description}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. PRODUCT DEMO ──────────────────────────────────────────────── */}
      <section id="demo" className="bg-[#f0f5f2] px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal className="mb-12 text-center">
            <span className="mb-4 block font-inter text-[11px] font-bold uppercase tracking-[0.22em] text-[#0D9488]">
              Cómo funciona
            </span>
            <h2 className="mb-4 font-jakarta text-3xl font-bold text-[#0f172a] sm:text-4xl">
              Tu compañero inteligente de viaje
            </h2>
            <p className="mx-auto max-w-xl font-inter text-sm leading-6 text-[#334155]">
              Mapa interactivo, asistente IA y constructor de rutas integrados. Todo en una sola interfaz.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <ProductMockup />
          </ScrollReveal>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              { icon: Map, label: "Mapa en tiempo real" },
              { icon: Sparkles, label: "IA conversacional" },
              { icon: Route, label: "Rutas culturales" },
              { icon: BookOpen, label: "Historias narradas" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-[#d7e2de] bg-white px-5 py-2.5 shadow-sm"
              >
                <Icon className="h-4 w-4 text-[#0D9488]" aria-hidden />
                <span className="font-inter text-sm font-bold text-[#0f172a]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. DESTINATIONS ──────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <span className="mb-3 block font-inter text-[11px] font-bold uppercase tracking-[0.22em] text-[#0D9488]">
                Descubre Honduras
              </span>
              <h2 className="font-jakarta text-3xl font-bold text-[#0f172a] sm:text-4xl">
                Comienza tu viaje
              </h2>
              <p className="mt-3 max-w-lg font-inter text-sm leading-6 text-[#334155]">
                Destinos reales desde la base de datos de Itinera, con contexto cultural verificado y listo para explorar.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex cursor-pointer items-center gap-1.5 font-inter text-sm font-bold text-[#0D9488] transition-opacity hover:opacity-75"
            >
              Ver mapa completo <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ImageAutoSlider items={sliderItems} />
        </div>
      </section>

      {/* ── 6. ECOSYSTEM ─────────────────────────────────────────────────── */}
      <section className="bg-[#0f172a] px-4 py-24 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <span className="mb-4 block text-center font-inter text-[11px] font-bold uppercase tracking-[0.22em] text-[#89f5e7]">
              El ecosistema
            </span>
            <h2 className="mb-5 text-center font-jakarta text-3xl font-bold sm:text-4xl md:text-5xl">
              Más que una app.<br className="hidden sm:block" /> Una suite completa.
            </h2>
            <p className="mx-auto mb-16 max-w-2xl text-center font-inter text-sm leading-6 text-white/60 sm:text-base">
              Itinera está diseñada para funcionar en múltiples contextos: el quiosco del aeropuerto, la web del hotel y la app del turista.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {ECOSYSTEM_CARDS.map(({ icon: Icon, title, description, color, badge, badgeColor }, i) => (
              <ScrollReveal key={title} delay={i * 130}>
                <article className="relative h-full overflow-hidden rounded-2xl border border-white/8 bg-[#1E293B] p-8 transition-all duration-200 hover:border-white/15 hover:bg-[#243447]">
                  {badge && badgeColor && (
                    <div
                      className={`absolute right-4 top-4 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.1em] ${badgeColor}`}
                    >
                      <Cpu className="h-3 w-3" aria-hidden />
                      {badge}
                    </div>
                  )}
                  <Icon className={`mb-6 h-10 w-10 ${color}`} aria-hidden />
                  <h3 className="font-jakarta text-2xl font-bold">{title}</h3>
                  <p className="mt-3 font-inter text-sm leading-6 text-white/60">{description}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. INNOVAKERS TEAM ───────────────────────────────────────────── */}
      <section id="equipo" className="bg-[#f0f5f2] px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <span className="mb-4 block text-center font-inter text-[11px] font-bold uppercase tracking-[0.22em] text-[#0D9488]">
              Quiénes somos
            </span>
            <h2 className="mb-5 text-center font-jakarta text-4xl font-extrabold text-[#0f172a] sm:text-5xl">
              Equipo INNOVAKERS
            </h2>
            <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-[#0D9488]/25 bg-[#0D9488]/10 px-3 py-1.5 font-inter text-xs font-bold text-[#00685f]">
                WRO Future Innovators 2026
              </span>
              <span className="rounded-full border border-[#d7e2de] bg-white px-3 py-1.5 font-inter text-xs font-bold text-[#334155]">
                UNICAH Honduras
              </span>
            </div>
            <p className="mx-auto mb-16 max-w-2xl text-center font-inter text-sm leading-7 text-[#334155] sm:text-base">
              Somos un equipo de estudiantes de la{" "}
              <strong className="text-[#0f172a]">Universidad Católica de Honduras</strong> apasionados por la
              tecnología y la cultura. Construimos Itinera para demostrar que la inteligencia artificial puede
              poner a Honduras en el mapa que merece.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                icon: Trophy,
                title: "WRO Future Innovators",
                description:
                  "La World Robot Olympiad evalúa soluciones tecnológicas innovadoras con impacto real. La categoría Future Innovators premia proyectos que resuelven problemas del mundo usando tecnología avanzada. Itinera es nuestra propuesta para 2026.",
                iconColor: "text-amber-600",
                bg: "bg-amber-50",
                border: "border-amber-100",
              },
              {
                icon: Cpu,
                title: "Tecnología de punta",
                description:
                  "NVIDIA Jetson para edge AI en terminales físicos, pgvector para búsqueda semántica, MapLibre GL para mapas en tiempo real, y Next.js 16 con Supabase para la plataforma web. Todo integrado y desplegado.",
                iconColor: "text-[#0D9488]",
                bg: "bg-teal-50",
                border: "border-teal-100",
              },
              {
                icon: Star,
                title: "Impacto real",
                description:
                  "Más de 16 destinos culturales de Honduras ya están en la plataforma, con historias, rutas y datos verificados. Un cron horario mantiene los embeddings semánticos actualizados para búsquedas más precisas.",
                iconColor: "text-sky-600",
                bg: "bg-sky-50",
                border: "border-sky-100",
              },
            ].map(({ icon: Icon, title, description, iconColor, bg, border }, i) => (
              <ScrollReveal key={title} delay={i * 120}>
                <article className={`h-full rounded-2xl border ${border} ${bg} p-7`}>
                  <Icon className={`mb-5 h-8 w-8 ${iconColor}`} aria-hidden />
                  <h3 className="font-jakarta text-lg font-bold text-[#0f172a]">{title}</h3>
                  <p className="mt-3 font-inter text-sm leading-6 text-[#334155]">{description}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. CTA + FOOTER ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0D9488] via-[#00685f] to-[#004d46] px-4 py-24 text-center text-white sm:px-6">
        {/* Decorative rings */}
        <div
          className="pointer-events-none absolute -left-48 -top-48 h-[480px] w-[480px] rounded-full border border-white/8"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-64 -right-64 h-[680px] w-[680px] rounded-full border border-white/6"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/4 top-1/3 h-[200px] w-[200px] rounded-full bg-white/5 blur-3xl"
          aria-hidden
        />

        <ScrollReveal className="relative z-10 mx-auto flex max-w-3xl flex-col items-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur-sm">
            <Navigation className="h-8 w-8 text-white" aria-hidden />
          </div>

          <h2
            className="font-jakarta font-extrabold leading-tight text-white"
            style={{ fontSize: "clamp(30px, 5vw, 56px)" }}
          >
            Listo para descubrir Honduras
          </h2>
          <p className="mt-5 max-w-xl font-inter text-base leading-7 text-white/75">
            Explora destinos, escucha historias y planifica rutas culturales. Gratuito, sin registro obligatorio.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/bienvenida?redirect=/dashboard"
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white px-8 py-3 font-inter text-sm font-bold text-[#00685f] shadow-xl transition-all duration-200 hover:bg-[#f0f5f2] hover:shadow-2xl active:scale-95"
            >
              Empezar ahora <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/explore?guest=true"
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 py-3 font-inter text-sm font-bold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
            >
              Explorar sin cuenta
            </Link>
          </div>
        </ScrollReveal>

        {/* Footer */}
        <footer className="relative z-10 mx-auto mt-20 max-w-7xl border-t border-white/15 pt-10">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-left">
              <p className="font-jakarta text-lg font-bold text-white">Itinera</p>
              <p className="mt-1 font-inter text-sm text-white/60">
                WRO 2026 · INNOVAKERS · UNICAH · Honduras
              </p>
            </div>
            <nav
              className="flex flex-wrap justify-center gap-6"
              aria-label="Footer"
            >
              {[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Explorar", href: "/explore?guest=true" },
                { label: "Historias", href: "/stories" },
                { label: "Rutas", href: "/routes" },
                { label: "Entrar", href: "/login" },
              ].map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="cursor-pointer font-inter text-sm text-white/65 transition-colors hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </footer>
      </section>
    </main>
  );
}
