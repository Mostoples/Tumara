# Medication Reminder P1 Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the false "pengingat obat" disclaimer with a real notification scheduler, so `health.js:274`'s claim actually matches what the code does.

**Architecture:** A `setInterval`-based checker in `js/app.js` (mirroring the existing `startWaterReminder()`), wired into the app's init/logout lifecycle, plus a notification-permission request triggered from the med-save modal in `js/views/health.js`, plus a corrected disclaimer string.

**Tech Stack:** Plain browser JS (no framework, no bundler, no test runner — matches the rest of this repo). `Notification` Web API, `setInterval`. Verified with `node --check` (syntax-only, since these are global-scope `<script src>` files, not ES modules) and a live browser smoke test via Playwright.

## Global Constraints

- Scope is exactly: `js/app.js`, `js/views/health.js`, `js/views/profile.js`. No other file changes.
- No new dependencies, no build step, no test framework — none exist in this repo today (confirmed: no `package.json`, no lint config).
- Reminder check interval is 30 seconds (per design doc — matches the design's stated trade-off of occasional double-notify on same-minute refresh, which is accepted, not solved).
- Reminder only fires while the tab is open — no service worker / background push. This is a pre-existing limitation shared with the water reminder, not something this plan changes.
- `tr()` and `todayStr()` are global functions from `js/utils.js`, loaded before `js/app.js` in every HTML entry point (confirmed via `app.html:105,117`) — usable directly in `app.js` without import.

---

## Baseline (for reference — re-read live files before editing, line numbers may have shifted since this plan was written)

`js/app.js:247-259` (end of file):
```js
  notify(body, { title = 'Tumara 💧' } = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: 'assets/logo.png', tag: 'tumara-water' });
        return true;
      } catch (_) { /* sebagian browser mobile butuh service worker — abaikan */ }
    }
    return false;
  },

  startWaterReminder() {
    this.stopWaterReminder();
    const menit = DB.user?.reminderInterval || 60;
    this._reminderId = setInterval(() => {
      const pesan = tr('Waktunya minum 💧 Satu gelas dulu, yuk!', 'Time to hydrate 💧 Grab a glass of water!');
      if (!this.notify(pesan)) toast(pesan, 'info');
    }, menit * 60 * 1000);
  },

  stopWaterReminder() {
    if (this._reminderId) { clearInterval(this._reminderId); this._reminderId = null; }
  }
};
```

`js/app.js:115` (inside `init()`):
```js
    if (u.reminderAir) this.startWaterReminder();
```

`js/views/profile.js:311-316`:
```js
    $('#pfLogout', el).onclick = async () => {
      if (!await confirmDialog(tr('Keluar dari akunmu?', 'Sign out of your account?'), { title: tr('Keluar', 'Sign out'), okText: tr('Ya, keluar', 'Yes, sign out') })) return;
      App.stopWaterReminder();
      await DB.logout();
      App.showAuth();
    };
```

`js/views/health.js:274`:
```js
      <div class="disclaimer" style="margin-top:18px;"><ion-icon name="information-circle"></ion-icon><span>${tr('Pengingat tampil sebagai notifikasi saat aplikasi terbuka. Selalu ikuti anjuran dosis dari dokter/apoteker.', 'Reminders appear as notifications while the app is open. Always follow dosage advice from your doctor/pharmacist.')}</span></div>`;
```

`js/views/health.js:306-316` (inside `_medModal()`'s `onMount`):
```js
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (!nama) return toast(tr('Isi nama obat.', 'Enter a medicine name.'), 'warning');
          const waktu = $('#mWaktu', m).value.split(',').map(s => s.trim()).filter(s => /^\d{1,2}:\d{2}$/.test(s));
          const data = { nama, dosis: $('#mDosis', m).value.trim(), waktu, catatan: $('#mCat', m).value.trim() };
          if (med) await DB.update('meds', med.id, data);
          else await DB.add('meds', { ...data, riwayat: {} });
          closeModal();
          toast(tr('Obat tersimpan 💊', 'Medication saved 💊'));
          App.refresh();
        };
