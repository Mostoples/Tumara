# Bab 07 — Kerangka Aplikasi Siswa

> **Tujuan bab ini:** Anda bisa membangun `app.html` (bingkai aplikasi siswa: sidebar, bottom-nav, area konten) dan `js/app.js` (router yang mengatur pergantian "halaman" di dalamnya) — fondasi kosong yang siap diisi fitur nyata mulai Bab 08.

| | |
|---|---|
| **Perkiraan waktu** | ~75 menit |
| **Sebelum ini** | [Bab 06 — Masuk, Daftar & Peran](06-masuk-daftar-dan-peran.md) |
| **Anda butuh** | `js/db.js` (Bab 05) dan alur masuk/`roles.js` (Bab 06) sudah berjalan, `js/utils.js` (Bab 02) sudah ada, editor + Live Server |

## Apa yang kita bangun di bab ini

Sampai Bab 06, Anda sudah bisa login dan tahu peran pengguna. Tapi begitu peran itu "siswa", ia harus mendarat di suatu tempat: **satu halaman HTML** (`app.html`) yang di dalamnya ada banyak "layar" — Beranda, Tugas, Catatan, Kebiasaan, Jadwal, Fokus, Ibadah, Profil — tanpa pernah memuat ulang halaman browser saat berpindah di antaranya.

Bab ini membangun dua hal:

1. **`app.html`** — kerangka statis: sidebar di kiri (desktop), bilah navigasi di bawah (mobile), dan satu kotak kosong `<div id="view">` di tengah yang isinya akan berganti-ganti.
2. **`js/app.js`** — objek `App` yang jadi "petugas ganti channel": mendengarkan klik di sidebar/bottom-nav, lalu mengisi `#view` dengan konten yang sesuai.

Gambarannya seperti ini:

```
┌──────────────────────────────────────────────────┐
│  sidebar (tetap)   │   #pageTitle / #pageSub       │
│  • Beranda          │───────────────────────────────│
│  • Tugas            │                                │
│  • Catatan          │        #view                   │
│  • Kebiasaan        │   (isinya diganti App.navigate) │
│  • Jadwal           │                                │
│  • Fokus            │                                │
│  • Ibadah           │                                │
│  • Profil           │                                │
└──────────────────────────────────────────────────┘
```

Di akhir bab ini, `#view` belum berisi fitur sungguhan — Dashboard, Tugas, dan lain-lain baru dibangun di Bab 08-09. Tapi Anda akan membuat satu view percobaan yang sangat sederhana untuk MEMBUKTIKAN router-nya jalan, sebelum menaruh sesuatu yang rumit di dalamnya.

---

## 1. Kenapa "bingkai + router", bukan banyak halaman HTML terpisah

Di Bab 02, Anda sudah punya beberapa halaman HTML terpisah: `index.html`, `auth.html`, `app.html`, `guru.html`, `admin.html`. Itu pembagian **antar peran** — siswa, guru, dan admin memang butuh halaman berbeda, karena kebutuhannya jauh berbeda dan berpindah di antaranya memang boleh memuat ulang browser.

Tapi di **dalam** dunia siswa saja, ada delapan "layar": Beranda, Tugas, Catatan, Kebiasaan, Jadwal, Fokus, Ibadah, Profil. Kalau masing-masing jadi file HTML sendiri (`beranda.html`, `tugas.html`, dst.), setiap klik nav akan memuat ulang seluruh halaman — sidebar dibangun ulang, koneksi Firebase disambung ulang, dan layar berkedip putih sesaat. Untuk aplikasi yang dipakai berpindah-pindah tab puluhan kali sehari, itu terasa lambat dan kasar.

Solusinya: **satu halaman HTML, banyak "view" di dalamnya.** Sidebar, header, dan bottom-nav dibangun **sekali** dan tidak pernah dibongkar lagi. Yang berganti hanyalah isi satu kotak: `<div id="view">`. Kode JavaScript yang mengatur pergantian ini disebut **router** — namanya cocok, karena tugasnya benar-benar mengatur rute (jalur) mana yang sedang aktif.

> **Analogi:** `app.html` seperti bingkai televisi. Bingkai, kaki, dan tombolnya tidak berubah. Yang berubah cuma **channel** — dan mengganti channel tidak berarti membeli TV baru. Tiap "channel" di Tumara punya nama pendek (`dashboard`, `tugas`, `ibadah`, ...) yang disebut **rute** (*route*). Router adalah remote control-nya: ia tahu channel mana yang sedang tayang, dan tahu cara menggantinya.

## 2. Struktur `app.html`

Bukalah `app.html` di repo. Ini kerangkanya (diringkas; tag `<head>` berisi meta PWA dan pemuatan font/Ionicons sudah Anda kenal dari Bab 02-03):

