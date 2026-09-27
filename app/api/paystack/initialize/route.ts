import {NextResponse} from "next/server";import {createClient} from "@supabase/supabase-js";
export async function POST(req:Request){try{
 const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;const serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY;const paystackSecret=process.env.PAYSTACK_SECRET_KEY;
 if(!supabaseUrl||!serviceRoleKey||!paystackSecret)return NextResponse.json({error:"Payment server configuration is incomplete."},{status:503});
 const admin=createClient(supabaseUrl,serviceRoleKey,{auth:{autoRefreshToken:false,persistSession:false}});
 const auth=req.headers.get("authorization")?.replace("Bearer ","");if(!auth)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {data:{user},error:authError}=await admin.auth.getUser(auth);if(authError||!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await req.json();const amount=Number(body.amount);if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:"Invalid amount"},{status:400});
 const reference="CH_"+crypto.randomUUID().replaceAll("-","");const purpose=String(body.purpose||"campaign_funding");const description=body.description||"Payment";
 const {data:created,error:createError}=await admin.from("transactions").insert({user_id:user.id,type:purpose==="creator_program"?"CREATOR_PROGRAM":"CAMPAIGN_FUNDING",amount,currency:"GHS",status:"PENDING",reference,description,metadata:{purpose,initialization_status:"CREATED"}}).select("id").single();
 if(createError||!created)return NextResponse.json({error:createError?.message||"Could not create transaction record."},{status:500});
 try{
  const callback=(process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin)+"/payments/paystack/callback";
  const response=await fetch("https://api.paystack.co/transaction/initialize",{method:"POST",headers:{"Authorization":`Bearer ${paystackSecret}`,"Content-Type":"application/json"},body:JSON.stringify({email:user.email,amount:String(Math.round(amount*100)),currency:"GHS",reference,callback_url:callback,metadata:{user_id:user.id,purpose}}});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.status){await admin.from("transactions").update({status:"FAILED",failure_reason:data?.message||"Paystack initialization failed",gateway_response:data?.message||null,metadata:{purpose,initialization_status:"FAILED",initialization_response:data||null}}).eq("id",created.id);return NextResponse.json({error:data?.message||"Paystack initialization failed",reference},{status:400});}
  await admin.from("transactions").update({metadata:{purpose,initialization_status:"INITIALIZED",authorization_url:data.data?.authorization_url||null}}).eq("id",created.id);
  return NextResponse.json({authorization_url:data.data.authorization_url,reference});
 }catch(error){
  await admin.from("transactions").update({status:"FAILED",failure_reason:"Network or gateway initialization error",metadata:{purpose,initialization_status:"FAILED"}}).eq("id",created.id);
  return NextResponse.json({error:"Payment initialization failed",reference},{status:500});
 }
}catch(e){return NextResponse.json({error:"Payment initialization failed"},{status:500})}}