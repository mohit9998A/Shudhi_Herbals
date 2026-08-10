/* ===========================================================================
   SHUDHI — Soap Plate
   Behaviour for snippets/sh-soap-plate.liquid. Loaded per-section and deferred
   from sections/sh-signature-product.liquid, the same shape sh-contact.liquid
   uses, rather than a global entry in layout/theme.liquid.

   Three jobs, in this order:

     1. ARM     add .is-armed, so §25's entrance rules start applying
     2. LIVE    toggle .is-live, so the ambient CSS loops pause off-screen
     3. DEPTH   write translate3d to the six layers as the pointer moves

   ---------------------------------------------------------------------------
   FOUR THINGS ARE LOAD-BEARING
   ---------------------------------------------------------------------------

   1. THIS FILE IS AN ENHANCEMENT AND NOTHING HERE IS ALLOWED TO GATE CONTENT.
      The plate is complete and visible before a line of this runs. §25 gives
      .sh-plate[data-reveal] an explicit opacity:1/transform:none resting state,
      and the entrance only exists once .is-armed lands. So a 404 on this file,
      an exception inside it, or JS off entirely all leave a finished
      illustration on screen — they cost the entrance and the parallax, nothing
      else.

      The photo this replaced worked the other way round: its resting state was
      a full clip and the JS had to open it. That is why the band rendered blank
      whenever anything upstream failed.

   2. NEVER ARM WITHOUT A WAY TO UNARM. .is-armed is what applies §25's opacity:0
      entrance pre-state; .is-shown is what clears it. So arming is only ever
      correct when an IntersectionObserver exists to follow it — otherwise the
      class hides the illustration and nothing is coming to reveal it.

      This is also why the plate carries data-plate-reveal rather than the
      theme-wide data-reveal. Arming here and revealing from shudhi-home.js's
      shared observer would make the illustration depend on two separate scripts
      succeeding; a failure in either would hide it. One file owns the whole
      entrance, so there is one thing that can fail and its failure mode is
      "no animation", not "no illustration".

   3. THE SECOND OBSERVER IS NOT A DUPLICATE. shudhi-home.js:283 calls
      io.unobserve() on first intersection: it is a fire-once reveal and it
      structurally cannot toggle. Pausing the ambient loops when the plate
      scrolls away needs a toggle, so it needs its own observer. This one never
      unobserves and is disconnected only on teardown. It carries both jobs —
      .is-shown latched once, .is-live toggled for the element's lifetime.

   4. THE LOOP MUST BE SWEPT. It is module-scope and shared across every plate on
      the page, and it writes transforms to six elements per instance per frame.
      An instance the theme editor removed and we failed to drop keeps being
      written to forever, on detached nodes. boot() sweeps before it scans.

   Style follows assets/sh-living-conversation.js, which this borrows its cursor
   loop from almost verbatim: ES5 throughout — var, no arrow functions, no
   template literals, no optional chaining — with comments that say why.
   =========================================================================== */

