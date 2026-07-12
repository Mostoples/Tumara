/* ============================================================
   TUMARA — App (router utama & shell)
   Mengatur layar auth/onboarding/app, navigasi, tema,
   dan pengingat minum.
   ============================================================ */

const App = {
  route: 'dashboard',
  _reminderId: null,

  TITLES: {
    dashboard:    [() => tr('Beranda', 'Home'),                   () => fmtDate(todayStr(), { weekday: true })],
    health:       [() => tr('Kesehatan', 'Health'),               () => tr('Tubuh sehat, semangat kuat 💪', 'Healthy body, strong spirit 💪')],
    productivity: [() => tr('Produktivitas', 'Productivity'),     () => tr('Tugas, catatan, jadwal & fokus', 'Tasks, notes, schedule & focus')],
    finance:      [() => tr('Keuangan', 'Finance'),               () => tr('Uang saku terpantau, nabung jalan terus', 'Allowance tracked, savings on track')],
    ibadah:       [() => tr('Ibadah', 'Worship'),                 () => tr('Sholat, Al-Qur\'an, dzikir & zakat', 'Prayer, Qur\'an, dhikr & zakat')],
    encyclopedia: [() => tr('Ensiklopedia', 'Encyclopedia'),      () => tr('Pengetahuan seputar sehat, belajar & uang', 'Knowledge on health, study & money')],
    profile:      [() => tr('Profil', 'Profile'),                 () => tr('Data diri & pengaturan aplikasi', 'Personal data & app settings')]
  },

  VIEWS: {
    dashboard:    () => Dashboard,
    health:       () => Health,
    productivity: () => Prod,
    finance:      () => Fin,
    ibadah:       () => Ibadah,
    encyclopedia: () => Ency,
    profile:      () => Profile
  },

  async init() {
    this.setTheme(localStorage.getItem('tumara_theme') || 'light');
    try {
      await DB.init();
    } catch (e) {
      toast(tr('Gagal terhubung ke server. Periksa koneksi internetmu.',
               'Could not connect to the server. Please check your internet connection.'), 'error');
      return;
    }
    if (!DB.user) return this.showAuth();
    // app.html hanya untuk siswa; admin & guru diarahkan ke halamannya.
    const role = DB.user.role || 'siswa';
    if (role !== 'siswa') { location.replace(roleHome(role)); return; }
    this.afterAuth();
  },

  /* ---------- pergantian layar ---------- */

  // Halaman auth kini terpisah (auth.html)
  showAuth() {
    location.replace('auth.html');
  },

  afterAuth() {
    // Terapkan tema & bahasa yang tersimpan di akun (ikut akun lintas perangkat)
    if (DB.user.tema) this.setTheme(DB.user.tema);
    if (DB.user.bahasa && DB.user.bahasa !== I18N.lang) I18N.set(DB.user.bahasa, { save: false });
    if (!DB.user.profileComplete) {
      $('#appShell').classList.add('hidden');
      $('#onboardScreen').classList.remove('hidden');
      OnboardView.render();
    } else {
      this.showApp();
    }
  },

  showApp() {
    $('#onboardScreen').classList.add('hidden');
    $('#appShell').classList.remove('hidden');

    const u = DB.user;
    const avatar = Profile._avatarHTML(u);
    $('#topAvatar').innerHTML = avatar;
    $('#sidebarUser').innerHTML = `
      <div class="avatar">${avatar}</div>
      <div style="min-width:0;">
        <div class="u-name">${esc(u.nama)}</div>
        <div class="u-school">${esc(u.sekolah || u.email)}</div>
      </div>`;

    // navigasi (sidebar + bottom nav + menu kolom "lainnya")
    $$('.nav-link, .bnav-item, .bnav-sheet-item').forEach(a => a.onclick = () => this.navigate(a.dataset.route));

    // Tombol tengah bottom-nav: buka/tutup menu route lainnya
    const moreBtn = $('#bnavMore');
    if (moreBtn) {
      moreBtn.onclick = (e) => { e.stopPropagation(); this.toggleMoreSheet(); };
      // Tutup saat menyentuh area lain (pasang sekali saja)
      if (!this._moreSheetBound) {
        this._moreSheetBound = true;
        document.addEventListener('click', (e) => {
          const sheet = $('#bnavSheet'), btn = $('#bnavMore');
          if (sheet && sheet.classList.contains('open') &&
              !sheet.contains(e.target) && !btn.contains(e.target)) {
            this.toggleMoreSheet(false);
          }
        });
      }
    }

    // tema, bahasa & profil
    $('#themeToggle').onclick = () => this.toggleTheme();
    $('#topThemeBtn').onclick = () => this.toggleTheme();
    $('#topLangBtn').onclick = () => this.toggleLang();
    $('#topAvatar').onclick = () => this.navigate('profile');
    $('#sidebarUser').onclick = () => this.navigate('profile');

    this._observeTabs();

    // Rute awal mengikuti URL hash (mis. #health atau #health/sleep) agar
    // refresh tetap di halaman & tab yang sama, bukan selalu balik ke Beranda.
    const fromHash = (location.hash || '').replace(/^#/, '');
    const route0 = fromHash.split('/')[0];
    this.navigate(this.VIEWS[route0] ? fromHash : 'dashboard');
    if (u.reminderAir) this.startWaterReminder();
    this.startMedReminder();
  },

  /* ---------- auto-center tab aktif (mobile) ---------- */

  // Setiap kali view dirender ulang (klik tab / navigate / refresh), geser
  // tab bar yang overflow agar tab aktif berada di tengah — tak perlu geser manual.
  _observeTabs() {
    if (this._tabObserver) return;
    const view = $('#view');
    if (!view) return;
    this._tabObserver = new MutationObserver(() => this._centerActiveTabs());
    this._tabObserver.observe(view, { childList: true });
    this._centerActiveTabs();
  },

  _centerActiveTabs() {
    requestAnimationFrame(() => {
      $$('#view .tabs').forEach(bar => {
        if (bar.scrollWidth <= bar.clientWidth + 4) return; // tidak overflow → biarkan
        const active = bar.querySelector('.tab.active');
        if (!active) return;
        const target = active.offsetLeft + active.offsetWidth / 2 - bar.clientWidth / 2;
        bar.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
      });
    });
  },

  /* ---------- navigasi & render ---------- */

  navigate(routeSpec) {
    // routeSpec bisa 'health' atau 'health/sleep' (rute + tab, dari URL hash saat refresh).
    let [route, tab] = String(routeSpec).split('/');
    if (!this.VIEWS[route]) { route = 'dashboard'; tab = undefined; }
    this.route = route;

    const view = this.VIEWS[route]();
    // Bila tab diberikan (mis. dari hash saat refresh) & view mengenal konsep tab, pulihkan.
    if (tab && typeof view.tab !== 'undefined') view.tab = tab;

    // Tulis hash: rute + tab aktif view (bila ada) agar bertahan saat refresh.
    this._writeHash(route, typeof view.tab !== 'undefined' ? view.tab : undefined);

    $$('.nav-link, .bnav-item, .bnav-sheet-item').forEach(a =>
      a.classList.toggle('active', a.dataset.route === route));

    // Tandai tombol tengah bila route aktif ada di dalam menu "lainnya", lalu tutup menu.
    const moreBtn = $('#bnavMore');
    if (moreBtn) {
      const inSheet = !!$('#bnavSheet')?.querySelector(`.bnav-sheet-item[data-route="${route}"]`);
      moreBtn.classList.toggle('has-active', inSheet);
    }
    this.toggleMoreSheet(false);

    const [judul, sub] = this.TITLES[route];
    $('#pageTitle').textContent = judul();
    $('#pageSub').textContent = sub();

    view.render($('#view'));
    window.scrollTo({ top: 0 });
  },

  // Buka/tutup menu kolom "lainnya" di bottom-nav (mobile).
  // Tanpa argumen → toggle; toggleMoreSheet(true/false) → paksa buka/tutup.
  toggleMoreSheet(open) {
    const sheet = $('#bnavSheet'), btn = $('#bnavMore');
    if (!sheet || !btn) return;
    const show = open === undefined ? !sheet.classList.contains('open') : open;
    sheet.classList.toggle('open', show);
    btn.classList.toggle('open', show);
    // Ikon grid (banyak bagian) ↔ silang (tutup)
    const icon = $('#bnavMoreIcon');
    if (icon) icon.setAttribute('name', show ? 'close' : 'apps');
  },

  // Sinkronkan URL hash (tanpa menambah riwayat).
  _writeHash(route, tab) {
    const h = tab ? `${route}/${tab}` : route;
    if ((location.hash || '').replace(/^#/, '') !== h) history.replaceState(null, '', '#' + h);
  },

  // Dipanggil view saat tab berpindah agar tab aktif ikut tersimpan di URL.
  saveTab(tab) {
    this._writeHash(this.route, tab);
  },

  // render ulang view rute aktif (dipanggil view setelah simpan/hapus)
  refresh() {
    this.VIEWS[this.route]().render($('#view'));
  },

  /* ---------- tema ---------- */

  setTheme(t) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem('tumara_theme', t); // cache agar tampilan awal tidak berkedip
    // Simpan juga ke profil akun (Firestore) bila sudah login & berubah
    if (DB.user && DB.user.tema !== t) DB.updateUser({ tema: t }).catch(() => {});
    const dark = t === 'dark';
    const icon = $('#themeIcon'), label = $('#themeLabel'), topIcon = $('#topThemeBtn ion-icon');
    if (icon)  icon.setAttribute('name', dark ? 'sunny-outline' : 'moon-outline');
    if (label) label.textContent = dark ? tr('Mode terang', 'Light mode') : tr('Mode gelap', 'Dark mode');
    if (topIcon) topIcon.setAttribute('name', dark ? 'sunny-outline' : 'moon-outline');
  },

  toggleTheme() {
    this.setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  },

  /* ---------- bahasa ---------- */

  toggleLang() {
    I18N.toggle(); // sekaligus tersimpan ke localStorage + profil akun
    // Segarkan label tema & render ulang halaman aktif dalam bahasa baru
    this.setTheme(document.documentElement.dataset.theme || 'light');
    if (!$('#appShell').classList.contains('hidden')) this.navigate(this.route);
    else if (!$('#onboardScreen').classList.contains('hidden')) OnboardView.render();
  },

  /* ---------- pengingat minum ---------- */

  // Kirim notifikasi browser bila diizinkan; kembalikan true bila terkirim.
  notify(body, { title = 'Tumara 💧' } = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: 'assets/logo.png', tag: 'tumara-water' });
        return true;
      } catch (_) { /* sebagian browser mobile butuh service worker — abaikan */ }
    }
    return false;
  },

  startWaterReminder() {
    this.stopWaterReminder();
    const menit = DB.user?.reminderInterval || 60;
    this._reminderId = setInterval(() => {
      const pesan = tr('Waktunya minum 💧 Satu gelas dulu, yuk!', 'Time to hydrate 💧 Grab a glass of water!');
      // Notifikasi browser bila diizinkan; jika tidak, tampilkan toast dalam app.
      if (!this.notify(pesan)) toast(pesan, 'info');
    }, menit * 60 * 1000);
  },

  stopWaterReminder() {
    if (this._reminderId) { clearInterval(this._reminderId); this._reminderId = null; }
  },

  /* ---------- pengingat obat ---------- */

  async _checkMedReminder() {
    let meds;
    try { meds = await DB.list('meds'); } catch (_) { return; }
    if (!meds || !meds.length) return;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = todayStr();
    this._medNotified = this._medNotified || new Set();
    meds.forEach(md => {
      (md.waktu || []).forEach(w => {
        if (w !== hhmm) return;
        const key = `${md.id}_${w}_${today}`;
        if (this._medNotified.has(key)) return;
        this._medNotified.add(key);
        const taken = (md.riwayat || {})[today] || [];
        if (taken.includes(w)) return;
        const pesan = tr(`Waktunya minum ${md.nama}${md.dosis ? ' · ' + md.dosis : ''} (${w}) 💊`,
                         `Time for ${md.nama}${md.dosis ? ' · ' + md.dosis : ''} (${w}) 💊`);
        if (!this.notify(pesan, { title: 'Tumara 💊' })) toast(pesan, 'info');
      });
    });
  },

  startMedReminder() {
    this.stopMedReminder();
    this._medReminderId = setInterval(() => this._checkMedReminder(), 30 * 1000);
  },

  stopMedReminder() {
    if (this._medReminderId) { clearInterval(this._medReminderId); this._medReminderId = null; }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
