/**
 * Edge Function: device-register
 * Provisions a new terminal (Jetson) device.
 *
 * Request:
 *   POST /functions/v1/device-register
 *   Headers:
 *     x-device-setup-secret: <DEVICE_SETUP_SECRET env var>
 *     Content-Type: application/json
 *   Body:
 *     { label: string, token: string, host_site_id?: string }
 *
 * Response 200:
 *   { device_id: string }
 *
 * Env vars injected by Supabase:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Custom secret (set via: supabase secrets set DEVICE_SETUP_SECRET=<value>):
 *   DEVICE_SETUP_SECRET
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-device-setup-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  // Validate setup secret
  const secret = req.headers.get("x-device-setup-secret");
  const expectedSecret = Deno.env.get("DEVICE_SETUP_SECRET");

  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Parse body
  let body: { label?: string; token?: string; host_site_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { label, token, host_site_id } = body;

  if (!label || !token) {
    return new Response(
      JSON.stringify({ error: "label and token are required" }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  // Create admin client (service_role bypasses RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.rpc("register_device", {
    p_label: label,
    p_token_plaintext: token,
    p_host_site_id: host_site_id ?? null,
  });

  if (error) {
    console.error("register_device error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ device_id: data[0]?.device_id }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
