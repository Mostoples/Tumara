# Bab 12 — Aturan Keamanan

> **Tujuan bab ini:** Anda bisa membaca, menjelaskan, dan menulis `firestore.rules` — penjaga **sungguhan** aplikasi Tumara, yang berjalan di server Google, bukan di browser siapa pun — lalu men-deploy-nya dengan benar.

| | |
|---|---|
| **Perkiraan waktu** | ~60 menit |
| **Sebelum ini** | [Bab 11 — Panel Admin](11-panel-admin.md) |
| **Anda butuh** | Firebase project dari Bab 04 sudah aktif, memahami koleksi `users`, `school_classes`, `class_tasks`, `class_schedule`, `class_attendance`, `class_submissions` dari Bab 10 dan 11, akses ke Firebase Console |

## Apa yang kita bangun di bab ini

Tidak ada kode JavaScript baru di bab ini. Kita membaca `firestore.rules` (5,2 KB, satu file) baris demi baris, memahami kenapa setiap barisnya ditulis seperti itu, lalu men-deploy-nya ke Firebase supaya berlaku sungguhan. Setelah bab ini, kalau ada yang bertanya "apa yang mencegah siswa membaca nilai siswa lain?", jawaban Anda bukan lagi "kodenya tidak menampilkan itu" — melainkan "Firestore menolaknya, walau kodenya sengaja diubah untuk mencoba".

Alur mentalnya:

```
Bab 06: guardPage → hanya mengatur SIAPA MELIHAT LAYAR APA (UX, bisa dilewati)
Bab 12: firestore.rules → mengatur SIAPA BOLEH BACA/TULIS DOKUMEN APA (nyata, tak bisa dilewati)
```

Bab ini murni membaca dan memahami, bukan menulis fitur baru — tapi jangan salah, ini bukan bab "ringan" yang bisa dilewati sambil lalu. Sembilan koleksi/subkoleksi di `firestore.rules` masing-masing punya alasan sendiri kenapa aturannya ditulis persis seperti itu, dan alasan-alasan itulah yang sebenarnya jadi inti pembelajaran bab ini — bukan sintaksnya (yang cuma butuh sekali baca untuk dikuasai), melainkan **cara berpikir** di baliknya: setiap kali sebuah koleksi dibuat, pertanyaan "siapa boleh baca ini, siapa boleh tulis ini, dan apa yang mencegah penyalahgunaannya" harus dijawab lewat rules, bukan lewat harapan bahwa penggunanya akan berperilaku baik.

## 1. Kenapa `guardPage` (Bab 06) BUKAN keamanan

Di Bab 06 Anda sudah membaca peringatan ini sekilas. Sekarang kita perkuat, karena ini salah satu kesalahpahaman paling umum bagi pemula: **mengira kalau tombolnya disembunyikan, atau halamannya dilempar balik, maka datanya sudah aman.**

Tidak. Semua kode JavaScript yang Anda tulis — `js/roles.js`, `js/views/teacher.js`, `js/views/admin.js`, semuanya — dikirim **utuh** ke browser setiap pengunjung. Siapa pun yang membuka `guru.html` bisa menekan F12, membuka tab **Console**, dan mengetik apa saja yang terlintas di pikirannya. Tidak ada yang menghalangi seorang siswa iseng untuk:

1. Login sebagai siswa biasa (sah, pakai akunnya sendiri).
2. Buka `app.html`, tekan F12 → Console.
3. Ketik `await DB.gList('class_attendance')` — koleksi absensi milik guru, bukan miliknya.

`guardPage(['siswa'])` di `app.html` sama sekali tak mencegah baris ke-3. `guardPage` cuma dipanggil **sekali**, saat halaman pertama dimuat, untuk memutuskan "tampilkan dasbor siswa atau lempar ke `auth.html`?". Setelah itu, `DB`, `firebase-config.js`, dan seluruh SDK Firebase tetap hidup penuh di memori tab itu — dan `DB.gList` cuma memanggil Firestore langsung. Kalau Firestore sendiri tidak menolak permintaan itu, permintaan itu **akan berhasil**, terlepas dari apa kata `guardPage`.

Bayangkan dua dunia untuk baris ke-3 itu, untuk merasakan bedanya sungguhan:

- **Tanpa** rule `class_attendance` yang menolak siswa (atau seandainya Tumara tak punya `firestore.rules` sama sekali dan hanya mengandalkan Firestore dalam mode "test" yang mengizinkan semua orang) — perintah itu **berhasil**, mengembalikan array berisi seluruh rekaman absensi kelasnya, termasuk absensi mapel lain yang tak pernah dilihatnya di layar mana pun. Tak ada tombol yang perlu ditekan, tak ada trik rumit — cukup satu baris di Console.
- **Dengan** rule yang sudah Anda baca di Bagian 6 (`allow read: if isGuru() || isAdmin()`) — perintah yang **sama persis** itu langsung dilempar Firestore sebagai *rejected promise*, dan `await` di depannya melempar exception. Console menampilkan sesuatu seperti:
  ```
  Uncaught (in promise) FirebaseError: Missing or insufficient permissions.
  ```
  Siswa itu tetap login sah, tetap punya token Auth yang valid, tetap tahu persis nama koleksinya — tapi tak satu byte data absensi pun yang sampai ke browsernya. Itulah bedanya papan penunjuk arah dengan satpam sungguhan: keduanya "terlihat" berhenti dari sisi UI, tapi hanya satu yang benar-benar berhenti kalau seseorang mencoba melewatinya secara sengaja.

**Analogi sekolah:** `guardPage` adalah papan penunjuk arah di depan pintu ruang guru — "Guru lewat sini, Siswa lewat sana". Papan itu berguna, membuat semua orang tahu ke mana harus jalan tanpa bingung. Tapi papan itu tidak menghentikan siapa pun secara fisik. Siswa yang nekat tetap bisa mendorong pintu itu dan masuk. Yang benar-benar menghentikannya adalah **satpam yang berdiri di depan pintu dan memeriksa kartu identitas SEBELUM pintu dibuka** — dan satpam itulah `firestore.rules`. Bedanya lagi: papan penunjuk arah ada di gedung sekolah Anda (di browser siswa, bisa dicoret-coret); satpamnya berdiri di kantor pusat Google (server Firestore), jauh dari jangkauan siapa pun selain Anda sebagai pemilik proyek.

Ini sebabnya `js/firebase-config.js` — file yang berisi kunci API proyek Firebase Anda — **boleh** dibaca siapa saja lewat DevTools, dan itu bukan kebocoran keamanan. Kunci API Firebase bukan kata sandi rahasia; ia cuma memberi tahu "koneksi ini menuju proyek Firebase yang mana". Yang benar-benar menjaga data adalah rules di server, bukan menyembunyikan kunci itu.

## 2. Bahasa aturan Firestore secukupnya

`firestore.rules` ditulis dalam bahasanya sendiri, bukan JavaScript — mirip tapi tak sama. Bentuk dasarnya:

```
// firestore.rules — kerangka
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /nama_koleksi/{id} {
      allow read, write: if kondisi_boolean;
    }

  }
}
```

Bacanya: "untuk dokumen mana pun di koleksi `nama_koleksi`, dengan id apa pun (`{id}` menangkap id-nya, walau di sini kita tak selalu memakainya), izinkan baca dan tulis **kalau** `kondisi_boolean` bernilai `true`." Kalau kondisinya `false`, Firestore menolak permintaan dengan error `permission-denied` — tak peduli kode JavaScript apa yang memintanya.

Ada empat operasi sungguhan di balik kata `read` dan `write`:

