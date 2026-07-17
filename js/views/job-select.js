/* ============================================================
   TUMARA — Pilih Pekerjaan (jalur uji coba)
   ------------------------------------------------------------
   Ditampilkan setelah Google/email login lewat register.html.
   Memilih satu kartu → disimpan ke trial_users/{uid}.pekerjaan
   (TrialAuth.savePekerjaan) → lanjut ke coba-app.html (shell
   aplikasi uji coba — fitur sama dengan app.html versi siswa).
   ============================================================ */

const JOBS = [
  { key: 'guru', ic: 'school-outline', tone: 'health', id: 'Guru', en: 'Teacher' },
  { key: 'entrepreneur', ic: 'trending-up-outline', tone: 'fin', id: 'Entrepreneur', en: 'Entrepreneur' },
  { key: 'irt', ic: 'home-outline', tone: 'prod', id: 'IRT', en: 'Homemaker' },
  { key: 'pelajar', ic: 'book-outline', tone: 'info', id: 'Pelajar/Mahasiswa', en: 'Student' },
  { key: 'karyawan', ic: 'briefcase-outline', tone: 'danger', id: 'Karyawan Swasta', en: 'Private Employee' },
  { key: 'pns', ic: 'business-outline', tone: 'health', id: 'PNS/ASN', en: 'Civil Servant' },
  { key: 'nakes', ic: 'medkit-outline', tone: 'fin', id: 'Tenaga Kesehatan', en: 'Healthcare Worker' },
  { key: 'freelancer', ic: 'laptop-outline', tone: 'prod', id: 'Freelancer', en: 'Freelancer' },
  { key: 'tani-nelayan', ic: 'leaf-outline', tone: 'info', id: 'Petani/Nelayan', en: 'Farmer/Fisherman' },
  { key: 'pedagang', ic: 'storefront-outline', tone: 'danger', id: 'Pedagang/UMKM', en: 'Trader/SME' },
  { key: 'pengemudi', ic: 'car-outline', tone: 'health', id: 'Pengemudi/Ojol', en: 'Driver' },
  { key: 'lainnya', ic: 'ellipsis-horizontal-outline', tone: 'fin', id: 'Dan lain-lain', en: 'Other', isNew: true }
];

const JobSelectView = {
  render(user) {
    // pekerjaan bebas ketik (lewat kartu "Dan lain-lain") tidak cocok
    // dengan key manapun di JOBS — tandai kartu itu terpilih juga.
    const isKnownJob = JOBS.some(j => j.key === user.pekerjaan);

    $('#jobRoot').innerHTML = `
      <div class="job-wrap">
        <div class="job-head">
          <h1>${tr(`Hai, ${esc((user.nama || '').split(' ')[0] || 'kamu')}! Apa pekerjaanmu?`, `Hi, ${esc((user.nama || '').split(' ')[0] || 'there')}! What's your job?`)}</h1>
          <p>${tr('Kami sesuaikan Tumara dengan kebutuhanmu sehari-hari.', 'We\'ll tailor Tumara to your daily needs.')}</p>
        </div>
        <div class="job-grid">
          ${JOBS.map(j => `
            <div class="job-card ${user.pekerjaan === j.key || (j.key === 'lainnya' && user.pekerjaan && !isKnownJob) ? 'selected' : ''}" data-key="${j.key}">
              ${j.isNew ? `<span class="job-new">${tr('Baru', 'New')}</span>` : ''}
              <div class="job-ic" style="background:var(--${j.tone}-soft);color:var(--${j.tone});">
                <ion-icon name="${j.ic}"></ion-icon>
              </div>
              <div class="job-label">${tr(j.id, j.en)}</div>
            </div>`).join('')}
        </div>
      </div>`;

    $$('.job-card').forEach(card => card.onclick = () => {
      if (card.classList.contains('busy')) return;
      card.dataset.key === 'lainnya' ? this._customModal() : this._pick(card.dataset.key);
    });
  },

  _customModal() {
    openModal({
      title: tr('Pekerjaanmu apa?', 'What\'s your job?'),
      body: `
        <form id="jobCustomForm">
          <div class="field">
            <label>${tr('Tulis pekerjaanmu', 'Type your job')}</label>
            <input type="text" class="input" id="jobCustomInput" placeholder="${tr('mis. Programmer, Content Creator, dll.', 'e.g. Programmer, Content Creator, etc.')}" maxlength="60" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block" id="jobCustomSubmit">${tr('Simpan', 'Save')}</button>
        </form>`
    });
    $('#jobCustomForm').onsubmit = e => {
      e.preventDefault();
      const val = $('#jobCustomInput').value.trim();
      if (!val) return;
      closeModal();
      this._pick(val);
    };
  },

  async _pick(pekerjaan) {
    $$('.job-card').forEach(c => c.classList.add('busy'));
    try {
      await TrialAuth.savePekerjaan(pekerjaan);
      location.replace('coba-app.html');
    } catch (_) {
      toast(tr('Gagal menyimpan pilihan. Coba lagi.', 'Failed to save your choice. Please try again.'), 'error');
      $$('.job-card').forEach(c => c.classList.remove('busy'));
    }
  }
};
