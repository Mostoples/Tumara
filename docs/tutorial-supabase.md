# Setup Supabase — Foto Jadwal Mengajar (Halaman Guru)

Panduan ini khusus untuk satu fitur: **guru memotret / mengunggah foto jadwal mengajarnya**
di halaman guru → menu **Jadwal Mengajar**.

Fotonya tidak disimpan di Firestore (Firestore mahal untuk file, dan ada batas 1 MB per
dokumen). Yang terjadi sebenarnya:

```
Guru pilih foto  →  dikompres di peramban  →  diunggah ke Supabase Storage
                                                        ↓
                              Firestore hanya menyimpan URL publiknya
```

| Hal | Nilainya |
|---|---|
| Bucket Supabase | **`jadwal-foto`** |
| Folder di dalam bucket | `jadwal/` |
| Nama file | `jadwal/{timestamp}-{acak}.jpg` |
| Disimpan di Firestore sebagai | `users/{uid}.jadwalFoto = { url, dibuatPada }` |
| Kode pengunggah | [`js/supabase-storage.js`](../js/supabase-storage.js) |
| Kode halaman guru | [`js/views/teacher.js`](../js/views/teacher.js) → `renderJadwal()` |

**Setiap jenis foto punya bucket sendiri.** Foto jurnal mengajar memakai bucket `jurnal-foto`
(itu sudah dibuat terpisah dan tidak dibahas di sini). Foto jadwal memakai `jadwal-foto`.
Pemetaannya ada di `js/supabase-storage.js`:

```js
const BUCKETS = {
  jurnal: 'jurnal-foto',   // foto kegiatan pada Jurnal Mengajar
  jadwal: 'jadwal-foto',   // foto Jadwal Mengajar  ← yang dibahas di sini
};
```

Setup ini **cukup sekali untuk seluruh sekolah** — bukan per guru.

---

## 1. Buat bucket `jadwal-foto`

Kalau project Supabase-nya sudah ada (yang dipakai `jurnal-foto`), **pakai project yang sama**
— tidak perlu bikin project baru. Cukup tambah bucket.

1. Menu kiri → **Storage** → **New bucket**.
2. **Name**: `jadwal-foto` (persis, huruf kecil, pakai tanda hubung).
3. Centang **Public bucket**.

   Ini **wajib**. Foto jadwal ditampilkan lewat `<img src="...">` biasa tanpa login Supabase,
   jadi URL-nya harus bisa dibaca publik. Kalau bucket-nya privat, foto muncul sebagai gambar
   rusak.

4. **Save**.

