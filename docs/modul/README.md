# Modul: Membangun Tumara dari Nol

> Panduan bertahap membangun **Tumara** — aplikasi web pendamping siswa
> (kesehatan, produktivitas, keuangan, ibadah) beserta portal **Guru** dan panel
> **Admin** — memakai HTML, CSS, JavaScript, dan Firebase.

Modul ini ditulis untuk **guru yang baru mulai belajar pemrograman**. Anda tidak
perlu pengalaman ngoding sebelumnya. Yang Anda perlukan hanya laptop, koneksi
internet, dan kesediaan mengetik ulang kode sambil memahaminya.

Di akhir modul, Anda punya aplikasi yang benar-benar hidup di internet, dipakai
siswa lewat HP mereka, dan Anda paham setiap bagiannya karena Anda yang
membangunnya.

---

## Kenapa belajar lewat aplikasi nyata?

Kebanyakan tutorial berhenti di aplikasi to-do list. Tumara berbeda: ini aplikasi
sekolah sungguhan, dengan masalah sungguhan — tiga jenis pengguna dengan hak
berbeda, absensi yang tak boleh ganda, nilai dengan KKM, data pribadi siswa yang
harus dijaga, dan kuota gratis Firebase yang harus dihemat.

Masalah-masalah itulah yang mengajari Anda. Modul ini banyak berhenti untuk
bertanya **"kenapa begini, bukan begitu?"** — karena di situlah pemrograman
sebenarnya terjadi.

---

## Peta modul

Kerjakan berurutan. Setiap bab menghasilkan sesuatu yang bisa dilihat, dan
menjadi pijakan bab berikutnya.

### Bagian 1 — Fondasi

| Bab | Judul | Hasil |
|---|---|---|
| 01 | [Pengenalan & Persiapan](01-pengenalan-dan-persiapan.md) | Alat terpasang, folder proyek siap, halaman pertama tampil di browser |
| 02 | [Fondasi Web & Struktur Proyek](02-fondasi-web-dan-struktur-proyek.md) | Paham HTML/CSS/JS secukupnya + rencana arsitektur Tumara |
| 03 | [Halaman Depan & Sistem Desain](03-halaman-depan-dan-desain.md) | `index.html` + `css/style.css`: tema terang/gelap, kartu, tombol |

### Bagian 2 — Data & Identitas

| Bab | Judul | Hasil |
|---|---|---|
| 04 | [Menyiapkan Firebase](04-menyiapkan-firebase.md) | Proyek Firebase aktif: Authentication + Cloud Firestore |
| 05 | [Lapisan Data `db.js`](05-lapisan-data-db-js.md) | Satu pintu data untuk seluruh aplikasi + mode offline |
| 06 | [Masuk, Daftar & Peran](06-masuk-daftar-dan-peran.md) | Siswa masuk pakai nama + NIS; tiap peran diarahkan ke halamannya |

### Bagian 3 — Aplikasi Siswa

| Bab | Judul | Hasil |
|---|---|---|
| 07 | [Kerangka Aplikasi Siswa](07-kerangka-aplikasi-siswa.md) | `app.html`: sidebar, bottom-nav, router, tema |
| 08 | [Membuat View Pertama](08-membuat-view-pertama.md) | Beranda siswa + "kontrak view" yang dipakai seluruh aplikasi |
| 09 | [Fitur-Fitur Siswa](09-fitur-fitur-siswa.md) | Tugas, kesehatan, keuangan, ibadah — satu pola CRUD berulang |

### Bagian 4 — Sekolah

| Bab | Judul | Hasil |
|---|---|---|
| 10 | [Portal Guru](10-portal-guru.md) | Kelas, absensi per-mapel, penilaian ber-KKM, jurnal, tugas kelas |
| 11 | [Panel Admin](11-panel-admin.md) | Buat akun guru/siswa, daftar kelas, impor massal dari Excel |
| 12 | [Aturan Keamanan](12-aturan-keamanan.md) | `firestore.rules`: siapa boleh baca/tulis apa — penjaga yang sebenarnya |

### Bagian 5 — Rilis

| Bab | Judul | Hasil |
|---|---|---|
| 13 | [Menjadikan PWA](13-menjadikan-pwa.md) | Bisa dipasang di HP, jalan saat offline, auto-perbarui versi |
| 14 | [Deploy & Pemeliharaan](14-deploy-dan-pemeliharaan.md) | Aplikasi hidup di internet + kebiasaan merawatnya |
| 15 | [Referensi](15-referensi.md) | Kamus API `db.js`, model data, glosarium, batasan yang diketahui |

---

## Cara memakai modul ini

**Ketik ulang kodenya, jangan salin-tempel.** Jari yang mengetik mengingat apa
yang mata lewatkan. Salah ketik lalu memperbaikinya adalah cara tercepat paham.

**Kerjakan bagian "✅ Cek hasil".** Setiap bab diakhiri cara memastikan hasilnya
benar. Jangan lanjut sebelum itu hijau — kesalahan kecil yang dibiarkan akan
menumpuk dan jadi sulit dilacak tiga bab kemudian.

**Baca bagian "🧯 Kalau macet".** Isinya masalah nyata yang benar-benar terjadi
saat Tumara dibangun, bukan karangan.

**Boleh berbeda.** Kalau Anda ingin aplikasi Anda bernama lain, berwarna lain,
atau punya fitur lain — silakan. Modul ini mengajarkan cara berpikirnya; Tumara
hanya contoh kasusnya.

## Berapa lama?

Sekitar **25–35 jam** total kalau dikerjakan sungguhan berikut latihannya.
Nyaman dicicil satu bab per sesi (1–2 jam). Jangan diborong semalam.

## Yang perlu disiapkan

- Laptop (Windows, macOS, atau Linux) dengan RAM 4 GB ke atas
- Koneksi internet
- Akun Google (untuk Firebase)
- Waktu tenang 1–2 jam per sesi

Semua perangkat lunaknya gratis. Firebase punya kuota gratis yang cukup untuk
satu sekolah — Bab 05 dan 14 membahas cara tetap di dalam kuota itu.

## Kalau tersesat

Kode lengkap yang sudah jadi ada di repositori ini. Kalau bab terasa buntu,
bandingkan punya Anda dengan file aslinya — tapi baru **setelah** Anda mencoba
sendiri.

Dokumen pendamping:

- [`../../README.md`](../../README.md) — ringkasan fitur Tumara yang sudah jadi
- [`../../Rancangan-Web-App-Tumara.md`](../../Rancangan-Web-App-Tumara.md) — rancangan awal
- [`../tutorial-supabase.md`](../tutorial-supabase.md) — penyimpanan foto (dipakai di Bab 10)

---

**Mulai:** [Bab 01 — Pengenalan & Persiapan](01-pengenalan-dan-persiapan.md)
