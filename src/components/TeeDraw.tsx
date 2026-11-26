"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { Alert, Field } from "./ui";
import { kes } from "@/lib/constants";
import { track } from "@/lib/analytics";

export type TeeView = { id: number; clock: string; label: string; entries: number; capacity: number; players: number; fee: number; status: "open" | "locked" | "drawn" };

export default function TeeDraw({ event, tees }: { event: { id: number; name: string; slug: string }; tees: TeeView[] }) {
  const { add, items } = useCart();
  const router = useRouter();
  const [pick, setPick] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [handicap, setHandicap] = useState("");
  const [hdidId, setHdidId] = useState("");
  const [club, setClub] = useState("");
  const [err, setErr] = useState("");
  const tee = tees.find((t) => t.id === pick);
  const open = tees.filter((t) => t.status === "open" && t.entries < t.capacity).length;

  function enter() {
    setErr("");
    if (!tee) return setErr("Choose a tee time.");
    if (!name.trim()) return setErr("Enter the player's full name as it appears on HowDidiDo.");
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
    track("begin_registration", { event: event.slug, draw: tee.clock });
    router.push("/cart");
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm font-semibold text-fairway-800">{open} of {tees.length} tee times open for entries</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8" role="radiogroup" aria-label="Tee time">
        {tees.map((t) => {
          const full = t.entries >= t.capacity;
          const closed = t.status !== "open" || full;
          return (
            <button
              type="button"
              role="radio"
              key={t.id}
              aria-checked={pick === t.id}
              disabled={closed}
              onClick={() => setPick(t.id)}
              className={`min-h-16 rounded-xl border-2 p-1.5 text-center ${pick === t.id ? "border-gold-500 bg-gold-400/20" : "border-fairway-100 bg-white"} disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500`}
            >
              <span className="block font-bold">{t.clock}</span>
              <span className="block text-[11px]">{t.status === "drawn" ? "Drawn" : closed ? "Closed" : `${t.entries}/${t.capacity}`}</span>
              <span className="mt-1 block h-1 overflow-hidden rounded bg-fairway-100"><span className="block h-full bg-gold-500" style={{ width: `${Math.min(100, (t.entries / t.capacity) * 100)}%` }} /></span>
            </button>
          );
        })}
      </div>
      {tee && (
        <div className="card grid gap-3">
          <p className="font-bold text-fairway-900">{tee.label} · {tee.entries} of {tee.capacity} entries · {tee.players} players will be drawn</p>
          <Field label="Player name (as on HowDidiDo)"><input className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Handicap"><input className="field" inputMode="decimal" value={handicap} onChange={(e) => setHandicap(e.target.value)} /></Field>
            <Field label="HowDidiDo / CDH no. (optional)"><input className="field" value={hdidId} onChange={(e) => setHdidId(e.target.value)} /></Field>
          </div>
          <Field label="Home club"><input className="field" value={club} onChange={(e) => setClub(e.target.value)} placeholder="Nakuru Golf Club" /></Field>
          {err && <Alert>{err}</Alert>}
          <button type="button" onClick={enter} className="btn-gold w-full text-lg">Enter draw · pay {kes(tee.fee)} by M-Pesa</button>
          <p className="text-xs text-fairway-800/70">The M-Pesa prompt is sent to your phone at checkout. Your entry counts only when Safaricom confirms the payment: no screenshots needed.</p>
        </div>
      )}
      {!tee && err && <Alert>{err}</Alert>}
    </div>
  );
}
