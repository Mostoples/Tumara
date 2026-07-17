# Bab 13 — Menjadikan PWA

> **Tujuan bab ini:** Anda bisa mengubah Tumara menjadi PWA (*Progressive Web
> App*) yang bisa dipasang di HP seperti aplikasi asli, tetap berfungsi
> sebagian tanpa internet, dan otomatis memberi tahu pengguna saat ada versi
> baru.

| | |
|---|---|
| **Perkiraan waktu** | ~60 menit |
| **Sebelum ini** | [Bab 12 — Aturan Keamanan](12-aturan-keamanan.md) |
| **Anda butuh** | `app.html` & `index.html` sudah berjalan (Bab 03, 07), Chrome/Edge dengan DevTools, aplikasi dibuka lewat Live Server atau HTTPS asli — **bukan** `file://` |

## Apa yang kita bangun di bab ini

Empat berkas yang sudah **ada** di repo Tumara bekerja sama menjadikannya
PWA: `manifest.json` (identitas app), `sw.js` (petugas cache di latar
belakang), `js/pwa.js` (mendaftarkan `sw.js` + tombol install), dan
`js/version-check.js` + `offline.html` (pemberi tahu update & fallback
offline). Bab ini membedah cara kerjanya baris demi baris, supaya Anda
paham *kenapa* ditulis begitu — bukan sekadar menyalin.

## 1. Apa itu PWA & kenapa penting untuk sekolah

Bayangkan dua cara orang "punya" tempat tinggal. **Rumah sewa**: tiap kali
mau pulang, Anda harus mengingat alamatnya, jalan ke sana, buka pagar —
lupa alamat, tak bisa masuk. **Rumah sendiri**: ada ikon kunci di
gantungan, tinggal buka pintu, dan ada gudang kecil berisi persediaan —
listrik mati sebentar, Anda tetap bisa masak dengan yang tersimpan.

Web app biasa seperti rumah sewa: pengguna harus membuka browser, mengetik
alamat, baru masuk. **PWA** membuat web app terasa seperti rumah sendiri —
ada ikon di layar HP, terbuka langsung tanpa bilah alamat browser
terlihat, dan sebagian isinya tetap bisa dibuka walau internet mati
sesaat. Untuk sekolah ini nyata gunanya: guru piket yang mengabsen di
lorong bersinyal lemah, siswa membuka jadwal saat wifi sekolah bermasalah
— Tumara tidak langsung mati total hanya karena koneksi tersendat.

## 2. `manifest.json` — kartu identitas aplikasi

`manifest.json` adalah satu berkas JSON kecil di akar proyek yang
memberitahu browser (dan sistem operasi HP): "kalau app ini dipasang,
begini identitasnya." Berikut isinya:

