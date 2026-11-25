"use client";

import { useEffect, useState, type ReactNode } from "react";

export function Stepper({ value, onChange, min = 0, max = 50, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-fairway-200 bg-white" role="group" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="h-12 w-12 text-2xl font-bold text-fairway-800 disabled:opacity-30">−</button>
      <span className="w-8 text-center text-lg font-bold" aria-live="polite">{value}</span>
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="h-12 w-12 text-2xl font-bold text-fairway-800 disabled:opacity-30">+</button>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-fairway-800/70">{hint}</span>}
    </label>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "ok" | "info"; children: ReactNode }) {
  const c = kind === "error" ? "bg-red-50 text-red-800 border-red-200" : kind === "ok" ? "bg-fairway-50 text-fairway-900 border-fairway-200" : "bg-amber-50 text-amber-900 border-amber-200";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${c}`}>
      {children}
    </div>
  );
}

export function useTodayStr() {
  const [d, setD] = useState("");
  useEffect(() => {
    setD(new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }));
  }, []);
  return d;
}

export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function Honeypot() {
  return <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />;
}
