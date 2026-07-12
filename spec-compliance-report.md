# Laporan Kepatuhan Kode terhadap `spec.md`

**Tanggal:** 12 Juli 2026 · **Branch:** `feature-check` · **Commit:** `05df430`
**Cakupan:** 66 butir fitur dari 5 menu di `spec.md`, diverifikasi langsung ke kode (~9.3k baris JS).

---

## Ringkasan Eksekutif

| Menu | Butir | ✅ ADA | 🟡 PARSIAL | ❌ TIDAK ADA |
|------|-------|--------|-----------|-------------|
| 1. Kesehatan | 17 | 7 | 7 | 3 |
| 2. Produktivitas (Guru) | 16 | 5 | 4 | 7 |
| 3. Keuangan | 12 | 5 | 7 | 0 |
| 4. Keagamaan | 14 | 8 | 5 | 1 |
| 5. Daily Planner | 7 | 2 | 4 | 1 |
| **TOTAL** | **66** | **27 (41%)** | **27 (41%)** | **12 (18%)** |

Bila PARSIAL dihitung setengah: **kepatuhan efektif ≈ 61%**.

### Tiga temuan tingkat arsitektur

**1. Platform tidak sesuai spec.** `spec.md` berjudul "Garis Besar Pembuatan APK" dan tahap 6 SDLC-nya meminta build `.apk`/`.aab` untuk Play Store. Kode aslinya adalah **web app / PWA vanilla JS** (`manifest.json` + `sw.js` + `<script src>` polos). Nol jejak Capacitor, Cordova, TWA, bubblewrap, atau Gradle. Tidak ada build step apa pun. Konsekuensi berantai: sensor (pedometer), wearable, dan alarm background memang tidak bisa dijangkau dari web — jadi beberapa "gap" di bawah ini sebetulnya konsekuensi langsung dari pilihan platform ini.

**2. Fondasi notifikasi praktis tidak ada.** Spec butuh reminder di minimal 5 tempat (obat, air, deadline tugas, waktu shalat, budget). Yang benar-benar ada di kode: **satu** — pengingat minum air (`js/app.js:237-255`), pakai `setInterval` + Notification API, dan **hanya hidup selama tab terbuka**. Lebih buruk: `Notification.requestPermission()` **tidak pernah dipanggil di seluruh repo**, jadi izinnya tidak pernah `granted` dan `notify()` hampir selalu jatuh ke toast in-app. `sw.js` tidak punya handler `push`, `notificationclick`, maupun `periodicsync`.

**3. `firestore.rules` punya lubang keamanan serius** — lihat bagian Keamanan di bawah. Ini yang paling mendesak diperbaiki, terlepas dari spec.

---

## 1. MENU KESEHATAN — 7 ADA / 7 PARSIAL / 3 TIDAK

| Fitur spec | Verdict | Realita di kode |
|---|---|---|
| Detak jantung & SpO2 | 🟡 | Input angka manual ke koleksi `biometrics` (`health.js:109-134`). Tidak ada sensor. Tidak ada klasifikasi rentang normal. |
| Siklus tidur (durasi & kualitas) | 🟡 | Durasi manual (`health.js:679`) + kalkulator jadwal siklus 90 menit (`calc.js:107-124`). **Kualitas tidur tidak ada field-nya sama sekali.** |
| Tekanan darah & gula darah | ✅ | Input + klasifikasi nyata berbasis standar AHA (`calc.js:56-72`). |
| Berat badan & IMT | ✅ | IMT auto dari tinggi profil, riwayat per-tanggal, auto-recalc target kalori & air (`health.js:470-588`, `calc.js:28-42`). |
| Tracker olahraga | ✅ | `renderSport()` (`health.js:1016-1112`), target mingguan 150 menit + progress. |
| Penghitung langkah (pedometer) | ❌ | **Hanya field angka yang diketik user.** Nol `DeviceMotion`/`Accelerometer` di seluruh repo. |
| Log workout (jenis/durasi/intensitas) | 🟡 | 10 jenis termasuk lari/renang/sepeda ✓, durasi ✓. **Field intensitas tidak ada** — hanya implisit lewat nilai MET. |
| Kalori terbakar | ✅ | `Calc.caloriesBurned()` = MET × berat × jam, tabel MET di `calc.js:45-53`. |
| Log makanan + database gizi | 🟡 | Record hanya `{nama, kalori, emoji, waktu}`. **Tanpa makro maupun mikronutrien.** "Database makanan" = 7 preset hardcoded (`health.js:189-197`). Rekomendasi 4 sehat 5 sempurna hanya teks statis. |
| Water reminder | ✅ | Satu-satunya reminder nyata di aplikasi (`app.js:247-255`). Catatan: mati saat tab ditutup. |
| Pengingat obat (alarm) | 🟡 | **Kritis:** CRUD jadwal obat ada, tapi **tidak ada satu pun scheduler yang membaca `med.waktu`**. Disclaimer di `health.js:274` menjanjikan "notifikasi saat aplikasi terbuka" — klaim ini tidak didukung kode apa pun. |
| Manajemen stres & mental | ✅ | Box-breathing 4-4-4-4 beranimasi (`health.js:368-391`) + mood log 5 skala. Meditasi terpandu/audio tidak ada. |
| Pelacak siklus menstruasi | ✅ | Prediksi haid, ovulasi, jendela subur (`calc.js:75-86`); tab hanya muncul untuk pengguna perempuan. |
| Status gaya hidup (rokok/miras) | 🟡 | Toggle harian + streak ✓. **Komponen edukasi tidak ada** — spec minta "edukasi dan tracking". |
| Sinkronisasi wearable | ❌ | Nol Web Bluetooth, nol Google Fit / Health Connect, nol import file. |
| Enkripsi data medis | ❌ | **Seluruh data medis plaintext.** `crypto.subtle` hanya dipakai untuk hash password, bukan enkripsi data. |
| Visualisasi tren harian/mingguan/bulanan | 🟡 | Satu grafik saja (tren berat, `health.js:514`), digambar tangan sebagai SVG. Biometrik, nutrisi, mood, olahraga → teks tanpa grafik. **Tidak ada toggle harian/mingguan/bulanan.** |

