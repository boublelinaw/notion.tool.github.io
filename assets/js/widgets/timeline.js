/* 時間軸 */
(function () {
  'use strict';

  NT.register({
    id: 'timeline',
    name: '時間軸',
    icon: '🗓️',
    desc: '記錄重要時刻、旅程、專案里程碑。可切換直向／橫向，並匯出成圖片。',
    height: 460,
    exportable: true,
    defaults: {
      title: '我們的故事',
      orientation: 'vertical',
      alternate: false,
      marker: 'dot',
      cardStyle: false,
      color: 'blue',
      items: [
        { date: '2023/05/20', title: '第一次見面', text: '在巷口的咖啡廳，點了同一款拿鐵。', emoji: '☕', color: '', image: '' },
        { date: '2023/08/12', title: '第一次旅行', text: '一起去了花蓮，看了好美的海。', emoji: '🌊', color: '', image: '' },
        { date: '2024/02/14', title: '情人節', text: '收到了手寫卡片 💌', emoji: '💝', color: 'pink', image: '' },
        { date: '2025/05/20', title: '兩週年', text: '', emoji: '🎂', color: '', image: '' },
      ],
      theme: 'light',
      bg: 'card',
    },
    fields: [
      { type: 'section', label: '基本設定' },
      { k: 'title', type: 'text', label: '標題', ph: '留空則不顯示' },
      { k: 'orientation', type: 'seg', label: '方向', options: [['vertical', '↕ 直向'], ['horizontal', '↔ 橫向']] },
      { k: 'alternate', type: 'toggle', label: '左右交錯排列（寬螢幕時）', show: (c) => c.orientation === 'vertical' },
      {
        k: 'items', type: 'list', label: '事件', addLabel: '新增事件', max: 60,
        itemLabel: (it) => [it.date, it.title].filter(Boolean).join('　') || '（未命名）',
        newItem: () => ({ date: '', title: '新事件', text: '', emoji: '⭐', color: '', image: '' }),
        item: [
          { k: 'date', type: 'text', label: '日期', ph: '例如 2024/01/01 或 2024 夏天' },
          { k: 'title', type: 'text', label: '標題' },
          { k: 'text', type: 'textarea', label: '說明' },
          { k: 'emoji', type: 'emoji', label: '圖示（標記為「圖示」時顯示）' },
          { k: 'color', type: 'color', label: '顏色（留空沿用強調色）', allowEmpty: true },
          { k: 'image', type: 'image', label: '圖片（選填）' },
        ],
      },
    ].concat(NT.appearanceFields([
      { k: 'marker', type: 'seg', label: '標記', options: [['dot', '● 圓點'], ['emoji', '😀 圖示'], ['num', '① 編號']] },
      { k: 'cardStyle', type: 'toggle', label: '內容加上卡片底色' },
      { k: 'color', type: 'color', label: '強調色' },
    ])),
    render(root, cfg, env) {
      const base = NT.col(cfg.color, env.theme);
      const box = document.createElement('div');
      const horiz = cfg.orientation === 'horizontal';
      box.className = 'w w-box ' + (horiz ? 'tl-h' : 'tl-v' + (cfg.alternate ? ' alt' : '')) + (cfg.cardStyle ? ' tl-card' : '');
      box.setAttribute('data-export', '');
      const items = (cfg.items || []).map((it, i) => {
        const c = it.color ? NT.col(it.color, env.theme) : base;
        let mk = '';
        if (cfg.marker === 'emoji') mk = '<div class="tl-marker emoji">' + NT.esc(it.emoji || '•') + '</div>';
        else if (cfg.marker === 'num') mk = '<div class="tl-marker num">' + (i + 1) + '</div>';
        else mk = '<div class="tl-marker dot"></div>';
        const img = NT.safeUrl(it.image);
        return (
          '<div class="tl-item" style="--ic:' + c.fg + ';--icbg:' + c.bg + '">' + mk +
          '<div class="tl-body">' +
          (it.date ? '<div class="tl-date">' + NT.esc(it.date) + '</div>' : '') +
          (it.title ? '<div class="tl-head">' + NT.esc(it.title) + '</div>' : '') +
          (it.text ? '<div class="tl-text">' + NT.escBr(it.text) + '</div>' : '') +
          (img ? '<img class="tl-img" src="' + NT.esc(img) + '" alt="">' : '') +
          '</div></div>'
        );
      }).join('');
      const list = '<div class="tl-list">' + items + '</div>';
      box.innerHTML =
        (cfg.title ? '<h2 class="tl-title">' + NT.esc(cfg.title) + '</h2>' : '') +
        (horiz ? '<div class="tl-scroll">' + list + '</div>' : list);
      root.appendChild(box);
      root.style.alignItems = 'flex-start';
    },
  });
})();