- **`read`** = `get` (ambil satu dokumen tahu id-nya, mis. `DB.gGet('class_schedule', classId)`) **+** `list` (query banyak dokumen, mis. `DB.gListWhere('class_attendance', 'classId', id)`).
- **`write`** = `create` (dokumen baru) **+** `update` (dokumen ada, isinya berubah) **+** `delete` (dokumen dihapus).

Petakan ini ke fungsi `DB` yang sudah Anda kenal dari Bab 05, supaya istilahnya tak terasa asing: `DB.gAdd(...)` memicu `create`, `DB.gUpdate(...)` dan `DB.gSet(...)` sama-sama memicu `update` (ingat bedanya dari Bab 05: `gSet` menimpa penuh, `gUpdate` menggabung — tapi dari sudut pandang rules, keduanya sama-sama "dokumen ini sudah ada, isinya berubah"), dan `DB.gRemove(...)` memicu `delete`. Setiap kali Anda membaca kata `create`/`update`/`delete` di `firestore.rules` mulai sekarang, bayangkan pemanggilan `DB` yang sesuai — itu akan membuat rule-nya terasa jauh lebih konkret daripada sekadar istilah abstrak.

Anda bisa menulis `allow read, write: if ...` untuk mengizinkan keduanya dengan syarat sama, atau memecahnya granular — `allow read: if syaratA; allow create, update: if syaratB; allow delete: if syaratC;` — kalau syaratnya berbeda-beda per operasi. `firestore.rules` Tumara memakai kedua gaya itu tergantung kebutuhan koleksinya, seperti akan Anda lihat di Bagian 4 dan 6.

Dua variabel yang paling sering Anda pakai di dalam kondisi:

- **`request.auth`** — siapa yang sedang mencoba melakukan operasi ini. Kalau belum login sama sekali, nilainya `null`. Kalau sudah, `request.auth.uid` adalah id pengguna Firebase Authentication-nya — id yang **sama persis** dengan yang jadi nama dokumen di `users/{uid}` (ingat dari Bab 05: dokumen profil selalu dibuat dengan id = uid, bukan id acak).
- **`resource.data`** vs **`request.resource.data`** — ini pasangan yang paling sering membingungkan pemula, jadi perhatikan baik-baik: `resource.data` adalah isi dokumen **yang SUDAH ADA** di database (sebelum operasi ini terjadi). `request.resource.data` adalah isi dokumen **yang SEDANG DITULIS** (data baru yang dikirim klien). Untuk `create`, hanya `request.resource.data` yang masuk akal (belum ada dokumen lama). Untuk `update`, keduanya ada — Anda bisa membandingkan data lama vs data baru. Untuk `delete`, hanya `resource.data` yang masuk akal (tak ada data baru, dokumennya justru mau lenyap). Bagian 6 nanti punya contoh konkret perbedaan ini di koleksi `class_attendance`.

### Default: tanpa `match` yang cocok, otomatis tertolak

Satu sifat Firestore yang wajib Anda tanam dalam-dalam, karena arahnya berlawanan dengan asumsi wajar kebanyakan pemula: **Firestore menolak segalanya secara default.** Kalau tak ada satu pun blok `match` di `firestore.rules` yang cocok dengan path dokumen yang diminta, jawabannya otomatis `permission-denied` — bukan "diizinkan karena tak diatur". Ini kebalikan dari, misalnya, folder di komputer Anda yang biasanya bisa dibaca siapa saja kecuali sengaja dikunci.

Konsekuensinya konkret: coba bayangkan Anda menambah koleksi baru di kode aplikasi, katakanlah `js/views/teacher.js` memanggil `DB.gAdd('pengumuman', {...})`, tapi Anda **lupa** menambahkan blok `match /pengumuman/{id} { ... }` di `firestore.rules`. Kodenya akan tampak benar, lolos tes di mode lokal (Bab 05, tak pernah menyentuh rules sama sekali), tapi begitu dijalankan di Firebase sungguhan — **gagal total** dengan `permission-denied`, walau Anda merasa "kan saya belum menulis aturan yang melarang". Firestore tak peduli Anda belum melarang; yang dilihatnya hanya "apakah ada `allow` yang secara eksplisit mengizinkan ini", dan kalau tak ada blok `match` yang cocok sama sekali, jawabannya selalu tidak. Latihan 1 di akhir bab ini akan membuat Anda mengalami sisi sebaliknya: menulis blok `match` yang **memang** dibutuhkan.

## 3. Fungsi bantu berbasis `get()` — `isAdmin()` dan `isGuru()`

Hampir setiap match block di `firestore.rules` bertanya "apakah yang meminta ini admin?" atau "apakah dia guru?". Daripada menulis ulang logikanya di setiap tempat, file ini mendefinisikan dua fungsi di bagian paling atas:

```
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Admin = pengguna yang dokumen profilnya (users/{uid}) memiliki role 'admin'.
    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Guru = pengguna yang dokumen profilnya memiliki role 'guru'.
    function isGuru() {
      return request.auth != null
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'guru';
    }
```

Baca `isAdmin()` baris demi baris:

1. **`request.auth != null`** — dia harus login dulu. Kalau belum, langsung `false`, tak perlu cek lebih jauh (dan tak boleh: `request.auth.uid` akan error kalau `request.auth` itu sendiri `null`).
2. **`exists(/databases/$(database)/documents/users/$(request.auth.uid))`** — cek dulu apakah dokumen profilnya **ada** di koleksi `users`. `$(database)` dan `$(request.auth.uid)` di sini adalah cara menyisipkan nilai variabel ke dalam path, mirip template string di JavaScript. `exists()` hanya mengembalikan `true`/`false`, tidak mengambil isinya — lebih murah daripada `get()` kalau Anda cuma perlu tahu "ada atau tidak".
3. **`get(...).data.role == 'admin'`** — kalau memang ada, **ambil** dokumen itu (`get()`, bukan `exists()`), lalu baca field `role`-nya. Kalau isinya persis `'admin'`, fungsi ini `true`.

`isGuru()` persis sama, hanya membandingkan dengan `'guru'` di baris terakhir.

> ⚠️ **Jujur soal ini:** setiap pemanggilan `get()` di dalam rules adalah **satu pembacaan dokumen berbayar** — masuk kuota Firestore, persis seperti pembacaan dari kode JavaScript yang sudah Anda pelajari kuotanya di Bab 05 (cache baca). Setiap kali seorang guru memanggil `DB.gListWhere('class_attendance', 'classId', kelas)` untuk merekap absensi 30 siswa, rules Firestore diam-diam memanggil `get(users/{uid})` untuk mengecek `isGuru()` — **satu kali per dokumen yang dicoba dibaca dalam query itu**, bukan cuma sekali untuk keseluruhan query. Firestore juga membatasi jumlah pemanggilan `get()`/`exists()` yang boleh terjadi dalam **satu** evaluasi rule (dokumentasi resminya menyebut batas ini, dan ia bisa tersandung kalau Anda menumpuk banyak `get()` bersarang). Ini bukan cacat desain — ini **trade-off** yang disengaja: kesederhanaan (satu fungsi `isAdmin()` dipakai di mana-mana, tak perlu menyalin field `role` ke setiap dokumen lain) ditukar dengan sedikit biaya baca ekstra. Untuk skala satu sekolah, biaya itu jauh dari mengkhawatirkan; kalau nanti Tumara dipakai ribuan sekolah sekaligus, ini salah satu titik pertama yang perlu dipikirkan ulang (mis. memakai *custom claims* di token Auth, yang tak butuh `get()` sama sekali — di luar cakupan modul ini).

