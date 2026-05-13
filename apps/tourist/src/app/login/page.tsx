"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const redirect = useMemo(
    () =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("redirect") ??
          "/explore"
        : "/explore",
    []
  );

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("No pudimos iniciar sesion con esas credenciales.");
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <main className="itinera-topo relative min-h-screen overflow-hidden bg-[#0A0F0F] px-4 pb-10 pt-24 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(13,148,136,0.24),transparent_35%),radial-gradient(circle_at_80%_84%,rgba(245,158,11,0.12),transparent_34%)]" />

      <header className="absolute left-0 right-0 top-0 z-20 border-b border-white/10 bg-[#0A0F0F]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="font-jakarta text-xl font-bold text-[#89f5e7] transition-opacity duration-200 hover:opacity-85"
          >
            Itinera
          </Link>
          <Link
            href={`/bienvenida?redirect=${encodeURIComponent(redirect)}`}
            className="inline-flex items-center gap-2 font-inter text-sm font-semibold text-white/72 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
          <article className="itinera-reveal rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl lg:p-10">
            <h1 className="font-jakarta text-[34px] font-extrabold leading-[1.1] text-white sm:text-[42px]">
              Bienvenido de nuevo
            </h1>
            <p className="mt-4 max-w-xl font-inter text-base leading-7 text-white/72">
              Inicia sesion para continuar tus rutas, favoritos y conversaciones con Itinera IA.
            </p>
            <div className="mt-7 rounded-xl border border-white/12 bg-white/[0.03] p-4">
              <p className="font-inter text-sm text-white/70">
                Tu acceso te lleva directo a:
              </p>
              <ul className="mt-3 space-y-2 font-inter text-sm text-white/82">
                <li>Explorar el mapa cultural personalizado</li>
                <li>Guardar y consultar lugares favoritos</li>
                <li>Retomar recomendaciones del asistente IA</li>
              </ul>
            </div>
          </article>

          <aside className="itinera-reveal rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block font-inter text-xs font-bold uppercase tracking-[0.16em] text-white/68">
                  Correo electronico
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="tu@email.com"
                    className="h-11 w-full rounded-xl border border-white/16 bg-white/[0.04] pl-10 pr-3 font-inter text-sm text-white placeholder:text-white/45 outline-none transition-colors focus:border-[#89f5e7]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-inter text-xs font-bold uppercase tracking-[0.16em] text-white/68">
                  Contrasena
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 w-full rounded-xl border border-white/16 bg-white/[0.04] pl-10 pr-11 font-inter text-sm text-white outline-none transition-colors focus:border-[#89f5e7]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 transition-colors hover:text-white"
                    aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <p className="rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 font-inter text-xs text-red-200">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#00685f] px-4 font-inter text-sm font-bold text-white shadow-lg shadow-teal-950/30 transition-colors duration-200 hover:bg-[#008378] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Entrando..." : "Iniciar sesion"}
                {!loading ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
              </button>
            </form>

            <p className="mt-4 text-center font-inter text-xs text-white/62">
              No tienes cuenta?{" "}
              <Link
                href={`/register?redirect=${encodeURIComponent(redirect)}`}
                className="font-bold text-[#89f5e7] hover:underline"
              >
                Crear cuenta gratis
              </Link>
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
