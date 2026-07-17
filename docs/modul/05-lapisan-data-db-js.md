# Bab 05 — Lapisan Data `db.js`

> **Tujuan bab ini:** Anda bisa membangun `js/db.js` — satu pintu untuk semua data aplikasi — dan menjalankan seluruh Tumara **tanpa internet** (mode localStorage) sebelum menyambungkannya ke Firebase.

| | |
|---|---|
| **Perkiraan waktu** | ~90 menit (ini bab besar, cicil pelan-pelan) |
| **Sebelum ini** | [Bab 04 — Menyiapkan Firebase](04-menyiapkan-firebase.md) |
| **Anda butuh** | `js/utils.js` sudah ada (dari Bab 02), `js/firebase-config.js` (dari Bab 04), dan editor + Live Server |

## Apa yang kita bangun di bab ini

Kita membuat **satu file** yang menjadi satu-satunya tempat aplikasi bicara soal data. Tidak ada satu pun halaman siswa, guru, atau admin yang menyentuh Firebase langsung. Semua cukup berkata:

```js
await DB.add('notes', { isi: 'Belajar bab 5' });
const semua = await DB.list('notes');
```

`DB` yang mengurus di mana dan bagaimana data itu disimpan. Hasil akhirnya adalah sebuah objek global bernama `DB` dengan sekitar 25 method, dan sebuah **saklar** yang menentukan apakah data pergi ke internet (Firebase) atau tetap di dalam browser (localStorage).

```
                         ┌─────────────────────────────┐
   view siswa  ───┐      │            DB               │
   view guru   ───┼────▶ │  (satu API, ~25 method)     │
   view admin  ───┘      │                             │
                         │   pilih SATU adapter:       │
                         │   ┌───────────┐ ┌─────────┐ │
                         │   │ Firebase  │ │  Local  │ │
                         │   │ Adapter   │ │ Adapter │ │
                         │   └─────┬─────┘ └────┬────┘ │
                         └─────────┼────────────┼──────┘
                                   ▼            ▼
                              Firestore    localStorage
                             (internet)    (browser Anda)
```

Kita bahas 11 bagian. Jangan buru-buru. Bagian 7 (`_clean`) dan bagian 9 (`gSet` vs `gUpdate`) adalah dua tempat di mana bug nyata pernah menggigit — perhatikan baik-baik.

---

## 1. Kenapa harus ada satu pintu data

Bayangkan setiap halaman aplikasi memanggil Firebase sendiri-sendiri. Halaman Tugas menulis kode koneksi Firestore, halaman Catatan menulis lagi, halaman Absensi menulis lagi. Kode yang sama diulang belasan kali. Lalu suatu hari Firebase menaikkan harga, atau Anda ingin mencoba aplikasi tanpa internet — Anda harus menyunting belasan file.

Solusinya adalah **satu pintu**: seluruh aplikasi cukup tahu perintah sederhana seperti `DB.list('tasks')` dan `DB.add(...)`. Bagaimana caranya data disimpan — itu urusan `DB`, bukan urusan halaman.

> **Analogi sekolah:** guru tidak pergi sendiri ke gudang arsip mengambil map siswa. Ada satu petugas Tata Usaha. Guru cukup menitip: "tolong ambilkan data kelas 7A". Petugas itu yang tahu laci mana, kunci mana. Kalau gudang pindah gedung, guru tak perlu tahu — cukup petugasnya yang menyesuaikan. `DB` adalah petugas TU aplikasi ini.

Pola ini punya nama: **lapisan data** (*data layer*). Ide intinya: kode yang memakai data dipisahkan dari kode yang menyimpan data.

## 2. Pola adapter — dua petugas, satu daftar layanan

Di dalam `db.js` ada **dua** petugas, bukan satu:

- `LocalAdapter` — menyimpan data ke **localStorage**, yaitu gudang kecil di dalam browser Anda sendiri. Tidak perlu internet. Cocok untuk latihan dan mencoba.
- `FirebaseAdapter` — menyimpan data ke **Firestore** di internet. Ini yang dipakai sekolah sungguhan.

