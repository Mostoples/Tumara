/* ============================================================
   TUMARA — Halaman Daftar / Masuk (jalur uji coba)
   ------------------------------------------------------------
   Jalur terpisah dari auth.html (khusus akun sekolah). Dipakai
   orang yang ingin mencoba Tumara: Google, atau email & kata
   sandi, lalu (setelah pilih pekerjaan) masuk ke coba-app.html.
   Auth beneran lewat TrialAuth (project Firebase myosigid,
   lihat js/trial-auth.js) — terpisah dari project sekolah.
   ============================================================ */

const RegisterView = {
  mode: 'daftar', // 'daftar' | 'masuk'

  // Setelah login/daftar sukses: sudah pernah pilih pekerjaan?
  // → langsung ke beranda. Belum? → ke halaman pilih pekerjaan.
  goNext(user) {
    location.replace(user?.pekerjaan ? 'coba-app.html' : 'pilih-pekerjaan.html');
  },

  render() {
    const brand = `
      <div class="auth-brand">
        <div class="ab-logo"><div class="logo-mark"><img src="assets/logo.png" alt="Logo Tumara"></div> Tumara</div>
        <div>
          <div class="ab-headline">${tr('Mulai perjalanan<br>bertumbuhmu.', 'Start your<br>growth journey.')}</div>
          <p class="ab-desc">${tr('Buat akun baru dengan Google atau email — satu aplikasi untuk kesehatan, produktivitas, dan keuanganmu.', 'Create a new account with Google or email — one app for your health, productivity, and finances.')}</p>
          <div class="ab-pillars">
            <div class="ab-pill"><ion-icon name="heart"></ion-icon> ${tr('Kesehatan — kalori, tidur, air &amp; olahraga', 'Health — calories, sleep, water &amp; exercise')}</div>
            <div class="ab-pill"><ion-icon name="rocket"></ion-icon> ${tr('Produktivitas — tugas, catatan &amp; fokus', 'Productivity — tasks, notes &amp; focus')}</div>
            <div class="ab-pill"><ion-icon name="wallet"></ion-icon> ${tr('Keuangan — uang saku &amp; target menabung', 'Finance — allowance &amp; saving goals')}</div>
          </div>
        </div>
        <div class="ab-quote">${tr('"Keseimbangan kecil setiap hari, hasil besar di masa depan."', '"A little balance every day, big results in the future."')}</div>
      </div>`;

    $('#authCard').innerHTML = brand + this._formSide();
    this._bind();
  },

  _googleIcon() {
    return `<svg viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.6-6 7.9-11.3 7.9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l5.9 4.3C13.9 15.6 18.6 12.4 24 12.4c3.1 0 5.9 1.2 8 3.1l5.1-5.1C33.9 6.1 29.2 4 24 4c-7.5 0-14 4.2-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.8-2 13.3-5.2l-6.1-5.2c-2 1.4-4.6 2.3-7.2 2.3-5.3 0-9.7-3.3-11.3-7.9l-6 4.6C9.9 39.7 16.4 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.1 5.2C40.5 35.8 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>`;
  },

  _formSide() {
    const isDaftar = this.mode === 'daftar';
    return `
      <div class="auth-form-side">
        <div class="tabs" id="rgTabs">
          <button type="button" class="tab ${isDaftar ? 'active' : ''}" data-mode="daftar">${tr('Daftar', 'Sign Up')}</button>
          <button type="button" class="tab ${!isDaftar ? 'active' : ''}" data-mode="masuk">${tr('Masuk', 'Sign In')}</button>
        </div>

        <h2 class="af-title">${isDaftar ? tr('Buat akun baru 🌱', 'Create a new account 🌱') : tr('Selamat datang kembali 👋', 'Welcome back 👋')}</h2>
        <p class="af-sub">${isDaftar
          ? tr('Daftar dengan Google atau email — gratis.', 'Sign up with Google or email — it\'s free.')
          : tr('Masuk dengan akun Google atau emailmu.', 'Sign in with your Google account or email.')}</p>

        <button type="button" class="btn-google" id="rgGoogleBtn">
          ${this._googleIcon()} ${tr('Lanjutkan dengan Google', 'Continue with Google')}
        </button>

        <div class="af-divider">${tr('atau dengan email', 'or with email')}</div>

        <form id="rgForm" novalidate>
          ${isDaftar ? `
          <div class="field">
            <label>${tr('Nama lengkap', 'Full name')}</label>
            <input type="text" class="input" id="rgNama" placeholder="${tr('Nama kamu', 'Your name')}" required autocomplete="name">
          </div>` : ''}
          <div class="field">
            <label>Email</label>
            <input type="email" class="input" id="rgEmail" placeholder="nama@email.com" required autocomplete="email">
          </div>
          <div class="field">
            <label>${tr('Kata sandi', 'Password')}</label>
            <div class="input-group">
              <input type="password" class="input" id="rgPass" placeholder="${tr('Minimal 6 karakter', 'At least 6 characters')}" required autocomplete="${isDaftar ? 'new-password' : 'current-password'}">
              <button type="button" class="suffix-btn" id="rgTogglePass"><ion-icon name="eye-outline"></ion-icon></button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="rgSubmit" style="margin-top:8px;">
            ${isDaftar ? tr('Buat Akun', 'Create Account') : tr('Masuk', 'Sign In')} <ion-icon name="arrow-forward"></ion-icon>
          </button>
        </form>

        <p class="af-switch">${isDaftar
          ? tr('Sudah punya akun? <a id="rgSwap">Masuk di sini</a>', 'Already have an account? <a id="rgSwap">Sign in here</a>')
          : tr('Belum punya akun? <a id="rgSwap">Daftar di sini</a>', 'No account yet? <a id="rgSwap">Sign up here</a>')}</p>
      </div>`;
  },

  _bind() {
    $$('#rgTabs .tab').forEach(btn => btn.onclick = () => {
      this.mode = btn.dataset.mode;
      this.render();
    });

    const swap = $('#rgSwap');
    if (swap) swap.onclick = () => {
      this.mode = this.mode === 'daftar' ? 'masuk' : 'daftar';
      this.render();
    };

    $('#rgTogglePass').onclick = () => {
      const inp = $('#rgPass');
      const icon = $('#rgTogglePass ion-icon');
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      icon.setAttribute('name', show ? 'eye-off-outline' : 'eye-outline');
    };

    $('#rgGoogleBtn').onclick = async () => {
      try {
        const user = await TrialAuth.loginGoogle();
        this.goNext(user);
      } catch (err) {
        if (err.code === 'auth/popup-closed-by-user') return;
        toast(this._friendlyError(err), 'error');
      }
    };

    $('#rgForm').onsubmit = async e => {
      e.preventDefault();
      const isDaftar = this.mode === 'daftar';
      const email = $('#rgEmail').value.trim();
      const pass = $('#rgPass').value;
      const nama = isDaftar ? $('#rgNama').value.trim() : '';

      if (isDaftar && !nama) return toast(tr('Masukkan nama lengkapmu.', 'Please enter your full name.'), 'warning');
      if (!email.includes('@')) return toast(tr('Masukkan email yang valid.', 'Please enter a valid email.'), 'warning');
      if (pass.length < 6) return toast(tr('Kata sandi minimal 6 karakter.', 'Password must be at least 6 characters.'), 'warning');

      const btn = $('#rgSubmit');
      btn.disabled = true;
      try {
        const user = isDaftar
          ? await TrialAuth.register(nama, email, pass)
          : await TrialAuth.login(email, pass);
        this.goNext(user);
      } catch (err) {
        toast(this._friendlyError(err), 'error');
        btn.disabled = false;
      }
    };
  },

  _friendlyError(err) {
    const map = {
      'auth/email-already-in-use': tr('Email ini sudah terdaftar. Coba masuk.', 'This email is already registered. Try signing in instead.'),
      'auth/invalid-email': tr('Format email tidak valid.', 'Invalid email format.'),
      'auth/weak-password': tr('Kata sandi terlalu lemah (minimal 6 karakter).', 'Password is too weak (at least 6 characters).'),
      'auth/user-not-found': tr('Akun tidak ditemukan.', 'Account not found.'),
      'auth/wrong-password': tr('Kata sandi salah.', 'Incorrect password.'),
      'auth/invalid-credential': tr('Email atau kata sandi salah.', 'Incorrect email or password.'),
      'auth/popup-blocked': tr('Popup Google diblokir browser. Izinkan popup lalu coba lagi.', 'Google popup was blocked by your browser. Allow popups and try again.')
    };
    return map[err.code] || err.message || tr('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.');
  }
};
