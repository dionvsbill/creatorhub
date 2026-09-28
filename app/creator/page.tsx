"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  Target,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Coins,
  CreditCard,
  FileCheck2,
  LockKeyhole,
  Megaphone,
  Plus,
  Send,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

const FEE = 160;

export default function CreatorWorkspace() {
  const [profile, setProfile] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [range, setRange] = useState<"7D" | "30D" | "90D">("30D");

  const load = async () => {
    const s = supabase();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return;
    const [p, m, ca, active, mine, tx] = await Promise.all([
      s.from("profiles").select("id,display_name,username,avatar_url,creator_status,coins,cash_balance,pending_cash,youtube_url,instagram_url,tiktok_url,bio,professional_title").eq("id", user.id).single(),
      s.from("creator_memberships").select("*").eq("user_id", user.id).maybeSingle(),
      s.from("creator_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      s.from("campaigns").select("id,title,kind,status,budget,spent,ends_at,created_at").eq("status", "ACTIVE").order("created_at", { ascending: false }).limit(6),
      s.from("campaign_applications").select("id,campaign_id,status,proposed_fee,submission_url,submission_note,created_at,updated_at").eq("creator_id", user.id).order("created_at", { ascending: false }).limit(20),
      s.from("transactions").select("id,type,amount,currency,status,reference,description,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    ]);
    setProfile(p.data); setMembership(m.data); setApplication(ca.data); setCampaigns(active.data || []);
    setMyApplications(mine.data || []); setEarnings(tx.data || []); setLoading(false);
  };

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener("creatorhub:db-change", refresh);
    return () => window.removeEventListener("creatorhub:db-change", refresh);
  }, []);

  const join = async () => {
    setPaying(true); setMessage("");
    const { data: { session } } = await supabase().auth.getSession();
    if (!session) { setMessage("Please sign in first."); setPaying(false); return; }
    const response = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: FEE, purpose: "creator_program", description: "Creator Program membership" }),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Could not initialize payment."); setPaying(false); return; }
    window.location.href = data.authorization_url;
  };

  const stats = useMemo(() => {
    const completed = earnings.filter(x => String(x.status).toUpperCase() === "COMPLETED");
    const earned = completed.filter(x => String(x.type).toUpperCase().includes("EARNING")).reduce((n,x) => n + Math.abs(Number(x.amount || 0)), 0);
    const consumed = completed.filter(x => {
      const t = String(x.type).toUpperCase();
      return t.includes("WITHDRAW") || t.includes("PAYOUT") || t.includes("SPEND") || t.includes("DEBIT");
    }).reduce((n,x) => n + Math.abs(Number(x.amount || 0)), 0);
    const applications = myApplications.length;
    const approved = myApplications.filter(x => ["APPROVED","COMPLETED"].includes(String(x.status).toUpperCase())).length;
    const submitted = myApplications.filter(x => ["SUBMITTED","COMPLETED"].includes(String(x.status).toUpperCase())).length;
    const days = range === "7D" ? 7 : range === "90D" ? 90 : 30;
    const cutoff = Date.now() - days * 86400000;
    const recent = completed.filter(x => new Date(x.created_at).getTime() >= cutoff);
    const recentEarned = recent.filter(x => String(x.type).toUpperCase().includes("EARNING")).reduce((n,x) => n + Math.abs(Number(x.amount || 0)), 0);
    return { earned, consumed, available: Number(profile?.cash_balance || 0), pending: Number(profile?.pending_cash || 0), applications, approved, submitted, recentEarned, success: applications ? Math.round((approved / applications) * 100) : 0 };
  }, [earnings, myApplications, profile, range]);

  const chart = useMemo(() => {
    const days = range === "7D" ? 7 : range === "90D" ? 12 : 10;
    const source = earnings.filter(x => String(x.status).toUpperCase() === "COMPLETED" && String(x.type).toUpperCase().includes("EARNING"));
    return Array.from({length: days}, (_, i) => {
      const end = Date.now() - (days - 1 - i) * (range === "90D" ? 7 : 1) * 86400000;
      const start = end - (range === "90D" ? 7 : 1) * 86400000;
      return source.filter(x => { const d = new Date(x.created_at).getTime(); return d >= start && d <= end; }).reduce((n,x) => n + Math.abs(Number(x.amount || 0)), 0);
    });
  }, [earnings, range]);
  const maxChart = Math.max(...chart, 1);

  if (loading) return <AppShell><div className="mx-auto max-w-7xl animate-pulse"><div className="h-48 rounded-[28px] bg-slate-200" /><div className="mt-6 grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-200" />)}</div></div></AppShell>;

  const active = membership?.status === "ACTIVE";
  const approved = profile?.creator_status === "APPROVED";
  const availableRatio = stats.earned ? Math.min(100, Math.round((stats.available / stats.earned) * 100)) : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl pb-12">
        <section className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,.07)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#0070ba]" />
          <div className="flex flex-col gap-7 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover ring-4 ring-slate-50" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0070ba]/10 text-[#0070ba]"><UserRound size={28}/></div>}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Creator account</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Good to see you, {profile?.display_name || "Creator"}</h1>
                <p className="mt-1 text-sm text-slate-500">{profile?.professional_title || "Your creator performance, earnings and opportunities in one place."}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/campaigns" className="inline-flex items-center gap-2 rounded-full bg-[#0070ba] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#005ea6]"><Megaphone size={16}/> Find campaigns</Link>
              <Link href="/earnings" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><WalletCards size={16}/> Wallet</Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={ArrowUpRight} label="Total gained" value={`GH₵${stats.earned.toLocaleString(undefined,{minimumFractionDigits:2})}`} sub="Completed creator earnings" />
          <Metric icon={CreditCard} label="Amount consumed" value={`GH₵${stats.consumed.toLocaleString(undefined,{minimumFractionDigits:2})}`} sub="Withdrawals and debits" />
          <Metric icon={WalletCards} label="Amount left" value={`GH₵${stats.available.toLocaleString(undefined,{minimumFractionDigits:2})}`} sub={`GH₵${stats.pending.toFixed(2)} pending`} />
          <Metric icon={Target} label="Success rate" value={`${stats.success}%`} sub={`${stats.approved} approved of ${stats.applications} applications`} />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
          <main className="space-y-6">
            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="text-lg font-semibold text-slate-950">Performance overview</h2><p className="mt-1 text-sm text-slate-500">Track how your completed creator earnings are moving over time.</p></div>
                <div className="flex rounded-full bg-slate-100 p-1">
                  {(["7D","30D","90D"] as const).map(x => <button key={x} onClick={() => setRange(x)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${range===x ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>{x}</button>)}
                </div>
              </div>
              <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_190px]">
                <div>
                  <div className="flex h-48 items-end gap-2 border-b border-slate-100">
                    {chart.map((v,i) => <div key={i} className="group flex h-full flex-1 items-end"><div title={`GH₵${v.toFixed(2)}`} className="mx-auto w-full max-w-[34px] rounded-t-lg bg-[#0070ba]/80 transition-all duration-500 group-hover:bg-[#005ea6]" style={{height:`${Math.max(5,(v/maxChart)*100)}%`}} /></div>)}
                  </div>
                  <div className="mt-3 flex justify-between text-[11px] text-slate-400"><span>{range === "90D" ? "12 weeks ago" : `${range === "7D" ? "7" : "30"} days ago`}</span><span>Today</span></div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{range} earnings</div>
                  <div className="mt-2 text-2xl font-bold text-slate-950">GH₵{stats.recentEarned.toFixed(2)}</div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#0070ba] transition-all duration-700" style={{width:`${availableRatio}%`}}/></div>
                  <div className="mt-2 flex justify-between text-xs text-slate-500"><span>Available</span><span>{availableRatio}%</span></div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <Insight icon={BriefcaseBusiness} title="Campaign activity" value={String(stats.applications)} detail={`${stats.submitted} work submissions`} href="/campaigns" />
              <Insight icon={Clock3} title="Pending balance" value={`GH₵${stats.pending.toFixed(2)}`} detail="Awaiting completion or release" href="/earnings" />
              <Insight icon={Coins} title="Coin balance" value={Number(profile?.coins || 0).toLocaleString()} detail="Available platform coins" href="/referrals" />
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6"><div><h2 className="font-semibold text-slate-950">Recent earnings</h2><p className="mt-1 text-xs text-slate-500">Your latest completed financial activity.</p></div><Link href="/earnings" className="text-sm font-semibold text-[#0070ba]">View all</Link></div>
              <div className="divide-y divide-slate-100">
                {earnings.filter(x => String(x.status).toUpperCase()==="COMPLETED").slice(0,6).map(x => <div key={x.id} className="flex items-center justify-between gap-4 p-5 transition hover:bg-slate-50"><div className="flex min-w-0 items-center gap-3"><div className="rounded-full bg-emerald-50 p-2.5 text-emerald-600"><ArrowUpRight size={16}/></div><div className="min-w-0"><div className="truncate text-sm font-semibold">{x.description || String(x.type).replaceAll("_"," ")}</div><div className="mt-1 text-xs text-slate-500">{new Date(x.created_at).toLocaleDateString()} · Completed</div></div></div><div className="font-semibold text-emerald-700">+ GH₵{Math.abs(Number(x.amount||0)).toFixed(2)}</div></div>)}
                {!earnings.length && <div className="p-10 text-center text-sm text-slate-500">Your completed earnings will appear here.</div>}
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6"><div><h2 className="font-semibold text-slate-950">Campaign opportunities</h2><p className="mt-1 text-xs text-slate-500">Active opportunities matched to the creator marketplace.</p></div><Link href="/campaigns" className="text-sm font-semibold text-[#0070ba]">Browse all</Link></div>
              <div className="divide-y divide-slate-100">{campaigns.map(c => <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between gap-4 p-5 transition hover:bg-slate-50"><div><div className="font-semibold">{c.title}</div><div className="mt-1 text-xs text-slate-500">{String(c.kind).replaceAll("_"," ")} · Budget GH₵{Number(c.budget||0).toLocaleString()}</div></div><ArrowRight size={17} className="text-slate-400"/></Link>)}{!campaigns.length&&<div className="p-8 text-sm text-slate-500">No active opportunities are available yet.</div>}</div>
            </section>
          </main>

          <aside className="space-y-6">
            <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold">Creator status</h2><p className="mt-1 text-xs text-slate-500">Membership and approval are tracked separately.</p></div><Status status={active ? "ACTIVE" : profile?.creator_status || "NOT_APPLIED"}/></div>
              <div className="mt-6 space-y-3">
                <Link href="/creator/apply" className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"><span><span className="block text-sm font-semibold">Creator application</span><span className="mt-1 block text-xs text-slate-500">{application ? String(application.status).replaceAll("_"," ") : "Start your application"}</span></span><ArrowRight size={16}/></Link>
                <Link href="/profile" className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"><span><span className="block text-sm font-semibold">Profile quality</span><span className="mt-1 block text-xs text-slate-500">Keep your creator identity complete</span></span><ArrowRight size={16}/></Link>
              </div>
              {!active && <button onClick={join} disabled={paying} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0070ba] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#005ea6] disabled:opacity-60"><CreditCard size={16}/>{paying ? "Opening payment..." : "Activate Creator Program"}</button>}
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2"><Activity size={18} className="text-[#0070ba]"/><h2 className="font-semibold">Quick insights</h2></div>
              <div className="mt-5 space-y-4">
                <Mini label="Available after earnings" value={`GH₵${stats.available.toFixed(2)}`} />
                <Mini label="Pending to be released" value={`GH₵${stats.pending.toFixed(2)}`} />
                <Mini label="Completed applications" value={String(stats.approved)} />
                <Mini label="Current coins" value={Number(profile?.coins||0).toLocaleString()} />
              </div>
              <Link href="/activity" className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-[#0070ba]">Open full activity <ArrowRight size={15}/></Link>
            </section>

            <section className="rounded-[26px] bg-slate-950 p-6 text-white shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[.15em] text-slate-400">Creator toolkit</div>
              <h2 className="mt-2 text-xl font-semibold">Everything in one workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Campaigns, applications, earnings, referrals, notifications and account activity stay connected.</p>
              <div className="mt-5 grid gap-2"><Link href="/referrals" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-medium transition hover:bg-white/15">Referral workspace</Link><Link href="/notifications" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-medium transition hover:bg-white/15">Notifications</Link><Link href="/activity" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-medium transition hover:bg-white/15">Activity history</Link></div>
            </section>
          </aside>
        </div>
        {message && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-2xl">{message}</div>}
      </div>
    </AppShell>
  );
}

function Metric({icon:Icon,label,value,sub}:{icon:any;label:string;value:string;sub:string}) {
  return <div className="group rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"><div className="flex items-center justify-between"><div className="rounded-xl bg-slate-50 p-2.5 text-[#0070ba]"><Icon size={18}/></div><ArrowRight size={15} className="text-slate-300 transition group-hover:translate-x-1"/></div><div className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{value}</div><div className="mt-1 text-sm font-semibold text-slate-700">{label}</div><div className="mt-1 text-xs text-slate-400">{sub}</div></div>;
}
function Insight({icon:Icon,title,value,detail,href}:{icon:any;title:string;value:string;detail:string;href:string}) {
  return <Link href={href} className="group rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"><div className="flex items-center justify-between"><Icon size={18} className="text-[#0070ba]"/><ArrowUpRight size={15} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></div><div className="mt-4 text-xl font-bold">{value}</div><div className="mt-1 text-sm font-semibold">{title}</div><div className="mt-1 text-xs text-slate-500">{detail}</div></Link>;
}
function Mini({label,value}:{label:string;value:string}) { return <div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">{label}</span><span className="text-sm font-semibold text-slate-900">{value}</span></div>; }

function Stat({ icon: Icon, label, value }: any) {
  return <div className="card p-5"><Icon size={18} className="text-orange-600" /><div className="mt-3 text-xl font-bold">{value}</div><div className="text-xs font-semibold text-slate-500">{label}</div></div>;
}

function Action({ href, icon: Icon, title, text }: any) {
  return <Link href={href} className="bg-white p-5 hover:bg-slate-50"><Icon size={19} className="text-orange-600" /><div className="mt-3 font-semibold">{title}</div><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></Link>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>;
}

function Status({ status }: { status: string }) {
  const normalized = String(status || "").toUpperCase();
  const positive = normalized === "APPROVED" || normalized === "ACTIVE" || normalized === "COMPLETED";
  const negative = normalized === "REJECTED" || normalized === "SUSPENDED";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${positive ? "bg-emerald-50 text-emerald-700" : negative ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
    {positive ? <CheckCircle2 size={13} /> : negative ? <XCircle size={13} /> : <Clock3 size={13} />}
    {normalized.replaceAll("_", " ")}
  </span>;
}

function UsersIcon(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
