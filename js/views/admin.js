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
          <input type="text" class="input" id="uSearch" placeholder="${tr('Cari nama, email, kelas…', 'Search name, email, class…')}" value="${esc(this.query)}">
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

  // Menyaring akun sesuai kotak pencarian + chip peran (dari data di memori).
  _filterUsers() {
    const q = this.query.trim().toLowerCase();
    const shown = (this._users || []).filter(u => {
      if (this.filter !== 'all' && (u.role || 'siswa') !== this.filter) return false;
      if (!q) return true;
      return (u.nama || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
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
            <th>${tr('Nama', 'Name')}</th><th>Email</th><th>${tr('Peran', 'Role')}</th>
            <th>${tr('Detail', 'Detail')}</th><th style="text-align:right;">${tr('Aksi', 'Actions')}</th>
          </tr></thead>
          <tbody>
            ${shown.map(u => `
              <tr>
                <td class="cell-primary"><div style="display:flex;align-items:center;gap:10px;">
                  <span class="avatar avatar-sm${(u.fotoUrl || u.photoURL) ? ' avatar-photo' : ''}">${avatarInner(u)}</span>
                  <b>${esc(u.nama || '-')}</b>
                </div></td>
                <td data-label="Email" style="color:var(--text-3);">${esc(u.email || '-')}</td>
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
        tr(`Hapus akun "${u.nama}" (${u.email})? Data profilnya akan dihapus. Tindakan ini tidak bisa dibatalkan.`,
           `Delete account "${u.nama}" (${u.email})? Their profile data will be removed. This cannot be undone.`),
        { danger: true, okText: tr('Hapus Akun', 'Delete Account') })) return;
      try {
        await DB.adminDeleteUser(u.id);
        toast(tr('Akun dihapus.', 'Account deleted.'));
        this.render(el);
      } catch (e) { toast(e.message, 'error'); }
    });
  },

  /* ============================================================
     HALAMAN: KELAS & SISWA (data induk sekolah)
     Admin membuat daftar kelas (school_classes) & mendata siswa
     (school_roster: nama + NIS) per kelas. Guru tinggal memilih
     kelas yang diampu di portal guru.
     ============================================================ */

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
    const roster = active ? this._sortByOrder(await DB.gListWhere('school_roster', 'classId', active.id)) : [];

    el.innerHTML = `
      ${this._switcher()}
      <div class="portal-head" style="margin-bottom:16px;">
        <div>
          <h1>${tr('Kelas & Siswa', 'Classes & Students')}</h1>
          <p>${tr('Data induk: buat kelas lalu data siswanya (nama & NIS). Guru tinggal memilih kelas yang diampu.', 'Master data: create classes then enter their students (name & NIS). Teachers just pick the classes they teach.')}</p>
        </div>
        <button class="btn btn-primary" id="addClass"><ion-icon name="add"></ion-icon> ${tr('Kelas Baru', 'New Class')}</button>
      </div>

      ${classes.length ? `
        <div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:20px;">
          ${classes.map(c => `<button class="chip ${c.id === this.activeClassId ? 'active' : ''}" data-pick="${c.id}">${esc(c.nama)}</button>`).join('')}
        </div>

        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div class="card-title" style="margin:0;"><ion-icon name="people" style="color:var(--brand)"></ion-icon>${esc(active.nama)} <span class="badge badge-blue">${roster.length} ${tr('siswa', 'students')}</span></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" id="importStudents"><ion-icon name="cloud-upload-outline"></ion-icon> ${tr('Import Massal', 'Bulk Import')}</button>
              <button class="btn btn-sm" id="addStudent"><ion-icon name="person-add-outline"></ion-icon> ${tr('Tambah Siswa', 'Add Student')}</button>
              <button class="btn btn-sm" id="exportRoster"${roster.length ? '' : ' disabled'}><ion-icon name="download-outline"></ion-icon> CSV</button>
              <button class="btn btn-sm" id="editClass"><ion-icon name="create-outline"></ion-icon> ${tr('Ubah', 'Edit')}</button>
              <button class="btn btn-sm btn-soft-danger" id="delClass"><ion-icon name="trash-outline"></ion-icon></button>
            </div>
          </div>

          ${roster.length ? `
            <div class="table-wrap stack" style="margin-top:16px;">
              <table class="data-table stack">
                <thead><tr><th style="width:44px;">No</th><th>${tr('Nama Siswa', 'Student Name')}</th><th>NIS</th><th style="text-align:right;">${tr('Aksi', 'Actions')}</th></tr></thead>
                <tbody>
                  ${roster.map((s, i) => `
                    <tr>
                      <td class="center">${i + 1}</td>
                      <td class="cell-primary"><b>${esc(s.nama)}</b></td>
                      <td data-label="NIS" style="color:var(--text-3);">${esc(s.nis || '-')}</td>
                      <td data-label="${tr('Aksi', 'Actions')}" style="text-align:right;white-space:nowrap;">
                        <button class="mini-icon-btn" data-edits="${s.id}" title="${tr('Ubah', 'Edit')}"><ion-icon name="create-outline"></ion-icon></button>
                        <button class="mini-icon-btn danger" data-dels="${s.id}" title="${tr('Hapus', 'Delete')}"><ion-icon name="trash-outline"></ion-icon></button>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>` : `
            <div class="empty-state" style="padding:30px 10px;">
              <ion-icon name="person-add-outline"></ion-icon>
              <div class="es-title">${tr('Belum ada siswa di kelas ini', 'No students in this class yet')}</div>
              <div class="es-sub">${tr('Gunakan "Import Massal" untuk menempel banyak siswa sekaligus.', 'Use "Bulk Import" to paste many students at once.')}</div>
            </div>`}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="school-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada kelas', 'No classes yet')}</div>
          <div class="es-sub">${tr('Buat kelas pertama, mis. "X TKJ 1" 🏫', 'Create your first class, e.g. "X TKJ 1" 🏫')}</div>
        </div>`}`;

    this._bindSwitcher(el);
    $('#addClass', el).onclick = () => this._classModal();
    $$('[data-pick]', el).forEach(b => b.onclick = () => { this.activeClassId = b.dataset.pick; this.render(this._el); });

    if (active) {
      $('#editClass', el).onclick = () => this._classModal(active);
      $('#delClass', el).onclick = async () => {
        if (!await confirmDialog(
          tr(`Hapus kelas "${active.nama}" beserta seluruh data siswanya (${roster.length})? Tindakan ini tidak bisa dibatalkan.`,
             `Delete class "${active.nama}" and all its ${roster.length} students? This cannot be undone.`),
          { danger: true, okText: tr('Hapus Kelas', 'Delete Class') })) return;
        try {
          const studs = await DB.gListWhere('school_roster', 'classId', active.id);
          await Promise.all(studs.map(s => DB.gRemove('school_roster', s.id)));
          await DB.gRemove('school_classes', active.id);
          this.activeClassId = null;
          toast(tr('Kelas dihapus.', 'Class deleted.'));
          this.render(this._el);
        } catch (e) { toast(e.message, 'error'); }
      };
      $('#importStudents', el).onclick = () => this._rosterImportModal(active.id, roster.length);
      $('#addStudent', el).onclick = () => this._studentModal(active.id, null, roster.length);
      $$('[data-edits]', el).forEach(b => b.onclick = () => this._studentModal(active.id, roster.find(s => s.id === b.dataset.edits), roster.length));
      $$('[data-dels]', el).forEach(b => b.onclick = async () => {
        const s = roster.find(x => x.id === b.dataset.dels);
        if (!await confirmDialog(tr(`Hapus siswa "${s.nama}" dari daftar?`, `Delete student "${s.nama}"?`), { danger: true, okText: tr('Hapus', 'Delete') })) return;
        try { await DB.gRemove('school_roster', s.id); toast(tr('Siswa dihapus.', 'Student deleted.')); this.render(this._el); }
        catch (e) { toast(e.message, 'error'); }
      });
      const expBtn = $('#exportRoster', el);
      if (expBtn && roster.length) expBtn.onclick = () => {
        const rows = [[tr('No', 'No'), tr('Nama', 'Name'), 'NIS']];
        roster.forEach((s, i) => rows.push([i + 1, s.nama, s.nis || '']));
        downloadCSV(rows, `roster_${(active.nama || 'kelas').replace(/\s+/g, '_')}.csv`);
      };
    }
  },

  _classModal(cls = null) {
    openModal({
      title: cls ? tr('Ubah Kelas', 'Edit Class') : tr('Kelas Baru', 'New Class'),
      body: `
        <div class="field">
          <label>${tr('Nama kelas', 'Class name')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('mis. X TKJ 1', 'e.g. X TKJ 1')}" value="${esc(cls?.nama || '')}">
        </div>
        <div class="field">
          <label>${tr('Tingkat / keterangan', 'Grade / note')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
          <input type="text" class="input" id="mKet" placeholder="${tr('mis. Kelas X, TKJ', 'e.g. Grade X, TKJ')}" value="${esc(cls?.keterangan || '')}">
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (!nama) return toast(tr('Isi nama kelas.', 'Enter a class name.'), 'warning');
          const data = { nama, keterangan: $('#mKet', m).value.trim() };
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

  _studentModal(classId, student = null, nextOrder = 0) {
    openModal({
      title: student ? tr('Ubah Siswa', 'Edit Student') : tr('Tambah Siswa', 'Add Student'),
      body: `
        <div class="field">
          <label>${tr('Nama lengkap', 'Full name')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('Nama siswa', 'Student name')}" value="${esc(student?.nama || '')}">
        </div>
        <div class="field">
          <label>NIS <span style="font-weight:500;color:var(--text-3)">${tr('(maks 20 angka)', '(max 20 digits)')}</span></label>
          <input type="text" class="input" id="mNis" inputmode="numeric" maxlength="20" placeholder="${tr('Nomor Induk Siswa', 'Student ID number')}" value="${esc(student?.nis || '')}">
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        this._bindNis(m);
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (!nama) return toast(tr('Isi nama siswa.', 'Enter a student name.'), 'warning');
          const nis = this._cleanNis($('#mNis', m).value);
          const btn = $('#mSave', m); btn.disabled = true;
          try {
            if (student) await DB.gUpdate('school_roster', student.id, { nama, nis });
            else await DB.gAdd('school_roster', { classId, nama, nis, urutan: nextOrder });
            closeModal();
            toast(tr('Siswa tersimpan 🧑‍🎓', 'Student saved 🧑‍🎓'));
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

  _rosterImportModal(classId, startOrder = 0) {
    openModal({
      title: tr('Import Massal Siswa', 'Bulk Import Students'),
      body: `
        <p style="font-size:.84rem;color:var(--text-3);margin-bottom:10px;line-height:1.6;">
          ${tr('Tempel satu siswa per baris, format <b>Nama, NIS</b> (NIS opsional). Bisa disalin langsung dari Excel/Sheets.', 'Paste one student per line, format <b>Name, NIS</b> (NIS optional). You can copy directly from Excel/Sheets.')}
        </p>
        <div class="field">
          <textarea class="input" id="mBulk" rows="10" style="resize:vertical;font-family:inherit;" placeholder="Budi Santoso, 12345&#10;Siti Aminah, 12346&#10;Ahmad Rizki, 12347"></textarea>
        </div>
        <div style="font-size:.8rem;color:var(--text-3);margin-bottom:12px;"><span id="mPreview">0</span> ${tr('siswa terdeteksi', 'students detected')}</div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="cloud-upload-outline"></ion-icon> ${tr('Import Siswa', 'Import Students')}</button>`,
      onMount: m => {
        const ta = $('#mBulk', m), prev = $('#mPreview', m);
        const recompute = () => { prev.textContent = this._parseRoster(ta.value).length; };
        ta.oninput = recompute;
        $('#mSave', m).onclick = async () => {
          const items = this._parseRoster(ta.value).map((s, i) => ({ classId, nama: s.nama, nis: s.nis, urutan: startOrder + i }));
          if (!items.length) return toast(tr('Belum ada data yang bisa diimport.', 'No data to import yet.'), 'warning');
          const btn = $('#mSave', m); btn.disabled = true;
          try {
            await DB.gAddMany('school_roster', items);
            closeModal();
            toast(tr(`${items.length} siswa berhasil diimport 🎉`, `${items.length} students imported 🎉`));
            this.render(this._el);
          } catch (e) { btn.disabled = false; toast(e.message, 'error'); }
        };
      }
    });
  },

  _userModal(user = null) {
    const editing = !!user;
    let role = user?.role || 'guru';

    const extraFields = r => r === 'guru' ? `
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field"><label>${tr('Mata pelajaran', 'Subject')}</label><input type="text" class="input" id="mMapel" placeholder="${tr('mis. Matematika', 'e.g. Math')}" value="${esc(user?.mapel || '')}"></div>
          <div class="field"><label>NIP/NIK <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mNip" value="${esc(user?.nip || '')}"></div>
        </div>
        <div class="field"><label>${tr('Asal sekolah', 'School')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mSekolah" value="${esc(user?.sekolah || '')}"></div>`
      : r === 'siswa' ? `
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field"><label>${tr('Kelas', 'Class')}</label><input type="text" class="input" id="mKelas" placeholder="${tr('mis. X TKJ 2', 'e.g. X TKJ 2')}" value="${esc(user?.kelas || '')}"></div>
          <div class="field"><label>NIS <span style="font-weight:500;color:var(--text-3)">${tr('(opsional, maks 20 angka)', '(optional, max 20 digits)')}</span></label><input type="text" class="input" id="mNis" inputmode="numeric" maxlength="20" value="${esc(user?.nis || '')}"></div>
        </div>`
      : '';

    openModal({
      title: editing ? tr('Ubah Akun', 'Edit Account') : tr('Buat Akun Baru', 'Create New Account'),
      body: `
        <div class="field">
          <label>${tr('Peran', 'Role')}</label>
          <div class="radio-cards" id="mRole">
            <div class="radio-card ${role === 'guru' ? 'selected' : ''}" data-val="guru"><ion-icon name="school-outline"></ion-icon>${tr('Guru', 'Teacher')}</div>
            <div class="radio-card ${role === 'siswa' ? 'selected' : ''}" data-val="siswa"><ion-icon name="person-outline"></ion-icon>${tr('Siswa', 'Student')}</div>
            <div class="radio-card ${role === 'admin' ? 'selected' : ''}" data-val="admin"><ion-icon name="shield-checkmark-outline"></ion-icon>Admin</div>
          </div>
        </div>
        <div class="field">
          <label>${tr('Nama lengkap', 'Full name')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('Nama guru / siswa', 'Teacher / student name')}" value="${esc(user?.nama || '')}">
        </div>
        <div class="field">
          <label>Email ${editing ? `<span style="font-weight:500;color:var(--text-3)">${tr('(tidak bisa diubah)', '(cannot be changed)')}</span>` : ''}</label>
          <input type="email" class="input" id="mEmail" placeholder="nama@sekolah.id" value="${esc(user?.email || '')}" ${editing ? 'disabled' : ''}>
        </div>
        ${editing ? '' : `
        <div class="field">
          <label>${tr('Kata sandi awal', 'Initial password')}</label>
          <div class="input-group">
            <input type="text" class="input" id="mPass" placeholder="${tr('Minimal 6 karakter', 'At least 6 characters')}">
            <button type="button" class="suffix-btn" id="genPass" title="${tr('Buat otomatis', 'Auto-generate')}"><ion-icon name="refresh"></ion-icon></button>
          </div>
        </div>`}
        <div id="mExtra">${extraFields(role)}</div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${editing ? tr('Simpan Perubahan', 'Save Changes') : tr('Buat Akun', 'Create Account')}</button>`,
      onMount: m => {
        this._bindNis(m); // batasi NIS ke maks 20 angka (bila field siswa tampil)
        $$('#mRole .radio-card', m).forEach(c => c.onclick = () => {
          role = c.dataset.val;
          $$('#mRole .radio-card', m).forEach(x => x.classList.toggle('selected', x === c));
          $('#mExtra', m).innerHTML = extraFields(role);
          this._bindNis(m); // ikat ulang setelah field berganti peran
        });
        const gen = $('#genPass', m);
        if (gen) gen.onclick = () => {
          $('#mPass', m).value = 'tumara' + Math.floor(1000 + Math.random() * 9000);
        };
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (nama.length < 2) return toast(tr('Isi nama lengkap.', 'Enter a full name.'), 'warning');

          const extra = {};
          if (role === 'guru') { extra.mapel = $('#mMapel', m)?.value.trim() || ''; extra.nip = $('#mNip', m)?.value.trim() || ''; extra.sekolah = $('#mSekolah', m)?.value.trim() || ''; }
          else if (role === 'siswa') { extra.kelas = $('#mKelas', m)?.value.trim() || ''; extra.nis = this._cleanNis($('#mNis', m)?.value); }

          const btn = $('#mSave', m); btn.disabled = true;
          try {
            if (editing) {
              const patch = { nama, role, ...extra };
              // Bila peran berubah, sesuaikan status onboarding: siswa perlu
              // melengkapi profil kesehatan, guru/admin tidak.
              if (role !== (user.role || 'siswa')) patch.profileComplete = role !== 'siswa';
              await DB.adminUpdateUser(user.id, patch);
              toast(tr('Akun diperbarui.', 'Account updated.'));
            } else {
              const email = $('#mEmail', m).value.trim();
              const pass = $('#mPass', m).value;
              if (!/^\S+@\S+\.\S+$/.test(email)) { btn.disabled = false; return toast(tr('Email tidak valid.', 'Invalid email.'), 'warning'); }
              if (pass.length < 6) { btn.disabled = false; return toast(tr('Kata sandi minimal 6 karakter.', 'Password must be at least 6 characters.'), 'warning'); }
              await DB.adminCreateUser({ nama, email, password: pass, role, extra });
              closeModal();
              this._createdInfoModal(nama, email, pass, role);
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
  _createdInfoModal(nama, email, pass, role) {
    openModal({
      title: tr('Akun Berhasil Dibuat ✅', 'Account Created ✅'),
      body: `
        <p style="font-size:.86rem;color:var(--text-2);line-height:1.6;margin-bottom:14px;">
          ${tr(`Akun ${roleLabel(role).toLowerCase()} untuk <b>${esc(nama)}</b> sudah dibuat. Berikan kredensial berikut kepada yang bersangkutan:`, `The ${roleLabel(role).toLowerCase()} account for <b>${esc(nama)}</b> is created. Share these credentials with them:`)}
        </p>
        <div class="cred-box">
          <div><span>Email</span><b id="cEmail">${esc(email)}</b></div>
          <div><span>${tr('Kata sandi', 'Password')}</span><b id="cPass">${esc(pass)}</b></div>
        </div>
        <p style="font-size:.78rem;color:var(--text-3);margin:12px 0 16px;">${tr('Sarankan mereka mengganti kata sandi setelah login pertama (menu Profil).', 'Advise them to change the password after first login (Profile menu).')}</p>
        <button class="btn btn-primary btn-block" id="cCopy"><ion-icon name="copy-outline"></ion-icon> ${tr('Salin Kredensial', 'Copy Credentials')}</button>`,
      onMount: m => {
        $('#cCopy', m).onclick = async () => {
          const text = `Tumara\nEmail: ${email}\n${tr('Kata sandi', 'Password')}: ${pass}`;
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
