"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import CampaignMediaPreview, { DestinationLink } from "@/components/CampaignMediaPreview";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Users,
  CalendarDays,
  WalletCards,
  ExternalLink,
  FileText,
  Clock3,
} from "lucide-react";

export default function AdminCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState("");

  const load = async () => {
    setLoading(true);
    const s = supabase();
    const { data } = await s.from("campaigns").select("*").eq("id", id).single();
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

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener("creatorhub:db-change", refresh);
    return () => window.removeEventListener("creatorhub:db-change", refresh);
  }, [id]);

  const setStatus = async (status: string) => {
    setSaving(true);
    const s = supabase();
    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await s
      .from("campaigns")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) {
      await s.from("audit_logs").insert({
        actor_id: user.id,
        action: "CAMPAIGN_STATUS_CHANGED",
        entity_type: "campaign",
        entity_id: id,
        metadata: { to: status, note: decision || null },
      });

      if (campaign?.advertiser_id) {
        const title =
          status === "ACTIVE"
            ? "Campaign approved"
            : status === "REJECTED"
              ? "Campaign rejected"
              : status === "PAUSED"
                ? "Campaign paused"
                : "Campaign status updated";

        const body =
          decision ||
          (status === "ACTIVE"
            ? `Your campaign "${campaign.title}" has been approved and is now active.`
            : status === "REJECTED"
              ? `Your campaign "${campaign.title}" was not approved.`
              : `Your campaign "${campaign.title}" is now ${status.toLowerCase().replaceAll("_", " ")}.`);

        await s.from("notifications").insert({
          user_id: campaign.advertiser_id,
          title,
          body,
          type: "CAMPAIGN_STATUS",
        });
      }
    }

    await load();
    setSaving(false);
  };

  if (loading) {
    return (
      <AppShell admin>
        <div className="mx-auto max-w-6xl card p-10">Loading campaign...</div>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell admin>
        <div className="mx-auto max-w-6xl card p-10">
          <h1 className="text-xl font-bold">Campaign not found</h1>
          <Link href="/admin/campaigns" className="mt-4 inline-flex text-sm font-semibold text-orange-600">
            Return to campaign management
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell admin>
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/campaigns"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
        >
          <ArrowLeft size={16} />
          Campaign management
        </Link>

        <div className="card mt-5 overflow-hidden">
          <div className="bg-[#0A1931] p-7 text-white">
            <div className="flex flex-col justify-between gap-5 md:flex-row">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#FDB913]">
                  {String(campaign.kind || "Campaign").replaceAll("_", " ")}
                </div>
                <h1 className="mt-2 text-3xl font-bold">{campaign.title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  {campaign.description || "No campaign brief was provided."}
                </p>
              </div>
              <span className="h-fit rounded-full bg-white/10 px-3 py-2 text-xs font-bold">
                {String(campaign.status).replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-200 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Advertiser" value={campaign.advertiser_id} />
            <Info label="Budget" value={`GH₵${Number(campaign.budget || 0).toLocaleString()}`} />
            <Info label="Platform fee" value={`GH₵${Number(campaign.platform_fee || 0).toLocaleString()}`} />
            <Info label="Spent" value={`GH₵${Number(campaign.spent || 0).toLocaleString()}`} />
            <Info label="Currency" value={campaign.currency || "GHS"} />
            <Info
              label="Starts"
              value={campaign.starts_at ? new Date(campaign.starts_at).toLocaleString() : "Not set"}
            />
            <Info
              label="Ends"
              value={campaign.ends_at ? new Date(campaign.ends_at).toLocaleString() : "Not set"}
            />
            <Info label="Applications" value={String(applications.length)} />
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
            <main className="space-y-6">
              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2">
                  <FileText size={18} />
                  <h2 className="font-bold">Campaign brief</h2>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {campaign.description || "No brief provided."}
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} />
                  <h2 className="font-bold">Schedule and links</h2>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Info label="Start date" value={campaign.starts_at ? new Date(campaign.starts_at).toLocaleString() : "Not set"} />
                  <Info label="End date" value={campaign.ends_at ? new Date(campaign.ends_at).toLocaleString() : "Not set"} />
                  {campaign.youtube_url && (
                    <a
                      href={campaign.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold text-orange-600"
                    >
                      <ExternalLink size={15} />
                      Open YouTube destination
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
                      Open landing page
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
                      <div className="flex flex-col justify-between gap-2 sm:flex-row">
                        <div>
                          <div className="font-semibold">
                            Creator {String(application.creator_id).slice(0, 8)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Applied {new Date(application.created_at).toLocaleString()}
                          </div>
                        </div>
                        <span className="h-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                          {application.status}
                        </span>
                      </div>
                      <div className="mt-3 text-sm text-slate-600">
                        Proposed fee: GH₵{Number(application.proposed_fee || 0).toFixed(2)}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {application.submission_note || "No creator note provided."}
                      </p>
                    </div>
                  ))}

                  {!applications.length && (
                    <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                      No creator applications have been submitted yet.
                    </div>
                  )}
                </div>
              </section>
            </main>

            <aside className="h-fit rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <div className="flex items-center gap-2">
                <WalletCards size={18} />
                <h2 className="font-bold">Administrator decision</h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review the campaign details before changing its status.
              </p>

              <textarea
                className="input mt-4 min-h-28"
                value={decision}
                onChange={(event) => setDecision(event.target.value)}
                placeholder="Add an internal review note or feedback for the advertiser."
              />

              <div className="mt-4 space-y-2">
                {campaign.status === "PENDING_REVIEW" && (
                  <>
                    <button
                      disabled={saving}
                      onClick={() => setStatus("PENDING_FUNDING")}
                      className="btn btn-primary w-full"
                    >
                      <CheckCircle2 size={16} />
                      Approve & request funding
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => setStatus("REJECTED")}
                      className="btn btn-secondary w-full"
                    >
                      <XCircle size={16} />
                      Reject campaign
                    </button>
                  </>
                )}

                {campaign.status === "ACTIVE" && (
                  <button
                    disabled={saving}
                    onClick={() => setStatus("PAUSED")}
                    className="btn btn-secondary w-full"
                  >
                    <PauseCircle size={16} />
                    Pause campaign
                  </button>
                )}

                {campaign.status === "PAUSED" && (
                  <button
                    disabled={saving}
                    onClick={() => setStatus("ACTIVE")}
                    className="btn btn-primary w-full"
                  >
                    <CheckCircle2 size={16} />
                    Resume campaign
                  </button>
                )}
              </div>

              {saving && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Clock3 size={14} />
                  Saving decision...
                </div>
              )}
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
