"use client";

import { CLUB, waLink } from "@/lib/constants";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="container-x section text-center">
      <h1 className="text-3xl font-bold text-fairway-900">Something went wrong</h1>
      <p className="mt-2">Please try again. Your cart is saved on this phone.</p>
      <div className="mt-6 grid justify-center gap-3 sm:flex">
        <button onClick={reset} className="btn-primary">Try again</button>
        <a href={waLink("Hello Nakuru Golf Club, I had a problem on the website.")} className="btn-wa">WhatsApp us</a>
        <a href={`tel:${CLUB.phone}`} className="btn-outline">Call {CLUB.phoneDisplay}</a>
      </div>
    </main>
  );
}