Kuncinya: **kedua petugas punya daftar layanan (method) yang PERSIS sama.** Keduanya punya `list`, `add`, `update`, `remove`, `login`, dan seterusnya, dengan nama dan cara pakai yang identik. Karena itu, aplikasi bisa memakai salah satu tanpa peduli yang mana. Inilah yang disebut **pola adapter** (dua benda beda-dalam tapi berbekas-luar sama, seperti steker listrik yang sama-sama muat di colokan).

Kita memilih salah satu **satu kali saja**, di bagian bawah file:

```js
// js/db.js — pemilihan adapter
const adapter = (typeof USE_FIREBASE !== 'undefined' && USE_FIREBASE && FIREBASE_CONFIG.apiKey)
  ? FirebaseAdapter
  : LocalAdapter;
```

Baca kondisinya pelan-pelan:

- `typeof USE_FIREBASE !== 'undefined'` — pastikan variabel `USE_FIREBASE` memang ada (agar tidak error kalau `firebase-config.js` belum dimuat).
- `USE_FIREBASE` — Anda menyalakannya di `js/firebase-config.js`.
- `&& FIREBASE_CONFIG.apiKey` — **dan** konfigurasinya sudah diisi kunci Firebase.

Kenapa syarat terakhir penting? Karena kalau Anda menyalakan `USE_FIREBASE = true` tapi lupa menempel `apiKey`, aplikasi tidak akan meledak. Ia otomatis **turun** ke `LocalAdapter`. Tidak ada layar putih, tidak ada error misterius — aplikasi tetap jalan pakai penyimpanan browser.

> **Manfaat mengajar yang besar:** dengan `USE_FIREBASE = false`, Anda bisa membangun dan mencoba **seluruh** aplikasi Tumara tanpa internet sama sekali. Absensi, nilai, tugas — semua jalan, tersimpan di browser. Baru setelah semuanya beres, Anda balik saklarnya ke Firebase. Anda tidak perlu berhasil menyetel Firebase dulu untuk mulai membangun.

## 3. Bentuk API publik — dua kelompok besar data

Sebelum menulis isi adapter, lihat dulu **wajah** `db.js` — objek yang di-`return` di ujung file. Ini kontrak yang dilihat seluruh aplikasi. (Versi ringkas; lengkapnya lihat `js/db.js` baris 765–828.)

```js
// js/db.js — objek publik yang di-return (diringkas & dikelompokkan)
return {
  get isFirebase() { return adapter === FirebaseAdapter; },
  get user()       { return adapter.user; },
  get role()       { return adapter.user?.role || 'siswa'; },

  // --- Autentikasi (Bab 06) ---
  init:          () => adapter.init(),
  register:      d  => adapter.register(d),
  login:         (e, p) => adapter.login(e, p),
  logout:        () => adapter.logout(),
  updateUser:    p  => adapter.updateUser(p),
  changePassword:(o, n) => adapter.changePassword(o, n),

  // --- CRUD data PRIBADI pengguna → users/{uid}/{coll}/{id} ---
  list:   c        => adapter.list(c),
  add:    (c, i)   => adapter.add(c, i),
  update: (c, id, p) => adapter.update(c, id, p),
  set:    (c, id, i) => adapter.set(c, id, i),
  remove: (c, id)  => adapter.remove(c, id),

  // --- Koleksi GLOBAL sekolah → /{coll}/{id} ---
  gList:      c        => adapter.gList(c),
  gListWhere: (c, f, v) => adapter.gListWhere(c, f, v),
  gAdd:       (c, i)   => adapter.gAdd(c, i),
  gUpdate:    (c, id, p) => adapter.gUpdate(c, id, p),
  gSet:       (c, id, d) => adapter.gSet(c, id, d),
  gRemove:    (c, id)  => adapter.gRemove(c, id),
  gGet:       (c, id)  => adapter.gGet(c, id),

  // --- Admin & helper (Bab 11) ---
  adminCreateUser: d  => adapter.adminCreateUser(d),
  listStudents:    () => adapter.listStudents(),
  getDaily:  async (tgl) => { /* ... */ },
  saveDaily: async (tgl, patch) => { /* ... */ },
  exportAll: async () => { /* ... */ }
};
```