```

---

### Task 1: Add the scheduler core to `js/app.js`

**Files:**
- Modify: `js/app.js:257-259` (append after `stopWaterReminder()`, before the object's closing `};`)

**Interfaces:**
- Produces: `App.startMedReminder()` (no args, returns nothing), `App.stopMedReminder()` (no args, returns nothing), `App._checkMedReminder()` (internal, async, no args). Task 2 and Task 3 call `startMedReminder()`/`stopMedReminder()` by these exact names.
- Consumes: `DB.list('meds')` (existing, returns `Promise<Array<{id, nama, dosis, waktu: string[], riwayat: Object<string,string[]>}>>` — confirmed shape from `health.js:236,296-316`), `App.notify(body, {title})` (existing, `app.js:238`), global `tr()`, `todayStr()`, `toast()` (existing globals from `js/utils.js`).

- [ ] **Step 1: Open `js/app.js` and locate the exact end of `stopWaterReminder()`**

Confirm this block is still present (search for `stopWaterReminder`):
```js
  stopWaterReminder() {
    if (this._reminderId) { clearInterval(this._reminderId); this._reminderId = null; }
  }
};
```
Note the closing `};` immediately after — that's the end of the `App` object literal. The new methods go **before** that `};`, as siblings of `stopWaterReminder`.

- [ ] **Step 2: Add a comma after `stopWaterReminder()`'s closing `}` and insert the three new methods**

Change:
```js
  stopWaterReminder() {
    if (this._reminderId) { clearInterval(this._reminderId); this._reminderId = null; }
  }
};
```
To:
```js
  stopWaterReminder() {
    if (this._reminderId) { clearInterval(this._reminderId); this._reminderId = null; }
  },

  /* ---------- pengingat obat ---------- */

  async _checkMedReminder() {
    let meds;
    try { meds = await DB.list('meds'); } catch (_) { return; }
    if (!meds || !meds.length) return;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = todayStr();
    this._medNotified = this._medNotified || new Set();
    meds.forEach(md => {
      (md.waktu || []).forEach(w => {
        if (w !== hhmm) return;
        const key = `${md.id}_${w}_${today}`;
        if (this._medNotified.has(key)) return;
        this._medNotified.add(key);
        const taken = (md.riwayat || {})[today] || [];
        if (taken.includes(w)) return;
        const pesan = tr(`Waktunya minum ${md.nama}${md.dosis ? ' · ' + md.dosis : ''} (${w}) 💊`,
                         `Time for ${md.nama}${md.dosis ? ' · ' + md.dosis : ''} (${w}) 💊`);
        if (!this.notify(pesan, { title: 'Tumara 💊' })) toast(pesan, 'info');
      });
    });
  },

  startMedReminder() {
    this.stopMedReminder();
    this._medReminderId = setInterval(() => this._checkMedReminder(), 30 * 1000);
  },

  stopMedReminder() {
    if (this._medReminderId) { clearInterval(this._medReminderId); this._medReminderId = null; }
  }
};
```

- [ ] **Step 3: Syntax check**

Run:
```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && node --check js/app.js && echo SYNTAX_OK
```
Expected: `SYNTAX_OK` with no error output. (`node --check` only parses grammar — it does not execute the file or resolve browser-only globals like `Notification`/`document`, so this is safe to run even though `app.js` is a browser script, not a Node module.)

- [ ] **Step 4: Confirm the three new methods exist with the exact names Task 2/3 will call**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && grep -n "startMedReminder\|stopMedReminder\|_checkMedReminder" js/app.js
```
Expected output: 4 lines — the `async _checkMedReminder()` definition, the `startMedReminder()` definition (which calls `this.stopMedReminder()` and `this._checkMedReminder()`), and the `stopMedReminder()` definition.

- [ ] **Step 5: Commit**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && git add js/app.js && git commit -m "$(cat <<'EOF'
Add med reminder scheduler core to App (app.js)

startMedReminder()/stopMedReminder()/_checkMedReminder() mirror the
existing water reminder pattern: a 30s interval re-fetches meds,
matches each medication's scheduled time against the current clock,
and fires App.notify() (with toast fallback) unless already taken or
already notified today. Not yet wired into init/logout — that's the
next task.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Wire the scheduler into app init and logout

**Files:**
- Modify: `js/app.js:115` (inside `init()`)
- Modify: `js/views/profile.js:311-316` (logout handler)

**Interfaces:**
- Consumes: `App.startMedReminder()`, `App.stopMedReminder()` from Task 1 (exact names, no args).

- [ ] **Step 1: Call `startMedReminder()` from `init()`**

In `js/app.js`, find:
```js
    if (u.reminderAir) this.startWaterReminder();
```
Change to:
```js
    if (u.reminderAir) this.startWaterReminder();
    this.startMedReminder();
```
(Unconditional — unlike the water reminder, medication reminders have no separate on/off preference; they follow the existence of scheduled `meds` themselves, which `_checkMedReminder()` already checks.)

