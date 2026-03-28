(() => {
  /*
   * Shortcut customization system.
   * Rebuilds the SFW mod quick-rate buttons so mods can assign skins,
  * PCs, categories, and alternate hotkeys.
   * Also injects the customization dialog and keyboard handler glue.
   */

  var originalButtonState = window.fjCustomShortcutOriginals || {};
  window.fjCustomShortcutOriginals = originalButtonState;
  
  const CUSTOM_SHORTCUT_EVENT = 'fjCustomShortcutTriggered';
  const buttonHandlers = window.fjCustomShortcutHandlers || new WeakMap();
  window.fjCustomShortcutHandlers = buttonHandlers;

  // Broadcasts a single event so downstream modules can react to shortcut activation
  const dispatchCustomShortcutEvent = (button, slot, source = 'custom-button') => {
    if (!button) {
      return;
    }
    const detail = { button, slot, source };
    const eventInit = { detail, bubbles: true, composed: true };
    try {
      window.dispatchEvent(new CustomEvent(CUSTOM_SHORTCUT_EVENT, eventInit));
    } catch (_) {}
  };

  
  // Collapse verbose KeyboardEvent codes into concise label text
  function formatHotkeyDisplay(label) {
    try {
      if (!label || typeof label !== 'string') {
        return '';
      }
      
      const m = /^Numpad([0-9])$/.exec(label);
      if (m) {
        return m[1];
      }
      return label;
    } catch (err) {
      return '';
    }

  }

  
  // Returns either the stored custom label or the legacy Numpad fallback
  function getEffectiveHotkeyLabelForRow(customSettings, i) {
    const row = customSettings && customSettings[i];
    const result = (row && row.hotkeyLabel) ? row.hotkeyLabel : ('Numpad' + i);
    return result;
  }

  
  // Prevent duplicate bindings across rows (and optionally the Next button)
  function hotkeyConflicts(customSettings, label, excludeRowIdx, excludeNext) {
    if (!label) {
      return false;
    }
    let conflictFound = false;
    
    for (let j = 1; j <= 8; j++) {
      if (excludeRowIdx && j === excludeRowIdx) {
        continue;
      }
      const effective = getEffectiveHotkeyLabelForRow(customSettings, j);
      if (effective === label) {
        conflictFound = true;
        break;
      }
    }
    if (!conflictFound && !excludeNext) {
      const nextLabel = (customSettings && customSettings.nextUnratedHotkeyLabel) || 'Numpad9';
      if (nextLabel === label) conflictFound = true;
    }
    return conflictFound;
  }

  
  // Keeps the "Next unrated" button's badge in sync with the stored label
  function updateNextUnratedShortKeyUI() {
    try {
      let customSettings = {};
      try {
        const raw = localStorage.getItem('fjCustomShortcuts');
        customSettings = JSON.parse(raw || '{}');
      } catch (err) {
        customSettings = {};
      }
      const nextBtn = document.getElementById('skinGuide');
      if (!nextBtn) {
        return;
      }
      let shortKey = nextBtn.querySelector('.shortKey');
      if (!shortKey) {
        shortKey = document.createElement('div');
        shortKey.className = 'shortKey';
        nextBtn.insertBefore(shortKey, nextBtn.firstChild);
      }
      const label = (customSettings && customSettings.nextUnratedHotkeyLabel) || 'Numpad9';
      shortKey.textContent = formatHotkeyDisplay(label) || '9';
    } catch (err) {
    }
  }

  
  // If custom shortcuts are disabled we restore the DOM we captured earlier
  function restoreOriginalButtons() {
    try {
      const buttons = getCustomShortcutButtons ? getCustomShortcutButtons() : [];
      (buttons || []).forEach((btn) => {
        if (!btn || !btn.id) return;
        const orig = originalButtonState[btn.id];
        if (orig && typeof orig.html === 'string') {
          try {
            btn.outerHTML = orig.html;
          }
 catch (_) {}
          delete originalButtonState[btn.id];
        }
      });
    } catch (err) {
    }
  }

  
  // Replaces the /skin/pc text while stripping old copies
  function updateShortcutSuffix(el, skin, pc) {
    try {
      const suffixClass = 'sccustom-suffix';
      
      const existing = el.querySelector('.' + suffixClass);
      if (existing) existing.remove();
      
      const toRemove = [];
      el.childNodes.forEach(n => {
        if (n.nodeType === Node.TEXT_NODE) {
          const txt = (n.textContent || '').trim();
          if (/^\/\d+\/\d+(?:\/n)?$/.test(txt)) toRemove.push(n);
        }
      });
      toRemove.forEach(n => n.remove());
      
      const s = (skin ? parseInt(skin, 10) : 1) || 1;
      const p = (pc ? parseInt(pc, 10) : 1) || 1;
      const suffixStr = `/${s}/${p}`;
      const span = document.createElement('span');
      span.className = suffixClass;
      span.textContent = suffixStr;
      el.appendChild(span);
    } catch (err) {
    }
  }

  // Core hook that rewires each quick-rate button to honor the saved profile.
  // Core hook that rewires each quick-rate button to honor the saved profile
  function applyCustomShortcutsHijack() {
    
    try {
      const st = window.fjTweakerSettings || {};
      if (st.hideShortcuts === true || st.hideRateShortcuts === false) {
        restoreOriginalButtons();
        
        
      }
    } catch (err) {
    }
    const buttons = getCustomShortcutButtons();
    
    let customSettings = {};
    try {
      customSettings = JSON.parse(localStorage.getItem('fjCustomShortcuts') || '{}');
    } catch (e) { customSettings = {}; }


    
    (function ensureShortKeyCenteringStyles() {
      const STYLE_ID = 'fj-sccustom-shortkey-center';
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        /* Only horizontal centering; no font/size/vertical changes */
        .ctButton4.desktopRate, #skinGuide.ctButton4 { position: relative; }
        .ctButton4.desktopRate .shortKey, #skinGuide.ctButton4 .shortKey {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }
      `;
      document.head.appendChild(style);
    })();

    
    if (!window.fjOriginalAccessKeys) {
      window.fjOriginalAccessKeys = {};
      buttons.forEach((btn, idx) => {
        if (!btn) return;
        const i = idx + 1;
        const settings = customSettings[i];
        if (settings && settings.hotkeyLabel && settings.hotkeyLabel !== `Numpad${i}`) {
          
          if (btn.accessKey) {
            window.fjOriginalAccessKeys[btn.id] = btn.accessKey;
            btn.accessKey = '';
          }
        }
      });
    }

    
    const catMap = {
      'Politics': {id:2, long:'pol', short:'po'},
      'Anime': {id:5, long:'anime', short:'a'},
      'Gaming': {id:1, long:'games', short:'ga'},
      'Spicy': {id:13, long:'spicy', short:'sp'},
      'Comics/Art': {id:4, long:'comics', short:'co'},
      'Meta': {id:14, long:'meta', short:'m'},
      'Other/Memes': {id:6, long:'other', short:'ot'}
    };

    
    const skinBtnIds = ['skinLevel1', 'skinLevel2', 'skinLevel3'];
    const pcBtnIds = ['pcLevel1', 'pcLevel2', 'pcLevel3'];

    
    const catBtns = {};
    document.querySelectorAll('#catControls .ctButton4').forEach(btn => {
      const id = btn.getAttribute('data-id');
      if (id) catBtns[id] = btn;
    });

    
    buttons.forEach((btn, idx) => {
      
      try {
        const st = window.fjTweakerSettings || {};
        if (st.hideShortcuts === true || st.hideRateShortcuts === false) {
          return;
        }
      } catch (err) {
      }
      if (!btn) {
        return;
      }
      
      const settings = customSettings[idx+1];
      if (!settings || Object.keys(settings).length === 0) {
        
        if (btn.id && originalButtonState[btn.id]) {
          btn.outerHTML = originalButtonState[btn.id].html;
          delete originalButtonState[btn.id];
        }
        return;
      }
      
      if (btn.classList.contains('fj-customize-btn')) {
        return;
      }
      
      if (btn.id && !originalButtonState[btn.id]) {
        originalButtonState[btn.id] = {
          html: btn.outerHTML,
          onclick: btn.getAttribute('onclick')
        };
      }

      
      
      const customHotkey = settings.hotkeyLabel;
      const defaultHotkey = `Numpad${idx+1}`;
      const hasCustomHotkey = customHotkey && customHotkey !== defaultHotkey;
      
      let el = btn;
      try {
        const fresh = btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh, btn);
        el = fresh;
      } catch (cloneErr) {
        el = btn; 
      }
      try {
        if (el && el.dataset) el.dataset.sccustomSlot = String(idx + 1);
      } catch (slotErr) {
      }

      
      let origCat = null, origSkin = 1, origPC = 1;
      let origShort = '', origLong = '';
      const origHTML = (btn.id && originalButtonState[btn.id]) ? originalButtonState[btn.id].html : '';
      if (origHTML) {
        
        const shortMatch = origHTML.match(/<span class="shortRD">(.*?)<\/span>/);
        const longMatch = origHTML.match(/<span class="longRD">(.*?)<\/span>/);
        origShort = shortMatch ? shortMatch[1] : '';
        origLong = longMatch ? longMatch[1] : '';
        
        for (const [cat, map] of Object.entries(catMap)) {
          if (map.short === origShort && map.long === origLong) {
            origCat = cat;
            break;
          }
        }
        
        const skinPCMatch = origHTML.match(/\/(\d+)\/(\d+)/);
        if (skinPCMatch) {
          origSkin = parseInt(skinPCMatch[1], 10) || 1;
          origPC = parseInt(skinPCMatch[2], 10) || 1;
        }
      }

      
      el.onclick = null;
      el.removeAttribute('onclick');
      
      
      
      if (hasCustomHotkey) {
        
        const cleanEl = el.cloneNode(true);
        el.parentNode.replaceChild(cleanEl, el);
        el = cleanEl;
        
        el.onclick = null;
        el.removeAttribute('onclick');
      }
      
      let shortKey = el.querySelector('.shortKey');
      if (!shortKey) {
        shortKey = document.createElement('div');
        shortKey.className = 'shortKey';
        
        const eff = getEffectiveHotkeyLabelForRow(customSettings, idx+1);
        shortKey.textContent = formatHotkeyDisplay(eff) || (idx+1).toString();
        el.insertBefore(shortKey, el.firstChild);
      } else {
        
        const eff = getEffectiveHotkeyLabelForRow(customSettings, idx+1);
        shortKey.textContent = formatHotkeyDisplay(eff) || (idx+1).toString();
      }
      
      let shortRD = el.querySelector('.shortRD');
      if (!shortRD) {
        shortRD = document.createElement('span');
        shortRD.className = 'shortRD';
        el.appendChild(shortRD);
      }
      
      let longRD = el.querySelector('.longRD');
      if (!longRD) {
        longRD = document.createElement('span');
        longRD.className = 'longRD';
        el.appendChild(longRD);
      }

      
      let cat = settings.cat && settings.cat !== 'None' ? settings.cat : origCat;
      if (cat && catMap[cat]) {
        shortRD.textContent = catMap[cat].short;
        longRD.textContent = catMap[cat].long;
      }

      
      const skinForLabel = (settings.skin || origSkin || 1);
      const pcForLabel = (settings.pc || origPC || 1);
      updateShortcutSuffix(el, skinForLabel, pcForLabel);

      
      (() => {
        let arg = null;
        
        if (cat && catMap[cat]) {
          arg = catMap[cat].long;
        } else {
          
          const src = (btn.id && originalButtonState[btn.id] && originalButtonState[btn.id].onclick) || el.getAttribute('onclick') || '';
          const m = src ? src.match(/quickM\(['"]([^'\"]+)['"]/): null;
          arg = m ? m[1] : null;
        }
        if (arg) {
          el.setAttribute('data-sccustom-quickm', arg);
        } else {
          el.removeAttribute('data-sccustom-quickm');
        }
      })();

      
      if (buttonHandlers.has(el)) {
        try {
          el.removeEventListener('click', buttonHandlers.get(el), true);
        }
 catch {}
      }

      
      const handleClick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        const source = e && e.isTrusted === false ? 'synthetic-click' : 'custom-button';
        dispatchCustomShortcutEvent(el, idx + 1, source);
        try {
          const settingsForBtn = customSettings[idx+1] || {};
          

          
          const textMatch = (el.textContent || '').match(/\/(\d+)\/(\d+)/);
          const desiredSkin = settingsForBtn.skin || (textMatch ? parseInt(textMatch[1], 10) : null);
          const desiredPc = settingsForBtn.pc || (textMatch ? parseInt(textMatch[2], 10) : null);
          const selCatImmediate = (settingsForBtn.cat && settingsForBtn.cat !== 'None') ? settingsForBtn.cat : null;

          
          
          try {
            if (selCatImmediate && catMap[selCatImmediate] && catBtns[catMap[selCatImmediate].id]) {
              catBtns[catMap[selCatImmediate].id].click();
            }
          } catch (_) {}

          
          setTimeout(() => {
            if (desiredSkin && skinBtnIds[desiredSkin-1]) {
              const skinBtn = document.getElementById(skinBtnIds[desiredSkin-1]);
              if (skinBtn) {
                skinBtn.click();
              }
            }
          }, 40);

          setTimeout(() => {
            if (desiredPc && pcBtnIds[desiredPc-1]) {
              const pcBtn = document.getElementById(pcBtnIds[desiredPc-1]);
              if (pcBtn) {
                pcBtn.click();
              }
            }
          }, 80);

          
          const scheduleMs = 200;
          const orig = (el.id && originalButtonState[el.id]) ? originalButtonState[el.id] : null;
          setTimeout(() => {
            let quickMArg = null;
            
            const selCat = (settingsForBtn.cat && settingsForBtn.cat !== 'None') ? settingsForBtn.cat : null;
            
            if (selCat && catMap[selCat]) {
              quickMArg = catMap[selCat].long;
            }
            
            if (!quickMArg && el.dataset && el.dataset.sccustomQuickm) {
              quickMArg = el.dataset.sccustomQuickm;
            }
            if (!quickMArg && orig && orig.onclick) {
              const m = orig.onclick.match(/quickM\(['"]([^'\"]+)['"]\)/);
              quickMArg = m ? m[1] : null;
            }
            
            if (quickMArg) {
              const newOnclick = `quickM('${quickMArg}', this)`;
              try {
                el.setAttribute('onclick', newOnclick);
              } catch (err) {
              }
              
              try {
                el.removeEventListener('click', handleClick, true);
              } catch (err) {
              }
              
                try {
                  el.click();
              } catch (err) {
              }
              
              setTimeout(() => {
                try {
                  el.removeAttribute('onclick');
                } catch (err) {
                }
                
                try {
                  el.addEventListener('click', handleClick, true);
                  buttonHandlers.set(el, handleClick);
                } catch (err) {
                }
              }, 150);
            }
          }, scheduleMs);
        } catch (err) {
        }
      };

      
      el.addEventListener('click', handleClick, true);
      buttonHandlers.set(el, handleClick);
    });
  }

  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCustomShortcutsHijack);
  } else {
    applyCustomShortcutsHijack();
  }
  document.addEventListener('fjTweakerSettingsChanged', applyCustomShortcutsHijack);
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNextUnratedShortKeyUI);
  } else {
    updateNextUnratedShortKeyUI();
  }
  document.addEventListener('fjTweakerSettingsChanged', updateNextUnratedShortKeyUI);
  
  // Canonical list of button references (desktop first, mobile fallback)
  function getCustomShortcutButtons() {
  let buttons = [];
  const markSlot = (btn, slot) => {
    if (!btn) return btn;
    try {
      if (btn.dataset) {
        btn.dataset.sccustomSlot = String(slot);
      }
    } catch (err) {
    }
    return btn;
  };
  const ensureShortKey = (btn, slot) => {
    if (!btn) return btn;
    let shortKey = btn.querySelector('.shortKey');
    if (!shortKey) {
      shortKey = document.createElement('div');
      shortKey.className = 'shortKey';
      shortKey.textContent = slot.toString();
      btn.insertBefore(shortKey, btn.firstChild);
    } else if (!shortKey.textContent || !shortKey.textContent.trim()) {
      shortKey.textContent = slot.toString();
    }
    return btn;
  };
  
  const desktopBtns = Array.from(document.querySelectorAll('.ctButton4.desktopRate'));
  const mobileBtns = Array.from(document.querySelectorAll('.ctButton4.mobQuickRate'));
  const desktopWorking = desktopBtns.filter(btn => !btn.classList.contains('fj-customize-btn'));
  if (desktopWorking.length >= 6) {
    
    for (let i = 1; i <= 6; ++i) {
      const btn = document.querySelector('.ctButton4.desktopRate#rate'+i+'key');
      const marked = markSlot(btn, i);
      buttons.push(marked || null);
    }
    
    const noIdBtns = desktopWorking.filter(btn => !/^rate\dkey$/.test(btn.id));
    const btn7Candidate = markSlot(noIdBtns[0] || null, 7);
    const btn8Candidate = markSlot(noIdBtns[1] || null, 8);
    const btn7 = ensureShortKey(btn7Candidate, 7);
    const btn8 = ensureShortKey(btn8Candidate, 8);
    buttons.push(btn7 || null);
    buttons.push(btn8 || null);
  } else if (mobileBtns.length >= 6) {
    for (let i = 1; i <= 6; ++i) {
      const btn = document.querySelector('.ctButton4.mobQuickRate#rate'+i+'key');
      const marked = markSlot(btn, i);
      buttons.push(marked || null);
    }
    
    buttons.push(null);
    buttons.push(null);
  } else {
    for (let i = 0; i < 8; ++i) buttons.push(null);
  }
  return buttons;
  }
  
  // Builds the modal UI so mods can edit shortcut metadata without leaving the page.
  // Builds the customization modal and wires all its controls back to storage
  function createCustomShortcutsMenu() {
    if (document.getElementById('fj-sccustom-menu-host')) {
      return;
    }

    
    const host = document.createElement('div');
    host.id = 'fj-sccustom-menu-host';
    Object.assign(host.style, {
      display: 'none',
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '2147483646',
      background: 'rgba(0,0,0,0.18)',
      transition: 'background 0.22s cubic-bezier(.2,.9,.2,1)',
    });
    document.body.appendChild(host);

    
    const menu = document.createElement('div');
    menu.id = 'fj-sccustom-menu';
    Object.assign(menu.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      minWidth: '430px',
      maxWidth: '99vw',
      maxHeight: '80vh',
      background: '#181818',
      color: '#f0f0f0',
      border: '1px solid #333',
      borderRadius: '8px',
      boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
      font: "500 13px 'Segoe UI', sans-serif",
      overflowY: 'auto',
      padding: '18px 36px 16px 36px',
      opacity: '0',
      transition: 'opacity 0.22s cubic-bezier(.2,.9,.2,1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    });

  
  const style = document.createElement('style');
  style.textContent = `#fj-sccustom-menu label { white-space: nowrap; } #fj-sccustom-menu input[type=checkbox] { accent-color: #822ef6; }`;
  menu.appendChild(style);
    host.appendChild(menu);

    
    const CUSTOM_KEY = 'fjCustomShortcuts';
    let customSettings = {};
    try {
      customSettings = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '{}');
    } catch (e) { customSettings = {}; }
    function saveCustomSettings() {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(customSettings));
    }

    
    
    const headerRow = document.createElement('div');
    Object.assign(headerRow.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      marginBottom: '10px',
      width: '100%'
    });
    const title = document.createElement('div');
    title.textContent = 'Custom Shortcuts';
    Object.assign(title.style, {
      font: "600 18px 'Segoe UI', sans-serif",
      letterSpacing: '0.5px',
    });
    headerRow.appendChild(title);

    const nextHotkeyWrap = document.createElement('div');
    Object.assign(nextHotkeyWrap.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });
    const nextLabel = document.createElement('span');
    nextLabel.textContent = 'Next Unrated:';
    Object.assign(nextLabel.style, {
      font: "500 13px 'Segoe UI', sans-serif",
      opacity: '0.9'
    });
    nextHotkeyWrap.appendChild(nextLabel);

  const nextHotkeyBtn = document.createElement('button');
    nextHotkeyBtn.title = 'Assign a hotkey (press to capture next input)';
    nextHotkeyBtn.style.minWidth = '10ch';
    nextHotkeyBtn.style.height = '26px';
    nextHotkeyBtn.style.background = '#2b2b2b';
    nextHotkeyBtn.style.border = '1px solid #555';
    nextHotkeyBtn.style.borderRadius = '6px';
    nextHotkeyBtn.style.color = '#ddd';
    nextHotkeyBtn.style.cursor = 'pointer';
    nextHotkeyBtn.style.fontSize = '12px';
    nextHotkeyBtn.style.padding = '0 8px';
    nextHotkeyBtn.textContent = (customSettings && customSettings.nextUnratedHotkeyLabel) || 'Hotkey';

    
  function captureNextInputHeader(onDone) {
      let finished = false;
      const cleanup = () => {
        window.removeEventListener('keydown', onKey, true);
        window.removeEventListener('pointerdown', onPointer, true);
        window.removeEventListener('wheel', onWheel, true);
      };
      const swallow = (e) => { try {
        e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
 catch (_) {} };
      const finalize = (label) => {
        if (finished) return;
        finished = true;
        cleanup();
        try {
          onDone(label);
        }
 catch (_) {}
      };
      const onKey = (e) => {
        if (e.key === 'Escape') {
          swallow(e); finalize(''); return;
        }

        if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
        const key = e.key || '';
        const code = e.code || '';
        const lower = key.toLowerCase();
        const isWASD = lower === 'w' || lower === 'a' || lower === 's' || lower === 'd' || code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD';
        const isArrow = /^Arrow(Up|Down|Left|Right)$/.test(key) || /^Arrow(Up|Down|Left|Right)$/.test(code);
        if (isWASD || isArrow) return;
        swallow(e);
        const label = code || key || 'Key';
        finalize(label);
      };
      const onPointer = (e) => {
        if (e.pointerType === 'mouse' && (e.button === 0 || e.button === 2)) return;
        swallow(e);
        let label = 'Pointer';
        if (e.pointerType === 'mouse') {
          const map = { 0: 'MouseLeft', 1: 'MouseMiddle', 2: 'MouseRight', 3: 'MouseBack', 4: 'MouseForward' };
          label = map[e.button] || 'MouseBtn' + e.button;
        } else if (e.pointerType === 'pen') {
          label = 'Pen';
        } else if (e.pointerType === 'touch') {
          label = 'Touch';
        }
        finalize(label);
      };
      const onWheel = (e) => {
        
        swallow(e);
      };
      setTimeout(() => {
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('pointerdown', onPointer, true);
        window.addEventListener('wheel', onWheel, true);
      }, 0);
      setTimeout(() => finalize('Hotkey'), 10000);
    }

    nextHotkeyBtn.addEventListener('click', () => {
      nextHotkeyBtn.textContent = 'PRESS KEY';
      captureNextInputHeader((label) => {
        if (!label) {
          nextHotkeyBtn.textContent = 'Hotkey';
          if (customSettings) delete customSettings.nextUnratedHotkeyLabel;
          saveCustomSettings();
          updateNextUnratedShortKeyUI();
          return;
        }
        
        if (hotkeyConflicts(customSettings, label, 0, true)) {
          
          nextHotkeyBtn.textContent = (customSettings && customSettings.nextUnratedHotkeyLabel) || 'Hotkey';
          return;
        }
        nextHotkeyBtn.textContent = label;
        customSettings.nextUnratedHotkeyLabel = label;
        saveCustomSettings();
        updateNextUnratedShortKeyUI();
      });
    });
    nextHotkeyWrap.appendChild(nextHotkeyBtn);
    headerRow.appendChild(nextHotkeyWrap);
  menu.appendChild(headerRow);

    
    

    for (let i = 1; i <= 8; ++i) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '12px';
      row.style.marginBottom = '6px';

      
      const num = document.createElement('span');
      num.textContent = i + '.';
      num.style.fontWeight = '600';
      num.style.width = '18px';
      row.appendChild(num);

      
      const skinLabel = document.createElement('span');
      skinLabel.textContent = 'Skin:';
      skinLabel.style.marginRight = '2px';
      row.appendChild(skinLabel);
      const skinBtns = [];
      let skinVal = (customSettings[i] && customSettings[i].skin) || 0;
      for (let s = 1; s <= 3; ++s) {
        const btn = document.createElement('button');
        btn.textContent = s;
        btn.style.marginRight = '2px';
        btn.style.width = '22px';
        btn.style.height = '22px';
        btn.style.fontSize = '12px';
        btn.style.borderRadius = '4px';
        btn.style.border = '1px solid #444';
        btn.style.background = '#232323';
        btn.style.color = '#ccc';
        btn.style.cursor = 'pointer';
        if (skinVal === s) {
          btn.style.background = '#c22';
          btn.style.color = '#fff';
        }
        btn.addEventListener('click', function() {
          skinBtns.forEach((b, idx) => {
            b.style.background = '#232323';
            b.style.color = '#ccc';
          });
          btn.style.background = '#c22';
          btn.style.color = '#fff';
          if (!customSettings[i]) customSettings[i] = {};
          customSettings[i].skin = s;
          saveCustomSettings();
          applyCustomShortcutsHijack();
        });
        skinBtns.push(btn);
        row.appendChild(btn);
      }

      
      const pcLabel = document.createElement('span');
      pcLabel.textContent = 'PC:';
      pcLabel.style.margin = '0 2px 0 8px';
      row.appendChild(pcLabel);
      const pcBtns = [];
      let pcVal = (customSettings[i] && customSettings[i].pc) || 0;
      for (let p = 1; p <= 3; ++p) {
        const btn = document.createElement('button');
        btn.textContent = p;
        btn.style.marginRight = '2px';
        btn.style.width = '22px';
        btn.style.height = '22px';
        btn.style.fontSize = '12px';
        btn.style.borderRadius = '4px';
        btn.style.border = '1px solid #444';
        btn.style.background = '#232323';
        btn.style.color = '#ccc';
        btn.style.cursor = 'pointer';
        if (pcVal === p) {
          btn.style.background = '#c22';
          btn.style.color = '#fff';
        }
        btn.addEventListener('click', function() {
          pcBtns.forEach((b, idx) => {
            b.style.background = '#232323';
            b.style.color = '#ccc';
          });
          btn.style.background = '#c22';
          btn.style.color = '#fff';
          if (!customSettings[i]) customSettings[i] = {};
          customSettings[i].pc = p;
          saveCustomSettings();
          applyCustomShortcutsHijack();
        });
        pcBtns.push(btn);
        row.appendChild(btn);
      }

      
      const select = document.createElement('select');
      const options = [
        'None',
        'Politics',
        'Anime',
        'Gaming',
        'Spicy',
        'Comics/Art',
        'Meta',
        'Other/Memes',
      ];
      options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      });
      select.style.margin = '0 8px 0 8px';
      select.style.height = '26px';
      select.style.background = '#232323';
      select.style.color = '#ccc';
      select.style.border = '1px solid #444';
      select.style.borderRadius = '4px';
      select.value = (customSettings[i] && customSettings[i].cat) || 'None';
      select.addEventListener('change', function() {
  if (!customSettings[i]) customSettings[i] = {};
  customSettings[i].cat = select.value;
  saveCustomSettings();
  applyCustomShortcutsHijack();
      });
      row.appendChild(select);

      
      const hotkeyBtn = document.createElement('button');
      hotkeyBtn.title = 'Assign a hotkey (press to capture next input)';
      hotkeyBtn.style.marginLeft = '8px';
      hotkeyBtn.style.minWidth = '10ch';
      hotkeyBtn.style.height = '26px';
      hotkeyBtn.style.background = '#2b2b2b';
      hotkeyBtn.style.border = '1px solid #555';
      hotkeyBtn.style.borderRadius = '6px';
      hotkeyBtn.style.color = '#ddd';
      hotkeyBtn.style.cursor = 'pointer';
      hotkeyBtn.style.fontSize = '12px';
      hotkeyBtn.style.padding = '0 8px';
      hotkeyBtn.textContent = (customSettings[i] && customSettings[i].hotkeyLabel) || 'Hotkey';

      function captureNextInput(onDone) {
        let finished = false;
        const cleanup = () => {
          window.removeEventListener('keydown', onKey, true);
          window.removeEventListener('pointerdown', onPointer, true);
          window.removeEventListener('wheel', onWheel, true);
        };
        const swallow = (e) => { try {
          e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        }
 catch (_) {} };
        const finalize = (label) => {
          if (finished) return;
          finished = true;
          cleanup();
          try {
            onDone(label);
          }
 catch (_) {}
        };
        const onKey = (e) => {
          
          if (e.key === 'Escape') {
            swallow(e); finalize(''); return;
          }

          
          if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
          const key = e.key || '';
          const code = e.code || '';
          const lower = key.toLowerCase();
          
          const isWASD = lower === 'w' || lower === 'a' || lower === 's' || lower === 'd' || code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD';
          const isArrow = /^Arrow(Up|Down|Left|Right)$/.test(key) || /^Arrow(Up|Down|Left|Right)$/.test(code);
          if (isWASD || isArrow) return; 
          swallow(e);
          const label = code || key || 'Key';
          finalize(label);
        };
        const onPointer = (e) => {
          
          if (e.pointerType === 'mouse' && (e.button === 0 || e.button === 2)) return;
          swallow(e);
          let label = 'Pointer';
          if (e.pointerType === 'mouse') {
            const map = { 0: 'MouseLeft', 1: 'MouseMiddle', 2: 'MouseRight', 3: 'MouseBack', 4: 'MouseForward' };
            label = map[e.button] || 'MouseBtn' + e.button;
          } else if (e.pointerType === 'pen') {
            label = 'Pen';
          } else if (e.pointerType === 'touch') {
            label = 'Touch';
          }
          finalize(label);
        };
        const onWheel = (e) => {
          
          swallow(e);
        };
        
        setTimeout(() => {
          window.addEventListener('keydown', onKey, true);
          window.addEventListener('pointerdown', onPointer, true);
          window.addEventListener('wheel', onWheel, true);
        }, 0);
        
        setTimeout(() => finalize('Hotkey'), 10000);
      }

      hotkeyBtn.addEventListener('click', () => {
        const prevLabel = hotkeyBtn.textContent;
        hotkeyBtn.textContent = 'PRESS KEY';
        captureNextInput((label) => {
          
          if (!label) {
            hotkeyBtn.textContent = 'Hotkey';
            if (customSettings[i]) {
              delete customSettings[i].hotkeyLabel;
            }
            saveCustomSettings();
            applyCustomShortcutsHijack();
            return;
          }
          
          if (hotkeyConflicts(customSettings, label, i, false)) {
            
            hotkeyBtn.textContent = prevLabel || 'Hotkey';
            return;
          }
          hotkeyBtn.textContent = label;
          if (!customSettings[i]) customSettings[i] = {};
          customSettings[i].hotkeyLabel = label;
          saveCustomSettings();
          applyCustomShortcutsHijack();
        });
      });
      row.appendChild(hotkeyBtn);

      
      const resetBtn = document.createElement('button');
  resetBtn.title = 'Reset to default';
  resetBtn.style.marginLeft = '8px';
  resetBtn.style.width = '22px';
  resetBtn.style.height = '22px';
  resetBtn.style.background = '#b23a3a'; 
  resetBtn.style.border = '1.5px solid #c22';
  resetBtn.style.borderRadius = '5px';
  resetBtn.style.display = 'flex';
  resetBtn.style.alignItems = 'center';
  resetBtn.style.justifyContent = 'center';
  resetBtn.style.cursor = 'pointer';
  const icon = document.createElement('img');
  icon.src = chrome?.runtime?.getURL ? chrome.runtime.getURL('icons/reset.png') : 'icons/reset.png';
  icon.alt = 'Reset';
  icon.style.width = '18px';
  icon.style.height = '18px';
  resetBtn.appendChild(icon);
      resetBtn.addEventListener('click', function() {
  
  if (customSettings[i]) delete customSettings[i];
  saveCustomSettings();
  applyCustomShortcutsHijack();
  
  host.remove();
  createCustomShortcutsMenu();
      });
      row.appendChild(resetBtn);

      menu.appendChild(row);
    }

    
    host.addEventListener('mousedown', (e) => {
      if (e.target === host) closeMenu();
    });

    
    setTimeout(() => {
      host.style.display = 'block';
      setTimeout(() => { menu.style.opacity = '1'; }, 10);
    }, 10);

    
    function closeMenu() {
      menu.style.opacity = '0';
      setTimeout(() => {
        try {
          host.remove();
        } catch (err) {
        }
      }, 220);
    }

    
    window.addEventListener('keydown', function escListener(e) {
      if (e.key === 'Escape') {
        closeMenu();
        window.removeEventListener('keydown', escListener);
      }
    });
  }
