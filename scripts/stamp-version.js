/* ============================================================
   TUMARA — Cap versi build (dijalankan otomatis oleh "predeploy"
   di firebase.json, sebelum setiap `firebase deploy`).

   Menempelkan cap waktu build ke version.json TANPA membuang versi
   semantik yang ditulis tangan:

       {"version": "1.3.2"}  ->  {"version": "1.3.2+20260713-113045"}

   Kenapa perlu: js/version-check.js di sisi pengguna membandingkan
   isi version.json secara berkala. Bila string-nya tidak pernah
   berubah, pengguna yang tabnya sedang terbuka TIDAK akan pernah
   ditarik ke versi baru dan bisa nyangkut di JS/CSS lama.

   Basis semantik diambil dari bagian SEBELUM '+', jadi menjalankan
   skrip ini berulang kali tidak menumpuk cap (1.3.2+a -> 1.3.2+b).
   Naikkan angka semantiknya (1.3.2 -> 1.3.3) dengan tangan seperti
   biasa; cap waktu di belakangnya yang mengurus cache-busting.

   CATATAN: perintah predeploy TIDAK BOLEH mengandung karakter '='.
   Firebase CLI menolak perintah ber-'=' dengan peringatan lalu tetap
   melaporkan sukses — gagal secara diam-diam. Itulah sebabnya logika
   ini tinggal di file terpisah, bukan sebagai `node -e "..."` inline.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'version.json');

const current = JSON.parse(fs.readFileSync(FILE, 'utf8')).version || '0.0.0';
const base = String(current).split('+')[0];

const d = new Date();
const p = (n) => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  + `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;

const version = `${base}+${stamp}`;
fs.writeFileSync(FILE, JSON.stringify({ version }) + '\n');
console.log(`version.json -> ${version}`);