Perhatikan pola yang berulang: hampir setiap method hanya meneruskan panggilan ke `adapter`. Objek publik ini tipis; kerja sesungguhnya ada di dalam adapter yang terpilih.

**Pembagian besar yang jadi fondasi seluruh model data Tumara** — ada dua kelompok CRUD (*Create, Read, Update, Delete* = buat, baca, ubah, hapus):

1. **`list/add/update/set/remove`** untuk data **PRIBADI** setiap siswa. Ini disimpan di sub-koleksi di bawah dokumen pengguna: `users/{uid}/{coll}/{id}`. Catatan kesehatan, tugas pribadi, hafalan, keuangan pribadi — hanya milik siswa itu, tersimpan di "map" siswa itu sendiri.

2. **`gList/gListWhere/gAdd/gUpdate/gSet/gRemove/gGet`** (huruf `g` = *global*) untuk data **BERSAMA** sekolah. Ini disimpan di koleksi level atas: `/{coll}/{id}`. Daftar kelas, jadwal, tugas kelas, dan absensi — dipakai bersama oleh admin, guru, dan siswa.

> **Analogi arsip:** data pribadi siswa ibarat map yang disimpan **di dalam** loker pribadi tiap siswa. Data sekolah ibarat papan pengumuman dan buku induk **di ruang TU** — satu, dipakai bersama. Anda harus tahu barang mana masuk ke mana; salah tempat berarti salah siapa yang bisa membacanya (dan itu penting untuk keamanan di Bab 12).

## 4. Memuat Firebase SDK tanpa build step

Tumara tidak memakai npm, webpack, atau langkah *build*. Semua file dimuat lewat `<script src>` biasa. Tapi Firebase SDK v10 itu modular dan besar — kita tak mau memuatnya kalau ternyata Anda pakai mode localStorage.

Solusinya: **impor dinamis** (`import()` sebagai fungsi, bukan di atas file). SDK baru diunduh dari internet **saat pertama kali dibutuhkan**, lalu disimpan agar tak diunduh ulang.

```js
// js/db.js — _load() di dalam FirebaseAdapter (diringkas)
async _load() {
  if (this.fb) return this.fb;            // sudah dimuat → pakai lagi
  const V = '10.12.2';
  const [appM, authM, fsM] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
  ]);
  const app  = appM.initializeApp(FIREBASE_CONFIG);
  const auth = authM.getAuth(app);
  let db;
  try {
    db = fsM.initializeFirestore(app, {
      localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() })
    });
  } catch (_) {
    db = fsM.getFirestore(app);
  }
  this.fb = { auth, db, A: authM, F: fsM };  // simpan semuanya
  return this.fb;
}
```

Poin penting:

- **`if (this.fb) return this.fb;`** — kalau sudah pernah dimuat, langsung kembalikan. Firebase hanya disiapkan sekali seumur sesi.
- **`Promise.all([...])`** — mengunduh tiga modul (app, auth, firestore) sekaligus, bukan satu per satu. Lebih cepat.
- **`this.fb = { auth, db, A: authM, F: fsM }`** — ini triknya. Kita simpan bukan hanya `auth` dan `db`, tapi juga **modul**-nya: `A` = modul auth, `F` = modul firestore. Kenapa? Karena di SDK modular v10, fungsi seperti `doc()`, `setDoc()`, `getDocs()` bukan method dari `db`, melainkan fungsi lepas yang harus diimpor.

Karena disimpan begitu, tiap method lain cukup menulis:

```js
const { F, db } = this.fb;
F.doc(db, 'users', id);           // = fungsi doc() dari modul firestore
F.setDoc(ref, data);              // = fungsi setDoc()
```

`F.` di depan sama seperti berkata "fungsi ini dari modul Firestore". Ini cara memakai Firebase SDK modular di aplikasi tanpa *bundler*. Nama pendek `A` dan `F` dipilih agar tiap baris tidak jadi panjang.

## 5. Membaca data — bentuk hasilnya

Sekarang method paling sering dipakai: `list(coll)` — ambil semua isi satu koleksi.

