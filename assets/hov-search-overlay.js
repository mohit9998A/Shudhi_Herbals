/* ============================================================
   HOV PREMIUM SEARCH OVERLAY
   Shudhi Herbals — Production Grade
   Deps: none. Uses Shopify Predictive Search + AJAX cart APIs.
   Opens FROM the inline search bar ([data-hov-overlay-trigger]).
   Prefix: hov-so__ (CSS), hovSO (functions)
   ============================================================ */

(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────
  var CFG = {
    debounceMs:     260,
    minQueryLength: 2,
    suggestLimit:   6,
    trendingLimit:  5,
    recentMax:      5,
    recentKey:      'hov_recent_searches',
    rvKey:          'sh_recently_viewed',
    rvMax:          8,
    trendingHandle: 'trending-this-week'
  };

  // Money: values from suggest.json / products.json are rupee DECIMALS
  // (e.g. "189.00"), matching the theme's inline formatMoney — do NOT ÷100.
  function formatMoney(value) {
    if (value === null || value === undefined || value === '') return '';
    var num = parseFloat(value);
    if (isNaN(num)) return '';
    return '₹' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ── DOM REFS ────────────────────────────────────────────────
  var overlay, input, clearBtn, voiceBtn,
      defaultPane, activePane, suggestList, viewAllLink,
      queryLabel, trendingGrid, recentWrap, recentList,
      clearRecentBtn, rvWrap, rvList, catTabs;

  // ── STATE ───────────────────────────────────────────────────
  var debounceTimer = null;
  var isOpen = false;
  var currentQuery = '';

  // ── INIT ────────────────────────────────────────────────────
  function hovSOInit() {
    overlay = document.getElementById('hov-so');
    if (!overlay) return; // section not rendered

    input          = document.getElementById('hov-so-input');
    clearBtn       = document.getElementById('hov-so-clear');
    voiceBtn       = document.getElementById('hov-so-voice');
    defaultPane    = document.getElementById('hov-so-default');
    activePane     = document.getElementById('hov-so-active');
    suggestList    = document.getElementById('hov-so-suggestions');
    viewAllLink    = document.getElementById('hov-so-view-all');
    queryLabel     = document.getElementById('hov-so-query-label');
    trendingGrid   = document.getElementById('hov-so-trending');
    recentWrap     = document.getElementById('hov-so-recent-wrap');
    recentList     = document.getElementById('hov-so-recent-list');
    clearRecentBtn = document.getElementById('hov-so-clear-recent');
    rvWrap         = document.getElementById('hov-so-rv-wrap');
    rvList         = document.getElementById('hov-so-rv-list');
    catTabs        = (activePane || overlay).querySelectorAll('.hov-so__cat-tab');

    CFG.trendingHandle = overlay.dataset.trendingHandle || CFG.trendingHandle;

    hovSOWireEvents();
    hovSOLoadTrending();
    hovSORenderRecentlyViewed();
  }

  // ── EVENT WIRING ────────────────────────────────────────────
  function hovSOWireEvents() {
    // OPEN: from the inline search bar(s). Suppress their native focus/submit.
    document.querySelectorAll('[data-hov-overlay-trigger]').forEach(function (el) {
      el.addEventListener('pointerdown', function (e) { e.preventDefault(); hovSOOpen(); });
      el.addEventListener('click',       function (e) { e.preventDefault(); hovSOOpen(); });
      el.addEventListener('focus',       function ()  { el.blur(); hovSOOpen(); });
      var form = el.closest('form');
      if (form) form.addEventListener('submit', function (e) { e.preventDefault(); hovSOOpen(); });
    });

    // CLOSE: backdrop, close button, Escape
    var backdrop = document.getElementById('hov-so-backdrop');
    if (backdrop) backdrop.addEventListener('click', hovSOClose);
    var closeBtn = document.getElementById('hov-so-close');
    if (closeBtn) closeBtn.addEventListener('click', hovSOClose);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) hovSOClose();
    });

    // TYPE → debounced predictive search
    if (input) {
      input.addEventListener('input', function () {
        var q = input.value.trim();
        clearBtn.style.display = q ? '' : 'none';
        clearTimeout(debounceTimer);
        if (q.length < CFG.minQueryLength) { hovSOShowDefault(); return; }
        debounceTimer = setTimeout(function () { hovSOSearch(q); }, CFG.debounceMs);
      });

      // SUBMIT (Enter)
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var q = input.value.trim();
          if (q) {
            hovSOSaveRecentSearch(q);
            window.location.href = '/search?q=' + encodeURIComponent(q);
          }
        }
      });
    }

    // CLEAR button
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        input.value = '';
        clearBtn.style.display = 'none';
        input.focus();
        hovSOShowDefault();
      });
    }

    // VOICE
    if (voiceBtn) voiceBtn.addEventListener('click', hovSOVoiceSearch);
  }

  // ── OPEN / CLOSE ────────────────────────────────────────────
  function hovSOOpen() {
    if (!overlay) return;
    overlay.dataset.state = 'visible';
    isOpen = true;
    document.body.style.overflow = 'hidden';
    setTimeout(function () { if (input) input.focus(); }, 320);
    hovSOSyncCart();
  }

  function hovSOClose() {
    if (!overlay) return;
    overlay.dataset.state = 'hidden';
    isOpen = false;
    document.body.style.overflow = '';
    setTimeout(function () {
      if (input) input.value = '';
      if (clearBtn) clearBtn.style.display = 'none';
      currentQuery = '';
      hovSOShowDefault();
    }, 300);
  }

  // ── PANE SWITCH ─────────────────────────────────────────────
  function hovSOShowDefault() {
    currentQuery = '';
    if (defaultPane) defaultPane.hidden = false;
    if (activePane)  activePane.hidden = true;
  }
  function hovSOShowActive() {
    if (defaultPane) defaultPane.hidden = true;
    if (activePane)  activePane.hidden = false;
  }

  // ── PREDICTIVE SEARCH ───────────────────────────────────────
  function hovSOSearch(q) {
    if (q === currentQuery) return;
    currentQuery = q;
    hovSOShowActive();

    if (queryLabel) queryLabel.textContent = q;
    if (viewAllLink) viewAllLink.href = '/search?q=' + encodeURIComponent(q);
    if (catTabs) {
      catTabs.forEach(function (tab) {
        if (tab.dataset.cat !== 'collections') tab.href = '/search?q=' + encodeURIComponent(q);
      });
    }

    var url = '/search/suggest.json?q=' + encodeURIComponent(q) +
      '&resources[type]=product,query&resources[limit]=' + CFG.suggestLimit +
      '&resources[options][unavailable_products]=last' +
      '&resources[options][fields]=title,product_type,variants.title,vendor';

    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('suggest ' + r.status); return r.json(); })
      .then(function (data) {
        if (currentQuery !== q) return; // stale-response guard
        hovSORenderSuggestions(data && data.resources && data.resources.results, q);
      })
      .catch(function (err) {
        if (window.console) console.warn('[HOV Search] predictive error:', err);
        if (currentQuery === q) hovSORenderSuggestions(null, q);
      });
  }

  // ── RENDER SUGGESTIONS ──────────────────────────────────────
  function hovSORenderSuggestions(results, q) {
    if (!suggestList) return;
    suggestList.innerHTML = '';

    var products = (results && results.products) || [];
    var queries  = (results && results.queries)  || [];

    queries.slice(0, 3).forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'hov-so__suggest-item hov-so__suggest-item--query';
      li.innerHTML =
        '<svg class="hov-so__suggest-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        '<a href="/search?q=' + encodeURIComponent(item.text) + '" class="hov-so__suggest-text">' + hovSOHighlight(item.text, q) + '</a>' +
        '<svg class="hov-so__suggest-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>';
      var a = li.querySelector('a');
      if (a) a.addEventListener('click', function () { hovSOSaveRecentSearch(item.text); });
      suggestList.appendChild(li);
    });

    products.slice(0, CFG.suggestLimit).forEach(function (product) {
      var price = formatMoney(product.price);
      var imgUrl = (product.featured_image && product.featured_image.url) ? product.featured_image.url + '&width=80' : '';
      var li = document.createElement('li');
      li.className = 'hov-so__suggest-item hov-so__suggest-item--product';
      li.innerHTML =
        (imgUrl
          ? '<img class="hov-so__suggest-img" src="' + imgUrl + '" alt="' + hovSOEsc(product.title) + '" loading="lazy" width="42" height="42">'
          : '<div class="hov-so__suggest-img-placeholder"></div>') +
        '<div class="hov-so__suggest-info">' +
          '<a href="' + product.url + '" class="hov-so__suggest-text">' + hovSOHighlight(product.title, q) + '</a>' +
          (price ? '<span class="hov-so__suggest-price">' + price + '</span>' : '') +
        '</div>' +
        '<svg class="hov-so__suggest-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>';
      var pa = li.querySelector('a');
      if (pa) pa.addEventListener('click', function () { hovSOSaveRecentSearch(q); });
      suggestList.appendChild(li);
    });

    if (queries.length === 0 && products.length === 0) {
      suggestList.innerHTML =
        '<li class="hov-so__suggest-empty">' +
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6C8C65" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<p>No results for "<strong>' + hovSOEsc(q) + '</strong>"</p>' +
          '<small>Try "Herbal Soap", "Neem", or "Sandalwood"</small>' +
        '</li>';
    }
  }

  function hovSOEsc(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function hovSOHighlight(text, query) {
    var escaped = hovSOEsc(text);
    if (!query) return escaped;
    var re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return escaped.replace(re, '<mark class="hov-so__highlight">$1</mark>');
  }

  // ── TRENDING PRODUCTS ────────────────────────────────────────
  function hovSOFetchProducts(handle) {
    return fetch('/collections/' + handle + '/products.json?limit=' + CFG.trendingLimit)
      .then(function (r) { return r.ok ? r.json() : { products: [] }; })
      .then(function (data) { return (data && data.products) || []; })
      .catch(function () { return []; });
  }

  function hovSOHideTrending() {
    var section = trendingGrid && trendingGrid.closest('.hov-so__section');
    if (section) section.style.display = 'none';
  }

  function hovSOLoadTrending() {
    if (!trendingGrid) return;
    var handle = CFG.trendingHandle || 'trending-this-week';
    // Cascade: configured trending collection → best-sellers → all → hide if truly empty.
    hovSOFetchProducts(handle)
      .then(function (products) { return products.length ? products : hovSOFetchProducts('best-sellers'); })
      .then(function (products) { return products.length ? products : hovSOFetchProducts('all'); })
      .then(function (products) {
        if (products && products.length) hovSORenderTrending(products);
        else hovSOHideTrending();
      })
      .catch(function (err) {
        if (window.console) console.warn('[HOV Search] trending error:', err);
        hovSOHideTrending();
      });
  }

  function hovSORenderTrending(products) {
    trendingGrid.innerHTML = '';
    if (!products || !products.length) return;

    products.forEach(function (p) {
      var variant = p.variants && p.variants[0];
      if (!variant) return;
      var price = formatMoney(variant.price);
      var hasCompare = variant.compare_at_price && parseFloat(variant.compare_at_price) > parseFloat(variant.price);
      var compareAt = hasCompare ? formatMoney(variant.compare_at_price) : null;
      var img = (p.images && p.images[0] && p.images[0].src) || '';
      var discountPct = hasCompare
        ? Math.round((1 - parseFloat(variant.price) / parseFloat(variant.compare_at_price)) * 100)
        : 0;

      // Subtitle: first sentence of the description (tags stripped, entities decoded).
      // textarea decodes character refs without parsing HTML (no img/script side effects).
      var stripped = (p.body_html || '').replace(/<[^>]+>/g, ' ');
      var deco = document.createElement('textarea'); deco.innerHTML = stripped;
      var descText = deco.value.replace(/\s+/g, ' ').trim();
      var subtitle = (descText.split(/[.•\n]/)[0] || '').trim().slice(0, 60);
      // Rating: from a review metafield if present (products.json carries none → hidden)
      var rating   = (p.metafields && p.metafields.reviews && p.metafields.reviews.rating) || null;
      var ratingVal = rating ? parseFloat(rating).toFixed(1) : null;
      // Serve a sized image variant from the Shopify CDN
      var imgSized = img ? img.replace(/(\.(jpg|jpeg|png|webp))(\?|$)/i, '_320x320$1$3') : '';

      var card = document.createElement('div');
      card.className = 'hov-so__trend-card';
      card.innerHTML =
        '<a href="/products/' + p.handle + '" class="hov-so__trend-img-wrap" aria-label="' + hovSOEsc(p.title) + '">' +
          (discountPct > 0 ? '<span class="hov-so__trend-badge">' + discountPct + '% OFF</span>' : '') +
          (imgSized
            ? '<img src="' + imgSized + '" alt="' + hovSOEsc(p.title) + '" loading="lazy" class="hov-so__trend-img">'
            : '<div class="hov-so__trend-img hov-so__trend-img--placeholder"></div>') +
        '</a>' +
        '<div class="hov-so__trend-body">' +
          '<a href="/products/' + p.handle + '" class="hov-so__trend-title">' + hovSOEsc(p.title) + '</a>' +
          (subtitle ? '<p class="hov-so__trend-subtitle">' + hovSOEsc(subtitle) + '</p>' : '') +
          (ratingVal
            ? '<div class="hov-so__trend-rating" aria-label="' + ratingVal + ' out of 5">' +
                '<svg class="hov-so__star" viewBox="0 0 20 20" width="13" height="13" fill="#C7A86B"><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.62l5.34-.78z"/></svg>' +
                '<span class="hov-so__trend-rating-val">(' + ratingVal + ')</span>' +
              '</div>'
            : '') +
          '<div class="hov-so__trend-footer">' +
            '<div class="hov-so__trend-pricing">' +
              '<span class="hov-so__trend-price">' + price + '</span>' +
              (compareAt ? '<span class="hov-so__trend-compare">' + compareAt + '</span>' : '') +
            '</div>' +
            '<button class="hov-so__trend-add" data-variant-id="' + (variant.id || '') + '" aria-label="Add ' + hovSOEsc(p.title) + ' to cart">' + PLUS_SVG + '</button>' +
          '</div>' +
        '</div>';

      var addBtn = card.querySelector('.hov-so__trend-add');
      if (addBtn) addBtn.addEventListener('click', function (e) { hovSOAddToCart(e.currentTarget); });
      trendingGrid.appendChild(card);
    });
  }

  var PLUS_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  var CHECK_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';

  function hovSOAddToCart(btn) {
    var varId = btn.dataset.variantId;
    if (!varId) return;
    btn.disabled = true;
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: parseInt(varId, 10), quantity: 1 }] })
    })
      .then(function (r) { if (!r.ok) throw new Error('add ' + r.status); return r.json(); })
      .then(function () {
        btn.innerHTML = CHECK_SVG;
        document.dispatchEvent(new CustomEvent('cart:updated'));
        hovSOSyncCart();
        setTimeout(function () { btn.innerHTML = PLUS_SVG; btn.disabled = false; }, 1800);
      })
      .catch(function () {
        btn.innerHTML = PLUS_SVG;
        btn.disabled = false;
      });
  }

  // ── CART BADGE SYNC (site-wide .enj-cartcount) ──────────────
  function hovSOSyncCart() {
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        document.querySelectorAll('.enj-cartcount').forEach(function (el) {
          el.textContent = cart.item_count;
          if (cart.item_count === 0) el.classList.add('hidden-count');
          else el.classList.remove('hidden-count');
        });
      })
      .catch(function () {});
  }

  // ── RECENT SEARCHES ─────────────────────────────────────────
  function hovSOSaveRecentSearch(term) {
    if (!term || !term.trim()) return;
    var recent = hovSOGetRecent();
    recent = [term].concat(recent.filter(function (t) { return t.toLowerCase() !== term.toLowerCase(); })).slice(0, CFG.recentMax);
    try { localStorage.setItem(CFG.recentKey, JSON.stringify(recent)); } catch (e) {}
    hovSORenderRecent();
  }
  function hovSOGetRecent() {
    try { return JSON.parse(localStorage.getItem(CFG.recentKey) || '[]'); } catch (e) { return []; }
  }
  function hovSORenderRecent() {
    if (!recentWrap || !recentList) return;
    var recent = hovSOGetRecent();
    recentWrap.style.display = recent.length ? '' : 'none';
    recentList.innerHTML = recent.map(function (term) {
      return '<div class="hov-so__recent-item">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6E6E6E" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
        '<a href="/search?q=' + encodeURIComponent(term) + '" class="hov-so__recent-text">' + hovSOEsc(term) + '</a>' +
        '<button class="hov-so__recent-remove" data-term="' + hovSOEsc(term) + '" aria-label="Remove">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button></div>';
    }).join('');
    recentList.querySelectorAll('.hov-so__recent-remove').forEach(function (b) {
      b.addEventListener('click', function () {
        var term = b.dataset.term;
        var next = hovSOGetRecent().filter(function (t) { return t !== term; });
        try { localStorage.setItem(CFG.recentKey, JSON.stringify(next)); } catch (e) {}
        hovSORenderRecent();
      });
    });
  }

  // ── RECENTLY VIEWED ─────────────────────────────────────────
  function hovSOGetRV() {
    try { return JSON.parse(localStorage.getItem(CFG.rvKey) || '[]'); } catch (e) { return []; }
  }
  function hovSORenderRecentlyViewed() {
    if (!rvList || !rvWrap) return;
    var rv = hovSOGetRV();
    if (!rv.length) { rvWrap.style.display = 'none'; return; }
    rvWrap.style.display = '';
    rvList.innerHTML = rv.map(function (p) {
      return '<a href="/products/' + p.handle + '" class="hov-so__rv-card">' +
        '<div class="hov-so__rv-img-wrap">' + (p.img ? '<img src="' + p.img + '" alt="' + hovSOEsc(p.title) + '" loading="lazy">' : '') + '</div>' +
        '<p class="hov-so__rv-title">' + hovSOEsc(p.title) + '</p>' +
        '<p class="hov-so__rv-price">' + formatMoney(p.price) + '</p>' +
      '</a>';
    }).join('');
  }

  // ── VOICE SEARCH ────────────────────────────────────────────
  function hovSOVoiceSearch() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { voiceBtn.style.opacity = '0.3'; return; }
    var rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    voiceBtn.classList.add('hov-so__voice-btn--listening');
    rec.onresult = function (e) {
      var transcript = e.results[0][0].transcript;
      input.value = transcript;
      clearBtn.style.display = '';
      voiceBtn.classList.remove('hov-so__voice-btn--listening');
      hovSOSearch(transcript.trim());
    };
    rec.onerror = rec.onend = function () { voiceBtn.classList.remove('hov-so__voice-btn--listening'); };
    rec.start();
  }

  // ── RECENTLY-VIEWED TRACKER (product pages) ─────────────────
  function hovSOTrackProductView() {
    var data = window.__hovProductData || null;
    var m = location.pathname.match(/\/products\/([^/?#]+)/);
    var handle = (data && data.handle) || (m && m[1]);
    if (!handle) return; // not a product page

    var title = (data && data.title) || (document.title || '').split(/\s[–\-|]\s/)[0] || document.title;
    var price = (data && typeof data.price === 'number') ? data.price : 0;
    var img   = (data && data.img) || '';

    if (!price || !img) {
      // DOM fallback (theme selectors)
      if (!price) {
        var priceEl = document.querySelector('.engoj_price_main, .enj-product-price');
        if (priceEl) price = parseFloat((priceEl.textContent || '').replace(/[^\d.]/g, '')) || 0;
      }
      if (!img) {
        var imgEl = document.querySelector('.engoj_img_main');
        if (imgEl) img = imgEl.getAttribute('src') || '';
      }
    }

    var rv = hovSOGetRV().filter(function (p) { return p.handle !== handle; });
    rv.unshift({ handle: handle, title: title, price: price, img: img });
    rv = rv.slice(0, CFG.rvMax);
    try { localStorage.setItem(CFG.rvKey, JSON.stringify(rv)); } catch (e) {}
  }

  // ── EXPOSE ──────────────────────────────────────────────────
  window.hovSOOpen  = hovSOOpen;
  window.hovSOClose = hovSOClose;

  // ── BOOTSTRAP ───────────────────────────────────────────────
  function boot() { hovSOInit(); hovSOTrackProductView(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
