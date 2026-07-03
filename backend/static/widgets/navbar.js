/**
 * Shared navbar behavior for marketing + backend static pages.
 * Requires window.__DEML = { FRONTEND_URL, BACKEND_URL, MARKETING_URL } and viking-ui.css.
 */
(() => {
  const ICON_PATHS = window.__VIKING_ICON_PATHS ?? {};

  const svgIcon = (name, size = 16) => {
    const paths = ICON_PATHS[name] ?? ICON_PATHS.info ?? '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}" aria-hidden="true">${paths}</svg>`;
  };

  const setIcon = (el, name, size = 16) => {
    if (!el) return;
    el.innerHTML = svgIcon(name, size);
  };

  const initThemeToggle = () => {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    if (!themeBtn || !themeIcon) return;

    const updateThemeIcon = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setIcon(themeIcon, isDark ? 'sun' : 'moon', 24);
    };

    updateThemeIcon();
    themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      updateThemeIcon();
    });
  };

  const initMobileMenu = () => {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const menuIcon = document.getElementById('menu-icon');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!menuBtn || !menuIcon || !mobileMenu) return;

    menuBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('open');
      if (isOpen) {
        mobileMenu.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        setIcon(menuIcon, 'menu', 24);
      } else {
        mobileMenu.classList.add('open');
        menuBtn.setAttribute('aria-expanded', 'true');
        setIcon(menuIcon, 'x', 24);
      }
    });
  };

  const initAuth = () => {
    const config = window.__DEML ?? {};
    const BACKEND_URL = config.BACKEND_URL ?? config.API_BASE ?? '';
    const FRONTEND_URL = config.FRONTEND_URL ?? config.MAIN_APP ?? 'https://deml.app';

    const updateAuthUIFromStatus = (status) => {
      const isLoggedIn = status?.isAuthenticated === true;
      const desktopBtn = document.getElementById('auth-btn-desktop');
      const desktopIcon = document.getElementById('auth-icon-desktop');
      const desktopText = document.getElementById('auth-text-desktop');
      const mobileBtn = document.getElementById('auth-btn-mobile');
      const mobileIcon = document.getElementById('auth-icon-mobile');
      const mobileText = document.getElementById('auth-text-mobile');

      if (isLoggedIn) {
        if (desktopBtn && desktopIcon && desktopText) {
          desktopBtn.href = `${FRONTEND_URL}/dashboard`;
          setIcon(desktopIcon, 'home', 16);
          desktopText.textContent = 'Dashboard';
        }
        if (mobileBtn && mobileIcon && mobileText) {
          mobileBtn.href = `${FRONTEND_URL}/dashboard`;
          setIcon(mobileIcon, 'home', 16);
          mobileText.textContent = 'Dashboard';
        }
      } else {
        localStorage.removeItem('deml_session_active');
        localStorage.removeItem('deml_auth_status');
        if (desktopBtn && desktopIcon && desktopText) {
          desktopBtn.href = `${FRONTEND_URL}/login`;
          setIcon(desktopIcon, 'arrow-right', 16);
          desktopText.textContent = 'Sign In';
        }
        if (mobileBtn && mobileIcon && mobileText) {
          mobileBtn.href = `${FRONTEND_URL}/login`;
          setIcon(mobileIcon, 'arrow-right', 16);
          mobileText.textContent = 'Sign In';
        }
      }
    };

    const checkAuthHandoff = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const handoffToken = urlParams.get('session_handoff');
      if (handoffToken && BACKEND_URL) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/v1/auth/handoff/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: handoffToken }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'success') {
              const expiry = Date.now() + 24 * 60 * 60 * 1000;
              localStorage.setItem(
                'deml_session_active',
                JSON.stringify({ active: true, expires: expiry, user: data.user }),
              );
              updateAuthUIFromStatus({ isAuthenticated: true, ...data });
            }
          }
        } catch (e) {
          console.error('Failed to verify handoff token', e);
        }
        const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
      }

      const flag = localStorage.getItem('deml_session_active');
      if (flag) {
        try {
          const parsed = JSON.parse(flag);
          if (parsed.active && (!parsed.expires || Date.now() < parsed.expires)) {
            updateAuthUIFromStatus({ isAuthenticated: true, user: parsed.user });
          } else {
            localStorage.removeItem('deml_session_active');
          }
        } catch {
          if (flag === 'true') {
            updateAuthUIFromStatus({ isAuthenticated: true });
          } else {
            localStorage.removeItem('deml_session_active');
          }
        }
      }
    };

    const checkAuthViaIframe = () => {
      const cached = localStorage.getItem('deml_auth_status');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            updateAuthUIFromStatus(parsed);
            return;
          }
        } catch {
          /* ignore */
        }
      }

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `${FRONTEND_URL}/auth-status`;
      document.body.appendChild(iframe);

      const listener = (event) => {
        try {
          const mainOrigin = new URL(FRONTEND_URL).origin;
          if (
            event.origin !== mainOrigin &&
            !event.origin.includes('localhost') &&
            !event.origin.includes('127.0.0.1')
          ) {
            return;
          }
        } catch {
          if (!event.origin.includes('localhost') && !event.origin.includes('127.0.0.1')) return;
        }
        if (event.data?.type === 'AUTH_STATUS') {
          window.removeEventListener('message', listener);
          localStorage.setItem(
            'deml_auth_status',
            JSON.stringify({ ...event.data, timestamp: Date.now() }),
          );
          updateAuthUIFromStatus(event.data);
          iframe.remove();
        }
      };
      window.addEventListener('message', listener);
      setTimeout(() => {
        iframe.remove();
        window.removeEventListener('message', listener);
      }, 10000);
    };

    void checkAuthHandoff();
    checkAuthViaIframe();
  };

  const loadIconPaths = async () => {
    if (Object.keys(ICON_PATHS).length > 0) return;
    try {
      const res = await fetch('/assets/viking-icon-paths.json');
      if (res.ok) {
        window.__VIKING_ICON_PATHS = await res.json();
      }
    } catch {
      /* icons optional */
    }
  };

  const init = async () => {
    await loadIconPaths();
    initThemeToggle();
    initMobileMenu();
    initAuth();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void init());
  } else {
    void init();
  }

  window.DemlWidgets = window.DemlWidgets ?? {};
  window.DemlWidgets.initNavbar = init;
})();
