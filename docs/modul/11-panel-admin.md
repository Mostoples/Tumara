# Bab 11 — Panel Admin

> **Tujuan bab ini:** Anda bisa membangun `admin.html` + `js/views/admin.js` — panel tempat admin sekolah membuat akun guru dan siswa **tanpa ter-logout dari sesinya sendiri**, mengelola daftar kelas, dan mengimpor puluhan siswa sekaligus dari tempelan Excel/Sheets.

| | |
|---|---|
| **Perkiraan waktu** | ~100 menit |
| **Sebelum ini** | [Bab 10 — Portal Guru](10-portal-guru.md) |
| **Anda butuh** | `guardPage` dari `js/roles.js` (Bab 06), `DB.adminCreateUser` yang sudah disinggung sekilas di Bab 05, fungsi `usernameOf`/`toAuthEmail`/`toAuthPassword` dari `js/utils.js` (Bab 06), dan pola `openModal`/`closeModal` (Bab 02) |

## Apa yang kita bangun di bab ini

`admin.html` adalah halaman ketiga dan terakhir dari trio "rumah per peran" (setelah `app.html` untuk siswa di Bab 07 dan `guru.html` untuk guru di Bab 10). Isinya dua tampilan yang bisa ditukar dengan tab: **Akun** (daftar semua guru/admin/siswa, dengan tombol buat/ubah/hapus) dan **Kelas & Siswa** (data induk sekolah — daftar kelas, dan siswa di dalamnya).

Bab ini punya satu masalah inti yang jadi jantung ceritanya: bagaimana admin bisa membuatkan akun untuk **orang lain**, padahal Firebase Auth punya kebiasaan buruk — begitu akun baru dibuat, ia langsung login sebagai akun itu, mencampakkan sesi admin yang sedang berjalan. Anda akan melihat solusinya yang cukup kreatif: sebuah aplikasi Firebase kedua yang hidup sebentar, dipakai, lalu dibuang.

Gambaran alurnya:

```
Admin klik "Buat Akun Siswa"
        │
        ▼
adminCreateUser({ nama, username, password: nis, role: 'siswa', extra:{...} })
        │
        ▼
  buka APLIKASI FIREBASE KEDUA (sesi terpisah dari admin)
        │
        ▼
  createUserWithEmailAndPassword  →  akun baru login DI SESI KEDUA (bukan sesi admin)
        │
        ▼
  akun baru itu MENULIS PROFILNYA SENDIRI (lolos Security Rules)
        │
        ▼
  signOut sesi kedua  →  deleteApp sesi kedua (di latar belakang)
        │
        ▼
  admin TETAP LOGIN seperti semula, tampilkan kredensial sekali via modal
```

## 1. Peran admin & kenapa dipisah lagi

Ingat pola dari Bab 02, Bab 06, dan Bab 10: Tumara tidak punya satu halaman raksasa dengan menu tersembunyi per peran. Setiap peran punya **halaman fisiknya sendiri**. `admin.html` adalah rumah peran admin, dijaga persis seperti `guru.html`:

```html
<!-- admin.html -->
<script>
  document.addEventListener('DOMContentLoaded', async () => {
    const u = await guardPage(['admin']);
    if (!u) return;
    document.getElementById('portalShell').classList.remove('hidden');
    document.getElementById('adminEmail').textContent = u.email || '';
    // ...tema, tombol ganti sandi, tombol keluar...
    AdminView.render(document.getElementById('view'));
  });
</script>
```

`guardPage(['admin'])` — fungsi yang sama persis yang Anda bangun di Bab 06 — memastikan hanya akun beperan `'admin'` yang bisa duduk di halaman ini. Siswa atau guru yang nekat mengetik `admin.html` di address bar langsung dilempar `location.replace` ke rumah perannya sendiri, sebelum sekejap pun melihat isinya. Urutan `<script>` di `admin.html` juga sama disiplinnya dengan halaman lain:

```html
<script src="js/firebase-config.js"></script>
<script src="js/i18n.js"></script>
<script src="js/utils.js"></script>
<script src="js/db.js"></script>
<script src="js/roles.js"></script>
<script src="js/views/admin.js"></script>
```

Di dalam `AdminView`, dua tampilan utamanya adalah **Akun** (`view: 'accounts'`) dan **Kelas & Siswa** (`view: 'classes'`), dipilih lewat sepasang tombol tab:

```js
// js/views/admin.js — AdminView._switcher()
_switcher() {
  return `<div class="tabs" style="margin-bottom:18px;">
    <button class="tab ${this.view === 'accounts' ? 'active' : ''}" data-view="accounts">
      <ion-icon name="people-outline"></ion-icon>${tr('Akun', 'Accounts')}</button>
    <button class="tab ${this.view === 'classes' ? 'active' : ''}" data-view="classes">
      <ion-icon name="school-outline"></ion-icon>${tr('Kelas & Siswa', 'Classes & Students')}</button>
  </div>`;
},
```

Persis seperti `teacher.tab` yang Anda kenal dari Bab 10, posisi tab ini disimpan ke `localStorage` supaya admin yang refresh halaman (atau menutup dan membuka lagi besoknya) kembali ke tab yang sama, bukan selalu dilempar ke "Akun":

```js
// js/views/admin.js — AdminView.render()
_NAV_KEY: 'tumara_admin_nav',   // simpan view + kelas terpilih agar tahan refresh

async render(el) {
  this._el = el;
  // Pulihkan posisi (view + kelas terpilih) dari localStorage saat muat awal/refresh.
  if (!this._booted) {
    this._booted = true;
    try {
      const d = JSON.parse(localStorage.getItem(this._NAV_KEY) || 'null');
      if (d) { if (d.view === 'classes' || d.view === 'accounts') this.view = d.view; this.activeClassId = d.cls || null; }
    } catch (_) { /* abaikan */ }
  }
  localStorage.setItem(this._NAV_KEY, JSON.stringify({ view: this.view, cls: this.activeClassId || '' }));
  if (this.view === 'classes') return this.renderClasses(el);
  return this.renderAccounts(el);
},
```

Perhatikan `this._booted` — pemulihan dari `localStorage` hanya dilakukan **sekali**, saat halaman pertama kali dimuat. Sesudah itu, `this.view` dan `this.activeClassId` adalah sumber kebenaran yang hidup di memori; setiap kali admin berpindah tab atau memilih kelas, nilai barunya ditulis ulang ke `localStorage` di baris berikutnya. Ini kelas kelas yang **sedang dibuka** ikut disimpan (`cls`), bukan cuma tab-nya — supaya admin yang sedang menambah 20 siswa ke kelas X TKJ 1, lalu tak sengaja menekan F5, tidak perlu mengklik kartu kelasnya lagi dari awal.

## 2. Masalah inti: admin membuat akun orang lain, tapi jangan sampai ter-logout

Sekarang ke bagian yang paling menarik di bab ini. Bayangkan Anda menulis kode paling naif yang terpikirkan untuk tombol "Buat Akun":

```js
// JANGAN DITIRU — kode ilustrasi masalah, bukan kode Tumara
await createUserWithEmailAndPassword(auth, emailSiswaBaru, nisSiswaBaru);
```

