# Bab 06 — Masuk, Daftar & Peran

> **Tujuan bab ini:** Anda bisa membangun `auth.html` (halaman masuk) dan `js/roles.js` (penjaga halaman per peran), memahami trik "siswa masuk pakai nama + NIS", dan tahu bagaimana admin sekolah pertama bisa masuk tanpa didaftarkan siapa pun.

| | |
|---|---|
| **Perkiraan waktu** | ~60 menit |
| **Sebelum ini** | [Bab 05 — Lapisan Data `db.js`](05-lapisan-data-db-js.md) |
| **Anda butuh** | `js/utils.js`, `js/db.js`, `js/firebase-config.js` sudah ada, dan Firebase Authentication (Email/Password) sudah aktif dari Bab 04 |

## Apa yang kita bangun di bab ini

Tiga hal, saling menyambung:

1. `js/roles.js` — fungsi kecil yang tahu peran mana pergi ke halaman mana, dan sebuah "penjaga pintu" yang dipanggil di **setiap** halaman aplikasi.
2. `auth.html` + `AuthView` — satu-satunya pintu masuk. Perhatikan: **hanya masuk**, tidak ada formulir "Daftar" untuk siswa/guru. Anda akan lihat kenapa itu keputusan sengaja, bukan bab yang belum selesai.
3. `OnboardView` — layar sekali-jalan yang muncul untuk siswa baru: minta usia/tinggi/berat, lalu yang terpenting, **kelas dan NIS**.

Alurnya begini:

```
DB.login(identitas, sandi)
        │
        ▼
   berhasil? ──tidak──▶ email termasuk ADMIN_EMAILS? ──ya──▶ daftarkan otomatis sbg admin
        │                         │
       ya                        tidak
        │                         │
        ▼                         ▼
  location.replace(roleHome(u.role))     tampilkan error asli
        │
        ▼
  siswa baru & profileComplete=false? ──ya──▶ OnboardView (kelas+NIS, dll.)
        │
       tidak
        ▼
     app.html / guru.html / admin.html
```

---

## 1. Tiga peran, tiga halaman tujuan

Ingat dari Bab 02: Tumara punya tiga peran, dan masing-masing punya "rumah"-nya sendiri.

- **admin** → `admin.html` (kelola akun, kelas, jadwal)
- **guru** → `guru.html` (kelas, absensi, penilaian, jurnal)
- **siswa** → `app.html` (dasbor kesehatan/produktivitas/keuangan/ibadah)

Seluruh file `js/roles.js` hanya 39 baris. Baca dulu utuh, baru kita bedah baris demi baris.

```js
// js/roles.js
/* ============================================================
   TUMARA — Peran (roles) & pengarahan halaman
   ------------------------------------------------------------
   Tiga peran: 'admin', 'guru', 'siswa'.
   • admin → admin.html (kelola akun)
   • guru  → guru.html  (kelas, absensi, penilaian, jurnal)
   • siswa → app.html   (dasbor kesehatan/produktivitas/keuangan/ibadah)
   ============================================================ */

// Halaman beranda sesuai peran
function roleHome(role) {
  return role === 'admin' ? 'admin.html'
       : role === 'guru'  ? 'guru.html'
       : 'app.html';
}

// Label peran (untuk UI)
function roleLabel(role) {
  return role === 'admin' ? tr('Admin', 'Admin')
       : role === 'guru'  ? tr('Guru', 'Teacher')
       : tr('Siswa', 'Student');
}

// Jaga halaman: pastikan pengguna login DAN perannya termasuk allowed.
// Jika tidak, arahkan ke halaman yang tepat. Mengembalikan user bila lolos.
async function guardPage(allowedRoles) {
  let u;
  try {
    u = await DB.init();
  } catch (e) {
    toast(tr('Gagal terhubung ke server. Periksa koneksi internetmu.',
             'Could not connect to the server. Please check your internet connection.'), 'error');
    return null;
  }
  if (!u) { location.replace('auth.html'); return null; }
  const role = u.role || 'siswa';
  if (!allowedRoles.includes(role)) { location.replace(roleHome(role)); return null; }
  return u;
}
```

`roleHome(role)` adalah **peta 3 baris**: kasih peran, dapat nama file. Semua bagian aplikasi yang perlu "ke mana pengguna ini seharusnya pergi" memanggil fungsi ini — bukan menulis ulang if/else-nya sendiri. `roleLabel` serupa, tapi untuk teks yang ditampilkan ke pengguna (mis. badge "Guru" di kartu profil).

