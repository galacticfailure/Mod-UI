(function() {
  const state = {
    container: null,
    toggleEl: null,
  };

  const DEBUG_FLAG_KEY = 'fjfeDebugEnabled';

  function getMoney() {
    try {
      const storage = window.fjfeNumbersStorage;
      if (storage) {
        const st = storage.readRaw();
        return storage.toDisplayNumber(st);
      }
      const raw = localStorage.getItem('fjTweakerClickerCount');
      const p = parseFloat(raw);
      return Number.isFinite(p) ? p : 0;
    } catch (_) {
      return 0;
    }
  }

  function setMoney(v) {
    try {
      const tools = window.fjfeClickerNumbers;
      const storage = window.fjfeNumbersStorage;
      const num = Number(v);
      if (!Number.isFinite(num) || (tools && tools.isInfinite && tools.isInfinite(num))) {
        if (storage) storage.writeRaw({ infinite: true, scaled: 0n });
        else localStorage.setItem('fjTweakerClickerCount', 'Infinity');
        return;
      }
      const bounded = Math.max(0, num || 0);
      if (storage) {
        const scaled = BigInt(Math.floor(bounded * 10));
        storage.writeRaw({ infinite: false, scaled });
      } else {
        localStorage.setItem('fjTweakerClickerCount', String(bounded));
      }
    } catch (_) {}
  }

  function clearClickerRelatedKeys() {
    try {
      
      const prefixes = [
        'fjTweakerUpgradeNum_',       
        'fjTweakerStoreMultiplier_',  
        'fjTweakerStoreUpgrade_',     
        'fjfeStats_',                 
      ];
      const directKeys = [
        'fjTweakerClickerCount',      
        'fjTweakerClickerClicks',     
        'fjfePassiveLeader',          
        'fjTweakerUpgradeNum',        
        'fjTweakerClickerPanelPosition', 
      ];
      
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (prefixes.some(p => key.startsWith(p))) toRemove.push(key);
      }
      toRemove.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
      
      directKeys.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
    } catch (_) {}
  }

  function resetMoney() {
    
    clearClickerRelatedKeys();
    const storage = window.fjfeNumbersStorage;
    if (storage) {
      try { storage.writeRaw({ infinite: false, scaled: 0n }); } catch (_) {}
    } else {
      setMoney(0);
    }
    refreshDisplays();
  }

  function multiplyMoney() {
    try {
      const storage = window.fjfeNumbersStorage;
      const tools = window.fjfeClickerNumbers;
      if (storage) {
        const st = storage.readRaw();
        
        let deltaScaled = 0n;
        if (st && st.infinite) {
          
          storage.writeRaw({ infinite: true, scaled: 0n });
        } else {
          const curScaled = st ? st.scaled : 0n;
          const nextScaled = curScaled * 10n;
          deltaScaled = (nextScaled > curScaled) ? (nextScaled - curScaled) : 0n;
          storage.writeRaw({ infinite: false, scaled: nextScaled });
        }
        
        try {
          if (deltaScaled > 0n && window.fjfeStats) {
            if (typeof window.fjfeStats.addPassiveScaledBig === 'function') {
              window.fjfeStats.addPassiveScaledBig(deltaScaled);
            } else if (typeof window.fjfeStats.addPassive === 'function') {
              const delta = Number(deltaScaled) / 10;
              if (Number.isFinite(delta) && delta > 0) window.fjfeStats.addPassive(delta);
            }
          }
        } catch(_) {}
      } else {
        const current = getMoney();
        const num = Number(current);
        if (!Number.isFinite(num) || (tools && tools.isInfinite && tools.isInfinite(num))) {
          localStorage.setItem('fjTweakerClickerCount', 'Infinity');
        } else {
          const next = num * 10;
          const delta = Math.max(0, next - num);
          setMoney(next);
          try {
            if (delta > 0 && window.fjfeStats) {
              if (typeof window.fjfeStats.addPassive === 'function') window.fjfeStats.addPassive(delta);
            }
          } catch(_) {}
        }
      }
    } catch (_) {}
    refreshDisplays();
  }

  function refreshDisplays() {
    
    if (window.fjfeRcMain && typeof window.fjfeRcMain.refresh === 'function') {
      window.fjfeRcMain.refresh();
    }
    
    if (window.fjfeRcProd && typeof window.fjfeRcProd.refresh === 'function') {
      window.fjfeRcProd.refresh();
    }
    
    if (window.fjfeRcStore && typeof window.fjfeRcStore.refresh === 'function') {
      window.fjfeRcStore.refresh();
    }
    refreshRawOnly();
  }

  function refreshRawOnly() {
    
    try {
      const storage = window.fjfeNumbersStorage;
      const st = storage ? storage.readRaw() : { infinite:false, scaled:0n };
      let txt = '0';
      if (st && st.infinite) txt = 'Infinity';
      else txt = (Number(st.scaled) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });
      const el = document.getElementById('fjfe-debug-raw');
      if (el) el.textContent = `Raw: ${txt}`;
    } catch (_) {}
  }

  function createButton(color, text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      width: '80px',
      height: '40px',
      border: '2px solid ' + color,
      borderRadius: '4px',
      background: color,
      color: '#fff',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      transition: 'transform 0.1s, filter 0.1s',
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.filter = 'brightness(1.2)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.filter = 'brightness(1)';
    });

    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.95)';
    });

    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', onClick);

    return btn;
  }

  function buildContainer() {
    const container = document.createElement('div');
    container.setAttribute('data-role', 'fjfe-debug-buttons');
    Object.assign(container.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: '2147483647',
      pointerEvents: 'auto',
    });

    
    const greenBtn = createButton('#388e3c', 'x10', multiplyMoney);
    container.appendChild(greenBtn);

    const raw = document.createElement('div');
    raw.id = 'fjfe-debug-raw';
    Object.assign(raw.style, {
      color: '#ddd',
      fontFamily: 'Consolas, monospace',
      fontSize: '12px',
      textAlign: 'right',
    });
    raw.textContent = 'Raw: 0';
    container.appendChild(raw);

    document.body.appendChild(container);
    state.container = container;
    refreshDisplays();
  }

  function ensureToggleHotzone() {
    if (state.toggleEl) return;
    const hot = document.createElement('div');
    hot.setAttribute('data-role', 'fjfe-debug-toggle-hotzone');
    Object.assign(hot.style, {
      position: 'absolute',
      left: '8px',
      width: '28px',
      height: '28px',
      opacity: '0', 
      zIndex: '2147483646',
      cursor: 'pointer',
      pointerEvents: 'auto',
    });
    
    try {
      const top = (window.scrollY || window.pageYOffset || 0) + (window.innerHeight || 0) - 36;
      hot.style.top = Math.max(0, top) + 'px';
    } catch(_) { hot.style.top = '2000px'; }
    hot.title = '';
    hot.addEventListener('click', () => {
      try {
        const enabled = localStorage.getItem(DEBUG_FLAG_KEY) === '1';
        const next = !enabled;
        localStorage.setItem(DEBUG_FLAG_KEY, next ? '1' : '0');
        if (next) {
          if (!state.container) buildContainer();
        } else {
          cleanup();
        }
      } catch (_) {}
    });
    document.body.appendChild(hot);
    state.toggleEl = hot;
  }

  function init() {
    ensureToggleHotzone();
    
    try {
      const cur = localStorage.getItem(DEBUG_FLAG_KEY);
      if (cur !== '0' && cur !== '1') localStorage.setItem(DEBUG_FLAG_KEY, '0');
    } catch(_) {}
    const enabled = localStorage.getItem(DEBUG_FLAG_KEY) === '1';
    if (enabled) buildContainer();
  }

  function cleanup() {
    if (state.container && state.container.parentNode) {
      state.container.parentNode.removeChild(state.container);
    }
    state.container = null;
  }

  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.fjfeRcDebug = {
    init,
    cleanup,
    refreshRaw: refreshRawOnly,
    resetMoney,
  };
})();
