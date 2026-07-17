# Bab 04 — Menyiapkan Firebase

> **Tujuan bab ini:** Anda punya proyek Firebase sendiri dengan Authentication (Email/Password) dan Cloud Firestore aktif, Firebase CLI terpasang di komputer Anda, dan file `js/firebase-config.js` terisi konfigurasi proyek itu.

| | |
|---|---|
| **Perkiraan waktu** | ~50 menit |
| **Sebelum ini** | [Bab 03 — Halaman Depan & Sistem Desain](03-halaman-depan-dan-desain.md) |
| **Anda butuh** | Akun Google, koneksi internet, Node.js terpasang (untuk Firebase CLI di langkah 8), folder proyek dari Bab 02–03 |

## Apa yang kita bangun di bab ini

Sejauh ini Anda baru membangun **tampilan** — belum ada tempat menyimpan data. Di bab ini Anda pergi ke luar editor, ke situs console.firebase.google.com, dan menyiapkan "gudang" tempat data Tumara nanti disimpan: siapa saja yang boleh masuk (Authentication), dan di mana datanya duduk (Cloud Firestore).

Hasil akhirnya satu file baru:

```
js/
└── firebase-config.js     ← config proyek Firebase Anda sendiri
```

File ini belum dipakai oleh kode apa pun — itu pekerjaan Bab 05, saat kita membangun `js/db.js` yang membacanya. Bab ini murni tentang **menyiapkan gudangnya**, belum tentang cara memakainya.

## 1. Apa itu Firebase, dan kenapa Tumara memakainya

Membangun aplikasi yang menyimpan data sungguhan butuh tiga hal yang berat kalau dibangun sendiri: server yang menyala 24 jam, sistem untuk memeriksa siapa yang login, dan database yang aman dari orang asing. Membangun ketiganya dari nol butuh waktu berbulan-bulan dan pengetahuan server yang jauh di luar cakupan modul ini.

**Firebase** adalah layanan milik Google yang menyediakan ketiganya siap pakai. Anda tidak menyewa server sendiri, tidak menginstal database sendiri — Anda cukup mendaftar, menyalakan fiturnya, dan memakainya lewat kode JavaScript biasa.

> **Analogi sekolah:** membangun server sendiri itu seperti sekolah membangun gedung sendiri dari nol — beli tanah, bikin pondasi, pasang listrik. Memakai Firebase itu seperti menyewa gedung yang sudah punya satpam di pintu depan dan lemari arsip terkunci di dalamnya. Anda tinggal mengatur siapa boleh masuk dan apa yang disimpan di lemari mana.

Tumara memakai dua layanan Firebase:

- **Authentication** — "satpam di pintu depan". Tugasnya memeriksa identitas: memverifikasi email dan kata sandi saat seseorang mendaftar atau masuk, lalu memberi tanda pengenal (*session*) yang menandai "orang ini sudah terverifikasi sebagai si Anu".
- **Cloud Firestore** — "lemari arsip". Tempat semua data Tumara duduk: profil pengguna, catatan kesehatan, tugas, absensi, jadwal kelas. Firestore adalah **database NoSQL berbasis dokumen** — istilah ini dibongkar pelan-pelan di Bagian 2.

Kira-kira begini posisi keduanya terhadap aplikasi Anda:

```
   Browser pengguna (app.html, guru.html, admin.html, ...)
              │
              │  "siapa Anda?"          "tolong ambilkan/simpan data"
              ▼                                  ▼
      ┌───────────────┐                 ┌────────────────┐
      │ Authentication │                 │ Cloud Firestore│
      │  (satpam)      │                 │  (lemari arsip)│
      └───────────────┘                 └────────────────┘
```

Ada satu layanan Firebase lagi yang akan Anda temui belakangan: **Firebase Hosting**, tempat Tumara nanti "tayang" di internet (dibahas tuntas di Bab 14). Dan satu hal yang **bukan** Firebase: foto (foto profil, foto jurnal guru) disimpan di layanan lain bernama **Supabase Storage**, bukan di Firebase — alasannya dibahas di Bab 10. Jadi jangan kaget kalau nanti Anda melihat dua layanan cloud berbeda di proyek yang sama; masing-masing dipilih untuk pekerjaan yang paling cocok untuknya.

