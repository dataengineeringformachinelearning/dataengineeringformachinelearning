(function() {
  // Find the script tag that loaded this widget
  const currentScript = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.includes('widget.js')) {
        return scripts[i];
      }
    }
    return null;
  })();

  if (!currentScript) return;

  const pageId = currentScript.getAttribute('data-page-id');
  if (!pageId) {
    console.error('Widget missing data-page-id attribute');
    return;
  }

  // Dynamically resolve frontend host and backend URL
  const scriptUrl = new URL(currentScript.src);
  const frontendHost = scriptUrl.origin;
  
  let backendUrl = currentScript.getAttribute('data-backend-url');
  if (!backendUrl) {
    if (frontendHost.includes('localhost') || frontendHost.includes('127.0.0.1')) {
      backendUrl = 'http://localhost:8000';
    } else {
      backendUrl = 'https://backend.dataengineeringformachinelearning.com';
    }
  }

  // Create a Shadow Host element
  const host = document.createElement('div');
  host.style.display = 'inline-flex';
  host.style.verticalAlign = 'middle';
  
  // Attach shadow root to host
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Create styling for the shadow root
  const style = document.createElement('style');
  style.textContent = `
    .widget-link {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 9999px;
      text-decoration: none;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      transition: all 0.2s;
      cursor: pointer;
    }
    .widget-link:hover {
      background-color: #f8fafc;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #94a3b8; /* Slate grey for loading state */
      margin-right: 8px;
      display: inline-block;
    }
  `;

  // Create the widget container inside shadow DOM
  const widgetLink = document.createElement('a');
  widgetLink.className = 'widget-link';
  widgetLink.href = `${frontendHost}/status`;
  widgetLink.target = '_blank';

  const dot = document.createElement('span');
  dot.className = 'status-dot';

  const text = document.createElement('span');
  text.innerText = 'Loading status...';

  widgetLink.appendChild(dot);
  widgetLink.appendChild(text);

  shadowRoot.appendChild(style);
  shadowRoot.appendChild(widgetLink);

  // Insert the shadow host right after the script tag
  currentScript.parentNode.insertBefore(host, currentScript.nextSibling);

  // Fetch the latest status from our API
  const apiUrl = `${backendUrl}/api/v1/system-status/status_pages`;
  
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      // Find the specific page
      const page = data.find(p => p.id === pageId || p.slug === pageId);
      if (page) {
        // Point link to dedicated specific status page hosted by us
        widgetLink.href = `${frontendHost}/status/${page.slug}`;

        // Fetch incidents for the page to determine status
        const incidentsUrl = `${backendUrl}/api/v1/system-status/status_pages/${page.id}/incidents`;
        fetch(incidentsUrl)
          .then(res => res.json())
          .then(incidents => {
            const activeIncidents = incidents.filter(inc => inc.status !== 'Resolved');
            if (activeIncidents.length > 0) {
              const currentStatus = activeIncidents[0].status;
              dot.style.backgroundColor = '#ef4444'; // Red/Warning
              text.innerText = `Incident: ${currentStatus}`;
            } else {
              dot.style.backgroundColor = '#10b981'; // Green
              text.innerText = 'All Systems Operational';
            }
          })
          .catch(err => {
            console.error('Failed to load incidents for widget:', err);
            // Default to operational if page exists but incident check fails
            dot.style.backgroundColor = '#10b981'; 
            text.innerText = 'All Systems Operational';
          });
      } else {
        dot.style.backgroundColor = '#ef4444';
        text.innerText = 'Status Page Not Found';
      }
    })
    .catch(err => {
      console.error('Failed to load status for widget:', err);
      dot.style.backgroundColor = '#94a3b8'; // Grey out on error
      text.innerText = 'Status Unknown';
    });
})();
