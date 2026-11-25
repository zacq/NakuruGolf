"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { Alert, Field, Honeypot, Stepper } from "./ui";
import { DEPOSIT_PCT, PAYBILL, kes, waLink } from "@/lib/constants";
import type { Quote } from "@/lib/types";
import { track } from "@/lib/analytics";

type Cust = { name: string; phone: string; email: string; company: string; poRef: string; mpesaPhone: string; consent: boolean };
const blank: Cust = { name: "", phone: "", email: "", company: "", poRef: "", mpesaPhone: "", consent: false };

export default function CartPage() {
  const { items, remove, setQty, clear, hydrated } = useCart();
  const router = useRouter();
  const [c, setC] = useState<Cust>(blank);
  const [promo, setPromo] = useState("");
  const [deposit, setDeposit] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState("");
  const [phase, setPhase] = useState<"form" | "sending" | "paying" | "failed">("form");
  const [pay, setPay] = useState<{ number: string; mode: string; amount: number } | null>(null);
  const [slow, setSlow] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ngc_cust");
      if (saved) setC({ ...blank, ...JSON.parse(saved) });
    } catch { /* ignore */ }
    fetch("/api/auth").then((r) => r.json()).then((j) => {
      if (j.phone) setC((x) => (x.phone ? x : { ...x, phone: "0" + String(j.phone).slice(3) }));
    }).catch(() => null);
  }, []);
  useEffect(() => {
    localStorage.setItem("ngc_cust", JSON.stringify(c));
  }, [c]);

  const hasRoom = items.some((i) => i.kind === "room");

  useEffect(() => {
    if (!hydrated) return;
    if (!items.length) { setQuote(null); return; }
    const t = setTimeout(() => {
      fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, promo, deposit: deposit && hasRoom }) })
        .then((r) => r.json()).then(setQuote).catch(() => null);
    }, 350);
    return () => clearTimeout(t);
  }, [items, promo, deposit, hasRoom, hydrated]);

  useEffect(() => {
    if (phase !== "paying") return;
    const t = setTimeout(() => setSlow(true), 60_000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  const set = (k: keyof Cust, v: string | boolean) => setC((x) => ({ ...x, [k]: v }));

  function startPolling(number: string, total: number) {
    if (poll.current) clearInterval(poll.current);
    poll.current = setInterval(async () => {
      const r = await fetch(`/api/orders/${number}/status`).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (!j) return;
      if (j.status === "paid") {
        if (poll.current) clearInterval(poll.current);
        track("purchase", { value: total, currency: "KES", order: number, streams: [...new Set(quote?.lines.map((l) => l.stream))].join(",") });
        clear();
        router.push(`/orders/${number}`);
      } else if (j.status === "failed" || j.status === "cancelled") {
        if (poll.current) clearInterval(poll.current);
        setPhase("failed");
      }
    }, 2500);
  }

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (quote && !quote.ok) return setErr(quote.error || "Please fix your cart.");
    setPhase("sending");
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, ...c, promo, deposit: deposit && hasRoom, website: (e.target as HTMLFormElement).website?.value || "" }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (!j?.ok) {
      setErr(j?.error || "No connection. Your cart is saved: please retry.");
      setPhase("form");
      return;
    }
    setPay({ number: j.number, mode: j.mode, amount: j.amount });
    setPhase("paying");
    setSlow(false);
    startPolling(j.number, quote?.total || 0);
  }

  async function demo(approve: boolean) {
    if (!pay) return;
    setDemoBusy(true);
    await fetch("/api/mpesa/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: pay.number, approve }) }).catch(() => null);
    setDemoBusy(false);
  }

  if (!hydrated) return <div className="container-x section" aria-busy>Loading cart…</div>;

  if (phase === "paying" && pay)
    return (
      <div className="container-x section max-w-lg">
        <div className="card grid gap-4 text-center">
          <div className="text-5xl" aria-hidden>📱</div>
          <h1 className="text-2xl font-bold text-fairway-900">Check your phone</h1>
          <p>We've sent an M-Pesa prompt for <strong>{kes(pay.amount)}</strong> to your phone. Enter your M-Pesa PIN to complete order <strong>{pay.number}</strong>.</p>
          <p className="animate-pulse text-sm text-fairway-800/70">Waiting for confirmation…</p>
          {pay.mode === "demo" && (
            <div className="grid gap-2 rounded-xl border-2 border-dashed border-gold-500 p-3">
              <p className="text-xs font-semibold text-gold-600">DEMO MODE · M-Pesa credentials are not configured, so simulate the PIN entry:</p>
              <button onClick={() => demo(true)} disabled={demoBusy} className="btn-primary">Enter PIN & pay {kes(pay.amount)}</button>
              <button onClick={() => demo(false)} disabled={demoBusy} className="btn-outline">Cancel on phone</button>
            </div>
          )}
          {slow && <button className="btn-outline" onClick={() => { if (poll.current) clearInterval(poll.current); setPhase("failed"); }}>No prompt, or it expired? Try again</button>}
          <p className="text-sm text-fairway-800/70">No prompt? {PAYBILL && <>Pay to Paybill <strong>{PAYBILL}</strong>, account number <strong>{pay.number}</strong>, then </>}<a className="underline" target="_blank" rel="noopener" href={waLink(`Hello Nakuru Golf Club, I need help paying for order ${pay.number}.`)}>message us on WhatsApp</a>. If you have already entered your PIN, please wait rather than paying twice.</p>
        </div>
      </div>
    );

  if (phase === "failed")
    return (
      <div className="container-x section max-w-lg">
        <div className="card grid gap-4 text-center">
          <div className="text-5xl" aria-hidden>⚠️</div>
          <h1 className="text-2xl font-bold text-fairway-900">Payment didn't go through</h1>
          <p>We have not received a confirmation: the prompt was cancelled or timed out. Your cart is still saved. If you got an M-Pesa message for this order, do not pay again: message us on WhatsApp.</p>
          <button className="btn-primary" onClick={() => { setPhase("form"); setPay(null); }}>Try again</button>
        </div>
      </div>
    );

  if (!items.length)
    return (
      <div className="container-x section max-w-lg text-center">
        <div className="text-5xl" aria-hidden>🛒</div>
        <h1 className="mt-3 text-2xl font-bold text-fairway-900">Your cart is empty</h1>
        <p className="mt-2 text-fairway-800/80">Entries, rooms, meals, car wash, tee times and merchandise all check out together.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link href="/events" className="btn-primary">Browse events</Link>
          <Link href="/stay" className="btn-outline">Book a stay</Link>
        </div>
      </div>
    );

  const eventSlug = items.map((i) => i.meta.eventSlug as string | undefined).find(Boolean);
  const has = (k: string) => items.some((i) => i.kind === k);
  const hasMerch = items.some((i) => i.kind === "product");
  const hasEventMeal = items.some((i) => i.kind === "menu" || (i.kind === "entry" && /dinner|gala/i.test(i.label)));
  const suggestions: { href: string; text: string }[] = [];
  if (has("entry") && !hasRoom) suggestions.push({ href: eventSlug ? `/events/${eventSlug}#stay` : "/stay", text: "Add a Tournament Stay: a room for the event dates" });
  if (has("entry") && !hasEventMeal) suggestions.push({ href: eventSlug ? `/events/${eventSlug}#dinner` : "/dine", text: "Add the gala dinner or a meal package" });
  if (has("entry") && !hasMerch) suggestions.push({ href: eventSlug ? `/events/${eventSlug}#merch` : "/shop", text: "Add event merchandise (polo shirt bundle price)" });
  if ((has("entry") || has("greenfee") || hasRoom) && !has("carwash")) suggestions.push({ href: "/car-wash", text: "Play & Wash: have your car ready when you finish" });
  if (has("greenfee") && !hasRoom) suggestions.push({ href: "/stay", text: "Golf & Stay: add a room for the night" });

  return (
    <div className="container-x section">
      <h1 className="mb-5 text-3xl font-bold text-fairway-900">Your cart</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="grid content-start gap-3">
          {items.map((i) => {
            const ql = quote?.lines;
            return (
              <div key={i.id} className="card flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-fairway-900">{i.label}</p>
                  {i.detail && <p className="line-clamp-2 text-sm text-fairway-800/70">{i.detail}</p>}
                  <button onClick={() => remove(i.id)} className="mt-1 min-h-11 text-sm font-semibold text-red-700 underline">Remove</button>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {i.kind !== "room" && i.kind !== "membership" && i.kind !== "carwash" && i.kind !== "lesson" && !(i.kind === "entry" && Array.isArray(i.meta.players) && i.meta.players.length > 0) && <Stepper label={i.label} value={i.qty} min={1} max={50} onChange={(n) => setQty(i.id, n)} />}
                  {!ql && <p className="font-bold">{kes(i.unitPrice * i.qty)}</p>}
                </div>
              </div>
            );
          })}
          {suggestions.length > 0 && (
            <div className="rounded-2xl bg-gold-400/15 p-4">
              <p className="mb-2 font-serif text-lg font-bold text-fairway-900">Complete your visit</p>
              <ul className="grid gap-1">{suggestions.map((s) => <li key={s.href}><Link href={s.href} className="flex min-h-11 items-center text-sm font-semibold text-fairway-800 underline">➕ {s.text}</Link></li>)}</ul>
            </div>
          )}
        </div>

        <form onSubmit={checkout} className="card grid content-start gap-4 lg:sticky lg:top-20">
          <Honeypot />
          <h2 className="text-xl font-bold text-fairway-900">Checkout</h2>
          {quote?.ok && (
            <div className="grid gap-1 rounded-xl bg-fairway-50 p-3 text-sm">
              {quote.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-3"><span className="line-clamp-2">{l.itemName} {l.qty > 1 ? `× ${l.qty}` : ""}</span><span className="shrink-0 font-semibold">{kes(l.total)}</span></div>
              ))}
              {quote.discount > 0 && <div className="flex justify-between text-fairway-700"><span>Discount {quote.promoLabel}</span><span>−{kes(quote.discount)}</span></div>}
              {quote.member && <p className="chip w-fit">Member prices applied</p>}
              <div className="mt-1 flex justify-between border-t border-fairway-200 pt-2 text-base font-bold"><span>Total</span><span>{kes(quote.total)}</span></div>
              {quote.balance > 0 && <div className="flex justify-between"><span>Balance at check-in</span><span>{kes(quote.balance)}</span></div>}
              <div className="flex justify-between text-base font-bold text-fairway-800"><span>Pay now</span><span>{kes(quote.amountDue)}</span></div>
            </div>
          )}
          {quote && !quote.ok && <Alert>{quote.error}</Alert>}
          <Field label="Full name"><input className="field" required autoComplete="name" value={c.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Phone (M-Pesa)" hint="The M-Pesa prompt goes to this number."><input className="field" required type="tel" inputMode="numeric" autoComplete="tel" placeholder="0712 345 678" value={c.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email (for your receipt)"><input className="field" type="email" inputMode="email" autoComplete="email" value={c.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <details className="rounded-xl border border-fairway-100 p-3">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Company PO, different M-Pesa number</summary>
            <div className="mt-3 grid gap-3">
              <Field label="Company"><input className="field" value={c.company} onChange={(e) => set("company", e.target.value)} /></Field>
              <Field label="PO / reference"><input className="field" value={c.poRef} onChange={(e) => set("poRef", e.target.value)} /></Field>
              <Field label="Pay from another M-Pesa number"><input className="field" type="tel" inputMode="numeric" value={c.mpesaPhone} onChange={(e) => set("mpesaPhone", e.target.value)} /></Field>
            </div>
          </details>
          <Field label="Promo or member code"><input className="field uppercase" value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="e.g. NAKURU10" /></Field>
          {hasRoom && (
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 accent-[#155339]" checked={deposit} onChange={(e) => setDeposit(e.target.checked)} /> Pay a {DEPOSIT_PCT}% deposit for rooms now; balance at check-in.</label>
          )}
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 accent-[#155339]" checked={c.consent} onChange={(e) => set("consent", e.target.checked)} /> Send me event news and offers on WhatsApp/SMS (optional; opt out any time).</label>
          {err && <Alert>{err}</Alert>}
          <button className="btn-gold w-full text-lg" disabled={phase === "sending" || !quote?.ok}>
            {phase === "sending" ? "Sending M-Pesa prompt…" : `Pay ${quote?.ok ? kes(quote.amountDue) : ""} with M-Pesa`}
          </button>
          <p className="text-center text-xs text-fairway-800/70">Rooms, slots and event places are held for 15 minutes while you pay. By paying you accept our <Link href="/policies" className="underline">policies</Link>.</p>
        </form>
      </div>
    </div>
  );
}
