import { db } from "@/db";
import { desc } from "drizzle-orm";
import * as s from "@/db/schema";
import { fmtDateTime } from "@/lib/constants";
import { updateLead } from "../actions";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await db.select().from(s.leads).orderBy(desc(s.leads.createdAt));
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-fairway-900">Leads inbox</h1>
      <div className="grid gap-3">
        {leads.map((l) => (
          <div key={l.id} className="card grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold"><span className="chip mr-2 capitalize">{l.type}</span>{l.name}{l.company ? ` · ${l.company}` : ""}</p>
              <p className="text-xs text-fairway-800/60">{fmtDateTime(l.createdAt)}</p>
            </div>
            <p className="text-sm">{l.phone && <a className="underline" href={`tel:${l.phone}`}>{l.phone}</a>} {l.email && <a className="ml-2 underline" href={`mailto:${l.email}`}>{l.email}</a>}</p>
            <ul className="text-sm text-fairway-800/90">{Object.entries(l.details || {}).filter(([, v]) => v).map(([k, v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}</ul>
            <form action={updateLead} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={l.id} />
              <select name="status" defaultValue={l.status} className="field !min-h-11 w-36">{["new", "contacted", "won", "lost"].map((x) => <option key={x}>{x}</option>)}</select>
              <input name="owner" defaultValue={l.owner || ""} placeholder="Owner" className="field !min-h-11 w-36" />
              <button className="btn-primary !min-h-11 px-4 text-sm">Save</button>
            </form>
          </div>
        ))}
        {leads.length === 0 && <p className="text-fairway-800/70">No enquiries yet.</p>}
      </div>
    </div>
  );
}
