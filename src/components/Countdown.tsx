"use client";

import { useEffect, useState } from "react";

export default function Countdown({ to, label = "Starts in" }: { to: string; label?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <div className="h-16" aria-hidden />;
  const diff = new Date(to).getTime() - now;
  if (diff <= 0) return <p className="font-semibold text-gold-300">Underway or finished</p>;
  const parts = [
    ["days", Math.floor(diff / 86400000)],
    ["hrs", Math.floor((diff % 86400000) / 3600000)],
    ["min", Math.floor((diff % 3600000) / 60000)],
    ["sec", Math.floor((diff % 60000) / 1000)],
  ] as const;
  return (
    <div aria-label={`${label} ${parts[0][1]} days`} role="timer">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gold-300">{label}</p>
      <div className="flex gap-2">
        {parts.map(([l, v]) => (
          <div key={l} className="min-w-14 rounded-xl bg-white/10 px-2 py-2 text-center backdrop-blur">
            <div className="font-serif text-2xl font-bold tabular-nums">{String(v).padStart(2, "0")}</div>
            <div className="text-[10px] uppercase tracking-wider text-fairway-100">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
