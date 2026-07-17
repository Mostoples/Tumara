# Bab 09 — Fitur-Fitur Siswa

> **Tujuan bab ini:** Anda bisa membangun fitur CRUD lengkap (Tugas) di `js/views/productivity.js`, memahami pola **VIEW BERTAB** untuk fitur besar seperti Ibadah, dan tahu cara memetakan pola yang sama ke fitur lain (Kesehatan, Keuangan) tanpa harus dituntun baris demi baris.

| | |
|---|---|
| **Perkiraan waktu** | ~120 menit (bab terpanjang di bagian aplikasi siswa — boleh dicicil dua sesi) |
| **Sebelum ini** | [Bab 08 — Membuat View Pertama](08-membuat-view-pertama.md) |
| **Anda butuh** | "Kontrak view" dari Bab 08 (`render(el)`, `data-*`, `App.refresh()`), router & `App.route` dari Bab 07, dan `DB` dari Bab 05 |

## Apa yang kita bangun di bab ini

Bab 08 mengajarkan Anda membangun **satu** view sederhana dari nol. Bab ini melangkah lebih jauh: kita membangun fitur **Tugas** secara utuh — bisa tambah, tandai selesai, dan hapus — memakai `DB` sebagai satu-satunya jalan data (ingat lagi analogi "petugas TU" dari Bab 05). Sepanjang jalan, Anda akan melihat satu resep mutasi data yang **berulang di mana-mana** di Tumara:

```
baca data → ubah lewat DB → beri tahu pengguna (toast) → App.refresh()
```

Setelah Tugas selesai, kita naik satu tingkat: bagaimana **satu** objek view (`Prod`) bisa melayani lima halaman nav sekaligus (Tugas, Catatan, Kebiasaan, Jadwal, Fokus), dan bagaimana view yang lebih besar lagi (Ibadah) memakai **tab di dalam satu halaman**. Bab ditutup dengan peta ringkas fitur Kesehatan dan Keuangan — bukan untuk dibangun penuh, tapi supaya Anda kenal bentuknya dan sanggup mengembangkannya sendiri.

Anda **tidak** akan mengetik ulang seluruh 1511 baris `ibadah.js` atau 969 baris `finance.js`. Itu bukan tujuan bab pemula. Tujuannya: satu fitur dikuasai penuh (Tugas), sisanya dikenali polanya.

## 1. CRUD — istilah yang akan sering muncul

Mulai bab ini, satu singkatan akan muncul terus-menerus: **CRUD**.

- **C**reate — Tambah
- **R**ead — Baca
- **U**pdate — Ubah
- **D**elete — Hapus

Setiap fitur siswa di Tumara — tugas, catatan, kebiasaan, transaksi keuangan, catatan ibadah — adalah **variasi CRUD yang sama**, dijalankan di atas satu koleksi `DB` yang berbeda-beda. Tambah tugas dan tambah catatan terlihat beda di layar, tapi di baliknya sama-sama memanggil `DB.add(koleksi, data)`. Begitu Anda menguasai CRUD di **satu** fitur, Anda bisa membaca dan menulis **semua** fitur lain di Tumara — itulah sebabnya bab ini menghabiskan banyak waktu di Tugas saja.

> **Analogi sekolah:** CRUD seperti empat hal yang selalu Anda lakukan pada buku nilai — menulis nilai baru (Create), melihat nilai (Read), memperbaiki nilai yang salah ketik (Update), dan mencoret baris yang salah kelas (Delete). Buku nilainya berganti-ganti (matematika, IPA, ibadah, keuangan), tapi keempat tindakan itu selalu sama.

## 2. Membangun fitur Tugas — CRUD lengkap

Fitur ini hidup di `js/views/productivity.js`, dalam satu objek besar bernama `Prod`. Namanya singkatan dari "Produktivitas" — file ini menaungi Tugas, Catatan, Kebiasaan, Jadwal, dan Fokus (Pomodoro) sekaligus, karena kelimanya "berasa" satu rumpun bagi siswa. Bagian 4 nanti menjelaskan bagaimana satu objek bisa melayani lima halaman.

### 2.1 State di properti objek — masih singleton, masih tanpa library

Ingat lagi filosofi Bab 08: setiap view di Tumara adalah **singleton** — hanya ada satu `Prod` di seluruh aplikasi, bukan dibuat ulang tiap kali halaman dibuka. Karena itu, "state" (kondisi yang perlu diingat antar-render, seperti filter apa yang sedang aktif) cukup disimpan sebagai **properti biasa** pada objeknya sendiri:

```js
// js/views/productivity.js
const Prod = {
  taskFilter: 'aktif',
  detailTaskId: null,   // tugas yang sedang dibuka di halaman detail
  noteQuery: '',
  selectedDay: new Date().getDay(), // 0=Minggu
  // ...
};
```

Tak ada `useState`, tak ada library manajemen state. `taskFilter` cuma variabel di dalam objek — dibaca saat `render()` menyusun HTML, diubah saat pengguna mengklik tombol filter, lalu dipakai lagi saat `App.refresh()` memanggil `render()` sekali lagi. Sesederhana itu, dan cukup untuk kebutuhan Tumara.

