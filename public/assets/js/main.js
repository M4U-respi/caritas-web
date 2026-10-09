/* カリタスジャパン TOP — 素の JS(ライブラリなし) */
(function () {
  'use strict';

  // 読み込み完了フラグ(index.html のフェイルセーフが参照)
  window.__caritasReady = true;
  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------
     ヘッダー: スクロール時の影
     ------------------------------------------------------------------ */
  var header = document.getElementById('header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 4);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------------
     ハンバーガーメニュー
     ------------------------------------------------------------------ */
  (function initMenu() {
    var toggle = document.getElementById('menu-toggle');
    var menu = document.getElementById('global-menu');
    if (!toggle || !menu || !header) return;
    var mq = window.matchMedia('(max-width: 1099.98px)');
    var isOpen = false;

    function focusables() {
      return Array.prototype.filter.call(
        header.querySelectorAll('a[href], button:not([disabled])'),
        function (el) { return el.getClientRects().length > 0; }
      );
    }

    function setOpen(open, returnFocus) {
      isOpen = open;
      menu.classList.toggle('is-open', open);
      document.body.classList.toggle('is-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      if (open) {
        var first = menu.querySelector('a[href], button');
        if (first) first.focus();
      } else if (returnFocus) {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', function () { setOpen(!isOpen, true); });

    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false, true);
        return;
      }
      if (e.key === 'Tab') { // フォーカストラップ(ヘッダー+メニュー内)
        var list = focusables();
        if (!list.length) return;
        var first = list[0];
        var last = list[list.length - 1];
        if (!header.contains(document.activeElement)) {
          e.preventDefault(); first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    });

    menu.addEventListener('click', function (e) {
      if (isOpen && e.target.closest('a')) setOpen(false, false);
    });

    var onChange = function () { if (!mq.matches && isOpen) setOpen(false, false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  })();

  /* ------------------------------------------------------------------
     FV カルーセル(フェード / 自動再生 約6秒)
     ------------------------------------------------------------------ */
  (function initCarousel() {
    var root = document.getElementById('fv');
    if (!root) return;
    var slidesWrap = root.querySelector('.fv__slides');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.fv__slide'));
    var buttons = Array.prototype.slice.call(root.querySelectorAll('.fv__pager-btn'));
    var toggle = root.querySelector('.fv__toggle');
    if (slides.length < 2) return;

    var INTERVAL = 6000;
    var current = 0;
    var timer = null;
    var hover = false;
    var focus = false;
    var userStopped = false; // 停止ボタンで明示的に止めた状態

    function goTo(index, byUser) {
      var next = (index + slides.length) % slides.length;
      if (next !== current) {
        slides.forEach(function (slide, i) {
          var active = i === next;
          slide.classList.toggle('is-active', active);
          if (active) slide.removeAttribute('aria-hidden');
          else slide.setAttribute('aria-hidden', 'true');
        });
        buttons.forEach(function (btn, i) {
          if (i === next) btn.setAttribute('aria-current', 'true');
          else btn.removeAttribute('aria-current');
        });
        // 遅延読み込みの画像を確実に読み込む
        var img = slides[next].querySelector('img[loading="lazy"]');
        if (img) img.loading = 'eager';
        current = next;
      }
      if (byUser) restart();
    }

    function canPlay() {
      return !reduceMotion.matches && !userStopped && !hover && !focus && !document.hidden;
    }
    function stop() {
      if (timer) { window.clearInterval(timer); timer = null; }
    }
    function restart() {
      stop();
      var playing = canPlay();
      if (playing) timer = window.setInterval(function () { goTo(current + 1, false); }, INTERVAL);
      // 自動再生中は読み上げない。停止中(手動操作時)のみ変更を通知
      slidesWrap.setAttribute('aria-live', playing ? 'off' : 'polite');
    }

    buttons.forEach(function (btn, i) {
      btn.addEventListener('click', function () { goTo(i, true); });
    });

    // 左右キー
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      goTo(current + (e.key === 'ArrowRight' ? 1 : -1), true);
      if (buttons.indexOf(document.activeElement) !== -1) buttons[current].focus();
    });

    // ホバー / フォーカスで一時停止
    root.addEventListener('mouseenter', function () { hover = true; restart(); });
    root.addEventListener('mouseleave', function () { hover = false; restart(); });
    root.addEventListener('focusin', function () { focus = true; restart(); });
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) { focus = false; restart(); }
    });

    // 停止 / 再開ボタン
    if (toggle) {
      if (reduceMotion.matches) toggle.hidden = true;
      toggle.addEventListener('click', function () {
        userStopped = !userStopped;
        toggle.setAttribute('aria-pressed', String(userStopped));
        toggle.textContent = userStopped ? 'スライドの自動再生を再開' : 'スライドの自動再生を停止';
        restart();
      });
    }

    // タッチスワイプ
    var startX = 0, startY = 0, tracking = false;
    root.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { tracking = false; return; }
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        goTo(current + (dx < 0 ? 1 : -1), true);
      }
    }, { passive: true });
    root.addEventListener('touchcancel', function () { tracking = false; }, { passive: true });

    // タブ非表示時は停止
    document.addEventListener('visibilitychange', restart);

    // reduced-motion の設定変更に追従
    var onMotionChange = function () {
      if (toggle) toggle.hidden = reduceMotion.matches;
      restart();
    };
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
    else if (reduceMotion.addListener) reduceMotion.addListener(onMotionChange);

    restart();
  })();

  /* ------------------------------------------------------------------
     スクロール出現
     ------------------------------------------------------------------ */
  (function initReveal() {
    var targets = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!targets.length) return;
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      targets.forEach(function (el) { el.classList.add('is-inview'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- Facebook Page Plugin:コンテナ幅・高さに合わせて src を再設定 ---------- */
  (function () {
    var iframe = document.querySelector('[data-fb-page]');
    if (!iframe) return;
    var frame = iframe.parentElement;
    var last = '';
    function build() {
      var w = Math.max(180, Math.min(500, Math.floor(frame.clientWidth)));
      var h = Math.max(70, Math.floor(frame.clientHeight));
      var key = w + 'x' + h;
      if (key === last) return;
      last = key;
      iframe.src = 'https://www.facebook.com/plugins/page.php?href=' + encodeURIComponent(iframe.getAttribute('data-fb-page')) +
        '&tabs=timeline&width=' + w + '&height=' + h +
        '&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false';
    }
    var timer;
    build();
    window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(build, 300); });
  })();
})();
