(() => {
  /*
   * Legacy mod.js enhancer.
   * Adds inline info buttons, blocks known-broken toggles, suppresses
   * useless popups, and lets mods export/import their favorite combos.
   * All storage is mirrored through chrome.storage so it survives reloads.
   */
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'modjs';
  const SETTING_KEY = 'modJSExtras';
  const LEGACY_SETTING_KEY = 'modJSRecall';
  const STORAGE_KEY = 'fjTweakerModJSState';
  const OVERLAY_ID = 'fj-modjs-overlay';
  const BROKEN_TOOLTIP = 'Broken setting disabled. Press Submit to remove.';
  const INFO_COPY = {
    New7902: "Admin's up to something. Dunno what. Do not enable.",
    ComplaintBETA: 'Defunct.',
    fadeContributorsOnSFWMOD: 'Unknown.',
    forceUnratedNext: 'Unknown.',
    TESTENTRY: 'Unknown.',
    execModFJMemeTools: 'Tools for Level 8+ moderators.',
    flagNotice: 'Shows important information left by other mods when trying to flag content or comments.',
    adminIsABigNigger: 'Adds some custom styles to make things a bit prettier',
    commentLinker: 'Debugging tool, adds a button to get the comment ID without having to inspect element. Worthless for most mods.',
    userHistory: 'Grants access to user history buttons on profiles.',
    permaBan: 'Adds a permaban button on user profiles, must have explicit access granted by Posttwo.',
    contentReview: 'Used by instructors to review content rated by students.',
    userFlagPatrolTicker: 'Adds a counter to the navbar that shows the number of user flags that need to be reviewed. Enable only if you take care of user flags on FJMeme.',
    HideShitpostNotes: 'Hides mod notes marked as shitposts.',
    outboundCase: 'Allows you to send messages through fjmodbot directly on FJ instead of on fjme.me.',
    getUserFlagHistory: 'Enables you to see which user flags a user has made, useful for checking if a user is abusing the function.',
    SYNCTEST2: 'Defunct.',
    stringFlagDANGER: "Allows you to mass flag comments matching a string. Don't.",
    MainHelperFunctions: 'Mod.js will not work without this.',
    commentExtraButtons: "Adds buttons to each comment such as 'Users with same IP', 'Ban User', 'Disable user custom color'.",
    ModHelp: "Adds 'Mod Help' button to all content images which will send a message in #mod-help.",
    userNotes: "Allows you to see or add notes to a user's profile.",
    mentionModsNOHELPER: 'Adds buttons to mass mention mods.',
    banRequestForm: "Adds a 'Request Ban' button on profiles.",
    banRequestTicker: 'Adds a count of current ban requests on top bar.',
    arriveUNLESSASKED: 'Mod.js will not work without this.',
    disableBoardCSSNOHELPER: 'Unknown.',
    discordResolver: 'Button to find FJMeme accounts connected to the user. Required if you use execModFJMemeTools.',
    ocHelper: 'Unknown.',
    arrive2UNLESSASKED: 'Mod.js will not work without this.',
    djTools: "Don't.",
    massFlagUserComments: 'Enables you to use the mass flag comments tool on SFW comment pages, very useful for spam flags.',
    showImageSpoilers: "Automatically reveals image which have been 'spoilered'.",
    admincsstest: 'Unknown.',
    makeToolsPretty: 'Makes some modjs like ModHelp pretty.',
    showTextSpoilers: 'Auto-shows text spoilers.'
  };

  const SUPPRESSED_DIALOGS = [
    {
      id: 'flashM',
      titlePattern: /posttwo extension/i,
      messagePattern: /please enable arrive/i
    }
  ];

  const SUPPRESSED_MODAL_PATTERNS = [/you dumb fuck/i];

  const brokenJS = [
    'admincsstest', 
    'djTools', 
    'stringFlagDANGER', 
    'banRequestForm', 
    'banRequestTicker', 
    'ComplaintBETA', 
    'disableBoardCSSNOHELPER',
    'fadeContributorsOnSFWMOD',
    'forceUnratedNext',
    'mentionModsNOHELPER',
    'ocHelper', 
    'permaBan',
    'SYNCTEST2', 
    'TESTENTRY', 
    'makeToolsPretty', 
    'New7902', 
    'userFlagPatrolTicker'];

  let observer = null;
  let featureEnabled = true;
  let lastSavedState;
  let storageLoadPromise = null;
  let enhancementsScheduled = false;
  const patchedDialogFns = {};

  const storageArea = typeof chrome !== 'undefined' && chrome?.storage?.local ? chrome.storage.local : null;

  // Kill noisy arrive warnings that mod.js likes to spawn.
  // Scan the page for known spammy dialog DOM nodes and rip them out.
  const suppressHtmlDialogs = () => {
    if (typeof document === 'undefined') {
      return;
    }

    let dialogSuppressed = false;

    SUPPRESSED_DIALOGS.forEach((config) => {
      const node = document.getElementById(config.id);
      if (!node) {
        return;
      }

      const titleElement = node.querySelector?.('.ui-dialog-title');
      const titleText = titleElement?.textContent || '';
      if (config.titlePattern && !config.titlePattern.test(titleText)) {
        return;
      }

      const messageText = node.textContent || '';
      if (config.messagePattern && !config.messagePattern.test(messageText)) {
        return;
      }

      const dialogContainer = node.classList?.contains('ui-dialog') ? node : node.closest?.('.ui-dialog');
      if (dialogContainer) {
        dialogContainer.remove();
      } else {
        node.remove();
      }
      dialogSuppressed = true;
    });

    if (dialogSuppressed) {
      document.querySelectorAll('.ui-widget-overlay').forEach((overlay) => {
        overlay.remove();
      });
    }
  };

  // Monkey patch window.alert/confirm/prompt so insulting mod.js popups never appear.
  const interceptDialogMethod = (method) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (patchedDialogFns[method]) {
      return;
    }

    const original = window[method];
    if (typeof original !== 'function') {
      return;
    }

    const suppressedReturn = method === 'confirm' ? false : method === 'prompt' ? null : undefined;

    const patched = function patchedDialogMethod(...args) {
      if (args.length > 0) {
        try {
          const message = args[0] == null ? '' : String(args[0]);
          if (SUPPRESSED_MODAL_PATTERNS.some((pattern) => pattern.test(message))) {
            return suppressedReturn;
          }
        } catch (_) {}
      }
      return original.apply(this, args);
    };

    patchedDialogFns[method] = { original, patched };
    window[method] = patched;
  };

  const ensureModalSuppression = () => {
    ['alert', 'confirm', 'prompt'].forEach(interceptDialogMethod);
  };

  const restoreDialogMethod = (method) => {
    if (typeof window === 'undefined') {
      return;
    }

    const record = patchedDialogFns[method];
    if (!record) {
      return;
    }

    if (window[method] === record.patched) {
      window[method] = record.original;
    }

    delete patchedDialogFns[method];
  };

  const restoreModalSuppression = () => {
    ['alert', 'confirm', 'prompt'].forEach(restoreDialogMethod);
  };

  const resolveSettingFlag = (source) => {
    if (!source) {
      return undefined;
    }
    if (typeof source[SETTING_KEY] !== 'undefined') {
      return source[SETTING_KEY];
    }
    if (typeof source[LEGACY_SETTING_KEY] !== 'undefined') {
      return source[LEGACY_SETTING_KEY];
    }
    return undefined;
  };

  const createFallbackInfoButton = (text, size = 20) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'i';
    button.dataset.placement = 'right';
    button.style.backgroundImage = 'none';
    const dimension = typeof size === 'number' ? size + 'px' : (size || '20px');
    Object.assign(button.style, {
      width: dimension,
      height: dimension,
      font: "600 12px 'Segoe UI', sans-serif",
      color: '#f8f8f8',
      background: 'rgba(40, 40, 40, 0.85)',
      border: '1px solid #555',
      borderRadius: '50%',
      cursor: 'pointer',
      flexShrink: '0'
    });
    button.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    return button;
  };



  const createInfoButton = (text, size = 24, placement = 'right') => {
    if (window.fjTweakerInfo?.createInfoButton) {
      return window.fjTweakerInfo.createInfoButton({
        text: text?.length ? text : 'PLACEHOLDER: ModJS entry',
        size,
        placement
      });
    }
    return createFallbackInfoButton(text, size);
  };

  // Inject info buttons next to every mod.js checkbox line so newcomers know what it does.
  const attachInfoButtonsToPanel = (root) => {
    if (!root) {
      return;
    }

    if (!Array.isArray(root._fjModJsInfoRows)) {
      root._fjModJsInfoRows = [];
    }

    const labels = root.querySelectorAll('label.listJS');
    const newlyAttached = [];

    labels.forEach((label) => {
      if (!label || label.dataset.fjModJsInfoAttached === '1') {
        return;
      }

      const parent = label.parentElement;
      if (!parent) {
        return;
      }

      const row = document.createElement('div');
      row.className = 'fj-modjs-info-row';
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'stretch',
        gap: '6px',
        width: '100%'
      });

      parent.insertBefore(row, label);
      row.append(label);

      const previousFlex = label.style.flex || '';
        const previousMargin = label.style.margin || '';

        label.dataset.fjModJsInfoAttached = '1';
        label.dataset.fjModJsInfoFlex = previousFlex;
        label.dataset.fjModJsInfoMargin = previousMargin;
        label.style.flex = '1 1 auto';
        label.style.margin = '0';

      const labelText = label.textContent.trim();
      const key = labelText.includes(':') ? labelText.split(':')[1].trim() : '';
      const infoTarget = key ? Object.keys(INFO_COPY).find(k => k.toLowerCase().replace(/\s/g, '') === key.toLowerCase().replace(/\s/g, '')) : undefined;

      
      

      const labelTitle = (label.textContent || '').replace(/\s+/g, ' ').trim() || key || 'Details';
      const infoCopy = infoTarget ? INFO_COPY[infoTarget] : undefined;
      const infoText = infoCopy || `TESTING: ${labelTitle}`;
        const infoButton = createInfoButton(infoText, 22, 'right');
        if (window.fjTweakerInfo?.updateTooltip) {
          window.fjTweakerInfo.updateTooltip(infoButton, infoText);
        } else {
          infoButton.dataset.fjInfoText = infoText;
        }
        infoButton.style.alignSelf = 'center';
        infoButton.style.flexShrink = '0';
        infoButton.style.marginLeft = '6px';
        infoButton.dataset.fjInfoTarget = infoTarget;
        infoButton.addEventListener('click', (event) => {
          event.stopPropagation();
        });

        row.append(infoButton);

      newlyAttached.push({ row, label });
    });


    if (newlyAttached.length > 0) {
      root._fjModJsInfoRows.push(...newlyAttached);
    }
  };

  
  
  // Hide or auto-untick known broken/banned toggles so they are never resubmitted.
  const removeBrokenRows = (root) => {
    
    if (!root) return;

    const labels = root.querySelectorAll('label.listJS');
    labels.forEach((label) => {
      const row = label.closest('.fj-modjs-info-row');
      const btnTarget = row?.querySelector?.('[data-fj-info-target]')?.dataset?.fjInfoTarget;
      let infoTarget = btnTarget;
      if (!infoTarget) {
        const txt = (label.textContent || '').trim();
        const key = txt.includes(':') ? txt.split(':')[1].trim() : '';
        if (key) {
          infoTarget = Object.keys(INFO_COPY).find(
            (k) => k.toLowerCase().replace(/\s/g, '') === key.toLowerCase().replace(/\s/g, '')
          );
        }
      }
      if (!infoTarget || !brokenJS.includes(infoTarget)) return;

      const input = label.querySelector?.('.idJS');
      let autoUnticked = false;
      if (input && input.checked) {
        input.checked = false;
        autoUnticked = true;
        label.dataset.fjAutoUnticked = '1';
        try {
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (_) {}
      }

      
      if (!input) return;

      
      if (!input.checked && label.dataset.fjAutoUnticked !== '1') {
        if (row) row.style.display = 'none'; else label.style.display = 'none';
        return;
      }

      
      if (label.dataset.fjAutoUnticked === '1') {
        if (row) row.style.display = ''; else label.style.display = '';
        
        const targetEl = row || label;
        if (targetEl) {
          targetEl.style.removeProperty('background');
          targetEl.style.removeProperty('border');
          targetEl.style.removeProperty('border-radius');
          targetEl.style.removeProperty('padding');
        }
        
        label.style.color = '#e74c3c';
        try { label.title = BROKEN_TOOLTIP; } catch (_) {}
        
        const infoBtn = row?.querySelector?.('[data-fj-info-target]');
        if (infoBtn) {
          const current = infoBtn.dataset?.fjInfoText || '';
          if (current !== BROKEN_TOOLTIP) {
            if (window.fjTweakerInfo?.updateTooltip) {
              window.fjTweakerInfo.updateTooltip(infoBtn, BROKEN_TOOLTIP);
            }
            infoBtn.dataset.fjInfoText = BROKEN_TOOLTIP;
            infoBtn.title = BROKEN_TOOLTIP;
          }
        }
      }
    });
  };

  const detachInfoButtonsFromPanel = (root) => {
    if (!root || !Array.isArray(root._fjModJsInfoRows)) {
      return;
    }

    root._fjModJsInfoRows.forEach(({ row, label }) => {
      if (!label) {
        if (row) {
          row.remove();
        }
        return;
      }

      if (row && row.parentElement) {
        row.parentElement.insertBefore(label, row);
      }

      if (label.dataset.fjModJsInfoFlex !== undefined) {
        label.style.flex = label.dataset.fjModJsInfoFlex;
      } else {
        label.style.removeProperty('flex');
      }

      if (label.dataset.fjModJsInfoMargin !== undefined) {
        label.style.margin = label.dataset.fjModJsInfoMargin;
      } else {
        label.style.removeProperty('margin');
      }

      delete label.dataset.fjModJsInfoAttached;
      delete label.dataset.fjModJsInfoFlex;
      delete label.dataset.fjModJsInfoMargin;

      if (row) {
        row.remove();
      }
    });

    root._fjModJsInfoRows = [];
  };

  // Pull the last "Submit" payload from chrome.storage (if available).
  const loadStoredState = () => {
    if (!storageArea) {
      lastSavedState = null;
      return Promise.resolve(null);
    }

    if (typeof lastSavedState !== 'undefined') {
      return Promise.resolve(lastSavedState);
    }

    if (storageLoadPromise) {
      return storageLoadPromise;
    }

    storageLoadPromise = new Promise((resolve) => {
      storageArea.get([STORAGE_KEY], (items) => {
        if (chrome.runtime?.lastError) {
          lastSavedState = null;
        } else {
          const stored = items?.[STORAGE_KEY];
          if (stored && Array.isArray(stored.checked)) {
            lastSavedState = stored;
          } else {
            lastSavedState = null;
          }
        }
        resolve(lastSavedState);
        storageLoadPromise = null;
      });
    });

    return storageLoadPromise;
  };

  // Mirror every submission into chrome.storage so Recall/Export share the same data.
  const saveStoredState = (state) => {
    if (!storageArea) {
      lastSavedState = state;
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      storageArea.set({ [STORAGE_KEY]: state }, () => {
        if (chrome.runtime?.lastError) {
          resolve(false);
          return;
        }
        lastSavedState = state;
        resolve(true);
      });
    });
  };

  const closeOverlay = () => {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) {
      existing.remove();
    }
  };

  // Lightweight modal used for the import/export workflows.
  const showOverlay = (options) => {
    closeOverlay();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '2147483647'
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      minWidth: '260px',
      maxWidth: '360px',
      padding: '16px',
      background: '#151515',
      color: '#f8f8f8',
      border: '1px solid #333',
      borderRadius: '6px',
      boxShadow: '0 10px 24px rgba(0, 0, 0, 0.55)',
      font: "500 14px 'Segoe UI', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    });

    const title = document.createElement('div');
    title.textContent = options.title;
    title.style.fontSize = '15px';
    title.style.fontWeight = '600';
    panel.append(title);

    let input;
    if (options.mode === 'export') {
      input = document.createElement('input');
      input.type = 'text';
      input.readOnly = true;
      input.value = options.code || '';
      Object.assign(input.style, {
        width: '100%',
        padding: '6px 8px',
        background: '#1f1f1f',
        color: '#d7ffd7',
        border: '1px solid #3a3a3a',
        borderRadius: '4px',
        fontFamily: 'monospace'
      });
      input.addEventListener('focus', () => {
        input.select();
      });
      panel.append(input);
    } else {
      input = document.createElement('textarea');
      input.rows = 3;
      input.placeholder = 'Paste code here';
      Object.assign(input.style, {
        width: '100%',
        padding: '6px 8px',
        background: '#1f1f1f',
        color: '#f8f8f8',
        border: '1px solid #3a3a3a',
        borderRadius: '4px',
        resize: 'none',
        fontFamily: 'monospace'
      });
      panel.append(input);
    }

    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.justifyContent = options.mode === 'export' ? 'flex-end' : 'space-between';
    buttonRow.style.gap = '8px';

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    Object.assign(closeButton.style, {
      padding: '4px 10px',
      background: '#262626',
      color: '#f0f0f0',
      border: '1px solid #444',
      borderRadius: '4px',
      cursor: 'pointer'
    });

    closeButton.addEventListener('click', () => {
      closeOverlay();
    });

    if (options.mode === 'export') {
      buttonRow.append(closeButton);
    } else {
      const applyButton = document.createElement('button');
      applyButton.textContent = 'Apply';
      Object.assign(applyButton.style, {
        padding: '4px 10px',
        background: '#1f4d2a',
        color: '#baffc9',
        border: '1px solid #2f6d3d',
        borderRadius: '4px',
        cursor: 'pointer'
      });

      applyButton.addEventListener('click', () => {
        const value = input.value.trim();
        options.onApply?.(value);
      });

      buttonRow.append(applyButton, closeButton);
    }

    panel.append(buttonRow);
    overlay.append(panel);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeOverlay();
      }
    });

    document.body.append(overlay);
    if (options.mode === 'export') {
      input.focus();
      input.select();
    }
  };

  const showStatus = (label, message, color = '#cccccc') => {
    if (!label) {
      return;
    }
    label.textContent = message;
    label.style.color = color;
  };

  const collectState = (root) => {
    const checked = Array.from(root.querySelectorAll('.idJS'))
      .filter((input) => input.checked)
      .map((input) => input.value)
      .filter((value) => value)
      .sort((a, b) => Number(a) - Number(b));

    return {
      checked,
      timestamp: Date.now()
    };
  };

  const applyState = (root, state) => {
    if (!state || !Array.isArray(state.checked)) {
      return;
    }

    const checkedSet = new Set(state.checked);
    const inputs = root.querySelectorAll('.idJS');

    inputs.forEach((input) => {
      const shouldCheck = checkedSet.has(input.value);
      if (input.checked !== shouldCheck) {
        input.checked = shouldCheck;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    
    removeBrokenRows(root);
  };

  const encodeState = (state) => {
    if (!state || !Array.isArray(state.checked)) {
      return 'MJR1:-';
    }

    const body = state.checked
      .map((id) => {
        const numeric = Number(id);
        return Number.isFinite(numeric) ? numeric.toString(36) : id;
      })
      .join('.');

    return `MJR1:${body || '-'}`;
  };

  const decodeStateCode = (code) => {
    const trimmed = (code || '').trim();
    if (!trimmed) {
      throw new Error('Code is empty');
    }

    const prefix = 'MJR1:';
    if (!trimmed.startsWith(prefix)) {
      throw new Error('Unknown code format');
    }

    const body = trimmed.slice(prefix.length);
    if (!body || body === '-') {
      return [];
    }

    const ids = body.split('.').map((segment) => {
      if (!segment) {
        throw new Error('Invalid code segment');
      }
      const value = parseInt(segment, 36);
      if (!Number.isFinite(value)) {
        throw new Error('Invalid number in code');
      }
      return String(value);
    });

    return ids.sort((a, b) => Number(a) - Number(b));
  };

  // Attach recall/import/export controls once the mod.js panel appears.
  // Inject recall/import/export buttons once the mod.js panel exists.
  // Wire recall/import/export controls and info buttons after mod.js injects its list.
  const ensurePanelEnhancements = async (root) => {
    if (!featureEnabled || !root) {
      return;
    }
    
    removeBrokenRows(root);

    attachInfoButtonsToPanel(root);
    if (root && root.style) {
      root.style.overflowX = 'visible';
    }

    
    removeBrokenRows(root);

    const submitSpan = root.querySelector('#submitJ');
    if (!submitSpan || submitSpan.dataset.fjModJsEnhanced === '1') {
      return;
    }

    const controlRow = document.createElement('span');
    controlRow.className = 'fj-modjs-controls';
    Object.assign(controlRow.style, {
      display: 'inline-flex',
      gap: '6px',
      marginLeft: '10px',
      alignItems: 'center'
    });

    const createButton = (label) => {
      const button = document.createElement('button');
      button.textContent = label;
      Object.assign(button.style, {
        padding: '2px 8px',
        font: "500 12px 'Segoe UI', sans-serif",
        color: '#f8f8f8',
        background: '#2a2a2a',
        border: '1px solid #3d3d3d',
        borderRadius: '4px',
        cursor: 'pointer'
      });
      button.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      return button;
    };

    const recallButton = createButton('Recall');
    const importButton = createButton('Import');
    const exportButton = createButton('Export');

    controlRow.append(recallButton, importButton, exportButton);

    const statusLabel = document.createElement('div');
    Object.assign(statusLabel.style, {
      fontSize: '11px',
      color: '#bdbdbd',
      marginTop: '6px'
    });

    submitSpan.insertAdjacentElement('afterend', controlRow);
    controlRow.insertAdjacentElement('afterend', statusLabel);

    const handleSubmitClick = async () => {
      if (!featureEnabled) {
        return;
      }
      const state = collectState(root);
      const persisted = await saveStoredState(state);
      if (persisted) {
        showStatus(statusLabel, 'Mod JS selection saved.', '#7cfc00');
      } else if (storageArea) {
        showStatus(statusLabel, 'Unable to save to storage.', '#ffb347');
      } else {
        showStatus(statusLabel, 'Stored for this session.', '#87ceeb');
      }
    };

    submitSpan.addEventListener('click', handleSubmitClick, true);

    const recallHandler = async () => {
      const state = await loadStoredState();
      if (!state || !Array.isArray(state.checked) || state.checked.length === 0) {
        if (state && Array.isArray(state.checked) && state.checked.length === 0) {
          applyState(root, state);
          showStatus(statusLabel, 'No settings were saved previously.', '#cccccc');
        } else {
          showStatus(statusLabel, 'No saved submission yet.', '#ffb347');
        }
        return;
      }
      applyState(root, state);
      showStatus(statusLabel, 'Mod JS selection recalled.', '#7cfc00');
    };

    const exportHandler = async () => {
      const state = await loadStoredState();
      if (!state || !Array.isArray(state.checked)) {
        showStatus(statusLabel, 'Nothing to export yet.', '#ffb347');
        return;
      }
      const code = encodeState(state);
      showOverlay({
        mode: 'export',
        title: 'Export Mod JS Settings',
        code
      });
      showStatus(statusLabel, 'Export code generated.', '#87ceeb');
    };

    const importHandler = () => {
      showOverlay({
        mode: 'import',
        title: 'Import Mod JS Settings',
        onApply: (value) => {
          try {
            const ids = decodeStateCode(value);
            const state = {
              checked: ids,
              timestamp: Date.now()
            };
            applyState(root, state);
            showStatus(statusLabel, 'Imported settings applied. Submit to save.', '#87ceeb');
            closeOverlay();
          } catch (error) {
            showStatus(statusLabel, error?.message || 'Import failed.', '#ff6347');
          }
        }
      });
    };

    recallButton.addEventListener('click', recallHandler);
    importButton.addEventListener('click', importHandler);
    exportButton.addEventListener('click', exportHandler);

    const cleanup = () => {
      submitSpan.removeEventListener('click', handleSubmitClick, true);
      recallButton.removeEventListener('click', recallHandler);
      importButton.removeEventListener('click', importHandler);
      exportButton.removeEventListener('click', exportHandler);
      detachInfoButtonsFromPanel(root);
      controlRow.remove();
      statusLabel.remove();
      delete submitSpan.dataset.fjModJsEnhanced;
      delete root._fjModJsCleanup;
    };

    root._fjModJsCleanup = cleanup;
    submitSpan.dataset.fjModJsEnhanced = '1';

    await loadStoredState();
  };

  // Tear down event handlers if the user disables the feature mid-session.
  const cleanupPanel = () => {
    const root = document.getElementById('pollzlistJS');
    if (root && typeof root._fjModJsCleanup === 'function') {
      root._fjModJsCleanup();
    }
  };

  // Watch for the mod.js UI being inserted so enhancements can reapply.
  const startObserver = () => {
    if (observer || !document.body) {
      return;
    }

    observer = new MutationObserver(() => {
      if (!featureEnabled) {
        return;
      }
      suppressHtmlDialogs();
      const panel = document.getElementById('pollzlistJS');
      if (panel) {
        ensurePanelEnhancements(panel);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  // Disconnect the MutationObserver when the extras are disabled to avoid leaks.
  const stopObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  // Master toggle (always enabled in the student build).
  const applySetting = (enabled) => {
    featureEnabled = Boolean(enabled);

    if (featureEnabled) {
      ensureModalSuppression();
      suppressHtmlDialogs();
      startObserver();
      const panel = document.getElementById('pollzlistJS');
      if (panel) {
        ensurePanelEnhancements(panel);
      }
    } else {
      restoreModalSuppression();
      stopObserver();
      cleanupPanel();
      closeOverlay();
    }
  };

  // Entry point: respect host guard, hydrate storage cache, and register listeners.
  const init = () => {
    if (window.location.hostname !== targetHost) {
      return;
    }

    loadStoredState();
    applySetting(true);
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init };
  init();
})();