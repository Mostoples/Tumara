# Bab 08 — Membuat View Pertama

> **Tujuan bab ini:** Anda memahami "kontrak view" yang dipakai SELURUH aplikasi Tumara, lalu membangun `js/views/dashboard.js` sungguhan — halaman Beranda siswa — sebagai contoh pertama yang lengkap.

| | |
|---|---|
| **Perkiraan waktu** | ~60 menit |
| **Sebelum ini** | [Bab 07 — Kerangka Aplikasi Siswa](07-kerangka-aplikasi-siswa.md) |
| **Anda butuh** | `js/utils.js`, `js/i18n.js`, `js/db.js`, dan `js/app.js` (dari `App.VIEWS`/`App.navigate`, Bab 07) sudah ada |

## Apa yang kita bangun di bab ini

Di Bab 07 Anda membangun `App` — kerangka aplikasi yang mengurus layar mana yang sedang tampil. Tapi `App` sendiri tidak tahu apa-apa soal Beranda, Tugas, atau Ibadah. Ia hanya tahu satu hal: setiap halaman itu adalah objek yang punya method `render(el)`. Objek semacam itu, dalam bahasa Tumara, disebut **view**.

Bab ini punya dua bagian. Pertama, kita bedah **kontraknya** — aturan tak tertulis yang membuat lebih dari selusin halaman Tumara (Beranda, Tugas, Catatan, Kebiasaan, Jadwal, Fokus, Ibadah, Profil, dan halaman-halaman guru/admin) bisa hidup berdampingan tanpa saling menabrak. Kedua, kita bangun view PERTAMA sungguhan: `js/views/dashboard.js`, halaman Beranda yang dilihat siswa begitu masuk aplikasi. Di sepanjang jalan kita juga melengkapi perkenalan ke `js/utils.js` (helper DOM, toast, modal) dan `js/i18n.js` (dwibahasa) — dua file yang sudah sempat disinggung sepintas di bab-bab sebelumnya, tapi belum dibahas utuh.

Gambaran alurnya:

```
   App.navigate('dashboard')
          │
          ▼
   Dashboard.render(el)   ← el = elemen <div id="view">
          │
          │  1. fetch    (ambil data: DB.list, Ibadah._today)
          │  2. derive   (olah jadi bentuk siap tampil)
          │  3. innerHTML (satu template literal, seluruh HTML)
          │  4. bind     (pasang event listener)
          ▼
   Beranda tampil, kartu bisa diklik, sapaan sesuai jam
```

---

## 1. Kontrak view — ide paling penting di bab ini

Sebuah **view** di Tumara hanyalah objek JavaScript biasa dengan SATU method wajib:

```js
const NamaView = {
  async render(el) {
    // ... isi halaman ...
  }
};
```

Itu saja. Tidak ada `class`. Tidak ada `constructor`. Tidak ada `mount()`/`unmount()`/`destroy()` seperti yang biasa Anda temui di framework besar (React, Vue). `App` (Bab 07) hanya butuh satu hal dari sebuah view: bisa dipanggil `view.render(el)`, dan `el` adalah elemen `<div id="view">` di `app.html` — wilayah tempat seluruh isi halaman itu digambar.

> **Analogi sekolah:** bayangkan `el` adalah **papan tulis kelas** yang sama, dipakai bergantian oleh semua guru mata pelajaran. Kontrak viewnya sederhana: "kalau giliranmu mengajar, hapus papan lalu tulis materimu sendiri di sana." Guru IPA tak perlu tahu apa yang ditulis guru Matematika sebelumnya — ia cukup tahu cara menghapus dan menulis papan itu.

Kontrak ini berlaku **dua arah**. Mari lihat keduanya.

**Arah App → view** (App memanggil view):

