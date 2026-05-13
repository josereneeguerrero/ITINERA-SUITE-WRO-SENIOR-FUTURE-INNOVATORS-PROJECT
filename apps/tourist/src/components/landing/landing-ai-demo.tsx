import Link from "next/link";
import { MapPin, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: "🔍",
    title: "Busca en tiempo real",
    desc: "Conectado a la base de datos de Honduras. Resultados reales, sin inventar.",
  },
  {
    icon: "🏛️",
    title: "Narra la historia",
    desc: "Conoce el contexto cultural de cada lugar con profundidad y emoción.",
  },
  {
    icon: "🗺️",
    title: "Construye tu ruta",
    desc: "Itinerarios personalizados al instante, según tus intereses y tiempo.",
  },
];

export function LandingAIDemo() {
  return (
    <section className="py-20 section-contained" style={{ backgroundColor: "#0F172A" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-14">
          <span
            className="inline-block font-inter font-semibold text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
            style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            INTELIGENCIA CULTURAL
          </span>
          <h2
            className="font-jakarta font-bold text-white leading-tight"
            style={{ fontSize: "clamp(28px, 4.5vw, 52px)" }}
          >
            Pregunta. El agente<br />te responde.
          </h2>
        </div>

        {/* Two columns */}
        <div className="flex flex-col lg:flex-row items-center gap-12">

          {/* Left: chat mockup */}
          <div className="flex-1 min-w-0">
            <div
              className="rounded-2xl overflow-hidden max-w-sm mx-auto"
              style={{
                backgroundColor: "#1E293B",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
              }}
            >
              {/* Mockup header */}
              <div
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)" }}
              >
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="font-inter font-semibold text-sm text-white">Itinera IA</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="font-inter text-[10px] text-white/60">En línea</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="px-4 py-4 space-y-3" style={{ backgroundColor: "#0F172A" }}>
                {/* User */}
                <div className="flex justify-end">
                  <div
                    className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%]"
                    style={{ backgroundColor: "#0D9488" }}
                  >
                    <p className="font-inter text-sm text-white">¿Qué hay en Comayagua?</p>
                  </div>
                </div>

                {/* AI */}
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #0D9488, #064E3B)" }}>
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div
                      className="px-3.5 py-3 rounded-2xl rounded-tl-sm"
                      style={{ backgroundColor: "#1E293B", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <p className="font-inter text-sm text-white/85 leading-relaxed">
                        ¡Comayagua es una joya colonial! El lugar imperdible es la Catedral 🏛️ — guarda el reloj árabe más antiguo del mundo en funcionamiento, del siglo XIII.
                      </p>
                    </div>

                    {/* Embedded PlaceCard */}
                    <Link
                      href="/places/catedral-comayagua"
                      className="flex items-center gap-2.5 p-2.5 rounded-xl transition-opacity hover:opacity-90"
                      style={{ backgroundColor: "#1E293B", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <div
                        className="w-12 h-9 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #7C3AED, #4C1D95)" }}
                      >
                        <span className="text-base">⛪</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-jakarta font-semibold text-xs text-white truncate">Catedral de Comayagua</p>
                        <div className="flex items-center gap-1">
                          <span className="font-inter text-[10px]" style={{ color: "#0D9488" }}>Patrimonio</span>
                          <span className="font-inter text-[10px] text-white/40">· ★4.6</span>
                        </div>
                      </div>
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "#0D9488" }} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div
                className="flex items-center gap-2 px-3 py-3"
                style={{ backgroundColor: "#1E293B", borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div
                  className="flex-1 px-3 py-2 rounded-full font-inter text-xs"
                  style={{ backgroundColor: "#0F172A", color: "#475569" }}
                >
                  Pregunta sobre Honduras...
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#0D9488" }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Right: feature list */}
          <div className="flex-1 space-y-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex gap-4 p-4 rounded-xl"
                style={{ backgroundColor: "#1E293B", borderLeft: "3px solid #0D9488" }}
              >
                <span className="text-2xl shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="font-jakarta font-semibold text-sm text-white mb-1">{f.title}</p>
                  <p className="font-inter text-sm leading-relaxed" style={{ color: "#94A3B8" }}>{f.desc}</p>
                </div>
              </div>
            ))}

            <Link
              href="/explore"
              className="flex items-center gap-2 font-inter font-semibold text-sm mt-6 transition-opacity hover:opacity-80"
              style={{ color: "#0D9488" }}
            >
              <Sparkles className="w-4 h-4" />
              Hablar con el agente →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
