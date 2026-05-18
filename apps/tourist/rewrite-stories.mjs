/**
 * rewrite-stories.mjs
 * Rewrites all story bodies with rich 400-600 word cultural narratives using Groq.
 * Run from: apps/tourist/  →  node rewrite-stories.mjs
 *
 * Flags:
 *   --dry-run   Print generated content without saving to DB
 *   --slug=X    Only rewrite a specific story
 */

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  "https://hwsddziticyusncajyes.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3c2Rkeml0aWN5dXNuY2FqeWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUwMDg3NSwiZXhwIjoyMDk0MDc2ODc1fQ.enPQkMzrb_ncb8AvyGCuaKp4ukgNXTHTXMwTZB1xo28"
);

const GROQ_KEY = process.env.GROQ_API_KEY ?? "";

const DRY_RUN    = process.argv.includes("--dry-run");
const SLUG_FILTER = process.argv.find(a => a.startsWith("--slug="))?.split("=")[1];
const DELAY_MS   = 5000; // more conservative to avoid TPM rate limits

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function generateStoryBody(title, summary, regionName, placeNames) {
  const placesCtx = placeNames.length
    ? `Lugares vinculados: ${placeNames.join(", ")}.`
    : "";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.72,
      max_tokens: 1100,
      messages: [
        {
          role: "system",
          content: `Eres un escritor cultural experto en Honduras para la plataforma Itinera.
Escribes narrativas de viaje profundas, evocadoras y basadas en hechos reales verificados.

INSTRUCCIONES ESTRICTAS:
- Escribe en español natural de Honduras (no España)
- Entre 400 y 550 palabras en total
- Estructura: exactamente 3 secciones con título (##) y 2-3 párrafos ricos cada una
- Los párrafos deben tener entre 60 y 120 palabras
- Incluye: contexto histórico real, qué se vive ahí, por qué importa culturalmente
- Menciona naturalmente los lugares vinculados si los hay
- NUNCA inventes datos estadísticos exactos que no puedas verificar
- NO uses listas con guiones
- El texto debe fluir como una narración, no como una ficha informativa
- Tono: guía cultural apasionado, cercano, informativo`,
        },
        {
          role: "user",
          content: `Escribe la narrativa completa para esta historia cultural de Honduras:

TÍTULO: ${title}
RESUMEN: ${summary}
REGIÓN: ${regionName}
${placesCtx}

Genera exactamente 3 secciones (## Título de sección) con 2-3 párrafos cada una.
Los párrafos deben ser ricos y sustanciales, no de una sola oración.`,
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Groq error");
  return data.choices[0]?.message?.content?.trim() ?? "";
}

async function main() {
  console.log(`\n✍️  Itinera Story Rewriter ${DRY_RUN ? "(DRY RUN)" : ""}\n`);

  // Fetch stories with linked places
  let query = db
    .from("stories")
    .select(`
      id, slug, title_i18n, summary_i18n, body_markdown_i18n,
      regions(name_i18n),
      story_places(places(name_i18n))
    `)
    .eq("status", "published");

  if (SLUG_FILTER) query = query.eq("slug", SLUG_FILTER);

  const { data: stories, error } = await query.order("slug");
  if (error) { console.error("DB error:", error.message); process.exit(1); }

  console.log(`Found ${stories.length} stories to process\n${"─".repeat(60)}`);

  let success = 0;
  let failed  = 0;
  let skipped = 0;

  for (let i = 0; i < stories.length; i++) {
    const s = stories[i];
    const title      = s.title_i18n?.es ?? s.slug;
    const summary    = s.summary_i18n?.es ?? "";
    const regionName = s.regions?.name_i18n?.es ?? "Honduras";
    const placeNames = (s.story_places ?? [])
      .map(sp => sp.places?.name_i18n?.es)
      .filter(Boolean);

    // Skip stories that already have substantial content (>400 chars)
    const currentBody = s.body_markdown_i18n?.es ?? "";
    if (!SLUG_FILTER && currentBody.length > 400) {
      console.log(`[${i + 1}/${stories.length}] ${title.slice(0, 50).padEnd(52)} ⏭  ya tiene contenido`);
      skipped++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${stories.length}] ${title.slice(0, 50).padEnd(52)} `);

    try {
      const body = await generateStoryBody(title, summary, regionName, placeNames);

      if (DRY_RUN) {
        console.log(`\n${"─".repeat(60)}\n${body}\n${"─".repeat(60)}\n`);
        success++;
      } else {
        const { error: upErr } = await db
          .from("stories")
          .update({
            body_markdown_i18n: {
              ...(s.body_markdown_i18n ?? {}),
              es: body,
            },
          })
          .eq("id", s.id);

        if (upErr) {
          console.log(`❌ ${upErr.message}`);
          failed++;
        } else {
          const words = body.split(/\s+/).length;
          console.log(`✅ ~${words} palabras`);
          success++;
        }
      }
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }

    // Rate limit delay (skip after last)
    if (i < stories.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n${"═".repeat(60)}
✅ Procesadas : ${success}
❌ Fallidas   : ${failed}
${DRY_RUN ? "DRY RUN — nada guardado" : "DB actualizada"}
`);
}

main();
