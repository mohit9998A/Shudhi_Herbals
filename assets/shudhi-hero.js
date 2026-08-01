/* ============================================================================
   SHUDHI HERBALS — Hero scroll-scrub engine
   ----------------------------------------------------------------------------
   Scrubs a numbered frame sequence against scroll position. The section is a
   tall wrapper containing a position:sticky stage, so the page cannot reach the
   next section until the sequence has played through — without hijacking wheel
   or touch events, so keyboard paging, find-in-page, screen readers and scroll
   restoration all keep working. Every listener here is passive; nothing calls
   preventDefault.

   Four things make this feel smooth rather than merely correct:

   1. ZERO FORCED LAYOUT PER FRAME. Geometry is measured on resize and cached;
      the render loop reads nothing but window.pageYOffset. Reading offsetHeight
      / getBoundingClientRect / getComputedStyle inside a rAF loop forces a
      synchronous style+layout flush 60-120x a second, which is the single
      biggest source of scrub jank.

   2. DELTA-TIME SMOOTHING. Exponential decay against elapsed milliseconds:
        current = target + (current - target) * exp(-dt / tau)
      Frame-rate independence is exact, not approximate, because the exponential
      composes: exp(-a/T)*exp(-b/T) === exp(-(a+b)/T). Two 8.3ms steps at 120Hz
      land on the same state as one 16.7ms step at 60Hz. A per-tick lerp does
      not have this property and converges twice as fast at 120Hz.

   3. SUB-FRAME BLENDING. Scroll lands between frames; drawing only the rounded
      frame quantises motion to the frame grid and reads as stepping. Cross-
      fading the two neighbours restores continuous motion — and it is what
      makes a SLOWER scrub possible, since slower means more scroll px per
      frame, i.e. more stepping.

   4. IDLE BAIL. The loop stops entirely once the scrub settles and restarts
      from passive input listeners, so a stationary visitor pays nothing.

   Deliberately uses HTMLImageElement, NOT createImageBitmap: an ImageBitmap
   holds uncompressed RGBA (1280x720x4 = 3.7 MB each), which iOS Safari kills
   the tab for. Image elements let the browser evict and re-decode under memory
   pressure — they degrade instead of dying.
   ========================================================================== */