```js
// js/db.js — FirebaseAdapter.list()
async list(coll) {
  const cache = this._cache.own;
  if (cache.has(coll)) return cache.get(coll).slice();   // ada di fotokopi meja
  const { F } = this.fb;
  const snap = await F.getDocs(this._colRef(coll));       // baca dari server
  const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  cache.set(coll, arr);                                   // simpan fotokopinya
  return arr.slice();                                     // kembalikan SALINAN
}
```

Tiga hal yang harus Anda tangkap:

1. **`snap.docs.map(d => ({ id: d.id, ...d.data() }))`** — inilah "bentuk data" Tumara. Di Firestore, **ID dokumen tersimpan di luar isinya**. `d.data()` memberi isi, tapi tidak memberi ID. Jadi kita **sisipkan ID secara manual** ke dalam objek. Hasilnya tiap record berbentuk `{ id: 'abc123', ...isi }`. Seluruh aplikasi bergantung pada bentuk ini.

2. **`return arr.slice()`** — `.slice()` membuat **salinan** array. Kita tidak mengembalikan array aslinya yang tersimpan di cache. Kalau kita kembalikan yang asli, dan halaman lain mengubahnya (mis. `hapus satu`), cache ikut rusak diam-diam. Salinan melindungi cache dari tangan pemanggil.

3. **`cache.has(coll)` di baris pertama** — sebelum menembak server, cek dulu "fotokopi di meja". Itu bahasan Bagian 8.

## 6. Menulis data — write-through, dan kenapa bukan `addDoc`

```js
// js/db.js — FirebaseAdapter.add()
async add(coll, item) {
  const { F } = this.fb;
  const id = uid();                                      // buat ID sendiri
  await F.setDoc(F.doc(this._colRef(coll), id), this._clean(item));
  const rec = { id, ...item };
  const cached = this._cache.own.get(coll);
  if (cached) cached.push(rec);                          // tempel ke fotokopi
  return rec;
}
```

Dua keputusan desain:

- **Kita buat ID sendiri lewat `uid()`, lalu pakai `setDoc`, bukan `addDoc`.** Firestore punya `addDoc` yang membuatkan ID otomatis — tapi Anda baru tahu ID-nya **setelah** jaringan menjawab. Dengan `uid()` dari `js/utils.js` (`Date.now().toString(36) + acak`), kita tahu ID **sebelum** menulis. Itu memudahkan menyisipkannya ke cache dan mengembalikannya seketika.

- **Write-through** ("tulis-tembus"). Setelah menulis ke server, kita **langsung menempel** record baru ke cache (`cached.push(rec)`) tanpa membaca ulang dari server. Fotokopi di meja tetap segar tanpa perlu ke gudang lagi. Method `update`, `set`, `remove` melakukan hal yang sama — masing-masing menambal cache setelah menulis.

`update` bekerja mirip, tapi memakai `merge`:

```js
// js/db.js — FirebaseAdapter.update()
async update(coll, id, patch) {
  const { F } = this.fb;
  await F.setDoc(F.doc(this._colRef(coll), id), this._clean(patch), { merge: true });
  // ...tambal cache...
}
```

`{ merge: true }` artinya: gabungkan `patch` ke dokumen yang ada, jangan menimpa seluruhnya. Kalau dokumen punya `{ nama, umur }` dan Anda `update` dengan `{ umur: 13 }`, `nama` tetap. Ingat kata "merge" ini — di Bagian 9 kita akan melihat kapan justru **tidak boleh** merge.

## 7. `_clean()` — kenapa Firestore menolak data Anda

Ini contoh "kenapa" yang lahir dari bug nyata, dan Anda pasti akan menabraknya.

**Firestore menolak nilai `undefined` di kedalaman mana pun.** Kalau satu saja field, atau field di dalam objek bersarang, atau elemen array, bernilai `undefined`, maka **seluruh** penulisan gagal — bukan cuma field itu, tapi semuanya. Padahal JavaScript memberi `undefined` dengan sangat gampang (variabel yang tak diisi, hasil `form.get()` yang kosong).

Karena itu, sebelum setiap tulis, data dilewatkan ke `_clean()`:

```js
// js/db.js — FirebaseAdapter._clean()
_clean(obj) {
  if (Array.isArray(obj)) return obj.filter(v => v !== undefined).map(v => this._clean(v));
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const out = {};
    for (const k in obj) {
      if (obj[k] === undefined) continue;   // buang field undefined
      out[k] = this._clean(obj[k]);         // bersihkan isi bersarang
    }
    return out;
  }
  return obj;
}
```

