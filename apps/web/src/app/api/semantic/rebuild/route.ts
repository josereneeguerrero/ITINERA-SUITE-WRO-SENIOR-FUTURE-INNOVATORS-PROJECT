import { NextResponse } from "next/server";

type RebuildPayload = {
  mode?: "changed" | "backfill";
  limit?: number;
};

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const semanticSecret = process.env.SEMANTIC_REBUILD_SECRET;

  if (!supabaseUrl || !anonKey || !semanticSecret) {
    return NextResponse.json(
      { error: "missing server env for semantic rebuild" },
      { status: 500 }
    );
  }

  let payload: RebuildPayload = {};
  try {
    payload = (await req.json()) as RebuildPayload;
  } catch {
    payload = {};
  }

  const mode = payload.mode === "backfill" ? "backfill" : "changed";
  const limit = Math.max(1, Math.min(Number(payload.limit ?? 5), 20));

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/semantic-embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
        "Content-Type": "application/json",
        "x-semantic-secret": semanticSecret,
      },
      body: JSON.stringify({ mode, limit }),
      cache: "no-store",
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: "semantic rebuild request failed",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
