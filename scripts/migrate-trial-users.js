/* ============================================================
   TUMARA — Migrasi trial_users → users (project Firebase "myosigid")
   ------------------------------------------------------------
   Latar: js/umum-auth.js & js/umum-db.js dulu menyimpan akun jalur
   umum (register.html / umum-app.html) di koleksi top-level
   "trial_users". Sejak 2026-07-18 kode baru menulis/membaca dari
   "users" (permintaan klien — nama "trial" terkesan sementara,
   padahal datanya nyata & permanen). Skrip ini menyalin data akun
   LAMA supaya yang sudah pernah daftar tetap ketemu datanya waktu
   login lagi.

   NON-DESTRUKTIF: skrip ini hanya MENULIS ke users/{uid} (dan
   subkoleksinya), TIDAK PERNAH menghapus apa pun di trial_users.
   Aman dijalankan berkali-kali (pakai merge, bukan overwrite total).
   Setelah dipastikan semua akun bisa login normal & datanya lengkap,
   hapus koleksi trial_users manual lewat Firebase Console (atau
   `firebase firestore:delete`) — TIDAK dilakukan otomatis di sini.

   CARA PAKAI:
     1. Ambil kunci service account project myosigid:
        Firebase Console → myosigid → ⚙ Project settings →
        Service accounts → Generate new private key (unduh JSON).
     2. Jalankan salah satu:
          GOOGLE_APPLICATION_CREDENTIALS=/path/ke/key.json node scripts/migrate-trial-users.js
        atau
          node scripts/migrate-trial-users.js --key=/path/ke/key.json
     3. Default-nya DRY RUN (cuma menghitung & mencetak apa yang
        AKAN disalin, tidak menulis apa pun). Tambahkan --commit
        untuk benar-benar menyalin:
          node scripts/migrate-trial-users.js --key=/path/ke/key.json --commit
     4. Perlu paket "firebase-admin" — kalau belum ada:
          npm install firebase-admin --no-save
   ============================================================ */

const path = require('path');

const args = process.argv.slice(2);
const commit = args.includes('--commit');
const keyArg = args.find(a => a.startsWith('--key='));
const keyPath = keyArg ? keyArg.slice('--key='.length) : process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keyPath) {
  console.error('Butuh kunci service account project "myosigid".');
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS=/path/ke/key.json atau pakai --key=/path/ke/key.json');
  console.error('(Firebase Console → myosigid → Project settings → Service accounts → Generate new private key)');
  process.exit(1);
}

let initializeApp, cert, getFirestore;
try {
  ({ initializeApp, cert } = require('firebase-admin/app'));
  ({ getFirestore } = require('firebase-admin/firestore'));
} catch (e) {
  console.error('Paket "firebase-admin" belum terpasang. Jalankan dulu: npm install firebase-admin --no-save');
  process.exit(1);
}

initializeApp({
  credential: cert(require(path.resolve(keyPath))),
  projectId: 'myosigid'
});
const db = getFirestore();

// Salin satu dokumen + SEMUA subkoleksinya secara rekursif (khusus app ini
// bentuknya cuma satu tingkat: users/{uid}/{coll}/{docId}, tapi ditulis
// rekursif jaga-jaga ada subkoleksi lebih dalam di masa depan).
async function copyDocRecursive(srcRef, destRef, stats) {
  const snap = await srcRef.get();
  if (!snap.exists) return;

  stats.docs++;
  if (commit) await destRef.set(snap.data(), { merge: true });

  const subcollections = await srcRef.listCollections();
  for (const sub of subcollections) {
    const docs = await sub.get();
    for (const d of docs.docs) {
      stats.subdocs++;
      const destSubRef = destRef.collection(sub.id).doc(d.id);
      if (commit) await destSubRef.set(d.data(), { merge: true });
      // Rekursi ke subkoleksi-di-dalam-subkoleksi, kalau ada.
      await copyDocRecursive(sub.doc(d.id), destSubRef, stats);
    }
  }
}

(async () => {
  console.log(`Mode: ${commit ? 'COMMIT (menulis sungguhan)' : 'DRY RUN (cuma menghitung, tidak menulis apa pun)'}`);
  console.log('Membaca koleksi trial_users...\n');

  const oldUsers = await db.collection('trial_users').get();
  if (oldUsers.empty) {
    console.log('Koleksi trial_users kosong — tidak ada yang perlu dimigrasi.');
    process.exit(0);
  }

  let total = 0;
  for (const userDoc of oldUsers.docs) {
    const stats = { docs: 0, subdocs: 0 };
    await copyDocRecursive(
      db.collection('trial_users').doc(userDoc.id),
      db.collection('users').doc(userDoc.id),
      stats
    );
    total++;
    console.log(`  ${userDoc.id} — profil ${stats.docs > 0 ? 'OK' : 'TIDAK ADA?'}, ${stats.subdocs} dokumen subkoleksi`);
  }

  console.log(`\n${total} akun ${commit ? 'disalin ke' : 'AKAN disalin ke (dry run)'} koleksi "users".`);
  if (!commit) console.log('Jalankan lagi dengan --commit untuk benar-benar menulis.');
})().catch(e => {
  console.error('Migrasi gagal:', e);
  process.exit(1);
});