Yang lebih penting adalah `guardPage(allowedRoles)`. Ini dipanggil di **awal skrip setiap halaman** — `admin.html` memanggil `guardPage(['admin'])`, `guru.html` memanggil `guardPage(['guru'])`, `app.html` memanggil `guardPage(['siswa'])`. Baca urutannya:

1. **`u = await DB.init()`** — coba pulihkan sesi. Ingat dari Bab 05, ini yang memuat Firebase (atau localStorage) dan mengembalikan pengguna yang sedang login, atau `null` kalau belum ada yang login.
2. **`if (!u) { location.replace('auth.html'); return null; }`** — belum login sama sekali → lempar ke halaman masuk.
3. **`if (!allowedRoles.includes(role)) { location.replace(roleHome(role)); return null; }`** — sudah login, tapi perannya bukan yang diizinkan halaman ini → lempar **bukan** ke `auth.html`, melainkan ke halaman rumah perannya sendiri. Siswa yang nekat mengetik alamat `admin.html` di address bar akan langsung dilempar balik ke `app.html`, tanpa sempat melihat isinya sekejap pun.

### Kenapa `location.replace`, bukan `location.href`

Perhatikan `guardPage` selalu memakai `location.replace(...)`, bukan `location.href = ...`. Bedanya ada di **riwayat (history)** peramban.

- `location.href = 'auth.html'` **menambahkan** entri baru ke riwayat. Tombol Back peramban masih menyimpan halaman terkunci tadi — pengguna bisa menekan Back dan sekilas melihat kerangka halaman sebelum `guardPage` sempat melempar ulang.
- `location.replace('auth.html')` **mengganti** entri riwayat yang sekarang. Halaman terkunci tadi tak pernah tercatat sebagai "pernah dikunjungi". Tombol Back tidak akan pernah memantul ke sana.

Analoginya: `href` seperti menambah lembar baru di atas buku tamu; `replace` seperti mencoret lembar terakhir dan menulis ulang di tempat yang sama — jejak sebelumnya hilang.

> ⚠️ **Jujur soal ini:** `guardPage` hanyalah **UX** (pengalaman pengguna) — ia membuat aplikasi terasa rapi dan cepat mengarahkan orang ke tempat yang benar. Ia **bukan** keamanan sungguhan. Siapa pun yang cukup mengerti bisa mematikan JavaScript, membaca `admin.html` mentah-mentah, atau memanggil Firestore langsung dari Console peramban — `guardPage` tidak menghalangi itu sama sekali. Penjaga yang **sesungguhnya**, yang tak bisa dilewati dari sisi klien, adalah **Firestore Security Rules** yang akan kita bangun di Bab 12. Anggap `guardPage` sebagai pintu kaca yang rapi — bukan brankas.

## 2. Masalah: Firebase Auth minta email, siswa cuma ingat nama + NIS

Firebase Authentication metode Email/Password selalu butuh sebuah **alamat email** untuk setiap akun. Tapi siswa SD/SMP/SMA tidak selalu punya email, dan kalau pun punya, mereka sering lupa. Yang mereka ingat pasti: **nama lengkap** mereka, dan **NIS** (Nomor Induk Siswa) — angka yang tertulis di kartu pelajar dan rapor mereka.

Solusinya: kita **tidak mengubah** Firebase Auth (ia tetap minta email+sandi di baliknya), tapi kita membuat dua fungsi deterministik yang menyulap nama → email palsu, dan NIS → sandi. "Deterministik" artinya: masukan yang sama **selalu** menghasilkan keluaran yang sama, tidak pernah berubah-ubah atau mengandung unsur acak.