Kode ini akan **berhasil** membuat akun barunya. Tapi ada efek samping yang tersembunyi dan berbahaya: Firebase Authentication punya kebiasaan bawaan — begitu `createUserWithEmailAndPassword` sukses, SDK-nya **otomatis login sebagai akun yang baru saja dibuat**. Sesi admin yang tadinya sedang aktif di `auth` (objek koneksi yang sama, dipakai bersama seluruh halaman) langsung **ditimpa** oleh sesi siswa baru itu.

Praktiknya: admin sedang asyik mengetik nama dan NIS 20 siswa berturut-turut lewat impor massal (Bagian 8), lalu tiba-tiba di tengah jalan, aplikasi berkata "Anda kini login sebagai Budi Santoso, siswa kelas X TKJ 1" — dan panel admin raib, berganti jadi dasbor siswa. Ini bukan bug kecil yang bisa dibiarkan; ini akan terjadi **setiap kali** admin membuat satu akun, tanpa kecuali.

Masalah ini butuh solusi yang agak di luar kebiasaan: kita tidak bisa "mematikan" perilaku login-otomatis Firebase itu — ia bagian dari cara kerja SDK-nya. Yang bisa kita lakukan adalah **tidak memakai sesi admin sama sekali** saat membuat akun baru.

## 3. Solusi: aplikasi Firebase kedua sementara ("secondary app")

Idenya: buka **instance Firebase yang lain** — benar-benar terpisah, dengan `auth` dan koneksi Firestore-nya sendiri — khusus untuk momen pembuatan satu akun itu saja. Sesi admin yang asli, di instance Firebase yang pertama, sama sekali tidak tersentuh. Setelah akun baru selesai dibuat, instance kedua ini ditutup dan dibuang, seperti kertas coretan yang dipakai sekali lalu dibuang ke tempat sampah.

Ini seluruh isi `adminCreateUser` di `js/db.js` (baris 469–511). Baca dulu utuh sekali, lalu kita bedah tiap bagiannya:

```js
// js/db.js — FirebaseAdapter.adminCreateUser() (bagian 1: persiapan)
async adminCreateUser({ nama, username, email, password, role = 'guru', extra = {} }) {
  const uname = usernameOf(username || nama);
  email = (email || '').trim() || toAuthEmail(uname);
  password = toAuthPassword(password);
  const V = '10.12.2';
  const [appM, authM, fsM] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
  ]);
  const secName = 'secondary-' + Date.now();
  const secApp = appM.initializeApp(FIREBASE_CONFIG, secName);
  const secAuth = authM.getAuth(secApp);
  const secDb = fsM.getFirestore(secApp);
  this._connectEmulator(fsM, authM, secDb, secAuth);
```

Baca baris demi baris:

- **`uname = usernameOf(username || nama)`** dan **`email = ... || toAuthEmail(uname)`** — kalau admin tidak mengetik email sungguhan (kasus siswa), email internal dibentuk dari nama, persis fungsi yang Anda kenal dari Bab 06. `toAuthPassword(password)` melengkapi NIS pendek dengan nol di depan supaya lolos syarat minimal 6 karakter Firebase.
- **`import(...)` tiga modul Firebase** — sama seperti `_load()` di Bagian 4 Bab 05, tapi kali ini dipanggil ulang secara terpisah di dalam fungsi ini sendiri (modul yang sudah pernah diunduh peramban tidak diunduh dua kali, jadi ini murah).
- **`const secName = 'secondary-' + Date.now();`** — inilah kuncinya. `initializeApp(FIREBASE_CONFIG, secName)` menerima **parameter kedua**: nama instance. Kalau dikosongkan, Firebase memakai nama default `'[DEFAULT]'` — instance yang sama dipakai `DB.init()` untuk sesi admin. Dengan memberi nama unik (`secondary-1737...`, berbeda tiap panggilan berkat `Date.now()`), kita memaksa Firebase membuat **instance app yang benar-benar baru**, dengan `auth` dan koneksi Firestore-nya sendiri — tidak berbagi apa pun dengan instance admin.
- **`this._connectEmulator(...)`** — baris ini hanya berpengaruh kalau Anda sedang menguji lewat Firebase Emulator secara lokal (`window.__TUMARA_EMULATOR__`). Di produksi sungguhan flag itu tak ada, jadi baris ini tak melakukan apa-apa. Boleh diabaikan untuk sekarang.

Sekarang bagian intinya — akun dibuat, dan yang lebih penting, **profilnya ditulis oleh siapa**:

```js
// js/db.js — FirebaseAdapter.adminCreateUser() (bagian 2: buat akun + tulis profil)
  try {
    let cred;
    try {
      cred = await authM.createUserWithEmailAndPassword(secAuth, email.trim(), password);
    } catch (e) { throw new Error(this._msg(e)); }
    const profile = {
      nama: nama.trim(),
      username: uname, // yang diketik pengguna saat masuk
      email: cred.user.email || email.trim(),
      role, ...extra,
      fotoUrl: '',
      provider: 'password',
      profileComplete: role !== 'siswa',
      dibuatPada: new Date().toISOString(),
      dibuatOleh: this._user?.id || null
    };
    // ditulis oleh user baru itu sendiri (secAuth) → lolos Rules users/{uid}
    await fsM.setDoc(fsM.doc(secDb, 'users', cred.user.uid), this._clean(profile));
    await authM.signOut(secAuth);
    return { id: cred.user.uid, ...profile };
```

- **`createUserWithEmailAndPassword(secAuth, ...)`** — perhatikan argumen pertamanya `secAuth`, bukan `auth` milik admin. Login-otomatis yang tadi jadi masalah **tetap terjadi**, tapi kali ini yang login adalah `secAuth` — koneksi kedua yang terpisah. Sesi admin di `auth` (koneksi pertama) sama sekali tidak diusik. Inilah trik utamanya: membiarkan efek samping Firebase terjadi, tapi di tempat yang tidak berbahaya.
- **`fsM.setDoc(fsM.doc(secDb, 'users', cred.user.uid), ...)`** — dan ini bagian yang mudah terlewat kalau tidak dibaca pelan-pelan: dokumen profil pengguna baru ditulis lewat `secDb` (koleksi Firestore milik instance **kedua**), yang sedang login sebagai **pengguna baru itu sendiri**. Kenapa tidak ditulis lewat `db` admin saja, yang lebih sederhana? Karena Security Rules (dibahas penuh di Bab 12) akan berbunyi kira-kira "seseorang hanya boleh menulis dokumen `users/{uid}` miliknya sendiri" — admin bukan pemilik dokumen siswa baru itu, jadi kalau admin yang menulis lewat sesinya sendiri, Rules akan **menolaknya**. Dengan menulis lewat `secAuth` (yang, di mata Firestore, memang pengguna dengan `uid` itu), penulisan ini **sah** menurut Rules yang sama yang berlaku untuk siapa pun.
- **`authM.signOut(secAuth)`** — setelah profil tertulis, sesi kedua di-signout. Tak ada gunanya lagi dibiarkan hidup.

