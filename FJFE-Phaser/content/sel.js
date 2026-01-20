(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'sel';
  const SETTINGS_KEY = 'fjTweakerSettings';
  const MISRATE_CHEAT_STORAGE_KEY = 'fjTweakerMisrateCheatOverride';
  const MISRATE_CHEAT_SEQUENCE = [',', '.', '/', '-', '='];
  // The SEL module renders the floating Mod UI toggle plus the settings menu that
  // powers every other content script. It also enforces access tiers and hidden
  // overrides (misrate cheat, forced hide shortcuts, etc.).
  let misrateCheatOverride = null;
  let misrateCheatSequenceAttached = false;
  let misrateCheatSequenceCallback = null;

  const readMisrateCheatOverride = () => {
    try {
      const raw = localStorage.getItem(MISRATE_CHEAT_STORAGE_KEY);
      if (raw === '1') return true;
      if (raw === '0') return false;
      return null;
    } catch (_) {
      return null;
    }
  };

  const persistMisrateCheatOverride = (value) => {
    try {
      if (value === null || typeof value === 'undefined') {
        localStorage.removeItem(MISRATE_CHEAT_STORAGE_KEY);
      } else {
        localStorage.setItem(MISRATE_CHEAT_STORAGE_KEY, value ? '1' : '0');
      }
    } catch (_) {}
  };

  misrateCheatOverride = readMisrateCheatOverride();

  const ensureMisrateCheatSequenceListener = () => {
    if (misrateCheatSequenceAttached) return;
    const seq = MISRATE_CHEAT_SEQUENCE.slice();
    let idx = 0;
    let timer = null;
    const reset = () => {
      idx = 0;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const isTyping = () => {
      const ae = document.activeElement;
      if (!ae) return false;
      const tag = (ae.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return true;
      return Boolean(ae.isContentEditable);
    };
    const handler = (event) => {
      try {
        if (isTyping()) return;
        const expected = seq[idx];
        if (event.key === expected) {
          idx++;
          if (idx === seq.length) {
            if (typeof misrateCheatSequenceCallback === 'function') {
              try { misrateCheatSequenceCallback(); } catch (_) {}
            }
            reset();
          } else {
            if (timer) clearTimeout(timer);
            timer = setTimeout(reset, 4000);
          }
        } else {
          reset();
        }
      } catch (_) {
        reset();
      }
    };
    document.addEventListener('keydown', handler, true);
    misrateCheatSequenceAttached = true;
  };
  const DEFAULT_SETTINGS = {
    avoidNext: false,
    flagCheck: false,
    banCalculator: false,
    hideRateShortcuts: false,
    hideShortcuts: false,
    stopUsernamePopups: false,
    trackRates: false,
    modJSExtras: false,
    walcorn: false,
    checkText: false,
    clicker2: false,
    misrateWarning: false,
    warnOnAll: false,
    farm: false,
    huntAssist: false,
    batchAssist: false,
    gifViewer: false
  };
  const ALLOWED_SETTINGS_TIER1 = new Set([
    'stopUsernamePopups',
    'trackRates',
    'modJSExtras',
    'checkText',
    'avoidNext',
    'gifViewer'
  ]);
  const ALLOWED_SETTINGS_TIER2 = new Set([
    ...ALLOWED_SETTINGS_TIER1,
    'misrateWarning',
    'flagCheck',
    'banCalculator'
  ]);
  const ALLOWED_SETTINGS_TIER3 = new Set([
    ...ALLOWED_SETTINGS_TIER2,
    'hideRateShortcuts',
    'hideShortcuts',
    'clicker2',
    'farm'
  ]);
  const FORCED_HIDE_SHORTCUTS_KEY = 'fjTweakerForcedHideShortcuts';
  const computeAccessTier = ({ authorized, level, excluded }) => {
    if (!authorized) return 'unauthorized';
    if (excluded) return 'full';
    if (!Number.isFinite(level)) return 'full';
    if (level >= 4) return 'full';
    if (level >= 3) return 'tier3';
    if (level >= 2) return 'tier2';
    if (level >= 1) return 'tier1';
    return 'tier1';
  };
  const readForcedHideShortcutsFlag = () => {
    try {
      return localStorage.getItem(FORCED_HIDE_SHORTCUTS_KEY) === '1';
    } catch (_) {
      return false;
    }
  };
  const writeForcedHideShortcutsFlag = (value) => {
    try {
      if (value) {
        localStorage.setItem(FORCED_HIDE_SHORTCUTS_KEY, '1');
      } else {
        localStorage.removeItem(FORCED_HIDE_SHORTCUTS_KEY);
      }
    } catch (_) {}
  };
  const MANAGE_ENTRY_SELECTOR = '#topME .sideEditButt[onclick*="manageAll()"]';
  let manageEntryObserver = null;

  const loadStoredSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        return { ...DEFAULT_SETTINGS };
      }
      const parsed = JSON.parse(raw);
      const normalized = { ...parsed };
      if (typeof normalized.modJSExtras === 'undefined' && typeof normalized.modJSRecall !== 'undefined') {
        normalized.modJSExtras = Boolean(normalized.modJSRecall);
        delete normalized.modJSRecall;
      }
      return { ...DEFAULT_SETTINGS, ...normalized };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  };

  const persistSettings = (settings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {}
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        chrome.storage.local.set({ [SETTINGS_KEY]: { ...settings } });
      }
    } catch (_) {}
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
      return chrome?.runtime?.getManifest?.().version || '0.0.0';
    } catch (error) {
      return '0.0.0';
    }
  };


  const createUI = (settings) => {
    try {
      
    } catch (e) {}
    if (document.querySelector('#fj-sel-menu')) {
      return;
    }

    const manageEntry = document.querySelector(MANAGE_ENTRY_SELECTOR);
    if (!manageEntry) {
      if (!manageEntryObserver && typeof MutationObserver !== 'undefined') {
        manageEntryObserver = new MutationObserver(() => {
          const resolvedEntry = document.querySelector(MANAGE_ENTRY_SELECTOR);
          if (resolvedEntry) {
            manageEntryObserver.disconnect();
            manageEntryObserver = null;
            createUI(window.fjTweakerSettings || settings || DEFAULT_SETTINGS);
          }
        });

        if (document.body) {
          manageEntryObserver.observe(document.body, { childList: true, subtree: true });
        }
      }
      return;
    }

    if (manageEntryObserver) {
      manageEntryObserver.disconnect();
      manageEntryObserver = null;
    }

    let wrapper = document.getElementById('fj-sel-toggle-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'fj-sel-toggle-wrapper';
    } else {
      wrapper.textContent = '';
    }

    const manageEntryPosition = window.getComputedStyle(manageEntry).position;
    if (manageEntryPosition === 'static') {
      manageEntry.style.position = 'relative';
    }

    Object.assign(wrapper.style, {
      position: 'absolute',
      top: '50%',
      left: '100%',
      marginLeft: '8px',
      transform: 'translateY(-50%)',
      display: 'flex',
      alignItems: 'center',
      zIndex: '900'
    });

    manageEntry.append(wrapper);

    const toggleButton = document.createElement('button');
    toggleButton.id = 'fj-sel-toggle';
    toggleButton.type = 'button';
  toggleButton.textContent = 'Mod UI';
    Object.assign(toggleButton.style, {
      padding: '5px 9px',
      font: "500 12px 'Segoe UI', sans-serif",
      color: '#f8f8f8',
      background: '#303030',
      border: '1px solid #555',
      borderRadius: '4px',
      cursor: 'pointer',
      lineHeight: '1.2',
      minWidth: '74px'
    });
    toggleButton.setAttribute('aria-haspopup', 'true');
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.setAttribute('aria-controls', 'fj-sel-menu');

    wrapper.append(toggleButton);

    let host = document.getElementById('fj-sel-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'fj-sel-host';
    } else {
      host.textContent = '';
    }

  Object.assign(host.style, {
   display: 'none',
   
   position: 'absolute',
   top: '0px',
   left: '0px',
   zIndex: '2147483645',
      width: 'min(320px, 92vw)',
      maxHeight: 'min(70vh, 420px)',
      padding: '12px 14px',
      background: '#111',
      color: '#f0f0f0',
      border: '1px solid #333',
      borderRadius: '6px',
      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
      font: "500 13px 'Segoe UI', sans-serif",
      overflowY: 'auto',
      overflowX: 'visible'
    });
    host.setAttribute('aria-hidden', 'true');

  document.body.append(host);

    const stopPropagation = (event) => {
      event.stopPropagation();
    };

    ['pointerdown', 'mousedown', 'click'].forEach((eventName) => {
      host.addEventListener(eventName, stopPropagation);
    });

    const menu = document.createElement('div');
    menu.id = 'fj-sel-menu';
    Object.assign(menu.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    });


    const style = document.createElement('style');
    style.textContent = `
      #fj-sel-menu input[type=checkbox] {
        accent-color: #822ef6;
      }
    `;
    menu.appendChild(style);
    host.append(menu);

    
    
    const tabRow = document.createElement('div');
    tabRow.style.display = 'flex';
    tabRow.style.gap = '8px';
    tabRow.style.width = '100%';
    tabRow.style.marginBottom = '8px';

    
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
        padding: '8px 0',
        font: "600 14px 'Segoe UI', sans-serif",
        color: '#f8f8f8',
        background: '#222',
        border: '1px solid #444',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background 0.18s',
        outline: 'none',
        letterSpacing: '0.5px',
      });
      btn.setAttribute('data-tab', key);
      tabButtons[key] = btn;
      tabRow.appendChild(btn);
    });
  menu.append(tabRow);

    
    const tabContent = document.createElement('div');
    tabContent.style.transition = 'opacity 0.22s cubic-bezier(.2,.9,.2,1)';
    tabContent.style.opacity = '1';
    tabContent.style.display = 'flex';
    tabContent.style.flexDirection = 'column';
    tabContent.style.gap = '8px';
    tabContent.style.width = '100%';
    menu.append(tabContent);

    
    const unauthorizedWrap = document.createElement('div');
    unauthorizedWrap.style.display = 'none';
    unauthorizedWrap.style.flexDirection = 'column';
    unauthorizedWrap.style.gap = '8px';
    const unauthorizedMsg = document.createElement('div');
    unauthorizedMsg.style.color = '#ffbaba';
    unauthorizedMsg.style.font = "600 13px 'Segoe UI', sans-serif";
    unauthorizedMsg.textContent = 'Credentials missing. Please update to enable Mod UI.';
    const unauthorizedBtn = document.createElement('button');
    unauthorizedBtn.type = 'button';
    unauthorizedBtn.textContent = 'Update Credentials';
    Object.assign(unauthorizedBtn.style, {
      padding: '6px 10px',
      font: "600 12px 'Segoe UI', sans-serif",
      color: '#111',
      background: '#ff8c00',
      border: '1px solid #b86900',
      borderRadius: '4px',
      cursor: 'pointer',
      alignSelf: 'flex-start'
    });
    unauthorizedWrap.append(unauthorizedMsg, unauthorizedBtn);
    menu.append(unauthorizedWrap);

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

