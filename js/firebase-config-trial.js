/* ============================================================
   KONFIGURASI FIREBASE — JALUR UJI COBA (TRIAL)
   ------------------------------------------------------------
   Dipakai KHUSUS oleh register.html, pilih-pekerjaan.html, dan
   coba-app.html — halaman untuk orang yang ingin mencoba
   Tumara tanpa akun sekolah (Google / email &amp; kata sandi,
   lalu pilih pekerjaan). Project Firebase-nya SENGAJA terpisah
   dari project sekolah (tumara-id, di js/firebase-config.js) —
   data uji coba tidak bercampur dengan data sekolah.

   Pastikan di console.firebase.google.com (project: myosigid):
   1. Authentication → Sign-in method → aktifkan Google &amp;
      Email/Password.
   2. Cloud Firestore → buat database.
   3. Firestore Rules mengizinkan pengguna membaca/menulis
      dokumennya sendiri di koleksi `trial_users`.
   ============================================================ */

const TRIAL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDiD46GuseAiitJr8ghJcAKrMfv2Xj-NDE",
  authDomain: "myosigid.firebaseapp.com",
  projectId: "myosigid",
  storageBucket: "myosigid.firebasestorage.app",
  messagingSenderId: "625147799062",
  appId: "1:625147799062:web:252437c743d67922e07737"
};
