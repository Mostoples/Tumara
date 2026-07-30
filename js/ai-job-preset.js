/* ============================================================
   TUMARA — Saran AI per pekerjaan (Produktivitas)
   ------------------------------------------------------------
   Dipakai utk SEMUA pekerjaan — baik salah satu dari 12 kartu
   preset (JOB_PRESETS di js/views/job-select.js, dipakai sbg
   fallback instan sebelum/kalau AI belum/tak berhasil) maupun yang
   ketik sendiri (yang sebelumnya sama sekali tak dapat saran).
   Modul ini memanggil proxy Apps Script (google-apps-script/
   AiJobPreset.gs, action 'aiJobPreset') SEKALI per teks pekerjaan,
   lalu hasilnya di-cache di Firestore (users/{uid}.aiJobPresets)
   lewat callback `persist` yang diberikan pemanggil — modul ini tak
   perlu tahu apakah pemanggilnya UmumAuth (saat onboarding), DB
   (saat ganti pekerjaan lewat Profil), atau productivity.js (saat
   membuka tab Produktivitas, utk "membackfill" akun lama yang
   pekerjaannya dipilih sebelum fitur ini ada).

   Kalau panggilan gagal (jaringan/limit/dll.), `ensure()` diam-diam
   tidak melakukan apa-apa — app lanjut dgn tampilan generik/preset
   statis seperti sebelum fitur ini ada, TANPA pesan error ke user.
   ============================================================ */

// Endpoint & token proxy — project Apps Script TERPISAH dari proxy upload
// Drive (google-apps-script/Code.gs), karena API key Gemini dibuat di akun
// Google yang berbeda dari akun penyimpanan Drive. Lihat
// google-apps-script/AiJobPreset.gs untuk kode server & cara deploy-nya.
// AI_JOB_ENDPOINT diisi setelah deploy Web App-nya (Deploy → salin URL /exec).
// AI_JOB_TOKEN harus sama persis dengan TOKEN di AiJobPreset.gs.
const AI_JOB_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwi4K9OqYd8lfDk8hnjhPcHZQilXQaqyuRcZapF2IPg5NGcU3QgX1MLN5ji0I53RrlM/exec';
const AI_JOB_TOKEN = 'TumaraAiJob2026';

const AiJobPreset = {
  // Kunci penyimpanan di Firestore utk satu teks pekerjaan bebas — dipakai
  // konsisten baik saat menyimpan maupun saat membaca cache (productivity.js).
  keyOf(jobText) {
    return slug(jobText);
  },

  // Entri cache (mentah, {kategori:[{id,en}], kebiasaan:[{e,id,en}]}) atau null.
  cached(user, jobText) {
    return (user && user.aiJobPresets && user.aiJobPresets[this.keyOf(jobText)]) || null;
  },

  // Ubah entri cache mentah jadi bentuk JOB_PRESETS[key] persis (dwibahasa
  // lewat tr(), kebiasaan.n() function) — supaya pemanggil (productivity.js)
  // tak perlu tahu bedanya sama sekali dgn preset 12 kartu bawaan.
  asPreset(entry) {
    if (!entry) return null;
    return {
      kategori: (entry.kategori || []).map(k => tr(k.id, k.en)),
      kebiasaan: (entry.kebiasaan || []).map(h => ({ e: h.e, n: () => tr(h.id, h.en) })),
    };
  },

  async _post(payload, timeoutMs) {
    if (!AI_JOB_ENDPOINT) throw new Error('AiJobPreset belum dikonfigurasi (AI_JOB_ENDPOINT kosong).');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(AI_JOB_ENDPOINT, {
        method: 'POST',
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token: AI_JOB_TOKEN, ...payload }),
      });
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  },

  // Buang entri tak lengkap/kepanjangan — jangan percaya server mentah-mentah
  // sebelum masuk ke Firestore (server sudah sanitasi juga, ini lapis kedua).
  _sanitize(out) {
    const kategori = (Array.isArray(out.kategori) ? out.kategori : [])
      .filter(k => k && k.id && k.en)
      .slice(0, 6)
      .map(k => ({ id: String(k.id).slice(0, 30), en: String(k.en).slice(0, 30) }));
    const kebiasaan = (Array.isArray(out.kebiasaan) ? out.kebiasaan : [])
      .filter(k => k && k.e && k.id && k.en)
      .slice(0, 4)
      .map(k => ({ e: String(k.e).slice(0, 8), id: String(k.id).slice(0, 60), en: String(k.en).slice(0, 60) }));
    return { kategori, kebiasaan };
  },

  // Cegah 2 panggilan bersamaan utk teks pekerjaan yang sama menembak proxy
  // dua kali (mis. render ulang tab sebelum panggilan pertama selesai, atau
  // beberapa pekerjaan di-ensure() paralel oleh pemanggil yang lalai serial).
  _inflight: new Set(),

  // Cek cache → kalau belum ada, panggil AI → sanitasi → simpan lewat
  // `persist(patch)` (mis. UmumAuth._patch atau DB.updateUser). Tak pernah
  // throw — kegagalan apapun cukup berarti "belum ada saran AI", bukan error.
  // Balikan `true` hanya kalau BENAR-BENAR baru menyimpan entri (dipakai
  // pemanggil utk tahu perlu refresh tampilan atau tidak).
  async ensure(jobText, user, persist) {
    const key = this.keyOf(jobText);
    if (!jobText || this.cached(user, jobText) || this._inflight.has(key)) return false;
    this._inflight.add(key);
    try {
      const out = await this._post({ action: 'aiJobPreset', jobText }, 15000);
      if (!out || !out.ok) return false;
      const entry = { ...this._sanitize(out), generatedAt: new Date().toISOString() };
      if (!entry.kategori.length && !entry.kebiasaan.length) return false;
      await persist({ aiJobPresets: { ...(user.aiJobPresets || {}), [key]: entry } });
      return true;
    } catch (_) {
      // diam-diam — lihat komentar di atas.
      return false;
    } finally {
      this._inflight.delete(key);
    }
  },
};
