/* Azora main app service worker — v48.1 */
var CACHE = "azora-app-v50-tiles-sfx";
var ASSETS = [
  "./", "./index.html", "./style.css",
  "./logo.jpg", "./manifest-azora.json", "./Smile.png", "./Mossy.mp3",
  "./grass.jpg", "./road.jpg", "./concrete.jpg", "./wood1.jpg", "./wood2.jpg", "./walking.mp3", "./jumping.mp3", "./character_reset.mp3", "./notifcation.mp3"
];
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS).catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (e.request.url.indexOf("servers.html") !== -1) return;
  if (e.request.url.indexOf("creator.html") !== -1) return;
  var url = e.request.url;
  if (url.indexOf("script.js") !== -1 || url.indexOf("style.css") !== -1 || url.indexOf("sw-azora.js") !== -1) {
    e.respondWith(
      fetch(e.request, { cache: "no-store" }).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { try { c.put(e.request, copy); } catch (err) {} });
        return res;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request).catch(function () { return cached || Response.error(); });
    })
  );
});
