(function() {
  // Find the script tag that loaded this widget
  const scripts = document.getElementsByTagName('script');
  let currentScript = null;
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.includes('widget.js')) {
      currentScript = scripts[i];
      break;
    }
  }

  if (!currentScript) return;

  const pageId = currentScript.getAttribute('data-page-id');
  if (!pageId) {
    console.error('Widget missing data-page-id attribute');
    return;
  }

  // Create the widget container
  const widgetContainer = document.createElement('a');
  widgetContainer.href = `https://dataengineeringformachinelearning.com/status/${pageId}`; // This would typically be dynamic or configurable
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
  dot.style.backgroundColor = '#10b981'; // Default to green (operational)
  dot.style.marginRight = '8px';
  dot.style.display = 'inline-block';

  // Create the text element
  const text = document.createElement('span');
  text.innerText = 'All Systems Operational'; // Default text

  // Append elements
  widgetContainer.appendChild(dot);
  widgetContainer.appendChild(text);

  // Insert the widget right after the script tag
  currentScript.parentNode.insertBefore(widgetContainer, currentScript.nextSibling);

  // Fetch the latest status from our API
  // Using a mock domain for the API call in this example, but it should be dynamic in production
  const apiUrl = `https://backend.dataengineeringformachinelearning.com/api/v1/system-status/status_pages`;
  
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      // Find the specific page
      const page = data.find(p => p.id === pageId || p.slug === pageId);
      if (page) {
        // If we had a specific status endpoint, we'd update color here.
        // For now, assume operational if the page exists.
        dot.style.backgroundColor = '#10b981'; 
        text.innerText = 'All Systems Operational';
        widgetContainer.href = `https://dataengineeringformachinelearning.com/status`;
      }
    })
    .catch(err => {
      console.error('Failed to load status for widget:', err);
      dot.style.backgroundColor = '#94a3b8'; // Grey out on error
      text.innerText = 'Status Unknown';
    });
})();
