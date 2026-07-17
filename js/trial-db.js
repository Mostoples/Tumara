/* ============================================================
   TUMARA — Lapisan Data jalur uji coba (trial-db.js)
   ------------------------------------------------------------
   Versi DB.* yang dipakai coba-app.html (dashboard/health/
   productivity/finance/ibadah/encyclopedia/profile — file view
   yang SAMA dengan app.html, tidak diubah). Beda dari js/db.js:
   • Menumpang di app & sesi Firebase yang SUDAH dibuat TrialAuth
     (project myosigid) — TIDAK bikin app Firebase baru, supaya
     sesi login dari register.html/pilih-pekerjaan.html terbawa.
   • Subkoleksi data di trial_users/{uid}/{coll} (paralel dengan
     users/{uid}/{coll} di project sekolah tumara-id).
   • Tanpa peran admin/guru/siswa, tanpa kelas/NIS/roster — hanya
     satu jenis akun: pengguna uji coba (dibedakan field pekerjaan).
   ============================================================ */

const DB = (() => {
  let user = null;
  const cache = { own: new Map(), g: new Map(), gw: new Map() };
  const cacheClear = () => { cache.own.clear(); cache.g.clear(); cache.gw.clear(); };

  async function fb() {
    return TrialAuth._load();
  }

  function clean(obj) {
    if (Array.isArray(obj)) return obj.filter(v => v !== undefined).map(clean);
    if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
      const out = {};
      for (const k in obj) { if (obj[k] !== undefined) out[k] = clean(obj[k]); }
      return out;
    }
    return obj;
  }

  function colRef({ F, db }, coll) {
    return F.collection(db, 'trial_users', user.id, coll);
  }
  function gColRef({ F, db }, coll) {
    return F.collection(db, coll);
  }

  const DAILY_DEFAULT = { kalori: 0, air: 0, tidur: 0, olahraga: 0, bebasRokok: null, bebasMiras: null };

  const api = {
    get isFirebase() { return true; },
    get user() { return user; },
    get role() { return 'siswa'; },

    async init() {
      user = await TrialAuth.init();
      cacheClear();
      return user;
    },

    async logout() {
      await TrialAuth.logout();
      cacheClear();
      user = null;
    },

    async updateUser(patch) {
      const { F, db } = await fb();
      const { id, email, ...safe } = patch;
      await F.setDoc(F.doc(db, 'trial_users', user.id), clean(safe), { merge: true });
      user = { ...user, ...patch };
      TrialAuth.user = user;
      return user;
    },

    async list(coll) {
      if (cache.own.has(coll)) return cache.own.get(coll).slice();
      const bundle = await fb();
      const snap = await bundle.F.getDocs(colRef(bundle, coll));
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cache.own.set(coll, arr);
      return arr.slice();
    },

    async add(coll, item) {
      const bundle = await fb();
      const { F } = bundle;
      const id = uid();
      await F.setDoc(F.doc(colRef(bundle, coll), id), clean(item));
      const rec = { id, ...item };
      const cached = cache.own.get(coll);
      if (cached) cached.push(rec);
      return rec;
    },

    async update(coll, id, patch) {
      const bundle = await fb();
      const { F } = bundle;
      await F.setDoc(F.doc(colRef(bundle, coll), id), clean(patch), { merge: true });
      const cached = cache.own.get(coll);
      if (cached) { const i = cached.findIndex(x => x.id === id); if (i >= 0) cached[i] = { ...cached[i], ...patch }; }
      return { id, ...patch };
    },

    async set(coll, id, item) {
      const bundle = await fb();
      const { F } = bundle;
      await F.setDoc(F.doc(colRef(bundle, coll), id), clean(item), { merge: true });
      const cached = cache.own.get(coll);
      if (cached) {
        const i = cached.findIndex(x => x.id === id);
        if (i >= 0) cached[i] = { ...cached[i], ...item, id }; else cached.push({ ...item, id });
      }
      return { id, ...item };
    },

    async remove(coll, id) {
      const bundle = await fb();
      const { F } = bundle;
      await F.deleteDoc(F.doc(colRef(bundle, coll), id));
      const cached = cache.own.get(coll);
      if (cached) { const i = cached.findIndex(x => x.id === id); if (i >= 0) cached.splice(i, 1); }
    },

    async gList(coll) {
      if (cache.g.has(coll)) return cache.g.get(coll).slice();
      const bundle = await fb();
      const snap = await bundle.F.getDocs(gColRef(bundle, coll));
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cache.g.set(coll, arr);
      return arr.slice();
    },

    async gListWhere(coll, field, value) {
      const key = `${coll}|${field}|${value}`;
      if (cache.gw.has(key)) return cache.gw.get(key).slice();
      const bundle = await fb();
      const { F } = bundle;
      const qy = F.query(gColRef(bundle, coll), F.where(field, '==', value));
      const snap = await F.getDocs(qy);
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cache.gw.set(key, arr);
      return arr.slice();
    },

    async gGet(coll, id) {
      const bundle = await fb();
      const snap = await bundle.F.getDoc(bundle.F.doc(gColRef(bundle, coll), id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },

    async gUpdate(coll, id, patch) {
      const bundle = await fb();
      await bundle.F.setDoc(bundle.F.doc(gColRef(bundle, coll), id), clean(patch), { merge: true });
      cache.g.delete(coll);
      return { id, ...patch };
    },

    async gRemove(coll, id) {
      const bundle = await fb();
      await bundle.F.deleteDoc(bundle.F.doc(gColRef(bundle, coll), id));
      cache.g.delete(coll);
    },

    async getDaily(tanggal = todayStr()) {
      const all = await api.list('health_daily');
      return all.find(d => d.tanggal === tanggal) || { ...DAILY_DEFAULT, tanggal };
    },

    async saveDaily(tanggal, patch) {
      const all = await api.list('health_daily');
      const existing = all.find(d => d.tanggal === tanggal);
      if (existing) return api.update('health_daily', existing.id, patch);
      return api.set('health_daily', tanggal, { ...DAILY_DEFAULT, tanggal, ...patch });
    },

    async exportAll() {
      const COLLECTIONS = [
        'health_daily', 'workouts', 'notes', 'tasks', 'schedule', 'transactions', 'goals', 'pomodoro',
        'weights', 'meds', 'habits', 'habit_logs', 'ibadah_daily', 'hafalan', 'quran_log', 'ibadah_notes',
        'budgets', 'debts', 'biometrics', 'foods', 'menstrual', 'wallets', 'assets', 'sedekah'
      ];
      const out = { user: { ...user }, diekspor: new Date().toISOString() };
      for (const c of COLLECTIONS) out[c] = await api.list(c);
      return out;
    }
  };

  return api;
})();
