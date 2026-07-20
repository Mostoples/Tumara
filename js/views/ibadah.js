/* ============================================================
   TUMARA — Ibadah
   Tab: Hari Ini (checklist sholat & amalan) · Al-Qur'an
        (tilawah + target khatam + hafalan) · Dzikir & Doa ·
        Zakat (kalkulator) · Catatan
   Data lokal per akun: ibadah_daily (id=tanggal), quran_log,
   hafalan, ibadah_notes. Preferensi custom di profil.
   ============================================================ */

const Ibadah = {
  tab: 'hari',   // 'hari' | 'sholat' | 'kalender' | 'quran' | 'dzikir' | 'panduan' | 'zakat' | 'catatan'
  kalGeser: 0,   // pergeseran bulan kalender dari bulan ini (0 = bulan berjalan)
  tableGeser: 0, // pergeseran bulan tabel checklist "Hari Ini" jalur umum (0 = bulan berjalan)
  _lastDate: null,          // tanggal (lokal) saat render terakhir — untuk deteksi pergantian hari
  _dayInterval: null,       // interval pengecek pergantian hari
  _dayWatchInstalled: false,// penanda agar watcher hanya dipasang sekali
  _dayHostEl: null,         // elemen #view untuk render ulang saat hari berganti

  /* Ibadah yang dicatat & DIPANTAU GURU: hanya Sholat Dhuha & Dzuhur —
     dua ibadah yang dikerjakan di sekolah. Kunci datanya ('dhuha', 'dzuhur')
     sengaja tidak diubah, jadi centang lama siswa tetap terbaca. */
  SEKOLAH: [
    { key: 'dhuha',  id: 'Sholat Dhuha',  en: 'Dhuha prayer', emoji: '🕗' },
    { key: 'dzuhur', id: 'Sholat Dzuhur', en: 'Dhuhr prayer', emoji: '☀️' }
  ],

  // Checklist "Hari Ini" untuk pengguna umum — orang di luar sekolah
  // (jalur umum-app.html, dibedakan dari siswa lewat DB.user.pekerjaan
  // — lihat _itemsHariIni()): sholat 5 waktu, bukan cuma dua yang
  // dipantau guru di sekolah.
  UMUM: [
    { key: 'subuh',   id: 'Subuh',   en: 'Fajr',   emoji: '🌅' },
    { key: 'dzuhur',  id: 'Dzuhur',  en: 'Dhuhr',  emoji: '☀️' },
    { key: 'ashar',   id: 'Ashar',   en: 'Asr',    emoji: '🌤️' },
    { key: 'maghrib', id: 'Maghrib', en: 'Maghrib', emoji: '🌇' },
    { key: 'isya',    id: 'Isya',   en: 'Isha',    emoji: '🌙' }
  ],

  // Siswa (app.html, tanpa field pekerjaan) → SEKOLAH (dipantau guru).
  // Umum (umum-app.html, punya DB.user.pekerjaan) → sholat 5 waktu.
  _itemsHariIni() { return DB.user?.pekerjaan ? this.UMUM : this.SEKOLAH; },

  /* Checklist "Hari Ini" jalur UMUM — dikelompokkan per waktu sholat, tiap
     item BISA diedit/dihapus/ditambah sendiri oleh pengguna (lihat referensi
     spreadsheet amalan harian). Item disimpan di koleksi 'ibadah_checklist'
     (per akun), dicentang lewat 'ibadah_daily' yang sama seperti sebelumnya
     — hanya kuncinya kini id item, bukan key sholat yang tetap. */
  KELOMPOK_IBADAH: [
    { key: 'subuh',   id: 'Subuh',           en: 'Fajr',                emoji: '🌅' },
    { key: 'dhuha',   id: 'Dhuha',           en: 'Duha',                emoji: '🕗' },
    { key: 'dzuhur',  id: 'Dzuhur',          en: 'Dhuhr',               emoji: '☀️' },
    { key: 'asar',    id: 'Asar',            en: 'Asr',                 emoji: '🌤️' },
    { key: 'maghrib', id: 'Maghrib',         en: 'Maghrib',             emoji: '🌇' },
    { key: 'isya',    id: 'Isya',            en: 'Isha',                emoji: '🌙' },
    { key: 'malam',   id: 'Sepertiga Malam', en: 'Last Third of Night', emoji: '✨' }
  ],

  // Entri berupa string → checklist centang biasa. Entri berupa objek dengan
  // `pilihan` (mis. Sholat Dhuha: 2/4/6/8 rakaat) → dirender sebagai pilihan
  // angka, bukan centang tunggal (lihat _renderTodayUmum → rowPilihan).
  CHECKLIST_DEFAULT: {
    subuh:   ['Qobliyah Subuh', 'Sedekah Subuh', 'Doa Subuh', 'Dzikir Subuh'],
    dhuha:   [{ label: 'Sholat Dhuha', pilihan: [2, 4, 6, 8], satuan: 'rakaat' }, 'Doa Dhuha', 'Dzikir Dhuha'],
    dzuhur:  ['Qobliyah Dzuhur', "Ba'diyah Dzuhur", 'Doa Dzuhur', 'Dzikir Dzuhur'],
    asar:    ['Doa Asar', 'Dzikir Asar', 'Kajian'],
    maghrib: ["Ba'diyah Maghrib", 'Awwabin', 'Doa Maghrib', 'Dzikir Maghrib'],
    isya:    ["Ba'diyah Isya", 'Doa Isya', 'Dzikir Isya'],
    malam:   ['Sholat Taubat', 'Sholat Hajat', 'Sholat Tahajud', 'Doa Malam', 'Dzikir Malam']
  },

  // Isi pertama kali dipakai (belum ada item tersimpan) dengan daftar bawaan
  // di atas — sesudahnya sepenuhnya milik pengguna (boleh diubah/dihapus semua).
  async _seedChecklist() {
    const out = [];
    let urutan = 0;
    for (const g of this.KELOMPOK_IBADAH) {
      for (const entry of this.CHECKLIST_DEFAULT[g.key] || []) {
        const data = typeof entry === 'string' ? { label: entry } : { ...entry };
        out.push(await DB.add('ibadah_checklist', { kelompok: g.key, urutan: urutan++, ...data }));
      }
    }
    return out;
  },

  async _checklist() {
    let items = await DB.list('ibadah_checklist');
    if (!items.length) return this._seedChecklist();

    // Migrasi lunak: akun yang sudah lebih dulu dibuat sebelum fitur pilihan
    // rakaat ada belum punya field `pilihan` di item "Sholat Dhuha" bawaan —
    // tambahkan sekali saja, selama pengguna belum mengganti namanya sendiri.
    const dhuha = items.find(i => i.kelompok === 'dhuha' && i.label === 'Sholat Dhuha' && !i.pilihan);
    if (dhuha) {
      const patched = await DB.update('ibadah_checklist', dhuha.id, { pilihan: [2, 4, 6, 8], satuan: 'rakaat' });
      items = items.map(i => i.id === dhuha.id ? patched : i);
    }

    return items.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
  },

  _checklistModal(kelompokKey, existing = null) {
    const g = this.KELOMPOK_IBADAH.find(x => x.key === kelompokKey);
    openModal({
      title: existing
        ? tr('Edit Item Checklist', 'Edit Checklist Item')
        : tr(`Tambah Item — ${g ? g.id : ''}`, `Add Item — ${g ? g.en : ''}`),
      body: `
        <div class="field">
          <label>${tr('Nama amalan', 'Item name')}</label>
          <input type="text" class="input" id="mLabel" placeholder="${tr('mis. Dzikir pagi', 'e.g. Morning dhikr')}" value="${esc(existing?.label || '')}">
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const label = $('#mLabel', m).value.trim();
          if (!label) return toast(tr('Isi nama amalan.', 'Enter item name.'), 'warning');
          if (existing) {
            await DB.update('ibadah_checklist', existing.id, { label });
          } else {
            const all = await DB.list('ibadah_checklist');
            const urutan = all.filter(i => i.kelompok === kelompokKey).length;
            await DB.add('ibadah_checklist', { kelompok: kelompokKey, label, urutan });
          }
          closeModal();
          toast(existing ? tr('Tersimpan ✅', 'Saved ✅') : tr('Ditambahkan ✅', 'Added ✅'));
          App.refresh();
        };
      }
    });
  },

  async render(el) {
    // Catat tanggal (lokal) saat render & pasang watcher pergantian hari
    this._lastDate = todayStr();
    this._watchDayChange(el);

    // Sensor kompas, GPS & hitung mundur hanya hidup selama tab Sholat & Kiblat terbuka.
    this._stopCompass();
    this._stopGeoWatch();
    this._stopSholatCountdown();

    el.innerHTML = `
      <div class="tabs">
        <button class="tab ${this.tab === 'hari' ? 'active' : ''}" data-tab="hari"><ion-icon name="checkbox-outline"></ion-icon>${tr('Hari Ini', 'Today')}</button>
        <button class="tab ${this.tab === 'sholat' ? 'active' : ''}" data-tab="sholat"><ion-icon name="compass-outline"></ion-icon>${tr('Sholat & Kiblat', 'Prayer & Qibla')}</button>
        <button class="tab ${this.tab === 'kalender' ? 'active' : ''}" data-tab="kalender"><ion-icon name="calendar-number-outline"></ion-icon>${tr('Kalender', 'Calendar')}</button>
        <button class="tab ${this.tab === 'quran' ? 'active' : ''}" data-tab="quran"><ion-icon name="book-outline"></ion-icon>${tr('Al-Qur\'an', 'Qur\'an')}</button>
        <button class="tab ${this.tab === 'dzikir' ? 'active' : ''}" data-tab="dzikir"><ion-icon name="sparkles-outline"></ion-icon>${tr('Dzikir & Doa', 'Dhikr & Du\'a')}</button>
        <button class="tab ${this.tab === 'panduan' ? 'active' : ''}" data-tab="panduan"><ion-icon name="reader-outline"></ion-icon>${tr('Panduan', 'Guide')}</button>
        <button class="tab ${this.tab === 'zakat' ? 'active' : ''}" data-tab="zakat"><ion-icon name="calculator-outline"></ion-icon>${tr('Zakat & Sedekah', 'Zakat & Charity')}</button>
        <button class="tab ${this.tab === 'catatan' ? 'active' : ''}" data-tab="catatan"><ion-icon name="document-text-outline"></ion-icon>${tr('Catatan', 'Notes')}</button>
      </div>
      <div id="ibBody"></div>`;

    $$('.tab', el).forEach(t => t.onclick = () => { this.tab = t.dataset.tab; App.saveTab(this.tab); this.render(el); });

    const body = $('#ibBody', el);
    if (this.tab === 'hari') await this.renderToday(body);
    else if (this.tab === 'sholat') await this.renderSholat(body);
    else if (this.tab === 'kalender') this.renderKalender(body);
    else if (this.tab === 'quran') await this.renderQuran(body);
    else if (this.tab === 'dzikir') this.renderDzikir(body);
    else if (this.tab === 'panduan') this.renderPanduan(body);
    else if (this.tab === 'zakat') await this.renderZakat(body);
    else await this.renderNotes(body);
  },

  // Pantau pergantian hari (tengah malam) berbasis JAM LOKAL PERANGKAT.
  // Karena todayStr() memakai waktu lokal device, reset otomatis mengikuti
  // zona waktu siswa (WIB/WITA/WIT) tanpa konfigurasi tambahan: siswa di
  // Papua (WIT) reset saat 00:00 WIT, siswa di Jawa (WIB) saat 00:00 WIB —
  // selama jam & zona waktu HP-nya benar.
  //
  // Tidak memakai satu setTimeout panjang ke tengah malam karena timer
  // panjang tidak andal (di-throttle saat tab background / perangkat tidur,
  // sering tak jalan tepat 00:00). Sebagai gantinya:
  //   1) interval ringan tiap 30 dtk yang membandingkan tanggal, dan
  //   2) event 'visibilitychange' + 'focus' agar pergantian hari langsung
  //      tertangkap begitu siswa membuka kembali aplikasi dari background.
  // Watcher dipasang SEKALI saja (idempoten) agar tidak menumpuk.
  _watchDayChange(el) {
    this._dayHostEl = el; // selalu tunjuk ke #view terkini untuk render ulang

    const checkRollover = () => {
      const now = todayStr();
      if (now === this._lastDate) return;         // masih hari yang sama
      // Hari sudah berganti → reset data harian ibadah
      this._lastDate = now;
      this.dzikirCount = {};                       // penghitung tasbih ikut nol
      this._sholatCache = null;                    // paksa muat ulang jadwal sholat hari baru
      if (App.route === 'ibadah') {
        toast(tr('Hari baru dimulai — data ibadah diperbarui 🌙', 'New day started — worship data refreshed 🌙'), 'info');
        this.render(this._dayHostEl);
      }
    };

    if (this._dayWatchInstalled) return;           // sudah terpasang, cukup perbarui host di atas
    this._dayWatchInstalled = true;
    this._dayInterval = setInterval(checkRollover, 30000);
    const onWake = () => { if (document.visibilityState === 'visible') checkRollover(); };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
  },

  /* ============ TAB: SHOLAT & KIBLAT ============
     Jadwal sholat (Aladhan API + GPS), hitung mundur waktu berikutnya,
     arah kiblat, dan tanggal Hijriyah. */

  _sholatCache: null,   // { key: 'YYYY-MM-DD@lat,lng', data } — 1 entri, cukup utk hari & lokasi terakhir
  _sholatInterval: null,

  _stopSholatCountdown() {
    if (this._sholatInterval != null) clearInterval(this._sholatInterval);
    this._sholatInterval = null;
  },

  // Kunci cache dibulatkan ke 2 desimal (~1.1 km) — perpindahan sekecil itu
  // tak mengubah jadwal sholat, jadi tak perlu memicu fetch ulang.
  _sholatCacheKey(lat, lng) {
    return `${todayStr()}@${lat.toFixed(2)},${lng.toFixed(2)}`;
  },

  PRAYER_ORDER: [['Fajr', 'Subuh', '🌅'], ['Dhuhr', 'Dzuhur', '☀️'], ['Asr', 'Ashar', '🌤️'], ['Maghrib', 'Maghrib', '🌇'], ['Isha', 'Isya', '🌙']],

  // Hitung sholat berikutnya + hitung mundurnya dari `times` (objek Aladhan timings).
  _nextPrayer(times) {
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let found = this.PRAYER_ORDER.find(([k]) => toMin(times[k].slice(0, 5)) > nowMin);
    if (!found) found = this.PRAYER_ORDER[0]; // besok subuh
    const nextName = tr(found[1], found[0]);
    const nextTime = times[found[0]].slice(0, 5);
    let diff = toMin(nextTime) - nowMin; if (diff < 0) diff += 1440;
    const countdown = `${Math.floor(diff / 60)} ${tr('jam', 'h')} ${diff % 60} ${tr('mnt', 'm')}`;
    return { nextName, nextTime, countdown };
  },

  // Perbarui blok "Berikutnya" tanpa render ulang seluruh tab (biar kompas
  // & pemantau GPS yang sedang berjalan tak ikut ter-restart tiap tik).
  _startSholatCountdown(el, times) {
    this._stopSholatCountdown();
    if (!times) return;
    const tick = () => {
      const nameEl = $('#nextName', el), timeEl = $('#nextTime', el), cdEl = $('#nextCountdown', el);
      if (!nameEl) return this._stopSholatCountdown();   // elemen sudah tak ada (pindah tab)
      const { nextName, nextTime, countdown } = this._nextPrayer(times);
      nameEl.textContent = nextName; timeEl.textContent = nextTime; cdEl.textContent = countdown;
    };
    this._sholatInterval = setInterval(tick, 30000);
  },

  async renderSholat(el) {
    const loc = DB.user?.lokasi; // {lat, lng, kota}
    el.innerHTML = `<div class="portal-loading"><div class="spinner"></div> ${tr('Memuat…', 'Loading…')}</div>`;

    // tanggal hijriyah (lokal, via Intl)
    let hijri = '';
    try {
      hijri = new Intl.DateTimeFormat('id-TN-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    } catch (_) { hijri = ''; }

    const render = (data, err) => {
      const times = data?.timings;
      // waktu berikutnya
      const { nextName, nextTime, countdown } = times ? this._nextPrayer(times) : { nextName: '', nextTime: '', countdown: '' };

      el.innerHTML = `
        <div class="card" style="background:linear-gradient(135deg,#0e7490,#0891b2);color:#fff;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
            <div>
              <div style="font-size:.78rem;opacity:.85;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">${tr('Jadwal Sholat', 'Prayer Times')}</div>
              <div style="font-size:.95rem;font-weight:700;margin-top:3px;"><ion-icon name="location-outline" style="vertical-align:-2px;"></ion-icon> ${esc(loc?.kota || tr('Lokasimu', 'Your location'))}</div>
              ${hijri ? `<div style="font-size:.82rem;opacity:.9;margin-top:2px;">📅 ${esc(hijri)} H</div>` : ''}
            </div>
            ${times ? `<div style="text-align:right;">
              <div style="font-size:.75rem;opacity:.85;font-weight:600;">${tr('Berikutnya', 'Next')}</div>
              <div style="font-size:1.3rem;font-weight:800;"><span id="nextName">${nextName}</span> <span id="nextTime">${nextTime}</span></div>
              <div style="font-size:.8rem;opacity:.9;">${tr('dalam', 'in')} <span id="nextCountdown">${countdown}</span></div>
            </div>` : ''}
          </div>
          ${times ? `<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">
            ${this.PRAYER_ORDER.map(([k, id, e]) => `<div style="flex:1;min-width:64px;text-align:center;background:rgba(255,255,255,.14);border-radius:12px;padding:10px 4px;">
              <div style="font-size:1.1rem;">${e}</div><div style="font-size:.72rem;opacity:.9;font-weight:600;">${tr(id, k)}</div><div style="font-weight:800;font-size:.95rem;">${times[k].slice(0, 5)}</div>
            </div>`).join('')}
          </div>` : `<p style="margin-top:12px;opacity:.92;font-size:.87rem;">${esc(err || tr('Aktifkan lokasi untuk melihat jadwal sholat.', 'Enable location to see prayer times.'))}</p>`}
        </div>

        <div style="display:flex;gap:10px;margin:16px 0;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" id="refreshLoc"><ion-icon name="navigate-outline"></ion-icon> ${tr('Perbarui Lokasi (GPS)', 'Update Location (GPS)')}</button>
          <button class="btn btn-sm" id="manualLoc"><ion-icon name="create-outline"></ion-icon> ${tr('Set Manual', 'Set Manually')}</button>
        </div>

        <div class="card">
          <div class="card-title"><ion-icon name="compass" style="color:#0891b2"></ion-icon>${tr('Arah Kiblat', 'Qibla Direction')}</div>
          ${loc ? `
            <div class="qibla-panel">
              <div class="qibla-compass">
                <!-- mawar kompas: ikut berputar agar N benar-benar menunjuk utara -->
                <div class="qibla-rose" id="qiblaRose">
                  <span class="qibla-dir qd-n">N</span>
                  <span class="qibla-dir qd-e">E</span>
                  <span class="qibla-dir qd-s">S</span>
                  <span class="qibla-dir qd-w">W</span>
                </div>
                <!-- jarum: berputar mengelilingi pusat, 🕋 di ujungnya -->
                <div class="qibla-dial" id="qiblaNeedle"><span class="qibla-kaaba">🕋</span></div>
              </div>
              <div class="qibla-info">
                <div class="qibla-deg" id="qiblaDeg">${this._qiblaBearing(loc.lat, loc.lng).toFixed(1)}°</div>
                <div class="qibla-sub">${tr('dari Utara sejati (searah jarum jam)', 'from true North (clockwise)')}</div>
                <div class="qibla-meta" id="qiblaMeta">
                  ${tr('Arah HP', 'Device facing')}: <b id="qiblaHeading">—</b> ·
                  ${tr('Ka\'bah', 'Kaaba')} <b>${Math.round(this._kaabaDistance(loc.lat, loc.lng)).toLocaleString('id-ID')} km</b>
                </div>
                <div class="qibla-pos" id="qiblaPos">
                  📍 ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}
                </div>
                <div class="qibla-hint" id="qiblaHint">${tr('Pegang HP mendatar, lalu putar badanmu sampai 🕋 tepat di atas.', 'Hold the phone flat, then turn until 🕋 is exactly at the top.')}</div>
              </div>
            </div>

            <!-- Mode tanpa kompas (laptop/PC): pengguna sendiri yang memberi
                 tahu ke arah mana ia menghadap, lalu jarum menyesuaikan. -->
            <div id="qiblaNoCompass" style="display:none;margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
              <div style="font-size:.8rem;color:var(--text-2);font-weight:700;margin-bottom:4px;">
                <ion-icon name="desktop-outline" style="vertical-align:-2px;"></ion-icon>
                ${tr('Mode tanpa kompas', 'No-compass mode')}
              </div>
              <div id="qiblaNoCompassMsg" style="font-size:.78rem;color:var(--text-3);margin-bottom:10px;"></div>
              <label style="font-size:.78rem;color:var(--text-3);display:block;margin-bottom:6px;">
                ${tr('Arah hadapmu sekarang', 'Direction you are facing')}: <b id="qiblaManualVal">0°</b> ${tr('dari utara', 'from north')}
              </label>
              <input type="range" id="qiblaManualDeg" min="0" max="359" step="1" value="0" style="width:100%;accent-color:#0891b2;">
              <div style="font-size:.73rem;color:var(--text-3);margin-top:6px;">
                ${tr('Biarkan 0° bila layarmu menghadap utara. Tak tahu utara? Matahari terbit di timur (pagi) & terbenam di barat (sore) — atau buka halaman ini di HP.', 'Leave at 0° if your screen faces north. Not sure? The sun rises in the east & sets in the west — or open this page on a phone.')}
              </div>
            </div>

            <button class="btn btn-sm btn-block" id="enableCompass" style="margin-top:16px;"><ion-icon name="compass-outline"></ion-icon> ${tr('Aktifkan Kompas', 'Enable Compass')}</button>` : `
            <p style="font-size:.85rem;color:var(--text-3);margin-top:10px;">${tr('Set lokasimu dulu untuk menghitung arah kiblat.', 'Set your location first to compute the qibla direction.')}</p>`}
        </div>

        <div class="disclaimer" style="margin-top:16px;"><ion-icon name="information-circle"></ion-icon><span>${tr('Jadwal & arah dihitung otomatis dari lokasimu (sumber: Aladhan, metode Kemenag). Selalu cocokkan dengan jadwal masjid setempat.', 'Times & direction are computed from your location (source: Aladhan, Kemenag method). Always cross-check with your local mosque.')}</span></div>`;

      this._bindSholat(el, loc);
      this._startSholatCountdown(el, times);
    };

    if (!loc) { render(null, ''); return; }

    // Pakai cache (hari + lokasi yang sama) dulu supaya tab ini tak selalu
    // memanggil Aladhan ulang tiap dibuka/di-render ulang.
    const key = this._sholatCacheKey(loc.lat, loc.lng);
    if (this._sholatCache?.key === key) { render(this._sholatCache.data, ''); return; }

    const data = await this._fetchTimes(loc.lat, loc.lng);
    if (data) {
      this._sholatCache = { key, data };
      render(data, '');
    } else if (this._sholatCache) {
      // Offline / API down → tampilkan cache terakhir yang ada (walau beda
      // hari/lokasi) daripada kartu kosong, dengan catatan jelas bahwa itu bukan data terkini.
      render(this._sholatCache.data, '');
      toast(tr('Gagal memuat jadwal terbaru (offline?) — menampilkan jadwal tersimpan terakhir.', 'Failed to load the latest times (offline?) — showing the last saved schedule.'), 'warning');
    } else {
      render(null, tr('Gagal memuat jadwal (offline?). Coba lagi.', 'Failed to load times (offline?). Try again.'));
    }
  },

  /* ---- KIBLAT ----
     Ka'bah, Masjidil Haram, Mekkah:
       21°25'21,00" LU  → 21 + 25/60 + 21,00/3600
       39°49'34,20" BT  → 39 + 49/60 + 34,20/3600 */
  KAABA: {
    lat: 21 + 25 / 60 + 21.00 / 3600,   // 21.4225°
    lng: 39 + 49 / 60 + 34.20 / 3600    // 39.826167°
  },

  // Arah kiblat = bearing awal lingkaran-besar (great-circle) dari posisi
  // pengguna ke Ka'bah, dalam derajat searah jarum jam dari UTARA SEJATI.
  // Ini arah terpendek di permukaan bumi — bukan garis lurus di peta datar.
  _qiblaBearing(lat, lng) {
    const rad = Math.PI / 180;
    const φ1 = lat * rad, φ2 = this.KAABA.lat * rad;
    const Δλ = (this.KAABA.lng - lng) * rad;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) / rad + 360) % 360;
  },

  // Jarak dua titik di permukaan bumi (km) — haversine.
  _jarakKm(lat1, lng1, lat2, lng2) {
    const rad = Math.PI / 180, R = 6371;
    const dφ = (lat2 - lat1) * rad, dλ = (lng2 - lng1) * rad;
    const a = Math.sin(dφ / 2) ** 2 +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dλ / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  },

  // Jarak ke Ka'bah (km) — penanda bahwa posisi yang dipakai memang lokasi
  // pengguna saat ini (angkanya ikut berubah kalau ia berpindah).
  _kaabaDistance(lat, lng) {
    return this._jarakKm(lat, lng, this.KAABA.lat, this.KAABA.lng);
  },

  // Format tanggal yang dipakai API Aladhan: DD-MM-YYYY. Satu tempat, dipakai
  // oleh SEMUA pemanggil supaya tak ada dua format berbeda ke endpoint yang sama.
  _aladhanDateStr(d = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
  },

  async _fetchTimes(lat, lng) {
    try {
      const res = await fetch(`https://api.aladhan.com/v1/timings/${this._aladhanDateStr()}?latitude=${lat}&longitude=${lng}&method=20`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch (_) { return null; }
  },

  // Nama kota dari koordinat (reverse geocoding) — BigDataCloud, gratis & tanpa
  // API key. Aladhan TIDAK menyediakan nama kota (field `meta.timezone`-nya
  // cuma zona waktu, mis. "Asia/Jakarta" — memakainya sebagai "kota" salah).
  async _reverseGeocode(lat, lng) {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`);
      if (!res.ok) return '';
      const j = await res.json();
      return j.city || j.locality || j.principalSubdivision || '';
    } catch (_) { return ''; }
  },

  _bindSholat(el, loc) {
    const getGPS = () => {
      if (!navigator.geolocation) return toast(tr('Perangkat tidak mendukung GPS.', 'Device does not support GPS.'), 'warning');
      toast(tr('Meminta lokasi…', 'Requesting location…'), 'info');
      navigator.geolocation.getCurrentPosition(async pos => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        const kota = await this._reverseGeocode(lat, lng);
        await DB.updateUser({ lokasi: { lat, lng, kota, akurasi: Math.round(pos.coords.accuracy || 0) } });
        toast(tr('Lokasi diperbarui 📍', 'Location updated 📍'));
        App.refresh();
      }, err => {
        toast(tr('Gagal mengambil lokasi. Izinkan akses lokasi atau set manual.', 'Failed to get location. Allow location access or set manually.'), 'error');
      // enableHighAccuracy → pakai GPS/Wi-Fi, bukan perkiraan kasar dari IP.
      // maximumAge 0 → jangan pakai posisi lama yang tersimpan di cache.
      }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    };
    $('#refreshLoc', el) && ($('#refreshLoc', el).onclick = getGPS);
    $('#manualLoc', el) && ($('#manualLoc', el).onclick = () => {
      openModal({
        title: tr('Set Lokasi Manual', 'Set Location Manually'),
        body: `
          <p style="font-size:.83rem;color:var(--text-3);margin-bottom:12px;">${tr('Masukkan koordinat kotamu (cari di Google Maps → klik kanan → koordinat).', 'Enter your city coordinates (find on Google Maps → right-click → coordinates).')}</p>
          <div class="field"><label>${tr('Nama kota', 'City name')}</label><input type="text" class="input" id="mKota" placeholder="${tr('mis. Bandung', 'e.g. Bandung')}" value="${esc(loc?.kota || '')}"></div>
          <div class="grid grid-2 keep-2" style="gap:12px;">
            <div class="field"><label>Latitude</label><input type="number" class="input" id="mLat" step="any" placeholder="mis -6.9" value="${loc?.lat ?? ''}"></div>
            <div class="field"><label>Longitude</label><input type="number" class="input" id="mLng" step="any" placeholder="mis. 107.6" value="${loc?.lng ?? ''}"></div>
          </div>
          <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
        onMount: m => { $('#mSave', m).onclick = async () => {
          // Validasi lewat string mentah (bukan `!lat`/`!lng`) — kalau tidak,
          // latitude 0 (mis. Pontianak, hampir persis di garis khatulistiwa)
          // salah dianggap "kosong" karena `!0 === true` di JavaScript.
          const latStr = $('#mLat', m).value.trim(), lngStr = $('#mLng', m).value.trim();
          const lat = +latStr, lng = +lngStr;
          if (latStr === '' || lngStr === '' || Number.isNaN(lat) || Number.isNaN(lng)) {
            return toast(tr('Isi latitude & longitude.', 'Enter latitude & longitude.'), 'warning');
          }
          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return toast(tr('Koordinat tidak valid (latitude -90..90, longitude -180..180).', 'Invalid coordinates (latitude -90..90, longitude -180..180).'), 'warning');
          }
          await DB.updateUser({ lokasi: { lat, lng, kota: $('#mKota', m).value.trim() } });
          closeModal(); toast(tr('Lokasi disimpan 📍', 'Location saved 📍')); App.refresh();
        }; }
      });
    });

    // Kompas kiblat + pemantau lokasi (hanya bila lokasi sudah diketahui)
    if (!loc) return;
    this._qibla = {
      lat: loc.lat, lng: loc.lng,
      akurasi: loc.akurasi || 0,
      bearing: this._qiblaBearing(loc.lat, loc.lng),
      heading: null
    };
    this._paintQibla(el);
    this._startGeoWatch(el);

    const enable = $('#enableCompass', el);
    if (enable) enable.onclick = () => this._startCompass(el);
    // iOS wajib lewat gestur (requestPermission). Android/desktop tidak perlu
    // izin → langsung nyalakan supaya jarum bergerak tanpa menekan tombol.
    const perluIzin = typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function';
    if (!perluIzin) this._startCompass(el, { diam: true });
  },

  /* ---- KOMPAS ----
     Hanya event orientasi ABSOLUT yang dipakai. Pada event relatif
     ('deviceorientation' biasa di Android), `alpha` dihitung dari acuan acak
     saat halaman dibuka — bukan dari utara — sehingga jarumnya pasti salah.
     Ini sumber bug lama: jarum ikut "bergerak" tapi tak menunjuk ke mana pun. */
  _compass: null,   // { off() }
  _qibla: null,     // { lat, lng, bearing, heading }

  _stopCompass() {
    if (this._compass) this._compass.off();
    this._compass = null;
  },

  // Sudut hadap perangkat: 0–360, searah jarum jam dari utara.
  _headingOf(e) {
    // iOS: sudah berupa arah kompas dari utara, TAPI hanya benar saat HP
    // dipegang portrait — Safari tidak ikut mengoreksinya saat layar diputar
    // ke landscape, jadi dikompensasi manual sama seperti jalur Android di bawah.
    if (typeof e.webkitCompassHeading === 'number') {
      const layar = window.orientation || 0;   // iOS lama: -90 / 0 / 90 / 180
      return (e.webkitCompassHeading + layar + 360) % 360;
    }
    if (e.alpha == null) return null;
    if (e.type !== 'deviceorientationabsolute' && e.absolute !== true) return null;
    // Layar yang diputar (landscape) menggeser acuan sensor → dikompensasi.
    const layar = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    return (360 - e.alpha + layar + 360) % 360;
  },

  // Gambar ulang jarum, mawar kompas, & angka — dari state _qibla.
  _paintQibla(el) {
    const q = this._qibla;
    if (!q) return;
    const needle = $('#qiblaNeedle', el), rose = $('#qiblaRose', el);
    const deg = $('#qiblaDeg', el), head = $('#qiblaHeading', el), pos = $('#qiblaPos', el);
    // Tanpa kompas, jarum tetap benar dibaca sebagai sudut dari Utara (N di atas).
    const h = q.heading ?? 0;
    if (needle) needle.style.transform = `rotate(${q.bearing - h}deg)`;
    if (rose) rose.style.transform = `rotate(${-h}deg)`;
    if (deg) deg.textContent = `${q.bearing.toFixed(1)}°`;
    if (head) head.textContent = q.heading == null ? '—' : `${Math.round(q.heading)}°`;
    if (pos) {
      // Laptop/PC menaksir lokasi dari Wi-Fi atau alamat IP — bisa meleset
      // ribuan meter, bahkan salah kota. Katakan bila taksirannya kasar.
      const kasar = q.akurasi > 1000;
      pos.innerHTML = `📍 ${q.lat.toFixed(5)}, ${q.lng.toFixed(5)}` +
        (q.akurasi ? ` (±${q.akurasi >= 1000 ? (q.akurasi / 1000).toFixed(1) + ' km' : q.akurasi + ' m'})` : '') +
        (kasar ? `<div style="color:#d97706;margin-top:3px;">⚠ ${tr('Lokasi ini hanya taksiran dari Wi-Fi/IP. Pakai "Set Manual" agar tepat.', 'This location is only a Wi-Fi/IP estimate. Use "Set Manually" for precision.')}</div>` : '');
    }
  },

  async _startCompass(el, { diam = false } = {}) {
    this._stopCompass();
    const needle = $('#qiblaNeedle', el);
    const hint = $('#qiblaHint', el);
    if (!needle || !this._qibla) return;

    // iOS 13+: izin sensor harus diminta dari gestur pengguna.
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const p = await DeviceOrientationEvent.requestPermission();
        if (p !== 'granted') return toast(tr('Izin sensor kompas ditolak.', 'Compass permission denied.'), 'warning');
      } catch (_) {
        return toast(tr('Kompas tidak tersedia di perangkat ini.', 'Compass not available on this device.'), 'warning');
      }
    }

    let hidup = false, tunggu;
    const onOrient = e => {
      if (!needle.isConnected) return this._stopCompass();   // pindah tab → lepas sensor
      const h = this._headingOf(e);
      if (h == null) return;                                 // event relatif → abaikan
      if (!hidup) {
        hidup = true;
        clearTimeout(tunggu);
        if (!diam) toast(tr('Kompas aktif — putar badanmu perlahan.', 'Compass on — turn slowly.'), 'info');
      }
      this._qibla.heading = h;
      this._paintQibla(el);
    };

    window.addEventListener('deviceorientationabsolute', onOrient, true);
    window.addEventListener('deviceorientation', onOrient, true);
    this._compass = {
      off: () => {
        clearTimeout(tunggu);
        window.removeEventListener('deviceorientationabsolute', onOrient, true);
        window.removeEventListener('deviceorientation', onOrient, true);
      }
    };

    // Tak ada pembacaan absolut dari DeviceOrientation → coba Generic Sensor
    // API (sebagian laptop 2-in-1 & tablet punya magnetometer yang hanya
    // terbaca lewat jalur ini). Kalau itu pun gagal, perangkat memang tak
    // punya kompas → beralih ke mode manual, jangan biarkan pengguna menunggu
    // jarum yang tak akan pernah bergerak.
    tunggu = setTimeout(async () => {
      if (hidup || !needle.isConnected) return;
      if (await this._trySensorAPI(el, () => hidup, v => { hidup = v; })) return;
      this._noCompassMode(el);
    }, 2500);
  },

  // Jalur kedua: AbsoluteOrientationSensor (Chrome, butuh magnetometer nyata).
  // Dibungkus try/catch total — di perangkat tanpa sensor ini melempar error,
  // dan itu wajar, bukan kondisi gagal yang perlu ditampilkan.
  async _trySensorAPI(el, isHidup, setHidup) {
    if (typeof AbsoluteOrientationSensor === 'undefined') return false;
    try {
      const sensor = new AbsoluteOrientationSensor({ frequency: 20, referenceFrame: 'screen' });
      const needle = $('#qiblaNeedle', el);

      const onRead = () => {
        if (!needle || !needle.isConnected) { try { sensor.stop(); } catch (_) {} return; }
        const q = sensor.quaternion;
        if (!q) return;
        const [x, y, z, w] = q;
        // Yaw (rotasi terhadap sumbu z) → arah hadap, searah jarum jam dari utara.
        const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
        setHidup(true);
        this._qibla.heading = (360 - yaw * 180 / Math.PI) % 360;
        this._paintQibla(el);
      };
      sensor.addEventListener('reading', onRead);
      sensor.addEventListener('error', () => { try { sensor.stop(); } catch (_) {} });
      sensor.start();

      // Beri sensor waktu untuk pembacaan pertama sebelum menyerah.
      await new Promise(r => setTimeout(r, 1200));
      if (!isHidup()) { try { sensor.stop(); } catch (_) {} return false; }

      const off = this._compass?.off;
      this._compass = { off: () => { off && off(); try { sensor.stop(); } catch (_) {} } };
      return true;
    } catch (_) {
      return false;   // tak ada magnetometer / diblokir kebijakan izin
    }
  },

  // Perangkat tanpa kompas (laptop/PC): tampilkan apa adanya + kendali manual
  // agar arah kiblat tetap bisa dipakai.
  _noCompassMode(el) {
    this._qibla.heading = 0;      // 0° = layar dianggap menghadap utara
    this._qibla.manual = true;
    this._paintQibla(el);

    const hint = $('#qiblaHint', el);
    if (hint) {
      hint.innerHTML = tr(
        `Perangkat ini <b>tidak punya sensor kompas</b> — laptop/PC memang tak punya, jadi memutarnya tak akan menggerakkan jarum.`,
        `This device has <b>no compass sensor</b> — laptops/PCs simply don't have one, so rotating it cannot move the needle.`
      );
    }

    const panel = $('#qiblaNoCompass', el);
    if (!panel) return;
    panel.style.display = '';

    const msg = $('#qiblaNoCompassMsg', el);
    if (msg) {
      msg.innerHTML = tr(
        `Arah kiblat dari lokasimu tetap akurat: <b>${this._qibla.bearing.toFixed(1)}° dari utara</b> (searah jarum jam). Karena laptop tak tahu arah hadapnya, beri tahu lewat penggeser di bawah — jarum langsung menyesuaikan.`,
        `The qibla from your location is still accurate: <b>${this._qibla.bearing.toFixed(1)}° from north</b> (clockwise). Since the laptop cannot sense its facing, tell it below — the needle follows immediately.`
      );
    }

    const slider = $('#qiblaManualDeg', el), val = $('#qiblaManualVal', el);
    if (slider) slider.oninput = () => {
      this._qibla.heading = +slider.value;
      if (val) val.textContent = `${slider.value}°`;
      this._paintQibla(el);
    };
  },

  /* ---- LOKASI LANGSUNG ----
     Arah kiblat bergantung pada posisi, jadi posisi diikuti terus selagi tab
     ini terbuka: sudut, jarak, & koordinat diperbarui tanpa render ulang. */
  _geoWatch: null,

  _stopGeoWatch() {
    if (this._geoWatch != null && navigator.geolocation) navigator.geolocation.clearWatch(this._geoWatch);
    this._geoWatch = null;
  },

  _startGeoWatch(el) {
    this._stopGeoWatch();
    if (!navigator.geolocation || !this._qibla) return;

    this._geoWatch = navigator.geolocation.watchPosition(async pos => {
      if (!el.isConnected) return this._stopGeoWatch();
      const lat = pos.coords.latitude, lng = pos.coords.longitude;

      this._qibla.lat = lat;
      this._qibla.lng = lng;
      this._qibla.akurasi = Math.round(pos.coords.accuracy || 0);
      this._qibla.bearing = this._qiblaBearing(lat, lng);
      this._paintQibla(el);

      const meta = $('#qiblaMeta', el);
      if (meta) {
        const jarak = Math.round(this._kaabaDistance(lat, lng)).toLocaleString('id-ID');
        meta.innerHTML = `${tr('Arah HP', 'Device facing')}: <b id="qiblaHeading">${this._qibla.heading == null ? '—' : Math.round(this._qibla.heading) + '°'}</b> · ${tr('Ka\'bah', 'Kaaba')} <b>${jarak} km</b>`;
      }

      // Simpan ke profil hanya bila benar-benar berpindah (>200 m), supaya
      // pembaruan posisi kecil tidak membanjiri Firestore dengan tulisan.
      const l = DB.user?.lokasi;
      if (!l || this._jarakKm(l.lat, l.lng, lat, lng) * 1000 > 200) {
        await DB.updateUser({ lokasi: { lat, lng, kota: l?.kota || '', akurasi: this._qibla.akurasi } });
      }
    }, () => { /* izin ditolak / GPS mati → angka dari lokasi tersimpan tetap tampil */ },
       { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  },

  /* ============ TAB: KALENDER HIJRIYAH ============
     Kalender Masehi sebulan penuh yang setiap harinya diberi tanggal Hijriyah
     dan ditandai bila jatuh pada hari besar Islam.

     Konversi Masehi→Hijriyah memakai Intl ('islamic-umalqura', kalender resmi
     Arab Saudi) — jadi tidak perlu tabel konversi sendiri. Hasilnya HISAB:
     awal Ramadhan/Syawal versi rukyat pemerintah bisa bergeser 1 hari, karena
     itu ditulis terus terang di catatan bawah agar tidak dianggap keputusan
     resmi. */

  BULAN_HIJRI: ['Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir', 'Jumadil Awal', 'Jumadil Akhir',
                'Rajab', "Sya'ban", 'Ramadhan', 'Syawal', 'Dzulqaidah', 'Dzulhijjah'],

  // Hari besar: [bulan Hijriyah, tanggal] → nama. Dipakai untuk penanda & hitung mundur.
  HARI_BESAR: [
    { b: 1,  t: 1,  emoji: '🌙', id: 'Tahun Baru Hijriyah',  en: 'Islamic New Year' },
    { b: 1,  t: 10, emoji: '🤲', id: 'Hari Asyura',          en: 'Day of Ashura' },
    { b: 3,  t: 12, emoji: '🕌', id: 'Maulid Nabi ﷺ',        en: 'Mawlid an-Nabi' },
    { b: 7,  t: 27, emoji: '✨', id: "Isra Mi'raj",          en: "Isra' and Mi'raj" },
    { b: 8,  t: 15, emoji: '🌟', id: "Nisfu Sya'ban",        en: "Mid-Sha'ban" },
    { b: 9,  t: 1,  emoji: '🌙', id: 'Awal Ramadhan',        en: 'First of Ramadan' },
    { b: 9,  t: 17, emoji: '📖', id: 'Nuzulul Qur\'an',      en: 'Nuzul al-Qur\'an' },
    { b: 10, t: 1,  emoji: '🎉', id: 'Idul Fitri',           en: 'Eid al-Fitr' },
    { b: 12, t: 9,  emoji: '🏔️', id: 'Hari Arafah',          en: 'Day of Arafah' },
    { b: 12, t: 10, emoji: '🐐', id: 'Idul Adha',            en: 'Eid al-Adha' },
    { b: 12, t: 11, emoji: '🍖', id: 'Hari Tasyrik',         en: 'Days of Tashriq' },
    { b: 12, t: 12, emoji: '🍖', id: 'Hari Tasyrik',         en: 'Days of Tashriq' },
    { b: 12, t: 13, emoji: '🍖', id: 'Hari Tasyrik',         en: 'Days of Tashriq' }
  ],

  // Tanggal Masehi → { t, b, y } Hijriyah. null bila peramban tak mendukung.
  _keHijri(d) {
    try {
      const p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC'
      }).formatToParts(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const ambil = tipe => +p.find(x => x.type === tipe)?.value;
      const t = ambil('day'), b = ambil('month'), y = ambil('year');
      return (t && b && y) ? { t, b, y } : null;
    } catch (_) { return null; }
  },

  _namaBulanHijri(b) { return this.BULAN_HIJRI[b - 1] || ''; },

  // Hari besar pada tanggal Hijriyah tsb (atau null).
  _hariBesar(h) {
    if (!h) return null;
    return this.HARI_BESAR.find(x => x.b === h.b && x.t === h.t) || null;
  },

  // Amalan sunnah berulang: Ayyamul Bidh (13–15 tiap bulan) & puasa Senin–Kamis.
  _sunnah(h, tglMasehi) {
    const out = [];
    if (h && [13, 14, 15].includes(h.t)) out.push(tr('Ayyamul Bidh', 'Ayyam al-Bidh'));
    const hari = tglMasehi.getDay();
    if (hari === 1 || hari === 4) out.push(tr('Puasa sunnah', 'Sunnah fast'));
    return out;
  },

  renderKalender(el) {
    const kini = new Date();
    const hariIni = todayStr();

    // Bulan Masehi yang sedang ditampilkan (digeser lewat tombol ‹ ›).
    const tampil = new Date(kini.getFullYear(), kini.getMonth() + this.kalGeser, 1);
    const thn = tampil.getFullYear(), bln = tampil.getMonth();

    const hijriHariIni = this._keHijri(kini);
    if (!hijriHariIni) {
      el.innerHTML = `<div class="card empty-state"><ion-icon name="calendar-outline"></ion-icon>
        <div class="es-title">${tr('Kalender Hijriyah tidak didukung peramban ini', 'Hijri calendar is not supported by this browser')}</div>
        <div class="es-sub">${tr('Coba buka lewat Chrome/Safari versi terbaru.', 'Try opening it in an up-to-date Chrome/Safari.')}</div>
      </div>`;
      return;
    }

    const jmlHari = new Date(thn, bln + 1, 0).getDate();
    const kosongAwal = new Date(thn, bln, 1).getDay();   // 0 = Minggu

    // Rentang Hijriyah bulan ini (mis. "Rajab – Sya'ban 1447 H") untuk judul.
    const hAwal = this._keHijri(new Date(thn, bln, 1));
    const hAkhir = this._keHijri(new Date(thn, bln, jmlHari));
    const labelHijri = hAwal && hAkhir
      ? (hAwal.b === hAkhir.b
          ? `${this._namaBulanHijri(hAwal.b)} ${hAwal.y} H`
          : `${this._namaBulanHijri(hAwal.b)} – ${this._namaBulanHijri(hAkhir.b)} ${hAkhir.y} H`)
      : '';

    // HARI & BULAN global sudah mengikuti bahasa aktif (lihat js/i18n.js).
    const NAMA_HARI = HARI.map(h => h.slice(0, 3));

    // Sel kalender: tanggal Masehi besar + tanggal Hijriyah kecil + titik penanda.
    const sel = [];
    for (let i = 0; i < kosongAwal; i++) sel.push('<div class="kal-sel kal-kosong"></div>');
    const penting = [];   // hari besar di bulan ini (untuk daftar di bawah)

    for (let t = 1; t <= jmlHari; t++) {
      const d = new Date(thn, bln, t);
      const iso = todayStr(d);
      const h = this._keHijri(d);
      const besar = this._hariBesar(h);
      const sunnah = this._sunnah(h, d);
      if (besar) penting.push({ iso, d, h, besar });

      const kelas = [
        'kal-sel',
        iso === hariIni ? 'kal-kini' : '',
        besar ? 'kal-besar' : '',
        !besar && sunnah.length ? 'kal-sunnah' : '',
        d.getDay() === 5 ? 'kal-jumat' : ''
      ].filter(Boolean).join(' ');

      const judul = [
        h ? `${h.t} ${this._namaBulanHijri(h.b)} ${h.y} H` : '',
        besar ? tr(besar.id, besar.en) : '',
        ...sunnah
      ].filter(Boolean).join(' · ');

      sel.push(`
        <div class="${kelas}" title="${esc(judul)}">
          <div class="kal-m">${t}</div>
          <div class="kal-h">${h ? h.t : ''}</div>
          ${besar ? `<div class="kal-dot">${besar.emoji}</div>` : ''}
        </div>`);
    }

    // Hari besar BERIKUTNYA dalam 12 bulan ke depan — supaya selalu ada hitung
    // mundur walau bulan yang sedang dilihat sedang kosong dari hari besar.
    const mendatang = [];
    for (let i = 0; i < 400 && mendatang.length < 5; i++) {
      const d = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate() + i);
      const besar = this._hariBesar(this._keHijri(d));
      if (besar) mendatang.push({ d, besar, sisa: i });
    }
    const sisaTeks = n => n === 0 ? tr('Hari ini', 'Today')
                        : n === 1 ? tr('Besok', 'Tomorrow')
                        : tr(`${n} hari lagi`, `in ${n} days`);

    el.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,var(--brand),var(--brand-dark));color:#fff;">
        <div style="font-size:.78rem;opacity:.9;">${tr('Hari ini', 'Today')}</div>
        <div style="font-size:1.25rem;font-weight:800;margin-top:2px;">
          ${hijriHariIni.t} ${this._namaBulanHijri(hijriHariIni.b)} ${hijriHariIni.y} H
        </div>
        <div style="font-size:.84rem;opacity:.92;margin-top:2px;">${fmtDate(hariIni, { weekday: true })}</div>
      </div>

      <div class="section-head" style="margin-top:20px;">
        <h2 style="font-size:1rem;">${BULAN[bln]} ${thn}${labelHijri ? ` <span style="font-weight:600;color:var(--text-3);font-size:.85rem;">· ${labelHijri}</span>` : ''}</h2>
        <div style="display:flex;gap:6px;">
          <button class="mini-icon-btn" id="kalPrev"><ion-icon name="chevron-back-outline"></ion-icon></button>
          ${this.kalGeser !== 0 ? `<button class="btn btn-sm" id="kalNow">${tr('Bulan ini', 'This month')}</button>` : ''}
          <button class="mini-icon-btn" id="kalNext"><ion-icon name="chevron-forward-outline"></ion-icon></button>
        </div>
      </div>

      <div class="card" style="padding:12px;">
        <div class="kal-grid kal-head">${NAMA_HARI.map(h => `<div>${h}</div>`).join('')}</div>
        <div class="kal-grid">${sel.join('')}</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;font-size:.72rem;color:var(--text-3);">
          <span><span class="kal-cip kal-besar"></span> ${tr('Hari besar Islam', 'Islamic holiday')}</span>
          <span><span class="kal-cip kal-sunnah"></span> ${tr('Amalan sunnah (Ayyamul Bidh / puasa Senin–Kamis)', 'Sunnah (Ayyam al-Bidh / Mon–Thu fast)')}</span>
        </div>
      </div>

      ${penting.length ? `
        <div class="section-head" style="margin-top:22px;"><h2 style="font-size:1rem;">${tr('Hari besar bulan ini', 'Holidays this month')}</h2></div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${penting.map(p => `
            <div class="list-item">
              <div class="item-icon" style="background:var(--brand-soft);">${p.besar.emoji}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:.9rem;">${tr(p.besar.id, p.besar.en)}</div>
                <div style="font-size:.78rem;color:var(--text-3);">${fmtDate(p.iso, { weekday: true })} · ${p.h.t} ${this._namaBulanHijri(p.h.b)} ${p.h.y} H</div>
              </div>
            </div>`).join('')}
        </div>` : ''}

      <div class="section-head" style="margin-top:22px;"><h2 style="font-size:1rem;">${tr('Hari besar berikutnya', 'Upcoming holidays')}</h2></div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${mendatang.map(m => `
          <div class="list-item">
            <div class="item-icon" style="background:var(--fin-soft);">${m.besar.emoji}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:.9rem;">${tr(m.besar.id, m.besar.en)}</div>
              <div style="font-size:.78rem;color:var(--text-3);">${fmtDate(todayStr(m.d), { weekday: true })}</div>
            </div>
            <span class="badge ${m.sisa <= 1 ? 'badge-red' : 'badge-gray'}">${sisaTeks(m.sisa)}</span>
          </div>`).join('')}
      </div>

      <div class="ts-note" style="margin-top:16px;">
        ${tr('Tanggal Hijriyah dihitung dengan metode hisab (Umm al-Qura). Penetapan awal Ramadhan, Idul Fitri, dan Idul Adha oleh pemerintah bisa berbeda 1 hari.',
             'Hijri dates use the Umm al-Qura calculation. Official government dates for Ramadan, Eid al-Fitr, and Eid al-Adha may differ by a day.')}
      </div>`;

    $('#kalPrev', el).onclick = () => { this.kalGeser--; this.renderKalender(el); };
    $('#kalNext', el).onclick = () => { this.kalGeser++; this.renderKalender(el); };
    $('#kalNow', el) && ($('#kalNow', el).onclick = () => { this.kalGeser = 0; this.renderKalender(el); });
  },

  /* ============ TAB: PANDUAN IBADAH ============ */

  renderPanduan(el) {
    const guides = [
      { icon: '💧', id: 'Tata Cara Wudhu', en: 'How to Perform Wudu', steps_id: ['Niat dalam hati', 'Membaca basmalah & mencuci kedua telapak tangan 3×', 'Berkumur 3× & membersihkan hidung 3×', 'Membasuh wajah 3×', 'Membasuh kedua tangan sampai siku 3×', 'Mengusap sebagian kepala', 'Mengusap kedua telinga', 'Membasuh kedua kaki sampai mata kaki 3×', 'Membaca doa setelah wudhu'],
        steps_en: ['Intention in the heart', 'Say Bismillah & wash both hands 3×', 'Rinse mouth 3× & nose 3×', 'Wash the face 3×', 'Wash arms to elbows 3×', 'Wipe part of the head', 'Wipe both ears', 'Wash feet to ankles 3×', 'Recite the post-wudu supplication'] },
      { icon: '🕌', id: 'Tata Cara Sholat', en: 'How to Pray', steps_id: ['Berdiri tegak menghadap kiblat & niat', 'Takbiratul ihram (Allahu Akbar)', 'Membaca Al-Fatihah & surat pendek', 'Rukuk dengan tuma\'ninah', 'I\'tidal (bangun dari rukuk)', 'Sujud 2× dengan tuma\'ninah', 'Duduk di antara dua sujud', 'Tasyahud awal & akhir', 'Salam ke kanan & kiri'],
        steps_en: ['Stand facing qibla & make intention', 'Takbiratul ihram (Allahu Akbar)', 'Recite Al-Fatihah & a short surah', 'Bow (ruku) calmly', 'Rise (i\'tidal)', 'Prostrate twice calmly', 'Sit between the two prostrations', 'First & final tashahhud', 'Salam to right & left'] },
      { icon: '🌙', id: 'Adab Membaca Al-Qur\'an', en: 'Etiquette of Reading Qur\'an', steps_id: ['Dalam keadaan suci (berwudhu)', 'Menghadap kiblat bila memungkinkan', 'Membaca ta\'awudz & basmalah', 'Membaca dengan tartil (perlahan & jelas)', 'Merenungi makna ayat', 'Menjaga adab & kekhusyukan'],
        steps_en: ['Be in a state of purity (wudu)', 'Face the qibla if possible', 'Recite ta\'awwudh & basmalah', 'Read with tartil (slow & clear)', 'Reflect on the meaning', 'Maintain etiquette & focus'] }
    ];

    el.innerHTML = `
      <p style="font-size:.88rem;color:var(--text-3);font-weight:600;margin-bottom:14px;">${tr('Tuntunan ibadah ringkas — ketuk untuk membuka.', 'Concise worship guides — tap to expand.')}</p>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${guides.map((g, i) => `
          <div class="card" style="cursor:pointer;" data-guide="${i}">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div class="card-title" style="margin:0;">${g.icon} ${tr(g.id, g.en)}</div>
              <ion-icon name="chevron-down" class="guide-chev" id="chev-${i}"></ion-icon>
            </div>
            <ol class="guide-steps" id="steps-${i}" style="display:none;margin:14px 0 0;padding-left:20px;font-size:.86rem;color:var(--text-2);line-height:1.9;">
              ${(tr('id', 'en') === 'en' ? g.steps_en : g.steps_id).map(s => `<li>${esc(s)}</li>`).join('')}
            </ol>
          </div>`).join('')}
      </div>
      <div class="disclaimer" style="margin-top:16px;"><ion-icon name="bulb-outline"></ion-icon><span>${tr('Ringkasan ini untuk pengingat. Untuk detail & dalil, rujuk buku panduan/guru ngajimu.', 'These summaries are reminders. For details & evidence, refer to your guidebook/teacher.')}</span></div>`;

    $$('[data-guide]', el).forEach(c => c.onclick = () => {
      const i = c.dataset.guide;
      const steps = $(`#steps-${i}`, el), chev = $(`#chev-${i}`, el);
      const open = steps.style.display === 'none';
      steps.style.display = open ? 'block' : 'none';
      chev.setAttribute('name', open ? 'chevron-up' : 'chevron-down');
    });
  },

  /* ---------- util data harian (tanggal bebas, dipakai tabel checklist umum) ---------- */
  async _recordFor(tanggal) {
    const all = await DB.list('ibadah_daily');
    return all.find(d => d.tanggal === tanggal) || { tanggal, done: {} };
  },
  async _saveDoneFor(tanggal, done) {
    const all = await DB.list('ibadah_daily');
    const ex = all.find(d => d.tanggal === tanggal);
    if (ex) return DB.update('ibadah_daily', ex.id, { done });
    return DB.set('ibadah_daily', tanggal, { tanggal, done });
  },
  async _today() { return this._recordFor(todayStr()); },
  async _saveToday(done) { return this._saveDoneFor(todayStr(), done); },

  /* ============ TAB: HARI INI ============ */

  async renderToday(el) {
    const rec = await this._today();
    const done = rec.done || {};
    const siswa = !DB.user?.pekerjaan;

    if (!siswa) return this._renderTodayUmum(el, done);

    const items = this._itemsHariIni();
    const total = items.length;
    const selesai = items.filter(i => done[i.key]).length;
    const pct = total ? Math.round(selesai / total * 100) : 0;

    const tile = i => `
      <button class="fardhu-tile ${done[i.key] ? 'done' : ''}" data-toggle="${esc(i.key)}">
        <span class="ft-emoji">${i.emoji}</span>
        <span class="ft-name">${esc(tr(i.id, i.en))}</span>
        <ion-icon class="ft-badge" name="${done[i.key] ? 'checkmark-circle' : 'ellipse-outline'}"></ion-icon>
      </button>`;

    el.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,#0e7490,#0891b2);color:#fff;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:.8rem;font-weight:700;opacity:.85;text-transform:uppercase;letter-spacing:.04em;">${tr('Ibadah Hari Ini', "Today's Worship")}</div>
            <div style="font-size:1.5rem;font-weight:800;margin-top:2px;">${selesai} / ${total} ${tr('selesai', 'done')}</div>
            <div style="font-size:.85rem;opacity:.9;margin-top:4px;">${fmtDate(todayStr(), { weekday: true })}</div>
          </div>
          <div class="score-ring" style="width:100px;height:100px;">
            ${ringSVG(pct, { size: 100, stroke: 9, color: '#fff', track: 'rgba(255,255,255,.25)' })}
            <div class="sr-val"><div class="sr-num" style="font-size:1.3rem;">${pct}%</div></div>
          </div>
        </div>
      </div>

      <div class="section-head" style="margin-top:20px;">
        <h2>🕌 ${tr('Sholat Dhuha & Dzuhur', 'Dhuha & Dhuhr Prayers')}</h2>
        <span class="badge badge-green">${tr('Dipantau guru', 'Monitored by teacher')}</span>
      </div>
      <div class="fardhu-grid">
        ${items.map(tile).join('')}
      </div>

      <div class="disclaimer" style="margin-top:20px;">
        <ion-icon name="bulb-outline"></ion-icon>
        <span>${tr('Centang setelah kamu mengerjakannya. Guru melihat rekap harian & bulanannya, jadi isi dengan jujur ya. 🌱',
               'Check them off once you have prayed. Your teacher sees the daily and monthly recap, so be honest. 🌱')}</span>
      </div>`;

    $$('[data-toggle]', el).forEach(b => b.onclick = async () => {
      const key = b.dataset.toggle;
      const nd = { ...done, [key]: !done[key] };
      await this._saveToday(nd);
      App.refresh();
    });
  },

  // Jalur UMUM — checklist amalan dikelompokkan per waktu sholat, ditampilkan
  // sebagai TABEL (baris = amalan, kolom = tanggal sebulan) persis format
  // spreadsheet rekap ibadah: ketuk sel untuk centang ✓ / silang ✗, geser
  // bulan lewat ‹ ›. Sepenuhnya bisa diedit/ditambah/dihapus per individu
  // (lihat KELOMPOK_IBADAH/_checklist()).
  async _renderTodayUmum(el, done) {
    const items = await this._checklist();
    const total = items.length;
    const selesai = items.filter(i => done[i.id]).length;
    const pct = total ? Math.round(selesai / total * 100) : 0;

    const kini = new Date();
    const tampil = new Date(kini.getFullYear(), kini.getMonth() + this.tableGeser, 1);
    const thn = tampil.getFullYear(), bln = tampil.getMonth();
    const jmlHari = new Date(thn, bln + 1, 0).getDate();
    const hariIni = todayStr();
    const bulanKey = `${thn}-${String(bln + 1).padStart(2, '0')}`;

    const allDaily = await DB.list('ibadah_daily');
    const doneByDate = {};
    allDaily.forEach(d => { if ((d.tanggal || '').startsWith(bulanKey)) doneByDate[d.tanggal] = d.done || {}; });

    const dates = [];
    for (let t = 1; t <= jmlHari; t++) dates.push(`${bulanKey}-${String(t).padStart(2, '0')}`);

    // Item biasa: kosong → ✓ selesai → ✗ tidak dikerjakan → kosong lagi.
    // Item ber-`pilihan` (mis. Sholat Dhuha): kosong → 2 → 4 → 6 → 8 → ✗ tidak
    // dikerjakan → kosong lagi.
    const cellSymbol = (i, tgl) => {
      const val = (doneByDate[tgl] || {})[i.id];
      if (i.pilihan) return val === false ? '✗' : (val ? String(val) : '');
      if (val === true) return '✓';
      if (val === false) return '✗';
      return '';
    };
    const cellClass = (i, tgl) => {
      const val = (doneByDate[tgl] || {})[i.id];
      if (i.pilihan) return val === false ? 'ib-cell-no' : (val ? 'ib-cell-on' : '');
      if (val === true) return 'ib-cell-yes';
      if (val === false) return 'ib-cell-no';
      return '';
    };

    // Persentase sebulan per amalan — kolom terakhir tabel. Penyebutnya
    // hanya tanggal yang SUDAH LEWAT (≤ hari ini): bulan berjalan → sejauh
    // tanggal hari ini, bulan lampau → sebulan penuh, bulan depan → tak ada
    // (tampil "–"). Item ber-`pilihan` (mis. Dhuha) dihitung "selesai" bila
    // ada rakaat terisi (angka apa pun), bukan cuma ✓; ✗ eksplisit maupun
    // sel kosong dianggap belum.
    const dayCountForPct = dates.filter(tgl => tgl <= hariIni).length;
    const isDone = (i, tgl) => {
      const val = (doneByDate[tgl] || {})[i.id];
      return i.pilihan ? (val !== undefined && val !== false) : val === true;
    };
    const pctFor = i => {
      if (!dayCountForPct) return null;
      const ya = dates.filter(tgl => tgl <= hariIni && isDone(i, tgl)).length;
      return Math.round(ya / dayCountForPct * 100);
    };

    const pctCell = i => {
      const p = pctFor(i);
      return `<td class="center" style="font-weight:800;font-size:.78rem;">${p === null ? '–' : p + '%'}</td>`;
    };

    const rowHtml = i => `
      <tr>
        <td class="sticky-col"><span style="font-weight:600;font-size:.8rem;">${esc(i.label)}</span></td>
        ${dates.map(tgl => `
          <td class="center ${cellClass(i, tgl)} ${tgl === hariIni ? 'ib-col-today' : ''}">
            <button class="ib-cell-btn" data-cell="${i.id}" data-date="${tgl}" data-pilihan="${i.pilihan ? i.pilihan.join(',') : ''}" ${tgl > hariIni ? 'disabled' : ''}>${cellSymbol(i, tgl)}</button>
          </td>`).join('')}
        ${pctCell(i)}
      </tr>`;

    // Baris judul kelompok waktu — di DALAM tabel yang sama (bukan kartu
    // terpisah per waktu), supaya seluruh checklist jadi satu lembar
    // menerus persis spreadsheet acuan. Tombol "Kelola" menempel di sel
    // nama kelompok (sticky-col) sendiri, bersebelahan dengan labelnya.
    // colspan +1 supaya baris ini tetap merentang sampai kolom % di ujung.
    const groupHeaderRow = g => `
      <tr class="ib-group-row">
        <td class="sticky-col">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
            <span>${g.emoji} ${tr(g.id, g.en)}</span>
            <button class="mini-icon-btn" data-managegrp="${g.key}" title="${tr('Kelola amalan', 'Manage items')}" style="width:24px;height:24px;flex-shrink:0;"><ion-icon name="options-outline" style="font-size:.85rem;"></ion-icon></button>
          </div>
        </td>
        <td colspan="${dates.length + 1}"></td>
      </tr>`;

    const emptyRow = () => `
      <tr>
        <td class="sticky-col" style="color:var(--text-3);font-style:italic;font-weight:500;">${tr('Belum ada item', 'No items yet')}</td>
        <td colspan="${dates.length + 1}"></td>
      </tr>`;

    const bodyRows = this.KELOMPOK_IBADAH.map(g => {
      const its = items.filter(i => i.kelompok === g.key);
      return groupHeaderRow(g) + (its.length ? its.map(rowHtml).join('') : emptyRow());
    }).join('');

    el.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,#0e7490,#0891b2);color:#fff;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:.8rem;font-weight:700;opacity:.85;text-transform:uppercase;letter-spacing:.04em;">${tr('Ibadah Hari Ini', "Today's Worship")}</div>
            <div style="font-size:1.5rem;font-weight:800;margin-top:2px;">${selesai} / ${total} ${tr('selesai', 'done')}</div>
            <div style="font-size:.85rem;opacity:.9;margin-top:4px;">${fmtDate(todayStr(), { weekday: true })}</div>
          </div>
          <div class="score-ring" style="width:100px;height:100px;">
            ${ringSVG(pct, { size: 100, stroke: 9, color: '#fff', track: 'rgba(255,255,255,.25)' })}
            <div class="sr-val"><div class="sr-num" style="font-size:1.3rem;">${pct}%</div></div>
          </div>
        </div>
      </div>

      <div class="section-head" style="margin-top:20px;">
        <h2>${BULAN[bln]} ${thn}</h2>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm" id="dlPdf"><ion-icon name="download-outline"></ion-icon> ${tr('Unduh PDF', 'Download PDF')}</button>
          <button class="mini-icon-btn" id="tblPrev"><ion-icon name="chevron-back-outline"></ion-icon></button>
          ${this.tableGeser !== 0 ? `<button class="btn btn-sm" id="tblNow">${tr('Bulan ini', 'This month')}</button>` : ''}
          <button class="mini-icon-btn" id="tblNext"><ion-icon name="chevron-forward-outline"></ion-icon></button>
        </div>
      </div>

      <div class="card" style="margin-top:14px;padding:0;overflow:hidden;">
        <div class="table-wrap" style="border:none;border-radius:0;">
          <table class="data-table ib-table">
            <thead><tr>
              <th class="sticky-col" style="min-width:150px;">${tr('Amalan', 'Item')}</th>
              ${dates.map(tgl => `<th class="center ${tgl === hariIni ? 'ib-col-today' : ''}" style="min-width:32px;">${+tgl.slice(-2)}</th>`).join('')}
              <th class="center" style="min-width:52px;" title="${tr('Persentase bulan ini', "This month's percentage")}">%</th>
            </tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
      </div>

      <div class="disclaimer" style="margin-top:20px;">
        <ion-icon name="bulb-outline"></ion-icon>
        <span>${tr('Ketuk sel: kosong → ✓ selesai → ✗ tidak dikerjakan → kosong lagi (Sholat Dhuha: kosong → 2 → 4 → 6 → 8 rakaat → ✗ tidak dikerjakan → kosong lagi). Geser tabel ke samping untuk tanggal lain, tombol ‹ › untuk bulan lain. Ketuk "Kelola" untuk ubah/hapus/menambah amalanmu sendiri di tiap waktu. 🌱',
               'Tap a cell: blank → ✓ done → ✗ missed → blank again (Dhuha: blank → 2 → 4 → 6 → 8 rakaat → ✗ missed → blank again). Scroll the table sideways for other dates, ‹ › for other months. Tap "Manage" to rename/delete/add your own items under each prayer time. 🌱')}</span>
      </div>`;

    $('#tblPrev', el).onclick = () => { this.tableGeser--; this._renderTodayUmum(el, done); };
    $('#tblNext', el).onclick = () => { this.tableGeser++; this._renderTodayUmum(el, done); };
    $('#tblNow', el) && ($('#tblNow', el).onclick = () => { this.tableGeser = 0; this._renderTodayUmum(el, done); });

    // Unduh PDF — tabel yang sama (baris/kolom/kolom % nya) tapi versi
    // statis (sel jadi teks, bukan tombol) lewat printHTML() (js/utils.js),
    // yang membuka jendela cetak berisi tombol "Cetak / Simpan PDF".
    $('#dlPdf', el).onclick = () => {
      const pdfRow = i => {
        const p = pctFor(i);
        return `<tr>
          <td class="ib-lb">${esc(i.label)}</td>
          ${dates.map(tgl => `<td class="center${tgl > hariIni ? ' muted' : ''}">${esc(cellSymbol(i, tgl) || '')}</td>`).join('')}
          <td class="center" style="font-weight:bold;">${p === null ? '–' : p + '%'}</td>
        </tr>`;
      };
      const pdfGroupRow = g => `<tr class="grp"><td colspan="${dates.length + 2}">${g.emoji} ${esc(tr(g.id, g.en))}</td></tr>`;
      const pdfEmptyRow = () => `<tr><td colspan="${dates.length + 2}" class="muted">${tr('Belum ada item', 'No items yet')}</td></tr>`;
      const pdfBody = this.KELOMPOK_IBADAH.map(g => {
        const its = items.filter(i => i.kelompok === g.key);
        return pdfGroupRow(g) + (its.length ? its.map(pdfRow).join('') : pdfEmptyRow());
      }).join('');

      printHTML(`${tr('Checklist Ibadah Dan Amalan', 'Worship Checklist')} ${BULAN[bln]} ${thn}`, `
        <style>
          @page{size:A4 landscape;margin:10mm;}
          h1{font-size:16px;text-align:center;margin-bottom:2px;}
          .sub{text-align:center;font-size:11px;color:#333;margin-bottom:10px;}
          table.ib-print th,table.ib-print td{font-size:9px;padding:3px 4px;}
          table.ib-print td.ib-lb{text-align:left;white-space:nowrap;}
          table.ib-print tr.grp td{background:#eee;font-weight:bold;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        </style>
        <h1>${tr('CHECKLIST IBADAH DAN AMALAN', 'WORSHIP CHECKLIST & DEEDS')}</h1>
        <div class="sub">${esc(DB.user?.nama || '')} · ${BULAN[bln]} ${thn}</div>
        <div class="tbl-scroll">
        <table class="ib-print">
          <thead><tr>
            <th style="text-align:left;">${tr('Amalan', 'Item')}</th>
            ${dates.map(tgl => `<th>${+tgl.slice(-2)}</th>`).join('')}
            <th>%</th>
          </tr></thead>
          <tbody>${pdfBody}</tbody>
        </table>
        </div>`);
    };

    $$('[data-cell]', el).forEach(b => b.onclick = async () => {
      if (b.disabled) return;
      const id = b.dataset.cell, tgl = b.dataset.date;
      const pilihan = b.dataset.pilihan ? b.dataset.pilihan.split(',').map(Number) : null;
      const cur = (doneByDate[tgl] || {})[id];

      let next;
      if (pilihan) {
        // kosong → pilihan[0] → … → pilihan terakhir → ✗ (tidak dikerjakan) → kosong lagi.
        if (cur === false) next = undefined;
        else if (!cur) next = pilihan[0];
        else {
          const idx = pilihan.indexOf(cur);
          next = idx === -1 ? undefined : (idx === pilihan.length - 1 ? false : pilihan[idx + 1]);
        }
      } else {
        next = (cur !== true && cur !== false) ? true : (cur === true ? false : undefined);
      }

      const nd = { ...(doneByDate[tgl] || {}) };
      if (next === undefined) delete nd[id]; else nd[id] = next;
      await this._saveDoneFor(tgl, nd);
      App.refresh();
    });
    $$('[data-managegrp]', el).forEach(b => b.onclick = () => this._manageGroupModal(b.dataset.managegrp, items));
  },

  // Daftar amalan satu kelompok waktu + ubah/hapus/tambah — dipanggil dari
  // tombol "Kelola" di header tabel (lihat _renderTodayUmum → groupCard).
  _manageGroupModal(groupKey, items) {
    const g = this.KELOMPOK_IBADAH.find(x => x.key === groupKey);
    const its = items.filter(i => i.kelompok === groupKey);
    openModal({
      title: tr(`Kelola Amalan — ${g ? g.id : ''}`, `Manage Items — ${g ? g.en : ''}`),
      body: `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${its.length ? its.map(i => `
            <div class="list-item">
              <div style="flex:1;min-width:0;font-weight:700;font-size:.88rem;">${esc(i.label)}${i.pilihan ? ` <span style="font-weight:500;color:var(--text-3);font-size:.78rem;">(${i.pilihan.join('/')} ${esc(i.satuan || '')})</span>` : ''}</div>
              <button class="mini-icon-btn" data-mgedit="${i.id}"><ion-icon name="create-outline"></ion-icon></button>
              <button class="mini-icon-btn danger" data-mgdel="${i.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`).join('') : `<div style="font-size:.82rem;color:var(--text-3);">${tr('Belum ada item.', 'No items yet.')}</div>`}
        </div>
        <button class="btn btn-primary btn-block" id="mgAdd" style="margin-top:16px;"><ion-icon name="add"></ion-icon> ${tr('Tambah Item Baru', 'Add New Item')}</button>`,
      onMount: m => {
        $('#mgAdd', m).onclick = () => { closeModal(); this._checklistModal(groupKey); };
        $$('[data-mgedit]', m).forEach(b => b.onclick = () => {
          const item = its.find(i => i.id === b.dataset.mgedit);
          closeModal();
          this._checklistModal(groupKey, item);
        });
        $$('[data-mgdel]', m).forEach(b => b.onclick = async () => {
          if (!await confirmDialog(tr('Hapus item checklist ini?', 'Delete this checklist item?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
          await DB.remove('ibadah_checklist', b.dataset.mgdel);
          closeModal();
          toast(tr('Item dihapus', 'Item deleted'));
          App.refresh();
        });
      }
    });
  },

  /* ============ TAB: AL-QUR'AN ============ */

  async renderQuran(el) {
    const [logs, hafalan] = await Promise.all([DB.list('quran_log'), DB.list('hafalan')]);
    const target = DB.user?.khatamTarget || 30;   // hari
    const totalLembar = 604;                       // 1 mushaf standar ± 604 halaman

    // rekap minggu & bulan ini (berdasar lembar)
    const bulan = monthStr();
    const lembarBulan = logs.filter(l => (l.tanggal || '').startsWith(bulan)).reduce((s, l) => s + (l.lembar || 0), 0);
    // 7 hari terakhir
    let lembar7 = 0;
    const hari7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = todayStr(d);
      const v = logs.filter(l => l.tanggal === iso).reduce((s, l) => s + (l.lembar || 0), 0);
      lembar7 += v;
      hari7.push({ label: HARI[d.getDay()].slice(0, 3), value: v });
    }
    const todayLembar = logs.filter(l => l.tanggal === todayStr()).reduce((s, l) => s + (l.lembar || 0), 0);

    // target harian untuk khatam sesuai target hari, dibagi rata ke 5 sesi
    // (setelah tiap sholat fardhu) — lihat tabel acuan di SS/image copy 3.png.
    const perHari = Math.ceil(totalLembar / target); // lembar/hari
    const perSesi = Math.max(1, Math.round(perHari / 5));
    const juzBulan = (lembarBulan / totalLembar * 30).toFixed(1);

    // Sesi tilawah hari ini: satu entri quran_log bertanda `sesi` per sholat
    // fardhu (klik = tercatat perSesi lembar, klik lagi = batal) — tak perlu
    // modal/catatan manual lagi, tinggal klik seperti checklist sholat.
    const sesiHariIni = new Set(logs.filter(l => l.tanggal === todayStr() && l.sesi).map(l => l.sesi));
    const sesiTile = i => `
      <button class="fardhu-tile ${sesiHariIni.has(i.key) ? 'done' : ''}" data-sesi="${esc(i.key)}">
        <span class="ft-emoji">${i.emoji}</span>
        <span class="ft-name">${esc(tr(i.id, i.en))}</span>
        <span class="ft-sub">${perSesi} ${tr('lembar', 'pages')}</span>
        <ion-icon class="ft-badge" name="${sesiHariIni.has(i.key) ? 'checkmark-circle' : 'ellipse-outline'}"></ion-icon>
      </button>`;

    const hafalHafal = hafalan.filter(h => h.status === 'hafal').length;

    el.innerHTML = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title"><ion-icon name="book" style="color:#0891b2"></ion-icon>${tr('Tilawah Hari Ini', "Today's Recitation")}</div>
          <div style="text-align:center;margin:14px 0;">
            <div style="font-size:2.4rem;font-weight:800;color:#0891b2;">${todayLembar}</div>
            <div style="font-size:.82rem;color:var(--text-3);font-weight:600;">${tr(`lembar hari ini · target ${perHari} lembar/hari`, `pages today · target ${perHari} pages/day`)}</div>
          </div>
          <div class="progress"><div class="progress-fill blue" style="width:${clamp(Math.round(todayLembar / perHari * 100), 0, 100)}%"></div></div>
          <div class="fardhu-grid" style="margin-top:16px;">
            ${this.UMUM.map(sesiTile).join('')}
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px;">
            <button class="mini-icon-btn" id="khatamSet" title="${tr('Atur target khatam', 'Set khatam target')}"><ion-icon name="options-outline"></ion-icon></button>
          </div>
        </div>

        <div class="card">
          <div class="card-title"><ion-icon name="bar-chart" style="color:#0891b2"></ion-icon>${tr('Rekap Bacaan', 'Reading Recap')}</div>
          <div class="grid grid-2 keep-2" style="gap:12px;margin-top:8px;">
            <div class="money-stat" style="padding:12px;"><div class="ms-label">${tr('Minggu ini', 'This week')}</div><div class="ms-value" style="font-size:1.2rem;">${lembar7} ${tr('lembar', 'pages')}</div></div>
            <div class="money-stat" style="padding:12px;"><div class="ms-label">${tr('Bulan ini', 'This month')}</div><div class="ms-value" style="font-size:1.2rem;">${lembarBulan} ${tr('lembar', 'pages')}</div></div>
          </div>
          <div style="font-size:.82rem;color:var(--text-3);text-align:center;margin-top:10px;">≈ <b>${juzBulan}</b> ${tr('juz bulan ini', 'juz this month')} · ${tr('target khatam', 'khatam target')}: <b>${target}</b> ${tr('hari', 'days')}</div>
          <div style="margin-top:10px;">${hari7.some(h => h.value > 0) ? barChartSVG(hari7, { color: '#0891b2' }) : `<div style="text-align:center;font-size:.82rem;color:var(--text-3);padding:14px;">${tr('Belum ada bacaan minggu ini 📖', 'No reading this week yet 📖')}</div>`}</div>
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div class="card-title"><ion-icon name="bulb-outline" style="color:var(--fin)"></ion-icon>${tr('Life Hack: Khatam Sebulan', 'Life Hack: Khatam in a Month')}</div>
        <p style="font-size:.85rem;color:var(--text-2);line-height:1.6;margin-top:8px;">
          ${tr('Baca <b>2 lembar setiap selesai sholat fardhu</b> (5×2 = 10 lembar/hari). Dalam ±30 hari, kamu khatam Al-Qur\'an satu kali. Ingin 2× khatam? Baca 4 lembar tiap sholat.', 'Read <b>2 pages after each fardh prayer</b> (5×2 = 10 pages/day). In ±30 days you complete the Qur\'an once. Want 2× khatam? Read 4 pages per prayer.')}
        </p>
      </div>

      <div class="section-head" style="margin-top:20px;">
        <h2>🧠 ${tr('Checklist Hafalan', 'Memorization Checklist')} ${hafalan.length ? `<span class="badge badge-green">${hafalHafal}/${hafalan.length} ${tr('hafal', 'memorized')}</span>` : ''}</h2>
        <button class="btn btn-sm" id="addHafalan"><ion-icon name="add"></ion-icon> ${tr('Target', 'Target')}</button>
      </div>
      ${hafalan.length ? `
        <div style="display:flex;flex-direction:column;gap:9px;">
          ${hafalan.map(h => `
            <div class="list-item">
              <button class="task-check ${h.status === 'hafal' ? 'done' : ''}" data-hf="${h.id}"><ion-icon name="checkmark"></ion-icon></button>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:.9rem;" class="${h.status === 'hafal' ? 'task-title-done' : ''}">${esc(h.nama)}</div>
                ${h.catatan ? `<div style="font-size:.78rem;color:var(--text-3);">${esc(h.catatan)}</div>` : ''}
              </div>
              <span class="badge ${h.status === 'hafal' ? 'badge-green' : 'badge-amber'}">${h.status === 'hafal' ? tr('Hafal', 'Memorized') : tr('Proses', 'In progress')}</span>
              <button class="mini-icon-btn danger" data-delhf="${h.id}"><ion-icon name="trash-outline"></ion-icon></button>
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="book-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada target hafalan', 'No memorization targets yet')}</div>
          <div class="es-sub">${tr('Tambahkan surat/ayat yang ingin kamu hafal 🧠', 'Add surahs/verses you want to memorize 🧠')}</div>
        </div>`}

      <div class="section-head" style="margin-top:22px;"><h2>📖 ${tr('Al-Qur\'an Digital', 'Digital Qur\'an')}</h2></div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${this.SURAH.map((s, i) => `
          <div class="card" style="cursor:pointer;" data-surah="${i}">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="font-weight:800;font-size:.95rem;">${s.no}. ${esc(s.nama)} <span style="font-weight:600;color:var(--text-3);font-size:.82rem;">· ${esc(tr(s.arti_id, s.arti_en))} · ${s.ayat} ${tr('ayat', 'verses')}</span></div>
              <ion-icon name="chevron-down" id="schev-${i}"></ion-icon>
            </div>
            <div id="sbody-${i}" style="display:none;margin-top:12px;">
              ${s.teks.map(a => `<div style="padding:10px 0;border-top:1px solid var(--border);">
                <div style="direction:rtl;font-size:1.5rem;line-height:2;text-align:right;">${a.ar} <span style="font-size:.9rem;color:var(--text-3);">﴿${a.n}﴾</span></div>
                <div style="font-size:.82rem;font-style:italic;color:var(--text-3);margin-top:4px;">${esc(a.lt)}</div>
                <div style="font-size:.86rem;color:var(--text-2);margin-top:3px;">${esc(tr(a.id, a.en))}</div>
              </div>`).join('')}
            </div>
          </div>`).join('')}
        <a class="btn btn-block" href="https://quran.com/id" target="_blank" rel="noopener" style="text-decoration:none;">
          <ion-icon name="open-outline"></ion-icon> ${tr('Buka Mushaf Lengkap + Audio Murrotal (quran.com)', 'Open Full Mushaf + Audio (quran.com)')}
        </a>
      </div>`;

    $$('[data-surah]', el).forEach(c => c.onclick = () => {
      const i = c.dataset.surah;
      const b = $(`#sbody-${i}`, el), ch = $(`#schev-${i}`, el);
      const open = b.style.display === 'none';
      b.style.display = open ? 'block' : 'none';
      ch.setAttribute('name', open ? 'chevron-up' : 'chevron-down');
    });

    $$('[data-sesi]', el).forEach(b => b.onclick = async () => {
      const key = b.dataset.sesi;
      const existing = logs.find(l => l.tanggal === todayStr() && l.sesi === key);
      if (existing) {
        await DB.remove('quran_log', existing.id);
      } else {
        await DB.add('quran_log', { tanggal: todayStr(), lembar: perSesi, sesi: key });
        toast(tr('Barakallah, tercatat 📖', 'Barakallah, logged 📖'));
      }
      App.refresh();
    });
    $('#khatamSet', el).onclick = () => this._khatamModal(target);
    $('#addHafalan', el).onclick = () => this._hafalanModal();
    $$('[data-hf]', el).forEach(b => b.onclick = async () => {
      const h = hafalan.find(x => x.id === b.dataset.hf);
      await DB.update('hafalan', h.id, { status: h.status === 'hafal' ? 'proses' : 'hafal' });
      if (h.status !== 'hafal') toast(tr('Alhamdulillah, hafal! 🎉', 'Alhamdulillah, memorized! 🎉'));
      App.refresh();
    });
    $$('[data-delhf]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus target hafalan ini?', 'Delete this memorization target?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      await DB.remove('hafalan', b.dataset.delhf);
      App.refresh();
    });
  },

  _khatamModal(target) {
    openModal({
      title: tr('Target Khatam', 'Khatam Target'),
      body: `
        <div class="field">
          <label>${tr('Selesaikan Al-Qur\'an dalam berapa hari?', 'Complete the Qur\'an in how many days?')}</label>
          <select class="select" id="mTarget">
            ${[7, 10, 15, 30, 40, 60, 90].map(d => `<option value="${d}" ${d === target ? 'selected' : ''}>${d} ${tr('hari', 'days')} (${Math.ceil(604 / d)} ${tr('lembar/hari', 'pages/day')})</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan Target', 'Save Target')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          await DB.updateUser({ khatamTarget: +$('#mTarget', m).value });
          closeModal();
          toast(tr('Target khatam tersimpan 🎯', 'Khatam target saved 🎯'));
          App.refresh();
        };
      }
    });
  },

  _hafalanModal() {
    openModal({
      title: tr('Target Hafalan Baru', 'New Memorization Target'),
      body: `
        <div class="field">
          <label>${tr('Surat / ayat', 'Surah / verses')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('mis. Al-Mulk, Ar-Rahman 1–20', 'e.g. Al-Mulk, Ar-Rahman 1–20')}">
        </div>
        <div class="field">
          <label>${tr('Catatan', 'Note')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
          <input type="text" class="input" id="mCat" placeholder="${tr('mis. target selesai Ramadhan', 'e.g. finish by Ramadan')}">
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Tambah', 'Add')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (!nama) return toast(tr('Isi surat/ayat.', 'Enter surah/verses.'), 'warning');
          await DB.add('hafalan', { nama, catatan: $('#mCat', m).value.trim(), status: 'proses' });
          closeModal();
          toast(tr('Target hafalan ditambahkan 🧠', 'Memorization target added 🧠'));
          App.refresh();
        };
      }
    });
  },

  /* ============ TAB: DZIKIR & DOA ============ */

  DZIKIR: [
    { ar: 'سُبْحَانَ اللّٰه', tr: 'Subhanallah', arti_id: 'Maha Suci Allah', arti_en: 'Glory be to Allah', target: 33 },
    { ar: 'اَلْحَمْدُ لِلّٰه', tr: 'Alhamdulillah', arti_id: 'Segala puji bagi Allah', arti_en: 'All praise to Allah', target: 33 },
    { ar: 'اَللّٰهُ اَكْبَر', tr: 'Allahu Akbar', arti_id: 'Allah Maha Besar', arti_en: 'Allah is the Greatest', target: 34 },
    { ar: 'لَا اِلٰهَ اِلَّا اللّٰه', tr: 'La ilaha illallah', arti_id: 'Tiada Tuhan selain Allah', arti_en: 'There is no god but Allah', target: 100 },
    { ar: 'اَسْتَغْفِرُ اللّٰه', tr: 'Astaghfirullah', arti_id: 'Aku memohon ampun kepada Allah', arti_en: 'I seek forgiveness from Allah', target: 100 }
  ],

  DOA: [
    { id: 'Sebelum makan', en: 'Before eating', ar: 'اَللّٰهُمَّ بَارِكْ لَنَا فِيْمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ', teks: 'Allahumma baarik lanaa fiimaa razaqtanaa wa qinaa \'adzaaban naar' },
    { id: 'Sesudah makan', en: 'After eating', ar: 'اَلْحَمْدُ لِلّٰهِ الَّذِيْ اَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِيْنَ', teks: 'Alhamdulillaahil ladzii ath\'amanaa wa saqaanaa wa ja\'alanaa muslimiin' },
    { id: 'Sebelum tidur', en: 'Before sleeping', ar: 'بِاسْمِكَ اللّٰهُمَّ اَحْيَا وَبِاسْمِكَ اَمُوْتُ', teks: 'Bismika allaahumma ahyaa wa bismika amuut' },
    { id: 'Bangun tidur', en: 'Upon waking', ar: 'اَلْحَمْدُ لِلّٰهِ الَّذِيْ اَحْيَانَا بَعْدَ مَا اَمَاتَنَا وَاِلَيْهِ النُّشُوْرُ', teks: 'Alhamdulillaahil ladzii ahyaanaa ba\'da maa amaatanaa wa ilaihin nusyuur' },
    { id: 'Sebelum belajar', en: 'Before studying', ar: 'رَبِّ زِدْنِيْ عِلْمًا وَارْزُقْنِيْ فَهْمًا', teks: 'Rabbi zidnii \'ilman warzuqnii fahmaa' },
    { id: 'Keluar rumah', en: 'Leaving home', ar: 'بِسْمِ اللّٰهِ تَوَكَّلْتُ عَلَى اللّٰهِ لَا حَوْلَ وَلَا قُوَّةَ اِلَّا بِاللّٰهِ', teks: 'Bismillaahi tawakkaltu \'alallaah, laa haula wa laa quwwata illaa billaah' }
  ],

  dzikirCount: {},
  dzikirIdx: 0,     // dzikir yang sedang ditampilkan (gaya tasbih digital)

  QUOTES: [
    { id: '"Sesungguhnya bersama kesulitan ada kemudahan."', en: '"Indeed, with hardship comes ease."', src: 'QS. Al-Insyirah: 6' },
    { id: '"Allah tidak membebani seseorang melainkan sesuai kesanggupannya."', en: '"Allah does not burden a soul beyond its capacity."', src: 'QS. Al-Baqarah: 286' },
    { id: '"Barang siapa bertakwa kepada Allah, niscaya Dia akan membukakan jalan keluar."', en: '"Whoever fears Allah, He will make a way out for them."', src: 'QS. At-Talaq: 2' },
    { id: '"Menuntut ilmu itu wajib bagi setiap muslim."', en: '"Seeking knowledge is an obligation upon every Muslim."', src: 'HR. Ibnu Majah' },
    { id: '"Sebaik-baik manusia adalah yang paling bermanfaat bagi orang lain."', en: '"The best of people are those most beneficial to others."', src: 'HR. Ahmad' },
    { id: '"Amal yang paling dicintai Allah adalah yang konsisten walau sedikit."', en: '"The deeds most beloved to Allah are the most consistent, even if small."', src: 'HR. Bukhari & Muslim' },
    { id: '"Karena itu, ingatlah kamu kepada-Ku niscaya Aku ingat kepadamu."', en: '"So remember Me; I will remember you."', src: 'QS. Al-Baqarah: 152' },
    { id: '"Cukuplah Allah menjadi penolong bagi kami, dan Dia sebaik-baik pelindung."', en: '"Sufficient for us is Allah, and He is the best disposer of affairs."', src: 'QS. Ali Imran: 173' },
    { id: '"Dan barang siapa bersyukur, maka sesungguhnya ia bersyukur untuk dirinya sendiri."', en: '"And whoever is grateful is grateful for the benefit of himself."', src: 'QS. Luqman: 12' },
    { id: '"Sesungguhnya Allah bersama orang-orang yang sabar."', en: '"Indeed, Allah is with the patient."', src: 'QS. Al-Baqarah: 153' },
    { id: '"Jadikanlah sabar dan salat sebagai penolongmu."', en: '"Seek help through patience and prayer."', src: 'QS. Al-Baqarah: 45' },
    { id: '"Tidaklah seorang muslim tertimpa kelelahan, sakit, atau kesedihan, melainkan Allah menghapus kesalahannya."', en: '"No fatigue, illness, or grief befalls a Muslim except that Allah expiates some of his sins."', src: 'HR. Bukhari & Muslim' },
    { id: '"Barang siapa menempuh jalan menuntut ilmu, Allah mudahkan baginya jalan menuju surga."', en: '"Whoever treads a path seeking knowledge, Allah makes easy for him the path to Paradise."', src: 'HR. Muslim' },
    { id: '"Senyummu di hadapan saudaramu adalah sedekah."', en: '"Your smile for your brother is charity."', src: 'HR. Tirmidzi' }
  ],

  renderDzikir(el) {
    const c = this.dzikirCount;
    // Motivasi berganti tiap hari: indeks maju tepat satu kutipan setiap
    // pergantian hari (waktu lokal, berganti saat tengah malam), memutar
    // seluruh daftar tanpa mengulang di dua hari berurutan.
    const now = new Date();
    const hariKe = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
    const q = this.QUOTES[((hariKe % this.QUOTES.length) + this.QUOTES.length) % this.QUOTES.length];
    el.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,#7c3aed,#0891b2);color:#fff;margin-bottom:18px;">
        <div style="font-size:.75rem;opacity:.85;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">✨ ${tr('Motivasi Hari Ini', 'Today\'s Motivation')}</div>
        <div style="font-size:1.05rem;font-weight:700;line-height:1.6;margin-top:8px;">${esc(tr(q.id, q.en))}</div>
        <div style="font-size:.82rem;opacity:.9;margin-top:8px;">— ${esc(q.src)}</div>
      </div>
      <div class="section-head"><h2>📿 ${tr('Penghitung Dzikir', 'Dhikr Counter')}</h2></div>
      ${(() => {
        const total = this.DZIKIR.length;
        const i = ((this.dzikirIdx % total) + total) % total;   // amankan indeks
        this.dzikirIdx = i;
        const d = this.DZIKIR[i];
        const val = c[i] || 0;
        const pct = clamp(Math.round(val / d.target * 100), 0, 100);
        const sudah = val >= d.target;
        return `
        <div class="card" style="max-width:440px;margin:0 auto;text-align:center;">
          <!-- Baris atas: navigasi geser + reset (sengaja jauh dari lingkaran
               count agar tidak terpencet saat berdzikir). -->
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="mini-icon-btn" data-nav="-1" title="${tr('Dzikir sebelumnya', 'Previous dhikr')}"><ion-icon name="chevron-back"></ion-icon></button>
            <div style="flex:1;text-align:center;font-size:.8rem;color:var(--text-3);font-weight:700;letter-spacing:.02em;">${i + 1} / ${total}</div>
            <button class="mini-icon-btn" data-nav="1" title="${tr('Dzikir berikutnya', 'Next dhikr')}"><ion-icon name="chevron-forward"></ion-icon></button>
          </div>

          <div class="arabic arabic-lg" style="text-align:center;margin-top:10px;">${d.ar}</div>
          <div style="font-size:1.02rem;font-weight:800;margin-top:6px;">${d.tr}</div>
          <div style="font-size:.82rem;color:var(--text-3);margin-top:2px;">${tr(d.arti_id, d.arti_en)}</div>

          <!-- Angka hitungan + tombol reset di pojok kanan -->
          <div style="position:relative;margin-top:16px;">
            <div style="font-size:2.9rem;font-weight:800;color:#0891b2;line-height:1;text-align:center;">${val}<span style="font-size:1.05rem;color:var(--text-3);font-weight:700;"> / ${d.target}</span></div>
            <button class="mini-icon-btn" id="tasbihReset" style="position:absolute;top:50%;right:0;transform:translateY(-50%);" title="${tr('Reset hitungan', 'Reset count')}"><ion-icon name="refresh"></ion-icon></button>
          </div>

          <!-- Lingkaran = tombol COUNT: ketuk untuk menghitung -->
          <div style="position:relative;width:190px;height:190px;margin:16px auto 8px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(#0891b2 ${pct * 3.6}deg, rgba(8,145,178,.14) 0deg);transition:background .25s;"></div>
            <button id="tasbihTap" style="position:absolute;inset:11px;border:0;border-radius:50%;cursor:pointer;background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(0,0,0,.10);-webkit-tap-highlight-color:transparent;user-select:none;" title="${tr('Ketuk untuk berdzikir', 'Tap to count')}">
              <ion-icon name="add" style="font-size:2.9rem;color:#0891b2;"></ion-icon>
              <span style="font-size:.8rem;color:var(--text-3);font-weight:800;letter-spacing:.08em;margin-top:2px;">${tr('KETUK', 'TAP')}</span>
            </button>
          </div>

          ${sudah ? `<div class="badge badge-green" style="margin:2px 0 4px;"><ion-icon name="checkmark-circle"></ion-icon> ${tr('Target tercapai', 'Target reached')} ✨</div>` : ''}

          <!-- Indikator titik: ketuk untuk lompat ke dzikir tertentu -->
          <div style="display:flex;gap:6px;justify-content:center;margin-top:18px;">
            ${this.DZIKIR.map((_, j) => `<span data-dot="${j}" title="${esc(this.DZIKIR[j].tr)}" style="width:${j === i ? '22px' : '8px'};height:8px;border-radius:99px;cursor:pointer;transition:all .2s;background:${j === i ? '#0891b2' : 'var(--border)'};"></span>`).join('')}
          </div>
        </div>`;
      })()}

      <div class="section-head" style="margin-top:22px;"><h2>🤲 ${tr('Doa Harian', 'Daily Du\'a')}</h2></div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${this.DOA.map(d => `
          <div class="card">
            <div style="font-weight:700;font-size:.9rem;">${tr(d.id, d.en)}</div>
            <div class="arabic arabic-md" style="margin-top:8px;">${d.ar}</div>
            <div style="font-size:.85rem;color:var(--text-2);font-style:italic;margin-top:6px;line-height:1.6;">${esc(d.teks)}</div>
          </div>`).join('')}
      </div>`;

    const i = this.dzikirIdx;
    const d = this.DZIKIR[i];
    const hitung = () => {
      c[i] = (c[i] || 0) + 1;
      if (navigator.vibrate) navigator.vibrate(15);
      if (c[i] === d.target) { beep(880, 0.15, 2); toast(tr(`${d.tr} ${d.target}× selesai ✨`, `${d.tr} ${d.target}× complete ✨`)); }
      else beep(1200, 0.04, 1);
      this.renderDzikir(el);
    };

    $('#tasbihTap', el).onclick = hitung;
    $('#tasbihReset', el).onclick = () => { c[i] = 0; this.renderDzikir(el); };
    $$('[data-nav]', el).forEach(b => b.onclick = () => { this.dzikirIdx = i + (+b.dataset.nav); this.renderDzikir(el); });
    $$('[data-dot]', el).forEach(dot => dot.onclick = () => { this.dzikirIdx = +dot.dataset.dot; this.renderDzikir(el); });
  },

  /* ============ TAB: ZAKAT ============ */

  zakatMode: 'penghasilan', // 'penghasilan' | 'maal' | 'fitrah'

  async renderZakat(el) {
    const modes = {
      penghasilan: tr('Penghasilan', 'Income'),
      maal: tr('Harta (Maal)', 'Wealth (Maal)'),
      fitrah: tr('Fitrah', 'Fitrah')
    };
    const sedekah = (await DB.list('sedekah')).sort((a, b) => (b.tanggal || '') < (a.tanggal || '') ? -1 : 1);
    const totalSedekah = sedekah.reduce((s, x) => s + (x.jumlah || 0), 0);
    const bulanSedekah = sedekah.filter(x => (x.tanggal || '').startsWith(monthStr())).reduce((s, x) => s + (x.jumlah || 0), 0);

    el.innerHTML = `
      <div class="section-head"><h2>🧮 ${tr('Kalkulator Zakat', 'Zakat Calculator')}</h2></div>
      <div class="chip-row" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        ${Object.entries(modes).map(([k, v]) => `<button class="chip ${this.zakatMode === k ? 'active' : ''}" data-zmode="${k}">${v}</button>`).join('')}
      </div>
      <div id="zakatBody"></div>

      <div class="section-head" style="margin-top:24px;">
        <h2>🤲 ${tr('Catatan Sedekah', 'Charity Log')}</h2>
        <button class="btn btn-sm btn-fin" id="addSedekah"><ion-icon name="add"></ion-icon> ${tr('Sedekah', 'Charity')}</button>
      </div>
      <div class="grid grid-2 keep-2" style="margin-bottom:14px;">
        <div class="card money-stat"><div class="ms-label">${tr('Total sedekah', 'Total charity')}</div><div class="ms-value tx-amount-in">${fmtRp(totalSedekah)}</div></div>
        <div class="card money-stat"><div class="ms-label">${tr('Bulan ini', 'This month')}</div><div class="ms-value">${fmtRp(bulanSedekah)}</div></div>
      </div>
      ${sedekah.length ? `<div style="display:flex;flex-direction:column;gap:9px;">
        ${sedekah.slice(0, 15).map(s => `<div class="list-item">
          <div class="item-icon" style="background:var(--brand-soft);color:var(--brand);">🤲</div>
          <div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:.88rem;">${esc(s.tujuan || tr('Sedekah', 'Charity'))}</div>
            <div style="font-size:.75rem;color:var(--text-3);">${fmtDate(s.tanggal, { weekday: true })}</div></div>
          <span class="tx-amount-in" style="font-size:.9rem;">${fmtRp(s.jumlah)}</span>
          <button class="mini-icon-btn danger" data-dels="${s.id}"><ion-icon name="trash-outline"></ion-icon></button>
        </div>`).join('')}
      </div>` : `<div style="font-size:.83rem;color:var(--text-3);text-align:center;padding:10px;">${tr('Belum ada catatan sedekah — mulai menabung kebaikan 🌱', 'No charity logged yet — start saving good deeds 🌱')}</div>`}`;

    $$('[data-zmode]', el).forEach(b => b.onclick = () => { this.zakatMode = b.dataset.zmode; this.renderZakat(el); });
    const body = $('#zakatBody', el);
    if (this.zakatMode === 'penghasilan') this._zakatPenghasilan(body);
    else if (this.zakatMode === 'maal') this._zakatMaal(body);
    else this._zakatFitrah(body);

    $('#addSedekah', el).onclick = () => {
      openModal({
        title: tr('Catat Sedekah', 'Log Charity'),
        body: `
          <div class="field"><label>${tr('Jumlah', 'Amount')}</label><div class="input-group"><input type="number" class="input" id="mJml" min="0" placeholder="10000"><span class="input-unit">Rp</span></div></div>
          <div class="field"><label>${tr('Untuk / keterangan', 'For / note')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mTuj" placeholder="${tr('mis. kotak amal masjid', 'e.g. mosque donation box')}"></div>
          <div class="field"><label>${tr('Tanggal', 'Date')}</label><input type="date" class="input" id="mTgl" value="${todayStr()}"></div>
          <button class="btn btn-fin btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
        onMount: m => { $('#mSave', m).onclick = async () => {
          const jumlah = +$('#mJml', m).value;
          if (!jumlah || jumlah <= 0) return toast(tr('Masukkan jumlah.', 'Enter an amount.'), 'warning');
          await DB.add('sedekah', { jumlah, tujuan: $('#mTuj', m).value.trim(), tanggal: $('#mTgl', m).value || todayStr() });
          closeModal(); toast(tr('Barakallah, tercatat 🤲', 'Barakallah, logged 🤲')); App.refresh();
        }; }
      });
    };
    $$('[data-dels]', el).forEach(b => b.onclick = async () => {
      await DB.remove('sedekah', b.dataset.dels);
      toast(tr('Dihapus.', 'Deleted.')); App.refresh();
    });
  },

  _zakatPenghasilan(el) {
    el.innerHTML = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title"><ion-icon name="cash-outline" style="color:var(--fin)"></ion-icon>${tr('Zakat Penghasilan', 'Income Zakat')}</div>
          <div class="field" style="margin-top:12px;">
            <label>${tr('Penghasilan per bulan', 'Monthly income')}</label>
            <div class="input-group"><input type="number" class="input" id="zPeng" min="0" placeholder="4000000"><span class="input-unit">Rp</span></div>
          </div>
          <div class="field">
            <label>${tr('Penghasilan tambahan / bonus', 'Extra income / bonus')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
            <div class="input-group"><input type="number" class="input" id="zBonus" min="0" placeholder="0"><span class="input-unit">Rp</span></div>
          </div>
          <div class="field">
            <label>${tr('Harga emas per gram (untuk nisab)', 'Gold price per gram (for nisab)')}</label>
            <div class="input-group"><input type="number" class="input" id="zEmas" min="0" value="1300000"><span class="input-unit">Rp</span></div>
          </div>
          <button class="btn btn-fin btn-block" id="zHitung"><ion-icon name="calculator"></ion-icon> ${tr('Hitung Zakat', 'Calculate Zakat')}</button>
        </div>
        <div class="card" id="zResult">
          <div class="empty-state" style="padding:30px 10px;">
            <ion-icon name="calculator-outline"></ion-icon>
            <div class="es-title">${tr('Hasil zakat muncul di sini', 'Zakat result appears here')}</div>
            <div class="es-sub">${tr('Isi data lalu tekan Hitung', 'Fill the form then press Calculate')}</div>
          </div>
        </div>
      </div>
      <div class="disclaimer" style="margin-top:16px;"><ion-icon name="information-circle"></ion-icon><span>${tr('Nisab zakat penghasilan setara 85 gram emas per tahun. Bila penghasilan setahun mencapai nisab, zakatnya 2,5%. Perhitungan ini perkiraan — untuk keputusan final, rujuk lembaga amil zakat resmi (mis. BAZNAS).', 'The income zakat nisab equals 85 g of gold per year. If annual income reaches nisab, zakat is 2.5%. This is an estimate — for final decisions, consult an official zakat body.')}</span></div>`;

    $('#zHitung', el).onclick = () => {
      const peng = +$('#zPeng', el).value || 0;
      const bonus = +$('#zBonus', el).value || 0;
      const emas = +$('#zEmas', el).value || 0;
      const bulanan = peng + bonus;
      const setahun = bulanan * 12;
      const nisabTahun = 85 * emas;
      const wajib = setahun >= nisabTahun;
      const zakatBulan = wajib ? Math.round(bulanan * 0.025) : 0;
      $('#zResult', el).innerHTML = `
        <div class="card-title"><ion-icon name="receipt-outline" style="color:var(--fin)"></ion-icon>${tr('Hasil Perhitungan', 'Calculation Result')}</div>
        <div style="margin-top:14px;font-size:.86rem;line-height:2;">
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-3);">${tr('Penghasilan/bulan', 'Income/month')}</span><b>${fmtRp(bulanan)}</b></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-3);">${tr('Penghasilan/tahun', 'Income/year')}</span><b>${fmtRp(setahun)}</b></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-3);">${tr('Nisab/tahun (85gr emas)', 'Nisab/year (85g gold)')}</span><b>${fmtRp(nisabTahun)}</b></div>
        </div>
        <div style="text-align:center;margin-top:16px;padding:16px;border-radius:14px;background:${wajib ? 'var(--fin-soft)' : 'var(--surface-2)'};">
          ${wajib ? `
            <div style="font-size:.8rem;color:var(--text-3);font-weight:600;">${tr('Zakat penghasilanmu per bulan', 'Your monthly income zakat')}</div>
            <div style="font-size:1.8rem;font-weight:800;color:var(--fin);margin-top:4px;">${fmtRp(zakatBulan)}</div>
            <div style="font-size:.78rem;color:var(--text-3);margin-top:4px;">2,5% × ${fmtRp(bulanan)}</div>` : `
            <div style="font-size:.9rem;font-weight:700;color:var(--text-2);">${tr('Belum wajib zakat penghasilan', 'Income zakat not yet obligatory')}</div>
            <div style="font-size:.8rem;color:var(--text-3);margin-top:4px;">${tr('Penghasilan tahunanmu belum mencapai nisab. Tetap dianjurkan bersedekah 🤲', 'Your annual income has not reached nisab. Charity is still encouraged 🤲')}</div>`}
        </div>`;
    };
  },

  _zakatMaal(el) {
    el.innerHTML = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title"><ion-icon name="wallet" style="color:var(--fin)"></ion-icon>${tr('Zakat Maal (Harta)', 'Maal Zakat (Wealth)')}</div>
          <div class="field" style="margin-top:12px;">
            <label>${tr('Total tabungan & uang tunai', 'Total savings & cash')}</label>
            <div class="input-group"><input type="number" class="input" id="mTab" min="0" placeholder="0"><span class="input-unit">Rp</span></div>
          </div>
          <div class="field">
            <label>${tr('Nilai emas/perak & investasi', 'Gold/silver & investments value')}</label>
            <div class="input-group"><input type="number" class="input" id="mEmasInv" min="0" placeholder="0"><span class="input-unit">Rp</span></div>
          </div>
          <div class="field">
            <label>${tr('Utang yang harus dibayar', 'Debts to pay')} <span style="font-weight:500;color:var(--text-3)">${tr('(pengurang)', '(deduction)')}</span></label>
            <div class="input-group"><input type="number" class="input" id="mUtang" min="0" placeholder="0"><span class="input-unit">Rp</span></div>
          </div>
          <div class="field">
            <label>${tr('Harga emas per gram', 'Gold price per gram')}</label>
            <div class="input-group"><input type="number" class="input" id="mHarga" min="0" value="1300000"><span class="input-unit">Rp</span></div>
          </div>
          <button class="btn btn-fin btn-block" id="mHitung"><ion-icon name="calculator"></ion-icon> ${tr('Hitung Zakat', 'Calculate Zakat')}</button>
        </div>
        <div class="card" id="mResult">
          <div class="empty-state" style="padding:30px 10px;">
            <ion-icon name="calculator-outline"></ion-icon>
            <div class="es-title">${tr('Hasil zakat muncul di sini', 'Zakat result appears here')}</div>
          </div>
        </div>
      </div>
      <div class="disclaimer" style="margin-top:16px;"><ion-icon name="information-circle"></ion-icon><span>${tr('Zakat maal wajib bila harta bersih (setelah dikurangi utang) mencapai nisab (85 gram emas) dan telah dimiliki 1 tahun (haul). Besar zakat 2,5%.', 'Maal zakat is due when net wealth (after debts) reaches nisab (85 g gold) held for one year (haul). The rate is 2.5%.')}</span></div>`;

    $('#mHitung', el).onclick = () => {
      const tab = +$('#mTab', el).value || 0;
      const inv = +$('#mEmasInv', el).value || 0;
      const utang = +$('#mUtang', el).value || 0;
      const harga = +$('#mHarga', el).value || 0;
      const bersih = tab + inv - utang;
      const nisab = 85 * harga;
      const wajib = bersih >= nisab;
      const zakat = wajib ? Math.round(bersih * 0.025) : 0;
      $('#mResult', el).innerHTML = `
        <div class="card-title"><ion-icon name="receipt-outline" style="color:var(--fin)"></ion-icon>${tr('Hasil Perhitungan', 'Calculation Result')}</div>
        <div style="margin-top:14px;font-size:.86rem;line-height:2;">
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-3);">${tr('Harta bersih', 'Net wealth')}</span><b>${fmtRp(bersih)}</b></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-3);">${tr('Nisab (85gr emas)', 'Nisab (85g gold)')}</span><b>${fmtRp(nisab)}</b></div>
        </div>
        <div style="text-align:center;margin-top:16px;padding:16px;border-radius:14px;background:${wajib ? 'var(--fin-soft)' : 'var(--surface-2)'};">
          ${wajib ? `
            <div style="font-size:.8rem;color:var(--text-3);font-weight:600;">${tr('Zakat maal yang harus dikeluarkan', 'Maal zakat due')}</div>
            <div style="font-size:1.8rem;font-weight:800;color:var(--fin);margin-top:4px;">${fmtRp(zakat)}</div>
            <div style="font-size:.78rem;color:var(--text-3);margin-top:4px;">2,5% × ${fmtRp(bersih)}</div>` : `
            <div style="font-size:.9rem;font-weight:700;color:var(--text-2);">${tr('Belum mencapai nisab', 'Below nisab')}</div>
            <div style="font-size:.8rem;color:var(--text-3);margin-top:4px;">${tr('Hartamu belum wajib dizakati maal.', 'Your wealth is not yet subject to maal zakat.')}</div>`}
        </div>`;
    };
  },

  _zakatFitrah(el) {
    el.innerHTML = `
      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title"><ion-icon name="restaurant" style="color:var(--fin)"></ion-icon>${tr('Zakat Fitrah', 'Fitrah Zakat')}</div>
          <div class="field" style="margin-top:12px;">
            <label>${tr('Jumlah jiwa (anggota keluarga)', 'Number of people (family members)')}</label>
            <input type="number" class="input" id="fJiwa" min="1" value="1">
          </div>
          <div class="field">
            <label>${tr('Harga beras per kg', 'Rice price per kg')}</label>
            <div class="input-group"><input type="number" class="input" id="fBeras" min="0" value="15000"><span class="input-unit">Rp</span></div>
          </div>
          <div class="field">
            <label>${tr('Takaran per jiwa', 'Amount per person')}</label>
            <select class="select" id="fTakaran">
              <option value="2.5">2,5 kg ${tr('(umum di Indonesia)', '(common in Indonesia)')}</option>
              <option value="3">3,0 kg ${tr('(kehati-hatian)', '(precaution)')}</option>
            </select>
          </div>
          <button class="btn btn-fin btn-block" id="fHitung"><ion-icon name="calculator"></ion-icon> ${tr('Hitung Zakat', 'Calculate Zakat')}</button>
        </div>
        <div class="card" id="fResult">
          <div class="empty-state" style="padding:30px 10px;">
            <ion-icon name="calculator-outline"></ion-icon>
            <div class="es-title">${tr('Hasil zakat muncul di sini', 'Zakat result appears here')}</div>
          </div>
        </div>
      </div>
      <div class="disclaimer" style="margin-top:16px;"><ion-icon name="information-circle"></ion-icon><span>${tr('Zakat fitrah wajib bagi setiap jiwa Muslim menjelang Idul Fitri, sebesar ±2,5 kg (1 sha\') makanan pokok atau nilai uangnya.', 'Fitrah zakat is due for every Muslim before Eid al-Fitr, ±2.5 kg (1 sha\') of staple food or its cash value.')}</span></div>`;

    $('#fHitung', el).onclick = () => {
      const jiwa = +$('#fJiwa', el).value || 1;
      const beras = +$('#fBeras', el).value || 0;
      const takaran = +$('#fTakaran', el).value || 2.5;
      const totalKg = jiwa * takaran;
      const totalRp = Math.round(totalKg * beras);
      $('#fResult', el).innerHTML = `
        <div class="card-title"><ion-icon name="receipt-outline" style="color:var(--fin)"></ion-icon>${tr('Hasil Perhitungan', 'Calculation Result')}</div>
        <div style="margin-top:14px;font-size:.86rem;line-height:2;">
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-3);">${tr('Total beras', 'Total rice')}</span><b>${totalKg.toLocaleString('id-ID')} kg</b></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-3);">${tr('Untuk', 'For')}</span><b>${jiwa} ${tr('jiwa', 'people')}</b></div>
        </div>
        <div style="text-align:center;margin-top:16px;padding:16px;border-radius:14px;background:var(--fin-soft);">
          <div style="font-size:.8rem;color:var(--text-3);font-weight:600;">${tr('Total zakat fitrah (uang)', 'Total fitrah zakat (cash)')}</div>
          <div style="font-size:1.8rem;font-weight:800;color:var(--fin);margin-top:4px;">${fmtRp(totalRp)}</div>
          <div style="font-size:.78rem;color:var(--text-3);margin-top:4px;">${totalKg} kg × ${fmtRp(beras)}</div>
        </div>`;
    };
  },

  /* ============ TAB: CATATAN IBADAH ============ */

  async renderNotes(el) {
    const notes = (await DB.list('ibadah_notes')).sort((a, b) => (b.diubah || '') < (a.diubah || '') ? -1 : 1);
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="font-size:.88rem;color:var(--text-3);font-weight:600;">${tr('Catatan penemuan makna, evaluasi diri & muhasabah 📝', 'Notes of meaning, self-evaluation & reflection 📝')}</div>
        <button class="btn btn-primary btn-sm" id="addNote"><ion-icon name="add"></ion-icon> ${tr('Catatan', 'Note')}</button>
      </div>
      ${notes.length ? `
        <div class="grid grid-3">
          ${notes.map(n => `
            <div class="card note-card hoverable" data-open="${n.id}">
              <div style="font-weight:800;font-size:.95rem;">${esc(n.judul) || `<i>${tr('Tanpa judul', 'Untitled')}</i>`}</div>
              <div class="nc-body">${esc(n.isi)}</div>
              <div class="nc-date">${tr('Diubah', 'Edited')} ${fmtDate((n.diubah || '').slice(0, 10), { short: true })}</div>
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="document-text-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada catatan ibadah', 'No worship notes yet')}</div>
          <div class="es-sub">${tr('Tulis makna ayat, hikmah kajian, atau evaluasi ibadahmu ✍️', 'Write verse meanings, lesson insights, or worship self-evaluation ✍️')}</div>
        </div>`}`;

    $('#addNote', el).onclick = () => this._noteModal();
    $$('[data-open]', el).forEach(c => c.onclick = () => this._noteModal(notes.find(n => n.id === c.dataset.open)));
  },

  _noteModal(note = null) {
    openModal({
      title: note ? tr('Ubah Catatan', 'Edit Note') : tr('Catatan Ibadah Baru', 'New Worship Note'),
      body: `
        <div class="field">
          <label>${tr('Judul', 'Title')}</label>
          <input type="text" class="input" id="mJudul" placeholder="${tr('mis. Makna Surat Al-Ashr', 'e.g. Meaning of Surah Al-Asr')}" value="${esc(note?.judul || '')}">
        </div>
        <div class="field">
          <label>${tr('Isi catatan', 'Content')}</label>
          <textarea class="textarea" id="mIsi" placeholder="${tr('Tulis di sini…', 'Write here…')}">${esc(note?.isi || '')}</textarea>
        </div>
        <div style="display:flex;gap:10px;">
          ${note ? '<button class="btn btn-soft-danger" id="mDel"><ion-icon name="trash-outline"></ion-icon></button>' : ''}
          <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>
        </div>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const judul = $('#mJudul', m).value.trim();
          const isi = $('#mIsi', m).value.trim();
          if (!judul && !isi) return toast(tr('Catatan masih kosong.', 'Note is empty.'), 'warning');
          const data = { judul, isi, diubah: new Date().toISOString() };
          if (note) await DB.update('ibadah_notes', note.id, data);
          else await DB.add('ibadah_notes', { ...data, dibuat: new Date().toISOString() });
          closeModal();
          toast(tr('Catatan tersimpan ✍️', 'Note saved ✍️'));
          App.refresh();
        };
        const del = $('#mDel', m);
        if (del) del.onclick = async () => {
          if (!await confirmDialog(tr('Hapus catatan ini?', 'Delete this note?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
          await DB.remove('ibadah_notes', note.id);
          toast(tr('Catatan dihapus.', 'Note deleted.'));
          App.refresh();
        };
      }
    });
  }
};


/* Data surat pendek untuk Al-Qur'an Digital (dilampirkan di luar objek agar
   tidak mengganggu pemformat berkas; `this.SURAH` di renderQuran merujuk ke sini). */
Ibadah.SURAH = [
  { no: 1, nama: 'Al-Fatihah', arti_id: 'Pembukaan', arti_en: 'The Opening', ayat: 7, teks: [
    { n: 1, ar: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ', lt: 'Bismillāhir-raḥmānir-raḥīm', id: 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.', en: 'In the name of Allah, the Most Gracious, the Most Merciful.' },
    { n: 2, ar: 'اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَ', lt: 'Al-ḥamdu lillāhi rabbil-ʿālamīn', id: 'Segala puji bagi Allah, Tuhan seluruh alam.', en: 'All praise is due to Allah, Lord of all worlds.' },
    { n: 3, ar: 'الرَّحْمٰنِ الرَّحِيْمِ', lt: 'Ar-raḥmānir-raḥīm', id: 'Yang Maha Pengasih, Maha Penyayang.', en: 'The Most Gracious, the Most Merciful.' },
    { n: 4, ar: 'مٰلِكِ يَوْمِ الدِّيْنِ', lt: 'Māliki yaumid-dīn', id: 'Pemilik hari pembalasan.', en: 'Master of the Day of Judgment.' },
    { n: 5, ar: 'اِيَّاكَ نَعْبُدُ وَاِيَّاكَ نَسْتَعِيْنُ', lt: 'Iyyāka naʿbudu wa iyyāka nastaʿīn', id: 'Hanya kepada-Mu kami menyembah dan hanya kepada-Mu kami mohon pertolongan.', en: 'You alone we worship, and You alone we ask for help.' },
    { n: 6, ar: 'اِهْدِنَا الصِّرَاطَ الْمُسْتَقِيْمَ', lt: 'Ihdinaṣ-ṣirāṭal-mustaqīm', id: 'Tunjukilah kami jalan yang lurus.', en: 'Guide us to the straight path.' },
    { n: 7, ar: 'صِرَاطَ الَّذِيْنَ اَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوْبِ عَلَيْهِمْ وَلَا الضَّاۤلِّيْنَ', lt: 'Ṣirāṭal-lażīna anʿamta ʿalaihim gairil-magḍūbi ʿalaihim wa laḍ-ḍāllīn', id: '(Yaitu) jalan orang-orang yang telah Engkau beri nikmat, bukan (jalan) mereka yang dimurkai, dan bukan (pula) mereka yang sesat.', en: 'The path of those You have blessed, not of those who earned anger, nor of those who went astray.' }
  ] },
  { no: 112, nama: 'Al-Ikhlas', arti_id: 'Ikhlas', arti_en: 'Sincerity', ayat: 4, teks: [
    { n: 1, ar: 'قُلْ هُوَ اللّٰهُ اَحَدٌ', lt: 'Qul huwallāhu aḥad', id: 'Katakanlah, "Dialah Allah, Yang Maha Esa."', en: 'Say, "He is Allah, the One."' },
    { n: 2, ar: 'اَللّٰهُ الصَّمَدُ', lt: 'Allāhuṣ-ṣamad', id: 'Allah tempat meminta segala sesuatu.', en: 'Allah, the Eternal Refuge.' },
    { n: 3, ar: 'لَمْ يَلِدْ وَلَمْ يُوْلَدْ', lt: 'Lam yalid wa lam yūlad', id: '(Allah) tidak beranak dan tidak pula diperanakkan.', en: 'He neither begets nor is born.' },
    { n: 4, ar: 'وَلَمْ يَكُنْ لَّهٗ كُفُوًا اَحَدٌ', lt: 'Wa lam yakul lahū kufuwan aḥad', id: 'Dan tidak ada sesuatu yang setara dengan Dia.', en: 'And there is none comparable to Him.' }
  ] },
  { no: 113, nama: 'Al-Falaq', arti_id: 'Waktu Subuh', arti_en: 'The Daybreak', ayat: 5, teks: [
    { n: 1, ar: 'قُلْ اَعُوْذُ بِرَبِّ الْفَلَقِ', lt: 'Qul aʿūżu birabbil-falaq', id: 'Katakanlah, "Aku berlindung kepada Tuhan yang menguasai subuh (fajar),', en: 'Say, "I seek refuge in the Lord of daybreak,' },
    { n: 2, ar: 'مِنْ شَرِّ مَا خَلَقَ', lt: 'Min syarri mā khalaq', id: 'dari kejahatan (makhluk yang) Dia ciptakan,', en: 'from the evil of what He created,' },
    { n: 3, ar: 'وَمِنْ شَرِّ غَاسِقٍ اِذَا وَقَبَ', lt: 'Wa min syarri gāsiqin iżā waqab', id: 'dan dari kejahatan malam apabila telah gelap gulita,', en: 'and from the evil of darkness when it settles,' },
    { n: 4, ar: 'وَمِنْ شَرِّ النَّفّٰثٰتِ فِى الْعُقَدِ', lt: 'Wa min syarrin-naffāṡāti fil-ʿuqad', id: 'dan dari kejahatan penyihir yang meniup pada buhul-buhul (talinya),', en: 'and from the evil of those who blow on knots,' },
    { n: 5, ar: 'وَمِنْ شَرِّ حَاسِدٍ اِذَا حَسَدَ', lt: 'Wa min syarri ḥāsidin iżā ḥasad', id: 'dan dari kejahatan orang yang dengki apabila dia dengki."', en: 'and from the evil of the envier when he envies."' }
  ] },
  { no: 114, nama: 'An-Nas', arti_id: 'Manusia', arti_en: 'Mankind', ayat: 6, teks: [
    { n: 1, ar: 'قُلْ اَعُوْذُ بِرَبِّ النَّاسِ', lt: 'Qul aʿūżu birabbin-nās', id: 'Katakanlah, "Aku berlindung kepada Tuhan manusia,', en: 'Say, "I seek refuge in the Lord of mankind,' },
    { n: 2, ar: 'مَلِكِ النَّاسِ', lt: 'Malikin-nās', id: 'Raja manusia,', en: 'the Sovereign of mankind,' },
    { n: 3, ar: 'اِلٰهِ النَّاسِ', lt: 'Ilāhin-nās', id: 'sembahan manusia,', en: 'the God of mankind,' },
    { n: 4, ar: 'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', lt: 'Min syarril-waswāsil-khannās', id: 'dari kejahatan (bisikan) setan yang bersembunyi,', en: 'from the evil of the retreating whisperer,' },
    { n: 5, ar: 'الَّذِيْ يُوَسْوِسُ فِيْ صُدُوْرِ النَّاسِ', lt: 'Allażī yuwaswisu fī ṣudūrin-nās', id: 'yang membisikkan (kejahatan) ke dalam dada manusia,', en: 'who whispers in the hearts of mankind,' },
    { n: 6, ar: 'مِنَ الْجِنَّةِ وَالنَّاسِ', lt: 'Minal-jinnati wan-nās', id: 'dari (golongan) jin dan manusia."', en: 'from among jinn and mankind."' }
  ] }
];
