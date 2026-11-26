import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { CLUB, EVENT_TYPES, SPONSOR_ROLES, eventDates, eventStatus, kes, waLink } from "@/lib/constants";
import { nairobiDate, plusDay } from "@/lib/queries";
import Countdown from "@/components/Countdown";
import EntryPanel from "@/components/EntryPanel";
import TeeDraw from "@/components/TeeDraw";
import { teeTimeViews } from "@/lib/leaderboard";
import RoomBooker from "@/components/RoomBooker";
import CarWashBooker from "@/components/CarWashBooker";
import { MealOrder, ProductGrid } from "@/components/GolfForms";
import { PartnerBadge } from "@/components/PartnerBadge";
import { Img, JsonLd, SectionTitle } from "@/components/Bits";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [e] = await db.select().from(s.events).where(eq(s.events.slug, slug));
  if (!e) return { title: "Event not found" };
  return { title: `${e.name}: tee times & registration`, description: `Choose a tee time for the ${e.name}, ${eventDates(e.startsAt, e.endsAt)}, and pay by M-Pesa. ${e.summary}` };
}

function Block({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <div>
      <h3 className="font-bold text-fairway-900">{title}</h3>
      <p className="whitespace-pre-line text-sm text-fairway-800/90">{body}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-center ring-1 ring-white/15">
      <p className="font-serif text-2xl font-bold text-gold-300 sm:text-3xl">{value}</p>
      <p className="text-xs uppercase tracking-wider text-fairway-100">{label}</p>
    </div>
  );
}

const HOWDIDIDO = [
  ["Have a HowDidiDo account", "Download the HowDidiDo app or sign up at howdidido.com, and make sure your profile is linked to your home club with your handicap."],
  ["Enter with the same name", "Type your name exactly as it appears on HowDidiDo and add your HowDidiDo / CDH number if you have it. That is how the club matches you."],
  ["Find your tee time on HowDidiDo", "After the draw, the club adds every drawn player to this competition on HowDidiDo. Your tee time and playing partners show there."],
  ["Score and check the leaderboard", "On the day, score in HowDidiDo as usual. Results feed the club leaderboard on this website so everyone can see where they stand."],
];

