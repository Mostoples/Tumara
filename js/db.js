/* ============================================================
   TUMARA — Lapisan Data (Data Layer)
   ------------------------------------------------------------
   Satu API untuk seluruh aplikasi:
     DB.init, DB.register, DB.login, DB.logout, DB.user,
     DB.updateUser, DB.list, DB.add, DB.update, DB.remove,
     DB.getDaily, DB.saveDaily, DB.changePassword, ...

   Ada dua adapter dengan antarmuka identik:
   • LocalAdapter    → localStorage (aktif sekarang, tanpa backend)
   • FirebaseAdapter → Firebase Auth + Firestore (aktif otomatis
                       saat USE_FIREBASE = true di js/firebase-config.js)
   ============================================================ */

const DB = (() => {

  /* ---------- util hash password (untuk mode lokal) ---------- */
  async function hashText(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tumara::' + text));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {
      // fallback bila crypto.subtle tidak tersedia (mis. konteks tidak aman)
      let h = 5381;
      const s = 'tumara::' + text;
      for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
      return 'fb' + (h >>> 0).toString(16);
    }
  }

  /* ============================================================
     ADAPTER LOKAL — localStorage
     ============================================================ */
  const LocalAdapter = {
    _user: null,

    _users() { return JSON.parse(localStorage.getItem('tumara_users') || '[]'); },
    _saveUsers(list) { localStorage.setItem('tumara_users', JSON.stringify(list)); },
    _key(coll) { return `tumara_data_${this._user.id}_${coll}`; },
    _read(coll) { return JSON.parse(localStorage.getItem(this._key(coll)) || '[]'); },
    _write(coll, arr) { localStorage.setItem(this._key(coll), JSON.stringify(arr)); },

    async init() {
      const sid = localStorage.getItem('tumara_session');
      if (sid) {
        const u = this._users().find(x => x.id === sid);
        if (u) this._user = u;
      }
      return this._user;
    },

    async register({ nama, email, password }) {
      email = email.trim().toLowerCase();
      if (this._users().some(u => u.email === email)) {
        throw new Error('Email sudah terdaftar. Silakan masuk.');
      }
      const user = {
        id: uid(), nama: nama.trim(), email,
        passHash: await hashText(password),
        profileComplete: false,
        dibuatPada: new Date().toISOString()
      };
      const users = this._users();
      users.push(user);
      this._saveUsers(users);
      localStorage.setItem('tumara_session', user.id);
      this._user = user;
      return user;
    },

    async login(email, password) {
      email = email.trim().toLowerCase();
      const u = this._users().find(x => x.email === email);
      if (!u) throw new Error('Email tidak ditemukan. Belum punya akun?');
      if (u.passHash !== await hashText(password)) throw new Error('Kata sandi salah.');
      localStorage.setItem('tumara_session', u.id);
      this._user = u;
      return u;
    },

    async loginGoogle() {
      throw new Error('Login dengan Google membutuhkan mode Firebase (USE_FIREBASE = true di js/firebase-config.js).');
    },

    async logout() {
      localStorage.removeItem('tumara_session');
      this._user = null;
    },

    get user() { return this._user; },

    async updateUser(patch) {
      const users = this._users();
      const i = users.findIndex(u => u.id === this._user.id);
      users[i] = { ...users[i], ...patch };
      this._saveUsers(users);
      this._user = users[i];
      return this._user;
    },

    async changePassword(oldPass, newPass) {
      if (this._user.passHash !== await hashText(oldPass)) {
        throw new Error('Kata sandi lama salah.');
      }
      await this.updateUser({ passHash: await hashText(newPass) });
    },

    async list(coll) { return this._read(coll); },

    async add(coll, item) {
      const arr = this._read(coll);
      const rec = { id: uid(), ...item };
      arr.push(rec);
      this._write(coll, arr);
      return rec;
    },

    async update(coll, id, patch) {
      const arr = this._read(coll);
      const i = arr.findIndex(x => x.id === id);
      if (i === -1) return null;
      arr[i] = { ...arr[i], ...patch };
      this._write(coll, arr);
      return arr[i];
    },

    async remove(coll, id) {
      this._write(coll, this._read(coll).filter(x => x.id !== id));
    },

    async resetData(collections) {
      collections.forEach(c => localStorage.removeItem(this._key(c)));
    }
  };

  /* ============================================================
     ADAPTER FIREBASE — Auth + Firestore (modular SDK v10, via CDN)
     Data per pengguna: users/{uid} (profil) & users/{uid}/{coll}/{id}
     ============================================================ */
  const FirebaseAdapter = {
    _user: null,
    fb: null,

    async _load() {
      if (this.fb) return this.fb;
      const V = '10.12.2';
      const [appM, authM, fsM] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
      ]);
      const app = appM.initializeApp(FIREBASE_CONFIG);
      this.fb = { auth: authM.getAuth(app), db: fsM.getFirestore(app), A: authM, F: fsM };
      return this.fb;
    },

    _colRef(coll) {
      const { F, db } = this.fb;
      return F.collection(db, 'users', this._user.id, coll);
    },

    async _loadProfile(fbUser) {
      const { F, db } = this.fb;
      const snap = await F.getDoc(F.doc(db, 'users', fbUser.uid));
      this._user = { id: fbUser.uid, email: fbUser.email, ...(snap.exists() ? snap.data() : {}) };
      return this._user;
    },

    async init() {
      const { auth, A } = await this._load();
      const fbUser = await new Promise(res => {
        const un = A.onAuthStateChanged(auth, u => { un(); res(u); });
      });
      if (fbUser) await this._loadProfile(fbUser);
      return this._user;
    },

    async register({ nama, email, password }) {
      const { auth, A, F, db } = await this._load();
      let cred;
      try {
        cred = await A.createUserWithEmailAndPassword(auth, email.trim(), password);
      } catch (e) {
        throw new Error(this._msg(e));
      }
      const profile = { nama: nama.trim(), profileComplete: false, dibuatPada: new Date().toISOString() };
      await F.setDoc(F.doc(db, 'users', cred.user.uid), profile);
      this._user = { id: cred.user.uid, email: cred.user.email, ...profile };
      return this._user;
    },

    async login(email, password) {
      const { auth, A } = await this._load();
      try {
        const cred = await A.signInWithEmailAndPassword(auth, email.trim(), password);
        return await this._loadProfile(cred.user);
      } catch (e) {
        throw new Error(this._msg(e));
      }
    },

    // Login/daftar dengan akun Google (popup). Akun baru otomatis
    // dibuatkan profil dengan profileComplete: false → masuk onboarding.
    async loginGoogle() {
      const { auth, A, F, db } = await this._load();
      try {
        const provider = new A.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await A.signInWithPopup(auth, provider);
        const ref = F.doc(db, 'users', cred.user.uid);
        const snap = await F.getDoc(ref);
        if (!snap.exists()) {
          await F.setDoc(ref, {
            nama: cred.user.displayName || 'Siswa Tumara',
            profileComplete: false,
            dibuatPada: new Date().toISOString()
          });
        }
        return await this._loadProfile(cred.user);
      } catch (e) {
        throw new Error(this._msg(e));
      }
    },

    async logout() {
      const { auth, A } = await this._load();
      await A.signOut(auth);
      this._user = null;
    },

    get user() { return this._user; },

    async updateUser(patch) {
      const { F, db } = this.fb;
      const { id, email, ...safe } = patch; // id & email tidak disimpan di dokumen
      await F.setDoc(F.doc(db, 'users', this._user.id), safe, { merge: true });
      this._user = { ...this._user, ...patch };
      return this._user;
    },

    async changePassword(oldPass, newPass) {
      const { auth, A } = this.fb;
      try {
        const cred = A.EmailAuthProvider.credential(auth.currentUser.email, oldPass);
        await A.reauthenticateWithCredential(auth.currentUser, cred);
        await A.updatePassword(auth.currentUser, newPass);
      } catch (e) {
        throw new Error(this._msg(e));
      }
    },

    async list(coll) {
      const { F } = this.fb;
      const snap = await F.getDocs(this._colRef(coll));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async add(coll, item) {
      const { F } = this.fb;
      const id = uid();
      await F.setDoc(F.doc(this._colRef(coll), id), item);
      return { id, ...item };
    },

    async update(coll, id, patch) {
      const { F } = this.fb;
      await F.setDoc(F.doc(this._colRef(coll), id), patch, { merge: true });
      return { id, ...patch };
    },

    async remove(coll, id) {
      const { F } = this.fb;
      await F.deleteDoc(F.doc(this._colRef(coll), id));
    },

    async resetData(collections) {
      for (const c of collections) {
        const items = await this.list(c);
        await Promise.all(items.map(it => this.remove(c, it.id)));
      }
    },

    _msg(e) {
      const map = {
        'auth/email-already-in-use': 'Email sudah terdaftar. Silakan masuk.',
        'auth/invalid-email': 'Format email tidak valid.',
        'auth/weak-password': 'Kata sandi terlalu lemah (minimal 6 karakter).',
        'auth/user-not-found': 'Email tidak ditemukan. Belum punya akun?',
        'auth/wrong-password': 'Kata sandi salah.',
        'auth/invalid-credential': 'Email atau kata sandi salah.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
        'auth/network-request-failed': 'Gagal terhubung. Periksa koneksi internetmu.',
        'auth/requires-recent-login': 'Demi keamanan, silakan keluar lalu masuk lagi sebelum mengganti kata sandi.',
        'auth/popup-closed-by-user': 'Jendela login Google ditutup sebelum selesai.',
        'auth/cancelled-popup-request': 'Jendela login Google ditutup sebelum selesai.',
        'auth/popup-blocked': 'Pop-up diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.',
        'auth/unauthorized-domain': 'Domain ini belum diizinkan. Tambahkan di Firebase Console → Authentication → Settings → Authorized domains.',
        'auth/account-exists-with-different-credential': 'Email ini sudah terdaftar dengan metode lain. Coba masuk dengan email & kata sandi.',
        'auth/operation-not-allowed': 'Metode login ini belum diaktifkan di Firebase Console → Authentication → Sign-in method.'
      };
      return map[e.code] || e.message || 'Terjadi kesalahan. Coba lagi.';
    }
  };

  /* ============================================================
     API PUBLIK — memilih adapter & helper tingkat tinggi
     ============================================================ */
  const adapter = (typeof USE_FIREBASE !== 'undefined' && USE_FIREBASE && FIREBASE_CONFIG.apiKey)
    ? FirebaseAdapter
    : LocalAdapter;

  const COLLECTIONS = [
    'health_daily', 'workouts', 'notes', 'tasks',
    'schedule', 'transactions', 'goals', 'pomodoro'
  ];

  const DAILY_DEFAULT = {
    kalori: 0, air: 0, tidur: 0, olahraga: 0,
    bebasRokok: null, bebasMiras: null
  };

  return {
    get isFirebase() { return adapter === FirebaseAdapter; },
    get user() { return adapter.user; },

    init: () => adapter.init(),
    register: d => adapter.register(d),
    login: (e, p) => adapter.login(e, p),
    loginGoogle: () => adapter.loginGoogle(),
    logout: () => adapter.logout(),
    updateUser: p => adapter.updateUser(p),
    changePassword: (o, n) => adapter.changePassword(o, n),

    list: c => adapter.list(c),
    add: (c, i) => adapter.add(c, i),
    update: (c, id, p) => adapter.update(c, id, p),
    remove: (c, id) => adapter.remove(c, id),

    // Catatan kesehatan harian (satu record per tanggal)
    async getDaily(tanggal = todayStr()) {
      const all = await adapter.list('health_daily');
      return all.find(d => d.tanggal === tanggal) || { ...DAILY_DEFAULT, tanggal };
    },

    async saveDaily(tanggal, patch) {
      const all = await adapter.list('health_daily');
      const existing = all.find(d => d.tanggal === tanggal);
      if (existing) return adapter.update('health_daily', existing.id, patch);
      return adapter.add('health_daily', { ...DAILY_DEFAULT, tanggal, ...patch });
    },

    async exportAll() {
      const out = { user: { ...adapter.user }, diekspor: new Date().toISOString() };
      delete out.user.passHash;
      for (const c of COLLECTIONS) out[c] = await adapter.list(c);
      return out;
    },

    resetData: () => adapter.resetData(COLLECTIONS)
  };
})();
