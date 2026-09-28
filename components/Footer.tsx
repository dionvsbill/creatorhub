import Link from "next/link";

type FooterItem = readonly [string, string];

type FooterGroup = {
  title: string;
  items: FooterItem[];
};

const groups: FooterGroup[] = [
  {
    title: "Platform",
    items: [
      ["/campaigns", "Campaigns"],
      ["/creator", "Creator Program"],
      ["/advertiser", "Advertise"],
      ["/referrals", "Referrals"],
      ["/developers", "API"],
      ["/help-center", "Help Center"],
      ["/", "FAQs"],
    ],
  },
  {
    title: "Company",
    items: [
      ["/about", "About"],
      ["/contact", "Contact"],
      ["/security", "Security"],
      ["/report-abuse", "Report Abuse"],
      ["/appeal", "Appeal a decision"],
      ["/payment-complaint", "Payment complaint"],
    ],
  },
  {
    title: "Legal",
    items: [
      ["/legal/terms-of-service", "Terms of Service"],
      ["/legal/privacy-policy", "Privacy Policy"],
      ["/legal/community-guidelines", "Community Guidelines"],
      ["/legal/acceptable-use", "Acceptable Use"],
      ["/legal/payments-refunds", "Payments & Refunds"],
      ["/legal/creator-guidelines", "Creator Guidelines"],
      ["/legal/advertiser-guidelines", "Advertiser Guidelines"],
      ["/legal/cookie-policy", "Cookie Policy"],
      ["/legal/intellectual-property", "Intellectual Property"],
      ["/legal/account-appeals", "Account Appeals"],
      ["/legal/referral-policy", "Referral Policy"],
      ["/legal/api-terms", "API Terms"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <img
                src="/creatorhub-mark.svg"
                alt="CreatorHub"
                className="h-11 w-11 shrink-0"
                onError={(event) => {
                  event.currentTarget.src = "/icon.svg";
                }}
              />
              <span className="text-lg font-bold tracking-tight text-white">CreatorHub</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
              A Ghana-focused campaign and creator platform for digital work, campaign operations and verified financial workflows.
            </p>
            <div className="mt-7 text-xs text-slate-500">© 2026 CreatorHub. All rights reserved.</div>
          </div>

          <div className="grid gap-9 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">{group.title}</h2>
                <div className="mt-4 space-y-2.5">
                  {group.items.map(([href, label]) => (
                    <Link key={href} href={href} className="block text-sm text-slate-400 transition-colors hover:text-white">
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-slate-800 pt-6 text-xs text-slate-500">
          <Link href="/legal" className="hover:text-slate-200">Legal / Compliance</Link>
          <Link href="/help-center" className="hover:text-slate-200">Support</Link>
          <Link href="/security" className="hover:text-slate-200">Security</Link>
          <Link href="/report-abuse" className="hover:text-slate-200">Report Abuse</Link>
        </div>
      </div>
    </footer>
  );
}
