/* Azora main app service worker — v48.1 */
var CACHE = "azora-app-v58-0-faces";
var ASSETS = [
  "./", "./index.html", "./checkout.html", "./style.css",
  "./logo.jpg", "./manifest-azora.json", "./Smile.png", "./female_smile.png", "./cartoonish_smile.png", "./crying.png", "./greedy_smile.png", "./mysterious.png", "./red_mysterious.png", "./robotic.png", "./sad_tears.png", "./simple_smile.png", "./tears_of_joy.png", "./wide_mouth.png", "./female_hair.webp", "./Mossy.mp3",
  "./grass.jpg", "./road.jpg", "./concrete.jpg", "./wood1.jpg", "./wood2.jpg", "./wood3.jpg", "./leaf.jpg", "./skybox.jpg", "./marble.png", "./walking.mp3", "./jumping.mp3", "./character_reset.mp3", "./notifcation.mp3", "./click_buttons.mp3"
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
