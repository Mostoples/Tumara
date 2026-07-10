/* ============================================================
   TUMARA — PWA
   ------------------------------------------------------------
   • Mendaftarkan service worker (sw.js) untuk kemampuan
     install & offline. SW-nya sendiri yang menjaga agar cache
     tidak menumpuk (lihat sw.js).
   • Menangkap event beforeinstallprompt lalu menyalakan tombol
     "Install Aplikasi" di halaman index & di profil.
   • Elemen apa pun ber-atribut [data-pwa-install] otomatis
     disembunyikan bila belum bisa/di-install, dan diklik →
     memicu prompt install (atau instruksi manual di iOS).
   ============================================================ */
(() => {
  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  const PWA = {
    deferredPrompt: null,

    get installed() { return isStandalone(); },
    // Bisa ditawarkan bila ada prompt tersimpan, atau iOS (install manual).
    get available() {
      return !this.installed && (!!this.deferredPrompt || isIOS());
    },

    async prompt() {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        try { await this.deferredPrompt.userChoice; } catch {}
        this.deferredPrompt = null;
        this.sync();
        return;
      }
      if (isIOS()) this._iosHint();
    },

    // Selaraskan semua tombol/kartu [data-pwa-install] dengan status saat ini.
    sync() {
      const show = this.available;
      document.querySelectorAll('[data-pwa-install]').forEach((elemen) => {
        elemen.hidden = !show;
        if (!elemen.dataset.pwaBound) {
          elemen.dataset.pwaBound = '1';
          elemen.addEventListener('click', (e) => { e.preventDefault(); PWA.prompt(); });
        }
      });
    },

    _iosHint() {
      const pesan = (window.I18N && I18N.lang === 'en')
        ? 'To install: tap the Share button, then "Add to Home Screen".'
        : 'Untuk memasang: ketuk tombol Bagikan, lalu "Add to Home Screen".';
      if (window.toast) toast(pesan, 'info');
      else alert(pesan);
    },
  };

  window.PWA = PWA;

  // --- Tangkap prompt install bawaan browser ---
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();               // cegah mini-infobar, tampilkan tombol kita
    PWA.deferredPrompt = e;
    PWA.sync();
  });

  window.addEventListener('appinstalled', () => {
    PWA.deferredPrompt = null;
    PWA.sync();
    if (window.toast) toast(
      (window.I18N && I18N.lang === 'en') ? 'Tumara installed 🎉' : 'Tumara berhasil dipasang 🎉'
    );
  });

  // --- Daftarkan service worker ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  // Sinkron awal (untuk iOS & bila prompt sudah tertangkap sebelumnya).
  document.addEventListener('DOMContentLoaded', () => PWA.sync());
})();
