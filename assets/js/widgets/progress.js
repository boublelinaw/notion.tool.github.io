/* 進度條：年度 / 月 / 週 / 日 / 自訂區間 */
(function () {
  'use strict';

  function range(cfg, now) {
    const tz = NT.safeTz(cfg.tz);
    const p = NT.tzParts(now, tz);
    const Z = (y, m, d) => NT.zonedToUtc(y, m, d, 0, 0, 0, tz);
    let start, end, title, unitDays = true;
    if (cfg.mode === 'month') {
      start = Z(p.y, p.m, 1);
      end = p.m === 12 ? Z(p.y + 1, 1, 1) : Z(p.y, p.m + 1, 1);
      title = p.m + ' 月';
    } else if (cfg.mode === 'week') {
      const back = (p.wd + 6) % 7; // 週一為一週開始
      const s = new Date(Date.UTC(p.y, p.m - 1, p.d - back));
      const e = new Date(Date.UTC(p.y, p.m - 1, p.d - back + 7));
      start = Z(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate());
      end = Z(e.getUTCFullYear(), e.getUTCMonth() + 1, e.getUTCDate());
      title = '本週';
    } else if (cfg.mode === 'day') {
      start = Z(p.y, p.m, p.d);
      const e = new Date(Date.UTC(p.y, p.m - 1, p.d + 1));
      end = Z(e.getUTCFullYear(), e.getUTCMonth() + 1, e.getUTCDate());
      title = '今天';
      unitDays = false;
    } else if (cfg.mode === 'custom') {
      const a = NT.parseDate(cfg.start) || { y: p.y, m: 1, d: 1 };
      const b = NT.parseDate(cfg.end) || { y: p.y, m: 12, d: 31 };
      const e = new Date(Date.UTC(b.y, b.m - 1, b.d + 1)); // 結束日當天也算
      start = Z(a.y, a.m, a.d);
      end = Z(e.getUTCFullYear(), e.getUTCMonth() + 1, e.getUTCDate());
      title = '進度';
    } else {
      start = Z(p.y, 1, 1);
      end = Z(p.y + 1, 1, 1);
      title = p.y + ' 年';
    }
    const pct = end > start ? NT.clamp((now - start) / (end - start), 0, 1) : 0;
    let detail = '';
    if (unitDays) {
      const total = Math.round((end - start) / 864e5);
      const passed = NT.clamp(Math.floor((now - start) / 864e5) + 1, 0, total);
      detail = now < start ? ['尚未開始', '共 ' + total + ' 天'] : ['第 ' + passed + ' 天 / 共 ' + total + ' 天', '剩下 ' + Math.max(0, total - passed) + ' 天'];
    } else {
      const left = Math.max(0, end - now);
      detail = ['已過 ' + Math.floor((now - start) / 3600000) + ' 小時', '剩下 ' + Math.floor(left / 3600000) + ' 小時 ' + Math.floor((left % 3600000) / 60000) + ' 分'];
    }
    return { pct, title, detail };
  }

  NT.register({
    id: 'progress',
    name: '進度條',
    icon: '📊',
    desc: '今年／這個月／這週／今天已經過了多少，或自訂目標期間的進度百分比。',
    height: 160,
    defaults: {
      mode: 'year', start: '2026-09-01', end: '2027-01-31', tz: 'Asia/Taipei',
      title: '', style: 'bar', decimals: 1, showDetail: true, thickness: 10, color: 'green', theme: 'light', bg: 'card',
    },
    fields: [
      { type: 'section', label: '基本設定' },
      { k: 'mode', type: 'seg', label: '期間', options: [['year', '今年'], ['month', '本月'], ['week', '本週'], ['day', '今天'], ['custom', '自訂']] },
      { k: 'start', type: 'date', label: '開始日期', show: (c) => c.mode === 'custom' },
      { k: 'end', type: 'date', label: '結束日期（含當天）', show: (c) => c.mode === 'custom' },
      { k: 'tz', type: 'tz', label: '時區' },
      { k: 'title', type: 'text', label: '標題', ph: '留空自動，例如「2026 年」' },
      { type: 'section', label: '顯示' },
      { k: 'style', type: 'seg', label: '樣式', options: [['bar', '▬ 長條'], ['ring', '◯ 圓環'], ['blocks', '▦ 格子']] },
      { k: 'decimals', type: 'range', label: '小數位數', min: 0, max: 4, step: 1 },
      { k: 'thickness', type: 'range', label: '長條粗細', min: 4, max: 28, step: 1, unit: 'px', show: (c) => c.style === 'bar' },
      { k: 'showDetail', type: 'toggle', label: '顯示天數細節' },
    ].concat(NT.appearanceFields([{ k: 'color', type: 'color', label: '顏色' }])),
    render(root, cfg, env) {
      const c = NT.col(cfg.color, env.theme);
      const box = document.createElement('div');
      box.className = 'w w-box';
      box.setAttribute('data-export', '');
      box.style.setProperty('--c', c.fg);
      box.style.setProperty('--cbg', c.bg);
      box.style.setProperty('--h', (+cfg.thickness || 10) + 'px');
      root.appendChild(box);
      const dec = NT.clamp(+cfg.decimals || 0, 0, 4);
      const draw = () => {
        const r = range(cfg, Date.now());
        const pctTxt = (r.pct * 100).toFixed(dec) + '%';
        const title = NT.esc(cfg.title || r.title);
        const detail = cfg.showDetail ? '<div class="pg-detail"><span>' + r.detail[0] + '</span><span>' + r.detail[1] + '</span></div>' : '';
        if (cfg.style === 'ring') {
          const C = 2 * Math.PI * 40;
          box.innerHTML = '<div class="pg ring"><svg class="pg-ring" viewBox="0 0 100 100"><circle class="bgc" cx="50" cy="50" r="40"/>' +
            '<circle class="fgc" cx="50" cy="50" r="40" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + (C * (1 - r.pct)).toFixed(2) + '"/>' +
            '<text x="50" y="57" text-anchor="middle">' + Math.round(r.pct * 100) + '%</text></svg>' +
            '<div><div class="pg-head"><div class="pg-title">' + title + '</div><div class="pg-pct">' + pctTxt + '</div></div>' + detail + '</div></div>';
        } else if (cfg.style === 'blocks') {
          const N = 100;
          const on = Math.floor(r.pct * N);
          box.innerHTML = '<div class="pg"><div class="pg-head"><div class="pg-title">' + title + '</div><div class="pg-pct">' + pctTxt + '</div></div>' +
            '<div class="pg-blocks" style="--cols:20">' + Array.from({ length: N }, (_, i) => '<i class="' + (i < on ? 'on' : '') + '"></i>').join('') + '</div>' + detail + '</div>';
        } else {
          box.innerHTML = '<div class="pg"><div class="pg-head"><div class="pg-title">' + title + '</div><div class="pg-pct">' + pctTxt + '</div></div>' +
            '<div class="pg-bar"><div class="pg-fill" style="width:' + (r.pct * 100).toFixed(3) + '%"></div></div>' + detail + '</div>';
        }
      };
      draw();
      const timer = setInterval(draw, dec >= 3 || cfg.mode === 'day' ? 1000 : 30000);
      return () => clearInterval(timer);
    },
  });
})();
