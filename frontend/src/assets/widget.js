(() => {
  if (customElements.get('platform-widget')) {
    // If already registered, only run the auto-initialization for this script if not already done
    const currentScript = document.currentScript;
    if (currentScript && currentScript.hasAttribute('data-page-id')) {
      const pageId = currentScript.getAttribute('data-page-id');
      const backendUrl = currentScript.getAttribute('data-backend-url');

      // Check if we already inserted the widget next to this script tag
      if (!currentScript.nextSibling || currentScript.nextSibling.nodeName !== 'PLATFORM-WIDGET') {
        const widget = document.createElement('platform-widget');
        widget.setAttribute('data-page-id', pageId);
        if (backendUrl) {
          widget.setAttribute('data-backend-url', backendUrl);
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
          honeypot.style.position = 'absolute';
          honeypot.style.left = '-9999px';
          honeypot.style.opacity = '0';
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

        // Resolve URLs
        const currentScript =
          document.currentScript || document.querySelector('script[src*="widget.js"]');
        const scriptOrigin = currentScript
          ? new URL(currentScript.src).origin
          : window.location.origin;

        const frontendHost =
          !scriptOrigin.includes('localhost') && !scriptOrigin.includes('127.0.0.1')
            ? 'https://deml.app'
            : scriptOrigin;

        const backendUrl =
          this.getAttribute('data-backend-url') ||
          (frontendHost.includes('localhost') || frontendHost.includes('127.0.0.1')
            ? 'http://localhost:8000'
            : 'https://backend.deml.app');

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
        <link rel="stylesheet" href="${frontendHost}/assets/widget.css">
        <div class="widget-container">
          <a class="widget-link" href="${frontendHost}/status/${pageId}" target="_blank">
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

        <div class="modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc">
          <div class="modal-content">
            <div class="modal-header">
              <h3 id="modal-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-error, #ef4444);" aria-hidden="true">
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

              <div class="status-msg" style="display: none;"></div>
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
          const visible = modalOverlay.style.display !== 'none';
          modalOverlay.style.display = visible ? 'none' : 'flex';
          if (!visible) {
            inputTitle.value = '';
            inputDesc.value = '';
            inputCve.value = '';
            inputBot.value = '';
            statusMsg.style.display = 'none';
            btnSubmit.disabled = false;
            dlpWarned = false;
            setTimeout(() => {
              inputTitle.focus();
            }, 50);
          } else {
            reportTrigger.focus();
          }
        };

        reportTrigger.addEventListener('click', toggleModal);
        closeBtn.addEventListener('click', toggleModal);
        btnCancel.addEventListener('click', toggleModal);

        // Trap focus and close on Escape (Section 508 / WCAG Compliance)
        this.shadowRoot.addEventListener('keydown', e => {
          const visible = modalOverlay.style.display !== 'none';
          if (!visible) return;

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
            statusMsg.style.display = 'block';
            setTimeout(toggleModal, 2000);
            return;
          }

          statusMsg.style.display = 'none';

          // Non-blocking DLP check
          const dlpRegex = /(password|api[_-]?key|secret|sk-[a-zA-Z0-9]{20,})/i;
          let flagged_dlp = false;
          if (dlpRegex.test(description) || dlpRegex.test(title)) {
            flagged_dlp = true;
            if (!dlpWarned) {
              statusMsg.innerText =
                'Warning: Your report appears to contain sensitive credentials (e.g., password or API key). Please remove them. Click submit again to proceed anyway.';
              statusMsg.className = 'status-msg warning';
              statusMsg.style.display = 'block';
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
              statusMsg.style.display = 'block';
              setTimeout(toggleModal, 2000);
            } else {
              throw new Error('Server returned error status');
            }
          } catch {
            statusMsg.innerText = 'Failed to report threat. Please try again.';
            statusMsg.className = 'status-msg error';
            statusMsg.style.display = 'block';
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
              const otelUrl =
                scriptTag?.getAttribute('data-otel-url') || 'https://telemetry.deml.app/v1/traces';

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
          const cacheKey = `deml_status_cache_${pageId}`;
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
              const href = `${frontendHost}/status/${page.slug}`;
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

    const widget = document.createElement('platform-widget');
    widget.setAttribute('data-page-id', pageId);
    if (backendUrl) {
      widget.setAttribute('data-backend-url', backendUrl);
    }

    currentScript.parentNode.insertBefore(widget, currentScript.nextSibling);
  }
})();
