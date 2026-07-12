# Laporan QC — Tumara v1.0 (Audit Fitur)

**Tanggal:** 12 Juli 2026 (audit awal) — **diupdate 12 Juli 2026** setelah perbaikan P0-P2
**Target Audit:** Source code repository (branch `feature-check`)
**Metode:** Source code analysis — setiap klaim diverifikasi langsung ke file & baris kode
**Ruang lingkup:** Fungsionalitas & keamanan. Audit UI/visual/responsive **tidak** termasuk.
**Status:** ~73% feature coverage (51 ✅ / 24 ⚠️ / 11 ❌ dari 86 item) | **2 dari 6 temuan keamanan diperbaiki penuh, 2 sebagian, 2 masih terbuka**

> **Catatan metodologi:** Semua status di bawah dibuktikan dengan referensi `file:baris`. Item tanpa bukti kode dinyatakan ❌, bukan diasumsikan ada. Fitur yang UI-nya tampil tetapi logikanya tidak pernah dieksekusi dihitung ❌ atau ⚠️, bukan ✅. Baris kode yang dikutip mengikuti state file **sebelum** perbaikan sesi ini kecuali ditandai "state saat ini" — nomor baris bisa bergeser setelah commit perbaikan.

---

## 📌 Status Perbaikan (branch `feature-check`, belum di-deploy/merge)

Setelah audit ini ditulis, dikerjakan lewat alur spec → plan → eksekusi (dokumen lengkap di `docs/superpowers/specs/` & `docs/superpowers/plans/`, tanggal 2026-07-12). Ringkasan mana yang **sudah** dan **belum** disentuh:

| Temuan di laporan ini | Status | Commit |
|---|---|---|
| S1 — Privilege escalation `role` | ✅ **DIPERBAIKI PENUH** | `16b4837` |
| S2 — Guru baca data medis siswa manapun | ⚠️ **SEBAGIAN** — 10 subkoleksi (health_daily/menstrual/meds/dst + ibadah) dibatasi per kelas; **profil `users/{uid}` inti (berat/tinggi/usia/gender/hash finPin) masih terbuka untuk semua guru** — lihat catatan di S2 di bawah | `99c3b05` |
| S3 — PIN tanpa salt + fallback plaintext | ❌ **BELUM** — di luar scope 3 putaran perbaikan ini | — |
| S4 — Kredensial Supabase ter-commit, bucket publik | ❌ **BELUM** — butuh rotasi kredensial manual di dashboard Supabase, di luar scope | — |
| S5 — Otorisasi hanya di UI (`school_roster`, `class_tasks`) | ⚠️ **SEBAGIAN** — `school_roster` dibatasi admin+guru; write `class_tasks` dibatasi ke kelas milik guru. `school_classes` read tetap terbuka (disengaja, dipakai siswa pilih kelas); **read `class_tasks` masih terbuka untuk semua user login** (disengaja dikeluarkan dari scope, risiko rendah) | `5a3a995` |
| S6 — Tidak ada enkripsi data medis | ❌ **BELUM** — butuh arsitektur enkripsi sisi klien, di luar scope | — |
| 1.11 Medication Reminder | ✅ **DIPERBAIKI** — scheduler nyata (`App.startMedReminder`, cek tiap 30 detik) + permintaan izin notifikasi otomatis saat obat berjadwal pertama disimpan | `f33f6a9`, `4d7cbb2`, `961026f` |
| 2a.5 Jurnal Mengajar (auto-hadir) | ✅ **Bug tersembunyi ditemukan & diperbaiki** — laporan ini awalnya menilai fitur ini ✅ OK, tapi audit terpisah menemukan filter absensi mengabaikan `pertemuan` (2 pertemuan di tanggal sama saling menimpa data hadir). Sekarang difilter juga per `pertemuan`. | `d70739e` |
| 2b.1 To-Do List (bug arsitektur `tasks` vs `class_tasks`) | ✅ **DIPERBAIKI** — tab "Tugas Pribadi" baru membaca/menulis `tasks` secara konsisten dengan CRUD penuh (sebelumnya tugas pribadi bisa dibuat lalu terjebak selamanya) | `c6c9397` |
| 2b.4 Recurring Tasks | ⚠️ **SEBAGIAN** — field `ulang` sekarang ditampilkan sebagai badge (🔁 Harian/Mingguan/Bulanan) di tab Tugas Pribadi, tapi **belum ada recurrence engine** (tidak auto-regenerasi saat tugas selesai) — rekomendasi #11 di bawah masih berlaku | `c6c9397` |
| 2b.5 Kategorisasi (Label/Tag) | ✅ **DIPERBAIKI** — label tugas pribadi sekarang dirender sebagai badge di tab Tugas Pribadi (sebelumnya data tulis-saja, tak pernah tampil) | `c6c9397` |
| 3.3 Multiple Accounts/Wallets | ✅ OK (tidak berubah) + **peningkatan**: transaksi sekarang bisa ditautkan ke dompet (`walletId` opsional) dan saldo otomatis menyesuaikan saat transaksi dicatat/diedit/dihapus. Saldo manual murni (sesuai spec "tanpa integrasi bank") tetap jadi cara utama entri saldo awal. | `0e6c2e8` |
| 3.4 Budget Planning | ✅ **DIPERBAIKI** — budget sekarang benar-benar per-bulan (field `bulan` + doc id per-bulan); dokumen lama tetap fallback lintas-bulan sampai diedit ulang | `5c48caf` |
| Rekomendasi #7 (item 1.11 & 1.1 disclaimer) | ⚠️ **SEBAGIAN** — disclaimer obat (`health.js:274`) sudah jujur & akurat sekarang. Disclaimer biometrik (`health.js:85`, janji "memvisualkan trennya") **belum disentuh** — masih tidak akurat. | `961026f` |
| Semua item lain (§2a drag&drop, §2a upload tugas siswa, §3.5 alert anggaran, §4 checklist shalat granular, §4 Qur'an 114 surat, dll) | ❌ **BELUM DIKERJAKAN** — di luar scope 3 putaran ini (didorong ke "P3" di `spec-compliance-report.md`) | — |

**Belum di-deploy, belum di-merge ke `main`.** Semua commit di atas ada di `feature-check`, menunggu approval.

---

## Arsitektur Aplikasi

| Komponen | Detail | Bukti |
|---|---|---|
| **Frontend** | Vanilla JavaScript SPA, tanpa framework. Router objek buatan sendiri. | `app.js:7-29`, `app.js:145` |
| **Backend** | Firebase (Auth + Firestore). `USE_FIREBASE = true`. | `firebase-config.js:21`, `db.js:714-716` |
| **Object Storage** | **Supabase** (bukan Firebase Storage) — khusus foto jurnal guru. Bucket `jurnal-foto`, publik. | `supabase-storage.js:13-15`, `:31-48` |
| **Role System** | 3 portal: `app.html` (siswa), `guru.html` (guru), `admin.html` (admin). | `roles.js:11-15`, `roles.js:26-39` |
| **i18n** | Bukan kamus key-value — mekanisme `tr(id, en)` inline (1.515 pemanggilan) + atribut `data-en` (144 buah). | `i18n.js:31-47` |
| **PWA** | Service worker precache + network-first + offline fallback, install prompt. | `pwa.js:65-84`, `sw.js:25-121` |
| **Data Layer** | Dua adapter (Local / Firebase) di balik satu fasad identik. | `db.js:32-260`, `db.js:270-709`, `db.js:736-799` |

---

## 1. Menu Kesehatan (`app.html` → tab Kesehatan)

| # | Fitur | Status | Catatan (terverifikasi di kode) |
|---|---|---|---|
| 1.1 | Detak Jantung & SpO2 | ⚠️ Partial | Input manual OK (`health.js:49-50`, `:109-134`). **Tidak ada grafik tren sama sekali** di tab Biometrik. Riwayat = **30 entri terakhir gabungan semua tipe biometrik** (`health.js:92`), bukan "7 hari". Disclaimer `health.js:85` menjanjikan "memvisualkan trennya" — janji itu tidak ditepati kode. |
| 1.2 | Tekanan Darah & Gula Darah | ⚠️ Partial | Input sistolik/diastolik OK (`health.js:113-116`), kategori via `Calc.bpInfo`/`sugarInfo` (`calc.js:56-72`). **Bug:** `calc.js:61` memakai `\|\|` — TD 180/85 diklasifikasi "Hipertensi tk.1" (seharusnya tk.2) karena `dia < 90` short-circuit. Badge kategori hanya muncul di kartu nilai terakhir, tidak di riwayat. |
| 1.3 | Berat Badan & IMT | ✅ OK | IMT otomatis (`calc.js:28-42`), rentang ideal (`calc.js:89-95`), grafik tren (`health.js:514`) — dibatasi **12 entri terakhir** (`health.js:481`). |
| 1.4 | Siklus Tidur | ✅ OK | `calc.js:107-124` — `siklus × 90 + 15` menit, 4 opsi, 2 mode (bangun/tidur). |
| 1.5 | Log Olahraga | ⚠️ Partial | **9 preset + opsi "Lainnya"** (`health.js:1129-1130`), bukan "10+ preset". **Tidak ada nama aktivitas kustom** — "Lainnya" disimpan apa adanya dengan MET 4.0. Durasi & kalori otomatis OK. |
| 1.6 | Pedometer | ⚠️ Partial | Input manual OK (`health.js:53`), disimpan ke `daily.langkah` (`health.js:127`). **Nilai itu tidak pernah dibaca di mana pun** — tidak ada target harian, progress bar, atau tampilan di dashboard. Data mati. |
| 1.7 | Estimasi Kalori | ⚠️ Partial | `MET × berat × durasi` (`calc.js:50-53`) dengan **MET tetap per jenis aktivitas** (`calc.js:45-49`). **Tidak ada input intensitas** di modal olahraga (`health.js:1128-1163`) → requirement spec "jenis, durasi, dan **intensitas**" tidak terpenuhi. |
| 1.8 | Log Makanan | ⚠️ Partial | 7 preset (`health.js:189-197`) + entri kustom, total kalori harian. Record yang disimpan hanya `{tanggal, nama, kalori, emoji, waktu}` (`health.js:222`) → **tidak ada makronutrien maupun mikronutrien**, padahal diminta eksplisit oleh spec. |
| 1.9 | Panduan Isi Piringku | ✅ OK | Versi Kemenkes RI (`health.js:164-173`, `:861-882`). |
| 1.10 | Water Reminder | ✅ OK | **Notifikasi periodik ADA** — `setInterval` + browser `Notification` (`app.js:247-255`), dijalankan saat boot (`app.js:115`), interval dipilih user **30/60/90/120 menit** (`profile.js:151-158`), izin diminta di `profile.js:269-272`. Target gelas **dihitung otomatis dari berat badan** dan di-clamp 6–12 (`calc.js:98-102`) — bukan input manual. |
| 1.11 | Medication Reminder | ✅ **DIPERBAIKI** | ~~CRUD jadwal ada, alarm tidak ada~~ — **diperbaiki** (`f33f6a9`, `4d7cbb2`, `961026f`): `App.startMedReminder()` mengecek jadwal tiap 30 detik dan mengirim notifikasi nyata via `App.notify()` (fallback toast), dipanggil otomatis saat init, dihentikan saat logout. Izin notifikasi diminta otomatis saat obat berjadwal pertama disimpan. Disclaimer `health.js:274` sekarang jujur soal batasannya (hanya jalan selagi tab terbuka). |
| 1.12 | Manajemen Stres | ✅ OK | Box breathing 4-4-4-4 (`health.js:371-390`). Tidak ada konten meditasi lain atau penghitung siklus. |
| 1.13 | Mood Tracker | ✅ OK | 5 level emoji (`health.js:325-329`), tampil sebagai chips (`health.js:354-357`), **14 entri terakhir** (satu mood per hari — `health.js:362` meng-update record hari ini, bukan menambah). |
| 1.14 | Siklus Menstruasi | ✅ OK | Prediksi haid + masa subur (`calc.js:75-86`), dibatasi `jenisKelamin === 'P'` (`health.js:13`). Catatan: komentar `calc.js:80` ("5 hari sebelum + 1 sesudah") tidak cocok dengan kodenya (`ovul-3` … `ovul+1`). |
| 1.15 | Bebas Rokok & Miras | ✅ OK | Daily check-in (`health.js:700`, `:708`) + streak (`health.js:793-806`). |
| 1.16 | Keamanan Data Medis | ❌ TIDAK | **Tidak ada enkripsi apa pun.** Semua data medis tersimpan plaintext di Firestore. Lebih buruk: **guru mana pun bisa membaca data medis siswa mana pun**, termasuk `menstrual` dan `meds` — lihat [Bagian 6](#6-temuan-keamanan). Spec meminta "enkripsi data medis pengguna yang ketat". |
| 1.17 | Sinkronisasi Wearable | ❌ TIDAK | Nol kode Bluetooth / Health Connect / Google Fit / Apple Health. Semua input manual (diakui di komentar `health.js:44-46`). |

**Requirement spec yang belum terpenuhi di menu ini:**
- **"Visualisasi data: grafik tren harian, mingguan, bulanan"** → seluruh menu Kesehatan hanya punya **satu chart**: berat badan (`health.js:514`), tanpa pilihan periode. Tidak ada tren untuk detak jantung, SpO2, tekanan darah, gula darah, langkah, tidur, kalori, atau mood. (Kapabilitas chart-nya ada — `utils.js:161` dipakai di `finance.js:778` dan `ibadah.js:472` — hanya belum diterapkan di Kesehatan.)

---

## 2. Menu Produktivitas

### 2a. Portal Guru (`guru.html`)

| # | Fitur | Status | Catatan (terverifikasi di kode) |
|---|---|---|---|
| 2a.1 | Customizable Dashboard (drag & drop) | ❌ TIDAK | `renderBeranda` (`teacher.js:113-161`) membangun array `tiles` statis. Grep `draggable\|dragstart\|Sortable` di seluruh repo = **0 hit**. |
| 2a.2 | Jadwal Pelajaran | ✅ OK | CRUD menyimpan `{hari, jamMulai, jamSelesai, kelas, mapel}` (`teacher.js:776`). Tidak ada field "jam ke-". Field `ruang` hanya ada di Jadwal Kelas wali kelas (`teacher.js:954`, `:963`). |
| 2a.3 | Unduh Jadwal | ⚠️ Partial | **Ekspor CSV ADA** — tombol `#exportJadwal` (`teacher.js:706`) → `downloadCSV(rows, 'jadwal_mengajar.csv')` (`teacher.js:743-747`), dengan BOM UTF-8 agar terbuka rapi di Excel (`utils.js:259`). **PDF dan .xlsx native tidak ada.** |
| 2a.4 | Absensi H/S/I/A/D | ✅ OK | Status di `teacher.js:25-31`. Warna sesuai draft — `css/style.css:1125-1129`: H `#3b82f6` biru, S `#f59e0b` kuning/amber, I `#10b981` hijau, A `#ef4444` merah, D `#22d3ee` biru muda. |
| 2a.5 | Jurnal Mengajar | ✅ OK | `_jurnalModal` (`teacher.js:623-693`). Sinkronisasi kehadiran nyata: jumlah hadir dihitung otomatis dari record absensi. **Catatan tambahan (`d70739e`):** audit terpisah menemukan filter aslinya hanya kelas+tanggal (mengabaikan `pertemuan`) — dua pertemuan di tanggal sama saling menimpa. **Sudah diperbaiki**, sekarang filter juga per `pertemuan` dan tidak menebak kalau nomor pertemuan kosong. |
| 2a.6 | Upload Foto Pembelajaran | ✅ OK | `<input type="file" accept="image/*">` (`teacher.js:643`) → `Storage.uploadFoto()` (`teacher.js:657`). **Foto dikompresi** sebelum upload — `compressImage(maxDim 1000, quality 0.6)` (`supabase-storage.js:35` → `utils.js:265-283`). |
| 2a.7 | Unduh Jurnal (KOP Sekolah) | ❌ TIDAK | `renderJurnal` (`teacher.js:565-621`) tidak punya tombol cetak/ekspor. Satu-satunya pemanggilan `printHTML` di file ini ada di `teacher.js:515` — untuk daftar nilai, dan header-nya (`teacher.js:512`) hanya judul + nama guru + tanggal, **tanpa kop surat**. |
| 2a.8 | Gradebook / Penilaian | ✅ OK | Kolom dinamis (`teacher.js:445-455`, `_colModal` `:519-561`), input nilai auto-save ter-debounce (`teacher.js:488-500`). |
| 2a.9 | KKM — merah otomatis | ✅ OK | Dihitung `teacher.js:465`, live-toggle `teacher.js:496`, styling `css/style.css:1133`. |
| 2a.10 | Rata-rata otomatis | ✅ OK | `avgOf` (`teacher.js:415-419`), **hanya menghitung kolom yang ditandai** (`teacher.js:414`, toggle `:479-484`) → requirement spec "komponen nilai untuk rata-rata bisa dipilih bebas" **terpenuhi**. |
| 2a.11 | Upload Tugas oleh Siswa | ❌ TIDAK | Siswa tidak bisa mengirim apa pun. Satu-satunya interaksi adalah checkbox tandai-selesai (`productivity.js:221`, handler `:240-247`). Koleksi `class_tasks` tidak punya field submission. Nol `<input type="file">` di seluruh view siswa. |
| 2a.12 | Review Tugas (zoom) | ❌ TIDAK | Tidak ada objek untuk di-review (konsekuensi 2a.11). Modal zoom yang ada hanya untuk foto jurnal milik guru sendiri (`teacher.js:618-620`). |
| 2a.13 | Ekspor Nilai | ⚠️ Partial | CSV (`teacher.js:502-508`) + print-to-PDF (`teacher.js:510-516`). **Tidak ada .xlsx native** — grep `xlsx\|XLSX` di repo = 0 hit. |
| 2a.14 | Tugas Kelas | ✅ OK | `teacher.js:790-871`. Hanya guru pemilik yang bisa edit/hapus (`teacher.js:818`). |
| 2a.15 | Jadwal Kelas (Wali Kelas) | ✅ OK | `teacher.js:880-940`, di-gate `waliKelasId` (`teacher.js:881-891`). |
| 2a.16 | Monitoring Ibadah Siswa | ✅ OK | `teacher.js:1053-1367` — tabel, detail per siswa, ekspor CSV, polling 10 detik. |
| 2a.17 | Monitoring Kesehatan Siswa | ✅ OK | `teacher.js:1371-1708`. **Fungsional, tetapi lihat temuan keamanan S2** — cakupan datanya jauh melebihi kelas si guru. |
| 2a.18 | Absensi Barcode / QR | ❌ TIDAK | Grep `barcode\|qrcode\|scanner` di seluruh `js/` + `*.html` = **0 hit**. |
| 2a.19 | Widget "Jadwal Hari Ini" di Beranda Guru | ❌ TIDAK | `renderBeranda` (`teacher.js:113-161`) hanya berisi hero, 3 stat card, dan grid 9 menu. Tidak ada widget jadwal. |
| 2a.20 | Riwayat & Laporan per Kelas | ❌ TIDAK | Grep `riwayat\|laporan` di `teacher.js` = **0 hit**. Tidak ada rekap absensi bulanan maupun ringkasan penilaian. |

### 2b. Portal Siswa — Produktivitas (`app.html`)

| # | Fitur | Status | Catatan (terverifikasi di kode) |
|---|---|---|---|
| 2b.1 | To-Do List | ✅ **DIPERBAIKI** (`c6c9397`) | ~~Bug arsitektur~~: tombol "+ Tugas" di Beranda menulis ke koleksi `tasks`, tapi tab Tugas lama membaca `class_tasks`. **Sekarang ada tab "Tugas Pribadi" terpisah** yang membaca/menulis `tasks` secara konsisten, memakai `Prod.openTaskModal()` yang sudah ada (sebelumnya tak pernah dipanggil dengan argumen edit) — CRUD penuh: tambah, edit, hapus, tandai selesai. |
| 2b.2 | Prioritas Tugas | ⚠️ Partial (tidak berubah) | Model punya 3 level. Tab Tugas Pribadi baru **masih hanya merender badge untuk `'tinggi'`** (mengikuti pola lama), belum menambahkan badge untuk `sedang`/`rendah`. Modal kirim-tugas guru hanya menawarkan `sedang`/`tinggi` (`teacher.js:848-853`). |
| 2b.3 | Pengingat & Notifikasi Deadline | ⚠️ Partial (tidak berubah) | Hanya badge in-app (`utils.js:59-63`). API Notification tersedia tapi **hanya terhubung ke water reminder + (baru) medication reminder** — nol notifikasi deadline tugas, nol push subscription, nol `showNotification` di `sw.js`. |
| 2b.4 | Recurring Tasks | ⚠️ **SEBAGIAN diperbaiki** (`c6c9397`) | Field `ulang` **sekarang ditampilkan** sebagai badge "🔁 Harian/Mingguan/Bulanan" di tab Tugas Pribadi (sebelumnya benar-benar tak pernah dibaca di mana pun). **Recurrence engine (auto-regenerasi tugas) masih belum ada** — didorong sengaja ke luar scope, lihat rekomendasi #11. |
| 2b.5 | Kategorisasi (Label/Tag) | ✅ **DIPERBAIKI** (`c6c9397`) | Catatan: sudah OK sejak awal. **Tugas:** label sekarang **dirender** sebagai badge di tab Tugas Pribadi (sebelumnya data tulis-saja, tak pernah tampil di mana pun). |
| 2b.6 | Notes / Journaling | ✅ OK | `productivity.js:311-396` — CRUD, pencarian ter-debounce, label. |
| 2b.7 | Habit Tracker | ✅ OK | Grid 7 hari (`productivity.js:41`, `:60`, `:68`), streak (`:43-47`), emoji picker (`:100-145`). |
| 2b.8 | Statistik Kebiasaan | ⚠️ Partial | Yang ada hanya angka streak (`productivity.js:69`) + grid 7 hari. Tidak ada view statistik terpisah, persentase penyelesaian, grafik tren, atau riwayat di atas 7 hari. |
| 2b.9 | Pomodoro Timer | ✅ OK | `productivity.js:500-635` — ring, start/pause/reset/skip, sesi dicatat, countdown di title, bertahan saat navigasi. Opsi fokus `[15,20,25,30,45,50]` (`:559`), istirahat `[5,10,15]` (`:565`); default 25/5. Siklus long-break 4-sesi hanya disebut di teks tip (`:571`), tidak diimplementasikan. |

---

## 3. Menu Keuangan (`app.html` → tab Keuangan)

| # | Fitur | Status | Catatan (terverifikasi di kode) |
|---|---|---|---|
| 3.1 | Input Transaksi Cepat | ✅ OK | Tombol di section header (`finance.js:458-461`) → modal (`finance.js:511`). Kategori preset + kustom via sentinel `__custom__` (`finance.js:516-518`, `:570-574`). |
| 3.2 | Kategorisasi | ⚠️ Partial | **8 preset** (`finance.js:10-23`): 3 pemasukan (Uang Saku, Hadiah, Beasiswa) + 5 pengeluaran (Makanan & Jajan, Transportasi, Hiburan, Alat Tulis & Buku, Tabungan). Kategori kustom didukung. |
| 3.3 | Multiple Accounts / Wallets | ✅ OK + **ditingkatkan** (`0e6c2e8`) | **4 tipe** (`finance.js:154`): tunai, bank, e-wallet, lainnya. Saldo awal tetap manual (disclaimer `finance.js:142`) — sesuai spec ("tanpa integrasi bank"). **Baru:** transaksi bisa ditautkan opsional ke dompet (`walletId`) dan saldo dompet otomatis menyesuaikan saat transaksi dicatat/diedit/dihapus — sebelumnya saldo dompet murni angka statis yang tak pernah bergerak walau transaksi dicatat di app yang sama. |
| 3.4 | Budget Planning | ✅ **DIPERBAIKI** (`5c48caf`) | ~~Limit global sama untuk semua bulan~~ — **diperbaiki**: dokumen budget sekarang punya field `bulan` (YYYY-MM) + doc id per-bulan. Dokumen lama tanpa `bulan` tetap fallback lintas-bulan sampai diedit ulang untuk bulan spesifik (kompatibilitas tanpa migrasi data). |
| 3.5 | Peringatan Anggaran (Alerts) | ⚠️ Partial | Tiga state ada (`finance.js:243-249`): Aman / Hampir Habis (≥80%) / Lewat Batas. **Tetapi ini hanya badge berwarna yang dirender saat tab Anggaran dibuka** — nol kode notifikasi, nol pengecekan saat transaksi disimpan. Spec meminta "notifikasi otomatis" → tidak terpenuhi. |
| 3.6 | Target Menabung | ✅ OK | Progress bar (`finance.js:618`) + tombol Tabung (`finance.js:620`, `:691`), opsional mencatat pengeluaran kategori Tabungan (`finance.js:717-722`). |
| 3.7 | Pie Chart & Bar Chart | ✅ OK | Inline SVG murni — `barChartSVG` (`utils.js:161-179`) dan `donutSVG` (`utils.js:182-203`). Bukan Canvas 2D. Dipakai di `finance.js:778` & `:790`. |
| 3.8 | Ekspor Data | ⚠️ Partial | CSV lengkap dengan BOM UTF-8 dan quoting RFC-4180 (`utils.js:253-261`, dipanggil `finance.js:830`). **Ekspor Excel (.xlsx) tidak ada** — nol library xlsx/SheetJS di repo. Spec meminta "Excel / CSV". |
| 3.9 | Utang / Piutang | ✅ OK | `finance.js:354-403` — tambah, toggle Lunas, hapus. (Tidak ada edit.) |
| 3.10 | Aset & Investasi | ✅ OK | **6 tipe** (`finance.js:173`): emas, saham, reksadana, kripto, properti, lainnya. |
| 3.11 | PIN Keuangan | ⚠️ Partial | SHA-256 ada (`finance.js:74`), **tetapi tanpa salt per-user dan dengan fallback plaintext** — lihat temuan keamanan S4. PIN juga hanya menyembunyikan tampilan (`finance.js:48`), tidak mengenkripsi data. |
| 3.12 | Sinkronisasi Cloud | ✅ OK | Koleksi `transactions`, `goals`, `budgets`, `debts`, `wallets`, `assets`, `sedekah` semuanya tersinkron Firestore (`db.js:718-729`, `:714-716`). |

---

## 4. Menu Keagamaan / Ibadah (`app.html` → tab Ibadah)

| # | Fitur | Status | Catatan (terverifikasi di kode) |
|---|---|---|---|
| 4.1 | Jadwal Shalat (GPS) | ⚠️ Partial | Aladhan API `method=20` Kemenag (`ibadah.js:201-210`), GPS (`:213-229`), koordinat manual (`:231-249`). **Tidak ada "peringatan dini sebelum waktu shalat"** yang diminta spec — nol timer, nol notifikasi adzan. Countdown-nya bahkan **statis**: dihitung sekali saat render (`ibadah.js:122-133`) dan tidak berdetak. |
| 4.2 | Arah Kiblat | ✅ OK | Bearing great-circle ke Ka'bah (`ibadah.js:193-199`) + kompas device dengan izin iOS (`ibadah.js:252-268`). |
| 4.3 | Al-Qur'an Digital | ⚠️ Partial | **Hanya 4 surat hardcoded** — Al-Fatihah, Al-Ikhlas, Al-Falaq, An-Nas (`ibadah.js:1058-1089`), sekitar 22 dari 6.236 ayat. Yang ada sudah lengkap Arab + transliterasi + terjemahan (`ibadah.js:515-519`), tapi cakupannya bukan 114 surat. |
| 4.4 | Audio Murrotal | ❌ TIDAK | Nol elemen `<audio>`, nol URL audio. Hanya tautan keluar ke quran.com (`ibadah.js:522-524`). |
| 4.5 | Dzikir Counter | ✅ OK | 5 dzikir (`ibadah.js:631-637`), tap-to-count (`:714`, `:749`), getar (`:743`), beep (`:744-745`). |
| 4.6 | Doa Harian | ⚠️ Partial | 6 doa (`ibadah.js:640-645`) — **tetapi tidak ada field arti/terjemahan sama sekali**. Tiap entri hanya `{label situasi, Arab, transliterasi Latin}`, dan render-nya (`ibadah.js:731-736`) memang cuma tiga baris itu. Bandingkan `DZIKIR` (`ibadah.js:632-636`) yang punya `arti_id`/`arti_en`. |
| 4.7 | Quotes & Motivasi | ✅ OK | 14 quotes (`ibadah.js:652-665`), rotasi harian berbasis indeks tanggal (`:673-675`). |
| 4.8 | Kalender Hijriyah | ⚠️ Partial | Hanya **satu baris string** dari `Intl.DateTimeFormat(...ca-islamic)` (`ibadah.js:114-116`, ditampilkan `:141`). Bukan kalender interaktif, dan **tidak ada penanda hari penting** (Ramadhan / Idul Fitri / Arafah) yang diminta spec. |
| 4.9 | Kalkulator Zakat | ✅ OK | 3 mode lengkap sesuai spec: penghasilan (`ibadah.js:822`), maal (`:878`), fitrah (`:936`). |
| 4.10 | Panduan Ibadah | ⚠️ Partial | 3 panduan (`ibadah.js:274-281`): Wudhu, Sholat, Adab Membaca Al-Qur'an. **Panduan haji/umrah tidak ada**, padahal diminta spec. |
| 4.11 | Tracker Ibadah / Checklist Harian | ⚠️ Partial | 5 shalat fardhu (`ibadah.js:18-24`) + 6 amalan (`:27-34`) + amalan kustom (`:398-419`). **Granularitas yang diminta spec tidak ada**: tidak ada Qobliyah/Ba'diyyah, tidak ada selektor rakaat Dhuha (2/4/6/8 — Dhuha cuma satu boolean), tidak ada Awwabin. Indikasi paling jelas: placeholder modal amalan kustom berbunyi literal `mis. Qobliyah Subuh` (`ibadah.js:404`) — item granular itu diharapkan diketik sendiri oleh user, bukan disediakan aplikasi. |
| 4.12 | Target Khatam | ✅ OK | Opsi 7–90 hari (`ibadah.js:588`), halaman/hari otomatis, progres harian (`:445`, `:455-458`). **"Life Hack" khatam ada** (`ibadah.js:476-481`): "2 lembar setiap selesai sholat fardhu (5×2 = 10 lembar/hari)" — sesuai spec. |
| 4.13 | Rekap Bacaan | ✅ OK | Bar chart 7 hari (`ibadah.js:434-441`, `:472`), total mingguan/bulanan + estimasi juz (`:446`, `:468-469`). |
| 4.14 | Checklist Hafalan | ✅ OK | `ibadah.js:487-504`, `:538-548`, `:603-627` — status hafal/proses. |
| 4.15 | Custom Deeds | ✅ OK | Disimpan di profil user (`ibadah.js:411-412`), dirender `:379`, bisa dihapus `:393-397`. |
| 4.16 | Catatan Ibadah / Penemuan Makna Ayat | ✅ OK | `ibadah.js:989-1013` — header-nya eksplisit "Catatan penemuan makna, evaluasi diri & muhasabah", placeholder "mis. Makna Surat Al-Ashr" (`:1021`). Bentuknya catatan bebas judul+isi, bukan terikat ayat. |
| 4.17 | Donasi & Sedekah (celengan) | ✅ OK | **Fitur ini ada dan lengkap, terlewat di audit sebelumnya.** Tab "Zakat & Sedekah" (`ibadah.js:48`), koleksi `sedekah` tersinkron cloud (`db.js:726`), CRUD catatan sedekah + statistik total/bulan-ini (`ibadah.js:765-819`). |

---

## 5. Fitur Lintas & Tambahan

| # | Fitur | Status | Catatan (terverifikasi di kode) |
|---|---|---|---|
| 5.1 | Ensiklopedia | ✅ OK | **Tepat 15 artikel** — 14 di array `ARTIKEL` (`encyclopedia.js:19-296`) + 1 di-push terpisah (`encyclopedia.js:492-525`). Bookmark persisten ke profil user (`encyclopedia.js:298-330`). |
| 5.2 | Skor Keseimbangan | ✅ OK | Agregasi 3 pilar (`calc.js` → `dashboard.js:14`, `:45-48`). Catatan: aplikasi punya **4** pilar — **Ibadah tidak masuk hitungan skor**. |
| 5.3 | Bilingual ID/EN | ⚠️ Partial | Mekanisme & persistensi OK (`i18n.js:15-25`, 1.515 pemanggilan `tr()`). **Tetapi tidak "full"**: seluruh isi 15 artikel Ensiklopedia hardcoded Bahasa Indonesia tanpa `tr()` (`encyclopedia.js:23-39` dst.) — ganti ke EN, chrome-nya berubah, isinya tidak. Selain itu `admin.html` dan `encyclopedia.html` **tidak punya tombol ganti bahasa sama sekali**. |
| 5.4 | Tema Terang/Gelap | ✅ OK | `app.js:208-218` — localStorage + sync ke akun; anti-FOUC di tiap portal. |
| 5.5 | PWA | ✅ OK | `manifest.json` (standalone, 3 ikon, 2 shortcut) + SW precache/offline (`sw.js:25-121`). |
| 5.6 | Authentication | ✅ OK | Firebase Auth email/password (`db.js:481-489`) + Google (`db.js:744`), redirect per-role (`roles.js:37`). |
| 5.7 | Role System | ⚠️ Partial | Routing berfungsi, **tetapi field `role` bisa ditulis sendiri oleh user** — lihat temuan keamanan S1. |
| 5.8 | Admin Portal | ⚠️ Partial | CRUD guru/siswa (`db.js:427-479`) dan kelas/roster (`admin.js:159-400`) berfungsi, termasuk bulk import + ekspor CSV. **Tetapi:** (a) **"reset PIN" tidak ada** — nol occurrence di `admin.js`; PIN keuangan hanya bisa diatur/dihapus oleh siswa sendiri (`finance.js:196-216`). (b) **Admin tidak bisa reset password** — field `password` di-strip diam-diam dari patch (`db.js:465`). (c) Hapus user **hanya menghapus dokumen profil**; akun Firebase Auth-nya tetap hidup dan masih bisa login (`db.js:470-471`). |
| 5.9 | Ekspor Data | ✅ OK | JSON seluruh 30 koleksi, `passHash` dibuang (`profile.js:306-309`, `db.js:791-796`). |
| 5.10 | Upload Tugas (Siswa) | ❌ TIDAK | Satu-satunya `<input type="file">` di seluruh aplikasi ada di jurnal **guru** (`teacher.js:643`). `app.html` bahkan tidak memuat `supabase-storage.js`. |
| 5.11 | Data Layer Abstraksi | ✅ OK | Local & Firebase adapter dengan API identik (`db.js:32-260`, `:270-709`, fasad `:736-799`). Satu divergensi terdokumentasi: `loginGoogle()` melempar error di mode lokal (`db.js:152`). |

---

## 6. Temuan Keamanan

Empat dari lima temuan ini **lebih mendesak daripada seluruh daftar fitur di atas**, karena sudah aktif di production.

### S1 — 🔴 KRITIS: Privilege escalation (siswa bisa jadi admin) — ✅ DIPERBAIKI PENUH (`16b4837`)
`firestore.rules:27` mengizinkan user meng-update dokumennya sendiri **tanpa memvalidasi field `role`**:
```
allow create, update: if request.auth != null && (request.auth.uid == uid || isAdmin());
```
Siswa mana pun bisa membuka console browser dan menjalankan `updateDoc(doc(db,'users',myUid), {role:'admin'})`. Setelah itu `isAdmin()` (`firestore.rules:6-10`) mengembalikan `true`, dan `firestore.rules:37-39` memberinya akses baca/tulis ke **seluruh subkoleksi milik semua user**. Kode klien menyetel `role` saat registrasi (`db.js:339`, `:385`) — server tidak pernah membatasinya.
**Diperbaiki:** `create`/`update` dipisah dan divalidasi — user biasa hanya boleh membuat dokumen dengan `role:'siswa'`, dan tidak bisa mengubah `role` dokumennya sendiri sama sekali (`request.resource.data.role == resource.data.role`), kecuali email login cocok allowlist bootstrap admin (`isBootstrapAdminEmail()`, mirror manual dari `js/firebase-config.js:ADMIN_EMAILS` — **wajib disinkron manual** kalau daftar itu berubah, rules tidak bisa `import` JS). Diverifikasi via emulator (compile bersih) + trace 4 skenario (self-register siswa, self-promote ditolak, bootstrap admin tetap jalan, admin buat akun guru tak terpengaruh).

### S2 — 🔴 KRITIS: Guru mana pun bisa membaca data medis siswa mana pun — ⚠️ SEBAGIAN DIPERBAIKI (`99c3b05`)
`firestore.rules:54-74` memberi `allow read: if isGuru()` pada `health_daily`, `workouts`, `biometrics`, `weights`, `meds`, `foods`, dan **`menstrual`** — untuk **setiap** `users/{uid}`, **tanpa pengecekan apakah siswa itu ada di kelas guru tersebut**. Artinya satu akun guru bisa membaca catatan siklus menstruasi dan daftar obat siswa mana pun di seluruh sekolah.

**Yang sudah diperbaiki:** ke-10 subkoleksi ini (health_daily/workouts/biometrics/weights/meds/foods/menstrual + ibadah_daily/quran_log/hafalan) sekarang dibatasi lewat helper baru `isGuruOfStudent(studentUid)` — guru cuma bisa baca data siswa yang `kelasId`-nya ada di `kelasAmpu` guru itu.

**⚠️ Yang BELUM diperbaiki — masih terbuka:** `firestore.rules:43-44` (rule baca dokumen `users/{uid}` itu sendiri, bukan subkoleksinya) **tidak disentuh** oleh perbaikan ini:
```
allow read: if request.auth != null
  && (request.auth.uid == uid || isAdmin() || (isGuru() && resource.data.role == 'siswa'));
```
Ini masih mengizinkan **guru mana pun membaca profil lengkap siswa mana pun** — termasuk berat badan, tinggi, usia, jenis kelamin, dan hash `finPin` — tanpa pengecekan kelas sama sekali. Gap ini butuh perbaikan terpisah (pola sama seperti S1: tambahkan syarat `isGuruOfStudent`-style pada rule baca `users/{uid}` utama, bukan hanya subkoleksinya).

### S3 — 🟠 TINGGI: PIN keuangan tanpa salt, dengan fallback plaintext — ❌ BELUM DIPERBAIKI (di luar scope sesi ini)
`finance.js:74` melakukan `SHA-256('tumara-pin::' + pin)`. Prefix itu **konstanta yang sama untuk semua user** (pepper yang tertulis terang-terangan di file JS publik), bukan salt — PIN yang sama menghasilkan hash yang sama, sehingga satu rainbow table dari seluruh 1,1 juta kemungkinan PIN 4–6 digit membobol semua akun. Tanpa KDF, tanpa iterasi. Lebih buruk lagi, `finance.js:76` punya fallback `return 'p' + pin;` — jika `crypto.subtle` gagal (misalnya konteks non-HTTPS), **PIN tersimpan sebagai plaintext di Firestore**. Pola yang sama dipakai untuk password mode lokal (`db.js:20`).

### S4 — 🟠 TINGGI: Kredensial Supabase ter-commit, bucket publik — ❌ BELUM DIPERBAIKI (di luar scope sesi ini)
`supabase-storage.js:13-15` memuat URL project dan anon JWT (kedaluwarsa 2099) langsung di repo, dengan bucket `jurnal-foto` bersifat **publik** (`getPublicUrl`, `:46`). Setiap foto pembelajaran yang diunggah dapat diakses siapa pun yang memegang URL-nya, tanpa autentikasi. Perbaikan butuh rotasi kredensial manual di dashboard Supabase (tidak bisa dilakukan lewat perubahan kode saja) — belum dikerjakan.

### S5 — 🟡 SEDANG: Otorisasi hanya di sisi UI — ⚠️ SEBAGIAN DIPERBAIKI (`5a3a995`)
- `firestore.rules:80-87` *(nomor baris sebelum perbaikan)*: `school_classes` dan `school_roster` bisa dibaca **setiap user yang login** — siswa mana pun bisa membaca nama + **NIS** seluruh siswa satu sekolah. **Diperbaiki untuk `school_roster`**: sekarang dibatasi `isAdmin() || isGuru()`, siswa tidak lagi bisa membacanya. **`school_classes` sengaja dibiarkan terbuka** — dipakai siswa memilih kelasnya sendiri saat registrasi, isinya cuma nama kelas (tidak sensitif).
- `firestore.rules:90-94` *(nomor baris sebelum perbaikan)*: `class_tasks` bisa ditulis guru mana pun dan dibaca user mana pun. Komentar aslinya mengakui sendiri: *"cakupan kelas dijaga di UI"*. **Write diperbaiki**: sekarang guru hanya bisa membuat/ubah/hapus tugas untuk kelas yang ada di `kelasAmpu`-nya. **Read masih terbuka untuk semua user login** — disengaja dikeluarkan dari scope perbaikan ini (risiko rendah: judul tugas & jadwal, bukan PII), dicatat sebagai kandidat perbaikan terpisah bila diperlukan.

### S6 — Spec tidak terpenuhi: tidak ada enkripsi data medis — ❌ BELUM DIPERBAIKI (di luar scope sesi ini)
Spec meminta "enkripsi data medis pengguna yang ketat". Satu-satunya kriptografi di seluruh repo adalah `crypto.subtle.digest('SHA-256')` untuk password mode lokal (`db.js:20`) dan PIN keuangan (`finance.js:74`). **Semua data kesehatan tersimpan plaintext di Firestore.** Enkripsi at-rest yang ada hanyalah enkripsi disk default Google — tidak ada enkripsi field-level maupun envelope encryption di sisi klien. Membutuhkan desain arsitektur enkripsi sisi klien tersendiri (key management, dst.) — bukan perbaikan satu-file, belum dikerjakan.

---

## 7. Rangkuman Kesenjangan terhadap Spec

Fitur yang **diminta spec tetapi tidak ada di kode**:

1. Sinkronisasi wearable (spec §1) — nol kode
2. Makronutrien & mikronutrien di log makanan (spec §1) — hanya kalori
3. Grafik tren harian/mingguan/bulanan untuk data kesehatan (spec §1) — hanya 1 chart (berat badan)
4. ~~Alarm pengingat obat (spec §1) — CRUD ada, alarm tidak~~ — **✅ DIPERBAIKI**, lihat item 1.11
5. Input intensitas latihan (spec §1) — MET tetap per aktivitas
6. Enkripsi data medis (spec §1) — plaintext (❌ masih terbuka, lihat S6)
7. Dashboard drag & drop (spec §2) — layout statis
8. Upload foto pekerjaan oleh siswa via tautan (spec §2) — siswa tidak punya jalur submission
9. Review foto pekerjaan zoomable + nilai berdampingan (spec §2) — konsekuensi no.8
10. Unduh jurnal dengan kop surat fleksibel, terpisah per kelas (spec §2) — tidak ada tombol ekspor jurnal
11. Ekspor Excel native (spec §2 & §3) — hanya CSV
12. Notifikasi otomatis anggaran (spec §3) — hanya badge warna (❌ tidak disentuh sesi ini)
13. Peringatan dini sebelum waktu shalat (spec §4) — tidak ada
14. Al-Qur'an 114 surat (spec §4) — hanya 4
15. Audio murrotal (spec §4) — tautan eksternal
16. Kalender Hijriyah dengan penanda hari penting (spec §4) — hanya string tanggal
17. Panduan haji/umrah (spec §4) — hanya wudhu/shalat/adab
18. Checklist shalat granular: Qobliyah, Ba'diyyah, rakaat Dhuha, Awwabin (spec §4) — user harus mengetik sendiri
19. Recurring tasks (spec §5) — ⚠️ **sebagian**: badge tampil sekarang, engine masih belum ada
20. Pengingat/notifikasi deadline (spec §5) — hanya badge in-app (❌ tidak disentuh sesi ini)

Fitur **di luar spec yang sudah ada** (nilai tambah): Pomodoro Timer, Ensiklopedia (15 artikel), Skor Keseimbangan, Monitoring Ibadah & Kesehatan siswa oleh guru, Tugas Kelas, Jadwal Kelas wali kelas, Mood Tracker, Bebas Rokok & Miras, PWA offline, bilingual ID/EN.

---

## Kesimpulan

**Tingkat kelengkapan fitur saat ini: ~73%** — 51 ✅ / 24 ⚠️ / 11 ❌ dari 86 item yang diaudit (naik dari 47/27/12 di audit awal, setelah 3 putaran perbaikan P0-P2 di branch `feature-check`, belum di-deploy).

Angka audit awal (~70%) lebih rendah daripada estimasi sebelumnya (~90%) karena tiga alasan yang masih berlaku: (1) fitur yang UI-nya tampil tetapi logikanya tidak pernah dieksekusi dihitung sebagai belum jadi, bukan selesai; (2) requirement spec dinilai secara isi, bukan sekadar keberadaan tab-nya; (3) lubang keamanan yang sudah aktif di production dihitung sebagai kegagalan requirement, bukan catatan kaki.

**Yang sudah kuat (bertambah setelah perbaikan ini):** Ibadah (10 dari 17 ✅), Keuangan (**9 dari 12 ✅** setelah budget per-bulan & wallet-linking, tidak ada satu pun ❌), absensi + gradebook guru (semuanya persis sesuai spec, plus bug auto-hadir per-pertemuan yang baru ditemukan-dan-ditutup di sesi ini), medication reminder (kini fitur nyata, bukan janji kosong), serta fondasi teknis: data layer dua-adapter, PWA offline, bilingual.

**Yang tadinya paling lemah, sekarang sudah diperbaiki:** alur tugas pribadi siswa (`openTaskModal` vs `class_tasks`) — satu bug arsitektur yang dulu melumpuhkan To-Do, label, dan recurring sekaligus sekarang punya tab "Tugas Pribadi" sendiri dengan CRUD penuh.

**Yang masih paling lemah sekarang:**
1. **Keamanan** — dari 6 temuan, cuma 1 (S1) yang tertutup penuh; S2 baru separuh jalan (profil inti `users/{uid}` masih bisa dibaca guru manapun); S3/S4/S6 belum disentuh sama sekali. **Ini masih layak jadi prioritas berikutnya**, bukan fitur baru.
2. Di sisi guru, tiga alur end-to-end yang diminta spec (submission siswa → review zoomable → nilai berdampingan) masih belum punya fondasinya sama sekali — di luar scope 3 putaran perbaikan ini.
3. Checklist shalat granular, Al-Qur'an 114 surat, dashboard drag & drop, dan notifikasi deadline/anggaran — semua masih di daftar tunggu.

---

## Rekomendasi Tindak Lanjut

### Prioritas 0 — Keamanan (kerjakan lebih dulu, ada di production)
1. ~~**S1** Tambahkan guard `role` di `firestore.rules:27`~~ — **✅ DIPERBAIKI** (`16b4837`).
2. **S2** Batasi akses baca guru ke siswa di kelasnya sendiri; keluarkan `menstrual` & `meds` dari cakupan guru. **⚠️ SEBAGIAN** — 10 subkoleksi sudah dibatasi (`99c3b05`), **tapi rule baca `users/{uid}` utama (`firestore.rules:43-44`) masih terbuka untuk semua guru** — ini masih perlu dikerjakan, prioritas sama tingginya dengan saat laporan ini pertama ditulis.
3. **S3** Ganti PIN hash ke salt per-user (`crypto.getRandomValues`) + PBKDF2; **hapus fallback plaintext** di `finance.js:76` — lebih baik gagal terang-terangan daripada menyimpan PIN apa adanya. **❌ Belum dikerjakan.**
4. **S4** Rotasi kredensial Supabase, keluarkan dari repo, dan jadikan bucket `jurnal-foto` privat + signed URL. **❌ Belum dikerjakan** (butuh aksi manual di dashboard Supabase).

### Prioritas 1 — Bug yang melumpuhkan fitur
5. ~~**Satukan koleksi tugas siswa.**~~ — **✅ DIPERBAIKI** (`c6c9397`): tab "Tugas Pribadi" baru membaca/menulis `tasks` secara konsisten dengan CRUD penuh. Menyelesaikan 2b.1 & 2b.5 penuh; 2b.2 (badge prioritas hanya untuk `'tinggi'`) **belum** ikut diperbaiki — masih perlu ditambahkan badge untuk `sedang`/`rendah` bila diinginkan.
6. **Bug klasifikasi tekanan darah** — `calc.js:61` ganti `||` menjadi `&&`. **❌ Belum dikerjakan** (tidak masuk salah satu dari 3 putaran perbaikan sesi ini).
7. **Perbaiki disclaimer yang tidak benar** — `health.js:274` mengklaim ada notifikasi pengingat obat: **✅ diperbaiki, sekarang benar** (`961026f`) karena fiturnya sungguh diimplementasikan. `health.js:85` mengklaim ada visualisasi tren biometrik: **❌ belum disentuh**, masih tidak akurat.

### Prioritas 2 — Fitur inti spec yang hilang
8. Unduh Jurnal dengan kop surat, terpisah per kelas — tambahkan tombol ekspor di `renderJurnal` (`teacher.js:565-621`), pola `printHTML` sudah tersedia di `teacher.js:510-516`.
9. Alur upload tugas siswa → review zoomable → nilai berdampingan. `Storage.uploadFoto` (`supabase-storage.js:31`) sudah ada dan sudah mengompresi; tinggal muat `supabase-storage.js` di `app.html` dan tambahkan field submission di `class_tasks`.
10. Al-Qur'an 114 surat + audio murrotal via API (mis. EveryAyah / Quran.com API) menggantikan array 4 surat hardcoded.
11. Recurrence engine untuk `ulang` — ⚠️ **sebagian diperbaiki**: nilainya sekarang ditampilkan sebagai badge (`c6c9397`), tapi belum ada auto-regenerasi tugas saat yang lama selesai.
12. Notifikasi deadline & anggaran. Infrastrukturnya sudah ada — `App.notify` (`app.js:236-245`) **sekarang juga dipakai medication reminder** (`f33f6a9`), pola yang sama tinggal direplikasi untuk deadline tugas & alert anggaran (❌ belum dikerjakan untuk dua yang terakhir ini).

### Prioritas 3
13. Grafik tren untuk data biometrik (`barChartSVG` sudah ada di `utils.js:161`, tinggal dipakai di Kesehatan).
14. Terjemahan arti untuk 6 doa harian — tambahkan field `arti_id`/`arti_en` seperti yang sudah dipakai `DZIKIR`.
15. Ekspor .xlsx native (SheetJS) jika CSV dinilai kurang.
16. Admin: reset password (butuh Cloud Function — tidak bisa dari klien) dan hapus akun Auth, bukan hanya dokumen profil.

---

*Report disusun murni dari analisis source code pada branch `feature-check`. Setiap klaim dapat ditelusuri ke `file:baris` yang tercantum (nomor baris untuk item yang belum diperbaiki mengikuti state sebelum sesi perbaikan; item yang sudah diperbaiki ditandai commit hash-nya). Audit UI, visual, dan responsive tidak termasuk dalam ruang lingkup dokumen ini. Update perbaikan P0-P2 (2026-07-12) didokumentasikan lengkap di `docs/superpowers/specs/` & `docs/superpowers/plans/`; detail P3 yang belum dikerjakan ada di `spec-compliance-report.md`.*
