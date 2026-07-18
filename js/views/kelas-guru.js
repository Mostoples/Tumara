/* ============================================================
   TUMARA — Kelas (Guru, jalur Umum)
   ------------------------------------------------------------
   Modul khusus untuk pengguna yang memilih pekerjaan "Guru" di
   jalur Umum (mis. guru les/privat/non-formal — TANPA akun siswa
   asli), beda dari guru.html (guru sekolah dengan kelas & siswa
   resmi berakun sendiri). Di sini murid dicatat manual oleh guru
   sendiri (bukan akun Tumara terpisah), dipakai bareng di tab
   Absensi, Nilai, & Jurnal. Rute hanya ditampilkan di menu kalau
   'guru' ada di DB.user.pekerjaanList — lihat Dashboard._menuUmum
   (js/views/dashboard.js).
   Koleksi (semua personal per-akun, lihat js/umum-db.js):
   • murid          — { nama, catatan }
   • absensiManual  — { tanggal, muridId, status }, id `${tanggal}_${muridId}`
   • nilaiTugas     — { judul, kkm, dibuat }
   • nilaiManual    — { tugasId, muridId, nilai }, id `${tugasId}_${muridId}`
   • jurnalManual   — { tanggal, judul, materi }
   ============================================================ */

const KelasGuru = {
  tab: 'murid',            // murid | absensi | nilai | jurnal
  absensiTanggal: null,
  nilaiTugasId: null,       // tugas yang sedang dibuka di tab Nilai (null = daftar tugas)

  _TABS: [
    ['murid',   'people-outline',   () => tr('Murid', 'Students')],
    ['absensi', 'checkbox-outline', () => tr('Absensi', 'Attendance')],
    ['nilai',   'star-outline',     () => tr('Nilai', 'Grades')],
    ['jurnal',  'book-outline',     () => tr('Jurnal', 'Journal')]
  ],

  STATUS_ABSEN: [
    ['h', () => tr('Hadir', 'Present'), 'info'],
    ['s', () => tr('Sakit', 'Sick'), 'fin'],
    ['i', () => tr('Ijin', 'Excused'), 'health'],
    ['a', () => tr('Alfa', 'Absent'), 'danger'],
    ['d', () => tr('Dispen', 'Dispensation'), 'prod']
  ],

  async render(el) {
    const list = DB.user?.pekerjaanList?.length ? DB.user.pekerjaanList : (DB.user?.pekerjaan ? [DB.user.pekerjaan] : []);
    if (!list.includes('guru')) { App.navigate('dashboard'); return; }
    if (!this.absensiTanggal) this.absensiTanggal = todayStr();

    el.innerHTML = `
      <div class="tabs">
        ${this._TABS.map(([k, ic, lbl]) => `<button class="tab ${this.tab === k ? 'active' : ''}" data-tab="${k}"><ion-icon name="${ic}"></ion-icon>${lbl()}</button>`).join('')}
      </div>
      <div id="kgBody"></div>`;

    $$('.tab', el).forEach(t => t.onclick = () => {
      this.tab = t.dataset.tab;
      if (this.tab !== 'nilai') this.nilaiTugasId = null;
      App.refresh();
    });

    const body = $('#kgBody', el);
    if (this.tab === 'murid') await this.renderMurid(body);
    else if (this.tab === 'absensi') await this.renderAbsensi(body);
    else if (this.tab === 'nilai') await this.renderNilai(body);
    else await this.renderJurnal(body);
  },

  /* ============ TAB: MURID ============ */

  async renderMurid(el) {
    const murid = (await DB.list('murid')).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="font-size:.88rem;color:var(--text-3);font-weight:600;">${tr('Daftar murid yang kamu ajar — dicatat manual, bukan akun Tumara.', "List of students you teach — recorded manually, not Tumara accounts.")}</div>
        <button class="btn btn-prod btn-sm" id="addMurid"><ion-icon name="add"></ion-icon> ${tr('Murid Baru', 'New Student')}</button>
      </div>

      ${murid.length ? `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${murid.map(m => `
            <div class="list-item">
              <div class="item-icon" style="background:var(--prod-soft);color:var(--prod);"><ion-icon name="person-outline"></ion-icon></div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:.92rem;">${esc(m.nama)}</div>
                ${m.catatan ? `<div style="font-size:.78rem;color:var(--text-3);">${esc(m.catatan)}</div>` : ''}
              </div>
              <button class="mini-icon-btn" data-edit="${m.id}"><ion-icon name="pencil-outline"></ion-icon></button>
              <button class="mini-icon-btn danger" data-del="${m.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada murid', 'No students yet')}</div>
          <div class="es-sub">${tr('Tambahkan murid untuk mulai catat absensi & nilai 🎓', 'Add students to start tracking attendance & grades 🎓')}</div>
        </div>`}`;

    $('#addMurid', el).onclick = () => this._muridModal(null);
    $$('[data-edit]', el).forEach(b => b.onclick = () => this._muridModal(murid.find(m => m.id === b.dataset.edit)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus murid ini beserta riwayat absensi/nilainya?', "Delete this student and their attendance/grade history?"), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      const id = b.dataset.del;
      await DB.remove('murid', id);
      const [absensi, nilai] = await Promise.all([DB.list('absensiManual'), DB.list('nilaiManual')]);
      await Promise.all([
        ...absensi.filter(a => a.muridId === id).map(a => DB.remove('absensiManual', a.id)),
        ...nilai.filter(n => n.muridId === id).map(n => DB.remove('nilaiManual', n.id))
      ]);
      toast(tr('Murid dihapus.', 'Student deleted.'));
      App.refresh();
    });
  },

  _muridModal(murid) {
    openModal({
      title: murid ? tr('Ubah Murid', 'Edit Student') : tr('Murid Baru', 'New Student'),
      body: `
        <div class="field">
          <label>${tr('Nama murid', 'Student name')}</label>
          <input type="text" class="input" id="mNama" value="${esc(murid?.nama || '')}">
        </div>
        <div class="field">
          <label>${tr('Catatan', 'Note')} <span style="font-weight:500;color:var(--text-3)">(${tr('opsional', 'optional')})</span></label>
          <input type="text" class="input" id="mCatatan" placeholder="${tr('mis. Kelas 8A', 'e.g. Grade 8A')}" value="${esc(murid?.catatan || '')}">
        </div>
        <button class="btn btn-prod btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (!nama) return toast(tr('Isi nama murid.', 'Enter student name.'), 'warning');
          const data = { nama, catatan: $('#mCatatan', m).value.trim() };
          if (murid) await DB.update('murid', murid.id, data);
          else await DB.add('murid', data);
          closeModal();
          toast(tr('Data murid tersimpan.', 'Student data saved.'));
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: ABSENSI ============ */

  async renderAbsensi(el) {
    const [murid, absensi] = await Promise.all([DB.list('murid'), DB.list('absensiManual')]);
    murid.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
    const tanggal = this.absensiTanggal;
    const byMurid = {};
    absensi.filter(a => a.tanggal === tanggal).forEach(a => { byMurid[a.muridId] = a.status; });

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
        <input type="date" class="input" id="absTanggal" style="max-width:180px;" value="${tanggal}">
        <div style="font-size:.8rem;color:var(--text-3);">${fmtDate(tanggal, { weekday: true })}</div>
      </div>

      ${!murid.length ? `
        <div class="card empty-state">
          <ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada murid', 'No students yet')}</div>
          <div class="es-sub">${tr('Tambahkan murid dulu di tab Murid.', 'Add students first in the Students tab.')}</div>
        </div>` : `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${murid.map(m => `
            <div class="list-item" style="flex-wrap:wrap;">
              <div style="flex:1;min-width:120px;font-weight:700;font-size:.92rem;">${esc(m.nama)}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${this.STATUS_ABSEN.map(([k, lbl, tone]) => `
                  <button class="chip ${byMurid[m.id] === k ? 'active' : ''}" data-mid="${m.id}" data-st="${k}" title="${lbl()}"
                    style="${byMurid[m.id] === k ? `background:var(--${tone});color:#fff;border-color:var(--${tone});` : ''}">${lbl().slice(0, 1)}</button>`).join('')}
              </div>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;font-size:.72rem;color:var(--text-3);">
          ${this.STATUS_ABSEN.map(([k, lbl, tone]) => `<span><span class="kal-cip" style="background:var(--${tone});"></span> ${lbl()}</span>`).join('')}
        </div>`}`;

    $('#absTanggal', el).onchange = e => { this.absensiTanggal = e.target.value; App.refresh(); };
    $$('[data-mid]', el).forEach(b => b.onclick = async () => {
      const muridId = b.dataset.mid, status = b.dataset.st;
      await DB.set('absensiManual', `${tanggal}_${muridId}`, { tanggal, muridId, status });
      App.refresh();
    });
  },

  /* ============ TAB: NILAI ============ */

  async renderNilai(el) {
    if (this.nilaiTugasId) return this._renderNilaiDetail(el);

    const tugasList = (await DB.list('nilaiTugas')).sort((a, b) => (b.dibuat || '').localeCompare(a.dibuat || ''));
    const semuaNilai = await DB.list('nilaiManual');

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="font-size:.88rem;color:var(--text-3);font-weight:600;">${tr('Kelola nilai per tugas/ujian.', 'Manage grades per assignment/exam.')}</div>
        <button class="btn btn-prod btn-sm" id="addTugasNilai"><ion-icon name="add"></ion-icon> ${tr('Tugas Baru', 'New Assignment')}</button>
      </div>

      ${tugasList.length ? `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${tugasList.map(t => {
            const nilaiTugas = semuaNilai.filter(n => n.tugasId === t.id && n.nilai !== '' && n.nilai != null);
            const rata = nilaiTugas.length ? Math.round(nilaiTugas.reduce((s, n) => s + (+n.nilai || 0), 0) / nilaiTugas.length) : null;
            return `
            <div class="list-item" data-open="${t.id}" style="cursor:pointer;">
              <div class="item-icon" style="background:var(--prod-soft);color:var(--prod);"><ion-icon name="star-outline"></ion-icon></div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:.92rem;">${esc(t.judul)}</div>
                <div style="font-size:.78rem;color:var(--text-3);">${tr(`${nilaiTugas.length} murid dinilai`, `${nilaiTugas.length} students graded`)}${rata !== null ? ` · ${tr('rata-rata', 'avg')} ${rata}` : ''}</div>
              </div>
              <button class="mini-icon-btn danger" data-del="${t.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`;
          }).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="star-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada tugas/ujian', 'No assignments/exams yet')}</div>
          <div class="es-sub">${tr('Tambah tugas untuk mulai input nilai murid.', 'Add an assignment to start entering student grades.')}</div>
        </div>`}`;

    $('#addTugasNilai', el).onclick = () => this._tugasNilaiModal();
    $$('[data-open]', el).forEach(row => row.onclick = e => {
      if (e.target.closest('[data-del]')) return;
      this.nilaiTugasId = row.dataset.open;
      App.refresh();
    });
    $$('[data-del]', el).forEach(b => b.onclick = async e => {
      e.stopPropagation();
      if (!await confirmDialog(tr('Hapus tugas ini beserta semua nilainya?', 'Delete this assignment and all its grades?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      const id = b.dataset.del;
      await DB.remove('nilaiTugas', id);
      const nilaiTerkait = (await DB.list('nilaiManual')).filter(n => n.tugasId === id);
      await Promise.all(nilaiTerkait.map(n => DB.remove('nilaiManual', n.id)));
      toast(tr('Tugas dihapus.', 'Assignment deleted.'));
      App.refresh();
    });
  },

  _tugasNilaiModal() {
    openModal({
      title: tr('Tugas/Ujian Baru', 'New Assignment/Exam'),
      body: `
        <div class="field">
          <label>${tr('Judul tugas/ujian', 'Assignment/exam title')}</label>
          <input type="text" class="input" id="mJudul" placeholder="${tr('mis. Ulangan Harian Bab 3', 'e.g. Chapter 3 Quiz')}">
        </div>
        <div class="field">
          <label>KKM <span style="font-weight:500;color:var(--text-3)">(${tr('nilai batas lulus, opsional', 'pass threshold, optional')})</span></label>
          <input type="number" class="input" id="mKkm" placeholder="75">
        </div>
        <button class="btn btn-prod btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const judul = $('#mJudul', m).value.trim();
          if (!judul) return toast(tr('Isi judul tugas.', 'Enter assignment title.'), 'warning');
          const kkmVal = $('#mKkm', m).value;
          await DB.add('nilaiTugas', { judul, kkm: kkmVal ? +kkmVal : null, dibuat: new Date().toISOString() });
          closeModal();
          toast(tr('Tugas ditambahkan.', 'Assignment added.'));
          App.refresh();
        };
      }
    });
  },

  async _renderNilaiDetail(el) {
    const [tugasList, murid, semuaNilai] = await Promise.all([DB.list('nilaiTugas'), DB.list('murid'), DB.list('nilaiManual')]);
    const tugas = tugasList.find(t => t.id === this.nilaiTugasId);
    if (!tugas) { this.nilaiTugasId = null; return this.renderNilai(el); }
    murid.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    const nilaiByMurid = {};
    semuaNilai.filter(n => n.tugasId === tugas.id).forEach(n => { nilaiByMurid[n.muridId] = n.nilai; });
    const hitungRata = () => {
      const valid = Object.values(nilaiByMurid).filter(v => v !== '' && v != null).map(Number);
      return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    };

    el.innerHTML = `
      <div style="margin-bottom:14px;">
        <button class="btn btn-sm" id="nBack"><ion-icon name="arrow-back-outline"></ion-icon> ${tr('Kembali', 'Back')}</button>
      </div>
      <div style="font-weight:800;font-size:1.1rem;margin-bottom:4px;">${esc(tugas.judul)}</div>
      <div style="font-size:.8rem;color:var(--text-3);margin-bottom:16px;">${tugas.kkm != null ? tr(`KKM ${tugas.kkm}`, `Pass threshold ${tugas.kkm}`) : tr('Tanpa KKM', 'No pass threshold')}</div>

      ${!murid.length ? `
        <div class="card empty-state">
          <ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada murid', 'No students yet')}</div>
          <div class="es-sub">${tr('Tambahkan murid dulu di tab Murid.', 'Add students first in the Students tab.')}</div>
        </div>` : `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th class="sticky-col">${tr('Murid', 'Student')}</th><th class="center">${tr('Nilai', 'Score')}</th></tr></thead>
            <tbody>
              ${murid.map(m => {
                const nilai = nilaiByMurid[m.id];
                const dibawah = tugas.kkm != null && nilai !== undefined && nilai !== '' && +nilai < +tugas.kkm;
                return `
                <tr>
                  <td class="sticky-col">${esc(m.nama)}</td>
                  <td class="center"><input type="number" class="input" data-nilai="${m.id}" value="${nilai ?? ''}" style="max-width:90px;text-align:center;${dibawah ? 'color:var(--danger);font-weight:700;' : ''}"></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div id="nAvg" style="margin-top:14px;font-size:.85rem;font-weight:700;">${hitungRata() !== null ? tr(`Rata-rata: ${hitungRata().toFixed(1)}`, `Average: ${hitungRata().toFixed(1)}`) : tr('Belum ada nilai masuk.', 'No grades entered yet.')}</div>`}`;

    $('#nBack', el).onclick = () => { this.nilaiTugasId = null; App.refresh(); };
    $$('[data-nilai]', el).forEach(inp => {
      let debounce;
      inp.oninput = () => {
        clearTimeout(debounce);
        debounce = setTimeout(async () => {
          const muridId = inp.dataset.nilai;
          const val = inp.value === '' ? '' : +inp.value;
          nilaiByMurid[muridId] = val;
          await DB.set('nilaiManual', `${tugas.id}_${muridId}`, { tugasId: tugas.id, muridId, nilai: val });
          const dibawah = tugas.kkm != null && val !== '' && val < +tugas.kkm;
          inp.style.color = dibawah ? 'var(--danger)' : '';
          inp.style.fontWeight = dibawah ? '700' : '';
          const avgEl = $('#nAvg', el);
          const rata = hitungRata();
          if (avgEl) avgEl.textContent = rata !== null ? tr(`Rata-rata: ${rata.toFixed(1)}`, `Average: ${rata.toFixed(1)}`) : tr('Belum ada nilai masuk.', 'No grades entered yet.');
        }, 500);
      };
    });
  },

  /* ============ TAB: JURNAL ============ */

  async renderJurnal(el) {
    const [jurnal, murid, absensi] = await Promise.all([DB.list('jurnalManual'), DB.list('murid'), DB.list('absensiManual')]);
    jurnal.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
    const totalMurid = murid.length;

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="font-size:.88rem;color:var(--text-3);font-weight:600;">${tr('Catat materi & progres mengajarmu tiap pertemuan.', 'Log your teaching material & progress each session.')}</div>
        <button class="btn btn-prod btn-sm" id="addJurnal"><ion-icon name="add"></ion-icon> ${tr('Jurnal Baru', 'New Entry')}</button>
      </div>

      ${jurnal.length ? `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${jurnal.map(j => {
            const hadir = absensi.filter(a => a.tanggal === j.tanggal && a.status === 'h').length;
            return `
            <div class="card" style="padding:14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <div style="font-weight:700;font-size:.92rem;">${esc(j.judul)}</div>
                <div style="display:flex;gap:4px;">
                  <button class="mini-icon-btn" data-edit="${j.id}"><ion-icon name="pencil-outline"></ion-icon></button>
                  <button class="mini-icon-btn danger" data-del="${j.id}"><ion-icon name="trash-outline"></ion-icon></button>
                </div>
              </div>
              <div style="font-size:.78rem;color:var(--text-3);margin:4px 0 8px;">${fmtDate(j.tanggal, { short: true })}${totalMurid ? ` · ${tr(`${hadir}/${totalMurid} hadir`, `${hadir}/${totalMurid} present`)}` : ''}</div>
              ${j.materi ? `<div style="font-size:.85rem;color:var(--text-2);white-space:pre-wrap;">${esc(j.materi)}</div>` : ''}
            </div>`;
          }).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="book-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada jurnal', 'No journal entries yet')}</div>
          <div class="es-sub">${tr('Catat tiap pertemuan mengajarmu di sini 📖', 'Log each teaching session here 📖')}</div>
        </div>`}`;

    $('#addJurnal', el).onclick = () => this._jurnalModal(null);
    $$('[data-edit]', el).forEach(b => b.onclick = () => this._jurnalModal(jurnal.find(j => j.id === b.dataset.edit)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus jurnal ini?', 'Delete this journal entry?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      await DB.remove('jurnalManual', b.dataset.del);
      toast(tr('Jurnal dihapus.', 'Entry deleted.'));
      App.refresh();
    });
  },

  _jurnalModal(jurnal) {
    openModal({
      title: jurnal ? tr('Ubah Jurnal', 'Edit Entry') : tr('Jurnal Baru', 'New Entry'),
      body: `
        <div class="field">
          <label>${tr('Tanggal', 'Date')}</label>
          <input type="date" class="input" id="mTanggal" value="${jurnal?.tanggal || todayStr()}">
        </div>
        <div class="field">
          <label>${tr('Judul', 'Title')}</label>
          <input type="text" class="input" id="mJudul" placeholder="${tr('mis. Pertemuan 5 - Aljabar', 'e.g. Session 5 - Algebra')}" value="${esc(jurnal?.judul || '')}">
        </div>
        <div class="field">
          <label>${tr('Materi/Catatan', 'Material/Notes')}</label>
          <textarea class="textarea" id="mMateri" placeholder="${tr('Apa yang diajarkan hari ini...', 'What was taught today...')}">${esc(jurnal?.materi || '')}</textarea>
        </div>
        <div style="display:flex;gap:10px;">
          ${jurnal ? '<button class="btn btn-soft-danger" id="mDel"><ion-icon name="trash-outline"></ion-icon></button>' : ''}
          <button class="btn btn-prod btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>
        </div>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const judul = $('#mJudul', m).value.trim();
          if (!judul) return toast(tr('Isi judul jurnal.', 'Enter entry title.'), 'warning');
          const data = { tanggal: $('#mTanggal', m).value || todayStr(), judul, materi: $('#mMateri', m).value.trim() };
          if (jurnal) await DB.update('jurnalManual', jurnal.id, data);
          else await DB.add('jurnalManual', data);
          closeModal();
          toast(tr('Jurnal tersimpan.', 'Entry saved.'));
          App.refresh();
        };
        const del = $('#mDel', m);
        if (del) del.onclick = async () => {
          if (!await confirmDialog(tr('Hapus jurnal ini?', 'Delete this entry?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
          await DB.remove('jurnalManual', jurnal.id);
          closeModal();
          toast(tr('Jurnal dihapus.', 'Entry deleted.'));
          App.refresh();
        };
      }
    });
  }
};
