/* ============================================================
   TUMARA — Penyimpanan Foto via Supabase Storage
   Fungsinya HANYA menggantikan Firebase Storage untuk menyimpan
   FILE foto. Data lain (jurnal, akun, dll.) tetap di Firestore;
   yang dicatat di Firestore cukup URL publik hasil upload ini.

   Prasyarat di dashboard Supabase (sekali saja):
   1. Storage → New bucket → nama "jurnal-foto" → centang Public.
   2. Tambahkan policy upload/hapus untuk role anon
      (lihat docs/tutorial-supabase.md bagian "Policy").
   ============================================================ */

const SUPABASE_URL    = 'https://bdzuucnbjxwdsfaxlwmt.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkenV1Y25ianh3ZHNmYXhsd210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTE4MDYsImV4cCI6MjA5OTMyNzgwNn0.ibWOOTy6svSTVPWNt0vWDuRv3bNKpPNnn-KF9OsncDU';
const SUPABASE_BUCKET = 'jurnal-foto';

// Client dibuat dari library @supabase/supabase-js (dimuat via CDN di HTML).
const _sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON) : null;

const Storage = {
  bucket: SUPABASE_BUCKET,
  ready() { return !!_sb; },

  /**
   * Unggah satu File gambar → kembalikan URL publiknya.
   * Gambar dikompres dulu (memakai compressImage dari utils.js) agar hemat.
   * @param {File} file  file dari <input type="file">
   * @param {string} folder  subfolder di dalam bucket (mis. "jurnal")
   * @returns {Promise<string>} URL publik untuk disimpan di Firestore
   */
  async uploadFoto(file, folder = 'umum') {
    if (!_sb) throw new Error('Supabase belum siap (library gagal dimuat).');

    // compressImage mengembalikan dataURL base64 → ubah jadi Blob untuk diunggah.
    const dataUrl = await compressImage(file, { maxDim: 1000, quality: 0.6 });
    const blob = await (await fetch(dataUrl)).blob();

    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${folder}/${Date.now()}-${rand}.jpg`;

    const { error } = await _sb.storage.from(this.bucket).upload(path, blob, {
      contentType: 'image/jpeg', cacheControl: '3600', upsert: false,
    });
    if (error) throw new Error(error.message);

    const { data } = _sb.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Hapus foto berdasarkan URL publiknya (best-effort — kegagalan diabaikan).
   * Dipakai untuk membersihkan file lama saat foto diganti / jurnal dihapus.
   * Foto lama yang masih base64 (dari sebelum pakai Supabase) otomatis dilewati.
   */
  async deleteByUrl(url) {
    if (!_sb || !url || !url.includes('/storage/v1/object/public/')) return;
    try {
      const path = url.split(`/public/${this.bucket}/`)[1];
      if (path) await _sb.storage.from(this.bucket).remove([decodeURIComponent(path)]);
    } catch (_) { /* abaikan, sekadar pembersihan */ }
  },
};
