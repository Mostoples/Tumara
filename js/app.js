/* ============================================================
   TUMARA — App (router utama & shell)
   Mengatur layar auth/onboarding/app, navigasi, tema,
   dan pengingat minum.
   ============================================================ */

const App = {
  route: 'dashboard',
  _reminderId: null,

  TITLES: {
    dashboard:    ['Beranda',       () => fmtDate(todayStr(), { weekday: true })],
    health:       ['Kesehatan',     () => 'Tubuh sehat, semangat kuat 💪'],
    productivity: ['Produktivitas', () => 'Tugas, catatan, jadwal & fokus'],
    finance:      ['Keuangan',      () => 'Uang saku terpantau, nabung jalan terus'],
    encyclopedia: ['Ensiklopedia',  () => 'Pengetahuan seputar sehat, belajar & uang'],
    profile:      ['Profil',        () => 'Data diri & pengaturan aplikasi']
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
      toast('Gagal terhubung ke server. Periksa koneksi internetmu.', 'error');
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
    const inisial = Profile._inisial(u.nama);
    $('#topAvatar').textContent = inisial;
    $('#sidebarUser').innerHTML = `
      <div class="avatar">${esc(inisial)}</div>
      <div style="min-width:0;">
        <div class="u-name">${esc(u.nama)}</div>
        <div class="u-school">${esc(u.sekolah || u.email)}</div>
      </div>`;

    // navigasi (sidebar + bottom nav)
    $$('.nav-link, .bnav-item').forEach(a => a.onclick = () => this.navigate(a.dataset.route));

    // tema & profil
    $('#themeToggle').onclick = () => this.toggleTheme();
    $('#topThemeBtn').onclick = () => this.toggleTheme();
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
    $('#pageTitle').textContent = judul;
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
    localStorage.setItem('tumara_theme', t);
    const dark = t === 'dark';
    const icon = $('#themeIcon'), label = $('#themeLabel'), topIcon = $('#topThemeBtn ion-icon');
    if (icon)  icon.setAttribute('name', dark ? 'sunny-outline' : 'moon-outline');
    if (label) label.textContent = dark ? 'Mode terang' : 'Mode gelap';
    if (topIcon) topIcon.setAttribute('name', dark ? 'sunny-outline' : 'moon-outline');
  },

  toggleTheme() {
    this.setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  },

  /* ---------- pengingat minum ---------- */

  startWaterReminder() {
    this.stopWaterReminder();
    const menit = DB.user?.reminderInterval || 60;
    this._reminderId = setInterval(() => {
      const pesan = 'Waktunya minum 💧 Satu gelas dulu, yuk!';
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
