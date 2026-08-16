/* ===========================================================================
   SHUDHI — Story motion
   ONE controller for all seven bands of the Our Story page.

   Loaded from each of the seven story sections, deferred, and only when that
   section's `animate` (or `cursor`) setting is on. Seven <script src> tags, one
   fetch, one execution — the __shSM guard below is what makes the seventh tag
   free.

   ---------------------------------------------------------------------------
   WHY ONE FILE AND NOT SEVEN
   ---------------------------------------------------------------------------
   Seven per-section modules would put seven rAF loops, seven mousemove listeners
   and seven scroll listeners on a single page — the exact thing the brief bans,
   and a real cost on the one page whose LCP element is a fetchpriority="high"
   hero. Here there is ONE registry, ONE loop, ONE mousemove, ONE scroll+resize
   pair, no matter how many bands are present.

   ---------------------------------------------------------------------------
   FOUR THINGS ARE LOAD-BEARING
   ---------------------------------------------------------------------------
   1. ARM ONLY WITH AN OBSERVER IN HAND. `.is-armed` is what applies every
      pre-state in shudhi-story.css §28. Adding it without something able to add
      `.is-shown` afterwards hides content permanently — the precise failure this
      whole page was migrated off `.sh [data-reveal] { opacity: 0 }` to avoid.
      The two lines in init() are adjacent and must stay adjacent: arming is not
      a state, it is the first half of a pair.

   2. ONE OBSERVER, TWO LIFETIMES. `.is-shown` latches (an entrance must not
      replay on scroll-back). `.is-live` toggles for as long as the band exists
      (ambient loops must stop off screen). The shared observer at
      shudhi-home.js:283 unobserves on first hit and could only ever have done
      the first of those, which is why this file does not reuse it.

   3. rootMargin '0px 0px -12% 0px' AT threshold 0, FOR EVERY BAND. This fires on
      one geometric fact — the band's top edge has crossed 12% up from the
      viewport bottom — and is therefore HEIGHT-INDEPENDENT. That matters here
      more than anywhere else in the theme: these bands are 520px on desktop and
      three times the viewport height when the 6-up grids stack on a phone. A
      fractional threshold tuned to a 520px band never fires on a tall one, and
      the band would stay at opacity 0 for the life of the page.

   4. INSTANCES MUST BE SWEPT. bands[] is module scope and survives every
      theme-editor re-render. A band whose section was replaced keeps an observer
      pointed at a detached node, and the shared loop keeps writing transforms to
      it, unless boot() drops it first.

   Style follows assets/sh-soap-plate.js: ES5 throughout — var, function
   expressions, string concatenation, no arrow functions, no template literals,
   no optional chaining — with comments that say why.
   =========================================================================== */

