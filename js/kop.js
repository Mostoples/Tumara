/* ============================================================
   TUMARA — Kop Surat (letterhead) untuk unduhan PDF guru
   ------------------------------------------------------------
   Setiap sekolah punya kop sendiri, jadi isinya TIDAK di-hardcode:
   guru mengisinya sekali lewat Kop.modal(), tersimpan di profil
   (users/{uid}.kop), lalu dipakai ulang oleh semua ekspor PDF
   (jurnal, penilaian, absensi, jadwal).

   Bentuknya mengikuti form resmi sekolah: logo — identitas lembaga —
   kotak kode form (F.KUR / Edisi / Revisi / Hal), lalu baris keterangan
   (Mata Pelajaran, Kelas, …) yang dikirim tiap ekspor lewat `meta`.
   ============================================================ */

const Kop = {
  DEFAULT: {
    aktif: true,
    logo: '',        // dataURL (dikompres kecil) — ikut tercetak walau offline
    lembaga: '',     // mis. "LEMBAGA PENDIDIKAN MA'ARIF NU CAB BOYOLALI"
    sekolah: '',     // mis. "SMK KARYA NUGRAHA BOYOLALI"
    alamat: '',
    kontak: '',      // e-mail / website
    kotak: true,     // tampilkan kotak kode form di kanan
    kodeForm: '',    // mis. "F.KUR : 15"
    edisi: '',
    revisi: ''
  },

  get() { return { ...this.DEFAULT, ...(DB.user?.kop || {}) }; },

  async save(patch) { await DB.updateUser({ kop: { ...this.get(), ...patch } }); },

  // Kop dianggap "terisi" bila minimal ada nama sekolah/lembaga. Kalau belum,
  // ekspor tetap jalan — hanya memakai judul sederhana (tidak menghalangi guru).
  terisi() {
    const k = this.get();
    return k.aktif && !!(k.sekolah || k.lembaga);
  },

  /* HTML kop untuk jendela cetak. `judul` = nama form (mis. "JURNAL GURU"),
     `meta` = [[label, nilai], …] → baris "Label : nilai" di bawah kop. */
  html({ judul = '', meta = [] } = {}) {
    const k = this.get();
    const baris = meta
      .filter(([, v]) => v !== '' && v != null)
      .map(([l, v]) => `<tr><td class="km-l">${esc(l)}</td><td class="km-s">:</td><td class="km-v">${esc(String(v))}</td></tr>`)
      .join('');
    const metaHTML = baris ? `<table class="kop-meta">${baris}</table>` : '';

    // Belum ada identitas sekolah → judul sederhana saja.
    if (!this.terisi()) {
      return `${judul ? `<h2 class="kop-plain">${esc(judul)}</h2>` : ''}${metaHTML}`;
    }

    /* Ukuran huruf menyesuaikan panjang teks. Nama sekolah bisa sependek
       "SMKN 2" atau sepanjang "SMK KARYA NUGRAHA BOYOLALI": kalau ukurannya
       dipatok satu angka, yang pendek jadi terlihat mungil dan kop terasa
       kosong, sedangkan yang panjang malah pecah dua baris. */
    const ukuran = (teks, [besar, sedang, kecil], [batas1, batas2]) => {
      const n = (teks || '').length;
      return n <= batas1 ? besar : n <= batas2 ? sedang : kecil;
    };
    const skSekolah = ukuran(k.sekolah, ['sk-l', 'sk-m', 'sk-s'], [22, 32]);
    const skLembaga = ukuran(k.lembaga, ['lb-l', 'lb-m', 'lb-s'], [28, 48]);

    const adaKode = !!(k.kodeForm || k.edisi || k.revisi);
    const pakaiKotak = k.kotak && (judul || adaKode);

    /* SATU tabel utuh — kotak kanan BUKAN tabel bersarang.

       Tabel bersarang tidak ikut meninggi mengikuti sel induknya, jadi selalu
       tersisa celah kosong di bawah baris Edisi/Revisi. Dengan rowspan/colspan
       dalam satu tabel, semua sel otomatis terisi penuh setinggi kop —
       sekaligus persis susunan form aslinya. */
    // Jumlah baris kotak: judul + kode = 3, salah satunya saja = 1–2 baris.
    // Tanpa ini, kotak yang dinyalakan tapi kode formnya kosong menyisakan
    // sel-sel kosong menganga.
    const barisKotak = !pakaiKotak ? 1 : (judul && adaKode) ? 3 : (adaKode ? 2 : 1);
    const selKode  = `<td colspan="2" class="kop-kb">${esc(k.kodeForm || '')}</td>`;
    const selHal   = `<td rowspan="2" class="kop-kb kop-hal">Hal :</td>`;
    const selEdisi = `<td class="kop-kb">${k.edisi ? `Edisi : ${esc(k.edisi)}` : ''}</td>
                      <td class="kop-kb">${k.revisi ? `Revisi : ${esc(k.revisi)}` : ''}</td>`;

    const kolomKiri = `
      ${k.logo ? `<td rowspan="${barisKotak}" class="kop-logo"><img src="${k.logo}" alt=""></td>` : ''}
      <td rowspan="${barisKotak}" class="kop-id">
        ${k.lembaga ? `<div class="kop-lembaga ${skLembaga}">${esc(k.lembaga)}</div>` : ''}
        ${k.sekolah ? `<div class="kop-sekolah ${skSekolah}">${esc(k.sekolah)}</div>` : ''}
        ${k.alamat ? `<div class="kop-alamat">${esc(k.alamat)}</div>` : ''}
        ${k.kontak ? `<div class="kop-kontak">${esc(k.kontak)}</div>` : ''}
      </td>`;

    const selJudul = span => `<td colspan="${span}" class="kop-kb kop-box-judul">${esc(judul)}</td>`;

    const isi = !pakaiKotak
      ? `<tr>${kolomKiri}</tr>`
      : (judul && adaKode)
        ? `<tr>${kolomKiri}${selJudul(3)}</tr>
           <tr>${selKode}${selHal}</tr>
           <tr>${selEdisi}</tr>`
        : adaKode
          ? `<tr>${kolomKiri}${selKode}${selHal}</tr>
             <tr>${selEdisi}</tr>`
          : `<tr>${kolomKiri}${selJudul(1)}</tr>`;   // hanya judul form, tanpa kotak kode

    return `
      <table class="kop">${isi}</table>
      ${!pakaiKotak && judul ? `<h2 class="kop-plain">${esc(judul)}</h2>` : ''}
      ${metaHTML}`;
  },

  /* Modal pengaturan kop. onSaved dipanggil setelah tersimpan. */
  modal(onSaved) {
    const k = this.get();
    let logo = k.logo || '';

    openModal({
      title: tr('Kop Surat Unduhan', 'Download Letterhead'),
      body: `
        <div style="font-size:.82rem;color:var(--text-3);margin-bottom:14px;">
          ${tr('Kop ini dipakai di semua unduhan PDF (jurnal, penilaian, absensi, jadwal). Isi sekali, otomatis terpakai.',
               'This letterhead is used on all PDF downloads (journal, grades, attendance, schedule). Fill once, reused everywhere.')}
        </div>

        <div class="field">
          <label>${tr('Logo sekolah', 'School logo')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label>
          <input type="file" accept="image/*" class="input" id="kLogo">
          <div id="kLogoPrev" style="margin-top:8px;display:flex;align-items:center;gap:10px;">
            ${logo ? `<img src="${logo}" style="max-height:56px;border-radius:6px;border:1px solid var(--border);">
                      <button type="button" class="btn btn-sm" id="kLogoDel"><ion-icon name="trash-outline"></ion-icon> ${tr('Hapus', 'Remove')}</button>` : ''}
          </div>
        </div>

        <div class="field"><label>${tr('Nama lembaga / yayasan', 'Institution name')}</label>
          <input type="text" class="input" id="kLembaga" placeholder="${tr('mis. LEMBAGA PENDIDIKAN MA\'ARIF NU CAB BOYOLALI', 'e.g. FOUNDATION NAME')}" value="${esc(k.lembaga)}"></div>

        <div class="field"><label>${tr('Nama sekolah', 'School name')}</label>
          <input type="text" class="input" id="kSekolah" placeholder="${tr('mis. SMK KARYA NUGRAHA BOYOLALI', 'e.g. SMK KARYA NUGRAHA')}" value="${esc(k.sekolah)}"></div>

        <div class="field"><label>${tr('Alamat & telepon', 'Address & phone')}</label>
          <input type="text" class="input" id="kAlamat" placeholder="${tr('mis. Sariasih Karanggeneng, Boyolali. Telp : (0276) 321749', 'e.g. street, city. Phone')}" value="${esc(k.alamat)}"></div>

        <div class="field"><label>${tr('E-mail / website', 'E-mail / website')}</label>
          <input type="text" class="input" id="kKontak" placeholder="mis. e-mail : sekolah@mail.com, website : sekolah.sch.id" value="${esc(k.kontak)}"></div>

        <label style="display:flex;align-items:center;gap:10px;font-size:.85rem;font-weight:600;color:var(--text-2);cursor:pointer;margin:4px 0 14px;">
          <input type="checkbox" id="kKotak" ${k.kotak ? 'checked' : ''} style="width:17px;height:17px;accent-color:var(--brand);">
          ${tr('Tampilkan kotak kode form (F.KUR / Edisi / Revisi)', 'Show form-code box (F.KUR / Edition / Revision)')}
        </label>

        <div id="kKotakFields" style="${k.kotak ? '' : 'display:none;'}">
          <div class="field"><label>${tr('Kode form', 'Form code')}</label>
            <input type="text" class="input" id="kKode" placeholder="mis. F.KUR : 15" value="${esc(k.kodeForm)}"></div>
          <div class="grid grid-2 keep-2" style="gap:12px;">
            <div class="field"><label>${tr('Edisi', 'Edition')}</label><input type="text" class="input" id="kEdisi" placeholder="1" value="${esc(k.edisi)}"></div>
            <div class="field"><label>${tr('Revisi', 'Revision')}</label><input type="text" class="input" id="kRevisi" placeholder="2" value="${esc(k.revisi)}"></div>
          </div>
        </div>

        <label style="display:flex;align-items:center;gap:10px;font-size:.85rem;font-weight:600;color:var(--text-2);cursor:pointer;margin:4px 0 18px;">
          <input type="checkbox" id="kAktif" ${k.aktif ? 'checked' : ''} style="width:17px;height:17px;accent-color:var(--brand);">
          ${tr('Pakai kop pada unduhan PDF', 'Use letterhead on PDF downloads')}
        </label>

        <button class="btn btn-primary btn-block" id="kSave"><ion-icon name="checkmark"></ion-icon> ${tr('Simpan Kop', 'Save Letterhead')}</button>`,

      onMount: m => {
        const prev = $('#kLogoPrev', m);
        const gambarPrev = () => {
          prev.innerHTML = logo
            ? `<img src="${logo}" style="max-height:56px;border-radius:6px;border:1px solid var(--border);">
               <button type="button" class="btn btn-sm" id="kLogoDel"><ion-icon name="trash-outline"></ion-icon> ${tr('Hapus', 'Remove')}</button>`
            : '';
          const del = $('#kLogoDel', m);
          if (del) del.onclick = () => { logo = ''; gambarPrev(); };
        };
        gambarPrev();

        // Logo disimpan sebagai dataURL kecil di dokumen profil (bukan Storage)
        // supaya ikut tercetak tanpa perlu koneksi saat jendela cetak dibuka.
        $('#kLogo', m).onchange = async e => {
          const f = e.target.files[0];
          if (!f) return;
          try {
            logo = await compressImage(f, { maxDim: 300, quality: 0.8 });
            gambarPrev();
          } catch (_) {
            toast(tr('Gagal membaca gambar logo.', 'Failed to read the logo image.'), 'error');
          }
        };

        $('#kKotak', m).onchange = e => {
          $('#kKotakFields', m).style.display = e.target.checked ? '' : 'none';
        };

        $('#kSave', m).onclick = async () => {
          const btn = $('#kSave', m); btn.disabled = true;
          try {
            await this.save({
              aktif:    $('#kAktif', m).checked,
              logo,
              lembaga:  $('#kLembaga', m).value.trim(),
              sekolah:  $('#kSekolah', m).value.trim(),
              alamat:   $('#kAlamat', m).value.trim(),
              kontak:   $('#kKontak', m).value.trim(),
              kotak:    $('#kKotak', m).checked,
              kodeForm: $('#kKode', m).value.trim(),
              edisi:    $('#kEdisi', m).value.trim(),
              revisi:   $('#kRevisi', m).value.trim()
            });
            closeModal();
            toast(tr('Kop surat tersimpan 🏫', 'Letterhead saved 🏫'));
            onSaved && onSaved();
          } catch (e) { btn.disabled = false; toast(e.message, 'error'); }
        };
      }
    });
  },

  // Tombol pintasan "Kop" untuk toolbar ekspor.
  btnHTML(id = 'kopSet') {
    return `<button class="btn btn-sm" id="${id}" style="margin-bottom:1px;" title="${tr('Atur kop surat unduhan', 'Set download letterhead')}">
      <ion-icon name="business-outline"></ion-icon> ${tr('Kop', 'Letterhead')}</button>`;
  }
};
