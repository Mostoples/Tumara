/* ============================================================
   TUMARA — Bilingual (Bahasa Indonesia / English)
   ------------------------------------------------------------
   • tr(id, en)     → pilih teks sesuai bahasa aktif (dipakai di
                      semua string yang dirender lewat JS).
   • data-en="..."  → teks statis di HTML; versi Indonesia diambil
                      dari isi elemen, ditukar otomatis saat ganti
                      bahasa. Untuk atribut: data-en-title /
                      data-en-placeholder.
   • Bahasa tersimpan di localStorage (tumara_lang) dan ikut akun
     lewat field `bahasa` di users/{uid} (disinkronkan oleh app.js).
   ============================================================ */

const I18N = {
  lang: localStorage.getItem('tumara_lang') === 'en' ? 'en' : 'id',

  set(lang, { save = true } = {}) {
    this.lang = lang === 'en' ? 'en' : 'id';
    localStorage.setItem('tumara_lang', this.lang);
    document.documentElement.lang = this.lang;
    this.applyStatic();
    // Simpan ke profil akun bila sudah login & berubah
    if (save && typeof DB !== 'undefined' && DB.user && DB.user.bahasa !== this.lang) {
      DB.updateUser({ bahasa: this.lang }).catch(() => {});
    }
  },

  toggle() { this.set(this.lang === 'id' ? 'en' : 'id'); },

  // Tukar teks statis HTML bertanda data-en (versi ID disimpan otomatis)
  applyStatic(root = document) {
    root.querySelectorAll('[data-en]').forEach(el => {
      if (el.dataset.idText === undefined) el.dataset.idText = el.innerHTML;
      el.innerHTML = this.lang === 'en' ? el.dataset.en : el.dataset.idText;
    });
    [['title', 'enTitle', 'idTitle'], ['placeholder', 'enPlaceholder', 'idPlaceholder']]
      .forEach(([attr, enKey, idKey]) => {
        root.querySelectorAll(`[data-en-${attr}]`).forEach(el => {
          if (el.dataset[idKey] === undefined) el.dataset[idKey] = el.getAttribute(attr) || '';
          el.setAttribute(attr, this.lang === 'en' ? el.dataset[enKey] : el.dataset[idKey]);
        });
      });
  }
};

// Helper global — dipakai di semua view: tr('teks Indonesia', 'English text')
function tr(id, en) { return I18N.lang === 'en' ? (en ?? id) : id; }

/* ---------- Nama hari & bulan (dipakai fmtDate, jadwal, laporan) ---------- */

const HARI_ID  = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_EN  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_EN = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

Object.defineProperty(window, 'HARI',  { get: () => I18N.lang === 'en' ? HARI_EN : HARI_ID });
Object.defineProperty(window, 'BULAN', { get: () => I18N.lang === 'en' ? BULAN_EN : BULAN_ID });

// Terapkan bahasa tersimpan ke teks statis begitu halaman siap
document.addEventListener('DOMContentLoaded', () => I18N.set(I18N.lang, { save: false }));
