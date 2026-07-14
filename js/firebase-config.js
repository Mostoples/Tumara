/* ============================================================
   KONFIGURASI FIREBASE — TUMARA
   ------------------------------------------------------------
   Firebase AKTIF. Lapisan data di js/db.js otomatis memakai
   Firebase Auth (Email/Password) + Cloud Firestore.

   CATATAN LOGIN: guru & siswa masuk TANPA email — cukup NAMA LENGKAP
   (username) + NIS/NIP (kata sandi). Nama diubah menjadi email internal
   (budi.santoso@akun.tumara.id) oleh toAuthEmail() di js/utils.js, karena
   Firebase Auth selalu meminta email. Metode Email/Password di console
   tetap wajib aktif. Admin di ADMIN_EMAILS tetap masuk dengan emailnya.

   Pastikan di console.firebase.google.com (project: tumara-id):
   1. "Authentication" → metode Email/Password sudah diaktifkan.
   2. "Cloud Firestore" sudah dibuat (region terdekat, mis. asia-southeast).
   3. Firestore Security Rules: deploy isi file `firestore.rules`
      (mendukung peran admin/guru/siswa). Jalankan:
        firebase deploy --only firestore:rules
   4. Admin pertama: tambahkan email admin di ADMIN_EMAILS bawah,
      lalu daftar/masuk dengan email itu → otomatis jadi admin dan
      diarahkan ke admin.html untuk membuat akun guru & siswa.

   Bila ingin kembali ke mode lokal (localStorage, tanpa internet),
   cukup ubah USE_FIREBASE menjadi false.
   ============================================================ */

const USE_FIREBASE = true;

/* ------------------------------------------------------------
   ADMIN — daftar email yang otomatis berperan sebagai admin.
   Login dengan salah satu email di bawah → akun otomatis
   ditandai role 'admin' (menulis dokumennya sendiri, diizinkan
   Security Rules) dan diarahkan ke admin.html. Ini cara mem-
   bootstrap admin pertama tanpa perlu mengedit Firestore manual.
   Tambahkan email admin sekolahmu di sini (huruf kecil).
   ------------------------------------------------------------ */
const ADMIN_EMAILS = [
  'admin@tumara.com',
  'admin@tumara.id'
];

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC3CdFoskGzBvFnMA309xU6FStWYapxgsE",
  authDomain: "tumara-id.firebaseapp.com",
  databaseURL: "https://tumara-id-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tumara-id",
  storageBucket: "tumara-id.firebasestorage.app",
  messagingSenderId: "158304845757",
  appId: "1:158304845757:web:9134f388466266e7a65cd4"
};
