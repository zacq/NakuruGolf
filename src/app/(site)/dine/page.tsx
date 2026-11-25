import type { Metadata } from "next";
import { db } from "@/db";
import { asc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { CLUB, IMG, kes } from "@/lib/constants";
import { MealOrder, TableForm } from "@/components/GolfForms";
import LeadForm from "@/components/LeadForm";
import { Img, JsonLd, PageHero, SectionTitle } from "@/components/Bits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Restaurant & dining in Nakuru",
  description: "Reserve a table, pre-order an after-round meal or request group catering at Nakuru Golf Club restaurant.",
};

const cats = [["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"], ["snacks", "Bar snacks"]];

export default async function DinePage() {
  const items = await db.select().from(s.menuItems).where(eq(s.menuItems.available, true)).orderBy(asc(s.menuItems.id));
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Restaurant", name: `${CLUB.name} Restaurant`, telephone: CLUB.phone, address: CLUB.address, servesCuisine: ["Kenyan", "International"] }} />
      <PageHero title="Dine at the club" intro="Breakfast, lunch, dinner and bar snacks. Reserve a table or pre-order a meal to be ready when you finish your round." image={IMG.food[0]} />
      <div className="container-x section grid gap-12">
        <section id="reserve" className="scroll-mt-20 grid gap-6 md:grid-cols-2">
          <div>
            <SectionTitle eyebrow="Table reservation" title="Reserve a table" intro="Pick a date, time and party size. We'll confirm on WhatsApp." />
            <Img src={IMG.food[1]} alt="Plated steak dinner" className="hidden h-56 w-full rounded-2xl md:block" />
          </div>
          <TableForm />
        </section>

        <section id="preorder" className="scroll-mt-20">
          <SectionTitle eyebrow="Meal pre-orders" title="Order ahead, eat when you finish" intro="Choose when the meal should be ready and pay online. The kitchen sees your order with the time." />
          <MealOrder items={items.map((m) => ({ id: m.id, category: m.category, name: m.name, description: m.description || "", price: m.price }))} />
        </section>

        <section id="menu">
          <SectionTitle title="Menu" />
          <div className="grid gap-4 md:grid-cols-2">
            {cats.map(([k, l]) => (
              <div key={k} className="card">
                <h3 className="mb-2 text-lg font-bold text-fairway-900">{l}</h3>
                <ul className="divide-y divide-fairway-100">
                  {items.filter((m) => m.category === k).map((m) => (
                    <li key={m.id} className="flex justify-between gap-3 py-2"><div><p className="font-semibold">{m.name}</p><p className="text-sm text-fairway-800/70">{m.description}</p></div><p className="shrink-0 font-bold text-fairway-700">{kes(m.price)}</p></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="catering" className="scroll-mt-20 grid gap-6 md:grid-cols-2">
          <SectionTitle eyebrow="Groups & golf days" title="Group catering request" intro="Tell us your headcount and menu choice and the restaurant will send a quote." />
          <div className="card">
            <LeadForm type="catering" submit="Request a quote" fields={[
              { name: "date", label: "Event date", type: "date", required: true },
              { name: "headcount", label: "Headcount", type: "number", required: true },
              { name: "menu", label: "Menu choice", type: "select", options: ["Breakfast", "Lunch buffet", "Dinner / gala", "Cocktail & snacks", "Not sure yet"] },
              { name: "notes", label: "Notes", type: "textarea" },
            ]} />
          </div>
        </section>
      </div>
    </>
  );
}
