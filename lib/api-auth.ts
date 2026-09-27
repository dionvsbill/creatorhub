import { createHash, randomBytes } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment variables are not configured.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const admin = new Proxy({} as SupabaseClient, {
  get(_target, property: string | symbol) {
    const client = getAdmin();
    const value = (client as any)[property];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type ApiAuth = { keyId: string; userId: string; role: string; scopes: string[] };

export async function authenticateApiKey(request: Request): Promise<ApiAuth | null> {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const raw = header.slice(7).trim();
  if (!raw.startsWith("ch_live_") || raw.length < 24) return null;
  const hash = createHash("sha256").update(raw).digest("hex");
  const { data: key } = await admin
    .from("api_keys")
    .select("id,user_id,scopes,expires_at,revoked_at")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();
  if (!key || (key.expires_at && new Date(key.expires_at) <= new Date())) return null;
  const { data: profile } = await admin
    .from("profiles")
    .select("role,account_status")
    .eq("id", key.user_id)
    .single();
  if (!profile || profile.account_status !== "ACTIVE") return null;
  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);
  return { keyId: key.id, userId: key.user_id, role: profile.role, scopes: key.scopes || [] };
}

export function hasScope(auth: ApiAuth, scope: string) {
  return auth.scopes.includes(scope);
}

export function createApiKey() {
  return "ch_live_" + randomBytes(32).toString("base64url");
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}
