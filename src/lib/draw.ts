import crypto from "crypto";
import { db, type Q } from "@/db";
import { and, asc, eq, sql } from "drizzle-orm";
import * as s from "@/db/schema";
import { CLUB, TZ } from "./constants";
import { notify } from "./notify";

export const DRAW_FEE = 200;
export const DRAW_CAPACITY = 100;
export const PLAYERS_PER_TEE = 4;

export const teeLabel = (d: Date | string) =>
  new Date(d).toLocaleString("en-KE", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
export const teeClock = (d: Date | string) => new Date(d).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/** Order in which entries are drawn: anyone holding the revealed seed can recompute it. */
export const drawRank = (seed: string, entryId: number) => sha256(`${seed}:${entryId}`);

export async function paidEntries(teeTimeId: number, q: Q = db) {
  const [r] = await q.select({ n: sql<number>`count(*)::int` }).from(s.ballotEntries).where(eq(s.ballotEntries.teeTimeId, teeTimeId));
  return r.n;
}

/**
 * Stops entries and commits to the draw: the secret seed is created now and only its fingerprint is published,
 * so the result is fixed before anyone (staff included) knows who will be picked.
 */
export async function lockTeeTime(teeTimeId: number, q: Q = db) {
  const seed = crypto.randomBytes(32).toString("hex");
  await q
    .update(s.teeTimes)
    .set({ status: "locked", seed, seedHash: sha256(seed), lockedAt: new Date() })
    .where(and(eq(s.teeTimes.id, teeTimeId), eq(s.teeTimes.status, "open")));
}

export async function runDraw(teeTimeId: number) {
  const drawn = await db.transaction(async (tx) => {
    const [tt] = await tx.select().from(s.teeTimes).where(eq(s.teeTimes.id, teeTimeId)).for("update");
    if (!tt || tt.status !== "locked" || !tt.seed) return null;
    const entries = await tx.select().from(s.ballotEntries).where(eq(s.ballotEntries.teeTimeId, tt.id)).orderBy(asc(s.ballotEntries.id));
    const ranked = entries.map((e) => ({ e, rank: drawRank(tt.seed!, e.id) })).sort((a, b) => a.rank.localeCompare(b.rank));
    for (const [i, { e }] of ranked.entries())
      await tx.update(s.ballotEntries).set({ result: i < tt.players ? "selected" : "reserve", position: i + 1 }).where(eq(s.ballotEntries.id, e.id));
    await tx.update(s.teeTimes).set({ status: "drawn", drawnAt: new Date() }).where(eq(s.teeTimes.id, tt.id));
    await tx.insert(s.auditLogs).values({ actor: "staff", action: "draw.run", detail: `tee time #${tt.id} ${teeLabel(tt.startsAt)}: ${entries.length} entries, seed ${tt.seed}` });
    return { tt, ranked };
  });
  if (!drawn) return false;
  const [ev] = await db.select().from(s.events).where(eq(s.events.id, drawn.tt.eventId));
  const when = teeLabel(drawn.tt.startsAt);
  for (const [i, { e }] of drawn.ranked.entries()) {
    const body =
      i < drawn.tt.players
        ? `${CLUB.name}: congratulations ${e.name.split(" ")[0]}, you have been drawn to tee off at ${when} in the ${ev?.name}. Complete your entry: ${CLUB.url}/events/${ev?.slug}#register`
        : `${CLUB.name}: the ${when} tee-time draw for the ${ev?.name} is done. You are reserve number ${i + 1 - drawn.tt.players}; we will message you if a place opens.`;
    await notify({ channel: "sms", recipient: e.phone, dedupeKey: `draw:${e.id}`, body });
  }
  return true;
}
