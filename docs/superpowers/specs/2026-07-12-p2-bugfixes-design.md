# Desain: Perbaikan P2 — 5 Bug Fitur Existing

**Tanggal:** 2026-07-12
**Sumber:** `spec-compliance-report.md`, bagian P2 ("Bug fitur existing").
**Scope:** `js/views/finance.js` (item 1-2), `js/views/productivity.js` (item 3, 5), `js/views/dashboard.js` (item 3, tautan tombol saja), `js/views/teacher.js` (item 4). Tidak ada perubahan skema Firestore Rules.

## Latar Belakang

Lima bug ditemukan di fitur yang sudah "ada" tapi berperilaku salah atau setengah jalan:
1. Budget keuangan berlaku sama untuk semua bulan (limit Januari = limit Desember).
2. Saldo dompet tidak pernah berubah walau transaksi dicatat.
3. Tugas pribadi (dibuat dari tombol cepat Dashboard, koleksi `tasks`) tidak muncul di tab Tugas menu Produktivitas — tab itu sudah dialihkan khusus untuk tugas dari guru (koleksi `class_tasks`), meninggalkan tugas pribadi tanpa tempat tampil/edit/hapus.
4. Fitur "auto-isi jumlah hadir" di Jurnal Mengajar mengabaikan field `pertemuan`, sehingga dua pertemuan di tanggal yang sama saling menimpa data kehadirannya.
5. Field `ulang` (recurring: harian/mingguan/bulanan) tersimpan di form tugas tapi tidak pernah dibaca/ditampilkan di mana pun.

Keputusan produk yang sudah diambil user:
- Item 3: tugas pribadi dapat **tab terpisah** ("Tugas Pribadi") di menu Produktivitas, bukan dihapus.
- Item 5: field `ulang` **ditampilkan sebagai badge saja** (bukan auto-generate instance baru saat tugas selesai — itu didorong ke P3).

## Fix 1 — Budget per bulan (`js/views/finance.js`)

**Skema baru:** dokumen `budgets` dapat field `bulan` (string `YYYY-MM`). Doc id berubah dari `'b_' + kategoriSlug` menjadi `'b_' + bulan + '_' + kategoriSlug`.

**Kompatibilitas mundur:** dokumen lama (dibuat sebelum fix ini, tanpa field `bulan`) tetap ditampilkan sebagai berlaku di **semua** bulan sampai user mengedit ulang lewat `_budgetModal` — begitu disave ulang, otomatis dapat `bulan` dari `this.month` yang sedang aktif dan jadi ter-scope. Tidak ada migrasi data satu-kali yang dijalankan otomatis (tidak ada mekanisme migrasi di app ini — semua client-side).

**Perubahan di `renderBudget` (baris 223-270):**
- Filter `budgets` yang ditampilkan: `b.bulan === this.month || b.bulan == null`.
- `terpakaiPer` (pemakaian aktual) sudah benar per-bulan — tidak berubah.

**Perubahan di `_budgetModal` (baris 272-350):**
- `cur(k)` (nilai limit saat ini) harus mencari budget yang match `kategori` **dan** (`bulan === this.month` atau `bulan == null`), bukan sekadar `kategori` saja.
- Saat simpan: doc id jadi `'b_' + this.month.replace(/[^a-zA-Z0-9]+/g,'_') + '_' + k.key.replace(/[^a-zA-Z0-9]+/g,'_')`, data yang ditulis menyertakan `bulan: this.month`.
- Kategori kustom: pola id yang sama diterapkan.

## Fix 2 — Dompet terhubung ke transaksi (`js/views/finance.js`)

**Skema baru:** dokumen `transactions` dapat field opsional `walletId` (string, id dompet, atau `''`/`null` bila tidak dipilih).

**UI (`openTxModal`, baris 511-589):** tambah field `<select id="mWallet">` berisi daftar `wallets` (dari `DB.list('wallets')`, di-fetch di awal fungsi) + opsi pertama "Tidak dari dompet manapun". Kalau user tidak punya dompet sama sekali, select tetap muncul dengan hanya opsi itu — tidak ada perubahan perilaku untuk siapa pun yang belum memakai fitur dompet.

**Logika penyesuaian saldo saat simpan (`#mSave` handler):**
- **Tambah transaksi baru** dengan `walletId` terisi: `delta = tipe === 'masuk' ? +jumlah : -jumlah`; update `wallets/{walletId}.saldo += delta`.
- **Edit transaksi:** balikkan dulu efek transaksi **lama** (pakai `tx.walletId`, `tx.tipe`, `tx.jumlah` — nilai sebelum form diedit) ke dompet lamanya, baru terapkan efek transaksi **baru** ke dompet barunya. Ini menangani kasus dompet/jumlah/tipe berubah sekaligus dalam satu edit tanpa cabang khusus per kombinasi.
- **Hapus transaksi** (`renderTx` baris 502-507): balikkan efek transaksi yang dihapus ke dompetnya (pakai data transaksi sebelum dihapus) sebelum memanggil `DB.remove`.

