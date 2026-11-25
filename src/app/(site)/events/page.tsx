import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { asc } from "drizzle-orm";
import * as s from "@/db/schema";
import { EVENT_TYPES, eventStatus } from "@/lib/constants";
import { entryMinPrices, golferCounts } from "@/lib/queries";
import EventCard from "@/components/EventCard";
import { PageHero } from "@/components/Bits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Golf tournaments & events in Nakuru",
  description: "Upcoming, ongoing and past golf tournaments, corporate golf days and social events at Nakuru Golf Club. Register and pay by M-Pesa.",
};

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ tab?: string; type?: string }> }) {
  const sp = await searchParams;
  const tab = (["upcoming", "ongoing", "past"].includes(sp.tab || "") ? sp.tab : "upcoming") as "upcoming" | "ongoing" | "past";
  const type = sp.type && EVENT_TYPES[sp.type] ? sp.type : "";
  const [events, golfers, mins] = await Promise.all([db.select().from(s.events).orderBy(asc(s.events.startsAt)), golferCounts(), entryMinPrices()]);
  const withStatus = events.map((e) => ({ e, st: eventStatus(e) }));
  const counts = { upcoming: 0, ongoing: 0, past: 0 };
  withStatus.forEach((x) => counts[x.st]++);
  let list = withStatus.filter((x) => x.st === tab && (!type || x.e.type === type)).map((x) => x.e);
  if (tab === "past") list = list.reverse();
  const q = (t: string, ty: string) => `/events?tab=${t}${ty ? `&type=${ty}` : ""}`;

  return (
    <>
      <PageHero title="Events & tournaments" intro="Enter, then add dinner tickets, rooms, a car wash and merchandise in one checkout." />
      <div className="container-x section">
        <div role="tablist" aria-label="Event status" className="mb-4 grid grid-cols-3 gap-2">
          {(["upcoming", "ongoing", "past"] as const).map((t) => (
            <Link key={t} role="tab" aria-selected={tab === t} href={q(t, type)} className={`flex min-h-12 items-center justify-center rounded-xl text-sm font-bold capitalize ${tab === t ? "bg-fairway-800 text-white" : "bg-white text-fairway-800 border border-fairway-200"}`}>
              {t} ({counts[t]})
            </Link>
          ))}
        </div>
        <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2" aria-label="Filter by type">
          <Link href={q(tab, "")} className={`chip shrink-0 !min-h-10 !px-4 !text-sm ${!type ? "!bg-gold-500" : ""}`}>All</Link>
          {Object.entries(EVENT_TYPES).map(([k, v]) => (
            <Link key={k} href={q(tab, k)} className={`chip shrink-0 !min-h-10 !px-4 !text-sm ${type === k ? "!bg-gold-500" : ""}`}>{v}</Link>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-fairway-800/80">No {tab} events{type ? ` in ${EVENT_TYPES[type]}` : ""}. Check another tab or <Link className="font-semibold underline" href="/contact">ask us</Link>.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => <EventCard key={e.id} e={e} golfers={golfers.get(e.id) || 0} from={mins.get(e.id)} />)}
          </div>
        )}
        <div className="mt-10 rounded-2xl bg-fairway-900 p-6 text-white">
          <h2 className="text-2xl font-bold">Hosting a corporate golf day?</h2>
          <p className="mt-1 text-fairway-100">Team entries, group rooms, catering and branding in one package.</p>
          <Link href="/venue" className="btn-gold mt-4">Plan your event</Link>
        </div>
      </div>
    </>
  );
}