(() => {
  

  
  

  
  // Injects a "Customize" button next to the quick-rate controls
  function addCustomizeButton() {
    
    const desktopRateButtons = Array.from(document.querySelectorAll('.ctButton4.desktopRate'));
    let anchorBtn = desktopRateButtons.find(btn => {
      const oc = btn.getAttribute('onclick');
      if (oc && oc === "quickM('other12', this)") return true;
      if (btn.dataset && btn.dataset.sccustomQuickm) {
        return btn.dataset.sccustomQuickm === 'other12' || btn.dataset.sccustomQuickm === 'other12/n';
      }
      if (btn.id && originalButtonState[btn.id] && originalButtonState[btn.id].onclick) {
        return /quickM\(['"]other12['"],\s*this\)/.test(originalButtonState[btn.id].onclick);
      }
      return false;
    });
    if (!anchorBtn) {
      anchorBtn = desktopRateButtons[desktopRateButtons.length - 1] || null;
    }
    if (!anchorBtn) {
      return;
    }

    
    if (anchorBtn.nextSibling && anchorBtn.nextSibling.classList && anchorBtn.nextSibling.classList.contains('fj-customize-btn')) {
      return;
    }

    
    const customizeBtn = document.createElement('div');
    customizeBtn.className = 'ctButton4 desktopRate fj-customize-btn';
    customizeBtn.textContent = 'Customize';
    customizeBtn.style.marginLeft = '6px';
    customizeBtn.style.display = 'inline-block';
    customizeBtn.style.cursor = 'pointer';
    customizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      createCustomShortcutsMenu();
    });
    
    anchorBtn.parentNode.insertBefore(customizeBtn, anchorBtn.nextSibling);
  }

  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCustomizeButton);
  } else {
    addCustomizeButton();
  }
  
  // Ensures the mystery 7/8 buttons display badges like the first six
  function addShortKeyDivs() {
    
    const allDesktopBtns = Array.from(document.querySelectorAll('.ctButton4.desktopRate'));
    
    const noIdBtns = allDesktopBtns.filter(btn => !/^rate\dkey$/.test(btn.id));
    
    const targets = noIdBtns.filter(btn => !btn.querySelector('.shortKey'));
    
    if (targets[0]) {
      const div7 = document.createElement('div');
      div7.className = 'shortKey';
      div7.textContent = '7';
      targets[0].insertBefore(div7, targets[0].firstChild);
    }
    if (targets[1]) {
      const div8 = document.createElement('div');
      div8.className = 'shortKey';
      div8.textContent = '8';
      targets[1].insertBefore(div8, targets[1].firstChild);
    }
  }

  
  // Clears injected UI before rebuilding or when feature disabled
  function removeCustomMods() {
    
    document.querySelectorAll('.fj-customize-btn').forEach(btn => btn.remove());
    
    Array.from(document.querySelectorAll('.ctButton4.desktopRate')).forEach(btn => {
      const shortKeys = btn.querySelectorAll('.shortKey');
      shortKeys.forEach(sk => {
        if ((sk.textContent === '7' || sk.textContent === '8' || sk.textContent === '[7]' || sk.textContent === '[8]') && shortKeys.length === 1) {
          sk.remove();
        }
      });
    });
  }

  
  // Convenience wrapper around the two hide settings
  function isCustomShortcutsEnabled() {
    const settings = window.fjTweakerSettings || {};
    if (settings.hideShortcuts === true) return false;
    return settings.hideRateShortcuts !== false;
  }

  // Global CSS toggle to hide the entire quick-rate UI when requested
  function setShortcutUIHidden(hidden) {
    const id = 'fj-hide-shortcuts-style';
    let style = document.getElementById(id);
    if (hidden) {
      if (!style) {
        style = document.createElement('style');
        style.id = id;
        style.textContent = `
          #rateShort, #quickM { display: none !important; }
          .modF.modF1 ~ #cControlsCon { margin-top: -60px !important; }
          .replaceModCC ~ #cControlsCon { margin-top: -60px !important; }
        `;
        document.head.appendChild(style);
      }
    } else {
      if (style) style.remove();
      try {
        const rs = document.getElementById('rateShort');
        const qm = document.getElementById('quickM');
        if (rs && rs.style.display === 'none') rs.style.display = '';
        if (qm && qm.style.display === 'none') qm.style.display = '';
        
        // Restore original margin-top for HTML 2 only
        const html2 = document.getElementById('cControlsCon');
        if (html2 && html2.style.marginTop === '-60px') html2.style.marginTop = '';
      } catch (_) {}
    }
  }

  
  // Reads settings and either shows or removes the customization affordances
  function updateCustomMods() {
    removeCustomMods();
    const st = window.fjTweakerSettings || {};
    setShortcutUIHidden(st.hideShortcuts === true);
    if (isCustomShortcutsEnabled()) {
      addCustomizeButton();
      addShortKeyDivs();
    }
  }

  
  document.addEventListener('fjTweakerSettingsChanged', updateCustomMods);
  
  if (!window.fjCustomShortcutsNumpadBound) {
    try {
      // Captures numpad input before the site to honor remapped shortcuts
      const onNumpadKeyDown = (e) => {
        try {
          // Ignore typing contexts
          const t = e.target;
          const tag = t && t.tagName ? t.tagName.toLowerCase() : '';
          const isEditable = (t && (t.isContentEditable || tag === 'input' || tag === 'textarea'));
          if (isEditable) {
            return;
          }

          // Load custom settings for mapping
          let cs = {};
          try { cs = JSON.parse(localStorage.getItem('fjCustomShortcuts') || '{}'); } catch (_) { cs = {}; }

          // Build pressed labels we will match against stored labels
          const pressedCode = e.code || '';
          const pressedKey = e.key || '';

          // Settings gate for row shortcuts
          const settings = window.fjTweakerSettings || {};
          const customEnabled = (settings.hideShortcuts !== true) && (settings.hideRateShortcuts !== false);

          // 1) Direct match pass: if any row explicitly uses this key/code, trigger it and block others
          if (customEnabled) {
            const buttons = getCustomShortcutButtons();
            for (let i = 1; i <= 8; i++) {
              const eff = getEffectiveHotkeyLabelForRow(cs, i);
              if (eff && (eff === pressedCode || eff === pressedKey)) {
                const btn = buttons[i-1];
                if (!btn) break;
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                try {
                  dispatchCustomShortcutEvent(btn, i, 'hotkey-direct');
                  btn.click();
                }
 catch (_) {}
                return;
              }
            }
          }

          // 2) Next Unrated direct match (works even if custom shortcuts disabled)
          const nextLabel = (cs && cs.nextUnratedHotkeyLabel) || 'Numpad9';
          if (nextLabel && (nextLabel === pressedCode || nextLabel === pressedKey)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            try {
              if (window.admintools && typeof window.admintools.getNextUnrated === 'function') {
                window.admintools.getNextUnrated();
              } else {
                const nextBtn = document.getElementById('skinGuide');
                if (nextBtn) nextBtn.click();
              }
            } catch (_) {}
            return;
          }

          // 3) Fallback gating for Numpad1-9: block old defaults when reassigned; allow default when unchanged
          const m = /^Numpad([1-9])$/.exec(pressedCode);
          if (m) {
            const n = parseInt(m[1], 10);
            if (n >= 1 && n <= 8) {
              const effN = getEffectiveHotkeyLabelForRow(cs, n);
              if (!customEnabled) {
                // Let site defaults handle when custom shortcuts are disabled
                return;
              }
              if (effN === `Numpad${n}`) {
                // Default mapping intact: trigger ourselves and block site handlers
                const buttons = getCustomShortcutButtons();
                const btn = buttons[n-1];
                if (btn) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  try {
                    dispatchCustomShortcutEvent(btn, n, 'hotkey-default');
                    btn.click();
                  }
 catch (_) {}
                  return;
                }
              } else {
                // Reassigned: block the stale NumpadN mapping from site handlers
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return;
              }
            } else if (n === 9) {
              // Next Unrated fallback: if not using Numpad9 anymore, block it; else trigger
              if (nextLabel === 'Numpad9') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                try {
                  if (window.admintools && typeof window.admintools.getNextUnrated === 'function') {
                    window.admintools.getNextUnrated();
                  } else {
                    const nextBtn = document.getElementById('skinGuide');
                    if (nextBtn) nextBtn.click();
                  }
                } catch (_) {}
                return;
              } else {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return;
              }
            }
          }

        } catch (err) {
        }
      };
      
      // Try to add our handler as early as possible and with highest priority
      document.addEventListener('keydown', onNumpadKeyDown, true);
      window.fjCustomShortcutsNumpadBound = true;
    } catch (err) {
    }
  }

  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCustomMods);
  } else {
    updateCustomMods();
  }
})();

})();
