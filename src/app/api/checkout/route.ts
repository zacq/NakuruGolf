import { db } from "@/db";
import * as s from "@/db/schema";
import { CartError, createOrder, failOrder } from "@/lib/commerce";
import { ensureSeed } from "@/lib/seed";
import { mpesaLive, stkPush } from "@/lib/mpesa";
import { normalizePhone } from "@/lib/constants";
import { demoMode, getSessionPhone } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureSeed();
  const b = await req.json().catch(() => ({}));
  if (b.website) return Response.json({ ok: false, error: "Spam detected" }, { status: 400 }); // honeypot
  if (!mpesaLive() && !demoMode())
    return Response.json({ ok: false, error: "Online payment is not available right now. Please contact reception on WhatsApp to complete your booking." }, { status: 503 });
  const email = String(b.email || "").trim().slice(0, 200);
  let order;
  try {
    order = await createOrder({
      items: Array.isArray(b.items) ? b.items : [],
      name: String(b.name || ""),
      phone: String(b.phone || ""),
      email,
      company: String(b.company || "").slice(0, 120),
      poRef: String(b.poRef || "").slice(0, 80),
      promo: String(b.promo || ""),
      deposit: !!b.deposit,
      consent: !!b.consent,
      memberPhone: await getSessionPhone(),
    });
  } catch (e) {
    if (e instanceof CartError) return Response.json({ ok: false, error: e.message }, { status: 400 });
    console.error("checkout", e);
    return Response.json({ ok: false, error: "Could not create your order. Your cart is saved: please retry." }, { status: 500 });
  }
  const payPhone = normalizePhone(String(b.mpesaPhone || "")) || order.phone;
  try {
    const stk = await stkPush({ phone: payPhone, amount: order.amountDue, reference: order.number });
    await db.insert(s.payments).values({
      orderId: order.id,
      method: "mpesa",
      checkoutRequestId: stk.checkoutRequestId,
      phone: payPhone,
      amount: order.amountDue,
      status: "pending",
      mode: stk.mode,
    });
    return Response.json({ ok: true, number: order.number, mode: stk.mode, amount: order.amountDue });
  } catch (e) {
    await failOrder(order.number, "failed");
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "M-Pesa request failed. Please retry." }, { status: 502 });
  }
}
