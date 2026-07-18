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
  _NAV_KEY: 'tumara_admin_nav',   // simpan view + kelas terpilih agar tahan refresh
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

  /* Mapel guru: satu guru bisa mengampu beberapa mapel (users/{uid}.mapelAmpu).
     Field lama `mapel` (satu teks) tetap ada & berisi mapel pertama, karena app
     siswa masih membacanya — jadi akun guru lama tetap terbaca di sini. */
  _mapelList(u) {
    if (Array.isArray(u?.mapelAmpu) && u.mapelAmpu.length) return u.mapelAmpu.filter(Boolean);
    return u?.mapel ? [u.mapel] : [];
  },
  _mapelTeks(u) { return this._mapelList(u).join(', '); },

  // "Matematika, Fisika" → ['Matematika', 'Fisika'] (tanpa kembar, tanpa kosong).
  _parseMapel(teks) {
    const out = [];
    String(teks || '').split(',').forEach(x => {
      const v = x.trim();
      if (v && !out.some(y => y.toLowerCase() === v.toLowerCase())) out.push(v);
    });
    return out;
  },

  // Menyaring akun sesuai kotak pencarian + chip peran (dari data di memori).
  _filterUsers() {
    const q = this.query.trim().toLowerCase();
    const shown = (this._users || []).filter(u => {
      if (this.filter !== 'all' && (u.role || 'siswa') !== this.filter) return false;
      if (!q) return true;
      return (u.nama || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
        || (u.nis || '').toLowerCase().includes(q)
        || (u.kelas || '').toLowerCase().includes(q) || this._mapelTeks(u).toLowerCase().includes(q);
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
                <td data-label="${tr('Detail', 'Detail')}" style="color:var(--text-3);font-size:.82rem;">${esc(this._mapelTeks(u) || u.kelas || u.sekolah || '-')}</td>
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

  /* ---- Gerbang "pilih kelas" (mengikuti pola portal guru) ----
     Halaman ini TIDAK langsung menumpahkan daftar siswa: admin memilih
     kelas dulu, baru daftar siswanya terbuka. Di HP ini penting — tabel
     siswa yang panjang membuat tombol kelas terdorong jauh ke bawah. */

  // Tingkat kelas: pakai field `tingkat` bila ada, selain itu tebak dari nama
  // ("XI TKJ 1" → XI). Urutan XIII→XII→XI→X penting agar "XIII" tidak keburu
  // cocok sebagai "XII"/"XI"/"X".
  _tingkatOf(cls) {
    if (cls?.tingkat) return cls.tingkat;
    const m = String(cls?.nama || '').trim().toUpperCase().match(/^(?:KELAS\s+)?(XIII|XII|XI|X)\b/);
    return m ? m[1] : null;
  },

  _groupByTingkat(classes) {
    const groups = [];
    for (const t of this.TINGKAT) {
      const list = classes.filter(c => this._tingkatOf(c) === t);
      if (list.length) groups.push({ label: `${tr('Kelas', 'Grade')} ${t}`, list });
    }
    const lain = classes.filter(c => !this.TINGKAT.includes(this._tingkatOf(c)));
    if (lain.length) groups.push({ label: tr('Lainnya', 'Others'), list: lain });
    return groups;
  },

  // Kartu kelas + jumlah siswanya. Klik → buka detail kelas.
  _classGate(classes, jumlah) {
    return this._groupByTingkat(classes).map(g => `
      <div class="tingkat-head">
        <span class="tingkat-name">${esc(g.label)}</span>
        <span class="tingkat-count">${g.list.length} ${tr('kelas', 'classes')}</span>
      </div>
      <div class="kelas-card-grid">
        ${g.list.map(c => {
          const n = jumlah[c.id] || 0;
          return `
          <button class="kelas-card" data-cls="${c.id}">
            <span class="kelas-card-ic"><ion-icon name="school"></ion-icon></span>
            <span class="kelas-card-body">
              <span class="kelas-card-nm">${esc(c.nama)}</span>
              <span class="kelas-card-sub">${n} ${tr('siswa', 'students')}</span>
            </span>
            <ion-icon name="chevron-forward"></ion-icon>
          </button>`;
        }).join('')}
      </div>`).join('');
  },

  // NIS/NISN: hanya angka, maksimal 20 digit.
  _cleanNis(v) { return String(v || '').replace(/\D/g, '').slice(0, 20); },
  // Batasi input #mNis & #mNisn ke digit & maks 20 angka saat diketik/tempel.
  // NISN bukan kredensial (bukan sandi/username) — cuma data pengisi PDF
  // daftar hadir, jadi tidak wajib diisi & boleh diubah kapan saja.
  _bindNis(scope) {
    ['mNis', 'mNisn'].forEach(id => {
      const el = $(`#${id}`, scope);
      if (el) el.oninput = () => { el.value = this._cleanNis(el.value); };
    });
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

    // Kelas yang dipilih sebelumnya mungkin sudah dihapus → balik ke gerbang.
    if (this.activeClassId && !classes.find(c => c.id === this.activeClassId)) this.activeClassId = null;
    const active = classes.find(c => c.id === this.activeClassId) || null;

    const head = `
      ${this._switcher()}
      <div class="portal-head" style="margin-bottom:16px;">
        <div>
          <h1>${tr('Kelas & Siswa', 'Classes & Students')}</h1>
          <p>${tr('Pilih kelas untuk melihat & menambah siswanya. Tiap siswa yang ditambahkan langsung dibuatkan akun (username + NIS).', 'Pick a class to view & add its students. Each student added gets an account right away (username + NIS).')}</p>
        </div>
        <button class="btn btn-primary" id="addClass"><ion-icon name="add"></ion-icon> ${tr('Kelas Baru', 'New Class')}</button>
      </div>`;

    /* ---------- LAYAR 1: belum ada kelas terpilih → gerbang pilih kelas ---------- */
    if (!active) {
      if (!classes.length) {
        el.innerHTML = head + `
          <div class="card empty-state">
            <ion-icon name="school-outline"></ion-icon>
            <div class="es-title">${tr('Belum ada kelas', 'No classes yet')}</div>
            <div class="es-sub">${tr('Buat kelas pertama, mis. tingkat "X" + nama "TKJ 1" 🏫', 'Create your first class, e.g. grade "X" + name "TKJ 1" 🏫')}</div>
          </div>`;
        this._bindSwitcher(el);
        $('#addClass', el).onclick = () => this._classModal();
        return;
      }

      // Jumlah siswa tiap kelas — satu query untuk semua kelas (bukan per kelas).
      const jumlah = {};
      try {
        (await DB.listStudents()).forEach(s => {
          if (s.kelasId) jumlah[s.kelasId] = (jumlah[s.kelasId] || 0) + 1;
        });
      } catch (_) { /* jumlah kosong — kartu tetap tampil */ }

      el.innerHTML = head + this._classGate(classes, jumlah);
      this._bindSwitcher(el);
      $('#addClass', el).onclick = () => this._classModal();
      $$('[data-cls]', el).forEach(b => b.onclick = () => {
        this.activeClassId = b.dataset.cls;
        this.render(this._el);
      });
      return;
    }

    /* ---------- LAYAR 2: detail kelas terpilih ---------- */
    // Daftar siswa kelas ini = AKUN siswa dengan kelasId tsb (bukan catatan terpisah).
    const siswa = (await DB.listStudentsByClass(active.id))
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    el.innerHTML = `
      ${this._switcher()}
      <div class="class-bar">
        <button class="btn btn-sm" id="backCls"><ion-icon name="arrow-back-outline"></ion-icon> ${tr('Ganti Kelas', 'Change Class')}</button>
        <span class="class-bar-name"><ion-icon name="school"></ion-icon> ${esc(active.nama)}</span>
      </div>

      ${`
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div class="card-title" style="margin:0;"><ion-icon name="people" style="color:var(--brand)"></ion-icon>${tr('Siswa', 'Students')} <span class="badge badge-blue">${siswa.length}</span></div>
            <div class="kelas-actions">
              <button class="btn btn-primary btn-sm" id="addStudent"><ion-icon name="person-add-outline"></ion-icon> ${tr('Tambah Siswa', 'Add Student')}</button>
              <button class="btn btn-sm" id="importStudents"><ion-icon name="cloud-upload-outline"></ion-icon> ${tr('Import Massal', 'Bulk Import')}</button>
              <button class="btn btn-sm" id="exportRoster"${siswa.length ? '' : ' disabled'}><ion-icon name="download-outline"></ion-icon> CSV</button>
              <button class="btn btn-sm" id="editClass"><ion-icon name="create-outline"></ion-icon> ${tr('Ubah', 'Edit')}</button>
              <button class="btn btn-sm btn-soft-danger" id="delClass" title="${tr('Hapus kelas', 'Delete class')}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>
          </div>

          ${siswa.length ? `
            <div class="table-wrap stack" style="margin-top:16px;">
              <table class="data-table stack">
                <thead><tr>
                  <th style="width:44px;">No</th><th>${tr('Nama Siswa', 'Student Name')}</th>
                  <th>Username</th><th>${tr('NIS (kata sandi)', 'NIS (password)')}</th><th>NISN</th>
                  <th style="text-align:right;">${tr('Aksi', 'Actions')}</th>
                </tr></thead>
                <tbody>
                  ${siswa.map((s, i) => `
                    <tr>
                      <td class="center">${i + 1}</td>
                      <td class="cell-primary"><b>${esc(s.nama)}</b></td>
                      <td data-label="Username" style="color:var(--text-3);">${esc(this._loginId(s))}</td>
                      <td data-label="NIS" style="color:var(--text-3);">${esc(s.nis || '-')}</td>
                      <td data-label="NISN" style="color:var(--text-3);">${esc(s.nisn || '-')}</td>
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
        </div>`}`;

    this._bindSwitcher(el);
    // "Ganti Kelas" → kembali ke gerbang pilih kelas.
    $('#backCls', el).onclick = () => { this.activeClassId = null; this.render(this._el); };

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
      const rows = [[tr('No', 'No'), tr('Nama', 'Name'), 'Username', 'NIS', 'NISN']];
      siswa.forEach((s, i) => rows.push([i + 1, s.nama, this._loginId(s), s.nis || '', s.nisn || '']));
      downloadCSV(rows, `siswa_${(active.nama || 'kelas').replace(/\s+/g, '_')}.csv`);
    };
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
        <div class="field">
          <label>NISN <span style="font-weight:500;color:var(--text-3)">${tr('— bukan sandi/username, cuma pengisi kolom NISN di PDF daftar hadir (opsional, maks 20 angka)', "— not a password/username, just fills the NISN column on the attendance PDF (optional, max 20 digits)")}</span></label>
          <input type="text" class="input" id="mNisn" inputmode="numeric" maxlength="20" placeholder="${tr('Nomor Induk Siswa Nasional', 'National Student ID number')}" value="${esc(student?.nisn || '')}">
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${editing ? tr('Simpan Perubahan', 'Save Changes') : tr('Buat Akun Siswa', 'Create Student Account')}</button>`,
      onMount: m => {
        this._bindNis(m);
        this._bindUsernameAuto(m);

        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (nama.length < 2) return toast(tr('Isi nama siswa.', 'Enter a student name.'), 'warning');
          const btn = $('#mSave', m); btn.disabled = true;
          try {
            const nisn = this._cleanNis($('#mNisn', m).value);
            if (editing) {
              await DB.adminUpdateUser(student.id, { nama, nisn }); // username & NIS tetap
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
              extra: { nis, nisn, kelasId: cls.id, kelasNama: cls.nama, kelas: cls.nama }
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
     Buat/ubah akun GURU & ADMIN — memakai EMAIL + kata sandi biasa,
     seperti login pada umumnya (mereka punya email dan bisa mengganti
     sandinya sendiri).

     Hanya SISWA yang memakai username + NIS (dibuat di tab Kelas &
     Siswa), karena siswa belum tentu punya email — lihat _studentModal.
     ------------------------------------------------------------ */

  // Field username: tergenerate dari nama, tapi boleh disunting admin —
  // untuk memangkas nama panjang jadi nama panggilan, atau membedakan nama
  // kembar (dua "Muhammad" → 'muhammad' & 'muhammadthoriq').
  _usernameField(user = null) {
    return `
      <div class="field">
        <label>${tr('Username', 'Username')} <span style="font-weight:500;color:var(--text-3)">${tr('— ini yang diketik saat masuk', '— this is what they type to sign in')}</span></label>
        <input type="text" class="input" id="mUser" placeholder="muhhamad.thoriq" value="${esc(user?.username || '')}" autocapitalize="off" spellcheck="false">
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

    // Data tambahan per peran; digambar ulang tiap peran berganti.
    const roleFields = r => r === 'guru' ? `
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>${tr('Mata pelajaran', 'Subjects')}</label>
            <input type="text" class="input" id="mMapel" placeholder="${tr('mis. Matematika, Fisika', 'e.g. Math, Physics')}" value="${esc(this._mapelTeks(user))}">
            <div class="hint">${tr('Boleh lebih dari satu — pisahkan dengan koma. Guru juga bisa mengubahnya sendiri.',
                                   'More than one is allowed — separate with commas. Teachers can edit this themselves too.')}</div>
          </div>
          <div class="field"><label>NIP/NIK <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mNip" value="${esc(user?.nip || '')}"></div>
        </div>
        <div class="field"><label>${tr('Asal sekolah', 'School')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mSekolah" value="${esc(user?.sekolah || '')}"></div>`
      : r === 'siswa' ? `
        <div class="field"><label>${tr('Kelas', 'Class')}</label><input type="text" class="input" id="mKelas" placeholder="${tr('mis. X TKJ 2', 'e.g. X TKJ 2')}" value="${esc(user?.kelas || '')}"></div>`
      : '';

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
          <span>${tr('Guru & admin masuk dengan <b>email + kata sandi</b>. Akun <b>siswa</b> (username + NIS) dibuat di tab <b>Kelas & Siswa</b>.', 'Teachers & admins sign in with <b>email + password</b>. <b>Student</b> accounts (username + NIS) are created in the <b>Classes & Students</b> tab.')}</span>
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
          <label>${tr('Masuk dengan', 'Signs in with')} <span style="font-weight:500;color:var(--text-3)">${tr('(tidak bisa diubah)', '(cannot be changed)')}</span></label>
          <input type="text" class="input" value="${esc(this._loginId(user))}" disabled>
        </div>` : `
        <div class="field">
          <label>Email <span style="font-weight:500;color:var(--text-3)">${tr('— dipakai untuk masuk', '— used to sign in')}</span></label>
          <input type="email" class="input" id="mEmail" placeholder="nama@sekolah.sch.id" autocapitalize="off" spellcheck="false">
        </div>
        <div class="field">
          <label>${tr('Kata sandi awal', 'Initial password')}</label>
          <div class="input-group">
            <input type="text" class="input" id="mPass" placeholder="${tr('Minimal 6 karakter', 'At least 6 characters')}">
            <button type="button" class="suffix-btn" id="genPass" title="${tr('Buat otomatis', 'Auto-generate')}"><ion-icon name="refresh"></ion-icon></button>
          </div>
          <div style="font-size:.76rem;color:var(--text-3);margin-top:5px;">
            ${tr('Bisa mereka ganti sendiri lewat menu Profil setelah masuk.', 'They can change it themselves from the Profile menu after signing in.')}
          </div>
        </div>`}
        <div id="mExtra">${roleFields(role)}</div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${editing ? tr('Simpan Perubahan', 'Save Changes') : tr('Buat Akun', 'Create Account')}</button>`,
      onMount: m => {
        const gen = $('#genPass', m);
        if (gen) gen.onclick = () => { $('#mPass', m).value = 'tumara' + Math.floor(1000 + Math.random() * 9000); };

        $$('#mRole .radio-card', m).forEach(c => c.onclick = () => {
          role = c.dataset.val;
          $$('#mRole .radio-card', m).forEach(x => x.classList.toggle('selected', x === c));
          $('#mExtra', m).innerHTML = roleFields(role);
        });

        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (nama.length < 2) return toast(tr('Isi nama lengkap.', 'Enter a full name.'), 'warning');

          const extra = {};
          if (role === 'guru') {
            // Guru bisa mengampu beberapa mapel. Disimpan sebagai daftar (mapelAmpu);
            // `mapel` tetap diisi mapel pertama karena app siswa masih membacanya.
            const mapelAmpu = this._parseMapel($('#mMapel', m)?.value);
            extra.mapelAmpu = mapelAmpu;
            extra.mapel = mapelAmpu[0] || '';
            extra.nip = $('#mNip', m)?.value.trim() || '';
            extra.sekolah = $('#mSekolah', m)?.value.trim() || '';
          }
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
              // Guru & admin: email sungguhan + kata sandi biasa (min 6 —
              // batas Firebase Auth). Hanya siswa yang memakai username + NIS.
              const email = $('#mEmail', m).value.trim();
              const pass = $('#mPass', m).value.trim();
              if (!/^\S+@\S+\.\S+$/.test(email)) { btn.disabled = false; return toast(tr('Masukkan email yang valid.', 'Please enter a valid email.'), 'warning'); }
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
  // `identitas` = email (guru/admin) atau username (siswa).
  _createdInfoModal(nama, identitas, pass, role) {
    const siswa = role === 'siswa';
    const labelId = siswa ? 'Username' : 'Email';
    const labelPass = siswa ? `NIS ${tr('(kata sandi)', '(password)')}` : tr('Kata sandi', 'Password');
    openModal({
      title: tr('Akun Berhasil Dibuat ✅', 'Account Created ✅'),
      body: `
        <p style="font-size:.86rem;color:var(--text-2);line-height:1.6;margin-bottom:14px;">
          ${tr(`Akun ${roleLabel(role).toLowerCase()} untuk <b>${esc(nama)}</b> sudah dibuat. Berikan kredensial berikut kepada yang bersangkutan:`, `The ${roleLabel(role).toLowerCase()} account for <b>${esc(nama)}</b> is created. Share these credentials with them:`)}
        </p>
        <div class="cred-box">
          <div><span>${labelId}</span><b id="cUser">${esc(identitas)}</b></div>
          <div><span>${labelPass}</span><b id="cPass">${esc(pass)}</b></div>
        </div>
        <p style="font-size:.78rem;color:var(--text-3);margin:12px 0 16px;">${siswa
          ? tr('Username diketik persis seperti di atas (huruf besar/kecil bebas). Siswa tidak bisa mengganti sandinya sendiri.', 'The username is typed exactly as above (capitalization does not matter). Students cannot change their own password.')
          : tr('Sarankan mereka mengganti kata sandi setelah login pertama (menu Profil).', 'Advise them to change the password after their first sign-in (Profile menu).')}</p>
        <button class="btn btn-primary btn-block" id="cCopy"><ion-icon name="copy-outline"></ion-icon> ${tr('Salin Kredensial', 'Copy Credentials')}</button>`,
      onMount: m => {
        $('#cCopy', m).onclick = async () => {
          const text = `Tumara\n${nama}\n${labelId}: ${identitas}\n${labelPass}: ${pass}`;
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
