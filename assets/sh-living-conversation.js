/* SHUDHI — Living Conversation
   Behaviour for snippets/sh-living-conversation.liquid. Markup renders inside
   sh-contact; styles are shudhi-home.css §24.

   Loaded from sections/sh-contact.liquid, not layout/theme.liquid, and only when
   the panel is actually rendered — see the comment at the end of that section.

   ES5 throughout, IIFE, no dependencies: the house style of assets/shudhi-home.js,
   which this file borrows three idioms from wholesale — the pxBound module flag,
   the data-count-done per-element flag, and parallax()'s strict READ-pass then
   WRITE-pass discipline.

   FIVE THINGS ARE LOAD-BEARING:

   1. ONE WRITER. Five sources compete for the panel: the ambient timer, field
      focus, typing progress, submission, and the server-rendered result. None of
      them touches the DOM. Each only RECORDS a claim at its priority, and a
      single resolve() picks the winner. That is the whole anti-flicker
      mechanism — without it a tab-through of six fields is six racing swaps.

   2. THE BASE STATE IS ALWAYS VISIBLE. §24 gives a split character opacity 1 and
      no transform; the enter/leave animations are `backwards`/`forwards` filled
      overlays on top of that. So a split that happens without an animation
      leaves readable text, never an empty box. Nothing in this file can gate the
      message behind motion.

   3. NOTHING IS FAKED. "Sending" is bound to the form's `submit` event, which
      fires only AFTER native constraint validation passes. "Sent" and "error"
      are printed by Liquid on the next page load from form.posted_successfully?
      — this file never decides that a message arrived.

   4. THE PANEL SWEEPS ITSELF. boot() re-runs on shopify:section:load. A
      re-rendered section leaves its old root detached but NOT its chained
      setTimeout, NOT its IntersectionObserver entry and NOT its rAF frame.
      counters() never needed this because a count-up ends by itself; this panel
      runs forever, so an unswept instance is a permanent leak that also keeps
      writing transforms to detached nodes.

   5. EVERY LOOKUP IS NULL-GUARDED. On the success and error renders Shopify
      replaces the fields with a confirmation, so the <form> exists but every
      input inside it does not. */