- `view.render(el)` — dipanggil setiap kali route berpindah (`App.navigate`) atau halaman perlu disegarkan (`App.refresh`). `el` selalu `$('#view')`.
- `view.tab` — properti OPSIONAL. Kalau sebuah view punya beberapa sub-halaman dalam satu route (mis. halaman Ibadah punya tab Sholat/Qur'an/Dzikir/Zakat), ia menyimpan tab aktifnya di properti ini, dan `App` tahu cara membaca-tulisnya lewat URL hash. Detail lengkap soal view bertab ada di Bab 09 — cukup diingat dulu bahwa properti ini ada.

**Arah view → App** (view memanggil balik App), lihat di `js/app.js` yang Anda bangun Bab 07:

- `App.navigate(route)` — pindah ke route lain. Dipanggil, misalnya, saat kartu Beranda diklik.
- `App.refresh()` — render ulang view yang SEDANG aktif, tanpa berpindah route. Dipanggil view setelah menyimpan atau menghapus sesuatu, supaya tampilan langsung mencerminkan data terbaru.
- `App.saveTab(tab)` — dipanggil view bertab saat penggunanya mengganti tab, supaya tab aktif ikut tersimpan di URL (bertahan saat direfresh browser).
- `App.route` — string berisi route yang sedang aktif (mis. `'dashboard'`), kalau sebuah view perlu tahu di mana dirinya sendiri berada.

Karena kontraknya sesempit ini — satu method, dua-tiga panggilan balik — menambah halaman baru ke Tumara semudah menulis satu objek baru dan mendaftarkannya. Tidak ada API rumit yang harus dihafal.

## 2. Pola render 4 fase — SELALU begini di semua view Tumara

Buka `render()` mana pun di seluruh folder `js/views/`, dan Anda akan selalu menemukan urutan yang sama. Ini bukan kebetulan — ini pola yang sengaja diulang supaya kode enak dibaca siapa pun yang sudah kenal satu view, pasti langsung kenal semuanya.

**Fase 1 — Fetch.** Ambil semua data yang dibutuhkan halaman, SEKALIGUS di awal, dengan `Promise.all` bila lebih dari satu sumber:

```js
const [tasks, ibadahRec] = await Promise.all([
  DB.list('tasks'), Ibadah._today()
]);
```

Kenapa `Promise.all` dan bukan dua `await` berurutan? Karena dua panggilan itu tidak saling bergantung — hasil `DB.list('tasks')` tidak dibutuhkan untuk memanggil `Ibadah._today()`. Kalau ditulis berurutan (`await DB.list(...)` lalu `await Ibadah._today()`), permintaan kedua baru dikirim SETELAH permintaan pertama selesai — total waktu tunggu jadi dijumlah. Dengan `Promise.all`, keduanya dikirim bersamaan dan Anda menunggu selama yang PALING LAMA saja, bukan jumlah keduanya.

Perhatikan juga: `Dashboard` memanggil `Ibadah._today()` — fungsi milik view LAIN. Ini sah dan lumrah di Tumara; satu view boleh memanggil fungsi bantu view lain kalau memang membutuhkan datanya (di sini, Beranda perlu tahu ringkasan ibadah hari ini untuk kartunya sendiri). Detail `Ibadah._today()` akan dibahas tuntas saat kita membangun `js/views/ibadah.js`.

**Fase 2 — Derive** ("menurunkan" data mentah jadi bentuk siap tampil). Di sini tak ada yang istimewa secara teknis — ini `filter`, `sort`, `map` array JavaScript biasa yang sudah Anda kenal. Yang penting: kerjakan SEMUA olahan di sini, SEBELUM menyentuh `innerHTML`. Jangan mencampur logika olah-data ke dalam template HTML — kalau bercampur, template jadi susah dibaca dan susah dites.

**Fase 3 — Satu `innerHTML`.** SELURUH HTML view ditulis dalam SATU template literal, ditugaskan sekali ke `el.innerHTML`. Tidak dicicil (`el.innerHTML += ...` berkali-kali), tidak dipecah jadi banyak `appendChild`. Alasannya sederhana: satu penugasan `innerHTML` berarti satu kali browser menyusun ulang tampilan, dan kodenya tetap terbaca sebagai "beginilah bentuk halaman ini" — mirip menulis dokumen HTML biasa.

**Fase 4 — Bind.** SETELAH `innerHTML` selesai ditugaskan, baru pasang event listener (`.onclick`, dsb). Ini urutan yang WAJIB, bukan sekadar kebiasaan — dan alasannya penting untuk dipahami:

> ⚠️ **Ingat baik-baik:** menugaskan `el.innerHTML = '...'` MENGHAPUS seluruh elemen anak yang lama, TERMASUK event listener yang sudah terpasang di sana — dan itu terjadi TANPA ERROR. Kalau Anda memasang listener SEBELUM `innerHTML`, listener itu langsung lenyap begitu `innerHTML` dijalankan; tombolnya akan tampak normal tapi tak bereaksi diklik, tanpa pesan kesalahan apa pun di Console.

Justru karena perilaku "hapus total" ini, view Tumara TIDAK PERNAH khawatir soal listener yang menumpuk atau bocor memori. Setiap kali `render()` dipanggil ulang (lewat `App.refresh()`, misalnya), `innerHTML` baru menyapu bersih semuanya, lalu fase bind memasang listener yang baru dari nol. Tak ada "listener lama + listener baru" berbarengan — selalu bersih dan tunggal. Ini salah satu alasan kenapa Tumara tidak butuh framework rumit untuk urusan yang di framework lain biasa disebut "cleanup" atau "unmount".

## 3. `$` dan `$$` yang di-scope

Dari Bab 02 Anda sudah kenal dua fungsi ini di `js/utils.js`:

```js
// js/utils.js — baris 5-6
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
```

Yang perlu diperdalam di sini adalah parameter KEDUA, `root`. Nilai bawaannya `document` — seluruh halaman. Tapi lihat cara `Dashboard` memakainya:

```js
// js/views/dashboard.js — baris 102-105
$$('[data-goto]', el).forEach(c => c.onclick = () => App.navigate(c.dataset.goto));
$('#qaTask', el).onclick = () => Prod.openTaskModal();
```

Parameter kedua diisi `el` — elemen `#view` milik Dashboard sendiri. Artinya `$('#qaTask', el)` mencari elemen ber-id `qaTask` HANYA di dalam `el`, bukan di seluruh dokumen.

Ini kenapa penting: bayangkan halaman Tugas JUGA punya tombol dengan id `#qaTask` di suatu tempat (kebetulan nama sama, atau memang sengaja disalin dari Dashboard). Kalau `Dashboard` memakai `$('#qaTask')` TANPA parameter kedua, ia mencari ke SELURUH `document` — dan karena `id` semestinya unik, HTML dengan dua elemen ber-id sama sebenarnya sudah salah, tapi kalaupun terjadi (atau kalau selektornya pakai class yang memang boleh berulang, seperti `.qa-btn`), pencarian tanpa scope bisa menangkap elemen milik view LAIN yang kebetulan masih tertinggal di DOM.

Dengan selalu menyisipkan `el` sebagai wilayah pencarian, setiap view HANYA mencari elemen di dalam wilayahnya sendiri. Inilah kenapa view-view Tumara tidak saling bentrok walau ditulis oleh orang berbeda, di waktu berbeda, tanpa koordinasi ketat soal penamaan. **Aturan praktisnya: di dalam `render(el)`, HAMPIR SELALU tulis `$(sel, el)` dan `$$(sel, el)` — jarang sekali ada alasan sah memakai `document` langsung di dalam sebuah view.**

## 4. `esc()` — wajib untuk data pengguna

```js
// js/utils.js — baris 8-12
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
```

Fungsi ini mengubah karakter yang punya arti khusus dalam HTML (`&`, `<`, `>`, `"`, `'`) menjadi kode escape-nya (`&amp;`, `&lt;`, dst.), sehingga teks tersebut ditampilkan APA ADANYA sebagai teks, bukan diperlakukan sebagai bagian dari struktur HTML.

Kenapa ini wajib? Ini menjaga dari **XSS** (*Cross-Site Scripting*), dijelaskan sesederhana mungkin: setiap kali Anda menaruh teks yang berasal dari PENGGUNA atau dari DATABASE ke dalam `innerHTML`, browser tidak tahu bedanya "ini teks biasa" dan "ini kode HTML". Kalau seorang siswa (sengaja atau iseng) mengisi kolom nama dengan `<script>...</script>` atau `<img onerror="...">`, dan nama itu ditaruh mentah-mentah ke `innerHTML` halaman lain (misalnya daftar siswa yang dilihat guru), browser akan MENJALANKAN kode itu — bukan menampilkannya sebagai teks. Itulah XSS: teks pengguna dianggap kode, dan orang jahat bisa menyisipkan kode berbahaya lewat kolom yang seharusnya cuma berisi nama.

Aturannya sederhana dan berlaku di SELURUH Tumara:

- **SELALU** bungkus dengan `esc()` teks yang berasal dari pengguna atau database, saat teks itu ditaruh di dalam `innerHTML`. Contoh di `Dashboard`: `esc((user.nama || '').split(' ')[0])`, `esc(t.judul)`.
- **TAK PERLU** `esc()` untuk teks yang ANDA TULIS SENDIRI di dalam kode (label tombol, judul section) — itu bukan data yang bisa diisi orang lain, jadi tidak punya risiko yang sama. Anda bisa lihat ini di `Dashboard`: `tr('Aksi Cepat', 'Quick Actions')` tidak dibungkus `esc()` karena teksnya tertulis langsung di file, bukan diambil dari data.

Lupa satu `esc()` saja pada tempat yang salah biasanya cuma bikin tampilan aneh (nama siswa yang mengandung tanda `<` merusak layout). Tapi risikonya bisa lebih jauh dari sekadar tampilan berantakan — jadi jadikan kebiasaan, bukan sesuatu yang dipikir ulang tiap kali.

## 5. `toast()` dan modal — `openModal`/`closeModal`/`confirmDialog`

### Toast — notifikasi kecil yang muncul lalu hilang sendiri

```js
// js/utils.js — baris 171-184
function toast(msg, type = 'success') {
  const icons = {
    success: 'checkmark-circle', error: 'close-circle',
    warning: 'warning', info: 'information-circle'
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<ion-icon name="${icons[type] || icons.info}"></ion-icon><span>${esc(msg)}</span>`;
  $('#toastRoot').appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 320);
  }, 2800);
}
```

Dipanggil dari mana saja dengan `toast('Tersimpan!')` atau `toast('Gagal menyimpan', 'error')`. Perhatikan `esc(msg)` di dalamnya — bahkan pesan toast pun di-escape, karena pesan toast kadang menyertakan data (mis. nama file yang gagal diunggah). Toast ditaruh ke dalam `#toastRoot`, sebuah elemen tetap di `app.html` di luar `#view`, lalu hilang sendiri setelah 2,8 detik (kelas `leaving` memicu animasi keluar lewat CSS, baru dihapus dari DOM 320 milidetik kemudian).

