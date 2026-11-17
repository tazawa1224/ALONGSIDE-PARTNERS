/* =====================================================================
   ALONGSIDE PARTNERS — V5 "Kinetic Line"  script.js
   モーション主役だが、床（性能/A11y）を死守する自前JS（外部依存なし）。
   ===================================================================== */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------------
     0. FV 読み込みアニメーション：写真が揃ってから一斉に開始
        （.fv-anim は head の inline script が付与。2.5秒で待ちを打ち切る）
     -------------------------------------------------------------- */
  var root = document.documentElement;
  if (root.classList.contains('fv-anim')) {
    var started = false;
    var play = function () {
      if (started) return;
      started = true;
      root.classList.add('fv-play');
    };
    var fvImgs = Array.prototype.slice.call(document.querySelectorAll('.fv img'));
    var waits = fvImgs.map(function (img) {
      return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    });
    if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready); // 文字が途中で書体切替しないように
    Promise.all(waits).then(play);
    setTimeout(play, 2500);
  }

  /* --------------------------------------------------------------
     1. ヘッダーの実体化（半透明→白） + モバイル下部CTAの表示制御
     -------------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  var mobileCta = document.getElementById('mobileCta');
  var contact = document.getElementById('contact');

  function onScrollHeader() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-solid', y > 24);
    // モバイルCTA：少しスクロールしたら出す。contact表示中は隠す。
    if (mobileCta) {
      var show = y > 480;
      if (contact) {
        var r = contact.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) show = false; // contact可視時は重複回避
      }
      mobileCta.classList.toggle('is-visible', show);
    }
  }

  /* --------------------------------------------------------------
     3. rAF でまとめたスクロールハンドラ（性能配慮）
     -------------------------------------------------------------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      onScrollHeader();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScrollHeader();

  /* --------------------------------------------------------------
     4. Reveal（stagger）+ セクションのノード点灯 + ナビ現在地
     -------------------------------------------------------------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll('main > section'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__list a'));

  if (prefersReduced) {
    // モーション抑制：即表示 + 全ノード点灯
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    sections.forEach(function (s) { s.classList.add('is-active'); });
  } else {
    // reveal（子要素を順に：staggerはCSS transitionに任せ、少し遅延を付与）
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          revealIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('[data-reveal]').forEach(function (el, i) {
      // 同一グループ内の軽いstagger
      el.style.transitionDelay = ((i % 6) * 60) + 'ms';
      revealIO.observe(el);
    });

    // セクションのアクティブ化（ノード点灯 & ナビ）
    var activeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var id = e.target.id;
        if (e.isIntersecting) {
          e.target.classList.add('is-active');
          navLinks.forEach(function (a) {
            a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { threshold: 0, rootMargin: '-45% 0px -55% 0px' }); // 画面中央の帯に掛かったら（高いセクションでも判定できるよう比率は使わない）
    sections.forEach(function (s) { activeIO.observe(s); });
  }

  /* --------------------------------------------------------------
     5. モバイルナビ（ハンバーガー）
     -------------------------------------------------------------- */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');
  function closeNav() {
    if (!nav) return;
    nav.classList.remove('is-open');
    if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'メニューを開く'); }
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeNav();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* --------------------------------------------------------------
     6. フォーム：バリデーション + ダミー完了UI（実送信しない）
     -------------------------------------------------------------- */
  var form = document.getElementById('contactForm');
  var done = document.getElementById('formDone');

  function setError(field, msg) {
    var wrap = field.closest('.field');
    var err = wrap ? wrap.querySelector('.field__err') : null;
    if (wrap) wrap.classList.toggle('is-invalid', !!msg);
    if (err) err.textContent = msg || '';
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function validateField(field) {
    var val = (field.value || '').trim();
    if (field.hasAttribute('required') && !val) {
      setError(field, '入力してください'); return false;
    }
    if (field.type === 'email' && val) {
      var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(val)) { setError(field, 'メールアドレスの形式で入力してください'); return false; }
    }
    setError(field, '');
    return true;
  }

  if (form) {
    var fields = Array.prototype.slice.call(form.querySelectorAll('input,select,textarea'));
    fields.forEach(function (f) {
      f.addEventListener('blur', function () { validateField(f); });
      f.addEventListener('input', function () {
        var wrap = f.closest('.field');
        if (wrap && wrap.classList.contains('is-invalid')) validateField(f);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault(); // 実送信しない
      var ok = true;
      var firstInvalid = null;
      fields.forEach(function (f) {
        var v = validateField(f);
        if (!v && !firstInvalid) firstInvalid = f;
        ok = ok && v;
      });
      if (!ok) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      // ダミー完了UI
      form.querySelectorAll('.field, .form__row, .form__note, button[type="submit"]').forEach(function (el) {
        el.style.display = 'none';
      });
      if (done) {
        done.hidden = false;
        done.setAttribute('tabindex', '-1');
        done.focus();
        done.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });
      }
    });
  }

  /* --------------------------------------------------------------
     7. WORKS：事例のスライド（中央の1枚＋右奥に次の3枚。矢印・ドット・スワイプ・左右キー）
     -------------------------------------------------------------- */
  var works = document.getElementById('works');
  var slider = works && works.querySelector('.works__slider');
  if (slider) {
    var slides = Array.prototype.slice.call(slider.querySelectorAll('.work'));
    var count = slides.length;
    var current = 0;
    var busy = false;
    var dotsWrap = slider.querySelector('.works__dots');

    var dots = slides.map(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'works__dot';
      b.setAttribute('aria-label', '事例' + (i + 1) + 'を表示');
      b.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(b);
      return b;
    });

    function render() {
      slides.forEach(function (s, i) {
        var d = ((i - current) % count + count) % count;   // 0=中央、1〜3=右奥、最後=ひとつ前
        var pos = d <= 3 ? String(d) : (d === count - 1 ? 'prev' : 'hidden');
        s.setAttribute('data-pos', pos);
        s.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
      });
      dots.forEach(function (b, i) { b.setAttribute('aria-current', i === current ? 'true' : 'false'); });
    }
    function goTo(i) {
      var next = (i % count + count) % count;
      if (next === current || busy) return;
      if (prefersReduced) { current = next; render(); return; }
      busy = true;   // 文字と写真をいったん消してから板を動かし、着いたところで出し直す
      works.classList.add('is-switching');
      setTimeout(function () {
        current = next;
        render();
        setTimeout(function () { works.classList.remove('is-switching'); busy = false; }, 380);
      }, 200);
    }

    slider.querySelector('.works__arrow--prev').addEventListener('click', function () { goTo(current - 1); });
    slider.querySelector('.works__arrow--next').addEventListener('click', function () { goTo(current + 1); });
    slides.forEach(function (s, i) {   // 右奥の板を押したらその事例へ
      s.addEventListener('click', function (e) {
        if (i !== current) { e.preventDefault(); goTo(i); }
      });
    });
    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
    });

    var list = slider.querySelector('.works__list');
    var startX = null, startY = 0;
    list.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
    list.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var t = e.changedTouches[0], dx = t.clientX - startX, dy = t.clientY - startY;
      startX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) goTo(current + (dx < 0 ? 1 : -1));
    });

    slider.querySelector('.works__nav').hidden = false;
    works.classList.add('is-ready');
    render();
    requestAnimationFrame(function () { requestAnimationFrame(function () { works.classList.add('is-anim'); }); });
  }
})();
