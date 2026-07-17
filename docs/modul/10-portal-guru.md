# Bab 10 — Portal Guru

> **Tujuan bab ini:** Anda bisa membangun `guru.html` + `js/views/teacher.js` — dasbor guru dengan pemilihan kelas yang diampu, absensi per-mata-pelajaran, penilaian ber-KKM, jurnal mengajar, tugas kelas, dan (khusus wali kelas) jadwal kelas.

| | |
|---|---|
| **Perkiraan waktu** | ~140 menit (bab terpanjang di modul ini — cakupannya luas, boleh dicicil beberapa sesi) |
| **Sebelum ini** | [Bab 09 — Fitur-Fitur Siswa](09-fitur-fitur-siswa.md) |
| **Anda butuh** | Pola CRUD & "fetch → derive → render → bind → mutasi via `DB`" dari Bab 09, `guardPage`/peran dari Bab 06, `DB.gList*`/`gAdd`/`gUpdate`/`gSet` dari Bab 05 |

## Apa yang kita bangun di bab ini

Guru punya halaman sendiri — `guru.html` — terpisah total dari `app.html` milik siswa. Di dalamnya satu objek besar, `Teacher`, melayani **sebelas** tab nav sekaligus: Beranda, Kelas & Siswa, Absensi, Penilaian, Jurnal Mengajar, Jadwal Mengajar, Tugas Kelas, Jadwal Kelas, Rekap Absensi Kelas, Ibadah Siswa, Kesehatan Siswa. Anda sudah melihat pola "satu objek, banyak rute" di `Prod` (Bab 09) — `Teacher` memakai pola yang sama, tapi jauh lebih besar, dan menambah satu lapis baru: hampir semua tabnya dikunci di belakang layar **"pilih kelas dulu"**.

`js/views/teacher.js` yang sebenarnya di repo panjangnya **3505 baris**. Bab ini **tidak** mengajak Anda mengetik ulang semuanya — tujuannya Anda menguasai **strukturnya**: bagaimana `TABS` didaftar, bagaimana gerbang kelas berulang di setiap tab, bagaimana ID dokumen absensi dirancang supaya beberapa guru tidak saling menimpa, dan kenapa penilaian punya KKM dan debounce. Bagian yang sangat panjang (HTML tabel absensi penuh, modal setup, dsb.) akan ditampilkan sebagai **potongan kunci** saja, ditandai jelas kapan itu versi ringkas.

Gambaran alur satu guru membuka portalnya:

```
guardPage(['guru']) lolos
        │
        ▼
guruSetup belum true? ──ya──▶ _setupModal() dipaksa terbuka
        │                       (nama, mapelAmpu[], status wali)
       tidak
        ▼
  Teacher.render(el) — baca Teacher.tab dari localStorage
        │
        ▼
  tab butuh kelas? (absensi/nilai/jurnal/tugaskelas/ibadah/kesehatan)
        │
       ya ──▶ classId kosong/tak valid? ──ya──▶ _classGate() — pilih kelas
        │                                             │
       tidak                                         (klik kartu kelas)
        ▼                                              ▼
  render konten tab dengan kelas terpilih ◀─────────────┘
```

## 1. Peran guru berbeda dari siswa

Ingat dari Bab 02 dan Bab 06: Tumara memisahkan tiga peran ke tiga halaman berbeda, bukan satu halaman dengan tampilan yang berubah-ubah. `guru.html` adalah halaman **terpisah**, dan baris pertama skrip bootstrap-nya memanggil penjaga yang sudah Anda kenal:

```js
// guru.html
document.addEventListener('DOMContentLoaded', async () => {
  const u = await guardPage(['guru']);
  if (!u) return;
  // ...
});
```

`guardPage(['guru'])` (Bab 06) memastikan hanya pengguna berperan `'guru'` yang bisa melihat isi halaman ini — siswa yang mengetik `guru.html` langsung di address bar akan dipantulkan balik ke `app.html` sebelum sempat melihat apa pun.

Yang membuat portal guru terasa lebih rumit dari portal siswa adalah satu fakta sekolah yang sangat biasa, tapi berdampak besar ke kode: **seorang guru bisa mengampu lebih dari satu kelas, dan mengajar lebih dari satu mata pelajaran**. Seorang guru Informatika mungkin juga mengajar BP (Bimbingan Konseling) di kelas lain, atau mengajar Matematika di dua kelas paralel. Karena itu, hampir setiap fitur guru — absensi, nilai, jurnal — dikunci **dua kali**: dulu pilih kelasnya, baru pilih mapelnya. Ingat kunci ganda ini; ia muncul lagi dan lagi di seluruh bab ini.

## 2. Setup awal guru

Saat seorang guru login untuk **pertama kali**, profilnya belum lengkap — field `guruSetup` di dokumen `users/{uid}` masih kosong. `guru.html` mendeteksi ini di baris terakhir skrip bootstrap-nya dan memaksa modal setup terbuka:

```js
// guru.html
// Form "Data Guru" otomatis saat guru pertama login (belum setup).
if (!DB.user.guruSetup) {
  Teacher._setupModal(() => { refreshGuruNav(); updateView(); });
}
```

Modal ini (`Teacher._setupModal`, `js/views/teacher.js` baris 2564–2672) meminta tiga hal:

1. **Nama guru** — ditampilkan di sidebar dan dokumen cetak (jurnal, absensi, dsb.).
2. **Mata pelajaran yang diampu** — bukan satu kotak teks, tapi daftar "chip" yang bisa ditambah satu per satu. Guru mengetik nama mapel, tekan "Tambah", muncul sebagai chip yang bisa dihapus lagi sebelum disimpan.
3. **Status wali kelas** — sebuah checkbox "Saya wali kelas". Kalau dicentang, muncul `<select>` untuk memilih kelas mana yang diwalikan.

Baris penyimpanannya menyingkap satu keputusan desain penting:

```js
// js/views/teacher.js — _setupModal, saat tombol Simpan ditekan (baris ~2657-2664)
await DB.updateUser({ nama, mapelAmpu, mapel: mapelAmpu[0] || '', waliKelasId, guruSetup: true });
// Bila jadi wali, catat namanya di dokumen jadwal (merge — entri lama tetap).
if (waliKelasId) {
  try { await DB.gUpdate('class_schedule', waliKelasId, { classId: waliKelasId, waliNama: nama, updatedAt: new Date().toISOString() }); } catch (_) {}
}
```

Perhatikan `mapel: mapelAmpu[0] || ''` ditulis **berdampingan** dengan `mapelAmpu` (array). Kenapa dua field untuk data yang mirip? Komentar asli di baris 285–287 menjelaskannya gamblang:

