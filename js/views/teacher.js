/* ============================================================
   TUMARA — Portal Guru
   Tab: Kelas & Siswa · Absensi · Penilaian · Jurnal · Jadwal
   Semua data disimpan di subkoleksi milik guru sendiri
   (classes, students, attendance, grades, journals, schedule).
   ============================================================ */

const Teacher = {
  TABS: ['kelas', 'absensi', 'nilai', 'jurnal', 'jadwal'],
  _TAB_KEY: 'tumara_guru_tab',
  // Tab aktif dipulihkan dari localStorage agar refresh tidak balik ke tab pertama.
  get tab() {
    const t = localStorage.getItem(this._TAB_KEY);
    return this.TABS.includes(t) ? t : 'kelas';
  },
  set tab(v) {
    if (this.TABS.includes(v)) localStorage.setItem(this._TAB_KEY, v);
  },
  classId: null,          // kelas aktif (absensi/nilai/jurnal)
  attDate: todayStr(),
  attPertemuan: 1,
  _el: null,

  ABSEN: [
    { k: 'H', id: 'Hadir',  en: 'Present' },
    { k: 'S', id: 'Sakit',  en: 'Sick' },
    { k: 'I', id: 'Izin',   en: 'Excused' },
    { k: 'A', id: 'Alfa',   en: 'Absent' },
    { k: 'D', id: 'Dispen', en: 'Dispensation' }
  ],

  async render(el) {
    this._el = el || this._el;
    el = this._el;
    el.innerHTML = `
      <div class="tabs">
        <button class="tab ${this.tab === 'kelas' ? 'active' : ''}" data-tab="kelas"><ion-icon name="people-outline"></ion-icon>${tr('Kelas & Siswa', 'Classes & Students')}</button>
        <button class="tab ${this.tab === 'absensi' ? 'active' : ''}" data-tab="absensi"><ion-icon name="checkbox-outline"></ion-icon>${tr('Absensi', 'Attendance')}</button>
        <button class="tab ${this.tab === 'nilai' ? 'active' : ''}" data-tab="nilai"><ion-icon name="clipboard-outline"></ion-icon>${tr('Penilaian', 'Grades')}</button>
        <button class="tab ${this.tab === 'jurnal' ? 'active' : ''}" data-tab="jurnal"><ion-icon name="document-text-outline"></ion-icon>${tr('Jurnal', 'Journal')}</button>
        <button class="tab ${this.tab === 'jadwal' ? 'active' : ''}" data-tab="jadwal"><ion-icon name="calendar-outline"></ion-icon>${tr('Jadwal', 'Schedule')}</button>
      </div>
      <div id="tBody"><div class="portal-loading"><div class="spinner"></div></div></div>`;

    $$('.tab', el).forEach(t => t.onclick = () => { this.tab = t.dataset.tab; this.render(el); });

    const body = $('#tBody', el);
    if (this.tab === 'kelas') await this.renderKelas(body);
    else if (this.tab === 'absensi') await this.renderAbsensi(body);
    else if (this.tab === 'nilai') await this.renderNilai(body);
    else if (this.tab === 'jurnal') await this.renderJurnal(body);
    else await this.renderJadwal(body);
  },

  async _classes() { return (await DB.list('classes')).sort((a, b) => (a.nama || '').localeCompare(b.nama || '')); },
  async _students(classId) {
    return (await DB.list('students')).filter(s => s.classId === classId)
      .sort((a, b) => (a.urutan ?? 999) - (b.urutan ?? 999) || (a.nama || '').localeCompare(b.nama || ''));
  },

  // Avatar siswa/akun: foto profil (fotoUrl/photoURL) bila ada, selain itu inisial.
  // referrerpolicy diperlukan agar foto akun Google tidak diblokir (403).
  _avatarHTML(u) {
    const foto = u.fotoUrl || u.photoURL;
    const inisial = esc((u.nama || u.email || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase());
    const inner = foto ? `<img src="${esc(foto)}" alt="${esc(u.nama || 'Foto profil')}" referrerpolicy="no-referrer">` : inisial;
    return `<span class="avatar avatar-sm${foto ? ' avatar-photo' : ''}">${inner}</span>`;
  },

  // Pemilih kelas (dropdown) dipakai di beberapa tab
  _classPicker(classes, id = 'tClass') {
    return `<select class="select" id="${id}" style="max-width:280px;">
      ${classes.map(c => `<option value="${c.id}" ${c.id === this.classId ? 'selected' : ''}>${esc(c.nama)}</option>`).join('')}
    </select>`;
  },

  /* ============ TAB: KELAS & SISWA ============ */

  async renderKelas(el) {
    const classes = await this._classes();
    if (classes.length && !this.classId) this.classId = classes[0].id;
    const active = classes.find(c => c.id === this.classId) || classes[0];
    const students = active ? await this._students(active.id) : [];

    el.innerHTML = `
      <div class="portal-head" style="margin-bottom:16px;">
        <div><h1 style="font-size:1.2rem;">${tr('Kelas yang Kamu Ampu', 'Your Classes')}</h1></div>
        <button class="btn btn-primary btn-sm" id="addClass"><ion-icon name="add"></ion-icon> ${tr('Kelas Baru', 'New Class')}</button>
      </div>

      ${classes.length ? `
        <div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:20px;">
          ${classes.map(c => `
            <button class="chip ${c.id === this.classId ? 'active' : ''}" data-pick="${c.id}">
              ${esc(c.nama)}
            </button>`).join('')}
        </div>

        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div class="card-title" style="margin:0;"><ion-icon name="people" style="color:var(--brand)"></ion-icon>${esc(active.nama)} <span class="badge badge-blue">${students.length} ${tr('siswa', 'students')}</span></div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm" id="editClass"><ion-icon name="create-outline"></ion-icon> ${tr('Ubah', 'Edit')}</button>
              <button class="btn btn-sm btn-soft-danger" id="delClass"><ion-icon name="trash-outline"></ion-icon></button>
              <button class="btn btn-primary btn-sm" id="pickStudent"><ion-icon name="person-add-outline"></ion-icon> ${tr('Pilih Siswa', 'Select Students')}</button>
            </div>
          </div>

          ${students.length ? `
            <div class="table-wrap" style="margin-top:16px;">
              <table class="data-table">
                <thead><tr><th style="width:44px;">No</th><th>${tr('Nama Siswa', 'Student Name')}</th><th>NIS</th><th style="text-align:right;">${tr('Aksi', 'Actions')}</th></tr></thead>
                <tbody>
                  ${students.map((s, i) => `
                    <tr>
                      <td class="center">${i + 1}</td>
                      <td><div style="display:flex;align-items:center;gap:10px;">${this._avatarHTML(s)}<b>${esc(s.nama)}</b></div></td>
                      <td style="color:var(--text-3);">${esc(s.nis || '-')}</td>
                      <td style="text-align:right;white-space:nowrap;">
                        <button class="mini-icon-btn danger" data-dels="${s.id}" title="${tr('Keluarkan dari kelas', 'Remove from class')}"><ion-icon name="person-remove-outline"></ion-icon></button>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>` : `
            <div class="empty-state" style="padding:30px 10px;">
              <ion-icon name="person-add-outline"></ion-icon>
              <div class="es-title">${tr('Belum ada siswa di kelas ini', 'No students in this class yet')}</div>
              <div class="es-sub">${tr('Pilih siswa dari akun yang sudah dibuatkan admin.', 'Select students from the accounts created by the admin.')}</div>
              <div style="display:flex;gap:8px;justify-content:center;margin-top:14px;">
                <button class="btn btn-primary btn-sm" id="pickStudent2"><ion-icon name="person-add-outline"></ion-icon> ${tr('Pilih Siswa', 'Select Students')}</button>
              </div>
            </div>`}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada kelas', 'No classes yet')}</div>
          <div class="es-sub">${tr('Buat kelas pertamamu, mis. "X TKJ 2" 🏫', 'Create your first class, e.g. "X TKJ 2" 🏫')}</div>
        </div>`}`;

    $('#addClass', el).onclick = () => this._classModal();
    $$('[data-pick]', el).forEach(b => b.onclick = () => { this.classId = b.dataset.pick; this.render(this._el); });
    if (active) {
      $('#editClass', el).onclick = () => this._classModal(active);
      $('#delClass', el).onclick = async () => {
        if (!await confirmDialog(tr(`Hapus kelas "${active.nama}" beserta seluruh siswanya? Absensi & nilai kelas ini juga akan hilang.`, `Delete class "${active.nama}" and all its students? Its attendance & grades will also be removed.`), { danger: true, okText: tr('Hapus Kelas', 'Delete Class') })) return;
        const studs = await this._students(active.id);
        await Promise.all(studs.map(s => DB.remove('students', s.id)));
        await DB.remove('classes', active.id);
        // bersihkan gradebook & absensi kelas ini
        const [grades, att] = await Promise.all([DB.list('grades'), DB.list('attendance')]);
        await Promise.all(grades.filter(g => g.classId === active.id).map(g => DB.remove('grades', g.id)));
        await Promise.all(att.filter(a => a.classId === active.id).map(a => DB.remove('attendance', a.id)));
        this.classId = null;
        toast(tr('Kelas dihapus.', 'Class deleted.'));
        this.render(this._el);
      };
      const pick = () => this._pickStudentsModal(active.id);
      $('#pickStudent', el) && ($('#pickStudent', el).onclick = pick);
      $('#pickStudent2', el) && ($('#pickStudent2', el).onclick = pick);
      $$('[data-dels]', el).forEach(b => b.onclick = async () => {
        if (!await confirmDialog(tr('Keluarkan siswa ini dari kelas?', 'Remove this student from the class?'), { danger: true, okText: tr('Keluarkan', 'Remove') })) return;
        await DB.remove('students', b.dataset.dels);
        toast(tr('Siswa dikeluarkan dari kelas.', 'Student removed from class.'));
        this.render(this._el);
      });
    }
  },

  _classModal(cls = null) {
    openModal({
      title: cls ? tr('Ubah Kelas', 'Edit Class') : tr('Kelas Baru', 'New Class'),
      body: `
        <div class="field">
          <label>${tr('Nama kelas', 'Class name')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('mis. X TKJ 2', 'e.g. X TKJ 2')}" value="${esc(cls?.nama || '')}">
        </div>
        <div class="field">
          <label>${tr('Mata pelajaran / keterangan', 'Subject / note')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
          <input type="text" class="input" id="mKet" placeholder="${tr('mis. Pemrograman Dasar', 'e.g. Basic Programming')}" value="${esc(cls?.keterangan || '')}">
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (!nama) return toast(tr('Isi nama kelas.', 'Enter a class name.'), 'warning');
          const data = { nama, keterangan: $('#mKet', m).value.trim() };
          if (cls) await DB.update('classes', cls.id, data);
          else { const c = await DB.add('classes', data); this.classId = c.id; }
          closeModal();
          toast(tr('Kelas tersimpan 🏫', 'Class saved 🏫'));
          this.render(this._el);
        };
      }
    });
  },

  // Pilih anggota kelas dari akun siswa yang dibuatkan admin (bukan input manual).
  // Guru mencentang siswa; simpan akan menyinkronkan daftar anggota kelas.
  async _pickStudentsModal(classId) {
    let accounts = [];
    try {
      accounts = await DB.listStudents();
    } catch (e) {
      return toast(tr('Gagal memuat daftar akun siswa. Pastikan Security Rules sudah di-deploy.',
                      'Failed to load student accounts. Make sure the Security Rules are deployed.'), 'error');
    }
    accounts.sort((a, b) => (a.nama || a.email || '').localeCompare(b.nama || b.email || ''));

    const enrolled = await this._students(classId);
    // Peta userId → record enrollment (untuk tahu mana yang sudah anggota)
    const enrolledByUser = new Map(enrolled.filter(e => e.userId).map(e => [e.userId, e]));
    // Set pilihan awal = siswa yang sudah jadi anggota
    const selected = new Set(enrolledByUser.keys());

    const row = a => `
      <label class="pick-row" data-uid="${a.id}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);cursor:pointer;">
        <input type="checkbox" data-cb="${a.id}" ${selected.has(a.id) ? 'checked' : ''}>
        ${this._avatarHTML(a)}
        <span style="min-width:0;flex:1;">
          <b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(a.nama || tr('(tanpa nama)', '(no name)'))}</b>
          <span style="font-size:.76rem;color:var(--text-3);">${esc(a.email || '')}${a.kelas ? ' · ' + esc(a.kelas) : ''}${a.nis ? ' · NIS ' + esc(a.nis) : ''}</span>
        </span>
      </label>`;

    openModal({
      title: tr('Pilih Siswa', 'Select Students'),
      body: accounts.length ? `
        <p style="font-size:.84rem;color:var(--text-3);margin-bottom:10px;">${tr('Centang siswa yang menjadi anggota kelas ini. Akun siswa dibuat oleh admin.', 'Tick the students who belong to this class. Student accounts are created by the admin.')}</p>
        <div class="input-group" style="margin-bottom:12px;">
          <input type="text" class="input" id="pSearch" placeholder="${tr('Cari nama, email, kelas…', 'Search name, email, class…')}">
          <button type="button" class="suffix-btn"><ion-icon name="search-outline"></ion-icon></button>
        </div>
        <div id="pList" style="max-height:46vh;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:6px;">
          ${accounts.map(row).join('')}
        </div>
        <div style="font-size:.8rem;color:var(--text-3);margin:6px 0 14px;"><span id="pCount">${selected.size}</span> ${tr('siswa dipilih', 'students selected')}</div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan Anggota Kelas', 'Save Class Members')}</button>`
      : `
        <div class="empty-state" style="padding:24px 10px;">
          <ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada akun siswa', 'No student accounts yet')}</div>
          <div class="es-sub">${tr('Minta admin membuatkan akun siswa terlebih dahulu.', 'Ask the admin to create student accounts first.')}</div>
        </div>`,
      onMount: m => {
        const countEl = $('#pCount', m);
        const refreshCount = () => { if (countEl) countEl.textContent = selected.size; };

        $$('[data-cb]', m).forEach(cb => cb.onchange = () => {
          if (cb.checked) selected.add(cb.dataset.cb); else selected.delete(cb.dataset.cb);
          refreshCount();
        });

        const search = $('#pSearch', m);
        if (search) search.oninput = () => {
          const q = search.value.trim().toLowerCase();
          $$('.pick-row', m).forEach(r => {
            const a = accounts.find(x => x.id === r.dataset.uid) || {};
            const hay = `${a.nama || ''} ${a.email || ''} ${a.kelas || ''} ${a.nis || ''}`.toLowerCase();
            r.style.display = !q || hay.includes(q) ? '' : 'none';
          });
        };

        const saveBtn = $('#mSave', m);
        if (saveBtn) saveBtn.onclick = async () => {
          saveBtn.disabled = true;
          try {
            let order = enrolled.length;
            // Tambah yang baru dicentang
            for (const a of accounts) {
              if (selected.has(a.id) && !enrolledByUser.has(a.id)) {
                await DB.add('students', {
                  classId, userId: a.id,
                  nama: a.nama || a.email || tr('Siswa', 'Student'),
                  nis: a.nis || '',
                  fotoUrl: a.fotoUrl || a.photoURL || '',
                  urutan: order++
                });
              }
            }
            // Keluarkan yang dilepas centangnya
            for (const [userId, rec] of enrolledByUser) {
              if (!selected.has(userId)) await DB.remove('students', rec.id);
            }
            closeModal();
            toast(tr('Anggota kelas diperbarui 🧑‍🎓', 'Class members updated 🧑‍🎓'));
            this.render(this._el);
          } catch (e) {
            saveBtn.disabled = false;
            toast(e.message, 'error');
          }
        };
      }
    });
  },

  /* ============ TAB: ABSENSI ============ */

  async renderAbsensi(el) {
    const classes = await this._classes();
    if (!classes.length) { el.innerHTML = this._needClass(); this._bindNeedClass(el); return; }
    if (!this.classId || !classes.find(c => c.id === this.classId)) this.classId = classes[0].id;
    const students = await this._students(this.classId);

    // record absensi untuk (kelas, tanggal, pertemuan)
    const attId = `${this.classId}_${this.attDate}_${this.attPertemuan}`;
    const all = await DB.list('attendance');
    const rec = all.find(a => a.id === attId) || { entries: {} };
    const entries = rec.entries || {};

    const legend = this.ABSEN.map(a => `<span class="badge" style="gap:5px;"><span class="att-cell att-${a.k}" style="width:16px;height:16px;pointer-events:none;"></span> ${a.k} = ${tr(a.id, a.en)}</span>`).join(' ');

    el.innerHTML = `
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
        <div class="field" style="margin:0;"><label>${tr('Kelas', 'Class')}</label>${this._classPicker(classes)}</div>
        <div class="field" style="margin:0;"><label>${tr('Tanggal', 'Date')}</label><input type="date" class="input" id="attDate" value="${this.attDate}" style="max-width:170px;"></div>
        <div class="field" style="margin:0;"><label>${tr('Pertemuan ke-', 'Meeting #')}</label><input type="number" class="input" id="attPert" min="1" value="${this.attPertemuan}" style="max-width:110px;"></div>
      </div>

      <div style="font-size:.8rem;color:var(--text-3);display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">${legend}</div>

      ${students.length ? `
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <button class="btn btn-sm" id="allHadir"><ion-icon name="checkmark-done-outline"></ion-icon> ${tr('Tandai semua Hadir', 'Mark all Present')}</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th style="width:44px;">No</th><th>${tr('Nama Siswa', 'Student Name')}</th><th class="center">${tr('Status', 'Status')}</th></tr></thead>
            <tbody>
              ${students.map((s, i) => `
                <tr>
                  <td class="center">${i + 1}</td>
                  <td><b>${esc(s.nama)}</b>${s.nis ? `<div style="font-size:.75rem;color:var(--text-3);">${esc(s.nis)}</div>` : ''}</td>
                  <td>
                    <div style="display:flex;gap:5px;justify-content:center;">
                      ${this.ABSEN.map(a => `<button class="att-cell ${entries[s.id] === a.k ? 'att-' + a.k : 'att-empty'}" data-sid="${s.id}" data-st="${a.k}">${a.k}</button>`).join('')}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
          <button class="btn btn-primary" id="saveAtt"><ion-icon name="save-outline"></ion-icon> ${tr('Simpan Absensi', 'Save Attendance')}</button>
          <button class="btn" id="exportAtt"><ion-icon name="download-outline"></ion-icon> ${tr('Ekspor CSV', 'Export CSV')}</button>
          <span id="attSummary" style="align-self:center;font-size:.82rem;color:var(--text-3);"></span>
        </div>` : `
        <div class="card empty-state"><ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Kelas ini belum punya siswa', 'This class has no students')}</div>
          <div class="es-sub">${tr('Tambahkan siswa di tab "Kelas & Siswa" dulu', 'Add students in the "Classes & Students" tab first')}</div>
        </div>`}`;

    // draft lokal absensi (biar tidak nulis DB tiap klik)
    const draft = { ...entries };
    const updateSummary = () => {
      const cnt = {};
      Object.values(draft).forEach(v => cnt[v] = (cnt[v] || 0) + 1);
      const sum = $('#attSummary', el);
      if (sum) sum.textContent = this.ABSEN.map(a => `${a.k}:${cnt[a.k] || 0}`).join('  ');
    };
    updateSummary();

    $('#tClass', el).onchange = e => { this.classId = e.target.value; this.render(this._el); };
    $('#attDate', el).onchange = e => { this.attDate = e.target.value || todayStr(); this.render(this._el); };
    $('#attPert', el).onchange = e => { this.attPertemuan = Math.max(1, +e.target.value || 1); this.render(this._el); };

    $$('[data-sid]', el).forEach(b => b.onclick = () => {
      const sid = b.dataset.sid, st = b.dataset.st;
      draft[sid] = st;
      // perbarui tampilan baris
      $$(`[data-sid="${sid}"]`, el).forEach(x => x.className = `att-cell ${x.dataset.st === st ? 'att-' + st : 'att-empty'}`);
      updateSummary();
    });

    const allH = $('#allHadir', el);
    if (allH) allH.onclick = () => {
      students.forEach(s => draft[s.id] = 'H');
      $$('[data-sid]', el).forEach(x => x.className = `att-cell ${x.dataset.st === 'H' ? 'att-H' : 'att-empty'}`);
      updateSummary();
    };

    const save = $('#saveAtt', el);
    if (save) save.onclick = async () => {
      save.disabled = true;
      await DB.set('attendance', attId, {
        classId: this.classId, tanggal: this.attDate, pertemuan: this.attPertemuan, entries: draft
      });
      toast(tr('Absensi tersimpan ✅', 'Attendance saved ✅'));
      save.disabled = false;
    };

    const exp = $('#exportAtt', el);
    if (exp) exp.onclick = () => {
      const cls = classes.find(c => c.id === this.classId);
      const rows = [[tr('No', 'No'), tr('Nama', 'Name'), 'NIS', tr('Status', 'Status')]];
      students.forEach((s, i) => rows.push([i + 1, s.nama, s.nis || '', draft[s.id] || '']));
      downloadCSV(rows, `absensi_${(cls?.nama || 'kelas').replace(/\s+/g, '_')}_${this.attDate}_P${this.attPertemuan}.csv`);
    };
  },

  /* ============ TAB: PENILAIAN ============ */

  async renderNilai(el) {
    const classes = await this._classes();
    if (!classes.length) { el.innerHTML = this._needClass(); this._bindNeedClass(el); return; }
    if (!this.classId || !classes.find(c => c.id === this.classId)) this.classId = classes[0].id;
    const students = await this._students(this.classId);

    const allGrades = await DB.list('grades');
    const gb = allGrades.find(g => g.id === this.classId) || { id: this.classId, classId: this.classId, columns: [], scores: {} };
    const columns = gb.columns || [];
    const scores = gb.scores || {};

    const avgCols = columns.filter(c => c.avg !== false); // default semua dihitung
    const avgOf = sid => {
      const vals = avgCols.map(c => scores[sid]?.[c.id]).filter(v => v !== undefined && v !== null && v !== '');
      if (!vals.length) return null;
      return Math.round(vals.reduce((s, v) => s + (+v || 0), 0) / vals.length * 10) / 10;
    };
    const minKkm = columns.length ? Math.min(...columns.map(c => +c.kkm || 0)) : 0;

    el.innerHTML = `
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
        <div class="field" style="margin:0;"><label>${tr('Kelas', 'Class')}</label>${this._classPicker(classes)}</div>
        <button class="btn btn-primary btn-sm" id="addCol" style="margin-bottom:1px;"><ion-icon name="add"></ion-icon> ${tr('Kolom Nilai', 'Grade Column')}</button>
        <button class="btn btn-sm" id="exportGrade" style="margin-bottom:1px;"><ion-icon name="download-outline"></ion-icon> ${tr('Ekspor CSV', 'Export CSV')}</button>
        <button class="btn btn-sm" id="printGrade" style="margin-bottom:1px;"><ion-icon name="print-outline"></ion-icon> PDF</button>
      </div>

      ${!students.length ? `
        <div class="card empty-state"><ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Kelas ini belum punya siswa', 'This class has no students')}</div>
        </div>` : !columns.length ? `
        <div class="card empty-state"><ion-icon name="clipboard-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada kolom nilai', 'No grade columns yet')}</div>
          <div class="es-sub">${tr('Tambah kolom, mis. "UH 1" dengan KKM 75', 'Add a column, e.g. "Quiz 1" with KKM 75')}</div>
        </div>` : `
        <div style="font-size:.8rem;color:var(--text-3);margin-bottom:10px;">${tr('Nilai di bawah KKM otomatis <b style="color:#ef4444;">merah</b>. Centang kolom untuk dihitung ke rata-rata. Nilai tersimpan otomatis.', 'Grades below KKM turn <b style="color:#ef4444;">red</b>. Tick a column to include it in the average. Grades auto-save.')}</div>
        <div class="table-wrap">
          <table class="data-table" id="gradeTable">
            <thead>
              <tr>
                <th style="width:40px;">No</th>
                <th style="min-width:150px;position:sticky;left:0;background:var(--surface-2);">${tr('Nama', 'Name')}</th>
                ${columns.map(c => `
                  <th class="center" style="min-width:80px;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
                      <span style="cursor:pointer;" data-editcol="${c.id}" title="${tr('Ubah kolom', 'Edit column')}">${esc(c.nama)} <ion-icon name="create-outline" style="font-size:.8rem;"></ion-icon></span>
                      <span style="font-weight:600;color:var(--text-3);font-size:.7rem;">KKM ${+c.kkm || 0}</span>
                      <label style="font-size:.65rem;color:var(--text-3);font-weight:600;display:flex;align-items:center;gap:3px;cursor:pointer;">
                        <input type="checkbox" data-avgcol="${c.id}" ${c.avg !== false ? 'checked' : ''} style="width:13px;height:13px;accent-color:var(--brand);"> ${tr('rata2', 'avg')}
                      </label>
                    </div>
                  </th>`).join('')}
                <th class="center" style="min-width:70px;background:var(--brand-soft);">${tr('Rata²', 'Avg')}</th>
              </tr>
            </thead>
            <tbody>
              ${students.map((s, i) => `
                <tr>
                  <td class="center">${i + 1}</td>
                  <td style="position:sticky;left:0;background:var(--surface);"><b>${esc(s.nama)}</b></td>
                  ${columns.map(c => {
                    const v = scores[s.id]?.[c.id];
                    const below = v !== undefined && v !== '' && (+v) < (+c.kkm || 0);
                    return `<td class="center"><input class="cell-input ${below ? 'grade-below' : ''}" type="number" min="0" max="100" data-sid="${s.id}" data-col="${c.id}" value="${v ?? ''}"></td>`;
                  }).join('')}
                  <td class="center" data-avg="${s.id}"><b class="${avgOf(s.id) !== null && avgOf(s.id) < minKkm ? 'grade-below' : ''}">${avgOf(s.id) ?? '-'}</b></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`}`;

    $('#tClass', el).onchange = e => { this.classId = e.target.value; this.render(this._el); };
    $('#addCol', el).onclick = () => this._colModal(gb);
    $$('[data-editcol]', el).forEach(h => h.onclick = () => this._colModal(gb, columns.find(c => c.id === h.dataset.editcol)));

    // toggle kolom rata2
    $$('[data-avgcol]', el).forEach(cb => cb.onchange = async () => {
      const col = columns.find(c => c.id === cb.dataset.avgcol);
      col.avg = cb.checked;
      await DB.set('grades', this.classId, { classId: this.classId, columns, scores });
      this.render(this._el);
    });

    // input nilai → simpan (debounce) + update warna & rata2 langsung
    let saveT;
    const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => DB.set('grades', this.classId, { classId: this.classId, columns, scores }), 400); };
    $$('.cell-input', el).forEach(inp => inp.oninput = () => {
      const sid = inp.dataset.sid, col = inp.dataset.col;
      let val = inp.value === '' ? '' : clamp(+inp.value, 0, 100);
      if (val !== '' && String(val) !== inp.value) inp.value = val;
      scores[sid] = scores[sid] || {};
      if (val === '') delete scores[sid][col]; else scores[sid][col] = val;
      const colDef = columns.find(c => c.id === col);
      inp.classList.toggle('grade-below', val !== '' && val < (+colDef.kkm || 0));
      const avgCell = $(`[data-avg="${sid}"] b`, el);
      if (avgCell) { const a = avgOf(sid); avgCell.textContent = a ?? '-'; avgCell.classList.toggle('grade-below', a !== null && a < minKkm); }
      persist();
    });

    $('#exportGrade', el) && ($('#exportGrade', el).onclick = () => {
      const cls = classes.find(c => c.id === this.classId);
      const header = [tr('No', 'No'), tr('Nama', 'Name'), ...columns.map(c => `${c.nama} (KKM ${+c.kkm || 0})`), tr('Rata2', 'Avg')];
      const rows = [header];
      students.forEach((s, i) => rows.push([i + 1, s.nama, ...columns.map(c => scores[s.id]?.[c.id] ?? ''), avgOf(s.id) ?? '']));
      downloadCSV(rows, `nilai_${(cls?.nama || 'kelas').replace(/\s+/g, '_')}.csv`);
    });

    $('#printGrade', el) && ($('#printGrade', el).onclick = () => {
      const cls = classes.find(c => c.id === this.classId);
      const head = `<h2>${tr('Daftar Nilai', 'Grade List')} — ${esc(cls?.nama || '')}</h2><div class="muted">${esc(DB.user.nama || '')}${DB.user.mapel ? ' · ' + esc(DB.user.mapel) : ''} · ${fmtDate(todayStr())}</div>`;
      const th = `<tr><th>No</th><th>${tr('Nama', 'Name')}</th>${columns.map(c => `<th>${esc(c.nama)}<br><small>KKM ${+c.kkm || 0}</small></th>`).join('')}<th>${tr('Rata2', 'Avg')}</th></tr>`;
      const body = students.map((s, i) => `<tr><td class="center">${i + 1}</td><td>${esc(s.nama)}</td>${columns.map(c => { const v = scores[s.id]?.[c.id]; const below = v !== undefined && v !== '' && +v < (+c.kkm || 0); return `<td class="center ${below ? 'red' : ''}">${v ?? '-'}</td>`; }).join('')}<td class="center">${avgOf(s.id) ?? '-'}</td></tr>`).join('');
      printHTML(`Nilai ${cls?.nama || ''}`, `${head}<table><thead>${th}</thead><tbody>${body}</tbody></table>`);
    });
  },

  _colModal(gb, col = null) {
    openModal({
      title: col ? tr('Ubah Kolom Nilai', 'Edit Grade Column') : tr('Kolom Nilai Baru', 'New Grade Column'),
      body: `
        <div class="field">
          <label>${tr('Nama penilaian', 'Assessment name')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('mis. UH 1, Tugas, UTS', 'e.g. Quiz 1, Task, Midterm')}" value="${esc(col?.nama || '')}">
        </div>
        <div class="field">
          <label>KKM <span style="font-weight:500;color:var(--text-3)">${tr('(batas tuntas)', '(passing mark)')}</span></label>
          <input type="number" class="input" id="mKkm" min="0" max="100" value="${col?.kkm ?? 75}">
        </div>
        <div style="display:flex;gap:10px;">
          ${col ? '<button class="btn btn-soft-danger" id="mDel"><ion-icon name="trash-outline"></ion-icon></button>' : ''}
          <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>
        </div>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (!nama) return toast(tr('Isi nama penilaian.', 'Enter an assessment name.'), 'warning');
          const kkm = clamp(+$('#mKkm', m).value || 0, 0, 100);
          const columns = gb.columns || [];
          if (col) { const c = columns.find(x => x.id === col.id); c.nama = nama; c.kkm = kkm; }
          else columns.push({ id: uid(), nama, kkm, avg: true });
          await DB.set('grades', this.classId, { classId: this.classId, columns, scores: gb.scores || {} });
          closeModal();
          toast(tr('Kolom tersimpan.', 'Column saved.'));
          this.render(this._el);
        };
        const del = $('#mDel', m);
        if (del) del.onclick = async () => {
          if (!await confirmDialog(tr('Hapus kolom nilai ini beserta seluruh nilainya?', 'Delete this column and all its grades?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
          const columns = (gb.columns || []).filter(c => c.id !== col.id);
          const scores = gb.scores || {};
          Object.keys(scores).forEach(sid => { if (scores[sid]) delete scores[sid][col.id]; });
          await DB.set('grades', this.classId, { classId: this.classId, columns, scores });
          closeModal();
          toast(tr('Kolom dihapus.', 'Column deleted.'));
          this.render(this._el);
        };
      }
    });
  },

  /* ============ TAB: JURNAL MENGAJAR ============ */

  async renderJurnal(el) {
    const classes = await this._classes();
    if (!classes.length) { el.innerHTML = this._needClass(); this._bindNeedClass(el); return; }
    if (!this.classId || !classes.find(c => c.id === this.classId)) this.classId = classes[0].id;

    const journals = (await DB.list('journals'))
      .filter(j => j.classId === this.classId)
      .sort((a, b) => (b.tanggal || '') < (a.tanggal || '') ? -1 : 1);

    el.innerHTML = `
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
        <div class="field" style="margin:0;"><label>${tr('Kelas', 'Class')}</label>${this._classPicker(classes)}</div>
        <button class="btn btn-primary btn-sm" id="addJurnal" style="margin-bottom:1px;"><ion-icon name="add"></ion-icon> ${tr('Jurnal Baru', 'New Journal')}</button>
      </div>

      ${journals.length ? `
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${journals.map(j => `
            <div class="card">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="badge badge-purple">${fmtDate(j.tanggal, { weekday: true })}</span>
                    ${j.pertemuan ? `<span class="badge badge-blue">${tr('Pertemuan', 'Meeting')} ${j.pertemuan}</span>` : ''}
                    ${j.hadir != null ? `<span class="badge badge-green"><ion-icon name="people"></ion-icon> ${j.hadir} ${tr('hadir', 'present')}</span>` : ''}
                  </div>
                  <div style="font-weight:800;font-size:1rem;margin-top:8px;">${esc(j.judul)}</div>
                  <div style="font-size:.86rem;color:var(--text-2);margin-top:4px;line-height:1.6;white-space:pre-wrap;">${esc(j.materi || '')}</div>
                  ${j.foto ? `<img src="${j.foto}" alt="Foto" style="margin-top:10px;max-height:120px;border-radius:10px;cursor:pointer;" data-foto="${j.id}">` : ''}
                </div>
                <div style="display:flex;gap:6px;">
                  <button class="mini-icon-btn" data-edit="${j.id}"><ion-icon name="create-outline"></ion-icon></button>
                  <button class="mini-icon-btn danger" data-del="${j.id}"><ion-icon name="trash-outline"></ion-icon></button>
                </div>
              </div>
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state"><ion-icon name="document-text-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada jurnal untuk kelas ini', 'No journals for this class yet')}</div>
          <div class="es-sub">${tr('Catat materi & kegiatan tiap pertemuan mengajar 📝', 'Log material & activities for each teaching session 📝')}</div>
        </div>`}`;

    $('#tClass', el).onchange = e => { this.classId = e.target.value; this.render(this._el); };
    $('#addJurnal', el).onclick = () => this._jurnalModal();
    $$('[data-edit]', el).forEach(b => b.onclick = () => this._jurnalModal(journals.find(j => j.id === b.dataset.edit)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus jurnal ini?', 'Delete this journal?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      const jrn = journals.find(j => j.id === b.dataset.del);
      await DB.remove('journals', b.dataset.del);
      Storage.deleteByUrl(jrn?.foto);   // bersihkan file foto di Supabase (best-effort)
      toast(tr('Jurnal dihapus.', 'Journal deleted.'));
      this.render(this._el);
    });
    $$('[data-foto]', el).forEach(img => img.onclick = () => {
      openModal({ title: tr('Foto Pembelajaran', 'Learning Photo'), body: `<img src="${img.src}" style="width:100%;border-radius:12px;">` });
    });
  },

  async _jurnalModal(j = null) {
    // hitung jumlah hadir dari absensi tanggal tsb (bila ada) sebagai default
    const tanggal = j?.tanggal || todayStr();
    let fotoData = j?.foto || '';

    openModal({
      title: j ? tr('Ubah Jurnal', 'Edit Journal') : tr('Jurnal Mengajar Baru', 'New Teaching Journal'),
      body: `
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field"><label>${tr('Tanggal', 'Date')}</label><input type="date" class="input" id="mTgl" value="${tanggal}"></div>
          <div class="field"><label>${tr('Pertemuan ke-', 'Meeting #')}</label><input type="number" class="input" id="mPert" min="1" value="${j?.pertemuan || ''}"></div>
        </div>
        <div class="field"><label>${tr('Judul / topik', 'Title / topic')}</label><input type="text" class="input" id="mJudul" placeholder="${tr('mis. Percabangan if-else', 'e.g. If-else branching')}" value="${esc(j?.judul || '')}"></div>
        <div class="field"><label>${tr('Materi & kegiatan', 'Material & activities')}</label><textarea class="textarea" id="mMateri" placeholder="${tr('Uraian materi, metode, tugas…', 'Material summary, method, assignment…')}">${esc(j?.materi || '')}</textarea></div>
        <div class="field">
          <label>${tr('Jumlah siswa hadir', 'Students present')} <span style="font-weight:500;color:var(--text-3)">${tr('(otomatis dari absensi bila kosong)', '(auto from attendance if empty)')}</span></label>
          <input type="number" class="input" id="mHadir" min="0" value="${j?.hadir ?? ''}">
        </div>
        <div class="field">
          <label>${tr('Foto pembelajaran', 'Learning photo')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
          <input type="file" accept="image/*" class="input" id="mFoto">
          <div id="fotoPrev" style="margin-top:8px;">${fotoData ? `<img src="${fotoData}" style="max-height:90px;border-radius:8px;">` : ''}</div>
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan Jurnal', 'Save Journal')}</button>`,
      onMount: m => {
        $('#mFoto', m).onchange = async e => {
          const f = e.target.files[0];
          if (!f) return;
          const prev = $('#fotoPrev', m);
          const oldUrl = fotoData;   // foto sebelumnya (untuk dibersihkan bila terganti)
          prev.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;font-size:.82rem;color:var(--text-3);">
            <ion-icon name="cloud-upload-outline"></ion-icon> ${tr('Mengunggah foto…', 'Uploading photo…')}</span>`;
          try {
            // Unggah file ke Supabase Storage; yang disimpan ke Firestore hanya URL-nya.
            fotoData = await Storage.uploadFoto(f, 'jurnal');
            prev.innerHTML = `<img src="${fotoData}" style="max-height:90px;border-radius:8px;">`;
            Storage.deleteByUrl(oldUrl);   // hapus foto lama (best-effort)
          } catch (err) {
            fotoData = oldUrl;
            prev.innerHTML = oldUrl ? `<img src="${oldUrl}" style="max-height:90px;border-radius:8px;">` : '';
            toast(tr('Gagal mengunggah foto: ', 'Failed to upload photo: ') + (err.message || ''), 'error');
          }
        };
        $('#mSave', m).onclick = async () => {
          const judul = $('#mJudul', m).value.trim();
          if (!judul) return toast(tr('Isi judul/topik.', 'Enter a title/topic.'), 'warning');
          const tgl = $('#mTgl', m).value || todayStr();
          const pert = +$('#mPert', m).value || null;
          let hadir = $('#mHadir', m).value === '' ? null : +$('#mHadir', m).value;
          // auto hadir dari absensi bila kosong
          if (hadir === null) {
            const att = (await DB.list('attendance')).filter(a => a.classId === this.classId && a.tanggal === tgl);
            if (att.length) {
              const merged = {};
              att.forEach(a => Object.assign(merged, a.entries || {}));
              hadir = Object.values(merged).filter(v => v === 'H').length || null;
            }
          }
          const data = { classId: this.classId, tanggal: tgl, pertemuan: pert, judul, materi: $('#mMateri', m).value.trim(), hadir, foto: fotoData || '' };
          const btn = $('#mSave', m); btn.disabled = true;
          try {
            if (j) await DB.update('journals', j.id, data);
            else await DB.add('journals', data);
            closeModal();
            toast(tr('Jurnal tersimpan 📝', 'Journal saved 📝'));
            this.render(this._el);
          } catch (e) { btn.disabled = false; toast(e.message, 'error'); }
        };
      }
    });
  },

  /* ============ TAB: JADWAL MENGAJAR ============ */

  async renderJadwal(el) {
    const schedule = (await DB.list('schedule')).sort((a, b) =>
      (+a.hari - +b.hari) || (a.jamMulai || '').localeCompare(b.jamMulai || ''));
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];

    el.innerHTML = `
      <div class="portal-head" style="margin-bottom:16px;">
        <div><h1 style="font-size:1.2rem;">${tr('Jadwal Mengajar', 'Teaching Schedule')}</h1></div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-sm" id="exportJadwal"><ion-icon name="download-outline"></ion-icon> CSV</button>
          <button class="btn btn-primary btn-sm" id="addJadwal"><ion-icon name="add"></ion-icon> ${tr('Tambah', 'Add')}</button>
        </div>
      </div>

      ${schedule.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>${tr('Hari', 'Day')}</th><th>${tr('Jam', 'Time')}</th><th>${tr('Kelas', 'Class')}</th><th>${tr('Mapel', 'Subject')}</th><th style="text-align:right;">${tr('Aksi', 'Actions')}</th></tr></thead>
            <tbody>
              ${dayOrder.filter(d => schedule.some(s => +s.hari === d)).map(d => schedule.filter(s => +s.hari === d).map((s, idx) => `
                <tr>
                  <td>${idx === 0 ? `<b>${HARI[d]}</b>` : ''}</td>
                  <td>${esc(s.jamMulai)}–${esc(s.jamSelesai)}</td>
                  <td>${esc(s.kelas || '-')}</td>
                  <td>${esc(s.mapel || '-')}</td>
                  <td style="text-align:right;white-space:nowrap;">
                    <button class="mini-icon-btn" data-edit="${s.id}"><ion-icon name="create-outline"></ion-icon></button>
                    <button class="mini-icon-btn danger" data-del="${s.id}"><ion-icon name="trash-outline"></ion-icon></button>
                  </td>
                </tr>`).join('')).join('')}
            </tbody>
          </table>
        </div>` : `
        <div class="card empty-state"><ion-icon name="calendar-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada jadwal mengajar', 'No teaching schedule yet')}</div>
          <div class="es-sub">${tr('Tambahkan jam, kelas, dan mapel yang kamu ajar 🗓️', 'Add the time, class, and subject you teach 🗓️')}</div>
        </div>`}`;

    $('#addJadwal', el).onclick = () => this._jadwalModal();
    $$('[data-edit]', el).forEach(b => b.onclick = () => this._jadwalModal(schedule.find(s => s.id === b.dataset.edit)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus jadwal ini?', 'Delete this schedule?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      await DB.remove('schedule', b.dataset.del);
      toast(tr('Jadwal dihapus.', 'Schedule deleted.'));
      this.render(this._el);
    });
    $('#exportJadwal', el) && ($('#exportJadwal', el).onclick = () => {
      const rows = [[tr('Hari', 'Day'), tr('Mulai', 'Start'), tr('Selesai', 'End'), tr('Kelas', 'Class'), tr('Mapel', 'Subject')]];
      schedule.forEach(s => rows.push([HARI[+s.hari], s.jamMulai, s.jamSelesai, s.kelas || '', s.mapel || '']));
      downloadCSV(rows, 'jadwal_mengajar.csv');
    });
  },

  async _jadwalModal(item = null) {
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    const classes = await this._classes();
    openModal({
      title: item ? tr('Ubah Jadwal', 'Edit Schedule') : tr('Jadwal Baru', 'New Schedule'),
      body: `
        <div class="field">
          <label>${tr('Hari', 'Day')}</label>
          <select class="select" id="mHari">${dayOrder.map(d => `<option value="${d}" ${(item ? +item.hari : new Date().getDay()) === d ? 'selected' : ''}>${HARI[d]}</option>`).join('')}</select>
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field"><label>${tr('Jam mulai', 'Start time')}</label><input type="time" class="input" id="mMulai" value="${item?.jamMulai || '07:00'}"></div>
          <div class="field"><label>${tr('Jam selesai', 'End time')}</label><input type="time" class="input" id="mSelesai" value="${item?.jamSelesai || '08:30'}"></div>
        </div>
        <div class="field">
          <label>${tr('Kelas', 'Class')}</label>
          <input type="text" class="input" id="mKelas" list="clsList" placeholder="${tr('mis. X TKJ 2', 'e.g. X TKJ 2')}" value="${esc(item?.kelas || '')}">
          <datalist id="clsList">${classes.map(c => `<option value="${esc(c.nama)}">`).join('')}</datalist>
        </div>
        <div class="field"><label>${tr('Mata pelajaran', 'Subject')}</label><input type="text" class="input" id="mMapel" value="${esc(item?.mapel || DB.user.mapel || '')}"></div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const jamMulai = $('#mMulai', m).value, jamSelesai = $('#mSelesai', m).value;
          if (!jamMulai || !jamSelesai) return toast(tr('Isi jam mulai & selesai.', 'Enter start & end time.'), 'warning');
          if (jamSelesai <= jamMulai) return toast(tr('Jam selesai harus setelah jam mulai.', 'End time must be after start time.'), 'warning');
          const data = { hari: +$('#mHari', m).value, jamMulai, jamSelesai, kelas: $('#mKelas', m).value.trim(), mapel: $('#mMapel', m).value.trim() };
          if (item) await DB.update('schedule', item.id, data);
          else await DB.add('schedule', data);
          closeModal();
          toast(tr('Jadwal tersimpan 🗓️', 'Schedule saved 🗓️'));
          this.render(this._el);
        };
      }
    });
  },

  /* ---------- util ---------- */

  _needClass() {
    return `<div class="card empty-state">
      <ion-icon name="people-outline"></ion-icon>
      <div class="es-title">${tr('Belum ada kelas', 'No classes yet')}</div>
      <div class="es-sub">${tr('Buat kelas dulu di tab "Kelas & Siswa"', 'Create a class first in the "Classes & Students" tab')}</div>
      <button class="btn btn-primary btn-sm" id="goKelas" style="margin-top:14px;"><ion-icon name="add"></ion-icon> ${tr('Ke Kelas & Siswa', 'Go to Classes & Students')}</button>
    </div>`;
  },
  _bindNeedClass(el) {
    const b = $('#goKelas', el);
    if (b) b.onclick = () => { this.tab = 'kelas'; this.render(this._el); };
  },

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