Bagian terakhir, `finally`, adalah bagian yang paling penting untuk Anda pahami sungguh-sungguh — salah satu contoh "kenapa" terbaik di seluruh repo ini:

```js
// js/db.js — FirebaseAdapter.adminCreateUser() (bagian 3: bersihkan instance kedua)
  } finally {
    // JANGAN di-await: bila createUser gagal (mis. nama sudah dipakai),
    // auth kedua tak pernah punya sesi dan deleteApp() menggantung
    // selamanya — errornya jadi tak pernah sampai ke pemanggil (modal
    // membeku tanpa pesan). Lepas app-nya di latar belakang saja.
    Promise.resolve(appM.deleteApp(secApp)).catch(() => {});
  }
},
```

Pertama, kenapa ada `deleteApp(secApp)` sama sekali? Karena instance Firebase kedua tetap memakan sedikit memori dan koneksi jaringan selama ia hidup. Kalau admin membuat 50 akun berturut-turut lewat impor massal (Bagian 8) dan tak satu pun instance kedua dibuang, peramban akan menumpuk 50 koneksi Firebase yang menganggur — pemborosan yang bisa dihindari.

Tapi perhatikan baik-baik komentarnya: `deleteApp()` **sengaja tidak di-`await`**. Ini bertentangan dengan kebiasaan Anda sejauh ini di modul ini, yang selalu mengajarkan "tunggu dulu sebelum lanjut". Kenapa di sini justru sebaliknya?

Bayangkan `createUserWithEmailAndPassword` di bagian 2 **gagal** — misalnya karena nama sudah dipakai orang lain (ingat batasan dari Bab 06: dua nama identik menghasilkan email internal yang sama). Baris `throw new Error(this._msg(e))` melempar error, blok `try` berhenti di situ, dan JavaScript langsung lompat ke `finally`. Di titik ini, `secAuth` **tidak pernah berhasil login** — tidak ada sesi apa pun yang tercipta di instance kedua itu, karena `createUserWithEmailAndPassword`-nya sendiri yang gagal.

Sekarang, kalau baris `deleteApp(secApp)` ditulis dengan `await deleteApp(secApp)`: dalam kondisi sebagian versi SDK, memanggil `deleteApp` pada instance yang autentikasinya belum pernah "menetap" bisa membuat proses pembersihannya **tidak pernah selesai** — `await`-nya menggantung selamanya, tak pernah resolve maupun reject. Karena `finally` belum selesai, JavaScript belum bisa melempar error aslinya (`throw new Error(this._msg(e))` dari bagian 2) ke pemanggil di `js/views/admin.js`. Akibatnya, tombol "Buat Akun" yang sudah Anda-nonaktifkan (`btn.disabled = true`) tak pernah kembali aktif, tak pernah muncul `toast(e.message, 'error')` — modalnya terlihat **membeku**, tanpa pesan apa pun, seolah aplikasi macet total. Admin tak tahu apakah harus menunggu, menutup modal, atau me-refresh halaman.

Solusinya di baris itu: `Promise.resolve(appM.deleteApp(secApp)).catch(() => {})` **tanpa** `await`. Ia memanggil `deleteApp`, membiarkan promise-nya berjalan sendiri di latar belakang (kalau berhasil, bagus; kalau gagal atau menggantung, `.catch(() => {})` menelan errornya diam-diam supaya tak ada "unhandled rejection" di Console), lalu **langsung lanjut** tanpa menunggu. `finally` selesai seketika, error asli dari bagian 2 langsung diteruskan ke pemanggil, dan admin melihat pesan errornya yang sebenarnya — misalnya "email sudah dipakai" — dalam hitungan mili-detik, bukan macet tanpa penjelasan.

> **Analogi:** ini seperti melepas nampan kotor di konter dapur setelah pesanan gagal dimasak, tapi tidak berdiri menunggu sampai nampannya benar-benar dicuci bersih sebelum kembali melayani pelanggan berikutnya dan menjelaskan kenapa pesanannya gagal. Membersihkan nampan penting, tapi pelanggan yang menunggu kabar jauh lebih penting untuk segera dilayani.

## 4. Jujur soal batasan panel ini

> ⚠️ **Jujur soal ini — tiga batasan panel admin yang perlu Anda ketahui:**
>
> **(a) Hapus akun hanya menghapus dokumen profil, bukan akun Auth-nya.** Lihat `adminDeleteUser` di `js/db.js` (baris 520–529):
> ```js
> // js/db.js — FirebaseAdapter.adminDeleteUser()
> // Hapus dokumen profil (akun Auth tetap ada — penghapusan Auth butuh
> // Admin SDK/Cloud Functions; menandai nonaktif sudah cukup untuk sekolah).
> async adminDeleteUser(id) {
>   const { F, db } = this.fb;
>   const snap = await F.getDoc(F.doc(db, 'users', id));
>   if (snap.exists() && (snap.data().role || 'siswa') === 'admin') {
>     throw new Error(tr('Akun admin tidak bisa dihapus.', 'Admin accounts cannot be deleted.'));
>   }
>   await F.deleteDoc(F.doc(db, 'users', id));
> }
> ```
> Yang terhapus hanyalah dokumen `users/{id}` — data nama, kelas, NIS, dan seluruh catatan pribadinya. Akun **Authentication**-nya (kombinasi email+sandi yang tersimpan di sistem login Firebase) **tetap ada**. Secara teknis, siswa yang "dihapus" masih **bisa** login — hanya saja setelah login, aplikasi tak akan menemukan dokumen profilnya lagi, sehingga pengalamannya rusak (tanpa nama, tanpa kelas, dsb). Penghapusan akun Auth yang sungguh-sungguh butuh **Admin SDK** yang berjalan di server (Cloud Functions), karena klien peramban tidak pernah diizinkan Firebase untuk menghapus akun orang lain — hanya akunnya sendiri. Ini di luar cakupan modul ini. Untuk kebanyakan sekolah, dokumen profil yang hilang sudah cukup — siswa itu tak lagi muncul di daftar mana pun, tak lagi punya kelas, tak lagi bisa dicatat absensinya.
>
> Perhatikan juga baris `if (... role === 'admin') throw new Error(...)` — akun admin **tidak bisa** dihapus lewat panel ini sama sekali, bahkan oleh admin lain. Ini penjaga sengaja supaya sekolah tak pernah kehilangan seluruh admin-nya karena satu klik yang salah. Tombol hapus di tabel akun (`js/views/admin.js` baris 198) bahkan sudah `disabled` di sisi tampilan untuk baris admin, sebelum sempat menyentuh server sama sekali.
>
> **(b) Password akun tak bisa diubah admin dari klien.** Lihat `adminUpdateUser` (baris 513–518):
> ```js
> // js/db.js — FirebaseAdapter.adminUpdateUser()
> async adminUpdateUser(id, patch) {
>   const { F, db } = this.fb;
>   const { password, ...safe } = patch; // password akun Auth tak bisa diubah dari klien
>   await F.setDoc(F.doc(db, 'users', id), this._clean(safe), { merge: true });
>   return { id, ...safe };
> }
> ```
> `const { password, ...safe } = patch` memisahkan `password` dari sisa data lalu **membuangnya** — hanya `safe` yang ditulis. Kenapa? Karena mengubah sandi akun Auth **orang lain** butuh hak istimewa yang sama seperti menghapusnya — hanya bisa dilakukan lewat Admin SDK di server, bukan dari peramban. Kalau siswa lupa NIS-nya, satu-satunya jalan lewat panel ini adalah admin **menghapus** akun itu dan **membuat ulang** dengan NIS baru — bukan "reset sandi" seperti aplikasi pada umumnya.
>
> **(c) Dua nama identik tak bisa jadi dua akun** — ini pengingat dari Bab 06, muncul lagi di sini karena di panel admin-lah batasan ini benar-benar terasa. `usernameOf` hanya bergantung pada nama, jadi dua "Muhammad" di kelas yang sama akan menghasilkan email internal yang sama persis, dan akun kedua ditolak Firebase sebagai "sudah dipakai". Solusinya bukan di kode, tapi di tangan admin: sunting kolom Username secara manual saat membuat akun kedua (mis. `muhammad.a` vs `muhammad.b`), memakai field `_usernameField()` yang memang sengaja dibuat bisa disunting (Bagian 5).

