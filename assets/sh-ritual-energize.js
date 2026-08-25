/* ===========================================================================
   SHUDHI — ENERGIZED THROUGH 5 STEPS — rotation controller
   sections/sh-ritual-energize.liquid

   One job: every `interval` ms move the next card to the front and show its
   step text. Everything visual is CSS keyed on [data-pos] / .is-active /
   .is-entering; this file only writes those. Liquid has already stamped the
   resting state, so with this script missing the band is complete and still.

   ROTATION IS CONTINUOUS (by request). It runs whenever:
     · the merchant enabled autoplay
     · the band is on screen and the tab is visible
     · KEYBOARD focus is not inside the band — checked with :focus-visible, so
       a mouse click on a dot (which also focuses it) does not park the clock;
       a Tab into the dots pauses it until focus leaves
   Nothing stops it for good: a dot click, an arrow key or a block selected in
   the theme editor jumps to that step and restarts the clock from there.
   No hover pause — a resting pointer must not look like a broken rotation.
   Reduced motion is honoured in CSS (instant swaps, no glide, no blur), not by
   withholding the rotation: the steps are content, the travel is decoration.

   Global guard __shRE. Verified free: the repo uses __shLC, __shPD, __shRS,
   __shSP, __shSM and __shTM. ES5 throughout, like every sh-*.js here.
   =========================================================================== */