Supaya angkanya terasa nyata, bukan sekadar teori: bayangkan Bu Sari (wali kelas 7A, 32 siswa) membuka tab **Absensi**, memilih tanggal, lalu aplikasi memanggil `DB.gListWhere('class_attendance', 'classId', '7A')` untuk merekap absensi sebulan — katakanlah hasilnya 40 dokumen absensi (beberapa mapel × beberapa pertemuan). Firestore mengevaluasi rule `allow read: if isGuru() || isAdmin()` untuk **setiap** dari 40 dokumen itu, dan `isGuru()` sendiri berisi satu `exists()` **dan** satu `get()` ke `users/{uidSari}` — jadi satu permintaan `gListWhere` ini berpotensi memicu puluhan pembacaan tersembunyi ke koleksi `users`, di luar 40 pembacaan `class_attendance` itu sendiri. Ini persis kenapa Bab 05 begitu menekankan cache baca di sisi klien (`js/db.js`) — cache itu menghemat pembacaan berulang dari **kode aplikasi Anda**, tapi tak menyentuh sama sekali pembacaan tersembunyi yang terjadi **di dalam rules**, karena itu terjadi di server, bukan di browser. Dua lapis biaya baca yang berbeda, dua alasan berbeda untuk hemat-hemat kuota.

## 4. `users/{uid}` — aturan paling rumit, kita bedah detail

Koleksi `users` menyimpan profil setiap akun: siswa, guru, admin sekaligus, dibedakan lewat field `role`. Karena tiga peran berbeda butuh akses berbeda ke koleksi yang **sama**, rule-nya paling panjang di seluruh file.

### Baca

```
    match /users/{uid} {
      // Pemilik boleh baca dokumennya; admin boleh semua akun; guru boleh
      // membaca akun siswa (untuk memilih anggota kelas). Query guru harus
      // dibatasi where('role','==','siswa') agar lolos aturan ini.
      allow read: if request.auth != null
        && (request.auth.uid == uid || isAdmin() || (isGuru() && resource.data.role == 'siswa'));
```

Tiga jalan menuju `true`, digabung dengan `||` (atau):

1. **`request.auth.uid == uid`** — dia sedang membaca dokumennya **sendiri**. `{uid}` di sini adalah id dokumen yang sedang dicoba dibaca (ditangkap dari path), bukan id yang login.
2. **`isAdmin()`** — admin boleh membaca akun siapa pun, titik.
3. **`isGuru() && resource.data.role == 'siswa'`** — guru boleh membaca dokumen ini, **tapi hanya kalau** dokumen yang dicoba dibaca itu sendiri punya `role: 'siswa'`. Guru tidak boleh membaca profil guru lain, dan tidak boleh membaca profil admin.

Sekarang bagian yang sering bikin pemula bingung sekali menemuinya di lapangan: **rules Firestore tidak menyaring hasil query — ia hanya menerima atau menolak SELURUH query.** Kalau seorang guru menjalankan `DB.gList('users')` mentah-mentah (mengambil **semua** dokumen `users` tanpa filter), Firestore akan mencoba mengevaluasi rule `read` untuk **setiap** dokumen yang berpotensi masuk hasil — begitu dia menemukan satu dokumen dengan `role: 'admin'` di koleksi itu, permintaan **seluruhnya** ditolak, bukan cuma dokumen admin itu yang disembunyikan. Itulah kenapa komentar rule ini menegaskan: **query guru wajib menyertakan `where('role','==','siswa')`** — persis seperti yang dijelaskan cara pemanggilannya di Bab 10 (`DB.listStudents()` = `users where role=='siswa'`). Filter itu bukan sekadar "biar hasilnya rapi" — tanpanya, query guru akan gagal total dengan `permission-denied` begitu ada satu saja akun guru/admin lain di koleksi `users`.

Ini bukan teori kosong — kode aslinya persis mempraktikkan hal ini. `FirebaseAdapter.listStudents()` di `js/db.js` tak pernah mengambil koleksi `users` tanpa filter:

```js
// js/db.js — FirebaseAdapter.listStudents()
async listStudents() {
  const { F, db } = this.fb;
  const qy = F.query(F.collection(db, 'users'), F.where('role', '==', 'siswa'));
  const snap = await F.getDocs(qy);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
},
```

`F.where('role', '==', 'siswa')` di sinilah yang membuat query ini **selalu** cocok dengan rule `isGuru() && resource.data.role == 'siswa'` untuk setiap dokumen yang dikembalikan — tak ada satu pun dokumen guru/admin yang berpotensi ikut terjaring dan menggagalkan seluruh query. Kalau baris `F.where(...)` ini suatu hari dihapus "coba-coba" oleh siapa pun yang mengedit `js/db.js`, gejalanya **tidak langsung terlihat** di layar sebagai "fitur rusak" — ia justru muncul sebagai error `permission-denied` yang membingungkan, karena kesalahannya ada di query, bukan di rule-nya. Ini contoh nyata kenapa memahami rules penting bagi siapa pun yang menyentuh `js/db.js`, bukan hanya bagi yang menulis `firestore.rules`.

### Tulis

```
      // Menulis profil hanya oleh pemilik atau admin.
      allow create, update: if request.auth != null && (request.auth.uid == uid || isAdmin());
```

Lebih sederhana: pemilik boleh mengubah profilnya sendiri (mis. saat `OnboardView` menyimpan `kelasId` + `nis`, Bab 06), atau admin boleh mengubah profil siapa pun (mis. `adminCreateUser`, Bab 11). Tak ada jalan ketiga.

### Hapus

```
      // Akun admin tidak boleh dihapus siapa pun (termasuk admin lain / dirinya
      // sendiri). Akun non-admin hanya boleh dihapus oleh admin/pemilik.
      allow delete: if request.auth != null
        && (request.auth.uid == uid || isAdmin())
        && resource.data.role != 'admin';
```

Baca ini sebagai **DUA syarat yang harus sama-sama benar** (`&&`): syarat pertama sama seperti tulis (pemilik atau admin), **DAN** syarat kedua — `resource.data.role != 'admin'` — dokumen yang **sedang dihapus** itu sendiri bukan bertuliskan `role: 'admin'`. Perhatikan ini `resource.data`, bukan `request.resource.data`: untuk operasi hapus, tak ada dokumen baru, jadi yang relevan adalah data **lama** milik dokumen yang mau lenyap.

Konsekuensinya konkret dan tegas: **akun dengan `role: 'admin'` tidak bisa dihapus oleh siapa pun** — bukan oleh admin lain, bahkan bukan oleh dirinya sendiri. Ini bukan celah yang terlewat, melainkan **keputusan desain sengaja, sabotase-proof**: kalau admin boleh menghapus akun admin, seorang admin nakal (atau akun admin yang diretas) bisa menghapus semua admin lain satu per satu sampai sekolah kehilangan seluruh akses kelola. Dengan aturan ini, satu-satunya jalan menghapus akun admin adalah turun langsung ke Firebase Console dan menghapusnya manual dari sana — sengaja dibuat merepotkan, karena tindakan itu **seharusnya** jarang dan disengaja, bukan sekali klik.

Perhatikan juga bahwa keputusan ini **digandakan** di dua tempat, bukan hanya di rules. `FirebaseAdapter.adminDeleteUser` di `js/db.js` sudah menolaknya lebih dulu di sisi klien:

```js
// js/db.js — FirebaseAdapter.adminDeleteUser(id)
async adminDeleteUser(id) {
  const { F, db } = this.fb;
  const snap = await F.getDoc(F.doc(db, 'users', id));
  if (snap.exists() && (snap.data().role || 'siswa') === 'admin') {
    throw new Error(tr('Akun admin tidak bisa dihapus.', 'Admin accounts cannot be deleted.'));
  }
  await F.deleteDoc(F.doc(db, 'users', id));
},
```

