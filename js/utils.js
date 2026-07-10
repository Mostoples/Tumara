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

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