---

## 2. MENU PRODUKTIVITAS — 5 ADA / 4 PARSIAL / 7 TIDAK

| Fitur spec | Verdict | Realita di kode |
|---|---|---|
| Dashboard drag & drop + pilihan template | ❌ | **Nol drag & drop di seluruh repo** (bukan HTML5 DnD, bukan SortableJS). Dashboard guru = grid tombol statis hardcoded (`teacher.js:113-161`). Konsep "template" tidak ada. |
| Jadwal pelajaran dinamis & editable | 🟡 | Tabel data-driven ✓, unduh ✓ (CSV). **Tapi tidak editable langsung** — edit hanya via modal, tidak ada `contenteditable` di sel. |
| Absensi + kode & warna | ✅ | Per kelas + per tanggal + per pertemuan (`teacher.js:306`). Warna 4/5 tepat; `.att-S` = `#f59e0b` (amber/oranye), spec minta kuning → ganti ke `#eab308`. |
| Jurnal: judul, materi, hadir otomatis | 🟡 | Judul & materi ✓. Auto-hadir hanya menghasilkan **jumlah**, bukan daftar nama siswa. Dan ada **bug**: matching mengabaikan field `pertemuan` (`teacher.js:674`), jadi 2 pertemuan di tanggal sama saling menimpa. |
| Bukti foto pembelajaran (thumbnail) | ✅ | Upload ke Supabase Storage, thumbnail 120px, klik → modal (`teacher.js:643-657`). Hanya 1 foto per jurnal. |
| Agenda mengajar online per pertemuan | 🟡 | Tidak ada modul agenda terpisah; yang ada hanya field `pertemuan` di jurnal. |
| Unduhan jurnal + kop surat + file per kelas | ❌ | **Blok jurnal tidak punya tombol ekspor sama sekali.** Kop surat: nol hit di repo. |
| Evaluasi penilaian: siswa auto, kolom dinamis | ✅ | Siswa auto dari `DB.listStudentsByClass()`, kolom bebas ditambah (`teacher.js:407-412, 519-561`). |
| Siswa kirim foto pekerjaan via tautan | ❌ | `scores[sid][colId]` **hanya angka**. Siswa tidak punya jalur upload apa pun. |
| Gambar pekerjaan zoomable | ❌ | Nol `zoom`/`lightbox`/`pinch` di repo. |
| Nilai berdampingan dengan gambar (`76 \| gambar`) | ❌ | Sel nilai adalah `<input type="number">` polos. |
| Ekspor Excel / PDF / Share Link | 🟡 | **Excel → sebenarnya CSV** (tidak ada SheetJS). **PDF → sebenarnya `window.print()`** di tab baru (tidak ada jsPDF). **Share Link → tidak ada.** File CSV memang benar terunduh (`utils.js:231-261`). |
| Kolom rata-rata, komponen bisa dipilih | ✅ | Checkbox per kolom, disimpan ke DB (`teacher.js:414, 450-452`). Catatan: ambang merah rata-rata pakai KKM **terendah**, bukan rata-rata KKM — bisa menyembunyikan siswa yang sebenarnya di bawah standar. |
| Nilai < KKM otomatis merah | ✅ | `.grade-below { color: #ef4444 }`, live saat mengetik (`teacher.js:465-466, 496`). |
| Template Pengusaha (rekap jual beli) | ❌ | Nol koleksi jual/beli/produk/inventori. Tidak ada view sama sekali. |
| Template Aktivitas Siswa | ❌ | Fitur siswa memang ada (tugas, catatan, habit, pomodoro), **tapi sebagai portal tetap, bukan "template" yang bisa dipilih.** |

