/* =========================================================
 * core.js — 網站與嵌入頁共用的基礎工具
 * - Notion 配色
 * - 設定編碼 / 解碼（壓縮後放進網址）
 * - 時區計算
 * - 小工具（跳脫 HTML、安全網址…）
 * ========================================================= */
(function () {
  'use strict';
  const NT = (window.NT = window.NT || {});
  NT.widgets = NT.widgets || {};
  NT.widgetOrder = NT.widgetOrder || [];

  /** 註冊一個嵌入工具 */
  NT.register = function (def) {
    NT.widgets[def.id] = def;
    if (NT.widgetOrder.indexOf(def.id) < 0) NT.widgetOrder.push(def.id);
  };

  /** 所有工具共用的「外觀」欄位 */
  NT.appearanceFields = function (extra) {
    return [{ type: 'section', label: '外觀' }]
      .concat(extra || [])
      .concat([
        { k: 'theme', type: 'seg', label: '主題', options: [['light', '☀️ 淺色'], ['dark', '🌙 深色'], ['auto', '🖥 跟隨系統']] },
        { k: 'bg', type: 'seg', label: '背景', options: [['card', '卡片'], ['plain', '填滿'], ['transparent', '透明']],
          hint: '「透明」會直接融入 Notion 頁面背景' },
      ]);
  };

  /* ---------------- Notion 配色 ---------------- */
  NT.palette = {
    light: {
      default: { fg: '#37352F', bg: '#F1F1EF' },
      gray: { fg: '#787774', bg: '#F1F1EF' },
      brown: { fg: '#9F6B53', bg: '#F4EEEE' },
      orange: { fg: '#D9730D', bg: '#FBECDD' },
      yellow: { fg: '#CB912F', bg: '#FBF3DB' },
      green: { fg: '#448361', bg: '#EDF3EC' },
      blue: { fg: '#337EA9', bg: '#E7F3F8' },
      purple: { fg: '#9065B0', bg: '#F6F3F9' },
      pink: { fg: '#C14C8A', bg: '#F9F0F5' },
      red: { fg: '#D44C47', bg: '#FDEBEC' },
    },
    dark: {
      default: { fg: '#D4D4D4', bg: '#2F2F2F' },
      gray: { fg: '#9B9B9B', bg: '#2F2F2F' },
      brown: { fg: '#BA856F', bg: '#4A3228' },
      orange: { fg: '#C77D48', bg: '#5C3B23' },
      yellow: { fg: '#CA9849', bg: '#564328' },
      green: { fg: '#529E72', bg: '#243D30' },
      blue: { fg: '#379AD3', bg: '#143A4E' },
      purple: { fg: '#9D68D3', bg: '#3C2D49' },
      pink: { fg: '#D15796', bg: '#4E2C3C' },
      red: { fg: '#DF5452', bg: '#522E2A' },
    },
  };
  NT.colorNames = {
    default: '預設', gray: '灰色', brown: '棕色', orange: '橘色', yellow: '黃色',
    green: '綠色', blue: '藍色', purple: '紫色', pink: '粉色', red: '紅色',
  };

  /** 取得顏色：可傳入 Notion 色名或 #hex */
  NT.col = function (name, theme) {
    const pal = NT.palette[theme === 'dark' ? 'dark' : 'light'];
    if (pal[name]) return pal[name];
    if (typeof name === 'string' && /^#[0-9a-f]{3,8}$/i.test(name)) {
      return { fg: name, bg: NT.alpha(name, theme === 'dark' ? 0.28 : 0.14) };
    }
    return pal.default;
  };

  NT.hexToRgb = function (hex) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    if (isNaN(n)) return { r: 0, g: 0, b: 0 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  NT.alpha = function (hex, a) {
    const { r, g, b } = NT.hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };
  /** 依背景亮度決定文字用深色或淺色 */
  NT.isLight = function (hex) {
    const { r, g, b } = NT.hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  };
  NT.textOn = function (hex) {
    return NT.isLight(hex) ? '#37352F' : '#FFFFFF';
  };

  /* ---------------- 字串 / 安全 ---------------- */
  NT.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  /** 文字跳脫後保留換行 */
  NT.escBr = function (s) {
    return NT.esc(s).replace(/\n/g, '<br>');
  };
  /** 只允許 http(s) 與 data:image 圖片網址 */
  NT.safeUrl = function (u) {
    u = String(u || '').trim();
    if (/^https?:\/\//i.test(u)) return u;
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=]+$/i.test(u)) return u;
    return '';
  };
  NT.clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  NT.pad2 = (n) => String(n).padStart(2, '0');
  NT.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  NT.clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------- 設定差異 / 合併 ---------------- */
  /** 只保留與預設值不同的欄位，讓網址更短 */
  NT.diff = function (cfg, defaults) {
    const out = {};
    Object.keys(cfg).forEach((k) => {
      if (JSON.stringify(cfg[k]) !== JSON.stringify(defaults[k])) out[k] = cfg[k];
    });
    return out;
  };
  NT.merge = function (defaults, partial) {
    const out = NT.clone(defaults);
    if (partial && typeof partial === 'object') {
      Object.keys(partial).forEach((k) => {
        if (k in out) out[k] = partial[k];
      });
    }
    return out;
  };

  /* ---------------- 編碼 ---------------- */
  function b64uFromBytes(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function bytesFromB64u(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  /** 物件 → 網址字串（可用時以 deflate 壓縮，前綴 z；否則前綴 j） */
  NT.encode = async function (obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (window.CompressionStream) {
      try {
        const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        const buf = new Uint8Array(await new Response(stream).arrayBuffer());
        if (buf.length < bytes.length) return 'z' + b64uFromBytes(buf);
      } catch (e) { /* 改用未壓縮 */ }
    }
    return 'j' + b64uFromBytes(bytes);
  };
  NT.decode = async function (str) {
    if (!str) return {};
    const kind = str[0];
    const bytes = bytesFromB64u(str.slice(1));
    let raw = bytes;
    if (kind === 'z') {
      if (!window.DecompressionStream) throw new Error('此瀏覽器版本過舊，無法讀取壓縮設定');
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      raw = new Uint8Array(await new Response(stream).arrayBuffer());
    } else if (kind !== 'j') {
      throw new Error('設定格式錯誤');
    }
    return JSON.parse(new TextDecoder().decode(raw));
  };

  /** 網站根目錄（支援 GitHub Pages 子路徑） */
  NT.baseUrl = function () {
    return location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
  };
  /** 產生嵌入網址 */
  NT.buildEmbedUrl = async function (type, cfg) {
    const def = NT.widgets[type];
    const partial = def ? NT.diff(cfg, def.defaults) : cfg;
    const c = await NT.encode(partial);
    return NT.baseUrl() + 'embed.html?w=' + encodeURIComponent(type) + '&c=' + c;
  };
  /** 從嵌入網址解析出 { type, cfg } */
  NT.parseEmbedUrl = async function (url) {
    const u = new URL(String(url).trim(), location.href);
    const type = u.searchParams.get('w');
    if (!type) throw new Error('連結中找不到工具類型');
    const partial = await NT.decode(u.searchParams.get('c') || '');
    return { type, partial };
  };

  /* ---------------- 時區 ---------------- */
  const fmtCache = {};
  function getFmt(tz) {
    if (!fmtCache[tz]) {
      fmtCache[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
      });
    }
    return fmtCache[tz];
  }
  NT.validTz = function (tz) {
    try { getFmt(tz); return true; } catch (e) { return false; }
  };
  NT.safeTz = (tz) => (NT.validTz(tz) ? tz : 'Asia/Taipei');
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  /** 某個時間點在指定時區的年月日時分秒 */
  NT.tzParts = function (ts, tz) {
    const p = {};
    getFmt(NT.safeTz(tz)).formatToParts(new Date(ts)).forEach((x) => (p[x.type] = x.value));
    return {
      y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second,
      wd: WD[p.weekday],
    };
  };
  /** 時區與 UTC 的差（毫秒） */
  NT.tzOffset = function (ts, tz) {
    const p = NT.tzParts(ts, tz);
    return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000;
  };
  /** 指定時區的「牆上時間」→ UTC 時間戳 */
  NT.zonedToUtc = function (y, m, d, h, mi, s, tz) {
    const guess = Date.UTC(y, m - 1, d, h || 0, mi || 0, s || 0);
    const off = NT.tzOffset(guess, tz);
    let ts = guess - off;
    const off2 = NT.tzOffset(ts, tz);
    if (off2 !== off) ts = guess - off2;
    return ts;
  };
  /** 日曆日序號（用來算「差幾天」，不受時分影響） */
  NT.dayIndex = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / 864e5);
  NT.parseDate = function (s) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || '').trim());
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  };
  NT.parseTime = function (s) {
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(s || '').trim());
    return m ? { h: +m[1], mi: +m[2], s: +(m[3] || 0) } : { h: 0, mi: 0, s: 0 };
  };
  NT.daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  NT.weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

  NT.tzNames = {
    'Asia/Taipei': '台北', 'Asia/Tokyo': '東京', 'Asia/Seoul': '首爾', 'Asia/Shanghai': '上海',
    'Asia/Hong_Kong': '香港', 'Asia/Macau': '澳門', 'Asia/Singapore': '新加坡',
    'Asia/Kuala_Lumpur': '吉隆坡', 'Asia/Bangkok': '曼谷', 'Asia/Ho_Chi_Minh': '胡志明市',
    'Asia/Manila': '馬尼拉', 'Asia/Jakarta': '雅加達', 'Asia/Kolkata': '印度',
    'Asia/Dubai': '杜拜', 'Europe/London': '倫敦', 'Europe/Paris': '巴黎',
    'Europe/Berlin': '柏林', 'Europe/Amsterdam': '阿姆斯特丹', 'Europe/Rome': '羅馬',
    'Europe/Madrid': '馬德里', 'Europe/Moscow': '莫斯科', 'America/New_York': '紐約',
    'America/Chicago': '芝加哥', 'America/Denver': '丹佛', 'America/Los_Angeles': '洛杉磯',
    'America/Vancouver': '溫哥華', 'America/Toronto': '多倫多', 'America/Sao_Paulo': '聖保羅',
    'Australia/Sydney': '雪梨', 'Australia/Melbourne': '墨爾本', 'Australia/Perth': '伯斯',
    'Australia/Brisbane': '布里斯本', 'Pacific/Auckland': '奧克蘭', 'Pacific/Honolulu': '夏威夷',
    UTC: '世界標準時間',
  };
  NT.tzOffsetLabel = function (tz) {
    const off = Math.round(NT.tzOffset(Date.now(), tz) / 60000);
    const sign = off >= 0 ? '+' : '-';
    const a = Math.abs(off);
    return 'UTC' + sign + Math.floor(a / 60) + (a % 60 ? ':' + NT.pad2(a % 60) : '');
  };
  NT.tzLabel = function (tz) {
    const name = NT.tzNames[tz] || tz.split('/').pop().replace(/_/g, ' ');
    return name + '（' + NT.tzOffsetLabel(tz) + '）';
  };
  NT.tzShort = (tz) => NT.tzNames[tz] || tz.split('/').pop().replace(/_/g, ' ');
  /** 時區清單：常用在前，其餘依字母 */
  NT.tzList = function () {
    const common = Object.keys(NT.tzNames);
    let all = [];
    try { all = Intl.supportedValuesOf('timeZone'); } catch (e) { all = []; }
    const rest = all.filter((z) => common.indexOf(z) < 0).sort();
    return { common, rest };
  };
})();
