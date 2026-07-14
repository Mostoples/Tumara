# Setup Supabase Storage — Tumara

Tumara memakai **Supabase Storage** hanya untuk menyimpan **file foto**. Semua data lain
(akun, jurnal, absensi, nilai, tugas) tetap di **Firestore**; yang dicatat di Firestore
cuma **URL publik** hasil unggahan.

Foto yang disimpan di sini:

| Fitur | Folder di bucket | Disimpan di Firestore sebagai |
|---|---|---|
| Foto kegiatan pada Jurnal guru | `jurnal/` | `journals/{id}.foto` |
| Foto Jadwal Mengajar guru | `jadwal/` | `users/{uid}.jadwalFoto.url` |

Kode yang mengurusnya: [`js/supabase-storage.js`](../js/supabase-storage.js).

Setup di bawah ini **cukup sekali** untuk seluruh sekolah — bukan per guru.

---

## 1. Buat project Supabase

1. Masuk ke <https://supabase.com> → **Sign in** (bisa dengan akun GitHub).
2. **New project**.
   - **Name**: `tumara` (bebas).
   - **Database Password**: isi apa saja, simpan. Tumara **tidak** memakai database Supabase,
     jadi password ini praktis tak terpakai — tapi Supabase tetap memintanya.
   - **Region**: pilih yang paling dekat, mis. **Southeast Asia (Singapore)**.
3. Tunggu 1–2 menit sampai project selesai dibuat.

---

## 2. Buat bucket penyimpanan foto

1. Menu kiri → **Storage** → **New bucket**.
2. **Name**: `jurnal-foto`

   > Namanya memang `jurnal-foto` walaupun sekarang juga menyimpan foto jadwal —
   > satu bucket dipakai bersama, dibedakan lewat folder. Kalau kamu ganti namanya,
   > ubah juga `SUPABASE_BUCKET` di `js/supabase-storage.js`.

3. Centang **Public bucket**. Ini **wajib**: foto ditampilkan lewat `<img src="...">`
   tanpa login Supabase, jadi URL-nya harus bisa dibaca publik.
4. **Save**.

---

## 3. Pasang policy (izin akses)

Bucket publik hanya membuat foto **bisa dibaca**. Untuk **mengunggah** dan **menghapus**,
role `anon` (pengunjung web) perlu policy sendiri — tanpa ini, unggah akan gagal dengan
pesan *"new row violates row-level security policy"*.

Cara tercepat lewat SQL:

1. Menu kiri → **SQL Editor** → **New query**.
2. Tempel ini, lalu **Run**:

```sql
-- Siapa pun boleh MELIHAT foto di bucket jurnal-foto (bucket-nya publik).
create policy "tumara_baca_foto"
on storage.objects for select
to anon
using (bucket_id = 'jurnal-foto');

-- Siapa pun boleh MENGUNGGAH foto ke bucket jurnal-foto.
create policy "tumara_unggah_foto"
on storage.objects for insert
to anon
with check (bucket_id = 'jurnal-foto');

-- Siapa pun boleh MENGHAPUS foto di bucket jurnal-foto
-- (dipakai saat guru mengganti / menghapus foto jurnal & jadwal).
create policy "tumara_hapus_foto"
on storage.objects for delete
to anon
using (bucket_id = 'jurnal-foto');
```

Kalau lebih suka lewat tampilan: **Storage → Policies → New policy → For full customization**,
lalu buat tiga policy di atas satu per satu (SELECT, INSERT, DELETE) untuk role `anon`.

### Peringatan keamanan — baca ini

Policy di atas berarti **siapa pun yang tahu URL project-mu bisa mengunggah dan menghapus
file di bucket itu**, tanpa perlu login. Itu konsekuensi memakai Supabase hanya sebagai
penyimpanan file, sementara login-nya dipegang Firebase Auth — Supabase tidak tahu siapa
yang sedang login di Tumara.

Risikonya bisa diterima untuk pemakaian di lingkungan sekolah (paling parah: ada yang iseng
menaruh file sampah di bucket), tapi **jangan simpan apa pun yang bersifat rahasia di sana**.
Foto jurnal dan foto jadwal aman-aman saja; ijazah, KTP, atau berkas pribadi siswa **jangan**.

