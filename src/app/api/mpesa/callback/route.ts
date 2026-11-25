import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { failOrder, settleOrder } from "@/lib/commerce";
import { callbackAuthorised } from "@/lib/mpesa";

export const dynamic = "force-dynamic";

type Item = { Name: string; Value?: string | number };

// Daraja STK callback. Verified server-side: the URL must carry our secret, the CheckoutRequestID must match a payment we created
// and the paid amount must equal the amount we requested.
export async function POST(req: Request) {
  if (!callbackAuthorised(new URL(req.url).searchParams.get("key"))) return Response.json({ ResultCode: 1, ResultDesc: "Unauthorised" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const cb = body?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) return Response.json({ ResultCode: 1, ResultDesc: "Invalid" }, { status: 400 });
  const [pay] = await db
    .select()
    .from(s.payments)
    .where(eq(s.payments.checkoutRequestId, String(cb.CheckoutRequestID)));
  if (!pay || pay.status === "success") return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, pay.orderId));
  if (Number(cb.ResultCode) === 0) {
    const items: Item[] = cb.CallbackMetadata?.Item || [];
    const get = (n: string) => items.find((i) => i.Name === n)?.Value;
    const amount = Number(get("Amount"));
    const receipt = String(get("MpesaReceiptNumber") || "");
    if (amount >= pay.amount && receipt) {
      await settleOrder(order.number, receipt, pay.id);
    } else {
      await db.insert(s.auditLogs).values({ actor: "system", action: "payment.mismatch", detail: `${order.number}: expected ${pay.amount}, M-Pesa ${receipt || "no receipt"} ${amount}` });
    }
  } else {
    await failOrder(order.number, "failed");
  }
  return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
