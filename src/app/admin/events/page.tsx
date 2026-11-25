import Link from "next/link";
import { db } from "@/db";
import { asc, desc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { EVENT_TYPES, SPONSOR_ROLES, TZ, eventDates, eventStatus, kes } from "@/lib/constants";
import { addGalleryPhoto, addSponsorship, deleteGalleryPhoto, deleteSponsorship, saveEvent, updateEntryType } from "../actions";

export const dynamic = "force-dynamic";

type E = typeof s.events.$inferSelect;

const local = (d?: Date | null) => (d ? new Date(d).toLocaleString("sv-SE", { timeZone: TZ }).slice(0, 16).replace(" ", "T") : "");

function L({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`text-sm font-semibold ${wide ? "sm:col-span-2" : ""}`}><span className="mb-1 block">{label}</span>{children}</label>;
}

function EventForm({ e }: { e?: E }) {
  const area = (name: keyof E, label: string, rows = 2) => (
    <L label={label} wide><textarea name={name} rows={rows} defaultValue={String(e?.[name] ?? "")} className="field font-normal" /></L>
  );
  return (
    <form action={saveEvent} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={e?.id ?? ""} />
      <L label="Name" wide><input name="name" required defaultValue={e?.name} className="field font-normal" /></L>
      <L label="Type"><select name="type" defaultValue={e?.type} className="field font-normal">{Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></L>
      <L label="Title sponsor"><input name="titleSponsor" defaultValue={e?.titleSponsor || ""} className="field font-normal" /></L>
      <L label="Starts (Nairobi time)"><input name="startsAt" type="datetime-local" required defaultValue={local(e?.startsAt)} className="field font-normal" /></L>
      <L label="Ends (Nairobi time)"><input name="endsAt" type="datetime-local" required defaultValue={local(e?.endsAt)} className="field font-normal" /></L>
      <L label="Format"><input name="format" defaultValue={e?.format} className="field font-normal" /></L>
      <L label="Golfer capacity"><input name="capacity" type="number" inputMode="numeric" min={1} required defaultValue={e?.capacity ?? 100} className="field font-normal" /></L>
      <L label="Venue"><input name="venue" defaultValue={e?.venue ?? "Nakuru Golf Club"} className="field font-normal" /></L>
      <L label="Poster or banner image URL"><input name="banner" type="url" defaultValue={e?.banner || ""} className="field font-normal" /></L>
      {area("summary", "Short summary")}
      {area("description", "Description", 3)}
      {area("schedule", "Schedule, tee sheet and announcements", 3)}
      {area("rules", "Rules")}
      {area("prizes", "Prizes")}
      {area("dressCode", "Dress code")}
      {area("contact", "Contact")}
      <label className="flex min-h-12 items-center gap-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" name="featured" defaultChecked={e?.featured} className="h-5 w-5" /> Feature on the home page</label>
      <button className="btn-primary sm:col-span-2">{e ? "Save event" : "Create event"}</button>
    </form>
  );
}

export default async function AdminEvents() {
  const [events, entries, partners, spons, photos] = await Promise.all([
    db.select().from(s.events).orderBy(desc(s.events.startsAt)),
    db.select().from(s.entryTypes).orderBy(asc(s.entryTypes.id)),
    db.select().from(s.partners).orderBy(asc(s.partners.name)),
    db.select({ id: s.sponsorships.id, eventId: s.sponsorships.eventId, role: s.sponsorships.role, value: s.sponsorships.value, name: s.partners.name }).from(s.sponsorships).innerJoin(s.partners, eq(s.partners.id, s.sponsorships.partnerId)),
    db.select().from(s.galleryPhotos).orderBy(asc(s.galleryPhotos.id)),
  ]);
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold text-fairway-900">Events</h1>
      <p className="-mt-3 text-sm text-fairway-800/70">Upcoming, ongoing and past are set automatically from the dates. Add entry types and post results under Content.</p>
      <details className="card"><summary className="min-h-12 cursor-pointer py-3 font-bold">+ Create an event</summary><EventForm /></details>
      {events.map((e) => (
        <details key={e.id} className="card">
          <summary className="min-h-12 cursor-pointer py-2"><strong>{e.name}</strong> <span className="chip capitalize">{eventStatus(e)}</span><span className="block text-sm text-fairway-800/70">{eventDates(e.startsAt, e.endsAt)}</span></summary>
          <div className="mt-3 grid gap-6">
            <Link href={`/events/${e.slug}`} className="font-semibold underline">View event page</Link>
            <EventForm e={e} />
            <section>
              <h2 className="mb-2 font-bold">Entry and ticket types</h2>
              <div className="grid gap-3">
                {entries.filter((t) => t.eventId === e.id).map((t) => (
                  <form key={t.id} action={updateEntryType} className="grid grid-cols-2 gap-2 rounded-xl bg-fairway-50 p-3 sm:grid-cols-4">
                    <input type="hidden" name="id" value={t.id} />
                    <p className="col-span-2 text-sm font-semibold sm:col-span-4">{t.name} · {t.kind} · {t.sold} sold</p>
                    <L label="Price"><input name="price" type="number" min={0} required defaultValue={t.price} className="field font-normal" /></L>
                    <L label="Member price"><input name="priceMember" type="number" min={0} defaultValue={t.priceMember ?? ""} className="field font-normal" /></L>
                    <L label="Cap"><input name="cap" type="number" min={0} defaultValue={t.cap ?? ""} className="field font-normal" /></L>
                    <L label="Deadline"><input name="deadline" type="datetime-local" defaultValue={local(t.deadline)} className="field font-normal" /></L>
                    <button className="btn-outline col-span-2 text-sm sm:col-span-4">Save {t.name}</button>
                  </form>
                ))}
              </div>
            </section>
            <section>
              <h2 className="mb-2 font-bold">Sponsors</h2>
              <ul className="mb-2 text-sm">
                {spons.filter((x) => x.eventId === e.id).map((x) => (
                  <li key={x.id} className="flex items-center justify-between border-b border-fairway-100"><span>{x.name} · {SPONSOR_ROLES[x.role]}{x.value ? ` · ${kes(x.value)}` : ""}</span><form action={deleteSponsorship}><input type="hidden" name="id" value={x.id} /><button className="min-h-12 px-2 underline">Remove</button></form></li>
                ))}
              </ul>
              <form action={addSponsorship} className="grid gap-2 sm:grid-cols-4">
                <input type="hidden" name="eventId" value={e.id} />
                <select name="partnerId" aria-label="Partner" className="field">{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                <select name="role" aria-label="Role" className="field">{Object.entries(SPONSOR_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <input name="value" type="number" min={0} placeholder="Contract value (KSh)" className="field" />
                <button className="btn-outline">Add sponsor</button>
              </form>
            </section>
            <section>
              <h2 className="mb-2 font-bold">Gallery</h2>
              <ul className="mb-2 text-sm">
                {photos.filter((p) => p.eventId === e.id).map((p) => (
                  <li key={p.id} className="flex items-center justify-between border-b border-fairway-100"><a href={p.url} target="_blank" rel="noopener" className="truncate underline">{p.caption || p.url}</a><form action={deleteGalleryPhoto}><input type="hidden" name="id" value={p.id} /><button className="min-h-12 px-2 underline">Remove</button></form></li>
                ))}
              </ul>
              <form action={addGalleryPhoto} className="grid gap-2 sm:grid-cols-3">
                <input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="album" value={e.name} />
                <input name="url" type="url" required placeholder="Photo URL" className="field" /><input name="caption" placeholder="Caption" className="field" />
                <button className="btn-outline">Add photo</button>
              </form>
            </section>
          </div>
        </details>
      ))}
    </div>
  );
}