```json
// manifest.json (ringkas — categories & shortcuts dipotong)
{
  "name": "Tumara — Tumbuh sehat, produktif, terarah",
  "short_name": "Tumara",
  "start_url": "/app.html?source=pwa",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#059669",
  "lang": "id",
  "icons": [
    { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "assets/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Field terpenting: **`name`** (nama lengkap, layar splash) vs
**`short_name`** ("Tumara", label pendek di bawah ikon — ruangnya sempit).
**`start_url`**: `"/app.html?source=pwa"` — halaman yang dibuka saat ikon
di-tap, langsung `app.html` (Bab 07), bukan `index.html` (perkenalan).
**`display: "standalone"`** — inilah yang membuat PWA terasa seperti app
asli: tanpa bilah alamat, tanpa tombol maju-mundur browser, tanpa tab.
**`theme_color: "#059669"`** — hijau tua yang sama dengan `--brand-dark`
di sistem desain (Bab 03), mewarnai bilah status HP saat standalone.
**`icons`** perlu **beberapa ukuran** karena tiap konteks (layar utama,
splash screen, ikon *maskable* Android yang dipotong launcher jadi
lingkaran) minta ukuran berbeda — `purpose: "maskable"` punya bantalan
kosong di tepinya supaya logo tak ikut terpotong. **`shortcuts`** —
pintasan saat Android *long-press* ikon Tumara.

Supaya browser tahu berkas ini ada, setiap halaman HTML menautkannya di
`<head>` lewat `<link rel="manifest" href="manifest.json">` — tanpa baris
ini, tombol "Install" di alamat browser tidak pernah muncul.

## 3. Service Worker — konsep dasar

**Service worker** adalah skrip JavaScript terpisah yang didaftarkan oleh
halaman, tapi setelah aktif ia **tidak** hidup di dalam halaman itu — ia
jalan di latar belakang browser, di luar `app.html`/`index.html` mana pun
yang sedang terbuka. Karena posisinya di luar halaman, ia bisa melakukan
sesuatu yang tak bisa dilakukan skrip biasa: **mencegat setiap permintaan
jaringan** yang dibuat halaman — gambar, CSS, JS, navigasi — dan
memutuskan sendiri: teruskan ke internet, atau jawab dari "gudang" (cache)
di perangkat. Kemampuan mencegat inilah yang membuat app bisa dibuka
tanpa internet: tanpa service worker, internet mati berarti browser
menampilkan halaman error bawaan yang dingin; dengan service worker,
permintaan yang gagal bisa "ditangkap" dan dijawab dari cache.

Tumara mendaftarkan service worker-nya dari `js/pwa.js`; kodenya sendiri
hidup di berkas terpisah `sw.js` di akar proyek (harus di akar, bukan di
folder `js/`, supaya cakupannya mencakup seluruh situs — bagian 6).

## 4. Siklus hidup: install → activate → fetch

Service worker punya tiga peristiwa (*event*) utama yang berurutan.
Berikut `sw.js` secara utuh dari bagian atasnya:

```js
// sw.js — baris 21-34
const CACHE_VERSION = 'v21';
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
```

`CACHE_VERSION` adalah angka versi **manual**, ditulis tangan oleh
pengembang. Ia membentuk nama cache: `tumara-v21` — ingat baik-baik, tabel
"Kalau macet" nanti akan sering kembali ke sini. `PRECACHE` adalah daftar
berkas inti (disebut *app shell*, "kerangka aplikasi") yang wajib tersedia
offline: kedua halaman utama, halaman cadangan `offline.html`, identitas
app, dan ikon.

### `install`

```js
// sw.js — baris 37-43
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())      // aktifkan SW baru segera
  );
});
```

`install` terjadi sekali, saat browser pertama menemukan `sw.js` atau
menemukan `sw.js` yang isinya berubah (dibandingkan *byte-per-byte*).
`caches.open(CACHE)` membuka "laci" cache `tumara-v21`, lalu
`cache.addAll(PRECACHE)` mengunduh semua berkas `PRECACHE` ke laci itu.
`self.skipWaiting()` adalah perintah "aktifkan service worker baru ini
sekarang juga" — bawaan browser sebenarnya membiarkan service worker lama
tetap melayani tab yang sedang terbuka sampai semua tab ditutup;
`skipWaiting()` memotong jeda itu.

### `activate`

```js
// sw.js — baris 46-54
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});
```

`activate` menyusul setelah `install` selesai. Di sinilah Tumara melakukan
strategi yang disebut di komentar paling atas `sw.js`: "anti **penumpukan
cache**". `caches.keys()` mengambil nama SEMUA laci cache yang pernah
dibuat service worker Tumara di perangkat ini — termasuk sisa versi lama
seperti `tumara-v20`, `tumara-v19`. `keys.filter((k) => k !== CACHE)`
menyaring: simpan hanya nama laci yang **bukan** laci aktif, lalu
`.map((k) => caches.delete(k))` menghapus semuanya. Kenapa perlu? Setiap
`CACHE_VERSION` dinaikkan, `install` membuat laci **baru** tanpa pernah
menyentuh laci lama — kalau `activate` tidak membersihkan, setiap deploy
meninggalkan laci penuh berkas basi tersimpan permanen di HP pengguna,
bertambah terus tanpa pernah dihapus. `self.clients.claim()` di akhir
membuat service worker baru langsung mengambil alih semua tab yang
sedang terbuka.

> **Menaikkan `CACHE_VERSION` adalah tombol darurat.** Curiga ada perangkat
> yang "nyangkut" di cache aneh? Naikkan angka ini satu saja, lalu deploy —
> cara paling pasti memaksa semua perangkat membuang cache lama. Bukan
> teori: riwayat commit `sw.js` menunjukkan angka ini sudah dinaikkan
> lebih dari selusin kali, dari `v1` sampai `v21` saat ini.

Satu event tambahan diletakkan di antara `install` dan `activate`:
`self.addEventListener('message', (event) => { if (event.data ===
'SKIP_WAITING') self.skipWaiting(); })` (`sw.js` baris 57-59). Ini
membuka pintu bagi halaman untuk **meminta** service worker baru segera
mengambil alih, pelengkap `skipWaiting()` otomatis yang sudah dipanggil
sendiri di `install`.

### `fetch`

```js
// sw.js — baris 62-86
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
```

Ini jantung `sw.js`: `fetch` menyala untuk **setiap** permintaan jaringan
yang dibuat halaman Tumara. Sebelum memutuskan strategi cache, ada
**empat gerbang penyaring** berurutan. **(a)** `req.method !== 'GET'` —
hanya `GET` ditangani; `POST`/`PUT`/`DELETE` (mis. menyimpan data ke
Firestore) dibiarkan lewat apa adanya, karena men-cache hasil "tulis data"
tak ada gunanya dan bisa berbahaya kalau salah diputar ulang. **(b)**
`url.origin !== self.location.origin` — **gerbang paling krusial**.
Permintaan menuju domain lain (font Google, CDN Ionicons, atau yang
terpenting Firebase/Firestore) sama sekali tidak disentuh, dibiarkan
ditangani browser seperti biasa, karena Firebase SDK punya mekanisme
*offline persistence*-nya **sendiri** (cache & antrean tulis untuk data
Firestore) — kalau `sw.js` ikut mencegatnya, dua sistem cache saling
tumpang tindih berebut respons yang sama, berpotensi membuat data tak
konsisten. `sw.js` sengaja "cuci tangan" untuk apa pun di luar file statis
Tumara sendiri. **(c)** `url.pathname.endsWith('version.json')` —
memastikan `version.json` (dipakai `version-check.js`, bagian 7) **selalu**
diambil segar dari jaringan; kalau ikut di-cache, deteksi update jadi
tidak berguna. **(d)** memilih strategi berdasarkan `req.destination` —
properti bawaan browser yang memberi tahu jenis permintaan. Tujuan
gambar/font, atau path di `/assets/`, dianggap **aset** dan memakai
`staleWhileRevalidate`; selain itu (navigasi, JS, CSS) memakai
`networkFirst` — dua strategi yang dibahas di bagian berikutnya.

## 5. Dua strategi cache

### `networkFirst` — untuk HTML/JS/CSS

```js
// sw.js — baris 89-108
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
```

Analoginya: `networkFirst` seperti guru yang **selalu** menelepon tata
usaha dulu untuk memastikan jadwal terbaru, dan hanya membuka catatan lama
di laci meja kalau teleponnya tak tersambung. Coba `fetch(req)` dulu.
Berhasil → simpan salinannya ke cache (`cache.put`), kembalikan hasil
aslinya. Gagal (blok `catch`, biasanya offline) → cari di cache, dan
khusus navigasi coba lagi sambil mengabaikan *query string*
(`ignoreSearch: true`, supaya `app.html?source=pwa` tetap cocok dengan
`app.html` di cache). Tetap tidak ketemu dan ini navigasi halaman →
`offline.html` (bagian 8) tampil sebagai jaring pengaman terakhir.

**Kenapa network-first**, bukan cache-first yang biasanya lebih cepat?
Karena Tumara sengaja memastikan pengguna **selalu** mendapat versi
terbaru saat online — selaras dengan header no-cache dan penomoran versi
di Bab 07. Cache di sini murni **jaring pengaman** untuk saat internet
benar-benar mati, bukan alat mempercepat loading.

### `staleWhileRevalidate` — untuk gambar/font/aset

```js
// sw.js — baris 111-121
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
```

Analoginya beda: seperti mengambil **fotokopi** yang sudah ada di meja
untuk dibaca sekarang (cepat, tak perlu antre ke lemari arsip), sambil di
belakang ada orang yang diam-diam memfotokopi versi terbaru untuk
menggantikannya, dipakai lain kali. `cached` ada → langsung dikembalikan,
**tanpa menunggu** jaringan, itulah kenapa terasa instan. Bersamaan itu
`fetch(req)` tetap jalan di latar belakang, hasilnya menimpa entri cache
lama lewat `cache.put`. Baris terakhir `cached || (await network) ||
Response.error()` adalah jaring pengaman kalau cache-nya masih kosong.

Strategi ini aman untuk gambar/ikon karena **URL asetnya stabil** —
`assets/logo.png` selalu bernama sama, jadi isi cache **diganti**, bukan
**ditambah** terus-menerus — tidak menyumbang masalah "penumpukan cache".

Dua detail teknis di kedua fungsi: **`res.clone()`** — `Response` dari
`fetch` hanya bisa **dibaca sekali**, jadi karena Tumara perlu menyimpan
salinan ke cache **dan** mengembalikan hasil yang sama ke pemanggil,
responsnya digandakan dulu dengan `.clone()`. Dan **`res.type ===
'basic'`** — membedakan respons origin sama dari respons lintas-origin
buram (`'opaque'`); menyimpan respons *opaque* berisiko karena browser
tak bisa memverifikasi isinya. Gerbang origin di `fetch` sudah menolak
lintas-origin lebih dulu, jadi ini jaring pengaman kedua yang jarang
terpakai, tapi tetap ditulis untuk kehati-hatian.

## 6. Mendaftarkan Service Worker & tombol pasang

`sw.js` hanyalah berkas kode; ia baru aktif setelah **didaftarkan**. Itu
tugas `js/pwa.js`:

```js
// js/pwa.js — baris 79-84
// --- Daftarkan service worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
```

`if ('serviceWorker' in navigator)` mengecek dulu apakah browser mendukung
service worker. Pendaftaran ditunda sampai event `load` — supaya instalasi
tak ikut memperlambat tampilan pertama. `.register('sw.js')` mengambil
path relatif terhadap lokasi pemanggil; karena `sw.js` diletakkan di
**akar** proyek (bukan di folder `js/`), cakupannya otomatis mencakup
seluruh situs — di `js/sw.js`, ia hanya bisa mengendalikan permintaan di
bawah folder `js/`.

Bagian kedua `js/pwa.js` mengurus tombol "Install Aplikasi". Browser sudah
punya prompt instalasi bawaan, tapi tampilannya (mini info-bar) tak bisa
disesuaikan gaya visualnya. Tumara menangkap event itu dan menyimpannya
untuk dipicu sendiri lewat tombol yang serasi dengan desain aplikasi:

```js
// js/pwa.js — baris 21-39 (ringkas)
const PWA = {
  deferredPrompt: null,
  get available() {
    return !this.installed && (!!this.deferredPrompt || isIOS());
  },
  async prompt() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      try { await this.deferredPrompt.userChoice; } catch {}
      this.deferredPrompt = null;
      this.sync();
      return;
    }
    if (isIOS()) this._iosHint();
  },
};

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();               // cegah mini-infobar, tampilkan tombol kita
  PWA.deferredPrompt = e;
  PWA.sync();
});
```

`beforeinstallprompt` ditembakkan browser tepat sebelum menampilkan
mini-infobar bawaan. `e.preventDefault()` membatalkannya, `e` disimpan di
`PWA.deferredPrompt` — "ditunda" sampai pengguna mengklik tombol Tumara
sendiri. `PWA.prompt()` dipanggil saat tombol diklik: `deferredPrompt`
tersimpan → panggil `.prompt()` bawaan browser (dialog instal asli),
tunggu pilihan pengguna, lalu bersihkan `deferredPrompt` (hanya bisa
dipakai sekali).

Pola paling elegan ada di `sync()` (`js/pwa.js` baris 42-51): elemen
**apa pun** ber-atribut `data-pwa-install` otomatis ditangani —
disembunyikan kalau instalasi belum tersedia atau app sudah terpasang,
ditampilkan kalau tersedia, dan disambungkan ke `PWA.prompt()` saat
diklik. Anda tak perlu menulis JavaScript baru di tiap halaman yang ingin
tombol install — cukup tambahkan atributnya di HTML.

Satu kasus khusus: **iOS tidak punya event `beforeinstallprompt`** —
Safari tidak mendukungnya. `isIOS()` mendeteksi lewat
`navigator.userAgent`, `PWA.available` tetap benar untuk iOS meski
`deferredPrompt` kosong. Tombol diklik di iOS hanya menampilkan
**instruksi manual** lewat `_iosHint()`: "Untuk memasang: ketuk tombol
Bagikan, lalu 'Add to Home Screen'."

## 7. `version-check.js` — memberi tahu update tanpa memaksa reload berlebihan

Ingat gerbang (c) di `fetch` (`sw.js`): `version.json` sengaja **tidak
pernah** dicegat, selalu diambil segar dari jaringan. Berkas itulah yang
dibaca `js/version-check.js` untuk mendeteksi Tumara sudah diperbarui di
server, sementara tab pengguna masih membuka versi lama:

```js
// js/version-check.js — baris 8-23
const VERSION_URL = 'version.json';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
let knownVersion = null;
let reloading = false;