```html
<!-- app.html — kerangka -->
<div id="appShell" class="app-shell hidden">

  <aside class="sidebar">
    <div class="sidebar-logo">...</div>
    <nav class="sidebar-nav" id="sidebarNav">
      <a class="nav-link" data-route="dashboard"><ion-icon name="grid-outline"></ion-icon><span>Beranda</span></a>
      <a class="nav-link" data-route="tugas"><ion-icon name="checkbox-outline"></ion-icon><span>Tugas</span></a>
      <!-- ...enam nav-link lain: catatan, kebiasaan, jadwal, fokus, ibadah, profile -->
    </nav>
    <div class="sidebar-footer">
      <button class="theme-toggle" id="themeToggle">...</button>
      <div class="sidebar-user" id="sidebarUser"></div>
    </div>
  </aside>

  <main class="main-area">
    <header class="topbar">
      <div>
        <h1 class="topbar-title" id="pageTitle">Beranda</h1>
        <div class="topbar-sub" id="pageSub"></div>
      </div>
      <div class="topbar-actions">
        <button class="icon-btn" id="topLangBtn">...</button>
        <button class="icon-btn" id="topThemeBtn">...</button>
        <button class="avatar-btn" id="topAvatar">...</button>
      </div>
    </header>
    <div class="view-wrap"><div id="view"></div></div>
  </main>

  <nav class="bottom-nav" id="bottomNav">
    <a class="bnav-item" data-route="dashboard">...</a>
    <a class="bnav-item" data-route="tugas">...</a>
    <button class="bnav-more" id="bnavMore">...</button>
    <a class="bnav-item" data-route="ibadah">...</a>
    <a class="bnav-item" data-route="profile">...</a>
    <div class="bnav-sheet" id="bnavSheet">
      <!-- rute yang tak muat di bottom-nav: catatan, kebiasaan, jadwal, fokus -->
    </div>
  </nav>
</div>

<div id="modalRoot"></div>
<div id="toastRoot" class="toast-root"></div>
```

Beberapa hal yang wajib Anda kenali:

- **`id="appShell"`** membungkus seluruh bingkai, dan diberi kelas `hidden` di awal. Ia baru dimunculkan setelah `App.init()` memastikan pengguna sudah login dan sudah selesai onboarding (Bagian 8). Sebelum itu, yang tampil adalah `#onboardScreen` (dibahas Bab 06) — bukan `appShell` yang kosong-berkedip.
- **`data-route="..."`** di setiap `<a>` adalah "nama channel". Ini bukan atribut HTML bawaan — ini **atribut data** (`data-*`), cara HTML menyimpan informasi khusus aplikasi tanpa mengganggu perilaku bawaan elemen. Router akan membaca atribut ini untuk tahu ke mana harus pindah saat elemen itu diklik.
- **Ada DUA tempat nav dengan `data-route` yang sama**: `.nav-link` di sidebar (untuk desktop) dan `.bnav-item`/`.bnav-sheet-item` di bottom-nav (untuk mobile, termasuk menu "lainnya" `#bnavSheet` yang menampung rute yang tak muat di bar bawah). Keduanya harus punya route yang persis sama, karena keduanya dipasangi listener yang sama (Bagian 10) — pengguna bisa klik dari sidebar di layar lebar atau dari bottom-nav di ponsel, hasilnya harus identik.
- **`#pageTitle` dan `#pageSub`** adalah judul & subjudul halaman di atas — router akan mengisi teks ini setiap kali berpindah rute, supaya pengguna tahu "channel" apa yang sedang ditonton.
- **`#view`** adalah kotak yang isinya diganti-ganti. Ini kotak yang paling sering Anda tuju sepanjang modul ini.
- **`#toastRoot`** dan **`#modalRoot`** sudah Anda kenal dari `js/utils.js` (Bab 02): `toast()` menaruh notifikasi kecil ke `#toastRoot`, `openModal()`/`closeModal()` menaruh/mengosongkan `#modalRoot`. Keduanya diletakkan di luar `#appShell` supaya toast dan modal tetap tampil sekalipun `#appShell` sedang tersembunyi (misalnya toast error koneksi saat masih di layar auth).

Perhatikan urutan `<script>` di bagian bawah `app.html`:

```html
<!-- app.html — urutan <script> -->
<script src="js/firebase-config.js"></script>
<script src="js/i18n.js"></script>
<script src="js/utils.js"></script>
<script src="js/db.js"></script>
<script src="js/roles.js"></script>
<script src="js/views/dashboard.js"></script>
<script src="js/views/productivity.js"></script>
<script src="js/views/ibadah.js"></script>
<script src="js/views/profile.js"></script>
<script src="js/app.js"></script>
```

`js/app.js` dimuat **paling terakhir**. Ini bukan kebetulan: `app.js` memakai `Dashboard`, `Prod`, `Ibadah`, `Profile` — objek-objek yang didefinisikan file-file view di atasnya. Kalau `app.js` dimuat lebih dulu, objek-objek itu belum ada saat `app.js` dibaca browser. Ingat aturan Bab 02: **urutan `<script>` = urutan ketergantungan.**

## 3. Register route: `TITLES` dan `VIEWS`

Sekarang buka `js/app.js`. Di bagian atas ada dua objek yang jadi "daftar channel resmi":

```js
// js/app.js — baris 11-31
const App = {
  route: 'dashboard',
  _reminderId: null,

  TITLES: {
    dashboard:  [() => tr('Beranda', 'Home'),          () => fmtDate(todayStr(), { weekday: true })],
    tugas:      [() => tr('Tugas', 'Tasks'),           () => tr('Tugas dari guru & progresmu', 'Tasks from your teachers & your progress')],
    catatan:    [() => tr('Catatan', 'Notes'),         () => tr('Ide & catatan pribadimu', 'Your personal notes & ideas')],
    kebiasaan:  [() => tr('Kebiasaan', 'Habits'),      () => tr('Bangun kebiasaan baik, satu hari satu langkah', 'Build good habits, one day at a time')],
    jadwal:     [() => tr('Jadwal', 'Schedule'),       () => tr('Jadwal kelas dari wali kelasmu', 'Class schedule from your homeroom teacher')],
    fokus:      [() => tr('Fokus', 'Focus'),           () => tr('Timer Pomodoro untuk belajar fokus', 'Pomodoro timer for focused study')],
    ibadah:     [() => tr('Ibadah', 'Worship'),        () => tr('Sholat, Al-Qur\'an, dzikir & zakat', 'Prayer, Qur\'an, dhikr & zakat')],
    profile:    [() => tr('Profil', 'Profile'),        () => tr('Data diri & pengaturan aplikasi', 'Personal data & app settings')]
  },

  VIEWS: {
    dashboard: () => Dashboard,
    tugas:     () => Prod,
    catatan:   () => Prod,
    kebiasaan: () => Prod,
    jadwal:    () => Prod,
    fokus:     () => Prod,
    ibadah:    () => Ibadah,
    profile:   () => Profile
  },
  // ...
```

