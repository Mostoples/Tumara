# Bab 14 — Deploy & Pemeliharaan

> **Tujuan bab ini:** Anda men-deploy Tumara ke Firebase Hosting sehingga aplikasi bisa dibuka dari HP mana pun lewat URL publik, memahami bagaimana `scripts/stamp-version.js` menyalakan mekanisme "ada versi baru" dari Bab 13 secara otomatis di setiap deploy, mulai memakai Git untuk menyimpan riwayat perubahan kode Anda, dan punya kebiasaan rutin untuk merawat aplikasi setelah tayang.

| | |
|---|---|
| **Perkiraan waktu** | ~60 menit |
| **Sebelum ini** | [Bab 13 — Menjadikan Tumara PWA](13-menjadikan-pwa.md) |
| **Anda butuh** | Firebase CLI terpasang & `firebase login` sukses (Bab 04 Bagian 8), Security Rules sudah dipasang (Bab 12), proyek Tumara yang sudah berjalan lancar di `localhost` |

## Apa yang kita bangun di bab ini

Sejauh ini Tumara hanya hidup di komputer Anda — dibuka lewat `localhost` atau `file://`, hanya bisa dicoba oleh Anda sendiri. Di bab ini Anda mengetik satu perintah, `firebase deploy`, dan Tumara pindah ke server Google: punya alamat internet sungguhan, bisa dibuka siapa saja yang tahu URL-nya, dari HP siswa maupun laptop guru.

Tapi deploy bukan cuma "klik sekali lalu selesai". Kita akan bongkar apa sebenarnya yang dikirim, apa yang sengaja ditinggal, dan bagaimana satu skrip kecil (`scripts/stamp-version.js`) diam-diam menyalakan seluruh mekanisme "ada versi baru, muat ulang" yang Anda bangun di Bab 13. Di penghujung bab, Anda juga mulai memakai **Git** — bukan untuk deploy, tapi supaya Anda punya riwayat perubahan kode sendiri, seperti draft berlapis di Google Docs.

Gambaran alurnya:

```
Anda ketik:  firebase deploy
                  │
                  ▼
   1. predeploy hook jalan dulu:
      node scripts/stamp-version.js
      → menulis version.json BARU
                  │
                  ▼
   2. Firebase CLI mengunggah:
      - semua file hosting (kecuali yang di "ignore")
      - firestore.rules + firestore.indexes.json
                  │
                  ▼
   3. Tumara tayang di:
      https://nama-proyek.web.app
                  │
                  ▼
   4. HP pengguna yang sedang membuka Tumara:
      version-check.js (Bab 13) mendeteksi
      version.json berubah → beri tahu → reload
```

## 1. Firebase Hosting secukupnya

**Firebase Hosting** adalah server gratis milik Google yang tugasnya sederhana: menyimpan file statis Anda (HTML, CSS, JS, gambar) dan menyajikannya ke siapa pun yang membuka URL-nya, lengkap dengan **HTTPS otomatis** (gembok aman di address bar, tanpa Anda mengurus sertifikat apa pun) dan **CDN global** (file Anda disalin ke banyak lokasi server di dunia, supaya pengguna di mana pun memuatnya cepat, bukan menunggu satu server jauh di belahan bumi lain).

Anda sudah bertemu potongan konfigurasinya di Bab 04 Bagian 8, saat `firebase init` pertama kali menulis `firebase.json`. Salah satu baris yang dijelaskan sekilas di sana adalah:

```json
"hosting": { "public": "." }
```

Ingat kembali maknanya, karena bab ini akan sering menyinggungnya: `"public": "."` berarti **seluruh folder proyek** Anda (tanda titik = folder saat ini) adalah yang dipublikasikan ke internet — bukan folder `dist/` atau `build/` hasil proses kompilasi terpisah, seperti pada proyek yang memakai *build step* (React, Vue, dan semacamnya). Ini konsisten dengan filosofi "tanpa build step" yang sudah ditegaskan sejak Bab 02: Anda menulis `app.html`, `js/db.js`, `css/style.css` apa adanya, dan itu persis file yang nanti dibaca browser pengguna — tidak ada langkah tersembunyi yang mengubah bentuknya sebelum tayang.

Konsekuensinya: kalau Anda menyimpan file di folder proyek, ia berpotensi ikut ter-upload ke internet publik saat deploy — **kecuali** Anda sengaja mengecualikannya. Itu topik Bagian 2.

Soal **CDN global** tadi, layak diperjelas dengan analogi sekolah: bayangkan Tumara punya satu gudang arsip pusat (server asal file Anda), lalu Google membuat beberapa fotokopi gudang itu di banyak kota berbeda di dunia — bukan supaya datanya berbeda, tapi supaya siswa di Jakarta tak perlu menunggu permintaannya "menyeberang" ke server yang jauh, cukup dilayani dari salinan terdekat. Anda tak perlu mengatur ini sama sekali; Firebase Hosting melakukannya otomatis begitu Anda deploy. Yang perlu Anda ingat hanyalah: **satu deploy, tayang di banyak lokasi sekaligus** — bukan sesuatu yang Anda ulang-ulang per wilayah.

