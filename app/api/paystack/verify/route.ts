import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!supabaseUrl || !serviceRoleKey || !paystackSecret) {
      return NextResponse.json(
        { error: "Payment server configuration is incomplete." },
        { status: 503 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const reference = String(body.reference || "").trim();
    if (!reference) {
      return NextResponse.json({ error: "Reference required" }, { status: 400 });
    }

    // The Paystack callback can arrive after the browser's auth session has
    // changed or been refreshed. The payment reference is the source of truth
    // for locating the pending transaction; the transaction row determines
    // the user who is entitled to the payment.
    const { data: existing, error: transactionError } = await admin
      .from("transactions")
      .select("id,status,user_id,amount,metadata,reference")
      .eq("reference", reference)
      .maybeSingle();

    if (transactionError) {
      return NextResponse.json({ error: transactionError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // If a browser token is supplied, make sure it belongs to the transaction
    // owner. The callback itself does not require a browser token.
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) {
        const { data: authData } = await admin.auth.getUser(token);
        if (authData.user && authData.user.id !== existing.user_id) {
          return NextResponse.json({ error: "Transaction ownership mismatch" }, { status: 403 });
        }
      }
    }

    if (existing.status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        status: "COMPLETED",
        amount: Number(existing.amount),
      });
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
      }
    );

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.status || !result?.data) {
      return NextResponse.json(
        { error: result?.message || "Paystack verification failed" },
        { status: 400 }
      );
    }

    const tx = result.data;

    // Paystack's HTTP response status is not the transaction status.
    // Fulfil only when data.status === "success".
    if (tx.status !== "success") {
      return NextResponse.json({
        success: false,
        status: tx.status || "unknown",
        message: tx.gateway_response || tx.message || "Payment has not completed.",
      });
    }

    if (String(tx.reference) !== reference) {
      return NextResponse.json({ error: "Payment reference mismatch" }, { status: 400 });
    }

    const paid = Number(tx.amount) / 100;
    const expected = Number(existing.amount);

    // Paystack amounts are supplied in the currency's subunit.
    if (!Number.isFinite(paid) || Math.abs(paid - expected) > 0.01) {
      return NextResponse.json(
        { error: "Payment amount mismatch" },
        { status: 400 }
      );
    }

    if (tx.currency && tx.currency !== "GHS") {
      return NextResponse.json({ error: "Payment currency mismatch" }, { status: 400 });
    }

    const verifiedAt = new Date().toISOString();
    const metadata = {
      ...(existing.metadata || {}),
      paystack_id: tx.id,
      channel: tx.channel,
      gateway_response: tx.gateway_response,
      paid_at: tx.paid_at || tx.paidAt || null,
      verified_at: verifiedAt,
    };

    const { error: updateError } = await admin
      .from("transactions")
      .update({
        status: "COMPLETED",
        metadata,
      })
      .eq("id", existing.id)
      .eq("reference", reference);

    if (updateError) {
      return NextResponse.json(
        { error: "Payment was verified but could not be recorded." },
        { status: 500 }
      );
    }

    if (existing.metadata?.purpose === "creator_program") {
      const { error: membershipError } = await admin
        .from("creator_memberships")
        .upsert(
          {
            user_id: existing.user_id,
            status: "ACTIVE",
            fee: expected,
            currency: "GHS",
            payment_reference: reference,
            paid_at: tx.paid_at || tx.paidAt || verifiedAt,
            updated_at: verifiedAt,
          },
          { onConflict: "user_id" }
        );

      if (membershipError) {
        return NextResponse.json(
          {
            success: true,
            status: "COMPLETED",
            amount: paid,
            warning: "Payment recorded, but membership activation needs review.",
          },
          { status: 200 }
        );
      }

      await admin.from("notifications").insert({
        user_id: existing.user_id,
        title: "Creator Program activated",
        body: "Your membership payment was verified. Creator earning and eligible referral/task features are now available.",
      });
    }

    return NextResponse.json({
      success: true,
      status: "COMPLETED",
      amount: paid,
    });
  } catch (error) {
    console.error("Paystack verification error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