**`TITLES`** memetakan nama rute ke sepasang teks: `[judul, subjudul]`. Perhatikan keduanya bukan string biasa, melainkan **fungsi** — `() => tr('Beranda', 'Home')`, bukan langsung `'Beranda'`. Alasannya: `tr()` (fungsi terjemahan dari `js/i18n.js`, dibahas detail Bab 09) mengembalikan teks sesuai bahasa **yang sedang aktif SAAT dipanggil**. Kalau `TITLES.dashboard` langsung berisi string hasil `tr(...)` yang sudah jadi, teks itu terkunci ke bahasa yang aktif saat file dimuat — dan tak pernah berubah lagi walau pengguna mengganti bahasa nanti. Dengan membungkusnya jadi fungsi, judul dihitung ulang **setiap kali rute itu dikunjungi**, jadi selalu ikut bahasa terbaru.

**`VIEWS`** memetakan nama rute ke objek view yang akan menampilkan isinya. Perhatikan pola yang sama: setiap nilainya adalah **fungsi** yang mengembalikan objek (`() => Dashboard`), bukan objek `Dashboard` itu sendiri. Fungsi kecil seperti ini — yang tugasnya cuma "menunda" pengambilan sebuah nilai sampai benar-benar dipanggil — punya nama: **thunk**. Dua alasan sederhana kenapa dipakai di sini:

1. **Referensi ditunda sampai saat dipakai.** Kalau `VIEWS.dashboard` ditulis langsung sebagai `Dashboard` (bukan `() => Dashboard`), maka pada saat baris `VIEWS: { dashboard: Dashboard, ... }` dijalankan, variabel `Dashboard` **harus sudah ada**. Dengan dibungkus fungsi, `Dashboard` baru dicari saat rute itu benar-benar dikunjungi (`this.VIEWS[route]()` dipanggil) — bukan saat objek `App` pertama kali dibuat. Ini memberi sedikit ruang napas soal urutan definisi.
2. **Jadi cara memeriksa "apakah rute ini valid".** Router bisa bertanya `this.VIEWS[route]` — kalau `undefined`, berarti nama rute itu tidak terdaftar sama sekali (lihat Bagian 4). Baris pengecekannya pendek justru karena `VIEWS` adalah objek datar berisi fungsi, bukan struktur yang lebih rumit.

Perhatikan juga: `tugas`, `catatan`, `kebiasaan`, `jadwal`, dan `fokus` semuanya menunjuk ke **objek view yang sama**, `Prod` (singkatan dari "Produktivitas"). Ini bukan salah ketik. Satu objek view bisa melayani beberapa rute sekaligus dengan berperilaku berbeda menurut rute mana yang memanggilnya (lewat konsep "tab" yang akan Anda lihat di `navigate()` sebentar lagi). Detail lengkap `Prod` — bagaimana ia tahu harus menampilkan Tugas atau Fokus — dibahas di **Bab 09**. Untuk sekarang, cukup ingat: **satu objek view boleh menjawab lebih dari satu nama rute.**

## 4. `navigate(routeSpec)` — jantung router

Ini fungsi yang paling sering dipanggil di seluruh aplikasi siswa — setiap klik nav, setiap "simpan lalu kembali ke daftar", semuanya lewat sini:

```js
// js/app.js — baris 147-177
navigate(routeSpec) {
  // routeSpec bisa 'health' atau 'health/sleep' (rute + tab, dari URL hash saat refresh).
  let [route, tab] = String(routeSpec).split('/');
  if (!this.VIEWS[route]) { route = 'dashboard'; tab = undefined; }
  this.route = route;

  const view = this.VIEWS[route]();
  // Bila tab diberikan (mis. dari hash saat refresh) & view mengenal konsep tab, pulihkan.
  if (tab && typeof view.tab !== 'undefined') view.tab = tab;

  // Tulis hash: rute + tab aktif view (bila ada) agar bertahan saat refresh.
  this._writeHash(route, typeof view.tab !== 'undefined' ? view.tab : undefined);

  $$('.nav-link, .bnav-item, .bnav-sheet-item').forEach(a =>
    a.classList.toggle('active', a.dataset.route === route));

  // ...urusan tombol "lainnya" di bottom-nav, dilewati dulu di sini...

  const [judul, sub] = this.TITLES[route];
  $('#pageTitle').textContent = judul();
  $('#pageSub').textContent = sub();

  view.render($('#view'));
  window.scrollTo({ top: 0 });
},
```

Baca baris demi baris:

- **`let [route, tab] = String(routeSpec).split('/')`** — `routeSpec` yang diterima bisa dua bentuk: `'tugas'` saja, atau `'tugas/selesai'` (rute plus **tab** di dalamnya, dipisah garis miring). `split('/')` memecahnya jadi dua bagian sekaligus lewat *array destructuring* — pola penulisan JavaScript untuk "ambil elemen array dan langsung sematkan ke beberapa nama variabel". Kalau tak ada garis miring, `tab` otomatis `undefined`.
- **`if (!this.VIEWS[route]) { route = 'dashboard'; tab = undefined; }`** — inilah tempat `VIEWS` dipakai sebagai "daftar channel resmi" (Bagian 3). Kalau nama rute yang diminta tidak terdaftar di `VIEWS`, router **tidak** menampilkan halaman error — ia diam-diam jatuh ke `'dashboard'`. Ini melindungi dari hash yang salah ketik atau tautan lama yang menunjuk rute yang sudah dihapus.
- **`const view = this.VIEWS[route]();`** — di sinilah thunk dari Bagian 3 dipanggil. Tanda kurung `()` di akhir yang memanggil fungsinya, mengeluarkan objek view sungguhan (`Dashboard`, `Prod`, dst).
- **`if (tab && ... view.tab !== 'undefined') view.tab = tab;`** — kalau `routeSpec` membawa tab (mis. dari hash saat refresh browser) **dan** view tujuan memang mengenal konsep tab (dicek dengan melihat apakah properti `view.tab` ada), tab itu dipulihkan langsung ke objek view sebelum dirender. Ini contoh state yang sangat sederhana: bukan disimpan di `App`, tapi ditumpangkan langsung ke objek view-nya.
- **`this._writeHash(route, ...)`** — mencatat rute (dan tab bila ada) ke URL, dibahas Bagian 5.
- **`$$('.nav-link, .bnav-item, .bnav-sheet-item').forEach(...)`** — menyalakan kelas CSS `.active` hanya pada elemen nav yang `data-route`-nya cocok dengan rute baru, dan mematikannya di elemen lain. Ini yang membuat ikon sidebar/bottom-nav "menyala" sesuai halaman yang sedang dibuka.
- **`const [judul, sub] = this.TITLES[route]; $('#pageTitle').textContent = judul();`** — mengambil sepasang fungsi dari `TITLES` (Bagian 3), memanggil keduanya, dan menaruh hasilnya ke `#pageTitle`/`#pageSub` di header.
- **`view.render($('#view'));`** — baris terakhir dan terpenting. Setiap objek view di Tumara **wajib** punya method `render(el)` yang menerima satu elemen DOM dan mengisi `el.innerHTML` dengan tampilannya sendiri. Ini **kontrak** yang sama dipakai berulang di seluruh aplikasi (`Dashboard.render`, `Prod.render`, `Ibadah.render`, `Profile.render`, dan semua view guru/admin nanti) — router tak perlu tahu APA isi tiap view, cukup tahu bahwa semuanya bisa dipanggil `.render(el)`.

Perhatikan: **`view.render($('#view'))` dipanggil tanpa `await`**, walaupun hampir semua `render()` di Tumara adalah fungsi `async` (karena mereka memanggil `DB.list(...)` yang butuh menunggu). Ini disengaja — dibahas lagi di Latihan bab ini, tapi intinya: `navigate()` tak perlu menunggu render selesai untuk menganggap dirinya "selesai berpindah rute". Hash, kelas `.active`, dan judul halaman semuanya sudah benar seketika; isi `#view` menyusul begitu datanya siap.

## 5. Hash hanya untuk bertahan dari refresh, BUKAN riwayat navigasi

URL Tumara berubah setiap kali Anda pindah rute — coba klik "Tugas", perhatikan alamat browser jadi `...app.html#tugas`. Tapi ini **bukan** riwayat navigasi seperti pada website biasa. Lihat fungsi yang menulisnya:

```js
// js/app.js — baris 193-196
// Sinkronkan URL hash (tanpa menambah riwayat).
_writeHash(route, tab) {
  const h = tab ? `${route}/${tab}` : route;
  if ((location.hash || '').replace(/^#/, '') !== h) history.replaceState(null, '', '#' + h);
},
```

Perhatikan `history.replaceState`, **bukan** `history.pushState`. Bedanya penting:

- `pushState` **menambah** entri baru ke riwayat browser. Setiap kali dipanggil, tombol **Back** akan mundur ke entri sebelumnya.
- `replaceState` **mengganti** entri yang sedang aktif, tanpa menambah riwayat sama sekali.

Kenapa Tumara sengaja memilih `replaceState`? Bayangkan kalau memakai `pushState`: setiap klik nav (Beranda → Tugas → Catatan → Ibadah) menambah satu entri riwayat. Begitu pengguna menekan tombol **Back** di ponselnya, ia tidak keluar dari aplikasi — ia malah mundur satu-satu lewat channel yang baru saja ditontonnya, dan baru setelah menekan Back berkali-kali akhirnya keluar. Itu bukan perilaku yang diharapkan pengguna aplikasi (bandingkan dengan aplikasi native: tombol Back biasanya langsung menutup aplikasi atau kembali ke home-screen perangkat, bukan mundur antar-tab internal). Dengan `replaceState`, berpindah rute **tidak** menambah riwayat sama sekali — tombol Back browser bekerja seperti yang pengguna harapkan: keluar dari `app.html`.

