import Link from "next/link";
import { db } from "@/db";
import { asc, desc } from "drizzle-orm";
import * as s from "@/db/schema";
import { CLUB, IMG, eventDates, eventStatus, fmtDate, kes } from "@/lib/constants";
import { entryMinPrices } from "@/lib/queries";
import Countdown from "@/components/Countdown";
import { getLeaderboard } from "@/lib/leaderboard";
import LeaderboardBoard from "@/components/LeaderboardBoard";
import { PartnerBadge } from "@/components/PartnerBadge";
import { Img, JsonLd, SectionTitle } from "@/components/Bits";

export const dynamic = "force-dynamic";

const tiles = [
  { href: "/golf#tee-time", icon: "⛳", label: "Book a Tee Time" },
  { href: "/stay", icon: "🛏️", label: "Book a Room" },
  { href: "/dine#reserve", icon: "🍽️", label: "Reserve a Table" },
  { href: "/car-wash", icon: "🚗", label: "Book a Car Wash" },
  { href: "/events", icon: "🏆", label: "Upcoming Events" },
  { href: "/membership", icon: "🎖️", label: "Become a Member" },
  { href: "/shop", icon: "👕", label: "Shop" },
];

export default async function Home() {
  const [events, news, photos, partners, mins, board] = await Promise.all([
    db.select().from(s.events).orderBy(asc(s.events.startsAt)),
    db.select().from(s.newsPosts).orderBy(desc(s.newsPosts.publishedAt)).limit(3),
    db.select().from(s.galleryPhotos).orderBy(desc(s.galleryPhotos.id)).limit(4),
    db.select().from(s.partners),
    entryMinPrices(),
    getLeaderboard(),
  ]);
  const upcoming = events.filter((e) => eventStatus(e) !== "past");
  const feat = upcoming.find((e) => e.featured) || upcoming[0];
  const order = ["platinum", "gold", "silver", "event", "community"];
  partners.sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": ["SportsActivityLocation", "LocalBusiness"], name: CLUB.name, telephone: CLUB.phone, email: CLUB.email, address: { "@type": "PostalAddress", streetAddress: "Showground Road, behind Nakuru Show Ground", addressLocality: "Nakuru", addressCountry: "KE" }, url: CLUB.url }} />
      <section className="relative isolate overflow-hidden bg-fairway-900 text-white">
        <Img eager src={IMG.hero} alt="Sunrise over the Nakuru Golf Club course" className="absolute inset-0 -z-10 h-full w-full opacity-50" />
        <div className="container-x grid gap-8 pb-16 pt-12 sm:pb-20 sm:pt-16 lg:grid-cols-[1fr_26rem] lg:items-center">
          <div>
          <p className="mb-3 inline-block rounded-full bg-gold-500/90 px-3 py-1 text-xs font-bold uppercase tracking-widest text-fairway-900">Nakuru · Kenya</p>
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] sm:text-6xl">Golf, events & a great day out in Nakuru.</h1>
          <p className="mt-4 max-w-xl text-lg text-fairway-100">Register for tournaments, book a room, reserve a table, get your car washed and pay once with M-Pesa.</p>
          <div className="mt-7 grid gap-3 sm:flex">
            <Link href={feat ? `/events/${feat.slug}` : "/events"} className="btn-gold text-lg">Next event →</Link>
            <Link href="/stay" className="btn-light text-lg">Book a stay</Link>
          </div>
          </div>
          <LeaderboardBoard board={board} />
        </div>
      </section>

      {feat && (
        <section className="container-x -mt-8 relative z-10">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-fairway-800 to-fairway-700 p-5 text-white shadow-2xl sm:p-8">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gold-300">Featured event {feat.titleSponsor && `· ${feat.titleSponsor}`}</p>
                <h2 className="mt-1 text-3xl font-bold">{feat.name}</h2>
                <p className="mt-1 text-fairway-100">{eventDates(feat.startsAt, feat.endsAt)} · {feat.format}</p>
                <p className="mt-1 text-sm text-fairway-200">Entry from {kes(mins.get(feat.id) || 0)} · add rooms, dinner, car wash & merchandise</p>
              </div>
              <div className="grid gap-4">
                <Countdown to={new Date(feat.startsAt).toISOString()} />
                <Link href={`/events/${feat.slug}`} className="btn-gold">Register now</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="container-x section">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <Link key={t.href} href={t.href} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-fairway-100 bg-white p-3 text-center font-semibold text-fairway-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="text-3xl" aria-hidden>{t.icon}</span>
              {t.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-fairway-100/60">
        <div className="container-x section grid items-center gap-6 md:grid-cols-2">
          <Img src={IMG.rooms[1]} alt="Comfortable guest room" className="h-64 w-full rounded-2xl" />
          <div>
            <SectionTitle eyebrow="Golf & Stay" title="Play the course, sleep on site" intro="Combine a room with green fees, an after-round meal and a car wash. Pay once, get one confirmation." />
            <div className="grid gap-3 sm:flex">
              <Link href="/stay" className="btn-primary">See rooms & packages</Link>
              <Link href="/golf#tee-time" className="btn-outline">Green fees</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x section">
        <SectionTitle eyebrow="Partners" title="Proudly supported by" />
        <div className="flex flex-wrap items-center gap-3">
          {partners.map((p) => <PartnerBadge key={p.id} name={p.name} slug={p.slug} color={p.color} logo={p.logo} size="md" />)}
          <Link href="/partners#packages" className="inline-flex h-16 items-center rounded-xl border-2 border-dashed border-gold-500 px-5 font-semibold text-gold-600">Become a partner</Link>
        </div>
      </section>

      <section className="container-x section">
        <SectionTitle eyebrow="News" title="Latest from the club" />
        <div className="grid gap-4 md:grid-cols-3">
          {news.map((n) => (
            <Link key={n.id} href={`/news#${n.slug}`} className="overflow-hidden rounded-2xl border border-fairway-100 bg-white shadow-sm">
              {n.image && <Img src={n.image} alt="" className="h-36 w-full" />}
              <div className="p-4">
                <span className="chip">{n.category}</span>
                <h3 className="mt-2 text-lg font-bold text-fairway-900">{n.title}</h3>
                <p className="mt-1 text-xs text-fairway-800/60">{fmtDate(n.publishedAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x pb-6">
        <SectionTitle eyebrow="Gallery" title="Recent photos" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {photos.map((p) => <Img key={p.id} src={p.url} alt={p.caption || p.album} className="h-36 w-full rounded-xl" />)}
        </div>
        <Link href="/news#gallery" className="btn-outline mt-4 w-full sm:w-auto">View gallery</Link>
      </section>
    </>
  );
}
