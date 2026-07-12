# Firestore Security P0 Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close three security holes in `firestore.rules` — self-service role escalation, cross-class access to student health/ibadah data by any teacher, and open exposure of the school-wide student roster / cross-class write access to `class_tasks`.

**Architecture:** Single-file change to `firestore.rules`. No JS application code changes. Each fix adds or tightens a rule predicate; two new helper functions (`isBootstrapAdminEmail()`, `isGuruOfStudent()`) are introduced and reused across the sub-collections that share the same vulnerability pattern.

**Tech Stack:** Firestore Security Rules (rules_version '2'), verified locally with the Firebase Emulator Suite via `npx firebase-tools` (already configured in `firebase.json`, no new dependency footprint — nothing is installed into the repo).

## Global Constraints

- Scope is **firestore.rules only**. Do not touch any `.js`/`.html` file.
- Do not run `firebase deploy` at any point in this plan without asking the user for explicit confirmation first — this affects the live shared Firestore project.
- The design doc (`docs/superpowers/specs/2026-07-12-firestore-security-p0-design.md`) is the source of truth for *why*; this plan is the *how*. If anything here conflicts with that doc, the doc wins and the plan should be corrected.
- `ADMIN_EMAILS` in rules must exactly mirror `js/firebase-config.js:31-34` (`admin@tumara.com`, `admin@tumara.id`), lower-cased for comparison.
- No new npm dependencies, no `package.json` added to the repo. Verification uses `npx --yes firebase-tools@latest` (fetched on demand, confirmed working in this environment) against the emulator config already present in `firebase.json`.

---

## Baseline: current `firestore.rules` (for reference)

The file as of this plan's start (106 lines) — every task below modifies specific blocks of this file. Re-read the live file before editing since line numbers shift after each task.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() { ... }
    function isGuru() { ... }

    match /users/{uid} {
      allow read: if ...;
      allow create, update: if request.auth != null && (request.auth.uid == uid || isAdmin());   // <-- Task 1 target
      allow delete: if ...;

      match /{document=**} { allow read, write: if ...; }

      match /ibadah_daily/{id} { allow read: if isGuru(); }   // <-- Task 2 target
      match /quran_log/{id} { allow read: if isGuru(); }      // <-- Task 2 target
      match /hafalan/{id} { allow read: if isGuru(); }        // <-- Task 2 target

      match /health_daily/{id} { allow read: if isGuru(); }   // <-- Task 2 target
      match /workouts/{id} { allow read: if isGuru(); }       // <-- Task 2 target
      match /biometrics/{id} { allow read: if isGuru(); }     // <-- Task 2 target
      match /weights/{id} { allow read: if isGuru(); }        // <-- Task 2 target
      match /meds/{id} { allow read: if isGuru(); }           // <-- Task 2 target
      match /foods/{id} { allow read: if isGuru(); }          // <-- Task 2 target
      match /menstrual/{id} { allow read: if isGuru(); }      // <-- Task 2 target
    }

    match /school_classes/{id} { allow read: if request.auth != null; allow write: if isAdmin(); }
    match /school_roster/{id} { allow read: if request.auth != null; allow write: if isAdmin(); }  // <-- Task 3 target

    match /class_tasks/{id} { allow read: if request.auth != null; allow write: if isGuru(); }      // <-- Task 3 target

    match /class_schedule/{classId} { allow read: if ...; allow write: if isGuru() && ...; }
  }
}
```

---

### Task 1: Lock the `role` field on `users/{uid}` self-writes

**Files:**
- Modify: `firestore.rules:5-27` (add helper function after `isGuru()`, replace the `allow create, update` line)

**Interfaces:**
- Produces: `isBootstrapAdminEmail()` — boolean function, no args, usable anywhere in the rules file. Later tasks do not depend on it.

- [ ] **Step 1: Read the current file to get exact line numbers**

Run: view `firestore.rules` (already read in full during design — lines 1-27 relevant here). Confirm line 27 is still:
```
      allow create, update: if request.auth != null && (request.auth.uid == uid || isAdmin());
