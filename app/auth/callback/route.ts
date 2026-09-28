import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const cookieStore = cookies();

  if (code) {
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
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && user) {
      const referral = normalizeCode(cookieStore.get("creatorhub_referral")?.value || "");
      if (referral) {
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data: profile } = await admin.from("profiles").select("id,referred_by").eq("id", user.id).maybeSingle();
        if (profile && !profile.referred_by) {
          const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", referral).maybeSingle();
          if (referrer && referrer.id !== user.id) {
            const { error: updateError } = await admin.from("profiles").update({ referred_by: referrer.id }).eq("id", user.id).is("referred_by", null);
            if (!updateError) {
              await admin.from("referrals").insert({ referrer_id: referrer.id, referred_user_id: user.id, commission: 0, status: "PENDING" });
            }
          }
        }
        cookieStore.set("creatorhub_referral", "", { maxAge: 0, path: "/" });
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/auth/sign-in?error=oauth", url.origin));
}
