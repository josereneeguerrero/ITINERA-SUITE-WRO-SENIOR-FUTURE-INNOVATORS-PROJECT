import Link from "next/link";

const FOOTER_COLS = [
  {
    title: "Explorar",
    links: [
      { href: "/explore?guest=true", label: "Mapa de Honduras" },
      { href: "/explore?category=heritage&guest=true", label: "Patrimonio Cultural" },
      { href: "/explore?category=nature&guest=true", label: "Naturaleza" },
      { href: "/explore?category=beach&guest=true", label: "Playas" },
    ],
  },
  {
    title: "Contenido",
    links: [
      { href: "/stories", label: "Historias Culturales" },
      { href: "/routes", label: "Rutas" },
      { href: "/stories/legado-maya-copan", label: "El Legado Maya" },
      { href: "/stories/reloj-arabe-comayagua", label: "El Reloj Árabe" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { href: "/login",    label: "Iniciar sesión" },
      { href: "/register", label: "Registrarse" },
      { href: "/profile",  label: "Mi perfil" },
      { href: "/profile",  label: "Mis favoritos" },
    ],
  },
  {
    title: "Proyecto",
    links: [
      { href: "/", label: "WRO 2026" },
      { href: "/", label: "INNOVAKERS" },
      { href: "/", label: "UNICAH Honduras" },
      { href: "/", label: "Acerca de Itinera" },
    ],
  },
];

export function Footer() {
  return (
    <footer style={{ backgroundColor: "#0F172A" }}>
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">

          {/* Brand col */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="font-jakarta font-bold text-xl" style={{ color: "#0D9488" }}>
              Itinera
            </Link>
            <p className="font-inter text-xs mt-2 leading-relaxed" style={{ color: "#475569" }}>
              Tu guía cultural inteligente para Honduras. Potenciado por IA.
            </p>
            <div className="flex gap-2 mt-4">
              {["🇭🇳"].map((emoji) => (
                <span key={emoji} className="text-lg">{emoji}</span>
              ))}
            </div>
          </div>

          {/* Link cols */}
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#64748B" }}>
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="font-inter text-xs transition-colors hover:text-white"
                      style={{ color: "#475569" }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="font-inter text-xs" style={{ color: "#334155" }}>
          © 2026 Itinera · WRO Future Innovators Senior · INNOVAKERS · UNICAH
        </p>
        <p className="font-inter text-xs" style={{ color: "#334155" }}>
          Hecho con ❤️ en Honduras
        </p>
      </div>
    </footer>
  );
}
