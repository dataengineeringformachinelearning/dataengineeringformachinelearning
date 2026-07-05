/**
 * Shared navbar behavior for marketing + backend static pages.
 * Requires window.__DEML = { FRONTEND_URL, BACKEND_URL, MARKETING_URL } and viking-ui.css.
 */
(() => {
  const AUTH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  const iconPaths = () => window.__VIKING_ICON_PATHS ?? {};
  const filledIconPaths = () => window.__VIKING_ICON_FILLED_PATHS ?? {};

  const closeStaticMobileMenu = () => {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!menuBtn || !mobileMenu) return;
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('hidden', 'true');
    mobileMenu.style.setProperty('display', 'none', 'important');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Toggle navigation menu');
    const menuIcon = menuBtn.querySelector('[data-viking-icon]');
    if (menuIcon) {
      menuIcon.setAttribute('data-viking-icon', 'menu');
      setIcon(menuIcon, 'menu', 24);
    }
  };

  const resolveIconColor = color => {
    if (color === 'accent') return 'var(--viking-accent, var(--viking-teal-600))';
    if (color === 'muted') return 'var(--viking-text-muted, #777777)';
    return color || '';
  };

  const svgIcon = (name, size = 16, options = {}) => {
    const variant = options.variant ?? 'outline';
    const isFilled = variant === 'filled';
    const paths = isFilled
      ? (filledIconPaths()[name] ?? iconPaths()[name] ?? iconPaths().info ?? '')
      : (iconPaths()[name] ?? iconPaths().info ?? '');
    const color = resolveIconColor(options.color);
    const style = color ? ` style="color:${color}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isFilled ? 'currentColor' : 'none'}" stroke="${isFilled ? 'none' : 'currentColor'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}" aria-hidden="true"${style}>${paths}</svg>`;
  };

  const setIcon = (el, name, size = 16, options = {}) => {
    if (!el) return;
    el.innerHTML = svgIcon(name, size, options);
  };

  const initNavIcons = () => {
    document.querySelectorAll('[data-viking-icon]').forEach(el => {
      const name = el.getAttribute('data-viking-icon');
      const size = Number(el.getAttribute('data-viking-icon-size') || 16);
      const variant = el.getAttribute('data-viking-icon-variant') || 'outline';
      const color = el.getAttribute('data-viking-icon-color') || undefined;
      if (name) {
        setIcon(el, name, size, { variant, color });
      }
    });
  };

  const initThemeToggle = () => {
    if (document.querySelector('viking-theme-toggle-wc')) {
      return;
    }

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;

    const updateThemeIcon = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      themeBtn.innerHTML = svgIcon(isDark ? 'sun' : 'moon', 24);
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
    const mobileMenu = document.getElementById('mobile-menu');
    if (!menuBtn || !mobileMenu) return;

    menuBtn.setAttribute('aria-controls', 'mobile-menu');
    if (menuBtn.dataset.mobileMenuBound === 'true') {
      closeStaticMobileMenu();
      return;
    }
    menuBtn.dataset.mobileMenuBound = 'true';

    const menuIcon = menuBtn.querySelector('[data-viking-icon]');
    const setMobileMenuOpen = isOpen => {
      mobileMenu.classList.remove('open');
      if (isOpen) {
        mobileMenu.classList.add('open');
        mobileMenu.removeAttribute('hidden');
      }

      if (isOpen) {
        mobileMenu.style.removeProperty('display');
      } else {
        mobileMenu.setAttribute('hidden', 'true');
        mobileMenu.style.setProperty('display', 'none', 'important');
      }
      menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menuBtn.setAttribute(
        'aria-label',
        isOpen ? 'Close navigation menu' : 'Toggle navigation menu',
      );
      if (menuIcon) {
        menuIcon.setAttribute('data-viking-icon', isOpen ? 'x' : 'menu');
        setIcon(menuIcon, isOpen ? 'x' : 'menu', 24);
      } else {
        menuBtn.innerHTML = svgIcon(isOpen ? 'x' : 'menu', 24);
      }
    };

    const interactiveMenuTarget = target => {
      return target?.closest?.('a,button,viking-button-wc,viking-button,[role="button"]');
    };

    const closeMobileMenu = closeStaticMobileMenu;

    const closeOnDesktop = () => {
      if (window.innerWidth >= 768) {
        closeMobileMenu();
      }
    };

    let lastPressToggle = 0;
    const toggleFromEvent = event => {
      const now = Date.now();
      if (event.type === 'click' && now - lastPressToggle < 250) {
        return;
      }
      if (event.type === 'viking-press') {
        lastPressToggle = now;
      }
      event.preventDefault();
      const isOpen = mobileMenu.classList.contains('open');
      setMobileMenuOpen(!isOpen);
    };

    menuBtn.addEventListener('viking-press', toggleFromEvent);
    menuBtn.addEventListener('click', event => {
      if (event.target === menuBtn || menuBtn.contains(event.target)) {
        toggleFromEvent(event);
      }
    });

    const maybeCloseForEvent = event => {
      const target = event.target;
      if (!target) {
        return;
      }
      const interactiveTarget = interactiveMenuTarget(target);
      if (interactiveTarget) {
        closeMobileMenu();
      }
    };

    const eventPathContains = (event, node) => {
      if (!node) return false;
      const path =
        typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
      return path.includes(node);
    };

    document.addEventListener('click', event => {
      if (!mobileMenu.classList.contains('open')) return;
      if (!eventPathContains(event, mobileMenu) && !eventPathContains(event, menuBtn)) {
        closeMobileMenu();
      }
    });

    window.addEventListener('resize', closeOnDesktop);
    const desktopQuery =
      typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 768px)') : null;
    desktopQuery?.addEventListener?.('change', closeOnDesktop);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeMobileMenu();
      }
    });

    mobileMenu.addEventListener('click', maybeCloseForEvent);
    mobileMenu.addEventListener('viking-press', maybeCloseForEvent);

    closeMobileMenu();
  };

  const initSearchTrigger = () => {
    const trigger = document.getElementById('navbar-search-trigger');
    if (!trigger || trigger.dataset.searchBound === 'true') return;
    trigger.dataset.searchBound = 'true';

    const openSearch = () => {
      if (window.DemlWidgets?.openSearch) {
        window.DemlWidgets.openSearch();
        return;
      }
      const host = document.getElementById('autocomplete');
      if (host) {
        host.classList.add('algolia-autocomplete-open');
        host.setAttribute('aria-hidden', 'false');
      }
      window.DemlWidgets?.openSearch?.();
    };

    trigger.addEventListener('viking-press', openSearch);
    trigger.addEventListener('click', openSearch);
  };

  const initAuth = () => {
    const config = window.__DEML ?? {};
    const BACKEND_URL = config.BACKEND_URL ?? config.API_BASE ?? '';
    const FRONTEND_URL = config.FRONTEND_URL ?? config.MAIN_APP ?? 'https://deml.app';
    const parentOrigin = window.location.origin;

    const readSessionActive = () => {
      const raw = localStorage.getItem('deml_session_active');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.active && (!parsed.expires || Date.now() < parsed.expires)) {
          return parsed;
        }
        localStorage.removeItem('deml_session_active');
      } catch {
        if (raw === 'true') return { active: true };
        localStorage.removeItem('deml_session_active');
      }
      return null;
    };

    const readAuthCache = () => {
      const raw = localStorage.getItem('deml_auth_status');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (
          parsed.isAuthenticated &&
          parsed.timestamp &&
          Date.now() - parsed.timestamp < AUTH_CACHE_TTL_MS
        ) {
          return parsed;
        }
        localStorage.removeItem('deml_auth_status');
      } catch {
        localStorage.removeItem('deml_auth_status');
      }
      return null;
    };

    const persistAuthCache = status => {
      if (status?.isAuthenticated) {
        localStorage.setItem(
          'deml_auth_status',
          JSON.stringify({ ...status, timestamp: Date.now() }),
        );
      }
    };

    const clearAuthStorage = () => {
      localStorage.removeItem('deml_session_active');
      localStorage.removeItem('deml_auth_status');
    };

    const setNodeVisibility = (id, visible) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = !visible;
      if (visible) {
        el.style.removeProperty('display');
      } else {
        el.style.setProperty('display', 'none', 'important');
      }
    };

    const setSignOutVisible = visible => {
      for (const id of ['auth-signout-desktop', 'auth-signout-mobile']) {
        setNodeVisibility(id, visible);
      }
    };

    const setAuthButtonVisible = visible => {
      for (const id of ['auth-btn-desktop', 'auth-btn-mobile']) {
        setNodeVisibility(id, visible);
      }
    };

    const setSignOutBusy = busy => {
      for (const id of ['auth-signout-desktop', 'auth-signout-mobile']) {
        const el = document.getElementById(id);
        if (!el || el.hidden) continue;
        if (busy) {
          el.setAttribute('aria-busy', 'true');
          el.setAttribute('loading', 'true');
          el.setAttribute('disabled', '');
        } else {
          el.removeAttribute('aria-busy');
          el.removeAttribute('loading');
          el.removeAttribute('disabled');
        }
      }
    };

    const setAuthNavLinksVisible = visible => {
      document.querySelectorAll('[data-require-auth="true"]').forEach(el => {
        el.hidden = !visible;
        if (visible) {
          el.style.removeProperty('display');
        } else {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    };

    const setAuthButtonHref = (id, href) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName.toLowerCase() === 'viking-button-wc') {
        el.setAttribute('href', href);
      } else {
        el.href = href;
      }
    };

    const setAuthButtonLabel = (textId, iconId, label, iconName) => {
      const textEl = document.getElementById(textId);
      const iconEl = document.getElementById(iconId);
      if (textEl) textEl.textContent = label;
      const iconTarget = iconEl?.querySelector?.('[data-viking-icon]') ?? iconEl;
      if (iconTarget) setIcon(iconTarget, iconName, 16);
    };

    const updateAuthUIFromStatus = status => {
      const isLoggedIn = status?.isAuthenticated === true;

      if (isLoggedIn) {
        setAuthButtonVisible(true);
        setSignOutVisible(true);
        setAuthNavLinksVisible(true);
        setAuthButtonHref('auth-btn-desktop', `${FRONTEND_URL}/dashboard`);
        setAuthButtonHref('auth-btn-mobile', `${FRONTEND_URL}/dashboard`);
        setAuthButtonLabel('auth-text-desktop', 'auth-icon-desktop', 'Dashboard', 'home');
        setAuthButtonLabel('auth-text-mobile', 'auth-icon-mobile', 'Dashboard', 'home');
      } else {
        clearAuthStorage();
        setAuthButtonVisible(true);
        setSignOutVisible(false);
        setAuthNavLinksVisible(false);
        const loginHref = `${FRONTEND_URL}/login?returnUrl=${encodeURIComponent(window.location.href)}`;
        setAuthButtonHref('auth-btn-desktop', loginHref);
        setAuthButtonHref('auth-btn-mobile', loginHref);
        setAuthButtonLabel('auth-text-desktop', 'auth-icon-desktop', 'Sign In', 'arrow-right');
        setAuthButtonLabel('auth-text-mobile', 'auth-icon-mobile', 'Sign In', 'arrow-right');
      }
    };

    const signOut = () => {
      setSignOutBusy(true);
      closeStaticMobileMenu();
      clearAuthStorage();
      updateAuthUIFromStatus({ isAuthenticated: false });

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `${FRONTEND_URL}/auth-status?action=signout&parent_origin=${encodeURIComponent(parentOrigin)}`;
      document.body.appendChild(iframe);
      window.setTimeout(() => iframe.remove(), 5000);
      window.setTimeout(() => setSignOutBusy(false), 500);
    };

    const bindSignOutButtons = () => {
      for (const id of ['auth-signout-desktop', 'auth-signout-mobile']) {
        const btn = document.getElementById(id);
        if (!btn || btn.dataset.bound === 'true') continue;
        btn.dataset.bound = 'true';
        const handler = event => {
          event.preventDefault();
          signOut();
        };
        btn.addEventListener('viking-press', handler);
        if (btn.tagName.toLowerCase() !== 'viking-button-wc') {
          btn.addEventListener('click', handler);
        }
      }
    };

    const applyTrustedAuthStatus = (status, source) => {
      if (status?.isAuthenticated) {
        persistAuthCache(status);
        updateAuthUIFromStatus(status);
        return;
      }
      if (source === 'iframe' && (readSessionActive() || readAuthCache())) {
        return;
      }
      updateAuthUIFromStatus(status);
    };

    const checkAuthHandoff = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const handoffToken = urlParams.get('session_handoff');
      if (!handoffToken || !BACKEND_URL) return;

      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/auth/handoff/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: handoffToken }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            const expiry = Date.now() + AUTH_CACHE_TTL_MS;
            localStorage.setItem(
              'deml_session_active',
              JSON.stringify({ active: true, expires: expiry, user: data.user }),
            );
            applyTrustedAuthStatus({ isAuthenticated: true, ...data }, 'handoff');
          }
        }
      } catch (e) {
        console.error('Failed to verify handoff token', e);
      }

      const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    };

    const checkAuthViaIframe = () => {
      const cached = readAuthCache();
      const session = readSessionActive();
      if (session) {
        applyTrustedAuthStatus({ isAuthenticated: true, user: session.user }, 'session');
      } else if (cached) {
        applyTrustedAuthStatus(cached, 'cache');
      }

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `${FRONTEND_URL}/auth-status?parent_origin=${encodeURIComponent(parentOrigin)}`;
      document.body.appendChild(iframe);

      const listener = event => {
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
          applyTrustedAuthStatus(event.data, 'iframe');
        }
      };

      window.addEventListener('message', listener);
      window.setTimeout(() => {
        iframe.remove();
        window.removeEventListener('message', listener);
      }, 15000);
    };

    bindSignOutButtons();
    setAuthNavLinksVisible(false);
    setAuthButtonVisible(true);
    setSignOutVisible(false);
    void checkAuthHandoff();
    checkAuthViaIframe();

    window.addEventListener('storage', event => {
      if (event.key !== 'deml_auth_status') return;
      if (event.newValue) {
        try {
          applyTrustedAuthStatus(JSON.parse(event.newValue), 'storage');
        } catch {
          localStorage.removeItem('deml_auth_status');
          updateAuthUIFromStatus({ isAuthenticated: false });
        }
        return;
      }
      updateAuthUIFromStatus({ isAuthenticated: false });
    });
  };

  const loadIconPaths = async () => {
    if (Object.keys(iconPaths()).length > 0) return;
    try {
      const [pathsRes, filledRes] = await Promise.all([
        fetch('/assets/viking-icon-paths.json'),
        fetch('/assets/viking-icon-filled-paths.json'),
      ]);
      if (pathsRes.ok) {
        window.__VIKING_ICON_PATHS = await pathsRes.json();
      }
      if (filledRes.ok) {
        window.__VIKING_ICON_FILLED_PATHS = await filledRes.json();
      }
    } catch {
      /* icons optional */
    }
  };

  const init = async () => {
    await loadIconPaths();
    initNavIcons();
    initThemeToggle();
    initSearchTrigger();
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
