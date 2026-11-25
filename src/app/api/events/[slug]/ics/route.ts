import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { CLUB } from "@/lib/constants";

export const dynamic = "force-dynamic";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [e] = await db.select().from(s.events).where(eq(s.events.slug, slug));
  if (!e) return new Response("Not found", { status: 404 });
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nakuru Golf Club//EN",
    "BEGIN:VEVENT",
    `UID:${e.slug}@nakurugolfclub.co.ke`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(new Date(e.startsAt))}`,
    `DTEND:${stamp(new Date(e.endsAt))}`,
    `SUMMARY:${e.name}`,
    `LOCATION:${CLUB.name}\\, ${CLUB.address}`,
    `DESCRIPTION:${e.summary.replace(/\n/g, " ")} ${CLUB.url}/events/${e.slug}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${e.slug}.ics"` } });
}