## 5. Dua jalur pembuatan akun berbeda

Panel admin punya **dua** modal pembuatan akun yang terpisah, bukan satu formulir serba-guna dengan dropdown peran. Ini keputusan sengaja: guru/admin dan siswa punya kebutuhan data yang cukup berbeda sehingga menyatukannya dalam satu formulir hanya akan membuatnya penuh field yang saling tak relevan.

**Jalur 1 — Guru & Admin** (`_userModal`, dipicu tombol "Buat Akun" di tampilan Akun): memakai **email sungguhan** + sandi bebas minimal 6 karakter, karena guru dan admin dianggap punya email dan bisa mengingat sandi biasa. Data tambahannya `mapelAmpu` (bisa lebih dari satu mata pelajaran, dipisah koma), `nip`, dan `sekolah` — semuanya opsional kecuali mata pelajaran untuk guru.

```js
// js/views/admin.js — AdminView._userModal(), saat menyimpan akun baru
const email = $('#mEmail', m).value.trim();
const pass = $('#mPass', m).value.trim();
if (!/^\S+@\S+\.\S+$/.test(email)) { btn.disabled = false; return toast(tr('Masukkan email yang valid.', 'Please enter a valid email.'), 'warning'); }
if (pass.length < 6) { btn.disabled = false; return toast(tr('Kata sandi minimal 6 karakter.', 'Password must be at least 6 characters.'), 'warning'); }

await DB.adminCreateUser({ nama, email, password: pass, role, extra });
closeModal();
this._createdInfoModal(nama, email, pass, role);
this.render(this._el);
```

**Jalur 2 — Siswa** (`_studentModal`, dipicu tombol "Tambah Siswa" — tapi hanya **di dalam** halaman detail satu kelas, bukan dari tampilan Akun): siswa **tidak** memakai email. Nama lengkap menghasilkan username otomatis (boleh disunting), dan **NIS langsung menjadi sandinya** — minimal 4 digit, karena `toAuthPassword` (Bab 06) akan melengkapinya dengan nol di depan sampai 6 karakter. Yang membedakan jalur ini dari jalur guru/admin: akun siswa **otomatis tertaut ke kelas** tempat tombolnya diklik, lewat `extra`:

```js
// js/views/admin.js — AdminView._studentModal(), saat menyimpan akun baru
const username = usernameOf($('#mUser', m).value || nama);
if (!username) { btn.disabled = false; return toast(tr('Username harus mengandung huruf atau angka.', 'The username must contain letters or numbers.'), 'warning'); }
const nis = this._cleanNis($('#mNis', m).value);
if (nis.length < 4) { btn.disabled = false; return toast(tr('NIS minimal 4 angka (dipakai sebagai kata sandi).', 'NIS must be at least 4 digits (used as the password).'), 'warning'); }

await DB.adminCreateUser({
  nama, username, password: nis, role: 'siswa',
  extra: { nis, kelasId: cls.id, kelasNama: cls.nama, kelas: cls.nama }
});
closeModal();
this._createdInfoModal(nama, username, nis, 'siswa');
this.render(this._el);
```

`extra` di sini persis parameter terakhir `adminCreateUser({ ..., extra })` yang Anda baca di Bagian 3 — seluruh isinya ditempelkan begitu saja ke dokumen profil (`role, ...extra`). Karena `kelasId` ikut tertulis sejak akun **lahir**, siswa yang dibuat lewat panel admin tak perlu mengisi onboarding kelas lagi (ingat dari Bab 06: `OnboardView` mengunci field NIS kalau sudah diisi admin, karena mengubahnya di sana akan membuat siswa itu tak bisa login lagi).

Setelah salah satu dari dua jalur berhasil, keduanya berakhir di tempat yang sama: `this._createdInfoModal(nama, identitas, pass, role)` — sebuah modal yang menampilkan kredensial akun baru **satu kali**:

```js
// js/views/admin.js — AdminView._createdInfoModal() (diringkas)
_createdInfoModal(nama, identitas, pass, role) {
  const siswa = role === 'siswa';
  const labelId = siswa ? 'Username' : 'Email';
  const labelPass = siswa ? `NIS (kata sandi)` : 'Kata sandi';
  openModal({
    title: tr('Akun Berhasil Dibuat ✅', 'Account Created ✅'),
    body: `
      <div class="cred-box">
        <div><span>${labelId}</span><b id="cUser">${esc(identitas)}</b></div>
        <div><span>${labelPass}</span><b id="cPass">${esc(pass)}</b></div>
      </div>
      <button class="btn btn-primary btn-block" id="cCopy">${tr('Salin Kredensial', 'Copy Credentials')}</button>`,
    onMount: m => {
      $('#cCopy', m).onclick = async () => {
        const text = `Tumara\n${nama}\n${labelId}: ${identitas}\n${labelPass}: ${pass}`;
        try { await navigator.clipboard.writeText(text); toast(tr('Kredensial disalin 📋', 'Credentials copied 📋')); }
        catch (_) { toast(tr('Tidak bisa menyalin otomatis — catat manual ya.', 'Could not auto-copy — please note it manually.'), 'warning'); }
      };
    }
  });
}
```

Kenapa ini penting ditegaskan: setelah modal ini ditutup, **sandi dalam bentuk asli tak pernah terlihat lagi oleh siapa pun** — termasuk admin sendiri. Firebase Authentication menyimpan sandi dalam bentuk ter-*hash* (diacak lewat rumus satu arah yang tak bisa dibalik), sehingga bahkan Firebase sendiri tak menyimpan sandi mentahnya. Modal ini adalah satu-satunya jendela waktu di mana admin bisa membaca, menyalin, dan mencatatkannya untuk diserahkan ke guru atau siswa bersangkutan — sengaja dibuat menonjol (tombol "Salin Kredensial" langsung menyalin ke clipboard) supaya admin tak perlu mengetik ulang secara manual dan salah ketik.

## 6. Kenapa render ulang daftar akun butuh kehati-hatian

