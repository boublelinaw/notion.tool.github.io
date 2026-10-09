/* 置中標題 / 橫幅 */
(function () {
  'use strict';
  const GRADIENTS = {
    peach: ['蜜桃', ['#FBECDD', '#FDEBEC']],
    sky: ['天空', ['#E7F3F8', '#F6F3F9']],
    mint: ['薄荷', ['#EDF3EC', '#E7F3F8']],
    lemon: ['檸檬', ['#FBF3DB', '#FBECDD']],
    lavender: ['薰衣草', ['#F6F3F9', '#F9F0F5']],
    aurora: ['極光', ['#A18CD1', '#FBC2EB']],
    sunset: ['夕陽', ['#FF9A8B', '#FF6A88', '#FF99AC']],
    ocean: ['海洋', ['#2193B0', '#6DD5ED']],
    forest: ['森林', ['#134E5E', '#71B280']],
    night: ['夜空', ['#232526', '#414345']],
  };
  const FONTS = {
    sans: 'var(--font)',
    serif: 'var(--serif)',
    mono: 'var(--mono)',
    round: '"Arial Rounded MT Bold", "Hiragino Maru Gothic ProN", "Yuanti TC", var(--font)',
  };

  NT.register({
    id: 'banner',
    name: '置中標題 / 橫幅',
    icon: '🏷️',
    desc: '頁面頂端的大標題、分隔橫幅。可設定漸層、Notion 色塊或圖片背景，文字置中與裝飾線。',
    height: 200,
    defaults: {
      title: 'My Notion Space',
      subtitle: '生活 · 學習 · 紀錄',
      emoji: '🌿',
      align: 'center',
      font: 'serif',
      size: 40,
      bold: true,
      spacing: 2,
      deco: 'lines',
      bgType: 'gradient',
      gradient: 'sky',
      angle: 135,
      notionColor: 'blue',
      solid: '#F7F6F3',
      image: '',
      overlay: 30,
      textColor: '',
      radius: 10,
      theme: 'light',
      bg: 'transparent',
    },
    fields: [
      { type: 'section', label: '文字' },
      { k: 'emoji', type: 'emoji', label: '圖示' },
      { k: 'title', type: 'textarea', label: '標題', rows: 2 },
      { k: 'subtitle', type: 'text', label: '副標題' },
      { k: 'align', type: 'seg', label: '對齊', options: [['left', '靠左'], ['center', '置中'], ['right', '靠右']] },
      { k: 'font', type: 'seg', label: '字體', options: [['sans', '黑體'], ['serif', '明體'], ['mono', '等寬'], ['round', '圓體']] },
      { k: 'size', type: 'range', label: '字級', min: 18, max: 80, step: 1, unit: 'px' },
      { k: 'bold', type: 'toggle', label: '粗體' },
      { k: 'spacing', type: 'range', label: '字距', min: 0, max: 30, step: 1 },
      { k: 'deco', type: 'select', label: '裝飾', options: [['none', '無'], ['lines', '── ✦ ── 分隔線'], ['stars', '✦ ✧ ✦ 星星'], ['frame', '單線外框'], ['double', '雙線外框'], ['underline', '螢光筆底線']] },
      { k: 'textColor', type: 'hex', label: '文字顏色', hint: '留空會依背景自動選擇深色或白色' },
      { type: 'section', label: '背景' },
      { k: 'bgType', type: 'seg', label: '背景類型', options: [['gradient', '漸層'], ['notion', 'Notion 色'], ['solid', '自訂色'], ['image', '圖片'], ['none', '無']] },
      { k: 'gradient', type: 'select', label: '漸層', options: Object.keys(GRADIENTS).map((k) => [k, GRADIENTS[k][0]]), show: (c) => c.bgType === 'gradient' },
      { k: 'angle', type: 'range', label: '漸層角度', min: 0, max: 360, step: 15, unit: '°', show: (c) => c.bgType === 'gradient' },
      { k: 'notionColor', type: 'color', label: 'Notion 背景色', show: (c) => c.bgType === 'notion' },
      { k: 'solid', type: 'hex', label: '背景顏色', show: (c) => c.bgType === 'solid' },
      { k: 'image', type: 'image', label: '背景圖片', show: (c) => c.bgType === 'image' },
      { k: 'overlay', type: 'range', label: '圖片暗化', min: 0, max: 80, step: 5, unit: '%', show: (c) => c.bgType === 'image' },
      { k: 'radius', type: 'range', label: '圓角', min: 0, max: 30, step: 1, unit: 'px' },
    ].concat(NT.appearanceFields()),
    render(root, cfg, env) {
      const el = document.createElement('div');
      el.className = 'bn al-' + cfg.align + (cfg.deco === 'underline' ? ' dl-underline' : '');
      el.setAttribute('data-export', '');
      el.style.setProperty('--rad', (+cfg.radius || 0) + 'px');
      let base = env.theme === 'dark' ? '#191919' : '#FFFFFF';
      let overlay = '';
      if (cfg.bgType === 'gradient') {
        const g = (GRADIENTS[cfg.gradient] || GRADIENTS.sky)[1];
        el.style.background = 'linear-gradient(' + (+cfg.angle || 0) + 'deg,' + g.join(',') + ')';
        base = g[0];
      } else if (cfg.bgType === 'notion') {
        base = NT.col(cfg.notionColor, env.theme).bg;
        el.style.background = base;
      } else if (cfg.bgType === 'solid') {
        base = /^#/.test(cfg.solid) ? cfg.solid : '#F7F6F3';
        el.style.background = base;
      } else if (cfg.bgType === 'image' && NT.safeUrl(cfg.image)) {
        el.style.backgroundImage = 'url("' + NT.safeUrl(cfg.image).replace(/"/g, '%22') + '")';
        base = '#000000';
        overlay = '<div class="bn-overlay" style="background:rgba(0,0,0,' + (+cfg.overlay || 0) / 100 + ')"></div>';
        if (+cfg.overlay < 20) base = '#888888';
      } else {
        el.style.background = 'transparent';
      }
      const color = cfg.textColor || (cfg.bgType === 'none' ? 'var(--fg)' : NT.textOn(base));
      el.style.color = color;
      el.style.setProperty('--hl', cfg.textColor ? NT.alpha(cfg.textColor, 0.22) : NT.isLight(base) ? 'rgba(251,243,219,0.95)' : 'rgba(255,255,255,0.22)');

      const ls = (+cfg.spacing || 0) / 100 + 'em';
      const title = '<h1 class="bn-title" style="letter-spacing:' + ls + ';font-weight:' + (cfg.bold ? 700 : 400) + '">' + NT.escBr(cfg.title) + '</h1>';
      const sub = cfg.subtitle ? '<div class="bn-sub">' + NT.esc(cfg.subtitle) + '</div>' : '';
      const emoji = cfg.emoji ? '<div class="bn-emoji">' + NT.esc(cfg.emoji) + '</div>' : '';
      let inner;
      if (cfg.deco === 'lines') inner = emoji + title + '<div class="bn-deco">──── ✦ ────</div>' + sub;
      else if (cfg.deco === 'stars') inner = emoji + '<div class="bn-deco">✦ ✧ ✦</div>' + title + sub;
      else if (cfg.deco === 'frame' || cfg.deco === 'double') inner = emoji + '<div class="bn-frame' + (cfg.deco === 'double' ? ' double' : '') + '">' + title + '</div>' + sub;
      else inner = emoji + title + sub;
      el.innerHTML = overlay + '<div class="bn-inner" style="font-family:' + (FONTS[cfg.font] || FONTS.sans) + ';font-size:min(' + NT.clamp(+cfg.size || 40, 12, 120) + 'px,' + NT.clamp(+cfg.size || 40, 12, 120) / 4 + 'vw)">' + inner + '</div>';
      root.appendChild(el);
    },
  });
})();
