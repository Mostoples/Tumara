# Bab 03 — Halaman Depan & Sistem Desain

> **Tujuan bab ini:** Anda bisa membangun halaman depan Tumara (`index.html`) yang rapi, sekaligus membuat "sistem desain" — sekumpulan warna dan komponen (kartu, tombol, badge) yang dipakai ulang di seluruh aplikasi, lengkap dengan tema terang & gelap.

| | |
|---|---|
| **Perkiraan waktu** | ~60 menit |
| **Sebelum ini** | [Bab 02 — Fondasi Web & Struktur Proyek](02-fondasi-web-dan-struktur-proyek.md) |
| **Anda butuh** | VS Code, ekstensi Live Server, folder proyek dari Bab 02, koneksi internet (untuk font & ikon) |

## Apa yang kita bangun di bab ini

Di akhir bab ini Anda punya dua hal. Pertama, sebuah **sistem desain** di `css/style.css`: satu tempat berisi semua warna dan komponen dasar Tumara. Kedua, sebuah **halaman depan** `index.html` — halaman perkenalan (orang biasa menyebutnya *landing page* atau *company profile*) yang menjelaskan aplikasi ke calon pengguna, punya tombol "Masuk", daftar fitur, dan footer.

Gambaran hasilnya kira-kira begini:

```
┌──────────────────────────────────────────────┐
│  [logo] Tumara      Fitur  Cara Kerja   [Masuk]│  ← navbar
├──────────────────────────────────────────────┤
│                                                │
│   Tumbuh sehat, produktif, dan terarah         │  ← hero
│   [ Mulai Gratis ]   [ Lihat Fitur ]           │
│                                                │
├──────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │Kalori  │ │Ibadah  │ │Tugas   │ │Keuangan│   │  ← kartu fitur
│  └────────┘ └────────┘ └────────┘ └────────┘   │
├──────────────────────────────────────────────┤
│              footer + kontak                   │
└──────────────────────────────────────────────┘
```

## 1. Kenapa "sistem desain" dulu, sebelum fitur

Bayangkan Anda mendesain seragam sekolah. Anda tidak menentukan warna kain baru untuk setiap siswa. Anda menetapkan **sekali**: kemeja putih, rok/celana abu-abu, dasi hijau. Semua siswa lalu memakai aturan yang sama. Kalau suatu hari kepala sekolah minta dasi diganti biru, Anda cukup mengubah **satu aturan**, bukan mendatangi setiap siswa satu per satu.

Sistem desain adalah seragam untuk aplikasi. Kita tetapkan sekali: warna merek Tumara **hijau `#059669`**, kartu punya sudut membulat dan bayangan tipis, tombol utama berwarna hijau. Lalu setiap halaman — dashboard siswa, portal guru, panel admin — memakai aturan yang sama. Kalau nanti warna hijaunya mau digeser, kita ubah **satu baris**, dan seluruh aplikasi ikut berubah.

Kalau kita tidak melakukan ini, tiap halaman akan menuliskan warnanya sendiri-sendiri. Halaman siswa hijau `#10b981`, halaman guru hijau `#0ea472`, halaman admin hijau `#059669` — mirip tapi tidak sama, dan mustahil dirapikan belakangan. Karena itu kita bangun seragamnya lebih dulu.

> Tumara **tidak** memakai framework CSS seperti Bootstrap atau Tailwind, tidak ada langkah *build*, tidak ada `npm install`. Semua ditulis tangan sebagai CSS biasa yang dimuat lewat `<link>`. Itu keputusan sadar: proyek ini kecil, dan menulis CSS sendiri membuat Anda mengerti apa yang terjadi. Kalau nanti proyek membesar, framework bisa dipertimbangkan — tapi bukan sekarang.

## 2. Token warna dengan CSS variable

**CSS variable** (nama resminya *custom property*) adalah cara memberi nama pada sebuah nilai. Alih-alih menulis `#059669` di 200 tempat, kita simpan sekali dengan nama `--brand-dark`, lalu memanggilnya dengan `var(--brand-dark)`. Nama-nama bernilai ini sering disebut **token**: potongan kecil keputusan desain yang bisa dipakai ulang.

