/* ============================================================
   TUMARA — Pilih Pekerjaan (jalur Umum)
   ------------------------------------------------------------
   Ditampilkan setelah Google/email login lewat register.html,
   untuk orang di luar sekolah tanpa akun/sangkut-paut sekolah.
   Bisa pilih LEBIH DARI SATU kartu (mis. "Guru" + "Freelancer")
   plus satu pekerjaan bebas ketik opsional → disimpan lewat
   UmumAuth.savePekerjaan([...]) → lanjut ke data-diri.html (usia/
   tinggi/berat untuk Indeks BMI, lihat js/views/data-diri.js)
   → baru masuk umum-app.html (shell aplikasi umum — fitur sama
   dengan app.html versi siswa). Pekerjaan bisa diubah lagi kapan
   saja dari halaman Profil → Data Diri (lihat js/views/profile.js
   _pekerjaanModal), yang memakai grid kartu & pola state yang sama.
   ============================================================ */

// Label dengan "/" sengaja diberi spasi di kedua sisinya (mis. "Pelajar /
// Mahasiswa", bukan "Pelajar/Mahasiswa") — tanpa spasi, browser tak selalu
// mau memenggal baris tepat di garis miring, jadi di kartu sempit (HP kecil)
// katanya malah terpotong paksa di tengah kata (mis. "Mahasis-wa").
// Siswa/mahasiswa cuma boleh merangkap Freelance (kerja sampingan lepas jam
// kuliah/sekolah) — pekerjaan tetap lain (Guru, Karyawan, dll.) dikunci selama
// "Pelajar / Mahasiswa" masih terpilih. Dipakai job-select.js & profile.js
// (_pekerjaanModal) supaya aturannya konsisten di kedua tempat.
const JOB_STUDENT_KEY = 'pelajar';
const JOB_STUDENT_ALLOWED_KEY = 'freelancer';
// true = kartu ini harus dikunci/disabled karena "Pelajar / Mahasiswa" sedang terpilih.
function jobIsLocked(key, selectedSet) {
  return selectedSet.has(JOB_STUDENT_KEY) && key !== JOB_STUDENT_KEY && key !== JOB_STUDENT_ALLOWED_KEY;
}
// Dipanggil segera setelah "Pelajar / Mahasiswa" ditambahkan ke set terpilih —
// melepas centang semua pekerjaan lain selain Freelance.
function jobLockToStudent(selectedSet) {
  if (!selectedSet.has(JOB_STUDENT_KEY)) return selectedSet;
  [...selectedSet].forEach(k => { if (k !== JOB_STUDENT_KEY && k !== JOB_STUDENT_ALLOWED_KEY) selectedSet.delete(k); });
  return selectedSet;
}

const JOBS = [
  { key: 'guru', ic: 'school-outline', tone: 'health', id: 'Guru', en: 'Teacher' },
  { key: 'entrepreneur', ic: 'trending-up-outline', tone: 'fin', id: 'Entrepreneur', en: 'Entrepreneur' },
  { key: 'irt', ic: 'home-outline', tone: 'prod', id: 'IRT', en: 'Homemaker' },
  { key: 'pelajar', ic: 'book-outline', tone: 'info', id: 'Pelajar / Mahasiswa', en: 'Student' },
  { key: 'karyawan', ic: 'briefcase-outline', tone: 'danger', id: 'Karyawan Swasta', en: 'Private Employee' },
  { key: 'pns', ic: 'business-outline', tone: 'health', id: 'PNS / ASN', en: 'Civil Servant' },
  { key: 'nakes', ic: 'medkit-outline', tone: 'fin', id: 'Tenaga Kesehatan', en: 'Healthcare Worker' },
  { key: 'freelancer', ic: 'laptop-outline', tone: 'prod', id: 'Freelancer', en: 'Freelancer' },
  { key: 'tani-nelayan', ic: 'leaf-outline', tone: 'info', id: 'Petani / Nelayan', en: 'Farmer / Fisherman' },
  { key: 'pedagang', ic: 'storefront-outline', tone: 'danger', id: 'Pedagang / UMKM', en: 'Trader / SME' },
  { key: 'pengemudi', ic: 'car-outline', tone: 'health', id: 'Pengemudi / Ojol', en: 'Driver' },
  { key: 'lainnya', ic: 'ellipsis-horizontal-outline', tone: 'fin', id: 'Dan lain-lain', en: 'Other', isNew: true }
];