### Modal — kotak dialog di tengah layar

```js
// js/utils.js — baris 188-214
function openModal({ title, body, onMount }) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3>${esc(title)}</h3>
        <button class="mini-icon-btn" data-close><ion-icon name="close"></ion-icon></button>
      </div>
      <div class="modal-body">${body}</div>
    </div>`;
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('[data-close]')) closeModal();
  });
  $('#modalRoot').appendChild(overlay);
  document.body.style.overflow = 'hidden';
  if (onMount) onMount(overlay);
  const firstInput = overlay.querySelector('input, select, textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 60);
  return overlay;
}

function closeModal() {
  $('#modalRoot').innerHTML = '';
  document.body.style.overflow = '';
}
```

Perhatikan kontrak tiga parameternya — ini penting supaya Anda tidak salah pakai:

- **`title`** — DI-ESCAPE (`esc(title)`). Ini teks biasa, aman diperlakukan sebagai teks murni.
- **`body`** — **TIDAK** di-escape. Ditaruh mentah-mentah ke `innerHTML`. Ini disengaja: `body` adalah MARKUP HTML Anda sendiri (form, tombol, dsb.), bukan teks pengguna. Kalau `body` di-escape, tag `<input>` Anda akan tampil sebagai teks `&lt;input&gt;` alih-alih menjadi kolom isian sungguhan. Konsekuensinya: kalau di dalam `body` Anda menyisipkan data pengguna (mis. nilai lama sebuah input), ANDA sendiri yang wajib membungkusnya dengan `esc()` di titik penyisipan itu — `openModal` tidak melakukannya untuk Anda.
- **`onMount(overlay)`** — fungsi opsional yang dipanggil SETELAH modal ditaruh ke DOM. Di sinilah Anda memasang event listener untuk elemen di dalam modal (pola fase-bind yang sama seperti `render()`, hanya berlaku untuk modal).

`closeModal()` cukup mengosongkan `#modalRoot` — sama seperti `innerHTML` di view, ini otomatis membuang semua listener modal yang lama.

### `confirmDialog` — modal konfirmasi siap pakai

Dibangun DI ATAS `openModal`, jadi Anda tak perlu menulis modal konfirmasi dari nol tiap kali butuh "Anda yakin?":

