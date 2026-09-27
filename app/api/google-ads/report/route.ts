import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/secret";

async function getAccess(refresh: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error("Token refresh failed");
  return data.access_token as string;
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: { user } } = await admin.auth.getUser(auth);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { customerId } = await req.json();
    if (!/^\d{10}$/.test(String(customerId))) {
      return NextResponse.json({ error: "Customer ID must be 10 digits" }, { status: 400 });
    }

    const { data: connection } = await admin.from("google_ads_connections")
      .select("refresh_token_encrypted").eq("user_id", user.id).maybeSingle();

    if (!connection) return NextResponse.json({ error: "Google Ads is not connected" }, { status: 404 });

    const access = await getAccess(await decryptSecret(connection.refresh_token_encrypted));
    const query = `SELECT campaign.id,campaign.name,campaign.status,metrics.impressions,metrics.clicks,metrics.cost_micros,metrics.video_trueview_views,metrics.video_trueview_view_rate FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.id`;

    const response = await fetch(`https://googleads.googleapis.com/v25/customers/${customerId}/googleAds:searchStream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || "Google Ads report failed" }, { status: 400 });
    }

    const rows = Array.isArray(data) ? data.flatMap((item: any) => item.results || []) : data.results || [];
    await admin.from("google_ads_connections").update({ customer_id: String(customerId), status: "CONNECTED" }).eq("user_id", user.id);
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google Ads report failed" }, { status: 500 });
  }
}
