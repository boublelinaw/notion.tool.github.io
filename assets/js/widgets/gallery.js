/* 多圖展示庫 */
(function () {
  'use strict';
  const ARROW_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  const ARROW_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
  const RATIO = { '16:9': 16 / 9, '4:3': 4 / 3, '3:2': 3 / 2, '1:1': 1, '3:4': 3 / 4, '9:16': 9 / 16 };

  NT.register({
    id: 'gallery',
    name: '多圖展示庫',
    icon: '🖼️',
    desc: '一個框放多張圖片：左右滑動、點擊切換，底部可加縮圖或圓點導覽、自動播放。',
    height: 460,
    defaults: {
      images: [
        { url: 'https://picsum.photos/id/1015/1200/800', caption: '河谷與山' },
        { url: 'https://picsum.photos/id/1018/1200/800', caption: '山景' },
        { url: 'https://picsum.photos/id/1039/1200/800', caption: '瀑布' },
        { url: 'https://picsum.photos/id/1043/1200/800', caption: '' },
        { url: 'https://picsum.photos/id/1025/1200/800', caption: '狗狗' },
      ],
      ratio: 'fill',
      fit: 'cover',
      nav: 'thumbs',
      effect: 'slide',
      arrows: true,
      clickNext: true,
      showCaption: true,
      showCount: true,
      autoplay: 0,
      loop: true,
      radius: 8,
      theme: 'light',
      bg: 'transparent',
    },
    fields: [
      { type: 'section', label: '圖片' },
      {
        k: 'images', type: 'list', label: '圖片', addLabel: '新增圖片', max: 50, thumbs: true,
        itemLabel: (it, i) => (i + 1) + '. ' + (it.caption || (it.url ? it.url.replace(/^data:.*/, '上傳的圖片').slice(-28) : '（尚未設定）')),
        newItem: () => ({ url: '', caption: '' }),
        item: [
          { k: 'url', type: 'image', label: '圖片' },
          { k: 'caption', type: 'text', label: '說明文字（選填）' },
        ],
      },
      { type: 'section', label: '播放與導覽' },
      { k: 'nav', type: 'seg', label: '底部導覽', options: [['thumbs', '縮圖'], ['dots', '圓點'], ['both', '縮圖＋圓點'], ['none', '無']] },
      { k: 'effect', type: 'seg', label: '切換效果', options: [['slide', '滑動'], ['fade', '淡入']] },
      { k: 'arrows', type: 'toggle', label: '顯示左右箭頭' },
      { k: 'clickNext', type: 'toggle', label: '點擊圖片切換（左側上一張、右側下一張）' },
      { k: 'showCaption', type: 'toggle', label: '顯示說明文字' },
      { k: 'showCount', type: 'toggle', label: '顯示張數（1 / 5）' },
      { k: 'loop', type: 'toggle', label: '循環播放' },
      { k: 'autoplay', type: 'range', label: '自動播放', min: 0, max: 10, step: 1, unit: ' 秒', zero: '關閉' },
    ].concat(NT.appearanceFields([
      { k: 'ratio', type: 'select', label: '圖片比例', options: [['fill', '填滿嵌入框'], ['16:9', '16 : 9'], ['4:3', '4 : 3'], ['3:2', '3 : 2'], ['1:1', '1 : 1 正方形'], ['3:4', '3 : 4 直式'], ['9:16', '9 : 16 直式']] },
      { k: 'fit', type: 'seg', label: '圖片填滿方式', options: [['cover', '裁切填滿'], ['contain', '完整顯示']] },
      { k: 'radius', type: 'range', label: '圓角', min: 0, max: 24, step: 1, unit: 'px' },
    ])),
    render(root, cfg) {
      const imgs = (cfg.images || []).filter((x) => NT.safeUrl(x.url));
      const el = document.createElement('div');
      const fill = cfg.ratio === 'fill';
      el.className = 'gal' + (fill ? ' fill' : '') + (cfg.effect === 'fade' ? ' fx-fade' : '');
      el.style.setProperty('--rad', (+cfg.radius || 0) + 'px');
      root.appendChild(el);
      if (!imgs.length) {
        el.innerHTML = '<div class="gal-empty">🖼️<br>尚未加入圖片</div>';
        return;
      }
      const n = imgs.length;
      const dotsInside = cfg.nav === 'dots';
      const showDots = cfg.nav === 'dots' || cfg.nav === 'both';
      const showThumbs = cfg.nav === 'thumbs' || cfg.nav === 'both';
      if (dotsInside) el.classList.add('dots-in');
      const slides = imgs.map((im, i) =>
        '<div class="gal-slide" data-i="' + i + '"><img class="fit-' + (cfg.fit === 'contain' ? 'contain' : 'cover') + '" src="' +
        NT.esc(NT.safeUrl(im.url)) + '" alt="' + NT.esc(im.caption || '') + '" draggable="false">' +
        (cfg.showCaption && im.caption ? '<div class="gal-cap">' + NT.esc(im.caption) + '</div>' : '') + '</div>'
      ).join('');
      const dots = showDots
        ? '<div class="gal-dots' + (dotsInside ? ' inside' : '') + '">' + imgs.map((_, i) => '<button class="gal-dot" data-go="' + i + '" aria-label="第 ' + (i + 1) + ' 張"></button>').join('') + '</div>'
        : '';
      el.innerHTML =
        '<div class="gal-stage"' + (fill ? '' : ' style="aspect-ratio:' + (RATIO[cfg.ratio] || 16 / 9) + '"') + '>' +
        '<div class="gal-track">' + slides + '</div>' +
        (cfg.arrows && n > 1 ? '<button class="gal-arrow prev" aria-label="上一張">' + ARROW_L + '</button><button class="gal-arrow next" aria-label="下一張">' + ARROW_R + '</button>' : '') +
        (cfg.showCount && n > 1 ? '<div class="gal-count"></div>' : '') +
        (dotsInside ? dots : '') +
        '</div>' +
        (showThumbs && n > 1 ? '<div class="gal-thumbs">' + imgs.map((im, i) => '<button class="gal-thumb" data-go="' + i + '"><img src="' + NT.esc(NT.safeUrl(im.url)) + '" alt="" loading="lazy"></button>').join('') + '</div>' : '') +
        (!dotsInside ? dots : '');

      el.querySelectorAll('.gal-slide img').forEach((img) => {
        img.addEventListener('error', () => {
          img.style.display = 'none';
          img.insertAdjacentHTML('afterend', '<div class="gal-broken">圖片無法載入</div>');
        });
      });

      const stage = el.querySelector('.gal-stage');
      const track = el.querySelector('.gal-track');
      const count = el.querySelector('.gal-count');
      const fade = cfg.effect === 'fade';
      let idx = 0;
      let timer = null;

      function go(i, user) {
        if (cfg.loop) i = (i + n) % n;
        else i = NT.clamp(i, 0, n - 1);
        idx = i;
        if (fade) {
          track.style.transform = '';
          el.querySelectorAll('.gal-slide').forEach((s, j) => s.classList.toggle('on', j === idx));
        } else {
          track.style.transform = 'translateX(' + -idx * 100 + '%)';
        }
        el.querySelectorAll('[data-go]').forEach((b) => b.classList.toggle('on', +b.dataset.go === idx));
        const th = el.querySelector('.gal-thumb.on');
        if (th) {
          const box = th.parentElement;
          box.scrollTo({ left: th.offsetLeft - box.clientWidth / 2 + th.clientWidth / 2, behavior: 'smooth' });
        }
        if (count) count.textContent = idx + 1 + ' / ' + n;
        if (user) restart();
      }
      function restart() {
        if (timer) clearInterval(timer);
        if (cfg.autoplay > 0 && n > 1) timer = setInterval(() => go(idx + 1), cfg.autoplay * 1000);
      }

      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-go]');
        if (b) go(+b.dataset.go, true);
        if (e.target.closest('.gal-arrow.prev')) go(idx - 1, true);
        if (e.target.closest('.gal-arrow.next')) go(idx + 1, true);
      });

      // 拖曳 / 滑動
      let sx = 0, sy = 0, dx = 0, down = false, horiz = null;
      stage.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        down = true; sx = e.clientX; sy = e.clientY; dx = 0; horiz = null;
      });
      const move = (e) => {
        if (!down) return;
        dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (horiz === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) horiz = Math.abs(dx) > Math.abs(dy);
        if (horiz && !fade && n > 1) {
          track.classList.add('dragging');
          track.style.transform = 'translateX(calc(' + -idx * 100 + '% + ' + dx + 'px))';
        }
      };
      window.addEventListener('pointermove', move);
      const end = (e) => {
        if (!down) return;
        down = false;
        track.classList.remove('dragging');
        if (horiz && Math.abs(dx) > 40) {
          go(dx < 0 ? idx + 1 : idx - 1, true);
        } else if (!horiz && Math.abs(dx) < 6 && e.type === 'pointerup' && cfg.clickNext && !e.target.closest('button')) {
          const r = stage.getBoundingClientRect();
          go(e.clientX - r.left < r.width * 0.3 ? idx - 1 : idx + 1, true);
        } else {
          go(idx);
        }
      };
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      const key = (e) => {
        if (e.key === 'ArrowLeft') go(idx - 1, true);
        if (e.key === 'ArrowRight') go(idx + 1, true);
      };
      window.addEventListener('keydown', key);

      go(0);
      restart();
      return () => {
        if (timer) clearInterval(timer);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        window.removeEventListener('keydown', key);
      };
    },
  });
})();
