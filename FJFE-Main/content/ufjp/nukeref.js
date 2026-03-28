(() => {
	const targetHost = 'funnyjunk.com';
	const MODULE_KEY = 'ufjpNukeRef';
	const SETTINGS_KEY = 'fjTweakerSettings';
	const SETTING_FLAG = 'ufjp';
	const NUKE_BUTTON_ID = 'banConfirmBtn';
	const NUKE_PENDING_LABEL = 'Nuking...';

	let enabled = false;
	let refreshTimer = null;
	let refreshQueued = false;
	let buttonObserver = null;
	let bodyObserver = null;
	let observedButton = null;
	let pollTimer = null;
	let pollInterval = null;

	const isRuntimeFlagEnabled = (flagName, fallback = false) => {
		try {
			return window.fjfeRuntimeFlags?.isEnabled
				? window.fjfeRuntimeFlags.isEnabled(flagName, fallback)
				: Boolean(fallback);
		} catch (_) {
			return Boolean(fallback);
		}
	};

	const isTargetHost = () => {
		const host = window.location.hostname || '';
		return host === targetHost || host.endsWith(`.${targetHost}`);
	};

	const isPollingPath = () => {
		const path = window.location.pathname || '';
		if (path.startsWith('/sfw_mod/comments/')) return true;
		if (path.startsWith('/user/')) return true;
		return false;
	};

	const getStoredSettings = () => {
		try {
			const raw = localStorage.getItem(SETTINGS_KEY);
			if (!raw) return {};
			return JSON.parse(raw) || {};
		} catch (_) {
			return {};
		}
	};

	const scheduleRefresh = () => {
		if (!enabled || refreshQueued) return;
		refreshQueued = true;
		refreshTimer = window.setTimeout(() => {
			refreshQueued = false;
			refreshTimer = null;
			try {
				window.location.reload();
			} catch (_) {}
		}, 1000);
	};

	const shouldRefreshForButton = (button) => {
		if (!button) return false;
		const label = (button.textContent || '').trim();
		return label === NUKE_PENDING_LABEL || button.disabled === true;
	};

	const handleButtonState = (button) => {
		if (!enabled || refreshQueued) return;
		if (shouldRefreshForButton(button)) {
			scheduleRefresh();
		}
	};

	const ensureButtonObserver = () => {
		if (!enabled) return;
		const button = document.getElementById(NUKE_BUTTON_ID);
		if (!button) return;
		if (observedButton && observedButton !== button) {
			if (buttonObserver) {
				buttonObserver.disconnect();
				buttonObserver = null;
			}
			observedButton = null;
		}
		if (!buttonObserver) {
			buttonObserver = new MutationObserver(() => handleButtonState(button));
			buttonObserver.observe(button, { attributes: true, childList: true, characterData: true, subtree: true });
			observedButton = button;
			handleButtonState(button);
		}
	};

	const ensureObservers = () => {
		if (!enabled) return;
		ensureButtonObserver();
		if (!bodyObserver && document.body) {
			bodyObserver = new MutationObserver(() => {
				if (!enabled) return;
				ensureButtonObserver();
			});
			bodyObserver.observe(document.body, { childList: true, subtree: true });
		}
	};

	const stopObservers = () => {
		if (buttonObserver) {
			buttonObserver.disconnect();
			buttonObserver = null;
		}
		observedButton = null;
		if (bodyObserver) {
			bodyObserver.disconnect();
			bodyObserver = null;
		}
	};

	const startPolling = () => {
		if (!isPollingPath()) return;
		if (!isRuntimeFlagEnabled('timerHardening', true)) {
			if (pollInterval) return;
			pollInterval = window.setInterval(() => {
				if (!enabled || !isPollingPath()) return;
				ensureButtonObserver();
			}, 1500);
			return;
		}
		if (pollTimer) return;
		const poll = () => {
			pollTimer = null;
			if (!enabled || !isPollingPath()) return;
			ensureButtonObserver();
			if (!observedButton) {
				pollTimer = window.setTimeout(poll, 1500);
			}
		};
		pollTimer = window.setTimeout(poll, 0);
	};

	const stopPolling = () => {
		if (pollTimer) {
			clearTimeout(pollTimer);
			pollTimer = null;
		}
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	};

	const applySetting = (nextEnabled) => {
		enabled = Boolean(nextEnabled);
		if (enabled) {
			ensureObservers();
			startPolling();
		} else {
			stopObservers();
			stopPolling();
			if (refreshTimer) {
				clearTimeout(refreshTimer);
				refreshTimer = null;
				refreshQueued = false;
			}
		}
	};

	const handleSettingsChanged = (event) => {
		const detail = event?.detail || {};
		applySetting(detail[SETTING_FLAG]);
	};

	const init = () => {
		if (!isTargetHost()) return;
		const initial = (window.fjTweakerSettings || getStoredSettings() || {})[SETTING_FLAG];
		applySetting(initial);
		document.addEventListener('fjTweakerSettingsChanged', handleSettingsChanged);
	};

	if (!window.fjTweakerModules) {
		window.fjTweakerModules = {};
	}

	window.fjTweakerModules[MODULE_KEY] = { init };

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init, { once: true });
	} else {
		init();
	}
})();
