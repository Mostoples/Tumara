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
            <div class="job-card ${this._selected.has(j.key) ? 'selected' : ''}" data-key="${j.key}">
              ${j.isNew ? `<span class="job-new">${tr('Baru', 'New')}</span>` : ''}
              <div class="job-ic" style="background:var(--${j.tone}-soft);color:var(--${j.tone});">
                <ion-icon name="${j.ic}"></ion-icon>
              </div>
              <div class="job-label">${tr(j.id, j.en)}</div>
            </div>`).join('')}
        </div>
        <div class="field" style="max-width:420px;margin:22px auto 0;">
          <label>${tr('Pekerjaan lain (opsional)', 'Other job (optional)')}</label>
          <input type="text" class="input" id="jobCustomInput" maxlength="60" placeholder="${tr('mis. Programmer, Content Creator, dll.', 'e.g. Programmer, Content Creator, etc.')}" value="${esc(this._custom)}">
        </div>
        <button class="btn btn-primary btn-block" id="jobContinue" style="max-width:420px;margin:18px auto 0;display:block;">
          <ion-icon name="checkmark"></ion-icon> ${tr('Lanjut', 'Continue')}
        </button>
      </div>`;

    $$('.job-card').forEach(card => card.onclick = () => {
      if (card.classList.contains('busy')) return;
      const key = card.dataset.key;
      this._selected.has(key) ? this._selected.delete(key) : this._selected.add(key);
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
      location.replace(UmumAuth.hasDataDiri(UmumAuth.user) ? 'umum-app.html' : 'data-diri.html');
    } catch (_) {
      toast(tr('Gagal menyimpan pilihan. Coba lagi.', 'Failed to save your choice. Please try again.'), 'error');
      $('#jobContinue').disabled = false;
      $$('.job-card').forEach(c => c.classList.remove('busy'));
    }
  }
};
