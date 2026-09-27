'use client';

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { Copy, KeyRound, Plus, Shield, Trash2 } from "lucide-react";

type ApiKey = { id:string; name:string; key_prefix:string; scopes:string[]; created_at:string; revoked_at:string|null };

export default function ApiSettings() {
  const [keys,setKeys]=useState<ApiKey[]>([]);
  const [name,setName]=useState("My integration");
  const [scopes,setScopes]=useState(["profile:read","campaigns:read"]);
  const [newKey,setNewKey]=useState("");
  const [msg,setMsg]=useState("");

  async function token() {
    const {data}=await supabase().auth.getSession();
    return data.session?.access_token;
  }
  async function load() {
    const t=await token(); if(!t)return;
    const r=await fetch("/api/developer/keys",{headers:{Authorization:`Bearer ${t}`}});
    const j=await r.json(); setKeys(j.data||[]);
  }
  useEffect(()=>{load()},[]);

  async function createKey() {
    const t=await token(); if(!t)return;
    const r=await fetch("/api/developer/keys",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({name,scopes})});
    const j=await r.json();
    if(!r.ok){setMsg(j.error||"Could not create key");return}
    setNewKey(j.api_key); setMsg("API key created. Copy it now; it will not be shown again."); load();
  }

  async function revoke(id:string) {
    const t=await token(); if(!t)return;
    await fetch("/api/developer/keys",{method:"DELETE",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({id})});
    load();
  }

  function toggle(scope:string) {
    setScopes(v=>v.includes(scope)?v.filter(x=>x!==scope):[...v,scope]);
  }

  return <AppShell><div className="mx-auto max-w-4xl">
    <p className="text-sm text-slate-500">Developer</p><h1 className="text-2xl font-bold">API access</h1>
    <p className="mt-2 text-slate-600">Create credentials for applications that need to communicate with CreatorHub.</p>

    <div className="card mt-6 p-6">
      <div className="flex items-center gap-3"><KeyRound size={20}/><div><h2 className="font-semibold">Create API key</h2><p className="text-sm text-slate-500">Secret keys are stored as hashes and shown only once.</p></div></div>
      <input className="input mt-5" value={name} onChange={e=>setName(e.target.value)} placeholder="Key name"/>
      <div className="mt-4 flex flex-wrap gap-2">
        {["profile:read","campaigns:read","campaigns:write"].map(s=><button type="button" key={s} onClick={()=>toggle(s)} className={`rounded-lg border px-3 py-2 text-sm ${scopes.includes(s)?"bg-slate-900 text-white":"bg-white"}`}>{s}</button>)}
      </div>
      <button onClick={createKey} className="btn btn-primary mt-5"><Plus size={16}/>Create key</button>
      {newKey&&<div className="mt-5 rounded-xl border bg-slate-50 p-4"><p className="text-sm font-medium">Copy this key now</p><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-white p-3 text-sm">{newKey}</code><button className="btn btn-secondary" onClick={()=>navigator.clipboard.writeText(newKey)}><Copy size={16}/>Copy</button></div></div>}
      {msg&&<p className="mt-3 text-sm text-slate-600">{msg}</p>}
    </div>

    <div className="card mt-6 p-6">
      <div className="flex items-center gap-2"><Shield size={18}/><h2 className="font-semibold">API keys</h2></div>
      <div className="mt-4 divide-y">{keys.map(k=><div key={k.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-medium">{k.name}</p><p className="text-sm text-slate-500">{k.key_prefix}... · {k.scopes.join(", ")}</p></div>{!k.revoked_at&&<button onClick={()=>revoke(k.id)} className="btn btn-secondary"><Trash2 size={16}/>Revoke</button>}</div>)}</div>
      {!keys.length&&<p className="py-6 text-sm text-slate-500">No API keys have been created.</p>}
    </div>
  </div></AppShell>
}
