'use client';

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";

function CallbackContent() {
  const p = useSearchParams();
  const [state, setState] = useState("verifying");

  useEffect(() => {
    const ref = p.get("reference");
    if (!ref) {
      setState("failed");
      return;
    }

    (async () => {
      const response = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reference: ref }),
        cache: "no-store",
      });

      const data = await response.json();
      setState(data.success ? "success" : "failed");
    })();
  }, [p]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <div className="card w-full max-w-md p-8 text-center">
        {state === "verifying" ? (
          <>
            <LoaderCircle className="mx-auto animate-spin text-orange-600" />
            <h1 className="mt-4 font-semibold">Verifying payment</h1>
            <p className="mt-2 text-sm text-slate-500">Confirming the transaction with Paystack.</p>
          </>
        ) : state === "success" ? (
          <>
            <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
            <h1 className="mt-4 text-xl font-bold">Payment confirmed</h1>
            <p className="mt-2 text-sm text-slate-500">Your transaction has been recorded.</p>
            <Link href="/earnings" className="btn btn-primary mt-6">View wallet</Link>
          </>
        ) : (
          <>
            <XCircle className="mx-auto text-red-500" size={40} />
            <h1 className="mt-4 text-xl font-bold">Payment could not be confirmed</h1>
            <p className="mt-2 text-sm text-slate-500">No funds were released by the application.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center"><Link href="/payment-complaint?reference={ref || ""}" className="btn btn-primary">File payment complaint</Link><Link href="/dashboard" className="btn btn-secondary">Return to dashboard</Link></div>
          </>
        )}
      </div>
    </main>
  );
}

export default function Callback() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
          <div className="card w-full max-w-md p-8 text-center">
            <LoaderCircle className="mx-auto animate-spin text-orange-600" />
            <h1 className="mt-4 font-semibold">Verifying payment</h1>
          </div>
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
