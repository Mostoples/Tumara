# Bab 01 — Pengenalan & Persiapan

> **Tujuan bab ini:** Anda mengerti apa yang akan kita bangun, memasang semua alat yang diperlukan, membuat folder proyek, dan menampilkan halaman "Halo, Tumara" pertama Anda di browser.

| | |
|---|---|
| **Perkiraan waktu** | ~60 menit (termasuk mengunduh dan memasang) |
| **Sebelum ini** | [Peta Modul](README.md) |
| **Anda butuh** | Laptop (Windows/macOS/Linux), koneksi internet, akun Google |

Selamat datang. Kalau Anda belum pernah menulis satu baris kode pun, Anda ada di tempat yang tepat. Bab ini tidak mengasumsikan Anda tahu apa-apa soal pemrograman. Kita mulai benar-benar dari nol: mengenali apa yang akan dibangun, lalu memasang alatnya, lalu membuat halaman pertama yang bisa Anda lihat sendiri di layar.

Ambil kopi. Santai. Tidak ada yang perlu diburu.

## Apa yang kita bangun di bab ini

Di akhir bab ini, komputer Anda sudah siap "bengkel"-nya, dan sebuah halaman bertuliskan **Halo, Tumara** tampil di browser Anda — halaman yang Anda buat sendiri. Belum ada fitur apa-apa; ini baru batu pertama. Tapi begitu batu pertama terpasang, sisanya tinggal menumpuk.

```
┌───────────────────────────────┐
│                               │
│                               │
│        Halo, Tumara 👋        │
│   Halaman pertama saya jadi.  │
│                               │
│                               │
└───────────────────────────────┘
```

## 1. Apa itu Tumara

Bayangkan seorang siswa SMP. Untuk menghitung kalori makan siangnya, ia buka satu aplikasi. Untuk mencatat tugas dari guru, ia buka aplikasi lain. Untuk mengatur uang jajan, aplikasi lain lagi. Tiga aplikasi untuk tiga urusan — padahal semuanya soal "menjaga diri sendiri tetap seimbang".

**Tumara menggabungkan semuanya jadi satu.** Nama Tumara berasal dari kata *tumbuh*. Idenya sederhana: satu layar untuk menjaga **tubuh, pikiran, dan dompet** tetap seimbang. Setiap pagi siswa membuka satu ringkasan — kalori hari ini, tugas yang jatuh tempo, sisa uang jajan — alih-alih membuka lima aplikasi terpisah.

Tapi Tumara bukan cuma untuk siswa. Aplikasi ini punya **tiga peran** (tiga jenis pengguna), masing-masing dengan pintu masuknya sendiri:

- **Siswa** — memakai fitur harian: kesehatan, produktivitas, keuangan, dan ibadah.
- **Guru** — mengelola kelas: absensi, penilaian, jurnal mengajar, mengirim tugas ke kelasnya.
- **Admin** — mengurus data induk sekolah: membuat daftar kelas, mendata siswa, mengatur akun.

Gambaran besarnya kira-kira begini. Satu aplikasi, tiga wajah — tergantung siapa yang masuk:

```
                    ┌──────────────────┐
                    │      TUMARA      │
                    └────────┬─────────┘
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌────────────┐     ┌────────────┐     ┌────────────┐
   │   SISWA    │     │    GURU    │     │   ADMIN    │
   │            │     │            │     │            │
   │ kesehatan  │     │ kelas      │     │ akun       │
   │ tugas      │     │ absensi    │     │ daftar     │
   │ keuangan   │     │ penilaian  │     │ kelas      │
   │ ibadah     │     │ jurnal     │     │ data siswa │
   └────────────┘     └────────────┘     └────────────┘
```

Anda tidak perlu membangun semuanya sekaligus. Modul ini menuntun Anda satu bab demi satu bab: mulai dari halaman depan, lalu data, lalu siswa, lalu guru dan admin, sampai akhirnya aplikasi hidup di internet. Bab ini hanya menyiapkan bengkelnya.

## 2. Apa itu "aplikasi web"

Ada dua cara sebuah aplikasi sampai ke tangan pengguna.

Cara pertama: aplikasi **di-install**. Anda buka Play Store atau App Store, tekan "Pasang", dan aplikasi itu menetap di HP Anda. WhatsApp dan game seperti ini.

