/**
 * Edge Function: ingest-terminal-events
 * Receives interaction events from the Jetson terminal and stores them.
 * Supports both single event and batch (array) payloads.
 *
 * Request:
 *   POST /functions/v1/ingest-terminal-events
 *   Headers:
 *     Authorization: Bearer <device_token_plaintext>
 *     x-device-id: <device_uuid>
 *     Content-Type: application/json
 *   Body (single):
 *     {
 *       event_id: string,        // client-side UUID for idempotency
 *       occurred_at?: string,    // ISO timestamp (defaults to now)
 *       intent: string,          // NLU intent e.g. "search_food"
 *       entities: object,        // extracted entities { type: "tipica", budget: "barato" }
 *       place_ids_shown: string[], // UUIDs of places shown to user
 *       selected_place_id?: string,
 *       lat?: number,
 *       lng?: number,
 *       duration_ms?: number,
 *       session_id?: string,
 *       payload?: object         // extra data
 *     }
 *   Body (batch):
 *     [ ...events ]
 *
 * Response 200:
 *   { ingested: number, skipped: number }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-device-id, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EventPayload {
  event_id: string;
  occurred_at?: string;
  intent?: string;
  entities?: Record<string, unknown>;
  place_ids_shown?: string[];
  selected_place_id?: string;
  lat?: number;
  lng?: number;
  duration_ms?: number;
  session_id?: string;
  payload?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Auth
  const deviceId = req.headers.get("x-device-id");
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!deviceId || !token) {
    return new Response(JSON.stringify({ error: "x-device-id and Bearer token required" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Verify device
  const { data: valid } = await supabase.rpc("verify_device_token", {
    p_device_id: deviceId,
    p_token_plaintext: token,
  });

  if (!valid) {
    return new Response(JSON.stringify({ error: "invalid device credentials" }), {
      status: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Parse body (single or batch)
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const events: EventPayload[] = Array.isArray(raw) ? raw : [raw as EventPayload];

  if (events.length === 0) {
    return new Response(JSON.stringify({ ingested: 0, skipped: 0 }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Ingest each event (idempotent via ON CONFLICT DO NOTHING)
  let ingested = 0;
  let skipped = 0;

  for (const event of events) {
    if (!event.event_id) {
      skipped++;
      continue;
    }

    const { error } = await supabase.rpc("ingest_interaction_event", {
      p_event_id:           event.event_id,
      p_device_id:          deviceId,
      p_device_token:       token,
      p_occurred_at:        event.occurred_at ?? null,
      p_intent:             event.intent ?? null,
      p_entities:           event.entities ?? {},
      p_place_ids_shown:    event.place_ids_shown ?? [],
      p_selected_place_id:  event.selected_place_id ?? null,
      p_lat:                event.lat ?? null,
      p_lng:                event.lng ?? null,
      p_duration_ms:        event.duration_ms ?? null,
      p_optional_user_id:   null,
      p_session_id:         event.session_id ?? null,
      p_payload:            event.payload ?? {},
    });

    if (error) {
      console.error(`event ${event.event_id} error:`, error.message);
      skipped++;
    } else {
      ingested++;
    }
  }

  // Update device last_sync_at
  await supabase
    .from("devices")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", deviceId);

  return new Response(JSON.stringify({ ingested, skipped }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
