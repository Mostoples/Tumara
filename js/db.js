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
        throw new Error(tr('Email sudah terdaftar. Silakan masuk.', 'This email is already registered. Please sign in.'));
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
      if (!u) throw new Error(tr('Email tidak ditemukan. Belum punya akun?', "Email not found. Don't have an account yet?"));
      if (u.passHash !== await hashText(password)) throw new Error(tr('Kata sandi salah.', 'Incorrect password.'));
      localStorage.setItem('tumara_session', u.id);
      this._user = u;
      return u;
    },

    async loginGoogle() {
      throw new Error(tr('Login dengan Google membutuhkan mode Firebase (USE_FIREBASE = true di js/firebase-config.js).', 'Google sign-in requires Firebase mode (USE_FIREBASE = true in js/firebase-config.js).'));
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
        throw new Error(tr('Kata sandi lama salah.', 'Old password is incorrect.'));
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

    // Upsert dengan id tertentu (buat baru bila belum ada, gabungkan bila ada)
    async set(coll, id, item) {
      const arr = this._read(coll);
      const i = arr.findIndex(x => x.id === id);
      if (i === -1) arr.push({ ...item, id });
      else arr[i] = { ...arr[i], ...item, id };
      this._write(coll, arr);
      return arr[i === -1 ? arr.length - 1 : i];
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

    // Firestore menolak nilai `undefined` (seluruh tulis akan gagal) —
    // buang field undefined sebelum dikirim.
    _clean(obj) {
      const out = {};
      for (const k in obj) if (obj[k] !== undefined) out[k] = obj[k];
      return out;
    },

    // Muat profil dari Firestore; bila dokumen belum ada (mis. login Google
    // via redirect, atau registrasi yang terputus), buatkan otomatis agar
    // data pengguna selalu tersimpan di users/{uid}. Data akun dari provider
    // (email, foto profil, metode login) selalu disinkronkan ke dokumen.
    async _loadProfile(fbUser) {
      const { F, db } = this.fb;
      const ref = F.doc(db, 'users', fbUser.uid);
      const snap = await F.getDoc(ref);
      const existing = snap.exists() ? snap.data() : null;

      const account = {
        email: fbUser.email || '',
        fotoUrl: fbUser.photoURL || '',
        provider: fbUser.providerData?.[0]?.providerId || 'password',
        loginTerakhir: new Date().toISOString()
      };

      if (!existing) {
        const profile = {
          nama: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Siswa Tumara'),
          ...account,
          profileComplete: false,
          dibuatPada: new Date().toISOString()
        };
        await F.setDoc(ref, profile);
        this._user = { id: fbUser.uid, ...profile };
      } else {
        // Dokumen sudah ada → segarkan data akun tanpa menimpa isian profil.
        if (!existing.nama && fbUser.displayName) account.nama = fbUser.displayName;
        await F.setDoc(ref, account, { merge: true });
        this._user = { id: fbUser.uid, ...existing, ...account };
      }
      return this._user;
    },

    async init() {
      const { auth, A } = await this._load();
      // Tangkap hasil login Google via redirect (fallback saat popup diblokir).
      try { await A.getRedirectResult(auth); } catch (_) { /* diabaikan; user tetap dicek di bawah */ }
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
      const profile = {
        nama: nama.trim(),
        email: cred.user.email || email.trim(),
        fotoUrl: '',
        provider: 'password',
        profileComplete: false,
        dibuatPada: new Date().toISOString()
      };
      await F.setDoc(F.doc(db, 'users', cred.user.uid), profile);
      this._user = { id: cred.user.uid, ...profile };
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
      const { auth, A } = await this._load();
      if (location.protocol === 'file:') {
        throw new Error(tr('Login Google tidak bisa dijalankan dari file lokal (file://). Buka aplikasi lewat https://tumara-id.web.app atau jalankan server lokal (localhost).', 'Google sign-in cannot run from a local file (file://). Open the app via https://tumara-id.web.app or run a local server (localhost).'));
      }
      const provider = new A.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        const cred = await A.signInWithPopup(auth, provider);
        return await this._loadProfile(cred.user); // profil dibuat otomatis bila belum ada
      } catch (e) {
        // Popup diblokir → fallback redirect satu halaman penuh.
        // Hasilnya ditangani oleh getRedirectResult() di init().
        if (e.code === 'auth/popup-blocked') {
          try {
            await A.signInWithRedirect(auth, provider);
            return new Promise(() => {}); // halaman akan berpindah
          } catch (e2) {
            throw new Error(this._msg(e2));
          }
        }
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
      // id tidak disimpan di dokumen; email dikelola Firebase Auth dan hanya
      // disinkronkan lewat _loadProfile — tidak boleh ditimpa dari edit profil.
      const { id, email, ...safe } = patch;
      await F.setDoc(F.doc(db, 'users', this._user.id), this._clean(safe), { merge: true });
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
      await F.setDoc(F.doc(this._colRef(coll), id), this._clean(item));
      return { id, ...item };
    },

    async update(coll, id, patch) {
      const { F } = this.fb;
      await F.setDoc(F.doc(this._colRef(coll), id), this._clean(patch), { merge: true });
      return { id, ...patch };
    },

    // Upsert dengan id tertentu — dokumen dibuat bila belum ada
    async set(coll, id, item) {
      const { F } = this.fb;
      await F.setDoc(F.doc(this._colRef(coll), id), this._clean(item), { merge: true });
      return { id, ...item };
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
        'auth/email-already-in-use': tr('Email sudah terdaftar. Silakan masuk.', 'This email is already registered. Please sign in.'),
        'auth/invalid-email': tr('Format email tidak valid.', 'Invalid email format.'),
        'auth/weak-password': tr('Kata sandi terlalu lemah (minimal 6 karakter).', 'Password is too weak (minimum 6 characters).'),
        'auth/user-not-found': tr('Email tidak ditemukan. Belum punya akun?', "Email not found. Don't have an account yet?"),
        'auth/wrong-password': tr('Kata sandi salah.', 'Incorrect password.'),
        'auth/invalid-credential': tr('Email atau kata sandi salah.', 'Incorrect email or password.'),
        'auth/too-many-requests': tr('Terlalu banyak percobaan. Coba lagi nanti.', 'Too many attempts. Please try again later.'),
        'auth/network-request-failed': tr('Gagal terhubung. Periksa koneksi internetmu.', 'Connection failed. Please check your internet connection.'),
        'auth/requires-recent-login': tr('Demi keamanan, silakan keluar lalu masuk lagi sebelum mengganti kata sandi.', 'For security, please sign out and sign in again before changing your password.'),
        'auth/popup-closed-by-user': tr('Jendela login Google ditutup sebelum selesai.', 'The Google sign-in window was closed before finishing.'),
        'auth/cancelled-popup-request': tr('Jendela login Google ditutup sebelum selesai.', 'The Google sign-in window was closed before finishing.'),
        'auth/popup-blocked': tr('Pop-up diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.', 'Pop-up blocked by the browser. Allow pop-ups for this site and try again.'),
        'auth/operation-not-supported-in-this-environment': tr('Login Google butuh halaman http/https. Buka lewat https://tumara-id.web.app atau server lokal (localhost), bukan file lokal.', 'Google sign-in needs an http/https page. Open via https://tumara-id.web.app or a local server (localhost), not a local file.'),
        'auth/internal-error': tr('Terjadi kesalahan internal. Coba lagi beberapa saat.', 'An internal error occurred. Please try again shortly.'),
        'auth/unauthorized-domain': tr('Domain ini belum diizinkan. Tambahkan di Firebase Console → Authentication → Settings → Authorized domains.', 'This domain is not authorized yet. Add it in Firebase Console → Authentication → Settings → Authorized domains.'),
        'auth/account-exists-with-different-credential': tr('Email ini sudah terdaftar dengan metode lain. Coba masuk dengan email & kata sandi.', 'This email is registered with a different method. Try signing in with email & password.'),
        'auth/operation-not-allowed': tr('Metode login ini belum diaktifkan di Firebase Console → Authentication → Sign-in method.', 'This sign-in method is not enabled yet in Firebase Console → Authentication → Sign-in method.')
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
    set: (c, id, i) => adapter.set(c, id, i),
    remove: (c, id) => adapter.remove(c, id),

    // Catatan kesehatan harian (satu record per tanggal)
    async getDaily(tanggal = todayStr()) {
      const all = await adapter.list('health_daily');
      return all.find(d => d.tanggal === tanggal) || { ...DAILY_DEFAULT, tanggal };
    },

    async saveDaily(tanggal, patch) {
      const all = await adapter.list('health_daily');
      const existing = all.find(d => d.tanggal === tanggal);
      // Record lama (id acak) tetap dipakai; record baru memakai tanggal
      // sebagai id dokumen agar dijamin satu dokumen per tanggal,
      // walau tersimpan dua kali hampir bersamaan (mis. klik cepat).
      if (existing) return adapter.update('health_daily', existing.id, patch);
      return adapter.set('health_daily', tanggal, { ...DAILY_DEFAULT, tanggal, ...patch });
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