Satu hal lagi yang layak diketahui sebelum mulai: proyek Firebase baru otomatis berada di **paket Spark**, yaitu paket **gratis**. Authentication dan Firestore di paket ini punya jatah pemakaian harian (misalnya jatah baca dan tulis Firestore per hari) — cukup besar untuk latihan, bahkan cukup untuk sekolah kecil-menengah dalam pemakaian wajar. Anda tidak perlu memasukkan kartu kredit apa pun untuk bab ini. Jatah baca inilah yang nanti melatarbelakangi keputusan desain "cache" di `js/db.js`, dibahas panjang lebar di Bab 05 Bagian 8 — jadi tak perlu dipikirkan sekarang, cukup diketahui bahwa ia ada batasnya dan itu wajar.

Anda mungkin bertanya: kenapa tidak cukup **satu** layanan saja yang mengurus keduanya? Karena identitas dan data punya sifat yang berbeda. Authentication harus sangat ketat soal kata sandi (hashing, deteksi percobaan login bertubi-tubi, sesi yang aman) — ini pekerjaan khusus yang rumit kalau dibangun sendiri. Firestore harus sangat cepat membaca/menulis dokumen dalam jumlah besar — pekerjaan khusus yang berbeda lagi. Firebase memisahkan keduanya jadi dua layanan supaya masing-masing bisa dibuat sebaik mungkin di bidangnya, lalu Anda tinggal menyambungkan keduanya lewat satu `FIREBASE_CONFIG` yang sama (Bagian 6).

## 2. Model data Firestore, secara konsep dulu

Sebelum membuka console, penting Anda paham **bentuk** data di Firestore — supaya langkah-langkah nanti tidak terasa seperti mengklik tombol asing. Firestore menata data dalam tiga tingkat, dan modul ini akan memakai istilah ini terus-menerus mulai sekarang:

- **Koleksi** (*collection*) — sebuah laci besar berisi banyak berkas sejenis. Contoh: koleksi `users` berisi berkas semua pengguna Tumara (siswa, guru, admin).
- **Dokumen** (*document*) — satu berkas di dalam laci itu, punya **ID** unik sebagai label di luar berkasnya. Contoh: di dalam koleksi `users`, ada satu dokumen per pengguna, dan ID dokumennya adalah `uid` (*user ID*, kode unik yang diberikan Authentication saat orang itu mendaftar).
- **Field** — isi di dalam satu berkas. Contoh: dokumen pengguna punya field `nama`, `role`, `kelasId`, dan seterusnya.

> **Analogi arsip:** koleksi = laci lemari arsip. Dokumen = map di dalam laci itu, dengan label nomor di sampulnya. Field = lembar-lembar kertas di dalam map itu — nama, kelas, tanggal lahir.

Ada satu detail yang sering membingungkan pemula, dan akan terus penting sampai bab-bab berikutnya: **ID dokumen bukan bagian dari isi field-nya.** Label di sampul map (ID) dan isi kertas di dalamnya (field) adalah dua hal terpisah di Firestore. Kalau Anda membaca satu dokumen dan hanya mengambil isinya, Anda **tidak** otomatis dapat ID-nya — kode harus menyisipkannya sendiri secara manual. Di Bab 05 Anda akan melihat baris kode yang melakukan persis ini, di hampir setiap fungsi baca data:

```js
{ id: d.id, ...d.data() }
```

Tidak perlu paham baris itu sekarang — cukup ingat: **ID dan field adalah dua hal terpisah.** Ini penjelasan konsepnya; praktiknya menyusul di Bab 05.

Sekadar gambaran, begini kira-kira bentuk satu dokumen di koleksi `users` nanti:

```
koleksi: users
  └── dokumen (ID = "a1b2c3...", uid dari Authentication)
        ├── nama: "Budi Santoso"
        ├── role: "siswa"
        ├── kelasId: "7A"
        └── nis: "2024001"
```