Semua penyesuaian saldo dibungkus try/catch longgar (`catch (_) {}`) agar kegagalan update saldo dompet (mis. dompet sudah dihapus duluan) tidak memblokir pencatatan transaksinya sendiri — transaksi tetap sumber kebenaran utama.

## Fix 3 — Tab "Tugas Pribadi" (`js/views/productivity.js`, `js/views/dashboard.js`)

Tab baru di menu Produktivitas, sejajar dengan tab "Tugas" (dari guru) yang sudah ada — namanya "Tugas Pribadi", membaca `DB.list('tasks')` (bukan `class_tasks`).

**Render:** list task dengan checkbox toggle selesai (`data: {status: 'aktif'|'selesai'}`), tombol edit (memanggil `Prod.openTaskModal(task)` — modal ini sudah ada lengkap, cuma belum pernah dipanggil dengan argumen task nyata dari UI manapun) dan tombol hapus (`DB.remove('tasks', id)`).

**Tombol tambah** di tab ini memanggil `Prod.openTaskModal()` (tanpa argumen) — modal yang sama persis dengan yang sudah dipakai tombol cepat Dashboard (`dashboard.js:171`), jadi tidak ada duplikasi kode modal.

**Dashboard tidak berubah** — preview 3 tugas teratas & tombol cepat "+Tugas" di `dashboard.js` sudah benar memakai koleksi `tasks`; fix ini hanya memberi tab tujuan yang benar-benar menampilkannya secara penuh.

## Fix 4 — Auto-hadir jurnal per pertemuan (`js/views/teacher.js`)

Di `_jurnalModal`'s `#mSave` handler (baris 666-690):

Sebelum:
```js
if (hadir === null) {
  const att = (await DB.list('attendance')).filter(a => a.classId === this.classId && a.tanggal === tgl);
  ...
}
```
Sesudah:
```js
if (hadir === null && pert) {
  const att = (await DB.list('attendance')).filter(a => a.classId === this.classId && a.tanggal === tgl && a.pertemuan === pert);
  ...
}
```
Kalau field "Pertemuan ke-" (`pert`) kosong, `hadir` dibiarkan `null` (tidak ditebak dari data yang ambigu — lebih baik guru mengisi manual daripada dapat angka yang salah).

## Fix 5 — Badge tugas berulang (bagian dari Fix 3)

Di kartu tugas pada tab "Tugas Pribadi" baru: kalau `task.ulang && task.ulang !== 'tidak'`, tampilkan badge `🔁 Harian`/`🔁 Mingguan`/`🔁 Bulanan` di samping badge prioritas yang sudah ada. Tidak ada logika generate instance baru — field `ulang` sekarang setidaknya terlihat, bukan disimpan diam-diam.

## Testing

Tidak ada test framework otomatis di repo ini (dikonfirmasi sejak P0). Verifikasi: `node --check` per file yang diubah (syntax gate, sudah terbukti berguna di P1), smoke test browser via Playwright (load app, cek 0 console error), dan checklist manual per fix untuk dijalankan user dengan login nyata:

1. **Budget:** set limit kategori "Makan" Rp50.000 di bulan Juli, pindah ke bulan Agustus di date picker → limit Agustus harus kosong (bukan ikut Rp50.000 Juli) sampai diisi sendiri.
2. **Wallet:** buat dompet "Tunai" saldo Rp100.000, catat transaksi keluar Rp20.000 pilih dompet "Tunai" → saldo dompet jadi Rp80.000. Edit transaksi jadi Rp30.000 → saldo jadi Rp70.000 (bukan Rp80.000-30.000=Rp50.000, harus lewat balik-lalu-terap ulang). Hapus transaksi → saldo balik Rp100.000.
3. **Tugas Pribadi:** tambah tugas dari Dashboard → buka Produktivitas → tab "Tugas Pribadi" → tugas tsb harus muncul, bisa diedit & dihapus dari sana.
4. **Jurnal:** input absensi pertemuan 1 (semua hadir) dan pertemuan 2 (1 siswa alfa) di tanggal yang sama → buat jurnal pertemuan 1 kosongkan field hadir → harus auto-isi sesuai pertemuan 1 saja, bukan gabungan.
5. **Badge berulang:** buat tugas pribadi dengan "Ulangi: Mingguan" → kartunya di tab Tugas Pribadi harus menampilkan badge "🔁 Mingguan".