> ⚠️ **Batasannya, jujur saja:** properti objek ini bertahan selama **sesi berjalan** (selama tab browser tidak ditutup/dimuat ulang), tapi **hilang saat refresh halaman** — beda dengan data yang tersimpan lewat `DB` (localStorage atau Firestore), yang bertahan selamanya. `taskFilter` boleh reset ke `'aktif'` tiap kali Anda membuka ulang browser, tapi *data tugasnya sendiri* tidak boleh hilang. Kalau Anda pernah bingung "kok filter saya balik ke default setelah refresh, tapi tugasnya aman?" — itulah sebabnya. (`detailTaskId` di kode asli justru sengaja ditulis ke `localStorage` juga, persis karena penulisnya *tidak* mau halaman detail tugas hilang saat direfresh — lihat `_TASK_DKEY` di kode aslinya.)

### 2.2 render — fetch, filter, sort

Method yang menggambar daftar tugas dimulai begini (versi ringkas untuk latihan; lengkapnya di `js/views/productivity.js`):

```js
// js/views/productivity.js — kerangka renderTasks (versi latihan)
async renderTasks(el) {
  const tasks = (await DB.list('tasks'))
    .sort((a, b) => prioUrut(a.prioritas) - prioUrut(b.prioritas)
                 || (a.tenggat || '9999-99-99').localeCompare(b.tenggat || '9999-99-99'));

  let shown = tasks;
  if (this.taskFilter === 'aktif')   shown = tasks.filter(t => t.status !== 'selesai');
  else if (this.taskFilter === 'selesai') shown = tasks.filter(t => t.status === 'selesai');

  el.innerHTML = `...`;   // lihat 2.6
}
```

Tiga langkah yang **selalu** muncul di awal setiap `render` fitur di Tumara, dan yang harus Anda kenali sebagai pola:

1. **Fetch** — `await DB.list('tasks')` mengambil seluruh koleksi tugas milik pengguna yang sedang login (ingat Bab 05: `list` = data **pribadi**, tersimpan di `users/{uid}/tasks`).
2. **Sort** — urutkan sebelum ditampilkan. Di sini urutannya: prioritas dulu (P1 paling atas), baru tenggat waktu.
3. **Derive** (turunkan) — dari data mentah `tasks`, kita **turunkan** `shown`: versi yang sudah disaring sesuai `taskFilter`. `tasks` sendiri tak diubah — kita hanya membuat daftar tampilan baru dari sana.

#### Kutipan `PRIORITAS` dan kenapa `nama` berupa fungsi

`prioUrut` datang dari `js/utils.js`, dan bersandar pada satu objek konfigurasi:

```js
// js/utils.js
const PRIORITAS = {
  tinggi: { kode: 'P1', urut: 0, badge: 'badge-red',   nama: () => tr('Tinggi', 'High') },
  sedang: { kode: 'P2', urut: 1, badge: 'badge-amber', nama: () => tr('Sedang', 'Medium') },
  rendah: { kode: 'P3', urut: 2, badge: 'badge-gray',  nama: () => tr('Rendah', 'Low') }
};

function prioKey(p) { return PRIORITAS[p] ? p : 'sedang'; }
function prioUrut(p) { return PRIORITAS[prioKey(p)].urut; }

function prioBadge(p) {
  const d = PRIORITAS[prioKey(p)];
  return `<span class="badge ${d.badge}"><b>${d.kode}</b> · ${d.nama()}</span>`;
}
```

Tiga hal untuk dicermati:

- **`prioKey(p)`** adalah penjaga data lama. Kalau `p` bukan salah satu dari `'tinggi'/'sedang'/'rendah'` — misalnya `undefined`, karena tugas itu dibuat sebelum field `prioritas` ada — fungsi ini jatuh ke `'sedang'`. Tanpa penjaga ini, `PRIORITAS[p]` akan bernilai `undefined`, dan baris berikutnya (`.urut`, `.badge`) akan meledak dengan error "cannot read property of undefined". Inilah kenapa data tugas lama tetap aman ditampilkan meski field prioritasnya kosong.
- **`prioUrut`** dipakai untuk `.sort()` — mengembalikan angka (0, 1, 2), makin kecil makin diprioritaskan.
- **`nama: () => tr(...)`** — perhatikan `nama` bukan teks langsung, tapi **fungsi** yang mengembalikan teks. Ingat "lazy language" dari Bab 08: kalau `nama` ditulis langsung sebagai `tr('Tinggi', 'High')` (dipanggil saat file dimuat), teksnya akan "beku" dalam bahasa yang aktif **saat file pertama kali dibaca** — dan tidak pernah berubah lagi walau pengguna mengganti bahasa nanti. Dengan `nama: () => tr(...)`, `tr()` baru dipanggil **saat `nama()` benar-benar dieksekusi** — yaitu setiap kali `prioBadge()` menggambar ulang. Jadi label prioritas ikut berganti bahasa secara langsung, tanpa perlu memuat ulang halaman.

`prioBadge(p)` menghasilkan badge lengkap ("**P1** · Tinggi"), dipakai di tampilan daftar. Ada juga `prioTag(p)` — versi ringkas, cuma "**P1**" — dipakai di ruang sempit seperti kartu ringkasan Beranda.

### 2.3 Resep: tambah data

Ini pola mutasi yang akan Anda pakai **berulang-ulang** di seluruh Tumara — hafalkan bentuknya, bukan detailnya:

```
1. Buka modal form (openModal dari Bab 08)
2. Validasi input sederhana di sisi klien
3. await DB.add(koleksi, data)
4. closeModal()
5. toast(pesan sukses)
6. App.refresh()
```

Kutipan aslinya, untuk tugas:

```js
// js/views/productivity.js — openTaskModal (diringkas)
openTaskModal(task = null) {
  openModal({
    title: task ? tr('Ubah Tugas', 'Edit Task') : tr('Tugas Baru', 'New Task'),
    body: `
      <div class="field">
        <label>${tr('Judul tugas', 'Task title')}</label>
        <input type="text" class="input" id="mJudul" value="${esc(task?.judul || '')}">
      </div>
      <!-- ...input mapel, label, tenggat, prioritas, ulang... -->
      <button class="btn btn-prod btn-block" id="mSave">
        ${task ? tr('Simpan Perubahan', 'Save Changes') : tr('Tambah Tugas', 'Add Task')}
      </button>`,
    onMount: m => {
      $('#mSave', m).onclick = async () => {
        const judul = $('#mJudul', m).value.trim();
        if (!judul) return toast(tr('Judul tugas tidak boleh kosong.', "Task title can't be empty."), 'warning');
        const data = { judul, tenggat: $('#mTenggat', m).value, prioritas: $('#mPrioritas', m).value };
        if (task) await DB.update('tasks', task.id, data);
        else await DB.add('tasks', { ...data, status: 'aktif' });
        closeModal();
        toast(task ? tr('Tugas diperbarui.', 'Task updated.') : tr('Tugas ditambahkan 📌', 'Task added 📌'));
        App.refresh();
      };
    }
  });
}
```

Baca urutannya pelan-pelan:

- **`openModal({ title, body, onMount })`** — dari Bab 08: `title` judul modal, `body` HTML form-nya, `onMount` dipanggil **setelah** modal ditempel ke DOM (di titik itulah elemen `#mJudul` dkk. baru benar-benar ada dan boleh diambil dengan `$()`).
- **Validasi dulu, baru tulis.** `if (!judul) return toast(..., 'warning')` — kalau judul kosong, hentikan di situ juga. `DB.add` tak pernah dipanggil dengan data yang jelas rusak.
- **Satu fungsi, dua mode.** `task ? DB.update(...) : DB.add(...)` — modal yang sama dipakai untuk **tambah** (`task` bernilai `null`) maupun **ubah** (`task` berisi data lama). Ini pola umum di Tumara: satu modal, dua jalur mutasi, dibedakan lewat ada-tidaknya argumen.
- **`closeModal()` sebelum `toast(...)`** — tutup dulu jendelanya, baru kabari penggunanya. Kalau dibalik, `toast` akan sempat muncul di belakang modal yang masih terbuka.
- **`App.refresh()` di baris terakhir** — inilah yang membuat tugas baru **langsung terlihat** tanpa Anda perlu menyegarkan browser. Ingat dari Bab 05: `App.refresh()` murah karena hanya membaca cache di memori, bukan menembak server lagi.

### 2.4 Resep: tandai selesai

Menandai tugas selesai adalah **update** — kita tidak menimpa seluruh dokumen, cukup mengubah satu field:

```js
// pola "tandai selesai" — resep umum dipakai ulang di banyak fitur
$$('[data-toggle]', el).forEach(b => b.onclick = async () => {
  const id = b.dataset.toggle;
  const t = tasks.find(x => x.id === id);
  const selesai = t.status !== 'selesai';
  await DB.update('tasks', id, { status: selesai ? 'selesai' : 'aktif' });
  if (selesai) toast(tr('Tugas selesai — mantap! 🎉', 'Task done — nice work! 🎉'));
  App.refresh();
});
```

`DB.update('tasks', id, { status: 'selesai' })` memakai `{ merge: true }` di baliknya (ingat `gUpdate` vs `gSet` di Bab 05 — untuk data **pribadi**, `update` selalu merge). Karena itu aman: hanya field `status` yang berubah, judul/tenggat/prioritas tugas tetap utuh.

Pola persis yang sama — toggle lewat `DB.update`/`DB.add` lalu `App.refresh()` — juga dipakai untuk mencentang kebiasaan harian (`renderHabits`, lihat kode aslinya di baris 76–82):

```js
// js/views/productivity.js — toggle centang kebiasaan (pola identik)
$$('[data-hb]', el).forEach(b => b.onclick = async () => {
  const habitId = b.dataset.hb, tanggal = b.dataset.d;
  const existing = logs.find(l => l.habitId === habitId && l.tanggal === tanggal);
  if (existing) await DB.remove('habit_logs', existing.id);
  else await DB.add('habit_logs', { habitId, tanggal });
  App.refresh();
});
```

Sekali Anda kenal bentuk ini, Anda akan melihatnya di mana-mana di Tumara: **baca dulu status saat ini, balik nilainya lewat `DB`, lalu `App.refresh()`.**

### 2.5 Resep: hapus data

Hapus punya satu tambahan penting dibanding tambah/ubah: **konfirmasi**. Menghapus tak bisa dibatalkan, jadi Tumara selalu bertanya dulu lewat `confirmDialog` (dari `js/utils.js`, dibangun di atas `openModal` — perhatikan ia mengembalikan `Promise<boolean>`, jadi bisa di-`await`):

```js
// pola "hapus" — resep umum, dipakai identik di catatan, kebiasaan, dan tugas
$$('[data-del]', el).forEach(b => b.onclick = async () => {
  if (!await confirmDialog(tr('Hapus tugas ini?', 'Delete this task?'),
      { danger: true, okText: tr('Hapus', 'Delete') })) return;
  await DB.remove('tasks', b.dataset.del);
  toast(tr('Tugas dihapus.', 'Task deleted.'));
  App.refresh();
});
```

`confirmDialog(pesan, { danger, okText })` menampilkan modal Ya/Batal; `danger: true` mewarnai tombol "Hapus" merah supaya pengguna sadar ini tindakan berisiko. Baris `if (!await confirmDialog(...)) return;` adalah satu baris yang **wajib** Anda kenali: kalau pengguna menekan "Batal", `confirmDialog` mengembalikan `false`, `!false` menjadi `true`, dan fungsi berhenti di `return` — `DB.remove` tak pernah terpanggil.

