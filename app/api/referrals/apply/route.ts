import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: { code?: string } = {};
  try { body = await request.json(); } catch {}
  const code = normalizeCode(body.code || "");
  if (!code) return NextResponse.json({ error: "Referral code is required." }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,referred_by")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Profile is not ready yet. Please try again." }, { status: 409 });
  if (profile.referred_by) return NextResponse.json({ applied: false, alreadyReferred: true });

  const { data: referrer, error: referrerError } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();
  if (referrerError) return NextResponse.json({ error: referrerError.message }, { status: 500 });
  if (!referrer) return NextResponse.json({ error: "That referral code is not valid." }, { status: 400 });
  if (referrer.id === user.id) return NextResponse.json({ error: "You cannot use your own referral code." }, { status: 400 });

  const { error: updateError } = await admin
    .from("profiles")
    .update({ referred_by: referrer.id })
    .eq("id", user.id)
    .is("referred_by", null);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { error: referralError } = await admin
    .from("referrals")
    .insert({ referrer_id: referrer.id, referred_user_id: user.id, commission: 0, status: "PENDING" });
  if (referralError && referralError.code !== "23505") {
    await admin.from("profiles").update({ referred_by: null }).eq("id", user.id).eq("referred_by", referrer.id);
    return NextResponse.json({ error: referralError.message }, { status: 500 });
  }

  return NextResponse.json({ applied: true });
}