Baca cara kerjanya:

- Kalau **array**: buang elemen `undefined`, lalu bersihkan tiap elemen.
- Kalau **objek**: lewati (jangan salin) field yang bernilai `undefined`, dan bersihkan sisanya secara rekursif (masuk ke dalam objek di dalam objek).
- Selain itu: kembalikan apa adanya.

Perhatikan penjaga **`!(obj instanceof Date)`**. Tanggal (`Date`) di JavaScript **juga** dianggap objek. Tanpa penjaga ini, `_clean` akan masuk ke dalam Date, mengaduk-aduknya, dan mengembalikan `{}` kosong — tanggal Anda hancur. Penjaga ini berkata: "kalau ini Date, jangan diutak-atik, kembalikan utuh."

Setiap `setDoc` di FirebaseAdapter membungkus datanya dengan `this._clean(...)`. Itu bukan hiasan — itu yang menahan aplikasi dari gagal-tulis diam-diam.

## 8. Cache & kuota baca Firestore

Firestore gratis, tapi ada **jatah baca harian**. Setiap `getDocs` yang menembak server dihitung sebagai baca. Tanpa perlindungan, satu siswa berpindah-pindah tab bisa memicu puluhan baca dalam semenit, dan satu sekolah bisa menghabiskan jatah gratis sebelum siang.

Komentar aslinya di `js/db.js` menjelaskan ini gamblang:

```js
// js/db.js — komentar asli
// Cache baca in-memory per sesi. Tanpa ini, tiap `getDocs` (perpindahan
// tab, reload komponen) selalu menembak server saat online → kena kuota
// baca harian Firestore. Cache ini ditulis-tembus (write-through) pada
// add/update/set/remove sehingga tetap segar tanpa membaca ulang, dan
// dikosongkan saat login/logout (ganti pengguna).
//   own → subkoleksi milik pengguna (users/{uid}/{coll})
//   g   → koleksi global sekolah (gList)
//   gw  → query global berfilter (gListWhere), key `coll|field|value`
_cache: { own: new Map(), g: new Map(), gw: new Map() },
```

> **Analogi:** cache adalah **fotokopi di atas meja Anda**. Sekali Anda ambil map dari gudang arsip, Anda fotokopi dan taruh di meja. Lain kali butuh, Anda baca fotokopinya — tak perlu jalan ke gudang lagi. "Jalan ke gudang" itulah baca yang dihitung kuota.

Ada tiga laci fotokopi (`Map` = daftar pasangan kunci→nilai):

- **`own`** — data pribadi pengguna (`list`).
- **`g`** — koleksi global (`gList`).
- **`gw`** — query global berfilter (`gListWhere`), dengan kunci gabungan `coll|field|value`.

Cache dibersihkan saat ganti pengguna:

```js
// js/db.js
_cacheClear() { this._cache.own.clear(); this._cache.g.clear(); this._cache.gw.clear(); },
```

Dipanggil di `login` dan `logout` — agar data pengguna lama tak bocor ke pengguna baru.

**Masalah khusus koleksi global:** data pribadi cuma satu penulis (siswa itu sendiri), jadi write-through cukup. Tapi koleksi global punya **banyak penulis** — beberapa admin dan guru bisa mengubahnya. Fotokopi Anda bisa basi karena orang lain mengubah aslinya. Karena itu setelah setiap tulis global, cache-nya **dibuang** (bukan ditambal):

```js
// js/db.js — buang cache global satu koleksi saat ditulis
_gInvalidate(coll) {
  this._cache.g.delete(coll);
  for (const k of this._cache.gw.keys())
    if (k.startsWith(coll + '|')) this._cache.gw.delete(k);
}
```

Selain cache buatan sendiri ini, Firestore juga punya **cache disk** sendiri (`persistentLocalCache`, lihat Bagian 4). Itu menyimpan data yang sudah dibaca ke IndexedDB browser, sehingga tetap ada saat reload dan saat offline. Dua lapis cache: satu di memori (cepat, per sesi), satu di disk (tahan reload).

