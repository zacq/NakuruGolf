"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Field, Honeypot } from "./ui";
import { kes } from "@/lib/constants";
import { track } from "@/lib/analytics";

export type CatView = { id: number; name: string; benefits: string; joiningFee: number; annualFee: number };

// phone photos are several MB: shrink them before upload
async function shrinkPhoto(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function MembershipForm({ cats }: { cats: CatView[] }) {
  const [cat, setCat] = useState(cats[0]?.id);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  const [wa, setWa] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const docs: Record<string, string> = {};
    for (const key of ["idDoc", "photo"]) {
      const f = fd.get(key);
      if (f instanceof File && f.size > 0) {
        try {
          docs[key] = await shrinkPhoto(f);
        } catch {
          return setErr("We could not read one of the photos. Please choose a JPG or PNG image.");
        }
      }
    }
    setState("sending");
    const r = await fetch("/api/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: cat,
        name: fd.get("name"),
        phone: fd.get("phone"),
        email: fd.get("email"),
        idNumber: fd.get("idNumber"),
        proposer: fd.get("proposer"),
        seconder: fd.get("seconder"),
        consent: fd.get("consent") === "on",
        website: fd.get("website"),
        documents: JSON.stringify(docs),
      }),
    }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (!j?.ok) {
      setErr(j?.error || "Could not submit. Check your connection and retry.");
      setState("idle");
      return;
    }
    track("membership_apply", { category: cat });
    setWa(j.whatsapp);
    setState("done");
  }

  if (state === "done")
    return (
      <div className="grid gap-3">
        <Alert kind="ok">Application received. The committee will review it and you'll be notified at each step by SMS/WhatsApp. Once approved, pay your joining fee and first subscription from your <Link href="/account" className="font-bold underline">account</Link>.</Alert>
        <a href={wa} target="_blank" rel="noopener" className="btn-wa">💬 Tell us on WhatsApp</a>
      </div>
    );

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Honeypot />
      <div className="grid gap-3" role="radiogroup" aria-label="Membership category">
        {cats.map((c) => (
          <button type="button" role="radio" aria-checked={c.id === cat} key={c.id} onClick={() => setCat(c.id)} className={`rounded-2xl border-2 bg-white p-4 text-left ${c.id === cat ? "border-gold-500 shadow-lg" : "border-fairway-100"}`}>
            <p className="font-serif text-lg font-bold text-fairway-900">{c.name}</p>
            <p className="text-sm text-fairway-800/80">{c.benefits}</p>
            <p className="mt-1 text-sm">Joining <strong>{kes(c.joiningFee)}</strong> · Annual <strong>{kes(c.annualFee)}</strong></p>
          </button>
        ))}
      </div>
      <div className="card grid gap-4">
        <Field label="Full name"><input name="name" required autoComplete="name" className="field" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone (M-Pesa)"><input name="phone" type="tel" inputMode="numeric" required autoComplete="tel" placeholder="0712 345 678" className="field" /></Field>
          <Field label="Email"><input name="email" type="email" inputMode="email" autoComplete="email" className="field" /></Field>
        </div>
        <Field label="National ID / passport number"><input name="idNumber" className="field" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Proposer (member name)"><input name="proposer" className="field" /></Field>
          <Field label="Seconder (member name)"><input name="seconder" className="field" /></Field>
        </div>
        <Field label="ID photo" hint="A clear photo of your ID"><input name="idDoc" type="file" accept="image/*" className="field pt-2.5" /></Field>
        <Field label="Passport photo"><input name="photo" type="file" accept="image/*" capture="user" className="field pt-2.5" /></Field>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="consent" required className="mt-1 h-5 w-5 accent-[#155339]" /> I consent to Nakuru Golf Club processing my details for this application under the Kenya Data Protection Act, 2019.</label>
      </div>
      {err && <Alert>{err}</Alert>}
      <button className="btn-primary w-full" disabled={state === "sending"}>{state === "sending" ? "Submitting…" : "Submit application"}</button>
    </form>
  );
}
