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
      { key: 'Beasiswa',  en: 'Scholarship', emoji: '🎓' }
    ],
    keluar: [
      { key: 'Makanan & Jajan',   en: 'Food & Snacks',      emoji: '🍜' },
      { key: 'Transportasi',      en: 'Transport',          emoji: '🚌' },
      { key: 'Hiburan',           en: 'Entertainment',      emoji: '🎮' },
      { key: 'Alat Tulis & Buku', en: 'Stationery & Books', emoji: '📚' },
      { key: 'Tabungan',          en: 'Savings',            emoji: '🐖' }
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

  _unlocked: false,

  async render(el) {
    // Kunci PIN keuangan (opsional) — melindungi data finansial sensitif
    if (DB.user?.finPin && !this._unlocked) return this._renderLock(el);

    el.innerHTML = `
      <div class="tabs">
        <button class="tab ${this.tab === 'transaksi' ? 'active' : ''}" data-tab="transaksi"><ion-icon name="swap-vertical-outline"></ion-icon>${tr('Transaksi', 'Transactions')}</button>
        <button class="tab ${this.tab === 'dompet' ? 'active' : ''}" data-tab="dompet"><ion-icon name="wallet-outline"></ion-icon>${tr('Dompet & Aset', 'Wallets & Assets')}</button>
        <button class="tab ${this.tab === 'anggaran' ? 'active' : ''}" data-tab="anggaran"><ion-icon name="pricetags-outline"></ion-icon>${tr('Anggaran', 'Budget')}</button>
        <button class="tab ${this.tab === 'target' ? 'active' : ''}" data-tab="target"><ion-icon name="flag-outline"></ion-icon>${tr('Target', 'Goals')}</button>
        <button class="tab ${this.tab === 'utang' ? 'active' : ''}" data-tab="utang"><ion-icon name="git-compare-outline"></ion-icon>${tr('Utang', 'Debts')}</button>
        <button class="tab ${this.tab === 'laporan' ? 'active' : ''}" data-tab="laporan"><ion-icon name="pie-chart-outline"></ion-icon>${tr('Laporan', 'Report')}</button>
      </div>
      <div id="finBody"></div>`;

    $$('.tab', el).forEach(t => t.onclick = () => { this.tab = t.dataset.tab; App.saveTab(this.tab); this.render(el); });

    const body = $('#finBody', el);
    if (this.tab === 'transaksi') await this.renderTx(body);
    else if (this.tab === 'dompet') await this.renderWallets(body);
    else if (this.tab === 'anggaran') await this.renderBudget(body);
    else if (this.tab === 'target') await this.renderGoals(body);
    else if (this.tab === 'utang') await this.renderDebts(body);
    else await this.renderReport(body);
  },

  async _pinHash(pin) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tumara-pin::' + pin));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) { return 'p' + pin; }
  },

  _renderLock(el) {
    el.innerHTML = `
      <div class="card" style="max-width:360px;margin:40px auto;text-align:center;">
        <div style="font-size:2.4rem;">🔒</div>
        <div class="card-title" style="justify-content:center;margin-top:8px;">${tr('Keuangan Terkunci', 'Finance Locked')}</div>
        <p style="font-size:.85rem;color:var(--text-3);margin:6px 0 18px;">${tr('Masukkan PIN untuk membuka data keuanganmu.', 'Enter your PIN to unlock your finance data.')}</p>
        <input type="password" inputmode="numeric" class="input" id="pinInput" maxlength="6" placeholder="••••" style="text-align:center;letter-spacing:8px;font-size:1.4rem;max-width:180px;margin:0 auto 16px;">
        <button class="btn btn-fin btn-block" id="pinUnlock"><ion-icon name="lock-open-outline"></ion-icon> ${tr('Buka', 'Unlock')}</button>
      </div>`;
    const tryUnlock = async () => {
      const pin = $('#pinInput', el).value;
      if (await this._pinHash(pin) === DB.user.finPin) { this._unlocked = true; this.render(el); }
      else { toast(tr('PIN salah.', 'Wrong PIN.'), 'error'); $('#pinInput', el).value = ''; }
    };
    $('#pinUnlock', el).onclick = tryUnlock;
    $('#pinInput', el).onkeydown = e => { if (e.key === 'Enter') tryUnlock(); };
    setTimeout(() => $('#pinInput', el)?.focus(), 60);
  },

  /* ============ TAB: DOMPET & ASET ============ */

  async renderWallets(el) {
    const [wallets, assets] = await Promise.all([DB.list('wallets'), DB.list('assets')]);
    const totalDompet = wallets.reduce((s, w) => s + (+w.saldo || 0), 0);
    const totalAset = assets.reduce((s, a) => s + (+a.nilai || 0), 0);
    const pinOn = !!DB.user?.finPin;
    const walletIcon = { tunai: '💵', bank: '🏦', ewallet: '📱', lainnya: '💳' };
    const assetIcon = { emas: '🥇', saham: '📈', reksadana: '📊', kripto: '₿', properti: '🏠', lainnya: '💰' };

    el.innerHTML = `
      <div class="grid grid-2 keep-2" style="margin-bottom:16px;">
        <div class="card money-stat"><div class="ms-label">👛 ${tr('Total Saldo Dompet', 'Total Wallet Balance')}</div><div class="ms-value">${fmtRp(totalDompet)}</div></div>
        <div class="card money-stat"><div class="ms-label">📈 ${tr('Total Nilai Aset', 'Total Asset Value')}</div><div class="ms-value">${fmtRp(totalAset)}</div></div>
      </div>

      <div class="section-head"><h2>${tr('Dompet / Rekening', 'Wallets / Accounts')}</h2><button class="btn btn-fin btn-sm" id="addWallet"><ion-icon name="add"></ion-icon> ${tr('Dompet', 'Wallet')}</button></div>
      ${wallets.length ? `<div class="grid grid-2">${wallets.map(w => `
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="font-weight:700;">${walletIcon[w.tipe] || '💳'} ${esc(w.nama)}</div>
            <div style="display:flex;gap:4px;"><button class="mini-icon-btn" data-editw="${w.id}"><ion-icon name="create-outline"></ion-icon></button><button class="mini-icon-btn danger" data-delw="${w.id}"><ion-icon name="trash-outline"></ion-icon></button></div>
          </div>
          <div class="stat-row" style="margin-top:8px;"><span class="stat-num" style="font-size:1.3rem;">${fmtRp(w.saldo)}</span></div>
        </div>`).join('')}</div>` : `<div style="font-size:.83rem;color:var(--text-3);text-align:center;padding:12px;">${tr('Tambahkan dompet: tunai, bank, atau e-wallet (saldo manual).', 'Add wallets: cash, bank, or e-wallet (manual balance).')}</div>`}

      <div class="section-head" style="margin-top:22px;"><h2>${tr('Aset & Investasi', 'Assets & Investments')}</h2><button class="btn btn-fin btn-sm" id="addAsset"><ion-icon name="add"></ion-icon> ${tr('Aset', 'Asset')}</button></div>
      ${assets.length ? `<div style="display:flex;flex-direction:column;gap:9px;">${assets.map(a => `
        <div class="list-item">
          <div class="item-icon" style="background:var(--fin-soft);font-size:1.1rem;">${assetIcon[a.jenis] || '💰'}</div>
          <div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:.9rem;">${esc(a.nama)}</div><div style="font-size:.76rem;color:var(--text-3);text-transform:capitalize;">${esc(a.jenis)}${a.jumlah ? ' · ' + esc(a.jumlah) : ''}</div></div>
          <span style="font-weight:700;font-size:.9rem;">${fmtRp(a.nilai)}</span>
          <button class="mini-icon-btn" data-edita="${a.id}"><ion-icon name="create-outline"></ion-icon></button>
          <button class="mini-icon-btn danger" data-dela="${a.id}"><ion-icon name="trash-outline"></ion-icon></button>
        </div>`).join('')}</div>` : `<div style="font-size:.83rem;color:var(--text-3);text-align:center;padding:12px;">${tr('Pantau pertumbuhan emas, saham, reksa dana, dll.', 'Track growth of gold, stocks, mutual funds, etc.')}</div>`}

      <div class="section-head" style="margin-top:22px;"><h2>🔐 ${tr('Keamanan', 'Security')}</h2></div>
      <div class="card">
        <div class="setting-row" style="cursor:pointer;" id="pinToggle">
          <ion-icon name="lock-closed-outline" style="font-size:1.2rem;color:var(--text-3);"></ion-icon>
          <div class="sr-text"><div class="sr-title">${tr('Kunci PIN Keuangan', 'Finance PIN Lock')}</div><div class="sr-sub">${pinOn ? tr('Aktif — ketuk untuk ubah/matikan', 'On — tap to change/turn off') : tr('Lindungi data keuangan dengan PIN', 'Protect finance data with a PIN')}</div></div>
          <span class="badge ${pinOn ? 'badge-green' : 'badge-gray'}">${pinOn ? tr('Aktif', 'On') : tr('Nonaktif', 'Off')}</span>
        </div>
      </div>
      <div class="disclaimer" style="margin-top:14px;"><ion-icon name="information-circle"></ion-icon><span>${tr('Saldo dompet & aset diisi manual (Tumara tidak terhubung ke rekening bank demi keamanan). PIN melindungi tampilan di perangkat ini.', 'Wallet & asset balances are entered manually (Tumara does not connect to bank accounts for safety). The PIN protects the view on this device.')}</span></div>`;

    $('#addWallet', el).onclick = () => this._walletModal();
    $('#addAsset', el).onclick = () => this._assetModal();
    $$('[data-editw]', el).forEach(b => b.onclick = () => this._walletModal(wallets.find(w => w.id === b.dataset.editw)));
    $$('[data-edita]', el).forEach(b => b.onclick = () => this._assetModal(assets.find(a => a.id === b.dataset.edita)));
    $$('[data-delw]', el).forEach(b => b.onclick = async () => { if (!await confirmDialog(tr('Hapus dompet ini?', 'Delete this wallet?'), { danger: true, okText: tr('Hapus', 'Delete') })) return; await DB.remove('wallets', b.dataset.delw); toast(tr('Dompet dihapus.', 'Wallet deleted.')); App.refresh(); });
    $$('[data-dela]', el).forEach(b => b.onclick = async () => { if (!await confirmDialog(tr('Hapus aset ini?', 'Delete this asset?'), { danger: true, okText: tr('Hapus', 'Delete') })) return; await DB.remove('assets', b.dataset.dela); toast(tr('Aset dihapus.', 'Asset deleted.')); App.refresh(); });
    $('#pinToggle', el).onclick = () => this._pinModal();
  },

  _walletModal(w = null) {
    const tipe = [['tunai', tr('Tunai', 'Cash')], ['bank', tr('Bank', 'Bank')], ['ewallet', 'E-wallet'], ['lainnya', tr('Lainnya', 'Other')]];
    openModal({
      title: w ? tr('Ubah Dompet', 'Edit Wallet') : tr('Dompet Baru', 'New Wallet'),
      body: `
        <div class="field"><label>${tr('Nama dompet', 'Wallet name')}</label><input type="text" class="input" id="mNama" placeholder="${tr('mis. BCA / GoPay / Tunai', 'e.g. BCA / GoPay / Cash')}" value="${esc(w?.nama || '')}"></div>
        <div class="field"><label>${tr('Jenis', 'Type')}</label><select class="select" id="mTipe">${tipe.map(([v, l]) => `<option value="${v}" ${w?.tipe === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>${tr('Saldo', 'Balance')}</label><div class="input-group"><input type="number" class="input" id="mSaldo" min="0" value="${w?.saldo ?? ''}"><span class="input-unit">Rp</span></div></div>
        <button class="btn btn-fin btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => { $('#mSave', m).onclick = async () => {
        const nama = $('#mNama', m).value.trim();
        if (!nama) return toast(tr('Isi nama dompet.', 'Enter a wallet name.'), 'warning');
        const data = { nama, tipe: $('#mTipe', m).value, saldo: +$('#mSaldo', m).value || 0 };
        if (w) await DB.update('wallets', w.id, data); else await DB.add('wallets', data);
        closeModal(); toast(tr('Dompet tersimpan.', 'Wallet saved.')); App.refresh();
      }; }
    });
  },

  _assetModal(a = null) {
    const jenis = [['emas', tr('Emas', 'Gold')], ['saham', tr('Saham', 'Stocks')], ['reksadana', tr('Reksa dana', 'Mutual fund')], ['kripto', tr('Kripto', 'Crypto')], ['properti', tr('Properti', 'Property')], ['lainnya', tr('Lainnya', 'Other')]];
    openModal({
      title: a ? tr('Ubah Aset', 'Edit Asset') : tr('Aset / Investasi Baru', 'New Asset / Investment'),
      body: `
        <div class="field"><label>${tr('Nama aset', 'Asset name')}</label><input type="text" class="input" id="mNama" placeholder="${tr('mis. Emas Antam 5gr', 'e.g. Gold 5g')}" value="${esc(a?.nama || '')}"></div>
        <div class="field"><label>${tr('Jenis', 'Type')}</label><select class="select" id="mJenis">${jenis.map(([v, l]) => `<option value="${v}" ${a?.jenis === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field"><label>${tr('Jumlah/unit', 'Qty/unit')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mJml" placeholder="${tr('mis. 5 gr', 'e.g. 5 g')}" value="${esc(a?.jumlah || '')}"></div>
          <div class="field"><label>${tr('Nilai sekarang', 'Current value')}</label><div class="input-group"><input type="number" class="input" id="mNilai" min="0" value="${a?.nilai ?? ''}"><span class="input-unit">Rp</span></div></div>
        </div>
        <button class="btn btn-fin btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => { $('#mSave', m).onclick = async () => {
        const nama = $('#mNama', m).value.trim();
        const nilai = +$('#mNilai', m).value;
        if (!nama) return toast(tr('Isi nama aset.', 'Enter an asset name.'), 'warning');
        if (!nilai || nilai <= 0) return toast(tr('Isi nilai aset.', 'Enter asset value.'), 'warning');
        const data = { nama, jenis: $('#mJenis', m).value, jumlah: $('#mJml', m).value.trim(), nilai };
        if (a) await DB.update('assets', a.id, data); else await DB.add('assets', data);
        closeModal(); toast(tr('Aset tersimpan.', 'Asset saved.')); App.refresh();
      }; }
    });
  },

  _pinModal() {
    const on = !!DB.user?.finPin;
    openModal({
      title: tr('Kunci PIN Keuangan', 'Finance PIN Lock'),
      body: `
        ${on ? `<p style="font-size:.84rem;color:var(--text-3);margin-bottom:12px;">${tr('PIN aktif. Buat PIN baru untuk mengubah, atau matikan.', 'PIN is on. Enter a new PIN to change, or turn it off.')}</p>` : `<p style="font-size:.84rem;color:var(--text-3);margin-bottom:12px;">${tr('Buat PIN 4–6 digit untuk mengunci menu Keuangan.', 'Create a 4–6 digit PIN to lock the Finance menu.')}</p>`}
        <div class="field"><label>${tr('PIN baru (4–6 digit)', 'New PIN (4–6 digits)')}</label><input type="password" inputmode="numeric" maxlength="6" class="input" id="mPin" placeholder="••••"></div>
        <div style="display:flex;gap:10px;">
          ${on ? `<button class="btn btn-soft-danger" id="mOff">${tr('Matikan', 'Turn off')}</button>` : ''}
          <button class="btn btn-fin btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan PIN', 'Save PIN')}</button>
        </div>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const pin = $('#mPin', m).value;
          if (!/^\d{4,6}$/.test(pin)) return toast(tr('PIN harus 4–6 digit angka.', 'PIN must be 4–6 digits.'), 'warning');
          await DB.updateUser({ finPin: await this._pinHash(pin) });
          this._unlocked = true;
          closeModal(); toast(tr('PIN keuangan aktif 🔒', 'Finance PIN enabled 🔒')); App.refresh();
        };
        const off = $('#mOff', m);
        if (off) off.onclick = async () => { await DB.updateUser({ finPin: '' }); this._unlocked = true; closeModal(); toast(tr('PIN dimatikan.', 'PIN turned off.')); App.refresh(); };
      }
    });
  },

  /* ============ TAB: ANGGARAN (BUDGET) ============ */

  async renderBudget(el) {
    const [budgets, all] = await Promise.all([DB.list('budgets'), DB.list('transactions')]);
    const txBulan = all.filter(t => t.tipe === 'keluar' && (t.tanggal || '').startsWith(this.month));
    const terpakaiPer = {};
    txBulan.forEach(t => { terpakaiPer[t.kategori] = (terpakaiPer[t.kategori] || 0) + t.jumlah; });

    const kategoriKeluar = this.KATEGORI.keluar;
    const budgetsBulanIni = this._budgetsForMonth(budgets, this.month);

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <input type="month" class="input" id="bgMonth" value="${this.month}" style="max-width:180px;">
        <button class="btn btn-fin btn-sm" id="setBudget"><ion-icon name="create-outline"></ion-icon> ${tr('Atur Anggaran', 'Set Budget')}</button>
      </div>

      ${budgetsBulanIni.length ? `
        <div class="grid grid-2">
          ${budgetsBulanIni.map(b => {
            const pakai = terpakaiPer[b.kategori] || 0;
            const pct = b.limit > 0 ? Math.round(pakai / b.limit * 100) : 0;
            const over = pakai > b.limit;
            const near = !over && pct >= 80;
            const warna = over ? 'var(--danger)' : near ? 'var(--fin)' : 'var(--brand)';
            return `
            <div class="card">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <div class="card-title" style="margin:0;">${this._emoji('keluar', b.kategori)} ${esc(this._katLabel('keluar', b.kategori))}</div>
                ${over ? `<span class="badge badge-red"><ion-icon name="alert-circle"></ion-icon> ${tr('Lewat batas!', 'Over budget!')}</span>` : near ? `<span class="badge badge-amber">${tr('Hampir habis', 'Almost used up')}</span>` : `<span class="badge badge-green">${tr('Aman', 'On track')}</span>`}
              </div>
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin:12px 0 7px;">
                <span style="font-weight:800;font-size:1.05rem;color:${warna};">${fmtRp(pakai)}</span>
                <span style="font-size:.8rem;color:var(--text-3);font-weight:600;">${tr('dari', 'of')} ${fmtRp(b.limit)} · ${pct}%</span>
              </div>
              <div class="progress"><div class="progress-fill" style="width:${clamp(pct, 0, 100)}%;background:${warna};"></div></div>
              <div style="font-size:.8rem;color:${over ? 'var(--danger)' : 'var(--text-3)'};margin-top:8px;">
                ${over ? tr(`Kelebihan ${fmtRp(pakai - b.limit)} 😬`, `Over by ${fmtRp(pakai - b.limit)} 😬`) : tr(`Sisa ${fmtRp(b.limit - pakai)}`, `${fmtRp(b.limit - pakai)} left`)}
              </div>
            </div>`;
          }).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="pricetags-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada anggaran', 'No budget set yet')}</div>
          <div class="es-sub">${tr('Tetapkan batas pengeluaran per kategori agar tidak boros 💡', 'Set spending limits per category to avoid overspending 💡')}</div>
        </div>`}`;

    $('#bgMonth', el).onchange = e => { this.month = e.target.value || monthStr(); App.refresh(); };
    $('#setBudget', el).onclick = () => this._budgetModal(budgetsBulanIni, kategoriKeluar);
  },

  // Resolve budgets yang berlaku untuk `month`: utamakan dokumen khusus
  // bulan itu (bulan === month), fallback ke dokumen lama tanpa field
  // `bulan` (dianggap berlaku di semua bulan sampai diedit ulang untuk
  // bulan tertentu — lihat catatan kompatibilitas di design doc).
  _budgetsForMonth(budgets, month) {
    const forMonth = new Map(), legacy = new Map();
    budgets.forEach(b => {
      if (b.bulan === month) forMonth.set(b.kategori, b);
      else if (b.bulan == null) legacy.set(b.kategori, b);
    });
    const kategoriSet = new Set([...forMonth.keys(), ...legacy.keys()]);
    return [...kategoriSet].map(k => forMonth.get(k) || legacy.get(k));
  },

  _budgetModal(budgetsBulanIni, kategoriKeluar) {
    const cur = k => budgetsBulanIni.find(b => b.kategori === k)?.limit || '';
    const fixedKeys = kategoriKeluar.map(k => k.key);
    // kategori kustom yang sudah punya anggaran (di luar daftar tetap), untuk bulan ini
    const kustomAda = budgetsBulanIni.filter(b => !fixedKeys.includes(b.kategori));

    const rowKustom = (nama, limit) => `
      <div class="field bg-kustom-row">
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="text" class="input bg-kustom-nama" placeholder="${tr('Nama kategori', 'Category name')}" value="${esc(nama)}" style="flex:1;min-width:0;">
          <div class="input-group" style="max-width:130px;"><input type="number" class="input bg-kustom-limit" min="0" placeholder="0" value="${limit || ''}"><span class="input-unit">Rp</span></div>
          <button type="button" class="mini-icon-btn danger bg-kustom-del" title="${tr('Hapus', 'Remove')}"><ion-icon name="trash-outline"></ion-icon></button>
        </div>
      </div>`;

    openModal({
      title: tr('Atur Anggaran Bulanan', 'Set Monthly Budget'),
      body: `
        <p style="font-size:.83rem;color:var(--text-3);margin-bottom:14px;">${tr('Isi batas pengeluaran per kategori. Kosongkan bila tidak ingin dibatasi.', 'Enter a spending limit per category. Leave blank for no limit.')}</p>
        ${kategoriKeluar.map((k, i) => `
          <div class="field">
            <label>${k.emoji} ${esc(tr(k.key, k.en))}</label>
            <div class="input-group"><input type="number" class="input" id="bg_${i}" min="0" placeholder="0" value="${cur(k.key)}"><span class="input-unit">Rp</span></div>
          </div>`).join('')}
        <label style="font-size:.83rem;color:var(--text-3);font-weight:600;">${tr('Kategori sendiri', 'Your own categories')}</label>
        <div id="bgKustomList">${kustomAda.map(b => rowKustom(b.kategori, b.limit)).join('')}</div>
        <button type="button" class="btn btn-ghost btn-block" id="bgAddKustom" style="margin-bottom:12px;"><ion-icon name="add"></ion-icon> ${tr('Tambah kategori sendiri', 'Add your own category')}</button>
        <button class="btn btn-fin btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan Anggaran', 'Save Budget')}</button>`,
      onMount: m => {
        const list = $('#bgKustomList', m);
        const wireDel = row => $('.bg-kustom-del', row).onclick = () => row.remove();
        $$('.bg-kustom-row', list).forEach(wireDel);
        $('#bgAddKustom', m).onclick = () => {
          const wrap = document.createElement('div');
          wrap.innerHTML = rowKustom('', '');
          const row = wrap.firstElementChild;
          list.appendChild(row);
          wireDel(row);
          $('.bg-kustom-nama', row).focus();
        };

        $('#mSave', m).onclick = async () => {
          const month = Fin.month;
          const docId = kategori => 'b_' + month.replace(/[^a-zA-Z0-9]+/g, '_') + '_' + kategori.replace(/[^a-zA-Z0-9]+/g, '_');
          // Simpan/hapus budget kategori `kat` untuk bulan ini. Dokumen lama
          // (bulan == null, fallback lintas-bulan) TIDAK PERNAH ditulis/dihapus
          // di sini — hanya dokumen khusus bulan `month` yang dibuat/diubah/
          // dihapus, supaya fallback lama tetap berlaku untuk bulan lain yang
          // belum pernah diedit.
          const saveKategori = async (kat, existing, val) => {
            if (val > 0) {
              if (existing && existing.bulan === month) await DB.update('budgets', existing.id, { limit: val });
              else await DB.set('budgets', docId(kat), { kategori: kat, bulan: month, limit: val });
            } else if (existing && existing.bulan === month) {
              await DB.remove('budgets', existing.id);
            }
          };

          for (let i = 0; i < kategoriKeluar.length; i++) {
            const k = kategoriKeluar[i];
            const val = +$(`#bg_${i}`, m).value || 0;
            const existing = budgetsBulanIni.find(b => b.kategori === k.key);
            await saveKategori(k.key, existing, val);
          }

          // kategori kustom
          const seen = new Set(fixedKeys);
          const masihAda = new Set();
          for (const row of $$('.bg-kustom-row', m)) {
            const nama = $('.bg-kustom-nama', row).value.trim();
            const val = +$('.bg-kustom-limit', row).value || 0;
            if (!nama || val <= 0 || seen.has(nama)) continue;
            seen.add(nama);
            masihAda.add(nama);
            const existing = budgetsBulanIni.find(b => b.kategori === nama);
            await saveKategori(nama, existing, val);
          }
          // hapus kategori kustom yang dihapus dari form (hanya dokumen bulan ini)
          for (const b of kustomAda) {
            if (!masihAda.has(b.kategori) && b.bulan === month) await DB.remove('budgets', b.id);
          }

          closeModal();
          toast(tr('Anggaran tersimpan 💡', 'Budget saved 💡'));
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: UTANG / PIUTANG ============ */

  async renderDebts(el) {
    const debts = (await DB.list('debts')).sort((a, b) => (b.dibuat || '') < (a.dibuat || '') ? -1 : 1);
    const utang = debts.filter(d => d.tipe === 'utang' && !d.lunas).reduce((s, d) => s + d.jumlah, 0);
    const piutang = debts.filter(d => d.tipe === 'piutang' && !d.lunas).reduce((s, d) => s + d.jumlah, 0);

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="font-size:.88rem;color:var(--text-3);font-weight:600;">${tr('Catat uang yang kamu pinjam & pinjamkan 🤝', 'Track money you owe & are owed 🤝')}</div>
        <button class="btn btn-fin btn-sm" id="addDebt"><ion-icon name="add"></ion-icon> ${tr('Catatan Baru', 'New Record')}</button>
      </div>

      <div class="grid grid-2 keep-2" style="margin-bottom:16px;">
        <div class="card money-stat"><div class="ms-label"><ion-icon name="arrow-up-circle" style="color:var(--danger);"></ion-icon> ${tr('Utang (aku pinjam)', 'I owe')}</div><div class="ms-value tx-amount-out">${fmtRp(utang)}</div></div>
        <div class="card money-stat"><div class="ms-label"><ion-icon name="arrow-down-circle" style="color:var(--brand);"></ion-icon> ${tr('Piutang (dipinjam)', 'Owed to me')}</div><div class="ms-value tx-amount-in">${fmtRp(piutang)}</div></div>
      </div>

      ${debts.length ? `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${debts.map(d => `
            <div class="list-item" style="${d.lunas ? 'opacity:.55;' : ''}">
              <div class="item-icon" style="background:${d.tipe === 'utang' ? 'var(--danger-soft)' : 'var(--brand-soft)'};color:${d.tipe === 'utang' ? 'var(--danger)' : 'var(--brand)'};"><ion-icon name="${d.tipe === 'utang' ? 'arrow-up-circle' : 'arrow-down-circle'}"></ion-icon></div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:.9rem;${d.lunas ? 'text-decoration:line-through;' : ''}">${esc(d.nama)}</div>
                <div style="font-size:.78rem;color:var(--text-3);">${d.tipe === 'utang' ? tr('Aku berutang', 'I owe') : tr('Dipinjam', 'Owed to me')}${d.tenggat ? ' · ' + fmtDate(d.tenggat, { short: true }) : ''}</div>
              </div>
              <span class="${d.tipe === 'utang' ? 'tx-amount-out' : 'tx-amount-in'}" style="font-size:.9rem;">${fmtRp(d.jumlah)}</span>
              <button class="mini-icon-btn" data-lunas="${d.id}" title="${d.lunas ? tr('Tandai belum lunas', 'Mark unpaid') : tr('Tandai lunas', 'Mark paid')}"><ion-icon name="${d.lunas ? 'refresh' : 'checkmark-circle'}"></ion-icon></button>
              <button class="mini-icon-btn danger" data-del="${d.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="git-compare-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada catatan utang/piutang', 'No debt records yet')}</div>
          <div class="es-sub">${tr('Biar tidak lupa siapa pinjam ke siapa 😉', "So you don't forget who owes whom 😉")}</div>
        </div>`}`;

    $('#addDebt', el).onclick = () => this._debtModal();
    $$('[data-lunas]', el).forEach(b => b.onclick = async () => {
      const d = debts.find(x => x.id === b.dataset.lunas);
      await DB.update('debts', d.id, { lunas: !d.lunas });
      if (!d.lunas) toast(tr('Lunas! 🎉', 'Paid off! 🎉'));
      App.refresh();
    });
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus catatan ini?', 'Delete this record?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      await DB.remove('debts', b.dataset.del);
      toast(tr('Catatan dihapus.', 'Record deleted.'));
      App.refresh();
    });
  },

  _debtModal() {
    let tipe = 'utang';
    openModal({
      title: tr('Catatan Utang / Piutang', 'Debt / Receivable Record'),
      body: `
        <div class="field">
          <label>${tr('Jenis', 'Type')}</label>
          <div class="radio-cards" id="mTipe">
            <div class="radio-card selected" data-val="utang"><ion-icon name="arrow-up-circle-outline"></ion-icon>${tr('Aku berutang', 'I owe')}</div>
            <div class="radio-card" data-val="piutang"><ion-icon name="arrow-down-circle-outline"></ion-icon>${tr('Dipinjam', 'Owed to me')}</div>
          </div>
        </div>
        <div class="field">
          <label>${tr('Kepada / dari siapa & untuk apa', 'To/from whom & for what')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('mis. Pinjam Rani buat fotokopi', 'e.g. Borrowed from Rani for photocopies')}">
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field"><label>${tr('Jumlah', 'Amount')}</label><div class="input-group"><input type="number" class="input" id="mJumlah" min="0"><span class="input-unit">Rp</span></div></div>
          <div class="field"><label>${tr('Tenggat', 'Due date')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="date" class="input" id="mTenggat"></div>
        </div>
        <button class="btn btn-fin btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $$('#mTipe .radio-card', m).forEach(c => c.onclick = () => {
          tipe = c.dataset.val;
          $$('#mTipe .radio-card', m).forEach(x => x.classList.toggle('selected', x === c));
        });
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          const jumlah = +$('#mJumlah', m).value;
          if (!nama) return toast(tr('Isi keterangan.', 'Enter a description.'), 'warning');
          if (!jumlah || jumlah <= 0) return toast(tr('Masukkan jumlah yang valid.', 'Enter a valid amount.'), 'warning');
          await DB.add('debts', { tipe, nama, jumlah, tenggat: $('#mTenggat', m).value, lunas: false, dibuat: new Date().toISOString() });
          closeModal();
          toast(tr('Catatan tersimpan 🤝', 'Record saved 🤝'));
          App.refresh();
        };
      }
    });
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
      const t = all.find(x => x.id === b.dataset.del);
      await DB.remove('transactions', b.dataset.del);
      if (t?.walletId) {
        try {
          const w = (await DB.list('wallets')).find(x => x.id === t.walletId);
          if (w) await DB.update('wallets', t.walletId, { saldo: (+w.saldo || 0) - (t.tipe === 'masuk' ? t.jumlah : -t.jumlah) });
        } catch (_) { /* saldo dompet gagal disesuaikan */ }
      }
      toast(tr('Transaksi dihapus.', 'Transaction deleted.'));
      App.refresh();
    });
  },

  // dipanggil juga dari dashboard.js — jangan ganti nama
  async openTxModal(tx = null) {
    const wallets = await DB.list('wallets');
    let tipe = tx?.tipe || 'keluar';

    // kategori kustom = kategori transaksi yang tidak ada di daftar tetap
    const isKatKustom = t => tx?.kategori && !this.KATEGORI[t].some(k => k.key === tx.kategori);
    const opsiKategori = t => this.KATEGORI[t]
      .map(k => `<option value="${esc(k.key)}" ${tx?.kategori === k.key ? 'selected' : ''}>${k.emoji} ${esc(tr(k.key, k.en))}</option>`)
      .join('') + `<option value="__custom__" ${isKatKustom(t) ? 'selected' : ''}>✏️ ${esc(tr('Tulis sendiri…', 'Write your own…'))}</option>`;

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
          <label>${tr('Dompet', 'Wallet')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
          <select class="select" id="mWallet">
            <option value="">${tr('Tidak dari dompet manapun', 'Not from any wallet')}</option>
            ${wallets.map(w => `<option value="${esc(w.id)}" ${tx?.walletId === w.id ? 'selected' : ''}>${esc(w.nama)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>${tr('Kategori', 'Category')}</label>
          <select class="select" id="mKategori">${opsiKategori(tipe)}</select>
          <input type="text" class="input" id="mKategoriKustom" style="margin-top:8px;${isKatKustom(tipe) ? '' : 'display:none;'}" placeholder="${tr('mis. Pulsa & Kuota', 'e.g. Phone Credit')}" value="${isKatKustom(tipe) ? esc(tx.kategori) : ''}">
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
        const katInput = $('#mKategoriKustom', m);
        const toggleKatKustom = () => {
          const custom = $('#mKategori', m).value === '__custom__';
          katInput.style.display = custom ? '' : 'none';
          if (custom) katInput.focus();
        };
        $('#mKategori', m).onchange = toggleKatKustom;
        $$('#mTipe .radio-card', m).forEach(c => c.onclick = () => {
          tipe = c.dataset.val;
          $$('#mTipe .radio-card', m).forEach(x => x.classList.toggle('selected', x === c));
          $('#mKategori', m).innerHTML = opsiKategori(tipe);
          toggleKatKustom();
        });
        $('#mSave', m).onclick = async () => {
          const jumlah = +$('#mJumlah', m).value;
          const tanggal = $('#mTanggal', m).value;
          if (!jumlah || jumlah <= 0) return toast(tr('Masukkan jumlah yang valid.', 'Enter a valid amount.'), 'warning');
          if (!tanggal) return toast(tr('Pilih tanggal transaksi.', 'Pick a transaction date.'), 'warning');
          let kategori = $('#mKategori', m).value;
          if (kategori === '__custom__') {
            kategori = katInput.value.trim();
            if (!kategori) return toast(tr('Tulis nama kategori dulu.', 'Enter a category name first.'), 'warning');
          }
          const walletId = $('#mWallet', m).value || null;
          const data = {
            tanggal, tipe, jumlah,
            kategori,
            catatan: $('#mCatatan', m).value.trim(),
            walletId
          };
          if (tx) await DB.update('transactions', tx.id, data);
          else await DB.add('transactions', data);

          // Sesuaikan saldo dompet: balikkan efek transaksi lama (kalau edit),
          // lalu terapkan efek transaksi baru. Kegagalan di sini tidak boleh
          // membatalkan transaksi yang sudah tersimpan di atas.
          try {
            const oldWalletId = tx?.walletId || null;
            const oldDelta = tx ? (tx.tipe === 'masuk' ? tx.jumlah : -tx.jumlah) : 0;
            const newDelta = tipe === 'masuk' ? jumlah : -jumlah;
            const freshWallets = await DB.list('wallets');
            const adjust = async (id, delta) => {
              const w = freshWallets.find(x => x.id === id);
              if (w) await DB.update('wallets', id, { saldo: (+w.saldo || 0) + delta });
            };
            if (oldWalletId && oldWalletId === walletId) {
              await adjust(walletId, newDelta - oldDelta);
            } else {
              if (oldWalletId) await adjust(oldWalletId, -oldDelta);
              if (walletId) await adjust(walletId, newDelta);
            }
          } catch (_) { /* saldo dompet gagal disesuaikan — transaksi tetap tersimpan */ }

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
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          ${terbesar ? `<span class="badge badge-amber">${tr('Total pengeluaran:', 'Total spending:')} ${fmtRp(totalKeluar)}</span>` : ''}
          <button class="btn btn-sm" id="exportCsv"><ion-icon name="download-outline"></ion-icon> ${tr('Ekspor CSV', 'Export CSV')}</button>
        </div>
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
    $('#exportCsv', el).onclick = () => {
      if (!txBulan.length) {
        toast(tr('Belum ada transaksi bulan ini untuk diekspor.', 'No transactions this month to export.'), 'warning');
        return;
      }
      const rows = [[tr('Tanggal', 'Date'), tr('Tipe', 'Type'), tr('Kategori', 'Category'), tr('Jumlah', 'Amount'), tr('Catatan', 'Note')]];
      txBulan.slice().sort((a, b) => (a.tanggal || '') < (b.tanggal || '') ? -1 : 1)
        .forEach(t => rows.push([
          t.tanggal || '',
          tr(t.tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran', t.tipe === 'masuk' ? 'Income' : 'Expense'),
          this._katLabel(t.tipe, t.kategori),
          Number(t.jumlah) || 0,
          t.catatan || ''
        ]));
      downloadCSV(rows, `keuangan_${this.month}.csv`);
      toast(tr('Laporan diekspor 📊', 'Report exported 📊'));
    };
  }
};