Lalu untuk apa hash tetap ditulis kalau bukan untuk riwayat? Jawabannya: **bertahan dari refresh (reload)**. Kalau pengguna sedang di tab "Kebiasaan" lalu me-refresh browser (misalnya karena koneksi sempat putus), aplikasi memuat ulang dari nol — seluruh JavaScript dijalankan lagi dari awal, dan `App.route` kembali ke nilai default `'dashboard'`. Tanpa hash, pengguna akan selalu terlempar balik ke Beranda setiap refresh, walau tadinya sedang membaca sesuatu di Kebiasaan. Hash menyimpan "channel terakhir" di URL, yang bertahan lewat refresh (URL tak ikut hilang saat halaman dimuat ulang), sehingga aplikasi bisa membacanya kembali saat boot.

Baris yang membaca hash itu ada di `showApp()`, dipanggil **satu kali saja** saat aplikasi baru dibuka:

```js
// js/app.js — baris 112-117
// Rute awal mengikuti URL hash (mis. #health atau #health/sleep) agar
// refresh tetap di halaman & tab yang sama, bukan selalu balik ke Beranda.
const fromHash = (location.hash || '').replace(/^#/, '');
const route0 = fromHash.split('/')[0];
this.navigate(this.VIEWS[route0] ? fromHash : 'dashboard');
```

Perhatikan `this.VIEWS[route0] ? fromHash : 'dashboard'` — pengecekan yang persis sama seperti di dalam `navigate()` sendiri (Bagian 4). Kalau hash-nya berisi nama rute yang sudah tidak dikenal `VIEWS` (misalnya bookmark lama ke fitur yang sudah dihapus), aplikasi tidak macet — ia jatuh ke `'dashboard'`.

## 6. `refresh()` — satu-satunya mekanisme "reaktif"

Setelah menyimpan sesuatu (tugas baru, catatan baru, kebiasaan dicentang), tampilan harus ikut berubah. Tumara **tidak** memakai kerangka kerja (framework) dengan state management yang canggih — solusinya jauh lebih sederhana:

```js
// js/app.js — baris 204-206
// render ulang view rute aktif (dipanggil view setelah simpan/hapus)
refresh() {
  this.VIEWS[this.route]().render($('#view'));
},
```

Satu baris. Ambil view untuk rute yang **sedang aktif** (`this.route`), panggil `.render()` lagi. Tidak ada pembandingan "apa yang berubah", tidak ada penelusuran bagian mana dari tampilan yang perlu diperbarui — **seluruh isi `#view` dibuang dan ditulis ulang dari nol** lewat `innerHTML`.

Filosofinya: daripada membangun sistem yang melacak perubahan data secara rumit, Tumara memilih **selalu render ulang semuanya**, dan menjadikan proses render itu sendiri secepat mungkin. Pola pemakaiannya berulang di hampir setiap view:

```js
// pola yang berulang di seluruh view
await DB.add('tasks', { judul: 'PR Matematika' });
toast(tr('Tugas ditambahkan', 'Task added'));
App.refresh();
```

Simpan data → beri tahu pengguna lewat `toast()` → panggil `App.refresh()`. Tiga baris ini adalah pola paling sering diketik sepanjang Bab 08-11.

Pendekatan ini terasa "boros" — bukankah render ulang seluruh halaman untuk satu perubahan kecil itu mahal? Di banyak aplikasi web, iya. Tapi di Tumara ini murah, karena dua alasan:

1. `render()` biasanya hanya menyusun string HTML dari data yang sudah ada di memori dan menimpakannya lewat `innerHTML` — pekerjaan yang sangat cepat untuk browser modern, bahkan untuk daftar berisi puluhan item.
2. **`DB` sudah punya cache** (Bab 05). `render()` yang memanggil `DB.list(...)` tidak menembak Firestore setiap kali — ia membaca "fotokopi di meja" yang sudah tersimpan di memori. Tanpa cache itu, `App.refresh()` yang dipanggil berulang-ulang akan menghabiskan kuota baca Firestore dalam hitungan menit. Karena cache-nya sudah beres di Bab 05, pola "render ulang semuanya" ini bisa dipakai dengan santai di sini.

## 7. Uji router dengan view paling sederhana

Sebelum Bab 08 membangun `Dashboard` sungguhan (dengan kartu statistik, grafik, dan lain-lain), ada baiknya Anda melihat router **bekerja** dulu dengan sesuatu yang sangat sederhana — supaya kalau ada yang salah nanti di Bab 08, Anda sudah yakin masalahnya bukan di router.

Buat view percobaan langsung di `js/app.js`, sebelum `const App = {`:

```js
// js/app.js — view percobaan (sementara, boleh dihapus setelah Bab 08)
const TesView = {
  async render(el) {
    el.innerHTML = '<p>Halo dari view tes</p>';
  }
};
```

Perhatikan bentuknya: sebuah objek dengan satu method, `render(el)`, yang menerima elemen DOM dan mengisi `innerHTML`-nya. Persis kontrak yang dijelaskan di Bagian 4 — inilah bentuk PALING sederhana yang masih sah dipanggil oleh `navigate()`.

Daftarkan sebagai rute baru di `VIEWS` dan `TITLES`:

```js
// js/app.js — tambahkan sementara ke TITLES dan VIEWS
TITLES: {
  // ...rute lain...
  tes: [() => 'Tes Router', () => 'Halaman percobaan']
},
VIEWS: {
  // ...rute lain...
  tes: () => TesView
},
```

Lalu tambahkan satu tautan percobaan di `app.html`, misalnya di dalam `.sidebar-nav`:

```html
<a class="nav-link" data-route="tes"><ion-icon name="flask-outline"></ion-icon><span>Tes</span></a>
```

