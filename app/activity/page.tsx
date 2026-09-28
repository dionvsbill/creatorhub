"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { Activity as ActivityIcon, ChevronDown, ChevronUp } from "lucide-react";

export default function Activity(){
  const [rows,setRows]=useState<any[]>([]);
  const [expanded,setExpanded]=useState<string|null>(null);
  const load=async()=>{const s=supabase();const {data:{user}}=await s.auth.getUser();if(!user)return;const {data}=await s.from("audit_logs").select("id,action,entity_type,entity_id,metadata,created_at").eq("actor_id",user.id).order("created_at",{ascending:false}).limit(100);setRows(data||[])};
  useEffect(()=>{load();const h=()=>load();window.addEventListener("creatorhub:db-change",h);return()=>window.removeEventListener("creatorhub:db-change",h)},[]);
  return <AppShell><div className="mx-auto max-w-5xl"><p className="text-sm text-slate-500">Account</p><h1 className="text-2xl font-bold">Activity</h1><p className="mt-1 text-sm text-slate-500">A live, expandable record of actions performed on your account.</p><section className="card mt-6 divide-y divide-slate-100">{rows.map(r=><div key={r.id}><button className="flex w-full items-start gap-4 p-5 text-left hover:bg-slate-50" onClick={()=>setExpanded(expanded===String(r.id)?null:String(r.id))}><ActivityIcon size={18} className="mt-0.5 shrink-0 text-orange-600"/><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{r.action.replaceAll("_"," ")}</div><div className="mt-1 text-xs text-slate-500">{r.entity_type} · {r.entity_id||"—"} · {new Date(r.created_at).toLocaleString()}</div></div>{expanded===String(r.id)?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button>{expanded===String(r.id)&&<div className="border-t border-slate-100 bg-slate-50 px-5 py-4 pl-12"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Full details</div><pre className="mt-2 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-xs leading-5 text-slate-600">{JSON.stringify({id:r.id,action:r.action,entity_type:r.entity_type,entity_id:r.entity_id,metadata:r.metadata,created_at:r.created_at},null,2)}</pre></div>}</div>)}{!rows.length&&<div className="p-10 text-center text-sm text-slate-500">No account activity has been recorded yet.</div>}</section></div></AppShell>
}