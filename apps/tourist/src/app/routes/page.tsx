import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AIFloatingButton } from "@/components/ai/ai-floating-button";
import { MapPin, Sparkles } from "lucide-react";

export default function RoutesPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: "rgba(13,148,136,0.08)" }}
        >
          <MapPin className="w-8 h-8" style={{ color: "#0D9488" }} />
        </div>
        <h1 className="font-jakarta font-bold text-[32px] text-[#0F172A] mb-3">
          Rutas de Honduras
        </h1>
        <p className="font-inter text-base mb-8" style={{ color: "#64748B" }}>
          Las rutas culturales están siendo preparadas por nuestro equipo.
          Mientras tanto, pídele a Itinera IA que te arme una ruta personalizada.
        </p>
        <div
          className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl"
          style={{ backgroundColor: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.15)" }}
        >
          <Sparkles className="w-5 h-5" style={{ color: "#0D9488" }} />
          <p className="font-inter text-sm" style={{ color: "#0D9488" }}>
            Haz click en el botón <strong>Itinera IA</strong> y escribe:
            <br />
            <em>&ldquo;Arma un plan para un día en Copán&rdquo;</em>
          </p>
        </div>
      </div>
      <Footer />
      <AIFloatingButton context={{ page: "routes" }} />
    </div>
  );
}
