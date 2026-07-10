/* ============================================================
   TUMARA — Keuangan
   Tab: Transaksi · Target · Laporan
   ============================================================ */

const Fin = {
  tab: 'transaksi',   // 'transaksi' | 'target' | 'laporan'
  month: monthStr(),

  KATEGORI: {
    masuk: [
      { key: 'Uang Saku', en: 'Allowance',   emoji: '💵' },
      { key: 'Hadiah',    en: 'Gift',        emoji: '🎁' },
      { key: 'Beasiswa',  en: 'Scholarship', emoji: '🎓' },
      { key: 'Lainnya',   en: 'Other',       emoji: '✨' }
    ],
    keluar: [
      { key: 'Makanan & Jajan',   en: 'Food & Snacks',      emoji: '🍜' },
      { key: 'Transportasi',      en: 'Transport',          emoji: '🚌' },
      { key: 'Hiburan',           en: 'Entertainment',      emoji: '🎮' },
      { key: 'Alat Tulis & Buku', en: 'Stationery & Books', emoji: '📚' },
      { key: 'Tabungan',          en: 'Savings',            emoji: '🐖' },
      { key: 'Lainnya',           en: 'Other',              emoji: '✨' }
    ]
  },

  // warna donut per kategori pengeluaran
  WARNA: {
    'Makanan & Jajan': '#f59e0b', 'Transportasi': '#3b82f6',
    'Hiburan': '#8b5cf6', 'Alat Tulis & Buku': '#10b981',
    'Tabungan': '#06b6d4', 'Lainnya': '#94a3b8'
  },

  _emoji(tipe, kategori) {
    const k = (this.KATEGORI[tipe] || []).find(x => x.key === kategori);
    return k ? k.emoji : '✨';
  },

  // label kategori sesuai bahasa aktif (key tetap Indonesia di DB)
  _katLabel(tipe, kategori) {
    const k = (this.KATEGORI[tipe] || []).find(x => x.key === kategori)
      || Object.values(this.KATEGORI).flat().find(x => x.key === kategori);
    return k ? tr(k.key, k.en) : kategori;
  },

  async render(el) {
    el.innerHTML = `
      <div class="tabs">
        <button class="tab ${this.tab === 'transaksi' ? 'active' : ''}" data-tab="transaksi"><ion-icon name="swap-vertical-outline"></ion-icon>${tr('Transaksi', 'Transactions')}</button>
        <button class="tab ${this.tab === 'target' ? 'active' : ''}" data-tab="target"><ion-icon name="flag-outline"></ion-icon>${tr('Target', 'Goals')}</button>
        <button class="tab ${this.tab === 'laporan' ? 'active' : ''}" data-tab="laporan"><ion-icon name="pie-chart-outline"></ion-icon>${tr('Laporan', 'Report')}</button>
      </div>
      <div id="finBody"></div>`;

    $$('.tab', el).forEach(t => t.onclick = () => { this.tab = t.dataset.tab; this.render(el); });

    const body = $('#finBody', el);
    if (this.tab === 'transaksi') await this.renderTx(body);
    else if (this.tab === 'target') await this.renderGoals(body);
    else await this.renderReport(body);
  },

  /* ============ TAB: TRANSAKSI ============ */

  async renderTx(el) {
    const all = await DB.list('transactions');
    const txBulan = all.filter(t => (t.tanggal || '').startsWith(this.month));
    const masuk  = txBulan.filter(t => t.tipe === 'masuk').reduce((s, t) => s + t.jumlah, 0);
    const keluar = txBulan.filter(t => t.tipe === 'keluar').reduce((s, t) => s + t.jumlah, 0);
    const saldo  = masuk - keluar;

    // kelompokkan per tanggal, terbaru dulu
    const tanggalList = [...new Set(txBulan.map(t => t.tanggal))].sort().reverse();

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <input type="month" class="input" id="txMonth" value="${this.month}" style="max-width:180px;">
        <button class="btn btn-fin btn-sm" id="addTx"><ion-icon name="add"></ion-icon> ${tr('Transaksi', 'Transaction')}</button>
      </div>

      <div class="grid grid-3">
        <div class="card money-stat">
          <div class="ms-label"><ion-icon name="arrow-down-circle" style="color:var(--brand);font-size:1.1rem;"></ion-icon> ${tr('Pemasukan', 'Income')}</div>
          <div class="ms-value tx-amount-in">${fmtRp(masuk)}</div>
        </div>
        <div class="card money-stat">
          <div class="ms-label"><ion-icon name="arrow-up-circle" style="color:var(--danger);font-size:1.1rem;"></ion-icon> ${tr('Pengeluaran', 'Expenses')}</div>
          <div class="ms-value tx-amount-out">${fmtRp(keluar)}</div>
        </div>
        <div class="card money-stat">
          <div class="ms-label"><ion-icon name="wallet" style="color:var(--fin);font-size:1.1rem;"></ion-icon> ${tr('Sisa Saldo', 'Balance')}</div>
          <div class="ms-value" style="color:${saldo >= 0 ? 'inherit' : 'var(--danger)'}">${fmtRp(saldo)}</div>
        </div>
      </div>

      ${tanggalList.length ? tanggalList.map(tgl => `
        <div class="tx-date-head">${fmtDate(tgl, { weekday: true })}</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${txBulan.filter(t => t.tanggal === tgl).map(t => `
            <div class="list-item">
              <div class="item-icon" style="background:${t.tipe === 'masuk' ? 'var(--brand-soft)' : 'var(--fin-soft)'};font-size:1.2rem;">${this._emoji(t.tipe, t.kategori)}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:.9rem;">${esc(this._katLabel(t.tipe, t.kategori))}</div>
                ${t.catatan ? `<div style="font-size:.78rem;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.catatan)}</div>` : ''}
              </div>
              <span class="${t.tipe === 'masuk' ? 'tx-amount-in' : 'tx-amount-out'}" style="font-size:.9rem;">${t.tipe === 'masuk' ? '+' : '−'}${fmtRp(t.jumlah)}</span>
              <button class="mini-icon-btn" data-edit="${t.id}"><ion-icon name="create-outline"></ion-icon></button>
              <button class="mini-icon-btn danger" data-del="${t.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`).join('')}
        </div>`).join('') : `
        <div class="card empty-state" style="margin-top:18px;">
          <ion-icon name="receipt-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada transaksi bulan ini', 'No transactions this month yet')}</div>
          <div class="es-sub">${tr('Catat uang saku atau jajanmu — biar keuangan tetap terpantau 💰', 'Log your allowance or snack money — keep your finances in check 💰')}</div>
        </div>`}`;

    $('#txMonth', el).onchange = e => { this.month = e.target.value || monthStr(); App.refresh(); };
    $('#addTx', el).onclick = () => this.openTxModal();
    $$('[data-edit]', el).forEach(b => b.onclick = () => this.openTxModal(all.find(t => t.id === b.dataset.edit)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus transaksi ini?', 'Delete this transaction?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      await DB.remove('transactions', b.dataset.del);
      toast(tr('Transaksi dihapus.', 'Transaction deleted.'));
      App.refresh();
    });
  },

  // dipanggil juga dari dashboard.js — jangan ganti nama
  openTxModal(tx = null) {
    let tipe = tx?.tipe || 'keluar';

    const opsiKategori = t => this.KATEGORI[t]
      .map(k => `<option value="${esc(k.key)}" ${tx?.kategori === k.key ? 'selected' : ''}>${k.emoji} ${esc(tr(k.key, k.en))}</option>`)
      .join('');

    openModal({
      title: tx ? tr('Ubah Transaksi', 'Edit Transaction') : tr('Transaksi Baru', 'New Transaction'),
      body: `
        <div class="field">
          <label>${tr('Tipe', 'Type')}</label>
          <div class="radio-cards" id="mTipe">
            <div class="radio-card ${tipe === 'masuk' ? 'selected' : ''}" data-val="masuk"><ion-icon name="arrow-down-circle-outline"></ion-icon>${tr('Pemasukan', 'Income')}</div>
            <div class="radio-card ${tipe === 'keluar' ? 'selected' : ''}" data-val="keluar"><ion-icon name="arrow-up-circle-outline"></ion-icon>${tr('Pengeluaran', 'Expense')}</div>
          </div>
        </div>
        <div class="field">
          <label>${tr('Jumlah', 'Amount')}</label>
          <div class="input-group">
            <input type="number" class="input" id="mJumlah" min="0" placeholder="${tr('mis. 15000', 'e.g. 15000')}" value="${tx?.jumlah ?? ''}">
            <span class="input-unit">Rp</span>
          </div>
        </div>
        <div class="field">
          <label>${tr('Kategori', 'Category')}</label>
          <select class="select" id="mKategori">${opsiKategori(tipe)}</select>
        </div>
        <div class="field">
          <label>${tr('Tanggal', 'Date')}</label>
          <input type="date" class="input" id="mTanggal" value="${tx?.tanggal || todayStr()}">
        </div>
        <div class="field">
          <label>${tr('Catatan', 'Note')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
          <input type="text" class="input" id="mCatatan" placeholder="${tr('mis. bakso depan sekolah', 'e.g. meatballs near school')}" value="${esc(tx?.catatan || '')}">
        </div>
        <button class="btn btn-fin btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tx ? tr('Simpan Perubahan', 'Save Changes') : tr('Tambah Transaksi', 'Add Transaction')}</button>`,
      onMount: m => {
        $$('#mTipe .radio-card', m).forEach(c => c.onclick = () => {
          tipe = c.dataset.val;
          $$('#mTipe .radio-card', m).forEach(x => x.classList.toggle('selected', x === c));
          $('#mKategori', m).innerHTML = opsiKategori(tipe);
        });
        $('#mSave', m).onclick = async () => {
          const jumlah = +$('#mJumlah', m).value;
          const tanggal = $('#mTanggal', m).value;
          if (!jumlah || jumlah <= 0) return toast(tr('Masukkan jumlah yang valid.', 'Enter a valid amount.'), 'warning');
          if (!tanggal) return toast(tr('Pilih tanggal transaksi.', 'Pick a transaction date.'), 'warning');
          const data = {
            tanggal, tipe, jumlah,
            kategori: $('#mKategori', m).value,
            catatan: $('#mCatatan', m).value.trim()
          };
          if (tx) await DB.update('transactions', tx.id, data);
          else await DB.add('transactions', data);
          this.month = tanggal.slice(0, 7);
          closeModal();
          toast(tx ? tr('Transaksi diperbarui.', 'Transaction updated.') : tr('Transaksi dicatat 💰', 'Transaction logged 💰'));
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: TARGET MENABUNG ============ */

  async renderGoals(el) {
    const goals = (await DB.list('goals'))
      .sort((a, b) => (a.tenggat || '9999') < (b.tenggat || '9999') ? -1 : 1);

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="font-size:.88rem;color:var(--text-3);font-weight:600;">${tr('Nabung Rp X untuk Y sampai tanggal Z 🎯', 'Save Rp X for Y by date Z 🎯')}</div>
        <button class="btn btn-fin btn-sm" id="addGoal"><ion-icon name="add"></ion-icon> ${tr('Target Baru', 'New Goal')}</button>
      </div>

      ${goals.length ? `
        <div class="grid grid-2">
          ${goals.map(g => {
            const pct = clamp(Math.round((g.terkumpul / g.target) * 100), 0, 100);
            const tercapai = g.terkumpul >= g.target;
            return `
            <div class="card">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
                <div class="card-title">🎯 ${esc(g.nama)}</div>
                ${tercapai ? `<span class="badge badge-green">${tr('🎉 Tercapai!', '🎉 Achieved!')}</span>` : (g.tenggat ? deadlineBadge(g.tenggat) : '')}
              </div>
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin:14px 0 7px;">
                <span style="font-weight:800;font-size:1.05rem;">${fmtRp(g.terkumpul)}</span>
                <span style="font-size:.8rem;color:var(--text-3);font-weight:600;">${tr(`dari ${fmtRp(g.target)}`, `of ${fmtRp(g.target)}`)} · ${pct}%</span>
              </div>
              <div class="progress"><div class="progress-fill amber" style="width:${pct}%"></div></div>
              <div style="display:flex;gap:8px;margin-top:16px;">
                ${!tercapai ? `<button class="btn btn-fin btn-sm" data-save="${g.id}"><ion-icon name="add"></ion-icon> ${tr('Tabung', 'Save Up')}</button>` : ''}
                <button class="mini-icon-btn" style="margin-left:auto;" data-edit="${g.id}"><ion-icon name="create-outline"></ion-icon></button>
                <button class="mini-icon-btn danger" data-del="${g.id}"><ion-icon name="trash-outline"></ion-icon></button>
              </div>
            </div>`;
          }).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="flag-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada target menabung', 'No savings goals yet')}</div>
          <div class="es-sub">${tr('Mau beli sesuatu? Buat target dan cicil sedikit demi sedikit 🐖', 'Saving up for something? Set a goal and chip in bit by bit 🐖')}</div>
        </div>`}`;

    $('#addGoal', el).onclick = () => this._goalModal();
    $$('[data-edit]', el).forEach(b => b.onclick = () => this._goalModal(goals.find(g => g.id === b.dataset.edit)));
    $$('[data-save]', el).forEach(b => b.onclick = () => this._saveToGoalModal(goals.find(g => g.id === b.dataset.save)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus target menabung ini?', 'Delete this savings goal?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      await DB.remove('goals', b.dataset.del);
      toast(tr('Target dihapus.', 'Goal deleted.'));
      App.refresh();
    });
  },

  _goalModal(goal = null) {
    openModal({
      title: goal ? tr('Ubah Target', 'Edit Goal') : tr('Target Menabung Baru', 'New Savings Goal'),
      body: `
        <div class="field">
          <label>${tr('Menabung untuk apa?', 'What are you saving for?')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('mis. Sepatu futsal baru', 'e.g. New futsal shoes')}" value="${esc(goal?.nama || '')}">
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>${tr('Jumlah target', 'Target amount')}</label>
            <div class="input-group">
              <input type="number" class="input" id="mTarget" min="0" placeholder="500000" value="${goal?.target ?? ''}">
              <span class="input-unit">Rp</span>
            </div>
          </div>
          <div class="field">
            <label>${tr('Tenggat', 'Deadline')}</label>
            <input type="date" class="input" id="mTenggat" value="${goal?.tenggat || ''}">
          </div>
        </div>
        ${!goal ? `
        <div class="field">
          <label>${tr('Sudah terkumpul', 'Already saved')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
          <div class="input-group">
            <input type="number" class="input" id="mAwal" min="0" placeholder="0" value="0">
            <span class="input-unit">Rp</span>
          </div>
        </div>` : ''}
        <button class="btn btn-fin btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${goal ? tr('Simpan Perubahan', 'Save Changes') : tr('Buat Target', 'Create Goal')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          const target = +$('#mTarget', m).value;
          if (!nama) return toast(tr('Beri nama targetmu.', 'Give your goal a name.'), 'warning');
          if (!target || target <= 0) return toast(tr('Masukkan jumlah target yang valid.', 'Enter a valid target amount.'), 'warning');
          const data = { nama, target, tenggat: $('#mTenggat', m).value };
          if (goal) await DB.update('goals', goal.id, data);
          else await DB.add('goals', { ...data, terkumpul: Math.max(0, +$('#mAwal', m).value || 0) });
          closeModal();
          toast(goal ? tr('Target diperbarui.', 'Goal updated.') : tr('Target dibuat — semangat menabung! 🎯', 'Goal created — happy saving! 🎯'));
          App.refresh();
        };
      }
    });
  },

  _saveToGoalModal(goal) {
    const sisa = Math.max(0, goal.target - goal.terkumpul);
    openModal({
      title: tr(`Tabung: ${goal.nama}`, `Save up: ${goal.nama}`),
      body: `
        <p style="font-size:.85rem;color:var(--text-3);margin-bottom:14px;">
          ${tr(`Terkumpul <b>${fmtRp(goal.terkumpul)}</b> dari ${fmtRp(goal.target)} — kurang <b>${fmtRp(sisa)}</b> lagi.`, `Saved <b>${fmtRp(goal.terkumpul)}</b> of ${fmtRp(goal.target)} — <b>${fmtRp(sisa)}</b> to go.`)}
        </p>
        <div class="field">
          <label>${tr('Jumlah yang ditabung', 'Amount to save')}</label>
          <div class="input-group">
            <input type="number" class="input" id="mJumlah" min="0" placeholder="${tr('mis. 20000', 'e.g. 20000')}">
            <span class="input-unit">Rp</span>
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:10px;font-size:.85rem;font-weight:600;color:var(--text-2);cursor:pointer;margin:4px 0 18px;">
          <input type="checkbox" id="mCatatTx" checked style="width:17px;height:17px;accent-color:var(--fin);">
          ${tr('Catat sebagai transaksi pengeluaran (kategori Tabungan)', 'Log as an expense transaction (Savings category)')}
        </label>
        <button class="btn btn-fin btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Tabung Sekarang', 'Save Now')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const jumlah = +$('#mJumlah', m).value;
          if (!jumlah || jumlah <= 0) return toast(tr('Masukkan jumlah yang valid.', 'Enter a valid amount.'), 'warning');
          const total = goal.terkumpul + jumlah;
          await DB.update('goals', goal.id, { terkumpul: total });
          if ($('#mCatatTx', m).checked) {
            await DB.add('transactions', {
              tanggal: todayStr(), tipe: 'keluar', jumlah,
              kategori: 'Tabungan', catatan: tr(`Menabung: ${goal.nama}`, `Saving up: ${goal.nama}`)
            });
          }
          closeModal();
          toast(total >= goal.target
            ? tr(`Target "${goal.nama}" tercapai — keren banget! 🎉`, `Goal "${goal.nama}" achieved — awesome! 🎉`)
            : tr(`${fmtRp(jumlah)} masuk celengan 🐖`, `${fmtRp(jumlah)} added to your piggy bank 🐖`));
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: LAPORAN ============ */

  async renderReport(el) {
    const all = await DB.list('transactions');
    const txBulan = all.filter(t => (t.tanggal || '').startsWith(this.month));
    const keluarBulan = txBulan.filter(t => t.tipe === 'keluar');

    // bar chart: pengeluaran 7 hari terakhir (berbasis hari ini)
    const hari7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = todayStr(d);
      hari7.push({
        label: HARI[d.getDay()].slice(0, 3),
        value: all.filter(t => t.tipe === 'keluar' && t.tanggal === iso).reduce((s, t) => s + t.jumlah, 0)
      });
    }
    const adaBar = hari7.some(h => h.value > 0);

    // donut: pengeluaran per kategori bulan terpilih
    const perKategori = {};
    keluarBulan.forEach(t => { perKategori[t.kategori] = (perKategori[t.kategori] || 0) + t.jumlah; });
    const kategoriItems = Object.entries(perKategori)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value, color: this.WARNA[label] || '#94a3b8' }));
    const totalKeluar = keluarBulan.reduce((s, t) => s + t.jumlah, 0);
    const terbesar = kategoriItems[0];

    const fmtRingkas = v => v >= 1000000 ? (v / 1000000).toFixed(1).replace('.0', '') + tr('jt', 'M')
      : v >= 1000 ? Math.round(v / 1000) + tr('rb', 'K') : v;

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <input type="month" class="input" id="rpMonth" value="${this.month}" style="max-width:180px;">
        ${terbesar ? `<span class="badge badge-amber">${tr('Total pengeluaran:', 'Total spending:')} ${fmtRp(totalKeluar)}</span>` : ''}
      </div>

      <div class="grid grid-2" style="align-items:start;">
        <div class="card chart-box">
          <div class="card-title"><ion-icon name="bar-chart" style="color:var(--fin)"></ion-icon>${tr('Pengeluaran 7 Hari Terakhir', 'Spending — Last 7 Days')}</div>
          ${adaBar
            ? `<div style="margin-top:14px;">${barChartSVG(hari7, { color: 'var(--fin)', fmtVal: fmtRingkas })}</div>`
            : `<div class="empty-state" style="padding:28px 10px;">
                 <ion-icon name="bar-chart-outline"></ion-icon>
                 <div class="es-title">${tr('Belum ada pengeluaran minggu ini', 'No spending this week yet')}</div>
                 <div class="es-sub">${tr('Grafik muncul setelah kamu mencatat transaksi 📊', 'The chart shows up once you log a transaction 📊')}</div>
               </div>`}
        </div>

        <div class="card">
          <div class="card-title"><ion-icon name="pie-chart" style="color:var(--fin)"></ion-icon>${tr('Kategori Pengeluaran', 'Spending Categories')} — ${BULAN[+this.month.slice(5) - 1]} ${this.month.slice(0, 4)}</div>
          ${kategoriItems.length ? `
            <div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap;margin-top:16px;">
              ${donutSVG(kategoriItems)}
              <div class="legend" style="flex:1;min-width:150px;">
                ${kategoriItems.map(k => `
                  <div class="lg-item">
                    <span class="lg-dot" style="background:${k.color}"></span>
                    ${this._emoji('keluar', k.label)} ${esc(this._katLabel('keluar', k.label))}
                    <span class="lg-val">${fmtRp(k.value)} · ${Math.round(k.value / totalKeluar * 100)}%</span>
                  </div>`).join('')}
              </div>
            </div>
            <div class="disclaimer" style="margin-top:18px;">
              <ion-icon name="bulb-outline"></ion-icon>
              <span>${tr(
                `Pengeluaran terbesarmu bulan ini: <b>${this._emoji('keluar', terbesar.label)} ${esc(this._katLabel('keluar', terbesar.label))}</b> (${fmtRp(terbesar.value)}, ${Math.round(terbesar.value / totalKeluar * 100)}% dari total). ${terbesar.label === 'Tabungan' ? 'Mantap — menabung memang pengeluaran terbaik! 🐖' : 'Coba cek: masih bisa dihemat, nggak? 😉'}`,
                `Your biggest spending this month: <b>${this._emoji('keluar', terbesar.label)} ${esc(this._katLabel('keluar', terbesar.label))}</b> (${fmtRp(terbesar.value)}, ${Math.round(terbesar.value / totalKeluar * 100)}% of total). ${terbesar.label === 'Tabungan' ? 'Nice — saving is the best kind of spending! 🐖' : 'Worth a check: could you trim it down? 😉'}`
              )}</span>
            </div>` : `
            <div class="empty-state" style="padding:28px 10px;">
              <ion-icon name="pie-chart-outline"></ion-icon>
              <div class="es-title">${tr('Belum ada pengeluaran bulan ini', 'No spending this month yet')}</div>
              <div class="es-sub">${tr('Catat transaksi dulu, laporannya menyusul ✨', 'Log a transaction first — the report will follow ✨')}</div>
            </div>`}
        </div>
      </div>`;

    $('#rpMonth', el).onchange = e => { this.month = e.target.value || monthStr(); App.refresh(); };
  }
};
