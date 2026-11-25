import type { MetadataRoute } from "next";
import { CLUB } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/account", "/cart", "/orders/"] },
    sitemap: `${CLUB.url}/sitemap.xml`,
  };
}