## 2. `firebase.json` dibedah penuh

Inilah isi `firebase.json` yang sebenarnya dipakai proyek Tumara saat ini:

```json
// firebase.json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": ".",
    "predeploy": [
      "node scripts/stamp-version.js"
    ],
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "scripts/**",
      "docs/**",
      "*.md",
      "**/*.md",
      "*.pdf",
      "*.docx",
      "*.log",
      "deploy-rules.sh"
    ],
    "headers": [
      {
        "source": "**/*.@(html|js|css|json)",
        "headers": [
          { "key": "Cache-Control", "value": "no-cache" }
        ]
      },
      {
        "source": "assets/**",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=86400" }
        ]
      }
    ]
  },
  "emulators": {
    "auth": { "host": "127.0.0.1", "port": 9099 },
    "firestore": { "host": "127.0.0.1", "port": 8080 },
    "ui": { "enabled": false },
    "singleProjectMode": true
  }
}
```

Mari bongkar tiap bagian.

**`firestore.rules` dan `firestore.indexes.json`** — dua file yang mengatur database, bukan hosting. `rules` adalah Security Rules yang Anda tulis lengkap di Bab 12 (siapa boleh baca/tulis apa). `indexes` adalah daftar indeks komposit yang dibutuhkan query gabungan, seperti roster siswa per kelas (`users where role=='siswa' && kelasId==...`) yang disebut di README proyek. Keduanya dikirim ke Firestore, **bukan** ke server hosting — makanya mereka berdiri sendiri di luar blok `hosting`.

**`hosting.public: "."`** — sudah dijelaskan di Bagian 1: seluruh folder proyek jadi akar situs.

**`hosting.predeploy`** — daftar perintah yang Firebase CLI jalankan secara **otomatis**, tepat sebelum file mulai diunggah, setiap kali Anda mengetik `firebase deploy`. Tumara hanya punya satu: `node scripts/stamp-version.js`. Ini kunci penghubung ke Bab 13 — dibahas tuntas di Bagian 3 dan 4 di bawah.

**`hosting.ignore`** — daftar pola file/folder yang **TIDAK** ikut ke server, walau berada di dalam folder `public: "."`. Ini penting justru karena `"public": "."` mencakup segalanya secara bawaan — `ignore` adalah cara Anda bilang "kecuali yang ini". Isinya:

- `firebase.json` sendiri — file konfigurasi ini tak perlu terlihat pengguna.
- `**/.*` — semua file/folder yang namanya diawali titik (mis. `.git`, `.firebaserc`, `.gitignore`) — ini biasanya file konfigurasi alat bantu, bukan bagian aplikasi.
- `**/node_modules/**` — folder paket npm kalau ada (Tumara sendiri tak punya `node_modules` untuk aplikasinya, tapi pola ini dijaga untuk berjaga-jaga).
- `scripts/**` — folder skrip bantu seperti `stamp-version.js` sendiri; skrip ini dijalankan di komputer Anda saat deploy, bukan sesuatu yang perlu ada di server.
- `docs/**` — **folder modul ajar yang sedang Anda baca ini sendiri!** Bahan belajar internal tak perlu ikut tayang ke internet publik bersama aplikasinya.
- `*.md`, `**/*.md` — semua file Markdown (README, catatan proyek, dan modul ini) — dokumen sumber, bukan bagian aplikasi yang perlu diakses pengguna.
- `*.pdf`, `*.docx` — dokumen kantor lain yang mungkin tersimpan di folder proyek (mis. rancangan awal) — alasan sama: dokumen internal, bukan aset aplikasi.
- `*.log` — berkas log kalau ada.
- `deploy-rules.sh` — skrip bantu lain yang khusus untuk Anda di terminal, bukan untuk pengguna.

Pola umumnya: **apa pun yang bukan bagian dari aplikasi yang benar-benar dijalankan browser pengguna, dikecualikan.** Kalau nanti Anda menambah folder dokumentasi baru atau skrip baru, ingat untuk mengeceknya lagi terhadap daftar ini — kalau lupa, file itu tetap ter-upload (bukan salah, tapi biasanya tak perlu).

**`hosting.headers`** — mengatur instruksi **Cache-Control** yang dikirim server ke browser bersama tiap file, yaitu aturan "boleh kamu simpan salinan file ini berapa lama sebelum tanya server lagi?". Ada dua aturan berbeda di sini, dan bedanya bukan kebetulan:

```json
{
  "source": "**/*.@(html|js|css|json)",
  "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
}
```

Semua file `.html`, `.js`, `.css`, `.json` diberi `no-cache`. Ini **bukan** berarti "jangan pernah simpan cache" — artinya "boleh simpan, tapi **selalu tanya server dulu** apakah masih valid sebelum dipakai". Kenapa ini penting: ini bekerja **langsung berpasangan** dengan strategi *network-first* Service Worker yang Anda bangun di Bab 13. Kalau file HTML/JS/CSS dibiarkan ber-cache lama tanpa pengecekan, pengguna bisa terjebak memakai kode lama berhari-hari walau Anda sudah deploy versi baru — header `no-cache` inilah yang memaksa browser selalu memverifikasi dulu ke server, selaras dengan `version-check.js` yang juga rutin mengecek `version.json` (Bagian 3 di bawah). Dua mekanisme ini saling menguatkan, bukan saling menggantikan.

