"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0D9488 0%, #064E3B 100%)" }}
      >
        {/* Globe wireframe decoration */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <svg
            width="600"
            height="600"
            viewBox="0 0 600 600"
            fill="none"
            className="opacity-[0.07]"
          >
            <circle cx="300" cy="300" r="280" stroke="white" strokeWidth="1" />
            <circle cx="300" cy="300" r="200" stroke="white" strokeWidth="1" />
            <circle cx="300" cy="300" r="120" stroke="white" strokeWidth="1" />
            <line x1="20" y1="300" x2="580" y2="300" stroke="white" strokeWidth="1" />
            <line x1="300" y1="20" x2="300" y2="580" stroke="white" strokeWidth="1" />
            <ellipse cx="300" cy="300" rx="280" ry="100" stroke="white" strokeWidth="1" />
            <ellipse cx="300" cy="300" rx="280" ry="200" stroke="white" strokeWidth="1" />
            <ellipse cx="300" cy="300" rx="100" ry="280" stroke="white" strokeWidth="1" />
          </svg>
        </div>

        {/* Top: wordmark + tagline */}
        <div className="relative z-10">
          <p className="font-jakarta font-bold text-white text-5xl tracking-tight leading-none">
            Itinera
          </p>
          <p className="mt-3 text-white/80 font-inter text-lg leading-snug">
            Descubre Honduras.<br />Gestiona la cultura.
          </p>
        </div>

        {/* Bottom: competition info */}
        <div className="relative z-10">
          <p className="text-white/50 font-inter text-xs tracking-wide">
            WRO 2026 · INNOVAKERS · UNICAH
          </p>
        </div>

        {/* Amber accent line at very bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: "#F59E0B" }}
        />
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 bg-[#0A0F0F]">
        <div className="w-full max-w-[380px]">

          {/* Heading */}
          <h1 className="font-jakarta font-bold text-[28px] text-white leading-tight">
            Bienvenido de nuevo
          </h1>
          <p className="mt-1.5 font-inter text-sm text-[#6B7280]">
            Accede al panel de administración
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block font-inter font-medium text-[11px] uppercase tracking-widest text-[#6B7280]"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@itinera.hn"
                required
                className="w-full h-11 px-3.5 rounded-lg font-inter text-sm text-white placeholder:text-[#374151] bg-[#111827] border border-[#1F2937] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block font-inter font-medium text-[11px] uppercase tracking-widest text-[#6B7280]"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 pr-10 rounded-lg font-inter text-sm text-white bg-[#111827] border border-[#1F2937] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-3.5 py-2.5 rounded-lg bg-red-950/50 border border-red-800/50">
                <p className="font-inter text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full h-11 rounded-lg font-inter font-semibold text-sm text-white transition-all disabled:opacity-60 overflow-hidden"
              style={{ backgroundColor: "#0D9488" }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0a7a6f"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0D9488"; }}
            >
              {/* Amber left accent */}
              <span
                className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ backgroundColor: "#F59E0B" }}
              />
              <span className="pl-1">
                {loading ? "Verificando..." : "Ingresar →"}
              </span>
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 font-inter text-xs text-[#4B5563] text-center">
            ¿Problemas para acceder? Contacta al equipo
          </p>
        </div>
      </div>
    </div>
  );
}
