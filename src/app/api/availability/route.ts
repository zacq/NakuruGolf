import { carwashSlots, roomAvailability, validDate } from "@/lib/commerce";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureSeed();
  const u = new URL(req.url);
  const type = u.searchParams.get("type");
  if (type === "room") {
    const id = Number(u.searchParams.get("roomTypeId"));
    const checkIn = u.searchParams.get("checkIn") || "";
    const checkOut = u.searchParams.get("checkOut") || "";
    if (!validDate(checkIn) || !validDate(checkOut) || !Number.isInteger(id)) return Response.json({ error: "invalid request" }, { status: 400 });
    return Response.json(await roomAvailability(id, checkIn, checkOut));
  }
  if (type === "carwash") {
    const date = u.searchParams.get("date") || "";
    if (!validDate(date)) return Response.json({ error: "invalid date" }, { status: 400 });
    return Response.json({ slots: await carwashSlots(date) });
  }
  return Response.json({ error: "unknown type" }, { status: 400 });
}