- [ ] **Step 2: Stop it on logout**

In `js/views/profile.js`, find:
```js
    $('#pfLogout', el).onclick = async () => {
      if (!await confirmDialog(tr('Keluar dari akunmu?', 'Sign out of your account?'), { title: tr('Keluar', 'Sign out'), okText: tr('Ya, keluar', 'Yes, sign out') })) return;
      App.stopWaterReminder();
      await DB.logout();
      App.showAuth();
    };
```
Change to:
```js
    $('#pfLogout', el).onclick = async () => {
      if (!await confirmDialog(tr('Keluar dari akunmu?', 'Sign out of your account?'), { title: tr('Keluar', 'Sign out'), okText: tr('Ya, keluar', 'Yes, sign out') })) return;
      App.stopWaterReminder();
      App.stopMedReminder();
      await DB.logout();
      App.showAuth();
    };
```

- [ ] **Step 3: Syntax check both files**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && node --check js/app.js && node --check js/views/profile.js && echo SYNTAX_OK
```
Expected: `SYNTAX_OK`.

- [ ] **Step 4: Confirm both call sites are wired**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && grep -n "startMedReminder\|stopMedReminder" js/app.js js/views/profile.js
```
Expected: `js/app.js` shows the 3 definitions from Task 1 plus the new `this.startMedReminder();` call in `init()`. `js/views/profile.js` shows exactly one line: `App.stopMedReminder();`.

- [ ] **Step 5: Commit**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && git add js/app.js js/views/profile.js && git commit -m "$(cat <<'EOF'
Start med reminder on app init, stop it on logout

Mirrors the water reminder's lifecycle. Unlike water reminder, med
reminder has no separate user toggle — it starts unconditionally and
_checkMedReminder() itself no-ops when there are no scheduled meds.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Request notification permission on first scheduled med, and fix the disclaimer

**Files:**
- Modify: `js/views/health.js:274` (disclaimer text)
- Modify: `js/views/health.js:306-316` (`_medModal()` save handler)

**Interfaces:**
- Consumes: nothing from Tasks 1-2 (this task only needs the browser `Notification` API directly, same as `profile.js:270-272` already does).

- [ ] **Step 1: Replace the disclaimer text**

In `js/views/health.js`, find:
```js
      <div class="disclaimer" style="margin-top:18px;"><ion-icon name="information-circle"></ion-icon><span>${tr('Pengingat tampil sebagai notifikasi saat aplikasi terbuka. Selalu ikuti anjuran dosis dari dokter/apoteker.', 'Reminders appear as notifications while the app is open. Always follow dosage advice from your doctor/pharmacist.')}</span></div>`;
```
Replace with:
```js
      <div class="disclaimer" style="margin-top:18px;"><ion-icon name="information-circle"></ion-icon><span>${tr('Pengingat dicek tiap 30 detik & tampil sebagai notifikasi selama aplikasi ini terbuka di tabmu (tidak berjalan di latar belakang). Selalu ikuti anjuran dosis dari dokter/apoteker.', 'Reminders are checked every 30 seconds and appear as a notification while this app is open in your tab (not in the background). Always follow dosage advice from your doctor/pharmacist.')}</span></div>`;
```

- [ ] **Step 2: Request notification permission when a scheduled med is saved**

In `js/views/health.js`, find the `_medModal()` save handler:
```js
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (!nama) return toast(tr('Isi nama obat.', 'Enter a medicine name.'), 'warning');
          const waktu = $('#mWaktu', m).value.split(',').map(s => s.trim()).filter(s => /^\d{1,2}:\d{2}$/.test(s));
          const data = { nama, dosis: $('#mDosis', m).value.trim(), waktu, catatan: $('#mCat', m).value.trim() };
          if (med) await DB.update('meds', med.id, data);
          else await DB.add('meds', { ...data, riwayat: {} });
          closeModal();
          toast(tr('Obat tersimpan 💊', 'Medication saved 💊'));
          App.refresh();
        };
```
Replace with:
```js
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (!nama) return toast(tr('Isi nama obat.', 'Enter a medicine name.'), 'warning');
          const waktu = $('#mWaktu', m).value.split(',').map(s => s.trim()).filter(s => /^\d{1,2}:\d{2}$/.test(s));
          const data = { nama, dosis: $('#mDosis', m).value.trim(), waktu, catatan: $('#mCat', m).value.trim() };
          if (med) await DB.update('meds', med.id, data);
          else await DB.add('meds', { ...data, riwayat: {} });
          closeModal();
          toast(tr('Obat tersimpan 💊', 'Medication saved 💊'));
          if (waktu.length && 'Notification' in window && Notification.permission === 'default') {
            try { await Notification.requestPermission(); } catch (_) { /* abaikan */ }
          }
          App.refresh();
        };
```

