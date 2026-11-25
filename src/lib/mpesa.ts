import { demoMode, safeEqual } from "./session";

// Safaricom Daraja STK Push. In demo mode without credentials,
// the guest confirms the "STK prompt" on screen, which exercises the same settle path as the live callback.

const base = () =>
  process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

export const mpesaLive = () =>
  !!(
    process.env.MPESA_CONSUMER_KEY &&
    process.env.MPESA_CONSUMER_SECRET &&
    process.env.MPESA_SHORTCODE &&
    process.env.MPESA_PASSKEY &&
    process.env.MPESA_CALLBACK_URL &&
    process.env.MPESA_CALLBACK_SECRET
  );

/** The callback URL carries a secret, because Daraja does not sign its callbacks. */
export const callbackAuthorised = (key: string | null) =>
  !!process.env.MPESA_CALLBACK_SECRET && !!key && safeEqual(key, process.env.MPESA_CALLBACK_SECRET);

function callbackUrl() {
  const u = new URL(process.env.MPESA_CALLBACK_URL!);
  u.searchParams.set("key", process.env.MPESA_CALLBACK_SECRET!);
  return u.toString();
}

async function token() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const r = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!r.ok) throw new Error("M-Pesa auth failed");
  return (await r.json()).access_token as string;
}

export async function stkPush(opts: { phone: string; amount: number; reference: string }) {
  if (!mpesaLive()) {
    if (!demoMode()) throw new Error("Online payment is not available right now. Please contact reception on WhatsApp to complete your booking.");
    return { mode: "demo" as const, checkoutRequestId: `demo_${opts.reference}_${Date.now()}` };
  }
  const t = await token();
  const ts = new Date(Date.now() + 3 * 3600_000).toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const shortcode = process.env.MPESA_SHORTCODE!;
  const password = Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY}${ts}`).toString("base64");
  const r = await fetch(`${base()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: opts.amount,
      PartyA: opts.phone,
      PartyB: shortcode,
      PhoneNumber: opts.phone,
      CallBackURL: callbackUrl(),
      AccountReference: opts.reference,
      TransactionDesc: "Nakuru Golf Club",
    }),
  });
  const j = await r.json();
  if (!r.ok || j.ResponseCode !== "0") throw new Error(j.errorMessage || j.ResponseDescription || "STK push failed");
  return { mode: "live" as const, checkoutRequestId: j.CheckoutRequestID as string };
}