```js
// js/utils.js
const AUTH_USERNAME_DOMAIN = 'akun.tumara.id';
const AUTH_MIN_PASS = 6; // batas minimum Firebase Auth

// "Budi   Santoso Jr." → "budi.santoso.jr"
function usernameOf(nama) {
  return String(nama ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // buang diakritik (é → e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')  // spasi & tanda baca → titik
    .replace(/^\.+|\.+$/g, '');   // rapikan titik di ujung
}

// Identitas login → email untuk Firebase Auth. Bila pengguna mengetik
// email sungguhan (admin bootstrap), pakai apa adanya.
function toAuthEmail(identitas) {
  const s = String(identitas ?? '').trim();
  if (s.includes('@')) return s.toLowerCase();
  const u = usernameOf(s);
  return u ? `${u}@${AUTH_USERNAME_DOMAIN}` : '';
}

// NIS/NIP → sandi Auth. Dilengkapi '0' di depan bila < 6 karakter,
// sehingga NIS pendek (mis. "1234") tetap bisa dipakai apa adanya.
function toAuthPassword(sandi) {
  const s = String(sandi ?? '').trim();
  return s.length && s.length < AUTH_MIN_PASS ? s.padStart(AUTH_MIN_PASS, '0') : s;
}
```

Baca `usernameOf` baris demi baris, karena ini "jantung" dari trik ini:

1. **`.normalize('NFD').replace(/[\u0300-\u036f]/g, '')`** — memecah huruf berdiakritik jadi huruf dasar + tanda terpisah (mis. `é` menjadi `e` + tanda aksen), lalu **membuang** tanda aksennya. Hasilnya `é` → `e`. Ini penting untuk nama seperti "René" agar tak bergantung pada karakter Unicode yang rewel.
2. **`.toLowerCase()`** — semua huruf kecil. "Budi" dan "budi" harus jadi username yang sama, sebab Firebase membedakan besar-kecil huruf pada sebagian validasi tapi kita tak mau bergantung pada itu.
3. **`.replace(/[^a-z0-9]+/g, '.')`** — apa pun yang **bukan** huruf a-z atau angka (spasi, titik, apostrof, tanda hubung) diganti dengan satu titik. Ini yang mengubah "Budi Santoso" menjadi "budi.santoso" — dan sekaligus merapikan spasi ganda ("Budi   Santoso" tetap jadi satu titik saja, bukan tiga).
4. **`.replace(/^\.+|\.+$/g, '')`** — buang titik yang tersisa di awal atau akhir, hasil sisa dari langkah sebelumnya (mis. nama yang diawali tanda kutip).

`toAuthEmail` memanggil `usernameOf` lalu menempelkan `@akun.tumara.id` di belakangnya — domain **internal**, bukan domain sungguhan, tak pernah dipakai untuk mengirim email apa pun. Tapi ada satu percabangan penting di awalnya: `if (s.includes('@')) return s.toLowerCase();`. Kalau yang diketik pengguna sudah mengandung `@`, anggap saja itu email sungguhan (dipakai admin dan guru yang login pakai email asli) — jangan disulap.

`toAuthPassword` menyelesaikan masalah lain: Firebase Auth **mewajibkan** sandi minimal 6 karakter, tapi banyak sekolah punya NIS 4 atau 5 digit (mis. `"1234"`). `padStart(AUTH_MIN_PASS, '0')` menambahkan angka nol di depan sampai panjangnya 6: `"1234"` → `"001234"`. Ini murni pelengkapan format, bukan enkripsi apa pun.

### Kenapa fungsi yang SAMA harus dipakai saat mendaftar DAN saat masuk

Ini bukan sekadar "praktik baik", tapi **syarat mutlak**. Firebase Auth membandingkan email+sandi persis apa adanya. Kalau saat admin membuat akun Anda memakai satu cara mengubah nama jadi email, lalu saat siswa masuk Anda memakai cara yang sedikit berbeda (misalnya lupa membuang spasi ganda, atau lupa `padStart`), hasilnya **tidak akan pernah cocok** — walau nama dan NIS yang diketik sudah benar seratus persen. Karena itu `usernameOf`, `toAuthEmail`, dan `toAuthPassword` dari `js/utils.js` yang sama dipanggil di kedua tempat: `adminCreateUser` (Bab 11, saat akun dibuat) dan `login` (bab ini, saat akun dipakai). Satu fungsi, dipakai di mana-mana — bukan ditulis ulang dua kali dan berisiko berbeda.

> ⚠️ **Jujur soal batasan ini:** karena `usernameOf` hanya bergantung pada nama, **dua siswa dengan nama yang persis identik tidak bisa punya akun sekaligus** — keduanya akan menghasilkan email internal yang sama, dan Firebase menolak akun kedua sebagai "sudah dipakai". Solusinya bukan di kode, tapi di data: admin membedakan usernamenya secara manual saat membuat akun (mis. menambahkan nama tengah atau inisial kelas: `budi.santoso.7a`). Detail modal "Tambah Akun" ada di Bab 11 — untuk sekarang cukup Anda tahu kenapa pesan errornya bisa muncul.

