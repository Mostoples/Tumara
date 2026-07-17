/* ============================================================
   TUMARA — Produktivitas (Tugas · Catatan · Kebiasaan · Jadwal · Fokus)
   Kini masing-masing halaman nav tersendiri — lihat js/app.js.
   ============================================================ */

const Prod = {
  taskFilter: 'aktif',
  detailTaskId: null,   // tugas yang sedang dibuka di halaman detail (sisi siswa)
  _TASK_DKEY: 'tumara_siswa_task_detail',   // agar detail tugas tahan refresh
  noteQuery: '',
  selectedDay: new Date().getDay(), // 0=Minggu

  // Tugas/Catatan/Kebiasaan/Jadwal/Fokus masing-masing halaman nav
  // tersendiri (lihat js/app.js) — dibedakan langsung lewat App.route,
  // jadi tak ada lagi tab-bar internal yang menggabungkannya dalam satu halaman.
  async render(el) {
    el.innerHTML = `<div id="prodBody"></div>`;

    const body = $('#prodBody', el);
    if (App.route === 'tugas') await this.renderTasks(body);
    else if (App.route === 'catatan') await this.renderNotes(body);
    else if (App.route === 'kebiasaan') await this.renderHabits(body);
    else if (App.route === 'jadwal') await this.renderSchedule(body);
    else this.renderPomo(body);
  },

  /* ============ TAB: HABIT TRACKER ============ */

  async renderHabits(el) {
    const [habits, logs] = await Promise.all([DB.list('habits'), DB.list('habit_logs')]);
    const doneSet = new Set(logs.map(l => l.habitId + '|' + l.tanggal));

    // 7 hari terakhir (kolom), hari ini di paling kanan
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(todayStr(d)); }

    const streakOf = (habitId) => {
      let s = 0;
      for (let i = 0; ; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (doneSet.has(habitId + '|' + todayStr(d))) s++; else break; }
      return s;
    };

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="font-size:.88rem;color:var(--text-3);font-weight:600;">${tr('Bangun rutinitas positif — centang tiap hari 🔥', 'Build positive routines — check off each day 🔥')}</div>
        <button class="btn btn-prod btn-sm" id="addHabit"><ion-icon name="add"></ion-icon> ${tr('Kebiasaan Baru', 'New Habit')}</button>
      </div>

      ${habits.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th class="sticky-col" style="min-width:150px;">${tr('Kebiasaan', 'Habit')}</th>
              ${days.map(d => { const dt = parseDate(d); const today = d === todayStr(); return `<th class="center" style="min-width:42px;${today ? 'color:var(--prod);' : ''}">${HARI[dt.getDay()].slice(0, 1)}<br><span style="font-size:.7rem;font-weight:600;">${dt.getDate()}</span></th>`; }).join('')}
              <th class="center">🔥</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${habits.map(h => `
                <tr>
                  <td class="sticky-col"><b>${h.emoji || '⭐'} ${esc(h.nama)}</b></td>
                  ${days.map(d => { const on = doneSet.has(h.id + '|' + d); return `<td class="center"><button class="habit-dot ${on ? 'on' : ''}" data-hb="${h.id}" data-d="${d}">${on ? '✓' : ''}</button></td>`; }).join('')}
                  <td class="center"><b>${streakOf(h.id)}</b></td>
                  <td class="center"><button class="mini-icon-btn danger" data-delh="${h.id}"><ion-icon name="trash-outline"></ion-icon></button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="repeat-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada kebiasaan', 'No habits yet')}</div>
          <div class="es-sub">${tr('Mulai kecil: minum air, baca buku, olahraga 10 menit 🌱', 'Start small: drink water, read a book, exercise 10 min 🌱')}</div>
        </div>`}`;

    $('#addHabit', el).onclick = () => this._habitModal();
    $$('[data-hb]', el).forEach(b => b.onclick = async () => {
      const habitId = b.dataset.hb, tanggal = b.dataset.d, key = habitId + '|' + tanggal;
      const existing = logs.find(l => l.habitId === habitId && l.tanggal === tanggal);
      if (existing) await DB.remove('habit_logs', existing.id);
      else await DB.add('habit_logs', { habitId, tanggal });
      App.refresh();
    });
    $$('[data-delh]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus kebiasaan ini beserta riwayatnya?', 'Delete this habit and its history?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      const hid = b.dataset.delh;
      await DB.remove('habits', hid);
      await Promise.all(logs.filter(l => l.habitId === hid).map(l => DB.remove('habit_logs', l.id)));
      toast(tr('Kebiasaan dihapus.', 'Habit deleted.'));
      App.refresh();
    });
  },

  // Ikon populer (tampil di awal) + koleksi lengkap (muncul saat "lebih banyak").
  HABIT_EMOJI_POPULER: ['💧', '📚', '🏃', '🧘', '🥗', '😴', '✍️', '🙏', '🎯', '💪', '🌙'],
  HABIT_EMOJI_SEMUA: [
    // Kesehatan & tubuh
    '💧', '🥗', '🍎', '🥦', '🏃', '🚴', '🏊', '🧘', '💪', '🚶', '😴', '🌙', '☀️', '🦷', '💊', '🚭', '🚰', '🧴',
    // Belajar & kerja
    '📚', '📖', '✍️', '📝', '📓', '🧠', '💻', '🔬', '🎓', '🖊️', '📅', '⏰', '🗂️', '🔖',
    // Spiritual & pikiran
    '🙏', '🕌', '📿', '❤️', '🌱', '😊', '🧎', '☪️',
    // Olahraga & hobi
    '⚽', '🏀', '🎸', '🎨', '🎹', '📷', '♟️', '🎮', '🧗', '🎵',
    // Rumah & rutinitas
    '🧹', '🛏️', '🧺', '🌿', '♻️', '🐾', '💵', '🍵', '☕',
    // Umum
    '🎯', '🔥', '⭐', '✅', '🏆'
  ],

  _habitModal() {
    let emoji = '🎯';
    let expanded = false;

    // Gambar ulang daftar ikon sesuai status "lebih banyak" & ikon terpilih.
    const renderPicker = (m) => {
      const box = $('#mEmoji', m);
      // Saat ringkas, pastikan ikon terpilih tetap terlihat walau di luar daftar populer.
      const list = expanded
        ? this.HABIT_EMOJI_SEMUA
        : [...new Set([emoji, ...this.HABIT_EMOJI_POPULER])];
      box.style.maxHeight = expanded ? '190px' : 'none';
      box.style.overflowY = expanded ? 'auto' : 'visible';
      box.innerHTML =
        list.map(e => `<button type="button" class="emoji-pick ${e === emoji ? 'sel' : ''}" data-e="${e}">${e}</button>`).join('')
        + `<button type="button" class="emoji-pick" id="mEmojiMore" title="${expanded ? tr('Lebih sedikit', 'Show less') : tr('Lebih banyak ikon', 'More icons')}" style="display:inline-flex;align-items:center;justify-content:center;color:var(--prod);">
             <ion-icon name="${expanded ? 'chevron-up' : 'ellipsis-horizontal'}"></ion-icon>
           </button>`;

      $$('.emoji-pick', box).forEach(b => {
        if (b.id === 'mEmojiMore') {
          b.onclick = () => { expanded = !expanded; renderPicker(m); };
          return;
        }
        b.onclick = () => {
          emoji = b.dataset.e;
          $$('.emoji-pick', box).forEach(x => x.classList.toggle('sel', x.dataset.e === emoji));
        };
      });
    };

    openModal({
      title: tr('Kebiasaan Baru', 'New Habit'),
      body: `
        <div class="field">
          <label>${tr('Nama kebiasaan', 'Habit name')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('mis. Minum 8 gelas air', 'e.g. Drink 8 glasses of water')}">
        </div>
        <div class="field">
          <label>${tr('Ikon', 'Icon')}</label>
          <div id="mEmoji" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
        </div>
        <button class="btn btn-prod btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Tambah Kebiasaan', 'Add Habit')}</button>`,
      onMount: m => {
        renderPicker(m);
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (!nama) return toast(tr('Isi nama kebiasaan.', 'Enter a habit name.'), 'warning');
          await DB.add('habits', { nama, emoji });
          closeModal();
          toast(tr('Kebiasaan ditambahkan 🔥', 'Habit added 🔥'));
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: TUGAS ============ */

  // Empty-state bila siswa belum mengatur kelasnya (kelasId) — tugas & jadwal
  // datang dari kelas, jadi butuh kelas dulu.
  _needKelas() {
    return `<div class="card empty-state">
      <ion-icon name="school-outline"></ion-icon>
      <div class="es-title">${tr('Kelasmu belum diatur', 'Your class is not set')}</div>
      <div class="es-sub">${tr('Atur kelas & NIS di menu Profil agar bisa menerima tugas & jadwal dari guru.', 'Set your class & NIS in Profile to receive tasks & schedule from your teachers.')}</div>
      <button class="btn btn-prod btn-sm" id="goProfil" style="margin-top:14px;"><ion-icon name="person-outline"></ion-icon> ${tr('Ke Profil', 'Go to Profile')}</button>
    </div>`;
  },
  _bindNeedKelas(el) {
    const b = $('#goProfil', el);
    if (b) b.onclick = () => App.navigate('profile');
  },

  // Tugas kini DIKIRIM GURU (koleksi class_tasks per kelas). Siswa hanya
  // menerima & boleh mencentang selesai (progres pribadi di profil.tugasSelesai).
  async renderTasks(el) {
    const kelasId = DB.user?.kelasId;
    if (!kelasId) { el.innerHTML = this._needKelas(); this._bindNeedKelas(el); return; }

    // Yang krusial di atas: prioritas dulu (P1 → P3), lalu tenggat terdekat.
    const tasks = (await DB.gListWhere('class_tasks', 'classId', kelasId))
      .sort((a, b) => prioUrut(a.prioritas) - prioUrut(b.prioritas)
                   || (a.tenggat || '9999-99-99').localeCompare(b.tenggat || '9999-99-99'));
    const done = new Set(DB.user?.tugasSelesai || []);
    const isDone = t => done.has(t.id);
    // Pengumpulanku (sekali baca, di-cache) → peta taskId → submission.
    const mySubs = await DB.gListWhere('class_submissions', 'studentId', DB.user.id);
    const subByTask = {};
    mySubs.forEach(s => { subByTask[s.taskId] = s; });

    // Halaman DETAIL tugas (bukan modal). Pulihkan dari localStorage agar
    // refresh tetap di detail, bukan balik ke daftar.
    if (!this.detailTaskId) this.detailTaskId = localStorage.getItem(this._TASK_DKEY) || null;
    if (this.detailTaskId) {
      const dt = tasks.find(x => x.id === this.detailTaskId);
      if (dt) return this._renderTaskDetail(el, dt, subByTask[dt.id] || null, isDone(dt));
      this.detailTaskId = null; localStorage.removeItem(this._TASK_DKEY);   // tugas sudah tak ada
    }

    let shown = tasks;
    if (this.taskFilter === 'aktif') shown = tasks.filter(t => !isDone(t));
    else if (this.taskFilter === 'selesai') shown = tasks.filter(t => isDone(t));

    const doneCount = tasks.filter(isDone).length;
    const filterLabel = { aktif: tr('Aktif', 'Active'), selesai: tr('Selesai', 'Done'), semua: tr('Semua', 'All') };

    el.innerHTML = `
      <div style="font-size:.82rem;color:var(--text-3);margin-bottom:12px;"><ion-icon name="school-outline" style="vertical-align:-2px;"></ion-icon> ${tr('Tugas dari gurumu — centang bila sudah selesai.', 'Tasks from your teachers — check them off when done.')}</div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
        ${['aktif', 'selesai', 'semua'].map(f => `
          <button class="chip ${this.taskFilter === f ? 'active' : ''}" data-filter="${f}">
            ${filterLabel[f]}${f === 'selesai' && doneCount ? ` (${doneCount})` : ''}
          </button>`).join('')}
      </div>

      ${shown.length ? `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${shown.map(t => { const sub = subByTask[t.id]; return `
            <div class="list-item">
              <button class="task-check ${isDone(t) ? 'done' : ''}" data-toggle="${t.id}"><ion-icon name="checkmark"></ion-icon></button>
              <div style="flex:1;min-width:0;">
                <div data-detail="${t.id}" style="cursor:pointer;">
                  <div style="font-weight:700;font-size:.92rem;" class="${isDone(t) ? 'task-title-done' : ''}">${esc(t.judul)}</div>
                  <div style="display:flex;gap:8px;align-items:center;margin-top:4px;flex-wrap:wrap;">
                    ${t.mapel ? `<span class="badge badge-purple">${esc(t.mapel)}</span>` : ''}
                    ${t.tenggat && !isDone(t) ? deadlineBadge(t.tenggat) : t.tenggat ? `<span class="badge badge-gray">${fmtDate(t.tenggat, { short: true })}</span>` : ''}
                    ${prioBadge(t.prioritas)}
                    ${t.guruNama ? `<span class="badge badge-gray"><ion-icon name="person-outline"></ion-icon> ${esc(t.guruNama)}</span>` : ''}
                    ${taskAttachments(t).length ? `<span class="badge badge-gray"><ion-icon name="attach-outline"></ion-icon> ${tr('Lampiran', 'Attachment')}</span>` : ''}
                    ${sub ? `<span class="badge badge-green"><ion-icon name="checkmark-done-outline"></ion-icon> ${tr('Terkumpul', 'Submitted')}</span>` : ''}
                  </div>
                  <div style="font-size:.72rem;color:var(--brand);margin-top:5px;font-weight:600;"><ion-icon name="eye-outline" style="vertical-align:-2px;"></ion-icon> ${tr('Ketuk untuk detail', 'Tap for detail')}</div>
                </div>
                <div style="margin-top:8px;">
                  <button class="btn btn-sm ${sub ? 'btn-ghost' : 'btn-primary'}" data-kumpul="${t.id}">
                    <ion-icon name="${sub ? 'checkmark-done-outline' : 'cloud-upload-outline'}"></ion-icon>
                    ${sub ? tr('Terkumpul — ubah', 'Submitted — change') : tr('Kumpulkan', 'Submit')}
                  </button>
                </div>
              </div>
            </div>`; }).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="${this.taskFilter === 'selesai' ? 'trophy-outline' : 'checkbox-outline'}"></ion-icon>
          <div class="es-title">${this.taskFilter === 'selesai' ? tr('Belum ada tugas selesai', 'No finished tasks yet') : tr('Belum ada tugas dari guru', 'No tasks from teachers yet')}</div>
          <div class="es-sub">${tr('Tugas yang dikirim gurumu akan muncul di sini 📚', 'Tasks sent by your teachers will appear here 📚')}</div>
        </div>`}`;

    $$('[data-filter]', el).forEach(c => c.onclick = () => { this.taskFilter = c.dataset.filter; App.refresh(); });
    $$('[data-toggle]', el).forEach(b => b.onclick = async () => {
      const id = b.dataset.toggle;
      const set = new Set(DB.user?.tugasSelesai || []);
      if (set.has(id)) set.delete(id);
      else { set.add(id); toast(tr('Tugas selesai — mantap! 🎉', 'Task done — nice work! 🎉')); }
      await DB.updateUser({ tugasSelesai: [...set] });
      App.refresh();
    });
    $$('[data-kumpul]', el).forEach(b => b.onclick = () => {
      const t = tasks.find(x => x.id === b.dataset.kumpul);
      this.kumpulModal(t, subByTask[t.id] || null);
    });
    $$('[data-detail]', el).forEach(b => b.onclick = () => { this.detailTaskId = b.dataset.detail; localStorage.setItem(this._TASK_DKEY, this.detailTaskId); App.refresh(); });
    $$('[data-viewsrc]', el).forEach(im => im.onclick = () => openImageViewer(im.dataset.viewsrc));
  },

  // Halaman siswa: detail tugas (deskripsi, lampiran zoomable, status kumpul,
  // toggle selesai). Dibuka dengan mengetuk item; keluar via tombol Kembali.
  _renderTaskDetail(el, t, sub, done) {
    const atts = taskAttachments(t);
    const subFiles = submissionFiles(sub);
    const infoBadges = [
      t.mapel ? `<span class="badge badge-purple">${esc(t.mapel)}</span>` : '',
      t.tenggat && !done ? deadlineBadge(t.tenggat) : (t.tenggat ? `<span class="badge badge-gray">${fmtDate(t.tenggat, { short: true })}</span>` : ''),
      prioBadge(t.prioritas),
      t.guruNama ? `<span class="badge badge-gray"><ion-icon name="person-outline"></ion-icon> ${esc(t.guruNama)}</span>` : '',
    ].join('');

    el.innerHTML = `
      <div style="margin-bottom:14px;">
        <button class="btn btn-sm" id="tBackTask"><ion-icon name="arrow-back-outline"></ion-icon> ${tr('Kembali', 'Back')}</button>
      </div>

      <div style="font-weight:800;font-size:1.2rem;margin-bottom:6px;">${esc(t.judul)}</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px;">${infoBadges}</div>

      ${t.deskripsi ? `<div style="white-space:pre-wrap;font-size:.92rem;color:var(--text-2);line-height:1.6;margin-bottom:18px;">${esc(t.deskripsi)}</div>` : ''}

      ${atts.length ? `
        <div style="font-size:.78rem;color:var(--text-3);margin-bottom:6px;font-weight:600;">${tr('Lampiran dari guru', 'Attachment from teacher')} (${atts.length})</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
          ${atts.map(a => a.isPdf
            ? `<a href="${esc(a.url)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm btn-block"><ion-icon name="document-text-outline"></ion-icon> ${esc(a.name || 'PDF')}</a>`
            : `<img src="${esc(a.url)}" data-viewsrc="${esc(a.url)}" style="max-height:220px;max-width:100%;width:auto;height:auto;align-self:flex-start;object-fit:contain;border-radius:10px;border:1px solid var(--border);cursor:zoom-in;display:block;">`).join('')}
        </div>` : ''}

      <div style="border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px;">
        <div style="font-weight:700;font-size:.95rem;margin-bottom:10px;"><ion-icon name="cloud-upload-outline" style="vertical-align:-2px;"></ion-icon> ${tr('Pengumpulanmu', 'Your submission')}</div>
        ${sub ? `
          <div style="display:flex;align-items:center;gap:8px;font-size:.82rem;color:var(--text-2);margin-bottom:10px;">
            <span class="badge badge-green"><ion-icon name="checkmark-done-outline"></ion-icon> ${tr('Terkumpul', 'Submitted')}</span>
            <span style="color:var(--text-3);">${tr(`${subFiles.length} file`, `${subFiles.length} file(s)`)}${sub.submittedAt ? ' · ' + fmtDate(sub.submittedAt, { short: true }) : ''}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px;">
            ${subFiles.map(f => f.isPdf
              ? `<a href="${esc(f.url)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm btn-block"><ion-icon name="document-text-outline"></ion-icon> ${esc(f.name || 'PDF')}</a>`
              : `<img src="${esc(f.url)}" data-viewsrc="${esc(f.url)}" style="width:100%;max-height:260px;object-fit:contain;border-radius:8px;background:var(--bg-2);cursor:zoom-in;display:block;">`).join('')}
          </div>
          <button class="btn btn-sm btn-block" id="dKumpul"><ion-icon name="create-outline"></ion-icon> ${tr('Ubah pengumpulan', 'Change submission')}</button>
        ` : `
          <div style="font-size:.82rem;color:var(--text-3);margin-bottom:10px;">${tr('Kamu belum mengumpulkan tugas ini.', "You haven't submitted this task yet.")}</div>
          <button class="btn btn-sm btn-primary btn-block" id="dKumpul"><ion-icon name="cloud-upload-outline"></ion-icon> ${tr('Kumpulkan', 'Submit')}</button>`}
      </div>

      <button class="btn btn-block ${done ? 'btn-ghost' : ''}" id="dDone">
        <ion-icon name="${done ? 'checkmark-circle' : 'ellipse-outline'}"></ion-icon>
        ${done ? tr('Selesai — ketuk untuk batalkan', 'Done — tap to undo') : tr('Tandai selesai', 'Mark as done')}
      </button>`;

    $('#tBackTask', el).onclick = () => { this.detailTaskId = null; localStorage.removeItem(this._TASK_DKEY); App.refresh(); };
    $$('[data-viewsrc]', el).forEach(im => im.onclick = () => openImageViewer(im.dataset.viewsrc));
    $('#dKumpul', el).onclick = () => this.kumpulModal(t, sub);
    $('#dDone', el).onclick = async () => {
      const set = new Set(DB.user?.tugasSelesai || []);
      if (set.has(t.id)) set.delete(t.id);
      else { set.add(t.id); toast(tr('Tugas selesai — mantap! 🎉', 'Task done — nice work! 🎉')); }
      await DB.updateUser({ tugasSelesai: [...set] });
      App.refresh();
    };
  },

  // Modal siswa: kumpulkan/ubah pengumpulan tugas — BANYAK file (foto berhalaman
  // dan/atau PDF) → Drive. Satu dokumen per (tugas, siswa); id tetap agar ubah = timpa.
  kumpulModal(task, sub) {
    if (!Storage?.ready?.()) return toast(tr('Penyimpanan belum siap. Coba muat ulang halaman.', 'Storage not ready. Please reload the page.'), 'error');
    const subId = `${task.id}_${DB.user.id}`;
    let files = submissionFiles(sub).slice();            // {url,name,type,isPdf}[]
    const origUrls = new Set(files.map(f => f.url));      // untuk dibersihkan saat SIMPAN
    openModal({
      title: tr('Kumpulkan Tugas', 'Submit Task'),
      body: `
        <div style="font-weight:700;margin-bottom:4px;">${esc(task.judul)}</div>
        <div style="font-size:.8rem;color:var(--text-3);margin-bottom:14px;">${tr('Unggah foto (bisa banyak halaman) dan/atau PDF. Tambahkan sebanyak yang perlu.', 'Upload photos (multiple pages allowed) and/or PDFs. Add as many as you need.')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <label class="btn btn-ghost btn-sm" style="cursor:pointer;"><ion-icon name="image-outline"></ion-icon> ${tr('Foto', 'Photos')}
            <input type="file" accept="image/*" multiple id="kFoto" hidden></label>
          <label class="btn btn-ghost btn-sm" style="cursor:pointer;"><ion-icon name="camera-outline"></ion-icon> ${tr('Kamera', 'Camera')}
            <input type="file" accept="image/*" capture="environment" id="kKamera" hidden></label>
          <label class="btn btn-ghost btn-sm" style="cursor:pointer;"><ion-icon name="document-text-outline"></ion-icon> PDF
            <input type="file" accept="application/pdf" multiple id="kPdf" hidden></label>
        </div>
        <div id="kStatus" style="font-size:.78rem;color:var(--text-3);margin-top:8px;"></div>
        <div id="kList" style="margin-top:8px;display:flex;flex-direction:column;gap:8px;"></div>
        <button class="btn btn-primary btn-block" id="kSave" style="margin-top:14px;"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan Pengumpulan', 'Save Submission')}</button>
        ${sub ? `<button class="btn btn-ghost btn-block danger" id="kHapus" style="margin-top:8px;"><ion-icon name="trash-outline"></ion-icon> ${tr('Batalkan pengumpulan', 'Withdraw submission')}</button>` : ''}`,
      onMount: m => {
        const listEl = $('#kList', m);
        const statusEl = $('#kStatus', m);
        const save = $('#kSave', m);
        const syncSave = () => { save.disabled = !files.length; };
        const renderList = () => {
          listEl.innerHTML = files.map((f, i) => `
            <div style="display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:10px;padding:6px 8px;">
              ${f.isPdf
                ? `<ion-icon name="document-text-outline" style="font-size:1.5rem;color:var(--prod);flex-shrink:0;"></ion-icon>`
                : `<img src="${esc(f.url)}" data-viewsrc="${esc(f.url)}" style="width:42px;height:42px;object-fit:cover;border-radius:6px;cursor:zoom-in;flex-shrink:0;">`}
              <span style="flex:1;min-width:0;font-size:.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(f.name || (f.isPdf ? 'PDF' : 'Foto'))}</span>
              <button type="button" class="mini-icon-btn danger" data-rm="${i}"><ion-icon name="close"></ion-icon></button>
            </div>`).join('');
          listEl.querySelectorAll('[data-viewsrc]').forEach(im => im.onclick = () => openImageViewer(im.dataset.viewsrc));
          listEl.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
            const idx = +b.dataset.rm, f = files[idx];
            if (f && !origUrls.has(f.url)) Storage.deleteByUrl(f.url);   // buang unggahan sementara
            files.splice(idx, 1);
            renderList(); syncSave();
          });
          syncSave();
        };
        renderList();

        const onPick = async e => {
          const picked = [...e.target.files];
          e.target.value = '';
          if (!picked.length) return;
          save.disabled = true;
          let n = 0;
          for (const f of picked) {
            statusEl.textContent = tr(`Mengunggah ${n + 1}/${picked.length}…`, `Uploading ${n + 1}/${picked.length}…`);
            try { files.push(await Storage.uploadFile(f, 'pengumpulan')); }
            catch (err) { toast(tr('Gagal mengunggah: ', 'Upload failed: ') + (err.message || ''), 'error'); }
            n++; renderList();
          }
          statusEl.textContent = '';
          syncSave();
        };
        $('#kFoto', m).onchange = onPick;
        $('#kKamera', m).onchange = onPick;
        $('#kPdf', m).onchange = onPick;
        save.onclick = async () => {
          if (!files.length) return toast(tr('Tambahkan minimal satu file.', 'Add at least one file.'), 'warning');
          save.disabled = true;
          try {
            await DB.gUpdate('class_submissions', subId, {
              taskId: task.id, classId: task.classId, studentId: DB.user.id,
              studentNama: DB.user.nama || DB.user.username || '',
              files, url: '', submittedAt: new Date().toISOString(),
            });
            // Bersihkan file lama yang dibuang.
            const finalUrls = new Set(files.map(f => f.url));
            origUrls.forEach(u => { if (!finalUrls.has(u)) Storage.deleteByUrl(u); });
            // Mengumpulkan otomatis menandai tugas selesai (tetap bisa dibatalkan manual).
            const set = new Set(DB.user?.tugasSelesai || []);
            if (!set.has(task.id)) { set.add(task.id); await DB.updateUser({ tugasSelesai: [...set] }); }
            closeModal();
            toast(tr('Tugas terkumpul ✅', 'Task submitted ✅'));
            App.refresh();
          } catch (e) { save.disabled = false; toast(e.message, 'error'); }
        };
        const hapus = $('#kHapus', m);
        if (hapus) hapus.onclick = async () => {
          if (!await confirmDialog(tr('Batalkan pengumpulan tugas ini?', 'Withdraw this submission?'), { danger: true, okText: tr('Batalkan', 'Withdraw') })) return;
          try {
            await DB.gRemove('class_submissions', subId);
            submissionFiles(sub).forEach(f => f.url && Storage.deleteByUrl(f.url));
            closeModal();
            toast(tr('Pengumpulan dibatalkan.', 'Submission withdrawn.'));
            App.refresh();
          } catch (e) { toast(e.message, 'error'); }
        };
      }
    });
  },

  openTaskModal(task = null) {
    openModal({
      title: task ? tr('Ubah Tugas', 'Edit Task') : tr('Tugas Baru', 'New Task'),
      body: `
        <div class="field">
          <label>${tr('Judul tugas', 'Task title')}</label>
          <input type="text" class="input" id="mJudul" placeholder="${tr('mis. Kerjakan LKS Matematika hal. 42', 'e.g. Do the math workbook p. 42')}" value="${esc(task?.judul || '')}">
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>${tr('Mata pelajaran', 'Subject')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
            <input type="text" class="input" id="mMapel" placeholder="${tr('mis. Matematika', 'e.g. Math')}" value="${esc(task?.mapel || '')}">
          </div>
          <div class="field">
            <label>${tr('Label/Tag', 'Label/Tag')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
            <input type="text" class="input" id="mLabel" placeholder="${tr('mis. Pribadi, Sekolah', 'e.g. Personal, School')}" value="${esc(task?.label || '')}">
          </div>
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>${tr('Tenggat', 'Due date')}</label>
            <input type="date" class="input" id="mTenggat" value="${task?.tenggat || ''}">
          </div>
          <div class="field">
            <label>${tr('Prioritas', 'Priority')}</label>
            <select class="select" id="mPrioritas">
              ${['tinggi', 'sedang', 'rendah'].map(p => `<option value="${p}" ${prioKey(task?.prioritas) === p ? 'selected' : ''}>${PRIORITAS[p].kode} · ${PRIORITAS[p].nama()}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label>${tr('Ulangi (tugas berulang)', 'Repeat (recurring task)')}</label>
          <select class="select" id="mUlang">
            ${[['tidak', tr('Tidak berulang', 'Does not repeat')], ['harian', tr('Setiap hari', 'Daily')], ['mingguan', tr('Setiap minggu', 'Weekly')], ['bulanan', tr('Setiap bulan', 'Monthly')]].map(([v, l]) => `<option value="${v}" ${(task?.ulang || 'tidak') === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-prod btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${task ? tr('Simpan Perubahan', 'Save Changes') : tr('Tambah Tugas', 'Add Task')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const judul = $('#mJudul', m).value.trim();
          if (!judul) return toast(tr('Judul tugas tidak boleh kosong.', 'Task title can\'t be empty.'), 'warning');
          const data = {
            judul, mapel: $('#mMapel', m).value.trim(),
            label: $('#mLabel', m).value.trim(),
            tenggat: $('#mTenggat', m).value,
            prioritas: $('#mPrioritas', m).value,
            ulang: $('#mUlang', m).value
          };
          if (task) await DB.update('tasks', task.id, data);
          else await DB.add('tasks', { ...data, status: 'aktif' });
          closeModal();
          toast(task ? tr('Tugas diperbarui.', 'Task updated.') : tr('Tugas ditambahkan 📌', 'Task added 📌'));
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: CATATAN ============ */

  async renderNotes(el) {
    const all = (await DB.list('notes')).sort((a, b) => (b.diubah || '') < (a.diubah || '') ? -1 : 1);
    const q = this.noteQuery.toLowerCase();
    const notes = q ? all.filter(n =>
      (n.judul || '').toLowerCase().includes(q) ||
      (n.isi || '').toLowerCase().includes(q) ||
      (n.label || '').toLowerCase().includes(q)) : all;

    el.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        <div class="input-group" style="flex:1;min-width:200px;">
          <input type="text" class="input" id="noteSearch" placeholder="Cari catatan…" value="${esc(this.noteQuery)}">
          <button class="suffix-btn"><ion-icon name="search-outline"></ion-icon></button>
        </div>
        <button class="btn btn-prod" id="addNote"><ion-icon name="add"></ion-icon> Catatan Baru</button>
      </div>

      ${notes.length ? `
        <div class="grid grid-3">
          ${notes.map(n => `
            <div class="card note-card hoverable" data-open="${n.id}">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
                <div style="font-weight:800;font-size:.95rem;">${esc(n.judul) || '<i>Tanpa judul</i>'}</div>
                ${n.label ? `<span class="badge badge-purple">${esc(n.label)}</span>` : ''}
              </div>
              <div class="nc-body">${esc(n.isi)}</div>
              <div class="nc-date">Diubah ${fmtDate((n.diubah || '').slice(0, 10), { short: true })}</div>
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="document-text-outline"></ion-icon>
          <div class="es-title">${q ? 'Tidak ada catatan yang cocok' : 'Belum ada catatan'}</div>
          <div class="es-sub">${q ? 'Coba kata kunci lain' : 'Tulis ide, rangkuman pelajaran, atau apa pun ✍️'}</div>
        </div>`}`;

    let debounce;
    $('#noteSearch', el).oninput = e => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { this.noteQuery = e.target.value; this.renderNotes(el); }, 250);
    };
    $('#addNote', el).onclick = () => this._noteModal();
    $$('[data-open]', el).forEach(c => c.onclick = () => this._noteModal(all.find(n => n.id === c.dataset.open)));
  },

  _noteModal(note = null) {
    openModal({
      title: note ? 'Ubah Catatan' : 'Catatan Baru',
      body: `
        <div class="field">
          <label>Judul</label>
          <input type="text" class="input" id="mJudul" placeholder="Judul catatan" value="${esc(note?.judul || '')}">
        </div>
        <div class="field">
          <label>Label <span style="font-weight:500;color:var(--text-3)">(opsional)</span></label>
          <input type="text" class="input" id="mLabel" placeholder="mis. Biologi, Pribadi, Ide" value="${esc(note?.label || '')}">
        </div>
        <div class="field">
          <label>Isi catatan</label>
          <textarea class="textarea" id="mIsi" placeholder="Tulis di sini…">${esc(note?.isi || '')}</textarea>
        </div>
        <div style="display:flex;gap:10px;">
          ${note ? '<button class="btn btn-soft-danger" id="mDel"><ion-icon name="trash-outline"></ion-icon></button>' : ''}
          <button class="btn btn-prod btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> Simpan</button>
        </div>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const judul = $('#mJudul', m).value.trim();
          const isi = $('#mIsi', m).value.trim();
          if (!judul && !isi) return toast('Catatan masih kosong.', 'warning');
          const data = { judul, label: $('#mLabel', m).value.trim(), isi, diubah: new Date().toISOString() };
          if (note) await DB.update('notes', note.id, data);
          else await DB.add('notes', { ...data, dibuat: new Date().toISOString() });
          closeModal();
          toast('Catatan tersimpan ✍️');
          App.refresh();
        };
        const del = $('#mDel', m);
        if (del) del.onclick = async () => {
          if (!await confirmDialog('Hapus catatan ini?', { danger: true, okText: 'Hapus' })) return;
          await DB.remove('notes', note.id);
          toast('Catatan dihapus.');
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: JADWAL ============ */

  // Jadwal kini DIKIRIM WALI KELAS (dokumen class_schedule per kelas).
  // Siswa hanya melihat (read-only).
  async renderSchedule(el) {
    const kelasId = DB.user?.kelasId;
    if (!kelasId) { el.innerHTML = this._needKelas(); this._bindNeedKelas(el); return; }

    const doc = await DB.gGet('class_schedule', kelasId);
    const entries = doc?.entries || [];
    const todayIdx = new Date().getDay();
    const dayItems = entries
      .filter(s => +s.hari === this.selectedDay)
      .sort((a, b) => (a.jamMulai || '') < (b.jamMulai || '') ? -1 : 1);
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];

    el.innerHTML = `
      <div style="font-size:.82rem;color:var(--text-3);margin-bottom:12px;"><ion-icon name="school-outline" style="vertical-align:-2px;"></ion-icon> ${tr('Jadwal kelas dari wali kelasmu.', 'Class schedule from your homeroom teacher.')}${doc?.waliNama ? ` · ${tr('Wali', 'Homeroom')}: ${esc(doc.waliNama)}` : ''}</div>
      <div class="day-selector" style="margin-bottom:16px;">
        ${dayOrder.map(d => `
          <div class="day-pill ${d === this.selectedDay ? 'active' : ''} ${d === todayIdx ? 'today' : ''}" data-day="${d}">
            <div class="dp-name">${HARI[d].slice(0, 3)}</div>
          </div>`).join('')}
      </div>

      <div class="section-head" style="margin-top:4px;">
        <h2>${HARI[this.selectedDay]} ${this.selectedDay === todayIdx ? '<span class="badge badge-purple">Hari ini</span>' : ''}</h2>
      </div>

      ${dayItems.length ? `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${dayItems.map(s => `
            <div class="list-item">
              <div class="item-icon" style="background:var(--prod-soft);color:var(--prod);font-size:.78rem;font-weight:800;flex-direction:column;display:flex;align-items:center;justify-content:center;line-height:1.3;">
                ${esc(s.jamMulai)}<span style="opacity:.6;font-size:.62rem;">${esc(s.jamSelesai)}</span>
              </div>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:.92rem;">${esc(s.mapel)}</div>
                ${s.ruang ? `<div style="font-size:.78rem;color:var(--text-3);"><ion-icon name="location-outline" style="vertical-align:-2px;"></ion-icon> ${esc(s.ruang)}</div>` : ''}
              </div>
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="calendar-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada jadwal', 'No schedule yet')} — ${HARI[this.selectedDay]}</div>
          <div class="es-sub">${tr('Wali kelas belum mengisi jadwal untuk hari ini.', "Your homeroom teacher hasn't set the schedule for this day.")}</div>
        </div>`}`;

    $$('[data-day]', el).forEach(p => p.onclick = () => { this.selectedDay = +p.dataset.day; this.renderSchedule(el); });
  },

  _scheduleModal(item = null) {
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    openModal({
      title: item ? 'Ubah Jadwal' : 'Jadwal Baru',
      body: `
        <div class="field">
          <label>Mata pelajaran / kegiatan</label>
          <input type="text" class="input" id="mMapel" placeholder="mis. Fisika" value="${esc(item?.mapel || '')}">
        </div>
        <div class="field">
          <label>Hari</label>
          <select class="select" id="mHari">
            ${dayOrder.map(d => `<option value="${d}" ${(item ? +item.hari : this.selectedDay) === d ? 'selected' : ''}>${HARI[d]}</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>Jam mulai</label>
            <input type="time" class="input" id="mMulai" value="${item?.jamMulai || '07:00'}">
          </div>
          <div class="field">
            <label>Jam selesai</label>
            <input type="time" class="input" id="mSelesai" value="${item?.jamSelesai || '08:30'}">
          </div>
        </div>
        <div class="field">
          <label>Ruang <span style="font-weight:500;color:var(--text-3)">(opsional)</span></label>
          <input type="text" class="input" id="mRuang" placeholder="mis. Lab IPA / R. 12" value="${esc(item?.ruang || '')}">
        </div>
        <button class="btn btn-prod btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> Simpan</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const mapel = $('#mMapel', m).value.trim();
          const jamMulai = $('#mMulai', m).value, jamSelesai = $('#mSelesai', m).value;
          if (!mapel) return toast('Isi nama pelajaran/kegiatan.', 'warning');
          if (!jamMulai || !jamSelesai) return toast('Isi jam mulai dan selesai.', 'warning');
          if (jamSelesai <= jamMulai) return toast('Jam selesai harus setelah jam mulai.', 'warning');
          const data = { mapel, hari: +$('#mHari', m).value, jamMulai, jamSelesai, ruang: $('#mRuang', m).value.trim() };
          if (item) await DB.update('schedule', item.id, data);
          else await DB.add('schedule', data);
          this.selectedDay = data.hari;
          closeModal();
          toast('Jadwal tersimpan 📅');
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: FOKUS (POMODORO) ============ */

  pomo: {
    mode: 'fokus',        // 'fokus' | 'istirahat'
    focusMin: 25,
    breakMin: 5,
    remaining: 25 * 60,
    running: false,
    timerId: null
  },

  renderPomo(el) {
    const p = this.pomo;
    // Muat preferensi durasi dari profil akun (sekali per sesi)
    if (!p.loaded) {
      p.loaded = true;
      const u = DB.user || {};
      if (u.pomoFokus) p.focusMin = u.pomoFokus;
      if (u.pomoIstirahat) p.breakMin = u.pomoIstirahat;
      if (!p.running) p.remaining = (p.mode === 'fokus' ? p.focusMin : p.breakMin) * 60;
    }
    const total = (p.mode === 'fokus' ? p.focusMin : p.breakMin) * 60;
    const pct = total ? ((total - p.remaining) / total) * 100 : 0;
    const isFokus = p.mode === 'fokus';

    DB.list('pomodoro').then(sessions => {
      const todaySes = sessions.filter(s => s.tanggal === todayStr());
      const menit = todaySes.reduce((s, x) => s + x.menit, 0);
      const stat = $('#pomoStats');
      if (stat) stat.innerHTML = `
        <span class="badge badge-purple">🍅 ${todaySes.length} sesi hari ini</span>
        <span class="badge badge-green">⏱️ ${menit} menit fokus</span>`;
    });

    el.innerHTML = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card" style="text-align:center;">
          <div class="card-title" style="justify-content:center;"><ion-icon name="timer" style="color:${isFokus ? 'var(--danger)' : 'var(--brand)'}"></ion-icon>Timer Fokus</div>
          <div class="pomo-ring">
            ${ringSVG(pct, { size: 250, stroke: 13, color: isFokus ? '#ef4444' : '#10b981', track: 'var(--surface-3)' })}
            <div class="pomo-center">
              <div class="pomo-mode">${isFokus ? '🎯 Waktu Fokus' : '☕ Istirahat'}</div>
              <div class="pomo-time" id="pomoTime">${this._fmtTime(p.remaining)}</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:10px;">
            <button class="btn ${p.running ? '' : (isFokus ? 'btn-danger' : 'btn-primary')} btn-lg" id="pomoToggle">
              <ion-icon name="${p.running ? 'pause' : 'play'}"></ion-icon> ${p.running ? 'Jeda' : 'Mulai'}
            </button>
            <button class="btn btn-lg" id="pomoReset"><ion-icon name="refresh"></ion-icon></button>
            <button class="btn btn-lg" id="pomoSkip" title="Lewati ke sesi berikutnya"><ion-icon name="play-skip-forward"></ion-icon></button>
          </div>
          <div id="pomoStats" style="display:flex;gap:8px;justify-content:center;margin-top:18px;"></div>
        </div>

        <div class="card">
          <div class="card-title"><ion-icon name="options" style="color:var(--prod)"></ion-icon>Pengaturan</div>
          <div class="grid grid-2 keep-2" style="gap:12px;margin-top:16px;">
            <div class="field">
              <label>Durasi fokus</label>
              <select class="select" id="pomoFocusMin" ${p.running ? 'disabled' : ''}>
                ${[15, 20, 25, 30, 45, 50].map(m => `<option value="${m}" ${p.focusMin === m ? 'selected' : ''}>${m} menit</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>Durasi istirahat</label>
              <select class="select" id="pomoBreakMin" ${p.running ? 'disabled' : ''}>
                ${[5, 10, 15].map(m => `<option value="${m}" ${p.breakMin === m ? 'selected' : ''}>${m} menit</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="disclaimer" style="margin-top:8px;">
            <ion-icon name="bulb-outline"></ion-icon>
            <span><b>Teknik Pomodoro:</b> fokus penuh tanpa HP selama satu sesi, lalu istirahat singkat. Setelah 4 sesi, ambil istirahat panjang 15–30 menit. Timer tetap berjalan walau kamu pindah halaman.</span>
          </div>
        </div>
      </div>`;

    $('#pomoToggle', el).onclick = () => { p.running ? this._pomoPause() : this._pomoStart(); App.refresh(); };
    $('#pomoReset', el).onclick = () => { this._pomoPause(); p.remaining = (isFokus ? p.focusMin : p.breakMin) * 60; App.refresh(); };
    $('#pomoSkip', el).onclick = () => { this._pomoFinish(false); };
    $('#pomoFocusMin', el).onchange = e => {
      p.focusMin = +e.target.value;
      if (p.mode === 'fokus') p.remaining = p.focusMin * 60;
      DB.updateUser({ pomoFokus: p.focusMin }).catch(() => {});
      App.refresh();
    };
    $('#pomoBreakMin', el).onchange = e => {
      p.breakMin = +e.target.value;
      if (p.mode === 'istirahat') p.remaining = p.breakMin * 60;
      DB.updateUser({ pomoIstirahat: p.breakMin }).catch(() => {});
      App.refresh();
    };
  },

  _fmtTime(sec) {
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  },

  _pomoStart() {
    const p = this.pomo;
    if (p.timerId) clearInterval(p.timerId);
    p.running = true;
    p.timerId = setInterval(() => {
      p.remaining--;
      const elTime = $('#pomoTime');
      if (elTime) elTime.textContent = this._fmtTime(p.remaining);
      document.title = `${this._fmtTime(p.remaining)} · ${p.mode === 'fokus' ? 'Fokus' : 'Istirahat'} — Tumara`;
      if (p.remaining <= 0) this._pomoFinish(true);
    }, 1000);
  },

  _pomoPause() {
    const p = this.pomo;
    p.running = false;
    if (p.timerId) { clearInterval(p.timerId); p.timerId = null; }
    document.title = 'Tumara — Tumbuh sehat, produktif, terarah';
  },

  async _pomoFinish(completed) {
    const p = this.pomo;
    this._pomoPause();
    if (p.mode === 'fokus') {
      if (completed) {
        await DB.add('pomodoro', { tanggal: todayStr(), menit: p.focusMin });
        beep(880, 0.18, 3);
        toast(`Sesi fokus ${p.focusMin} menit selesai! Saatnya istirahat ☕`);
      }
      p.mode = 'istirahat';
      p.remaining = p.breakMin * 60;
      if (completed) this._pomoStart(); // istirahat mulai otomatis
    } else {
      if (completed) { beep(660, 0.18, 2); toast('Istirahat selesai — siap fokus lagi? 🎯', 'info'); }
      p.mode = 'fokus';
      p.remaining = p.focusMin * 60;
    }
    if (App.route === 'fokus') App.refresh();
  }
};
