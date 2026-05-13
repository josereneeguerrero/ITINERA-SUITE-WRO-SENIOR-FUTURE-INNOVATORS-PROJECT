import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardTopBar } from "@/components/dashboard/dashboard-topbar";
import { Heart, Map, Star, BookOpen, Sparkles, UserCircle } from "lucide-react";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/bienvenida?redirect=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, preferred_locale, level, created_at")
    .eq("id", user.id)
    .single();

  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "Explorador";

  const COMING_SOON = [
    { icon: Heart,    label: "Mis Favoritos",  desc: "Lugares que guardaste para visitar",         count: 0 },
    { icon: Map,      label: "Mis Rutas",      desc: "Itinerarios que has creado con IA",           count: 0 },
    { icon: Star,     label: "Mis Reseñas",    desc: "Lugares que ya visitaste y evaluaste",        count: 0 },
    { icon: BookOpen, label: "Historial IA",   desc: "Conversaciones con tu guía cultural",         count: 0 },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F8FAFC" }}>
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardTopBar categories={[]} />
        <div className="flex-1 overflow-y-auto p-5">

          {/* Profile header */}
          <div
            className="rounded-2xl p-6 mb-5 flex items-center gap-5"
            style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-jakarta font-bold text-2xl text-white shrink-0"
              style={{ backgroundColor: "#0D9488" }}
            >
              {name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-jakarta font-bold text-xl text-[#0F172A]">{name}</h1>
              <p className="font-inter text-sm mt-0.5" style={{ color: "#64748B" }}>{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="font-inter font-medium text-xs px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0D9488", border: "1px solid rgba(13,148,136,0.2)" }}
                >
                  ✦ Explorador Cultural
                </span>
              </div>
            </div>
            <div className="ml-auto">
              <Sparkles className="w-5 h-5" style={{ color: "#0D9488" }} />
            </div>
          </div>

          {/* Coming soon sections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {COMING_SOON.map(({ icon: Icon, label, desc, count }) => (
              <div
                key={label}
                className="rounded-xl p-4 flex items-start gap-4"
                style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(13,148,136,0.06)" }}
                >
                  <Icon className="w-4 h-4" style={{ color: "#0D9488" }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-jakarta font-semibold text-sm text-[#0F172A]">{label}</p>
                    <span
                      className="font-inter font-semibold text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#F1F5F9", color: "#94A3B8" }}
                    >
                      {count}
                    </span>
                  </div>
                  <p className="font-inter text-xs mt-0.5 leading-relaxed" style={{ color: "#94A3B8" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA to explore */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.06), rgba(13,148,136,0.02))", border: "1px solid rgba(13,148,136,0.15)" }}
          >
            <Sparkles className="w-6 h-6 mx-auto mb-2" style={{ color: "#0D9488" }} />
            <p className="font-jakarta font-semibold text-base text-[#0F172A] mb-1">
              Empieza a explorar Honduras
            </p>
            <p className="font-inter text-sm mb-4" style={{ color: "#64748B" }}>
              Visita lugares, deja reseñas y arma tus rutas con IA
            </p>
            <Link
              href="/explore"
              className="btn-teal font-inter font-semibold text-sm px-6 py-2.5 rounded-xl inline-block"
            >
              Ir al mapa →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
