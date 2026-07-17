# Bab 02 — Fondasi Web & Struktur Proyek

> **Tujuan bab ini:** setelah bab ini Anda bisa membaca sepotong HTML, CSS, dan JavaScript tanpa panik, DAN paham rencana besar Tumara — kenapa aplikasinya dibagi jadi beberapa halaman, kenapa satu file kode = satu "kotak" global, dan kenapa dibangun tanpa framework.

| | |
|---|---|
| **Perkiraan waktu** | ~60 menit |
| **Sebelum ini** | [Bab 01 — Pengenalan & Persiapan](01-pengenalan-dan-persiapan.md) |
| **Anda butuh** | Editor kode (VS Code), browser (Chrome/Edge/Firefox), dan folder proyek dari Bab 01 |

## Apa yang kita bangun di bab ini

Bab ini beda dari bab-bab lain: kita **belum** membangun bagian Tumara yang sungguhan. Kita menyiapkan bekalnya dulu — seperti mengenal alat sebelum mulai memasak, supaya saat resepnya datang Anda tidak bingung.

Kita akan membuat satu file latihan (`latihan.html`) yang bisa Anda buka di browser dan otak-atik: HTML, CSS, dan sedikit JavaScript — termasuk satu tombol yang mengubah tulisan di layar saat diklik. Sesudah itu kita bedah "denah" Tumara: halaman apa saja yang ada, folder mana isinya apa, dan bagaimana file JavaScript-nya saling mengenal padahal tidak pernah saling meng-`import`.

---

## 1. HTML secukupnya — kerangka halaman

HTML adalah bahasa untuk **menandai** isi halaman: mana yang judul, mana paragraf, mana tombol. Cara kerjanya dengan **tag** — penanda yang diapit tanda kurung siku, biasanya berpasangan: tag pembuka dan tag penutup.

```html
<!-- latihan.html -->
<h1>Selamat datang di Tumara</h1>
<p>Ini paragraf biasa.</p>
<button>Klik saya</button>
```

- `<h1>...</h1>` — **heading** (judul besar). Ada `<h1>` sampai `<h6>`, makin besar angkanya makin kecil judulnya.
- `<p>...</p>` — **paragraf** teks.
- `<button>...</button>` — tombol.

Tag penutup sama dengan tag pembuka, hanya ditambah garis miring: `</p>`. Teks di antara keduanya adalah isi elemen. Satu tag lengkap (pembuka + isi + penutup) disebut **elemen**.

### Atribut: keterangan tambahan pada elemen

Di dalam tag pembuka, Anda bisa menaruh **atribut** — pasangan `nama="nilai"` yang memberi keterangan ekstra. Misalnya kotak isian teks:

```html
<!-- latihan.html -->
<input type="text" placeholder="Tulis nama Anda">
```

`type` dan `placeholder` adalah atribut. (`<input>` termasuk tag yang tidak butuh penutup — ia berdiri sendiri.)

### Nesting: elemen di dalam elemen

Elemen bisa disarangkan (**nesting**) — dimasukkan ke dalam elemen lain. Yang paling sering dipakai untuk mengelompokkan adalah `<div>`, semacam "kotak kosong" pembungkus:

```html
<!-- latihan.html -->
<div>
  <h2>Kartu Siswa</h2>
  <p>Budi Santoso — Kelas 7A</p>
</div>
```

Aturannya: elemen yang dibuka terakhir harus ditutup lebih dulu (seperti tanda kurung dalam matematika). Rapikan dengan **indentasi** (menjorok ke dalam) supaya susunannya terlihat.

### `id` dan `class`: dua cara memberi nama elemen

Dua atribut ini penting sekali karena dipakai di seluruh Tumara:

```html
<!-- latihan.html -->
<h1 id="pageTitle" class="topbar-title">Beranda</h1>
```

- **`class`** — label yang boleh dipakai banyak elemen sekaligus. Gunanya untuk **CSS**: "semua elemen ber-class `topbar-title` berwarna hijau". Satu elemen boleh punya beberapa class, dipisah spasi.
- **`id`** — nama unik, hanya boleh dipakai **satu** elemen di seluruh halaman. Gunanya untuk **JavaScript**: "temukan elemen ber-id `pageTitle`, lalu ganti tulisannya".

