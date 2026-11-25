import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { asc } from "drizzle-orm";
import * as s from "@/db/schema";
import MembershipForm from "@/components/MembershipForm";
import { IMG } from "@/lib/constants";
import { PageHero, SectionTitle } from "@/components/Bits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Membership — join Nakuru Golf Club", description: "Membership categories, fees and online application for Nakuru Golf Club. Renew online by M-Pesa." };

export default async function MembershipPage() {
  const cats = await db.select().from(s.membershipCategories).orderBy(asc(s.membershipCategories.id));
  return (
    <>
      <PageHero title="Become a member" intro="Apply online in minutes. After committee approval, pay your joining fee and first subscription by M-Pesa." image={IMG.golf[4]}>
        <a href="#apply" className="btn-gold">Apply now</a>
        <Link href="/account" className="btn-light">Renew or check status</Link>
      </PageHero>
      <div className="container-x section grid gap-8">
        <section>
          <SectionTitle title="How it works" />
          <ol className="grid gap-3 sm:grid-cols-4">
            {["Apply online with ID and photo", "Committee reviews your application", "Approved: pay joining fee + subscription", "Play, compete and enjoy member rates"].map((t, i) => (
              <li key={t} className="card"><span className="font-serif text-3xl font-bold text-gold-500">{i + 1}</span><p className="mt-1 text-sm font-medium">{t}</p></li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-fairway-800/80">Members signed in with their phone number get member prices on event entries, rooms, meals and guest green fees. Renewal reminders are sent 30 and 7 days before your due date.</p>
        </section>
        <section id="apply" className="scroll-mt-20">
          <SectionTitle title="Application" />
          <MembershipForm cats={cats.map((c) => ({ id: c.id, name: c.name, benefits: c.benefits || "", joiningFee: c.joiningFee, annualFee: c.annualFee }))} />
        </section>
      </div>
    </>
  );
}
