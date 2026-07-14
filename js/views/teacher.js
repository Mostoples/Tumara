/* ============================================================
   TUMARA — Portal Guru
   Tab: Kelas & Siswa · Absensi · Penilaian · Jurnal · Jadwal
   Semua data disimpan di subkoleksi milik guru sendiri
   (classes, students, attendance, grades, journals, schedule).
   ============================================================ */

const Teacher = {
  TABS: ['beranda', 'kelas', 'absensi', 'nilai', 'jurnal', 'jadwal', 'tugaskelas', 'jadwalkelas', 'ibadah', 'kesehatan'],
  _TAB_KEY: 'tumara_guru_tab',
  // Tab aktif dipulihkan dari localStorage agar refresh tidak balik ke tab pertama.
  get tab() {
    const t = localStorage.getItem(this._TAB_KEY);
    return this.TABS.includes(t) ? t : 'beranda';
  },
  set tab(v) {
    if (this.TABS.includes(v)) localStorage.setItem(this._TAB_KEY, v);
  },
  classId: null,          // kelas aktif (absensi/nilai/jurnal)
  attDate: todayStr(),
  attPertemuan: 1,
  healthDate: todayStr(),
  aturMenu: false,        // beranda: mode susun ulang tile menu (drag & drop)
  _el: null,

  ABSEN: [
    { k: 'H', id: 'Hadir',  en: 'Present' },
    { k: 'S', id: 'Sakit',  en: 'Sick' },
    { k: 'I', id: 'Izin',   en: 'Excused' },
    { k: 'A', id: 'Alfa',   en: 'Absent' },
    { k: 'D', id: 'Dispen', en: 'Dispensation' }
  ],

  FARDHU: [
    { key: 'subuh',   id: 'Subuh',   en: 'Fajr',    emoji: '🌅' },
    { key: 'dzuhur',  id: 'Dzuhur',  en: 'Dhuhr',   emoji: '☀️' },
    { key: 'ashar',   id: 'Ashar',   en: 'Asr',     emoji: '🌤️' },
    { key: 'maghrib', id: 'Maghrib', en: 'Maghrib', emoji: '🌇' },
    { key: 'isya',    id: 'Isya',    en: 'Isha',    emoji: '🌙' }
  ],

  async render(el) {
    this._el = el || this._el;
    el = this._el;

    // Setiap BERPINDAH tab, pilihan kelas direset agar tab yang gated
    // (absensi/nilai/jurnal/tugaskelas/ibadah/kesehatan) selalu dimulai dari
    // layar "pilih kelas". Render ulang di dalam tab yang sama tidak mereset.
    if (this._lastTab !== this.tab) {
      this._lastTab = this.tab;
      // Kecuali bila perpindahan tab dipicu dari menu di halaman detail kelas
      // (lihat _bindKelasDetail) — kelas itu tetap terpilih di tab tujuan, dan
      // tab itu mendapat tombol "Kembali ke Kelas". Pindah lewat nav biasa
      // menghapus keduanya.
      this.classId = this._keepClassId || null;
      this._fromKelas = this._keepClassId || null;
      this._keepClassId = null;
    }

    // Hentikan polling ibadah/kesehatan jika pindah ke tab lain
    if (this.tab !== 'ibadah' && this._ibadahPollTimer) {
      clearInterval(this._ibadahPollTimer);
      this._ibadahPollTimer = null;
    }
    if (this.tab !== 'kesehatan' && this._healthPollTimer) {
      clearInterval(this._healthPollTimer);
      this._healthPollTimer = null;
    }

    el.innerHTML = `
      <div id="tBody"><div class="portal-loading"><div class="spinner"></div></div></div>`;


    const body = $('#tBody', el);
    if (this.tab === 'beranda') await this.renderBeranda(body);
    else if (this.tab === 'kelas') await this.renderKelas(body);
    else if (this.tab === 'absensi') await this.renderAbsensi(body);
    else if (this.tab === 'nilai') await this.renderNilai(body);
    else if (this.tab === 'jurnal') await this.renderJurnal(body);
    else if (this.tab === 'jadwal') await this.renderJadwal(body);
    else if (this.tab === 'tugaskelas') await this.renderTugasKelas(body);
    else if (this.tab === 'jadwalkelas') await this.renderJadwalKelas(body);
    else if (this.tab === 'kesehatan') await this.renderKesehatan(body);
    else await this.renderIbadah(body);
  },

  // Kelas kini data induk sekolah (school_classes) yang dikelola admin.
  // Guru hanya melihat kelas yang ia pilih untuk diampu (DB.user.kelasAmpu).
  _byOrder(a, b) { return (a.urutan ?? 999999) - (b.urutan ?? 999999) || (a.nama || '').localeCompare(b.nama || ''); },
  async _classes() {
    const ampu = new Set(DB.user?.kelasAmpu || []);
    return (await DB.gList('school_classes')).filter(c => ampu.has(c.id)).sort(this._byOrder);
  },
  // Roster = akun siswa yang SUDAH login (Google) & memilih kelas ini saat
  // onboarding (field kelasId di profil). Data admin (school_roster) hanya acuan.
  async _students(classId) {
    return (await DB.listStudentsByClass(classId))
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  },

  // Avatar siswa/akun: foto profil (fotoUrl/photoURL) bila ada, selain itu inisial.
  // referrerpolicy diperlukan agar foto akun Google tidak diblokir (403).
  _avatarHTML(u) {
    const foto = u.fotoUrl || u.photoURL;
    const inisial = esc((u.nama || u.email || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase());
    const inner = foto ? `<img src="${esc(foto)}" alt="${esc(u.nama || 'Foto profil')}" referrerpolicy="no-referrer">` : inisial;
    return `<span class="avatar avatar-sm${foto ? ' avatar-photo' : ''}">${inner}</span>`;
  },

  /* ============ GERBANG PILIH KELAS ============
     Tab absensi/nilai/jurnal/tugaskelas/ibadah/kesehatan selalu dimulai dari
     layar "pilih kelas" (SMA: tingkat X, XI, XII; tiap tingkat punya abjad
     mis. X-A). Konten baru dirender setelah guru memilih satu kelas. */

  TINGKAT: ['X', 'XI', 'XII'],

  // Ambil tingkat dari nama kelas: "X-A" → X, "XI IPA 2" → XI, "XII-B" → XII.
  // Urutan XII→XI→X penting agar "XII" tidak keburu cocok sebagai "X"/"XI".
  _tingkat(nama) {
    const m = String(nama || '').trim().toUpperCase().match(/^(?:KELAS\s+)?(XII|XI|X)\b/);
    return m ? m[1] : null;
  },

  // Kelompokkan kelas per tingkat; yang namanya tak berpola masuk "Lainnya".
  _groupByTingkat(classes) {
    const groups = [];
    for (const t of this.TINGKAT) {
      const list = classes.filter(c => this._tingkat(c.nama) === t);
      if (list.length) groups.push({ label: `${tr('Kelas', 'Grade')} ${t}`, list });
    }
    const lain = classes.filter(c => !this._tingkat(c.nama));
    if (lain.length) groups.push({ label: tr('Lainnya', 'Others'), list: lain });
    return groups;
  },

  // Grid kartu kelas, dikelompokkan per tingkat. Dipakai gerbang tiap tab.
  _classGrid(classes) {
    return this._groupByTingkat(classes).map(g => `
      <div class="tingkat-head">
        <span class="tingkat-name">${esc(g.label)}</span>
        <span class="tingkat-count">${g.list.length} ${tr('kelas', 'classes')}</span>
      </div>
      <div class="guru-menu-grid" style="margin-bottom:18px;">
        ${g.list.map(c => `
          <button class="guru-tile" data-cls="${c.id}">
            <span class="guru-tile-ic" style="background:var(--brand-soft);color:var(--brand-dark);">
              <ion-icon name="school"></ion-icon>
            </span>
            <span class="guru-tile-lb">${esc(c.nama)}</span>
          </button>`).join('')}
      </div>`).join('');
  },

  // Layar pemilihan kelas (header standar + grid).
  _classGate(classes, judul) {
    return `
      <div class="portal-head" style="margin-bottom:6px;">
        <div>
          <h1 style="font-size:1.2rem;">${tr('Pilih Kelas', 'Select a Class')}</h1>
          <p style="font-size:.85rem;color:var(--text-3);margin-top:2px;">
            ${tr(`Pilih kelas dulu untuk membuka ${judul}.`, `Pick a class first to open ${judul}.`)}
          </p>
        </div>
      </div>

      ${this._classGrid(classes)}`;
  },

  /* Tombol "Kembali ke Kelas" — HANYA muncul bila tab ini dibuka dari menu di
     halaman detail Kelas & Siswa (_fromKelas). Beda peran dengan "Ganti Kelas"
     yang tetap seperti semula: memilih ulang kelas DI DALAM tab ini. Berpindah
     tab lewat nav biasa tidak memunculkan tombol ini. */
  _backKelasBtn() {
    if (!this._fromKelas || this.tab === 'kelas') return '';
    return `
      <button class="btn btn-sm" id="tBackKelas">
        <ion-icon name="chevron-back-outline"></ion-icon> ${tr('Kembali ke Kelas', 'Back to Class')}
      </button>`;
  },

  // Baris tombol kembali berdiri sendiri — untuk tab yang tak punya .class-bar
  // (Jadwal Kelas: kelasnya mengikuti wali, jadi tak ada pilihan kelas).
  _backKelasBar() {
    const btn = this._backKelasBtn();
    return btn ? `<div class="class-bar">${btn}</div>` : '';
  },

  _bindBackKelas(el) {
    const b = $('#tBackKelas', el);
    if (b) b.onclick = () => {
      this._keepClassId = this._fromKelas;   // kembali ke DETAIL kelas itu, bukan gerbang
      this._goto('kelas');
    };
  },

  // Baris "kelas aktif + tombol ganti kelas" di atas konten tiap tab.
  // Nama kelas aktif dicatat di sini karena dipakai juga untuk nama file ekspor CSV.
  _classBar(cls) {
    this._activeClsNama = cls?.nama || '';
    const back = this._backKelasBtn();
    // Tab yang dibuka dari menu di detail Kelas & Siswa sudah membawa kelasnya
    // dari sana, jadi jalan keluarnya cukup "Kembali ke Kelas". "Ganti Kelas"
    // hanya untuk tab yang dimasuki lewat nav — di situ kelas dipilih di
    // gerbang tab ini sendiri, jadi mengulanginya masuk akal.
    const ganti = back ? '' : `
      <button class="btn btn-sm" id="tBackCls">
        <ion-icon name="arrow-back-outline"></ion-icon> ${tr('Ganti Kelas', 'Change Class')}
      </button>`;
    return `
      <div class="class-bar">
        ${back}
        ${ganti}
        <span class="class-bar-name"><ion-icon name="school"></ion-icon> ${esc(cls?.nama || '')}</span>
      </div>`;
  },

  _bindClassGate(el) {
    $$('[data-cls]', el).forEach(b => b.onclick = () => {
      this.classId = b.dataset.cls;
      this.render(this._el);
    });
  },

  _bindClassBar(el) {
    const b = $('#tBackCls', el);
    // Ganti kelas → guru keluar dari konteks kelas asal, tombol "Kembali ke
    // Kelas" ikut hilang agar tak menuntun balik ke kelas yang salah.
    if (b) b.onclick = () => { this.classId = null; this._fromKelas = null; this.render(this._el); };
    this._bindBackKelas(el);
  },

  /* ============ JAM (format Indonesia, 24 jam) ============
     Disimpan & ditampilkan "HH:MM" (mis. 06:00, 21:00) — tanpa AM/PM. */

  _jam(t) {
    const s = String(t || '').trim();
    return /^\d{2}:\d{2}$/.test(s) ? s : '--:--';
  },

  // Rentang jam dengan sekat "-" agar mulai & selesai tidak tertukar dibaca.
  _jamRange(a, b) {
    return `<span class="jam-range"><b>${this._jam(a)}</b><span class="jam-sd">-</span><b>${this._jam(b)}</b></span>`;
  },

  MENIT: ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'],

  /* Jam sekolah: pelajaran paling pagi mulai sekitar 06:00 dan paling sore
     selesai sekitar 15:35, jadi pilihan jam dibatasi 06–17. Daftar 00–23 yang
     lama menawarkan jam malam (mis. 21:00) yang tak pernah dipakai sekolah dan
     hanya membingungkan guru saat mengisi jadwal. */
  JAM_AWAL: 6,
  JAM_AKHIR: 17,

  // Pemilih jam 24-jam. <input type="time"> bawaan Chrome mengikuti locale
  // browser (bisa muncul AM/PM) dan itu TIDAK bisa dipaksa lewat HTML/CSS —
  // atribut lang pun diabaikan. Maka dipakai dua <select> agar pasti 24 jam.
  _jamPicker(id, val, fallback = '07:00') {
    const [h0, m0] = String(val || fallback).split(':');
    const jam = Array.from({ length: this.JAM_AKHIR - this.JAM_AWAL + 1 },
      (_, i) => String(this.JAM_AWAL + i).padStart(2, '0'));
    // Jadwal lama di luar jam sekolah (mis. 21:00) tetap muncul sebagai pilihan
    // agar nilainya tidak berubah diam-diam saat guru sekadar mengubah kelasnya.
    if (h0 && !jam.includes(h0)) { jam.push(h0); jam.sort(); }
    // Nilai menit lama yang tak kelipatan 5 tetap dipertahankan agar tak berubah diam-diam.
    const menit = this.MENIT.includes(m0) ? [...this.MENIT] : [...this.MENIT, m0].sort();
    return `
      <div class="jam-picker">
        <select class="select" id="${id}H" aria-label="${tr('Jam', 'Hour')}">
          ${jam.map(h => `<option value="${h}" ${h === h0 ? 'selected' : ''}>${h}</option>`).join('')}
        </select>
        <span class="jam-sep">:</span>
        <select class="select" id="${id}M" aria-label="${tr('Menit', 'Minute')}">
          ${menit.map(mm => `<option value="${mm}" ${mm === m0 ? 'selected' : ''}>${mm}</option>`).join('')}
        </select>
      </div>`;
  },

  // Baca kembali nilai _jamPicker sebagai "HH:MM" (format simpan).
  _jamValue(id, m) {
    const h = $(`#${id}H`, m)?.value, mm = $(`#${id}M`, m)?.value;
    return h && mm ? `${h}:${mm}` : '';
  },

  // Pindah ke tab lain lewat elemen nav yang sudah ada (agar judul topbar &
  // status aktif nav ikut terperbarui — logikanya di guru.html).
  _goto(route) {
    const nav = document.querySelector(`#guruSidebarNav .nav-link[data-route="${route}"]`);
    if (nav) nav.click();
    else { this.tab = route; this.render(this._el); }
  },

  /* ============ TAB: BERANDA (dashboard) ============
     Ringkasan + menu pintasan ke fitur yang sudah ada. Tidak menambah fitur
     baru; setiap ubin hanya menaut ke tab yang sudah tersedia. */
  async renderBeranda(el) {
    const u = DB.user;
    const classes = await this._classes();
    let totalSiswa = 0;
    for (const c of classes) totalSiswa += (await this._students(c.id)).length;
    const isWali = !!u.waliKelasId;

    const tiles = [
      { route: 'kelas',       icon: 'people-outline',        label: tr('Kelas & Siswa', 'Classes'),        color: 'brand' },
      { route: 'absensi',     icon: 'checkbox-outline',      label: tr('Absensi', 'Attendance'),           color: 'info' },
      { route: 'nilai',       icon: 'clipboard-outline',     label: tr('Penilaian', 'Grades'),             color: 'prod' },
      { route: 'jurnal',      icon: 'document-text-outline', label: tr('Jurnal', 'Journal'),               color: 'fin' },
      { route: 'jadwal',      icon: 'calendar-outline',      label: tr('Jadwal Mengajar', 'My Schedule'),  color: 'info' },
      { route: 'tugaskelas',  icon: 'paper-plane-outline',   label: tr('Tugas Kelas', 'Class Tasks'),      color: 'brand' },
      ...(isWali ? [{ route: 'jadwalkelas', icon: 'school-outline', label: tr('Jadwal Kelas', 'Class Schedule'), color: 'prod' }] : []),
      { route: 'ibadah',      icon: 'moon-outline',          label: tr('Ibadah Siswa', 'Worship'),         color: 'brand' },
      { route: 'kesehatan',   icon: 'heart-outline',         label: tr('Kesehatan Siswa', 'Health'),       color: 'fin' }
    ];

    // Dasbor bisa disusun sendiri tiap guru: urutan hasil geser + tile yang
    // disembunyikan, tersimpan di profil (users/{uid}.guruTiles).
    const pref     = DB.user.guruTiles || {};
    const urutan   = Array.isArray(pref.urutan) ? pref.urutan : [];
    const sembunyi = new Set(Array.isArray(pref.sembunyi) ? pref.sembunyi : []);
    const posisi   = r => { const i = urutan.indexOf(r); return i === -1 ? 999 : i; };
    // Tile baru (belum ada di urutan tersimpan) jatuh ke belakang, tapi tetap muncul.
    const tilesUrut = [...tiles].sort((a, b) => posisi(a.route) - posisi(b.route));
    // Mode atur menampilkan semua tile (yang tersembunyi tampak redup) agar bisa dimunculkan lagi.
    const tilesTampil = this.aturMenu ? tilesUrut : tilesUrut.filter(t => !sembunyi.has(t.route));

    el.innerHTML = `
      <div class="guru-hero">
        <div class="guru-hero-user">
          <div class="guru-hero-avatar">${this._avatarHTML(u)}</div>
          <div style="min-width:0;flex:1;">
            <div class="guru-hero-name">${esc(u.nama)}</div>
            <div class="guru-hero-sub">${esc(u.mapel || u.sekolah || u.email)}</div>
          </div>
          <span class="guru-hero-badge">${isWali ? `<ion-icon name="ribbon"></ion-icon> ${tr('Wali Kelas', 'Homeroom')}` : `<ion-icon name="school"></ion-icon> ${tr('Guru', 'Teacher')}`}</span>
        </div>
      </div>

      <div class="guru-stat-card">
        <div class="guru-stat"><div class="guru-stat-ic" style="color:var(--info);background:var(--info-soft);"><ion-icon name="people"></ion-icon></div><div class="guru-stat-num">${totalSiswa}</div><div class="guru-stat-lb">${tr('Siswa', 'Students')}</div></div>
        <div class="guru-stat"><div class="guru-stat-ic" style="color:var(--prod);background:var(--prod-soft);"><ion-icon name="book"></ion-icon></div><div class="guru-stat-num" title="${esc(u.mapel || '')}">${esc(u.mapel || '—')}</div><div class="guru-stat-lb">${tr('Mapel', 'Subject')}</div></div>
        <div class="guru-stat"><div class="guru-stat-ic" style="color:var(--brand);background:var(--brand-soft);"><ion-icon name="albums"></ion-icon></div><div class="guru-stat-num">${classes.length}</div><div class="guru-stat-lb">${tr('Kelas', 'Classes')}</div></div>
      </div>

      <div class="section-head" style="margin-top:24px;">
        <h2>${tr('Menu', 'Menu')}</h2>
        <div style="display:flex;gap:6px;">
          ${this.aturMenu ? `<button class="btn btn-sm" id="resetMenu"><ion-icon name="refresh-outline"></ion-icon> ${tr('Reset', 'Reset')}</button>` : ''}
          <button class="btn btn-sm ${this.aturMenu ? 'btn-primary' : ''}" id="aturMenu">
            <ion-icon name="${this.aturMenu ? 'checkmark' : 'options-outline'}"></ion-icon> ${this.aturMenu ? tr('Selesai', 'Done') : tr('Atur', 'Arrange')}
          </button>
        </div>
      </div>
      ${this.aturMenu ? `<div class="ts-note"><ion-icon name="move-outline" style="vertical-align:-2px;"></ion-icon> ${tr('Geser tile untuk menyusun ulang. Ketuk mata untuk menyembunyikan.', 'Drag tiles to reorder. Tap the eye to hide.')}</div>` : ''}
      <div class="guru-menu-grid ${this.aturMenu ? 'sort-on' : ''}" id="menuGrid">
        ${tilesTampil.map(t => `
          <button class="guru-tile ${this.aturMenu ? 'guru-tile-atur' : ''} ${sembunyi.has(t.route) ? 'guru-tile-off' : ''}"
                  data-route="${t.route}" ${this.aturMenu ? '' : `data-goto="${t.route}"`}>
            ${this.aturMenu ? `<span class="guru-tile-eye" data-hide="${t.route}"><ion-icon name="${sembunyi.has(t.route) ? 'eye-off-outline' : 'eye-outline'}"></ion-icon></span>` : ''}
            <span class="guru-tile-ic" style="color:var(--${t.color});background:var(--${t.color}-soft);"><ion-icon name="${t.icon}"></ion-icon></span>
            <span class="guru-tile-lb">${t.label}</span>
          </button>`).join('')}
      </div>`;

    $$('[data-goto]', el).forEach(b => b.onclick = () => this._goto(b.dataset.goto));

    $('#aturMenu', el).onclick = () => { this.aturMenu = !this.aturMenu; this.render(this._el); };

    $('#resetMenu', el) && ($('#resetMenu', el).onclick = async () => {
      await this._simpanMenu({ urutan: [], sembunyi: [] });
      toast(tr('Menu dikembalikan ke susunan awal.', 'Menu restored to its default layout.'));
      this.render(this._el);
    });

    // Sembunyikan/munculkan tile. Urutan saat ini ikut disimpan supaya hasil
    // geser yang belum sempat tersimpan tidak hilang saat menekan mata.
    $$('[data-hide]', el).forEach(b => b.onclick = async () => {
      const route = b.dataset.hide;
      const baru = new Set(sembunyi);
      baru.has(route) ? baru.delete(route) : baru.add(route);
      await this._simpanMenu({ urutan: this._urutanMenu(el), sembunyi: [...baru] });
      this.render(this._el);
    });

    makeSortable($('#menuGrid', el), {
      itemSelector: '.guru-tile',
      key: 'route',
      ignore: '[data-hide]',
      onEnd: urutanBaru => this._simpanMenu({ urutan: urutanBaru, sembunyi: [...sembunyi] })
    });
  },

  _urutanMenu(el) {
    return $$('#menuGrid .guru-tile', el).map(t => t.dataset.route);
  },

  async _simpanMenu(pref) {
    try {
      await DB.updateUser({ guruTiles: pref });
    } catch (e) {
      toast(tr('Gagal menyimpan susunan menu.', 'Failed to save the menu layout.'), 'error');
    }
  },

  /* ============ TAB: KELAS & SISWA ============ */

  /* Dua tampilan (fiturnya sama, hanya penyajiannya berbeda):
     • HP/tablet kecil → gerbang kartu kelas; menekan satu kelas membuka
       HALAMAN DETAIL kelas itu (ringkasan jumlah siswa + menu + daftar siswa).
     • Desktop (≥900px) → master–detail: daftar kelas di kolom kiri dan detail
       kelas langsung terbuka di kanan, jadi tak perlu menekan tombol dulu. */
  _KELAS_DESKTOP_Q: '(min-width: 900px)',
  _isKelasDesktop() { return window.matchMedia(this._KELAS_DESKTOP_Q).matches; },

  // Render ulang tab Kelas bila layar melintasi ambang desktop/HP (mis. rotasi
  // iPad), agar tampilannya selalu cocok dengan lebar layar. Dipasang sekali.
  _watchKelasLayout() {
    if (this._kelasMQ) return;
    this._kelasMQ = window.matchMedia(this._KELAS_DESKTOP_Q);
    this._kelasMQ.addEventListener('change', () => {
      if (this.tab === 'kelas' && this._el) this.render(this._el);
    });
  },

  // Menu di halaman detail kelas. SEMUA menautkan ke tab/fitur yang sudah ada
  // (tidak menambah fitur baru) dengan kelas ini otomatis terpilih di sana.
  _kelasMenu(classId) {
    const wali = DB.user?.waliKelasId === classId;
    return [
      {
        group: tr('Menu', 'Menu'),
        items: [
          { route: 'absensi',    icon: 'checkbox-outline',      label: tr('Catat Absensi', 'Take Attendance'),        color: 'info' },
          { route: 'nilai',      icon: 'clipboard-outline',     label: tr('Buat Penilaian', 'Add Grades'),            color: 'prod' },
          { route: 'jurnal',     icon: 'document-text-outline', label: tr('Buat Jurnal', 'Write Journal'),            color: 'fin' },
          { route: 'tugaskelas', icon: 'paper-plane-outline',   label: tr('Kirim Tugas Kelas', 'Send Class Task'),    color: 'brand' },
          // Jadwal kelas hanya untuk wali kelas INI (sama seperti tab Jadwal Kelas).
          ...(wali ? [{ route: 'jadwalkelas', icon: 'school-outline', label: tr('Atur Jadwal Kelas', 'Set Class Schedule'), color: 'prod' }] : [])
        ]
      },
      {
        group: tr('Pemantauan', 'Monitoring'),
        items: [
          { route: 'ibadah',    icon: 'moon-outline',  label: tr('Ibadah Siswa', 'Student Worship'), color: 'brand' },
          { route: 'kesehatan', icon: 'heart-outline', label: tr('Kesehatan Siswa', 'Student Health'), color: 'fin' }
        ]
      }
    ];
  },

  // Isi halaman detail kelas: ringkasan → menu → daftar siswa.
  // Jumlah siswa mengikuti roster nyata (siswa yang sudah login & memilih kelas ini).
  _kelasDetail(cls, students) {
    return `
      <div class="kelas-hero">
        <div class="kelas-hero-ic"><ion-icon name="people-outline"></ion-icon></div>
        <div class="kelas-hero-body">
          <div class="kelas-hero-nama">${esc(cls.nama)}</div>
          <div class="kelas-hero-count">${students.length} ${tr('Siswa', 'Students')}</div>
        </div>
      </div>

      ${this._kelasMenu(cls.id).map(g => `
        <div class="kelas-sec">${esc(g.group)}</div>
        <div class="kmenu-list">
          ${g.items.map(i => `
            <button class="kmenu-row" data-kmenu="${i.route}">
              <span class="kmenu-ic" style="color:var(--${i.color});background:var(--${i.color}-soft);">
                <ion-icon name="${i.icon}"></ion-icon>
              </span>
              <span class="kmenu-lb">${i.label}</span>
              <ion-icon name="chevron-forward-outline" class="kmenu-go"></ion-icon>
            </button>`).join('')}
        </div>`).join('')}

      <div class="kelas-sec">
        ${tr('Siswa', 'Students')} <span class="kelas-sec-count">${students.length}</span>
      </div>
      ${students.length ? `
        <div class="siswa-list">
          ${students.map((s, i) => `
            <div class="siswa-row">
              <span class="siswa-no">${i + 1}</span>
              ${this._avatarHTML(s)}
              <span class="siswa-info">
                <b>${esc(s.nama)}</b>
                <span class="siswa-nis">NIS ${esc(s.nis || '-')}</span>
              </span>
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state" style="padding:24px 10px;">
          <ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada siswa yang bergabung', 'No students have joined yet')}</div>
          <div class="es-sub">${tr('Siswa akan muncul otomatis setelah login dengan Google & memilih kelas ini beserta NIS-nya.', 'Students appear automatically after they sign in with Google & pick this class with their NIS.')}</div>
        </div>`}`;
  },

  // Menu detail kelas → buka tab tujuan dengan kelas ini tetap terpilih
  // (tanpa harus memilih kelas lagi di gerbang tab tersebut).
  _bindKelasDetail(el) {
    $$('[data-kmenu]', el).forEach(b => b.onclick = () => {
      this._keepClassId = this.classId;
      this._goto(b.dataset.kmenu);
    });
  },

  // Guru memilih kelas yang diampu dari daftar kelas induk (school_classes)
  // yang dibuat admin. Pilihan disimpan di DB.user.kelasAmpu. Roster (nama+NIS)
  // ditampilkan read-only; pendataan siswa dilakukan admin.
  async renderKelas(el) {
    this._watchKelasLayout();
    let allClasses = [];
    try {
      allClasses = (await DB.gList('school_classes')).sort(this._byOrder);
    } catch (e) {
      el.innerHTML = `<div class="card empty-state">
        <ion-icon name="alert-circle-outline"></ion-icon>
        <div class="es-title">${tr('Gagal memuat daftar kelas', 'Failed to load classes')}</div>
        <div class="es-sub">${esc(e.message || '')}</div>
      </div>`;
      return;
    }

    const ampu = new Set(DB.user?.kelasAmpu || []);
    const taught = allClasses.filter(c => ampu.has(c.id));

    const head = `
      <div class="portal-head" style="margin-bottom:16px;">
        <div>
          <h1 style="font-size:1.2rem;">${tr('Kelas yang Kamu Ampu', 'Your Classes')}</h1>
          <p style="font-size:.85rem;color:var(--text-3);margin-top:2px;">${tr('Pilih kelas untuk melihat daftar siswanya. Daftar kelas & siswa dikelola admin.', 'Pick a class to see its students. Classes & students are managed by the admin.')}</p>
        </div>
        <button class="btn btn-primary btn-sm" id="pickKelas"><ion-icon name="add"></ion-icon> ${tr('Tambah Kelas', 'Add Class')}</button>
      </div>`;

    // Belum ada kelas yang diampu → kondisi kosong (tombol "Tambah Kelas" tetap ada).
    if (!taught.length) {
      el.innerHTML = head + (allClasses.length ? `
        <div class="card empty-state">
          <ion-icon name="albums-outline"></ion-icon>
          <div class="es-title">${tr('Belum memilih kelas', 'No classes selected')}</div>
          <div class="es-sub">${tr('Tekan "Tambah Kelas" untuk memilih kelas yang kamu ampu.', 'Press "Add Class" to pick the classes you teach.')}</div>
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="school-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada kelas', 'No classes yet')}</div>
          <div class="es-sub">${tr('Admin belum membuat kelas. Hubungi admin sekolah.', 'The admin has not created any classes yet. Contact your school admin.')}</div>
        </div>`);
      $('#pickKelas', el).onclick = () => this._pickKelasModal(allClasses);
      return;
    }

    if (this.classId && !taught.find(c => c.id === this.classId)) this.classId = null;

    const desktop = this._isKelasDesktop();

    // Gerbang "pilih kelas" (dikelompokkan per tingkat X/XI/XII) — berlaku di
    // SEMUA lebar layar. Detail kelas baru dibuka setelah guru memilih; tidak
    // ada kelas yang terpilih otomatis, agar tak salah kelas tanpa sadar.
    if (!this.classId) {
      el.innerHTML = head + this._classGrid(taught);
      $('#pickKelas', el).onclick = () => this._pickKelasModal(allClasses);
      this._bindClassGate(el);
      return;
    }

    // Kelas terpilih → halaman detail kelas.
    const active = taught.find(c => c.id === this.classId);
    const students = await this._students(active.id);

    // Desktop: master–detail. Kolom kiri untuk lompat antar kelas yang diampu,
    // baris atas untuk kembali ke gerbang pilih kelas.
    if (desktop) {
      el.innerHTML = this._classBar(active) + `
        <div class="kelas-split">
          <aside class="kelas-aside">
            <div class="kelas-sec" style="margin-top:0;">${tr('Kelas', 'Classes')}</div>
            <div class="kelas-aside-list">
              ${taught.map(c => `
                <button class="kelas-aside-item${c.id === active.id ? ' active' : ''}" data-cls="${c.id}">
                  <ion-icon name="school"></ion-icon>
                  <span>${esc(c.nama)}</span>
                </button>`).join('')}
            </div>
          </aside>
          <div class="kelas-detail">${this._kelasDetail(active, students)}</div>
        </div>`;
      this._bindClassBar(el);       // "Ganti Kelas" → balik ke gerbang
      this._bindClassGate(el);      // klik kelas di kolom kiri → ganti kelas aktif
      this._bindKelasDetail(el);
      return;
    }

    el.innerHTML = this._classBar(active) + `<div class="kelas-detail">${this._kelasDetail(active, students)}</div>`;
    this._bindClassBar(el);
    this._bindKelasDetail(el);
  },

  // Modal: guru memilih kelas yang diampu HANYA dari daftar kelas yang sudah
  // dibuat admin (school_classes). Tak bisa membuat kelas baru sendiri.
  _pickKelasModal(allClasses) {
    if (!allClasses.length) {
      return toast(tr('Admin belum membuat kelas. Hubungi admin sekolah.', 'The admin has not created any classes yet. Contact your school admin.'), 'warning');
    }
    const selected = new Set(DB.user?.kelasAmpu || []);
    const row = c => `
      <label class="pick-row" data-cid="${c.id}" style="display:flex;align-items:center;gap:10px;padding:9px 11px;border:1px solid var(--border);border-radius:var(--radius-xs);cursor:pointer;">
        <input type="checkbox" data-cb="${c.id}" ${selected.has(c.id) ? 'checked' : ''}>
        <ion-icon name="school-outline" style="color:var(--brand);font-size:1.1rem;"></ion-icon>
        <span style="min-width:0;flex:1;">
          <b style="display:block;">${esc(c.nama)}</b>
          ${c.keterangan ? `<span style="font-size:.76rem;color:var(--text-3);">${esc(c.keterangan)}</span>` : ''}
        </span>
      </label>`;

    openModal({
      title: tr('Pilih Kelas yang Diampu', 'Select Classes You Teach'),
      body: `
        <p style="font-size:.84rem;color:var(--text-3);margin-bottom:10px;">${tr('Centang kelas yang kamu ampu. Daftar ini dibuat oleh admin.', 'Tick the classes you teach. This list is created by the admin.')}</p>
        <div class="input-group" style="margin-bottom:12px;">
          <input type="text" class="input" id="kSearch" placeholder="${tr('Cari kelas…', 'Search classes…')}">
          <button type="button" class="suffix-btn"><ion-icon name="search-outline"></ion-icon></button>
        </div>
        <div id="kList" style="max-height:46vh;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:8px;">
          ${allClasses.map(row).join('')}
        </div>
        <div style="font-size:.8rem;color:var(--text-3);margin:6px 0 14px;"><span id="kCount">${selected.size}</span> ${tr('kelas dipilih', 'classes selected')}</div>
        <button class="btn btn-primary btn-block" id="kSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        const countEl = $('#kCount', m);
        $$('[data-cb]', m).forEach(cb => cb.onchange = () => {
          if (cb.checked) selected.add(cb.dataset.cb); else selected.delete(cb.dataset.cb);
          if (countEl) countEl.textContent = selected.size;
        });
        const search = $('#kSearch', m);
        if (search) search.oninput = () => {
          const q = search.value.trim().toLowerCase();
          $$('.pick-row', m).forEach(r => {
            const c = allClasses.find(x => x.id === r.dataset.cid) || {};
            const hay = `${c.nama || ''} ${c.keterangan || ''}`.toLowerCase();
            r.style.display = !q || hay.includes(q) ? '' : 'none';
          });
        };
        $('#kSave', m).onclick = async () => {
          const btn = $('#kSave', m); btn.disabled = true;
          try {
            await DB.updateUser({ kelasAmpu: [...selected] });
            // Kelas aktif tak lagi diampu → kembali ke gerbang "pilih kelas".
            if (!selected.has(this.classId)) this.classId = null;
            closeModal();
            toast(tr('Kelas yang diampu diperbarui 🏫', 'Your classes updated 🏫'));
            this.render(this._el);
          } catch (e) { btn.disabled = false; toast(e.message, 'error'); }
        };
      }
    });
  },

  /* ============ TAB: ABSENSI ============ */

  async renderAbsensi(el) {
    const classes = await this._classes();
    if (!classes.length) { el.innerHTML = this._needClass(); this._bindNeedClass(el); return; }
    if (this.classId && !classes.find(c => c.id === this.classId)) this.classId = null;
    if (!this.classId) {
      el.innerHTML = this._classGate(classes, tr('Absensi', 'Attendance'));
      this._bindClassGate(el); return;
    }
    const cls = classes.find(c => c.id === this.classId);
    const students = await this._students(this.classId);

    // record absensi untuk (kelas, tanggal, pertemuan)
    const attId = `${this.classId}_${this.attDate}_${this.attPertemuan}`;
    const all = await DB.list('attendance');
    const rec = all.find(a => a.id === attId) || { entries: {} };
    const entries = rec.entries || {};

    const legend = this.ABSEN.map(a => `<span class="badge" style="gap:5px;"><span class="att-cell att-${a.k}" style="width:16px;height:16px;pointer-events:none;"></span> ${a.k} = ${tr(a.id, a.en)}</span>`).join(' ');

    el.innerHTML = `
      ${this._classBar(cls)}
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
        <div class="field" style="margin:0;"><label>${tr('Tanggal', 'Date')}</label><input type="date" class="input" id="attDate" value="${this.attDate}" style="max-width:170px;"></div>
        <div class="field" style="margin:0;"><label>${tr('Pertemuan ke-', 'Meeting #')}</label><input type="number" class="input" id="attPert" min="1" value="${this.attPertemuan}" style="max-width:110px;"></div>
      </div>

      <div style="font-size:.8rem;color:var(--text-3);display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">${legend}</div>

      ${students.length ? `
        <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">
          <span class="att-sum" id="attSummary"></span>
          <button class="btn btn-sm" id="allHadir"><ion-icon name="checkmark-done-outline"></ion-icon> ${tr('Tandai semua Hadir', 'Mark all Present')}</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th style="width:44px;">No</th><th>${tr('Nama Siswa', 'Student Name')}</th><th class="center">${tr('Status', 'Status')}</th></tr></thead>
            <tbody>
              ${students.map((s, i) => `
                <tr>
                  <td class="center">${i + 1}</td>
                  <td><b>${esc(s.nama)}</b>${s.nis ? `<div style="font-size:.75rem;color:var(--text-3);">${esc(s.nis)}</div>` : ''}</td>
                  <td>
                    <div style="display:flex;gap:5px;justify-content:center;">
                      ${this.ABSEN.map(a => `<button class="att-cell ${entries[s.id] === a.k ? 'att-' + a.k : 'att-empty'}" data-sid="${s.id}" data-st="${a.k}">${a.k}</button>`).join('')}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
          <button class="btn btn-primary" id="saveAtt"><ion-icon name="save-outline"></ion-icon> ${tr('Simpan Absensi', 'Save Attendance')}</button>
          <button class="btn" id="exportAtt"><ion-icon name="download-outline"></ion-icon> ${tr('Ekspor CSV', 'Export CSV')}</button>
          <button class="btn" id="printAtt"><ion-icon name="print-outline"></ion-icon> PDF</button>
          ${Kop.btnHTML('kopAtt')}
        </div>` : `
        <div class="card empty-state"><ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Kelas ini belum punya siswa', 'This class has no students')}</div>
          <div class="es-sub">${tr('Tambahkan siswa di tab "Kelas & Siswa" dulu', 'Add students in the "Classes & Students" tab first')}</div>
        </div>`}`;

    // draft lokal absensi (biar tidak nulis DB tiap klik)
    const draft = { ...entries };
    const updateSummary = () => {
      const sum = $('#attSummary', el);
      if (!sum) return;
      const cnt = {};
      let filled = 0;
      students.forEach(s => { const v = draft[s.id]; if (v) { cnt[v] = (cnt[v] || 0) + 1; filled++; } });
      const belum = students.length - filled;
      sum.innerHTML = this.ABSEN.map(a => `
        <span class="att-sum-item" title="${tr(a.id, a.en)}">${a.k} <b>${cnt[a.k] || 0}</b></span>`).join('') + `
        <span class="att-sum-item${belum ? ' att-sum-warn' : ''}">${tr('Belum', 'Unmarked')} <b>${belum}</b></span>`;
    };
    updateSummary();

    this._bindClassBar(el);
    $('#attDate', el).onchange = e => { this.attDate = e.target.value || todayStr(); this.render(this._el); };
    $('#attPert', el).onchange = e => { this.attPertemuan = Math.max(1, +e.target.value || 1); this.render(this._el); };

    $$('[data-sid]', el).forEach(b => b.onclick = () => {
      const sid = b.dataset.sid, st = b.dataset.st;
      draft[sid] = st;
      // perbarui tampilan baris
      $$(`[data-sid="${sid}"]`, el).forEach(x => x.className = `att-cell ${x.dataset.st === st ? 'att-' + st : 'att-empty'}`);
      updateSummary();
    });

    const allH = $('#allHadir', el);
    if (allH) allH.onclick = () => {
      students.forEach(s => draft[s.id] = 'H');
      $$('[data-sid]', el).forEach(x => x.className = `att-cell ${x.dataset.st === 'H' ? 'att-H' : 'att-empty'}`);
      updateSummary();
    };

    const save = $('#saveAtt', el);
    if (save) save.onclick = async () => {
      save.disabled = true;
      await DB.set('attendance', attId, {
        classId: this.classId, tanggal: this.attDate, pertemuan: this.attPertemuan, entries: draft
      });
      toast(tr('Absensi tersimpan ✅', 'Attendance saved ✅'));
      save.disabled = false;
    };

    const exp = $('#exportAtt', el);
    if (exp) exp.onclick = () => {
      const cls = classes.find(c => c.id === this.classId);
      const rows = [[tr('No', 'No'), tr('Nama', 'Name'), 'NIS', tr('Status', 'Status')]];
      students.forEach((s, i) => rows.push([i + 1, s.nama, s.nis || '', draft[s.id] || '']));
      downloadCSV(rows, `absensi_${(cls?.nama || 'kelas').replace(/\s+/g, '_')}_${this.attDate}_P${this.attPertemuan}.csv`);
    };

    $('#kopAtt', el) && ($('#kopAtt', el).onclick = () => Kop.modal());

    $('#printAtt', el) && ($('#printAtt', el).onclick = () => {
      const namaStatus = k => { const a = this.ABSEN.find(x => x.k === k); return a ? tr(a.id, a.en) : '-'; };
      const rekap = this.ABSEN
        .map(a => `${a.k}: ${students.filter(s => draft[s.id] === a.k).length}`)
        .join(' · ');
      const kop = Kop.html({
        judul: tr('DAFTAR HADIR SISWA', 'ATTENDANCE LIST'),
        meta: [
          [tr('Mata Pelajaran', 'Subject'), DB.user.mapel || ''],
          [tr('Kelas', 'Class'), cls?.nama || ''],
          [tr('Tanggal', 'Date'), fmtDate(this.attDate, { weekday: true })],
          [tr('Pertemuan ke-', 'Meeting #'), this.attPertemuan],
          [tr('Guru', 'Teacher'), DB.user.nama || '']
        ]
      });
      const cols = `<colgroup>
        <col style="width:6%"><col style="width:38%"><col style="width:16%"><col style="width:20%"><col style="width:20%">
      </colgroup>`;
      const th = `<tr><th>No</th><th>${tr('Nama Siswa', 'Student Name')}</th><th>NIS</th><th>${tr('Status', 'Status')}</th><th>${tr('Keterangan', 'Notes')}</th></tr>`;
      const body = students.map((s, i) => `<tr>
        <td class="center">${i + 1}</td>
        <td>${esc(s.nama)}</td>
        <td>${esc(s.nis || '')}</td>
        <td class="center ${draft[s.id] === 'A' ? 'red' : ''}">${draft[s.id] ? `${draft[s.id]} — ${namaStatus(draft[s.id])}` : '-'}</td>
        <td></td>
      </tr>`).join('');
      printHTML(`Absensi ${cls?.nama || ''}`,
        `${kop}<table>${cols}<thead>${th}</thead><tbody>${body}</tbody></table>
         <p class="muted"><b>${tr('Rekap', 'Summary')}:</b> ${rekap} · ${tr('Total', 'Total')}: ${students.length} ${tr('siswa', 'students')}</p>`);
    });
  },

  /* ============ TAB: PENILAIAN ============ */

  async renderNilai(el) {
    const classes = await this._classes();
    if (!classes.length) { el.innerHTML = this._needClass(); this._bindNeedClass(el); return; }
    if (this.classId && !classes.find(c => c.id === this.classId)) this.classId = null;
    if (!this.classId) {
      el.innerHTML = this._classGate(classes, tr('Penilaian', 'Grades'));
      this._bindClassGate(el); return;
    }
    const activeCls = classes.find(c => c.id === this.classId);
    const students = await this._students(this.classId);

    const allGrades = await DB.list('grades');
    const gb = allGrades.find(g => g.id === this.classId) || { id: this.classId, classId: this.classId, columns: [], scores: {} };
    const columns = gb.columns || [];
    const scores = gb.scores || {};

    const avgCols = columns.filter(c => c.avg !== false); // default semua dihitung
    const avgOf = sid => {
      const vals = avgCols.map(c => scores[sid]?.[c.id]).filter(v => v !== undefined && v !== null && v !== '');
      if (!vals.length) return null;
      return Math.round(vals.reduce((s, v) => s + (+v || 0), 0) / vals.length * 10) / 10;
    };
    const minKkm = columns.length ? Math.min(...columns.map(c => +c.kkm || 0)) : 0;

    el.innerHTML = `
      ${this._classBar(activeCls)}
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
        <button class="btn btn-primary btn-sm" id="addCol" style="margin-bottom:1px;"><ion-icon name="add"></ion-icon> ${tr('Kolom Nilai', 'Grade Column')}</button>
        <button class="btn btn-sm" id="exportGrade" style="margin-bottom:1px;"><ion-icon name="download-outline"></ion-icon> ${tr('Ekspor CSV', 'Export CSV')}</button>
        <button class="btn btn-sm" id="printGrade" style="margin-bottom:1px;"><ion-icon name="print-outline"></ion-icon> PDF</button>
        ${Kop.btnHTML('kopGrade')}
      </div>

      ${!students.length ? `
        <div class="card empty-state"><ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Kelas ini belum punya siswa', 'This class has no students')}</div>
        </div>` : !columns.length ? `
        <div class="card empty-state"><ion-icon name="clipboard-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada kolom nilai', 'No grade columns yet')}</div>
          <div class="es-sub">${tr('Tambah kolom, mis. "UH 1" dengan KKM 75', 'Add a column, e.g. "Quiz 1" with KKM 75')}</div>
        </div>` : `
        <div style="font-size:.8rem;color:var(--text-3);margin-bottom:10px;">${tr('Nilai di bawah KKM otomatis <b style="color:#ef4444;">merah</b>. Centang kolom untuk dihitung ke rata-rata. Nilai tersimpan otomatis.', 'Grades below KKM turn <b style="color:#ef4444;">red</b>. Tick a column to include it in the average. Grades auto-save.')}</div>
        <div class="table-wrap">
          <table class="data-table" id="gradeTable">
            <thead>
              <tr>
                <th style="width:40px;">No</th>
                <th class="sticky-col" style="min-width:150px;">${tr('Nama', 'Name')}</th>
                ${columns.map(c => `
                  <th class="center" style="min-width:80px;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
                      <span style="cursor:pointer;" data-editcol="${c.id}" title="${tr('Ubah kolom', 'Edit column')}">${esc(c.nama)} <ion-icon name="create-outline" style="font-size:.8rem;"></ion-icon></span>
                      <span style="font-weight:600;color:var(--text-3);font-size:.7rem;">KKM ${+c.kkm || 0}</span>
                      <label style="font-size:.65rem;color:var(--text-3);font-weight:600;display:flex;align-items:center;gap:3px;cursor:pointer;">
                        <input type="checkbox" data-avgcol="${c.id}" ${c.avg !== false ? 'checked' : ''} style="width:13px;height:13px;accent-color:var(--brand);"> ${tr('rata2', 'avg')}
                      </label>
                    </div>
                  </th>`).join('')}
                <th class="center" style="min-width:70px;background:var(--brand-soft);">${tr('Rata²', 'Avg')}</th>
              </tr>
            </thead>
            <tbody>
              ${students.map((s, i) => `
                <tr>
                  <td class="center">${i + 1}</td>
                  <td class="sticky-col"><b>${esc(s.nama)}</b></td>
                  ${columns.map(c => {
                    const v = scores[s.id]?.[c.id];
                    const below = v !== undefined && v !== '' && (+v) < (+c.kkm || 0);
                    return `<td class="center"><input class="cell-input ${below ? 'grade-below' : ''}" type="number" min="0" max="100" data-sid="${s.id}" data-col="${c.id}" value="${v ?? ''}"></td>`;
                  }).join('')}
                  <td class="center" data-avg="${s.id}"><b class="${avgOf(s.id) !== null && avgOf(s.id) < minKkm ? 'grade-below' : ''}">${avgOf(s.id) ?? '-'}</b></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`}`;

    this._bindClassBar(el);
    $('#addCol', el).onclick = () => this._colModal(gb);
    $$('[data-editcol]', el).forEach(h => h.onclick = () => this._colModal(gb, columns.find(c => c.id === h.dataset.editcol)));

    // toggle kolom rata2
    $$('[data-avgcol]', el).forEach(cb => cb.onchange = async () => {
      const col = columns.find(c => c.id === cb.dataset.avgcol);
      col.avg = cb.checked;
      await DB.set('grades', this.classId, { classId: this.classId, columns, scores });
      this.render(this._el);
    });

    // input nilai → simpan (debounce) + update warna & rata2 langsung
    let saveT;
    const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => DB.set('grades', this.classId, { classId: this.classId, columns, scores }), 400); };
    $$('.cell-input', el).forEach(inp => inp.oninput = () => {
      const sid = inp.dataset.sid, col = inp.dataset.col;
      let val = inp.value === '' ? '' : clamp(+inp.value, 0, 100);
      if (val !== '' && String(val) !== inp.value) inp.value = val;
      scores[sid] = scores[sid] || {};
      if (val === '') delete scores[sid][col]; else scores[sid][col] = val;
      const colDef = columns.find(c => c.id === col);
      inp.classList.toggle('grade-below', val !== '' && val < (+colDef.kkm || 0));
      const avgCell = $(`[data-avg="${sid}"] b`, el);
      if (avgCell) { const a = avgOf(sid); avgCell.textContent = a ?? '-'; avgCell.classList.toggle('grade-below', a !== null && a < minKkm); }
      persist();
    });

    $('#exportGrade', el) && ($('#exportGrade', el).onclick = () => {
      const cls = classes.find(c => c.id === this.classId);
      const header = [tr('No', 'No'), tr('Nama', 'Name'), ...columns.map(c => `${c.nama} (KKM ${+c.kkm || 0})`), tr('Rata2', 'Avg')];
      const rows = [header];
      students.forEach((s, i) => rows.push([i + 1, s.nama, ...columns.map(c => scores[s.id]?.[c.id] ?? ''), avgOf(s.id) ?? '']));
      downloadCSV(rows, `nilai_${(cls?.nama || 'kelas').replace(/\s+/g, '_')}.csv`);
    });

    $('#kopGrade', el) && ($('#kopGrade', el).onclick = () => Kop.modal());

    $('#printGrade', el) && ($('#printGrade', el).onclick = () => {
      const cls = classes.find(c => c.id === this.classId);
      const head = Kop.html({
        judul: tr('DAFTAR NILAI', 'GRADE LIST'),
        meta: [
          [tr('Mata Pelajaran', 'Subject'), DB.user.mapel || ''],
          [tr('Kelas', 'Class'), cls?.nama || ''],
          [tr('Guru', 'Teacher'), DB.user.nama || ''],
          [tr('Tanggal cetak', 'Printed on'), fmtDate(todayStr())]
        ]
      });
      const th = `<tr><th>No</th><th>${tr('Nama', 'Name')}</th>${columns.map(c => `<th>${esc(c.nama)}<br><small>KKM ${+c.kkm || 0}</small></th>`).join('')}<th>${tr('Rata2', 'Avg')}</th></tr>`;
      const body = students.map((s, i) => `<tr><td class="center">${i + 1}</td><td>${esc(s.nama)}</td>${columns.map(c => { const v = scores[s.id]?.[c.id]; const below = v !== undefined && v !== '' && +v < (+c.kkm || 0); return `<td class="center ${below ? 'red' : ''}">${v ?? '-'}</td>`; }).join('')}<td class="center">${avgOf(s.id) ?? '-'}</td></tr>`).join('');
      printHTML(`Nilai ${cls?.nama || ''}`, `${head}<table><thead>${th}</thead><tbody>${body}</tbody></table>`);
    });
  },

  _colModal(gb, col = null) {
    openModal({
      title: col ? tr('Ubah Kolom Nilai', 'Edit Grade Column') : tr('Kolom Nilai Baru', 'New Grade Column'),
      body: `
        <div class="field">
          <label>${tr('Nama penilaian', 'Assessment name')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('mis. UH 1, Tugas, UTS', 'e.g. Quiz 1, Task, Midterm')}" value="${esc(col?.nama || '')}">
        </div>
        <div class="field">
          <label>KKM <span style="font-weight:500;color:var(--text-3)">${tr('(batas tuntas)', '(passing mark)')}</span></label>
          <input type="number" class="input" id="mKkm" min="0" max="100" value="${col?.kkm ?? 75}">
        </div>
        <div style="display:flex;gap:10px;">
          ${col ? '<button class="btn btn-soft-danger" id="mDel"><ion-icon name="trash-outline"></ion-icon></button>' : ''}
          <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>
        </div>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (!nama) return toast(tr('Isi nama penilaian.', 'Enter an assessment name.'), 'warning');
          const kkm = clamp(+$('#mKkm', m).value || 0, 0, 100);
          const columns = gb.columns || [];
          if (col) { const c = columns.find(x => x.id === col.id); c.nama = nama; c.kkm = kkm; }
          else columns.push({ id: uid(), nama, kkm, avg: true });
          await DB.set('grades', this.classId, { classId: this.classId, columns, scores: gb.scores || {} });
          closeModal();
          toast(tr('Kolom tersimpan.', 'Column saved.'));
          this.render(this._el);
        };
        const del = $('#mDel', m);
        if (del) del.onclick = async () => {
          if (!await confirmDialog(tr('Hapus kolom nilai ini beserta seluruh nilainya?', 'Delete this column and all its grades?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
          const columns = (gb.columns || []).filter(c => c.id !== col.id);
          const scores = gb.scores || {};
          Object.keys(scores).forEach(sid => { if (scores[sid]) delete scores[sid][col.id]; });
          await DB.set('grades', this.classId, { classId: this.classId, columns, scores });
          closeModal();
          toast(tr('Kolom dihapus.', 'Column deleted.'));
          this.render(this._el);
        };
      }
    });
  },

  /* ============ TAB: JURNAL MENGAJAR ============ */

  async renderJurnal(el) {
    const classes = await this._classes();
    if (!classes.length) { el.innerHTML = this._needClass(); this._bindNeedClass(el); return; }
    if (this.classId && !classes.find(c => c.id === this.classId)) this.classId = null;
    if (!this.classId) {
      el.innerHTML = this._classGate(classes, tr('Jurnal Mengajar', 'the Teaching Journal'));
      this._bindClassGate(el); return;
    }
    const activeCls = classes.find(c => c.id === this.classId);
    const jmlSiswa = (await this._students(this.classId)).length;

    const journals = (await DB.list('journals'))
      .filter(j => j.classId === this.classId)
      .sort((a, b) => (b.tanggal || '') < (a.tanggal || '') ? -1 : 1);

    el.innerHTML = `
      ${this._classBar(activeCls)}
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
        <button class="btn btn-primary btn-sm" id="addJurnal" style="margin-bottom:1px;"><ion-icon name="add"></ion-icon> ${tr('Jurnal Baru', 'New Journal')}</button>
        ${journals.length ? `
          <button class="btn btn-sm" id="exportJurnal" style="margin-bottom:1px;"><ion-icon name="download-outline"></ion-icon> ${tr('Ekspor CSV', 'Export CSV')}</button>
          <button class="btn btn-sm" id="printJurnal" style="margin-bottom:1px;"><ion-icon name="print-outline"></ion-icon> PDF</button>` : ''}
        ${Kop.btnHTML('kopJurnal')}
      </div>

      <div class="ts-note">
        <ion-icon name="school-outline" style="vertical-align:-2px;"></ion-icon>
        ${tr('Jurnal kelas', 'Journal for class')} <b>${esc(activeCls?.nama || '-')}</b>
        ${DB.user.mapel ? ` · ${tr('mapel', 'subject')} <b>${esc(DB.user.mapel)}</b>` : ''}
        · ${jmlSiswa} ${tr('siswa', 'students')}. ${tr('Unduhan hanya berisi kelas ini (tidak tercampur kelas lain).', 'Downloads contain only this class (never mixed with others).')}
      </div>

      ${journals.length ? `
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${journals.map(j => `
            <div class="card">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="badge badge-amber"><ion-icon name="school-outline"></ion-icon> ${esc(activeCls?.nama || '')}</span>
                    <span class="badge badge-purple">${fmtDate(j.tanggal, { weekday: true })}</span>
                    ${j.pertemuan ? `<span class="badge badge-blue">${tr('Pertemuan', 'Meeting')} ${j.pertemuan}</span>` : ''}
                    ${j.hadir != null ? `<span class="badge badge-green"><ion-icon name="people"></ion-icon> ${j.hadir} ${tr('hadir', 'present')}</span>` : ''}
                  </div>
                  <div style="font-weight:800;font-size:1rem;margin-top:8px;">${esc(j.judul)}</div>
                  <div style="font-size:.86rem;color:var(--text-2);margin-top:4px;line-height:1.6;white-space:pre-wrap;">${esc(j.materi || '')}</div>
                  ${j.foto ? `<img src="${j.foto}" alt="Foto" style="margin-top:10px;max-height:120px;border-radius:10px;cursor:pointer;" data-foto="${j.id}">` : ''}
                </div>
                <div style="display:flex;gap:6px;">
                  <button class="mini-icon-btn" data-edit="${j.id}"><ion-icon name="create-outline"></ion-icon></button>
                  <button class="mini-icon-btn danger" data-del="${j.id}"><ion-icon name="trash-outline"></ion-icon></button>
                </div>
              </div>
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state"><ion-icon name="document-text-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada jurnal untuk kelas ini', 'No journals for this class yet')}</div>
          <div class="es-sub">${tr('Catat materi & kegiatan tiap pertemuan mengajar 📝', 'Log material & activities for each teaching session 📝')}</div>
        </div>`}`;

    this._bindClassBar(el);
    $('#addJurnal', el).onclick = () => this._jurnalModal(null, classes);

    // Ekspor: urut kronologis (terlama → terbaru) agar terbaca sebagai buku jurnal,
    // berbeda dari daftar di layar yang menaruh jurnal terbaru di atas.
    const jurnalUrut = () => [...journals].sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
    const namaFile = `jurnal_${(activeCls?.nama || 'kelas').replace(/\s+/g, '_')}`;

    $('#kopJurnal', el).onclick = () => Kop.modal();

    $('#exportJurnal', el) && ($('#exportJurnal', el).onclick = () => {
      const rows = [[
        tr('No', 'No'), tr('Kelas', 'Class'), tr('Tanggal', 'Date'), tr('Pertemuan', 'Meeting'),
        tr('Judul', 'Title'), tr('Materi & Kegiatan', 'Material & Activities'),
        tr('Hadir', 'Present'), tr('Tidak Hadir', 'Absent')
      ]];
      jurnalUrut().forEach((j, i) => rows.push([
        i + 1, activeCls?.nama || '', j.tanggal || '', j.pertemuan ?? '',
        j.judul || '', j.materi || '', j.hadir ?? '',
        j.hadir != null && jmlSiswa ? Math.max(0, jmlSiswa - j.hadir) : ''
      ]));
      downloadCSV(rows, `${namaFile}.csv`);
    });

    // PDF meniru form resmi "JURNAL GURU": kop sekolah, baris Mata Pelajaran &
    // Kelas, lalu tabel per pertemuan. Kolom Ketercapaian & Tanda Tangan sengaja
    // dibiarkan kosong — diisi tangan setelah dicetak, seperti form aslinya.
    $('#printJurnal', el) && ($('#printJurnal', el).onclick = () => {
      const kop = Kop.html({
        judul: tr('JURNAL GURU', 'TEACHING JOURNAL'),
        meta: [
          [tr('Mata Pelajaran', 'Subject'), DB.user.mapel || ''],
          [tr('Kelas', 'Class'), activeCls?.nama || ''],
          [tr('Guru', 'Teacher'), DB.user.nama || '']
        ]
      });
      // Lebar kolom dikunci: uraian materi mendapat porsi terbesar (seperti form
      // aslinya), kolom angka dibuat sempit agar tidak memakan ruang.
      const cols = `<colgroup>
        <col style="width:5%"><col style="width:17%"><col style="width:7%"><col style="width:34%">
        <col style="width:9%"><col style="width:8%"><col style="width:9%"><col style="width:11%">
      </colgroup>`;
      const th = `<tr>
        <th>No</th>
        <th>${tr('Hari, tanggal', 'Day, date')}</th>
        <th>${tr('Pert. ke', 'Meeting')}</th>
        <th>${tr('Judul / Materi & Kegiatan', 'Title / Material & Activities')}</th>
        <th>${tr('Jumlah Siswa', 'Total')}</th>
        <th>${tr('Hadir', 'Present')}</th>
        <th>${tr('Tidak Hadir', 'Absent')}</th>
        <th>${tr('Ket. / Tanda Tangan', 'Notes / Signature')}</th>
      </tr>`;
      const body = jurnalUrut().map((j, i) => {
        const tidakHadir = j.hadir != null && jmlSiswa ? Math.max(0, jmlSiswa - j.hadir) : null;
        return `<tr>
          <td class="center">${i + 1}</td>
          <td>${j.tanggal ? fmtDate(j.tanggal, { weekday: true }) : '-'}</td>
          <td class="center">${j.pertemuan ?? '-'}</td>
          <td><b>${esc(j.judul || '')}</b>${j.materi ? `<div style="white-space:pre-wrap;">${esc(j.materi)}</div>` : ''}</td>
          <td class="center">${jmlSiswa || '-'}</td>
          <td class="center">${j.hadir ?? '-'}</td>
          <td class="center">${tidakHadir ?? '-'}</td>
          <td></td>
        </tr>`;
      }).join('');
      printHTML(`Jurnal ${activeCls?.nama || ''}`, `${kop}<table>${cols}<thead>${th}</thead><tbody>${body}</tbody></table>`);
    });

    $$('[data-edit]', el).forEach(b => b.onclick = () => this._jurnalModal(journals.find(j => j.id === b.dataset.edit), classes));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus jurnal ini?', 'Delete this journal?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      const jrn = journals.find(j => j.id === b.dataset.del);
      await DB.remove('journals', b.dataset.del);
      Storage.deleteByUrl(jrn?.foto);   // bersihkan file foto di Supabase (best-effort)
      toast(tr('Jurnal dihapus.', 'Journal deleted.'));
      this.render(this._el);
    });
    $$('[data-foto]', el).forEach(img => img.onclick = () => {
      openModal({ title: tr('Foto Pembelajaran', 'Learning Photo'), body: `<img src="${img.src}" style="width:100%;border-radius:12px;">` });
    });
  },

  async _jurnalModal(j = null, classes = []) {
    // hitung jumlah hadir dari absensi tanggal tsb (bila ada) sebagai default
    const tanggal = j?.tanggal || todayStr();
    let fotoData = j?.foto || '';
    const kelasTerpilih = j?.classId || this.classId;

    openModal({
      title: j ? tr('Ubah Jurnal', 'Edit Journal') : tr('Jurnal Mengajar Baru', 'New Teaching Journal'),
      body: `
        <div class="field">
          <label>${tr('Kelas yang diampu', 'Class taught')}</label>
          <select class="select" id="mKelas">
            ${classes.map(c => `<option value="${c.id}" ${c.id === kelasTerpilih ? 'selected' : ''}>${esc(c.nama)}</option>`).join('')}
          </select>
        </div>
        ${DB.user.mapel ? `<div class="field"><label>${tr('Mata pelajaran', 'Subject')}</label><input type="text" class="input" value="${esc(DB.user.mapel)}" disabled></div>` : ''}
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field"><label>${tr('Tanggal', 'Date')}</label><input type="date" class="input" id="mTgl" value="${tanggal}"></div>
          <div class="field"><label>${tr('Pertemuan ke-', 'Meeting #')}</label><input type="number" class="input" id="mPert" min="1" value="${j?.pertemuan || ''}"></div>
        </div>
        <div class="field"><label>${tr('Judul / topik', 'Title / topic')}</label><input type="text" class="input" id="mJudul" placeholder="${tr('mis. Percabangan if-else', 'e.g. If-else branching')}" value="${esc(j?.judul || '')}"></div>
        <div class="field"><label>${tr('Materi & kegiatan', 'Material & activities')}</label><textarea class="textarea" id="mMateri" placeholder="${tr('Uraian materi, metode, tugas…', 'Material summary, method, assignment…')}">${esc(j?.materi || '')}</textarea></div>
        <div class="field">
          <label>${tr('Jumlah siswa hadir', 'Students present')} <span style="font-weight:500;color:var(--text-3)">${tr('(otomatis dari absensi bila kosong)', '(auto from attendance if empty)')}</span></label>
          <input type="number" class="input" id="mHadir" min="0" value="${j?.hadir ?? ''}">
        </div>
        <div class="field">
          <label>${tr('Foto pembelajaran', 'Learning photo')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
          <input type="file" accept="image/*" class="input" id="mFoto">
          <div id="fotoPrev" style="margin-top:8px;">${fotoData ? `<img src="${fotoData}" style="max-height:90px;border-radius:8px;">` : ''}</div>
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan Jurnal', 'Save Journal')}</button>`,
      onMount: m => {
        $('#mFoto', m).onchange = async e => {
          const f = e.target.files[0];
          if (!f) return;
          const prev = $('#fotoPrev', m);
          const oldUrl = fotoData;   // foto sebelumnya (untuk dibersihkan bila terganti)
          prev.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;font-size:.82rem;color:var(--text-3);">
            <ion-icon name="cloud-upload-outline"></ion-icon> ${tr('Mengunggah foto…', 'Uploading photo…')}</span>`;
          try {
            // Unggah file ke Supabase Storage; yang disimpan ke Firestore hanya URL-nya.
            fotoData = await Storage.uploadFoto(f, 'jurnal');
            prev.innerHTML = `<img src="${fotoData}" style="max-height:90px;border-radius:8px;">`;
            Storage.deleteByUrl(oldUrl);   // hapus foto lama (best-effort)
          } catch (err) {
            fotoData = oldUrl;
            prev.innerHTML = oldUrl ? `<img src="${oldUrl}" style="max-height:90px;border-radius:8px;">` : '';
            toast(tr('Gagal mengunggah foto: ', 'Failed to upload photo: ') + (err.message || ''), 'error');
          }
        };
        $('#mSave', m).onclick = async () => {
          const judul = $('#mJudul', m).value.trim();
          if (!judul) return toast(tr('Isi judul/topik.', 'Enter a title/topic.'), 'warning');
          const tgl = $('#mTgl', m).value || todayStr();
          const pert = +$('#mPert', m).value || null;
          const kelasId = $('#mKelas', m)?.value || this.classId;
          let hadir = $('#mHadir', m).value === '' ? null : +$('#mHadir', m).value;
          // auto hadir dari absensi bila kosong
          if (hadir === null) {
            const att = (await DB.list('attendance')).filter(a => a.classId === kelasId && a.tanggal === tgl);
            if (att.length) {
              const merged = {};
              att.forEach(a => Object.assign(merged, a.entries || {}));
              hadir = Object.values(merged).filter(v => v === 'H').length || null;
            }
          }
          const data = { classId: kelasId, tanggal: tgl, pertemuan: pert, judul, materi: $('#mMateri', m).value.trim(), hadir, foto: fotoData || '' };
          const btn = $('#mSave', m); btn.disabled = true;
          try {
            if (j) await DB.update('journals', j.id, data);
            else await DB.add('journals', data);
            // Ikut pindah ke kelas yang dipilih, supaya jurnal yang baru disimpan
            // langsung terlihat (daftar jurnal difilter per kelas aktif).
            this.classId = kelasId;
            closeModal();
            toast(tr('Jurnal tersimpan 📝', 'Journal saved 📝'));
            this.render(this._el);
          } catch (e) { btn.disabled = false; toast(e.message, 'error'); }
        };
      }
    });
  },

  /* ============ TAB: JADWAL MENGAJAR (foto) ============
     Bentuk jadwal tiap sekolah berbeda-beda dan versi cetaknya sudah ada di
     tangan guru. Daripada memaksa guru mengetik ulang jam per jam, guru cukup
     memotret atau mengunggah jadwalnya, lalu melihatnya kapan saja.

     Fotonya disimpan di Supabase Storage (bucket yang sama dengan foto jurnal,
     folder "jadwal"); yang dicatat di Firestore hanya URL publiknya, pada
     profil guru: users/{uid}.jadwalFoto = { url, dibuatPada }. */

  async renderJadwal(el) {
    const foto = DB.user.jadwalFoto || null;
    const tglUnggah = foto?.dibuatPada ? fmtDate(String(foto.dibuatPada).slice(0, 10)) : '';

    el.innerHTML = `
      <div class="portal-head" style="margin-bottom:16px;">
        <div>
          <h1 style="font-size:1.2rem;">${tr('Jadwal Mengajar', 'Teaching Schedule')}</h1>
          <p>${tr('Foto jadwal mengajarmu — potret atau unggah sendiri.', 'A photo of your teaching schedule — snap or upload it yourself.')}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-sm" id="jfKamera"><ion-icon name="camera-outline"></ion-icon> ${tr('Buka Kamera', 'Open Camera')}</button>
          <button class="btn btn-primary btn-sm" id="jfUnggah">
            <ion-icon name="cloud-upload-outline"></ion-icon> ${foto ? tr('Ganti Foto', 'Replace Photo') : tr('Unggah Foto', 'Upload Photo')}
          </button>
        </div>
      </div>

      <input type="file" accept="image/*" id="jfFile" hidden>

      ${foto?.url ? `
        <div class="card jf-card">
          <button class="jf-foto" id="jfLihat" title="${tr('Ketuk untuk memperbesar', 'Tap to zoom')}">
            <img src="${esc(foto.url)}" alt="${tr('Foto jadwal mengajar', 'Teaching schedule photo')}">
            <span class="jf-zoom"><ion-icon name="expand-outline"></ion-icon></span>
          </button>
          <div class="jf-meta">
            <span class="jf-tgl">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
              ${tglUnggah ? tr(`Diunggah ${tglUnggah}`, `Uploaded ${tglUnggah}`) : tr('Tersimpan', 'Saved')}
            </span>
            <button class="btn btn-sm btn-danger" id="jfHapus"><ion-icon name="trash-outline"></ion-icon> ${tr('Hapus', 'Delete')}</button>
          </div>
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="image-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada foto jadwal', 'No schedule photo yet')}</div>
          <div class="es-sub">${tr('Potret jadwal mengajarmu dengan kamera, atau unggah fotonya dari galeri 📸', 'Snap your teaching schedule with the camera, or upload it from your gallery 📸')}</div>
          <div class="jf-es-aksi">
            <button class="btn btn-sm" data-jf="kamera"><ion-icon name="camera-outline"></ion-icon> ${tr('Buka Kamera', 'Open Camera')}</button>
            <button class="btn btn-primary btn-sm" data-jf="unggah"><ion-icon name="cloud-upload-outline"></ion-icon> ${tr('Unggah Foto', 'Upload Photo')}</button>
          </div>
        </div>`}`;

    const berkas = $('#jfFile', el);
    const pilihBerkas = () => berkas.click();

    berkas.onchange = async e => {
      const f = e.target.files[0];
      berkas.value = '';                 // agar memilih foto yang sama lagi tetap memicu onchange
      if (f) await this._simpanFotoJadwal(f);
    };

    $('#jfUnggah', el).onclick = pilihBerkas;
    $('#jfKamera', el).onclick = () => this._kameraJadwal();
    $$('[data-jf]', el).forEach(b => b.onclick = () =>
      b.dataset.jf === 'kamera' ? this._kameraJadwal() : pilihBerkas());

    if (foto?.url) {
      $('#jfLihat', el).onclick = () => this._lihatFotoJadwal(foto.url);
      $('#jfHapus', el).onclick = async () => {
        if (!await confirmDialog(
          tr('Hapus foto jadwal ini?', 'Delete this schedule photo?'),
          { danger: true, okText: tr('Hapus', 'Delete') })) return;
        await DB.updateUser({ jadwalFoto: null });
        await Storage.deleteByUrl(foto.url);
        toast(tr('Foto jadwal dihapus.', 'Schedule photo deleted.'));
        this.render(this._el);
      };
    }
  },

  // Unggah foto (dari galeri maupun hasil jepretan kamera) → Supabase → profil.
  async _simpanFotoJadwal(file) {
    if (!file.type.startsWith('image/')) {
      return toast(tr('Berkas itu bukan gambar.', 'That file is not an image.'), 'warning');
    }
    if (!Storage.ready()) {
      return toast(tr('Penyimpanan foto belum siap. Cek koneksi lalu muat ulang halaman.',
                      'Photo storage is not ready. Check your connection and reload.'), 'error');
    }
    if (this._jfSibuk) return;           // cegah unggah ganda saat guru menekan dua kali
    this._jfSibuk = true;

    const lama = DB.user.jadwalFoto?.url || '';
    toast(tr('Mengunggah foto jadwal…', 'Uploading schedule photo…'));
    try {
      // Resolusi sengaja lebih besar dari foto jurnal: tulisan jam & kelas di
      // jadwal harus tetap terbaca ketika fotonya diperbesar.
      const url = await Storage.uploadFoto(file, 'jadwal', { maxDim: 1800, quality: 0.82 });
      await DB.updateUser({ jadwalFoto: { url, dibuatPada: new Date().toISOString() } });
      // Foto lama baru dibuang SETELAH yang baru tersimpan, supaya kegagalan di
      // tengah jalan tidak meninggalkan guru tanpa foto sama sekali.
      if (lama) await Storage.deleteByUrl(lama);
      toast(tr('Foto jadwal tersimpan 📸', 'Schedule photo saved 📸'));
      this.render(this._el);
    } catch (e) {
      toast(tr('Gagal mengunggah foto: ', 'Failed to upload photo: ') + e.message, 'error');
    } finally {
      this._jfSibuk = false;
    }
  },

  // Lihat foto ukuran penuh (bisa digeser & diperbesar lewat peramban).
  _lihatFotoJadwal(url) {
    openModal({
      title: tr('Jadwal Mengajar', 'Teaching Schedule'),
      body: `
        <div class="jf-besar"><img src="${esc(url)}" alt="${tr('Foto jadwal mengajar', 'Teaching schedule photo')}"></div>
        <a class="btn btn-block" style="margin-top:14px;" href="${esc(url)}" target="_blank" rel="noopener">
          <ion-icon name="open-outline"></ion-icon> ${tr('Buka ukuran asli', 'Open full size')}
        </a>`
    });
  },

  /* Kamera langsung di halaman (getUserMedia). Atribut capture pada <input file>
     hanya bekerja di ponsel; di laptop ia diabaikan diam-diam. Dengan getUserMedia,
     "Buka Kamera" berarti benar-benar membuka kamera di kedua perangkat. */
  _kameraJadwal() {
    if (!navigator.mediaDevices?.getUserMedia) {
      return toast(tr('Peramban ini tidak bisa membuka kamera. Pakai tombol Unggah Foto.',
                      'This browser cannot open the camera. Use the Upload Photo button.'), 'warning');
    }

    let stream = null;
    let arah = 'environment';            // utamakan kamera belakang (untuk memotret kertas)

    openModal({
      title: tr('Ambil Foto Jadwal', 'Take Schedule Photo'),
      body: `
        <div class="cam-view"><video id="camVid" playsinline autoplay muted></video></div>
        <div class="cam-pesan" id="camPesan">${tr('Arahkan kamera ke jadwal, pastikan tulisannya terbaca.',
                                                  'Point the camera at your schedule; make sure the text is readable.')}</div>
        <div style="display:flex;gap:10px;margin-top:14px;">
          <button class="btn btn-block" id="camPutar"><ion-icon name="camera-reverse-outline"></ion-icon> ${tr('Balik Kamera', 'Flip Camera')}</button>
          <button class="btn btn-primary btn-block" id="camAmbil"><ion-icon name="camera"></ion-icon> ${tr('Ambil Foto', 'Capture')}</button>
        </div>`,
      onMount: m => {
        const vid = $('#camVid', m), pesan = $('#camPesan', m), ambil = $('#camAmbil', m);
        const matikan = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };

        // Kamera WAJIB mati begitu modal ditutup — lewat tombol X, klik latar,
        // maupun tombol lain. Tanpa ini lampu kamera tetap menyala setelahnya.
        const obs = new MutationObserver(() => {
          if (!m.isConnected) { matikan(); obs.disconnect(); }
        });
        obs.observe(document.getElementById('modalRoot'), { childList: true });

        const nyalakan = async () => {
          matikan();
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: arah, width: { ideal: 1920 } }, audio: false
            });
            if (!m.isConnected) return matikan();   // modal keburu ditutup
            vid.srcObject = stream;
            ambil.disabled = false;
          } catch (e) {
            const alasan =
              e.name === 'NotAllowedError' ? tr('Izin kamera ditolak. Aktifkan lewat ikon gembok di bilah alamat.',
                                                'Camera permission denied. Allow it from the lock icon in the address bar.')
            : e.name === 'NotFoundError'   ? tr('Tidak ada kamera di perangkat ini. Pakai tombol Unggah Foto.',
                                                'No camera on this device. Use the Upload Photo button.')
            : e.message;
            pesan.textContent = alasan;
            pesan.classList.add('cam-err');
            ambil.disabled = true;
          }
        };
        nyalakan();

        $('#camPutar', m).onclick = () => {
          arah = arah === 'environment' ? 'user' : 'environment';
          nyalakan();
        };

        ambil.onclick = () => {
          if (!stream || !vid.videoWidth) return;
          const kanvas = document.createElement('canvas');
          kanvas.width = vid.videoWidth;
          kanvas.height = vid.videoHeight;
          kanvas.getContext('2d').drawImage(vid, 0, 0);
          kanvas.toBlob(async blob => {
            matikan();
            closeModal();
            if (blob) await this._simpanFotoJadwal(new File([blob], 'jadwal.jpg', { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.92);
        };
      }
    });
  },
  /* ============ TAB: TUGAS KELAS (kirim tugas ke siswa) ============
     Semua guru pengampu kelas boleh mengirim tugas → koleksi class_tasks.
     Siswa menerimanya read-only di app (boleh centang selesai). */
  async renderTugasKelas(el) {
    const classes = await this._classes();
    if (!classes.length) { el.innerHTML = this._needClass(); this._bindNeedClass(el); return; }
    if (this.classId && !classes.find(c => c.id === this.classId)) this.classId = null;
    if (!this.classId) {
      el.innerHTML = this._classGate(classes, tr('Tugas Kelas', 'Class Tasks'));
      this._bindClassGate(el); return;
    }
    const activeCls = classes.find(c => c.id === this.classId);
    // Prioritas dulu (P1 → P3), baru tenggat — sama seperti urutan di app siswa,
    // supaya guru melihat daftar persis seperti yang dilihat siswanya.
    const tasks = (await DB.gListWhere('class_tasks', 'classId', this.classId))
      .sort((a, b) => prioUrut(a.prioritas) - prioUrut(b.prioritas)
                   || (a.tenggat || '9999-99-99').localeCompare(b.tenggat || '9999-99-99'));

    el.innerHTML = `
      ${this._classBar(activeCls)}
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px;">
        <button class="btn btn-primary btn-sm" id="addTugas" style="margin-bottom:1px;"><ion-icon name="add"></ion-icon> ${tr('Kirim Tugas', 'Send Task')}</button>
      </div>
      <div style="font-size:.8rem;color:var(--text-3);margin-bottom:14px;">${tr('Tugas yang kamu kirim langsung muncul di app siswa kelas ini.', "Tasks you send appear instantly in this class's student apps.")}</div>

      ${tasks.length ? `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${tasks.map(t => `
            <div class="list-item">
              <div class="item-icon" style="background:var(--prod-soft);color:var(--prod);">📌</div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:.92rem;">${esc(t.judul)}</div>
                <div style="display:flex;gap:8px;align-items:center;margin-top:4px;flex-wrap:wrap;">
                  ${t.mapel ? `<span class="badge badge-purple">${esc(t.mapel)}</span>` : ''}
                  ${t.tenggat ? `<span class="badge badge-gray"><ion-icon name="calendar-outline"></ion-icon> ${fmtDate(t.tenggat, { short: true })}</span>` : ''}
                  ${prioBadge(t.prioritas)}
                  ${t.guruNama ? `<span style="font-size:.72rem;color:var(--text-3);">${esc(t.guruNama)}</span>` : ''}
                </div>
              </div>
              ${t.guruId === DB.user.id ? `
                <button class="mini-icon-btn" data-edit="${t.id}"><ion-icon name="create-outline"></ion-icon></button>
                <button class="mini-icon-btn danger" data-del="${t.id}"><ion-icon name="trash-outline"></ion-icon></button>` : ''}
            </div>`).join('')}
        </div>` : `
        <div class="card empty-state"><ion-icon name="clipboard-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada tugas untuk kelas ini', 'No tasks for this class yet')}</div>
          <div class="es-sub">${tr('Tekan "Kirim Tugas" untuk memberi tugas ke siswa 📚', 'Press "Send Task" to assign a task to students 📚')}</div>
        </div>`}`;

    this._bindClassBar(el);
    $('#addTugas', el).onclick = () => this._tugasKelasModal();
    $$('[data-edit]', el).forEach(b => b.onclick = () => this._tugasKelasModal(tasks.find(t => t.id === b.dataset.edit)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus tugas ini dari kelas?', 'Delete this task from the class?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      await DB.gRemove('class_tasks', b.dataset.del);
      toast(tr('Tugas dihapus.', 'Task deleted.'));
      this.render(this._el);
    });
  },

  _tugasKelasModal(task = null) {
    openModal({
      title: task ? tr('Ubah Tugas', 'Edit Task') : tr('Kirim Tugas ke Kelas', 'Send Task to Class'),
      body: `
        <div class="field"><label>${tr('Judul tugas', 'Task title')}</label><input type="text" class="input" id="mJudul" placeholder="${tr('mis. Kerjakan LKS hal. 20', 'e.g. Worksheet page 20')}" value="${esc(task?.judul || '')}"></div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field"><label>${tr('Mata pelajaran', 'Subject')}</label><input type="text" class="input" id="mMapel" value="${esc(task?.mapel || DB.user.mapel || '')}"></div>
          <div class="field"><label>${tr('Tenggat', 'Due date')}</label><input type="date" class="input" id="mTenggat" value="${esc(task?.tenggat || '')}"></div>
        </div>
        <div class="field"><label>${tr('Prioritas', 'Priority')}</label>
          <select class="select" id="mPrioritas">
            ${['tinggi', 'sedang', 'rendah'].map(p => `
              <option value="${p}" ${prioKey(task?.prioritas) === p ? 'selected' : ''}>
                ${PRIORITAS[p].kode} · ${PRIORITAS[p].nama()}
              </option>`).join('')}
          </select>
          <div style="font-size:.75rem;color:var(--text-3);margin-top:5px;">${tr('P1 tampil paling atas di app siswa, supaya yang krusial tidak terlewat.', 'P1 appears at the top in the student app, so critical work is not missed.')}</div>
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="paper-plane-outline"></ion-icon> ${task ? tr('Simpan', 'Save') : tr('Kirim', 'Send')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const judul = $('#mJudul', m).value.trim();
          if (!judul) return toast(tr('Isi judul tugas.', 'Enter a task title.'), 'warning');
          const data = { judul, mapel: $('#mMapel', m).value.trim(), tenggat: $('#mTenggat', m).value, prioritas: $('#mPrioritas', m).value };
          const btn = $('#mSave', m); btn.disabled = true;
          try {
            if (task) await DB.gUpdate('class_tasks', task.id, data);
            else await DB.gAdd('class_tasks', { classId: this.classId, guruId: DB.user.id, guruNama: DB.user.nama, dibuatPada: new Date().toISOString(), ...data });
            closeModal();
            toast(task ? tr('Tugas diperbarui.', 'Task updated.') : tr('Tugas terkirim ke siswa 📤', 'Task sent to students 📤'));
            this.render(this._el);
          } catch (e) { btn.disabled = false; toast(e.message, 'error'); }
        };
      }
    });
  },

  /* ============ TAB: JADWAL KELAS (khusus WALI KELAS) ============
     Guru bisa menandai dirinya wali kelas (DB.user.waliKelasId). HANYA wali
     yang boleh menulis jadwal kelas (class_schedule/{classId}) — dijaga rules.
     Jadwal ini diterima siswa kelas tsb (read-only). */
  // Tab ini HANYA muncul untuk wali kelas (nav disembunyikan di guru.html bila
  // waliKelasId kosong). Terikat langsung ke kelas yang di-wali-i (bukan pemilih
  // kelas) — jadi jadwal kelas hanya untuk kelas wali, bukan kelas ampu lain.
  async renderJadwalKelas(el) {
    const waliId = DB.user.waliKelasId;
    if (!waliId) {
      el.innerHTML = `<div class="card empty-state">
        <ion-icon name="lock-closed-outline"></ion-icon>
        <div class="es-title">${tr('Khusus wali kelas', 'Homeroom teachers only')}</div>
        <div class="es-sub">${tr('Kamu belum terdaftar sebagai wali kelas. Atur lewat "Data Guru".', 'You are not registered as a homeroom teacher. Set it via "Teacher Info".')}</div>
        <button class="btn btn-primary btn-sm" id="openSetup" style="margin-top:14px;"><ion-icon name="create-outline"></ion-icon> ${tr('Data Guru', 'Teacher Info')}</button>
      </div>`;
      $('#openSetup', el) && ($('#openSetup', el).onclick = () => this._setupModal(() => this.render(this._el)));
      return;
    }

    const cls = await DB.gGet('school_classes', waliId);
    const clsNama = cls?.nama || tr('Kelasmu', 'Your class');
    const doc = await DB.gGet('class_schedule', waliId);
    const entries = (doc?.entries || []).slice()
      .sort((a, b) => (+a.hari - +b.hari) || (a.jamMulai || '').localeCompare(b.jamMulai || ''));

    el.innerHTML = `
      ${this._backKelasBar()}
      <div class="portal-head" style="margin-bottom:16px;">
        <div>
          <h1 style="font-size:1.2rem;">${tr('Jadwal Kelas', 'Class Schedule')} — ${esc(clsNama)}</h1>
          <p style="font-size:.85rem;color:var(--text-3);margin-top:2px;">${tr('Kamu wali kelas ini. Jadwal yang kamu susun dikirim ke semua siswa kelas ini.', 'You are its homeroom teacher. The schedule you set is sent to all its students.')}</p>
        </div>
        <button class="btn btn-primary btn-sm" id="addJadwalKelas"><ion-icon name="add"></ion-icon> ${tr('Tambah', 'Add')}</button>
      </div>

      ${entries.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>${tr('Hari', 'Day')}</th><th>${tr('Jam', 'Time')}</th><th>${tr('Mapel', 'Subject')}</th><th>${tr('Ruang', 'Room')}</th><th style="text-align:right;">${tr('Aksi', 'Actions')}</th></tr></thead>
            <tbody>
              ${entries.map(s => `<tr>
                <td>${HARI[+s.hari]}</td>
                <td>${this._jamRange(s.jamMulai, s.jamSelesai)}</td>
                <td><b>${esc(s.mapel)}</b></td>
                <td style="color:var(--text-3);">${esc(s.ruang || '-')}</td>
                <td style="text-align:right;white-space:nowrap;">
                  <button class="mini-icon-btn" data-edit="${s.id}"><ion-icon name="create-outline"></ion-icon></button>
                  <button class="mini-icon-btn danger" data-del="${s.id}"><ion-icon name="trash-outline"></ion-icon></button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `
        <div class="card empty-state"><ion-icon name="calendar-outline"></ion-icon>
          <div class="es-title">${tr('Belum ada jadwal kelas', 'No class schedule yet')}</div>
          <div class="es-sub">${tr('Tekan "Tambah" untuk mengisi jadwal.', 'Press "Add" to fill the schedule.')}</div>
        </div>`}`;

    this._bindBackKelas(el);
    $('#addJadwalKelas', el) && ($('#addJadwalKelas', el).onclick = () => this._jadwalKelasModal(doc, null));
    $$('[data-edit]', el).forEach(b => b.onclick = () => this._jadwalKelasModal(doc, entries.find(s => s.id === b.dataset.edit)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      if (!await confirmDialog(tr('Hapus jadwal ini?', 'Delete this entry?'), { danger: true, okText: tr('Hapus', 'Delete') })) return;
      const newEntries = (doc?.entries || []).filter(s => s.id !== b.dataset.del);
      await DB.gUpdate('class_schedule', waliId, { classId: waliId, waliNama: DB.user.nama, updatedAt: new Date().toISOString(), entries: newEntries });
      toast(tr('Jadwal dihapus.', 'Entry deleted.'));
      this.render(this._el);
    });
  },

  _jadwalKelasModal(doc, item) {
    const waliId = DB.user.waliKelasId;
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    openModal({
      title: item ? tr('Ubah Jadwal', 'Edit Entry') : tr('Tambah Jadwal Kelas', 'Add Class Schedule'),
      body: `
        <div class="field"><label>${tr('Mata pelajaran', 'Subject')}</label><input type="text" class="input" id="mMapel" placeholder="${tr('mis. Matematika', 'e.g. Math')}" value="${esc(item?.mapel || '')}"></div>
        <div class="field"><label>${tr('Hari', 'Day')}</label><select class="select" id="mHari">${dayOrder.map(d => `<option value="${d}" ${(item ? +item.hari : 1) === d ? 'selected' : ''}>${HARI[d]}</option>`).join('')}</select></div>
        <div class="grid grid-2 keep-2 jam-fields" style="gap:12px;">
          <div class="field"><label>${tr('Jam mulai', 'Start')}</label>${this._jamPicker('mMulai', item?.jamMulai, '07:00')}</div>
          <div class="field"><label>${tr('Jam selesai', 'End')}</label>${this._jamPicker('mSelesai', item?.jamSelesai, '08:30')}</div>
        </div>
        <div class="field"><label>${tr('Ruang', 'Room')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mRuang" value="${esc(item?.ruang || '')}"></div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const mapel = $('#mMapel', m).value.trim();
          const jamMulai = this._jamValue('mMulai', m), jamSelesai = this._jamValue('mSelesai', m);
          if (!mapel) return toast(tr('Isi nama pelajaran.', 'Enter a subject.'), 'warning');
          if (!jamMulai || !jamSelesai) return toast(tr('Isi jam mulai & selesai.', 'Enter start & end time.'), 'warning');
          if (jamSelesai <= jamMulai) return toast(tr('Jam selesai harus setelah mulai.', 'End must be after start.'), 'warning');
          const entry = { id: item?.id || uid(), hari: +$('#mHari', m).value, jamMulai, jamSelesai, mapel, ruang: $('#mRuang', m).value.trim() };
          const list = (doc?.entries || []).slice();
          const idx = list.findIndex(s => s.id === entry.id);
          if (idx >= 0) list[idx] = entry; else list.push(entry);
          const btn = $('#mSave', m); btn.disabled = true;
          try {
            await DB.gUpdate('class_schedule', waliId, { classId: waliId, waliNama: DB.user.nama, updatedAt: new Date().toISOString(), entries: list });
            closeModal();
            toast(tr('Jadwal tersimpan & terkirim 📅', 'Schedule saved & sent 📅'));
            this.render(this._el);
          } catch (e) { btn.disabled = false; toast(e.message, 'error'); }
        };
      }
    });
  },

  // Form "Data Guru": nama, mapel, status wali + kelas wali. Dipanggil otomatis
  // saat guru pertama login (guruSetup belum true) & bisa dibuka ulang dari topbar.
  // onSaved: callback setelah simpan (mis. refresh nav & tampilan).
  async _setupModal(onSaved) {
    let classes = [];
    try { classes = (await DB.gList('school_classes')).sort(this._byOrder); } catch (_) { classes = []; }
    const u = DB.user;
    const isWali = !!u.waliKelasId;
    openModal({
      title: tr('Data Guru', 'Teacher Info'),
      body: `
        <p style="font-size:.84rem;color:var(--text-3);margin-bottom:14px;">${tr('Lengkapi datamu agar fitur kelas, tugas & jadwal berfungsi.', 'Complete your info so class, task & schedule features work.')}</p>
        <div class="field"><label>${tr('Nama guru', 'Teacher name')}</label><input type="text" class="input" id="sgNama" value="${esc(u.nama || '')}"></div>
        <div class="field"><label>${tr('Mata pelajaran yang diampu', 'Subject you teach')}</label><input type="text" class="input" id="sgMapel" placeholder="${tr('mis. Matematika', 'e.g. Math')}" value="${esc(u.mapel || '')}"></div>
        <div class="field" style="margin-bottom:8px;">
          <label class="setting-row" style="cursor:pointer;padding:10px 0;gap:12px;">
            <ion-icon name="ribbon-outline" style="font-size:1.2rem;color:var(--brand);"></ion-icon>
            <span class="sr-text"><span class="sr-title">${tr('Saya wali kelas', 'I am a homeroom teacher')}</span><span class="sr-sub">${tr('Hanya wali yang bisa mengirim jadwal kelas', 'Only homeroom teachers can send the class schedule')}</span></span>
            <input type="checkbox" id="sgWali" ${isWali ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--brand);">
          </label>
        </div>
        <div class="field" id="sgKelasWrap" style="${isWali ? '' : 'display:none;'}">
          <label>${tr('Wali kelas dari', 'Homeroom of')}</label>
          ${classes.length ? `
          <select class="select" id="sgKelas">
            <option value="">${tr('— Pilih kelas —', '— Choose class —')}</option>
            ${classes.map(c => `<option value="${esc(c.id)}" ${c.id === u.waliKelasId ? 'selected' : ''}>${esc(c.nama)}</option>`).join('')}
          </select>` : `
          <input type="text" class="input" disabled value="${tr('Belum ada kelas (hubungi admin)', 'No classes yet (contact admin)')}">`}
        </div>
        <button class="btn btn-primary btn-block" id="sgSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        const wali = $('#sgWali', m), wrap = $('#sgKelasWrap', m);
        wali.onchange = () => { wrap.style.display = wali.checked ? '' : 'none'; };
        $('#sgSave', m).onclick = async () => {
          const nama = $('#sgNama', m).value.trim();
          if (nama.length < 2) return toast(tr('Isi nama guru.', 'Enter teacher name.'), 'warning');
          const mapel = $('#sgMapel', m).value.trim();
          let waliKelasId = '';
          if (wali.checked) {
            waliKelasId = $('#sgKelas', m)?.value || '';
            if (!waliKelasId) return toast(tr('Pilih kelas yang kamu wali-i.', 'Choose the class you are homeroom of.'), 'warning');
          }
          const btn = $('#sgSave', m); btn.disabled = true;
          try {
            await DB.updateUser({ nama, mapel, waliKelasId, guruSetup: true });
            // Bila jadi wali, catat namanya di dokumen jadwal (merge — entri lama tetap).
            if (waliKelasId) {
              try { await DB.gUpdate('class_schedule', waliKelasId, { classId: waliKelasId, waliNama: nama, updatedAt: new Date().toISOString() }); } catch (_) {}
            }
            closeModal();
            toast(tr('Data guru tersimpan ✅', 'Teacher info saved ✅'));
            onSaved && onSaved();
          } catch (e) { btn.disabled = false; toast(e.message, 'error'); }
        };
      }
    });
  },

  /* ---------- util ---------- */

  _needClass() {
    return `<div class="card empty-state">
      <ion-icon name="people-outline"></ion-icon>
      <div class="es-title">${tr('Belum ada kelas yang diampu', 'No classes selected yet')}</div>
      <div class="es-sub">${tr('Pilih kelas yang kamu ampu dulu di tab "Kelas"', 'Pick the classes you teach first in the "Classes" tab')}</div>
      <button class="btn btn-primary btn-sm" id="goKelas" style="margin-top:14px;"><ion-icon name="albums-outline"></ion-icon> ${tr('Ke Tab Kelas', 'Go to Classes Tab')}</button>
    </div>`;
  },
  _bindNeedClass(el) {
    const b = $('#goKelas', el);
    if (b) b.onclick = () => { this.tab = 'kelas'; this.render(this._el); };
  },

  async renderIbadah(el) {
    // Hentikan polling sebelumnya jika ada
    if (this._ibadahPollTimer) {
      clearInterval(this._ibadahPollTimer);
      this._ibadahPollTimer = null;
    }

    const classes = await this._classes();
    if (!classes.length) { el.innerHTML = this._needClass(); this._bindNeedClass(el); return; }
    if (this.classId && !classes.find(c => c.id === this.classId)) this.classId = null;
    if (!this.classId) {
      el.innerHTML = this._classGate(classes, tr('Ibadah Siswa', 'Student Worship'));
      this._bindClassGate(el); return;
    }
    const activeCls = classes.find(c => c.id === this.classId);
    const students = await this._students(this.classId);

    this.ibadahDate = this.ibadahDate || todayStr();

    el.innerHTML = `
      ${this._classBar(activeCls)}
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
        <div class="field" style="margin:0;"><label>${tr('Tanggal Pantauan', 'Monitoring Date')}</label><input type="date" class="input" id="ibDate" value="${this.ibadahDate}" style="max-width:170px;"></div>
        <button class="btn btn-sm" id="exportIbadah" style="margin-bottom:1px;"><ion-icon name="download-outline"></ion-icon> ${tr('Ekspor CSV', 'Export CSV')}</button>
        <span id="ibStatus" style="font-size:.78rem;color:var(--text-3);align-self:center;">
          <ion-icon name="sync-outline" style="vertical-align:-2px;"></ion-icon> ${tr('auto-refresh 10 detik', 'auto-refresh 10s')}
        </span>
      </div>


      ${!students.length ? `
        <div class="card empty-state"><ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Kelas ini belum punya siswa', 'This class has no students')}</div>
        </div>` : `
        <div style="font-size:.8rem;color:var(--text-3);margin-bottom:10px;">${tr('Menampilkan rekapitulasi amalan ibadah harian dan tilawah siswa.', 'Showing student daily prayers, sunnah deeds, and Qur\'an recitation.')}</div>
        <div class="table-wrap">
          <table class="data-table" id="ibadahTable">
            <thead>
              <tr>
                <th style="width:40px;">No</th>
                <th class="sticky-col" style="min-width:150px;">${tr('Nama', 'Name')}</th>
                <th class="center" style="min-width:140px;">${tr('Sholat Fardhu', 'Fardh Prayers')}</th>
                <th class="center" style="min-width:120px;">${tr('Amalan Sunnah', 'Sunnah Deeds')}</th>
                <th class="center" style="min-width:100px;">${tr('Tilawah Qur\'an', 'Tilawah')}</th>
                <th class="center" style="min-width:100px;">${tr('Hafalan', 'Memorized')}</th>
                <th class="center" style="width:80px;">${tr('Detail', 'Detail')}</th>
              </tr>
            </thead>
            <tbody id="ibadahTableBody">
              <tr><td colspan="7" class="center"><div class="portal-loading"><div class="spinner"></div></div></td></tr>
            </tbody>
          </table>
        </div>`}
    `;

    // Bind filters
    this._bindClassBar(el);
    const dateInput = $('#ibDate', el);
    if (dateInput) {
      dateInput.onchange = e => { this.ibadahDate = e.target.value || todayStr(); this.render(this._el); };
    }

    if (students.length) {
      // Muat data pertama kali
      await this._loadStudentsIbadahData(students, this.ibadahDate);

      // Auto-refresh polling setiap 10 detik untuk update real-time
      this._ibadahPollTimer = setInterval(async () => {
        // Cek apakah tab ibadah masih aktif
        if (this.tab !== 'ibadah') {
          clearInterval(this._ibadahPollTimer);
          this._ibadahPollTimer = null;
          return;
        }
        // Update status indicator
        const status = $('#ibStatus');
        if (status) status.innerHTML = `<ion-icon name="sync-outline" style="vertical-align:-2px;"></ion-icon> ${tr('memperbarui…', 'updating…')}`;

        await this._loadStudentsIbadahData(students, this.ibadahDate);

        if (status) {
          const now = new Date();
          const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
          status.innerHTML = `<ion-icon name="checkmark-circle" style="vertical-align:-2px;color:var(--brand);"></ion-icon> ${tr('update', 'updated')} ${t}`;
          // Reset ke teks default setelah 2 detik
          setTimeout(() => {
            const s = $('#ibStatus');
            if (s) s.innerHTML = `<ion-icon name="sync-outline" style="vertical-align:-2px;"></ion-icon> ${tr('auto-refresh 10 detik', 'auto-refresh 10s')}`;
          }, 2000);
        }
      }, 10000);
    }
  },

  async _loadStudentsIbadahData(students, tanggal) {
    const listHtml = [];
    const csvRows = [];
    let anyError = false;

    csvRows.push([
      tr('No', 'No'),
      tr('Nama', 'Name'),
      'NIS',
      tr('Subuh', 'Fajr'),
      tr('Dzuhur', 'Dhuhr'),
      tr('Ashar', 'Asr'),
      tr('Maghrib', 'Maghrib'),
      tr('Isya', 'Isha'),
      tr('Amalan Sunnah', 'Sunnah Deeds'),
      tr('Tilawah (Lembar)', 'Tilawah (Pages)'),
      tr('Hafalan', 'Memorized')
    ]);

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      let done = {};
      let lembar = 0;
      let hafalanCount = 0;
      let loadError = false;

      try {
        const studentUid = s.userId || s.id;
        if (!studentUid) {
          console.warn('Siswa tanpa userId:', s.nama);
          loadError = true;
          anyError = true;
        } else {
          const ibadahDaily = await DB.listStudentData(studentUid, 'ibadah_daily');
          const dailyRec = ibadahDaily.find(d => d.tanggal === tanggal);
          done = dailyRec?.done || {};

          const quranLog = await DB.listStudentData(studentUid, 'quran_log');
          lembar = quranLog.filter(l => l.tanggal === tanggal).reduce((sum, l) => sum + (l.lembar || 0), 0);

          const hafalan = await DB.listStudentData(studentUid, 'hafalan');
          hafalanCount = hafalan.filter(h => h.status === 'hafal').length;
        }
      } catch (err) {
        console.error('Gagal memuat data ibadah siswa:', s.nama, err.message);
        loadError = true;
        anyError = true;
      }

      const prayers = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
      const prayersDone = prayers.filter(p => done[p]).length;

      const sunnah = ['dzikirPagi', 'dzikirPetang', 'tilawah', 'sedekah', 'dhuha', 'tahajud'];
      const customSunnahDone = Object.keys(done).filter(k => k.startsWith('c_') && done[k]).length;
      const sunnahDone = sunnah.filter(sn => done[sn]).length + customSunnahDone;

      const prayerBullets = prayers.map(p => {
        const check = done[p] ? '✓' : '✗';
        const color = done[p] ? 'var(--brand-dark)' : 'var(--text-3)';
        const title = p.charAt(0).toUpperCase() + p.slice(1);
        return `<span style="color:${color};font-weight:bold;margin:0 4px;" title="${title}">${check}</span>`;
      }).join('');

      listHtml.push(`
        <tr>
          <td class="center">${i + 1}</td>
          <td class="sticky-col">
            <div style="display:flex;align-items:center;gap:8px;">
              ${this._avatarHTML(s)}
              <b>${esc(s.nama)}</b>
            </div>
          </td>
          <td class="center" style="font-size: 1rem; letter-spacing: 2px;">${prayerBullets} <span style="font-size:.75rem;color:var(--text-3);">(${prayersDone}/5)</span></td>
          <td class="center"><span class="badge badge-purple">${sunnahDone} ${tr('amalan', 'deeds')}</span></td>
          <td class="center"><span class="badge badge-blue">${lembar} ${tr('lembar', 'pages')}</span></td>
          <td class="center"><span class="badge badge-green">${hafalanCount} ${tr('surat', 'surahs')}</span></td>
          <td class="center">
            <button class="mini-icon-btn" data-detailib="${s.userId || s.id}" data-sname="${esc(s.nama)}"><ion-icon name="eye-outline"></ion-icon></button>
          </td>
        </tr>
      `);

      csvRows.push([
        i + 1,
        s.nama,
        s.nis || '',
        done.subuh ? 'Hadir' : '-',
        done.dzuhur ? 'Hadir' : '-',
        done.ashar ? 'Hadir' : '-',
        done.maghrib ? 'Hadir' : '-',
        done.isya ? 'Hadir' : '-',
        sunnahDone,
        lembar,
        hafalanCount
      ]);
    }

    const tbody = document.getElementById('ibadahTableBody');
    if (tbody) {
      if (anyError) {
        // Tambahkan baris peringatan di atas tabel
        const warnRow = document.createElement('tr');
        warnRow.innerHTML = `<td colspan="7" style="padding:10px;text-align:center;">
          <div style="background:rgba(245,158,11,.12);border-radius:10px;padding:12px;font-size:.82rem;color:var(--fin);">
            <ion-icon name="warning-outline" style="vertical-align:-2px;"></ion-icon>
            ${tr('Beberapa data siswa gagal dimuat. Pastikan Firestore Rules sudah di-deploy.', 'Some student data failed to load. Make sure Firestore Rules are deployed.')}
          </div>
        </td>`;
        tbody.innerHTML = warnRow.outerHTML + listHtml.join('');
      } else {
        tbody.innerHTML = listHtml.join('');
      }

      document.querySelectorAll('[data-detailib]').forEach(b => {
        b.onclick = () => this._detailIbadahModal(b.dataset.detailib, b.dataset.sname, tanggal);
      });
    }

    const exp = document.getElementById('exportIbadah');
    if (exp) {
      exp.onclick = () => {
        const cls = Teacher._activeClsNama || 'kelas';
        downloadCSV(csvRows, `ibadah_${cls.replace(/\s+/g, '_')}_${tanggal}.csv`);
        toast(tr('Data ibadah diekspor 📊', 'Worship data exported 📊'));
      };
    }
  },

  async _detailIbadahModal(studentUid, studentName, tanggal) {
    openModal({
      title: tr(`Detail Ibadah: ${studentName}`, `Worship Detail: ${studentName}`),
      body: `<div class="portal-loading"><div class="spinner"></div> ${tr('Memuat data detail…', 'Loading details…')}</div>`,
      onMount: async (m) => {
        let done = {};
        let quranLogs = [];
        let hafalan = [];

        try {
          const ibadahDaily = await DB.listStudentData(studentUid, 'ibadah_daily');
          const dailyRec = ibadahDaily.find(d => d.tanggal === tanggal);
          done = dailyRec?.done || {};

          quranLogs = await DB.listStudentData(studentUid, 'quran_log');
          hafalan = await DB.listStudentData(studentUid, 'hafalan');
        } catch (e) {
          console.error(e);
        }

        const modalBody = m.querySelector('.modal-body');
        if (!modalBody) return;

        const customDone = Object.keys(done).filter(k => k.startsWith('c_') && done[k]);

        const sholatHtml = this.FARDHU.map(f => {
          const ok = done[f.key];
          return `<div class="list-item" style="padding:10px 12px; margin-bottom: 6px;">
            <span>${f.emoji} ${esc(tr(f.id, f.en))}</span>
            <span class="badge ${ok ? 'badge-green' : 'badge-gray'}">${ok ? tr('Sudah', 'Done') : tr('Belum', 'Not yet')}</span>
          </div>`;
        }).join('');

        const sunnahList = [
          { key: 'dzikirPagi',  id: 'Dzikir pagi',   en: 'Morning dhikr',   emoji: '🌄' },
          { key: 'dzikirPetang',id: 'Dzikir petang', en: 'Evening dhikr',   emoji: '🌆' },
          { key: 'tilawah',     id: 'Tilawah Qur\'an', en: 'Qur\'an recitation', emoji: '📖' },
          { key: 'sedekah',     id: 'Sedekah',       en: 'Charity',         emoji: '🤲' },
          { key: 'dhuha',       id: 'Sholat Dhuha',  en: 'Dhuha prayer',    emoji: '🕗' },
          { key: 'tahajud',     id: 'Sholat Tahajud',en: 'Tahajjud prayer', emoji: '🌌' }
        ];

        const sunnahHtml = sunnahList.map(a => {
          const ok = done[a.key];
          return `<div class="list-item" style="padding:10px 12px; margin-bottom: 6px;">
            <span>${a.emoji} ${esc(tr(a.id, a.en))}</span>
            <span class="badge ${ok ? 'badge-purple' : 'badge-gray'}">${ok ? tr('Sudah', 'Done') : tr('Belum', 'Not yet')}</span>
          </div>`;
        }).join('') + (customDone.length ? `<div style="font-weight:700; font-size:.8rem; margin:10px 0 6px;">${tr('Amalan Kustom:', 'Custom Deeds:')}</div>` + customDone.map(k => {
          return `<div class="list-item" style="padding:10px 12px; margin-bottom: 6px;">
            <span>⭐ ${esc(k.substring(2))}</span>
            <span class="badge badge-purple">${tr('Sudah', 'Done')}</span>
          </div>`;
        }).join('') : '');

        const tilawahToday = quranLogs.filter(l => l.tanggal === tanggal);
        const tilawahHtml = tilawahToday.length ? tilawahToday.map(l => `
          <div class="list-item" style="padding:10px 12px; margin-bottom: 6px;">
            <div style="flex:1;">
              <div style="font-weight:700;font-size:.85rem;">📖 ${l.lembar} ${tr('lembar', 'pages')}</div>
              ${l.catatan ? `<div style="font-size:.72rem;color:var(--text-3);">${esc(l.catatan)}</div>` : ''}
            </div>
          </div>
        `).join('') : `<div style="font-size:.82rem;color:var(--text-3);text-align:center;padding:12px;">${tr('Belum ada tilawah hari ini', 'No recitation today')}</div>`;

        const hafalList = hafalan.filter(h => h.status === 'hafal');
        const hafalanHtml = hafalList.length ? hafalList.map(h => `
          <div class="list-item" style="padding:10px 12px; margin-bottom: 6px;">
            <div style="flex:1;">
              <div style="font-weight:700;font-size:.85rem;">🧠 ${esc(h.nama)}</div>
              ${h.catatan ? `<div style="font-size:.72rem;color:var(--text-3);">${esc(h.catatan)}</div>` : ''}
            </div>
          </div>
        `).join('') : `<div style="font-size:.82rem;color:var(--text-3);text-align:center;padding:12px;">${tr('Belum ada hafalan tuntas', 'No memorized surahs')}</div>`;

        modalBody.innerHTML = `
          <div style="font-size:.85rem;color:var(--text-3);margin-bottom:14px;">${tr('Rekapitulasi tanggal:', 'Recap date:')} <b>${fmtDate(tanggal, { weekday: true })}</b></div>
          <div class="grid grid-2" style="gap:14px;align-items:start;">
            <div>
              <h4 style="margin: 0 0 10px 0; color: var(--brand-dark);">🕌 ${tr('Sholat Fardhu', 'Fardh Prayers')}</h4>
              ${sholatHtml}

              <h4 style="margin: 18px 0 10px 0; color: var(--brand-dark);">📖 ${tr('Tilawah Qur\'an', 'Qur\'an Recitation')}</h4>
              ${tilawahHtml}
            </div>
            <div>
              <h4 style="margin: 0 0 10px 0; color: var(--brand-dark);">✨ ${tr('Amalan Sunnah', 'Sunnah Deeds')}</h4>
              ${sunnahHtml}

              <h4 style="margin: 18px 0 10px 0; color: var(--brand-dark);">🧠 ${tr('Daftar Hafalan', 'Memorized')}</h4>
              ${hafalanHtml}
            </div>
          </div>
        `;
      }
    });
  },

  /* ============ TAB: KESEHATAN SISWA ============ */

  async renderKesehatan(el) {
    // Hentikan polling sebelumnya jika ada
    if (this._healthPollTimer) {
      clearInterval(this._healthPollTimer);
      this._healthPollTimer = null;
    }

    const classes = await this._classes();
    if (!classes.length) { el.innerHTML = this._needClass(); this._bindNeedClass(el); return; }
    if (this.classId && !classes.find(c => c.id === this.classId)) this.classId = null;
    if (!this.classId) {
      el.innerHTML = this._classGate(classes, tr('Kesehatan Siswa', 'Student Health'));
      this._bindClassGate(el); return;
    }
    const activeCls = classes.find(c => c.id === this.classId);
    const students = await this._students(this.classId);

    this.healthDate = this.healthDate || todayStr();

    el.innerHTML = `
      ${this._classBar(activeCls)}
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
        <div class="field" style="margin:0;"><label>${tr('Tanggal Pantauan', 'Monitoring Date')}</label><input type="date" class="input" id="healthDate" value="${this.healthDate}" style="max-width:170px;"></div>
        <button class="btn btn-sm" id="exportHealth" style="margin-bottom:1px;"><ion-icon name="download-outline"></ion-icon> ${tr('Ekspor CSV', 'Export CSV')}</button>
        <span id="healthStatus" style="font-size:.78rem;color:var(--text-3);align-self:center;">
          <ion-icon name="sync-outline" style="vertical-align:-2px;"></ion-icon> ${tr('auto-refresh 10 detik', 'auto-refresh 10s')}
        </span>
      </div>


      ${!students.length ? `
        <div class="card empty-state"><ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Kelas ini belum punya siswa', 'This class has no students')}</div>
        </div>` : `
        <div style="font-size:.8rem;color:var(--text-3);margin-bottom:10px;">${tr('Menampilkan ringkasan kesehatan harian siswa: air minum, kalori, tidur, olahraga & mood.', 'Showing student daily health summary: water, calories, sleep, exercise & mood.')}</div>
        <div class="table-wrap">
          <table class="data-table" id="healthTable">
            <thead>
              <tr>
                <th style="width:40px;">No</th>
                <th class="sticky-col" style="min-width:150px;">${tr('Nama', 'Name')}</th>
                <th class="center" style="min-width:90px;">${tr('Air', 'Water')}</th>
                <th class="center" style="min-width:90px;">${tr('Kalori', 'Calories')}</th>
                <th class="center" style="min-width:90px;">${tr('Tidur', 'Sleep')}</th>
                <th class="center" style="min-width:100px;">${tr('Olahraga', 'Exercise')}</th>
                <th class="center" style="min-width:90px;">${tr('Mood', 'Mood')}</th>
                <th class="center" style="width:80px;">${tr('Detail', 'Detail')}</th>
              </tr>
            </thead>
            <tbody id="healthTableBody">
              <tr><td colspan="8" class="center"><div class="portal-loading"><div class="spinner"></div></div></td></tr>
            </tbody>
          </table>
        </div>`}
    `;

    // Bind filters
    this._bindClassBar(el);
    const dateInput = $('#healthDate', el);
    if (dateInput) {
      dateInput.onchange = e => { this.healthDate = e.target.value || todayStr(); this.render(this._el); };
    }

    if (students.length) {
      // Muat data pertama kali
      await this._loadStudentsHealthData(students, this.healthDate);

      // Auto-refresh polling setiap 10 detik untuk update real-time
      this._healthPollTimer = setInterval(async () => {
        if (this.tab !== 'kesehatan') {
          clearInterval(this._healthPollTimer);
          this._healthPollTimer = null;
          return;
        }
        const status = $('#healthStatus');
        if (status) status.innerHTML = `<ion-icon name="sync-outline" style="vertical-align:-2px;"></ion-icon> ${tr('memperbarui…', 'updating…')}`;

        await this._loadStudentsHealthData(students, this.healthDate);

        if (status) {
          const now = new Date();
          const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
          status.innerHTML = `<ion-icon name="checkmark-circle" style="vertical-align:-2px;color:var(--brand);"></ion-icon> ${tr('update', 'updated')} ${t}`;
          setTimeout(() => {
            const s = $('#healthStatus');
            if (s) s.innerHTML = `<ion-icon name="sync-outline" style="vertical-align:-2px;"></ion-icon> ${tr('auto-refresh 10 detik', 'auto-refresh 10s')}`;
          }, 2000);
        }
      }, 10000);
    }
  },

  _moodEmoji(v) {
    const map = { 5: '😄', 4: '🙂', 3: '😐', 2: '😟', 1: '😢' };
    return map[v] || '—';
  },

  // Mood terbaru siswa untuk sebuah tanggal. Cocokkan berdasarkan tanggal
  // LOKAL dari `waktu` (bukan slice UTC) agar mood dini hari WIB tetap terhitung
  // pada hari yang benar. Mengembalikan record mood atau undefined.
  _moodOnDate(biometrics, tanggal) {
    return biometrics
      .filter(b => b.jenis === 'mood' && b.waktu)
      .sort((a, b) => (b.waktu < a.waktu ? -1 : 1))
      .find(b => todayStr(new Date(b.waktu)) === tanggal);
  },

  async _loadStudentsHealthData(students, tanggal) {
    const listHtml = [];
    const csvRows = [];
    let anyError = false;

    csvRows.push([
      tr('No', 'No'),
      tr('Nama', 'Name'),
      'NIS',
      tr('Air (gelas)', 'Water (glasses)'),
      tr('Kalori (kkal)', 'Calories (kcal)'),
      tr('Tidur (jam)', 'Sleep (hours)'),
      tr('Olahraga (menit)', 'Exercise (minutes)'),
      tr('Mood', 'Mood')
    ]);

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      let daily = { kalori: 0, air: 0, tidur: 0, olahraga: 0 };
      let moodValue = null;
      let loadError = false;

      try {
        const studentUid = s.userId || s.id;
        if (!studentUid) {
          console.warn('Siswa tanpa userId:', s.nama);
          loadError = true;
          anyError = true;
        } else {
          const healthDaily = await DB.listStudentData(studentUid, 'health_daily');
          const dailyRec = healthDaily.find(d => d.tanggal === tanggal);
          if (dailyRec) daily = { ...daily, ...dailyRec };

          const biometrics = await DB.listStudentData(studentUid, 'biometrics');
          const moodRec = this._moodOnDate(biometrics, tanggal);
          if (moodRec) moodValue = moodRec.nilai;
        }
      } catch (err) {
        console.error('Gagal memuat data kesehatan siswa:', s.nama, err.message);
        loadError = true;
        anyError = true;
      }

      const airText = daily.air ? `${daily.air} ${tr('gelas', 'glasses')}` : '—';
      const kalText = daily.kalori ? `${daily.kalori.toLocaleString('id-ID')}` : '—';
      const tidurText = daily.tidur ? `${daily.tidur} ${tr('jam', 'hrs')}` : '—';
      const olahragaText = daily.olahraga ? `${daily.olahraga} ${tr('menit', 'min')}` : '—';

      listHtml.push(`
        <tr>
          <td class="center">${i + 1}</td>
          <td class="sticky-col">
            <div style="display:flex;align-items:center;gap:8px;">
              ${this._avatarHTML(s)}
              <b>${esc(s.nama)}</b>
            </div>
          </td>
          <td class="center">${airText}</td>
          <td class="center">${kalText}</td>
          <td class="center">${tidurText}</td>
          <td class="center">${olahragaText}</td>
          <td class="center">${moodValue ? `<span title="${tr('Mood hari ini', 'Today\'s mood')}">${this._moodEmoji(moodValue)}</span>` : '—'}</td>
          <td class="center">
            <button class="mini-icon-btn" data-detailhealth="${s.userId || s.id}" data-sname="${esc(s.nama)}"><ion-icon name="eye-outline"></ion-icon></button>
          </td>
        </tr>
      `);

      csvRows.push([
        i + 1,
        s.nama,
        s.nis || '',
        daily.air || 0,
        daily.kalori || 0,
        daily.tidur || 0,
        daily.olahraga || 0,
        moodValue || ''
      ]);
    }

    const tbody = document.getElementById('healthTableBody');
    if (tbody) {
      if (anyError) {
        const warnRow = document.createElement('tr');
        warnRow.innerHTML = `<td colspan="8" style="padding:10px;text-align:center;">
          <div style="background:rgba(245,158,11,.12);border-radius:10px;padding:12px;font-size:.82rem;color:var(--fin);">
            <ion-icon name="warning-outline" style="vertical-align:-2px;"></ion-icon>
            ${tr('Beberapa data siswa gagal dimuat. Pastikan Firestore Rules sudah di-deploy.', 'Some student data failed to load. Make sure the Firestore Rules are deployed.')}
          </div>
        </td>`;
        tbody.innerHTML = warnRow.outerHTML + listHtml.join('');
      } else {
        tbody.innerHTML = listHtml.join('');
      }

      document.querySelectorAll('[data-detailhealth]').forEach(b => {
        b.onclick = () => this._detailKesehatanModal(b.dataset.detailhealth, b.dataset.sname, tanggal);
      });
    }

    const exp = document.getElementById('exportHealth');
    if (exp) {
      exp.onclick = () => {
        const cls = Teacher._activeClsNama || 'kelas';
        downloadCSV(csvRows, `kesehatan_${cls.replace(/\s+/g, '_')}_${tanggal}.csv`);
        toast(tr('Data kesehatan diekspor 📊', 'Health data exported 📊'));
      };
    }
  },

  async _detailKesehatanModal(studentUid, studentName, tanggal) {
    openModal({
      title: tr(`Detail Kesehatan: ${studentName}`, `Health Detail: ${studentName}`),
      body: `<div class="portal-loading"><div class="spinner"></div> ${tr('Memuat data detail…', 'Loading details…')}</div>`,
      onMount: async (m) => {
        const modalBody = m.querySelector('.modal-body');
        if (!modalBody) return;

        const load = async () => {
        let daily = null;
        let workouts = [];
        let weights = [];
        let biometrics = [];
        let meds = [];
        let foods = [];
        let menstrual = [];

        try {
          const healthDaily = await DB.listStudentData(studentUid, 'health_daily');
          daily = healthDaily.find(d => d.tanggal === tanggal) || { kalori: 0, air: 0, tidur: 0, olahraga: 0 };

          workouts = (await DB.listStudentData(studentUid, 'workouts')).sort((a, b) => (b.tanggal || '') < (a.tanggal || '') ? -1 : 1);
          weights = (await DB.listStudentData(studentUid, 'weights')).sort((a, b) => (b.tanggal || '') < (a.tanggal || '') ? -1 : 1);
          biometrics = (await DB.listStudentData(studentUid, 'biometrics')).sort((a, b) => (b.waktu || '') < (a.waktu || '') ? -1 : 1);
          meds = await DB.listStudentData(studentUid, 'meds');
          foods = (await DB.listStudentData(studentUid, 'foods')).filter(f => f.tanggal === tanggal);
          menstrual = (await DB.listStudentData(studentUid, 'menstrual')).sort((a, b) => (b.mulai || '') < (a.mulai || '') ? -1 : 1);
        } catch (e) {
          console.error(e);
        }

        if (!m.isConnected) return; // modal ditutup saat fetch berlangsung

        const todayMood = this._moodOnDate(biometrics, tanggal);
        const moodHtml = todayMood ? `<span style="font-size:1.4rem;">${this._moodEmoji(todayMood.nilai)}</span>` : '—';

        const recentBiometrics = biometrics.filter(b => b.jenis !== 'mood').slice(0, 10);
        const bioLabels = { hr: 'Detak jantung', spo2: 'Oksigen darah', bp: 'Tekanan darah', sugar: 'Gula darah', steps: 'Langkah' };
        const bioUnits = { hr: 'bpm', spo2: '%', sugar: 'mg/dL', steps: 'langkah' };

        const renderList = (items, renderFn, emptyText) => items.length ? items.map(renderFn).join('') : `<div style="font-size:.82rem;color:var(--text-3);text-align:center;padding:12px;">${emptyText}</div>`;

        const _scrollTop = modalBody.scrollTop; // pertahankan posisi scroll saat auto-refresh
        modalBody.innerHTML = `
          <div style="font-size:.85rem;color:var(--text-3);margin-bottom:14px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">
            <span>${tr('Rekapitulasi tanggal:', 'Recap date:')} <b>${fmtDate(tanggal, { weekday: true })}</b></span>
            <span style="font-size:.72rem;"><ion-icon name="sync-outline" style="vertical-align:-2px;"></ion-icon> ${tr('auto-refresh 10 detik', 'auto-refresh 10s')}</span>
          </div>

          <div class="grid grid-2" style="gap:14px;align-items:start;">
            <div>
              <h4 style="margin: 0 0 10px 0; color: var(--brand-dark);">💧 ${tr('Ringkasan Harian', 'Daily Summary')}</h4>
              <div class="list-item" style="padding:10px 12px; margin-bottom: 6px;"><span>${tr('Air minum', 'Water intake')}</span><span class="badge badge-blue">${daily.air || 0} ${tr('gelas', 'glasses')}</span></div>
              <div class="list-item" style="padding:10px 12px; margin-bottom: 6px;"><span>${tr('Kalori', 'Calories')}</span><span class="badge badge-amber">${daily.kalori ? daily.kalori.toLocaleString('id-ID') : 0} kkal</span></div>
              <div class="list-item" style="padding:10px 12px; margin-bottom: 6px;"><span>${tr('Tidur', 'Sleep')}</span><span class="badge badge-purple">${daily.tidur || 0} ${tr('jam', 'hours')}</span></div>
              <div class="list-item" style="padding:10px 12px; margin-bottom: 6px;"><span>${tr('Olahraga', 'Exercise')}</span><span class="badge badge-green">${daily.olahraga || 0} ${tr('menit', 'minutes')}</span></div>
              <div class="list-item" style="padding:10px 12px; margin-bottom: 6px;"><span>${tr('Mood hari ini', 'Today\'s mood')}</span><span>${moodHtml}</span></div>
            </div>

            <div>
              <h4 style="margin: 0 0 10px 0; color: var(--brand-dark);">🏃 ${tr('Latihan Terbaru', 'Recent Workouts')}</h4>
              ${renderList(workouts.slice(0, 5), w => `
                <div class="list-item" style="padding:10px 12px; margin-bottom: 6px;">
                  <span>${esc(w.jenis || 'Latihan')}</span>
                  <span class="badge badge-green">${w.durasi} ${tr('menit', 'min')}</span>
                </div>
              `, tr('Belum ada latihan tercatat', 'No workouts recorded'))}
            </div>
          </div>

          <h4 style="margin: 18px 0 10px 0; color: var(--brand-dark);">📈 ${tr('Tren Berat Badan', 'Weight Trend')}</h4>
          ${renderList(weights.slice(0, 5), w => `
            <div class="list-item" style="padding:10px 12px; margin-bottom: 6px;">
              <span>${fmtDate(w.tanggal, { short: true })}</span>
              <span class="badge badge-purple">${w.berat} kg</span>
            </div>
          `, tr('Belum ada catatan berat', 'No weight records'))}

          <h4 style="margin: 18px 0 10px 0; color: var(--brand-dark);">🩺 ${tr('Biometrik Terbaru', 'Recent Biometrics')}</h4>
          ${renderList(recentBiometrics, b => {
            const label = bioLabels[b.jenis] || b.jenis;
            const unit = bioUnits[b.jenis] || '';
            const val = b.jenis === 'bp' ? `${b.nilai}/${b.nilai2} mmHg` : `${b.nilai}${unit ? ' ' + unit : ''}`;
            return `<div class="list-item" style="padding:10px 12px; margin-bottom: 6px;">
              <span>${label}</span>
              <span class="badge badge-blue">${val}</span>
            </div>`;
          }, tr('Belum ada data biometrik', 'No biometric records'))}

          <h4 style="margin: 18px 0 10px 0; color: var(--brand-dark);">🍽️ ${tr('Makanan Hari Ini', 'Today\'s Food')}</h4>
          ${renderList(foods, f => `
            <div class="list-item" style="padding:10px 12px; margin-bottom: 6px;">
              <span>${f.emoji || '🍽️'} ${esc(f.nama)}</span>
              <span class="badge badge-amber">${f.kalori} kkal</span>
            </div>
          `, tr('Belum ada makanan tercatat hari ini', 'No food recorded today'))}

          <h4 style="margin: 18px 0 10px 0; color: var(--brand-dark);">💊 ${tr('Obat / Vitamin', 'Meds / Vitamins')}</h4>
          ${renderList(meds.slice(0, 5), md => `
            <div class="list-item" style="padding:10px 12px; margin-bottom: 6px;">
              <span>${esc(md.nama)}${md.dosis ? ` · ${esc(md.dosis)}` : ''}</span>
              <span class="badge badge-green">${(md.waktu || []).join(', ') || tr('Sesuai jadwal', 'As scheduled')}</span>
            </div>
          `, tr('Belum ada obat tercatat', 'No medications recorded'))}

          <h4 style="margin: 18px 0 10px 0; color: var(--brand-dark);">🌸 ${tr('Siklus Menstruasi', 'Menstrual Cycle')}</h4>
          ${renderList(menstrual.slice(0, 3), mc => `
            <div class="list-item" style="padding:10px 12px; margin-bottom: 6px;">
              <span>${tr('Mulai haid', 'Period start')}: ${fmtDate(mc.mulai, { short: true })}</span>
            </div>
          `, tr('Belum ada catatan siklus', 'No cycle records'))}
        `;
        modalBody.scrollTop = _scrollTop;
        };

        await load();
        // Auto-refresh tiap 10 detik selama modal detail terbuka → mood & data
        // lain ikut ter-update real-time. Berhenti otomatis saat modal ditutup.
        const timer = setInterval(() => {
          if (!m.isConnected) { clearInterval(timer); return; }
          load();
        }, 10000);
      }
    });
  },

  _passwordModal() {
    openModal({
      title: tr('Ganti Kata Sandi', 'Change Password'),
      body: `
        <div class="field"><label>${tr('Kata sandi lama', 'Old password')}</label><input type="password" class="input" id="mOld" autocomplete="current-password"></div>
        <div class="field"><label>${tr('Kata sandi baru', 'New password')}</label><input type="password" class="input" id="mNew" placeholder="${tr('Minimal 6 karakter', 'At least 6 characters')}" autocomplete="new-password"></div>
        <div class="field"><label>${tr('Ulangi kata sandi baru', 'Repeat new password')}</label><input type="password" class="input" id="mNew2" autocomplete="new-password"></div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan', 'Save')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const oldP = $('#mOld', m).value, newP = $('#mNew', m).value;
          if (newP.length < 6) return toast(tr('Kata sandi baru minimal 6 karakter.', 'New password must be at least 6 characters.'), 'warning');
          if (newP !== $('#mNew2', m).value) return toast(tr('Ulangan kata sandi tidak sama.', "Passwords don't match."), 'warning');
          try { await DB.changePassword(oldP, newP); closeModal(); toast(tr('Kata sandi berhasil diganti 🔒', 'Password changed 🔒')); }
          catch (err) { toast(err.message, 'error'); }
        };
      }
    });
  }
};
