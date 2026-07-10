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
    el.innerHTML = `
      <div class="tabs">
        <button class="tab ${this.tab === 'today' ? 'active' : ''}" data-tab="today"><ion-icon name="sunny-outline"></ion-icon>Hari Ini</button>
        <button class="tab ${this.tab === 'calc' ? 'active' : ''}" data-tab="calc"><ion-icon name="calculator-outline"></ion-icon>Kalkulator</button>
        <button class="tab ${this.tab === 'sleep' ? 'active' : ''}" data-tab="sleep"><ion-icon name="moon-outline"></ion-icon>Tidur</button>
        <button class="tab ${this.tab === 'sport' ? 'active' : ''}" data-tab="sport"><ion-icon name="barbell-outline"></ion-icon>Olahraga</button>
      </div>
      <div id="healthBody"></div>`;

    $$('.tab', el).forEach(t => t.onclick = () => { this.tab = t.dataset.tab; this.render(el); });

    const body = $('#healthBody', el);
    if (this.tab === 'today') await this.renderToday(body);
    else if (this.tab === 'calc') this.renderCalc(body);
    else if (this.tab === 'sleep') this.renderSleep(body);
    else await this.renderSport(body);
  },

  /* ============ TAB: HARI INI ============ */

  async renderToday(el) {
    const user = DB.user;
    const daily = await DB.getDaily();
    const all = await DB.list('health_daily');
    const targetAir = user.targetAir || 8;
    const targetKalori = user.targetKalori || 2000;
    const pctKalori = clamp(Math.round((daily.kalori / targetKalori) * 100), 0, 100);

    const streakRokok = this._streak(all, 'bebasRokok');
    const streakMiras = this._streak(all, 'bebasMiras');

    el.innerHTML = `
      <div class="grid grid-2">

        <!-- AIR MINUM -->
        <div class="card">
          <div class="card-title"><ion-icon name="water" style="color:var(--info)"></ion-icon>Pengingat Minum</div>
          <div class="card-sub">Target: ${targetAir} gelas (± ${Calc.waterTarget(user.berat || 55).liter} liter) / hari</div>
          <div class="water-cups" id="waterCups">
            ${Array.from({ length: targetAir }, (_, i) => `
              <button class="water-cup ${i < daily.air ? 'filled' : ''}" data-i="${i}" title="Gelas ke-${i + 1}">
                <ion-icon name="${i < daily.air ? 'water' : 'water-outline'}"></ion-icon>
              </button>`).join('')}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div class="stat-row"><span class="stat-num" style="color:var(--info)">${daily.air}</span><span class="stat-unit">/ ${targetAir} gelas</span></div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm" id="waterMinus"><ion-icon name="remove"></ion-icon></button>
              <button class="btn btn-sm btn-primary" id="waterPlus"><ion-icon name="add"></ion-icon> Gelas</button>
            </div>
          </div>
          ${daily.air >= targetAir ? '<div class="badge badge-blue" style="margin-top:12px;">🎉 Target minum hari ini tercapai!</div>' : ''}
        </div>

        <!-- KALORI -->
        <div class="card">
          <div class="card-title"><ion-icon name="flame" style="color:var(--fin)"></ion-icon>Energi Hari Ini</div>
          <div class="card-sub">Perkiraan kebutuhan: ± ${targetKalori.toLocaleString('id-ID')} kkal</div>
          <div class="stat-row" style="margin:16px 0 10px;">
            <span class="stat-num">${daily.kalori.toLocaleString('id-ID')}</span>
            <span class="stat-unit">kkal tercatat</span>
          </div>
          <div class="progress" style="margin-bottom:16px;"><div class="progress-fill amber" style="width:${pctKalori}%"></div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-sm" data-kal="250">+ Camilan (±250)</button>
            <button class="btn btn-sm" data-kal="600">+ Makan (±600)</button>
            <button class="btn btn-sm btn-fin" id="kalCustom"><ion-icon name="add"></ion-icon> Manual</button>
          </div>
        </div>

        <!-- TIDUR -->
        <div class="card">
          <div class="card-title"><ion-icon name="moon" style="color:var(--prod)"></ion-icon>Tidur Semalam</div>
          <div class="card-sub">Remaja disarankan tidur 8–10 jam per malam</div>
          <div style="display:flex;gap:10px;align-items:center;margin-top:16px;">
            <div class="input-group" style="flex:1;">
              <input type="number" class="input" id="tidurInput" min="0" max="16" step="0.5" value="${daily.tidur || ''}" placeholder="mis. 7.5">
              <span class="input-unit">jam</span>
            </div>
            <button class="btn btn-prod" id="tidurSave">Simpan</button>
          </div>
          ${daily.tidur > 0 ? `<div class="badge ${daily.tidur >= 8 ? 'badge-green' : daily.tidur >= 7 ? 'badge-amber' : 'badge-red'}" style="margin-top:14px;">
            ${daily.tidur >= 8 ? '😴 Tidur cukup, mantap!' : daily.tidur >= 7 ? '🙂 Hampir cukup — coba tidur lebih awal' : '⚠️ Kurang tidur — jaga kesehatanmu ya'}
          </div>` : ''}
        </div>

        <!-- GAYA HIDUP SEHAT -->
        <div class="card">
          <div class="card-title"><ion-icon name="leaf" style="color:var(--brand)"></ion-icon>Gaya Hidup Sehat</div>
          <div class="card-sub">Check-in harian — rayakan setiap hari bersihmu 💪</div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
            <div class="list-item" style="padding:12px 14px;">
              <div class="streak-flame" style="background:var(--health-soft)">🚭</div>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:.9rem;">Bebas rokok / vape</div>
                <div style="font-size:.78rem;color:var(--text-3);">Streak: <b style="color:var(--brand-dark)">${streakRokok} hari</b></div>
              </div>
              <label class="switch"><input type="checkbox" id="ckRokok" ${daily.bebasRokok ? 'checked' : ''}><span class="track"></span></label>
            </div>
            <div class="list-item" style="padding:12px 14px;">
              <div class="streak-flame" style="background:var(--prod-soft)">🥤</div>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:.9rem;">Bebas miras / alkohol</div>
                <div style="font-size:.78rem;color:var(--text-3);">Streak: <b style="color:var(--brand-dark)">${streakMiras} hari</b></div>
              </div>
              <label class="switch"><input type="checkbox" id="ckMiras" ${daily.bebasMiras ? 'checked' : ''}><span class="track"></span></label>
            </div>
          </div>
        </div>
      </div>`;

    /* --- interaksi air --- */
    const setAir = async n => {
      await DB.saveDaily(todayStr(), { air: clamp(n, 0, 30) });
      this.render($('#view'));
    };
    $$('#waterCups .water-cup', el).forEach(c => c.onclick = () => {
      const i = +c.dataset.i;
      setAir(i + 1 === daily.air ? i : i + 1); // klik gelas terakhir yg terisi = batalkan
    });
    $('#waterPlus', el).onclick = () => setAir(daily.air + 1);
    $('#waterMinus', el).onclick = () => setAir(daily.air - 1);

    /* --- interaksi kalori --- */
    $$('[data-kal]', el).forEach(b => b.onclick = async () => {
      await DB.saveDaily(todayStr(), { kalori: daily.kalori + +b.dataset.kal });
      toast(`+${b.dataset.kal} kkal dicatat 🔥`);
      this.render($('#view'));
    });
    $('#kalCustom', el).onclick = () => {
      openModal({
        title: 'Catat Energi (kkal)',
        body: `
          <div class="field">
            <label>Jumlah kalori</label>
            <div class="input-group">
              <input type="number" class="input" id="mKal" min="1" max="3000" placeholder="mis. 450">
              <span class="input-unit">kkal</span>
            </div>
            <div class="hint">Perkiraan saja tidak apa-apa — yang penting sadar porsi 😊</div>
          </div>
          <button class="btn btn-primary btn-block" id="mKalSave">Catat</button>`,
        onMount(m) {
          $('#mKalSave', m).onclick = async () => {
            const v = +$('#mKal', m).value;
            if (!v || v < 1) return toast('Masukkan jumlah kalori.', 'warning');
            await DB.saveDaily(todayStr(), { kalori: daily.kalori + v });
            closeModal();
            toast(`+${v} kkal dicatat 🔥`);
            App.refresh();
          };
        }
      });
    };

    /* --- tidur --- */
    $('#tidurSave', el).onclick = async () => {
      const v = +$('#tidurInput', el).value;
      if (v < 0 || v > 16) return toast('Masukkan jam tidur yang wajar (0–16).', 'warning');
      await DB.saveDaily(todayStr(), { tidur: v });
      toast('Jam tidur tersimpan 🌙');
      this.render($('#view'));
    };

    /* --- gaya hidup --- */
    $('#ckRokok', el).onchange = async e => {
      await DB.saveDaily(todayStr(), { bebasRokok: e.target.checked });
      if (e.target.checked) toast('Keren! Satu hari lagi bebas rokok 🚭');
      this.render($('#view'));
    };
    $('#ckMiras', el).onchange = async e => {
      await DB.saveDaily(todayStr(), { bebasMiras: e.target.checked });
      if (e.target.checked) toast('Mantap! Tetap bersih hari ini 💪');
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
          <div class="card-title"><ion-icon name="calculator" style="color:var(--brand)"></ion-icon>Kalkulator Makanan Seimbang</div>
          <div class="card-sub">Kebutuhan energi (BMR/TDEE) &amp; berat badan ideal (BMI)</div>
          <form id="calcForm" style="margin-top:18px;" novalidate>
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>Usia</label>
                <div class="input-group"><input type="number" class="input" id="cUsia" min="10" max="25" value="${u.usia || ''}"><span class="input-unit">th</span></div>
              </div>
              <div class="field">
                <label>Jenis kelamin</label>
                <select class="select" id="cJK">
                  <option value="L" ${u.jenisKelamin !== 'P' ? 'selected' : ''}>Laki-laki</option>
                  <option value="P" ${u.jenisKelamin === 'P' ? 'selected' : ''}>Perempuan</option>
                </select>
              </div>
            </div>
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>Tinggi</label>
                <div class="input-group"><input type="number" class="input" id="cTinggi" min="100" max="230" value="${u.tinggi || ''}"><span class="input-unit">cm</span></div>
              </div>
              <div class="field">
                <label>Berat</label>
                <div class="input-group"><input type="number" class="input" id="cBerat" min="25" max="200" value="${u.berat || ''}"><span class="input-unit">kg</span></div>
              </div>
            </div>
            <div class="field">
              <label>Tingkat aktivitas</label>
              <select class="select" id="cAktivitas">
                ${Calc.AKTIVITAS.map(a => `<option value="${a.key}" ${a.key === u.aktivitas ? 'selected' : ''}>${a.label}</option>`).join('')}
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Hitung <ion-icon name="sparkles"></ion-icon></button>
          </form>
        </div>
        <div id="calcResult">
          ${this.calcResult ? this._calcResultHTML(this.calcResult) : `
            <div class="card empty-state">
              <ion-icon name="nutrition-outline"></ion-icon>
              <div class="es-title">Hasil akan tampil di sini</div>
              <div class="es-sub">Isi data di samping lalu tekan Hitung</div>
            </div>`}
        </div>
      </div>

      <!-- ISI PIRINGKU -->
      <div class="card" style="margin-top:16px;">
        <div class="card-title"><ion-icon name="restaurant" style="color:var(--fin)"></ion-icon>Saran Menu — "Isi Piringku" (Kemenkes RI)</div>
        <div class="card-sub">Panduan porsi makan seimbang dalam satu piring</div>
        <div class="grid grid-2" style="margin-top:20px;align-items:center;">
          <div class="plate" role="img" aria-label="Diagram porsi Isi Piringku"></div>
          <div>
            <div class="plate-legend">
              <div class="pl-item"><span class="pl-dot" style="background:#fbbf24"></span> Makanan pokok — ⅓ piring</div>
              <div class="pl-item"><span class="pl-dot" style="background:#34d399"></span> Sayuran — ⅓ piring</div>
              <div class="pl-item"><span class="pl-dot" style="background:#f59e0b"></span> Lauk-pauk — ⅙ piring</div>
              <div class="pl-item"><span class="pl-dot" style="background:#6ee7b7"></span> Buah-buahan — ⅙ piring</div>
            </div>
            <div style="margin-top:18px;display:flex;flex-direction:column;gap:9px;font-size:.84rem;color:var(--text-2);">
              <div>🍚 <b>Pokok:</b> nasi, kentang, singkong, jagung, mie</div>
              <div>🥦 <b>Sayur:</b> bayam, kangkung, wortel, brokoli</div>
              <div>🍗 <b>Lauk:</b> telur, ayam, ikan, tempe, tahu</div>
              <div>🍉 <b>Buah:</b> pisang, pepaya, jeruk, semangka</div>
              <div style="margin-top:4px;color:var(--text-3);font-size:.78rem;">+ Minum air putih cukup, batasi gula-garam-lemak, dan aktif bergerak 🏃</div>
            </div>
          </div>
        </div>
      </div>

      <div class="disclaimer" style="margin-top:16px;">
        <ion-icon name="shield-checkmark-outline"></ion-icon>
        <span>Angka di atas adalah <b>perkiraan kebutuhan energi</b> untuk membantumu makan seimbang — bukan target diet. Jangan mengurangi makan secara ekstrem; bila ragu, konsultasikan dengan tenaga kesehatan.</span>
      </div>`;

    $('#calcForm', el).onsubmit = e => {
      e.preventDefault();
      const usia = +$('#cUsia', el).value, tinggi = +$('#cTinggi', el).value, berat = +$('#cBerat', el).value;
      if (!usia || !tinggi || !berat) return toast('Lengkapi usia, tinggi, dan berat dulu ya.', 'warning');
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
            <div style="font-size:.72rem;font-weight:700;color:var(--text-3);">BMR (energi basal)</div>
            <div class="stat-row"><span class="stat-num" style="font-size:1.3rem;">${r.bmr.toLocaleString('id-ID')}</span><span class="stat-unit">kkal</span></div>
          </div>
          <div style="background:var(--brand-soft);border-radius:15px;padding:15px;">
            <div style="font-size:.72rem;font-weight:700;color:var(--brand-dark);">TDEE (kebutuhan harian)</div>
            <div class="stat-row"><span class="stat-num" style="font-size:1.3rem;color:var(--brand-dark)">${r.tdee.toLocaleString('id-ID')}</span><span class="stat-unit">kkal</span></div>
          </div>
        </div>

        <div style="margin-top:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:.72rem;font-weight:700;color:var(--text-3);">INDEKS MASSA TUBUH (BMI)</div>
              <div class="stat-row"><span class="stat-num">${r.bmi}</span><span class="badge ${info.badge}">${info.kategori}</span></div>
            </div>
          </div>
          <div class="bmi-scale"><div class="bmi-marker" style="left:${pos}%"></div></div>
          <div class="bmi-labels"><span>Kurang</span><span>Normal</span><span>Berlebih</span><span>Obesitas</span></div>
          <p style="font-size:.82rem;color:var(--text-2);margin-top:12px;line-height:1.6;">${info.pesan}</p>
          <div style="font-size:.82rem;color:var(--text-2);margin-top:8px;">
            Rentang berat sehat untuk tinggimu: <b>${range.min}–${range.max} kg</b>
          </div>
        </div>
        <button class="btn btn-primary btn-block" id="applyTarget" style="margin-top:18px;">
          <ion-icon name="checkmark-circle"></ion-icon> Jadikan Target Harianku
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
      toast(`Target diperbarui: ±${r.tdee.toLocaleString('id-ID')} kkal/hari ✅`);
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
          <div class="card-title"><ion-icon name="moon" style="color:var(--prod)"></ion-icon>Kalkulator Siklus Tidur</div>
          <div class="card-sub">Tidur dalam kelipatan siklus 90 menit membuat bangun lebih segar</div>

          <div class="tabs" style="margin:18px 0 14px;width:100%;">
            <button class="tab ${isBangun ? 'active' : ''}" data-smode="bangun" style="flex:1;">⏰ Mau bangun jam…</button>
            <button class="tab ${!isBangun ? 'active' : ''}" data-smode="tidur" style="flex:1;">🛏️ Tidur jam…</button>
          </div>

          <div class="field">
            <label>${isBangun ? 'Jam bangun yang diinginkan' : 'Jam mulai tidur'}</label>
            <input type="time" class="input" id="sleepTimeInput" value="${this.sleepTime}">
            <div class="hint">Sudah termasuk ±15 menit waktu untuk terlelap.</div>
          </div>

          <div class="disclaimer">
            <ion-icon name="bulb-outline"></ion-icon>
            <span>Remaja butuh <b>8–10 jam</b> tidur. Hindari layar HP 30–60 menit sebelum tidur agar lebih cepat terlelap.</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">${isBangun ? '🌙 Sebaiknya mulai tidur pukul…' : '⏰ Sebaiknya bangun pukul…'}</div>
          <div style="display:flex;flex-direction:column;gap:11px;margin-top:16px;">
            ${options.map(o => `
              <div class="sleep-option ${o.best ? 'best' : ''}">
                <div class="sleep-time">${o.time}</div>
                <div style="flex:1;">
                  <div style="font-weight:700;font-size:.88rem;">${o.cycles} siklus tidur</div>
                  <div style="font-size:.78rem;color:var(--text-3);">± ${o.durasi} tidur</div>
                </div>
                ${o.best ? '<span class="badge badge-green">Disarankan</span>' : `<span class="badge badge-gray">${o.cycles <= 3 ? 'Darurat saja' : 'Cukup'}</span>`}
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
    const menitMingguIni = workouts
      .filter(w => w.tanggal >= seninStr && w.tanggal <= todayStr())
      .reduce((s, w) => s + w.durasi, 0);
    const pct = clamp(Math.round(menitMingguIni / targetMingguan * 100), 0, 100);

    el.innerHTML = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title"><ion-icon name="barbell" style="color:var(--brand)"></ion-icon>Target Mingguan</div>
          <div class="card-sub">WHO menyarankan remaja aktif ±60 menit/hari</div>
          <div class="stat-row" style="margin:16px 0 10px;">
            <span class="stat-num">${menitMingguIni}</span>
            <span class="stat-unit">/ ${targetMingguan} menit minggu ini</span>
          </div>
          <div class="progress" style="margin-bottom:16px;"><div class="progress-fill" style="width:${pct}%"></div></div>
          ${pct >= 100 ? '<div class="badge badge-green" style="margin-bottom:14px;">🏆 Target minggu ini tercapai!</div>' : ''}
          <div style="display:flex;gap:10px;">
            <button class="btn btn-primary" id="addWorkout" style="flex:1;"><ion-icon name="add"></ion-icon> Catat Latihan</button>
            <button class="btn" id="editTarget"><ion-icon name="options-outline"></ion-icon></button>
          </div>
        </div>

        <div class="card">
          <div class="card-title"><ion-icon name="sparkles" style="color:var(--fin)"></ion-icon>Ide Gerak Ringan</div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;font-size:.86rem;color:var(--text-2);">
            <div class="list-item" style="padding:11px 14px;">🚶 Jalan kaki ke sekolah / keliling komplek — 20–30 menit</div>
            <div class="list-item" style="padding:11px 14px;">🤸 Peregangan pagi setelah bangun — 10 menit</div>
            <div class="list-item" style="padding:11px 14px;">⚽ Main futsal / basket bareng teman — 45–60 menit</div>
            <div class="list-item" style="padding:11px 14px;">🚴 Bersepeda santai sore hari — 30 menit</div>
          </div>
        </div>
      </div>

      <div class="section-head"><h2>Riwayat Latihan</h2></div>
      ${workouts.length ? `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${workouts.slice(0, 20).map(w => `
            <div class="list-item">
              <div class="item-icon" style="background:var(--health-soft);">${this._sportEmoji(w.jenis)}</div>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:.9rem;">${esc(w.jenis)}</div>
                <div style="font-size:.77rem;color:var(--text-3);">${fmtDate(w.tanggal, { weekday: true })}</div>
              </div>
              <span class="badge badge-green">${w.durasi} menit</span>
              <button class="mini-icon-btn danger" data-del="${w.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="barbell-outline"></ion-icon>
          <div class="es-title">Belum ada latihan tercatat</div>
          <div class="es-sub">Mulai dari yang ringan — jalan kaki juga dihitung! 🚶</div>
        </div>`}`;

    $('#addWorkout', el).onclick = () => this._workoutModal();
    $('#editTarget', el).onclick = () => {
      openModal({
        title: 'Target Olahraga Mingguan',
        body: `
          <div class="field">
            <label>Target menit per minggu</label>
            <div class="input-group">
              <input type="number" class="input" id="mTarget" min="30" max="1200" value="${targetMingguan}">
              <span class="input-unit">menit</span>
            </div>
          </div>
          <button class="btn btn-primary btn-block" id="mTargetSave">Simpan</button>`,
        onMount(m) {
          $('#mTargetSave', m).onclick = async () => {
            const v = +$('#mTarget', m).value;
            if (!v || v < 30) return toast('Minimal 30 menit per minggu ya.', 'warning');
            await DB.updateUser({ targetOlahraga: v });
            closeModal(); toast('Target olahraga diperbarui 💪'); App.refresh();
          };
        }
      });
    };
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      const w = workouts.find(x => x.id === b.dataset.del);
      if (!await confirmDialog('Hapus catatan latihan ini?', { danger: true, okText: 'Hapus' })) return;
      await DB.remove('workouts', w.id);
      await this._syncDailySport(w.tanggal);
      toast('Catatan latihan dihapus.');
      App.refresh();
    });
  },

  _sportEmoji(jenis) {
    const map = { 'Lari': '🏃', 'Jalan kaki': '🚶', 'Bersepeda': '🚴', 'Renang': '🏊',
      'Futsal / Sepak bola': '⚽', 'Basket': '🏀', 'Badminton': '🏸', 'Workout / Gym': '🏋️', 'Senam / Yoga': '🧘' };
    return map[jenis] || '💪';
  },

  _workoutModal() {
    const jenisList = ['Jalan kaki', 'Lari', 'Bersepeda', 'Renang', 'Futsal / Sepak bola',
      'Basket', 'Badminton', 'Workout / Gym', 'Senam / Yoga', 'Lainnya'];
    openModal({
      title: 'Catat Latihan',
      body: `
        <div class="field">
          <label>Jenis latihan</label>
          <select class="select" id="mJenis">${jenisList.map(j => `<option>${j}</option>`).join('')}</select>
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>Durasi</label>
            <div class="input-group"><input type="number" class="input" id="mDurasi" min="5" max="600" placeholder="30"><span class="input-unit">menit</span></div>
          </div>
          <div class="field">
            <label>Tanggal</label>
            <input type="date" class="input" id="mTanggal" value="${todayStr()}" max="${todayStr()}">
          </div>
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> Simpan</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const durasi = +$('#mDurasi', m).value;
          const tanggal = $('#mTanggal', m).value;
          if (!durasi || durasi < 5) return toast('Durasi minimal 5 menit.', 'warning');
          if (!tanggal) return toast('Pilih tanggal latihan.', 'warning');
          await DB.add('workouts', { jenis: $('#mJenis', m).value, durasi, tanggal });
          await this._syncDailySport(tanggal);
          closeModal();
          toast('Latihan tercatat — keren! 💪');
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
