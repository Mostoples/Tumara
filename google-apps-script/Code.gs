/* ============================================================
   TUMARA — Proxy Upload ke Google Drive (Google Apps Script)
   ------------------------------------------------------------
   Script ini berjalan DI DALAM akun Google penyimpanan (15 GB).
   App Tumara mengirim file ke URL Web App ini; script menyimpannya
   ke Drive akun pemilik, lalu mengembalikan link publiknya.
   Tidak ada kredensial rahasia yang disimpan di sisi app.

   CARA PASANG (sekali saja):
   1. Buka https://script.google.com  (login dengan AKUN PENYIMPANAN —
      pakai akun @gmail PRIBADI, bukan akun Workspace sekolah yang
      memblokir berbagi publik).
   2. New project → hapus isi bawaan → tempel SELURUH file ini.
   3. TOKEN & ROOT_FOLDER_ID di bawah sudah terisi. Bila ganti, samakan
      TOKEN dengan DRIVE_TOKEN di js/supabase-storage.js.
   4. Di editor: pilih fungsi "authorize" → Run → beri izin Drive
      (Review permissions → pilih akun → Advanced → Go to project → Allow).
   5. Deploy → New deployment → "Web app".
        - Execute as: Me (akun penyimpanan)
        - Who has access: Anyone
      → Deploy → salin "Web app URL" (/exec) → taruh di DRIVE_ENDPOINT
      di js/supabase-storage.js.
   6. PENTING: di Google Drive, bagikan FOLDER induk (ROOT_FOLDER_ID)
      secara manual → "Anyone with the link" → Viewer. Semua file yang
      dibuat script di dalamnya mewarisi akses publik ini, sehingga
      setSharing di script tidak wajib berhasil (sudah dibungkus try/catch).
   ============================================================ */

// HARUS sama persis dengan DRIVE_TOKEN di js/supabase-storage.js
const TOKEN = 'TuMaRa2026';

// Jalankan fungsi ini SEKALI dari editor (pilih "authorize" → Run) untuk
// memberi izin akses Google Drive. Muncul dialog "Authorization required" →
// Review permissions → pilih akun → Advanced → Go to project → Allow.
function authorize() {
  const f = _folder('tugas-jawaban');
  return f.getName();
}

// Folder induk di Drive tempat semua file Tumara disimpan.
// Subfolder per jenis (jurnal/jadwal/tugas-lampiran/tugas-jawaban) dibuat
// otomatis di dalamnya. Kosongkan ('') untuk memakai folder "Tumara Files"
// di root Drive.
const ROOT_FOLDER_ID = '12AkuPYWx3NUrNYhdGvgUntY5m1H95O6F';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return _json({ ok: false, error: 'unauthorized' });
    if (body.action === 'delete') return _json(_delete(body.fileId));
    return _json(_upload(body));
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

// Penanda agar mudah dicek dari browser (buka URL /exec).
function doGet() {
  return _json({ ok: true, service: 'tumara-drive-proxy' });
}

function _upload(body) {
  const bytes = Utilities.base64Decode(body.data);
  const blob = Utilities.newBlob(bytes, body.mimeType || 'application/octet-stream', body.name || 'file');
  const folder = _folder(body.folder);
  const file = folder.createFile(blob);
  // Coba jadikan file publik. Bila akun menolak setSharing (umum di sebagian
  // akun Gmail), akses publik tetap didapat dari FOLDER INDUK yang sudah
  // dibagikan manual "Anyone with the link" — file mewarisinya. Jadi jangan
  // gagalkan upload kalau langkah ini ditolak.
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* diabaikan */ }
  const id = file.getId();
  return {
    ok: true,
    id: id,
    url: 'https://drive.google.com/file/d/' + id + '/view',
    thumb: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600',
  };
}

function _delete(fileId) {
  if (!fileId) return { ok: false, error: 'no id' };
  DriveApp.getFileById(fileId).setTrashed(true);
  return { ok: true };
}

function _folder(name) {
  const root = ROOT_FOLDER_ID
    ? DriveApp.getFolderById(ROOT_FOLDER_ID)
    : _ensureFolder(DriveApp.getRootFolder(), 'Tumara Files');
  return _ensureFolder(root, name || 'umum');
}

function _ensureFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
