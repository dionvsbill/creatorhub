"use client";

import { useEffect, useState, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { BadgeCheck, Camera, CheckCircle2, Globe2, Link2, Loader2, MapPin, Pencil, ShieldCheck, Sparkles, UserRound, Video, type LucideIcon } from "lucide-react";

type Profile = {
  id:string; display_name:string|null; username:string|null; avatar_url:string|null; phone:string|null; country:string|null; city:string|null;
  bio:string|null; professional_title:string|null; website:string|null; youtube_url:string|null; instagram_url:string|null; tiktok_url:string|null; linkedin_url:string|null;
  role:string; creator_status:string; referral_code:string|null; coins:number; cash_balance:number; pending_cash:number; account_status:string;
};
type Membership = { status:string; fee:number; currency:string; payment_reference:string|null; paid_at:string|null };

export default function ProfilePage() {
  const [profile,setProfile]=useState<Profile|null>(null);
  const [membership,setMembership]=useState<Membership|null>(null);
  const [email,setEmail]=useState("");
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [message,setMessage]=useState("");
  const [form,setForm]=useState({
    display_name:"",username:"",professional_title:"",phone:"",country:"Ghana",city:"",bio:"",website:"",
    youtube_url:"",instagram_url:"",tiktok_url:"",linkedin_url:""
  });

  const load=async()=>{
    const s=supabase();
    const {data:{user}}=await s.auth.getUser();
    if(!user)return;
    setEmail(user.email||"");
    const [pr,mr]=await Promise.all([
      s.from("profiles").select("*").eq("id",user.id).single(),
      s.from("creator_memberships").select("status,fee,currency,payment_reference,paid_at").eq("user_id",user.id).maybeSingle()
    ]);
    const p=pr.data as Profile|null;
    setProfile(p);
    setMembership((mr.data as Membership|null)||null);
    if(p)setForm({
      display_name:p.display_name||"",username:p.username||"",professional_title:p.professional_title||"",phone:p.phone||"",
      country:p.country||"Ghana",city:p.city||"",bio:p.bio||"",website:p.website||"",youtube_url:p.youtube_url||"",
      instagram_url:p.instagram_url||"",tiktok_url:p.tiktok_url||"",linkedin_url:p.linkedin_url||""
    });
  };
  useEffect(()=>{load()},[]);

  const save=async()=>{
    if(!profile)return;
    setSaving(true);setMessage("");
    const username=form.username.trim().toLowerCase().replace(/[^a-z0-9._-]/g,"");
    const {error}=await supabase().from("profiles").update({
      display_name:form.display_name.trim()||null,username:username||null,professional_title:form.professional_title.trim()||null,
      phone:form.phone.trim()||null,country:form.country.trim()||"Ghana",city:form.city.trim()||null,bio:form.bio.trim()||null,
      website:form.website.trim()||null,youtube_url:form.youtube_url.trim()||null,instagram_url:form.instagram_url.trim()||null,
      tiktok_url:form.tiktok_url.trim()||null,linkedin_url:form.linkedin_url.trim()||null,updated_at:new Date().toISOString()
    }).eq("id",profile.id);
    if(error)setMessage(error.code==="23505"?"That username is already in use.":error.message);
    else{setMessage("Profile updated.");setEditing(false);await load();}
    setSaving(false);
  };

  const upload=async(file:File)=>{
    const {data:{user}}=await supabase().auth.getUser();
    if(!user)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMessage("Use a JPG, PNG or WebP image.");return;}
    if(file.size>5*1024*1024){setMessage("Profile photos must be 5 MB or smaller.");return;}
    setUploading(true);setMessage("");
    const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";
    const path=user.id+"/avatar-"+Date.now()+"."+ext;
    const s=supabase();
    const {error}=await s.storage.from("avatars").upload(path,file,{upsert:false,contentType:file.type});
    if(error){setMessage(error.message);setUploading(false);return;}
    const {data}=s.storage.from("avatars").getPublicUrl(path);
    const {error:updateError}=await s.from("profiles").update({avatar_url:data.publicUrl,updated_at:new Date().toISOString()}).eq("id",user.id);
    setMessage(updateError?updateError.message:"Profile photo updated.");setUploading(false);await load();
  };

  if(!profile)return <AppShell><div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center"><Loader2 className="animate-spin text-orange-600"/></div></AppShell>;

  const initials=(profile.display_name||email||"U").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
  const active=membership?.status==="ACTIVE";

  const socialLinks: { label: string; url: string | null; icon: LucideIcon }[] = [\n    { label: "YouTube", url: profile.youtube_url, icon: Video },\n    { label: "Instagram", url: profile.instagram_url, icon: Camera },\n    { label: "TikTok", url: profile.tiktok_url, icon: Link2 },\n    { label: "LinkedIn", url: profile.linkedin_url, icon: Link2 },\n  ];\n\n  return <AppShell admin={profile.role==="ADMIN"}>
    <div className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-40 bg-[linear-gradient(120deg,#07111f,#17253a_55%,#d97706)]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(251,191,36,.25),transparent_35%)]"/></div>
        <div className="relative px-6 pb-7 md:px-9">
          <div className="-mt-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-slate-950 shadow-lg">
                {profile.avatar_url?<img src={profile.avatar_url} alt={profile.display_name||"Profile"} className="h-full w-full object-cover"/>:<div className="flex h-full w-full items-center justify-center text-xl font-bold text-white">{initials}</div>}
                <label className="absolute bottom-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg"><Camera size={15}/><input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0])}/></label>
              </div>
              <div className="pb-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight">{profile.display_name||"Complete your profile"}</h1>{active&&<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><BadgeCheck size={14}/> Creator member</span>}</div><p className="mt-1 text-sm text-slate-500">{profile.professional_title||"CreatorHub member"}{profile.username?" · @"+profile.username:""}</p></div>
            </div>
            <button onClick={()=>setEditing(!editing)} className="btn btn-secondary"><Pencil size={15}/>{editing?"Close editor":"Edit profile"}</button>
          </div>
          {uploading&&<div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin"/> Updating profile photo...</div>}
          {message&&<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">{message}</div>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="space-y-6">
          <div className="card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-orange-600">Professional profile</p><h2 className="mt-1 text-xl font-bold">About you</h2></div><UserRound className="text-slate-300" size={22}/></div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{profile.bio||"Add a short professional introduction so advertisers and collaborators can understand who you are."}</p><div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">{(profile.city||profile.country)&&<span className="inline-flex items-center gap-1.5"><MapPin size={15}/>{[profile.city,profile.country].filter(Boolean).join(", ")}</span>}{profile.website&&<a href={profile.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-slate-900"><Globe2 size={15}/>Website</a>}</div></div>
          <div className="card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Connected presence</p><h2 className="mt-1 text-xl font-bold">Social profiles</h2></div><Link2 size={21} className="text-slate-300"/></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{socialLinks.map(({label,url,icon:Icon})=>url?<a key={label} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"><Icon size={18}/><span className="min-w-0 truncate text-sm font-semibold">{label}</span><Link2 size={14} className="ml-auto text-slate-400"/></a>:<div key={label} className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-4 text-slate-400"><Icon size={18}/><span className="text-sm">{label} not connected</span></div>)}</div></div>
        </section>

        <aside className="space-y-6">
          <div className="card p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Account overview</p><div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Coins" value={Number(profile.coins||0).toLocaleString()}/><Metric label="Available" value={"GH₵"+Number(profile.cash_balance||0).toFixed(2)}/><Metric label="Pending" value={"GH₵"+Number(profile.pending_cash||0).toFixed(2)}/><Metric label="Account" value={profile.account_status}/></div></div>
          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm"><div className="flex items-center justify-between"><div className="rounded-xl bg-white/10 p-2.5"><Sparkles size={19}/></div>{active&&<CheckCircle2 size={19} className="text-emerald-400"/>}</div><p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-slate-400">Creator Program</p><h2 className="mt-1 text-xl font-bold">{active?"Membership active":"Not activated"}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{active?"Your Creator Program membership is active.":"Pay and complete the Creator Program activation process to unlock creator earning features."}</p>{membership?.paid_at&&<p className="mt-4 text-xs text-slate-500">Activated {new Date(membership.paid_at).toLocaleDateString()}</p>}{membership?.payment_reference&&<div className="mt-4 rounded-xl bg-white/5 p-3 font-mono text-[11px] text-slate-400">{membership.payment_reference}</div>}</div>
          <div className="card p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><ShieldCheck size={18}/></div><div><div className="font-semibold">Account protection</div><div className="text-xs text-slate-500">Role: {profile.role}</div></div></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">Email</span><span className="max-w-[55%] truncate font-medium">{email}</span></div>{profile.referral_code&&<div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-500">Referral code</span><span className="font-mono font-semibold">{profile.referral_code}</span></div>}</div>
        </aside>
      </div>

      {editing&&<section className="card mt-6 p-6 md:p-8"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-orange-600">Profile editor</p><h2 className="mt-1 text-xl font-bold">Keep your professional identity current</h2><p className="mt-1 text-sm text-slate-500">These details are stored in your CreatorHub profile and can be used across creator workflows.</p></div><div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Display name"><input className="input mt-2" value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} placeholder="Your full name or brand"/></Field>
        <Field label="Username"><input className="input mt-2" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="yourname"/></Field>
        <Field label="Professional title"><input className="input mt-2" value={form.professional_title} onChange={e=>setForm({...form,professional_title:e.target.value})} placeholder="Content creator, marketer, publisher..."/></Field>
        <Field label="Phone"><input className="input mt-2" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+233..."/></Field>
        <Field label="Country"><input className="input mt-2" value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></Field>
        <Field label="City"><input className="input mt-2" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Accra"/></Field>
        <Field label="Website"><input className="input mt-2" type="url" value={form.website} onChange={e=>setForm({...form,website:e.target.value})} placeholder="https://"/></Field>
        <Field label="YouTube"><input className="input mt-2" type="url" value={form.youtube_url} onChange={e=>setForm({...form,youtube_url:e.target.value})} placeholder="Channel URL"/></Field>
        <Field label="Instagram"><input className="input mt-2" type="url" value={form.instagram_url} onChange={e=>setForm({...form,instagram_url:e.target.value})} placeholder="Profile URL"/></Field>
        <Field label="TikTok"><input className="input mt-2" type="url" value={form.tiktok_url} onChange={e=>setForm({...form,tiktok_url:e.target.value})} placeholder="Profile URL"/></Field>
        <Field label="LinkedIn"><input className="input mt-2" type="url" value={form.linkedin_url} onChange={e=>setForm({...form,linkedin_url:e.target.value})} placeholder="Profile URL"/></Field>
        <div className="md:col-span-2"><Field label="Professional bio"><textarea className="input mt-2 min-h-32" maxLength={1000} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} placeholder="Tell brands and collaborators what you create, who you serve and what makes your work distinctive."/></Field></div>
      </div><div className="mt-6 flex justify-end gap-2"><button className="btn btn-secondary" onClick={()=>setEditing(false)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>} Save profile</button></div></section>}
    </div>
  </AppShell>;
}

function Field({label,children}:{label:string;children:ReactNode}){return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 truncate text-sm font-bold">{value}</div></div>}
