import crypto from "crypto";
import { db, type Q } from "@/db";
import { and, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import * as s from "@/db/schema";
import { DEPOSIT_PCT, PROMO_CODES, TZ, isWeekend, normalizePhone, kes, CLUB, waLink, fmtDate } from "./constants";
import { notify } from "./notify";
import type { CartItem, Quote } from "./types";

const HOLD_MINUTES = 15;

export const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v);
export const validTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export function todayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

function nightsBetween(a: string, b: string) {
  const out: string[] = [];
  const d = new Date(a + "T00:00:00Z");
  const end = new Date(b + "T00:00:00Z");
  while (d < end && out.length < 60) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const activeBooking = or(
  inArray(s.bookings.status, ["confirmed", "completed", "requested"]),
  and(eq(s.bookings.status, "held"), gt(s.bookings.holdExpires, sql`now()`)),
);

export async function roomAvailability(roomTypeId: number, checkIn: string, checkOut: string, q: Q = db) {
  const [rt] = await q.select().from(s.roomTypes).where(eq(s.roomTypes.id, roomTypeId));
  if (!rt) return { available: 0, total: 0, nights: 0 };
  const nights = nightsBetween(checkIn, checkOut);
  if (!nights.length) return { available: 0, total: rt.totalRooms, nights: 0 };
  const rows = await q
    .select()
    .from(s.bookings)
    .where(
      and(
        eq(s.bookings.kind, "room"),
        eq(s.bookings.refId, roomTypeId),
        lt(s.bookings.date, checkOut),
        gt(s.bookings.endDate, checkIn),
        activeBooking,
      ),
    );
  const peak = Math.max(
    0,
    ...nights.map((n) =>
      rows.filter((b) => b.date <= n && (b.endDate || "") > n).reduce((a, b) => a + b.qty, 0),
    ),
  );
  return { available: Math.max(0, rt.totalRooms - peak), total: rt.totalRooms, nights: nights.length };
}

export const WASH_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

export async function carwashSlots(date: string, q: Q = db) {
  const [cap] = await q.select().from(s.settings).where(eq(s.settings.key, "carwash_capacity"));
  const capacity = Number(cap?.value || 3);
  const rows = await q
    .select()
    .from(s.bookings)
    .where(and(eq(s.bookings.kind, "carwash"), eq(s.bookings.date, date), activeBooking));
  return WASH_SLOTS.map((t) => ({
    time: t,
    remaining: Math.max(0, capacity - rows.filter((b) => b.time === t).reduce((a, b) => a + b.qty, 0)),
  }));
}

export async function isMemberPhone(phone: string | null | undefined, q: Q = db) {
  if (!phone) return false;
  const p = normalizePhone(phone);
  if (!p) return false;
  const rows = await q
    .select({ id: s.memberships.id })
    .from(s.memberships)
    .where(and(eq(s.memberships.phone, p), eq(s.memberships.status, "active")));
  return rows.length > 0;
}

export type Line = {
  kind: string;
  refId: number;
  stream: string;
  itemName: string;
  qty: number;
  unitPrice: number;
  total: number;
  balance: number;
  eventId: number | null;
  meta: Record<string, unknown>;
  booking?: { kind: string; date: string; endDate?: string; time?: string; qty: number; guests: number; label: string };
};

export class CartError extends Error {}

const heldOrder = sql`(${s.orders.status} = 'pending' and ${s.orders.createdAt} > now() - make_interval(mins => ${sql.raw(String(HOLD_MINUTES))}))`;

/** Quantity of an entry type or product inside checkouts that are still being paid (PY-2). */
async function heldQty(q: Q, kind: string, refId: number) {
  const [r] = await q
    .select({ n: sql<number>`coalesce(sum(${s.orderLines.qty}), 0)::int` })
    .from(s.orderLines)
    .innerJoin(s.orders, eq(s.orders.id, s.orderLines.orderId))
    .where(and(eq(s.orderLines.kind, kind), eq(s.orderLines.refId, refId), heldOrder));
  return r.n;
}

function needTime(v: string, label: string) {
  if (!validTime(v)) throw new CartError(`Please choose a time for ${label}.`);
}

function needDate(v: string, label: string) {
  if (!validDate(v)) throw new CartError(`Please choose a date for ${label}.`);
  if (v < todayStr()) throw new CartError(`The date for ${label} is in the past.`);
}

export async function priceItems(items: CartItem[], member: boolean, deposit = false, q: Q = db): Promise<Line[]> {
  const lines: Line[] = [];
  const used = new Map<string, number>(); // capacity already taken by earlier lines of this cart
  const take = (key: string, n: number) => {
    const before = used.get(key) || 0;
    used.set(key, before + n);
    return before;
  };
  const entryEventIds = new Set<number>();
  for (const it of items) {
    if (it.kind === "entry") {
      const [et] = await q.select().from(s.entryTypes).where(eq(s.entryTypes.id, it.refId));
      if (et) entryEventIds.add(et.eventId);
    }
  }

  for (const raw of items) {
    const qty = Math.max(1, Math.min(50, Math.floor(Number(raw.qty) || 1)));
    const meta = raw.meta || {};
    const eventId = Number.isInteger(raw.eventId) ? (raw.eventId as number) : null;

    if (raw.kind === "entry") {
      const [et] = await q.select().from(s.entryTypes).where(eq(s.entryTypes.id, raw.refId));
      if (!et) throw new CartError("An entry in your cart is no longer available.");
      const [ev] = await q.select().from(s.events).where(eq(s.events.id, et.eventId));
      if (new Date(ev.endsAt) < new Date()) throw new CartError(`${ev.name} has finished.`);
      if (et.deadline && new Date(et.deadline) < new Date())
        throw new CartError(`Entries for "${et.name}" closed on ${new Date(et.deadline).toLocaleDateString("en-KE", { timeZone: TZ })}.`);
      const players = (Array.isArray(meta.players) ? meta.players : []).slice(0, qty * et.players) as Record<string, unknown>[];
      if (et.kind === "entry" && (players.length < qty * et.players || players.some((p) => !str(p?.name).trim())))
        throw new CartError(`Player names are missing for "${et.name}". Remove it from the cart and add it again with every player's name.`);
      const taken = et.sold + (await heldQty(q, "entry", et.id)) + take(`entry:${et.id}`, qty);
      if (et.cap != null && taken + qty > et.cap) throw new CartError(`Only ${Math.max(0, et.cap - taken)} place(s) left for "${et.name}".`);
      if (et.kind === "entry") {
        const siblings = await q.select().from(s.entryTypes).where(and(eq(s.entryTypes.eventId, ev.id), eq(s.entryTypes.kind, "entry")));
        let golfers = take(`field:${ev.id}`, qty * et.players);
        for (const t of siblings) golfers += (t.sold + (await heldQty(q, "entry", t.id))) * t.players;
        if (golfers + qty * et.players > ev.capacity) throw new CartError(`${ev.name} has ${Math.max(0, ev.capacity - golfers)} golfer place(s) left.`);
      }
      const unit = member && et.priceMember != null ? et.priceMember : et.price;
      lines.push({
        kind: "entry",
        refId: et.id,
        stream: et.kind === "ticket" ? "tickets" : "events",
        itemName: `${ev.name} — ${et.name}`,
        qty,
        unitPrice: unit,
        total: unit * qty,
        balance: 0,
        eventId: ev.id,
        meta: {
          players: players.map((p) => ({ name: str(p?.name).slice(0, 80), handicap: str(p?.handicap).slice(0, 10), shirt: str(p?.shirt).slice(0, 5), dietary: str(p?.dietary).slice(0, 120) })),
          club: str(meta.club).slice(0, 80),
        },
      });
    } else if (raw.kind === "room") {
      const [rt] = await q.select().from(s.roomTypes).where(eq(s.roomTypes.id, raw.refId));
      if (!rt) throw new CartError("A room in your cart is no longer available.");
      const checkIn = str(meta.checkIn);
      const checkOut = str(meta.checkOut);
      needDate(checkIn, rt.name);
      if (!validDate(checkOut)) throw new CartError(`Please choose a check-out date for ${rt.name}.`);
      const nights = nightsBetween(checkIn, checkOut).length;
      if (nights < 1) throw new CartError(`Check-out must be after check-in for ${rt.name}.`);
      // the event rate and revenue tag only apply to a stay that overlaps the event (one night either side)
      const [ev] = eventId ? await q.select().from(s.events).where(eq(s.events.id, eventId)) : [];
      const day = (d: Date, shift = 0) => new Date(new Date(d).getTime() + shift * 86400000).toLocaleDateString("en-CA", { timeZone: TZ });
      const eventStay = !!ev && checkIn <= day(ev.endsAt, 1) && checkOut >= day(ev.startsAt);
      const av = await roomAvailability(rt.id, checkIn, checkOut, q);
      const inCart = lines
        .filter((l) => l.kind === "room" && l.refId === rt.id && l.booking!.date < checkOut && l.booking!.endDate! > checkIn)
        .reduce((a, l) => a + l.qty, 0);
      const free = Math.max(0, av.available - inCart);
      if (free < qty) throw new CartError(`${rt.name}: only ${free} room(s) available for those dates.`);
      const rate = eventStay && rt.eventRate ? rt.eventRate : member && rt.memberRate ? rt.memberRate : rt.rate;
      const guests = Math.max(1, Math.min(rt.capacity * qty, Math.floor(Number(meta.guests)) || rt.capacity));
      const total = rate * nights * qty;
      const balance = deposit ? total - Math.ceil((total * DEPOSIT_PCT) / 100) : 0;
      lines.push({
        kind: "room",
        refId: rt.id,
        stream: "rooms",
        itemName: `${rt.name} · ${nights} night${nights > 1 ? "s" : ""} (${checkIn} → ${checkOut})`,
        qty,
        unitPrice: rate * nights,
        total,
        balance,
        eventId,
        meta: { checkIn, checkOut, guests, package: str(meta.package) },
        booking: { kind: "room", date: checkIn, endDate: checkOut, qty, guests, label: rt.name },
      });
    } else if (raw.kind === "menu") {
      const [m] = await q.select().from(s.menuItems).where(eq(s.menuItems.id, raw.refId));
      if (!m || !m.available) throw new CartError("A menu item in your cart is unavailable.");
      const date = str(meta.date);
      needDate(date, m.name);
      needTime(str(meta.time), m.name);
      const unit = member && m.memberPrice ? m.memberPrice : m.price;
      lines.push({
        kind: "menu",
        refId: m.id,
        stream: "meals",
        itemName: `${m.name} (ready ${date} ${str(meta.time)})`,
        qty,
        unitPrice: unit,
        total: unit * qty,
        balance: 0,
        eventId,
        meta: { date, time: str(meta.time), notes: str(meta.notes) },
        booking: { kind: "meal", date, time: str(meta.time), qty, guests: qty, label: m.name },
      });
    } else if (raw.kind === "carwash") {
      const [cw] = await q.select().from(s.carWashServices).where(eq(s.carWashServices.id, raw.refId));
      if (!cw) throw new CartError("A car wash service is no longer available.");
      const date = str(meta.date);
      const time = str(meta.time);
      needDate(date, cw.name);
      const slots = await carwashSlots(date, q);
      const slot = slots.find((x) => x.time === time);
      if (!slot) throw new CartError("Please choose a car wash time slot.");
      if (slot.remaining - take(`wash:${date}:${time}`, qty) < qty) throw new CartError(`The ${time} car wash slot on ${date} is full. Please pick another.`);
      if (!str(meta.vehicleReg).trim()) throw new CartError("Please enter your vehicle registration for the car wash.");
      lines.push({
        kind: "carwash",
        refId: cw.id,
        stream: "carwash",
        itemName: `${cw.name} · ${date} ${time} · ${str(meta.vehicleReg).toUpperCase()}`,
        qty,
        unitPrice: cw.price,
        total: cw.price * qty,
        balance: 0,
        eventId,
        meta: { date, time, vehicleReg: str(meta.vehicleReg).toUpperCase(), vehicleType: str(meta.vehicleType) },
        booking: { kind: "carwash", date, time, qty, guests: 1, label: cw.name },
      });
    } else if (raw.kind === "product") {
      const [p] = await q.select().from(s.products).where(eq(s.products.id, raw.refId));
      if (!p) throw new CartError("A product in your cart is no longer available.");
      if (p.stock != null) {
        const left = Math.max(0, p.stock - (await heldQty(q, "product", p.id)) - take(`product:${p.id}`, qty));
        if (left < qty) throw new CartError(left ? `${p.name}: only ${left} in stock.` : `${p.name} is sold out.`);
      }
      if (p.sizes && !p.sizes.split(",").includes(str(meta.size))) throw new CartError(`Please choose a size for ${p.name}.`);
      const bundle = p.bundlePrice != null && p.eventId != null && entryEventIds.has(p.eventId);
      const unit = bundle ? p.bundlePrice! : p.price;
      lines.push({
        kind: "product",
        refId: p.id,
        stream: p.category === "golf" ? "greenfees" : "merchandise",
        itemName: `${p.name}${str(meta.size) ? " (" + str(meta.size) + ")" : ""}${bundle ? " · bundle price" : ""}`,
        qty,
        unitPrice: unit,
        total: unit * qty,
        balance: 0,
        eventId: eventId ?? p.eventId,
        meta: { size: str(meta.size), fulfilment: str(meta.fulfilment) || "collect" },
      });
    } else if (raw.kind === "lesson") {
      const [l] = await q.select().from(s.lessons).where(eq(s.lessons.id, raw.refId));
      if (!l) throw new CartError("A lesson in your cart is no longer available.");
      const date = str(meta.date);
      needDate(date, l.name);
      needTime(str(meta.time), l.name);
      lines.push({
        kind: "lesson",
        refId: l.id,
        stream: "lessons",
        itemName: `${l.name} · ${date} ${str(meta.time)}`,
        qty,
        unitPrice: l.price,
        total: l.price * qty,
        balance: 0,
        eventId: null,
        meta: { date, time: str(meta.time) },
        booking: { kind: "lesson", date, time: str(meta.time), qty: 1, guests: 1, label: l.name },
      });
    } else if (raw.kind === "greenfee") {
      const [g] = await q.select().from(s.greenFees).where(eq(s.greenFees.id, raw.refId));
      if (!g) throw new CartError("A green fee in your cart is no longer available.");
      const date = str(meta.date);
      needDate(date, "your tee time");
      needTime(str(meta.time), "your tee time");
      const holes = Number(meta.holes) === 9 ? 9 : 18;
      const wk = isWeekend(date);
      const unit = wk ? (holes === 9 ? g.weekend9 : g.weekend18) : holes === 9 ? g.weekday9 : g.weekday18;
      lines.push({
        kind: "greenfee",
        refId: g.id,
        stream: "greenfees",
        itemName: `Green fee · ${g.category} · ${holes} holes · ${date} ~${str(meta.time)}`,
        qty,
        unitPrice: unit,
        total: unit * qty,
        balance: 0,
        eventId: null,
        meta: { date, time: str(meta.time), holes },
        booking: { kind: "teetime", date, time: str(meta.time), qty: 1, guests: qty, label: `${g.category} ${holes} holes` },
      });
    } else if (raw.kind === "membership") {
      const [m] = await q.select().from(s.memberships).where(eq(s.memberships.id, raw.refId));
      if (!m) throw new CartError("Membership record not found.");
      const [cat] = await q.select().from(s.membershipCategories).where(eq(s.membershipCategories.id, m.categoryId));
      if (!["approved", "active", "lapsed"].includes(m.status))
        throw new CartError("This membership application has not been approved yet.");
      const joining = m.status === "approved" ? cat.joiningFee : 0;
      const unit = joining + cat.annualFee;
      lines.push({
        kind: "membership",
        refId: m.id,
        stream: "membership",
        itemName: `${cat.name} ${m.status === "approved" ? "joining fee + first subscription" : "annual renewal"} — ${m.name}`,
        qty: 1,
        unitPrice: unit,
        total: unit,
        balance: 0,
        eventId: null,
        meta: { membershipId: m.id },
      });
    }
  }
  return lines;
}

export function applyPromo(code: string | undefined) {
  const c = (code || "").trim().toUpperCase();
  return PROMO_CODES[c] ? { code: c, ...PROMO_CODES[c] } : null;
}

export async function quoteCart(items: CartItem[], opts: QuoteOpts): Promise<Quote> {
  return (await priceCart(items, opts, db)).quote;
}

// memberPhone must come from the signed-in session, never from the request body (PY-3).
type QuoteOpts = { memberPhone?: string | null; promo?: string; deposit?: boolean };

async function priceCart(items: CartItem[], opts: QuoteOpts, q: Q): Promise<{ quote: Quote; lines: Line[] }> {
  const empty: Quote = { ok: false, lines: [], subtotal: 0, discount: 0, total: 0, amountDue: 0, balance: 0, member: false };
  if (!items.length) return { quote: { ...empty, error: "Your cart is empty." }, lines: [] };
  if (items.length > 60) return { quote: { ...empty, error: "Your cart has too many items." }, lines: [] };
  try {
    const member = await isMemberPhone(opts.memberPhone, q);
    const priced = await priceItems(items, member, !!opts.deposit, q);
    const promo = applyPromo(opts.promo);
    const subtotal = priced.reduce((a, l) => a + l.total, 0);
    let discount = 0;
    const lines = priced.map((l) => {
      if (!promo) return l;
      const net = Math.round((l.total * (100 - promo.pct)) / 100);
      discount += l.total - net;
      const bal = l.balance ? Math.round((l.balance * (100 - promo.pct)) / 100) : 0;
      return { ...l, total: net, balance: bal };
    });
    const total = subtotal - discount;
    const balance = lines.reduce((a, l) => a + l.balance, 0);
    const quote: Quote = {
      ok: true,
      lines: lines.map((l) => ({ kind: l.kind, itemName: l.itemName, qty: l.qty, unitPrice: l.unitPrice, total: l.total, balance: l.balance, stream: l.stream, eventId: l.eventId })),
      subtotal,
      discount,
      total,
      amountDue: total - balance,
      balance,
      member,
      promoLabel: promo?.label,
    };
    return { quote, lines };
  } catch (e) {
    if (e instanceof CartError) return { quote: { ...empty, error: e.message }, lines: [] };
    throw e;
  }
}

function orderNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[crypto.randomInt(chars.length)];
  return `NGC-${out}`;
}