Semua token Tumara didefinisikan di dalam blok `:root` di puncak `css/style.css`. `:root` artinya "seluruh dokumen" — token yang dipasang di sini berlaku di mana saja. Berikut versi ringkasnya (lengkapnya di `css/style.css` baris 6–49):

```css
/* css/style.css — sekitar baris 6 (versi ringkas) */
:root {
  --font: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;

  /* Latar & permukaan (tema terang) */
  --bg: #f3f6fb;          /* warna latar halaman */
  --surface: #ffffff;     /* warna dasar kartu & panel */
  --surface-2: #f0f3f9;   /* permukaan sekunder (hover, isian) */

  /* Teks bertingkat */
  --text: #101828;        /* teks utama, paling gelap */
  --text-2: #475467;      /* teks sekunder, agak pudar */
  --text-3: #98a2b3;      /* teks paling pudar (keterangan) */

  /* Garis & bayangan */
  --border: #e4e9f1;
  --shadow-sm: 0 1px 2px rgba(16,24,40,.05), 0 4px 12px -4px rgba(16,24,40,.07);

  /* Warna merek & pilar */
  --brand: #10b981;       /* hijau terang */
  --brand-dark: #059669;  /* hijau tua — warna merek Tumara */
  --prod: #8b5cf6;        /* ungu — produktivitas */
  --fin: #f59e0b;         /* amber — keuangan */

  /* Bentuk */
  --radius: 20px;         /* kelengkungan sudut kartu */
  --radius-sm: 14px;
}
```

Mari baca per kelompok, supaya Anda paham alasan tiap token ada:

- **Latar & permukaan** (`--bg`, `--surface`, `--surface-2`). `--bg` adalah warna kertas seluruh halaman. `--surface` adalah warna kartu yang "mengambang" di atas kertas itu — di tema terang, kartu putih di atas latar abu sangat muda. `--surface-2` dipakai saat sesuatu perlu sedikit lebih menonjol dari latar, misalnya isian kotak atau warna tombol saat disentuh kursor.
- **Teks bertingkat** (`--text`, `--text-2`, `--text-3`). Ini trik penting agar tampilan enak dibaca. Judul memakai `--text` (paling tegas). Kalimat pendukung memakai `--text-2` (sedikit pudar). Keterangan kecil seperti "diperbarui 3 menit lalu" memakai `--text-3` (paling samar). Mata pembaca otomatis tahu mana yang penting.
- **Garis & bayangan** (`--border`, `--shadow-sm`). Warna garis tepi kartu, dan resep bayangan agar kartu terlihat sedikit terangkat.
- **Warna merek & pilar** (`--brand`, `--brand-dark`, `--prod`, `--fin`). Hijau adalah identitas Tumara. Tiga pilar aplikasi punya warna sendiri: kesehatan hijau, produktivitas ungu, keuangan amber. Warna inilah yang membuat kartu keuangan terasa berbeda dari kartu tugas tanpa perlu membaca judulnya.
- **Bentuk** (`--radius`). Seberapa membulat sudut kartu dan tombol. Karena disimpan sebagai token, semua komponen membulat dengan derajat yang sama persis.

> **Kenapa `--text-2: #475467`, bukan sekadar "abu-abu"?** Karena angka pasti bisa dipakai ulang dan konsisten. "Abu-abu" di kepala Anda hari ini belum tentu sama dengan "abu-abu" minggu depan. Token menghapus tebak-tebakan.

## 3. Tema gelap

Sekarang bagian yang menyenangkan. Karena setiap warna sudah bersembunyi di balik nama token, membuat tema gelap **tidak** berarti menulis ulang seluruh CSS. Kita cukup mengganti **nilai** tokennya, dan semua yang memakai `var(--...)` ikut berubah sendiri.

Caranya: kita tulis satu blok baru yang hanya aktif ketika elemen `<html>` punya atribut `data-theme="dark"`. Berikut versi ringkasnya (lengkapnya `css/style.css` baris 51–71):

```css
/* css/style.css — sekitar baris 51 (versi ringkas) */
[data-theme="dark"] {
  --bg: #0b1220;          /* biru-navy nyaris hitam */
  --surface: #131c2e;     /* kartu jadi lebih gelap dari latar */
  --surface-2: #1a2438;
  --text: #f1f5f9;        /* teks jadi terang */
  --text-2: #a9b4c6;
  --text-3: #64748b;
  --border: #24304a;
}
```

