/* ============================================================
   TUMARA — Utilitas umum (DOM, format, toast, modal, chart SVG)
   ============================================================ */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/* ---------- Tanggal & format ---------- */

// HARI & BULAN kini disediakan js/i18n.js (mengikuti bahasa aktif)

// 'YYYY-MM-DD' berbasis waktu lokal
function todayStr(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function monthStr(d = new Date()) {
  return todayStr(d).slice(0, 7); // 'YYYY-MM'
}

function parseDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
}

function fmtDate(iso, { weekday = false, short = false } = {}) {
  const d = parseDate(iso);
  if (!d || isNaN(d)) return '-';
  const bulan = short ? BULAN[d.getMonth()].slice(0, 3) : BULAN[d.getMonth()];
  const base = `${d.getDate()} ${bulan} ${d.getFullYear()}`;
  return weekday ? `${HARI[d.getDay()]}, ${base}` : base;
}

function fmtRp(n) {
  const num = Math.round(Number(n) || 0);
  const sign = num < 0 ? '-' : '';
  return `${sign}Rp${Math.abs(num).toLocaleString('id-ID')}`;
}

/* ============================================================
   Sembunyikan saldo — seperti tombol "mata" di aplikasi bank.
   ------------------------------------------------------------
   Preferensi tampilan (bukan keamanan), jadi cukup di localStorage
   dan berlaku per perangkat: menyembunyikan angka di HP tidak ikut
   menyembunyikannya di laptop. Dipakai halaman Keuangan & Beranda.
   ============================================================ */
const Saldo = {
  _KEY: 'tumara_saldo_hide',
  get tersembunyi() { return localStorage.getItem(this._KEY) === '1'; },
  set tersembunyi(v) { localStorage.setItem(this._KEY, v ? '1' : '0'); },
  toggle() { this.tersembunyi = !this.tersembunyi; return this.tersembunyi; },

  // Tombol mata untuk dipasang di header kartu/tab.
  btnHTML(id = 'saldoEye') {
    const s = this.tersembunyi;
    return `<button class="btn btn-sm saldo-eye" id="${id}"
      title="${s ? tr('Tampilkan saldo', 'Show balance') : tr('Sembunyikan saldo', 'Hide balance')}"
      aria-label="${s ? tr('Tampilkan saldo', 'Show balance') : tr('Sembunyikan saldo', 'Hide balance')}">
      <ion-icon name="${s ? 'eye-off-outline' : 'eye-outline'}"></ion-icon>
    </button>`;
  }
};

// Rupiah yang menghormati mode sembunyi. Dipakai untuk SEMUA angka uang milik
// pengguna (saldo, transaksi, anggaran, target, utang) — bukan untuk hasil
// hitung kalkulator zakat, yang memang harus selalu terbaca.
function fmtRpM(n) {
  return Saldo.tersembunyi ? 'Rp ••••••' : fmtRp(n);
}

// Selisih hari (tanggal target - hari ini), dalam hari kalender
function daysUntil(iso) {
  const target = parseDate(iso);
  const now = parseDate(todayStr());
  return Math.round((target - now) / 86400000);
}

function deadlineBadge(iso) {
  const d = daysUntil(iso);
  if (d < 0)   return `<span class="badge badge-red"><ion-icon name="alert-circle"></ion-icon>${tr(`Terlambat ${-d} hari`, `${-d} day${-d > 1 ? 's' : ''} overdue`)}</span>`;
  if (d === 0) return `<span class="badge badge-amber"><ion-icon name="time-outline"></ion-icon>${tr('Hari ini', 'Today')}</span>`;
  if (d === 1) return `<span class="badge badge-amber">${tr('Besok', 'Tomorrow')}</span>`;
  if (d <= 7)  return `<span class="badge badge-blue">${tr(`${d} hari lagi`, `${d} days left`)}</span>`;
  return `<span class="badge badge-gray">${fmtDate(iso, { short: true })}</span>`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return tr('Selamat pagi', 'Good morning');
  if (h < 15) return tr('Selamat siang', 'Good afternoon');
  if (h < 18) return tr('Selamat sore', 'Good evening');
  return tr('Selamat malam', 'Good evening');
}