(function () {
  'use strict';

  /* Two sh-contact sections on one page emit two <script src> tags. The browser
     fetches once but EXECUTES twice. This is the outermost guard. */
  if (window.__shLC) return;
  window.__shLC = true;

  var panels = [];          /* live instances; module scope, like pxEls */
  var winBound = false;     /* window listeners bind once, ever; like pxBound */

  var mq = window.matchMedia;
  var STILL  = mq && mq.call(window, '(prefers-reduced-motion: reduce)').matches;
  /* matchMedia, not innerWidth: the engine resolves a media query against the
     viewport INCLUDING the scrollbar and innerWidth excludes it on desktop
     Windows and Linux. The two disagree by ~15px, which is exactly a band of
     widths where §24 has already stacked the panel under the form but this
     would still be running a cursor effect on it. Same call parallax() makes. */
  var WIDE   = mq && mq.call(window, '(min-width: 1025px)');
  var FINE   = mq && mq.call(window, '(hover: hover) and (pointer: fine)');
  var CURSOR = !STILL && !!WIDE && WIDE.matches && !!FINE && FINE.matches;

  var SWAP_TOTAL  = 880;    /* §24: leave ends 500ms, enter ends 860ms */
  var FOCUS_WAIT  = 120;    /* a fast tab-through lands only where you stop */
  var BLUR_WAIT   = 150;
  var INPUT_WAIT  = 220;
  var SEND_GUARD  = 12000;  /* the page is about to unload — but occasionally isn't */

  /* Typing ladder. RUNGS[n] is the length that ENTERS rung n; a rung is only
     released once the length falls HYST below it, so deleting a word at exactly
     40 characters cannot bounce the panel between two messages. */
  var RUNGS = [0, 1, 40, 160];
  var HYST  = 20;

  var FIELDS = {
    'contact[name]':         'name',
    'contact[email]':        'email',
    'contact[phone]':        'phone',
    'contact[order_number]': 'order',
    'contact[subject]':      'reason',
    'contact[body]':         'message'
  };

  /* ---------------------------------------------------------------
     Anime.js — detected, never required
     --------------------------------------------------------------- */
  /* No bundle ships with this theme: every effect here is CSS-native, which is
     smaller, runs on the compositor and cannot fail to load. This guard exists
     so that vendoring anime.umd.min.js later is additive rather than a rewrite.

     It probes for the v4 NAMED EXPORTS rather than truthiness, because v3
     exposed a callable anime() with no .animate and silently ignores v4's
     `ease` and `to` parameters — a truthiness check would pass, then animate
     nothing and log nothing. A === false is the settled "unavailable" state;
     A === null is "not yet asked". */
  var A = null;
  function anim() {
    if (A !== null) return A;
    var g = window.anime;
    A = (g && typeof g.animate === 'function' && typeof g.createTimeline === 'function') ? g : false;
    return A;
  }

  /* ---------------------------------------------------------------
     Character splitting
     --------------------------------------------------------------- */
  /* Two levels on purpose. A flat character split lets a line break INSIDE a
     word, which on an uppercase serif display line is instantly visible;
     .sh-lc__w is inline-block so it cannot. Each character carries --p, its 0->1
     position across the whole line, so CSS owns every timing constant and a
     6-character line and a 40-character line sweep in identical wall-clock time.

     One write, one fragment, one reflow. */
  function split(node, text) {
    var words = String(text).split(/\s+/);
    var frag = document.createDocumentFragment();
    var total = 0, i, j, w, c, k = 0;

    for (i = 0; i < words.length; i++) total += words[i].length;
    if (!total) { node.textContent = text; return; }

    for (i = 0; i < words.length; i++) {
      if (!words[i].length) continue;
      w = document.createElement('span');
      w.className = 'sh-lc__w';
      for (j = 0; j < words[i].length; j++) {
        c = document.createElement('span');
        c.className = 'sh-lc__c';
        c.style.setProperty('--p', total > 1 ? (k / (total - 1)).toFixed(4) : '0');
        c.appendChild(document.createTextNode(words[i].charAt(j)));
        w.appendChild(c);
        k++;
      }
      frag.appendChild(w);
      if (i < words.length - 1) frag.appendChild(document.createTextNode(' '));
    }
    node.textContent = '';
    node.appendChild(frag);
  }

  /* ---------------------------------------------------------------
     Claims and resolution — the single writer
     --------------------------------------------------------------- */
  function resolve(P) {
    if (P.dead) return;

    var prio = 0, c = null, i;
    for (i = 5; i >= 1; i--) { if (P.claims[i]) { prio = i; c = P.claims[i]; break; } }
    P.top = prio;
    /* Reset, not pause. Returning to ambient always gets a full dwell first, so
       a blur never triggers an instant rotation. */
    pumpAmbient(P);
    if (!c) return;

    /* The lock. While a swap is in flight resolve() records that another is due
       and returns; the swap's own completion timer fires one trailing resolve().
       Never a queue — the LATEST claim wins, so a burst of five focus changes
       during one swap produces exactly one more swap. */
    if (P.busy) { P.pending = true; return; }
    apply(P, c);
  }

  function apply(P, c) {
    P.root.setAttribute('data-lc-state', c.st);
    if (P.statusEl && c.s != null) P.statusEl.textContent = c.s;

    /* A status-only change — "sending" holds the statement and only quickens the
       dot. Swapping identical text would be a visible stutter for no reason. */
    if (c.t === P.shown) return;
    P.shown = c.t;

    /* Reduced motion runs the same state machine and only swaps how a change is
       PRESENTED. Content is never gated by motion. */
    if (STILL || !P.stage || !P.line) {
      if (P.line) P.line.textContent = c.t;
      return;
    }

    var old = P.line;
    var next = document.createElement('span');
    next.className = 'sh-lc__line sh-lc__line--enter';
    next.setAttribute('data-lc-line', '');
    split(next, c.t);
    P.stage.appendChild(next);
    old.className = 'sh-lc__line sh-lc__line--leave';
    P.line = next;

    P.busy = true;
    clearTimeout(P.swapT);
    P.swapT = setTimeout(function () {
      P.swapT = 0;
      if (old.parentNode) old.parentNode.removeChild(old);
      P.busy = false;
      if (P.pending) { P.pending = false; resolve(P); }
    }, SWAP_TOTAL);
  }

  /* ---------------------------------------------------------------
     Ambient rotation
     --------------------------------------------------------------- */
  /* A chained setTimeout, never setInterval: an interval accumulates drift and
     queues ticks while the tab is hidden, so returning to a backgrounded tab
     would fire a burst of swaps at once. */
  function pumpAmbient(P) {
    clearTimeout(P.ambientT);
    P.ambientT = 0;
    if (P.dead || P.frozen) return;
    if (P.list.length < 2) return;                 /* nothing to rotate to */
    if (P.top > 1) return;                         /* a higher claim owns the panel */
    if (!P.onscreen) return;
    if (document.visibilityState === 'hidden') return;
    P.ambientT = setTimeout(function () { P.ambientT = 0; tick(P); }, P.interval);
  }

  function tick(P) {
    if (P.dead) return;
    var n = P.list.length, guard = 0, txt;
    /* Sequential, because the merchant's order means something. Skips an entry
       equal to what is showing so a duplicated line cannot produce a swap that
       appears to do nothing. */
    do {
      P.i = (P.i + 1) % n;
      txt = P.list[P.i];
      guard++;
    } while (txt === P.shown && guard < n);

    P.claims[1] = { t: txt, s: P.txt.idle, st: 'idle' };
    resolve(P);
  }

  /* ---------------------------------------------------------------
     Field and typing states
     --------------------------------------------------------------- */
  function setField(P, key) {
    var t = P.txt[key];
    /* Blank means "keep the rotating statements running for this field" — the
       same "blank content, no element" rule the rest of the section follows. */
    P.claims[2] = t ? { t: t, s: P.txt.idle, st: 'idle' } : null;
  }

  function rungFor(P, len) {
    if (P.sticky) return 3;
    var r = P.rung;
    while (r < 3 && len >= RUNGS[r + 1]) r++;
    while (r > 0 && len < RUNGS[r] - HYST) r--;
    /* The top rung is sticky for the rest of the field session. "Thank you for
       sharing" should read as an arrival, not a state you can fall out of by
       deleting a sentence. Released on the form-wide blur, with everything else. */
    if (r >= 3) P.sticky = true;
    return r;
  }

  function setTyping(P, len) {
    var r = rungFor(P, len);
    P.rung = r;
    P.claims[3] = r ? { t: P.txt['typing' + r], s: P.txt.typing, st: 'typing' } : null;
  }

  /* ---------------------------------------------------------------
     Entrance
     --------------------------------------------------------------- */
  function enter(P) {
    if (P.entered || P.dead) return;
    P.entered = true;
    P.root.classList.add('is-drawn');            /* draws the arcs; see §24 */

    if (!STILL && P.line && P.line.textContent) {
      split(P.line, P.line.textContent);
      P.root.classList.add('is-split');
      /* Both classes land in the same task, so the characters' animation begins
         on their first style resolution. --enter can stay on the element for
         good: §24 fills it `backwards`, so once the animation ends the character
         reverts to the visible base state. There is no class to remove, and
         therefore no window in which a failure could leave the line hidden. */
      P.line.className = 'sh-lc__line sh-lc__line--enter';
    }
  }

  /* ---------------------------------------------------------------
     Visibility gate — one class, three consumers
     --------------------------------------------------------------- */
  /* Deliberately a SECOND observer, not a reuse of shudhi-home.js:279. That one
     unobserves on first hit, so it can only ever answer "has this been seen
     once". A running gate needs "is this visible NOW", which is a different
     question. It never touches .is-in and never duplicates the reveal system. */
  function setOnscreen(P, on) {
    if (P.dead || P.onscreen === on) return;
    P.onscreen = on;
    P.root.classList.toggle('is-onscreen', on);
    if (on) { enter(P); pumpAmbient(P); startLoop(); }
    else { pumpAmbient(P); zero(P); }
  }

  /* ---------------------------------------------------------------
     Cursor depth
     --------------------------------------------------------------- */
  var rafId = 0, lastFrame = 0, lastMove = -1e9;
  var mx = 0, my = 0, hasPointer = false;

  function onMove(e) {
    /* Stores coordinates and NOTHING else — no reads, no writes, no class
       toggles. The rAF loop below is the only writer. */
    mx = e.clientX; my = e.clientY;
    hasPointer = true;
    lastMove = e.timeStamp || Date.now();
    startLoop();
  }

  function startLoop() {
    if (!CURSOR || rafId) return;
    lastFrame = 0;
    rafId = requestAnimationFrame(frame);
  }

  function zero(P) {
    for (var i = 0; i < P.depths.length; i++) P.depths[i].el.style.transform = '';
    P.x = 0; P.y = 0;
  }

  function frame(now) {
    rafId = 0;
    if (!lastFrame) lastFrame = now - 16.667;
    var dt = now - lastFrame;
    if (dt > 100) dt = 100;                 /* a backgrounded tab must not jump */
    lastFrame = now;
    /* Critically-damped lerp, frame-rate normalised: without the exponent a
       120Hz display would converge twice as fast as a 60Hz one. */
    var k = 1 - Math.pow(1 - 0.12, dt / 16.667);

    var live = [], i, j, P;
    for (i = 0; i < panels.length; i++) {
      P = panels[i];
      if (!P.dead && P.onscreen && P.depths.length) live.push(P);
    }
    if (!live.length) return;

    /* READ pass, then WRITE pass. Interleaving them forces a layout recalc per
       element — the rule scrollState() and parallax() both follow. */
    for (i = 0; i < live.length; i++) live[i].box = live[i].root.getBoundingClientRect();

    var settling = false;
    for (i = 0; i < live.length; i++) {
      P = live[i];
      var b = P.box, tx = 0, ty = 0;
      if (hasPointer && b.width && b.height) {
        tx = (mx - (b.left + b.width / 2)) / (b.width / 2);
        ty = (my - (b.top + b.height / 2)) / (b.height / 2);
        if (tx < -1) tx = -1; else if (tx > 1) tx = 1;
        if (ty < -1) ty = -1; else if (ty > 1) ty = 1;
      }
      P.x += (tx - P.x) * k;
      P.y += (ty - P.y) * k;
      if (Math.abs(tx - P.x) > 0.004 || Math.abs(ty - P.y) > 0.004) settling = true;

      for (j = 0; j < P.depths.length; j++) {
        var d = P.depths[j];
        d.el.style.transform =
          'translate3d(' + (P.x * d.d).toFixed(2) + 'px,' + (P.y * d.d).toFixed(2) + 'px,0)';
      }
    }

    /* The loop self-stops: no pointer movement for 1200ms AND everything settled
       means there is nothing left to draw. The next mousemove restarts it, so a
       frame is never permanently scheduled. */
    if (settling || (now - lastMove) < 1200) rafId = requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------
     Init / destroy
     --------------------------------------------------------------- */
  function init(root) {
    var P = {
      root: root, dead: false, entered: false, onscreen: false,
      busy: false, pending: false, frozen: false,
      claims: [null, null, null, null, null, null],
      top: 0, i: 0, rung: 0, sticky: false,
      shown: '', x: 0, y: 0,
      ambientT: 0, swapT: 0, focusT: 0, blurT: 0, inputT: 0, sendT: 0,
      io: null, depths: [], list: []
    };

    var d = root.getAttribute.bind(root);
    P.txt = {
      name:    d('data-lc-name')    || '',
      email:   d('data-lc-email')   || '',
      phone:   d('data-lc-phone')   || '',
      order:   d('data-lc-order')   || '',
      reason:  d('data-lc-reason')  || '',
      message: d('data-lc-message') || '',
      typing1: d('data-lc-typing')  || '',
      typing2: d('data-lc-typing2') || '',
      typing3: d('data-lc-typing3') || '',
      idle:    d('data-lc-status-idle')    || '',
      typing:  d('data-lc-status-typing')  || '',
      sending: d('data-lc-status-sending') || ''
    };
    P.interval = parseInt(d('data-lc-interval'), 10) || 7000;

    P.stage    = root.querySelector('[data-lc-stage]');
    P.line     = root.querySelector('[data-lc-line]');
    P.statusEl = root.querySelector('[data-lc-status]');
    P.shown    = P.line ? P.line.textContent : '';

    var srcs = root.querySelectorAll('[data-lc-src]');
    for (var i = 0; i < srcs.length; i++) {
      var t = srcs[i].textContent;
      if (t) P.list.push(t);
      if (t === P.shown) P.i = P.list.length - 1;   /* rotate on from what is shown */
    }

    var deps = root.querySelectorAll('[data-lc-depth]');
    for (i = 0; i < deps.length; i++) {
      P.depths.push({ el: deps[i], d: parseFloat(deps[i].getAttribute('data-lc-depth')) || 0 });
    }

    /* The server-rendered result outranks everything the browser can observe and
       is never cleared: a panel that has been told the message arrived should
       settle there, not resume rotating brand statements at it. */
    var st = d('data-lc-state');
    if (st === 'sent' || st === 'error') {
      P.frozen = true;
      P.claims[4] = { t: P.shown, s: P.statusEl ? P.statusEl.textContent : '', st: st };
      P.top = 4;
    }

    bindForm(P);

    if (window.IntersectionObserver) {
      P.io = new IntersectionObserver(function (entries) {
        for (var n = 0; n < entries.length; n++) setOnscreen(P, entries[n].isIntersecting);
      }, { threshold: 0.14 });
      P.io.observe(root);
    } else {
      /* No observer means no gate. Everything must simply run, or the arcs never
         draw and the statement never rotates. */
      setOnscreen(P, true);
    }
    return P;
  }

  function bindForm(P) {
    /* Bound to the FORM, which lives inside the section and is therefore
       replaced wholesale on a re-render — so these die with it and can never
       stack across boots. Only the three window-level listeners need a flag. */
    /* Walked by hand rather than with closest(). Not a compatibility worry — the
       theme already requires IntersectionObserver — but this file must degrade
       to "no form-awareness" only when there is genuinely no form, never because
       a lookup quietly returned null. Three lines, no branch to be wrong about. */
    var section = P.root.parentNode;
    while (section && section !== document && !(section.classList && section.classList.contains('sh-contact'))) {
      section = section.parentNode;
    }
    var form = section && section.querySelector ? section.querySelector('form.sh-form') : null;
    if (!form) return;
    P.form = form;

    var body = form.querySelector('[name="contact[body]"]');
    P.body = body || null;

    /* focus does not bubble; focusin does. */
    form.addEventListener('focusin', function (e) {
      var key = FIELDS[e.target && e.target.name];
      clearTimeout(P.blurT); P.blurT = 0;
      clearTimeout(P.focusT);
      if (!key) return;
      P.focusT = setTimeout(function () {
        P.focusT = 0;
        setField(P, key);
        if (key === 'message' && P.body) setTyping(P, P.body.value.length);
        resolve(P);
      }, FOCUS_WAIT);
    });

    form.addEventListener('focusout', function (e) {
      /* If focus is still inside the form, do NOTHING — not "wait and see".
         This removes the whole "flash of ambient while tabbing between two
         fields" bug class at the source instead of papering over it with a
         grace period long enough to hide it. relatedTarget is null when focus
         leaves the document entirely, which correctly falls through. */
      var to = e.relatedTarget;
      if (to && form.contains(to)) return;
      clearTimeout(P.focusT); P.focusT = 0;
      clearTimeout(P.blurT);
      P.blurT = setTimeout(function () {
        P.blurT = 0;
        P.rung = 0; P.sticky = false;
        P.claims[2] = null; P.claims[3] = null;
        resolve(P);
      }, BLUR_WAIT);
    });

    if (body) {
      body.addEventListener('input', function () {
        clearTimeout(P.inputT);
        P.inputT = setTimeout(function () {
          P.inputT = 0;
          setTyping(P, body.value.length);
          resolve(P);
        }, INPUT_WAIT);
      });
    }

    /* `submit`, never `click`. Native constraint validation runs BEFORE submit
       fires, so an invalid form never shows "sending"; a click handler would,
       and would also miss Enter-to-submit from inside a text field. This is the
       only thing in the file that reports on a submission, and it reports that
       one was ATTEMPTED — nothing here claims one succeeded. */
    form.addEventListener('submit', function () {
      P.claims[5] = { t: P.shown, s: P.txt.sending, st: 'sending' };
      resolve(P);
      clearTimeout(P.sendT);
      /* The page is about to unload. Occasionally it doesn't — a blocked
         navigation, a platform reCAPTCHA interstitial — and a panel stuck on
         "sending your message" for the rest of the session is worse than one
         that quietly returns to rest. */
      P.sendT = setTimeout(function () {
        P.sendT = 0;
        P.claims[5] = null;
        resolve(P);
      }, SEND_GUARD);
    });
  }

  function destroy(P) {
    clearTimeout(P.ambientT); clearTimeout(P.swapT); clearTimeout(P.focusT);
    clearTimeout(P.blurT);    clearTimeout(P.inputT); clearTimeout(P.sendT);
    if (P.io) { P.io.disconnect(); P.io = null; }
    P.dead = true;
  }

  /* ---------------------------------------------------------------
     Window listeners
     --------------------------------------------------------------- */
  function bindWindow() {
    if (CURSOR) window.addEventListener('mousemove', onMove, { passive: true });

    document.addEventListener('visibilitychange', function () {
      for (var i = 0; i < panels.length; i++) pumpAmbient(panels[i]);
    });

    /* A back-navigation restored from the bfcache resumes the exact DOM the user
       left — including a panel frozen on "sending your message" from a submit
       that has since completed. */
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      for (var i = 0; i < panels.length; i++) {
        var P = panels[i];
        clearTimeout(P.sendT); P.sendT = 0;
        P.claims[5] = null;
        resolve(P);
      }
    });
  }

  /* ---------------------------------------------------------------
     Boot
     --------------------------------------------------------------- */
  function boot() {
    /* Sweep FIRST. See note 4 at the top of this file. */
    for (var i = panels.length - 1; i >= 0; i--) {
      if (!document.contains(panels[i].root)) { destroy(panels[i]); panels.splice(i, 1); }
    }

    var els = document.querySelectorAll('.sh-contact .sh-lc');
    for (var j = 0; j < els.length; j++) {
      /* A genuinely re-rendered section brings a NEW element with no flag, so an
         editor edit still re-initialises. Exactly the data-count-done trade. */
      if (els[j].getAttribute('data-lc-done')) continue;
      els[j].setAttribute('data-lc-done', '1');
      panels.push(init(els[j]));
    }

    if (!winBound) { bindWindow(); winBound = true; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', boot);
  document.addEventListener('shopify:section:unload', boot);
})();
