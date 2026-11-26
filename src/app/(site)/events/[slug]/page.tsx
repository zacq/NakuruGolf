import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { CLUB, EVENT_TYPES, SPONSOR_ROLES, eventDates, eventStatus, waLink } from "@/lib/constants";
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
  return { title: `${e.name} — register & book`, description: `${e.summary} ${eventDates(e.startsAt, e.endsAt)} at Nakuru Golf Club.` };
}

function Block({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <div className="card">
      <h3 className="mb-1 text-lg font-bold text-fairway-900">{title}</h3>
      <p className="whitespace-pre-line text-fairway-800/90">{body}</p>
    </div>
  );
}

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
  const shareMsg = `Join me at the ${e.name}, ${eventDates(e.startsAt, e.endsAt)} at Nakuru Golf Club: ${url}`;

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "SportsEvent", name: e.name, startDate: new Date(e.startsAt).toISOString(), endDate: new Date(e.endsAt).toISOString(), eventStatus: "https://schema.org/EventScheduled", location: { "@type": "Place", name: CLUB.name, address: CLUB.address }, description: e.summary, organizer: { "@type": "Organization", name: CLUB.name }, offers: types.map((t) => ({ "@type": "Offer", name: t.name, price: t.price, priceCurrency: "KES", availability: `https://schema.org/${t.cap != null && t.sold >= t.cap ? "SoldOut" : "InStock"}`, url })) }} />
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-fairway-900 via-fairway-800 to-fairway-600 text-white">
        {e.banner && <Img src={e.banner} alt={`${e.name} poster`} className="absolute inset-0 -z-10 h-full w-full opacity-40" />}
        <div className="container-x py-10 sm:py-16">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip !bg-gold-500 !text-fairway-900 uppercase">{st}</span>
            <span className="chip">{EVENT_TYPES[e.type]}</span>
            {e.titleSponsor && <span className="rounded-lg bg-white px-3 py-1 font-serif text-sm font-bold text-fairway-900">Title sponsor: {e.titleSponsor}</span>}
          </div>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{e.name}</h1>
          <p className="mt-2 text-lg text-fairway-100">📅 {eventDates(e.startsAt, e.endsAt)} · 📍 {e.venue}</p>
          <p className="text-fairway-200">{e.format}</p>
          {st === "upcoming" && <div className="mt-5"><Countdown to={new Date(e.startsAt).toISOString()} /></div>}
          <div className="mt-6 grid gap-3 sm:flex">
            {st !== "past" && <a href="#register" className="btn-gold text-lg">Register now</a>}
            <a href={waLink(shareMsg)} target="_blank" rel="noopener" className="btn-wa">💬 Share on WhatsApp</a>
            <a href={`/api/events/${e.slug}/ics`} className="btn-light">📆 Add to calendar</a>
          </div>
        </div>
      </section>

      <div className="container-x section grid gap-10">
        <section>
          <SectionTitle title="Event details" intro={e.description} />
          <div className="grid gap-4 md:grid-cols-2">
            <Block title="Schedule" body={e.schedule} />
            <Block title="Rules" body={e.rules} />
            <Block title="Prizes" body={e.prizes} />
            <Block title="Dress code" body={e.dressCode} />
            <Block title="Contact" body={e.contact} />
          </div>
          {st === "ongoing" && <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-900">🔴 Event under way. Tee sheet, draw and announcements are in the schedule above and at the clubhouse. Late entries and tickets are still on sale below.</p>}
        </section>

        {st === "past" ? (
          <section>
            <SectionTitle title="Results & thank-you" />
            <div className="card">
              <p className="whitespace-pre-line">{e.results || "Results will be posted soon."}</p>
            </div>
            {albums.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{albums.map((p) => <Img key={p.id} src={p.url} alt={p.caption || e.name} className="h-40 w-full rounded-xl" />)}</div>}
            <Link href="/events" className="btn-primary mt-5">See upcoming events</Link>
          </section>
        ) : (
          <>
            {tees.length > 0 && (
              <section id="draw" className="scroll-mt-20">
                <SectionTitle
                  eyebrow="Tee-time draw"
                  title="Enter the draw for a tee time"
                  intro={`Pay a KSh ${tees[0].fee} draw fee by M-Pesa to enter. Each tee time takes up to ${tees[0].capacity} entries, then closes and ${tees[0].players} players are drawn at random. One entry per phone number.`}
                />
                <TeeDraw event={{ id: e.id, name: e.name, slug: e.slug }} tees={tees} />
                <Link href={`/events/${e.slug}/draw`} className="mt-4 inline-block font-semibold underline">Draw results & how the draw is checked →</Link>
              </section>
            )}

            <section id="register" className="scroll-mt-20">
              <SectionTitle eyebrow="Step 1" title="Register & buy tickets" />
              <EntryPanel event={{ id: e.id, name: e.name, slug: e.slug }} types={types.map((t) => ({ id: t.id, kind: t.kind, name: t.name, description: t.description || "", price: t.price, priceMember: t.priceMember, players: t.players, cap: t.cap, sold: t.sold, deadline: t.deadline ? new Date(t.deadline).toISOString() : null }))} />
            </section>

            <section id="addons" className="scroll-mt-20 grid gap-10">
              <SectionTitle eyebrow="Step 2" title="Make it a whole weekend" intro="Add-ons are paid in the same M-Pesa checkout." />
              {products.length > 0 && (
                <div id="merch" className="scroll-mt-20">
                  <h3 className="mb-3 text-xl font-bold text-fairway-900">👕 Event merchandise</h3>
                  <ProductGrid eventId={e.id} products={products.map((p) => ({ id: p.id, name: p.name, description: p.description || "", price: p.price, bundlePrice: p.bundlePrice, stock: p.stock, sizes: p.sizes || "", image: p.image || "", eventId: p.eventId }))} />
                </div>
              )}
              <div id="stay" className="scroll-mt-20">
                <h3 className="mb-3 text-xl font-bold text-fairway-900">🛏️ Tournament Stay: rooms for the event dates</h3>
                <RoomBooker compact eventId={e.id} defaultIn={checkIn} defaultOut={checkOut} defaultPackage="Tournament Stay" rooms={rooms.map((r) => ({ id: r.id, name: r.name, description: r.description || "", beds: r.beds || "", capacity: r.capacity, amenities: r.amenities || "", rate: r.rate, memberRate: r.memberRate, eventRate: r.eventRate, image: r.image || "" }))} />
              </div>
              <div id="meal" className="scroll-mt-20">
                <h3 className="mb-3 text-xl font-bold text-fairway-900">🍽️ Dinner & meal packages</h3>
                <MealOrder eventId={e.id} defaultDate={checkIn} items={menu.map((m) => ({ id: m.id, category: m.category, name: m.name, description: m.description || "", price: m.price }))} />
              </div>
              <div id="carwash" className="scroll-mt-20">
                <h3 className="mb-3 text-xl font-bold text-fairway-900">🚗 Car wash while you play</h3>
                <CarWashBooker eventId={e.id} defaultDate={checkIn} services={wash.map((w) => ({ id: w.id, name: w.name, description: w.description || "", price: w.price, durationMins: w.durationMins }))} />
              </div>
            </section>
          </>
        )}

        {spons.length > 0 && (
          <section>
            <SectionTitle title="Event sponsors" intro="Thank you to the organisations making this event possible." />
            <div className="flex flex-wrap gap-4">
              {spons.map((p, i) => (
                <div key={i} className="grid justify-items-center gap-1 text-center">
                  <PartnerBadge name={p.name} slug={p.slug} color={p.color} logo={p.logo} size="lg" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-fairway-800/70">{SPONSOR_ROLES[p.role]}</span>
                </div>
              ))}
            </div>
            <Link href="/partners#packages" className="mt-4 inline-block text-sm font-semibold text-fairway-800 underline">Sponsor this event →</Link>
          </section>
        )}
      </div>
    </>
  );
}
