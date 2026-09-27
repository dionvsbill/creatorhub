import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createApiKey, hashApiKey, admin } from "@/lib/api-auth";

function getUserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const client = getUserClient();
  if (!client) return null;
  const { data } = await client.auth.getUser(header.slice(7).trim());
  return data.user;
}

export async function GET(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { data, error } = await admin.from("api_keys").select("id,name,key_prefix,scopes,last_used_at,expires_at,revoked_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "Supabase server environment variables are not configured.") {
      return NextResponse.json({ error: "Server Supabase configuration is missing. Set SUPABASE_SERVICE_ROLE_KEY in Render." }, { status: 503 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "My API key").trim().slice(0, 80);
  const allowed = ["profile:read","campaigns:read","campaigns:write"];
  const requested = Array.isArray(body.scopes) ? body.scopes.map(String) : ["profile:read","campaigns:read"];
  const scopes = requested.filter((scope: string) => allowed.includes(scope));
  if (!scopes.length) return NextResponse.json({ error: "At least one valid scope is required" }, { status: 400 });
  const rawKey = createApiKey();
  try {
    const { data, error } = await admin.from("api_keys").insert({ user_id: user.id, name, key_prefix: rawKey.slice(0, 17), key_hash: hashApiKey(rawKey), scopes }).select("id,name,key_prefix,scopes,created_at").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, api_key: rawKey, warning: "Store this key securely. It will not be shown again." }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Supabase server environment variables are not configured.") {
      return NextResponse.json({ error: "Server Supabase configuration is missing. Set SUPABASE_SERVICE_ROLE_KEY in Render." }, { status: 503 });
    }
    throw error;
  }
}

export async function DELETE(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  try {
    const { error } = await admin.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", body.id).eq("user_id", user.id).is("revoked_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Supabase server environment variables are not configured.") {
      return NextResponse.json({ error: "Server Supabase configuration is missing. Set SUPABASE_SERVICE_ROLE_KEY in Render." }, { status: 503 });
    }
    throw error;
  }
}
