/* ============================================================
   TUMARA — Log Kerja (jalur Umum)
   ------------------------------------------------------------
   Modul khusus utk pekerjaan yang polanya cocok jadi "catatan
   transaksi/aktivitas harian" (uang/stok/shift) — lihat JOB_MODULE
   di js/views/job-select.js utk daftar pekerjaan & opsi "jenis"
   per pekerjaan (mis. Pedagang → Stok Masuk/Keluar, Kas Masuk/
   Keluar). BUKAN halaman nav tersendiri — tampil sebagai TAB
   tambahan ("Log Kerja") di dalam halaman Produktivitas kalau
   salah satu pekerjaan user ada di JOB_MODULE, lihat Prod._effKlaster
   (js/views/productivity.js) yang memanggil JobLog.render() langsung.
   Beda dari "Kelas" (js/views/kelas-guru.js), yang untuk Guru justru
   jadi halaman nav tersendiri — Guru sudah punya modulnya sendiri
   sejak awal, sedangkan pekerjaan lain di sini ditaruh menyatu dgn
   Produktivitas yang sudah ada supaya tak menambah item nav baru.

   Kalau user pilih LEBIH dari satu pekerjaan yang match JOB_MODULE
   (mis. Pedagang + Freelancer), label halaman jatuh ke generik
   "Log Kerja" dan opsi "jenis" di dropdown digabung dari semua
   pekerjaan yang match (dedup by value) — lihat _label()/_jenisOptions().

   Koleksi (personal per-akun, lihat js/umum-db.js):
   • job_log — { jenis, tanggal, jumlah(number|null, opsional),
                 catatan(opsional), dibuat }
   ============================================================ */

