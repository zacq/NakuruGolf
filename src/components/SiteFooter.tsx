import Link from "next/link";
import { db } from "@/db";
import * as s from "@/db/schema";
import { CLUB, SOCIALS } from "@/lib/constants";
import { PartnerBadge } from "./PartnerBadge";
import { Crest } from "./SiteHeader";

const order = ["platinum", "gold", "silver", "event", "community"];

export default async function SiteFooter() {
  const partners = (await db.select().from(s.partners)).sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));
  return (
    <footer className="mt-10 bg-fairway-900 text-fairway-100">
      <div className="container-x py-8">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-gold-400">Our partners</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {partners.map((p) => (
            <PartnerBadge key={p.id} name={p.name} slug={p.slug} color={p.color} logo={p.logo} size="sm" />
          ))}
          <Link href="/partners#packages" className="inline-flex h-12 items-center rounded-xl border-2 border-dashed border-gold-500/60 px-4 text-sm font-semibold text-gold-300">
            + Partner with us
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2"><Crest size={36} /><span className="font-serif text-lg text-white">Nakuru Golf Club</span></div>
            <p className="mt-3 text-sm leading-relaxed">{CLUB.address}</p>
            <a className="mt-2 inline-block text-sm font-semibold text-gold-300 underline" target="_blank" rel="noopener" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLUB.mapQuery)}`}>Get directions</a>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-white">Contact</p>
            <a className="flex min-h-12 items-center" href={`tel:${CLUB.phone}`}>📞 {CLUB.phoneDisplay}</a>
            <a className="flex min-h-12 items-center" href={`mailto:${CLUB.email}`}>✉️ {CLUB.email}</a>
            <p className="mt-1">{CLUB.hours}</p>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-white">Explore</p>
            <div className="grid grid-cols-2 gap-x-2">
              {[["Events", "/events"], ["Stay", "/stay"], ["Dine", "/dine"], ["Car Wash", "/car-wash"], ["Golf", "/golf"], ["Shop", "/shop"], ["Membership", "/membership"], ["Partners", "/partners"], ["Venue hire", "/venue"], ["News", "/news"]].map(([l, h]) => (
                <Link key={h} href={h} className="flex min-h-12 items-center hover:text-gold-300">{l}</Link>
              ))}
            </div>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-white">Follow & policies</p>
            <div className="flex flex-wrap gap-x-4">
              {SOCIALS.map(([l, h]) => <a key={l} className="flex min-h-12 items-center" href={h} target="_blank" rel="noopener">{l}</a>)}
            </div>
            <Link className="flex min-h-12 items-center" href="/policies">Cancellation, privacy & data policy</Link>
            <Link className="flex min-h-12 items-center" href="/admin">Staff login</Link>
          </div>
        </div>
        <p className="border-t border-white/10 py-4 text-center text-xs text-fairway-200">© {new Date().getFullYear()} Nakuru Golf Club · Website & booking platform by NeuraFlow</p>
      </div>
    </footer>
  );
}