Aturan praktisnya: **`class` untuk gaya (CSS), `id` untuk dicari oleh kode (JS).** Lihat kembali `app.html` dari repo — Anda akan menemukan `<h1 class="topbar-title" id="pageTitle">` persis seperti contoh di atas. `class` menatanya, `id` membuatnya bisa diubah isinya oleh JavaScript.

### `data-*`: menempelkan catatan pada elemen

Ada satu keluarga atribut yang jadi tulang punggung Tumara: **`data-*`**. Atribut apa pun yang diawali `data-` adalah "tempat catatan bebas" yang Anda tempelkan pada elemen — tak memengaruhi tampilan, hanya menyimpan informasi yang nanti dibaca JavaScript.

Contoh nyata dari `app.html`:

```html
<!-- app.html — menu samping -->
<a class="nav-link" data-route="dashboard">... Beranda</a>
<a class="nav-link" data-route="tugas">... Tugas</a>
```

`data-route="dashboard"` berarti "kalau menu ini diklik, tuju halaman bernama dashboard". Tampilan `<a>` sama saja; catatan `data-route` itulah yang dibaca kode router (Bab 07) untuk tahu ke mana harus pindah.

Tumara memakai pola ini di banyak tempat: `data-route` (menu), `data-tab` (tab), `data-en` (teks versi Inggris). Ingat idenya: **`data-*` = tempel catatan pada elemen, dibaca nanti oleh JavaScript.**

---

## 2. CSS secukupnya — mengatur tampilan

Kalau HTML menentukan **apa** isinya, CSS menentukan **bagaimana rupanya** — warna, ukuran, jarak, tata letak. Satu aturan CSS punya dua bagian: **selector** (elemen mana yang disasar) dan **deklarasi** (apa yang diubah).

```css
/* latihan.html — di dalam <style> */
p {
  color: #333333;      /* warna teks */
  font-size: 16px;     /* ukuran huruf */
}
```

Di sini `p` adalah selector — menyasar **semua** paragraf. Di dalam kurung kurawal `{ }` ada deklarasi berupa pasangan `properti: nilai;` (jangan lupa titik koma).

### Tiga selector dasar

```css
/* latihan.html */
p            { color: gray; }        /* semua tag <p>            */
.topbar-title { color: green; }      /* semua yang class-nya topbar-title */
#pageTitle   { font-weight: bold; }  /* satu elemen ber-id pageTitle       */
```

- **Nama tag** langsung (`p`, `button`) → menyasar berdasarkan jenis tag.
- **`.namaclass`** (pakai titik) → menyasar berdasarkan `class`.
- **`#namaid`** (pakai pagar) → menyasar satu elemen berdasarkan `id`.

Perhatikan penghubungnya: atribut `class="topbar-title"` di HTML disasar dengan `.topbar-title` di CSS. Inilah kenapa tadi disebut "class untuk gaya".

### Properti dasar yang paling sering dipakai

| Properti | Mengatur | Contoh |
|---|---|---|
| `color` | warna teks | `color: #059669;` |
| `background` | warna latar | `background: white;` |
| `font-size` | ukuran huruf | `font-size: 18px;` |
| `padding` | jarak dalam (isi ke tepi) | `padding: 16px;` |
| `margin` | jarak luar (elemen ke tetangganya) | `margin: 8px;` |

Warna sering ditulis sebagai kode heksadesimal seperti `#059669` (hijau khas Tumara) — jangan hafalkan angkanya, cukup tahu itu "sebuah warna".

### CSS variable: satu tempat untuk warna tema

Bayangkan warna hijau Tumara dipakai di 50 tempat. Kalau suatu hari ingin diganti, apakah harus mengedit 50 baris? Tidak. CSS punya **variable** (variabel) — Anda simpan nilai sekali, lalu rujuk di mana-mana:

```css
/* latihan.html */
:root {
  --brand: #059669;   /* definisikan sekali */
}

button {
  background: var(--brand);   /* rujuk di sini      */
  color: white;
}
.topbar-title {
  color: var(--brand);        /* dan di sini juga   */
}
```

- `:root` adalah "seluruh dokumen" — tempat lazim mendefinisikan variabel global.
- `--brand: #059669;` mendefinisikan variabel bernama `--brand` (nama variabel CSS selalu diawali dua tanda minus).
- `var(--brand)` memakai nilainya. Ganti satu baris `--brand`, maka semua yang memakainya ikut berubah.

