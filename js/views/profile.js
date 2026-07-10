/* ============================================================
   TUMARA — Profil & Pengaturan
   Data diri · Preferensi (tema, pengingat minum) · Akun
   ============================================================ */

const Profile = {

  _inisial(nama) {
    return (nama || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  },

  async render(el) {
    const u = DB.user;
    const isDark = document.documentElement.dataset.theme === 'dark';

    el.innerHTML = `
      <!-- HEADER PROFIL -->
      <div class="card profile-head">
        <div class="avatar">${esc(this._inisial(u.nama))}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;font-size:1.15rem;letter-spacing:-.01em;">${esc(u.nama)}</div>
          <div style="font-size:.84rem;color:var(--text-3);margin-top:2px;">${esc(u.email)}</div>
          ${u.sekolah ? `<span class="badge badge-green" style="margin-top:8px;"><ion-icon name="school-outline"></ion-icon>${esc(u.sekolah)}</span>` : ''}
        </div>
      </div>

      <div class="grid grid-2" style="align-items:start;margin-top:18px;">

        <!-- DATA DIRI -->
        <div class="card">
          <div class="card-title"><ion-icon name="person" style="color:var(--brand)"></ion-icon>Data Diri</div>
          <div class="card-sub">Dipakai untuk menghitung target kalori &amp; air minum.</div>
          <form id="pfForm" novalidate style="margin-top:16px;">
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>Usia</label>
                <div class="input-group">
                  <input type="number" class="input" id="pfUsia" min="10" max="25" value="${u.usia || ''}">
                  <span class="input-unit">tahun</span>
                </div>
              </div>
              <div class="field">
                <label>Jenis kelamin</label>
                <div class="radio-cards" id="pfJK">
                  <div class="radio-card ${u.jenisKelamin !== 'P' ? 'selected' : ''}" data-val="L"><ion-icon name="male"></ion-icon>Laki-laki</div>
                  <div class="radio-card ${u.jenisKelamin === 'P' ? 'selected' : ''}" data-val="P"><ion-icon name="female"></ion-icon>Perempuan</div>
                </div>
              </div>
            </div>
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>Tinggi badan</label>
                <div class="input-group">
                  <input type="number" class="input" id="pfTinggi" min="100" max="230" value="${u.tinggi || ''}">
                  <span class="input-unit">cm</span>
                </div>
              </div>
              <div class="field">
                <label>Berat badan</label>
                <div class="input-group">
                  <input type="number" class="input" id="pfBerat" min="25" max="200" value="${u.berat || ''}">
                  <span class="input-unit">kg</span>
                </div>
              </div>
            </div>
            <div class="field">
              <label>Tingkat aktivitas harian</label>
              <select class="select" id="pfAktivitas">
                ${Calc.AKTIVITAS.map(a => `<option value="${a.key}" ${a.key === (u.aktivitas || 'ringan') ? 'selected' : ''}>${a.label}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>Asal sekolah <span style="font-weight:500;color:var(--text-3)">(opsional)</span></label>
              <input type="text" class="input" id="pfSekolah" placeholder="mis. SMAN 1 Bandung" value="${esc(u.sekolah || '')}">
            </div>
            <button type="submit" class="btn btn-primary btn-block"><ion-icon name="checkmark"></ion-icon> Simpan &amp; Hitung Ulang Target</button>
          </form>
        </div>

        <div style="display:flex;flex-direction:column;gap:18px;">

          <!-- PREFERENSI -->
          <div class="card">
            <div class="card-title"><ion-icon name="options" style="color:var(--prod)"></ion-icon>Preferensi</div>
            <div style="margin-top:8px;">
              <div class="setting-row">
                <ion-icon name="moon-outline" style="font-size:1.2rem;color:var(--text-3);"></ion-icon>
                <div class="sr-text">
                  <div class="sr-title">Mode gelap</div>
                  <div class="sr-sub">Nyaman di mata &amp; hemat baterai</div>
                </div>
                <label class="switch">
                  <input type="checkbox" id="pfTheme" ${isDark ? 'checked' : ''}>
                  <span class="track"></span>
                </label>
              </div>
              <div class="setting-row">
                <ion-icon name="water-outline" style="font-size:1.2rem;color:var(--info);"></ion-icon>
                <div class="sr-text">
                  <div class="sr-title">Pengingat minum</div>
                  <div class="sr-sub">Notifikasi berkala selama aplikasi terbuka</div>
                </div>
                <label class="switch">
                  <input type="checkbox" id="pfReminder" ${u.reminderAir ? 'checked' : ''}>
                  <span class="track"></span>
                </label>
              </div>
              <div class="setting-row" id="pfIntervalRow" style="${u.reminderAir ? '' : 'display:none;'}">
                <ion-icon name="alarm-outline" style="font-size:1.2rem;color:var(--text-3);"></ion-icon>
                <div class="sr-text">
                  <div class="sr-title">Setiap berapa menit?</div>
                </div>
                <select class="select" id="pfInterval" style="width:130px;">
                  ${[30, 60, 90, 120].map(m => `<option value="${m}" ${(u.reminderInterval || 60) === m ? 'selected' : ''}>${m} menit</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- AKUN -->
          <div class="card">
            <div class="card-title"><ion-icon name="shield-checkmark" style="color:var(--fin)"></ion-icon>Akun &amp; Data</div>
            <div style="margin-top:8px;">
              <div class="setting-row" style="cursor:pointer;" id="pfPass">
                <ion-icon name="key-outline" style="font-size:1.2rem;color:var(--text-3);"></ion-icon>
                <div class="sr-text"><div class="sr-title">Ganti kata sandi</div></div>
                <ion-icon name="chevron-forward" style="color:var(--text-3);"></ion-icon>
              </div>
              <div class="setting-row" style="cursor:pointer;" id="pfExport">
                <ion-icon name="download-outline" style="font-size:1.2rem;color:var(--text-3);"></ion-icon>
                <div class="sr-text">
                  <div class="sr-title">Ekspor data</div>
                  <div class="sr-sub">Unduh semua datamu (JSON)</div>
                </div>
                <ion-icon name="chevron-forward" style="color:var(--text-3);"></ion-icon>
              </div>
              <div class="setting-row" style="cursor:pointer;" id="pfReset">
                <ion-icon name="trash-outline" style="font-size:1.2rem;color:var(--danger);"></ion-icon>
                <div class="sr-text">
                  <div class="sr-title" style="color:var(--danger);">Hapus semua data</div>
                  <div class="sr-sub">Transaksi, tugas, catatan, dll. — tidak bisa dibatalkan</div>
                </div>
                <ion-icon name="chevron-forward" style="color:var(--text-3);"></ion-icon>
              </div>
              <div class="setting-row" style="cursor:pointer;" id="pfLogout">
                <ion-icon name="log-out-outline" style="font-size:1.2rem;color:var(--text-3);"></ion-icon>
                <div class="sr-text"><div class="sr-title">Keluar</div></div>
                <ion-icon name="chevron-forward" style="color:var(--text-3);"></ion-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="disclaimer" style="margin-top:22px;">
        <ion-icon name="shield-checkmark-outline"></ion-icon>
        <span>Tumara membantu membangun kebiasaan sehat dan <b>bukan pengganti nasihat tenaga kesehatan profesional</b>. Bila punya kondisi khusus, konsultasikan dengan dokter/ahli gizi.</span>
      </div>
      <div style="text-align:center;font-size:.75rem;color:var(--text-3);margin-top:18px;">
        Tumara v1.0 · Tumbuh sehat, produktif, terarah 🌱
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
      if (!usia || usia < 10 || usia > 25) return toast('Usia harus antara 10–25 tahun.', 'warning');
      if (!tinggi || tinggi < 100 || tinggi > 230) return toast('Periksa kembali tinggi badanmu (cm).', 'warning');
      if (!berat || berat < 25 || berat > 200) return toast('Periksa kembali berat badanmu (kg).', 'warning');

      const aktivitas = $('#pfAktivitas', el).value;
      const tdee = Calc.tdee(Calc.bmr({ jenisKelamin: jk, berat, tinggi, usia }), aktivitas);
      const air = Calc.waterTarget(berat);

      await DB.updateUser({
        usia, jenisKelamin: jk, tinggi, berat, aktivitas,
        sekolah: $('#pfSekolah', el).value.trim(),
        targetKalori: tdee, targetAir: air.gelas
      });
      toast(`Tersimpan! Target baru: ±${tdee.toLocaleString('id-ID')} kkal & ${air.gelas} gelas air/hari 💧`);
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
        toast(`Oke! Kamu akan diingatkan minum tiap ${$('#pfInterval', el).value} menit 💧`);
      } else {
        App.stopWaterReminder();
        toast('Pengingat minum dimatikan.', 'info');
      }
    };

    $('#pfInterval', el).onchange = async e => {
      await DB.updateUser({ reminderInterval: +e.target.value });
      if (DB.user.reminderAir) App.startWaterReminder();
      toast(`Interval pengingat: tiap ${e.target.value} menit.`, 'info');
    };

    /* --- akun --- */
    $('#pfPass', el).onclick = () => this._passwordModal();

    $('#pfExport', el).onclick = async () => {
      downloadJSON(await DB.exportAll(), 'tumara-data.json');
      toast('Data berhasil diekspor 📦');
    };

    $('#pfReset', el).onclick = async () => {
      if (!await confirmDialog(
        'Semua transaksi, tugas, catatan, jadwal, dan riwayat kesehatanmu akan dihapus permanen. Yakin?',
        { title: 'Hapus semua data', danger: true, okText: 'Hapus semuanya' })) return;
      await DB.resetData();
      toast('Semua data telah dihapus.', 'info');
      App.refresh();
    };

    $('#pfLogout', el).onclick = async () => {
      if (!await confirmDialog('Keluar dari akunmu?', { title: 'Keluar', okText: 'Ya, keluar' })) return;
      App.stopWaterReminder();
      await DB.logout();
      App.showAuth();
    };
  },

  _passwordModal() {
    openModal({
      title: 'Ganti Kata Sandi',
      body: `
        <div class="field">
          <label>Kata sandi lama</label>
          <input type="password" class="input" id="mOld" placeholder="••••••••" autocomplete="current-password">
        </div>
        <div class="field">
          <label>Kata sandi baru</label>
          <input type="password" class="input" id="mNew" placeholder="Minimal 6 karakter" autocomplete="new-password">
        </div>
        <div class="field">
          <label>Ulangi kata sandi baru</label>
          <input type="password" class="input" id="mNew2" placeholder="••••••••" autocomplete="new-password">
        </div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> Simpan Kata Sandi</button>`,
      onMount: m => {
        $('#mSave', m).onclick = async () => {
          const oldP = $('#mOld', m).value, newP = $('#mNew', m).value;
          if (newP.length < 6) return toast('Kata sandi baru minimal 6 karakter.', 'warning');
          if (newP !== $('#mNew2', m).value) return toast('Ulangan kata sandi tidak sama.', 'warning');
          try {
            await DB.changePassword(oldP, newP);
            closeModal();
            toast('Kata sandi berhasil diganti 🔒');
          } catch (err) {
            toast(err.message, 'error');
          }
        };
      }
    });
  }
};
