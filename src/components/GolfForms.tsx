"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { Alert, Field, Honeypot, Stepper, useTodayStr } from "./ui";
import { Img } from "./Bits";
import { isWeekend, kes } from "@/lib/constants";
import { track } from "@/lib/analytics";

export type FeeView = { id: number; category: string; weekday9: number; weekday18: number; weekend9: number; weekend18: number };
export type ExtraView = { id: number; name: string; description: string; price: number };

export function TeeTimeForm({ fees, extras }: { fees: FeeView[]; extras: ExtraView[] }) {
  const { add } = useCart();
  const today = useTodayStr();
  const [feeId, setFeeId] = useState(fees[1]?.id ?? fees[0]?.id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [holes, setHoles] = useState(18);
  const [players, setPlayers] = useState(2);
  const [picked, setPicked] = useState<number[]>([]);
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  useEffect(() => {
    if (today && !date) setDate(today);
  }, [today, date]);

  const fee = fees.find((f) => f.id === feeId);
  if (!fee) return null;
  const wk = date ? isWeekend(date) : false;
  const unit = wk ? (holes === 9 ? fee.weekend9 : fee.weekend18) : holes === 9 ? fee.weekday9 : fee.weekday18;
  const extrasTotal = extras.filter((e) => picked.includes(e.id)).reduce((a, e) => a + e.price, 0);

  function addIt() {
    if (!date) return setMsg({ kind: "error", text: "Choose a date." });
    add({
      kind: "greenfee",
      refId: fee!.id,
      qty: players,
      label: `Tee time: ${fee!.category} · ${holes} holes × ${players}`,
      detail: `${date} around ${time} · ${wk ? "weekend" : "weekday"} rate`,
      unitPrice: unit,
      meta: { date, time, holes },
    });
    for (const e of extras.filter((x) => picked.includes(x.id)))
      add({ kind: "product", refId: e.id, qty: 1, label: e.name, detail: `with tee time ${date}`, unitPrice: e.price, meta: {} });
    setMsg({ kind: "ok", text: "Tee time request added. Staff confirm your slot on WhatsApp after payment. Add a car wash so it's ready when you finish." });
  }

  return (
    <div className="card grid gap-4">
      <div className="grid gap-3">
        <Field label="Player category">
          <select className="field" value={feeId} onChange={(e) => setFeeId(Number(e.target.value))}>
            {fees.map((f) => <option key={f.id} value={f.id}>{f.category}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className="field" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Preferred time"><input type="time" step={600} className="field" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label">Holes</p>
            <div className="inline-flex overflow-hidden rounded-xl border border-fairway-200" role="radiogroup" aria-label="Holes">
              {[9, 18].map((h) => (
                <button type="button" role="radio" aria-checked={holes === h} key={h} onClick={() => setHoles(h)} className={`h-12 w-20 font-bold ${holes === h ? "bg-fairway-700 text-white" : "bg-white text-fairway-800"}`}>{h}</button>
              ))}
            </div>
          </div>
          <div><p className="label">Players</p><Stepper label="players" value={players} min={1} max={8} onChange={setPlayers} /></div>
        </div>
      </div>
      {extras.length > 0 && (
        <fieldset>
          <legend className="label">Extras</legend>
          <div className="grid gap-2">
            {extras.map((e) => (
              <label key={e.id} className="flex min-h-12 items-center gap-3 rounded-xl border border-fairway-100 bg-white px-3">
                <input type="checkbox" className="h-5 w-5 accent-[#155339]" checked={picked.includes(e.id)} onChange={(ev) => setPicked((p) => (ev.target.checked ? [...p, e.id] : p.filter((x) => x !== e.id)))} />
                <span className="flex-1 text-sm font-medium">{e.name}</span>
                <span className="text-sm font-bold text-fairway-700">{kes(e.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex items-center justify-between rounded-xl bg-fairway-50 p-3">
        <span className="text-sm">{kes(unit)} × {players} {extrasTotal ? `+ extras ${kes(extrasTotal)}` : ""}</span>
        <span className="text-xl font-bold text-fairway-900">{kes(unit * players + extrasTotal)}</span>
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <button type="button" onClick={addIt} className="btn-primary w-full">Add tee time to cart</button>
      {msg?.kind === "ok" && (
        <div className="grid grid-cols-2 gap-2"><Link href="/cart" className="btn-gold text-sm">Go to cart</Link><Link href="/car-wash" className="btn-outline text-sm">+ Car wash</Link></div>
      )}
    </div>
  );
}

export type LessonView = { id: number; name: string; coach: string; description: string; price: number };

export function LessonBooker({ lessons }: { lessons: LessonView[] }) {
  const { add } = useCart();
  const today = useTodayStr();
  const [id, setId] = useState(lessons[0]?.id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (today && !date) setDate(today);
  }, [today, date]);
  const l = lessons.find((x) => x.id === id);
  return (
    <div className="grid gap-3">
      {lessons.map((x) => (
        <button type="button" key={x.id} onClick={() => setId(x.id)} aria-pressed={x.id === id} className={`rounded-2xl border-2 bg-white p-4 text-left ${x.id === id ? "border-gold-500 shadow-lg" : "border-fairway-100"}`}>
          <div className="flex justify-between gap-2"><p className="font-bold text-fairway-900">{x.name}</p><p className="font-bold text-fairway-700">{kes(x.price)}</p></div>
          <p className="text-sm text-fairway-800/80">{x.description} · Coach: {x.coach}</p>
        </button>
      ))}
      <div className="card grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className="field" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Time"><input type="time" step={900} className="field" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <button type="button" className="btn-primary w-full" onClick={() => { if (!l) return; add({ kind: "lesson", refId: l.id, qty: 1, label: l.name, detail: `${date} ${time}`, unitPrice: l.price, meta: { date, time } }); setMsg("Lesson added to your cart."); }}>
          Add lesson to cart
        </button>
        {msg && <Alert kind="ok">{msg} <Link href="/cart" className="font-bold underline">Go to cart</Link></Alert>}
      </div>
    </div>
  );
}

export type ProductView = { id: number; name: string; description: string; price: number; bundlePrice: number | null; stock: number | null; sizes: string; image: string; eventId: number | null };

export function ProductGrid({ products, eventId }: { products: ProductView[]; eventId?: number }) {
  const { add } = useCart();
  const [size, setSize] = useState<Record<number, string>>({});
  const [qty, setQty] = useState<Record<number, number>>({});
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => {
        const sizes = p.sizes ? p.sizes.split(",") : [];
        const out = p.stock != null && p.stock <= 0;
        const q = qty[p.id] || 1;
        return (
          <div key={p.id} className="card flex flex-col gap-3 !p-0 overflow-hidden">
            {p.image && <Img src={p.image} alt={p.name} className="h-40 w-full" />}
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div>
                <p className="font-bold text-fairway-900">{p.name}</p>
                <p className="text-sm text-fairway-800/80">{p.description}</p>
                <p className="mt-1 font-bold text-fairway-700">{kes(p.price)}</p>
                {p.bundlePrice && <p className="text-xs font-semibold text-gold-600">Bundle price {kes(p.bundlePrice)} when you also register for the event</p>}
                {p.stock != null && p.stock > 0 && p.stock <= 10 && <p className="text-xs font-semibold text-red-700">Only {p.stock} left</p>}
              </div>
              {out ? (
                <p className="chip w-fit bg-gray-200 text-gray-700">Sold out</p>
              ) : (
                <div className="mt-auto grid gap-2">
                  {sizes.length > 0 && (
                    <select aria-label="Size" className="field" value={size[p.id] || sizes[1] || sizes[0]} onChange={(e) => setSize((s) => ({ ...s, [p.id]: e.target.value }))}>
                      {sizes.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Stepper label={p.name} value={q} min={1} max={Math.min(10, p.stock ?? 10)} onChange={(n) => setQty((s) => ({ ...s, [p.id]: n }))} />
                    <button type="button" className="btn-primary flex-1 text-sm" onClick={() => add({ kind: "product", refId: p.id, qty: q, eventId: eventId ?? p.eventId, label: p.name, detail: sizes.length ? `Size ${size[p.id] || sizes[1] || sizes[0]} · collect at the club` : "Collect at the club", unitPrice: p.price, meta: { size: sizes.length ? size[p.id] || sizes[1] || sizes[0] : "", fulfilment: "collect" } })}>
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type MenuView = { id: number; category: string; name: string; description: string; price: number };

export function MealOrder({ items, eventId, defaultDate }: { items: MenuView[]; eventId?: number; defaultDate?: string }) {
  const { add } = useCart();
  const today = useTodayStr();
  const [date, setDate] = useState(defaultDate || "");
  const [time, setTime] = useState("13:00");
  const [qty, setQty] = useState<Record<number, number>>({});
  const [added, setAdded] = useState("");
  useEffect(() => {
    if (today && !date) setDate(today);
  }, [today, date]);
  return (
    <div className="grid gap-4">
      <div className="card grid grid-cols-2 gap-3">
        <Field label="Ready on"><input type="date" className="field" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Ready at"><input type="time" step={900} className="field" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>
      <ul className="grid gap-2">
        {items.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-fairway-100 bg-white p-3">
            <div className="min-w-0">
              <p className="font-semibold text-fairway-900">{m.name}</p>
              <p className="text-sm text-fairway-800/70">{m.description}</p>
              <p className="text-sm font-bold text-fairway-700">{kes(m.price)}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Stepper label={m.name} value={qty[m.id] || 1} min={1} max={20} onChange={(n) => setQty((q) => ({ ...q, [m.id]: n }))} />
              <button type="button" className="btn-outline min-h-11 px-4 text-sm" onClick={() => { add({ kind: "menu", refId: m.id, qty: qty[m.id] || 1, eventId: eventId ?? null, label: m.name, detail: `Ready ${date} ${time}`, unitPrice: m.price, meta: { date, time } }); setAdded(m.name); }}>Pre-order</button>
            </div>
          </li>
        ))}
      </ul>
      {added && <Alert kind="ok">{added} added. <Link href="/cart" className="font-bold underline">Go to cart</Link></Alert>}
    </div>
  );
}

export function TableForm() {
  const today = useTodayStr();
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  const [wa, setWa] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setState("sending");
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const r = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fd, consent: fd.consent === "on" }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (!j?.ok) {
      setErr(j?.error || "Could not reserve. Check your connection and retry.");
      setState("idle");
      return;
    }
    track("table_booked", {});
    setWa(j.whatsapp);
    setState("done");
  }
  if (state === "done")
    return (
      <div className="grid gap-3">
        <Alert kind="ok">Your table is reserved. Please confirm on WhatsApp so reception has your number handy.</Alert>
        <a href={wa} target="_blank" rel="noopener" className="btn-wa">💬 Confirm on WhatsApp</a>
      </div>
    );
  return (
    <form onSubmit={submit} className="card grid gap-4">
      <Honeypot />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><input name="date" type="date" required min={today} className="field" /></Field>
        <Field label="Time"><input name="time" type="time" step={900} required defaultValue="19:00" className="field" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Guests"><input name="guests" type="number" inputMode="numeric" min={1} max={60} defaultValue={2} required className="field" /></Field>
        <Field label="Occasion">
          <select name="occasion" className="field">{["Dinner", "Lunch", "Birthday", "Business meeting", "Anniversary", "Other"].map((o) => <option key={o}>{o}</option>)}</select>
        </Field>
      </div>
      <Field label="Your name"><input name="name" required autoComplete="name" className="field" /></Field>
      <Field label="Phone"><input name="phone" type="tel" inputMode="numeric" required autoComplete="tel" placeholder="0712 345 678" className="field" /></Field>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="consent" className="mt-1 h-5 w-5 accent-[#155339]" /> Send me club offers and event news (optional; opt out any time).</label>
      {err && <Alert>{err}</Alert>}
      <button className="btn-primary w-full" disabled={state === "sending"}>{state === "sending" ? "Reserving…" : "Reserve table"}</button>
    </form>
  );
}
