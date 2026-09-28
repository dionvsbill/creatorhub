"use client";

import { useEffect, useState, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { BadgeCheck, Camera, CheckCircle2, Globe2, Link2, Loader2, MapPin, Pencil, ShieldCheck, Sparkles, UserRound, Video, WalletCards, Megaphone, Clock3, XCircle } from "lucide-react";

type Profile = {
  id:string; display_name:string|null; username:string|null; avatar_url:string|null; cover_url:string|null; phone:string|null; country:string|null; city:string|null;
  bio:string|null; professional_title:string|null; website:string|null; youtube_url:string|null; instagram_url:string|null; tiktok_url:string|null; linkedin_url:string|null;
  role:string; creator_status:string; referral_code:string|null; coins:number; cash_balance:number; pending_cash:number; account_status:string;
};
type Membership = { status:string; fee:number; currency:string; payment_reference:string|null; paid_at:string|null };
type Transaction = { id:string; type:string; amount:number; currency:string; status:string; reference:string; description:string|null; created_at:string; paid_at:string|null };
type CampaignApplication = { id:string; campaign_id:string; status:string; proposed_fee:number; submission_url:string|null; submission_note:string|null; created_at:string; updated_at:string; campaign?:{title:string}|null };

export default function ProfilePage() {
  const [profile,setProfile]=useState<Profile|null>(null);
  const [membership,setMembership]=useState<Membership|null>(null);
  const [transactions,setTransactions]=useState<Transaction[]>([]);
  const [applications,setApplications]=useState<CampaignApplication[]>([]);
  const [email,setEmail]=useState("");
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState<"avatar"|"cover"|null>(null);
  const [message,setMessage]=useState("");
  const [form,setForm]=useState({display_name:"",username:"",professional_title:"",phone:"",country:"Ghana",city:"",bio:"",website:"",youtube_url:"",instagram_url:"",tiktok_url:"",linkedin_url:""});

  const load=async()=>{
    const s=supabase(); const {data:{user}}=await s.auth.getUser(); if(!user)return;
    setEmail(user.email||"");
    const [pr,mr,tr,ar]=await Promise.all([
      s.from("profiles").select("*").eq("id",user.id).single(),
      s.from("creator_memberships").select("status,fee,currency,payment_reference,paid_at").eq("user_id",user.id).maybeSingle(),
      s.from("transactions").select("id,type,amount,currency,status,reference,description,created_at,paid_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100),
      s.from("campaign_applications").select("id,campaign_id,status,proposed_fee,submission_url,submission_note,created_at,updated_at").eq("creator_id",user.id).order("created_at",{ascending:false}).limit(100)
    ]);
    const p=pr.data as Profile|null; setProfile(p); setMembership((mr.data as Membership|null)||null); setTransactions((tr.data as Transaction[])||[]);
    const apps=(ar.data as CampaignApplication[])||[];
    if(apps.length){const ids=[...new Set(apps.map(x=>x.campaign_id))];const {data:campaigns}=await s.from("campaigns").select("id,title").in("id",ids);const map=new Map((campaigns||[]).map(x=>[x.id,x.title]));setApplications(apps.map(x=>({...x,campaign:map.has(x.campaign_id)?{title:map.get(x.campaign_id)!}:null})));}else setApplications([]);
    if(p)setForm({display_name:p.display_name||"",username:p.username||"",professional_title:p.professional_title||"",phone:p.phone||"",country:p.country||"Ghana",city:p.city||"",bio:p.bio||"",website:p.website||"",youtube_url:p.youtube_url||"",instagram_url:p.instagram_url||"",tiktok_url:p.tiktok_url||"",linkedin_url:p.linkedin_url||""});
  };

  useEffect(()=>{load();const h=()=>load();window.addEventListener("creatorhub:db-change",h);return()=>window.removeEventListener("creatorhub:db-change",h)},[]);

  const save=async()=>{
    if(!profile)return;setSaving(true);setMessage("");
    const username=form.username.trim().toLowerCase().replace(/[^a-z0-9._-]/g,"");
    const {error}=await supabase().from("profiles").update({...form,display_name:form.display_name.trim()||null,username:username||null,professional_title:form.professional_title.trim()||null,phone:form.phone.trim()||null,country:form.country.trim()||"Ghana",city:form.city.trim()||null,bio:form.bio.trim()||null,website:form.website.trim()||null,youtube_url:form.youtube_url.trim()||null,instagram_url:form.instagram_url.trim()||null,tiktok_url:form.tiktok_url.trim()||null,linkedin_url:form.linkedin_url.trim()||null,updated_at:new Date().toISOString()}).eq("id",profile.id);
    setMessage(error?(error.code==="23505"?"That username is already in use.":error.message):"Profile updated."); if(!error){setEditing(false);await load()} setSaving(false);
  };

  const upload=async(file:File,kind:"avatar"|"cover")=>{
    const {data:{user}}=await supabase().auth.getUser();if(!user)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMessage("Use a JPG, PNG or WebP image.");return}
    const limit=kind==="cover"?8:5;if(file.size>limit*1024*1024){setMessage(`${kind==="cover"?"Cover images":"Profile photos"} must be ${limit} MB or smaller.`);return}
    setUploading(kind);setMessage("");const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";const path=`${user.id}/${kind}-${Date.now()}.${ext}`;const s=supabase();
    const {error}=await s.storage.from("avatars").upload(path,file,{upsert:false,contentType:file.type});if(error){setMessage(error.message);setUploading(null);return}
    const {data}=s.storage.from("avatars").getPublicUrl(path);const field=kind==="cover"?"cover_url":"avatar_url";
    const {error:updateError}=await s.from("profiles").update({[field]:data.publicUrl,updated_at:new Date().toISOString()}).eq("id",user.id);
    setMessage(updateError?updateError.message:`${kind==="cover"?"Cover":"Profile photo"} updated.`);setUploading(null);await load();
  };

  if(!profile)return <AppShell><div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center"><Loader2 className="animate-spin text-orange-600"/></div></AppShell>;
  const initials=(profile.display_name||email||"U").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
  const active=membership?.status==="ACTIVE";
  const socialLinks=[{label:"YouTube",url:profile.youtube_url,icon:Video},{label:"Instagram",url:profile.instagram_url,icon:Camera},{label:"TikTok",url:profile.tiktok_url,icon:Link2},{label:"LinkedIn",url:profile.linkedin_url,icon:Link2}];

  return <AppShell admin={profile.role==="ADMIN"}>
    <div className="mx-auto max-w-6xl">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-52 bg-[linear-gradient(120deg,#07111f,#17253a_55%,#d97706)]">
          {profile.cover_url&&<img src={profile.cover_url} alt="" className="h-full w-full object-cover"/>}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent"/>
          <label className="absolute right-4 top-4 flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
            <Camera size={14}/>{uploading==="cover"?"Uploading...":"Edit cover"}<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0],"cover")}/>
          </label>
        </div>
        <div className="relative px-6 pb-7 md:px-9">
          <div className="-mt-14 flex flex-col gap-4">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-slate-950 shadow-lg">
              {profile.avatar_url?<img src={profile.avatar_url} alt={profile.display_name||"Profile"} className="h-full w-full object-cover"/>:<div className="flex h-full w-full items-center justify-center text-xl font-bold text-white">{initials}</div>}
              <label className="absolute bottom-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg"><Camera size={15}/><input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0],"avatar")}/></label>
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-bold tracking-tight">{profile.display_name||"Complete your profile"}</h1>{active&&<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><BadgeCheck size={14}/> Creator member</span>}</div><p className="mt-1 text-sm text-slate-500">{profile.professional_title||"CreatorHub member"}{profile.username?" · @"+profile.username:""}</p></div>
              <button onClick={()=>setEditing(!editing)} className="btn btn-secondary"><Pencil size={15}/>{editing?"Close editor":"Edit profile"}</button>
            </div>
          </div>
          {uploading&&<div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin"/> Updating {uploading}...</div>}
          {message&&<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">{message}</div>}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <section className="space-y-6">
          <div className="card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-orange-600">Professional profile</p><h2 className="mt-1 text-xl font-bold">About you</h2></div><UserRound className="text-slate-300" size={22}/></div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{profile.bio||"Add a short professional introduction so advertisers and collaborators can understand who you are."}</p><div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">{(profile.city||profile.country)&&<span className="inline-flex items-center gap-1.5"><MapPin size={15}/>{[profile.city,profile.country].filter(Boolean).join(", ")}</span>}{profile.website&&<a href={profile.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-slate-900"><Globe2 size={15}/>Website</a>}</div></div>
          <div className="card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Campaign workspace</p><h2 className="mt-1 text-xl font-bold">My campaign applications</h2></div><Megaphone size={21} className="text-slate-300"/></div><div className="mt-5 space-y-3">{applications.map(a=><div key={a.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div><div className="font-semibold">{a.campaign?.title||"Campaign"}</div><div className="mt-1 text-xs text-slate-500">Applied {new Date(a.created_at).toLocaleString()}</div></div><Status status={a.status}/></div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><span className="text-slate-500">Proposed fee</span><div className="font-semibold">GH₵{Number(a.proposed_fee||0).toFixed(2)}</div></div><div><span className="text-slate-500">Last updated</span><div className="font-semibold">{new Date(a.updated_at).toLocaleDateString()}</div></div></div>{a.submission_url&&<a href={a.submission_url} target="_blank" rel="noreferrer" className="mt-3 block truncate text-xs font-semibold text-orange-600">{a.submission_url}</a>}{a.submission_note&&<p className="mt-2 text-sm text-slate-600">{a.submission_note}</p>}</div>)}{!applications.length&&<div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No campaign applications yet. Approved campaigns will appear here as you apply.</div>}</div></div>
          <div className="card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Payment history</p><h2 className="mt-1 text-xl font-bold">All account transactions</h2></div><WalletCards size={21} className="text-slate-300"/></div><div className="mt-5 space-y-2">{transactions.map(t=><div key={t.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="font-semibold">{t.description||t.type.replaceAll("_"," ")}</div><div className="mt-1 truncate font-mono text-[11px] text-slate-400">{t.reference}</div><div className="mt-1 text-xs text-slate-500">{new Date(t.created_at).toLocaleString()}</div></div><div className="text-left sm:text-right"><div className="font-bold">GH₵{Number(t.amount).toFixed(2)}</div><Status status={t.status}/></div></div>)}{!transactions.length&&<div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No payment records yet.</div>}</div></div>
          <div className="card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Connected presence</p><h2 className="mt-1 text-xl font-bold">Social profiles</h2></div><Link2 size={21} className="text-slate-300"/></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{socialLinks.map(({label,url,icon:Icon})=>url?<a key={label} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"><Icon size={18}/><span className="min-w-0 truncate text-sm font-semibold">{label}</span><Link2 size={14} className="ml-auto text-slate-400"/></a>:<div key={label} className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-4 text-slate-400"><Icon size={18}/><span className="text-sm">{label} not connected</span></div>)}</div></div>
        </section>
        <aside className="space-y-6">
          <div className="card p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Account overview</p><div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Coins" value={Number(profile.coins||0).toLocaleString()}/><Metric label="Available" value={"GH₵"+Number(profile.cash_balance||0).toFixed(2)}/><Metric label="Pending" value={"GH₵"+Number(profile.pending_cash||0).toFixed(2)}/><Metric label="Account" value={profile.account_status}/></div></div>
          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm"><div className="flex items-center justify-between"><div className="rounded-xl bg-white/10 p-2.5"><Sparkles size={19}/></div>{active&&<CheckCircle2 size={19} className="text-emerald-400"/>}</div><p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-slate-400">Creator Program</p><h2 className="mt-1 text-xl font-bold">{active?"Membership active":"Not activated"}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{active?"Your Creator Program membership is active.":"Pay and complete the Creator Program activation process to unlock creator earning features."}</p>{membership?.paid_at&&<p className="mt-4 text-xs text-slate-500">Activated {new Date(membership.paid_at).toLocaleDateString()}</p>}{membership?.payment_reference&&<div className="mt-4 rounded-xl bg-white/5 p-3 font-mono text-[11px] text-slate-400">{membership.payment_reference}</div>}</div>
          <div className="card p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><ShieldCheck size={18}/></div><div><div className="font-semibold">Account protection</div><div className="text-xs text-slate-500">Role: {profile.role}</div></div></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">Email</span><span className="max-w-[55%] truncate font-medium">{email}</span></div>{profile.referral_code&&<div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-500">Referral code</span><span className="font-mono font-semibold">{profile.referral_code}</span></div>}</div>
        </aside>
      </div>

      {editing&&<section className="card mt-6 p-6 md:p-8"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-orange-600">Profile editor</p><h2 className="mt-1 text-xl font-bold">Keep your professional identity current</h2></div><div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Display name"><input className="input mt-2" value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} placeholder="Your full name or brand"/></Field><Field label="Username"><input className="input mt-2" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="yourname"/></Field><Field label="Professional title"><input className="input mt-2" value={form.professional_title} onChange={e=>setForm({...form,professional_title:e.target.value})} placeholder="Content creator, marketer, publisher..."/></Field><Field label="Phone"><input className="input mt-2" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+233..."/></Field><Field label="Country"><input className="input mt-2" value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></Field><Field label="City"><input className="input mt-2" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Accra"/></Field><Field label="Website"><input className="input mt-2" type="url" value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></Field><Field label="YouTube"><input className="input mt-2" type="url" value={form.youtube_url} onChange={e=>setForm({...form,youtube_url:e.target.value})}/></Field><Field label="Instagram"><input className="input mt-2" type="url" value={form.instagram_url} onChange={e=>setForm({...form,instagram_url:e.target.value})}/></Field><Field label="TikTok"><input className="input mt-2" type="url" value={form.tiktok_url} onChange={e=>setForm({...form,tiktok_url:e.target.value})}/></Field><Field label="LinkedIn"><input className="input mt-2" type="url" value={form.linkedin_url} onChange={e=>setForm({...form,linkedin_url:e.target.value})}/></Field><div className="md:col-span-2"><Field label="Professional bio"><textarea className="input mt-2 min-h-32" maxLength={1000} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></Field></div>
      </div><div className="mt-6 flex justify-end gap-2"><button className="btn btn-secondary" onClick={()=>setEditing(false)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>} Save profile</button></div></section>}
    </div>
  </AppShell>;
}
function Field({label,children}:{label:string;children:ReactNode}){return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 truncate text-sm font-bold">{value}</div></div>}
function Status({status}:{status:string}){const good=["COMPLETED","PAID","APPROVED","ACTIVE"].includes(status);const bad=["FAILED","REJECTED","CANCELLED"].includes(status);return <span className={"mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold "+(good?"bg-emerald-50 text-emerald-700":bad?"bg-red-50 text-red-700":"bg-amber-50 text-amber-700")}>{good?<CheckCircle2 size={12}/>:bad?<XCircle size={12}/>:<Clock3 size={12}/>} {status.replaceAll("_"," ")}</span>}
