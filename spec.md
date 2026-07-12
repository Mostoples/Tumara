# GARIS BESAR PEMBUATAN APK

## 1. MENU KESEHATAN

*   **Pemantauan kesehatan fisik (biometrik):**
    *   **Detak jantung & oksigen darah:** memantau kesehatan kardiovaskular dan tingkat saturasi.
    *   **Pelacakan siklus tidur:** menganalisis durasi dan kualitas tidur.
    *   **Tekanan darah & gula darah:** penting untuk pemantauan mandiri kesehatan kronis.
    *   **Berat badan & indeks massa tubuh (IMT):** pelacakan perubahan berat badan dan kalkulasi otomatis.
*   **Pelacakan aktivitas & kebugaran:**
    *   **Tracker olahraga:** log aktivitas fisik harian.
    *   **Penghitung langkah (pedometer):** melacak aktivitas fisik harian.
    *   **Log latihan (workout):** mencatat jenis, durasi, dan intensitas olahraga (lari, renang, sepeda).
    *   **Kalori terbakar:** estimasi kalori yang dikeluarkan selama aktivitas.
*   **Manajemen nutrisi & hidrasi:**
    *   **Log makanan:** database makanan untuk melacak kalori, makronutrien, mikronutrien, serta rekomendasi makanan 4 sehat 5 sempurna.
    *   **Water reminder:** pengingat untuk memenuhi kebutuhan hidrasi harian.
*   **Fitur medis & gaya hidup:**
    *   **Pengingat obat (medication reminder):** alarm untuk jadwal minum obat.
    *   **Manajemen stres & mental:** fitur meditasi atau latihan pernapasan.
    *   **Pelacak siklus menstruasi:** fitur khusus wanita.
    *   **Status gaya hidup:** edukasi dan tracking untuk menghindari rokok & miras.
*   **Integrasi & keamanan data:**
    *   **Sinkronisasi wearable:** terhubung dengan smartwatch atau fitness tracker.
    *   **Keamanan & privasi:** enkripsi data medis pengguna yang ketat.
    *   **Visualisasi data:** grafik tren harian, mingguan, dan bulanan.

---

## 2. MENU PRODUKTIVITAS

**(Customizable) - Template Dashboard:** Bisa diatur sesuai kebutuhan individu menggunakan sistem *Drag & Drop*. Terdapat beberapa pilihan template spesifik, contohnya:

### A. Template Guru (Administrasi Pembelajaran)
*   **Jadwal Pelajaran:**
    *   Tampilan kolom jadwal terstruktur (tertera jam mengajar, kelas, dan hari).
    *   Berbentuk tabel dinamis yang bisa diedit langsung (*editable*) dan diunduh.
*   **Absensi Siswa:**
    *   Input absensi dilakukan per kelas dan per pertemuan.
    *   Kode status kehadiran & indikator warna visual:
        *   Hadir = **H** (Biru)
        *   Sakit = **S** (Kuning)
        *   Izin = **I** (Hijau)
        *   Alfa = **A** (Merah)
        *   Dispen = **D** (Biru Muda)
*   **Agenda Mengajar dan Jurnal Mengajar:**
    *   **Jurnal Pembelajaran:** Berisi komponen Judul, Materi Pembelajaran, and Laporan Siswa Hadir (diambil otomatis dari hasil menu absensi).
    *   Bisa ditambahkan bukti foto pembelajaran (ukuran kecil/thumbnail).
    *   **Agenda Mengajar Online:** Data pribadi materi pembelajaran tersimpan rapi per pertemuan.
    *   **Fitur Unduhan Jurnal:** Kop surat dan keterangan di bagian atas bisa diubah secara fleksibel. Berkas jurnal akan terunduh otomatis terpisah sesuai dengan kelas masing-masing (tidak tercampur).
*   **Evaluasi Penilaian:**
    *   Data siswa diambil otomatis dari kelas yang bersangkutan.
    *   Jumlah kolom bersifat dinamis menyesuaikan jumlah inputan tugas/ujian.
    *   Siswa bisa mengirimkan foto pekerjaan melalui tautan (link) dan data tersimpan langsung di dalam aplikasi ini.
    *   Gambar foto pekerjaan bisa diperbesar (*zoomable*) untuk memudahkan proses penilaian per siswa.
    *   Guru bisa langsung memberikan nilai berdampingan dengan gambar (Contoh: `76 | gambar`).
    *   Tampilan per kolom penilaian bisa diunduh ke format **Excel / PDF / Share Link**.
    *   Pada bagian kolom terakhir terdapat nilai rata-rata (komponen nilai yang digunakan untuk rata-rata bisa dipilih bebas).
    *   Siswa yang nilainya kurang atau belum tuntas KKM otomatis ditandai dengan warna **Merah**.

### B. Template Pengusaha (Rekap Jual Beli)
### C. Template Aktivitas Siswa
*Note: Pilihan template lainnya dapat disesuaikan dan dikembangkan lebih lanjut (dll).*

---

## 3. MENU KEUANGAN

