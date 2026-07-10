/* ============================================================
   KONFIGURASI FIREBASE — TUMARA
   ------------------------------------------------------------
   Firebase AKTIF. Lapisan data di js/db.js otomatis memakai
   Firebase Auth (Email/Password) + Cloud Firestore.

   Pastikan di console.firebase.google.com (project: tumara-id):
   1. "Authentication" → metode Email/Password sudah diaktifkan.
   2. "Cloud Firestore" sudah dibuat (region terdekat, mis. asia-southeast).
   3. Firestore Security Rules diatur seperti ini:
   ------------------------------------------------------------
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ------------------------------------------------------------
   Bila ingin kembali ke mode lokal (localStorage, tanpa internet),
   cukup ubah USE_FIREBASE menjadi false.
   ============================================================ */

const USE_FIREBASE = true;

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC3CdFoskGzBvFnMA309xU6FStWYapxgsE",
  authDomain: "tumara-id.firebaseapp.com",
  databaseURL: "https://tumara-id-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tumara-id",
  storageBucket: "tumara-id.firebasestorage.app",
  messagingSenderId: "158304845757",
  appId: "1:158304845757:web:9134f388466266e7a65cd4"
};
