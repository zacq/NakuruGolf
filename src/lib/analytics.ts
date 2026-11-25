"use client";

type W = typeof window & {
  gtag?: (...a: unknown[]) => void;
  fbq?: (...a: unknown[]) => void;
  dataLayer?: unknown[];
};

// NF-10: GA4 + Meta Pixel events (view_event, begin_registration, purchase, room_search, ...)
export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as W;
  try {
    w.gtag?.("event", event, params);
    w.fbq?.("trackCustom", event, params);
    w.dataLayer?.push({ event, ...params });
  } catch {
    /* ignore */
  }
}
