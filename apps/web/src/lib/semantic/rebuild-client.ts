export async function triggerSemanticRebuild(
  payload: { mode?: "changed" | "backfill"; limit?: number } = { mode: "changed", limit: 5 }
) {
  try {
    await fetch("/api/semantic/rebuild", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Silent by design: admin save/publish must not fail if semantic sync fails.
  }
}
