/* ============================================================
   TUMARA — Panel Admin
   Kelola akun: buat akun guru/siswa, ubah peran, hapus.
   Dipakai di admin.html (di luar App router siswa).
   ============================================================ */

const AdminView = {
  query: '',
  filter: 'all', // 'all' | 'admin' | 'guru' | 'siswa'
  view: 'accounts', // 'accounts' | 'classes' | 'mapel'
  activeClassId: null,
  activeMapelId: null,
  _NAV_KEY: 'tumara_admin_nav',   // simpan view + kelas terpilih agar tahan refresh
  _el: null,

  // Pengalih antara halaman Akun, Kelas/Siswa, & Mapel (data induk sekolah).
  _switcher() {
    return `<div class="tabs" style="margin-bottom:18px;">
      <button class="tab ${this.view === 'accounts' ? 'active' : ''}" data-view="accounts"><ion-icon name="people-outline"></ion-icon>${tr('Akun', 'Accounts')}</button>
      <button class="tab ${this.view === 'classes' ? 'active' : ''}" data-view="classes"><ion-icon name="school-outline"></ion-icon>${tr('Kelas & Siswa', 'Classes & Students')}</button>
      <button class="tab ${this.view === 'mapel' ? 'active' : ''}" data-view="mapel"><ion-icon name="book-outline"></ion-icon>${tr('Mapel', 'Subjects')}</button>
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
        if (d) { if (['classes', 'accounts', 'mapel'].includes(d.view)) this.view = d.view; this.activeClassId = d.cls || null; this.activeMapelId = d.mp || null; }
      } catch (_) { /* abaikan */ }
    }
    localStorage.setItem(this._NAV_KEY, JSON.stringify({ view: this.view, cls: this.activeClassId || '', mp: this.activeMapelId || '' }));
    if (this.view === 'classes') return this.renderClasses(el);
    if (this.view === 'mapel') return this.renderMapel(el);
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
    // Daftar mapel & kelas (buat modal "Buat/Ubah Akun" guru — pilih mapel
    // diampu & kelas yang diwalikan) — dimuat sekali di sini, dipakai lagi
    // tanpa fetch ulang tiap kali modal dibuka.
    try { this._mapelOptions = this._sortByOrder(await DB.gList('school_mapel')); }
    catch (_) { this._mapelOptions = this._mapelOptions || []; }
    try { this._classOptions = this._sortByOrder(await DB.gList('school_classes')); }
    catch (_) { this._classOptions = this._classOptions || []; }

    // Siswa alumni dihitung terpisah dari siswa aktif (bukan dobel-hitung).
    const counts = { admin: 0, guru: 0, siswa: 0, alumni: 0 };
    users.forEach(u => {
      const key = (u.role || 'siswa') === 'siswa' && u.alumni ? 'alumni' : (u.role || 'siswa');
      counts[key] = (counts[key] || 0) + 1;
    });
    const eligibleAlumni = users.filter(u => this._alumniEligible(u));

    el.innerHTML = `
      ${this._switcher()}
      <div class="portal-head">
        <div>
          <h1>${tr('Kelola Akun', 'Manage Accounts')}</h1>
          <p>${tr('Buat & atur akun guru dan siswa sekolahmu.', 'Create & manage teacher and student accounts.')}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn" id="resetAlumni" title="${tr('Cek siswa yang sudah genap 1 tahun sejak angkatannya, lalu tandai mereka Alumni', 'Check students who have reached 1 year since their intake, then mark them Alumni')}">
            <ion-icon name="school-outline"></ion-icon> ${tr('Proses Alumni', 'Process Alumni')}${eligibleAlumni.length ? ` <span class="badge badge-amber">${eligibleAlumni.length}</span>` : ''}
          </button>
          <button class="btn btn-primary" id="addUser"><ion-icon name="person-add-outline"></ion-icon> ${tr('Buat Akun', 'Create Account')}</button>
        </div>
      </div>

      <div class="grid grid-4 stat-grid">
        <div class="card stat-mini"><div class="sm-num">${users.length}</div><div class="sm-label">${tr('Total Akun', 'Total Accounts')}</div></div>
        <div class="card stat-mini"><div class="sm-num" style="color:var(--prod)">${counts.admin || 0}</div><div class="sm-label">Admin</div></div>
        <div class="card stat-mini"><div class="sm-num" style="color:var(--brand)">${counts.guru || 0}</div><div class="sm-label">${tr('Guru', 'Teachers')}</div></div>
        <div class="card stat-mini"><div class="sm-num" style="color:var(--info)">${counts.siswa || 0}</div><div class="sm-label">${tr('Siswa Aktif', 'Active Students')}</div></div>
      </div>

      <div style="display:flex;gap:10px;margin:20px 0 16px;flex-wrap:wrap;align-items:center;">
        <div class="input-group" style="flex:1;min-width:220px;">
          <input type="text" class="input" id="uSearch" placeholder="${tr('Cari nama, NIS, kelas…', 'Search name, NIS, class…')}" value="${esc(this.query)}">
          <button class="suffix-btn"><ion-icon name="search-outline"></ion-icon></button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${['all', 'guru', 'siswa', 'alumni', 'admin'].map(f => `<button class="chip ${this.filter === f ? 'active' : ''}" data-filter="${f}">${f === 'all' ? tr('Semua', 'All') : f === 'alumni' ? `${tr('Alumni', 'Alumni')} (${counts.alumni || 0})` : roleLabel(f)}</button>`).join('')}
        </div>
      </div>

      <div id="uList"></div>`;

    this._bindSwitcher(el);
    $('#addUser', el).onclick = () => this._userModal();
    $('#resetAlumni', el).onclick = () => this._prosesAlumniModal(el);

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

  // Menyaring akun sesuai kotak pencarian + chip peran (dari data di memori).
  // Chip 'siswa' = siswa AKTIF saja (alumni disembunyikan); chip 'alumni' =
  // kebalikannya. Keduanya bukan role Firestore sungguhan — alumni tetap
  // role:'siswa', cuma ditandai field `alumni`.
  _filterUsers() {
    const q = this.query.trim().toLowerCase();
    const shown = (this._users || []).filter(u => {
      const role = u.role || 'siswa';
      if (this.filter === 'alumni') { if (!(role === 'siswa' && u.alumni)) return false; }
      else if (this.filter === 'siswa') { if (role !== 'siswa' || u.alumni) return false; }
      else if (this.filter !== 'all' && role !== this.filter) return false;
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

  // Tombol "Proses Alumni": cari siswa yang genap 1 tahun sejak angkatannya
  // (_alumniEligible), lalu — setelah admin konfirmasi — tandai semuanya
  // `alumni:true` sekaligus. Akun & datanya TETAP ADA (tidak dihapus), cuma
  // disembunyikan dari roster aktif (listStudents/listStudentsByClass) dan
  // baru kelihatan lagi lewat chip "Alumni" di halaman ini. Bisa dibatalkan
  // kapan saja lewat tombol kembalikan (data-unalumni) di baris alumni.
  async _prosesAlumniModal(el) {
    const eligible = (this._users || []).filter(u => this._alumniEligible(u));
    if (!eligible.length) {
      return toast(tr('Belum ada siswa yang memenuhi syarat jadi alumni saat ini.', 'No students currently qualify to become alumni.'), 'warning');
    }
    const daftar = eligible.map(u => `${u.nama}${u.kelas ? ` (${u.kelas})` : ''}`).join(', ');
    if (!await confirmDialog(
      tr(`${eligible.length} siswa sudah genap 1 tahun sejak angkatannya dan akan ditandai Alumni: ${daftar}. Akun & datanya tetap ada, cuma dipisah dari daftar siswa aktif — bisa dikembalikan kapan saja. Lanjutkan?`,
         `${eligible.length} student(s) have reached 1 year since intake and will be marked Alumni: ${daftar}. Their accounts & data stay intact, just separated from the active roster — reversible anytime. Continue?`),
      { okText: tr('Jadikan Alumni', 'Mark as Alumni') })) return;

    const btn = $('#resetAlumni', el);
    if (btn) btn.disabled = true;
    let sukses = 0;
    for (const u of eligible) {
      try { await DB.adminUpdateUser(u.id, { alumni: true, alumniPada: new Date().toISOString() }); sukses++; }
      catch (_) { /* lanjut ke siswa berikutnya, jangan hentikan seluruh proses */ }
    }
    toast(tr(`${sukses} siswa dipindah jadi alumni 🎓`, `${sukses} student(s) marked as alumni 🎓`));
    this.render(this._el);
  },

  // Gambar ulang HANYA daftar akun (#uList) + pasang lagi tombol barisnya.
  _paintUsers(el) {
    const list = $('#uList', el);
    if (!list) return;
    const shown = this._filterUsers();

    const roleBadge = u => {
      if ((u.role || 'siswa') === 'siswa' && u.alumni) return `<span class="badge badge-gray">${tr('Alumni', 'Alumni')}</span>`;
      const r = u.role || 'siswa';
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
                <td data-label="${tr('Peran', 'Role')}">${roleBadge(u)}</td>
                <td data-label="${tr('Detail', 'Detail')}" style="color:var(--text-3);font-size:.82rem;">${esc(this._mapelTeks(u) || u.kelas || u.sekolah || '-')}${u.alumni && u.angkatan ? ` · ${tr('Angkatan', 'Intake')} ${esc(this._fmtAngkatan(u.angkatan))}` : ''}</td>
                <td data-label="${tr('Aksi', 'Actions')}" style="text-align:right;white-space:nowrap;">
                  ${(u.role || 'siswa') === 'siswa' && u.alumni ? `<button class="mini-icon-btn" data-unalumni="${u.id}" title="${tr('Kembalikan jadi siswa aktif', 'Restore to active student')}"><ion-icon name="arrow-undo-outline"></ion-icon></button>` : ''}
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
    $$('[data-unalumni]', list).forEach(b => b.onclick = async () => {
      const u = (this._users || []).find(x => x.id === b.dataset.unalumni);
      try {
        await DB.adminUpdateUser(u.id, { alumni: false });
        toast(tr(`"${u.nama}" dikembalikan jadi siswa aktif.`, `"${u.nama}" restored to active student.`));
        this.render(this._el);
      } catch (e) { toast(e.message, 'error'); }
    });
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

  // 'YYYY-MM' → "Juli 2026" buat ditampilkan di tabel/CSV.
  _fmtAngkatan(v) {
    if (!v) return '';
    const [y, m] = String(v).split('-').map(Number);
    return y && m ? `${BULAN[m - 1]} ${y}` : v;
  },

  // Siswa dianggap SIAP jadi alumni kalau hari ini sudah lewat genap 1 tahun
  // sejak bulan+tahun angkatannya (field `angkatan`, 'YYYY-MM' — diisi admin
  // lewat _studentModal). Yang sudah alumni atau belum diisi angkatannya
  // tidak ikut dihitung.
  _alumniEligible(u) {
    if ((u.role || 'siswa') !== 'siswa' || u.alumni || !u.angkatan) return false;
    const [y, m] = String(u.angkatan).split('-').map(Number);
    if (!y || !m) return false;
    return new Date() >= new Date(y + 1, m - 1, 1);
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
                  <th>${tr('Angkatan', 'Intake')}</th>
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
                      <td data-label="${tr('Angkatan', 'Intake')}" style="color:var(--text-3);">${esc(this._fmtAngkatan(s.angkatan) || '-')}</td>
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
      const rows = [[tr('No', 'No'), tr('Nama', 'Name'), 'Username', 'NIS', 'NISN', tr('Angkatan', 'Intake')]];
      siswa.forEach((s, i) => rows.push([i + 1, s.nama, this._loginId(s), s.nis || '', s.nisn || '', s.angkatan || '']));
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

  /* ============================================================
     HALAMAN: MAPEL
     Daftar mata pelajaran (school_mapel, dikelola admin) — dipakai sebagai
     pilihan (bukan ketik bebas) saat admin membuat/mengubah akun guru di
     _userModal(). Bentuknya sengaja daftar datar (bukan gerbang kartu
     seperti Kelas) karena tak ada data anak-nesting di bawahnya.
     ============================================================ */

  async renderMapel(el) {
    el.innerHTML = `${this._switcher()}<div class="portal-loading"><div class="spinner"></div> ${tr('Memuat data mapel…', 'Loading subjects…')}</div>`;
    this._bindSwitcher(el);

    let list = [];
    try {
      list = this._mapelOptions = this._sortByOrder(await DB.gList('school_mapel'));
    } catch (e) {
      el.innerHTML = `${this._switcher()}<div class="card empty-state">
        <ion-icon name="alert-circle-outline"></ion-icon>
        <div class="es-title">${tr('Gagal memuat mapel', 'Failed to load subjects')}</div>
        <div class="es-sub">${esc(e.message || '')}</div>
      </div>`;
      this._bindSwitcher(el);
      return;
    }
    // Dipakai juga bila admin belum pernah membuka tab Akun sesi ini.
    if (!this._users) { try { this._users = await DB.adminListUsers(); } catch (_) { /* hitungan "dipakai" tetap 0, bukan blocker */ } }

    // Guru per mapel (dicocokkan case-insensitive) — dipakai baik utk kolom
    // "Dipakai" di layar daftar maupun layar detail (klik baris → daftar guru).
    const guruMapel = nama => (this._users || []).filter(u =>
      (u.role || 'siswa') === 'guru' && this._mapelList(u).some(x => x.toLowerCase() === (nama || '').toLowerCase()));

    // Mapel yang dipilih sebelumnya mungkin sudah dihapus → balik ke daftar.
    if (this.activeMapelId && !list.find(m => m.id === this.activeMapelId)) this.activeMapelId = null;
    const active = list.find(m => m.id === this.activeMapelId) || null;

    const head = `
      ${this._switcher()}
      <div class="portal-head" style="margin-bottom:16px;">
        <div>
          <h1>${tr('Mata Pelajaran', 'Subjects')}</h1>
          <p>${tr('Daftar mapel yang bisa dipilih saat membuat/mengubah akun guru — sekali ditambah di sini, tinggal dipilih (tanpa ketik ulang). Klik salah satu mapel untuk melihat guru pengampunya.', 'The subjects selectable when creating/editing a teacher account — add once here, then just pick them (no retyping). Click a subject to see which teachers teach it.')}</p>
        </div>
        <button class="btn btn-primary" id="addMapel"><ion-icon name="add"></ion-icon> ${tr('Mapel Baru', 'New Subject')}</button>
      </div>`;

    /* ---------- LAYAR 1: daftar mapel ---------- */
    if (!active) {
      el.innerHTML = head + (list.length ? `
      <div class="table-wrap stack">
        <table class="data-table stack">
          <thead><tr>
            <th>${tr('Mata Pelajaran', 'Subject')}</th><th>${tr('Dipakai', 'In use')}</th>
            <th style="text-align:right;">${tr('Aksi', 'Actions')}</th>
          </tr></thead>
          <tbody>
            ${list.map(m => `
              <tr data-mapel="${m.id}" style="cursor:pointer;">
                <td class="cell-primary"><b>${esc(m.nama)}</b></td>
                <td data-label="${tr('Dipakai', 'In use')}" style="color:var(--text-3);">${guruMapel(m.nama).length} ${tr('guru', 'teacher(s)')}</td>
                <td data-label="${tr('Aksi', 'Actions')}" style="text-align:right;white-space:nowrap;">
                  <button class="mini-icon-btn" data-editm="${m.id}" title="${tr('Ubah', 'Edit')}"><ion-icon name="create-outline"></ion-icon></button>
                  <button class="mini-icon-btn danger" data-delm="${m.id}" title="${tr('Hapus', 'Delete')}"><ion-icon name="trash-outline"></ion-icon></button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="card empty-state">
        <ion-icon name="book-outline"></ion-icon>
        <div class="es-title">${tr('Belum ada mapel', 'No subjects yet')}</div>
        <div class="es-sub">${tr('Tambahkan mapel pertama, mis. "Matematika" — nanti tinggal dipilih saat membuat akun guru.', 'Add your first subject, e.g. "Mathematics" — pick it right away when creating a teacher account.')}</div>
      </div>`);

      this._bindSwitcher(el);
      $('#addMapel', el).onclick = () => this._mapelModal();
      // Klik baris → buka detail (kecuali klik tombol Ubah/Hapus di baris itu).
      $$('[data-mapel]', el).forEach(tr_ => tr_.onclick = e => {
        if (e.target.closest('[data-editm],[data-delm]')) return;
        this.activeMapelId = tr_.dataset.mapel;
        this.render(this._el);
      });
      $$('[data-editm]', el).forEach(b => b.onclick = () => this._mapelModal(list.find(m => m.id === b.dataset.editm)));
      $$('[data-delm]', el).forEach(b => b.onclick = async () => {
        const m = list.find(x => x.id === b.dataset.delm);
        const n = guruMapel(m.nama).length;
        if (!await confirmDialog(
          n
            ? tr(`Hapus mapel "${m.nama}"? ${n} guru masih tercatat mengampu mapel ini — data mereka tidak berubah, mapel ini hanya tak lagi muncul di daftar pilihan.`,
                 `Delete subject "${m.nama}"? ${n} teacher(s) are still recorded teaching it — their data stays intact, this subject just won't appear as a pick option anymore.`)
            : tr(`Hapus mapel "${m.nama}"?`, `Delete subject "${m.nama}"?`),
          { danger: true, okText: tr('Hapus Mapel', 'Delete Subject') })) return;
        try {
          await DB.gRemove('school_mapel', m.id);
          toast(tr('Mapel dihapus.', 'Subject deleted.'));
          this.render(this._el);
        } catch (e) { toast(e.message, 'error'); }
      });
      return;
    }

    /* ---------- LAYAR 2: guru pengampu mapel terpilih ---------- */
    const guru = guruMapel(active.nama).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    el.innerHTML = `
      ${this._switcher()}
      <div class="class-bar">
        <button class="btn btn-sm" id="backMapel"><ion-icon name="arrow-back-outline"></ion-icon> ${tr('Ganti Mapel', 'Change Subject')}</button>
        <span class="class-bar-name"><ion-icon name="book"></ion-icon> ${esc(active.nama)}</span>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div class="card-title" style="margin:0;"><ion-icon name="school" style="color:var(--brand)"></ion-icon>${tr('Guru Pengampu', 'Teachers')} <span class="badge badge-blue">${guru.length}</span></div>
          <div class="kelas-actions">
            <button class="btn btn-sm" id="editMapelD"><ion-icon name="create-outline"></ion-icon> ${tr('Ubah Nama', 'Rename')}</button>
            <button class="btn btn-sm btn-soft-danger" id="delMapelD" title="${tr('Hapus mapel', 'Delete subject')}"><ion-icon name="trash-outline"></ion-icon></button>
          </div>
        </div>
        ${guru.length ? `
          <div class="table-wrap stack" style="margin-top:16px;">
            <table class="data-table stack">
              <thead><tr>
                <th style="width:44px;">No</th><th>${tr('Nama Guru', 'Teacher Name')}</th>
                <th>${tr('Masuk dengan', 'Signs in with')}</th><th>${tr('Mapel lain', 'Other subjects')}</th>
                <th style="text-align:right;">${tr('Aksi', 'Actions')}</th>
              </tr></thead>
              <tbody>
                ${guru.map((u, i) => `
                  <tr>
                    <td class="center">${i + 1}</td>
                    <td class="cell-primary"><b>${esc(u.nama || '-')}</b></td>
                    <td data-label="${tr('Masuk dengan', 'Signs in with')}" style="color:var(--text-3);">${esc(this._loginId(u))}</td>
                    <td data-label="${tr('Mapel lain', 'Other subjects')}" style="color:var(--text-3);">${esc(this._mapelList(u).filter(x => x.toLowerCase() !== active.nama.toLowerCase()).join(', ')) || '-'}</td>
                    <td data-label="${tr('Aksi', 'Actions')}" style="text-align:right;white-space:nowrap;">
                      <button class="mini-icon-btn" data-editg="${u.id}" title="${tr('Ubah akun guru', 'Edit teacher account')}"><ion-icon name="create-outline"></ion-icon></button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : `
          <div class="empty-state" style="padding:30px 10px;">
            <ion-icon name="school-outline"></ion-icon>
            <div class="es-title">${tr('Belum ada guru yang mengampu mapel ini', 'No teacher teaches this subject yet')}</div>
            <div class="es-sub">${tr('Pilih mapel ini saat membuat/mengubah akun guru di tab Akun.', 'Pick this subject when creating/editing a teacher account in the Accounts tab.')}</div>
          </div>`}
      </div>`;

    this._bindSwitcher(el);
    $('#backMapel', el).onclick = () => { this.activeMapelId = null; this.render(this._el); };
    $('#editMapelD', el).onclick = () => this._mapelModal(active);
    $('#delMapelD', el).onclick = async () => {
      if (!await confirmDialog(
        guru.length
          ? tr(`Hapus mapel "${active.nama}"? ${guru.length} guru masih tercatat mengampu mapel ini — data mereka tidak berubah, mapel ini hanya tak lagi muncul di daftar pilihan.`,
               `Delete subject "${active.nama}"? ${guru.length} teacher(s) are still recorded teaching it — their data stays intact, this subject just won't appear as a pick option anymore.`)
          : tr(`Hapus mapel "${active.nama}"?`, `Delete subject "${active.nama}"?`),
        { danger: true, okText: tr('Hapus Mapel', 'Delete Subject') })) return;
      try {
        await DB.gRemove('school_mapel', active.id);
        this.activeMapelId = null;
        toast(tr('Mapel dihapus.', 'Subject deleted.'));
        this.render(this._el);
      } catch (e) { toast(e.message, 'error'); }
    };
    $$('[data-editg]', el).forEach(b => b.onclick = () => this._userModal(guru.find(u => u.id === b.dataset.editg)));
  },

  _mapelModal(m = null) {
    openModal({
      title: m ? tr('Ubah Mapel', 'Edit Subject') : tr('Mapel Baru', 'New Subject'),
      body: `
        <div class="field">
          <label>${tr('Nama mata pelajaran', 'Subject name')}</label>
          <input type="text" class="input" id="mNamaMapel" placeholder="${tr('mis. Matematika', 'e.g. Mathematics')}" value="${esc(m?.nama || '')}">
        </div>
        <button class="btn btn-primary btn-block" id="mSaveMapel"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: modal => {
        const inp = $('#mNamaMapel', modal);
        $('#mSaveMapel', modal).onclick = async () => {
          const nama = inp.value.trim();
          if (!nama) return toast(tr('Isi nama mata pelajaran.', 'Enter a subject name.'), 'warning');
          const dupe = (this._mapelOptions || []).some(x => x.id !== m?.id && (x.nama || '').toLowerCase() === nama.toLowerCase());
          if (dupe) return toast(tr('Mapel ini sudah ada di daftar.', 'This subject is already in the list.'), 'warning');
          const btn = $('#mSaveMapel', modal); btn.disabled = true;
          try {
            if (m) await DB.gUpdate('school_mapel', m.id, { nama });
            else await DB.gAdd('school_mapel', { nama });
            closeModal();
            toast(tr('Mapel tersimpan 📘', 'Subject saved 📘'));
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
        <div class="field">
          <label>${tr('Angkatan (bulan & tahun masuk)', 'Intake (month & year)')} <span style="font-weight:500;color:var(--text-3)">${tr('— opsional; dipakai buat cek otomatis kapan siswa memenuhi syarat jadi alumni (1 tahun sejak bulan ini)', "— optional; used to auto-check when a student qualifies to become alumni (1 year after this month)")}</span></label>
          <input type="month" class="input" id="mAngkatan" value="${esc(student?.angkatan || '')}">
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
            const angkatan = $('#mAngkatan', m).value || '';
            if (editing) {
              await DB.adminUpdateUser(student.id, { nama, nisn, angkatan }); // username & NIS tetap
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
              extra: { nis, nisn, angkatan, kelasId: cls.id, kelasNama: cls.nama, kelas: cls.nama }
            });
            closeModal();
            this._createdInfoModal(nama, username, nis, 'siswa');
            this.render(this._el);
          } catch (e) { btn.disabled = false; toast(e.message, 'error'); }
        };
      }
    });
  },

  // Tempel banyak siswa sekaligus. Tiap baris: "NISN, NIS, Nama" (pemisah ,
  // ; atau tab). NISN opsional (boleh dikosongkan, mis. ", 12345, Budi").
  // Baris dengan hanya 2 kolom dianggap "NIS, Nama" (tanpa NISN). Baris
  // kosong diabaikan.
  _parseRoster(text) {
    return text.split(/\r?\n/).map(line => {
      const raw = line.trim();
      if (!raw) return null;
      const parts = raw.split(/\s*[\t;,]\s*/).map(p => p.trim());
      let nisn = '', nis = '', nama = '';
      if (parts.length >= 3) {
        nisn = parts[0]; nis = parts[1]; nama = parts.slice(2).join(' ').trim();
      } else if (parts.length === 2) {
        nis = parts[0]; nama = parts[1];
      } else {
        const mm = raw.match(/^(\S+)\s{2,}(.*)$/);
        if (mm) { nis = mm[1]; nama = mm[2].trim(); }
        else nama = raw;
      }
      nama = (nama || '').trim();
      return nama ? { nama, nis: this._cleanNis(nis), nisn: this._cleanNis(nisn) } : null;
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
          ${tr(`Tempel satu siswa per baris, format <b>NISN, NIS, Nama Siswa</b>. Tiap baris dibuatkan <b>akun</b> di kelas ${esc(cls.nama)} — username otomatis dari nama, NIS jadi kata sandinya (minimal 4 angka). NISN boleh dikosongkan.`, `Paste one student per line, format <b>NISN, NIS, Student Name</b>. Each line becomes an <b>account</b> in class ${esc(cls.nama)} — username auto from the name, NIS becomes the password (min 4 digits). NISN may be left blank.`)}
        </p>
        <div class="field">
          <textarea class="input" id="mBulk" rows="9" style="resize:vertical;font-family:inherit;" placeholder="0012345678, 12345, Budi Santoso&#10;0012345679, 12346, Siti Aminah&#10;0012345680, 12347, Ahmad Rizki"></textarea>
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
                extra: { nis: s.nis, nisn: s.nisn, kelasId: cls.id, kelasNama: cls.nama, kelas: cls.nama }
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

    // Mapel diampu = dipilih (chip), bukan diketik bebas — sumbernya daftar
    // master school_mapel (dikelola di tab "Mapel"). Set-nya disimpan di luar
    // roleFields() supaya pilihannya tidak hilang saat peran diganti-ganti
    // lalu dibalikkan lagi ke 'guru' (roleFields dipanggil ulang tiap ganti).
    const mapelOptions = (this._mapelOptions || []).map(o => o.nama).filter(Boolean);
    const existingMapel = this._mapelList(user);
    // Mapel lama hasil ketik bebas (sebelum fitur ini ada) yang sudah tak ada
    // di daftar master — tetap ditampilkan & tercentang, supaya datanya tidak
    // diam-diam hilang hanya karena namanya tidak persis cocok.
    const legacyMapel = existingMapel.filter(x => !mapelOptions.some(o => o.toLowerCase() === x.toLowerCase()));
    const selectedMapel = new Set(existingMapel);

    const mapelPickerHTML = () => {
      const semua = [...mapelOptions, ...legacyMapel];
      if (!semua.length) {
        return `<div class="hint">${tr('Belum ada mapel terdaftar. Tambahkan dulu lewat tab "Mapel" di atas.', 'No subjects registered yet. Add some first via the "Subjects" tab above.')}</div>`;
      }
      return `<div id="mMapelChips" style="display:flex;flex-wrap:wrap;gap:8px;">
        ${semua.map(nm => `<button type="button" class="chip ${selectedMapel.has(nm) ? 'active' : ''}" data-mapel="${esc(nm)}">${esc(nm)}</button>`).join('')}
      </div>`;
    };

    // Wali kelas: sekarang wewenang admin (bukan lagi guru sendiri lewat "Data
    // Guru"). Kelasnya dari school_classes; ditandai kalau kelas itu sudah
    // punya wali guru LAIN, supaya admin sadar sebelum menimpanya (satu kelas
    // idealnya satu wali — lihat _syncWaliKelas).
    const classOptions = this._classOptions || [];
    const waliLain = {};
    (this._users || []).forEach(u => {
      if ((u.role || 'siswa') === 'guru' && u.waliKelasId && u.id !== user?.id) waliLain[u.waliKelasId] = u.nama;
    });
    const waliFieldHTML = () => `
      <div class="field">
        <label>${tr('Wali kelas dari', 'Homeroom teacher of')}</label>
        ${classOptions.length ? `
        <select class="select" id="mWali">
          <option value="">${tr('— Bukan wali kelas —', '— Not a homeroom teacher —')}</option>
          ${classOptions.map(c => `<option value="${esc(c.id)}" ${(user?.waliKelasId || '') === c.id ? 'selected' : ''}>${esc(c.nama)}${waliLain[c.id] ? ` (${tr('sudah wali', 'already homeroom')}: ${esc(waliLain[c.id])})` : ''}</option>`).join('')}
        </select>
        <div class="hint">${tr('Satu kelas idealnya cuma satu wali — kalau kelas yang dipilih sudah punya wali lain, dia otomatis dilepas & digantikan guru ini.', 'A class should ideally have one homeroom teacher — if the chosen class already has one, they are automatically unassigned and replaced by this teacher.')}</div>`
        : `<input type="text" class="input" disabled value="${tr('Belum ada kelas (buat dulu di tab Kelas & Siswa)', 'No classes yet (create one in the Classes & Students tab)')}">`}
      </div>`;

    // Kelas siswa: akun lama (sebelum kelasId ada) cuma punya `kelas` (nama
    // bebas teks) — dicocokkan ke daftar master lewat namanya supaya tetap
    // terpilih otomatis di dropdown, bukan kembali ke "— Pilih kelas —".
    const siswaKelasId = user?.kelasId
      || classOptions.find(c => c.nama === user?.kelas)?.id
      || '';

    // Data tambahan per peran; digambar ulang tiap peran berganti.
    const roleFields = r => r === 'guru' ? `
        <div class="field">
          <label>${tr('Mata pelajaran', 'Subjects')}</label>
          ${mapelPickerHTML()}
          <div class="hint">${tr('Boleh pilih lebih dari satu, sesuai yang benar-benar diampu. Ini diatur admin — guru tidak bisa mengubahnya sendiri.',
                                 'Pick as many as apply to what they actually teach. This is set by the admin — teachers cannot change it themselves.')}</div>
        </div>
        ${waliFieldHTML()}
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field"><label>NIP/NIK <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mNip" value="${esc(user?.nip || '')}"></div>
          <div class="field"><label>${tr('Asal sekolah', 'School')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mSekolah" value="${esc(user?.sekolah || '')}"></div>
        </div>`
      : r === 'siswa' ? `
        <div class="field">
          <label>${tr('Kelas', 'Class')}</label>
          ${classOptions.length ? `
          <select class="select" id="mKelas">
            <option value="">${tr('— Pilih kelas —', '— Choose class —')}</option>
            ${classOptions.map(c => `<option value="${esc(c.id)}" ${siswaKelasId === c.id ? 'selected' : ''}>${esc(c.nama)}</option>`).join('')}
          </select>`
          : `<input type="text" class="input" disabled value="${tr('Belum ada kelas (buat dulu di tab Kelas & Siswa)', 'No classes yet (create one in the Classes & Students tab)')}">`}
        </div>`
      : '';

    // Chip mapel dibuat ulang tiap roleFields() dipanggil (mis. ganti peran
    // lalu balik ke 'guru') — pasang ulang klik-nya tiap kali juga.
    const bindMapelChips = scope => {
      $$('#mMapelChips [data-mapel]', scope).forEach(b => b.onclick = () => {
        const v = b.dataset.mapel;
        if (selectedMapel.has(v)) selectedMapel.delete(v); else selectedMapel.add(v);
        b.classList.toggle('active', selectedMapel.has(v));
      });
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

        bindMapelChips(m);
        $$('#mRole .radio-card', m).forEach(c => c.onclick = () => {
          role = c.dataset.val;
          $$('#mRole .radio-card', m).forEach(x => x.classList.toggle('selected', x === c));
          $('#mExtra', m).innerHTML = roleFields(role);
          bindMapelChips(m);
        });

        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (nama.length < 2) return toast(tr('Isi nama lengkap.', 'Enter a full name.'), 'warning');

          const extra = {};
          if (role === 'guru') {
            // Guru bisa mengampu beberapa mapel. Disimpan sebagai daftar (mapelAmpu);
            // `mapel` tetap diisi mapel pertama karena app siswa masih membacanya.
            const mapelAmpu = [...selectedMapel];
            extra.mapelAmpu = mapelAmpu;
            extra.mapel = mapelAmpu[0] || '';
            extra.nip = $('#mNip', m)?.value.trim() || '';
            extra.sekolah = $('#mSekolah', m)?.value.trim() || '';
            extra.waliKelasId = $('#mWali', m)?.value || '';
          }
          else if (role === 'siswa') {
            // Dipilih dari daftar kelas (bukan diketik bebas) — kelasId dikunci
            // ke school_classes supaya listStudentsByClass() ikut mendata akun
            // ini, sama seperti siswa yang dibuat dari tab "Kelas & Siswa".
            const kelasId = $('#mKelas', m)?.value || '';
            const cls = classOptions.find(c => c.id === kelasId);
            extra.kelasId = kelasId;
            extra.kelasNama = cls?.nama || '';
            extra.kelas = cls?.nama || '';
          }

          const btn = $('#mSave', m); btn.disabled = true;
          try {
            if (editing) {
              // Username (email Auth) tetap; `nama` hanya nama tampilan.
              const patch = { nama, role, ...extra };
              // Bila peran berubah, sesuaikan status onboarding: siswa perlu
              // melengkapi profil kesehatan, guru/admin tidak.
              if (role !== (user.role || 'siswa')) patch.profileComplete = role !== 'siswa';
              await DB.adminUpdateUser(user.id, patch);
              if (role === 'guru') await this._syncWaliKelas(user.id, nama, extra.waliKelasId, user.waliKelasId || '');
              toast(tr('Akun diperbarui.', 'Account updated.'));
            } else {
              // Guru & admin: email sungguhan + kata sandi biasa (min 6 —
              // batas Firebase Auth). Hanya siswa yang memakai username + NIS.
              const email = $('#mEmail', m).value.trim();
              const pass = $('#mPass', m).value.trim();
              if (!/^\S+@\S+\.\S+$/.test(email)) { btn.disabled = false; return toast(tr('Masukkan email yang valid.', 'Please enter a valid email.'), 'warning'); }
              if (pass.length < 6) { btn.disabled = false; return toast(tr('Kata sandi minimal 6 karakter.', 'Password must be at least 6 characters.'), 'warning'); }

              const created = await DB.adminCreateUser({ nama, email, password: pass, role, extra });
              if (role === 'guru') await this._syncWaliKelas(created.id, nama, extra.waliKelasId, '');
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

  // Jaga invarian "satu kelas = satu wali kelas" tiap kali admin menetapkan/
  // mengganti wali lewat _userModal: lepas wali lama di kelas SEBELUMNYA (kalau
  // pindah/dilepas), lepas guru LAIN yang sudah wali di kelas BARU (kalau ada,
  // dari cache this._users), lalu catat nama wali baru di dokumen jadwal kelas
  // (dibaca kop cetak/daftar hadir). class_schedule ditulis admin di sini (rules
  // membolehkan write hanya utk wali kelasnya sendiri, tapi admin lewat SDK guru
  // biasa tetap kena rules yang sama — makanya dipanggil dgn akun admin yang
  // login, bukan meniru guru; lihat firestore.rules match /class_schedule).
  async _syncWaliKelas(userId, nama, waliKelasId, prevWaliKelasId) {
    if (prevWaliKelasId && prevWaliKelasId !== waliKelasId) {
      try { await DB.gUpdate('class_schedule', prevWaliKelasId, { waliNama: '' }); } catch (_) { /* dokumen jadwal mungkin belum ada — abaikan */ }
    }
    if (!waliKelasId) return;
    const lain = (this._users || []).find(x => x.id !== userId && (x.role || 'siswa') === 'guru' && x.waliKelasId === waliKelasId);
    if (lain) { try { await DB.adminUpdateUser(lain.id, { waliKelasId: '' }); } catch (_) {} }
    try { await DB.gUpdate('class_schedule', waliKelasId, { classId: waliKelasId, waliNama: nama, updatedAt: new Date().toISOString() }); } catch (_) {}
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