- [ ] **Step 3: Syntax check**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && node --check js/views/health.js && echo SYNTAX_OK
```
Expected: `SYNTAX_OK`.

- [ ] **Step 4: Confirm the old false claim is gone and the permission request is present**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && grep -n "Pengingat tampil sebagai notifikasi saat aplikasi terbuka" js/views/health.js; grep -n "requestPermission" js/views/health.js
```
Expected: the first `grep` returns **nothing** (old string fully replaced). The second `grep` returns one line inside `_medModal()`'s save handler.

- [ ] **Step 5: Commit**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && git add js/views/health.js && git commit -m "$(cat <<'EOF'
Request notification permission on first scheduled med, fix disclaimer

The old disclaimer promised reminders that no scheduler implemented
(fixed in prior two tasks). It also never asked for Notification
permission on its own — only the separate water-reminder toggle did —
so med reminders were silently inert for anyone who never visited
Profile settings. Now requesting permission when a med is saved with
a schedule, same pattern as profile.js's water reminder toggle.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Live browser smoke test

**Files:**
- Read only: `js/app.js`, `js/views/health.js`, `js/views/profile.js` (final state).

- [ ] **Step 1: Serve the app locally**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && npx --yes serve -l 5050 . > /tmp/serve.log 2>&1 &
sleep 2 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5050/index.html
```
Expected: `200`. (Run in background — leave it running for the Playwright steps below; stop it in Step 4.)

- [ ] **Step 2: Load the app shell and check for console errors**

Use the Playwright browser tools (already available in this environment) to:
1. Navigate to `http://localhost:5050/index.html`.
2. Capture console messages.
3. Confirm there are no `error`-level console messages mentioning `app.js`, `health.js`, or `profile.js` (a syntax or reference error in the new code would throw immediately on script load, before any login screen even renders — this catches that class of mistake even though full login isn't exercised here).

Expected: the login/onboarding screen renders, and the console message list contains no errors originating from the three modified files. (This is a smoke test, not a full login flow — this repo requires a real Firebase Auth session to reach the meds UI, which is out of scope for automated testing here.)

- [ ] **Step 3: Record the result**

Report the console message list (or "no errors") back to the user directly in the conversation — do not just say "looks fine" without showing what was captured.

- [ ] **Step 4: Stop the local server**

```bash
kill %1 2>/dev/null; true
```

- [ ] **Step 5: Hand off the manual end-to-end checklist to the user**

This cannot be automated without real login credentials and real wall-clock waiting. Give the user this exact checklist (from the design doc) to run themselves whenever convenient — do not mark this task fully "done" in the todo list until either the user confirms they ran it, or they explicitly say they're OK skipping it:

1. Tambah obat dengan jam beberapa menit ke depan dari waktu saat ini → dialog izin notifikasi browser harus muncul (kalau belum pernah diizinkan).
2. Izinkan notifikasi → tunggu sampai jam terjadwal tiba → notifikasi browser harus muncul dalam 30 detik dari jam tsb.
3. Tandai obat "sudah diminum" sebelum jamnya lewat → notifikasi tidak muncul saat jamnya tiba.
4. Logout → buka DevTools, konfirmasi `App._medReminderId` jadi `null` (interval berhenti).
5. Tolak izin notifikasi → saat jam tiba, toast in-app muncul sebagai fallback (bukan diam saja).

---

## Self-Review Notes

- **Spec coverage:** scheduler core → Task 1. Init/logout wiring → Task 2. Permission request + disclaimer text → Task 3. Design doc's "Testing" section → Task 4 (automated smoke test) + handed-off manual checklist (can't be fully automated without live login and real clock time).
- **Placeholder scan:** every step has literal code or literal commands; no "add appropriate X" language.
- **Type/name consistency:** `App.startMedReminder()` / `App.stopMedReminder()` / `App._checkMedReminder()` used with identical names and no-arg signatures across Tasks 1-2. `this._medReminderId` (Task 1) is the only interval handle referenced by `stopMedReminder()` (also Task 1) — no mismatched property names introduced in Task 2's call sites, since Task 2 only calls the public `start`/`stop` methods, never touches `_medReminderId` directly.
