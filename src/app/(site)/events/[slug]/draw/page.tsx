import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { asc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { PageHero } from "@/components/Bits";
import { teeLabel } from "@/lib/draw";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [e] = await db.select().from(s.events).where(eq(s.events.slug, slug));
  return { title: e ? `${e.name}: tee-time draw` : "Tee-time draw" };
}

// first name + surname initial: results are public
const shortName = (n: string) => {
  const [first, ...rest] = n.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
};

export default async function DrawPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [e] = await db.select().from(s.events).where(eq(s.events.slug, slug));
  if (!e) notFound();
  const [tees, entries] = await Promise.all([
    db.select().from(s.teeTimes).where(eq(s.teeTimes.eventId, e.id)).orderBy(asc(s.teeTimes.startsAt)),
    db.select().from(s.ballotEntries).where(eq(s.ballotEntries.eventId, e.id)).orderBy(asc(s.ballotEntries.position)),
  ]);
  return (
    <>
      <PageHero title={`${e.name}: tee-time draw`} intro="Every entry is paid by M-Pesa and confirmed by Safaricom. When a tee time closes we publish a fingerprint of the draw's secret number, so the result cannot be changed afterwards.">
        <Link href={`/events/${e.slug}#draw`} className="btn-gold">Enter a draw</Link>
      </PageHero>
      <div className="container-x section grid gap-6">
        <details className="card">
          <summary className="min-h-12 cursor-pointer py-3 font-bold">How the draw is checked</summary>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Entries close when a tee time reaches its limit, or when the club closes it.</li>
            <li>At that moment a secret random number (the seed) is created and its SHA-256 fingerprint is published below.</li>
            <li>At the draw, the seed is revealed. Each entry&apos;s rank is SHA-256 of &quot;seed:entry number&quot;; the lowest ranks play, the rest are reserves in order.</li>
            <li>Anyone can confirm the seed matches the fingerprint and recompute the order, so nobody can choose the winners.</li>
          </ol>
        </details>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {tees.map((t) => {
            const list = entries.filter((b) => b.teeTimeId === t.id);
            const picked = list.filter((b) => b.result === "selected");
            return (
              <div key={t.id} className="card grid content-start gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-fairway-900">{teeLabel(t.startsAt)}</p>
                  <span className="chip capitalize">{t.status === "locked" ? "Closed, draw pending" : t.status}</span>
                </div>
                <p className="text-sm">{list.length} / {t.capacity} entries · {t.players} to play</p>
                {picked.length > 0 && <ol className="text-sm font-semibold">{picked.map((b) => <li key={b.id}>⛳ {shortName(b.name)}{b.handicap ? ` (${b.handicap})` : ""}</li>)}</ol>}
                {t.seedHash && <p className="break-all font-mono text-[10px] text-fairway-800/70">Fingerprint: {t.seedHash}</p>}
                {t.status === "drawn" && t.seed && <p className="break-all font-mono text-[10px] text-fairway-800/70">Seed: {t.seed}</p>}
              </div>
            );
          })}
        </div>
        {tees.length === 0 && <p>No tee-time draw for this event.</p>}
      </div>
    </>
  );
}
