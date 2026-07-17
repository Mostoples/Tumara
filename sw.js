/* ============================================================
   TUMARA — Service Worker (PWA)
   ------------------------------------------------------------
   Strategi anti "penumpukan cache":
   1. HANYA ada satu cache aktif — namanya berversi (CACHE).
      Saat activate, SEMUA cache lain (versi lama, sisa lama)
      dihapus, sehingga cache tidak pernah menumpuk.
   2. HTML/JS/CSS memakai network-first → pengguna selalu dapat
      versi terbaru saat online (selaras dengan header no-cache
      Firebase & version-check.js). Cache hanya cadangan offline.
   3. version.json TIDAK PERNAH di-cache (selalu jaringan).
   4. Aset gambar/ikon memakai stale-while-revalidate; karena
      URL-nya tetap, entri lama ditimpa, bukan bertambah.
   5. Permintaan lintas-origin (font Google, CDN ionicons,
      Firebase/Firestore) TIDAK diintersepsi sama sekali.

   Naikkan angka CACHE_VERSION untuk memaksa pembersihan total
   cache lama pada semua perangkat.
   ============================================================ */

const CACHE_VERSION = 'v23';
const CACHE = `tumara-${CACHE_VERSION}`;

// Kerangka aplikasi (app shell) yang dipracache agar bisa dibuka offline.
const PRECACHE = [
  './',
  'index.html',
  'app.html',
  'offline.html',
  'manifest.json',
  'assets/logo.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
];

// ---------- Install: pracache app shell ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())      // aktifkan SW baru segera
  );
});

// ---------- Activate: hapus SEMUA cache selain versi aktif ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Izinkan halaman meminta SW baru mengambil alih tanpa menunggu.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ---------- Fetch ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani GET.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Lewati semua permintaan lintas-origin (font, CDN, Firebase, dst.).
  if (url.origin !== self.location.origin) return;

  // version.json selalu dari jaringan — jangan pernah di-cache.
  if (url.pathname.endsWith('version.json')) return;

  const dest = req.destination;
  const isAsset = dest === 'image' || dest === 'font' ||
                  url.pathname.startsWith('/assets/');

  if (isAsset) {
    event.respondWith(staleWhileRevalidate(req));
  } else {
    // Navigasi + HTML/JS/CSS/JSON lain → network-first.
    event.respondWith(networkFirst(req));
  }
});

// Network-first: coba jaringan, simpan salinan, jatuh ke cache saat offline.
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch {
    // Cocokkan persis dulu; untuk navigasi, abaikan query (mis. ?source=pwa).
    const cached = await cache.match(req) ||
                   (req.mode === 'navigate' ? await cache.match(req, { ignoreSearch: true }) : null);
    if (cached) return cached;
    // Fallback terakhir untuk navigasi halaman saat benar-benar offline.
    if (req.mode === 'navigate') {
      return (await cache.match('offline.html')) ||
             (await cache.match('index.html')) ||
             Response.error();
    }
    return Response.error();
  }
}

// Stale-while-revalidate: sajikan dari cache, perbarui di latar belakang.
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}
