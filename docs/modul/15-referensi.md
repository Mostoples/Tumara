# Bab 15 — Referensi

> **Tujuan bab ini:** Anda punya satu tempat untuk mencari cepat nama fungsi, bentuk data, atau aturan keamanan yang lupa — tanpa harus membuka ulang bab yang membahasnya panjang lebar.

| | |
|---|---|
| **Perkiraan waktu** | dipakai sambil lalu, bukan dibaca sekali habis |
| **Sebelum ini** | [Bab 14 — Deploy & Pemeliharaan](14-deploy-dan-pemeliharaan.md) |
| **Anda butuh** | Tidak ada bab baru untuk diketik — bab ini rangkuman dari Bab 01–14 |

## Apa isi bab ini

Bab ini **bukan bab ke-15 untuk dikerjakan berurutan**. Anggap ini lampiran modul: kamus kata kerja `DB`, kamus fungsi `js/utils.js`, tabel lengkap koleksi Firestore, ringkasan siapa boleh apa di Security Rules, daftar istilah, kumpulan kotak "Jujur soal ini" yang tersebar di bab-bab lain, dan peta seluruh modul. Semua dalam bentuk tabel supaya cepat dipindai — tinggal `Ctrl+F` nama fungsi atau istilah yang Anda cari.

---

## 1. Kamus API `DB` (`js/db.js`)

`DB` adalah satu-satunya pintu data aplikasi (dibangun penuh di [Bab 05](05-lapisan-data-db-js.md)). Semua method di bawah `async` — selalu dipanggil dengan `await`. Ingat pembagian besarnya: `list/add/update/set/remove` untuk data **pribadi** pengguna, `gList/gAdd/gUpdate/gSet/gRemove/gGet` (awalan `g` = *global*) untuk data **bersama** sekolah. Salah pilih kelompok berarti salah tempat data tersimpan — dan salah siapa yang bisa membacanya.

### Auth

| Fungsi | Untuk apa | Contoh |
|---|---|---|
| `DB.init()` | Muat sesi yang sedang login (dipanggil sekali di awal tiap halaman lewat `guardPage`) | `const u = await DB.init();` |
| `DB.register({nama,email,password,role})` | Daftar akun baru | `await DB.register({nama:'Budi',email:'budi@x.id',password:'rahasia123'});` |
| `DB.login(identitas, password)` | Masuk pakai nama+NIS (siswa/guru) atau email (admin) | `await DB.login('Budi Santoso','12345');` |
| `DB.logout()` | Keluar & bersihkan sesi/cache | `await DB.logout();` |
| `DB.user` | Objek pengguna yang sedang login (getter, bukan fungsi) | `DB.user.nama` |
| `DB.updateUser(patch)` | Ubah field profil sendiri | `await DB.updateUser({bahasa:'en'});` |
| `DB.changePassword(lama, baru)` | Ganti kata sandi | `await DB.changePassword('12345','54321');` |

Method Auth di atas hampir tidak pernah Anda panggil langsung di halaman aplikasi — `guardPage()` (dari `js/roles.js`, lihat §7 Bab 06) dan `js/views/auth.js` sudah membungkusnya. Tapi berguna dihafal karena muncul terus saat men-debug lewat Console.

### Admin

Seluruh method di bawah butuh peran `admin` — dijaga di UI oleh `guardPage(['admin'])` dan di server oleh Security Rules (§4). Dibahas penuh di [Bab 11 — Panel Admin](11-panel-admin.md).

| Fungsi | Untuk apa | Contoh |
|---|---|---|
| `DB.adminListUsers()` | Semua akun (tanpa `passHash`) | `const semua = await DB.adminListUsers();` |
| `DB.listStudents()` | Semua akun ber-`role:'siswa'` | `const siswa = await DB.listStudents();` |
| `DB.listStudentsByClass(classId)` | Siswa yang sudah onboarding & memilih kelas ini | `await DB.listStudentsByClass('7a');` |
| `DB.adminCreateUser({nama,username,email,password,role,extra})` | Buat akun guru/siswa tanpa menendang admin dari sesinya | `await DB.adminCreateUser({nama:'Siti',password:'1234',role:'siswa'});` |
| `DB.adminUpdateUser(id, patch)` | Ubah profil akun lain | `await DB.adminUpdateUser(id,{role:'guru'});` |
| `DB.adminDeleteUser(id)` | Hapus dokumen profil (akun admin ditolak) | `await DB.adminDeleteUser(id);` |

### Data pribadi (`users/{uid}/{coll}/{id}`)

Ini kelompok yang paling sering dipakai — setiap fitur siswa di Bab 09 (Tugas, Catatan, Keuangan, Ibadah, dst.) berdiri di atas lima method ini saja, dengan nama koleksi (`coll`) yang berbeda-beda.

| Fungsi | Untuk apa | Contoh |
|---|---|---|
| `DB.list(coll)` | Semua record milik pengguna login di satu koleksi | `await DB.list('tasks');` |
| `DB.add(coll, item)` | Tambah record baru (ID dibuat otomatis via `uid()`) | `await DB.add('notes',{isi:'catatan'});` |
| `DB.update(coll, id, patch)` | Gabung (merge) sebagian field ke record | `await DB.update('tasks',id,{selesai:true});` |
| `DB.set(coll, id, item)` | Timpa/upsert dengan ID tertentu | `await DB.set('health_daily',tgl,{air:3});` |
| `DB.remove(coll, id)` | Hapus satu record | `await DB.remove('notes',id);` |
| `DB.listStudentData(studentUid, coll)` | Guru membaca sub-koleksi siswa tertentu (tidak di-cache) | `await DB.listStudentData(uid,'ibadah_daily');` |

