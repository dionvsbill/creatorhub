"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {supabase} from "@/lib/supabase";
import {ArrowLeft,Megaphone,WalletCards,Link2,Info,ShieldCheck,Calculator} from "lucide-react";

const kinds=["CREATOR","UGC","SPONSORED_CONTENT","TRAFFIC","AFFILIATE","GOOGLE_ADS"];

export default function NewCampaign(){
 const router=useRouter();
 const [feeRate,setFeeRate]=useState(5);
 const [f,setF]=useState({title:"",description:"",kind:"CREATOR",budget:"",youtube_url:"",landing_url:"",starts_at:"",ends_at:""});
 const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
 const set=(k:string,v:string)=>setF(x=>({...x,[k]:v}));
 useEffect(()=>{supabase().from("platform_settings").select("value_numeric").eq("key","campaign_platform_fee_rate").maybeSingle().then(({data})=>{if(data?.value_numeric!=null)setFeeRate(Number(data.value_numeric))})},[]);
 const budget=Number(f.budget)||0;
 const platformFee=useMemo(()=>budget*feeRate/100,[budget,feeRate]);
 const total=budget+platformFee;
 const submit=async(e:FormEvent)=>{
  e.preventDefault(); setLoading(true); setError("");
  const s=supabase(); const {data:{user}}=await s.auth.getUser();
  if(!user){router.push("/auth/sign-in");return}
  if(!f.title.trim()||budget<=0){setError("Enter a campaign title and a budget greater than zero.");setLoading(false);return}
  const {data,error}=await s.from("campaigns").insert({advertiser_id:user.id,title:f.title.trim(),description:f.description.trim(),kind:f.kind,status:"PENDING_REVIEW",budget,platform_fee:platformFee,spent:0,currency:"GHS",youtube_url:f.youtube_url||null,landing_url:f.landing_url||null,starts_at:f.starts_at?new Date(f.starts_at).toISOString():null,ends_at:f.ends_at?new Date(f.ends_at).toISOString():null}).select("id").single();
  if(error){setError(error.message);setLoading(false);return}
  await s.from("audit_logs").insert({actor_id:user.id,action:"CAMPAIGN_SUBMITTED_FOR_REVIEW",entity_type:"campaign",entity_id:data.id,metadata:{title:f.title,kind:f.kind,budget,platform_fee:platformFee,total_funding:total}});
  router.push("/advertiser/campaigns/"+data.id);
 };
 return <AppShell><div className="mx-auto max-w-5xl">
  <Link href="/advertiser/campaigns" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/>Campaign workspace</Link>
  <div className="mt-5 rounded-3xl bg-[#0A1931] p-8 text-white"><p className="text-xs font-bold uppercase tracking-widest text-[#FDB913]">Advertiser workspace</p><h1 className="mt-2 text-3xl font-bold">Create a campaign</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Tell creators exactly what you need. CreatorHub reviews the campaign before it becomes available, then you fund the approved campaign.</p></div>
  <form onSubmit={submit} className="card mt-6 space-y-6 p-6">
   <div className="grid gap-5 md:grid-cols-2">
    <Field label="Campaign title"><input required className="input" value={f.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Accra Summer Product Launch"/></Field>
    <Field label="Campaign type"><select className="input" value={f.kind} onChange={e=>set("kind",e.target.value)}>{kinds.map(k=><option key={k}>{k}</option>)}</select></Field>
   </div>
   <Field label="Campaign brief"><textarea required className="input min-h-40" value={f.description} onChange={e=>set("description",e.target.value)} placeholder="Objective, target audience, deliverables, creator requirements, evidence and instructions"/></Field>
   <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div className="flex items-start gap-3"><Calculator size={19} className="mt-0.5 text-orange-600"/><div><h2 className="font-bold">Campaign funding</h2><p className="mt-1 text-sm text-slate-500">You set the campaign budget. CreatorHub calculates its platform fee automatically.</p></div></div>
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      <Field label="Campaign budget (GHS)"><input required type="number" min="1" step="0.01" className="input bg-white" value={f.budget} onChange={e=>set("budget",e.target.value)} placeholder="500"/></Field>
      <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-xs font-semibold text-slate-500">CreatorHub platform fee</div><div className="mt-2 text-xl font-bold">GH₵{platformFee.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div><div className="mt-1 text-xs text-slate-500">{feeRate}% of campaign budget</div></div>
      <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-xs font-semibold text-slate-500">Total funding required</div><div className="mt-2 text-xl font-bold">GH₵{total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div><div className="mt-1 text-xs text-slate-500">Budget + platform fee</div></div>
    </div>
    <div className="mt-4 flex gap-2 text-xs text-slate-500"><Info size={15} className="mt-0.5 shrink-0"/>The fee is set by CreatorHub, not by the advertiser. The exact rate and amount are shown before funding.</div>
   </div>
   <div className="grid gap-4 md:grid-cols-2">
    <Field label="Start"><input type="datetime-local" className="input" value={f.starts_at} onChange={e=>set("starts_at",e.target.value)}/></Field>
    <Field label="End"><input type="datetime-local" className="input" value={f.ends_at} onChange={e=>set("ends_at",e.target.value)}/></Field>
    <Field label="YouTube URL (optional)"><div className="relative"><Link2 size={16} className="absolute left-3 top-3 text-slate-400"/><input className="input pl-9" value={f.youtube_url} onChange={e=>set("youtube_url",e.target.value)} placeholder="https://youtube.com/..."/></div></Field>
    <Field label="Landing URL (optional)"><input className="input" value={f.landing_url} onChange={e=>set("landing_url",e.target.value)} placeholder="https://example.com"/></Field>
   </div>
   {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
   <div className="flex items-center justify-between gap-3 border-t pt-5"><div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16}/>Admin review is required before funding and publishing.</div><div className="flex gap-2"><Link href="/advertiser/campaigns" className="btn btn-secondary">Cancel</Link><button disabled={loading} className="btn btn-primary"><Megaphone size={16}/>{loading?"Submitting...":"Submit campaign for review"}</button></div></div>
  </form>
  <div className="card mt-5 flex gap-3 p-5 text-sm text-slate-600"><WalletCards size={18} className="text-orange-600"/><span>After approval, the campaign record will show its funding requirement, platform fee, payment status, creator applications and delivery progress.</span></div>
 </div></AppShell>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>}
