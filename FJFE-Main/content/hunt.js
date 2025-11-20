(() => {
  const MODULE_KEY = 'hunt';
  const SETTING_KEY = 'huntAssist';
  const PANEL_POSITION_KEY = 'fjTweakerHuntPanelPosition';
  const PANEL_LOCK_KEY = 'fjTweakerHuntPanelLocked';
  const PANEL_MARGIN = 12;
  const HUNTED_LINKS_KEY = 'fjTweakerHuntedLinks';
  const CUSTOM_CROSSHAIR_KEY = 'fjTweakerCustomCrosshair';
  const CROSSHAIR_SIZE_KEY = 'fjTweakerCrosshairSize';
  const DEFAULT_CROSSHAIR_SIZE = 40;

  
  const tooltipStyle = document.createElement('style');
  tooltipStyle.textContent = `
    .fj-hunt-tooltip-constrained {
      white-space: pre-line !important;
    }
  `;
  document.head.appendChild(tooltipStyle);

  const log = (...args) => {
    
  };

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
  let copyButton = null;
  let crosshairLocked = false;
  let lastCtrlPressTime = 0;
  const DOUBLE_TAP_DELAY = 400; 
  let customSubmenuEl = null;
  let customCrosshairSrc = null;
  let crosshairSize = DEFAULT_CROSSHAIR_SIZE;

  const resolve = (p) => (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p;

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  const trackMousePosition = (e) => {
    lastMousePos.x = e.clientX;
    lastMousePos.y = e.clientY;
  };

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

  const updateCrosshairImage = () => {
    if (crosshairEl) {
      const src = customCrosshairSrc || resolve('icons/crosshair.png');
      crosshairEl.src = src;
      crosshairEl.style.width = crosshairSize + 'px';
      crosshairEl.style.height = crosshairSize + 'px';
    }
  };

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
      
      if (copyButton) {
        const originalBg = copyButton.style.background;
        copyButton.style.background = '#2a5a2a';
        setTimeout(() => {
          copyButton.style.background = originalBg;
        }, 200);
      }
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const updateMenuContent = () => {
    if (!menuContentEl) return;
    
    menuContentEl.innerHTML = '';
    
    
    const header = document.createElement('div');
    header.textContent = '!hunt';
    Object.assign(header.style, {
      fontWeight: '700',
      fontSize: '16px',
      marginBottom: '10px',
      color: '#f6f6f6'
    });
    menuContentEl.appendChild(header);
    
    
    huntedLinks.forEach((item, index) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '8px',
        width: '100%'
      });
      
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      Object.assign(deleteBtn.style, {
        width: '20px',
        height: '20px',
        fontSize: '14px',
        fontWeight: '700',
        color: '#fff',
        background: '#a11',
        border: '1px solid #c33',
        borderRadius: '3px',
        cursor: 'pointer',
        padding: '0',
        lineHeight: '20px',
        flexShrink: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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
        fontSize: '13px',
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
      
      
      const noteInput = document.createElement('input');
      noteInput.type = 'text';
      noteInput.value = item.note;
      noteInput.placeholder = 'Add note...';
      Object.assign(noteInput.style, {
        width: '200px',
        padding: '4px 6px',
        background: '#2b2a2a',
        color: '#fff',
        border: '1px solid #444',
        borderRadius: '3px',
        fontSize: '12px',
        fontFamily: 'inherit'
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
      
      contentContainer.appendChild(noteInput);
      
      row.appendChild(deleteBtn);
      row.appendChild(contentContainer);
      menuContentEl.appendChild(row);
    });
  };

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
    
    crosshairEl.style.left = e.clientX + 'px';
    crosshairEl.style.top = e.clientY + 'px';
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
    document.body.classList.remove('fj-hunt-active');
    document.removeEventListener('mousemove', updateCrosshairPosition);
  };

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
      padding: '12px',
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
      padding: '12px',
      background: '#0d0d0d',
      color: '#f6f6f6',
      border: '1px solid #333',
      borderRadius: '6px',
      boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
      font: "500 15px 'Segoe UI', sans-serif",
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

    const header = document.createElement('div');
    Object.assign(header.style, {
      alignSelf: 'stretch',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #1f1f1f',
      padding: '2px 0',
      gap: '8px',
      position: 'relative'
    });

    const dragHandle = document.createElement('div');
    Object.assign(dragHandle.style, {
      cursor: 'move',
      fontSize: '11px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: '#a5a5a5',
      userSelect: 'none',
      flex: '1 1 auto'
    });
    dragHandle.textContent = 'Drag';
    dragHandle.addEventListener('pointerdown', startDrag);

    lockButton = document.createElement('button');
    Object.assign(lockButton.style, {
      width: '24px',
      height: '24px',
      lineHeight: '24px',
      textAlign: 'center',
      fontSize: '14px',
      border: '1px solid #2f2f2f',
      borderRadius: '4px',
      cursor: 'pointer',
      flex: '0 0 auto'
    });
    const applyLockButtonUI = () => {
      if (!lockButton) return;
      if (panelLocked) {
        lockButton.textContent = '🔒︎';
        lockButton.style.background = '#142a14';
        lockButton.style.color = '#66cc66';
        lockButton.title = 'Locked to screen (toggle)';
      } else {
        lockButton.textContent = '🔓︎';
        lockButton.style.background = '#2a1515';
        lockButton.style.color = '#dd6666';
        lockButton.title = 'Moves with page (toggle)';
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
      width: '24px',
      height: '24px',
      lineHeight: '24px',
      textAlign: 'center',
      fontSize: '14px',
      border: '1px solid #2f2f2f',
      borderRadius: '4px',
      cursor: 'pointer',
      flex: '0 0 auto',
      background: '#1a3a5a',
      color: '#6af',
      padding: '0'
    });
    copyButton.title = 'Copy to clipboard';
    
    const copyImg = document.createElement('img');
    copyImg.src = resolve('icons/copy.png');
    copyImg.style.width = '16px';
    copyImg.style.height = '16px';
    copyImg.style.display = 'block';
    copyImg.style.margin = 'auto';
    copyButton.appendChild(copyImg);
    
    copyButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      copyMenuContent();
    });

    const clearAllButton = document.createElement('button');
    Object.assign(clearAllButton.style, {
      width: '24px',
      height: '24px',
      lineHeight: '24px',
      textAlign: 'center',
      fontSize: '16px',
      fontWeight: '700',
      border: '1px solid #2f2f2f',
      borderRadius: '4px',
      cursor: 'pointer',
      flex: '0 0 auto',
      background: '#a11',
      color: '#fff',
      padding: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
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
            width: '24px',
            height: '24px',
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
      width: '24px',
      height: '24px',
      lineHeight: '24px',
      textAlign: 'center',
      fontSize: '14px',
      border: '1px solid #2f2f2f',
      borderRadius: '4px',
      cursor: 'pointer',
      flex: '0 0 auto',
      background: '#2a2a2a',
      color: '#f6f6f6',
      padding: '0',
      position: 'relative'
    });
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

    header.append(dragHandle, infoButton, customButton, clearAllButton, copyButton, lockButton);
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
      if (slickModule && slickModule.openHuntAssist) {
        slickModule.openHuntAssist(panel);
      } else {
        panel.style.display = 'flex';
      }
    } else {
      if (slickModule && slickModule.closeHuntAssist) {
        slickModule.closeHuntAssist(panel);
      } else {
        panel.style.display = 'none';
      }
    }
  };

  const getSettingValue = () => {
    const settings = window.fjTweakerSettings || {};
    if (typeof settings[SETTING_KEY] === 'undefined') {
      return false;
    }
    return Boolean(settings[SETTING_KEY]);
  };

  const applySetting = (enabled) => {
    featureEnabled = enabled;

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
    
    const isCommentsPage = /^https?:\/\/(?:www\.)?funnyjunk\.com\/sfw_mod\/comments\//.test(window.location.href);
    if (!isCommentsPage) {
      return;
    }
    
    
    loadHuntedLinks();
    loadCustomCrosshair();
    
    ensurePanel();
    applySetting(getSettingValue());
    document.addEventListener('fjTweakerSettingsChanged', handleSettingsChanged);
    
    
    window.addEventListener('storage', handleStorageChange);
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init };
})();