Pola yang identik dipakai untuk menghapus kebiasaan beserta riwayatnya:

```js
// js/views/productivity.js — hapus kebiasaan (pola identik, dengan pembersihan tambahan)
$$('[data-delh]', el).forEach(b => b.onclick = async () => {
  if (!await confirmDialog(tr('Hapus kebiasaan ini beserta riwayatnya?', 'Delete this habit and its history?'),
      { danger: true, okText: tr('Hapus', 'Delete') })) return;
  const hid = b.dataset.delh;
  await DB.remove('habits', hid);
  await Promise.all(logs.filter(l => l.habitId === hid).map(l => DB.remove('habit_logs', l.id)));
  toast(tr('Kebiasaan dihapus.', 'Habit deleted.'));
  App.refresh();
});
```

Satu tambahan di sini: menghapus **satu** kebiasaan juga berarti menghapus **semua** riwayat centangnya (`habit_logs` terkait) — kalau tidak, riwayat yatim-piatu itu akan tertinggal di database selamanya, menunjuk ke kebiasaan yang sudah tak ada.

### 2.6 Binding — menyambungkan HTML ke fungsi

Terakhir, cara markup di atas terhubung ke ketiga resep tadi — ini murni pola `data-*` dari Bab 08, dipakai ulang:

```html
<!-- js/views/productivity.js — potongan template renderTasks -->
${['aktif', 'selesai', 'semua'].map(f => `
  <button class="chip ${this.taskFilter === f ? 'active' : ''}" data-filter="${f}">${f}</button>`).join('')}

${shown.map(t => `
  <div class="list-item">
    <button class="task-check" data-toggle="${t.id}"><ion-icon name="checkmark"></ion-icon></button>
    <div data-detail="${t.id}">${esc(t.judul)}</div>
    <button class="mini-icon-btn" data-edit="${t.id}"><ion-icon name="create-outline"></ion-icon></button>
    <button class="mini-icon-btn danger" data-del="${t.id}"><ion-icon name="trash-outline"></ion-icon></button>
  </div>`).join('')}
```

```js
$$('[data-filter]', el).forEach(c => c.onclick = () => { this.taskFilter = c.dataset.filter; App.refresh(); });
$$('[data-toggle]', el).forEach(b => b.onclick = async () => { /* 2.4 */ });
$$('[data-edit]',   el).forEach(b => b.onclick = () => this.openTaskModal(tasks.find(x => x.id === b.dataset.edit)));
$$('[data-del]',    el).forEach(b => b.onclick = async () => { /* 2.5 */ });
```

Setiap tombol dinamis membawa `data-*` berisi ID barisnya. Setelah HTML ditulis ke `el.innerHTML`, kita cari **semua** elemen ber-atribut itu dengan `$$('[data-x]', el)` (dari Bab 08: `$$` = `querySelectorAll` yang mengembalikan array asli, sehingga bisa dipakai `.forEach`), lalu pasang `.onclick` satu per satu. Klik tombol filter cukup mengganti `this.taskFilter` lalu `App.refresh()` — tak perlu router, karena ini bukan pindah halaman, cuma menyaring ulang yang sudah tampil.

## 3. Tugas dari GURU vs tugas pribadi siswa

Sampai di sini Anda sudah menguasai resep CRUD lengkap. Tapi kode Tumara yang **sungguhan berjalan sekarang** sedikit lebih rumit dari versi latihan di atas — dan kerumitannya penting untuk dipahami, bukan disembunyikan.

Di aplikasi produksi, tugas siswa punya **dua sumber**:

1. **`tasks`** — koleksi pribadi (yang kita pakai sepanjang bagian ini). Siswa bebas tambah/ubah/hapus sendiri.
2. **`class_tasks`** — koleksi **global**, dibuat GURU lewat portal Guru (Bab 10). Ini dokumen sekolah bersama, tersimpan di `/class_tasks/{id}` (ingat Bab 05: koleksi ber-awalan `g` seperti `gListWhere` untuk yang global, bukan `list` biasa).

Siswa **membaca** tugas dari gurunya begini:

```js
// js/views/productivity.js — renderTasks versi produksi (diringkas)
async renderTasks(el) {
  const kelasId = DB.user?.kelasId;
  const tasks = (await DB.gListWhere('class_tasks', 'classId', kelasId))
    .sort((a, b) => prioUrut(a.prioritas) - prioUrut(b.prioritas)
                 || (a.tenggat || '9999-99-99').localeCompare(b.tenggat || '9999-99-99'));
  const done = new Set(DB.user?.tugasSelesai || []);
  // ...
}
```

`DB.gListWhere('class_tasks', 'classId', kelasId)` — mengambil hanya tugas untuk **kelas siswa itu sendiri** (Bab 05: query global berfilter). Perhatikan siswa **tidak pernah** memanggil `DB.update('class_tasks', ...)` atau `DB.remove('class_tasks', ...)` — dokumen itu milik guru, siswa hanya boleh membacanya.

Lalu bagaimana siswa "mencentang selesai" tugas yang bukan miliknya? Jawabannya elegan: progresnya **tidak** ditulis ke dokumen tugas, tapi ke **profil siswa sendiri**, di field `tugasSelesai` (array berisi ID tugas yang sudah dicentang):

