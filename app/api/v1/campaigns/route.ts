import { NextResponse } from "next/server";
import { authenticateApiKey, hasScope, admin } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return NextResponse.json({ error: "Invalid or inactive API key" }, { status: 401 });
  if (!hasScope(auth, "campaigns:read")) return NextResponse.json({ error: "Missing scope: campaigns:read" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "true";
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 25), 1), 100);
  let query = admin.from("campaigns").select("id,advertiser_id,title,description,kind,status,youtube_url,landing_url,budget,platform_fee,spent,currency,starts_at,ends_at,created_at,updated_at").order("created_at", { ascending: false }).limit(limit);
  query = mine ? query.eq("advertiser_id", auth.userId) : query.eq("status", "ACTIVE");
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, meta: { count: data?.length || 0 } });
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return NextResponse.json({ error: "Invalid or inactive API key" }, { status: 401 });
  if (!hasScope(auth, "campaigns:write")) return NextResponse.json({ error: "Missing scope: campaigns:write" }, { status: 403 });
  if (!["ADVERTISER", "ADMIN"].includes(auth.role)) return NextResponse.json({ error: "Advertiser access required" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.kind) return NextResponse.json({ error: "title and kind are required" }, { status: 400 });
  const allowedKinds = ["GOOGLE_ADS","CREATOR","UGC","SPONSORED_CONTENT","TRAFFIC","AFFILIATE"];
  if (!allowedKinds.includes(body.kind)) return NextResponse.json({ error: "Invalid campaign kind" }, { status: 400 });
  const { data, error } = await admin.from("campaigns").insert({
    advertiser_id: auth.userId, title: String(body.title).slice(0, 160), description: body.description ? String(body.description) : null,
    kind: body.kind, youtube_url: body.youtube_url || null, landing_url: body.landing_url || null,
    budget: Number(body.budget || 0), currency: body.currency || "GHS", starts_at: body.starts_at || null, ends_at: body.ends_at || null, status: "DRAFT",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
