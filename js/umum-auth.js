/* ============================================================
   TUMARA — Auth jalur Umum (UmumAuth)
   ------------------------------------------------------------
   Untuk orang di luar sekolah, tanpa akun/sangkut-paut sekolah.
   Lapisan Firebase terpisah dari js/db.js (yang dipakai alur
   sekolah admin/guru/siswa, project tumara-id). UmumAuth
   memakai project Firebase-nya sendiri (myosigid, lihat
   js/firebase-config-umum.js) lewat instance app bernama
   'tumara-umum' agar tidak bentrok bila suatu saat dimuat di
   halaman yang sama dengan js/db.js.

   Data pengguna umum disimpan di koleksi top-level
   `trial_users/{uid}` — { nama, email, fotoUrl, pekerjaan }.
   Nama koleksi ini SENGAJA tidak diganti jadi "umum_users":
   mengganti nama koleksi berarti migrasi data (pindah semua
   dokumen ke path baru), bukan cuma ganti nama file/variabel —
   nama koleksi ini murni detail penyimpanan internal, tidak
   pernah tampil ke pengguna.
   ============================================================ */

const UmumAuth = {
  fb: null,
  user: null,

  async _load() {
    if (this.fb) return this.fb;
    const V = '10.12.2';
    const [appM, authM, fsM] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
    ]);
    const app = appM.initializeApp(UMUM_FIREBASE_CONFIG, 'tumara-umum');
    const auth = authM.getAuth(app);
    const db = fsM.getFirestore(app);
    this.fb = { auth, db, A: authM, F: fsM };
    return this.fb;
  },

  // Panggil sekali di awal tiap halaman jalur umum: mengembalikan
  // user yang sedang login (atau null bila belum/tidak login).
  async init() {
    const { auth, A } = await this._load();
    return new Promise(resolve => {
      A.onAuthStateChanged(auth, async fbUser => {
        try {
          this.user = fbUser ? await this._loadProfile(fbUser) : null;
        } catch (_) {
          this.user = null;
        }
        resolve(this.user);
      });
    });
  },

  async _loadProfile(fbUser) {
    const { F, db } = this.fb;
    const ref = F.doc(db, 'trial_users', fbUser.uid);
    const snap = await F.getDoc(ref);
    const existing = snap.exists() ? snap.data() : null;
    const account = {
      nama: fbUser.displayName || existing?.nama || '',
      email: fbUser.email || '',
      fotoUrl: fbUser.photoURL || '',
      loginTerakhir: new Date().toISOString()
    };
    if (!existing) {
      const profile = { ...account, pekerjaan: null, dibuatPada: new Date().toISOString() };
      await F.setDoc(ref, profile);
      return { id: fbUser.uid, ...profile };
    }
    await F.setDoc(ref, account, { merge: true });
    return { id: fbUser.uid, ...existing, ...account };
  },

  async loginGoogle() {
    const { auth, A } = await this._load();
    const cred = await A.signInWithPopup(auth, new A.GoogleAuthProvider());
    this.user = await this._loadProfile(cred.user);
    return this.user;
  },

  async register(nama, email, password) {
    const { auth, A } = await this._load();
    const cred = await A.createUserWithEmailAndPassword(auth, email.trim(), password);
    if (nama) await A.updateProfile(cred.user, { displayName: nama });
    this.user = await this._loadProfile({ ...cred.user, displayName: nama || cred.user.displayName });
    return this.user;
  },

  async login(email, password) {
    const { auth, A } = await this._load();
    const cred = await A.signInWithEmailAndPassword(auth, email.trim(), password);
    this.user = await this._loadProfile(cred.user);
    return this.user;
  },

  async logout() {
    const { auth, A } = await this._load();
    await A.signOut(auth);
    this.user = null;
  },

  async savePekerjaan(key) {
    const { F, db } = await this._load();
    await F.setDoc(F.doc(db, 'trial_users', this.user.id), { pekerjaan: key }, { merge: true });
    this.user.pekerjaan = key;
  },

  // Usia/jenis kelamin/tinggi/berat — diminta sekali setelah memilih
  // pekerjaan (lihat js/views/data-diri.js), dipakai untuk Indeks BMI
  // & target kalori/air minum di halaman Kesehatan.
  async saveDataDiri(patch) {
    const { F, db } = await this._load();
    await F.setDoc(F.doc(db, 'trial_users', this.user.id), patch, { merge: true });
    this.user = { ...this.user, ...patch };
    return this.user;
  },

  // Sudah mengisi data diri (usia/tinggi/berat)? Dipakai untuk gerbang
  // navigasi: pekerjaan terisi → data diri terisi → baru masuk umum-app.html.
  hasDataDiri(user) {
    return !!(user && user.usia && user.tinggi && user.berat);
  }
};