## 3. Membangun `auth.html`

Sebelum menulis kode, ada satu hal yang perlu diluruskan: kalau Anda membuka `js/views/auth.js` di repo, Anda **tidak akan menemukan** formulir "Daftar". Hanya ada satu formulir: masuk. Ini keputusan desain yang sengaja, bukan bab yang belum selesai — dan baris komentar paling atas file itu menyatakannya gamblang:

```js
// js/views/auth.js
// Halaman ini HANYA untuk masuk. Akun guru & siswa dibuat oleh admin sekolah
// lewat admin.html — tidak ada pendaftaran mandiri.
```

Kenapa begitu? Karena akun di Tumara **mewakili identitas resmi sekolah** — NIS harus cocok dengan data di buku induk, kelas harus cocok dengan rombel sungguhan. Kalau siapa saja bisa mendaftar sendiri dengan nama dan NIS sembarang, data sekolah jadi tak bisa dipercaya, dan bisa saja ada yang mendaftar mengaku-aku sebagai siswa lain. Jadi: **admin yang membuat semua akun guru dan siswa** (lewat `DB.adminCreateUser`, Bab 11) — `auth.html` cukup menyediakan pintu masuk untuk akun yang sudah ada.

Satu-satunya pengecualian adalah **admin pertama sekolah**, yang kita bahas di Bagian 4.

Sekarang bangun `auth.html`. Urutan `<script>` penting — sama seperti Bab 05, urutan ini adalah urutan ketergantungan:

```html
<!-- auth.html -->
<div id="authScreen" class="auth-screen">
  <div class="auth-card" id="authCard"><!-- diisi oleh JS --></div>
</div>

<div id="modalRoot"></div>
<div id="toastRoot" class="toast-root"></div>

<script src="js/firebase-config.js"></script>
<script src="js/i18n.js"></script>
<script src="js/utils.js"></script>
<script src="js/db.js"></script>
<script src="js/roles.js"></script>
<script src="js/views/auth.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', async () => {
    const tema = localStorage.getItem('tumara_theme') || 'light';
    document.documentElement.dataset.theme = tema;
    try {
      const u = await DB.init();
      if (u) { location.replace(roleHome(u.role)); return; }
    } catch (e) {
      toast(tr('Gagal terhubung ke server. Periksa koneksi internetmu.',
               'Could not connect to the server. Please check your internet connection.'), 'error');
    }
    AuthView.render();
  });
</script>
```

`#toastRoot` dan `#modalRoot` adalah dua wadah kosong yang sudah dipakai `toast()` dan `openModal()` dari `js/utils.js` — keduanya kita bangun di Bab 02, jadi tinggal dipakai di sini. Skrip bootstrap di bawah melakukan hal yang sama seperti `guardPage`, tapi **kebalikannya**: kalau ternyata pengguna **sudah** login (mis. sesi masih tersimpan dari kunjungan sebelumnya), langsung lempar ke halaman rumah perannya — jangan tampilkan formulir masuk lagi ke orang yang sudah masuk.

Kalau belum login, `AuthView.render()` dipanggil. Ini bentuk formulirnya (diringkas dari `js/views/auth.js`):

```js
// js/views/auth.js — AuthView._loginForm() (diringkas)
_loginForm() {
  return `
    <form id="authForm" novalidate>
      <div class="field">
        <label>Username / Email</label>
        <input type="text" class="input" id="fEmail" name="username"
               placeholder="budi.santoso  •  guru@sekolah.sch.id" required>
      </div>
      <div class="field">
        <label>Kata sandi</label>
        <input type="password" class="input" id="fPass" name="password" required>
      </div>
      <button type="submit" class="btn btn-primary btn-block btn-lg" id="authSubmit">
        Masuk
      </button>
    </form>
    <p class="af-switch">Belum punya akun? Akun dibuat oleh admin sekolah —
       hubungi admin atau wali kelasmu.</p>`;
}
```

Satu input identitas (menerima nama/username **atau** email), satu input sandi (menerima NIS **atau** sandi asli), satu tombol. Baris terakhir itulah yang menggantikan link "Daftar" — ia mengarahkan pengguna untuk **menghubungi admin**, bukan mengisi formulir sendiri.

