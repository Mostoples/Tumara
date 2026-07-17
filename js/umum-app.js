/* ============================================================
   TUMARA — Router jalur Umum (umum-app.html)
   ------------------------------------------------------------
   Adaptasi js/app.js untuk pengguna umum: orang di luar sekolah,
   tanpa akun/sangkut-paut sekolah (bukan siswa). Pakai UmumAuth/
   umum-db.js (project myosigid), showAuth() ke register.html,
   tanpa pengecekan peran. Onboarding dua langkah sebelum masuk
   app: pilih pekerjaan (pilih-pekerjaan.html) lalu data diri
   usia/tinggi/berat untuk Indeks BMI (data-diri.html, lihat
   js/views/data-diri.js) — keduanya wajib, dicek ulang di init()
   di bawah untuk pengguna yang membuka umum-app.html langsung.
   View fitur (Dashboard/Health/Prod/Fin/Ibadah/Profile)
   SAMA persis dengan yang dipakai app.html — tidak diubah. Rute
   produktivitas (tugas/catatan/kebiasaan/jadwal/fokus) & nav ikut
   disamakan dengan app.html (siswa); Ensiklopedia sudah dihapus.
   ============================================================ */

const App = {
  route: 'dashboard',
  _reminderId: null,

  TITLES: {
    dashboard:  [() => tr('Beranda', 'Home'),          () => fmtDate(todayStr(), { weekday: true })],
    health:     [() => tr('Kesehatan', 'Health'),       () => tr('Tubuh sehat, semangat kuat 💪', 'Healthy body, strong spirit 💪')],
    tugas:      [() => tr('Tugas', 'Tasks'),            () => tr('Tugas & progresmu', 'Tasks & your progress')],
    catatan:    [() => tr('Catatan', 'Notes'),          () => tr('Ide & catatan pribadimu', 'Your personal notes & ideas')],
    kebiasaan:  [() => tr('Kebiasaan', 'Habits'),       () => tr('Bangun kebiasaan baik, satu hari satu langkah', 'Build good habits, one day at a time')],
    jadwal:     [() => tr('Jadwal', 'Schedule'),        () => tr('Jadwalmu sehari-hari', 'Your daily schedule')],
    fokus:      [() => tr('Fokus', 'Focus'),            () => tr('Timer Pomodoro untuk belajar fokus', 'Pomodoro timer for focused study')],
    finance:    [() => tr('Keuangan', 'Finance'),       () => tr('Uang saku terpantau, nabung jalan terus', 'Allowance tracked, savings on track')],
    ibadah:     [() => tr('Ibadah', 'Worship'),         () => tr('Sholat, Al-Qur\'an, dzikir & zakat', 'Prayer, Qur\'an, dhikr & zakat')],
    profile:    [() => tr('Profil', 'Profile'),         () => tr('Data diri & pengaturan aplikasi', 'Personal data & app settings')]
  },

  VIEWS: {
    dashboard: () => Dashboard,
    health:    () => Health,
    tugas:     () => Prod,
    catatan:   () => Prod,
    kebiasaan: () => Prod,
    jadwal:    () => Prod,
    fokus:     () => Prod,
    finance:   () => Fin,
    ibadah:    () => Ibadah,
    profile:   () => Profile
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
    if (!DB.user.pekerjaan) { location.replace('pilih-pekerjaan.html'); return; }
    if (!UmumAuth.hasDataDiri(DB.user)) { location.replace('data-diri.html'); return; }
    this.afterAuth();
  },

  showAuth() {
    location.replace('register.html');
  },

  afterAuth() {
    if (DB.user.tema) this.setTheme(DB.user.tema);
    if (DB.user.bahasa && DB.user.bahasa !== I18N.lang) I18N.set(DB.user.bahasa, { save: false });
    this.showApp();
  },

  _pekerjaanLabel(u) {
    const job = (typeof JOBS !== 'undefined') ? JOBS.find(j => j.key === u.pekerjaan) : null;
    return job ? tr(job.id, job.en) : (u.pekerjaan || u.email || '');
  },

  showApp() {
    $('#appShell').classList.remove('hidden');

    const u = DB.user;
    const avatar = Profile._avatarHTML(u);
    $('#topAvatar').innerHTML = avatar;
    $('#sidebarUser').innerHTML = `
      <div class="avatar">${avatar}</div>
      <div style="min-width:0;">
        <div class="u-name">${esc(u.nama)}</div>
        <div class="u-school">${esc(this._pekerjaanLabel(u))}</div>
      </div>`;

    $$('.nav-link, .bnav-item, .bnav-sheet-item').forEach(a => a.onclick = () => this.navigate(a.dataset.route));

    const moreBtn = $('#bnavMore');
    if (moreBtn) {
      moreBtn.onclick = (e) => { e.stopPropagation(); this.toggleMoreSheet(); };
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

    $('#themeToggle').onclick = () => this.toggleTheme();
    $('#topThemeBtn').onclick = () => this.toggleTheme();
    $('#topLangBtn').onclick = () => this.toggleLang();
    $('#topAvatar').onclick = () => this.navigate('profile');
    $('#sidebarUser').onclick = () => this.navigate('profile');

    this._observeTabs();

    const fromHash = (location.hash || '').replace(/^#/, '');
    const route0 = fromHash.split('/')[0];
    this.navigate(this.VIEWS[route0] ? fromHash : 'dashboard');
    if (u.reminderAir) this.startWaterReminder();
  },

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
        if (bar.scrollWidth <= bar.clientWidth + 4) return;
        const active = bar.querySelector('.tab.active');
        if (!active) return;
        const target = active.offsetLeft + active.offsetWidth / 2 - bar.clientWidth / 2;
        bar.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
      });
    });
  },

  navigate(routeSpec) {
    let [route, tab] = String(routeSpec).split('/');
    if (!this.VIEWS[route]) { route = 'dashboard'; tab = undefined; }
    this.route = route;

    const view = this.VIEWS[route]();
    if (tab && typeof view.tab !== 'undefined') view.tab = tab;

    this._writeHash(route, typeof view.tab !== 'undefined' ? view.tab : undefined);

    $$('.nav-link, .bnav-item, .bnav-sheet-item').forEach(a =>
      a.classList.toggle('active', a.dataset.route === route));

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

  toggleMoreSheet(open) {
    const sheet = $('#bnavSheet'), btn = $('#bnavMore');
    if (!sheet || !btn) return;
    const show = open === undefined ? !sheet.classList.contains('open') : open;
    sheet.classList.toggle('open', show);
    btn.classList.toggle('open', show);
    const icon = $('#bnavMoreIcon');
    if (icon) icon.setAttribute('name', show ? 'close' : 'apps');
  },

  _writeHash(route, tab) {
    const h = tab ? `${route}/${tab}` : route;
    if ((location.hash || '').replace(/^#/, '') !== h) history.replaceState(null, '', '#' + h);
  },

  saveTab(tab) {
    this._writeHash(this.route, tab);
  },

  refresh() {
    this.VIEWS[this.route]().render($('#view'));
  },

  setTheme(t) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem('tumara_theme', t);
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

  toggleLang() {
    I18N.toggle();
    this.setTheme(document.documentElement.dataset.theme || 'light');
    this.navigate(this.route);
  },

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
      if (!this.notify(pesan)) toast(pesan, 'info');
    }, menit * 60 * 1000);
  },

  stopWaterReminder() {
    if (this._reminderId) { clearInterval(this._reminderId); this._reminderId = null; }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