Bab 08 mengajarkan Anda pola "satu `innerHTML` besar" — setiap kali data berubah, gambar ulang **seluruh** isi view sekaligus dari nol. Pola itu sederhana dan hampir selalu benar. Tapi tampilan Akun di panel admin adalah salah satu tempat langka di mana pola itu justru **salah**, dan kodenya punya komentar yang menjelaskan kenapa:

```js
// js/views/admin.js — AdminView.renderAccounts()
/* Mencari TIDAK me-render ulang halaman: kotak search-nya sendiri tak
   disentuh, jadi fokus & kursor tetap di tempat (dulu input-nya ikut
   dibuat ulang → fokus hilang, dan spinner "Memuat…" membuat kedip).
   Yang digambar ulang hanya isi #uList, dari data yang sudah di memori. */
const input = $('#uSearch', el);
let deb;
input.oninput = () => {
  this.query = input.value;
  clearTimeout(deb);
  deb = setTimeout(() => this._paintUsers(el), 120);
};
```

Bayangkan versi naif: setiap kali admin mengetik satu huruf di kotak cari, kode memanggil ulang `renderAccounts(el)` seutuhnya — yaitu `el.innerHTML = ...` menimpa **seluruh** isi `<div id="view">`, termasuk `<input id="uSearch">` itu sendiri. Masalahnya, mengganti `innerHTML` sebuah elemen **menghancurkan dan membuat ulang** semua elemen anak di dalamnya — termasuk input yang sedang difokus pengguna. Peramban tidak bisa "mengingat" bahwa input yang baru dibuat itu "sama" dengan yang lama; fokus kursor hilang seketika. Praktiknya: admin mengetik huruf pertama nama siswa yang dicari, fokus hilang, huruf kedua tak masuk ke mana pun karena kursor sudah tak berada di kotak itu lagi. Mengetik jadi mustahil — setiap huruf harus diklik ulang kotaknya.

Solusinya, `_paintUsers(el)`, hanya menggambar ulang `<div id="uList">` — anak dari view, **bukan** view itu sendiri:

```js
// js/views/admin.js — AdminView._paintUsers() (kerangka, disederhanakan)
_paintUsers(el) {
  const list = $('#uList', el);
  if (!list) return;
  const shown = this._filterUsers();   // saring dari this._users yang sudah di memori
  list.innerHTML = shown.length ? `<table class="data-table">...</table>` : `<div class="card empty-state">...</div>`;
  // pasang ulang tombol Ubah/Hapus di baris-baris baru
  $$('[data-edit]', list).forEach(b => b.onclick = () => this._userModal(/* ... */));
  $$('[data-del]', list).forEach(b => b.onclick = async () => { /* ... */ });
}
```

`<input id="uSearch">` hidup **di luar** `#uList` — jadi tak pernah tersentuh oleh `_paintUsers`. Kursor dan fokus pengguna tetap di tempatnya sepanjang mereka mengetik. Yang berubah hanya daftar hasil di bawahnya. Perhatikan juga bahwa `_paintUsers` **tidak** memanggil `DB.adminListUsers()` lagi — ia menyaring dari `this._users`, salinan data yang sudah diambil sekali saat `renderAccounts` pertama kali dipanggil (lihat komentar di baris 48–50: "disimpan agar mencari/memfilter tidak perlu mengambil ulang data dari server"). Menyaring array yang sudah ada di memori itu instan; kalau setiap ketikan menembak server lagi, selain fokus hilang, pencarian juga akan terasa lamban dan menghabiskan kuota baca Firestore (ingat Bagian 8 Bab 05).

**Kapan pengecualian "jangan render seluruh view" ini perlu Anda pakai sendiri?** Aturan praktisnya: setiap kali ada elemen yang **sedang difokuskan pengguna** — kotak teks yang sedang diketik, `<select>` yang sedang terbuka, elemen dengan animasi transisi yang sedang berjalan — dan perubahan data terjadi **selagi** elemen itu aktif (misalnya hasil pencarian *live*, bukan submit formulir biasa). Untuk sebagian besar view lain di Tumara (Tugas, Catatan, absensi guru), interaksinya selalu "isi formulir di modal → simpan → tutup modal → render ulang seluruh halaman", jadi pola Bab 08 tetap benar di sana — tak ada input yang sedang difokus saat render ulang terjadi, karena modalnya sudah tertutup lebih dulu. `_paintUsers` adalah pengecualian karena pencarian di sini terjadi **langsung di halaman**, bukan di dalam modal terpisah.

## 7. Kelas & Siswa (data induk)

Tampilan kedua, "Kelas & Siswa", adalah tempat admin mengelola **data induk** sekolah: daftar kelas (`school_classes`, koleksi global — ingat kelompok `g` dari Bab 05) dan siswa di masing-masing kelas.

Pola navigasinya mengikuti "gerbang pilih kelas" yang sama seperti portal guru di Bab 10: admin **tidak** langsung disuguhi tabel raksasa berisi seluruh siswa sekolah. Ia memilih satu kelas dulu dari kumpulan kartu (dikelompokkan per tingkat X/XI/XII/XIII lewat `_groupByTingkat`), baru daftar siswa kelas itu terbuka:

```js
// js/views/admin.js — AdminView.renderClasses() (potongan alur gerbang)
if (!active) {
  // ...tampilkan this._classGate(classes, jumlah)...
  $$('[data-cls]', el).forEach(b => b.onclick = () => {
    this.activeClassId = b.dataset.cls;
    this.render(this._el);
  });
  return;
}
// activeClassId terisi → tampilkan detail kelas + daftar siswanya
const siswa = (await DB.listStudentsByClass(active.id))
  .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
```

Perhatikan `DB.listStudentsByClass(active.id)` — ini **bukan** membaca dari sebuah "daftar roster" terpisah, melainkan mencari langsung di koleksi `users`: semua akun ber-`role: 'siswa'` yang `kelasId`-nya cocok. Artinya, "siswa di kelas ini" yang ditampilkan panel admin adalah **akun sungguhan**, sama seperti yang guru lihat di kelasnya (Bab 10) — bukan catatan administratif yang berdiri sendiri.

Ada satu koleksi lagi yang mungkin Anda temui membaca kode: `school_roster`. Koleksi ini **dulunya** dimaksudkan sebagai catatan cadangan nama+NIS per kelas, terpisah dari akun.

> ⚠️ **Jujur soal ini:** `school_roster` **sebagian besar tak lagi dipakai** di kode saat ini. Roster yang aktif — yaitu "siapa saja siswa di kelas ini" — berasal murni dari akun siswa yang sudah login sendiri dan memilih `kelasId`-nya (lewat onboarding, Bab 06, atau langsung diisi admin lewat `_studentModal`). Satu-satunya jejak `school_roster` yang tersisa di kode adalah komentar pengingat di `js/views/teacher.js`: *"Roster = akun siswa yang SUDAH login & memilih kelas ini saat onboarding. Data admin (`school_roster`) hanya acuan."* Kalau Anda menemukan koleksi ini di Firestore Console dengan data lama di dalamnya, anggaplah sebagai arsip — jangan bergantung padanya untuk fitur baru.