(function () {
  'use strict';

  if (window.__shRE) return;
  window.__shRE = true;

  var instances = [];
  var docBound = false;

  /* True only for focus a keyboard user can see. Engines without
     :focus-visible throw on matches(); treat that as "not keyboard". */
  function keyboardFocus(el) {
    try { return !!(el && el.matches && el.matches(':focus-visible')); }
    catch (err) { return false; }
  }

  /* ---- state -> DOM -------------------------------------------------------- */

  function go(I, k) {
    var c, s, d, off, active;
    I.k = ((k % I.n) + I.n) % I.n;

    for (c = 0; c < I.n; c++) {
      off = ((c - I.k) % I.n + I.n) % I.n;
      if (off > I.n / 2) off -= I.n;              /* 0, 1, 2, -2, -1 — same as the Liquid */
      I.cards[c].setAttribute('data-pos', off);
    }
    for (s = 0; s < I.steps.length; s++) {
      active = s === I.k;
      I.steps[s].classList.remove('is-entering');
      I.steps[s].classList.toggle('is-active', active);
      if (active) I.steps[s].classList.add('is-entering');
    }
    for (d = 0; d < I.dots.length; d++) {
      active = d === I.k;
      I.dots[d].classList.toggle('is-active', active);
      if (active) I.dots[d].setAttribute('aria-current', 'true');
      else I.dots[d].removeAttribute('aria-current');
    }
  }

  function running(I) {
    return I.wanted && I.visible && !I.focused && !document.hidden;
  }

  function stop(I) {
    if (I.timer) { clearInterval(I.timer); I.timer = null; }
  }

  /* Single decision point: every input flips a flag and calls this. */
  function sync(I) {
    var want = running(I);
    if (want && !I.timer) {
      I.timer = setInterval(function () { go(I, I.k + 1); }, I.interval);
    } else if (!want) {
      stop(I);
    }
    /* Live region: silent while it rotates on its own so a timer never
       interrupts a screen reader; polite only when it is not rotating. */
    if (I.live) I.live.setAttribute('aria-live', I.wanted ? 'off' : 'polite');
  }

  /* Jump to a step and restart the clock from it — rotation carries on. */
  function pick(I, k) {
    if (k !== I.k) go(I, k);
    stop(I);
    sync(I);
  }

  /* ---- instance ------------------------------------------------------------ */

  function on(I, el, ev, fn, opts) {
    el.addEventListener(ev, fn, opts || false);
    I.handlers.push([el, ev, fn, opts || false]);
  }

  function init(root) {
    var I = {
      root: root, k: 0, timer: null, io: null, handlers: [],
      focused: false, visible: false
    };
    var i;

    I.cards  = root.querySelectorAll('.sh-energize__card');
    I.steps  = root.querySelectorAll('.sh-energize__step');
    I.dots   = root.querySelectorAll('.sh-energize__dot');
    I.dotsWrap = root.querySelector('.sh-energize__dots');
    I.live   = root.querySelector('.sh-energize__steps');
    I.n = I.cards.length;
    if (!I.n) return null;

    I.interval = parseInt(root.getAttribute('data-interval'), 10) || 4000;
    if (I.interval < 1000) I.interval = 1000;
    I.wanted = root.getAttribute('data-autoplay') === 'true' && I.n > 1;

    for (i = 0; i < I.dots.length; i++) {
      on(I, I.dots[i], 'click', (function (idx) {
        return function () { pick(I, idx); };
      })(i));
    }
    /* Arrow keys on the dots move focus AND select. Each dot is tabbable; five
       buttons do not need a roving tabindex. */
    if (I.dotsWrap) {
      on(I, I.dotsWrap, 'keydown', function (e) {
        var key = e.key, cur = -1, next, j;
        for (j = 0; j < I.dots.length; j++) if (I.dots[j] === document.activeElement) cur = j;
        if (cur < 0) return;
        if (key === 'ArrowRight' || key === 'Right')    next = (cur + 1) % I.n;
        else if (key === 'ArrowLeft' || key === 'Left') next = (cur - 1 + I.n) % I.n;
        else if (key === 'Home')                        next = 0;
        else if (key === 'End')                         next = I.n - 1;
        else return;
        e.preventDefault();
        I.dots[next].focus();
        pick(I, next);
      });
    }

    on(I, root, 'focusin', function (e) {
      I.focused = keyboardFocus(e.target);
      sync(I);
    }, { passive: true });
    on(I, root, 'focusout', function (e) {
      /* Focus moving between two dots is not a departure. */
      if (e.relatedTarget && root.contains(e.relatedTarget)) return;
      I.focused = false;
      sync(I);
    }, { passive: true });

    if (window.IntersectionObserver) {
      I.io = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) I.visible = entries[e].isIntersecting;
        sync(I);
      }, { threshold: 0, rootMargin: '80px' });
      I.io.observe(root);
    } else {
      I.visible = true;                            /* no observer: run rather than never */
    }

    sync(I);
    return I;
  }

  function destroy(I) {
    stop(I);
    if (I.io) I.io.disconnect();
    for (var h = 0; h < I.handlers.length; h++) {
      I.handlers[h][0].removeEventListener(I.handlers[h][1], I.handlers[h][2], I.handlers[h][3]);
    }
  }

  /* ---- document-level, bound once ------------------------------------------ */

  function onVisibility() {
    for (var i = 0; i < instances.length; i++) sync(instances[i]);
  }

  /* Theme editor: selecting a step block brings its card to the front so the
     merchant is looking at what they are editing; rotation carries on. */
  function onBlockSelect(e) {
    var t = e.target, i, j, I;
    for (i = 0; i < instances.length; i++) {
      I = instances[i];
      if (!I.root.contains(t)) continue;
      for (j = 0; j < I.n; j++) {
        if (I.cards[j] === t || I.cards[j].contains(t)) { pick(I, j); return; }
      }
    }
  }

  function bindDocument() {
    if (docBound) return;
    docBound = true;
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('shopify:block:select', onBlockSelect);
  }

  /* ---- boot ------------------------------------------------------------------ */

  function boot() {
    var i, found, I;
    for (i = instances.length - 1; i >= 0; i--) {
      if (!document.contains(instances[i].root)) { destroy(instances[i]); instances.splice(i, 1); }
    }
    found = document.querySelectorAll('.sh-energize');
    for (i = 0; i < found.length; i++) {
      if (found[i].getAttribute('data-rz-done')) continue;
      found[i].setAttribute('data-rz-done', '1');
      I = init(found[i]);
      if (I) instances.push(I);
    }
    if (instances.length) bindDocument();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('shopify:section:load', boot);
  document.addEventListener('shopify:section:unload', boot);
})();
