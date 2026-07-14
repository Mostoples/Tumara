/* ============================================================
   TUMARA — Panel Admin
   Kelola akun: buat akun guru/siswa, ubah peran, hapus.
   Dipakai di admin.html (di luar App router siswa).
   ============================================================ */

const AdminView = {
  query: '',
  filter: 'all', // 'all' | 'admin' | 'guru' | 'siswa'
  view: 'accounts', // 'accounts' | 'classes'
  activeClassId: null,
  _el: null,

  // Pengalih antara halaman Akun & halaman Kelas/Siswa (data induk sekolah).
  _switcher() {
    return `<div class="tabs" style="margin-bottom:18px;">
      <button class="tab ${this.view === 'accounts' ? 'active' : ''}" data-view="accounts"><ion-icon name="people-outline"></ion-icon>${tr('Akun', 'Accounts')}</button>
      <button class="tab ${this.view === 'classes' ? 'active' : ''}" data-view="classes"><ion-icon name="school-outline"></ion-icon>${tr('Kelas & Siswa', 'Classes & Students')}</button>
    </div>`;
  },

  _bindSwitcher(el) {
    $$('[data-view]', el).forEach(b => b.onclick = () => { this.view = b.dataset.view; this.render(this._el); });
  },

  async render(el) {
    this._el = el;
    if (this.view === 'classes') return this.renderClasses(el);
    return this.renderAccounts(el);
  },

  async renderAccounts(el) {
    el.innerHTML = `${this._switcher()}<div class="portal-loading"><div class="spinner"></div> ${tr('Memuat data akun…', 'Loading accounts…')}</div>`;
    this._bindSwitcher(el);

    let users = [];
    try {
      // Disimpan agar mencari/memfilter tidak perlu mengambil ulang data dari
      // server (dulu tiap ketikan memanggil render() → spinner + fetch ulang).
      users = this._users = await DB.adminListUsers();
    } catch (e) {
      el.innerHTML = `<div class="card empty-state">
        <ion-icon name="alert-circle-outline"></ion-icon>
        <div class="es-title">${tr('Gagal memuat data akun', 'Failed to load accounts')}</div>
        <div class="es-sub">${esc(e.message || '')}</div>
      </div>`;
      return;
    }

    const counts = { admin: 0, guru: 0, siswa: 0 };
    users.forEach(u => { counts[u.role || 'siswa'] = (counts[u.role || 'siswa'] || 0) + 1; });

    el.innerHTML = `
      ${this._switcher()}
      <div class="portal-head">
        <div>
          <h1>${tr('Kelola Akun', 'Manage Accounts')}</h1>
          <p>${tr('Buat & atur akun guru dan siswa sekolahmu.', 'Create & manage teacher and student accounts.')}</p>
        </div>
        <button class="btn btn-primary" id="addUser"><ion-icon name="person-add-outline"></ion-icon> ${tr('Buat Akun', 'Create Account')}</button>
      </div>

      <div class="grid grid-4 stat-grid">
        <div class="card stat-mini"><div class="sm-num">${users.length}</div><div class="sm-label">${tr('Total Akun', 'Total Accounts')}</div></div>
        <div class="card stat-mini"><div class="sm-num" style="color:var(--prod)">${counts.admin || 0}</div><div class="sm-label">Admin</div></div>
        <div class="card stat-mini"><div class="sm-num" style="color:var(--brand)">${counts.guru || 0}</div><div class="sm-label">${tr('Guru', 'Teachers')}</div></div>
        <div class="card stat-mini"><div class="sm-num" style="color:var(--info)">${counts.siswa || 0}</div><div class="sm-label">${tr('Siswa', 'Students')}</div></div>
      </div>

      <div style="display:flex;gap:10px;margin:20px 0 16px;flex-wrap:wrap;align-items:center;">
        <div class="input-group" style="flex:1;min-width:220px;">
          <input type="text" class="input" id="uSearch" placeholder="${tr('Cari nama, NIS, kelas…', 'Search name, NIS, class…')}" value="${esc(this.query)}">
          <button class="suffix-btn"><ion-icon name="search-outline"></ion-icon></button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${['all', 'guru', 'siswa', 'admin'].map(f => `<button class="chip ${this.filter === f ? 'active' : ''}" data-filter="${f}">${f === 'all' ? tr('Semua', 'All') : roleLabel(f)}</button>`).join('')}
        </div>
      </div>

      <div id="uList"></div>`;

    this._bindSwitcher(el);
    $('#addUser', el).onclick = () => this._userModal();

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

    $$('[data-filter]', el).forEach(b => b.onclick = () => {
      this.filter = b.dataset.filter;
      $$('[data-filter]', el).forEach(x => x.classList.toggle('active', x.dataset.filter === this.filter));
      this._paintUsers(el);
    });

    this._paintUsers(el);
  },

  // Identitas yang diketik pengguna di halaman masuk: akun sekolah memakai
  // nama lengkap (email internal disembunyikan), akun admin memakai emailnya.
  _loginId(u) {
    if (u.email && !isInternalEmail(u.email)) return u.email;
    return u.username || usernameOf(u.nama || '') || '-';
  },

  // Menyaring akun sesuai kotak pencarian + chip peran (dari data di memori).
  _filterUsers() {
    const q = this.query.trim().toLowerCase();
    const shown = (this._users || []).filter(u => {
      if (this.filter !== 'all' && (u.role || 'siswa') !== this.filter) return false;
      if (!q) return true;
      return (u.nama || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
        || (u.nis || '').toLowerCase().includes(q)
        || (u.kelas || '').toLowerCase().includes(q) || (u.mapel || '').toLowerCase().includes(q);
    });
    const order = { admin: 0, guru: 1, siswa: 2 };
    return shown.sort((a, b) => {
      const r = (order[a.role] ?? 3) - (order[b.role] ?? 3);
      return r !== 0 ? r : (a.nama || '').localeCompare(b.nama || '');
    });
  },

  // Gambar ulang HANYA daftar akun (#uList) + pasang lagi tombol barisnya.
  _paintUsers(el) {
    const list = $('#uList', el);
    if (!list) return;
    const shown = this._filterUsers();

    const roleBadge = r => {
      const map = { admin: 'badge-purple', guru: 'badge-green', siswa: 'badge-blue' };
      return `<span class="badge ${map[r] || 'badge-gray'}">${roleLabel(r)}</span>`;
    };

    // Avatar: pakai foto profil (fotoUrl/photoURL) bila ada, selain itu inisial.
    // referrerpolicy diperlukan agar foto akun Google tidak diblokir (403).
    const avatarInner = u => {
      const foto = u.fotoUrl || u.photoURL;
      return foto
        ? `<img src="${esc(foto)}" alt="${esc(u.nama || 'Foto profil')}" referrerpolicy="no-referrer">`
        : esc((u.nama || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase());
    };

    list.innerHTML = shown.length ? `
      <div class="table-wrap stack">
        <table class="data-table stack">
          <thead><tr>
            <th>${tr('Nama', 'Name')}</th><th>${tr('Masuk dengan', 'Signs in with')}</th><th>${tr('Peran', 'Role')}</th>
            <th>${tr('Detail', 'Detail')}</th><th style="text-align:right;">${tr('Aksi', 'Actions')}</th>
          </tr></thead>
          <tbody>
            ${shown.map(u => `
              <tr>
                <td class="cell-primary"><div style="display:flex;align-items:center;gap:10px;">
                  <span class="avatar avatar-sm${(u.fotoUrl || u.photoURL) ? ' avatar-photo' : ''}">${avatarInner(u)}</span>
                  <b>${esc(u.nama || '-')}</b>
                </div></td>
                <td data-label="${tr('Masuk dengan', 'Signs in with')}" style="color:var(--text-3);">${esc(this._loginId(u))}</td>
                <td data-label="${tr('Peran', 'Role')}">${roleBadge(u.role || 'siswa')}</td>
                <td data-label="${tr('Detail', 'Detail')}" style="color:var(--text-3);font-size:.82rem;">${esc(u.mapel || u.kelas || u.sekolah || '-')}</td>
                <td data-label="${tr('Aksi', 'Actions')}" style="text-align:right;white-space:nowrap;">
                  <button class="mini-icon-btn" data-edit="${u.id}" title="${tr('Ubah', 'Edit')}"><ion-icon name="create-outline"></ion-icon></button>
                  <button class="mini-icon-btn danger" data-del="${u.id}" title="${(u.role || 'siswa') === 'admin' ? tr('Akun admin tidak bisa dihapus', 'Admin accounts cannot be deleted') : tr('Hapus', 'Delete')}" ${u.id === DB.user.id || (u.role || 'siswa') === 'admin' ? 'disabled' : ''}><ion-icon name="trash-outline"></ion-icon></button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="card empty-state">
        <ion-icon name="people-outline"></ion-icon>
        <div class="es-title">${tr('Tidak ada akun yang cocok', 'No matching accounts')}</div>
        <div class="es-sub">${this.query || this.filter !== 'all' ? tr('Coba ubah pencarian/filter', 'Try changing the search/filter') : tr('Buat akun pertama dengan tombol di atas', 'Create the first account with the button above')}</div>
      </div>`;

    $$('[data-edit]', list).forEach(b => b.onclick = () => this._userModal((this._users || []).find(u => u.id === b.dataset.edit)));
    $$('[data-del]', list).forEach(b => b.onclick = async () => {
      const u = (this._users || []).find(x => x.id === b.dataset.del);
      if ((u.role || 'siswa') === 'admin') return toast(tr('Akun admin tidak bisa dihapus.', 'Admin accounts cannot be deleted.'), 'warning');
      if (!await confirmDialog(
        tr(`Hapus akun "${u.nama}"? Data profilnya akan dihapus. Tindakan ini tidak bisa dibatalkan.`,
           `Delete account "${u.nama}"? Their profile data will be removed. This cannot be undone.`),
        { danger: true, okText: tr('Hapus Akun', 'Delete Account') })) return;
      try {
        await DB.adminDeleteUser(u.id);
        toast(tr('Akun dihapus.', 'Account deleted.'));
        this.render(el);
      } catch (e) { toast(e.message, 'error'); }
    });
  },

  /* ============================================================
     HALAMAN: KELAS & SISWA
     Admin membuat kelas (school_classes), lalu menambah siswa —
     dan "Tambah Siswa" LANGSUNG MEMBUAT AKUN siswa (role 'siswa')
     yang tertaut ke kelas itu (kelasId). Jadi daftar di bawah tiap
     kelas adalah akun sungguhan, bukan catatan terpisah.
     Kredensialnya: username (dari nama) + NIS sebagai kata sandi.
     ============================================================ */

  // Tingkat kelas yang tersedia di pilihan "Kelas Baru".
  TINGKAT: ['X', 'XI', 'XII', 'XIII'],

  _sortByOrder(arr) {
    return arr.sort((a, b) => (a.urutan ?? 999999) - (b.urutan ?? 999999) || (a.nama || '').localeCompare(b.nama || ''));
  },

  // NIS: hanya angka, maksimal 20 digit.
  _cleanNis(v) { return String(v || '').replace(/\D/g, '').slice(0, 20); },
  // Batasi input #mNis ke digit & maks 20 angka saat diketik/tempel.
  _bindNis(scope) {
    const el = $('#mNis', scope);
    if (el) el.oninput = () => { el.value = this._cleanNis(el.value); };
  },

  async renderClasses(el) {
    el.innerHTML = `${this._switcher()}<div class="portal-loading"><div class="spinner"></div> ${tr('Memuat data kelas…', 'Loading classes…')}</div>`;
    this._bindSwitcher(el);

    let classes = [];
    try {
      classes = this._sortByOrder(await DB.gList('school_classes'));
    } catch (e) {
      el.innerHTML = `${this._switcher()}<div class="card empty-state">
        <ion-icon name="alert-circle-outline"></ion-icon>
        <div class="es-title">${tr('Gagal memuat kelas', 'Failed to load classes')}</div>
        <div class="es-sub">${esc(e.message || '')}</div>
      </div>`;
      this._bindSwitcher(el);
      return;
    }

    if (classes.length && (!this.activeClassId || !classes.find(c => c.id === this.activeClassId))) {
      this.activeClassId = classes[0].id;
    }
    const active = classes.find(c => c.id === this.activeClassId) || null;
    // Daftar siswa kelas ini = AKUN siswa dengan kelasId tsb (bukan catatan terpisah).
    const siswa = active
      ? (await DB.listStudentsByClass(active.id)).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''))
      : [];

    el.innerHTML = `
      ${this._switcher()}
      <div class="portal-head" style="margin-bottom:16px;">
        <div>
          <h1>${tr('Kelas & Siswa', 'Classes & Students')}</h1>
          <p>${tr('Buat kelas, lalu tambahkan siswanya — tiap siswa yang ditambahkan langsung dibuatkan akun (username + NIS).', 'Create classes, then add their students — each student added gets an account right away (username + NIS).')}</p>
        </div>
        <button class="btn btn-primary" id="addClass"><ion-icon name="add"></ion-icon> ${tr('Kelas Baru', 'New Class')}</button>
      </div>

      ${classes.length ? `
        <div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:20px;">
          ${classes.map(c => `<button class="chip ${c.id === this.activeClassId ? 'active' : ''}" data-pick="${c.id}">${esc(c.nama)}</button>`).join('')}
        </div>

        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div class="card-title" style="margin:0;"><ion-icon name="people" style="color:var(--brand)"></ion-icon>${esc(active.nama)} <span class="badge badge-blue">${siswa.length} ${tr('siswa', 'students')}</span></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" id="addStudent"><ion-icon name="person-add-outline"></ion-icon> ${tr('Tambah Siswa', 'Add Student')}</button>
              <button class="btn btn-sm" id="importStudents"><ion-icon name="cloud-upload-outline"></ion-icon> ${tr('Import Massal', 'Bulk Import')}</button>
              <button class="btn btn-sm" id="exportRoster"${siswa.length ? '' : ' disabled'}><ion-icon name="download-outline"></ion-icon> CSV</button>
              <button class="btn btn-sm" id="editClass"><ion-icon name="create-outline"></ion-icon> ${tr('Ubah', 'Edit')}</button>
              <button class="btn btn-sm btn-soft-danger" id="delClass"><ion-icon name="trash-outline"></ion-icon></button>
            </div>
          </div>

          ${siswa.length ? `
            <div class="table-wrap stack" style="margin-top:16px;">
              <table class="data-table stack">
                <thead><tr>
                  <th style="width:44px;">No</th><th>${tr('Nama Siswa', 'Student Name')}</th>
                  <th>Username</th><th>${tr('NIS (kata sandi)', 'NIS (password)')}</th>
                  <th style="text-align:right;">${tr('Aksi', 'Actions')}</th>
                </tr></thead>
                <tbody>
                  ${siswa.map((s, i) => `
                    <tr>
                      <td class="center">${i + 1}</td>
                      <td class="cell-primary"><b>${esc(s.nama)}</b></td>
                      <td data-label="Username" style="color:var(--text-3);">${esc(this._loginId(s))}</td>
                      <td data-label="NIS" style="color:var(--text-3);">${esc(s.nis || '-')}</td>
                      <td data-label="${tr('Aksi', 'Actions')}" style="text-align:right;white-space:nowrap;">
                        <button class="mini-icon-btn" data-edits="${s.id}" title="${tr('Ubah', 'Edit')}"><ion-icon name="create-outline"></ion-icon></button>
                        <button class="mini-icon-btn danger" data-dels="${s.id}" title="${tr('Hapus akun', 'Delete account')}"><ion-icon name="trash-outline"></ion-icon></button>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>` : `
            <div class="empty-state" style="padding:30px 10px;">
              <ion-icon name="person-add-outline"></ion-icon>
              <div class="es-title">${tr('Belum ada siswa di kelas ini', 'No students in this class yet')}</div>
              <div class="es-sub">${tr('Tekan "Tambah Siswa" (nama + NIS) — akunnya langsung dibuat.', 'Press "Add Student" (name + NIS) — the account is created right away.')}</div>
            </div>`}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="school-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada kelas', 'No classes yet')}</div>
          <div class="es-sub">${tr('Buat kelas pertama, mis. tingkat "X" + nama "TKJ 1" 🏫', 'Create your first class, e.g. grade "X" + name "TKJ 1" 🏫')}</div>
        </div>`}`;

    this._bindSwitcher(el);
    $('#addClass', el).onclick = () => this._classModal();
    $$('[data-pick]', el).forEach(b => b.onclick = () => { this.activeClassId = b.dataset.pick; this.render(this._el); });

    if (active) {
      $('#editClass', el).onclick = () => this._classModal(active);
      $('#delClass', el).onclick = async () => {
        // Kelas berisi akun siswa: hapus siswanya dulu — supaya tak ada akun
        // yang menggantung tanpa kelas (dan admin sadar apa yang ia hapus).
        if (siswa.length) {
          return toast(tr(`Kelas "${active.nama}" masih berisi ${siswa.length} akun siswa. Hapus/pindahkan siswanya dulu.`,
                          `Class "${active.nama}" still has ${siswa.length} student accounts. Remove/move them first.`), 'warning');
        }
        if (!await confirmDialog(
          tr(`Hapus kelas "${active.nama}"?`, `Delete class "${active.nama}"?`),
          { danger: true, okText: tr('Hapus Kelas', 'Delete Class') })) return;
        try {
          await DB.gRemove('school_classes', active.id);
          this.activeClassId = null;
          toast(tr('Kelas dihapus.', 'Class deleted.'));
          this.render(this._el);
        } catch (e) { toast(e.message, 'error'); }
      };
      $('#importStudents', el).onclick = () => this._rosterImportModal(active);
      $('#addStudent', el).onclick = () => this._studentModal(active, null);
      $$('[data-edits]', el).forEach(b => b.onclick = () => this._studentModal(active, siswa.find(s => s.id === b.dataset.edits)));
      $$('[data-dels]', el).forEach(b => b.onclick = async () => {
        const s = siswa.find(x => x.id === b.dataset.dels);
        if (!await confirmDialog(
          tr(`Hapus akun siswa "${s.nama}"? Data profil & catatannya ikut hilang. Tindakan ini tidak bisa dibatalkan.`,
             `Delete the student account "${s.nama}"? Their profile & records go with it. This cannot be undone.`),
          { danger: true, okText: tr('Hapus Akun', 'Delete Account') })) return;
        try { await DB.adminDeleteUser(s.id); toast(tr('Akun siswa dihapus.', 'Student account deleted.')); this.render(this._el); }
        catch (e) { toast(e.message, 'error'); }
      });
      const expBtn = $('#exportRoster', el);
      if (expBtn && siswa.length) expBtn.onclick = () => {
        const rows = [[tr('No', 'No'), tr('Nama', 'Name'), 'Username', 'NIS']];
        siswa.forEach((s, i) => rows.push([i + 1, s.nama, this._loginId(s), s.nis || '']));
        downloadCSV(rows, `siswa_${(active.nama || 'kelas').replace(/\s+/g, '_')}.csv`);
      };
    }
  },

  // Kelas = tingkat (X/XI/XII/XIII) + nama kelas yang ditulis sendiri
  // (mis. "TKJ 1"). Nama tampilannya digabung: "X TKJ 1".
  _classModal(cls = null) {
    let tingkat = cls?.tingkat || this.TINGKAT[0];
    openModal({
      title: cls ? tr('Ubah Kelas', 'Edit Class') : tr('Kelas Baru', 'New Class'),
      body: `
        <div class="field">
          <label>${tr('Tingkat', 'Grade')}</label>
          <div class="radio-cards cols-4" id="mTingkat">
            ${this.TINGKAT.map(t => `<div class="radio-card ${t === tingkat ? 'selected' : ''}" data-val="${t}">${t}</div>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>${tr('Nama kelas', 'Class name')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('mis. TKJ 1 / IPA 2', 'e.g. TKJ 1 / Science 2')}" value="${esc(cls?.namaKelas || '')}">
        </div>
        <div style="font-size:.8rem;color:var(--text-3);margin:-4px 0 14px;">
          ${tr('Nama lengkap kelas:', 'Full class name:')} <b id="mPreview">${esc(cls?.nama || tingkat)}</b>
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        const nm = $('#mNama', m), pv = $('#mPreview', m);
        const preview = () => { pv.textContent = `${tingkat} ${nm.value.trim()}`.trim(); };
        nm.oninput = preview;
        $$('#mTingkat .radio-card', m).forEach(c => c.onclick = () => {
          tingkat = c.dataset.val;
          $$('#mTingkat .radio-card', m).forEach(x => x.classList.toggle('selected', x === c));
          preview();
        });

        $('#mSave', m).onclick = async () => {
          const namaKelas = nm.value.trim();
          if (!namaKelas) return toast(tr('Isi nama kelas.', 'Enter a class name.'), 'warning');
          const data = { tingkat, namaKelas, nama: `${tingkat} ${namaKelas}` };
          const btn = $('#mSave', m); btn.disabled = true;
          try {
            if (cls) await DB.gUpdate('school_classes', cls.id, data);
            else { const c = await DB.gAdd('school_classes', data); this.activeClassId = c.id; }
            closeModal();
            toast(tr('Kelas tersimpan 🏫', 'Class saved 🏫'));
            this.render(this._el);
          } catch (e) { btn.disabled = false; toast(e.message, 'error'); }
        };
      }
    });
  },

  // Tambah Siswa = BUAT AKUN SISWA. Nama → username otomatis (boleh dipangkas),
  // NIS → kata sandi. Akun langsung tertaut ke kelasnya (kelasId/kelasNama).
  _studentModal(cls, student = null) {
    const editing = !!student;
    openModal({
      title: editing ? tr('Ubah Siswa', 'Edit Student') : tr('Tambah Siswa', 'Add Student'),
      body: `
        ${editing ? '' : `
        <div class="disclaimer" style="margin:0 0 16px;">
          <ion-icon name="person-add-outline"></ion-icon>
          <span>${tr(`Akun siswa untuk kelas <b>${esc(cls.nama)}</b> akan langsung dibuat. Ia masuk dengan <b>username</b> + <b>NIS</b> di bawah.`, `A student account for class <b>${esc(cls.nama)}</b> will be created right away. They sign in with the <b>username</b> + <b>NIS</b> below.`)}</span>
        </div>`}
        <div class="field">
          <label>${tr('Nama lengkap', 'Full name')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('mis. Muhammad Thoriq Alfarizi', 'e.g. Muhammad Thoriq Alfarizi')}" value="${esc(student?.nama || '')}">
        </div>
        ${editing ? `
        <div class="field">
          <label>Username <span style="font-weight:500;color:var(--text-3)">${tr('(tidak bisa diubah)', '(cannot be changed)')}</span></label>
          <input type="text" class="input" value="${esc(this._loginId(student))}" disabled>
        </div>
        <div class="field">
          <label>NIS <span style="font-weight:500;color:var(--text-3)">${tr('(kata sandi — tidak bisa diubah)', '(password — cannot be changed)')}</span></label>
          <input type="text" class="input" value="${esc(student?.nis || '-')}" disabled>
        </div>` : `
        ${this._usernameField()}
        <div class="field">
          <label>NIS <span style="font-weight:500;color:var(--text-3)">${tr('— dipakai sebagai kata sandi (maks 20 angka)', '— used as the password (max 20 digits)')}</span></label>
          <input type="text" class="input" id="mNis" inputmode="numeric" maxlength="20" placeholder="${tr('Nomor Induk Siswa', 'Student ID number')}">
        </div>`}
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${editing ? tr('Simpan Perubahan', 'Save Changes') : tr('Buat Akun Siswa', 'Create Student Account')}</button>`,
      onMount: m => {
        this._bindNis(m);
        this._bindUsernameAuto(m);

        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (nama.length < 2) return toast(tr('Isi nama siswa.', 'Enter a student name.'), 'warning');
          const btn = $('#mSave', m); btn.disabled = true;
          try {
            if (editing) {
              await DB.adminUpdateUser(student.id, { nama }); // username & NIS tetap
              closeModal();
              toast(tr('Data siswa diperbarui.', 'Student updated.'));
              this.render(this._el);
              return;
            }
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
          } catch (e) { btn.disabled = false; toast(e.message, 'error'); }
        };
      }
    });
  },

  // Tempel banyak siswa sekaligus. Tiap baris: "Nama, NIS" (pemisah , ; tab
  // atau 2+ spasi). NIS opsional. Baris kosong diabaikan.
  _parseRoster(text) {
    return text.split(/\r?\n/).map(line => {
      const raw = line.trim();
      if (!raw) return null;
      let nama, nis = '';
      const parts = raw.split(/\s*[\t;,]\s*/);
      if (parts.length >= 2) { nama = parts[0].trim(); nis = parts.slice(1).join(' ').trim(); }
      else {
        const mm = raw.match(/^(.*?)\s{2,}(\S+)$/);
        if (mm) { nama = mm[1].trim(); nis = mm[2].trim(); }
        else nama = raw;
      }
      nama = (nama || '').trim();
      return nama ? { nama, nis: this._cleanNis(nis) } : null;
    }).filter(Boolean);
  },

  // Import massal = buat BANYAK AKUN siswa sekaligus. Dibuat satu per satu
  // (tiap akun butuh sesi Auth kedua), dengan laporan baris yang gagal —
  // mis. NIS kurang dari 4 angka atau username bentrok.
  _rosterImportModal(cls) {
    openModal({
      title: tr('Import Massal Siswa', 'Bulk Import Students'),
      body: `
        <p style="font-size:.84rem;color:var(--text-3);margin-bottom:10px;line-height:1.6;">
          ${tr(`Tempel satu siswa per baris, format <b>Nama, NIS</b>. Tiap baris dibuatkan <b>akun</b> di kelas ${esc(cls.nama)} — username otomatis dari nama, NIS jadi kata sandinya (minimal 4 angka).`, `Paste one student per line, format <b>Name, NIS</b>. Each line becomes an <b>account</b> in class ${esc(cls.nama)} — username auto from the name, NIS becomes the password (min 4 digits).`)}
        </p>
        <div class="field">
          <textarea class="input" id="mBulk" rows="9" style="resize:vertical;font-family:inherit;" placeholder="Budi Santoso, 12345&#10;Siti Aminah, 12346&#10;Ahmad Rizki, 12347"></textarea>
        </div>
        <div style="font-size:.8rem;color:var(--text-3);margin-bottom:12px;"><span id="mPreview">0</span> ${tr('siswa terdeteksi', 'students detected')}</div>
        <div id="mLog" style="font-size:.8rem;color:var(--text-3);margin-bottom:12px;"></div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="cloud-upload-outline"></ion-icon> ${tr('Buat Akun Siswa', 'Create Student Accounts')}</button>`,
      onMount: m => {
        const ta = $('#mBulk', m), prev = $('#mPreview', m), log = $('#mLog', m);
        ta.oninput = () => { prev.textContent = this._parseRoster(ta.value).length; };

        $('#mSave', m).onclick = async () => {
          const items = this._parseRoster(ta.value);
          if (!items.length) return toast(tr('Belum ada data yang bisa diimport.', 'No data to import yet.'), 'warning');
          const btn = $('#mSave', m); btn.disabled = true;

          const gagal = [];
          let sukses = 0;
          for (const [i, s] of items.entries()) {
            log.innerHTML = `<b>${i + 1}/${items.length}</b> — ${esc(s.nama)}…`;
            if (s.nis.length < 4) { gagal.push(`${s.nama} — ${tr('NIS minimal 4 angka', 'NIS must be at least 4 digits')}`); continue; }
            try {
              await DB.adminCreateUser({
                nama: s.nama, username: usernameOf(s.nama), password: s.nis, role: 'siswa',
                extra: { nis: s.nis, kelasId: cls.id, kelasNama: cls.nama, kelas: cls.nama }
              });
              sukses++;
            } catch (e) {
              gagal.push(`${s.nama} — ${e.message}`);
            }
          }

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
            <div style="color:var(--text-2);margin-bottom:6px;"><b>${sukses}</b> ${tr('akun dibuat', 'accounts created')}, <b style="color:var(--danger,#e11d48)">${gagal.length}</b> ${tr('gagal:', 'failed:')}</div>
            <ul style="margin:0 0 0 16px;line-height:1.6;">${gagal.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
            <div style="margin-top:8px;">${tr('Perbaiki baris yang gagal lalu import ulang (yang sudah berhasil jangan disertakan).', 'Fix the failed rows then import again (leave out the ones that succeeded).')}</div>`;
          if (sukses) this.render(this._el);
        };
      }
    });
  },

  /* ------------------------------------------------------------
     Buat/ubah akun — TANPA email.
     Masuk memakai NAMA LENGKAP sebagai username dan NIS (guru: NIP,
     admin: kata sandi bebas) sebagai kata sandi. Nama diubah menjadi
     email internal di balik layar (lihat toAuthEmail di js/utils.js),
     karena Firebase Auth selalu meminta email.
     ------------------------------------------------------------ */

  // Label kredensial per peran (dipakai di modal buat akun & info kredensial).
  _credLabel(r) {
    return r === 'siswa' ? 'NIS' : r === 'guru' ? 'NIP/NIK' : tr('Kata sandi', 'Password');
  },

  // Field username: tergenerate dari nama, tapi boleh disunting admin —
  // untuk memangkas nama panjang jadi nama panggilan, atau membedakan nama
  // kembar (dua "Muhammad" → 'muhammad' & 'muhammadthoriq').
  _usernameField(user = null) {
    return `
      <div class="field">
        <label>${tr('Username', 'Username')} <span style="font-weight:500;color:var(--text-3)">${tr('— ini yang diketik saat masuk', '— this is what they type to sign in')}</span></label>
        <input type="text" class="input" id="mUser" placeholder="budi.santoso" value="${esc(user?.username || '')}" autocapitalize="off" spellcheck="false">
        <div style="font-size:.76rem;color:var(--text-3);margin-top:5px;">
          ${tr('Otomatis dari nama; boleh dipangkas (mis. <b>muhammadthoriq</b>) bila terlalu panjang atau ada nama kembar.', 'Auto-filled from the name; you may shorten it (e.g. <b>muhammadthoriq</b>) if it is too long or a name clashes.')}
        </div>
      </div>`;
  },

  // Nama → username otomatis, sampai admin menyunting username-nya sendiri.
  _bindUsernameAuto(m) {
    const n = $('#mNama', m), u = $('#mUser', m);
    if (!n || !u) return;
    let disunting = !!u.value;
    u.oninput = () => {
      disunting = true;
      u.value = u.value.toLowerCase().replace(/[^a-z0-9.]/g, '');
    };
    n.oninput = () => { if (!disunting) u.value = usernameOf(n.value); };
  },

  _userModal(user = null) {
    const editing = !!user;
    let role = user?.role || 'guru';

    // Field kredensial + data tambahan; digambar ulang tiap peran berganti.
    const roleFields = r => {
      const cred = editing ? '' : `
        <div class="field">
          <label>${this._credLabel(r)} <span style="font-weight:500;color:var(--text-3)">${tr('— dipakai sebagai kata sandi', '— used as the password')}</span></label>
          <div class="input-group">
            <input type="text" class="input" id="mPass" ${r === 'siswa' ? 'inputmode="numeric" maxlength="20"' : ''} placeholder="${r === 'siswa' ? tr('Nomor Induk Siswa', 'Student ID number') : r === 'guru' ? tr('Nomor induk pegawai', 'Employee ID number') : tr('Minimal 4 karakter', 'At least 4 characters')}">
            ${r === 'siswa' ? '' : `<button type="button" class="suffix-btn" id="genPass" title="${tr('Buat otomatis', 'Auto-generate')}"><ion-icon name="refresh"></ion-icon></button>`}
          </div>
        </div>`;

      const extra = r === 'guru' ? `
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field"><label>${tr('Mata pelajaran', 'Subject')}</label><input type="text" class="input" id="mMapel" placeholder="${tr('mis. Matematika', 'e.g. Math')}" value="${esc(user?.mapel || '')}"></div>
          <div class="field"><label>${tr('Asal sekolah', 'School')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mSekolah" value="${esc(user?.sekolah || '')}"></div>
        </div>`
        : r === 'siswa' ? `
        <div class="field"><label>${tr('Kelas', 'Class')}</label><input type="text" class="input" id="mKelas" placeholder="${tr('mis. X TKJ 2', 'e.g. X TKJ 2')}" value="${esc(user?.kelas || '')}"></div>`
        : '';

      return cred + extra;
    };

    // Peran yang bisa dipilih. Akun SISWA tidak dibuat di sini — dibuat di
    // halaman "Kelas & Siswa" agar langsung tertaut ke kelasnya. Saat MENGUBAH
    // akun siswa yang sudah ada, pilihan 'siswa' tetap ditampilkan.
    const peran = [
      { key: 'guru', icon: 'school-outline', label: tr('Guru', 'Teacher') },
      ...(editing ? [{ key: 'siswa', icon: 'person-outline', label: tr('Siswa', 'Student') }] : []),
      { key: 'admin', icon: 'shield-checkmark-outline', label: 'Admin' }
    ];

    openModal({
      title: editing ? tr('Ubah Akun', 'Edit Account') : tr('Buat Akun Guru / Admin', 'Create Teacher / Admin Account'),
      body: `
        ${editing ? '' : `
        <div class="disclaimer" style="margin:0 0 16px;">
          <ion-icon name="information-circle-outline"></ion-icon>
          <span>${tr('Akun <b>siswa</b> dibuat di tab <b>Kelas & Siswa</b> (Tambah Siswa) agar langsung tertaut ke kelasnya.', 'Student accounts are created in the <b>Classes & Students</b> tab (Add Student) so they link straight to their class.')}</span>
        </div>`}
        <div class="field">
          <label>${tr('Peran', 'Role')}</label>
          <div class="radio-cards" id="mRole">
            ${peran.map(p => `<div class="radio-card ${role === p.key ? 'selected' : ''}" data-val="${p.key}"><ion-icon name="${p.icon}"></ion-icon>${p.label}</div>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>${tr('Nama lengkap', 'Full name')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('mis. Budi Santoso', 'e.g. Budi Santoso')}" value="${esc(user?.nama || '')}">
        </div>
        ${editing ? `
        <div class="field">
          <label>${tr('Username', 'Username')} <span style="font-weight:500;color:var(--text-3)">${tr('(tidak bisa diubah)', '(cannot be changed)')}</span></label>
          <input type="text" class="input" value="${esc(this._loginId(user))}" disabled>
        </div>` : this._usernameField()}
        <div id="mExtra">${roleFields(role)}</div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${editing ? tr('Simpan Perubahan', 'Save Changes') : tr('Buat Akun', 'Create Account')}</button>`,
      onMount: m => {
        this._bindUsernameAuto(m);
        const bindPass = () => {
          // Kredensial siswa = NIS → batasi ke angka saja (maks 20 digit).
          const p = $('#mPass', m);
          if (p && role === 'siswa') p.oninput = () => { p.value = this._cleanNis(p.value); };
          const gen = $('#genPass', m);
          if (gen) gen.onclick = () => { $('#mPass', m).value = 'tumara' + Math.floor(1000 + Math.random() * 9000); };
        };
        bindPass();

        $$('#mRole .radio-card', m).forEach(c => c.onclick = () => {
          role = c.dataset.val;
          $$('#mRole .radio-card', m).forEach(x => x.classList.toggle('selected', x === c));
          $('#mExtra', m).innerHTML = roleFields(role);
          bindPass(); // ikat ulang setelah field berganti peran
        });

        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (nama.length < 2) return toast(tr('Isi nama lengkap.', 'Enter a full name.'), 'warning');

          const extra = {};
          if (role === 'guru') { extra.mapel = $('#mMapel', m)?.value.trim() || ''; extra.sekolah = $('#mSekolah', m)?.value.trim() || ''; }
          else if (role === 'siswa') { extra.kelas = $('#mKelas', m)?.value.trim() || ''; }

          const btn = $('#mSave', m); btn.disabled = true;
          try {
            if (editing) {
              // Username (email Auth) tetap; `nama` hanya nama tampilan.
              const patch = { nama, role, ...extra };
              // Bila peran berubah, sesuaikan status onboarding: siswa perlu
              // melengkapi profil kesehatan, guru/admin tidak.
              if (role !== (user.role || 'siswa')) patch.profileComplete = role !== 'siswa';
              await DB.adminUpdateUser(user.id, patch);
              toast(tr('Akun diperbarui.', 'Account updated.'));
            } else {
              const username = usernameOf($('#mUser', m).value || nama);
              if (!username) { btn.disabled = false; return toast(tr('Username harus mengandung huruf atau angka.', 'The username must contain letters or numbers.'), 'warning'); }

              // Kredensial = NIP (guru) / kata sandi (admin).
              // Disimpan juga sebagai data profil agar terlihat di daftar akun.
              const pass = $('#mPass', m).value.trim();
              if (pass.length < 4) { btn.disabled = false; return toast(tr(`${this._credLabel(role)} minimal 4 karakter.`, `${this._credLabel(role)} must be at least 4 characters.`), 'warning'); }
              if (role === 'siswa') extra.nis = pass;
              else if (role === 'guru') extra.nip = pass;

              await DB.adminCreateUser({ nama, username, password: pass, role, extra });
              closeModal();
              this._createdInfoModal(nama, username, pass, role);
              this.render(this._el);
              return;
            }
            closeModal();
            this.render(this._el);
          } catch (e) {
            btn.disabled = false;
            toast(e.message, 'error');
          }
        };
      }
    });
  },

  // Tampilkan kredensial akun yang baru dibuat agar admin bisa menyerahkannya.
  _createdInfoModal(nama, username, pass, role) {
    const labelPass = `${this._credLabel(role)}${role === 'admin' ? '' : ` ${tr('(kata sandi)', '(password)')}`}`;
    openModal({
      title: tr('Akun Berhasil Dibuat ✅', 'Account Created ✅'),
      body: `
        <p style="font-size:.86rem;color:var(--text-2);line-height:1.6;margin-bottom:14px;">
          ${tr(`Akun ${roleLabel(role).toLowerCase()} untuk <b>${esc(nama)}</b> sudah dibuat. Berikan kredensial berikut kepada yang bersangkutan — masuk di halaman "Masuk", tanpa email:`, `The ${roleLabel(role).toLowerCase()} account for <b>${esc(nama)}</b> is created. Share these credentials with them — they sign in on the "Sign In" page, no email needed:`)}
        </p>
        <div class="cred-box">
          <div><span>Username</span><b id="cUser">${esc(username)}</b></div>
          <div><span>${labelPass}</span><b id="cPass">${esc(pass)}</b></div>
        </div>
        <p style="font-size:.78rem;color:var(--text-3);margin:12px 0 16px;">${tr('Username diketik persis seperti di atas (huruf besar/kecil bebas).', 'The username is typed exactly as above (capitalization does not matter).')}</p>
        <button class="btn btn-primary btn-block" id="cCopy"><ion-icon name="copy-outline"></ion-icon> ${tr('Salin Kredensial', 'Copy Credentials')}</button>`,
      onMount: m => {
        $('#cCopy', m).onclick = async () => {
          const text = `Tumara\n${nama}\nUsername: ${username}\n${labelPass}: ${pass}`;
          try { await navigator.clipboard.writeText(text); toast(tr('Kredensial disalin 📋', 'Credentials copied 📋')); }
          catch (_) { toast(tr('Tidak bisa menyalin otomatis — catat manual ya.', 'Could not auto-copy — please note it manually.'), 'warning'); }
        };
      }
    });
  },

  // Ganti kata sandi akun admin yang sedang login.
  _passwordModal() {
    openModal({
      title: tr('Ganti Kata Sandi', 'Change Password'),
      body: `
        <div class="field"><label>${tr('Kata sandi lama', 'Old password')}</label><input type="password" class="input" id="mOld" autocomplete="current-password"></div>
        <div class="field"><label>${tr('Kata sandi baru', 'New password')}</label><input type="password" class="input" id="mNew" placeholder="${tr('Minimal 6 karakter', 'At least 6 characters')}" autocomplete="new-password"></div>
        <div class="field"><label>${tr('Ulangi kata sandi baru', 'Repeat new password')}</label><input type="password" class="input" id="mNew2" autocomplete="new-password"></div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const oldP = $('#mOld', m).value, newP = $('#mNew', m).value;
          if (newP.length < 6) return toast(tr('Kata sandi baru minimal 6 karakter.', 'New password must be at least 6 characters.'), 'warning');
          if (newP !== $('#mNew2', m).value) return toast(tr('Ulangan kata sandi tidak sama.', "Passwords don't match."), 'warning');
          try { await DB.changePassword(oldP, newP); closeModal(); toast(tr('Kata sandi berhasil diganti 🔒', 'Password changed 🔒')); }
          catch (err) { toast(err.message, 'error'); }
        };
      }
    });
  }
};