Cache inilah yang membuat `App.refresh()` — memuat ulang tampilan setelah tiap perubahan — jadi **murah**. Refresh cuma membaca fotokopi, bukan menembak server. (Detail `App.refresh()` di Bab 08.)

## 9. `gSet` vs `gUpdate` — bug yang menghidupkan siswa yang sudah dihapus

Ini keputusan desain terpenting di bab ini. Dua method terlihat mirip, tapi bedanya menentukan benar-salahnya absensi.

```js
// js/db.js — FirebaseAdapter
async gUpdate(coll, id, patch) {
  const { F } = this.fb;
  await F.setDoc(F.doc(this._gColRef(coll), id), this._clean(patch), { merge: true });  // GABUNG
  this._gInvalidate(coll);
  return { id, ...patch };
}

async gSet(coll, id, data) {
  const { F } = this.fb;
  await F.setDoc(F.doc(this._gColRef(coll), id), this._clean(data));                    // TIMPA PENUH
  this._gInvalidate(coll);
  return { id, ...data };
}
```

Perhatikan bedanya cuma satu: `gUpdate` memakai `{ merge: true }`, `gSet` tidak.

- **`gUpdate` = merge = menggabung.** Cocok untuk menambah atau mengubah beberapa field, sisa dokumen dibiarkan. Aman untuk kebanyakan hal.
- **`gSet` = timpa penuh.** Seluruh dokumen diganti dengan data baru. Field lama yang tidak ada di data baru **hilang**.

Kenapa absensi **HARUS** pakai `gSet`? Bayangkan dokumen absensi menyimpan daftar status siswa:

```
entries: { budi: 'hadir', siti: 'hadir', andi: 'sakit' }
```

Lalu Andi pindah kelas dan dihapus dari daftar. Anda simpan absensi baru:

```
entries: { budi: 'hadir', siti: 'hadir' }
```

Kalau Anda pakai **merge** (`gUpdate`), Firestore akan **menggabung** map lama dengan yang baru. `andi: 'sakit'` dari data lama tidak disebut di data baru, jadi merge **membiarkannya tetap ada**. Hasilnya Andi **hidup lagi** di absensi, padahal sudah dihapus. Merge tidak bisa menghapus kunci dari map bersarang — ia hanya menambah dan menimpa.

Dengan **`gSet`** (timpa penuh), seluruh `entries` diganti. Andi yang tak ada di data baru benar-benar hilang. Itulah yang kita mau.

Komentar aslinya menegaskan ini:

```js
// js/db.js
// Timpa penuh (TANPA merge) — absensi harus mengganti `entries` utuh,
// sedangkan gUpdate memakai {merge:true} yang menggabung map bersarang.
```

Detail absensi dibahas di Bab 10. Di sini cukup Anda tanam konsepnya: **merge menambah dan menimpa, tapi tak pernah menghapus. Kalau Anda perlu menghapus isi map, timpa penuh.**

## 10. `getDaily` / `saveDaily` — tanggal sebagai ID dokumen

Catatan kesehatan harian harus **satu record per tanggal**. Kalau siswa mengklik "simpan" dua kali cepat, tak boleh ada dua record untuk hari yang sama. Triknya: **pakai tanggal itu sendiri sebagai ID dokumen.**

```js
// js/db.js — helper publik (diringkas)
async getDaily(tanggal = todayStr()) {
  const all = await adapter.list('health_daily');
  return all.find(d => d.tanggal === tanggal) || { ...DAILY_DEFAULT, tanggal };
},

async saveDaily(tanggal, patch) {
  const all = await adapter.list('health_daily');
  const existing = all.find(d => d.tanggal === tanggal);
  if (existing) return adapter.update('health_daily', existing.id, patch);
  return adapter.set('health_daily', tanggal, { ...DAILY_DEFAULT, tanggal, ...patch });
}
```

Dua hal:

- **`getDaily` tak pernah mengembalikan `null`.** Kalau belum ada catatan hari itu, ia mengembalikan `{ ...DAILY_DEFAULT, tanggal }` — objek default berisi nol. Jadi halaman yang memakainya tak perlu menangani kasus "kosong"; selalu dapat objek utuh.

