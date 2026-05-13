import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

export type ImageAutoSliderItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  imageUrl: string;
  category?: string;
  rating?: number | null;
  badge?: string;
};

export function ImageAutoSlider({
  items,
  durationSeconds = 26,
}: {
  items: ImageAutoSliderItem[];
  durationSeconds?: number;
}) {
  const safeItems = items.length > 0 ? items : [];
  const looped = [...safeItems, ...safeItems];

  if (!safeItems.length) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-gradient-to-r from-[#f0f5f2] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-24 bg-gradient-to-l from-[#f0f5f2] to-transparent" />

      <div
        className="flex w-max gap-6"
        style={{
          animation: `itinera-auto-scroll ${durationSeconds}s linear infinite`,
        }}
      >
        {looped.map((item, index) => (
          <Link
            key={`${item.id}-${index}`}
            href={item.href}
            className="group block w-[312px] shrink-0 overflow-hidden rounded-xl border border-[#d7e2de] bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10"
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
              {item.category ? (
                <span className="absolute left-3 top-3 rounded-full bg-black/35 px-3 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
                  {item.category}
                </span>
              ) : null}
              {typeof item.rating === "number" && item.rating > 0 ? (
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg bg-black/35 px-2 py-1 font-inter text-xs font-bold text-white backdrop-blur">
                  <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />
                  {item.rating.toFixed(1)}
                </span>
              ) : null}
            </div>

            <div className="flex min-h-[190px] flex-col justify-between p-5">
              <div>
                <h3 className="font-jakarta text-2xl font-bold text-[#171d1c]">{item.title}</h3>
                <p className="mt-2 line-clamp-3 font-inter text-sm leading-6 text-[#3d4947]">{item.description}</p>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-inter text-sm font-bold text-[#00685f]">
                  Explorar <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </span>
                <span className="font-inter text-xs font-semibold text-[#6d7a77]">{item.badge ?? "Nuevo"}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
