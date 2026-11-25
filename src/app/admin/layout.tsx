import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin, ADMIN_PASSWORD_IS_DEFAULT } from "@/lib/session";
import { AdminLogin, AdminLogout } from "@/components/AdminClient";
import { Crest } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Staff dashboard", robots: { index: false, follow: false } };

const tabs = [
  ["/admin", "Dashboard"],
  ["/admin/orders", "Orders & payments"],
  ["/admin/checkin", "Check-in"],
  ["/admin/ops", "Hotel · Kitchen · Wash · Tee"],
  ["/admin/events", "Events"],
  ["/admin/partners", "Partners"],
  ["/admin/leads", "Leads"],
  ["/admin/members", "Members"],
  ["/admin/content", "Content"],
  ["/admin/logs", "Messages & audit"],
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdmin()))
    return (
      <div className="grid min-h-dvh place-items-center bg-fairway-900 p-4">
        <div className="card w-full max-w-sm grid gap-4">
          <div className="flex items-center gap-3"><Crest /><h1 className="text-xl font-bold">Staff sign-in</h1></div>
          <AdminLogin />
          {ADMIN_PASSWORD_IS_DEFAULT && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Demo password: <strong>golf2026</strong>. Set the ADMIN_PASSWORD environment variable for production.</p>}
          <Link href="/" className="text-center text-sm underline">← Back to the website</Link>
        </div>
      </div>
    );
  return (
    <div className="min-h-dvh bg-fairway-50">
      <header className="bg-fairway-900 text-white">
        <div className="container-x flex h-14 items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-serif text-lg"><Crest size={30} /> NGC Staff</Link>
          <div className="flex items-center gap-3 text-sm"><Link href="/" className="underline">View site</Link><AdminLogout /></div>
        </div>
        <nav className="container-x flex gap-1 overflow-x-auto pb-2" aria-label="Staff">
          {tabs.map(([h, l]) => <Link key={h} href={h} className="flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold hover:bg-white/10">{l}</Link>)}
        </nav>
      </header>
      <div className="container-x py-6">{children}</div>
    </div>
  );
}
