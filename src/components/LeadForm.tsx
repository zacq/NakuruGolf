"use client";

import { useState } from "react";
import { Alert, Field, Honeypot } from "./ui";
import { track } from "@/lib/analytics";

export type LeadField = { name: string; label: string; type?: "text" | "date" | "number" | "textarea" | "select"; options?: string[]; required?: boolean; defaultValue?: string };

export default function LeadForm({
  type,
  fields,
  submit = "Send enquiry",
  event,
  showCompany = true,
}: {
  type: "venue" | "sponsorship" | "catering" | "general";
  fields: LeadField[];
  submit?: string;
  event?: string;
  showCompany?: boolean;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  const [wa, setWa] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setState("sending");
    const fd = new FormData(e.currentTarget);
    const details: Record<string, string> = {};
    if (event) details["Source"] = event;
    for (const f of fields) details[f.label] = String(fd.get(f.name) || "");
    const r = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        name: fd.get("name"),
        company: fd.get("company"),
        phone: fd.get("phone"),
        email: fd.get("email"),
        website: fd.get("website"),
        details,
      }),
    }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (!r || !j?.ok) {
      setErr(j?.error || "Could not send. Please check your connection and try again.");
      setState("idle");
      return;
    }
    if (type === "sponsorship") track("sponsor_enquiry", { event });
    setWa(j.whatsapp || "");
    setState("done");
  }

  if (state === "done")
    return (
      <div className="space-y-3">
        <Alert kind="ok">Thank you! Your enquiry has reached our team. We usually reply within one working day.</Alert>
        {wa && (
          <a href={wa} target="_blank" rel="noopener" className="btn-wa w-full">
            💬 Continue on WhatsApp
          </a>
        )}
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Honeypot />
      <Field label="Your name">
        <input name="name" required autoComplete="name" className="field" />
      </Field>
      {showCompany && (
        <Field label="Company / organisation">
          <input name="company" autoComplete="organization" className="field" />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone">
          <input name="phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="0712 345 678" className="field" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" inputMode="email" autoComplete="email" className="field" />
        </Field>
      </div>
      {fields.map((f) => (
        <Field key={f.name} label={f.label}>
          {f.type === "textarea" ? (
            <textarea name={f.name} rows={4} required={f.required} defaultValue={f.defaultValue} className="field" />
          ) : f.type === "select" ? (
            <select name={f.name} required={f.required} defaultValue={f.defaultValue} className="field">
              {f.options?.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input name={f.name} type={f.type || "text"} inputMode={f.type === "number" ? "numeric" : undefined} required={f.required} defaultValue={f.defaultValue} className="field" />
          )}
        </Field>
      ))}
      {err && <Alert>{err}</Alert>}
      <button className="btn-primary w-full" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : submit}
      </button>
    </form>
  );
}
