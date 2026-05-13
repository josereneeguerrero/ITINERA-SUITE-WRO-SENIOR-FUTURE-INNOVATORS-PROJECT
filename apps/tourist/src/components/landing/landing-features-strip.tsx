const FEATURES = [
  { icon: "✨", label: "IA que conoce Honduras",          desc: "Responde con datos reales, no inventados" },
  { icon: "🗺️", label: "Mapa interactivo en tiempo real", desc: "Explora 5 destinos con pins y drawer" },
  { icon: "📖", label: "Historias narradas por IA",       desc: "Cultura hondureña con contexto y emoción" },
];

export function LandingFeaturesStrip() {
  return (
    <section
      className="section-contained"
      style={{ backgroundColor: "#0F172A" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {FEATURES.map(({ icon, label, desc }, i) => (
            <div
              key={label}
              className="flex items-start gap-4 px-6 py-5"
              style={{
                borderRight: i < FEATURES.length - 1
                  ? "1px solid rgba(255,255,255,0.07)"
                  : "none",
              }}
            >
              <span className="text-xl shrink-0 mt-0.5">{icon}</span>
              <div>
                <p className="font-jakarta font-semibold text-sm text-white mb-0.5">{label}</p>
                <p className="font-inter text-xs leading-relaxed" style={{ color: "#475569" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