```js
// js/utils.js — baris 305-323
function confirmDialog(message, { title, okText, danger = false } = {}) {
  title = title || tr('Konfirmasi', 'Confirmation');
  okText = okText || tr('Ya, lanjutkan', 'Yes, continue');
  return new Promise(resolve => {
    openModal({
      title,
      body: `
        <p style="font-size:.9rem;color:var(--text-2);line-height:1.6;">${esc(message)}</p>
        <div style="display:flex;gap:10px;margin-top:22px;">
          <button class="btn btn-block" id="cfNo">${tr('Batal', 'Cancel')}</button>
          <button class="btn btn-block ${danger ? 'btn-danger' : 'btn-primary'}" id="cfYes">${esc(okText)}</button>
        </div>`,
      onMount(el) {
        $('#cfNo', el).onclick  = () => { closeModal(); resolve(false); };
        $('#cfYes', el).onclick = () => { closeModal(); resolve(true); };
      }
    });
  });
}
```

`confirmDialog` mengembalikan sebuah **Promise** — objek yang mewakili "jawaban yang belum tentu datang sekarang, tapi akan datang nanti". Karena itu ia dipakai dengan `await`, dan kode setelahnya HANYA berjalan setelah pengguna benar-benar mengklik salah satu tombol:

```js
if (!await confirmDialog('Hapus tugas ini?')) return;
await DB.remove('tasks', id);
App.refresh();
```

Baris pertama menahan eksekusi sampai pengguna mengklik "Batal" (Promise selesai dengan `false`, jadi `!false` → `true` → `return`, hapus dibatalkan) atau "Ya, lanjutkan" (`true`, lanjut ke baris berikutnya). Pola tiga baris ini — `confirmDialog` lalu `DB.remove` lalu `App.refresh()` — akan Anda lihat berulang di hampir semua tombol hapus di seluruh Tumara.

## 6. `tr()` dan `I18N` — dwibahasa tanpa kamus

Tumara mendukung dua bahasa, Indonesia dan Inggris. Tapi kalau Anda pernah melihat aplikasi dwibahasa lain, Anda mungkin membayangkan ada file kamus terpisah semacam `id.json` / `en.json`, berisi `{ "home": "Beranda" }`, lalu kode memanggil `t('home')`.

**Tumara TIDAK memakai pola itu.** Filosofinya berbeda: SETIAP teks ditulis DUA KALI, langsung di tempat teks itu dipakai:

```js
// js/i18n.js — baris 47
function tr(id, en) { return I18N.lang === 'en' ? (en ?? id) : id; }
```

Dipakai begini: `tr('Beranda', 'Home')`. Kalau bahasa aktif Indonesia, `tr()` mengembalikan `'Beranda'`; kalau Inggris, `'Home'`. Tidak ada kunci (`'home'`) yang harus dicocokkan ke file lain — teks Indonesia dan Inggrisnya ada BERDAMPINGAN, di baris yang sama, di kode yang sama.

Ini pilihan desain dengan trade-off yang jujur perlu diakui:

- **Kelebihannya:** Anda tidak akan pernah lupa menerjemahkan sesuatu — begitu Anda menulis teks baru, Anda LANGSUNG diminta menulis versi Inggrisnya di parameter kedua, di baris yang sama. Tak ada file kamus terpisah yang bisa "ketinggalan sinkron" dari kode. Kode juga lebih gampang dibaca: Anda langsung tahu APA yang ditampilkan, tanpa lompat ke file lain untuk mencari arti sebuah kunci.
- **Kekurangannya:** setiap teks jadi dua kali lebih panjang untuk ditulis (dan dibaca) di kode. Dan pola ini hanya praktis untuk DUA bahasa — kalau suatu hari Tumara perlu bahasa ketiga, `tr(id, en)` harus dirombak jadi sesuatu yang lain (mis. objek `{id, en, ar}`), dan SETIAP pemanggilan `tr()` di seluruh aplikasi perlu disentuh.

Untuk ukuran aplikasi sekolah dengan dua bahasa tetap, trade-off ini masuk akal: kesederhanaan sehari-hari lebih diutamakan daripada skalabilitas ke banyak bahasa yang belum tentu dibutuhkan.

Bahasa aktif dan pengaturannya disimpan di objek `I18N`:

```js
// js/i18n.js — baris 14-28 (diringkas)
const I18N = {
  lang: localStorage.getItem('tumara_lang') === 'en' ? 'en' : 'id',

  set(lang, { save = true } = {}) {
    this.lang = lang === 'en' ? 'en' : 'id';
    localStorage.setItem('tumara_lang', this.lang);
    document.documentElement.lang = this.lang;
    this.applyStatic();
    if (save && typeof DB !== 'undefined' && DB.user && DB.user.bahasa !== this.lang) {
      DB.updateUser({ bahasa: this.lang }).catch(() => {});
    }
  },

  toggle() { this.set(this.lang === 'id' ? 'en' : 'id'); }
};
```

- **`lang`** — `'id'` atau `'en'`, bahasa yang sedang aktif. Nilai awalnya diambil dari `localStorage`, jadi bahasa yang dipilih pengguna bertahan walau browser ditutup.
- **`set(lang)`** — mengganti bahasa aktif, menyimpannya ke `localStorage` (bertahan di perangkat ini), dan — kalau pengguna sudah login (`DB.user`) — juga menyimpannya ke profil akun lewat `DB.updateUser({ bahasa: ... })`, supaya bahasa ikut pengguna itu ke perangkat LAIN saat ia login di sana.
- **`toggle()`** — tukar ke bahasa sebaliknya. Inilah yang dipanggil tombol ganti-bahasa di header (`App.toggleLang()` di `js/app.js`).

