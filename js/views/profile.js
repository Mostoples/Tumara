/* ============================================================
   TUMARA — Profil & Pengaturan
   Data diri · Preferensi (tema, pengingat minum) · Akun
   ============================================================ */

const Profile = {

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
          <div class="card-title"><ion-icon name="person" style="color:var(--brand)"></ion-icon>${tr('Data Diri', 'Personal Data')}</div>
          <div class="card-sub">${tr('Dipakai untuk menghitung target kalori &amp; air minum.', 'Used to calculate your calorie &amp; water targets.')}</div>
          <form id="pfForm" novalidate style="margin-top:16px;">
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>${tr('Usia', 'Age')}</label>
                <div class="input-group">
                  <input type="number" class="input" id="pfUsia" min="10" max="25" value="${u.usia || ''}">
                  <span class="input-unit">${tr('tahun', 'yrs')}</span>
                </div>
              </div>
              <div class="field">
                <label>${tr('Jenis kelamin', 'Gender')}</label>
                <div class="radio-cards" id="pfJK">
                  <div class="radio-card ${u.jenisKelamin !== 'P' ? 'selected' : ''}" data-val="L"><ion-icon name="male"></ion-icon>${tr('Laki-laki', 'Male')}</div>
                  <div class="radio-card ${u.jenisKelamin === 'P' ? 'selected' : ''}" data-val="P"><ion-icon name="female"></ion-icon>${tr('Perempuan', 'Female')}</div>
                </div>
              </div>
            </div>
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>${tr('Tinggi badan', 'Height')}</label>
                <div class="input-group">
                  <input type="number" class="input" id="pfTinggi" min="100" max="230" value="${u.tinggi || ''}">
                  <span class="input-unit">cm</span>
                </div>
              </div>
              <div class="field">
                <label>${tr('Berat badan', 'Weight')}</label>
                <div class="input-group">
                  <input type="number" class="input" id="pfBerat" min="25" max="200" value="${u.berat || ''}">
                  <span class="input-unit">kg</span>
                </div>
              </div>
            </div>
            <div class="field">
              <label>${tr('Tingkat aktivitas harian', 'Daily activity level')}</label>
              <select class="select" id="pfAktivitas">
                ${Calc.AKTIVITAS.map(a => `<option value="${a.key}" ${a.key === (u.aktivitas || 'ringan') ? 'selected' : ''}>${a.label}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>${tr('Asal sekolah', 'School')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
              <input type="text" class="input" id="pfSekolah" placeholder="${tr('mis. SMAN 1 Bandung', 'e.g. Bandung High School 1')}" value="${esc(u.sekolah || '')}">
            </div>
            <button type="submit" class="btn btn-primary btn-block"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan &amp; Hitung Ulang Target', 'Save &amp; Recalculate Targets')}</button>
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
              <div class="setting-row" style="cursor:pointer;" id="pfReset">
                <ion-icon name="trash-outline" style="font-size:1.2rem;color:var(--danger);"></ion-icon>
                <div class="sr-text">
                  <div class="sr-title" style="color:var(--danger);">${tr('Hapus semua data', 'Delete all data')}</div>
                  <div class="sr-sub">${tr('Transaksi, tugas, catatan, dll. — tidak bisa dibatalkan', "Transactions, tasks, notes, etc. — can't be undone")}</div>
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
    let jk = u.jenisKelamin === 'P' ? 'P' : 'L';
    $$('#pfJK .radio-card', el).forEach(c => c.onclick = () => {
      jk = c.dataset.val;
      $$('#pfJK .radio-card', el).forEach(x => x.classList.toggle('selected', x === c));
    });

    $('#pfForm', el).onsubmit = async e => {
      e.preventDefault();
      const usia = +$('#pfUsia', el).value, tinggi = +$('#pfTinggi', el).value, berat = +$('#pfBerat', el).value;
      if (!usia || usia < 10 || usia > 25) return toast(tr('Usia harus antara 10–25 tahun.', 'Age must be between 10–25 years.'), 'warning');
      if (!tinggi || tinggi < 100 || tinggi > 230) return toast(tr('Periksa kembali tinggi badanmu (cm).', 'Please double-check your height (cm).'), 'warning');
      if (!berat || berat < 25 || berat > 200) return toast(tr('Periksa kembali berat badanmu (kg).', 'Please double-check your weight (kg).'), 'warning');

      const aktivitas = $('#pfAktivitas', el).value;
      const tdee = Calc.tdee(Calc.bmr({ jenisKelamin: jk, berat, tinggi, usia }), aktivitas);
      const air = Calc.waterTarget(berat);

      await DB.updateUser({
        usia, jenisKelamin: jk, tinggi, berat, aktivitas,
        sekolah: $('#pfSekolah', el).value.trim(),
        targetKalori: tdee, targetAir: air.gelas
      });
      toast(tr(`Tersimpan! Target baru: ±${tdee.toLocaleString('id-ID')} kkal & ${air.gelas} gelas air/hari 💧`,
               `Saved! New targets: ±${tdee.toLocaleString('id-ID')} kcal & ${air.gelas} glasses of water/day 💧`));
      App.refresh();
    };

    /* --- preferensi --- */
    $('#pfTheme', el).onchange = e => App.setTheme(e.target.checked ? 'dark' : 'light');

    $('#pfReminder', el).onchange = async e => {
      const aktif = e.target.checked;
      if (aktif && 'Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      await DB.updateUser({ reminderAir: aktif, reminderInterval: +$('#pfInterval', el).value });
      $('#pfIntervalRow', el).style.display = aktif ? '' : 'none';
      if (aktif) {
        App.startWaterReminder();
        toast(tr(`Oke! Kamu akan diingatkan minum tiap ${$('#pfInterval', el).value} menit 💧`,
                 `Okay! You'll be reminded to drink every ${$('#pfInterval', el).value} minutes 💧`));
      } else {
        App.stopWaterReminder();
        toast(tr('Pengingat minum dimatikan.', 'Water reminder turned off.'), 'info');
      }
    };

    $('#pfInterval', el).onchange = async e => {
      await DB.updateUser({ reminderInterval: +e.target.value });
      if (DB.user.reminderAir) App.startWaterReminder();
      toast(tr(`Interval pengingat: tiap ${e.target.value} menit.`, `Reminder interval: every ${e.target.value} minutes.`), 'info');
    };

    /* --- akun --- */
    $('#pfPass', el).onclick = () => this._passwordModal();

    $('#pfExport', el).onclick = async () => {
      downloadJSON(await DB.exportAll(), 'tumara-data.json');
      toast(tr('Data berhasil diekspor 📦', 'Data exported successfully 📦'));
    };

    $('#pfReset', el).onclick = async () => {
      if (!await confirmDialog(
        tr('Semua transaksi, tugas, catatan, jadwal, dan riwayat kesehatanmu akan dihapus permanen. Yakin?',
           'All your transactions, tasks, notes, schedule, and health history will be permanently deleted. Are you sure?'),
        { title: tr('Hapus semua data', 'Delete all data'), danger: true, okText: tr('Hapus semuanya', 'Delete everything') })) return;
      await DB.resetData();
      toast(tr('Semua data telah dihapus.', 'All data has been deleted.'), 'info');
      App.refresh();
    };

    $('#pfLogout', el).onclick = async () => {
      if (!await confirmDialog(tr('Keluar dari akunmu?', 'Sign out of your account?'), { title: tr('Keluar', 'Sign out'), okText: tr('Ya, keluar', 'Yes, sign out') })) return;
      App.stopWaterReminder();
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
