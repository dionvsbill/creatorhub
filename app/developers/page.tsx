import Link from "next/link";
import { ArrowRight, Code2, KeyRound, ShieldCheck } from "lucide-react";import Footer from "@/components/Footer";

export default function DevelopersPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500"><Code2 size={16} /> CreatorHub API</div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">Build with CreatorHub</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">Connect external applications and services to CreatorHub using authenticated API requests.</p>
        </div>
        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6"><KeyRound size={20}/><h2 className="mt-4 font-semibold">API keys</h2><p className="mt-2 text-sm text-slate-600">Create and revoke keys from an authenticated CreatorHub account.</p></div>
          <div className="rounded-2xl border bg-white p-6"><ShieldCheck size={20}/><h2 className="mt-4 font-semibold">Scoped access</h2><p className="mt-2 text-sm text-slate-600">Each key only receives the permissions assigned to it.</p></div>
          <div className="rounded-2xl border bg-white p-6"><Code2 size={20}/><h2 className="mt-4 font-semibold">Versioned API</h2><p className="mt-2 text-sm text-slate-600">Integrations use the stable /api/v1 namespace.</p></div>
        </section>
        <section className="mt-10 rounded-2xl border bg-white p-7">
          <h2 className="text-xl font-semibold">Authentication</h2>
          <p className="mt-2 text-sm text-slate-600">Send the API key as a bearer token on every request.</p>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm text-slate-100"><code>Authorization: Bearer ch_live_...</code></pre>
        </section>
        <section className="mt-6 rounded-2xl border bg-white p-7">
          <h2 className="text-xl font-semibold">Endpoints</h2>
          <div className="mt-5 divide-y">
            <div className="py-4"><div className="font-mono text-sm">GET /api/v1/me</div><p className="mt-1 text-sm text-slate-600">Returns the authenticated account profile. Scope: profile:read.</p></div>
            <div className="py-4"><div className="font-mono text-sm">GET /api/v1/campaigns</div><p className="mt-1 text-sm text-slate-600">Returns active campaigns. Use ?mine=true for campaigns owned by the authenticated advertiser. Scope: campaigns:read.</p></div>
            <div className="py-4"><div className="font-mono text-sm">POST /api/v1/campaigns</div><p className="mt-1 text-sm text-slate-600">Creates a draft advertiser campaign. Scope: campaigns:write.</p></div>
          </div>
        </section>
        <div className="mt-10 rounded-2xl border bg-white p-6"><h2 className="text-xl font-semibold">Operational guidance</h2><p className="mt-2 text-sm leading-6 text-slate-600">Use API credentials only from trusted server-side environments. Handle expired or revoked credentials, respect rate limits and store only the data your integration requires. Key management remains inside the authenticated account workspace.</p></div><div className="mt-6 flex items-center justify-between rounded-2xl border bg-white p-6">
          <div><p className="font-semibold">Developer access</p><p className="text-sm text-slate-600">API key management is available to authenticated accounts.</p></div>
          <Link href="/settings" className="btn btn-primary">Manage keys <ArrowRight size={16}/></Link>
        </div>
      </div>
    </main>
  );
}