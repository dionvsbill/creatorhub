"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Bell, Check, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Notifications(){
  const [rows,setRows]=useState<any[]>([]);
  const [expanded,setExpanded]=useState<string|null>(null);
  const load=async()=>{const s=supabase();const {data:{user}}=await s.auth.getUser();if(!user)return;const {data}=await s.from("notifications").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);setRows(data||[])};
  useEffect(()=>{load();const h=(e:Event)=>{const p=(e as CustomEvent).detail;if(!p||p.table==="notifications")load()};window.addEventListener("creatorhub:db-change",h);return()=>window.removeEventListener("creatorhub:db-change",h)},[]);
  const read=async(id:string)=>{await supabase().from("notifications").update({read_at:new Date().toISOString()}).eq("id",id);load()};
  return <AppShell><div className="mx-auto max-w-4xl"><p className="text-sm text-slate-500">Inbox</p><h1 className="text-2xl font-bold">Notifications</h1><p className="mt-1 text-sm text-slate-500">Live updates from your account, campaigns, payments and Creator Program.</p>
    <div className="card mt-6 divide-y divide-slate-100">{rows.map(r=><div key={r.id} className={!r.read_at?"bg-orange-50/40":""}><button className="flex w-full items-start gap-4 p-5 text-left" onClick={()=>{setExpanded(expanded===r.id?null:r.id);if(!r.read_at)read(r.id)}}><Bell size={18} className="mt-0.5 shrink-0 text-orange-600"/><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><div className="text-sm font-semibold">{r.title}</div>{!r.read_at&&<span className="h-1.5 w-1.5 rounded-full bg-orange-600"/>}</div><div className={expanded===r.id?"mt-1 text-sm text-slate-600":"mt-1 line-clamp-2 text-sm text-slate-600"}>{r.body}</div><div className="mt-2 text-xs text-slate-400">{new Date(r.created_at).toLocaleString()} · {r.type||"Account update"}</div></div>{expanded===r.id?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button>{expanded===r.id&&<div className="border-t border-slate-100 bg-white px-5 pb-5 pl-12"><div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{r.body}</div><div className="mt-3 flex justify-end">{r.read_at&&<span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check size={13}/>Read {new Date(r.read_at).toLocaleString()}</span>}</div></div>}</div>)}{!rows.length&&<div className="p-10 text-center text-sm text-slate-500">No notifications.</div>}</div>
  </div></AppShell>
}