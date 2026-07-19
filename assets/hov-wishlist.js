(function() {
  'use strict';

  let toastTimer = null;

  // ── LOGIN-STATE HELPERS (reads server-rendered HTML attribute — immune to JS timing and bfcache) ──
  function isCustomerLoggedIn() {
    return document.documentElement.dataset.customerLoggedIn === 'true';
  }
  function getCustomerId() {
    return document.documentElement.dataset.customerId || null;
  }

  function getStorageKey() {
    const cid = getCustomerId();
    return cid ? `hov_wishlist_${cid}` : 'hov_wishlist';
  }

  // ── STORAGE ──────────────────────────────────────────────
  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(getStorageKey())) || []; }
    catch { return []; }
  }
  function saveWishlist(list) {
    localStorage.setItem(getStorageKey(), JSON.stringify(list));
  }
  function isWishlisted(id) {
    return getWishlist().includes(String(id));
  }

  window.hovSyncHeartButtons = function(productId, isWishlisted) {
    const sid = String(productId);
    document.querySelectorAll(`.hov-wish__btn[data-product-id="${sid}"]`).forEach(btn => {
      if (isWishlisted) {
        btn.classList.add('is-wishlisted');
        btn.setAttribute('aria-pressed', 'true');
        const path = btn.querySelector('.hov-wish__icon-path');
        if (path) {
          path.setAttribute('fill', '#FF4D7A');
          path.setAttribute('stroke', '#FF4D7A');
        }
      } else {
        btn.classList.remove('is-wishlisted');
        btn.setAttribute('aria-pressed', 'false');
        const path = btn.querySelector('.hov-wish__icon-path');
        if (path) {
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', '#BBBBBB');
        }
        btn.style.removeProperty('--hov-star-angle');
      }
    });
  };

  window.hovSyncAllHeartStates = function() {
    const list = getWishlist();
    document.querySelectorAll('.hov-wish__btn').forEach(btn => {
      const id = String(btn.dataset.productId || '');
      if (!id) return;
      window.hovSyncHeartButtons(id, list.includes(id));
    });
  };

  function toggleWishlist(id, productData) {
    const list = getWishlist();
    const sid = String(id);
    const idx = list.indexOf(sid);
    const added = idx === -1;
    if (added) { list.push(sid); } else { list.splice(idx, 1); }
    saveWishlist(list);

    // Sync ALL matching buttons across the entire page
    setTimeout(() => window.hovSyncHeartButtons?.(sid, added), 0);

    // ── SIGNAL 1: CustomEvent (same page) ──
    document.dispatchEvent(new CustomEvent('hov:wishlist:changed', {
      detail: {
        productId: sid,
        added,
        product: productData || null,
        list: [...list]
      }
    }));

    // ── SIGNAL 2: BroadcastChannel (other tabs) ──
    try {
      const bc = new BroadcastChannel('hov_wishlist_channel');
      bc.postMessage({
        type: 'wishlist:changed',
        productId: sid,
        added,
        list: [...list]
      });
      bc.close();
    } catch(e) {}

    // ── SIGNAL 3: localStorage event fires automatically
    // (other tabs listening to 'storage' event will catch it)

    return added;
  }

  // ── NAVBAR COUNT ─────────────────────────────────────────
  function updateNavCount() {
    const count = getWishlist().length;
    const badges = document.querySelectorAll('.hov-wish__nav-count');
    badges.forEach(badge => {
      badge.style.display = count === 0 ? 'none' : 'flex';
      badge.textContent = count > 99 ? '99+' : count;
      if (count > 0) {
        badge.classList.remove('pop');
        void badge.offsetWidth;
        badge.classList.add('pop');
      }
    });
  }

  // ── TOAST ─────────────────────────────────────────────────
  function showToast(title, imgSrc, added) {
    const toast   = document.getElementById('hov-wish-toast');
    const toastTitle = document.getElementById('hov-wish-toast-title');
    const toastSub   = document.getElementById('hov-wish-toast-sub');
    const toastImg   = document.getElementById('hov-wish-toast-img');
    const toastClose = document.getElementById('hov-wish-toast-close');
    if (!toast) return;

    // Reset animation
    toast.classList.remove('show');
    void toast.offsetWidth;

    toastTitle.textContent = title || 'Product';
    toastSub.textContent   = added
      ? '❤️ Added to your wishlist'
      : 'Removed from wishlist';
    if (imgSrc) {
      toastImg.src = imgSrc;
      toastImg.style.display = 'block';
    } else {
      toastImg.style.display = 'none';
    }

    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);

    toastClose.onclick = () => {
      clearTimeout(toastTimer);
      toast.classList.remove('show');
    };
  }

  // ── SPARK PARTICLES ───────────────────────────────────────
  function fireSparks(btn) {
    const colors = ['#F7C548','#FFE49A','#FF4D7A','#FFA0B8','#FFFFFF'];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      spark.className = 'hov-wish__spark';
      const angle = (360 / count) * i + (Math.random() * 20 - 10);
      const dist  = 28 + Math.random() * 18;
      const rad   = angle * Math.PI / 180;
      spark.style.setProperty('--sx', `${Math.cos(rad)*dist}px`);
      spark.style.setProperty('--sy', `${Math.sin(rad)*dist}px`);
      spark.style.background = colors[i % colors.length];
      spark.style.top  = '50%';
      spark.style.left = '50%';
      spark.style.marginTop  = '-2.5px';
      spark.style.marginLeft = '-2.5px';
      btn.appendChild(spark);
      void spark.offsetWidth;
      spark.classList.add('fire');
      setTimeout(() => spark.remove(), 600);
    }
  }

  // ── BURST RING ────────────────────────────────────────────
  function fireRing(btn) {
    let ring = btn.querySelector('.hov-wish__ring');
    if (!ring) {
      ring = document.createElement('div');
      ring.className = 'hov-wish__ring';
      btn.appendChild(ring);
    }
    ring.classList.remove('burst');
    void ring.offsetWidth;
    ring.classList.add('burst');
    setTimeout(() => ring.classList.remove('burst'), 550);
  }

  // ── LOGIN GATE ────────────────────────────────────────────
  // If logged out: saves the pending action in sessionStorage + opens login modal.
  // After login Shopify redirects back; resumePendingWishlistAction fires the saved action.
  window.hovRequireLogin = function(productId, productData, callback) {
    if (isCustomerLoggedIn()) {
      callback();
      return;
    }
    try {
      sessionStorage.setItem('hov_pending_wishlist', JSON.stringify({
        productId: String(productId),
        productData: productData || {}
      }));
    } catch(e) {}
    const returnInput = document.getElementById('hov-login-return-to');
    if (returnInput) returnInput.value = window.location.pathname + window.location.search;
    document.querySelector('[data-login-trigger]')?.click();
  };

  function resumePendingWishlistAction() {
    if (!isCustomerLoggedIn()) return;
    let pending;
    try { pending = JSON.parse(sessionStorage.getItem('hov_pending_wishlist')); } catch(e) { return; }
    if (!pending?.productId) return;
    sessionStorage.removeItem('hov_pending_wishlist');

    const added = toggleWishlist(pending.productId, pending.productData || {});
    const btn = document.querySelector(`.hov-wish__btn[data-product-id="${CSS.escape(pending.productId)}"]`);
    if (btn) {
      btn.classList.toggle('is-wishlisted', added);
      btn.setAttribute('aria-pressed', String(added));
      if (added) { fireSparks(btn); fireRing(btn); }
    }
    showToast(pending.productData?.title || '', pending.productData?.image || '', added);
    updateNavCount();
  }

  // ── BUTTON INIT ───────────────────────────────────────────
  function initButtons() {
    document.querySelectorAll('.hov-wish__btn:not([data-hov-init])').forEach(btn => {
      btn.setAttribute('data-hov-init', '1');
      const id = btn.dataset.productId;
      if (!id) return;

      // Set initial state
      if (isWishlisted(id)) btn.classList.add('is-wishlisted');

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Collect product data from card DOM for instant render
        const card = btn.closest(
          '[class*="card"], [class*="product"], li, article'
        );
        const productData = {
          id: btn.dataset.productId,
          title: btn.dataset.productTitle || '',
          handle: btn.dataset.productHandle || '',
          image: card?.querySelector('img')?.src || '',
          price: card?.querySelector(
            '[class*="price"]:not([class*="compare"])'
          )?.textContent?.trim() || '',
          comparePrice: card?.querySelector(
            '[class*="compare"]'
          )?.textContent?.trim() || '',
          url: card?.querySelector('a[href*="/products/"]')?.href || ''
        };

        window.hovRequireLogin(btn.dataset.productId, productData, () => {
          const added = toggleWishlist(btn.dataset.productId, productData);
          btn.classList.toggle('is-wishlisted', added);
          btn.setAttribute('aria-pressed', String(added));
          if (added) { fireSparks(btn); fireRing(btn); }
          showToast(productData.title, productData.image, added);
          updateNavCount();
          if (navigator.vibrate) navigator.vibrate(added ? [30, 10, 20] : [15]);
        });
      });
    });
  }

  // ── INIT ─────────────────────────────────────────────────
  function init() {
    resumePendingWishlistAction();
    initButtons();
    updateNavCount();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

  // MutationObserver for dynamic content (infinite scroll, quick-view injection)
  if (window.MutationObserver) {
    new MutationObserver(initButtons)
      .observe(document.body, { childList: true, subtree: true });
  }

  // Bfcache guard: browser back/forward restores the page from cache without re-running scripts.
  // Re-sync heart states and resume any pending action so the page reflects current login state.
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      resumePendingWishlistAction();
      window.hovSyncAllHeartStates();
      updateNavCount();
    }
  });

  window.hovMigrateLegacyWishlist = function() {
    if (!isCustomerLoggedIn()) return;

    const MIGRATION_FLAG = 'hov_wishlist_migration_done';
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') return;

    const legacyKey = 'hov_wishlist';
    const legacyData = localStorage.getItem(legacyKey);
    const cid = getCustomerId();
    const newKey = `hov_wishlist_${cid}`;
    const existingData = localStorage.getItem(newKey);

    if (legacyData && !existingData) {
      try {
        const parsed = JSON.parse(legacyData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.setItem(newKey, legacyData);
        }
      } catch(e) {}
    }

    localStorage.removeItem(legacyKey);
    localStorage.setItem(MIGRATION_FLAG, 'true');
  };
})();
