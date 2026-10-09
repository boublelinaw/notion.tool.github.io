/* 時鐘 / 世界時鐘 */
(function () {
  'use strict';

  function analog(p, showSec) {
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 * Math.PI) / 180;
      const major = i % 3 === 0;
      const r1 = major ? 40 : 43;
      return '<line class="tick' + (major ? ' major' : '') + '" x1="' + (50 + r1 * Math.sin(a)).toFixed(2) + '" y1="' + (50 - r1 * Math.cos(a)).toFixed(2) +
        '" x2="' + (50 + 46 * Math.sin(a)).toFixed(2) + '" y2="' + (50 - 46 * Math.cos(a)).toFixed(2) + '"/>';
    }).join('');
    const hand = (deg, len, w, cls) => {
      const a = (deg * Math.PI) / 180;
      return '<line class="hand ' + cls + '" stroke-width="' + w + '" x1="50" y1="50" x2="' + (50 + len * Math.sin(a)).toFixed(2) + '" y2="' + (50 - len * Math.cos(a)).toFixed(2) + '"/>';
    };
    const h = ((p.h % 12) + p.mi / 60) * 30;
    const m = (p.mi + p.s / 60) * 6;
    return '<svg class="ck-analog" viewBox="0 0 100 100"><circle class="face" cx="50" cy="50" r="48"/>' + ticks +
      hand(h, 25, 4, 'h') + hand(m, 36, 3, 'm') + (showSec ? hand(p.s * 6, 40, 1.5, 's') : '') +
      '<circle class="pin" cx="50" cy="50" r="3"/></svg>';
  }

  function timeText(p, cfg) {
    let h = p.h;
    let ampm = '';
    if (cfg.hour12) {
      ampm = h < 12 ? '上午' : '下午';
      h = h % 12 || 12;
    }
    return { main: (cfg.hour12 ? h : NT.pad2(h)) + ':' + NT.pad2(p.mi), sec: cfg.showSeconds ? ':' + NT.pad2(p.s) : '', ampm };
  }

  NT.register({
    id: 'clock',
    name: '時鐘 / 世界時鐘',
    icon: '🕰️',
    desc: '數字或指針時鐘，可同時顯示多個城市的時間，適合遠距、留學、旅行頁面。',
    height: 200,
    defaults: {
      zones: [
        { tz: 'Asia/Taipei', label: '台北' },
      ],
      style: 'digital',
      hour12: false,
      showSeconds: true,
      showDate: true,
      color: 'default',
      theme: 'light',
      bg: 'card',
    },
    fields: [
      { type: 'section', label: '時區' },
      {
        k: 'zones', type: 'list', label: '城市', addLabel: '新增城市', max: 8,
        itemLabel: (it) => (it.label || NT.tzShort(it.tz)) + '　' + NT.tzOffsetLabel(NT.safeTz(it.tz)),
        newItem: () => ({ tz: 'Asia/Tokyo', label: '' }),
        item: [
          { k: 'tz', type: 'tz', label: '時區' },
          { k: 'label', type: 'text', label: '顯示名稱', ph: '留空則使用城市名' },
        ],
      },
      { type: 'section', label: '顯示' },
      { k: 'style', type: 'seg', label: '樣式', options: [['digital', '🔢 數字'], ['analog', '🕰 指針']] },
      { k: 'hour12', type: 'toggle', label: '12 小時制' },
      { k: 'showSeconds', type: 'toggle', label: '顯示秒' },
      { k: 'showDate', type: 'toggle', label: '顯示日期' },
    ].concat(NT.appearanceFields([{ k: 'color', type: 'color', label: '強調色' }])),
    render(root, cfg, env) {
      const c = NT.col(cfg.color, env.theme);
      const box = document.createElement('div');
      box.className = 'w w-box ck';
      box.setAttribute('data-export', '');
      box.style.setProperty('--c', c.fg);
      root.appendChild(box);
      const zones = (cfg.zones && cfg.zones.length ? cfg.zones : [{ tz: 'Asia/Taipei', label: '' }]).slice(0, 8);
      const draw = () => {
        const now = Date.now();
        box.innerHTML = zones.map((z) => {
          const tz = NT.safeTz(z.tz);
          const p = NT.tzParts(now, tz);
          const t = timeText(p, cfg);
          const label = z.label || (zones.length > 1 ? NT.tzShort(tz) : '');
          const date = cfg.showDate ? '<div class="ck-date">' + p.y + '/' + NT.pad2(p.m) + '/' + NT.pad2(p.d) + '（' + NT.weekdayNames[p.wd] + '）</div>' : '';
          if (cfg.style === 'analog') {
            return '<div class="ck-one analog">' + (label ? '<div class="ck-label">' + NT.esc(label) + '</div>' : '') + analog(p, cfg.showSeconds) +
              '<div class="ck-time">' + (t.ampm ? t.ampm + ' ' : '') + t.main + '</div>' + date + '</div>';
          }
          return '<div class="ck-one">' + (label ? '<div class="ck-label">' + NT.esc(label) + '</div>' : '') +
            '<div class="ck-time">' + t.main + '<span class="sec">' + t.sec + '</span>' + (t.ampm ? '<small>' + t.ampm + '</small>' : '') + '</div>' + date + '</div>';
        }).join('');
      };
      draw();
      const timer = setInterval(draw, 1000);
      return () => clearInterval(timer);
    },
  });
})();
