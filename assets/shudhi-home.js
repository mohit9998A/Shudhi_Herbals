/* ============================================================================
   SHUDHI HERBALS — Homepage interactions
   Sticky nav state, mobile drawer (with focus trap), search panel, collection
   carousel, back-to-top, scroll reveals, seal count-up, anchor scrolling.

   jQuery and slick are already loaded synchronously in <head> by
   layout/theme.liquid (lines 155-156). This file is deferred, so both are
   guaranteed present by the time it runs. Do NOT load a second copy of
   either — a second jQuery replaces window.jQuery with a fresh instance whose
   .fn has none of the plugins already registered against the first, which
   detaches slick, fancybox, ajax-cart and quickview site-wide.
   ========================================================================== */
(function () {
  'use strict';

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /* ---------------------------------------------------------------
     Sticky header: solid background once past the hero's top region
     --------------------------------------------------------------- */
  /* ONE scroll handler for both the sticky header and the back-to-top button.
     They used to bind separately, and because header's handler ran first and
     wrote a class, the back-to-top handler's subsequent pageYOffset read forced
     a style recalc on every flip frame. Reading once up front, then writing,
     removes that.

     Both thresholds carry hysteresis: without it, sub-pixel jitter at the
     boundary re-triggers a transition and promotes/demotes a compositor layer
     repeatedly — and the back-to-top threshold sits ~29% into the hero scrub,
     so it was flipping mid-gesture. */
  function scrollState() {
    var head = document.querySelector('.sh-header');
    var top  = document.querySelector('[data-to-top]');
    if (!head && !top) return;

    var fallbackAfter = head ? (parseInt(head.getAttribute('data-solid-after'), 10) || 80) : 0;
    var alwaysSolid = head ? head.getAttribute('data-always-solid') === 'true' : false;
    var hero = document.querySelector('.sh-hero');
    var HYST = 24;
    var solid = null, visible = null;
    var after = fallbackAfter;

    // The nav stays transparent for the WHOLE hero and only goes solid once
    // Our Story reaches it — so the threshold is the hero's own bottom edge
    // minus the header height, not a fixed pixel count. Measured here and
    // CACHED; sync() below must never read layout.
    function measureHero() {
      if (!hero) { after = fallbackAfter; return; }
      var r = hero.getBoundingClientRect();
      var headH = head ? head.offsetHeight : 0;
      after = Math.max(0, r.top + window.pageYOffset + r.height - headH);
    }

    function sync() {
      var y = window.pageYOffset;                 // single read, before any write
      var vh = window.innerHeight;

      // Off the homepage the header is solid from scroll 0 and must never be
      // stripped back to transparent — there is no hero behind it.
      if (head && !alwaysSolid) {
        var nextSolid = solid ? y > after - HYST : y > after + HYST;
        if (nextSolid !== solid) { solid = nextSolid; head.classList.toggle('is-solid', nextSolid); }
      }
      // Gate on the hero threshold when there is a hero, so the arrow never
      // sits over the opening shot; falls back to one viewport on inner pages.
      if (top) {
        var showAt = hero ? after : vh;
        var nextVis = visible ? y > showAt - HYST : y > showAt + HYST;
        if (nextVis !== visible) { visible = nextVis; top.classList.toggle('is-visible', nextVis); }
      }
    }

    window.addEventListener('scroll', sync, { passive: true });

    // Re-measure only on events that can actually change the geometry —
    // never per scroll tick.
    var rt;
    function remeasure() { clearTimeout(rt); rt = setTimeout(function () { measureHero(); sync(); }, 100); }
    window.addEventListener('resize', remeasure, { passive: true });
    window.addEventListener('load', function () { measureHero(); sync(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { measureHero(); sync(); });
    }

    measureHero();
    sync();
  }

  /* ---------------------------------------------------------------
     Mobile drawer
     --------------------------------------------------------------- */
  function drawer() {
    var panel   = document.querySelector('.sh-drawer');
    var overlay = document.querySelector('.sh-overlay');
    var opener  = document.querySelector('[data-drawer-open]');
    if (!panel || !overlay) return;

    var lastFocus = null;

    function isOpen() { return panel.classList.contains('is-open'); }

    function open() {
      lastFocus = document.activeElement;
      panel.classList.add('is-open');
      overlay.classList.add('is-open');
      panel.removeAttribute('aria-hidden');
      if (opener) opener.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      var first = panel.querySelector(FOCUSABLE);
      if (first) first.focus();
    }

    function close() {
      if (!isOpen()) return;
      panel.classList.remove('is-open');
      overlay.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      if (opener) opener.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    if (opener) opener.addEventListener('click', open);
    overlay.addEventListener('click', close);

    var closers = panel.querySelectorAll('[data-drawer-close], a');
    for (var i = 0; i < closers.length; i++) closers[i].addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      // Guard on isOpen: this is bound to document, and without the guard it
      // would also swallow Escape while the theme's search overlay is open.
      if (!isOpen()) return;

      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;

      var items = panel.querySelectorAll(FOCUSABLE);
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------------------------------------------------------------
     Search — reuse the theme's existing predictive search overlay
     (sections/hov-search-overlay.liquid renders on every page from
     theme.liquid:1391, and hov-search-overlay.js:484 exposes hovSOOpen).

     Note we deliberately do NOT tag the button with
     [data-hov-overlay-trigger]: that handler binds `focus` -> open
     (hov-search-overlay.js:79), so merely tabbing past the button would
     pop the overlay. Calling hovSOOpen directly avoids that.
     --------------------------------------------------------------- */
  function search() {
    var buttons = document.querySelectorAll('[data-sh-search]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (e) {
        if (typeof window.hovSOOpen === 'function') {
          e.preventDefault();
          window.hovSOOpen();
        }
        // else: fall through to the button's href="/search"
      });
    }
  }

  /* ---------------------------------------------------------------
     Collection carousel
     --------------------------------------------------------------- */
  function carousel() {
    var el = document.querySelector('[data-collection-carousel]');
    if (!el) return;

    var $ = window.jQuery;
    if (!$ || !$.fn || !$.fn.slick) { fallback(el); return; }

    var wrap = el.parentNode;
    var prev = wrap.querySelector('.sh-collection__arrow--prev');
    var next = wrap.querySelector('.sh-collection__arrow--next');

    $(el).slick({
      slidesToShow: 5,
      slidesToScroll: 1,
      infinite: true,
      arrows: true,
      dots: false,
      prevArrow: prev,
      nextArrow: next,
      autoplay: el.getAttribute('data-autoplay') === 'true',
      autoplaySpeed: 3800,
      responsive: [
        { breakpoint: 1200, settings: { slidesToShow: 4 } },
        { breakpoint: 900,  settings: { slidesToShow: 3 } },
        { breakpoint: 640,  settings: { slidesToShow: 2 } },
        { breakpoint: 460,  settings: { slidesToShow: 1.15 } }
      ]
    });
  }

  // Swipeable scroll-snap row if slick is unavailable for any reason.
  function fallback(el) {
    el.style.display = 'grid';
    el.style.gridAutoFlow = 'column';
    el.style.gridAutoColumns = 'minmax(220px, 1fr)';
    el.style.overflowX = 'auto';
    el.style.scrollSnapType = 'x mandatory';
    el.style.scrollbarWidth = 'none';
    var slides = el.children;
    for (var i = 0; i < slides.length; i++) slides[i].style.scrollSnapAlign = 'start';
  }

  /* ---------------------------------------------------------------
     Back to top
     --------------------------------------------------------------- */
  /* Click only — visibility is driven by scrollState() above, so there is one
     scroll handler on the page rather than two. */
  function toTop() {
    var btn = document.querySelector('[data-to-top]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------------------------------------------------------------
     Anchors
     --------------------------------------------------------------- */
  function anchors() {
    document.addEventListener('click', function (e) {
      // Scoped to .sh — this file is loaded site-wide now, and an unscoped
      // handler would swallow every in-page anchor in the legacy theme
      // (collection filter accordions, product tabs, FAQ accordions).
      // Also accepts /#foo so footer links work from any template.
      var a = e.target.closest ? e.target.closest('.sh a[href^="#"], .sh a[href^="/#"]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var hash = href.indexOf('#') >= 0 ? href.slice(href.indexOf('#')) : '';
      if (hash.length < 2) return;

      /* getElementById, not querySelector. Section anchors are merchant-authored
         now (sh-story-split / sh-feature-grid both expose an `anchor_id`), and
         `handle` happily returns a digit-leading id like "4-generations" — which
         is a legal HTML id but NOT a legal CSS selector, so querySelector('#4-…')
         throws a SyntaxError. Thrown from a delegated listener it escapes before
         the preventDefault below, so every click on that link would log an
         uncaught error and hard-jump. getElementById has no such restriction and
         is what the browser's own fragment navigation uses. */
      var target = document.getElementById(decodeURIComponent(hash.slice(1)));
      // No target on this page? Let the browser navigate (that is how /#foo
      // reaches the homepage) rather than swallowing the click.
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---------------------------------------------------------------
     Scroll reveals
     --------------------------------------------------------------- */
  function reveal() {
    var items = document.querySelectorAll('.sh [data-reveal]');
    if (!items.length) return;

    // The CSS starts these at opacity:0. If IntersectionObserver is missing we
    // MUST reveal everything immediately, or the page renders blank.
    if (!window.IntersectionObserver) {
      for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });

    for (var j = 0; j < items.length; j++) io.observe(items[j]);
  }

  /* ---------------------------------------------------------------
     Count-up — snippets/sh-gen-seal.liquid's "4 generations" number
     --------------------------------------------------------------- */
  /* The markup ships the REAL number as its text content, not "0". That is the
     load-bearing half of this: the seal has to read correctly when JS is absent,
     blocked or still deferred, so the animated state is what we opt INTO, never
     the state we start from. Every early return below therefore leaves the
     rendered number exactly as Liquid printed it. */
  function counters() {
    var els = document.querySelectorAll('.sh [data-count-to]');
    if (!els.length) return;

    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || !window.IntersectionObserver) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.5 });

    for (var i = 0; i < els.length; i++) {
      /* boot() re-runs on shopify:section:load. Editing any unrelated section
         would otherwise hand this same element to a second observer and replay
         the count. A re-rendered section brings a NEW element with no flag, so
         genuine re-renders still animate. */
      if (els[i].getAttribute('data-count-done')) continue;
      els[i].setAttribute('data-count-done', '1');
      io.observe(els[i]);
    }

    function run(el) {
      var target = parseInt(el.getAttribute('data-count-to'), 10);
      if (!isFinite(target)) return;               /* leave the printed value alone */
      var DUR = 900, t0 = 0;
      el.textContent = '0';
      requestAnimationFrame(function tick(now) {
        if (!t0) t0 = now;
        var p = Math.min((now - t0) / DUR, 1);
        /* easeOutCubic — the number decelerates into place instead of stopping dead. */
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(tick);
      });
    }
  }

  function boot() {
    scrollState();
    drawer();
    search();
    carousel();
    toTop();
    anchors();
    reveal();
    counters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Theme editor re-renders sections in place.
  document.addEventListener('shopify:section:load', boot);
})();
