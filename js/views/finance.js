/* ============================================================
   TUMARA — Keuangan
   Tab: Transaksi · Target · Laporan
   ============================================================ */

const Fin = {
  tab: 'transaksi',   // 'transaksi' | 'target' | 'laporan'
  month: monthStr(),

  KATEGORI: {
    masuk: [
      { key: 'Uang Saku', emoji: '💵' },
      { key: 'Hadiah',    emoji: '🎁' },
      { key: 'Beasiswa',  emoji: '🎓' },
      { key: 'Lainnya',   emoji: '✨' }
    ],
    keluar: [
      { key: 'Makanan & Jajan',   emoji: '🍜' },
      { key: 'Transportasi',      emoji: '🚌' },
      { key: 'Hiburan',           emoji: '🎮' },
      { key: 'Alat Tulis & Buku', emoji: '📚' },
      { key: 'Tabungan',          emoji: '🐖' },
      { key: 'Lainnya',           emoji: '✨' }
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

  async render(el) {
    el.innerHTML = `
      <div class="tabs">
        <button class="tab ${this.tab === 'transaksi' ? 'active' : ''}" data-tab="transaksi"><ion-icon name="swap-vertical-outline"></ion-icon>Transaksi</button>
        <button class="tab ${this.tab === 'target' ? 'active' : ''}" data-tab="target"><ion-icon name="flag-outline"></ion-icon>Target</button>
        <button class="tab ${this.tab === 'laporan' ? 'active' : ''}" data-tab="laporan"><ion-icon name="pie-chart-outline"></ion-icon>Laporan</button>
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
        <button class="btn btn-fin btn-sm" id="addTx"><ion-icon name="add"></ion-icon> Transaksi</button>
      </div>

      <div class="grid grid-3">
        <div class="card money-stat">
          <div class="ms-label"><ion-icon name="arrow-down-circle" style="color:var(--brand);font-size:1.1rem;"></ion-icon> Pemasukan</div>
          <div class="ms-value tx-amount-in">${fmtRp(masuk)}</div>
        </div>
        <div class="card money-stat">
          <div class="ms-label"><ion-icon name="arrow-up-circle" style="color:var(--danger);font-size:1.1rem;"></ion-icon> Pengeluaran</div>
          <div class="ms-value tx-amount-out">${fmtRp(keluar)}</div>
        </div>
        <div class="card money-stat">
          <div class="ms-label"><ion-icon name="wallet" style="color:var(--fin);font-size:1.1rem;"></ion-icon> Sisa Saldo</div>
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
                <div style="font-weight:700;font-size:.9rem;">${esc(t.kategori)}</div>
                ${t.catatan ? `<div style="font-size:.78rem;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.catatan)}</div>` : ''}
              </div>
              <span class="${t.tipe === 'masuk' ? 'tx-amount-in' : 'tx-amount-out'}" style="font-size:.9rem;">${t.tipe === 'masuk' ? '+' : '−'}${fmtRp(t.jumlah)}</span>
              <button class="mini-icon-btn" data-edit="${t.id}"><ion-icon name="create-outline"></ion-icon></button>
              <button class="mini-icon-btn danger" data-del="${t.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`).join('')}
        </div>`).join('') : `
        <div class="card empty-state" style="margin-top:18px;">
          <ion-icon name="receipt-outline"></ion-icon>
          <div class="es-title">Belum ada transaksi bulan ini</div>
          <div class="es-sub">Catat uang saku atau jajanmu — biar keuangan tetap terpantau 💰</div>
        </div>`}`;

    $('#txMonth', el).onchange = e => { this.month = e.target.value || monthStr(); App.refresh(); };
    $('#addTx', el).onclick = () => this.openTxModal();
    $$('[data-edit]', el).forEach(b => b.onclick = () => this.openTxModal(all.find(t => t.id === b.dataset.edit)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog('Hapus transaksi ini?', { danger: true, okText: 'Hapus' })) return;
      await DB.remove('transactions', b.dataset.del);
      toast('Transaksi dihapus.');
      App.refresh();
    });
  },

  // dipanggil juga dari dashboard.js — jangan ganti nama
  openTxModal(tx = null) {
    let tipe = tx?.tipe || 'keluar';

    const opsiKategori = t => this.KATEGORI[t]
      .map(k => `<option value="${esc(k.key)}" ${tx?.kategori === k.key ? 'selected' : ''}>${k.emoji} ${esc(k.key)}</option>`)
      .join('');

    openModal({
      title: tx ? 'Ubah Transaksi' : 'Transaksi Baru',
      body: `
        <div class="field">
          <label>Tipe</label>
          <div class="radio-cards" id="mTipe">
            <div class="radio-card ${tipe === 'masuk' ? 'selected' : ''}" data-val="masuk"><ion-icon name="arrow-down-circle-outline"></ion-icon>Pemasukan</div>
            <div class="radio-card ${tipe === 'keluar' ? 'selected' : ''}" data-val="keluar"><ion-icon name="arrow-up-circle-outline"></ion-icon>Pengeluaran</div>
          </div>
        </div>
        <div class="field">
          <label>Jumlah</label>
          <div class="input-group">
            <input type="number" class="input" id="mJumlah" min="0" placeholder="mis. 15000" value="${tx?.jumlah ?? ''}">
            <span class="input-unit">Rp</span>
          </div>
        </div>
        <div class="field">
          <label>Kategori</label>
          <select class="select" id="mKategori">${opsiKategori(tipe)}</select>
        </div>
        <div class="field">
          <label>Tanggal</label>
          <input type="date" class="input" id="mTanggal" value="${tx?.tanggal || todayStr()}">
        </div>
        <div class="field">
          <label>Catatan <span style="font-weight:500;color:var(--text-3)">(opsional)</span></label>
          <input type="text" class="input" id="mCatatan" placeholder="mis. bakso depan sekolah" value="${esc(tx?.catatan || '')}">
        </div>
        <button class="btn btn-fin btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tx ? 'Simpan Perubahan' : 'Tambah Transaksi'}</button>`,
      onMount: m => {
        $$('#mTipe .radio-card', m).forEach(c => c.onclick = () => {
          tipe = c.dataset.val;
          $$('#mTipe .radio-card', m).forEach(x => x.classList.toggle('selected', x === c));
          $('#mKategori', m).innerHTML = opsiKategori(tipe);
        });
        $('#mSave', m).onclick = async () => {
          const jumlah = +$('#mJumlah', m).value;
          const tanggal = $('#mTanggal', m).value;
          if (!jumlah || jumlah <= 0) return toast('Masukkan jumlah yang valid.', 'warning');
          if (!tanggal) return toast('Pilih tanggal transaksi.', 'warning');
          const data = {
            tanggal, tipe, jumlah,
            kategori: $('#mKategori', m).value,
            catatan: $('#mCatatan', m).value.trim()
          };
          if (tx) await DB.update('transactions', tx.id, data);
          else await DB.add('transactions', data);
          this.month = tanggal.slice(0, 7);
          closeModal();
          toast(tx ? 'Transaksi diperbarui.' : 'Transaksi dicatat 💰');
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
        <div style="font-size:.88rem;color:var(--text-3);font-weight:600;">Nabung Rp X untuk Y sampai tanggal Z 🎯</div>
        <button class="btn btn-fin btn-sm" id="addGoal"><ion-icon name="add"></ion-icon> Target Baru</button>
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
                ${tercapai ? '<span class="badge badge-green">🎉 Tercapai!</span>' : (g.tenggat ? deadlineBadge(g.tenggat) : '')}
              </div>
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin:14px 0 7px;">
                <span style="font-weight:800;font-size:1.05rem;">${fmtRp(g.terkumpul)}</span>
                <span style="font-size:.8rem;color:var(--text-3);font-weight:600;">dari ${fmtRp(g.target)} · ${pct}%</span>
              </div>
              <div class="progress"><div class="progress-fill amber" style="width:${pct}%"></div></div>
              <div style="display:flex;gap:8px;margin-top:16px;">
                ${!tercapai ? `<button class="btn btn-fin btn-sm" data-save="${g.id}"><ion-icon name="add"></ion-icon> Tabung</button>` : ''}
                <button class="mini-icon-btn" style="margin-left:auto;" data-edit="${g.id}"><ion-icon name="create-outline"></ion-icon></button>
                <button class="mini-icon-btn danger" data-del="${g.id}"><ion-icon name="trash-outline"></ion-icon></button>
              </div>
            </div>`;
          }).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="flag-outline"></ion-icon>
          <div class="es-title">Belum ada target menabung</div>
          <div class="es-sub">Mau beli sesuatu? Buat target dan cicil sedikit demi sedikit 🐖</div>
        </div>`}`;

    $('#addGoal', el).onclick = () => this._goalModal();
    $$('[data-edit]', el).forEach(b => b.onclick = () => this._goalModal(goals.find(g => g.id === b.dataset.edit)));
    $$('[data-save]', el).forEach(b => b.onclick = () => this._saveToGoalModal(goals.find(g => g.id === b.dataset.save)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog('Hapus target menabung ini?', { danger: true, okText: 'Hapus' })) return;
      await DB.remove('goals', b.dataset.del);
      toast('Target dihapus.');
      App.refresh();
    });
  },

  _goalModal(goal = null) {
    openModal({
      title: goal ? 'Ubah Target' : 'Target Menabung Baru',
      body: `
        <div class="field">
          <label>Menabung untuk apa?</label>
          <input type="text" class="input" id="mNama" placeholder="mis. Sepatu futsal baru" value="${esc(goal?.nama || '')}">
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>Jumlah target</label>
            <div class="input-group">
              <input type="number" class="input" id="mTarget" min="0" placeholder="500000" value="${goal?.target ?? ''}">
              <span class="input-unit">Rp</span>
            </div>
          </div>
          <div class="field">
            <label>Tenggat</label>
            <input type="date" class="input" id="mTenggat" value="${goal?.tenggat || ''}">
          </div>
        </div>
        ${!goal ? `
        <div class="field">
          <label>Sudah terkumpul <span style="font-weight:500;color:var(--text-3)">(opsional)</span></label>
          <div class="input-group">
            <input type="number" class="input" id="mAwal" min="0" placeholder="0" value="0">
            <span class="input-unit">Rp</span>
          </div>
        </div>` : ''}
        <button class="btn btn-fin btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${goal ? 'Simpan Perubahan' : 'Buat Target'}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          const target = +$('#mTarget', m).value;
          if (!nama) return toast('Beri nama targetmu.', 'warning');
          if (!target || target <= 0) return toast('Masukkan jumlah target yang valid.', 'warning');
          const data = { nama, target, tenggat: $('#mTenggat', m).value };
          if (goal) await DB.update('goals', goal.id, data);
          else await DB.add('goals', { ...data, terkumpul: Math.max(0, +$('#mAwal', m).value || 0) });
          closeModal();
          toast(goal ? 'Target diperbarui.' : 'Target dibuat — semangat menabung! 🎯');
          App.refresh();
        };
      }
    });
  },

  _saveToGoalModal(goal) {
    const sisa = Math.max(0, goal.target - goal.terkumpul);
    openModal({
      title: `Tabung: ${goal.nama}`,
      body: `
        <p style="font-size:.85rem;color:var(--text-3);margin-bottom:14px;">
          Terkumpul <b>${fmtRp(goal.terkumpul)}</b> dari ${fmtRp(goal.target)} — kurang <b>${fmtRp(sisa)}</b> lagi.
        </p>
        <div class="field">
          <label>Jumlah yang ditabung</label>
          <div class="input-group">
            <input type="number" class="input" id="mJumlah" min="0" placeholder="mis. 20000">
            <span class="input-unit">Rp</span>
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:10px;font-size:.85rem;font-weight:600;color:var(--text-2);cursor:pointer;margin:4px 0 18px;">
          <input type="checkbox" id="mCatatTx" checked style="width:17px;height:17px;accent-color:var(--fin);">
          Catat sebagai transaksi pengeluaran (kategori Tabungan)
        </label>
        <button class="btn btn-fin btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> Tabung Sekarang</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const jumlah = +$('#mJumlah', m).value;
          if (!jumlah || jumlah <= 0) return toast('Masukkan jumlah yang valid.', 'warning');
          const total = goal.terkumpul + jumlah;
          await DB.update('goals', goal.id, { terkumpul: total });
          if ($('#mCatatTx', m).checked) {
            await DB.add('transactions', {
              tanggal: todayStr(), tipe: 'keluar', jumlah,
              kategori: 'Tabungan', catatan: `Menabung: ${goal.nama}`
            });
          }
          closeModal();
          toast(total >= goal.target
            ? `Target "${goal.nama}" tercapai — keren banget! 🎉`
            : `${fmtRp(jumlah)} masuk celengan 🐖`);
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

    const fmtRingkas = v => v >= 1000000 ? (v / 1000000).toFixed(1).replace('.0', '') + 'jt'
      : v >= 1000 ? Math.round(v / 1000) + 'rb' : v;

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <input type="month" class="input" id="rpMonth" value="${this.month}" style="max-width:180px;">
        ${terbesar ? `<span class="badge badge-amber">Total pengeluaran: ${fmtRp(totalKeluar)}</span>` : ''}
      </div>

      <div class="grid grid-2" style="align-items:start;">
        <div class="card chart-box">
          <div class="card-title"><ion-icon name="bar-chart" style="color:var(--fin)"></ion-icon>Pengeluaran 7 Hari Terakhir</div>
          ${adaBar
            ? `<div style="margin-top:14px;">${barChartSVG(hari7, { color: 'var(--fin)', fmtVal: fmtRingkas })}</div>`
            : `<div class="empty-state" style="padding:28px 10px;">
                 <ion-icon name="bar-chart-outline"></ion-icon>
                 <div class="es-title">Belum ada pengeluaran minggu ini</div>
                 <div class="es-sub">Grafik muncul setelah kamu mencatat transaksi 📊</div>
               </div>`}
        </div>

        <div class="card">
          <div class="card-title"><ion-icon name="pie-chart" style="color:var(--fin)"></ion-icon>Kategori Pengeluaran — ${BULAN[+this.month.slice(5) - 1]} ${this.month.slice(0, 4)}</div>
          ${kategoriItems.length ? `
            <div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap;margin-top:16px;">
              ${donutSVG(kategoriItems)}
              <div class="legend" style="flex:1;min-width:150px;">
                ${kategoriItems.map(k => `
                  <div class="lg-item">
                    <span class="lg-dot" style="background:${k.color}"></span>
                    ${this._emoji('keluar', k.label)} ${esc(k.label)}
                    <span class="lg-val">${fmtRp(k.value)} · ${Math.round(k.value / totalKeluar * 100)}%</span>
                  </div>`).join('')}
              </div>
            </div>
            <div class="disclaimer" style="margin-top:18px;">
              <ion-icon name="bulb-outline"></ion-icon>
              <span>Pengeluaran terbesarmu bulan ini: <b>${this._emoji('keluar', terbesar.label)} ${esc(terbesar.label)}</b> (${fmtRp(terbesar.value)}, ${Math.round(terbesar.value / totalKeluar * 100)}% dari total). ${terbesar.label === 'Tabungan' ? 'Mantap — menabung memang pengeluaran terbaik! 🐖' : 'Coba cek: masih bisa dihemat, nggak? 😉'}</span>
            </div>` : `
            <div class="empty-state" style="padding:28px 10px;">
              <ion-icon name="pie-chart-outline"></ion-icon>
              <div class="es-title">Belum ada pengeluaran bulan ini</div>
              <div class="es-sub">Catat transaksi dulu, laporannya menyusul ✨</div>
            </div>`}
        </div>
      </div>`;

    $('#rpMonth', el).onchange = e => { this.month = e.target.value || monthStr(); App.refresh(); };
  }
};