Inilah cara Tumara punya **tema terang dan gelap**: satu set variabel warna untuk terang, satu set lagi untuk gelap, dan menekan tombol tema hanya menukar set-nya. Kita bangun sungguhan di Bab 03; untuk sekarang cukup paham idenya — **variabel CSS = satu sumber warna yang dirujuk banyak tempat.**

### Sekilas flexbox: menata elemen berdampingan

Secara default elemen menumpuk ke bawah. Untuk menatanya berjajar (misalnya ikon + tulisan dalam satu baris), pola paling umum adalah **flexbox**:

```css
/* latihan.html */
.baris {
  display: flex;        /* aktifkan mode flex        */
  gap: 8px;             /* jarak antar-anak          */
  align-items: center;  /* sejajarkan di tengah vertikal */
}
```

```html
<div class="baris">
  <span>🔔</span>
  <span>Ada 3 tugas baru</span>
</div>
```

`display: flex` membuat anak-anak elemen itu berjajar mendatar. Anda akan melihat pola ini di mana-mana di Tumara — topbar, kartu, tombol dengan ikon. Cukup kenali dulu; nanti sering muncul.

---

## 3. JavaScript secukupnya — membuat halaman hidup

HTML dan CSS itu diam. **JavaScript** (JS) yang membuat halaman bereaksi: menghitung, menyimpan, dan mengubah isi layar saat pengguna menekan sesuatu. Ini bagian terpanjang karena paling penting.

### Variabel: wadah bernama untuk nilai

```js
// latihan.html — di dalam <script>
const namaSekolah = "SMP Tumara";   // tidak akan diganti
let jumlahSiswa = 30;               // boleh diganti nanti
jumlahSiswa = 31;
```

- **`const`** — wadah yang isinya tetap (constant). Pakai ini secara default.
- **`let`** — wadah yang isinya boleh berubah. Pakai hanya kalau memang perlu diganti.

Aturan praktis di Tumara: **pakai `const` kecuali Anda tahu nilainya akan berubah.** Ini mengurangi kesalahan "kok nilainya berubah sendiri".

### Tipe nilai: jenis-jenis isi wadah

```js
// latihan.html
const nama    = "Budi";        // teks (string) — diapit tanda kutip
const umur    = 13;            // angka (number)
const lulus   = true;          // benar/salah (boolean): true atau false
const nilai   = [80, 90, 75];  // array — daftar berurutan, seperti daftar hadir
const siswa   = {              // object — kumpulan pasangan kunci:nilai,
  nama: "Budi",                //   seperti satu baris data siswa
  kelas: "7A",
  nis: "12345"
};
```

Dua yang paling penting untuk Tumara:

- **array** (daftar berurutan, seperti daftar hadir kelas): ditulis dengan kurung siku `[ ]`. Isinya diakses lewat nomor urut mulai dari **0**: `nilai[0]` adalah `80`.
- **object** (kumpulan pasangan **kunci:nilai**, seperti satu berkas siswa): ditulis dengan kurung kurawal `{ }`. Isinya diakses lewat nama kunci: `siswa.nama` adalah `"Budi"`, `siswa.nis` adalah `"12345"`.

Hampir seluruh data Tumara berbentuk begini: **array of object** — daftar berisi banyak berkas. Misalnya "daftar tugas" adalah array, dan tiap tugas di dalamnya adalah object `{ judul, mapel, tenggat }`.

### Function: resep yang bisa dipanggil ulang

**Function** (fungsi) adalah sepotong instruksi yang diberi nama, supaya bisa dipakai berulang tanpa menulis ulang — seperti resep masakan.

```js
// latihan.html
function sapa(nama) {
  return "Halo, " + nama + "!";
}

sapa("Budi");   // menghasilkan "Halo, Budi!"
```

- `nama` di dalam kurung adalah **parameter** — bahan yang diberikan saat fungsi dipanggil.
- `return` menentukan hasil yang dikembalikan fungsi.

Contoh nyata dari repo — helper dwibahasa `tr` yang memilih teks Indonesia atau Inggris:

```js
// js/i18n.js
function tr(id, en) { return I18N.lang === 'en' ? (en ?? id) : id; }
```

Fungsi ini menerima dua teks (versi Indonesia dan Inggris) lalu mengembalikan yang sesuai bahasa aktif. Anda akan memanggil `tr('Simpan', 'Save')` ribuan kali di seluruh Tumara. Tidak perlu paham penuh sekarang — cukup lihat bentuknya: **fungsi = terima bahan, kembalikan hasil.**

