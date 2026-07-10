/* ============================================================
   TUMARA — Peran (roles) & pengarahan halaman
   ------------------------------------------------------------
   Tiga peran: 'admin', 'guru', 'siswa'.
   • admin → admin.html (kelola akun)
   • guru  → guru.html  (kelas, absensi, penilaian, jurnal)
   • siswa → app.html   (dasbor kesehatan/produktivitas/keuangan/ibadah)
   ============================================================ */

// Halaman beranda sesuai peran
function roleHome(role) {
  return role === 'admin' ? 'admin.html'
       : role === 'guru'  ? 'guru.html'
       : 'app.html';
}

// Label peran (untuk UI)
function roleLabel(role) {
  return role === 'admin' ? tr('Admin', 'Admin')
       : role === 'guru'  ? tr('Guru', 'Teacher')
       : tr('Siswa', 'Student');
}

// Jaga halaman: pastikan pengguna login DAN perannya termasuk allowed.
// Jika tidak, arahkan ke halaman yang tepat. Mengembalikan user bila lolos.
async function guardPage(allowedRoles) {
  let u;
  try {
    u = await DB.init();
  } catch (e) {
    toast(tr('Gagal terhubung ke server. Periksa koneksi internetmu.',
             'Could not connect to the server. Please check your internet connection.'), 'error');
    return null;
  }
  if (!u) { location.replace('auth.html'); return null; }
  const role = u.role || 'siswa';
  if (!allowedRoles.includes(role)) { location.replace(roleHome(role)); return null; }
  return u;
}