Sekarang bagian penanganan submit-nya (diringkas dan disederhanakan untuk pengajaran; lengkapnya di `js/views/auth.js` baris 82–127, termasuk validasi panjang minimum dan penyimpanan sandi ke pengelola sandi peramban):

```js
// js/views/auth.js — AuthView._bind() (versi ringkas)
$('#authForm').onsubmit = async e => {
  e.preventDefault();
  const btn = $('#authSubmit');
  const identitas = $('#fEmail').value.trim();
  const pass = $('#fPass').value;

  btn.disabled = true;
  try {
    const u = await DB.login(identitas, pass);
    toast(`Selamat datang, ${(u.nama || '').split(' ')[0]}!`);
    setTimeout(() => location.replace(roleHome(u.role)), 400);
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
  }
};
```

`DB.login(identitas, sandi)` — ingat dari Bab 05, ini akhirnya meneruskan ke adapter yang aktif, yang di dalamnya memanggil `toAuthEmail(identitas)` dan `toAuthPassword(sandi)` sebelum menyerahkannya ke Firebase. Kalau berhasil, `location.replace(roleHome(u.role))` melempar ke halaman yang tepat — sekali lagi `replace`, bukan `href`, dengan alasan yang sama seperti `guardPage`. Kalau gagal, `catch` menangkap `err` dan menampilkannya lewat `toast(err.message, 'error')`. Pesan errornya sendiri sudah manusiawi — bukan kode mentah Firebase seperti `auth/wrong-password` — karena adapter membungkusnya lewat peta pesan `_msg(e)` yang akan kita singgung di bagian "Kalau macet".

## 4. Bootstrap admin pertama via `ADMIN_EMAILS`

Kalau `auth.html` cuma bisa "masuk", bagaimana admin **pertama** sebuah sekolah bisa punya akun — padahal belum ada admin lain yang bisa membuatkannya lewat panel admin?

Jawabannya ada di `js/firebase-config.js`, sebuah daftar sederhana:

```js
// js/firebase-config.js
const ADMIN_EMAILS = [
  'admin@tumara.com',
  'admin@tumara.id'
];
```

Dan pola bootstrap-nya di `js/views/auth.js`:

```js
// js/views/auth.js — AuthView._bind() (pola bootstrap)
const isAdminEmail = typeof ADMIN_EMAILS !== 'undefined'
  && ADMIN_EMAILS.map(x => x.toLowerCase()).includes(identitas.toLowerCase());
let u;
try {
  u = await DB.login(identitas, pass);
} catch (loginErr) {
  // Bootstrap admin: satu-satunya pembuatan akun dari halaman ini.
  // Bila akun admin (email di ADMIN_EMAILS) belum ada, dibuat otomatis
  // saat login pertama. Selain itu, akun HANYA dibuat lewat panel admin.
  if (!isAdminEmail) throw loginErr;
  try {
    u = await DB.register({ nama: 'Administrator', email: identitas, password: pass, role: 'admin' });
  } catch (_) {
    throw loginErr; // akun ada tapi sandi salah → tampilkan error aslinya
  }
}
```

Baca alurnya sebagai cerita:

1. Coba `DB.login(...)` seperti biasa dulu.
2. Kalau **gagal**, cek: apakah email yang diketik ada di daftar `ADMIN_EMAILS`? Kalau **bukan**, langsung lempar ulang error masuk yang asli (`throw loginErr`) — orang biasa yang salah ketik sandi tetap mendapat pesan "sandi salah" seperti wajarnya.
3. Kalau **iya** email itu ada di `ADMIN_EMAILS`, coba `DB.register(...)` dengan peran `'admin'`. Ini baru berhasil kalau memang **belum ada** akun dengan email itu — inilah momen "akun admin pertama lahir".
4. Kalau `register` **juga** gagal (artinya akun sebenarnya sudah ada, tapi sandi yang diketik salah), jangan tampilkan error pendaftaran yang membingungkan — lempar lagi `loginErr` yang asli, supaya pesannya tetap "sandi salah", bukan "email sudah dipakai".

