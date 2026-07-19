(function () {
  'use strict';

  const GEO_ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client'; // keyless — do not add an API key here
  const PINCODE_ENDPOINT = 'https://api.postalpincode.in/pincode/';                // keyless India Post — resolves city from a typed pincode
  const AUTO_KEY = 'hov_user_location';          // sessionStorage — cleared on browser/tab close, so detection re-runs every new visit
  const MANUAL_KEY = 'hov_user_location_manual'; // localStorage — persists indefinitely once the customer confirms their own pincode

  // Single write path — always refreshes BOTH values (querySelectorAll covers the desktop
  // AND mobile headers). Hides the pincode + separator when there's no pincode, so an
  // IP-only result shows a clean "Delhi" rather than the stale-pincode pair "141120, Delhi".
  function renderLocation(city, pincode) {
    document.querySelectorAll('[data-hov-pincode]').forEach(function (el) {
      el.textContent = pincode || '';
      el.style.display = pincode ? '' : 'none';
    });
    document.querySelectorAll('[data-hov-sep]').forEach(function (el) {
      el.style.display = pincode ? '' : 'none';
    });
    if (city) document.querySelectorAll('[data-hov-city]').forEach(function (el) { el.textContent = city; });
  }

  function getManualLocation()  { try { return JSON.parse(localStorage.getItem(MANUAL_KEY)); } catch (e) { return null; } }
  function getSessionLocation() { try { return JSON.parse(sessionStorage.getItem(AUTO_KEY)); } catch (e) { return null; } }

  // GPS path — Nominatim returns address.postcode for India (BigDataCloud's reverse-geocode
  // returns the city but an empty postcode for many Indian coords, which was the "141120, Delhi"
  // bug). No User-Agent header: browsers forbid setting it on fetch; Nominatim uses the Referer.
  async function fetchGeoFromCoords(lat, lon) {
    const url = 'https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=' + lat + '&lon=' + lon;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('nominatim failed: ' + res.status);
    const a = (await res.json()).address || {};
    return {
      city: a.city || a.town || a.village || a.suburb || a.county || a.state_district || a.state || null,
      pincode: (a.postcode && /^\d{4,6}$/.test(a.postcode)) ? a.postcode : null
    };
  }

  // IP fallback (permission denied / no GPS) — BigDataCloud resolves via request IP.
  // Coarser: usually returns a city but no postcode, so the pincode is cleared (city only).
  async function fetchGeoFromIp() {
    const res = await fetch(`${GEO_ENDPOINT}?localityLanguage=en`);
    if (!res.ok) throw new Error('geo failed: ' + res.status);
    const data = await res.json();
    return {
      city: data.city || data.locality || data.principalSubdivision || null,
      pincode: (data.postcode && /^\d{4,6}$/.test(data.postcode)) ? data.postcode : null
    };
  }

  async function fetchCityFromPincode(pincode) {
    const res = await fetch(PINCODE_ENDPOINT + pincode);
    if (!res.ok) throw new Error('pincode lookup failed');
    const data = await res.json();
    const office = data && data[0] && data[0].PostOffice && data[0].PostOffice[0];
    return office ? (office.District || office.Name || null) : null; // null = pincode not recognized
  }

  function cacheSessionAndRender(result) {
    sessionStorage.setItem(AUTO_KEY, JSON.stringify(result));
    renderLocation(result.city, result.pincode);
  }

  async function fallbackToIp() {
    try { cacheSessionAndRender(await fetchGeoFromIp()); }
    catch (e) { /* leave the existing static default on screen — never show a blank state */ }
  }

  async function detectLocation() {
    const manual = getManualLocation();
    if (manual) { renderLocation(manual.city, manual.pincode); return; } // manual entry always wins, every session

    const session = getSessionLocation();
    if (session) { renderLocation(session.city, session.pincode); return; } // already resolved once this visit — don't re-fire mid-session

    if (!navigator.geolocation) { fallbackToIp(); return; }

    navigator.geolocation.getCurrentPosition(
      async function (pos) {
        try { cacheSessionAndRender(await fetchGeoFromCoords(pos.coords.latitude, pos.coords.longitude)); }
        catch (e) { fallbackToIp(); }
      },
      function () { fallbackToIp(); }, // denied, timeout, or unavailable — no dialog shows if already decided
      { timeout: 8000 }
    );
  }

  function initPincodeModal() {
    const modal = document.getElementById('hov-pincode-modal');
    if (!modal) return;
    const input = modal.querySelector('[data-pincode-input]');
    const errorEl = modal.querySelector('[data-pincode-error]');
    const submitBtn = modal.querySelector('[data-pincode-submit]');

    function open()  { modal.dataset.state = 'visible'; document.body.style.overflow = 'hidden'; setTimeout(function () { input.focus(); }, 50); }
    function close() { modal.dataset.state = 'hidden'; document.body.style.overflow = ''; errorEl.hidden = true; }

    document.querySelectorAll('[data-pincode-modal-trigger]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.preventDefault(); open(); }); // triggers are <a href="#"> — prevent the jump
    });
    modal.querySelectorAll('[data-pincode-modal-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.dataset.state === 'visible') close();
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitBtn.click(); });

    submitBtn.addEventListener('click', async function () {
      const value = input.value.trim();
      if (!/^\d{6}$/.test(value)) {
        errorEl.textContent = 'Enter a valid 6-digit pincode.';
        errorEl.hidden = false;
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Checking…';
      try {
        const city = await fetchCityFromPincode(value);
        if (!city) {
          errorEl.textContent = "We couldn't recognize that pincode — please check and try again.";
          errorEl.hidden = false;
          return;
        }
        localStorage.setItem(MANUAL_KEY, JSON.stringify({ city: city, pincode: value, timestamp: Date.now() }));
        renderLocation(city, value);
        modal.dataset.state = 'hidden';
        document.body.style.overflow = '';
        errorEl.hidden = true;
      } catch (e) {
        errorEl.textContent = 'Something went wrong — please try again.';
        errorEl.hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    detectLocation();
    initPincodeModal();
  });
})();
