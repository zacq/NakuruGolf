import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { SPONSOR_ROLES, TIERS } from "@/lib/constants";
import { PartnerBadge } from "@/components/PartnerBadge";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [p] = await db.select().from(s.partners).where(eq(s.partners.slug, slug));
  return { title: p ? `${p.name} — partner` : "Partner" , description: p?.description || undefined };
}

export default async function PartnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p] = await db.select().from(s.partners).where(eq(s.partners.slug, slug));
  if (!p) notFound();
  const supported = await db
    .select({ role: s.sponsorships.role, name: s.events.name, slug: s.events.slug })
    .from(s.sponsorships)
    .innerJoin(s.events, eq(s.events.id, s.sponsorships.eventId))
    .where(eq(s.sponsorships.partnerId, p.id));
  return (
    <div className="container-x section grid max-w-3xl gap-6">
      <div>
        <span className="chip">{TIERS[p.tier]}</span>
        <h1 className="mt-2 text-4xl font-bold text-fairway-900">{p.name}</h1>
        <p className="mt-1 text-fairway-800/80">{p.years}</p>
      </div>
      <PartnerBadge name={p.name} slug={p.slug} color={p.color} logo={p.logo} size="lg" />
      <div className="card"><h2 className="mb-1 text-xl font-bold">Partnership story</h2><p>{p.story || p.description}</p></div>
      {supported.length > 0 && (
        <div className="card">
          <h2 className="mb-2 text-xl font-bold">Events supported</h2>
          <ul className="grid gap-1">{supported.map((x, i) => <li key={i}><Link className="flex min-h-11 items-center font-semibold underline" href={`/events/${x.slug}`}>{x.name} — {SPONSOR_ROLES[x.role]}</Link></li>)}</ul>
        </div>
      )}
      {p.website && <a href={p.website} target="_blank" rel="noopener" className="btn-outline">Visit {p.name} ↗</a>}
      <Link href="/partners#packages" className="btn-gold">Become a partner</Link>
    </div>
  );
}