Perhatikan: nama tokennya **sama persis** dengan yang di `:root` — hanya nilainya yang berbeda. Di tema terang `--bg` bernilai `#f3f6fb` (hampir putih); di tema gelap `--bg` jadi `#0b1220` (hampir hitam). Sebuah `.card` yang menulis `background: var(--surface)` tidak perlu tahu apa-apa soal tema; ia hanya mengambil nilai `--surface` yang berlaku saat itu.

Bagaimana atribut `data-theme` itu dipasang? Lewat sedikit JavaScript. Cukup satu baris:

```js
document.documentElement.dataset.theme = 'dark';
```

`document.documentElement` adalah elemen `<html>`. Baris di atas memasang `data-theme="dark"` padanya, dan seketika seluruh halaman berpindah gelap. Untuk kembali terang, setel ke `'light'`. Implementasi lengkap tombol tema — termasuk cara mengingat pilihan pengguna agar tidak lupa saat halaman dimuat ulang — dibahas di [Bab 07](07-kerangka-aplikasi-siswa.md). Untuk sekarang cukup tahu: **satu atribut menggerakkan seluruh tema.**

> Warna merek Tumara adalah hijau **`#059669`**. Nilai ini juga muncul di `manifest.json` sebagai `"theme_color": "#059669"` — itulah warna bilah status ponsel ketika Tumara dipasang sebagai aplikasi (dibahas di [Bab 13](13-menjadikan-pwa.md)).

## 4. Komponen dasar

Token adalah bahan mentah. Sekarang kita rakit jadi **komponen** — potongan tampilan siap pakai. Tiga yang paling sering muncul: kartu, tombol, dan badge. Semuanya dibangun **di atas token**, jadi otomatis ikut berganti tema tanpa usaha tambahan.

### Kartu

```css
/* css/style.css — sekitar baris 313 */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 22px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow .25s, transform .25s, border-color .25s;
}
.card.hoverable:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
```

Lihat bagaimana `.card` tidak menyebut satu warna mentah pun — semuanya `var(--...)`. Latarnya `--surface`, garisnya `--border`, kelengkungannya `--radius`. Karena itu, ketika tema berganti gelap, kartu ikut gelap sendiri. Baris `transition` membuat perubahan (misalnya saat disentuh) berlangsung mulus, bukan mengejut. Kelas tambahan `.hoverable` membuat kartu sedikit terangkat saat kursor lewat di atasnya.

### Tombol

```css
/* css/style.css — sekitar baris 339 */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px 20px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--surface);
  color: var(--text); font-family: var(--font); font-weight: 700; font-size: .89rem;
  cursor: pointer; text-decoration: none; white-space: nowrap;
  transition: transform .12s, box-shadow .2s, background .18s, filter .18s;
}
.btn:hover { background: var(--surface-2); }
.btn:active { transform: scale(.97); }

.btn-primary {
  background: var(--grad-brand); color: #fff; border: none;
  box-shadow: 0 6px 16px -4px rgba(16,185,129,.45);
}
.btn-primary:hover { background: var(--grad-brand); filter: brightness(1.06); }
```

`.btn` adalah tombol dasar yang netral — putih dengan garis tipis. `.btn-primary` menumpuk di atasnya untuk tombol utama: latarnya diganti dengan `--grad-brand` (gradasi hijau) dan tulisannya jadi putih. Polanya: satu kelas dasar `.btn`, lalu kelas *modifier* (`.btn-primary`, `.btn-ghost`, `.btn-danger`) yang hanya mengubah warna. Anda menulisnya di HTML sebagai `class="btn btn-primary"` — dua kelas sekaligus.

Detail kecil yang enak diperhatikan: `.btn:active { transform: scale(.97); }` membuat tombol sedikit mengkerut saat ditekan, memberi kesan tombol fisik yang benar-benar tertekan.

### Badge

```css
/* css/style.css — sekitar baris 471 */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 999px;
  font-size: .7rem; font-weight: 700;
}
.badge-green { background: var(--health-soft); color: var(--brand-dark); }
.badge-amber { background: var(--fin-soft); color: #b45309; }
```

