# Rancangan Web App — **Tumara**

> Dokumen rancangan (blueprint) untuk aplikasi produktivitas & wellness siswa.
> Disusun dari catatan konsep "APK Projek Siswa".
> Versi: draf 1.0

---

## 1. Ringkasan Proyek

**Tumara** adalah *web app* pendamping harian siswa yang menyatukan tiga pilar kehidupan pelajar dalam satu tempat: **kesehatan & kebugaran**, **produktivitas**, dan **keuangan**. Alih-alih memakai 3–4 aplikasi berbeda (kalkulator kalori, aplikasi catatan, pencatat keuangan), siswa cukup membuka satu aplikasi yang membantu menjaga *tubuh, pikiran, dan dompet* tetap seimbang.

Nilai jual utamanya bukan sekadar "banyak fitur", tetapi **keseimbangan**: setiap pagi siswa melihat satu ringkasan — kalori hari ini, tugas yang jatuh tempo, dan sisa uang jajan — dari satu layar.

---

## 2. Nama Proyek

### Rekomendasi utama: **Tumara** ⭐

| Aspek | Keterangan |
|---|---|
| Asal | Bentukan dari kata **"tumbuh"** — makna: bertumbuh, berkembang menjadi versi diri yang lebih baik. |
| Kenapa cocok | Sesuai inti aplikasi (pengembangan diri siswa), netral, mudah diucapkan, dan enak dijadikan merek. |
| Keunikan | **Belum ditemukan aplikasi/produk/bisnis** dengan nama ini saat pengecekan — kata bentukan, jadi risiko tabrakan paling kecil. |
| Tagline | *"Tumbuh sehat, produktif, terarah."* |

### Alternatif yang juga sudah dicek

| Nama | Makna / asal | Status pengecekan |
|---|---|---|
| **Larasa** | Dari *selaras* (harmoni, keseimbangan) | Bersih — tidak ada aplikasi bernama sama (hanya nama orang "Larasati", beda kata). |
| **Imbaya** | Bentukan dari *imbang* (seimbang) | Kata bentukan; kemungkinan besar belum dipakai. Cek final sebelum daftar domain. |
| **Rasadaya** | *rasa* + *daya* (perasaan + energi/kekuatan) | Kata bentukan; kemungkinan besar belum dipakai. Cek final sebelum daftar domain. |

### Nama yang sebaiknya DIHINDARI (sudah dipakai orang lain)

- **Sadana** → dipakai aplikasi gadai syariah (dan ini bidang keuangan — berisiko rancu).
- **Arunika** → dipakai banyak pihak: software house, AI company, jaringan kafe.
- **Selarasa** → dipakai beberapa bisnis kuliner/kafe.
- **Seimbang / Selaras** → kata umum, besar kemungkinan sudah dipakai dan sulit di-*branding*.

> **Catatan jujur:** tidak ada cara memastikan 100% sebuah nama "belum pernah dipakai siapa pun di dunia". Yang bisa dijamin adalah: nama-nama rekomendasi di atas **bersih dari aplikasi/merek yang aktif** saat dicek. Sebelum benar-benar dipakai, lakukan langkah final: cek ketersediaan domain (`.com` / `.id`), cek nama di Google Play & App Store, dan (kalau serius) cek merek di **PDKI DJKI** (pdki-indonesia.dgip.go.id).

Untuk sisa dokumen ini, nama **Tumara** dipakai sebagai contoh.

---

## 3. Analisis Ide (dari catatan)

Catatan aslimu sudah punya struktur yang bagus: tiga menu besar, masing-masing dengan sub-fitur. Beberapa temuan penting dari analisis:

1. **Ini "super-app", bukan aplikasi satu-fungsi.** Kekuatannya ada di integrasi tiga pilar. Tantangannya: jangan sampai fiturnya terlalu banyak sehingga tidak ada yang selesai. → Solusi: bertahap (lihat Roadmap).
2. **Modul Produktivitas ingin fleksibel.** Catatanmu menulis "ditambahkan sesuai masing² individu" + "kalo bisa ada template". Ini mengarah ke sistem berbasis **template & widget** — mirip Notion versi ringan untuk siswa.
3. **Ada fitur guru (absensi) di dalam aplikasi siswa.** Ini keputusan *scope* paling besar: apakah aplikasi ini **satu sisi (siswa saja)** atau **dua sisi (siswa + guru)**? (Lihat bagian 4.)
4. **Materi gizi "4 sehat 5 sempurna"** sebaiknya diperbarui ke pedoman gizi terbaru **"Isi Piringku"** (Kemenkes) agar akurat dan kekinian.
5. **Fitur "kadar gaya hidup sehat" (merokok & miras)** sebaiknya dibingkai **positif** (membangun kebiasaan sehat, hitung *streak* hari bebas rokok/miras) — bukan menghakimi. Ini justru pesan pro-kesehatan yang kuat untuk siswa.

