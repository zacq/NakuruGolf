import type { Metadata } from "next";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { COURSE_NOTE_DEFAULT, HOLES, IMG } from "@/lib/constants";
import { Img, PageHero, SectionTitle } from "@/components/Bits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "About the club & the course", description: "History, officials and hole-by-hole guide for Nakuru Golf Club, behind Nakuru Show Ground." };

export default async function AboutPage() {
  const [note] = await db.select().from(s.settings).where(eq(s.settings.key, "course_notice"));
  const out = HOLES.slice(0, 9);
  const inn = HOLES.slice(9);
  const sum = (a: typeof HOLES, k: "par" | "yards") => a.reduce((x, h) => x + h[k], 0);
  return (
    <>
      <PageHero title="About Nakuru Golf Club" intro="A welcoming club behind Nakuru Show Ground, hosting members, visiting golfers and some of the region's best corporate golf days." image={IMG.course} />
      <div className="container-x section grid gap-12">
        <section>
          <SectionTitle eyebrow="Heritage" title="Our story" intro="Milestones from the life of the club." />
          <ol className="relative grid gap-4 border-l-4 border-gold-500 pl-5">
            {[["Founding era", "A golf club for Nakuru, set beside the Show Ground."], ["Course & clubhouse growth", "Eighteen holes, a clubhouse, rooms and a restaurant that welcome members and visitors."], ["Home of corporate golf days", "Partners such as KenGen, KCB and Kaishan bring teams to Nakuru each year."], ["2026: online bookings", "Events, rooms, meals, car wash and membership move online with M-Pesa payment."]].map(([t, d]) => (
              <li key={t}><p className="font-serif text-lg font-bold text-fairway-900">{t}</p><p className="text-fairway-800/80">{d}</p></li>
            ))}
          </ol>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <div className="card"><h3 className="text-xl font-bold">Mission</h3><p className="mt-1">To offer a well-kept course, warm hospitality and a home for golf in Nakuru for members, guests and the next generation of players.</p></div>
          <div className="card"><h3 className="text-xl font-bold">Vision</h3><p className="mt-1">The most welcoming and best-run golf club in the Rift Valley.</p></div>
          <div className="card md:col-span-2">
            <h3 className="text-xl font-bold">Officials</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-3">{["Club Captain", "Chairman", "Committee"].map((r) => <li key={r} className="rounded-xl bg-fairway-50 p-3"><p className="font-semibold">{r}</p><p className="text-sm text-fairway-800/70">Contact via reception</p></li>)}</ul>
          </div>
        </section>

        <section id="course" className="scroll-mt-20">
          <SectionTitle eyebrow="The course" title="Hole-by-hole guide" />
          <div className="mb-4 rounded-2xl border-l-4 border-gold-500 bg-gold-400/15 p-4"><p className="text-xs font-bold uppercase tracking-widest text-gold-600">Course condition notice</p><p className="mt-1 font-medium">{note?.value || COURSE_NOTE_DEFAULT}</p></div>
          <div className="grid gap-4 lg:grid-cols-2">
            {([["Out", out], ["In", inn]] as [string, typeof HOLES][]).map(([label, list]) => (
              <div key={label} className="overflow-x-auto rounded-2xl border border-fairway-100 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-fairway-800 text-white"><tr><th className="p-2.5">Hole</th><th className="p-2.5">Par</th><th className="p-2.5">Yds</th><th className="p-2.5">Tip</th></tr></thead>
                  <tbody>
                    {(list as typeof HOLES).map((h) => <tr key={h.hole} className="border-t border-fairway-100 align-top"><td className="p-2.5 font-bold">{h.hole}</td><td className="p-2.5">{h.par}</td><td className="p-2.5">{h.yards}</td><td className="p-2.5 text-fairway-800/80">{h.tip}</td></tr>)}
                    <tr className="border-t-2 border-fairway-200 bg-fairway-50 font-bold"><td className="p-2.5">{label}</td><td className="p-2.5">{sum(list as typeof HOLES, "par")}</td><td className="p-2.5">{sum(list as typeof HOLES, "yards")}</td><td /></tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-fairway-800/60">Yardages and tips are indicative. Please check the official scorecard at the clubhouse.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="card"><h3 className="text-lg font-bold">Local rules</h3><ul className="mt-1 list-disc pl-5 text-sm"><li>Play ready golf; keep pace with the group ahead.</li><li>Rake bunkers, repair pitch marks, replace divots.</li><li>Buggies on cart paths only after rain.</li><li>Mobile phones on silent on the course.</li></ul></div>
            <div className="card"><h3 className="text-lg font-bold">Dress code</h3><p className="mt-1 text-sm">Collared shirts, tailored shorts or trousers, soft-spiked golf shoes. No denim, vests or football kit.</p></div>
          </div>
          <Img src={IMG.mower} alt="Greens maintenance" className="mt-6 h-56 w-full rounded-2xl" />
        </section>
      </div>
    </>
  );
}
