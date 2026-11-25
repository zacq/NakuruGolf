import Link from "next/link";
import { EVENT_TYPES, eventDates, eventStatus, kes } from "@/lib/constants";
import type { EventRow } from "@/lib/queries";

export default function EventCard({ e, golfers, from }: { e: EventRow; golfers: number; from?: number }) {
  const st = eventStatus(e);
  const left = Math.max(0, e.capacity - golfers);
  return (
    <Link href={`/events/${e.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-fairway-100 bg-white shadow-sm transition hover:shadow-lg">
      <div className="relative flex h-36 items-end bg-gradient-to-br from-fairway-800 via-fairway-700 to-fairway-500 p-4 text-white">
        {e.banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.banner} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        )}
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase ${st === "ongoing" ? "bg-red-600" : st === "upcoming" ? "bg-gold-500 text-fairway-900" : "bg-white/80 text-fairway-900"}`}>{st}</span>
        {e.titleSponsor && <span className="absolute right-3 top-3 rounded-lg bg-white px-2.5 py-1 font-serif text-sm font-bold text-fairway-900">{e.titleSponsor}</span>}
        <h3 className="relative text-xl font-bold leading-tight drop-shadow">{e.name}</h3>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 text-sm">
        <p className="font-semibold text-fairway-900">📅 {eventDates(e.startsAt, e.endsAt)}</p>
        <p className="text-fairway-800/80">{e.format}</p>
        <p className="chip w-fit">{EVENT_TYPES[e.type]}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-bold text-fairway-800">{from ? `Entry from ${kes(from)}` : "Free / enquire"}</span>
          {st !== "past" && <span className={`text-xs font-semibold ${left < 20 ? "text-red-700" : "text-fairway-700"}`}>{left > 0 ? `${left} spots left` : "Full"}</span>}
        </div>
        <span className="btn-primary mt-1 w-full group-hover:bg-fairway-800">{st === "past" ? "Results & photos" : st === "ongoing" ? "Live info & tickets" : "Register now"}</span>
      </div>
    </Link>
  );
}
