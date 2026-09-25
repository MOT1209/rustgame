import { isNewer, safeDownloadUrl } from './version-compare.js';

(function () {
  'use strict';

  const VERSION_URL = './version.json';
  const DISMISS_KEY = 'app_update_dismissed';

  function localVersion() {
    const app = window.RASHID_APP || {};
    return { version: String(app.version || ''), buildNumber: Number(app.buildNumber) || 0 };
  }

  function el(tag, style, text) {
    const node = document.createElement(tag);
    if (style) node.style.cssText = style;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function readDismissed() {
    try { return localStorage.getItem(DISMISS_KEY); } catch (e) { return null; }
  }

  function writeDismissed(version) {
    try { localStorage.setItem(DISMISS_KEY, version); } catch (e) { /* private mode */ }
  }

  function showUpdateBanner(remote) {
    if (document.getElementById('update-banner')) return;

    const banner = el('div');
    banner.id = 'update-banner';
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:99999;' +
      'background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;' +
      'padding:10px 16px;font-family:sans-serif;direction:rtl;text-align:right;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.4);transition:transform 0.35s ease;' +
      'transform:translateY(-100%);pointer-events:auto';

    const row = el('div', 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;max-width:600px;margin:0 auto');
    const text = el('div', 'flex:1;min-width:180px');
    text.appendChild(el('div', 'font-size:15px;font-weight:700;margin-bottom:2px', '🔄 تحديث متاح v' + remote.version));
    if (typeof remote.changelog === 'string' && remote.changelog) {
      text.appendChild(el('div', 'font-size:12px;opacity:0.8', remote.changelog));
    }
    row.appendChild(text);

    const actions = el('div', 'display:flex;gap:8px;flex-shrink:0');

    const dismiss = el('button', 'padding:6px 14px;border:1px solid rgba(255,255,255,0.3);border-radius:8px;background:transparent;color:#fff;cursor:pointer;font-size:13px', 'لاحقاً');
    dismiss.onclick = function () {
      writeDismissed(remote.version);
      banner.style.transform = 'translateY(-100%)';
      setTimeout(() => banner.remove(), 350);
    };
    actions.appendChild(dismiss);

    const apkUrl = safeDownloadUrl(remote.apkUrl, window.location.href);
    if (apkUrl) {
      const link = el('a', 'padding:6px 16px;border-radius:8px;background:#22c55e;color:#fff;font-size:13px;font-weight:600;text-decoration:none', '📥 تحميل APK');
      link.href = apkUrl;
      link.setAttribute('download', '');
      actions.appendChild(link);
    }

    row.appendChild(actions);
    banner.appendChild(row);
    document.body.appendChild(banner);
    requestAnimationFrame(() => { banner.style.transform = 'translateY(0)'; });
  }

  async function checkForUpdates() {
    const local = localVersion();
    if (!local.version && !local.buildNumber) return;
    try {
      const res = await fetch(VERSION_URL, { cache: 'no-store' });
      if (!res.ok) return;
      const remote = await res.json();
      if (!remote || typeof remote.version !== 'string') return;
      if (!isNewer(remote, local)) return;
      if (readDismissed() === remote.version) return;
      showUpdateBanner(remote);
    } catch (e) {
      // silent fail — offline, blocked request, or invalid JSON
    }
  }

  window.addEventListener('load', () => { setTimeout(checkForUpdates, 2000); });
})();
