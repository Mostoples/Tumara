/* ============================================================
   TUMARA — Beranda (Dashboard)
   ------------------------------------------------------------
   Dua tampilan berbeda dari objek View yang sama, dibedakan lewat
   DB.user.pekerjaan (hanya ada di jalur Umum umum-app.html — untuk
   orang di luar sekolah, lihat js/views/job-select.js):
   • Siswa (app.html, tanpa pekerjaan): ringkasan Tugas & Ibadah saja
     — Kesehatan/Keuangan/Ensiklopedia sudah dihapus dari app siswa,
     jadi Skor Keseimbangan 3-pilar ikut dihapus di sana.
   • Non-siswa (umum-app.html: guru, IRT, karyawan, dst.): ringkasan
     LENGKAP (Kesehatan, Tugas, Ibadah, Keuangan) + Skor Keseimbangan,
     supaya begitu dashboard dibuka pertama kali langsung kelihatan
     semua yang bisa dipakai — tidak cuma dua dari empat menu di nav.
   ============================================================ */

const Dashboard = {

  // Menu ringkas khusus jalur umum (umum-app.html) — tak ada di app.html siswa
  // karena app.html masih punya bottom-nav biasa. 5 pilar yang sama seperti
  // strip di index.html (landing page); "Produktivitas" & "Daily Planner"
  // masing-masing menaungi beberapa rute (lihat Prod._KLASTER di
  // js/views/productivity.js) — mendarat di rute pertama klasternya, rute
  // saudaranya dijangkau lewat tab di dalam halaman itu sendiri, sama seperti
  // pola tab Ibadah (js/views/ibadah.js renderKalender dst).
  _MENU_UMUM: [
    { route: 'health',  icon: 'heart',          color: 'green',  label: () => tr('Kesehatan', 'Health'),       sub: () => tr('Kalori, tidur & olahraga', 'Calories, sleep & exercise') },
    { route: 'ibadah',  icon: 'moon',           color: 'teal',   label: () => tr('Ibadah', 'Worship'),         sub: () => tr("Sholat, Qur'an & dzikir", "Prayer, Qur'an & dhikr") },
    { route: 'catatan', icon: 'rocket',         color: 'purple', label: () => tr('Produktivitas', 'Productivity'), sub: () => tr('Catatan, jadwal & fokus', 'Notes, schedule & focus') },
    { route: 'tugas',   icon: 'calendar-number',color: 'blue',   label: () => tr('Daily Planner', 'Daily Planner'), sub: () => tr('To-do & kebiasaan', 'To-do & habits') },
    { route: 'finance', icon: 'wallet',         color: 'amber',  label: () => tr('Keuangan', 'Finance'),       sub: () => tr('Uang saku & menabung', 'Allowance & saving goals') }
  ],

  async render(el) {
    return DB.user?.pekerjaan ? this._renderUmum(el) : this._renderSiswa(el);
  },

  // Tile menu tambahan yang cuma tampil untuk pekerjaan tertentu — supaya
  // menu strip terasa dikaitkan dengan pekerjaan yang dipilih, bukan generik
  // sama untuk semua orang. Saat ini baru "Kelas" untuk Guru (lihat
  // js/views/kelas-guru.js); tambahkan entri baru di sini kalau modul serupa
  // dibuat untuk pekerjaan lain.
  _menuUmum(user) {
    const list = user?.pekerjaanList?.length ? user.pekerjaanList : (user?.pekerjaan ? [user.pekerjaan] : []);
    const extra = list.includes('guru') ? [
      { route: 'kelas', icon: 'school', color: 'rose', label: () => tr('Kelas', 'Class'), sub: () => tr('Murid, absensi, nilai & jurnal', 'Students, attendance, grades & journal') }
    ] : [];
    return [...this._MENU_UMUM, ...extra];
  },

  /* ============ SISWA (app.html) — tidak diubah ============ */

  async _renderSiswa(el) {
    const user = DB.user;
    const [tasks, ibadahRec] = await Promise.all([
      DB.list('tasks'), Ibadah._today()
    ]);

    /* --- data tugas --- */
    // Prioritas dulu (P1 → P3), lalu tenggat — yang krusial tampil paling atas.
    const aktif = tasks.filter(t => t.status !== 'selesai')
      .sort((a, b) => prioUrut(a.prioritas) - prioUrut(b.prioritas)
                   || (a.tenggat || '9999-99-99').localeCompare(b.tenggat || '9999-99-99'));
    const dueToday = aktif.filter(t => t.tenggat === todayStr()).length;

    /* --- data ibadah hari ini --- */
    const doneMap = ibadahRec.done || {};
    const ibadahItems = Ibadah._itemsHariIni();
    const ibadahTotal = ibadahItems.length;
    const ibadahSelesai = ibadahItems.filter(i => doneMap[i.key]).length;
    const ibadahPct = ibadahTotal ? Math.round(ibadahSelesai / ibadahTotal * 100) : 0;

    el.innerHTML = `
      <!-- HERO -->
      <div class="hero-card">
        <div>
          <div class="hero-greet">${greeting()}, ${esc((user.nama || '').split(' ')[0])}! 👋</div>
          <div class="hero-date">${fmtDate(todayStr(), { weekday: true })}</div>
          <p class="hero-msg">${dueToday > 0
            ? tr(`📌 ${dueToday} tugas jatuh tempo hari ini.`, `📌 ${dueToday} task${dueToday > 1 ? 's' : ''} due today.`)
            : tr('Semoga harimu lancar & berkah 🌱', 'Hope your day is smooth & blessed 🌱')}</p>
        </div>
      </div>

      <!-- AKSI CEPAT -->
      <div class="section-head"><h2>${tr('Aksi Cepat', 'Quick Actions')}</h2></div>
      <div class="quick-actions">
        <button class="qa-btn" id="qaTask">
          <span class="item-icon" style="background:var(--prod-soft);color:var(--prod)"><ion-icon name="add-circle-outline"></ion-icon></span>
          ${tr('+ Tugas', '+ Task')}
        </button>
        <button class="qa-btn" id="qaFocus">
          <span class="item-icon" style="background:var(--danger-soft);color:var(--danger)"><ion-icon name="timer-outline"></ion-icon></span>
          ${tr('Timer Fokus', 'Focus Timer')}
        </button>
      </div>

      <!-- RINGKASAN -->
      <div class="section-head"><h2>${tr('Ringkasan Hari Ini', "Today's Summary")}</h2></div>
      <div class="grid grid-2">

        <!-- TUGAS -->
        <div class="card pillar-card hoverable" data-goto="tugas">
          <div class="pc-head">
            <div class="pc-title">
              <span class="item-icon" style="background:var(--prod-soft);color:var(--prod)"><ion-icon name="checkbox"></ion-icon></span>
              ${tr('Tugas', 'Tasks')}
            </div>
          </div>
          ${dueToday > 0 ? `<div style="font-size:.8rem;font-weight:600;color:var(--text-2);margin-bottom:11px;">📌 ${tr(`${dueToday} tugas jatuh tempo hari ini`, `${dueToday} task${dueToday > 1 ? 's' : ''} due today`)}</div>` : ''}
          ${aktif.length ? `
            <div style="display:flex;flex-direction:column;gap:9px;">
              ${aktif.slice(0, 3).map(t => `
                <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--surface-2);border-radius:11px;">
                  ${prioTag(t.prioritas)}
                  <span style="flex:1;font-size:.83rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.judul)}</span>
                  ${t.tenggat ? deadlineBadge(t.tenggat) : ''}
                </div>`).join('')}
            </div>` : `
            <div class="empty-state" style="padding:22px 10px;">
              <ion-icon name="checkmark-done-outline"></ion-icon>
              <div class="es-title">${tr('Tidak ada tugas aktif', 'No active tasks')}</div>
              <div class="es-sub">${tr('Santai, atau tambah tugas baru ✨', 'Relax, or add a new task ✨')}</div>
            </div>`}
        </div>

        <!-- IBADAH -->
        <div class="card pillar-card hoverable" data-goto="ibadah">
          <div class="pc-head">
            <div class="pc-title">
              <span class="item-icon" style="background:var(--health-soft);color:var(--brand-dark)"><ion-icon name="moon"></ion-icon></span>
              ${tr('Ibadah', 'Worship')}
            </div>
            <span class="badge badge-green">${ibadahPct}%</span>
          </div>
          <div style="font-size:.8rem;font-weight:600;color:var(--text-2);margin-bottom:6px;">
            ${tr(`${ibadahSelesai} / ${ibadahTotal} selesai hari ini`, `${ibadahSelesai} / ${ibadahTotal} done today`)}
          </div>
          <div class="progress"><div class="progress-fill" style="width:${ibadahPct}%"></div></div>
        </div>
      </div>`;

    /* --- interaksi --- */
    $$('[data-goto]', el).forEach(c => c.onclick = () => App.navigate(c.dataset.goto));

    $('#qaTask', el).onclick = () => Prod.openTaskModal();
    $('#qaFocus', el).onclick = () => App.navigate('fokus');
  },

  /* ============ NON-SISWA / UMUM (umum-app.html) ============
     Ringkasan 4 pilar (Kesehatan/Tugas/Ibadah/Keuangan) + Skor
     Keseimbangan, supaya orang yang baru pilih pekerjaan (guru, IRT,
     karyawan, dst.) langsung lihat semua fitur yang tersedia untuknya
     tanpa harus menjelajah nav satu-satu dulu. */

  async _renderUmum(el) {
    const user = DB.user;
    const [daily, tasks, transactions, goals, ibadahRec, ibadahItems] = await Promise.all([
      DB.getDaily(), DB.list('tasks'), DB.list('transactions'), DB.list('goals'), Ibadah._today(), Ibadah._checklist()
    ]);

    const score = Calc.balanceScore({ daily, user, tasks, transactions });

    /* --- data kesehatan --- */
    const targetKalori = user.targetKalori || 2000;
    const targetAir = user.targetAir || 8;
    const pctKalori = clamp(Math.round((daily.kalori / targetKalori) * 100), 0, 100);
    const pctAir = clamp(Math.round((daily.air / targetAir) * 100), 0, 100);

    /* --- data tugas --- */
    const aktif = tasks.filter(t => t.status !== 'selesai')
      .sort((a, b) => prioUrut(a.prioritas) - prioUrut(b.prioritas)
                   || (a.tenggat || '9999-99-99').localeCompare(b.tenggat || '9999-99-99'));
    const dueToday = aktif.filter(t => t.tenggat === todayStr()).length;

    /* --- data ibadah hari ini (checklist per waktu sholat, custom per pengguna) --- */
    const doneMap = ibadahRec.done || {};
    const ibadahTotal = ibadahItems.length;
    const ibadahSelesai = ibadahItems.filter(i => doneMap[i.id]).length;
    const ibadahPct = ibadahTotal ? Math.round(ibadahSelesai / ibadahTotal * 100) : 0;

    /* --- data keuangan --- */
    const bulan = monthStr();
    const txBulan = transactions.filter(t => (t.tanggal || '').startsWith(bulan));
    const masuk = txBulan.filter(t => t.tipe === 'masuk').reduce((s, t) => s + t.jumlah, 0);
    const keluar = txBulan.filter(t => t.tipe === 'keluar').reduce((s, t) => s + t.jumlah, 0);
    const saldo = masuk - keluar;
    const topGoal = goals.filter(g => g.terkumpul < g.target)
      .sort((a, b) => (b.terkumpul / b.target) - (a.terkumpul / a.target))[0];
    // Kalau menu Keuangan sedang dikunci PIN, saldo TIDAK boleh bocor di sini.
    const finTerkunci = Fin.terkunci();

    el.innerHTML = `
      <!-- HERO -->
      <div class="hero-card">
        <div>
          <div class="hero-greet">${greeting()}, ${esc((user.nama || '').split(' ')[0])}! 👋</div>
          <div class="hero-date">${fmtDate(todayStr(), { weekday: true })}${typeof App !== 'undefined' && App._pekerjaanLabel ? ` · ${esc(App._pekerjaanLabel(user))}` : ''}</div>
          <p class="hero-msg">${Calc.balanceMessage(score.total)}</p>
        </div>
        <div class="score-ring">
          ${ringSVG(score.total, { size: 130, stroke: 11 })}
          <div class="sr-val">
            <div class="sr-num">${score.total}</div>
            <div class="sr-label">${tr('Skor Seimbang', 'Balance Score')}</div>
          </div>
        </div>
      </div>

      <!-- MENU — jalur umum tidak punya navbar/bottom-nav (lihat umum-app.html);
           grid ini satu-satunya jalan ke semua halaman fitur, terutama di mobile. -->
      <div class="section-head"><h2>${tr('Menu', 'Menu')}</h2></div>
      <div class="menu-strip">
        ${this._menuUmum(user).map(m => `
          <button class="menu-strip-item" data-goto="${m.route}">
            <span class="msi-icon msi-${m.color}"><ion-icon name="${m.icon}"></ion-icon></span>
            <span class="msi-body"><b>${m.label()}</b><span>${m.sub()}</span></span>
          </button>`).join('')}
      </div>

      <!-- RINGKASAN 4 PILAR -->
      <div class="section-head"><h2>${tr('Ringkasan Hari Ini', "Today's Summary")}</h2></div>
      <div class="grid grid-4">

        <!-- KESEHATAN -->
        <div class="card pillar-card hoverable" data-goto="health">
          <div class="pc-head">
            <div class="pc-title">
              <span class="item-icon" style="background:var(--health-soft);color:var(--health)"><ion-icon name="heart"></ion-icon></span>
              ${tr('Kesehatan', 'Health')}
            </div>
            <span class="badge badge-green">${score.health}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:13px;">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:.8rem;font-weight:600;color:var(--text-2);margin-bottom:6px;">
                <span>🔥 ${tr('Energi', 'Energy')}</span><span>${daily.kalori.toLocaleString('id-ID')} / ${targetKalori.toLocaleString('id-ID')} ${tr('kkal', 'kcal')}</span>
              </div>
              <div class="progress"><div class="progress-fill" style="width:${pctKalori}%"></div></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:.8rem;font-weight:600;color:var(--text-2);margin-bottom:6px;">
                <span>💧 ${tr('Minum', 'Water')}</span><span>${daily.air} / ${targetAir} ${tr('gelas', 'glasses')}</span>
              </div>
              <div class="progress"><div class="progress-fill blue" style="width:${pctAir}%"></div></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:.8rem;font-weight:600;color:var(--text-2);">
              <span>🌙 ${tr('Tidur semalam', "Last night's sleep")}</span>
              <span>${daily.tidur > 0 ? daily.tidur + ' ' + tr('jam', 'hours') : `<i style="color:var(--text-3)">${tr('belum dicatat', 'not logged yet')}</i>`}</span>
            </div>
          </div>
        </div>

        <!-- TUGAS -->
        <div class="card pillar-card hoverable" data-goto="tugas">
          <div class="pc-head">
            <div class="pc-title">
              <span class="item-icon" style="background:var(--prod-soft);color:var(--prod)"><ion-icon name="checkbox"></ion-icon></span>
              ${tr('Tugas', 'Tasks')}
            </div>
            <span class="badge badge-purple">${score.prod}</span>
          </div>
          ${dueToday > 0 ? `<div style="font-size:.8rem;font-weight:600;color:var(--text-2);margin-bottom:11px;">📌 ${tr(`${dueToday} tugas jatuh tempo hari ini`, `${dueToday} task${dueToday > 1 ? 's' : ''} due today`)}</div>` : ''}
          ${aktif.length ? `
            <div style="display:flex;flex-direction:column;gap:9px;">
              ${aktif.slice(0, 3).map(t => `
                <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--surface-2);border-radius:11px;">
                  ${prioTag(t.prioritas)}
                  <span style="flex:1;font-size:.83rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.judul)}</span>
                  ${t.tenggat ? deadlineBadge(t.tenggat) : ''}
                </div>`).join('')}
            </div>` : `
            <div class="empty-state" style="padding:22px 10px;">
              <ion-icon name="checkmark-done-outline"></ion-icon>
              <div class="es-title">${tr('Tidak ada tugas aktif', 'No active tasks')}</div>
              <div class="es-sub">${tr('Santai, atau tambah tugas baru ✨', 'Relax, or add a new task ✨')}</div>
            </div>`}
        </div>

        <!-- IBADAH -->
        <div class="card pillar-card hoverable" data-goto="ibadah">
          <div class="pc-head">
            <div class="pc-title">
              <span class="item-icon" style="background:var(--health-soft);color:var(--brand-dark)"><ion-icon name="moon"></ion-icon></span>
              ${tr('Ibadah', 'Worship')}
            </div>
            <span class="badge badge-green">${ibadahPct}%</span>
          </div>
          <div style="font-size:.8rem;font-weight:600;color:var(--text-2);margin-bottom:6px;">
            ${tr(`${ibadahSelesai} / ${ibadahTotal} sholat selesai hari ini`, `${ibadahSelesai} / ${ibadahTotal} prayers done today`)}
          </div>
          <div class="progress"><div class="progress-fill" style="width:${ibadahPct}%"></div></div>
        </div>

        <!-- KEUANGAN -->
        <div class="card pillar-card hoverable" data-goto="finance">
          <div class="pc-head">
            <div class="pc-title">
              <span class="item-icon" style="background:var(--fin-soft);color:var(--fin)"><ion-icon name="wallet"></ion-icon></span>
              ${tr('Keuangan', 'Finance')}
            </div>
            <span class="badge badge-amber">${score.fin}</span>
          </div>
          ${finTerkunci ? `
            <div class="empty-state" style="padding:22px 10px;">
              <ion-icon name="lock-closed-outline"></ion-icon>
              <div class="es-title">${tr('Keuangan terkunci', 'Finance locked')}</div>
              <div class="es-sub">${tr('Masukkan PIN di menu Keuangan untuk melihat saldo', 'Enter your PIN in the Finance menu to see the balance')}</div>
            </div>` : `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="font-size:.78rem;font-weight:700;color:var(--text-3);">${tr('SISA SALDO BULAN INI', "THIS MONTH'S BALANCE")}</div>
              ${Saldo.btnHTML('dashEye')}
            </div>
            <div class="stat-row" style="margin:3px 0 13px;">
              <span class="stat-num" style="color:${saldo >= 0 ? 'inherit' : 'var(--danger)'}">${fmtRpM(saldo)}</span>
            </div>
            ${topGoal ? `
              <div style="font-size:.8rem;font-weight:600;color:var(--text-2);display:flex;justify-content:space-between;margin-bottom:6px;">
                <span>🎯 ${esc(topGoal.nama)}</span>
                <span>${Math.round(topGoal.terkumpul / topGoal.target * 100)}%</span>
              </div>
              <div class="progress"><div class="progress-fill amber" style="width:${clamp(Math.round(topGoal.terkumpul / topGoal.target * 100), 0, 100)}%"></div></div>` : `
              <div style="font-size:.8rem;color:var(--text-3);">${tr('Belum ada target menabung — yuk buat satu! 🎯', 'No savings goal yet — create one! 🎯')}</div>`}`}
        </div>
      </div>

      <div class="disclaimer" style="margin-top:26px;">
        <ion-icon name="shield-checkmark-outline"></ion-icon>
        <span>${tr('Tumara adalah pendamping kebiasaan sehat dan bukan pengganti nasihat tenaga kesehatan profesional.', 'Tumara is a healthy-habit companion and not a substitute for professional medical advice.')}</span>
      </div>`;

    /* --- interaksi --- */
    $$('[data-goto]', el).forEach(c => c.onclick = () => App.navigate(c.dataset.goto));

    // Tombol mata berada DI DALAM kartu yang bisa diklik → hentikan bubbling,
    // supaya menyembunyikan saldo tidak ikut membuka halaman Keuangan.
    $('#dashEye', el) && ($('#dashEye', el).onclick = e => {
      e.stopPropagation();
      Saldo.toggle();
      App.refresh();
    });

  }
};
