"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import {
  ArrowRight,
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

  const load = async () => {
    const s = supabase();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return;

    const [p, m, ca, active, mine, tx] = await Promise.all([
      s.from("profiles")
        .select("id,display_name,username,avatar_url,creator_status,coins,cash_balance,pending_cash,youtube_url,instagram_url,tiktok_url,bio")
        .eq("id", user.id)
        .single(),
      s.from("creator_memberships")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      s.from("creator_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      s.from("campaigns")
        .select("id,title,kind,status,budget,spent,ends_at,created_at")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(6),
      s.from("campaign_applications")
        .select("id,campaign_id,status,proposed_fee,submission_url,submission_note,created_at,updated_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      s.from("transactions")
        .select("id,type,amount,currency,status,reference,description,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    setProfile(p.data);
    setMembership(m.data);
    setApplication(ca.data);
    setCampaigns(active.data || []);
    setMyApplications(mine.data || []);
    setEarnings(tx.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener("creatorhub:db-change", refresh);
    return () => window.removeEventListener("creatorhub:db-change", refresh);
  }, []);

  const join = async () => {
    setPaying(true);
    setMessage("");
    const { data: { session } } = await supabase().auth.getSession();
    if (!session) {
      setMessage("Please sign in first.");
      setPaying(false);
      return;
    }

    const response = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: FEE,
        purpose: "creator_program",
        description: "Creator Program membership",
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Could not initialize payment.");
      setPaying(false);
      return;
    }

    window.location.href = data.authorization_url;
  };

  const stats = useMemo(() => ({
    applications: myApplications.length,
    pending: myApplications.filter((x) => x.status === "PENDING" || x.status === "SUBMITTED").length,
    approved: myApplications.filter((x) => x.status === "APPROVED" || x.status === "COMPLETED").length,
    earnings: earnings
      .filter((x) => x.type === "CREATOR_EARNING" && x.status === "COMPLETED")
      .reduce((sum, x) => sum + Number(x.amount || 0), 0),
  }), [myApplications, earnings]);

  if (loading) {
    return <AppShell><div className="mx-auto max-w-7xl card p-10 text-sm text-slate-500">Loading creator workspace...</div></AppShell>;
  }

  const active = membership?.status === "ACTIVE";
  const approved = profile?.creator_status === "APPROVED";

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[28px] bg-[#0A1931] p-7 text-white shadow-xl lg:p-9">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="flex items-center gap-5">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-2xl object-cover ring-1 ring-white/20" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10">
                  <UserRound size={30} />
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#FDB913]">Creator workspace</p>
                <h1 className="mt-1 text-3xl font-semibold">{profile?.display_name || "Creator"}</h1>
                <p className="mt-1 text-sm text-slate-300">
                  {profile?.professional_title || "Build your creator profile, find campaigns and deliver paid work."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/profile" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
                <UserRound size={16} /> Edit profile
              </Link>
              <Link href="/campaigns" className="inline-flex items-center gap-2 rounded-xl bg-[#FDB913] px-4 py-2.5 text-sm font-bold text-[#0A1931]">
                <Megaphone size={16} /> Find campaigns
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={Coins} label="Coins" value={Number(profile?.coins || 0).toLocaleString()} />
          <Stat icon={WalletCards} label="Available earnings" value={`GH₵${Number(profile?.cash_balance || 0).toFixed(2)}`} />
          <Stat icon={Clock3} label="Pending earnings" value={`GH₵${Number(profile?.pending_cash || 0).toFixed(2)}`} />
          <Stat icon={FileCheck2} label="Applications" value={String(stats.applications)} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
          <main className="space-y-6">
            <section className="card overflow-hidden">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-semibold">Your creator actions</h2>
                  <p className="mt-1 text-xs text-slate-500">Everything you can do from the creator workspace.</p>
                </div>
              </div>
              <div className="grid gap-px bg-slate-200 sm:grid-cols-2">
                <Action href="/campaigns" icon={Megaphone} title="Find campaigns" text="Browse active opportunities and open their full requirements." />
                <Action href="/profile" icon={UserRound} title="Build your profile" text="Add your bio, social channels, professional title and profile photo." />
                <Action href="/creator" icon={Send} title="Creator application" text="Apply for Creator Program participation and track administrator decisions." />
                <Action href="/earnings" icon={WalletCards} title="Earnings & withdrawals" text="Review completed earnings, pending balances and payment activity." />
                <Action href="/referrals" icon={UsersIcon} title="Referral workspace" text="Track eligible referrals and referral activity." />
                <Action href="/activity" icon={Clock3} title="Activity & notifications" text="Follow decisions, submissions and account events in real time." />
              </div>
            </section>

            <section className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h2 className="font-semibold">Active campaign opportunities</h2>
                  <p className="mt-1 text-xs text-slate-500">Campaigns currently available for creators.</p>
                </div>
                <Link href="/campaigns" className="text-sm font-semibold text-orange-600">View all</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {campaigns.map((c) => (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50">
                    <div>
                      <div className="font-semibold">{c.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {String(c.kind).replaceAll("_", " ")} · Budget GH₵{Number(c.budget || 0).toLocaleString()}
                      </div>
                    </div>
                    <ArrowRight size={17} className="text-slate-400" />
                  </Link>
                ))}
                {!campaigns.length && <div className="p-8 text-sm text-slate-500">No active creator campaigns are available yet.</div>}
              </div>
            </section>

            <section className="card overflow-hidden">
              <div className="border-b border-slate-200 p-5">
                <h2 className="font-semibold">Your campaign applications</h2>
                <p className="mt-1 text-xs text-slate-500">Track applications, approvals and work submissions.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {myApplications.map((row) => (
                  <div key={row.id} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">Campaign application</div>
                        <div className="mt-1 text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</div>
                      </div>
                      <Status status={row.status} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Info label="Proposed fee" value={`GH₵${Number(row.proposed_fee || 0).toFixed(2)}`} />
                      <Info label="Submission" value={row.submission_url ? "Submitted" : "Not submitted"} />
                      <Info label="Last update" value={new Date(row.updated_at || row.created_at).toLocaleDateString()} />
                    </div>
                    {(row.status === "APPROVED" || row.status === "SUBMITTED") && (
                      <Link href={`/campaigns/${row.campaign_id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">
                        Open campaign & submit work <ArrowRight size={15} />
                      </Link>
                    )}
                  </div>
                ))}
                {!myApplications.length && (
                  <div className="p-8 text-center">
                    <BriefcaseBusiness className="mx-auto text-slate-400" />
                    <p className="mt-3 text-sm font-semibold">You have not applied to a campaign yet.</p>
                    <Link href="/campaigns" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">Browse campaigns <ArrowRight size={15} /></Link>
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside className="space-y-6">
            <section className="card p-5">
              <div className="flex items-start gap-3">
                <div className={`rounded-xl p-3 ${active ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>
                  {active ? <CheckCircle2 size={21} /> : <LockKeyhole size={21} />}
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold">Creator Program</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {active ? "Membership is active." : "Membership is required for creator earning features."}
                  </p>
                </div>
              </div>
              {!active && (
                <button onClick={join} disabled={paying} className="btn btn-primary mt-5 w-full">
                  <CreditCard size={16} /> {paying ? "Opening payment..." : `Join for GH₵${FEE}`}
                </button>
              )}
              {active && (
                <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                  Membership active. You can participate in eligible creator opportunities.
                </div>
              )}
            </section>

            <section className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Creator approval</h2>
                  <p className="mt-1 text-xs text-slate-500">Separate from membership payment.</p>
                </div>
                <Status status={profile?.creator_status || "NOT_APPLIED"} />
              </div>
              <div className="mt-5">
                {!application && active && !approved ? (
                  <Link href="/creator/apply" className="btn btn-primary w-full">
                    <Plus size={16} /> Start creator application
                  </Link>
                ) : application ? (
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
                    <div className="font-semibold">Latest application</div>
                    <p className="mt-1">{application.review_note || "Your application is awaiting or has completed administrator review."}</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    Activate membership before starting the creator application.
                  </div>
                )}
              </div>
            </section>

            <section className="card p-5">
              <div className="flex items-center gap-2">
                <WalletCards size={18} />
                <h2 className="font-semibold">Recent financial activity</h2>
              </div>
              <div className="mt-4 space-y-3">
                {earnings.slice(0, 5).map((x) => (
                  <div key={x.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{x.description || x.type.replaceAll("_", " ")}</div>
                      <div className="text-xs text-slate-500">{new Date(x.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right text-sm font-semibold">GH₵{Number(x.amount || 0).toFixed(2)}</div>
                  </div>
                ))}
                {!earnings.length && <p className="text-sm text-slate-500">No financial activity yet.</p>}
              </div>
              <Link href="/earnings" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">Open earnings <ArrowRight size={15} /></Link>
            </section>
          </aside>
        </div>

        {message && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl">{message}</div>}
      </div>
    </AppShell>
  );
}

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