Kalau nanti perlu lebih ketat, jalurnya adalah menyalakan Supabase Auth (atau memakai
Edge Function bertoken) lalu mengubah `to anon` menjadi `to authenticated` — ini perubahan
arsitektur, bukan sekadar setelan.

---

## 4. Sambungkan ke Tumara

Buka [`js/supabase-storage.js`](../js/supabase-storage.js), sesuaikan tiga baris teratas:

```js
const SUPABASE_URL    = 'https://xxxxxxxxxxxx.supabase.co';   // Project URL
const SUPABASE_ANON   = 'eyJhbGciOi...';                      // anon public key
const SUPABASE_BUCKET = 'jurnal-foto';                        // nama bucket
```

Kedua nilai pertama diambil dari: **Project Settings → API**

- **Project URL** → `SUPABASE_URL`
- **Project API keys → `anon` `public`** → `SUPABASE_ANON`

> **`anon key` memang boleh terlihat publik** — ia dirancang untuk dipakai di sisi peramban,
> dan sudah ikut terkirim ke setiap pengunjung. Yang **tidak boleh** ditaruh di kode adalah
> **`service_role` key** (ada di halaman yang sama). Kunci itu melewati semua policy — kalau
> bocor, siapa pun bisa menghapus seluruh isi Storage. Jangan pernah menempelkannya di sini.

Library Supabase-nya dimuat lewat CDN di `guru.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-storage.js"></script>
```

Urutannya penting — `supabase-storage.js` harus setelah CDN, karena ia membaca
`window.supabase` saat dimuat.

---

## 5. Terapkan & uji

```bash
firebase deploy
```

Deploy **penuh** (bukan `--only firestore:rules`) — perubahan JS/CSS hanya ikut naik lewat
deploy hosting.

Lalu uji dari akun guru:

1. **Jadwal Mengajar** → **Unggah Foto** → pilih gambar → foto muncul di halaman.
2. **Buka Kamera** → **Ambil Foto** → foto tersimpan.
   Kamera butuh **HTTPS** — jalan di `tumara-id.web.app` dan `localhost`, **tidak** jalan
   kalau dibuka lewat `http://` biasa atau `file://`.
3. Cek di **Supabase → Storage → jurnal-foto** → folder `jadwal/` berisi file `.jpg` baru.
4. Tekan **Ganti Foto** → file lama otomatis terhapus dari Storage, file baru muncul.

---

## Kalau gagal

| Gejala | Sebabnya | Perbaikannya |
|---|---|---|
| Toast *"Penyimpanan foto belum siap"* | CDN `@supabase/supabase-js` gagal dimuat → `window.supabase` kosong | Cek koneksi / pemblokir iklan; pastikan tag `<script>` CDN ada **sebelum** `supabase-storage.js` |
| *"new row violates row-level security policy"* | Policy INSERT belum dipasang | Ulangi **langkah 3** |
| Foto terunggah tapi gambarnya kosong / 400 | Bucket belum **Public** | Storage → bucket → **Make public**, atau pasang policy SELECT |
| *"Bucket not found"* | Nama bucket beda dengan `SUPABASE_BUCKET` | Samakan nama bucket dengan isi `js/supabase-storage.js` |
| Tombol **Buka Kamera** menampilkan *"Izin kamera ditolak"* | Izin kamera diblokir peramban | Klik ikon gembok di bilah alamat → izinkan Kamera → muat ulang |
| *"Tidak ada kamera di perangkat ini"* | Perangkat memang tanpa kamera (mis. PC desktop) | Pakai **Unggah Foto** |

---

## Batasan gratis

Paket gratis Supabase: **1 GB penyimpanan** dan **2 GB bandwidth/bulan** (per Juli 2026 —
cek halaman *Pricing* untuk angka terbaru).

Foto dikompres dulu di peramban sebelum diunggah (lihat `compressImage` di `js/utils.js`):

- Foto jurnal → sisi terpanjang 1000 px, kualitas 0.6 → sekitar **80–150 KB**.
- Foto jadwal → sisi terpanjang 1800 px, kualitas 0.82 → sekitar **300–500 KB**
  (sengaja lebih besar supaya tulisan jam & kelas di jadwal tetap terbaca saat diperbesar).

Kasarnya, 1 GB cukup untuk ribuan foto jurnal. Yang perlu diawasi justru **bandwidth**:
tiap kali halaman jurnal dibuka, semua fotonya diunduh ulang oleh peramban.
