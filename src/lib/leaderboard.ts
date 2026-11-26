import { db } from "@/db";
import { asc, eq, inArray, sql } from "drizzle-orm";
import * as s from "@/db/schema";
import { fmtDate } from "./constants";
import { teeClock, teeLabel } from "./draw";

export type BoardRow = { pos: string; name: string; handicap: string; points: string };

/**
 * HowDidiDo has no public API, so staff paste its leaderboard export (CSV) in the dashboard.
 * Columns are matched by name: position, name/player, handicap, points/score/nett.
 */
export function parseLeaderboard(csv: string): BoardRow[] {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const split = (l: string) => l.split(/,|\t/).map((c) => c.trim().replace(/^"|"$/g, ""));
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const col = (...names: string[]) => head.findIndex((h) => names.some((n) => h.includes(n)));
  const [p, n, h, pts] = [col("pos", "rank", "#"), col("name", "player"), col("hcp", "handicap"), col("point", "score", "nett", "net", "total")];
  return lines.slice(1).map((l, i) => {
    const c = split(l);
    return { pos: c[p] || String(i + 1), name: c[n] || "", handicap: c[h] || "", points: c[pts] || "" };
  }).filter((r) => r.name).slice(0, 100);
}

export async function getLeaderboard() {
  const rows = await db.select().from(s.settings).where(inArray(s.settings.key, ["hdid_leaderboard", "hdid_title", "hdid_sample", "hdid_updated"]));
  const get = (k: string) => rows.find((r) => r.key === k)?.value || "";
  return {
    rows: parseLeaderboard(get("hdid_leaderboard")),
    title: get("hdid_title") || "Nakuru GC leaderboard",
    sample: get("hdid_sample") === "1",
    updated: get("hdid_updated"),
  };
}

export const leaderboardUpdatedNow = () => fmtDate(new Date());

export async function teeTimeViews(eventId: number) {
  const tees = await db.select().from(s.teeTimes).where(eq(s.teeTimes.eventId, eventId)).orderBy(asc(s.teeTimes.startsAt));
  if (!tees.length) return [];
  const counts = await db
    .select({ id: s.ballotEntries.teeTimeId, n: sql<number>`count(*)::int` })
    .from(s.ballotEntries)
    .where(eq(s.ballotEntries.eventId, eventId))
    .groupBy(s.ballotEntries.teeTimeId);
  return tees.map((t) => ({
    id: t.id,
    clock: teeClock(t.startsAt),
    label: teeLabel(t.startsAt),
    entries: counts.find((c) => c.id === t.id)?.n || 0,
    capacity: t.capacity,
    players: t.players,
    fee: t.fee,
    status: t.status as "open" | "locked" | "drawn",
  }));
}
