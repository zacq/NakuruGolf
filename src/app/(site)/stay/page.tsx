import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { asc } from "drizzle-orm";
import * as s from "@/db/schema";
import { CLUB, DEPOSIT_PCT, IMG } from "@/lib/constants";
import RoomBooker from "@/components/RoomBooker";
import { JsonLd, PageHero, SectionTitle } from "@/components/Bits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Hotel & rooms — golf and stay in Nakuru",
  description: "Book a room at Nakuru Golf Club. Golf & Stay, Tournament Stay and corporate group packages, with availability calendar and M-Pesa payment.",
};

export default async function StayPage() {
  const rooms = await db.select().from(s.roomTypes).orderBy(asc(s.roomTypes.rate));
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Hotel", name: `${CLUB.name} Accommodation`, telephone: CLUB.phone, address: CLUB.address, priceRange: `KSh ${Math.min(...rooms.map((r) => r.rate))}+` }} />
      <PageHero title="Stay at the club" intro="Comfortable rooms beside the course. Pick dates to see live availability and your total." image={IMG.rooms[2]} />
      <div className="container-x section grid gap-10">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Golf & Stay", "Room + green fees. Add a tee time after you pick your room.", "/golf#tee-time"],
            ["Tournament Stay", "Room for event dates + entry + dinner, from any event page.", "/events"],
            ["Corporate Group", "A block of rooms for your team or golf day.", "/venue"],
          ].map(([t, d, h]) => (
            <Link key={t} href={h} className="card hover:shadow-md"><p className="font-serif text-lg font-bold text-fairway-900">{t}</p><p className="text-sm text-fairway-800/80">{d}</p></Link>
          ))}
        </div>
        <section id="book" className="scroll-mt-20">
          <SectionTitle title="Choose your room" />
          <RoomBooker rooms={rooms.map((r) => ({ id: r.id, name: r.name, description: r.description || "", beds: r.beds || "", capacity: r.capacity, amenities: r.amenities || "", rate: r.rate, memberRate: r.memberRate, eventRate: r.eventRate, image: r.image || "" }))} />
        </section>
        <section className="card">
          <h2 className="text-xl font-bold text-fairway-900">Payment & cancellation</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-fairway-800/90">
            <li>Pay in full, or a {DEPOSIT_PCT}% deposit by M-Pesa with the balance at check-in.</li>
            <li>Rooms are held for 15 minutes while you pay.</li>
            <li>Changes and cancellations via WhatsApp or your account; see the <Link href="/policies" className="underline">policy</Link>.</li>
            <li>You'll receive a confirmation and a day-before reminder with directions and check-in time.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