```
If the line has shifted, locate it by content, not by number.

- [ ] **Step 2: Add the `isBootstrapAdminEmail()` helper**

Insert immediately after the closing `}` of `isGuru()` (currently ends at line 17), before `match /users/{uid} {`:

```
    // Mirrors js/firebase-config.js ADMIN_EMAILS. Firestore Rules can't
    // import JS, so this list must be kept in sync manually if that file
    // changes. Used only to bootstrap the first admin account(s) server-side
    // instead of trusting the client-side check in js/db.js.
    function isBootstrapAdminEmail() {
      return request.auth != null && request.auth.token.email != null
        && request.auth.token.email.lower() in ['admin@tumara.com', 'admin@tumara.id'];
    }
```

- [ ] **Step 3: Replace the create/update rule**

Replace:
```
      // Menulis profil hanya oleh pemilik atau admin.
      allow create, update: if request.auth != null && (request.auth.uid == uid || isAdmin());
```
With:
```
      // Menulis profil: pemilik boleh membuat/mengubah dokumennya sendiri,
      // TAPI tidak boleh mengubah field `role` sendiri (mencegah privilege
      // escalation) kecuali saat bootstrap admin pertama (email cocok
      // isBootstrapAdminEmail()). Admin boleh menulis apa saja untuk
      // siapa saja (dipakai adminCreateUser() membuat akun guru).
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

- [ ] **Step 4: Boot the emulator to verify the rules file still compiles**

Run:
```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && timeout 25 npx --yes firebase-tools@latest emulators:start --only firestore,auth --project tumara-id 2>&1 | grep -iE "error|compiled|invalid|failed" | head -20
```
Expected: a line containing `rules file firestore.rules compiled successfully` (or equivalent "compiled" wording), and **no** `Error` / `invalid` lines. If it prints a syntax error, fix the rule block from Step 3 and re-run.

- [ ] **Step 5: Manually trace the three scenarios this fix must satisfy**

Walk through the new rule text against each case and confirm the outcome in writing (no live app needed — this is a rules-text trace, not a code run):

1. **Siswa mendaftar sendiri** (`js/views/auth.js:161` → `DB.register({nama, email, password})`, no `role` passed → defaults to `'siswa'` per `db.js:52`). `request.auth.uid == uid` ✓, `request.resource.data.role == 'siswa'` ✓ → **create allowed**. Matches current behavior.
2. **Siswa mencoba `updateUser({role:'admin'})` langsung dari console browser.** `request.auth.uid == uid` ✓, but `request.resource.data.role` (`'admin'`) `!= resource.data.role` (`'siswa'`), and `isBootstrapAdminEmail()` is false for a non-admin email → both branches of the `||` fail → **update denied**. This is the fix.
3. **Login dengan `admin@tumara.com` pertama kali** (`db.js:332-353` bootstrap flow, self-write). Either it's a `create` with `role:'admin'` (`isBootstrapAdminEmail()` true) → allowed, or an `update` on an existing `'siswa'` doc setting `role:'admin'` (`isBootstrapAdminEmail()` true) → allowed. Matches current bootstrap behavior.
4. **Admin creates a guru account** via `adminCreateUser` (`db.js:109-117` / `427-461`) — this writes to a **different** uid than the admin's own, so `request.auth.uid == uid` is false, and the whole expression falls to `isAdmin()` which is unconditionally true for any field → **create allowed**, unaffected by this change.

- [ ] **Step 6: Commit**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && git add firestore.rules && git commit -m "$(cat <<'EOF'
Lock users/{uid}.role against self-service privilege escalation

Split create/update so a signed-in user can no longer set their own
role to anything but 'siswa' (or 'admin' only via the bootstrap-email
allowlist, mirroring js/firebase-config.js ADMIN_EMAILS server-side).
Admin writes to other accounts are unaffected.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Scope teacher read access to health/ibadah data to the student's own class

**Files:**
- Modify: `firestore.rules` — the 10 `match /{collection}/{id} { allow read: if isGuru(); }` blocks inside `match /users/{uid} { ... }` (currently lines 42-74).

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `isGuruOfStudent(studentUid)` — boolean function taking a uid string. Not consumed by later tasks.

- [ ] **Step 1: Add the `isGuruOfStudent()` helper**

Insert it right after `isGuru()` (and after `isBootstrapAdminEmail()` if Task 1 already ran), still before `match /users/{uid} {`:

```
    // Guru hanya boleh membaca data siswa yang classId-nya ada di
    // kelasAmpu miliknya (dipilih guru sendiri lewat UI, lihat
    // js/views/teacher.js DB.user.kelasAmpu). Mencegah guru membaca data
    // kesehatan/ibadah siswa di kelas yang tidak ia ampu.
    function isGuruOfStudent(studentUid) {
      return isGuru()
        && get(/databases/$(database)/documents/users/$(studentUid)).data.get('kelasId', null) != null
        && get(/databases/$(database)/documents/users/$(studentUid)).data.get('kelasId', null) in
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('kelasAmpu', []);
    }
```

- [ ] **Step 2: Replace all 10 `allow read: if isGuru();` blocks**

Find this exact block (currently lines 41-74):
```
      // Guru boleh MEMBACA subkoleksi ibadah siswa (ibadah_daily, quran_log, hafalan) untuk pemantauan.
      match /ibadah_daily/{id} {
        allow read: if isGuru();
      }
      match /quran_log/{id} {
        allow read: if isGuru();
      }
      match /hafalan/{id} {
        allow read: if isGuru();
      }

      // Guru boleh MEMBACA subkoleksi kesehatan siswa untuk pemantauan kesehatan di kelas.
      // Akses read-only; guru tidak boleh mengubah data kesehatan siswa.
      match /health_daily/{id} {
        allow read: if isGuru();
      }
      match /workouts/{id} {
        allow read: if isGuru();
      }
      match /biometrics/{id} {
        allow read: if isGuru();
      }
      match /weights/{id} {
        allow read: if isGuru();
      }
      match /meds/{id} {
        allow read: if isGuru();
      }
      match /foods/{id} {
        allow read: if isGuru();
      }
      match /menstrual/{id} {
        allow read: if isGuru();
      }
```

Replace with (note `uid` is already bound by the enclosing `match /users/{uid}`):
```
      // Guru boleh MEMBACA subkoleksi ibadah siswa (ibadah_daily, quran_log, hafalan)
      // HANYA untuk siswa di kelas yang ia ampu (lihat isGuruOfStudent di atas).
      match /ibadah_daily/{id} {
        allow read: if isGuruOfStudent(uid);
      }
      match /quran_log/{id} {
        allow read: if isGuruOfStudent(uid);
      }
      match /hafalan/{id} {
        allow read: if isGuruOfStudent(uid);
      }

      // Guru boleh MEMBACA subkoleksi kesehatan siswa (termasuk menstrual)
      // HANYA untuk siswa di kelas yang ia ampu. Akses read-only; guru tidak
      // boleh mengubah data kesehatan siswa.
      match /health_daily/{id} {
        allow read: if isGuruOfStudent(uid);
      }
      match /workouts/{id} {
        allow read: if isGuruOfStudent(uid);
      }
      match /biometrics/{id} {
        allow read: if isGuruOfStudent(uid);
      }
      match /weights/{id} {
        allow read: if isGuruOfStudent(uid);
      }
      match /meds/{id} {
        allow read: if isGuruOfStudent(uid);
      }
      match /foods/{id} {
        allow read: if isGuruOfStudent(uid);
      }
      match /menstrual/{id} {
        allow read: if isGuruOfStudent(uid);
      }
```

- [ ] **Step 3: Boot the emulator to verify the rules file still compiles**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && timeout 25 npx --yes firebase-tools@latest emulators:start --only firestore,auth --project tumara-id 2>&1 | grep -iE "error|compiled|invalid|failed" | head -20
```
Expected: `compiled successfully`, no errors. `get()` call budget check: within one document read, this rule chain calls `isGuru()` (1 `get`) + `isGuruOfStudent()` (2 more `get`s) = 3 total, well under Firestore's 10-call-per-request limit — no runtime "too many nested calls" error expected, but confirm the emulator doesn't log any such warning during Step 5's trace.

- [ ] **Step 4: Manually trace the four scenarios this fix must satisfy**

1. **Guru A** has `kelasAmpu: ['10A']`. Siswa S1 has `kelasId: '10A'`. Guru A reads `users/S1/health_daily/*` → `isGuru()` true, `get(users/S1).kelasId` = `'10A'`, `'10A' in ['10A']` → true → **allowed**. Matches current (intended) behavior.
2. **Guru A** (`kelasAmpu: ['10A']`) tries to read `users/S2/menstrual/*` where S2 has `kelasId: '10B'`. `'10B' in ['10A']` → false → **denied**. This is the fix — previously any `isGuru()` account could read this.
3. **Guru B** has no `kelasAmpu` field yet (hasn't picked classes in the UI). `data.get('kelasAmpu', [])` → `[]`, any `kelasId in []` → false → **denied for every student**. Correct deny-by-default; matches design doc's noted trade-off.
4. **Siswa** (role `'siswa'`) tries to read another student's `health_daily`. `isGuru()` is false (role check fails) before `isGuruOfStudent` even reaches the `get` calls → **denied**, unchanged from before.

- [ ] **Step 5: Commit**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && git add firestore.rules && git commit -m "$(cat <<'EOF'
Scope guru read access to health/ibadah data by class membership

Add isGuruOfStudent() and apply it to all 10 previously-unscoped
allow-read blocks (ibadah_daily, quran_log, hafalan, health_daily,
workouts, biometrics, weights, meds, foods, menstrual). A teacher can
now only read a student's data if the student's kelasId is in the
teacher's own kelasAmpu — previously any account with role 'guru'
could read any student's data regardless of class assignment.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Restrict `school_roster` reads and scope `class_tasks` writes to the owning class

**Files:**
- Modify: `firestore.rules` — the `match /school_roster/{id}` block and the `match /class_tasks/{id}` block (currently lines 84-94).

**Interfaces:**
- Consumes: `isGuru()`, `isAdmin()` (already defined). Does not need `isGuruOfStudent()` from Task 2 — this is a class-level check on `classId`, not a per-student one, so it's inlined rather than reusing that helper.
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Replace the `school_roster` block**

Find:
```
    match /school_roster/{id} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
```
Replace with:
```
    // Roster berisi nama + NIS seluruh siswa per kelas — lebih sensitif
    // daripada school_classes (yang cuma nama kelas). Dibatasi ke admin +
    // guru (guru perlu melihat roster untuk memilih kelas yang diampu di
    // UI, js/views/teacher.js:166); siswa tidak boleh membaca roster
    // sekolah secara keseluruhan.
    match /school_roster/{id} {
      allow read: if request.auth != null && (isAdmin() || isGuru());
      allow write: if isAdmin();
    }
```

Note: leave `match /school_classes/{id}` completely untouched — it stays `allow read: if request.auth != null;` because students need it to pick their own class at registration (`js/views/auth.js:264`) and it contains no PII (just class names).

- [ ] **Step 2: Replace the `class_tasks` block**

Find:
```
    // Tugas kelas: dikirim guru (pengampu), diterima siswa. Dibaca semua
    // pengguna terautentikasi; ditulis guru (cakupan kelas dijaga di UI).
    match /class_tasks/{id} {
      allow read: if request.auth != null;
      allow write: if isGuru();
    }
```
Replace with:
```
    // Tugas kelas: dikirim guru (pengampu), diterima siswa. Dibaca semua
    // pengguna terautentikasi (siswa perlu melihat tugas kelasnya). Ditulis
    // HANYA oleh guru yang classId tugasnya ada di kelasAmpu miliknya —
    // sebelumnya guru mana pun bisa menulis/menghapus tugas kelas lain.
    match /class_tasks/{id} {
      allow read: if request.auth != null;
      allow create: if isGuru() &&
        request.resource.data.classId in
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('kelasAmpu', []);
      allow update, delete: if isGuru() &&
        resource.data.classId in
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('kelasAmpu', []);
    }
```

- [ ] **Step 3: Boot the emulator to verify the rules file still compiles**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && timeout 25 npx --yes firebase-tools@latest emulators:start --only firestore,auth --project tumara-id 2>&1 | grep -iE "error|compiled|invalid|failed" | head -20
```
Expected: `compiled successfully`, no errors.

- [ ] **Step 4: Manually trace the five scenarios this fix must satisfy**

1. **Siswa** tries to read `school_roster/*`. `isAdmin()` false, `isGuru()` false → **denied**. Fix confirmed (was previously `request.auth != null` → allowed).
2. **Guru** (any) reads `school_roster/*` to browse classes before picking `kelasAmpu`. `isGuru()` true → **allowed**. Preserves the "browse before choosing" UX noted in the design doc.
3. **Siswa** reads `class_tasks/*` for their own class. `request.auth != null` → **allowed**, unchanged (read scope intentionally left open per design doc's out-of-scope note).
4. **Guru A** (`kelasAmpu: ['10A']`) creates a `class_tasks` doc with `classId: '10A'`. `'10A' in ['10A']` → **allowed**.
5. **Guru A** (`kelasAmpu: ['10A']`) tries to delete a `class_tasks` doc whose `classId` is `'10B'`. `resource.data.classId` (`'10B'`) `in ['10A']` → false → **denied**. This is the fix — previously any `isGuru()` account could delete any class's tasks.

- [ ] **Step 5: Commit**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && git add firestore.rules && git commit -m "$(cat <<'EOF'
Restrict school_roster reads and scope class_tasks writes to owning class

school_roster (student names + NIS) is now readable by admin/guru only,
not every logged-in student. class_tasks create/update/delete now
requires the task's classId to be in the acting teacher's kelasAmpu —
previously any teacher account could write or delete any class's tasks.
school_classes and class_tasks/class_schedule reads are left open on
purpose (low-sensitivity, out of this P0 scope).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Full-file review and deploy confirmation

**Files:**
- Read only: `firestore.rules` (final state after Tasks 1-3).

- [ ] **Step 1: Read the complete final file**

Read the whole `firestore.rules` top to bottom and confirm:
- `isBootstrapAdminEmail()` and `isGuruOfStudent()` are both defined once, near the top, and used consistently.
- No leftover `allow read: if isGuru();` (unscoped) remains anywhere in the file — grep to confirm:
```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && grep -n "isGuru()" firestore.rules
```
Expected: matches only inside the two helper function bodies and the `class_tasks`/`school_roster`/`class_schedule` blocks that intentionally still call `isGuru()` directly (class-level checks, not per-student) — zero bare `allow read: if isGuru();` lines left.

- [ ] **Step 2: Final emulator boot check on the complete file**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && timeout 25 npx --yes firebase-tools@latest emulators:start --only firestore,auth --project tumara-id 2>&1 | tail -30
```
Expected: emulator starts cleanly, rules compile, no errors in the full log (not just grepped lines this time — read it all).

- [ ] **Step 3: Ask the user before deploying**

This step is manual, not automated. Tell the user the three fixes are complete, committed, and locally verified (syntax compiles, all scenario traces pass), and ask explicitly:

> "Semua 3 fix sudah di-commit dan lolos cek sintaks emulator lokal. Mau saya jalankan `firebase deploy --only firestore:rules` sekarang untuk menerapkannya ke Firestore project `tumara-id`, atau kamu yang jalankan sendiri?"

Do **not** run `firebase deploy` without an explicit "ya, deploy" (or equivalent) from the user in this turn — this changes a live shared system's access control and a mistake here can lock out real users.

- [ ] **Step 4 (only after explicit user confirmation): Deploy**

```bash
cd "d:/Project/Web Project/Enuma/Tumara/Tumara" && npx --yes firebase-tools@latest deploy --only firestore:rules --project tumara-id
```
Report the command's output back to the user verbatim (success or failure) — do not paraphrase a failure as a success.

---

## Self-Review Notes

- **Spec coverage:** Fix 1 → Task 1. Fix 2 → Task 2. Fix 3 → Task 3 (both `school_roster` and `class_tasks` sub-items). Testing section of the design doc → Task 4 + the per-task scenario traces. Explicit out-of-scope items (`class_tasks`/`class_schedule` read, P1-P3) → deliberately not touched, called out in Task 3's commit message and Task 4's grep check.
- **Placeholder scan:** every step has literal rule text or literal commands — no "add appropriate checks" language.
- **Type/name consistency:** `isGuruOfStudent(studentUid)` takes one arg and is always called as `isGuruOfStudent(uid)` where `uid` is the path variable bound by the enclosing `match /users/{uid}`, consistently across all 10 call sites in Task 2. `isBootstrapAdminEmail()` takes no args, used identically in both `create` and `update` branches in Task 1.
