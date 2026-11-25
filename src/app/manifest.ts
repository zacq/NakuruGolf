import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nakuru Golf Club",
    short_name: "Nakuru Golf",
    description: "Events, rooms, dining, car wash, tee times and membership at Nakuru Golf Club.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f0",
    theme_color: "#0a2c1e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