```json
{
  "source": "assets/**",
  "headers": [{ "key": "Cache-Control", "value": "public, max-age=86400" }]
}
```

Sebaliknya, semua isi folder `assets/` (logo, ikon PWA) boleh disimpan browser selama `max-age=86400` detik (24 jam) tanpa tanya server sama sekali. Alasannya: gambar seperti logo sekolah jarang berubah — kalau tiap gambar juga dipaksa `no-cache`, browser akan berulang kali mengunduh ulang file yang sama persis, memperlambat aplikasi tanpa manfaat. Prinsipnya: **file yang sering berubah (kode) dijaga ketat, file yang jarang berubah (gambar) dibiarkan lebih longgar.**

**`emulators`** — konfigurasi Firestore/Auth Emulator yang sempat disinggung sekilas di Bab 04 (opsional, untuk mencoba tanpa memakai kuota sungguhan). Tidak relevan untuk deploy, jadi tak dibahas lebih jauh di bab ini.

## 3. `scripts/stamp-version.js` — mekanisme penanda versi

Baris `predeploy` di atas menjalankan satu file kecil setiap kali Anda deploy. Inilah isinya:

```js
// scripts/stamp-version.js
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'version.json');

const current = JSON.parse(fs.readFileSync(FILE, 'utf8')).version || '0.0.0';
const base = String(current).split('+')[0];

const d = new Date();
const p = (n) => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  + `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;

const version = `${base}+${stamp}`;
fs.writeFileSync(FILE, JSON.stringify({ version }) + '\n');
console.log(`version.json -> ${version}`);
```

Alurnya, dalam bahasa manusia, empat langkah:

1. **Baca versi lama.** Skrip membuka `version.json` yang sudah ada (mis. berisi `{"version":"1.7.0+20260716-194437"}`), atau mulai dari `'0.0.0'` kalau file belum berisi apa-apa.
2. **Buang cap waktu lama.** `base = String(current).split('+')[0]` memotong string di tanda `+` dan hanya menyimpan bagian sebelumnya — jadi `"1.7.0+20260716-194437"` menjadi `"1.7.0"`. Ini bagian **versi semantik** yang Anda tulis tangan sendiri (naik dari `1.7.0` ke `1.7.1` atau `1.8.0` hanya kalau Anda mengubahnya sendiri di `version.json`).
3. **Tempel cap waktu baru.** `stamp` dibangun dari tanggal & jam saat ini (`YYYYMMDD-HHMMSS`), lalu digabung ke `base` dengan tanda `+`, menghasilkan sesuatu seperti `"1.7.0+20260717-081530"`.
4. **Tulis ulang `version.json`.** File ditimpa dengan `{"version": "1.7.0+20260717-081530"}`.

Isi `version.json` di proyek Tumara saat ini, sebelum deploy berikutnya:

```json
// version.json
{"version":"1.7.0+20260716-194437"}
```

Kenapa dipecah jadi dua bagian (`1.7.0` + cap waktu), bukan cuma cap waktu saja? Karena keduanya menjawab pertanyaan berbeda. Angka `1.7.0` menjawab "versi fitur yang mana" — berguna kalau Anda perlu bicara ke rekan guru "pakai versi 1.7". Cap waktu di belakangnya menjawab "build yang mana persis" — dan inilah yang benar-benar dipakai untuk mendeteksi perubahan, dijelaskan sekarang.

**Sekarang hubungkan eksplisit ke Bab 13.** Ingat kembali `js/version-check.js` yang Anda bangun di bab itu — ia berjalan di HP/laptop setiap pengguna yang sedang membuka Tumara, mengecek `version.json` secara berkala:

```js
// js/version-check.js
const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
...
if (latest !== knownVersion) notifyAndReload();
```

Sebelum bab ini, `version.json` cuma file statis yang Anda tulis manual — kalau Anda lupa mengubahnya setelah mengedit kode, `version-check.js` tak akan pernah mendeteksi apa pun, walau kode di server sudah berbeda. **Predeploy hook inilah yang menutup lingkarannya:** setiap `firebase deploy`, tanpa Anda perlu ingat, `stamp-version.js` menulis cap waktu baru ke `version.json` **sebelum** file-file itu ikut diunggah. Jadi begitu deploy selesai, `version.json` di server sudah pasti berbeda dari yang terakhir dibaca browser pengguna — `version-check.js` mendeteksinya di pengecekan berikutnya (interval 5 menit, atau saat tab kembali aktif), memunculkan pesan "Tumara memperbarui ke versi terbaru…", lalu me-reload halaman secara otomatis. Pengguna tak perlu tahu apa-apa soal deploy; mereka cuma melihat aplikasinya sendiri yang "membarui diri".

## 4. Jujur soal jebakan predeploy hook

> ⚠️ **Jujur soal ini:** komentar di dalam `scripts/stamp-version.js` sendiri mewanti-wanti satu hal yang lahir dari pengalaman nyata:
> ```js
> // scripts/stamp-version.js
> // CATATAN: perintah predeploy TIDAK BOLEH mengandung karakter '='.
> // Firebase CLI menolak perintah ber-'=' dengan peringatan lalu tetap
> // melaporkan sukses — gagal secara diam-diam. Itulah sebabnya logika
> // ini tinggal di file terpisah, bukan sebagai `node -e "..."` inline.
> ```
> Artinya: kalau perintah `predeploy` di `firebase.json` ditulis dengan cara yang membuat Firebase CLI menolaknya (mis. mengandung karakter yang tak didukung), CLI **tidak menghentikan proses deploy**. Ia hanya menampilkan peringatan lalu tetap melanjutkan seolah semua baik-baik saja — hosting Anda tetap ter-upload, hanya saja `version.json` **tidak pernah berubah**. Akibatnya `version-check.js` di HP pengguna tak pernah mendeteksi apa pun, walau kode aplikasi di server sudah berbeda jauh dari yang mereka pakai. Pengguna bisa nyangkut memakai JS/CSS lama tanpa tahu ada versi baru — kegagalan yang tak kelihatan sama sekali dari layar terminal Anda, karena CLI tetap melaporkan "sukses".
>
> Kebiasaan yang disarankan untuk menghindarinya: **setelah setiap `firebase deploy`, buka langsung `https://nama-proyek-anda.web.app/version.json` di browser dan cek isinya.** Cap waktu di dalamnya (`+20260717-...`) harus menunjukkan waktu deploy yang baru saja Anda lakukan, bukan waktu lama. Kalau tak berubah, sesuatu di langkah predeploy diam-diam gagal — periksa ulang isi `firebase.json`.