**Larangan hapus kelas yang masih berisi siswa.** Ini penjagaan sengaja supaya admin tak pernah tak sadar menghapus kelas yang masih dipakai puluhan akun aktif — sebab menghapus dokumen `school_classes` tidak otomatis "melepaskan" `kelasId` siswa-siswanya; mereka akan menunjuk ke kelas yang sudah tak ada.

```js
// js/views/admin.js — tombol "Hapus Kelas"
$('#delClass', el).onclick = async () => {
  // Kelas berisi akun siswa: hapus siswanya dulu — supaya tak ada akun
  // yang menggantung tanpa kelas (dan admin sadar apa yang ia hapus).
  if (siswa.length) {
    return toast(tr(`Kelas "${active.nama}" masih berisi ${siswa.length} akun siswa. Hapus/pindahkan siswanya dulu.`,
                    `Class "${active.nama}" still has ${siswa.length} student accounts. Remove/move them first.`), 'warning');
  }
  if (!await confirmDialog(tr(`Hapus kelas "${active.nama}"?`, `Delete class "${active.nama}"?`),
      { danger: true, okText: tr('Hapus Kelas', 'Delete Class') })) return;
  try {
    await DB.gRemove('school_classes', active.id);
    this.activeClassId = null;
    toast(tr('Kelas dihapus.', 'Class deleted.'));
    this.render(this._el);
  } catch (e) { toast(e.message, 'error'); }
};
```

UX-nya berlapis dua: pertama, `if (siswa.length)` — kalau kelas masih ada isinya, aksi **berhenti** di situ dengan `toast` peringatan berisi **jumlah** akun yang masih terdaftar (bukan cuma "tidak bisa dihapus" tanpa alasan). Baru kalau kelas sudah kosong, `confirmDialog` bertanya sekali lagi sebelum benar-benar memanggil `DB.gRemove`. Admin yang ingin tetap menghapus kelas berisi harus lebih dulu memindahkan atau menghapus siswanya satu per satu lewat tombol hapus akun di tabel siswa kelas itu — sengaja dibuat merepotkan, supaya penghapusan kelas beranak-cucu tak pernah terjadi tanpa sadar.

## 8. Impor massal dari Excel/Sheets

Membuat satu akun siswa lewat modal sudah cukup untuk beberapa orang. Tapi bagaimana kalau admin punya daftar 40 siswa satu angkatan, hasil salin dari Excel atau Google Sheets? Menekan "Tambah Siswa" 40 kali, mengetik nama dan NIS satu-satu, adalah pekerjaan yang menyiksa. Untuk itu ada tombol "Import Massal", dipicu `_rosterImportModal(cls)`.

Alurnya: admin menyalin tiga kolom (NISN, NIS, Nama Siswa) dari spreadsheet — urutan ini sengaja dipilih karena rapor/dapodik biasanya sudah menaruh NISN di kolom paling kiri — lalu menempelkannya ke satu `<textarea>` besar, satu siswa per baris. Karena format Excel/Sheets bisa menempel dengan pemisah yang berbeda-beda tergantung sumbernya (koma saat disalin sebagai teks, tab saat disalin sebagai sel tabel), pemisahnya harus fleksibel, dan NISN boleh dikosongkan (baris `"; 12345, Budi Santoso"` tetap valid):

```js
// js/views/admin.js — AdminView._parseRoster()
// Tempel banyak siswa sekaligus. Tiap baris: "NISN, NIS, Nama" (pemisah ,
// ; atau tab). NISN opsional (boleh dikosongkan, mis. ", 12345, Budi").
// Baris dengan hanya 2 kolom dianggap "NIS, Nama" (tanpa NISN). Baris
// kosong diabaikan.
_parseRoster(text) {
  return text.split(/\r?\n/).map(line => {
    const raw = line.trim();
    if (!raw) return null;
    const parts = raw.split(/\s*[\t;,]\s*/).map(p => p.trim());
    let nisn = '', nis = '', nama = '';
    if (parts.length >= 3) {
      nisn = parts[0]; nis = parts[1]; nama = parts.slice(2).join(' ').trim();
    } else if (parts.length === 2) {
      nis = parts[0]; nama = parts[1];
    } else {
      const mm = raw.match(/^(\S+)\s{2,}(.*)$/);
      if (mm) { nis = mm[1]; nama = mm[2].trim(); }
      else nama = raw;
    }
    nama = (nama || '').trim();
    return nama ? { nama, nis: this._cleanNis(nis), nisn: this._cleanNis(nisn) } : null;
  }).filter(Boolean);
}
```

Baca logikanya sebagai percabangan bertingkat:

1. **`text.split(/\r?\n/)`** — pecah tempelan jadi baris-baris. `\r?\n` menangani baik akhir baris gaya Windows (`\r\n`) maupun gaya Unix/Mac (`\n`) — penting karena Excel di Windows dan Google Sheets bisa menghasilkan salah satu.
2. **`raw.split(/\s*[\t;,]\s*/)`** — pisahkan dengan pemisah yang "jelas": tab, titik-koma, atau koma (dengan spasi longgar di sekitarnya).
3. **3 kolom atau lebih** (`parts.length >= 3`) — kolom pertama NISN, kolom kedua NIS, sisanya digabung kembali jadi nama (`parts.slice(2).join(' ')`, supaya nama yang kebetulan mengandung koma/tab tidak terpotong).
4. **Tepat 2 kolom** — dianggap format lama tanpa NISN: `"NIS, Nama"`. Ini menjaga kompatibilitas untuk admin yang masih menempel dua kolom saja.
5. Kalau tak ada pemisah sama sekali (baris cuma satu potongan), coba pola cadangan: `/^(\S+)\s{2,}(.*)$/` — satu token pertama (NIS) diikuti **dua spasi atau lebih**, lalu sisanya jadi nama. Kalau ini pun gagal, seluruh baris dianggap **nama saja** tanpa NIS/NISN — nanti divalidasi belakangan bahwa NIS wajib minimal 4 digit, jadi baris seperti ini akan gagal dengan pesan yang jelas, bukan diam-diam terlewat.
6. **`this._cleanNis(...)`** — apa pun yang tertangkap sebagai NIS/NISN dibersihkan dulu (hanya digit, maksimal 20 karakter) sebelum disimpan ke hasil.

Setelah baris-baris berhasil di-parse, alur pembuatan akunnya berbeda dari yang mungkin Anda bayangkan:

```js
// js/views/admin.js — AdminView._rosterImportModal(), saat "Buat Akun Siswa" ditekan
const gagal = [];
let sukses = 0;
for (const [i, s] of items.entries()) {
  log.innerHTML = `<b>${i + 1}/${items.length}</b> — ${esc(s.nama)}…`;
  if (s.nis.length < 4) { gagal.push(`${s.nama} — ${tr('NIS minimal 4 angka', 'NIS must be at least 4 digits')}`); continue; }
  try {
    await DB.adminCreateUser({
      nama: s.nama, username: usernameOf(s.nama), password: s.nis, role: 'siswa',
      extra: { nis: s.nis, nisn: s.nisn, kelasId: cls.id, kelasNama: cls.nama, kelas: cls.nama }
    });
    sukses++;
  } catch (e) {
    gagal.push(`${s.nama} — ${e.message}`);
  }
}
```

