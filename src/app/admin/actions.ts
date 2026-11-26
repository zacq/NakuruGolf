"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { leaderboardUpdatedNow } from "@/lib/leaderboard";
import { DRAW_CAPACITY, DRAW_FEE, PLAYERS_PER_TEE, lockTeeTime, paidEntries, runDraw } from "@/lib/draw";
import * as s from "@/db/schema";
import { isAdmin } from "@/lib/session";
import { cancelAndRefund, roomAvailability, validDate } from "@/lib/commerce";
import { notify } from "@/lib/notify";
import { CLUB, EVENT_TYPES, SPONSOR_ROLES, TIERS, normalizePhone } from "@/lib/constants";

async function guard() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}
async function log(action: string, detail: string) {
  await db.insert(s.auditLogs).values({ actor: "staff", action, detail });
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Math.round(Number(fd.get(k) || 0));

export async function updateLead(fd: FormData) {
  await guard();
  const id = num(fd, "id");
  await db.update(s.leads).set({ status: str(fd, "status"), owner: str(fd, "owner") }).where(eq(s.leads.id, id));
  await log("lead.update", `#${id} → ${str(fd, "status")} (${str(fd, "owner")})`);
  revalidatePath("/admin/leads");
}

export async function updateMembership(fd: FormData) {
  await guard();
  const id = num(fd, "id");
  const status = str(fd, "status");
  const [m] = await db.select().from(s.memberships).where(eq(s.memberships.id, id));
  if (!m || !["under_review", "approved", "declined", "lapsed"].includes(status)) return;
  await db.update(s.memberships).set({ status }).where(eq(s.memberships.id, id));
  const msg =
    status === "approved"
      ? "Your Nakuru Golf Club membership is approved! Sign in at the Account page to pay your joining fee and first subscription by M-Pesa."
      : status === "lapsed"
        ? "Your membership has lapsed. Sign in at the Account page to renew by M-Pesa."
        : status === "declined"
        ? "Thank you for applying. The committee is unable to approve your application at this time. Please contact reception."
        : "Your membership application is now under review by the committee.";
  await notify(
    { channel: "sms", recipient: m.phone, body: `${CLUB.name}: ${msg}${status === "approved" ? ` ${CLUB.url}/account` : ""}` },
    { channel: "whatsapp", recipient: m.phone, body: msg },
    { channel: "email", recipient: m.email || "", subject: "Your membership application", body: msg },
  );
  await log("membership.status", `#${id} ${m.name} → ${status}`);
  revalidatePath("/admin/members");
}

export async function refundOrder(fd: FormData) {
  await guard();
  const id = num(fd, "id");
  const reason = str(fd, "reason") || "No reason given";
  await cancelAndRefund(id, reason);
  revalidatePath("/admin/orders");
}

export async function markReconciled(fd: FormData) {
  await guard();
  const id = num(fd, "id");
  await db.update(s.payments).set({ reconciledAt: new Date() }).where(eq(s.payments.id, id));
  await log("payment.reconcile", `payment #${id}`);
  revalidatePath("/admin/orders");
}

export async function setBookingStatus(fd: FormData) {
  await guard();
  const id = num(fd, "id");
  const status = str(fd, "status");
  if (!["confirmed", "completed", "cancelled"].includes(status)) return;
  const [b] = await db.update(s.bookings).set({ status }).where(eq(s.bookings.id, id)).returning();
  if (b && status === "completed" && b.kind === "carwash" && b.phone)
    await notify({ channel: "sms", recipient: b.phone, body: `Your car is ready at ${CLUB.name}. Thank you!` });
  if (b && status === "confirmed" && b.kind === "teetime" && b.phone)
    await notify({ channel: "sms", recipient: b.phone, body: `${CLUB.name}: your tee time on ${b.date} around ${b.time} is confirmed.` });
  await log("booking.status", `#${id} → ${status}`);
  revalidatePath("/admin/ops");
}

export async function addManualRoomBooking(fd: FormData) {
  await guard();
  const roomTypeId = num(fd, "roomTypeId");
  const [rt] = await db.select().from(s.roomTypes).where(eq(s.roomTypes.id, roomTypeId));
  const checkIn = str(fd, "checkIn");
  const checkOut = str(fd, "checkOut");
  const qty = Math.max(1, num(fd, "qty"));
  if (!rt || !validDate(checkIn) || !validDate(checkOut) || checkOut <= checkIn) redirect("/admin/ops?error=dates");
  if ((await roomAvailability(rt.id, checkIn, checkOut)).available < qty) redirect("/admin/ops?error=full");
  const release = str(fd, "release"); // HT-4: an event hold is released automatically on this date
  await db.insert(s.bookings).values({
    kind: "room",
    refId: roomTypeId,
    label: rt.name,
    date: checkIn,
    endDate: checkOut,
    qty,
    guests: Math.max(1, num(fd, "guests")),
    status: validDate(release) ? "held" : "confirmed",
    holdExpires: validDate(release) ? new Date(`${release}T00:00:00+03:00`) : null,
    name: str(fd, "name") || "Staff hold",
    phone: normalizePhone(str(fd, "phone")),
    source: "staff",
    details: { note: str(fd, "note") },
  });
  await log("room.manual_booking", `${rt.name} ${str(fd, "checkIn")}→${str(fd, "checkOut")} × ${num(fd, "qty")} (${str(fd, "name")})`);
  revalidatePath("/admin/ops");
}

export async function saveSetting(fd: FormData) {
  await guard();
  const key = str(fd, "key");
  const value = str(fd, "value");
  if (!["course_notice", "carwash_capacity", "sponsor_deck_url", "hdid_leaderboard", "hdid_title"].includes(key)) return;
  if (key === "hdid_leaderboard")
    for (const [k, v] of [["hdid_sample", "0"], ["hdid_updated", leaderboardUpdatedNow()]])
      await db.insert(s.settings).values({ key: k, value: v }).onConflictDoUpdate({ target: s.settings.key, set: { value: v } });
  await db.insert(s.settings).values({ key, value }).onConflictDoUpdate({ target: s.settings.key, set: { value } });
  await log("setting.update", `${key} = ${value.slice(0, 80)}`);
  revalidatePath("/admin/content");
  revalidatePath("/about");
  revalidatePath("/admin/draws");
  revalidatePath("/");
}

const pick = (fd: FormData, cols: string[]) => (cols.includes(str(fd, "col")) ? str(fd, "col") : cols[0]);

const PRICE_TABLES = {
  rooms: s.roomTypes,
  menu: s.menuItems,
  carwash: s.carWashServices,
  products: s.products,
  entries: s.entryTypes,
  greenfees: s.greenFees,
  lessons: s.lessons,
  membership: s.membershipCategories,
} as const;

export async function updatePrice(fd: FormData) {
  await guard();
  const kind = str(fd, "kind") as keyof typeof PRICE_TABLES;
  const id = num(fd, "id");
  const price = num(fd, "price");
  if (!PRICE_TABLES[kind] || price < 0) return;
  const tbl = PRICE_TABLES[kind];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tbl as any;
  const col = kind === "rooms" ? pick(fd, ["rate", "memberRate", "corporateRate", "eventRate"]) : kind === "greenfees" ? pick(fd, ["weekday18", "weekday9", "weekend9", "weekend18"]) : kind === "membership" ? pick(fd, ["annualFee", "joiningFee"]) : "price";
  const [old] = await db.select().from(t).where(eq(t.id, id));
  await db.update(t).set({ [col]: price }).where(eq(t.id, id));
  await log("price.update", `${kind} #${id} ${col}: ${(old as Record<string, unknown>)?.[col]} → ${price}`);
  revalidatePath("/admin/content");
}

export async function updateStock(fd: FormData) {
  await guard();
  const id = num(fd, "id");
  const stock = num(fd, "stock");
  await db.update(s.products).set({ stock }).where(eq(s.products.id, id));
  await log("stock.update", `product #${id} → ${stock}`);
  revalidatePath("/admin/content");
}

export async function addManualIncome(fd: FormData) {
  await guard();
  const stream = str(fd, "stream") === "sponsorship" ? "sponsorship" : "venue";
  const eventId = num(fd, "eventId") || null;
  await db.insert(s.manualIncome).values({ stream, description: str(fd, "description") || stream, amount: num(fd, "amount"), eventId });
  await log("income.manual", `${stream} KSh ${num(fd, "amount")} ${str(fd, "description")}`);
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}

export async function saveResults(fd: FormData) {
  await guard();
  const id = num(fd, "eventId");
  await db.update(s.events).set({ results: str(fd, "results") }).where(eq(s.events.id, id));
  await log("event.results", `event #${id}`);
  revalidatePath("/events");
  revalidatePath("/admin/content");
}

export async function addNews(fd: FormData) {
  await guard();
  const title = str(fd, "title");
  if (!title) return;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + "-" + Date.now().toString(36);
  await db.insert(s.newsPosts).values({ slug, title, body: str(fd, "body"), category: str(fd, "category") || "club", image: str(fd, "image") });
  await log("news.add", title);
  revalidatePath("/news");
  revalidatePath("/admin/content");
}

export async function addEntryType(fd: FormData) {
  await guard();
  const eventId = num(fd, "eventId");
  await db.insert(s.entryTypes).values({
    eventId,
    kind: str(fd, "kind") === "ticket" ? "ticket" : "entry",
    name: str(fd, "name"),
    price: num(fd, "price"),
    priceMember: num(fd, "priceMember") || null,
    players: Math.max(1, num(fd, "players")),
    cap: num(fd, "cap") || null,
    deadline: str(fd, "deadline") ? new Date(str(fd, "deadline") + "T23:59:00+03:00") : null,
  });
  await log("entrytype.add", `event #${eventId} ${str(fd, "name")}`);
  revalidatePath("/admin/content");
}

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const nairobi = (v: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) ? new Date(v.slice(0, 16) + ":00+03:00") : null);
const optNum = (fd: FormData, k: string) => (str(fd, k) === "" ? null : num(fd, k));
const webUrl = (v: string) => (/^https?:\/\//i.test(v) ? v : "");

export async function saveEvent(fd: FormData) {
  await guard();
  const id = num(fd, "id");
  const startsAt = nairobi(str(fd, "startsAt"));
  const endsAt = nairobi(str(fd, "endsAt"));
  const name = str(fd, "name");
  if (!name || !startsAt || !endsAt || endsAt <= startsAt) throw new Error("An event needs a name, and an end after its start.");
  const values = {
    name,
    type: EVENT_TYPES[str(fd, "type")] ? str(fd, "type") : "club",
    startsAt,
    endsAt,
    venue: str(fd, "venue") || CLUB.name,
    format: str(fd, "format"),
    summary: str(fd, "summary"),
    description: str(fd, "description"),
    schedule: str(fd, "schedule"),
    rules: str(fd, "rules"),
    prizes: str(fd, "prizes"),
    dressCode: str(fd, "dressCode"),
    contact: str(fd, "contact"),
    banner: webUrl(str(fd, "banner")),
    capacity: Math.max(1, num(fd, "capacity")),
    titleSponsor: str(fd, "titleSponsor"),
    featured: fd.get("featured") === "on",
  };
  if (id) await db.update(s.events).set(values).where(eq(s.events.id, id));
  else {
    const year = String(startsAt.getUTCFullYear());
    const base = slugify(name.includes(year) ? name : `${name} ${year}`);
    const [taken] = await db.select().from(s.events).where(eq(s.events.slug, base));
    await db.insert(s.events).values({ ...values, slug: taken ? `${base}-${Date.now().toString(36)}` : base });
  }
  await log("event.save", name);
  revalidatePath("/admin/events");
}

export async function updateEntryType(fd: FormData) {
  await guard();
  const id = num(fd, "id");
  const [old] = await db.select().from(s.entryTypes).where(eq(s.entryTypes.id, id));
  if (!old) return;
  const price = Math.max(0, num(fd, "price"));
  await db.update(s.entryTypes).set({ price, priceMember: optNum(fd, "priceMember"), cap: optNum(fd, "cap"), deadline: nairobi(str(fd, "deadline")) }).where(eq(s.entryTypes.id, id));
  await log("entrytype.update", `${old.name}: price ${old.price} → ${price}, cap ${old.cap ?? "none"} → ${optNum(fd, "cap") ?? "none"}`);
  revalidatePath("/admin/events");
}

export async function addSponsorship(fd: FormData) {
  await guard();
  const role = str(fd, "role");
  if (!num(fd, "partnerId") || !SPONSOR_ROLES[role]) return;
  await db.insert(s.sponsorships).values({ partnerId: num(fd, "partnerId"), eventId: num(fd, "eventId") || null, role, value: Math.max(0, num(fd, "value")) });
  await log("sponsorship.add", `partner #${num(fd, "partnerId")} event #${num(fd, "eventId")} ${role} ${num(fd, "value")}`);
  revalidatePath("/admin/events");
}

export async function deleteSponsorship(fd: FormData) {
  await guard();
  await db.delete(s.sponsorships).where(eq(s.sponsorships.id, num(fd, "id")));
  await log("sponsorship.remove", `#${num(fd, "id")}`);
  revalidatePath("/admin/events");
}

export async function addGalleryPhoto(fd: FormData) {
  await guard();
  const url = webUrl(str(fd, "url"));
  if (!url) return;
  await db.insert(s.galleryPhotos).values({ album: str(fd, "album") || "Club", url, caption: str(fd, "caption"), eventId: num(fd, "eventId") || null });
  await log("gallery.add", url);
  revalidatePath("/admin/events");
}

export async function deleteGalleryPhoto(fd: FormData) {
  await guard();
  await db.delete(s.galleryPhotos).where(eq(s.galleryPhotos.id, num(fd, "id")));
  await log("gallery.remove", `#${num(fd, "id")}`);
  revalidatePath("/admin/events");
}

export async function savePartner(fd: FormData) {
  await guard();
  const id = num(fd, "id");
  const name = str(fd, "name");
  const tier = str(fd, "tier");
  if (!name || !TIERS[tier]) return;
  const values = {
    name,
    tier,
    logo: webUrl(str(fd, "logo")),
    website: webUrl(str(fd, "website")),
    years: str(fd, "years"),
    color: /^#[0-9a-f]{6}$/i.test(str(fd, "color")) ? str(fd, "color") : "#0f3d2e",
    description: str(fd, "description"),
    story: str(fd, "story"),
  };
  if (id) await db.update(s.partners).set(values).where(eq(s.partners.id, id));
  else {
    const slug = slugify(name) || "partner";
    const [taken] = await db.select().from(s.partners).where(eq(s.partners.slug, slug));
    await db.insert(s.partners).values({ ...values, slug: taken ? `${slug}-${Date.now().toString(36)}` : slug });
  }
  await log("partner.save", name);
  revalidatePath("/admin/partners");
}

export async function savePackage(fd: FormData) {
  await guard();
  await db.update(s.sponsorPackages).set({ benefits: str(fd, "benefits"), price: optNum(fd, "price") }).where(eq(s.sponsorPackages.id, num(fd, "id")));
  await log("package.update", `#${num(fd, "id")} price ${str(fd, "price") || "on enquiry"}`);
  revalidatePath("/admin/partners");
}

export async function setMenuAvailability(fd: FormData) {
  await guard();
  const available = str(fd, "available") === "1";
  await db.update(s.menuItems).set({ available }).where(eq(s.menuItems.id, num(fd, "id")));
  await log("menu.availability", `#${num(fd, "id")} → ${available ? "on" : "off"}`);
  revalidatePath("/admin/content");
}

export async function addMenuItem(fd: FormData) {
  await guard();
  const name = str(fd, "name");
  if (!name || num(fd, "price") <= 0) return;
  await db.insert(s.menuItems).values({ category: ["breakfast", "lunch", "dinner", "snacks"].includes(str(fd, "category")) ? str(fd, "category") : "lunch", name, description: str(fd, "description"), price: num(fd, "price"), memberPrice: optNum(fd, "memberPrice") });
  await log("menu.add", name);
  revalidatePath("/admin/content");
}

export async function createTeeTimes(fd: FormData) {
  await guard();
  const eventId = num(fd, "eventId");
  const first = nairobi(str(fd, "first"));
  const count = Math.min(100, Math.max(1, num(fd, "count")));
  const gap = Math.min(30, Math.max(5, num(fd, "gap")));
  if (!eventId || !first) return;
  await db.insert(s.teeTimes).values(
    Array.from({ length: count }, (_, n) => ({
      eventId,
      startsAt: new Date(first.getTime() + n * gap * 60_000),
      capacity: Math.max(1, num(fd, "capacity") || DRAW_CAPACITY),
      players: Math.min(4, Math.max(1, num(fd, "players") || PLAYERS_PER_TEE)),
      fee: Math.max(1, num(fd, "fee") || DRAW_FEE),
    })),
  );
  await log("draw.teetimes", `event #${eventId}: ${count} tee times from ${str(fd, "first")} every ${gap} min`);
  revalidatePath("/admin/draws");
  revalidatePath("/");
}

export async function closeDrawEntries(fd: FormData) {
  await guard();
  const ids = fd.getAll("id").map(Number).filter(Boolean);
  for (const id of ids) await lockTeeTime(id);
  await log("draw.close", `tee times ${ids.join(", ")}`);
  revalidatePath("/admin/draws");
  revalidatePath("/");
}

export async function drawTeeTimes(fd: FormData) {
  await guard();
  const ids = fd.getAll("id").map(Number).filter(Boolean);
  for (const id of ids) await runDraw(id);
  revalidatePath("/admin/draws");
  revalidatePath("/");
}

export async function deleteOpenTeeTime(fd: FormData) {
  await guard();
  const id = num(fd, "id");
  if (await paidEntries(id)) return; // never delete a tee time that people have paid to enter
  await db.delete(s.teeTimes).where(and(eq(s.teeTimes.id, id), eq(s.teeTimes.status, "open")));
  await log("draw.teetime_delete", `#${id}`);
  revalidatePath("/admin/draws");
  revalidatePath("/");
}