const JobLog = {
  filterJenis: 'semua',

  _myJobKeys() {
    if (typeof JOB_MODULE === 'undefined') return [];
    const list = DB.user?.pekerjaanList?.length ? DB.user.pekerjaanList : (DB.user?.pekerjaan ? [DB.user.pekerjaan] : []);
    return list.filter(k => JOB_MODULE[k]);
  },

  // Label halaman: pekerjaan tunggal yang match → pakai labelnya persis;
  // lebih dari satu (atau nol, seharusnya tak pernah kejadian krn render()
  // sudah redirect) → generik "Log Kerja". Dipakai juga oleh dashboard.js
  // utk label tile menu, supaya konsisten di kedua tempat.
  _label() {
    const keys = this._myJobKeys();
    return keys.length === 1 ? JOB_MODULE[keys[0]].label() : tr('Log Kerja', 'Work Log');
  },

  _icon() {
    const keys = this._myJobKeys();
    return keys.length === 1 ? JOB_MODULE[keys[0]].icon : 'briefcase-outline';
  },

  // Gabungan opsi "jenis" dari SEMUA pekerjaan user yang match, dedup by value
  // (mis. dua pekerjaan kebetulan punya jenis yang sama persis).
  _jenisOptions() {
    const seen = new Set(), out = [];
    this._myJobKeys().forEach(k => JOB_MODULE[k].jenis.forEach(j => {
      if (!seen.has(j.v)) { seen.add(j.v); out.push(j); }
    }));
    return out;
  },

  async render(el) {
    if (!this._myJobKeys().length) { App.navigate('dashboard'); return; }
    const jenisOpts = this._jenisOptions();
    const jenisLabel = v => { const j = jenisOpts.find(x => x.v === v); return j ? tr(j.id, j.en) : v; };

    const all = (await DB.list('job_log')).sort((a, b) => (b.tanggal || '') < (a.tanggal || '') ? -1 : 1);
    const rows = this.filterJenis === 'semua' ? all : all.filter(r => r.jenis === this.filterJenis);

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="font-size:.88rem;color:var(--text-3);font-weight:600;">${tr('Catatan kerja harianmu, sesuai pekerjaan yang kamu pilih 📋', 'Your daily work log, tailored to your job 📋')}</div>
        <button class="btn btn-prod btn-sm" id="addLog"><ion-icon name="add"></ion-icon> ${tr('Catatan Baru', 'New Entry')}</button>
      </div>

      ${jenisOpts.length > 1 ? `
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
          <button class="chip ${this.filterJenis === 'semua' ? 'active' : ''}" data-filter="semua">${tr('Semua', 'All')}</button>
          ${jenisOpts.map(j => `<button class="chip ${this.filterJenis === j.v ? 'active' : ''}" data-filter="${j.v}">${tr(j.id, j.en)}</button>`).join('')}
        </div>` : ''}

      ${rows.length ? `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${rows.map(r => `
            <div class="list-item" data-open="${r.id}" style="cursor:pointer;">
              <div class="item-icon" style="background:var(--prod-soft);color:var(--prod);"><ion-icon name="${this._icon()}"></ion-icon></div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:.92rem;">${esc(jenisLabel(r.jenis))}${r.jumlah !== null && r.jumlah !== undefined ? ` · ${r.jumlah}` : ''}</div>
                <div style="font-size:.78rem;color:var(--text-3);">${fmtDate(r.tanggal, { short: true })}${r.catatan ? ' · ' + esc(r.catatan) : ''}</div>
              </div>
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="${this._icon()}"></ion-icon>
          <div class="es-title">${tr('Belum ada catatan', 'No entries yet')}</div>
          <div class="es-sub">${tr('Mulai catat aktivitas kerjamu di sini 📋', 'Start logging your work here 📋')}</div>
        </div>`}`;

    $('#addLog', el).onclick = () => this._logModal(jenisOpts);
    $$('[data-open]', el).forEach(c => c.onclick = () => this._logModal(jenisOpts, all.find(r => r.id === c.dataset.open)));
    $$('[data-filter]', el).forEach(b => b.onclick = () => { this.filterJenis = b.dataset.filter; this.render(el); });
  },

  _logModal(jenisOpts, item = null) {
    openModal({
      title: item ? tr('Ubah Catatan', 'Edit Entry') : tr('Catatan Baru', 'New Entry'),
      body: `
        <div class="field">
          <label>${tr('Jenis', 'Type')}</label>
          <select class="select" id="mJenis">
            ${jenisOpts.map(j => `<option value="${j.v}" ${(item?.jenis || jenisOpts[0]?.v) === j.v ? 'selected' : ''}>${tr(j.id, j.en)}</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>${tr('Tanggal', 'Date')}</label>
            <input type="date" class="input" id="mTanggal" value="${item?.tanggal || todayStr()}">
          </div>
          <div class="field">
            <label>${tr('Jumlah', 'Amount')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
            <input type="number" class="input" id="mJumlah" placeholder="0" value="${item?.jumlah ?? ''}">
          </div>
        </div>
        <div class="field">
          <label>${tr('Catatan', 'Note')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
          <textarea class="textarea" id="mCatatan" placeholder="${tr('Detail tambahan…', 'Extra details…')}">${esc(item?.catatan || '')}</textarea>
        </div>
        <div style="display:flex;gap:10px;">
          ${item ? `<button class="btn btn-soft-danger" id="mDel"><ion-icon name="trash-outline"></ion-icon></button>` : ''}
          <button class="btn btn-prod btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>
        </div>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const jumlahRaw = $('#mJumlah', m).value;
          const data = {
            jenis: $('#mJenis', m).value,
            tanggal: $('#mTanggal', m).value || todayStr(),
            jumlah: jumlahRaw === '' ? null : +jumlahRaw,
            catatan: $('#mCatatan', m).value.trim(),
          };
          if (item) await DB.update('job_log', item.id, data);
          else await DB.add('job_log', { ...data, dibuat: new Date().toISOString() });
          closeModal();
          toast(item ? tr('Catatan diperbarui.', 'Entry updated.') : tr('Catatan ditambahkan 📋', 'Entry added 📋'));
          App.refresh();
        };
        const del = $('#mDel', m);
        if (del) del.onclick = async () => {
          if (!await confirmDialog(tr('Hapus catatan ini?', 'Delete this entry?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
          await DB.remove('job_log', item.id);
          closeModal();
          toast(tr('Catatan dihapus.', 'Entry deleted.'));
          App.refresh();
        };
      }
    });
  },
};
