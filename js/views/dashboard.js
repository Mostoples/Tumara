/* ============================================================
   TUMARA — Beranda (Dashboard)
   Ringkasan tiga pilar + Skor Keseimbangan + aksi cepat
   ============================================================ */

const Dashboard = {

  async render(el) {
    const user = DB.user;
    const [daily, tasks, transactions, goals] = await Promise.all([
      DB.getDaily(), DB.list('tasks'), DB.list('transactions'), DB.list('goals')
    ]);

    const score = Calc.balanceScore({ daily, user, tasks, transactions });

    /* --- data kesehatan --- */
    const targetKalori = user.targetKalori || 2000;
    const targetAir = user.targetAir || 8;
    const pctKalori = clamp(Math.round((daily.kalori / targetKalori) * 100), 0, 100);
    const pctAir = clamp(Math.round((daily.air / targetAir) * 100), 0, 100);

    /* --- data tugas --- */
    const aktif = tasks.filter(t => t.status !== 'selesai')
      .sort((a, b) => (a.tenggat || '9999') < (b.tenggat || '9999') ? -1 : 1);
    const dueToday = aktif.filter(t => t.tenggat === todayStr()).length;

    /* --- data keuangan --- */
    const bulan = monthStr();
    const txBulan = transactions.filter(t => (t.tanggal || '').startsWith(bulan));
    const masuk = txBulan.filter(t => t.tipe === 'masuk').reduce((s, t) => s + t.jumlah, 0);
    const keluar = txBulan.filter(t => t.tipe === 'keluar').reduce((s, t) => s + t.jumlah, 0);
    const saldo = masuk - keluar;
    const topGoal = goals.filter(g => g.terkumpul < g.target)
      .sort((a, b) => (b.terkumpul / b.target) - (a.terkumpul / a.target))[0];

    el.innerHTML = `
      <!-- HERO -->
      <div class="hero-card">
        <div>
          <div class="hero-greet">${greeting()}, ${esc((user.nama || '').split(' ')[0])}! 👋</div>
          <div class="hero-date">${fmtDate(todayStr(), { weekday: true })}</div>
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

      <!-- AKSI CEPAT -->
      <div class="section-head"><h2>${tr('Aksi Cepat', 'Quick Actions')}</h2></div>
      <div class="quick-actions">
        <button class="qa-btn" id="qaWater">
          <span class="item-icon" style="background:var(--info-soft);color:var(--info)"><ion-icon name="water"></ion-icon></span>
          ${tr('+ Gelas Air', '+ Glass of Water')}
        </button>
        <button class="qa-btn" id="qaTx">
          <span class="item-icon" style="background:var(--fin-soft);color:var(--fin)"><ion-icon name="cash-outline"></ion-icon></span>
          ${tr('+ Transaksi', '+ Transaction')}
        </button>
        <button class="qa-btn" id="qaTask">
          <span class="item-icon" style="background:var(--prod-soft);color:var(--prod)"><ion-icon name="add-circle-outline"></ion-icon></span>
          ${tr('+ Tugas', '+ Task')}
        </button>
        <button class="qa-btn" id="qaFocus">
          <span class="item-icon" style="background:var(--danger-soft);color:var(--danger)"><ion-icon name="timer-outline"></ion-icon></span>
          ${tr('Timer Fokus', 'Focus Timer')}
        </button>
      </div>

      <!-- TIGA PILAR -->
      <div class="section-head"><h2>${tr('Ringkasan Hari Ini', "Today's Summary")}</h2></div>
      <div class="grid grid-3">

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

        <!-- PRODUKTIVITAS -->
        <div class="card pillar-card hoverable" data-goto="productivity">
          <div class="pc-head">
            <div class="pc-title">
              <span class="item-icon" style="background:var(--prod-soft);color:var(--prod)"><ion-icon name="rocket"></ion-icon></span>
              ${tr('Produktivitas', 'Productivity')}
            </div>
            <span class="badge badge-purple">${score.prod}</span>
          </div>
          ${dueToday > 0 ? `<div style="font-size:.8rem;font-weight:600;color:var(--text-2);margin-bottom:11px;">📌 ${tr(`${dueToday} tugas jatuh tempo hari ini`, `${dueToday} task${dueToday > 1 ? 's' : ''} due today`)}</div>` : ''}
          ${aktif.length ? `
            <div style="display:flex;flex-direction:column;gap:9px;">
              ${aktif.slice(0, 3).map(t => `
                <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--surface-2);border-radius:11px;">
                  <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${t.prioritas === 'tinggi' ? 'var(--danger)' : t.prioritas === 'sedang' ? 'var(--fin)' : 'var(--brand)'}"></span>
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

        <!-- KEUANGAN -->
        <div class="card pillar-card hoverable" data-goto="finance">
          <div class="pc-head">
            <div class="pc-title">
              <span class="item-icon" style="background:var(--fin-soft);color:var(--fin)"><ion-icon name="wallet"></ion-icon></span>
              ${tr('Keuangan', 'Finance')}
            </div>
            <span class="badge badge-amber">${score.fin}</span>
          </div>
          <div style="font-size:.78rem;font-weight:700;color:var(--text-3);">${tr('SISA SALDO BULAN INI', "THIS MONTH'S BALANCE")}</div>
          <div class="stat-row" style="margin:3px 0 13px;">
            <span class="stat-num" style="color:${saldo >= 0 ? 'inherit' : 'var(--danger)'}">${fmtRp(saldo)}</span>
          </div>
          ${topGoal ? `
            <div style="font-size:.8rem;font-weight:600;color:var(--text-2);display:flex;justify-content:space-between;margin-bottom:6px;">
              <span>🎯 ${esc(topGoal.nama)}</span>
              <span>${Math.round(topGoal.terkumpul / topGoal.target * 100)}%</span>
            </div>
            <div class="progress"><div class="progress-fill amber" style="width:${clamp(Math.round(topGoal.terkumpul / topGoal.target * 100), 0, 100)}%"></div></div>` : `
            <div style="font-size:.8rem;color:var(--text-3);">${tr('Belum ada target menabung — yuk buat satu! 🎯', 'No savings goal yet — create one! 🎯')}</div>`}
        </div>
      </div>

      <div class="disclaimer" style="margin-top:26px;">
        <ion-icon name="shield-checkmark-outline"></ion-icon>
        <span>${tr('Tumara adalah pendamping kebiasaan sehat dan bukan pengganti nasihat tenaga kesehatan profesional.', 'Tumara is a healthy-habit companion and not a substitute for professional medical advice.')}</span>
      </div>`;

    /* --- interaksi --- */
    $$('[data-goto]', el).forEach(c => c.onclick = () => App.navigate(c.dataset.goto));

    $('#qaWater', el).onclick = async () => {
      const d = await DB.getDaily();
      await DB.saveDaily(todayStr(), { air: (d.air || 0) + 1 });
      toast(tr(`Segar! ${(d.air || 0) + 1} gelas air hari ini 💧`, `Refreshing! ${(d.air || 0) + 1} glasses of water today 💧`));
      App.refresh();
    };
    $('#qaTx', el).onclick = () => Fin.openTxModal();
    $('#qaTask', el).onclick = () => Prod.openTaskModal();
    $('#qaFocus', el).onclick = () => { Prod.tab = 'fokus'; App.navigate('productivity'); };
  }
};
