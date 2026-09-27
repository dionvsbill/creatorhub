import {NextResponse} from "next/server";import {createClient} from "@supabase/supabase-js";
export async function POST(req:Request,{params}:{params:{id:string}}){try{
 const auth=req.headers.get("authorization")?.replace("Bearer ","");if(!auth)return NextResponse.json({error:"Unauthorized"},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return NextResponse.json({error:"Server is not configured."},{status:503});
 const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});const {data:{user}}=await admin.auth.getUser(auth);if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {data:actor}=await admin.from("profiles").select("role").eq("id",user.id).single();if(actor?.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});
 const body=await req.json().catch(()=>({}));const status=body.status;const reason=String(body.reason||"Administrative transaction resolution");
 if(!["COMPLETED","FAILED"].includes(status))return NextResponse.json({error:"Invalid status"},{status:400});
 const {data:tx}=await admin.from("transactions").select("*").eq("id",params.id).single();if(!tx||tx.status!=="PENDING")return NextResponse.json({error:"Transaction is not pending"},{status:409});
 if(tx.type==="WITHDRAWAL"){const {data:p}=await admin.from("profiles").select("cash_balance,pending_cash").eq("id",tx.user_id).single();const pending=Number(p?.pending_cash||0),cash=Number(p?.cash_balance||0),amount=Number(tx.amount);if(status==="COMPLETED")await admin.from("profiles").update({pending_cash:Math.max(0,pending-amount)}).eq("id",tx.user_id);else await admin.from("profiles").update({pending_cash:Math.max(0,pending-amount),cash_balance:cash+amount}).eq("id",tx.user_id)}
 const now=new Date().toISOString();const {error}=await admin.from("transactions").update({status,resolved_at:now,resolved_by:user.id,failure_reason:status==="FAILED"?reason:null,updated_at:now}).eq("id",tx.id);if(error)return NextResponse.json({error:error.message},{status:500});
 await admin.from("audit_logs").insert({actor_id:user.id,action:"TRANSACTION_RESOLVED",entity_type:"transaction",entity_id:tx.id,metadata:{status,type:tx.type,amount:tx.amount,reason}});
 return NextResponse.json({success:true});
}catch(e){return NextResponse.json({error:"Transaction resolution failed"},{status:500})}}