Kenapa dicek **dua kali** — sekali di `js/db.js`, sekali lagi di rules? Bukan karena salah satu tak dipercaya. Cek di `js/db.js` ini murni demi **pengalaman pengguna**: kalau admin di panel `admin.html` (Bab 11) mengklik "Hapus" pada akun admin lain, pesan errornya bisa langsung manusiawi ("Akun admin tidak bisa dihapus.") dan tampil secepat mungkin, tanpa perlu menunggu bolak-balik ke server dulu untuk tahu itu ditolak. Tapi cek di `js/db.js` ini **sendirian tak cukup** — persis seperti `guardPage` di Bagian 1, ia bisa dilewati siapa pun yang memanggil Firestore langsung dari Console, melewati `adminDeleteUser` sama sekali. Rule di server itulah yang jadi **penentu akhir sungguhan**; cek di klien hanya mempercepat kabar buruknya sebelum sempat mampir ke server. Pola "cek di klien untuk UX cepat, cek lagi di server untuk keamanan sungguhan" ini akan terasa familiar — persis semangat yang sama dengan seluruh bab ini.

## 5. Subkoleksi pribadi `users/{uid}/{document=**}`

Ingat dari Bab 05 dan Bab 09: banyak fitur siswa (kesehatan, keuangan, ibadah, catatan) menyimpan datanya sebagai **subkoleksi** di bawah dokumen profilnya sendiri — `users/{uid}/health_daily/{id}`, `users/{uid}/notes/{id}`, dan seterusnya. Aturan dasarnya satu blok saja:

```
      // Seluruh subkoleksi data (health, tasks, classes, students, grades, dll.)
      // milik pemiliknya sendiri; admin juga boleh untuk keperluan pengelolaan.
      match /{document=**} {
        allow read, write: if request.auth != null && (request.auth.uid == uid || isAdmin());
      }
```

`{document=**}` adalah pola pencocokan "wildcard rekursif" — artinya berlaku untuk **subkoleksi apa saja, sedalam apa pun**, di bawah `users/{uid}`. Baik `users/{uid}/notes/{id}` maupun (kalau suatu saat ada) `users/{uid}/notes/{id}/lampiran/{id2}` sama-sama tercakup satu baris ini. Syaratnya persis seperti tulis di atas: pemilik atau admin, penuh (baca **dan** tulis).

Tapi lalu file melanjutkan dengan beberapa `match` **tambahan**, lebih spesifik:

```
      // Guru boleh MEMBACA subkoleksi ibadah siswa (ibadah_daily, quran_log, hafalan) untuk pemantauan.
      match /ibadah_daily/{id} {
        allow read: if isGuru();
      }
      match /quran_log/{id} {
        allow read: if isGuru();
      }
      match /hafalan/{id} {
        allow read: if isGuru();
      }

      // Guru boleh MEMBACA subkoleksi kesehatan siswa untuk pemantauan kesehatan di kelas.
      // Akses read-only; guru tidak boleh mengubah data kesehatan siswa.
      match /health_daily/{id} {
        allow read: if isGuru();
      }
      match /workouts/{id} {
        allow read: if isGuru();
      }
      match /biometrics/{id} {
        allow read: if isGuru();
      }
      match /weights/{id} {
        allow read: if isGuru();
      }
      match /meds/{id} {
        allow read: if isGuru();
      }
      match /foods/{id} {
        allow read: if isGuru();
      }
      match /menstrual/{id} {
        allow read: if isGuru();
      }
```

Ini pola yang layak Anda kenali namanya, karena akan muncul lagi: **"aturan umum dulu, lalu perketat atau perluas dengan match yang lebih spesifik."** `match /{document=**}` di atas sudah mencakup **semua** subkoleksi, termasuk `ibadah_daily` dan `health_daily`. Tapi Firestore punya kaidah: kalau ada beberapa blok `match` yang sama-sama cocok untuk satu path yang sedang diakses, **blok yang PATH-nya lebih spesifik yang menentukan** untuk operasi yang dijangkaunya — dalam kasus ini, blok `match /health_daily/{id}` menambahkan izin `read` bagi guru **di atas** izin yang sudah ada dari blok umum, tanpa mengurangi izin pemilik/admin yang sudah didapat dari blok `{document=**}` sebelumnya (izin di Firestore rules bersifat aditif — beberapa `allow` yang cocok untuk operasi yang sama digabung dengan OR, bukan saling menimpa).

Efeknya: siswa tetap pemilik penuh datanya sendiri (baca, tulis, hapus), admin tetap boleh semua, dan **guru mendapat tambahan hak baca-saja** — khusus untuk koleksi kesehatan dan ibadah yang memang dirancang untuk dipantau wali kelas (lihat fitur "Ibadah & Kesehatan Siswa" di portal guru, Bab 10). Guru **tidak** mendapat hak tulis di subkoleksi ini — kalau guru mencoba `DB.set('health_daily', ...)` ke akun siswa, permintaan itu ditolak, karena tak ada `write` yang diizinkan untuk guru di blok manapun yang cocok untuk path itu.

Kenapa **baca saja**, tak sekalian diberi hak tulis seperti pemilik/admin? Karena maksud fitur ini murni **pemantauan**: seorang wali kelas perlu tahu kalau ada siswanya yang berat badannya turun drastis, atau yang catatan sholatnya kosong berhari-hari, supaya bisa menyapa dan menindaklanjuti secara manusiawi — bukan supaya wali kelas bisa **mengubah** catatan berat badan atau mencentang sholat siswa atas nama siswa itu. Data kesehatan dan ibadah tetaplah pengalaman **pribadi** siswa: siswa sendiri yang mengisinya, siswa sendiri yang boleh mengedit atau menghapusnya. Membatasi guru ke `read` saja menjaga batas itu tetap jelas di level rules, bukan cuma "guru yang baik tak akan mengubahnya" — kalau suatu saat ada bug atau maksud jahat di kode guru, rules inilah yang tetap menahannya, persis alasan yang sama kenapa seluruh bab ini ada.

## 6. Koleksi global sekolah, satu per satu

Bagian sebelumnya semua berada di bawah `users/{uid}` — data milik satu orang. Sekarang koleksi-koleksi **top-level**, dibaca-tulis lintas peran, dari Bab 10 dan Bab 11.

### `school_classes` dan `school_roster`

```
    // Data induk sekolah (dikelola admin): daftar kelas & roster siswa
    // (nama + NIS). Dibaca semua pengguna terautentikasi (guru memilih kelas
    // yang diampu & melihat rosternya); hanya admin yang boleh menulis.
    match /school_classes/{id} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    match /school_roster/{id} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
```

Yang paling sederhana di seluruh file: siapa saja yang **sudah login** (peran apapun) boleh membaca daftar kelas dan rosternya — masuk akal, karena guru butuh melihat daftar kelas untuk memilih yang diampunya, dan siswa butuh melihat daftar kelas saat mengisi `OnboardView` (Bab 06). Hanya admin yang boleh menulis, karena data ini adalah **data induk sekolah** (Bab 11) — kalau sembarang orang bisa mengubahnya, kelas "7A" bisa berubah nama atau hilang tanpa sepengetahuan admin.

### `class_tasks`

```
    // Tugas kelas: dikirim guru (pengampu), diterima siswa. Dibaca semua
    // pengguna terautentikasi; ditulis guru (cakupan kelas dijaga di UI).
    match /class_tasks/{id} {
      allow read: if request.auth != null;
      allow write: if isGuru();
    }
```