Efeknya: sekolah cukup menambahkan **satu baris** ke `ADMIN_EMAILS` sebelum deploy (mis. `admin@sekolahanda.sch.id`), lalu kepala sekolah/operator tinggal membuka `auth.html`, mengetik email itu dengan sandi pilihannya sendiri, dan menekan "Masuk". Kali pertama, itu otomatis **mendaftarkan** akun admin. Kali kedua dan seterusnya, itu tinggal **masuk** biasa. Tidak perlu seorang pun berperan sebagai "admin yang membuatkan admin lain".

## 5. Jujur soal `ADMIN_EMAILS`

> ⚠️ **Jujur soal ini:** `ADMIN_EMAILS` adalah daftar yang **dipercaya dari sisi klien** — artinya, ia hanya sebuah array JavaScript biasa di dalam `js/firebase-config.js`, file yang bisa dibaca siapa pun yang membuka DevTools peramban. Secara teori, siapa pun yang tahu isi filenya bisa mencoba mendaftar dengan email itu sebelum sekolah sempat melakukannya, atau mencoba menulis dokumen `role: 'admin'` ke akunnya sendiri langsung lewat konsol Firestore.
>
> Yang menahan ini bukan `ADMIN_EMAILS` itu sendiri, melainkan **dua lapis** lain: (1) hanya email yang benar-benar tercantum di file inilah yang dicek **di kode aplikasi** — email sembarangan tidak pernah mendapat peran admin walau mendaftar; dan (2) **Firestore Security Rules** (Bab 12) yang membatasi apa yang **boleh** ditulis siapa, terlepas dari apa kata kode di peramban. Kode klien bisa dibohongi; Security Rules yang dijalankan di server tidak bisa.
>
> Untuk skala satu sekolah, ini kompromi yang wajar: kenyamanan (admin pertama bisa masuk sendiri, tanpa campur tangan developer) ditukar dengan sedikit risiko yang ditutup oleh Security Rules. Untuk aplikasi berskala lebih besar atau lebih sensitif, pendekatan yang lebih kokoh adalah memakai **Cloud Functions** dengan **custom claims** (peran ditetapkan oleh kode yang berjalan di server, bukan dibaca dari file klien) — tapi itu di luar cakupan modul ini, dan untuk kebutuhan sekolah, `ADMIN_EMAILS` + Security Rules sudah cukup.

## 6. Onboarding siswa: kelas dan NIS

Kalau Anda perhatikan `adminCreateUser` (dibahas penuh di Bab 11) dan `DB.register`, keduanya menyimpan sebuah field bernama `profileComplete`:

```js
// js/db.js (LocalAdapter.register, disederhanakan)
profileComplete: role !== 'siswa',
```

Untuk **guru dan admin**, `profileComplete` langsung `true` — mereka tak butuh onboarding, karena Tumara tak menghitung target kalori atau air minum untuk mereka. Tapi untuk **siswa baru**, nilainya `false`. Inilah saklar yang membuat `App.afterAuth()` (di `js/app.js`) memutuskan layar mana yang ditampilkan lebih dulu:

```js
// js/app.js — App.afterAuth()
afterAuth() {
  if (DB.user.tema) this.setTheme(DB.user.tema);
  if (!DB.user.profileComplete) {
    $('#appShell').classList.add('hidden');
    $('#onboardScreen').classList.remove('hidden');
    OnboardView.render();
  } else {
    this.showApp();
  }
}
```

Kalau `profileComplete` masih `false`, `app.html` **tidak** langsung menampilkan dasbor — ia menampilkan `OnboardView` dulu. Di sanalah siswa mengisi usia, tinggi, berat badan, tingkat aktivitas (untuk menghitung target kalori dan target minum air secara otomatis — detail rumusnya bukan urusan bab ini), dan yang **paling penting untuk bab ini**: memilih **kelas** dari daftar `school_classes` (dibuat admin, dibahas Bab 11) dan mengisi **NIS**.

```js
// js/views/auth.js — OnboardView.render() (bagian kelas & NIS, diringkas)
let classes = [];
try {
  classes = (await DB.gList('school_classes'))
    .sort((a, b) => (a.urutan ?? 999999) - (b.urutan ?? 999999));
} catch (_) { classes = []; }
```

```html
<div class="field">
  <label>Kelas</label>
  <select class="select" id="obKelas" required>
    <option value="" disabled selected>Pilih kelasmu…</option>
    <!-- ...opsi dari classes... -->
  </select>
</div>
<div class="field">
  <label>NIS</label>
  <input type="text" class="input" id="obNis" inputmode="numeric" maxlength="20"
         placeholder="No. Induk Siswa">
</div>
```