/* ---------- Toast ---------- */

function toast(msg, type = 'success') {
  const icons = {
    success: 'checkmark-circle', error: 'close-circle',
    warning: 'warning', info: 'information-circle'
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<ion-icon name="${icons[type] || icons.info}"></ion-icon><span>${esc(msg)}</span>`;
  $('#toastRoot').appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 320);
  }, 2800);
}

/* ---------- Modal ---------- */

function openModal({ title, body, onMount }) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3>${esc(title)}</h3>
        <button class="mini-icon-btn" data-close><ion-icon name="close"></ion-icon></button>
      </div>
      <div class="modal-body">${body}</div>
    </div>`;
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('[data-close]')) closeModal();
  });
  $('#modalRoot').appendChild(overlay);
  document.body.style.overflow = 'hidden';
  if (onMount) onMount(overlay);
  const firstInput = overlay.querySelector('input, select, textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 60);
  return overlay;
}

function closeModal() {
  $('#modalRoot').innerHTML = '';
  document.body.style.overflow = '';
}

function confirmDialog(message, { title, okText, danger = false } = {}) {
  title = title || tr('Konfirmasi', 'Confirmation');
  okText = okText || tr('Ya, lanjutkan', 'Yes, continue');
  return new Promise(resolve => {
    openModal({
      title,
      body: `
        <p style="font-size:.9rem;color:var(--text-2);line-height:1.6;">${esc(message)}</p>
        <div style="display:flex;gap:10px;margin-top:22px;">
          <button class="btn btn-block" id="cfNo">${tr('Batal', 'Cancel')}</button>
          <button class="btn btn-block ${danger ? 'btn-danger' : 'btn-primary'}" id="cfYes">${esc(okText)}</button>
        </div>`,
      onMount(el) {
        $('#cfNo', el).onclick  = () => { closeModal(); resolve(false); };
        $('#cfYes', el).onclick = () => { closeModal(); resolve(true); };
      }
    });
  });
}

/* ---------- Chart SVG ringan ---------- */

// Ring / circular progress. pct: 0-100
function ringSVG(pct, { size = 130, stroke = 11, color = '#fff', track = 'rgba(255,255,255,.25)', rounded = true } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const val = Math.max(0, Math.min(100, pct || 0));
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - val / 100)}"
        ${rounded ? 'stroke-linecap="round"' : ''}
        style="transition: stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)"/>
    </svg>`;
}

// Bar chart sederhana. items: [{label, value}]
function barChartSVG(items, { color = 'var(--brand)', height = 170, fmtVal = v => v } = {}) {
  if (!items.length) return '';
  const W = 340, padB = 26, padT = 22;
  const max = Math.max(...items.map(i => i.value), 1);
  const gap = 10;
  const bw = Math.min(38, (W - gap * (items.length + 1)) / items.length);
  const startX = (W - (bw * items.length + gap * (items.length - 1))) / 2;
  let bars = '';
  items.forEach((it, i) => {
    const h = Math.max(4, (it.value / max) * (height - padB - padT));
    const x = startX + i * (bw + gap);
    const y = height - padB - h;
    bars += `
      <rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="7" fill="${color}" opacity="${it.value === 0 ? .25 : .9}"/>
      ${it.value > 0 ? `<text x="${x + bw / 2}" y="${y - 7}" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--text-3)">${esc(fmtVal(it.value))}</text>` : ''}
      <text x="${x + bw / 2}" y="${height - 8}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text-3)">${esc(it.label)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${height}" style="font-family:var(--font)">${bars}</svg>`;
}

// Donut chart. items: [{label, value, color}]
function donutSVG(items, { size = 150, stroke = 26 } = {}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  if (total <= 0) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${stroke}"/>
    </svg>`;
  }
  let cum = 0, segs = '';
  items.forEach(it => {
    const frac = it.value / total;
    // sisakan celah kecil antar segmen bila lebih dari 1 segmen
    const gapFrac = items.length > 1 ? 0.012 : 0;
    const len = Math.max(0, (frac - gapFrac)) * c;
    segs += `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
      stroke="${it.color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-cum * c}"/>`;
    cum += frac;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">${segs}</svg>`;
}

