import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";
import { AuroraBackground } from "@/components/ui/aurora-background";
import {
  ArrowRight, Heart, Map, MessageSquare, Route,
  Sparkles, Star, User,
} from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/bienvenida?redirect=/profile");

  const [
    { data: profile },
    { count: favCount },
    { count: routeCount },
    { count: reviewCount },
  ] = await Promise.all([
    supabase.from("profiles").select("display_name, created_at").eq("id", user.id).single(),
    supabase.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("itineraries").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "Explorador";
  const initial = name[0].toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("es-HN", { month: "long", year: "numeric" })
    : null;

  const STATS = [
    { icon: Heart,   label: "Favoritos",    count: favCount ?? 0,   href: "/profile/saved", color: "#EC4899", bg: "bg-pink-50",    border: "border-pink-100"   },
    { icon: Route,   label: "Mis Rutas",    count: routeCount ?? 0, href: "/routes",        color: "#0D9488", bg: "bg-teal-50",    border: "border-teal-100"   },
    { icon: Star,    label: "Reseñas",      count: reviewCount ?? 0,href: null,             color: "#F59E0B", bg: "bg-amber-50",   border: "border-amber-100"  },
    { icon: MessageSquare, label: "Chats IA", count: null,          href: "/ia",            color: "#7C3AED", bg: "bg-violet-50",  border: "border-violet-100" },
  ];

  return (
    <main className="min-h-screen w-full bg-[#f0f5f2] pb-28">

      {/* ── Hero ── */}
      <section className="mx-auto w-full max-w-2xl px-5 pt-8 md:px-6 md:pt-10">
        <AuroraBackground className="rounded-2xl border border-[#d7e2de] min-h-[200px] items-start justify-start">
          <div className="relative z-10 w-full px-6 py-7 md:px-7 md:py-8">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0D9488] font-jakarta text-2xl font-bold text-white shadow-md">
                {initial}
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <h1 className="font-jakarta text-2xl font-bold text-[#0f172a] truncate">{name}</h1>
                <p className="mt-0.5 font-inter text-sm text-[#64748b] truncate">{user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0D9488]/25 bg-[#0D9488]/10 px-2.5 py-1 font-inter text-xs font-bold text-[#00685f]">
                    <Sparkles className="h-3 w-3" aria-hidden /> Explorador Cultural
                  </span>
                  {memberSince && (
                    <span className="font-inter text-xs text-[#94a3b8]">Desde {memberSince}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AuroraBackground>
      </section>

      {/* ── Stats grid ── */}
      <section className="mx-auto mt-6 w-full max-w-2xl px-5 md:px-6">
        <div className="grid grid-cols-2 gap-3">
          {STATS.map(({ icon: Icon, label, count, href, color, bg, border }) => {
            const card = (
              <div className={`rounded-2xl border ${border} ${bg} p-4 transition-all duration-200 ${href ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""}`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-white">
                    <Icon className="h-4.5 w-4.5" style={{ color }} aria-hidden />
                  </div>
                  {count !== null && (
                    <span className="font-jakarta text-2xl font-bold" style={{ color }}>
                      {count}
                    </span>
                  )}
                </div>
                <p className="font-jakarta text-sm font-bold text-[#0f172a]">{label}</p>
                {count === null && (
                  <p className="mt-0.5 font-inter text-xs text-[#64748b]">Abrir Centro IA</p>
                )}
              </div>
            );

            return href ? (
              <Link key={label} href={href}>{card}</Link>
            ) : (
              <div key={label}>{card}</div>
            );
          })}
        </div>
      </section>

      {/* ── Quick actions ── */}
      <section className="mx-auto mt-5 w-full max-w-2xl px-5 md:px-6">
        <div className="space-y-2.5">
          {[
            { label: "Explorar el mapa",      href: "/explore",        icon: Map    },
            { label: "Ver mis favoritos",      href: "/profile/saved",  icon: Heart  },
            { label: "Crear nueva ruta",       href: "/explore",        icon: Route  },
          ].map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="group flex cursor-pointer items-center justify-between rounded-xl border border-[#d7e2de] bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:border-[#0D9488]/30 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-[#0D9488]" aria-hidden />
                <span className="font-inter text-sm font-semibold text-[#334155] group-hover:text-[#0D9488] transition-colors">
                  {label}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#bcc9c6] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0D9488]" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Account ── */}
      <section className="mx-auto mt-5 w-full max-w-2xl px-5 md:px-6">
        <div className="rounded-2xl border border-[#d7e2de] bg-white p-4">
          <div className="flex items-center gap-3 mb-3">
            <User className="h-4 w-4 text-[#94a3b8]" aria-hidden />
            <span className="font-inter text-xs font-bold uppercase tracking-[0.14em] text-[#94a3b8]">Cuenta</span>
          </div>
          <p className="font-inter text-sm text-[#334155]">{user.email}</p>
          <p className="mt-0.5 font-inter text-xs text-[#94a3b8]">WRO 2026 · Itinera Suite</p>
        </div>
      </section>

      <DashboardDockDemo isGuest={false} />
    </main>
  );
}
