"use client";

import { CLUB } from "@/lib/constants";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Georgia, serif", textAlign: "center", padding: "4rem 1rem", background: "#faf7f0", color: "#14231b" }}>
        <h1>Nakuru Golf Club</h1>
        <p>The website is temporarily unavailable. Please try again shortly.</p>
        <p>Reception: <a href={`tel:${CLUB.phone}`}>{CLUB.phoneDisplay}</a></p>
        <button onClick={reset} style={{ minHeight: 48, padding: "0 1.5rem", fontSize: 16 }}>Try again</button>
      </body>
    </html>
  );
}