Istilah "database NoSQL berbasis dokumen" sekarang bisa dibongkar: **NoSQL** berarti Firestore tidak memakai tabel dan baris seperti Excel atau MySQL, melainkan koleksi dan dokumen seperti di atas — lebih longgar, tiap dokumen boleh punya field yang berbeda-beda. **Berbasis dokumen** berarti satuan data terkecilnya adalah satu dokumen utuh (satu map), bukan satu baris tabel.

## 3. Membuat proyek Firebase

1. Buka **console.firebase.google.com** di browser, masuk dengan akun Google Anda.
2. Klik **"Add project"** / **"Tambah proyek"**.
3. Beri nama proyek, misalnya `tumara-latihan`. Firebase akan otomatis menyarankan ID proyek (mis. `tumara-latihan-a1b2c`) — biarkan saja, atau ubah kalau mau, asal Anda ingat ID-nya karena akan muncul lagi nanti. **ID proyek harus unik di seluruh Firebase sedunia** (bukan cuma di antara proyek Anda sendiri) — itu sebabnya Firebase menambahkan akhiran acak seperti `-a1b2c`; nama yang polos seperti `tumara` kemungkinan besar sudah dipakai orang lain.
4. Firebase akan menawarkan **Google Analytics**. Untuk latihan ini, **matikan saja** (opsional, tidak dipakai Tumara). Ini menyederhanakan proses dan mengurangi hal yang perlu Anda urus.
5. Klik **"Create project"**, tunggu beberapa detik sampai selesai disiapkan.

Anda sekarang punya proyek Firebase kosong. Belum ada Authentication, belum ada Firestore — keduanya harus dinyalakan manual, itu langkah berikutnya.

## 4. Mengaktifkan Authentication

1. Di sidebar kiri console, klik **"Build" → "Authentication"**.
2. Klik **"Get started"**.
3. Buka tab **"Sign-in method"**.
4. Klik **"Email/Password"** dari daftar provider, nyalakan toggle-nya, lalu **Save**. Ini **wajib** — seluruh sistem masuk/daftar Tumara berdiri di atas metode ini (dibahas tuntas Bab 06).
5. Anda mungkin melihat provider **Google** di daftar yang sama. Ini **opsional** — Tumara punya jalur masuk lewat akun Google, tapi hanya dipakai sebagai jalur cepat untuk mencoba aplikasi (*trial*), bukan jalur utama sekolah sungguhan (yang memakai NIS/NIP sebagai kata sandi). Anda boleh melewatinya untuk sekarang.

> ⚠️ **Jujur soal ini:** kalau Anda lupa mengaktifkan Email/Password dan langsung lanjut ke bab berikutnya, aplikasi tidak akan diam-diam gagal — ia akan menunjukkan pesan error yang jelas. Kode di `js/db.js` sudah menyiapkan terjemahan pesan error Firebase, termasuk persis untuk kasus ini:
> ```js
> // js/db.js
> 'auth/operation-not-allowed': tr('Metode login ini belum diaktifkan di Firebase Console → Authentication → Sign-in method.', ...)
> ```
> Jadi kalau nanti Anda mendaftar/masuk dan layar menampilkan pesan itu, Anda tahu persis harus kembali ke langkah 4 di atas.

## 5. Membuat Cloud Firestore

1. Di sidebar kiri, klik **"Build" → "Firestore Database"**.
2. Klik **"Create database"**.
3. Pilih lokasi (*region*). Untuk sekolah di Indonesia, pilih salah satu region **asia-southeast**, misalnya `asia-southeast2` (Jakarta) — data akan lebih dekat secara fisik, sehingga lebih cepat diakses. Perhatikan baik-baik sebelum melanjutkan.
4. Pilih mode **"Start in production mode"** (mode produksi). Ini artinya Firestore mulai dalam keadaan **terkunci** — tidak ada yang bisa membaca atau menulis apa pun sampai Anda memasang **Security Rules** (aturan akses tertulis, dibahas tuntas di Bab 12).
5. Klik **"Create"**, tunggu sampai database selesai disiapkan.

