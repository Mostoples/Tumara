/* ============================================================
   TUMARA — Version Check
   Mengecek version.json secara berkala; bila versi di server
   berbeda dari versi yang sedang dimuat, halaman di-refresh
   otomatis agar pengguna selalu memakai aset (JS/CSS/ikon)
   versi terbaru dan tidak nyangkut di cache lama.
   ============================================================ */
(() => {
  const VERSION_URL = 'version.json';
  const CHECK_INTERVAL_MS = 5 * 60 * 1000;
  let knownVersion = null;
  let reloading = false;

  async function fetchVersion() {
    try {
      const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.version ? String(data.version) : null;
    } catch {
      return null;
    }
  }

  function notifyAndReload() {
    reloading = true;
    const bar = document.createElement('div');
    bar.textContent = 'Tumara memperbarui ke versi terbaru…';
    bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;padding:10px 16px;'
      + 'text-align:center;font:600 14px/1.4 "Plus Jakarta Sans",system-ui,sans-serif;'
      + 'background:#059669;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.15);';
    document.body.appendChild(bar);
    setTimeout(() => location.reload(), 700);
  }

  async function checkForUpdate() {
    if (reloading) return;
    const latest = await fetchVersion();
    if (!latest) return;
    if (knownVersion === null) {
      knownVersion = latest;
      return;
    }
    if (latest !== knownVersion) notifyAndReload();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  window.addEventListener('focus', checkForUpdate);
  setInterval(checkForUpdate, CHECK_INTERVAL_MS);
  checkForUpdate();
})();