```js
// js/views/productivity.js — mencentang tugas dari guru
$$('[data-toggle]', el).forEach(b => b.onclick = async () => {
  const id = b.dataset.toggle;
  const set = new Set(DB.user?.tugasSelesai || []);
  if (set.has(id)) set.delete(id);
  else { set.add(id); toast(tr('Tugas selesai — mantap! 🎉', 'Task done — nice work! 🎉')); }
  await DB.updateUser({ tugasSelesai: [...set] });
  App.refresh();
});
```

`DB.updateUser(...)` mengubah dokumen profil **siswa itu sendiri** — bukan dokumen tugas. Siswa A mencentang tugas #5 dengan menambahkan `'#5'` ke `tugasSelesai` miliknya sendiri; siswa B yang sekelas mencentang tugas yang sama dengan menambahkannya ke `tugasSelesai` miliknya sendiri pula. Dokumen `class_tasks/#5` tak pernah tersentuh — hanya dibaca, tak pernah ditulis, oleh siswa manapun.

Ini contoh nyata kenapa Bab 05 membagi data jadi **pribadi** (`list/add/update/remove`) dan **global** (`gList/gAdd/gUpdate/gRemove`): batas itu bukan cuma soal di mana data disimpan, tapi juga **siapa boleh menulis apa**. Aturan sesungguhnya yang menegakkan batas ini ada di `firestore.rules`, dibahas tuntas di Bab 12 — di sisi klien, kita cuma "berbaik hati" tidak menyediakan tombol edit/hapus untuk data yang bukan hak kita.

## 4. Satu view, banyak route — pola dispatch

Kenapa semua kode di atas ada di dalam **satu** objek `Prod`, padahal Tugas, Catatan, Kebiasaan, Jadwal, dan Fokus adalah lima halaman nav yang terpisah? Karena router (Bab 07) mendaftarkan kelimanya menunjuk ke objek `Prod` yang sama:

```js
// js/app.js — VIEWS
VIEWS: {
  tugas:     () => Prod,
  catatan:   () => Prod,
  kebiasaan: () => Prod,
  jadwal:    () => Prod,
  fokus:     () => Prod,
  ibadah:    () => Ibadah,
  // ...
}
```

Saat pengguna membuka salah satu dari lima rute itu, `App.navigate(route)` memanggil `Prod.render(el)` yang **sama**, apa pun rutenya. Di dalam `render`, `Prod` membaca `App.route` (properti global router, Bab 07) untuk memutuskan sub-halaman mana yang digambar:

```js
// js/views/productivity.js
async render(el) {
  el.innerHTML = `<div id="prodBody"></div>`;
  const body = $('#prodBody', el);
  if (App.route === 'tugas') await this.renderTasks(body);
  else if (App.route === 'catatan') await this.renderNotes(body);
  else if (App.route === 'kebiasaan') await this.renderHabits(body);
  else if (App.route === 'jadwal') await this.renderSchedule(body);
  else this.renderPomo(body);
}
```

`App.route` sendiri diperbarui oleh router **sebelum** `render()` dipanggil (lihat `App.navigate` di `js/app.js`) — jadi saat `Prod.render` berjalan, ia sudah tahu persis rute mana yang sedang aktif tanpa perlu diberi tahu lewat parameter.

> **Kenapa begini, bukan lima objek terpisah (`TugasView`, `CatatanView`, dst.)?** Karena kelimanya berbagi banyak hal: gaya visual yang sama (warna `--prod`), pola modal yang sama, dan penulisnya ingin satu file untuk satu "rumpun" fitur. Ini pilihan desain, bukan aturan mutlak — Ibadah dan Keuangan masing-masing punya file sendiri karena topiknya cukup besar untuk berdiri sendiri. Anda akan melihat pola ini lagi lebih rumit di Bab 10 (portal Guru bercabang lebih banyak lagi).

## 5. Pola VIEW BERTAB — untuk fitur besar seperti Ibadah

Lima sub-halaman `Prod` masing-masing punya **rute URL sendiri** (`#tugas`, `#catatan`, dst). Tapi ada fitur yang sub-halamannya begitu banyak dan begitu erat kaitannya sehingga lebih masuk akal digabung dalam **satu** rute, dengan navigasi **tab** di dalamnya. Contohnya Ibadah: Hari Ini, Sholat & Kiblat, Kalender, Al-Qur'an, Dzikir & Doa, Panduan, Zakat & Sedekah, Catatan — delapan sub-halaman, satu rute (`#ibadah`).

```js
// js/views/ibadah.js
const Ibadah = {
  tab: 'hari',   // 'hari' | 'sholat' | 'kalender' | 'quran' | 'dzikir' | 'panduan' | 'zakat' | 'catatan'

  async render(el) {
    el.innerHTML = `
      <div class="tabs">
        <button class="tab ${this.tab === 'hari' ? 'active' : ''}" data-tab="hari">${tr('Hari Ini', 'Today')}</button>
        <button class="tab ${this.tab === 'sholat' ? 'active' : ''}" data-tab="sholat">${tr('Sholat & Kiblat', 'Prayer & Qibla')}</button>
        <!-- ...kalender, quran, dzikir, panduan, zakat, catatan... -->
      </div>
      <div id="ibBody"></div>`;

    $$('.tab', el).forEach(t => t.onclick = () => { this.tab = t.dataset.tab; App.saveTab(this.tab); this.render(el); });

    const body = $('#ibBody', el);
    if (this.tab === 'hari') await this.renderToday(body);
    else if (this.tab === 'sholat') await this.renderSholat(body);
    else if (this.tab === 'kalender') this.renderKalender(body);
    // ...dan seterusnya untuk setiap tab
  }
};
```

