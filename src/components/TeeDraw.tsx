"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { Alert, Field } from "./ui";
import { kes } from "@/lib/constants";
import { track } from "@/lib/analytics";

export type TeeView = {
  id: number;
  clock: string;
  label: string;
  day: string;
  dayLabel: string;
  entries: number;
  capacity: number;
  players: number;
  fee: number;
  status: "open" | "locked" | "drawn";
};

const isOpen = (t: TeeView) => t.status === "open" && t.entries < t.capacity;

export default function TeeDraw({ event, tees }: { event: { id: number; name: string; slug: string }; tees: TeeView[] }) {
  const { add, items } = useCart();
  const router = useRouter();
  const days = [...new Map(tees.map((t) => [t.day, t.dayLabel])).entries()];
  const [day, setDay] = useState(days.find(([d]) => tees.some((t) => t.day === d && isOpen(t)))?.[0] ?? days[0]?.[0]);
  const [pick, setPick] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [handicap, setHandicap] = useState("");
  const [hdidId, setHdidId] = useState("");
  const [club, setClub] = useState("");
  const [err, setErr] = useState("");
  const tee = tees.find((t) => t.id === pick);
  const list = tees.filter((t) => t.day === day);

  function enter() {
    setErr("");
    if (!tee) return setErr("Choose a tee time.");
    if (!name.trim()) return setErr("Enter your full name as it appears on HowDidiDo.");
    if (items.some((i) => i.kind === "ballot" && i.eventId === event.id)) return setErr("A draw entry for this event is already in your cart.");
    add({
      kind: "ballot",
      refId: tee.id,
      qty: 1,
      eventId: event.id,
      label: `Tee-time draw · ${tee.label}`,
      detail: `${name.trim()}${handicap ? ` · handicap ${handicap}` : ""}`,
      unitPrice: tee.fee,
      meta: { name: name.trim(), handicap, hdidId, club, eventSlug: event.slug },
    });
    track("begin_registration", { event: event.slug, draw: tee.label });
    router.push("/cart");
  }

  return (
    <div className="grid gap-4">
      {days.length > 1 && (
        <div className="grid grid-cols-2 gap-2 sm:flex" role="tablist" aria-label="Tournament day">
          {days.map(([d, l]) => {
            const open = tees.filter((t) => t.day === d && isOpen(t)).length;
            return (
              <button key={d} type="button" role="tab" aria-selected={day === d} onClick={() => { setDay(d); setPick(null); }} className={`min-h-14 rounded-xl px-4 text-left ${day === d ? "bg-fairway-800 text-white" : "border border-fairway-200 bg-white text-fairway-900"}`}>
                <span className="block font-bold">{l}</span>
                <span className="block text-xs opacity-80">{open} tee times open</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fairway-800/80" aria-hidden>
        <span><span className="mr-1 inline-block h-3 w-3 rounded bg-white ring-1 ring-fairway-200" />Open</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded bg-gold-400/40 ring-1 ring-gold-500" />Selected</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded bg-gray-200" />Full, closed or drawn</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10" role="radiogroup" aria-label="Tee time">
        {list.map((t) => (
          <button
            type="button"
            role="radio"
            key={t.id}
            aria-checked={pick === t.id}
            aria-label={`${t.label}, ${t.entries} of ${t.capacity} entries`}
            disabled={!isOpen(t)}
            onClick={() => setPick(t.id)}
            className={`min-h-16 rounded-xl border-2 p-1.5 text-center ${pick === t.id ? "border-gold-500 bg-gold-400/20" : "border-fairway-100 bg-white"} disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500`}
          >
            <span className="block font-bold">{t.clock}</span>
            <span className="block text-[11px]">{t.status === "drawn" ? "Drawn" : !isOpen(t) ? "Closed" : `${t.entries}/${t.capacity}`}</span>
            <span className="mt-1 block h-1 overflow-hidden rounded bg-fairway-100"><span className="block h-full bg-gold-500" style={{ width: `${Math.min(100, (t.entries / t.capacity) * 100)}%` }} /></span>
          </button>
        ))}
      </div>

      {tee ? (
        <div className="card grid gap-3 border-2 border-gold-500">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-lg font-bold text-fairway-900">{tee.label}</p>
            <p className="text-sm">{tee.entries} of {tee.capacity} entered · {tee.players} will play</p>
          </div>
          <p className="rounded-lg bg-fairway-50 p-2 text-sm">Your chance right now: <strong>{tee.players} in {Math.max(tee.players, tee.entries + 1)}</strong>. Entries close at {tee.capacity}.</p>
          <Field label="Full name (as on HowDidiDo)"><input className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Handicap index"><input className="field" inputMode="decimal" value={handicap} onChange={(e) => setHandicap(e.target.value)} /></Field>
            <Field label="HowDidiDo / CDH no."><input className="field" value={hdidId} onChange={(e) => setHdidId(e.target.value)} placeholder="Optional" /></Field>
          </div>
          <Field label="Home club"><input className="field" value={club} onChange={(e) => setClub(e.target.value)} placeholder="Nakuru Golf Club" /></Field>
          {err && <Alert>{err}</Alert>}
          <button type="button" onClick={enter} className="btn-gold w-full text-lg">Enter draw · pay {kes(tee.fee)} by M-Pesa</button>
          <p className="text-xs text-fairway-800/70">Next you confirm your phone number and approve the M-Pesa prompt. Your entry counts once Safaricom confirms the payment: no screenshots needed.</p>
        </div>
      ) : (
        <p className="rounded-xl border-2 border-dashed border-fairway-200 p-4 text-center text-sm text-fairway-800/80">Tap an open tee time to enter its draw.</p>
      )}
      {!tee && err && <Alert>{err}</Alert>}
    </div>
  );
}
