"use client";
import { ExternalLink, Play } from "lucide-react";
function youtubeId(value:string){
  try{
    const u=new URL(value);
    if(u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0];
    if(u.hostname.includes("youtube.com")) { const parts=u.pathname.split("/"); const i=parts.findIndex(x=>x==="shorts"||x==="embed"); return u.searchParams.get("v") || (i>=0?parts[i+1]:null); }
  }catch{}
  return null;
}
export default function CampaignMediaPreview({url,type,title="Campaign creative",compact=false}:{url?:string|null;type?:string|null;title?:string;compact?:boolean}){
  if(!url) return <div className={compact?"flex h-20 w-28 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400":"flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400"}>No creative uploaded</div>;
  const yt=type==="YOUTUBE" ? youtubeId(url) : youtubeId(url);
  if(type==="YOUTUBE" || yt) return <div className={compact?"relative overflow-hidden rounded-xl bg-black":"overflow-hidden rounded-2xl border border-slate-200 bg-black"}><div className={compact?"aspect-video w-28":"aspect-video w-full"}><iframe className="h-full w-full" src={yt ? "https://www.youtube.com/embed/"+yt : url} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div></div>;
  if(type==="VIDEO" || /\\.(mp4|webm|mov)(\\?|$)/i.test(url)) return <div className={compact?"overflow-hidden rounded-xl bg-black":"overflow-hidden rounded-2xl border border-slate-200 bg-black"}><video className={compact?"h-20 w-28 object-cover":"max-h-[520px] w-full object-contain"} src={url} controls preload="metadata"/></div>;
  return <div className={compact?"overflow-hidden rounded-xl":"overflow-hidden rounded-2xl border border-slate-200"}><img src={url} alt={title} className={compact?"h-20 w-28 object-cover":"max-h-[520px] w-full object-contain"} /></div>;
}
export function DestinationLink({url,label="Open destination"}:{url?:string|null;label?:string}){
 if(!url) return null;
 return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Play size={15}/>{label}<ExternalLink size={14}/></a>;
}