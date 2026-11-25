import { db } from "@/db";
import * as s from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { notify } from "@/lib/notify";
import { CLUB, waLink } from "@/lib/constants";

export const dynamic = "force-dynamic";

const TYPES = ["venue", "sponsorship", "catering", "general"];
const TOPIC_DEPT: Record<string, string> = { "Events & tournaments": "Events", "Rooms & accommodation": "Hotel", Restaurant: "Restaurant", "Car wash": "Car wash", Membership: "Membership", Sponsorship: "Events", Shop: "Shop" };
const DEPT: Record<string, string> = { venue: "Events", sponsorship: "Events", catering: "Restaurant", general: "Reception" };

export async function POST(req: Request) {
  await ensureSeed();
  const b = await req.json().catch(() => ({}));
  if (b.website) return Response.json({ ok: true }); // honeypot: pretend success
  const type = TYPES.includes(b.type) ? b.type : "general";
  const name = String(b.name || "").trim().slice(0, 100);
  const phone = String(b.phone || "").trim().slice(0, 30);
  const email = String(b.email || "").trim().slice(0, 200);
  if (!name || (!phone && !email)) return Response.json({ ok: false, error: "Please add your name and a phone or email." }, { status: 400 });
  const details: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.details || {}).slice(0, 20)) details[k.slice(0, 60)] = String(v).slice(0, 1000);
  await db.insert(s.leads).values({ type, name, company: String(b.company || "").slice(0, 120), phone, email, details });
  const summary = Object.entries(details).map(([k, v]) => `${k}: ${v}`).join("; ");
  await notify({
    channel: "whatsapp",
    recipient: CLUB.whatsapp,
    body: `[${TOPIC_DEPT[details.Topic] || DEPT[type]}] New ${type} enquiry from ${name} (${phone || email}). ${summary}`,
  });
  return Response.json({
    ok: true,
    whatsapp: waLink(`Hello Nakuru Golf Club, I've just sent a ${type} enquiry on your website (${name}). ${summary}`.slice(0, 600)),
  });
}
