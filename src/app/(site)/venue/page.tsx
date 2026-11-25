import type { Metadata } from "next";
import { IMG } from "@/lib/constants";
import LeadForm from "@/components/LeadForm";
import { Img, PageHero, SectionTitle } from "@/components/Bits";

export const metadata: Metadata = { title: "Venue & corporate golf day hire in Nakuru", description: "Host a corporate golf day, conference or function at Nakuru Golf Club: golf, rooms, meals and car wash in one package." };

const venues = [
  { name: "Clubhouse Hall", cap: "Up to 150 guests", img: IMG.food[0] },
  { name: "Garden Marquee Lawn", cap: "Up to 300 guests", img: IMG.course },
  { name: "Boardroom", cap: "Up to 20 delegates", img: IMG.rooms[2] },
];

export default function VenuePage() {
  return (
    <>
      <PageHero title="Venue & corporate hire" intro="Build a package of golf, rooms, meals and car wash for your team, then send us your enquiry." image={IMG.golf[3]} />
      <div className="container-x section grid gap-10">
        <section>
          <SectionTitle title="Venues" intro="Capacities are indicative; the events team confirms final layouts." />
          <div className="grid gap-4 md:grid-cols-3">
            {venues.map((v) => (
              <div key={v.name} className="overflow-hidden rounded-2xl border border-fairway-100 bg-white"><Img src={v.img} alt={v.name} className="h-40 w-full" /><div className="p-4"><p className="font-serif text-lg font-bold">{v.name}</p><p className="text-sm text-fairway-800/70">{v.cap}</p></div></div>
            ))}
          </div>
        </section>
        <section className="grid gap-6 md:grid-cols-2">
          <div>
            <SectionTitle title="Package builder" />
            <ul className="grid gap-2">{["⛳ Golf: team entries & green fees", "🛏️ Rooms: a block for your guests", "🍽️ Meals: breakfast, lunch, gala dinner", "🚗 Car wash for every player", "🏷️ Branding & prizes"].map((x) => <li key={x} className="card !p-3 font-medium">{x}</li>)}</ul>
          </div>
          <div className="card">
            <LeadForm type="venue" submit="Send venue enquiry" fields={[
              { name: "date", label: "Preferred date", type: "date", required: true },
              { name: "guests", label: "Number of guests", type: "number", required: true },
              { name: "budget", label: "Budget (KSh)", type: "number" },
              { name: "package", label: "What do you need?", type: "select", options: ["Corporate golf day", "Golf + rooms + meals", "Conference / meeting", "Wedding / function", "Other"] },
              { name: "notes", label: "Notes", type: "textarea" },
            ]} />
          </div>
        </section>
      </div>
    </>
  );
}