const FAQ = [
  ["Why a draw?", "Popular tee times attract more golfers than places. A draw gives every paid entrant the same fair chance, instead of first-come phone calls and forms."],
  ["How do I pay?", "At checkout we send an M-Pesa prompt to your phone. Enter your PIN and your entry is confirmed automatically by Safaricom: no screenshots, no forms, no waiting for someone to check the till."],
  ["How do I know the draw is fair?", "When a tee time closes we publish a fingerprint of a secret random number. The draw reveals that number and anyone can recompute the result, so nobody can pick the winners."],
  ["What if I'm not drawn?", "You become a reserve in draw order. If a drawn player drops out, the next reserve is offered the place by SMS."],
  ["Can I enter more than once?", "One draw entry per phone number per event, so everybody has the same chance."],
];

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [e] = await db.select().from(s.events).where(eq(s.events.slug, slug));
  if (!e) notFound();
  const [types, spons, products, rooms, wash, menu, albums] = await Promise.all([
    db.select().from(s.entryTypes).where(eq(s.entryTypes.eventId, e.id)).orderBy(asc(s.entryTypes.id)),
    db.select({ role: s.sponsorships.role, name: s.partners.name, slug: s.partners.slug, color: s.partners.color, logo: s.partners.logo }).from(s.sponsorships).innerJoin(s.partners, eq(s.partners.id, s.sponsorships.partnerId)).where(eq(s.sponsorships.eventId, e.id)),
    db.select().from(s.products).where(and(eq(s.products.eventId, e.id), eq(s.products.category, "merch"))),
    db.select().from(s.roomTypes).orderBy(asc(s.roomTypes.rate)),
    db.select().from(s.carWashServices).orderBy(asc(s.carWashServices.price)),
    db.select().from(s.menuItems).where(and(eq(s.menuItems.category, "dinner"), eq(s.menuItems.available, true))),
    db.select().from(s.galleryPhotos).where(eq(s.galleryPhotos.eventId, e.id)),
  ]);
  const tees = await teeTimeViews(e.id);
  const st = eventStatus(e);
  const url = `${CLUB.url}/events/${e.slug}`;
  const checkIn = nairobiDate(e.startsAt);
  const checkOut = plusDay(nairobiDate(e.endsAt), 1);
  const gcalStamp = (d: Date) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const gcal = `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: e.name,
    dates: `${gcalStamp(e.startsAt)}/${gcalStamp(e.endsAt)}`,
    details: `${e.summary}\n\n${url}`,
    location: `${CLUB.name}, ${CLUB.address}`,
    ctz: "Africa/Nairobi",
  })}`;
  const shareMsg = `Join me at the ${e.name}, ${eventDates(e.startsAt, e.endsAt)} at Nakuru Golf Club. Pick your tee time here: ${url}`;
  const hasDraw = tees.length > 0;
  const openTees = tees.filter((t) => t.status === "open" && t.entries < t.capacity).length;
  const entered = tees.reduce((a, t) => a + t.entries, 0);
  const days = new Set(tees.map((t) => t.day)).size;
  const fee = tees[0]?.fee ?? 0;
  const players = tees[0]?.players ?? 4;
  const capacity = tees[0]?.capacity ?? 100;
  const entryTypes = types.map((t) => ({ id: t.id, kind: t.kind, name: t.name, description: t.description || "", price: t.price, priceMember: t.priceMember, players: t.players, cap: t.cap, sold: t.sold, deadline: t.deadline ? new Date(t.deadline).toISOString() : null }));

  const steps = hasDraw
    ? [
        ["Pick a tee time", `Browse the tee sheet for ${days > 1 ? `all ${days} tournament days` : "the tournament day"} and choose a time that suits you.`],
        ["Pay by M-Pesa", `Enter your name and HowDidiDo details, then approve the ${kes(fee)} M-Pesa prompt on your phone.`],
        ["The draw", `Each tee time takes ${capacity} entries, then closes. ${players} players are drawn at random and told by SMS.`],
        ["Play & score on HowDidiDo", "Drawn players complete their entry. Your tee time appears on HowDidiDo, where you score on the day."],
      ]
    : [
        ["Choose your entry", "Individual, fourball or team, with member prices when you are signed in."],
        ["Add player details", "Names, handicaps and HowDidiDo details for every player."],
        ["Pay by M-Pesa", "Approve one M-Pesa prompt on your phone. Safaricom confirms it automatically."],
        ["Play & score on HowDidiDo", "You receive a QR ticket by SMS; score on HowDidiDo on the day."],
      ];

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "SportsEvent", name: e.name, startDate: new Date(e.startsAt).toISOString(), endDate: new Date(e.endsAt).toISOString(), eventStatus: "https://schema.org/EventScheduled", location: { "@type": "Place", name: CLUB.name, address: CLUB.address }, description: e.summary, organizer: { "@type": "Organization", name: CLUB.name }, offers: types.map((t) => ({ "@type": "Offer", name: t.name, price: t.price, priceCurrency: "KES", availability: `https://schema.org/${t.cap != null && t.sold >= t.cap ? "SoldOut" : "InStock"}`, url })) }} />

      <section className="relative isolate overflow-hidden bg-gradient-to-br from-fairway-900 via-fairway-800 to-fairway-600 text-white">
        {e.banner && <Img eager src={e.banner} alt={`${e.name} poster`} className="absolute inset-0 -z-10 h-full w-full opacity-30" />}
        <div className="container-x grid gap-6 py-8 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip !bg-gold-500 !text-fairway-900 uppercase">{st === "upcoming" ? "Registration open" : st}</span>
              <span className="chip">{EVENT_TYPES[e.type]}</span>
              {e.titleSponsor && <span className="rounded-lg bg-white px-3 py-1 font-serif text-sm font-bold text-fairway-900">{e.titleSponsor}</span>}
            </div>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">{e.name}</h1>
            <p className="mt-2 text-fairway-100">📅 {eventDates(e.startsAt, e.endsAt)} · ⛳ {e.format}</p>
            {st !== "past" && (
              <div className="mt-5 grid gap-3 sm:flex">
                <a href={hasDraw ? "#tee-sheet" : "#register"} className="btn-gold text-lg">{hasDraw ? "Choose your tee time ↓" : "Register now ↓"}</a>
                <a href="#howdidido" className="btn-light">How HowDidiDo fits in</a>
              </div>
            )}
          </div>
          {st === "upcoming" && <Countdown to={new Date(e.startsAt).toISOString()} label="Tee-off in" />}
        </div>
        {hasDraw && st !== "past" && (
          <div className="container-x grid grid-cols-2 gap-3 pb-8 sm:grid-cols-4">
            <Stat value={openTees} label="Tee times open" />
            <Stat value={entered} label="Golfers entered" />
            <Stat value={`${players} / ${capacity}`} label="Drawn per tee time" />
            <Stat value={kes(fee)} label="Draw fee, M-Pesa" />
          </div>
        )}
      </section>

      <div className="container-x section grid gap-12">
        {st === "past" ? (
          <section>
            <SectionTitle title="Results & thank-you" />
            <div className="card"><p className="whitespace-pre-line">{e.results || "Results will be posted soon."}</p></div>
            {albums.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{albums.map((p) => <Img key={p.id} src={p.url} alt={p.caption || e.name} className="h-40 w-full rounded-xl" />)}</div>}
            <div className="mt-5 grid gap-3 sm:flex"><Link href="/leaderboard" className="btn-gold">Leaderboard</Link><Link href="/events" className="btn-primary">Upcoming events</Link></div>
          </section>
        ) : (
          <>
            <section aria-labelledby="how">
              <SectionTitle eyebrow="Registration in 4 steps" title="How to get your tee time" />
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map(([t, d], i) => (
                  <li key={t} className="card relative">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-500 font-serif text-xl font-bold text-fairway-900">{i + 1}</span>
                    <p className="mt-2 font-bold text-fairway-900">{t}</p>
                    <p className="text-sm text-fairway-800/80">{d}</p>
                  </li>
                ))}
              </ol>
            </section>

            {hasDraw && (
              <section id="tee-sheet" className="scroll-mt-20">
                <SectionTitle
                  eyebrow="Step 1 & 2 · Tee sheet"
                  title="Available tee times"
                  intro={`Every tee time takes up to ${capacity} entries, then entries close and ${players} players are drawn. Fewer entries means better odds. One entry per phone number.`}
                />
                <TeeDraw event={{ id: e.id, name: e.name, slug: e.slug }} tees={tees} />
                <Link href={`/events/${e.slug}/draw`} className="mt-4 inline-flex min-h-12 items-center font-semibold underline">See draw results & how fairness is checked →</Link>
              </section>
            )}

            <section id="howdidido" className="scroll-mt-20 overflow-hidden rounded-3xl bg-fairway-900 text-white">
              <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[18rem_1fr]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gold-300">Scoring partner</p>
                  <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Your round lives on HowDidiDo</h2>
                  <p className="mt-2 text-fairway-100">Register and pay here, play and score on HowDidiDo. This website handles M-Pesa, which HowDidiDo does not offer, and passes the confirmed start sheet to the club&apos;s HowDidiDo competition.</p>
                  <a href="https://www.howdidido.com" target="_blank" rel="noopener" className="btn-gold mt-4">Open HowDidiDo ↗</a>
                </div>
                <ol className="grid gap-3 sm:grid-cols-2">
                  {HOWDIDIDO.map(([t, d], i) => (
                    <li key={t} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                      <p className="font-bold text-gold-300">{i + 1}. {t}</p>
                      <p className="mt-1 text-sm text-fairway-100">{d}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <section id="register" className="scroll-mt-20">
              <SectionTitle
                eyebrow={hasDraw ? "Step 4 · Drawn players" : "Register"}
                title={hasDraw ? "Complete your tournament entry" : "Choose your entry"}
                intro={hasDraw ? "Drawn? Pay your entry here with the same phone number you used for the draw. Dinner and spectator tickets are open to everyone." : "Add every player's name, handicap and shirt size, then pay once by M-Pesa."}
              />
              <EntryPanel event={{ id: e.id, name: e.name, slug: e.slug }} types={entryTypes} />
            </section>

            <section>
              <SectionTitle title="Questions golfers ask" />
              <div className="grid gap-2">
                {FAQ.filter((_, i) => hasDraw || i === 1).map(([q, a]) => (
                  <details key={q} className="card !p-0">
                    <summary className="flex min-h-14 cursor-pointer items-center px-4 font-semibold text-fairway-900">{q}</summary>
                    <p className="px-4 pb-4 text-sm text-fairway-800/90">{a}</p>
                  </details>
                ))}
              </div>
            </section>
          </>
        )}

        <details className="card">
          <summary className="min-h-12 cursor-pointer py-3 text-lg font-bold text-fairway-900">Format, schedule, rules & prizes</summary>
          <div className="mt-2 grid gap-4 md:grid-cols-2">
            <Block title="About" body={e.description} />
            <Block title="Schedule" body={e.schedule} />
            <Block title="Rules" body={e.rules} />
            <Block title="Prizes" body={e.prizes} />
            <Block title="Dress code" body={e.dressCode} />
            <Block title="Contact" body={e.contact} />
          </div>
        </details>

        {st !== "past" && (
          <details id="addons" className="card scroll-mt-20">
            <summary className="min-h-12 cursor-pointer py-3 text-lg font-bold text-fairway-900">Staying over? Add a room, dinner, car wash or event shirt</summary>
            <div className="mt-4 grid gap-10">
              {products.length > 0 && (
                <div id="merch">
                  <h3 className="mb-3 text-xl font-bold text-fairway-900">👕 Event merchandise</h3>
                  <ProductGrid eventId={e.id} products={products.map((p) => ({ id: p.id, name: p.name, description: p.description || "", price: p.price, bundlePrice: p.bundlePrice, stock: p.stock, sizes: p.sizes || "", image: p.image || "", eventId: p.eventId }))} />
                </div>
              )}
              <div id="stay">
                <h3 className="mb-3 text-xl font-bold text-fairway-900">🛏️ Rooms for the event dates</h3>
                <RoomBooker compact eventId={e.id} defaultIn={checkIn} defaultOut={checkOut} defaultPackage="Tournament Stay" rooms={rooms.map((r) => ({ id: r.id, name: r.name, description: r.description || "", beds: r.beds || "", capacity: r.capacity, amenities: r.amenities || "", rate: r.rate, memberRate: r.memberRate, eventRate: r.eventRate, image: r.image || "" }))} />
              </div>
              <div id="meal">
                <h3 className="mb-3 text-xl font-bold text-fairway-900">🍽️ Dinner & meals</h3>
                <MealOrder eventId={e.id} defaultDate={checkIn} items={menu.map((m) => ({ id: m.id, category: m.category, name: m.name, description: m.description || "", price: m.price }))} />
              </div>
              <div id="carwash">
                <h3 className="mb-3 text-xl font-bold text-fairway-900">🚗 Car wash while you play</h3>
                <CarWashBooker eventId={e.id} defaultDate={checkIn} services={wash.map((w) => ({ id: w.id, name: w.name, description: w.description || "", price: w.price, durationMins: w.durationMins }))} />
              </div>
            </div>
          </details>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
          <a href={waLink(shareMsg)} target="_blank" rel="noopener" className="flex min-h-12 items-center underline">💬 Share on WhatsApp</a>
          <a href={gcal} target="_blank" rel="noopener" className="flex min-h-12 items-center underline">📆 Add to Google Calendar</a>
          <a href={`/api/events/${e.slug}/ics`} className="flex min-h-12 items-center underline">Apple / Outlook (.ics)</a>
        </div>

        {spons.length > 0 && (
          <section className="border-t border-fairway-100 pt-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-fairway-800/70">Event partners</p>
            <div className="flex flex-wrap gap-4">
              {spons.map((p, i) => (
                <div key={i} className="grid justify-items-center gap-1 text-center">
                  <PartnerBadge name={p.name} slug={p.slug} color={p.color} logo={p.logo} size="md" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-fairway-800/70">{SPONSOR_ROLES[p.role]}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
