import crypto from "crypto";
import { db } from "@/db";
import * as s from "@/db/schema";
import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { normalizePhone } from "@/lib/constants";
import { CUSTOMER_MAX_AGE, cookieOpts, customerToken, demoMode, getSessionPhone, hashCode } from "@/lib/session";
import { isMemberPhone } from "@/lib/commerce";
import { sendSms, smsConfigured } from "@/lib/notify";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

// GET: who am I (for member pricing)
export async function GET() {
  await ensureSeed();
  const phone = await getSessionPhone();
  return Response.json({ phone, member: await isMemberPhone(phone) });
}

// POST {action: request|verify|logout|consent}
export async function POST(req: Request) {
  await ensureSeed();
  const b = await req.json().catch(() => ({}));
  if (b.action === "logout") {
    (await cookies()).delete("ngc_session");
    return Response.json({ ok: true });
  }
  if (b.action === "consent") {
    const me = await getSessionPhone();
    if (!me) return Response.json({ ok: false }, { status: 401 });
    await db.insert(s.customers).values({ phone: me, marketingConsent: !!b.value }).onConflictDoUpdate({ target: s.customers.phone, set: { marketingConsent: !!b.value } });
    return Response.json({ ok: true });
  }
  const phone = normalizePhone(String(b.phone || ""));
  if (!phone) return Response.json({ ok: false, error: "Enter a valid phone number." }, { status: 400 });

  if (b.action === "request") {
    if (!smsConfigured() && !demoMode())
      return Response.json({ ok: false, error: "Sign-in by SMS is not available yet. Please contact reception on WhatsApp." }, { status: 503 });
    const [recent] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.otps)
      .where(and(eq(s.otps.phone, phone), gt(s.otps.createdAt, sql`now() - interval '1 hour'`)));
    if (recent.n >= 5) return Response.json({ ok: false, error: "Too many codes requested. Please try again in an hour." }, { status: 429 });
    const code = String(crypto.randomInt(100000, 1000000));
    await db.insert(s.otps).values({ phone, code: hashCode(phone, code), expiresAt: new Date(Date.now() + 10 * 60_000) });
    if (!smsConfigured()) return Response.json({ ok: true, demoCode: code });
    if (!(await sendSms(phone, `Your Nakuru Golf Club code is ${code}. It expires in 10 minutes.`)))
      return Response.json({ ok: false, error: "We could not send the SMS. Please retry." }, { status: 502 });
    return Response.json({ ok: true });
  }

  if (b.action === "verify") {
    // count the attempt before comparing, so parallel guesses cannot get around the limit
    const [latest] = await db.select().from(s.otps).where(and(eq(s.otps.phone, phone), gt(s.otps.expiresAt, new Date()))).orderBy(desc(s.otps.id)).limit(1);
    const [otp] = latest
      ? await db.update(s.otps).set({ attempts: sql`${s.otps.attempts} + 1` }).where(and(eq(s.otps.id, latest.id), lt(s.otps.attempts, MAX_ATTEMPTS))).returning()
      : [];
    if (!otp || otp.code !== hashCode(phone, String(b.code || "").trim()))
      return Response.json({ ok: false, error: "That code is wrong or has expired." }, { status: 400 });
    await db.update(s.otps).set({ expiresAt: new Date(0) }).where(eq(s.otps.phone, phone));
    (await cookies()).set("ngc_session", customerToken(phone), cookieOpts(CUSTOMER_MAX_AGE));
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
