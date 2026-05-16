import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardDockDemo } from "@/components/dashboard/dashboard-dock-demo";
import { Heart, Map, Star, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/bienvenida?redirect=/profile");

  const [
    { data: profile },
    { count: favCount },
    { count: routeCount },
    { count: reviewCount },
    { count: chatCount },
  ] = await Promise.all([
    supabase.from("profiles").select("display_name, preferred_locale, created_at").eq("id", user.id).single(),
    supabase.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("itineraries").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("interaction_events").select("*", { count: "exact", head: true }).eq("optional_user_id", user.id),
  ]);

  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "Explorador";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("es-HN", { month: "long", year: "numeric" })
    : null;

  const SECTIONS = [
    { icon: Heart,        label: "Mis Favoritos",  desc: "Lugares que guardaste para visitar",   count: favCount ?? 0,    href: "/profile/saved",   color: "#EC4899" },
    { icon: Map,          label: "Mis Rutas",       desc: "Itinerarios que has creado con IA",    count: routeCount ?? 0,  href: "/routes",          color: "#0D9488" },
    { icon: Star,         label: "Mis Reseñas",     desc: "Lugares que ya visitaste y evaluaste", count: reviewCount ?? 0, href: null,               color: "#F59E0B" },
    { icon: MessageSquare,label: "Historial IA",    desc: "Conversaciones con tu guía cultural",  count: chatCount ?? 0,   href: null,               color: "#3B82F6" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-28 sm:px-6">

        {/* Profile header */}
        <div className="mb-5 rounded-2xl border border-[#E2E8F0] bg-white p-6 flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-jakarta font-bold text-2xl text-white shrink-0"
            style={{ backgroundColor: "#0D9488" }}
          >
            {name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-jakarta font-bold text-xl text-[#0F172A] truncate">{name}</h1>
            <p className="font-inter text-sm mt-0.5 truncate text-[#64748B]">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className="font-inter font-medium text-xs px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488", border: "1px solid rgba(13,148,136,0.2)" }}
              >
                ✦ Explorador Cultural
              </span>
              {memberSince && (
                <span className="font-inter text-xs text-[#94A3B8]">Desde {memberSince}</span>
              )}
            </div>
          </div>
          <Sparkles className="w-5 h-5 shrink-0 text-[#0D9488]" />
        </div>

        {/* Stats sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {SECTIONS.map(({ icon: Icon, label, desc, count, href, color }) => {
            const card = (
              <div
                className={`rounded-xl p-4 flex items-start gap-4 border transition-all ${href && count > 0 ? "hover:border-[#0D9488]/30 hover:shadow-sm cursor-pointer" : ""}`}
                style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}10` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-jakarta font-semibold text-sm text-[#0F172A]">{label}</p>
                    <span
                      className="font-inter font-semibold text-xs px-2 py-0.5 rounded-full"
                      style={
                        count > 0
                          ? { backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }
                          : { backgroundColor: "#F1F5F9", color: "#94A3B8" }
                      }
                    >
                      {count}
                    </span>
                  </div>
                  <p className="font-inter text-xs mt-0.5 leading-relaxed text-[#94A3B8]">{desc}</p>
                </div>
              </div>
            );

            return href && count > 0 ? (
              <Link key={label} href={href}>{card}</Link>
            ) : (
              <div key={label}>{card}</div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.06), rgba(13,148,136,0.02))", border: "1px solid rgba(13,148,136,0.15)" }}
        >
          <Sparkles className="w-6 h-6 mx-auto mb-2 text-[#0D9488]" />
          <p className="font-jakarta font-semibold text-base text-[#0F172A] mb-1">
            Sigue explorando Honduras
          </p>
          <p className="font-inter text-sm mb-4 text-[#64748B]">
            Visita lugares, deja reseñas y arma tus rutas con IA
          </p>
          <Link
            href="/explore"
            className="inline-block font-inter font-semibold text-sm px-6 py-2.5 rounded-xl text-white"
            style={{ backgroundColor: "#0D9488" }}
          >
            Ir al mapa →
          </Link>
        </div>
      </div>
      <Footer />
      <DashboardDockDemo isGuest={false} />
    </div>
  );
}
