import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import crypto from "crypto";

function hash(v:string){return crypto.createHash("sha256").update(v).digest("hex")}

export async function POST(request:Request){
  const cookieStore=cookies();
  const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{
    getAll(){return cookieStore.getAll()},
    setAll(items){try{items.forEach(({name,value,options})=>cookieStore.set(name,value,options))}catch{}}
  }});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({ok:false},{status:401});
  let body:any={};try{body=await request.json()}catch{}
  const forwarded=request.headers.get("x-forwarded-for")||request.headers.get("x-real-ip")||"";
  const ip=forwarded.split(",")[0].trim()||"unknown";
  const ua=request.headers.get("user-agent")||"unknown";
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}});
  const {error}=await admin.from("user_security_events").insert({
    user_id:user.id,event_type:"SESSION_HEARTBEAT",
    ip_hash:hash(ip),ip_address:ip==="unknown"?null:ip,
    device_hash:body.deviceHash||null,user_agent_hash:hash(ua),
    metadata:{path:body.path||null,language:body.language||null,platform:body.platform||null}
  });
  if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
  return NextResponse.json({ok:true});
}
