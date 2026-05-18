/**
 * audit-content.mjs — Audits all stories and places for content quality issues
 * Run from: apps/tourist/  →  node ../../audit-content.mjs
 */
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  "https://hwsddziticyusncajyes.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3c2Rkeml0aWN5dXNuY2FqeWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUwMDg3NSwiZXhwIjoyMDk0MDc2ODc1fQ.enPQkMzrb_ncb8AvyGCuaKp4ukgNXTHTXMwTZB1xo28"
);

function hasLiteralNewlines(text) {
  return text?.includes("\\n");
}

function isShort(text, min = 30) {
  return !text || text.replace(/\\n/g, "").trim().length < min;
}

async function auditStories() {
  const { data } = await db
    .from("stories")
    .select("slug, title_i18n, summary_i18n, body_markdown_i18n, status, moderation_status")
    .eq("status", "published")
    .order("slug");

  console.log(`\n📚 HISTORIAS (${data.length} publicadas)\n${"─".repeat(60)}`);

  const issues = [];
  for (const s of data) {
    const title   = s.title_i18n?.es ?? "SIN TÍTULO";
    const summary = s.summary_i18n?.es ?? "";
    const body    = s.body_markdown_i18n?.es ?? "";
    const probs = [];

    if (!summary)                          probs.push("❌ sin summary");
    else if (isShort(summary, 40))         probs.push("⚠️  summary muy corto");
    if (!body)                             probs.push("❌ sin body");
    else if (isShort(body, 100))           probs.push("⚠️  body muy corto");
    if (hasLiteralNewlines(body))          probs.push("🔧 body tiene \\n literales");
    if (hasLiteralNewlines(summary))       probs.push("🔧 summary tiene \\n literales");
    if (s.moderation_status !== "approved") probs.push(`⚠️  moderation: ${s.moderation_status}`);

    if (probs.length) {
      issues.push({ slug: s.slug, title, probs });
      console.log(`\n  ${title} (${s.slug})`);
      probs.forEach(p => console.log(`    ${p}`));
    }
  }

  if (!issues.length) console.log("  ✅ Todo bien");
  return issues;
}

async function auditPlaces() {
  const { data } = await db
    .from("places")
    .select("slug, name_i18n, description_i18n, ai_summary_i18n, lat, lng, phone, website")
    .eq("status", "published")
    .order("slug");

  console.log(`\n\n📍 LUGARES (${data.length} publicados)\n${"─".repeat(60)}`);

  const issues = [];
  for (const p of data) {
    const name    = p.name_i18n?.es ?? "SIN NOMBRE";
    const summary = p.ai_summary_i18n?.es ?? "";
    const desc    = p.description_i18n?.es ?? "";
    const probs = [];

    if (!summary && !desc)               probs.push("❌ sin summary ni descripción");
    else if (isShort(summary || desc, 30)) probs.push("⚠️  descripción muy corta");
    if (hasLiteralNewlines(summary))     probs.push("🔧 summary tiene \\n literales");
    if (hasLiteralNewlines(desc))        probs.push("🔧 desc tiene \\n literales");
    if (!p.lat || !p.lng)               probs.push("❌ sin coordenadas");

    if (probs.length) {
      issues.push({ slug: p.slug, name, probs });
      console.log(`\n  ${name} (${p.slug})`);
      probs.forEach(pr => console.log(`    ${pr}`));
    }
  }

  if (!issues.length) console.log("  ✅ Todo bien");
  return issues;
}

async function main() {
  console.log("🔍 Itinera Content Audit\n");
  const storyIssues = await auditStories();
  const placeIssues = await auditPlaces();

  console.log(`\n\n${"═".repeat(60)}`);
  console.log(`RESUMEN:`);
  console.log(`  Historias con problemas : ${storyIssues.length}`);
  console.log(`  Lugares con problemas   : ${placeIssues.length}`);

  // Count by type
  const allProbs = [...storyIssues, ...placeIssues].flatMap(i => i.probs);
  const literalN = allProbs.filter(p => p.includes("\\n")).length;
  const noDesc   = allProbs.filter(p => p.includes("sin summary") || p.includes("sin descripción")).length;
  const short    = allProbs.filter(p => p.includes("corto")).length;

  if (literalN) console.log(`  🔧 Con \\n literales    : ${literalN} items`);
  if (noDesc)   console.log(`  ❌ Sin descripción     : ${noDesc} items`);
  if (short)    console.log(`  ⚠️  Descripción corta  : ${short} items`);
  console.log();
}

main();
