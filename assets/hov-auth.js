(function() {
  'use strict';

  const modal   = document.getElementById('hov-login-modal');
  const backdrop = document.getElementById('hov-auth-backdrop');
  const closeBtn = document.getElementById('hov-auth-close');
  if (!modal) return;

  // ── OPEN / CLOSE ──────────────────────────────────────
  function openModal(tab) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (tab) switchTab(tab);
    // Focus first input
    setTimeout(() => {
      modal.querySelector('.hov-auth__input')?.focus();
    }, 400);
  }

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // Close on backdrop click
  backdrop?.addEventListener('click', closeModal);
  closeBtn?.addEventListener('click', closeModal);

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display !== 'none')
      closeModal();
  });

  // ── TAB SWITCHING ────────────────────────────────────
  function switchTab(tab) {
    const loginPanel = document.getElementById('hov-panel-login');
    const regPanel   = document.getElementById('hov-panel-register');
    const loginTab   = document.getElementById('hov-tab-login');
    const regTab     = document.getElementById('hov-tab-register');

    if (tab === 'login') {
      loginPanel.style.display = 'block';
      regPanel.style.display   = 'none';
      loginTab.classList.add('hov-auth__tab--active');
      loginTab.setAttribute('aria-selected', 'true');
      regTab.classList.remove('hov-auth__tab--active');
      regTab.setAttribute('aria-selected', 'false');
    } else {
      regPanel.style.display   = 'block';
      loginPanel.style.display = 'none';
      regTab.classList.add('hov-auth__tab--active');
      regTab.setAttribute('aria-selected', 'true');
      loginTab.classList.remove('hov-auth__tab--active');
      loginTab.setAttribute('aria-selected', 'false');
    }
    // Reset recover form
    const recoverForm = document.getElementById('hov-recover-form-wrap');
    if (recoverForm) recoverForm.style.display = 'none';
    
    const loginForm = document.querySelector('#hov-panel-login .hov-auth__form');
    if (loginForm) loginForm.style.display = tab === 'login' ? 'flex' : 'none';

    // Show/reset standard login headers and details if returning to login
    if (tab === 'login') {
      const forgotLink = document.querySelector('.hov-auth__forgot');
      if (forgotLink) forgotLink.style.display = 'block';

      const socDivider = document.querySelector('.hov-auth__social-divider');
      if (socDivider) socDivider.style.display = 'flex';

      const socBtns = document.querySelector('.hov-auth__social-btns');
      if (socBtns) socBtns.style.display = 'grid';

      const switchText = document.querySelector('#hov-panel-login .hov-auth__switch');
      if (switchText) switchText.style.display = 'block';

      const trustBadge = document.querySelector('#hov-panel-login .hov-auth__trust');
      if (trustBadge) trustBadge.style.display = 'flex';
    }
  }

  // Tab button clicks
  document.querySelectorAll('.hov-auth__tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Switch panel links
  document.querySelectorAll('.hov-auth__switch-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.switch));
  });

  // ── OPEN TRIGGERS ────────────────────────────────────
  // Wire all LOGIN buttons/links in the navbar and mobile sidebar
  document.querySelectorAll(
    'a[href="/account/login"], a[href*="account/login"], ' +
    '.hov-nav__login-btn, #hov-login-trigger, ' +
    '[data-login-trigger], .js-call-popup-login, .hov-sidebar__login, .hov-nav__pill.login'
  ).forEach(el => {
    el.addEventListener('click', (e) => {
      // Only intercept if NOT already on account page
      if (!window.location.pathname.includes('/account')) {
        e.preventDefault();
        openModal('login');
      }
    });
  });

  // ── FORGOT PASSWORD ──────────────────────────────────
  document.getElementById('hov-forgot-link')
    ?.addEventListener('click', (e) => {
      e.preventDefault();
      const loginForm = document.querySelector(
        '#hov-panel-login .hov-auth__form'
      );
      const recoverWrap = document.getElementById(
        'hov-recover-form-wrap'
      );
      if (loginForm) loginForm.style.display = 'none';
      if (recoverWrap) recoverWrap.style.display = 'block';

      // Also hide forgot link, social, switch, trust
      const forgotLink = document.querySelector('.hov-auth__forgot');
      if (forgotLink) forgotLink.style.display = 'none';

      const socDivider = document.querySelector('.hov-auth__social-divider');
      if (socDivider) socDivider.style.display = 'none';

      const socBtns = document.querySelector('.hov-auth__social-btns');
      if (socBtns) socBtns.style.display = 'none';

      const switchText = document.querySelector('#hov-panel-login .hov-auth__switch');
      if (switchText) switchText.style.display = 'none';

      const trustBadge = document.querySelector('#hov-panel-login .hov-auth__trust');
      if (trustBadge) trustBadge.style.display = 'none';
    });

  document.getElementById('hov-back-to-login')
    ?.addEventListener('click', () => switchTab('login'));

  // ── PASSWORD TOGGLE ──────────────────────────────────
  document.querySelectorAll('.hov-auth__pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      
      const eyeShow = btn.querySelector('.hov-auth__eye--show');
      const eyeHide = btn.querySelector('.hov-auth__eye--hide');
      if (eyeShow) eyeShow.style.display = isHidden ? 'none' : 'block';
      if (eyeHide) eyeHide.style.display = isHidden ? 'block' : 'none';
    });
  });

  // ── PASSWORD STRENGTH ────────────────────────────────
  const pwInput = document.getElementById('hov-reg-password');
  pwInput?.addEventListener('input', () => {
    const val = pwInput.value;
    const fill  = document.getElementById('hov-pw-strength-fill');
    const label = document.getElementById('hov-pw-strength-label');
    if (!fill || !label) return;

    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const levels = [
      { w: '25%', bg: '#E53E3E', t: 'Weak'   },
      { w: '50%', bg: '#F6AD55', t: 'Fair'   },
      { w: '75%', bg: '#68D391', t: 'Good'   },
      { w: '100%',bg: '#2D5A27', t: 'Strong' },
    ];
    const level = levels[Math.max(0, score - 1)] || levels[0];
    fill.style.width = val.length === 0 ? '0%' : level.w;
    fill.style.background = level.bg;
    label.textContent = val.length === 0 ? '' : level.t;
    label.style.color = level.bg;
  });

  // ── CLIENT-SIDE VALIDATION ───────────────────────────
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setError(inputId, errorId, msg) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.toggle('error', !!msg);
    if (error) error.textContent = msg || '';
  }

  // Login form validation
  document.getElementById('hov-login-form')
    ?.addEventListener('submit', function(e) {
      let valid = true;
      const email = document.getElementById('hov-login-email');
      const pw    = document.getElementById('hov-login-password');

      if (!validateEmail(email?.value || '')) {
        setError('hov-login-email','hov-login-email-error',
          'Please enter a valid email address');
        valid = false;
      } else {
        setError('hov-login-email','hov-login-email-error','');
      }

      if ((pw?.value || '').length < 1) {
        setError('hov-login-password','hov-login-pw-error',
          'Please enter your password');
        valid = false;
      } else {
        setError('hov-login-password','hov-login-pw-error','');
      }

      if (!valid) { e.preventDefault(); return; }

      // Show loading state
      const btn = document.getElementById('hov-login-submit');
      if (btn) {
        btn.dataset.loading = 'true';
        const txt = btn.querySelector('.hov-auth__submit-text');
        const arr = btn.querySelector('.hov-auth__submit-arrow');
        const lod = btn.querySelector('.hov-auth__submit-loading');
        if (txt) txt.style.display = 'none';
        if (arr) arr.style.display = 'none';
        if (lod) lod.style.display = 'flex';
      }
      // Form submits naturally to Shopify
    });

  // Register form validation
  document.getElementById('hov-register-form')
    ?.addEventListener('submit', function(e) {
      const pw = document.getElementById('hov-reg-password');
      if ((pw?.value || '').length < 8) {
        e.preventDefault();
        if (pw) pw.classList.add('error');
        return;
      }
      // Show loading
      const btn = document.getElementById('hov-register-submit');
      if (btn) {
        const txt = btn.querySelector('.hov-auth__submit-text');
        if (txt) txt.textContent = 'Creating…';
      }
    });

  // Clear errors on input
  document.querySelectorAll('.hov-auth__input').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('error');
    });
  });

  // ── CHECK URL HASH (for direct /account/login links) ──
  if (window.location.pathname === '/account/login' ||
      window.location.hash === '#login') {
    openModal('login');
  }
  if (window.location.pathname === '/account/register') {
    openModal('register');
  }

  // ── EXPOSE GLOBALLY ──────────────────────────────────
  window.hovOpenLoginModal  = () => openModal('login');
  window.hovOpenRegisterModal = () => openModal('register');

  // ── SOCIAL LOGIN ───────────────────────
  document.querySelectorAll('[data-social-login]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const provider = btn.dataset.socialLogin; // 'google' or 'apple'
      
      // Google is a plain link to Shopify's login, where real social sign-in is
        // configured (Admin -> Settings -> Customer accounts). Apple was removed:
        // it only ever fired an alert saying it wasn't connected.
        return;
    });
  });

})();