Dibaca siapa saja yang login (siswa perlu melihat tugas yang ditujukan ke kelasnya), ditulis **guru mana saja** — perhatikan baik-baik, bukan "guru yang benar-benar mengampu kelas itu". Rule ini tidak mengecek apakah `classId` pada tugas yang ditulis memang kelas yang diampu guru tersebut.

> ⚠️ **Jujur soal ini:** pembatasan "guru hanya boleh mengirim tugas ke kelas yang benar-benar diampunya" **hanya ada di level UI** (`js/views/teacher.js` cuma menampilkan tombol "Kirim Tugas" untuk kelas yang sedang dibuka guru itu, dan mengisi `classId` otomatis dari situ) — **bukan** di rules. Secara teknis, seorang guru yang cukup paham bisa membuka Console dan memanggil `DB.gAdd('class_tasks', { classId: 'kelas-yang-bukan-miliknya', ... })`, dan rules akan mengizinkannya, karena syaratnya cuma `isGuru()`. Ini kompromi yang wajar untuk skala satu sekolah, bukan cacat fatal: semua guru di sekolah itu sudah **dipercaya** sekolahnya (mereka diberi akun oleh admin sendiri, lihat Bab 11), jadi risikonya bukan "orang asing merusak data", melainkan paling buruk "guru salah kelas mengirim tugas ke kelas yang salah" — kesalahan yang gampang terlihat dan diperbaiki, bukan kebocoran data yang serius. Kalau modul ini dikembangkan untuk sekolah yang lebih besar atau kurang saling percaya, rule ini adalah kandidat pertama yang layak diperketat (mis. mengecek `request.resource.data.classId` terhadap sebuah daftar kelas ampu yang tersimpan di profil guru).

### `class_schedule/{classId}`

```
    // Jadwal kelas: satu dokumen per kelas (id = classId). Dibaca semua
    // pengguna terautentikasi; HANYA wali kelas (guru dengan waliKelasId
    // sama dengan classId) yang boleh menulis.
    match /class_schedule/{classId} {
      allow read: if request.auth != null;
      allow write: if isGuru()
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.waliKelasId == classId;
    }
```

Dibaca semua yang login, tapi tulis jauh lebih ketat daripada `class_tasks`: guru itu harus punya `waliKelasId` pada profilnya, dan nilainya harus **persis sama** dengan `classId` — id kelas yang sedang ditulis jadwalnya, diambil langsung dari path dokumen (`{classId}` di `match /class_schedule/{classId}`).

Perhatikan sesuatu yang mungkin luput kalau Anda belum sadar: rule ini **bisa** ditulis satu baris pendek seperti ini justru karena satu keputusan desain di Bab 10 — `class_schedule` sengaja memakai `classId` **langsung** sebagai id dokumennya (bukan id acak seperti `_id()` yang biasa dipakai koleksi lain). Andai `class_schedule` memakai id acak, rule ini terpaksa menjadi dua langkah: `get()` dulu ke `class_schedule/{id}` itu sendiri untuk membaca field `classId`-nya, baru dibandingkan dengan `waliKelasId` guru — satu `get()` tambahan, satu pembacaan berbayar ekstra, untuk **setiap** percobaan tulis. Dengan `classId` sebagai id dokumen, path itu sendiri **sudah** memberi tahu kelas mana yang dimaksud, tanpa perlu membaca dokumennya sama sekali untuk tahu itu. Desain data yang dipilih dengan sengaja di Bab 10 membuat rule di Bab 12 jadi lebih murah dan lebih sederhana — dua bab yang terlihat tak berkaitan ternyata saling menopang.

**Runut satu cerita utuh**, supaya potongan-potongan di atas terasa nyambung: seorang guru bernama Bu Sari, yang di profilnya (`users/{uidSari}`) tersimpan `waliKelasId: '7A'`, membuka tab **Jadwal Kelas** di `guru.html` dan menekan "Simpan" setelah menambah satu baris jadwal. Di baliknya, kode memanggil `DB.gUpdate('class_schedule', '7A', { entries: [...] })` (lihat `js/views/teacher.js`, fungsi penyimpanan jadwal wali). Permintaan ini sampai ke Firestore sebagai: "update dokumen `class_schedule/7A`, oleh uid `uidSari`". Firestore mencari blok `match` yang cocok — ketemu `match /class_schedule/{classId}`, dengan `classId` otomatis terisi `'7A'` dari path. Lalu ia mengevaluasi `allow write`: `isGuru()` → `true` (perlu satu `get()` ke profil Bu Sari untuk cek `role`). Lanjut ke `get(.../users/$(request.auth.uid)).data.waliKelasId == classId` → ini **`get()` KEDUA** ke dokumen yang **sama persis** (Firestore tak secara otomatis mengingat hasil `get()` sebelumnya di dalam satu evaluasi rule, jadi dua pemanggilan `isGuru()` dan pengecekan `waliKelasId` di baris terpisah masing-masing membaca ulang) — hasilnya `'7A' == '7A'` → `true`. Kedua syarat `true`, ditulis dengan `&&` → keseluruhan `allow write` bernilai `true`, dan Firestore mengizinkan update-nya. Kalau Bu Sari mencoba hal yang sama ke `class_schedule/7B` (kelas yang bukan diwalikannya), langkah-langkahnya identik sampai baris terakhir — di sana `'7A' == '7B'` bernilai `false`, `&&`-nya jatuh, dan Firestore melempar `permission-denied` sebelum satu byte pun tersimpan.

### `class_attendance`

```
    // Absensi per-mapel (id = "{classId}_{tanggal}_{guruId}_{mapelSlug}_{pertemuan}").
    // Global agar wali kelas (juga seorang guru) bisa merekap absensi SEMUA guru
    // di kelasnya. Guru hanya boleh menulis/menghapus absensi atas namanya sendiri
    // (guruId dikunci ke uid). Siswa tidak boleh membaca absensi.
    match /class_attendance/{id} {
      allow read: if isGuru() || isAdmin();
      allow create, update: if isAdmin()
        || (isGuru() && request.resource.data.guruId == request.auth.uid);
      allow delete: if isAdmin()
        || (isGuru() && resource.data.guruId == request.auth.uid);
    }
```

Ini koleksi dengan rule paling ketat sekaligus paling instruktif soal perbedaan `resource` vs `request.resource` yang sudah disinggung di Bagian 2 — sekarang lihat konkretnya:

- **Baca**: hanya `isGuru()` atau `isAdmin()`. Fakta yang layak Anda catat, apapun pendapat Anda soal tepat-tidaknya: **siswa sama sekali tidak bisa membaca rekaman absensinya sendiri** lewat query langsung ke `class_attendance` — bukan karena UI-nya tak menampilkan, tapi karena rule ini menolaknya di server sebelum data sempat sampai ke klien. Ini konsisten dengan model absensi di Bab 10: absensi dirancang sebagai alat kerja guru/wali kelas, bukan sebagai fitur yang ditujukan untuk dilihat siswa. Apakah ini keputusan yang tepat atau sebaiknya direvisi (mis. menambah rule agar siswa boleh membaca entri yang menyebut dirinya) adalah pertanyaan desain produk yang sah — modul ini tak memutuskannya untuk Anda, hanya menunjukkan bahwa itu keputusan yang **ada**, bukan kelalaian.
- **Tulis (create/update)**: `request.resource.data.guruId == request.auth.uid` — perhatikan ini `request.resource`, **data BARU** yang sedang guru kirim. Artinya: field `guruId` di dalam dokumen yang **sedang ditulis** harus sama dengan uid yang sedang login. Kalau seorang guru mencoba mengirim `{ guruId: 'uid-guru-lain', ... }`, tulisan ditolak — dia hanya boleh mengatasnamakan dirinya sendiri saat membuat/mengubah absensi, bukan "menulis atas nama" guru lain.
- **Hapus**: `resource.data.guruId == request.auth.uid` — kali ini `resource`, **data LAMA** milik dokumen yang mau dihapus (wajar; operasi delete tak punya data baru untuk dilihat). Guru hanya boleh menghapus absensi yang `guruId`-nya memang dirinya — dia tak bisa menghapus rekaman absensi yang ditulis guru mapel lain di kelas yang sama, walau sama-sama guru di kelas itu.

