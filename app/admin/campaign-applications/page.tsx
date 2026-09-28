"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { Check, X, Eye, XCircle, Search } from "lucide-react";

export default function CampaignApplicationsAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    const s = supabase();
    const { data } = await s
      .from("campaign_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    const apps = data || [];

    if (!apps.length) {
      setRows([]);
      return;
    }

    const campaignIds = [...new Set(apps.map((x: any) => x.campaign_id))];
    const creatorIds = [...new Set(apps.map((x: any) => x.creator_id))];

    const [{ data: campaigns }, { data: profiles }] = await Promise.all([
      s.from("campaigns").select("id,title,status,budget").in("id", campaignIds),
      s
        .from("profiles")
        .select("id,display_name,username,avatar_url,creator_status")
        .in("id", creatorIds),
    ]);

    const campaignMap = new Map((campaigns || []).map((x: any) => [x.id, x]));
    const profileMap = new Map((profiles || []).map((x: any) => [x.id, x]));

    setRows(
      apps.map((x: any) => ({
        ...x,
        campaign: campaignMap.get(x.campaign_id),
        creator: profileMap.get(x.creator_id),
      }))
    );
  };

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener("creatorhub:db-change", refresh);
    return () => window.removeEventListener("creatorhub:db-change", refresh);
  }, []);

  const review = async (id: string, status: "APPROVED" | "REJECTED") => {
    const s = supabase();
    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) return;

    await s
      .from("campaign_applications")
      .update({
        status,
        submission_note: note || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    const selectedRow = rows.find((x) => x.id === id);

    if (selectedRow?.creator_id) {
      await s.from("notifications").insert({
        user_id: selectedRow.creator_id,
        title: `Campaign application ${status.toLowerCase()}`,
        body:
          note ||
          `Your campaign application has been ${status.toLowerCase()}.`,
        type: "CAMPAIGN_APPLICATION",
      });
    }

    await s.from("audit_logs").insert({
      actor_id: user.id,
      action: "CAMPAIGN_APPLICATION_REVIEWED",
      entity_type: "campaign_application",
      entity_id: id,
      metadata: { status, note: note || null },
    });

    setSelected(null);
    setNote("");
    load();
  };

  const filtered = rows.filter((row) =>
    [
      row.creator?.display_name,
      row.creator?.username,
      row.campaign?.title,
      row.status,
    ].some((value) =>
      String(value || "").toLowerCase().includes(q.toLowerCase())
    )
  );

  return (
    <AppShell admin>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-slate-500">Administration</p>
            <h1 className="text-2xl font-bold">Campaign applications</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review creator applications, approve work and send the creator a decision.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search creator or campaign"
              className="w-56 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="card mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-4">Creator</th>
                <th className="p-4">Campaign</th>
                <th className="p-4">Proposed fee</th>
                <th className="p-4">Status</th>
                <th className="p-4">Applied</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {row.creator?.avatar_url ? (
                        <img
                          src={row.creator.avatar_url}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-slate-900" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {row.creator?.display_name || "Creator"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.creator?.username
                            ? "@" + row.creator.username
                            : row.creator_id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-medium">
                    {row.campaign?.title || "Campaign"}
                  </td>
                  <td className="p-4">
                    GH₵{Number(row.proposed_fee || 0).toFixed(2)}
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold">
                      {row.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        setSelected(row);
                        setNote(row.submission_note || "");
                      }}
                      className="btn btn-secondary text-xs"
                    >
                      <Eye size={14} />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filtered.length && (
            <div className="p-10 text-center text-sm text-slate-500">
              No campaign applications found.
            </div>
          )}
        </div>

        {selected && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4"
            onClick={() => setSelected(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                    Application review
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    {selected.creator?.display_name || "Creator"} ·{" "}
                    {selected.campaign?.title || "Campaign"}
                  </h2>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-2 hover:bg-slate-100"
                  aria-label="Close review"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Info label="Status" value={selected.status} />
                <Info
                  label="Proposed fee"
                  value={`GH₵${Number(selected.proposed_fee || 0).toFixed(2)}`}
                />
                <Info
                  label="Creator"
                  value={
                    selected.creator?.username
                      ? "@" + selected.creator.username
                      : selected.creator_id
                  }
                />
                <Info
                  label="Applied"
                  value={new Date(selected.created_at).toLocaleString()}
                />
              </div>

              <div className="mt-5">
                <div className="text-sm font-semibold">Submission link</div>
                {selected.submission_url ? (
                  <a
                    href={selected.submission_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-all rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-orange-600"
                  >
                    {selected.submission_url}
                  </a>
                ) : (
                  <div className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No submission link provided.
                  </div>
                )}
              </div>

              <div className="mt-5">
                <div className="text-sm font-semibold">Creator message</div>
                <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {selected.submission_note || "No message provided."}
                </p>
              </div>

              <label className="mt-5 block text-sm font-semibold">
                Administrator decision note
                <textarea
                  className="input mt-2 min-h-28"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Explain the decision or next steps."
                />
              </label>

              <div className="mt-6 flex justify-end gap-2">
                {["PENDING", "SUBMITTED"].includes(selected.status) && (
                  <>
                    <button
                      onClick={() => review(selected.id, "REJECTED")}
                      className="btn btn-secondary"
                    >
                      <XCircle size={15} />
                      Reject
                    </button>
                    <button
                      onClick={() => review(selected.id, "APPROVED")}
                      className="btn btn-primary"
                    >
                      <Check size={15} />
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
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