---

## 4. Target Pengguna & Keputusan Scope

**Pengguna utama:** siswa (SMP/SMA/SMK), rentang usia ± 12–18 tahun.

**Keputusan penting yang harus diambil sebelum mulai:**

- **Opsi A — Siswa saja (disarankan untuk awal).** Semua fitur berpusat pada satu siswa. Fitur "absensi/kegiatan guru" diubah jadi "**jadwal & catatan kelas**" milik siswa (bukan sistem absensi resmi sekolah). Lebih sederhana, cepat jadi.
- **Opsi B — Dua sisi (siswa + guru).** Ada akun guru yang bisa membuat kelas, mengisi presensi, dan berbagi tugas ke siswa. Jauh lebih kuat, tapi butuh sistem peran (role), relasi kelas–siswa, dan waktu pengerjaan 2–3× lipat.

> Rekomendasi: **mulai dari Opsi A**, siapkan struktur data yang tidak menghalangi Opsi B di masa depan.

**Catatan karena penggunanya remaja (dan sebagian bisa di bawah 18):**
Modul kesehatan menyentuh kalori, berat badan, dan pola makan. Untuk kelompok usia ini, rancang dengan **bertanggung jawab**: fokus pada kebiasaan sehat, hindari tekanan menurunkan berat badan, hindari menampilkan target kalori ekstrem, dan berikan bingkai positif ("cukup istirahat", "cukup minum") daripada angka yang bisa memicu pola makan tidak sehat. Sertakan disclaimer bahwa aplikasi bukan pengganti nasihat tenaga kesehatan.

---

## 5. Arsitektur Informasi (Struktur Menu)

```
Tumara
├── Beranda (Dashboard)            → ringkasan tiga pilar
│
├── Kesehatan & Kebugaran
│   ├── Kalkulator makanan seimbang
│   │   ├── Perhitungan kalori (BMR/TDEE)
│   │   ├── Berat badan ideal (BMI)
│   │   └── Saran menu (Isi Piringku)
│   ├── Siklus tidur (kalkulator jam tidur)
│   ├── Pengingat minum (water reminder)
│   ├── Olahraga (log & target)
│   └── Skor gaya hidup sehat (streak bebas rokok/miras)
│
├── Produktivitas
│   ├── Catatan (Note)
│   ├── Rencana belajar (tugas, deadline, jadwal)
│   ├── Kelas & jadwal  (absensi/kegiatan → versi siswa)
│   ├── Timer fokus (Pomodoro)
│   └── Template & widget custom  (+)
│
├── Keuangan
│   ├── Pemasukan & pengeluaran
│   ├── Kategori
│   ├── Target menabung
│   └── Laporan (grafik mingguan/bulanan)
│
└── Profil & Pengaturan
    ├── Data diri (nama, usia, sekolah)
    ├── Notifikasi
    └── Tema (terang/gelap)
```

**Navigasi yang disarankan:** sidebar kiri (desktop) / bottom-tab (mobile) dengan 4 ikon utama — **Beranda, Kesehatan, Produktivitas, Keuangan** — plus akses Profil di pojok.

---

## 6. Rincian Fitur per Modul

### 6.1 Beranda (Dashboard)

Layar pertama setelah login. Menampilkan **kartu ringkasan** dari tiap pilar:

- Kartu Kesehatan: kalori hari ini vs target, status minum, jam tidur semalam.
- Kartu Produktivitas: 3 tugas terdekat + jumlah tugas hari ini.
- Kartu Keuangan: sisa saldo bulan ini + progres target menabung.
- (Opsional) **Skor Keseimbangan**: satu angka/indikator gabungan tiga pilar sebagai *hook* harian.

### 6.2 Kesehatan & Kebugaran

