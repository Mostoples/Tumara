# Tumara

> **Tumbuh sehat, produktif, terarah.**
> Web app pendamping harian siswa yang menyatukan **kesehatan**, **produktivitas**, dan **keuangan** dalam satu aplikasi yang seimbang.

Tumara ("bentukan dari *tumbuh*") adalah *super-app* untuk pelajar SMP/SMA/SMK. Alih-alih memakai banyak aplikasi terpisah (kalkulator kalori, pencatat tugas, buku kas), siswa cukup membuka satu layar untuk menjaga **tubuh, pikiran, dan dompet** tetap seimbang. Setiap pagi tampil satu ringkasan: kalori hari ini, tugas yang jatuh tempo, dan sisa uang jajan.

Aplikasi juga menyediakan portal **Guru** (kelas, absensi, penilaian, jurnal) dan panel **Admin** (kelola akun), serta modul **Ibadah** untuk siswa.

---

## ✨ Fitur

### 👩‍🎓 Siswa (`app.html`)
| Pilar | Fitur |
|---|---|
| **Kesehatan** | Kalkulator kalori (BMR/TDEE) & BMI, pengingat minum, log & target olahraga (+ estimasi kalori terbakar MET), siklus tidur, log berat & tren, biometrik (detak jantung, SpO2, tekanan darah, gula darah, langkah — input manual), nutrisi (log makanan + panduan *Isi Piringku*), pengingat obat, kesehatan mental (box-breathing + mood), siklus menstruasi (akun perempuan) |
| **Produktivitas** | Catatan, daftar tugas (mapel, tenggat, prioritas, label), tugas berulang otomatis, jadwal kelas, timer fokus Pomodoro, habit tracker (streak) |
| **Keuangan** | Pemasukan/pengeluaran + kategori, target menabung, anggaran per kategori, utang/piutang, dompet & aset (tunai/bank/e-wallet, emas/saham/reksadana), kunci PIN, laporan grafik + ekspor CSV |
| **Ibadah** | Checklist sholat & amalan, jadwal sholat + arah kiblat (GPS + Aladhan API), Al-Qur'an digital, tracker tilawah/hafalan, dzikir & doa harian, kalkulator zakat, catatan sedekah |
| **Lainnya** | Dashboard **Skor Keseimbangan**, profil & onboarding, tema terang/gelap, dwibahasa (ID/EN) |

### 👨‍🏫 Guru (`guru.html`)
Kelas & roster siswa (tambah massal), absensi (kode warna H/S/I/A/D + ekspor CSV), penilaian (KKM otomatis, rata-rata, ekspor CSV/PDF), jurnal mengajar (foto terkompres), jadwal mengajar.

### 🛡️ Admin (`admin.html`)
Kelola akun, buat akun guru/siswa, ubah peran, hapus akun.

### 📖 Ensiklopedia (`encyclopedia.html`)
Ensiklopedia publik (tanpa login) berisi artikel tentang kesehatan, produktivitas, keuangan, dan tahapan membangun aplikasi.

---

## 🛠️ Tech Stack

- **Frontend:** HTML + CSS + **vanilla JavaScript murni** (tanpa framework/bundler), multi-page.
- **Backend / Auth / DB:** **Firebase** — Authentication (Email/Password + Google) & Cloud Firestore.
- **Penyimpanan foto:** **Supabase Storage** (bucket `jurnal-foto` untuk foto jurnal guru).
- **PWA:** Service Worker (`sw.js`, network-first untuk HTML/JS/CSS), manifest, halaman offline.
- **Font & ikon:** Plus Jakarta Sans + Ionicons 7 (via CDN).
- **Hosting:** Firebase Hosting.
- **Mode lokal:** set `USE_FIREBASE = false` di `js/firebase-config.js` → seluruh data pindah ke `localStorage` (offline, tanpa internet).

---

## 📁 Struktur Proyek

