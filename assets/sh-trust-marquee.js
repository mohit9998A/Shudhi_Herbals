/* ===========================================================================
   SHUDHI — Trust marquee

   One job: stop the ribbon compositing while it is off screen. Nothing else
   here. The marquee itself, the hover pause, the edge fade and the icon sweep
   are all CSS in shudhi-home.css §27.

   Loaded from sections/sh-trust-marquee.liquid, deferred, and only when the
   "Pause when scrolled out of view" setting is on.

   ---------------------------------------------------------------------------
   FOUR THINGS HERE ARE LOAD-BEARING
   ---------------------------------------------------------------------------

   1. THIS FILE CAN ONLY EVER PAUSE, NEVER START. §27 leaves the animation
      running; all this does is ADD .is-paused. That polarity is deliberate and
      it is the opposite of what §24 does for the living-conversation panel.
      There, paused-by-default is right: a still panel is a still panel. Here a
      marquee that never starts leaves claims 5-8 parked off the right edge with
      no way to reach them — a broken band, not a quiet one. So every failure
      mode of this file (404, parse error, exception below, JS off, no
      IntersectionObserver) lands on a marquee that simply always runs, which is
      exactly what sections/sh-announcement.liquid has shipped all along.

   2. THE OBSERVER MUST NOT unobserve. shudhi-home.js:283 calls io.unobserve() on
      first intersection because it is a fire-once reveal. This one has to toggle
      for the element's lifetime, so it keeps observing and is disconnected only
      on teardown. Same distinction sh-soap-plate.js:41 draws.

   3. rootMargin BUYS THE RESUME BACK EARLY. At a bare threshold the band would
      still be paused at the instant its first pixel appears, and the first frame
      a visitor sees would be a stationary ribbon that then starts moving — which
      reads as a stutter. 200px of margin means it is already at speed by the
      time it is on screen. Costs nothing: an off-screen paused animation and an
      off-screen running one both composite exactly zero pixels.

   4. INSTANCES MUST BE SWEPT. The array is module scope and survives every
      theme-editor re-render. An instance whose section was replaced keeps an
      observer pointed at a detached node forever unless boot() drops it first.

   Style follows assets/sh-soap-plate.js: ES5 throughout — var, no arrow
   functions, no template literals, no optional chaining — with comments that
   say why.
   =========================================================================== */

(function () {
  'use strict';

  /* Two instances of the section on one page emit two <script src> tags. The
     browser fetches once but EXECUTES twice, which would give every marquee two
     observers writing the same class. Same guard sh-soap-plate.js:65 uses. */
  if (window.__shTM) return;
  window.__shTM = true;

  var marquees = [];   /* every live instance, module scope like plates[] */

  function init(root) {
    /* (1). No observer, no pausing — and a marquee that never pauses is the
       correct degraded state, so this returns silently rather than trying to
       fake it with scroll handlers. */
    if (!window.IntersectionObserver) return;

    var M = { root: root, io: null };

    M.io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        /* classList.toggle with a second argument is ES5-era DOM and safe here;
           the force flag has been in every browser that ships
           IntersectionObserver, which we have already checked for. */
        M.root.classList.toggle('is-paused', !entries[i].isIntersecting);
      }
    }, { threshold: 0, rootMargin: '200px 0px' });   /* (2), (3) */

    M.io.observe(root);
    marquees.push(M);
  }

  function destroy(M) {
    if (M.io) { M.io.disconnect(); M.io = null; }
    /* Leave the band running, not frozen, if this instance is being torn down
       while still on screen. (1) again: the resting state is the moving one. */
    M.root.classList.remove('is-paused');
  }

  function boot() {
    /* (4). Sweep first. shopify:section:unload fires for the section being
       replaced and its nodes are already detached by the time we run, so
       document.contains is what catches them. */
    for (var i = marquees.length - 1; i >= 0; i--) {
      if (!document.contains(marquees[i].root)) {
        destroy(marquees[i]);
        marquees.splice(i, 1);
      }
    }

    var found = document.querySelectorAll('.sh-tmarquee');
    for (var j = 0; j < found.length; j++) {
      /* A flag on the element, not a lookup in marquees[]: boot() re-runs on
         every shopify:section:load, including for unrelated sections. A section
         that genuinely re-rendered brings a NEW element with no flag, so real
         re-renders still initialise. Same bargain sh-soap-plate.js:293 makes. */
      if (found[j].getAttribute('data-tm-done')) continue;
      found[j].setAttribute('data-tm-done', '1');
      init(found[j]);
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
