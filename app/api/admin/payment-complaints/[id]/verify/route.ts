import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!url || !serviceKey || !paystackKey) return NextResponse.json({ error: "Payment verification service is not configured." }, { status: 503 });

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: authData } = await admin.auth.getUser(auth);
    if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await admin.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: complaint, error } = await admin.from("payment_complaints").select("*").eq("id", params.id).single();
    if (error || !complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });

    const reference = String(complaint.reference || "").trim();
    if (!reference) return NextResponse.json({ error: "Payment reference is missing." }, { status: 400 });
    await admin.from("payment_complaints").update({ status: "VERIFYING" }).eq("id", complaint.id);

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackKey}`, "Cache-Control": "no-cache" },
      cache: "no-store",
    });
    const result = await response.json();
    const tx = result?.data;

    if (!response.ok || !result?.status || !tx) {
      await admin.from("payment_complaints").update({
        status: "OPEN",
        paystack_status: "not_found",
        admin_note: result?.message || "Paystack could not verify this reference.",
        verified_at: null,
        verified_by: authData.user.id,
      }).eq("id", complaint.id);
      return NextResponse.json({ success: false, status: "not_found", message: result?.message || "Paystack could not verify this reference." });
    }

    let localTransaction = null;
    if (complaint.transaction_id) {
      const { data } = await admin.from("transactions").select("*").eq("id", complaint.transaction_id).maybeSingle();
      localTransaction = data;
    }
    if (!localTransaction) {
      const { data } = await admin.from("transactions").select("*").eq("reference", reference).maybeSingle();
      localTransaction = data;
    }

    const paidAmount = Number(tx.amount || 0) / 100;
    const amountMatches = localTransaction ? Math.abs(paidAmount - Number(localTransaction.amount)) <= 0.01 : true;
    const currencyMatches = !tx.currency || tx.currency === "GHS";
    const verified = tx.status === "success" && amountMatches && currencyMatches;

    await admin.from("payment_complaints").update({
      transaction_id: localTransaction?.id || complaint.transaction_id || null,
      status: verified ? "VERIFIED" : "OPEN",
      paystack_status: tx.status || null,
      paystack_amount: paidAmount,
      paystack_currency: tx.currency || null,
      paystack_channel: tx.channel || null,
      paystack_gateway_response: tx.gateway_response || null,
      paystack_paid_at: tx.paid_at || null,
      verified_at: new Date().toISOString(),
      verified_by: authData.user.id,
      admin_note: verified
        ? "Paystack confirms a successful payment and the amount/currency match the local record."
        : `Paystack status: ${tx.status || "unknown"}; amount match: ${amountMatches}; currency match: ${currencyMatches}.`,
    }).eq("id", complaint.id);

    if (verified && localTransaction?.status === "PENDING") {
      await admin.from("transactions").update({
        status: "COMPLETED",
        metadata: {
          ...(localTransaction.metadata || {}),
          paystack_id: tx.id,
          channel: tx.channel,
          gateway_response: tx.gateway_response,
          paid_at: tx.paid_at,
          verified_at: new Date().toISOString(),
          resolved_from_complaint: complaint.id,
        },
      }).eq("id", localTransaction.id);

      if (localTransaction.metadata?.purpose === "creator_program") {
        await admin.from("creator_memberships").upsert({
          user_id: complaint.user_id,
          status: "ACTIVE",
          fee: localTransaction.amount,
          currency: "GHS",
          payment_reference: reference,
          paid_at: tx.paid_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    }

    await admin.from("audit_logs").insert({
      actor_id: authData.user.id,
      action: "PAYMENT_COMPLAINT_VERIFIED",
      entity_type: "payment_complaint",
      entity_id: complaint.id,
      metadata: {
        reference,
        paystack_status: tx.status,
        amount: paidAmount,
        amount_matches: amountMatches,
        currency_matches: currencyMatches,
        local_transaction_id: localTransaction?.id || null,
      },
    });

    return NextResponse.json({
      success: verified,
      status: verified ? "VERIFIED" : tx.status,
      reference,
      amount: paidAmount,
      currency: tx.currency,
      channel: tx.channel,
      gateway_response: tx.gateway_response,
      paid_at: tx.paid_at,
      local_transaction_status: localTransaction?.status || null,
      local_transaction_id: localTransaction?.id || null,
    });
  } catch (error) {
    console.error("payment complaint verification failed", error);
    return NextResponse.json({ error: "Payment complaint verification failed." }, { status: 500 });
  }
}
