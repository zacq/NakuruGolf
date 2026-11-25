"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "./CartProvider";
import { BOOK_MENU } from "./SiteHeader";
import { CLUB, waLink } from "@/lib/constants";
import { track } from "@/lib/analytics";

function contextMessage(path: string) {
  if (path.startsWith("/events/")) {
    const slug = path.split("/")[2].replace(/-/g, " ");
    return `Hello Nakuru Golf Club, I'd like to register for the ${slug}.`;
  }
  if (path.startsWith("/stay")) return "Hello Nakuru Golf Club, I'd like to book a room.";
  if (path.startsWith("/dine")) return "Hello Nakuru Golf Club, I'd like to reserve a table.";
  if (path.startsWith("/car-wash")) return "Hello Nakuru Golf Club, I'd like to book a car wash.";
  if (path.startsWith("/golf")) return "Hello Nakuru Golf Club, I'd like to book a tee time.";
  if (path.startsWith("/membership")) return "Hello Nakuru Golf Club, I'd like to ask about membership.";
  if (path.startsWith("/partners")) return "Hello Nakuru Golf Club, I'd like to ask about sponsorship.";
  if (path.startsWith("/shop")) return "Hello Nakuru Golf Club, I have a question about merchandise.";
  return "Hello Nakuru Golf Club, I have a question.";
}

export default function MobileBar() {
  const path = usePathname();
  const { count } = useCart();
  const [sheet, setSheet] = useState(false);
  if (path.startsWith("/admin")) return null;
  const wa = waLink(contextMessage(path));
  const item = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold";

  return (
    <>
      {sheet && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setSheet(false)}>
          <div role="dialog" aria-label="Book" className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-24" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-center font-serif text-lg font-bold text-fairway-900">What would you like to book?</p>
            <div className="grid grid-cols-2 gap-3">
              {BOOK_MENU.map((b) => (
                <Link key={b.href} href={b.href} onClick={() => setSheet(false)} className="flex min-h-16 items-center gap-3 rounded-2xl bg-fairway-50 px-4 text-base font-semibold text-fairway-900">
                  <span className="text-2xl" aria-hidden>{b.icon}</span> {b.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="fixed inset-x-0 bottom-0 z-50 flex border-t border-white/10 bg-fairway-900 pb-[env(safe-area-inset-bottom)] text-white md:hidden">
        <a href={wa} target="_blank" rel="noopener" onClick={() => track("whatsapp_click", { page: path })} className={item}>
          <span className="text-xl" aria-hidden>💬</span>WhatsApp
        </a>
        <a href={`tel:${CLUB.phone}`} onClick={() => track("call_click", { page: path })} className={item}>
          <span className="text-xl" aria-hidden>📞</span>Call
        </a>
        <button onClick={() => setSheet((s) => !s)} className={`${item} bg-gold-500 text-fairway-900`}>
          <span className="text-xl" aria-hidden>📅</span>Book
        </button>
        <Link href="/cart" className={`${item} relative`}>
          <span className="text-xl" aria-hidden>🛒</span>Cart
          {count > 0 && <span className="absolute right-[22%] top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-500 px-1 text-xs font-bold text-fairway-900">{count}</span>}
        </Link>
      </div>
      <a href={wa} target="_blank" rel="noopener" onClick={() => track("whatsapp_click", { page: path })} aria-label="Chat on WhatsApp" className="fixed bottom-6 right-6 z-40 hidden h-14 items-center gap-2 rounded-full bg-[#1faa59] px-5 font-semibold text-white shadow-xl hover:bg-[#178a47] md:flex">
        <span aria-hidden>💬</span> WhatsApp us
      </a>
    </>
  );
}