**Catatan kode mati:** `openTaskModal` (`productivity.js:250-307`) dan `_scheduleModal` (`productivity.js:449-496`) tidak pernah dipanggil dari tab manapun.

---

## 3. MENU KEUANGAN — 5 ADA / 7 PARSIAL / 0 TIDAK

Menu paling matang. Tidak ada fitur yang hilang total, tapi banyak yang berhenti setengah jalan.

| Fitur spec | Verdict | Realita di kode |
|---|---|---|
| Transaksi masuk & keluar | ✅ | `finance.js:447-589` + quick-add dari dashboard. |
| Kategorisasi | ✅ | 5 kategori keluar + 3 masuk + kategori kustom. |
| Multiple wallets | 🟡 | **Bug material: dompet tidak terhubung ke transaksi.** Objek transaksi tidak punya `walletId`; saldo dompet tidak pernah berubah saat transaksi dicatat. Efektifnya hanya "daftar angka yang diketik sendiri". |
| Budget per kategori | 🟡 | **Bug: budget tidak per-bulan.** Doc id = `'b_' + kategori` tanpa field bulan (`finance.js:320`) → limit Januari = limit Desember. |
| Alert mendekati batas | 🟡 | **Bukan alert — hanya badge di halaman.** Muncul hanya kalau user membuka tab Anggaran. Tidak ada trigger saat transaksi disimpan, tidak ada notifikasi. |
| Target menabung / wishlist | ✅ | Progress %, tombol "Tabung", opsi auto-catat sebagai transaksi (`finance.js:593-731`). |
| Grafik cash flow bulanan/tahunan | 🟡 | **Tidak ada library chart** — SVG digambar tangan (`utils.js:161-203`). Cakupan: bar 7 hari + donut kategori 1 bulan. **Tidak ada grafik cash flow masuk-vs-keluar, tidak ada view tahunan.** |
| Ekspor Excel / CSV | 🟡 | CSV ✓ (RFC 4180 + BOM, aman dibuka Excel). Tapi hanya transaksi bulan terpilih — wallet, aset, budget, utang, target tidak ikut. Tidak ada `.xlsx`. |
| Catatan utang/piutang | ✅ | CRUD lengkap + ringkasan total (`finance.js:354-443`). |
| Aset/investasi + pertumbuhan nilai | 🟡 | Pencatatan ✓. **Pemantauan pertumbuhan tidak ada** — schema tanpa harga beli & tanpa riwayat nilai; edit `nilai` menimpa data lama. |
| PIN / password / sidik jari | 🟡 | PIN ✓ (SHA-256, `finance.js:72-96`). **Biometrik/WebAuthn nol.** Dan gate-nya kosmetik: `_unlocked` flag in-memory, data tetap terbaca via DevTools tanpa PIN. |
| Sinkronisasi cloud | ✅ | Firestore aktif (`USE_FIREBASE = true`). Catatan: `getDocs` one-shot, bukan `onSnapshot` → sinkron saat reload, bukan live. |

---

## 4. MENU KEAGAMAAN — 8 ADA / 5 PARSIAL / 1 TIDAK

Menu dengan implementasi teknis terkuat (geolocation + kompas nyata).

