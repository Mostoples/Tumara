/* ============================================================
   TUMARA — Data Diri (jalur Umum)
   ------------------------------------------------------------
   Langkah wajib setelah memilih pekerjaan (job-select.js) dan
   sebelum masuk umum-app.html: usia, jenis kelamin, tinggi &
   berat badan — dipakai menghitung Indeks BMI serta target
   kalori & air minum harian di halaman Kesehatan (sama seperti
   form "Data Diri" di Profil, lihat js/views/profile.js).
   ============================================================ */

const DataDiriView = {
  render(user) {
    $('#ddRoot').innerHTML = `
      <div class="job-wrap" style="max-width:520px;">
        <div class="job-head">
          <h1>${tr(`Hai, ${esc((user?.nama || '').split(' ')[0] || 'kamu')}! Data dirimu dulu ya.`, `Hi, ${esc((user?.nama || '').split(' ')[0] || 'there')}! A bit about you first.`)}</h1>
          <p>${tr('Usia, tinggi & berat badan dipakai menghitung Indeks BMI serta target kalori & air minum harianmu.', 'Age, height & weight are used to calculate your BMI Index and daily calorie & water targets.')}</p>
        </div>

        <div class="card">
          <form id="ddForm" novalidate>
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>${tr('Usia', 'Age')}</label>
                <div class="input-group">
                  <input type="number" class="input" id="ddUsia" min="5" max="120" placeholder="${tr('mis. 17', 'e.g. 17')}" required>
                  <span class="input-unit">${tr('tahun', 'yrs')}</span>
                </div>
              </div>
              <div class="field">
                <label>${tr('Jenis kelamin', 'Gender')}</label>
                <div class="radio-cards" id="ddJK">
                  <div class="radio-card selected" data-val="L"><ion-icon name="male"></ion-icon>${tr('Laki-laki', 'Male')}</div>
                  <div class="radio-card" data-val="P"><ion-icon name="female"></ion-icon>${tr('Perempuan', 'Female')}</div>
                </div>
              </div>
            </div>
            <div class="grid grid-2 keep-2" style="gap:12px;">
              <div class="field">
                <label>${tr('Tinggi badan', 'Height')}</label>
                <div class="input-group">
                  <input type="number" class="input" id="ddTinggi" min="100" max="230" placeholder="${tr('mis. 165', 'e.g. 165')}" required>
                  <span class="input-unit">cm</span>
                </div>
              </div>
              <div class="field">
                <label>${tr('Berat badan', 'Weight')}</label>
                <div class="input-group">
                  <input type="number" class="input" id="ddBerat" min="25" max="200" placeholder="${tr('mis. 55', 'e.g. 55')}" required>
                  <span class="input-unit">kg</span>
                </div>
              </div>
            </div>
            <div class="field">
              <label>${tr('Tingkat aktivitas harian', 'Daily activity level')}</label>
              <select class="select" id="ddAktivitas" required>
                <option value="" disabled selected>${tr('Silakan pilih...', 'Please select...')}</option>
                ${Calc.AKTIVITAS.map(a => `<option value="${a.key}">${a.label}</option>`).join('')}
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block btn-lg" id="ddSubmit" style="margin-top:8px;">
              ${tr('Lanjutkan', 'Continue')} <ion-icon name="arrow-forward"></ion-icon>
            </button>
          </form>
        </div>

        <div class="disclaimer" style="margin-top:18px;">
          <ion-icon name="shield-checkmark-outline"></ion-icon>
          <span>${tr('Data ini hanya dipakai untuk menghitung target kesehatanmu di Tumara dan bukan pengganti nasihat tenaga kesehatan profesional.', 'This data is only used to calculate your health targets in Tumara and is not a substitute for professional medical advice.')}</span>
        </div>
      </div>`;

    let jk = 'L';
    $$('#ddJK .radio-card').forEach(c => c.onclick = () => {
      jk = c.dataset.val;
      $$('#ddJK .radio-card').forEach(x => x.classList.toggle('selected', x === c));
    });

    $('#ddForm').onsubmit = async e => {
      e.preventDefault();
      const usia = +$('#ddUsia').value, tinggi = +$('#ddTinggi').value, berat = +$('#ddBerat').value;
      if (!usia || usia < 5 || usia > 120) return toast(tr('Masukkan usia yang valid.', 'Enter a valid age.'), 'warning');
      if (!tinggi || tinggi < 100 || tinggi > 230) return toast(tr('Periksa kembali tinggi badanmu (cm).', 'Please double-check your height (cm).'), 'warning');
      if (!berat || berat < 25 || berat > 200) return toast(tr('Periksa kembali berat badanmu (kg).', 'Please double-check your weight (kg).'), 'warning');

      const aktivitas = $('#ddAktivitas').value;
      if (!aktivitas) return toast(tr('Pilih tingkat aktivitas harianmu.', 'Please select your daily activity level.'), 'warning');
      const tdee = Calc.tdee(Calc.bmr({ jenisKelamin: jk, berat, tinggi, usia }), aktivitas);
      const air = Calc.waterTarget(berat);

      const btn = $('#ddSubmit');
      btn.disabled = true;
      try {
        await UmumAuth.saveDataDiri({
          usia, jenisKelamin: jk, tinggi, berat, aktivitas,
          targetKalori: tdee, targetAir: air.gelas
        });
        location.replace('umum-app.html');
      } catch (_) {
        toast(tr('Gagal menyimpan data. Coba lagi.', 'Failed to save your data. Please try again.'), 'error');
        btn.disabled = false;
      }
    };
  }
};