Bentuknya mirip sekali dengan dispatch `Prod` di atas — bedanya, `Prod` bercabang lewat `App.route` (banyak URL, satu objek), sedangkan `Ibadah` bercabang lewat propertinya sendiri `this.tab` (satu URL, banyak "halaman semu" di dalamnya). Perhatikan **shell**-nya: `render()` selalu menggambar bar `.tabs` di bagian atas, lalu menyediakan satu kontainer kosong `#ibBody` yang isinya berganti-ganti tergantung tab aktif — persis seperti `#prodBody` pada `Prod`.

### Perbedaan penting: klik tab TIDAK lewat `App.refresh()`

```js
$$('.tab', el).forEach(t => t.onclick = () => { this.tab = t.dataset.tab; App.saveTab(this.tab); this.render(el); });
```

Baca baris ini baik-baik — ada dua hal yang beda dari semua contoh sebelumnya:

- **`this.render(el)` dipanggil LANGSUNG**, bukan `App.refresh()`. Ingat dari Bab 05/07: `App.refresh()` bekerja dengan membaca `App.route` dari router lalu memanggil `VIEWS[App.route]().render(...)`. Tapi berpindah **tab** bukan berpindah **rute** — URL-nya tetap `#ibadah`, router tidak perlu dilibatkan sama sekali. Memanggil `this.render(el)` langsung lebih murah dan lebih tepat: kita tahu persis view mana yang aktif (`this`, yakni `Ibadah`) dan elemen mana yang harus digambar ulang (`el`, yang sudah tersedia sebagai closure dari `render` terluar), jadi tak perlu bertanya dulu ke router.
- **`App.saveTab(this.tab)`** dipanggil sebelum render ulang — ini yang menulis tab aktif ke URL hash (`#ibadah/sholat`, misalnya), supaya kalau siswa me-refresh browser di tengah tab Sholat, ia kembali ke tab Sholat juga, bukan balik ke tab Hari Ini. `App.navigate` (Bab 07) membaca kembali bagian setelah `/` ini saat halaman dimuat ulang.

> **Kapan pakai pola tab, kapan pakai rute terpisah?** Pakai **tab dalam satu view** (seperti Ibadah) kalau sub-halamannya benar-benar satu topik besar yang siswa jelajahi bolak-balik (siswa yang buka Ibadah sering pindah dari "Hari Ini" ke "Sholat" ke "Kalender" dalam satu sesi). Pakai **rute terpisah** (seperti Tugas/Catatan/Kebiasaan) kalau sub-halamannya cukup berdiri sendiri untuk dibuka lewat nav utama tanpa perlu "masuk" ke topik induknya dulu.

## 6. Peta ringkas fitur lain

Fitur Kesehatan (`js/views/health.js`, 1171 baris) dan Keuangan (`js/views/finance.js`, 969 baris) memakai **pola yang sama persis** dengan Tugas — fetch dari `DB`, derive (filter/hitung), render HTML, bind lewat `data-*`, mutasi lewat `DB` diikuti `App.refresh()`. Berikut peta ringkasnya, satu contoh kode kecil per fitur supaya Anda punya titik awal kalau ingin membacanya sendiri.

**Kesehatan** — kalkulator (`Calc.bmr`/`Calc.tdee` di `js/calc.js`, rumus Mifflin-St Jeor untuk kebutuhan kalori harian) plus catatan harian: air, tidur, olahraga. Catatan harian memakai `DB.getDaily`/`DB.saveDaily` dari Bab 05 (satu dokumen per tanggal, ID = tanggal itu sendiri):

```js
// js/views/health.js — nambah 1 gelas air (diringkas)
const setWater = async (air, extra) => {
  await DB.saveDaily(todayStr(), { air: clamp(air, 0, 60), airExtra: clamp(extra, 0, 40) });
  App.refresh();
};
$('#waterPlus', el).onclick = () => setWater((daily.air || 0) + 1, extraAir + 1);
```

Tak ada `DB.add` di sini — karena catatan harian memang **satu dokumen per hari**, menambah gelas air berarti meng-update dokumen hari itu, bukan menambah baris baru.

**Keuangan** — transaksi (pemasukan/pengeluaran), kategori, target tabungan, dan utang, semuanya koleksi biasa (`DB.list('transactions')`, dst.) mengikuti CRUD standar seperti Tugas persis. Satu hal khas: uang selalu ditampilkan lewat `fmtRp()` (dari `js/utils.js`) supaya format Rupiah (`Rp15.000`, pemisah ribuan gaya Indonesia) konsisten di seluruh aplikasi:

```js
// js/views/finance.js — tambah transaksi (diringkas)
$('#mSave', m).onclick = async () => {
  const jumlah = +$('#mJumlah', m).value;
  if (!jumlah || jumlah <= 0) return toast(tr('Masukkan jumlah yang valid.', 'Enter a valid amount.'), 'warning');
  const data = { tanggal: $('#mTanggal', m).value, tipe, jumlah, kategori: $('#mKategori', m).value };
  if (tx) await DB.update('transactions', tx.id, data);
  else await DB.add('transactions', data);
  closeModal();
  toast(tr('Transaksi dicatat 💰', 'Transaction logged 💰'));
  App.refresh();
};
```

```js
// js/utils.js
function fmtRp(n) {
  const num = Math.round(Number(n) || 0);
  return `${num < 0 ? '-' : ''}Rp${Math.abs(num).toLocaleString('id-ID')}`;
}
```

