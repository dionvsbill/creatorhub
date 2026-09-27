import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ error: "Server is not configured." }, { status: 503 });

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: authData } = await admin.auth.getUser(auth);
    if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: actor } = await admin.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (actor?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: complaint, error } = await admin
      .from("payment_complaints")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    if (complaint.status !== "VERIFIED" && complaint.status !== "RESOLVED") {
      return NextResponse.json({ error: "Verify the Paystack payment before activating Creator Program membership." }, { status: 409 });
    }

    const { data: transaction } = await admin
      .from("transactions")
      .select("*")
      .eq("id", complaint.transaction_id)
      .maybeSingle();

    if (!transaction || transaction.metadata?.purpose !== "creator_program") {
      return NextResponse.json({
        error: "This verified payment is not linked to a Creator Program transaction.",
      }, { status: 409 });
    }

    const { data: membership, error: membershipError } = await admin
      .from("creator_memberships")
      .upsert({
        user_id: complaint.user_id,
        status: "ACTIVE",
        fee: Number(transaction.amount),
        currency: transaction.currency || "GHS",
        payment_reference: complaint.reference,
        paid_at: complaint.paystack_paid_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("*")
      .single();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    await admin.from("notifications").insert({
      user_id: complaint.user_id,
      title: "Creator Program activated",
      body: "Your verified payment has been confirmed and your Creator Program membership is now active.",
      type: "SYSTEM",
    });

    await admin.from("audit_logs").insert({
      actor_id: authData.user.id,
      action: "CREATOR_PROGRAM_ACTIVATED_FROM_VERIFIED_PAYMENT",
      entity_type: "creator_membership",
      entity_id: membership.id,
      metadata: {
        user_id: complaint.user_id,
        complaint_id: complaint.id,
        transaction_id: transaction.id,
        reference: complaint.reference,
      },
    });

    return NextResponse.json({ success: true, membership });
  } catch (error) {
    console.error("creator program activation failed", error);
    return NextResponse.json({ error: "Creator Program activation failed." }, { status: 500 });
  }
}
