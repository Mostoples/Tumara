    /* ============================================================
      TUMARA — Proxy Saran AI utk Pekerjaan Bebas Ketik (Gemini)
      ------------------------------------------------------------
      Project Apps Script TERPISAH dari proxy upload Drive (Code.gs) —
      sengaja dipisah karena API key Gemini dibuat di akun Google yang
      BEDA dari akun penyimpanan Drive. Dipakai HANYA oleh halaman
      pilih pekerjaan (js/views/job-select.js, js/views/profile.js
      lewat js/ai-job-preset.js) untuk menghasilkan saran kategori
      tugas & kebiasaan bagi user yang mengetik pekerjaan sendiri
      (bukan salah satu dari 12 kartu bawaan) — fitur lain di app TIDAK
      memakai AI sama sekali.

      CARA PASANG (sekali saja):
      1. Buka https://script.google.com — login dgn akun Google tempat
          3 API key Gemini dibuat (mis. enikhastuti53@gmail.com).
      2. New project → hapus isi bawaan → tempel SELURUH file ini.
      3. TOKEN di bawah sudah terisi. Bila ganti, samakan dgn
          AI_JOB_TOKEN di js/ai-job-preset.js.
      4. Project Settings (⚙️) → Script Properties → Add script property,
          tambahkan GEMINI_KEY_1, GEMINI_KEY_2, GEMINI_KEY_3 — isi dgn
          3 API key dari aistudio.google.com. JANGAN taruh key di kode ini.
      5. Deploy → New deployment → "Web app".
            - Execute as: Me
            - Who has access: Anyone
          → Deploy → salin "Web app URL" (/exec) → taruh di AI_JOB_ENDPOINT
          di js/ai-job-preset.js.
      6. Sanity check: buka URL /exec itu di browser, harus muncul
          {"ok":true,"service":"tumara-ai-job-proxy"}.
      ============================================================ */

    // HARUS sama persis dengan AI_JOB_TOKEN di js/ai-job-preset.js
    const TOKEN = 'TumaraAiJob2026';

    // Alias resmi Google yg selalu menunjuk ke model flash (cepat/murah) yg
    // direkomendasikan saat itu — dipakai supaya tidak perlu update kode lagi tiap
    // kali Google mengganti/deprecate nama model versi tertentu (mis. gemini-2.5-flash
    // sempat "tidak tersedia utk akun baru" saat fitur ini dites pertama kali).
    const GEMINI_MODEL = 'gemini-flash-latest';

    function doPost(e) {
      try {
        const body = JSON.parse(e.postData.contents);
        if (body.token !== TOKEN) return _json({ ok: false, error: 'unauthorized' });
        if (body.action === 'aiJobPreset') return _json(_aiJobPreset(body));
        if (body.action === 'listModels') return _json(_listModels());
        return _json({ ok: false, error: 'unknown action' });
      } catch (err) {
        return _json({ ok: false, error: String(err) });
      }
    }

    // Penanda agar mudah dicek dari browser (buka URL /exec).
    function doGet() {
      return _json({ ok: true, service: 'tumara-ai-job-proxy' });
    }

    // Diagnostik sementara: daftar model yg tersedia utk key yg dipakai, supaya
    // GEMINI_MODEL bisa disamakan dgn nama model terkini (nama model suka berubah).
    function _listModels() {
      const keys = _geminiKeys();
      if (!keys.length) return { ok: false, error: 'Gemini belum dikonfigurasi (script properties kosong)' };
      const res = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/v1beta/models?key=' + keys[0],
        { muteHttpExceptions: true }
      );
      if (res.getResponseCode() !== 200) return { ok: false, error: 'http ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300) };
      const data = JSON.parse(res.getContentText());
      const names = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
      return { ok: true, models: names };
    }

    // Ambil key yg tersedia (3 disediakan utk jaga-jaga kalau salah satu
    // kena limit/nonaktif) — yg kosong dilewati.
    function _geminiKeys() {
      const p = PropertiesService.getScriptProperties();
      return ['GEMINI_KEY_1', 'GEMINI_KEY_2', 'GEMINI_KEY_3']
        .map(k => p.getProperty(k))
        .filter(Boolean);
    }

    // Skema output terstruktur (JSON mode Gemini) — bentuknya dibuat SAMA
    // PERSIS dgn JOB_PRESETS[key] di js/views/job-select.js (id/en dwibahasa,
    // emoji per kebiasaan) supaya sisi app tinggal pakai tanpa konversi.
    const AI_JOB_SCHEMA = {
      type: 'OBJECT',
      properties: {
        kategori: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { id: { type: 'STRING' }, en: { type: 'STRING' } },
            required: ['id', 'en'],
          },
        },
        kebiasaan: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { e: { type: 'STRING' }, id: { type: 'STRING' }, en: { type: 'STRING' } },
            required: ['e', 'id', 'en'],
          },
        },
      },
      required: ['kategori', 'kebiasaan'],
    };

    // Dipanggil SEKALI oleh js/ai-job-preset.js saat user menyimpan pekerjaan
    // ketik-sendiri; hasilnya di-cache di Firestore sisi app (users/{uid}
    // .aiJobPresets) — jadi proxy ini tak dipanggil ulang utk teks yg sama.
    // Kalau gagal, App diam-diam fallback ke tampilan generik (tanpa error UI),
    // jadi fungsi ini boleh gagal dgn tenang, tak perlu retry di sisi App.
    function _aiJobPreset(body) {
      const jobText = String(body.jobText || '').trim().slice(0, 60);
      if (!jobText) return { ok: false, error: 'jobText kosong' };

      const prompt = 'Kamu membantu personalisasi aplikasi produktivitas Tumara untuk seseorang ' +
        'dengan pekerjaan/kesibukan: "' + jobText + '". Berikan TEPAT 3 kategori tugas singkat ' +
        '(1-2 kata, mis. "Klien", "Stok") dan TEPAT 2 saran kebiasaan harian singkat (maks 5 kata) ' +
        'yang relevan dan realistis untuk pekerjaan tersebut, masing-masing dengan satu emoji yang cocok. ' +
        'Tulis setiap teks dalam Bahasa Indonesia (id) DAN Inggris (en). Jangan generik — sesuaikan ' +
        'dengan pekerjaan yang disebutkan.';

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: AI_JOB_SCHEMA,
          temperature: 0.4,
          maxOutputTokens: 1024,
          // Model 2.5+/3+ punya "thinking" internal yg makan jatah maxOutputTokens
          // kalau tak dimatikan — tugas ini simpel (klasifikasi singkat), jadi
          // dimatikan saja: lebih cepat & jatah token penuh utk jawaban JSON-nya.
          thinkingConfig: { thinkingBudget: 0 },
        },
      };

      const keys = _geminiKeys();
      if (!keys.length) return { ok: false, error: 'Gemini belum dikonfigurasi (script properties kosong)' };

      let lastErr = 'unknown';
      for (const key of keys) {
        let res;
        try {
          res = UrlFetchApp.fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + key,
            {
              method: 'post',
              contentType: 'application/json',
              payload: JSON.stringify(payload),
              muteHttpExceptions: true,
            }
          );
        } catch (err) {
          lastErr = String(err);
          continue; // masalah jaringan → coba key berikutnya
        }
        const code = res.getResponseCode();
        if (code === 429 || code === 403 || code >= 500) {
          lastErr = 'http ' + code; // limit/kuota/akun key ini bermasalah → coba key lain
          continue;
        }
        if (code !== 200) {
          return { ok: false, error: 'http ' + code + ': ' + res.getContentText().slice(0, 200) };
        }
        try {
          const data = JSON.parse(res.getContentText());
          const text = data.candidates[0].content.parts[0].text;
          const out = JSON.parse(text);
          return { ok: true, kategori: _sanitizeKategori(out.kategori), kebiasaan: _sanitizeKebiasaan(out.kebiasaan) };
        } catch (err) {
          // Sertakan potongan respons mentah + finishReason di pesan error supaya
          // gampang didiagnosis (mis. kehabisan token/thinking) tanpa perlu buka log.
          return { ok: false, error: 'parse gagal: ' + String(err) + ' | raw: ' + res.getContentText().slice(0, 400) };
        }
      }
      return { ok: false, error: lastErr };
    }

    // Batasi panjang & jumlah, buang entri kosong/tak lengkap — jangan percaya
    // mentah-mentah keluaran model sebelum masuk ke Firestore & UI.
    function _sanitizeKategori(arr) {
      return (Array.isArray(arr) ? arr : [])
        .filter(k => k && k.id && k.en)
        .slice(0, 6)
        .map(k => ({ id: String(k.id).slice(0, 30), en: String(k.en).slice(0, 30) }));
    }
    function _sanitizeKebiasaan(arr) {
      return (Array.isArray(arr) ? arr : [])
        .filter(k => k && k.e && k.id && k.en)
        .slice(0, 4)
        .map(k => ({ e: String(k.e).slice(0, 8), id: String(k.id).slice(0, 60), en: String(k.en).slice(0, 60) }));
    }

    function _json(obj) {
      return ContentService
        .createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
    }
