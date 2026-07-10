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
    encyclopedia: [() => tr('Ensiklopedia', 'Encyclopedia'),      () => tr('Pengetahuan seputar sehat, belajar & uang', 'Knowledge on health, study & money')],
    profile:      [() => tr('Profil', 'Profile'),                 () => tr('Data diri & pengaturan aplikasi', 'Personal data & app settings')]
  },

  VIEWS: {
    dashboard:    () => Dashboard,
    health:       () => Health,
    productivity: () => Prod,
    finance:      () => Fin,
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
    DB.user ? this.afterAuth() : this.showAuth();
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

    // navigasi (sidebar + bottom nav)
    $$('.nav-link, .bnav-item').forEach(a => a.onclick = () => this.navigate(a.dataset.route));

    // tema, bahasa & profil
    $('#themeToggle').onclick = () => this.toggleTheme();
    $('#topThemeBtn').onclick = () => this.toggleTheme();
    $('#topLangBtn').onclick = () => this.toggleLang();
    $('#topAvatar').onclick = () => this.navigate('profile');
    $('#sidebarUser').onclick = () => this.navigate('profile');

    this.navigate('dashboard');
    if (u.reminderAir) this.startWaterReminder();
  },

  /* ---------- navigasi & render ---------- */

  navigate(route) {
    if (!this.VIEWS[route]) route = 'dashboard';
    this.route = route;

    $$('.nav-link, .bnav-item').forEach(a =>
      a.classList.toggle('active', a.dataset.route === route));

    const [judul, sub] = this.TITLES[route];
    $('#pageTitle').textContent = judul();
    $('#pageSub').textContent = sub();

    this.VIEWS[route]().render($('#view'));
    window.scrollTo({ top: 0 });
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

  startWaterReminder() {
    this.stopWaterReminder();
    const menit = DB.user?.reminderInterval || 60;
    this._reminderId = setInterval(() => {
      const pesan = tr('Waktunya minum 💧 Satu gelas dulu, yuk!', 'Time to hydrate 💧 Grab a glass of water!');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Tumara', { body: pesan });
      } else {
        toast(pesan, 'info');
      }
    }, menit * 60 * 1000);
  },

  stopWaterReminder() {
    if (this._reminderId) { clearInterval(this._reminderId); this._reminderId = null; }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
