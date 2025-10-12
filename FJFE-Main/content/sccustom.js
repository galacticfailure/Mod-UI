  
  const FJFE_MODSO_OK = (() => {
    try {
      const link = document.querySelector('a.modLinky[href="/mod-social/"]');
      return !!link && (link.textContent || '').trim() === 'ModSo';
    } catch (_) {
      return false;
    }

  })();

  
  
  
  if (typeof window.fjCustomShortcutsDebugSuppressNext !== 'boolean') {
    
    window.fjCustomShortcutsDebugSuppressNext = false;
  }

  const originalButtonState = window.fjCustomShortcutOriginals || {};
  window.fjCustomShortcutOriginals = originalButtonState;
  
  const buttonHandlers = window.fjCustomShortcutHandlers || new WeakMap();
  window.fjCustomShortcutHandlers = buttonHandlers;

  
  function formatHotkeyDisplay(label) {
    try {
      if (!label || typeof label !== 'string') return '';
      
      const m = /^Numpad([0-9])$/.exec(label);
      if (m) return m[1];
      return label;
    } catch (_) {
      return '';
    }

  }

  
  function getEffectiveHotkeyLabelForRow(customSettings, i) {
    const row = customSettings && customSettings[i];
    const result = (row && row.hotkeyLabel) ? row.hotkeyLabel : ('Numpad' + i);
    console.debug(`[sccustom] getEffectiveHotkeyLabelForRow(${i}):`, { row, result });
    return result;
  }

  
  function hotkeyConflicts(customSettings, label, excludeRowIdx, excludeNext) {
    if (!label) return false;
    
    for (let j = 1; j <= 8; j++) {
      if (excludeRowIdx && j === excludeRowIdx) continue;
      if (getEffectiveHotkeyLabelForRow(customSettings, j) === label) return true;
    }
    if (!excludeNext) {
      const nextLabel = (customSettings && customSettings.nextUnratedHotkeyLabel) || 'Numpad9';
      if (nextLabel === label) return true;
    }
    return false;
  }

  
  function updateNextUnratedShortKeyUI() {
    try {
      let customSettings = {};
      try { customSettings = JSON.parse(localStorage.getItem('fjCustomShortcuts') || '{}'); } catch (_) {}
      const nextBtn = document.getElementById('skinGuide');
      if (!nextBtn) return;
      let shortKey = nextBtn.querySelector('.shortKey');
      if (!shortKey) {
        shortKey = document.createElement('div');
        shortKey.className = 'shortKey';
        nextBtn.insertBefore(shortKey, nextBtn.firstChild);
      }
      const label = (customSettings && customSettings.nextUnratedHotkeyLabel) || 'Numpad9';
      shortKey.textContent = formatHotkeyDisplay(label) || '9';
    } catch (_) {}
  }

  
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
    } catch (_) {}
  }

  
  function updateShortcutSuffix(el, skin, pc, noIndex) {
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
      const suffixStr = `/${s}/${p}${noIndex ? '/n' : ''}`;
      const span = document.createElement('span');
      span.className = suffixClass;
      span.textContent = suffixStr;
      el.appendChild(span);
    } catch (_) {}
  }

  function applyCustomShortcutsHijack() {
    
    try {
      const st = window.fjTweakerSettings || {};
      if (st.hideShortcuts === true || st.hideRateShortcuts === false) {
        console.debug('[sccustom] Shortcuts disabled; restoring originals and skipping hijack');
        restoreOriginalButtons();
        
        
      }
    } catch (_) {}
    console.debug('[sccustom] applyCustomShortcutsHijack called');
    const buttons = getCustomShortcutButtons();
    console.debug('[sccustom] Buttons mapped:', buttons);
    
    let customSettings = {};
    try {
      customSettings = JSON.parse(localStorage.getItem('fjCustomShortcuts') || '{}');
    } catch (e) { customSettings = {}; }
    console.debug('[sccustom] Loaded customSettings:', customSettings);

    
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
            console.debug(`[sccustom] Disabled accessKey for button ${i}: ${window.fjOriginalAccessKeys[btn.id]}`);
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

    
    const noIndexBtn = document.getElementById('noIndexEasy') || document.getElementById('mNIX');
    
    const catBtns = {};
    document.querySelectorAll('#catControls .ctButton4').forEach(btn => {
      const id = btn.getAttribute('data-id');
      if (id) catBtns[id] = btn;
    });

    
    buttons.forEach((btn, idx) => {
      
      try {
        const st = window.fjTweakerSettings || {};
        if (st.hideShortcuts === true || st.hideRateShortcuts === false) return;
      } catch (_) {}
      if (!btn) {
        console.debug(`[sccustom] Button ${idx+1} not found in DOM`);
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

      console.debug(`[sccustom] Button ${idx+1} hotkey analysis:`, {
        custom: customHotkey,
        default: defaultHotkey,
        hasCustom: hasCustomHotkey
      });
      
      let el = btn;
      try {
        const fresh = btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh, btn);
        el = fresh;
      } catch (cloneErr) {
        el = btn; 
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
        console.debug(`[sccustom] Button ${idx+1} has custom hotkey, removing ALL onclick handlers`);
        
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
      const noIndexForLabel = !!settings.noIndex;
      updateShortcutSuffix(el, skinForLabel, pcForLabel, noIndexForLabel);

      
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
          if (settings.noIndex && !/\/n$/.test(arg)) arg += '/n';
          if (!settings.noIndex && /\/n$/.test(arg)) arg = arg.replace(/\/n$/, '');
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
        try {
          const settingsForBtn = customSettings[idx+1] || {};
          console.log(`[sccustom] Button ${idx+1} clicked. Settings:`, settingsForBtn);
          

          
          const textMatch = (el.textContent || '').match(/\/(\d+)\/(\d+)/);
          const desiredSkin = settingsForBtn.skin || (textMatch ? parseInt(textMatch[1], 10) : null);
          const desiredPc = settingsForBtn.pc || (textMatch ? parseInt(textMatch[2], 10) : null);
          const selCatImmediate = (settingsForBtn.cat && settingsForBtn.cat !== 'None') ? settingsForBtn.cat : null;

          
          const suppress = window.fjCustomShortcutsDebugSuppressNext === true;
          if (!suppress) {
            
            try {
              if (selCatImmediate && catMap[selCatImmediate] && catBtns[catMap[selCatImmediate].id]) {
                console.log(`[sccustom] Clicking category control: ${selCatImmediate}`);
                catBtns[catMap[selCatImmediate].id].click();
              }
            } catch (_) {}

            
            setTimeout(() => {
              if (desiredSkin && skinBtnIds[desiredSkin-1]) {
                const skinBtn = document.getElementById(skinBtnIds[desiredSkin-1]);
                if (skinBtn) {
                  console.log(`[sccustom] Clicking skin button: ${skinBtnIds[desiredSkin-1]}`);
                  skinBtn.click();
                } else {
                  console.log(`[sccustom] Skin button not found: ${skinBtnIds[desiredSkin-1]}`);
                }
              } else {
                console.log(`[sccustom] No skin action for button ${idx+1}`);
              }
            }, 40);

            setTimeout(() => {
              if (desiredPc && pcBtnIds[desiredPc-1]) {
                const pcBtn = document.getElementById(pcBtnIds[desiredPc-1]);
                if (pcBtn) {
                  console.log(`[sccustom] Clicking pc button: ${pcBtnIds[desiredPc-1]}`);
                  pcBtn.click();
                } else {
                  console.log(`[sccustom] PC button not found: ${pcBtnIds[desiredPc-1]}`);
                }
              } else {
                console.log(`[sccustom] No pc action for button ${idx+1}`);
              }
            }, 80);

            
            if (settingsForBtn.noIndex && noIndexBtn) {
              const readNIState = () => {
                try {
                  const oc = noIndexBtn.getAttribute('onclick') || '';
                  let currentNI = null;
                  if (/,\s*0\s*,/.test(oc)) currentNI = true; 
                  else if (/,\s*1\s*,/.test(oc)) currentNI = false; 
                  if (currentNI === null) {
                    const txt = (noIndexBtn.textContent || '').toLowerCase();
                    if (txt.includes('manually no indexed') || txt.includes('auto: no indexed')) currentNI = true;
                    else if (txt.includes('no index')) currentNI = false;
                  }
                  return currentNI;
                } catch (_) {
                  return null;
                }

              };
              const ensureNoIndexOn = (attempt) => {
                const current = readNIState();
                if (current === true) {
                  console.log('[sccustom] NoIndex is ON before quickM');
                  return;
                }
                if (attempt <= 0) {
                  console.warn('[sccustom] NoIndex did not turn ON before quickM');
                  return;
                }
                try {
                  console.log(`[sccustom] Toggling NoIndex ON (attempt ${attempt})`);
                  noIndexBtn.click();
                } catch (_) {}
                setTimeout(() => ensureNoIndexOn(attempt - 1), 140);
              };
              
              setTimeout(() => ensureNoIndexOn(3), 140);
            }
          } else {
            console.log('[sccustom] Debug suppression active: Skipping skin/pc clicks.');
          }

          
          
          const scheduleMs = settingsForBtn.noIndex ? 900 : 200;
          const orig = (el.id && originalButtonState[el.id]) ? originalButtonState[el.id] : null;
          setTimeout(() => {
            let quickMArg = null;
            
            const selCat = (settingsForBtn.cat && settingsForBtn.cat !== 'None') ? settingsForBtn.cat : null;
            let debugInfo = {
              idx,
              btnId: el.id,
              btnClass: el.className,
              btnHTML: el.outerHTML,
              origOnclick: orig ? orig.onclick : null,
              currentOnclick: el.getAttribute('onclick'),
              settings: settingsForBtn,
              selCat,
              catMap: selCat ? (catMap[selCat] || null) : null,
              skin: settingsForBtn.skin || null,
              pc: settingsForBtn.pc || null,
              noIndex: settingsForBtn.noIndex,
              dataQuickM: el.dataset ? el.dataset.sccustomQuickm : undefined,
              scheduleMs
            };
            
            if (selCat && catMap[selCat]) {
              quickMArg = catMap[selCat].long;
              debugInfo.quickMArgFromCat = quickMArg;
            }
            
            if (!quickMArg && el.dataset && el.dataset.sccustomQuickm) {
              quickMArg = el.dataset.sccustomQuickm;
              debugInfo.quickMArgFromDataAttr = quickMArg;
            }
            if (!quickMArg && orig && orig.onclick) {
              const m = orig.onclick.match(/quickM\(['"]([^'\"]+)['"]/);
              quickMArg = m ? m[1] : null;
              debugInfo.quickMArgFromOrig = quickMArg;
            }
            
            let useNoIndex = (settingsForBtn.noIndex === true);
            debugInfo.useNoIndex = useNoIndex;
            if (quickMArg) {
              debugInfo.quickMArgPreNoIndex = quickMArg;
              if (useNoIndex && !/\/n$/.test(quickMArg)) quickMArg += '/n';
              if (!useNoIndex && /\/n$/.test(quickMArg)) quickMArg = quickMArg.replace(/\/n$/, '');
              debugInfo.quickMArgFinal = quickMArg;
              
              if (window.fjCustomShortcutsDebugSuppressNext === true) {
                debugInfo.suppressed = true;
                try {
                  if (selCat && catMap[selCat] && catBtns[catMap[selCat].id]) {
                    console.log(`[sccustom][suppressed] Clicking category control for: ${selCat}`);
                    catBtns[catMap[selCat].id].click();
                    debugInfo.categoryAppliedToUI = selCat;
                  }
                  
                  if (desiredSkin && skinBtnIds[desiredSkin-1]) {
                    const skinBtn = document.getElementById(skinBtnIds[desiredSkin-1]);
                    if (skinBtn) {
                      console.log(`[sccustom][suppressed] Clicking skin button: ${skinBtnIds[desiredSkin-1]}`);
                      skinBtn.click();
                    } else {
                      console.log(`[sccustom][suppressed] Skin button not found: ${skinBtnIds[desiredSkin-1]}`);
                    }
                  }
                  if (desiredPc && pcBtnIds[desiredPc-1]) {
                    const pcBtn = document.getElementById(pcBtnIds[desiredPc-1]);
                    if (pcBtn) {
                      console.log(`[sccustom][suppressed] Clicking pc button: ${pcBtnIds[desiredPc-1]}`);
                      pcBtn.click();
                    } else {
                      console.log(`[sccustom][suppressed] PC button not found: ${pcBtnIds[desiredPc-1]}`);
                    }
                  }
                  
                  try {
                    if (noIndexBtn) {
                      const desiredNI = !!settingsForBtn.noIndex;
                      const oc = noIndexBtn.getAttribute('onclick') || '';
                      
                      let currentNI = null;
                      if (/\,\s*0\s*,/.test(oc)) currentNI = true; 
                      else if (/\,\s*1\s*,/.test(oc)) currentNI = false; 
                      
                      if (currentNI === null) {
                        const txt = (noIndexBtn.textContent || '').toLowerCase();
                        if (txt.includes('manually no indexed')) currentNI = true;
                        else if (txt.includes('no index')) currentNI = false;
                      }
                      if (currentNI !== null && currentNI !== desiredNI) {
                        console.log(`[sccustom][suppressed] Toggling NoIndex to ${desiredNI ? 'ON' : 'OFF'}`);
                        noIndexBtn.click();
                        debugInfo.noIndexAppliedToUI = desiredNI;
                      } else {
                        debugInfo.noIndexAlreadyMatching = desiredNI;
                      }
                    }
                  } catch (niErr) {
                    debugInfo.noIndexUIError = niErr;
                  }
                  
                  updateShortcutSuffix(el, desiredSkin || skinForLabel, desiredPc || pcForLabel, !!settingsForBtn.noIndex);
                } catch (catErr) {
                  debugInfo.categoryUIError = catErr;
                }
                console.log('[sccustom][pre-click][suppressed] Debug info:', debugInfo);
                setTimeout(() => {
                  console.debug('[sccustom][post-click][suppressed] Debug info:', debugInfo);
                }, 50);
                return; 
              }
              
              const newOnclick = `quickM('${quickMArg}', this)`;
              const prevOnclick = el.getAttribute('onclick');
              debugInfo.prevOnclick = prevOnclick;
              debugInfo.newOnclick = newOnclick;
              try {
                el.setAttribute('onclick', newOnclick);
                debugInfo.onclickSet = true;
              } catch (err) {
                debugInfo.onclickSet = false;
                debugInfo.onclickSetError = err;
              }
              
              try {
                el.removeEventListener('click', handleClick, true);
                debugInfo.hijackRemoved = true;
              } catch (err) {
                debugInfo.hijackRemoved = false;
                debugInfo.hijackRemoveError = err;
              }
              
              try {
                el.click();
                debugInfo.nativeClick = true;
              } catch (err) {
                debugInfo.nativeClick = false;
                debugInfo.nativeClickError = err;
              }
              
              setTimeout(() => {
                try {
                  el.removeAttribute('onclick');
                  debugInfo.onclickRemoved = true;
                } catch (err) {
                  debugInfo.onclickRemoved = false;
                  debugInfo.onclickRemoveError = err;
                }
                
                try {
                  el.addEventListener('click', handleClick, true);
                  buttonHandlers.set(el, handleClick);
                  debugInfo.hijackRestored = true;
                } catch (err) {
                  debugInfo.hijackRestored = false;
                  debugInfo.hijackRestoreError = err;
                }
                console.debug('[sccustom][post-click] Debug info:', debugInfo);
              }, 150);
              console.log('[sccustom][pre-click] Debug info:', debugInfo);
            } else {
              debugInfo.noQuickMArg = true;
              console.log('[sccustom][no-quickMArg] Debug info:', debugInfo);
            }
          }, scheduleMs);
        } catch (err) {
          console.error('[sccustom] Click handler error:', err);
        }
      };

      
      el.addEventListener('click', handleClick, true);
      buttonHandlers.set(el, handleClick);
      console.debug(`[sccustom] Button ${idx+1} hijacked and updated:`, el.outerHTML);
    });
  }

  
  if (FJFE_MODSO_OK) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyCustomShortcutsHijack);
    } else {
      applyCustomShortcutsHijack();
    }
    document.addEventListener('fjTweakerSettingsChanged', applyCustomShortcutsHijack);
  }
  
  if (FJFE_MODSO_OK) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateNextUnratedShortKeyUI);
    } else {
      updateNextUnratedShortKeyUI();
    }
    document.addEventListener('fjTweakerSettingsChanged', updateNextUnratedShortKeyUI);
  }
  
  function getCustomShortcutButtons() {
  let buttons = [];
  
  const desktopBtns = Array.from(document.querySelectorAll('.ctButton4.desktopRate'));
  const mobileBtns = Array.from(document.querySelectorAll('.ctButton4.mobQuickRate'));
  if (desktopBtns.length >= 6) {
    console.debug('[sccustom] getCustomShortcutButtons: Using desktopRate buttons');
    
    for (let i = 1; i <= 6; ++i) {
      const btn = document.querySelector('.ctButton4.desktopRate#rate'+i+'key');
      if (!btn) console.debug(`[sccustom] getCustomShortcutButtons: desktop rate${i}key not found`);
      buttons.push(btn || null);
    }
    
    const noIdBtns = desktopBtns.filter(btn => !/^rate\dkey$/.test(btn.id));
    const btn7 = noIdBtns.find(btn => btn.querySelector('.shortKey') && btn.querySelector('.shortKey').textContent.trim() === '7');
    const btn8 = noIdBtns.find(btn => btn.querySelector('.shortKey') && btn.querySelector('.shortKey').textContent.trim() === '8');
    if (!btn7) console.debug('[sccustom] getCustomShortcutButtons: desktop btn7 not found');
    if (!btn8) console.debug('[sccustom] getCustomShortcutButtons: desktop btn8 not found');
    buttons.push(btn7 || null);
    buttons.push(btn8 || null);
  } else if (mobileBtns.length >= 6) {
    console.debug('[sccustom] getCustomShortcutButtons: Using mobQuickRate buttons');
    for (let i = 1; i <= 6; ++i) {
      const btn = document.querySelector('.ctButton4.mobQuickRate#rate'+i+'key');
      if (!btn) console.debug(`[sccustom] getCustomShortcutButtons: mobile rate${i}key not found`);
      buttons.push(btn || null);
    }
    
    buttons.push(null);
    buttons.push(null);
  } else {
    console.debug('[sccustom] getCustomShortcutButtons: No quickM buttons found');
    for (let i = 0; i < 8; ++i) buttons.push(null);
  }
  return buttons;
  }
  
  function createCustomShortcutsMenu() {
    console.debug('[sccustom] createCustomShortcutsMenu called');
    if (document.getElementById('fj-sccustom-menu-host')) {
      console.debug('[sccustom] Menu already open (host exists)');
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
    console.debug('[sccustom] Menu host and container appended');

    
    const CUSTOM_KEY = 'fjCustomShortcuts';
    let customSettings = {};
    try {
      customSettings = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '{}');
    } catch (e) { customSettings = {}; }
    function saveCustomSettings() {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(customSettings));
      console.debug('[sccustom] saveCustomSettings:', customSettings);
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
  console.debug('[sccustom] Header row with Next Unrated hotkey added');

    
    

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
          console.debug(`[sccustom] Skin changed for row ${i} to ${s}`);
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
          console.debug(`[sccustom] PC changed for row ${i} to ${p}`);
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
  console.debug(`[sccustom] Category changed for row ${i} to ${select.value}`);
      });
      row.appendChild(select);

      
      const noIndexLabel = document.createElement('label');
      noIndexLabel.style.display = 'flex';
      noIndexLabel.style.alignItems = 'center';
      noIndexLabel.style.gap = '3px';
      noIndexLabel.style.marginLeft = '8px';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = (customSettings[i] && customSettings[i].noIndex) || false;
      cb.addEventListener('change', function() {
  if (!customSettings[i]) customSettings[i] = {};
  customSettings[i].noIndex = cb.checked;
  saveCustomSettings();
  applyCustomShortcutsHijack();
  console.debug(`[sccustom] NoIndex changed for row ${i} to ${cb.checked}`);
      });
      noIndexLabel.appendChild(cb);
      const cbText = document.createElement('span');
      cbText.textContent = 'No Index';
      noIndexLabel.appendChild(cbText);
      row.appendChild(noIndexLabel);

      
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
  console.debug(`[sccustom] Reset row ${i}`);
  
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
      console.debug('[sccustom] Menu display=block');
      setTimeout(() => { menu.style.opacity = '1'; console.debug('[sccustom] Menu opacity=1'); }, 10);
    }, 10);

    
    function closeMenu() {
      menu.style.opacity = '0';
      setTimeout(() => { host.remove(); }, 220);
    }

    
    window.addEventListener('keydown', function escListener(e) {
      if (e.key === 'Escape') {
        closeMenu();
        window.removeEventListener('keydown', escListener);
      }
    });
  }
