// 讀取中央氣象署「桃園市中壢區」鄉鎮預報，輸出明天的天氣摘要（JSON）。
// 用法：node scripts/cwa_tomorrow.js
// 頁面資料靠 JS 渲染，所以用 Playwright（Chromium）開頁面後讀表格。
// 表格排列：今天 24 筆逐時、明天 8 筆逐三小時、後天 8 筆逐三小時；
// 天氣狀況／降雨機率每天 8 筆（每 3 小時一筆）。
const PW = ['/opt/node-tools/node_modules/playwright', 'playwright'];
let chromium;
for (const p of PW) { try { ({ chromium } = require(p)); break; } catch (e) {} }
if (!chromium) { console.error('找不到 playwright'); process.exit(2); }

const URL = 'https://www.cwa.gov.tw/V8/C/W/Town/Town.html?TID=6800200';
const EXE = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  try {
    const pg = await b.newPage();
    await pg.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
    const rows = await pg.evaluate(() => {
      const o = {};
      document.querySelectorAll('tr').forEach(tr => {
        const h = (tr.querySelector('th') || {}).innerText;
        if (!h) return;
        const k = h.trim();
        if (!['溫度', '天氣狀況', '降雨機率'].includes(k) || o[k]) return;
        o[k] = [...tr.querySelectorAll('td')].map(td =>
          td.innerText.trim() || ((td.querySelector('img') || {}).alt || ''));
      });
      return o;
    });
    const t = rows['溫度'], w = rows['天氣狀況'], r = rows['降雨機率'];
    if (!t || t.length !== 40 || !w || w.length !== 24 || !r || r.length !== 24)
      throw new Error('表格格式與預期不符');
    const temps = t.slice(24, 32).map(Number);
    const wx = w.slice(8, 16).map(s => s.replace('天氣圖示，', ''));
    const rain = r.slice(8, 16).map(s => parseInt(s, 10));
    const uniq = [...new Set(wx)];
    console.log(JSON.stringify({
      place: '桃園市中壢區',
      min: Math.min(...temps), max: Math.max(...temps),
      rain_max: Math.max(...rain),
      weather: uniq.join('、'),
      weather_3h: wx, rain_3h: rain, temp_3h: temps,
    }, null, 1));
  } finally { await b.close(); }
})().catch(e => { console.error('讀取失敗：' + e.message); process.exit(1); });
