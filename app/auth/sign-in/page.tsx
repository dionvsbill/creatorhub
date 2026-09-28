"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

export default function SignIn() {
  const router = useRouter();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [show,setShow]=useState(false); const [error,setError]=useState(""); const [loading,setLoading]=useState(false); const [googleLoading,setGoogleLoading]=useState(false); const [needsVerification,setNeedsVerification]=useState(false); const [resending,setResending]=useState(false); const [resent,setResent]=useState(false); const [cooldown,setCooldown]=useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth") setError("Google sign-in could not be completed. Please try again.");
  }, []);

  const submit=async(e:FormEvent)=>{
    e.preventDefault();setLoading(true);setError("");
    const {error}=await supabase().auth.signInWithPassword({email:email.trim(),password});
    if(error){setNeedsVerification(/email not confirmed|not confirmed/i.test(error.message));setError(/email not confirmed|not confirmed/i.test(error.message)?"Please verify your email address before signing in. You can request a new verification email below.":error.message);setLoading(false);return;}
    router.push("/dashboard");setLoading(false);
  };
  const google=async()=>{
    setError("");setGoogleLoading(true);
    const {error}=await supabase().auth.signInWithOAuth({provider:"google",options:{redirectTo:`${window.location.origin}/auth/callback?next=/dashboard`}});
    if(error){setError(error.message);setGoogleLoading(false)}
  };
  return <main className="min-h-screen bg-[#f5f7fa] text-slate-950"><div className="grid min-h-screen lg:grid-cols-[.95fr_1.05fr]">
    <section className="relative hidden overflow-hidden bg-slate-950 lg:block"><div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(245,158,11,.2),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(59,130,246,.1),transparent_35%)]"/><div className="relative flex h-full flex-col justify-between p-12 xl:p-16"><Link href="/" className="flex items-center gap-3"><img src="/creatorhub-mark.svg" alt="CreatorHub" className="h-11 w-11"/><span className="text-xl font-bold text-white">CreatorHub</span></Link><div className="max-w-lg"><p className="text-sm font-semibold uppercase tracking-[.2em] text-amber-400">Your workspace</p><h2 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-[-.04em] text-white">Everything you need to manage your creator journey.</h2><p className="mt-6 text-base leading-7 text-slate-400">Access campaigns, earnings, referrals, creator tools and account management from one secure workspace.</p></div><p className="text-xs text-slate-500">CreatorHub · Secure account access</p></div></section>
    <section className="flex items-center justify-center px-5 py-10 sm:px-8"><div className="w-full max-w-xl"><div className="mb-8 lg:hidden"><Link href="/" className="flex items-center gap-3"><img src="/creatorhub-mark.svg" alt="CreatorHub" className="h-10 w-10"/><span className="font-bold">CreatorHub</span></Link></div><div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9"><p className="text-sm font-semibold text-orange-600">Welcome back</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Sign in to CreatorHub</h1><p className="mt-2 text-sm leading-6 text-slate-500">Continue to your campaigns, earnings and creator workspace.</p>
      <button type="button" onClick={google} disabled={googleLoading} className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">{googleLoading?<Loader2 size={17} className="animate-spin"/>:<span className="font-bold">G</span>}Continue with Google</button>
      <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><div className="h-px flex-1 bg-slate-200"/>OR<div className="h-px flex-1 bg-slate-200"/></div>
      <form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input mt-2" placeholder="you@example.com"/></label><label className="block text-sm font-medium">Password<div className="relative mt-2"><input required type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} className="input pr-11" placeholder="Your password"/><button type="button" aria-label={show?"Hide password":"Show password"} onClick={()=>setShow(!show)} className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-slate-400 hover:text-slate-700">{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
      {error&&<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{needsVerification&&<div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900"><div className="font-semibold">Email verification required</div><p className="mt-1 text-xs leading-5">Check spam or promotions. If the message did not arrive, request another verification email.</p><button type="button" disabled={resending||cooldown>0} onClick={async()=>{setResending(true);setResent(false);const {error:e}=await supabase().auth.resend({type:"signup",email:email.trim(),options:{emailRedirectTo:`${window.location.origin}/auth/callback?next=/dashboard`}});if(e)setError(e.message);else{setResent(true);setCooldown(60)}setResending(false)}} className="mt-3 font-semibold text-orange-700 disabled:opacity-50">{resending?"Sending...":cooldown>0?`Resend available in ${cooldown}s`:"Resend verification email"}</button>{resent&&<div className="mt-2 text-xs font-semibold text-emerald-700">A new verification email was requested.</div>}</div>}<button disabled={loading} className="btn btn-primary w-full py-3.5">{loading?<Loader2 size={17} className="animate-spin"/>:<LockKeyhole size={17}/>} {loading?"Signing in...":"Sign in"} {!loading&&<ArrowRight size={16}/>}</button></form>
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck size={15}/> Protected account authentication</div><p className="mt-5 text-center text-sm text-slate-500">New to CreatorHub? <Link href="/auth/sign-up" className="font-semibold text-orange-600">Create an account</Link></p></div></div></section>
  </div></main>;
}
