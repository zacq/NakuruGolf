import { db } from "@/db";
import * as s from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { notify } from "@/lib/notify";
import { CLUB, normalizePhone, waLink } from "@/lib/constants";
import { upsertCustomer } from "@/lib/commerce";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureSeed();
  const b = await req.json().catch(() => ({}));
  if (b.website) return Response.json({ ok: true });
  const phone = normalizePhone(String(b.phone || ""));
  const name = String(b.name || "").trim().slice(0, 100);
  if (!phone || !name) return Response.json({ ok: false, error: "Enter your name and a valid phone number." }, { status: 400 });
  if (!b.consent) return Response.json({ ok: false, error: "Please tick the consent box to submit your application." }, { status: 400 });
  const categoryId = Number(b.categoryId);
  const cat = (await db.select().from(s.membershipCategories)).find((c) => c.id === categoryId);
  if (!cat) return Response.json({ ok: false, error: "Choose a membership category." }, { status: 400 });
  await upsertCustomer({ phone, name, email: String(b.email || "").slice(0, 200) });
  // only inline images are kept: anything else could be a script link in the staff view
  const docs: Record<string, string> = {};
  try {
    for (const [k, v] of Object.entries(JSON.parse(String(b.documents || "{}"))))
      if (["idDoc", "photo"].includes(k) && typeof v === "string" && v.length < 1_500_000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) docs[k] = v;
  } catch {
    /* no documents */
  }
  const [row] = await db
    .insert(s.memberships)
    .values({
      categoryId,
      name,
      phone,
      email: String(b.email || ""),
      idNumber: String(b.idNumber || ""),
      proposer: String(b.proposer || ""),
      seconder: String(b.seconder || ""),
      documents: JSON.stringify(docs),
      consent: true,
    })
    .returning();
  const received = `${CLUB.name}: we have received your ${cat.name} application. The committee will review it and we will message you at each step.`;
  await notify(
    { channel: "whatsapp", recipient: CLUB.whatsapp, body: `[Membership] New ${cat.name} application from ${name} (${phone})` },
    { channel: "sms", recipient: phone, body: received },
    { channel: "email", recipient: row.email || "", subject: "Membership application received", body: received },
  );
  return Response.json({ ok: true, id: row.id, whatsapp: waLink(`Hello Nakuru Golf Club, I've applied for ${cat.name} membership online (${name}).`) });
}
