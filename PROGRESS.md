# PROGRESS — Web App Tumara

> Catatan handoff untuk melanjutkan pengerjaan di sesi Claude Code berikutnya.

## Status: ✅ v1.4 — Halaman detail kelas + search admin mulus + kompas kiblat benar

### 1. Guru: halaman detail Kelas & Siswa (`js/views/teacher.js`, `css/style.css`)
- Tab **Kelas & Siswa** kini punya **halaman detail kelas**: kartu ringkas (nama kelas + jumlah siswa **nyata** dari roster) → daftar menu baris (ikon + chevron) → daftar siswa (avatar, nama, NIS).
- **HP**: gerbang kartu kelas → tekan satu kelas → halaman detail. **Desktop (≥900px)**: master–detail (`.kelas-split`) — daftar kelas di kiri, detail langsung terbuka di kanan (kelas pertama auto-terpilih, tak perlu menekan tombol). `_isKelasDesktop()` + `_watchKelasLayout()` (matchMedia) → render ulang saat layar melintasi ambang (rotasi iPad).
- Menu detail (`_kelasMenu`) **hanya menautkan ke fitur yang sudah ada**: Catat Absensi, Buat Penilaian, Buat Jurnal, Kirim Tugas Kelas, Atur Jadwal Kelas (**hanya bila `waliKelasId === classId`**), Ibadah Siswa, Kesehatan Siswa. Tidak ada "Tambah Siswa" — siswa mendaftar sendiri via login Google (lihat v1.3 #2).
- Menekan menu → tab tujuan dengan **kelas tetap terpilih** (`_keepClassId`, dibaca di blok reset `render()`), plus tombol **"Kembali ke Kelas"** (`_backKelasBtn`/`_backKelasBar`/`_bindBackKelas`, penanda `_fromKelas`) yang **hanya muncul bila tab dibuka dari halaman detail kelas**. Tombol **"Ganti Kelas"** perilakunya TIDAK berubah (pilih ulang kelas di dalam tab), tapi menekannya menghapus `_fromKelas` (agar tak menuntun balik ke kelas lama).
- CSS baru: `.kelas-hero/.kelas-sec/.kmenu-*/.siswa-*/.kelas-split/.kelas-aside-*` — memakai token warna yang ada, tanpa warna baru.

### 2. Admin: search akun tidak lagi "blink" (`js/views/admin.js`)
- **Bug**: `#uSearch` `oninput` memanggil `render(el)` → spinner "Memuat…" + **fetch ulang `adminListUsers()` tiap ketikan** + rebuild seluruh innerHTML → elemen input diganti → **fokus keyboard hilang** (harus klik kotak search lagi).
- **Fix**: akun di-cache di `this._users`; mengetik hanya menggambar ulang `#uList` via **`_paintUsers()`** (+`_filterUsers()`), kotak search tak disentuh. Chip filter memakai jalur ringan yang sama. Debounce 250ms → 120ms (aman, filter di memori).
- Terverifikasi: fokus tetap di `#uSearch`, caret utuh, elemen input sama, **0 fetch** saat mengetik, tanpa spinner.

### 3. Ibadah: kompas kiblat diperbaiki total (`js/views/ibadah.js`, `css/style.css`)
- **Bug A (visual)**: `.qibla-needle` punya `transform: translate(-50%,-50%)` di CSS, ditimpa `rotate()` dari JS → emoji 🕋 hanya **berputar di tempat** di pusat lingkaran, tak pernah menunjuk arah. → Diganti `.qibla-dial` (lapisan seukuran piringan, diputar terhadap pusat, 🕋 + batang jarum di ujung atas) + `.qibla-rose` (N/E/S/W ikut berputar agar N = utara asli).
- **Bug B (sensor)**: kode lama memakai event `deviceorientation` **relatif** — `alpha`-nya diukur dari acuan acak saat halaman dibuka, bukan utara → jarum bergerak tapi salah. → `_headingOf()` kini **hanya menerima event absolut** (`deviceorientationabsolute` / `e.absolute === true`) atau `webkitCompassHeading` (iOS), + kompensasi `screen.orientation.angle`. Android: kompas nyala otomatis (tanpa izin); iOS: lewat tombol (`requestPermission` butuh gestur).
- **Bug C (GPS)**: `enableHighAccuracy: false` + hanya sekali ambil. → `enableHighAccuracy: true, maximumAge: 0` + **`watchPosition`** (`_startGeoWatch`) selama tab Sholat terbuka: sudut, jarak ke Ka'bah, koordinat & akurasi diperbarui **tanpa render ulang** (`_paintQibla`). Tulis ke Firestore hanya bila berpindah **>200 m**. Sensor dilepas saat pindah tab (`_stopCompass`/`_stopGeoWatch` di awal `render()`).
- **Akurasi**: `KAABA` = 21°25'21,00" LU / 39°49'34,20" BT; `_qiblaBearing` = bearing awal **great-circle**. Diuji vs rujukan: Jakarta 295,2° (ref 295,1), Medan 292,8° (292,9), New York 58,5° (58,5), jarak Jakarta→Ka'bah 7.920 km. Selisih ≤0,1°.
- **Mode tanpa kompas** (laptop/PC — *tidak punya magnetometer, ini batas perangkat keras*): setelah 2,5 dtk tanpa pembacaan → coba `AbsoluteOrientationSensor` (Generic Sensor API, untuk 2-in-1) → bila gagal, `_noCompassMode()`: pesan jujur + **penggeser "arah hadapmu"** agar jarum bisa disejajarkan manual. Akurasi lokasi >1 km (Wi-Fi/IP) → peringatan + saran "Set Manual".

### ⚠️ Deploy
Tetap **wajib `firebase deploy` PENUH**. Tidak ada perubahan rules/index di v1.4 (murni hosting: JS/CSS).

---

## Status: ✅ v1.3 — Enrolment terpusat + tugas/jadwal dari guru + wali kelas + beranda guru

Fokus v1.3: menata alur **sekolah** (admin → guru → siswa) dan membuat tugas/jadwal mengalir dari guru ke siswa.

### 1. Enrolment terpusat (data induk admin)
- **Koleksi Firestore top-level baru** (bukan subkoleksi user): `school_classes` (daftar kelas: `nama`, `keterangan`, `urutan?`) & `school_roster` (data acuan siswa: `classId`, `nama`, `nis`).
- **Admin** (`js/views/admin.js`, state `view: accounts|classes`): menu **"Kelas & Siswa"** — buat/ubah/hapus kelas, **import massal** siswa (tempel `NISN, NIS, Nama`, NISN opsional; format lama `NIS, Nama` 2-kolom tetap didukung; parser `_parseRoster`, pemisah `,`/`;`/tab), tambah/edit/hapus siswa, ekspor CSV. **NIS dibatasi maks 20 angka** (helper `_cleanNis`/`_bindNis`) di semua input NIS.
- Roster admin = **acuan**; roster aktif guru berasal dari siswa yang sudah login (lihat #2).

### 2. Siswa login Google → pilih kelas + NIS
- Onboarding siswa (`OnboardView` di `js/views/auth.js`, kini **async**) + halaman Profil (`js/views/profile.js`) menambah field **Kelas** (dropdown `school_classes`) + **NIS** → disimpan ke profil user `{ kelasId, kelasNama, nis }`.
- Roster guru `Teacher._students(classId)` = **akun siswa** ber-`kelasId` itu via `DB.listStudentsByClass(classId)` (query `users where role=='siswa' && kelasId==`). Absensi/nilai/jurnal kini di-key oleh **uid siswa asli**; pemantauan ibadah/kesehatan per-siswa aktif kembali.

### 3. Guru pilih kelas yang diampu
- Tab "Kelas" guru: tombol **"Tambah Kelas"** → modal pilih dari `school_classes` (bukan bikin kelas sendiri). Disimpan di `DB.user.kelasAmpu` (array classId). `_classes()` = school_classes ∩ kelasAmpu.

### 4. Tugas & jadwal DIKIRIM guru (siswa read-only)
- `class_tasks` (top-level: `classId, judul, mapel, tenggat, prioritas, guruId, guruNama`) — dibuat guru pengampu di tab **"Tugas Kelas"**. Siswa (`js/views/productivity.js`) hanya menerima (tombol "Tugas Baru" dihapus); boleh mencentang selesai → `DB.user.tugasSelesai` (array id).
- `class_schedule/{classId}` (top-level, doc id = classId: `entries[]`, `waliNama`) — **hanya wali kelas** yang menulis, di tab **"Jadwal Kelas"**. Siswa menerima read-only (tombol "Tambah" dihapus).

### 5. Wali kelas + form Data Guru
- Guru mengisi form **"Data Guru"** (`Teacher._setupModal`): nama, mapel, toggle wali + pilih kelas → `{ nama, mapel, waliKelasId, guruSetup }`. Muncul otomatis saat guru pertama login (`!guruSetup`) & bisa dibuka ulang dari tombol topbar `#topGuruBtn`.
- Tab **"Jadwal Kelas"** hanya muncul di nav bila `waliKelasId` terisi (`refreshGuruNav()` di `guru.html`); `renderJadwalKelas` terikat langsung ke kelas wali (tanpa pemilih kelas).

### 6. Beranda guru (dashboard)
- Tab default guru = **`beranda`** (`Teacher.renderBeranda`): hero (avatar+nama+badge wali/guru), kartu statistik (Siswa/Mapel/Kelas), grid menu ubin → menaut ke tab yang sudah ada (`Teacher._goto`). CSS `.guru-hero/.guru-stat-card/.guru-menu-grid/.guru-tile` di `style.css` (memakai token warna yang ada, tanpa warna baru).

### 7. Perbaikan lain
- **Ibadah auto-reset tengah malam** (`js/views/ibadah.js` `_watchDayChange`): interval 30 dtk + event `visibilitychange`/`focus`, waktu lokal perangkat (WIB/WITA/WIT ikut jam device).
- **Pemantauan kesehatan** (`teacher.js`): modal detail siswa kini **auto-refresh 10 dtk** (guard `m.isConnected`, pertahankan scroll); fix pencocokan tanggal **mood** pakai tanggal lokal (`_moodOnDate`), bukan slice UTC.
- **Responsif**: fix dropdown logout guru di HP (dropdown buka ke bawah), tabel `.data-table` stack jadi **opt-in** via kelas `.stack` (gradebook/absensi tetap scroll), h1 hero landing di HP.

### Lapisan data (`js/db.js`)
- **Koleksi global**: `gList / gListWhere / gAdd / gAddMany (writeBatch ≤500) / gUpdate (UPSERT di kedua adapter) / gRemove / gGet`.
- `listStudentsByClass(classId)`.
- **Rules** (`firestore.rules`): `school_classes`/`school_roster` read semua-auth, write admin; `class_tasks` write guru; `class_schedule/{classId}` write hanya wali (`get(users/uid).data.waliKelasId == classId`); guru boleh baca user role=siswa.
- **Composite index** `users(role, kelasId)` di `firestore.indexes.json` (didaftarkan di `firebase.json`).

### ⚠️ Deploy
**Wajib `firebase deploy` PENUH** (hosting + rules + index). `--only firestore:rules` TIDAK mengirim hosting/JS/CSS maupun index → perubahan tak live. `version.json` = 1.3.x.

### Catatan naming (berubah dari v1.1/1.2)
- `Prod.openTaskModal()` & `Prod._scheduleModal()` jadi **tak terpakai** (siswa tak buat tugas/jadwal sendiri). Subkoleksi lama per-guru `classes`/`students` & subkoleksi siswa `tasks`/`schedule` juga tak terpakai (tanpa migrasi; data uji).
- Method guru baru: `renderBeranda`, `renderTugasKelas`/`_tugasKelasModal`, `renderJadwalKelas`/`_jadwalKelasModal`, `_setupModal`, `_goto`, `_moodOnDate`.

---

## Status: ✅ v1.2 — Cakupan penuh fitur `draff apk (1).pdf`

### Ditambahkan di v1.2 (melengkapi semua item PDF yang feasible)
- **Kesehatan**: tab **Biometrik** (detak jantung, SpO2, tekanan darah, gula darah, langkah — input manual + kategori), tab **Nutrisi** (log makanan + kalori + panduan Isi Piringku), tab **Obat** (pengingat obat + checklist dosis harian), tab **Mental** (latihan pernapasan box-breathing + mood check-in), tab **Siklus** (menstruasi, khusus akun perempuan, prediksi haid & masa subur), estimasi **kalori terbakar** (MET) di Olahraga.
- **Ibadah**: tab **Sholat & Kiblat** (jadwal sholat via GPS+Aladhan API, hitung mundur, arah kiblat + kompas, tanggal Hijriyah), **Al-Qur'an Digital** (4 surat pendek Arab+transliterasi+terjemah + link mushaf lengkap), **Quotes & Motivasi**, tab **Panduan** (wudhu/sholat/adab Qur'an), **Catatan Sedekah** di tab Zakat.
- **Keuangan**: tab **Dompet & Aset** (multiple wallets manual: tunai/bank/e-wallet + aset/investasi emas/saham/reksadana), **kunci PIN** keuangan.
- **Produktivitas/Planner**: **tugas berulang** (harian/mingguan/bulanan, auto-regenerate) + **label/tag** tugas.
- **Ensiklopedia**: artikel **"Tahapan Membuat Aplikasi"** (7 tahap SDLC dunia kerja).
- Koleksi data baru di `js/db.js`: biometrics, foods, menstrual, wallets, assets, sedekah. Helper di `js/calc.js`: caloriesBurned (MET), bpInfo, sugarInfo, menstrualPredict. `version.json` = 1.2.0.

### Keterbatasan web (input manual sebagai gantinya)
Pengukuran otomatis detak jantung/SpO2 via sensor, sinkronisasi smartwatch/wearable, dan sidik jari asli **tidak mungkin di web** → diganti input manual + kunci PIN. Dashboard drag-drop & template peran "Pengusaha" belum (peran Guru sudah lengkap).

---

## Status: ✅ v1.1 — Sistem Peran + Modul Ibadah + fitur baru (dari `draff apk (1).pdf`)

### Yang ditambahkan di v1.1
- **Sistem peran** `admin` / `guru` / `siswa` di `js/db.js` (LocalAdapter & FirebaseAdapter paritas).
  - Login role-aware: admin→`admin.html`, guru→`guru.html`, siswa→`app.html` (helper di `js/roles.js`).
  - Guard tiap halaman (`guardPage`) + redirect otomatis bila peran tak sesuai.
  - Admin pertama: daftar `ADMIN_EMAILS` di `js/firebase-config.js` (email itu otomatis jadi admin).
- **Panel Admin** (`admin.html` + `js/views/admin.js`): kelola akun, **buat akun guru/siswa** (Firebase:
  pakai secondary app agar admin tak ter-logout; menampilkan kredensial untuk diserahkan), ubah peran, hapus.
- **Portal Guru** (`guru.html` + `js/views/teacher.js`): Kelas & Siswa (roster + tambah massal),
  Absensi (kode warna H/S/I/A/D, ekspor CSV), Penilaian (kolom + KKM merah otomatis + rata²
  kolom yang dipilih + ekspor CSV/PDF), Jurnal mengajar (auto jumlah hadir dari absensi + foto
  terkompres), Jadwal mengajar. Semua data di subkoleksi milik guru sendiri.
- **Modul Ibadah siswa** (`js/views/ibadah.js`, rute `ibadah` di `app.js` + nav `app.html`):
  checklist sholat & amalan (bisa tambah custom), tracker tilawah + target khatam + checklist hafalan,
  penghitung dzikir + doa harian, kalkulator zakat (penghasilan/maal/fitrah), catatan ibadah.
- **Fitur pilar yang dilengkapi (dari PDF):**
  - Kesehatan: tab **Berat & IMT** (log berat, tren, BMI + rentang ideal).
  - Produktivitas: tab **Kebiasaan** (habit tracker grid 7 hari + streak).
  - Keuangan: tab **Anggaran** (limit per kategori + peringatan lewat batas), tab **Utang/Piutang**,
    **ekspor CSV** laporan.
- **Firestore Rules** (`firestore.rules`) diperbarui: pemilik + admin. Deploy: `firebase deploy --only firestore:rules`.
- Ikon Ionicons dimuat dari **CDN jsdelivr** (folder lokal `assets/ionicons` dihapus). `version.json` = 1.1.0
  (auto-refresh mendeteksi versi baru).
- **Catatan keterbatasan web** (fitur PDF yang butuh hardware): langkah kaki/pedometer, sinkronisasi
  wearable, sidik jari → belum diimplementasi (butuh sensor perangkat); penilaian foto pekerjaan siswa
  belum (butuh upload/link). Bisa jadi fase berikutnya.

### Diuji
Seluruh alur di atas diuji end-to-end dengan Playwright di **mode lokal** (localStorage), 0 error konsol.
Alur Firebase (secondary-app create user, admin rules) mengikuti logika paralel yang sama — perlu uji
sekali di lingkungan Firebase nyata + deploy rules sebelum produksi.

---

## Status awal: ✅ SEMUA MODUL SELESAI (v1.0)

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
├── firebase.json / .firebaserc / 404.html  (Firebase Hosting; 404 sudah bergaya Tumara)
├── assets/
│   └── logo.png               ✅ logo resmi (tunas 3 daun, PNG transparan 1040px) — dipakai sebagai favicon semua halaman & di `.logo-mark` (chip putih + <img>, gaya di style.css & index.css)
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
view objects: `Dashboard`, `Health`, `Prod`, `Fin`, `Profile`, `AuthView`, `OnboardView`.

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
- Landing page & aplikasi sama-sama mendukung terang/gelap. Landing memakai key
  localStorage yang sama (`tumara_theme`) + `data-theme` di `<html>`; tombol toggle
  `#themeBtn` di navbar (`.theme-btn` di `css/index.css`, override gelap di blok
  `[data-theme="dark"]`); tema diterapkan lewat script inline di `<head>` sebelum
  CSS agar tidak berkedip.
- **Mobile-first di semua halaman**: bottom nav muncul di layar kecil pada semua halaman —
  app (`.bottom-nav` bawaan, ≤860px), `auth.html` / `404.html`
  (pakai `.bottom-nav` + `.bnav-item` dari `style.css`, link antar halaman),
  dan landing `index.html` (kelas `.bnav` sendiri di `css/index.css`, tampil ≤620px,
  dengan scrollspy IntersectionObserver untuk menandai section aktif).
  Di ≤560px modal aplikasi berubah jadi bottom-sheet (`style.css`). Halaman yang
  menampilkan bottom nav wajib memberi padding-bawah ±110px agar konten tidak tertutup.
- Topbar app **sticky** (blur, `z-index: 30`) — tidak ikut ter-scroll. Scrollbar
  disembunyikan global di `style.css` (scroll tetap jalan). Avatar merender
  `fotoUrl` dari Firestore via `Profile._avatarHTML(u)` (fallback inisial;
  `referrerpolicy="no-referrer"` agar foto akun Google tidak 403) — dipakai di
  topbar, sidebar user, dan halaman Profil.
