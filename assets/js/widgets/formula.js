/* Notion 方程式（公式）標題產生器
 * 產生可直接貼到 Notion「公式 Formula」屬性的程式碼，用 style() 做出置中、彩色的標題與橫幅。
 */
(function () {
  'use strict';
  const FW = '　'; // 全形空白，用來置中（不會被合併）
  const DATE_FMT = [
    ['YYYY/MM/DD', '2026/10/09'],
    ['YYYY年M月D日', '2026年10月9日'],
    ['YYYY/MM/DD ddd', '2026/10/09 Fri'],
    ['MMMM D, YYYY', 'October 9, 2026'],
    ['M月D日 dddd', '10月9日 Friday'],
  ];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /** 顯示寬度：全形 / 中文 / emoji 算 2，半形算 1 */
  function width(str) {
    let w = 0;
    for (const ch of String(str)) {
      const c = ch.codePointAt(0);
      w += c > 0x2e80 || (c >= 0x2190 && c <= 0x2bff) ? 2 : 1;
    }
    return w;
  }
  function q(s) {
    return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  function fmtDate(fmt, p) {
    return fmt
      .replace('YYYY', p.y).replace('MMMM', MONTHS[p.m - 1]).replace('MM', NT.pad2(p.m))
      .replace('DD', NT.pad2(p.d)).replace('dddd', DAYS[p.wd]).replace('ddd', DAYS[p.wd].slice(0, 3))
      .replace(/M(?![a-z])/, p.m).replace(/D(?![a-z])/, p.d);
  }
  function today() {
    return NT.tzParts(Date.now(), 'Asia/Taipei');
  }
  function daysValue(line) {
    const d = NT.parseDate(line.date);
    if (!d) return 0;
    const t = today();
    const diff = NT.dayIndex(t.y, t.m, t.d) - NT.dayIndex(d.y, d.m, d.d);
    return line.dmode === 'until' ? -diff : diff;
  }
  function padFor(textW, cfg) {
    if (!cfg.center) return ['', ''];
    const total = (+cfg.width || 20) * 2;
    const free = Math.max(0, total - textW);
    const left = Math.floor(free / 2);
    const right = free - left;
    const mk = (u) => FW.repeat(Math.floor(u / 2)) + (u % 2 ? ' ' : '');
    return [mk(left), mk(right)];
  }

  /** 每行：{ preview: 預覽文字, expr: 公式片段 } */
  function buildLine(line, cfg) {
    let preview = '';
    let expr = '';
    if (line.kind === 'divider') {
      const unit = line.char || '━';
      const n = Math.max(1, Math.floor(((+cfg.width || 20) * 2) / Math.max(1, width(unit))));
      preview = unit.repeat(n);
      expr = q(preview);
    } else if (line.kind === 'today') {
      const f = line.dateFmt || 'YYYY/MM/DD';
      const sample = fmtDate(f, today());
      const [l, r] = padFor(width(sample), cfg);
      preview = l + sample + r;
      expr = (l ? q(l) + ' + ' : '') + 'formatDate(today(), ' + q(f) + ')' + (r ? ' + ' + q(r) : '');
    } else if (line.kind === 'days') {
      const tpl = line.tpl || '已經 {n} 天';
      const parts = tpl.split('{n}');
      const v = daysValue(line);
      const sample = parts.join(String(v));
      const [l, r] = padFor(width(sample), cfg);
      preview = l + sample + r;
      const between = line.dmode === 'until'
        ? 'dateBetween(parseDate(' + q(line.date) + '), today(), "days")'
        : 'dateBetween(today(), parseDate(' + q(line.date) + '), "days")';
      const before = l + parts[0];
      const after = parts.slice(1).join('') + r;
      expr = (before ? q(before) + ' + ' : '') + 'format(' + between + ')' + (after ? ' + ' + q(after) : '');
    } else {
      const text = line.text || '';
      const [l, r] = padFor(width(text), cfg);
      preview = l + text + r;
      expr = q(preview);
    }
    const styles = (line.st || []).map((s) => q(s));
    if (line.color && line.color !== 'default') styles.push(q(line.color));
    if (line.bgc && line.bgc !== 'default') styles.push(q(line.bgc + '_background'));
    if (line.bgc === 'default') styles.push(q('gray_background'));
    return { preview, expr: styles.length ? 'style(' + expr + ', ' + styles.join(', ') + ')' : expr };
  }

  function build(cfg) {
    const lines = (cfg.lines || []).map((l) => buildLine(l, cfg));
    let code;
    if (!lines.length) code = '""';
    else if (lines.length === 1) code = lines[0].expr;
    else if (cfg.compact) code = '[' + lines.map((l) => l.expr).join(', ') + '].join("\\n")';
    else code = '[\n  ' + lines.map((l) => l.expr).join(',\n  ') + '\n].join("\\n")';
    return { code, lines };
  }

  NT.register({
    id: 'formula',
    name: '方程式標題產生器',
    icon: '🧮',
    desc: '產生 Notion「公式」屬性用的程式碼：置中標題、彩色橫幅、自動更新的日期與天數，直接貼上就能用。',
    kind: 'formula',
    height: 220,
    defaults: {
      center: true,
      width: 16,
      compact: false,
      lines: [
        { kind: 'divider', text: '', char: '─ ✦ ─', dateFmt: 'YYYY/MM/DD', date: '', dmode: 'since', tpl: '', st: [], color: 'gray', bgc: '' },
        { kind: 'text', text: '📚 我的閱讀清單', char: '', dateFmt: 'YYYY/MM/DD', date: '', dmode: 'since', tpl: '', st: ['b'], color: '', bgc: 'blue' },
        { kind: 'today', text: '', char: '', dateFmt: 'YYYY年M月D日', date: '', dmode: 'since', tpl: '', st: [], color: 'gray', bgc: '' },
        { kind: 'days', text: '', char: '', dateFmt: 'YYYY/MM/DD', date: '2026-01-01', dmode: 'since', tpl: '今年已經讀了 {n} 天', st: ['i'], color: 'brown', bgc: '' },
      ],
      theme: 'light',
      bg: 'card',
    },
    fields: [
      { type: 'section', label: '版面', hint: '在 Notion 資料庫新增「公式（Formula）」屬性，把產生的程式碼貼進去即可。多行顯示需開啟屬性的「換行（Wrap）」。' },
      { k: 'center', type: 'toggle', label: '用全形空白自動置中' },
      { k: 'width', type: 'range', label: '欄位寬度（約幾個中文字）', min: 6, max: 40, step: 1, unit: ' 字', show: (c) => c.center },
      { k: 'compact', type: 'toggle', label: '輸出成單行程式碼' },
      {
        k: 'lines', type: 'list', label: '行', addLabel: '新增一行', max: 12,
        itemLabel: (it) => ({ text: '文字：' + (it.text || ''), divider: '分隔線：' + (it.char || ''), today: '📅 今天日期', days: '🔢 ' + (it.tpl || '天數') }[it.kind] || ''),
        newItem: () => ({ kind: 'text', text: '新的標題', char: '━', dateFmt: 'YYYY/MM/DD', date: '', dmode: 'since', tpl: '已經 {n} 天', st: [], color: '', bgc: '' }),
        item: [
          { k: 'kind', type: 'seg', label: '類型', options: [['text', '文字'], ['divider', '分隔線'], ['today', '今天日期'], ['days', '天數計算']] },
          { k: 'text', type: 'text', label: '文字', show: (it) => it.kind === 'text' },
          { k: 'char', type: 'text', label: '分隔線圖樣（會自動重複）', ph: '例如 ━ 或 ─ ✦ ─', show: (it) => it.kind === 'divider' },
          { k: 'dateFmt', type: 'select', label: '日期格式', options: DATE_FMT.map((f) => [f[0], f[0] + '　→　' + f[1]]), show: (it) => it.kind === 'today' },
          { k: 'date', type: 'date', label: '日期', show: (it) => it.kind === 'days' },
          { k: 'dmode', type: 'seg', label: '計算', options: [['since', '從這天起已經過'], ['until', '距離這天還有']], show: (it) => it.kind === 'days' },
          { k: 'tpl', type: 'text', label: '文字（{n} 會換成天數）', show: (it) => it.kind === 'days' },
          { k: 'st', type: 'checks', label: '樣式', options: [['b', '粗體'], ['i', '斜體'], ['u', '底線'], ['s', '刪除線'], ['c', '程式碼']] },
          { k: 'color', type: 'color', label: '文字顏色', allowEmpty: true },
          { k: 'bgc', type: 'color', label: '背景顏色', allowEmpty: true },
        ],
      },
      { type: 'section', label: '預覽' },
      { k: 'theme', type: 'seg', label: '預覽主題', options: [['light', '☀️ 淺色'], ['dark', '🌙 深色']] },
    ],
    output: build,
    render(root, cfg, env) {
      const { lines } = build(cfg);
      const wrap = document.createElement('div');
      wrap.className = 'fx-wrap';
      const html = (cfg.lines || []).map((l, i) => {
        const cls = (l.st || []).join(' ');
        const style = [];
        if (l.color && l.color !== 'default') style.push('color:' + NT.col(l.color, env.theme).fg);
        if (l.bgc) style.push('background:' + NT.col(l.bgc === 'default' ? 'gray' : l.bgc, env.theme).bg);
        return '<span class="' + cls + '" style="' + style.join(';') + '">' + NT.esc(lines[i].preview) + '</span>';
      }).join('\n');
      wrap.innerHTML = '<div class="fx-note">在 Notion 中的大致樣子（實際寬度依欄寬與字型而定）</div><div class="fx-cell"><div class="fx-out">' + html + '</div></div>';
      root.appendChild(wrap);
    },
  });
  NT._formulaWidth = width;
})();
