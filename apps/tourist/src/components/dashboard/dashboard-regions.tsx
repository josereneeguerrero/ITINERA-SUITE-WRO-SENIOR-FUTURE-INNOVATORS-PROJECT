import Link from "next/link";
import { MapPin } from "lucide-react";

// Todos los 18 departamentos de Honduras con sus slugs canónicos
const HONDURAS_DEPARTMENTS = [
  { name: "Atlántida",          slug: "atlantida",          hint: "Costa Caribe norte" },
  { name: "Choluteca",          slug: "choluteca",          hint: "Golfo de Fonseca" },
  { name: "Colón",              slug: "colon",              hint: "Selva tropical caribeña" },
  { name: "Comayagua",          slug: "comayagua",          hint: "Primera capital colonial" },
  { name: "Copán",              slug: "copan",              hint: "Legado maya" },
  { name: "Cortés",             slug: "cortes",             hint: "Capital industrial" },
  { name: "El Paraíso",         slug: "el-paraiso",         hint: "Montañas del sur" },
  { name: "Francisco Morazán",  slug: "francisco-morazan",  hint: "Capital del país" },
  { name: "Gracias a Dios",     slug: "gracias-a-dios",     hint: "La Mosquitia · selva virgen" },
  { name: "Intibucá",           slug: "intibuca",           hint: "Cultura lenca" },
  { name: "Islas de la Bahía",  slug: "islas-de-la-bahia",  hint: "Caribe · arrecifes" },
  { name: "La Paz",             slug: "la-paz",             hint: "Valle central" },
  { name: "Lempira",            slug: "lempira",            hint: "Pueblo lenca" },
  { name: "Ocotepeque",         slug: "ocotepeque",         hint: "Trifinio · tres fronteras" },
  { name: "Olancho",            slug: "olancho",            hint: "El departamento más grande" },
  { name: "Santa Bárbara",      slug: "santa-barbara",      hint: "Artesanías e historia" },
  { name: "Valle",              slug: "valle",              hint: "Golfo de Fonseca" },
  { name: "Yoro",               slug: "yoro",               hint: "Lluvia de peces · leyenda" },
] as const;

export function DashboardRegions({ isGuest }: { isGuest: boolean }) {
  const baseExplore = isGuest ? "/explore?guest=true" : "/explore";

  return (
    <section className="mx-auto w-full max-w-6xl px-6 md:px-10">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-jakarta text-2xl font-bold text-[#171d1c] md:text-3xl">
            Regiones de Honduras
          </h2>
          <p className="mt-1 font-inter text-sm text-[#64748b]">
            18 departamentos · Explora cualquier rincón del país
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {HONDURAS_DEPARTMENTS.map(({ name, slug, hint }) => (
          <Link
            key={slug}
            href={`${baseExplore}&region=${slug}`}
            className="group flex cursor-pointer flex-col gap-1.5 rounded-xl border border-[#d7e2de] bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0D9488]/30 hover:shadow-md"
          >
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0D9488] transition-colors" aria-hidden />
              <span className="font-jakarta text-sm font-bold leading-tight text-[#0f172a] group-hover:text-[#0D9488] transition-colors">
                {name}
              </span>
            </div>
            <span className="font-inter text-[11px] leading-4 text-[#64748b]">{hint}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
