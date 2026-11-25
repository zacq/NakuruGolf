"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import { Alert, Field, Stepper } from "./ui";
import { SHIRT_SIZES, kes } from "@/lib/constants";
import { track } from "@/lib/analytics";

export type EntryTypeView = {
  id: number;
  kind: string;
  name: string;
  description: string;
  price: number;
  priceMember: number | null;
  players: number;
  cap: number | null;
  sold: number;
  deadline: string | null;
};

type Player = { name: string; handicap: string; shirt: string; dietary: string };

export default function EntryPanel({ event, types }: { event: { id: number; name: string; slug: string }; types: EntryTypeView[] }) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState<Record<number, number>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [club, setClub] = useState("");
  const [err, setErr] = useState("");
  const [member, setMember] = useState(false);

  useEffect(() => {
    track("view_event", { event: event.slug });
    fetch("/api/auth").then((r) => r.json()).then((j) => setMember(!!j.member)).catch(() => null);
  }, [event.slug]);

  const closed = (t: EntryTypeView) => (t.deadline && new Date(t.deadline) < new Date()) || (t.cap != null && t.sold >= t.cap);
  const entries = types.filter((t) => t.kind === "entry");
  const tickets = types.filter((t) => t.kind === "ticket");
  const totalPlayers = entries.reduce((a, t) => a + (qty[t.id] || 0) * t.players, 0);

  useEffect(() => {
    setPlayers((p) => {
      const out = [...p];
      while (out.length < totalPlayers) out.push({ name: "", handicap: "", shirt: "M", dietary: "" });
      return out.slice(0, totalPlayers);
    });
  }, [totalPlayers]);

  const price = (t: EntryTypeView) => (member && t.priceMember != null ? t.priceMember : t.price);
  const total = types.reduce((a, t) => a + price(t) * (qty[t.id] || 0), 0);
  const anySelected = Object.values(qty).some((v) => v > 0);

  const set = (id: number, n: number) => {
    if (n > 0 && !anySelected) track("begin_registration", { event: event.slug });
    setQty((q) => ({ ...q, [id]: n }));
  };
  const upd = (i: number, k: keyof Player, v: string) => setPlayers((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  function submit(go: boolean) {
    setErr("");
    if (!anySelected) return setErr("Choose at least one entry or ticket.");
    if (players.some((p) => !p.name.trim())) return setErr("Please enter a name for every player.");
    let offset = 0;
    for (const t of types) {
      const q = qty[t.id] || 0;
      if (!q) continue;
      const cnt = t.kind === "entry" ? q * t.players : 0;
      const slice = players.slice(offset, offset + cnt);
      offset += cnt;
      add({
        kind: "entry",
        refId: t.id,
        qty: q,
        eventId: event.id,
        label: `${event.name} — ${t.name}`,
        detail: slice.length ? slice.map((p) => p.name).join(", ") : undefined,
        unitPrice: t.price,
        meta: { players: slice, club, eventSlug: event.slug },
      });
    }
    setQty({});
    if (go) router.push("/cart");
  }

  const row = (t: EntryTypeView) => {
    const isClosed = closed(t);
    const left = t.cap != null ? Math.max(0, t.cap - t.sold) : null;
    return (
      <li key={t.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${isClosed ? "border-gray-200 bg-gray-50 opacity-70" : "border-fairway-100 bg-white"}`}>
        <div className="min-w-0">
          <p className="font-semibold text-fairway-900">{t.name}</p>
          {t.description && <p className="text-sm text-fairway-800/70">{t.description}</p>}
          <p className="mt-1 text-sm">
            <span className="font-bold text-fairway-800">{kes(price(t))}</span>
            {t.players > 1 && <span className="text-fairway-800/70"> per team of {t.players}</span>}
            {member && t.priceMember != null && t.priceMember < t.price && <span className="ml-2 chip">Member price</span>}
          </p>
          <p className="text-xs text-fairway-800/60">
            {isClosed ? (left === 0 ? "Sold out" : "Entries closed") : `${left != null ? `${left} left · ` : ""}${t.deadline ? `closes ${new Date(t.deadline).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", day: "numeric", month: "short" })}` : "open"}`}
          </p>
        </div>
        {!isClosed && <Stepper label={t.name} value={qty[t.id] || 0} onChange={(n) => set(t.id, n)} max={left ?? 20} />}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-lg font-bold text-fairway-900">Entries</h3>
        <ul className="grid gap-3">{entries.map(row)}</ul>
      </div>
      {tickets.length > 0 && (
        <div id="dinner">
          <h3 className="mb-2 text-lg font-bold text-fairway-900">Dinner, spectator & hospitality tickets</h3>
          <ul className="grid gap-3">{tickets.map(row)}</ul>
        </div>
      )}
      {totalPlayers > 0 && (
        <div className="card grid gap-4">
          <h3 className="text-lg font-bold text-fairway-900">Player details</h3>
          <Field label="Home club or company">
            <input className="field" value={club} onChange={(e) => setClub(e.target.value)} autoComplete="organization" />
          </Field>
          {players.map((p, i) => (
            <fieldset key={i} className="grid gap-3 rounded-xl bg-fairway-50 p-3">
              <legend className="px-1 text-sm font-bold text-fairway-800">Player {i + 1}</legend>
              <input aria-label={`Player ${i + 1} name`} placeholder="Full name" className="field" value={p.name} onChange={(e) => upd(i, "name", e.target.value)} autoComplete="name" />
              <div className="grid grid-cols-2 gap-3">
                <input aria-label="Handicap" placeholder="Handicap" inputMode="decimal" className="field" value={p.handicap} onChange={(e) => upd(i, "handicap", e.target.value)} />
                <select aria-label="Shirt size" className="field" value={p.shirt} onChange={(e) => upd(i, "shirt", e.target.value)}>
                  {SHIRT_SIZES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <input aria-label="Dietary needs" placeholder="Dietary needs (optional)" className="field" value={p.dietary} onChange={(e) => upd(i, "dietary", e.target.value)} />
            </fieldset>
          ))}
          <p className="text-xs text-fairway-800/70">Handicaps are self-declared. Your phone and email are collected at checkout.</p>
        </div>
      )}
      {err && <Alert>{err}</Alert>}
      <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl bg-fairway-900 p-3 text-white shadow-xl md:bottom-4">
        <div>
          <p className="text-xs text-fairway-200">Selected</p>
          <p className="text-xl font-bold">{kes(total)}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => submit(false)} className="btn-light min-h-12 px-4 text-sm">Add & keep browsing</button>
          <button type="button" onClick={() => submit(true)} className="btn-gold min-h-12 px-4 text-sm">Register now</button>
        </div>
      </div>
    </div>
  );
}
