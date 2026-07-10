# PROGRESS — Web App Tumara

> Catatan handoff untuk melanjutkan pengerjaan di sesi Claude Code berikutnya.

## Status: ✅ SEMUA MODUL SELESAI (v1.0)

Semua file rancangan sudah dibuat dan Firebase sudah AKTIF.

## Konteks Proyek

- Sumber rancangan: `Rancangan-Web-App-Tumara.md` (aplikasi pendamping siswa, 3 pilar: Kesehatan, Produktivitas, Keuangan).
- Teknologi: **HTML + CSS + vanilla JS murni** (tanpa framework).
- Arsitektur halaman (multi-page):
  - `index.html` — **company profile / landing page** (CSS sendiri: `css/index.css`)
  - `auth.html` — halaman masuk/daftar (pakai `css/style.css`)
  - `app.html` — shell aplikasi/dasbor SPA (pakai `css/style.css`; view dirender JS)
- Database: **Firebase AKTIF** (`USE_FIREBASE = true`, config project `tumara-id` sudah diisi di `js/firebase-config.js`). Adapter Firebase Auth + Firestore ada di `js/db.js`. Bila ingin mode offline/lokal, ubah `USE_FIREBASE = false` → otomatis pakai localStorage.
- Bahasa UI: Indonesia. Desain: elegan, modern, mobile-first, mode terang/gelap (app), font Plus Jakarta Sans, ikon Ionicons 7 (CDN).
- Warna pilar: hijau = kesehatan (`--health`), ungu = produktivitas (`--prod`), amber = keuangan (`--fin`). Brand: emerald.

## Struktur File

```
Tumara/
├── Rancangan-Web-App-Tumara.md   (sumber rancangan — jangan diubah)
├── PROGRESS.md                    (file ini)
├── index.html                 ✅ landing page / company profile (nav, hero + mock preview, pilar, fitur, cara kerja, skor keseimbangan, tentang, testimoni, CTA, footer)
├── auth.html                  ✅ halaman masuk/daftar (bootstrap inline: sudah login → redirect app.html)
├── app.html                   ✅ shell aplikasi (onboarding screen, sidebar+bottom-nav, topbar, modal/toast root, urutan <script>)
├── firebase.json / .firebaserc / 404.html  (Firebase Hosting)
├── css/
│   ├── index.css              ✅ gaya landing page (terpisah dari aplikasi)
│   └── style.css              ✅ design system aplikasi (token light/dark, shell, card, btn, form, dst.)
└── js/
    ├── firebase-config.js     ✅ config project tumara-id + USE_FIREBASE = true
    ├── utils.js               ✅ $/$$, esc, uid, tanggal/format, fmtRp, toast, modal, chart SVG, beep, downloadJSON
    ├── calc.js                ✅ BMR/TDEE/BMI, target air, siklus tidur, skor keseimbangan
    ├── db.js                  ✅ DB API + LocalAdapter + FirebaseAdapter (dipilih via USE_FIREBASE)
    └── views/
        ├── auth.js            ✅ AuthView (login/daftar → redirect app.html) + OnboardView (dipakai app.html)
        ├── dashboard.js       ✅ hero + skor, aksi cepat, 3 kartu pilar
        ├── health.js          ✅ tab today/calc/sleep/sport
        ├── productivity.js    ✅ tab tugas/catatan/jadwal/fokus (Pomodoro)
        ├── finance.js         ✅ tab transaksi/target/laporan + Fin.openTxModal (dipakai dashboard)
        ├── encyclopedia.js    ✅ ensiklopedia: artikel statis 3 pilar (cari, filter kategori, detail, bookmark via localStorage `tumara_ency_bm`)
        └── profile.js         ✅ data diri, preferensi (tema, pengingat minum), akun (sandi/ekspor/reset/keluar)
    (dan js/app.js             ✅ router App: init → redirect auth.html bila belum login; navigate/refresh/tema/water reminder)
```

## Alur Halaman

```
index.html (landing) ──"Masuk/Daftar"──▶ auth.html
auth.html: DB.init() → sudah login? ──▶ app.html ; belum → form login/daftar → sukses → app.html
app.html : DB.init() → belum login? ──▶ auth.html ; belum onboarding → OnboardView ; lengkap → dasbor
Logout (Profil) ──▶ auth.html
```

## Catatan penting antar-modul (jangan ganti namanya)

`App.navigate(route)`, `App.refresh()`, `App.route`, `App.afterAuth()`, `App.showAuth()`,
`App.setTheme(t)`, `App.startWaterReminder()`, `App.stopWaterReminder()`,
`Fin.openTxModal()`, `Prod.openTaskModal()`, `Prod.tab`, `Profile._inisial(nama)`,
view objects: `Dashboard`, `Health`, `Prod`, `Fin`, `Ency`, `Profile`, `AuthView`, `OnboardView`.

Modul Ensiklopedia (route `encyclopedia`, view `Ency` di `js/views/encyclopedia.js`):
konten artikel statis di `Ency.ARTIKEL` (id unik, kategori health/prod/fin, isi = array `{h?, p?, list?}`),
gaya di `css/style.css` bagian "ENSIKLOPEDIA" (prefix `.ency-*`), tidak menyentuh Firestore.

## Setup Firebase (console.firebase.google.com, project: tumara-id)

Wajib dipastikan agar login berfungsi:
1. **Authentication** → Sign-in method → aktifkan **Email/Password** dan **Google** (login Google via `DB.loginGoogle()`, tombol "Lanjutkan dengan Google" di auth.html; akun Google baru otomatis diarahkan ke onboarding).
2. **Cloud Firestore** → buat database (region asia-southeast).
   Catatan: domain tempat app dihosting harus terdaftar di Authentication → Settings → **Authorized domains** (localhost & *.web.app sudah default).
3. Firestore **Rules**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
4. Deploy: `firebase deploy` (hosting `public: "."` sudah diatur, multi-page tanpa rewrite).

## Verifikasi manual (checklist uji)

- Buka `index.html` → landing tampil, tombol Masuk/Daftar → `auth.html`.
- Daftar akun baru → onboarding → dasbor; refresh `app.html` → sesi tetap (Firebase Auth).
- Semua tab Kesehatan/Produktivitas/Keuangan; tambah/edit/hapus di tiap modul.
- Aksi cepat dashboard (+air, +transaksi, +tugas, timer fokus).
- Profil: simpan data diri (target dihitung ulang), tema gelap, pengingat minum, ganti sandi, ekspor, reset data, keluar.
- Responsive mobile (≤860px bottom-nav muncul di app; burger menu di landing).
- Console bersih (ionicons & Firebase SDK butuh internet).

## Keputusan desain yang sudah diambil

- Scope Opsi A (siswa saja); "Isi Piringku" (bukan 4 sehat 5 sempurna); framing positif untuk streak bebas rokok/miras; disclaimer kesehatan di onboarding, dashboard, kalkulator, profil, dan footer landing.
- Skor Keseimbangan = rata-rata skor health/prod/fin (logika di `calc.js`).
- Menit olahraga harian disinkronkan dari log workout ke `health_daily.olahraga` via `Health._syncDailySport(tanggal)`.
- Landing page satu tema terang yang elegan; aplikasi mendukung terang/gelap.
