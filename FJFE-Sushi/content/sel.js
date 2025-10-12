(() => {
  const extensionApi = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'sel';
  const SETTINGS_KEY = 'fjTweakerSettings';
  const DEFAULT_SETTINGS = {
    
    avoidNext: false,
    removeTwilight: true,
    customMessages: false,
    
    hideRateShortcuts: true,
    hideShortcuts: false,
    stopUsernamePopups: true,
    trackRates: false,
    modJSExtras: true,
    checkText: false,
    
  walcorn: false,
    
    autoplay: true
  };
  const HOME_ENTRY_TEXT = 'home';
  let homeMountObserver = null;

  const AUTOPLAY_LABEL_SELECTOR = 'label.disableAutoplay';
  const AUTOPLAY_INPUT_SELECTOR = `${AUTOPLAY_LABEL_SELECTOR} input[type="checkbox"]`;

  let siteAutoplayCheckbox = null;
  let siteAutoplayChangeHandler = null;
  let autoplayRowInput = null;
  let desiredAutoplayState = DEFAULT_SETTINGS.autoplay;
  let autoplayObserver = null;

  const stopAutoplayObserver = () => {
    if (autoplayObserver) {
      autoplayObserver.disconnect();
      autoplayObserver = null;
    }
  };

  const locateSiteAutoplayCheckbox = () => {
    const checkbox = document.querySelector(AUTOPLAY_INPUT_SELECTOR);
    if (!checkbox) {
      return null;
    }
    const label = checkbox.closest(AUTOPLAY_LABEL_SELECTOR);
    if (label && !label.dataset.fjTweakerAutoplayRelocated) {
      label.dataset.fjTweakerAutoplayRelocated = '1';
      label.style.display = 'none';
    }
    return checkbox;
  };

  const detachSiteAutoplayCheckbox = () => {
    if (siteAutoplayCheckbox && siteAutoplayChangeHandler) {
      siteAutoplayCheckbox.removeEventListener('change', siteAutoplayChangeHandler);
    }
    siteAutoplayCheckbox = null;
    siteAutoplayChangeHandler = null;
  };

  const ensureSiteAutoplayCheckbox = () => {
    if (siteAutoplayCheckbox && document.contains(siteAutoplayCheckbox)) {
      return siteAutoplayCheckbox;
    }

    detachSiteAutoplayCheckbox();

    const checkbox = locateSiteAutoplayCheckbox();
    if (!checkbox) {
      return null;
    }

    siteAutoplayCheckbox = checkbox;
    siteAutoplayChangeHandler = () => {
      const checked = Boolean(siteAutoplayCheckbox && siteAutoplayCheckbox.checked);
      desiredAutoplayState = checked;
      if (autoplayRowInput && autoplayRowInput.checked !== checked) {
        autoplayRowInput.checked = checked;
      }
    };
    siteAutoplayCheckbox.addEventListener('change', siteAutoplayChangeHandler, { passive: true });
    siteAutoplayChangeHandler();
    stopAutoplayObserver();

    return siteAutoplayCheckbox;
  };

  const applyAutoplaySetting = (checked) => {
    desiredAutoplayState = Boolean(checked);
    const checkbox = ensureSiteAutoplayCheckbox();
    if (!checkbox) {
      startAutoplayObserver();
      return;
    }

    if (checkbox.checked !== desiredAutoplayState) {
      checkbox.checked = desiredAutoplayState;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (autoplayRowInput && autoplayRowInput.checked !== checkbox.checked) {
      autoplayRowInput.checked = checkbox.checked;
    }
  };

  const startAutoplayObserver = () => {
    if (ensureSiteAutoplayCheckbox()) {
      return;
    }
    if (autoplayObserver || !document.body) {
      return;
    }
    autoplayObserver = new MutationObserver(() => {
      if (ensureSiteAutoplayCheckbox()) {
        applyAutoplaySetting(desiredAutoplayState);
      }
    });
    autoplayObserver.observe(document.body, { childList: true, subtree: true });
  };

  const handleTweakerSettingsAutoplay = (event) => {
    const detail = event.detail || {};
    if (typeof detail.autoplay === 'undefined') {
      return;
    }
    const nextState = Boolean(detail.autoplay);
    if (autoplayRowInput && autoplayRowInput.checked !== nextState) {
      autoplayRowInput.checked = nextState;
    }
    applyAutoplaySetting(nextState);
  };

  document.addEventListener('fjTweakerSettingsChanged', handleTweakerSettingsAutoplay);
  const loadStoredSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        return { ...DEFAULT_SETTINGS };
      }
      const parsed = JSON.parse(raw);
      
      if (typeof parsed.modJSExtras === 'undefined' && typeof parsed.modJSRecall !== 'undefined') {
        parsed.modJSExtras = Boolean(parsed.modJSRecall);
        delete parsed.modJSRecall;
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  };

  const persistSettings = (settings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
    }
  };

  const dispatchSettings = (settings) => {
    document.dispatchEvent(
      new CustomEvent('fjTweakerSettingsChanged', {
        detail: { ...settings }
      })
    );
  };

  const getLocalVersion = () => {
    try {
      return extensionApi?.runtime?.getManifest?.().version || '0.0.0';
    } catch (error) {
      return '0.0.0';
    }
  };


  const normalizeText = (value) => (value || '').trim().toLowerCase();

  const findHomeMount = () => {
    const topMenu = document.querySelector('#topME');
    if (topMenu) {
      const homeContainer = Array.from(topMenu.children).find((child) => {
        const link = child.querySelector('a');
        const strong = child.querySelector('strong');
        return (link && normalizeText(link.textContent) === HOME_ENTRY_TEXT) ||
          (strong && normalizeText(strong.textContent) === HOME_ENTRY_TEXT);
      });
      const anchor = homeContainer ? homeContainer.querySelector('a') : null;
      return { topMenu, homeContainer, anchor };
    }

    const fallbackStrong = Array.from(document.querySelectorAll('strong')).find((node) => normalizeText(node.textContent) === HOME_ENTRY_TEXT);
    if (fallbackStrong) {
      const fallbackMount = fallbackStrong.closest('#topME') || fallbackStrong.closest('#mz') || fallbackStrong.closest('.bSideCo') || fallbackStrong.parentElement || fallbackStrong.closest('div');
      const fallbackAnchor = fallbackStrong.closest('a');
      return { topMenu: fallbackMount, homeContainer: fallbackStrong.parentElement || fallbackMount, anchor: fallbackAnchor };
    }

    return null;
  };

  const ensureHostContainer = (target) => {
    if (!target) {
      return null;
    }

    const { topMenu, homeContainer } = target;
    let host = document.querySelector('#fj-sel-host');

    if (!host) {
      host = document.createElement('div');
      host.id = 'fj-sel-host';
    }

    Object.assign(host.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      position: 'relative',
      flexWrap: 'wrap',
      margin: '0 0 6px 8px'
    });

    if (homeContainer && homeContainer.parentElement) {
      if (homeContainer.nextSibling !== host) {
        homeContainer.insertAdjacentElement('afterend', host);
      }
    } else if (topMenu && host.parentElement !== topMenu) {
      topMenu.append(host);
    } else if (!host.isConnected) {
      document.body.append(host);
    }

    return host;
  };

  const removeLegacyDocumentHandler = () => {
    if (window.fjTweakerSelDocHandler) {
      document.removeEventListener('click', window.fjTweakerSelDocHandler);
      delete window.fjTweakerSelDocHandler;
    }
  };

  const attachUI = (settings) => {
    if (document.querySelector('#fj-sel-toggle')) {
      return true;
    }

    removeLegacyDocumentHandler();

    const target = findHomeMount();
    if (!target) {
      return false;
    }

    const host = ensureHostContainer(target);
    if (!host) {
      return false;
    }

    host.textContent = '';

    const toggleButton = document.createElement('button');
    toggleButton.id = 'fj-sel-toggle';
    toggleButton.type = 'button';
  toggleButton.textContent = 'MOD UI';
    Object.assign(toggleButton.style, {
      padding: '8px 12px',
      minHeight: '44px',
      minWidth: '44px',
      font: "500 12px 'Segoe UI', sans-serif",
      color: '#f8f8f8',
      background: '#303030',
      border: '1px solid #555',
      borderRadius: '4px',
      cursor: 'pointer',
      lineHeight: '1.2',
      flexShrink: '0',
      touchAction: 'manipulation'
    });
    toggleButton.setAttribute('aria-haspopup', 'true');
    toggleButton.setAttribute('aria-expanded', 'false');

    host.append(toggleButton);

    const existingOverlay = document.querySelector('#fj-sel-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'fj-sel-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'transparent',
      display: 'none',
      padding: '0',
      zIndex: '2147483647'
    });
    overlay.setAttribute('role', 'presentation');
    overlay.setAttribute('aria-hidden', 'true');

    const menu = document.createElement('div');
    menu.id = 'fj-sel-menu';
    Object.assign(menu.style, {
      width: 'min(340px, 94vw)',
      maxHeight: 'min(80vh, 480px)',
      padding: '20px',
      background: '#111',
      color: '#f0f0f0',
      border: '1px solid #444',
      borderRadius: '8px',
      boxShadow: '0 14px 32px rgba(0, 0, 0, 0.55)',
      font: "500 14px 'Segoe UI', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      overflowY: 'auto',
      maxWidth: '600px',
      position: 'absolute',
      touchAction: 'pan-y'
    });
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');

    overlay.append(menu);
    document.body.append(overlay);

    const stopPropagation = (event) => {
      event.stopPropagation();
    };

    ['pointerdown', 'touchstart', 'mousedown', 'click'].forEach((eventName) => {
      menu.addEventListener(eventName, stopPropagation);
    });

    
    const tabsRow = document.createElement('div');
    tabsRow.style.display = 'flex';
    tabsRow.style.gap = '8px';
    tabsRow.style.width = '100%';
    tabsRow.style.marginBottom = '8px';

    const tabNames = [
      { key: 'interface', label: 'Interface' },
      { key: 'tools', label: 'Tools' },
      { key: 'extras', label: 'Extras' }
    ];
    const tabButtons = {};
    let activeTab = localStorage.getItem('fjTweakerLastTab') || 'interface';

    tabNames.forEach(({ key, label }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.type = 'button';
      Object.assign(btn.style, {
        flex: '1 1 0',
        padding: '10px 0',
        font: "600 14px 'Segoe UI', sans-serif",
        color: '#f8f8f8',
        background: '#222',
        border: '1px solid #444',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background 0.18s',
        outline: 'none',
        letterSpacing: '0.5px'
      });
      btn.setAttribute('data-tab', key);
      tabButtons[key] = btn;
      tabsRow.appendChild(btn);
    });

    const tabContent = document.createElement('div');
    tabContent.style.transition = 'opacity 0.22s cubic-bezier(.2,.9,.2,1)';
    tabContent.style.opacity = '1';
    tabContent.style.display = 'flex';
    tabContent.style.flexDirection = 'column';
    tabContent.style.gap = '12px';
    tabContent.style.width = '100%';

    const resolveAssetUrl = (relativePath) => {
      if (!relativePath) {
        return '';
      }
      try {
        if (extensionApi?.runtime?.getURL) {
          return extensionApi.runtime.getURL(relativePath);
        }
      } catch (error) {
      }
      return relativePath;
    };

    const createInfoButtonElement = (labelText) => {
      const resolvedLabel = (labelText || '').trim();
      const button = window.fjTweakerInfo?.createInfoButton
        ? window.fjTweakerInfo.createInfoButton({ text: '', size: 20, placement: 'right' })
        : (() => {
            const fallback = document.createElement('button');
            fallback.type = 'button';
            fallback.textContent = 'i';
            Object.assign(fallback.style, {
              width: '20px',
              height: '20px',
              font: "600 12px 'Segoe UI', sans-serif",
              color: '#f8f8f8',
              background: '#202020',
              border: '1px solid #555',
              borderRadius: '50%',
              cursor: 'pointer',
              flexShrink: '0'
            });
            fallback.addEventListener('click', (event) => {
              event.stopPropagation();
            });
            return fallback;
          })();

      button.dataset.fjInfoTitle = resolvedLabel;
      button.dataset.fjInfoText = '';
      button.dataset.fjInfoImage = '';
      button.title = '';
      return button;
    };

    const setInfoContent = (button, message, imagePath) => {
      if (!button) {
        return;
      }
      const resolvedMessage = typeof message === 'string' ? message : '';
      const resolvedImage = imagePath ? resolveAssetUrl(imagePath) : '';

      if (window.fjTweakerInfo?.updateTooltip) {
        window.fjTweakerInfo.updateTooltip(button, resolvedMessage, resolvedImage);
      }

      button.dataset.fjInfoText = resolvedMessage;
      if (resolvedImage) {
        button.dataset.fjInfoImage = resolvedImage;
      } else {
        delete button.dataset.fjInfoImage;
      }
      button.title = '';
    };

    const createCheckboxRow = (id, label, checked, onChange) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '10px';
      row.style.width = '100%';
      row.style.overflow = 'visible';

      const innerLabel = document.createElement('label');
      innerLabel.htmlFor = id;
      innerLabel.style.display = 'flex';
      innerLabel.style.alignItems = 'center';
      innerLabel.style.gap = '10px';
      innerLabel.style.flex = '1 1 auto';
      innerLabel.style.cursor = 'pointer';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.checked = checked;

      if (onChange) {
        input.addEventListener('change', onChange);
      }

      const span = document.createElement('span');
      span.textContent = label;
      span.style.flex = '1 1 auto';

      innerLabel.append(input, span);

      const infoButton = createInfoButtonElement(label);
      infoButton.style.alignSelf = 'center';
      infoButton.style.flexShrink = '0';
      infoButton.style.marginLeft = '4px';
      infoButton.dataset.fjInfoTarget = id;
      infoButton.addEventListener('click', (event) => { event.stopPropagation(); });

      row.append(innerLabel, infoButton);

      return { wrapper: row, input, infoButton };
    };

    
    const saveSettingsLive = (
      avoidNextRow,
      removeTwilightRow,
      customMessagesRow,
      hideRateRow,
      hideShortcutsRow,
      stopUserPopupRow,
      trackRatesRow,
      modJSExtrasRow,
      walcornRow,
      checkTextRow,
      autoplayRow
    ) => {
      const nextSettings = {
        avoidNext: avoidNextRow.input.checked,
        removeTwilight: removeTwilightRow.input.checked,
        customMessages: customMessagesRow.input.checked,
        hideRateShortcuts: hideRateRow.input.checked,
        hideShortcuts: hideShortcutsRow.input.checked,
        stopUsernamePopups: stopUserPopupRow.input.checked,
        trackRates: trackRatesRow.input.checked,
        modJSExtras: modJSExtrasRow.input.checked,
        walcorn: walcornRow.input.checked,
        checkText: checkTextRow.input.checked,
        autoplay: autoplayRow ? autoplayRow.input.checked : Boolean(DEFAULT_SETTINGS.autoplay)
      };

      persistSettings(nextSettings);
      window.fjTweakerSettings = { ...DEFAULT_SETTINGS, ...nextSettings };
      dispatchSettings(window.fjTweakerSettings);
    };

    const avoidNextRow = createCheckboxRow('fj-sel-avoid-next', 'Avoid Next', settings.avoidNext);
    const removeTwilightRow = createCheckboxRow('fj-sel-remove-twilight', 'Remove Twilight Zone', settings.removeTwilight);
  const customMessagesRow = createCheckboxRow('fj-sel-custom-messages', 'Custom Messages', settings.customMessages);
  try {
    const labelEl = customMessagesRow.wrapper.querySelector('label'); if (labelEl) labelEl.style.marginLeft = '22px';
  }
 catch(_) {}

    const hideRateRow = createCheckboxRow('fj-sel-hide-rate', 'Custom Shortcuts', settings.hideRateShortcuts);
  const hideShortcutsRow = createCheckboxRow('fj-sel-hide-shortcuts', 'Hide Shortcuts', settings.hideShortcuts);
  try {
    const labelEl = hideShortcutsRow.wrapper.querySelector('label'); if (labelEl) labelEl.style.marginLeft = '22px';
  }
 catch(_) {}

    const stopUserPopupRow = createCheckboxRow('fj-sel-stop-userpop', 'Stop Username Popups', settings.stopUsernamePopups);
    const trackRatesRow = createCheckboxRow('fj-sel-track-rates', 'Track Rates', settings.trackRates);
    const modJSExtrasRow = createCheckboxRow('fj-sel-modjs', 'ModJS Extras', settings.modJSExtras);
    const walcornRow = createCheckboxRow('fj-sel-walcorn', 'Walcorn Mode', settings.walcorn);
    const checkTextRow = createCheckboxRow('fj-sel-check-text', 'Check Text', settings.checkText);

    
    const autoplayRow = createCheckboxRow('fj-sel-autoplay', 'Re-enable Autoplay?', Boolean(settings.autoplay));

    const addLiveChangeHandlers = () => {
      const onToggleMutual = (source) => {
        
        if (source === 'custom' && hideRateRow.input.checked) {
          if (hideShortcutsRow.input.checked) hideShortcutsRow.input.checked = false;
        }
        if (source === 'hide' && hideShortcutsRow.input.checked) {
          if (hideRateRow.input.checked) hideRateRow.input.checked = false;
        }
      };

      const saveHandler = () => saveSettingsLive(
        avoidNextRow,
        removeTwilightRow,
        customMessagesRow,
        hideRateRow,
        hideShortcutsRow,
        stopUserPopupRow,
        trackRatesRow,
        modJSExtrasRow,
        walcornRow,
        checkTextRow,
        autoplayRow
      );

      avoidNextRow.input.addEventListener('change', saveHandler);
      removeTwilightRow.input.addEventListener('change', saveHandler);
      customMessagesRow.input.addEventListener('change', saveHandler);
      hideRateRow.input.addEventListener('change', (e) => { onToggleMutual('custom'); saveHandler(); });
      hideShortcutsRow.input.addEventListener('change', (e) => { onToggleMutual('hide'); saveHandler(); });
      stopUserPopupRow.input.addEventListener('change', saveHandler);
      trackRatesRow.input.addEventListener('change', saveHandler);
      modJSExtrasRow.input.addEventListener('change', saveHandler);
      walcornRow.input.addEventListener('change', saveHandler);
      checkTextRow.input.addEventListener('change', saveHandler);
      autoplayRow.input.addEventListener('change', saveHandler);
    };
    addLiveChangeHandlers();

  
  setInfoContent(avoidNextRow.infoButton, '');
    setInfoContent(removeTwilightRow.infoButton, 'Removes the Twilight Zone lyrics from user profiles.');
    setInfoContent(customMessagesRow.infoButton, 'Enables custom hard-coded messages on mod profiles.');
    setInfoContent(hideRateRow.infoButton, 'Enable custom shortcuts.');
    setInfoContent(hideShortcutsRow.infoButton, 'Completely hides and disabled shortcuts.');
    setInfoContent(stopUserPopupRow.infoButton, 'Stops the profile menu from popping up when mousing over a user. User must now be clicked to bring up menu.');
    setInfoContent(trackRatesRow.infoButton, 'Keeps count of rated content.');
    setInfoContent(modJSExtrasRow.infoButton, 'Provides some extra buttons on the ModJS menu to quickly reapply/swap ModJS settings. Recall will reapply last-submitted settings (even after clearing cache), Import provides a code to copy that reflects last-submitted settings, Export takes that code and uses it to apply settings. Also provides info on what ModJS settings do.');
    setInfoContent(walcornRow.infoButton, 'why');
    setInfoContent(checkTextRow.infoButton, 'Auto-checks content for PC2 or Meta.');
  setInfoContent(autoplayRow.infoButton, 'The autplay toggle. Just moved.');

    
    const tabGroups = {
      interface: [stopUserPopupRow.wrapper, removeTwilightRow.wrapper, customMessagesRow.wrapper, autoplayRow.wrapper],
      tools: [modJSExtrasRow.wrapper, checkTextRow.wrapper, hideRateRow.wrapper, hideShortcutsRow.wrapper, trackRatesRow.wrapper],
      extras: [avoidNextRow.wrapper, walcornRow.wrapper]
    };

    function renderTab(tabKey, animate = true) {
      if (!tabGroups[tabKey]) tabKey = 'interface';
      if (animate) {
        tabContent.style.opacity = '0';
        setTimeout(() => {
          tabContent.innerHTML = '';
          tabGroups[tabKey].forEach(el => tabContent.appendChild(el));
          tabContent.style.opacity = '1';
        }, 150);
      } else {
        tabContent.innerHTML = '';
        tabGroups[tabKey].forEach(el => tabContent.appendChild(el));
        tabContent.style.opacity = '1';
      }
      Object.entries(tabButtons).forEach(([k, btn]) => {
        btn.style.background = (k === tabKey) ? '#822ef6' : '#222';
        btn.style.color = (k === tabKey) ? '#fff' : '#f8f8f8';
      });
      localStorage.setItem('fjTweakerLastTab', tabKey);
      activeTab = tabKey;
    }

    Object.entries(tabButtons).forEach(([key, btn]) => {
      btn.addEventListener('click', () => {
        if (activeTab !== key) renderTab(key);
      });
    });

    const style = document.createElement('style');
    style.textContent = `
      #fj-sel-menu input[type=checkbox] { accent-color: #822ef6; }
    `;
    menu.appendChild(style);
    menu.append(tabsRow, tabContent);

    
    renderTab(activeTab, false);

    
    autoplayRowInput = autoplayRow.input;
    autoplayRowInput.checked = Boolean(desiredAutoplayState);
    startAutoplayObserver();

    const versionLabel = document.createElement('div');
    versionLabel.style.fontSize = '12px';
    versionLabel.style.color = '#cccccc';
    versionLabel.style.marginTop = '10px';
    versionLabel.textContent = 'Local version: v' + getLocalVersion();
    menu.append(versionLabel);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        hideMenu();
      }
    };

    const handleDocumentClick = (event) => {
      if (event.target !== toggleButton && !overlay.contains(event.target)) {
        hideMenu();
      }
    };

    const hideMenu = () => {
      overlay.style.display = 'none';
      overlay.setAttribute('aria-hidden', 'true');
      toggleButton.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleDocumentClick, true);
    };

    const showMenu = () => {
      try {
        const rect = toggleButton.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.visibility = 'hidden';

        
        const menuW = menu.offsetWidth || 340;
        const menuH = menu.offsetHeight || 200;

        
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        
        const spaceBelow = viewportH - rect.bottom;
        const topPos = (spaceBelow >= menuH + 8)
          ? (rect.bottom + 6)
          : Math.max(8, rect.top - menuH - 6);

        
        let leftPos = rect.left;
        const maxLeft = Math.max(8, viewportW - menuW - 8);
        if (leftPos > maxLeft) leftPos = maxLeft;
        if (leftPos < 8) leftPos = 8;

        menu.style.top = `${Math.max(8, Math.min(topPos, viewportH - menuH - 8))}px`;
        menu.style.left = `${leftPos}px`;
        overlay.style.visibility = '';
      } catch (error) {
        
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const menuW = menu.offsetWidth || 340;
        const menuH = menu.offsetHeight || 200;
        menu.style.top = `${Math.max(8, (viewportH - menuH) / 2)}px`;
        menu.style.left = `${Math.max(8, (viewportW - menuW) / 2)}px`;
      }

      overlay.style.display = 'block';
      overlay.setAttribute('aria-hidden', 'false');
      toggleButton.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('click', handleDocumentClick, true);
    };

    toggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const isVisible = overlay.style.display !== 'none';
      if (isVisible) {
        hideMenu();
      } else {
        showMenu();
      }
    });

    overlay.addEventListener('click', (event) => {
      
      if (event.target === overlay) hideMenu();
    });

    return true;
  };

  const ensureHomeObserver = () => {
    if (homeMountObserver || typeof MutationObserver === 'undefined') {
      return;
    }

    homeMountObserver = new MutationObserver(() => {
      if (document.querySelector('#fj-sel-toggle')) {
        return;
      }
      attachUI(window.fjTweakerSettings || DEFAULT_SETTINGS);
    });

    if (document.body) {
      homeMountObserver.observe(document.body, { childList: true, subtree: true });
    }
  };

  const createUI = (settings) => {
    attachUI(settings);
    ensureHomeObserver();
  };

  const init = () => {
    if (window.location.hostname !== targetHost) {
      return;
    }

    const currentSettings = loadStoredSettings();
    window.fjTweakerSettings = { ...DEFAULT_SETTINGS, ...currentSettings };
    dispatchSettings(window.fjTweakerSettings);
    createUI(window.fjTweakerSettings);
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init };
})();