async function fetchVersion() {
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.version ? String(data.version) : null;
  } catch {
    return null;
  }
}
```

`fetchVersion()` mengambil `version.json` — berkas kecil berisi
`{"version":"1.7.0+20260716-194437"}` — dan mengembalikan string
versinya. Perhatikan dua hal: `?t=${Date.now()}` menempel angka waktu ke
URL sehingga **selalu berbeda** tiap dipanggil, dan `{ cache: 'no-store' }`
memerintahkan browser tidak memakai cache HTTP bawaannya sama sekali.

```js
// js/version-check.js — baris 36-53
async function checkForUpdate() {
  if (reloading) return;
  const latest = await fetchVersion();
  if (!latest) return;
  if (knownVersion === null) {
    knownVersion = latest;
    return;
  }
  if (latest !== knownVersion) notifyAndReload();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkForUpdate();
});
window.addEventListener('focus', checkForUpdate);
setInterval(checkForUpdate, CHECK_INTERVAL_MS);
checkForUpdate();
```

Baca baik-baik urutan di `checkForUpdate()`: panggilan **pertama** kali
(`knownVersion === null`, tepat saat script baru dimuat) hanya
**menyimpan** versi sebagai baseline lalu berhenti — **tidak pernah**
memicu reload. Ini sengaja: kalau logikanya "reload setiap kali versi
terbaca", Tumara akan me-reload dirinya sendiri setiap kali dibuka —
pengalaman membingungkan dan sia-sia. Reload **hanya** terjadi di
pemanggilan berikutnya, kalau versi yang didapat **berbeda** dari
`knownVersion` tersimpan — artinya server benar-benar sudah diperbarui
selagi tab ini masih terbuka. Ada tiga pemicu: **`visibilitychange`** (tab
kembali terlihat), **`focus`** (jendela mendapat fokus kembali), dan
**`setInterval`** tiap 5 menit selama tab aktif. Kalau versi berubah,
`notifyAndReload()` menampilkan bilah hijau ("Tumara memperbarui ke versi
terbaru…") lalu me-reload setelah jeda 700 milidetik, memberi waktu
pengguna membaca pesannya.

**Kenapa perlu tiga lapis pertahanan** memastikan `version.json` tak
pernah basi — bukan cukup satu saja? Latihan berpikir *defense in depth*
(pertahanan berlapis): tiap lapis menutup celah yang **tidak** ditutup
lapis lainnya. `cache: 'no-store'` mencegah **browser** memakai cache
bawaannya. `?t=${Date.now()}` mencegah **perantara jaringan** (proxy
sekolah, CDN hosting) yang menyimpan cache berdasarkan kecocokan URL
persis. Gerbang (c) di `sw.js` mencegah **service worker sendiri** ikut
menyimpan respons ini — penting justru karena dua lapis sebelumnya sama
sekali tidak menyentuh service worker. Lupakan satu lapis, dua lainnya
masih menutup celahnya — tidak bergantung pada satu titik gagal.

## 8. Berkas `offline.html`

`offline.html` adalah halaman fallback paling terakhir — tampil kalau
`networkFirst` sudah mencoba jaringan (gagal), sudah mencari di cache
(tidak ketemu), dan permintaannya navigasi halaman. Isinya sengaja
sederhana:

```html
<!-- offline.html — ringkas -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Tumara — Offline</title>
  <meta name="theme-color" content="#059669">
  <link rel="icon" type="image/png" href="assets/logo.png">
  <style>
    :root { color-scheme: light dark; }
    body {
      min-height: 100dvh; display: grid; place-items: center;
      font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    }
    @media (prefers-color-scheme: dark) { body { background: #0b1120; color: #e2e8f0; } }
  </style>
</head>
<body>
  <div class="card">
    <img src="assets/logo.png" alt="Tumara">
    <h1>Kamu sedang offline</h1>
    <p>Tumara butuh koneksi internet untuk memuat data terbaru. Cek koneksimu, lalu coba lagi ya. 🌱</p>
    <button onclick="location.reload()">Coba Lagi</button>
  </div>
</body>
</html>
```

Beberapa hal layak dicatat: halaman ini **berdiri sendiri**, semua CSS-nya
inline di `<style>` — sengaja **tidak** bergantung pada `css/style.css`
eksternal, karena kalau berkas itu belum sempat masuk cache saat internet
putus, halaman offline bisa ikut tampil rusak tanpa gaya. Ia juga memakai
`@media (prefers-color-scheme: dark)` (tema bawaan sistem operasi), bukan
`[data-theme]` seperti sistem tema Tumara di Bab 03 — karena `localStorage`
tempat pilihan tema pengguna tersimpan tidak dijamin sudah terbaca di
titik krisis ini. `offline.html` sendiri **ada** di daftar `PRECACHE`
(bagian 4), jadi sudah tersimpan sejak `install`, sebelum offline
benar-benar terjadi — prasyarat wajib supaya `networkFirst` bisa
menemukannya sebagai fallback.

## 9. Menguji offline sungguhan

Menguji PWA tidak cukup dengan mematikan wifi router — DevTools Chrome
punya simulasi offline yang lebih terkendali:

1. Buka Tumara di Chrome (`app.html`, lewat Live Server atau URL deploy
   sungguhan — **bukan** `file://`), tekan `F12`, buka tab **Application**.
2. Di panel kiri, klik **Service Workers** — harus terlihat `sw.js`
   berstatus **activated and is running** dengan lingkaran hijau.
3. Pindah ke tab **Network**, centang kotak **Offline**, lalu reload
   halaman (`Ctrl+R`). Halaman harus tetap tampil — diambil dari cache
   lewat jalur `catch` di `networkFirst` — bukan error bawaan Chrome.
4. Coba buka path yang **belum pernah** dikunjungi (belum ada di
   `PRECACHE`). Kalau itu navigasi dan tak ada apa pun di cache, Anda
   mendarat di `offline.html`.
5. Uncentang **Offline** untuk kembali normal.

## ✅ Cek hasil

- DevTools → **Application** → **Service Workers**: `sw.js` berstatus
  terdaftar (*activated and is running*), nama cache `tumara-v21` terlihat
  di **Cache Storage**.
- Centang **Offline** di tab **Network**, reload: halaman tetap tampil
  dari cache, bukan error bawaan browser.
- Ubah `version.json` manual, tunggu maksimal 5 menit **atau** pindah tab
  lalu kembali: muncul bilah hijau "Tumara memperbarui ke versi
  terbaru…" lalu reload otomatis.
- Di HP, buka menu browser: muncul opsi "Add to Home screen" / "Install
  app". Tombol `[data-pwa-install]` (kalau ada di halaman) terlihat dan
  berfungsi.

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| Tab **Service Workers** di DevTools kosong, `sw.js` tak pernah terdaftar | Dibuka lewat `file://` (service worker butuh konteks aman: HTTPS atau `localhost`), atau path `'sw.js'` di `pwa.js` salah karena halaman dibuka dari sub-folder | Buka lewat Live Server (`http://localhost:...`) atau deploy HTTPS sungguhan. Pastikan `sw.js` ada di **akar** proyek, sejajar dengan `app.html`. |
| Sudah deploy perubahan tapi pengguna (atau Anda sendiri) masih melihat versi lama | Lupa menaikkan `CACHE_VERSION` di `sw.js`, jadi `install` tidak pernah membuat laci cache baru — service worker lama masih dianggap "sama" dan tidak pernah diperbarui | Naikkan `CACHE_VERSION` (mis. `'v21'` → `'v22'`) lalu deploy ulang. Untuk memaksa di satu perangkat saat menguji: DevTools → Application → Service Workers → centang **"Update on reload"**, lalu reload. |
| Ikon (`<ion-icon>`) tetap kotak kosong meski sudah offline dan sudah pernah online sebelumnya | Ikon Ionicons dimuat dari CDN `cdn.jsdelivr.net` — lintas-origin, dan gerbang (b) di `sw.js` **sengaja** tidak mencegat/men-cache permintaan lintas-origin | Ini batasan yang disengaja, bukan bug (lihat Bab 03 bagian CDN). Kalau ikon wajib tampil offline, opsi jangka panjangnya menyimpan berkas ikon sendiri di `assets/` — di luar cakupan bab ini. |
| Halaman offline yang tampil bukan `offline.html`, malah error polos browser | `offline.html` belum sempat masuk cache (mis. pengguna baru pertama kali membuka Tumara langsung dalam kondisi offline, sebelum `install` sempat jalan) | Wajar untuk kunjungan pertama tanpa internet sama sekali — `install` butuh koneksi untuk mengunduh `PRECACHE`. Minta pengguna membuka Tumara sekali saat online dulu. |
| Bilah "memperbarui ke versi terbaru" tidak pernah muncul walau `version.json` sudah diubah | Tab tidak pernah dipindah/fokus ulang dan belum genap 5 menit, **atau** `version.json` sendiri kena cache di suatu lapis | Tunggu genap 5 menit, atau pindah tab lalu kembali (memicu `visibilitychange`). Kalau tetap tidak muncul, cek di tab Network apakah permintaan `version.json?t=...` benar-benar terkirim (status 200), bukan `(from disk cache)`. |

## 🧪 Latihan

1. **Tambah satu file baru ke `PRECACHE`.** Pilih satu berkas statis (mis.
   `css/style.css`), tambahkan ke array `PRECACHE` di `sw.js`, naikkan
   `CACHE_VERSION`, lalu uji: buka Tumara sekali saat online, cek di
   DevTools → Application → Cache Storage bahwa berkas itu muncul di laci
   cache versi baru.
2. **Simulasikan update dua kali berturut-turut.** Ubah `version.json`,
   tunggu bilah pembaruan & reload otomatis terjadi. Segera setelah
   reload, ubah lagi `version.json` sekali lagi. Amati: apakah pembaruan
   kedua juga terdeteksi dengan benar?
3. ⭐ **Jelaskan dengan kata sendiri** kenapa `sw.js` sengaja **tidak**
   mencegat permintaan ke Firestore, padahal secara teknis service worker
   *bisa* melakukannya. Tuliskan dalam 3-4 kalimat, sebutkan istilah
   "offline persistence" dari bagian 4.

## 📌 Ringkasan

- **Tiga pilar PWA Tumara**: `manifest.json` (identitas app), `sw.js`
  (petugas cache di latar belakang), `js/version-check.js` (pemberi tahu
  update). `js/pwa.js` menyatukan pendaftaran `sw.js` dengan tombol
  install lewat pola `[data-pwa-install]`.
- **Siklus hidup service worker**: `install` (pracache app shell,
  `skipWaiting()`) → `activate` (hapus SEMUA cache versi lama, cegah
  penumpukan) → `fetch` (empat gerbang penyaring sebelum memutuskan
  strategi cache).
- **Dua strategi cache**: `networkFirst` untuk HTML/JS/CSS (cache hanya
  jaring pengaman, bukan mempercepat), `staleWhileRevalidate` untuk
  gambar/font/aset (tampil cepat dari cache, perbarui diam-diam di latar
  belakang).
- Permintaan **lintas-origin** (Firebase/Firestore, CDN font & ikon)
  sengaja **tidak** disentuh `sw.js`, supaya tidak bentrok dengan
  mekanisme offline milik Firebase SDK sendiri.
- **`version.json`** dijaga tidak pernah basi lewat tiga lapis sekaligus
  (`cache: 'no-store'`, `?t=Date.now()`, gerbang khusus di `sw.js`) — pola
  *defense in depth* sederhana.
- Menaikkan `CACHE_VERSION` memaksa semua perangkat membuang cache lama
  pada deploy berikutnya — dipakai berkali-kali nyata sepanjang riwayat
  pengembangan Tumara.

**Berikutnya:** [Bab 14 — Deploy & Pemeliharaan](14-deploy-dan-pemeliharaan.md)
