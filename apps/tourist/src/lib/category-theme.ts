type CategoryMeta = {
  slug?: string | null;
  iconName?: string | null;
  label?: string | null;
};

export type CategoryKey =
  | "heritage"
  | "nature"
  | "food"
  | "adventure"
  | "religious"
  | "beach"
  | "arts"
  | "default";

export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  heritage: "#7C3AED",
  nature: "#16A34A",
  food: "#EAB308",
  adventure: "#2563EB",
  religious: "#DC2626",
  beach: "#0EA5E9",
  arts: "#0891B2",
  default: "#0D9488",
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getCategoryKey(meta: CategoryMeta): CategoryKey {
  const slug = normalize(meta.slug);
  const icon = normalize(meta.iconName);
  const label = normalize(meta.label);
  const token = `${slug}|${icon}|${label}`;

  if (token.includes("relig")) return "religious";
  if (
    token.includes("heritage") ||
    token.includes("patrimonio") ||
    token.includes("landmark")
  ) {
    return "heritage";
  }
  if (
    token.includes("nature") ||
    token.includes("naturaleza") ||
    token.includes("leaf") ||
    token.includes("trees")
  ) {
    return "nature";
  }
  if (
    token.includes("food") ||
    token.includes("gastronomia") ||
    token.includes("utensils")
  ) {
    return "food";
  }
  if (
    token.includes("adventure") ||
    token.includes("aventura") ||
    token.includes("tent") ||
    token.includes("zap")
  ) {
    return "adventure";
  }
  if (
    token.includes("beach") ||
    token.includes("playa") ||
    token.includes("waves")
  ) {
    return "beach";
  }
  if (
    token.includes("arte") ||
    token.includes("museo") ||
    token.includes("museums") ||
    token.includes("art")
  ) {
    return "arts";
  }

  return "default";
}

export function getCategoryColor(meta: CategoryMeta) {
  return CATEGORY_COLORS[getCategoryKey(meta)];
}
