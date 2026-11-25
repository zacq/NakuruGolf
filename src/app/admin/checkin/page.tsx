import { db } from "@/db";
import { asc } from "drizzle-orm";
import * as s from "@/db/schema";
import { CheckinClient } from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  const events = await db.select({ id: s.events.id, name: s.events.name }).from(s.events).orderBy(asc(s.events.startsAt));
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-fairway-900">Event check-in</h1>
      <p className="mb-4 text-sm text-fairway-800/70">Scan a ticket QR with the camera, or type the code. Counts update live.</p>
      <CheckinClient events={events} />
    </div>
  );
}
