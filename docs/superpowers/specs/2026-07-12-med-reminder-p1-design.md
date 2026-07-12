# Desain: Perbaikan P1 — Reminder Obat Nyata

**Tanggal:** 2026-07-12
**Sumber:** `spec-compliance-report.md`, bagian P1 ("Klaim palsu di UI"), item terkait `health.js:274`.
**Scope:** `js/app.js`, `js/views/health.js`, `js/views/profile.js`. Tidak ada perubahan skema data baru (memakai koleksi `meds` yang sudah ada).

## Latar Belakang

Audit menemukan disclaimer di `health.js:274` menjanjikan "Pengingat tampil sebagai notifikasi saat aplikasi terbuka" untuk jadwal obat — tapi tidak ada satu pun scheduler yang membaca `med.waktu`. Satu-satunya reminder nyata di aplikasi adalah pengingat minum air (`App.startWaterReminder()`, `app.js:247-255`), berbasis `setInterval` + `App.notify()` (Notification API dengan fallback toast).

Item lain yang tadinya masuk P1 sudah diverifikasi **bukan bug**: tombol "Buka Mushaf Lengkap + Audio Murrotal (quran.com)" di `ibadah.js:522` eksplisit menandai dirinya link keluar lewat suffix "(quran.com)" — bukan klaim fitur in-app. Dicoret dari scope.

Ditemukan juga: `Notification.requestPermission()` sudah dipanggil di kode (`profile.js:272`), tapi **hanya** di dalam toggle pengingat minum di halaman Profil — reminder obat tidak punya jalur minta izin sendiri.

## Fix — `startMedReminder()` di `app.js`

Tambah tiga fungsi baru, ditempatkan setelah `stopWaterReminder()` (`app.js:257-259`):

```js
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
```

**Alasan desain:**
- Tidak ada cache manual — tiap tick (30 detik) fetch ulang `DB.list('meds')`, konsisten dengan gaya kode lain di repo yang tidak melakukan caching (mis. `App.refresh()` selalu fetch ulang semua data). Menghindari plumbing tambahan untuk invalidasi cache di setiap tempat `meds` diubah (`health.js` add/edit/delete/take).
- `this._medNotified` (in-memory `Set`, key `${medId}_${jam}_${tanggal}`) mencegah notifikasi berulang tiap 30 detik selama menit yang sama masih berjalan.
- Kalau dosis sudah ditandai "diminum" (`riwayat[today]` sudah berisi jam tsb) sebelum jamnya lewat, tidak dinotifikasi.
- **Batasan yang disadari, tidak ditambal:** status "sudah dinotifikasi" hanya di memori. Refresh tab persis di menit yang sama dengan jadwal bisa memicu notifikasi dobel sekali. Kasus langka, tidak sepadan ditambal dengan state tersimpan di DB untuk P1 ini.
- Sama seperti reminder air, reminder ini **hanya jalan selagi tab aplikasi terbuka** (bukan background push/service worker) — batasan lama yang sudah ada, bukan regresi baru.

## Fix — pemanggilan otomatis & siklus hidup

**`app.js`**, baris 115 (`if (u.reminderAir) this.startWaterReminder();`) — tambah baris setelahnya:
```js
this.startMedReminder();
```
Dipanggil tanpa syarat (tidak ada toggle terpisah seperti `reminderAir`) — reminder obat otomatis aktif begitu user punya minimal satu obat dengan jadwal jam, mengikuti keberadaan data `meds` itu sendiri, bukan preferensi terpisah yang perlu dinyalakan manual.

**`profile.js`**, di handler logout (baris 311-316), tambah `App.stopMedReminder()` di sebelah `App.stopWaterReminder()` yang sudah ada:
```js
$('#pfLogout', el).onclick = async () => {
  if (!await confirmDialog(...)) return;
  App.stopWaterReminder();
  App.stopMedReminder();
  await DB.logout();
  App.showAuth();
};
```

## Fix — minta izin notifikasi saat menambah jadwal obat

**`health.js`**, di `_medModal()` handler `#mSave` (baris 306-316) — setelah menyimpan data obat, kalau ada jadwal jam (`waktu.length > 0`) dan izin notifikasi belum ditentukan, minta izin (meniru pola di `profile.js:270-272`):

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

## Fix — disclaimer jujur

**`health.js:274`**, ganti teks disclaimer dari klaim yang tidak didukung kode menjadi deskripsi akurat perilaku baru:

Sebelum:
> "Pengingat tampil sebagai notifikasi saat aplikasi terbuka. Selalu ikuti anjuran dosis dari dokter/apoteker."

Sesudah:
> "Pengingat dicek tiap 30 detik & tampil sebagai notifikasi selama aplikasi ini terbuka di tabmu (tidak berjalan di latar belakang). Selalu ikuti anjuran dosis dari dokter/apoteker."
> (EN: "Reminders are checked every 30 seconds and appear as a notification while this app is open in your tab (not in the background). Always follow dosage advice from your doctor/pharmacist.")

## Testing

Tidak ada test framework otomatis di repo ini (dikonfirmasi saat P0). Verifikasi manual di browser:
1. Tambah obat dengan jam beberapa menit ke depan dari waktu saat ini → dialog izin notifikasi browser harus muncul (kalau belum pernah diizinkan).
2. Izinkan notifikasi → tunggu sampai jam terjadwal tiba → notifikasi browser harus muncul dalam 30 detik dari jam tsb.
3. Tandai obat "sudah diminum" sebelum jamnya lewat → notifikasi tidak muncul saat jamnya tiba.
4. Logout → buka DevTools, konfirmasi `App._medReminderId` jadi `null` (interval berhenti).
5. Tolak izin notifikasi → saat jam tiba, toast in-app muncul sebagai fallback (bukan diam saja).
