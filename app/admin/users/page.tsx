'use client';

import { useEffect, useState } from "react";
import { Check, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

const perms = [
  ["users", "Users"],
  ["campaigns", "Campaigns"],
  ["creators", "Creators"],
  ["memberships", "Memberships"],
  ["referrals", "Referrals"],
  ["finance", "Finance"],
  ["api", "API"],
  ["integrations", "Integrations"],
  ["notifications", "Notifications"],
  ["audit", "Audit"],
  ["monitoring", "Monitoring"],
  ["support", "Support"],
  ["appeals", "Appeals"],
] as const;

export default function AdminUsers() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [canManage, setCanManage] = useState(false);

  const load = async () => {
    const s = supabase();
    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) {
      location.href = "/auth/sign-in";
      return;
    }

    const { data: p } = await s
      .from("profiles")
      .select("role,is_superadmin,admin_permissions")
      .eq("id", user.id)
      .single();

    if (p?.role !== "ADMIN") {
      setAllowed(false);
      return;
    }

    setAllowed(true);
    setCanManage(p?.is_superadmin === true);

    const { data } = await s
      .from("profiles")
      .select(
        "id,display_name,username,role,is_superadmin,admin_permissions,creator_status,coins,cash_balance,account_status,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    setRows(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (r: any) => {
    if (r.is_superadmin) return;

    await supabase()
      .from("profiles")
      .update({
        account_status: r.account_status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
        suspended_at: r.account_status === "SUSPENDED" ? null : new Date().toISOString(),
      })
      .eq("id", r.id);

    load();
  };

  const changeRole = async (r: any) => {
    if (r.is_superadmin || !canManage) return;

    await supabase()
      .from("profiles")
      .update({
        role: r.role === "ADMIN" ? "USER" : "ADMIN",
        admin_permissions: r.role === "ADMIN" ? [] : ["campaigns"],
      })
      .eq("id", r.id);

    load();
  };

  const setPerm = async (r: any, permission: string) => {
    if (r.is_superadmin || !canManage) return;

    const current = r.admin_permissions || [];
    const next = current.includes(permission)
      ? current.filter((x: string) => x !== permission)
      : [...current, permission];

    await supabase().from("profiles").update({ admin_permissions: next }).eq("id", r.id);
    load();
  };

  const filtered = rows.filter(
    (r) =>
      (r.display_name || "").toLowerCase().includes(q.toLowerCase()) ||
      (r.role || "").toLowerCase().includes(q.toLowerCase()) ||
      (r.username || "").toLowerCase().includes(q.toLowerCase())
  );

  if (allowed === false) {
    return (
      <AppShell>
        <div className="card p-10 text-center">
          <ShieldCheck className="mx-auto text-red-500" />
          <h1 className="mt-3 font-semibold">Access restricted</h1>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell admin>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-slate-500">Administration</p>
            <h1 className="text-2xl font-bold">Admin users & permissions</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              The original superadmin is permanently protected. Other administrators can be limited to specific operational areas.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search users"
              className="text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    {r.display_name || "Unnamed user"}
                    {r.is_superadmin && (
                      <span className="rounded-full bg-[#FDB913]/20 px-2 py-1 text-[10px] font-bold text-[#8A5A00]">
                        SUPERADMIN
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {r.role} · {r.account_status}
                  </div>
                </div>

                <div className="flex gap-2">
                  {r.is_superadmin ? (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold">
                      <LockKeyhole size={14} />
                      Protected: cannot demote or delete
                    </div>
                  ) : (
                    <>
                      <button
                        disabled={!canManage}
                        onClick={() => changeRole(r)}
                        className="btn btn-secondary text-xs disabled:opacity-40"
                      >
                        {r.role === "ADMIN" ? "Set user" : "Make admin"}
                      </button>
                      <button
                        onClick={() => toggle(r)}
                        className="btn btn-secondary text-xs"
                      >
                        {r.account_status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {r.role === "ADMIN" && !r.is_superadmin && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Administrative permissions
                    </div>
                    {!canManage && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        Superadmin only
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {perms.map(([key, label]) => {
                      const on = (r.admin_permissions || []).includes(key);

                      return (
                        <button
                          key={key}
                          disabled={!canManage}
                          onClick={() => setPerm(r, key)}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-40 ${
                            on
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          {on && <Check size={13} className="mr-1 inline" />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