```js
// js/views/teacher.js (baris 285-287)
// Daftarnya di users/{uid}.mapelAmpu (array). Field lama `mapel` (satu teks)
// tetap diisi dengan mapel pertama, supaya halaman admin & app siswa yang
// membacanya tidak ikut rusak.
```

Ini contoh nyata pola **"normalisasi saat baca, bukan migrasi data"** yang sudah Anda temui di Bab 05 dan Bab 09 (ingat `prioKey(p)` yang menjaga tugas lama tanpa field `prioritas`). `mapelAmpu[]` adalah fitur yang lahir belakangan — sebelumnya guru hanya punya satu mapel, disimpan di field `mapel`. Alih-alih menulis skrip migrasi yang mengunjungi setiap akun guru di database dan mengubah `mapel` menjadi `mapelAmpu`, penulis Tumara memilih **memelihara keduanya berdampingan**: kode baru menulis `mapelAmpu[]` (dan menaruh mapel pertama juga di `mapel` supaya kode lama tetap jalan), sementara kode yang membaca cukup tahu aturan jatuhnya:

```js
// js/views/teacher.js (baris 295-299)
_mapelList() {
  const u = DB.user || {};
  if (Array.isArray(u.mapelAmpu) && u.mapelAmpu.length) return u.mapelAmpu.filter(Boolean);
  return u.mapel ? [u.mapel] : [];
},
```

Ada `mapelAmpu[]` yang terisi? Pakai itu. Tidak ada (akun lama, dibuat sebelum fitur ini ada)? Jatuh ke `mapel` tunggal, dibungkus jadi array satu elemen. Guru lama yang belum pernah membuka modal setup lagi tetap bisa bekerja normal — datanya tidak pernah "rusak" atau perlu diperbaiki manual.

## 3. Kelas yang diampu (`kelasAmpu[]`)

Sebelum bisa mengabsen atau menilai, guru harus tahu kelas mana yang jadi tanggung jawabnya. Ada dua sumber yang sengaja **dipisahkan**:

**Sumber 1 — `kelasAmpu[]` di profil guru.** Ini daftar ID kelas yang dipilih guru sendiri (lewat tab "Kelas & Siswa", dijelaskan sebentar lagi), dan nanti di Bab 11 Anda akan melihat admin juga bisa menautkan guru ke kelas dari panel admin. `Teacher._classes()` membaca daftar ini untuk menyaring `school_classes` (koleksi kelas induk yang dibuat admin — juga Bab 11):

```js
// js/views/teacher.js (baris 130-136)
// Kelas kini data induk sekolah (school_classes) yang dikelola admin.
// Guru hanya melihat kelas yang ia pilih untuk diampu (DB.user.kelasAmpu).
_byOrder(a, b) { return (a.urutan ?? 999999) - (b.urutan ?? 999999) || (a.nama || '').localeCompare(b.nama || ''); },
async _classes() {
  const ampu = new Set(DB.user?.kelasAmpu || []);
  return (await DB.gList('school_classes')).filter(c => ampu.has(c.id)).sort(this._byOrder);
},
```

`DB.gList('school_classes')` mengambil **semua** kelas sekolah (koleksi global — ingat awalan `g` dari Bab 05), lalu difilter: hanya kelas yang ID-nya ada di `kelasAmpu` milik guru ini yang lolos. Guru tidak pernah melihat kelas yang bukan tanggung jawabnya.

**Sumber 2 — roster siswa per kelas, dari `_students(classId)`:**

```js
// js/views/teacher.js (baris 137-142)
// Roster = akun siswa yang SUDAH login & memilih kelas ini saat
// onboarding (field kelasId di profil). Data admin (school_roster) hanya acuan.
async _students(classId) {
  return (await DB.listStudentsByClass(classId))
    .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
},
```

`DB.listStudentsByClass` (`js/db.js` baris 456–461) menjalankan query:

```js
// js/db.js (baris 453-461)
// Siswa yang sudah login & memilih kelas ini (kelasId) saat onboarding.
// Butuh composite index Firestore (role asc, kelasId asc) — Firebase akan
// menautkan pembuatannya otomatis saat query pertama dijalankan.
async listStudentsByClass(classId) {
  const { F, db } = this.fb;
  const qy = F.query(F.collection(db, 'users'), F.where('role', '==', 'siswa'), F.where('kelasId', '==', classId));
  const snap = await F.getDocs(qy);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
},
```