| Fitur spec | Verdict | Realita di kode |
|---|---|---|
| Jadwal shalat GPS + peringatan dini | 🟡 | GPS nyata (`navigator.geolocation`) → API Aladhan `method=20` (Kemenag) (`ibadah.js:205-230`). Ada countdown. **Peringatan dini tidak ada** — nol notifikasi shalat. Offline = jadwal gagal muat. |
| Arah kiblat digital | ✅ | Bearing great-circle ke Ka'bah + `DeviceOrientation` nyata dengan izin iOS & `webkitCompassHeading` (`ibadah.js:193-268`). Implementasi lengkap. |
| Al-Qur'an digital (Arab/translit/terjemah/audio) | 🟡 | **Hanya 4 surah hardcoded** (Al-Fatihah, Al-Ikhlas, Al-Falaq, An-Nas), bukan 114. Arab + transliterasi + terjemahan ✓. **Audio murrotal nol** — nol `<audio>`, nol mp3. Tombol berlabel "Buka Mushaf Lengkap + Audio Murrotal" cuma link keluar ke quran.com. |
| Doa & dzikir harian | ✅ | `ibadah.js:631-753`. |
| Quotes & motivasi | ✅ | `ibadah.js:651-681`. |
| Kalender Hijriyah + hari penting | 🟡 | **Bukan kalender** — hanya satu string tanggal via `Intl.DateTimeFormat` di header. Nol penanda Ramadhan/Idul Fitri/Isra Mi'raj. |
| Kalkulator zakat (maal/penghasilan/fitrah) | ✅ | Ketiganya ada (`ibadah.js:759-985`). |
| Panduan ibadah (wudhu/shalat/haji-umrah) | 🟡 | Wudhu ✓, Shalat ✓, Adab baca Qur'an ✓. **Haji/umrah nol hit di seluruh repo.** |
| Donasi & sedekah (celengan) | ✅ | Koleksi `sedekah` (`ibadah.js:765-819`). |
| Tracker Riyadhoh editable & bisa ditambah | 🟡 | Bisa **tambah** & **hapus** amalan kustom ✓. **Tidak bisa rename/edit** — spec minta "bisa diedit dan ditambahkan". |
| Baca Qur'an: input, rekap, target, catatan makna, Life Hack khatam | ✅ | Semua sub-item ada (`ibadah.js:424-601`), termasuk panduan khatam. |
| Checklist hafalan | ✅ | Koleksi `hafalan` dengan status proses/hafal. |
| **Checklist shalat lengkap per waktu** | ❌ | **Gap terbesar di menu ini.** Yang ada hanya flat list: 5 fardhu + 6 amalan generik (`ibadah.js:18-34`). Nol struktur Qobliyah/Ba'diyyah/Awwabin/Doa/Dzikir/Kajian per waktu, nol varian rakaat Dhuha (2/4/6/8), nol slot Sepertiga Malam (Taubat/Hajat/Tahajjud). Spec merinci ~30 sub-checklist; kode melempar semuanya ke user untuk diketik manual satu per satu. Butuh perubahan bentuk data `ibadah_daily.done`. |
| Catatan ibadah / evaluasi diri | ✅ | Koleksi `ibadah_notes` (`ibadah.js:989-1052`). |

---

## 5. MENU DAILY PLANNER — 2 ADA / 4 PARSIAL / 1 TIDAK

Menu paling lemah. Ada **cacat arsitektur**: sistem tugas terbelah dua dan tidak nyambung.

| Fitur spec | Verdict | Realita di kode |
|---|---|---|
| To-Do (tambah, edit, centang) | 🟡 | **Terbelah dua.** `Prod.openTaskModal()` menulis ke koleksi pribadi `tasks`, tapi tab Tugas membaca koleksi `class_tasks` (tugas dari guru). Akibatnya: tugas pribadi yang dibuat lewat Aksi Cepat **tidak pernah muncul di tab Tugas** — hanya nongol read-only di kartu Dashboard. Tidak ada tombol edit (cabang edit adalah kode mati), tidak ada hapus. |
| Prioritas P1/P2/P3 | 🟡 | Nilai `rendah/sedang/tinggi` disimpan, dirender sebagai titik warna. Tidak ada penamaan P1/P2/P3, tidak ada sort/filter prioritas. |
| Pengingat & notifikasi deadline | ❌ | Nol. Hanya badge visual "terlambat" (`utils.js:59-66`). |
| Recurring tasks | 🟡 | **UI saja, nol fungsi.** Field `ulang` disimpan ke Firestore lalu **tidak pernah dibaca siapa pun**. Tidak ada generator instance berulang. |
| Kategori / label / tag | 🟡 | Teks bebas, bukan preset (Pekerjaan/Pribadi/Kesehatan/Belajar). Label tugas bahkan **tidak pernah dirender di mana pun**. |
| Catatan / journaling | ✅ | CRUD lengkap + cari + label (`productivity.js:311-396`). |
| Habit tracker | ✅ | Grid 7 hari, toggle, streak, emoji picker, cascade delete. Solid (`productivity.js:35-171`). |

