import { db } from "@/db";
import { asc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { TIERS } from "@/lib/constants";
import { savePackage, savePartner, saveSetting } from "../actions";

export const dynamic = "force-dynamic";

type P = typeof s.partners.$inferSelect;

function PartnerForm({ p }: { p?: P }) {
  return (
    <form action={savePartner} className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <input name="name" required placeholder="Name" aria-label="Name" defaultValue={p?.name} className="field" />
      <select name="tier" aria-label="Tier" defaultValue={p?.tier} className="field">{Object.entries(TIERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input name="logo" type="url" placeholder="Logo image URL" aria-label="Logo image URL" defaultValue={p?.logo || ""} className="field" />
      <input name="website" type="url" placeholder="Website" aria-label="Website" defaultValue={p?.website || ""} className="field" />
      <input name="years" placeholder="Partnership years" aria-label="Partnership years" defaultValue={p?.years || ""} className="field" />
      <label className="flex items-center gap-3 text-sm">Brand colour <input name="color" type="color" defaultValue={p?.color || "#0f3d2e"} className="h-12 w-20" /></label>
      <textarea name="description" rows={2} placeholder="Short description" aria-label="Short description" defaultValue={p?.description || ""} className="field sm:col-span-2" />
      <textarea name="story" rows={3} placeholder="Partnership story" aria-label="Partnership story" defaultValue={p?.story || ""} className="field sm:col-span-2" />
      <button className="btn-primary sm:col-span-2">{p ? "Save partner" : "Add partner"}</button>
    </form>
  );
}

export default async function AdminPartners() {
  const [partners, pkgs, deck] = await Promise.all([
    db.select().from(s.partners).orderBy(asc(s.partners.name)),
    db.select().from(s.sponsorPackages).orderBy(asc(s.sponsorPackages.id)),
    db.select().from(s.settings).where(eq(s.settings.key, "sponsor_deck_url")),
  ]);
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold text-fairway-900">Partners & sponsorship</h1>
      <details className="card"><summary className="min-h-12 cursor-pointer py-3 font-bold">+ Add a partner</summary><PartnerForm /></details>
      {partners.map((p) => <details key={p.id} className="card"><summary className="min-h-12 cursor-pointer py-3"><strong>{p.name}</strong> · {TIERS[p.tier]}</summary><PartnerForm p={p} /></details>)}
      <section className="card">
        <h2 className="mb-2 text-lg font-bold">Sponsorship deck (PDF link)</h2>
        <form action={saveSetting} className="flex flex-wrap gap-2"><input type="hidden" name="key" value="sponsor_deck_url" /><input name="value" type="url" aria-label="Deck URL" placeholder="https://…/deck.pdf" defaultValue={deck[0]?.value || ""} className="field sm:max-w-md" /><button className="btn-primary">Save</button></form>
      </section>
      <section className="card grid gap-4">
        <h2 className="text-lg font-bold">Packages</h2>
        {pkgs.map((p) => (
          <form key={p.id} action={savePackage} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
            <input type="hidden" name="id" value={p.id} />
            <p className="font-semibold sm:col-span-3">{p.name}</p>
            <textarea name="benefits" rows={2} aria-label={`${p.name} benefits`} defaultValue={p.benefits || ""} className="field" />
            <input name="price" type="number" min={0} aria-label={`${p.name} price`} placeholder="On enquiry" defaultValue={p.price ?? ""} className="field" />
            <button className="btn-outline">Save</button>
          </form>
        ))}
      </section>
    </div>
  );
}