// Personalisasi ringan per pekerjaan — dipakai js/views/productivity.js (saran
// kategori tugas & kebiasaan) dan js/views/dashboard.js (chip pekerjaan di
// beranda), supaya Produktivitas tidak generik sama untuk semua orang seperti
// sebelumnya, tanpa perlu bikin modul terpisah untuk tiap satu dari 12 pilihan.
// `kategori`: saran datalist di form Tugas Baru (lihat Prod.openTaskModal).
// `kebiasaan`: saran chip cepat-tambah di tab Kebiasaan (lihat Prod.renderHabits).
const JOB_PRESETS = {
  guru:          { kategori: ['Kelas', 'Koreksi', 'RPP'],              kebiasaan: [{ e: '📝', n: () => tr('Siapkan materi besok', 'Prepare tomorrow\'s material') }, { e: '✅', n: () => tr('Koreksi tugas siswa', 'Grade student work') }] },
  entrepreneur:  { kategori: ['Usaha', 'Marketing', 'Investor'],        kebiasaan: [{ e: '💰', n: () => tr('Cek arus kas harian', 'Check daily cash flow') }, { e: '📊', n: () => tr('Tinjau target usaha', 'Review business targets') }] },
  irt:           { kategori: ['Rumah', 'Belanja', 'Anak'],              kebiasaan: [{ e: '🍳', n: () => tr('Rencana menu harian', 'Plan daily menu') }, { e: '🧹', n: () => tr('Bersih-bersih rumah', 'Clean the house') }] },
  pelajar:       { kategori: ['Kuliah', 'Tugas Kuliah', 'Organisasi'],  kebiasaan: [{ e: '📚', n: () => tr('Belajar 30 menit', 'Study for 30 minutes') }, { e: '📖', n: () => tr('Baca materi kuliah', 'Read course material') }] },
  karyawan:      { kategori: ['Kerja', 'Meeting', 'Laporan'],           kebiasaan: [{ e: '📋', n: () => tr('Buat to-do besok', 'Plan tomorrow\'s to-do') }, { e: '📧', n: () => tr('Cek & balas email', 'Check & reply email') }] },
  pns:           { kategori: ['Dinas', 'Laporan', 'Rapat'],             kebiasaan: [{ e: '📄', n: () => tr('Selesaikan laporan', 'Finish the report') }, { e: '🗂️', n: () => tr('Rapikan berkas', 'Organize files') }] },
  nakes:         { kategori: ['Shift', 'Pasien', 'Jaga Malam'],         kebiasaan: [{ e: '💊', n: () => tr('Cek jadwal shift', 'Check shift schedule') }, { e: '🩺', n: () => tr('Update rekam pasien', 'Update patient records') }] },
  freelancer:    { kategori: ['Klien', 'Invoice', 'Deadline'],          kebiasaan: [{ e: '🧾', n: () => tr('Kirim invoice', 'Send invoice') }, { e: '💼', n: () => tr('Follow up klien', 'Follow up with clients') }] },
  'tani-nelayan':{ kategori: ['Panen', 'Bibit/Pakan', 'Hasil Jual'],    kebiasaan: [{ e: '🌾', n: () => tr('Cek kondisi lahan/laut', 'Check field/sea condition') }, { e: '💧', n: () => tr('Rawat tanaman/ternak', 'Tend crops/livestock') }] },
  pedagang:      { kategori: ['Stok', 'Kas', 'Piutang'],                kebiasaan: [{ e: '📦', n: () => tr('Cek stok barang', 'Check inventory') }, { e: '💵', n: () => tr('Rekap kas harian', 'Recap daily cash') }] },
  pengemudi:     { kategori: ['Setoran', 'Servis Kendaraan', 'Rute'],   kebiasaan: [{ e: '⛽', n: () => tr('Cek kondisi kendaraan', 'Check vehicle condition') }, { e: '💵', n: () => tr('Catat setoran harian', 'Log daily earnings') }] },
  lainnya:       { kategori: [], kebiasaan: [] }
};

