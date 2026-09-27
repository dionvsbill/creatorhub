"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  BarChart3,
  Target,
  WalletCards,
  CheckCircle2,
  FileCheck2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SmoothScroll, PublicHeader } from "@/components/PublicExperience";

type Stage = {
  t: string;
  d: string;
  I: LucideIcon;
};

const stages: Stage[] = [
  {
    t: "Define",
    d: "Set campaign objective, budget, audience, deliverables, requirements and timing.",
    I: Target,
  },
  {
    t: "Select",
    d: "Review creator applications and choose participants using the campaign workflow.",
    I: Users,
  },
  {
    t: "Deliver",
    d: "Track approvals, evidence, revisions and operational status.",
    I: FileCheck2,
  },
  {
    t: "Measure",
    d: "Review activity and performance records connected to the campaign.",
    I: BarChart3,
  },
  {
    t: "Fund",
    d: "Keep funding and payment records tied to the relevant campaign.",
    I: WalletCards,
  },
];

const checklist = [
  "Define measurable objectives",
  "Specify creator eligibility and deliverables",
  "Set budget and funding state",
  "Document evidence requirements",
  "Establish approval and revision expectations",
  "Keep payment and campaign references aligned",
];

export default function Advertise() {
  return (
    <>
      <SmoothScroll />
      <PublicHeader />

      <main className="bg-slate-50">
        <section className="relative overflow-hidden bg-[#0A1931] px-5 py-24 text-white">
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-semibold text-[#FDB913]">Business platform</p>
              <h1 className="mt-4 text-5xl font-semibold tracking-[-.055em] sm:text-7xl">
                Run campaigns with operational control from brief to record.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                Create structured campaigns, manage creator applications,
                coordinate delivery and keep funding and performance records
                connected.
              </p>

              <div className="mt-8 flex gap-3">
                <Link
                  href="/campaigns"
                  className="rounded-full bg-[#FDB913] px-6 py-3 font-bold text-[#0A1931]"
                >
                  Open campaigns{" "}
                  <ArrowRight className="ml-2 inline" size={17} />
                </Link>
                <Link
                  href="/contact"
                  className="rounded-full border border-white/20 px-6 py-3 font-semibold"
                >
                  Talk to us
                </Link>
              </div>
            </div>

            <img
              src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85"
              className="h-[480px] w-full rounded-[32px] object-cover shadow-2xl"
              alt="Advertising team collaborating"
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
              Campaign operating model
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-.04em]">
              Five layers of control.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              The advertiser experience is deeper than publishing a post: it
              coordinates requirements, people, evidence, money and measurement.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {stages.map(({ t, d, I: Icon }) => (
              <div
                key={t}
                className="rounded-[24px] border border-slate-200 bg-white p-6"
              >
                <Icon size={20} />
                <h3 className="mt-5 font-bold">{t}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
                  Before publishing
                </p>
                <h2 className="mt-3 text-3xl font-semibold">
                  A campaign should be explicit before people start work.
                </h2>
              </div>

              <div className="space-y-3">
                {checklist.map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-xl border border-slate-200 p-4"
                  >
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 text-orange-600"
                    />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
