/* ============================================================
   TUMARA — Penyimpanan File (foto & PDF)
   ------------------------------------------------------------
   Dua backend berbagi SATU antarmuka `Storage`:
     • Google Drive (via Apps Script Web App)  ← aktif sekarang
     • Supabase Storage                        ← cadangan

   Ganti backend cukup dengan mengubah STORAGE_BACKEND di bawah.
   Yang disimpan ke Firestore hanya URL/metadata hasil upload —
   view (teacher.js / productivity.js) tidak perlu tahu backend-nya.
   ============================================================ */

// 'drive' → Google Drive (1 akun, 15 GB). 'supabase' → Supabase Storage (1 GB).
const STORAGE_BACKEND = 'drive';

/* ---------- Konfigurasi Google Drive (Apps Script) ----------
   DRIVE_ENDPOINT: URL Web App /exec hasil deploy google-apps-script/Code.gs.
   DRIVE_TOKEN   : harus SAMA PERSIS dengan TOKEN di Code.gs. */
const DRIVE_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx35iNi95HDzQkaFpHq-9vC7oGFQ-4CW9yM8F3KY5OORsvuUgC0NSKMFo1nmOrXjaI/exec';
const DRIVE_TOKEN    = 'TuMaRa2026'; // <-- samakan dengan TOKEN di Code.gs

/* ---------- Konfigurasi Supabase (cadangan) ---------- */
const SUPABASE_URL  = 'https://bdzuucnbjxwdsfaxlwmt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkenV1Y25ianh3ZHNmYXhsd210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTE4MDYsImV4cCI6MjA5OTMyNzgwNn0.ibWOOTy6svSTVPWNt0vWDuRv3bNKpPNnn-KF9OsncDU';

// Nama "folder" (Drive) / prefiks path (Supabase) per jenis file.
const BUCKETS = {
  jurnal: 'jurnal-foto',        // foto kegiatan pada Jurnal Mengajar
  jadwal: 'jadwal-foto',        // foto Jadwal Mengajar (halaman guru)
  tugas: 'tugas-lampiran',      // lampiran foto tugas DARI GURU
  pengumpulan: 'tugas-jawaban', // pengumpulan siswa (foto ATAU PDF)
};
const BUCKET_CADANGAN = 'jurnal-foto';

/* ============================================================
   Util bersama
   ============================================================ */

// File → base64 (tanpa prefiks "data:...;base64,").
async function _fileToBase64(file) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error('Gagal membaca file.'));
    r.readAsDataURL(file);
  });
  return String(dataUrl).split(',')[1] || '';
}
function _dataUrlToBase64(dataUrl) { return String(dataUrl).split(',')[1] || ''; }

/* ============================================================
   BACKEND: GOOGLE DRIVE (Apps Script Web App)
   ============================================================ */