// Modul kerja khusus per-pekerjaan ("Log Kerja") — dipakai js/views/job-log.js
// & Dashboard._menuUmum (js/views/dashboard.js) supaya tab Produktivitas tidak
// cuma Catatan/Jadwal/Fokus generik untuk semua orang. Cuma pekerjaan yang
// polanya cocok jadi "catatan transaksi/aktivitas harian" yang dapat entri di
// sini — Guru sudah punya modulnya sendiri ("Kelas", lihat kelas-guru.js);
// Pelajar/Karyawan/PNS/Freelancer-ringan sudah cukup terlayani lewat
// Tugas+Jadwal+kategori (JOB_PRESETS di atas), sengaja tidak ditambahi modul
// baru supaya tidak membangun modul bespoke utk 11 pekerjaan sekaligus.
// `jenis`: opsi dropdown "jenis catatan" di modal job-log.js (nilai `v` yang
// disimpan ke Firestore harus stabil — jangan diubah setelah dipakai user).
const JOB_MODULE = {
  pedagang: {
    icon: 'storefront-outline',
    label: () => tr('Stok & Kas', 'Stock & Cash'),
    jenis: [
      { v: 'stok_masuk',  id: 'Stok Masuk',  en: 'Stock In' },
      { v: 'stok_keluar', id: 'Stok Keluar', en: 'Stock Out' },
      { v: 'kas_masuk',   id: 'Kas Masuk',   en: 'Cash In' },
      { v: 'kas_keluar',  id: 'Kas Keluar',  en: 'Cash Out' },
    ],
  },
  entrepreneur: {
    icon: 'trending-up-outline',
    label: () => tr('Kas Usaha', 'Business Cash'),
    jenis: [
      { v: 'masuk',  id: 'Pemasukan',   en: 'Income' },
      { v: 'keluar', id: 'Pengeluaran', en: 'Expense' },
    ],
  },
  pengemudi: {
    icon: 'car-outline',
    label: () => tr('Setoran & Servis', 'Earnings & Service'),
    jenis: [
      { v: 'setoran', id: 'Setoran',          en: 'Earnings' },
      { v: 'servis',  id: 'Servis Kendaraan', en: 'Vehicle Service' },
    ],
  },
  freelancer: {
    icon: 'laptop-outline',
    label: () => tr('Klien & Invoice', 'Clients & Invoices'),
    jenis: [
      { v: 'invoice', id: 'Invoice',    en: 'Invoice' },
      { v: 'klien',   id: 'Klien Baru', en: 'New Client' },
    ],
  },
  'tani-nelayan': {
    icon: 'leaf-outline',
    label: () => tr('Panen & Hasil Jual', 'Harvest & Sales'),
    jenis: [
      { v: 'panen', id: 'Panen',      en: 'Harvest' },
      { v: 'jual',  id: 'Hasil Jual', en: 'Sales' },
    ],
  },
  // Sengaja "Catatan Kerja", BUKAN "Pasien"/rekam medis — ini catatan
  // pribadi tenaga kesehatan ttg shift/pekerjaannya sendiri, bukan
  // penyimpanan data kesehatan pihak ketiga (rekam medis pasien sungguhan).
  nakes: {
    icon: 'medkit-outline',
    label: () => tr('Shift & Catatan Kerja', 'Shift & Work Notes'),
    jenis: [
      { v: 'shift',   id: 'Shift',   en: 'Shift' },
      { v: 'catatan', id: 'Catatan', en: 'Note' },
    ],
  },
  irt: {
    icon: 'home-outline',
    label: () => tr('Belanja & Menu', 'Shopping & Menu'),
    jenis: [
      { v: 'belanja', id: 'Belanja',     en: 'Shopping' },
      { v: 'menu',    id: 'Menu Harian', en: 'Daily Menu' },
    ],
  },
};

