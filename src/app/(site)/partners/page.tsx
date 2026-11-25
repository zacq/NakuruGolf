import type { Metadata } from "next";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { TIERS } from "@/lib/constants";
import { PartnerBadge } from "@/components/PartnerBadge";
import LeadForm from "@/components/LeadForm";
import { PageHero, SectionTitle } from "@/components/Bits";
import { kes } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Partners & sponsorship", description: "Nakuru Golf Club partners and sponsorship packages: title, hole, prize, hospitality and annual club partner." };

export default async function PartnersPage() {
  const [partners, pkgs, events, deck] = await Promise.all([db.select().from(s.partners), db.select().from(s.sponsorPackages), db.select().from(s.events), db.select().from(s.settings).where(eq(s.settings.key, "sponsor_deck_url"))]);
  const deckUrl = /^https?:\/\//.test(deck[0]?.value || "") ? deck[0].value : "";
  return (
    <>
      <PageHero title="Partners & sponsors" intro="The organisations that make our events and club possible, and how your brand can join them.">
        <a href="#packages" className="btn-gold">Partner with us</a>
      </PageHero>
      <div className="container-x section grid gap-12">
        <section>
          {Object.entries(TIERS).map(([k, label]) => {
            const list = partners.filter((p) => p.tier === k);
            return (
              <div key={k} className="mb-8">
                <h2 className="mb-3 text-xl font-bold text-fairway-900">{label}</h2>
                {list.length === 0 ? (
                  <p className="rounded-xl border-2 border-dashed border-fairway-200 p-4 text-sm text-fairway-800/70">This tier is open. <a href="#packages" className="font-semibold underline">Become a {label.replace(" Partners", "")} partner</a>.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((p) => (
                      <div key={p.id} className="card grid gap-3">
                        <PartnerBadge name={p.name} slug={p.slug} color={p.color} logo={p.logo} size="lg" />
                        <p className="text-sm">{p.description}</p>
                        <p className="text-xs text-fairway-800/60">{p.years}</p>
                        <div className="flex gap-3 text-sm font-semibold"><a className="underline" href={`/partners/${p.slug}`}>Profile</a>{p.website && <a className="underline" href={p.website} target="_blank" rel="noopener">Website ↗</a>}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
        <section id="packages" className="scroll-mt-20">
          <SectionTitle eyebrow="Partner with us" title="Sponsorship packages" intro="Prices are agreed with the club for each opportunity. Tell us what you have in mind and we'll respond with options." />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pkgs.map((p) => (
              <div key={p.id} className="card"><h3 className="text-lg font-bold text-fairway-900">{p.name}</h3><p className="mt-1 text-sm">{p.benefits}</p><p className="mt-2 text-sm font-semibold text-gold-600">{p.price ? kes(p.price) : "Price on enquiry"}</p></div>
            ))}
          </div>
          <p className="mt-3 text-sm">Your brand appears on event pages, tickets and the partners wall. {deckUrl ? <a href={deckUrl} target="_blank" rel="noopener" className="font-semibold underline">Download the sponsorship deck (PDF)</a> : "Ask for the sponsorship deck in your enquiry and we will send the PDF."}</p>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <SectionTitle title="Sponsorship enquiry" intro="Our events team will reply with options." />
          <div className="card">
            <LeadForm type="sponsorship" event="partners-page" submit="Send sponsorship enquiry" fields={[
              { name: "package", label: "Package of interest", type: "select", options: pkgs.map((p) => p.name) },
              { name: "event", label: "Event", type: "select", options: ["Any / annual", ...events.map((e) => e.name)] },
              { name: "budget", label: "Budget (KSh)", type: "number" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]} />
          </div>
        </section>
      </div>
    </>
  );
}
