import type { Metadata } from "next";
import { db } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { IMG, kes } from "@/lib/constants";
import { LessonBooker, TeeTimeForm } from "@/components/GolfForms";
import { Img, PageHero, SectionTitle } from "@/components/Bits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Golf: green fees, tee times & lessons in Nakuru",
  description: "Green fees, tee-time requests and golf lessons at Nakuru Golf Club. Pay online by M-Pesa.",
};

export default async function GolfPage() {
  const [fees, extras, lessons] = await Promise.all([
    db.select().from(s.greenFees).orderBy(asc(s.greenFees.id)),
    db.select().from(s.products).where(and(eq(s.products.category, "golf"))).orderBy(asc(s.products.id)),
    db.select().from(s.lessons).orderBy(asc(s.lessons.id)),
  ]);
  return (
    <>
      <PageHero title="Play golf at Nakuru" intro="Request a tee time and pay your green fees online. Staff confirm your slot on WhatsApp." image={IMG.golf[0]} />
      <div className="container-x section grid gap-12">
        <section>
          <SectionTitle title="Green fees" intro="Rates per player." />
          <div className="overflow-x-auto rounded-2xl border border-fairway-100 bg-white">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="bg-fairway-800 text-white"><tr><th className="p-3">Category</th><th className="p-3">Weekday 9</th><th className="p-3">Weekday 18</th><th className="p-3">Weekend 9</th><th className="p-3">Weekend 18</th></tr></thead>
              <tbody>
                {fees.map((f) => (
                  <tr key={f.id} className="border-t border-fairway-100"><td className="p-3 font-semibold">{f.category}</td><td className="p-3">{kes(f.weekday9)}</td><td className="p-3">{kes(f.weekday18)}</td><td className="p-3">{kes(f.weekend9)}</td><td className="p-3">{kes(f.weekend18)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section id="tee-time" className="scroll-mt-20 grid gap-6 md:grid-cols-2">
          <div>
            <SectionTitle eyebrow="Tee times" title="Request a tee time" intro="Choose date, preferred time and players, add caddie, clubs, buggy or range balls, and pay green fees. Event days may be blocked: we'll offer the nearest slot." />
            <Img src={IMG.golf[1]} alt="Golfer on the fairway" className="hidden h-64 w-full rounded-2xl md:block" />
          </div>
          <TeeTimeForm fees={fees} extras={extras.map((e) => ({ id: e.id, name: e.name, description: e.description || "", price: e.price }))} />
        </section>
        <section id="lessons" className="scroll-mt-20">
          <SectionTitle eyebrow="Coaching & academy" title="Golf lessons" intro="Private, group, junior and ladies' coaching with the club professional." />
          <LessonBooker lessons={lessons.map((l) => ({ id: l.id, name: l.name, coach: l.coach || "Club Professional", description: l.description || "", price: l.price }))} />
        </section>
      </div>
    </>
  );
}
