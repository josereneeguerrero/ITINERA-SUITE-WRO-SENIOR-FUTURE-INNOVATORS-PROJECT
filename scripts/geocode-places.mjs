/**
 * geocode-places.mjs
 * Geocodifica automáticamente todos los lugares sin lat/lng usando Nominatim (OSM).
 * Fallback: centroide del departamento si Nominatim no encuentra nada.
 *
 * Uso: node scripts/geocode-places.mjs [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL      = "https://hwsddziticyusncajyes.supabase.co";
const SERVICE_ROLE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3c2Rkeml0aWN5dXNuY2FqeWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUwMDg3NSwiZXhwIjoyMDk0MDc2ODc1fQ.enPQkMzrb_ncb8AvyGCuaKp4ukgNXTHTXMwTZB1xo28";
const DRY_RUN           = process.argv.includes("--dry-run");
const NOMINATIM_DELAY   = 1100; // ms between requests (OSM policy: 1 req/s)

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Region centroids fallback (slug → [lat, lng]) ─────────────────────────────
const REGION_CENTROIDS = {
  "francisco-morazan": [14.0818, -87.2068],
  "copan":             [14.8333, -89.1500],
  "atlantida":         [15.7333, -87.2000],
  "cortes":            [15.5000, -88.0200],
  "comayagua":         [14.4500, -87.6194],
  "colon":             [15.7500, -85.9000],
  "olancho":           [14.8000, -86.0000],
  "islas-de-la-bahia": [16.3333, -86.5500],
  "choluteca":         [13.3000, -87.2000],
  "el-paraiso":        [14.0000, -86.5000],
  "valle":             [13.5000, -87.5000],
  "lempira":           [14.3333, -88.5833],
  "ocotepeque":        [14.4167, -89.1833],
  "intibuca":          [14.3000, -88.1667],
  "santa-barbara":     [14.9167, -88.2333],
  "yoro":              [15.1333, -87.1333],
  "gracias-a-dios":    [15.5000, -84.9000],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function nominatimSearch(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=hn&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Itinera-WRO2026-geocoder/1.0 (josereneeguerrerogutierrez2007@gmail.com)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🗺️  Itinera Geocoder ${DRY_RUN ? "(DRY RUN)" : ""}\n`);

  // 1. Fetch places without coords
  const { data: places, error } = await db
    .from("places")
    .select("id, slug, name_i18n, lat, lng, regions(slug, name_i18n)")
    .eq("status", "published")
    .or("lat.is.null,lng.is.null");

  if (error) { console.error("DB error:", error.message); process.exit(1); }
  if (!places.length) { console.log("✅ Todos los lugares ya tienen coordenadas."); return; }

  console.log(`📍 ${places.length} lugares sin coordenadas\n`);

  let found = 0, fallback = 0, failed = 0;

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    const name       = p.name_i18n?.es ?? p.name_i18n?.en ?? p.slug;
    const regionSlug = p.regions?.slug ?? "";
    const regionName = p.regions?.name_i18n?.es ?? "";

    process.stdout.write(`[${i + 1}/${places.length}] ${name.padEnd(40, ".")} `);

    // Try: "Name, Region, Honduras" then "Name, Honduras"
    let coords = null;
    for (const q of [`${name}, ${regionName}, Honduras`, `${name}, Honduras`]) {
      coords = await nominatimSearch(q);
      await sleep(NOMINATIM_DELAY);
      if (coords) break;
    }

    if (coords) {
      console.log(`✅ ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      found++;
    } else {
      // Fallback to region centroid
      const centroid = REGION_CENTROIDS[regionSlug];
      if (centroid) {
        coords = { lat: centroid[0], lng: centroid[1] };
        console.log(`⚠️  centroid (${regionSlug})`);
        fallback++;
      } else {
        console.log("❌ no encontrado");
        failed++;
        continue;
      }
    }

    if (!DRY_RUN) {
      const { error: upErr } = await db
        .from("places")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", p.id);
      if (upErr) console.error(`   ↳ Update error: ${upErr.message}`);
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Geocodificados exactos : ${found}
⚠️  Fallback (centroide)  : ${fallback}
❌ Sin resultado          : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${DRY_RUN ? "DRY RUN — no se actualizó nada en DB" : "DB actualizada"}
`);
}

main();