Sekarang buka aplikasi, klik "Tes" di sidebar. Kalau router sudah benar, Anda akan melihat tulisan "Halo dari view tes" muncul di `#view`, ikon "Tes" menyala aktif, judul halaman berganti jadi "Tes Router", dan alamat URL berubah jadi `...#tes`. Kalau ini semua terjadi, router Anda sudah bekerja — sisanya, mulai Bab 08, tinggal mengganti isi `render()` dengan tampilan sungguhan. Boleh hapus `TesView` dan pendaftarannya setelah Anda yakin, atau biarkan saja sebagai catatan — tak mengganggu apa pun.

## 8. Boot sequence `App.init()`

Sekarang lihat bagaimana semua ini pertama kali dinyalakan, saat `app.html` baru dibuka:

```js
// js/app.js — baris 33-47
async init() {
  this.setTheme(localStorage.getItem('tumara_theme') || 'light');
  try {
    await DB.init();
  } catch (e) {
    toast(tr('Gagal terhubung ke server. Periksa koneksi internetmu.',
             'Could not connect to the server. Please check your internet connection.'), 'error');
    return;
  }
  if (!DB.user) return this.showAuth();
  // app.html hanya untuk siswa; admin & guru diarahkan ke halamannya.
  const role = DB.user.role || 'siswa';
  if (role !== 'siswa') { location.replace(roleHome(role)); return; }
  this.afterAuth();
},
```

Urutannya penting, baca sesuai baris:

1. **`this.setTheme(...)` dipanggil PALING AWAL, sebelum `await` apa pun.** Tema (`dataset.theme`) diambil dari `localStorage` — data yang tersimpan di browser sendiri, bisa dibaca seketika tanpa menunggu jaringan. Kenapa harus paling awal? Karena mencegah **FOUC** (*Flash of Unstyled/wrong Content* — sekejap halaman tampil dengan warna atau gaya yang salah sebelum berganti ke yang benar). Kalau `setTheme` dipanggil SETELAH `await DB.init()` (yang butuh waktu, apalagi kalau jaringan lambat), pengguna yang memakai mode gelap akan melihat kedipan: sekilas layar putih terang, baru berubah gelap sepersekian detik kemudian. Dengan memanggilnya di baris pertama, tema sudah benar bahkan sebelum satu pun data dari server datang.
2. **`await DB.init()`** — ini yang membuka sesi: memeriksa apakah ada pengguna yang sedang login (lewat Firebase Auth atau sesi localStorage, tergantung mode — Bab 05), dan memuat profilnya. Dibungkus `try/catch`: kalau gagal (biasanya karena tak ada koneksi internet), aplikasi tidak membeku diam — ia menampilkan `toast` error yang jelas, lalu `return` (berhenti, tidak lanjut ke langkah berikutnya).
3. **`if (!DB.user) return this.showAuth();`** — kalau tidak ada sesi yang valid, pengguna belum login. `showAuth()` mengarahkan ke `auth.html` (halaman login/daftar dari Bab 06).
4. **`if (role !== 'siswa') { location.replace(roleHome(role)); return; }`** — ini penjaga penting: **`app.html` khusus untuk siswa.** Kalau ternyata yang login adalah guru atau admin (misalnya karena membuka tautan lama, atau sesi tersimpan dari akun lain di perangkat yang sama), `App.init()` tidak menampilkan `app.html` yang salah tempat — ia langsung mengarahkan ke halaman yang benar lewat `roleHome(role)` (`guru.html` atau `admin.html`, fungsi dari `js/roles.js` yang sudah Anda lihat di Bab 06).
5. **`this.afterAuth();`** — barulah kalau semua penjaga di atas lolos (ada sesi, dan perannya memang siswa), lanjut ke `afterAuth()`, yang memutuskan: kalau `DB.user.profileComplete` belum `true`, tampilkan `OnboardView` (dari Bab 06); kalau sudah, panggil `showApp()` — yang membuka `#appShell`, memasang seluruh nav (Bagian 10), dan memanggil `navigate()` pertama kali berdasarkan hash (Bagian 5).

## 9. Tema & bahasa lewat router

Dua pengaturan kecil di header — tombol tema dan tombol bahasa — juga melewati mekanisme yang sama sekali ini dibangun.

```js
// js/app.js — baris 210-224 (disingkat)
setTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('tumara_theme', t); // cache agar tampilan awal tidak berkedip
  // Simpan juga ke profil akun (Firestore) bila sudah login & berubah
  if (DB.user && DB.user.tema !== t) DB.updateUser({ tema: t }).catch(() => {});
  // ...perbarui ikon & label tombol tema...
},

toggleTheme() {
  this.setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
},
```

`setTheme(t)` melakukan dua penyimpanan sekaligus — **dual persistence**:

- **`localStorage.setItem(...)`** — tersimpan di browser ini saja, tapi bisa dibaca **seketika** saat aplikasi baru dibuka (Bagian 8, mencegah FOUC), bahkan sebelum `DB.init()` selesai.
- **`DB.updateUser({ tema: t })`** — tersimpan ke profil akun di Firestore, sehingga kalau siswa membuka Tumara di perangkat lain dan login dengan akun yang sama, tema pilihannya ikut terbawa.

Kenapa dua-duanya, bukan salah satu saja? Karena masing-masing menutupi kelemahan yang lain: localStorage cepat tapi terjebak di satu perangkat; Firestore ikut akun tapi butuh menunggu jaringan. Dipakai berbarengan, pengguna mendapati tampilan instan **dan** tema yang konsisten lintas perangkat.

