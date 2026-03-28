(() => {
  const SEARCH_BUTTON_SELECTORS = Object.freeze([
    '.userbarBttn .fjse',
    '.userbarBttn a[title*="search" i]',
    '#sectionsNav .search-inner button.btn.btn-primary',
    '#sectionsNav .search-inner button[type="submit"]',
    '#sectionsNav .search-inner button',
    'button#searchBtn',
    'button.searchBtn',
    'button.searchButton',
    'button.search-btn',
    'button#searchButton',
    'input#searchBtn',
    'input.searchBtn',
    'form[action*="search"] button[type="submit"]',
    'form[action*="search"] input[type="submit"]',
    'form[action*="search"] button',
    'button[type="submit"][aria-label*="search" i]',
    'button[title*="search" i]',
    'button[class*="search" i]',
    'a[class*="search" i]',
    'a[title*="search" i]',
    'input[type="image"][alt*="search" i]'
  ]);

  const isElementVisible = (el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) === 0) return false;
    if (el.offsetParent === null && style.position !== 'fixed') return false;
    return true;
  };

  const findSearchButton = () => {
    const candidates = [];
    SEARCH_BUTTON_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => candidates.push(el));
    });
    const visible = candidates.find(isElementVisible);
    if (visible) return visible;
    return candidates[0] || null;
  };

  const isCompressedAnchor = (searchButton) => (
    searchButton && (searchButton.classList.contains('fjse') || (searchButton.tagName === 'A' && searchButton.closest('.userbarBttn')))
  );

  const positionCompressedWrapper = (wrapper, anchor) => {
    if (!wrapper || !anchor) return;
    const parent = anchor.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    const left = rect.right - parentRect.left + 4;
    const top = rect.top - parentRect.top - 7;
    wrapper.style.left = `${left}px`;
    wrapper.style.top = `${top}px`;
  };

  const applyButtonStyling = (button, searchButton, options = {}) => {
    if (!button || !searchButton) return;
    const searchStyle = window.getComputedStyle(searchButton);
    button.className = searchButton.className || '';
    if (searchButton.getAttribute('style')) {
      button.style.cssText = searchButton.getAttribute('style');
    }

    const sizeProps = ['width', 'height', 'minWidth', 'minHeight', 'padding', 'borderRadius', 'font', 'lineHeight'];
    sizeProps.forEach((prop) => {
      const value = searchStyle[prop];
      if (value && value !== 'auto') {
        button.style[prop] = value;
      }
    });

    button.style.display = 'inline-flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.overflow = 'visible';
    const size = parseFloat(searchStyle.height) || parseFloat(searchStyle.width) || 28;
    button.style.width = `${size}px`;
    button.style.height = `${size}px`;
    button.style.minWidth = `${size}px`;
    button.style.minHeight = `${size}px`;
    button.style.padding = '0';
    button.style.borderRadius = '6px';
    button.style.backgroundRepeat = 'no-repeat';
    button.style.backgroundPosition = 'center';
    button.style.backgroundSize = '70% 70%';
    if (!button.dataset.fjAssistBaseShadow) {
      button.dataset.fjAssistBaseShadow = 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)';
    }
    if (!button.dataset.fjAssistBaseFilter) {
      button.dataset.fjAssistBaseFilter = button.style.filter || '';
    }
    button.style.boxShadow = button.dataset.fjAssistBaseShadow;
    button.style.transition = options.transition || 'transform 120ms ease, box-shadow 180ms ease, filter 180ms ease';
    button.style.transformOrigin = 'center';

    if (options.transformGpu) {
      button.style.transform = 'translateZ(0)';
      button.style.backfaceVisibility = 'hidden';
      button.style.willChange = 'transform, box-shadow, filter';
    }

    if (!button.dataset.fjAssistPressBound) {
      button.dataset.fjAssistPressBound = '1';
      button.addEventListener('pointerdown', () => {
        button.style.transform = options.transformGpu ? 'translateZ(0) scale(0.92)' : 'scale(0.92)';
      });
      ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((evt) => {
        button.addEventListener(evt, () => {
          button.style.transform = options.transformGpu ? 'translateZ(0)' : '';
        });
      });
    }
  };

  const applyIconStyling = (button, searchButton, iconOptions = {}, styleOptions = {}) => {
    if (!button) return;
    applyButtonStyling(button, searchButton, styleOptions);
    if (iconOptions.background) button.style.backgroundColor = iconOptions.background;
    if (iconOptions.border) button.style.borderColor = iconOptions.border;
    if (iconOptions.color) button.style.color = iconOptions.color;
    if (iconOptions.iconUrl) {
      button.style.backgroundImage = `url(${iconOptions.iconUrl})`;
    }
  };

  window.fjfeAssistCommon = {
    selectors: SEARCH_BUTTON_SELECTORS,
    isElementVisible,
    findSearchButton,
    isCompressedAnchor,
    positionCompressedWrapper,
    applyButtonStyling,
    applyIconStyling
  };
})();