| Fitur | Cara kerja singkat | Data yang dibutuhkan |
|---|---|---|
| Perhitungan kalori | Hitung BMR (rumus Mifflin-St Jeor) → dikali faktor aktivitas = TDEE (kebutuhan kalori harian) | usia, jenis kelamin, tinggi, berat, level aktivitas |
| Berat badan ideal | BMI = berat / (tinggi²); tampilkan kategori + rentang ideal | tinggi, berat |
| Saran menu | Rekomendasi porsi mengikuti panduan "Isi Piringku" (½ sayur-buah, ½ karbo-protein) | preferensi/pantangan (opsional) |
| Siklus tidur | Kalkulator: "mau bangun jam X → tidur jam Y" berbasis siklus 90 menit | jam target bangun |
| Pengingat minum | Target minum harian dari berat badan + pengingat berkala | berat, jam aktif |
| Olahraga | Catat jenis & durasi latihan, target mingguan, saran latihan ringan | log latihan |
| Skor gaya hidup sehat | Hitung *streak* hari bebas rokok/miras + bingkai motivasi positif | check-in harian |

### 6.3 Produktivitas

- **Catatan** — catatan teks sederhana, bisa diberi folder/label.
- **Rencana belajar** — daftar tugas (to-do) dengan mata pelajaran, tenggat, status; tampilan kalender.
- **Kelas & jadwal** — jadwal pelajaran mingguan; catatan kehadiran versi pribadi (Opsi A) atau presensi kelas (Opsi B).
- **Timer fokus (Pomodoro)** — 25 menit fokus / 5 menit istirahat, dengan log sesi.
- **Template & widget (+)** — inti dari ide "ditambahkan sesuai individu". Sediakan template siap pakai (mis. "Persiapan Ujian", "Tracker Kebiasaan", "Proyek Kelompok") yang bisa dipilih siswa. Untuk versi lanjutan, izinkan menambah/menyusun widget sendiri.

### 6.4 Keuangan

- **Pemasukan & pengeluaran** — catat transaksi (uang saku, jajan, dll) dengan tanggal & kategori.
- **Kategori** — makanan, transport, hiburan, tabungan, dll (bisa disesuaikan).
- **Target menabung** — "nabung Rp X untuk Y sampai tanggal Z", dengan progress bar.
- **Laporan** — grafik pengeluaran mingguan/bulanan + kategori terbesar; sisa saldo.
- (Opsional) tips literasi keuangan singkat untuk pelajar.

### 6.5 Profil & Pengaturan

Data diri, pengaturan notifikasi (minum, tidur, tenggat tugas), mode terang/gelap, ganti kata sandi, keluar.

---

## 7. Alur Pengguna Utama (contoh)

**Onboarding pertama kali:**
`Daftar/Login → isi data diri (usia, tinggi, berat, sekolah) → aplikasi otomatis hitung kebutuhan kalori & target minum → masuk ke Beranda.`

**Rutinitas harian:**
`Buka Beranda → lihat ringkasan → tandai tugas selesai / catat pengeluaran / check-in minum → dapat notifikasi pengingat sore hari.`

---

## 8. Model Data (entitas inti)

Skema sederhana (bisa dikembangkan). Setiap entitas terhubung ke `user_id`.

```
User
  id, nama, email, password_hash, usia, jenis_kelamin,
  tinggi_cm, berat_kg, level_aktivitas, sekolah, dibuat_pada

CatatanKesehatan (harian)
  id, user_id, tanggal, kalori_masuk, gelas_air,
  jam_tidur, menit_olahraga, bebas_rokok(bool), bebas_miras(bool)

Catatan
  id, user_id, judul, isi, label, dibuat_pada, diubah_pada

Tugas
  id, user_id, judul, mapel, tenggat, prioritas, status

JadwalKelas
  id, user_id, hari, jam_mulai, jam_selesai, mapel, ruang

Transaksi
  id, user_id, tanggal, tipe(masuk/keluar), jumlah, kategori, catatan

TargetTabungan
  id, user_id, nama, jumlah_target, terkumpul, tenggat
```

Jika memilih **Opsi B (dua sisi)**, tambahkan: `Role` pada User, entitas `Kelas`, dan tabel relasi `Kelas_Siswa` + `Presensi`.

---

## 9. Rekomendasi Tech Stack

