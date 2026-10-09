/* 語錄卡 */
(function () {
  'use strict';

  NT.register({
    id: 'quote',
    name: '語錄卡',
    icon: '💭',
    desc: '放入喜歡的句子，每天自動換一句、每次打開隨機，或定時輪播。',
    height: 200,
    defaults: {
      quotes: [
        { text: '慢慢來，比較快。', author: '' },
        { text: '把每一天，都過成值得紀念的日子。', author: '' },
        { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
        { text: '生活明朗，萬物可愛。', author: '' },
      ],
      mode: 'daily',
      interval: 8,
      clickNext: true,
      style: 'quote',
      font: 'serif',
      size: 18,
      align: 'center',
      color: 'brown',
      theme: 'light',
      bg: 'card',
    },
    fields: [
      { type: 'section', label: '句子' },
      {
        k: 'quotes', type: 'list', label: '語錄', addLabel: '新增句子', max: 100,
        itemLabel: (it) => (it.text || '').slice(0, 26) || '（空白）',
        newItem: () => ({ text: '', author: '' }),
        item: [
          { k: 'text', type: 'textarea', label: '內容' },
          { k: 'author', type: 'text', label: '出處 / 作者（選填）' },
        ],
      },
      { type: 'section', label: '顯示方式' },
      { k: 'mode', type: 'seg', label: '切換', options: [['daily', '每日一句'], ['random', '每次隨機'], ['rotate', '定時輪播']] },
      { k: 'interval', type: 'range', label: '輪播間隔', min: 3, max: 60, step: 1, unit: ' 秒', show: (c) => c.mode === 'rotate' },
      { k: 'clickNext', type: 'toggle', label: '點擊換下一句' },
    ].concat(NT.appearanceFields([
      { k: 'style', type: 'seg', label: '樣式', options: [['quote', '“ 引號'], ['bar', '▍ 左側線'], ['plain', '純文字']] },
      { k: 'font', type: 'seg', label: '字體', options: [['serif', '明體'], ['sans', '黑體']] },
      { k: 'size', type: 'range', label: '字級', min: 13, max: 36, step: 1, unit: 'px' },
      { k: 'align', type: 'seg', label: '對齊', options: [['center', '置中'], ['left', '靠左']], show: (c) => c.style !== 'bar' },
      { k: 'color', type: 'color', label: '強調色' },
    ])),
    render(root, cfg, env) {
      const list = (cfg.quotes || []).filter((q) => q.text && q.text.trim());
      const c = NT.col(cfg.color, env.theme);
      const box = document.createElement('div');
      box.className = 'w w-box';
      box.setAttribute('data-export', '');
      box.style.setProperty('--c', c.fg);
      root.appendChild(box);
      if (!list.length) {
        box.innerHTML = '<div class="qt">尚未加入句子</div>';
        return;
      }
      let idx;
      if (cfg.mode === 'daily') {
        const p = NT.tzParts(Date.now(), 'Asia/Taipei');
        idx = NT.dayIndex(p.y, p.m, p.d) % list.length;
      } else if (cfg.mode === 'random') {
        idx = Math.floor(Math.random() * list.length);
      } else idx = 0;

      const qt = document.createElement('div');
      qt.className = 'qt style-' + cfg.style + ' al-' + (cfg.style === 'bar' ? 'left' : cfg.align) + (cfg.clickNext && list.length > 1 ? ' clickable' : '');
      box.appendChild(qt);
      const draw = () => {
        const q = list[idx];
        const body = '<div class="qt-text ' + (cfg.font === 'serif' ? 'serif' : '') + '" style="font-size:' + (+cfg.size || 18) + 'px">' + NT.esc(q.text) + '</div>' +
          (q.author ? '<div class="qt-author">— ' + NT.esc(q.author) + '</div>' : '');
        if (cfg.style === 'bar') qt.innerHTML = '<div class="qt-bar"></div><div>' + body + '</div>';
        else if (cfg.style === 'quote') qt.innerHTML = '<div class="qt-mark">“</div>' + body;
        else qt.innerHTML = body;
      };
      const next = () => {
        qt.classList.add('fading');
        setTimeout(() => {
          idx = (idx + 1) % list.length;
          draw();
          qt.classList.remove('fading');
        }, 380);
      };
      draw();
      let timer = null;
      if (cfg.mode === 'rotate' && list.length > 1) timer = setInterval(next, Math.max(3, +cfg.interval || 8) * 1000);
      if (cfg.clickNext && list.length > 1) qt.addEventListener('click', next);
      return () => timer && clearInterval(timer);
    },
  });
})();