## 5. Login & init CLI

Anda sudah menyiapkan ini di Bab 04 Bagian 8 — bagian ini hanya mengingatkan sebelum deploy sungguhan.

Pastikan `firebase login` masih tersambung (kalau sesi lama, jalankan ulang perintah yang sama; kalau sudah tersimpan, CLI langsung menampilkan email Anda tanpa membuka browser lagi). Pastikan juga proyek yang aktif memang proyek Tumara yang benar — dicek lewat isi `.firebaserc`:

```json
// .firebaserc
{
  "projects": {
    "default": "tumara-id"
  }
}
```

Kalau Anda mengelola lebih dari satu proyek Firebase sekaligus (misalnya sekolah A punya proyeknya sendiri, sekolah B punya proyeknya sendiri, dan Anda membantu keduanya dari komputer yang sama), jalankan `firebase use --add` untuk menambahkan proyek lain dan memberinya nama alias, lalu `firebase use <alias>` untuk berpindah sebelum deploy. Ini mencegah kesalahan fatal: deploy ke proyek sekolah yang salah.

## 6. Deploy PENUH vs SEBAGIAN

Ini bagian paling gampang salah, dan paling penting Anda hafal. Firebase CLI menawarkan beberapa cara deploy, dan mereka **tidak setara**.

`firebase deploy` (tanpa embel-embel apa pun) mengirim **semuanya sekaligus**: hosting (HTML/CSS/JS), Security Rules, dan indeks Firestore. **Inilah yang harus jadi kebiasaan default Anda** — bukan pengecualian.

`firebase deploy --only firestore` **hanya** mengirim Security Rules dan indeks. README proyek Tumara sendiri sudah memperingatkan ini dengan tegas:

> ⚠️ **Selalu `firebase deploy` (penuh) setiap ada perubahan kode.** `--only firestore:rules` **tidak** mengirim hosting (HTML/JS/CSS) maupun index — perubahan tampilan/logika tak akan live.

Ini jebakan yang nyata: Anda mengedit tampilan atau logika di `js/views/`, menjalankan `firebase deploy --only firestore` karena kebetulan juga baru mengubah rules, lalu bingung kenapa perubahan tampilan tak muncul di URL produksi — padahal terminal melaporkan "Deploy complete!". Deploy-nya memang sukses, hanya saja yang dikirim bukan bagian yang Anda ubah.

`firebase deploy --only hosting` kebalikannya: hanya mengirim file hosting, **tidak** menyentuh Security Rules maupun indeks — cocok kalau Anda yakin betul rules tak berubah sama sekali.

Ringkasnya:

| Perintah | Yang terkirim | Kapan dipakai |
|---|---|---|
| `firebase deploy` | Hosting + Rules + Indexes | **Default.** Dipakai hampir selalu, terutama kalau tak yakin apa yang berubah |
| `firebase deploy --only hosting` | Hosting saja | Anda yakin 100% hanya HTML/CSS/JS yang berubah, rules tak disentuh |
| `firebase deploy --only firestore` | Rules + Indexes saja | Anda yakin 100% hanya `firestore.rules`/`firestore.indexes.json` yang berubah, tak ada perubahan tampilan/logika |

Kalau ragu — dan sebagai pemula Anda akan sering ragu — pakai `firebase deploy` penuh. Ia sedikit lebih lama (mengecek dan mengunggah lebih banyak), tapi tak pernah meninggalkan sesuatu yang seharusnya live.

