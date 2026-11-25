"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { Alert, Field, useTodayStr } from "./ui";
import { kes } from "@/lib/constants";
import { track } from "@/lib/analytics";

export type WashView = { id: number; name: string; description: string; price: number; durationMins: number };

export default function CarWashBooker({ services, eventId, defaultDate }: { services: WashView[]; eventId?: number; defaultDate?: string }) {
  const { add } = useCart();
  const today = useTodayStr();
  const [sid, setSid] = useState(services[1]?.id ?? services[0]?.id);
  const [date, setDate] = useState(defaultDate || "");
  const [slots, setSlots] = useState<{ time: string; remaining: number }[]>([]);
  const [time, setTime] = useState("");
  const [reg, setReg] = useState("");
  const [vtype, setVtype] = useState("Saloon");
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  useEffect(() => {
    if (!date && today) setDate(defaultDate || today);
  }, [today, date, defaultDate]);

  useEffect(() => {
    if (!date) return;
    setTime("");
    fetch(`/api/availability?type=carwash&date=${date}`).then((r) => r.json()).then((j) => setSlots(j.slots || [])).catch(() => null);
  }, [date]);

  const svc = services.find((s) => s.id === sid);

  function addIt() {
    if (!svc) return;
    if (!time) return setMsg({ kind: "error", text: "Pick a time slot." });
    if (!reg.trim()) return setMsg({ kind: "error", text: "Enter your vehicle registration." });
    add({
      kind: "carwash",
      refId: svc.id,
      qty: 1,
      eventId: eventId ?? null,
      label: `Car wash: ${svc.name}`,
      detail: `${date} ${time} · ${reg.toUpperCase()} (${vtype})`,
      unitPrice: svc.price,
      meta: { date, time, vehicleReg: reg, vehicleType: vtype },
    });
    track("carwash_booked", { service: svc.name });
    setMsg({ kind: "ok", text: "Added! Your car will be ready when you finish. We'll notify you on WhatsApp/SMS." });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((s) => (
          <button type="button" key={s.id} onClick={() => setSid(s.id)} aria-pressed={s.id === sid} className={`rounded-2xl border-2 bg-white p-4 text-left ${s.id === sid ? "border-gold-500 shadow-lg" : "border-fairway-100"}`}>
            <div className="flex justify-between gap-2"><p className="font-bold text-fairway-900">{s.name}</p><p className="font-bold text-fairway-700">{kes(s.price)}</p></div>
            <p className="text-sm text-fairway-800/80">{s.description}</p>
            <p className="mt-1 text-xs text-fairway-800/60">About {s.durationMins} min</p>
          </button>
        ))}
      </div>
      <div className="card grid gap-4">
        <Field label="Date"><input type="date" className="field" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div>
          <p className="label">Time slot</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Time slot">
            {slots.map((s) => (
              <button type="button" key={s.time} role="radio" aria-checked={time === s.time} disabled={s.remaining === 0} onClick={() => setTime(s.time)} className={`min-h-12 rounded-xl border-2 text-sm font-semibold ${time === s.time ? "border-gold-500 bg-gold-400/20" : "border-fairway-100 bg-white"} disabled:bg-gray-100 disabled:text-gray-400 disabled:line-through`}>
                {s.time}
                <span className="block text-[10px] font-normal">{s.remaining === 0 ? "full" : `${s.remaining} left`}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vehicle registration"><input className="field uppercase" value={reg} onChange={(e) => setReg(e.target.value)} placeholder="KDA 123A" autoCapitalize="characters" /></Field>
          <Field label="Vehicle type">
            <select className="field" value={vtype} onChange={(e) => setVtype(e.target.value)}>
              {["Saloon", "SUV / 4x4", "Pickup", "Van / Minibus"].map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
        </div>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <button type="button" onClick={addIt} className="btn-primary w-full">Add car wash — {svc ? kes(svc.price) : ""}</button>
        {msg?.kind === "ok" && <Link href="/cart" className="btn-gold w-full">Go to cart</Link>}
        <p className="text-xs text-fairway-800/70">Play &amp; Wash: book the slot to match your tee time or event so the car is ready when you finish.</p>
      </div>
    </div>
  );
}
