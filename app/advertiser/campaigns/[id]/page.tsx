"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Users,
  WalletCards,
  FileText,
} from "lucide-react";

export default function AdvertiserCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const load = async () => {
    setLoading(true);
    const s = supabase();
    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await s
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .eq("advertiser_id", user.id)
      .single();

    setCampaign(data || null);

    if (data) {
      const { data: apps } = await s
        .from("campaign_applications")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false });

      setApplications(apps || []);
    }

    setLoading(false);
  };

  const fundCampaign = async () => {
    setPaying(true); setPaymentError("");
    const s = supabase();
    const { data: { session } } = await s.auth.getSession();
    if (!session) { window.location.href = "/auth/sign-in"; return; }
    const total = Number(campaign?.budget || 0) + Number(campaign?.platform_fee || 0);
    const response = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ amount: total, purpose: "campaign_funding", campaign_id: campaign.id, description: `Funding: ${campaign.title}` }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.authorization_url) { setPaymentError(data.error || "Could not start payment."); setPaying(false); return; }
    window.location.href = data.authorization_url;
  };

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener("creatorhub:db-change", refresh);
    return () => window.removeEventListener("creatorhub:db-change", refresh);
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl card p-10">Loading campaign...</div>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl card p-10">
          <h1 className="text-xl font-bold">Campaign not found</h1>
          <Link href="/advertiser/campaigns" className="mt-4 inline-flex text-sm font-semibold text-orange-600">
            Return to campaign workspace
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <Link
          href="/advertiser/campaigns"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
        >
          <ArrowLeft size={16} />
          Campaign workspace
        </Link>

        <div className="card mt-5 overflow-hidden">
          <div className="bg-[#0A1931] p-7 text-white">
            <div className="text-xs font-bold uppercase tracking-wider text-[#FDB913]">
              {String(campaign.kind || "Campaign").replaceAll("_", " ")}
            </div>
            <h1 className="mt-2 text-3xl font-bold">{campaign.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              {campaign.description || "Campaign information and participation requirements."}
            </p>
            <div className="mt-5 inline-flex rounded-full bg-white/10 px-3 py-2 text-xs font-bold">
              {String(campaign.status).replaceAll("_", " ")}
            </div>
          </div>

          {campaign.status === "PENDING_FUNDING" && (
            <div className="mx-6 mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-bold text-orange-900">Approved — funding required</div>
                  <p className="mt-1 text-sm text-orange-800">CreatorHub approved this campaign. Pay the displayed total to activate it and make it available to creators.</p>
                </div>
                <button onClick={fundCampaign} disabled={paying} className="btn btn-primary shrink-0">
                  <WalletCards size={16}/>{paying ? "Opening payment..." : `Fund GH₵${(Number(campaign.budget||0)+Number(campaign.platform_fee||0)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`}
                </button>
              </div>
              {paymentError && <div className="mt-3 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-700">{paymentError}</div>}
            </div>
          )}

          <div className="grid gap-4 border-b border-slate-200 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Budget" value={`GH₵${Number(campaign.budget || 0).toLocaleString()}`} />
            <Info label="Spent" value={`GH₵${Number(campaign.spent || 0).toLocaleString()}`} />
            <Info label="Platform fee" value={`GH₵${Number(campaign.platform_fee || 0).toLocaleString()}`} />
            <Info label="Applications" value={String(applications.length)} />
            <Info label="Funding status" value={campaign.funding_status || "REQUIRED"} />
            <Info label="Total required" value={`GH₵${(Number(campaign.budget||0)+Number(campaign.platform_fee||0)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`} />
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
            <main className="space-y-6">
              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2">
                  <FileText size={18} />
                  <h2 className="font-bold">Campaign brief</h2>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {campaign.description || "No campaign brief provided."}
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} />
                  <h2 className="font-bold">Schedule and destinations</h2>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Info
                    label="Starts"
                    value={campaign.starts_at ? new Date(campaign.starts_at).toLocaleString() : "Not set"}
                  />
                  <Info
                    label="Ends"
                    value={campaign.ends_at ? new Date(campaign.ends_at).toLocaleString() : "Not set"}
                  />
                  {campaign.youtube_url && (
                    <a
                      href={campaign.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold text-orange-600"
                    >
                      <ExternalLink size={15} />
                      YouTube destination
                    </a>
                  )}
                  {campaign.landing_url && (
                    <a
                      href={campaign.landing_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold text-orange-600"
                    >
                      <ExternalLink size={15} />
                      Landing page
                    </a>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2">
                  <Users size={18} />
                  <h2 className="font-bold">Creator applications</h2>
                </div>

                <div className="mt-4 space-y-3">
                  {applications.map((application) => (
                    <div key={application.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">
                          Creator {String(application.creator_id).slice(0, 8)}
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                          {application.status}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Proposed fee: GH₵{Number(application.proposed_fee || 0).toFixed(2)}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {application.submission_note || "No creator note provided."}
                      </p>
                    </div>
                  ))}

                  {!applications.length && (
                    <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                      No creator applications yet.
                    </div>
                  )}
                </div>
              </section>
            </main>

            <aside className="h-fit rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2">
                <WalletCards size={18} />
                <h2 className="font-bold">Campaign finances</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Budget</span>
                  <span className="font-semibold">GH₵{Number(campaign.budget || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Spent</span>
                  <span className="font-semibold">GH₵{Number(campaign.spent || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Platform fee</span>
                  <span className="font-semibold">GH₵{Number(campaign.platform_fee || 0).toLocaleString()}</span>
                </div>
              <div className="flex justify-between gap-4 border-t pt-3"><span className="font-semibold">Total funding</span><span className="font-bold">GH₵{(Number(campaign.budget||0)+Number(campaign.platform_fee||0)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}