(function () {
  'use strict';

  /* Two sections on one page emit two <script src> tags. The browser fetches
     once but EXECUTES twice, which would double every observer and give the
     shared rAF loop two copies of each plate. Same guard sh-living-conversation
     uses at :46. */
  if (window.__shSP) return;
  window.__shSP = true;

  var plates = [];        /* every live instance, module scope like panels[] */
  var winBound = false;   /* the window listener binds once, ever */
  var rafId = 0;
  var lastFrame = 0;
  var mx = 0, my = 0;     /* last pointer position, viewport coordinates */
  var lastMove = 0;

  /* Read once at boot, the same trade counters() and parallax() make in
     shudhi-home.js. A visitor who flips the OS toggle mid-session is covered by
     the !important author rules in §25's reduced-motion block, which beat the
     non-important inline transforms this file writes. */
  var mq = window.matchMedia;
  var STILL = !!mq && mq.call(window, '(prefers-reduced-motion: reduce)').matches;
  var WIDE = mq ? mq.call(window, '(min-width: 1025px)') : null;
  var FINE = mq ? mq.call(window, '(hover: hover) and (pointer: fine)') : null;

  /* All three must hold. The same gate §25 uses for will-change, so a promoted
     layer never exists without a loop to justify it, and a loop never runs
     against an unpromoted one. */
  var CURSOR = !STILL && !!WIDE && WIDE.matches && !!FINE && FINE.matches;

  /* Total travel in CSS px for a layer at depth 1.0. Each layer scales this by
     its own data-plate-depth: the bar sits at 0.5 for ~4px, which is the 3-5px
     the design calls for, and the foreground at 1.0 for the full 8. Well inside
     the +/-15px house ceiling documented at shudhi-home.js:362. */
  var TRAVEL = 8;

  /* --------------------------------------------------------------------- */
  /* Setup                                                                  */
  /* --------------------------------------------------------------------- */

  function init(root) {
    var P = {
      root: root,
      depths: [],
      io: null,
      x: 0, y: 0,     /* current smoothed offset */
      tx: 0, ty: 0,   /* target offset */
      live: false,
      dead: false
    };

    var nodes = root.querySelectorAll('[data-plate-depth]');
    for (var i = 0; i < nodes.length; i++) {
      var d = parseFloat(nodes[i].getAttribute('data-plate-depth'));
      /* A malformed attribute must not produce NaN transforms — those serialise
         as "translate3d(NaNpx, ...)" and the browser drops the whole rule, which
         looks like the parallax silently not working rather than like a typo. */
      if (!isFinite(d)) continue;
      P.depths.push({ el: nodes[i], d: d });
    }

    /* (2). ARM ONLY WITH AN OBSERVER IN HAND. .is-armed is what applies §25's
       opacity:0 pre-state, so adding it without something able to add .is-shown
       afterwards would hide the illustration permanently — the exact failure
       being designed out. The two lines are deliberately adjacent and must stay
       that way: arming is not a state, it is the first half of a pair.

       No observer, or the merchant turned the entrance off, means no arming at
       all, and the plate simply is where it ends up. */
    var wantsEntrance = root.hasAttribute('data-plate-reveal') && !!window.IntersectionObserver;
    if (wantsEntrance) root.classList.add('is-armed');

    /* (3). One observer, two jobs, because they need opposite lifetimes.
       .is-shown is latched — set once on first intersection and never cleared,
       so an entrance cannot replay on scroll-back. .is-live toggles for as long
       as the plate exists, so the ambient loops pause off-screen. The shared
       observer at shudhi-home.js:283 unobserves after its first hit and so could
       only ever have done the first of these.

       rootMargin starts both slightly early: the entrance gets a head start
       rather than beginning exactly as the plate crosses the edge, and the loops
       are already in progress by the time anything is visible. */
    if (window.IntersectionObserver) {
      P.io = new IntersectionObserver(function (entries) {
        for (var n = 0; n < entries.length; n++) {
          if (entries[n].isIntersecting) root.classList.add('is-shown');
          setLive(P, entries[n].isIntersecting);
        }
      }, { threshold: 0, rootMargin: '80px' });
      P.io.observe(root);
    } else {
      /* No observer: run permanently rather than never. The cost is six paused
         CSS animations becoming six running ones on a browser old enough to
         lack IntersectionObserver, which is the right way round — the failure
         mode of the alternative is a permanently frozen illustration. Nothing
         was armed above, so there is no entrance owed. */
      setLive(P, true);
    }

    plates.push(P);
    return P;
  }

  function setLive(P, on) {
    if (P.live === on) return;
    P.live = on;
    P.root.classList.toggle('is-live', on);

    /* Off-screen: hand the layers back to the stylesheet. Leaving the last
       inline transform behind would freeze a half-nudged composition in place,
       and §25's reduced-motion insurance could not clear it either, because a
       plate scrolled out of view is not a reduced-motion plate. */
    if (!on) zero(P);
  }

  function zero(P) {
    for (var i = 0; i < P.depths.length; i++) P.depths[i].el.style.transform = '';
    P.x = P.y = P.tx = P.ty = 0;
  }

  /* --------------------------------------------------------------------- */
  /* Cursor depth — ported from sh-living-conversation.js:299-368            */
  /* --------------------------------------------------------------------- */

  function onMove(e) {
    /* Record only. No DOM read, no DOM write, no layout — a mousemove handler
       that measures anything is a scroll-jank generator. */
    mx = e.clientX;
    my = e.clientY;
    lastMove = e.timeStamp || 0;
    startLoop();
  }

  function startLoop() {
    if (rafId) return;
    lastFrame = 0;
    rafId = requestAnimationFrame(frame);
  }

  function frame(now) {
    rafId = 0;
    if (!lastFrame) lastFrame = now;

    var dt = now - lastFrame;
    lastFrame = now;
    /* A backgrounded tab hands back one enormous dt on return. Uncapped, the
       lerp below resolves to ~1 and the whole composition snaps to its target
       in a single frame. */
    if (dt > 100) dt = 100;

    /* Frame-rate normalised exponential smoothing: the same visual damping at
       144Hz as at 60Hz, rather than a fixed 0.12 that is four times faster on a
       high-refresh display. */
    var k = 1 - Math.pow(1 - 0.12, dt / 16.667);

    var i, j, P, box, cx, cy, settled = true;
    var vw = window.innerWidth || 1;
    var vh = window.innerHeight || 1;

    /* READ pass. Every getBoundingClientRect() happens before any style write;
       interleaving them forces a layout recalculation per element. The same
       discipline shudhi-home.js:373 follows. */
    for (i = 0; i < plates.length; i++) {
      P = plates[i];
      if (!P.live || P.dead) continue;
      box = P.root.getBoundingClientRect();
      if (!box.width || !box.height) { P.tx = P.ty = 0; continue; }
      cx = box.left + box.width / 2;
      cy = box.top + box.height / 2;
      /* Normalised to roughly -1..1 against the viewport, not the plate: the
         effect should respond to where the pointer is on the PAGE, so moving
         across the copy column still moves the illustration. Clamped so a
         pointer at the far corner cannot exceed the travel budget. */
      P.tx = clamp((mx - cx) / (vw / 2), -1, 1);
      P.ty = clamp((my - cy) / (vh / 2), -1, 1);
    }

    /* WRITE pass. */
    for (i = 0; i < plates.length; i++) {
      P = plates[i];
      if (!P.live || P.dead) continue;

      P.x += (P.tx - P.x) * k;
      P.y += (P.ty - P.y) * k;

      if (Math.abs(P.tx - P.x) > 0.001 || Math.abs(P.ty - P.y) > 0.001) settled = false;

      for (j = 0; j < P.depths.length; j++) {
        var layer = P.depths[j];
        /* translate3d, not translate: it keeps the layer on the compositor and
           matches the promotion §25 has already declared for these elements. */
        layer.el.style.transform =
          'translate3d(' + (P.x * layer.d * TRAVEL).toFixed(2) + 'px,' +
                           (P.y * layer.d * TRAVEL).toFixed(2) + 'px,0)';
      }
    }

    /* Self-stopping. The loop keeps running while anything is still easing into
       place, then for a further 1.2s of pointer silence, then stops entirely —
       an idle page schedules no frames at all. */
    if (!settled || (now - lastMove) < 1200) rafId = requestAnimationFrame(frame);
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* --------------------------------------------------------------------- */
  /* Teardown                                                               */
  /* --------------------------------------------------------------------- */

  function destroy(P) {
    P.dead = true;
    if (P.io) { P.io.disconnect(); P.io = null; }
    zero(P);
  }

  /* --------------------------------------------------------------------- */
  /* Boot                                                                   */
  /* --------------------------------------------------------------------- */

  function boot() {
    /* (4). Sweep first. shopify:section:unload fires for the section being
       replaced, and its plate's nodes are already detached by the time we run —
       document.contains is the check that catches them. */
    for (var i = plates.length - 1; i >= 0; i--) {
      if (!document.contains(plates[i].root)) {
        destroy(plates[i]);
        plates.splice(i, 1);
      }
    }

    var found = document.querySelectorAll('.sh-plate');
    for (var j = 0; j < found.length; j++) {
      /* A flag on the element, not a lookup in plates[]: boot() re-runs on every
         shopify:section:load, including for unrelated sections, and re-arming an
         existing plate would restart its entrance transition mid-scroll. A
         genuinely re-rendered section brings a NEW element with no flag, so real
         re-renders still initialise. Same bargain counters() makes at
         shudhi-home.js:319. */
      if (found[j].getAttribute('data-plate-done')) continue;
      found[j].setAttribute('data-plate-done', '1');
      init(found[j]);
    }

    if (!plates.length) return;

    /* Bound once for the page's lifetime and never removed — the loop is shared
       across instances, so there is no per-instance listener to clean up. passive
       because this handler never calls preventDefault. */
    if (CURSOR && !winBound) {
      window.addEventListener('mousemove', onMove, { passive: true });
      winBound = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', boot);
  document.addEventListener('shopify:section:unload', boot);
})();
