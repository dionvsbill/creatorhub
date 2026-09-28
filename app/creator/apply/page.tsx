"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Paperclip, Send } from "lucide-react";

export default function CreatorApply() {
  const [form,setForm]=useState({channel_url:"",niche:"",bio:"",audience_size:""});
  const [files,setFiles]=useState<File[]>([]);
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);
  const [existing,setExisting]=useState<any>(null);

  useEffect(()=>{(async()=>{const {data:{user}}=await supabase().auth.getUser();if(!user)return;const {data}=await supabase().from("creator_applications").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();if(data){setExisting(data);setForm({channel_url:data.channel_url||"",niche:data.niche||"",bio:data.bio||"",audience_size:data.audience_size?String(data.audience_size):""})}})()},[]);

  const submit=async(e:FormEvent)=>{
    e.preventDefault(); setSaving(true); setMessage("");
    const s=supabase();
    const {data:{user}}=await s.auth.getUser();
    if(!user){setMessage("Please sign in first.");setSaving(false);return;}
    const {data:membership}=await s.from("creator_memberships").select("status").eq("user_id",user.id).maybeSingle();
    if(membership?.status!=="ACTIVE"){setMessage("Activate your Creator Program membership before applying.");setSaving(false);return;}
    const urls:string[]=[];
    for(const file of files){
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
      const path=`${user.id}/creator-applications/${crypto.randomUUID()}-${safe}`;
      const up=await s.storage.from("support-attachments").upload(path,file,{upsert:false,contentType:file.type});
      if(up.error){setMessage(up.error.message);setSaving(false);return;}
      urls.push(path);
    }
    const payload={user_id:user.id,channel_url:form.channel_url,niche:form.niche,bio:form.bio,
      audience_size:Number(form.audience_size)||0,status:"PENDING",attachment_urls:urls.length?urls:(existing?.attachment_urls||[])};
    const {error}=existing
      ? await s.from("creator_applications").update(payload).eq("id",existing.id)
      : await s.from("creator_applications").insert(payload);
    if(error){setMessage(error.message);setSaving(false);return;}
    await s.from("profiles").update({creator_status:"PENDING"}).eq("id",user.id);
    setExisting({...existing,...payload});
    setMessage(existing ? "Your creator application has been resubmitted for review." : "Your creator application has been submitted for review.");
    setSaving(false);
  };

  return <AppShell><div className="mx-auto max-w-3xl">
    <Link href="/creator" className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16}/>Creator workspace</Link>
    <div className="mt-5 overflow-hidden rounded-3xl bg-[#0A1931] p-7 text-white">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#FDB913]">Creator Program</p>
      <h1 className="mt-2 text-3xl font-semibold">Creator application</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Tell CreatorHub about your audience, content niche and channels. An administrator will review your application.</p>
    </div>
    <form onSubmit={submit} className="card mt-6 space-y-5 p-6">
      <label className="block text-sm font-medium">Primary channel URL<input required type="url" className="input mt-2" value={form.channel_url} onChange={e=>setForm({...form,channel_url:e.target.value})} placeholder="https://youtube.com/@yourchannel"/></label>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-medium">Content niche<input required className="input mt-2" value={form.niche} onChange={e=>setForm({...form,niche:e.target.value})} placeholder="Technology, beauty, comedy..."/></label>
        <label className="block text-sm font-medium">Audience size<input type="number" min="0" className="input mt-2" value={form.audience_size} onChange={e=>setForm({...form,audience_size:e.target.value})}/></label>
      </div>
      <label className="block text-sm font-medium">Professional creator bio<textarea required className="input mt-2 min-h-32" value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} placeholder="Describe your content, audience and experience."/></label>
      <label className="block text-sm font-medium">Supporting files<span className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600"><Paperclip size={17}/>{files.length?files.length+" file(s) selected":"Attach portfolio, verification or supporting documents"}<input type="file" multiple accept="image/*,.pdf,.txt,.doc,.docx" className="hidden" onChange={e=>setFiles(Array.from(e.target.files||[]))}/></span></label>
      {message&&<div className="rounded-xl bg-slate-50 p-4 text-sm">{message}</div>}
      <div className="flex justify-end"><button disabled={saving} className="btn btn-primary"><Send size={16}/>{saving?"Submitting...":"Submit application"}</button></div>
    </form>
  </div></AppShell>;
}
