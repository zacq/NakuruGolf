import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
  // NF-9: permanent redirects from the legacy WordPress site URLs
  async redirects() {
    return [
      { source: "/about-us", destination: "/about", statusCode: 301 },
      { source: "/about-us/:path*", destination: "/about", statusCode: 301 },
      { source: "/contact-us", destination: "/contact", statusCode: 301 },
      { source: "/home", destination: "/", statusCode: 301 },
    ];
  },
};

export default nextConfig;
