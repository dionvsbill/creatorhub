"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, CheckCircle2, XCircle, FileText, ExternalLink, UserRound } from "lucide-react";

export default function AdminCreatorApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const s = supabase();
    const { data: app } = await s.from("creator_applications").select("*").eq("id", id).single();
    setApplication(app || null);
    if (app) {
      const { data: p } = await s.from("profiles")
        .select("id,display_name,username,avatar_url,professional_title,bio,country,city,website,youtube_url,instagram_url,tiktok_url,linkedin_url,creator_status,role,created_at")
        .eq("id", app.user_id).single();
      setProfile(p || null);
      setNote(app.review_note || "");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener("creatorhub:db-change", refresh);
    return () => window.removeEventListener("creatorhub:db-change", refresh);
  }, [id]);

  const review = async (status: "APPROVED" | "REJECTED") => {
    if (!application) return;
    setBusy(true);
    setMessage("");
    const s = supabase();
    const { data: { user: admin } } = await s.auth.getUser();
    if (!admin) { setMessage("Administrator session required."); setBusy(false); return; }

    const { error: appError } = await s.from("creator_applications").update({
      status, reviewed_by: admin.id, reviewed_at: new Date().toISOString(), review_note: note.trim() || null,
    }).eq("id", application.id);
    if (appError) { setMessage(appError.message); setBusy(false); return; }

    const { error: profileError } = await s.from("profiles").update({
      creator_status: status, ...(status === "APPROVED" ? { role: "CREATOR" } : {}),
    }).eq("id", application.user_id);
    if (profileError) { setMessage(profileError.message); setBusy(false); return; }

    await s.from("notifications").insert({
      user_id: application.user_id,
      title: status === "APPROVED" ? "Creator Program application approved" : "Creator Program application update",
      body: note.trim() || (status === "APPROVED"
        ? "Your Creator Program application has been approved. Eligible campaign opportunities are now available."
        : "Your Creator Program application was not approved. Review the administrator note and update your application before resubmitting."),
      type: "CREATOR_APPLICATION",
    });

    await s.from("audit_logs").insert({
      actor_id: admin.id,
      action: status === "APPROVED" ? "CREATOR_APPLICATION_APPROVED" : "CREATOR_APPLICATION_REJECTED",
      entity_type: "creator_application",
      entity_id: application.id,
      metadata: { user_id: application.user_id, note: note.trim() || null },
    });

    setMessage(status === "APPROVED" ? "Creator approved successfully." : "Application rejected.");
    setBusy(false);
    await load();
  };

  if (loading) return <AppShell admin><div className="mx-auto max-w-6xl card p-10">Loading creator application...</div></AppShell>;
  if (!application) return <AppShell admin><div className="mx-auto max-w-6xl card p-10"><h1 className="text-xl font-bold">Application not found</h1><Link href="/admin/creators" className="mt-4 inline-flex text-sm font-semibold text-orange-600">Back to creator applications</Link></div></AppShell>;

  return <AppShell admin>
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/creators" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/>Creator applications</Link>
      <div className="mt-5 overflow-hidden rounded-3xl bg-[#0A1931] p-7 text-white">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-2xl object-cover"/> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10"><UserRound size={30}/></div>}
          <div className="flex-1"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#FDB913]">Creator Program review</p><h1 className="mt-1 text-3xl font-bold">{profile?.display_name || "Creator"}</h1><p className="mt-1 text-sm text-slate-300">{profile?.professional_title || "Creator applicant"} {profile?.username ? "· @" + profile.username : ""}</p></div>
          <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">{application.status}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <main className="space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-bold">Applicant profile</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Info label="Username" value={profile?.username ? "@" + profile.username : "Not set"}/>
              <Info label="Location" value={[profile?.city,profile?.country].filter(Boolean).join(", ") || "Not provided"}/>
              <Info label="Account role" value={profile?.role || "USER"}/>
              <Info label="Creator status" value={profile?.creator_status || application.status}/>
              <Info label="Application date" value={new Date(application.created_at).toLocaleString()}/>
              <Info label="Audience size" value={Number(application.audience_size || 0).toLocaleString()}/>
            </div>
            <div className="mt-5"><div className="text-sm font-semibold">Professional bio</div><p className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{application.bio || profile?.bio || "No bio provided."}</p></div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold">Creator channels</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Channel label="Primary channel" url={application.channel_url}/>
              <Channel label="YouTube" url={profile?.youtube_url}/>
              <Channel label="Instagram" url={profile?.instagram_url}/>
              <Channel label="TikTok" url={profile?.tiktok_url}/>
              <Channel label="LinkedIn" url={profile?.linkedin_url}/>
              <Channel label="Website" url={profile?.website}/>
            </div>
            <div className="mt-4"><Info label="Content niche" value={application.niche || "Not provided"}/></div>
          </section>

          <section className="card p-6">
            <div className="flex items-center gap-2"><FileText size={18}/><h2 className="text-lg font-bold">Supporting evidence</h2></div>
            {application.attachment_urls?.length ? <div className="mt-4 space-y-2">{application.attachment_urls.map((path:string,index:number)=><div key={path} className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><span className="truncate text-sm text-slate-600">Evidence {index+1}</span><span className="text-xs text-slate-400">Stored securely</span></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No supporting files were attached.</p>}
          </section>
        </main>

        <aside className="h-fit space-y-6">
          <section className="card p-6">
            <h2 className="font-bold">Administrator decision</h2>
            <textarea className="input mt-4 min-h-32" value={note} onChange={e=>setNote(e.target.value)} placeholder="Explain the decision, required changes or next steps."/>
            {message && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">{message}</div>}
            {application.status === "PENDING" && <div className="mt-4 grid gap-2">
              <button disabled={busy} onClick={()=>review("APPROVED")} className="btn btn-primary w-full"><CheckCircle2 size={16}/>{busy ? "Saving..." : "Approve creator"}</button>
              <button disabled={busy} onClick={()=>review("REJECTED")} className="btn btn-secondary w-full"><XCircle size={16}/>Reject application</button>
            </div>}
          </section>
          <section className="card p-6">
            <h2 className="font-bold">Review workflow</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex gap-3"><CheckCircle2 size={17} className="text-orange-600"/>Membership payment is verified separately.</div>
              <div className="flex gap-3"><CheckCircle2 size={17} className="text-orange-600"/>This review controls creator eligibility.</div>
              <div className="flex gap-3"><CheckCircle2 size={17} className="text-orange-600"/>Approval changes the creator status and notifies the applicant.</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </AppShell>;
}

function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 break-words text-sm font-semibold">{value}</div></div>}
function Channel({label,url}:{label:string;url?:string|null}){return url ? <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold text-orange-600"><span>{label}</span><ExternalLink size={15}/></a> : <Info label={label} value="Not provided"/>}
