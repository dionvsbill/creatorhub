"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { CheckCircle2, ExternalLink, FileText, Loader2, Search, ShieldCheck, WalletCards, XCircle, UserRound, Download, QrCode } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Complaint = {
  id: string;
  user_id: string;
  reference: string;
  subject: string;
  description: string;
  proof_urls: string[];
  status: string;
  paystack_status: string | null;
  paystack_amount: number | null;
  paystack_currency: string | null;
  paystack_channel: string | null;
  paystack_gateway_response: string | null;
  paystack_paid_at: string | null;
  verified_at: string | null;
  admin_note: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
};

type Profile = { id: string; display_name: string | null; email: string | null };

export default function PaymentComplaints() {
  const [rows, setRows] = useState<Complaint[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [proofLinks, setProofLinks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [resolving, setResolving] = useState(false);\n  const [activating, setActivating] = useState(false);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("OPEN");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const s = supabase();
    const { data } = await s.from("payment_complaints").select("*").order("created_at", { ascending: false });
    const complaints = (data || []) as Complaint[];
    setRows(complaints);

    const ids = [...new Set(complaints.map(x => x.user_id))];
    if (ids.length) {
      const { data: ps } = await s.from("profiles").select("id,display_name,email").in("id", ids);
      setProfiles(Object.fromEntries(((ps || []) as Profile[]).map(p => [p.id, p])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selectComplaint = async (complaint: Complaint) => {
    setSelected(complaint);
    setNote(complaint.admin_note || "");
    const s = supabase();
    const links: string[] = [];
    for (const path of complaint.proof_urls || []) {
      const { data } = await s.storage.from("support-attachments").createSignedUrl(path, 3600);
      if (data?.signedUrl) links.push(data.signedUrl);
    }
    setProofLinks(links);
  };

  const verify = async () => {
    if (!selected) return;
    setVerifying(true);
    const { data: { session } } = await supabase().auth.getSession();
    if (!session) { setVerifying(false); return; }
    const response = await fetch(`/api/admin/payment-complaints/${selected.id}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await response.json();
    if (data.error) {
      setNote(data.error);
    } else {
      setNote(data.success ? "Payment verified. The local transaction was reconciled where applicable." : (data.message || "Paystack returned a status that still needs review."));
    }
    await load();
    const refreshed = (await supabase().from("payment_complaints").select("*").eq("id", selected.id).single()).data as Complaint | null;
    if (refreshed) await selectComplaint(refreshed);
    setVerifying(false);
  };

  const activateCreator = async () => {
    if (!selected || !["VERIFIED", "RESOLVED"].includes(selected.status)) return;
    setActivating(true);
    const { data: { session } } = await supabase().auth.getSession();
    if (!session) { setActivating(false); return; }

    const response = await fetch(`/api/admin/payment-complaints/${selected.id}/activate-creator`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await response.json();
    setNote(data.error || (data.success ? "Creator Program membership is now active." : "Could not activate Creator Program membership."));
    setActivating(false);
  };

  const resolve = async () => {
    if (!selected || selected.status !== "VERIFIED") return;
    setResolving(true);
    const { data: { session } } = await supabase().auth.getSession();
    if (!session) { setResolving(false); return; }
    const response = await fetch(`/api/admin/payment-complaints/${selected.id}/resolve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const data = await response.json();
    if (data.error) setNote(data.error);
    await load();
    const refreshed = (await supabase().from("payment_complaints").select("*").eq("id", selected.id).single()).data as Complaint | null;
    if (refreshed) setSelected(refreshed);
    setResolving(false);
  };

  const filtered = rows.filter(r => (filter === "ALL" || r.status === filter) && (
    !query ||
    r.reference.toLowerCase().includes(query.toLowerCase()) ||
    r.subject.toLowerCase().includes(query.toLowerCase()) ||
    (profiles[r.user_id]?.email || "").toLowerCase().includes(query.toLowerCase())
  ));

  const exportComplaints = (format:"csv"|"json") => {
    const text = format === "json" ? JSON.stringify(filtered, null, 2) : toCsv(filtered);
    const blob = new Blob([text], { type: format === "json" ? "application/json" : "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `creatorhub-payment-complaints-${Date.now()}.${format}`; a.click(); URL.revokeObjectURL(a.href);
  };
  const openCount = rows.filter(r => r.status === "OPEN").length;
  const verifiedCount = rows.filter(r => r.status === "VERIFIED").length;

  return (
    <AppShell admin>
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Finance operations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Payment complaints</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Evidence-first payment support. Match the user's reference against Paystack, compare the amount and currency, reconcile a pending local transaction, and resolve the complaint from one workspace.</p>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <Stat icon={WalletCards} label="Open complaints" value={String(openCount)} />
          <Stat icon={ShieldCheck} label="Verified payments" value={String(verifiedCount)} />
          <Stat icon={CheckCircle2} label="All complaints" value={String(rows.length)} />
        </div>

        <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_500px]">
          <section className="card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                <Search size={16} className="text-slate-400" />
                <input className="w-full bg-transparent py-2.5 text-sm outline-none" placeholder="Reference, subject or email" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              <button className="btn btn-secondary" onClick={()=>exportComplaints("csv")}><Download size={15}/> Export</button><select className="input w-auto" value={filter} onChange={e => setFilter(e.target.value)}>
                <option>OPEN</option><option>VERIFYING</option><option>VERIFIED</option><option>RESOLVED</option><option>REJECTED</option><option>ALL</option>
              </select>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? <div className="p-10 text-center"><Loader2 className="mx-auto animate-spin text-orange-600" /></div> :
              filtered.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No payment complaints match this view.</div> :
              filtered.map(r => {
                const p = profiles[r.user_id];
                return <button key={r.id} onClick={() => selectComplaint(r)} className={`block w-full p-5 text-left transition hover:bg-slate-50 ${selected?.id === r.id ? "bg-slate-50" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><div className="truncate font-semibold">{r.subject}</div><div className="mt-1 truncate font-mono text-xs text-slate-500">{r.reference}</div><div className="mt-2 text-xs text-slate-400">{p?.display_name || p?.email || "User"} · {new Date(r.created_at).toLocaleString()}</div></div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{r.status}</span>
                  </div>
                </button>;
              })}
            </div>
          </section>

          {selected ? <section className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Complaint review</p><h2 className="mt-2 text-xl font-bold">{selected.subject}</h2><p className="mt-1 text-xs text-slate-500">{profiles[selected.user_id]?.email || profiles[selected.user_id]?.display_name || "User"}</p></div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold">{selected.status}</span>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
              <div className="text-xs uppercase tracking-wider text-slate-400">Payment reference</div>
              <div className="mt-2 break-all font-mono text-sm">{selected.reference}</div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-400">Paystack status</span><div className="mt-1 font-semibold">{selected.paystack_status || "Not checked"}</div></div>
                <div><span className="text-slate-400">Amount</span><div className="mt-1 font-semibold">{selected.paystack_amount != null ? `GH₵${Number(selected.paystack_amount).toFixed(2)}` : "Not checked"}</div></div>
                <div><span className="text-slate-400">Channel</span><div className="mt-1 font-semibold">{selected.paystack_channel || "—"}</div></div>
                <div><span className="text-slate-400">Gateway</span><div className="mt-1 font-semibold">{selected.paystack_gateway_response || "—"}</div></div>
              </div>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div><div className="text-xs font-semibold text-slate-400">User report</div><p className="mt-1 whitespace-pre-wrap leading-6 text-slate-600">{selected.description}</p></div>
              <div><div className="text-xs font-semibold text-slate-400">Proof</div><div className="mt-2 space-y-2">{proofLinks.map((url, i) => <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50"><span className="flex items-center gap-2"><FileText size={15} />Proof file {i + 1}</span><ExternalLink size={14} /></a>)}{!proofLinks.length && <span className="text-slate-400">No accessible proof files.</span>}</div></div>
              {selected.admin_note && <div className="rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">{selected.admin_note}</div>}
              <textarea className="input min-h-24" placeholder="Resolution note" value={note} onChange={e => setNote(e.target.value)} />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button onClick={verify} disabled={verifying} className="btn btn-secondary">{verifying ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Verify with Paystack</button>
              <button onClick={activateCreator} disabled={activating || !["VERIFIED", "RESOLVED"].includes(selected.status)} className="btn btn-primary">{activating ? <Loader2 size={15} className="animate-spin" /> : <UserRound size={15} />} Activate Creator Program</button>
              <button onClick={resolve} disabled={resolving || selected.status !== "VERIFIED"} className="btn btn-secondary sm:col-span-2">{resolving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Resolve complaint</button>
            </div>
            {selected.status !== "VERIFIED" && <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><XCircle size={14} />Resolve becomes available only after the payment is independently verified.</p>}
          </section> : <section className="card flex min-h-[500px] items-center justify-center p-8 text-center"><div><ShieldCheck size={34} className="mx-auto text-slate-300" /><h2 className="mt-4 font-semibold">Select a complaint</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">The review panel will show the user's proof, Paystack status, amount, channel and local transaction record.</p></div></section>}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return <div className="card p-5"><Icon size={18} className="text-orange-600" /><div className="mt-4 text-2xl font-bold">{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>;
}
\nfunction toCsv(rows:Complaint[]){const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];const esc=(v:unknown)=>`"${String(typeof v==="object"&&v!==null?JSON.stringify(v):v??"").replaceAll('"','""')}"`;return [keys.join(","),...rows.map(r=>keys.map(k=>esc((r as any)[k])).join("\\n"))].join("\\n")}