Dan saat formulir disimpan:

```js
// js/views/auth.js — OnboardView, saat submit (diringkas)
await DB.updateUser({
  usia, jenisKelamin, tinggi, berat, aktivitas,
  kelasId, kelasNama, nis,
  targetKalori: tdee,
  targetAir: air.gelas,
  profileComplete: true
});
App.afterAuth();
```

**Kenapa kelas ini penting sekali**, lebih dari sekadar data pelengkap: `kelasId` yang tersimpan di akun siswa inilah satu-satunya benang yang menghubungkan siswa itu ke roster kelasnya. Nanti di Bab 10 (Portal Guru), saat seorang guru membuka halaman kelasnya dan ingin melihat daftar siswa untuk mengambil absensi, aplikasi mencari **semua akun siswa yang `kelasId`-nya sama** dengan kelas itu. Tanpa `kelasId` terisi, siswa itu — walaupun akunnya ada dan aktif — tak akan pernah muncul di daftar hadir guru mana pun. Itulah kenapa onboarding memaksa (`required`) field ini sebelum mengizinkan siswa masuk ke dasbor.

NIS pada layar onboarding sedikit berbeda perlakuannya tergantung siapa yang mengisi lebih dulu: kalau admin sudah mengetik NIS saat membuat akun (Bab 11), field ini muncul **terkunci** (`disabled`) — karena NIS itu **adalah** sandi login siswa, mengubahnya sembarangan di sini akan membuat siswa tak bisa masuk lagi lain kali. Kalau admin belum mengisinya, siswa sendiri yang mengetikkannya saat onboarding.

Detail penuh tampilan `OnboardView` — termasuk kartu pilihan jenis kelamin, rumus BMR/TDEE untuk target kalori — akan kita rapikan lebih jauh saat membangun `app.html` secara utuh di Bab 07. Untuk sekarang, cukup pahami alurnya: **`profileComplete: false` → tampilkan onboarding → simpan `kelasId` + `nis` → `profileComplete: true` → tampilkan dasbor.**

---

## ✅ Cek hasil

- [ ] Urutan `<script>` di `auth.html`: `firebase-config.js` → `i18n.js` → `utils.js` → `db.js` → `roles.js` → `views/auth.js`. Kalau terbalik, `ReferenceError` akan muncul di Console (mis. `DB is not defined`).
- [ ] Tambahkan email Anda sendiri ke `ADMIN_EMAILS` di `js/firebase-config.js`. Buka `auth.html`, ketik email itu + sandi bebas (≥6 karakter), tekan **Masuk**. Anda harus melihat toast "Selamat datang, ..." lalu diarahkan ke `admin.html`.
- [ ] Di `admin.html` (dari Bab 11 nanti, atau lewat Console `DB.adminCreateUser({...})` untuk sekarang), buat satu akun siswa dengan nama dan NIS. Buka `auth.html` lagi (atau logout dulu), masuk dengan **nama** siswa itu sebagai username dan **NIS**-nya sebagai sandi. Harus berhasil masuk dan diarahkan ke `app.html`.
- [ ] Saat siswa baru itu masuk pertama kali, layar `OnboardView` harus muncul (bukan dasbor langsung) — karena `profileComplete` masih `false`.
- [ ] Coba buka `admin.html` langsung lewat address bar **saat login sebagai siswa**. Anda harus dipantulkan balik ke `app.html`, bukan melihat isi panel admin sekejap pun.
- [ ] Buka DevTools → Console, ketik `usernameOf("  Budi   Santoso  ")` → harus menghasilkan `"budi.santoso"` (spasi ganda dan spasi pinggir hilang).

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| Error `auth/operation-not-allowed` saat masuk/mendaftar | Metode Email/Password belum diaktifkan di Firebase Console | Firebase Console → Authentication → Sign-in method → aktifkan **Email/Password** (Bab 04). |
| Siswa yakin NIS-nya benar tapi tetap "NIS / kata sandi salah" | NIS pendek (< 6 digit) tak konsisten di-`padStart` | Pastikan **baik** saat akun dibuat (`adminCreateUser`) **maupun** saat login, keduanya memanggil `toAuthPassword()` yang sama. Kalau salah satu dilewati, `"1234"` dan `"001234"` dianggap dua sandi berbeda. |
| Mendaftarkan siswa kedua dengan nama sama gagal, pesan "sudah dipakai" | `usernameOf` hanya bergantung pada nama → dua nama identik = satu email internal yang sama | Ini bukan bug, tapi batasan disengaja (lihat Bagian 2). Admin membedakan usernamenya secara manual saat membuat akun kedua. |
| Login admin bootstrap tidak pernah berhasil mendaftar | Email yang diketik tidak persis sama (huruf besar/kecil, spasi) dengan yang ada di `ADMIN_EMAILS` | `isAdminEmail` membandingkan hasil `.toLowerCase()` keduanya — pastikan tak ada spasi tersembunyi di `ADMIN_EMAILS`. |
| Siswa berhasil login tapi selalu kembali ke `OnboardView`, tak pernah sampai dasbor | `DB.updateUser({..., profileComplete: true})` gagal senyap (mis. field `undefined` tertahan `_clean`, lihat Bab 05) atau `kelasId` kosong lolos validasi | Cek Console untuk error saat submit; pastikan `select` kelas benar-benar `required` dan tervalidasi sebelum `updateUser` dipanggil. |
| Menekan Back di peramban setelah `guardPage` melempar, sebentar terlihat halaman terkunci | Memakai `location.href` alih-alih `location.replace` | Ganti semua pelemparan di `guardPage`/`AuthView` menjadi `location.replace(...)`. |

