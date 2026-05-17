/**
 * seed-photos.mjs
 * Inserts Unsplash photo records into media_assets for key Honduras places.
 * Run from: apps/tourist/  →  node ../../seed-photos.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = "https://hwsddziticyusncajyes.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3c2Rkeml0aWN5dXNuY2FqeWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUwMDg3NSwiZXhwIjoyMDk0MDc2ODc1fQ.enPQkMzrb_ncb8AvyGCuaKp4ukgNXTHTXMwTZB1xo28";

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// slug → array of Unsplash photo URLs
const PHOTOS = {
  "ruinas-copan": [
    "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1568402102990-bc541580b59f?q=80&w=1200&auto=format&fit=crop",
  ],
  "playa-west-bay-roatan": [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1559494007-9f5847c49d94?q=80&w=1200&auto=format&fit=crop",
  ],
  "catedral-comayagua": [
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473177104440-ffee2f376098?q=80&w=1200&auto=format&fit=crop",
  ],
  "parque-nacional-la-tigra": [
    "https://images.unsplash.com/photo-1561041617-71a2af6f8acb?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1200&auto=format&fit=crop",
  ],
  "parque-nacional-pico-bonito": [
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop",
  ],
  "lago-de-yojoa": [
    "https://images.unsplash.com/photo-1439853949212-36589f9e4083?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1200&auto=format&fit=crop",
  ],
  "jardin-botanico-lancetilla": [
    "https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519944009-f0f32957d72e?q=80&w=1200&auto=format&fit=crop",
  ],
  "isla-de-utila": [
    "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1200&auto=format&fit=crop",
  ],
  "parque-nacional-cusuco": [
    "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop",
  ],
  "ciudad-de-trujillo-historica": [
    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop",
  ],
  "playa-bahia-de-trujillo": [
    "https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?q=80&w=1200&auto=format&fit=crop",
  ],
  "parque-nacional-celaque": [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop",
  ],
  "mirador-el-picacho": [
    "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1200&auto=format&fit=crop",
  ],
  "yuscarán-pueblo-colonial": [
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200&auto=format&fit=crop",
  ],
  "cocina-garifuna-sambo-creek": [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop",
  ],
  "ruta-del-cafe-copan": [
    "https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop",
  ],
  "la-antoniana-gastro-pub": [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop",
  ],
  "iglesia-de-la-merced-comayagua": [
    "https://images.unsplash.com/photo-1473177104440-ffee2f376098?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?q=80&w=1200&auto=format&fit=crop",
  ],
  "playa-west-end-roatan": [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1200&auto=format&fit=crop",
  ],
  "basilica-de-suyapa-tegucigalpa": [
    "https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1200&auto=format&fit=crop",
  ],
  "parque-nacional-cusuco-el-cusuco": [
    "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=1200&auto=format&fit=crop",
  ],
  "rafting-rio-cangrejal": [
    "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=1200&auto=format&fit=crop",
  ],
  "yuscaran-pueblo-colonial": [
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200&auto=format&fit=crop",
  ],
  "fortaleza-de-omoa": [
    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1565534887279-10e28ce5a288?q=80&w=1200&auto=format&fit=crop",
  ],
  "gracias-ciudad-colonial": [
    "https://images.unsplash.com/photo-1473177104440-ffee2f376098?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1491557345352-5929e343eb89?q=80&w=1200&auto=format&fit=crop",
  ],
  "cuevas-de-talgua": [
    "https://images.unsplash.com/photo-1504472478235-9bc48ba4d60f?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1520209268518-aec60b8bb5ca?q=80&w=1200&auto=format&fit=crop",
  ],
  "valle-de-angeles": [
    "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200&auto=format&fit=crop",
  ],
  "santa-rosa-de-copan": [
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1541802645635-11f2286a7482?q=80&w=1200&auto=format&fit=crop",
  ],
  "ruta-cafe-copan-degustacion": [
    "https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop",
  ],
  "lago-yojoa-orilla-santa-barbara": [
    "https://images.unsplash.com/photo-1439853949212-36589f9e4083?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1433360405326-e50f909805b3?q=80&w=1200&auto=format&fit=crop",
  ],
  "ciudad-historica-de-trujillo": [
    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop",
  ],
};

async function main() {
  console.log("🖼️  Seeding photos for key Honduras places...\n");

  // Get place IDs for our slugs
  const slugs = Object.keys(PHOTOS);
  const { data: places, error } = await db
    .from("places")
    .select("id, slug")
    .in("slug", slugs);

  if (error) { console.error("DB error:", error.message); process.exit(1); }

  let inserted = 0;
  let skipped  = 0;

  for (const place of (places ?? [])) {
    const urls = PHOTOS[place.slug];
    if (!urls) continue;

    // Check if photos already exist for this place
    const { data: existing } = await db
      .from("media_assets")
      .select("id")
      .eq("entity_type", "place")
      .eq("entity_id", place.id)
      .eq("kind", "photo")
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`⏭  ${place.slug} — ya tiene fotos`);
      skipped++;
      continue;
    }

    const records = urls.map((url, i) => ({
      storage_bucket: "external",
      storage_path:   url,
      alt_i18n:       { es: `Foto de ${place.slug}`, en: `Photo of ${place.slug}` },
      sort_order:     i,
      entity_type:    "place",
      entity_id:      place.id,
      kind:           "photo",
    }));

    const { error: insertErr } = await db.from("media_assets").insert(records);
    if (insertErr) {
      console.error(`❌ ${place.slug}: ${insertErr.message}`);
    } else {
      console.log(`✅ ${place.slug} — ${urls.length} foto(s)`);
      inserted++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Insertados : ${inserted} lugares
⏭  Omitidos  : ${skipped} (ya tenían fotos)
Total slugs  : ${slugs.length}
`);
}

main();