Untuk bahasa:

```js
// js/app.js — baris 228-234
toggleLang() {
  I18N.toggle(); // sekaligus tersimpan ke localStorage + profil akun
  // Segarkan label tema & render ulang halaman aktif dalam bahasa baru
  this.setTheme(document.documentElement.dataset.theme || 'light');
  if (!$('#appShell').classList.contains('hidden')) this.navigate(this.route);
  else if (!$('#onboardScreen').classList.contains('hidden')) OnboardView.render();
},
```

`I18N.toggle()` (detail penuhnya di Bab 09) hanya menukar bahasa aktif dan menyimpannya — ia **tidak** menyentuh satu pun elemen di layar. Baris yang benar-benar mengubah teks di layar adalah `this.navigate(this.route)`: memanggil ulang `navigate()` untuk rute yang sedang aktif. Ingat Bagian 4 — `navigate()` mengambil judul dari `TITLES[route]` dengan memanggil fungsinya (`judul()`), dan setiap fungsi itu membungkus `tr(...)` yang membaca bahasa aktif SAAT dipanggil. Jadi render ulang inilah, bukan mekanisme lain, yang membuat seluruh teks di layar (judul, subjudul, dan — karena tiap view membungkus tulisannya sendiri dengan `tr()` — juga isi `#view`) langsung berganti bahasa. Anda akan melihat pola `tr()` ini di hampir setiap baris teks mulai Bab 08.

## 10. Nav dipasang SEKALI, bukan tiap render

Satu detail yang mudah terlewat tapi penting untuk dipahami: listener klik pada elemen nav dipasang **satu kali saja**, di `showApp()` — bukan setiap kali `navigate()` berjalan.

```js
// js/app.js — baris 84
$$('.nav-link, .bnav-item, .bnav-sheet-item').forEach(a => a.onclick = () => this.navigate(a.dataset.route));
```

Kenapa ini aman dilakukan sekali saja, padahal `#view` diisi ulang lewat `innerHTML` berkali-kali sepanjang sesi pengguna memakai aplikasi? Karena **elemen nav (sidebar, bottom-nav) tidak pernah ikut diganti**. Yang diganti isinya hanyalah `#view` — kotak konten di tengah. Sidebar dan bottom-nav dibangun sekali saat `app.html` dimuat, dan `App.showApp()` hanya dijalankan sekali per sesi (saat aplikasi pertama kali siap). Karena elemen `<a class="nav-link">` yang sama terus dipakai dari awal sampai akhir (tidak pernah dibuang dan dibuat ulang), listener `onclick` yang dipasang padanya juga terus menempel — tak perlu dipasang ulang.

Ini beda dengan pola yang akan sering Anda lihat di dalam `render()` sebuah view (mulai Bab 08): karena `render()` menimpa `innerHTML` setiap dipanggil, elemen tombol DI DALAM `#view` benar-benar dibuang dan dibangun ulang tiap render — jadi listener untuk tombol-tombol itu memang harus dipasang ulang di setiap pemanggilan `render()`. Aturannya sederhana: **elemen yang tak pernah diganti innerHTML-nya, listenernya dipasang sekali; elemen di dalam sesuatu yang di-render ulang, listenernya dipasang ulang tiap render.**

---

## ✅ Cek hasil

