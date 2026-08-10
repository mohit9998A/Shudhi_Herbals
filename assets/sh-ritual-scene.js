/* ===========================================================================
   SHUDHI — Ritual Scene
   Behaviour for snippets/sh-ritual-scene.liquid. Loaded per-section and
   deferred from sections/sh-ritual-benefits.liquid, the same shape
   sh-signature-product.liquid uses, rather than a global entry in
   layout/theme.liquid.

   Four jobs, in this order:

     1. ARM     add .is-armed, so §26's entrance rules start applying
     2. LIVE    toggle .is-live, so the ambient CSS loops pause off-screen
     3. DEPTH   write translate3d to the scene layers as the pointer moves
     4. TORCH   write translate3d to the cursor light

   ---------------------------------------------------------------------------
   FIVE THINGS ARE LOAD-BEARING
   ---------------------------------------------------------------------------

   1. THIS FILE IS AN ENHANCEMENT AND NOTHING HERE IS ALLOWED TO GATE CONTENT.
      The band is complete and readable before a line of this runs. §26 gives
      the heading, the eyebrow and the four cards an explicit opacity:1 /
      transform:none resting state, and the entrance only exists once .is-armed
      lands. A 404 on this file, an exception inside it, or JS off entirely all
      leave a finished section on screen.

      This is a CHANGE, and it is the point of the change. The heading and the
      cards used to carry the theme-wide [data-reveal], whose base rule at
      shudhi-home.css:234 is opacity:0 — so anything that stopped
      shudhi-home.js from adding .is-in left this band rendering as a
      photograph with nothing on it. Same failure snippets/sh-soap-plate.liquid
      was written to design out, same fix.

   2. NEVER ARM WITHOUT A WAY TO UNARM. .is-armed is what applies §26's
      opacity:0 entrance pre-state; .is-shown is what clears it. So arming is
      only ever correct when an IntersectionObserver exists to follow it —
      otherwise the class hides the section and nothing is coming to reveal it.
      The two lines are deliberately adjacent and must stay that way: arming is
      not a state, it is the first half of a pair.

   3. THE SECOND OBSERVER IS NOT A DUPLICATE. shudhi-home.js:283 calls
      io.unobserve() on first intersection: it is a fire-once reveal and it
      structurally cannot toggle. Pausing the ambient loops when the scene
      scrolls away needs a toggle, so it needs its own observer. This one never
      unobserves and is disconnected only on teardown.

   4. THE TORCH IS NOT LERPED. Every depth layer eases toward its target,
      because a composition that snaps to the pointer reads as a widget. The
      cursor light is the opposite case: a light that trails the pointer by
      200ms reads as broken. It is written at the raw position and excluded
      from the settled test, so it never keeps the loop alive on its own.

   5. THE LOOP MUST BE SWEPT. It is module-scope and shared across every scene
      on the page. An instance the theme editor removed and we failed to drop
      keeps being written to forever, on detached nodes. boot() sweeps before
      it scans.

   Style follows assets/sh-soap-plate.js, which this borrows its cursor loop
   from almost verbatim: ES5 throughout — var, no arrow functions, no template
   literals, no optional chaining — with comments that say why.

   Deliberately NOT here: the four ritual states and the soap-hover splash.
   Both are pure CSS in §26 — :has() expresses "a card in this section is
   hovered" declaratively, and animation-delay under :has(:hover) IS a dwell
   gate. Routing either through this file would add an attribute lifecycle that
   can go stale across a shopify:section:load, in exchange for nothing.
   =========================================================================== */

