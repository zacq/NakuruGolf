import { db } from "@/db";
import * as s from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { failOrder, settleOrder } from "@/lib/commerce";
import { demoMode } from "@/lib/session";

export const dynamic = "force-dynamic";

// Demo mode only: stands in for the guest entering their M-Pesa PIN. Disabled for live payments.
export async function POST(req: Request) {
  if (!demoMode()) return Response.json({ ok: false }, { status: 404 });
  const { number, approve } = await req.json().catch(() => ({}));
  const [o] = await db.select().from(s.orders).where(eq(s.orders.number, String(number)));
  if (!o) return Response.json({ ok: false }, { status: 404 });
  const [pay] = await db.select().from(s.payments).where(and(eq(s.payments.orderId, o.id), eq(s.payments.status, "pending")));
  if (!pay || pay.mode !== "demo") return Response.json({ ok: false, error: "Not a demo payment" }, { status: 400 });
  if (approve === false) {
    await failOrder(o.number, "failed");
    return Response.json({ ok: true, status: "failed" });
  }
  const receipt = "SIM" + Math.random().toString(36).slice(2, 10).toUpperCase();
  await settleOrder(o.number, receipt, pay.id);
  return Response.json({ ok: true, status: "paid", receipt });
}
