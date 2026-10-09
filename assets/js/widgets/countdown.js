/* 倒數 / 累積計日 */
(function () {
  'use strict';
  const UNIT = { d: '天', h: '小時', m: '分', s: '秒' };
  const LEVEL = { day: 1, hour: 2, minute: 3, second: 4 };

  function split(ms, precision) {
    const sec = Math.floor(Math.max(0, ms) / 1000);
    const all = [
      { k: 'd', v: Math.floor(sec / 86400) },
      { k: 'h', v: Math.floor((sec % 86400) / 3600) },
      { k: 'm', v: Math.floor((sec % 3600) / 60) },
      { k: 's', v: sec % 60 },
    ];
    return all.slice(0, LEVEL[precision] || 1);
  }

  /** 依設定計算目前要顯示的內容 */
  function compute(cfg, now) {
    const tz = NT.safeTz(cfg.tz);
    const d = NT.parseDate(cfg.date) || { y: 2027, m: 1, d: 1 };
    const t = NT.parseTime(cfg.time);
    const np = NT.tzParts(now, tz);
    const today = NT.dayIndex(np.y, np.m, np.d);
    const startDay = NT.dayIndex(d.y, d.m, d.d);
    const ts = NT.zonedToUtc(d.y, d.m, d.d, t.h, t.mi, t.s, tz);
    const byDay = cfg.precision === 'day';
    const plus = cfg.includeStart ? 1 : 0;
    const days = (n) => [{ k: 'd', v: n }];

    if (cfg.mode === 'up') {
      if (byDay ? startDay > today : ts > now) {
        return { kind: 'count', label: '距離開始還有', parts: byDay ? days(startDay - today) : split(ts - now, cfg.precision) };
      }
      const parts = byDay ? days(today - startDay + plus) : split(now - ts, cfg.precision);
      if (!byDay) parts[0].v += plus;
      return { kind: 'count', label: cfg.label || (cfg.includeStart ? '今天是第' : '已經'), parts };
    }

    if (cfg.mode === 'yearly') {
      // 找出下一次紀念日（2/29 在非閏年以 2/28 計）
      const occ = (y) => ({ y, m: d.m, d: Math.min(d.d, NT.daysInMonth(y, d.m)) });
      let o = occ(np.y);
      if (NT.dayIndex(o.y, o.m, o.d) < today) o = occ(np.y + 1);
      const oDay = NT.dayIndex(o.y, o.m, o.d);
      const oTs = NT.zonedToUtc(o.y, o.m, o.d, t.h, t.mi, t.s, tz);
      const n = o.y - d.y;
      const since = today - startDay + plus;
      const extra = cfg.showTotal && today >= startDay ? '從 ' + fmtDate(d) + ' 起已經 ' + since.toLocaleString() + ' 天' : '';
      if (oDay === today && (byDay || now >= oTs)) {
        return { kind: 'done', text: n > 0 ? '🎉 今天是 ' + n + ' 週年！' : cfg.doneText || '🎉 就是今天！', extra };
      }
      const label = cfg.label || (n > 0 ? '距離 ' + n + ' 週年還有' : '還有');
      return { kind: 'count', label, parts: byDay ? days(oDay - today) : split(oTs - now, cfg.precision), extra, target: o };
    }

    // 倒數
    const targetDay = startDay;
    if (byDay ? targetDay > today : ts > now) {
      return { kind: 'count', label: cfg.label || '還有', parts: byDay ? days(targetDay - today) : split(ts - now, cfg.precision) };
    }
    if (targetDay === today) return { kind: 'done', text: cfg.doneText || '🎉 就是今天！' };
    return { kind: 'count', label: '已經過了', parts: days(today - targetDay) };
  }

  function fmtDate(d) {
    return d.y + '/' + NT.pad2(d.m) + '/' + NT.pad2(d.d);
  }

  function html(cfg, r) {
    const tz = NT.safeTz(cfg.tz);
    const d = NT.parseDate(cfg.date) || { y: 2027, m: 1, d: 1 };
    const target = r.target || d;
    let nums = '';
    if (r.kind === 'done') {
      nums = '<div class="wc-done">' + NT.esc(r.text) + '</div>';
    } else {
      nums = '<div class="wc-nums">' + r.parts.map((p, i) =>
        '<div class="wc-unit' + (i > 0 ? ' small' : '') + '"><b>' +
        (i > 0 ? NT.pad2(p.v) : p.v.toLocaleString()) + '</b><span>' + UNIT[p.k] + '</span></div>'
      ).join('') + '</div>';
    }
    let sub = '';
    if (cfg.showTarget) {
      const timeTxt = cfg.precision !== 'day' || (cfg.time && cfg.time !== '00:00') ? ' ' + (cfg.time || '00:00') : '';
      const prefix = cfg.mode === 'up' ? '起始日 ' : cfg.mode === 'yearly' ? '紀念日 ' : '';
      sub = '<div class="wc-sub">' + prefix + fmtDate(target) + timeTxt + ' · ' + NT.esc(NT.tzShort(tz)) + '</div>';
    }
    const label = r.kind === 'count' ? '<div class="wc-label">' + NT.esc(r.label) + '</div>' : '';
    return (
      (cfg.emoji ? '<div class="wc-emoji">' + NT.esc(cfg.emoji) + '</div>' : '') +
      (cfg.title ? '<div class="wc-title">' + NT.esc(cfg.title) + '</div>' : '') +
      label + nums + sub +
      (r.extra ? '<div class="wc-extra">' + NT.esc(r.extra) + '</div>' : '')
    );
  }

  NT.register({
    id: 'countdown',
    name: '倒數 / 累積計日',
    icon: '⏳',
    desc: '紀念日、生日、考試倒數，或「在一起第幾天」。可選時區，顯示到天、時、分、秒。',
    height: 240,
    defaults: {
      title: '新年快樂', emoji: '🎆', mode: 'down', date: '2027-01-01', time: '00:00', tz: 'Asia/Taipei',
      precision: 'day', includeStart: true, label: '', doneText: '🎉 就是今天！', showTarget: true,
      showTotal: true, layout: 'card', align: 'center', color: 'blue', theme: 'light', bg: 'card',
    },
    fields: [
      { type: 'section', label: '基本設定' },
      { k: 'title', type: 'text', label: '標題', ph: '例如：在一起、生日、期末考' },
      { k: 'emoji', type: 'emoji', label: '圖示' },
      { k: 'mode', type: 'seg', label: '模式', options: [['down', '⏳ 倒數'], ['up', '📈 累積'], ['yearly', '🎂 每年紀念日']],
        hint: (c) => ({ down: '計算距離某天還有幾天', up: '計算從某天開始已經過了幾天', yearly: '每年同一天重複，例如生日、週年紀念' }[c.mode]) },
      { k: 'date', type: 'date', label: (c) => (c.mode === 'down' ? '目標日期' : '起始日期') },
      { k: 'time', type: 'time', label: '時間' },
      { k: 'tz', type: 'tz', label: '時區' },
      { type: 'section', label: '顯示' },
      { k: 'precision', type: 'seg', label: '顯示到', options: [['day', '天'], ['hour', '小時'], ['minute', '分鐘'], ['second', '秒']],
        hint: '預設以「天」為單位，可加上更細的時分秒' },
      { k: 'includeStart', type: 'toggle', label: '起始日當天算第 1 天', show: (c) => c.mode !== 'down' },
      { k: 'label', type: 'text', label: '數字前的文字', ph: '留空自動顯示（還有／已經／今天是第）' },
      { k: 'doneText', type: 'text', label: '當天顯示文字', show: (c) => c.mode !== 'up' },
      { k: 'showTarget', type: 'toggle', label: '顯示日期與時區' },
      { k: 'showTotal', type: 'toggle', label: '同時顯示已累積天數', show: (c) => c.mode === 'yearly' },
    ].concat(NT.appearanceFields([
      { k: 'layout', type: 'seg', label: '版型', options: [['card', '大數字'], ['blocks', '方塊'], ['inline', '單行']] },
      { k: 'align', type: 'seg', label: '對齊', options: [['center', '置中'], ['left', '靠左']] },
      { k: 'color', type: 'color', label: '強調色' },
    ])),
    render(root, cfg, env) {
      const c = NT.col(cfg.color, env.theme);
      const box = document.createElement('div');
      box.className = 'w w-box wc layout-' + cfg.layout + ' align-' + cfg.align;
      box.setAttribute('data-export', '');
      box.style.setProperty('--c', c.fg);
      box.style.setProperty('--cbg', c.bg);
      root.appendChild(box);
      const draw = () => { box.innerHTML = html(cfg, compute(cfg, Date.now())); };
      draw();
      const timer = setInterval(draw, cfg.precision === 'second' ? 1000 : cfg.precision === 'day' ? 30000 : 5000);
      return () => clearInterval(timer);
    },
  });
  NT._countdownCompute = compute; // 供測試使用
})();