const DriveBackend = {
  buckets: BUCKETS,
  ready() { return !!DRIVE_ENDPOINT; },

  async _post(payload) {
    if (!DRIVE_ENDPOINT) throw new Error('Google Drive belum dikonfigurasi (DRIVE_ENDPOINT kosong).');
    // Content-Type text/plain → permintaan "simple", menghindari preflight CORS
    // yang tidak didukung Apps Script. redirect:follow → mengikuti 302 /exec
    // ke googleusercontent yang menyajikan respons dengan CORS terbuka.
    const res = await fetch(DRIVE_ENDPOINT, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: DRIVE_TOKEN, ...payload }),
    });
    const out = await res.json();
    if (!out || !out.ok) throw new Error((out && out.error) || 'Upload gagal.');
    return out;
  },

  // Foto (gambar) → dikompres → kembalikan URL (thumbnail, agar bisa tampil inline).
  async uploadFoto(file, jenis = 'umum', { maxDim = 1000, quality = 0.6 } = {}) {
    const dataUrl = await compressImage(file, { maxDim, quality });
    const out = await this._post({
      action: 'upload', folder: jenis, name: `${Date.now()}.jpg`,
      mimeType: 'image/jpeg', data: _dataUrlToBase64(dataUrl),
    });
    return out.thumb || out.url;
  },

  // Sebarang file (foto ATAU PDF). Gambar dikompres; PDF/dokumen diunggah utuh.
  async uploadFile(file, jenis = 'umum', { maxDim = 1400, quality = 0.7, maxMB = 15 } = {}) {
    const isImg = (file.type || '').startsWith('image/');
    let data, mimeType, name;
    if (isImg) {
      const dataUrl = await compressImage(file, { maxDim, quality });
      data = _dataUrlToBase64(dataUrl); mimeType = 'image/jpeg'; name = `${Date.now()}.jpg`;
    } else {
      if (file.size > maxMB * 1024 * 1024) {
        throw new Error(tr(`File terlalu besar (maks ${maxMB}MB).`, `File too large (max ${maxMB}MB).`));
      }
      data = await _fileToBase64(file);
      mimeType = file.type || 'application/octet-stream';
      name = file.name || 'file';
    }
    const out = await this._post({ action: 'upload', folder: jenis, name, mimeType, data });
    const isPdf = mimeType.includes('pdf');
    // Gambar → pakai thumbnail (bisa tampil inline). PDF → link viewer Drive.
    return { url: isPdf ? out.url : (out.thumb || out.url), name: file.name || name, type: mimeType, isPdf };
  },

  // Hapus file berdasarkan URL-nya (best-effort). File lama Supabase dilewati.
  async deleteByUrl(url) {
    if (!url) return;
    const m = String(url).match(/[?&]id=([^&]+)/) || String(url).match(/\/d\/([^/]+)/);
    if (!m) return;   // bukan URL Drive (mis. file lama Supabase / base64) → abaikan
    try { await this._post({ action: 'delete', fileId: decodeURIComponent(m[1]) }); } catch (_) { /* abaikan */ }
  },
};

/* ============================================================
   BACKEND: SUPABASE STORAGE (cadangan)
   ============================================================ */
const _sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON) : null;

const SupabaseBackend = {
  buckets: BUCKETS,
  ready() { return !!_sb; },

  async uploadFoto(file, jenis = 'umum', { maxDim = 1000, quality = 0.6 } = {}) {
    if (!_sb) throw new Error('Supabase belum siap (library gagal dimuat).');
    const bucket = BUCKETS[jenis] || BUCKET_CADANGAN;
    const dataUrl = await compressImage(file, { maxDim, quality });
    const blob = await (await fetch(dataUrl)).blob();
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${jenis}/${Date.now()}-${rand}.jpg`;
    const { error } = await _sb.storage.from(bucket).upload(path, blob, {
      contentType: 'image/jpeg', cacheControl: '3600', upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data } = _sb.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadFile(file, jenis = 'umum', { maxDim = 1400, quality = 0.7, maxMB = 15 } = {}) {
    if (!_sb) throw new Error('Supabase belum siap (library gagal dimuat).');
    const bucket = BUCKETS[jenis] || BUCKET_CADANGAN;
    const isImg = (file.type || '').startsWith('image/');
    let blob, ext, contentType;
    if (isImg) {
      const dataUrl = await compressImage(file, { maxDim, quality });
      blob = await (await fetch(dataUrl)).blob();
      ext = 'jpg'; contentType = 'image/jpeg';
    } else {
      if (file.size > maxMB * 1024 * 1024) {
        throw new Error(tr(`File terlalu besar (maks ${maxMB}MB).`, `File too large (max ${maxMB}MB).`));
      }
      blob = file;
      ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
      contentType = file.type || 'application/octet-stream';
    }
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${jenis}/${Date.now()}-${rand}.${ext}`;
    const { error } = await _sb.storage.from(bucket).upload(path, blob, {
      contentType, cacheControl: '3600', upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data } = _sb.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, name: file.name || 'file', type: contentType, isPdf: contentType.includes('pdf') };
  },

  async deleteByUrl(url) {
    if (!_sb || !url) return;
    const cocok = String(url).match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!cocok) return;
    const [, bucket, path] = cocok;
    try { await _sb.storage.from(bucket).remove([decodeURIComponent(path)]); } catch (_) { /* abaikan */ }
  },
};

/* ============================================================
   Pilih backend aktif
   ============================================================ */
const Storage = (STORAGE_BACKEND === 'drive') ? DriveBackend : SupabaseBackend;
