(() => {
	const targetHost = 'funnyjunk.com';
	const MODULE_KEY = 'disableButtons';
	const SETTINGS_KEY = 'fjTweakerSettings';
	const SETTING_FLAG = 'disableButtons';
	const PROTECTED_SELECTORS = [
		'#noIndexEasy',
		'[onclick*="forceIsMobile("]',
		'[title*="toggle mobile status" i][onclick]',
		'[onclick*="testAlert("]',
		'[onclick*="test alert"]',
		'[title*="test alert" i][onclick]'
	];

	let enabled = false;
	let bodyObserver = null;
	let applyTimer = null;

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

	const getButtons = () => {
		const seen = new Set();
		const collected = [];
		PROTECTED_SELECTORS.forEach((selector) => {
			document.querySelectorAll(selector).forEach((node) => {
				if (!seen.has(node)) {
					seen.add(node);
					collected.push(node);
				}
			});
		});
		return collected;
	};

	const findProtectedTarget = (target) => {
		if (!target || typeof target.closest !== 'function') {
			return null;
		}
		for (const selector of PROTECTED_SELECTORS) {
			const match = target.closest(selector);
			if (match) {
				return match;
			}
		}
		return null;
	};

	const blockButton = (button) => {
		if (!button) return;

		if (button.dataset.fjfeIndexStopBlocked !== '1') {
			button.dataset.fjfeIndexStopBlocked = '1';
			button.dataset.fjfeIndexStopPointerEvents = button.style.pointerEvents || '';
			button.dataset.fjfeIndexStopCursor = button.style.cursor || '';
			button.dataset.fjfeIndexStopOnclick = button.getAttribute('onclick') || '';
		}

		button.style.pointerEvents = 'none';
		button.style.cursor = 'not-allowed';
		button.setAttribute('aria-disabled', 'true');
		button.removeAttribute('onclick');
		button.onclick = null;
	};

	const restoreButton = (button) => {
		if (!button || button.dataset.fjfeIndexStopBlocked !== '1') return;

		button.style.pointerEvents = button.dataset.fjfeIndexStopPointerEvents || '';
		button.style.cursor = button.dataset.fjfeIndexStopCursor || '';

		const onclickValue = button.dataset.fjfeIndexStopOnclick || '';
		if (onclickValue) {
			button.setAttribute('onclick', onclickValue);
		} else {
			button.removeAttribute('onclick');
		}

		button.removeAttribute('aria-disabled');

		delete button.dataset.fjfeIndexStopBlocked;
		delete button.dataset.fjfeIndexStopPointerEvents;
		delete button.dataset.fjfeIndexStopCursor;
		delete button.dataset.fjfeIndexStopOnclick;
	};

	const syncButtons = () => {
		const buttons = getButtons();
		buttons.forEach((button) => {
			if (enabled) blockButton(button);
			else restoreButton(button);
		});
	};

	const scheduleSync = () => {
		if (applyTimer) return;
		applyTimer = window.setTimeout(() => {
			applyTimer = null;
			syncButtons();
		}, 0);
	};

	const interceptProtectedClick = (event) => {
		if (!enabled) return;
		const target = findProtectedTarget(event.target);
		if (!target) return;

		event.preventDefault();
		event.stopImmediatePropagation();
		event.stopPropagation();
	};

	const startObservers = () => {
		if (!document.body || bodyObserver) return;
		bodyObserver = new MutationObserver(() => scheduleSync());
		bodyObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['id', 'style', 'onclick'] });
	};

	const stopObservers = () => {
		if (!bodyObserver) return;
		bodyObserver.disconnect();
		bodyObserver = null;
	};

	const applySetting = (nextEnabled) => {
		enabled = Boolean(nextEnabled);

		if (enabled) {
			document.addEventListener('click', interceptProtectedClick, true);
			startObservers();
			scheduleSync();
			return;
		}

		document.removeEventListener('click', interceptProtectedClick, true);
		stopObservers();
		if (applyTimer) {
			clearTimeout(applyTimer);
			applyTimer = null;
		}
		syncButtons();
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
