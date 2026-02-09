(() => {
  /*
   * Hunt assistant overlay.
   * Lets mods capture comment links with a ctrl-activated crosshair,
   * track them in a draggable panel, and export a !hunt report.
   * Crosshair art/size and panel lock state persist via localStorage.
   */
  const MODULE_KEY = 'hunt';
  const SETTING_KEY = 'huntAssist';
  const SETTINGS_STORAGE_KEY = 'fjTweakerSettings';
  const PANEL_POSITION_KEY = 'fjTweakerHuntPanelPosition';
  const PANEL_LOCK_KEY = 'fjTweakerHuntPanelLocked';
  const PANEL_MARGIN = 12;
  const HUNTED_LINKS_KEY = 'fjTweakerHuntedLinks';
  const CUSTOM_CROSSHAIR_KEY = 'fjTweakerCustomCrosshair';
  const CROSSHAIR_SIZE_KEY = 'fjTweakerCrosshairSize';
  const DEFAULT_CROSSHAIR_SIZE = 40;
  const ASSIST_WRAPPER_ID = 'fj-assist-buttons';
  const ASSIST_ANCHOR_ATTR = 'fjAssistAnchor';
  const ASSIST_BUTTON_ID = 'fj-assist-hunt-button';
  const ASSIST_BUTTON_ORDER = 3;
  const ASSIST_ICON_PATH = 'icons/huntassist.png';
  const TOGGLE_STORAGE_KEY = 'fjTweakerHuntAssistToggle';
  const ASSIST_GLOW_COLOR = 'rgba(255, 96, 96, 0.75)';

  
  // Keep hunt-specific tooltip text from overflowing by forcing pre-line.
  const tooltipStyle = document.createElement('style');
  tooltipStyle.textContent = `
    .fj-hunt-tooltip-constrained {
      white-space: pre-line !important;
    }
  `;
  document.head.appendChild(tooltipStyle);

  const log = (...args) => {
    
  };

  // Utility: normalize scroll offsets for both fixed/absolute math.
  const getScrollOffsets = () => ({
    left: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0,
    top: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
  });

  const getPagePosition = (event) => {
    const { left, top } = getScrollOffsets();
    return {
      x: event.pageX !== undefined ? event.pageX : event.clientX + left,
      y: event.pageY !== undefined ? event.pageY : event.clientY + top
    };
  };

  let featureEnabled = false;
  let settingEnabled = false;
  let toggleEnabled = false;
  let panel = null;
  let lockButton = null;
  let panelPosition = null;
  let panelLocked = true;
  let dragState = null;
  let crosshairEl = null;
  let ctrlPressed = false;
  let lastMousePos = { x: 0, y: 0 };
  let cursorStyleEl = null;
  let currentHighlightedElement = null;
  let huntedLinks = [];
  let menuContentEl = null;
  let menuListEl = null;
  let copyButton = null;
  let copyStatusEl = null;
  let crosshairLocked = false;
  let crosshairRafId = 0;
  let pendingCrosshairPos = null;
  let lastCtrlPressTime = 0;
  const DOUBLE_TAP_DELAY = 400; 
  let customSubmenuEl = null;
  let customCrosshairSrc = null;
  let crosshairSize = DEFAULT_CROSSHAIR_SIZE;
  let isCommentsPage = false;

  const resolve = (p) => (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p;

  const getStoredSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (_) {
      return {};
    }
  };

  const isAssistElementVisible = (el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) === 0) return false;
    if (el.offsetParent === null && style.position !== 'fixed') return false;
    return true;
  };

  const findAssistSearchButton = () => {
    const selectors = [
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
    ];
    const candidates = [];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => candidates.push(el));
    });
    const visible = candidates.find(isAssistElementVisible);
    if (visible) return visible;
    return candidates[0] || null;
  };

  const isAssistCompressedAnchor = (searchButton) => (
    searchButton && (searchButton.classList.contains('fjse') || (searchButton.tagName === 'A' && searchButton.closest('.userbarBttn')))
  );

  const positionAssistCompressedWrapper = (wrapper, anchor) => {
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

  const applyAssistButtonStyling = (button, searchButton) => {
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
    button.style.transition = 'transform 120ms ease, box-shadow 180ms ease, filter 180ms ease';
    button.style.transformOrigin = 'center';
    if (!button.dataset.fjAssistPressBound) {
      button.dataset.fjAssistPressBound = '1';
      button.addEventListener('pointerdown', () => {
        button.style.transform = 'scale(0.92)';
      });
      ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((evt) => {
        button.addEventListener(evt, () => {
          button.style.transform = '';
        });
      });
    }
  };

  const applyAssistIconButtonStyling = (button, searchButton, options) => {
    if (!button) return;
    applyAssistButtonStyling(button, searchButton);
    if (!options) return;
    if (options.background) button.style.backgroundColor = options.background;
    if (options.border) button.style.borderColor = options.border;
    if (options.color) button.style.color = options.color;
    if (options.iconPath) {
      button.style.backgroundImage = `url(${resolve(options.iconPath)})`;
    }
  };

  const loadToggleEnabled = () => {
    try {
      return localStorage.getItem(TOGGLE_STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  };

  const persistToggleEnabled = () => {
    try {
      if (toggleEnabled) {
        localStorage.setItem(TOGGLE_STORAGE_KEY, '1');
      } else {
        localStorage.removeItem(TOGGLE_STORAGE_KEY);
      }
    } catch (_) {}
  };

  const setAssistButtonActive = (active) => {
    if (!assistButton) return;
    const baseShadow = assistButton.dataset.fjAssistBaseShadow || '';
    const baseFilter = assistButton.dataset.fjAssistBaseFilter || '';
    if (active) {
      assistButton.style.filter = 'brightness(1.2) saturate(1.1)';
      assistButton.style.boxShadow = `0 0 10px ${ASSIST_GLOW_COLOR}, 0 0 18px ${ASSIST_GLOW_COLOR}, ${baseShadow}`;
    } else {
      assistButton.style.filter = baseFilter;
      assistButton.style.boxShadow = baseShadow;
    }
  };

  const ensureAssistWrapper = () => {
    let wrapper = document.getElementById(ASSIST_WRAPPER_ID);
    const currentAnchor = document.querySelector('[data-fj-assist-anchor="1"]');
    let anchor = currentAnchor && isAssistElementVisible(currentAnchor) ? currentAnchor : null;
    if (!anchor) {
      anchor = findAssistSearchButton();
    }
    if (wrapper && anchor) {
      if (currentAnchor && currentAnchor !== anchor) {
        delete currentAnchor.dataset[ASSIST_ANCHOR_ATTR];
      }
      anchor.dataset[ASSIST_ANCHOR_ATTR] = '1';
      wrapper.style.marginLeft = '6px';
      wrapper.style.position = 'relative';
      wrapper.style.gap = '6px';
      wrapper.style.zIndex = '999';
      wrapper.style.overflow = 'visible';
      wrapper.style.paddingRight = '12px';
      wrapper.style.left = '';
      wrapper.style.top = '';
      anchor.insertAdjacentElement('afterend', wrapper);
      return { wrapper, anchor };
    }

    const searchButton = anchor || findAssistSearchButton();
    if (!searchButton) return null;

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = ASSIST_WRAPPER_ID;
      Object.assign(wrapper.style, {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        position: 'relative',
        marginLeft: '6px',
        verticalAlign: 'middle',
        overflow: 'visible',
        paddingRight: '12px'
      });
    }

    const previousAnchor = currentAnchor || document.querySelector('[data-fj-assist-anchor="1"]');
    if (previousAnchor && previousAnchor !== searchButton) {
      delete previousAnchor.dataset[ASSIST_ANCHOR_ATTR];
    }
    searchButton.dataset[ASSIST_ANCHOR_ATTR] = '1';
    wrapper.style.marginLeft = '6px';
    wrapper.style.position = 'relative';
    wrapper.style.gap = '6px';
    wrapper.style.zIndex = '999';
    wrapper.style.left = '';
    wrapper.style.top = '';
    searchButton.insertAdjacentElement('afterend', wrapper);

    return { wrapper, anchor: searchButton };
  };

  let assistButton = null;
  let assistRefreshScheduled = false;
  let assistRefreshBound = false;

  const scheduleAssistRefresh = () => {
    if (assistRefreshScheduled) return;
    assistRefreshScheduled = true;
    requestAnimationFrame(() => {
      assistRefreshScheduled = false;
      if (settingEnabled) {
        ensureAssistButton();
      }
    });
  };

  const bindAssistRefresh = () => {
    if (assistRefreshBound) return;
    assistRefreshBound = true;
    window.addEventListener('resize', scheduleAssistRefresh, { passive: true });
    window.addEventListener('scroll', scheduleAssistRefresh, { passive: true });
  };

  const ensureAssistButton = () => {
    const wrapperInfo = ensureAssistWrapper();
    if (!wrapperInfo) return;
    const { wrapper, anchor } = wrapperInfo;
    if (!assistButton) {
      assistButton = document.getElementById(ASSIST_BUTTON_ID);
    }
    if (!assistButton) {
      assistButton = document.createElement('button');
      assistButton.type = 'button';
      assistButton.id = ASSIST_BUTTON_ID;
      assistButton.setAttribute('aria-label', 'Hunt Assist');
      assistButton.setAttribute('title', 'Hunt Assist');
    }
    applyAssistIconButtonStyling(assistButton, anchor, {
      background: '#8b1d1d',
      border: '#5c1010',
      color: '#ffecec',
      iconPath: ASSIST_ICON_PATH
    });
    assistButton.style.order = String(ASSIST_BUTTON_ORDER);
    setAssistButtonActive(toggleEnabled);
    if (!wrapper.contains(assistButton)) {
      wrapper.appendChild(assistButton);
    }
    if (!assistButton.dataset.fjAssistBound) {
      assistButton.dataset.fjAssistBound = '1';
      assistButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleEnabled = !toggleEnabled;
        persistToggleEnabled();
        setAssistButtonActive(toggleEnabled);
        applySetting(settingEnabled);
      });
    }
  };

  const removeAssistButton = () => {
    const wrapper = document.getElementById(ASSIST_WRAPPER_ID);
    const anchor = document.querySelector('[data-fj-assist-anchor="1"]');
    if (assistButton && assistButton.parentElement) {
      assistButton.remove();
    }
    assistButton = null;
    if (wrapper && wrapper.children.length === 0) {
      if (anchor) {
        delete anchor.dataset[ASSIST_ANCHOR_ATTR];
      }
      wrapper.remove();
    }
  };

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  // Always know where the mouse is so ctrl toggles can immediately highlight.
  const trackMousePosition = (e) => {
    lastMousePos.x = e.clientX;
    lastMousePos.y = e.clientY;
  };

  // Persisted hunt entries survive reloads; pull them in at startup.
  const loadHuntedLinks = () => {
    try {
      const raw = localStorage.getItem(HUNTED_LINKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          huntedLinks = parsed;
        }
      }
    } catch (error) {
      log('Failed to load hunted links:', error);
    }
  };

  const saveHuntedLinks = () => {
    try {
      localStorage.setItem(HUNTED_LINKS_KEY, JSON.stringify(huntedLinks));
    } catch (error) {
      log('Failed to save hunted links:', error);
    }
  };

  // Remember the custom crosshair data URL and preferred size.
  const loadCustomCrosshair = () => {
    try {
      const savedSrc = localStorage.getItem(CUSTOM_CROSSHAIR_KEY);
      if (savedSrc) {
        customCrosshairSrc = savedSrc;
      }
      const sizeStr = localStorage.getItem(CROSSHAIR_SIZE_KEY);
      if (sizeStr) {
        const parsed = parseInt(sizeStr, 10);
        if (!isNaN(parsed) && parsed > 0) {
          crosshairSize = parsed;
        }
      }
    } catch (error) {
      log('Failed to load custom crosshair:', error);
    }
  };

  const saveCustomCrosshair = () => {
    try {
      if (customCrosshairSrc) {
        localStorage.setItem(CUSTOM_CROSSHAIR_KEY, customCrosshairSrc);
      } else {
        localStorage.removeItem(CUSTOM_CROSSHAIR_KEY);
      }
      localStorage.setItem(CROSSHAIR_SIZE_KEY, crosshairSize.toString());
    } catch (error) {
      log('Failed to save custom crosshair:', error);
    }
  };

  // Re-apply the latest uploaded crosshair art and size.
  const updateCrosshairImage = () => {
    if (crosshairEl) {
      const src = customCrosshairSrc || resolve('icons/crosshair.png');
      crosshairEl.src = src;
      crosshairEl.style.width = crosshairSize + 'px';
      crosshairEl.style.height = crosshairSize + 'px';
    }
  };

  // Remove the temporary outline + overlay injected during aim mode.
  const clearHighlight = () => {
    if (currentHighlightedElement) {
      currentHighlightedElement.style.outline = '';
      currentHighlightedElement.style.outlineOffset = '';
      currentHighlightedElement.style.position = '';
      if (currentHighlightedElement.dataset.fjHuntOriginalPos) {
        currentHighlightedElement.style.position = currentHighlightedElement.dataset.fjHuntOriginalPos;
        delete currentHighlightedElement.dataset.fjHuntOriginalPos;
      }
      const overlay = currentHighlightedElement.querySelector('.fj-hunt-overlay');
      if (overlay) {
        overlay.remove();
      }
      currentHighlightedElement = null;
    }
  };

  const highlightElement = (element) => {
    if (currentHighlightedElement === element) return;
    clearHighlight();
    currentHighlightedElement = element;
    
    
    element.style.outline = '2px solid rgba(255, 0, 0, 0.6)';
    element.style.outlineOffset = '-2px';
    
    
    const overlay = document.createElement('div');
    overlay.className = 'fj-hunt-overlay';
    Object.assign(overlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(255, 0, 0, 0.15)',
      pointerEvents: 'none',
      zIndex: '1'
    });
    
    
    const computedPos = window.getComputedStyle(element).position;
    if (computedPos === 'static') {
      element.dataset.fjHuntOriginalPos = 'static';
      element.style.position = 'relative';
    }
    
    element.appendChild(overlay);
  };

  const handleMouseOver = (e) => {
    if (!featureEnabled || !ctrlPressed) return;
    
    const commentEl = e.target.closest('.com');
    if (commentEl) {
      highlightElement(commentEl);
    }
  };

  const handleMouseOut = (e) => {
    if (!featureEnabled || !ctrlPressed) return;
    
    const commentEl = e.target.closest('.com');
    if (commentEl && currentHighlightedElement === commentEl) {
      clearHighlight();
    }
  };

  // When ctrl is active we hijack comment clicks to collect the permalink instead.
  const preventCommentClick = (e) => {
    if (!featureEnabled || !ctrlPressed) return;
    
    const commentEl = e.target.closest('.com');
    if (commentEl) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      
      const linkEl = commentEl.querySelector('a.bold.commentNumber[href]');
      if (linkEl) {
        const href = linkEl.getAttribute('href');
        if (href) {
          const fullLink = href.startsWith('http') ? href : 'https://funnyjunk.com' + href;
          addLinkToMenu(fullLink);
        }
      }
    }
  };

  const checkElementUnderMouse = () => {
    const elementUnderMouse = document.elementFromPoint(lastMousePos.x, lastMousePos.y);
    if (elementUnderMouse) {
      const commentEl = elementUnderMouse.closest('.com');
      if (commentEl) {
        highlightElement(commentEl);
      } else {
        clearHighlight();
      }
    }
  };

  const addLinkToMenu = (link) => {
    
    if (huntedLinks.some(item => item.link === link)) {
      return;
    }
    
    huntedLinks.push({ link, note: '' });
    saveHuntedLinks();
    updateMenuContent();
  };

  const removeLinkFromMenu = (index) => {
    huntedLinks.splice(index, 1);
    saveHuntedLinks();
    updateMenuContent();
  };

  const updateLinkNote = (index, note) => {
    if (huntedLinks[index]) {
      huntedLinks[index].note = note;
      saveHuntedLinks();
    }
  };

  // Generate the !hunt message the mods post in chat + copy it to the clipboard.
  const copyMenuContent = () => {
    let text = '!hunt\n';
    huntedLinks.forEach((item, index) => {
      const num = index + 1;
      if (item.note.trim()) {
        text += `${num}. ${item.link} - ${item.note}\n`;
      } else {
        text += `${num}. ${item.link}\n`;
      }
    });
    
    navigator.clipboard.writeText(text.trim()).then(() => {
      if (copyStatusEl) {
        copyStatusEl.textContent = 'Hunt list copied!';
        copyStatusEl.style.opacity = '1';
        setTimeout(() => {
          if (copyStatusEl) {
            copyStatusEl.style.opacity = '0';
          }
        }, 1400);
      }
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  // Rebuild the panel list whenever links or notes change.
  const updateMenuContent = () => {
    if (!menuContentEl) return;
    
    menuContentEl.innerHTML = '';
    menuListEl = document.createElement('div');
    Object.assign(menuListEl.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      maxHeight: '240px',
      overflowY: 'auto',
      paddingRight: '4px'
    });
    menuListEl.className = 'fjfe-hunt-scroll';
    
    const header = document.createElement('div');
    header.textContent = '!hunt';
    Object.assign(header.style, {
      fontWeight: '600',
      fontSize: '15px',
      marginBottom: '10px',
      color: '#f6f6f6'
    });
    menuContentEl.appendChild(header);
    
    
    huntedLinks.forEach((item, index) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '6px',
        marginBottom: '0',
        width: '100%',
        boxSizing: 'border-box',
        padding: '8px 8px 8px 6px',
        background: '#141414',
        border: '1px solid #242424',
        borderLeft: '4px solid #3b3b3b',
        borderRadius: '4px'
      });
      
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      Object.assign(deleteBtn.style, {
        width: '24px',
        height: '24px',
        fontSize: '14px',
        fontWeight: '700',
        color: '#fff',
        background: 'linear-gradient(180deg, #c13838 0%, #8d1c1c 55%, #5f0f0f 100%)',
        border: '1px solid #7a2626',
        borderRadius: '3px',
        cursor: 'pointer',
        padding: '0',
        lineHeight: '24px',
        flexShrink: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });
      deleteBtn.style.transition = 'transform 120ms ease';
      deleteBtn.style.transformOrigin = 'center';
      deleteBtn.addEventListener('pointerdown', () => {
        deleteBtn.style.transform = 'scale(0.94)';
      });
      ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((evt) => {
        deleteBtn.addEventListener(evt, () => {
          deleteBtn.style.transform = '';
        });
      });
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeLinkFromMenu(index);
      });
      
      
      const contentContainer = document.createElement('div');
      Object.assign(contentContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: '1',
        minWidth: '0'
      });
      
      
      const linkLine = document.createElement('div');
      Object.assign(linkLine.style, {
        fontSize: '12.5px',
        wordBreak: 'break-all',
        color: '#f6f6f6'
      });
      
      const numSpan = document.createElement('span');
      numSpan.textContent = `${index + 1}. `;
      linkLine.appendChild(numSpan);
      
      const linkAnchor = document.createElement('a');
      linkAnchor.href = item.link;
      linkAnchor.textContent = item.link;
      linkAnchor.target = '_blank';
      Object.assign(linkAnchor.style, {
        color: '#6af',
        textDecoration: 'none'
      });
      linkAnchor.addEventListener('mouseover', () => {
        linkAnchor.style.textDecoration = 'underline';
      });
      linkAnchor.addEventListener('mouseout', () => {
        linkAnchor.style.textDecoration = 'none';
      });
      linkLine.appendChild(linkAnchor);
      
      contentContainer.appendChild(linkLine);
      
      
      const noteRow = document.createElement('div');
      Object.assign(noteRow.style, {
        display: 'flex',
        alignItems: 'stretch',
        gap: '6px'
      });

      const noteInput = document.createElement('input');
      noteInput.type = 'text';
      noteInput.value = item.note;
      noteInput.placeholder = 'Add note...';
      Object.assign(noteInput.style, {
        width: '200px',
        height: '24px',
        padding: '4px 6px',
        background: '#2b2a2a',
        color: '#fff',
        border: '1px solid #444',
        borderRadius: '3px',
        fontSize: '11.5px',
        fontFamily: 'inherit',
        boxSizing: 'border-box'
      });
      noteInput.addEventListener('input', (e) => {
        updateLinkNote(index, e.target.value);
      });
      noteInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      noteInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
      });
      
      noteRow.appendChild(deleteBtn);
      noteRow.appendChild(noteInput);
      contentContainer.appendChild(noteRow);
      
      row.appendChild(contentContainer);
      menuListEl.appendChild(row);
    });
    menuContentEl.appendChild(menuListEl);
  };

  // Hide the native cursor while aim mode is active so only the crosshair is visible.
  const createCursorStyle = () => {
    if (cursorStyleEl) return cursorStyleEl;
    
    cursorStyleEl = document.createElement('style');
    cursorStyleEl.id = 'fj-hunt-cursor-style';
    cursorStyleEl.textContent = `
      body.fj-hunt-active,
      body.fj-hunt-active * {
        cursor: none !important;
      }
    `;
    document.head.appendChild(cursorStyleEl);
    return cursorStyleEl;
  };

  const removeCursorStyle = () => {
    if (cursorStyleEl && cursorStyleEl.parentNode) {
      cursorStyleEl.parentNode.removeChild(cursorStyleEl);
      cursorStyleEl = null;
    }
  };

  // Build the floating crosshair IMG once and reuse it between toggles.
  const createCrosshair = () => {
    if (crosshairEl) return crosshairEl;
    
    crosshairEl = document.createElement('img');
    Object.assign(crosshairEl.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483647',
      width: crosshairSize + 'px',
      height: crosshairSize + 'px',
      opacity: '0.8',
      display: 'none',
      transform: 'translate(-50%, -50%)',
      willChange: 'transform, left, top'
    });
    crosshairEl.draggable = false;
    crosshairEl.decoding = 'async';
    crosshairEl.loading = 'eager';
    crosshairEl.src = customCrosshairSrc || resolve('icons/crosshair.png');
    crosshairEl.onerror = function() { this.style.display = 'none'; };
    
    document.body.appendChild(crosshairEl);
    return crosshairEl;
  };

  const updateCrosshairPosition = (e) => {
    if (!crosshairEl || !ctrlPressed) return;

    pendingCrosshairPos = { x: e.clientX, y: e.clientY };
    if (crosshairRafId) return;
    crosshairRafId = requestAnimationFrame(() => {
      crosshairRafId = 0;
      if (!crosshairEl || !ctrlPressed || !pendingCrosshairPos) return;
      crosshairEl.style.left = pendingCrosshairPos.x + 'px';
      crosshairEl.style.top = pendingCrosshairPos.y + 'px';
    });
  };

  const showCrosshair = () => {
    if (!featureEnabled) return;
    const cursor = createCrosshair();
    
    
    cursor.style.left = lastMousePos.x + 'px';
    cursor.style.top = lastMousePos.y + 'px';
    cursor.style.display = 'block';
    
    createCursorStyle();
    document.body.classList.add('fj-hunt-active');
    document.addEventListener('mousemove', updateCrosshairPosition, { passive: true });
  };

  const hideCrosshair = () => {
    if (crosshairEl) {
      crosshairEl.style.display = 'none';
    }
    if (crosshairRafId) {
      cancelAnimationFrame(crosshairRafId);
      crosshairRafId = 0;
    }
    pendingCrosshairPos = null;
    document.body.classList.remove('fj-hunt-active');
    document.removeEventListener('mousemove', updateCrosshairPosition);
  };

  // ctrl press toggles the aiming mode; double-tap locks it on.
  const handleKeyDown = (e) => {
    if (!featureEnabled) return;
    if (e.key === 'Control') {
      if (crosshairLocked) {
        
        crosshairLocked = false;
        ctrlPressed = false;
        clearHighlight();
        hideCrosshair();
        lastCtrlPressTime = 0;
      } else if (!ctrlPressed) {
        const now = Date.now();
        const timeSinceLastPress = now - lastCtrlPressTime;
        
        
        if (timeSinceLastPress < DOUBLE_TAP_DELAY && timeSinceLastPress > 0) {
          
          crosshairLocked = true;
          ctrlPressed = true;
          showCrosshair();
          checkElementUnderMouse();
          lastCtrlPressTime = 0;
        } else {
          
          lastCtrlPressTime = now;
          ctrlPressed = true;
          showCrosshair();
          checkElementUnderMouse();
        }
      }
    }
  };

  const handleKeyUp = (e) => {
    if (!featureEnabled) return;
    if (e.key === 'Control') {
      if (!crosshairLocked && ctrlPressed) {
        ctrlPressed = false;
        clearHighlight();
        hideCrosshair();
      }
    }
  };

  const handleBlur = () => {
    if (!crosshairLocked && ctrlPressed) {
      ctrlPressed = false;
      clearHighlight();
      hideCrosshair();
    }
  };

  // Clean up the redundant pagination bar on comments pages so the panel has room.
  const removeTopPaginationElement = () => {
    
    const element = document.querySelector('div.f_New.selectedPeriod');
    if (element) {
      
      const hasNextSlider = element.querySelector('a.paginationSliderNext');
      const hasPrevSlider = element.querySelector('a.paginationSliderPrev');
      if (hasNextSlider && hasPrevSlider) {
        element.remove();
        log('Removed top pagination element');
      }
    }
  };

  const restoreTopPaginationElement = () => {
    
    
    log('Top pagination element will restore on next page load');
  };

  // Let moderators pin the hunt panel anywhere and remember that location.
  const loadPanelPosition = () => {
    try {
      const raw = localStorage.getItem(PANEL_POSITION_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      const left = Number(parsed.left);
      const top = Number(parsed.top);
      if (!Number.isFinite(left) || !Number.isFinite(top)) {
        return null;
      }
      return { left, top };
    } catch (error) {
      return null;
    }
  };

  const persistPanelPosition = () => {
    try {
      if (panelPosition && Number.isFinite(panelPosition.left) && Number.isFinite(panelPosition.top)) {
        localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify(panelPosition));
      } else {
        localStorage.removeItem(PANEL_POSITION_KEY);
      }
    } catch (error) {
    }
  };

  const loadPanelLocked = () => {
    try {
      const raw = localStorage.getItem(PANEL_LOCK_KEY);
      if (raw === null || raw === undefined) return true;
      return raw === '1' || raw === 'true';
    } catch (_) {
      return true;
    }
  };

  const persistPanelLocked = () => {
    try {
      localStorage.setItem(PANEL_LOCK_KEY, panelLocked ? '1' : '0');
    } catch (_) {}
  };

  // Prevent the panel from drifting off screen when dragging or scrolling.
  const clampPanelPosition = (left, top) => {
    if (!panel) {
      return { left, top };
    }
    const rect = panel.getBoundingClientRect();
    const fallbackWidth = 180;
    const fallbackHeight = 100;
    const width = rect.width || fallbackWidth;
    const height = rect.height || fallbackHeight;
    const { left: scrollLeft, top: scrollTop } = getScrollOffsets();
    if (panelLocked) {
      const maxLeft = Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
      const maxTop = Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);
      const clampedLeft = Math.min(Math.max(left, PANEL_MARGIN), maxLeft);
      const clampedTop = Math.min(Math.max(top, PANEL_MARGIN), maxTop);
      return { left: Math.round(clampedLeft), top: Math.round(clampedTop) };
    }
    const maxLeft = scrollLeft + Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
    const maxTop = scrollTop + Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);
    const clampedLeft = Math.min(Math.max(left, scrollLeft + PANEL_MARGIN), maxLeft);
    const clampedTop = Math.min(Math.max(top, scrollTop + PANEL_MARGIN), maxTop);
    return {
      left: Math.round(clampedLeft),
      top: Math.round(clampedTop)
    };
  };

  const applyPanelPosition = () => {
    if (!panel) {
      return;
    }
    if (!panelPosition) {
      if (panelLocked) {
        panel.style.position = 'fixed';
        panel.style.left = '';
        panel.style.top = '';
        panel.style.bottom = PANEL_MARGIN + 'px';
        panel.style.right = PANEL_MARGIN + 'px';
      } else {
        const { left: scrollLeft, top: scrollTop } = getScrollOffsets();
        const rect = panel.getBoundingClientRect();
        const width = rect.width || 180;
        const height = rect.height || 100;
        const defaultLeft = scrollLeft + Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
        const defaultTop = scrollTop + Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);
        panelPosition = clampPanelPosition(defaultLeft, defaultTop);
        panel.style.position = 'absolute';
        panel.style.left = panelPosition.left + 'px';
        panel.style.top = panelPosition.top + 'px';
        panel.style.bottom = '';
        panel.style.right = '';
      }
      return;
    }
    const clamped = clampPanelPosition(panelPosition.left, panelPosition.top);
    panelPosition = clamped;
    if (panelLocked) {
      panel.style.position = 'fixed';
      panel.style.left = clamped.left + 'px';
      panel.style.top = clamped.top + 'px';
      panel.style.bottom = '';
      panel.style.right = '';
    } else {
      panel.style.position = 'absolute';
      panel.style.left = clamped.left + 'px';
      panel.style.top = clamped.top + 'px';
      panel.style.bottom = '';
      panel.style.right = '';
    }
  };

  const removeGlobalDragListeners = () => {
    window.removeEventListener('pointermove', handleDragMove);
    window.removeEventListener('pointerup', finishDrag);
    window.removeEventListener('pointercancel', finishDrag);
  };

  const handleDragMove = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }
    stopPropagation(event);
    let nextLeft, nextTop;
    if (panelLocked) {
      nextLeft = dragState.originLeft + (event.clientX - dragState.startClientX);
      nextTop = dragState.originTop + (event.clientY - dragState.startClientY);
    } else {
      const { x, y } = getPagePosition(event);
      nextLeft = dragState.originLeft + (x - dragState.startPageX);
      nextTop = dragState.originTop + (y - dragState.startPageY);
    }
    const clamped = clampPanelPosition(nextLeft, nextTop);
    panelPosition = clamped;
    if (panelLocked) {
      panel.style.position = 'fixed';
      panel.style.left = clamped.left + 'px';
      panel.style.top = clamped.top + 'px';
    } else {
      panel.style.position = 'absolute';
      panel.style.left = clamped.left + 'px';
      panel.style.top = clamped.top + 'px';
    }
    panel.style.bottom = '';
    panel.style.right = '';
  };

  const finishDrag = (event) => {
    if (!dragState || (event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) {
      return;
    }
    stopPropagation(event);
    if (panel && typeof panel.releasePointerCapture === 'function' && dragState.pointerId !== undefined) {
      try {
        panel.releasePointerCapture(dragState.pointerId);
      } catch (error) {
      }
    }
    panelPosition = clampPanelPosition(panelPosition.left, panelPosition.top);
    applyPanelPosition();
    removeGlobalDragListeners();
    dragState = null;
    persistPanelPosition();
  };

  const startDrag = (event) => {
    if (!panel) {
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    stopPropagation(event);
    event.preventDefault();
    const rect = panel.getBoundingClientRect();
    panel.style.bottom = '';
    panel.style.right = '';
    const { left: scrollLeft, top: scrollTop } = getScrollOffsets();
    if (panelLocked) {
      const initialLeft = panelPosition ? panelPosition.left : rect.left;
      const initialTop = panelPosition ? panelPosition.top : rect.top;
      panelPosition = clampPanelPosition(initialLeft, initialTop);
      panel.style.position = 'fixed';
      panel.style.left = panelPosition.left + 'px';
      panel.style.top = panelPosition.top + 'px';
    } else {
      const initialLeft = panelPosition ? panelPosition.left : rect.left + scrollLeft;
      const initialTop = panelPosition ? panelPosition.top : rect.top + scrollTop;
      panelPosition = clampPanelPosition(initialLeft, initialTop);
      panel.style.position = 'absolute';
      panel.style.left = panelPosition.left + 'px';
      panel.style.top = panelPosition.top + 'px';
    }

    const startPosition = getPagePosition(event);

    dragState = {
      pointerId: event.pointerId,
      startPageX: startPosition.x,
      startPageY: startPosition.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originLeft: panelPosition.left,
      originTop: panelPosition.top
    };

    if (typeof panel.setPointerCapture === 'function' && dragState.pointerId !== undefined) {
      try {
        panel.setPointerCapture(dragState.pointerId);
      } catch (error) {
      }
    }

    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
  };

  const closeCustomSubmenu = () => {
    if (customSubmenuEl) {
      customSubmenuEl.style.display = 'none';
    }
  };

  const handleClickOutsideSubmenu = (e) => {
    if (customSubmenuEl && customSubmenuEl.style.display !== 'none') {
      
      const customButton = document.getElementById('fj-hunt-custom-button');
      
      if (!customButton || !customButton.contains(e.target)) {
        if (!customSubmenuEl.contains(e.target)) {
          closeCustomSubmenu();
          document.removeEventListener('click', handleClickOutsideSubmenu);
        }
      }
    }
  };

  const toggleCustomSubmenu = () => {
    if (!customSubmenuEl) {
      return; 
    }
    
    if (customSubmenuEl.style.display === 'none') {
      customSubmenuEl.style.display = 'flex';
      
      setTimeout(() => {
        document.addEventListener('click', handleClickOutsideSubmenu);
      }, 0);
    } else {
      customSubmenuEl.style.display = 'none';
      
      document.removeEventListener('click', handleClickOutsideSubmenu);
    }
  };

  // Tiny popover for uploading a crosshair or tweaking its size.
  const createCustomSubmenu = (headerEl) => {
    if (customSubmenuEl) return;
    
    customSubmenuEl = document.createElement('div');
    customSubmenuEl.className = 'fj-hunt-custom-submenu';
    Object.assign(customSubmenuEl.style, {
      display: 'none',
      position: 'absolute',
      top: '100%',
      right: '0',
      marginTop: '4px',
      padding: '3px 12px 12px',
      background: '#0d0d0d',
      border: '1px solid #333',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      zIndex: '2147483647',
      minWidth: '200px',
      flexDirection: 'column',
      gap: '10px'
    });
    
    
    ['pointerdown', 'mousedown', 'click'].forEach((eventName) => {
      customSubmenuEl.addEventListener(eventName, stopPropagation);
    });
    
    
    const previewContainer = document.createElement('div');
    const previewSize = Math.min(crosshairSize + 16, 200); 
    Object.assign(previewContainer.style, {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '8px',
      background: '#1a1a1a',
      borderRadius: '4px',
      width: previewSize + 'px',
      height: previewSize + 'px',
      overflow: 'hidden',
      margin: '0 auto',
      flexShrink: '0'
    });
    
    const previewImg = document.createElement('img');
    previewImg.id = 'fj-hunt-crosshair-preview';
    previewImg.src = customCrosshairSrc || resolve('icons/crosshair.png');
    previewImg.style.width = crosshairSize + 'px';
    previewImg.style.height = crosshairSize + 'px';
    previewImg.style.objectFit = 'contain';
    previewImg.style.flexShrink = '0';
    previewContainer.appendChild(previewImg);
    
    
    const buttonsContainer = document.createElement('div');
    Object.assign(buttonsContainer.style, {
      display: 'flex',
      gap: '8px',
      justifyContent: 'space-between'
    });
    
    
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset';
    Object.assign(resetBtn.style, {
      flex: '1',
      padding: '6px 12px',
      background: '#a11',
      color: '#fff',
      border: '1px solid #c33',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600'
    });
    resetBtn.style.transition = 'transform 120ms ease';
    resetBtn.style.transformOrigin = 'center';
    resetBtn.addEventListener('pointerdown', () => {
      resetBtn.style.transform = 'scale(0.96)';
    });
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((evt) => {
      resetBtn.addEventListener(evt, () => {
        resetBtn.style.transform = '';
      });
    });
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      customCrosshairSrc = '';
      crosshairSize = 40;
      saveCustomCrosshair();
      updateCrosshairImage();
      previewImg.src = resolve('icons/crosshair.png');
      previewImg.style.width = '40px';
      previewImg.style.height = '40px';
      
      const previewSize = Math.min(40 + 16, 200);
      previewContainer.style.width = previewSize + 'px';
      previewContainer.style.height = previewSize + 'px';
      const sizeInput = customSubmenuEl.querySelector('#fj-hunt-size-input');
      if (sizeInput) sizeInput.value = '40';
    });
    
    
    const uploadBtn = document.createElement('button');
    uploadBtn.textContent = 'Upload';
    Object.assign(uploadBtn.style, {
      flex: '1',
      padding: '6px 12px',
      background: '#1a5a1a',
      color: '#fff',
      border: '1px solid #2a7a2a',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600'
    });
    uploadBtn.style.transition = 'transform 120ms ease';
    uploadBtn.style.transformOrigin = 'center';
    uploadBtn.addEventListener('pointerdown', () => {
      uploadBtn.style.transform = 'scale(0.96)';
    });
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((evt) => {
      uploadBtn.addEventListener(evt, () => {
        uploadBtn.style.transform = '';
      });
    });
    
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        customCrosshairSrc = dataUrl;
        saveCustomCrosshair();
        updateCrosshairImage();
        previewImg.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
    
    uploadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
    
    buttonsContainer.append(resetBtn, uploadBtn);
    
    
    const sizeContainer = document.createElement('div');
    Object.assign(sizeContainer.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px'
    });
    
    const sizeLabel = document.createElement('label');
    sizeLabel.textContent = 'Size:';
    Object.assign(sizeLabel.style, {
      fontSize: '13px',
      color: '#a5a5a5'
    });
    
    const sizeInput = document.createElement('input');
    sizeInput.type = 'number';
    sizeInput.id = 'fj-hunt-size-input';
    sizeInput.value = crosshairSize;
    sizeInput.min = '10';
    Object.assign(sizeInput.style, {
      width: '45px',
      padding: '4px 6px',
      background: '#2b2a2a',
      color: '#f6f6f6',
      border: '1px solid #444',
      borderRadius: '4px',
      fontSize: '13px',
      outline: 'none',
      textAlign: 'center',
      MozAppearance: 'textfield' 
    });
    
    
    const style = document.createElement('style');
    style.textContent = `
      #fj-hunt-size-input::-webkit-inner-spin-button,
      #fj-hunt-size-input::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    `;
    document.head.appendChild(style);
    
    
    sizeInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        sizeInput.blur();
      }
    });
    
    
    const adjustInputWidth = () => {
      const len = sizeInput.value.length;
      sizeInput.style.width = Math.max(45, len * 10 + 25) + 'px';
    };
    
    sizeInput.addEventListener('input', adjustInputWidth);
    
    
    sizeInput.addEventListener('focus', () => {
      sizeInput.style.background = '#3a3939';
    });
    sizeInput.addEventListener('blur', () => {
      sizeInput.style.background = '#2b2a2a';
      const newSize = parseInt(sizeInput.value, 10);
      if (newSize >= 10) {
        crosshairSize = newSize;
        saveCustomCrosshair();
        updateCrosshairImage();
        previewImg.style.width = newSize + 'px';
        previewImg.style.height = newSize + 'px';
        
        const previewSize = Math.min(newSize + 16, 200);
        previewContainer.style.width = previewSize + 'px';
        previewContainer.style.height = previewSize + 'px';
      } else {
        sizeInput.value = crosshairSize;
      }
      adjustInputWidth();
    });
    
    const pxLabel = document.createElement('span');
    pxLabel.textContent = 'px';
    Object.assign(pxLabel.style, {
      fontSize: '13px',
      color: '#a5a5a5'
    });
    
    sizeContainer.append(sizeLabel, sizeInput, pxLabel);
    
    customSubmenuEl.append(previewContainer, buttonsContainer, sizeContainer, fileInput);
    headerEl.appendChild(customSubmenuEl);
  };

  // Build the draggable hunt panel lazily the first time it is needed.
  // Lazy-create the panel DOM so we do not pay the cost until the setting is on.
  const ensurePanel = () => {
    if (panel) {
      return;
    }

    panelPosition = loadPanelPosition();

    panel = document.createElement('div');
    panel.id = 'fj-hunt-menu';
    Object.assign(panel.style, {
      position: 'fixed',
      bottom: PANEL_MARGIN + 'px',
      top: 'auto',
      right: PANEL_MARGIN + 'px',
      width: '320px',
      padding: '5px 12px 12px',
      background: '#0d0d0d',
      color: '#f6f6f6',
      border: '1px solid #333',
      borderRadius: '6px',
      boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
      font: "400 15px 'Segoe UI', sans-serif",
      display: 'none',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      zIndex: '2147483646'
    });

    ['pointerdown', 'mousedown', 'click'].forEach((eventName) => {
      panel.addEventListener(eventName, (e) => {
        stopPropagation(e);
        
        const customButton = document.getElementById('fj-hunt-custom-button');
        if (customSubmenuEl && customSubmenuEl.style.display !== 'none') {
          if (!customSubmenuEl.contains(e.target) && (!customButton || !customButton.contains(e.target))) {
            closeCustomSubmenu();
            document.removeEventListener('click', handleClickOutsideSubmenu);
          }
        }
      });
    });

    const applyGlossyButtonStyle = (button, options = {}) => {
      if (!button) return;
      if (options.background) button.style.background = options.background;
      if (options.borderColor) button.style.borderColor = options.borderColor;
      if (options.color) button.style.color = options.color;
      button.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.35)';
    };

    const applyClickAnimation = (button) => {
      if (!button || button.dataset.fjClickAnimBound) return;
      button.dataset.fjClickAnimBound = '1';
      button.style.transition = button.style.transition
        ? `${button.style.transition}, transform 120ms ease`
        : 'transform 120ms ease';
      button.style.transformOrigin = 'center';
      button.addEventListener('pointerdown', () => {
        button.style.transform = 'scale(0.94)';
      });
      ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((evt) => {
        button.addEventListener(evt, () => {
          button.style.transform = '';
        });
      });
    };

    const ensureHuntScrollbarStyles = () => {
      if (document.getElementById('fjfe-hunt-scrollbar-style')) {
        return;
      }
      const style = document.createElement('style');
      style.id = 'fjfe-hunt-scrollbar-style';
      style.textContent = `
        .fjfe-hunt-scroll {
          scrollbar-width: thin;
          scrollbar-color: #6a6a6a transparent;
        }
        .fjfe-hunt-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .fjfe-hunt-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .fjfe-hunt-scroll::-webkit-scrollbar-thumb {
          background: #6a6a6a;
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `;
      document.head?.appendChild(style);
    };

    const header = document.createElement('div');
    Object.assign(header.style, {
      alignSelf: 'stretch',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      borderBottom: '1px solid #1f1f1f',
      padding: '0 0 2px',
      gap: '8px',
      position: 'relative'
    });

    const dragHandle = document.createElement('div');
    Object.assign(dragHandle.style, {
      cursor: 'move',
      width: '24px',
      height: '24px',
      userSelect: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto',
      marginRight: 'auto'
    });
    const dragImg = document.createElement('img');
    dragImg.src = resolve('icons/menu.png');
    dragImg.alt = '';
    Object.assign(dragImg.style, {
      width: '18px',
      height: '18px',
      objectFit: 'contain',
      opacity: '0.85'
    });
    dragHandle.appendChild(dragImg);
    dragHandle.addEventListener('pointerdown', startDrag);

    lockButton = document.createElement('button');
    Object.assign(lockButton.style, {
      width: '25px',
      height: '25px',
      lineHeight: '25px',
      textAlign: 'center',
      fontSize: '17px',
      border: '1px solid #3a3a3a',
      borderRadius: '4px',
      cursor: 'pointer',
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    lockButton.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 -1px 0 rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.35)';
    applyClickAnimation(lockButton);
    const applyLockButtonUI = () => {
      if (!lockButton) return;
      if (panelLocked) {
        lockButton.textContent = '🔓︎';
        lockButton.style.background = 'linear-gradient(180deg, #5a5a5a 0%, #2d2d2d 55%, #1f1f1f 100%)';
        lockButton.style.color = '#e0e0e0';
        lockButton.style.borderColor = '#3a3a3a';
        lockButton.title = 'Unlock position';
      } else {
        lockButton.textContent = '🔒︎';
        lockButton.style.background = 'linear-gradient(180deg, #8c8c8c 0%, #6a6a6a 55%, #515151 100%)';
        lockButton.style.color = '#1a1a1a';
        lockButton.style.borderColor = '#7a7a7a';
        lockButton.title = 'Lock position';
      }
    };
    lockButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const { left: scrollLeft, top: scrollTop } = getScrollOffsets();
      if (!panelPosition) {
        
        const rect = panel.getBoundingClientRect();
        panelPosition = panelLocked ? { left: rect.left, top: rect.top } : { left: rect.left + scrollLeft, top: rect.top + scrollTop };
      } else {
        if (panelLocked) {
          
          panelPosition = { left: panelPosition.left + scrollLeft, top: panelPosition.top + scrollTop };
        } else {
          
          panelPosition = { left: panelPosition.left - scrollLeft, top: panelPosition.top - scrollTop };
        }
      }
      panelLocked = !panelLocked;
      persistPanelLocked();
      applyLockButtonUI();
      applyPanelPosition();
      persistPanelPosition();
    });

    
    panelLocked = loadPanelLocked();
    applyLockButtonUI();

    copyButton = document.createElement('button');
    Object.assign(copyButton.style, {
      width: '25px',
      height: '25px',
      lineHeight: '25px',
      textAlign: 'center',
      fontSize: '14px',
      border: '1px solid #143462',
      borderRadius: '4px',
      cursor: 'pointer',
      flex: '0 0 auto',
      background: 'linear-gradient(180deg, #2f67c0 0%, #12438a 52%, #0c2f61 100%)',
      color: '#6af',
      padding: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    copyButton.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.35)';
    applyClickAnimation(copyButton);
    copyButton.title = 'Copy to clipboard';
    
    const copyImg = document.createElement('img');
    copyImg.src = resolve('icons/copy.png');
    copyImg.style.width = '16px';
    copyImg.style.height = '16px';
    copyImg.style.display = 'block';
    copyButton.appendChild(copyImg);
    
    copyButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      copyMenuContent();
    });

    const clearAllButton = document.createElement('button');
    Object.assign(clearAllButton.style, {
      width: '25px',
      height: '25px',
      lineHeight: '25px',
      textAlign: 'center',
      fontSize: '16px',
      fontWeight: '700',
      border: '1px solid #7a2626',
      borderRadius: '4px',
      cursor: 'pointer',
      flex: '0 0 auto',
      background: 'linear-gradient(180deg, #c13838 0%, #8d1c1c 55%, #5f0f0f 100%)',
      color: '#fff',
      padding: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    clearAllButton.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.35)';
    applyClickAnimation(clearAllButton);
    clearAllButton.textContent = '✕';
    clearAllButton.title = 'Clear all';
    
    clearAllButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      huntedLinks = [];
      saveHuntedLinks();
      updateMenuContent();
    });

    
    const infoButton = window.fjTweakerInfo?.createInfoButton
      ? window.fjTweakerInfo.createInfoButton({ text: '', size: 24, placement: 'bottom' })
      : (() => {
          const fallback = document.createElement('button');
          fallback.type = 'button';
          fallback.textContent = 'i';
          Object.assign(fallback.style, {
            width: '25px',
            height: '25px',
            font: "600 14px 'Segoe UI', sans-serif",
            color: '#f8f8f8',
            background: '#202020',
            border: '1px solid #2f2f2f',
            borderRadius: '50%',
            cursor: 'pointer',
            flexShrink: '0'
          });
          return fallback;
        })();
    applyClickAnimation(infoButton);
    
    
    const infoText = 'Hold ctrl to activate crosshair\nDouble-tap ctrl to toggle crosshair\nClick anywhere on red highlights to add to list';
    
    infoButton.addEventListener('mouseenter', () => {
      
      setTimeout(() => {
        const tooltip = infoButton._fjTooltip;
        if (tooltip) {
          tooltip.classList.add('fj-hunt-tooltip-constrained');
        }
      }, 0);
    });
    
    
    infoButton.dataset.fjInfoText = infoText;
    infoButton.title = '';

    const customButton = document.createElement('button');
    customButton.id = 'fj-hunt-custom-button';
    Object.assign(customButton.style, {
      width: '25px',
      height: '25px',
      lineHeight: '25px',
      textAlign: 'center',
      fontSize: '14px',
      border: '1px solid #3a3a3a',
      borderRadius: '4px',
      cursor: 'pointer',
      flex: '0 0 auto',
      background: 'linear-gradient(180deg, #4a4a4a 0%, #2b2b2b 55%, #1f1f1f 100%)',
      color: '#f6f6f6',
      padding: '0',
      position: 'relative'
    });
    customButton.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.35)';
    applyClickAnimation(customButton);
    customButton.title = 'Custom crosshair settings';
    
    const customImg = document.createElement('img');
    customImg.src = resolve('icons/custom.png');
    customImg.style.width = '16px';
    customImg.style.height = '16px';
    customImg.style.display = 'block';
    customImg.style.margin = 'auto';
    customButton.appendChild(customImg);
    
    customButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleCustomSubmenu();
    });

    copyStatusEl = document.createElement('div');
    Object.assign(copyStatusEl.style, {
      flex: '1 1 auto',
      minWidth: '0',
      textAlign: 'center',
      fontSize: '11px',
      fontWeight: '300',
      color: '#7fe07f',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      marginTop: '4px'
    });
    copyStatusEl.textContent = '';

    header.append(dragHandle, copyStatusEl, infoButton, customButton, clearAllButton, copyButton, lockButton);
    panel.append(header);

    
    createCustomSubmenu(header);

    
    menuContentEl = document.createElement('div');
    Object.assign(menuContentEl.style, {
      alignSelf: 'stretch',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      width: '100%'
    });
    ensureHuntScrollbarStyles();
    panel.append(menuContentEl);

    updateMenuContent();

    document.body.append(panel);
    applyPanelPosition();
  };

  const updatePanelVisibility = () => {
    if (!panel) {
      return;
    }
    
    const slickModule = window.fjTweakerModules && window.fjTweakerModules.slick;
    
    if (featureEnabled) {
      applyPanelPosition();
      if (slickModule && slickModule.openRateCounter) {
        slickModule.openRateCounter(panel);
      } else if (slickModule && slickModule.openTweakerMenu) {
        panel.style.display = 'flex';
        slickModule.openTweakerMenu(panel);
      } else {
        panel.style.display = 'flex';
        if (window.fjfeSlickAnimateIn) {
          window.fjfeSlickAnimateIn(panel);
        }
      }
    } else {
      if (slickModule && slickModule.closeRateCounter) {
        slickModule.closeRateCounter(panel);
      } else if (slickModule && slickModule.closeTweakerMenu) {
        slickModule.closeTweakerMenu(panel).then(() => {
          panel.style.display = 'none';
        });
      } else {
        panel.style.display = 'none';
      }
    }
  };

  const getSettingValue = () => {
    const settings = window.fjTweakerSettings || getStoredSettings();
    if (typeof settings[SETTING_KEY] === 'undefined') {
      return false;
    }
    return Boolean(settings[SETTING_KEY]);
  };

  const applySetting = (enabled) => {
    settingEnabled = Boolean(enabled);

    if (settingEnabled) {
      ensureAssistButton();
      bindAssistRefresh();
    } else {
      removeAssistButton();
    }

    const nextActive = settingEnabled && toggleEnabled;
    if (nextActive === featureEnabled) {
      if (isCommentsPage) {
        updatePanelVisibility();
      }
      return;
    }

    featureEnabled = nextActive;

    if (!isCommentsPage) {
      return;
    }

    ensurePanel();
    updatePanelVisibility();

    if (featureEnabled) {
      log('Hunt assist enabled');
      createCrosshair();
      createCursorStyle();
      removeTopPaginationElement();
      document.addEventListener('mousemove', trackMousePosition, { passive: true });
      document.addEventListener('mouseover', handleMouseOver, true);
      document.addEventListener('mouseout', handleMouseOut, true);
      document.addEventListener('click', preventCommentClick, true);
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('keyup', handleKeyUp, true);
      window.addEventListener('blur', handleBlur, true);
    } else {
      log('Hunt assist disabled');
      hideCrosshair();
      clearHighlight();
      ctrlPressed = false;
      crosshairLocked = false;
      removeCursorStyle();
      document.removeEventListener('mousemove', trackMousePosition);
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.removeEventListener('click', preventCommentClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleBlur, true);
    }
  };

  const handleSettingsChanged = (event) => {
    const detail = event.detail || {};
    if (typeof detail[SETTING_KEY] === 'undefined') {
      return;
    }
    applySetting(Boolean(detail[SETTING_KEY]));
  };

  // Sync panel contents + crosshair prefs across tabs via the storage event.
  const handleStorageChange = (e) => {
    if (e.key === HUNTED_LINKS_KEY) {
      
      loadHuntedLinks();
      if (menuContentEl) {
        updateMenuContent();
      }
    } else if (e.key === CUSTOM_CROSSHAIR_KEY || e.key === CROSSHAIR_SIZE_KEY) {
      
      loadCustomCrosshair();
      updateCrosshairImage();
      
      const previewImg = document.getElementById('fj-hunt-crosshair-preview');
      if (previewImg) {
        previewImg.src = customCrosshairSrc || resolve('icons/crosshair.png');
        previewImg.style.width = crosshairSize + 'px';
        previewImg.style.height = crosshairSize + 'px';
      }
      const sizeInput = document.getElementById('fj-hunt-size-input');
      if (sizeInput) {
        sizeInput.value = crosshairSize;
      }
    }
  };

  const init = () => {
    isCommentsPage = /^https?:\/\/(?:www\.)?funnyjunk\.com\/sfw_mod\/comments\//.test(window.location.href);
    toggleEnabled = loadToggleEnabled();
    applySetting(getSettingValue());
    document.addEventListener('fjTweakerSettingsChanged', handleSettingsChanged);
    window.addEventListener('storage', (event) => {
      if (event.key === TOGGLE_STORAGE_KEY) {
        toggleEnabled = event.newValue === '1';
        setAssistButtonActive(toggleEnabled);
        applySetting(settingEnabled);
      }
    });

    if (!isCommentsPage) {
      return;
    }

    loadHuntedLinks();
    loadCustomCrosshair();
    createCrosshair();

    ensurePanel();
    if (menuContentEl) {
      updateMenuContent();
    }
    window.addEventListener('storage', handleStorageChange);
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init };
})();
