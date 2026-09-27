"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import { ArrowRight, Code2, KeyRound, ShieldCheck, Webhook, Database, Terminal, BookOpen, type LucideIcon } from "lucide-react";
import { SmoothScroll, PublicHeader } from "@/components/PublicExperience";

type Capability = {
  title: string;
  description: string;
  Icon: LucideIcon;
};

const capabilities: Capability[] = [
  { title: "Authentication", description: "Use scoped bearer credentials created from an authenticated CreatorHub account. Keep secrets server-side and never expose them in browser code.", Icon: KeyRound },
  { title: "Campaign operations", description: "Connect approved systems to campaign records and operational workflows through the versioned API surface.", Icon: Database },
  { title: "Webhooks & events", description: "Design integrations around explicit events and verify incoming requests before changing downstream state.", Icon: Webhook },
  { title: "Scoped permissions", description: "Issue the smallest permission set required by each integration and revoke credentials when the integration is retired.", Icon: ShieldCheck },
  { title: "Versioning", description: "Use the /api/v1 namespace for stable integrations and treat response schemas as versioned contracts.", Icon: Code2 },
  { title: "Observability", description: "Store request identifiers, status codes and integration events so failures can be diagnosed without guessing.", Icon: Terminal },
];

const endpoints = [
  ["GET", "/api/v1/campaigns", "Read campaigns available to the authenticated integration."],
  ["GET", "/api/v1/campaigns/:id", "Read one campaign and its operational metadata."],
  ["GET", "/api/v1/creators", "Read creator records available to the integration scope."],
  ["GET", "/api/v1/earnings", "Read authorized earnings records."],
  ["GET", "/api/v1/me", "Read the authenticated integration identity and scope information."],
] as const;

export default function DevelopersPage() {
  return (
    <>
      <SmoothScroll />
      <PublicHeader />
      <main className="bg-slate-50">
        <section className="bg-[#0A1931] px-5 py-24 text-white">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-semibold text-[#FDB913]">Developer platform</p>
              <h1 className="mt-4 text-5xl font-semibold tracking-[-.055em] sm:text-7xl">Build reliable systems around CreatorHub.</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Connect campaign, creator and financial operations to your own software through authenticated, scoped and versioned API access.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/settings/api" className="rounded-full bg-white px-6 py-3 font-semibold text-[#0A1931]">Manage API keys <ArrowRight className="ml-2 inline" size={17} /></Link>
                <Link href="/legal/api-terms" className="rounded-full border border-white/20 px-6 py-3 font-semibold">API Terms</Link>
              </div>
            </div>
            <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85" className="h-[460px] w-full rounded-[32px] object-cover" alt="Developer working with an API" />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Integration architecture</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-.04em]">Everything an integration needs to operate responsibly.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">Authentication, scopes, versioning, events and observability belong together. The API complements the authenticated workspace rather than bypassing it.</p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(({ title, description, Icon }) => (
              <div key={title} className="rounded-[26px] border border-slate-200 bg-white p-7 shadow-sm">
                <Icon size={21} />
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">API reference</p>
                <h2 className="mt-2 text-3xl font-semibold">Versioned endpoints</h2>
              </div>
              <Link href="/settings/api" className="rounded-full bg-[#0A1931] px-5 py-3 text-sm font-semibold text-white">Open API controls</Link>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[90px_1fr_2fr] bg-slate-950 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                <span>Method</span><span>Endpoint</span><span>Purpose</span>
              </div>
              {endpoints.map(([method, endpoint, description]) => (
                <div key={endpoint} className="grid grid-cols-[90px_1fr_2fr] border-t border-slate-200 px-5 py-4 text-sm">
                  <span className="font-bold text-orange-600">{method}</span>
                  <code className="font-mono text-slate-900">{endpoint}</code>
                  <span className="text-slate-600">{description}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-20 lg:grid-cols-3">
            <div className="rounded-[26px] bg-slate-950 p-7 text-slate-100 lg:col-span-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Terminal size={16} /> Authentication example</div>
              <pre className="mt-5 overflow-x-auto rounded-xl bg-black/40 p-5 text-sm leading-7"><code>{"GET /api/v1/me\nAuthorization: Bearer ch_live_...\nAccept: application/json"}</code></pre>
            </div>
            <div className="rounded-[26px] border border-slate-200 bg-white p-7">
              <BookOpen />
              <h3 className="mt-5 font-bold">Integration checklist</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>Use server-side secrets.</li>
                <li>Request minimum scopes.</li>
                <li>Handle 401, 403, 429 and 5xx explicitly.</li>
                <li>Record request identifiers.</li>
                <li>Retry only safe transient operations.</li>
                <li>Rotate credentials regularly.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}