`applyStatic()` mengurus teks STATIS di HTML (yang ditandai atribut `data-en="..."`) — dipakai untuk teks yang tak pernah berubah dinamis, misalnya di `auth.html`. Tapi untuk hampir SEMUA teks di dalam view (yang dirender lewat JavaScript, seperti `Dashboard`), Anda memakai `tr()` langsung di dalam template literal, bukan `data-en`.

### Kenapa judul route harus FUNGSI, bukan nilai tetap

Perhatikan cara `App.TITLES` didefinisikan di `js/app.js` (dibangun Bab 07):

```js
// js/app.js — baris 12
dashboard: [() => tr('Beranda', 'Home'), () => fmtDate(todayStr(), { weekday: true })],
```

Judulnya BUKAN `tr('Beranda', 'Home')` langsung (yang akan langsung dievaluasi menjadi string `'Beranda'` atau `'Home'` SAAT `app.js` pertama kali dimuat, dan menetap begitu selamanya). Judulnya adalah `() => tr('Beranda', 'Home')` — sebuah FUNGSI yang, kalau DIPANGGIL, baru mengevaluasi `tr()` saat itu juga.

Ini penting karena `TITLES` didefinisikan SEKALI saat halaman dimuat, tapi bahasa bisa berganti KAPAN SAJA setelahnya (pengguna klik tombol ganti-bahasa). Kalau judulnya nilai tetap, ganti bahasa tak akan pernah mengubah judul header — ia sudah "membeku" dalam bahasa saat halaman pertama dibuka. Dengan judul berupa fungsi, `App.navigate()` memanggil `judul()` SETIAP kali route dirender (lihat `js/app.js` baris 171-173: `const [judul, sub] = this.TITLES[route]; $('#pageTitle').textContent = judul();`), sehingga nilai terbarunya SELALU dihitung ulang sesuai bahasa yang aktif SAAT itu.

Aturan yang sama berlaku untuk hal apa pun yang bergantung bahasa tapi dihitung/disimpan lebih awal dari saat ditampilkan: bungkus jadi fungsi, jangan simpan hasilnya sebagai nilai tetap.

## 7. Membangun `js/views/dashboard.js` sungguhan

Sekarang kita bedah view PERTAMA Tumara secara utuh — 107 baris, view paling sederhana di seluruh aplikasi, karena itu cocok jadi contoh pembuka. Berikut seluruh isinya:

```js
// js/views/dashboard.js
/* ============================================================
   TUMARA — Beranda (Dashboard)
   Ringkasan Tugas & Ibadah + aksi cepat
   (Kesehatan, Keuangan, Ensiklopedia dihapus dari aplikasi siswa —
   lihat js/app.js. Skor Keseimbangan 3-pilar ikut dihapus karena
   dua pilarnya sudah tak ada halamannya lagi.)
   ============================================================ */

const Dashboard = {

  async render(el) {
    const user = DB.user;
    const [tasks, ibadahRec] = await Promise.all([
      DB.list('tasks'), Ibadah._today()
    ]);

    /* --- data tugas --- */
    const aktif = tasks.filter(t => t.status !== 'selesai')
      .sort((a, b) => prioUrut(a.prioritas) - prioUrut(b.prioritas)
                   || (a.tenggat || '9999-99-99').localeCompare(b.tenggat || '9999-99-99'));
    const dueToday = aktif.filter(t => t.tenggat === todayStr()).length;

    /* --- data ibadah hari ini --- */
    const doneMap = ibadahRec.done || {};
    const ibadahItems = Ibadah.SEKOLAH;
    const ibadahTotal = ibadahItems.length;
    const ibadahSelesai = ibadahItems.filter(i => doneMap[i.key]).length;
    const ibadahPct = ibadahTotal ? Math.round(ibadahSelesai / ibadahTotal * 100) : 0;

    el.innerHTML = `...(lihat bagian selanjutnya)...`;

    /* --- interaksi --- */
    $$('[data-goto]', el).forEach(c => c.onclick = () => App.navigate(c.dataset.goto));
    $('#qaTask', el).onclick = () => Prod.openTaskModal();
    $('#qaFocus', el).onclick = () => App.navigate('fokus');
  }
};
```

*(Versi ringkas untuk ditelusuri per bagian di atas; seluruh isi `el.innerHTML`, termasuk kartu HTML lengkap, ada di file aslinya `js/views/dashboard.js` baris 31-99 — kita bedah isinya bagian per bagian di bawah.)*

Perhatikan strukturnya persis mengikuti empat fase dari Bagian 2:

### Fase Fetch (baris 12-15)

```js
const user = DB.user;
const [tasks, ibadahRec] = await Promise.all([
  DB.list('tasks'), Ibadah._today()
]);
```

`DB.user` bukan panggilan async (lihat Bab 05) — ia langsung memberi objek pengguna yang sedang login, jadi tidak ikut di dalam `Promise.all`. Dua yang lain, `DB.list('tasks')` dan `Ibadah._today()`, sama-sama butuh waktu (baca data), jadi dijalankan berbarengan.

### Fase Derive (baris 17-29)

```js
// Prioritas dulu (P1 → P3), lalu tenggat — yang krusial tampil paling atas.
const aktif = tasks.filter(t => t.status !== 'selesai')
  .sort((a, b) => prioUrut(a.prioritas) - prioUrut(b.prioritas)
               || (a.tenggat || '9999-99-99').localeCompare(b.tenggat || '9999-99-99'));
const dueToday = aktif.filter(t => t.tenggat === todayStr()).length;
```

Ini `filter` dan `sort` array JavaScript standar, tanpa keajaiban Tumara apa pun:

- `filter(t => t.status !== 'selesai')` — buang tugas yang sudah selesai; Beranda hanya menyoroti yang MASIH perlu dikerjakan.
- `.sort(...)` dengan dua kriteria sekaligus (memakai `||`): pertama urutkan berdasarkan `prioUrut(a.prioritas) - prioUrut(b.prioritas)` (prioritas tinggi/P1 dulu — `prioUrut` ada di `js/utils.js` baris 562, mengembalikan angka urut 0/1/2 dari `PRIORITAS`). KALAU prioritasnya sama (hasil pengurangan `0`, dianggap "salah" oleh `||` sehingga lanjut ke kriteria kedua), baru dibandingkan `tenggat` (tanggal jatuh tempo) dengan `localeCompare` — karena format `tenggat` adalah string `'YYYY-MM-DD'`, membandingkannya sebagai TEKS otomatis sama hasilnya dengan membandingkan sebagai TANGGAL (format tahun-bulan-tanggal memang dirancang supaya begitu). Tugas tanpa `tenggat` diberi nilai `'9999-99-99'` supaya selalu terdorong ke paling bawah.
- `dueToday` — hitung berapa dari tugas aktif yang tenggatnya PERSIS hari ini (`t.tenggat === todayStr()`), dipakai untuk pesan peringatan di kartu hero.

Bagian ibadah polanya sama: ambil `doneMap` (peta ibadah yang sudah ditandai selesai hari ini), lalu hitung `ibadahSelesai` dari total `ibadahItems`, lalu hitung persentasenya. Semua olahan matang SEBELUM menyentuh `innerHTML`.

### Fase innerHTML (baris 31-99)

Ini bagian terpanjang — satu template literal raksasa. Alih-alih menempelkan seluruhnya di sini, mari lihat potongan pentingnya satu per satu.

**Kartu hero (sapaan)**, langsung di bagian atas:

```js
<div class="hero-card">
  <div>
    <div class="hero-greet">${greeting()}, ${esc((user.nama || '').split(' ')[0])}! 👋</div>
    <div class="hero-date">${fmtDate(todayStr(), { weekday: true })}</div>
    <p class="hero-msg">${dueToday > 0
      ? tr(`📌 ${dueToday} tugas jatuh tempo hari ini.`, `📌 ${dueToday} task${dueToday > 1 ? 's' : ''} due today.`)
      : tr('Semoga harimu lancar & berkah 🌱', 'Hope your day is smooth & blessed 🌱')}</p>
  </div>
</div>
```

- `greeting()` memberi sapaan sesuai jam (dibahas Bagian 8).
- `esc((user.nama || '').split(' ')[0])` — ambil KATA PERTAMA dari nama lengkap pengguna (mis. "Budi" dari "Budi Santoso"), dan WAJIB `esc()` karena `user.nama` adalah data yang pernah diisi pengguna sendiri saat mendaftar.
- Pesan di `hero-msg` bercabang: kalau ada tugas jatuh tempo hari ini, tampilkan peringatannya (dengan `tr()` yang bahkan menyesuaikan bentuk jamak Inggris — `task` vs `tasks` — lewat `${dueToday > 1 ? 's' : ''}`); kalau tidak, tampilkan sapaan santai.

**Kartu ringkasan Tugas**, dengan `data-goto` untuk navigasi:

```js
<div class="card pillar-card hoverable" data-goto="tugas">
  ...
  ${aktif.length ? `
    <div style="display:flex;flex-direction:column;gap:9px;">
      ${aktif.slice(0, 3).map(t => `
        <div style="...">
          ${prioTag(t.prioritas)}
          <span style="...">${esc(t.judul)}</span>
          ${t.tenggat ? deadlineBadge(t.tenggat) : ''}
        </div>`).join('')}
    </div>` : `
    <div class="empty-state" style="...">
      <div class="es-title">${tr('Tidak ada tugas aktif', 'No active tasks')}</div>
    </div>`}
</div>
```

Perhatikan `aktif.slice(0, 3).map(...).join('')` — pola umum untuk menggambar DAFTAR di dalam template literal: `.map()` mengubah tiap item jadi potongan HTML, `.join('')` menyambung semua potongan itu jadi satu string tanpa pemisah. Perhatikan juga `esc(t.judul)` — judul tugas adalah teks yang diketik GURU saat membuat tugas, jadi termasuk data yang WAJIB di-escape. Kalau `aktif` kosong, cabang lain menampilkan `empty-state` — pesan ramah "tidak ada tugas", bukan area kosong membingungkan.

`div` pembungkusnya diberi atribut `data-goto="tugas"` — inilah yang dibaca fase Bind untuk tahu ke route mana harus berpindah saat kartu ini diklik.

### Fase Bind (baris 101-105)

```js
$$('[data-goto]', el).forEach(c => c.onclick = () => App.navigate(c.dataset.goto));
$('#qaTask', el).onclick = () => Prod.openTaskModal();
$('#qaFocus', el).onclick = () => App.navigate('fokus');
```

- `$$('[data-goto]', el)` — cari SEMUA elemen (di dalam `el`, ingat Bagian 3) yang punya atribut `data-goto`, lalu pasangkan `onclick` yang membaca NILAI atribut itu (`c.dataset.goto`, mis. `"tugas"` atau `"ibadah"`) dan memanggil `App.navigate(...)` dengannya. Satu baris ini menghidupkan navigasi untuk KEDUA kartu ringkasan sekaligus, tanpa menulis dua listener terpisah.
- `#qaTask` — tombol "+ Tugas" memanggil `Prod.openTaskModal()`, membuka modal tambah tugas milik view `Prod` (akan dibahas Bab 09).
- `#qaFocus` — tombol "Timer Fokus" langsung `App.navigate('fokus')`.

## 8. `greeting()` dan `fmtDate()`/`todayStr()`

Tiga fungsi kecil dari `js/utils.js` yang dipakai `Dashboard`, layak dikenal:

```js
// js/utils.js — baris 161-167
function greeting() {
  const h = new Date().getHours();
  if (h < 11) return tr('Selamat pagi', 'Good morning');
  if (h < 15) return tr('Selamat siang', 'Good afternoon');
  if (h < 18) return tr('Selamat sore', 'Good evening');
  return tr('Selamat malam', 'Good evening');
}
```

Sapaan sederhana berdasarkan jam saat ini: sebelum jam 11 pagi, sebelum jam 3 sore, sebelum jam 6 sore, atau setelahnya. Perhatikan `tr()` di dalamnya — versi Inggrisnya untuk "sore" dan "malam" sama-sama `'Good evening'` (Bahasa Inggris tak selalu membedakan keduanya seketat Bahasa Indonesia — pilihan wajar, bukan kesalahan).

```js
// js/utils.js — baris 85-88
function todayStr(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
```

Ini fungsi yang WAJIB Anda perhatikan baik-baik: `todayStr()` sengaja TIDAK memakai `d.toISOString()`, walau `toISOString()` terlihat seperti jalan pintas yang jauh lebih pendek untuk mendapat format `YYYY-MM-DD`. Alasannya: `toISOString()` selalu mengonversi tanggal ke **UTC** terlebih dulu sebelum memformatnya. Kalau siswa Anda berada di zona waktu WIB (UTC+7) dan membuka aplikasi pukul 00:30 dini hari, tanggal LOKAL sudah berganti ke hari baru — tapi dikonversi ke UTC, jamnya baru pukul 17:30 hari SEBELUMNYA. `toISOString()` akan mengembalikan tanggal KEMARIN, padahal bagi siswa itu sudah HARI INI. Bug seperti ini sangat halus — hanya muncul di jam-jam tertentu, dan gampang lolos dari pengujian siang hari.

`todayStr()` sebaliknya memakai `d.getFullYear()`, `d.getMonth()`, `d.getDate()` — semuanya membaca komponen tanggal dalam ZONA WAKTU LOKAL perangkat, sama seperti yang dilihat manusia di jam dinding. `p()` di dalamnya sekadar menambahkan `0` di depan angka satu digit (`5` → `"05"`) supaya formatnya selalu dua digit, sesuai standar `YYYY-MM-DD`.

```js
// js/utils.js — baris 100-106
function fmtDate(iso, { weekday = false, short = false } = {}) {
  const d = parseDate(iso);
  if (!d || isNaN(d)) return '-';
  const bulan = short ? BULAN[d.getMonth()].slice(0, 3) : BULAN[d.getMonth()];
  const base = `${d.getDate()} ${bulan} ${d.getFullYear()}`;
  return weekday ? `${HARI[d.getDay()]}, ${base}` : base;
}
```

`fmtDate('2026-07-17', { weekday: true })` mengubah string `YYYY-MM-DD` jadi format tanggal Indonesia yang enak dibaca manusia, mis. `"Jumat, 17 Juli 2026"`. `BULAN` dan `HARI` sendiri diambil dari `js/i18n.js` (baris 51-59) — dan keduanya BUKAN array tetap, melainkan `Object.defineProperty` dengan `get` yang membaca `I18N.lang` setiap kali diakses, sehingga otomatis berganti ke `'Friday, 17 July 2026'` saat bahasa aktif Inggris — pola "hitung ulang saat dipakai" yang sama seperti judul route di Bagian 6.

## 9. Daftarkan ke router

Dua langkah terakhir supaya Beranda benar-benar bisa dibuka:

**Satu**, tambahkan entri `dashboard` ke `App.VIEWS` di `js/app.js` (dari Bab 07):

```js
// js/app.js
VIEWS: {
  dashboard: () => Dashboard,
  // ...route lain ditambahkan di bab-bab berikutnya
},
```

Perhatikan nilainya adalah FUNGSI yang mengembalikan `Dashboard` (`() => Dashboard`), bukan `Dashboard` langsung. Ini supaya `App.VIEWS[route]()` selalu memanggil fungsi itu SAAT dibutuhkan (Bab 07 sudah menjelaskan alasannya: beberapa route berbagi satu objek view yang sama, mis. `tugas`/`catatan`/`kebiasaan` semuanya memakai `Prod`).

**Dua**, muat scriptnya di `app.html`, SEBELUM `js/app.js` (urutan `<script>` = urutan ketergantungan, seperti sudah Anda pelajari di bab-bab sebelumnya):

```html
<script src="js/db.js"></script>
<script src="js/roles.js"></script>
<script src="js/views/auth.js"></script>
<script src="js/views/dashboard.js"></script>
<!-- ...view lain akan ditambahkan di bab-bab berikutnya... -->
<script src="js/app.js"></script>
```

`Dashboard` harus SUDAH ada sebagai variabel global sebelum `app.js` dijalankan, karena `app.js` langsung merujuknya di dalam `VIEWS: { dashboard: () => Dashboard }` begitu file itu dieksekusi.

---

## ✅ Cek hasil

