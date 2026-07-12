# Desain: Perbaikan Keamanan P0 — `firestore.rules`

**Tanggal:** 2026-07-12
**Sumber:** `spec-compliance-report.md`, bagian "Keamanan — perlu diperbaiki lebih dulu dari fitur apa pun" (P0, item 1-3).
**Scope:** hanya `firestore.rules`. Tidak ada perubahan di JS aplikasi.

## Latar Belakang

Audit kepatuhan kode (`spec-compliance-report.md`) menemukan tiga lubang keamanan di `firestore.rules` yang lebih mendesak daripada gap fitur apa pun:

1. **Privilege escalation** — siswa bisa mengubah `role` akunnya sendiri jadi `'admin'`.
2. **Data medis lintas-kelas** — guru manapun bisa membaca data kesehatan/ibadah siswa manapun, tanpa cek keanggotaan kelas.
3. **Roster sekolah terbuka** — siswa manapun bisa membaca nama+NIS seluruh siswa sekolah lewat `school_roster`; guru manapun bisa menulis/menghapus `class_tasks` kelas manapun.

Struktur data terkait (dari `js/db.js`, `js/views/auth.js`, `js/views/teacher.js`):
- `users/{uid}.kelasId` — kelas siswa (diisi saat siswa memilih kelas sendiri).
- `users/{uid}.kelasAmpu` — array classId yang diampu seorang guru (dipilih guru sendiri lewat UI).
- `users/{uid}.waliKelasId` — classId di mana guru menjadi wali kelas.
- `ADMIN_EMAILS` (`js/firebase-config.js`) — daftar email yang otomatis jadi admin saat registrasi pertama kali. Saat ini pengecekan ini **hanya di JS client**, sehingga bisa dilewati dengan menulis dokumen Firestore langsung.

## Fix 1 — Kunci field `role` di `users/{uid}`

**Sebelum** (`firestore.rules:27`):
```
allow create, update: if request.auth != null && (request.auth.uid == uid || isAdmin());
```

**Sesudah** — pisah `create`/`update`, tambah fungsi `isBootstrapAdminEmail()` yang mem-mirror `ADMIN_EMAILS` di sisi rules:

```
function isBootstrapAdminEmail() {
  return request.auth != null && request.auth.token.email != null &&
    request.auth.token.email.lower() in ['admin@tumara.com', 'admin@tumara.id'];
}

allow create: if request.auth != null && (
  isAdmin() ||
  (request.auth.uid == uid && (
    request.resource.data.role == 'siswa' ||
    (request.resource.data.role == 'admin' && isBootstrapAdminEmail())
  ))
);

allow update: if request.auth != null && (
  isAdmin() ||
  (request.auth.uid == uid && (
    request.resource.data.role == resource.data.role ||
    (request.resource.data.role == 'admin' && isBootstrapAdminEmail())
  ))
);
```

**Alasan desain:**
- Siswa yang mendaftar sendiri (`js/views/auth.js:161`) hanya bisa membuat dokumen dengan `role:'siswa'` — sesuai perilaku default `DB.register()` di `db.js:52`.
- Bootstrap admin pertama (`db.js:57,79,332-353`) tetap berfungsi: create maupun update ke `role:'admin'` diizinkan kalau email login ada di daftar bootstrap — sekarang ditegakkan di server, bukan cuma di JS.
- Admin membuat akun guru lewat `adminCreateUser` (`db.js:109-117,427-461`) menulis ke uid **berbeda** dari uid admin sendiri → selalu lewat cabang `isAdmin()`, tidak terpengaruh perubahan ini.
- Setelah dibuat, **tidak ada jalur self-service untuk mengubah role sendiri** kecuali kasus bootstrap admin di atas — menutup celah privilege escalation.

**Catatan pemeliharaan:** daftar email di `isBootstrapAdminEmail()` adalah duplikat manual dari `ADMIN_EMAILS` (`js/firebase-config.js:31-34`) karena Firestore Rules tidak bisa `import` file JS. Kalau `ADMIN_EMAILS` diubah di kemudian hari, `firestore.rules` harus diupdate manual juga — komentar di kedua tempat akan menunjuk satu sama lain.