### 1. Pencatatan Transaksi (Pemasukan & Pengeluaran)
*   **Input Cepat:** Fitur untuk memasukkan data transaksi harian dengan mudah.
*   **Kategorisasi:** Mengelompokkan pengeluaran (misal: makan, transportasi, utilitas) untuk analisis arus kas.
*   **Multiple Accounts/Wallets:** Mampu mencatat saldo di berbagai rekening (bank, e-wallet, tunai) secara input manual (tanpa perlu integrasi akses langsung bank).

### 2. Fitur Budgeting (Anggaran)
*   **Perencanaan Anggaran:** Menetapkan batas pengeluaran bulanan per kategori untuk menghindari pemborosan.
*   **Peringatan (Alerts):** Notifikasi otomatis jika pengeluaran hampir melampaui batas anggaran.
*   **Target Menabung:** Fitur *wishlist* untuk memantau pencapaian target pembelian barang tertentu.

### 3. Laporan Keuangan (Analisis)
*   **Visualisasi Data:** Grafik atau diagram pie untuk melihat arus kas (*cash flow*) bulanan/tahunan secara *real-time*.
*   **Ekspor Data:** Fitur ekspor data ke format **Excel / CSV** untuk analisis lebih dalam.

### 4. Manajemen Utang & Aset
*   **Catatan Utang/Piutang:** Fitur pelacakan khusus untuk mengelola pinjaman uang (yang dipinjam atau dipinjamkan).
*   **Pencatatan Aset/Investasi:** Memantau pertumbuhan nilai aset secara berkala (saham, emas, reksa dana).

### 5. Keamanan & Aksesibilitas
*   **Keamanan Data:** Proteksi PIN, password, atau sidik jari untuk melindungi data finansial yang sensitif.
*   **Sinkronisasi Cloud:** Data tersimpan dengan aman di cloud dan bisa diakses dari berbagai perangkat secara fleksibel.

---

## 4. MENU KEAGAMAAN (IBADAH)

### 1. Fitur Utama Ibadah Harian
*   **Jadwal Shalat Otomatis:** Menggunakan GPS untuk menyesuaikan lokasi pengguna secara otomatis, dilengkapi dengan peringatan dini sebelum waktu shalat masuk.
*   **Arah Kiblat Digital:** Kompas atau visualisasi yang akurat untuk menentukan arah Ka'bah dari lokasi pengguna.
*   **Al-Qur'an Digital:** Menyediakan teks Arab, transliterasi, terjemahan Bahasa Indonesia, serta audio murrotal dari berbagai qari.
*   **Doa & Dzikir Harian:** Kumpulan doa lengkap yang bersumber dari Al-Qur'an dan Hadits (seperti doa pagi-petang, doa sebelum tidur, dll).
*   **Quotes & Motivasi:** Kata-kata bijak harian dari tokoh agama untuk menjaga semangat spiritualitas.

### 2. Fitur Pendukung & Edukasi
*   **Kalender Hijriyah:** Penanda hari-hari penting dalam kalender Islam (Ramadhan, Idul Fitri, Hari Arafah, dll).
*   **Kalkulator Zakat:** Alat hitung otomatis untuk menghitung zakat maal, zakat penghasilan, dan zakat fitrah.
*   **Panduan Ibadah:** Tuntunan lengkap tata cara wudhu, shalat, dan pelaksanaan haji/umrah.
*   **Donasi & Sedekah:** Fitur pencatatan atau celengan mandiri untuk tabungan sedekah.

### 3. Fitur Personalisasi & Analisis
*   **Tracker Ibadah (Riyadhoh):** Checklist harian mandiri yang **bisa diedit dan ditambahkan sesuai kebutuhan individu**.
    *   **Membaca Al-Qur'an:**
        *   Kolom isian untuk mencatat seberapa banyak bacaan yang diselesaikan.
        *   Rekapan berkala di akhir minggu/bulan untuk melihat berapa juz Al-Qur'an yang telah dibaca.
        *   Ada fitur target membaca Al-Qur'an khusus.
        *   Menu khusus untuk **Catatan Penemuan Makna Ayat**.
        *   *Life Hack* panduan Khatam Al-Qur'an dalam sebulan (Contoh: Target 1 Kali Khatam = 2 lembar per waktu shalat; Target 2 Kali Khatam = 4 lembar per waktu shalat).
    *   **Checklist Hafalan:** Pelacakan hafalan surah atau ayat tertentu.
    *   **Checklist Shalat Lengkap:**
        *   **Subuh:** Qobliyah Subuh, Sedekah Subuh, Doa Subuh, Dzikir Subuh.
        *   **Dhuha:** Checklist jumlah rakaat (2/4/6/8 rakaat), Doa Dhuha, Dzikir Dhuha.
        *   **Dzuhur:** Qobliyah Dzuhur (2 / 4 rakaat), Ba'diyyah Dzuhur, Doa Dzuhur, Dzikir Dzuhur.
        *   **Ashar:** Doa Ashar, Dzikir Ashar, Kajian (Poin Tersirat).
        *   **Maghrib:** Ba'diyyah Maghrib, Awwabin (6 Rakaat), Doa Maghrib, Dzikir Maghrib.
        *   **Isya:** Ba'diyyah Isya, Doa Isya, Dzikir Isya.
        *   **Sepertiga Malam:** Shalat Taubat, Shalat Hajat, Shalat Tahajjud, Doa, Dzikir.
