(() => {
	const targetHost = 'funnyjunk.com';
	const MODULE_KEY = 'ufjpMobicon';
	const SETTINGS_KEY = 'fjTweakerSettings';
	const SETTING_FLAG = 'ufjp';
	const MOD_LIST_SELECTOR = '#onlineMod';
	const UPDATE_URL_FRAGMENT = '/ajax/ajaxModInfo';
	const MOBILE_ICON = '\uD83D\uDCF1';
	const NBSP = '\u00a0';

	let enabled = false;
	let patchApplied = false;
	let listObserver = null;
	let bodyObserver = null;
	let applyTimer = null;
	let observedContainer = null;
	const mobileMap = new Map();

	const isTargetHost = () => {
		const host = window.location.hostname || '';
		return host === targetHost || host.endsWith(`.${targetHost}`);
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

	const isUpdateUrl = (url) => {
		if (!url || typeof url !== 'string') return false;
		return url.includes(UPDATE_URL_FRAGMENT);
	};

	const extractName = (text) => {
		if (!text) return '';
		let cleaned = String(text).replace(/\u00a0/g, ' ');
		cleaned = cleaned.trim();
		if (!cleaned) return '';
		if (cleaned.startsWith(MOBILE_ICON)) {
			cleaned = cleaned.slice(MOBILE_ICON.length).trim();
		}
		return cleaned;
	};

	const hasMobileIcon = (text) => {
		if (!text) return false;
		return String(text).includes(MOBILE_ICON);
	};

	const rememberMobileNamesFromDom = () => {
		const container = document.querySelector(MOD_LIST_SELECTOR);
		if (!container) return;
		const anchors = container.querySelectorAll('a.uName');
		let sawIcon = false;
		const nextMap = new Map();
		anchors.forEach((anchor) => {
			const text = anchor.textContent || '';
			if (!hasMobileIcon(text)) return;
			const name = extractName(text);
			if (!name) return;
			sawIcon = true;
			nextMap.set(name.toLowerCase(), true);
		});
		if (sawIcon) {
			mobileMap.clear();
			nextMap.forEach((value, key) => {
				mobileMap.set(key, value);
			});
		}
	};

	const applyIcons = () => {
		if (!enabled) return;
		const container = document.querySelector(MOD_LIST_SELECTOR);
		if (!container) return;
		rememberMobileNamesFromDom();
		const anchors = container.querySelectorAll('a.uName');
		anchors.forEach((anchor) => {
			const name = extractName(anchor.textContent);
			if (!name) return;
			const isMobile = mobileMap.get(name.toLowerCase());
			if (!isMobile) return;
			if (hasMobileIcon(anchor.textContent)) return;
			anchor.textContent = `${NBSP}${MOBILE_ICON}${name}`;
		});
	};

	const scheduleApply = () => {
		if (!enabled) return;
		if (applyTimer) return;
		applyTimer = window.setTimeout(() => {
			applyTimer = null;
			applyIcons();
		}, 0);
	};

	const ensureListObserver = () => {
		if (!enabled) return;
		const container = document.querySelector(MOD_LIST_SELECTOR);
		if (!container) return;
		if (observedContainer && observedContainer !== container) {
			if (listObserver) {
				listObserver.disconnect();
				listObserver = null;
			}
			observedContainer = null;
		}
		if (!listObserver) {
			listObserver = new MutationObserver(() => scheduleApply());
			listObserver.observe(container, { childList: true, subtree: true });
			observedContainer = container;
			rememberMobileNamesFromDom();
			scheduleApply();
		}
	};

	const ensureObservers = () => {
		if (!enabled) return;
		ensureListObserver();
		if (!bodyObserver && document.body) {
			bodyObserver = new MutationObserver(() => {
				if (!enabled) return;
				ensureListObserver();
			});
			bodyObserver.observe(document.body, { childList: true, subtree: true });
		}
	};

	const stopObservers = () => {
		if (listObserver) {
			listObserver.disconnect();
			listObserver = null;
		}
		observedContainer = null;
		if (bodyObserver) {
			bodyObserver.disconnect();
			bodyObserver = null;
		}
	};

	const applyPatches = () => {
		if (patchApplied) return;
		patchApplied = true;

		const originalOpen = XMLHttpRequest.prototype.open;
		const originalSend = XMLHttpRequest.prototype.send;

		XMLHttpRequest.prototype.open = function(method, url, ...rest) {
			this._fjfeUfjpMobiconUrl = url;
			return originalOpen.call(this, method, url, ...rest);
		};

		XMLHttpRequest.prototype.send = function(...args) {
			if (!this._fjfeUfjpMobiconHooked) {
				this._fjfeUfjpMobiconHooked = true;
				this.addEventListener('load', () => {
					if (!enabled) return;
					const url = this._fjfeUfjpMobiconUrl || this.responseURL;
					if (!isUpdateUrl(url)) return;
					scheduleApply();
				});
			}
			return originalSend.apply(this, args);
		};

		if (window.fetch && !window.fetch._fjfeUfjpMobiconPatched) {
			const originalFetch = window.fetch;
			const wrappedFetch = function(...args) {
				const req = args[0];
				const url = typeof req === 'string' ? req : req?.url;
				const shouldCheck = isUpdateUrl(url);
				return originalFetch.apply(this, args).then((response) => {
					if (enabled && shouldCheck) {
						try {
							response.clone().text().then(() => scheduleApply()).catch(() => {});
						} catch (_) {}
					}
					return response;
				});
			};
			wrappedFetch._fjfeUfjpMobiconPatched = true;
			window.fetch = wrappedFetch;
		}
	};

	const applySetting = (nextEnabled) => {
		enabled = Boolean(nextEnabled);
		if (enabled) {
			applyPatches();
			rememberMobileNamesFromDom();
			ensureObservers();
			scheduleApply();
		} else {
			stopObservers();
			mobileMap.clear();
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