---

## Keamanan — perlu diperbaiki lebih dulu dari fitur apa pun

Temuan di `firestore.rules`, terlepas dari spec:

1. **Privilege escalation.** `firestore.rules:27` — `allow create, update: if request.auth.uid == uid` tanpa batasan field. Siswa bisa memanggil `updateUser({ role: 'admin' })` dan **menjadi admin**.
2. **Data medis bocor antar-guru.** `firestore.rules:54-74` — **guru mana pun** boleh membaca `health_daily`, `biometrics`, `menstrual`, `meds`, `foods`, `weights`, `workouts` milik **siswa mana pun**, tanpa cek keanggotaan kelas. Termasuk data siklus menstruasi.
3. **Roster sekolah terbuka.** `school_classes`, `school_roster` (nama + NIS seluruh siswa), `class_tasks`, `class_schedule` semuanya `allow read: if request.auth != null` — siapa pun yang login bisa membacanya.
4. **`class_tasks` tanpa cakupan kelas.** `allow write: if isGuru()` — guru mana pun bisa menulis/menghapus tugas kelas mana pun. Komentarnya sendiri mengakui "cakupan kelas dijaga di UI".
5. **Enkripsi data medis (spec) tidak terpenuhi** — semua plaintext di Firestore.

Yang sudah benar: `users/{uid}/{document=**}` hanya bisa diakses pemilik/admin, jadi data pribadi non-medis aman.

---

## Rekomendasi Prioritas

### P0 — Keamanan (bukan fitur, tapi blocker rilis)
1. Kunci field `role` di `firestore.rules:27` agar tidak bisa diubah user sendiri.
2. Batasi akses guru ke data siswa berdasarkan keanggotaan kelas; keluarkan data medis sensitif (menstruasi, biometrik) dari jangkauan guru sepenuhnya.
3. Tutup baca roster sekolah agar hanya untuk anggota kelas terkait.

### P1 — Klaim palsu di UI (menyesatkan pengguna, murah diperbaiki)
4. `health.js:274` menjanjikan notifikasi pengingat obat yang tidak ada. Hapus klaimnya, **atau** implementasikan scheduler yang membaca `med.waktu` — infrastruktur `App.notify()` sudah ada, tinggal dipakai ulang.
5. Tombol "Buka Mushaf Lengkap + Audio Murrotal" (`ibadah.js:522`) hanya link keluar. Ubah labelnya agar jujur.
6. Panggil `Notification.requestPermission()` — tanpa ini, notifikasi apa pun (termasuk pengingat air yang sudah ada) hampir tidak pernah benar-benar tampil.

### P2 — Bug yang merusak fitur yang "sudah ada"
7. Budget tidak per-bulan (`finance.js:320`) — tambahkan bulan ke doc id.
8. Wallet tidak terhubung ke transaksi — tambahkan `walletId` di transaksi dan update saldo.
9. Sistem tugas terbelah dua (`productivity.js`) — satukan `tasks` dan `class_tasks` di tab Tugas.
10. Auto-hadir jurnal mengabaikan `pertemuan` (`teacher.js:674`).
11. Field `ulang` (recurring) disimpan tapi tidak pernah dibaca — implementasikan atau hapus dari UI.

### P3 — Gap fitur terbesar terhadap spec
12. Checklist shalat lengkap per waktu (Menu 4, item 13) — gap tunggal terbesar, ~30 sub-item.
13. Ekspor jurnal per kelas + kop surat (Menu 2, item 6).
14. Submit foto pekerjaan siswa + zoom + nilai berdampingan gambar (Menu 2, item 8-10).
15. Dashboard drag & drop + sistem template (Menu 2, item A) — termasuk Template Pengusaha yang belum ada sama sekali.
16. Al-Qur'an 114 surah + audio murrotal.

### Keputusan yang perlu diambil (bukan bug — pertanyaan produk)
17. **Platform:** spec meminta APK Play Store; kode adalah PWA. Bila APK memang wajib, bungkus dengan Capacitor/TWA — ini sekaligus membuka jalan untuk pedometer (sensor), sinkronisasi wearable, dan alarm background yang saat ini mustahil di web murni.
18. **Ekspor:** spec menyebut "Excel/PDF"; kode menghasilkan CSV + dialog cetak browser. Bila format sebenarnya wajib, tambahkan SheetJS + jsPDF.

---

*Laporan ini diverifikasi langsung ke kode sumber, bukan ke dokumentasi. Setiap verdict punya referensi baris.*
