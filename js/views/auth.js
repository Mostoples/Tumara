/* ============================================================
   TUMARA — Tampilan Auth (Masuk / Daftar) & Onboarding
   ============================================================ */

// Simpan kredensial ke pengelola sandi browser agar muncul notifikasi
// "Simpan sandi" (mis. dari Google/Chrome). Memakai Credential Management API,
// yang hanya tersedia di browser Chromium & konteks aman (HTTPS/localhost).
// Diabaikan diam-diam bila tidak didukung (Firefox/Safari tetap pakai heuristik form).
async function savePasswordCredential(email, password) {
  // Prompt simpan sandi butuh secure context (HTTPS atau http://localhost).
  // Bila dibuka via file:// atau http di IP LAN, API-nya nonaktif.
  if (!window.isSecureContext) {
    console.warn('[Tumara] Simpan sandi dinonaktifkan: halaman bukan secure context (butuh HTTPS atau localhost).');
    return;
  }
  try {
    if (window.PasswordCredential && email && password) {
      const cred = new window.PasswordCredential({ id: email, password, name: email });
      await navigator.credentials.store(cred);
    }
  } catch (_) { /* tidak didukung — abaikan */ }
}

const AuthView = {
  mode: 'login', // 'login' | 'register'

  render() {
    const brand = `
      <div class="auth-brand">
        <div class="ab-logo"><div class="logo-mark"><img src="assets/logo.png" alt="Logo Tumara"></div> Tumara</div>
        <div>
          <div class="ab-headline">${tr('Tumbuh sehat,<br>produktif, terarah.', 'Grow healthy,<br>productive, on track.')}</div>
          <p class="ab-desc">${tr('Satu aplikasi untuk menjaga tubuh, pikiran, dan dompetmu tetap seimbang — dirancang khusus untuk siswa.', 'One app to keep your body, mind, and wallet in balance — designed just for students.')}</p>
          <div class="ab-pillars">
            <div class="ab-pill"><ion-icon name="heart"></ion-icon> ${tr('Kesehatan — kalori, tidur, air &amp; olahraga', 'Health — calories, sleep, water &amp; exercise')}</div>
            <div class="ab-pill"><ion-icon name="rocket"></ion-icon> ${tr('Produktivitas — tugas, catatan &amp; fokus', 'Productivity — tasks, notes &amp; focus')}</div>
            <div class="ab-pill"><ion-icon name="wallet"></ion-icon> ${tr('Keuangan — uang saku &amp; target menabung', 'Finance — allowance &amp; saving goals')}</div>
          </div>
        </div>
        <div class="ab-quote">${tr('"Keseimbangan kecil setiap hari, hasil besar di masa depan."', '"A little balance every day, big results in the future."')}</div>
      </div>`;

    const form = this.mode === 'login' ? this._loginForm() : this._registerForm();
    $('#authCard').innerHTML = brand + form;
    this._bind();
  },

  // Tombol "Lanjutkan dengan Google" + pemisah (dipakai kedua form)
  _googleSection() {
    return `
      <div class="auth-divider"><span>${tr('atau', 'or')}</span></div>
      <button type="button" class="btn btn-block btn-google" id="googleBtn">
        <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.3 6 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.3 6 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
        </svg>
        ${tr('Lanjutkan dengan Google', 'Continue with Google')}
      </button>`;
  },

  _loginForm() {
    return `
      <div class="auth-form-side">
        <h2 class="af-title">${tr('Selamat datang kembali 👋', 'Welcome back 👋')}</h2>
        <p class="af-sub">${tr('Masuk untuk melanjutkan perjalananmu.', 'Sign in to continue your journey.')}</p>
        <form id="authForm" novalidate>
          <div class="field">
            <label>Email</label>
            <input type="email" class="input" id="fEmail" name="email" placeholder="${tr('nama@email.com', 'name@email.com')}" required autocomplete="username">
          </div>
          <div class="field">
            <label>${tr('Kata sandi', 'Password')}</label>
            <div class="input-group">
              <input type="password" class="input" id="fPass" name="password" placeholder="••••••••" required autocomplete="current-password">
              <button type="button" class="suffix-btn" id="togglePass"><ion-icon name="eye-outline"></ion-icon></button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="authSubmit" style="margin-top:8px;">
            ${tr('Masuk', 'Sign In')} <ion-icon name="arrow-forward"></ion-icon>
          </button>
        </form>
        ${this._googleSection()}
        <p class="af-switch">${tr('Belum punya akun?', "Don't have an account?")} <a id="switchMode">${tr('Daftar sekarang', 'Sign up now')}</a></p>
      </div>`;
  },

  _registerForm() {
    return `
      <div class="auth-form-side">
        <h2 class="af-title">${tr('Buat akun baru ✨', 'Create a new account ✨')}</h2>
        <p class="af-sub">${tr('Gratis, kurang dari satu menit.', 'Free, takes less than a minute.')}</p>
        <form id="authForm" novalidate>
          <div class="field">
            <label>${tr('Nama lengkap', 'Full name')}</label>
            <input type="text" class="input" id="fNama" name="name" placeholder="${tr('Nama kamu', 'Your name')}" required autocomplete="name">
          </div>
          <div class="field">
            <label>Email</label>
            <input type="email" class="input" id="fEmail" name="email" placeholder="${tr('nama@email.com', 'name@email.com')}" required autocomplete="username">
          </div>
          <div class="field">
            <label>${tr('Kata sandi', 'Password')}</label>
            <div class="input-group">
              <input type="password" class="input" id="fPass" name="password" placeholder="${tr('Minimal 6 karakter', 'At least 6 characters')}" required autocomplete="new-password">
              <button type="button" class="suffix-btn" id="togglePass"><ion-icon name="eye-outline"></ion-icon></button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="authSubmit" style="margin-top:8px;">
            ${tr('Daftar', 'Sign Up')} <ion-icon name="arrow-forward"></ion-icon>
          </button>
        </form>
        ${this._googleSection()}
        <p class="af-switch">${tr('Sudah punya akun?', 'Already have an account?')} <a id="switchMode">${tr('Masuk', 'Sign in')}</a></p>
      </div>`;
  },

  _bind() {
    $('#switchMode').onclick = () => {
      this.mode = this.mode === 'login' ? 'register' : 'login';
      this.render();
    };

    $('#googleBtn').onclick = async () => {
      const btn = $('#googleBtn');
      btn.disabled = true;
      try {
        const u = await DB.loginGoogle();
        toast(tr(`Selamat datang, ${(u.nama || '').split(' ')[0]}! 🌱`, `Welcome, ${(u.nama || '').split(' ')[0]}! 🌱`));
        setTimeout(() => location.replace(roleHome(u.role)), 400);
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
      }
    };

    $('#togglePass').onclick = () => {
      const inp = $('#fPass');
      const icon = $('#togglePass ion-icon');
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      icon.setAttribute('name', show ? 'eye-off-outline' : 'eye-outline');
    };

    $('#authForm').onsubmit = async e => {
      e.preventDefault();
      const btn = $('#authSubmit');
      const email = $('#fEmail').value.trim();
      const pass = $('#fPass').value;

      if (!email || !/^\S+@\S+\.\S+$/.test(email)) return toast(tr('Masukkan email yang valid.', 'Please enter a valid email.'), 'warning');
      if (pass.length < 6) return toast(tr('Kata sandi minimal 6 karakter.', 'Password must be at least 6 characters.'), 'warning');

      btn.disabled = true;
      try {
        let u;
        if (this.mode === 'register') {
          const nama = $('#fNama').value.trim();
          if (nama.length < 2) { btn.disabled = false; return toast(tr('Masukkan nama kamu.', 'Please enter your name.'), 'warning'); }
          u = await DB.register({ nama, email, password: pass });
          toast(tr(`Selamat datang di Tumara, ${nama.split(' ')[0]}! 🌱`, `Welcome to Tumara, ${nama.split(' ')[0]}! 🌱`));
        } else {
          const isAdminEmail = typeof ADMIN_EMAILS !== 'undefined'
            && ADMIN_EMAILS.map(x => x.toLowerCase()).includes(email.toLowerCase());
          try {
            u = await DB.login(email, pass);
          } catch (loginErr) {
            // Bootstrap admin: bila akun admin belum ada, buat otomatis saat
            // login pertama dengan kredensial admin (email di ADMIN_EMAILS).
            // Jika akun sudah ada tapi sandi salah, register gagal
            // (email-already-in-use) → tampilkan error login aslinya.
            if (!isAdminEmail) throw loginErr;
            try {
              u = await DB.register({ nama: 'Administrator', email, password: pass, role: 'admin' });
            } catch (_) {
              throw loginErr;
            }
          }
          toast(tr(`Selamat datang, ${(u.nama || '').split(' ')[0]}!`, `Welcome, ${(u.nama || '').split(' ')[0]}!`));
        }
        // Picu notifikasi "Simpan sandi" browser sebelum berpindah halaman.
        await savePasswordCredential(email, pass);
        setTimeout(() => location.replace(roleHome(u.role)), 400); // beri waktu toast tampil
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
      }
    };
  }
};

