import type { Metadata } from "next";
import { db } from "@/db";
import { asc } from "drizzle-orm";
import * as s from "@/db/schema";
import { IMG } from "@/lib/constants";
import CarWashBooker from "@/components/CarWashBooker";
import { JsonLd, PageHero, SectionTitle } from "@/components/Bits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Car wash in Nakuru — Play & Wash",
  description: "Book a car wash slot at Nakuru Golf Club. Exterior, full wash, interior detail and engine wash. Add it to a round, event or stay.",
};

export default async function CarWashPage() {
  const services = await db.select().from(s.carWashServices).orderBy(asc(s.carWashServices.price));
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "AutoWash", name: "Nakuru Golf Club Car Wash", address: "Showground Road, Nakuru, Kenya" }} />
      <PageHero title="Car wash — Play & Wash" intro="Book a slot, play your round, and your car is ready when you finish. We'll message you on WhatsApp when it's done." image={IMG.wash[0]} />
      <div className="container-x section">
        <SectionTitle title="Book your wash" intro="Choose a service, a slot and your vehicle details." />
        <CarWashBooker services={services.map((w) => ({ id: w.id, name: w.name, description: w.description || "", price: w.price, durationMins: w.durationMins }))} />
      </div>
    </>
  );
}