(function () {
  'use strict';

  var REQ_TIMEOUT  = 10000;  // ms before a stalled request releases its slot
  var DT_CAP       = 250;    // ms; guards against garbage exponents after a stall
  var SNAP_EPS     = 0.002;  // frames; below this we snap so the loop can stop
  var BLEND_STEPS  = 24;     // sub-steps per frame interval
  var BLEND_MIN    = 0.02;   // below this, skip the second draw entirely
  var DPR_MAX      = 2;

  // Cancels a pending request with zero network. NOT img.src = '': per spec an
  // empty src resolves against the document URL, and some engines then refetch
  // the page itself.
  var ABORT_SRC = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  var INITED = (typeof WeakSet === 'function') ? new WeakSet() : null;

  function initHero(root) {
    if (INITED) { if (INITED.has(root)) return; INITED.add(root); }

    var canvas     = root.querySelector('.sh-hero__canvas');
    var pin        = root.querySelector('.sh-hero__pin');
    var loader     = root.querySelector('.sh-hero__loader');
    var loaderBar  = root.querySelector('.sh-hero__loader-bar');
    var loaderNum  = root.querySelector('.sh-hero__loader-num');
    var railFill   = root.querySelector('.sh-hero__pager-rail i');
    var pagerEls   = root.querySelectorAll('.sh-hero__pager span');
    if (!canvas || !pin) return;

    var base    = canvas.getAttribute('data-frame-base') || '';
    // Shopify's ?v= token, stripped out when the section derives the directory
    // and passed back in so replaced frames aren't served stale from cache.
    var ver     = canvas.getAttribute('data-frame-version') || '';
    var prefix  = canvas.getAttribute('data-frame-prefix') || 'hero_frame_';
    var ext     = canvas.getAttribute('data-frame-ext') || 'webp';
    var pad     = parseInt(canvas.getAttribute('data-frame-pad'), 10) || 4;
    var total   = parseInt(canvas.getAttribute('data-frame-count'), 10) || 192;
    var blendOn = canvas.getAttribute('data-blend') !== 'false';

    // Deliberately not `|| 0.35` — a configured 0 (locked 1:1 to scroll) is a
    // legitimate value that || would silently discard.
    var smoothing = parseFloat(canvas.getAttribute('data-smoothing'));
    if (isNaN(smoothing)) smoothing = 0.35;
    var tau = smoothing * 220;                 // 0..0.5 -> 0..110ms time constant
    if (tau < 0) tau = 0; else if (tau > 400) tau = 400;

    var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var ctx = canvas.getContext('2d', { alpha: false });

    var frames = new Array(total);
    var ready  = new Uint8Array(total);
    var failed = new Uint8Array(total);
    var loadedCount = 0, settled = 0;

    var started = false, torn = false, isReady = false, hintHidden = false;
    var srcW = 0, srcH = 0;
    var currentFrame = 0, lastKey = -1, lastSeg = -1;
    var lastRail = -1;
    var rafId = null, runningLoop = false, lastT = 0, lastY = -1;
    var idleTicks = 0, snapNext = false;
    var visible = true, onScreen = true;

    /* -- cached geometry: written by measure(), read by the loop ------------ */
    var sectionTop = 0, stickyTop = 0, scrollSpan = 1;
    /* -- cover-fit rect in backing-store px: computed once per resize ------- */
    var fitX = 0, fitY = 0, fitW = 0, fitH = 0;

    /* -- listener recorder so teardown can drop every one ------------------- */
    var binds = [];
    function bind(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      binds.push([target, type, fn, opts]);
    }

    function frameURL(i) {
      var n = String(i + 1);
      while (n.length < pad) n = '0' + n;
      return base + prefix + n + '.' + ext + (ver ? '?' + ver : '');
    }

    /* =====================================================================
       Geometry — the ONLY place layout is read
       ===================================================================== */
    function measure() {
      // getBoundingClientRect, not offsetHeight: offsetHeight rounds to an
      // integer, and a 0.5px error in scrollSpan accumulates into a visible
      // half-frame offset by the end of a 3000px scrub.
      var r  = root.getBoundingClientRect();
      var pr = pin.getBoundingClientRect();

      sectionTop = r.top + window.pageYOffset;
      stickyTop  = parseFloat(getComputedStyle(pin).top) || 0;

      // NOT root.offsetHeight - window.innerHeight. The wrapper is sized in svh
      // (the SMALL viewport, locked to expanded browser chrome) while
      // innerHeight floats as the mobile URL bar collapses. The pin's own
      // height IS the distance it stays stuck, by definition, in any unit
      // system. Getting this wrong makes progress saturate before the pin
      // releases, so the final frames never play.
      scrollSpan = r.height - pr.height;
      if (scrollSpan < 1) scrollSpan = 1;
    }

    // Cheap drift check, run only on scroll idle — never during motion. Catches
    // anything above the hero changing height in a way that leaves body's own
    // height unchanged (one thing shrinking as another grows).
    function verifyGeometry() {
      var t = root.getBoundingClientRect().top + window.pageYOffset;
      if (Math.abs(t - sectionTop) > 0.5) { measure(); wake(); }
    }

    /* =====================================================================
       Canvas sizing + quality
       ===================================================================== */
    function computeFit() {
      var cw = canvas.width, ch = canvas.height;
      if (!srcW || !srcH || !cw || !ch) return;
      var ir = srcW / srcH, cr = cw / ch;
      if (cr > ir) { fitW = cw; fitH = cw / ir; fitX = 0; fitY = (ch - fitH) / 2; }
      else         { fitH = ch; fitW = ch * ir; fitY = 0; fitX = (cw - fitW) / 2; }
    }

    function resize() {
      var w = pin.clientWidth, h = pin.clientHeight;
      if (!w || !h) return;

      // Go to the physical pixel grid, capped. The instinct to cap the backing
      // store at the source width is wrong: the compositor upscales to the
      // device grid either way, so capping below it does not avoid the upscale
      // — it splits it into TWO resamples (canvas, then compositor) instead of
      // one bicubic. Cost is memory and fill, neither of which is the
      // bottleneck once forced layout and backdrop-filters are gone.
      var cap = parseFloat(canvas.getAttribute('data-dpr-cap'));
      if (isNaN(cap) || cap <= 0) cap = DPR_MAX;
      var dpr = Math.min(window.devicePixelRatio || 1, cap);

      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';

      // CRITICAL: assigning canvas.width resets the ENTIRE 2D context state,
      // including these. They must be re-set after every resize, not once at
      // init — setting them once is the same bug as never setting them.
      ctx.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = 1;

      computeFit();
      lastKey = -1;
      measure();
      draw(currentFrame);
    }

    /* =====================================================================
       Drawing
       ===================================================================== */
    // Nearest loaded frame, biased BACKWARD first. A forward bias makes the
    // sequence look like it is running in reverse while scrolling down, which
    // reads as broken; a slightly stale frame does not.
    function resolve(idx) {
      if (idx < 0) idx = 0; else if (idx > total - 1) idx = total - 1;
      if (ready[idx]) return idx;
      for (var r = 1; r < total; r++) {
        if (idx - r >= 0 && ready[idx - r]) return idx - r;
        if (idx + r < total && ready[idx + r]) return idx + r;
      }
      return -1;
    }

    function draw(f) {
      if (f < 0) f = 0; else if (f > total - 1) f = total - 1;

      var i = f | 0;                       // f >= 0, so | 0 is floor
      var frac = f - i;
      if (i >= total - 1) { i = total - 1; frac = 0; }

      // The blend partner must be the GENUINE next frame, never a resolve()
      // stand-in. Blending frame 20 with frame 40 because 21-39 have not landed
      // yet reads as a dissolve between two unrelated shots — far worse than
      // the stepping this removes. As frames arrive, blending switches on
      // interval by interval and the scrub visibly liquefies.
      var blend = blendOn && frac > BLEND_MIN && frac < (1 - BLEND_MIN) &&
                  ready[i] && ready[i + 1];

      var a = blend ? i : resolve(i);
      if (a < 0) return;

      // Integer dedupe key: redraw only when the RESULT would differ. 24
      // sub-steps is finer than the display can resolve at any sane scroll
      // length, so more buys nothing and costs redraws.
      var key = blend ? (a * (BLEND_STEPS + 1) + Math.round(frac * BLEND_STEPS))
                      : (a * (BLEND_STEPS + 1));
      if (key === lastKey) return;

      var imgA = frames[a];
      if (!imgA || !imgA.naturalWidth) return;
      lastKey = key;

      ctx.globalAlpha = 1;
      ctx.drawImage(imgA, fitX, fitY, fitW, fitH);

      if (blend) {
        var imgB = frames[a + 1];
        if (imgB && imgB.naturalWidth) {
          // Canvas is alpha:false (opaque). source-over at globalAlpha = frac
          // over an opaque destination yields exactly frac*B + (1-frac)*A.
          ctx.globalAlpha = frac;
          ctx.drawImage(imgB, fitX, fitY, fitW, fitH);
          ctx.globalAlpha = 1;
        }
      }

      if (!isReady) { isReady = true; root.classList.add('is-ready'); }
    }

    function overlays(p) {
      // Hysteresis band: a bare threshold chatters on sub-pixel jitter, and each
      // flip restarts a transition and promotes/demotes a compositor layer.
      if (!hintHidden && p > 0.03) { hintHidden = true; root.classList.add('is-scrolled'); }
      else if (hintHidden && p < 0.012) { hintHidden = false; root.classList.remove('is-scrolled'); }

      // Only write when the rendered value actually changes. This ran
      // unconditionally every frame, producing a mutation record per frame.
      if (railFill) {
        var r = Math.round(p * 500) / 500;
        if (r !== lastRail) { lastRail = r; railFill.style.transform = 'scaleY(' + r + ')'; }
      }

      if (pagerEls.length) {
        // Nudge the boundary so it doesn't flip back and forth when a scrub
        // settles exactly on a segment edge.
        var raw = p * pagerEls.length;
        var seg = Math.min(pagerEls.length - 1, Math.floor(raw));
        if (seg !== lastSeg && Math.abs(raw - Math.round(raw)) > 0.02) {
          if (lastSeg >= 0 && pagerEls[lastSeg]) pagerEls[lastSeg].classList.remove('is-active');
          pagerEls[seg].classList.add('is-active');
          lastSeg = seg;
        }
      }
    }

    /* =====================================================================
       Render loop — reads only window.pageYOffset
       ===================================================================== */
    function loop(t) {
      rafId = null;

      // The only scroll-dependent read, done FIRST, before any write in this
      // callback dirties style.
      var y = window.pageYOffset;

      if (lastT === 0) lastT = t;
      var dt = t - lastT;
      lastT = t;
      if (dt < 0) dt = 0; else if (dt > DT_CAP) dt = DT_CAP;

      var p = (y - sectionTop + stickyTop) / scrollSpan;
      p = p < 0 ? 0 : (p > 1 ? 1 : p);
      var target = p * (total - 1);

      if (snapNext || tau <= 0) {
        currentFrame = target;
        snapNext = false;
      } else {
        currentFrame = target + (currentFrame - target) * Math.exp(-dt / tau);
        // Snap when close enough so target and current become bit-identical,
        // which is what lets the idle check below ever succeed.
        if (Math.abs(target - currentFrame) < SNAP_EPS) currentFrame = target;
      }

      draw(currentFrame);
      overlays(p);

      var moving = (y !== lastY) || (currentFrame !== target);
      lastY = y;
      if (moving) idleTicks = 0;
      else if (++idleTicks > 2) {
        runningLoop = false;
        // Purely a styling hook: lets the trust bar / badge restore their
        // backdrop-filter once the scrub settles. No effect on the scrub.
        root.classList.remove('is-scrubbing');
        return;                                                    // do NOT re-request
      }

      rafId = requestAnimationFrame(loop);
    }

    function wake() {
      if (torn || !started || !visible || !onScreen || runningLoop) return;
      runningLoop = true;
      lastT = 0;                       // dt = 0 on the resume frame
      root.classList.add('is-scrubbing');   // styling hook only — see loop()
      rafId = requestAnimationFrame(loop);
    }

    function sleep() {
      runningLoop = false;
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      lastT = 0;
    }

    function start() {
      if (started) return;
      started = true;
      hideLoader();
      resize();
      snapNext = true;
      wake();
    }

    function hideLoader() { if (loader) loader.classList.add('is-done'); }

    /* =====================================================================
       Preload — breadth-first midpoint subdivision through a bounded pool
       ===================================================================== */
    function buildOrder() {
      var order = [], seen = new Uint8Array(total);
      function push(i) { if (i >= 0 && i < total && !seen[i]) { seen[i] = 1; order.push(i); } }

      // Every level of the queue doubles temporal resolution across the WHOLE
      // timeline, so the scrub sharpens uniformly rather than unfreezing
      // left-to-right the way sequential loading does.
      push(0); push(total - 1);
      var q = [[0, total - 1]];
      while (q.length) {
        var next = [];
        for (var k = 0; k < q.length; k++) {
          var a = q[k][0], b = q[k][1];
          if (b - a < 2) continue;
          var m = (a + b) >> 1;
          push(m);
          next.push([a, m], [m, b]);
        }
        q = next;
      }
      for (var i = 0; i < total; i++) push(i);   // safety net for degenerate totals
      return order;
    }

    var order = buildOrder();
    var cursor = 0, inflight = 0;
    var poolSize = 4;                  // raised after load; see boot()

    function pump() {
      while (inflight < poolSize && cursor < order.length) {
        load(order[cursor], cursor);
        cursor++;
      }
    }

    function load(i, rank) {
      inflight++;
      var img = new Image();
      var done = false;

      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        img.onload = img.onerror = null;
        img.src = ABORT_SRC;
        settle(i, false);
      }, REQ_TIMEOUT);

      function finish(ok) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        settle(i, ok, img);
      }

      img.decoding = 'async';
      if ('fetchPriority' in img) {
        img.fetchPriority = rank < 4 ? 'high' : (rank > order.length * 0.5 ? 'low' : 'auto');
      }
      img.onload = function () {
        // decode() moves the WebP decode off the first drawImage, which would
        // otherwise hitch mid-scrub. Safari rejects decode() on some already
        // cached images, so a rejection is not a failure.
        if (img.decode) {
          img.decode().then(function () { finish(true); })
                      .catch(function () { finish(!!(img.complete && img.naturalWidth)); });
        } else finish(true);
      };
      img.onerror = function () { finish(false); };
      img.src = frameURL(i);
    }

    function settle(i, ok, img) {
      inflight--;
      settled++;
      if (ok) {
        frames[i] = img;
        ready[i] = 1;
        loadedCount++;
        if (!srcW && img.naturalWidth) {
          srcW = img.naturalWidth; srcH = img.naturalHeight;
          resize();                                  // now that fit is knowable
        }
        if (!started) start();
        else { lastKey = -1; wake(); }  // a new frame changes what can be drawn
      } else {
        failed[i] = 1;
      }

      var pct = Math.round((loadedCount / total) * 100);
      // scaleX, not width: `width` is layout-triggering and this runs once per
      // decoded frame. Paint-property swap only — no change to scrub behaviour.
      if (loaderBar) loaderBar.style.transform = 'scaleX(' + (pct / 100) + ')';
      if (loaderNum) loaderNum.textContent = pct + '%';

      if (settled >= order.length) drained();
      pump();
    }

    function drained() {
      // Self-healing: if the section is configured for more frames than were
      // uploaded, the tail 404s. Clamp so the scrub ends on the real last frame
      // instead of freezing on a blank stretch.
      while (total > 1 && failed[total - 1] && !ready[total - 1]) total--;

      if (loadedCount === 0) {
        // No frames at all — keep the poster, collapse the tall wrapper so the
        // page doesn't carry a huge dead scroll region.
        root.style.height = '100svh';
        pin.style.position = 'relative';
        hideLoader();
        sleep();
      }
    }

    /* =====================================================================
       Reduced motion: no canvas, no downloads, no pin — just the poster.
       ===================================================================== */
    function initReduced() {
      root.style.height = '100svh';
      pin.style.position = 'relative';
      canvas.style.display = 'none';
      hideLoader();
      root.classList.add('is-reduced', 'is-scrolled');
    }

    /* =====================================================================
       Lifecycle
       ===================================================================== */
    var ro = null, io = null, resizeTimer = null, verifyTimer = null;

    function onMq() { teardown(); window.location.reload(); }

    function teardown() {
      if (torn) return;
      torn = true;
      sleep();
      clearTimeout(resizeTimer);
      clearTimeout(verifyTimer);
      for (var i = 0; i < binds.length; i++) {
        binds[i][0].removeEventListener(binds[i][1], binds[i][2], binds[i][3]);
      }
      binds.length = 0;
      if (ro) { ro.disconnect(); ro = null; }
      if (io) { io.disconnect(); io = null; }
      if (mqReduce.removeEventListener) mqReduce.removeEventListener('change', onMq);
      else if (mqReduce.removeListener) mqReduce.removeListener(onMq);
    }

    function observe() {
      if (window.ResizeObserver) {
        ro = new ResizeObserver(function () {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () { resize(); snapNext = true; wake(); }, 100);
        });
        // ResizeObserver on the pin, not window.resize: on iOS the URL bar
        // collapsing fires resize on every scroll even though the svh-sized pin
        // never changed, which would reallocate the canvas mid-scrub.
        ro.observe(pin);
        ro.observe(root);            // catches scroll_length changing in the editor
        ro.observe(document.body);   // anything above the hero changing height
      }
      if (window.IntersectionObserver) {
        io = new IntersectionObserver(function (entries) {
          onScreen = entries[0].isIntersecting;
          if (onScreen) { lastKey = -1; snapNext = true; wake(); } else sleep();
        }, { rootMargin: '200px 0px' });
        io.observe(root);
      }
    }

    function boot() {
      if (mqReduce.matches) { initReduced(); return; }

      // Wake on the inputs that CAUSE scroll as well as on scroll itself, so
      // the loop is already alive before the first scroll event fires.
      var WAKE = ['scroll', 'wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown'];
      for (var i = 0; i < WAKE.length; i++) bind(window, WAKE[i], wake, { passive: true });

      bind(document, 'visibilitychange', function () {
        visible = !document.hidden;
        // Snap rather than glide: after a hidden tab the stored position can be
        // far stale, and gliding to it visibly replays a chunk of the sequence.
        if (visible) { snapNext = true; lastKey = -1; wake(); } else sleep();
      });

      bind(window, 'pageshow', function (e) {
        if (!e.persisted) return;
        torn = false;
        observe();
        resize();
        snapNext = true;
        wake();
      });
      bind(window, 'pagehide', teardown);

      bind(document, 'shopify:section:unload', function (e) {
        if (e.target === root || (e.target.contains && e.target.contains(root))) teardown();
      });

      // Verify cached geometry only when scrolling stops — zero cost mid-scrub.
      if ('onscrollend' in window) {
        bind(window, 'scrollend', verifyGeometry, { passive: true });
      } else {
        bind(window, 'scroll', function () {
          clearTimeout(verifyTimer);
          verifyTimer = setTimeout(verifyGeometry, 180);
        }, { passive: true });
      }

      observe();

      // The announcement bar's height changes when the webfont swaps in, which
      // moves sectionTop. This is the most common real cause of a stale cache.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { measure(); wake(); });
      }
      bind(window, 'load', function () {
        measure();
        poolSize = 8;   // LCP is settled; the Shopify CDN is HTTP/2
        pump();
        wake();
      });

      measure();
      pump();
    }

    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onMq);
    else if (mqReduce.addListener) mqReduce.addListener(onMq);

    boot();
  }

  function init() {
    var heroes = document.querySelectorAll('.sh-hero[data-scrub="true"]');
    for (var i = 0; i < heroes.length; i++) initHero(heroes[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // The theme editor re-renders sections in place.
  document.addEventListener('shopify:section:load', function (e) {
    var hero = e.target.querySelector && e.target.querySelector('.sh-hero[data-scrub="true"]');
    if (hero) initHero(hero);
  });
})();