> ⚠️ **Region tidak bisa diubah setelah dipilih.** Kalau Anda salah pilih region dan sadar belakangan, satu-satunya jalan adalah membuat proyek Firebase baru. Karena ini proyek latihan, itu bukan masalah besar — tapi ingat ini kalau nanti membuat proyek untuk sekolah sungguhan.

Karena mode produksi mengunci semuanya dan Security Rules baru dibahas Bab 12, untuk **latihan di bab ini saja** Anda boleh sementara membuka tab **"Rules"** di Firestore dan menggantinya dengan mode tes berbatas waktu, supaya Anda bisa mencoba baca/tulis sebelum Bab 12:

```
allow read, write: if request.time < timestamp.date(2026, 8, 17);
```

> ⚠️ **Ini benar-benar sementara, bukan solusi.** Aturan di atas mengizinkan **siapa saja di internet** membaca dan menulis seluruh database Anda selama tanggal itu belum lewat. Ini hanya untuk latihan pribadi dengan data kosong/palsu. **Jangan pernah** memakai aturan ini untuk data sekolah sungguhan. Aturan yang benar — yang membedakan admin, guru, dan siswa — ditulis lengkap di Bab 12, dan wajib dipasang sebelum aplikasi dipakai orang sungguhan.

## 6. Mengambil konfigurasi web

Firestore dan Authentication sudah aktif di sisi Google. Sekarang Anda perlu "kunci" yang menghubungkan kode JavaScript Anda ke proyek ini.

1. Di console, klik ikon **gerigi (⚙)** di sebelah "Project Overview" → **"Project settings"**.
2. Gulir ke bawah ke bagian **"Your apps"**. Klik ikon **`</>`** (Web) untuk mendaftarkan aplikasi web baru.
3. Beri nama, misalnya "Tumara Web". Anda **tidak perlu** mencentang "Also set up Firebase Hosting" sekarang — itu dibahas Bab 14.
4. Firebase mungkin menawarkan dua cara memakai SDK-nya: lewat **npm** (memasang paket Node dan memakai *bundler*) atau lewat **CDN/config object** langsung. **Abaikan pilihan npm.** Ingat batasan Tumara di Bab 02: tidak ada `npm install` untuk aplikasinya, tidak ada langkah *build*. Yang Anda butuhkan hanyalah objek konfigurasinya — bagian SDK-nya sendiri sudah diatur nanti lewat `import()` dinamis di `js/db.js` (Bab 05 Bagian 4), jadi Anda tidak perlu menambahkan `<script>` SDK apa pun secara manual.
5. Klik **"Register app"**. Firebase menampilkan sebuah objek JavaScript berisi konfigurasi proyek Anda — kira-kira berbentuk:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "tumara-latihan-a1b2c.firebaseapp.com",
     projectId: "tumara-latihan-a1b2c",
     storageBucket: "tumara-latihan-a1b2c.appspot.com",
     messagingSenderId: "...",
     appId: "1:...:web:..."
   };
   ```
6. Salin nilai-nilainya (bukan disalin dari contoh di atas — dari console Anda sendiri, karena tiap proyek punya nilai berbeda).

Sekarang buat file baru `js/firebase-config.js` di folder proyek Anda:

```js
// js/firebase-config.js
const USE_FIREBASE = true;

const FIREBASE_CONFIG = {
  apiKey: "AIza...(punya proyek Anda)",
  authDomain: "tumara-latihan-a1b2c.firebaseapp.com",
  projectId: "tumara-latihan-a1b2c",
  storageBucket: "tumara-latihan-a1b2c.appspot.com",
  messagingSenderId: "...",
  appId: "1:...:web:..."
};

