"use client";
import {useEffect,useState} from "react";
import AppShell from "@/components/AppShell";
import {BarChart3,Users,ShieldAlert,WalletCards,Activity} from "lucide-react";
import {supabase} from "@/lib/supabase";

export default function Insights(){
 const [stats,setStats]=useState<any>(null);
 useEffect(()=>{(async()=>{const s=supabase();const [{count:users},{count:active},{count:suspended},{count:campaigns},{count:transactions},{count:complaints}]=await Promise.all([
 s.from("profiles").select("id",{count:"exact",head:true}),
 s.from("profiles").select("id",{count:"exact",head:true}).eq("account_status","ACTIVE"),
 s.from("profiles").select("id",{count:"exact",head:true}).eq("account_status","SUSPENDED"),
 s.from("campaigns").select("id",{count:"exact",head:true}),
 s.from("transactions").select("id",{count:"exact",head:true}),
 s.from("payment_complaints").select("id",{count:"exact",head:true})
 ]);setStats({users:users||0,active:active||0,suspended:suspended||0,campaigns:campaigns||0,transactions:transactions||0,complaints:complaints||0})})()},[]);
 if(!stats)return <AppShell admin><div className="p-10 text-center">Loading insights...</div></AppShell>;
 const total=Math.max(stats.users,1); const activePct=Math.round(stats.active/total*100); const suspendedPct=Math.round(stats.suspended/total*100);
 return <AppShell admin><div className="mx-auto max-w-7xl"><p className="text-sm text-slate-500">Administration</p><h1 className="text-2xl font-bold">Platform insights</h1><p className="mt-1 text-sm text-slate-500">Operational visibility across users, campaigns, payments and trust & safety.</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[[Users,"Total users",stats.users],[Activity,"Active users",stats.active],[ShieldAlert,"Suspended users",stats.suspended],[BarChart3,"Campaigns",stats.campaigns],[WalletCards,"Transactions",stats.transactions],[ShieldAlert,"Payment complaints",stats.complaints]].map(([Icon,label,value]:any)=><div className="card p-5" key={label}><Icon size={19} className="text-orange-600"/><div className="mt-4 text-3xl font-bold">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>)}</div><div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="card p-6"><h2 className="font-bold">Account status</h2><div className="mt-6 space-y-4"><Bar label="Active" value={activePct}/><Bar label="Suspended" value={suspendedPct}/><Bar label="Other" value={Math.max(0,100-activePct-suspendedPct)}/></div></div><div className="card p-6"><h2 className="font-bold">Operational snapshot</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><Mini label="User growth base" value={String(stats.users)}/><Mini label="Campaign records" value={String(stats.campaigns)}/><Mini label="Financial records" value={String(stats.transactions)}/><Mini label="Payment complaints" value={String(stats.complaints)}/></div></div></div></div></AppShell>
}
function Bar({label,value}:{label:string;value:number}){return <div><div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{value}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{width:value+"%"}}/></div></div>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-2xl border bg-slate-50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-lg font-bold">{value}</div></div>}
