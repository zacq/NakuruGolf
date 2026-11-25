"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { Alert, Field, Stepper, addDays, useTodayStr } from "./ui";
import { Img } from "./Bits";
import { kes, DEPOSIT_PCT } from "@/lib/constants";
import { track } from "@/lib/analytics";

export type RoomView = {
  id: number;
  name: string;
  description: string;
  beds: string;
  capacity: number;
  amenities: string;
  rate: number;
  memberRate: number | null;
  eventRate: number | null;
  image: string;
};

export default function RoomBooker({
  rooms,
  eventId,
  defaultIn,
  defaultOut,
  defaultPackage = "Room only",
  compact,
}: {
  rooms: RoomView[];
  eventId?: number;
  defaultIn?: string;
  defaultOut?: string;
  defaultPackage?: string;
  compact?: boolean;
}) {
  const { add } = useCart();
  const today = useTodayStr();
  const [roomId, setRoomId] = useState(rooms[0]?.id);
  const [checkIn, setCheckIn] = useState(defaultIn || "");
  const [checkOut, setCheckOut] = useState(defaultOut || "");
  const [qty, setQty] = useState(1);
  const [guests, setGuests] = useState(2);
  const [pkg, setPkg] = useState(defaultPackage);
  const [av, setAv] = useState<{ available: number; nights: number } | null>(null);
  const [added, setAdded] = useState(false);
  const [member, setMember] = useState(false);

  useEffect(() => {
    fetch("/api/auth").then((r) => r.json()).then((j) => setMember(!!j.member)).catch(() => null);
  }, []);
  useEffect(() => {
    if (today && !checkIn) {
      setCheckIn(today);
      setCheckOut(addDays(today, 1));
    }
  }, [today, checkIn]);

  useEffect(() => {
    setAdded(false);
    if (!checkIn || !checkOut || checkOut <= checkIn || !roomId) {
      setAv(null);
      return;
    }
    const ctl = new AbortController();
    fetch(`/api/availability?type=room&roomTypeId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((j) => {
        setAv(j);
        track("room_search", { room: roomId, nights: j.nights });
      })
      .catch(() => null);
    return () => ctl.abort();
  }, [roomId, checkIn, checkOut]);

  const room = rooms.find((r) => r.id === roomId);
  if (!room) return null;
  const rate = eventId && room.eventRate ? room.eventRate : member && room.memberRate ? room.memberRate : room.rate;
  const nights = av?.nights || 0;
  const total = rate * nights * qty;
  const ok = !!av && av.available >= qty && nights > 0;

  function addRoom() {
    add({
      kind: "room",
      refId: room!.id,
      qty,
      eventId: eventId ?? null,
      label: `${room!.name} × ${qty}`,
      detail: `${checkIn} → ${checkOut} · ${nights} night${nights > 1 ? "s" : ""} · ${pkg}`,
      unitPrice: rate * nights,
      meta: { checkIn, checkOut, guests, package: pkg },
    });
    setAdded(true);
  }

  return (
    <div className="grid gap-5">
      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        {rooms.map((r) => (
          <button
            type="button"
            key={r.id}
            onClick={() => setRoomId(r.id)}
            aria-pressed={r.id === roomId}
            className={`overflow-hidden rounded-2xl border-2 text-left transition ${r.id === roomId ? "border-gold-500 bg-white shadow-lg" : "border-fairway-100 bg-white"}`}
          >
            {!compact && <Img src={r.image} alt={`${r.name} room`} className="h-40 w-full" />}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-serif text-lg font-bold text-fairway-900">{r.name}</p>
                <p className="text-right text-sm"><span className="font-bold text-fairway-800">{kes(eventId && r.eventRate ? r.eventRate : r.rate)}</span><br /><span className="text-xs text-fairway-800/60">per night{eventId && r.eventRate ? " (event rate)" : ""}</span></p>
              </div>
              <p className="mt-1 text-sm text-fairway-800/80">{r.description}</p>
              <p className="mt-2 text-xs text-fairway-800/70">{r.beds} · sleeps {r.capacity} · {r.amenities}</p>
              {r.memberRate && <p className="mt-1 text-xs font-semibold text-gold-600">Member rate {kes(r.memberRate)}</p>}
            </div>
          </button>
        ))}
      </div>

      <div className="card grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in">
            <input type="date" className="field" min={today} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (checkOut <= e.target.value) setCheckOut(addDays(e.target.value, 1)); }} />
          </Field>
          <Field label="Check-out">
            <input type="date" className="field" min={checkIn ? addDays(checkIn, 1) : today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="label">Rooms</p><Stepper label="rooms" value={qty} min={1} max={10} onChange={setQty} /></div>
          <div><p className="label">Guests</p><Stepper label="guests" value={guests} min={1} max={room.capacity * qty} onChange={setGuests} /></div>
        </div>
        {!eventId && (
          <Field label="Package">
            <select className="field" value={pkg} onChange={(e) => setPkg(e.target.value)}>
              <option>Room only</option>
              <option>Golf &amp; Stay (add green fees next)</option>
              <option>Corporate group block</option>
            </select>
          </Field>
        )}
        {av && nights > 0 && (
          ok ? (
            <Alert kind="ok">
              <strong>{av.available} room{av.available > 1 ? "s" : ""} available</strong> · {nights} night{nights > 1 ? "s" : ""} × {qty} room{qty > 1 ? "s" : ""} = <strong>{kes(total)}</strong>
              <br />Pay in full, or a {DEPOSIT_PCT}% deposit at checkout with the balance at check-in. Free changes up to 48 hours before arrival via WhatsApp or your account; see <Link className="underline" href="/policies">cancellation policy</Link>.
            </Alert>
          ) : (
            <Alert>Sorry, only {av.available} of this room type is free for those dates. Try other dates or another room.</Alert>
          )
        )}
        <button type="button" onClick={addRoom} disabled={!ok} className="btn-primary w-full">Add room to cart</button>
        {added && (
          <div className="grid gap-2 sm:grid-cols-3">
            <Link href="/cart" className="btn-gold text-sm">Go to cart</Link>
            <Link href="/golf#tee-time" className="btn-outline text-sm">+ Tee time</Link>
            <Link href="/car-wash" className="btn-outline text-sm">+ Car wash</Link>
          </div>
        )}
      </div>
    </div>
  );
}
