import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server is not configured." }, { status: 503 });

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData } = await admin.auth.getUser(auth);
  if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await admin.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { note } = await req.json().catch(() => ({ note: "" }));
  const { data: complaint, error } = await admin.from("payment_complaints").select("*").eq("id", params.id).single();
  if (error || !complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
  if (complaint.status !== "VERIFIED") return NextResponse.json({ error: "Verify the payment before resolving the complaint." }, { status: 409 });

  await admin.from("payment_complaints").update({
    status: "RESOLVED",
    resolution: note || "Payment verified and issue resolved.",
    admin_note: note || complaint.admin_note,
    verified_at: complaint.verified_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", complaint.id);

  await admin.from("notifications").insert({
    user_id: complaint.user_id,
    title: "Payment complaint resolved",
    body: note || "Your payment was verified and the reported payment issue has been resolved.",
    type: "PAYMENT",
  });

  await admin.from("audit_logs").insert({
    actor_id: authData.user.id,
    action: "PAYMENT_COMPLAINT_RESOLVED",
    entity_type: "payment_complaint",
    entity_id: complaint.id,
    metadata: { reference: complaint.reference, note: note || null },
  });

  return NextResponse.json({ success: true });
}
