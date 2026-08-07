(function () {
  const PREFS_KEY = 'deml_cookie_preferences';
  const GA_MEASUREMENT_ID = 'G-MH3M99CQ80';
  const CLARITY_PROJECT_ID = 'xddv4klojn';
  const GA_SCRIPT_ID = 'deml-google-analytics';
  const CLARITY_SCRIPT_ID = 'deml-microsoft-clarity';
  let analyticsBooted = false;
  let memoryPreferences = null;
  let autoShowTimer = null;

  function getPreferences() {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) {
        memoryPreferences = JSON.parse(stored);
        return memoryPreferences;
      }
    } catch (e) {
      console.error('Failed to read cookie preferences', e);
    }
    return memoryPreferences;
  }

  function setPreferences(prefs) {
    memoryPreferences = prefs;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      return true;
    } catch (e) {
      console.error('Failed to save cookie preferences', e);
      return false;
    }
  }

  function isAnalyticsCookie(name) {
    return (
      name === '_ga' ||
      name.startsWith('_ga_') ||
      name === '_gid' ||
      name.startsWith('_gat') ||
      name.startsWith('_gcl_') ||
      name === '_clck' ||
      name === '_clsk'
    );
  }

  function cookieDomains() {
    const hostname = window.location.hostname;
    if (!hostname || hostname === 'localhost') {
      return [''];
    }

    const domains = new Set(['', hostname, `.${hostname}`]);
    const labels = hostname.split('.');
    for (let index = 1; index < labels.length - 1; index += 1) {
      const parent = labels.slice(index).join('.');
      domains.add(parent);
      domains.add(`.${parent}`);
    }
    return [...domains];
  }

  function clearAnalyticsCookies() {
    const names = document.cookie
      .split(';')
      .map((cookie) => cookie.split('=', 1)[0].trim())
      .filter(isAnalyticsCookie);

    for (const name of new Set(names)) {
      for (const domain of cookieDomains()) {
        const domainAttribute = domain ? `; Domain=${domain}` : '';
        const expired = `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/${domainAttribute}`;
        document.cookie = `${expired}; SameSite=Lax`;
        document.cookie = `${expired}; Secure; SameSite=None; Partitioned`;
      }
    }
  }

  function trackersArePresent() {
    if (analyticsBooted) {
      return true;
    }
    if (document.getElementById(GA_SCRIPT_ID) || document.getElementById(CLARITY_SCRIPT_ID)) {
      return true;
    }
    return [...document.querySelectorAll('script[src]')].some((script) => {
      const source = script.getAttribute('src') || '';
      return source.includes('googletagmanager.com/gtag/js') || source.includes('clarity.ms/tag/');
    });
  }

  function loadGoogleAnalytics() {
    if (document.getElementById(GA_SCRIPT_ID)) {
      return;
    }

    const script = document.createElement('script');
    script.id = GA_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      cookie_flags: 'SameSite=None;Secure;Partitioned',
    });
  }

  function loadMicrosoftClarity() {
    if (document.getElementById(CLARITY_SCRIPT_ID)) {
      return;
    }

    window.clarity =
      window.clarity ||
      function () {
        (window.clarity.q = window.clarity.q || []).push(arguments);
      };

    const script = document.createElement('script');
    script.id = CLARITY_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
    document.head.appendChild(script);
  }

  function updateClarityConsent(prefs) {
    if (typeof window.clarity !== 'function') {
      return;
    }
    window.clarity('consentv2', {
      analytics_Storage: prefs.analytical === true ? 'granted' : 'denied',
      ad_Storage: prefs.marketing === true ? 'granted' : 'denied',
    });
  }

  function applyPreferences(prefs, reloadOnRevoke = false) {
    if (prefs && prefs.analytical === true) {
      loadGoogleAnalytics();
      loadMicrosoftClarity();
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: prefs.marketing === true ? 'granted' : 'denied',
      });
      updateClarityConsent(prefs);
      analyticsBooted = true;
    } else {
      const shouldReload = reloadOnRevoke && trackersArePresent();
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
        });
      }
      if (typeof window.clarity === 'function') {
        updateClarityConsent({ analytical: false, marketing: false });
        // Consent V1 remains the documented erasure call until Microsoft
        // provides an equivalent cookie-clearing command in Consent V2.
        window.clarity('consent', false);
      }
      clearAnalyticsCookies();
      if (shouldReload) {
        window.location.reload();
        return true;
      }
    }

    window.dispatchEvent(
      new CustomEvent('deml:cookie-preferences', {
        detail: prefs || { analytical: false, marketing: false },
      }),
    );
    return false;
  }

  function savePreferences(prefs) {
    setPreferences(prefs);
    cancelAutoShow();
    const isReloading = applyPreferences(prefs, true);
    if (!isReloading) {
      closeBanner();
    }
  }

  const css = `
    .deml-cookie-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: flex-end;
      justify-content: stretch;
      padding: max(var(--space-1, 8px), env(safe-area-inset-top, 0px)) max(var(--space-1, 8px), env(safe-area-inset-right, 0px)) max(var(--space-1, 8px), env(safe-area-inset-bottom, 0px)) max(var(--space-1, 8px), env(safe-area-inset-left, 0px));
      box-sizing: border-box;
      pointer-events: none;
      font-family: inherit;
      animation: deml-slide-up var(--duration-slow, 320ms) var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1));
    }

    .deml-cookie-card {
      pointer-events: auto;
      width: 100%;
      max-width: 100%;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-none, 0);
      box-shadow: none;
      padding: var(--module-pad-lg, 24px);
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 16px);
      color: var(--color-text);
      transform: translateZ(0);
    }

    .deml-cookie-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-1, 8px);
    }

    .deml-cookie-title-group {
      display: flex;
      align-items: center;
      gap: var(--space-1, 8px);
      min-width: 0;
    }

    .deml-cookie-icon {
      color: var(--color-success);
      display: inline-flex;
      align-items: center;
      flex: 0 0 auto;
    }
    .deml-cookie-icon svg {
      width: 24px;
      height: 24px;
    }

    .deml-cookie-heading {
      font-size: var(--font-size-md, 1.125rem);
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }

    .deml-cookie-close-btn {
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      min-width: var(--hit-target, 48px);
      min-height: var(--hit-target, 48px);
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-none, 0);
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .deml-cookie-close-btn:hover {
      color: var(--color-text);
    }

    .deml-cookie-close-btn:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .deml-cookie-body {
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 16px);
    }

    .deml-cookie-description {
      font-size: var(--font-size-body, 1rem);
      line-height: 1.5;
      margin: 0;
    }

    .deml-cookie-description a {
      color: var(--color-primary) !important;
      text-decoration: none;
      border-bottom: 1px solid currentColor;
      font-weight: 500;
    }

    .deml-cookie-description a:hover {
      color: var(--color-primary-hover) !important;
    }

    .deml-cookie-description a:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .deml-cookie-form {
      display: none;
      flex-direction: column;
      gap: var(--space-1, 8px);
      padding: 16px;
      background: color-mix(in srgb, var(--color-text-secondary) 8%, transparent);
      border-radius: var(--radius-none, 0);
      border: 1px solid var(--color-border);
    }

    .deml-cookie-form.open {
      display: flex;
    }

    .deml-pref-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-2, 16px);
      padding-bottom: 8px;
      border-bottom: 1px solid color-mix(in srgb, var(--color-text-secondary) 16%, transparent);
    }

    .deml-pref-item:last-child {
      padding-bottom: 0;
      border-bottom: none;
    }

    .deml-pref-info {
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 8px);
      min-width: 0;
    }

    .deml-pref-name {
      font-size: var(--font-size-body, 1rem);
      font-weight: 600;
    }

    .deml-pref-desc {
      font-size: var(--font-size-body, 1rem);
      line-height: 1.4;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .deml-always-active {
      font-size: 0.9375rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-success);
      min-height: var(--hit-target, 48px);
      display: inline-flex;
      align-items: center;
    }

    .deml-toggle-switch {
      position: relative;
      width: 48px;
      height: 48px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .deml-toggle-switch::before {
      content: '';
      width: 48px;
      height: 28px;
      border-radius: 9999px;
      background-color: color-mix(in srgb, var(--color-text-secondary) 35%, transparent);
      transition: background-color 0.2s var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1));
    }

    .deml-toggle-switch.active::before {
      background-color: var(--color-success);
    }

    .deml-toggle-slider {
      position: absolute;
      left: 4px;
      width: 20px;
      height: 20px;
      background-color: var(--color-text);
      border-radius: 50%;
      transition: transform 0.2s var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1));
    }

    .deml-toggle-switch.active .deml-toggle-slider {
      transform: translateX(20px);
    }

    .deml-toggle-switch:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .deml-cookie-footer {
      margin-top: 8px;
    }

    .deml-footer-buttons {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-2, 16px);
    }

    .deml-settings-btn {
      min-height: var(--hit-target, 48px);
      padding: 0 8px;
      background: transparent;
      width: auto;
      align-self: flex-start;
      font-size: var(--font-size-body, 1rem);
      font-weight: 600;
      color: var(--color-primary);
      border: none;
      border-bottom: 1px solid var(--color-primary);
      cursor: pointer;
      touch-action: manipulation;
    }

    .deml-settings-btn:hover {
      color: var(--color-primary-hover);
      border-bottom-color: var(--color-primary-hover);
    }

    .deml-settings-btn:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .deml-primary-actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 8px);
      width: 100%;
    }

    .deml-primary-actions button {
      min-height: var(--hit-target, 48px);
      height: auto;
      padding: 0 16px;
      font-size: var(--font-size-body, 1rem);
      border-radius: var(--radius-none, 0);
      width: 100%;
      cursor: pointer;
      font-weight: 600;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: background-color 0.2s var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1)), color 0.2s var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1));
    }

    .deml-primary-actions button:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .deml-reject-btn {
      background-color: transparent;
      color: var(--color-text);
      border: 1px solid var(--color-border);
    }

    .deml-save-btn {
      background-color: var(--color-primary);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      display: none;
    }

    .deml-save-btn.show {
      display: block;
    }

    .deml-reject-btn.hide {
      display: none;
    }

    .deml-accept-btn {
      background-color: var(--color-primary);
      color: var(--color-text);
      border: none;
      min-height: var(--hit-target-lg, 56px);
    }

    .deml-accept-btn:hover {
      background-color: var(--color-primary-hover);
    }

    @keyframes deml-slide-up {
      from { transform: translateY(24px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @media (min-width: 600px) {
      .deml-cookie-overlay {
        align-items: flex-end;
        justify-content: flex-end;
        padding: max(24px, env(safe-area-inset-top, 0px)) max(24px, env(safe-area-inset-right, 0px)) max(24px, env(safe-area-inset-bottom, 0px)) max(24px, env(safe-area-inset-left, 0px));
      }
      .deml-cookie-card {
        max-width: 520px;
      }
      .deml-footer-buttons {
        flex-direction: row;
        align-items: center;
      }
      .deml-primary-actions {
        flex-direction: row;
        width: auto;
      }
      .deml-primary-actions button {
        width: auto;
        flex: 1 1 auto;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .deml-cookie-overlay,
      .deml-toggle-switch::before,
      .deml-toggle-slider,
      .deml-primary-actions button {
        animation: none !important;
        transition: none !important;
      }
    }
  `;

  let currentPrefs = getPreferences();
  let showCustomize = false;
  let analyticalConsent = currentPrefs ? currentPrefs.analytical : false;
  let marketingConsent = currentPrefs ? currentPrefs.marketing : false;

  let overlayEl = null;

  function cancelAutoShow() {
    if (autoShowTimer !== null) {
      clearTimeout(autoShowTimer);
      autoShowTimer = null;
    }
  }

  function renderDialog() {
    if (overlayEl) {
      overlayEl.remove();
    }

    overlayEl = document.createElement('div');
    overlayEl.className = 'deml-cookie-overlay';

    // Inject styles if not present
    if (!document.getElementById('deml-cookie-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'deml-cookie-styles';
      styleEl.innerHTML = css;
      document.head.appendChild(styleEl);
    }

    const html = `
      <div class="deml-cookie-card" role="dialog" aria-modal="true" aria-labelledby="cookie-title" aria-describedby="cookie-desc">
        <div class="deml-cookie-header">
          <div class="deml-cookie-title-group">
            <span class="deml-cookie-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
                <path d="M8.5 8.5v.01"/>
                <path d="M16 15.5v.01"/>
                <path d="M12 12v.01"/>
                <path d="M11 17v.01"/>
                <path d="M7 14v.01"/>
              </svg>
            </span>
            <h2 id="cookie-title" class="deml-cookie-heading">Cookie Preferences</h2>
          </div>
          ${
            currentPrefs !== null
              ? `
          <button class="deml-cookie-close-btn" aria-label="Close settings" id="deml-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
          `
              : ''
          }
        </div>
        <div class="deml-cookie-body">
          <p id="cookie-desc" class="deml-cookie-description">
            Cookies are used to improve the browsing experience, analyze site traffic, and deliver
            personalized system status telemetry in compliance with global data protection laws (GDPR, CCPA).
            Read the <a href="https://dataengineeringformachinelearning.com/privacy/">Privacy Policy</a> to learn more.
          </p>
          <div class="deml-cookie-form" id="deml-cookie-form">
            <div class="deml-pref-item">
              <div class="deml-pref-info">
                <span class="deml-pref-name">Strictly Necessary</span>
                <p class="deml-pref-desc">Required for basic site functions like authentication, page navigation, and security. Cannot be disabled.</p>
              </div>
              <div class="deml-pref-action">
                <span class="deml-always-active">Required</span>
              </div>
            </div>
            <div class="deml-pref-item">
              <div class="deml-pref-info">
                <span class="deml-pref-name">Performance & Analytics</span>
                <p class="deml-pref-desc">Enable analysis of platform usage, response speeds, and optimize core API performance.</p>
              </div>
              <div class="deml-pref-action">
                <button type="button" class="deml-toggle-switch ${analyticalConsent ? 'active' : ''}" id="deml-toggle-analytical" role="switch" aria-checked="${analyticalConsent}">
                  <span class="deml-toggle-slider"></span>
                </button>
              </div>
            </div>
            <div class="deml-pref-item">
              <div class="deml-pref-info">
                <span class="deml-pref-name">Marketing & Customization</span>
                <p class="deml-pref-desc">Enable personalized telemetry dashboards, feature flag rollouts, and custom platform layout settings.</p>
              </div>
              <div class="deml-pref-action">
                <button type="button" class="deml-toggle-switch ${marketingConsent ? 'active' : ''}" id="deml-toggle-marketing" role="switch" aria-checked="${marketingConsent}">
                  <span class="deml-toggle-slider"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="deml-cookie-footer">
          <div class="deml-footer-buttons">
            <button class="deml-settings-btn" id="deml-customize-btn">
              Cookie Settings
            </button>
            <div class="deml-primary-actions">
              <button class="deml-reject-btn" id="deml-reject-btn">Reject All</button>
              <button class="deml-save-btn" id="deml-save-btn">Save Choices</button>
              <button class="deml-accept-btn" id="deml-accept-btn">Accept All</button>
            </div>
          </div>
        </div>
      </div>
    `;

    overlayEl.innerHTML = html;
    document.body.appendChild(overlayEl);
    if (document.body && document.body.style) {
      document.body.style.overflow = 'hidden';
    }

    const card = overlayEl.querySelector('.deml-cookie-card');
    const previouslyFocused = document.activeElement;
    const focusables = () => {
      if (!card || typeof card.querySelectorAll !== 'function') return [];
      return Array.from(
        card.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => {
        if (typeof window.getComputedStyle !== 'function') return true;
        const style = window.getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    };

    const onKeydown = (event) => {
      if (!overlayEl) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeBanner();
        return;
      }
      if (event.key !== 'Tab' || !card) return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeydown);
    overlayEl._demlKeydown = onKeydown;
    overlayEl._demlPrevFocus = previouslyFocused;
    const firstFocus = focusables()[0];
    firstFocus?.focus?.();

    // Bind events
    const closeBtn = overlayEl.querySelector('#deml-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeBanner);
    }

    const customizeBtn = overlayEl.querySelector('#deml-customize-btn');
    const formEl = overlayEl.querySelector('#deml-cookie-form');
    const rejectBtn = overlayEl.querySelector('#deml-reject-btn');
    const saveBtn = overlayEl.querySelector('#deml-save-btn');
    const acceptBtn = overlayEl.querySelector('#deml-accept-btn');

    customizeBtn.addEventListener('click', () => {
      showCustomize = !showCustomize;
      if (showCustomize) {
        formEl.classList.add('open');
        customizeBtn.textContent = 'Hide Options';
        rejectBtn.classList.add('hide');
        saveBtn.classList.add('show');
      } else {
        formEl.classList.remove('open');
        customizeBtn.textContent = 'Cookie Settings';
        rejectBtn.classList.remove('hide');
        saveBtn.classList.remove('show');
      }
    });

    const toggleAnalytical = overlayEl.querySelector('#deml-toggle-analytical');
    toggleAnalytical.addEventListener('click', () => {
      analyticalConsent = !analyticalConsent;
      toggleAnalytical.classList.toggle('active', analyticalConsent);
      toggleAnalytical.setAttribute('aria-checked', analyticalConsent);
    });

    const toggleMarketing = overlayEl.querySelector('#deml-toggle-marketing');
    toggleMarketing.addEventListener('click', () => {
      marketingConsent = !marketingConsent;
      toggleMarketing.classList.toggle('active', marketingConsent);
      toggleMarketing.setAttribute('aria-checked', marketingConsent);
    });

    rejectBtn.addEventListener('click', () => {
      savePreferences({ analytical: false, marketing: false });
    });

    saveBtn.addEventListener('click', () => {
      savePreferences({ analytical: analyticalConsent, marketing: marketingConsent });
    });

    acceptBtn.addEventListener('click', () => {
      savePreferences({ analytical: true, marketing: true });
    });
  }

  function closeBanner() {
    cancelAutoShow();
    if (overlayEl) {
      if (overlayEl._demlKeydown) {
        document.removeEventListener('keydown', overlayEl._demlKeydown);
      }
      const prev = overlayEl._demlPrevFocus;
      overlayEl.remove();
      overlayEl = null;
      if (document.body && document.body.style) {
        document.body.style.overflow = '';
      }
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
    }
    currentPrefs = getPreferences();
  }

  window.DemlWidgets = window.DemlWidgets || {};
  window.DemlWidgets.openCookieSettings = function () {
    cancelAutoShow();
    currentPrefs = getPreferences();
    if (currentPrefs) {
      analyticalConsent = currentPrefs.analytical;
      marketingConsent = currentPrefs.marketing;
    } else {
      analyticalConsent = false;
      marketingConsent = false;
    }
    showCustomize = false;
    renderDialog();
    // Force open customize view
    const customizeBtn = overlayEl.querySelector('#deml-customize-btn');
    if (customizeBtn && customizeBtn.textContent.trim() === 'Cookie Settings') {
      customizeBtn.click();
    }
  };

  const openCookieSettingsFromQuery = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('cookieSettings') === '1') {
        window.DemlWidgets.openCookieSettings();
        params.delete('cookieSettings');
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, document.title, nextUrl);
      }
    } catch (e) {
      console.error('Failed to open cookie settings from query', e);
    }
  };

  // Apply saved consent before rendering any preference UI. With no consent,
  // trackers stay unloaded and stale first-party analytics cookies are removed.
  applyPreferences(currentPrefs);

  // Auto-show logic
  if (currentPrefs === null) {
    // Slight delay to allow layout to settle
    autoShowTimer = setTimeout(() => {
      autoShowTimer = null;
      if (getPreferences() === null && overlayEl === null) {
        renderDialog();
      }
    }, 1000);
  }

  openCookieSettingsFromQuery();
})();
