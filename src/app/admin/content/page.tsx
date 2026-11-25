import { db } from "@/db";
import { asc, desc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { COURSE_NOTE_DEFAULT, kes } from "@/lib/constants";
import { addEntryType, addManualIncome, addMenuItem, addNews, saveResults, setMenuAvailability, saveSetting, updatePrice, updateStock } from "../actions";

export const dynamic = "force-dynamic";

function PriceRow({ kind, id, name, price, col }: { kind: string; id: number; name: string; price: number; col?: string }) {
  return (
    <form action={updatePrice} className="flex items-center justify-between gap-2 border-b border-fairway-100 py-1.5 text-sm">
      <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} />{col && <input type="hidden" name="col" value={col} />}
      <span className="min-w-0 truncate">{name}</span>
      <span className="flex shrink-0 items-center gap-2"><input name="price" type="number" inputMode="numeric" defaultValue={price} className="field !min-h-10 w-28 !py-1" aria-label={`${name} price`} /><button className="btn-outline !min-h-10 px-3 text-sm">Save</button></span>
    </form>
  );
}

export default async function ContentPage() {
  const [notice, events, rooms, menu, wash, products, entries, income, greens, lessons, cats, washCap] = await Promise.all([
    db.select().from(s.settings).where(eq(s.settings.key, "course_notice")),
    db.select().from(s.events).orderBy(asc(s.events.startsAt)),
    db.select().from(s.roomTypes).orderBy(asc(s.roomTypes.id)),
    db.select().from(s.menuItems).orderBy(asc(s.menuItems.id)),
    db.select().from(s.carWashServices).orderBy(asc(s.carWashServices.id)),
    db.select().from(s.products).orderBy(asc(s.products.id)),
    db.select().from(s.entryTypes).orderBy(asc(s.entryTypes.eventId), asc(s.entryTypes.id)),
    db.select().from(s.manualIncome).orderBy(desc(s.manualIncome.receivedAt)).limit(15),
    db.select().from(s.greenFees).orderBy(asc(s.greenFees.id)),
    db.select().from(s.lessons).orderBy(asc(s.lessons.id)),
    db.select().from(s.membershipCategories).orderBy(asc(s.membershipCategories.id)),
    db.select().from(s.settings).where(eq(s.settings.key, "carwash_capacity")),
  ]);
  return (
    <div className="grid gap-8">
      <h1 className="text-2xl font-bold text-fairway-900">Content & prices</h1>
      <p className="-mt-6 text-sm text-fairway-800/70">Every price and stock change is written to the audit log.</p>

      <section className="card">
        <h2 className="mb-2 text-lg font-bold">Course condition notice</h2>
        <form action={saveSetting} className="grid gap-2"><input type="hidden" name="key" value="course_notice" /><textarea name="value" rows={2} defaultValue={notice[0]?.value || COURSE_NOTE_DEFAULT} className="field" /><button className="btn-primary w-fit">Publish notice</button></form>
        <form action={saveSetting} className="mt-4 flex flex-wrap items-end gap-2"><input type="hidden" name="key" value="carwash_capacity" /><label className="text-sm font-semibold">Car wash capacity per slot<input name="value" type="number" min={1} defaultValue={washCap[0]?.value || 3} className="field mt-1 w-28" /></label><button className="btn-outline">Save</button></form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card"><h2 className="mb-2 text-lg font-bold">Room rates (per night)</h2>{rooms.flatMap((r) => ([["rate", "", r.rate], ["memberRate", "member", r.memberRate], ["corporateRate", "corporate", r.corporateRate], ["eventRate", "event", r.eventRate]] as const).map(([col, l, v]) => <PriceRow key={r.id + col} kind="rooms" col={col} id={r.id} name={`${r.name}${l ? ` · ${l}` : ""}`} price={v ?? r.rate} />))}</div>
        <div className="card"><h2 className="mb-2 text-lg font-bold">Car wash prices</h2>{wash.map((r) => <PriceRow key={r.id} kind="carwash" id={r.id} name={r.name} price={r.price} />)}<h2 className="mb-2 mt-5 text-lg font-bold">Green fees</h2>{greens.flatMap((r) => ([["weekday9", "weekday 9", r.weekday9], ["weekday18", "weekday 18", r.weekday18], ["weekend9", "weekend 9", r.weekend9], ["weekend18", "weekend 18", r.weekend18]] as const).map(([col, l, v]) => <PriceRow key={r.id + col} kind="greenfees" col={col} id={r.id} name={`${r.category} · ${l}`} price={v} />))}<h2 className="mb-2 mt-5 text-lg font-bold">Membership fees</h2>{cats.flatMap((r) => ([["joiningFee", "joining", r.joiningFee], ["annualFee", "annual", r.annualFee]] as const).map(([col, l, v]) => <PriceRow key={r.id + col} kind="membership" col={col} id={r.id} name={`${r.name} · ${l}`} price={v} />))}<h2 className="mb-2 mt-5 text-lg font-bold">Lessons</h2>{lessons.map((r) => <PriceRow key={r.id} kind="lessons" id={r.id} name={r.name} price={r.price} />)}</div>
        <div className="card"><h2 className="mb-2 text-lg font-bold">Menu prices</h2>{menu.map((r) => <div key={r.id}><PriceRow kind="menu" id={r.id} name={`${r.category}: ${r.name}`} price={r.price} /><form action={setMenuAvailability}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="available" value={r.available ? "0" : "1"} /><button className="min-h-11 text-xs underline">{r.available ? "On the menu: take off" : "Off the menu: put back"}</button></form></div>)}<form action={addMenuItem} className="mt-3 grid gap-2"><input name="name" required placeholder="New dish" className="field" /><input name="description" placeholder="Description" className="field" /><select name="category" aria-label="Category" className="field">{["breakfast", "lunch", "dinner", "snacks"].map((c) => <option key={c}>{c}</option>)}</select><input name="price" type="number" required min={1} placeholder="Price" className="field" /><input name="memberPrice" type="number" min={0} placeholder="Member price (optional)" className="field" /><button className="btn-primary">Add to menu</button></form></div>
        <div className="card"><h2 className="mb-2 text-lg font-bold">Event entry & ticket prices</h2>{entries.map((r) => <PriceRow key={r.id} kind="entries" id={r.id} name={`${events.find((e) => e.id === r.eventId)?.name.slice(0, 18)}: ${r.name}`} price={r.price} />)}</div>
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-bold">Shop products: price & stock</h2>
        {products.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-fairway-100 py-1.5 text-sm">
            <span className="min-w-0 flex-1 truncate">{p.name} <span className="text-fairway-800/60">· {p.stock == null ? "unlimited" : `${p.stock} in stock`}</span></span>
            <form action={updatePrice} className="flex gap-2"><input type="hidden" name="kind" value="products" /><input type="hidden" name="id" value={p.id} /><input name="price" type="number" defaultValue={p.price} className="field !min-h-10 w-24 !py-1" aria-label="Price" /><button className="btn-outline !min-h-10 px-3 text-sm">Price</button></form>
            {p.stock != null && <form action={updateStock} className="flex gap-2"><input type="hidden" name="id" value={p.id} /><input name="stock" type="number" defaultValue={p.stock} className="field !min-h-10 w-20 !py-1" aria-label="Stock" /><button className="btn-outline !min-h-10 px-3 text-sm">Stock</button></form>}
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-bold">Add an entry or ticket type to an event</h2>
        <form action={addEntryType} className="grid gap-2 sm:grid-cols-3">
          <select name="eventId" className="field sm:col-span-3">{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          <input name="name" required placeholder="Name e.g. Early-bird individual" className="field sm:col-span-2" />
          <select name="kind" className="field"><option value="entry">Entry</option><option value="ticket">Ticket</option></select>
          <input name="price" type="number" required placeholder="Price" className="field" /><input name="priceMember" type="number" placeholder="Member price" className="field" /><input name="players" type="number" defaultValue={1} min={1} className="field" aria-label="Players per entry" />
          <input name="cap" type="number" placeholder="Cap" className="field" /><input name="deadline" type="date" className="field" aria-label="Deadline" />
          <button className="btn-primary">Add</button>
        </form>
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-bold">Post event results</h2>
        <form action={saveResults} className="grid gap-2"><select name="eventId" className="field">{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select><textarea name="results" rows={3} className="field" placeholder="Winners, scores, thank-you to sponsors…" /><button className="btn-primary w-fit">Publish results</button></form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-lg font-bold">Record sponsorship / venue income</h2>
          <form action={addManualIncome} className="grid gap-2">
            <select name="stream" className="field"><option value="sponsorship">Sponsorship (contract)</option><option value="venue">Venue hire</option></select>
            <input name="description" required placeholder="Description e.g. KCB hospitality partner" className="field" />
            <input name="amount" type="number" required placeholder="Amount (KSh)" className="field" />
            <select name="eventId" className="field"><option value="0">No specific event</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
            <button className="btn-primary">Record</button>
          </form>
          <ul className="mt-3 text-sm">{income.map((i) => <li key={i.id} className="flex justify-between border-b border-fairway-100 py-1"><span>{i.stream}: {i.description}</span><span>{kes(i.amount)}</span></li>)}</ul>
        </div>
        <div className="card">
          <h2 className="mb-2 text-lg font-bold">Publish a news post</h2>
          <form action={addNews} className="grid gap-2">
            <input name="title" required placeholder="Title" className="field" />
            <select name="category" className="field">{["club", "tournaments", "course", "members"].map((c) => <option key={c}>{c}</option>)}</select>
            <textarea name="body" required rows={4} placeholder="Body" className="field" />
            <input name="image" placeholder="Image URL (optional)" className="field" />
            <button className="btn-primary">Publish</button>
          </form>
        </div>
      </section>
    </div>
  );
}