### Data global sekolah (`/{coll}/{id}`, level atas)

Data ini bukan milik satu pengguna — dibaca banyak orang (admin, guru, kadang siswa), ditulis segelintir (biasanya admin atau guru pengampu). Perhatikan `gSet` vs `gUpdate`: keduanya kelihatan mirip, tapi `gUpdate` menggabung (merge) dan tak bisa menghapus kunci dari map bersarang, sedangkan `gSet` menimpa penuh. Absensi **wajib** `gSet` — kalau tidak, siswa yang sudah dihapus dari daftar bisa "hidup lagi" (kronologi lengkapnya di [Bab 05 §9](05-lapisan-data-db-js.md#9-gset-vs-gupdate--bug-yang-menghidupkan-siswa-yang-sudah-dihapus)).

| Fungsi | Untuk apa | Contoh |
|---|---|---|
| `DB.gList(coll)` | Semua dokumen koleksi global | `await DB.gList('school_classes');` |
| `DB.gListWhere(coll, field, value)` | Query berfilter satu kondisi kesamaan | `await DB.gListWhere('class_tasks','classId','7a');` |
| `DB.gAdd(coll, item)` | Tambah satu dokumen global | `await DB.gAdd('school_classes',{nama:'7A'});` |
| `DB.gAddMany(coll, items)` | Tambah banyak sekaligus (import massal, batch 500) | `await DB.gAddMany('school_roster', barisExcel);` |
| `DB.gUpdate(coll, id, patch)` | Gabung (merge) — tidak bisa menghapus kunci dari map bersarang | `await DB.gUpdate('school_classes',id,{nama:'7B'});` |
| `DB.gSet(coll, id, data)` | Timpa penuh — wajib untuk absensi (lihat Bab 05 §9) | `await DB.gSet('class_attendance',id,{entries:{...}});` |
| `DB.gRemove(coll, id)` | Hapus dokumen global | `await DB.gRemove('class_tasks',id);` |
| `DB.gGet(coll, id)` | Baca satu dokumen by id | `await DB.gGet('class_schedule','7a');` |

### Helper tingkat tinggi

| Fungsi | Untuk apa | Contoh |
|---|---|---|
| `DB.getDaily(tanggal?)` | Ambil catatan kesehatan harian; tak pernah `null`, jatuh ke default | `await DB.getDaily();` |
| `DB.saveDaily(tanggal, patch)` | Simpan/gabung catatan harian, satu record per tanggal | `await DB.saveDaily(todayStr(),{tidur:7});` |
| `DB.exportAll()` | Kumpulkan seluruh koleksi pribadi jadi satu objek (ekspor data) | `const dump = await DB.exportAll();` |
| `DB.resetData()` | Kosongkan semua koleksi pribadi (dipakai fitur "reset akun") | `await DB.resetData();` |
| `DB.isFirebase` | `true`/`false`, adapter mana yang aktif (getter) | `if (DB.isFirebase) ...` |
| `DB.role` | Peran pengguna login, default `'siswa'` (getter) | `DB.role === 'guru'` |

Lengkap dan tak diringkas: [Bab 05 — Lapisan Data `db.js`](05-lapisan-data-db-js.md).

---

## 2. Kamus fungsi `js/utils.js`

`js/utils.js` tidak mendefinisikan satu objek besar seperti `DB` — isinya puluhan fungsi lepas dan beberapa objek kecil (`Saldo`, `PRIORITAS`), semuanya global karena Tumara tak memakai module bundler. Dikelompokkan di bawah sesuai kegunaan, bukan urutan file.

### DOM

| Fungsi | Untuk apa | Contoh |
|---|---|---|
| `$(sel, root?)` | `querySelector` singkat | `$('#form')` |
| `$$(sel, root?)` | `querySelectorAll` → array (bukan NodeList) | `$$('.kartu').forEach(...)` |
| `esc(str)` | Escape karakter HTML (`&<>"'`) sebelum disisipkan ke `innerHTML` — pertahanan utama dari XSS | `` `<b>${esc(nama)}</b>` `` |
| `uid()` | ID unik: waktu + acak, basis-36 | `const id = uid();` |

### Tanggal & format

| Fungsi | Untuk apa | Contoh |
|---|---|---|
| `todayStr(d?)` | `'YYYY-MM-DD'` berbasis waktu **lokal** (bukan UTC) | `todayStr()` → `'2026-07-17'` |
| `monthStr(d?)` | `'YYYY-MM'` | `monthStr()` → `'2026-07'` |
| `parseDate(iso)` | `'YYYY-MM-DD'` → objek `Date` lokal | `parseDate('2026-07-17')` |
| `fmtDate(iso, {weekday,short})` | Tampilan Indonesia/Inggris (`tr()`-aware) | `fmtDate('2026-07-17')` → `'17 Juli 2026'` |
| `fmtRp(n)` | Format Rupiah `Rp12.000` | `fmtRp(12000)` |
| `fmtRpM(n)` | Sama seperti `fmtRp`, tapi jadi `'Rp ••••••'` bila saldo disembunyikan | `fmtRpM(saldo)` |
| `daysUntil(iso)` | Selisih hari kalender dari hari ini | `daysUntil('2026-07-20')` → `3` |
| `deadlineBadge(iso)` | Badge HTML siap pakai ("Besok", "3 hari lagi", "Terlambat…") | `deadlineBadge(tugas.tenggat)` |
| `greeting()` | "Selamat pagi/siang/sore/malam" sesuai jam perangkat | `greeting()` |
| `clamp(n, min, max)` | Kunci angka ke rentang | `clamp(120, 0, 100)` → `100` |

### Saldo (objek `Saldo`)

| Anggota | Untuk apa |
|---|---|
| `Saldo.tersembunyi` | `true`/`false`, preferensi tampil-sembunyi (getter/setter, tersimpan di `localStorage`, per perangkat) |
| `Saldo.toggle()` | Balik status, kembalikan nilai baru |
| `Saldo.btnHTML(id?)` | Tombol "mata" siap tempel di header kartu |

### UI

| Fungsi | Untuk apa | Contoh |
|---|---|---|
| `toast(msg, type?)` | Notifikasi mengambang 2,8 detik (`success`/`error`/`warning`/`info`) | `toast('Tersimpan!');` |
| `openModal({title, body, onMount})` | Buka modal generik; `onMount(el)` untuk memasang event | `openModal({title:'Judul', body:'<p>Isi</p>'});` |
| `closeModal()` | Tutup modal aktif | `closeModal();` |
| `confirmDialog(pesan, {title,okText,danger})` | Modal konfirmasi, mengembalikan `Promise<boolean>` | `if (await confirmDialog('Hapus?')) ...` |
| `openImageViewer(url)` | Lightbox layar penuh dengan zoom/pan (pinch, scroll, dobel-ketuk) | `openImageViewer(foto.url);` |

### Grafik SVG

`ringSVG`, `barChartSVG`, `donutSVG` **bukan library** — murni matematika `stroke-dasharray`/`stroke-dashoffset` di atas `<svg>` polos, tanpa dependensi luar. Ketiganya mengembalikan **string HTML** siap ditempel lewat `innerHTML`, bukan elemen DOM — konsisten dengan cara seluruh Tumara merender tampilan (lihat kontrak `render(el)` di Bab 08).

| Fungsi | Untuk apa | Contoh |
|---|---|---|
| `ringSVG(pct, opts?)` | Cincin progres melingkar (0–100%) | `ringSVG(70)` → dipakai skor keseimbangan di Beranda |
| `barChartSVG(items, opts?)` | Diagram batang sederhana dari `[{label,value}]` | `barChartSVG([{label:'Sen',value:3}])` |
| `donutSVG(items, opts?)` | Diagram donat berwarna dari `[{label,value,color}]` | `donutSVG([{label:'Makan',value:50,color:'#f66'}])` |

### File

| Fungsi | Untuk apa | Contoh |
|---|---|---|
| `beep(freq?, duration?, count?)` | Bunyi notifikasi lewat Web Audio API (mis. Pomodoro selesai) | `beep();` |
| `triggerDownload(blob, filename)` | Picu unduhan lintas-browser (anchor di DOM + jeda sebelum `revokeObjectURL`) | `triggerDownload(blob,'data.csv');` |
| `downloadJSON(obj, filename)` | Unduh objek sebagai `.json` | `downloadJSON(dump,'ekspor.json');` |
| `downloadCSV(rows, filename)` | Unduh sebagai `.csv` (RFC 4180, BOM UTF-8 untuk Excel) | `downloadCSV(rows,'nilai.csv');` |
| `compressImage(file, opts?)` | Kecilkan foto → data URL JPEG (aman disimpan di Firestore) | `await compressImage(file,{maxDim:800});` |
| `printHTML(title, innerHTML)` | Cetak/simpan PDF lewat jendela baru + dialog cetak browser | `printHTML('Rapor', html);` |

### Prioritas tugas

| Anggota | Untuk apa |
|---|---|
| `PRIORITAS` | Kamus `tinggi/sedang/rendah` → `{kode, urut, badge, nama()}` |
| `prioKey(p)` | Normalisasi nilai prioritas; data lama tanpa `prioritas` jatuh ke `'sedang'` |
| `prioUrut(p)` | Angka urutan untuk `sort()` |
| `prioBadge(p)` | Badge lengkap `"P1 · Tinggi"` |
| `prioTag(p)` | Badge ringkas `"P1"` untuk baris sempit |

### Normalisasi data lama

| Fungsi | Untuk apa |
|---|---|
| `taskAttachments(t)` | Selalu kembalikan array lampiran tugas guru, entah data lama (`lampiran` tunggal) atau baru (`attachments[]`) |
| `submissionFiles(s)` | Sama, untuk pengumpulan siswa (`url` lama vs `files[]` baru) |

### Drag-reorder

| Fungsi | Untuk apa |
|---|---|
| `makeSortable(container, {itemSelector, key, ignore, onEnd})` | Susun ulang tile dengan geser (Pointer Events, jalan di sentuhan & tetikus); `onEnd` menerima urutan `data-<key>` baru untuk disimpan |

### Identitas akun

`usernameOf`, `toAuthEmail`, `toAuthPassword`, `isInternalEmail` — mengubah nama lengkap+NIS jadi email/sandi internal Firebase Auth. Dibahas penuh di [Bab 06 — Masuk, Daftar & Peran](06-masuk-daftar-dan-peran.md).

---

## 3. Model data Firestore lengkap

Ingat analogi lemari arsip: `users/{uid}` adalah loker pribadi tiap orang, sub-koleksi di dalamnya adalah map-map di loker itu, dan koleksi level-atas (`school_classes`, `class_tasks`, dst.) adalah papan pengumuman & buku induk di ruang TU yang dipakai bersama. Kolom "Bentuk field utama" di bawah **tidak lengkap** untuk tiap koleksi (banyak field opsional ditambahkan seiring fitur berkembang) — tujuannya menolong Anda menebak nama field yang benar saat menulis kode baru, bukan jadi skema resmi yang kaku (Firestore memang tak punya skema tetap).

### Data pribadi — `users/{uid}` (profil) + `users/{uid}/{coll}/{id}` (sub-koleksi)

| Koleksi | Bentuk field utama | Siapa menulis | Bab terkait |
|---|---|---|---|
| `users/{uid}` (dokumen profil) | `nama`, `email`, `role`, `username`, `kelasId`, `nis`, `mapel`, `waliKelasId`, `guruSetup`, `profileComplete`, `bahasa` | Pemilik akun; admin | 06, 11 |
| `health_daily` | `tanggal` (ID dok), `kalori`, `air`, `tidur`, `olahraga`, `bebasRokok`, `bebasMiras` | Siswa | 09 |
| `workouts` | `tanggal`, `jenis`, `durasi`, `kaloriTerbakar` | Siswa | 09 |
| `notes` | `isi`, `dibuatPada` | Siswa | 09 |
| `tasks` | `judul`, `tenggat`, `prioritas`, `selesai` | Siswa (tugas pribadi — beda dari `class_tasks` guru) | 09 |
| `schedule` | `hari`, `jam`, `judul` | Siswa | 09 |
| `transactions` | `tanggal`, `jumlah`, `jenis` (masuk/keluar), `kategori` | Siswa | 09 |
| `goals` | `nama`, `target`, `terkumpul`, `tenggat` | Siswa | 09 |
| `pomodoro` | `tanggal`, `sesiSelesai` | Siswa | 09 |
| `weights` | `tanggal`, `berat` | Siswa | 09 |
| `meds` | `nama`, `jadwal`, `catatan` | Siswa | 09 |
| `habits` | `nama`, `streak` | Siswa | 09 |
| `habit_logs` | `habitId`, `tanggal` | Siswa | 09 |
| `ibadah_daily` | `tanggal`, checklist sholat/amalan (auto-reset tengah malam lokal) | Siswa (guru: baca saja) | 09 |
| `hafalan` | `surat`, `ayat`, `tanggal` | Siswa (guru: baca saja) | 09 |
| `quran_log` | `tanggal`, `halaman`/`ayat` dibaca | Siswa (guru: baca saja) | 09 |
| `ibadah_notes` | `isi`, `tanggal` | Siswa | 09 |
| `budgets` | `kategori`, `batas`, `bulan` | Siswa | 09 |
| `debts` | `nama`, `jumlah`, `jenis` (utang/piutang), `lunas` | Siswa | 09 |
| `biometrics` | `tanggal`, `detakJantung`, `spo2`, `tekananDarah`, `gulaDarah`, `langkah` | Siswa (guru: baca saja) | 09 |
| `foods` | `tanggal`, `nama`, `kalori`, `kategoriPiringku` | Siswa (guru: baca saja) | 09 |
| `menstrual` | `tanggal`, `siklus`, `catatan` | Siswa perempuan (guru: baca saja) | 09 |
| `wallets` | `nama`, `jenis` (tunai/bank/e-wallet), `saldo` | Siswa | 09 |
| `assets` | `nama`, `jenis` (emas/saham/reksadana), `nilai` | Siswa | 09 |
| `sedekah` | `tanggal`, `jumlah`, `catatan` | Siswa | 09 |
| `classes` | kelas yang **diampu** guru (data pribadi guru, bukan `school_classes` admin) | Guru | 10 |
| `students` | catatan pribadi guru tentang siswa (di luar roster global) | Guru | 10 |
| `attendance` | catatan absensi lama/pribadi guru — lihat juga `class_attendance` global | Guru | 10 |
| `grades` | `mapel`, `kkm`, nilai per siswa | Guru | 10 |
| `journals` | `tanggal`, `mapel`, `kelasId`, `isi`, foto terkompres | Guru | 10 |

Beberapa koleksi guru (`classes`, `students`, `attendance`) terlihat mirip nama dengan koleksi global sekolah di tabel berikutnya (`school_classes`, `class_attendance`) — jangan tertukar. Yang di atas adalah catatan **pribadi** guru itu sendiri; yang global dibaca-tulis lintas guru dan siswa.

### Data global sekolah — `/{coll}/{id}` (level atas)

| Koleksi | Bentuk field utama | Siapa menulis | Bab terkait |
|---|---|---|---|
| `school_classes` | `nama` (mis. `"7A"`) | Admin | 11 |
| `school_roster` | `nama`, `nis`, `classId` — data **acuan**, sebagian besar tak dipakai lagi karena roster aktif diambil dari `users` (lihat §6) | Admin | 11 |
| `class_tasks` | `classId`, `judul`, `mapel`, `tenggat`, `prioritas`, `guruId`, `attachments[]` | Guru | 10 |
| `class_schedule/{classId}` | `entries[]`, `waliNama` — **satu dokumen per kelas**, ID = `classId` | Hanya wali kelas | 10 |
| `class_attendance` | ID = `{classId}_{tanggal}_{guruId}_{mapelSlug}_{pertemuan}`; `entries: {studentId: status}` (timpa penuh via `gSet`) | Guru (atas namanya sendiri); admin | 05 §9, 10 |
| `class_submissions` | ID = `{taskId}_{studentId}`; `studentId`, `files[]` (metadata; file sesungguhnya di Supabase) | Siswa (atas namanya sendiri) | 10 |

Model ini dan alasan pemisahan pribadi/global dijelaskan penuh di [Bab 05 §3](05-lapisan-data-db-js.md#3-bentuk-api-publik--dua-kelompok-besar-data).

---

## 4. Ringkasan Security Rules per koleksi

Ingat prinsip dasarnya: kode di peramban (JavaScript) hanya mengatur apa yang **ditampilkan**; `firestore.rules` yang berjalan di server Firebase mengatur apa yang **benar-benar diizinkan**. Kalau UI dan Rules berbeda pendapat, Rules yang menang — itulah kenapa bab ini menyebutnya "penjaga yang sebenarnya". Tabel di bawah ringkasan cepat; penjelasan lengkap tiap baris (kenapa, bukan cuma apa) ada di [Bab 12 — Aturan Keamanan](12-aturan-keamanan.md).

| Koleksi | Baca | Tulis |
|---|---|---|
| `users/{uid}` (profil) | Pemilik; admin (semua); guru (hanya dokumen ber-`role:'siswa'`) | Buat/ubah: pemilik atau admin. Hapus: pemilik/admin, **tapi tidak pernah** bila `role == 'admin'` |
| `users/{uid}/{document=**}` (sub-koleksi umum) | Pemilik; admin | Pemilik; admin |
| `users/{uid}/ibadah_daily`, `quran_log`, `hafalan` | + guru (baca saja) | seperti di atas |
| `users/{uid}/health_daily`, `workouts`, `biometrics`, `weights`, `meds`, `foods`, `menstrual` | + guru (baca saja) | seperti di atas |
| `school_classes` | Siapa pun yang login | Hanya admin |
| `school_roster` | Siapa pun yang login | Hanya admin |
| `class_tasks` | Siapa pun yang login | Guru (rules **tidak** membatasi per kelas — lihat §6) |
| `class_schedule/{classId}` | Siapa pun yang login | Hanya guru yang `waliKelasId`-nya sama dengan `classId` |
| `class_attendance` | Guru; admin (**siswa tidak bisa**) | Buat/ubah: admin, atau guru dengan `guruId == uid`-nya sendiri. Hapus: sama |
| `class_submissions` | Guru (semua); siswa (hanya `studentId == uid`-nya sendiri) | Buat/ubah: pengirim (`studentId == uid`). Hapus: guru atau pengirim |

---

## 5. Glosarium istilah

Diurutkan alfabetis. Kalau sebuah kata terasa asing di tengah bab manapun, kemungkinan besar jawabannya ada di sini.

| Istilah | Definisi singkat |
|---|---|
| **adapter** | Pola desain: dua "petugas" berbeda isi tapi sama daftar layanan (mis. `LocalAdapter` vs `FirebaseAdapter`), sehingga bisa ditukar tanpa mengubah kode pemanggil. |
| **array** | Daftar berurutan, seperti daftar hadir — di JavaScript ditulis `[a, b, c]`. |
| **async/await** | Cara menulis kode yang menunggu sesuatu selesai (mis. jawaban server) tanpa membekukan seluruh halaman. |
| **cache** | Fotokopi data di "meja" (memori/disk) supaya tak perlu bolak-balik ke server tiap dibutuhkan. |
| **CDN** | *Content Delivery Network* — server pihak ketiga tempat memuat library (mis. Firebase SDK, Ionicons) lewat `<script src="https://...">`, tanpa perlu mengunduh/menginstal sendiri. |
| **CRUD** | *Create, Read, Update, Delete* — empat operasi dasar data: buat, baca, ubah, hapus. |
| **CSS variable** | Nilai bernama yang bisa dipakai ulang di CSS (mis. `--brand`), memudahkan ganti tema terang/gelap. |
| **debounce** | Menunda eksekusi sampai jeda tenang (mis. berhenti mengetik) supaya tidak memicu aksi berat tiap ketukan tombol. |
| **deploy** | Mengunggah/menerbitkan aplikasi (dan aturannya) agar hidup di internet. |
| **DOM** | *Document Object Model* — representasi halaman HTML sebagai objek yang bisa dibaca/diubah lewat JavaScript. |
| **esc/escape** | Mengubah karakter HTML berbahaya (`<`, `>`, dll.) jadi teks aman sebelum ditampilkan, mencegah XSS. |
| **Firestore** | Basis data NoSQL milik Firebase — "lemari arsip" tempat Tumara menyimpan data. |
| **hash routing** | Navigasi SPA lewat bagian `#...` di URL (mis. `app.html#tasks`), tanpa memuat ulang halaman dari server. |
| **innerHTML** | Properti DOM untuk mengganti isi HTML sebuah elemen — berbahaya bila diisi teks pengguna mentah tanpa `esc()`. |
| **koleksi** | "Laci" di Firestore: kumpulan dokumen sejenis (mis. koleksi `tasks`). |
| **localStorage** | Penyimpanan kecil di browser pengguna sendiri, bertahan lintas sesi tapi tidak tersinkron ke perangkat lain. |
| **manifest** | File `manifest.json` yang memberi tahu browser nama, ikon, dan warna aplikasi saat dipasang sebagai PWA. |
| **merge** | Opsi `{merge:true}` saat menulis ke Firestore: gabungkan field baru ke dokumen lama, jangan menimpa seluruhnya (lawan dari timpa penuh). |
| **modal** | Kotak dialog yang muncul di atas halaman, memblokir interaksi dengan latar sampai ditutup. |
| **NoSQL** | Basis data tanpa tabel/baris kaku seperti SQL — Firestore menyimpan dokumen berbentuk objek bebas-skema. |
| **object** | Kumpulan pasangan kunci-nilai, seperti map/berkas berisi field bernama. |
| **PWA** | *Progressive Web App* — aplikasi web yang bisa dipasang di HP dan jalan (sebagian) saat offline. |
| **query** | Permintaan data dengan syarat tertentu (mis. `where('role','==','siswa')`). |
| **rules** | Aturan keamanan Firestore (`firestore.rules`) yang menentukan siapa boleh baca/tulis apa, dijalankan di server. |
| **service worker** | Skrip latar yang mencegat permintaan jaringan, memungkinkan cache & mode offline PWA. |
| **singleton** | Pola "hanya ada satu instans" — `DB`, `App`, `I18N` masing-masing satu objek global tunggal. |
| **SPA** | *Single Page Application* — satu file HTML yang kontennya diganti-ganti oleh JavaScript, bukan berpindah halaman. |
| **subkoleksi** | Koleksi yang bersarang di dalam satu dokumen (mis. `users/{uid}/tasks`), bukan berdiri sendiri di level atas. |
| **template literal** | String JavaScript berpembungkus backtick (`` ` ``) yang bisa menyisipkan variabel: `` `Halo ${nama}` ``. |
| **thunk** | Fungsi kecil yang "membungkus" pemanggilan lain agar bisa dieksekusi belakangan (pola yang muncul di objek publik `DB`, mis. `list: c => adapter.list(c)`). |
| **toast** | Notifikasi kecil yang muncul sebentar lalu hilang sendiri. |
| **view** | Satu "layar" aplikasi (mis. Beranda, Tugas) yang mengikuti kontrak `render(el)` yang sama. |
| **write-through** | Strategi cache: setelah menulis ke server, langsung tempel juga hasilnya ke cache — tanpa membaca ulang dari server untuk menyegarkannya. |
| **XSS** | *Cross-Site Scripting* — celah keamanan saat teks pengguna disisipkan mentah ke HTML dan dieksekusi sebagai kode. |

---

## 6. Batasan & catatan jujur

Modul ini tidak menyembunyikan kompromi. Tumara dibangun untuk **satu sekolah**, dengan anggaran nol dan tanpa tim keamanan khusus — beberapa keputusan yang wajar di skala itu akan terasa longgar di skala lebih besar. Berikut kumpulan seluruh kotak "⚠️ Jujur soal ini" yang tersebar di modul, dikumpulkan di satu tempat supaya Anda bisa meninjaunya sekaligus sebelum memutuskan aplikasi Anda siap dipakai sungguhan atau belum.

> ⚠️ **`ADMIN_EMAILS` dipercaya dari sisi klien.** Ia hanya array JavaScript biasa di `js/firebase-config.js`, terbaca siapa pun lewat DevTools. Yang menahan penyalahgunaan adalah Security Rules di server, bukan file ini sendiri. *Kalau mau produksi lebih ketat, langkah lanjutannya adalah memakai Cloud Functions dengan custom claims — peran ditetapkan oleh kode server, bukan dibaca dari file klien.*

> ⚠️ **`class_tasks` penulisannya tak dibatasi per kelas di Rules.** Rules hanya mengecek "apakah pemanggilnya guru", bukan "apakah guru ini benar mengampu kelas tersebut" — pembatasan itu hanya terjadi di UI. *Kalau mau produksi lebih ketat, langkah lanjutannya adalah menambahkan pengecekan `request.resource.data.classId` terhadap daftar kelas yang diampu guru tersebut di Rules.*

> ⚠️ **Akun yang dihapus hanya dokumen profilnya di Firestore; akun Auth-nya tetap ada.** Menghapus akun Auth sungguhan butuh Admin SDK/Cloud Functions, yang di luar cakupan klien murni. *Kalau mau produksi lebih ketat, langkah lanjutannya adalah menambahkan Cloud Function yang dipicu penghapusan dokumen profil untuk ikut menghapus akun Auth-nya.*

> ⚠️ **Dua orang dengan nama identik tidak bisa punya dua akun sekaligus** — `usernameOf()` deterministik, jadi nama yang sama menghasilkan email internal yang sama. *Kalau mau produksi lebih ketat, langkah lanjutannya adalah meminta admin membubuhkan pembeda (inisial/angka) saat membuat akun kedua dengan nama serupa.*

> ⚠️ **`school_roster` sebagian besar tak terpakai lagi** — roster aktif kelas diambil dari `users` yang sudah `role:'siswa'` dan memilih `kelasId` saat onboarding, bukan dari data acuan admin ini. *Kalau mau produksi lebih ketat, langkah lanjutannya adalah memakai `school_roster` untuk validasi silang: tolak onboarding siswa dengan NIS yang tak cocok data acuan.*

> ⚠️ **NIS pendek di-`padStart` jadi kata sandi** — NIS `"1234"` (4 digit) diubah jadi `"001234"` agar memenuhi minimum 6 karakter Firebase Auth. Ini kompromi kenyamanan, bukan sandi yang kuat. *Kalau mau produksi lebih ketat, langkah lanjutannya adalah mewajibkan siswa mengganti kata sandi awal setelah login pertama.*

> ⚠️ **Siswa tidak bisa membaca rekaman absensinya sendiri lewat query langsung** — Rules `class_attendance` hanya mengizinkan guru/admin membaca, karena dokumennya mencampur banyak siswa dalam satu `entries` per pertemuan (bukan satu dokumen per siswa). *Kalau mau produksi lebih ketat, langkah lanjutannya adalah membuat ringkasan absensi per-siswa di sub-koleksi terpisah yang bisa dibaca pemiliknya sendiri.*

> ⚠️ **`apiKey` Firebase memang publik** — ia identitas proyek, bukan rahasia; keamanan sesungguhnya ada di Security Rules, bukan di menyembunyikan `apiKey`. Tidak ada langkah lanjutan yang diperlukan di sini — ini memang cara Firebase dirancang bekerja.

---

## 7. Peta bab lengkap

Sama seperti di [README modul](README.md), dikutip di sini agar Anda tak perlu berpindah halaman untuk melompat ke bab tertentu. Lima "bagian" mengikuti urutan sebuah aplikasi sekolah biasanya dibangun: dulukan tampilan yang bisa dilihat, baru sambungkan ke data sungguhan, baru bangun fitur siswa, baru fitur sekolah (guru/admin), baru dirilis.

### Bagian 1 — Fondasi

| Bab | Judul | Hasil |
|---|---|---|
| 01 | [Pengenalan & Persiapan](01-pengenalan-dan-persiapan.md) | Alat terpasang, folder proyek siap, halaman pertama tampil di browser |
| 02 | [Fondasi Web & Struktur Proyek](02-fondasi-web-dan-struktur-proyek.md) | Paham HTML/CSS/JS secukupnya + rencana arsitektur Tumara |
| 03 | [Halaman Depan & Sistem Desain](03-halaman-depan-dan-desain.md) | `index.html` + `css/style.css`: tema terang/gelap, kartu, tombol |

### Bagian 2 — Data & Identitas

| Bab | Judul | Hasil |
|---|---|---|
| 04 | [Menyiapkan Firebase](04-menyiapkan-firebase.md) | Proyek Firebase aktif: Authentication + Cloud Firestore |
| 05 | [Lapisan Data `db.js`](05-lapisan-data-db-js.md) | Satu pintu data untuk seluruh aplikasi + mode offline |
| 06 | [Masuk, Daftar & Peran](06-masuk-daftar-dan-peran.md) | Siswa masuk pakai nama + NIS; tiap peran diarahkan ke halamannya |

### Bagian 3 — Aplikasi Siswa

| Bab | Judul | Hasil |
|---|---|---|
| 07 | [Kerangka Aplikasi Siswa](07-kerangka-aplikasi-siswa.md) | `app.html`: sidebar, bottom-nav, router, tema |
| 08 | [Membuat View Pertama](08-membuat-view-pertama.md) | Beranda siswa + "kontrak view" yang dipakai seluruh aplikasi |
| 09 | [Fitur-Fitur Siswa](09-fitur-fitur-siswa.md) | Tugas, kesehatan, keuangan, ibadah — satu pola CRUD berulang |

### Bagian 4 — Sekolah

| Bab | Judul | Hasil |
|---|---|---|
| 10 | [Portal Guru](10-portal-guru.md) | Kelas, absensi per-mapel, penilaian ber-KKM, jurnal, tugas kelas |
| 11 | [Panel Admin](11-panel-admin.md) | Buat akun guru/siswa, daftar kelas, impor massal dari Excel |
| 12 | [Aturan Keamanan](12-aturan-keamanan.md) | `firestore.rules`: siapa boleh baca/tulis apa — penjaga yang sebenarnya |

### Bagian 5 — Rilis

| Bab | Judul | Hasil |
|---|---|---|
| 13 | [Menjadikan PWA](13-menjadikan-pwa.md) | Bisa dipasang di HP, jalan saat offline, auto-perbarui versi |
| 14 | [Deploy & Pemeliharaan](14-deploy-dan-pemeliharaan.md) | Aplikasi hidup di internet + kebiasaan merawatnya |

---

## 8. Pencarian cepat: "saya mau…"

Bagian ini bukan kamus fungsi lagi, tapi kamus **tugas** — cocok saat Anda tahu apa yang ingin dilakukan tapi lupa nama fungsinya.

| Saya mau… | Pakai |
|---|---|
| Menampilkan tanggal hari ini dalam Bahasa Indonesia | `fmtDate(todayStr())` |
| Menyimpan catatan kesehatan tanpa membuat dua record di tanggal sama | `DB.saveDaily(tanggal, patch)` |
| Menyimpan absensi tanpa menghidupkan lagi siswa yang sudah dihapus | `DB.gSet('class_attendance', id, data)` — bukan `gUpdate` |
| Menambah field baru ke dokumen tanpa menghapus field lama | `DB.update(coll, id, patch)` atau `DB.gUpdate(coll, id, patch)` (keduanya merge) |
| Menampilkan teks pengguna ke HTML dengan aman | `esc(teks)` sebelum ditempel ke `innerHTML` |
| Membuat ID unik untuk record baru | `uid()` |
| Menampilkan notifikasi kecil setelah simpan berhasil | `toast('Tersimpan!')` |
| Menampilkan modal konfirmasi sebelum aksi berbahaya | `await confirmDialog('Yakin hapus?', {danger:true})` |
| Menghitung sisa hari sebelum tenggat tugas | `daysUntil(iso)` atau langsung `deadlineBadge(iso)` untuk badge siap pakai |
| Menyembunyikan/menampilkan saldo di layar | `Saldo.toggle()`, baca statusnya lewat `Saldo.tersembunyi` |
| Mengecek apakah aplikasi sedang memakai Firebase atau localStorage | `DB.isFirebase` |
| Mengunduh data sebagai file Excel-friendly | `downloadCSV(rows, 'nama.csv')` |
| Mengecilkan foto sebelum disimpan ke Firestore | `await compressImage(file, {maxDim:800})` |
| Mencetak halaman ke PDF lewat dialog cetak browser | `printHTML(judul, html)` |
| Mengurutkan tugas berdasarkan prioritas | `.sort((a,b) => prioUrut(a.prioritas) - prioUrut(b.prioritas))` |
| Membaca lampiran tugas guru tanpa peduli data lama/baru | `taskAttachments(tugas)` |
| Membuat elemen bisa disusun ulang dengan geser jari/mouse | `makeSortable(container, {itemSelector, key, onEnd})` |
| Mengecek siapa yang sedang login & perannya | `DB.user`, `DB.role` |
| Mencegah halaman dibuka pengguna dengan peran yang salah | `await guardPage(['admin'])` di awal skrip halaman |
| Mengubah nama lengkap siswa jadi email internal Firebase Auth | `toAuthEmail(nama)` |
| Membaca data siswa tertentu dari sisi guru | `DB.listStudentData(studentUid, coll)` |
| Query koleksi global dengan satu syarat kesamaan | `DB.gListWhere(coll, field, value)` |
| Menimpa cache global setelah menulis koleksi bersama | Otomatis — `gAdd/gUpdate/gSet/gRemove` sudah memanggil `_gInvalidate` sendiri |

---

## 9. Ke mana setelah ini

Modul ini berhenti di titik aplikasi Anda hidup dan terawat. Untuk melangkah lebih jauh, tiga dokumen di repositori yang sama bisa jadi teman lanjutan:

- [`../../README.md`](../../README.md) — ringkasan fitur Tumara versi jadi, berguna sebagai daftar cek "apa lagi yang bisa ditambahkan" bila Anda ingin membandingkan aplikasi latihan Anda dengan yang sudah lengkap.
- [`../../Rancangan-Web-App-Tumara.md`](../../Rancangan-Web-App-Tumara.md) — rancangan awal proyek ini sebelum ditulis jadi kode; bacaan bagus untuk melihat bagaimana ide besar dipecah jadi rencana kerja.
- [`../tutorial-supabase.md`](../tutorial-supabase.md) — penyimpanan foto (jurnal guru, pengumpulan tugas siswa) lewat Supabase Storage. Modul ini menyinggungnya sekilas di Bab 10, tapi tutorial itu membahasnya tuntas.

Tumara hanyalah **satu contoh kasus**. Pola-pola yang Anda pelajari di sini — satu pintu data (`DB`), kontrak `view.render(el)`, pola adapter, cache hemat kuota, Security Rules sebagai penjaga yang sebenarnya — berlaku jauh di luar aplikasi sekolah. Aplikasi presensi ekstrakurikuler, katalog perpustakaan, sistem antrean BK, bahkan proyek pribadi yang tak ada hubungannya dengan sekolah — semua bisa dibangun dengan kerangka berpikir yang sama.

Anda sudah membangun ini dari nol dan paham setiap bagiannya. Langkah berikutnya, terserah Anda: teruskan Tumara dengan fitur baru, atau pakai polanya untuk sesuatu yang sama sekali lain. Selamat mengembangkan.

---

**Ini bab terakhir modul.** Kembali ke [README — Peta Modul](README.md) kapan pun Anda butuh mengulang dari awal.