(function () {
  'use strict';

  /* Two sections on one page emit two <script src> tags. The browser fetches
     once but EXECUTES twice, which would double every observer and give the
     shared rAF loop two copies of each scene. Same guard sh-soap-plate uses
     at :65. */
  if (window.__shRS) return;
  window.__shRS = true;

  var scenes = [];        /* every live instance, module scope like plates[] */
  var winBound = false;   /* the window listener binds once, ever */
  var rafId = 0;
  var lastFrame = 0;
  var mx = 0, my = 0;     /* last pointer position, viewport coordinates */
  var lastMove = 0;

  /* Read once at boot, the same trade sh-soap-plate.js:79 makes. A visitor who
     flips the OS toggle mid-session is covered by the !important author rules
     in §26's reduced-motion block, which beat the non-important inline
     transforms this file writes. */
  var mq = window.matchMedia;
  var STILL = !!mq && mq.call(window, '(prefers-reduced-motion: reduce)').matches;
  var WIDE = mq ? mq.call(window, '(min-width: 1025px)') : null;
  var FINE = mq ? mq.call(window, '(hover: hover) and (pointer: fine)') : null;

  /* All three must hold. The same gate §26 uses for will-change, so a promoted
     layer never exists without a loop to justify it, and a loop never runs
     against an unpromoted one. */
  var CURSOR = !STILL && !!WIDE && WIDE.matches && !!FINE && FINE.matches;

  /* Total travel in CSS px for a layer at depth 1.0. The scene's depths run
     0.12 to 0.85, so the bloom moves about 1px and the nearest beads about 7 —
     the depth field the brief asks for, and well inside the +/-15px house
     ceiling documented at shudhi-home.js:362. */
  var TRAVEL = 8;

  /* --------------------------------------------------------------------- */
  /* Setup                                                                  */
  /* --------------------------------------------------------------------- */

  function init(root) {
    var S = {
      root: root,
      depths: [],
      torch: null,
      io: null,
      x: 0, y: 0,     /* current smoothed offset */
      tx: 0, ty: 0,   /* target offset */
      lx: 0, ly: 0,   /* pointer, in this section's own coordinates */
      /* Per-instance, not global. The window listener below binds if ANY scene
         on the page wants the cursor, so a second section with the setting
         turned off would otherwise inherit the first one's parallax. */
      cursor: CURSOR && root.hasAttribute('data-ritual-cursor'),
      inside: false,
      live: false,
      dead: false
    };

    var nodes = root.querySelectorAll('[data-ritual-depth]');
    for (var i = 0; i < nodes.length; i++) {
      var d = parseFloat(nodes[i].getAttribute('data-ritual-depth'));
      /* A malformed attribute must not produce NaN transforms — those
         serialise as "translate3d(NaNpx, ...)" and the browser drops the whole
         rule, which looks like the parallax silently not working rather than
         like a typo. */
      if (!isFinite(d)) continue;
      S.depths.push({ el: nodes[i], d: d });
    }

    /* Present only when the merchant left the cursor setting on AND the scene
       rendered at all. Absent is a normal state, not a failure. */
    S.torch = root.querySelector('.sh-ritual__torch');

    /* (2). ARM ONLY WITH AN OBSERVER IN HAND. .is-armed is what applies §26's
       opacity:0 pre-state, so adding it without something able to add
       .is-shown afterwards would hide the heading and all four cards
       permanently — the exact failure being designed out. The two lines are
       deliberately adjacent and must stay that way.

       No observer, or the merchant turned the entrance off, means no arming at
       all, and the section simply is where it ends up. */
    var wantsEntrance = root.hasAttribute('data-ritual-reveal') && !!window.IntersectionObserver;
    if (wantsEntrance) root.classList.add('is-armed');

    /* (3). One observer, two jobs, because they need opposite lifetimes.
       .is-shown is latched — set once on first intersection and never cleared,
       so an entrance cannot replay on scroll-back. .is-live toggles for as long
       as the scene exists, so the ambient loops pause off-screen.

       rootMargin starts both slightly early: the entrance gets a head start
       rather than beginning exactly as the band crosses the edge, and the loops
       are already in progress by the time anything is visible. */
    if (window.IntersectionObserver) {
      S.io = new IntersectionObserver(function (entries) {
        for (var n = 0; n < entries.length; n++) {
          if (entries[n].isIntersecting) root.classList.add('is-shown');
          setLive(S, entries[n].isIntersecting);
        }
      }, { threshold: 0, rootMargin: '80px' });
      S.io.observe(root);
    } else {
      /* No observer: run permanently rather than never. Nothing was armed
         above, so there is no entrance owed — this only starts the ambient
         loops on a browser old enough to lack IntersectionObserver, which is
         the right way round. The failure mode of the alternative is a
         permanently frozen scene. */
      setLive(S, true);
    }

    scenes.push(S);
    return S;
  }

  function setLive(S, on) {
    if (S.live === on) return;
    S.live = on;
    S.root.classList.toggle('is-live', on);

    /* Off-screen: hand the layers back to the stylesheet. Leaving the last
       inline transform behind would freeze a half-nudged composition in place,
       and §26's reduced-motion insurance could not clear it either, because a
       scene scrolled out of view is not a reduced-motion scene. */
    if (!on) zero(S);
  }

  function zero(S) {
    for (var i = 0; i < S.depths.length; i++) S.depths[i].el.style.transform = '';
    if (S.torch) S.torch.style.transform = '';
    S.root.classList.remove('is-torch');
    S.inside = false;
    S.x = S.y = S.tx = S.ty = 0;
  }

  /* --------------------------------------------------------------------- */
  /* Cursor depth — ported from sh-soap-plate.js:183-260                     */
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

    var i, j, S, box, cx, cy, settled = true;
    var vw = window.innerWidth || 1;
    var vh = window.innerHeight || 1;

    /* READ pass. Every getBoundingClientRect() happens before any style write;
       interleaving them forces a layout recalculation per element. The same
       discipline sh-soap-plate.js:218 follows. */
    for (i = 0; i < scenes.length; i++) {
      S = scenes[i];
      if (!S.live || S.dead || !S.cursor) continue;
      box = S.root.getBoundingClientRect();
      if (!box.width || !box.height) { S.tx = S.ty = 0; S.inside = false; continue; }

      cx = box.left + box.width / 2;
      cy = box.top + box.height / 2;
      /* Normalised to roughly -1..1 against the viewport, not the section: the
         effect should respond to where the pointer is on the PAGE, so moving
         across a card still moves the water. Clamped so a pointer at the far
         corner cannot exceed the travel budget. */
      S.tx = clamp((mx - cx) / (vw / 2), -1, 1);
      S.ty = clamp((my - cy) / (vh / 2), -1, 1);

      /* The torch wants a position INSIDE the section, not a normalised one,
         and it wants to disappear when the pointer is elsewhere on the page. */
      S.inside = mx >= box.left && mx <= box.right && my >= box.top && my <= box.bottom;
      S.lx = mx - box.left;
      S.ly = my - box.top;
    }

    /* WRITE pass. */
    for (i = 0; i < scenes.length; i++) {
      S = scenes[i];
      if (!S.live || S.dead || !S.cursor) continue;

      S.x += (S.tx - S.x) * k;
      S.y += (S.ty - S.y) * k;

      if (Math.abs(S.tx - S.x) > 0.001 || Math.abs(S.ty - S.y) > 0.001) settled = false;

      for (j = 0; j < S.depths.length; j++) {
        var layer = S.depths[j];
        /* translate3d, not translate: it keeps the layer on the compositor and
           matches the promotion §26 has already declared for these elements. */
        layer.el.style.transform =
          'translate3d(' + (S.x * layer.d * TRAVEL).toFixed(2) + 'px,' +
                           (S.y * layer.d * TRAVEL).toFixed(2) + 'px,0)';
      }

      /* (4). Raw, not smoothed, and it does not vote on `settled`. */
      if (S.torch) {
        S.root.classList.toggle('is-torch', S.inside);
        if (S.inside) {
          S.torch.style.transform =
            'translate3d(' + S.lx.toFixed(1) + 'px,' + S.ly.toFixed(1) + 'px,0)';
        }
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

  function destroy(S) {
    S.dead = true;
    if (S.io) { S.io.disconnect(); S.io = null; }
    zero(S);
  }

  /* --------------------------------------------------------------------- */
  /* Boot                                                                   */
  /* --------------------------------------------------------------------- */

  function boot() {
    /* (5). Sweep first. shopify:section:unload fires for the section being
       replaced, and its scene's nodes are already detached by the time we
       run — document.contains is the check that catches them. */
    for (var i = scenes.length - 1; i >= 0; i--) {
      if (!document.contains(scenes[i].root)) {
        destroy(scenes[i]);
        scenes.splice(i, 1);
      }
    }

    var found = document.querySelectorAll('.sh-ritual');
    for (var j = 0; j < found.length; j++) {
      /* A flag on the element, not a lookup in scenes[]: boot() re-runs on
         every shopify:section:load, including for unrelated sections, and
         re-arming an existing scene would restart its entrance mid-scroll. A
         genuinely re-rendered section brings a NEW element with no flag, so
         real re-renders still initialise. Same bargain sh-soap-plate.js:297
         makes. */
      if (found[j].getAttribute('data-ritual-done')) continue;
      found[j].setAttribute('data-ritual-done', '1');
      init(found[j]);
    }

    if (!scenes.length) return;

    /* Bound once for the page's lifetime and never removed — the loop is
       shared across instances, so there is no per-instance listener to clean
       up. passive because this handler never calls preventDefault.

       data-ritual-cursor is the merchant's switch. Checked here rather than in
       init() so that a page whose only scene has it off never binds the
       listener at all. */
    if (CURSOR && !winBound && document.querySelector('.sh-ritual[data-ritual-cursor]')) {
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