## 🧪 Latihan

1. Di Console peramban, coba `usernameOf("Muhammad  Al-Fatih")`. Tuliskan hasilnya, lalu jelaskan langkah `replace` mana yang menghasilkan tiap perubahan (spasi ganda, tanda hubung).
2. Tambahkan satu email baru ke `ADMIN_EMAILS`, lalu coba masuk dengan email itu memakai sandi yang **beda-beda** dua kali berturut-turut. Amati: percobaan pertama mendaftarkan akun, percobaan kedua (dengan sandi yang beda) harus gagal dengan pesan "sandi salah" — bukan pesan pendaftaran. Ini menguji jalur `catch(_) { throw loginErr; }` di Bagian 4.
3. ⭐ Tanpa membuka kembali bab ini, jelaskan dengan kata-kata Anda sendiri ke rekan sejawat: kenapa `guardPage` dan `AuthView` memakai `location.replace` dan bukan `location.href`? Sertakan skenario konkret tombol Back peramban dalam penjelasan Anda.

## 📌 Ringkasan

- `js/roles.js` (39 baris) menyediakan `roleHome(role)` (peta peran → halaman) dan `guardPage(allowedRoles)` (penjaga tiap halaman: belum login → `auth.html`; peran tak diizinkan → `roleHome`-nya sendiri). Ini **hanya UX**; penjaga sungguhan ada di Security Rules (Bab 12).
- `location.replace(...)` dipakai di setiap pengalihan halaman auth, supaya tombol Back peramban tak pernah memantul ke halaman yang seharusnya terkunci.
- `usernameOf`, `toAuthEmail`, `toAuthPassword` (di `js/utils.js`) mengubah nama menjadi email internal dan NIS menjadi sandi yang sah untuk Firebase Auth — deterministik, dan **wajib** dipanggil dengan cara yang identik saat akun dibuat maupun saat masuk. Konsekuensinya: dua nama yang persis sama tak bisa didaftarkan sekaligus.
- `auth.html` sengaja **hanya** punya formulir masuk — akun guru dan siswa dibuat oleh admin lewat panel admin (Bab 11), bukan pendaftaran mandiri.
- Admin pertama sekolah masuk lewat pola bootstrap: kalau login gagal tapi emailnya ada di `ADMIN_EMAILS`, aplikasi otomatis mencoba mendaftarkannya sebagai admin. `ADMIN_EMAILS` dipercaya dari sisi klien — kompromi yang wajar untuk skala sekolah, ditopang Security Rules di Bab 12.
- Siswa baru punya `profileComplete: false`, memicu `OnboardView` sebelum masuk dasbor. Field terpenting di sana adalah `kelasId` — itulah yang membuat siswa muncul di roster absensi gurunya nanti.

**Berikutnya:** [Bab 07 — Kerangka Aplikasi Siswa](07-kerangka-aplikasi-siswa.md)
