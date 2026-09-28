"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";

function normalizeReferral(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [referral,setReferral]=useState("");
  const [show,setShow]=useState(false); const [error,setError]=useState(""); const [loading,setLoading]=useState(false); const [googleLoading,setGoogleLoading]=useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get("ref") || searchParams.get("referral") || searchParams.get("referral_code") || "";
    const fromCookie = document.cookie.match(/(?:^|; )creatorhub_referral=([^;]*)/)?.[1] || "";
    const code = normalizeReferral(fromUrl || decodeURIComponent(fromCookie));
    if (code) {
      setReferral(code);
      document.cookie = `creatorhub_referral=${encodeURIComponent(code)}; Max-Age=2592000; Path=/; SameSite=Lax`;
    }
    if (searchParams.get("error") === "oauth") setError("Google sign-in could not be completed. Please try again.");
  }, [searchParams]);

  const applyReferral = async (code: string) => {
    if (!code) return;
    const response = await fetch("/api/referrals/apply", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({code}) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "The referral code could not be applied.");
    }
    document.cookie = "creatorhub_referral=; Max-Age=0; Path=/; SameSite=Lax";
  };

  const submit=async(e:FormEvent)=>{
    e.preventDefault();setLoading(true);setError("");
    const code=normalizeReferral(referral);
    if(code) document.cookie=`creatorhub_referral=${encodeURIComponent(code)}; Max-Age=2592000; Path=/; SameSite=Lax`;
    const {error}=await supabase().auth.signInWithPassword({email:email.trim(),password});
    if(error){setError(error.message);setLoading(false);return;}
    if(code){try{await applyReferral(code)}catch(err){setError(err instanceof Error?err.message:"The referral code could not be applied.");setLoading(false);return;}}
    router.push("/dashboard");setLoading(false)
  };
  const google=async()=>{
    setError("");setGoogleLoading(true);
    const code=normalizeReferral(referral);
    if(code) document.cookie=`creatorhub_referral=${encodeURIComponent(code)}; Max-Age=2592000; Path=/; SameSite=Lax`;
    const {error}=await supabase().auth.signInWithOAuth({provider:"google",options:{redirectTo:`${window.location.origin}/auth/callback?next=/dashboard`}});
    if(error){setError(error.message);setGoogleLoading(false)}
  };
  return <main className="min-h-screen bg-[#f5f7fa] text-slate-950"><div className="grid min-h-screen lg:grid-cols-[.95fr_1.05fr]">
    <section className="relative hidden overflow-hidden bg-slate-950 lg:block"><div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(245,158,11,.2),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(59,130,246,.1),transparent_35%)]"/><div className="relative flex h-full flex-col justify-between p-12 xl:p-16"><Link href="/" className="flex items-center gap-3"><img src="/creatorhub-mark.svg" alt="CreatorHub" className="h-11 w-11"/><span className="text-xl font-bold text-white">CreatorHub</span></Link><div className="max-w-lg"><p className="text-sm font-semibold uppercase tracking-[.2em] text-amber-400">Your workspace</p><h2 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-[-.04em] text-white">Everything you need to manage your creator journey.</h2><p className="mt-6 text-base leading-7 text-slate-400">Access campaigns, earnings, referrals, creator tools and account management from one secure workspace.</p></div><p className="text-xs text-slate-500">CreatorHub · Secure account access</p></div></section>
    <section className="flex items-center justify-center px-5 py-10 sm:px-8"><div className="w-full max-w-xl"><div className="mb-8 lg:hidden"><Link href="/" className="flex items-center gap-3"><img src="/creatorhub-mark.svg" alt="CreatorHub" className="h-10 w-10"/><span className="font-bold">CreatorHub</span></Link></div><div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9"><p className="text-sm font-semibold text-orange-600">Welcome back</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Sign in to CreatorHub</h1><p className="mt-2 text-sm leading-6 text-slate-500">Continue to your campaigns, earnings and creator workspace.</p>
      <button type="button" onClick={google} disabled={googleLoading} className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">{googleLoading?<Loader2 size={17} className="animate-spin"/>:<span className="font-bold">G</span>}Continue with Google</button>
      <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><div className="h-px flex-1 bg-slate-200"/>OR<div className="h-px flex-1 bg-slate-200"/></div>
      <form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input mt-2" placeholder="you@example.com"/></label><label className="block text-sm font-medium">Password<div className="relative mt-2"><input required type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} className="input pr-11" placeholder="Your password"/><button type="button" aria-label={show?"Hide password":"Show password"} onClick={()=>setShow(!show)} className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-slate-400 hover:text-slate-700">{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
      <label className="block text-sm font-medium">Referral code <span className="font-normal text-slate-400">(optional)</span><div className="relative mt-2"><UsersRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={referral} onChange={e=>setReferral(normalizeReferral(e.target.value))} className="input pl-10 uppercase" placeholder="Enter referral code"/></div><span className="mt-1 block text-xs text-slate-400">{referral ? "Referral code detected or entered." : "If you arrived from a referral link, the code will appear here automatically."}</span></label>
      {error&&<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<button disabled={loading} className="btn btn-primary w-full py-3.5">{loading?<Loader2 size={17} className="animate-spin"/>:<LockKeyhole size={17}/>} {loading?"Signing in...":"Sign in"} {!loading&&<ArrowRight size={16}/>}</button></form>
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck size={15}/> Protected account authentication</div><p className="mt-5 text-center text-sm text-slate-500">New to CreatorHub? <Link href="/auth/sign-up" className="font-semibold text-orange-600">Create an account</Link></p></div></div></section>
  </div></main>;
}