export async function upsertCustomer(c: { phone: string; name: string; email?: string; company?: string; consent?: boolean }, q: Q = db) {
  const [row] = await q
    .insert(s.customers)
    .values({ phone: c.phone, name: c.name, email: c.email || "", company: c.company || "", marketingConsent: !!c.consent })
    .onConflictDoUpdate({
      target: s.customers.phone,
      set: {
        name: c.name || sql`${s.customers.name}`,
        email: c.email || sql`${s.customers.email}`,
        company: c.company || sql`${s.customers.company}`,
        marketingConsent: c.consent ? true : sql`${s.customers.marketingConsent}`,
      },
    })
    .returning();
  return row;
}

export async function createOrder(input: {
  items: CartItem[];
  name: string;
  phone: string;
  email?: string;
  company?: string;
  poRef?: string;
  promo?: string;
  deposit?: boolean;
  consent?: boolean;
  source?: string;
  memberPhone?: string | null;
}) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new CartError("Enter a valid Kenyan phone number, e.g. 0712 345 678.");
  if (!input.name.trim()) throw new CartError("Please enter your name.");
  const name = input.name.trim().slice(0, 100);

  // One checkout at a time reads and takes capacity, so rooms, slots, entries and stock cannot be oversold.
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(424243)`);

    // release any earlier abandoned checkout from the same phone, including its holds
    const stale = await tx.select().from(s.orders).where(and(eq(s.orders.phone, phone), eq(s.orders.status, "pending")));
    for (const o of stale) await failOrder(o.number, "cancelled", tx);

    const { quote, lines } = await priceCart(input.items, { memberPhone: input.memberPhone, promo: input.promo, deposit: input.deposit }, tx);
    if (!quote.ok) throw new CartError(quote.error || "Cart error");
    if (quote.amountDue <= 0) throw new CartError("Order total must be above zero.");

    const customer = await upsertCustomer({ phone, name, email: input.email, company: input.company, consent: input.consent }, tx);
    const [order] = await tx
      .insert(s.orders)
      .values({
        number: orderNumber(),
        customerId: customer.id,
        customerName: name,
        phone,
        email: input.email || "",
        subtotal: quote.subtotal,
        discount: quote.discount,
        total: quote.total,
        amountDue: quote.amountDue,
        balance: quote.balance,
        promoCode: applyPromo(input.promo)?.code || "",
        poRef: input.poRef || "",
        isMember: quote.member,
        source: input.source || "web",
      })
      .returning();

    const holdExpires = new Date(Date.now() + HOLD_MINUTES * 60_000);
    for (const { booking, ...line } of lines) {
      const [row] = await tx.insert(s.orderLines).values({ ...line, orderId: order.id }).returning();
      if (booking)
        await tx.insert(s.bookings).values({ ...booking, orderLineId: row.id, orderId: order.id, refId: line.refId, status: "held", holdExpires, name, phone, details: line.meta });
    }
    return order;
  });
}

export async function failOrder(number: string, status: "failed" | "cancelled" = "failed", q: Q = db) {
  const [o] = await q.select().from(s.orders).where(eq(s.orders.number, number));
  if (!o || o.status !== "pending") return;
  await q.update(s.orders).set({ status }).where(eq(s.orders.id, o.id));
  await q.update(s.payments).set({ status: "failed" }).where(and(eq(s.payments.orderId, o.id), eq(s.payments.status, "pending")));
  await q.update(s.bookings).set({ status: "cancelled" }).where(and(eq(s.bookings.orderId, o.id), eq(s.bookings.status, "held")));
}

function qrToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[crypto.randomInt(chars.length)];
  return `NGC-${out}`;
}

export async function settleOrder(number: string, receipt: string, paymentId: number) {
  const result = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(s.orders).where(eq(s.orders.number, number)).for("update");
    if (!o) return null;
    if (o.status === "paid" || o.status === "refunded") return null;
    // a payment confirmed after its checkout was cancelled still stands; staff check for clashes
    if (o.status !== "pending")
      await tx.insert(s.auditLogs).values({ actor: "system", action: "payment.late", detail: `${o.number} was ${o.status} when M-Pesa ${receipt} arrived: check availability` });
    await tx.update(s.orders).set({ status: "paid", paidAt: new Date() }).where(eq(s.orders.id, o.id));
    await tx
      .update(s.payments)
      .set({ status: "success", mpesaReceipt: receipt })
      .where(eq(s.payments.id, paymentId));
    const lines = await tx.select().from(s.orderLines).where(eq(s.orderLines.orderId, o.id));
    for (const l of lines) {
      if (l.kind === "entry" && l.refId) {
        const [et] = await tx.select().from(s.entryTypes).where(eq(s.entryTypes.id, l.refId));
        await tx.update(s.entryTypes).set({ sold: sql`${s.entryTypes.sold} + ${l.qty}` }).where(eq(s.entryTypes.id, l.refId));
        const meta = (l.meta || {}) as { players?: Record<string, string>[]; club?: string };
        const players = meta.players || [];
        const per = et?.players || 1;
        for (let i = 0; i < l.qty; i++) {
          const slice = et?.kind === "entry" ? players.slice(i * per, (i + 1) * per) : [];
          const holder = (slice[0]?.name || o.customerName).trim();
          await tx.insert(s.registrations).values({
            orderLineId: l.id,
            orderId: o.id,
            eventId: l.eventId!,
            entryTypeId: l.refId,
            holderName: holder,
            players: slice.length ? slice : [{ name: holder }],
            club: meta.club || "",
            shirtSize: slice.map((p) => p.shirt).filter(Boolean).join(", "),
            dietary: slice.map((p) => p.dietary).filter(Boolean).join("; "),
            qrCode: qrToken(),
          });
        }
      } else if (l.kind === "product" && l.refId) {
        await tx
          .update(s.products)
          .set({ stock: sql`greatest(${s.products.stock} - ${l.qty}, 0)` })
          .where(and(eq(s.products.id, l.refId), sql`${s.products.stock} is not null`));
      } else if (l.kind === "membership" && l.refId) {
        const [m] = await tx.select().from(s.memberships).where(eq(s.memberships.id, l.refId));
        if (m) {
          const base = m.renewalDue && new Date(m.renewalDue) > new Date() ? new Date(m.renewalDue) : new Date();
          const due = new Date(base);
          due.setFullYear(due.getFullYear() + 1);
          await tx
            .update(s.memberships)
            .set({ status: "active", joinedAt: m.joinedAt || new Date(), renewalDue: due })
            .where(eq(s.memberships.id, m.id));
        }
      }
    }
    await tx
      .update(s.bookings)
      .set({ status: sql`case when ${s.bookings.kind} = 'teetime' then 'requested' else 'confirmed' end`, holdExpires: null })
      .where(and(eq(s.bookings.orderId, o.id), inArray(s.bookings.status, ["held", "cancelled"])));
    return { order: o, lines };
  });
  if (result) await queueReceipt(result.order, receipt);
  return result;
}

async function queueReceipt(o: typeof s.orders.$inferSelect, receipt: string) {
  const url = `${CLUB.url}/orders/${o.number}`;
  const sms = `${CLUB.name}: payment of ${kes(o.amountDue)} received. Order ${o.number}, M-Pesa ${receipt}.${o.balance ? ` Balance ${kes(o.balance)} due at check-in.` : ""} Tickets & receipt: ${url}`;
  const wa = waLink(`Hello Nakuru Golf Club, my order ${o.number} is confirmed (M-Pesa ${receipt}). Please help me with my visit.`);
  await notify(
    { channel: "sms", recipient: o.phone, body: sms, orderNumber: o.number },
    { channel: "email", recipient: o.email || "", subject: `Receipt and tickets: order ${o.number}`, body: `${sms}\n\nPaid on ${fmtDate(new Date())}. Questions? ${CLUB.phoneDisplay}`, orderNumber: o.number },
    { channel: "whatsapp", recipient: o.phone, body: `Confirmation link: ${wa}`, orderNumber: o.number },
  );
}

export async function cancelAndRefund(orderId: number, reason: string, actor = "staff") {
  const [o] = await db.update(s.orders).set({ status: "refunded", refundReason: reason }).where(and(eq(s.orders.id, orderId), eq(s.orders.status, "paid"))).returning();
  if (!o) return false;
  const lines = await db.select().from(s.orderLines).where(eq(s.orderLines.orderId, o.id));
  for (const l of lines) {
    if (l.kind === "entry" && l.refId) await db.update(s.entryTypes).set({ sold: sql`greatest(${s.entryTypes.sold} - ${l.qty}, 0)` }).where(eq(s.entryTypes.id, l.refId));
    if (l.kind === "product" && l.refId) await db.update(s.products).set({ stock: sql`${s.products.stock} + ${l.qty}` }).where(and(eq(s.products.id, l.refId), sql`${s.products.stock} is not null`));
  }
  await db.delete(s.registrations).where(eq(s.registrations.orderId, o.id));
  await db.update(s.bookings).set({ status: "cancelled" }).where(eq(s.bookings.orderId, o.id));
  await db.insert(s.auditLogs).values({ actor, action: "refund", detail: `${o.number}: ${reason}` });
  return true;
}
