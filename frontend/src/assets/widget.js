(() => {
  if (customElements.get('status-widget')) {
    // If already registered, only run the auto-initialization for this script if not already done
    const currentScript = document.currentScript;
    if (currentScript && currentScript.hasAttribute('data-page-id')) {
      const pageId = currentScript.getAttribute('data-page-id');
      const backendUrl = currentScript.getAttribute('data-backend-url');

      // Check if we already inserted the widget next to this script tag
      if (!currentScript.nextSibling || currentScript.nextSibling.nodeName !== 'STATUS-WIDGET') {
        const widget = document.createElement('status-widget');
        widget.setAttribute('data-page-id', pageId);
        if (backendUrl) {
          widget.setAttribute('data-backend-url', backendUrl);
        }
        currentScript.parentNode.insertBefore(widget, currentScript.nextSibling);
      }
    }
    return;
  }

  customElements.define(
    'status-widget',
    class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
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
            ? 'https://dataengineeringformachinelearning.com'
            : scriptOrigin;

        const backendUrl =
          this.getAttribute('data-backend-url') ||
          (frontendHost.includes('localhost') || frontendHost.includes('127.0.0.1')
            ? 'http://localhost:8000'
            : 'https://backend.dataengineeringformachinelearning.com');

        // Set up Shadow DOM structure
        this.shadowRoot.innerHTML = `
        <link rel="stylesheet" href="${frontendHost}/assets/widget.css">
        <div class="widget-container">
          <a class="widget-link" href="${frontendHost}/status/${pageId}" target="_blank">
            <span class="status-dot"></span>
            <span class="status-text">Loading status...</span>
          </a>
        </div>
      `;

        const widgetLink = this.shadowRoot.querySelector('.widget-link');
        const dot = this.shadowRoot.querySelector('.status-dot');
        const text = this.shadowRoot.querySelector('.status-text');

        // Fetch the latest status
        const apiUrl = `${backendUrl}/api/v1/system-status/status_pages`;
        try {
          const res = await fetch(apiUrl);
          const data = await res.json();
          const page = data.find(p => p.id === pageId || p.slug === pageId);
          if (page) {
            widgetLink.href = `${frontendHost}/status/${page.slug}`;

            try {
              const [incidentsRes, servicesRes] = await Promise.all([
                fetch(`${backendUrl}/api/v1/system-status/status_pages/${page.id}/incidents`),
                fetch(`${backendUrl}/api/v1/system-status/status_pages/${page.id}/services`),
              ]);
              const incidents = await incidentsRes.json();
              const services = await servicesRes.json();

              const activeIncidents = incidents.filter(inc => inc.status !== 'Resolved');
              const outages = services.filter(s => s.status === 'Outage');
              const degraded = services.filter(s => s.status === 'Degraded');

              if (activeIncidents.length > 0) {
                dot.style.backgroundColor = '#ef4444';
                text.innerText = `Incident: ${activeIncidents[0].status}`;
              } else if (outages.length > 0) {
                dot.style.backgroundColor = '#ef4444';
                text.innerText = 'Service Outage';
              } else if (degraded.length > 0) {
                dot.style.backgroundColor = '#f59e0b'; // Amber for degraded
                text.innerText = 'Degraded Performance';
              } else {
                dot.style.backgroundColor = '#10b981';
                text.innerText = 'All Systems Operational';
              }
            } catch {
              dot.style.backgroundColor = '#10b981';
              text.innerText = 'All Systems Operational';
            }
          } else {
            dot.style.backgroundColor = '#ef4444';
            text.innerText = 'Status Page Not Found';
          }
        } catch {
          dot.style.backgroundColor = '#94a3b8';
          text.innerText = 'Status Unknown';
        }
      }
    },
  );

  // Auto-initialize legacy script-only installations
  const currentScript =
    document.currentScript || document.querySelector('script[src*="widget.js"]');
  if (currentScript && currentScript.hasAttribute('data-page-id')) {
    const pageId = currentScript.getAttribute('data-page-id');
    const backendUrl = currentScript.getAttribute('data-backend-url');

    const widget = document.createElement('status-widget');
    widget.setAttribute('data-page-id', pageId);
    if (backendUrl) {
      widget.setAttribute('data-backend-url', backendUrl);
    }

    currentScript.parentNode.insertBefore(widget, currentScript.nextSibling);
  }
})();
