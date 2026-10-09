/* =========================================================
 * embed.js — 嵌入頁：讀取網址設定並渲染對應工具
 * 網址格式：embed.html?w=<工具 id>&c=<壓縮後的設定>
 * ========================================================= */
(function () {
  'use strict';
  const root = document.getElementById('root');
  const params = new URLSearchParams(location.search);
  const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  let state = { type: params.get('w'), cfg: null };
  let cleanup = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('無法載入 ' + src));
      document.head.appendChild(s);
    });
  }
  async function loadWidget(type) {
    if (NT.widgets[type]) return NT.widgets[type];
    if (!/^[a-z0-9-]+$/.test(type || '')) throw new Error('未知的工具類型');
    await loadScript('assets/js/widgets/' + type + '.js');
    if (!NT.widgets[type]) throw new Error('未知的工具類型');
    return NT.widgets[type];
  }

  function resolveTheme(t) {
    if (t === 'dark' || t === 'light') return t;
    return mq && mq.matches ? 'dark' : 'light';
  }

  function render() {
    const def = NT.widgets[state.type];
    if (!def || !state.cfg) return;
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) {} }
    cleanup = null;
    const cfg = state.cfg;
    const theme = resolveTheme(cfg.theme);
    document.documentElement.dataset.theme = theme;
    document.body.className = 'bg-' + (cfg.bg || 'card') + ' w-' + state.type;
    root.innerHTML = '';
    root.removeAttribute('style');
    try {
      cleanup = def.render(root, cfg, { theme: theme });
    } catch (e) {
      showError('顯示時發生錯誤：' + e.message);
      console.error(e);
    }
  }

  function showError(msg) {
    document.body.className = 'bg-card';
    root.innerHTML =
      '<div class="nt-error"><div class="nt-error-icon">⚠️</div><div>' + NT.esc(msg) +
      '</div><div class="nt-error-hint">請回到工具網站重新產生嵌入連結</div></div>';
  }

  if (mq && mq.addEventListener) {
    mq.addEventListener('change', () => {
      if (state.cfg && state.cfg.theme === 'auto') render();
    });
  }

  // 網站內的即時預覽：父頁面以 postMessage 傳入最新設定（不需重新載入）
  window.addEventListener('message', async (e) => {
    if (e.source !== window.parent || e.origin !== location.origin) return;
    const d = e.data || {};
    if (d.type !== 'nt-config') return;
    try {
      const def = await loadWidget(d.w);
      state = { type: d.w, cfg: NT.merge(def.defaults, d.cfg) };
      render();
    } catch (err) {
      showError(err.message);
    }
  });

  /** 匯出為 PNG（由網站呼叫） */
  window.ntExport = async function (scale) {
    if (!window.html2canvas) await loadScript('assets/vendor/html2canvas.min.js');
    const el = root.querySelector('[data-export]') || root.firstElementChild;
    document.body.classList.add('exporting');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const bg = getComputedStyle(document.body).backgroundColor;
      const canvas = await window.html2canvas(el, {
        scale: scale || 2,
        useCORS: true,
        backgroundColor: bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : null,
        windowWidth: Math.max(document.documentElement.clientWidth, el.scrollWidth),
        windowHeight: Math.max(document.documentElement.clientHeight, el.scrollHeight),
      });
      return canvas.toDataURL('image/png');
    } finally {
      document.body.classList.remove('exporting');
    }
  };

  (async function init() {
    try {
      if (!state.type) {
        if (params.get('preview')) return; // 等待父頁面傳入設定
        throw new Error('連結中缺少工具類型');
      }
      const def = await loadWidget(state.type);
      const partial = await NT.decode(params.get('c') || '');
      state.cfg = NT.merge(def.defaults, partial);
      render();
    } catch (e) {
      showError(e.message || '連結無法讀取');
    }
  })();
})();
