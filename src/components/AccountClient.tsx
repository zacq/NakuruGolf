"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Field } from "./ui";
import { useCart } from "./CartProvider";

export function AuthForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [demoCode, setDemoCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(action: string) {
    setErr("");
    setBusy(true);
    const r = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, phone, code }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(false);
    if (!j?.ok) return setErr(j?.error || "Connection problem. Please retry.");
    if (action === "request") {
      setStep("code");
      setDemoCode(j.demoCode || "");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="card mx-auto grid max-w-md gap-4">
      {step === "phone" ? (
        <form onSubmit={(e) => { e.preventDefault(); call("request"); }} className="grid gap-4">
          <Field label="Phone number"><input className="field" type="tel" inputMode="numeric" autoComplete="tel" required placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <button className="btn-primary" disabled={busy}>Send me a code</button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); call("verify"); }} className="grid gap-4">
          {demoCode && <Alert kind="info">Demo mode (no SMS gateway configured): your code is <strong className="text-lg tracking-widest">{demoCode}</strong></Alert>}
          <Field label="6-digit code"><input className="field text-center text-2xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} /></Field>
          <button className="btn-primary" disabled={busy}>Sign in</button>
          <button type="button" className="text-sm underline" onClick={() => setStep("phone")}>Use a different number</button>
        </form>
      )}
      {err && <Alert>{err}</Alert>}
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button className="btn-outline min-h-11" onClick={async () => { await caches?.delete("ngc-tickets-v2"); await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); router.refresh(); }}>
      Sign out
    </button>
  );
}

export function PayMembershipButton({ id, label, price, name }: { id: number; label: string; price: number; name: string }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  return done ? (
    <Link href="/cart" className="btn-gold">Go to cart</Link>
  ) : (
    <button className="btn-gold" onClick={() => { add({ kind: "membership", refId: id, qty: 1, label, detail: name, unitPrice: price, meta: {} }); setDone(true); }}>
      {label}
    </button>
  );
}

export function ConsentToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <label className="flex min-h-12 items-center gap-3 text-sm">
      <input
        type="checkbox"
        className="h-5 w-5 accent-[#155339]"
        checked={on}
        onChange={async (e) => {
          const value = e.target.checked;
          setOn(value);
          const r = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "consent", value }) }).catch(() => null);
          if (!r?.ok) setOn(!value);
        }}
      />
      Send me event news and offers by WhatsApp/SMS
    </label>
  );
}
