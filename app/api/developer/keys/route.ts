import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createApiKey, hashApiKey, admin } from "@/lib/api-auth";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function getUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const { data } = await supabase.auth.getUser(header.slice(7).trim());
  return data.user;
}

export async function GET(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { data, error } = await admin.from("api_keys").select("id,name,key_prefix,scopes,last_used_at,expires_at,revoked_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
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
  const { data, error } = await admin.from("api_keys").insert({ user_id: user.id, name, key_prefix: rawKey.slice(0, 17), key_hash: hashApiKey(rawKey), scopes }).select("id,name,key_prefix,scopes,created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, api_key: rawKey, warning: "Store this key securely. It will not be shown again." }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { error } = await admin.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", body.id).eq("user_id", user.id).is("revoked_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