**Ibadah** — sudah Anda lihat bentuk tabnya di Bagian 5. Satu kekhususan menarik: checklist harian (Sholat Dhuha/Dzuhur, dll.) harus **reset tengah malam**, dan Tumara sengaja **tidak** memakai satu `setTimeout` panjang menunggu jam 00:00 (timer panjang tak andal — di-*throttle* browser saat tab di-*background*-kan). Sebagai gantinya, ia memasang pengecek ringan tiap 30 detik plus pendengar `visibilitychange`/`focus`, membandingkan tanggal hari ini dengan tanggal terakhir kali dirender:

```js
// js/views/ibadah.js — inti watcher pergantian hari (disederhanakan)
const checkRollover = () => {
  const now = todayStr();
  if (now === this._lastDate) return;         // masih hari yang sama
  this._lastDate = now;
  if (App.route === 'ibadah') this.render(this._dayHostEl);   // gambar ulang hari baru
};
setInterval(checkRollover, 30000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkRollover(); });
```

Bagian tersulitnya bukan CRUD-nya (tetap `DB.getDaily`/`saveDaily` seperti Kesehatan) — tapi *kapan* harus menggambar ulang otomatis tanpa aksi pengguna. Simpan ini di kepala Anda: kalau nanti Anda membuat fitur yang butuh "reset harian", pola pengecek berkala + `visibilitychange` inilah yang dipakai Tumara, bukan `setTimeout` ke tengah malam.

Untuk ketiganya, polanya sama dengan Tugas: **fetch, derive, render, bind, mutasi lewat `DB` lalu `App.refresh()`**. Kalau Anda ingin mengembangkan salah satunya, buka file aslinya dan cari fungsi `render...` yang relevan — bentuknya akan terasa familiar.

## 7. Latihan terpandu: tambahkan fitur Catatan sendiri

Sekarang giliran Anda. Tumara sudah punya koleksi `notes` (catatan bebas: judul, label, isi). Berikut kerangkanya — **isi bagian yang ditandai `// TODO`** memakai resep di Bagian 2. Jangan salin kode asli Tumara dulu; coba tulis sendiri, baru bandingkan.

```js
// js/views/productivity.js — kerangka renderNotes untuk Anda lengkapi
async renderNotes(el) {
  // TODO 1: ambil semua catatan lewat DB.list('notes')
  const notes = /* ... */;

  el.innerHTML = `
    <button class="btn btn-prod" id="addNote">${tr('Catatan Baru', 'New Note')}</button>
    <div class="grid grid-3">
      ${notes.map(n => `
        <div class="card note-card" data-open="${n.id}">
          <div style="font-weight:800;">${esc(n.judul) || '<i>Tanpa judul</i>'}</div>
          <div>${esc(n.isi)}</div>
        </div>`).join('')}
    </div>`;

  // TODO 2: tombol #addNote membuka modal tambah catatan baru (pola 2.3)
  $('#addNote', el).onclick = () => { /* ... */ };

  // TODO 3: klik kartu [data-open] membuka modal UBAH catatan itu (task = catatan lama)
  $$('[data-open]', el).forEach(c => c.onclick = () => { /* ... */ });
},

// TODO 4: modal tambah/ubah + tombol hapus (pola 2.3 dan 2.5 digabung dalam satu modal)
_noteModal(note = null) {
  // Petunjuk: openModal({...}) dengan field #mJudul, #mLabel, #mIsi
  // Simpan: if (note) DB.update('notes', note.id, data); else DB.add('notes', {...data});
  // Hapus (hanya tampil kalau `note` bukan null): confirmDialog(...) → DB.remove('notes', note.id)
}
```

Cek diri Anda sendiri sebelum melihat jawabannya di `js/views/productivity.js`:

- Apakah tombol "Catatan Baru" dan klik kartu catatan lama memanggil modal yang **sama**, dibedakan lewat argumennya (seperti `openTaskModal(task = null)`)?
- Apakah tombol Hapus di dalam modal memanggil `confirmDialog` dulu, dan **berhenti** kalau jawabannya "Batal"?
- Apakah setiap jalur mutasi (`DB.add`/`DB.update`/`DB.remove`) diikuti `closeModal()`, `toast(...)`, lalu `App.refresh()`?

---

## ✅ Cek hasil

