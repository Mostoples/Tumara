/* ============================================================
   TUMARA — Penyimpanan Foto via Supabase Storage
   Fungsinya HANYA menggantikan Firebase Storage untuk menyimpan
   FILE foto. Data lain (jurnal, akun, dll.) tetap di Firestore;
   yang dicatat di Firestore cukup URL publik hasil upload ini.

   Prasyarat di dashboard Supabase (sekali saja):
   1. Storage → New bucket → buat SATU bucket per jenis foto (lihat BUCKETS
      di bawah) → centang Public pada masing-masing.
   2. Tambahkan policy upload/hapus untuk role anon pada tiap bucket
      (lihat docs/tutorial-supabase.md bagian "Policy").
   ============================================================ */

const SUPABASE_URL  = 'https://bdzuucnbjxwdsfaxlwmt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkenV1Y25ianh3ZHNmYXhsd210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTE4MDYsImV4cCI6MjA5OTMyNzgwNn0.ibWOOTy6svSTVPWNt0vWDuRv3bNKpPNnn-KF9OsncDU';

/* Satu bucket per jenis foto. Kuncinya = argumen `jenis` pada uploadFoto().
   Dipisah supaya foto jadwal punya bucket sendiri dan tidak menumpang di
   bucket jurnal — kuota dan policy-nya jadi bisa diatur terpisah. */
const BUCKETS = {
  jurnal: 'jurnal-foto',       // foto kegiatan pada Jurnal Mengajar
  jadwal: 'jadwal-foto',       // foto Jadwal Mengajar (halaman guru)
  tugas: 'tugas-lampiran',     // lampiran foto tugas DARI GURU (halaman Tugas Kelas)
  pengumpulan: 'tugas-jawaban', // pengumpulan siswa (foto ATAU PDF)
};
const BUCKET_CADANGAN = 'jurnal-foto';   // dipakai kalau `jenis` tak dikenal

// Client dibuat dari library @supabase/supabase-js (dimuat via CDN di HTML).
const _sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON) : null;

const Storage = {
  buckets: BUCKETS,
  ready() { return !!_sb; },

  /**
   * Unggah satu File gambar → kembalikan URL publiknya.
   * Gambar dikompres dulu (memakai compressImage dari utils.js) agar hemat.
   * @param {File} file  file dari <input type="file"> (Blob hasil kamera juga boleh)
   * @param {string} jenis  jenis foto: "jurnal" | "jadwal". Menentukan bucket
   *   tujuan (lihat BUCKETS) sekaligus nama folder di dalamnya.
   * @param {{maxDim?: number, quality?: number}} opsi  ukuran kompresi. Default
   *   cukup untuk foto kegiatan; foto dokumen (mis. jadwal mengajar) perlu lebih
   *   besar agar tulisannya tetap terbaca saat diperbesar.
   * @returns {Promise<string>} URL publik untuk disimpan di Firestore
   */
  async uploadFoto(file, jenis = 'umum', { maxDim = 1000, quality = 0.6 } = {}) {
    if (!_sb) throw new Error('Supabase belum siap (library gagal dimuat).');

    const bucket = BUCKETS[jenis] || BUCKET_CADANGAN;

    // compressImage mengembalikan dataURL base64 → ubah jadi Blob untuk diunggah.
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

  /**
   * Unggah SEBARANG file (foto ATAU PDF) → kembalikan metadata + URL publik.
   * Berbeda dari uploadFoto(): file gambar tetap dikompres, tapi file lain
   * (PDF/dokumen) diunggah APA ADANYA — kompresi kanvas hanya berlaku untuk
   * gambar dan akan merusak PDF. Dipakai untuk pengumpulan tugas siswa.
   * @param {File} file  file dari <input type="file"> (image/* atau application/pdf)
   * @param {string} jenis  kunci bucket (lihat BUCKETS), mis. "pengumpulan"
   * @param {{maxDim?: number, quality?: number, maxMB?: number}} opsi
   * @returns {Promise<{url:string, name:string, type:string, isPdf:boolean}>}
   */
  async uploadFile(file, jenis = 'umum', { maxDim = 1400, quality = 0.7, maxMB = 15 } = {}) {
    if (!_sb) throw new Error('Supabase belum siap (library gagal dimuat).');
    const bucket = BUCKETS[jenis] || BUCKET_CADANGAN;
    const isImg = (file.type || '').startsWith('image/');

    let blob, ext, contentType;
    if (isImg) {
      // Gambar → kompres seperti uploadFoto agar hemat kuota.
      const dataUrl = await compressImage(file, { maxDim, quality });
      blob = await (await fetch(dataUrl)).blob();
      ext = 'jpg';
      contentType = 'image/jpeg';
    } else {
      // PDF / lainnya → unggah utuh (jangan lewat kanvas).
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

  /**
   * Hapus foto berdasarkan URL publiknya (best-effort — kegagalan diabaikan).
   * Dipakai untuk membersihkan file lama saat foto diganti / jurnal dihapus.
   *
   * Nama bucket dibaca DARI URL-nya, bukan dari BUCKETS. Itu disengaja: foto
   * jadwal lama (dari sebelum jadwal punya bucket sendiri) masih menunjuk ke
   * bucket "jurnal-foto", dan foto seperti itu tetap harus bisa dihapus.
   * Foto lama yang masih base64 (dari sebelum pakai Supabase) otomatis dilewati.
   */
  async deleteByUrl(url) {
    if (!_sb || !url) return;
    // .../storage/v1/object/public/<bucket>/<path di dalam bucket>
    const cocok = String(url).match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!cocok) return;
    const [, bucket, path] = cocok;
    try {
      await _sb.storage.from(bucket).remove([decodeURIComponent(path)]);
    } catch (_) { /* abaikan, sekadar pembersihan */ }
  },
};
