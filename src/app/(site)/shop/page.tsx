import type { Metadata } from "next";
import { db } from "@/db";
import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import * as s from "@/db/schema";
import { ProductGrid } from "@/components/GolfForms";
import { JsonLd, PageHero, SectionTitle } from "@/components/Bits";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop club & event merchandise", description: "Nakuru Golf Club polos, caps, balls and event merchandise. Collect at the club." };

export default async function ShopPage() {
  const [club, evt, events] = await Promise.all([
    db.select().from(s.products).where(and(eq(s.products.category, "merch"), isNull(s.products.eventId))).orderBy(asc(s.products.id)),
    db.select().from(s.products).where(and(eq(s.products.category, "merch"), isNotNull(s.products.eventId))).orderBy(asc(s.products.id)),
    db.select().from(s.events),
  ]);
  const view = (p: typeof club[number]) => ({ id: p.id, name: p.name, description: p.description || "", price: p.price, bundlePrice: p.bundlePrice, stock: p.stock, sizes: p.sizes || "", image: p.image || "", eventId: p.eventId });
  const ev = events.find((e) => e.id === evt[0]?.eventId);
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [...club, ...evt].map((p) => ({ "@type": "Product", name: p.name, description: p.description, offers: { "@type": "Offer", price: p.price, priceCurrency: "KES" } })) }} />
      <PageHero title="Club & event shop" intro="Collect at reception or on event day. Polo bundles are discounted when you register for the event." />
      <div className="container-x section grid gap-12">
        {evt.length > 0 && (
          <section>
            <SectionTitle eyebrow="Event collection" title={ev ? `${ev.name} merchandise` : "Event merchandise"} />
            <ProductGrid products={evt.map(view)} />
            {ev && <Link href={`/events/${ev.slug}#register`} className="btn-outline mt-4">Register for the event & get the bundle price</Link>}
          </section>
        )}
        <section>
          <SectionTitle title="Club collection" />
          <ProductGrid products={club.map(view)} />
        </section>
        <p className="text-sm text-fairway-800/70">Fulfilment: collect at the club. Delivery can be arranged on WhatsApp (fee by area). Stock is deducted on payment.</p>
      </div>
    </>
  );
}
