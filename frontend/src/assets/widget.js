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

  // Create the widget container
  const widgetContainer = document.createElement('a');
  widgetContainer.href = `${frontendHost}/status`;
  widgetContainer.target = '_blank';
  widgetContainer.style.display = 'inline-flex';
  widgetContainer.style.alignItems = 'center';
  widgetContainer.style.padding = '6px 12px';
  widgetContainer.style.backgroundColor = '#ffffff';
  widgetContainer.style.border = '1px solid #e2e8f0';
  widgetContainer.style.borderRadius = '9999px';
  widgetContainer.style.textDecoration = 'none';
  widgetContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  widgetContainer.style.fontSize = '14px';
  widgetContainer.style.fontWeight = '500';
  widgetContainer.style.color = '#1e293b';
  widgetContainer.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
  widgetContainer.style.transition = 'all 0.2s';
  widgetContainer.style.cursor = 'pointer';

  // Hover effect
  widgetContainer.addEventListener('mouseenter', () => {
    widgetContainer.style.backgroundColor = '#f8fafc';
    widgetContainer.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
  });
  widgetContainer.addEventListener('mouseleave', () => {
    widgetContainer.style.backgroundColor = '#ffffff';
    widgetContainer.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
  });

  // Create the status indicator dot
  const dot = document.createElement('span');
  dot.style.width = '8px';
  dot.style.height = '8px';
  dot.style.borderRadius = '50%';
  dot.style.backgroundColor = '#94a3b8'; // Slate grey for initial loading state
  dot.style.marginRight = '8px';
  dot.style.display = 'inline-block';

  // Create the text element
  const text = document.createElement('span');
  text.innerText = 'Loading status...';

  // Append elements
  widgetContainer.appendChild(dot);
  widgetContainer.appendChild(text);

  // Insert the widget right after the script tag
  currentScript.parentNode.insertBefore(widgetContainer, currentScript.nextSibling);

  // Fetch the latest status from our API
  const apiUrl = `${backendUrl}/api/v1/system-status/status_pages`;
  
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      // Find the specific page
      const page = data.find(p => p.id === pageId || p.slug === pageId);
      if (page) {
        // Point link to specific page anchor
        widgetContainer.href = `${frontendHost}/status#${page.slug}`;

        // Fetch incidents for the page to determine status
        const incidentsUrl = `${backendUrl}/api/v1/system-status/status_pages/${page.id}/incidents`;
        fetch(incidentsUrl)
          .then(res => res.json())
          .then(incidents => {
            const activeIncidents = incidents.filter(inc => inc.status !== 'Resolved');
            if (activeIncidents.length > 0) {
              const currentStatus = activeIncidents[0].status; // Investigating, Identified, Monitoring
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
