import { NextResponse } from "next/server";
import { authenticateApiKey, hasScope, admin } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return NextResponse.json({ error: "Invalid or inactive API key" }, { status: 401 });
  if (!hasScope(auth, "profile:read")) return NextResponse.json({ error: "Missing scope: profile:read" }, { status: 403 });
  const { data, error } = await admin.from("profiles").select("id,display_name,username,avatar_url,country,role,creator_status,coins,cash_balance,pending_cash,referral_code,created_at").eq("id", auth.userId).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
