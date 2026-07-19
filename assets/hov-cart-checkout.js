(function() {
  'use strict';

  // ── ANIMATION 1: ADD TO CART BUTTON STATES ──
  const BTN_SELECTORS = [
    '.btn-cart',
    '[name="add"]',
    '.product-form__submit',
    '.enj-add-to-cart-btn',
    '.engoj-btn-addtocart',
    '.add-to-cart-btn',
    '#ajax-add-to-cart'
  ];

  function convertButtons() {
    document.querySelectorAll(BTN_SELECTORS.join(',')).forEach(btn => {
      // Avoid modifying wishlists, checkouts, or already-initialized buttons
      if (
        btn.classList.contains('hov-wish__btn') ||
        btn.classList.contains('hov-cart__btn') ||
        btn.getAttribute('name') === 'checkout' ||
        btn.dataset.hovCartInit === '1'
      ) {
        return;
      }

      btn.dataset.hovCartInit = '1';
      btn.classList.add('hov-cart__btn');

      // Preserve original text (ignoring HTML templates/icons inside)
      const originalText = btn.textContent.replace(/\s+/g, ' ').trim() || 'ADD TO CART';
      
      // Setup premium inner structure
      btn.innerHTML = `
        <span class="hov-cart__btn-default">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          ${originalText}
        </span>
        <span class="hov-cart__btn-loading">
          <span class="hov-cart__dots">
            <span></span><span></span><span></span>
          </span>
        </span>
        <span class="hov-cart__btn-success">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          ADDED!
        </span>
      `;

      // Click event for ripple effect and state transition
      btn.addEventListener('click', function(e) {
        // Create ripple element
        const ripple = document.createElement('span');
        ripple.className = 'hov-cart__ripple';
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.cssText = `
          width:${size}px; height:${size}px;
          left:${e.clientX - rect.left - size/2}px;
          top:${e.clientY - rect.top - size/2}px;
        `;
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);

        // Put button in loading state
        if (!this.dataset.state) {
          this.dataset.state = 'loading';
        }
      });
    });
  }

  // Hook into AJAX methods to dispatch 'cart:add'
  // 1. jQuery AJAX (Theme default)
  if (window.jQuery) {
    jQuery(document).on('ajaxSuccess', function(event, xhr, settings) {
      if (settings.url && settings.url.indexOf('/cart/add') !== -1) {
        document.dispatchEvent(new CustomEvent('cart:add'));
      }
    });
    jQuery(document).on('ajaxError', function(event, xhr, settings) {
      if (settings.url && settings.url.indexOf('/cart/add') !== -1) {
        document.querySelectorAll('.hov-cart__btn[data-state="loading"]').forEach(btn => {
          delete btn.dataset.state;
        });
      }
    });
  }

  // 2. Native Fetch Fallback
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && url.includes('/cart/add')) {
      return originalFetch.apply(this, args).then(response => {
        if (response.ok) {
          document.dispatchEvent(new CustomEvent('cart:add'));
        } else {
          document.querySelectorAll('.hov-cart__btn[data-state="loading"]').forEach(btn => {
            delete btn.dataset.state;
          });
        }
        return response;
      }).catch(err => {
        document.querySelectorAll('.hov-cart__btn[data-state="loading"]').forEach(btn => {
          delete btn.dataset.state;
        });
        throw err;
      });
    }
    return originalFetch.apply(this, args);
  };

  // 3. XMLHttpRequest Fallback
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function() {
    if (this._url && this._url.includes('/cart/add')) {
      this.addEventListener('load', function() {
        if (this.status >= 200 && this.status < 300) {
          document.dispatchEvent(new CustomEvent('cart:add'));
        } else {
          document.querySelectorAll('.hov-cart__btn[data-state="loading"]').forEach(btn => {
            delete btn.dataset.state;
          });
        }
      });
      this.addEventListener('error', function() {
        document.querySelectorAll('.hov-cart__btn[data-state="loading"]').forEach(btn => {
          delete btn.dataset.state;
        });
      });
    }
    return originalSend.apply(this, arguments);
  };

  // Hook into Shopify's cart AJAX response
  document.addEventListener('cart:add', () => {
    document.querySelectorAll('.hov-cart__btn[data-state="loading"]').forEach(btn => {
      btn.dataset.state = 'success';
      setTimeout(() => delete btn.dataset.state, 2500);
    });
  });


  // ── ANIMATION 2: CHECKOUT PRELOADER (POS card-swipe) ──
  const preloader = document.getElementById('hov-checkout-preloader');

  function showPreloader(cartTotal) {
    if (!preloader) return;

    // Update amount display
    const amountEl = document.getElementById('hov-pre-amount');
    if (amountEl && cartTotal) {
      amountEl.textContent = cartTotal;
    }

    preloader.classList.add('active');
    preloader.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
  }

  function interceptCheckout() {
    const selectors = [
      '[name="checkout"]',
      'a[href="/checkout"]',
      '.cart__checkout',
      '.hov-cart-drawer__checkout',
      '#checkout-btn',
      'button[data-checkout]',
      '.btn-checkout',
      '#hov-checkout-btn',
      '.shopify-payment-button__button',
      '#ctm-sticky-buy-now',
      '.ctm-sticky-cart__button--buy'
    ];

    document.querySelectorAll(selectors.join(',')).forEach(el => {
      if (el.dataset.hovChecked) return;
      el.dataset.hovChecked = '1';

      el.addEventListener('click', function(e) {
        // Get cart total from DOM if available
        const totalEl = document.querySelector(
          '.cart-total, .cart__total, [data-cart-total], .total-price, .js-cart-total, .engo-total-price'
        );
        const total = totalEl?.textContent?.trim() || '';
        showPreloader(total);
        // Do not preventDefault — let Shopify handle actual checkout redirect
      });
    });
  }

  // Safety: hide if page loads back (browser back button)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && preloader) {
      preloader.classList.remove('active');
      document.body.style.overflow = '';
    }
  });


  // ── INITIALIZATION ──
  function init() {
    convertButtons();
    interceptCheckout();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

  // Watch for dynamic insertions (like quick views or AJAX updates)
  if (window.MutationObserver) {
    new MutationObserver(init)
      .observe(document.body, { childList: true, subtree: true });
  }
})();