Admin, seperti biasa, lolos semua syarat tambahan itu — `isAdmin() || (...)` selalu menang lewat cabang pertama.

### `class_submissions`

```
    // Pengumpulan tugas siswa (id = "{taskId}_{studentId}"). Yang disimpan di
    // sini hanya METADATA + URL file; file-nya (foto/PDF) ada di Supabase.
    // Guru boleh membaca semua (memantau kelasnya); siswa hanya miliknya.
    // Siswa hanya boleh menulis/menimpa pengumpulan atas namanya sendiri.
    match /class_submissions/{id} {
      allow read: if isGuru()
        || (request.auth != null && resource.data.studentId == request.auth.uid);
      allow create, update: if request.auth != null
        && request.resource.data.studentId == request.auth.uid;
      allow delete: if isGuru()
        || (request.auth != null && resource.data.studentId == request.auth.uid);
    }
```

Pola yang sama dengan `class_attendance`, hanya perannya ditukar: yang **mengunci** dirinya sendiri di sini adalah **siswa**, lewat field `studentId` — `request.resource.data.studentId == request.auth.uid` untuk create/update memastikan seorang siswa hanya bisa mengumpulkan tugas **atas nama dirinya sendiri**, tak bisa mengumpulkan pura-pura menjadi siswa lain (mis. mengunggah jawaban ke `studentId` teman sekelasnya). Guru boleh membaca dan menghapus semua submission (memantau + membersihkan kelasnya), siswa hanya boleh membaca/menghapus miliknya sendiri (`resource.data.studentId == request.auth.uid`, data lama, karena keduanya operasi yang melihat dokumen yang sudah ada).

### Pola yang berulang: mengunci sebuah field ke `request.auth.uid`

Kalau Anda menengok kembali ke belakang, satu pola yang sama muncul **tiga kali** di koleksi global, hanya nama field dan perannya yang beda:

- `class_schedule` — wali kelas dikunci lewat kecocokan `waliKelasId == classId` (dibaca dari profil guru via `get()`, dibandingkan dengan id kelas di path).
- `class_attendance` — guru dikunci lewat `request.resource.data.guruId == request.auth.uid` (dibaca dari dokumen yang sedang ditulis).
- `class_submissions` — siswa dikunci lewat `request.resource.data.studentId == request.auth.uid` (dibaca dari dokumen yang sedang ditulis).

Ini **satu pola desain yang sama**, dipakai berulang: setiap kali sebuah koleksi butuh "siapa pun boleh menulis, TAPI hanya atas nama dirinya sendiri", rule-nya membandingkan sebuah field identitas di dalam dokumen (`guruId`, `studentId`, atau field serupa di profil seperti `waliKelasId`) dengan `request.auth.uid` — uid yang sedang login, yang **tak bisa dipalsukan** dari sisi klien (ia datang dari token Firebase Authentication yang ditandatangani server, bukan dari apa pun yang dikirim klien). Kalau nanti Anda menambah koleksi baru dengan kebutuhan serupa (mis. sebuah `class_journal` yang hanya boleh ditulis guru penulisnya sendiri), Anda tak perlu menciptakan pola baru — tinggal pakai pola yang sama: pastikan kode aplikasi selalu mengisi field identitas itu dengan `DB.user.id` sebelum menulis, lalu tulis rule yang membandingkannya dengan `request.auth.uid`.

## 7. Men-deploy rules

Menulis `firestore.rules` yang benar di editor tidak berarti apa-apa sampai Anda **men-deploy**-nya — mengirimkannya ke server Firebase supaya mulai berlaku. Selama file itu masih di komputer Anda, Firestore tetap memakai rules **versi sebelumnya** yang sudah live di sana.

```bash
firebase deploy --only firestore
```

Perintah ini mengirim **rules DAN index sekaligus** — `firebase.json` (lihat Bab 04) sudah memetakan keduanya di bawah kunci `"firestore"`:

```json
// firebase.json (bagian firestore)
"firestore": {
  "rules": "firestore.rules",
  "indexes": "firestore.indexes.json"
}
```

`firestore.indexes.json` sendiri kecil, satu index komposit:

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

Index ini bukan soal keamanan — ia soal **kecepatan**. Query "semua siswa di kelas X" (`users where role=='siswa' && kelasId=='7A'`, yang membentuk roster otomatis di portal guru, Bab 10) menyaring **dua** field sekaligus. Firestore mewajibkan index komposit untuk query yang menyaring lebih dari satu field seperti ini — tanpanya, query itu akan gagal dengan error yang justru menyertakan **tautan langsung** untuk membuat index yang dibutuhkan (mudah diperbaiki begitu Anda tahu error itu bukan bug, tapi permintaan resmi Firestore).

> ⚠️ **PENTING, supaya tak bingung nanti di Bab 14:** `firebase deploy --only firestore` **hanya** mengirim rules dan index — ia **TIDAK** mengirim hosting sama sekali. Kalau Anda baru saja mengubah tampilan atau logika di `js/views/teacher.js`, `admin.html`, atau file HTML/CSS/JS apa pun, perintah di atas **tidak** akan mempublikasikan perubahan itu — pengunjung situs Anda tetap melihat versi lama. Sebaliknya, kalau Anda hanya mengubah `firestore.rules` (mis. menambah satu koleksi baru seperti latihan di bab ini), Anda **tidak perlu** `firebase deploy` penuh — cukup `--only firestore`, lebih cepat dan tak memicu proses `predeploy` (penulisan ulang `version.json`, lihat Bab 14) yang sebenarnya hanya relevan untuk perubahan hosting. Kalau Anda mengubah **keduanya** sekaligus (kode aplikasi **dan** rules) dalam satu sesi kerja, perintah paling aman adalah deploy penuh tanpa `--only` apa pun:
>
> ```bash
> firebase deploy
> ```
>
> Ini mengirim hosting + rules + index sekaligus, tak ada yang tertinggal.
>
> Satu jebakan penamaan lagi yang layak diwaspadai: `--only firestore` (yang dipakai sepanjang bab ini) berbeda dari `--only firestore:rules`. Yang kedua **hanya** mengirim rules, **tanpa** index — kalau Anda baru menambah query baru yang butuh index komposit (Bagian 7 di atas) tapi mengetik `firestore:rules` saja, rule-nya sudah aktif tapi index-nya belum, dan query itu tetap gagal sampai Anda menyusulkan `firebase deploy --only firestore:indexes` secara terpisah. Repo Tumara sendiri menyimpan jebakan ini sebagai pengingat: `deploy-rules.sh` di root proyek — skrip lama yang **hanya mencetak instruksi** (tak benar-benar menjalankan apa pun) — secara eksplisit menyarankan `firebase deploy --only firestore:rules` untuk rules saja, atau `firebase deploy` polos untuk semuanya. Kalau ragu koleksi mana yang berubah (rules saja? index juga? atau hosting juga?), cara paling aman selalu `--only firestore` (rules **+** index bersamaan, seperti dijelaskan di atas) atau `firebase deploy` (semuanya) — jangan pernah `:rules` sendirian kecuali Anda yakin betul tak ada perubahan index yang menyertainya.

## 8. Cara menguji rules sebelum percaya