Perhatikan `for...of` biasa dengan `await` **di dalam** perulangan (`for` sekuensial), **bukan** `Promise.all(items.map(...))` yang menembak semuanya sekaligus secara paralel. Ini keputusan sengaja, bukan lupa dioptimalkan: seperti Anda baca di Bagian 3, tiap `adminCreateUser` membuka **instance Firebase kedua yang baru** dan membutuhkan sesi Auth-nya sendiri untuk menulis profilnya sendiri. Membuat 40 akun sekaligus secara paralel berarti membuka 40 instance Firebase serentak — selain boros, `Date.now()` yang dipakai membuat `secName` unik bisa saja (walau jarang) menghasilkan nama sama kalau dua panggilan terjadi di milidetik yang persis sama, membuat keduanya bentrok memakai instance yang sama. Satu per satu, menunggu satu akun benar-benar selesai (berhasil atau gagal) sebelum memulai yang berikutnya, jauh lebih aman untuk pola "sesi kedua sementara" ini.

Karena prosesnya satu per satu dan tiap akun butuh waktu (koneksi ke Firebase, bukan operasi instan), UI-nya menunjukkan **log progres** `n/total` yang diperbarui tiap iterasi (`log.innerHTML = ...`) — supaya admin yang mengimpor 40 siswa tahu aplikasinya sedang bekerja, bukan macet. Baris yang gagal (`s.nis.length < 4`, atau `adminCreateUser` melempar error seperti "nama sudah dipakai") **tidak menghentikan** perulangan — `continue` dan `catch` memastikan baris berikutnya tetap dicoba, dan pesan errornya dikumpulkan ke array `gagal` alih-alih ditampilkan satu-satu lewat `toast` yang akan saling menimpa.