const JobSelectView = {
  _selected: null,   // Set<string> — key JOBS yang dipilih (di luar "lainnya"), state lokal sebelum disimpan
  _custom: '',        // teks bebas pekerjaan lain (opsional)

  // Daftar pekerjaan tersimpan (pekerjaanList array baru, atau pekerjaan
  // tunggal lama sebagai fallback) → dipecah jadi pilihan kartu dikenal +
  // sisa teks bebas ("lainnya"). Dipakai baik di sini maupun profile.js.
  _splitSaved(user) {
    const list = Array.isArray(user.pekerjaanList) && user.pekerjaanList.length
      ? user.pekerjaanList : (user.pekerjaan ? [user.pekerjaan] : []);
    const known = list.filter(v => JOBS.some(j => j.key === v && j.key !== 'lainnya'));
    const custom = list.find(v => !JOBS.some(j => j.key === v)) || '';
    return { known, custom };
  },

  render(user) {
    this._user = user;
    if (!this._selected) {
      const { known, custom } = this._splitSaved(user);
      this._selected = new Set(known);
      this._custom = custom;
    }

    const KARTU = JOBS.filter(j => j.key !== 'lainnya');

    $('#jobRoot').innerHTML = `
      <div class="job-wrap">
        <div class="job-head">
          <h1>${tr(`Hai, ${esc((user.nama || '').split(' ')[0] || 'kamu')}! Apa pekerjaanmu?`, `Hi, ${esc((user.nama || '').split(' ')[0] || 'there')}! What's your job?`)}</h1>
          <p>${tr('Pilih satu atau lebih — kami sesuaikan Tumara dengan semua kebutuhanmu.', "Pick one or more — we'll tailor Tumara to all your needs.")}</p>
        </div>
        <div class="job-grid">
          ${KARTU.map(j => `
            <div class="job-card ${this._selected.has(j.key) ? 'selected' : ''} ${jobIsLocked(j.key, this._selected) ? 'disabled' : ''}" data-key="${j.key}">
              ${j.isNew ? `<span class="job-new">${tr('Baru', 'New')}</span>` : ''}
              <div class="job-ic" style="background:var(--${j.tone}-soft);color:var(--${j.tone});">
                <ion-icon name="${j.ic}"></ion-icon>
              </div>
              <div class="job-label">${tr(j.id, j.en)}</div>
            </div>`).join('')}
        </div>
        ${this._selected.has(JOB_STUDENT_KEY) ? `<p class="job-lock-hint">${tr('Sebagai Pelajar / Mahasiswa, kamu hanya bisa menambah Freelancer sebagai pekerjaan kedua.', 'As a Student, you can only add Freelancer as a second job.')}</p>` : ''}
        <div class="field" style="max-width:420px;margin:22px auto 0;">
          <label>${tr('Pekerjaan lain (opsional)', 'Other job (optional)')}</label>
          <input type="text" class="input" id="jobCustomInput" maxlength="60" placeholder="${tr('mis. Programmer, Content Creator, dll.', 'e.g. Programmer, Content Creator, etc.')}" value="${esc(this._custom)}">
        </div>
        <button class="btn btn-primary btn-block" id="jobContinue" style="max-width:420px;margin:18px auto 0;display:block;">
          <ion-icon name="checkmark"></ion-icon> ${tr('Lanjut', 'Continue')}
        </button>
      </div>`;

    $$('.job-card').forEach(card => card.onclick = () => {
      if (card.classList.contains('busy') || card.classList.contains('disabled')) return;
      const key = card.dataset.key;
      this._selected.has(key) ? this._selected.delete(key) : this._selected.add(key);
      if (key === JOB_STUDENT_KEY) {
        // Barusan menyalakan/mematikan "Pelajar / Mahasiswa" — render ulang
        // penuh supaya kartu lain langsung terkunci/terbuka sesuai aturan.
        jobLockToStudent(this._selected);
        return this.render(this._user);
      }
      card.classList.toggle('selected');
    });

    // Ketik langsung ke this._custom supaya nilainya tak hilang kalau
    // halaman dirender ulang sebelum "Lanjut" ditekan (mis. ganti bahasa).
    $('#jobCustomInput').oninput = e => { this._custom = e.target.value; };

    $('#jobContinue').onclick = () => this._continue();
  },

  async _continue() {
    this._custom = $('#jobCustomInput').value.trim();
    const list = [...this._selected, ...(this._custom ? [this._custom] : [])];
    if (!list.length) return toast(tr('Pilih minimal satu pekerjaan, atau tulis pekerjaanmu sendiri.', 'Pick at least one job, or type your own.'), 'warning');

    $('#jobContinue').disabled = true;
    $$('.job-card').forEach(c => c.classList.add('busy'));
    try {
      await UmumAuth.savePekerjaan(list);
      // Siapkan saran AI (kategori/kebiasaan) utk SEMUA pekerjaan yang dipilih
      // — kartu preset dikirim pakai label kanoniknya (id Indonesia, stabil
      // lepas dari bahasa UI) supaya kunci cache-nya konsisten dgn yang dibaca
      // productivity.js — SEBELUM pindah halaman (location.replace di bawah
      // membatalkan fetch yang belum selesai). Serial (bukan Promise.all):
      // ensure() men-merge `aiJobPresets` dari snapshot `user` yang diberikan,
      // jadi paralel bisa saling timpa hasil satu sama lain kalau lebih dari
      // satu pekerjaan dipilih. Gagal pun tak masalah, ensure() diam-diam.
      const jobTexts = [...this._selected].map(k => JOBS.find(j => j.key === k)?.id || k);
      if (this._custom) jobTexts.push(this._custom);
      for (const jt of jobTexts) await AiJobPreset.ensure(jt, UmumAuth.user, patch => UmumAuth._patch(patch));
      location.replace(UmumAuth.hasDataDiri(UmumAuth.user) ? 'umum-app.html' : 'data-diri.html');
    } catch (_) {
      toast(tr('Gagal menyimpan pilihan. Coba lagi.', 'Failed to save your choice. Please try again.'), 'error');
      $('#jobContinue').disabled = false;
      $$('.job-card').forEach(c => c.classList.remove('busy'));
    }
  }
};