Menulis rule yang **terlihat** benar tidak sama dengan rule yang **benar-benar** menolak/mengizinkan seperti yang Anda maksud. Ada dua cara memastikannya, dari yang paling formal ke yang paling praktis.

**Rules Playground di Firebase Console.** Buka Firebase Console → Firestore Database → tab **Rules** → tombol **Rules Playground** (atau ikon simulator di dekatnya). Langkahnya secara konkret:

1. Pilih jenis operasi (mis. **get** untuk baca satu dokumen, **list** untuk query, **create**/**update**/**delete** untuk tulis).
2. Isi path dokumennya, mis. `/databases/(default)/documents/class_attendance/idsembarang`.
3. Centang **"Simulate authenticated user"**, isi kolom **Firebase Authentication UID** dengan uid siswa/guru yang mau Anda uji (bisa disalin dari tab **Authentication** di Console).
4. Kalau operasinya `create`/`update`, ada kolom tambahan untuk mengetik isi dokumen yang "dikirim" — inilah yang menjadi `request.resource.data` saat simulasi dievaluasi.
5. Tekan **Run** — hasilnya langsung tampil **Allow** (hijau) atau **Deny** (merah), lengkap dengan baris rule mana yang jadi penentu keputusan itu.

Kelebihan Playground dibanding uji manual di Bagian selanjutnya: Anda **tak perlu** benar-benar login sebagai peran itu, dan tak ada risiko benar-benar mengubah data sungguhan saat mencoba-coba skenario `delete`. Kekurangannya: Anda harus mengetik ulang path dan UID setiap kali, jadi untuk pengecekan cepat sehari-hari, uji manual lewat Console DevTools aplikasi (di bawah ini) biasanya lebih praktis.

**Uji manual dari peran yang salah — cara paling praktis sehari-hari.** Login ke aplikasi sungguhan sebagai peran yang **seharusnya ditolak**, buka DevTools → Console, lalu coba panggil fungsi yang seharusnya tak boleh dia pakai:

```js
// Login sebagai SISWA, lalu di Console:
await DB.gList('class_attendance');
```

Kalau rules Anda benar, ini **harus** melempar error — biasanya muncul sebagai `FirebaseError: Missing or insufficient permissions.` Kalau baris ini justru **berhasil** dan mengembalikan data, berarti ada yang salah pada rule `class_attendance` (atau rule belum ter-deploy — cek lagi Bagian 7). Uji yang sama bisa Anda ulang untuk kombinasi lain: guru mencoba menulis `class_schedule` milik kelas yang **bukan** diwalikannya (harus gagal), siswa mencoba `DB.gSet('school_classes', 'x', {...})` (harus gagal, hanya admin yang boleh menulis di sana).

Uji dari sisi yang **seharusnya boleh** juga penting, tapi lebih mudah luput dari perhatian pemula: kalau Anda terlalu ketat menulis rule, fitur yang seharusnya jalan malah ikut tertolak, dan itu biasanya baru ketahuan saat pengguna sungguhan mengeluh, bukan saat Anda menguji coba sendiri sebagai admin (yang selalu lolos hampir semua rule).

Supaya tak menebak-nebak sendiri kombinasi mana yang perlu dicoba, berikut daftar uji manual yang layak Anda jalankan setidaknya sekali sebelum mempercayai rules Anda sudah benar — semua lewat Console DevTools, persis seperti contoh di atas:

| Login sebagai | Perintah di Console | Hasil yang benar |
|---|---|---|
| Siswa | `await DB.gList('class_attendance')` | Ditolak (siswa tak boleh baca absensi) |
| Siswa | `await DB.gSet('school_classes', 'x', { nama: 'coba' })` | Ditolak (hanya admin yang boleh menulis) |
| Siswa | `await DB.gSet('class_submissions', 'idnya-sendiri', { studentId: DB.user.id, ... })` | Berhasil (siswa mengumpulkan tugas atas nama dirinya) |
| Siswa | `await DB.gSet('class_submissions', 'id-lain', { studentId: 'uid-teman', ... })` | Ditolak (`studentId` bukan dirinya sendiri) |
| Guru (bukan wali "7A") | `await DB.gUpdate('class_schedule', '7A', { entries: [] })` | Ditolak (bukan wali kelas itu) |
| Guru (memang wali "7A") | `await DB.gUpdate('class_schedule', '7A', { entries: [] })` | Berhasil |
| Guru | `await DB.gList('users')` (tanpa filter apa pun) | Ditolak begitu ada dokumen non-siswa di hasilnya (lihat Bagian 4) |
| Guru | `await DB.gListWhere('users', 'role', 'siswa')` | Berhasil |

Kalau salah satu baris di kolom tengah menghasilkan yang **berlawanan** dengan kolom kanan, jangan buru-buru menyalahkan kode aplikasi — kembali dulu ke `firestore.rules`, cari blok `match` koleksi yang bersangkutan, dan telusuri kondisinya persis seperti cara Anda menelusuri cerita Bu Sari di Bagian 6.

## 9. Ringkasan tabel per-koleksi

| Koleksi | Baca | Tulis |
|---|---|---|
| `users/{uid}` | Pemilik, admin, atau guru (khusus dokumen `role:'siswa'`) | Create/update: pemilik atau admin. Delete: pemilik/admin **DAN** bukan `role:'admin'` |
| `users/{uid}/{document=**}` (default) | Pemilik atau admin | Pemilik atau admin |
| `.../ibadah_daily`, `.../health_daily`, dst. (tambahan) | + guru (baca saja) | — (tak berubah dari default) |
| `school_classes`, `school_roster` | Siapa saja yang login | Admin saja |
| `class_tasks` | Siapa saja yang login | Guru mana saja (cakupan kelas: UI saja, bukan rule) |
| `class_schedule/{classId}` | Siapa saja yang login | Hanya guru dengan `waliKelasId == classId` |
| `class_attendance` | Guru atau admin (siswa **tidak** bisa) | Create/update: admin, atau guru dengan `guruId` = dirinya. Delete: sama, dari data lama |
| `class_submissions` | Guru (semua), atau siswa (miliknya sendiri) | Create/update: siswa, `studentId` = dirinya. Delete: guru atau siswa pemilik |

Simpan tabel ini sebagai referensi cepat — begitu Anda menambah fitur baru di Tumara yang butuh koleksi Firestore baru, tabel inilah bentuk ringkas yang layak Anda tiru untuk mendokumentasikan rule koleksi barunya, sebelum menuliskan blok `match` sungguhan di `firestore.rules`.

## ✅ Cek hasil

