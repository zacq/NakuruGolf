import { cookies } from "next/headers";
import { ADMIN_MAX_AGE, ADMIN_PASSWORD, adminToken, cookieOpts, safeEqual } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  if (!ADMIN_PASSWORD) return Response.json({ ok: false, error: "ADMIN_PASSWORD is not configured" }, { status: 503 });
  await new Promise((r) => setTimeout(r, 600)); // slows password guessing
  if (!safeEqual(String(password ?? ""), ADMIN_PASSWORD)) return Response.json({ ok: false, error: "Wrong password" }, { status: 401 });
  (await cookies()).set("ngc_admin", adminToken(), cookieOpts(ADMIN_MAX_AGE));
  return Response.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete("ngc_admin");
  return Response.json({ ok: true });
}