- [ ] Buka `app.html` lewat Live Server dalam kondisi sudah login sebagai siswa dan onboarding selesai (dari Bab 06). Anda harus melihat sidebar (atau bottom-nav di layar sempit), bukan layar putih kosong.
- [ ] Kalau Anda sudah menambahkan `TesView` (Bagian 7): klik "Tes" di nav, tulisan "Halo dari view tes" muncul di area konten, ikon "Tes" menyala aktif, judul di atas berganti jadi "Tes Router".
- [ ] Perhatikan alamat URL browser — setelah klik nav manapun, harus berubah jadi `...app.html#nama-rute` (mis. `#tugas`).
- [ ] **Uji bertahan dari refresh**: klik ke rute selain Beranda, lalu tekan tombol refresh browser (bukan navigasi ulang). Setelah halaman selesai dimuat ulang, Anda harus mendarat di rute yang SAMA, bukan selalu balik ke Beranda.
- [ ] **Uji tombol Back**: klik dua-tiga rute berbeda, lalu tekan tombol Back browser sekali. Anda harus KELUAR dari `app.html` (kembali ke halaman sebelumnya, mis. `auth.html` atau browser history sebelum itu) — BUKAN mundur ke rute sebelumnya di dalam app.
- [ ] Klik tombol tema (ikon bulan/matahari). Tema harus berganti seketika, **tanpa** kedipan warna sesaat sebelumnya.
- [ ] Buka DevTools → Console, ketik `App.route` → harus menunjukkan nama rute yang sedang aktif. Ketik `App.VIEWS[App.route]()` → harus mengembalikan objek view yang sedang tampil (bukan `undefined`).

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| Klik nav tak berefek sama sekali | Lupa menambahkan `data-route="..."` di `<a>` HTML, atau nama rutenya tidak cocok dengan key di `VIEWS` | Pastikan `data-route` di HTML **persis sama ejaannya** dengan key di `TITLES`/`VIEWS`. |
| Refresh selalu balik ke Beranda, walau tadinya di rute lain | Hash tidak konsisten dengan nama rute di `VIEWS` (mis. hash `#Tugas` huruf besar, sedangkan `VIEWS` mendaftarkan `tugas` huruf kecil) | Cek `this.VIEWS[route0] ? fromHash : 'dashboard'` di `showApp()` — kalau pengecekan gagal, otomatis jatuh ke dashboard. Samakan ejaan/huruf kecil-besar. |
| Render tumpang tindih dengan data lama, atau isi lama & baru bercampur | Lupa bahwa `render()` mengganti (`innerHTML =`) SELURUH isi `#view`, bukan menambah (`+=`) ke isi lama | Pastikan setiap `render(el)` memakai `el.innerHTML = ...` (tanda sama dengan), bukan `+=`. |
| Tombol tema berkedip sesaat sebelum jadi warna yang benar (FOUC) | `setTheme()` dipanggil SETELAH `await DB.init()`, bukan sebelumnya | Pindahkan `this.setTheme(...)` ke baris pertama `init()`, sebelum `await` apa pun. |
| Setelah ganti bahasa, sebagian teks masih bahasa lama | View tersebut menaruh teksnya di variabel biasa (bukan dibungkus `tr()`), atau `App.navigate(this.route)` tidak dipanggil setelah `I18N.toggle()` | Pastikan tiap teks memakai `tr('Indonesia', 'English')`, dan `toggleLang()` memanggil `this.navigate(this.route)` di akhir. |
| Klik dari sidebar berhasil, tapi dari bottom-nav (mobile) tidak, atau sebaliknya | Listener hanya dipasang pada salah satu selector, mis. lupa menambahkan `.bnav-sheet-item` ke daftar `$$('.nav-link, .bnav-item, .bnav-sheet-item')` | Pastikan SEMUA jenis elemen nav (sidebar, bottom-nav, menu "lainnya") ikut dalam satu `forEach` yang sama di `showApp()`. |
| Tombol tengah bottom-nav (menu "lainnya") tidak membuka/menutup | `#bnavMore` tidak ditemukan (elemen belum ada di HTML) atau listener klik dokumen (untuk menutup saat klik di luar) dipasang berulang | Pastikan `id="bnavMore"` ada persis, dan cek `this._moreSheetBound` mencegah listener dokumen terpasang dua kali. |

## 🧪 Latihan

1. **Tambah rute baru `tes2`.** Buat objek view sederhana lain (boleh menampilkan waktu sekarang, atau daftar rute yang terdaftar di `VIEWS`), daftarkan di `TITLES` dan `VIEWS`, tambahkan tautannya di sidebar. Uji: klik nav baru, pastikan berpindah dengan benar dan hash ikut berubah.

2. **Coba hapus pengaman `if (!this.VIEWS[route])`.** Sementara (di komputer Anda sendiri, jangan di produksi), hapus baris pengecekan itu di `navigate()`, lalu ketik `App.navigate('rute-ngasal')` di Console. Amati error apa yang muncul di DevTools. Kembalikan baris itu setelah Anda paham kenapa ia dibutuhkan.

3. ⭐ **Jelaskan dengan kata sendiri kenapa `view.render()` TIDAK di-`await` di dalam `navigate()`.** Petunjuk untuk memandu pemikiran Anda: hampir semua `render()` di Tumara adalah fungsi `async` karena memanggil `DB.list(...)` yang butuh menunggu jaringan/cache. Kalau `navigate()` menulis `await view.render($('#view'))`, apa yang terjadi pada baris-baris SETELAHNYA (mis. `window.scrollTo`) — apakah tetap berjalan seketika, atau ikut menunggu? Lalu, apakah hash dan kelas `.active` pada nav tetap benar SEKETIKA pengguna klik, walau isi `#view` baru muncul sepersekian detik kemudian? Tuliskan satu-dua paragraf. Kalau Anda sudah bisa jelaskan ini ke rekan guru, Anda sudah memahami bagian tersulit dari router ini.

## 📌 Ringkasan

- `app.html` adalah **satu bingkai**, bukan banyak halaman: sidebar & bottom-nav dibangun sekali dan tak pernah dibongkar; yang berganti hanya isi `<div id="view">`.
- **`data-route`** di elemen nav adalah "nama channel" yang dibaca router untuk tahu ke mana harus pindah.
- `TITLES` dan `VIEWS` adalah **daftar rute resmi**. `VIEWS` sengaja berisi fungsi (thunk), bukan objek langsung, supaya referensinya ditunda sampai dipakai dan sekaligus jadi cara memeriksa "apakah rute ini valid".
- **`navigate(routeSpec)`** adalah jantung router: validasi rute, perbarui hash, nyalakan `.active` di nav, set judul dari `TITLES`, lalu panggil `view.render($('#view'))` tanpa `await`.
- Hash memakai `history.replaceState` (bukan `pushState`) — supaya tombol Back browser KELUAR dari aplikasi, bukan mundur antar-tab internal. Hash hanya dibaca satu kali saat boot, untuk bertahan dari refresh.
- **`App.refresh()`** adalah satu-satunya mekanisme "reaktif": render ulang seluruh `#view` dari nol. Terasa boros tapi murah, karena `DB` sudah punya cache (Bab 05).
- Listener nav dipasang **sekali** di `showApp()`, karena elemen nav tak pernah ikut diganti `innerHTML` — beda dengan elemen di dalam `#view` yang harus dipasangi ulang listener tiap kali `render()` dipanggil.

**Berikutnya:** [Bab 08 — Membuat View Pertama](08-membuat-view-pertama.md)