- [ ] Buka Firebase Console → Firestore Database → tab **Rules**. Isinya harus persis sama dengan `firestore.rules` di repo Anda (kalau beda, berarti belum ter-deploy).
- [ ] Login sebagai **siswa**, buka Console DevTools, jalankan `await DB.gList('class_attendance')`. Harus muncul error `permission-denied` / `Missing or insufficient permissions`.
- [ ] Login sebagai **guru A** yang **bukan** wali kelas "7A", coba `await DB.gUpdate('class_schedule', '7A', { entries: [] })` lewat Console. Harus ditolak.
- [ ] Login sebagai **guru yang memang wali kelas** "7A" (`waliKelasId === '7A'`), lakukan hal yang sama. Harus berhasil.
- [ ] Jalankan `firebase deploy --only firestore` dari terminal. Harus selesai tanpa error syntax, dan Console CLI menyebut rules ter-compile berhasil.
- [ ] Coba Rules Playground di Firebase Console: simulasikan `get` pada `class_attendance/{id}` sebagai pengguna dengan `role: 'siswa'` — hasilnya harus **Deny**.
- [ ] Login sebagai **admin**, coba `await DB.adminDeleteUser('<uid-akun-admin-lain>')` (atau lewat UI panel admin, Bab 11) — harus tetap ditolak, walau yang mencoba admin sekalipun (Bagian 4).
- [ ] Buka `firestore.indexes.json` di repo dan bandingkan dengan Firebase Console → Firestore Database → tab **Indexes**: satu index komposit `users(role, kelasId)` harus berstatus **Enabled**, bukan **Building** atau tak ada sama sekali.

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| `Missing or insufficient permissions` padahal seharusnya boleh | Dokumen yang baru dibuat belum punya field yang dicek rule (mis. `class_attendance` ditulis tanpa `guruId`, padahal rule `create` mensyaratkan `request.resource.data.guruId == request.auth.uid`) | Cek objek yang dikirim ke `DB.gSet`/`DB.gAdd` — pastikan field kunci (`guruId`, `studentId`, `waliKelasId` terkait) selalu diisi sebelum dikirim. |
| Deploy rules gagal dengan error compile | Kurung kurawal `{ }` tak seimbang, atau titik koma lupa, atau lupa comma di `firestore.indexes.json` | Baca pesan error CLI — biasanya menyebut nomor baris persis. Hitung ulang pasangan `{ }` dari atas file. |
| Fitur jalan mulus di mode lokal (`USE_FIREBASE=false`, Bab 05), tapi gagal begitu pindah ke Firebase sungguhan | Mode lokal memakai `localStorage` — **tak pernah** melewati `firestore.rules` sama sekali, jadi bug rule tak mungkin ketahuan di sana | Selalu uji ulang fitur baru di Firebase sungguhan (atau emulator) sebelum menganggapnya selesai — mode lokal hanya untuk pengembangan cepat tanpa internet. |
| Guru tak bisa membaca daftar siswa (`users where role=='siswa'`), padahal seharusnya boleh | Query dijalankan tanpa `where('role','==','siswa')` — kena tolak total karena ada dokumen non-siswa yang berpotensi ikut terbaca (lihat Bagian 4) | Pastikan setiap pemanggilan yang menyasar akun siswa selalu menyertakan filter itu — jangan pernah `DB.gList('users')` mentah dari sisi guru. |
| Index dibutuhkan, error menyebut "The query requires an index" | Query menyaring lebih dari satu field (mis. `role` + `kelasId`) dan index komposit belum ada/belum ter-deploy | Klik tautan yang disertakan error itu (langsung membuat index di Console), atau pastikan `firestore.indexes.json` sudah benar lalu `firebase deploy --only firestore`. |
| Rules ter-deploy tapi perubahan tampilan/JS tak muncul di situs | Memakai `--only firestore` padahal yang berubah adalah kode aplikasi, bukan rules/index | Untuk perubahan kode aplikasi, deploy penuh: `firebase deploy` (lihat Bagian 7). |
| Rule baru sudah ter-deploy tapi query lama masih gagal dengan "requires an index" | Memakai `--only firestore:rules` (lihat `deploy-rules.sh` di root repo) — mengirim rules saja, index tertinggal | Deploy `firestore:indexes` juga (`firebase deploy --only firestore:indexes`), atau langsung pakai `firebase deploy --only firestore` yang mengirim keduanya. |
| Admin sendiri tak bisa menghapus akun admin lain, terasa seperti bug | Rule `delete` di `users/{uid}` sengaja menolak kalau `resource.data.role == 'admin'` (Bagian 4) | Bukan bug — keputusan sabotase-proof yang disengaja. Kalau memang perlu dihapus, lakukan manual lewat Firebase Console → Authentication + Firestore, bukan lewat aplikasi. |

## 🧪 Latihan

1. Tulis rule untuk koleksi baru hipotetis `pengumuman` (pengumuman sekolah): dibaca semua pengguna yang login, ditulis hanya guru dan admin. Tuliskan blok `match`-nya lengkap, mengikuti gaya file ini — lalu, sebagai pengujian, jelaskan apa yang **seharusnya** terjadi kalau Anda lupa menambahkan blok ini sama sekali dan seorang admin mencoba `DB.gAdd('pengumuman', {...})` (petunjuk: kembali ke bagian "default: tanpa `match` yang cocok, otomatis tertolak" di Bagian 2).
2. Ambil rule `class_submissions` di Bagian 6, lalu jelaskan dengan kata Anda sendiri: kenapa `allow delete` memberi hak ke **guru** dan **siswa pemilik**, sedangkan `allow create, update` hanya memberi hak ke **siswa** (guru tak disebut sama sekali)? Apa yang akan rusak kalau guru juga diberi hak `create`/`update` di sana?
3. ⭐ Tanpa membuka kembali Bagian 6, jelaskan ke rekan sejawat kenapa rule `class_tasks` memberi hak tulis ke **"guru mana saja"**, bukan **"guru yang benar-benar mengampu kelas itu"** seperti `class_schedule`. Sebutkan secara jujur risiko konkret dari pilihan itu, dan kenapa risiko itu dianggap bisa diterima untuk skala satu sekolah — lalu bandingkan dengan kenapa `class_schedule` memilih diperketat sementara `class_tasks` tidak.

## 📌 Ringkasan

- `guardPage` (Bab 06) hanya UX — bisa dilewati siapa pun yang membuka DevTools. Keamanan sungguhan Tumara ada **seluruhnya** di `firestore.rules`, dievaluasi di server Firebase, tak bisa dibohongi dari sisi klien.
- `request.auth`/`request.auth.uid` = siapa yang meminta. `resource.data` = data **lama** yang sudah ada. `request.resource.data` = data **baru** yang sedang dikirim — beda ini krusial untuk validasi `create`/`update` (lihat `class_attendance`, `class_submissions`).
- `isAdmin()`/`isGuru()` memakai `get()` untuk membaca `role` dari `users/{uid}` milik peminta sendiri — satu pembacaan berbayar per pemanggilan, trade-off sengaja demi kesederhanaan.
- Rules Firestore menolak/mengizinkan **seluruh** query, tak bisa menyaring sebagian hasil — karena itu query guru ke `users` wajib disertai `where('role','==','siswa')`.
- Tanpa `match` yang cocok, Firestore **menolak secara default** — tak ada koleksi yang "otomatis terbuka" hanya karena Anda lupa menulis aturannya.
- Pola berulang untuk "siapa saja boleh menulis, tapi hanya atas nama dirinya sendiri": bandingkan sebuah field identitas di dokumen (`guruId`, `studentId`) atau di profil (`waliKelasId`) dengan `request.auth.uid` — dipakai persis sama di `class_schedule`, `class_attendance`, dan `class_submissions`.
- Beberapa keputusan sengaja tak sempurna secara teori demi kesederhanaan skala-sekolah: `class_tasks` percaya semua guru (cakupan kelas hanya dijaga UI); siswa sama sekali tak bisa membaca `class_attendance`-nya sendiri lewat query langsung. Keduanya fakta yang layak diketahui, bukan disembunyikan.
- `firebase deploy --only firestore` mengirim rules **dan** index sekaligus, tapi **tidak** mengirim hosting (HTML/JS/CSS); `--only firestore:rules` sendirian malah tak mengirim index. `firebase deploy` biasa (tanpa `--only`) mencakup semuanya sekaligus — paling aman kalau ragu.
- Uji rules sebelum percaya: Rules Playground di Console, atau cara paling praktis — login sebagai peran yang salah lalu coba panggil `DB.gList(...)` lewat Console DevTools, harus dilempar `permission-denied`.

**Berikutnya:** [Bab 13 — Menjadikan PWA](13-menjadikan-pwa.md)
