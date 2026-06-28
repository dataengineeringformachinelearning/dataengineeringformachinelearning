(() => {
  if (customElements.get('platform-widget')) {
    // If already registered, only run the auto-initialization for this script if not already done
    const currentScript = document.currentScript;
    if (currentScript && currentScript.hasAttribute('data-page-id')) {
      const pageId = currentScript.getAttribute('data-page-id');
      const backendUrl = currentScript.getAttribute('data-backend-url');
      const frontendUrl = currentScript.getAttribute('data-frontend-url');

      // Check if we already inserted the widget next to this script tag
      if (!currentScript.nextSibling || currentScript.nextSibling.nodeName !== 'PLATFORM-WIDGET') {
        const widget = document.createElement('platform-widget');
        widget.setAttribute('data-page-id', pageId);
        if (backendUrl) {
          widget.setAttribute('data-backend-url', backendUrl);
        }
        if (frontendUrl) {
          widget.setAttribute('data-frontend-url', frontendUrl);
        }
        currentScript.parentNode.insertBefore(widget, currentScript.nextSibling);
      }
    }
    return;
  }

  // Intercept console errors on host page safely to package as telemetry analytics
  const recentErrors = [];
  if (typeof window !== 'undefined') {
    try {
      const originalError = console.error;
      console.error = (...args) => {
        recentErrors.push(args.join(' '));
        if (recentErrors.length > 5) recentErrors.shift();
        originalError.apply(console, args);
      };
    } catch {}
  }

  // Helper for idle callbacks to optimize performance
  const runWhenIdle = callback => {
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(callback);
      } else {
        setTimeout(callback, 200);
      }
    }
  };

  const statusPageUrl = (frontendHost, slug) => `${frontendHost.replace(/\/$/, '')}/status/${slug}`;

  const resolveFrontendHost = ({ explicit, backendUrl, scriptOrigin }) => {
    if (explicit) {
      return explicit.replace(/\/$/, '');
    }

    if (backendUrl) {
      try {
        const backend = new URL(backendUrl);
        if (backend.hostname.startsWith('backend.')) {
          return `${backend.protocol}//${backend.hostname.slice('backend.'.length)}`;
        }
        if (backend.hostname === 'localhost' || backend.hostname === '127.0.0.1') {
          const port = backend.port === '8000' ? '4200' : backend.port;
          return `${backend.protocol}//${backend.hostname}${port ? `:${port}` : ''}`;
        }
        return `${backend.protocol}//${backend.hostname}${backend.port ? `:${backend.port}` : ''}`;
      } catch {}
    }

    try {
      const script = new URL(scriptOrigin);
      const host = script.hostname;
      if (
        host === 'dataengineeringformachinelearning.com' ||
        host === 'www.dataengineeringformachinelearning.com'
      ) {
        return 'https://deml.app';
      }
      return scriptOrigin.replace(/\/$/, '');
    } catch {
      return (scriptOrigin || '').replace(/\/$/, '');
    }
  };

  const fetchWithTimeout = async (resource, options = {}) => {
    const { timeout = 5000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(resource, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  const globalAgentData = {
    clicks: 0,
    xss_events: [],
    dlp_events: [],
    forms_protected: 0,
    assets: [],
    technologies: [],
  };

  const initGlobalAgent = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // 1. Behavioral Analytics (Click tracking)
    document.addEventListener(
      'click',
      () => {
        globalAgentData.clicks++;
      },
      { passive: true },
    );

    // 2. Asset Inventory (Wappalyzer style & third-party scripts)
    runWhenIdle(() => {
      try {
        const now = new Date();
        const lastScanStr = localStorage.getItem('deml_asset_scan_time');
        const lastScanDate = lastScanStr ? new Date(parseInt(lastScanStr)) : null;

        const isPast3AM = now.getHours() >= 3;
        const isSameDay =
          lastScanDate &&
          lastScanDate.getDate() === now.getDate() &&
          lastScanDate.getMonth() === now.getMonth() &&
          lastScanDate.getFullYear() === now.getFullYear();

        if (isPast3AM && !isSameDay) {
          const techs = [];
          if (window.React) techs.push('React');
          if (window.angular) techs.push('Angular');
          if (window.jQuery) techs.push('jQuery');
          if (window.Vue) techs.push('Vue');

          const generator = document.querySelector('meta[name="generator"]');
          if (generator) techs.push(generator.content);

          globalAgentData.technologies = techs;

          if (window.performance && window.performance.getEntriesByType) {
            const resources = window.performance.getEntriesByType('resource');
            globalAgentData.assets = resources.map(r => r.name).slice(0, 50); // limit to save payload size
          }

          localStorage.setItem('deml_asset_scan_time', now.getTime().toString());
        }
      } catch {}
    });

    // 3. Global XSS Detection (Mutation Observer)
    try {
      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.tagName === 'SCRIPT') {
              const src = node.src || 'inline';
              if (!src.includes('deml.app')) {
                globalAgentData.xss_events.push({
                  type: 'script_injected',
                  src: src.substring(0, 100),
                });
              }
            } else if (node.tagName === 'IFRAME') {
              globalAgentData.xss_events.push({
                type: 'iframe_injected',
                src: (node.src || 'unknown').substring(0, 100),
              });
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch {}

    // CSP Violation Tracking
    document.addEventListener('securitypolicyviolation', e => {
      globalAgentData.xss_events.push({
        type: 'csp_violation',
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
      });
    });

    // 4. Site-Wide DLP & Honeypots (Form Interception)
    runWhenIdle(() => {
      try {
        const forms = document.querySelectorAll('form.deml-protected-form');
        globalAgentData.forms_protected = forms.length;

        forms.forEach(form => {
          if (form.classList.contains('deml-ignore')) return;

          const honeypot = document.createElement('input');
          honeypot.type = 'text';
          honeypot.name = 'deml_site_bot_check';
          honeypot.classList.add('honeypot-field');
          honeypot.tabIndex = -1;
          honeypot.setAttribute('aria-hidden', 'true');
          form.appendChild(honeypot);

          form.addEventListener('submit', e => {
            if (honeypot.value !== '') {
              e.preventDefault(); // Trap bot
              globalAgentData.dlp_events.push({ type: 'bot_trapped', formAction: form.action });
              return;
            }

            const inputs = form.querySelectorAll('input[type="text"], textarea');
            const dlpRegex = /(password|api[_-]?key|secret|sk-[a-zA-Z0-9]{20,})/i;

            let foundSecret = false;
            inputs.forEach(input => {
              if (dlpRegex.test(input.value)) {
                foundSecret = true;
              }
            });

            if (foundSecret) {
              globalAgentData.dlp_events.push({
                type: 'secret_leak_attempt',
                formAction: form.action,
              });
            }
          });
        });
      } catch {}
    });
  };

  initGlobalAgent();

  customElements.define(
    'platform-widget',
    class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.clientIp = '127.0.0.1';
      }

      async connectedCallback() {
        const pageId = this.getAttribute('data-page-id');
        if (!pageId) {
          console.error('Widget missing data-page-id attribute');
          return;
        }

        // Resolve URLs: strictly prefer data-* attributes or the origin of the loaded script.
        // No hardcoded production domains or fallbacks. Set data-backend-url / data-frontend-url on the embed script.
        const currentScript =
          document.currentScript || document.querySelector('script[src*="widget.js"]');
        const scriptOrigin = currentScript
          ? new URL(currentScript.src).origin
          : window.location.origin;

        const backendUrl = this.getAttribute('data-backend-url') ?? '';
        const frontendHost = resolveFrontendHost({
          explicit: this.getAttribute('data-frontend-url'),
          backendUrl,
          scriptOrigin,
        });

        // Resolve Client IP lazily during idle cycles
        runWhenIdle(async () => {
          try {
            const ipRes = await fetchWithTimeout('https://api.ipify.org?format=json');
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              this.clientIp = ipData.ip || '127.0.0.1';
            }
          } catch {}
        });

        // Set up Shadow DOM structure including status indicators and vulnerability modal triggers
        this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: flex;
            justify-content: center;
            width: 100%;
            margin: 16px auto;
          }
          :root {
            --color-primary: #2176ff;
            --card-bg: #1a1a1a;
            --border: rgba(255, 255, 255, 0.12);
            --text-color: #f8fafc;
            --text-muted: rgba(255, 255, 255, 0.7);
          }
          .widget-container {
            display: inline-flex;
            align-items: center;
            padding: 8px 16px;
            background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(20px) saturate(160%);
            -webkit-backdrop-filter: blur(20px) saturate(160%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10000px;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: #f8fafc;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
            width: fit-content;
            gap: 8px;
          }
          .widget-container:hover {
            background: rgba(15, 23, 42, 0.7);
            border-color: rgba(255, 255, 255, 0.2);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15);
            transform: translateY(-1px);
          }
          .widget-link {
            display: inline-flex;
            align-items: center;
            text-decoration: none;
            color: inherit;
          }
          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #94a3b8;
            margin-right: 8px;
            display: inline-block;
          }
          .divider {
            color: rgba(255, 255, 255, 0.2);
            user-select: none;
          }
          .report-trigger {
            background: none;
            border: none;
            color: #ef4444;
            cursor: pointer;
            padding: 0px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
          }
          .report-trigger:hover {
            background-color: #fee2e2;
          }
          .report-icon {
            width: 16px;
            height: 16px;
          }
          .is-hidden {
            display: none !important;
          }
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
          }
          .modal-title-icon {
            color: var(--color-error, #ef4444);
          }
          .modal-content {
            background-color: #1e293b;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            width: 90%;
            max-width: 480px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
            animation: modal-anim 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            color: #f8fafc;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            text-align: left;
          }
          @keyframes modal-anim {
            from {
              transform: scale(0.95) translateY(10px);
              opacity: 0;
            }
            to {
              transform: scale(1) translateY(0);
              opacity: 1;
            }
          }
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          .modal-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .close-btn {
            background: none;
            border: none;
            color: #64748b;
            cursor: pointer;
            font-size: 20px;
            line-height: 1;
            transition: color 0.2s;
          }
          .close-btn:hover {
            color: #f8fafc;
          }
          .modal-body {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .helper-text {
            font-size: 14px;
            color: #94a3b8;
            margin: 0;
            line-height: 1.5;
          }
          .form-field {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .form-field label {
            font-size: 14px;
            font-weight: 600;
            color: #cbd5e1;
          }
          .form-field input,
          .form-field textarea,
          .form-field select {
            padding: 10px 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            background-color: rgba(0, 0, 0, 0.2);
            color: #f8fafc;
            font-family: inherit;
            transition: all 0.2s;
          }
          .form-field input:focus,
          .form-field textarea:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          }
          .form-row {
            display: flex;
            gap: 8px;
          }
          .form-row .form-field {
            flex: 1;
          }
          .modal-footer {
            padding: 16px 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            background-color: rgba(0, 0, 0, 0.1);
            border-bottom-left-radius: 16px;
            border-bottom-right-radius: 16px;
          }
          .btn {
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 96px;
            cursor: pointer;
            border: none;
            font-family: inherit;
            transition: all 0.2s;
          }
          .btn-cancel {
            background-color: transparent;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #cbd5e1;
          }
          .btn-cancel:hover {
            background-color: rgba(255, 255, 255, 0.05);
            color: #f8fafc;
          }
          .btn-submit {
            background-color: #3b82f6;
            color: white;
          }
          .btn-submit:hover:not(:disabled) {
            opacity: 1;
            background-color: #2563eb;
          }
          .btn-submit:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .status-msg {
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            margin-top: 12px;
          }
          .status-msg.success {
            background-color: rgba(21, 128, 61, 0.2);
            border: 1px solid rgba(21, 128, 61, 0.3);
            color: #4ade80;
          }
          .status-msg.error {
            background-color: rgba(185, 28, 28, 0.2);
            border: 1px solid rgba(185, 28, 28, 0.3);
            color: #f87171;
          }
          .status-msg.warning {
            background-color: rgba(180, 83, 9, 0.2);
            border: 1px solid rgba(180, 83, 9, 0.3);
            color: #fbbf24;
          }
          .honeypot-field {
            position: absolute !important;
            left: -9999px !important;
            top: -9999px !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          .security-banner {
            display: flex;
            gap: 8px;
            background-color: #fffbeb;
            border: 1px solid #fde68a;
            color: #92400e;
            padding: 16px;
            border-radius: 8px;
            font-size: 16px;
            line-height: 1.4;
            margin-bottom: 8px;
          }
          .security-banner svg {
            flex-shrink: 0;
            margin-top: 0px;
            color: #d97706;
          }
        </style>
        <div class="widget-container">
          <a class="widget-link" href="${statusPageUrl(frontendHost, pageId)}" target="_blank">
            <span class="status-dot"></span>
            <span class="status-text">Loading status...</span>
          </a>
          <span class="divider">|</span>
          <button class="report-trigger" title="Report Security Vulnerability" aria-label="Report Security Vulnerability">
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </button>
        </div>

        <div class="modal-overlay is-hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc">
          <div class="modal-content">
            <div class="modal-header">
              <h3 id="modal-title">
                <svg class="modal-title-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Report Security Threat
              </h3>
              <button class="close-btn" aria-label="Close dialog">&times;</button>
            </div>
            <div class="modal-body">
              <p id="modal-desc" class="helper-text">Transmit vulnerabilities directly to triage. Technical telemetry will be attached automatically.</p>

              <div class="security-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span><strong>Security Reminder:</strong> You are submitting a report from <strong><span id="domain-name">${window.location.hostname}</span></strong>. We will NEVER ask for passwords, API keys, or MFA codes.</span>
              </div>

              <div class="form-field honeypot-field" aria-hidden="true">
                <label for="vuln-bot-check">Please leave this field empty</label>
                <input type="text" id="vuln-bot-check" class="input-bot" tabindex="-1" autocomplete="off" />
              </div>

              <div class="form-field">
                <label for="vuln-title">Vulnerability Title</label>
                <input type="text" id="vuln-title" class="input-title" placeholder="Summary of threat..." />
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label for="vuln-severity">Severity</label>
                  <select id="vuln-severity" class="input-severity">
                    <option value="Low">Low</option>
                    <option value="Medium" selected>Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div class="form-field">
                  <label for="vuln-cve">CVE ID (Optional)</label>
                  <input type="text" id="vuln-cve" class="input-cve" placeholder="E.g. CVE-2026-12345" />
                </div>
              </div>

              <div class="form-field">
                <label for="vuln-desc">Description & Repro Steps</label>
                <textarea id="vuln-desc" class="input-desc" rows="4" placeholder="Detail how to reproduce the vulnerability..."></textarea>
              </div>

              <div class="status-msg is-hidden"></div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-cancel">Cancel</button>
              <button class="btn btn-submit">Submit Report</button>
            </div>
          </div>
        </div>
      `;

        const widgetLink = this.shadowRoot.querySelector('.widget-link');
        const dot = this.shadowRoot.querySelector('.status-dot');
        const text = this.shadowRoot.querySelector('.status-text');

        // Modal triggers
        const reportTrigger = this.shadowRoot.querySelector('.report-trigger');
        const modalOverlay = this.shadowRoot.querySelector('.modal-overlay');
        const closeBtn = this.shadowRoot.querySelector('.close-btn');
        const btnCancel = this.shadowRoot.querySelector('.btn-cancel');
        const btnSubmit = this.shadowRoot.querySelector('.btn-submit');
        const statusMsg = this.shadowRoot.querySelector('.status-msg');

        // Modal inputs
        const inputTitle = this.shadowRoot.querySelector('.input-title');
        const inputSeverity = this.shadowRoot.querySelector('.input-severity');
        const inputCve = this.shadowRoot.querySelector('.input-cve');
        const inputDesc = this.shadowRoot.querySelector('.input-desc');
        const inputBot = this.shadowRoot.querySelector('.input-bot');
        let dlpWarned = false;

        const toggleModal = () => {
          const visible = !modalOverlay.classList.contains('is-hidden');
          if (visible) {
            modalOverlay.classList.add('is-hidden');
            reportTrigger.focus();
          } else {
            modalOverlay.classList.remove('is-hidden');
            inputTitle.value = '';
            inputDesc.value = '';
            inputCve.value = '';
            inputBot.value = '';
            statusMsg.classList.add('is-hidden');
            btnSubmit.disabled = false;
            dlpWarned = false;
            setTimeout(() => {
              inputTitle.focus();
            }, 50);
          }
        };

        reportTrigger.addEventListener('click', toggleModal);
        closeBtn.addEventListener('click', toggleModal);
        btnCancel.addEventListener('click', toggleModal);

        // Trap focus and close on Escape (Section 508 / WCAG Compliance)
        this.shadowRoot.addEventListener('keydown', e => {
          if (modalOverlay.classList.contains('is-hidden')) return;

          if (e.key === 'Escape' || e.key === 'Esc') {
            toggleModal();
            e.preventDefault();
            return;
          }

          if (e.key === 'Tab') {
            const focusables = [
              closeBtn,
              inputTitle,
              inputSeverity,
              inputCve,
              inputDesc,
              btnCancel,
              btnSubmit,
            ];
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const activeEl = this.shadowRoot.activeElement;

            if (e.shiftKey) {
              if (activeEl === first) {
                last.focus();
                e.preventDefault();
              }
            } else {
              if (activeEl === last) {
                first.focus();
                e.preventDefault();
              }
            }
          }
        });

        const getBrowserThreatIndicators = () => {
          const indicators = {
            referrer: document.referrer || 'Direct',
            language: navigator.language,
            platform: navigator.platform,
            cores: navigator.hardwareConcurrency || 'N/A',
            memory_gb: navigator.deviceMemory || 'N/A',
            webdriver: navigator.webdriver ? true : false,
            plugins_count: navigator.plugins ? navigator.plugins.length : 0,
            visibility_state: document.visibilityState || 'visible',
            screen_color_depth: window.screen ? window.screen.colorDepth : 'N/A',
            network_connection: {},
          };

          try {
            if (navigator.connection) {
              const conn = navigator.connection;
              indicators.network_connection = {
                effective_type: conn.effectiveType,
                rtt_ms: conn.rtt,
                downlink_mbps: conn.downlink,
              };
            }
          } catch {}
          return indicators;
        };

        btnSubmit.addEventListener('click', async () => {
          const title = inputTitle.value.trim();
          const description = inputDesc.value.trim();
          if (!title || !description) return;

          // Honeypot check
          if (inputBot && inputBot.value !== '') {
            // Fake success to fool bots
            statusMsg.innerText = 'Threat reported successfully! Triage initiated.';
            statusMsg.className = 'status-msg success';
            statusMsg.classList.remove('is-hidden');
            setTimeout(toggleModal, 2000);
            return;
          }

          statusMsg.classList.add('is-hidden');

          // Non-blocking DLP check
          const dlpRegex = /(password|api[_-]?key|secret|sk-[a-zA-Z0-9]{20,})/i;
          let flagged_dlp = false;
          if (dlpRegex.test(description) || dlpRegex.test(title)) {
            flagged_dlp = true;
            if (!dlpWarned) {
              statusMsg.innerText =
                'Warning: Your report appears to contain sensitive credentials (e.g., password or API key). Please remove them. Click submit again to proceed anyway.';
              statusMsg.className = 'status-msg warning';
              statusMsg.classList.remove('is-hidden');
              dlpWarned = true;
              return;
            }
          }

          btnSubmit.disabled = true;

          let pageLoadTime = 0;
          let domInteractive = 0;
          let dnsLookup = 0;
          let fcpTime = 0;
          let protocol = 'unknown';
          try {
            const [navigation] = window.performance.getEntriesByType('navigation');
            if (navigation) {
              pageLoadTime = Math.round(navigation.loadEventEnd - navigation.startTime);
              domInteractive = Math.round(navigation.domInteractive - navigation.startTime);
              dnsLookup = Math.round(navigation.domainLookupEnd - navigation.domainLookupStart);
              protocol = navigation.nextHopProtocol || 'unknown';
            }
            const paints = window.performance.getEntriesByType('paint');
            const fcp = paints.find(p => p.name === 'first-contentful-paint');
            if (fcp) {
              fcpTime = Math.round(fcp.startTime);
            }
          } catch {}

          const payload = {
            title,
            description,
            cve_id: inputCve.value.trim() || undefined,
            customer_id: pageId, // Map page identifier as reporter reference
            severity: inputSeverity.value,
            telemetry_context: {
              origin_url: window.location.href,
              origin_hostname: window.location.hostname,
              flagged_dlp: flagged_dlp,
              userAgent: navigator.userAgent,
              client_ip: this.clientIp,
              reported_at: new Date().toISOString(),
              screen_resolution: `${window.screen.width}x${window.screen.height}`,
              viewport_size: `${window.innerWidth}x${window.innerHeight}`,
              recent_console_errors: recentErrors,
              performance_metrics: {
                page_load_time_ms: pageLoadTime,
                dom_interactive_time_ms: domInteractive,
                dns_lookup_time_ms: dnsLookup,
                first_contentful_paint_ms: fcpTime,
                next_hop_protocol: protocol,
              },
              threat_indicators: getBrowserThreatIndicators(),
            },
          };

          try {
            const res = await fetchWithTimeout(`${backendUrl}/api/v1/agent/vulnerabilities`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              timeout: 8000,
            });
            if (res.ok) {
              statusMsg.innerText = 'Threat reported successfully! Triage initiated.';
              statusMsg.className = 'status-msg success';
              statusMsg.classList.remove('is-hidden');
              setTimeout(toggleModal, 2000);
            } else {
              throw new Error('Server returned error status');
            }
          } catch {
            statusMsg.innerText = 'Failed to report threat. Please try again.';
            statusMsg.className = 'status-msg error';
            statusMsg.classList.remove('is-hidden');
            btnSubmit.disabled = false;
          }
        });

        // Automatically report client performance analytics to feed the Threat Analysis (TA) model
        const reportAnalyticsToTa = async () => {
          let responseTimeMs = 250; // Fallback default
          let fcpTime = 0;
          let protocol = 'unknown';
          try {
            const [navigation] = window.performance.getEntriesByType('navigation');
            if (navigation && navigation.loadEventEnd > 0) {
              responseTimeMs = Math.round(navigation.loadEventEnd - navigation.startTime);
              protocol = navigation.nextHopProtocol || 'unknown';
            } else if (window.performance.timing) {
              const t = window.performance.timing;
              if (t.loadEventEnd > 0 && t.navigationStart > 0) {
                responseTimeMs = t.loadEventEnd - t.navigationStart;
              }
            }
            const paints = window.performance.getEntriesByType('paint');
            const fcp = paints.find(p => p.name === 'first-contentful-paint');
            if (fcp) {
              fcpTime = Math.round(fcp.startTime);
            }
          } catch {}

          const telemetryPayload = {
            tenant_id: pageId,
            url: window.location.href,
            status_code: 200,
            response_time_ms: responseTimeMs,
            ip_address: this.clientIp,
            is_active: true,
            telemetry_context: {
              performance_metrics: {
                first_contentful_paint_ms: fcpTime,
                next_hop_protocol: protocol,
              },
              threat_indicators: getBrowserThreatIndicators(),
              global_agent_data: globalAgentData,
            },
          };

          try {
            // Send legacy payload to backend for threat analysis
            await fetchWithTimeout(`${backendUrl}/api/v1/telemetry/endpoints`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(telemetryPayload),
            });

            // Dynamically load OpenTelemetry SDK via ESM to send traces to OTel Collector
            try {
              const { WebTracerProvider } =
                await import('https://esm.sh/@opentelemetry/sdk-trace-web@1.24.1');
              const { OTLPTraceExporter } =
                await import('https://esm.sh/@opentelemetry/exporter-trace-otlp-http@0.51.1');
              const { BatchSpanProcessor } =
                await import('https://esm.sh/@opentelemetry/sdk-trace-base@1.24.1');

              const provider = new WebTracerProvider();

              // Dynamically read the collector URL from the script tag's data attribute, default to production domain
              const scriptTag =
                document.currentScript || document.querySelector('script[src*="widget.js"]');
              const otelUrl = scriptTag?.getAttribute('data-otel-url') ?? '';

              const exporter = new OTLPTraceExporter({
                url: otelUrl,
              });

              provider.addSpanProcessor(new BatchSpanProcessor(exporter));
              provider.register();

              const tracer = provider.getTracer('widget-telemetry');
              const span = tracer.startSpan('page_load');
              span.setAttribute('fcp_ms', fcpTime);
              span.setAttribute('response_time_ms', responseTimeMs);
              span.setAttribute('client_ip', this.clientIp);
              span.end();
            } catch (otelErr) {
              console.warn('Failed to initialize OpenTelemetry', otelErr);
            }
          } catch (e) {
            console.warn('Threat analysis telemetry reporting offline', e);
          }
        };

        // Trigger analytics report once page finishes loading completely (idle-optimized)
        if (document.readyState === 'complete') {
          runWhenIdle(() => reportAnalyticsToTa());
        } else {
          window.addEventListener('load', () => {
            runWhenIdle(() => reportAnalyticsToTa());
          });
        }

        // Fetch and cache status parameters defensively (5 minute TTL)
        const fetchStatus = async () => {
          const cacheKey = `deml_status_cache_v2_${pageId}`;
          try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
              const { data, timestamp } = JSON.parse(cached);
              if (Date.now() - timestamp < 300000) {
                // 5-minute TTL
                widgetLink.href = data.href;
                dot.style.backgroundColor = data.color;
                text.innerText = data.text;
                return;
              }
            }
          } catch {}

          try {
            let page = null;
            const slugApiUrl = `${backendUrl}/api/v1/system-status/status_pages/slug/${pageId}`;
            try {
              const res = await fetchWithTimeout(slugApiUrl);
              if (res.ok) {
                page = await res.json();
              }
            } catch (e) {
              // Network error, ignore and try fallback
            }

            if (!page) {
              // Fallback to fetching the list
              const listApiUrl = `${backendUrl}/api/v1/system-status/status_pages`;
              const res = await fetchWithTimeout(listApiUrl);
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                  page = data.find(p => p.id === pageId || p.slug === pageId);
                }
              }
            }

            if (page) {
              const href = statusPageUrl(frontendHost, page.slug);
              widgetLink.href = href;

              let color = 'var(--color-success, #10b981)';
              let textContent = 'All Systems Operational';

              try {
                const [incidentsRes, servicesRes] = await Promise.all([
                  fetchWithTimeout(
                    `${backendUrl}/api/v1/system-status/status_pages/${page.id}/incidents`,
                  ),
                  fetchWithTimeout(
                    `${backendUrl}/api/v1/system-status/status_pages/${page.id}/services`,
                  ),
                ]);

                if (incidentsRes.ok && servicesRes.ok) {
                  const incidents = await incidentsRes.json();
                  const services = await servicesRes.json();

                  if (Array.isArray(incidents) && Array.isArray(services)) {
                    const activeIncidents = incidents.filter(inc => inc.status !== 'Resolved');
                    const outages = services.filter(s => s.status === 'Outage');
                    const degraded = services.filter(s => s.status === 'Degraded');

                    if (activeIncidents.length > 0) {
                      color = 'var(--color-error, #ef4444)';
                      textContent = `Incident: ${activeIncidents[0].status}`;
                    } else if (outages.length > 0) {
                      color = 'var(--color-error, #ef4444)';
                      textContent = 'Service Outage';
                    } else if (degraded.length > 0) {
                      color = 'var(--color-warning, #f59e0b)';
                      textContent = 'Degraded Performance';
                    }
                  }
                }
              } catch (err) {
                console.warn('Failed to fetch incidents or services for widget', err);
              }

              dot.style.backgroundColor = color;
              text.innerText = textContent;

              try {
                sessionStorage.setItem(
                  cacheKey,
                  JSON.stringify({
                    data: { href, color, text: textContent },
                    timestamp: Date.now(),
                  }),
                );
              } catch {}
            } else {
              dot.style.backgroundColor = 'var(--color-error, #ef4444)';
              text.innerText = 'Status Page Not Found';
            }
          } catch (globalErr) {
            dot.style.backgroundColor = 'var(--text-muted, #94a3b8)';
            text.innerText = 'Status Unknown';
          }
        };

        fetchStatus();
      }
    },
  );

  // Auto-initialize legacy script-only installations
  const currentScript =
    document.currentScript || document.querySelector('script[src*="widget.js"]');
  if (currentScript && currentScript.hasAttribute('data-page-id')) {
    const pageId = currentScript.getAttribute('data-page-id');
    const backendUrl = currentScript.getAttribute('data-backend-url');
    const frontendUrl = currentScript.getAttribute('data-frontend-url');

    const widget = document.createElement('platform-widget');
    widget.setAttribute('data-page-id', pageId);
    if (backendUrl) {
      widget.setAttribute('data-backend-url', backendUrl);
    }
    if (frontendUrl) {
      widget.setAttribute('data-frontend-url', frontendUrl);
    }

    currentScript.parentNode.insertBefore(widget, currentScript.nextSibling);
  }
})();