Sekilas apa yang Anda lihat di terminal saat `firebase deploy` berjalan, supaya tak asing: CLI akan menampilkan baris-baris seperti "running predeploy script", lalu "1.3.2+... version.json" (keluaran `console.log` dari `stamp-version.js`, Bagian 3), lalu daftar file yang diperiksa untuk hosting, lalu proses upload rules & indexes, dan diakhiri baris "✔ Deploy complete!" beserta URL hosting Anda. Kalau salah satu tahap gagal sungguhan (bukan gagal diam-diam seperti Bagian 4), CLI biasanya berhenti dengan pesan error berwarna merah dan **tidak** menampilkan "Deploy complete!" — jadi baris terakhir itu sendiri sudah jadi tanda kasar yang cukup dipercaya, selama Anda tetap melengkapinya dengan verifikasi `version.json` di Bagian 7.

## 7. Setelah deploy: verifikasi

Terminal melaporkan "Deploy complete!" bukan akhir cerita — itu baru tanda proses **pengiriman** selesai, belum tanda semuanya **benar**. Setelah tiap deploy, biasakan empat pengecekan ini:

1. **Buka URL hosting Anda** — `https://nama-proyek-anda.web.app` (atau custom domain kalau sudah dipasang). Pastikan halaman termuat, bukan layar putih atau error 404.
2. **Buka DevTools → Console**, pastikan tak ada pesan error merah saat halaman dimuat. Error di sini sering berarti ada file yang gagal termuat (cek lagi apakah file itu sengaja atau tak sengaja masuk daftar `ignore`).
3. **Buka DevTools → Application → Service Workers** (dari Bab 13), pastikan status menunjukkan Service Worker yang baru sudah aktif (bukan yang lama, "waiting" bertahan lama). Kalau CACHE_VERSION di `sw.js` sudah dinaikkan (Bagian 10) dan Anda me-refresh sekali lagi, versi lama harusnya tergantikan.
4. **Buka `https://nama-proyek-anda.web.app/version.json` langsung di tab baru.** Ini pengecekan paling cepat dan paling jujur — kalau cap waktunya menunjukkan waktu deploy yang baru saja Anda lakukan, seluruh rantai predeploy hook (Bagian 3–4) sudah bekerja benar.

Kalau salah satu pengecekan di atas menunjukkan versi lama padahal deploy sudah "sukses", jangan buru-buru curiga ke server dulu — coba **hard refresh** di browser Anda sendiri (biasanya `Ctrl+Shift+R` atau `Cmd+Shift+R`) sebelum menyimpulkan ada yang salah. Browser Anda sendiri bisa saja masih menyimpan salinan lama dari sebelum header `no-cache` (Bagian 2) sempat berlaku, terutama kalau ini deploy pertama kali domain itu diakses. Kalau setelah hard refresh `version.json` tetap menunjukkan cap waktu lama, barulah curigai predeploy hook (Bagian 4).

## 8. Domain terdaftar untuk Authentication

Satu jebakan lagi yang sudah diperingatkan sejak Bab 04 dan Bab 06, dan sekarang akhirnya relevan: **Authentication → Settings → Authorized domains**. Ini daftar alamat web yang diizinkan memproses login lewat proyek Firebase Anda. Secara bawaan, `localhost` dan domain uji coba Firebase (`*.firebaseapp.com`, `*.web.app`) sudah masuk daftar — cukup untuk latihan di `localhost` dan untuk domain `.web.app` bawaan hosting.

Tapi kalau Anda memasang **custom domain** sendiri untuk sekolah (mis. `tumara.sekolahanda.id`) lewat Firebase Hosting, domain baru itu **tidak otomatis** masuk daftar Authorized domains — Anda harus menambahkannya manual. Kalau lupa, gejalanya membingungkan: login lancar total di `localhost`, tapi di domain produksi baru gagal dengan cara yang tak jelas (biasanya popup Google langsung tertutup, atau error domain tak dikenali). Ini bukan bug kode Anda — Firebase memang sengaja menolak permintaan Authentication dari domain yang tak terdaftar, sebagai lapisan keamanan tambahan.

Memasang custom domain sendiri (menghubungkan `tumara.sekolahanda.id` ke Firebase Hosting lewat pengaturan DNS di penyedia domain Anda) adalah proses terpisah yang tak dibahas tuntas di modul ini — cukup diketahui bahwa langkah ini ada, biasanya dilakukan lewat menu **Hosting → Add custom domain** di Console, dan setelah tersambung, jangan lupa langkah Authorized domains di atas sebagai langkah terakhir yang sering terlewat.

## 9. Git untuk riwayat perubahan — pengenalan singkat

Sejauh modul ini, setiap kali Anda mengedit file, versi lamanya hilang begitu Anda menyimpan ulang. Kalau ternyata perubahan itu merusak sesuatu dan Anda sudah lupa persis apa yang diubah, tak ada jalan kembali. **Git** adalah alat yang menutup celah itu.

