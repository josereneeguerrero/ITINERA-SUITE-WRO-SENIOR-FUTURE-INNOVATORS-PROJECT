/**
 * fix-story-newlines.mjs
 * Replaces literal \n strings with real newlines in story body_markdown_i18n
 */
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  "https://hwsddziticyusncajyes.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3c2Rkeml0aWN5dXNuY2FqeWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUwMDg3NSwiZXhwIjoyMDk0MDc2ODc1fQ.enPQkMzrb_ncb8AvyGCuaKp4ukgNXTHTXMwTZB1xo28"
);

async function main() {
  console.log("🔧 Fixing literal \\n in story bodies...\n");

  const { data: stories } = await db
    .from("stories")
    .select("id, slug, title_i18n, body_markdown_i18n, summary_i18n")
    .eq("status", "published");

  let fixed = 0;
  let skipped = 0;

  for (const story of stories ?? []) {
    const body    = story.body_markdown_i18n?.es ?? "";
    const summary = story.summary_i18n?.es ?? "";
    const title   = story.title_i18n?.es ?? story.slug;

    const needsBodyFix    = body.includes("\\n");
    const needsSummaryFix = summary.includes("\\n");

    if (!needsBodyFix && !needsSummaryFix) {
      skipped++;
      continue;
    }

    const newBody    = needsBodyFix    ? body.replace(/\\n/g, "\n")    : body;
    const newSummary = needsSummaryFix ? summary.replace(/\\n/g, "\n") : summary;

    const update = {};
    if (needsBodyFix)    update.body_markdown_i18n = { ...story.body_markdown_i18n,    es: newBody };
    if (needsSummaryFix) update.summary_i18n       = { ...story.summary_i18n,          es: newSummary };

    const { error } = await db.from("stories").update(update).eq("id", story.id);

    if (error) {
      console.log(`❌ ${title}: ${error.message}`);
    } else {
      console.log(`✅ ${title}`);
      fixed++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Corregidos : ${fixed}
⏭  Sin cambios : ${skipped}
`);
}

main();
