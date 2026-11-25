import { db } from "@/db";
import * as s from "@/db/schema";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

async function counts(eventId: number) {
  const [tot] = await db.select({ n: sql<number>`count(*)::int` }).from(s.registrations).where(eq(s.registrations.eventId, eventId));
  const [chk] = await db.select({ n: sql<number>`count(*)::int` }).from(s.registrations).where(and(eq(s.registrations.eventId, eventId), isNotNull(s.registrations.checkedInAt)));
  return { total: tot.n, checkedIn: chk.n };
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const eventId = Number(new URL(req.url).searchParams.get("eventId"));
  return Response.json(await counts(eventId));
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { code, eventId } = await req.json().catch(() => ({}));
  const c = String(code || "").trim().toUpperCase();
  const [r] = await db.select().from(s.registrations).where(eq(s.registrations.qrCode, c));
  if (!r) return Response.json({ ok: false, message: "Ticket not found", ...(await counts(Number(eventId))) }, { status: 404 });
  const [t] = await db.select().from(s.entryTypes).where(eq(s.entryTypes.id, r.entryTypeId));
  if (eventId && r.eventId !== Number(eventId))
    return Response.json({ ok: false, message: "This ticket is for a different event", ...(await counts(Number(eventId))) }, { status: 409 });
  if (r.checkedInAt)
    return Response.json({ ok: false, message: `Already checked in at ${new Date(r.checkedInAt).toLocaleTimeString("en-KE", { timeZone: "Africa/Nairobi" })}`, holder: r.holderName, ticket: t?.name, ...(await counts(r.eventId)) }, { status: 409 });
  const [claimed] = await db.update(s.registrations).set({ checkedInAt: new Date() }).where(and(eq(s.registrations.id, r.id), isNull(s.registrations.checkedInAt))).returning();
  if (!claimed) return Response.json({ ok: false, message: "Already checked in", holder: r.holderName, ticket: t?.name, ...(await counts(r.eventId)) }, { status: 409 });
  return Response.json({ ok: true, message: "Checked in", holder: r.holderName, ticket: t?.name, players: r.players, shirt: r.shirtSize, dietary: r.dietary, ...(await counts(r.eventId)) });
}
