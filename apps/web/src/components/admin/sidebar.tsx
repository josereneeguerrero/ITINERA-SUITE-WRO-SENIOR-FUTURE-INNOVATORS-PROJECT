"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  MapPin,
  BookOpen,
  Star,
  Megaphone,
  Monitor,
  LogOut,
  BarChart3,
  Shield,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard",  label: "Dashboard",   icon: LayoutDashboard },
  { href: "/places",     label: "Lugares",      icon: MapPin },
  { href: "/stories",    label: "Historias",    icon: BookOpen },
  { href: "/reviews",    label: "Reseñas",      icon: Star },
  { href: "/analytics",  label: "Analytics",    icon: BarChart3 },
  { href: "/sponsors",   label: "Sponsors",     icon: Megaphone },
  { href: "/devices",    label: "Terminales",   icon: Monitor },
];

interface SidebarProps {
  pendingReviews?: number;
  userEmail?: string;
  userRole?: string;
}

export function Sidebar({ pendingReviews = 0, userEmail, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className="w-[220px] min-h-screen flex flex-col shrink-0"
      style={{ backgroundColor: "#0D1117", borderRight: "1px solid #1F2937" }}
    >
      {/* ── Logo ── */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid #1F2937" }}>
        <div>
          <p className="font-jakarta font-semibold text-white text-[15px] leading-none">
            Itinera
          </p>
          <p className="font-inter text-[11px] mt-0.5" style={{ color: "#6B7280" }}>
            Admin Panel
          </p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active      = isActive(href);
          const badgeCount  = label === "Reseñas" ? pendingReviews : 0;

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-inter font-medium transition-colors ${
                active ? "" : "nav-link-hover"
              }`}
              style={
                active
                  ? {
                      borderLeft: "3px solid #0D9488",
                      backgroundColor: "rgba(13,148,136,0.1)",
                      color: "#0D9488",
                      marginLeft: "-3px",
                    }
                  : {
                      marginLeft: "-3px",
                      paddingLeft: "12px",
                    }
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badgeCount > 0 && (
                <span
                  className="font-inter font-semibold text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={{
                    backgroundColor: "rgba(245,158,11,0.15)",
                    color: "#F59E0B",
                    border: "1px solid rgba(245,158,11,0.3)",
                  }}
                >
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User + Logout ── */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-jakarta font-semibold text-xs text-white"
            style={{ backgroundColor: "#0D9488" }}
          >
            {userEmail ? userEmail[0].toUpperCase() : "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] truncate" style={{ color: "#6B7280" }}>
              {userEmail ?? "admin"}
            </p>
            {userRole && (
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-2.5 h-2.5" style={{ color: "#0D9488" }} />
                <span className="font-inter text-[10px] capitalize" style={{ color: "#0D9488" }}>
                  {userRole}
                </span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn-logout-hover flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full font-inter transition-colors"
          style={{ color: "#6B7280" }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
