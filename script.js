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
     7. SERVICE：カードと写真で1本の斜めの帯をつくる（PCのみ）
        帯の上辺・下辺は右上がり、カードと写真の境目は平行な斜め。
        帯どうしが平行に並ぶよう、行の間隔もここで決める。
     -------------------------------------------------------------- */
  var svcRows = Array.prototype.slice.call(document.querySelectorAll('.svc'));
  var svcList = document.querySelector('.service__list');
  var svcHead = document.querySelector('.service__head');
  var svcMq = window.matchMedia('(min-width: 961px)');
  var SVC_GAP = 22;   // 帯と帯のすき間
  var svcSection = svcList ? svcList.closest('section') : null;

  // セクション基準の位置（reveal の transform で offsetParent が変わっても同じ値になるよう親をたどる）
  function posIn(el) {
    var x = 0, y = 0;
    while (el && el !== svcSection) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return { x: x, y: y };
  }

  // 角を丸めた多角形の path 文字列（pts は [x, y] の配列、ox/oy で原点をずらす）
  function roundedPath(pts, r, ox, oy) {
    var n = pts.length, d = '';
    for (var i = 0; i < n; i++) {
      var p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      var la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
      var rr = Math.min(r, la / 2, lb / 2);
      var p1 = [p[0] + (a[0] - p[0]) * rr / la, p[1] + (a[1] - p[1]) * rr / la];
      var p2 = [p[0] + (b[0] - p[0]) * rr / lb, p[1] + (b[1] - p[1]) * rr / lb];
      var f = function (q) { return (q[0] - ox).toFixed(1) + ' ' + (q[1] - oy).toFixed(1); };
      d += (i === 0 ? 'M' : 'L') + f(p1) + 'Q' + f(p) + ' ' + f(p2);
    }
    return "path('" + d + "Z')";
  }

  // 多角形の外接矩形に要素を置き、その中に形を描く
  function placeShape(el, shapeEl, pts, r, dx) {
    var xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; });
    var minX = Math.min.apply(null, xs), minY = Math.min.apply(null, ys);
    el.style.left = (minX - dx) + 'px';
    el.style.top = minY + 'px';
    el.style.width = (Math.max.apply(null, xs) - minX) + 'px';
    el.style.height = (Math.max.apply(null, ys) - minY) + 'px';
    shapeEl.style.clipPath = roundedPath(pts, r, minX, minY);
  }

  function resetSvc() {
    svcRows.forEach(function (row) {
      row.style.marginTop = '';
      ['.svc__plate', '.svc__photo'].forEach(function (s) { row.querySelector(s).removeAttribute('style'); });
      row.querySelector('.svc__clip').style.clipPath = '';
    });
    if (svcList) svcList.style.paddingBottom = '';
    if (svcHead) svcHead.style.marginBottom = '';
  }

  // 1行分の形を計算して描き、帯の上辺・下辺の式を返す（座標は行の左上が原点）
  function shapeSvc(row, B) {
    var card = row.querySelector('.svc__card');
    var cs = getComputedStyle(row);
    var v = function (name) { return parseFloat(cs.getPropertyValue(name)); };
    var k = v('--k'), st = v('--st'), sb = v('--sb');
    var W = row.clientWidth, H = card.offsetHeight, cw = card.offsetWidth, cl = card.offsetLeft;
    var g = 14 * Math.sqrt(1 + k * k);   // カードと写真のすき間（垂直距離で約14px）
    var top, bot, C, P;

    if (!row.classList.contains('svc--rev')) {
      // カードが左：上辺はカード左上を通り、境目はカード右上から左下へ
      top = function (x) { return -st * x; };
      bot = function (x) { return H - sb * x; };
      var yT = top(cw);
      var yDB = (H - sb * cw - sb * k * yT) / (1 - sb * k);           // 境目と下辺の交点
      C = [[0, 0], [cw, yT], [cw - k * (yDB - yT), yDB], [0, H]];
      var xPT = (cw + g + k * yT) / (1 - k * st);                      // 写真左辺と上辺の交点
      var yPB = (H - sb * (cw + g) - sb * k * yT) / (1 - sb * k);      // 写真左辺と下辺の交点
      var XR = W + B;
      P = [[xPT, top(xPT)], [XR, top(XR)], [XR, bot(XR)], [cw + g - k * (yPB - yT), yPB]];
    } else {
      // カードが右：境目はカード左上 (xd, 0) から左下 (cl, H) へ
      var xd = cl + k * H;
      top = function (x) { return -st * (x - xd); };
      bot = function (x) { return H - sb * (x - cl); };
      C = [[xd, 0], [W, top(W)], [W, bot(W)], [cl, H]];
      var xRT = xd - g / (1 - k * st);                                 // 写真右辺と上辺の交点
      var yRB = (H - sb * (xd - g - cl)) / (1 - sb * k);               // 写真右辺と下辺の交点
      var XL = -B;
      P = [[XL, top(XL)], [xRT, top(xRT)], [xd - g - k * yRB, yRB], [XL, bot(XL)]];
    }
    var plate = row.querySelector('.svc__plate');
    placeShape(plate, plate, C, 26, cl);
    plate.style.right = plate.style.bottom = 'auto';
    plate.style.setProperty('--plate', plate.style.clipPath);
    plate.style.clipPath = '';
    placeShape(row.querySelector('.svc__photo'), row.querySelector('.svc__clip'), P, 22, 0);
    return { top: top, bot: bot, W: W, H: H };
  }

  function shapeAll() {
    resetSvc();
    if (!svcMq.matches || !svcRows.length) return;
    var B = svcRows[0].getBoundingClientRect().left + 40;   // 画面端までの距離（少し余分に）
    var prev = null, geo;
    if (svcHead) svcHead.style.marginBottom = '0px';
    svcRows.forEach(function (row, i) {
      row.style.marginTop = '0px';
      geo = shapeSvc(row, B);
      var X = [-B, geo.W + B], need = -Infinity;
      if (prev) {
        // 前の帯の下辺から SVC_GAP だけ離す（直線どうしなので両端で判定すれば足りる）
        X.forEach(function (x) { need = Math.max(need, prev.y + prev.bot(x) - geo.top(x) + SVC_GAP); });
      } else if (svcHead) {
        // 1本目：リード文の右端とロゴの右端の下に収める
        var lead = svcHead.querySelector('.service__lead'), logo = svcHead.querySelector('.service__logo');
        var x0 = posIn(row).x;
        [[lead, 40], [logo, 14]].forEach(function (c) {
          var el = c[0]; if (!el) return;
          var pe = posIn(el), xr = pe.x + el.offsetWidth - x0;
          if (el === lead) {   // ブロック幅ではなく、文字が実際に届いている右端で判定
            var rg = document.createRange(); rg.selectNodeContents(el);
            xr = pe.x + (rg.getBoundingClientRect().right - el.getBoundingClientRect().left) - x0;
          }
          need = Math.max(need, pe.y + el.offsetHeight + c[1] - geo.top(xr));
        });
      }
      if (need > -Infinity) row.style.marginTop = Math.round(need - posIn(row).y) + 'px';
      prev = { y: posIn(row).y, bot: geo.bot };
    });
    // 最後の帯の左下が行の外へ出る分だけ下に余白を足す
    var last = svcRows[svcRows.length - 1];
    var over = Math.max(geo.bot(-B), geo.bot(geo.W + B)) - geo.H;
    if (svcList && over > 0) svcList.style.paddingBottom = Math.ceil(over) + 'px';
  }

  if (svcRows.length) {
    if ('ResizeObserver' in window) {
      var svcRO = new ResizeObserver(shapeAll);
      svcRows.forEach(function (r) { svcRO.observe(r.querySelector('.svc__card')); });
      if (svcHead) svcRO.observe(svcHead);   // ロゴ画像の読み込みで見出しの高さが変わったとき
    }
    window.addEventListener('resize', shapeAll, { passive: true });
    if (svcMq.addEventListener) svcMq.addEventListener('change', shapeAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(shapeAll);
    shapeAll();
  }
})();