- **`saveDaily` untuk record baru memakai `adapter.set('health_daily', tanggal, ...)`** — perhatikan `tanggal` dijadikan ID. Karena Firestore hanya boleh punya satu dokumen per ID, dua penyimpanan dengan tanggal sama akan mengenai dokumen yang sama, bukan membuat dua. `todayStr()` (dari `js/utils.js`) memberi format `YYYY-MM-DD` — dibuat manual karena `toISOString()` bergeser ke zona waktu UTC dan bisa salah hari.

## 11. Mode localStorage — supaya bisa belajar tanpa internet

`LocalAdapter` adalah kembaran `FirebaseAdapter` yang menyimpan ke browser. Anda tidak perlu menghafal seluruh isinya — cukup paham polanya. (Gambaran saja; lengkapnya lihat `js/db.js` baris 34–269.)

- Data pribadi disimpan dengan kunci `tumara_data_{uid}_{coll}`. Data global dengan `tumara_school_{coll}`. Daftar pengguna di `tumara_users`, sesi aktif di `tumara_session`.
- Tiap "koleksi" hanyalah sebuah array JSON yang disimpan sebagai teks:

```js
// js/db.js — LocalAdapter (inti)
_key(coll)  { return `tumara_data_${this._user.id}_${coll}`; },
_read(coll) { return JSON.parse(localStorage.getItem(this._key(coll)) || '[]'); },
_write(coll, arr) { localStorage.setItem(this._key(coll), JSON.stringify(arr)); },
```

- Password tidak disimpan apa adanya, tapi di-*hash* dengan SHA-256 lewat `crypto.subtle` (dengan cadangan sederhana bila `crypto.subtle` tak tersedia, mis. saat dibuka lewat `file://` yang bukan konteks aman).

Yang penting: `LocalAdapter` menyediakan **method dengan nama yang sama persis** seperti `FirebaseAdapter` — `list`, `add`, `gSet`, `getDaily`, semuanya. Itulah yang membuat saklar di Bagian 2 bisa menukar keduanya tanpa mengubah satu baris pun di halaman aplikasi. `LocalAdapter` bahkan meniru perilaku halus: `gUpdate`-nya melakukan merge-mirip, `gSet`-nya menimpa penuh — supaya latihan Anda offline berkelakuan sama dengan produksinya.

> ⚠️ **Jujur soal ini:** mode localStorage hanya untuk latihan dan mencoba. Datanya cuma ada di **satu browser di satu laptop** — tidak tersinkron, tidak ada cadangan, hilang kalau Anda bersihkan data browser. Untuk sekolah sungguhan, Anda pakai Firebase. localStorage adalah "lapangan latihan", bukan lapangan pertandingan.

---

## ✅ Cek hasil

Pastikan urutan `<script>` di HTML Anda memuat `js/firebase-config.js`, lalu `js/utils.js`, lalu `js/db.js` (urutan `<script>` = urutan ketergantungan; `db.js` butuh keduanya).

Untuk uji cepat lapisan data **tanpa** ribet autentikasi, sementara set `USE_FIREBASE = false` di `js/firebase-config.js`, lalu buka halaman lewat **Live Server** (bukan `file://`) dan buka Console browser (DevTools → Console).

`DB.init()` yang penuh membutuhkan alur masuk yang baru dibangun di Bab 06. Jadi untuk sekarang, uji yang realistis di mode lokal:

- [ ] Ketik `typeof DB` → harus `"object"`. (`db.js` termuat.)
- [ ] Ketik `DB.isFirebase` → harus `false`. (Saklar turun ke localStorage seperti diharapkan.)
- [ ] Daftar satu pengguna latihan agar ada sesi:
  ```js
  await DB.register({ nama: 'Uji Coba', email: 'uji@contoh.id', password: 'rahasia123' });
  await DB.add('notes', { isi: 'tes' });
  await DB.list('notes');   // harus berisi { id: '...', isi: 'tes' }
  ```
- [ ] Buka DevTools → **Application → Local Storage**. Cari kunci berawalan `tumara_data_...notes` — isinya array JSON berisi catatan tadi.
- [ ] Uji "satu per hari": `await DB.saveDaily(todayStr(), { air: 3 })` lalu `await DB.getDaily()` → `air` harus `3`, dan tetap satu record walau disimpan dua kali.

