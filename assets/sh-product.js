/* ============================================================
   SHUDHI — PRODUCT PAGE (assets/sh-product.js)
   Pairs with sections/sh-product.liquid.

   What this file is NOT responsible for — the section works without it:
   - Adding to cart. The section renders a real form[action^="/cart/add"];
     assets/ajax-cart.js.liquid's delegated submit handler owns the POST,
     the drawer, the count and the 'cart:updated' event.
   - Button busy states. assets/hov-cart-checkout.js converts the submit
     button and drives data-state="loading|success" itself.
   - Initial render. Every price, badge, caption and the checked radio are
     server-rendered. Losing this file costs pack SWITCHING, the countdown,
     the qty stepper, thumbnail swaps and the mobile sticky bar — the page
     still sells the default pack.

   This file's one real job is the state transition: checked radio ->
   hidden [name="id"] + price row + savings row + availability + sticky bar
   + gallery + URL. Everything else here is small conveniences around it.

   House conventions: IIFE, ES5-friendly, __shPD single-execution guard,
   boot on readyState, re-boot on shopify:section:load with a
   document.contains() sweep, per-root data-sh-init idempotency,
   matchMedia (never innerWidth), reduced-motion respected.
   ============================================================ */
(function () {
  'use strict';

  if (window.__shPD) return;
  window.__shPD = true;

  var REDUCED = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* one cleanup registry so a theme-editor section reload never leaks a
     ticking interval or a dangling observer */
  var instances = [];

  function sweep() {
    instances = instances.filter(function (inst) {
      if (document.contains(inst.root)) return true;
      inst.destroy();
      return false;
    });
  }

  /* ---------------------------------------------------------- money */

  function formatMoney(cents, format) {
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      return window.Shopify.formatMoney(cents, format);
    }
    /* fallback: the two placeholders this store's formats actually use */
    var value = (cents / 100).toFixed(2).split('.');
    value[0] = value[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (format || '{{amount}}').replace(/\{\{\s*\w+\s*\}\}/, value.join('.'));
  }

  /* ---------------------------------------------------------- boot */

  function initRoot(root) {
    if (root.hasAttribute('data-sh-init')) return;
    root.setAttribute('data-sh-init', '1');

    var moneyFormat = root.getAttribute('data-sh-money') || '{{amount}}';
    var moneyCurrencyFormat = root.getAttribute('data-sh-money-currency') || moneyFormat;

    /* variant data — one JSON island, keyed by id */
    var variants = {};
    var dataEl = root.querySelector('[data-sh-variants]');
    if (dataEl) {
      try {
        JSON.parse(dataEl.textContent).forEach(function (v) {
          variants[String(v.id)] = v;
        });
      } catch (e) { /* malformed JSON: switching degrades, default still sells */ }
    }

    var form = root.querySelector('[data-sh-form]') || root.querySelector('form[action*="/cart/add"]');
    var idInput = root.querySelector('[data-sh-id]');
    var priceEl = root.querySelector('[data-sh-price]');
    var savingEl = root.querySelector('[data-sh-saving]');
    var savingAmountEl = root.querySelector('[data-sh-saving-amount]');
    var dotEl = root.querySelector('[data-sh-dot]');
    var availSrEl = root.querySelector('[data-sh-avail-sr]');
    var atcBtn = root.querySelector('[data-sh-atc]');
    var stickyBar = root.querySelector('[data-sh-sticky]');
    var stickyTitle = root.querySelector('[data-sh-sticky-title]');
    var stickyAmt = root.querySelector('[data-sh-sticky-amt]');
    var stickyAtc = root.querySelector('[data-sh-sticky-atc]');

    var cleanups = [];

    /* ------------------------------------------------ ATC label
       hov-cart-checkout.js rewrites the button into three spans; after that,
       the label lives in .hov-cart__btn-default. Before it (or if it never
       runs), the button's own text is the label. */
    function setAtcLabel(btn, text) {
      if (!btn) return;
      var inner = btn.querySelector('.hov-cart__btn-default');
      if (!inner) {
        btn.textContent = text;
        return;
      }
      /* the converted span is <svg> + a text node: replace only the text so
         the bag icon the conversion drew survives the update */
      var nodes = inner.childNodes;
      var textNode = null;
      for (var i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].nodeType === 3 && nodes[i].nodeValue.trim()) {
          textNode = nodes[i];
          break;
        }
      }
      if (textNode) {
        textNode.nodeValue = ' ' + text;
      } else {
        inner.appendChild(document.createTextNode(' ' + text));
      }
    }

    /* ------------------------------------------------ gallery */

    function activateMedia(mediaId) {
      if (!mediaId) return;
      var slide = root.querySelector('.sh-pdp__slide[data-media-id="' + mediaId + '"]');
      if (!slide) return;
      var slides = root.querySelectorAll('.sh-pdp__slide');
      for (var i = 0; i < slides.length; i++) slides[i].classList.remove('is-active');
      slide.classList.add('is-active');
      var thumbs = root.querySelectorAll('.sh-pdp__thumb');
      for (var j = 0; j < thumbs.length; j++) {
        if (thumbs[j].getAttribute('data-media-id') === String(mediaId)) {
          thumbs[j].setAttribute('aria-current', 'true');
        } else {
          thumbs[j].removeAttribute('aria-current');
        }
      }
    }

    root.addEventListener('click', function (evt) {
      var thumb = evt.target.closest ? evt.target.closest('.sh-pdp__thumb') : null;
      if (!thumb || !root.contains(thumb)) return;
      activateMedia(thumb.getAttribute('data-media-id'));
    });

    /* ------------------------------------------------ variant switching */

    function setVariant(id, mediaId) {
      var v = variants[String(id)];
      if (!v) return;

      if (idInput) idInput.value = v.id;

      if (priceEl) priceEl.textContent = formatMoney(v.price, moneyCurrencyFormat);

      var saving = (v.compare_at_price && v.compare_at_price > v.price)
        ? v.compare_at_price - v.price
        : 0;
      if (savingEl) {
        savingEl.classList.toggle('is-hidden', saving === 0);
        if (saving > 0 && savingAmountEl) {
          savingAmountEl.textContent = formatMoney(saving, moneyFormat);
        }
      }

      if (dotEl) dotEl.classList.toggle('is-out', !v.available);
      if (availSrEl) availSrEl.textContent = v.available ? 'In stock' : 'Sold out';

      if (atcBtn) {
        atcBtn.disabled = !v.available;
        setAtcLabel(atcBtn, v.available ? 'Add to cart' : 'Sold out');
      }
      if (stickyAtc) {
        stickyAtc.disabled = !v.available;
        stickyAtc.textContent = v.available ? 'Add to cart' : 'Sold out';
      }
      if (stickyTitle) stickyTitle.textContent = v.title;
      if (stickyAmt) stickyAmt.textContent = formatMoney(v.price, moneyFormat);

      activateMedia(mediaId);

      /* shareable URLs; guarded — the theme editor sandbox can refuse this */
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', v.id);
        window.history.replaceState({}, '', url.toString());
      } catch (e) { /* non-fatal */ }
    }

    root.addEventListener('change', function (evt) {
      var input = evt.target;
      if (!input.classList || !input.classList.contains('sh-pdp__pack-input')) return;
      if (!input.checked) return;
      setVariant(
        input.getAttribute('data-variant-id'),
        input.getAttribute('data-media-id')
      );
    });

    /* ------------------------------------------------ quantity stepper */

    var qtyInput = root.querySelector('[data-sh-qty-input]');

    function clampQty() {
      if (!qtyInput) return 1;
      var n = parseInt(qtyInput.value, 10);
      if (isNaN(n) || n < 1) n = 1;
      qtyInput.value = n;
      return n;
    }

    root.addEventListener('click', function (evt) {
      var btn = evt.target.closest ? evt.target.closest('[data-sh-qty]') : null;
      if (!btn || !root.contains(btn) || !qtyInput) return;
      var step = parseInt(btn.getAttribute('data-sh-qty'), 10) || 0;
      qtyInput.value = Math.max(1, clampQty() + step);
    });

    if (qtyInput) qtyInput.addEventListener('change', clampQty);

    /* ------------------------------------------------ countdown */

    var timer = root.querySelector('[data-sh-timer]');
    if (timer) {
      var digitsEl = timer.querySelector('[data-sh-timer-digits]');
      var srEl = timer.querySelector('[data-sh-timer-sr]');
      /* 'YYYY-MM-DDTHH:MM' with no zone parses as the shopper's local time —
         that locality is the documented behaviour, not an accident */
      var parts = /^(d{4})-(d{2})-(d{2})T(d{1,2}):(d{2})/.exec(timer.getAttribute('data-sh-deadline') || '');
      /* built from parts, not Date.parse(): older WebKit reads an offset-less
         ISO string as UTC, and "shopper-local" is the documented contract */
      var deadlineMs = parts
        ? new Date(+parts[1], +parts[2] - 1, +parts[3], +parts[4], +parts[5], 0).getTime()
        : NaN;

      if (!isNaN(deadlineMs) && deadlineMs > Date.now()) {
        var pad = function (n) { return n < 10 ? '0' + n : String(n); };
        var lastSr = 0;

        var segs = [];
        var shape = '';
        /* the span structure is built once per shape (with/without a days
           segment); every later tick only touches text nodes, so the
           document-wide MutationObserver in hov-cart-checkout.js is not
           re-triggered once a second */
        var build = function (count) {
          if (!digitsEl) return;
          digitsEl.textContent = '';
          segs = [];
          for (var k = 0; k < count; k++) {
            if (k) {
              var c = document.createElement('span');
              c.className = 'sh-pdp__timer-colon';
              c.textContent = ':';
              digitsEl.appendChild(c);
            }
            var sEl = document.createElement('span');
            sEl.className = 'sh-pdp__timer-seg';
            sEl.appendChild(document.createTextNode(''));
            digitsEl.appendChild(sEl);
            segs.push(sEl.firstChild);
          }
        };
        var write = function (values) {
          for (var k = 0; k < values.length; k++) {
            if (segs[k] && segs[k].nodeValue !== values[k]) segs[k].nodeValue = values[k];
          }
        };

        var intervalId = 0;

        var tick = function () {
          var left = deadlineMs - Date.now();
          if (left <= 0) {
            /* over means gone — never a frozen 00:00 card */
            clearInterval(intervalId);
            timer.hidden = true;
            return;
          }
          var totalSec = Math.floor(left / 1000);
          var days = Math.floor(totalSec / 86400);
          var hours = Math.floor((totalSec % 86400) / 3600);
          var mins = Math.floor((totalSec % 3600) / 60);
          var secs = totalSec % 60;

          var nextShape = days > 0 ? 'd' : 's';
          if (nextShape !== shape) {
            shape = nextShape;
            build(3);
          }
          write(days > 0
            ? [days + 'd', pad(hours), pad(mins)]
            : [pad(hours), pad(mins), pad(secs)]);
          /* once a minute is plenty for the live region */
          if (srEl && Date.now() - lastSr > 60000) {
            lastSr = Date.now();
            srEl.textContent = 'Offer ends in '
              + (days > 0 ? days + ' days, ' : '')
              + hours + ' hours and ' + mins + ' minutes';
          }
        };

        tick();
        timer.hidden = false;
        intervalId = setInterval(tick, 1000);
        cleanups.push(function () { clearInterval(intervalId); });
      }
      /* invalid or past deadline: the card simply stays [hidden] */
    }

    /* ------------------------------------------------ mobile sticky bar */

    var buyRow = root.querySelector('[data-sh-buyrow]');
    if (stickyBar && buyRow) {
      var mqMobile = window.matchMedia('(max-width: 989px)');
      var hideTimeout = 0;
      var shown = false;
      var ticking = false;

      var showBar = function () {
        if (shown) return;
        shown = true;
        clearTimeout(hideTimeout);
        /* the floating WhatsApp / chat bubbles read this to lift clear of the bar */
        document.documentElement.classList.add('sh-pdp-sticky-up');
        stickyBar.hidden = false;
        stickyBar.setAttribute('aria-hidden', 'false');
        /* unhide first, slide on the next frame so the transition runs */
        if (REDUCED.matches) {
          stickyBar.classList.add('is-up');
        } else {
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { stickyBar.classList.add('is-up'); });
          });
        }
      };

      var hideBar = function () {
        if (!shown) return;
        shown = false;
        document.documentElement.classList.remove('sh-pdp-sticky-up');
        stickyBar.classList.remove('is-up');
        stickyBar.setAttribute('aria-hidden', 'true');
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(function () { stickyBar.hidden = true; },
          REDUCED.matches ? 0 : 320);
      };

      /* A position check on scroll, not an IntersectionObserver: an observer
         only reports TRANSITIONS, so an anchor jump or a restored scroll
         position that lands past the buy row without it ever entering the
         viewport produces no event and the bar never appears. One
         getBoundingClientRect per coalesced frame is the whole cost. */
      var evaluateBar = function () {
        ticking = false;
        var passed = buyRow.getBoundingClientRect().bottom < 0;
        if (passed && mqMobile.matches) {
          showBar();
        } else {
          hideBar();
        }
      };

      var onScroll = function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(evaluateBar);
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      evaluateBar();
      cleanups.push(function () {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        document.documentElement.classList.remove('sh-pdp-sticky-up');
        clearTimeout(hideTimeout);
      });

      if (stickyAtc && form && atcBtn) {
        stickyAtc.addEventListener('click', function () {
          /* a synthetic click on the REAL submit button, not requestSubmit():
             hov-cart-checkout.js enters its loading state from the click
             event and only flips to success from there, and ajax-cart's
             delegated submit handler runs either way. One POST path, one
             button showing the busy state. */
          if (atcBtn.disabled || atcBtn.hasAttribute('data-state')) return;
          atcBtn.click();
        });
      }
    }

    /* ------------------------------------------------ registry */

    instances.push({
      root: root,
      destroy: function () {
        cleanups.forEach(function (fn) {
          try { fn(); } catch (e) { /* never let one cleanup block the rest */ }
        });
      }
    });
  }

  function boot() {
    sweep();
    var roots = document.querySelectorAll('[data-sh-pdp]');
    for (var i = 0; i < roots.length; i++) initRoot(roots[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', boot);
  document.addEventListener('shopify:section:unload', function (evt) {
    var gone = evt && evt.target;
    instances = instances.filter(function (inst) {
      if (gone && gone.contains && gone.contains(inst.root)) {
        inst.destroy();
        return false;
      }
      return true;
    });
  });
})();