### `if`: mengambil keputusan

```js
// latihan.html
const nilai = 75;
if (nilai >= 75) console.log("Tuntas");   // dijalankan kalau syarat benar
else            console.log("Belum tuntas");
```

`if` menjalankan blok pertama bila syarat dalam kurung benar, `else` bila salah. `console.log(...)` mencetak pesan ke **Console** — panel di DevTools browser (buka dengan F12) tempat programmer mengintip apa yang terjadi.

### Perulangan pada array: `.forEach`, `.map`, `.filter`

Kalau punya daftar siswa dan ingin melakukan sesuatu pada tiap orang, Anda tidak menulisnya satu per satu — Anda **memutari** (loop) daftarnya. Tiga cara yang dipakai Tumara:

```js
// latihan.html
const siswa = ["Budi", "Ani", "Citra"];

// .forEach — lakukan sesuatu untuk TIAP item (tidak menghasilkan daftar baru)
siswa.forEach(nama => console.log("Hadir: " + nama));

// .map — ubah TIAP item, hasilkan daftar BARU seukuran
const sapaan = siswa.map(nama => "Halo " + nama);
// → ["Halo Budi", "Halo Ani", "Halo Citra"]

// .filter — saring, hasilkan daftar baru berisi yang LOLOS syarat
const nilai = [80, 60, 90, 55];
const tuntas = nilai.filter(n => n >= 75);
// → [80, 90]
```

Analogi guru:
- `.forEach` = **memanggil satu per satu** nama di daftar hadir (melakukan aksi, tak membuat daftar baru).
- `.map` = **menyalin ulang** daftar dengan setiap nama diubah bentuknya (misalnya semua diberi awalan).
- `.filter` = **menyeleksi** — menyalin hanya nama yang memenuhi syarat (misalnya nilai ≥ 75).

Bagian `nama => ...` adalah **arrow function**, cara ringkas menulis fungsi kecil: "untuk tiap `nama`, kerjakan yang di kanan panah". Tumara memakai ketiganya terus-menerus untuk mengubah data menjadi tampilan.

### Yang paling krusial: mengubah halaman dari JavaScript

Inilah inti kenapa JS ada. Kita cari sebuah elemen, lalu ubah isinya.

```html
<!-- latihan.html -->
<h1 id="judul">Belum diklik</h1>
<button id="tombol">Klik saya</button>

<script>
  const judul = document.querySelector('#judul');   // cari elemen ber-id judul
  const tombol = document.querySelector('#tombol');

  tombol.onclick = function () {                     // saat tombol diklik...
    judul.textContent = "Sudah diklik! 🎉";          // ...ganti tulisannya
  };
</script>
```

Coba sungguhan: simpan sebagai `latihan.html`, buka di browser, klik tombolnya. Tulisan judul berubah. Selamat — Anda baru saja membuat halaman **interaktif**.

Tiga hal yang baru saja terjadi, dan ketiganya dipakai di seluruh Tumara:

1. **`document.querySelector('#judul')`** — mencari satu elemen di halaman. Argumennya memakai gaya selector CSS yang sama: `#judul` untuk id, `.class` untuk class. Inilah alasan tadi kita bilang "id dipakai JS untuk menemukan satu elemen".
2. **`element.textContent = "..."`** — mengganti **teks** di dalam elemen. Ada juga `element.innerHTML = "..."` yang mengganti isi dengan **HTML** (bisa berisi tag). Tumara banyak memakai `innerHTML` untuk merender kartu, daftar, dan form.
3. **`element.onclick = function () { ... }`** — memasang aksi yang dijalankan saat elemen diklik. "Kalau tombol ini diklik, jalankan resep ini."

Tumara punya versi singkat dari `querySelector`. Buka `js/utils.js`, dua baris paling atas:

```js
// js/utils.js
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
```

- `$('#judul')` = `document.querySelector('#judul')` — cari **satu** elemen.
- `$$('.nav-link')` = cari **semua** elemen yang cocok, kembalikan sebagai array.

Kenapa dibuat? Karena `document.querySelector` diketik ratusan kali; `$` jauh lebih pendek. Ini fungsi buatan sendiri, bukan bawaan JavaScript — di Bab 05 kita menuliskannya. Untuk sekarang cukup tahu: **kalau Anda lihat `$(...)` di kode Tumara, itu artinya "cari elemen".**

