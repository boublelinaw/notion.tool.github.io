/* =========================================================
 * auth.js — 帳號與個人資料
 *
 * GitHub Pages 是純靜態網站（沒有伺服器），因此目前的帳號系統
 * 把資料存在「這個瀏覽器」的 localStorage：
 *   - 密碼以 PBKDF2-SHA256（15 萬次）加鹽雜湊後儲存，不會存明碼
 *   - 換裝置或清除瀏覽器資料前，請到「帳號」頁面匯出備份
 *
 * 之後若要改成雲端同步（Firebase / Supabase 等），只要替換下方
 * `backend` 物件的實作即可，網站其他地方都透過 NT.auth / NT.store 呼叫。
 * ========================================================= */
(function () {
  'use strict';
  const NT = window.NT;
  const K_USERS = 'nt.users';
  const K_SESSION = 'nt.session';
  const K_DATA = 'nt.data:';
  const listeners = [];

  function lsGet(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function lsSet(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      NT.toast && NT.toast('儲存空間不足，請刪除一些圖片或作品', 'error');
      return false;
    }
  }

  /* ---------- 儲存後端（本機版） ---------- */
  const backend = {
    getUsers: () => lsGet(K_USERS, {}),
    setUsers: (u) => lsSet(K_USERS, u),
    getData: (email) => lsGet(K_DATA + email, null),
    setData: (email, d) => lsSet(K_DATA + email, d),
    removeData: (email) => { try { localStorage.removeItem(K_DATA + email); } catch (e) {} },
    getSession: () => {
      try { return sessionStorage.getItem(K_SESSION) || localStorage.getItem(K_SESSION); } catch (e) { return null; }
    },
    setSession: (email, remember) => {
      try {
        sessionStorage.removeItem(K_SESSION);
        localStorage.removeItem(K_SESSION);
        if (email) (remember ? localStorage : sessionStorage).setItem(K_SESSION, email);
      } catch (e) {}
    },
  };

  /* ---------- 密碼雜湊 ---------- */
  function toHex(buf) {
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  async function hashPassword(password, saltHex, iterations) {
    if (!window.crypto || !crypto.subtle) throw new Error('此瀏覽器不支援安全加密，請改用 https 網址或較新的瀏覽器');
    const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
    return toHex(bits);
  }
  const ITER = 150000;
  const normEmail = (e) => String(e || '').trim().toLowerCase();
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

  function emptyData() {
    return { version: 1, recent: [], works: [], library: [], created: Date.now() };
  }

  NT.auth = {
    current() {
      const e = backend.getSession();
      return e && backend.getUsers()[e] ? e : null;
    },
    onChange(fn) { listeners.push(fn); },
    _emit() { listeners.forEach((fn) => { try { fn(NT.auth.current()); } catch (e) { console.error(e); } }); },

    async register(email, password) {
      email = normEmail(email);
      if (!validEmail(email)) throw new Error('請輸入正確的 Email');
      if (String(password).length < 6) throw new Error('密碼至少需要 6 個字元');
      const users = backend.getUsers();
      if (users[email]) throw new Error('這個 Email 已經註冊過了，請直接登入');
      const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await hashPassword(password, salt, ITER);
      users[email] = { salt, hash, iter: ITER, created: Date.now() };
      backend.setUsers(users);
      if (!backend.getData(email)) backend.setData(email, emptyData());
      backend.setSession(email, true);
      NT.auth._emit();
      return email;
    },

    async login(email, password, remember) {
      email = normEmail(email);
      const u = backend.getUsers()[email];
      if (!u) throw new Error('找不到這個帳號。帳號資料存在註冊時使用的瀏覽器中，若換了裝置請先匯入備份。');
      const hash = await hashPassword(password, u.salt, u.iter || ITER);
      if (hash !== u.hash) throw new Error('密碼不正確');
      backend.setSession(email, remember !== false);
      NT.auth._emit();
      return email;
    },

    logout() {
      backend.setSession(null);
      NT.auth._emit();
    },

    async changePassword(oldPw, newPw) {
      const email = NT.auth.current();
      if (!email) throw new Error('尚未登入');
      const users = backend.getUsers();
      const u = users[email];
      if ((await hashPassword(oldPw, u.salt, u.iter || ITER)) !== u.hash) throw new Error('目前密碼不正確');
      if (String(newPw).length < 6) throw new Error('新密碼至少需要 6 個字元');
      const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
      users[email] = Object.assign(u, { salt, hash: await hashPassword(newPw, salt, ITER), iter: ITER });
      backend.setUsers(users);
    },

    async deleteAccount(password) {
      const email = NT.auth.current();
      if (!email) return;
      const users = backend.getUsers();
      const u = users[email];
      if ((await hashPassword(password, u.salt, u.iter || ITER)) !== u.hash) throw new Error('密碼不正確');
      delete users[email];
      backend.setUsers(users);
      backend.removeData(email);
      backend.setSession(null);
      NT.auth._emit();
    },
  };

  /* ---------- 個人資料：最近使用、我的作品、我的圖庫 ---------- */
  function data() {
    const e = NT.auth.current();
    if (!e) return null;
    return Object.assign(emptyData(), backend.getData(e) || {});
  }
  function save(d) {
    const e = NT.auth.current();
    if (!e) return false;
    return backend.setData(e, d);
  }

  NT.store = {
    data,
    addRecent(type) {
      const d = data();
      if (!d) return;
      d.recent = [{ type, time: Date.now() }].concat(d.recent.filter((r) => r.type !== type)).slice(0, 12);
      save(d);
    },
    recent() {
      const d = data();
      return d ? d.recent : [];
    },
    works() {
      const d = data();
      return d ? d.works.slice().sort((a, b) => b.updated - a.updated) : [];
    },
    getWork(id) {
      const d = data();
      return d ? d.works.find((w) => w.id === id) : null;
    },
    saveWork(work) {
      const d = data();
      if (!d) return null;
      const now = Date.now();
      let w = work.id && d.works.find((x) => x.id === work.id);
      if (w) {
        Object.assign(w, { name: work.name, cfg: work.cfg, updated: now });
      } else {
        w = { id: NT.uid(), type: work.type, name: work.name, cfg: work.cfg, created: now, updated: now };
        d.works.push(w);
      }
      return save(d) ? w : null;
    },
    renameWork(id, name) {
      const d = data();
      const w = d && d.works.find((x) => x.id === id);
      if (w) { w.name = name; w.updated = Date.now(); save(d); }
    },
    deleteWork(id) {
      const d = data();
      if (!d) return;
      d.works = d.works.filter((w) => w.id !== id);
      save(d);
    },
    library() {
      const d = data();
      return d ? d.library.slice().sort((a, b) => b.added - a.added) : [];
    },
    addImage(url, name) {
      const d = data();
      if (!d) return null;
      const exists = d.library.find((x) => x.url === url);
      if (exists) return exists;
      const img = { id: NT.uid(), url, name: name || '', added: Date.now() };
      d.library.push(img);
      return save(d) ? img : null;
    },
    removeImage(id) {
      const d = data();
      if (!d) return;
      d.library = d.library.filter((x) => x.id !== id);
      save(d);
    },
    exportJSON() {
      const email = NT.auth.current();
      const users = backend.getUsers();
      return JSON.stringify({ app: 'notion-tool', version: 1, email, account: users[email], data: data() }, null, 2);
    },
    /** 匯入備份：可在新裝置上還原帳號（含密碼雜湊）與資料 */
    importJSON(text, mode) {
      const obj = JSON.parse(text);
      if (!obj || obj.app !== 'notion-tool' || !obj.data) throw new Error('不是有效的備份檔');
      const email = normEmail(obj.email);
      const users = backend.getUsers();
      const current = NT.auth.current();
      if (current && current !== email) throw new Error('備份檔屬於 ' + email + '，請先登出後再匯入');
      if (!users[email]) {
        if (!obj.account || !obj.account.hash) throw new Error('備份檔缺少帳號資訊');
        users[email] = obj.account;
        backend.setUsers(users);
      }
      let d = obj.data;
      if (mode === 'merge') {
        const cur = backend.getData(email) || emptyData();
        const byId = {};
        cur.works.concat(d.works || []).forEach((w) => { if (!byId[w.id] || byId[w.id].updated < w.updated) byId[w.id] = w; });
        const lib = {};
        cur.library.concat(d.library || []).forEach((x) => { lib[x.url] = lib[x.url] || x; });
        d = Object.assign(cur, { works: Object.values(byId), library: Object.values(lib) });
      }
      backend.setData(email, Object.assign(emptyData(), d));
      return email;
    },
  };
})();
