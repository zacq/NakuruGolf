import { db } from "@/db";
import { and, asc, eq, gt, gte, inArray, lte, or, sql } from "drizzle-orm";
import * as s from "@/db/schema";
import { todayStr } from "@/lib/commerce";
import { plusDay } from "@/lib/queries";
import { addManualRoomBooking, setBookingStatus } from "../actions";

export const dynamic = "force-dynamic";

type B = typeof s.bookings.$inferSelect;

function StatusForm({ b, options }: { b: B; options: [string, string][] }) {
  return (
    <form action={setBookingStatus} className="flex flex-wrap gap-2">
      <input type="hidden" name="id" value={b.id} />
      {options.map(([v, l]) => <button key={v} name="status" value={v} className="btn-outline !min-h-11 px-3 text-sm">{l}</button>)}
    </form>
  );
}

function Row({ b, extra, children }: { b: B; extra?: string; children?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-fairway-100 bg-white p-3 text-sm">
      <div><p className="font-semibold">{b.time ? `${b.time} · ` : ""}{b.label} <span className="chip capitalize">{b.status}</span></p><p className="text-fairway-800/70">{b.name || "—"} {b.phone ? `· +${b.phone}` : ""} · {b.guests} guest{b.guests > 1 ? "s" : ""}{b.qty > 1 ? ` · qty ${b.qty}` : ""} {extra}</p></div>
      {children}
    </li>
  );
}

export default async function OpsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const today = todayStr();
  const act = or(inArray(s.bookings.status, ["confirmed", "completed"]), and(eq(s.bookings.status, "held"), gt(s.bookings.holdExpires, sql`now()`)));
  const [rooms, roomTypes, tables, meals, washes, tees, upcomingRooms] = await Promise.all([
    db.select().from(s.bookings).where(and(eq(s.bookings.kind, "room"), act, lte(s.bookings.date, today), gte(s.bookings.endDate, today))).orderBy(asc(s.bookings.date)),
    db.select().from(s.roomTypes),
    db.select().from(s.bookings).where(and(eq(s.bookings.kind, "table"), act, eq(s.bookings.date, today))).orderBy(asc(s.bookings.time)),
    db.select().from(s.bookings).where(and(eq(s.bookings.kind, "meal"), inArray(s.bookings.status, ["confirmed", "completed"]), eq(s.bookings.date, today))).orderBy(asc(s.bookings.time)),
    db.select().from(s.bookings).where(and(eq(s.bookings.kind, "carwash"), inArray(s.bookings.status, ["confirmed", "completed"]), eq(s.bookings.date, today))).orderBy(asc(s.bookings.time)),
    db.select().from(s.bookings).where(and(inArray(s.bookings.kind, ["teetime", "lesson"]), inArray(s.bookings.status, ["requested", "confirmed"]), gte(s.bookings.date, today))).orderBy(asc(s.bookings.date), asc(s.bookings.time)),
    db.select().from(s.bookings).where(and(eq(s.bookings.kind, "room"), act, gte(s.bookings.date, plusDay(today, 1)))).orderBy(asc(s.bookings.date)).limit(30),
  ]);
  const arrivals = rooms.filter((b) => b.date === today);
  const departures = rooms.filter((b) => b.endDate === today);
  const inHouse = rooms.filter((b) => b.date < today && (b.endDate || "") > today);
  const nowDt = (b: B) => `${b.date}${b.endDate ? " → " + b.endDate : ""}`;

  return (
    <div className="grid gap-10">
      <h1 className="text-2xl font-bold text-fairway-900">Today · {today}</h1>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error === "full" ? "Not added: that room type is already full for those dates." : "Not added: check-out must be after check-in."}</p>}
      <section>
        <h2 className="mb-3 text-xl font-bold">🛏️ Hotel</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {[["Arrivals", arrivals], ["Departures", departures], ["In house", inHouse]].map(([t, l]) => (
            <div key={t as string}><h3 className="mb-2 font-semibold">{t as string} ({(l as B[]).length})</h3><ul className="grid gap-2">{(l as B[]).map((b) => <Row key={b.id} b={b} extra={nowDt(b)} />)}{(l as B[]).length === 0 && <li className="text-sm text-fairway-800/60">None</li>}</ul></div>
          ))}
        </div>
        <details className="card mt-4">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">Manual booking / event hold (keeps the calendar accurate)</summary>
          <form action={addManualRoomBooking} className="mt-3 grid gap-3 sm:grid-cols-2">
            <select name="roomTypeId" className="field">{roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
            <input name="qty" type="number" min={1} defaultValue={1} className="field" aria-label="Rooms" />
            <input name="checkIn" type="date" required className="field" aria-label="Check-in" />
            <input name="checkOut" type="date" required className="field" aria-label="Check-out" />
            <input name="name" placeholder="Guest name or 'Event hold'" className="field" />
            <input name="phone" placeholder="Phone (2547…)" className="field" inputMode="tel" />
            <input name="guests" type="number" min={1} defaultValue={2} className="field" aria-label="Guests" />
            <input name="note" placeholder="Note" className="field" />
            <label className="text-sm sm:col-span-2">Event hold: release automatically on (optional)<input name="release" type="date" className="field mt-1" /></label>
            <button className="btn-primary sm:col-span-2">Add booking</button>
          </form>
        </details>
        {upcomingRooms.length > 0 && <div className="mt-4"><h3 className="mb-2 font-semibold">Upcoming arrivals</h3><ul className="grid gap-2">{upcomingRooms.map((b) => <Row key={b.id} b={b} extra={`${nowDt(b)} · ${b.source}`}><StatusForm b={b} options={[["cancelled", "Cancel"]]} /></Row>)}</ul></div>}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">🍽️ Kitchen</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div><h3 className="mb-2 font-semibold">Table reservations ({tables.length})</h3><ul className="grid gap-2">{tables.map((b) => <Row key={b.id} b={b} />)}{tables.length === 0 && <li className="text-sm text-fairway-800/60">None today</li>}</ul></div>
          <div><h3 className="mb-2 font-semibold">Meal pre-orders ({meals.length})</h3><ul className="grid gap-2">{meals.map((b) => <Row key={b.id} b={b}><StatusForm b={b} options={[["completed", "Served"]]} /></Row>)}{meals.length === 0 && <li className="text-sm text-fairway-800/60">None today</li>}</ul></div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">🚗 Car wash queue ({washes.length})</h2>
        <ul className="grid gap-2">{washes.map((b) => <Row key={b.id} b={b} extra={`· ${String((b.details as Record<string, unknown>)?.vehicleReg || "")} ${String((b.details as Record<string, unknown>)?.vehicleType || "")}`}>{b.status !== "completed" && <StatusForm b={b} options={[["completed", "Car ready ✓ (notify)"]]} />}</Row>)}{washes.length === 0 && <li className="text-sm text-fairway-800/60">No washes booked today</li>}</ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">⛳ Tee-time requests & lessons</h2>
        <ul className="grid gap-2">{tees.map((b) => <Row key={b.id} b={b} extra={`· ${b.kind} ${b.date}`}>{b.status === "requested" && <StatusForm b={b} options={[["confirmed", "Confirm slot (WhatsApp)"], ["cancelled", "Decline"]]} />}</Row>)}{tees.length === 0 && <li className="text-sm text-fairway-800/60">No upcoming requests</li>}</ul>
      </section>
    </div>
  );
}
