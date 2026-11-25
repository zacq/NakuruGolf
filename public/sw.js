// Keeps opened ticket and order pages, and the assets they need, available offline (MO-10).
const CACHE = "ngc-tickets-v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const page = req.mode === "navigate" && (url.pathname.startsWith("/orders/") || url.pathname === "/account");
  const asset = url.pathname.startsWith("/_next/static/");
  if (!page && !asset) return;
  const save = (res) => {
    if (res.ok && !res.redirected) {
      const copy = res.clone();
      event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
    }
    return res;
  };
  event.respondWith(
    asset
      ? caches.match(req).then((hit) => hit || fetch(req).then(save))
      : fetch(req).then(save).catch(() => caches.match(req).then((hit) => hit || new Response("You are offline. Reconnect to open this page.", { status: 503, headers: { "Content-Type": "text/plain" } }))),
  );
});
