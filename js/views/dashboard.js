/* ============================================================
   TUMARA — Beranda (Dashboard)
   Ringkasan Tugas & Ibadah + aksi cepat
   (Kesehatan, Keuangan, Ensiklopedia dihapus dari aplikasi siswa —
   lihat js/app.js. Skor Keseimbangan 3-pilar ikut dihapus karena
   dua pilarnya sudah tak ada halamannya lagi.)
   ============================================================ */

const Dashboard = {

  async render(el) {
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
    const ibadahItems = Ibadah.SEKOLAH;
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
  }
};