### Opsi A — Cepat & modern (disarankan untuk proyek ini)
- **Frontend:** Next.js (React) + **Tailwind CSS**
- **Backend + Database + Auth:** **Supabase** (PostgreSQL, autentikasi, dan API bawaan — sedikit menulis backend sendiri)
- **Grafik:** Recharts atau Chart.js
- **Notifikasi (untuk pengingat minum/tidur/tenggat):** jadikan **PWA** + Web Push (agar terasa seperti aplikasi HP & bisa notifikasi)
- **Hosting:** Vercel (gratis untuk skala pelajar)

### Opsi B — Klasik (kalau ingin belajar backend penuh)
- Frontend: React + Tailwind
- Backend: Node.js + Express (atau Laravel bila terbiasa PHP)
- Database: PostgreSQL / MySQL
- Auth: JWT

> Untuk proyek sekolah dengan waktu terbatas, **Opsi A** paling efisien: satu orang bisa menyelesaikan MVP tanpa membangun backend dari nol.

---

## 10. Desain & UI/UX

- **Gaya visual:** bersih, ramah, warna lembut. Satu warna aksen utama + warna pembeda per pilar (mis. hijau = kesehatan, ungu = produktivitas, kuning = keuangan).
- **Mobile-first:** mayoritas siswa buka lewat HP → rancang untuk layar kecil dulu, baru desktop.
- **Ringan & cepat:** hindari terlalu banjir angka; tampilkan yang penting, sembunyikan detail di klik.
- **Mode gelap:** disukai remaja dan hemat baterai.
- **Aksesibilitas:** ukuran teks cukup besar, kontras warna memadai.

---

## 11. Roadmap Pengembangan

Bangun bertahap agar cepat ada versi yang bisa dipakai, lalu ditambah.

### Fase 1 — MVP (target: bisa dipakai)
- Autentikasi (daftar/login)
- Beranda dengan kartu ringkasan
- **Keuangan**: pemasukan/pengeluaran + target menabung
- **Produktivitas**: catatan + daftar tugas
- **Kesehatan**: kalkulator kalori + BMI + pengingat minum

### Fase 2 — Pelengkap
- Siklus tidur, log olahraga
- Jadwal kelas + timer Pomodoro
- Grafik laporan keuangan
- Notifikasi (PWA + push)

### Fase 3 — Pembeda
- Template & widget produktivitas custom
- Skor gaya hidup sehat (streak + gamifikasi)
- Skor Keseimbangan gabungan
- (Opsional) fitur guru/kelas (Opsi B)
- Menu "Isi Piringku" interaktif

---

## 12. Hal yang Perlu Diklarifikasi/Diputuskan

1. **Scope:** siswa saja (Opsi A) atau siswa + guru (Opsi B)?
2. **Platform:** cukup web biasa, atau PWA (bisa "dipasang" di HP + notifikasi)?
3. **Pengerjaan:** sendiri atau tim? Berapa lama tenggat proyeknya?
4. **Cakupan pengguna:** untuk satu sekolah tertentu atau umum?
5. **Nama final:** pakai **Tumara**, **Larasa**, atau salah satu alternatif?

---

## 13. Ide Pengembangan Lanjutan

- **Gamifikasi**: poin/lencana untuk kebiasaan konsisten (rajin catat, rutin minum, hemat).
- **Ekspor data**: unduh laporan keuangan/kesehatan (CSV/PDF).
- **Mode offline** (berkat PWA).
- **Reminder pintar**: notifikasi menyesuaikan jadwal siswa.
- **Komunitas/kelas**: berbagi template atau target belajar (versi lanjutan).

---

## Lampiran — Checklist MVP

- [ ] Halaman daftar & login berfungsi
- [ ] Simpan data diri → hitung kalori & target minum otomatis
- [ ] Tambah/lihat transaksi keuangan + 1 target menabung
- [ ] Tambah/selesaikan tugas + buat catatan
- [ ] Kalkulator kalori & BMI menampilkan hasil
- [ ] Pengingat minum (tombol +gelas) tercatat harian
- [ ] Beranda menampilkan ringkasan tiga pilar
- [ ] Tampil rapi di layar HP
- [ ] Disclaimer kesehatan tercantum

---

*Dokumen ini adalah draf awal. Silakan sesuaikan fitur, nama, dan prioritas sesuai kebutuhan dan waktu pengerjaanmu.*