*   **Catatan Ibadah:** Fitur evaluasi diri untuk mencatat kemajuan ibadah serta perkembangan hafalan pribadi.

---

## 5. MENU DAILY PLANNER

### 1. Fitur Inti Manajemen Tugas
*   **To-Do List (Daftar Tugas):** Antarmuka yang mudah untuk menambahkan, mengedit, dan mencentang tugas yang sudah diselesaikan.
*   **Prioritas Tugas:** Kemampuan menandai tugas berdasarkan tingkat kepentingan (Contoh: P1/Tinggi, P2/Sedang, P3/Rendah) agar pengguna bisa fokus pada hal krusial.
*   **Pengingat & Notifikasi (Reminders):** Peringatan otomatis untuk memastikan tidak ada tenggat waktu (*deadline*) yang terlewat.
*   **Tugas Berulang (Recurring Tasks):** Fitur untuk mengatur tugas harian, mingguan, atau bulanan secara otomatis (Misal: bayar listrik, olahraga rutin).

### 2. Pengorganisasian Pribadi
*   **Kategorisasi (Proyek/Label/Tag):** Memisahkan tugas berdasarkan konteks atau kategori kehidupan, seperti "Pekerjaan", "Pribadi", "Kesehatan", atau "Belajar".
*   **Catatan/Catatan Harian (Notes/Journaling):** Ruang coretan kreatif untuk mencatat ide cepat, menulis jurnal harian, atau detail instruksi tugas.
*   **Habit Tracker (Pelacak Kebiasaan):** Fitur khusus untuk melacak konsistensi kebiasaan harian (Misal: minum air putih cukup, membaca buku) untuk membangun rutinitas positif.

---

## ALUR TAHAPAN PEMBUATAN APLIKASI (SDLC INFOGRAFIS PANDUAN)

Proses pengembangan sistem ini mengikuti 7 tahapan standar industri perangkat lunak:

1.  **Analisis Kebutuhan & Ide (Requirement Analysis)**
    Menentukan ide dasar, tujuan utama pembuatan aplikasi, target segmentasi pengguna, serta penyusunan daftar fitur utama produk.
2.  **Perancangan (Desain UI/UX & Sistem)**
    *   *UI (User Interface):* Pembuatan mockup atau wireframe detail tampilan layar menggunakan tools seperti Figma atau Adobe XD.
    *   *UX (User Experience):* Merancang peta alur perjalanan pengguna (*user journey*) saat menggunakan aplikasi.
    *   *Teknikal:* Merancang desain arsitektur basis data relasional melalui ERD (Entity Relationship Diagram) serta arsitektur sistem.
3.  **Flowchart & Algoritma (Logika Pemrograman)**
    *   *Flowchart:* Menggambar diagram alur proses logis sistem menggunakan simbol-simbol standar internasional.
    *   *Algoritma:* Menuliskan urutan langkah-langkah sistematis penyelesaian masalah logika pada sistem, seperti struktur percabangan (`if-else` untuk penentuan KKM atau status warna absensi) serta perulangan (`looping` untuk recurring tasks).
4.  **Pengembangan (Coding / Implementasi)**
    *   Proses penulisan kode program utama berdasarkan desain UI dan alur flowchart yang telah disepakati.
    *   *Mobile/Frontend:* Menggunakan IDE seperti Android Studio (Java/Kotlin) atau Framework lintas platform (React Native/Flutter/Next.js).
    *   *Backend & Database:* Menghubungkan logika bisnis aplikasi dengan penyimpanan basis data (Contoh: Firebase, MySQL, PostgreSQL).
5.  **Pengujian (Testing & Debugging)**
    *   *Alpha Testing:* Proses pengujian internal yang dilakukan oleh tim developer/QA untuk memastikan fungsionalitas dasar.
    *   *Beta Testing:* Pengujian terbatas yang dilemparkan kepada sampel pengguna riil untuk mendapatkan masukan.
    *   *Metode:* Memastikan aplikasi bebas dari bug/error menggunakan kombinasi pengujian *White Box* dan *Black Box Testing*.
6.  **Peluncuran (Deployment & Publishing)**
    *   Mengompilasi dan mengekspor proyek kode menjadi berkas biner siap pakai seperti `.apk` atau `.aab` (Android App Bundle).
    *   Mengunggah dan merilis berkas aplikasi ke Google Play Store melalui layanan Google Play Console.
7.  **Pemeliharaan (Maintenance & Update)**
    Memantau performa dan stabilitas aplikasi saat digunakan publik, memperbaiki temuan bug pasca-rilis (*hotfix*), serta memperbarui fitur secara berkala sesuai dengan umpan balik pengguna.