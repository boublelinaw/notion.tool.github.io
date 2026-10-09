/* 聊天室展示 */
(function () {
  'use strict';

  const ICON = {
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    video: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
    dots: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    smile: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/></svg>',
  };

  // 各風格的預設配色（使用者可另外覆蓋背景與對話框顏色）
  const PRESET = {
    line: {
      light: { chatbg: '#8EB0DA', headbg: '#8EB0DA', headfg: '#1E2A3A', headline: 'rgba(0,0,0,0.06)', a: '#FFFFFF', b: '#A6E28A', name: '#1E2F48', meta: 'rgba(20,35,60,0.6)', sysbg: 'rgba(0,0,0,0.16)', sysfg: '#FFFFFF', input: '#FFFFFF' },
      dark: { chatbg: '#1E2633', headbg: '#161B24', headfg: '#E8E8E8', headline: 'rgba(255,255,255,0.06)', a: '#323A48', b: '#3E8E45', name: '#B8C2D0', meta: 'rgba(255,255,255,0.45)', sysbg: 'rgba(255,255,255,0.1)', sysfg: '#D0D0D0', input: '#2A303B' },
    },
    imessage: {
      light: { chatbg: '#FFFFFF', headbg: '#F6F6F7', headfg: '#111111', headline: '#E5E5EA', a: '#E9E9EB', b: '#0A84FF', name: '#8E8E93', meta: '#8E8E93', sysbg: 'transparent', sysfg: '#8E8E93', input: '#FFFFFF' },
      dark: { chatbg: '#000000', headbg: '#1C1C1E', headfg: '#FFFFFF', headline: '#2C2C2E', a: '#26252A', b: '#0A84FF', name: '#8E8E93', meta: '#8E8E93', sysbg: 'transparent', sysfg: '#8E8E93', input: '#1C1C1E' },
    },
    notion: {
      light: { chatbg: '#FFFFFF', headbg: '#F7F6F3', headfg: '#37352F', headline: 'rgba(55,53,47,0.09)', a: '#F1F1EF', b: '#E7F3F8', name: 'rgba(55,53,47,0.65)', meta: 'rgba(55,53,47,0.45)', sysbg: 'rgba(55,53,47,0.06)', sysfg: 'rgba(55,53,47,0.65)', input: '#FFFFFF' },
      dark: { chatbg: '#191919', headbg: '#202020', headfg: 'rgba(255,255,255,0.81)', headline: 'rgba(255,255,255,0.094)', a: '#2F2F2F', b: '#143A4E', name: 'rgba(255,255,255,0.52)', meta: 'rgba(255,255,255,0.36)', sysbg: 'rgba(255,255,255,0.055)', sysfg: 'rgba(255,255,255,0.52)', input: '#252525' },
    },
  };

  function avatar(name, url, color, cls) {
    const u = NT.safeUrl(url);
    if (u) return '<div class="chat-av ' + (cls || '') + '"><img src="' + NT.esc(u) + '" alt=""></div>';
    const ch = Array.from(String(name || '?').trim())[0] || '?';
    return '<div class="chat-av ' + (cls || '') + '" style="background:' + color + '">' + NT.esc(ch) + '</div>';
  }

  NT.register({
    id: 'chat',
    name: '聊天室展示',
    icon: '💬',
    desc: '模擬兩人的聊天對話框，可換頭貼、名稱、對話內容與風格（LINE / iMessage / Notion），並可匯出圖片。',
    height: 520,
    exportable: true,
    defaults: {
      style: 'line',
      title: '小晴',
      subtitle: '',
      aName: '小晴', aAvatar: '',
      bName: '我', bAvatar: '',
      showHeader: true,
      showAvatar: true,
      showName: false,
      showTime: true,
      showRead: true,
      showInput: true,
      fit: 'fill',
      chatBg: '', aBubble: '', bBubble: '',
      messages: [
        { who: 'sys', kind: 'text', text: '2024/05/20（一）', image: '', time: '' },
        { who: 'a', kind: 'text', text: '早安～今天天氣好好 ☀️', image: '', time: '08:02' },
        { who: 'b', kind: 'text', text: '早安！要不要一起去吃早午餐？', image: '', time: '08:05' },
        { who: 'a', kind: 'text', text: '好啊！老地方見', image: '', time: '08:06' },
        { who: 'a', kind: 'sticker', text: '🥞', image: '', time: '08:06' },
        { who: 'b', kind: 'sticker', text: '🥰', image: '', time: '08:07' },
        { who: 'b', kind: 'text', text: '等等見 👋', image: '', time: '08:07' },
      ],
      theme: 'light',
      bg: 'card',
    },
    fields: [
      { type: 'section', label: '聊天室' },
      { k: 'style', type: 'seg', label: '風格', options: [['line', 'LINE'], ['imessage', 'iMessage'], ['notion', 'Notion']] },
      { k: 'title', type: 'text', label: '聊天室標題' },
      { k: 'subtitle', type: 'text', label: '副標題', ph: '例如：上線中、3 位成員（選填）' },
      { type: 'section', label: '人物' },
      { k: 'aName', type: 'text', label: '對方名稱（左側）' },
      { k: 'aAvatar', type: 'image', label: '對方頭貼', avatar: true },
      { k: 'bName', type: 'text', label: '我的名稱（右側）' },
      { k: 'bAvatar', type: 'image', label: '我的頭貼', avatar: true },
      { type: 'section', label: '對話內容' },
      {
        k: 'messages', type: 'list', label: '訊息', addLabel: '新增訊息', max: 200, compact: true,
        itemLabel: (it, i, cfg) => {
          const who = it.who === 'sys' ? '📅' : it.who === 'a' ? '◀ ' + (cfg.aName || '對方') : (cfg.bName || '我') + ' ▶';
          const body = it.kind === 'image' && it.who !== 'sys' ? '［圖片］' : it.text;
          return who + '：' + (body || '').slice(0, 24);
        },
        newItem: (list) => {
          const last = list[list.length - 1];
          return { who: last && last.who === 'a' ? 'b' : 'a', kind: 'text', text: '', image: '', time: last && last.time ? last.time : '' };
        },
        item: [
          { k: 'who', type: 'seg', label: '發話者', options: [['a', '對方'], ['b', '我'], ['sys', '日期/系統']] },
          { k: 'kind', type: 'seg', label: '類型', options: [['text', '文字'], ['sticker', '大表情'], ['image', '圖片']], show: (it) => it.who !== 'sys' },
          { k: 'text', type: 'textarea', label: '內容', show: (it) => it.who === 'sys' || it.kind !== 'image' },
          { k: 'image', type: 'image', label: '圖片', show: (it) => it.who !== 'sys' && it.kind === 'image' },
          { k: 'time', type: 'text', label: '時間', ph: '例如 08:30（選填）', show: (it) => it.who !== 'sys' },
        ],
      },
      { type: 'section', label: '顯示選項' },
      { k: 'showHeader', type: 'toggle', label: '顯示標題列' },
      { k: 'showAvatar', type: 'toggle', label: '顯示對方頭貼' },
      { k: 'showName', type: 'toggle', label: '顯示對方名稱' },
      { k: 'showTime', type: 'toggle', label: '顯示時間' },
      { k: 'showRead', type: 'toggle', label: '顯示「已讀」' },
      { k: 'showInput', type: 'toggle', label: '顯示底部輸入列' },
      { k: 'fit', type: 'seg', label: '高度', options: [['fill', '填滿嵌入框（可捲動）'], ['auto', '依內容']] },
    ].concat(NT.appearanceFields([
      { k: 'chatBg', type: 'hex', label: '聊天背景色', hint: '留空使用風格預設' },
      { k: 'aBubble', type: 'hex', label: '對方對話框顏色' },
      { k: 'bBubble', type: 'hex', label: '我的對話框顏色' },
    ])),
    render(root, cfg, env) {
      const style = PRESET[cfg.style] ? cfg.style : 'line';
      const P = PRESET[style][env.theme === 'dark' ? 'dark' : 'light'];
      const chatbg = cfg.chatBg || P.chatbg;
      const aB = cfg.aBubble || P.a;
      const bB = cfg.bBubble || P.b;
      const el = document.createElement('div');
      el.className = 'chat s-' + style + (cfg.fit === 'fill' ? ' fill' : '');
      el.setAttribute('data-export', '');
      const vars = {
        '--chatbg': chatbg, '--headbg': cfg.chatBg && style === 'line' ? cfg.chatBg : P.headbg,
        '--headfg': P.headfg, '--headline': P.headline, '--name': P.name,
        '--namefg': cfg.chatBg ? (NT.isLight(chatbg) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)') : P.name,
        '--metafg': cfg.chatBg ? (NT.isLight(chatbg) ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.5)') : P.meta,
        '--sysbg': P.sysbg, '--sysfg': cfg.chatBg && style !== 'line' ? (NT.isLight(chatbg) ? '#777' : '#bbb') : P.sysfg,
        '--inputbg': P.input,
      };
      Object.keys(vars).forEach((k) => el.style.setProperty(k, vars[k]));
      const aColor = NT.col('orange', 'light').fg;
      const bColor = NT.col('blue', 'light').fg;

      let head = '';
      if (cfg.showHeader) {
        const icons = style === 'line' ? ICON.search + ICON.phone + ICON.menu : style === 'imessage' ? ICON.video : ICON.dots;
        const headAv = style === 'imessage' ? avatar(cfg.aName, cfg.aAvatar, aColor, 'chat-head-av') : '';
        head =
          '<div class="chat-head"><span class="chat-back">‹</span>' + headAv +
          '<div class="chat-head-text"><div class="chat-head-title">' + NT.esc(cfg.title || cfg.aName) + '</div>' +
          (cfg.subtitle ? '<div class="chat-head-sub">' + NT.esc(cfg.subtitle) + '</div>' : '') +
          '</div><div class="chat-head-icons">' + icons + '</div></div>';
      }

      const msgs = cfg.messages || [];
      let lastMe = -1;
      msgs.forEach((m, i) => { if (m.who === 'b') lastMe = i; });
      const body = msgs.map((m, i) => {
        if (m.who === 'sys') return '<div class="chat-sys">' + NT.esc(m.text) + '</div>';
        const me = m.who === 'b';
        const prev = msgs[i - 1];
        const first = !prev || prev.who !== m.who;
        const bub = me ? bB : aB;
        let bubble;
        if (m.kind === 'image') {
          const u = NT.safeUrl(m.image);
          bubble = '<div class="chat-bubble img">' + (u ? '<img src="' + NT.esc(u) + '" alt="">' : '<div class="chat-bubble">［圖片］</div>') + '</div>';
        } else if (m.kind === 'sticker') {
          bubble = '<div class="chat-bubble sticker">' + NT.esc(m.text) + '</div>';
        } else {
          bubble = '<div class="chat-bubble" style="--bub:' + bub + ';--bubfg:' + NT.textOn(bub) + '">' + NT.esc(m.text) + '</div>';
        }
        const read = me && cfg.showRead && (style === 'line' || i === lastMe);
        const meta = (read || (cfg.showTime && m.time))
          ? '<div class="chat-meta">' + (read ? '<span>已讀</span>' : '') + (cfg.showTime && m.time ? '<span>' + NT.esc(m.time) + '</span>' : '') + '</div>'
          : '';
        let av = '';
        if (!me && cfg.showAvatar) av = avatar(cfg.aName, cfg.aAvatar, aColor, first ? '' : 'ghost');
        if (me && cfg.showAvatar && style === 'notion') av = avatar(cfg.bName, cfg.bAvatar, bColor, first ? '' : 'ghost');
        const name = !me && cfg.showName && first ? '<div class="chat-name">' + NT.esc(cfg.aName) + '</div>' : '';
        return (
          '<div class="chat-row ' + (me ? 'me' : 'other') + '">' + av +
          '<div class="chat-col">' + name + '<div class="chat-line">' + bubble + meta + '</div></div></div>'
        );
      }).join('');

      const input = cfg.showInput
        ? '<div class="chat-input"><span class="chat-input-icon">' + ICON.plus + '</span><div class="chat-input-box">Aa</div><span class="chat-input-icon">' + ICON.smile + '</span></div>'
        : '';
      el.innerHTML = head + '<div class="chat-body">' + body + '</div>' + input;
      root.appendChild(el);
      if (cfg.fit !== 'fill') root.style.alignItems = 'flex-start';
    },
  });
})();