(() => {
  

  
  

  
  function addCustomizeButton() {
    
    const other12Btn = Array.from(document.querySelectorAll('.ctButton4.desktopRate'))
      .find(btn => {
        const oc = btn.getAttribute('onclick');
        if (oc && oc === "quickM('other12', this)") return true;
        if (btn.id && originalButtonState[btn.id] && originalButtonState[btn.id].onclick) {
          return /quickM\(['"]other12['"],\s*this\)/.test(originalButtonState[btn.id].onclick);
        }
        return false;
      });
    if (!other12Btn) return;

    
    if (other12Btn.nextSibling && other12Btn.nextSibling.classList && other12Btn.nextSibling.classList.contains('fj-customize-btn')) return;

    
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
    
    other12Btn.parentNode.insertBefore(customizeBtn, other12Btn.nextSibling);
  }

  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCustomizeButton);
  } else {
    addCustomizeButton();
  }
  
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

  
  function isCustomShortcutsEnabled() {
    const settings = window.fjTweakerSettings || {};
    if (settings.hideShortcuts === true) return false;
    return settings.hideRateShortcuts !== false;
  }

  function setShortcutUIHidden(hidden) {
    const id = 'fj-hide-shortcuts-style';
    let style = document.getElementById(id);
    if (hidden) {
      if (!style) {
        style = document.createElement('style');
        style.id = id;
        style.textContent = `#rateShort, #quickM { display: none !important; }`;
        document.head.appendChild(style);
      }
    } else {
      if (style) style.remove();
      try {
        const rs = document.getElementById('rateShort');
        const qm = document.getElementById('quickM');
        if (rs && rs.style.display === 'none') rs.style.display = '';
        if (qm && qm.style.display === 'none') qm.style.display = '';
      } catch (_) {}
    }
  }

  
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
      const onNumpadKeyDown = (e) => {
        console.debug('[sccustom-hotkey] Handler called with event:', e);
        try {
          // Ignore typing contexts
          const t = e.target;
          const tag = t && t.tagName ? t.tagName.toLowerCase() : '';
          const isEditable = (t && (t.isContentEditable || tag === 'input' || tag === 'textarea'));
          if (isEditable) {
            console.debug('[sccustom-hotkey] Skipping - in editable element');
            return;
          }

          // Load custom settings for mapping
          let cs = {};
          try { cs = JSON.parse(localStorage.getItem('fjCustomShortcuts') || '{}'); } catch (_) { cs = {}; }

          // Build pressed labels we will match against stored labels
          const pressedCode = e.code || '';
          const pressedKey = e.key || '';

          console.debug('[sccustom-hotkey] Key pressed:', { code: pressedCode, key: pressedKey, customSettings: cs });

          // Settings gate for row shortcuts
          const settings = window.fjTweakerSettings || {};
          const customEnabled = (settings.hideShortcuts !== true) && (settings.hideRateShortcuts !== false);

          // 1) Direct match pass: if any row explicitly uses this key/code, trigger it and block others
          if (customEnabled) {
            const buttons = getCustomShortcutButtons();
            for (let i = 1; i <= 8; i++) {
              const eff = getEffectiveHotkeyLabelForRow(cs, i);
              console.debug(`[sccustom-hotkey] Row ${i} effective hotkey:`, eff);
              if (eff && (eff === pressedCode || eff === pressedKey)) {
                const btn = buttons[i-1];
                if (!btn) break;
                console.log(`[sccustom-hotkey] MATCHED row ${i}, clicking button:`, btn);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                try {
                  btn.click();
                }
 catch (_) {}
                return;
              }
            }
          }

          // 2) Next Unrated direct match (works even if custom shortcuts disabled)
          const nextLabel = (cs && cs.nextUnratedHotkeyLabel) || 'Numpad9';
          console.debug('[sccustom-hotkey] Next Unrated effective hotkey:', nextLabel);
          if (nextLabel && (nextLabel === pressedCode || nextLabel === pressedKey)) {
            console.log('[sccustom-hotkey] MATCHED Next Unrated, clicking button');
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
                  console.log(`[sccustom-hotkey] Default Numpad${n} active for row ${n}, clicking button`);
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  try {
                    btn.click();
                  }
 catch (_) {}
                  return;
                }
              } else {
                // Reassigned: block the stale NumpadN mapping from site handlers
                console.log(`[sccustom-hotkey] Blocking stale Numpad${n} because row ${n} reassigned to`, effN);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return;
              }
            } else if (n === 9) {
              // Next Unrated fallback: if not using Numpad9 anymore, block it; else trigger
              if (nextLabel === 'Numpad9') {
                console.log('[sccustom-hotkey] Fallback Next Unrated Numpad9 active, clicking');
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
                console.log('[sccustom-hotkey] Blocking stale Numpad9 because Next Unrated reassigned to', nextLabel);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return;
              }
            }
          }

          console.debug('[sccustom-hotkey] No match found for key');
        } catch (_) {}
      };
      
      // Try to add our handler as early as possible and with highest priority
      console.debug('[sccustom-hotkey] Adding keydown handler');
      document.addEventListener('keydown', onNumpadKeyDown, true);
      window.fjCustomShortcutsNumpadBound = true;
    } catch (_) {}
  }

  
  if (FJFE_MODSO_OK) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateCustomMods);
    } else {
      updateCustomMods();
    }
  }
})();
