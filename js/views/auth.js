/* ============================================================
   TUMARA — Tampilan Auth (Masuk / Daftar) & Onboarding
   ============================================================ */

const AuthView = {
  mode: 'login', // 'login' | 'register'

  render() {
    const brand = `
      <div class="auth-brand">
        <div class="ab-logo"><div class="logo-mark">T</div> Tumara</div>
        <div>
          <div class="ab-headline">Tumbuh sehat,<br>produktif, terarah.</div>
          <p class="ab-desc">Satu aplikasi untuk menjaga tubuh, pikiran, dan dompetmu tetap seimbang — dirancang khusus untuk siswa.</p>
          <div class="ab-pillars">
            <div class="ab-pill"><ion-icon name="heart"></ion-icon> Kesehatan — kalori, tidur, air &amp; olahraga</div>
            <div class="ab-pill"><ion-icon name="rocket"></ion-icon> Produktivitas — tugas, catatan &amp; fokus</div>
            <div class="ab-pill"><ion-icon name="wallet"></ion-icon> Keuangan — uang saku &amp; target menabung</div>
          </div>
        </div>
        <div class="ab-quote">"Keseimbangan kecil setiap hari, hasil besar di masa depan."</div>
      </div>`;

    const form = this.mode === 'login' ? this._loginForm() : this._registerForm();
    $('#authCard').innerHTML = brand + form;
    this._bind();
  },

  // Tombol "Lanjutkan dengan Google" + pemisah (dipakai kedua form)
  _googleSection() {
    return `
      <div class="auth-divider"><span>atau</span></div>
      <button type="button" class="btn btn-block btn-google" id="googleBtn">
        <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.3 6 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.3 6 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
        </svg>
        Lanjutkan dengan Google
      </button>`;
  },

  _loginForm() {
    return `
      <div class="auth-form-side">
        <h2 class="af-title">Selamat datang kembali 👋</h2>
        <p class="af-sub">Masuk untuk melanjutkan perjalananmu.</p>
        <form id="authForm" novalidate>
          <div class="field">
            <label>Email</label>
            <input type="email" class="input" id="fEmail" placeholder="nama@email.com" required autocomplete="email">
          </div>
          <div class="field">
            <label>Kata sandi</label>
            <div class="input-group">
              <input type="password" class="input" id="fPass" placeholder="••••••••" required autocomplete="current-password">
              <button type="button" class="suffix-btn" id="togglePass"><ion-icon name="eye-outline"></ion-icon></button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="authSubmit" style="margin-top:8px;">
            Masuk <ion-icon name="arrow-forward"></ion-icon>
          </button>
        </form>
        ${this._googleSection()}
        <p class="af-switch">Belum punya akun? <a id="switchMode">Daftar sekarang</a></p>
      </div>`;
  },

  _registerForm() {
    return `
      <div class="auth-form-side">
        <h2 class="af-title">Buat akun baru ✨</h2>
        <p class="af-sub">Gratis, kurang dari satu menit.</p>
        <form id="authForm" novalidate>
          <div class="field">
            <label>Nama lengkap</label>
            <input type="text" class="input" id="fNama" placeholder="Nama kamu" required autocomplete="name">
          </div>
          <div class="field">
            <label>Email</label>
            <input type="email" class="input" id="fEmail" placeholder="nama@email.com" required autocomplete="email">
          </div>
          <div class="field">
            <label>Kata sandi</label>
            <div class="input-group">
              <input type="password" class="input" id="fPass" placeholder="Minimal 6 karakter" required autocomplete="new-password">
              <button type="button" class="suffix-btn" id="togglePass"><ion-icon name="eye-outline"></ion-icon></button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="authSubmit" style="margin-top:8px;">
            Daftar <ion-icon name="arrow-forward"></ion-icon>
          </button>
        </form>
        ${this._googleSection()}
        <p class="af-switch">Sudah punya akun? <a id="switchMode">Masuk</a></p>
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
        toast(`Selamat datang, ${(u.nama || '').split(' ')[0]}! 🌱`);
        setTimeout(() => location.replace('app.html'), 400);
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

      if (!email || !/^\S+@\S+\.\S+$/.test(email)) return toast('Masukkan email yang valid.', 'warning');
      if (pass.length < 6) return toast('Kata sandi minimal 6 karakter.', 'warning');

      btn.disabled = true;
      try {
        if (this.mode === 'register') {
          const nama = $('#fNama').value.trim();
          if (nama.length < 2) { btn.disabled = false; return toast('Masukkan nama kamu.', 'warning'); }
          await DB.register({ nama, email, password: pass });
          toast(`Selamat datang di Tumara, ${nama.split(' ')[0]}! 🌱`);
        } else {
          const u = await DB.login(email, pass);
          toast(`Selamat datang kembali, ${(u.nama || '').split(' ')[0]}!`);
        }
        setTimeout(() => location.replace('app.html'), 400); // beri waktu toast tampil
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

  render() {
    const u = DB.user;
    const d = this.data;
    $('#onboardCard').innerHTML = `
      <div style="text-align:center;margin-bottom:22px;">
        <div class="logo-mark" style="margin:0 auto 14px;width:54px;height:54px;font-size:1.6rem;">T</div>
        <h2 style="font-size:1.4rem;font-weight:800;letter-spacing:-.02em;">Hai, ${esc((u.nama || '').split(' ')[0])}! Kenalan dulu, yuk 🌱</h2>
        <p style="color:var(--text-3);font-size:.88rem;margin-top:6px;">Data ini dipakai untuk menghitung kebutuhan kalori<br>dan target minummu secara otomatis.</p>
      </div>

      <form id="obForm" novalidate>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>Usia</label>
            <div class="input-group">
              <input type="number" class="input" id="obUsia" min="10" max="25" placeholder="16" required>
              <span class="input-unit">tahun</span>
            </div>
          </div>
          <div class="field">
            <label>Jenis kelamin</label>
            <div class="radio-cards" id="obJK">
              <div class="radio-card ${d.jenisKelamin === 'L' ? 'selected' : ''}" data-val="L"><ion-icon name="male"></ion-icon>Laki-laki</div>
              <div class="radio-card ${d.jenisKelamin === 'P' ? 'selected' : ''}" data-val="P"><ion-icon name="female"></ion-icon>Perempuan</div>
            </div>
          </div>
        </div>
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field">
            <label>Tinggi badan</label>
            <div class="input-group">
              <input type="number" class="input" id="obTinggi" min="100" max="230" placeholder="165" required>
              <span class="input-unit">cm</span>
            </div>
          </div>
          <div class="field">
            <label>Berat badan</label>
            <div class="input-group">
              <input type="number" class="input" id="obBerat" min="25" max="200" placeholder="55" required>
              <span class="input-unit">kg</span>
            </div>
          </div>
        </div>
        <div class="field">
          <label>Tingkat aktivitas harian</label>
          <select class="select" id="obAktivitas">
            ${Calc.AKTIVITAS.map(a => `<option value="${a.key}" ${a.key === d.aktivitas ? 'selected' : ''}>${a.label}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Asal sekolah <span style="font-weight:500;color:var(--text-3)">(opsional)</span></label>
          <input type="text" class="input" id="obSekolah" placeholder="mis. SMAN 1 Bandung">
        </div>

        <div class="disclaimer" style="margin:6px 0 18px;">
          <ion-icon name="shield-checkmark-outline"></ion-icon>
          <span>Tumara membantu membangun kebiasaan sehat, <b>bukan pengganti nasihat tenaga kesehatan</b>. Angka kalori adalah perkiraan kebutuhan energi, bukan target diet.</span>
        </div>

        <button type="submit" class="btn btn-primary btn-block btn-lg">Mulai Bertumbuh <ion-icon name="leaf"></ion-icon></button>
      </form>`;

    $$('#obJK .radio-card').forEach(c => c.onclick = () => {
      this.data.jenisKelamin = c.dataset.val;
      $$('#obJK .radio-card').forEach(x => x.classList.toggle('selected', x === c));
    });

    $('#obForm').onsubmit = async e => {
      e.preventDefault();
      const usia = +$('#obUsia').value, tinggi = +$('#obTinggi').value, berat = +$('#obBerat').value;
      if (!usia || usia < 10 || usia > 25) return toast('Usia harus antara 10–25 tahun.', 'warning');
      if (!tinggi || tinggi < 100 || tinggi > 230) return toast('Periksa kembali tinggi badanmu (cm).', 'warning');
      if (!berat || berat < 25 || berat > 200) return toast('Periksa kembali berat badanmu (kg).', 'warning');

      const aktivitas = $('#obAktivitas').value;
      const jenisKelamin = this.data.jenisKelamin;
      const bmr = Calc.bmr({ jenisKelamin, berat, tinggi, usia });
      const tdee = Calc.tdee(bmr, aktivitas);
      const air = Calc.waterTarget(berat);

      await DB.updateUser({
        usia, jenisKelamin, tinggi, berat, aktivitas,
        sekolah: $('#obSekolah').value.trim(),
        targetKalori: tdee,
        targetAir: air.gelas,
        profileComplete: true
      });
      toast(`Targetmu siap: ±${tdee.toLocaleString('id-ID')} kkal & ${air.gelas} gelas air/hari 💧`);
      App.afterAuth();
    };
  }
};
