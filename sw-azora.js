/* Azora main app service worker */
var CACHE = "azora-app-v13-popups";
var ASSETS = ["./", "./index.html", "./style.css", "./script.js", "./logo.jpg", "./manifest-azora.json", "./Smile.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS).catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (e.request.url.indexOf("servers.html") !== -1) return;
  if (e.request.url.indexOf("creator.html") !== -1) return;
  e.respondWith(caches.match(e.request).then(function (cached) {
    return cached || fetch(e.request).catch(function () { return cached || Response.error(); });
  }));
});
