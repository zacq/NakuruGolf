import type { MetadataRoute } from "next";
import { db } from "@/db";
import * as s from "@/db/schema";
import { CLUB } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PAGES = ["", "/events", "/stay", "/dine", "/car-wash", "/golf", "/shop", "/membership", "/partners", "/venue", "/about", "/news", "/leaderboard", "/contact", "/policies"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, partners] = await Promise.all([db.select({ slug: s.events.slug }).from(s.events), db.select({ slug: s.partners.slug }).from(s.partners)]);
  return [...PAGES, ...events.map((e) => `/events/${e.slug}`), ...partners.map((p) => `/partners/${p.slug}`)].map((p) => ({ url: CLUB.url + p }));
}