const ADMIN_EMAILS = [
  'admin@sekolahanda.id'
];
```

Tempel nilai-nilai dari langkah 5 tadi ke `FIREBASE_CONFIG`, ganti `apiKey` di atas dengan `apiKey` proyek Anda sendiri (bukan disalin apa adanya dari modul ini — modul ini sengaja hanya menulis placeholder).

Mari bongkar tiga bagian file ini satu per satu:

**`USE_FIREBASE`** — ini sebuah **saklar**. Bernilai `true` berarti aplikasi memakai Firebase (internet). Bernilai `false` berarti aplikasi memakai `localStorage` — gudang kecil di dalam browser Anda sendiri, tanpa internet sama sekali. Saklar ini, dan bagaimana kode di `js/db.js` membacanya, adalah inti Bab 05. Untuk sekarang, biarkan `true`.

**`FIREBASE_CONFIG`** — bukan rahasia dalam arti kata sandi. Ini lebih mirip alamat: "kode ini bicara ke proyek Firebase yang mana". Detailnya dibahas di kotak peringatan Bagian 7 di bawah.

**`ADMIN_EMAILS`** — daftar alamat email yang otomatis mendapat peran **admin** begitu mendaftar/masuk memakai email itu. Ini yang disebut *bootstrap*: cara memunculkan admin pertama tanpa harus membuka Firestore secara manual dan mengetik `role: 'admin'` sendiri. Begitu Anda punya satu akun admin, akun itu yang membuatkan akun guru dan siswa lewat panel admin (Bab 11) — jadi Anda hanya perlu mekanisme "ajaib" ini **satu kali**, untuk admin yang pertama. Isi dengan email admin sekolah Anda, huruf kecil semua.

> ⚠️ **Jujur soal ini:** daftar `ADMIN_EMAILS` ini dibaca dan dipercaya **di sisi klien** — di dalam kode JavaScript yang berjalan di browser pengguna, bukan di server. Kode di `js/db.js` memeriksa "apakah email yang baru login ada di daftar ini?", lalu menulis `role: 'admin'` ke dokumen profil pengguna itu sendiri. Firestore Security Rules (Bab 12) hanya memeriksa "apakah pemilik dokumen ini boleh menulis dokumennya sendiri?" — **bukan** "apakah emailnya memang cocok dengan `ADMIN_EMAILS`". Untuk pemakaian sekolah yang wajar (Anda mengontrol siapa yang tahu daftar email admin) ini cukup aman, tapi penting Anda tahu batasnya: mekanisme ini bergantung pada kerahasiaan daftar email, bukan pada pemeriksaan server yang ketat. Ini dibahas lagi lebih dalam di Bab 12 saat kita menulis Security Rules-nya.

## 7. Soal keamanan `apiKey` — jujur, jangan cuma menakut-nakuti

> ⚠️ **Jujur soal ini:** `apiKey` Firebase **memang boleh publik.** Ia ikut terkirim ke browser setiap pengunjung situs Anda — siapa pun yang membuka DevTools bisa melihatnya. Ini **bukan** kebocoran keamanan; ini memang cara kerja aplikasi web yang berjalan sepenuhnya di sisi klien seperti Tumara. `apiKey` cuma memberi tahu Firebase "permintaan ini datang dari proyek yang mana", bukan "pemegangnya boleh melakukan apa saja".
>
> Keamanan yang **sesungguhnya** ada di dua tempat lain:
> 1. **Security Rules** Firestore (Bab 12) — aturan tertulis di server Google yang menentukan siapa boleh membaca/menulis dokumen apa. Ini yang benar-benar menjaga data, terlepas dari siapa yang tahu `apiKey`.
> 2. **Pengaturan Authentication** — mis. domain mana yang diizinkan mengakses (*Authorized domains*), metode masuk mana yang aktif.
>
> Jadi jangan panik kalau `apiKey` terlihat di kode sumber halaman web Anda — itu memang tempatnya. **Yang sebaliknya harus Anda jaga ketat:** jangan pernah menaruh rahasia sungguhan (kunci layanan pihak ketiga, token dengan hak admin penuh, kata sandi database) di file yang ikut terkirim ke browser pengguna, seperti `firebase-config.js` ini. `apiKey` Firebase aman untuk publik; rahasia layanan lain tidak.

Ada satu pengaturan lagi di Authentication yang berhubungan dengan keamanan dan akan Anda temui lagi di Bab 14: **Authorized domains** (Authentication → Settings → Authorized domains). Ini daftar alamat web yang boleh memakai Authentication proyek Anda untuk memproses login. Secara bawaan, domain uji coba Firebase (`*.firebaseapp.com`, `*.web.app`) dan `localhost` sudah masuk daftar — cukup untuk latihan di bab ini. Kalau nanti Anda memasang domain sendiri untuk sekolah (mis. `tumara.sekolahanda.id`), domain itu harus ditambahkan ke daftar ini juga, atau proses login akan ditolak walau `apiKey` dan konfigurasinya sudah benar.

## 8. Memasang Firebase CLI

Sejauh ini semua dilakukan lewat website console — klik sana-sini di browser. Untuk langkah-langkah berikutnya di modul ini (terutama deploy Security Rules di Bab 12, dan publikasi aplikasi di Bab 14), Anda butuh **Firebase CLI** (*Command Line Interface* — alat baris perintah) terpasang di komputer.

> **Kalau Anda belum pernah memakai terminal:** **CLI** adalah cara memberi perintah ke komputer dengan **mengetik teks**, bukan mengklik tombol. **Terminal** adalah jendela tempat Anda mengetik perintah itu — di VS Code, ada tab "Terminal" di bagian bawah editor. Ini terasa asing di awal, tapi Anda hanya perlu menghafal segelintir perintah untuk modul ini (`firebase login`, `firebase init`, dan nanti `firebase deploy` di Bab 14) — bukan menguasai seluruh dunia baris perintah.

1. Buka terminal (di VS Code: menu **Terminal → New Terminal**). Pastikan Node.js sudah terpasang (`node -v` harus menampilkan versi, bukan error) — kalau belum, pasang dari nodejs.org terlebih dulu.
2. Pasang Firebase CLI secara global:
   ```bash
   npm install -g firebase-tools
   ```
3. Masuk dengan akun Google Anda:
   ```bash
   firebase login
   ```
   Ini akan membuka browser, minta Anda memilih akun Google, lalu kembali ke terminal dengan pesan sukses.
4. Di folder proyek Tumara Anda, jalankan:
   ```bash
   firebase init
   ```
   Anda akan ditanya beberapa hal:
   - **"Which Firebase features?"** — pilih **Firestore** dan **Hosting** (tekan spasi untuk mencentang, lalu Enter).
   - **"Please select an option"** untuk proyek — pilih **"Use an existing project"**, lalu pilih proyek yang tadi Anda buat di Bagian 3.
   - Pertanyaan seputar Firestore rules/index — boleh terima nama file bawaan (`firestore.rules`, `firestore.indexes.json`).
   - **"What do you want to use as your public directory?"** — ketik **`.`** (titik, artinya folder saat ini). Ini penting: Tumara tidak punya folder `build` atau `dist` terpisah seperti proyek dengan *build step* — semua file HTML/CSS/JS yang Anda tulis langsung dipakai apa adanya (lihat Bab 02).
   - **"Configure as a single-page app?"** — jawab **No**. Tumara punya beberapa halaman HTML terpisah (`index.html`, `auth.html`, `app.html`, dst.), bukan satu halaman yang mengatur semuanya lewat JavaScript.

Setelah selesai, `firebase init` membuat (atau memperbarui) dua file konfigurasi. Ini ringkasannya dari proyek Tumara sungguhan, supaya Anda tahu bentuk yang wajar:

```json
// .firebaserc
{
  "projects": {
    "default": "tumara-id"
  }
}
```

File ini cuma mengingat "proyek Firebase default untuk folder ini" supaya Anda tak perlu mengetik nama proyek tiap kali menjalankan perintah `firebase`.

```json
// firebase.json (diringkas)
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": ".",
    "predeploy": ["node scripts/stamp-version.js"],
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**", "docs/**", "*.md"]
  }
}
```

Tiga hal yang layak diperhatikan sekarang, meski dibahas tuntas di Bab 14:

- **`"public": "."`** — persis yang Anda pilih di langkah 4: seluruh folder proyek adalah yang dipublikasikan, bukan folder hasil *build* terpisah.
- **`"ignore"`** — daftar file/folder yang **tidak** ikut diunggah saat deploy, termasuk `docs/**` (folder modul ajar ini sendiri!) dan file `.md`. Dokumentasi tidak perlu ikut tayang ke internet bersama aplikasinya.
- **`"predeploy": ["node scripts/stamp-version.js"]`** — sebuah skrip yang otomatis berjalan **sebelum** tiap deploy, menuliskan nomor versi baru ke `version.json` (dipakai `js/version-check.js` untuk memberi tahu pengguna lama "ada versi baru, muat ulang halaman"). Tidak perlu Anda pahami isinya sekarang — cukup tahu ia ada dan berjalan otomatis.

`firebase init` mungkin juga menawarkan **Emulators** (versi Firestore/Authentication yang berjalan di komputer Anda sendiri, bukan di internet, untuk dicoba-coba tanpa memakai jatah kuota sungguhan). Ini opsional dan tidak dipakai modul ini — boleh dilewati (jangan dicentang) untuk sekarang. Cukup tahu bahwa fitur ini ada, kalau nanti Anda ingin bereksperimen lebih jauh di luar modul.

Untuk bab ini, cukup sampai `firebase login` dan `firebase init` berhasil tanpa error. **Deploy sungguhan** (`firebase deploy`) baru dilakukan di Bab 14, setelah aplikasi Anda punya sesuatu yang layak dipublikasikan.

---

## ✅ Cek hasil

- [ ] Di **Firebase Console → Authentication → Sign-in method**, baris **Email/Password** berstatus "Enabled".
- [ ] Di **Firebase Console → Firestore Database**, Anda melihat database kosong (belum ada koleksi apa pun — itu wajar, koleksi baru muncul saat aplikasi menulis data pertama kali).
- [ ] Terminal: `firebase login` menampilkan email akun Google Anda saat dijalankan ulang tanpa membuka browser lagi (artinya sesi sudah tersimpan).
- [ ] File `js/firebase-config.js` ada di folder proyek, berisi `USE_FIREBASE`, `FIREBASE_CONFIG` (dengan nilai **proyek Anda sendiri**, bukan placeholder), dan `ADMIN_EMAILS`.
- [ ] Buka `js/firebase-config.js` di editor sekali lagi dan pastikan **tidak ada** nilai yang masih bertuliskan `"AIza...(punya proyek Anda)"` — itu tanda Anda lupa menempel config asli.
- [ ] File `.firebaserc` dan `firebase.json` muncul di folder proyek setelah `firebase init`.
- [ ] Di **Firebase Console → ⚙ Usage and billing**, proyek Anda tercatat pada paket **Spark (gratis)** — tidak diminta kartu kredit.
- [ ] Anda bisa menjelaskan dengan kata-kata sendiri: apa bedanya "koleksi", "dokumen", dan "field" — tanpa membuka kembali Bagian 2.

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| `firebase: command not found` | Firebase CLI belum terpasang, atau Node.js/npm belum ada | Pasang Node.js dari nodejs.org dulu, lalu `npm install -g firebase-tools` ulang |
| Error `auth/operation-not-allowed` saat mendaftar (nanti, di Bab 06) | Metode Email/Password belum diaktifkan di console | Kembali ke Bagian 4, aktifkan di Authentication → Sign-in method |
| Salah pilih region Firestore | Region tidak bisa diubah setelah database dibuat | Buat proyek Firebase baru dengan region yang benar |
| Firestore menolak semua baca/tulis walau sudah login | Masih dalam mode produksi terkunci, belum pasang Security Rules atau mode tes | Untuk latihan, pasang aturan tes berbatas waktu (Bagian 5); untuk aplikasi sungguhan, tuntaskan Bab 12 |
| `firebase init` menimpa file yang sudah ada | CLI menanyakan konfirmasi overwrite untuk file yang sudah ada | Baca tiap prompt baik-baik, jawab "No" kalau tidak yakin, atau backup dulu |
| Lupa menyalin config, `FIREBASE_CONFIG` masih placeholder | Belum menempel nilai dari Project settings → Your apps | Kembali ke Bagian 6, ambil nilai dari console proyek Anda sendiri |
| Nama proyek/ID sudah dipakai | ID proyek Firebase harus unik sedunia | Ganti sedikit, mis. tambahkan angka atau kata lain (`tumara-latihan-budi`) |
| `firebase login` terus meminta login ulang tiap kali dijalankan | Sesi login belum tersimpan, atau memakai profil browser berbeda | Jalankan `firebase login` sekali lagi dan pastikan proses di browser diselesaikan sampai muncul pesan sukses di terminal |
| Login gagal setelah aplikasi dipindah ke domain sendiri (nanti, Bab 14) | Domain baru belum masuk **Authorized domains** | Authentication → Settings → Authorized domains → tambahkan domain hosting Anda |
| Salah pilih "npm" saat mendaftarkan Web App, jadi bingung soal `import` SDK | Firebase menampilkan dua opsi cara pakai SDK, npm dan CDN/config biasa | Abaikan bagian npm-nya; cukup salin objek `firebaseConfig`. SDK-nya sudah diurus `js/db.js` di Bab 05 |

## 🧪 Latihan

1. **Tambah dokumen manual.** Di Firebase Console → Firestore Database, klik "Start collection", beri nama koleksi `users`, lalu buat satu dokumen dengan ID bebas dan dua field: `nama` (string) dan `role` (string, isi `"admin"`). Perhatikan bentuknya: ID di atas, field di dalamnya — persis konsep koleksi/dokumen/field di Bagian 2.
2. **Baca ulang kotak peringatan Bagian 7.** Tanpa membuka modul ini lagi, jelaskan ke rekan guru: kenapa `apiKey` boleh terlihat semua orang, dan apa yang sebenarnya menjaga keamanan data.
3. **Tambah satu email lagi ke `ADMIN_EMAILS`.** Simpan filenya. Bayangkan Anda adalah kepala sekolah yang ingin wakil kepala sekolah juga bisa mengelola akun guru/siswa — email siapa yang perlu ditambahkan, dan kenapa cukup menambah ke daftar ini saja (belum menyentuh Firestore sama sekali)?
4. ⭐ **Ubah `USE_FIREBASE` jadi `false`, lalu kembalikan ke `true`.** Simpan filenya tiap kali. Sebelum membaca Bab 05, tuliskan tebakan Anda: apa yang berbeda pada aplikasi saat saklar ini `false`? Cocokkan jawaban Anda dengan penjelasan lengkap di Bab 05 Bagian 2.

## 📌 Ringkasan

- Tumara memakai dua layanan Firebase: **Authentication** (memverifikasi siapa yang masuk) dan **Cloud Firestore** (database tempat data disimpan). Foto disimpan terpisah di Supabase (Bab 10); publikasi situs lewat Firebase Hosting (Bab 14).
- Firestore menata data dalam tiga tingkat: **koleksi** (laci) → **dokumen** (map, punya ID) → **field** (isi map). ID dokumen **tidak** termasuk isi field-nya — kode harus menyisipkannya manual, dibahas tuntas Bab 05.
- Authentication butuh metode **Email/Password diaktifkan manual** di console — kalau lupa, aplikasi memberi pesan error yang jelas (`auth/operation-not-allowed`), bukan gagal diam-diam.
- Firestore dimulai dalam **mode produksi terkunci**. Mode tes berbatas waktu boleh dipakai sementara untuk latihan pribadi; aturan yang benar untuk data sekolah sungguhan ditulis di Bab 12.
- `js/firebase-config.js` berisi tiga hal: saklar **`USE_FIREBASE`** (Firebase vs localStorage, tuntas di Bab 05), **`FIREBASE_CONFIG`** (alamat proyek Anda, boleh publik), dan **`ADMIN_EMAILS`** (bootstrap admin pertama).
- `apiKey` Firebase **boleh publik** — keamanan sesungguhnya ada di Security Rules (Bab 12), bukan di merahasiakan `apiKey`. Yang harus tetap dirahasiakan adalah rahasia layanan lain, bukan `apiKey` Firebase.
- Firebase CLI (`firebase login`, `firebase init`) disiapkan sekarang supaya siap dipakai di Bab 12 (deploy rules) dan Bab 14 (deploy penuh).

**Berikutnya:** [Bab 05 — Lapisan Data `db.js`](05-lapisan-data-db-js.md)
