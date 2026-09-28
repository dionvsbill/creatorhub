import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookies) { cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const protectedPath =
    path.startsWith("/dashboard") || path.startsWith("/campaigns") || path.startsWith("/earnings") ||
    path.startsWith("/referrals") || path.startsWith("/creator") || path.startsWith("/activity") ||
    path.startsWith("/settings") || path.startsWith("/profile") || path.startsWith("/notifications") ||
    path.startsWith("/advertiser") || path.startsWith("/admin") || path.startsWith("/developers") ||
    path.startsWith("/help-center") || path.startsWith("/about") || path.startsWith("/contact") ||
    path.startsWith("/how-it-works") || path.startsWith("/security") || path.startsWith("/report-abuse") ||
    path.startsWith("/appeal") || path.startsWith("/payment-complaint") || path.startsWith("/legal");
  if (protectedPath && !user) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("account_status,username,banned_until,banned_permanently").eq("id", user.id).maybeSingle();
    if (profile?.account_status === "SUSPENDED" || profile?.banned_permanently || (profile?.banned_until && new Date(profile.banned_until).getTime() > Date.now())) {
      if (path.startsWith("/api/")) return NextResponse.json({ error: "This account is restricted from using CreatorHub services." }, { status: 403 });
      return NextResponse.redirect(new URL("/auth/sign-in?error=suspended", request.url));
    }
    const usernameSetupAllowed = path === "/auth/username" || path.startsWith("/auth/callback");
    if (!profile?.username && !usernameSetupAllowed && !path.startsWith("/api")) {
      return NextResponse.redirect(new URL("/auth/username", request.url));
    }
  }
  if ((path === "/auth/sign-in" || path === "/auth/sign-up") && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)" ] };
