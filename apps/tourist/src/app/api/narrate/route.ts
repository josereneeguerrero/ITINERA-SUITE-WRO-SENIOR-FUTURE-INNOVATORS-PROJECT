export const dynamic = "force-dynamic";

const VOICE_ID = "ErXwobaYiN019PkySvjV"; // Antoni — premade, free tier, tono más cálido en español
const MODEL_ID = "eleven_multilingual_v2";

// Strip markdown formatting from story body
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")        // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")  // bold
    .replace(/\*(.+?)\*/g, "$1")      // italic
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // code
    .replace(/^[-*+]\s+/gm, "")       // list items
    .replace(/\n{3,}/g, "\n\n")       // excess newlines
    .trim();
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json() as { text: string };

    if (!text?.trim()) {
      return new Response("Texto requerido", { status: 400 });
    }

    const clean = stripMarkdown(text).slice(0, 2500); // ~2 min audio max

    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key":   process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
          "Accept":       "audio/mpeg",
        },
        body: JSON.stringify({
          text:           clean,
          model_id:       MODEL_ID,
          voice_settings: {
            stability:        0.5,
            similarity_boost: 0.75,
            style:            0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenRes.ok) {
      const err = await elevenRes.text();
      console.error("[Narrate API] ElevenLabs error:", err);
      return new Response("Error generando narración", { status: 502 });
    }

    // Stream audio directly to client
    return new Response(elevenRes.body, {
      headers: {
        "Content-Type":  "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[Narrate API]", err);
    return new Response("Error interno", { status: 500 });
  }
}
