// keeps a copy of pages people have opened, so they open without a connection
const V = "202611051505";
const C = "site";
const SCOPE = self.registration.scope;
const OFFLINE = SCOPE + "zh/offline/";
const PRE = ["zh/", "zh/offline/", "zh/favorites/", "assets/site.css?v=" + V, "assets/site.js?v=" + V, "assets/search.js?v=" + V, "assets/icon.svg"].map(u => SCOPE + u);
const MAX_PAGES = 60;

const isAsset = u => u.pathname.includes("/assets/") && !u.pathname.includes("/assets/cal/");

async function store(req, res) {
  const c = await caches.open(C), u = new URL(req.url);
  const keys = await c.keys();
  if (isAsset(u)) {
    // one copy per file: drop the copy from an older build
    for (const k of keys) if (new URL(k.url).pathname === u.pathname && k.url !== req.url) await c.delete(k);
  } else {
    const pages = keys.filter(k => !isAsset(new URL(k.url)) && !PRE.includes(k.url));
    for (const k of pages.slice(0, Math.max(0, pages.length - MAX_PAGES + 1))) await c.delete(k);
  }
  await c.put(req, res);
}

self.addEventListener("install", e => e.waitUntil((async () => {
  for (const u of PRE) {
    try {
      const r = await fetch(u, { cache: "no-cache" });
      if (r.ok) await store(new Request(u), r);
    } catch (err) {}
  }
  await self.skipWaiting();
})()));

self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== C) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener("fetch", e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== "GET" || u.origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && res.type === "basic") e.waitUntil(store(req, res.clone()));
        return res;
      } catch (err) {
        const hit = await caches.match(req, { ignoreSearch: true, ignoreVary: true });
        if (hit) return hit;
        if (u.href.split("?")[0] !== OFFLINE) return Response.redirect(OFFLINE, 302);
        return new Response("<p>现在没有网络。</p>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    })());
  } else if (isAsset(u)) {
    e.respondWith((async () => {
      const hit = await caches.match(req, { ignoreVary: true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) e.waitUntil(store(req, res.clone()));
        return res;
      } catch (err) {
        return (await caches.match(req, { ignoreSearch: true, ignoreVary: true })) || Response.error();
      }
    })());
  }
});