```js
// js/views/admin.js — AdminView._rosterImportModal(), setelah perulangan selesai
if (!gagal.length) {
  closeModal();
  toast(tr(`${sukses} akun siswa berhasil dibuat 🎉`, `${sukses} student accounts created 🎉`));
  this.render(this._el);
  return;
}
// Sebagian gagal → jangan tutup modal; tampilkan baris mana saja,
// agar admin bisa memperbaiki (mis. memberi username pembeda).
btn.disabled = false;
log.innerHTML = `
  <div>...${sukses}... akun dibuat, ...${gagal.length}... gagal:</div>
  <ul>${gagal.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
  <div>${tr('Perbaiki baris yang gagal lalu import ulang (yang sudah berhasil jangan disertakan).', '...')}</div>`;
if (sukses) this.render(this._el);
```

Kalau **semua** baris berhasil, modal ditutup otomatis dan satu `toast` ringkas muncul. Tapi kalau **ada** yang gagal, modal **sengaja dibiarkan terbuka**, menampilkan daftar nama beserta alasan gagalnya masing-masing — supaya admin bisa memperbaiki baris yang bermasalah (mis. menambahkan pembeda nama, memperbaiki NIS yang kurang digit) dan mengimpor ulang, tanpa perlu mengetik ulang dari nol seluruh 40 baris. Kalau sebagian sudah berhasil (`sukses > 0`), daftar kelas di belakang modal tetap di-refresh (`this.render(this._el)`) supaya siswa yang sudah berhasil dibuat langsung terlihat, meski modalnya sendiri belum ditutup.

Satu hal terakhir yang perlu Anda ketahui: `js/db.js` sebenarnya punya method `gAddMany(coll, items)` (dibahas di Bab 05) yang menulis banyak dokumen sekaligus lewat `writeBatch`, dipecah per 500 operasi agar sesuai batas Firestore:

```js
// js/db.js — FirebaseAdapter.gAddMany() (baris 668–682, TAK dipakai jalur impor siswa)
async gAddMany(coll, items) {
  const { F, db } = this.fb;
  const recs = items.map(it => ({ id: uid(), ...it }));
  for (let i = 0; i < recs.length; i += 500) {
    const batch = F.writeBatch(db);
    for (const rec of recs.slice(i, i + 500)) {
      const { id, ...data } = rec;
      batch.set(F.doc(this._gColRef(coll), id), this._clean(data));
    }
    await batch.commit();
  }
  this._gInvalidate(coll);
  return recs;
}
```

`gAddMany` **jauh** lebih cepat daripada perulangan satu-per-satu — satu `batch.commit()` bisa menulis ratusan dokumen sekaligus dalam satu perjalanan jaringan. Tapi ia **tidak dipakai** oleh `_rosterImportModal`, dan sekarang Anda tahu kenapa: `gAddMany` dibangun untuk menulis banyak dokumen **biasa** ke satu koleksi global (`school_roster`, yang seperti Anda baca di Bagian 7 kini jarang dipakai) — bukan untuk membuat banyak **akun Authentication**. Membuat akun tidak bisa di-batch, karena tiap akun butuh panggilan `createUserWithEmailAndPassword` sendiri-sendiri, yang menuntut sesi Auth-nya sendiri. `gAddMany` dan `_parseRoster`/impor massal siswa terlihat mirip ("menulis banyak baris sekaligus dari data yang ditempel"), tapi keduanya menyelesaikan masalah yang berbeda.

---

## ✅ Cek hasil

- [ ] Login sebagai admin (email di `ADMIN_EMAILS`, Bab 06), buka `admin.html`. Anda harus melihat tab "Akun" dan "Kelas & Siswa" di atas.
- [ ] Di tab Akun, klik "Buat Akun", pilih peran Guru, isi nama/email/sandi, simpan. Anda harus tetap melihat sesi Anda sendiri (email admin Anda) di pojok kanan atas — **bukan** ter-logout jadi akun guru yang baru dibuat.
- [ ] Modal kredensial harus muncul sekali menampilkan email dan sandi guru baru. Tutup modal, buka lagi menu "Ubah" akun itu — Anda **tidak** akan menemukan sandinya di mana pun (hanya nama, mapel, dsb yang bisa diubah).
- [ ] Di tab Kelas & Siswa, buat satu kelas baru, buka detailnya, tambah satu siswa (nama + NIS ≥4 digit). Modal kredensial muncul menampilkan username + NIS. Buka `auth.html` di tab lain, coba login dengan kredensial itu — harus berhasil masuk sebagai siswa.
- [ ] Di tab Akun, ketik satu nama di kotak cari huruf demi huruf perlahan. Kursor **tidak** boleh melompat keluar kotak — Anda harus bisa mengetik terus tanpa mengklik ulang.
- [ ] Coba hapus kelas yang masih berisi siswa tadi. Harus muncul `toast` peringatan menyebutkan jumlah siswa, **penghapusan dibatalkan**. Hapus dulu siswanya, baru kelas bisa dihapus.
- [ ] Buka "Import Massal" di sebuah kelas, tempel 5 baris `NISN, NIS, Nama` (format bebas — coba campur koma dan tab, dan kosongkan NISN di satu baris), tekan "Buat Akun Siswa". Log progres `1/5` sampai `5/5` harus muncul berurutan, lalu 5 akun baru tampil di daftar siswa kelas itu, lengkap dengan NISN-nya.
- [ ] Ulangi impor massal dengan salah satu baris ber-NIS 2 digit saja. Modal harus **tetap terbuka** setelah proses selesai, menunjukkan baris mana yang gagal dan kenapa, sementara baris lain yang valid tetap berhasil dibuat.

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| Modal "Buat Akun" membeku tak berpindah, tak ada pesan error, tombol tetap "disabled" selamanya | `deleteApp(secApp)` di `finally` di-`await` (versi salah) — kalau `createUser` gagal, sesi kedua tak pernah exist dan `deleteApp` menggantung | Pastikan `finally` memanggil `Promise.resolve(appM.deleteApp(secApp)).catch(() => {})` **tanpa** `await` di depannya (lihat Bagian 3). |
| Admin ter-logout jadi akun siswa/guru yang baru saja dibuat | `createUserWithEmailAndPassword` dipanggil memakai `auth` milik admin (instance Firebase pertama), bukan `secAuth` | Pastikan seluruh alur pembuatan akun memakai instance Firebase **kedua** (`secApp`/`secAuth`/`secDb`), bukan instance default yang dipakai `DB.init()`. |
| Fokus kotak cari hilang tiap kali mengetik satu huruf | `oninput` memanggil `renderAccounts(el)` lagi (render seluruh view), bukan `_paintUsers(el)` | Pastikan pencarian hanya menggambar ulang `#uList`, bukan seluruh `<div id="view">` — lihat Bagian 6. |
| Impor massal berhenti di tengah, tak jelas siswa mana yang gagal dan mana yang berhasil | Lupa membungkus tiap `adminCreateUser` dalam `try/catch` di dalam perulangan, atau lupa mengumpulkan pesan ke array `gagal` per baris | Bungkus tiap iterasi dengan `try { ... sukses++ } catch (e) { gagal.push(...) }` dan **jangan** `throw` keluar dari perulangan — biarkan baris berikutnya tetap dicoba. |
| Membuat akun siswa kedua dengan nama sama gagal, pesan "email sudah dipakai" | `usernameOf` hanya bergantung pada nama (Bab 06) — dua nama identik = satu email internal yang sama | Bukan bug. Sunting kolom Username secara manual di `_studentModal`/`_userModal` untuk membedakannya (mis. tambah inisial kelas). |
| Menghapus akun siswa, tapi siswa itu masih bisa login setelahnya | `adminDeleteUser` hanya menghapus dokumen `users/{id}`, akun Authentication-nya tetap ada — batasan yang disengaja (Bagian 4a) | Bukan bug untuk diperbaiki di modul ini; penghapusan akun Auth sungguhan butuh Admin SDK/Cloud Functions di luar cakupan modul. Cukup pastikan admin/pengguna tahu batasan ini. |
| Tombol "Hapus Kelas" menolak terus walau menurut Anda kelasnya sudah kosong | Data `siswa` yang dibaca `renderClasses` sudah usang (mis. baru saja menghapus siswa dari tab lain) | `siswa.length` dihitung ulang tiap `renderClasses` dipanggil — pastikan `this.render(this._el)` dipanggil setelah tiap penghapusan akun siswa agar datanya segar. |

## 🧪 Latihan

1. Tambahkan validasi eksplisit: NIS yang dimasukkan admin harus **seluruhnya angka**. Perhatikan `_cleanNis` (`v => String(v || '').replace(/\D/g, '').slice(0, 20)`) sebenarnya sudah **diam-diam membuang** karakter bukan angka, bukan menolaknya — coba ketik `"12A34"` di kolom NIS dan lihat apa yang tersisa. Ubah perilakunya supaya admin **diberi tahu** (`toast` peringatan) kalau input aslinya mengandung karakter selain angka, alih-alih dibisukan begitu saja.
2. Tambahkan kolom baru "Alamat" (opsional) ke `_studentModal`, ikut tersimpan lewat `extra: { ..., alamat }` saat `DB.adminCreateUser` dipanggil, dan tampil di tabel siswa kelas.
3. ⭐ Tanpa membuka kembali bab ini, jelaskan dengan kata-kata Anda sendiri ke rekan sejawat: kenapa dokumen profil pengguna baru di `adminCreateUser` **harus** ditulis lewat `secAuth` (sesi Firebase kedua yang login sebagai pengguna baru itu), bukan lewat sesi admin yang sedang login? Sertakan istilah "Security Rules" dan jelaskan apa yang akan terjadi kalau ditulis lewat sesi admin.

## 📌 Ringkasan

- `admin.html` adalah rumah peran admin, dijaga `guardPage(['admin'])` sama seperti `guru.html`/`app.html`. Dua tampilan (`view: 'accounts' | 'classes'`) ditukar lewat tab, posisinya disimpan `localStorage` (`tumara_admin_nav`) agar tahan refresh.
- **Masalah inti bab ini:** `createUserWithEmailAndPassword` otomatis login sebagai akun baru, mengganti sesi admin yang sedang aktif. **Solusinya:** aplikasi Firebase kedua sementara (`initializeApp(FIREBASE_CONFIG, secName)`), dipakai sekali untuk membuat akun + menulis profilnya sendiri (`secAuth`, supaya lolos Security Rules "hanya boleh tulis dokumen sendiri"), lalu di-`signOut` dan `deleteApp`-nya dilepas **tanpa** `await` di `finally` — supaya error asli tetap sampai ke pemanggil, bukan modal yang membeku selamanya.
- **Batasan yang jujur diakui:** `adminDeleteUser` hanya menghapus dokumen profil (akun Auth tetap ada); `adminUpdateUser` membuang field `password` dari `patch` (sandi tak bisa diubah admin dari klien); dua nama identik tak bisa jadi dua akun (dari Bab 06).
- Dua jalur pembuatan akun terpisah: **guru/admin** (email + sandi bebas, `_userModal`) dan **siswa** (nama + NIS jadi sandi, dibuat di dalam konteks satu kelas lewat `_studentModal`, otomatis tertaut `kelasId`). Kredensial baru ditampilkan **sekali** lewat `_createdInfoModal` — sesudahnya sandi tersimpan ter-*hash*, tak terlihat lagi oleh siapa pun.
- `_paintUsers(el)` hanya menggambar ulang `#uList`, bukan seluruh view — pengecualian dari pola "satu `innerHTML` besar" (Bab 08), perlu dipakai setiap ada elemen yang sedang difokuskan pengguna (mis. kotak cari) saat data berubah.
- `school_classes` (koleksi global) adalah data induk kelas; `school_roster` sebagian besar sudah tak dipakai — roster aktif berasal dari akun siswa yang login sendiri (`kelasId`). Kelas tak bisa dihapus selama masih ada akun siswa yang terdaftar di dalamnya.
- Impor massal (`_parseRoster` + `_rosterImportModal`) membuat akun **satu per satu secara berurutan** (bukan `Promise.all`, bukan `gAddMany`), karena tiap akun butuh sesi Auth sendiri — dengan log progres `n/total` dan laporan baris gagal yang tak menghentikan baris lain.

**Berikutnya:** [Bab 12 — Aturan Keamanan](12-aturan-keamanan.md)