```
Tumara/
├── index.html            Landing page / company profile
├── auth.html             Masuk / daftar
├── app.html              Shell aplikasi siswa (SPA, view dirender JS)
├── guru.html             Portal guru
├── admin.html            Panel admin
├── encyclopedia.html     Ensiklopedia publik
├── offline.html / 404.html
├── manifest.json / sw.js / version.json   (PWA)
├── firebase.json / .firebaserc / firestore.rules
├── css/
│   ├── index.css         Gaya landing page
│   └── style.css         Design system aplikasi (token light/dark, shell, card, form)
├── js/
│   ├── firebase-config.js  Config project + USE_FIREBASE + ADMIN_EMAILS
│   ├── db.js               DB API + LocalAdapter + FirebaseAdapter
│   ├── calc.js             BMR/TDEE/BMI, target air, siklus tidur, skor keseimbangan, MET
│   ├── utils.js            Helper: DOM, format, toast, modal, chart SVG
│   ├── roles.js            Peran & guard halaman (admin/guru/siswa)
│   ├── i18n.js             Dwibahasa ID/EN
│   ├── pwa.js / version-check.js
│   ├── supabase-storage.js Upload foto ke Supabase
│   ├── app.js              Router aplikasi siswa
│   └── views/              dashboard, health, productivity, finance, ibadah,
│                           encyclopedia, profile, auth, teacher, admin
└── assets/                 logo.png + icons PWA
```

### Alur halaman
```
index.html ──"Masuk/Daftar"──▶ auth.html
auth.html  → login? → arahkan sesuai peran:
             admin → admin.html · guru → guru.html · siswa → app.html
app.html   → belum login? → auth.html ; belum onboarding? → OnboardView
```

> **Mode offline/lokal:** ubah `USE_FIREBASE = false` di `js/firebase-config.js` untuk memakai `localStorage` tanpa internet. Catatan: Ionicons & Firebase SDK dimuat via CDN, jadi tetap butuh internet untuk ikon.

---

## 🔥 Setup Firebase (project `tumara-id`)

1. **Authentication** → Sign-in method → aktifkan **Email/Password** dan **Google**.
2. **Cloud Firestore** → buat database (region `asia-southeast`).
3. Deploy Security Rules (mendukung peran admin/guru/siswa):
   ```bash
   firebase deploy --only firestore:rules
   ```
4. **Admin pertama:** tambahkan email di `ADMIN_EMAILS` (`js/firebase-config.js`), lalu daftar/masuk dengan email itu → otomatis berperan `admin` dan diarahkan ke `admin.html`.
5. Pastikan domain hosting terdaftar di **Authentication → Settings → Authorized domains**.

Deploy penuh (hosting + rules):
```bash
firebase deploy
```

---

## 🚢 Deploy

Hosting diatur `public: "."` (multi-page tanpa rewrite). Setiap deploy menulis ulang `version.json` (predeploy hook) sehingga `version-check.js` mendeteksi versi baru dan menyegarkan cache pengguna.

```bash
firebase deploy
```

---

## ⚠️ Catatan

- **Disclaimer kesehatan:** modul kesehatan menyasar remaja — dirancang dengan bingkai positif (kebiasaan sehat, streak, cukup istirahat/minum), bukan tekanan menurunkan berat badan. Aplikasi **bukan pengganti nasihat tenaga kesehatan**.
- **Keterbatasan web:** pengukuran otomatis via sensor (detak jantung, SpO2, pedometer), sinkronisasi wearable, dan sidik jari tidak tersedia di web → diganti input manual + kunci PIN.
- Alur Firebase (secondary-app create user, admin rules) perlu diuji sekali di lingkungan Firebase nyata + deploy rules sebelum produksi.

---

## 📚 Dokumen Terkait

- [`Rancangan-Web-App-Tumara.md`](Rancangan-Web-App-Tumara.md) — blueprint/rancangan awal (sumber kebenaran fitur).
- [`PROGRESS.md`](PROGRESS.md) — catatan handoff & riwayat versi (v1.0 → v1.2+).

---

*Proyek aplikasi pendamping siswa — dibangun dengan HTML, CSS, dan vanilla JavaScript.*