(function () {
  'use strict';

  /* Seven sections emit seven <script src> tags. The browser fetches once but
     EXECUTES seven times, which would give every band seven observers and the
     shared loop seven copies of itself. Same guard sh-soap-plate.js:65 uses.
     Verified free this session: the repo uses __shLC, __shRS, __shSP and __shTM. */
  if (window.__shSM) return;
  window.__shSM = true;

  var bands = [];         /* every live instance, module scope */
  var moveBound = false;  /* the mousemove listener binds once, ever */
  var scrollBound = false;
  var resizeBound = false;
  var rafId = 0;
  var lastFrame = 0;
  var mx = 0, my = 0;     /* last pointer position, viewport coordinates */
  var lastMove = -99999;
  var lastScroll = -99999;
  var vh = window.innerHeight || 1;
  var vw = window.innerWidth || 1;

  /* Read once at boot, the same trade counters() and parallax() make in
     shudhi-home.js. A visitor who flips the OS toggle mid-session is covered by
     the !important author rules in §28's reduced-motion block, which beat the
     non-important inline transforms this file writes. */
  var mq = window.matchMedia;
  var STILL = !!mq && mq.call(window, '(prefers-reduced-motion: reduce)').matches;
  var WIDE = mq ? mq.call(window, '(min-width: 1025px)') : null;
  var FINE = mq ? mq.call(window, '(hover: hover) and (pointer: fine)') : null;

  /* All three must hold. The same gate §28 uses for will-change, so a promoted
     layer never exists without a loop to justify it, and a loop never runs
     against an unpromoted one. */
  var CURSOR = !STILL && !!WIDE && WIDE.matches && !!FINE && FINE.matches;

  /* Total travel in CSS px for a layer at depth 1.0. Each layer scales this by
     its own data-sh-depth, so the hero background at 0.15 moves ~1.2px and the
     foreground at 1.0 moves the full 8. Well inside the +/-15px house ceiling
     documented at shudhi-home.js:362. */
  var TRAVEL = 8;

  /* --------------------------------------------------------------------- */
  /* Setup                                                                  */
  /* --------------------------------------------------------------------- */

  function init(root) {
    var B = {
      root: root,
      depths: [],
      scrub: null,
      lastK: -1,
      io: null,
      cursor: false,
      x: 0, y: 0,     /* current smoothed offset */
      tx: 0, ty: 0,   /* target offset */
      live: false,
      dead: false
    };

    /* Per-instance, unlike sh-soap-plate.js which gates globally: on this page
       the hero opts into pointer depth and the six bands below it do not, so the
       decision cannot live in a module-level flag. */
    B.cursor = CURSOR && root.hasAttribute('data-sh-cursor');

    var nodes = root.querySelectorAll('[data-sh-depth]');
    for (var i = 0; i < nodes.length; i++) {
      var d = parseFloat(nodes[i].getAttribute('data-sh-depth'));
      /* A malformed attribute must not produce NaN transforms — those serialise
         as "translate3d(NaNpx, ...)" and the browser drops the whole declaration,
         which presents as the parallax silently not working rather than as a
         typo anyone can find. */
      if (!isFinite(d)) continue;
      B.depths.push({ el: nodes[i], d: d });
    }

    /* The scrub is opt-in per band and there is at most one per band. Skipped
       entirely under reduced motion: §28 forces --sh-k to 1 !important there, so
       anything written here would be overridden anyway, and not binding is
       cheaper than being overridden. */
    if (!STILL) B.scrub = root.querySelector('[data-sh-scrub]');

    /* (1). ARM ONLY WITH AN OBSERVER IN HAND. */
    var wantsEntrance = root.hasAttribute('data-sh-reveal') && !!window.IntersectionObserver;
    if (wantsEntrance) root.classList.add('is-armed');

    /* (2)+(3). One observer, two jobs, one config for every band. */
    if (window.IntersectionObserver) {
      B.io = new IntersectionObserver(function (entries) {
        for (var n = 0; n < entries.length; n++) {
          if (entries[n].isIntersecting) root.classList.add('is-shown');
          setLive(B, entries[n].isIntersecting);
        }
      }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
      B.io.observe(root);
    } else {
      /* No observer: run permanently rather than never. Nothing was armed above,
         so there is no entrance owed — this only releases the ambient loops,
         which is the right way round. A frozen band is worse than a running one. */
      setLive(B, true);
    }

    bands.push(B);
    return B;
  }

  function setLive(B, on) {
    if (B.live === on) return;
    B.live = on;
    B.root.classList.toggle('is-live', on);

    /* Off-screen: hand the layers back to the stylesheet. Leaving the last
       inline transform behind would freeze a half-nudged composition in place,
       and §28's reduced-motion insurance could not clear it either, because a
       band scrolled out of view is not a reduced-motion band. */
    if (!on) zero(B);
  }

  function zero(B) {
    for (var i = 0; i < B.depths.length; i++) B.depths[i].el.style.transform = '';
    B.x = B.y = B.tx = B.ty = 0;
  }

  /* --------------------------------------------------------------------- */
  /* Input                                                                  */
  /* --------------------------------------------------------------------- */

  function onMove(e) {
    /* Record only. No DOM read, no DOM write, no layout — a mousemove handler
       that measures anything is a scroll-jank generator. */
    mx = e.clientX;
    my = e.clientY;
    lastMove = e.timeStamp || now();
    startLoop();
  }

  function onScroll() {
    lastScroll = now();
    startLoop();
  }

  function onResize() {
    /* innerHeight is read as a MEASUREMENT here, not as a breakpoint test — the
       matchMedia-not-innerWidth rule is about width decisions, and this file
       makes none (the 1025px cursor gate is matchMedia above, and every other
       breakpoint lives in CSS). shudhi-home.js:399 refreshes the same value for
       the same reason: iOS fires resize when the URL bar collapses. */
    vh = window.innerHeight || 1;
    vw = window.innerWidth || 1;
    lastScroll = now();
    startLoop();
  }

  function now() {
    /* performance.now() shares its origin with the rAF timestamp and with
       event.timeStamp in every engine that ships IntersectionObserver, so the
       three comparisons in frame() are always against one clock. */
    return (window.performance && window.performance.now) ? window.performance.now() : 0;
  }

  /* --------------------------------------------------------------------- */
  /* The one loop                                                           */
  /* --------------------------------------------------------------------- */

  function startLoop() {
    if (rafId) return;
    lastFrame = 0;
    rafId = requestAnimationFrame(frame);
  }

  function frame(t) {
    rafId = 0;
    if (!lastFrame) lastFrame = t;

    var dt = t - lastFrame;
    lastFrame = t;
    /* A backgrounded tab hands back one enormous dt on return. Uncapped, the
       lerp below resolves to ~1 and the whole composition snaps to its target in
       a single frame. */
    if (dt > 100) dt = 100;

    /* Frame-rate normalised exponential smoothing: the same visual damping at
       144Hz as at 60Hz, rather than a fixed 0.12 that is four times faster on a
       high-refresh display. */
    var k = 1 - Math.pow(1 - 0.12, dt / 16.667);

    var i, j, B, box, cx, cy, p;
    var settled = true;
    var reads = [];

    /* READ pass. Every getBoundingClientRect() happens before any style write;
       interleaving them forces a layout recalculation per element. The same
       discipline shudhi-home.js:373 follows. */
    for (i = 0; i < bands.length; i++) {
      B = bands[i];
      if (B.dead || (!B.live && !B.scrub)) { reads.push(null); continue; }
      reads.push(B.scrub ? B.scrub.getBoundingClientRect() : null);

      if (!B.live || !B.cursor || !B.depths.length) { B.tx = B.ty = 0; continue; }
      box = B.root.getBoundingClientRect();
      if (!box.width || !box.height) { B.tx = B.ty = 0; continue; }
      cx = box.left + box.width / 2;
      cy = box.top + box.height / 2;
      /* Normalised to roughly -1..1 against the VIEWPORT, not the band: the
         effect should respond to where the pointer is on the page, so moving
         across the copy column still moves the photograph. Clamped so a pointer
         at the far corner cannot exceed the travel budget. */
      B.tx = clamp((mx - cx) / (vw / 2), -1, 1);
      B.ty = clamp((my - cy) / (vh / 2), -1, 1);
    }

    /* WRITE pass. */
    for (i = 0; i < bands.length; i++) {
      B = bands[i];
      if (B.dead) continue;

      /* --- scroll scrub ------------------------------------------------- */
      box = reads[i];
      if (box) {
        /* k = 0 when the track's top edge sits 85% down the viewport, k = 1 when
           its bottom edge has risen to 25% down. The span is (0.6 * vh + height),
           which is positive for every height including zero, so a collapsed or
           display:none track can never divide by zero or invert. This is what
           makes one formula serve a 300px track on desktop and a 2000px stacked
           one on a phone. */
        p = (vh * 0.85 - box.top) / (vh * 0.60 + box.height);
        p = clamp(p, 0, 1);
        /* Write only on a material change. A custom property write invalidates
           style for the whole inheriting subtree, and at 144Hz an unguarded
           write is ~2.4x the work for a value nobody can see change. */
        if (Math.abs(p - B.lastK) > 0.002) {
          B.lastK = p;
          B.root.style.setProperty('--sh-k', p.toFixed(3));
        }
      }

      /* --- pointer depth ------------------------------------------------ */
      if (!B.live || !B.cursor || !B.depths.length) continue;

      B.x += (B.tx - B.x) * k;
      B.y += (B.ty - B.y) * k;

      if (Math.abs(B.tx - B.x) > 0.001 || Math.abs(B.ty - B.y) > 0.001) settled = false;

      for (j = 0; j < B.depths.length; j++) {
        var layer = B.depths[j];
        /* translate3d, not translate: it keeps the layer on the compositor and
           matches the promotion §28 has already declared for these elements. */
        layer.el.style.transform =
          'translate3d(' + (B.x * layer.d * TRAVEL).toFixed(2) + 'px,' +
                           (B.y * layer.d * TRAVEL).toFixed(2) + 'px,0)';
      }
    }

    /* Self-stopping. The loop runs while anything is still easing into place,
       for 1.2s after the last pointer movement, and for 250ms after the last
       scroll — then stops entirely. An idle page schedules no frames at all. */
    if (!settled || (t - lastMove) < 1200 || (t - lastScroll) < 250) {
      rafId = requestAnimationFrame(frame);
    }
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* --------------------------------------------------------------------- */
  /* Teardown                                                               */
  /* --------------------------------------------------------------------- */

  function destroy(B) {
    B.dead = true;
    if (B.io) { B.io.disconnect(); B.io = null; }
    zero(B);
  }

  /* --------------------------------------------------------------------- */
  /* Boot                                                                   */
  /* --------------------------------------------------------------------- */

  function boot() {
    /* (4). Sweep first. shopify:section:unload fires for the section being
       replaced and its nodes are already detached by the time we run —
       document.contains is the check that catches them. */
    for (var i = bands.length - 1; i >= 0; i--) {
      if (!document.contains(bands[i].root)) {
        destroy(bands[i]);
        bands.splice(i, 1);
      }
    }

    var found = document.querySelectorAll('[data-sh-reveal]');
    for (var j = 0; j < found.length; j++) {
      /* A flag on the element, not a lookup in bands[]: boot() re-runs on every
         shopify:section:load, including for unrelated sections, and re-arming an
         existing band would restart its entrance mid-scroll. A genuinely
         re-rendered section brings a NEW element with no flag, so real
         re-renders still initialise. Same bargain counters() makes at
         shudhi-home.js:319. */
      if (found[j].getAttribute('data-sh-done')) continue;
      found[j].setAttribute('data-sh-done', '1');
      init(found[j]);
    }

    if (!bands.length) return;

    /* Bound once for the page's lifetime and never removed — the loop is shared
       across instances, so there is no per-instance listener to clean up.
       passive because neither handler ever calls preventDefault. */
    var wantsMove = false, wantsScroll = false, b;
    for (var n = 0; n < bands.length; n++) {
      b = bands[n];
      if (b.cursor && b.depths.length) wantsMove = true;
      if (b.scrub) wantsScroll = true;
    }

    if (wantsMove && !moveBound) {
      window.addEventListener('mousemove', onMove, { passive: true });
      moveBound = true;
    }
    if (wantsScroll && !scrollBound) {
      window.addEventListener('scroll', onScroll, { passive: true });
      scrollBound = true;
    }
    /* Resize is bound whenever anything is live: both the scrub span and the
       pointer normalisation are computed against the viewport. Module-scope flag,
       not a window property — the IIFE guard above already makes this file run
       once, so there is nothing a global would buy. */
    if ((wantsMove || wantsScroll) && !resizeBound) {
      window.addEventListener('resize', onResize, { passive: true });
      resizeBound = true;
    }

    /* One priming frame so a band already scrolled past on load — a deep link
       into the middle of the page — gets its scrub value immediately rather than
       on the visitor's first scroll event. */
    if (wantsScroll) { lastScroll = now(); startLoop(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', boot);
  document.addEventListener('shopify:section:unload', boot);
})();
