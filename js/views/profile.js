/* ============================================================
   TUMARA — Profil & Pengaturan
   Data diri · Preferensi (tema, pengingat minum) · Akun
   ============================================================ */

const Profile = {

  // Data diri default mode tampilan (tidak bisa diedit) sampai tombol edit ditekan.
  _editing: false,

  _inisial(nama) {
    return (nama || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  },

  // Isi avatar: foto profil (fotoUrl dari Firestore) bila ada, selain itu inisial.
  // referrerpolicy diperlukan agar foto akun Google tidak diblokir (403).
  _avatarHTML(u) {
    return u.fotoUrl
      ? `<img src="${esc(u.fotoUrl)}" alt="${esc(u.nama || 'Foto profil')}" referrerpolicy="no-referrer">`
      : esc(this._inisial(u.nama));
  },

  async render(el) {
    const u = DB.user;
    const isDark = document.documentElement.dataset.theme === 'dark';
    const ed = this._editing;                      // mode edit data diri aktif?
    const dis = ed ? '' : 'disabled';              // atribut untuk menonaktifkan input

    // Daftar kelas sekolah (untuk memilih/mengubah kelas siswa).
    let classes = [];
    try {
      classes = (await DB.gList('school_classes'))
        .sort((a, b) => (a.urutan ?? 999999) - (b.urutan ?? 999999) || (a.nama || '').localeCompare(b.nama || ''));
    } catch (_) { classes = []; }

    el.innerHTML = `
      <!-- HEADER PROFIL -->
      <div class="card profile-head">
        <div class="avatar">${this._avatarHTML(u)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;font-size:1.15rem;letter-spacing:-.01em;">${esc(u.nama)}</div>
          <div style="font-size:.84rem;color:var(--text-3);margin-top:2px;">${esc(u.email)}</div>
          ${u.sekolah ? `<span class="badge badge-green" style="margin-top:8px;"><ion-icon name="school-outline"></ion-icon>${esc(u.sekolah)}</span>` : ''}
        </div>
      </div>

      <div class="grid grid-2" style="align-items:start;margin-top:18px;">

        <!-- DATA DIRI -->
        <div class="card">
          <div class="card-title">
            <ion-icon name="person" style="color:var(--brand)"></ion-icon>${tr('Data Diri', 'Personal Data')}
            <button type="button" class="mini-icon-btn ${ed ? 'active' : ''}" id="pfEditToggle" style="margin-left:auto;"
              title="${ed ? tr('Batalkan edit', 'Cancel editing') : tr('Edit data diri', 'Edit personal data')}">
              <ion-icon name="${ed ? 'close' : 'create-outline'}"></ion-icon>
            </button>
          </div>
          <div class="card-sub">${ed
            ? tr('Ubah datamu lalu simpan untuk menghitung ulang target.', 'Edit your data then save to recalculate targets.')
            : tr('Dipakai untuk menghitung target kalori &amp; air minum. Tekan ikon edit untuk mengubah.', 'Used to calculate your calorie &amp; water targets. Tap the edit icon to change.')}</div>
          <form id="pfForm" novalidate style="margin-top:16px;">
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>${tr('Usia', 'Age')}</label>
                <div class="input-group">
                  <input type="number" class="input" id="pfUsia" value="${u.usia || ''}" ${dis}>
                  <span class="input-unit">${tr('tahun', 'yrs')}</span>
                </div>
              </div>
              <div class="field">
                <label>${tr('Jenis kelamin', 'Gender')}</label>
                <div class="radio-cards ${ed ? '' : 'is-locked'}" id="pfJK">
                  <div class="radio-card ${u.jenisKelamin !== 'P' ? 'selected' : ''}" data-val="L"><ion-icon name="male"></ion-icon>${tr('Laki-laki', 'Male')}</div>
                  <div class="radio-card ${u.jenisKelamin === 'P' ? 'selected' : ''}" data-val="P"><ion-icon name="female"></ion-icon>${tr('Perempuan', 'Female')}</div>
                </div>
              </div>
            </div>
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>${tr('Tinggi badan', 'Height')}</label>
                <div class="input-group">
                  <input type="number" class="input" id="pfTinggi" min="100" max="230" value="${u.tinggi || ''}" ${dis}>
                  <span class="input-unit">cm</span>
                </div>
              </div>
              <div class="field">
                <label>${tr('Berat badan', 'Weight')}</label>
                <div class="input-group">
                  <input type="number" class="input" id="pfBerat" min="25" max="200" value="${u.berat || ''}" ${dis}>
                  <span class="input-unit">kg</span>
                </div>
              </div>
            </div>
            <div class="field">
              <label>${tr('Tingkat aktivitas harian', 'Daily activity level')}</label>
              <select class="select" id="pfAktivitas" ${dis}>
                ${Calc.AKTIVITAS.map(a => `<option value="${a.key}" ${a.key === (u.aktivitas || 'ringan') ? 'selected' : ''}>${a.label}</option>`).join('')}
              </select>
            </div>
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>${tr('Kelas', 'Class')}</label>
                ${classes.length ? `
                <select class="select" id="pfKelas" ${dis}>
                  <option value="">${tr('— Pilih kelas —', '— Choose class —')}</option>
                  ${classes.map(c => `<option value="${esc(c.id)}" ${c.id === u.kelasId ? 'selected' : ''}>${esc(c.nama)}</option>`).join('')}
                </select>` : `
                <input type="text" class="input" disabled value="${u.kelasNama ? esc(u.kelasNama) : tr('Belum ada kelas', 'No classes yet')}">`}
              </div>
              <div class="field">
                <label>NIS</label>
                <input type="text" class="input" id="pfNis" inputmode="numeric" maxlength="20" placeholder="${tr('No. Induk Siswa', 'Student ID')}" value="${esc(u.nis || '')}" ${dis}>
              </div>
            </div>
            <div class="field">
              <label>${tr('Asal sekolah', 'School')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
              <input type="text" class="input" id="pfSekolah" placeholder="${tr('mis. SMAN 1 Bandung', 'e.g. Bandung High School 1')}" value="${esc(u.sekolah || '')}" ${dis}>
            </div>
            ${ed ? `<button type="submit" class="btn btn-primary btn-block"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan &amp; Hitung Ulang Target', 'Save &amp; Recalculate Targets')}</button>` : ''}
          </form>
        </div>

        <div style="display:flex;flex-direction:column;gap:18px;">

          <!-- PREFERENSI -->
          <div class="card">
            <div class="card-title"><ion-icon name="options" style="color:var(--prod)"></ion-icon>${tr('Preferensi', 'Preferences')}</div>
            <div style="margin-top:8px;">
              <div class="setting-row">
                <ion-icon name="moon-outline" style="font-size:1.2rem;color:var(--text-3);"></ion-icon>
                <div class="sr-text">
                  <div class="sr-title">${tr('Mode gelap', 'Dark mode')}</div>
                  <div class="sr-sub">${tr('Nyaman di mata &amp; hemat baterai', 'Easy on the eyes &amp; saves battery')}</div>
                </div>
                <label class="switch">
                  <input type="checkbox" id="pfTheme" ${isDark ? 'checked' : ''}>
                  <span class="track"></span>
                </label>
              </div>
              <div class="setting-row">
                <ion-icon name="water-outline" style="font-size:1.2rem;color:var(--info);"></ion-icon>
                <div class="sr-text">
                  <div class="sr-title">${tr('Pengingat minum', 'Water reminder')}</div>
                  <div class="sr-sub">${tr('Notifikasi berkala selama aplikasi terbuka', 'Periodic notifications while the app is open')}</div>
                </div>
                <label class="switch">
                  <input type="checkbox" id="pfReminder" ${u.reminderAir ? 'checked' : ''}>
                  <span class="track"></span>
                </label>
              </div>
              <div class="setting-row" id="pfIntervalRow" style="${u.reminderAir ? '' : 'display:none;'}">
                <ion-icon name="alarm-outline" style="font-size:1.2rem;color:var(--text-3);"></ion-icon>
                <div class="sr-text">
                  <div class="sr-title">${tr('Setiap berapa menit?', 'How often (minutes)?')}</div>
                </div>
                <select class="select" id="pfInterval" style="width:130px;">
                  ${[30, 60, 90, 120].map(m => `<option value="${m}" ${(u.reminderInterval || 60) === m ? 'selected' : ''}>${m} ${tr('menit', 'min')}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- AKUN -->
          <div class="card">
            <div class="card-title"><ion-icon name="shield-checkmark" style="color:var(--fin)"></ion-icon>${tr('Akun &amp; Data', 'Account &amp; Data')}</div>
            <div style="margin-top:8px;">
              <div class="setting-row" style="cursor:pointer;" id="pfInstall" data-pwa-install hidden>
                <ion-icon name="download-outline" style="font-size:1.2rem;color:var(--brand);"></ion-icon>
                <div class="sr-text">
                  <div class="sr-title">${tr('Pasang aplikasi', 'Install app')}</div>
                  <div class="sr-sub">${tr('Tambahkan Tumara ke layar utama', 'Add Tumara to your home screen')}</div>
                </div>
                <ion-icon name="chevron-forward" style="color:var(--text-3);"></ion-icon>
              </div>
              <div class="setting-row" style="cursor:pointer;" id="pfPass">
                <ion-icon name="key-outline" style="font-size:1.2rem;color:var(--text-3);"></ion-icon>
                <div class="sr-text"><div class="sr-title">${tr('Ganti kata sandi', 'Change password')}</div></div>
                <ion-icon name="chevron-forward" style="color:var(--text-3);"></ion-icon>
              </div>
              <div class="setting-row" style="cursor:pointer;" id="pfExport">
                <ion-icon name="download-outline" style="font-size:1.2rem;color:var(--text-3);"></ion-icon>
                <div class="sr-text">
                  <div class="sr-title">${tr('Ekspor data', 'Export data')}</div>
                  <div class="sr-sub">${tr('Unduh semua datamu (JSON)', 'Download all your data (JSON)')}</div>
                </div>
                <ion-icon name="chevron-forward" style="color:var(--text-3);"></ion-icon>
              </div>
              <div class="setting-row" style="cursor:pointer;" id="pfLogout">
                <ion-icon name="log-out-outline" style="font-size:1.2rem;color:var(--text-3);"></ion-icon>
                <div class="sr-text"><div class="sr-title">${tr('Keluar', 'Sign out')}</div></div>
                <ion-icon name="chevron-forward" style="color:var(--text-3);"></ion-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="disclaimer" style="margin-top:22px;">
        <ion-icon name="shield-checkmark-outline"></ion-icon>
        <span>${tr('Tumara membantu membangun kebiasaan sehat dan <b>bukan pengganti nasihat tenaga kesehatan profesional</b>. Bila punya kondisi khusus, konsultasikan dengan dokter/ahli gizi.', 'Tumara helps you build healthy habits and is <b>not a substitute for professional medical advice</b>. If you have a specific condition, consult a doctor/nutritionist.')}</span>
      </div>
      <div style="text-align:center;font-size:.75rem;color:var(--text-3);margin-top:18px;">
        Tumara v1.0 · ${tr('Tumbuh sehat, produktif, terarah 🌱', 'Grow healthy, productive, focused 🌱')}
      </div>`;

    /* --- data diri --- */
    // Tombol ikon edit: aktif/nonaktifkan mode ubah lalu render ulang.
    $('#pfEditToggle', el).onclick = () => {
      this._editing = !this._editing;
      App.refresh();
    };

    let jk = u.jenisKelamin === 'P' ? 'P' : 'L';
    // Pilihan jenis kelamin hanya bisa diubah saat mode edit aktif.
    if (this._editing) {
      $$('#pfJK .radio-card', el).forEach(c => c.onclick = () => {
        jk = c.dataset.val;
        $$('#pfJK .radio-card', el).forEach(x => x.classList.toggle('selected', x === c));
      });
      const nisEl = $('#pfNis', el);
      if (nisEl) nisEl.oninput = () => { nisEl.value = nisEl.value.replace(/\D/g, '').slice(0, 20); };
    }

    $('#pfForm', el).onsubmit = async e => {
      e.preventDefault();
      if (!this._editing) return; // pengaman: tak ada penyimpanan di mode tampilan
      const usia = +$('#pfUsia', el).value, tinggi = +$('#pfTinggi', el).value, berat = +$('#pfBerat', el).value;
      if (!usia) return toast(tr('Masukkan usia kamu.', 'Please enter your age.'), 'warning');
      if (!tinggi || tinggi < 100 || tinggi > 230) return toast(tr('Periksa kembali tinggi badanmu (cm).', 'Please double-check your height (cm).'), 'warning');
      if (!berat || berat < 25 || berat > 200) return toast(tr('Periksa kembali berat badanmu (kg).', 'Please double-check your weight (kg).'), 'warning');

      const aktivitas = $('#pfAktivitas', el).value;
      const tdee = Calc.tdee(Calc.bmr({ jenisKelamin: jk, berat, tinggi, usia }), aktivitas);
      const air = Calc.waterTarget(berat);

      // Kelas & NIS (bila daftar kelas tersedia) — penautan ke roster guru.
      const kelasSel = $('#pfKelas', el);
      const patch = {
        usia, jenisKelamin: jk, tinggi, berat, aktivitas,
        sekolah: $('#pfSekolah', el).value.trim(),
        targetKalori: tdee, targetAir: air.gelas
      };
      if (kelasSel) {
        patch.kelasId = kelasSel.value;
        patch.kelasNama = classes.find(c => c.id === kelasSel.value)?.nama || '';
        patch.nis = ($('#pfNis', el).value || '').replace(/\D/g, '').slice(0, 20);
      }
      await DB.updateUser(patch);
      toast(tr(`Tersimpan! Target baru: ±${tdee.toLocaleString('id-ID')} kkal & ${air.gelas} gelas air/hari 💧`,
               `Saved! New targets: ±${tdee.toLocaleString('id-ID')} kcal & ${air.gelas} glasses of water/day 💧`));
      this._editing = false; // kembali ke mode tampilan setelah simpan
      App.refresh();
    };

    /* --- preferensi --- */
    $('#pfTheme', el).onchange = e => App.setTheme(e.target.checked ? 'dark' : 'light');

    $('#pfReminder', el).onchange = async e => {
      const aktif = e.target.checked;
      const menit = +$('#pfInterval', el).value;

      if (!aktif) {
        await DB.updateUser({ reminderAir: false, reminderInterval: menit });
        $('#pfIntervalRow', el).style.display = 'none';
        App.stopWaterReminder();
        return toast(tr('Pengingat minum dimatikan.', 'Water reminder turned off.'), 'info');
      }

      // Minta izin notifikasi bila belum ditentukan.
      let perm = ('Notification' in window) ? Notification.permission : 'unsupported';
      if (perm === 'default') {
        try { perm = await Notification.requestPermission(); } catch (_) { perm = 'denied'; }
      }

      await DB.updateUser({ reminderAir: true, reminderInterval: menit });
      $('#pfIntervalRow', el).style.display = '';
      App.startWaterReminder();

      if (perm === 'granted') {
        // Notifikasi uji agar pengguna langsung tahu pengingat berfungsi.
        App.notify(tr(`Pengingat minum aktif ✅ Kamu akan diingatkan tiap ${menit} menit.`,
                      `Water reminder is on ✅ You'll be reminded every ${menit} minutes.`));
        toast(tr(`Oke! Notifikasi minum aktif tiap ${menit} menit 💧`,
                 `Okay! Water notifications on every ${menit} minutes 💧`));
      } else if (perm === 'denied') {
        toast(tr('Notifikasi diblokir browser. Aktifkan izin notifikasi untuk situs ini agar pengingat muncul — sementara pengingat hanya tampil di dalam app.',
                 'Notifications are blocked by the browser. Allow notification permission for this site so reminders can appear — for now reminders only show inside the app.'), 'warning');
      } else {
        toast(tr('Browser ini tidak mendukung notifikasi. Pengingat hanya tampil di dalam app.',
                 'This browser does not support notifications. Reminders will only show inside the app.'), 'info');
      }
    };

    $('#pfInterval', el).onchange = async e => {
      await DB.updateUser({ reminderInterval: +e.target.value });
      if (DB.user.reminderAir) App.startWaterReminder();
      toast(tr(`Interval pengingat: tiap ${e.target.value} menit.`, `Reminder interval: every ${e.target.value} minutes.`), 'info');
    };

    /* --- akun --- */
    // Selaraskan tombol "Pasang aplikasi" dengan status PWA (klik ditangani pwa.js).
    if (window.PWA) PWA.sync();

    $('#pfPass', el).onclick = () => this._passwordModal();

    $('#pfExport', el).onclick = async () => {
      downloadJSON(await DB.exportAll(), 'tumara-data.json');
      toast(tr('Data berhasil diekspor 📦', 'Data exported successfully 📦'));
    };

    $('#pfLogout', el).onclick = async () => {
      if (!await confirmDialog(tr('Keluar dari akunmu?', 'Sign out of your account?'), { title: tr('Keluar', 'Sign out'), okText: tr('Ya, keluar', 'Yes, sign out') })) return;
      App.stopWaterReminder();
      App.stopMedReminder();
      await DB.logout();
      App.showAuth();
    };
  },

  _passwordModal() {
    openModal({
      title: tr('Ganti Kata Sandi', 'Change Password'),
      body: `
        <div class="field">
          <label>${tr('Kata sandi lama', 'Old password')}</label>
          <input type="password" class="input" id="mOld" placeholder="••••••••" autocomplete="current-password">
        </div>
        <div class="field">
          <label>${tr('Kata sandi baru', 'New password')}</label>
          <input type="password" class="input" id="mNew" placeholder="${tr('Minimal 6 karakter', 'At least 6 characters')}" autocomplete="new-password">
        </div>
        <div class="field">
          <label>${tr('Ulangi kata sandi baru', 'Repeat new password')}</label>
          <input type="password" class="input" id="mNew2" placeholder="••••••••" autocomplete="new-password">
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan Kata Sandi', 'Save Password')}</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const oldP = $('#mOld', m).value, newP = $('#mNew', m).value;
          if (newP.length < 6) return toast(tr('Kata sandi baru minimal 6 karakter.', 'New password must be at least 6 characters.'), 'warning');
          if (newP !== $('#mNew2', m).value) return toast(tr('Ulangan kata sandi tidak sama.', "Passwords don't match."), 'warning');
          try {
            await DB.changePassword(oldP, newP);
            closeModal();
            toast(tr('Kata sandi berhasil diganti 🔒', 'Password changed successfully 🔒'));
          } catch (err) {
            toast(err.message, 'error');
          }
        };
      }
    });
  }
};