> **Belum punya project Supabase sama sekali?** Buka <https://supabase.com> → **Sign in** →
> **New project**. Region pilih yang terdekat (**Southeast Asia / Singapore**). Database
> Password diisi apa saja lalu simpan — Tumara **tidak memakai** database Supabase, hanya
> Storage-nya, jadi password itu praktis tak terpakai. Setelah project jadi, lanjut ke
> langkah 1 di atas, lalu isi juga `SUPABASE_URL` dan `SUPABASE_ANON` di
> [langkah 3](#3-cek-sambungan-ke-tumara).

---

## 2. Pasang policy untuk `jadwal-foto`

Bucket publik hanya membuat foto **bisa dibaca**. Untuk **mengunggah** dan **menghapus**,
role `anon` (pengunjung web) butuh policy sendiri. Tanpa ini, guru akan melihat toast merah
*"Gagal mengunggah foto: new row violates row-level security policy"*.

Policy bersifat **per bucket** — policy milik `jurnal-foto` **tidak** berlaku untuk
`jadwal-foto`. Jadi ini harus dijalankan sekali lagi untuk bucket baru.

1. Menu kiri → **SQL Editor** → **New query**.
2. Tempel ini, lalu **Run**:

```sql
-- Siapa pun boleh MELIHAT foto jadwal (agar <img src="..."> bisa memuat gambarnya).
create policy "tumara_jadwal_baca"
on storage.objects for select
to anon
using (bucket_id = 'jadwal-foto');

-- Siapa pun boleh MENGUNGGAH foto jadwal.
create policy "tumara_jadwal_unggah"
on storage.objects for insert
to anon
with check (bucket_id = 'jadwal-foto');

-- Siapa pun boleh MENGHAPUS foto jadwal — dipakai saat guru menekan "Ganti Foto"
-- atau "Hapus": file lama dibuang otomatis supaya tidak menumpuk.
create policy "tumara_jadwal_hapus"
on storage.objects for delete
to anon
using (bucket_id = 'jadwal-foto');
```

Kalau lebih suka lewat tampilan: **Storage → Policies → New policy → For full customization**,
lalu buat tiga policy di atas satu per satu (SELECT, INSERT, DELETE) untuk role `anon`.

### Peringatan keamanan — tolong baca

Policy di atas berarti **siapa pun yang tahu URL project-mu bisa mengunggah dan menghapus
file di bucket itu tanpa login.**

Itu konsekuensi dari arsitektur Tumara: login dipegang **Firebase Auth**, sedangkan file
disimpan di **Supabase**. Supabase tidak tahu siapa yang sedang login di Tumara, jadi ia
tidak bisa membedakan guru asli dari orang lain.

Untuk lingkungan sekolah risikonya masih bisa diterima — paling parah ada yang iseng menaruh
file sampah di bucket. Tapi konsekuensinya jelas: **jangan simpan apa pun yang rahasia di
sana.** Foto jadwal mengajar aman. Ijazah, KTP, atau berkas pribadi siswa **jangan**.

Kalau nanti butuh lebih ketat, jalurnya adalah menyalakan Supabase Auth (atau memakai Edge
Function bertoken) lalu mengganti `to anon` menjadi `to authenticated`. Itu perubahan
arsitektur, bukan sekadar setelan.

---

## 3. Cek sambungan ke Tumara

Buka [`js/supabase-storage.js`](../js/supabase-storage.js). Bagian atasnya:

```js
const SUPABASE_URL  = 'https://xxxxxxxxxxxx.supabase.co';   // Project URL
const SUPABASE_ANON = 'eyJhbGciOi...';                      // anon public key

const BUCKETS = {
  jurnal: 'jurnal-foto',
  jadwal: 'jadwal-foto',
};
```

Kalau `SUPABASE_URL` dan `SUPABASE_ANON` **sudah terisi** (bukan `xxxxxxxx`), berarti Tumara
sudah tersambung — biarkan saja, tidak perlu diubah. Kamu cukup memastikan bucket `jadwal-foto`
ada beserta policy-nya (langkah 1–2).

Kalau masih kosong, ambil nilainya dari **Project Settings → API**:

- **Project URL** → `SUPABASE_URL`
- **Project API keys → `anon` `public`** → `SUPABASE_ANON`

> **`anon key` memang boleh terlihat publik.** Ia dirancang untuk dipakai di peramban dan
> sudah ikut terkirim ke setiap pengunjung — jadi wajar ada di dalam kode.
>
> Yang **tidak boleh** ditaruh di kode adalah **`service_role` key** (ada di halaman yang
> sama). Kunci itu melewati semua policy — kalau bocor, siapa pun bisa menghapus seluruh isi
> Storage. Jangan pernah menempelkannya di sini.

### Urutan script di `guru.html`

Foto jadwal hanya ada di halaman guru, jadi yang perlu dicek cuma `guru.html`. Urutan ini
sudah benar di repo, tapi jangan sampai tertukar:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
...
<script src="js/utils.js"></script>          <!-- menyediakan compressImage() -->
<script src="js/supabase-storage.js"></script>
<script src="js/views/teacher.js"></script>
```

- `supabase-storage.js` **harus setelah** CDN — ia membaca `window.supabase` saat dimuat.
  Kalau terbalik, `Storage.ready()` bernilai `false` dan guru melihat toast
  *"Penyimpanan foto belum siap"*.
- `supabase-storage.js` **harus setelah** `utils.js` — kompresi memakai `compressImage()`
  dari sana.

---

## 4. Uji dari akun guru

Deploy dulu (deploy **penuh**, bukan `--only firestore:rules` — perubahan JS/CSS hanya ikut
naik lewat deploy hosting):

```bash
firebase deploy
```

Lalu masuk sebagai guru dan buka menu **Jadwal Mengajar**:

1. **Unggah Foto** → pilih gambar jadwal dari galeri.
   Muncul toast *"Mengunggah foto jadwal…"*, lalu *"Foto jadwal tersimpan 📸"*, dan fotonya
   tampil beserta tanggal unggah.
2. **Buka Kamera** → **Ambil Foto**.
   Kamera belakang diutamakan (untuk memotret kertas jadwal), dan ada tombol **Balik Kamera**.

   > Kamera butuh **HTTPS**. Jalan di `tumara-id.web.app` dan di `localhost`, **tidak jalan**
   > kalau halaman dibuka lewat `http://` biasa atau `file://`.

3. Ketuk fotonya → tampil ukuran penuh, bisa diperbesar untuk membaca jam & kelas.
4. Buka **Supabase → Storage → `jadwal-foto` → folder `jadwal/`** → ada file `.jpg` baru.
   Pastikan mendarat di `jadwal-foto`, **bukan** di `jurnal-foto`.
5. Tekan **Ganti Foto** → foto baru masuk, **file lama otomatis terhapus** dari Storage.

   Urutannya sengaja: foto lama baru dibuang **setelah** foto baru tersimpan, supaya kalau
   koneksi putus di tengah jalan, guru tidak berakhir tanpa foto sama sekali.

---

## Foto jadwal yang terlanjur masuk ke `jurnal-foto`

Dulu foto jadwal ikut menumpang di bucket `jurnal-foto` (folder `jadwal/`). Kalau sudah ada
guru yang mengunggah sebelum pemisahan ini, **tidak ada yang perlu kamu lakukan**:

- Foto lama **tetap tampil**, karena URL-nya menunjuk `jurnal-foto` yang masih publik.
- Foto lama **tetap bisa diganti/dihapus**. `deleteByUrl()` membaca nama bucket **dari URL
  foto itu sendiri**, bukan dari `BUCKETS` — jadi ia tahu harus menghapus ke bucket lama.
- Begitu guru menekan **Ganti Foto**, file lama terhapus dari `jurnal-foto` dan yang baru
  mendarat di `jadwal-foto`. Perpindahannya terjadi sendiri, sambil jalan.

Jangan menghapus bucket `jurnal-foto` — ia masih dipakai foto jurnal mengajar.

---

## Kalau gagal

Pesan di tabel ini adalah toast yang benar-benar muncul di aplikasi.

| Yang terlihat guru | Sebabnya | Perbaikannya |
|---|---|---|
| *"Gagal mengunggah foto: Bucket not found"* | Bucket `jadwal-foto` belum dibuat | Ulangi **langkah 1**. Cek ejaannya — harus persis `jadwal-foto` |
| *"Gagal mengunggah foto: new row violates row-level security policy"* | Policy INSERT untuk `jadwal-foto` belum dipasang. Sering terjadi karena mengira policy `jurnal-foto` sudah cukup — padahal policy berlaku **per bucket** | Ulangi **langkah 2** |
| *"Penyimpanan foto belum siap. Cek koneksi lalu muat ulang halaman."* | CDN `@supabase/supabase-js` gagal dimuat → `window.supabase` kosong | Cek koneksi / pemblokir iklan. Pastikan tag `<script>` CDN ada **sebelum** `supabase-storage.js` (langkah 3) |
| Foto terunggah, tapi yang tampil gambar rusak | Bucket `jadwal-foto` belum **Public** | Storage → bucket → **Make public**, atau pasang policy SELECT (langkah 2) |
| *"Berkas itu bukan gambar."* | File yang dipilih bukan gambar (mis. PDF) | Pilih `.jpg` / `.png`. Jadwal berbentuk PDF harus difoto atau di-*screenshot* dulu |
| *"Izin kamera ditolak. Aktifkan lewat ikon gembok di bilah alamat."* | Izin kamera diblokir peramban | Klik ikon gembok di bilah alamat → izinkan Kamera → muat ulang |
| *"Tidak ada kamera di perangkat ini. Pakai tombol Unggah Foto."* | Perangkat memang tanpa kamera (mis. PC desktop) | Pakai **Unggah Foto** |
| *"Peramban ini tidak bisa membuka kamera. Pakai tombol Unggah Foto."* | `getUserMedia` tidak tersedia — hampir selalu karena halaman dibuka lewat **http://**, bukan https | Buka lewat `https://` atau `localhost` |

---

## Ukuran file & batasan gratis

Foto dikompres di peramban **sebelum** diunggah (`compressImage` di `js/utils.js`):

| | Sisi terpanjang | Kualitas | Hasil |
|---|---|---|---|
| Foto jadwal | 1800 px | 0.82 | ~300–500 KB |
| Foto jurnal | 1000 px | 0.60 | ~80–150 KB |

Foto jadwal sengaja dibuat lebih besar daripada foto jurnal: tulisan jam dan nama kelas di
jadwal harus tetap terbaca saat gurunya memperbesar gambar.

Paket gratis Supabase: **1 GB penyimpanan** dan **2 GB bandwidth/bulan**
(per Juli 2026 — cek halaman *Pricing* untuk angka terbaru). Kuota itu **untuk seluruh
project**, bukan per bucket — jadi `jadwal-foto` dan `jurnal-foto` berbagi jatah yang sama.

Hitungan kasarnya untuk 80 guru, masing-masing satu foto jadwal ~400 KB:

- Penyimpanan: **~32 MB**. Jauh di bawah 1 GB — dan tidak bertambah, karena foto lama
  terhapus setiap kali diganti.
- Bandwidth: tiap kali guru membuka menu Jadwal Mengajar, fotonya diunduh ulang
  (`cacheControl` 1 jam, jadi tidak tiap kali *refresh*). 80 guru × 400 KB × beberapa kali
  sehari masih jauh di bawah 2 GB/bulan.

Penyimpanan bukan masalah di skala ini. Yang perlu diawasi kalau nanti fiturnya meluas
(misal setiap siswa mengunggah foto) adalah **bandwidth**, bukan kapasitas.
