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
        <button class="tab ${this.tab === 'today' ? 'active' : ''}" data-tab="today"><ion-icon name="sunny-outline"></ion-icon>${tr('Hari Ini', 'Today')}</button>
        <button class="tab ${this.tab === 'calc' ? 'active' : ''}" data-tab="calc"><ion-icon name="calculator-outline"></ion-icon>${tr('Kalkulator', 'Calculator')}</button>
        <button class="tab ${this.tab === 'sleep' ? 'active' : ''}" data-tab="sleep"><ion-icon name="moon-outline"></ion-icon>${tr('Tidur', 'Sleep')}</button>
        <button class="tab ${this.tab === 'sport' ? 'active' : ''}" data-tab="sport"><ion-icon name="barbell-outline"></ion-icon>${tr('Olahraga', 'Exercise')}</button>
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
          <div class="card-title"><ion-icon name="water" style="color:var(--info)"></ion-icon>${tr('Pengingat Minum', 'Water Reminder')}</div>
          <div class="card-sub">${tr(`Target: ${targetAir} gelas (± ${Calc.waterTarget(user.berat || 55).liter} liter) / hari`, `Target: ${targetAir} glasses (± ${Calc.waterTarget(user.berat || 55).liter} liter) / day`)}</div>
          <div class="water-cups" id="waterCups">
            ${Array.from({ length: targetAir }, (_, i) => `
              <button class="water-cup ${i < daily.air ? 'filled' : ''}" data-i="${i}" title="${tr(`Gelas ke-${i + 1}`, `Glass ${i + 1}`)}">
                <ion-icon name="${i < daily.air ? 'water' : 'water-outline'}"></ion-icon>
              </button>`).join('')}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div class="stat-row"><span class="stat-num" style="color:var(--info)">${daily.air}</span><span class="stat-unit">${tr(`/ ${targetAir} gelas`, `/ ${targetAir} glasses`)}</span></div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm" id="waterMinus"><ion-icon name="remove"></ion-icon></button>
              <button class="btn btn-sm btn-primary" id="waterPlus"><ion-icon name="add"></ion-icon> ${tr('Gelas', 'Glass')}</button>
            </div>
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
                <div class="input-group"><input type="number" class="input" id="cUsia" min="10" max="25" value="${u.usia || ''}"><span class="input-unit">${tr('th', 'yrs')}</span></div>
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
    const menitMingguIni = workouts
      .filter(w => w.tanggal >= seninStr && w.tanggal <= todayStr())
      .reduce((s, w) => s + w.durasi, 0);
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
          <div class="progress" style="margin-bottom:16px;"><div class="progress-fill" style="width:${pct}%"></div></div>
          ${pct >= 100 ? `<div class="badge badge-green" style="margin-bottom:14px;">${tr('🏆 Target minggu ini tercapai!', '🏆 Weekly target reached!')}</div>` : ''}
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
