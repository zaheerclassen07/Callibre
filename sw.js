// Retires the offline service worker from the previous version so every
// browser loads the latest index.html. Safe to leave in place.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const wins = await self.clients.matchAll({ type: "window" });
    wins.forEach((w) => w.navigate(w.url));
  })());
});
