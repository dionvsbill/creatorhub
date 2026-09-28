"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Check, Eye, EyeOff, Loader2, ShieldCheck, UserPlus, UsersRound } from "lucide-react";

function normalizeReferral(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [referral, setReferral] = useState("");
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("ref") || params.get("referral") || params.get("referral_code") || "";
    const fromCookie = document.cookie.match(/(?:^|; )creatorhub_referral=([^;]*)/)?.[1] || "";
    const code = normalizeReferral(fromUrl || decodeURIComponent(fromCookie));
    if (code) {
      setReferral(code);
      document.cookie = `creatorhub_referral=${encodeURIComponent(code)}; Max-Age=2592000; Path=/; SameSite=Lax`;
    }
  }, []);

  const applyReferral = async (code: string) => {
    if (!code) return;
    const response = await fetch("/api/referrals/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "The referral code could not be applied.");
    }
    document.cookie = "creatorhub_referral=; Max-Age=0; Path=/; SameSite=Lax";
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Your password must contain at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (!agree) return setError("Please accept the Terms and Privacy Policy to continue.");
    setLoading(true);
    const code = normalizeReferral(referral);
    if (code) document.cookie = `creatorhub_referral=${encodeURIComponent(code)}; Max-Age=2592000; Path=/; SameSite=Lax`;
    const { data, error } = await supabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim(), referral_code: code || null },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) setError(error.message);
    else {
      if (data.session && code) {
        try { await applyReferral(code); } catch {}
      }
      setDone(true);
    }
    setLoading(false);
  };

  const google = async () => {
    setError("");
    setGoogleLoading(true);
    const code = normalizeReferral(referral);
    if (code) document.cookie = `creatorhub_referral=${encodeURIComponent(code)}; Max-Age=2592000; Path=/; SameSite=Lax`;
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  if (done) return (
    <main className="min-h-screen bg-slate-950 px-5 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full rounded-[32px] bg-white p-8 text-center shadow-2xl">
          <img src="/creatorhub-mark.svg" alt="CreatorHub" className="mx-auto h-12 w-12" />
          <div className="mx-auto mt-7 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check size={24}/></div>
          <h1 className="mt-5 text-2xl font-bold text-slate-950">Check your email</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">We sent a verification link to <strong className="text-slate-700">{email}</strong>. Verify your address to activate your account.</p>
          <Link href="/auth/sign-in" className="btn btn-primary mt-7 w-full">Continue to sign in <ArrowRight size={16}/></Link>
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,.24),transparent_30%),radial-gradient(circle_at_80%_75%,rgba(59,130,246,.12),transparent_32%)]"/>
          <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
            <Link href="/" className="flex items-center gap-3"><img src="/creatorhub-mark.svg" alt="CreatorHub" className="h-11 w-11"/><span className="text-xl font-bold tracking-tight text-white">CreatorHub</span></Link>
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[.2em] text-amber-400">Creator platform</p>
              <h2 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-[-.04em] text-white xl:text-6xl">Build your audience. Turn attention into opportunity.</h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">One workspace for campaigns, creator opportunities, earnings, referrals and professional growth.</p>
              <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-2">
                {["Campaign opportunities","Verified creator workflows","Transparent earnings","Professional profile"].map(x=><div key={x} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm text-slate-300"><Check size={16} className="text-amber-400"/>{x}</div>)}
              </div>
            </div>
            <p className="text-xs text-slate-500">CreatorHub · Secure account access</p>
          </div>
        </section>
        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-xl">
            <div className="mb-8 lg:hidden"><Link href="/" className="flex items-center gap-3"><img src="/creatorhub-mark.svg" alt="CreatorHub" className="h-10 w-10"/><span className="font-bold">CreatorHub</span></Link></div>
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">
              <div><p className="text-sm font-semibold text-orange-600">Create your account</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Welcome to CreatorHub</h1><p className="mt-2 text-sm leading-6 text-slate-500">Set up your account and start building your creator workspace.</p></div>
              <button type="button" onClick={google} disabled={googleLoading} className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-60">{googleLoading?<Loader2 size={17} className="animate-spin"/>:<span className="grid h-5 w-5 place-items-center rounded-full bg-white text-sm font-bold">G</span>}Continue with Google</button>
              <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><div className="h-px flex-1 bg-slate-200"/>OR<div className="h-px flex-1 bg-slate-200"/></div>
              <form onSubmit={submit} className="space-y-4">
                <label className="block text-sm font-medium">Full name<input required value={name} onChange={e=>setName(e.target.value)} className="input mt-2" placeholder="Your name"/></label>
                <label className="block text-sm font-medium">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input mt-2" placeholder="you@example.com"/></label>
                <Password label="Password" value={password} onChange={setPassword} show={show} setShow={setShow} />
                <Password label="Confirm password" value={confirm} onChange={setConfirm} show={showConfirm} setShow={setShowConfirm} />
                <label className="block text-sm font-medium">Referral code <span className="font-normal text-slate-400">(optional)</span><div className="relative mt-2"><UsersRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={referral} onChange={e=>setReferral(normalizeReferral(e.target.value))} className="input pl-10 uppercase" placeholder="Enter referral code"/></div><span className="mt-1 block text-xs text-slate-400">{referral ? "Referral code detected or entered. It will be attached to this account." : "If you arrived from a referral link, the code will appear here automatically."}</span></label>
                <label className="flex items-start gap-3 pt-1 text-sm text-slate-500"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-orange-600"/><span>I agree to the <Link href="/legal/terms" className="font-semibold text-slate-800">Terms</Link> and <Link href="/legal/privacy" className="font-semibold text-slate-800">Privacy Policy</Link>.</span></label>
                {error&&<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <button disabled={loading} className="btn btn-primary w-full py-3.5">{loading?<Loader2 size={17} className="animate-spin"/>:<UserPlus size={17}/>}Create account {!loading&&<ArrowRight size={16}/>}</button>
              </form>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck size={15}/> Secure authentication with CreatorHub</div>
              <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link href="/auth/sign-in" className="font-semibold text-orange-600">Sign in</Link></p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Password({label,value,onChange,show,setShow}:{label:string;value:string;onChange:(v:string)=>void;show:boolean;setShow:(v:boolean)=>void}) {
  return <label className="block text-sm font-medium">{label}<div className="relative mt-2"><input required minLength={8} type={show?"text":"password"} value={value} onChange={e=>onChange(e.target.value)} className="input pr-11" placeholder="At least 8 characters"/><button type="button" aria-label={show?"Hide password":"Show password"} onClick={()=>setShow(!show)} className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-slate-400 hover:text-slate-700">{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>;
}
