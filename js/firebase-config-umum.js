/* ============================================================
   KONFIGURASI FIREBASE — JALUR UMUM
   ------------------------------------------------------------
   Dipakai KHUSUS oleh register.html, pilih-pekerjaan.html,
   data-diri.html, dan umum-app.html — halaman untuk orang di
   luar sekolah, tanpa akun/sangkut-paut sekolah (Google / email
   & kata sandi, lalu pilih pekerjaan). Project Firebase-nya
   SENGAJA terpisah dari project sekolah (tumara-id, di
   js/firebase-config.js) — data pengguna umum tidak bercampur
   dengan data sekolah.

   Pastikan di console.firebase.google.com (project: myosigid):
   1. Authentication → Sign-in method → aktifkan Google &amp;
      Email/Password.
   2. Cloud Firestore → buat database.
   3. Firestore Rules mengizinkan pengguna membaca/menulis
      dokumennya sendiri di koleksi `users` (lihat
      firestore-umum.rules).
   ============================================================ */

const UMUM_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDiD46GuseAiitJr8ghJcAKrMfv2Xj-NDE",
  authDomain: "myosigid.firebaseapp.com",
  projectId: "myosigid",
  storageBucket: "myosigid.firebasestorage.app",
  messagingSenderId: "625147799062",
  appId: "1:625147799062:web:252437c743d67922e07737"
};