/* ============================================================
   Onboarding — data diri untuk kalkulasi target otomatis
   ============================================================ */

const OnboardView = {
  data: { jenisKelamin: 'L', aktivitas: 'ringan' },

  async render() {
    const u = DB.user;
    const d = this.data;

    // Muat daftar kelas (school_classes) untuk pilihan kelas siswa.
    $('#onboardCard').innerHTML = `<div class="portal-loading"><div class="spinner"></div> ${tr('Memuat…', 'Loading…')}</div>`;
    let classes = [];
    try {
      classes = (await DB.gList('school_classes'))
        .sort((a, b) => (a.urutan ?? 999999) - (b.urutan ?? 999999) || (a.nama || '').localeCompare(b.nama || ''));
    } catch (_) { classes = []; }

    $('#onboardCard').innerHTML = `
      <div style="text-align:center;margin-bottom:22px;">
        <div class="logo-mark" style="margin:0 auto 14px;width:54px;height:54px;"><img src="assets/logo.png" alt="Logo Tumara"></div>
        <h2 style="font-size:1.4rem;font-weight:800;letter-spacing:-.02em;">${tr(`Hai, ${esc((u.nama || '').split(' ')[0])}! Kenalan dulu, yuk 🌱`, `Hi, ${esc((u.nama || '').split(' ')[0])}! Let's get to know you 🌱`)}</h2>
        <p style="color:var(--text-3);font-size:.88rem;margin-top:6px;">${tr('Data ini dipakai untuk menghitung kebutuhan kalori<br>dan target minummu secara otomatis.', 'This data is used to automatically calculate<br>your calorie needs and water target.')}</p>
      </div>

      <form id="obForm" novalidate>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>${tr('Usia', 'Age')}</label>
            <div class="input-group">
              <input type="number" class="input" id="obUsia" placeholder="16" required>
              <span class="input-unit">${tr('tahun', 'yrs')}</span>
            </div>
          </div>
          <div class="field">
            <label>${tr('Jenis kelamin', 'Gender')}</label>
            <div class="radio-cards" id="obJK">
              <div class="radio-card ${d.jenisKelamin === 'L' ? 'selected' : ''}" data-val="L"><ion-icon name="male"></ion-icon>${tr('Laki-laki', 'Male')}</div>
              <div class="radio-card ${d.jenisKelamin === 'P' ? 'selected' : ''}" data-val="P"><ion-icon name="female"></ion-icon>${tr('Perempuan', 'Female')}</div>
            </div>
          </div>
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>${tr('Tinggi badan', 'Height')}</label>
            <div class="input-group">
              <input type="number" class="input" id="obTinggi" min="100" max="230" placeholder="165" required>
              <span class="input-unit">cm</span>
            </div>
          </div>
          <div class="field">
            <label>${tr('Berat badan', 'Weight')}</label>
            <div class="input-group">
              <input type="number" class="input" id="obBerat" min="25" max="200" placeholder="55" required>
              <span class="input-unit">kg</span>
            </div>
          </div>
        </div>
        <div class="field">
          <label>${tr('Tingkat aktivitas harian', 'Daily activity level')}</label>
          <select class="select" id="obAktivitas">
            ${Calc.AKTIVITAS.map(a => `<option value="${a.key}" ${a.key === d.aktivitas ? 'selected' : ''}>${a.label}</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>${tr('Kelas', 'Class')}</label>
            ${classes.length ? `
            <select class="select" id="obKelas" required>
              <option value="" ${u.kelasId ? '' : 'selected'} disabled>${tr('Pilih kelasmu…', 'Choose your class…')}</option>
              ${classes.map(c => `<option value="${esc(c.id)}" ${c.id === u.kelasId ? 'selected' : ''}>${esc(c.nama)}</option>`).join('')}
            </select>` : `
            <input type="text" class="input" disabled value="${tr('Belum ada kelas — hubungi admin', 'No classes yet — contact admin')}">`}
          </div>
          <div class="field">
            <label>NIS</label>
            <input type="text" class="input" id="obNis" inputmode="numeric" maxlength="20" placeholder="${tr('No. Induk Siswa', 'Student ID')}" value="${esc(u.nis || '')}">
          </div>
        </div>
        <div class="field">
          <label>${tr('Asal sekolah', 'School')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
          <input type="text" class="input" id="obSekolah" placeholder="${tr('mis. SMAN 1 Bandung', 'e.g. Bandung High School 1')}" value="${esc(u.sekolah || '')}">
        </div>

        <div class="disclaimer" style="margin:6px 0 18px;">
          <ion-icon name="shield-checkmark-outline"></ion-icon>
          <span>${tr('Tumara membantu membangun kebiasaan sehat, <b>bukan pengganti nasihat tenaga kesehatan</b>. Angka kalori adalah perkiraan kebutuhan energi, bukan target diet.', 'Tumara helps you build healthy habits, <b>not a substitute for medical advice</b>. Calorie numbers are estimated energy needs, not a diet target.')}</span>
        </div>

        <button type="submit" class="btn btn-primary btn-block btn-lg">${tr('Mulai Bertumbuh', 'Start Growing')} <ion-icon name="leaf"></ion-icon></button>
      </form>`;

    $$('#obJK .radio-card').forEach(c => c.onclick = () => {
      this.data.jenisKelamin = c.dataset.val;
      $$('#obJK .radio-card').forEach(x => x.classList.toggle('selected', x === c));
    });

    // NIS: hanya angka, maksimal 20 digit.
    const nisEl = $('#obNis');
    if (nisEl) nisEl.oninput = () => { nisEl.value = nisEl.value.replace(/\D/g, '').slice(0, 20); };

    $('#obForm').onsubmit = async e => {
      e.preventDefault();
      const usia = +$('#obUsia').value, tinggi = +$('#obTinggi').value, berat = +$('#obBerat').value;
      if (!usia) return toast(tr('Masukkan usia kamu.', 'Please enter your age.'), 'warning');
      if (!tinggi || tinggi < 100 || tinggi > 230) return toast(tr('Periksa kembali tinggi badanmu (cm).', 'Please double-check your height (cm).'), 'warning');
      if (!berat || berat < 25 || berat > 200) return toast(tr('Periksa kembali berat badanmu (kg).', 'Please double-check your weight (kg).'), 'warning');

      // Kelas & NIS (wajib bila admin sudah membuat kelas) — inilah yang
      // menautkan akun siswa ke kelasnya agar muncul di roster guru.
      const kelasSel = $('#obKelas');
      let kelasId = u.kelasId || '', kelasNama = u.kelasNama || '', nis = (nisEl?.value || '').replace(/\D/g, '').slice(0, 20);
      if (kelasSel) {
        kelasId = kelasSel.value;
        if (!kelasId) return toast(tr('Pilih kelasmu dulu.', 'Please choose your class first.'), 'warning');
        kelasNama = classes.find(c => c.id === kelasId)?.nama || '';
        if (!nis) return toast(tr('Masukkan NIS-mu (sesuai data sekolah).', 'Please enter your NIS (as on the school record).'), 'warning');
      }

      const aktivitas = $('#obAktivitas').value;
      const jenisKelamin = this.data.jenisKelamin;
      const bmr = Calc.bmr({ jenisKelamin, berat, tinggi, usia });
      const tdee = Calc.tdee(bmr, aktivitas);
      const air = Calc.waterTarget(berat);

      await DB.updateUser({
        usia, jenisKelamin, tinggi, berat, aktivitas,
        sekolah: $('#obSekolah').value.trim(),
        kelasId, kelasNama, nis,
        targetKalori: tdee,
        targetAir: air.gelas,
        profileComplete: true
      });
      toast(tr(`Targetmu siap: ±${tdee.toLocaleString('id-ID')} kkal & ${air.gelas} gelas air/hari 💧`,
               `Your targets are ready: ±${tdee.toLocaleString('id-ID')} kcal & ${air.gelas} glasses of water/day 💧`));
      App.afterAuth();
    };
  }
};