const createCheckboxRow = (id, label, checked, onChange) => {
  
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '8px';
  row.style.flexWrap = 'nowrap';
  row.style.width = '100%';
  row.style.overflow = 'visible';

  const innerLabel = document.createElement('label');
  innerLabel.htmlFor = id;
  innerLabel.style.display = 'flex';
  innerLabel.style.alignItems = 'center';
  innerLabel.style.gap = '8px';
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

  infoButton.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  row.append(innerLabel, infoButton);

  return { wrapper: row, input, infoButton };
};


const createSmallButtonRow = (id, label, onClick) => {
  
  const row = document.createElement('div');
  row.style.setProperty('display', 'flex', 'important');
  row.style.setProperty('align-items', 'center', 'important');
  row.style.setProperty('gap', '8px', 'important');
  row.style.setProperty('flex-wrap', 'nowrap', 'important');
  row.style.width = '100%';
  row.style.position = 'relative';
  row.style.paddingRight = '4px';
  row.style.overflow = 'visible';

  const innerLabel = document.createElement('label');
  innerLabel.htmlFor = id;
  innerLabel.style.setProperty('display', 'flex', 'important');
  innerLabel.style.setProperty('align-items', 'center', 'important');
  innerLabel.style.setProperty('gap', '8px', 'important');
  innerLabel.style.setProperty('flex', '1 1 auto', 'important');
  innerLabel.style.setProperty('min-width', '0', 'important');
  innerLabel.style.cursor = 'pointer';

  
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = id;
  btn.textContent = '?';
  Object.assign(btn.style, {
    width: '14px',
    height: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    font: "700 11px 'Segoe UI', sans-serif",
    color: '#ffffff',
    background: '#822ef6',
    border: '1px solid #822ef6',
    borderRadius: '3px',
    cursor: 'pointer',
    lineHeight: '1',
    padding: '0',
    flexShrink: '0'
  });
  if (typeof onClick === 'function') {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick(e);
    });
  }

  const span = document.createElement('span');
  span.textContent = label;
  span.style.flex = '1 1 auto';
  span.style.minWidth = '0';

  innerLabel.append(btn, span);

  const infoButton = createInfoButtonElement(label);
  infoButton.style.setProperty('align-self', 'center', 'important');
  infoButton.style.setProperty('flex-shrink', '0', 'important');
  infoButton.style.setProperty('position', 'absolute', 'important');
  infoButton.style.setProperty('right', '4px', 'important');
  infoButton.style.setProperty('top', '50%', 'important');
  infoButton.style.setProperty('transform', 'translateY(-50%)', 'important');
  infoButton.dataset.fjInfoTarget = id;

  infoButton.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  row.append(innerLabel, infoButton);

  return { wrapper: row, button: btn, infoButton };
};

