import { quoteCart } from "@/lib/commerce";
import { ensureSeed } from "@/lib/seed";
import { getSessionPhone } from "@/lib/session";
import type { CartItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureSeed();
  const body = await req.json().catch(() => ({}));
  const items = (Array.isArray(body.items) ? body.items : []) as CartItem[];
  const q = await quoteCart(items, { memberPhone: await getSessionPhone(), promo: String(body.promo || ""), deposit: !!body.deposit });
  return Response.json(q);
}
