import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function clean(v:string){return v.toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,18)}

export async function GET(request:Request){
  const url=new URL(request.url);
  const raw=url.searchParams.get("name")||"creator";
  const base=clean(raw.replace(/\s+/g,""))||"creator";
  const variants=new Set<string>();
  const seeds=[base,base+"official",base+"gh",base+"creator",base+"media",base+"tv",base+"hub"];
  for(const s of seeds) variants.add(s.slice(0,20));
  for(let i=1;i<=30;i++) variants.add((base+String(i)).slice(0,20));
  for(let i=0;i<12;i++) variants.add((base+"_"+Math.floor(100+i*137)).slice(0,20));
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}});
  const list=[...variants].filter(x=>x.length>=3);
  const {data}=await admin.from("profiles").select("username").in("username",list);
  const taken=new Set((data||[]).map(x=>String(x.username).toLowerCase()));
  return NextResponse.json({suggestions:list.filter(x=>!taken.has(x)).slice(0,12)});
}
