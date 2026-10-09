/* =========================================================
 * app.js — 網站主程式：路由、側邊欄、編輯器、我的作品、圖庫、帳號
 * ========================================================= */
(function () {
  'use strict';
  const NT = window.NT;
  const esc = NT.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const view = $('#view');
  const LOG = window.NT_CHANGELOG || [];
  const GUIDE = window.NT_GUIDE || [];
  NT.version = (LOG[0] && LOG[0].version) || '1.0.0';

  function h(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function go(path) {
    location.hash = '#' + path;
  }
  function fmtTime(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '/' + NT.pad2(d.getMonth() + 1) + '/' + NT.pad2(d.getDate()) + ' ' + NT.pad2(d.getHours()) + ':' + NT.pad2(d.getMinutes());
  }
  const ICON = {
    sun: '<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="3.6"/><path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M16.5 12.3A7 7 0 0 1 7.7 3.5a7 7 0 1 0 8.8 8.8z"/></svg>',
    tri: '<svg viewBox="0 0 16 16" width="12" height="12"><path d="M6 4l4 4-4 4" fill="currentColor"/></svg>',
    up: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4-4 4 4"/></svg>',
    down: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',
    dup: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 10.5V4a1 1 0 0 1 1-1h6.5"/></svg>',
    del: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>',
    plus: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
  };

  /* =========================================================
   * Toast / Modal / 複製
   * ========================================================= */
  NT.toast = function (msg, type) {
    const el = h('<div class="toast ' + (type || '') + '"></div>');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), type === 'error' ? 4200 : 2400);
  };
  const toast = NT.toast;

  function modal(opts) {
    const wrap = h('<div class="modal-wrap"><div class="modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true"></div></div>');
    const box = wrap.firstElementChild;
    if (opts.title) box.appendChild(h('<h3>' + esc(opts.title) + '</h3>'));
    const body = document.createElement('div');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    box.appendChild(body);
    const close = () => {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
    };
    if (opts.actions && opts.actions.length) {
      const acts = h('<div class="modal-actions"></div>');
      opts.actions.forEach((a) => {
        const b = h('<button class="btn ' + (a.cls || '') + '"></button>');
        b.textContent = a.label;
        b.addEventListener('click', async () => {
          if (!a.onClick) return close();
          b.disabled = true;
          try {
            const r = await a.onClick(close, body);
            if (r !== false) close();
          } catch (e) {
            toast(e.message || String(e), 'error');
          } finally {
            b.disabled = false;
          }
        });
        acts.appendChild(b);
      });
      box.appendChild(acts);
    }
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('mousedown', (e) => {
      if (e.target === wrap) close();
    });
    $('#modalRoot').appendChild(wrap);
    const first = box.querySelector('input,textarea');
    if (first && !opts.noFocus) setTimeout(() => first.focus(), 30);
    return { el: box, body, close };
  }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise((resolve) => {
      let done = false;
      const m = modal({
        title,
        body: '<p class="muted" style="margin:6px 0 0">' + esc(text) + '</p>',
        noFocus: true,
        actions: [
          { label: '取消', cls: 'btn-ghost' },
          { label: okLabel || '確定', cls: danger ? 'btn-danger' : 'btn-primary', onClick: () => { done = true; resolve(true); } },
        ],
      });
      const obs = new MutationObserver(() => {
        if (!m.el.isConnected) { obs.disconnect(); if (!done) resolve(false); }
      });
      obs.observe($('#modalRoot'), { childList: true });
    });
  }

  async function copy(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) {}
      ta.remove();
      if (!ok) {
        toast('無法自動複製，請手動選取複製', 'error');
        return false;
      }
    }
    toast(okMsg || '已複製', 'ok');
    return true;
  }

  function download(href, filename) {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /** 壓縮本機圖片成 dataURL */
  function compressImage(file, max, quality, square) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) return reject(new Error('請選擇圖片檔'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
        if (square) {
          const s = Math.min(sw, sh);
          sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s;
        }
        const scale = Math.min(1, max / Math.max(sw, sh));
        const c = document.createElement('canvas');
        c.width = Math.round(sw * scale);
        c.height = Math.round(sh * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('圖片讀取失敗')); };
      img.src = url;
    });
  }
  function pickFile(accept) {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = accept;
      inp.onchange = () => resolve(inp.files[0] || null);
      inp.click();
    });
  }

  /* =========================================================
   * 主題
   * ========================================================= */
  function siteTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('nt.theme', t); } catch (e) {}
    $('#themeBtn').innerHTML = t === 'dark' ? ICON.sun : ICON.moon;
    const m = $('meta[name="theme-color"]');
    if (m) m.content = t === 'dark' ? '#191919' : '#ffffff';
  }
  $('#themeBtn').addEventListener('click', () => {
    setTheme(siteTheme() === 'dark' ? 'light' : 'dark');
    if (B) {
      // 編輯中不重新載入頁面，只更新預覽背景與色票
      B.stage = siteTheme();
      $$('#pvStage button').forEach((x) => x.classList.toggle('on', x.dataset.v === B.stage));
      applyPreviewSize();
      renderForm();
    } else {
      route();
    }
  });
  setTheme(siteTheme());

  /* =========================================================
   * 側邊欄
   * ========================================================= */
  function closeSidebar() { document.body.classList.remove('sb-open'); }
  $('#menuBtn').addEventListener('click', () => document.body.classList.add('sb-open'));
  $('#sbClose').addEventListener('click', closeSidebar);
  $('#scrim').addEventListener('click', closeSidebar);
  $('#sbVersion').textContent = 'v' + NT.version + ' · ' + (LOG[0] ? LOG[0].date : '');

  function renderSidebar(path) {
    const user = NT.auth.current();
    $('#sbUser').innerHTML = user
      ? '<a class="sb-user-card" href="#/account"><span class="sb-avatar">' + esc(user[0]) + '</span><span class="sb-user-text">' + esc(user) + '</span></a>'
      : '<div class="sb-user-card"><span class="sb-avatar guest">訪</span><span class="sb-user-text">訪客模式</span><button class="sb-user-btn" data-go="/account">登入</button></div>';
    const item = (p, ic, tx, extra) =>
      '<a class="sb-item' + (path === p ? ' active' : '') + '" href="#' + p + '"><span class="ic">' + ic + '</span><span class="tx">' + esc(tx) + '</span>' + (extra || '') + '</a>';
    const works = user ? NT.store.works().length : 0;
    let html = item('/', '🏠', '首頁');
    html += '<div class="sb-label">嵌入工具</div>';
    NT.widgetOrder.forEach((id) => {
      const d = NT.widgets[id];
      html += item('/tool/' + id, d.icon, d.name, d.kind === 'formula' ? '<span class="badge">公式</span>' : '');
    });
    html += '<div class="sb-label">我的空間</div>';
    html += item('/works', '📁', '我的作品', works ? '<span class="chip">' + works + '</span>' : '');
    html += item('/library', '🗂️', '我的圖庫');
    html += item('/account', '👤', user ? '帳號設定' : '登入 / 註冊');
    html += '<div class="sb-label">說明</div>';
    html += item('/guide', '📖', '使用教學');
    html += item('/changelog', '📝', '更新紀錄');
    $('#sbNav').innerHTML = html;
  }
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) {
      e.preventDefault();
      go(g.dataset.go);
    }
    if (e.target.closest('.sb-item, .sb-ws, .sb-user-card')) closeSidebar();
  });

  function setCrumbs(items) {
    $('#crumbs').innerHTML = items.map((it, i) =>
      (i ? '<span class="sep">/</span>' : '') + (it.href ? '<a href="#' + it.href + '">' + esc(it.label) + '</a>' : '<span>' + esc(it.label) + '</span>')
    ).join('');
    document.title = (items.length > 1 ? items[items.length - 1].label + ' · ' : '') + 'Notion 嵌入工具箱';
  }

  /* =========================================================
   * 路由
   * ========================================================= */
  let cleanupView = null;
  function route() {
    if (cleanupView) { try { cleanupView(); } catch (e) {} cleanupView = null; }
    B = null;
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const path = '/' + parts.join('/');
    $('#mobileBar').classList.remove('show');
    $('#mobileBar').hidden = true;
    const top = parts[0] || '';
    let navPath = '/' + (top ? top : '');
    if (top === 'tool') navPath = '/tool/' + parts[1];
    renderSidebar(navPath);
    closeSidebar();
    window.scrollTo(0, 0);
    if (top === 'tool' && NT.widgets[parts[1]]) return pageTool(parts[1], parts[2]);
    if (top === 'works') return pageWorks();
    if (top === 'library') return pageLibrary();
    if (top === 'account') return pageAccount();
    if (top === 'guide') return pageGuide();
    if (top === 'changelog') return pageChangelog();
    if (path !== '/') return go('/');
    return pageHome();
  }
  window.addEventListener('hashchange', route);
  NT.auth.onChange(() => renderSidebar(currentNav()));
  function currentNav() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'tool') return '/tool/' + parts[1];
    return '/' + (parts[0] || '');
  }

  /* =========================================================
   * 首頁
   * ========================================================= */
  function footer() {
    return '<div class="footer"><span>Notion 嵌入工具箱 v' + esc(NT.version) + '</span><a href="#/guide">使用教學</a><a href="#/changelog">更新紀錄</a></div>';
  }
  function pageHome() {
    setCrumbs([{ label: 'Notion 嵌入工具箱' }]);
    const user = NT.auth.current();
    const recent = user ? NT.store.recent().filter((r) => NT.widgets[r.type]).slice(0, 8) : [];
    const cards = NT.widgetOrder.map((id) => {
      const d = NT.widgets[id];
      return '<a class="card" href="#/tool/' + id + '"><div class="card-thumb"><iframe data-w="' + id + '" loading="lazy" tabindex="-1" title="' + esc(d.name) + ' 預覽"></iframe></div>' +
        '<div class="card-body"><div class="card-title"><span>' + d.icon + '</span>' + esc(d.name) + '</div><div class="card-desc">' + esc(d.desc) + '</div></div></a>';
    }).join('');
    view.innerHTML =
      '<div class="cover"><div class="cover-art">⏳ 🗓️ 💬 🖼️</div></div>' +
      '<div class="page"><div class="page-icon">🧩</div><h1 class="page-title">Notion 嵌入工具箱</h1>' +
      '<p class="page-desc">為你的 Notion 頁面打造好看的小工具。選擇工具 → 調整內容 → 複製連結 → 在 Notion 輸入 <code>/embed</code> 貼上，就完成了。</p>' +
      (user
        ? '<div class="callout blue">👋 <div>歡迎回來，<b>' + esc(user) + '</b>！你的作品與圖庫都會自動保存在這台裝置。</div></div>'
        : '<div class="callout">👋 <div>目前是<b>訪客模式</b>：可以自由產生嵌入連結與圖片。<a href="#/account">登入或註冊</a>後，還能儲存作品、建立個人圖庫並記錄最近使用的工具。</div></div>') +
      (recent.length
        ? '<h2 class="h2">最近使用</h2><div class="recent-row">' + recent.map((r) => {
          const d = NT.widgets[r.type];
          return '<a class="recent-item" href="#/tool/' + r.type + '"><span class="ic">' + d.icon + '</span><span class="tx">' + esc(d.name) + '</span><span class="sub">' + fmtTime(r.time) + '</span></a>';
        }).join('') + '</div>'
        : '') +
      '<h2 class="h2">所有工具</h2><p class="muted small" style="margin:0">點擊卡片開始製作，預覽即為實際嵌入的效果。</p>' +
      '<div class="cards">' + cards + '</div>' +
      '<h2 class="h2">說明</h2><div class="page-links">' +
      '<a class="page-link" href="#/guide"><span>📖</span><span class="tx">使用教學</span><span class="sub">如何嵌入 Notion、圖片網址、匯出圖片…</span></a>' +
      '<a class="page-link" href="#/changelog"><span>📝</span><span class="tx">更新紀錄</span><span class="sub">' + (LOG[0] ? 'v' + esc(LOG[0].version) + ' · ' + esc(LOG[0].date) : '') + '</span></a>' +
      '</div>' + footer() + '</div>';
    // 卡片預覽：直接載入嵌入頁
    const theme = siteTheme();
    $$('.card-thumb iframe', view).forEach(async (f) => {
      const c = await NT.encode({ theme, bg: 'transparent' });
      f.src = 'embed.html?w=' + f.dataset.w + '&c=' + c;
    });
  }

  /* =========================================================
   * 工具編輯頁
   * ========================================================= */
  const drafts = {};
  const openSet = new WeakSet();
  let B = null;

  function pageTool(type, workId) {
    const def = NT.widgets[type];
    let cfg = null;
    let work = null;
    const user = NT.auth.current();
    if (workId) {
      work = user ? NT.store.getWork(workId) : null;
      if (!work || work.type !== type) {
        toast(user ? '找不到這個作品' : '請先登入才能開啟作品', 'error');
        history.replaceState(null, '', '#/tool/' + type);
        work = null;
      } else {
        cfg = NT.merge(def.defaults, work.cfg);
      }
    }
    if (!cfg) {
      cfg = drafts[type] || NT.clone(def.defaults);
      drafts[type] = cfg;
    }
    if (user) NT.store.addRecent(type);
    B = {
      type, def, cfg, work, url: '', code: '',
      height: def.height || 300,
      width: 'full',
      stage: siteTheme(),
    };
    setCrumbs([{ label: 'Notion 嵌入工具箱', href: '/' }, { label: def.name }]);
    const isFx = def.kind === 'formula';

    view.innerHTML =
      '<div class="page wide">' +
      '<div class="page-icon sm">' + def.icon + '</div><h1 class="page-title">' + esc(def.name) + '</h1>' +
      '<p class="page-desc">' + esc(def.desc) + '</p>' +
      '<div class="builder">' +
      '<section class="editor" aria-label="編輯">' +
      '<div id="workBadge"></div>' +
      '<div class="toolbar-top">' +
      (isFx ? '' : '<button class="btn btn-sm" data-act="import">🔗 從連結匯入</button>') +
      '<button class="btn btn-sm btn-ghost" data-act="reset">↺ 重設為預設</button></div>' +
      '<div id="form"></div></section>' +
      '<section class="preview-col" aria-label="預覽與輸出">' +
      '<div class="panel" id="previewPanel"><div class="panel-head"><span class="panel-title">即時預覽</span>' +
      '<div class="seg sm" id="pvWidth">' +
      [['full', '自適應'], ['notion', 'Notion 頁寬'], ['phone', '手機']].map((o) => '<button data-v="' + o[0] + '" class="' + (B.width === o[0] ? 'on' : '') + '">' + o[1] + '</button>').join('') +
      '</div><div class="seg sm" id="pvStage" title="模擬 Notion 頁面背景">' +
      [['light', '☀️'], ['dark', '🌙']].map((o) => '<button data-v="' + o[0] + '" class="' + (B.stage === o[0] ? 'on' : '') + '">' + o[1] + '</button>').join('') +
      '</div></div>' +
      '<div class="preview-stage" id="pvStageBox"><iframe class="preview-frame" id="pvFrame" title="預覽"></iframe></div>' +
      '<div class="preview-note"><span>高度</span><input type="range" id="pvH" min="100" max="900" step="10" value="' + B.height + '"><span id="pvHVal">' + B.height + 'px</span>' +
      '<span>· 嵌入 Notion 後可拖曳邊緣調整大小</span></div></div>' +
      '<div class="panel" id="outPanel"><div class="panel-head"><span class="panel-title">' + (isFx ? '公式程式碼' : '嵌入連結') + '</span></div><div class="panel-body" id="outBody"></div></div>' +
      '</section></div>' + footer() + '</div>';

    renderWorkBadge();
    renderOutput();
    renderForm();
    applyPreviewSize();
    // 第一次載入預覽
    NT.buildEmbedUrl(type, cfg).then((url) => {
      if (!B || B.type !== type) return;
      const f = $('#pvFrame');
      f.addEventListener('load', postPreview);
      f.src = url;
    });
    updateOutput();

    const mb = $('#mobileBar');
    mb.hidden = false;
    mb.classList.add('show');
    $('span', mb.querySelector('[data-act="copy-main"]')).textContent = isFx ? '複製公式' : '複製嵌入連結';

    $('#pvH').addEventListener('input', (e) => {
      B.height = +e.target.value;
      applyPreviewSize();
    });
    $('#pvWidth').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      B.width = b.dataset.v;
      $$('#pvWidth button').forEach((x) => x.classList.toggle('on', x === b));
      applyPreviewSize();
    });
    $('#pvStage').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      B.stage = b.dataset.v;
      $$('#pvStage button').forEach((x) => x.classList.toggle('on', x === b));
      applyPreviewSize();
    });
    cleanupView = () => {
      clearTimeout(pvTimer);
      clearTimeout(urlTimer);
    };
  }

  function applyPreviewSize() {
    const f = $('#pvFrame');
    if (!f) return;
    f.style.height = B.height + 'px';
    f.style.width = { full: '100%', notion: '708px', phone: '375px' }[B.width];
    $('#pvHVal').textContent = B.height + 'px';
    const st = $('#pvStageBox');
    st.style.backgroundColor = B.stage === 'dark' ? '#191919' : '#ffffff';
    st.style.backgroundImage = 'radial-gradient(' + (B.stage === 'dark' ? 'rgba(255,255,255,.08)' : 'rgba(55,53,47,.08)') + ' 1px, transparent 1px)';
  }

  let pvTimer = null;
  let urlTimer = null;
  function onCfgChange(structural) {
    if (!B) return;
    if (structural) renderForm();
    clearTimeout(pvTimer);
    pvTimer = setTimeout(postPreview, 50);
    clearTimeout(urlTimer);
    urlTimer = setTimeout(updateOutput, 250);
  }
  function postPreview() {
    const f = $('#pvFrame');
    if (!B || !f || !f.contentWindow) return;
    const origin = location.origin === 'null' || location.protocol === 'file:' ? '*' : location.origin;
    f.contentWindow.postMessage({ type: 'nt-config', w: B.type, cfg: NT.clone(B.cfg) }, origin);
  }

  function renderWorkBadge() {
    const box = $('#workBadge');
    if (!box) return;
    box.innerHTML = B.work
      ? '<div class="work-badge">📁 正在編輯作品：<b>' + esc(B.work.name) + '</b><a data-act="leave-work">改為新作品</a></div>'
      : '';
  }

  function renderOutput() {
    const box = $('#outBody');
    if (!box) return;
    const user = NT.auth.current();
    const isFx = B.def.kind === 'formula';
    const save =
      '<button class="btn btn-sm" data-act="save">💾 ' + (B.work ? '更新作品' : '儲存到我的作品') + '</button>' +
      (B.work ? '<button class="btn btn-sm btn-ghost" data-act="save-as">另存新作品</button>' : '');
    if (isFx) {
      box.innerHTML =
        '<pre class="code-out" id="outCode"></pre>' +
        '<div class="btn-row"><button class="btn btn-primary" data-act="copy-code">📋 複製公式</button>' + save + '</div>' +
        '<div class="out-meta">貼到 Notion 資料庫的「公式 Formula」屬性中。' + (user ? '' : '登入後可儲存作品。') + '</div>';
    } else {
      box.innerHTML =
        '<div class="output-link"><input class="in" id="outUrl" readonly aria-label="嵌入連結" value="產生中…">' +
        '<button class="btn btn-primary" data-act="copy">複製嵌入連結</button></div>' +
        '<div class="out-meta" id="outMeta"></div>' +
        '<div class="out-actions">' +
        (B.def.exportable ? '<button class="btn btn-sm" data-act="export">📸 匯出 PNG 圖片</button>' : '') +
        '<a class="btn btn-sm" id="openNew" target="_blank" rel="noopener">↗ 新分頁開啟</a>' +
        '<button class="btn btn-sm" data-act="copy-iframe">&lt;/&gt; iframe 代碼</button>' +
        save + '</div>';
    }
  }

  async function updateOutput() {
    if (!B) return;
    const b = B;
    if (b.def.kind === 'formula') {
      b.code = b.def.output(b.cfg).code;
      const el = $('#outCode');
      if (el) el.textContent = b.code;
      return;
    }
    const url = await NT.buildEmbedUrl(b.type, b.cfg);
    if (B !== b) return;
    b.url = url;
    const inp = $('#outUrl');
    if (inp) inp.value = url;
    const a = $('#openNew');
    if (a) a.href = url;
    const meta = $('#outMeta');
    if (meta) {
      const long = url.length > 8000;
      meta.className = 'out-meta' + (long ? ' warn' : '');
      meta.textContent = long
        ? '⚠️ 連結較長（' + url.length.toLocaleString() + ' 字元），多半是因為使用了「上傳」的圖片。若 Notion 無法嵌入，請改用圖片網址。'
        : '在 Notion 輸入 /embed，貼上這個連結即可。設定都存在連結裡，不會失效。';
    }
  }

  // 編輯頁上的按鈕
  view.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t || !B) return;
    const act = t.dataset.act;
    if (act === 'copy') {
      if (!B.url) await updateOutput();
      copy(B.url, '已複製嵌入連結');
    } else if (act === 'copy-code') {
      updateOutput();
      copy(B.code, '已複製公式');
    } else if (act === 'copy-iframe') {
      if (!B.url) await updateOutput();
      copy('<iframe src="' + B.url + '" width="100%" height="' + B.height + '" style="border:0" loading="lazy"></iframe>', '已複製 iframe 代碼');
    } else if (act === 'export') {
      doExport(t);
    } else if (act === 'save') {
      doSave(false);
    } else if (act === 'save-as') {
      doSave(true);
    } else if (act === 'import') {
      doImport();
    } else if (act === 'reset') {
      if (await confirmBox('重設為預設值？', '目前的編輯內容會被清除。', '重設', true)) {
        B.cfg = NT.clone(B.def.defaults);
        if (!B.work) drafts[B.type] = B.cfg;
        onCfgChange(true);
      }
    } else if (act === 'leave-work') {
      B.work = null;
      B.cfg = NT.clone(B.cfg);
      drafts[B.type] = B.cfg;
      history.replaceState(null, '', '#/tool/' + B.type);
      renderWorkBadge();
      renderOutput();
      updateOutput();
    }
  });
  $('#mobileBar').addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t || !B) return;
    if (t.dataset.act === 'scroll-preview') {
      $('#previewPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (B.def.kind === 'formula') {
      updateOutput();
      copy(B.code, '已複製公式');
    } else {
      await updateOutput();
      copy(B.url, '已複製嵌入連結');
    }
  });

  async function doExport(btn) {
    const f = $('#pvFrame');
    if (!f || !f.contentWindow || !f.contentWindow.ntExport) return toast('預覽尚未載入完成', 'error');
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="border-color:var(--line2);border-top-color:var(--fg2)"></span> 匯出中…';
    try {
      const data = await f.contentWindow.ntExport(2);
      const name = (B.cfg.title || B.def.name).replace(/[\\/:*?"<>|\s]+/g, '_') + '.png';
      const body = h('<div><p class="muted small" style="margin:0">桌機可直接下載；手機請<b>長按圖片</b>儲存到相簿。</p><img class="export-img" alt="匯出的圖片"></div>');
      body.querySelector('img').src = data;
      modal({
        title: '📸 圖片已產生',
        body,
        wide: true,
        noFocus: true,
        actions: [
          { label: '關閉', cls: 'btn-ghost' },
          { label: '下載 PNG', cls: 'btn-primary', onClick: () => { download(data, name); return false; } },
        ],
      });
    } catch (err) {
      console.error(err);
      toast('匯出失敗：' + (err.message || err), 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  }

  function askLogin(msg) {
    modal({
      title: '需要登入',
      body: '<p class="muted" style="margin:6px 0 0">' + esc(msg) + '</p>',
      noFocus: true,
      actions: [
        { label: '稍後', cls: 'btn-ghost' },
        { label: '登入 / 註冊', cls: 'btn-primary', onClick: () => go('/account') },
      ],
    });
  }

  function doSave(asNew) {
    if (!NT.auth.current()) return askLogin('登入後就能把作品儲存起來，之後隨時回來修改。訪客模式仍可直接複製嵌入連結使用。');
    const partial = NT.diff(B.cfg, B.def.defaults);
    if (B.work && !asNew) {
      const w = NT.store.saveWork({ id: B.work.id, type: B.type, name: B.work.name, cfg: partial });
      if (w) { B.work = w; toast('已更新作品', 'ok'); renderSidebar(currentNav()); }
      return;
    }
    const def = B.cfg.title || B.cfg.aName || B.def.name;
    const body = h('<div><label class="field-label" for="wkName">作品名稱</label><input class="in" id="wkName" maxlength="60"></div>');
    body.querySelector('input').value = (def + (asNew ? '（副本）' : '')).slice(0, 60);
    body.querySelector('input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.target.closest('.modal').querySelector('.btn-primary').click();
    });
    modal({
      title: asNew ? '另存新作品' : '儲存到我的作品',
      body,
      actions: [
        { label: '取消', cls: 'btn-ghost' },
        {
          label: '儲存', cls: 'btn-primary', onClick: () => {
            const name = body.querySelector('input').value.trim() || B.def.name;
            const w = NT.store.saveWork({ type: B.type, name, cfg: partial });
            if (!w) return false;
            B.work = w;
            B.cfg = NT.clone(B.cfg);
            history.replaceState(null, '', '#/tool/' + B.type + '/' + w.id);
            renderWorkBadge();
            renderOutput();
            updateOutput();
            renderSidebar(currentNav());
            toast('已儲存到我的作品', 'ok');
          },
        },
      ],
    });
  }

  function doImport() {
    const body = h('<div><p class="muted small" style="margin:4px 0 10px">貼上之前在本網站產生的嵌入連結，就能載入當時的設定繼續編輯。</p><textarea class="in" rows="4" placeholder="https://…/embed.html?w=…&c=…"></textarea></div>');
    modal({
      title: '從連結匯入',
      body,
      actions: [
        { label: '取消', cls: 'btn-ghost' },
        {
          label: '匯入', cls: 'btn-primary', onClick: async () => {
            const text = body.querySelector('textarea').value.trim();
            if (!text) throw new Error('請貼上連結');
            let res;
            try { res = await NT.parseEmbedUrl(text); } catch (e) { throw new Error('連結無法讀取：' + e.message); }
            const def = NT.widgets[res.type];
            if (!def) throw new Error('找不到對應的工具');
            drafts[res.type] = NT.merge(def.defaults, res.partial);
            const target = '#/tool/' + res.type;
            if (location.hash === target) route();
            else location.hash = target;
            toast('已匯入設定', 'ok');
          },
        },
      ],
    });
  }

  /* ---------------- 表單產生器 ---------------- */
  function renderForm() {
    const box = $('#form');
    if (!box || !B) return;
    const active = document.activeElement;
    const keepId = active && box.contains(active) ? active.dataset.fid : null;
    box.innerHTML = '';
    buildFields(box, B.def.fields, B.cfg, B.cfg, null, 'f');
    if (keepId) {
      const el = box.querySelector('[data-fid="' + keepId + '"]');
      if (el) el.focus({ preventScroll: true });
    }
  }

  function buildFields(container, fields, obj, root, onInput, prefix) {
    fields.forEach((f, i) => {
      if (f.show && !f.show(obj, root)) return;
      if (f.type === 'section') {
        const hint = typeof f.hint === 'function' ? f.hint(obj, root) : f.hint;
        container.appendChild(h('<div class="form-section"><h3>' + esc(f.label) + '</h3>' + (hint ? '<div class="hint">' + esc(hint) + '</div>' : '') + '</div>'));
        return;
      }
      container.appendChild(buildField(f, obj, root, onInput, prefix + '-' + (f.k || i)));
    });
  }

  const EMOJIS = '🎉 🎂 💝 ❤️ ✨ ⭐ 🌙 ☀️ 🌸 🌿 🍀 🔥 📚 ✏️ 🎓 💼 ✈️ 🏖️ 🎄 🎆 🎁 🐶 🐱 ☕ 🍰 🎵 📷 🏠 💍 👶 💪 🏃 🎮 📅 ⏳ 🚀 🌈 🦋 🍓 💌'.split(' ');

  function buildField(f, obj, root, onInput, fid) {
    const wrap = h('<div class="field"></div>');
    const label = typeof f.label === 'function' ? f.label(obj, root) : f.label;
    const hint = typeof f.hint === 'function' ? f.hint(obj, root) : f.hint;
    const set = (v, structural) => {
      obj[f.k] = v;
      if (onInput) onInput();
      onCfgChange(structural);
    };
    const val = obj[f.k];
    const lab = label && f.type !== 'toggle' ? h('<label class="field-label"></label>') : null;
    if (lab) { lab.textContent = label; lab.htmlFor = fid; wrap.appendChild(lab); }
    let ctl;

    switch (f.type) {
      case 'text':
      case 'number': {
        ctl = h('<input class="in" type="' + (f.type === 'number' ? 'number' : 'text') + '">');
        ctl.value = val == null ? '' : val;
        if (f.ph) ctl.placeholder = f.ph;
        if (f.maxlength) ctl.maxLength = f.maxlength;
        ctl.addEventListener('input', () => set(f.type === 'number' ? +ctl.value : ctl.value, false));
        break;
      }
      case 'textarea': {
        ctl = h('<textarea class="in" rows="' + (f.rows || 3) + '"></textarea>');
        ctl.value = val || '';
        if (f.ph) ctl.placeholder = f.ph;
        ctl.addEventListener('input', () => set(ctl.value, false));
        break;
      }
      case 'emoji': {
        ctl = h('<div class="emoji-row"><input class="in" type="text" maxlength="16" placeholder="無"><button type="button" class="btn btn-sm btn-ghost">選擇 ▾</button></div>');
        const inp = ctl.querySelector('input');
        inp.value = val || '';
        inp.addEventListener('input', () => set(inp.value, false));
        ctl.querySelector('button').addEventListener('click', (e) => {
          e.stopPropagation();
          const old = ctl.querySelector('.emoji-pop');
          if (old) return old.remove();
          const pop = h('<div class="emoji-pop">' + EMOJIS.map((em) => '<button type="button">' + em + '</button>').join('') + '</div>');
          pop.addEventListener('click', (ev) => {
            const b = ev.target.closest('button');
            if (!b) return;
            inp.value = b.textContent;
            set(inp.value, false);
            pop.remove();
          });
          ctl.appendChild(pop);
          const off = (ev) => {
            if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('click', off); }
          };
          setTimeout(() => document.addEventListener('click', off), 0);
        });
        ctl = wrapId(ctl, inp, fid);
        break;
      }
      case 'select':
      case 'tz': {
        ctl = h('<select class="in"></select>');
        if (f.type === 'tz') {
          const { common, rest } = NT.tzList();
          let html = '<optgroup label="常用">' + common.map((z) => '<option value="' + z + '">' + esc(NT.tzLabel(z)) + '</option>').join('') + '</optgroup>';
          if (rest.length) html += '<optgroup label="其他時區">' + rest.map((z) => '<option value="' + z + '">' + esc(z) + '</option>').join('') + '</optgroup>';
          ctl.innerHTML = html;
        } else {
          ctl.innerHTML = f.options.map((o) => '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>').join('');
        }
        ctl.value = val;
        ctl.addEventListener('change', () => set(ctl.value, f.type === 'select'));
        break;
      }
      case 'seg': {
        ctl = h('<div class="seg" role="radiogroup"></div>');
        f.options.forEach((o) => {
          const b = h('<button type="button" role="radio"></button>');
          b.textContent = o[1];
          b.classList.toggle('on', val === o[0]);
          b.setAttribute('aria-checked', val === o[0]);
          b.addEventListener('click', () => { if (obj[f.k] !== o[0]) set(o[0], true); });
          ctl.appendChild(b);
        });
        break;
      }
      case 'toggle': {
        ctl = h('<div class="toggle' + (val ? ' on' : '') + '" role="switch" tabindex="0"><span class="switch"></span><span></span></div>');
        ctl.lastElementChild.textContent = label;
        ctl.setAttribute('aria-checked', !!val);
        const flip = () => set(!obj[f.k], true);
        ctl.addEventListener('click', flip);
        ctl.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
        break;
      }
      case 'range': {
        ctl = h('<div class="range-row"><input type="range"><span class="range-val"></span></div>');
        const r = ctl.querySelector('input');
        r.min = f.min; r.max = f.max; r.step = f.step || 1; r.value = val;
        const show = () => {
          ctl.querySelector('.range-val').textContent = +r.value === 0 && f.zero ? f.zero : r.value + (f.unit || '');
        };
        show();
        r.addEventListener('input', () => { show(); set(+r.value, false); });
        ctl = wrapId(ctl, r, fid);
        break;
      }
      case 'date':
      case 'time': {
        ctl = h('<input class="in" type="' + f.type + '">');
        ctl.value = val || '';
        ctl.addEventListener('input', () => set(ctl.value, false));
        ctl.addEventListener('change', () => set(ctl.value, false));
        break;
      }
      case 'color': {
        ctl = h('<div class="swatches"></div>');
        const names = (f.allowEmpty ? [''] : []).concat(Object.keys(NT.palette.light));
        const th = siteTheme();
        names.forEach((n) => {
          const b = h('<button type="button" class="swatch' + (n ? '' : ' none') + '"></button>');
          if (n) {
            const c = NT.col(n, th);
            b.style.background = c.bg;
            b.style.color = c.fg;
            b.textContent = 'A';
            b.title = NT.colorNames[n];
          } else {
            b.textContent = '⊘';
            b.title = '不設定';
          }
          b.classList.toggle('on', (val || '') === n);
          b.addEventListener('click', () => {
            $$('.swatch', ctl).forEach((x) => x.classList.remove('on'));
            b.classList.add('on');
            set(n, false);
          });
          ctl.appendChild(b);
        });
        break;
      }
      case 'hex': {
        ctl = h('<div class="hex-row"><input type="color"><input class="in" type="text" placeholder="自動" maxlength="7"><button type="button" class="btn btn-sm btn-ghost">清除</button></div>');
        const [pick, txt] = ctl.querySelectorAll('input');
        pick.value = /^#[0-9a-f]{6}$/i.test(val) ? val : '#888888';
        txt.value = val || '';
        pick.addEventListener('input', () => { txt.value = pick.value.toUpperCase(); set(txt.value, false); });
        txt.addEventListener('input', () => {
          const v = txt.value.trim();
          if (v === '') set('', false);
          else if (/^#[0-9a-f]{6}$/i.test(v)) { pick.value = v; set(v.toUpperCase(), false); }
        });
        ctl.querySelector('button').addEventListener('click', () => { txt.value = ''; set('', false); });
        ctl = wrapId(ctl, txt, fid);
        break;
      }
      case 'checks': {
        ctl = h('<div class="checks"></div>');
        f.options.forEach((o) => {
          const arr = Array.isArray(obj[f.k]) ? obj[f.k] : [];
          const b = h('<button type="button" class="check-chip"></button>');
          b.textContent = o[1];
          b.classList.toggle('on', arr.indexOf(o[0]) >= 0);
          b.addEventListener('click', () => {
            const cur = Array.isArray(obj[f.k]) ? obj[f.k].slice() : [];
            const i = cur.indexOf(o[0]);
            if (i >= 0) cur.splice(i, 1);
            else cur.push(o[0]);
            b.classList.toggle('on', i < 0);
            set(cur, false);
          });
          ctl.appendChild(b);
        });
        break;
      }
      case 'image': {
        ctl = imageField(f, obj, set, fid);
        break;
      }
      case 'list': {
        ctl = listField(f, obj, root);
        break;
      }
      default:
        ctl = h('<div></div>');
    }
    if (!ctl.dataset.fid && ctl.matches('input,textarea,select,[tabindex]')) {
      ctl.dataset.fid = fid;
      ctl.id = fid;
    }
    wrap.appendChild(ctl);
    if (hint) {
      const hi = h('<div class="hint"></div>');
      hi.textContent = hint;
      wrap.appendChild(hi);
    }
    return wrap;
  }
  function wrapId(ctl, inner, fid) {
    inner.dataset.fid = fid;
    inner.id = fid;
    return ctl;
  }

  function imageField(f, obj, set, fid) {
    const user = NT.auth.current();
    const el = h(
      '<div class="img-field"><div class="img-thumb' + (f.avatar ? ' round' : '') + '"></div><div class="img-main">' +
      '<input class="in" type="url" placeholder="貼上圖片網址 https://…">' +
      '<div class="img-btns"><button type="button" class="btn btn-sm" data-i="up">⬆ 上傳</button>' +
      '<button type="button" class="btn btn-sm" data-i="lib">🗂️ 圖庫</button>' +
      (user ? '<button type="button" class="btn btn-sm btn-ghost" data-i="save">＋ 存到圖庫</button>' : '') +
      '<button type="button" class="btn btn-sm btn-ghost" data-i="clear">清除</button></div></div></div>'
    );
    const inp = el.querySelector('input');
    const thumb = el.querySelector('.img-thumb');
    inp.id = fid;
    inp.dataset.fid = fid;
    const refresh = () => {
      const u = NT.safeUrl(obj[f.k]);
      thumb.style.backgroundImage = u ? 'url("' + u.replace(/"/g, '%22') + '")' : '';
      thumb.textContent = u ? '' : '🖼';
      inp.value = /^data:/.test(obj[f.k] || '') ? '（已上傳的本機圖片）' : obj[f.k] || '';
      inp.readOnly = /^data:/.test(obj[f.k] || '');
    };
    refresh();
    inp.addEventListener('input', () => { set(inp.value.trim(), false); refreshThumbOnly(); });
    function refreshThumbOnly() {
      const u = NT.safeUrl(obj[f.k]);
      thumb.style.backgroundImage = u ? 'url("' + u.replace(/"/g, '%22') + '")' : '';
      thumb.textContent = u ? '' : '🖼';
    }
    el.querySelector('.img-btns').addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const act = b.dataset.i;
      if (act === 'clear') { set('', false); refresh(); }
      if (act === 'up') {
        const file = await pickFile('image/*');
        if (!file) return;
        try {
          const data = f.avatar ? await compressImage(file, 160, 0.85, true) : await compressImage(file, 900, 0.72, false);
          set(data, false);
          refresh();
          if (!f.avatar) toast('已上傳。大量圖片建議改用網址，連結會比較短。');
        } catch (err) { toast(err.message, 'error'); }
      }
      if (act === 'lib') {
        if (!NT.auth.current()) return askLogin('登入後可以建立個人圖庫，保存常用的圖片網址。');
        openLibraryPicker((url) => { set(url, false); refresh(); });
      }
      if (act === 'save') {
        const u = obj[f.k];
        if (!u) return toast('請先輸入圖片網址', 'error');
        if (NT.store.addImage(u, '')) toast('已存到我的圖庫', 'ok');
      }
    });
    return el;
  }

  function listField(f, obj, root) {
    if (!Array.isArray(obj[f.k])) obj[f.k] = [];
    const arr = obj[f.k];
    const box = h('<div><div class="list"></div><div class="list-foot"></div></div>');
    const list = box.firstElementChild;
    arr.forEach((it, i) => {
      const li = h(
        '<div class="li' + (openSet.has(it) ? ' open' : '') + '"><div class="li-head"><span class="li-arrow">' + ICON.tri + '</span>' +
        (f.thumbs ? '<span class="li-thumb"></span>' : '') +
        '<span class="li-label"></span><span class="li-acts">' +
        '<button type="button" class="icon-btn" data-a="up" title="上移"' + (i === 0 ? ' disabled' : '') + '>' + ICON.up + '</button>' +
        '<button type="button" class="icon-btn" data-a="down" title="下移"' + (i === arr.length - 1 ? ' disabled' : '') + '>' + ICON.down + '</button>' +
        '<button type="button" class="icon-btn" data-a="dup" title="複製">' + ICON.dup + '</button>' +
        '<button type="button" class="icon-btn" data-a="del" title="刪除">' + ICON.del + '</button>' +
        '</span></div></div>'
      );
      const labelEl = li.querySelector('.li-label');
      const thumbEl = li.querySelector('.li-thumb');
      const update = () => {
        labelEl.textContent = f.itemLabel ? f.itemLabel(it, i, root) : '#' + (i + 1);
        if (thumbEl) {
          const u = NT.safeUrl(it.url);
          thumbEl.style.backgroundImage = u ? 'url("' + u.replace(/"/g, '%22') + '")' : '';
        }
      };
      update();
      const buildBody = () => {
        const body = h('<div class="li-body"></div>');
        buildFields(body, f.item, it, root, update, 'l' + f.k + i);
        li.appendChild(body);
      };
      if (openSet.has(it)) buildBody();
      li.querySelector('.li-head').addEventListener('click', (e) => {
        const a = e.target.closest('[data-a]');
        if (a) {
          e.stopPropagation();
          const act = a.dataset.a;
          if (act === 'up' && i > 0) { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); }
          else if (act === 'down' && i < arr.length - 1) { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); }
          else if (act === 'dup') {
            if (f.max && arr.length >= f.max) return toast('最多 ' + f.max + ' 項', 'error');
            const c = NT.clone(it);
            arr.splice(i + 1, 0, c);
            openSet.add(c);
          } else if (act === 'del') {
            arr.splice(i, 1);
          } else return;
          onCfgChange(true);
          return;
        }
        if (openSet.has(it)) {
          openSet.delete(it);
          li.classList.remove('open');
          const b = li.querySelector('.li-body');
          if (b) b.remove();
        } else {
          openSet.add(it);
          li.classList.add('open');
          buildBody();
        }
      });
      list.appendChild(li);
    });
    if (!arr.length) list.appendChild(h('<div class="hint" style="padding:6px 2px">尚無項目</div>'));
    const add = h('<button type="button" class="add-btn">' + ICON.plus + '<span></span></button>');
    add.lastElementChild.textContent = f.addLabel || '新增';
    add.addEventListener('click', () => {
      if (f.max && arr.length >= f.max) return toast('最多 ' + f.max + ' 項', 'error');
      const it = f.newItem ? f.newItem(arr) : {};
      arr.push(it);
      openSet.add(it);
      onCfgChange(true);
    });
    box.lastElementChild.appendChild(add);
    if (arr.length > 1) {
      const toggleAll = h('<button type="button" class="add-btn"></button>');
      const allOpen = arr.every((x) => openSet.has(x));
      toggleAll.textContent = allOpen ? '全部收合' : '全部展開';
      toggleAll.addEventListener('click', () => {
        arr.forEach((x) => (allOpen ? openSet.delete(x) : openSet.add(x)));
        renderForm();
      });
      box.lastElementChild.appendChild(toggleAll);
    }
    return box;
  }

  /* =========================================================
   * 我的作品
   * ========================================================= */
  function needLogin(title, icon, text) {
    view.innerHTML =
      '<div class="page"><div class="page-icon sm">' + icon + '</div><h1 class="page-title">' + esc(title) + '</h1>' +
      '<div class="empty"><div class="ic">🔒</div><p>' + esc(text) + '</p><a class="btn btn-primary" href="#/account">登入 / 註冊</a></div>' + footer() + '</div>';
  }
  let worksFilter = 'all';
  function pageWorks() {
    setCrumbs([{ label: 'Notion 嵌入工具箱', href: '/' }, { label: '我的作品' }]);
    if (!NT.auth.current()) return needLogin('我的作品', '📁', '登入後可以儲存作品，之後隨時回來修改。');
    const all = NT.store.works().filter((w) => NT.widgets[w.type]);
    const types = Array.from(new Set(all.map((w) => w.type)));
    if (worksFilter !== 'all' && types.indexOf(worksFilter) < 0) worksFilter = 'all';
    const list = all.filter((w) => worksFilter === 'all' || w.type === worksFilter);
    view.innerHTML =
      '<div class="page"><div class="page-icon sm">📁</div><h1 class="page-title">我的作品</h1>' +
      '<p class="page-desc">儲存過的嵌入工具都在這裡，點名稱即可繼續編輯。</p>' +
      (all.length
        ? '<div class="filters"><button class="check-chip' + (worksFilter === 'all' ? ' on' : '') + '" data-f="all">全部 ' + all.length + '</button>' +
          types.map((t) => '<button class="check-chip' + (worksFilter === t ? ' on' : '') + '" data-f="' + t + '">' + NT.widgets[t].icon + ' ' + esc(NT.widgets[t].name) + '</button>').join('') + '</div>' +
          '<table class="table"><thead><tr><th>名稱</th><th class="hide-sm">類型</th><th class="hide-sm">最後編輯</th><th></th></tr></thead><tbody>' +
          list.map((w) => {
            const d = NT.widgets[w.type];
            return '<tr data-id="' + w.id + '"><td><a class="name" href="#/tool/' + w.type + '/' + w.id + '"><span class="ic">' + d.icon + '</span><span>' + esc(w.name) + '</span></a></td>' +
              '<td class="hide-sm"><span class="chip">' + esc(d.name) + '</span></td><td class="hide-sm muted small">' + fmtTime(w.updated) + '</td>' +
              '<td class="acts">' + (d.kind === 'formula' ? '' : '<button class="btn btn-sm btn-ghost" data-w="copy" title="複製嵌入連結">📋</button>') +
              '<button class="btn btn-sm btn-ghost" data-w="rename" title="重新命名">✏️</button>' +
              '<button class="btn btn-sm btn-ghost" data-w="del" title="刪除">🗑️</button></td></tr>';
          }).join('') + '</tbody></table>'
        : '<div class="empty"><div class="ic">📭</div><p>還沒有作品。到任一工具頁按「儲存到我的作品」即可。</p><a class="btn" href="#/">瀏覽工具</a></div>') +
      footer() + '</div>';
    $$('[data-f]', view).forEach((b) => b.addEventListener('click', () => { worksFilter = b.dataset.f; pageWorks(); }));
    $$('[data-w]', view).forEach((b) => b.addEventListener('click', async () => {
      const id = b.closest('tr').dataset.id;
      const w = NT.store.getWork(id);
      if (!w) return;
      const act = b.dataset.w;
      if (act === 'copy') {
        const def = NT.widgets[w.type];
        copy(await NT.buildEmbedUrl(w.type, NT.merge(def.defaults, w.cfg)), '已複製嵌入連結');
      } else if (act === 'rename') {
        const body = h('<div><input class="in" maxlength="60"></div>');
        body.querySelector('input').value = w.name;
        modal({
          title: '重新命名',
          body,
          actions: [{ label: '取消', cls: 'btn-ghost' }, {
            label: '儲存', cls: 'btn-primary', onClick: () => {
              NT.store.renameWork(id, body.querySelector('input').value.trim() || w.name);
              pageWorks();
            },
          }],
        });
      } else if (act === 'del') {
        if (await confirmBox('刪除作品？', '「' + w.name + '」將被刪除，已嵌入 Notion 的連結不受影響。', '刪除', true)) {
          NT.store.deleteWork(id);
          renderSidebar('/works');
          pageWorks();
          toast('已刪除');
        }
      }
    }));
  }

  /* =========================================================
   * 我的圖庫
   * ========================================================= */
  function libGrid(items, pick) {
    if (!items.length) return '<div class="empty"><div class="ic">🗂️</div><p>圖庫是空的</p></div>';
    return '<div class="lib-grid">' + items.map((x) => {
      const u = NT.safeUrl(x.url);
      return '<div class="lib-item" data-id="' + x.id + '"><div class="lib-img' + (pick ? ' pick' : '') + '" data-l="pick" style="background-image:url(&quot;' + esc(u.replace(/"/g, '%22')) + '&quot;)"></div>' +
        '<div class="lib-meta"><span class="lib-name">' + esc(x.name || (/^data:/.test(x.url) ? '本機圖片' : x.url.replace(/^https?:\/\//, ''))) + '</span>' +
        (pick ? '' : (/^data:/.test(x.url) ? '' : '<button class="icon-btn" data-l="copy" title="複製網址">📋</button>') + '<button class="icon-btn" data-l="del" title="刪除">🗑️</button>') +
        '</div></div>';
    }).join('') + '</div>';
  }
  function pageLibrary() {
    setCrumbs([{ label: 'Notion 嵌入工具箱', href: '/' }, { label: '我的圖庫' }]);
    if (!NT.auth.current()) return needLogin('我的圖庫', '🗂️', '登入後可以保存常用的圖片，在任何工具中一鍵選用。');
    const items = NT.store.library();
    view.innerHTML =
      '<div class="page"><div class="page-icon sm">🗂️</div><h1 class="page-title">我的圖庫</h1>' +
      '<p class="page-desc">保存常用的圖片網址，在多圖展示、聊天室頭貼、時間軸、橫幅等工具中按「圖庫」即可選用。</p>' +
      '<div class="panel"><div class="panel-body">' +
      '<div class="row" style="flex-wrap:wrap"><input class="in grow" id="libUrl" type="url" placeholder="圖片網址 https://…" style="min-width:200px">' +
      '<input class="in" id="libName" placeholder="名稱（選填）" style="max-width:160px"><button class="btn btn-primary" id="libAdd">加入</button></div>' +
      '<div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn btn-sm" id="libUp">⬆ 上傳本機圖片</button><span class="hint" style="margin:0">上傳的圖片會壓縮後存在此裝置，適合頭貼或少量圖片；嵌入 Notion 建議用網址。</span></div>' +
      '</div></div>' +
      '<div id="libGrid">' + libGrid(items) + '</div>' + footer() + '</div>';
    const add = () => {
      const url = $('#libUrl').value.trim();
      if (!NT.safeUrl(url)) return toast('請輸入 https:// 開頭的圖片網址', 'error');
      NT.store.addImage(url, $('#libName').value.trim());
      toast('已加入圖庫', 'ok');
      pageLibrary();
    };
    $('#libAdd').addEventListener('click', add);
    $('#libUrl').addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
    $('#libUp').addEventListener('click', async () => {
      const file = await pickFile('image/*');
      if (!file) return;
      try {
        const data = await compressImage(file, 1000, 0.78, false);
        if (NT.store.addImage(data, file.name.replace(/\.[^.]+$/, ''))) {
          toast('已加入圖庫', 'ok');
          pageLibrary();
        }
      } catch (err) { toast(err.message, 'error'); }
    });
    $('#libGrid').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-l]');
      if (!b) return;
      const id = b.closest('.lib-item').dataset.id;
      const it = NT.store.library().find((x) => x.id === id);
      if (!it) return;
      if (b.dataset.l === 'copy') copy(it.url, '已複製圖片網址');
      if (b.dataset.l === 'pick') window.open(it.url, '_blank', 'noopener');
      if (b.dataset.l === 'del' && (await confirmBox('從圖庫移除？', '已使用這張圖片的嵌入不受影響。', '移除', true))) {
        NT.store.removeImage(id);
        pageLibrary();
      }
    });
  }
  function openLibraryPicker(onPick) {
    const items = NT.store.library();
    const body = h('<div><p class="muted small" style="margin:0 0 4px">點選圖片即可套用。' + (items.length ? '' : '先到「我的圖庫」加入圖片吧！') + '</p>' + libGrid(items, true) + '</div>');
    const m = modal({
      title: '從圖庫選擇',
      body,
      wide: true,
      noFocus: true,
      actions: [{ label: '前往我的圖庫', cls: 'btn-ghost', onClick: () => go('/library') }, { label: '關閉', cls: 'btn' }],
    });
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-l="pick"]');
      if (!b) return;
      const it = items.find((x) => x.id === b.closest('.lib-item').dataset.id);
      if (it) { onPick(it.url); m.close(); }
    });
  }

  /* =========================================================
   * 帳號
   * ========================================================= */
  let authTab = 'login';
  function pageAccount() {
    const user = NT.auth.current();
    setCrumbs([{ label: 'Notion 嵌入工具箱', href: '/' }, { label: user ? '帳號設定' : '登入 / 註冊' }]);
    if (!user) return pageLogin();
    const d = NT.store.data();
    view.innerHTML =
      '<div class="page"><div class="page-icon sm">👤</div><h1 class="page-title">帳號設定</h1>' +
      '<div class="prop-list"><div class="k">✉️ Email</div><div class="v">' + esc(user) + '</div>' +
      '<div class="k">📅 建立時間</div><div class="v">' + fmtTime(d.created) + '</div>' +
      '<div class="k">💾 資料位置</div><div class="v">此裝置的瀏覽器</div></div>' +
      '<div class="stat-row"><div class="stat"><b>' + d.works.length + '</b><span>作品</span></div><div class="stat"><b>' + d.library.length + '</b><span>圖庫圖片</span></div><div class="stat"><b>' + d.recent.length + '</b><span>使用過的工具</span></div></div>' +
      '<h2 class="h2">備份與同步</h2>' +
      '<div class="callout warn">💡 <div>帳號資料儲存在這台裝置的瀏覽器中。要在<b>其他裝置或瀏覽器</b>使用，請匯出備份檔，再到新裝置的「登入 / 註冊」頁按「匯入備份」。清除瀏覽器資料前也請先備份。</div></div>' +
      '<div class="btn-row"><button class="btn" id="accExport">⬇ 匯出備份</button><button class="btn" id="accImport">⬆ 匯入備份（合併）</button></div>' +
      '<h2 class="h2">安全</h2>' +
      '<div class="btn-row"><button class="btn" id="accPw">🔑 變更密碼</button><button class="btn" id="accLogout">登出</button><button class="btn btn-danger" id="accDel">刪除帳號</button></div>' +
      footer() + '</div>';
    $('#accExport').addEventListener('click', () => {
      const blob = new Blob([NT.store.exportJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      download(url, 'notion-tool-backup-' + new Date().toISOString().slice(0, 10) + '.json');
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('已匯出備份', 'ok');
    });
    $('#accImport').addEventListener('click', () => importBackup('merge'));
    $('#accLogout').addEventListener('click', () => {
      authTab = 'login';
      NT.auth.logout();
      toast('已登出');
      go('/');
    });
    $('#accPw').addEventListener('click', () => {
      const body = h('<div><div class="field"><label class="field-label">目前密碼</label><input class="in" type="password" autocomplete="current-password"></div>' +
        '<div class="field"><label class="field-label">新密碼（至少 6 個字元）</label><input class="in" type="password" autocomplete="new-password"></div></div>');
      modal({
        title: '變更密碼', body,
        actions: [{ label: '取消', cls: 'btn-ghost' }, {
          label: '變更', cls: 'btn-primary', onClick: async () => {
            const [a, b] = body.querySelectorAll('input');
            await NT.auth.changePassword(a.value, b.value);
            toast('密碼已變更', 'ok');
          },
        }],
      });
    });
    $('#accDel').addEventListener('click', () => {
      const body = h('<div><p class="muted" style="margin:4px 0 12px">帳號、作品與圖庫都會從此裝置永久刪除，無法復原。建議先匯出備份。</p><label class="field-label">輸入密碼確認</label><input class="in" type="password"></div>');
      modal({
        title: '刪除帳號', body,
        actions: [{ label: '取消', cls: 'btn-ghost' }, {
          label: '永久刪除', cls: 'btn-danger', onClick: async () => {
            await NT.auth.deleteAccount(body.querySelector('input').value);
            toast('帳號已刪除');
            go('/');
          },
        }],
      });
    });
  }

  function importBackup(mode) {
    pickFile('application/json,.json').then((file) => {
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const email = NT.store.importJSON(String(r.result), mode);
          toast('已匯入 ' + email + ' 的備份' + (NT.auth.current() ? '' : '，請用原本的密碼登入'), 'ok');
          if (!NT.auth.current()) { authTab = 'login'; pageAccount(); setTimeout(() => { const i = $('#lgEmail'); if (i) i.value = email; }, 0); }
          else pageAccount();
          renderSidebar(currentNav());
        } catch (e) {
          toast('匯入失敗：' + e.message, 'error');
        }
      };
      r.readAsText(file);
    });
  }

  function pageLogin() {
    const login = authTab === 'login';
    view.innerHTML =
      '<div class="page"><div class="page-icon sm">👋</div><h1 class="page-title">' + (login ? '登入' : '建立帳號') + '</h1>' +
      '<p class="page-desc">登入後可以儲存作品、建立個人圖庫，並記住你使用過的工具。<br>不登入也能使用所有工具（訪客模式只產生連結，不會保存）。</p>' +
      '<div class="auth-box"><div class="tabs"><button data-t="login" class="' + (login ? 'on' : '') + '">登入</button><button data-t="register" class="' + (login ? '' : 'on') + '">註冊</button></div>' +
      '<form id="authForm" novalidate>' +
      '<div class="field"><label class="field-label" for="lgEmail">Email</label><input class="in" id="lgEmail" type="email" autocomplete="email" placeholder="you@example.com" required></div>' +
      '<div class="field"><label class="field-label" for="lgPw">密碼' + (login ? '' : '（至少 6 個字元）') + '</label><input class="in" id="lgPw" type="password" autocomplete="' + (login ? 'current-password' : 'new-password') + '" required></div>' +
      (login
        ? '<div class="field"><div class="toggle on" id="lgRemember" role="switch" tabindex="0" aria-checked="true"><span class="switch"></span><span>記住我（保持登入）</span></div></div>'
        : '<div class="field"><label class="field-label" for="lgPw2">再次輸入密碼</label><input class="in" id="lgPw2" type="password" autocomplete="new-password" required></div>') +
      '<div class="err" id="lgErr"></div>' +
      '<button class="btn btn-primary btn-block" type="submit" id="lgSubmit" style="height:36px">' + (login ? '登入' : '建立帳號') + '</button></form>' +
      '<div class="callout" style="margin-top:20px">🔐 <div class="small">本網站為 GitHub Pages 靜態網站，帳號資料儲存在<b>此裝置的瀏覽器</b>，密碼經 PBKDF2 加密雜湊、不會以明碼保存，也不會傳送到任何伺服器。換裝置時請使用「匯出 / 匯入備份」。</div></div>' +
      '<div class="btn-row"><button class="btn btn-sm btn-ghost" id="lgImport">⬆ 匯入備份（在其他裝置註冊過）</button></div>' +
      '</div>' + footer() + '</div>';
    $$('.tabs button', view).forEach((b) => b.addEventListener('click', () => { authTab = b.dataset.t; pageLogin(); }));
    const rem = $('#lgRemember');
    if (rem) {
      const flip = () => { rem.classList.toggle('on'); rem.setAttribute('aria-checked', rem.classList.contains('on')); };
      rem.addEventListener('click', flip);
      rem.addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); flip(); } });
    }
    $('#lgImport').addEventListener('click', () => importBackup('replace'));
    $('#authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#lgErr');
      const btn = $('#lgSubmit');
      err.textContent = '';
      const email = $('#lgEmail').value;
      const pw = $('#lgPw').value;
      try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>';
        if (login) {
          await NT.auth.login(email, pw, rem.classList.contains('on'));
          toast('登入成功', 'ok');
        } else {
          if (pw !== $('#lgPw2').value) throw new Error('兩次輸入的密碼不一致');
          await NT.auth.register(email, pw);
          authTab = 'login';
          toast('帳號建立完成，已自動登入', 'ok');
        }
        go('/');
      } catch (ex) {
        err.textContent = ex.message;
        btn.disabled = false;
        btn.textContent = login ? '登入' : '建立帳號';
      }
    });
  }

  /* =========================================================
   * 使用教學 / 更新紀錄
   * ========================================================= */
  function pageGuide() {
    setCrumbs([{ label: 'Notion 嵌入工具箱', href: '/' }, { label: '使用教學' }]);
    view.innerHTML =
      '<div class="page"><div class="page-icon sm">📖</div><h1 class="page-title">使用教學</h1>' +
      '<p class="page-desc">點選標題展開內容。</p>' +
      GUIDE.map((g) =>
        '<details class="toggle-block"' + (g.open ? ' open' : '') + '><summary><span class="tri">' + ICON.tri + '</span><span>' + g.icon + '</span><span>' + esc(g.title) + '</span></summary>' +
        '<div class="toggle-body">' + g.html + '</div></details>'
      ).join('') +
      '<h2 class="h2">工具一覽</h2><div class="page-links">' +
      NT.widgetOrder.map((id) => '<a class="page-link" href="#/tool/' + id + '"><span>' + NT.widgets[id].icon + '</span><span class="tx">' + esc(NT.widgets[id].name) + '</span></a>').join('') +
      '</div>' + footer() + '</div>';
  }

  function pageChangelog() {
    setCrumbs([{ label: 'Notion 嵌入工具箱', href: '/' }, { label: '更新紀錄' }]);
    const TAG = { new: ['新功能', 'green'], improve: ['改善', 'blue'], fix: ['修正', 'orange'] };
    view.innerHTML =
      '<div class="page"><div class="page-icon sm">📝</div><h1 class="page-title">更新紀錄</h1>' +
      '<p class="page-desc">網站的每次更新都會記錄在這裡，點選版本展開細節。</p>' +
      (LOG.length
        ? LOG.map((v, i) =>
          '<details class="toggle-block"' + (i === 0 ? ' open' : '') + '><summary><span class="tri">' + ICON.tri + '</span><span>v' + esc(v.version) + '　' + esc(v.title || '') + '</span><span class="meta">' + esc(v.date) + '</span></summary>' +
          '<div class="toggle-body">' + (v.items || []).map((it) => {
            const t = TAG[it[0]] || ['更新', ''];
            return '<div class="log-item"><span class="chip ' + t[1] + '">' + t[0] + '</span><span>' + esc(it[1]) + '</span></div>';
          }).join('') + '</div></details>'
        ).join('')
        : '<p class="muted">目前沒有紀錄。</p>') +
      footer() + '</div>';
  }

  route();
})();
