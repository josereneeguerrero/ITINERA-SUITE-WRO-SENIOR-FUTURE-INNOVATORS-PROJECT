"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, Map, Route, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShow]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  const router = useRouter();
  const redirect = useMemo(
    () => typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirect") ?? "/dashboard"
      : "/dashboard",
    []
  );

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError("Credenciales incorrectas. Verifica tu correo y contraseña."); setLoading(false); return; }
    if (!data.session) { setSuccess("Sesión iniciada. Redirigiendo..."); setLoading(false); return; }
    router.replace(redirect);
    router.refresh();
    setLoading(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f0f5f2]">
      {/* Aurora */}
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: [
        "radial-gradient(ellipse 70% 60% at 10% 15%, rgba(13,148,136,0.15) 0%, transparent 60%)",
        "radial-gradient(ellipse 55% 50% at 90% 80%, rgba(0,104,95,0.11) 0%, transparent 55%)",
      ].join(", ") }} />

      {/* Nav */}
      <header className="relative z-20 flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" className="cursor-pointer font-jakarta text-lg font-bold text-[#0D9488] transition-opacity hover:opacity-80">
          Itinera
        </Link>
        <Link href={`/bienvenida?redirect=${encodeURIComponent(redirect)}`}
          className="inline-flex cursor-pointer items-center gap-1.5 font-inter text-sm font-semibold text-[#334155] transition-colors hover:text-[#0D9488]">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver
        </Link>
      </header>

      {/* Content */}
      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pb-16 pt-8 sm:px-8 lg:flex-row lg:items-center lg:gap-12 lg:pt-10">

        {/* Left */}
        <div className="flex-1">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#0D9488]/25 bg-[#0D9488]/10 px-3.5 py-1.5 font-inter text-xs font-bold uppercase tracking-[0.16em] text-[#00685f]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Bienvenido de nuevo
          </div>
          <h1 className="max-w-md text-balance font-jakarta font-extrabold leading-[1.08] text-[#0f172a]"
            style={{ fontSize: "clamp(28px, 4vw, 46px)" }}>
            Continúa descubriendo Honduras
          </h1>
          <p className="mt-4 max-w-sm font-inter text-[15px] leading-7 text-[#334155]">
            Inicia sesión para retomar tus rutas, favoritos y conversaciones con Itinera IA.
          </p>
          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Map,      label: "Tus destinos guardados" },
              { icon: Route,    label: "Rutas personalizadas" },
              { icon: Sparkles, label: "Asistente IA contextual" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-xl border border-[#d7e2de] bg-white/80 p-4 shadow-sm">
                <Icon className="h-4 w-4 text-[#0D9488]" aria-hidden />
                <p className="mt-2 font-inter text-xs leading-5 text-[#334155]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form card */}
        <div className="w-full rounded-2xl border border-[#d7e2de] bg-white p-6 shadow-[0_8px_40px_rgba(15,23,42,0.08)] sm:p-7 lg:w-[400px] lg:shrink-0">
          <p className="mb-5 font-jakarta text-lg font-bold text-[#0f172a]">Iniciar sesión</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block font-inter text-xs font-bold uppercase tracking-[0.14em] text-[#64748b]">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden />
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="tu@email.com"
                  className="h-11 w-full rounded-xl border border-[#d7e2de] bg-white pl-10 pr-3 font-inter text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition-all focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block font-inter text-xs font-bold uppercase tracking-[0.14em] text-[#64748b]">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden />
                <input id="password" type={showPassword ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="h-11 w-full rounded-xl border border-[#d7e2de] bg-white pl-10 pr-11 font-inter text-sm text-[#0f172a] outline-none transition-all focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10" />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#94a3b8] transition-colors hover:text-[#334155]"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error / Success */}
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-inter text-xs text-red-700">{error}</p>
            )}
            {success && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-inter text-xs text-emerald-700">{success}</p>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0D9488] font-inter text-sm font-bold text-white shadow-md shadow-teal-500/20 transition-all duration-200 hover:bg-[#0f766e] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Entrando..." : "Iniciar sesión"}
              {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          </form>

          <p className="mt-5 text-center font-inter text-xs text-[#94a3b8]">
            ¿No tienes cuenta?{" "}
            <Link href={`/register?redirect=${encodeURIComponent(redirect)}`}
              className="cursor-pointer font-bold text-[#0D9488] hover:underline">
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