## Fix 2 — Batasi akses guru ke data kesehatan/ibadah hanya siswa yang diampu

Tambah helper function:
```
function isGuruOfStudent(studentUid) {
  return isGuru()
    && get(/databases/$(database)/documents/users/$(studentUid)).data.get('kelasId', null) != null
    && get(/databases/$(database)/documents/users/$(studentUid)).data.get('kelasId', null) in
       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('kelasAmpu', []);
}
```

Ganti seluruh `allow read: if isGuru();` di sub-koleksi berikut (dalam `match /users/{uid}`) menjadi `allow read: if isGuruOfStudent(uid);`:
- `ibadah_daily`, `quran_log`, `hafalan` (baris 42-50 saat ini)
- `health_daily`, `workouts`, `biometrics`, `weights`, `meds`, `foods`, `menstrual` (baris 54-74 saat ini)

**Alasan cakupan:** ke-10 sub-koleksi ini punya pola identik (`allow read: if isGuru();` tanpa cek kelas) — akar masalahnya sama, jadi diperbaiki sekaligus lewat satu helper, bukan ditambal satu-satu. `menstrual` disamakan dengan data kesehatan lain sesuai keputusan eksplisit (guru wali/pengampu kelas tetap bisa baca, hanya dibatasi ke siswa di kelasnya).

**Batasan yang disadari:** guru butuh field `kelasAmpu` terisi benar di dokumennya sendiri. Guru yang belum memilih kelas ampuan (`kelasAmpu` kosong/tidak ada) otomatis tidak bisa membaca data siswa manapun — ini perilaku yang benar (deny by default), bukan bug.

## Fix 3 — Roster sekolah & write `class_tasks`

**`school_roster`** (baris 84-87 saat ini) — read dibatasi dari "semua user login" jadi admin+guru saja:
```
match /school_roster/{id} {
  allow read: if request.auth != null && (isAdmin() || isGuru());
  allow write: if isAdmin();
}
```
`school_classes` **tidak diubah** — tetap terbuka untuk semua user login karena dipakai siswa memilih kelasnya sendiri saat registrasi (`js/views/auth.js:264`), dan isinya cuma nama kelas (tidak sensitif).

**`class_tasks`** (baris 91-94 saat ini) — write ditambah cek kepemilikan kelas:
```
match /class_tasks/{id} {
  allow read: if request.auth != null;
  allow create: if isGuru() &&
    request.resource.data.classId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('kelasAmpu', []);
  allow update, delete: if isGuru() &&
    resource.data.classId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('kelasAmpu', []);
}
```

## Eksplisit di luar scope (bukan bug, keputusan sadar)

- Read `class_tasks`/`class_schedule` tetap terbuka untuk semua user login (siswa lintas kelas bisa lihat judul tugas/jam kelas lain). Risiko rendah (bukan PII), bukan bagian dari 3 temuan P0 yang dipilih user. Kandidat P1 terpisah kalau diperlukan nanti.
- P1 (klaim palsu UI), P2 (bug fitur), P3 (gap fitur besar) dari `spec-compliance-report.md` — di luar scope kerjaan ini sepenuhnya.

## Testing

`firestore.rules` tidak punya test suite otomatis di repo ini saat ini (tidak ada `firebase.json` emulator config untuk rules testing, tidak ada file `*.rules.test.js`). Verifikasi dilakukan manual:
1. `firebase deploy --only firestore:rules --dry-run` (kalau tersedia) atau `firebase emulators:start --only firestore` + skenario manual di console/Rules Playground:
   - Siswa mencoba `updateUser({role:'admin'})` → harus ditolak.
   - Login email bootstrap admin → tetap bisa jadi admin.
   - Guru A (kelasAmpu=['X']) baca `health_daily` siswa kelas Y → harus ditolak.
   - Guru A baca data siswa kelas X → harus tetap bisa.
   - Siswa baca `school_roster` → harus ditolak.
   - Guru B (kelasAmpu=['Y']) hapus `class_tasks` milik kelas X → harus ditolak.
2. Deploy manual ke project Firebase dicek dulu ke user sebelum dijalankan (ini aksi yang mempengaruhi sistem bersama — sesuai instruksi keamanan aksi, minta konfirmasi eksplisit sebelum `firebase deploy`).