**Git** adalah program yang mencatat riwayat perubahan folder proyek Anda dari waktu ke waktu — bukan menyimpan banyak salinan file secara manual (`app-v1.html`, `app-v2-fix.html`, `app-final-benar.html`...), tapi menyimpan **titik-titik simpan** yang bisa Anda lihat kembali kapan saja.

> **Analogi:** Anda mungkin sudah biasa dengan riwayat versi di Google Docs — tiap beberapa saat, Docs otomatis menyimpan titik yang bisa Anda buka lagi kalau draft terbaru ternyata lebih buruk dari sebelumnya. Git mirip itu, hanya saja **Anda** yang memutuskan kapan titik itu dibuat (bukan otomatis tiap beberapa detik), dan Anda menulis catatan singkat untuk tiap titik — disebut ***commit*** — supaya nanti mudah dikenali "titik ini isinya apa".

Kenapa ini penting untuk proyek sekolah seperti Tumara: Anda mengerjakannya bertahap, bab demi bab, minggu demi minggu. Suatu hari Anda mengubah `js/db.js` untuk menambah fitur baru, ternyata halaman siswa jadi error semua, dan Anda sudah lupa persis baris mana yang diubah. Tanpa Git, satu-satunya jalan adalah menelusuri ulang kode baris demi baris. Dengan Git, Anda tinggal melihat riwayat commit dan membandingkan versi yang bekerja dengan versi yang error.

Perintah dasar yang cukup Anda hafal untuk sekarang:

```bash
git init
```
Dijalankan **sekali saja**, di folder proyek Tumara, untuk mulai mencatat riwayat di folder itu.

```bash
git status
```
Menampilkan file mana yang berubah sejak titik simpan terakhir — dijalankan kapan saja Anda ingin tahu "apa yang sudah saya ubah?".

```bash
git add js/db.js
```
Menandai file tertentu sebagai "siap dimasukkan ke titik simpan berikutnya". Anda bisa menambah beberapa file sekaligus, atau `git add .` untuk menandai semua yang berubah.

```bash
git commit -m "Tambah validasi NIS di form onboarding"
```
Membuat titik simpan baru dari file-file yang sudah ditandai `add`, dengan pesan singkat menjelaskan **apa** yang berubah — pesan inilah yang nanti membantu Anda (atau rekan) mengerti riwayat tanpa membaca ulang kodenya.

```bash
git log
```
Menampilkan daftar semua titik simpan yang pernah dibuat, dari yang terbaru — riwayat lengkap proyek Anda.

Kapan sebaiknya Anda membuat commit? Tak ada aturan kaku, tapi kebiasaan yang wajar untuk proyek sekolah: setiap kali Anda menyelesaikan satu bagian yang bekerja (satu fitur kecil, satu perbaikan bug, akhir dari satu sesi belajar mengikuti modul ini), buat satu commit. Jangan menunggu sampai "seluruh aplikasi selesai" untuk commit pertama — semakin sering Anda commit di titik-titik yang bekerja, semakin mudah nanti kembali ke titik terakhir yang baik kalau ada perubahan berikutnya yang ternyata merusak sesuatu. Sebaliknya, satu commit raksasa berisi perubahan seminggu penuh membuat pesan commit-nya kabur ("perbaikan banyak hal") dan sulit dilacak bagian mana yang menyebabkan masalah.

Satu file yang layak Anda kenal sekarang: **`.gitignore`**. Ini daftar file/folder yang **sengaja tidak** ikut dicatat Git — biasanya karena berisi rahasia, atau terlalu besar/tak perlu untuk riwayat kode. Cuplikan dari `.gitignore` proyek Tumara:

```
# .gitignore (cuplikan)
*.log
.firebase/
node_modules/
.env
```

Idenya: log dan folder cache (`.firebase/`) berubah tiap kali Anda menjalankan sesuatu — mencatatnya di Git cuma membuat riwayat penuh sampah yang tak berguna. `.env` (kalau nanti Anda memakainya) biasanya berisi rahasia — Git menyimpan **seluruh** riwayat selamanya, jadi sekali rahasia ter-*commit*, ia tetap ada di riwayat walau filenya dihapus belakangan. Aturan aman: kalau ragu apakah sebuah file boleh ikut dicatat, tambahkan dulu ke `.gitignore` sebelum sempat ter-*commit*, bukan sesudahnya.

Modul ini berhenti di sini soal Git — cukup untuk mencatat riwayat proyek Anda sendiri di komputer Anda sendiri. Ada dunia lebih luas soal Git yang tak dibahas: *branch* (mengerjakan beberapa versi paralel), *remote*/GitHub (menyimpan riwayat itu di internet, berkolaborasi dengan orang lain secara bersamaan). Kalau nanti Anda bekerja sama dengan developer lain untuk mengembangkan Tumara lebih jauh, itu saatnya mempelajari GitHub — di luar cakupan modul pemula ini.

## 10. Kebiasaan merawat aplikasi (checklist rutin)

Deploy pertama bukan akhir — Tumara yang sudah tayang butuh perawatan rutin. Berikut kebiasaan yang layak dijadwalkan, bukan cuma dilakukan sekali:

