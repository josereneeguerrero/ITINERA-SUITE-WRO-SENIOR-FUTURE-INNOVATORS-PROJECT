import { createClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PlacesTable } from "./places-table";

export default async function PlacesPage() {
  const supabase = await createClient();

  const { data: places } = await supabase
    .from("places")
    .select(`
      id, slug, name_i18n, status,
      aggregated_rating, review_count,
      featured, local_favorite,
      place_categories(name_i18n),
      regions(name_i18n)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-inter text-xs mb-1.5" style={{ color: "#6B7280" }}>Lugares</p>
          <h1 className="font-jakarta font-bold text-[28px] text-white leading-none">Lugares</h1>
          <p className="font-inter text-sm mt-1" style={{ color: "#6B7280" }}>
            {places?.length ?? 0} lugares registrados
          </p>
        </div>
        <Link
          href="/places/new"
          className="btn-teal-hover flex items-center gap-2 px-4 py-2 rounded-lg font-inter font-medium text-sm text-white shrink-0 mt-1"
        >
          <Plus className="w-4 h-4" />
          Nuevo lugar
        </Link>
      </div>

      {/* Table with client-side search/filter */}
      <PlacesTable places={(places ?? []).map(p => ({
        ...p,
        place_categories: Array.isArray(p.place_categories) ? p.place_categories[0] ?? null : p.place_categories,
        regions: Array.isArray(p.regions) ? p.regions[0] ?? null : p.regions,
      }))} />
    </div>
  );
}
