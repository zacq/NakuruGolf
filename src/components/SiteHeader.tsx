"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";

export const MENU = [
  { href: "/events", label: "Events" },
  { href: "/stay", label: "Stay" },
  { href: "/dine", label: "Dine" },
  { href: "/car-wash", label: "Car Wash" },
  { href: "/golf", label: "Golf" },
  { href: "/shop", label: "Shop" },
  { href: "/membership", label: "Membership" },
  { href: "/partners", label: "Partners" },
  { href: "/venue", label: "Venue & Corporate" },
  { href: "/about", label: "About & Course" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/news", label: "News & Gallery" },
  { href: "/contact", label: "Contact" },
];

export const BOOK_MENU = [
  { href: "/events", label: "Event", icon: "🏆" },
  { href: "/stay", label: "Room", icon: "🛏️" },
  { href: "/dine#reserve", label: "Table", icon: "🍽️" },
  { href: "/car-wash", label: "Car Wash", icon: "🚗" },
  { href: "/golf#tee-time", label: "Tee Time", icon: "⛳" },
  { href: "/golf#lessons", label: "Lesson", icon: "🎓" },
];

export function Crest({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#0a2c1e" stroke="#c9a227" strokeWidth="2" />
      <path d="M17 35V12l12 6-12 6" fill="#c9a227" />
      <path d="M17 12v23" stroke="#fff" strokeWidth="2" />
      <ellipse cx="24" cy="37" rx="9" ry="2.5" fill="#25825d" />
      <circle cx="30" cy="34" r="2" fill="#fff" />
    </svg>
  );
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [book, setBook] = useState(false);
  const pathname = usePathname();
  const { count } = useCart();

  useEffect(() => {
    setOpen(false);
    setBook(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-fairway-900 text-white shadow-md">
      <div className="container-x flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex min-h-12 items-center gap-2.5" aria-label="Nakuru Golf Club home">
          <Crest />
          <span className="font-serif text-lg leading-none">
            Nakuru <span className="text-gold-400">Golf Club</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main">
          {[MENU[0], MENU[1], MENU[2], MENU[4], MENU[6], MENU[7], MENU[5], MENU[9], MENU[12]].map((m) => (
            <Link key={m.href} href={m.href} className={`rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10 ${pathname.startsWith(m.href) ? "text-gold-400" : ""}`}>
              {m.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <button onClick={() => setBook((b) => !b)} aria-expanded={book} className="btn-gold min-h-11 px-4 text-sm">
              Book ▾
            </button>
            {book && (
              <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl bg-white text-ink shadow-2xl">
                {BOOK_MENU.map((b) => (
                  <Link key={b.href} href={b.href} className="flex min-h-12 items-center gap-3 px-4 hover:bg-fairway-50">
                    <span aria-hidden>{b.icon}</span> {b.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/cart" className="relative flex h-12 w-12 items-center justify-center rounded-xl hover:bg-white/10" aria-label={`Cart, ${count} items`}>
            <span aria-hidden className="text-xl">🛒</span>
            {count > 0 && <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-500 px-1 text-xs font-bold text-fairway-900">{count}</span>}
          </Link>
          <Link href="/account" className="hidden h-12 w-12 items-center justify-center rounded-xl hover:bg-white/10 md:flex" aria-label="Account">
            <span aria-hidden className="text-xl">👤</span>
          </Link>
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu" className="flex h-12 w-12 items-center justify-center rounded-xl hover:bg-white/10 xl:hidden">
            <span className="text-2xl" aria-hidden>{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 bg-fairway-900 pb-24 xl:hidden">
          <div className="container-x grid gap-1 py-3 sm:grid-cols-2">
            {MENU.map((m) => (
              <Link key={m.href} href={m.href} className={`flex min-h-12 items-center rounded-xl px-4 text-lg hover:bg-white/10 ${pathname.startsWith(m.href) ? "bg-white/10 text-gold-400" : ""}`}>
                {m.label}
              </Link>
            ))}
            <Link href="/account" className="flex min-h-12 items-center rounded-xl px-4 text-lg hover:bg-white/10">My account & tickets</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
