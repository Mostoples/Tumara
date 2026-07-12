/* ============================================================
   TUMARA — Kesehatan & Kebugaran
   Tab: Hari Ini · Kalkulator · Tidur · Olahraga
   ============================================================ */

const Health = {
  tab: 'today',
  sleepMode: 'bangun',
  sleepTime: '06:00',
  calcResult: null,

  async render(el) {
    const female = DB.user?.jenisKelamin === 'P';
    el.innerHTML = `
      <div class="tabs">
        <button class="tab ${this.tab === 'today' ? 'active' : ''}" data-tab="today"><ion-icon name="sunny-outline"></ion-icon>${tr('Hari Ini', 'Today')}</button>
        <button class="tab ${this.tab === 'biometrik' ? 'active' : ''}" data-tab="biometrik"><ion-icon name="pulse-outline"></ion-icon>${tr('Biometrik', 'Biometrics')}</button>
        <button class="tab ${this.tab === 'nutrisi' ? 'active' : ''}" data-tab="nutrisi"><ion-icon name="nutrition-outline"></ion-icon>${tr('Nutrisi', 'Nutrition')}</button>
        <button class="tab ${this.tab === 'sleep' ? 'active' : ''}" data-tab="sleep"><ion-icon name="moon-outline"></ion-icon>${tr('Tidur', 'Sleep')}</button>
        <button class="tab ${this.tab === 'sport' ? 'active' : ''}" data-tab="sport"><ion-icon name="barbell-outline"></ion-icon>${tr('Olahraga', 'Exercise')}</button>
        <button class="tab ${this.tab === 'berat' ? 'active' : ''}" data-tab="berat"><ion-icon name="body-outline"></ion-icon>${tr('Berat & IMT', 'Weight & BMI')}</button>
        <button class="tab ${this.tab === 'obat' ? 'active' : ''}" data-tab="obat"><ion-icon name="medkit-outline"></ion-icon>${tr('Obat', 'Meds')}</button>
        <button class="tab ${this.tab === 'mental' ? 'active' : ''}" data-tab="mental"><ion-icon name="happy-outline"></ion-icon>${tr('Mental', 'Mental')}</button>
        ${female ? `<button class="tab ${this.tab === 'siklus' ? 'active' : ''}" data-tab="siklus"><ion-icon name="flower-outline"></ion-icon>${tr('Siklus', 'Cycle')}</button>` : ''}
        <button class="tab ${this.tab === 'calc' ? 'active' : ''}" data-tab="calc"><ion-icon name="calculator-outline"></ion-icon>${tr('Kalkulator', 'Calculator')}</button>
      </div>
      <div id="healthBody"></div>`;

    $$('.tab', el).forEach(t => t.onclick = () => { this.tab = t.dataset.tab; App.saveTab(this.tab); this.render(el); });

    const body = $('#healthBody', el);
    if (this.tab === 'today') await this.renderToday(body);
    else if (this.tab === 'biometrik') await this.renderBiometrik(body);
    else if (this.tab === 'nutrisi') await this.renderNutrisi(body);
    else if (this.tab === 'calc') this.renderCalc(body);
    else if (this.tab === 'sleep') this.renderSleep(body);
    else if (this.tab === 'berat') await this.renderWeight(body);
    else if (this.tab === 'obat') await this.renderMeds(body);
    else if (this.tab === 'mental') await this.renderMental(body);
    else if (this.tab === 'siklus') await this.renderCycle(body);
    else await this.renderSport(body);
  },

  /* ============ TAB: BIOMETRIK (manual) ============
     Detak jantung, oksigen darah (SpO2), tekanan darah, gula darah, langkah.
     Web tidak punya akses sensor → input manual (bisa dari alat ukur/smartwatch). */

  BIO_TYPES: [
    { key: 'hr',    id: 'Detak jantung',   en: 'Heart rate',    unit: 'bpm',   icon: '❤️',  fields: 1 },
    { key: 'spo2',  id: 'Oksigen darah',   en: 'Blood oxygen',  unit: '%',     icon: '🫁',  fields: 1 },
    { key: 'bp',    id: 'Tekanan darah',   en: 'Blood pressure',unit: 'mmHg',  icon: '🩸',  fields: 2 },
    { key: 'sugar', id: 'Gula darah',      en: 'Blood sugar',   unit: 'mg/dL', icon: '🍬',  fields: 1 },
    { key: 'steps', id: 'Langkah',         en: 'Steps',         unit: tr('langkah', 'steps'), icon: '👣', fields: 1 }
  ],

  async renderBiometrik(el) {
    const logs = (await DB.list('biometrics')).sort((a, b) => (b.waktu || '') < (a.waktu || '') ? -1 : 1);
    const latestOf = key => logs.find(l => l.jenis === key);

    const card = t => {
      const last = latestOf(t.key);
      let nilaiStr = '—', badge = '';
      if (last) {
        if (t.key === 'bp') { nilaiStr = `${last.nilai}/${last.nilai2}`; const i = Calc.bpInfo(last.nilai, last.nilai2); if (i) badge = `<span class="badge ${i.badge}">${i.kategori}</span>`; }
        else if (t.key === 'sugar') { nilaiStr = last.nilai; const i = Calc.sugarInfo(last.nilai); if (i) badge = `<span class="badge ${i.badge}">${i.kategori}</span>`; }
        else nilaiStr = t.key === 'steps' ? Number(last.nilai).toLocaleString('id-ID') : last.nilai;
      }
      return `
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div class="card-title" style="margin:0;">${t.icon} ${tr(t.id, t.en)}</div>
            <button class="mini-icon-btn" data-add="${t.key}"><ion-icon name="add"></ion-icon></button>
          </div>
          <div class="stat-row" style="margin:12px 0 4px;">
            <span class="stat-num">${nilaiStr}</span><span class="stat-unit">${t.unit}</span>
          </div>
          <div style="min-height:22px;">${badge || (last ? '' : `<span style="font-size:.78rem;color:var(--text-3);">${tr('belum ada data', 'no data yet')}</span>`)}</div>
          ${last ? `<div style="font-size:.74rem;color:var(--text-3);margin-top:4px;">${fmtDate((last.waktu || '').slice(0, 10), { short: true })} ${(last.waktu || '').slice(11, 16)}</div>` : ''}
        </div>`;
    };

    el.innerHTML = `
      <div class="disclaimer" style="margin-bottom:16px;">
        <ion-icon name="information-circle"></ion-icon>
        <span>${tr('Masukkan hasil pengukuran dari alat/oximeter/smartwatch-mu secara manual. Tumara menyimpan & memvisualkan trennya. Ini <b>bukan alat medis</b> — untuk keluhan serius temui tenaga kesehatan.', 'Enter measurements from your device/oximeter/smartwatch manually. Tumara stores & visualizes the trend. This is <b>not a medical device</b> — for serious concerns see a health professional.')}</span>
      </div>
      <div class="grid grid-3">${this.BIO_TYPES.map(card).join('')}</div>

      ${logs.length ? `
        <div class="section-head" style="margin-top:20px;"><h2>${tr('Riwayat Pengukuran', 'Measurement History')}</h2></div>
        <div style="display:flex;flex-direction:column;gap:9px;">
          ${logs.slice(0, 30).map(l => { const t = this.BIO_TYPES.find(x => x.key === l.jenis) || {}; const val = l.jenis === 'bp' ? `${l.nilai}/${l.nilai2}` : l.nilai; return `
            <div class="list-item">
              <div class="item-icon" style="background:var(--health-soft);font-size:1.1rem;">${t.icon || '📈'}</div>
              <div style="flex:1;"><div style="font-weight:700;font-size:.88rem;">${tr(t.id, t.en)}: ${val} ${t.unit || ''}</div>
                <div style="font-size:.75rem;color:var(--text-3);">${fmtDate((l.waktu || '').slice(0, 10), { weekday: true })} · ${(l.waktu || '').slice(11, 16)}</div></div>
              <button class="mini-icon-btn danger" data-del="${l.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`; }).join('')}
        </div>` : ''}`;

    $$('[data-add]', el).forEach(b => b.onclick = () => this._bioModal(this.BIO_TYPES.find(t => t.key === b.dataset.add)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      await DB.remove('biometrics', b.dataset.del);
      toast(tr('Data dihapus.', 'Entry deleted.'));
      App.refresh();
    });
  },

  _bioModal(t) {
    openModal({
      title: `${t.icon} ${tr(t.id, t.en)}`,
      body: `
        ${t.key === 'bp' ? `
          <div class="grid grid-2 keep-2" style="gap:12px;">
            <div class="field"><label>${tr('Sistolik', 'Systolic')}</label><div class="input-group"><input type="number" class="input" id="mV1" min="50" max="260" placeholder="120"><span class="input-unit">mmHg</span></div></div>
            <div class="field"><label>${tr('Diastolik', 'Diastolic')}</label><div class="input-group"><input type="number" class="input" id="mV2" min="30" max="180" placeholder="80"><span class="input-unit">mmHg</span></div></div>
          </div>` : `
          <div class="field"><label>${tr(t.id, t.en)}</label><div class="input-group"><input type="number" class="input" id="mV1" min="0" placeholder="${t.key === 'hr' ? '72' : t.key === 'spo2' ? '98' : t.key === 'sugar' ? '95' : '5000'}"><span class="input-unit">${t.unit}</span></div></div>`}
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const v1 = +$('#mV1', m).value;
          if (!v1 || v1 <= 0) return toast(tr('Masukkan nilai yang valid.', 'Enter a valid value.'), 'warning');
          const rec = { jenis: t.key, nilai: v1, waktu: new Date().toISOString() };
          if (t.key === 'bp') { const v2 = +$('#mV2', m).value; if (!v2) return toast(tr('Isi nilai diastolik.', 'Enter diastolic value.'), 'warning'); rec.nilai2 = v2; }
          await DB.add('biometrics', rec);
          if (t.key === 'steps') await DB.saveDaily(todayStr(), { langkah: v1 });
          closeModal();
          toast(tr('Tersimpan 📈', 'Saved 📈'));
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: NUTRISI (log makanan + Isi Piringku) ============ */

  async renderNutrisi(el) {
    const user = DB.user;
    const foods = (await DB.list('foods')).filter(f => f.tanggal === todayStr());
    const totalKal = foods.reduce((s, f) => s + (f.kalori || 0), 0);
    const target = user.targetKalori || 2000;
    const pct = clamp(Math.round(totalKal / target * 100), 0, 100);

    el.innerHTML = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div class="card-title" style="margin:0;"><ion-icon name="restaurant" style="color:var(--fin)"></ion-icon>${tr('Log Makanan Hari Ini', "Today's Food Log")}</div>
            <button class="btn btn-primary btn-sm" id="addFood"><ion-icon name="add"></ion-icon> ${tr('Makanan', 'Food')}</button>
          </div>
          <div class="stat-row" style="margin:14px 0 8px;"><span class="stat-num">${totalKal.toLocaleString('id-ID')}</span><span class="stat-unit">${tr(`/ ${target.toLocaleString('id-ID')} kkal`, `/ ${target.toLocaleString('id-ID')} kcal`)}</span></div>
          <div class="progress"><div class="progress-fill amber" style="width:${pct}%"></div></div>
          ${foods.length ? `<div style="display:flex;flex-direction:column;gap:8px;margin-top:16px;">
            ${foods.map(f => `<div class="list-item" style="padding:10px 12px;">
              <span style="font-size:1.1rem;">${f.emoji || '🍽️'}</span>
              <div style="flex:1;"><div style="font-weight:700;font-size:.86rem;">${esc(f.nama)}</div><div style="font-size:.74rem;color:var(--text-3);">${esc(f.waktu || '')}</div></div>
              <span class="badge badge-amber">${f.kalori} kkal</span>
              <button class="mini-icon-btn danger" data-delf="${f.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`).join('')}
          </div>` : `<div style="font-size:.82rem;color:var(--text-3);margin-top:14px;text-align:center;">${tr('Belum ada makanan tercatat hari ini 🍽️', 'No food logged today yet 🍽️')}</div>`}
        </div>

        <div class="card">
          <div class="card-title"><ion-icon name="nutrition" style="color:var(--brand)"></ion-icon>${tr('Panduan "Isi Piringku"', '"Fill My Plate" Guide')}</div>
          <p style="font-size:.85rem;color:var(--text-2);line-height:1.6;margin-top:8px;">${tr('Panduan makan seimbang dari Kemenkes (pengganti "4 Sehat 5 Sempurna"):', 'Balanced-eating guide from the Health Ministry (replaces "4 Healthy 5 Perfect"):')}</p>
          <div style="display:flex;flex-direction:column;gap:9px;margin-top:12px;">
            <div class="list-item" style="padding:11px 14px;">🥗 ${tr('½ piring: sayur & buah (⅔ sayur, ⅓ buah)', '½ plate: vegetables & fruit (⅔ veg, ⅓ fruit)')}</div>
            <div class="list-item" style="padding:11px 14px;">🍚 ${tr('⅓ piring: makanan pokok (nasi, kentang, jagung)', '⅓ plate: staples (rice, potato, corn)')}</div>
            <div class="list-item" style="padding:11px 14px;">🍗 ${tr('Sisanya: lauk (ayam, ikan, telur, tahu, tempe)', 'The rest: protein (chicken, fish, egg, tofu, tempeh)')}</div>
            <div class="list-item" style="padding:11px 14px;">💧 ${tr('Cukup air putih · batasi gula, garam & minyak', 'Enough water · limit sugar, salt & oil')}</div>
          </div>
        </div>
      </div>`;

    $('#addFood', el).onclick = () => this._foodModal();
    $$('[data-delf]', el).forEach(b => b.onclick = async () => {
      const f = foods.find(x => x.id === b.dataset.delf);
      await DB.remove('foods', b.dataset.delf);
      // kurangi kalori harian
      const d = await DB.getDaily();
      await DB.saveDaily(todayStr(), { kalori: Math.max(0, (d.kalori || 0) - (f?.kalori || 0)) });
      toast(tr('Makanan dihapus.', 'Food removed.'));
      App.refresh();
    });
  },

  _foodModal() {
    const preset = [
      { nama: 'Nasi + ayam + sayur', emoji: '🍛', kalori: 650 },
      { nama: 'Nasi goreng', emoji: '🍚', kalori: 550 },
      { nama: 'Mie ayam / bakso', emoji: '🍜', kalori: 500 },
      { nama: 'Roti / sandwich', emoji: '🥪', kalori: 300 },
      { nama: 'Buah potong', emoji: '🍎', kalori: 90 },
      { nama: 'Gorengan (2 pcs)', emoji: '🍤', kalori: 260 },
      { nama: 'Susu / teh manis', emoji: '🥛', kalori: 150 }
    ];
    openModal({
      title: tr('Catat Makanan', 'Log Food'),
      body: `
        <div class="field">
          <label>${tr('Pilih cepat', 'Quick pick')}</label>
          <div style="display:flex;flex-wrap:wrap;gap:7px;" id="foodPreset">
            ${preset.map((p, i) => `<button type="button" class="chip" data-p="${i}">${p.emoji} ${esc(tr(p.nama, p.nama))} · ${p.kalori}</button>`).join('')}
          </div>
        </div>
        <div class="field"><label>${tr('Nama makanan', 'Food name')}</label><input type="text" class="input" id="mNama" placeholder="${tr('mis. Nasi padang', 'e.g. Fried rice')}"></div>
        <div class="field"><label>${tr('Perkiraan kalori', 'Estimated calories')}</label><div class="input-group"><input type="number" class="input" id="mKal" min="1" max="3000" placeholder="450"><span class="input-unit">kkal</span></div></div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Catat', 'Log')}</button>`,
      onMount: m => {
        let emoji = '🍽️';
        $$('#foodPreset .chip', m).forEach(b => b.onclick = () => {
          const p = preset[+b.dataset.p];
          $('#mNama', m).value = p.nama; $('#mKal', m).value = p.kalori; emoji = p.emoji;
        });
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          const kalori = +$('#mKal', m).value;
          if (!nama) return toast(tr('Isi nama makanan.', 'Enter a food name.'), 'warning');
          if (!kalori || kalori < 1) return toast(tr('Isi perkiraan kalori.', 'Enter estimated calories.'), 'warning');
          const jam = new Date().toTimeString().slice(0, 5);
          await DB.add('foods', { tanggal: todayStr(), nama, kalori, emoji, waktu: jam });
          const d = await DB.getDaily();
          await DB.saveDaily(todayStr(), { kalori: (d.kalori || 0) + kalori });
          closeModal();
          toast(tr(`${nama} tercatat 🍽️`, `${nama} logged 🍽️`));
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: OBAT (pengingat obat) ============ */

  async renderMeds(el) {
    const meds = await DB.list('meds');
    const today = todayStr();

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="font-size:.88rem;color:var(--text-3);font-weight:600;">${tr('Jadwal & pengingat minum obat/vitamin 💊', 'Medication/vitamin schedule & reminders 💊')}</div>
        <button class="btn btn-primary btn-sm" id="addMed"><ion-icon name="add"></ion-icon> ${tr('Obat', 'Medicine')}</button>
      </div>
      ${meds.length ? `
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${meds.map(md => {
            const taken = (md.riwayat || {})[today] || [];
            return `
            <div class="card">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
                <div style="flex:1;">
                  <div style="font-weight:800;font-size:1rem;">💊 ${esc(md.nama)}${md.dosis ? ` <span style="font-weight:600;color:var(--text-3);font-size:.85rem;">· ${esc(md.dosis)}</span>` : ''}</div>
                  ${md.catatan ? `<div style="font-size:.8rem;color:var(--text-3);margin-top:2px;">${esc(md.catatan)}</div>` : ''}
                </div>
                <div style="display:flex;gap:4px;">
                  <button class="mini-icon-btn" data-edit="${md.id}"><ion-icon name="create-outline"></ion-icon></button>
                  <button class="mini-icon-btn danger" data-del="${md.id}"><ion-icon name="trash-outline"></ion-icon></button>
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
                ${(md.waktu || []).map(w => {
                  const done = taken.includes(w);
                  return `<button class="btn btn-sm ${done ? 'btn-primary' : ''}" data-take="${md.id}" data-w="${w}"><ion-icon name="${done ? 'checkmark-circle' : 'time-outline'}"></ion-icon> ${w}${done ? ' ✓' : ''}</button>`;
                }).join('') || `<span style="font-size:.8rem;color:var(--text-3);">${tr('Tanpa jadwal jam tertentu', 'No specific schedule')}</span>`}
              </div>
            </div>`;
          }).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="medkit-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada obat terdaftar', 'No medications yet')}</div>
          <div class="es-sub">${tr('Tambahkan obat/vitamin & jadwal minumnya biar tak terlewat 💊', 'Add meds/vitamins & their schedule so you never miss them 💊')}</div>
        </div>`}
      <div class="disclaimer" style="margin-top:18px;"><ion-icon name="information-circle"></ion-icon><span>${tr('Pengingat dicek tiap 30 detik & tampil sebagai notifikasi selama aplikasi ini terbuka di tabmu (tidak berjalan di latar belakang). Selalu ikuti anjuran dosis dari dokter/apoteker.', 'Reminders are checked every 30 seconds and appear as a notification while this app is open in your tab (not in the background). Always follow dosage advice from your doctor/pharmacist.')}</span></div>`;

    $('#addMed', el).onclick = () => this._medModal();
    $$('[data-edit]', el).forEach(b => b.onclick = () => this._medModal(meds.find(x => x.id === b.dataset.edit)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus obat ini?', 'Delete this medication?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      await DB.remove('meds', b.dataset.del);
      toast(tr('Obat dihapus.', 'Medication deleted.'));
      App.refresh();
    });
    $$('[data-take]', el).forEach(b => b.onclick = async () => {
      const md = meds.find(x => x.id === b.dataset.take);
      const w = b.dataset.w;
      const riwayat = md.riwayat || {};
      const arr = riwayat[today] || [];
      if (arr.includes(w)) riwayat[today] = arr.filter(x => x !== w);
      else { riwayat[today] = [...arr, w]; toast(tr('Dosis dicatat ✓', 'Dose logged ✓')); }
      await DB.update('meds', md.id, { riwayat });
      App.refresh();
    });
  },

  _medModal(med = null) {
    openModal({
      title: med ? tr('Ubah Obat', 'Edit Medication') : tr('Tambah Obat', 'Add Medication'),
      body: `
        <div class="field"><label>${tr('Nama obat / vitamin', 'Medicine / vitamin name')}</label><input type="text" class="input" id="mNama" placeholder="${tr('mis. Vitamin C', 'e.g. Vitamin C')}" value="${esc(med?.nama || '')}"></div>
        <div class="field"><label>${tr('Dosis', 'Dose')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mDosis" placeholder="${tr('mis. 1 tablet', 'e.g. 1 tablet')}" value="${esc(med?.dosis || '')}"></div>
        <div class="field"><label>${tr('Jam minum (pisahkan koma)', 'Times (comma separated)')}</label><input type="text" class="input" id="mWaktu" placeholder="07:00, 13:00, 19:00" value="${esc((med?.waktu || []).join(', '))}"></div>
        <div class="field"><label>${tr('Catatan', 'Note')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mCat" placeholder="${tr('mis. sesudah makan', 'e.g. after meals')}" value="${esc(med?.catatan || '')}"></div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (!nama) return toast(tr('Isi nama obat.', 'Enter a medicine name.'), 'warning');
          const waktu = $('#mWaktu', m).value.split(',').map(s => s.trim()).filter(s => /^\d{1,2}:\d{2}$/.test(s));
          const data = { nama, dosis: $('#mDosis', m).value.trim(), waktu, catatan: $('#mCat', m).value.trim() };
          if (med) await DB.update('meds', med.id, data);
          else await DB.add('meds', { ...data, riwayat: {} });
          closeModal();
          toast(tr('Obat tersimpan 💊', 'Medication saved 💊'));
          if (waktu.length && 'Notification' in window && Notification.permission === 'default') {
            try { await Notification.requestPermission(); } catch (_) { /* abaikan */ }
          }
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: MENTAL (napas + mood) ============ */

  async renderMental(el) {
    const moods = (await DB.list('biometrics')).filter(b => b.jenis === 'mood').sort((a, b) => (b.waktu || '') < (a.waktu || '') ? -1 : 1);
    const moodOpts = [
      { v: 5, e: '😄', id: 'Senang', en: 'Happy' }, { v: 4, e: '🙂', id: 'Baik', en: 'Good' },
      { v: 3, e: '😐', id: 'Biasa', en: 'Okay' }, { v: 2, e: '😟', id: 'Cemas', en: 'Anxious' },
      { v: 1, e: '😢', id: 'Sedih', en: 'Sad' }
    ];
    const todayMood = moods.find(m => (m.waktu || '').slice(0, 10) === todayStr());

    el.innerHTML = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card" style="text-align:center;">
          <div class="card-title" style="justify-content:center;"><ion-icon name="leaf" style="color:var(--brand)"></ion-icon>${tr('Latihan Pernapasan', 'Breathing Exercise')}</div>
          <div class="card-sub">${tr('Box breathing 4-4-4-4 untuk menenangkan diri', 'Box breathing 4-4-4-4 to calm down')}</div>
          <div class="breath-wrap"><div class="breath-circle" id="breathCircle"><span id="breathText">${tr('Mulai', 'Start')}</span></div></div>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button class="btn btn-primary" id="breathToggle"><ion-icon name="play"></ion-icon> ${tr('Mulai', 'Start')}</button>
          </div>
          <div style="font-size:.8rem;color:var(--text-3);margin-top:12px;">${tr('Tarik napas 4 dtk · tahan 4 · buang 4 · tahan 4 — ulangi', 'Inhale 4s · hold 4 · exhale 4 · hold 4 — repeat')}</div>
        </div>

        <div class="card">
          <div class="card-title"><ion-icon name="happy-outline" style="color:var(--prod)"></ion-icon>${tr('Suasana Hati Hari Ini', "Today's Mood")}</div>
          <div style="display:flex;justify-content:space-between;gap:6px;margin-top:16px;">
            ${moodOpts.map(o => `<button class="mood-btn ${todayMood?.nilai === o.v ? 'sel' : ''}" data-mood="${o.v}" title="${tr(o.id, o.en)}"><span style="font-size:1.7rem;">${o.e}</span><span style="font-size:.68rem;font-weight:700;">${tr(o.id, o.en)}</span></button>`).join('')}
          </div>
          ${todayMood ? `<div class="badge badge-purple" style="margin-top:14px;">${tr('Tercatat hari ini:', 'Logged today:')} ${moodOpts.find(o => o.v === todayMood.nilai)?.e}</div>` : ''}
          <div class="disclaimer" style="margin-top:16px;"><ion-icon name="bulb-outline"></ion-icon><span>${tr('Kalau perasaan berat berlangsung lama, cerita ke orang terpercaya atau guru BK. Bercerita bukan kelemahan. 💚', 'If heavy feelings persist, talk to someone you trust or a counselor. Sharing is not weakness. 💚')}</span></div>
        </div>
      </div>

      ${moods.length ? `<div class="section-head" style="margin-top:20px;"><h2>${tr('Riwayat Mood', 'Mood History')}</h2></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${moods.slice(0, 14).map(m => `<div class="mood-chip" title="${fmtDate((m.waktu || '').slice(0, 10))}">${moodOpts.find(o => o.v === m.nilai)?.e || '🙂'}<span>${fmtDate((m.waktu || '').slice(0, 10), { short: true }).replace(/\s\d{4}$/, '')}</span></div>`).join('')}
        </div>` : ''}`;

    // mood
    $$('[data-mood]', el).forEach(b => b.onclick = async () => {
      const v = +b.dataset.mood;
      if (todayMood) await DB.update('biometrics', todayMood.id, { nilai: v });
      else await DB.add('biometrics', { jenis: 'mood', nilai: v, waktu: new Date().toISOString() });
      toast(tr('Mood tercatat 💚', 'Mood logged 💚'));
      App.refresh();
    });

    // breathing animation
    this._breath = this._breath || { running: false };
    const circle = $('#breathCircle', el), text = $('#breathText', el), toggle = $('#breathToggle', el);
    const phases = [
      { t: tr('Tarik napas', 'Inhale'), s: 4, cls: 'inhale' },
      { t: tr('Tahan', 'Hold'), s: 4, cls: 'hold' },
      { t: tr('Buang napas', 'Exhale'), s: 4, cls: 'exhale' },
      { t: tr('Tahan', 'Hold'), s: 4, cls: 'hold' }
    ];
    let pi = 0, sec = 0, timer = null;
    const stop = () => { this._breath.running = false; clearInterval(timer); timer = null; circle.className = 'breath-circle'; text.textContent = tr('Mulai', 'Start'); toggle.innerHTML = `<ion-icon name="play"></ion-icon> ${tr('Mulai', 'Start')}`; };
    const tick = () => {
      const p = phases[pi];
      if (sec === 0) { circle.className = 'breath-circle ' + p.cls; }
      text.textContent = `${p.t} ${p.s - sec}`;
      sec++;
      if (sec >= p.s) { sec = 0; pi = (pi + 1) % phases.length; }
    };
    toggle.onclick = () => {
      if (this._breath.running) { stop(); return; }
      this._breath.running = true; pi = 0; sec = 0;
      toggle.innerHTML = `<ion-icon name="stop"></ion-icon> ${tr('Berhenti', 'Stop')}`;
      tick(); timer = setInterval(tick, 1000);
    };
  },

  /* ============ TAB: SIKLUS MENSTRUASI (khusus wanita) ============ */

  async renderCycle(el) {
    const logs = (await DB.list('menstrual')).sort((a, b) => (b.mulai || '') < (a.mulai || '') ? -1 : 1);
    const cycleLen = DB.user?.cycleLen || 28;
    const periodLen = DB.user?.periodLen || 5;
    const last = logs[0];
    const pred = last ? Calc.menstrualPredict(last.mulai, cycleLen, periodLen) : null;
    const hariLagi = pred ? daysUntil(pred.next) : null;

    el.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,#db2777,#ec4899);color:#fff;">
        <div class="card-title" style="color:#fff;"><ion-icon name="flower-outline"></ion-icon>${tr('Prediksi Siklus', 'Cycle Prediction')}</div>
        ${pred ? `
          <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:12px;">
            <div><div style="font-size:.78rem;opacity:.85;font-weight:600;">${tr('Perkiraan haid berikutnya', 'Next period (est.)')}</div>
              <div style="font-size:1.3rem;font-weight:800;">${fmtDate(pred.next, { short: true })}</div>
              <div style="font-size:.8rem;opacity:.9;">${hariLagi >= 0 ? tr(`${hariLagi} hari lagi`, `in ${hariLagi} days`) : tr('mungkin sudah dimulai', 'may have started')}</div></div>
            <div><div style="font-size:.78rem;opacity:.85;font-weight:600;">${tr('Perkiraan masa subur', 'Fertile window (est.)')}</div>
              <div style="font-size:1rem;font-weight:700;">${fmtDate(pred.fertileStart, { short: true })} – ${fmtDate(pred.fertileEnd, { short: true })}</div></div>
          </div>` : `<p style="margin-top:10px;opacity:.92;font-size:.88rem;">${tr('Catat tanggal mulai haid untuk melihat prediksi.', 'Log your period start date to see predictions.')}</p>`}
      </div>

      <div style="display:flex;gap:10px;margin:16px 0;flex-wrap:wrap;">
        <button class="btn btn-primary" id="addCycle"><ion-icon name="add"></ion-icon> ${tr('Catat Mulai Haid', 'Log Period Start')}</button>
        <button class="btn" id="cycleSetting"><ion-icon name="options-outline"></ion-icon> ${tr('Panjang siklus', 'Cycle length')}: ${cycleLen} ${tr('hari', 'days')}</button>
      </div>

      ${logs.length ? `
        <div class="section-head"><h2>${tr('Riwayat', 'History')}</h2></div>
        <div style="display:flex;flex-direction:column;gap:9px;">
          ${logs.map((l, i) => {
            const prev = logs[i + 1];
            const gap = prev ? Math.round((new Date(l.mulai) - new Date(prev.mulai)) / 86400000) : null;
            return `<div class="list-item">
              <div class="item-icon" style="background:rgba(236,72,153,.14);color:#ec4899;">🌸</div>
              <div style="flex:1;"><div style="font-weight:700;font-size:.88rem;">${fmtDate(l.mulai, { weekday: true })}</div>
                ${gap ? `<div style="font-size:.75rem;color:var(--text-3);">${tr(`${gap} hari dari siklus sebelumnya`, `${gap} days from previous cycle`)}</div>` : ''}</div>
              <button class="mini-icon-btn danger" data-del="${l.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`;
          }).join('')}
        </div>` : ''}
      <div class="disclaimer" style="margin-top:18px;"><ion-icon name="information-circle"></ion-icon><span>${tr('Prediksi bersifat perkiraan berdasarkan rata-rata siklus — bisa berubah karena stres, aktivitas, dll. Bukan alat kontrasepsi.', 'Predictions are estimates based on average cycles — they can shift due to stress, activity, etc. Not a contraceptive method.')}</span></div>`;

    $('#addCycle', el).onclick = () => {
      openModal({
        title: tr('Catat Mulai Haid', 'Log Period Start'),
        body: `<div class="field"><label>${tr('Tanggal mulai', 'Start date')}</label><input type="date" class="input" id="mTgl" value="${todayStr()}"></div>
          <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
        onMount: m => { $('#mSave', m).onclick = async () => {
          await DB.add('menstrual', { mulai: $('#mTgl', m).value || todayStr() });
          closeModal(); toast(tr('Tercatat 🌸', 'Logged 🌸')); App.refresh();
        }; }
      });
    };
    $('#cycleSetting', el).onclick = () => {
      openModal({
        title: tr('Pengaturan Siklus', 'Cycle Settings'),
        body: `<div class="grid grid-2 keep-2" style="gap:12px;">
            <div class="field"><label>${tr('Panjang siklus', 'Cycle length')}</label><div class="input-group"><input type="number" class="input" id="mCyc" min="20" max="40" value="${cycleLen}"><span class="input-unit">${tr('hari', 'days')}</span></div></div>
            <div class="field"><label>${tr('Lama haid', 'Period length')}</label><div class="input-group"><input type="number" class="input" id="mPer" min="2" max="10" value="${periodLen}"><span class="input-unit">${tr('hari', 'days')}</span></div></div>
          </div><button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
        onMount: m => { $('#mSave', m).onclick = async () => {
          await DB.updateUser({ cycleLen: clamp(+$('#mCyc', m).value || 28, 20, 40), periodLen: clamp(+$('#mPer', m).value || 5, 2, 10) });
          closeModal(); toast(tr('Pengaturan disimpan.', 'Settings saved.')); App.refresh();
        }; }
      });
    };
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      await DB.remove('menstrual', b.dataset.del);
      toast(tr('Dihapus.', 'Deleted.')); App.refresh();
    });
  },

  /* ============ TAB: BERAT & IMT ============ */

  async renderWeight(el) {
    const user = DB.user;
    const logs = (await DB.list('weights')).sort((a, b) => (a.tanggal || '') < (b.tanggal || '') ? -1 : 1);
    const last = logs[logs.length - 1];
    const beratKini = last ? last.berat : (user.berat || 0);
    const tinggi = user.tinggi || 0;
    const bmi = tinggi ? Calc.bmi(beratKini, tinggi) : 0;
    const info = tinggi ? Calc.bmiInfo(bmi) : null;
    const ideal = tinggi ? Calc.idealRange(tinggi) : null;

    // grafik tren berat (maks 12 titik terakhir)
    const recent = logs.slice(-12);
    const barItems = recent.map(l => ({ label: fmtDate(l.tanggal, { short: true }).replace(/\s\d{4}$/, ''), value: l.berat }));

    // selisih dari catatan sebelumnya
    let delta = null;
    if (logs.length >= 2) delta = +(logs[logs.length - 1].berat - logs[logs.length - 2].berat).toFixed(1);

    el.innerHTML = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title"><ion-icon name="body-outline" style="color:var(--health)"></ion-icon>${tr('Berat & IMT Terkini', 'Current Weight & BMI')}</div>
          ${tinggi ? `
            <div style="display:flex;align-items:center;gap:20px;margin:16px 0;flex-wrap:wrap;">
              <div style="text-align:center;">
                <div style="font-size:2.2rem;font-weight:800;">${beratKini || '-'}<span style="font-size:1rem;color:var(--text-3);"> kg</span></div>
                ${delta !== null ? `<div style="font-size:.8rem;font-weight:700;color:${delta > 0 ? 'var(--fin)' : delta < 0 ? 'var(--brand)' : 'var(--text-3)'};">${delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : ''}${delta !== 0 ? delta + ' kg' : tr('tetap', 'no change')}</div>` : ''}
              </div>
              <div style="flex:1;min-width:120px;">
                <div style="display:flex;align-items:baseline;gap:8px;"><span style="font-size:1.6rem;font-weight:800;color:${info.warna};">${bmi}</span><span class="badge ${info.badge}">${info.kategori}</span></div>
                <div style="font-size:.78rem;color:var(--text-3);margin-top:4px;">${tr(`Berat ideal: ${ideal.min}–${ideal.max} kg`, `Ideal weight: ${ideal.min}–${ideal.max} kg`)}</div>
              </div>
            </div>
            <p style="font-size:.84rem;color:var(--text-2);line-height:1.6;">${info.pesan}</p>` : `
            <div class="empty-state" style="padding:24px 10px;">
              <ion-icon name="body-outline"></ion-icon>
              <div class="es-title">${tr('Lengkapi tinggi badan dulu', 'Add your height first')}</div>
              <div class="es-sub">${tr('Isi di menu Profil untuk menghitung IMT', 'Fill it in the Profile menu to compute BMI')}</div>
            </div>`}
          <button class="btn btn-primary btn-block" id="addWeight" style="margin-top:12px;"><ion-icon name="add"></ion-icon> ${tr('Catat Berat Badan', 'Log Weight')}</button>
        </div>

        <div class="card">
          <div class="card-title"><ion-icon name="bar-chart" style="color:var(--health)"></ion-icon>${tr('Tren Berat Badan', 'Weight Trend')}</div>
          ${barItems.length ? `<div style="margin-top:12px;">${barChartSVG(barItems, { color: 'var(--health)', fmtVal: v => v })}</div>` : `
            <div class="empty-state" style="padding:24px 10px;">
              <ion-icon name="bar-chart-outline"></ion-icon>
              <div class="es-title">${tr('Belum ada catatan berat', 'No weight logs yet')}</div>
              <div class="es-sub">${tr('Catat berkala untuk melihat perkembangan 📈', 'Log regularly to see your progress 📈')}</div>
            </div>`}
        </div>
      </div>

      ${logs.length ? `
        <div class="section-head" style="margin-top:20px;"><h2>${tr('Riwayat', 'History')}</h2></div>
        <div style="display:flex;flex-direction:column;gap:9px;">
          ${logs.slice().reverse().map(l => `
            <div class="list-item">
              <div class="item-icon" style="background:var(--health-soft);color:var(--health);"><ion-icon name="body-outline"></ion-icon></div>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:.9rem;">${l.berat} kg ${tinggi ? `<span style="font-weight:600;color:var(--text-3);font-size:.8rem;">· IMT ${Calc.bmi(l.berat, tinggi)}</span>` : ''}</div>
                <div style="font-size:.78rem;color:var(--text-3);">${fmtDate(l.tanggal, { weekday: true })}</div>
              </div>
              <button class="mini-icon-btn danger" data-del="${l.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`).join('')}
        </div>` : ''}

      <div class="disclaimer" style="margin-top:18px;">
        <ion-icon name="information-circle"></ion-icon>
        <span>${tr('IMT adalah indikator umum, bukan diagnosis. Untuk remaja yang masih bertumbuh, konsultasikan dengan tenaga kesehatan bila ragu.', 'BMI is a general indicator, not a diagnosis. For growing teenagers, consult a health professional if unsure.')}</span>
      </div>`;

    $('#addWeight', el).onclick = () => this._weightModal(beratKini);
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus catatan berat ini?', 'Delete this weight log?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      await DB.remove('weights', b.dataset.del);
      toast(tr('Catatan dihapus.', 'Log deleted.'));
      App.refresh();
    });
  },

  _weightModal(current) {
    openModal({
      title: tr('Catat Berat Badan', 'Log Weight'),
      body: `
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>${tr('Berat badan', 'Weight')}</label>
            <div class="input-group"><input type="number" class="input" id="mBerat" min="20" max="250" step="0.1" value="${current || ''}"><span class="input-unit">kg</span></div>
          </div>
          <div class="field">
            <label>${tr('Tanggal', 'Date')}</label>
            <input type="date" class="input" id="mTanggal" value="${todayStr()}">
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:10px;font-size:.85rem;font-weight:600;color:var(--text-2);cursor:pointer;margin:4px 0 18px;">
          <input type="checkbox" id="mUpdateProfil" checked style="width:17px;height:17px;accent-color:var(--brand);">
          ${tr('Perbarui berat di profil & hitung ulang target kalori', 'Update profile weight & recalculate calorie target')}
        </label>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const berat = +$('#mBerat', m).value;
          const tanggal = $('#mTanggal', m).value || todayStr();
          if (!berat || berat < 20 || berat > 250) return toast(tr('Masukkan berat yang valid.', 'Enter a valid weight.'), 'warning');
          // satu catatan per tanggal
          const all = await DB.list('weights');
          const ex = all.find(w => w.tanggal === tanggal);
          if (ex) await DB.update('weights', ex.id, { berat });
          else await DB.set('weights', tanggal, { tanggal, berat });
          if ($('#mUpdateProfil', m).checked) {
            const u = DB.user;
            const patch = { berat };
            if (u.tinggi && u.usia) {
              const tdee = Calc.tdee(Calc.bmr({ jenisKelamin: u.jenisKelamin || 'L', berat, tinggi: u.tinggi, usia: u.usia }), u.aktivitas || 'ringan');
              patch.targetKalori = tdee;
              patch.targetAir = Calc.waterTarget(berat).gelas;
            }
            await DB.updateUser(patch);
          }
          closeModal();
          toast(tr('Berat badan tercatat 📈', 'Weight logged 📈'));
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: HARI INI ============ */

  async renderToday(el) {
    const user = DB.user;
    const daily = await DB.getDaily();
    const all = await DB.list('health_daily');
    const targetAir = user.targetAir || 8;
    const targetKalori = user.targetKalori || 2000;

    // Air minum: gelas target (checklist) vs gelas ekstra yang ditambah sendiri.
    // 1 gelas = 250 ml. `daily.air` = total gelas diminum; `daily.airExtra` =
    // gelas ekstra di luar target (hanya ini yang bisa dikurangi tombol −).
    const ML_PER_GELAS = 250;
    const extraAir = daily.airExtra || 0;
    const checkedAir = clamp((daily.air || 0) - extraAir, 0, targetAir); // gelas target yang tercentang
    const cupCount = targetAir + extraAir;                                // total gelas yang ditampilkan
    const literTarget = Calc.waterTarget(user.berat || 55).liter;
    const pctKalori = clamp(Math.round((daily.kalori / targetKalori) * 100), 0, 100);

    const streakRokok = this._streak(all, 'bebasRokok');
    const streakMiras = this._streak(all, 'bebasMiras');

    el.innerHTML = `
      <div class="grid grid-2">

        <!-- AIR MINUM -->
        <div class="card">
          <div class="card-title"><ion-icon name="water" style="color:var(--info)"></ion-icon>${tr('Pengingat Minum', 'Water Reminder')}</div>
          <div class="card-sub">${tr(`Target: ${targetAir} gelas (± ${literTarget} liter) / hari · 1 gelas = ${ML_PER_GELAS} ml`, `Target: ${targetAir} glasses (± ${literTarget} liter) / day · 1 glass = ${ML_PER_GELAS} ml`)}</div>
          <div class="water-cups" id="waterCups">
            ${Array.from({ length: cupCount }, (_, i) => {
              const isExtra = i >= targetAir;
              // Gelas target terisi sampai jumlah tercentang; gelas tambahan selalu terisi.
              const filled = isExtra ? true : (i < checkedAir);
              const title = isExtra
                ? tr(`Gelas tambahan (${ML_PER_GELAS} ml)`, `Extra glass (${ML_PER_GELAS} ml)`)
                : tr(`Gelas ke-${i + 1} (${ML_PER_GELAS} ml)`, `Glass ${i + 1} (${ML_PER_GELAS} ml)`);
              return `
              <button class="water-cup ${filled ? 'filled' : ''} ${isExtra ? 'extra' : ''}" data-i="${i}" title="${title}">
                <ion-icon name="${filled ? 'water' : 'water-outline'}"></ion-icon>
              </button>`;
            }).join('')}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <div class="stat-row">
              <span class="stat-num" style="color:var(--info)">${daily.air || 0}</span>
              <span class="stat-unit">${tr(`gelas · ${((daily.air || 0) * ML_PER_GELAS).toLocaleString('id-ID')} ml`, `glasses · ${((daily.air || 0) * ML_PER_GELAS).toLocaleString('id-ID')} ml`)}</span>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm" id="waterMinus" ${extraAir <= 0 ? 'disabled' : ''} title="${tr('Kurangi gelas tambahan', 'Remove extra glass')}"><ion-icon name="remove"></ion-icon></button>
              <button class="btn btn-sm btn-primary" id="waterPlus" title="${tr('Tambah gelas', 'Add a glass')}"><ion-icon name="add"></ion-icon> ${tr('Gelas', 'Glass')}</button>
            </div>
          </div>
          <div style="font-size:.78rem;color:var(--text-3);margin-top:8px;">
            ${tr(`Target ${checkedAir}/${targetAir} gelas${extraAir ? ` · +${extraAir} gelas tambahan` : ''}`, `Target ${checkedAir}/${targetAir} glasses${extraAir ? ` · +${extraAir} extra` : ''}`)}
          </div>
          ${daily.air >= targetAir ? `<div class="badge badge-blue" style="margin-top:12px;">${tr('🎉 Target minum hari ini tercapai!', '🎉 Water goal hit for today!')}</div>` : ''}
        </div>

        <!-- KALORI -->
        <div class="card">
          <div class="card-title"><ion-icon name="flame" style="color:var(--fin)"></ion-icon>${tr('Energi Hari Ini', 'Today\'s Energy')}</div>
          <div class="card-sub">${tr(`Perkiraan kebutuhan: ± ${targetKalori.toLocaleString('id-ID')} kkal`, `Estimated need: ± ${targetKalori.toLocaleString('id-ID')} kcal`)}</div>
          <div class="stat-row" style="margin:16px 0 10px;">
            <span class="stat-num">${daily.kalori.toLocaleString('id-ID')}</span>
            <span class="stat-unit">${tr('kkal tercatat', 'kcal logged')}</span>
          </div>
          <div class="progress" style="margin-bottom:16px;"><div class="progress-fill amber" style="width:${pctKalori}%"></div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-sm" data-kal="250">${tr('+ Camilan (±250)', '+ Snack (±250)')}</button>
            <button class="btn btn-sm" data-kal="600">${tr('+ Makan (±600)', '+ Meal (±600)')}</button>
            <button class="btn btn-sm btn-fin" id="kalCustom"><ion-icon name="add"></ion-icon> ${tr('Manual', 'Manual')}</button>
          </div>
        </div>

        <!-- TIDUR -->
        <div class="card">
          <div class="card-title"><ion-icon name="moon" style="color:var(--prod)"></ion-icon>${tr('Tidur Semalam', 'Last Night\'s Sleep')}</div>
          <div class="card-sub">${tr('Remaja disarankan tidur 8–10 jam per malam', 'Teens should get 8–10 hours of sleep a night')}</div>
          <div style="display:flex;gap:10px;align-items:center;margin-top:16px;">
            <div class="input-group" style="flex:1;">
              <input type="number" class="input" id="tidurInput" min="0" max="16" step="0.5" value="${daily.tidur || ''}" placeholder="${tr('mis. 7.5', 'e.g. 7.5')}">
              <span class="input-unit">${tr('jam', 'hours')}</span>
            </div>
            <button class="btn btn-prod" id="tidurSave">${tr('Simpan', 'Save')}</button>
          </div>
          ${daily.tidur > 0 ? `<div class="badge ${daily.tidur >= 8 ? 'badge-green' : daily.tidur >= 7 ? 'badge-amber' : 'badge-red'}" style="margin-top:14px;">
            ${daily.tidur >= 8 ? tr('😴 Tidur cukup, mantap!', '😴 Well rested, nice!') : daily.tidur >= 7 ? tr('🙂 Hampir cukup — coba tidur lebih awal', '🙂 Almost enough — try sleeping earlier') : tr('⚠️ Kurang tidur — jaga kesehatanmu ya', '⚠️ Not enough sleep — take care of yourself')}
          </div>` : ''}
        </div>

        <!-- GAYA HIDUP SEHAT -->
        <div class="card">
          <div class="card-title"><ion-icon name="leaf" style="color:var(--brand)"></ion-icon>${tr('Gaya Hidup Sehat', 'Healthy Lifestyle')}</div>
          <div class="card-sub">${tr('Check-in harian — rayakan setiap hari bersihmu 💪', 'Daily check-in — celebrate every clean day 💪')}</div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
            <div class="list-item" style="padding:12px 14px;">
              <div class="streak-flame" style="background:var(--health-soft)">🚭</div>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:.9rem;">${tr('Bebas rokok / vape', 'Smoke / vape free')}</div>
                <div style="font-size:.78rem;color:var(--text-3);">${tr('Streak:', 'Streak:')} <b style="color:var(--brand-dark)">${streakRokok} ${tr('hari', 'days')}</b></div>
              </div>
              <label class="switch"><input type="checkbox" id="ckRokok" ${daily.bebasRokok ? 'checked' : ''}><span class="track"></span></label>
            </div>
            <div class="list-item" style="padding:12px 14px;">
              <div class="streak-flame" style="background:var(--prod-soft)">🥤</div>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:.9rem;">${tr('Bebas miras / alkohol', 'Alcohol free')}</div>
                <div style="font-size:.78rem;color:var(--text-3);">${tr('Streak:', 'Streak:')} <b style="color:var(--brand-dark)">${streakMiras} ${tr('hari', 'days')}</b></div>
              </div>
              <label class="switch"><input type="checkbox" id="ckMiras" ${daily.bebasMiras ? 'checked' : ''}><span class="track"></span></label>
            </div>
          </div>
        </div>
      </div>`;

    /* --- interaksi air --- */
    // Simpan total gelas (air) & jumlah gelas tambahan (airExtra) sekaligus.
    const setWater = async (air, extra) => {
      await DB.saveDaily(todayStr(), { air: clamp(air, 0, 60), airExtra: clamp(extra, 0, 40) });
      this.render($('#view'));
    };
    $$('#waterCups .water-cup', el).forEach(c => c.onclick = () => {
      const i = +c.dataset.i;
      if (i < targetAir) {
        // Gelas target → checklist (klik gelas terakhir yang tercentang = batalkan)
        const nc = (i + 1 === checkedAir ? i : i + 1);
        setWater(nc + extraAir, extraAir);
      } else {
        // Gelas tambahan → kurangi dari titik ini (klik yang terakhir = hapus satu)
        const j = i - targetAir;
        const ne = (j + 1 === extraAir ? j : j + 1);
        setWater(checkedAir + ne, ne);
      }
    });
    // + menambah gelas baru (ekstra), bukan menceklist gelas target yang ada
    $('#waterPlus', el).onclick = () => setWater((daily.air || 0) + 1, extraAir + 1);
    // − hanya mengurangi gelas tambahan; gelas target tidak bisa dikurangi lewat sini
    $('#waterMinus', el).onclick = () => { if (extraAir > 0) setWater((daily.air || 0) - 1, extraAir - 1); };

    /* --- interaksi kalori --- */
    $$('[data-kal]', el).forEach(b => b.onclick = async () => {
      await DB.saveDaily(todayStr(), { kalori: daily.kalori + +b.dataset.kal });
      toast(tr(`+${b.dataset.kal} kkal dicatat 🔥`, `+${b.dataset.kal} kcal logged 🔥`));
      this.render($('#view'));
    });
    $('#kalCustom', el).onclick = () => {
      openModal({
        title: tr('Catat Energi (kkal)', 'Log Energy (kcal)'),
        body: `
          <div class="field">
            <label>${tr('Jumlah kalori', 'Calorie amount')}</label>
            <div class="input-group">
              <input type="number" class="input" id="mKal" min="1" max="3000" placeholder="${tr('mis. 450', 'e.g. 450')}">
              <span class="input-unit">${tr('kkal', 'kcal')}</span>
            </div>
            <div class="hint">${tr('Perkiraan saja tidak apa-apa — yang penting sadar porsi 😊', 'A rough estimate is fine — being aware of portions is what counts 😊')}</div>
          </div>
          <button class="btn btn-primary btn-block" id="mKalSave">${tr('Catat', 'Log')}</button>`,
        onMount(m) {
          $('#mKalSave', m).onclick = async () => {
            const v = +$('#mKal', m).value;
            if (!v || v < 1) return toast(tr('Masukkan jumlah kalori.', 'Enter a calorie amount.'), 'warning');
            await DB.saveDaily(todayStr(), { kalori: daily.kalori + v });
            closeModal();
            toast(tr(`+${v} kkal dicatat 🔥`, `+${v} kcal logged 🔥`));
            App.refresh();
          };
        }
      });
    };

    /* --- tidur --- */
    $('#tidurSave', el).onclick = async () => {
      const v = +$('#tidurInput', el).value;
      if (v < 0 || v > 16) return toast(tr('Masukkan jam tidur yang wajar (0–16).', 'Enter a reasonable number of sleep hours (0–16).'), 'warning');
      await DB.saveDaily(todayStr(), { tidur: v });
      toast(tr('Jam tidur tersimpan 🌙', 'Sleep hours saved 🌙'));
      this.render($('#view'));
    };

    /* --- gaya hidup --- */
    $('#ckRokok', el).onchange = async e => {
      await DB.saveDaily(todayStr(), { bebasRokok: e.target.checked });
      if (e.target.checked) toast(tr('Keren! Satu hari lagi bebas rokok 🚭', 'Awesome! Another smoke-free day 🚭'));
      this.render($('#view'));
    };
    $('#ckMiras', el).onchange = async e => {
      await DB.saveDaily(todayStr(), { bebasMiras: e.target.checked });
      if (e.target.checked) toast(tr('Mantap! Tetap bersih hari ini 💪', 'Nice! Staying clean today 💪'));
      this.render($('#view'));
    };
  },

  // Hitung streak hari beruntun (berakhir hari ini, atau kemarin bila hari ini belum check-in)
  _streak(all, field) {
    const byDate = {};
    all.forEach(d => byDate[d.tanggal] = d);
    let streak = 0;
    const cursor = new Date();
    const today = byDate[todayStr()];
    if (!today || today[field] !== true) cursor.setDate(cursor.getDate() - 1);
    while (true) {
      const rec = byDate[todayStr(cursor)];
      if (rec && rec[field] === true) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else break;
    }
    return streak;
  },

  /* ============ TAB: KALKULATOR ============ */

  renderCalc(el) {
    const u = DB.user;
    el.innerHTML = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title"><ion-icon name="calculator" style="color:var(--brand)"></ion-icon>${tr('Kalkulator Makanan Seimbang', 'Balanced Diet Calculator')}</div>
          <div class="card-sub">${tr('Kebutuhan energi (BMR/TDEE) &amp; berat badan ideal (BMI)', 'Energy needs (BMR/TDEE) &amp; ideal body weight (BMI)')}</div>
          <form id="calcForm" style="margin-top:18px;" novalidate>
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>${tr('Usia', 'Age')}</label>
                <div class="input-group"><input type="number" class="input" id="cUsia" value="${u.usia || ''}"><span class="input-unit">${tr('th', 'yrs')}</span></div>
              </div>
              <div class="field">
                <label>${tr('Jenis kelamin', 'Sex')}</label>
                <select class="select" id="cJK">
                  <option value="L" ${u.jenisKelamin !== 'P' ? 'selected' : ''}>${tr('Laki-laki', 'Male')}</option>
                  <option value="P" ${u.jenisKelamin === 'P' ? 'selected' : ''}>${tr('Perempuan', 'Female')}</option>
                </select>
              </div>
            </div>
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>${tr('Tinggi', 'Height')}</label>
                <div class="input-group"><input type="number" class="input" id="cTinggi" min="100" max="230" value="${u.tinggi || ''}"><span class="input-unit">cm</span></div>
              </div>
              <div class="field">
                <label>${tr('Berat', 'Weight')}</label>
                <div class="input-group"><input type="number" class="input" id="cBerat" min="25" max="200" value="${u.berat || ''}"><span class="input-unit">kg</span></div>
              </div>
            </div>
            <div class="field">
              <label>${tr('Tingkat aktivitas', 'Activity level')}</label>
              <select class="select" id="cAktivitas">
                ${Calc.AKTIVITAS.map(a => `<option value="${a.key}" ${a.key === u.aktivitas ? 'selected' : ''}>${a.label}</option>`).join('')}
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">${tr('Hitung', 'Calculate')} <ion-icon name="sparkles"></ion-icon></button>
          </form>
        </div>
        <div id="calcResult">
          ${this.calcResult ? this._calcResultHTML(this.calcResult) : `
            <div class="card empty-state">
              <ion-icon name="nutrition-outline"></ion-icon>
              <div class="es-title">${tr('Hasil akan tampil di sini', 'Results will show up here')}</div>
              <div class="es-sub">${tr('Isi data di samping lalu tekan Hitung', 'Fill in the form and hit Calculate')}</div>
            </div>`}
        </div>
      </div>

      <!-- ISI PIRINGKU -->
      <div class="card" style="margin-top:16px;">
        <div class="card-title"><ion-icon name="restaurant" style="color:var(--fin)"></ion-icon>${tr('Saran Menu — "Isi Piringku" (Kemenkes RI)', 'Meal Guide — "Isi Piringku" (Balanced Plate guide, Indonesian MoH)')}</div>
        <div class="card-sub">${tr('Panduan porsi makan seimbang dalam satu piring', 'A guide to balanced portions on a single plate')}</div>
        <div class="grid grid-2" style="margin-top:20px;align-items:center;">
          <div class="plate" role="img" aria-label="${tr('Diagram porsi Isi Piringku', 'Isi Piringku portion diagram')}"></div>
          <div>
            <div class="plate-legend">
              <div class="pl-item"><span class="pl-dot" style="background:#fbbf24"></span> ${tr('Makanan pokok — ⅓ piring', 'Staple food — ⅓ of the plate')}</div>
              <div class="pl-item"><span class="pl-dot" style="background:#34d399"></span> ${tr('Sayuran — ⅓ piring', 'Vegetables — ⅓ of the plate')}</div>
              <div class="pl-item"><span class="pl-dot" style="background:#f59e0b"></span> ${tr('Lauk-pauk — ⅙ piring', 'Protein sides — ⅙ of the plate')}</div>
              <div class="pl-item"><span class="pl-dot" style="background:#6ee7b7"></span> ${tr('Buah-buahan — ⅙ piring', 'Fruits — ⅙ of the plate')}</div>
            </div>
            <div style="margin-top:18px;display:flex;flex-direction:column;gap:9px;font-size:.84rem;color:var(--text-2);">
              <div>🍚 ${tr('<b>Pokok:</b> nasi, kentang, singkong, jagung, mie', '<b>Staples:</b> rice, potatoes, cassava, corn, noodles')}</div>
              <div>🥦 ${tr('<b>Sayur:</b> bayam, kangkung, wortel, brokoli', '<b>Veggies:</b> spinach, water spinach, carrots, broccoli')}</div>
              <div>🍗 ${tr('<b>Lauk:</b> telur, ayam, ikan, tempe, tahu', '<b>Protein:</b> eggs, chicken, fish, tempeh, tofu')}</div>
              <div>🍉 ${tr('<b>Buah:</b> pisang, pepaya, jeruk, semangka', '<b>Fruit:</b> banana, papaya, orange, watermelon')}</div>
              <div style="margin-top:4px;color:var(--text-3);font-size:.78rem;">${tr('+ Minum air putih cukup, batasi gula-garam-lemak, dan aktif bergerak 🏃', '+ Drink enough water, go easy on sugar-salt-fat, and keep moving 🏃')}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="disclaimer" style="margin-top:16px;">
        <ion-icon name="shield-checkmark-outline"></ion-icon>
        <span>${tr('Angka di atas adalah <b>perkiraan kebutuhan energi</b> untuk membantumu makan seimbang — bukan target diet. Jangan mengurangi makan secara ekstrem; bila ragu, konsultasikan dengan tenaga kesehatan.', 'The numbers above are an <b>estimate of your energy needs</b> to help you eat balanced meals — not a diet target. Don\'t cut back on food drastically; when in doubt, talk to a health professional.')}</span>
      </div>`;

    $('#calcForm', el).onsubmit = e => {
      e.preventDefault();
      const usia = +$('#cUsia', el).value, tinggi = +$('#cTinggi', el).value, berat = +$('#cBerat', el).value;
      if (!usia || !tinggi || !berat) return toast(tr('Lengkapi usia, tinggi, dan berat dulu ya.', 'Fill in your age, height, and weight first, okay?'), 'warning');
      const jenisKelamin = $('#cJK', el).value, aktivitas = $('#cAktivitas', el).value;
      const bmr = Calc.bmr({ jenisKelamin, berat, tinggi, usia });
      const tdee = Calc.tdee(bmr, aktivitas);
      const bmi = Calc.bmi(berat, tinggi);
      this.calcResult = { usia, jenisKelamin, tinggi, berat, aktivitas, bmr, tdee, bmi };
      $('#calcResult', el).innerHTML = this._calcResultHTML(this.calcResult);
      this._bindCalcResult(el);
    };
    this._bindCalcResult(el);
  },

  _calcResultHTML(r) {
    const info = Calc.bmiInfo(r.bmi);
    const range = Calc.idealRange(r.tinggi);
    // posisi marker pada skala 14–36
    const pos = clamp((r.bmi - 14) / (36 - 14) * 100, 2, 98);
    return `
      <div class="card" style="animation:fadeUp .35s ease both;">
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div style="background:var(--surface-2);border-radius:15px;padding:15px;">
            <div style="font-size:.72rem;font-weight:700;color:var(--text-3);">${tr('BMR (energi basal)', 'BMR (basal energy)')}</div>
            <div class="stat-row"><span class="stat-num" style="font-size:1.3rem;">${r.bmr.toLocaleString('id-ID')}</span><span class="stat-unit">${tr('kkal', 'kcal')}</span></div>
          </div>
          <div style="background:var(--brand-soft);border-radius:15px;padding:15px;">
            <div style="font-size:.72rem;font-weight:700;color:var(--brand-dark);">${tr('TDEE (kebutuhan harian)', 'TDEE (daily needs)')}</div>
            <div class="stat-row"><span class="stat-num" style="font-size:1.3rem;color:var(--brand-dark)">${r.tdee.toLocaleString('id-ID')}</span><span class="stat-unit">${tr('kkal', 'kcal')}</span></div>
          </div>
        </div>

        <div style="margin-top:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:.72rem;font-weight:700;color:var(--text-3);">${tr('INDEKS MASSA TUBUH (BMI)', 'BODY MASS INDEX (BMI)')}</div>
              <div class="stat-row"><span class="stat-num">${r.bmi}</span><span class="badge ${info.badge}">${info.kategori}</span></div>
            </div>
          </div>
          <div class="bmi-scale"><div class="bmi-marker" style="left:${pos}%"></div></div>
          <div class="bmi-labels"><span>${tr('Kurang', 'Under')}</span><span>${tr('Normal', 'Normal')}</span><span>${tr('Berlebih', 'Over')}</span><span>${tr('Obesitas', 'Obese')}</span></div>
          <p style="font-size:.82rem;color:var(--text-2);margin-top:12px;line-height:1.6;">${info.pesan}</p>
          <div style="font-size:.82rem;color:var(--text-2);margin-top:8px;">
            ${tr(`Rentang berat sehat untuk tinggimu: <b>${range.min}–${range.max} kg</b>`, `Healthy weight range for your height: <b>${range.min}–${range.max} kg</b>`)}
          </div>
        </div>
        <button class="btn btn-primary btn-block" id="applyTarget" style="margin-top:18px;">
          <ion-icon name="checkmark-circle"></ion-icon> ${tr('Jadikan Target Harianku', 'Set as My Daily Target')}
        </button>
      </div>`;
  },

  _bindCalcResult(el) {
    const btn = $('#applyTarget', el);
    if (!btn) return;
    btn.onclick = async () => {
      const r = this.calcResult;
      await DB.updateUser({
        usia: r.usia, jenisKelamin: r.jenisKelamin, tinggi: r.tinggi, berat: r.berat,
        aktivitas: r.aktivitas, targetKalori: r.tdee, targetAir: Calc.waterTarget(r.berat).gelas
      });
      toast(tr(`Target diperbarui: ±${r.tdee.toLocaleString('id-ID')} kkal/hari ✅`, `Target updated: ±${r.tdee.toLocaleString('id-ID')} kcal/day ✅`));
    };
  },

  /* ============ TAB: TIDUR ============ */

  renderSleep(el) {
    const [hh, mm] = this.sleepTime.split(':').map(Number);
    const options = Calc.sleepTimes(hh, mm, this.sleepMode);
    const isBangun = this.sleepMode === 'bangun';

    el.innerHTML = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title"><ion-icon name="moon" style="color:var(--prod)"></ion-icon>${tr('Kalkulator Siklus Tidur', 'Sleep Cycle Calculator')}</div>
          <div class="card-sub">${tr('Tidur dalam kelipatan siklus 90 menit membuat bangun lebih segar', 'Sleeping in multiples of 90-minute cycles helps you wake up fresher')}</div>

          <div class="tabs" style="margin:18px 0 14px;width:100%;">
            <button class="tab ${isBangun ? 'active' : ''}" data-smode="bangun" style="flex:1;">${tr('⏰ Mau bangun jam…', '⏰ I want to wake at…')}</button>
            <button class="tab ${!isBangun ? 'active' : ''}" data-smode="tidur" style="flex:1;">${tr('🛏️ Tidur jam…', '🛏️ Going to bed at…')}</button>
          </div>

          <div class="field">
            <label>${isBangun ? tr('Jam bangun yang diinginkan', 'Desired wake-up time') : tr('Jam mulai tidur', 'Bedtime')}</label>
            <input type="time" class="input" id="sleepTimeInput" value="${this.sleepTime}">
            <div class="hint">${tr('Sudah termasuk ±15 menit waktu untuk terlelap.', 'Already includes ±15 minutes to fall asleep.')}</div>
          </div>

          <div class="disclaimer">
            <ion-icon name="bulb-outline"></ion-icon>
            <span>${tr('Remaja butuh <b>8–10 jam</b> tidur. Hindari layar HP 30–60 menit sebelum tidur agar lebih cepat terlelap.', 'Teens need <b>8–10 hours</b> of sleep. Avoid phone screens 30–60 minutes before bed so you fall asleep faster.')}</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">${isBangun ? tr('🌙 Sebaiknya mulai tidur pukul…', '🌙 Best times to fall asleep…') : tr('⏰ Sebaiknya bangun pukul…', '⏰ Best times to wake up…')}</div>
          <div style="display:flex;flex-direction:column;gap:11px;margin-top:16px;">
            ${options.map(o => `
              <div class="sleep-option ${o.best ? 'best' : ''}">
                <div class="sleep-time">${o.time}</div>
                <div style="flex:1;">
                  <div style="font-weight:700;font-size:.88rem;">${tr(`${o.cycles} siklus tidur`, `${o.cycles} sleep cycles`)}</div>
                  <div style="font-size:.78rem;color:var(--text-3);">${tr(`± ${o.durasi} tidur`, `± ${o.durasi} of sleep`)}</div>
                </div>
                ${o.best ? `<span class="badge badge-green">${tr('Disarankan', 'Recommended')}</span>` : `<span class="badge badge-gray">${o.cycles <= 3 ? tr('Darurat saja', 'Emergencies only') : tr('Cukup', 'Okay')}</span>`}
              </div>`).join('')}
          </div>
        </div>
      </div>`;

    $$('[data-smode]', el).forEach(t => t.onclick = () => {
      this.sleepMode = t.dataset.smode;
      if (this.sleepMode === 'tidur') {
        const now = new Date();
        this.sleepTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      } else this.sleepTime = '06:00';
      this.renderSleep(el);
    });
    $('#sleepTimeInput', el).onchange = e => {
      if (e.target.value) { this.sleepTime = e.target.value; this.renderSleep(el); }
    };
  },

  /* ============ TAB: OLAHRAGA ============ */

  async renderSport(el) {
    const user = DB.user;
    const workouts = (await DB.list('workouts')).sort((a, b) => b.tanggal < a.tanggal ? -1 : 1);
    const targetMingguan = user.targetOlahraga || 150;

    // menit minggu ini (Senin–Minggu)
    const now = parseDate(todayStr());
    const senin = new Date(now);
    senin.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const seninStr = todayStr(senin);
    const mingguIni = workouts.filter(w => w.tanggal >= seninStr && w.tanggal <= todayStr());
    const menitMingguIni = mingguIni.reduce((s, w) => s + w.durasi, 0);
    const kaloriMingguIni = mingguIni.reduce((s, w) => s + Calc.caloriesBurned(w.jenis, w.durasi, user.berat), 0);
    const pct = clamp(Math.round(menitMingguIni / targetMingguan * 100), 0, 100);

    el.innerHTML = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title"><ion-icon name="barbell" style="color:var(--brand)"></ion-icon>${tr('Target Mingguan', 'Weekly Target')}</div>
          <div class="card-sub">${tr('WHO menyarankan remaja aktif ±60 menit/hari', 'WHO recommends teens stay active ±60 minutes/day')}</div>
          <div class="stat-row" style="margin:16px 0 10px;">
            <span class="stat-num">${menitMingguIni}</span>
            <span class="stat-unit">${tr(`/ ${targetMingguan} menit minggu ini`, `/ ${targetMingguan} minutes this week`)}</span>
          </div>
          <div class="progress" style="margin-bottom:12px;"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="badge badge-amber" style="margin-bottom:14px;">🔥 ${tr(`± ${kaloriMingguIni.toLocaleString('id-ID')} kkal terbakar minggu ini`, `± ${kaloriMingguIni.toLocaleString('id-ID')} kcal burned this week`)}</div>
          ${pct >= 100 ? `<div class="badge badge-green" style="margin-bottom:14px;margin-left:6px;">${tr('🏆 Target minggu ini tercapai!', '🏆 Weekly target reached!')}</div>` : ''}
          <div style="display:flex;gap:10px;">
            <button class="btn btn-primary" id="addWorkout" style="flex:1;"><ion-icon name="add"></ion-icon> ${tr('Catat Latihan', 'Log Workout')}</button>
            <button class="btn" id="editTarget"><ion-icon name="options-outline"></ion-icon></button>
          </div>
        </div>

        <div class="card">
          <div class="card-title"><ion-icon name="sparkles" style="color:var(--fin)"></ion-icon>${tr('Ide Gerak Ringan', 'Easy Activity Ideas')}</div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;font-size:.86rem;color:var(--text-2);">
            <div class="list-item" style="padding:11px 14px;">${tr('🚶 Jalan kaki ke sekolah / keliling komplek — 20–30 menit', '🚶 Walk to school / around the block — 20–30 minutes')}</div>
            <div class="list-item" style="padding:11px 14px;">${tr('🤸 Peregangan pagi setelah bangun — 10 menit', '🤸 Morning stretch after waking up — 10 minutes')}</div>
            <div class="list-item" style="padding:11px 14px;">${tr('⚽ Main futsal / basket bareng teman — 45–60 menit', '⚽ Play futsal / basketball with friends — 45–60 minutes')}</div>
            <div class="list-item" style="padding:11px 14px;">${tr('🚴 Bersepeda santai sore hari — 30 menit', '🚴 Casual afternoon bike ride — 30 minutes')}</div>
          </div>
        </div>
      </div>

      <div class="section-head"><h2>${tr('Riwayat Latihan', 'Workout History')}</h2></div>
      ${workouts.length ? `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${workouts.slice(0, 20).map(w => `
            <div class="list-item">
              <div class="item-icon" style="background:var(--health-soft);">${this._sportEmoji(w.jenis)}</div>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:.9rem;">${esc(this._jenisLabel(w.jenis))}</div>
                <div style="font-size:.77rem;color:var(--text-3);">${fmtDate(w.tanggal, { weekday: true })}</div>
              </div>
              <span class="badge badge-green">${tr(`${w.durasi} menit`, `${w.durasi} minutes`)}</span>
              <span class="badge badge-amber">🔥 ${Calc.caloriesBurned(w.jenis, w.durasi, user.berat)} kkal</span>
              <button class="mini-icon-btn danger" data-del="${w.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="barbell-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada latihan tercatat', 'No workouts logged yet')}</div>
          <div class="es-sub">${tr('Mulai dari yang ringan — jalan kaki juga dihitung! 🚶', 'Start light — walking counts too! 🚶')}</div>
        </div>`}`;

    $('#addWorkout', el).onclick = () => this._workoutModal();
    $('#editTarget', el).onclick = () => {
      openModal({
        title: tr('Target Olahraga Mingguan', 'Weekly Exercise Target'),
        body: `
          <div class="field">
            <label>${tr('Target menit per minggu', 'Target minutes per week')}</label>
            <div class="input-group">
              <input type="number" class="input" id="mTarget" min="30" max="1200" value="${targetMingguan}">
              <span class="input-unit">${tr('menit', 'minutes')}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-block" id="mTargetSave">${tr('Simpan', 'Save')}</button>`,
        onMount(m) {
          $('#mTargetSave', m).onclick = async () => {
            const v = +$('#mTarget', m).value;
            if (!v || v < 30) return toast(tr('Minimal 30 menit per minggu ya.', 'At least 30 minutes per week, okay?'), 'warning');
            await DB.updateUser({ targetOlahraga: v });
            closeModal(); toast(tr('Target olahraga diperbarui 💪', 'Exercise target updated 💪')); App.refresh();
          };
        }
      });
    };
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      const w = workouts.find(x => x.id === b.dataset.del);
      if (!await confirmDialog(tr('Hapus catatan latihan ini?', 'Delete this workout entry?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      await DB.remove('workouts', w.id);
      await this._syncDailySport(w.tanggal);
      toast(tr('Catatan latihan dihapus.', 'Workout entry deleted.'));
      App.refresh();
    });
  },

  _sportEmoji(jenis) {
    const map = { 'Lari': '🏃', 'Jalan kaki': '🚶', 'Bersepeda': '🚴', 'Renang': '🏊',
      'Futsal / Sepak bola': '⚽', 'Basket': '🏀', 'Badminton': '🏸', 'Workout / Gym': '🏋️', 'Senam / Yoga': '🧘' };
    return map[jenis] || '💪';
  },

  // Label tampilan untuk jenis latihan (nilai DB tetap bahasa Indonesia)
  _jenisLabel(jenis) {
    const en = { 'Jalan kaki': 'Walking', 'Lari': 'Running', 'Bersepeda': 'Cycling', 'Renang': 'Swimming',
      'Futsal / Sepak bola': 'Futsal / Soccer', 'Basket': 'Basketball', 'Badminton': 'Badminton',
      'Workout / Gym': 'Workout / Gym', 'Senam / Yoga': 'Gymnastics / Yoga', 'Lainnya': 'Other' };
    return tr(jenis, en[jenis] || jenis);
  },

  _workoutModal() {
    const jenisList = ['Jalan kaki', 'Lari', 'Bersepeda', 'Renang', 'Futsal / Sepak bola',
      'Basket', 'Badminton', 'Workout / Gym', 'Senam / Yoga', 'Lainnya'];
    openModal({
      title: tr('Catat Latihan', 'Log Workout'),
      body: `
        <div class="field">
          <label>${tr('Jenis latihan', 'Workout type')}</label>
          <select class="select" id="mJenis">${jenisList.map(j => `<option value="${j}">${this._jenisLabel(j)}</option>`).join('')}</select>
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>${tr('Durasi', 'Duration')}</label>
            <div class="input-group"><input type="number" class="input" id="mDurasi" min="5" max="600" placeholder="30"><span class="input-unit">${tr('menit', 'minutes')}</span></div>
          </div>
          <div class="field">
            <label>${tr('Tanggal', 'Date')}</label>
            <input type="date" class="input" id="mTanggal" value="${todayStr()}" max="${todayStr()}">
          </div>
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const durasi = +$('#mDurasi', m).value;
          const tanggal = $('#mTanggal', m).value;
          if (!durasi || durasi < 5) return toast(tr('Durasi minimal 5 menit.', 'Duration must be at least 5 minutes.'), 'warning');
          if (!tanggal) return toast(tr('Pilih tanggal latihan.', 'Pick a workout date.'), 'warning');
          await DB.add('workouts', { jenis: $('#mJenis', m).value, durasi, tanggal });
          await this._syncDailySport(tanggal);
          closeModal();
          toast(tr('Latihan tercatat — keren! 💪', 'Workout logged — nice! 💪'));
          App.refresh();
        };
      }
    });
  },

  // Sinkronkan total menit olahraga ke catatan harian (dipakai Skor Keseimbangan)
  async _syncDailySport(tanggal) {
    const workouts = await DB.list('workouts');
    const total = workouts.filter(w => w.tanggal === tanggal).reduce((s, w) => s + w.durasi, 0);
    await DB.saveDaily(tanggal, { olahraga: total });
  }
};