Uji dengan Firebase sungguhan (`USE_FIREBASE = true`) dilakukan di **Bab 06**, setelah alur masuk lengkap.

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| Tulis gagal, error menyebut `undefined` | Ada field bernilai `undefined` dikirim ke Firestore | Pastikan setiap `setDoc` dibungkus `this._clean(...)`. Firestore menolak `undefined` di kedalaman mana pun. |
| Data yang baru diubah tak muncul di halaman lain | Cache basi — koleksi global ditulis tanpa membuang cache | Panggil `this._gInvalidate(coll)` di setiap tulis global (`gAdd/gUpdate/gSet/gRemove`). |
| Siswa yang sudah dihapus muncul lagi di absensi | Absensi disimpan pakai `gUpdate` (merge) | Pakai `gSet` (timpa penuh). Merge tak bisa menghapus kunci dari map. |
| `import()` Firebase gagal / error CORS / SDK tak termuat | Halaman dibuka lewat `file://` | Buka lewat **Live Server** (`http://`). Impor modul dari CDN tak jalan di `file://`. |
| Tanggal `getDaily` meleset satu hari | Memakai `toISOString()` yang bergeser ke UTC | Pakai `todayStr()` dari `js/utils.js` yang memakai waktu lokal. |
| `DB.isFirebase` `false` padahal ingin Firebase | `USE_FIREBASE` mati **atau** `FIREBASE_CONFIG.apiKey` kosong | Isi konfigurasi Firebase (Bab 04) dan set `USE_FIREBASE = true`. Syarat `&& apiKey` sengaja menurunkan ke lokal bila belum dikonfigurasi. |

## 🧪 Latihan

1. **Baca peta cache.** Buka `js/db.js`, temukan `_cache`. Tuliskan dengan kata-kata sendiri: apa isi laci `own`, `g`, dan `gw`, dan kapan masing-masing dibersihkan.

2. **Tambah method kecil `count`.** Tambahkan ke objek publik sebuah method `count: async c => (await adapter.list(c)).length` yang mengembalikan jumlah record di satu koleksi. Uji: `await DB.count('notes')`. (Petunjuk: cukup satu baris; ia menumpang di atas `list`, jadi ikut hemat cache.)

3. ⭐ **Jelaskan `gSet` untuk absensi.** Tanpa melihat modul ini, tulis satu paragraf: kenapa absensi memakai `gSet` (timpa penuh) dan bukan `gUpdate` (merge)? Sertakan contoh siswa yang dihapus. Kalau bisa Anda jelaskan ke rekan guru sampai paham, Anda sudah menguasai bagian tersulit bab ini.

## 📌 Ringkasan

- `db.js` adalah **satu pintu** untuk semua data. Halaman aplikasi tak pernah menyentuh Firebase langsung — cukup `DB.list`, `DB.add`, dan seterusnya.
- **Pola adapter:** dua petugas dengan method identik (`FirebaseAdapter`, `LocalAdapter`), dipilih sekali oleh saklar `USE_FIREBASE && FIREBASE_CONFIG.apiKey`. Bila belum dikonfigurasi, otomatis turun ke localStorage — Anda bisa membangun seluruh aplikasi tanpa internet.
- Dua kelompok data: **pribadi** siswa (`list/add/...` → `users/{uid}/{coll}`) dan **bersama** sekolah (`gList/gAdd/...` → `/{coll}`). Ini fondasi model data.
- **`_clean()`** wajib membungkus setiap tulis karena Firestore menolak `undefined`; penjaga `!(obj instanceof Date)` melindungi tanggal.
- **Cache** menghemat kuota baca Firestore: write-through untuk data pribadi, buang-cache (`_gInvalidate`) untuk data global bermilik-banyak.
- **`gSet` (timpa penuh) vs `gUpdate` (merge):** absensi harus `gSet`, karena merge tak bisa menghapus siswa yang sudah dikeluarkan dari daftar.

**Berikutnya:** [Bab 06 — Masuk, Daftar & Peran](06-masuk-daftar-dan-peran.md)
