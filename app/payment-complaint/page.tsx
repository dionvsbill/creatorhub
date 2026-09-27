"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, FileCheck2, Loader2, Paperclip, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PaymentComplaintPage() {
  const [form, setForm] = useState({ reference: "", subject: "", description: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (reference) setForm(current => ({ ...current, reference }));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("loading");
    setMessage("");
    const s = supabase();
    const { data: { user } } = await s.auth.getUser();
    if (!user) { setState("error"); setMessage("Please sign in before filing a payment complaint."); return; }

    const proofUrls: string[] = [];
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${user.id}/payment-complaints/${crypto.randomUUID()}-${safe}`;
      const { error } = await s.storage.from("support-attachments").upload(path, file, { upsert: false, contentType: file.type });
      if (error) { setState("error"); setMessage("One of the proof files could not be uploaded. Please try again."); return; }
      proofUrls.push(path);
    }

    const { error } = await s.from("payment_complaints").insert({
      user_id: user.id,
      reference: form.reference.trim(),
      subject: form.subject.trim(),
      description: form.description.trim(),
      proof_urls: proofUrls,
    });
    if (error) { setState("error"); setMessage(error.message); return; }
    setState("done");
  };

  if (state === "done") return (
    <main className="min-h-screen bg-slate-50 px-5 py-16">
      <div className="mx-auto max-w-2xl rounded-[30px] border border-emerald-200 bg-white p-8 text-center shadow-xl md:p-12">
        <CheckCircle2 size={46} className="mx-auto text-emerald-600" />
        <h1 className="mt-5 text-2xl font-bold text-slate-950">Payment complaint received</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">CreatorHub will match your reference against the payment record and Paystack verification data. If the payment is confirmed, the admin can resolve the issue without asking you to repeat the payment details.</p>
        <a href="/dashboard" className="btn btn-primary mt-7">Return to dashboard</a>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[30px] bg-[#0A1931] p-7 text-white md:p-10">
          <div className="flex items-center gap-3"><div className="rounded-2xl bg-white/10 p-3"><ShieldCheck size={22} /></div><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#FDB913]">Payment support</p><h1 className="mt-1 text-2xl font-bold md:text-3xl">Payment complaint</h1></div></div>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">If your payment was completed but your account, membership, campaign or wallet was not updated, provide the payment reference and proof. We use the reference to verify the payment directly.</p>
        </div>

        <form onSubmit={submit} className="mt-5 rounded-[30px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-semibold">Paystack transaction reference<input required className="input mt-2 font-mono" placeholder="CH_..." value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></label>
            <label className="text-sm font-semibold">What went wrong?<select className="input mt-2" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required><option value="">Select an issue</option><option>Payment succeeded but membership was not activated</option><option>Payment succeeded but campaign/wallet was not updated</option><option>Payment was deducted but the payment page failed</option><option>Payment was completed but CreatorHub shows pending</option><option>Other payment issue</option></select></label>
          </div>
          <label className="mt-5 block text-sm font-semibold">Explain what happened<textarea required minLength={10} rows={7} className="input mt-2 resize-none" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Include the amount, approximate time, what you expected to happen, and what actually happened." /></label>
          <label className="mt-5 block text-sm font-semibold">Payment proof<span className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium hover:bg-slate-100"><Paperclip size={17} /><span>{files.length ? `${files.length} proof file(s) selected` : "Attach receipt, Paystack confirmation or screenshot"}</span><input type="file" multiple accept="image/*,.pdf,.png,.jpg,.jpeg" className="hidden" onChange={e => setFiles(Array.from(e.target.files || []))} /></span></label>
          {files.length > 0 && <div className="mt-3 space-y-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"><span className="flex min-w-0 items-center gap-2 truncate"><FileCheck2 size={14} />{file.name}</span><button type="button" onClick={() => setFiles(files.filter((_, i) => i !== index))}><X size={14} /></button></div>)}</div>}
          {state === "error" && <p className="mt-4 text-sm text-red-600">{message}</p>}
          <button disabled={state === "loading"} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0A1931] px-6 py-3 font-semibold text-white disabled:opacity-50">{state === "loading" ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}Submit payment complaint</button>
        </form>
      </div>
    </main>
  );
}