/* ---------- Lain-lain ---------- */

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function beep(freq = 830, duration = 0.18, count = 2) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * (duration + 0.12);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t); osc.stop(t + duration + 0.02);
    }
  } catch (_) { /* audio tidak tersedia — abaikan */ }
}

// Pemicu unduhan yang andal lintas-browser.
// Anchor HARUS ada di DOM (Firefox/Safari), dan objek URL baru dilepas
// setelah jeda — melepas terlalu cepat membatalkan unduhan di beberapa
// browser (Firefox & sebagian Chrome/PWA), membuat ekspor gagal senyap.
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
}

function downloadJSON(obj, filename) {
  triggerDownload(
    new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }),
    filename
  );
}

// Ekspor CSV standar (RFC 4180): pemisah koma, baris dipisah CRLF, dan
// BOM UTF-8 agar Excel/Sheets membaca karakter (Rp, é, dll.) dengan benar.
// Sel yang mengandung koma/kutip/baris-baru dibungkus tanda kutip.
function downloadCSV(rows, filename) {
  const esc = v => {
    const s = String(v ?? '');
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

// Kompres gambar (File) → data URL JPEG kecil untuk disimpan di Firestore.
// maxDim membatasi sisi terpanjang; quality 0–1.
function compressImage(file, { maxDim = 800, quality = 0.6 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
      else if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Cetak sepotong HTML lewat jendela baru (untuk unduhan PDF via dialog cetak browser).
function printHTML(title, innerHTML) {
  const w = window.open('', '_blank');
  if (!w) { toast(tr('Izinkan pop-up untuk mencetak/unduh PDF.', 'Allow pop-ups to print/download PDF.'), 'warning'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      /* Margin kertas diatur di @page (bukan padding body), supaya isi memenuhi
         lebar kertas dari tepi margin ke tepi margin — tanpa itu padding body
         menumpuk di atas margin printer dan hasilnya menyempit ke tengah. */
      @page{size:A4;margin:12mm;}
      *{box-sizing:border-box;}
      body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0;padding:20px;font-size:12px;}
      @media print{body{padding:0;}}
      h1,h2,h3{margin:0 0 6px;}

      /* Semua tabel: satu garis tegas, tanpa garis dobel (border-collapse),
         bingkai luar sedikit lebih tebal — seragam dengan kop. */
      table{width:100%;border-collapse:collapse;border:1.5px solid #000;margin-top:10px;}
      /* Hanya tabel yang menyertakan <colgroup> yang lebar kolomnya dikunci.
         Kop TIDAK boleh kena table-layout:fixed — sel logo & kotak kode form
         mengandalkan lebar mengikuti isi. Peramban tanpa :has() jatuh ke
         layout otomatis, dan lebar di colgroup tetap jadi acuan. */
      table:has(> colgroup){table-layout:fixed;}
      th,td{border:1px solid #000;padding:6px 8px;text-align:left;vertical-align:middle;}
      /* Isi sel boleh dipenggal bila terlalu panjang; JUDUL KOLOM tidak —
         tanpa ini judul sempit pecah di tengah kata ("Jumla/h Siswa"). */
      td{overflow-wrap:break-word;}
      th{
        background:#eee;text-align:center;font-size:11px;overflow-wrap:normal;
        -webkit-print-color-adjust:exact;print-color-adjust:exact;
      }
      .nowrap{white-space:nowrap;}
      /* Kepala tabel diulang di tiap halaman & baris tidak terpotong antar halaman. */
      thead{display:table-header-group;}
      tr{page-break-inside:avoid;break-inside:avoid;}
      .red{color:#c00;font-weight:bold;} .center{text-align:center;} .muted{color:#333;}

      /* Kop surat (lihat js/kop.js) — meniru kop cetak sekolah: seluruh bagian
         (logo | identitas | kotak kode form) berada dalam satu bingkai bertepi,
         dengan huruf serif seperti dokumen resmi. */
      table.kop{
        width:100%;margin:0 0 12px;border:2px solid #000;border-collapse:collapse;
        font-family:"Times New Roman",Times,serif;
      }
      table.kop td{border:1px solid #000;padding:5px 8px;vertical-align:middle;}
      table.kop td.kop-logo{width:1%;padding:5px 8px;text-align:center;}
      table.kop td.kop-logo img{max-height:70px;max-width:96px;display:block;margin:0 auto;}
      /* Tinggi minimum → kop tidak "kempis" saat identitasnya pendek. */
      table.kop td.kop-id{text-align:center;padding:6px 12px;height:74px;}
      .kop-lembaga{letter-spacing:.02em;line-height:1.3;}
      .kop-sekolah{font-weight:bold;letter-spacing:.03em;line-height:1.2;margin:2px 0 3px;}
      .kop-alamat{font-size:11px;line-height:1.4;}
      .kop-kontak{font-size:10.5px;line-height:1.4;}
      /* Ukuran menyesuaikan panjang teks — kelasnya dipilih di js/kop.js. */
      .kop-sekolah.sk-l{font-size:25px;}
      .kop-sekolah.sk-m{font-size:21px;}
      .kop-sekolah.sk-s{font-size:18px;}
      .kop-lembaga.lb-l{font-size:14px;}
      .kop-lembaga.lb-m{font-size:12.5px;}
      .kop-lembaga.lb-s{font-size:11px;}
      /* Sel kotak kode form (kanan). width:1% + nowrap → selebar isinya saja,
         sisa lebar diberikan ke kolom identitas sekolah. */
      table.kop td.kop-kb{
        width:1%;padding:4px 10px;font-size:11px;
        text-align:center;vertical-align:middle;white-space:nowrap;
      }
      table.kop td.kop-box-judul{font-size:15px;font-weight:bold;letter-spacing:.04em;padding:5px 14px;}
      table.kop td.kop-hal{min-width:58px;}
      .kop-plain{margin:0 0 8px;}
      /* Baris keterangan di bawah kop (Mata Pelajaran, Kelas, …) */
      table.kop-meta{width:auto;margin:0 0 10px;border:none;font-family:"Times New Roman",Times,serif;}
      table.kop-meta td{border:none;padding:1px 4px 1px 0;font-size:12px;}
      .km-l{min-width:110px;} .km-s{width:8px;} .km-v{font-weight:bold;}

      @media print{.no-print{display:none;}}
    </style></head><body>${innerHTML}
    <div class="no-print" style="margin-top:20px;text-align:center;">
      <button onclick="window.print()" style="padding:8px 18px;font-size:14px;cursor:pointer;">🖨️ Cetak / Simpan PDF</button>
    </div></body></html>`);
  w.document.close();
}

/* ============================================================
   Prioritas tugas — P1/P2/P3
   Dipakai guru (saat mengirim tugas) dan siswa (saat melihatnya),
   jadi definisinya satu tempat agar label & warnanya tak berbeda.
   Data lama tanpa `prioritas` dianggap P2/Sedang.
   ============================================================ */
const PRIORITAS = {
  tinggi: { kode: 'P1', urut: 0, badge: 'badge-red',   nama: () => tr('Tinggi', 'High') },
  sedang: { kode: 'P2', urut: 1, badge: 'badge-amber', nama: () => tr('Sedang', 'Medium') },
  rendah: { kode: 'P3', urut: 2, badge: 'badge-gray',  nama: () => tr('Rendah', 'Low') }
};

function prioKey(p) { return PRIORITAS[p] ? p : 'sedang'; }
function prioUrut(p) { return PRIORITAS[prioKey(p)].urut; }

// Badge "P1 · Tinggi" — satu bentuk untuk halaman guru & siswa.
function prioBadge(p) {
  const d = PRIORITAS[prioKey(p)];
  return `<span class="badge ${d.badge}"><b>${d.kode}</b> · ${d.nama()}</span>`;
}

// Versi ringkas ("P1") untuk baris sempit seperti kartu beranda.
function prioTag(p) {
  const d = PRIORITAS[prioKey(p)];
  return `<span class="badge ${d.badge}" title="${tr('Prioritas', 'Priority')} ${d.nama()}"><b>${d.kode}</b></span>`;
}

/* ============================================================
   makeSortable — susun ulang elemen dengan geser (drag & drop)
   ------------------------------------------------------------
   Memakai Pointer Events, jadi jalan dengan sentuhan (HP) maupun
   tetikus — HTML5 drag-and-drop tidak bekerja di layar sentuh.
   Elemen yang digeser dipindah langsung di DOM; onEnd menerima
   urutan `data-<key>` yang baru untuk disimpan.
   ============================================================ */
function makeSortable(container, { itemSelector, key, ignore, onEnd }) {
  if (!container) return;

  const TEPI = 90;   // jarak dari tepi layar tempat halaman mulai ikut menggulir
  const LAJU = 18;   // kecepatan maksimum gulir otomatis (px per frame)

  const items = () => [...container.querySelectorAll(itemSelector)];

  // Elemen yang benar-benar menggulir; null berarti jendela (kasus Tumara).
  const cariScroller = () => {
    let p = container.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
      const o = getComputedStyle(p).overflowY;
      if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
      p = p.parentElement;
    }
    return null;
  };

  let d = null;   // status seret yang sedang berjalan

  const gulirX = () => (d.sc ? d.sc.scrollLeft : window.scrollX);
  const gulirY = () => (d.sc ? d.sc.scrollTop  : window.scrollY);

  // Posisi kursor dalam koordinat ISI container. Selisih gulir ikut dihitung,
  // jadi tetap sahih walau halaman bergulir di tengah seretan.
  const posisi = () => ({
    x: d.cx - d.rect0.left + (gulirX() - d.s0x),
    y: d.cy - d.rect0.top  + (gulirY() - d.s0y)
  });

  /* Pindahkan placeholder ke slot terdekat.

     Geometri slot DIBEKUKAN saat seretan dimulai. Ini kuncinya: placeholder
     berukuran sama persis dengan tile yang diangkat, jadi tata letak grid tidak
     berubah selama seretan — titik tengah tiap slot tetap. Versi sebelumnya
     mengukur ulang getBoundingClientRect() tiap gerakan; karena tile lain
     bergeser setiap placeholder pindah, titik tengahnya ikut bergeser dan
     placeholder melompat bolak-balik antara dua slot (inilah kedipan cepat itu). */
  const pindahPlaceholder = () => {
    const p = posisi();
    let idx = 0, terdekat = Infinity;
    d.slots.forEach((s, i) => {
      const jarak = Math.hypot(p.x - s.cx, p.y - s.cy);
      if (jarak < terdekat) { terdekat = jarak; idx = i; }
    });
    if (idx === d.idx) return;            // slot tak berubah → jangan sentuh DOM
    d.idx = idx;
    const ref = d.lain[idx] || null;
    (ref ? ref.parentNode : container).insertBefore(d.ph, ref);
  };

  const frame = () => {
    if (!d) return;

    // Gulir otomatis saat kursor mendekati tepi layar, supaya tile bisa dibawa
    // ke bagian halaman yang belum terlihat (di laptop/PC halaman tidak ikut
    // bergerak sendiri mengikuti kursor).
    const kotak = d.sc ? d.sc.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    let v = 0;
    if (d.cy < kotak.top + TEPI)         v = -LAJU * Math.min(1, (kotak.top + TEPI - d.cy) / TEPI);
    else if (d.cy > kotak.bottom - TEPI) v =  LAJU * Math.min(1, (d.cy - (kotak.bottom - TEPI)) / TEPI);
    // behavior:'instant' WAJIB: style.css memasang `html { scroll-behavior: smooth }`,
    // dan tanpa ini setiap frame memicu animasi gulir halus yang saling menimpa —
    // hasilnya halaman malah tersendat atau tidak bergerak sama sekali.
    if (v) {
      const t = d.sc ? d.sc : window;
      const kini = d.sc ? d.sc.scrollTop : window.scrollY;
      t.scrollTo({ top: kini + v, behavior: 'instant' });
    }

    // Tile mengikuti kursor. translate3d (bukan left/top) → digarap compositor,
    // tanpa reflow tiap frame, jadi gerakannya mulus.
    d.el.style.transform =
      `translate3d(${d.cx - d.dx - d.ox}px, ${d.cy - d.dy - d.oy}px, 0) scale(1.04)`;
    pindahPlaceholder();
    d.raf = requestAnimationFrame(frame);
  };

  const selesai = e => {
    if (!d) return;
    const { el, ph, raf, pid } = d;
    cancelAnimationFrame(raf);
    d = null;

    el.classList.remove('sort-dragging');
    ph.replaceWith(el);   // kembali ke grid, di posisi placeholder

    // Kembalikan style asli tile (tile menu tak punya style inline → dibuang,
    // termasuk atribut kosong sisa Object.assign saat seret dimulai).
    el.style.cssText = el._sortCss || '';
    if (!el.getAttribute('style')) el.removeAttribute('style');
    container.classList.remove('sort-active');
    try { container.releasePointerCapture(pid); } catch (_) {}

    onEnd && onEnd(items().map(i => i.dataset[key]));
  };

  container.addEventListener('pointerdown', e => {
    if (!container.classList.contains('sort-on')) return;   // hanya saat mode atur
    if (ignore && e.target.closest(ignore)) return;         // mis. tombol sembunyikan
    const el = e.target.closest(itemSelector);
    if (!el || !container.contains(el)) return;
    e.preventDefault();

    const sc = cariScroller();
    const rect0 = container.getBoundingClientRect();
    const semua = items();
    const r = el.getBoundingClientRect();

    const ph = document.createElement('div');
    ph.className = 'sort-ph';
    ph.style.width = `${r.width}px`;
    ph.style.height = `${r.height}px`;

    d = {
      el, ph, sc, rect0, pid: e.pointerId,
      s0x: sc ? sc.scrollLeft : window.scrollX,
      s0y: sc ? sc.scrollTop  : window.scrollY,
      dx: e.clientX - r.left,          // titik pegang, agar tile tidak "meloncat"
      dy: e.clientY - r.top,
      cx: e.clientX, cy: e.clientY,
      idx: semua.indexOf(el),
      lain: semua.filter(i => i !== el),
      // Titik tengah tiap slot, relatif ke container, dibekukan di sini.
      slots: semua.map(i => {
        const b = i.getBoundingClientRect();
        return { cx: b.left - rect0.left + b.width / 2, cy: b.top - rect0.top + b.height / 2 };
      }),
      raf: 0
    };

    el._sortCss = el.getAttribute('style') || '';
    el.parentNode.insertBefore(ph, el);

    /* Tile yang diseret DIPINDAH ke <body>.

       Sebabnya: `#view` memakai `animation: fadeUp … both`, dan fill-mode `both`
       menahan keyframe terakhir selamanya — jadi #view punya transform identitas
       yang permanen. Elemen ber-transform menjadi containing block untuk anak
       `position: fixed`, sehingga tile "fixed" tadi ikut tergulir bersama halaman
       dan meleset makin jauh dari kursor. Diangkat ke <body>, acuannya kembali
       ke layar. */
    document.body.appendChild(el);
    Object.assign(el.style, {
      position: 'fixed', left: '0', top: '0', margin: '0', transform: 'none',
      width: `${r.width}px`, height: `${r.height}px`,
      zIndex: '900', pointerEvents: 'none', touchAction: 'none',
      transition: 'none',        // .guru-tile punya transition transform → tanpa ini gerakannya tertinggal
      willChange: 'transform'
    });

    // Kalibrasi titik nol: kalau suatu saat <body> pun berada di dalam elemen
    // ber-transform, offset ini yang membuat tile tetap pas di bawah kursor.
    const o = el.getBoundingClientRect();
    d.ox = o.left;
    d.oy = o.top;

    el.classList.add('sort-dragging');
    container.classList.add('sort-active');
    container.setPointerCapture(e.pointerId);
    d.raf = requestAnimationFrame(frame);
  });

  // pointermove hanya mencatat posisi; pemindahan digarap di rAF agar satu
  // frame = satu pembaruan (beberapa event per frame tidak menumpuk reflow).
  container.addEventListener('pointermove', e => {
    if (!d) return;
    e.preventDefault();
    d.cx = e.clientX;
    d.cy = e.clientY;
  });

  container.addEventListener('pointerup', selesai);
  container.addEventListener('pointercancel', selesai);
}