### Template literal: cara Tumara merender HTML

Ini teknik yang WAJIB Anda kenal, karena **seluruh** Tumara membuat tampilan dengan cara ini. Alih-alih menyambung teks pakai tanda `+`, JS punya **template literal**: teks yang diapit tanda **backtick** ` `` ` (bukan petik biasa), dan bisa menyisipkan nilai dengan `${...}`.

```js
// latihan.html
const nama = "Budi", kelas = "7A";

const a = "Siswa " + nama + " dari kelas " + kelas;   // cara lama, ribet
const b = `Siswa ${nama} dari kelas ${kelas}`;        // template literal, rapi
// keduanya → "Siswa Budi dari kelas 7A"
```

Kekuatan sesungguhnya: backtick boleh **beberapa baris**, jadi Anda bisa menulis potongan HTML utuh dan menyisipkan data ke dalamnya:

```js
// latihan.html
const siswa = { nama: "Budi", kelas: "7A" };

const kartu = `
  <div class="card">
    <h2>${siswa.nama}</h2>
    <p>Kelas ${siswa.kelas}</p>
  </div>
`;

document.querySelector('#view').innerHTML = kartu;   // tampilkan di halaman
```

Baca sekali lagi pelan-pelan: kita menulis HTML sebagai teks, menyisipkan `${siswa.nama}` dan `${siswa.kelas}`, lalu memasukkannya ke halaman lewat `.innerHTML`. **Begitulah cara setiap layar Tumara dibuat** — data + template literal → HTML → dipasang ke `#view`. Kalau Anda paham blok ini, Anda paham 80% cara Tumara menggambar dirinya.

> ⚠️ **Jujur soal ini:** menaruh teks dari pengguna langsung ke `innerHTML` bisa berbahaya (teks jahat bisa jadi tag aktif). Itu sebabnya `js/utils.js` punya fungsi `esc()` yang "menjinakkan" teks sebelum disisipkan. Kita bahas ini saat merender data pengguna di Bab 08. Ingat namanya dulu: `esc()`.

---

## 4. `async`/`await` sekilas — menunggu hal yang butuh waktu

Sebagian pekerjaan tidak selesai seketika. Mengambil data siswa dari internet (Firebase) butuh waktu — mungkin setengah detik, mungkin lebih kalau sinyal lemah. JavaScript tidak mau berhenti total menunggu; ia lanjut mengerjakan hal lain. Tapi sering kali kita memang **butuh** hasilnya dulu sebelum lanjut. Untuk itu ada `async` dan `await`.

```js
// contoh gambaran (bukan dari repo)
async function tampilkanSiswa() {
  const data = await DB.getSiswa();   // TUNGGU sampai data datang...
  console.log(data);                  // ...baru jalankan baris ini
}
```

Bacanya begini: `await` artinya **"tunggu sampai selesai, baru lanjut"**. Fungsi yang di dalamnya memakai `await` harus ditandai `async` di depannya. Analogi: Anda menitip fotokopi di koperasi (`await`) — Anda menunggu sampai lembarnya jadi sebelum kembali ke kelas membawa hasilnya.

Itu saja untuk sekarang. Kita belum menyentuh internet sampai Bab 04. Cukup kenali bentuknya: **kalau ada `await`, berarti "ini butuh waktu, tunggu dulu".**

---

## 5. Bagaimana file JS saling kenal tanpa `import`

Sekarang bagian yang membedakan Tumara dari kebanyakan tutorial modern — dan ini **inti arsitekturnya**, jadi pelan-pelan.

Di banyak proyek besar, setiap file JavaScript "mengimpor" file lain dengan perintah `import`. Tumara **tidak** begitu. Aturannya jauh lebih sederhana:

> **Setiap file JS mendefinisikan satu objek global, dan urutan tag `<script>` di HTML menentukan urutan pemuatannya.**

Perhatikan pola tiap file: ia membuat **satu** wadah global lalu mengisinya. Contoh dari repo:

```js
// js/i18n.js
const I18N = {
  lang: /* ... */,
  set(lang) { /* ... */ },
  toggle() { /* ... */ }
};
```

```js
// js/utils.js
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
```

