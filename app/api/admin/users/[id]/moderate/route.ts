import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

async function adminId(){
 const c=cookies(); const s=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll(){return c.getAll()},setAll(){}}});
 const {data:{user}}=await s.auth.getUser(); return user?.id||null;
}
export async function POST(request:Request,{params}:{params:{id:string}}){
 const actor=await adminId(); if(!actor)return NextResponse.json({error:"Authentication required"},{status:401});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:ap}=await db.from("profiles").select("role,is_superadmin").eq("id",actor).single();
 if(ap?.role!=="ADMIN")return NextResponse.json({error:"Admin access required"},{status:403});
 const {data:target}=await db.from("profiles").select("id,role,is_superadmin").eq("id",params.id).single();
 if(!target)return NextResponse.json({error:"User not found"},{status:404});
 if(target.is_superadmin)return NextResponse.json({error:"The superadmin account is protected."},{status:403});
 let body:any={};try{body=await request.json()}catch{}
 const action=body.action; const reason=String(body.reason||"Terms of Service or Community Guidelines violation").slice(0,500);
 if(action==="suspend"){
   await db.from("profiles").update({account_status:"SUSPENDED",suspended_at:new Date().toISOString(),banned_until:null,banned_permanently:false,moderation_note:reason}).eq("id",params.id);
   await db.auth.admin.updateUserById(params.id,{ban_duration:"876000h"});
   await db.from("user_bans").insert({user_id:params.id,ban_type:"TEMPORARY",reason,created_by:actor});
 } else if(action==="temporary_ban"){
   const hours=Math.max(1,Math.min(876000,Number(body.hours)||24));
   const expires=new Date(Date.now()+hours*3600000).toISOString();
   await db.from("profiles").update({account_status:"SUSPENDED",suspended_at:new Date().toISOString(),banned_until:expires,banned_permanently:false,moderation_note:reason}).eq("id",params.id);
   await db.auth.admin.updateUserById(params.id,{ban_duration:hours+"h"});
   await db.from("user_bans").insert({user_id:params.id,ban_type:"TEMPORARY",reason,expires_at:expires,created_by:actor});
 } else if(action==="permanent_ban"){
   await db.from("profiles").update({account_status:"SUSPENDED",suspended_at:new Date().toISOString(),banned_until:null,banned_permanently:true,moderation_note:reason}).eq("id",params.id);
   await db.auth.admin.updateUserById(params.id,{ban_duration:"876000h"});
   await db.from("user_bans").insert({user_id:params.id,ban_type:"PERMANENT",reason,created_by:actor});
 } else if(action==="reactivate"){
   await db.from("profiles").update({account_status:"ACTIVE",suspended_at:null,banned_until:null,banned_permanently:false,moderation_note:null}).eq("id",params.id);
   await db.auth.admin.updateUserById(params.id,{ban_duration:"none"});
   await db.from("user_bans").update({revoked_at:new Date().toISOString(),revoked_by:actor}).eq("user_id",params.id).is("revoked_at",null);
 } else if(action==="delete"){
   const result=await db.auth.admin.deleteUser(params.id,false);
   if(result.error)return NextResponse.json({error:result.error.message},{status:400});
 } else if(action==="soft_delete"){
   const result=await db.auth.admin.deleteUser(params.id,true);
   if(result.error)return NextResponse.json({error:result.error.message},{status:400});
   await db.from("profiles").update({account_status:"DELETED",moderation_note:reason}).eq("id",params.id);
 } else return NextResponse.json({error:"Unknown moderation action"},{status:400});
 await db.from("audit_logs").insert({actor_id:actor,action:"USER_MODERATION",entity_type:"profile",entity_id:params.id,metadata:{action,reason}});
 return NextResponse.json({ok:true});
}