- [ ] Buka halaman Tugas. Klik "Tugas Baru", isi judul, simpan — tugas baru langsung tampil di daftar **tanpa** memuat ulang browser.
- [ ] Refresh browser (F5) — tugas yang baru dibuat masih ada (tersimpan lewat `DB`: localStorage kalau `USE_FIREBASE = false`, Firestore kalau `true`).
- [ ] Klik tombol centang pada satu tugas — pindah ke kelompok "Selesai" saat Anda klik chip filter "Selesai".
- [ ] Klik ikon sampah pada satu tugas — muncul dialog konfirmasi. Klik "Batal" — tugas **tidak** terhapus. Ulangi, klik "Hapus" — tugas hilang dari daftar.
- [ ] Ganti filter aktif/selesai/semua — daftar berubah seketika tanpa jeda (karena hanya menyaring data yang sudah ada di memori, bukan membaca ulang dari `DB`).
- [ ] Buka Console (DevTools) dan jalankan `await DB.list('tasks')` — Anda harus melihat array berisi tugas yang baru dibuat, masing-masing berbentuk `{ id, judul, tenggat, prioritas, status, ... }`.
- [ ] Buka Ibadah — klik antar-tab (Hari Ini → Sholat & Kiblat → Kalender). URL browser berubah (`#ibadah/sholat`, dst.), tapi halaman tidak "berkedip" pindah rute. Refresh di tengah satu tab — Anda kembali ke tab yang sama, bukan tab pertama.
- [ ] Kalau Anda sudah punya data contoh `class_tasks` di Firestore (dibuat manual, atau nanti dari Bab 10): tugas itu tampil di halaman Tugas siswa, **tanpa** tombol ubah/hapus — hanya tombol centang dan "Kumpulkan".

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| Tugas hilang setelah refresh browser (bukan sekadar filter reset) | Anda menyimpan tugasnya di properti objek (`this.tasks = [...]`), bukan lewat `DB.add` | State di properti objek hanya bertahan selama sesi berjalan (re-render), **bukan** lewat reload halaman. Data yang harus tahan reload wajib lewat `DB`. |
| Klik tombol Hapus langsung menghapus tanpa tanya apa-apa | Lupa `await confirmDialog(...)` sebelum `DB.remove(...)` | Tambahkan `if (!await confirmDialog(...)) return;` sebagai baris pertama sebelum memanggil `DB.remove`. |
| Urutan tugas menurut prioritas berantakan / tugas lama selalu di tengah | Tugas lama tak punya field `prioritas` (`undefined`), lalu `PRIORITAS[undefined]` meledak atau diperlakukan aneh | Selalu lewat `prioKey(p)` yang jatuh ke `'sedang'` untuk nilai tak dikenal, jangan mengindeks `PRIORITAS[p]` langsung. |
| Tombol tambah/ubah tugas tak merespons klik sama sekali | `onclick` dipasang sebelum `el.innerHTML = ...` selesai, atau elemen dicari dengan `$()` sebelum modal ter-mount | Pasang `onclick` di dalam `onMount` (untuk isi modal) atau **setelah** baris `el.innerHTML = ...` (untuk isi halaman) — elemen harus sudah ada di DOM dulu sebelum dicari. |
| Label prioritas tidak ikut berubah saat bahasa aplikasi diganti | `nama` ditulis sebagai teks langsung (`nama: tr(...)`), bukan fungsi | Tulis `nama: () => tr(...)` — lihat penjelasan "lazy language" di Bagian 2.2. |
| Tab Ibadah balik ke "Hari Ini" tiap kali diklik, padahal harusnya pindah tab | Handler klik tab memanggil `App.refresh()`, bukan `this.render(el)` langsung | `App.refresh()` membaca `App.route` dari router (selalu `'ibadah'`, tak tahu tab mana) — pindah tab harus lewat `this.render(el)` supaya `this.tab` yang baru dipakai. |
| Siswa bisa mengedit/menghapus tugas dari gurunya | Tombol edit/hapus dipasang juga untuk data dari `class_tasks` | Tombol mutasi (edit/hapus) hanya boleh muncul untuk data milik sendiri (`list`/`add`/`update`/`remove`); data global (`gList*`) di sisi siswa selalu read-only di UI — dan ditegakkan sungguhan lewat `firestore.rules` (Bab 12). |

## 🧪 Latihan

1. **Selesaikan kerangka Catatan** di Bagian 7 sampai bisa tambah, ubah, dan hapus catatan dari UI.
2. **Tambah field baru pada tugas.** Tambahkan `deskripsi` (teks bebas) ke `openTaskModal` — satu `<textarea>` baru di form, satu baris baru di objek `data`, dan tampilkan isinya di daftar tugas.
3. ⭐ **Buat filter tambahan "Jatuh tempo hari ini".** Tambahkan chip filter baru di samping Aktif/Selesai/Semua yang hanya menampilkan tugas dengan `tenggat === todayStr()` dan belum selesai. Petunjuk: Anda hanya perlu menambah satu nilai baru ke `taskFilter` dan satu cabang `if` baru saat menyaring `shown` — tak ada yang lain yang perlu diubah.

## 📌 Ringkasan

- **CRUD** (Create/Read/Update/Delete = Tambah/Baca/Ubah/Hapus) adalah pola yang sama di balik **semua** fitur siswa Tumara — hanya nama koleksinya yang berbeda.
- Resep mutasi standar yang berulang di mana-mana: **baca data → ubah lewat `DB` → `toast(...)` → `App.refresh()`**, dengan `confirmDialog` sebagai penjaga wajib sebelum `DB.remove`.
- **State di properti objek** (`taskFilter`, `detailTaskId`) menyimpan kondisi tampilan sementara — bertahan antar-render, hilang saat reload halaman. Beda dengan data lewat `DB`, yang bertahan selamanya.
- Tugas siswa sesungguhnya punya dua sumber: **`tasks`** (pribadi, CRUD penuh) dan **`class_tasks`** (global dari guru, read-only bagi siswa — progres dicatat di `tugasSelesai` pada profil siswa sendiri, bukan pada dokumen tugasnya).
- **Satu view, banyak route**: `Prod.render(el)` mengecek `App.route` untuk memutuskan sub-halaman mana (`renderTasks`/`renderNotes`/dst.) yang digambar — lima rute nav, satu objek.
- **Pola VIEW BERTAB** (seperti Ibadah) dipakai untuk fitur besar bertopik tunggal dengan banyak sub-halaman; berpindah tab memanggil `this.render(el)` langsung (bukan `App.refresh()`) karena bukan berpindah rute, dan `App.saveTab(tab)` menjaga tab aktif tahan refresh.
- Kesehatan dan Keuangan memakai pola identik dengan Tugas — fetch, derive, render, bind, mutasi lewat `DB`, `App.refresh()` — hanya bentuk datanya yang berbeda.

**Berikutnya:** [Bab 10 — Portal Guru](10-portal-guru.md)