Cara kedua: aplikasi **web**. Anda cukup membuka alamat (misalnya `tumara.web.app`) lewat browser — tidak ada yang diunduh dan dipasang. Gmail dan Google Docs seperti ini. Tumara juga seperti ini.

Kenapa kita pilih aplikasi web? Karena satu buatan langsung jalan di HP Android, iPhone, laptop, dan tablet — tanpa perlu bikin versi berbeda untuk masing-masing, dan tanpa perlu izin toko aplikasi. Untuk sekolah, ini paling praktis.

Sebuah aplikasi web dirakit dari beberapa bahan. Berikut istilah-istilah yang akan sering muncul di modul ini — cukup kenali dulu, tidak perlu dihafal:

- **Browser** — program untuk membuka halaman web (Chrome, Firefox, Safari, Edge). Ini "jendela" tempat aplikasi Anda tampil.
- **HTML** (*HyperText Markup Language*) — kerangka halaman: judul, paragraf, tombol, gambar. Ibarat membangun rumah, HTML adalah **kerangka dan dindingnya** — menentukan ada apa dan di mana.
- **CSS** (*Cascading Style Sheets*) — tampilan: warna, ukuran huruf, jarak, tata letak. Ini **cat dan perabot rumah** — membuat kerangka tadi enak dilihat.
- **JavaScript** (sering disingkat **JS**) — perilaku: apa yang terjadi saat tombol ditekan, angka dihitung, data disimpan. Ini **listrik dan keran** rumah — bagian yang bergerak dan bekerja.
- **Server** — komputer lain (di suatu tempat, milik Google) tempat data disimpan dan halaman dilayankan. Ibarat **gudang dan kantor pusat** di luar rumah.

Tiga yang pertama (HTML, CSS, JS) berjalan di browser pengguna. Server bekerja di kejauhan. Sebagian besar bab awal modul ini fokus pada tiga yang pertama; server (Firebase) baru datang di Bab 04.

## 3. Memasang alat

Sekarang kita siapkan bengkelnya. Semua gratis. Kerjakan berurutan.

### 3a. VS Code — editor kode

Kode ditulis dalam file teks biasa, tapi mengetiknya di Notepad menyiksa. **VS Code** (Visual Studio Code, buatan Microsoft) adalah editor teks khusus untuk kode: ia memberi warna, memperingatkan salah ketik, dan punya banyak alat bantu. Ini "meja kerja" utama Anda.