Begitu sebuah file dimuat browser, wadahnya (`I18N`, `$`, nanti `DB`, `App`, dst.) tersedia untuk **semua** kode yang dimuat **setelahnya**. Tidak perlu `import` — mereka berada di ruang global yang sama, seperti nama-nama yang ditulis di papan tulis kelas: siapa pun yang masuk setelah tulisan itu ada bisa membacanya.

### Urutan itu penting — dan urutannya adalah urutan ketergantungan

Kalau file B memakai sesuatu dari file A, maka A **harus** dimuat lebih dulu. Kalau tidak, saat B dijalankan, A belum ada, dan aplikasi error. Inilah kenapa urutan `<script>` di bagian bawah `app.html` bukan sembarangan:

```html
<!-- app.html — urutan pemuatan = urutan ketergantungan -->
<script src="js/firebase-config.js"></script>
<script src="js/i18n.js"></script>
<script src="js/utils.js"></script>
<script src="js/supabase-storage.js"></script>
<script src="js/calc.js"></script>
<script src="js/db.js"></script>
<script src="js/roles.js"></script>
<script src="js/views/auth.js"></script>
<script src="js/views/dashboard.js"></script>
<!-- ...view-view lain... -->
<script src="js/app.js"></script>
```

Bacalah dari atas ke bawah sebagai rantai ketergantungan:

1. **`firebase-config.js`** — pengaturan paling dasar (kunci proyek, mode online/offline). Semua bergantung padanya, jadi paling atas.
2. **`i18n.js`, `utils.js`** — alat serbaguna (`tr`, `$`, `esc`) yang dipakai hampir semua file lain.
3. **`db.js`** — lapisan data. Memakai config di atasnya, dipakai semua view di bawahnya.
4. **`roles.js`** — menentukan peran (admin/guru/siswa), memakai `db.js`.
5. **`views/*.js`** — layar-layar aplikasi; tiap view memakai `$`, `tr`, `DB` dari atasnya.
6. **`app.js`** — **paling akhir**: ia sang sutradara yang merangkai semua yang sudah dimuat, jadi butuh semuanya sudah ada.

Analogi: Anda menyusun buku di rak dengan aturan "buku yang dirujuk harus ada di rak sebelum buku yang merujuknya". `app.js` merujuk hampir semua buku, jadi terakhir ditaruh; `firebase-config.js` tidak merujuk siapa-siapa, jadi pertama.

> ⚠️ **Jujur soal ini:** cara ini sederhana dan tanpa alat tambahan, tapi rapuh terhadap urutan. Kalau suatu saat Anda menaruh `<script src="js/app.js">` di atas `db.js`, aplikasi akan error "DB is not defined" — bukan karena kodenya salah, tapi karena urutannya salah. Kalau menemui error "X is not defined", periksa dulu: apakah file yang mendefinisikan X dimuat **sebelum** file yang memakainya?

---

## 6. Rencana besar Tumara — multi-halaman, satu halaman per peran

Sekarang kita zoom-out ke seluruh aplikasi. Tumara bukan satu file HTML raksasa, melainkan **beberapa halaman terpisah**, tiap halaman untuk satu peran atau satu tujuan:

| Halaman | Untuk siapa | Isi |
|---|---|---|
| `index.html` | umum (tanpa login) | halaman depan / profil aplikasi |
| `auth.html` | umum | masuk & daftar |
| `app.html` | **siswa** | shell aplikasi siswa (view dirender JS) |
| `guru.html` | **guru** | portal guru (kelas, absensi, nilai, jurnal) |
| `admin.html` | **admin** | panel admin (akun & data kelas) |

Alurnya (dari `README.md`):

```
index.html ──"Masuk/Daftar"──▶ auth.html
auth.html  → login? → arahkan sesuai peran:
             admin → admin.html · guru → guru.html · siswa → app.html
```

### Kenapa multi-halaman, bukan satu aplikasi raksasa?

Anda mungkin bertanya: bukankah lebih modern membuat satu halaman yang berganti-ganti isi (disebut **SPA** — *Single Page Application*)? Tumara sengaja tidak begitu untuk pemisahan ini:

- **Tiap peran memuat kodenya sendiri saja.** Siswa membuka `app.html` yang hanya memuat script siswa. Guru membuka `guru.html` yang memuat script guru. **Guru tak pernah mengunduh kode siswa, dan sebaliknya** — lebih ringan, dan lebih rapi memikirkannya.
- **Lebih aman dipikirkan.** Kode admin (buat/hapus akun) tidak ikut termuat di HP siswa sama sekali. (Ini bukan pengganti aturan keamanan sungguhan — itu ada di Bab 12 — tapi memisahkan file membuat batasnya jelas.)
- **Lebih sederhana untuk pemula.** Tiap halaman berdiri sendiri: satu dokumen HTML + kumpulan script-nya. Anda bisa memahami `app.html` tanpa harus memahami `admin.html` lebih dulu.

Menariknya, di **dalam** satu halaman peran (misalnya `app.html`), Tumara justru berperilaku seperti SPA kecil: halamannya tidak pernah pindah dokumen, hanya isi `<div id="view">` yang diganti-ganti oleh JavaScript saat menu diklik. Jadi Tumara adalah **beberapa SPA kecil**, satu per peran — bukan satu SPA besar untuk semua.

### Struktur folder

Semua file tertata dalam folder yang jelas isinya (dari `README.md`):

```
Tumara/
├── index.html            Halaman depan
├── auth.html             Masuk / daftar
├── app.html              Shell aplikasi siswa
├── guru.html             Portal guru
├── admin.html            Panel admin
├── css/
│   ├── index.css         Gaya halaman depan
│   └── style.css         Sistem desain aplikasi (tema terang/gelap, kartu, form)
├── js/
│   ├── firebase-config.js  Pengaturan proyek + mode online/offline
│   ├── db.js               Lapisan data (satu pintu ke seluruh data)
│   ├── utils.js            Helper: DOM ($), format, toast, modal
│   ├── i18n.js             Dwibahasa ID/EN (tr)
│   ├── roles.js            Peran & penjaga halaman
│   ├── app.js              Router aplikasi siswa
│   └── views/              satu file per layar: dashboard, productivity,
│                           finance, ibadah, profile, auth, teacher, admin
└── assets/                 logo + ikon
```

Pola pentingnya:
- **`css/`** — semua tampilan.
- **`js/`** — semua logika. File "pondasi" (config, db, utils, i18n, roles) langsung di `js/`.
- **`js/views/`** — satu file per layar. Ini pola yang akan Anda ulang terus: mau menambah fitur? Buat satu file view baru di sini, lalu daftarkan `<script src>`-nya di HTML pada urutan yang benar.
- **`assets/`** — gambar & ikon.

---

## 7. Kenapa tanpa framework

Anda mungkin sudah dengar nama-nama seperti React atau Vue — kerangka kerja (**framework**) populer untuk membuat aplikasi web. Tumara sengaja **tidak** memakainya, dan itu keputusan sadar, bukan karena ketinggalan zaman. Untungnya nyata: tidak ada yang perlu di-*install* untuk menjalankan aplikasinya (cukup file `.html`, `.css`, `.js` biasa), tidak ada langkah *build* yang bisa gagal, halaman terbuka cepat, dan — untuk pembaca modul ini yang penting — **setiap baris kodenya bisa Anda baca dan pahami langsung** tanpa lapisan sihir di antaranya. Untuk aplikasi satu sekolah, itu justru pas. Kejujurannya: kalau nanti tim pengembangnya membesar dan fiturnya berlipat, framework bisa membantu merapikan bagian yang berulang — tapi itu urusan nanti, dan Anda akan jauh lebih siap memilihnya justru setelah paham cara kerja dasarnya di modul ini.

---

## ✅ Cek hasil

Buat file `latihan.html` di folder proyek Anda, isi dengan kerangka berikut, lalu buka di browser:

```html
<!-- latihan.html -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <style>
    :root { --brand: #059669; }
    button { background: var(--brand); color: white; padding: 8px 16px; }
    #judul { color: var(--brand); }
  </style>
</head>
<body>
  <h1 id="judul">Belum diklik</h1>
  <button id="tombol">Klik saya</button>
  <script>
    const judul = document.querySelector('#judul');
    document.querySelector('#tombol').onclick = () => {
      judul.textContent = "Sudah diklik!";
    };
  </script>
</body>
</html>
```