Badge adalah label kecil membulat, misalnya "Lunas" atau "Terlambat". `border-radius: 999px` adalah trik agar sudutnya membulat penuh jadi kapsul — angka besar apa pun akan membuat CSS membulatkan semaksimal mungkin. Token `--health-soft` adalah versi transparan-tipis dari hijau, jadi teks hijau tua tetap terbaca di atasnya.

Pola ini — **kelas dasar + modifier warna, semua di atas token** — adalah inti sistem desain Tumara. Sekali Anda paham, semua komponen lain di aplikasi terbaca dengan logika yang sama.

## 5. Membangun `index.html`

Sekarang kita rakit halaman depannya. Halaman ini punya CSS sendiri, `css/index.css`, yang terpisah dari `css/style.css` aplikasi (halaman depan tampil lebih "iklan", aplikasinya lebih "kerja"). Uniknya, `css/index.css` mendeklarasikan token warna sendiri di `:root`-nya — tapi mengikuti nilai merek yang sama: `--brand-dark: #059669`.

Mulai dari bagian kepala dokumen. Ini yang membuat font, ikon, dan tema termuat:

```html
<!-- index.html — bagian <head> (ringkas) -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tumara — Tumbuh sehat, produktif, terarah</title>

  <!-- Font Google: Plus Jakarta Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">

  <!-- Terapkan tema tersimpan sebelum CSS dirender agar tidak berkedip -->
  <script>document.documentElement.dataset.theme = localStorage.getItem('tumara_theme') || 'light';</script>

  <link rel="stylesheet" href="css/index.css">
  <meta name="theme-color" content="#059669">
</head>
```

Ada satu baris cerdas di sini yang layak digarisbawahi:

```html
<script>document.documentElement.dataset.theme = localStorage.getItem('tumara_theme') || 'light';</script>
```

Baris ini sengaja diletakkan **sebelum** `<link rel="stylesheet">`. Alasannya jujur soal bug: kalau tema baru dipasang setelah CSS termuat, pengguna yang memilih tema gelap akan melihat "kedipan putih" sepersekian detik saat halaman dibuka — halaman sempat tampil terang lalu langsung berubah gelap. Menyetel `data-theme` lebih dulu menghilangkan kedipan itu. `localStorage.getItem('tumara_theme')` membaca pilihan tema yang tersimpan; kalau belum ada (pengunjung baru), `|| 'light'` memakai terang sebagai bawaan.

Berikutnya bagian tubuh. Kita mulai dari navbar:

```html
<!-- index.html — navbar (ringkas) -->
<header class="nav" id="nav">
  <div class="container nav-inner">
    <a class="nav-logo" href="#beranda">
      <span class="logo-mark"><img src="assets/logo.png" alt="Logo Tumara"></span>
      <span class="logo-text">Tumara</span>
    </a>
    <nav class="nav-links">
      <a href="#fitur">Fitur</a>
      <a href="#cara">Cara Kerja</a>
      <a href="#tentang">Tentang</a>
    </nav>
    <div class="nav-cta">
      <a class="btn btn-grad" href="auth.html">Masuk</a>
    </div>
  </div>
</header>
```

> Tautan "Masuk" mengarah ke `auth.html`. Halaman itu **belum ada** — kita membuatnya di [Bab 06](06-masuk-daftar-dan-peran.md). Jadi kalau Anda klik sekarang, browser akan bilang halaman tidak ditemukan. Itu wajar, jangan panik. Kita bangun bertahap.

Lalu bagian **hero** — layar sambutan besar dengan judul utama:

```html
<!-- index.html — hero (ringkas) -->
<section class="hero" id="beranda">
  <div class="container hero-inner">
    <div class="hero-copy">
      <span class="hero-badge">🌱 Pendamping harian siswa Indonesia</span>
      <h1>Tumbuh <span class="grad-text">sehat</span>, produktif, dan terarah — dari satu aplikasi.</h1>
      <p>Tumara menyatukan lima pilar kehidupan pelajar — kesehatan, ibadah,
         produktivitas, daily planner, dan keuangan.</p>
      <div class="hero-actions">
        <a class="btn btn-grad btn-lg" href="auth.html">Mulai Gratis</a>
        <a class="btn btn-ghost btn-lg" href="#fitur">Lihat Fitur</a>
      </div>
    </div>
  </div>
</section>
```

