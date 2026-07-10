/* ============================================================
   TUMARA — Kalkulasi kesehatan
   BMR (Mifflin-St Jeor), TDEE, BMI, target air, siklus tidur,
   dan Skor Keseimbangan tiga pilar.
   ============================================================ */

const Calc = {

  AKTIVITAS: [
    { key: 'sedentary', get label() { return tr('Jarang bergerak (banyak duduk)', 'Mostly sitting (sedentary)'); },                  faktor: 1.2 },
    { key: 'ringan',    get label() { return tr('Aktivitas ringan (olahraga 1–3×/minggu)', 'Lightly active (exercise 1–3×/week)'); }, faktor: 1.375 },
    { key: 'sedang',    get label() { return tr('Aktivitas sedang (olahraga 3–5×/minggu)', 'Moderately active (exercise 3–5×/week)'); }, faktor: 1.55 },
    { key: 'aktif',     get label() { return tr('Aktif (olahraga 6–7×/minggu)', 'Active (exercise 6–7×/week)'); },                   faktor: 1.725 },
    { key: 'sangat',    get label() { return tr('Sangat aktif (atlet / kerja fisik berat)', 'Very active (athlete / heavy physical work)'); }, faktor: 1.9 }
  ],

  // BMR — rumus Mifflin-St Jeor
  bmr({ jenisKelamin, berat, tinggi, usia }) {
    const base = 10 * berat + 6.25 * tinggi - 5 * usia;
    return Math.round(jenisKelamin === 'P' ? base - 161 : base + 5);
  },

  tdee(bmr, aktivitasKey) {
    const a = this.AKTIVITAS.find(x => x.key === aktivitasKey) || this.AKTIVITAS[1];
    return Math.round(bmr * a.faktor);
  },

  bmi(berat, tinggi) {
    const m = tinggi / 100;
    return +(berat / (m * m)).toFixed(1);
  },

  bmiInfo(bmi) {
    if (bmi < 18.5) return { kategori: tr('Berat badan kurang', 'Underweight'), warna: '#3b82f6', badge: 'badge-blue',
      pesan: tr('Tubuhmu butuh asupan lebih. Makan teratur dengan gizi seimbang, ya.', 'Your body needs a bit more fuel. Eat regularly with balanced nutrition, okay?') };
    if (bmi < 25)   return { kategori: tr('Normal / ideal', 'Normal / ideal'), warna: '#10b981', badge: 'badge-green',
      pesan: tr('Keren! Pertahankan pola makan seimbang dan tetap aktif bergerak.', 'Awesome! Keep up your balanced diet and stay active.') };
    if (bmi < 30)   return { kategori: tr('Berat badan berlebih', 'Overweight'), warna: '#f59e0b', badge: 'badge-amber',
      pesan: tr('Fokus pada kebiasaan sehat: porsi seimbang dan rutin bergerak — bukan diet ekstrem.', 'Focus on healthy habits: balanced portions and regular movement — not extreme diets.') };
    return { kategori: tr('Obesitas', 'Obese'), warna: '#ef4444', badge: 'badge-red',
      pesan: tr('Mulai perlahan dari kebiasaan kecil, dan bicarakan dengan tenaga kesehatan bila perlu.', 'Start slowly with small habits, and talk to a health professional if needed.') };
  },

  // Rentang berat ideal (BMI 18.5 – 24.9)
  idealRange(tinggi) {
    const m = tinggi / 100;
    return {
      min: +(18.5 * m * m).toFixed(1),
      max: +(24.9 * m * m).toFixed(1)
    };
  },

  // Target air: ± 35 ml per kg berat badan → gelas 250 ml
  waterTarget(berat) {
    const liter = +((berat * 35) / 1000).toFixed(1);
    const gelas = clamp(Math.round((berat * 35) / 250), 6, 12);
    return { liter, gelas };
  },

  // Kalkulator siklus tidur — siklus 90 menit + ±15 menit untuk terlelap
  // mode 'bangun': dari jam bangun → jam mulai tidur
  // mode 'tidur' : dari jam tidur (sekarang) → jam bangun
  sleepTimes(hh, mm, mode = 'bangun') {
    const results = [];
    for (const cycles of [6, 5, 4, 3]) {
      const totalMin = cycles * 90 + 15;
      let t = hh * 60 + mm;
      t = mode === 'bangun' ? t - totalMin : t + totalMin;
      t = ((t % 1440) + 1440) % 1440;
      const H = String(Math.floor(t / 60)).padStart(2, '0');
      const M = String(t % 60).padStart(2, '0');
      results.push({
        cycles,
        time: `${H}:${M}`,
        durasi: `${(cycles * 90 / 60).toFixed(1).replace('.0', '')} ${tr('jam', 'hours')}`,
        best: cycles >= 5
      });
    }
    return results;
  },

  /* ---------- Skor Keseimbangan (0–100) ---------- */

  healthScore(daily, user) {
    if (!daily) return 0;
    const parts = [];
    const targetAir = (user.targetAir || 8);
    parts.push(clamp((daily.air || 0) / targetAir, 0, 1));
    // tidur ideal remaja 8–10 jam; 7 jam masih cukup baik
    const tidur = daily.tidur || 0;
    parts.push(tidur >= 8 ? 1 : tidur >= 7 ? 0.8 : tidur > 0 ? clamp(tidur / 8, 0, 0.7) : 0);
    parts.push(daily.kalori > 0 ? 1 : 0);                    // sudah mencatat makan
    parts.push((daily.olahraga || 0) >= 20 ? 1 : clamp((daily.olahraga || 0) / 20, 0, 1));
    return Math.round(parts.reduce((s, p) => s + p, 0) / parts.length * 100);
  },

  productivityScore(tasks) {
    const today = todayStr();
    const dueToday = tasks.filter(t => t.tenggat === today);
    const overdue = tasks.filter(t => t.status !== 'selesai' && t.tenggat && t.tenggat < today);
    let score;
    if (dueToday.length === 0) {
      score = overdue.length === 0 ? 90 : 55;
    } else {
      const done = dueToday.filter(t => t.status === 'selesai').length;
      score = Math.round((done / dueToday.length) * 100);
    }
    return clamp(score - overdue.length * 10, 0, 100);
  },

  financeScore(transactions) {
    const bulan = monthStr();
    const txBulan = transactions.filter(t => (t.tanggal || '').startsWith(bulan));
    if (!txBulan.length) return 50;
    const masuk  = txBulan.filter(t => t.tipe === 'masuk').reduce((s, t) => s + t.jumlah, 0);
    const keluar = txBulan.filter(t => t.tipe === 'keluar').reduce((s, t) => s + t.jumlah, 0);
    const saldoOk = masuk - keluar >= 0 ? 60 : 20;
    const rajinCatat = 40; // sudah mencatat bulan ini
    return clamp(saldoOk + rajinCatat, 0, 100);
  },

  balanceScore({ daily, user, tasks, transactions }) {
    const h = this.healthScore(daily, user);
    const p = this.productivityScore(tasks);
    const f = this.financeScore(transactions);
    return { total: Math.round((h + p + f) / 3), health: h, prod: p, fin: f };
  },

  balanceMessage(total) {
    if (total >= 80) return tr('Luar biasa! Tubuh, pikiran, dan dompetmu seimbang hari ini. 🌱', 'Amazing! Your body, mind, and wallet are in balance today. 🌱');
    if (total >= 60) return tr('Sudah bagus — tinggal sedikit lagi untuk hari yang benar-benar seimbang.', 'Looking good — just a little more for a truly balanced day.');
    if (total >= 40) return tr('Pelan-pelan saja. Selesaikan satu hal kecil dulu, sisanya menyusul.', 'Take it easy. Finish one small thing first, the rest will follow.');
    return tr('Hari baru, kesempatan baru. Mulai dari check-in kecil di bawah ini, yuk!', 'New day, new chance. Start with a small check-in below!');
  }
};
