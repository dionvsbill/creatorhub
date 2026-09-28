"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import CampaignMediaPreview, { DestinationLink } from "@/components/CampaignMediaPreview";
import { ArrowLeft, CalendarDays, ExternalLink, ShieldCheck, WalletCards, LockKeyhole, Send, CheckCircle2, ListChecks } from "lucide-react";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [mine, setMine] = useState(false);
  const [membership, setMembership] = useState<any>(null);
  const [creatorStatus, setCreatorStatus] = useState("");
  const [application, setApplication] = useState<any>(null);
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionNote, setSubmissionNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const s = supabase();
    const { data: { user } } = await s.auth.getUser();
    const { data } = await s.from("campaigns").select("*").eq("id", id).single();
    setCampaign(data);
    setMine(!!user && data?.advertiser_id === user.id);

    if (user) {
      const [m, p, a] = await Promise.all([
        s.from("creator_memberships").select("status").eq("user_id", user.id).maybeSingle(),
        s.from("profiles").select("creator_status").eq("id", user.id).maybeSingle(),
        s.from("campaign_applications").select("*").eq("campaign_id", id).eq("creator_id", user.id).maybeSingle(),
      ]);
      setMembership(m.data);
      setCreatorStatus(p.data?.creator_status || "");
      setApplication(a.data);
      setFee(a.data?.proposed_fee ? String(a.data.proposed_fee) : "");
      setNote(a.data?.submission_note || "");
      setSubmissionUrl(a.data?.submission_url || "");
      setSubmissionNote(a.data?.submission_note || "");
    }
  };

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener("creatorhub:db-change", refresh);
    return () => window.removeEventListener("creatorhub:db-change", refresh);
  }, [id]);

  const fund = async () => {
    setBusy(true); setError("");
    const { data: { session } } = await supabase().auth.getSession();
    if (!session) { setError("Sign in first."); setBusy(false); return; }
    const response = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(campaign.budget) + Number(campaign.platform_fee || 0),
        purpose: "campaign_funding",
        description: `Funding: ${campaign.title}`,
      }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Could not initialize payment.");
    else window.location.href = data.authorization_url;
    setBusy(false);
  };

  const apply = async () => {
    setBusy(true); setError(""); setMessage("");
    if (membership?.status !== "ACTIVE") { setError("Join the Creator Program before applying."); setBusy(false); return; }
    if (creatorStatus !== "APPROVED") { setError("Your creator profile must be approved before taking paid campaign tasks."); setBusy(false); return; }
    const { data: { user } } = await supabase().auth.getUser();
    if (!user) { setError("Sign in first."); setBusy(false); return; }

    const { data, error: insertError } = await supabase().from("campaign_applications").insert({
      campaign_id: id,
      creator_id: user.id,
      status: "PENDING",
      proposed_fee: Number(fee) || 0,
      submission_note: note || null,
    }).select("*").single();

    if (insertError) {
      setError(insertError.code === "23505" ? "You have already applied to this campaign." : insertError.message);
    } else {
      setApplication(data);
      setMessage("Application submitted for advertiser review.");
    }
    setBusy(false);
  };

  const submitWork = async () => {
    setBusy(true); setError(""); setMessage("");
    if (!application) { setBusy(false); return; }
    const { error: updateError } = await supabase().from("campaign_applications").update({
      status: "SUBMITTED",
      submission_url: submissionUrl.trim(),
      submission_note: submissionNote.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", application.id);

    if (updateError) setError(updateError.message);
    else {
      setApplication({ ...application, status: "SUBMITTED", submission_url: submissionUrl, submission_note: submissionNote });
      setMessage("Your campaign work has been submitted for review.");
    }
    setBusy(false);
  };

  if (!campaign) return <AppShell><div className="mx-auto max-w-4xl card p-10">Loading campaign...</div></AppShell>;

  const canApply = !mine && campaign.status === "ACTIVE" && !application;
  const canSubmit = application?.status === "APPROVED";

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <Link href="/campaigns" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/>Back to campaigns</Link>

        <div className="card mt-5 overflow-hidden">
          <div className="bg-[#0A1931] p-7 text-white">
            <div className="text-xs font-bold uppercase tracking-wider text-[#FDB913]">{String(campaign.kind || "Campaign").replaceAll("_", " ")}</div>
            <h1 className="mt-2 text-3xl font-bold">{campaign.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{campaign.description || "Campaign information and participation requirements."}</p>
            <div className="mt-5 inline-flex rounded-full bg-white/10 px-3 py-2 text-xs font-bold">{String(campaign.status).replaceAll("_", " ")}</div>
          </div>

          <div className="border-b border-slate-200 p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-bold">Campaign creative</h2><DestinationLink url={campaign.youtube_url || campaign.landing_url} label="Open destination" /></div><div className="mt-4"><CampaignMediaPreview url={campaign.media_url} type={campaign.media_type} title={campaign.title}/></div></div><div className="grid gap-4 border-b border-slate-200 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Budget" value={`GH₵${Number(campaign.budget || 0).toLocaleString()}`} />
            <Info label="Platform fee" value={`GH₵${Number(campaign.platform_fee || 0).toLocaleString()}`} />
            <Info label="Starts" value={campaign.starts_at ? new Date(campaign.starts_at).toLocaleString() : "Not set"} />
            <Info label="Ends" value={campaign.ends_at ? new Date(campaign.ends_at).toLocaleString() : "Not set"} />
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
            <main className="space-y-6">
              <section className="rounded-2xl border border-slate-200 p-5">
                <h2 className="font-bold">What the advertiser wants</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{campaign.description || "Follow the campaign brief and complete the requested work."}</p>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <h2 className="font-bold">Campaign requirements</h2>
                <div className="mt-4 space-y-4 text-sm text-slate-600">
                  <div className="flex gap-3"><ShieldCheck size={17} className="mt-0.5 text-orange-600"/>Follow the campaign brief and submit only the requested deliverable.</div>
                  <div className="flex gap-3"><CalendarDays size={17} className="mt-0.5 text-orange-600"/>Complete the work before the campaign closing date.</div>
                  {campaign.youtube_url && <a className="flex gap-3 font-semibold text-orange-600" href={campaign.youtube_url} target="_blank" rel="noreferrer"><ExternalLink size={17}/>Open campaign destination</a>}
                  {campaign.landing_url && <a className="flex gap-3 font-semibold text-orange-600" href={campaign.landing_url} target="_blank" rel="noreferrer"><ExternalLink size={17}/>Open landing page</a>}
                </div>
              </section>

              {application && (
                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-bold">Your application</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{application.status}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Info label="Proposed fee" value={`GH₵${Number(application.proposed_fee || 0).toFixed(2)}`} />
                    <Info label="Application date" value={new Date(application.created_at).toLocaleString()} />
                  </div>
                  {application.submission_note && <p className="mt-4 text-sm leading-6 text-slate-600">{application.submission_note}</p>}
                </section>
              )}

              {canSubmit && (
                <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
                  <div className="flex items-center gap-2"><Send size={18}/><h2 className="font-bold">Submit completed work</h2></div>
                  <p className="mt-2 text-sm text-slate-600">Paste the public URL for your completed deliverable and add any useful submission notes.</p>
                  <input className="input mt-4" type="url" required value={submissionUrl} onChange={e=>setSubmissionUrl(e.target.value)} placeholder="https://..." />
                  <textarea className="input mt-3 min-h-28" value={submissionNote} onChange={e=>setSubmissionNote(e.target.value)} placeholder="Tell the advertiser what you completed." />
                  <button disabled={busy || !submissionUrl.trim()} onClick={submitWork} className="btn btn-primary mt-4"><CheckCircle2 size={16}/>{busy ? "Submitting..." : "Submit work"}</button>
                </section>
              )}
            </main>

            <aside className="h-fit rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2"><WalletCards size={18}/><h2 className="font-bold">Participation</h2></div>
              <div className="mt-4 text-xs text-slate-500">Campaign budget</div>
              <div className="mt-1 text-2xl font-bold">GH₵{Number(campaign.budget || 0).toLocaleString()}</div>

              {mine && <button onClick={fund} disabled={busy} className="btn btn-primary mt-6 w-full"><WalletCards size={16}/>{busy ? "Opening Paystack..." : "Fund campaign"}</button>}

              {canApply && (
                <div className="mt-6">
                  <label className="block text-xs font-semibold text-slate-600">Your proposed fee</label>
                  <input className="input mt-2" type="number" min="0" step="0.01" value={fee} onChange={e=>setFee(e.target.value)} placeholder="GH₵ amount" />
                  <label className="mt-4 block text-xs font-semibold text-slate-600">Application note</label>
                  <textarea className="input mt-2 min-h-24" value={note} onChange={e=>setNote(e.target.value)} placeholder="Why you are a good fit for this campaign." />
                  <button onClick={apply} disabled={busy} className="btn btn-primary mt-4 w-full"><Send size={16}/>{busy ? "Applying..." : "Apply to campaign"}</button>
                </div>
              )}

              {!mine && application && !canSubmit && (
                <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  {application.status === "APPROVED" ? "Your application was approved. The submission form will appear here." : "Your application is awaiting the advertiser's decision."}
                </div>
              )}

              {!mine && !application && membership?.status !== "ACTIVE" && (
                <Link href="/creator" className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-orange-600"><LockKeyhole size={14}/>Open Creator Program</Link>
              )}

              {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</div>}
              {message && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{message}</div>}
            </aside>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>;
}