const saveSettingsLive = (avoidNextRow, flagCheckRow, banCalculatorRow, hideRateRow, hideShortcutsRow, stopUserPopupRow, trackRatesRow, modJSExtrasRow, walcornRow, checkTextRow, clicker2Row, misrateWarningRow, warnOnAllRow, farmRow, gifViewerRow, huntAssistRow, batchAssistRow) => {
  
  const nextSettings = {
    avoidNext: avoidNextRow.input.checked,
    flagCheck: flagCheckRow.input.checked,
    banCalculator: banCalculatorRow.input.checked,
    hideRateShortcuts: hideRateRow.input.checked,
    hideShortcuts: hideShortcutsRow.input.checked,
    stopUsernamePopups: stopUserPopupRow.input.checked,
    trackRates: trackRatesRow.input.checked,
    modJSExtras: modJSExtrasRow.input.checked,
    walcorn: walcornRow ? Boolean(walcornRow.input.checked) : false,
    checkText: checkTextRow.input.checked,
    clicker2: clicker2Row.input.checked,
    misrateWarning: misrateWarningRow.input.checked,
    warnOnAll: warnOnAllRow.input.checked,
    farm: farmRow ? Boolean(farmRow.input.checked) : false,
    gifViewer: gifViewerRow.input.checked,
    huntAssist: huntAssistRow.input.checked,
    batchAssist: batchAssistRow.input.checked
  };

  persistSettings(nextSettings);
  window.fjTweakerSettings = { ...DEFAULT_SETTINGS, ...nextSettings };
  dispatchSettings(window.fjTweakerSettings);
};

  const avoidNextRow = createCheckboxRow('fj-sel-avoid-next', 'Avoid Next', settings.avoidNext);
  const flagCheckRow = createCheckboxRow('fj-sel-flag-check', 'Flag Check', settings.flagCheck);
  const banCalculatorRow = createCheckboxRow('fj-sel-ban-calculator', 'Ban Calculator', settings.banCalculator);
  const hideRateRow = createCheckboxRow('fj-sel-hide-rate', 'Custom Shortcuts', settings.hideRateShortcuts);
  
  const hideShortcutsRow = createCheckboxRow('fj-sel-hide-shortcuts', 'Hide Shortcuts', settings.hideShortcuts);
  
  try {
    const labelEl = hideShortcutsRow.wrapper.querySelector('label');
    if (labelEl) labelEl.style.marginLeft = '22px';
  } catch (_) {}
  hideShortcutsRow.input.title = 'Completely hides and disabled shortcuts.';
  const stopUserPopupRow = createCheckboxRow('fj-sel-stop-userpop', 'Stop Username Popups', settings.stopUsernamePopups);
  const trackRatesRow = createCheckboxRow('fj-sel-track-rates', 'Track Rates', settings.trackRates);
  const gifViewerRow = createCheckboxRow('fj-sel-gif-viewer', 'Frame Viewer', settings.gifViewer);
  const modJSExtrasRow = createCheckboxRow('fj-sel-modjs', 'ModJS Extras', settings.modJSExtras);
  const walcornRow = createCheckboxRow('fj-sel-walcorn', 'Walcorn Mode', settings.walcorn);
  const checkTextRow = createCheckboxRow('fj-sel-check-text', 'Check Text', settings.checkText);
  const misrateWarningRow = createCheckboxRow('fj-sel-misrate-warning', 'Misrate Warning', settings.misrateWarning);
  const warnOnAllRow = createCheckboxRow('fj-sel-warn-on-all', 'Warn on All', settings.warnOnAll);
  const farmRow = createCheckboxRow('fj-sel-farm', 'Farm', settings.farm);
  const huntAssistRow = createCheckboxRow('fj-sel-hunt-assist', 'Hunt Assist', settings.huntAssist);
  const batchAssistRow = createCheckboxRow('fj-sel-batch-assist', 'Batch Assist', settings.batchAssist);

  
  const rightClickInfoRow = createSmallButtonRow(
    'fj-sel-right-click-info',
    'Right-Click Info',
    () => {
      try {
        alert('When right-clicking, there is now a new option: More Info. Selecting it will open FJEdu.\nIf certain elements are right-clicked, it will open to the relevant entry.\n\nElements include:\n- Skin level buttons\n- PC level buttons\n- Categories\n- no-index\n- Mods button\n- Flag buttons\n- Flag time selection\n- Flag type selection\nAnd so on.');
      } catch (_) {}
    }
  );

  try {
    const labelEl = warnOnAllRow.wrapper.querySelector('label');
    if (labelEl) labelEl.style.marginLeft = '22px';
  } catch (_) {}

  const clicker2Row = createCheckboxRow('fj-sel-clicker2', 'Clicker', settings.clicker2, (e) => {
    const checked = e.target.checked;
    if (checked) {
      if (window.fjfeClickerV2Open) window.fjfeClickerV2Open();
      else {
        const s2 = document.createElement('script');
        s2.src = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
          ? chrome.runtime.getURL('content/repost_clicker/rcmain.js')
          : 'content/repost_clicker/rcmain.js';
        s2.onload = () => { if (window.fjfeClickerV2Open) window.fjfeClickerV2Open(); };
        document.head.appendChild(s2);
      }
    } else {
  if (window.fjfeClickerV2Close) window.fjfeClickerV2Close();
    }
  });



    const addLiveChangeHandlers = () => {
  
  const onToggleMutual = (source) => {
    if (source === 'custom' && hideRateRow.input.checked) {
      if (hideShortcutsRow.input.checked) hideShortcutsRow.input.checked = false;
    }
    if (source === 'hide' && hideShortcutsRow.input.checked) {
      if (hideRateRow.input.checked) hideRateRow.input.checked = false;
    }
  };

  const saveHandler = () => saveSettingsLive(avoidNextRow, flagCheckRow, banCalculatorRow, hideRateRow, hideShortcutsRow, stopUserPopupRow, trackRatesRow, modJSExtrasRow, walcornRow, checkTextRow, clicker2Row, misrateWarningRow, warnOnAllRow, farmRow, gifViewerRow, huntAssistRow, batchAssistRow);

      const applyMisrateCheatOverrideState = (triggerSave = false) => {
        if (misrateCheatOverride === null || !misrateWarningRow?.input) return;
        if (misrateWarningRow.input.checked !== misrateCheatOverride) {
          misrateWarningRow.input.checked = misrateCheatOverride;
          if (triggerSave) saveHandler();
        } else if (triggerSave) {
          saveHandler();
        }
      };

      const toggleMisrateCheatOverrideState = () => {
        const next = !(misrateCheatOverride === true);
        misrateCheatOverride = next;
        persistMisrateCheatOverride(next);
        applyMisrateCheatOverrideState(true);
        try {
          console.info(`[FJFE] Misrate Warning forced ${next ? 'on' : 'off'}.`);
        } catch (_) {}
      };

      const syncMisrateCheatOverrideFromInput = () => {
        if (misrateCheatOverride === null || !misrateWarningRow?.input) return;
        misrateCheatOverride = Boolean(misrateWarningRow.input.checked);
        persistMisrateCheatOverride(misrateCheatOverride);
      };
      avoidNextRow.input.addEventListener('change', saveHandler);
      flagCheckRow.input.addEventListener('change', saveHandler);
      banCalculatorRow.input.addEventListener('change', saveHandler);
      hideRateRow.input.addEventListener('change', (e) => { onToggleMutual('custom'); saveHandler(); });
      hideShortcutsRow.input.addEventListener('change', (e) => { onToggleMutual('hide'); saveHandler(); });
      stopUserPopupRow.input.addEventListener('change', saveHandler);
      trackRatesRow.input.addEventListener('change', saveHandler);
      modJSExtrasRow.input.addEventListener('change', saveHandler);
      walcornRow.input.addEventListener('change', saveHandler);
      checkTextRow.input.addEventListener('change', saveHandler);
      clicker2Row.input.addEventListener('change', () => {
        saveHandler();
      });
      misrateWarningRow.input.addEventListener('change', () => {
        syncMisrateCheatOverrideFromInput();
        saveHandler();
      });
      warnOnAllRow.input.addEventListener('change', saveHandler);
      farmRow.input.addEventListener('change', saveHandler);
      gifViewerRow.input.addEventListener('change', saveHandler);
      huntAssistRow.input.addEventListener('change', saveHandler);
      batchAssistRow.input.addEventListener('change', saveHandler);
      return {
        applyMisrateCheatOverrideState,
        toggleMisrateCheatOverrideState
      };
    };
    const misrateCheatControls = addLiveChangeHandlers() || {};

    misrateCheatSequenceCallback = () => {
      try {
        misrateCheatControls.toggleMisrateCheatOverrideState?.();
      } catch (_) {}
    };
    ensureMisrateCheatSequenceListener();
    if (misrateCheatOverride !== null) {
      try {
        misrateCheatControls.applyMisrateCheatOverrideState?.(false);
      } catch (_) {}
    }

