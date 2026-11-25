import crypto from "crypto";
import { cookies } from "next/headers";

const isProd = process.env.NODE_ENV === "production";

/** Simulated payments and on-screen login codes: always in development, opt-in on a staging deploy. */
export const demoMode = () => (isProd ? process.env.DEMO_MODE === "true" : process.env.DEMO_MODE !== "false");

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (isProd) throw new Error("SESSION_SECRET is required");
  return "ngc-dev-secret";
}

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (isProd ? "" : "golf2026");
export const ADMIN_PASSWORD_IS_DEFAULT = !isProd && !process.env.ADMIN_PASSWORD;

export const cookieOpts = (maxAge: number) => ({ httpOnly: true, secure: isProd, sameSite: "lax" as const, maxAge, path: "/" });

export function safeEqual(a: string, b: string) {
  const h = (v: string) => crypto.createHash("sha256").update(v).digest();
  return crypto.timingSafeEqual(h(a), h(b));
}

function sign(v: string) {
  return crypto.createHmac("sha256", secret()).update(v).digest("hex");
}

/** value + expiry + signature, so a copied cookie cannot outlive its session */
function token(kind: string, value: string, maxAge: number) {
  const exp = Math.floor(Date.now() / 1000) + maxAge;
  return `${value}.${exp}.${sign(`${kind}:${value}:${exp}`)}`;
}

function readToken(kind: string, raw: string | undefined) {
  const [value, exp, sig] = (raw || "").split(".");
  if (!value || !exp || !sig || Number(exp) < Date.now() / 1000) return null;
  return safeEqual(sig, sign(`${kind}:${value}:${exp}`)) ? value : null;
}

export const ADMIN_MAX_AGE = 60 * 60 * 12;
export const CUSTOMER_MAX_AGE = 60 * 60 * 24 * 30;

const adminKind = () => `admin:${ADMIN_PASSWORD}`;
export const adminToken = () => token(adminKind(), "staff", ADMIN_MAX_AGE);
export const customerToken = (phone: string) => token("cust", phone, CUSTOMER_MAX_AGE);
export const hashCode = (phone: string, code: string) => sign(`otp:${phone}:${code}`);

export async function isAdmin() {
  if (!ADMIN_PASSWORD) return false;
  return readToken(adminKind(), (await cookies()).get("ngc_admin")?.value) === "staff";
}

export async function getSessionPhone(): Promise<string | null> {
  return readToken("cust", (await cookies()).get("ngc_session")?.value);
}
