/* ============================================================
   SHUDHI — Customer Reviews (sections/sh-reviews.liquid)

   Two jobs, and deliberately no third: collapse the review list to the first
   N cards behind a Load more button, and drive the write-a-review dialog.

   The star picker is pure CSS (`:checked ~ label` over a row-reverse row) and
   the scroll reveal + count-up are the site-wide ones in shudhi-home.js, so
   neither needs a line here.

   House conventions: IIFE, ES5-friendly, __shCR single-execution guard,
   boot on readyState, re-boot on shopify:section:load with a
   document.contains() sweep, per-root data-sh-init idempotency.

   THE LIST FAILS OPEN. Liquid renders every review visible and this file is
   what hides the tail — so if the script is blocked, deferred or errors, the
   page shows all of them rather than none. Never move the collapsing into
   Liquid; that would hide reviews from crawlers and from anyone whose JS
   never arrives.
   ============================================================ */
(function () {
  'use strict';

  if (window.__shCR) return;
  window.__shCR = true;

  var instances = [];

  function sweep() {
    instances = instances.filter(function (inst) {
      if (document.contains(inst.root)) return true;
      inst.destroy();
      return false;
    });
  }

  /* ---------------------------------------------------------- load more */

  function initList(root, R) {
    var list = root.querySelector('[data-rev-list]');
    var more = root.querySelector('[data-rev-more]');
    if (!list || !more) return;

    var cards = list.querySelectorAll('[data-rev-card]');
    var step = parseInt(root.getAttribute('data-rev-initial'), 10);
    if (!isFinite(step) || step < 1) step = 6;

    if (cards.length <= step) return;   /* nothing to collapse */

    var shown = step;
    var i;
    for (i = step; i < cards.length; i++) cards[i].hidden = true;
    more.hidden = false;

    R.onMore = function () {
      var next = Math.min(shown + step, cards.length);
      for (var k = shown; k < next; k++) cards[k].hidden = false;

      /* Move focus to the first card just revealed. Without this the button
         can disappear from under the keyboard and focus falls back to <body>,
         losing the reader's place entirely. */
      if (cards[shown]) {
        cards[shown].setAttribute('tabindex', '-1');
        cards[shown].focus();
      }

      shown = next;
      if (shown >= cards.length) more.hidden = true;
    };

    more.addEventListener('click', R.onMore);
    R.more = more;
  }

  /* ------------------------------------------------------------ dialog */

  function initDialog(root, R) {
    var dialog = root.querySelector('[data-rev-dialog]');
    if (!dialog) return;

    var opener = root.querySelector('[data-rev-open]');

    /* showModal gives the focus trap, the inert background and Esc for free.
       Browsers without it get the fallback below rather than a dead button. */
    var canModal = typeof dialog.showModal === 'function';

    R.open = function () {
      if (canModal) {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    };

    R.close = function () {
      if (canModal) {
        if (dialog.open) dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    };

    if (opener) {
      R.onOpen = function () { R.open(); };
      opener.addEventListener('click', R.onOpen);
    }

    /* Delegated so the close button inside the re-rendered form still works. */
    R.onDialogClick = function (evt) {
      var t = evt.target;
      if (!t || !t.closest) return;
      if (t.closest('[data-rev-close]')) { R.close(); return; }
      /* A click that lands on the <dialog> itself is the backdrop: the inner
         wrapper covers the whole padded box, so anything else has a closer
         ancestor than this. */
      if (t === dialog) R.close();
    };
    dialog.addEventListener('click', R.onDialogClick);

    /* Return focus to the trigger however the dialog was dismissed — close
       button, backdrop or Esc. `close` fires for all three. */
    R.onClose = function () {
      if (opener && document.contains(opener)) opener.focus();
    };
    dialog.addEventListener('close', R.onClose);

    /* Shopify redirects the contact form back to this page with
       ?contact_posted=true, so a fresh document is what carries the outcome.
       The section prints this marker on a success OR an error, and the dialog
       has to reopen itself or the customer never sees either. */
    if (dialog.querySelector('[data-rev-open-on-load]')) R.open();

    R.dialog = dialog;
    R.opener = opener;
  }

  /* -------------------------------------------------------------- boot */

  function initRoot(root) {
    if (root.hasAttribute('data-sh-init')) return;
    root.setAttribute('data-sh-init', '1');

    var R = { root: root };

    R.destroy = function () {
      if (R.more && R.onMore) R.more.removeEventListener('click', R.onMore);
      if (R.opener && R.onOpen) R.opener.removeEventListener('click', R.onOpen);
      if (R.dialog) {
        if (R.onDialogClick) R.dialog.removeEventListener('click', R.onDialogClick);
        if (R.onClose) R.dialog.removeEventListener('close', R.onClose);
      }
    };

    initList(root, R);
    initDialog(root, R);

    instances.push(R);
  }

  function boot() {
    sweep();
    var roots = document.querySelectorAll('[data-sh-rev]');
    for (var i = 0; i < roots.length; i++) initRoot(roots[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', boot);
  document.addEventListener('shopify:section:unload', function () { sweep(); });
})();
