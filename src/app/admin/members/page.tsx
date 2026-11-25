import { db } from "@/db";
import { desc } from "drizzle-orm";
import * as s from "@/db/schema";
import { fmtDate, kes } from "@/lib/constants";
import { updateMembership } from "../actions";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const [ms, cats] = await Promise.all([db.select().from(s.memberships).orderBy(desc(s.memberships.createdAt)), db.select().from(s.membershipCategories)]);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-fairway-900">Membership applications & renewals</h1>
      <p className="mb-4 text-sm text-fairway-800/70">received → under review → approved (applicant is notified and pays online) → active.</p>
      <div className="grid gap-3">
        {ms.map((m) => {
          const cat = cats.find((c) => c.id === m.categoryId);
          let docs: Record<string, string> = {};
          try { docs = JSON.parse(m.documents || "{}"); } catch { /* ignore */ }
          return (
            <div key={m.id} className="card grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{m.name} <span className="chip ml-2 capitalize">{m.status.replace("_", " ")}</span></p>
                <p className="text-xs text-fairway-800/60">Applied {fmtDate(m.createdAt)}</p>
              </div>
              <p className="text-sm">{cat?.name} · joining {kes(cat?.joiningFee || 0)} + annual {kes(cat?.annualFee || 0)} · +{m.phone} {m.email && `· ${m.email}`}</p>
              <p className="text-sm text-fairway-800/80">ID {m.idNumber || "–"} · Proposer {m.proposer || "–"} · Seconder {m.seconder || "–"}{m.renewalDue ? ` · renewal due ${fmtDate(m.renewalDue)}` : ""}</p>
              <div className="flex gap-3 text-sm">{Object.entries(docs).map(([k, v]) => /^data:image\//.test(v) && <a key={k} href={v} download={`${m.name}-${k}`} className="font-semibold underline">{k === "idDoc" ? "ID document" : "Photo"} (download)</a>)}</div>
              <form action={updateMembership} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={m.id} />
                {m.status === "received" && <button name="status" value="under_review" className="btn-outline !min-h-11 px-3 text-sm">Start review</button>}
                {["received", "under_review"].includes(m.status) && <button name="status" value="approved" className="btn-primary !min-h-11 px-3 text-sm">Approve</button>}
                {["received", "under_review"].includes(m.status) && <button name="status" value="declined" className="btn-outline !min-h-11 px-3 text-sm">Decline</button>}
                {m.status === "active" && <button name="status" value="lapsed" className="btn-outline !min-h-11 px-3 text-sm">Mark lapsed</button>}
              </form>
            </div>
          );
        })}
        {ms.length === 0 && <p className="text-fairway-800/70">No applications yet.</p>}
      </div>
    </div>
  );
}