Perhatikan `href="#fitur"` pada tombol "Lihat Fitur". Tanda `#` diikuti nama membuat browser menggulung halaman ke elemen yang punya `id="fitur"` — navigasi di dalam satu halaman, bukan pindah halaman. Itu sebabnya navbar dan tombol bisa "melompat" ke bagian tertentu.

Sekarang **kartu-kartu fitur**. Di sinilah komponen kartu kita terpakai:

```html
<!-- index.html — grid fitur (ringkas: aslinya 9 kartu) -->
<section class="section" id="fitur">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Fitur Lengkap</span>
      <h2>Semua yang siswa butuhkan, tanpa berpindah aplikasi.</h2>
    </div>
    <div class="feature-grid">
      <div class="feature-card fc-green">
        <span class="fc-icon"><ion-icon name="flame"></ion-icon></span>
        <h3>Kalkulator Gizi &amp; Kalori</h3>
        <p>BMR, TDEE, dan BMI dihitung otomatis — lengkap dengan panduan
           porsi <b>Isi Piringku</b> dari Kemenkes.</p>
      </div>
      <div class="feature-card fc-teal">
        <span class="fc-icon"><ion-icon name="moon"></ion-icon></span>
        <h3>Tracker Ibadah &amp; Sholat</h3>
        <p>Checklist sholat fardhu, arah kiblat, dzikir &amp; doa, kalender Hijriyah.</p>
      </div>
      <div class="feature-card fc-purple">
        <span class="fc-icon"><ion-icon name="checkbox"></ion-icon></span>
        <h3>Tugas, Catatan &amp; Jadwal</h3>
        <p>Rencana belajar dengan tenggat, catatan yang bisa dicari, jadwal mingguan.</p>
      </div>
      <div class="feature-card fc-amber">
        <span class="fc-icon"><ion-icon name="wallet"></ion-icon></span>
        <h3>Keuangan &amp; Target Menabung</h3>
        <p>Catat uang saku, lihat grafik pengeluaran, wujudkan target menabung.</p>
      </div>
    </div>
  </div>
</section>
```

Halaman asli punya sembilan kartu (tiga untuk Kesehatan saja: gizi/kalori, tidur, olahraga); di sini kita ringkas jadi empat, satu wakil untuk tiap pilar (Kesehatan/Ibadah/Produktivitas/Keuangan). Perhatikan kelas modifier `fc-green`, `fc-teal`, `fc-purple`, `fc-amber` — persis pola yang sama seperti tombol tadi: satu kelas dasar `feature-card` + satu kelas warna. `&amp;` adalah cara menulis tanda `&` di dalam HTML (menulis `&` telanjang bisa membingungkan browser).

Terakhir, **footer**:

```html
<!-- index.html — footer (ringkas) -->
<footer class="footer">
  <div class="container footer-inner">
    <div class="footer-brand">
      <a class="nav-logo" href="#beranda">
        <span class="logo-mark"><img src="assets/logo.png" alt="Logo Tumara"></span>
        <span class="logo-text">Tumara</span>
      </a>
      <p>Tumbuh sehat, produktif, terarah.<br>Pendamping harian siswa Indonesia.</p>
    </div>
    <div class="footer-col">
      <b>Kontak</b>
      <a href="mailto:halo@tumara.id"><ion-icon name="mail-outline"></ion-icon> halo@tumara.id</a>
    </div>
  </div>
  <div class="container footer-bottom">
    <span>© 2026 Tumara. Semua hak dilindungi.</span>
    <span>Tumara bukan pengganti nasihat tenaga kesehatan profesional.</span>
  </div>
</footer>
```

Kalimat penutup "Tumara bukan pengganti nasihat tenaga kesehatan profesional" bukan basa-basi — ini bagian tanggung jawab, karena aplikasi ini menghitung kalori dan menyentuh kesehatan remaja. Jujur soal batasan adalah bagian dari desain yang baik.

## 6. Font & ikon lewat CDN

Anda mungkin bertanya: dari mana font "Plus Jakarta Sans" dan ikon-ikon (`<ion-icon>`) itu datang? Jawabannya: **CDN**.