- [ ] Halaman menampilkan judul hijau dan tombol hijau. (Kalau hijau muncul, berarti CSS variable `--brand` bekerja.)
- [ ] Menekan tombol mengubah tulisan judul jadi "Sudah diklik!". (Berarti `querySelector`, `onclick`, dan `textContent` bekerja.)
- [ ] Buka DevTools (F12) → tab **Console** → ketik `document.querySelector('#judul').textContent` lalu Enter. Console menampilkan teks judul saat ini. (Berarti Anda bisa mengintip halaman lewat Console — keahlian yang dipakai di sepanjang modul.)
- [ ] Anda bisa menyebutkan, dari ingatan: kenapa `app.js` dimuat paling akhir di `app.html`? (Karena ia memakai semua yang di atasnya.)

---

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| Tombol diklik, tak terjadi apa-apa | `<script>` ada di `<head>`, jalan sebelum tombolnya ada di halaman | Taruh `<script>` di akhir `<body>`, setelah elemen yang dirujuknya |
| Console: `Cannot read properties of null` | `querySelector` tak menemukan elemen (salah ketik id, atau elemen belum ada) | Cek ejaan id; pastikan `#` di selector; pastikan script jalan setelah elemen dibuat |
| Warna hijau tak muncul | `--brand` didefinisikan di tempat yang tak terjangkau, atau salah tulis `var(--brand)` | Definisikan di `:root`; pastikan penulisan dua minus `--` dan `var(...)` benar |
| (nanti di Tumara) Console: `X is not defined` | File yang mendefinisikan `X` dimuat **setelah** file yang memakainya | Periksa urutan `<script src>` — yang didefinisikan harus di atas yang memakai |
| Teks di `${...}` muncul apa adanya, bukan nilainya | Anda memakai petik biasa `'...'`, bukan backtick `` `...` `` | Ganti tanda kutip pembungkus dengan backtick |

---

## 🧪 Latihan

1. **Tambah tombol reset.** Di `latihan.html`, tambahkan tombol kedua bertuliskan "Reset" yang mengembalikan judul ke "Belum diklik". (Petunjuk: cari tombolnya dengan `querySelector`, pasang `onclick`, set `textContent`.)

2. **Render dari data.** Buat sebuah array of object berisi 3 siswa (`{ nama, kelas }`), lalu pakai `.map` dan template literal untuk menampilkan tiga kartu `<div>` di halaman lewat `.innerHTML`. Ini latihan langsung dari pola inti Tumara.

3. ⭐ **Baca urutan sungguhan.** Buka `app.html` di repo, temukan blok `<script src>` di dekat akhir `<body>`. Tulis di kertas: kalau `js/views/dashboard.js` memakai fungsi `tr()` dari `js/i18n.js`, apakah urutannya sudah benar? Kenapa? Lalu cari satu file yang dimuat setelah `db.js` dan tebak: kenapa ia butuh `db.js` lebih dulu?

---

## 📌 Ringkasan

- **HTML** menandai isi (tag, elemen, atribut, nesting). `class` untuk CSS, `id` untuk dicari JS, `data-*` untuk menempel catatan yang dibaca JS (Tumara pakai `data-route` dkk. di mana-mana).
- **CSS** mengatur rupa lewat selector (`.class`, `#id`, `tag`). **CSS variable** (`--brand`, `var(--brand)`) memusatkan warna — dasar tema terang/gelap Tumara. **Flexbox** menata elemen berjajar.
- **JavaScript** menghidupkan halaman: `const`/`let`, tipe (string/number/boolean/array/object), function, `if`, dan perulangan array `.forEach`/`.map`/`.filter`. Yang krusial: `querySelector` (`$` di Tumara), `.textContent`/`.innerHTML`, `.onclick`, dan **template literal** dengan backtick + `${...}` — cara seluruh Tumara merender HTML.
- **`await`** berarti "tunggu sampai selesai baru lanjut" — untuk hal yang butuh waktu (data dari internet).
- **Tanpa `import`:** tiap file JS membuat satu objek global; **urutan `<script>` = urutan ketergantungan**. `app.js` terakhir karena memakai semuanya.
- **Multi-halaman, satu per peran** (`index`/`auth`/`app`/`guru`/`admin`) supaya tiap peran hanya memuat kodenya sendiri. Folder: `css/`, `js/`, `js/views/`, `assets/`.
- **Tanpa framework** karena sederhana, cepat, dan seluruhnya bisa dibaca pemula — pas untuk satu sekolah.

**Berikutnya:** [Bab 03 — Halaman Depan & Sistem Desain](03-halaman-depan-dan-desain.md)
