import Link from "next/link";

export function LandingCTA() {
  return (
    <section
      className="py-20 px-4 text-center section-contained"
      style={{ background: "linear-gradient(135deg, #0D9488 0%, #064E3B 100%)" }}
    >
      <div className="max-w-2xl mx-auto">
        <h2
          className="font-jakarta font-bold text-white mb-4 leading-tight"
          style={{ fontSize: "clamp(28px, 4vw, 44px)" }}
        >
          ¿Listo para descubrir Honduras?
        </h2>
        <p className="font-inter text-lg mb-8" style={{ color: "rgba(255,255,255,0.75)" }}>
          Gratuito para viajeros. Potenciado por IA.
        </p>
        <Link
          href="/bienvenida?redirect=/explore"
          className="inline-block font-inter font-semibold text-base px-8 py-3.5 rounded-xl bg-white transition-all hover:shadow-lg hover:scale-[1.02]"
          style={{ color: "#0D9488" }}
        >
          Comenzar ahora →
        </Link>
        <p
          className="font-inter text-xs mt-6"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          WRO 2026 · INNOVAKERS · UNICAH · Honduras
        </p>
      </div>
    </section>
  );
}