- [ ] Buka `app.html` lewat Live Server, login sebagai siswa. Anda harus otomatis mendarat di Beranda.
- [ ] Kartu hero menampilkan sapaan sesuai jam saat ini (`Selamat pagi`/`siang`/`sore`/`malam`) diikuti nama depan Anda, dan tanggal hari ini dalam format Indonesia (mis. "Jumat, 17 Juli 2026").
- [ ] Karena belum ada data tugas/ibadah (akan diisi Bab 09), ringkasan Tugas menampilkan pesan "Tidak ada tugas aktif" dan ringkasan Ibadah menampilkan 0%.
- [ ] Klik kartu ringkasan Tugas atau Ibadah — halaman harus berpindah route (walau halaman tujuannya mungkin belum lengkap sampai bab-bab berikutnya).
- [ ] Klik tombol ganti-bahasa di header. SELURUH teks Beranda (sapaan, judul kartu, pesan kosong) harus berganti bahasa SEKETIKA, tanpa reload halaman.
- [ ] Buka DevTools → Console, ketik `App.VIEWS.dashboard()` → harus mengembalikan objek `Dashboard` itu sendiri.

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| Tombol di Beranda tampak normal tapi tak bereaksi diklik, tanpa error di Console | Listener dipasang SEBELUM `el.innerHTML = ...`, lalu dihapus diam-diam saat `innerHTML` ditugaskan | Ini perilaku BENAR dari `innerHTML`, bukan bug — pindahkan pemasangan listener ke SETELAH blok `innerHTML`, seperti pola 4 fase di Bagian 2. |
| Nama siswa dengan karakter aneh (mis. mengandung `<` atau `"`) merusak tampilan Beranda | Lupa membungkus data pengguna dengan `esc()` sebelum ditaruh di `innerHTML` | Bungkus SETIAP teks dari pengguna/database dengan `esc()`, lihat Bagian 4. |
| Route `dashboard` menampilkan halaman putih kosong, tak ada error jelas | Lupa mendaftarkan `dashboard: () => Dashboard` di `App.VIEWS`, atau `dashboard.js` dimuat SETELAH `app.js` di `app.html` | Cek `App.VIEWS` punya entrinya, dan urutan `<script>` — `dashboard.js` harus sebelum `app.js`. |
| Konsol menyebut `Dashboard is not defined` | `js/views/dashboard.js` belum dimuat sama sekali, atau ada salah ketik nama file di `<script src>` | Cek ejaan path script di `app.html`. |
| Tanggal Beranda meleset satu hari, biasanya larut malam | Memakai `new Date().toISOString()` alih-alih `todayStr()` | Pakai `todayStr()` dari `js/utils.js`, yang membaca komponen tanggal LOKAL, bukan UTC (lihat Bagian 8). |
| Ganti bahasa tidak mengubah judul halaman di header | Judul disimpan sebagai NILAI tetap (`tr('Beranda','Home')`), bukan FUNGSI (`() => tr('Beranda','Home')`) | Bungkus jadi fungsi di `App.TITLES`, lihat Bagian 6. |

## 🧪 Latihan

1. **Tambah satu baris ringkasan.** Tambahkan satu baris kecil baru ke kartu hero Beranda, misalnya jumlah hari sejak akun dibuat ("Sudah 12 hari belajar bersama Tumara"). Anda perlu: (a) data tanggal pembuatan akun (mis. `user.createdAt`, cek bentuknya di data pengguna Anda), (b) hitung selisih hari dengan `todayStr()`/`daysUntil()` sebagai acuan, (c) tulis dalam DUA bahasa dengan `tr()`.

2. **Uji sendiri fase 4.** Di dalam `render()` `Dashboard`, coba PINDAHKAN sementara baris `$$('[data-goto]', el).forEach(...)` ke SEBELUM `el.innerHTML = ...`. Simpan, refresh, klik kartu — amati bahwa klik tak berefek sama sekali, tanpa error. Ini latihan untuk MELIHAT SENDIRI perilaku yang dijelaskan di Bagian 2, bukan cuma membaca teorinya. Setelah paham, kembalikan urutannya seperti semula.

3. ⭐ **Buat view baru sederhana.** Buat file `js/views/salam.js` berisi satu view baru, mengikuti pola 4 fase, yang menampilkan salam berisi nama pengguna dari `DB.user.nama` (jangan lupa `esc()`), dalam dua bahasa. Daftarkan ke `App.VIEWS` dengan route `salam`, muat scriptnya di `app.html` sebelum `app.js`, lalu uji dengan mengetik `App.navigate('salam')` di Console. View ini tidak perlu punya tombol atau data lain — cukup untuk melatih tangan Anda membuat kerangka `render(el)` dari nol.

## 📌 Ringkasan

- Sebuah **view** hanyalah objek dengan satu method wajib `async render(el)`. Tak ada class, tak ada lifecycle rumit — kontrak App↔view cukup `render(el)`, `view.tab` (opsional), dan panggilan balik `App.navigate/refresh/saveTab/route`.
- Pola render SELALU 4 fase: **fetch** (paralel via `Promise.all`) → **derive** (filter/sort/map biasa) → **satu `innerHTML`** → **bind** (listener SETELAH innerHTML, karena innerHTML menghapus listener lama TANPA error — dan justru karena itu tak ada risiko listener menumpuk).
- `$(sel, el)`/`$$(sel, el)` dengan parameter kedua `el` men-scope pencarian ke wilayah view sendiri — inilah yang membuat view-view tak saling bentrok.
- `esc()` WAJIB untuk semua teks dari pengguna/database yang masuk ke `innerHTML`, untuk mencegah XSS. Tak perlu untuk teks yang Anda tulis sendiri di kode.
- `openModal({title, body, onMount})`: `title` di-escape, `body` markup mentah (tanggung jawab Anda meng-escape data di dalamnya), `onMount` tempat bind listener. `confirmDialog(pesan)` mengembalikan Promise — pakai dengan `if (!await confirmDialog(...)) return;`.
- `tr(id, en)` menulis dua bahasa BERDAMPINGAN langsung di kode, tanpa file kamus terpisah — sederhana untuk dua bahasa tetap, tapi tak berskala ke banyak bahasa. Hal yang bergantung bahasa (mis. judul route) harus berupa FUNGSI, bukan nilai tetap, supaya ikut berubah saat bahasa diganti.
- `todayStr()` sengaja menghindari `toISOString()` karena itu bergeser ke UTC dan bisa memberi tanggal yang salah di jam-jam larut malam.

**Berikutnya:** [Bab 09 — Fitur-fitur Siswa](09-fitur-fitur-siswa.md)
