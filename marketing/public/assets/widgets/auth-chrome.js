/**
 * Marketing auth chrome — auth-bridge iframe + handoff so Log in / Sign up
 * flip to Settings / Sign out when deml.app has a live session.
 * Requires window.__DEML = { FRONTEND_URL, BACKEND_URL }.
 */
(() => {
	if (window.__DEML_MARKETING_AUTH_READY__ === true) {
		return;
	}
	window.__DEML_MARKETING_AUTH_READY__ = true;

	const AUTH_CACHE_TTL_MS = 60 * 60 * 1000;
	const AUTH_BRIDGE_ID = 'deml-auth-bridge';

	const config = () => window.__DEML ?? {};
	const frontendUrl = () => config().FRONTEND_URL || 'https://deml.app';
	const backendUrl = () => config().BACKEND_URL || '';

	const setVisible = (el, visible) => {
		if (!el) return;
		el.hidden = !visible;
		if (visible) {
			el.style.removeProperty('display');
		} else {
			el.style.setProperty('display', 'none', 'important');
		}
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
			localStorage.removeItem('deml_session_active');
		}
		return null;
	};

	const persistAuthCache = (status) => {
		if (status?.isAuthenticated) {
			localStorage.setItem(
				'deml_auth_status',
				JSON.stringify({ ...status, timestamp: Date.now() }),
			);
			localStorage.setItem(
				'deml_session_active',
				JSON.stringify({
					active: true,
					expires: Date.now() + AUTH_CACHE_TTL_MS,
					user: status.user,
				}),
			);
		}
	};

	const clearAuthStorage = () => {
		localStorage.removeItem('deml_auth_status');
		localStorage.removeItem('deml_session_active');
	};

	const updateAuthUI = (status) => {
		const loggedIn = status?.isAuthenticated === true;
		document.documentElement.dataset.authenticated = loggedIn ? 'true' : 'false';

		document.querySelectorAll('[data-anonymous-only]').forEach((el) => setVisible(el, !loggedIn));
		document.querySelectorAll('[data-authenticated-only]').forEach((el) => setVisible(el, loggedIn));

		window.dispatchEvent(
			new CustomEvent('deml:auth-state', {
				detail: { isAuthenticated: loggedIn, ...status },
			}),
		);
	};

	let iframeObservedAuthenticated = false;

	const applyTrustedAuthStatus = (status, source) => {
		if (status?.isAuthenticated) {
			if (source === 'iframe') {
				iframeObservedAuthenticated = true;
			}
			persistAuthCache(status);
			updateAuthUI(status);
			return;
		}
		if (
			source === 'iframe' &&
			!iframeObservedAuthenticated &&
			(readSessionActive() || readAuthCache())
		) {
			// Partitioned storage can make the deml.app iframe look anonymous.
			return;
		}
		if (!status?.isAuthenticated) {
			clearAuthStorage();
		}
		updateAuthUI(status);
	};

	const checkAuthHandoff = async () => {
		const urlParams = new URLSearchParams(window.location.search);
		const handoffToken = urlParams.get('session_handoff');
		const api = backendUrl();
		if (!handoffToken || !api) return;

		try {
			const res = await fetch(`${api}/api/v1/auth/handoff/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: handoffToken }),
			});
			if (res.ok) {
				const data = await res.json();
				if (data.status === 'success') {
					applyTrustedAuthStatus({ isAuthenticated: true, ...data }, 'handoff');
				}
			}
		} catch (e) {
			console.error('Failed to verify handoff token', e);
		}

		const cleanUrl = new URL(window.location.href);
		cleanUrl.searchParams.delete('session_handoff');
		window.history.replaceState({ path: cleanUrl.href }, '', cleanUrl.href);
	};

	const signOut = () => {
		clearAuthStorage();
		updateAuthUI({ isAuthenticated: false });
		const iframe = document.createElement('iframe');
		iframe.hidden = true;
		iframe.setAttribute('aria-hidden', 'true');
		iframe.tabIndex = -1;
		iframe.title = 'DEML sign-out bridge';
		iframe.src = `${frontendUrl()}/auth-bridge?action=signout&parent_origin=${encodeURIComponent(window.location.origin)}`;
		document.body.appendChild(iframe);
		window.setTimeout(() => iframe.remove(), 5000);
	};

	const bindSignOut = () => {
		document.querySelectorAll('[data-auth-signout]').forEach((btn) => {
			if (btn.dataset.bound === 'true') return;
			btn.dataset.bound = 'true';
			btn.addEventListener('click', (event) => {
				event.preventDefault();
				signOut();
			});
		});
	};

	const checkAuthViaIframe = () => {
		const cached = readAuthCache();
		const session = readSessionActive();
		if (session) {
			applyTrustedAuthStatus({ isAuthenticated: true, user: session.user }, 'session');
		} else if (cached) {
			applyTrustedAuthStatus(cached, 'cache');
		} else {
			updateAuthUI({ isAuthenticated: false });
		}

		const existing = document.getElementById(AUTH_BRIDGE_ID);
		const iframe =
			existing instanceof HTMLIFrameElement ? existing : document.createElement('iframe');
		iframe.id = AUTH_BRIDGE_ID;
		iframe.hidden = true;
		iframe.setAttribute('aria-hidden', 'true');
		iframe.tabIndex = -1;
		iframe.title = 'DEML authentication status bridge';
		if (!existing) {
			iframe.src = `${frontendUrl()}/auth-bridge?parent_origin=${encodeURIComponent(window.location.origin)}`;
			document.body.appendChild(iframe);
		}

		let mainOrigin = '';
		try {
			mainOrigin = new URL(frontendUrl()).origin;
		} catch {
			mainOrigin = '';
		}

		const onMessage = (event) => {
			if (!mainOrigin || event.origin !== mainOrigin || event.source !== iframe.contentWindow) {
				return;
			}
			if (event.data?.type === 'AUTH_STATUS') {
				applyTrustedAuthStatus(event.data, 'iframe');
			}
		};
		window.addEventListener('message', onMessage);

		const requestStatus = () => {
			iframe.contentWindow?.postMessage({ type: 'AUTH_STATUS_REQUEST' }, mainOrigin);
		};
		iframe.addEventListener('load', requestStatus);
		window.addEventListener('focus', requestStatus);
		window.addEventListener('pageshow', requestStatus);
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				requestStatus();
			}
		});
	};

	const init = () => {
		bindSignOut();
		updateAuthUI({ isAuthenticated: false });
		void checkAuthHandoff();
		checkAuthViaIframe();

		window.addEventListener('storage', (event) => {
			if (event.key !== 'deml_auth_status') return;
			if (event.newValue) {
				try {
					applyTrustedAuthStatus(JSON.parse(event.newValue), 'storage');
				} catch {
					clearAuthStorage();
					updateAuthUI({ isAuthenticated: false });
				}
				return;
			}
			updateAuthUI({ isAuthenticated: false });
		});
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init, { once: true });
	} else {
		init();
	}
})();