- **Pantau kuota Firestore gratis.** Buka Firebase Console → bagian Usage, lihat grafik pemakaian baca/tulis harian. Ingat dari Bab 05 Bagian 8: sebagian besar cache di `js/db.js` justru dibangun untuk menghemat jatah baca ini — kalau grafiknya melonjak tajam, itu tanda ada bagian kode yang membaca Firestore lebih sering dari seharusnya, layak diperiksa ulang.
- **Backup data secara berkala.** Dua cara: ekspor lewat Firebase Console (Firestore Database → Export), atau lewat fungsi yang sudah tersedia di `js/db.js`:
  ```js
  // js/db.js — sekitar baris 820
  async exportAll() {
    const out = { user: { ...adapter.user }, diekspor: new Date().toISOString() };
    delete out.user.passHash;
    for (const c of COLLECTIONS) out[c] = await adapter.list(c);
    return out;
  }
  ```
  Fungsi ini mengumpulkan seluruh koleksi data pengguna yang sedang login jadi satu objek JavaScript, siap diunduh sebagai file (biasanya dipanggil dari tombol "Ekspor Data" di halaman profil siswa). Ini backup per-pengguna, bukan backup seluruh database sekolah — untuk itu, pakai ekspor lewat Console.
- **Tinjau ulang Security Rules tiap kali ada fitur baru.** Fitur baru sering berarti koleksi Firestore baru atau field baru — Bab 12 sudah menjelaskan Rules-nya, tapi Rules **tidak otomatis mengikuti** fitur baru Anda. Kalau Anda menambah koleksi tanpa menambah aturan untuknya, Firestore menolaknya secara default (aman tapi fitur baru jadi tak berfungsi) — atau lebih buruk, kalau Rules Anda longgar, siapa saja bisa membaca/menulis data yang seharusnya dibatasi.
- **Naikkan `CACHE_VERSION` di `sw.js` tiap ada perubahan berarti.** Dari Bab 13, Service Worker memakai `CACHE_VERSION` (saat ini `'v21'` di proyek Tumara) untuk tahu kapan harus membuang cache lama dan mengambil ulang semua aset. Deploy sendiri tak menaikkan angka ini otomatis — itu keputusan manual Anda, biasanya untuk perubahan besar (bukan setiap typo kecil).
- **Jangan lupa `firebase deploy` PENUH tiap ada perubahan** — bukan cuma sebagian, seperti ditegaskan berulang di Bagian 6. Ini kebiasaan yang paling sering dilupakan justru karena tergesa-gesa.

Kelima kebiasaan di atas punya satu benang merah yang sama: masing-masing berdiri di atas keputusan desain yang sudah Anda pelajari di bab-bab sebelumnya (cache Bab 05, Security Rules Bab 12, Service Worker Bab 13, predeploy hook bab ini). Merawat aplikasi bukan pekerjaan baru yang terpisah — ia hanya memastikan mekanisme yang sudah Anda bangun tetap dipakai dengan disiplin, bukan sekali pasang lalu dilupakan.

---

## ✅ Cek hasil

- [ ] `https://nama-proyek-anda.web.app` terbuka dari HP lain (bukan laptop pengembang Anda) — coba kirim link ke ponsel sendiri atau minta rekan membukanya.
- [ ] Login dengan akun yang sama seperti di `localhost` berhasil di URL produksi, tanpa error domain.
- [ ] `https://nama-proyek-anda.web.app/version.json` menunjukkan cap waktu deploy paling baru (bukan cap waktu lama).
- [ ] DevTools → Console di URL produksi tidak menunjukkan error merah saat halaman dimuat.
- [ ] DevTools → Application → Service Workers menunjukkan Service Worker yang aktif, bukan macet di status lama.
- [ ] `git log` di terminal menunjukkan setidaknya satu commit dengan pesan yang Anda tulis sendiri.
- [ ] `.gitignore` proyek Anda sudah memuat `.firebase/`, `*.log`, dan file rahasia semacam `.env` kalau ada.

## 🧯 Kalau macet

