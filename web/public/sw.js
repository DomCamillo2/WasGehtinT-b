self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Keep a minimal fetch handler so installability checks pass.
self.addEventListener("fetch", () => {
  // no-op runtime caching for now
});
