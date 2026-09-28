"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {Users,Megaphone,WalletCards,AlertTriangle,ShieldCheck,ArrowUpRight,Clock3,CircleDollarSign,CheckCircle2} from "lucide-react";
import {supabase} from "@/lib/supabase";

export default function Admin(){
 const [data,setData]=useState<any>({users:0,campaigns:0,pendingReview:0,pendingFunding:0,funded:0,fees:0,funds:0,withdrawals:0,audits:0,recent:[]});
 const [ready,setReady]=useState(false);
 const load=async()=>{
  const s=supabase();
  const [u,c,pr,pf,paid,w,a,recent]=await Promise.all([
   s.from("profiles").select("id",{count:"exact",head:true}),
   s.from("campaigns").select("id",{count:"exact",head:true}),
   s.from("campaigns").select("id",{count:"exact",head:true}).eq("status","PENDING_REVIEW"),
   s.from("campaigns").select("id",{count:"exact",head:true}).eq("status","PENDING_FUNDING"),
   s.from("campaigns").select("platform_fee,funded_amount").eq("funding_status","PAID"),
   s.from("transactions").select("id",{count:"exact",head:true}).eq("type","WITHDRAWAL").eq("status","PENDING"),
   s.from("audit_logs").select("id",{count:"exact",head:true}).gte("created_at",new Date(Date.now()-86400000).toISOString()),
   s.from("campaigns").select("id,title,status,budget,platform_fee,funding_status,created_at").order("created_at",{ascending:false}).limit(6)
  ]);
  const paidRows=paid.data||[];
  setData({users:u.count||0,campaigns:c.count||0,pendingReview:pr.count||0,pendingFunding:pf.count||0,funded:paidRows.reduce((n,x)=>n+Number(x.funded_amount||0),0),fees:paidRows.reduce((n,x)=>n+Number(x.platform_fee||0),0),funds:paidRows.reduce((n,x)=>n+Number(x.budget||0),0),withdrawals:w.count||0,audits:a.count||0,recent:recent.data||[]});
  setReady(true);
 };
 useEffect(()=>{load();const h=()=>load();window.addEventListener("creatorhub:db-change",h);return()=>window.removeEventListener("creatorhub:db-change",h)},[]);
 return <AppShell admin><div className="mx-auto max-w-7xl">
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-sm text-slate-500">Administration</p><h1 className="text-2xl font-bold">Control center</h1><p className="mt-1 text-sm text-slate-500">This is the operational view of CreatorHub: money, campaigns, users and decisions that need attention.</p></div><Link href="/admin/campaigns" className="btn btn-secondary"><Megaphone size={16}/>Open campaign operations</Link></div>
  <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><AdminStat icon={Users} label="Registered users" value={ready?String(data.users):"—"}/><AdminStat icon={Megaphone} label="Campaigns" value={ready?String(data.campaigns):"—"}/><AdminStat icon={CircleDollarSign} label="Campaign funds paid" value={ready?money(data.funded):"—"}/><AdminStat icon={WalletCards} label="Platform fees earned" value={ready?money(data.fees):"—"}/></div>
  <div className="mt-5 grid gap-4 md:grid-cols-3"><ActionStat href="/admin/campaigns" icon={Clock3} label="Campaigns awaiting review" value={data.pendingReview}/><ActionStat href="/admin/campaigns" icon={WalletCards} label="Approved, awaiting funding" value={data.pendingFunding}/><ActionStat href="/admin/finance" icon={AlertTriangle} label="Pending withdrawals" value={data.withdrawals}/></div>
  <div className="mt-7 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
   <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 p-5"><div><h2 className="font-semibold">Campaign operations</h2><p className="mt-1 text-xs text-slate-500">Open a record to see the brief, budget, platform fee, funding state and creator activity.</p></div><Link href="/admin/campaigns" className="text-sm font-semibold text-orange-600">View all</Link></div><div className="divide-y divide-slate-100">{data.recent.map((c:any)=><Link href={"/admin/campaigns/"+c.id} key={c.id} className="flex flex-col gap-3 p-5 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold">{c.title}</div><div className="mt-1 text-xs text-slate-500">{String(c.status).replaceAll("_"," ")} · {c.funding_status||"REQUIRED"} · Created {new Date(c.created_at).toLocaleDateString()}</div></div><div className="flex items-center gap-5 text-sm"><div><div className="text-[11px] text-slate-400">Budget</div><div className="font-semibold">{money(c.budget)}</div></div><div><div className="text-[11px] text-slate-400">Platform fee</div><div className="font-semibold">{money(c.platform_fee)}</div></div><ArrowUpRight size={16}/></div></Link>)}{!data.recent.length&&<div className="p-10 text-center text-sm text-slate-500">No campaigns have been created yet.</div>}</div></section>
   <section className="space-y-5"><div className="card p-5"><div className="flex items-center gap-2"><ShieldCheck className="text-emerald-600" size={19}/><h2 className="font-semibold">Financial picture</h2></div><div className="mt-5 space-y-4 text-sm"><Row label="Campaign budget funded" value={money(data.funds)}/><Row label="Platform fees earned" value={money(data.fees)}/><Row label="Funding transactions" value={ready?String(data.funded>0?1:0):"—"}/></div><Link href="/admin/finance" className="mt-5 flex items-center justify-between rounded-xl border p-3 text-sm font-semibold hover:bg-slate-50">Open finance <ArrowUpRight size={15}/></Link></div><div className="card p-5"><div className="flex items-center gap-2"><CheckCircle2 className="text-emerald-600" size={19}/><h2 className="font-semibold">System status</h2></div><div className="mt-4 text-sm text-slate-600">Database connected. Role-based administration enabled. {data.audits} audit events recorded in the last 24 hours.</div><Link href="/admin/audit" className="mt-4 inline-flex text-sm font-semibold text-orange-600">Inspect audit log <ArrowUpRight size={15} className="ml-1"/></Link></div></section>
  </div>
 </div></AppShell>
}
function money(v:any){return `GH₵${Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`}
function Row({label,value}:{label:string;value:string}){return <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{label}</span><span className="font-semibold">{value}</span></div>}
function AdminStat({icon:Icon,label,value}:{icon:any;label:string;value:string}){return <div className="card p-5"><Icon size={19} className="text-orange-600"/><div className="mt-4 text-2xl font-bold">{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>}
function ActionStat({href,icon:Icon,label,value}:{href:string;icon:any;label:string;value:number}){return <Link href={href} className="card flex items-center justify-between p-5 hover:border-orange-200"><div className="flex items-center gap-3"><Icon size={19} className="text-orange-600"/><span className="text-sm font-semibold">{label}</span></div><span className="text-2xl font-bold">{value}</span></Link>}