| Gejala | Penyebab biasanya | Perbaikan |
|---|---|---|
| Deploy sukses tapi tampilan masih versi lama | Memakai `firebase deploy --only firestore`, bukan deploy penuh | Jalankan `firebase deploy` tanpa `--only` (Bagian 6) |
| `version.json` di URL produksi tidak berubah setelah deploy | Predeploy hook diam-diam gagal (mis. karakter tak didukung di perintahnya) | Cek ulang `firebase.json` bagian `predeploy`, jalankan `node scripts/stamp-version.js` manual di terminal untuk lihat pesan error aslinya |
| Login gagal di URL produksi, tapi lancar di `localhost` | Domain hosting baru belum masuk **Authorized domains** | Authentication → Settings → Authorized domains → tambahkan domain Anda (Bagian 8) |
| `firebase: command not found` | Firebase CLI belum terpasang atau sesi terminal berbeda | Rujuk Bab 04 Bagian 8, pasang ulang `npm install -g firebase-tools` |
| Halaman produksi menampilkan error 404 untuk file tertentu | File tersebut masuk daftar `hosting.ignore` tanpa sengaja, atau memang belum pernah dibuat | Cek pola di `firebase.json` Bagian 2, pastikan file itu tak cocok dengan salah satu pola `ignore` |
| Commit Git menyertakan file rahasia (mis. kunci layanan pihak ketiga) | Lupa menambahkan file itu ke `.gitignore` sebelum `git add` | Tambahkan ke `.gitignore` segera; kalau sudah ter-*commit*, sadari riwayat lama tetap menyimpannya — pertimbangkan ganti kunci/rahasia itu, bukan cuma menghapus filenya |
| Pengguna lama mengeluh aplikasi "aneh"/error setelah Anda deploy pembaruan besar | Service Worker lama masih menyimpan aset lama di cache, `CACHE_VERSION` lupa dinaikkan | Naikkan `CACHE_VERSION` di `sw.js` (Bagian 10), deploy ulang penuh |
| Kuota Firestore gratis mendekati batas harian | Ada bagian kode yang membaca Firestore lebih sering dari seharusnya, cache di `js/db.js` mungkin tak terpakai di jalur itu | Tinjau grafik Usage di Console, telusuri fungsi mana yang paling sering memanggil `list()`/`get()` (Bab 05) |
| Browser Anda sendiri masih menampilkan versi lama walau `version.json` di server sudah baru | Salinan lama masih tersimpan di cache browser, belum sempat diverifikasi ulang | Hard refresh (`Ctrl+Shift+R`), atau tunggu `version-check.js` mendeteksinya di pengecekan berikutnya (Bagian 7) |

## 🧪 Latihan

1. **Deploy perubahan kecil.** Ubah satu teks di salah satu halaman (mis. judul di `index.html`), jalankan `firebase deploy`, lalu verifikasi tiga hal: teks baru muncul di URL produksi, `version.json` menunjukkan cap waktu baru, dan tak ada error di Console.
2. **Buat commit Git pertama Anda.** Jalankan `git init` (kalau belum), `git add`, lalu `git commit -m "..."` dengan pesan yang menjelaskan perubahan Bagian 1 tadi. Jalankan `git log` untuk melihat hasilnya.
3. ⭐ **Buat kebiasaan: daftar cek pribadi sebelum deploy.** Tulis di README proyek Anda sendiri (boleh bagian baru, mis. "Sebelum Deploy") sebuah daftar centang singkat — misalnya: cek Console tak ada error, cek Security Rules kalau ada koleksi baru, cek `CACHE_VERSION` sudah dinaikkan kalau perubahan besar, gunakan `firebase deploy` penuh. Daftar ini milik Anda sendiri — sesuaikan dengan kebiasaan kerja Anda.
4. ⭐ **Coba jebakan predeploy dengan sengaja (di lingkungan latihan, bukan proyek sekolah sungguhan).** Buka `scripts/stamp-version.js`, ubah sesaat baris `const FILE = ...` menjadi path yang salah (mis. tambahkan folder yang tak ada), simpan, lalu jalankan `node scripts/stamp-version.js` langsung di terminal (tanpa deploy). Amati pesan errornya. Ini membantu Anda mengenali seperti apa rupa kegagalan skrip ini kalau suatu saat terjadi sungguhan — lalu kembalikan baris itu ke semula sebelum benar-benar deploy.

## 📌 Ringkasan

- **Firebase Hosting** menayangkan seluruh folder proyek (`public: "."`) sebagai situs, dengan HTTPS otomatis dan CDN global — konsisten dengan filosofi "tanpa build step" Tumara.
- `firebase.json` mengatur apa yang dikirim (`hosting.public`), apa yang dikecualikan (`hosting.ignore` — dokumentasi, skrip, file rahasia), dan aturan cache (`hosting.headers` — `no-cache` untuk kode, cache lebih lama untuk `assets/`).
- `scripts/stamp-version.js` berjalan otomatis lewat `predeploy` setiap `firebase deploy`, menempelkan cap waktu baru ke `version.json` — inilah yang membuat `version-check.js` (Bab 13) bisa mendeteksi "ada versi baru" di HP pengguna. Kalau langkah ini diam-diam gagal, pengguna tak pernah diberi tahu — selalu verifikasi `version.json` setelah deploy.
- **Selalu `firebase deploy` penuh**, bukan `--only firestore` atau `--only hosting`, kecuali Anda yakin betul hanya satu sisi yang berubah.
- Domain hosting baru harus ditambahkan ke **Authorized domains** di Authentication, atau login akan gagal aneh di produksi walau lancar di lokal.
- **Git** (`git init`, `add`, `commit`, `status`, `log`) memberi Anda riwayat perubahan kode — titik simpan yang bisa dilihat kembali, seperti draft berlapis di Google Docs. `.gitignore` menjaga rahasia dan file besar tak ikut tercatat.
- Merawat aplikasi yang sudah tayang itu rutin, bukan sekali jadi: pantau kuota, backup data (`DB.exportAll()`), tinjau Security Rules tiap fitur baru, naikkan `CACHE_VERSION` untuk perubahan besar, dan jangan pernah lupa deploy penuh.

**Berikutnya:** [Bab 15 — Referensi](15-referensi.md)