const resolveAssetUrl = (relativePath) => {
  if (!relativePath) {
    return '';
  }
  try {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
      return chrome.runtime.getURL(relativePath);
    }
  } catch (error) {
  }
  return relativePath;
};

const setInfoContent = (button, message, imagePath) => {
  if (!button) {
    return;
  }
  const label = button.dataset.fjInfoTitle || '';
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


    setInfoContent(avoidNextRow.infoButton, '', 'icons/hehe.png');
    setInfoContent(flagCheckRow.infoButton, 'Summarizes flags in Premium History.');
    setInfoContent(banCalculatorRow.infoButton, 'Adds a button to help calculate ban time.');
    setInfoContent(hideRateRow.infoButton, 'Enable custom shortcuts.');
    setInfoContent(hideShortcutsRow.infoButton, 'Completely hides and disabled shortcuts.');
    setInfoContent(stopUserPopupRow.infoButton, 'Stops the profile menu from popping up when mousing over a user. User must now be clicked to bring up menu.');
    setInfoContent(trackRatesRow.infoButton, 'Keeps count of rated content.');
    setInfoContent(gifViewerRow.infoButton, 'Hover over a GIF or video to view its frames.');
    setInfoContent(modJSExtrasRow.infoButton, 'Provides some extra buttons on the ModJS menu to quickly reapply/swap ModJS settings. Recall will reapply last-submitted settings (even after clearing cache), Export provides a code to copy that reflects last-submitted settings, Import takes that code and uses it to apply settings. Also provides info on what ModJS settings do.');
    setInfoContent(walcornRow.infoButton, 'why');
    setInfoContent(checkTextRow.infoButton, 'Auto-checks content for PC2 or Meta.');
    setInfoContent(clicker2Row.infoButton, 'Clicker UI.');
    setInfoContent(misrateWarningRow.infoButton, 'Adds a small warning when content may be misrated.');
    setInfoContent(warnOnAllRow.infoButton, 'Adds a slightly larger warning when already-rated content may be misrated.\nUseful for fixing rates during regular browsing.');
    setInfoContent(farmRow.infoButton, 'A farm.');
  setInfoContent(rightClickInfoRow.infoButton, 'Opens relevant FJEdu entries on right-click.');
    setInfoContent(huntAssistRow.infoButton, 'Easier hunting and list-making.');
    setInfoContent(batchAssistRow.infoButton, 'Tools to assist in batch review.');

    
    const cloneGroups = (source) => {
      const next = {};
      Object.entries(source).forEach(([key, list]) => {
        next[key] = Array.isArray(list) ? list.slice() : [];
      });
      return next;
    };

    const baseTabGroups = {
      interface: [stopUserPopupRow.wrapper, flagCheckRow.wrapper],
      tools: [
        misrateWarningRow.wrapper,
        warnOnAllRow.wrapper,
        modJSExtrasRow.wrapper,
        banCalculatorRow.wrapper,
        checkTextRow.wrapper,
        hideRateRow.wrapper,
        hideShortcutsRow.wrapper,
        trackRatesRow.wrapper,
        gifViewerRow.wrapper,
        huntAssistRow.wrapper,
        batchAssistRow.wrapper,
      ],
      extras: [avoidNextRow.wrapper, clicker2Row.wrapper, walcornRow.wrapper, farmRow.wrapper],
    };

  const stickyTabRows = {
    tools: [rightClickInfoRow.wrapper].filter(Boolean)
  };

  let currentTabGroups = cloneGroups(baseTabGroups);
  const tabOrder = ['interface', 'tools', 'extras'];

  const getTabItemsWithStickyRows = (tabKey) => {
    const baseItems = currentTabGroups[tabKey] || [];
    const ordered = baseItems.slice();
    const stickyItems = stickyTabRows[tabKey];
    if (!stickyItems || !stickyItems.length) {
      return ordered;
    }
    stickyItems.forEach((element) => {
      if (!element) return;
      const idx = ordered.indexOf(element);
      if (idx !== -1) {
        ordered.splice(idx, 1);
      }
    });
    stickyItems.forEach((element) => {
      if (!element) return;
      ordered.push(element);
    });
    return ordered;
  };

    const checkboxRows = {
      avoidNext: avoidNextRow,
      flagCheck: flagCheckRow,
      banCalculator: banCalculatorRow,
      hideRateShortcuts: hideRateRow,
      hideShortcuts: hideShortcutsRow,
      stopUsernamePopups: stopUserPopupRow,
      trackRates: trackRatesRow,
      modJSExtras: modJSExtrasRow,
      walcorn: walcornRow,
      checkText: checkTextRow,
      clicker2: clicker2Row,
      misrateWarning: misrateWarningRow,
      warnOnAll: warnOnAllRow,
      farm: farmRow,
      gifViewer: gifViewerRow,
      huntAssist: huntAssistRow,
      batchAssist: batchAssistRow
    };

    const resolveTabKey = (preferred) => {
      if (preferred && currentTabGroups[preferred] && currentTabGroups[preferred].length) {
        return preferred;
      }
      for (const key of tabOrder) {
        if (currentTabGroups[key] && currentTabGroups[key].length) {
          return key;
        }
      }
      return preferred || 'interface';
    };

    const updateTabButtonsState = (activeKey) => {
      tabOrder.forEach((key) => {
        const btn = tabButtons[key];
        if (!btn) return;
        const visible = Boolean(currentTabGroups[key] && currentTabGroups[key].length);
        btn.style.display = visible ? '' : 'none';
        if (!visible) return;
        btn.style.background = (key === activeKey) ? '#822ef6' : '#222';
        btn.style.color = (key === activeKey) ? '#fff' : '#f8f8f8';
      });
      const visibleTabs = tabOrder.filter((key) => currentTabGroups[key] && currentTabGroups[key].length);
      tabRow.style.display = visibleTabs.length > 0 ? 'flex' : 'none';
    };

    
    function renderTab(tabKey, animate = true) {
      const resolvedKey = resolveTabKey(tabKey);
      const items = getTabItemsWithStickyRows(resolvedKey);
      if (animate) {
        tabContent.style.opacity = '0';
        setTimeout(() => {
          tabContent.innerHTML = '';
          items.forEach(el => tabContent.appendChild(el));
          tabContent.style.opacity = '1';
        }, 180);
      } else {
        tabContent.innerHTML = '';
        items.forEach(el => tabContent.appendChild(el));
        tabContent.style.opacity = '1';
      }
      updateTabButtonsState(resolvedKey);
      localStorage.setItem('fjTweakerLastTab', resolvedKey);
      activeTab = resolvedKey;
    }

    const allowedSetsByTier = {
      tier1: ALLOWED_SETTINGS_TIER1,
      tier2: ALLOWED_SETTINGS_TIER2,
      tier3: ALLOWED_SETTINGS_TIER3
    };

  let currentTier = null;
  let forcedHideShortcuts = readForcedHideShortcutsFlag();

    const applyLevelRestrictions = (tier) => {
      const normalizedTier = tier === 'full' ? 'full' : (tier === 'tier3' ? 'tier3' : (tier === 'tier2' ? 'tier2' : 'tier1'));

      if (rightClickInfoRow && rightClickInfoRow.wrapper) {
        rightClickInfoRow.wrapper.style.display = '';
      }

      const allowedSet = normalizedTier === 'full' ? null : allowedSetsByTier[normalizedTier] || ALLOWED_SETTINGS_TIER1;
      let changed = false;

      Object.entries(checkboxRows).forEach(([key, row]) => {
        if (!row || !row.input) return;
        if (row.wrapper && row.wrapper.style.display === 'none') {
          row.wrapper.style.display = '';
        }
        const allowed = !allowedSet || allowedSet.has(key);
        row.input.disabled = !allowed;

        if (!allowed) {
          // When a feature is above the viewer's tier, it silently resets to safe defaults.
          if (key === 'misrateWarning' && misrateCheatOverride !== null) {
            if (row.input.checked !== misrateCheatOverride) {
              row.input.checked = misrateCheatOverride;
              changed = true;
            }
            return;
          }
          let desiredValue = false;
          if (key === 'hideShortcuts') {
            desiredValue = true;
            forcedHideShortcuts = true;
          }
          if (row.input.checked !== desiredValue) {
            row.input.checked = desiredValue;
            changed = true;
          }
          return;
        }

        if (key === 'misrateWarning' && misrateCheatOverride !== null) {
          if (row.input.checked !== misrateCheatOverride) {
            row.input.checked = misrateCheatOverride;
            changed = true;
          }
        }
      });

      if (normalizedTier === 'tier1' || normalizedTier === 'tier2') {
        hideShortcutsRow.input.disabled = true;
        if (!hideShortcutsRow.input.checked) {
          hideShortcutsRow.input.checked = true;
          changed = true;
        }
        forcedHideShortcuts = true;
        writeForcedHideShortcutsFlag(true);
      }

      if (normalizedTier === 'tier3' || normalizedTier === 'full') {
        if (forcedHideShortcuts) {
          if (hideShortcutsRow.input.checked) {
            hideShortcutsRow.input.checked = false;
            changed = true;
          }
          forcedHideShortcuts = false;
        }
        writeForcedHideShortcutsFlag(false);
        hideShortcutsRow.input.disabled = false;
        hideRateRow.input.disabled = normalizedTier === 'full' ? false : hideRateRow.input.disabled;
      }

      if (normalizedTier === 'full') {
        Object.values(checkboxRows).forEach((row) => {
          if (row && row.input) {
            row.input.disabled = false;
          }
        });
      }

      if (normalizedTier === 'tier1' || normalizedTier === 'tier2') {
        if (hideRateRow.input.checked) {
          hideRateRow.input.checked = false;
          changed = true;
        }
        hideRateRow.input.disabled = true;
      }

      if (changed) {
        saveSettingsLive(avoidNextRow, flagCheckRow, banCalculatorRow, hideRateRow, hideShortcutsRow, stopUserPopupRow, trackRatesRow, modJSExtrasRow, walcornRow, checkTextRow, clicker2Row, misrateWarningRow, warnOnAllRow, farmRow, gifViewerRow, huntAssistRow, batchAssistRow);
      }

      currentTier = normalizedTier;
    };

    
    Object.entries(tabButtons).forEach(([key, btn]) => {
      btn.addEventListener('click', () => {
        if (!currentTabGroups[key] || !currentTabGroups[key].length) {
          return;
        }
        if (activeTab !== key) renderTab(key);
      });
    });

    
    renderTab(activeTab, false);


    
    const versionLabel = document.createElement('div');
    versionLabel.style.fontSize = '12px';
    versionLabel.style.color = '#cccccc';
    versionLabel.style.marginTop = '10px';
    versionLabel.textContent = 'Local version: v' + getLocalVersion();
    menu.append(versionLabel);

  let menuVisible = false;
  let unauthorizedCooldownTimer = null;
  let __fjSelStatusBound = false;

    const setupUnauthorizedButtonState = () => {
      try {
        if (!window.fjApichk || !window.fjApichk.canUseManualRefresh) return;
        const st = window.fjApichk.canUseManualRefresh();
        if (unauthorizedCooldownTimer) { try { clearInterval(unauthorizedCooldownTimer); } catch(_) {} unauthorizedCooldownTimer = null; }
        
        unauthorizedBtn.disabled = false;
        unauthorizedBtn.textContent = 'Update Credentials';
      } catch (_) {}
    };

    const updateAuthorizationUI = (event) => {
      try {
        const detail = event && event.detail ? event.detail : null;
        const api = window.fjApichk || {};
        const authorized = typeof (detail && detail.authorized) === 'boolean'
          ? detail.authorized
          : (typeof api.isAuthorized === 'function' ? api.isAuthorized() : true);

        let level = null;
        if (detail && typeof detail.level !== 'undefined' && detail.level !== null) {
          level = typeof detail.level === 'number' ? detail.level : parseInt(detail.level, 10);
          if (!Number.isFinite(level)) level = null;
        } else if (typeof api.getLevel === 'function') {
          const apiLevel = api.getLevel();
          if (Number.isFinite(apiLevel)) level = apiLevel;
        }

        const excluded = typeof (detail && detail.excluded) === 'boolean'
          ? detail.excluded
          : (typeof api.isExcluded === 'function' ? api.isExcluded() : false);

        if (!authorized) {
          tabRow.style.display = 'none';
          tabContent.style.display = 'none';
          versionLabel.style.display = 'none';
          unauthorizedWrap.style.display = 'flex';
          setupUnauthorizedButtonState();
          currentTier = null;
          return;
        }

        unauthorizedWrap.style.display = 'none';
        tabRow.style.display = 'flex';
        tabContent.style.display = 'flex';
        versionLabel.style.display = '';

        const tier = computeAccessTier({ authorized, level, excluded });
        applyLevelRestrictions(tier);
      } catch (_) {}
    };

    if (!__fjSelStatusBound) {
      document.addEventListener('fjApichkStatus', updateAuthorizationUI, { passive: true });
      __fjSelStatusBound = true;
    }
    updateAuthorizationUI();

    unauthorizedBtn.addEventListener('click', async () => {
      try {
        if (!window.fjApichk || !window.fjApichk.canUseManualRefresh) return;
        try {
          window.fjApichk.clearLevelOverride?.();
        } catch (_) {}
        const st = window.fjApichk.canUseManualRefresh();
        if (!st.allowed) {
          const now = Date.now();
          const minutesLeft = st.resetAt ? Math.ceil(Math.max(0, st.resetAt - now) / 60000) : 5;
          alert(`Please wait ${minutesLeft} minutes before trying again.`);
          return;
        }
        
        const prevText = unauthorizedBtn.textContent;
        unauthorizedBtn.disabled = true;
        unauthorizedBtn.textContent = 'Updating…';
        const doRefresh = (window.fjApichk.requestManualRefresh
          ? window.fjApichk.requestManualRefresh
          : async () => {
              try { await window.fjApichk.ensureFetched?.(true); } catch (_) {}
              return { ok: true, authorized: window.fjApichk.isAuthorized?.() };
            }
        );
        await doRefresh();
        unauthorizedBtn.textContent = prevText;
        unauthorizedBtn.disabled = false;
        
      } catch (_) {}
      setupUnauthorizedButtonState();
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        hideMenu();
      }
    };

    const handleDocumentClick = (event) => {
      if (!wrapper.contains(event.target) && !host.contains(event.target)) {
        hideMenu();
      }
    };

  const showMenu = () => {
      
      if (menuVisible) {
        return;
      }

  let transitionFallbackTimer = null;

      
      updateAuthorizationUI();

      try {
        const rect = toggleButton.getBoundingClientRect();
        host.style.display = 'block';
        host.style.visibility = 'hidden';

        host.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease';
        host.style.willChange = 'transform, opacity';
        host.style.transform = 'translateY(-6px)';
        host.style.opacity = '0';

        const hostW = host.offsetWidth || 320;
        const hostH = host.offsetHeight || 200;

        const docScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const docScrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;

        const spaceBelow = window.innerHeight - rect.bottom;
        const topDocPos = (spaceBelow >= hostH + 8)
          ? (docScrollY + rect.bottom + 6)
          : Math.max(docScrollY + 8, docScrollY + rect.top - hostH - 6);

        let leftDocPos = docScrollX + rect.left;
        const maxLeft = docScrollX + Math.max(8, window.innerWidth - hostW - 8);
        if (leftDocPos > maxLeft) {
          leftDocPos = maxLeft;
        }

        host.style.top = topDocPos + 'px';
        host.style.left = leftDocPos + 'px';
        host.style.visibility = '';

        menuVisible = true;

        host.style.display = 'block';
        host.setAttribute('aria-hidden', 'false');
        const slickModule = window.fjTweakerModules && window.fjTweakerModules.slick;
        if (slickModule && typeof slickModule.openTweakerMenu === 'function') {
          try {
            slickModule.openTweakerMenu(host).catch(() => {});
          } catch (e) {}
        } else {
          host.offsetHeight;
          host.style.transform = 'translateY(0)';
          host.style.opacity = '1';
          transitionFallbackTimer = setTimeout(() => {
            host.style.transition = '';
            host.style.willChange = '';
            transitionFallbackTimer = null;
          }, 400);
        }

        toggleButton.setAttribute('aria-expanded', 'true');
        document.addEventListener('click', handleDocumentClick, true);
        document.addEventListener('keydown', handleKeyDown, true);
      } catch (error) {
        try {
          console.warn('fjTweaker(sel): showMenu caught', error);
        } catch (e) {}
        try {
          host.style.display = 'block';
          host.style.visibility = '';
          host.setAttribute('aria-hidden', 'false');
          toggleButton.setAttribute('aria-expanded', 'true');
          document.addEventListener('click', handleDocumentClick, true);
          document.addEventListener('keydown', handleKeyDown, true);
          menuVisible = true;
        } catch (err) {
          try {
            console.warn('fjTweaker(sel): failed to show menu', err);
          }
 catch(e) {}
        }
        if (transitionFallbackTimer) {
          clearTimeout(transitionFallbackTimer);
        }
      }

      try {
        const rects = host.getClientRects && host.getClientRects();
        if ((!rects || rects.length === 0) && host.style.display !== 'none') {
          host.style.transition = '';
          host.style.willChange = '';
          host.style.transform = '';
          host.style.opacity = '';
          host.style.display = 'block';
          host.style.visibility = '';
          host.setAttribute('aria-hidden', 'false');
        }
      } catch (err) {
      }
    };

  const hideMenu = () => {
      
      if (!menuVisible) {
        return;
      }

  try { if (unauthorizedCooldownTimer) { clearInterval(unauthorizedCooldownTimer); unauthorizedCooldownTimer = null; } } catch(_) {}

      host.setAttribute('aria-expanded', 'false');
      const slickModule = window.fjTweakerModules && window.fjTweakerModules.slick;
      if (slickModule && typeof slickModule.closeTweakerMenu === 'function') {
        try {
          slickModule.closeTweakerMenu(host).then(() => {
            try {
              menuVisible = false;
              host.style.display = 'none';
              host.setAttribute('aria-hidden', 'true');
            } catch (e) {}
            toggleButton.setAttribute('aria-expanded', 'false');
            document.removeEventListener('click', handleDocumentClick, true);
            document.removeEventListener('keydown', handleKeyDown, true);
          }).catch(() => {
            menuVisible = false;
            host.style.display = 'none';
            host.setAttribute('aria-hidden', 'true');
            toggleButton.setAttribute('aria-expanded', 'false');
            document.removeEventListener('click', handleDocumentClick, true);
            document.removeEventListener('keydown', handleKeyDown, true);
          });
        } catch (e) {
          menuVisible = false;
          host.style.display = 'none';
          host.setAttribute('aria-hidden', 'true');
          toggleButton.setAttribute('aria-expanded', 'false');
          document.removeEventListener('click', handleDocumentClick, true);
          document.removeEventListener('keydown', handleKeyDown, true);
        }
      } else {
        
        try {
          if (host.style.display === 'none') host.style.display = 'block';
          host.style.visibility = '';
        } catch (e) {}

        try {
          host.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease';
          host.style.willChange = 'transform, opacity';
          host.style.transform = 'translateY(0)';
          host.style.opacity = '1';
          host.offsetHeight;
        } catch (e) {}

        let finishedInline = false;
        const clearInline = () => {
          if (finishedInline) return;
          finishedInline = true;
          try {
            host.removeEventListener('transitionend', onInlineEnd);
          }
 catch (e) {}
          try {
            host.style.transition = ''; host.style.willChange = '';
          }
 catch (e) {}
          try {
            menuVisible = false; host.style.display = 'none'; host.setAttribute('aria-hidden', 'true');
          }
 catch (e) {}
          try {
            toggleButton.setAttribute('aria-expanded', 'false');
          }
 catch (e) {}
          try {
            document.removeEventListener('click', handleDocumentClick, true);
          }
 catch (e) {}
          try {
            document.removeEventListener('keydown', handleKeyDown, true);
          }
 catch (e) {}
        };

        const onInlineEnd = (ev) => {
          if (ev.target !== host) return;
          clearInline();
        };

        try {
          host.addEventListener('transitionend', onInlineEnd);
          host.style.transform = 'translateY(-6px)';
          host.style.opacity = '0';
          setTimeout(clearInline, 420);
        } catch (e) {
          clearInline();
        }
      }
    };

    toggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menuVisible) {
        hideMenu();
      } else {
        showMenu();
      }
    });
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