**CDN** (*Content Delivery Network*) artinya kita **memuat file dari server orang lain** lewat internet, bukan menyimpannya di folder proyek kita. Google menyediakan servernya untuk font; sebuah proyek bernama Ionicons menyediakan servernya untuk ikon. Kita cukup menautkannya:

```html
<!-- index.html — font dari server Google -->
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">

<!-- index.html — ikon Ionicons dari CDN jsDelivr -->
<script type="module" src="https://cdn.jsdelivr.net/npm/ionicons@7.4.0/dist/ionicons/ionicons.esm.js"></script>
<script nomodule src="https://cdn.jsdelivr.net/npm/ionicons@7.4.0/dist/ionicons/ionicons.js"></script>
```

Setelah dimuat, ikon bisa dipakai semudah menulis tag: `<ion-icon name="wallet"></ion-icon>` menampilkan gambar dompet. Praktis sekali — kita tidak perlu menyimpan ratusan file gambar ikon.

> ⚠️ **Jujur soal ini:** karena font dan ikon dimuat dari server orang lain, keduanya **butuh internet**. Kalau perangkat sedang offline, atau CDN-nya diblokir (beberapa jaringan sekolah memblokir domain tertentu), font akan berganti ke huruf bawaan sistem dan ikon bisa tidak muncul sama sekali — hanya kotak kosong. Inilah alasan kenapa nanti di [Bab 13](13-menjadikan-pwa.md), saat Tumara kita jadikan aplikasi yang bisa jalan offline, ikon menjadi masalah yang harus ditangani khusus. Untuk sekarang, cukup sadari ketergantungan ini.

## 7. Responsif sekilas

**Responsif** artinya tampilan menyesuaikan diri dengan ukuran layar — nyaman baik di layar laptop lebar maupun di ponsel sempit. Alat utamanya adalah `@media` query: sekumpulan aturan CSS yang hanya berlaku bila layar memenuhi syarat tertentu.

Aplikasi Tumara (bukan halaman depan) memakai `@media` untuk mengubah tata letak besar-besaran di layar sempit. Di layar lebar ada **sidebar** (menu di tepi kiri); di layar ≤860px sidebar disembunyikan dan diganti **bottom-nav** (menu di tepi bawah, seperti aplikasi ponsel pada umumnya). Berikut potongannya:

```css
/* css/style.css — sekitar baris 972 (ringkas) */
@media (max-width: 860px) {
  .sidebar { display: none; }        /* sembunyikan menu tepi kiri */
  .main-area { margin-left: 0; }     /* konten geser mengisi ruang bekas sidebar */
  .bottom-nav { display: flex; }     /* tampilkan menu tepi bawah */
}
```

Bacanya begini: "Ketika lebar layar maksimal 860 piksel, jalankan aturan di dalam kurung." Di layar lebar, `@media` ini tidak aktif, jadi sidebar tetap tampil. Begitu jendela menyempit melewati 860px — entah karena dibuka di ponsel atau karena Anda mengecilkan jendela browser — ketiga aturan menyala serentak dan tata letak berpindah. Detail lengkap navigasi ini dibahas di [Bab 07](07-kerangka-aplikasi-siswa.md); untuk sekarang cukup mengenali bentuk `@media` query dan apa fungsinya.

## ✅ Cek hasil