Ini query **komposit**: dua syarat `where` sekaligus (`role == 'siswa'` DAN `kelasId == classId`). Firestore mewajibkan **index** untuk query seperti ini — tanpanya, query akan gagal dengan error yang (untungnya) menyertakan tautan langsung untuk membuat index-nya. Tumara sudah mendeklarasikannya lebih dulu di `firestore.indexes.json`, supaya index ini tersedia sejak `firebase deploy` pertama, bukan menunggu error muncul di produksi:

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "role", "order": "ASCENDING" },
        { "fieldPath": "kelasId", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Sekarang bagian yang paling penting untuk dipahami: **`_students()` TIDAK membaca `school_roster`** (daftar siswa yang bisa dibuat admin sebagai cadangan/acuan, dibahas Bab 11). Ia membaca akun **sungguhan** — siapa pun yang berperan `'siswa'` dan `kelasId`-nya cocok. Ingat dari Bab 06: `kelasId` diisi siswa sendiri saat `OnboardView` (onboarding), bukan oleh admin.

Ini **sengaja**, bukan kebetulan atau keterbatasan. Komentar di baris 138 menegaskannya:

```js
// js/views/teacher.js (baris 138)
// onboarding (field kelasId di profil). Data admin (school_roster) hanya acuan.
```

Bayangkan alternatifnya: kalau roster guru dibaca dari `school_roster` yang diketik admin, setiap kali ada siswa pindah kelas, siswa baru masuk, atau siswa keluar, **admin harus ingat mengedit ulang** daftar itu — dan kalau lupa, guru akan mengabsen daftar yang sudah basi (nama siswa yang sudah pindah masih muncul, siswa baru tidak muncul sama sekali). Dengan membaca langsung dari akun siswa aktif, roster guru **selalu segar** — begitu siswa login dan memilih kelasnya sendiri, ia langsung muncul di daftar absen guru manapun yang mengampu kelas itu, tanpa satu pun tindakan tambahan dari admin. `school_roster` tetap berguna sebagai **acuan/cadangan** (mis. untuk mencocokkan NIS saat admin membuat akun di Bab 11), tapi tidak pernah jadi sumber kebenaran untuk siapa yang benar-benar duduk di kelas mana.

## 4. Struktur `js/views/teacher.js` — objek besar dengan banyak tab

Seperti `Prod` di Bab 09, `Teacher` adalah **satu** objek singleton yang melayani banyak rute. Daftar rutenya:

```js
// js/views/teacher.js (baris 8-19)
const Teacher = {
  TABS: ['beranda', 'kelas', 'absensi', 'nilai', 'jurnal', 'jadwal', 'tugaskelas', 'jadwalkelas', 'waliabsen', 'ibadah', 'kesehatan'],
  _TAB_KEY: 'tumara_guru_tab',
  _DETAIL_KEY: 'tumara_guru_tugas_detail',   // konteks halaman detail tugas (agar tahan refresh)
  // Tab aktif dipulihkan dari localStorage agar refresh tidak balik ke tab pertama.
  get tab() {
    const t = localStorage.getItem(this._TAB_KEY);
    return this.TABS.includes(t) ? t : 'beranda';
  },
  set tab(v) {
    if (this.TABS.includes(v)) localStorage.setItem(this._TAB_KEY, v);
  },
  // ...
```

Bandingkan dengan `Ibadah.tab` di Bab 09, yang cuma properti biasa (`tab: 'hari'`). Di sini, `tab` adalah **getter/setter** yang membaca dan menulis ke `localStorage`, bukan sekadar properti objek. Kenapa bedanya?

Properti objek biasa bertahan **selama sesi berjalan** — hilang begitu tab browser di-refresh (F5), karena seluruh JavaScript dimuat ulang dari awal dan `Teacher` dibuat lagi dari definisi aslinya (`tab` balik ke nilai awal). Untuk siswa yang berpindah antar-tab Ibadah dalam satu sesi, itu cukup. Tapi guru punya kebiasaan kerja yang berbeda: mereka **sering** membuka portal, mengisi absensi sebentar, menutup tab browser, lalu membukanya lagi jam pelajaran berikutnya — atau me-refresh halaman karena koneksi sekolah kurang stabil. Kalau tab aktif tersimpan hanya di properti objek, setiap kali itu terjadi guru akan dilempar balik ke "Beranda" dan harus mengklik ulang "Absensi" dari awal. Dengan `localStorage`, posisi tab **bertahan lintas sesi** — bukan cuma lintas render — sehingga guru yang tadi ada di tab Absensi, membuka lagi browsernya besok pagi, tetap mendarat di tab Absensi.

`_DETAIL_KEY` memakai trik yang sama untuk sesuatu yang lebih spesifik: kelas mana yang terakhir dipilih, dan (khusus tab Tugas Kelas) tugas mana yang sedang dibuka sebagai halaman detail. `_saveDetail()` dipanggil di akhir `render()` untuk menuliskan ketiganya sekaligus:

```js
// js/views/teacher.js (baris 20-24)
_saveDetail() {
  localStorage.setItem(this._DETAIL_KEY, JSON.stringify({ tab: this.tab, c: this.classId || '', t: this.detailTaskId || '' }));
},
```

### Dispatcher `render()`

Sama seperti `Prod.render` di Bab 09, `Teacher.render(el)` adalah satu titik masuk yang mencabang berdasarkan tab aktif:

```js
// js/views/teacher.js (baris 111-127, diringkas — bagian pemulihan state dari
// localStorage saat boot pertama/refresh dipotong, lihat baris 70-110 lengkapnya)
el.innerHTML = `<div id="tBody"><div class="portal-loading"><div class="spinner"></div></div></div>`;

const body = $('#tBody', el);
if (this.tab === 'beranda') await this.renderBeranda(body);
else if (this.tab === 'kelas') await this.renderKelas(body);
else if (this.tab === 'absensi') await this.renderAbsensi(body);
else if (this.tab === 'nilai') await this.renderNilai(body);
else if (this.tab === 'jurnal') await this.renderJurnal(body);
else if (this.tab === 'jadwal') await this.renderJadwal(body);
else if (this.tab === 'tugaskelas') await this.renderTugasKelas(body);
else if (this.tab === 'jadwalkelas') await this.renderJadwalKelas(body);
else if (this.tab === 'waliabsen') await this.renderWaliAbsen(body);
else if (this.tab === 'kesehatan') await this.renderKesehatan(body);
else await this.renderIbadah(body);
this._saveDetail();   // persist tab/kelas/detail agar tahan refresh
```

Sebelas cabang `if/else`, sebelas fungsi `render...`. Bentuknya sama persis dengan dispatcher `Prod` — bedanya cuma jumlah cabangnya jauh lebih banyak, karena portal guru memang punya lebih banyak "halaman" nav.

## 5. Pola "gerbang kelas" — diulang di hampir semua tab

Buka enam dari sebelas fungsi `render...` — Absensi, Penilaian, Jurnal, Tugas Kelas, Ibadah Siswa, Kesehatan Siswa — dan Anda akan menemukan **empat baris yang persis sama** di awal masing-masing:

```js
// pola berulang, mis. renderAbsensi (baris 793-800), sama persis di
// renderNilai, renderJurnal, renderTugasKelas, renderIbadah, renderKesehatan
const classes = await this._classes();
if (!classes.length) { el.innerHTML = this._needClass(); this._bindNeedClass(el); return; }
if (this.classId && !classes.find(c => c.id === this.classId)) this.classId = null;
if (!this.classId) {
  el.innerHTML = this._classGate(classes, tr('Absensi', 'Attendance'));
  this._bindClassGate(el); return;
}
```

Baca artinya baris demi baris:

1. **`const classes = await this._classes()`** — ambil kelas yang diampu guru ini (Bagian 3).
2. **Belum ada kelas diampu sama sekali?** → tampilkan `_needClass()`, kartu kosong yang mengarahkan guru ke tab "Kelas & Siswa" untuk memilih kelasnya dulu. Tanpa ini, guru baru yang belum pernah memilih kelas akan melihat layar kosong yang membingungkan.
3. **`classId` tersimpan tapi sudah tidak valid?** — mis. guru sebelumnya memilih kelas ini, lalu admin (atau guru sendiri lewat tab Kelas) mencabutnya dari `kelasAmpu`. `classes.find(...)` tidak menemukannya lagi → `this.classId` di-reset ke `null`. Ini mencegah halaman mencoba merender data untuk kelas yang sudah tidak lagi diampu.
4. **Belum ada kelas yang dipilih (baik karena baru saja di-reset, atau memang belum pernah memilih)?** → tampilkan `_classGate(classes, judul)`, layar kartu-kartu kelas untuk diklik. Guru harus memilih **satu** kelas dulu sebelum konten tab sungguhan digambar.

Ini contoh **bagus** dari pola "state di properti objek" yang Anda pelajari di Bab 09 (`taskFilter`, `detailTaskId`), sekarang dipakai untuk sesuatu yang lebih besar: sebuah **alur multi-langkah** di dalam satu view. `this.classId` bukan sekadar filter tampilan — ia menjadi "langkah" yang harus dilalui sebelum langkah berikutnya (isi absensi, isi nilai, dst.) bisa diakses. Begitu guru mengklik satu kartu kelas di `_classGate`, `this.classId` terisi, `render()` dipanggil ulang, dan kali ini keempat baris di atas lolos sampai ke bawah — konten tab yang sesungguhnya baru digambar setelah itu.

> **Kenapa polanya di-copy-paste, bukan ditarik jadi satu fungsi pembungkus?** Pertanyaan wajar. Repo Tumara memang tidak membungkusnya jadi satu `_withClassGate(renderFn)` generik — enam fungsi `render...` masing-masing menuliskan ulang empat baris yang sama. Ini bukan keputusan terbaik dari sisi "jangan mengulang kode" (**DRY** — *Don't Repeat Yourself*, prinsip umum pemrograman), tapi konsekuensinya kecil: empat baris itu pendek, jarang berubah, dan menuliskannya di tempat membuat tiap fungsi `render...` bisa dibaca dari atas ke bawah tanpa melompat ke fungsi lain. Kalau Anda mengembangkan Tumara sendiri dan menambah tab ber-gerbang-kelas ketujuh, wajar untuk mempertimbangkan menariknya jadi satu fungsi — tapi pahami dulu polanya di sini sebelum merapikannya.

## 6. Absensi — bagian paling rumit

Absensi adalah fitur guru yang paling banyak keputusan desainnya. Mari uraikan pelan-pelan.

### 6.1 ID dokumen yang menyandikan seluruh koordinat

Setelah guru memilih kelas dan memilih mapel (layar 1 dari `renderAbsensi` — daftar kartu mapel yang diampu di kelas itu), guru masuk ke layar 2: tabel siswa dengan tombol kode kehadiran. ID dokumen yang menampung absensi hari itu dibentuk begini:

```js
// js/views/teacher.js (baris 898-900)
const mapelSlug = slug(this.attMapel);
const attId = `${this.classId}_${this.attDate}_${DB.user.id}_${mapelSlug}_${this.attPertemuan}`;
const rec = attAll.find(a => a.id === attId) || { entries: {} };
```

Lima bagian digabung dengan garis bawah: **kelas, tanggal, ID guru, slug mapel, nomor pertemuan**. `slug(...)` (dari `js/utils.js`) mengubah nama mapel bebas — boleh ada spasi, huruf besar, tanda baca — menjadi teks aman untuk ID dokumen (huruf kecil, tanpa spasi).

Pertanyaan yang harus Anda tanyakan di sini: **kenapa `guruId` ikut masuk ke ID?** Jawabannya ada di komentar deklarasi `_mapelList` (baris 280–283):

```js
// js/views/teacher.js (baris 280-283)
// Satu guru bisa mengampu beberapa mapel (mis. Informatika + KIK + BP), dan
// mapel yang sama bisa diajar di kelas yang sama oleh guru berbeda. Karena itu
// absensi, nilai, dan jurnal disimpan TERPISAH per (kelas × mapel) — kalau
// tidak, nilai Matematika dan Fisika bercampur di satu tabel.
```

Bayangkan kelas X-A punya jam Matematika (Bu Sari) dan jam Bahasa Inggris (Pak Budi) di hari yang sama. Kalau ID dokumen absensi hanya `${classId}_${tanggal}_${pertemuan}` — tanpa `guruId` dan `mapelSlug` — maka absensi Bu Sari dan absensi Pak Budi di hari yang sama akan **menimpa satu sama lain** di dokumen yang persis sama, karena Firestore mengidentifikasi dokumen semata-mata dari ID-nya. Guru terakhir yang menekan "Simpan" akan menghapus rekaman guru sebelumnya tanpa siapa pun sadar. Dengan `guruId` dan `mapelSlug` ikut membentuk ID, setiap kombinasi kelas-hari-guru-mapel-pertemuan punya dokumennya sendiri — banyak guru bisa mencatat absensi di kelas dan hari yang sama tanpa pernah bertabrakan.

### 6.2 Draft lokal — klik tombol TIDAK langsung menulis ke DB

Tabel absensi menampilkan lima tombol kode per siswa (H/S/I/A/D). Mengklik salah satunya **tidak** langsung memanggil `DB.gSet(...)`:

```js
// js/views/teacher.js (baris 975-1001, diringkas)
// draft lokal absensi (biar tidak nulis DB tiap klik)
const draft = { ...entries };
// ...
$$('[data-sid]', el).forEach(b => b.onclick = () => {
  const sid = b.dataset.sid, st = b.dataset.st;
  draft[sid] = st;
  // perbarui tampilan baris
  $$(`[data-sid="${sid}"]`, el).forEach(x => x.className = `att-cell ${x.dataset.st === st ? 'att-' + st : 'att-empty'}`);
  updateSummary();
});
```

`draft` adalah objek biasa di memori — salinan kerja dari `entries` (data tersimpan yang sudah ada, atau kosong kalau ini absensi baru). Klik tombol hanya mengubah `draft[sid]` dan mewarnai ulang sel di layar. Baru saat guru menekan tombol "Simpan Absensi" barulah `draft` benar-benar ditulis:

```js
// js/views/teacher.js (baris 1010-1022, diringkas)
const save = $('#saveAtt', el);
if (save) save.onclick = async () => {
  // ...
  await DB.gSet('class_attendance', attId, {
    classId: this.classId, tanggal: this.attDate, pertemuan: this.attPertemuan,
    mapel: this.attMapel, mapelSlug,
    guruId: DB.user.id, guruNama: DB.user.nama || '',
    entries: draft, updatedAt: new Date().toISOString()
  });
  toast(tr('Absensi tersimpan ✅', 'Attendance saved ✅'));
  this.render(this._el);
};
```

Kenapa tidak menulis ke DB setiap kali tombol H/S/I/A/D diklik? Ingat kembali Bab 05: setiap operasi tulis ke Firestore memakai jatah **kuota** (Tumara berjalan di paket gratis Firebase). Satu kelas berisi 30-an siswa — kalau setiap klik langsung menulis ke server, mengisi absensi satu kelas penuh berarti puluhan panggilan tulis, hanya untuk data yang akhirnya sama saja dengan **satu** penulisan penuh di akhir. Draft lokal mengumpulkan semua perubahan di memori dulu (gratis, secepat kedipan mata), lalu menulis **satu kali** saat guru benar-benar selesai dan menekan Simpan. Ini bentuk lain dari filosofi hemat kuota yang sudah Anda kenal — di Bab 05 lewat cache baca, di sini lewat penundaan tulis.

### 6.3 `gSet` (timpa penuh), BUKAN `gUpdate`

Perhatikan baris penyimpanan di atas memakai `DB.gSet`, bukan `DB.gUpdate` yang biasanya jadi pilihan default untuk "mengubah data yang sudah ada" (ingat Bab 05 dan Bab 09: `gUpdate` men-*)*merge* — hanya field yang disebut yang berubah, sisanya dibiarkan). Di `js/db.js`, komentar tepat di atas definisi `gSet` menjelaskan kenapa absensi butuh perilaku yang berbeda:

```js
// js/db.js (baris 693-700)
// Timpa penuh (TANPA merge) — absensi harus mengganti `entries` utuh,
// sedangkan gUpdate memakai {merge:true} yang menggabung map bersarang.
async gSet(coll, id, data) {
  const { F } = this.fb;
  await F.setDoc(F.doc(this._gColRef(coll), id), this._clean(data));
  this._gInvalidate(coll);
  return { id, ...data };
},
```

Bayangkan skenario ini tanpa `gSet`: seorang siswa awalnya tercatat "Alfa" (A) di `entries`, lalu guru menekan tombol hapus siswa itu dari daftar absensi — atau lebih realistis, siswa itu pindah kelas sehingga tidak lagi muncul di `students`, dan `draft` yang baru **tidak lagi memuat** entry untuknya. Kalau penyimpanan memakai `gUpdate({ entries: draft })` dengan `{ merge: true }`, Firestore akan **menggabungkan** `draft` yang baru dengan `entries` lama di server — field-field di `entries` lama yang tidak disebut ulang di `draft` baru **tetap ada**. Siswa yang seharusnya sudah tidak lagi dicatat di absensi ini akan "hidup lagi" secara diam-diam, dengan status lamanya yang sudah tidak relevan.

`gSet` mencegah ini dengan menulis **seluruh dokumen dari nol** setiap kali disimpan — tidak ada riwayat lama yang ikut menempel secara tidak sengaja. `entries: draft` yang tersimpan **persis** sama dengan `draft` yang ada di layar saat tombol Simpan ditekan, tidak lebih, tidak kurang. Ini pengulangan dari konsep `gSet` vs `gUpdate` yang sudah disinggung di Bab 05 — sekarang Anda melihatnya dalam konteks nyata yang membuktikan kenapa bedanya penting, bukan sekadar detail teknis yang bisa diabaikan.

> ⚠️ **Kalau tertukar:** memakai `gUpdate` di sini adalah salah satu bug paling halus yang bisa terjadi di Tumara — ia **tidak** memunculkan error apa pun, absensi tetap "tersimpan", hanya saja data lama yang seharusnya sudah tidak relevan diam-diam ikut menumpuk. Baru terlihat aneh belakangan, saat rekap bulanan menampilkan siswa yang sudah pindah kelas.

### 6.4 Present-wins recap: `_LENIENT` dan `_dailyStatus()`

Satu siswa bisa punya **beberapa** catatan kehadiran dalam satu hari — satu per mapel yang diajar hari itu (Matematika jam pertama, IPA jam kedua, dst., masing-masing rekaman terpisah karena ID dokumennya menyertakan `mapelSlug`). Saat wali kelas ingin tahu "siapa yang **benar-benar** tidak masuk hari ini" (bukan per-mapel, tapi kesimpulan harian), Tumara butuh aturan untuk menggabungkan beberapa kode jadi satu status:

```js
// js/views/teacher.js (baris 43-52)
// Kesimpulan status HARIAN dari semua kode absensi mapel di satu hari.
// Kehadiran menang: hadir di ≥1 mapel → H (kasus siswa telat lalu masuk di
// mapel berikutnya). Bila tak pernah hadir, keterangan "paling ringan" yang
// dipakai (I > S > D > A) — jarang terjadi karena izin biasanya seharian.
_LENIENT: { I: 4, S: 3, D: 2, A: 1 },
_dailyStatus(codes) {
  if (!codes.length) return '';
  if (codes.includes('H')) return 'H';
  return codes.slice().sort((a, b) => (this._LENIENT[b] || 0) - (this._LENIENT[a] || 0))[0];
},
```

Logikanya dua lapis:

1. **Hadir menang mutlak.** Kalau di antara semua kode hari itu ada satu saja `'H'`, hasilnya `'H'` — titik, tak perlu melihat kode lain. Ini menangkap kasus siswa yang datang terlambat: absen mapel pertama mungkin tercatat "Alfa" (guru mengira ia tidak masuk sama sekali), tapi begitu ia muncul di mapel kedua dan tercatat "Hadir" di sana, rekap harian tetap menganggapnya **hadir** hari itu. Masuk akal secara sekolah: siswa itu memang datang ke sekolah hari itu.
2. **Tak pernah hadir? Ambil alasan paling "longgar".** Kalau tidak ada satu pun `'H'`, urutan `_LENIENT` menentukan kode mana yang menang: Izin (4) lebih diutamakan dari Sakit (3), Sakit dari Dispensasi (2), Dispensasi dari Alfa (1). Artinya kalau siswa tercatat "Izin" di satu mapel tapi "Alfa" di mapel lain hari yang sama, rekap harian menyimpulkan "Izin" — anggapan yang lebih baik untuk siswa (barangkali guru mapel kedua belum sempat tahu soal izinnya). Komentar aslinya jujur bilang ini "jarang terjadi", karena biasanya kalau seorang siswa izin, ia izin **seharian**, bukan cuma satu mapel — tapi aturan ini tetap disediakan untuk kasus-kasus yang tidak seragam.

`_dailyStatus` dipakai di beberapa tempat: rekap bulanan daftar hadir (`_printRekapPertemuan`), tab Rekap Absensi Kelas (`renderWaliAbsen`) milik wali, dan perhitungan jumlah hadir untuk jurnal mengajar.

## 7. Penilaian (Nilai)

Tab Penilaian membangun sebuah **gradebook**: kolom dinamis (guru menambah kolom sendiri, mis. "UH 1", "Tugas", "UTS") dengan nilai ambang **KKM** — *Kriteria Ketuntasan Minimal*, istilah yang sudah akrab di telinga setiap guru: nilai batas yang harus dilewati siswa supaya dianggap "tuntas" pada satu topik. Struktur datanya:

```js
// js/views/teacher.js (baris 1094-1106, diringkas)
const columns = gb.columns || [];   // [{ id, nama, kkm, avg }, ...]
const scores = gb.scores || {};     // { [studentId]: { [columnId]: nilai } }

const avgCols = columns.filter(c => c.avg !== false); // default semua dihitung
const avgOf = sid => {
  const vals = avgCols.map(c => scores[sid]?.[c.id]).filter(v => v !== undefined && v !== null && v !== '');
  if (!vals.length) return null;
  return Math.round(vals.reduce((s, v) => s + (+v || 0), 0) / vals.length * 10) / 10;
};
```

Dua hal penting di sini:

- **`columns` punya penanda `avg`** — sebuah checkbox di header tiap kolom memutuskan apakah kolom itu ikut dihitung ke rata-rata siswa. Guru bisa punya kolom "Kehadiran" atau "Catatan" yang tidak seharusnya ikut memengaruhi rata-rata nilai akademik — cukup jangan dicentang. `avgCols` menyaring hanya kolom yang `avg !== false` (default `true` kalau field-nya belum pernah diisi, sama seperti pola penjaga nilai lama yang Anda kenal dari Bab 09).
- **`avgOf(sid)` melewati nilai kosong.** `.filter(v => v !== undefined && v !== null && v !== '')` membuang siswa yang belum dinilai di kolom tertentu dari perhitungan rata-rata — kalau tidak, nilai kosong akan dihitung sebagai `0` dan menjatuhkan rata-rata siswa yang sebenarnya belum sempat dinilai di kolom itu.

### Debounce 400ms saat mengetik nilai

Mengetik nilai di kolom `<input type="number">` memicu event `oninput` di **setiap** ketukan tombol — mengetik "85" saja sudah tiga event (`8`, `8`5`, `85`). Kalau setiap event langsung menulis ke Firestore, satu nilai saja bisa memicu tiga (atau lebih) panggilan tulis, kebanyakan menyimpan angka yang belum selesai diketik (`8`, lalu `85` beberapa milidetik kemudian). Solusinya adalah **debounce** — sebuah teknik untuk menunda eksekusi sampai jeda tertentu berlalu **tanpa** ada kejadian baru:

```js
// js/views/teacher.js (baris 1173-1187, diringkas)
// input nilai → simpan (debounce) + update warna & rata2 langsung
let saveT;
const persist = () => { clearTimeout(saveT); saveT = setTimeout(simpanNilai, 400); };
$$('.cell-input', el).forEach(inp => inp.oninput = () => {
  const sid = inp.dataset.sid, col = inp.dataset.col;
  let val = inp.value === '' ? '' : clamp(+inp.value, 0, 100);
  // ...
  scores[sid] = scores[sid] || {};
  if (val === '') delete scores[sid][col]; else scores[sid][col] = val;
  // ...warnai merah kalau di bawah KKM, perbarui sel rata-rata di layar langsung...
  persist();
});
```

Baca `persist()` baik-baik: setiap kali dipanggil, ia **membatalkan** timer sebelumnya (`clearTimeout(saveT)`) lalu memasang timer baru 400 milidetik. Selama guru masih mengetik (jeda antar-ketukan kurang dari 400ms), timer terus dibatalkan dan dipasang ulang — `simpanNilai` **tidak pernah** benar-benar terpanggil. Baru begitu guru berhenti mengetik selama 400ms penuh (pindah ke sel lain, atau sekadar jeda berpikir), timer terakhir yang terpasang akhirnya matang dan `simpanNilai()` benar-benar berjalan — menulis **satu kali** ke Firestore untuk satu kali "jeda mengetik", bukan satu kali per ketukan tombol.

Sementara `persist()` menunggu jeda, **tampilan** (warna sel merah/normal, angka rata-rata) diperbarui **langsung**, tanpa menunggu apa pun — baris `inp.classList.toggle('grade-below', ...)` dan pembaruan `avgCell.textContent` berjalan seketika di setiap ketukan. Guru melihat umpan balik instan sambil mengetik, sementara penulisan sungguhan ke database tetap dijaga hemat kuota di belakang layar.

## 8. Jurnal & Tugas Kelas

Dua fitur ini singkat untuk dijelaskan karena keduanya memakai pola CRUD standar dari Bab 09 — bedanya cuma **di mana** data itu disimpan, dan itu bedanya penting.

**Jurnal Mengajar** (`renderJurnal`) adalah catatan pribadi guru: materi apa yang diajarkan, kegiatan apa yang dilakukan, tiap pertemuan. Datanya disimpan di koleksi **pribadi** `journals` (ingat Bab 05: `list`/`add`/`update`/`remove`, milik guru yang login, tersimpan di subkoleksi `users/{uid}/journals`). Guru lain, bahkan yang sama-sama mengajar di kelas yang sama, tidak bisa melihat jurnal guru ini — jurnal murni catatan pribadi tiap guru untuk keperluannya sendiri.

**Tugas Kelas** (`renderTugasKelas`) sebaliknya: ditulis ke koleksi **global** `class_tasks`, memakai `DB.gAdd`/`gUpdate`/`gRemove` (awalan `g`, Bab 05):

```js
// js/views/teacher.js (baris 2081-2083 & 2311-2312, diringkas)
const tasks = (await DB.gListWhere('class_tasks', 'classId', this.classId))
  .sort((a, b) => prioUrut(a.prioritas) - prioUrut(b.prioritas)
               || (a.tenggat || '9999-99-99').localeCompare(b.tenggat || '9999-99-99'));
// ...
if (task) await DB.gUpdate('class_tasks', task.id, data);
else await DB.gAdd('class_tasks', { classId: this.classId, guruId: DB.user.id, guruNama: DB.user.nama, dibuatPada: new Date().toISOString(), ...data });
```

Ini koleksi yang **sama persis** dengan `class_tasks` yang Anda baca dari sisi siswa di Bab 09, Bagian 3 — di sana Anda melihat siswa membacanya lewat `DB.gListWhere('class_tasks', 'classId', kelasId)` dan tidak pernah menulisnya. Sekarang Anda melihat sisi lainnya: guru yang **menulis**. Begitu guru menekan "Kirim Tugas", dokumen baru muncul di `class_tasks`, dan **seketika itu juga** (setelah `App.refresh()` di sisi siswa, atau saat siswa membuka halaman Tugas berikutnya) tugas itu terlihat oleh setiap siswa di kelas tersebut — inilah kenapa koleksi global penting: satu dokumen, dibaca banyak akun siswa berbeda, ditulis oleh guru pengampu kelas itu.

## 9. Jadwal Kelas — khusus wali kelas

Tab terakhir yang paling elegan strukturnya: **Jadwal Kelas**, hanya untuk guru yang berstatus **wali kelas** (`DB.user.waliKelasId` terisi, diatur lewat modal setup di Bagian 2).

### ID dokumen = classId itu sendiri

Berbeda dari `class_attendance` yang ID-nya panjang dan menyandikan lima koordinat (Bagian 6.1), `class_schedule` memakai ID paling sederhana yang bisa dibayangkan:

```js
// js/views/teacher.js (baris 2345-2347)
const cls = await DB.gGet('school_classes', waliId);
const clsNama = cls?.nama || tr('Kelasmu', 'Your class');
const doc = await DB.gGet('class_schedule', waliId);
```

`waliId` di sini **adalah** `DB.user.waliKelasId` — ID kelas yang diwalikan guru ini. Dan `DB.gGet('class_schedule', waliId)` mengambil dokumen di `class_schedule/{waliId}` — ID dokumennya **persis** ID kelasnya, bukan ID acak yang dibuat lewat `uid()` seperti hampir semua dokumen lain di Tumara (tugas, jurnal, kolom nilai, dst.).

Kenapa ini pola yang bagus? Karena setiap kelas hanya boleh punya **satu** jadwal, dan setiap kelas hanya boleh punya **satu** wali kelas yang berhak menulisnya. Kalau ID dokumen jadwal dibuat acak seperti biasa, aplikasi harus melakukan query untuk mencari "dokumen jadwal mana yang `classId`-nya cocok dengan kelas ini" setiap kali dibutuhkan — dan aturan keamanan (Security Rules, dibahas tuntas di Bab 12) harus memeriksa isi dokumen itu satu per satu untuk memutuskan siapa boleh menulis. Dengan ID dokumen = `classId` langsung, aturan keamanannya bisa disederhanakan menjadi satu perbandingan yang murah: **"boleh tulis kalau `waliKelasId` milik pengguna ini sama dengan ID dokumen yang sedang ditulis"** — tidak perlu membaca isi dokumennya dulu untuk tahu itu milik kelas mana, ID-nya sendiri sudah menjawab pertanyaan itu.

Perhatikan juga tab ini **tidak** memakai gerbang `_classGate` seperti Absensi/Nilai/Jurnal — tidak ada pilihan kelas sama sekali:

```js
// js/views/teacher.js (baris 2332-2343, diringkas)
async renderJadwalKelas(el) {
  const waliId = DB.user.waliKelasId;
  if (!waliId) {
    el.innerHTML = `<div class="card empty-state">
      <ion-icon name="lock-closed-outline"></ion-icon>
      <div class="es-title">${tr('Khusus wali kelas', 'Homeroom teachers only')}</div>
      <div class="es-sub">${tr('Kamu belum terdaftar sebagai wali kelas. Atur lewat "Data Guru".', '...')}</div>
      <button class="btn btn-primary btn-sm" id="openSetup">${tr('Data Guru', 'Teacher Info')}</button>
    </div>`;
    $('#openSetup', el) && ($('#openSetup', el).onclick = () => this._setupModal(() => this.render(this._el)));
    return;
  }
  // ...langsung memakai waliId sebagai classId, tanpa layar pilih kelas
```

Guru non-wali tidak butuh **memilih** kelas di sini karena tabnya sendiri sudah **terikat** ke satu kelas spesifik — kelas yang diwalikannya. Kalau guru itu tidak wali kelas manapun, ia tidak pernah sampai melihat isi tab ini sama sekali, karena `guru.html` menyembunyikan link navnya lebih dulu:

```js
// guru.html (baris 142-148)
// Tab "Jadwal Kelas" hanya untuk wali kelas (punya waliKelasId).
// Sembunyikan nav-nya bila bukan wali; jika sedang di tab itu, pindahkan.
const refreshGuruNav = () => {
  const isWali = !!(DB.user && DB.user.waliKelasId);
  document.querySelectorAll('[data-route="jadwalkelas"],[data-route="waliabsen"]').forEach(a => { a.style.display = isWali ? '' : 'none'; });
  if (!isWali && (Teacher.tab === 'jadwalkelas' || Teacher.tab === 'waliabsen')) Teacher.tab = 'kelas';
};
```

Dua lapis penjagaan di sini, dan keduanya penting untuk alasan berbeda: `guru.html` menyembunyikan **link navigasinya** (supaya guru non-wali tidak tergoda mengklik tab yang tidak relevan untuknya — murni pengalaman pengguna, sama seperti `guardPage` di Bab 06), sementara `renderJadwalKelas` sendiri **tetap** memeriksa `waliKelasId` di dalam kodenya — kalau seseorang memaksa berpindah ke tab itu lewat cara lain (mis. mengetik langsung di `localStorage` lewat Console), tampilan "Khusus wali kelas" tetap muncul, bukan error atau layar kosong. Sama seperti selalu, penjagaan **sungguhan** — yang menolak percobaan tulis ke `class_schedule/{classId}` oleh guru yang bukan wali kelas itu — ada di Security Rules (Bab 12), bukan di kode ini.

---

## ✅ Cek hasil

- [ ] Buka `guru.html` sebagai akun bertipe `'guru'`. Modal "Data Guru" harus muncul otomatis kalau ini login pertama (`guruSetup` belum `true`).
- [ ] Isi nama, tambahkan minimal satu mapel (klik "Tambah" setelah mengetik), simpan. Sidebar harus langsung menampilkan nama Anda.
- [ ] Buka tab "Kelas & Siswa", pilih satu kelas untuk diampu. Buka tab "Absensi" — Anda harus melihat layar pilih mapel (bukan langsung "Belum ada kelas").
- [ ] Pilih satu mapel, isi kode kehadiran beberapa siswa, tekan "Simpan Absensi". Refresh browser (F5), buka lagi Absensi dengan tanggal & pertemuan yang sama — kode yang tadi disimpan harus muncul kembali (bukti `gSet` benar-benar menulis dan `attId` dibentuk konsisten).
- [ ] Buka Console DevTools, jalankan `await DB.gListWhere('class_attendance', 'classId', Teacher.classId)` — Anda harus melihat array berisi dokumen dengan `id` berformat `${classId}_${tanggal}_${guruId}_${mapelSlug}_${pertemuan}`.
- [ ] Di tab "Penilaian", tambah satu kolom nilai dengan KKM (mis. 75), ketik satu angka nilai di bawah KKM (mis. 60) — sel harus berubah warna merah **tanpa** menunggu apa pun, tapi tunggu sekitar setengah detik sebelum berpindah sel lain (memberi waktu debounce menulis).
- [ ] Tandai diri Anda sebagai wali kelas lewat "Data Guru" (topbar → ikon profil). Tab "Jadwal Kelas" dan "Rekap Absensi Kelas" harus **langsung muncul** di sidebar tanpa perlu me-refresh.
- [ ] Login sebagai akun guru **lain** yang bukan wali kelas manapun — tab "Jadwal Kelas" dan "Rekap Absensi Kelas" harus **tidak terlihat** sama sekali di sidebar-nya.

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| Absensi "menghapus" siswa yang tadinya sudah dicentang, atau siswa yang sudah pindah kelas tetap muncul lagi | Menyimpan dengan `DB.gUpdate` (merge) bukan `DB.gSet` (timpa penuh) | `entries` harus ditulis **utuh** dari `draft` setiap kali disimpan — pakai `gSet`. `gUpdate` menggabungkan map lama+baru, membuat data yang seharusnya sudah tidak relevan "hidup lagi". |
| Tab "Kelas & Siswa" guru menampilkan roster kosong padahal siswa sudah login dan memilih kelas | `kelasId` siswa tidak cocok persis dengan `id` dokumen `school_classes`, atau composite index `role+kelasId` belum sempat dibuat di Firestore | Cek `DB.user.kelasId` siswa vs `school_classes` di Console Firebase; kalau query gagal dengan error index, klik tautan yang disertakan error itu (atau deploy ulang `firestore.indexes.json`). |
| Dua guru mapel berbeda di kelas & hari yang sama saling menimpa absensi satu sama lain | ID dokumen absensi lupa menyertakan `guruId` dan/atau `mapelSlug` | ID harus lima bagian: `${classId}_${tanggal}_${guruId}_${mapelSlug}_${pertemuan}` — tanpa `guruId`+`mapelSlug`, dua guru berbeda menulis ke dokumen yang sama persis. |
| Nilai yang baru diketik "hilang" saat pindah sel dengan cepat, atau tersimpan versi yang belum lengkap (mis. "8" bukan "85") | Debounce terlalu cepat dipotong, atau `simpanNilai()` dipanggil langsung tanpa `setTimeout` | Pastikan `persist()` selalu `clearTimeout` dulu sebelum memasang `setTimeout` baru — jangan panggil `simpanNilai()` langsung dari `oninput`. |
| Guru non-wali masih bisa melihat tab "Jadwal Kelas" di sidebar | `refreshGuruNav()` di `guru.html` tidak dipanggil ulang setelah `waliKelasId` berubah (mis. lupa dipanggil di dalam callback `_setupModal`) | `_setupModal(onSaved)` harus memanggil `refreshGuruNav()` di dalam `onSaved` — lihat pemanggilannya di `guru.html`: `Teacher._setupModal(() => { refreshGuruNav(); updateView(); })`. |
| Guru lama (dibuat sebelum fitur `mapelAmpu[]` ada) kehilangan mapelnya setelah update aplikasi | Kode baru hanya membaca `mapelAmpu[]` dan mengabaikan `mapel` (field lama) | Selalu lewat `_mapelList()`, yang jatuh ke `[u.mapel]` kalau `mapelAmpu` kosong — jangan membaca `DB.user.mapelAmpu` langsung di tempat baru. |

## 🧪 Latihan

1. **Tambah kode kehadiran baru.** Sekolah Anda mungkin ingin membedakan "Alfa" dari "Terlambat". Tambahkan entri baru `{ k: 'T', id: 'Terlambat', en: 'Late' }` ke array `ABSEN` (baris 35–41), lalu tambahkan CSS untuk kelas `.att-T` (warna berbeda dari lima kode lain) di `css/style.css`. Uji: kode `T` harus muncul sebagai tombol keenam di tabel absensi, dan tersimpan/dibaca kembali sama seperti kode lain.
2. **Tambah kolom "Aktif di Jam Pelajaran" ke gradebook** yang **tidak** ikut dihitung rata-rata secara default. Petunjuk: saat membuat kolom baru lewat `_colModal`, set `avg: false` alih-alih `avg: true` untuk kolom bertipe ini — lalu pastikan checkbox rata-rata di header kolom itu tampil tidak tercentang di awal.
3. ⭐ Tanpa membuka lagi Bagian 9, jelaskan dengan kata-kata Anda sendiri ke rekan sejawat: kenapa dokumen `class_schedule` memakai `classId` langsung sebagai ID-nya, bukan ID acak (`uid()`) seperti koleksi lain (`class_tasks`, `journals`, kolom `grades`)? Sertakan dalam penjelasan Anda: apa yang akan menjadi lebih rumit (baik di kode maupun di Security Rules Bab 12) kalau ID-nya dibuat acak.

## 📌 Ringkasan

- `guru.html` adalah halaman **terpisah** dari `app.html`, dijaga `guardPage(['guru'])`. Guru bisa mengampu **banyak** kelas dan **banyak** mapel — inilah sebab hampir semua fitur guru dikunci dua kali: per-kelas dan per-mapel.
- Setup awal (`_setupModal`) mengisi `mapelAmpu[]` (array baru) sambil tetap menulis `mapel` (teks tunggal lama) untuk kompatibilitas — pola **"normalisasi saat baca"**: `_mapelList()` yang memutuskan mana yang dipakai, bukan skrip migrasi data.
- `kelasAmpu[]` menentukan kelas mana yang terlihat oleh guru; roster siswanya sendiri **selalu** dibaca dari akun siswa aktif (`kelasId`, diisi siswa sendiri saat onboarding), bukan dari `school_roster` admin — supaya data selalu segar tanpa sinkronisasi manual. Query roster butuh composite index `role+kelasId`, sudah dideklarasikan di `firestore.indexes.json`.
- `Teacher.tab` memakai getter/setter ke `localStorage` (bukan properti biasa) supaya posisi tab guru bertahan **lintas sesi**, bukan cuma lintas render — pola "gerbang kelas" 4-baris yang berulang di enam tab adalah contoh nyata "state di properti objek" dipakai untuk alur multi-langkah.
- ID dokumen absensi (`${classId}_${tanggal}_${guruId}_${mapelSlug}_${pertemuan}`) mencegah tabrakan antar-guru; kode kehadiran disimpan dulu ke `draft` lokal (hemat kuota tulis), baru ditulis dengan `gSet` (timpa penuh) — bukan `gUpdate` — supaya siswa yang sudah dihapus tidak "hidup lagi" lewat merge.
- `_dailyStatus()` + `_LENIENT` menyimpulkan status kehadiran **harian** dari beberapa catatan per-mapel: hadir di satu mapel saja sudah dianggap hadir sehari; kalau tidak pernah hadir, keterangan paling longgar (Izin > Sakit > Dispensasi > Alfa) yang dipakai.
- Penilaian punya kolom ber-**KKM**, rata-rata hanya menghitung kolom yang dicentang aktif, dan input nilai memakai **debounce 400ms** — menunda penulisan sampai jeda ketik berhenti, sementara tampilan (warna, rata-rata) tetap diperbarui seketika.
- `class_tasks` (global, ditulis guru lewat `gAdd`/`gUpdate`) adalah koleksi yang sama yang dibaca siswa read-only di Bab 09. `class_schedule/{classId}` memakai `classId` **langsung** sebagai ID dokumen — pola elegan yang menyederhanakan Security Rules (Bab 12) dan hanya bisa ditulis wali kelas kelas itu; guru non-wali tidak melihat tabnya sama sekali.

**Berikutnya:** [Bab 11 — Panel Admin](11-panel-admin.md)