1. Buka [https://code.visualstudio.com](https://code.visualstudio.com).
2. Situs otomatis mengenali sistem operasi Anda (Windows, macOS, atau Linux) dan menawarkan tombol unduh yang sesuai. Tekan tombol itu.
3. Jalankan berkas yang terunduh dan ikuti pemasangannya (tekan Lanjut/Next sampai selesai). Di Windows, centang **"Add to PATH"** kalau ada — ini memudahkan langkah nanti.
4. Buka VS Code. Kalau layar sambutannya muncul, pemasangan berhasil.

### 3b. Ekstensi "Live Server"

VS Code bisa diperkuat dengan **ekstensi** — pemasangan tambahan sesuai kebutuhan. Satu ekstensi **wajib** kita pasang sekarang: **Live Server**. Fungsinya menjalankan halaman web Anda secara lokal dan menyegarkannya otomatis setiap Anda menyimpan perubahan. Tanpa ini, Anda harus me-refresh browser manual terus-menerus.

Cara memasang:

1. Di VS Code, tekan ikon kotak-kotak di bilah kiri (**Extensions**), atau tekan `Ctrl+Shift+X` (`Cmd+Shift+X` di Mac).
2. Di kotak pencarian, ketik **Live Server**.
3. Pilih yang dibuat **Ritwick Dey** (biasanya paling atas, jutaan unduhan), lalu tekan **Install**.

> **Catatan:** Repositori Tumara menyimpan rekomendasi ekstensi ini di file `.vscode/extensions.json`. Isinya menunjuk `ritwickdey.liveserver` — jadi kalau nanti Anda membuka folder proyek yang sudah lengkap, VS Code akan menawarkan ekstensi yang sama secara otomatis.

### 3c. Google Chrome dan DevTools

Anda boleh pakai browser apa pun untuk membuka aplikasi. Tapi untuk **membangun** aplikasi, kita butuh **DevTools** — seperangkat alat pemeriksa yang tertanam di browser. Chrome punya DevTools yang paling lengkap dan paling banyak dicontohkan, jadi modul ini memakainya. Unduh dari [https://www.google.com/chrome](https://www.google.com/chrome) kalau belum punya.

Cara membuka DevTools: tekan **F12**, atau klik kanan di mana saja pada halaman lalu pilih **Inspect** / **Periksa**. Panel akan muncul di sisi atau bawah layar. Dua tabnya paling sering kita pakai:

- **Console** — tempat pesan dan kesalahan muncul. Kalau aplikasi bertingkah aneh, di sinilah petunjuk pertamanya. Anda juga bisa mengetik perintah JavaScript langsung di sini untuk mencoba-coba.
- **Network** — mencatat semua yang diunduh halaman (file, data dari server). Berguna nanti untuk memastikan data benar-benar terkirim dan diterima.

Belum perlu paham detailnya sekarang. Cukup tahu di mana tombolnya.

### 3d. Node.js

**Node.js** adalah program yang bisa menjalankan JavaScript di luar browser. "Lho, kita kan bikin aplikasi web yang jalan di browser?" Betul — aplikasi Tumara sendiri **tidak** butuh Node.js untuk jalan. Tapi kita pasang sekarang karena dua alat pembantu di bab-bab lanjutan memerlukannya:

- **Firebase CLI** — alat untuk mengunggah (deploy) aplikasi ke internet (Bab 04 dan 14). Ia berjalan di atas Node.js.
- **Script `stamp-version.js`** — skrip kecil milik repo (`scripts/stamp-version.js`) yang mencap versi build sebelum tiap deploy, supaya pengguna otomatis ditarik ke versi terbaru (Bab 13 dan 14).

Cara memasang:

1. Buka [https://nodejs.org](https://nodejs.org).
2. Unduh versi berlabel **LTS** (*Long Term Support* — versi stabil yang disarankan). Hindari versi "Current".
3. Jalankan pemasangnya, ikuti sampai selesai.

Cara memeriksa berhasil: buka **terminal** (lihat bagian 6 di bawah kalau belum tahu caranya) lalu ketik:

```bash
node --version
```

Kalau muncul angka seperti `v20.11.0`, Node.js sudah terpasang. Angka pastinya boleh berbeda — yang penting keluar angka, bukan pesan error "command not found".

> **Kalau `node --version` bilang "command not found":** biasanya terminalnya perlu ditutup dan dibuka lagi setelah pemasangan, supaya ia menyadari ada program baru. Kalau masih belum, ulangi pemasangan dan pastikan tidak ada langkah yang terlewat.

### 3e. Git (opsional, disarankan)

**Git** adalah alat pencatat riwayat perubahan kode — seperti "undo" raksasa yang menyimpan setiap versi proyek Anda, sehingga Anda bisa kembali ke keadaan mana pun kapan saja. Sangat berguna, tapi **belum kita pakai sekarang**. Kita bahas tuntas di [Bab 14](14-deploy-dan-pemeliharaan.md). Kalau ingin memasangnya sekarang, unduh dari [https://git-scm.com](https://git-scm.com). Kalau tidak, lewati saja — tidak menghambat.

### 3f. Akun Google

Terakhir, pastikan Anda punya **akun Google** (alamat `@gmail.com`). Ini dipakai di [Bab 04](04-menyiapkan-firebase.md) untuk membuat proyek Firebase — server dan database aplikasi. Belum perlu diapa-apakan sekarang, cukup pastikan Anda ingat email dan katasandinya.

## 4. Membuat folder proyek dan halaman pertama

Sekarang bagian yang seru: membuat sesuatu yang bisa dilihat.

**Buat folder** bernama `tumara` di tempat yang mudah Anda temukan (misalnya di dalam folder Documents). Cara membuat folder sama seperti biasa lewat File Explorer (Windows) atau Finder (Mac) — klik kanan, **New Folder**, beri nama `tumara`.

**Buka folder itu di VS Code:** di VS Code, pilih menu **File → Open Folder…**, lalu pilih folder `tumara` yang baru dibuat. Sekarang bilah kiri VS Code (**Explorer**) menampilkan isi folder itu — masih kosong.

**Buat file baru:** di panel Explorer, arahkan kursor ke nama folder `TUMARA`, lalu tekan ikon **New File** (lembar kertas dengan tanda tambah). Beri nama persis:

```
index.html
```

Nama `index.html` bukan sembarang nama — ini nama baku untuk "halaman utama" sebuah situs. Browser dan server otomatis mencari file bernama `index.html` saat sebuah folder dibuka.

**Ketik isinya.** Salin kode berikut ke dalam `index.html`. Ketik ulang, jangan salin-tempel — jari yang mengetik lebih ingat daripada mata yang membaca:

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Halo, Tumara</title>
    <style>
      body {
        font-family: sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        background: #0f766e;
        color: white;
        text-align: center;
      }
      h1 {
        font-size: 3rem;
        margin: 0;
      }
      p {
        opacity: 0.85;
      }
    </style>
  </head>
  <body>
    <h1>Halo, Tumara 👋</h1>
    <p>Halaman pertama saya jadi.</p>
  </body>
</html>
```

Jangan lupa **simpan** (`Ctrl+S` / `Cmd+S`).

Mari bedah bagiannya, supaya Anda tidak sekadar menyalin mantra:

- Baris `<!DOCTYPE html>` memberi tahu browser: "ini halaman HTML modern". Selalu ada di baris pertama.
- Bagian `<head>…</head>` berisi keterangan halaman yang **tidak** tampil di layar — judul tab (`<title>`), pengaturan huruf (`charset`), dan pengaturan agar tampilan pas di layar HP (`viewport`).
- Bagian `<style>…</style>` di dalam `<head>` adalah **CSS** — di sinilah warna hijau, huruf besar di tengah, dan latar penuh layar diatur. (Menaruh CSS langsung di dalam HTML seperti ini disebut *inline*; nyaman untuk halaman kecil. Nanti di [Bab 03](03-halaman-depan-dan-desain.md) kita pindahkan ke file terpisah `css/style.css` supaya rapi.)
- Bagian `<body>…</body>` adalah isi yang **tampil** di layar — di sini hanya satu judul `<h1>` dan satu paragraf `<p>`.

Inilah tiga bahan tadi bertemu: HTML (kerangka `<h1>` dan `<p>`) dan CSS (warna, ukuran) dalam satu file. JavaScript belum ada — halaman ini belum "bergerak". Itu urusan bab-bab berikutnya.

## 5. Menjalankannya lewat Live Server

Halaman sudah dibuat, tapi belum dilihat. Sekarang jalankan lewat Live Server:

1. Di panel Explorer VS Code, **klik kanan** pada file `index.html`.
2. Pilih **Open with Live Server**.
3. Browser default Anda otomatis terbuka, menampilkan halaman hijau bertuliskan **Halo, Tumara 👋**.

Perhatikan alamat di browser: bukan `file:///…` melainkan sesuatu seperti `http://127.0.0.1:5500/index.html`. Angka `5500` itu **port** — semacam nomor pintu di komputer Anda tempat Live Server "menyajikan" halaman.

**Kenapa harus lewat Live Server, tidak cukup klik dua kali file-nya?** Untuk halaman sesederhana ini, membuka file langsung (`file:///…`) sebenarnya cukup. Tapi begitu aplikasi tumbuh, ia akan **memuat file lain** (mengambil data, memuat modul JS, mendaftarkan *service worker* untuk mode offline di [Bab 13](13-menjadikan-pwa.md)). Browser **melarang** hal-hal itu saat halaman dibuka lewat `file:///` — demi keamanan. Live Server memberi kita alamat `http://…` sungguhan (walau hanya di komputer sendiri), sehingga semua fitur itu jalan. Membiasakan diri memakai Live Server sejak sekarang menghindarkan kebingungan nanti.

Bonus: dengan Live Server aktif, setiap kali Anda menyimpan perubahan pada file, browser **otomatis menyegarkan** halaman. Coba nanti — ubah teks, simpan, lihat browser berubah sendiri.

## 6. Mengenal terminal di VS Code

Satu alat lagi yang akan sering kita pakai: **terminal**. Terminal adalah kotak tempat Anda mengetik perintah untuk komputer (bukan mengklik). Perintah `node --version` tadi diketik di sini. Nanti perintah `firebase deploy` juga.

Cara membukanya di VS Code: menu **Terminal → New Terminal** (atau tekan `` Ctrl+` `` — tombol backtick, biasanya di kiri atas keyboard di bawah Esc). Sebuah panel muncul di bawah, siap menerima ketikan.

Coba sekarang: ketik `node --version` lalu tekan Enter. Kalau muncul angka versi, artinya Node.js dari langkah 3d benar-benar terpasang dan terminal Anda berfungsi. Anda baru saja memberi komputer perintah pertama Anda.

## ✅ Cek hasil

Pastikan semua ini benar sebelum lanjut ke Bab 02:

- [ ] Browser menampilkan halaman hijau bertuliskan **Halo, Tumara 👋** dan **Halaman pertama saya jadi.**
- [ ] Alamat di browser dimulai dengan `http://127.0.0.1:` (bukan `file:///`) — tanda Live Server aktif.
- [ ] Di terminal VS Code, `node --version` mengeluarkan angka (mis. `v20.11.0`).
- [ ] Tekan **F12** di browser, buka tab **Console** — kotaknya kosong, tanpa tulisan merah. (Tulisan merah berarti ada kesalahan; untuk halaman sesederhana ini, seharusnya bersih.)

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| Menu **Open with Live Server** tidak muncul saat klik kanan | Ekstensi Live Server belum terpasang, atau VS Code belum menyadarinya | Pasang ulang ekstensi (langkah 3b), lalu tutup dan buka lagi VS Code. Pastikan Anda membuka **folder** lewat *Open Folder*, bukan file tunggal |
| Browser terbuka tapi halaman **kosong / putih** | Nama file salah (mis. `index.html.txt` atau `Index.html`) | Cek nama file persis `index.html`, huruf kecil semua. Di Windows, matikan "Hide file extensions" agar `.txt` tersembunyi terlihat |
| Halaman tampil tapi **tanpa warna hijau / tanpa tata letak** | Ada salah ketik di bagian `<style>` (kurung `{ }` atau titik koma hilang) | Bandingkan baris demi baris dengan kode di langkah 4. Satu tanda kurang sudah cukup membuat CSS diabaikan |
| Live Server error atau **port sudah dipakai** | Program lain (atau Live Server lama) memakai port 5500 | Tutup tab/jendela browser lama, atau di kanan bawah VS Code tekan tombol port untuk mematikan lalu jalankan ulang. Live Server akan memilih port lain (5501, dst.) bila 5500 sibuk |
| `node --version` bilang **command not found** | Terminal belum menyadari Node.js baru dipasang | Tutup semua terminal, buka terminal baru. Kalau masih, pasang ulang Node.js (langkah 3d) dan restart komputer |

## 🧪 Latihan

1. **Ganti kata dan warna.** Ubah tulisan `Halo, Tumara 👋` menjadi nama Anda, dan ganti `background: #0f766e;` menjadi warna lain (coba `#7c3aed` untuk ungu, atau `#b91c1c` untuk merah). Simpan dan perhatikan browser berubah sendiri.

2. **Buat halaman kedua.** Buat file baru `tes.html` di folder yang sama, isi dengan HTML sederhana seperti `index.html`, lalu jalankan juga dengan Live Server. Ini membiasakan Anda bahwa satu proyek bisa punya banyak halaman — persis seperti Tumara nanti (`app.html`, `guru.html`, `admin.html`).

3. ⭐ **Coba Console.** Buka DevTools (F12), pindah ke tab **Console**, ketik `2 + 2` lalu Enter. Console menjawab `4`. Sekarang ketik `alert("Hai!")` lalu Enter — sebuah kotak pesan muncul di halaman. Itu JavaScript pertama Anda, dijalankan langsung tanpa file. Belum kita pakai serius, tapi menyenangkan tahu ia ada.

## 📌 Ringkasan

- **Tumara** adalah aplikasi web yang menyatukan banyak kebutuhan siswa dalam satu layar, dengan tiga peran: **siswa, guru, admin**.
- **Aplikasi web** dibuka lewat browser tanpa dipasang; bahannya **HTML** (kerangka), **CSS** (tampilan), **JavaScript** (perilaku), dan **server** (penyimpanan di kejauhan).
- Alat yang kini terpasang: **VS Code** (editor), **Live Server** (menjalankan halaman lokal), **Chrome + DevTools** (memeriksa), **Node.js** (untuk alat deploy nanti). Git dan Firebase menyusul di bab lain.
- File **`index.html`** adalah halaman utama; dijalankan lewat **klik kanan → Open with Live Server**, bukan dibuka langsung — karena fitur lanjutan (data, modul, offline) butuh alamat `http://`.
- **Terminal** (Terminal → New Terminal) adalah tempat mengetik perintah; kita mulai dengan `node --version`.

**Berikutnya:** [Bab 02 — Fondasi Web & Struktur Proyek](02-fondasi-web-dan-struktur-proyek.md)
