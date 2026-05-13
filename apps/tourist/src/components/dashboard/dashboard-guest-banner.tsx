import Link from "next/link";
import { UserPlus, X } from "lucide-react";

export function DashboardGuestBanner() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 shrink-0"
      style={{ backgroundColor: "rgba(13,148,136,0.06)", borderBottom: "1px solid rgba(13,148,136,0.15)" }}
    >
      <UserPlus className="w-4 h-4 shrink-0" style={{ color: "#0D9488" }} />
      <p className="font-inter text-sm flex-1" style={{ color: "#0F172A" }}>
        Estás explorando como{" "}
        <strong>invitado</strong> — crea una cuenta para guardar favoritos, escribir reseñas y más.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/register"
          className="btn-teal font-inter font-semibold text-xs px-3.5 py-1.5 rounded-lg"
        >
          Registrarse gratis
        </Link>
        <Link
          href="/login"
          className="font-inter font-medium text-xs transition-colors hover:opacity-70"
          style={{ color: "#64748B" }}
        >
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
