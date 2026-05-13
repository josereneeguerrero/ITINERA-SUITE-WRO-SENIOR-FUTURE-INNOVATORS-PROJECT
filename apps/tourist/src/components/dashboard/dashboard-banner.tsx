import Link from "next/link";

// Each place card has its own solid color gradient (not transparent overlays)
const PLACE_CARDS = [
  {
    slug:    "ruinas-copan",
    name:    "Ruinas de Copán",
    rating:  "4.8",
    icon:    "🏛️",
    gradient: "linear-gradient(135deg, #0D9488 0%, #064E3B 100%)",
    offsetY:  "-20px",   // highest card
    zIndex:   1,
  },
  {
    slug:    "playa-west-bay-roatan",
    name:    "Playa West Bay",
    rating:  "4.9",
    icon:    "🏖️",
    gradient: "linear-gradient(135deg, #0369A1 0%, #0C4A6E 100%)",
    offsetY:  "0px",     // middle card
    zIndex:   2,
  },
  {
    slug:    "catedral-comayagua",
    name:    "Catedral Comayagua",
    rating:  "4.6",
    icon:    "⛪",
    gradient: "linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)",
    offsetY:  "20px",    // lowest card
    zIndex:   3,
  },
];

export function DashboardBanner() {
  return (
    <div
      className="rounded-2xl relative"
      style={{
        background: "linear-gradient(135deg, #0D9488 0%, #064E3B 100%)",
        minHeight: "180px",
        overflow: "visible", /* cards can overflow vertically */
      }}
    >
      {/* Decorative pattern */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='white' stroke-width='1'%3E%3Cellipse cx='40' cy='40' rx='35' ry='15'/%3E%3Cellipse cx='40' cy='40' rx='25' ry='10'/%3E%3Cellipse cx='40' cy='40' rx='15' ry='6'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 flex items-center justify-between gap-6 px-6 py-5 h-full">

        {/* Left: text content */}
        <div className="flex-1 min-w-0">
          <p
            className="font-inter font-semibold text-[10px] uppercase tracking-[0.15em] mb-2"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            HONDURAS · GUÍA CULTURAL IA
          </p>
          <h2
            className="font-jakarta font-bold text-white leading-tight mb-1.5"
            style={{ fontSize: "28px" }}
          >
            Descubre Honduras
          </h2>
          <p
            className="font-inter text-sm mb-5"
            style={{ color: "rgba(255,255,255,0.7)", lineHeight: "1.5" }}
          >
            5 destinos · historias culturales · guía IA 24/7
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 font-inter font-semibold text-sm bg-white px-4 py-2 rounded-lg transition-all hover:shadow-md"
            style={{ color: "#0D9488", fontSize: "13px" }}
          >
            Explorar mapa →
          </Link>
        </div>

        {/* Right: floating place cards — real white cards, each with own color */}
        <div
          className="hidden lg:flex items-end gap-2.5 shrink-0 pb-2"
          style={{ height: "140px" }}
        >
          {PLACE_CARDS.map((card) => (
            <Link
              key={card.slug}
              href={`/places/${card.slug}`}
              className="w-[96px] rounded-xl overflow-hidden bg-white transition-all hover:scale-105"
              style={{
                transform: `translateY(${card.offsetY})`,
                zIndex: card.zIndex,
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                flexShrink: 0,
              }}
            >
              {/* Color gradient band with icon */}
              <div
                className="h-[60px] flex items-center justify-center text-2xl"
                style={{ background: card.gradient }}
              >
                {card.icon}
              </div>
              {/* White info area */}
              <div className="px-2 py-2">
                <p
                  className="font-jakarta font-semibold truncate leading-tight"
                  style={{ fontSize: "10px", color: "#0F172A" }}
                >
                  {card.name}
                </p>
                <p
                  className="font-inter mt-0.5"
                  style={{ fontSize: "10px", color: "#64748B" }}
                >
                  ★ {card.rating}
                </p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
