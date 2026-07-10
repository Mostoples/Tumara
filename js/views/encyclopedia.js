/* ============================================================
   TUMARA — Ensiklopedia
   Kumpulan artikel pengetahuan tiga pilar (kesehatan,
   produktivitas, keuangan). Konten statis, pencarian,
   filter kategori, dan simpan artikel (localStorage).
   ============================================================ */

const Ency = {
  tab: 'semua',    // semua | health | prod | fin | simpan
  query: '',
  selected: null,  // id artikel yang sedang dibuka

  KATEGORI: {
    health: { get label() { return tr('Kesehatan', 'Health'); },        color: 'var(--health)', soft: 'var(--health-soft)', badge: 'badge-green'  },
    prod:   { get label() { return tr('Produktivitas', 'Productivity'); }, color: 'var(--prod)',   soft: 'var(--prod-soft)',   badge: 'badge-purple' },
    fin:    { get label() { return tr('Keuangan', 'Finance'); },        color: 'var(--fin)',    soft: 'var(--fin-soft)',    badge: 'badge-amber'  }
  },

  ARTIKEL: [
    /* ---------- KESEHATAN ---------- */
    {
      id: 'isi-piringku', kategori: 'health', emoji: '🍽️', menit: 3,
      judul: 'Isi Piringku: Panduan Makan Seimbang',
      ringkasan: 'Cara mudah mengatur porsi makan sehat ala Kemenkes — tanpa hitung kalori rumit.',
      tags: ['gizi', 'makan', 'porsi', 'sayur', 'buah'],
      isi: [
        { p: '“Isi Piringku” adalah panduan makan sehat dari Kementerian Kesehatan RI yang menggantikan slogan lama “4 Sehat 5 Sempurna”. Intinya sederhana: atur isi piringmu setiap kali makan, bukan menghitung kalori satu per satu.' },
        { h: 'Pembagian porsi dalam satu piring', list: [
          '½ piring: sayur dan buah (⅔ sayur, ⅓ buah)',
          '⅓ piring: makanan pokok — nasi, kentang, jagung, atau ubi',
          'Sisanya: lauk pauk — ayam, ikan, telur, tahu, atau tempe'
        ]},
        { h: 'Kebiasaan pendampingnya', list: [
          'Minum air putih yang cukup sepanjang hari',
          'Batasi gula, garam, dan lemak (pedoman: 4 sdm gula, 1 sdt garam, 5 sdm minyak per hari)',
          'Cuci tangan sebelum makan dan aktif bergerak setiap hari'
        ]},
        { h: 'Kenapa penting buat pelajar?', p: 'Masa sekolah adalah masa pertumbuhan. Gizi yang seimbang membantu konsentrasi belajar, menjaga energi sepanjang hari, dan membangun kebiasaan makan yang sehat sampai dewasa.' }
      ]
    },
    {
      id: 'tidur-remaja', kategori: 'health', emoji: '🌙', menit: 4,
      judul: 'Kenapa Remaja Butuh Tidur 8–10 Jam',
      ringkasan: 'Tidur bukan buang-buang waktu — otak justru “menyimpan” pelajaranmu saat kamu tidur.',
      tags: ['tidur', 'istirahat', 'siklus', 'begadang'],
      isi: [
        { p: 'Remaja usia 13–18 tahun disarankan tidur 8–10 jam per malam. Sayangnya, banyak pelajar tidur kurang dari 7 jam karena tugas, gawai, atau begadang.' },
        { h: 'Apa yang terjadi saat kamu tidur?', list: [
          'Otak memindahkan materi pelajaran dari ingatan jangka pendek ke jangka panjang (konsolidasi memori)',
          'Tubuh memproduksi hormon pertumbuhan — penting di masa remaja',
          'Sistem imun diperkuat sehingga tidak gampang sakit',
          'Emosi “di-reset” — kurang tidur bikin mudah marah dan cemas'
        ]},
        { h: 'Siklus tidur 90 menit', p: 'Tidur berjalan dalam siklus sekitar 90 menit (tidur ringan → tidur dalam → REM). Bangun di akhir siklus terasa lebih segar daripada bangun di tengah siklus. Karena itu, fitur kalkulator tidur Tumara menyarankan jam tidur berdasarkan kelipatan 90 menit.' },
        { h: 'Tips tidur berkualitas', list: [
          'Jauhkan HP minimal 30 menit sebelum tidur — cahaya biru menghambat hormon melatonin',
          'Usahakan jam tidur dan bangun yang konsisten, termasuk akhir pekan',
          'Hindari kafein (kopi, teh, minuman energi) setelah sore hari',
          'Kamar yang gelap dan sejuk membantu tidur lebih nyenyak'
        ]}
      ]
    },
    {
      id: 'hidrasi', kategori: 'health', emoji: '💧', menit: 2,
      judul: 'Hidrasi: Berapa Banyak Air yang Kamu Butuhkan?',
      ringkasan: 'Dehidrasi ringan saja sudah bisa menurunkan konsentrasi belajar. Kenali kebutuhan airmu.',
      tags: ['air', 'minum', 'dehidrasi'],
      isi: [
        { p: 'Sekitar 60% tubuh manusia adalah air. Kehilangan 1–2% cairan saja (dehidrasi ringan) sudah bisa membuat sulit fokus, cepat lelah, dan sakit kepala — musuh utama saat belajar.' },
        { h: 'Berapa kebutuhanmu?', p: 'Patokan umum adalah sekitar 30–40 ml per kg berat badan per hari. Misal berat 55 kg → sekitar 1,9–2,2 liter, atau kurang lebih 8 gelas. Kebutuhan naik saat olahraga, cuaca panas, atau sedang sakit. Tumara menghitung target harianmu otomatis dari berat badan di profil.' },
        { h: 'Tanda-tanda kurang minum', list: [
          'Urine berwarna kuning pekat (idealnya kuning muda jernih)',
          'Bibir kering, cepat mengantuk, dan sulit konsentrasi',
          'Sakit kepala ringan di siang hari'
        ]},
        { h: 'Trik biar tidak lupa', list: [
          'Bawa botol minum sendiri ke sekolah',
          'Minum segelas setiap habis salat, ganti pelajaran, atau selesai satu sesi belajar',
          'Aktifkan pengingat minum di Profil → Preferensi'
        ]}
      ]
    },
    {
      id: 'aktivitas-fisik', kategori: 'health', emoji: '🏃', menit: 3,
      judul: 'Aktif 60 Menit Sehari, Nggak Harus di Gym',
      ringkasan: 'WHO menyarankan remaja aktif bergerak 60 menit per hari — dan itu lebih gampang dari kedengarannya.',
      tags: ['olahraga', 'gerak', 'workout', 'sehat'],
      isi: [
        { p: 'WHO merekomendasikan anak dan remaja usia 5–17 tahun melakukan aktivitas fisik intensitas sedang-berat minimal 60 menit setiap hari. Kabar baiknya: ini akumulasi, bukan sekali jalan.' },
        { h: 'Yang termasuk aktivitas fisik', list: [
          'Jalan kaki atau bersepeda ke sekolah',
          'Main futsal, basket, badminton, atau senam',
          'Naik tangga, bantu beres-beres rumah',
          'Peregangan dan lompat tali di sela belajar'
        ]},
        { h: 'Manfaatnya buat pelajar', list: [
          'Aliran darah ke otak meningkat → lebih mudah fokus dan mengingat',
          'Mengurangi stres dan memperbaiki suasana hati (endorfin)',
          'Tidur jadi lebih nyenyak di malam hari',
          'Menjaga berat badan dan kesehatan jantung jangka panjang'
        ]},
        { h: 'Mulai dari mana?', p: 'Tidak perlu langsung 60 menit. Mulai dari 2×15 menit per hari, lalu tambah bertahap. Catat menit olahragamu di tab Olahraga — Tumara otomatis menghitungnya ke skor kesehatan harianmu.' }
      ]
    },
    {
      id: 'stres-belajar', kategori: 'health', emoji: '🧘', menit: 3,
      judul: 'Mengelola Stres Menjelang Ujian',
      ringkasan: 'Stres itu normal — yang penting tahu cara meredakannya sebelum jadi kewalahan.',
      tags: ['stres', 'cemas', 'ujian', 'mental', 'napas'],
      isi: [
        { p: 'Sedikit stres justru membantu — dia membuatmu waspada dan siap. Tapi stres berlebihan yang dibiarkan bisa mengganggu tidur, nafsu makan, dan justru menurunkan performa ujian.' },
        { h: 'Teknik cepat meredakan cemas', list: [
          'Napas 4-7-8: tarik napas 4 detik, tahan 7 detik, hembuskan 8 detik — ulangi 4 kali',
          'Grounding 5-4-3-2-1: sebutkan 5 hal yang kamu lihat, 4 yang kamu sentuh, 3 yang kamu dengar, 2 yang kamu cium, 1 yang kamu rasakan',
          'Jalan kaki singkat 10 menit tanpa HP'
        ]},
        { h: 'Pencegahan jangka panjang', list: [
          'Pecah materi ujian jadi sesi kecil beberapa hari sebelumnya — hindari sistem kebut semalam',
          'Jaga tidur tetap 8 jam, terutama malam sebelum ujian',
          'Ceritakan bebanmu ke teman, keluarga, atau guru BK — bercerita itu bukan kelemahan'
        ]},
        { p: 'Jika rasa cemas atau sedih terasa berat dan berlangsung lebih dari dua minggu, jangan ragu bicara dengan orang dewasa yang kamu percaya atau tenaga profesional. Kamu tidak sendirian.' }
      ]
    },

    /* ---------- PRODUKTIVITAS ---------- */
    {
      id: 'pomodoro', kategori: 'prod', emoji: '🍅', menit: 3,
      judul: 'Teknik Pomodoro: Fokus 25 Menit yang Mengubah Cara Belajar',
      ringkasan: 'Belajar 25 menit, istirahat 5 menit. Sederhana, tapi terbukti melawan rasa malas.',
      tags: ['fokus', 'pomodoro', 'timer', 'belajar'],
      isi: [
        { p: 'Teknik Pomodoro diciptakan Francesco Cirillo pada akhir 1980-an, dinamai dari timer dapur berbentuk tomat (pomodoro = tomat dalam bahasa Italia). Prinsipnya: otak lebih mudah diajak fokus jika tahu ada garis akhir yang dekat.' },
        { h: 'Cara melakukannya', list: [
          'Pilih satu tugas spesifik (misal: kerjakan 10 soal matematika)',
          'Pasang timer 25 menit, kerjakan tanpa gangguan — HP dijauhkan',
          'Saat timer bunyi, istirahat 5 menit: berdiri, minum, regangkan badan',
          'Setelah 4 putaran, ambil istirahat panjang 15–30 menit'
        ]},
        { h: 'Kenapa 25 menit?', p: 'Cukup panjang untuk masuk ke kondisi fokus, tapi cukup pendek sehingga tidak terasa menakutkan untuk dimulai. Justru “memulai” itulah bagian tersulit — dan Pomodoro membuatnya ringan.' },
        { h: 'Coba sekarang', p: 'Tumara punya timer Pomodoro bawaan di menu Produktivitas → tab Fokus. Selesaikan satu sesi dan rasakan bedanya.' }
      ]
    },
    {
      id: 'active-recall', kategori: 'prod', emoji: '🧠', menit: 4,
      judul: 'Active Recall & Spaced Repetition: Belajar yang Benar-Benar Nempel',
      ringkasan: 'Membaca ulang catatan itu terasa produktif, padahal kurang efektif. Ini cara yang terbukti secara ilmiah.',
      tags: ['belajar', 'ingatan', 'ujian', 'recall', 'repetisi'],
      isi: [
        { p: 'Riset psikologi kognitif konsisten menunjukkan: menguji diri sendiri (active recall) jauh lebih efektif daripada membaca ulang catatan. Membaca ulang menciptakan “ilusi paham” — terasa akrab, tapi belum tentu bisa dipanggil ulang saat ujian.' },
        { h: 'Active recall dalam praktik', list: [
          'Tutup buku, lalu tulis atau ucapkan semua yang kamu ingat tentang materi',
          'Buat pertanyaan sendiri dari tiap subbab, jawab tanpa melihat catatan',
          'Gunakan flashcard: pertanyaan di depan, jawaban di belakang',
          'Jelaskan materi ke teman (atau ke diri sendiri) seolah kamu gurunya — dikenal sebagai teknik Feynman'
        ]},
        { h: 'Spaced repetition: lawan lupa dengan jadwal', p: 'Tanpa pengulangan, kita melupakan sebagian besar materi dalam hitungan hari (kurva lupa Ebbinghaus). Solusinya: ulangi materi dengan jarak yang makin panjang — misalnya hari ke-1, ke-3, ke-7, lalu ke-14. Setiap pengulangan memperkuat ingatan dan memperlambat lupa.' },
        { h: 'Kombinasi praktisnya', p: 'Setelah belajar materi baru, jadwalkan tiga sesi review singkat (cukup 10–15 menit) di hari ke-1, ke-3, dan ke-7. Isi sesinya dengan active recall, bukan membaca ulang. Tambahkan jadwal review ini sebagai tugas di Tumara agar tidak lupa.' }
      ]
    },
    {
      id: 'prokrastinasi', kategori: 'prod', emoji: '⏳', menit: 4,
      judul: 'Prokrastinasi: Kenapa Kita Menunda dan Cara Melawannya',
      ringkasan: 'Menunda bukan soal malas — ini soal emosi. Memahaminya adalah langkah pertama mengalahkannya.',
      tags: ['menunda', 'malas', 'tugas', 'deadline'],
      isi: [
        { p: 'Prokrastinasi bukan sekadar malas. Penelitian menunjukkan menunda adalah cara otak menghindari perasaan tidak nyaman: takut hasilnya jelek, bingung mulai dari mana, atau tugasnya terasa terlalu besar. Kita menunda untuk merasa lega sekarang — dan membayar mahal nanti.' },
        { h: 'Strategi yang terbukti membantu', list: [
          'Aturan 2 menit: kalau bisa selesai kurang dari 2 menit, kerjakan sekarang juga',
          'Aturan 5 menit: janji pada diri sendiri untuk mengerjakan cuma 5 menit — biasanya setelah mulai, kamu akan lanjut sendiri',
          'Pecah tugas besar jadi langkah sekecil mungkin (“buka buku halaman 40” lebih mudah dari “belajar bab 4”)',
          'Singkirkan godaan: HP di ruangan lain, notifikasi mati',
          'Pakai tenggat kecil buatan sendiri sebelum tenggat asli'
        ]},
        { h: 'Ubah kalimat di kepalamu', p: 'Alih-alih “aku harus menyelesaikan semuanya”, coba “aku cuma perlu mulai dari satu langkah kecil”. Alih-alih “nanti saja pas mood”, ingat: mood justru datang setelah mulai, bukan sebelumnya.' },
        { p: 'Mulai dari daftar tugasmu di Tumara: pilih satu tugas, pecah jadi langkah kecil, lalu nyalakan timer fokus 25 menit. Satu langkah kecil hari ini mengalahkan rencana besar yang tidak pernah dimulai.' }
      ]
    },
    {
      id: 'matriks-eisenhower', kategori: 'prod', emoji: '🗂️', menit: 3,
      judul: 'Matriks Eisenhower: Memilah Mana yang Penting, Mana yang Mendesak',
      ringkasan: 'Tidak semua tugas sama nilainya. Matriks 4 kuadran ini membantumu memutuskan mana yang dikerjakan dulu.',
      tags: ['prioritas', 'tugas', 'manajemen', 'waktu'],
      isi: [
        { p: 'Dinamai dari Presiden AS Dwight Eisenhower, matriks ini memilah tugas berdasarkan dua pertanyaan: apakah ini penting? apakah ini mendesak? Hasilnya empat kuadran dengan aksi berbeda.' },
        { h: 'Empat kuadran', list: [
          'Penting & mendesak → kerjakan sekarang (ujian besok, tugas deadline hari ini)',
          'Penting & tidak mendesak → jadwalkan (belajar rutin, olahraga, menabung)',
          'Tidak penting & mendesak → persingkat atau delegasikan (chat grup yang minta dibalas, urusan kecil)',
          'Tidak penting & tidak mendesak → kurangi atau hapus (scroll medsos tanpa tujuan)'
        ]},
        { h: 'Rahasianya ada di kuadran 2', p: 'Orang yang kewalahan biasanya menghabiskan waktu di kuadran 1 (selalu dikejar deadline) dan kuadran 4 (pelarian). Pelajar yang tenang dan konsisten justru banyak beraktivitas di kuadran 2 — mengerjakan hal penting sebelum jadi mendesak. Belajar rutin 30 menit tiap hari jauh lebih ringan daripada sistem kebut semalam.' },
        { p: 'Saat menambah tugas di Tumara, kamu bisa menandai prioritas tinggi/sedang/rendah — gunakan matriks ini sebagai panduan menentukannya.' }
      ]
    },

    /* ---------- KEUANGAN ---------- */
    {
      id: 'atur-uang-saku', kategori: 'fin', emoji: '💰', menit: 3,
      judul: 'Rumus 50/30/20 Versi Uang Saku Pelajar',
      ringkasan: 'Cara sederhana membagi uang saku supaya cukup untuk jajan, ada sisa untuk nabung.',
      tags: ['uang saku', 'budget', 'anggaran', 'nabung'],
      isi: [
        { p: 'Rumus 50/30/20 adalah cara populer membagi pemasukan: 50% kebutuhan, 30% keinginan, 20% tabungan. Untuk pelajar, versi sederhananya bisa disesuaikan dengan uang sakumu.' },
        { h: 'Contoh: uang saku Rp20.000/hari', list: [
          '50% (Rp10.000) — kebutuhan: makan siang, ongkos, fotokopi',
          '30% (Rp6.000) — keinginan: jajan, es teh, top-up game',
          '20% (Rp4.000) — tabungan: masuk celengan atau rekening'
        ]},
        { h: 'Aturan mainnya', list: [
          'Sisihkan tabungan di awal, bukan dari sisa — sisa biasanya nol',
          'Kalau pos keinginan habis, berhenti — jangan ambil dari pos tabungan',
          'Persentase boleh disesuaikan; yang penting konsisten'
        ]},
        { h: 'Praktikkan di Tumara', p: 'Catat setiap pemasukan dan pengeluaran di menu Keuangan. Laporan bulanan akan menunjukkan ke mana uangmu benar-benar pergi — sering kali hasilnya mengejutkan.' }
      ]
    },
    {
      id: 'kebutuhan-keinginan', kategori: 'fin', emoji: '⚖️', menit: 3,
      judul: 'Kebutuhan vs Keinginan: Filter Sebelum Jajan',
      ringkasan: 'Satu pertanyaan sederhana sebelum membeli bisa menyelamatkan uang sakumu.',
      tags: ['kebutuhan', 'keinginan', 'jajan', 'impulsif', 'belanja'],
      isi: [
        { p: 'Kebutuhan adalah hal yang harus dipenuhi agar hidup dan sekolahmu berjalan: makan, ongkos, alat tulis. Keinginan adalah hal yang menyenangkan tapi bisa ditunda: jajan kekinian, skin game, aksesori baru. Keduanya boleh — masalah muncul saat keinginan menyamar jadi kebutuhan.' },
        { h: 'Filter sebelum membeli', list: [
          'Tanya: “Kalau tidak beli ini sekarang, apa yang terjadi?” Kalau jawabannya “tidak apa-apa” — itu keinginan',
          'Aturan tunggu 3 hari untuk pembelian di atas Rp50.000: kalau setelah 3 hari masih kepikiran, baru pertimbangkan',
          'Hitung dengan “mata uang jajan”: harga sepatu Rp300.000 = 15 hari full uang saku — masih mau?'
        ]},
        { h: 'Waspadai jebakan kecil rutin', p: 'Pengeluaran kecil yang rutin lebih berbahaya dari pembelian besar sesekali. Es kopi Rp15.000 setiap hari sekolah = lebih dari Rp300.000 sebulan. Tidak harus berhenti total — cukup sadari dan putuskan dengan sengaja, bukan otomatis.' }
      ]
    },
    {
      id: 'target-menabung', kategori: 'fin', emoji: '🎯', menit: 3,
      judul: 'Menabung dengan Target: Biar Nabung Ada Arahnya',
      ringkasan: 'Menabung tanpa tujuan gampang bocor. Target yang jelas membuatmu bertahan.',
      tags: ['nabung', 'target', 'goal', 'menabung'],
      isi: [
        { p: 'Menabung “pokoknya nabung” biasanya berakhir diambil lagi. Otak kita butuh alasan konkret untuk menunda kesenangan. Karena itu, tabungan yang punya nama dan angka jauh lebih mungkin berhasil.' },
        { h: 'Buat target yang SMART', list: [
          'Spesifik: “sepatu futsal” — bukan “barang bagus”',
          'Terukur (Measurable): harganya Rp350.000',
          'Bisa dicapai (Achievable): sisihkan Rp5.000/hari dari uang saku',
          'Relevan: memang kamu butuhkan dan inginkan sungguh-sungguh',
          'Berbatas waktu (Time-bound): tercapai dalam ±10 minggu'
        ]},
        { h: 'Trik supaya konsisten', list: [
          'Sisihkan di awal hari/minggu, langsung pisahkan dari uang jajan',
          'Pantau progresnya — melihat angka naik itu memotivasi',
          'Rayakan pencapaian kecil (25%, 50%, 75%) tanpa mengambil tabungannya'
        ]},
        { p: 'Buat target menabungmu di menu Keuangan → Target. Progress bar-nya akan mengingatkanmu setiap kali buka aplikasi.' }
      ]
    },
    {
      id: 'dana-darurat', kategori: 'fin', emoji: '🛟', menit: 2,
      judul: 'Dana Darurat Mini untuk Pelajar',
      ringkasan: 'Ban bocor, buku hilang, iuran mendadak — hal tak terduga selalu ada. Siapkan penyangganya.',
      tags: ['darurat', 'cadangan', 'nabung', 'emergency'],
      isi: [
        { p: 'Dana darurat adalah uang yang khusus disimpan untuk kejadian tak terduga — bukan untuk jajan, bukan untuk keinginan. Untuk pelajar, tidak perlu besar: cukup setara uang saku 1–2 minggu sudah sangat membantu.' },
        { h: 'Kenapa perlu?', list: [
          'Kejadian kecil tak terduga (ongkos tambahan, alat tulis hilang, iuran mendadak) tidak lagi mengacaukan anggaranmu',
          'Kamu tidak perlu meminjam ke teman — pinjaman kecil sering merusak pertemanan',
          'Melatih kebiasaan yang akan sangat berguna saat dewasa nanti'
        ]},
        { h: 'Cara membangunnya', list: [
          'Tentukan targetnya, misal Rp100.000',
          'Isi dari uang sisa akhir minggu atau 5–10% setiap pemasukan',
          'Simpan terpisah dari uang jajan, dan hanya dipakai untuk hal yang benar-benar darurat',
          'Kalau terpakai, isi ulang sampai penuh lagi'
        ]}
      ]
    },
    {
      id: 'bijak-belanja-online', kategori: 'fin', emoji: '🛒', menit: 3,
      judul: 'Bijak Belanja Online: Melawan Jurus Diskon',
      ringkasan: 'Flash sale, gratis ongkir, “sisa 2 lagi!” — kenali trik psikologis marketplace agar dompet aman.',
      tags: ['belanja', 'online', 'diskon', 'impulsif', 'marketplace'],
      isi: [
        { p: 'Aplikasi belanja dirancang tim ahli untuk membuatmu membeli lebih banyak. Bukan berarti belanja online itu buruk — tapi kamu perlu mengenali triknya supaya keputusan tetap di tanganmu.' },
        { h: 'Trik psikologis yang sering dipakai', list: [
          'Urgensi palsu: hitung mundur flash sale dan label “stok tinggal sedikit” memicu takut ketinggalan (FOMO)',
          'Harga coret: “Rp150.000 → Rp75.000” terasa hemat, padahal yang keluar tetap Rp75.000',
          'Gratis ongkir bersyarat: “tambah Rp30.000 lagi” membuatmu belanja lebih banyak demi “hemat” Rp10.000',
          'Gamifikasi: koin, check-in harian, dan misi membuatmu terus membuka aplikasi'
        ]},
        { h: 'Pertahananmu', list: [
          'Pakai daftar belanja: masuk aplikasi, beli yang dicari, keluar',
          'Endapkan di keranjang minimal 24 jam sebelum checkout',
          'Tanya: “Aku beli karena butuh, atau karena diskon?” Diskon untuk barang yang tidak dibutuhkan = 100% pengeluaran, bukan penghematan',
          'Catat semua belanja online di Tumara — melihat totalnya bulan lalu adalah rem paling ampuh'
        ]}
      ]
    }
  ],

  /* ---------- bookmark (tersimpan per akun di users/{uid}) ---------- */

  _bookmarks() {
    const remote = DB.user?.bookmarkArtikel;
    if (Array.isArray(remote)) return remote;
    // Migrasi sekali dari versi lama (localStorage) ke profil akun.
    let lokal = [];
    try { lokal = JSON.parse(localStorage.getItem('tumara_ency_bm') || '[]'); }
    catch (_) { lokal = []; }
    if (DB.user) {
      DB.updateUser({ bookmarkArtikel: lokal })
        .then(() => localStorage.removeItem('tumara_ency_bm'))
        .catch(() => {});
    }
    return lokal;
  },

  async _toggleBookmark(id) {
    const bm = this._bookmarks().slice();
    const i = bm.indexOf(id);
    if (i >= 0) { bm.splice(i, 1); toast(tr('Dihapus dari artikel tersimpan', 'Removed from saved articles'), 'info'); }
    else { bm.push(id); toast(tr('Artikel disimpan 🔖', 'Article saved 🔖')); }
    try { await DB.updateUser({ bookmarkArtikel: bm }); }
    catch (_) { toast(tr('Gagal menyimpan bookmark. Periksa koneksimu.', 'Could not save bookmark. Check your connection.'), 'error'); }
  },

  /* ---------- render ---------- */

  render(el) {
    if (this.selected) this.renderDetail(el);
    else this.renderList(el);
  },

  _filtered() {
    const q = this.query.trim().toLowerCase();
    const bm = this._bookmarks();
    return this.ARTIKEL.filter(a => {
      if (this.tab === 'simpan' && !bm.includes(a.id)) return false;
      if (this.tab !== 'semua' && this.tab !== 'simpan' && a.kategori !== this.tab) return false;
      if (!q) return true;
      return (a.judul + ' ' + a.ringkasan + ' ' + a.tags.join(' ')).toLowerCase().includes(q);
    });
  },

  renderList(el) {
    const hasil = this._filtered();
    const bm = this._bookmarks();
    const chips = [
      ['semua', `📚 ${tr('Semua', 'All')}`],
      ['health', `💚 ${tr('Kesehatan', 'Health')}`],
      ['prod', `💜 ${tr('Produktivitas', 'Productivity')}`],
      ['fin', `💛 ${tr('Keuangan', 'Finance')}`],
      ['simpan', `🔖 ${tr('Tersimpan', 'Saved')}`]
    ];

    el.innerHTML = `
      <div class="ency-search">
        <ion-icon name="search-outline"></ion-icon>
        <input class="input" id="encyQ" type="search" placeholder="${tr('Cari artikel… (mis. tidur, pomodoro, nabung)', 'Search articles… (e.g. sleep, pomodoro, savings)')}" value="${esc(this.query)}">
      </div>

      <div class="ency-chips">
        ${chips.map(([k, label]) => `<button class="chip ${this.tab === k ? 'active' : ''}" data-chip="${k}">${label}</button>`).join('')}
      </div>

      ${hasil.length ? `
        <div class="grid grid-2">
          ${hasil.map(a => {
            const kat = this.KATEGORI[a.kategori];
            const saved = bm.includes(a.id);
            return `
              <div class="card ency-card hoverable" data-open="${a.id}">
                <div class="ency-card-head">
                  <span class="item-icon" style="background:${kat.soft};font-size:1.4rem;">${a.emoji}</span>
                  <button class="mini-icon-btn ency-bm ${saved ? 'saved' : ''}" data-bm="${a.id}" title="${saved ? tr('Hapus dari tersimpan', 'Remove from saved') : tr('Simpan artikel', 'Save article')}">
                    <ion-icon name="${saved ? 'bookmark' : 'bookmark-outline'}"></ion-icon>
                  </button>
                </div>
                <div class="ency-card-title">${esc(a.judul)}</div>
                <div class="ency-card-sub">${esc(a.ringkasan)}</div>
                <div class="ency-card-meta">
                  <span class="badge ${kat.badge}">${kat.label}</span>
                  <span class="ency-min"><ion-icon name="time-outline"></ion-icon>${tr(`${a.menit} menit baca`, `${a.menit} min read`)}</span>
                </div>
              </div>`;
          }).join('')}
        </div>` : `
        <div class="empty-state">
          <ion-icon name="${this.tab === 'simpan' ? 'bookmark-outline' : 'search-outline'}"></ion-icon>
          <div class="es-title">${this.tab === 'simpan' ? tr('Belum ada artikel tersimpan', 'No saved articles yet') : tr('Tidak ada artikel yang cocok', 'No matching articles')}</div>
          <div class="es-sub">${this.tab === 'simpan' ? tr('Ketuk ikon 🔖 pada artikel untuk menyimpannya di sini.', 'Tap the 🔖 icon on an article to save it here.') : tr('Coba kata kunci lain atau ganti kategori.', 'Try a different keyword or category.')}</div>
        </div>`}`;

    /* interaksi */
    const q = $('#encyQ', el);
    q.oninput = () => {
      this.query = q.value;
      this.renderList(el);
      const q2 = $('#encyQ', el);
      q2.focus();
      q2.setSelectionRange(q2.value.length, q2.value.length);
    };
    $$('[data-chip]', el).forEach(c => c.onclick = () => { this.tab = c.dataset.chip; this.renderList(el); });
    $$('[data-bm]', el).forEach(b => b.onclick = async e => {
      e.stopPropagation();
      await this._toggleBookmark(b.dataset.bm);
      this.renderList(el);
    });
    $$('[data-open]', el).forEach(c => c.onclick = () => {
      this.selected = c.dataset.open;
      this.render(el);
      window.scrollTo({ top: 0 });
    });
  },

  renderDetail(el) {
    const a = this.ARTIKEL.find(x => x.id === this.selected);
    if (!a) { this.selected = null; return this.renderList(el); }
    const kat = this.KATEGORI[a.kategori];
    const saved = this._bookmarks().includes(a.id);
    const terkait = this.ARTIKEL.filter(x => x.kategori === a.kategori && x.id !== a.id).slice(0, 3);

    el.innerHTML = `
      <button class="btn btn-sm" id="encyBack" style="margin-bottom:18px;">
        <ion-icon name="arrow-back"></ion-icon> ${tr('Semua artikel', 'All articles')}
      </button>

      ${I18N.lang === 'en' ? `
      <div class="badge badge-gray" style="margin-bottom:12px;">🇮🇩 This article is available in Indonesian only</div>` : ''}

      <div class="card">
        <div class="ency-hero">
          <span class="item-icon" style="background:${kat.soft};width:58px;height:58px;font-size:1.8rem;border-radius:16px;">${a.emoji}</span>
          <div style="flex:1;min-width:0;">
            <div class="ency-card-meta" style="margin:0 0 8px;">
              <span class="badge ${kat.badge}">${kat.label}</span>
              <span class="ency-min"><ion-icon name="time-outline"></ion-icon>${tr(`${a.menit} menit baca`, `${a.menit} min read`)}</span>
            </div>
            <h2 class="ency-title">${esc(a.judul)}</h2>
          </div>
          <button class="mini-icon-btn ency-bm ${saved ? 'saved' : ''}" id="encyBm" title="${saved ? tr('Hapus dari tersimpan', 'Remove from saved') : tr('Simpan artikel', 'Save article')}">
            <ion-icon name="${saved ? 'bookmark' : 'bookmark-outline'}"></ion-icon>
          </button>
        </div>

        <div class="ency-body">
          ${a.isi.map(s => `
            ${s.h ? `<h3>${esc(s.h)}</h3>` : ''}
            ${s.p ? `<p>${esc(s.p)}</p>` : ''}
            ${s.list ? `<ul>${s.list.map(li => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}
          `).join('')}
        </div>

        ${a.kategori === 'health' ? `
          <div class="disclaimer" style="margin-top:20px;">
            <ion-icon name="shield-checkmark-outline"></ion-icon>
            <span>${tr('Artikel ini bersifat edukatif dan bukan pengganti nasihat tenaga kesehatan profesional.', 'This article is for education only and is not a substitute for professional medical advice.')}</span>
          </div>` : ''}
      </div>

      ${terkait.length ? `
        <div class="section-head" style="margin-top:26px;"><h2>${tr('Artikel Terkait', 'Related Articles')}</h2></div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${terkait.map(t => `
            <div class="list-item hoverable" data-open="${t.id}">
              <span class="item-icon" style="background:${this.KATEGORI[t.kategori].soft};font-size:1.2rem;">${t.emoji}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:.88rem;">${esc(t.judul)}</div>
                <div style="font-size:.78rem;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.ringkasan)}</div>
              </div>
              <ion-icon name="chevron-forward" style="color:var(--text-3);flex-shrink:0;"></ion-icon>
            </div>`).join('')}
        </div>` : ''}`;

    /* interaksi */
    $('#encyBack', el).onclick = () => { this.selected = null; this.render(el); window.scrollTo({ top: 0 }); };
    $('#encyBm', el).onclick = async () => { await this._toggleBookmark(a.id); this.renderDetail(el); };
    $$('[data-open]', el).forEach(c => c.onclick = () => {
      this.selected = c.dataset.open;
      this.render(el);
      window.scrollTo({ top: 0 });
    });
  }
};
