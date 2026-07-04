(function () {
  const PREFS_KEY = 'deml_cookie_preferences';

  function getPreferences() {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to read cookie preferences', e);
    }
    return null;
  }

  function setPreferences(prefs) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  const css = `
    .deml-cookie-overlay {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 8px;
      z-index: 9999;
      display: flex;
      justify-content: center;
      pointer-events: none;
      animation: deml-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: inherit;
    }

    .deml-cookie-card {
      pointer-events: auto;
      width: 100%;
      max-width: 100%;
      background-color: var(--card-bg, var(--viking-charcoal-900));
      border: 1px solid var(--border, var(--viking-charcoal-700));
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all 0.3s ease;
      color: var(--text-color, var(--viking-white-pure));
    }

    .deml-cookie-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .deml-cookie-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .deml-cookie-icon {
      color: var(--color-success, var(--viking-green-500));
      display: inline-flex;
      align-items: center;
    }
    .deml-cookie-icon svg {
      width: 24px;
      height: 24px;
    }

    .deml-cookie-heading {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .deml-cookie-close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted, var(--viking-metallic-300));
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s, color 0.2s;
    }

    .deml-cookie-close-btn:hover {
      background-color: rgba(255, 255, 255, 0.08);
      color: var(--text-color, var(--viking-white-pure));
    }

    .deml-cookie-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .deml-cookie-description {
      font-size: 1rem;
      line-height: 1.5;
      margin: 0;
      opacity: 0.9;
    }

    .deml-cookie-description a {
      color: var(--link-color, var(--viking-teal-400));
      text-decoration: none;
      border-bottom: 1px solid var(--link-color, var(--viking-teal-400));
      font-weight: 500;
    }

    .deml-cookie-description a:hover {
      color: var(--link-hover-color, var(--viking-teal-500));
      border-bottom-color: var(--link-hover-color, var(--viking-teal-500));
    }

    .deml-cookie-form {
      display: none;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background: rgba(128, 128, 128, 0.05);
      border-radius: 16px;
      border: 1px solid var(--border, var(--viking-charcoal-700));
      animation: deml-fade-in 0.3s ease-out;
    }

    .deml-cookie-form.open {
      display: flex;
    }

    .deml-pref-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(128, 128, 128, 0.1);
    }

    .deml-pref-item:last-child {
      padding-bottom: 0;
      border-bottom: none;
    }

    .deml-pref-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .deml-pref-name {
      font-size: 1rem;
      font-weight: 600;
    }

    .deml-pref-desc {
      font-size: 1rem;
      line-height: 1.35;
      color: var(--text-muted, var(--viking-metallic-300));
      margin: 0;
    }

    .deml-always-active {
      font-size: 1rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--color-success, var(--viking-green-500));
      background: color-mix(in srgb, var(--color-success, var(--viking-green-500)) 10%, transparent);
      padding: 8px;
      letter-spacing: 0.5px;
    }

    .deml-toggle-switch {
      position: relative;
      width: 48px;
      height: 24px;
      background-color: rgba(128, 128, 128, 0.3);
      border-radius: 16px;
      border: none;
      cursor: pointer;
      transition: background-color 0.3s ease;
      padding: 0;
      display: flex;
      align-items: center;
    }

    .deml-toggle-switch.active {
      background-color: var(--color-success, var(--viking-green-500));
    }

    .deml-toggle-switch.active .deml-toggle-slider {
      transform: translateX(20px);
    }

    .deml-toggle-slider {
      position: absolute;
      left: 2px;
      width: 20px;
      height: 20px;
      background-color: var(--viking-white-pure);
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      transition: transform 0.3s ease;
    }

    .deml-cookie-footer {
      margin-top: 8px;
    }

    .deml-footer-buttons {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }

    .deml-settings-btn {
      padding: 0;
      background: transparent;
      min-width: auto;
      height: auto;
      font-size: 1rem;
      font-weight: 500;
      color: var(--link-color, var(--viking-teal-400));
      border: none;
      border-bottom: 1px solid var(--link-color, var(--viking-teal-400));
      align-self: flex-start;
      cursor: pointer;
    }

    .deml-settings-btn:hover {
      color: var(--link-hover-color, var(--viking-teal-500));
      border-bottom-color: var(--link-hover-color, var(--viking-teal-500));
    }

    .deml-primary-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
      width: 100%;
    }

    .deml-primary-actions button {
      height: 40px;
      padding: 0 16px;
      font-size: 1rem;
      border-radius: 8px;
      flex: 1;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.2s, color 0.2s;
    }

    .deml-reject-btn {
      background-color: transparent;
      color: var(--text-color, var(--viking-white-pure));
      border: 1px solid var(--border, var(--viking-charcoal-700));
    }

    .deml-reject-btn:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }

    .deml-save-btn {
      background-color: var(--color-primary-container, var(--viking-teal-700));
      color: var(--color-on-primary-container, var(--viking-white-pure));
      border: 1px solid var(--border, var(--viking-charcoal-700));
      display: none;
    }

    .deml-save-btn.show {
      display: block;
    }

    .deml-reject-btn.hide {
      display: none;
    }

    .deml-save-btn:hover {
      background-color: var(--color-on-primary-container, var(--viking-teal-400));
      color: var(--color-primary-container, var(--viking-charcoal-900));
    }

    .deml-accept-btn {
      background-color: var(--color-primary, var(--viking-teal-600));
      color: var(--viking-white-pure);
      border: none;
    }

    .deml-accept-btn:hover {
      background-color: var(--viking-teal-400);
      color: var(--viking-white-pure);
    }

    @keyframes deml-slide-up {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @keyframes deml-fade-in {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }

    @media (min-width: 577px) {
      .deml-cookie-overlay {
        padding: 24px;
        justify-content: flex-end;
      }
      .deml-cookie-card {
        max-width: 520px;
      }
      .deml-footer-buttons {
        flex-direction: row;
        align-items: center;
      }
      .deml-settings-btn {
        align-self: auto;
      }
      .deml-primary-actions {
        justify-content: flex-start;
        width: auto;
      }
      .deml-primary-actions button {
        flex: none;
      }
    }
  `;

  let currentPrefs = getPreferences();
  let showCustomize = false;
  let analyticalConsent = currentPrefs ? currentPrefs.analytical : false;
  let marketingConsent = currentPrefs ? currentPrefs.marketing : false;

  let overlayEl = null;

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
      <div class="deml-cookie-card" role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-desc">
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
            Read the <a href="/privacy">Privacy Policy</a> to learn more.
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
      setPreferences({ analytical: false, marketing: false });
      closeBanner();
    });

    saveBtn.addEventListener('click', () => {
      setPreferences({ analytical: analyticalConsent, marketing: marketingConsent });
      closeBanner();
    });

    acceptBtn.addEventListener('click', () => {
      setPreferences({ analytical: true, marketing: true });
      closeBanner();
    });
  }

  function closeBanner() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    // Update currentPrefs to reflect the recent save, so we can render the close button
    currentPrefs = getPreferences();
  }

  window.DemlWidgets = window.DemlWidgets || {};
  window.DemlWidgets.openCookieSettings = function () {
    currentPrefs = getPreferences();
    if (currentPrefs) {
      analyticalConsent = currentPrefs.analytical;
      marketingConsent = currentPrefs.marketing;
    } else {
      analyticalConsent = false;
      marketingConsent = false;
    }
    showCustomize = true;
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

  // Auto-show logic
  if (getPreferences() === null) {
    // Slight delay to allow layout to settle
    setTimeout(renderDialog, 1000);
  }

  openCookieSettingsFromQuery();
})();
