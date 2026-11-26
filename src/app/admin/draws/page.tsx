import { db } from "@/db";
import { asc, eq, inArray, sql } from "drizzle-orm";
import * as s from "@/db/schema";
import { TZ, eventStatus, kes } from "@/lib/constants";
import { DRAW_CAPACITY, DRAW_FEE, PLAYERS_PER_TEE, teeClock } from "@/lib/draw";
import { closeDrawEntries, createTeeTimes, deleteOpenTeeTime, drawTeeTimes, saveSetting } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminDraws() {
  const events = (await db.select().from(s.events).orderBy(asc(s.events.startsAt))).filter((e) => eventStatus(e) !== "past");
  const ids = events.map((e) => e.id);
  const [tees, counts, board] = await Promise.all([
    ids.length ? db.select().from(s.teeTimes).where(inArray(s.teeTimes.eventId, ids)).orderBy(asc(s.teeTimes.startsAt)) : [],
    db.select({ id: s.ballotEntries.teeTimeId, n: sql<number>`count(*)::int` }).from(s.ballotEntries).groupBy(s.ballotEntries.teeTimeId),
    db.select().from(s.settings).where(inArray(s.settings.key, ["hdid_leaderboard", "hdid_title"])),
  ]);
  const n = (id: number) => counts.find((c) => c.id === id)?.n || 0;
  const [revenue] = await db.select({ total: sql<number>`coalesce(sum(${s.orderLines.total}),0)::int` }).from(s.orderLines).innerJoin(s.orders, eq(s.orders.id, s.orderLines.orderId)).where(sql`${s.orderLines.stream} = 'ballot' and ${s.orders.status} = 'paid'`);
  const firstDay = (d: Date) => new Date(d).toLocaleString("sv-SE", { timeZone: TZ }).slice(0, 10);
  const get = (k: string) => board.find((b) => b.key === k)?.value || "";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-fairway-900">Tee-time draws</h1>
        <p className="text-sm text-fairway-800/70">Entries exist only after Safaricom confirms the M-Pesa payment, so every row below has a real receipt. Draw fees collected: <strong>{kes(revenue.total)}</strong>.</p>
      </div>

      {events.map((e) => {
        const list = tees.filter((t) => t.eventId === e.id);
        const open = list.filter((t) => t.status === "open" && n(t.id) > 0);
        const locked = list.filter((t) => t.status === "locked");
        return (
          <section key={e.id} className="card grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{e.name}</h2>
              {list.length > 0 && <a className="btn-outline min-h-11 text-sm" href={`/api/admin/export?type=startsheet&eventId=${e.id}`}>Start sheet CSV for HowDidiDo</a>}
            </div>
            {list.length === 0 ? (
              <form action={createTeeTimes} className="grid gap-2 sm:grid-cols-3">
                <input type="hidden" name="eventId" value={e.id} />
                <label className="text-sm font-semibold">First tee time<input name="first" type="datetime-local" required defaultValue={`${firstDay(e.startsAt)}T06:30`} className="field mt-1 font-normal" /></label>
                <label className="text-sm font-semibold">Number of tee times<input name="count" type="number" min={1} max={100} defaultValue={50} className="field mt-1 font-normal" /></label>
                <label className="text-sm font-semibold">Minutes apart<input name="gap" type="number" min={5} max={30} defaultValue={8} className="field mt-1 font-normal" /></label>
                <label className="text-sm font-semibold">Entries per tee time<input name="capacity" type="number" min={1} defaultValue={DRAW_CAPACITY} className="field mt-1 font-normal" /></label>
                <label className="text-sm font-semibold">Players drawn<input name="players" type="number" min={1} max={4} defaultValue={PLAYERS_PER_TEE} className="field mt-1 font-normal" /></label>
                <label className="text-sm font-semibold">Draw fee (KSh)<input name="fee" type="number" min={1} defaultValue={DRAW_FEE} className="field mt-1 font-normal" /></label>
                <button className="btn-primary sm:col-span-3">Create tee times</button>
              </form>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {open.length > 0 && <form action={closeDrawEntries}>{open.map((t) => <input key={t.id} type="hidden" name="id" value={t.id} />)}<button className="btn-outline">Close entries now ({open.length} tee times with entries)</button></form>}
                  {locked.length > 0 && <form action={drawTeeTimes}>{locked.map((t) => <input key={t.id} type="hidden" name="id" value={t.id} />)}<button className="btn-gold">Run draw for {locked.length} closed tee times</button></form>}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {list.map((t) => (
                    <div key={t.id} className="rounded-xl border border-fairway-100 bg-fairway-50 p-2 text-sm">
                      <p className="font-bold">{teeClock(t.startsAt)} <span className="text-xs font-normal capitalize">{t.status}</span></p>
                      <p>{n(t.id)}/{t.capacity} · {kes(t.fee)}</p>
                      {t.status === "open" && n(t.id) === 0 && <form action={deleteOpenTeeTime}><input type="hidden" name="id" value={t.id} /><button className="min-h-11 text-xs underline">Remove</button></form>}
                      {t.status === "locked" && <form action={drawTeeTimes}><input type="hidden" name="id" value={t.id} /><button className="min-h-11 text-xs font-semibold underline">Draw now</button></form>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        );
      })}

      <section className="card grid gap-3">
        <h2 className="text-lg font-bold">HowDidiDo leaderboard on the home page</h2>
        <p className="text-sm text-fairway-800/70">In HowDidiDo, export or copy the club leaderboard and paste it here. The first row must be headings such as Pos, Name, Handicap, Points.</p>
        <form action={saveSetting} className="flex flex-wrap gap-2"><input type="hidden" name="key" value="hdid_title" /><input name="value" aria-label="Leaderboard title" defaultValue={get("hdid_title") || "Nakuru GC leaderboard"} className="field sm:max-w-md" /><button className="btn-outline">Save title</button></form>
        <form action={saveSetting} className="grid gap-2"><input type="hidden" name="key" value="hdid_leaderboard" /><textarea name="value" rows={8} aria-label="Leaderboard CSV" defaultValue={get("hdid_leaderboard")} className="field font-mono text-sm" /><button className="btn-primary w-fit">Publish leaderboard</button></form>
      </section>
    </div>
  );
}
