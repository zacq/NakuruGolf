import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const [o] = await db.select().from(s.orders).where(eq(s.orders.number, number));
  if (!o) return Response.json({ status: "missing" }, { status: 404 });
  return Response.json({ status: o.status });
}