- Klik kanan `index.html` di VS Code → **Open with Live Server**. Halaman terbuka di browser.
- Anda harus melihat: navbar dengan logo & tombol "Masuk", hero dengan judul "Tumbuh sehat...", deretan kartu fitur, dan footer. Semuanya memakai font Plus Jakarta Sans (huruf agak membulat), bukan huruf polos bawaan.
- **Uji kekuatan token:** buka `css/style.css`, ubah `--brand-dark: #059669;` menjadi `--brand-dark: #2563eb;` (biru), simpan. Refresh halaman — setiap elemen yang memakai warna merek ikut berubah, dari satu perubahan saja. Kembalikan lagi ke `#059669` setelah puas.
- **Cek lewat DevTools:** tekan `F12`, buka tab **Elements**, klik elemen `<html>` paling atas. Jalankan di tab **Console**: `document.documentElement.dataset.theme = 'dark'` lalu Enter. Halaman langsung berpindah gelap. Ketik lagi dengan `'light'` untuk kembali. Inilah mekanisme tema yang tadi kita bahas, dijalankan manual.
- **Uji responsif:** perkecil lebar jendela browser sampai menyempit. Navbar akan merapat dan (di halaman aplikasi nanti) tata letak berpindah ke mode ponsel.

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| Halaman tampil polos, tanpa warna/kartu | CSS tidak termuat — `href` salah | Pastikan `<link rel="stylesheet" href="css/index.css">` dan file benar ada di folder `css/`. Cek tab Network di DevTools: kalau `index.css` berstatus 404, path-nya keliru. |
| Warna tidak berubah walau token diedit | Salah tulis `var(--x)` atau salah nama token | Ejaan `var(--brand-dark)` harus persis. Kurung dan dua strip `--` wajib ada. Salah satu huruf saja, warna diabaikan diam-diam. |
| Huruf jadi polos, ikon jadi kotak kosong | Tidak ada internet / CDN diblokir | Cek koneksi. Kalau di jaringan sekolah, domain `fonts.googleapis.com` atau `cdn.jsdelivr.net` mungkin diblokir — coba jaringan lain. Ini normal saat offline. |
| Klik "Masuk" → halaman tidak ditemukan | `auth.html` memang belum dibuat | Wajar. Halaman itu dibangun di Bab 06. |
| Tema gelap "berkedip" putih sesaat saat dibuka | Skrip penyetel tema diletakkan setelah CSS | Pastikan `<script>...dataset.theme...</script>` ada **sebelum** `<link rel="stylesheet">` di dalam `<head>`. |

## 🧪 Latihan

1. **Ganti palet jadi biru.** Di `css/style.css`, ubah `--brand` dan `--brand-dark` ke nuansa biru (mis. `#3b82f6` dan `#2563eb`). Refresh dan amati berapa banyak elemen yang berubah dari dua baris itu. Kembalikan setelahnya.
2. **Tambah satu kartu fitur.** Salin satu blok `<div class="feature-card ...">` di `index.html`, ubah judul dan isinya (misalnya "Timer Fokus Pomodoro"), pilih kelas warna yang cocok. Refresh dan pastikan kartu baru tampil selaras dengan yang lain.
3. ⭐ **Tombol toggle tema manual.** Tambahkan tombol di navbar, lalu sedikit JavaScript inline di akhir `<body>`:
   ```html
   <button id="themeBtn" class="btn">Ganti Tema</button>
   <script>
     document.getElementById('themeBtn').onclick = () => {
       const html = document.documentElement;
       const baru = html.dataset.theme === 'dark' ? 'light' : 'dark';
       html.dataset.theme = baru;
       localStorage.setItem('tumara_theme', baru);  // ingat pilihan
     };
   </script>
   ```
   Klik tombolnya dan lihat seluruh halaman berpindah gelap/terang. Muat ulang halaman — pilihan Anda harus diingat, berkat `localStorage`. (Ini versi mini dari yang akan kita bangun rapi di Bab 07.)

## 📌 Ringkasan

- **Sistem desain dibuat lebih dulu** agar semua halaman konsisten dan warna bisa diganti dari satu tempat — seperti menetapkan seragam sekolah sekali.
- **Token** adalah warna/ukuran yang diberi nama lewat CSS variable di `:root`, dipanggil dengan `var(--nama)`.
- **Tema gelap** cukup mengganti *nilai* token di blok `[data-theme="dark"]`; semua komponen ikut berubah otomatis. JavaScript memasang temanya dengan `document.documentElement.dataset.theme = 'dark'`.
- **Komponen** (`.card`, `.btn`, `.badge`) dibangun di atas token, dengan pola kelas dasar + modifier warna. Karena tak memakai warna mentah, mereka ikut tema tanpa usaha tambahan.
- Warna merek Tumara adalah hijau **`#059669`**, konsisten dari `css/style.css` sampai `manifest.json`.
- **CDN** (font Google, ikon Ionicons) praktis tapi **butuh internet** — ini akan jadi persoalan offline di Bab 13.
- **`@media` query** membuat tampilan responsif; di ≤860px Tumara berpindah dari sidebar ke bottom-nav.

**Berikutnya:** [Bab 04 — Menyiapkan Firebase](04-menyiapkan-firebase.md)
