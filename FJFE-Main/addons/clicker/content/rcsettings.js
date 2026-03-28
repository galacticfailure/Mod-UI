(function(){
  const state = {
    anchorEl: null,
    openMenu: null,
    allMenus: [],
  };
  const SCROLLBAR_STYLE_ID = 'fjfe-clicker-scrollbar-style';

  function ensureClickerScrollbarStyles(){
    try {
      if (document.getElementById(SCROLLBAR_STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = SCROLLBAR_STYLE_ID;
      style.textContent = `
        .fjfe-clicker-scroll {
          scrollbar-width: thin;
          scrollbar-color: #6a6a6a transparent;
        }
        .fjfe-clicker-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .fjfe-clicker-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .fjfe-clicker-scroll::-webkit-scrollbar-thumb {
          background: #6a6a6a;
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `;
      document.head && document.head.appendChild(style);
    } catch(_) {}
  }

  function closeMenu(){
    const hadAny = !!(state.allMenus && state.allMenus.length);
    state.allMenus.forEach(menu => {
      try {
        if(!menu._closing){
          menu._closing=true; menu.style.transition='none'; void menu.offsetWidth;
          requestAnimationFrame(()=>{
            menu.style.transition='transform 0.22s cubic-bezier(.5,1.7,.5,1), opacity 0.18s cubic-bezier(.5,1.7,.5,1)';
            menu.style.transform='translateY(-100%)'; menu.style.opacity='0'; menu.style.zIndex=2147483642;
            setTimeout(()=>{ if(menu.parentNode) menu.parentNode.removeChild(menu); },220);
          });
        } else {
          if(menu.parentNode) menu.parentNode.removeChild(menu);
        }
      } catch(_) {}
    });
    state.allMenus = [];
    state.openMenu = null;
    try {
      const now = Date.now();
      const until = window.__fjfe_suppressCloseUntil || 0;
      if (hadAny && !(now < until) && window.fjfeAudio) window.fjfeAudio.play('menu_close');
    } catch(_) {}
  }

  function updatePosition() {
    const { anchorEl, allMenus } = state;
    if (!anchorEl || !allMenus.length) return;
    const rect = anchorEl.getBoundingClientRect();
    const vx = (window.scrollX || window.pageXOffset || 0);
    const vy = (window.scrollY || window.pageYOffset || 0);
    allMenus.forEach(menu => {
      menu.style.left = (rect.left + vx) + 'px';
      menu.style.top = (rect.bottom + vy) + 'px';
      menu.style.width = (rect.right - rect.left - 2) + 'px';
      menu.style.minWidth = (rect.right - rect.left - 2) + 'px';
    });
  }

  function buildIconButton(imgPath, label, opts = {}){
    const btn = document.createElement('div');
    Object.assign(btn.style, {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: '60%',
      height: '24px',
      gap: '6px',
      padding: '4px 6px',
      cursor: 'pointer',
      userSelect: 'none',
      color: '#fff',
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '4px',
    });

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL ? chrome.runtime.getURL(imgPath) : imgPath;
    img.onerror = () => { img.src = chrome.runtime.getURL ? chrome.runtime.getURL(imgPath) : imgPath; };
    Object.assign(img.style, { width:'18px', height:'18px', objectFit:'contain', flex:'0 0 auto' });
    btn.appendChild(img);

    const textCol = document.createElement('div');
    Object.assign(textCol.style, { display:'flex', flexDirection:'column', lineHeight:'1.1' });
    const title = document.createElement('div');
    title.textContent = label;
    Object.assign(title.style, { fontWeight:'800', fontSize:'12px', letterSpacing:'0.02em' });
    textCol.appendChild(title);

    btn._titleEl = title;
    btn.appendChild(textCol);

    if (typeof opts.onClick === 'function') btn.addEventListener('click', opts.onClick);

    return btn;
  }

  function actuallyOpenMenu(){
    ensureClickerScrollbarStyles();
    const anchorEl = state.anchorEl; if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const vx = (window.scrollX || window.pageXOffset || 0);
    const vy = (window.scrollY || window.pageYOffset || 0);
    const menu = document.createElement('div');
    Object.assign(menu.style, {
      position: 'absolute', left: (rect.left + vx) + 'px', top: (rect.bottom + vy) + 'px',
      width: (rect.right - rect.left - 2) + 'px', minWidth: (rect.right - rect.left - 2) + 'px',
      height: '246px', background: '#181818', border: '1.5px solid #333', borderRadius: '0 0 10px 10px',
      boxSizing: 'border-box', boxShadow: '0 8px 24px #0007', zIndex: 2147483642, display: 'flex', flexDirection:'column',
      alignItems:'stretch', justifyContent: 'flex-start', padding: '0', color:'#fff', pointerEvents:'auto', overflow:'hidden',
      transform: 'translateY(-12px)', opacity: 0, transition: 'transform 0.22s ease, opacity 0.18s ease',
    });

  const list = document.createElement('div');
  list.classList.add('fjfe-clicker-scroll');
  Object.assign(list.style, { display:'flex', flexDirection:'column', overflowY:'auto', gap:'6px', width:'100%', height:'100%', padding:'8px', alignItems:'flex-start' });

  
  
  let cancelSlotSpin = null;
  let cancelSlotResultTimer = null;
  (function addSlotMachine(){
    const SLOT_HEIGHT = 60;
    const SLOT_WIDTH = 32;
    const ITEM_HEIGHT = 32;
    const OFFSET_Y = Math.round((SLOT_HEIGHT - ITEM_HEIGHT) / 2 - ITEM_HEIGHT);
    const SPIN_INTERVAL_MS = 110;
    const SPIN_DURATION_MS = 3000;
    const STOP_DELAY_MS = 500;
    const FREE_SPIN_MS_DEFAULT = 5 * 60 * 1000;
    const FREE_SPIN_MS_UPGRADED = 3 * 60 * 1000;
    const FREE_SPIN_KEY = 'fjfeSlotNextFreeSpinAt';
    const FREE_SPIN_BANK_KEY = 'fjfeSlotFreeSpinBank';
    const RESULT_TEXT_KEY = 'fjfeSlotResultText';
    const RESULT_TYPE_KEY = 'fjfeSlotResultType';
    const RESULT_UNTIL_KEY = 'fjfeSlotResultUntil';
    const GOOD_IMAGES = ['addons/clicker/icons/good1.png', 'addons/clicker/icons/good2.png', 'addons/clicker/icons/good3.png', 'addons/clicker/icons/good4.png'];
    const BAD_IMAGES = ['addons/clicker/icons/bad1.png', 'addons/clicker/icons/bad2.png', 'addons/clicker/icons/bad3.png', 'addons/clicker/icons/bad4.png'];
    const SUPER_IMAGE = 'addons/clicker/icons/deploy_jettom.png';
    const ALL_IMAGES = GOOD_IMAGES.concat(BAD_IMAGES).concat([SUPER_IMAGE]);
    const SPIN_SFX = 'addons/clicker/icons/slot_pull.mp3';
    const CLUNK_SFX = 'addons/clicker/icons/clunk.mp3';
    const RESULT_STYLE_ID = 'fjfe-slot-result-style';
    const RUN_BTN_ENABLED_BG = 'linear-gradient(180deg, #6fea7c 0%, #2aa33b 55%, #197a2b 100%)';
    const RUN_BTN_DISABLED_BG = 'linear-gradient(180deg, #6b6b6b 0%, #3c3c3c 55%, #2a2a2a 100%)';
    const RUN_BTN_ENABLED_BORDER = '#1f5f2b';
    const RUN_BTN_DISABLED_BORDER = '#4a4a4a';

    const toUrl = (p)=> (chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL(p) : p;
    const isMuted = ()=> { try { return window.fjfeAudio && window.fjfeAudio.isMuted && window.fjfeAudio.isMuted(); } catch(_) { return false; } };
    const playSfx = (path)=>{
      try {
        if (isMuted()) return;
        const a = new Audio(toUrl(path));
        a.volume = 0.45;
        a.currentTime = 0;
        a.play().catch(()=>{});
      } catch(_) {}
    };
    const randPick = (arr)=> arr[Math.floor(Math.random() * arr.length)];
    const randPickDistinct = (arr, count)=>{
      const out = [];
      const pool = arr.slice();
      while (out.length < count && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        out.push(pool.splice(idx,1)[0]);
      }
      while (out.length < count) out.push(randPick(arr));
      return out;
    };

    const isSlotUpgradePurchased = (id)=>{
      try { return localStorage.getItem(`fjTweakerStoreUpgrade_${id}`) === '1'; } catch(_) { return false; }
    };
    const isSlotUnlocked = ()=> isSlotUpgradePurchased('slott1');
    const hasSlotBetterGood = ()=> isSlotUpgradePurchased('slott2');
    const hasSlotLongerBoosts = ()=> isSlotUpgradePurchased('slott3');
    const hasSlotShorterBad = ()=> isSlotUpgradePurchased('slott4');
    const hasSlotFreeBank = ()=> isSlotUpgradePurchased('slott5');
    const hasSlotFastFree = ()=> isSlotUpgradePurchased('slott6');
    const hasSlotMoreSuper = ()=> isSlotUpgradePurchased('slott7');
    const getFreeSpinMs = ()=> hasSlotFastFree() ? FREE_SPIN_MS_UPGRADED : FREE_SPIN_MS_DEFAULT;
    const getMaxFreeSpinBank = ()=> hasSlotFreeBank() ? 5 : 3;

    const wrap = document.createElement('div');
    Object.assign(wrap.style, { width:'100%', flex:'1 1 auto', display:'flex', flexDirection:'column', alignItems:'flex-start', justifyContent:'flex-start', gap:'8px', padding:'6px 2px' });

    const frame = document.createElement('div');
    Object.assign(frame.style, { border:'1px solid #333', background:'#121212', padding:'6px', display:'flex', flexDirection:'row', alignItems:'center', gap:'6px', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.03)', width:'80%' });

    const slots = document.createElement('div');
    Object.assign(slots.style, { display:'flex', gap:'6px', flex:'1 1 auto' });
    const slotStates = [];
    for (let i = 0; i < 3; i++) {
      const slot = document.createElement('div');
      Object.assign(slot.style, { width:`${SLOT_WIDTH}px`, height:`${SLOT_HEIGHT}px`, border:'1px solid #2c2c2c', background:'#0f0f0f', boxShadow:'inset 0 0 6px rgba(0,0,0,0.6)', overflow:'hidden', position:'relative' });
      const inner = document.createElement('div');
      Object.assign(inner.style, { position:'absolute', left:'0', top:'0', width:'100%', transform:`translateY(${OFFSET_Y}px)` });
      const imgs = [];
      for (let j = 0; j < 3; j++) {
        const img = document.createElement('img');
        Object.assign(img.style, { width:'100%', height:`${ITEM_HEIGHT}px`, display:'block', objectFit:'contain', objectPosition:'50% 50%', background:'#0b0b0b' });
        inner.appendChild(img);
        imgs.push(img);
      }
      slot.appendChild(inner);
      slots.appendChild(slot);
      slotStates.push({ slot, inner, imgs, items: [], timer: null, tickTimer: null, busy: false, spinToken: 0 });
    }

    const runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.textContent = '';
    Object.assign(runBtn.style, { width:'40px', height:'40px', borderRadius:'50%', border:`1px solid ${RUN_BTN_ENABLED_BORDER}`, background:RUN_BTN_ENABLED_BG, cursor:'pointer', flex:'0 0 auto', boxShadow:'inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.5)', transition:'transform 0.08s ease, box-shadow 0.08s ease', display:'flex', alignItems:'center', justifyContent:'center', padding:'0' });
    const spinImg = document.createElement('img');
    spinImg.src = chrome.runtime.getURL ? chrome.runtime.getURL('addons/clicker/icons/spin.png') : 'addons/clicker/icons/spin.png';
    spinImg.onerror = () => { const fb='icons/error.png'; spinImg.src = chrome.runtime.getURL ? chrome.runtime.getURL(fb) : fb; };
    Object.assign(spinImg.style, { width:'32px', height:'32px', objectFit:'contain', display:'block', pointerEvents:'none' });
    runBtn.appendChild(spinImg);

    frame.appendChild(slots);
    frame.appendChild(runBtn);
    wrap.appendChild(frame);

    if (!document.getElementById(RESULT_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = RESULT_STYLE_ID;
      style.textContent = `
        @keyframes fjfe-slot-rainbow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .fjfe-slot-rainbow {
          background: linear-gradient(90deg, #ff4d4d, #ff9c2a, #ffe86a, #7cff79, #6ad1ff, #c27dff, #ff4d4d);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: fjfe-slot-rainbow 1.6s linear infinite;
          font-weight: 800;
        }
      `;
      document.head && document.head.appendChild(style);
    }

    const resultRow = document.createElement('div');
    Object.assign(resultRow.style, { width:'100%', minHeight:'18px', fontSize:'11px', lineHeight:'1.2', color:'#ddd', display:'flex', alignItems:'center', gap:'4px', padding:'0 2px' });
    const resultText = document.createElement('span');
    resultText.style.fontWeight = '400';
    const parenOpen = document.createElement('span');
    parenOpen.textContent = '(';
    parenOpen.style.display = 'none';
    const resultTimer = document.createElement('span');
    Object.assign(resultTimer.style, { color:'#ff9c2a', fontWeight:'700' });
    resultTimer.style.display = 'none';
    const parenClose = document.createElement('span');
    parenClose.textContent = ')';
    parenClose.style.display = 'none';
    resultRow.appendChild(resultText);
    resultRow.appendChild(parenOpen);
    resultRow.appendChild(resultTimer);
    resultRow.appendChild(parenClose);
    wrap.appendChild(resultRow);

    list.appendChild(wrap);

    let resultInterval = null;
    let uiUpdateInterval = null;
    const formatDuration = (ms)=>{
      const total = Math.max(0, Math.floor(ms / 1000));
      const m = Math.floor(total / 60);
      const s = total % 60;
      return m + ':' + String(s).padStart(2, '0');
    };
    const getNextFreeSpinAt = ()=>{
      const raw = localStorage.getItem(FREE_SPIN_KEY);
      const n = parseInt(raw || '0', 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };
    const setNextFreeSpinAt = (ts)=>{
      try { localStorage.setItem(FREE_SPIN_KEY, String(Math.max(0, Math.floor(ts || 0)))); } catch(_) {}
    };
    const getFreeSpinBank = ()=>{
      const raw = localStorage.getItem(FREE_SPIN_BANK_KEY);
      const n = parseInt(raw || '0', 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };
    const setFreeSpinBank = (count)=>{
      const maxBank = getMaxFreeSpinBank();
      try { localStorage.setItem(FREE_SPIN_BANK_KEY, String(Math.max(0, Math.min(maxBank, Math.floor(count || 0))))); } catch(_) {}
    };
    const syncFreeSpinBank = ()=>{
      const maxBank = getMaxFreeSpinBank();
      let bank = getFreeSpinBank();
      if (bank >= maxBank) { setNextFreeSpinAt(0); return; }
      let nextAt = getNextFreeSpinAt();
      if (!nextAt) {
        nextAt = Date.now() + getFreeSpinMs();
        setNextFreeSpinAt(nextAt);
        return;
      }
      if (Date.now() >= nextAt) {
        bank = Math.min(maxBank, bank + 1);
        setFreeSpinBank(bank);
        if (bank >= maxBank) {
          setNextFreeSpinAt(0);
        } else {
          setNextFreeSpinAt(Date.now() + getFreeSpinMs());
        }
      }
    };
    const ensureNextFreeSpinAt = ()=>{
      syncFreeSpinBank();
      const maxBank = getMaxFreeSpinBank();
      let nextAt = getNextFreeSpinAt();
      if (!nextAt && getFreeSpinBank() < maxBank) {
        nextAt = Date.now() + getFreeSpinMs();
        setNextFreeSpinAt(nextAt);
      } else if (hasSlotFastFree()) {
        const now = Date.now();
        const maxAllowed = now + getFreeSpinMs();
        if (nextAt > maxAllowed) {
          nextAt = maxAllowed;
          setNextFreeSpinAt(nextAt);
        }
      }
      return nextAt;
    };
    const getFreeSpinRemainingMs = ()=>{
      syncFreeSpinBank();
      if (getFreeSpinBank() >= getMaxFreeSpinBank()) return 0;
      const nextAt = ensureNextFreeSpinAt();
      return Math.max(0, nextAt - Date.now());
    };
    const hasFreeSpin = ()=>{
      return getFreeSpinBank() > 0;
    };
    const getMoney = ()=>{
      try {
        const storage = window.fjfeNumbersStorage;
        if (storage) return storage.toDisplayNumber(storage.readRaw());
        const raw = localStorage.getItem('fjTweakerClickerCount');
        const num = parseFloat(raw);
        return Number.isFinite(num) ? num : 0;
      } catch(_) { return 0; }
    };
    const setMoney = (val)=>{
      try {
        const storage = window.fjfeNumbersStorage;
        const num = Number(val);
        if (storage) {
          if (!Number.isFinite(num) || num < 0) {
            storage.writeRaw({ infinite:false, scaled: 0n });
          } else {
            storage.writeRaw({ infinite:false, scaled: BigInt(Math.floor(num * 10)) });
          }
        } else {
          localStorage.setItem('fjTweakerClickerCount', String(Math.max(0, Math.floor(num || 0))));
        }
      } catch(_) {}
    };
    const addThumbs = (delta)=>{
      try {
        const cur = getMoney();
        const next = Math.max(0, cur + delta);
        setMoney(next);
        if (delta > 0) { try { if (window.fjfeStats) window.fjfeStats.addPassive(delta); } catch(_) {} }
        try { if (window.fjfeRcMain && typeof window.fjfeRcMain.refresh === 'function') window.fjfeRcMain.refresh(); } catch(_) {}
        try { if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors(); } catch(_) {}
        try { if (typeof window.fjfeRefreshStoreAffordability === 'function') window.fjfeRefreshStoreAffordability(); } catch(_) {}
      } catch(_) {}
    };
    const setTimedEffect = (keyBase, value, seconds)=>{
      try {
        localStorage.setItem(keyBase, String(value));
        localStorage.setItem(keyBase + 'Until', String(Date.now() + Math.max(0, seconds) * 1000));
      } catch(_) {}
    };
    const clearResultUI = ()=>{
      if (resultInterval) { clearInterval(resultInterval); resultInterval = null; }
      resultText.textContent = '';
      resultText.className = '';
      resultText.style.fontWeight = '400';
      resultRow.style.display = 'flex';
      parenOpen.style.display = 'none';
      parenClose.style.display = 'none';
      resultTimer.style.display = 'none';
    };
    const clearResultStorage = ()=>{
      try {
        localStorage.removeItem(RESULT_TEXT_KEY);
        localStorage.removeItem(RESULT_TYPE_KEY);
        localStorage.removeItem(RESULT_UNTIL_KEY);
      } catch(_) {}
    };
    const startResultCountdown = (text, type, untilTs)=>{
      if (!text || !untilTs || untilTs <= Date.now()) {
        clearResultStorage();
        clearResultUI();
        return;
      }
      if (resultInterval) { clearInterval(resultInterval); resultInterval = null; }
      resultRow.style.display = 'flex';
      resultText.className = '';
      resultText.style.color = '#ddd';
      resultText.style.fontWeight = '800';
      if (type === 'good') resultText.style.color = '#ff9c2a';
      if (type === 'bad') resultText.style.color = '#8b1e1e';
      if (type === 'super') resultText.className = 'fjfe-slot-rainbow';
      resultText.textContent = text;
      const updateTimer = ()=>{
        const remaining = Math.max(0, Math.ceil((untilTs - Date.now()) / 1000));
        if (remaining <= 0) {
          clearResultStorage();
          clearResultUI();
          return false;
        }
        resultTimer.textContent = remaining + 's';
        parenOpen.style.display = 'inline';
        parenClose.style.display = 'inline';
        resultTimer.style.display = 'inline';
        return true;
      };
      if (!updateTimer()) return;
      resultInterval = setInterval(() => { if (!updateTimer()) { if (resultInterval) { clearInterval(resultInterval); resultInterval = null; } } }, 1000);
    };
    const showResult = (text, type, seconds)=>{
      try {
        const remaining = Math.max(0, Math.floor(seconds || 0));
        if (remaining <= 0) {
          clearResultStorage();
          clearResultUI();
          return;
        }
        const untilTs = Date.now() + remaining * 1000;
        try {
          localStorage.setItem(RESULT_TEXT_KEY, String(text || ''));
          localStorage.setItem(RESULT_TYPE_KEY, String(type || ''));
          localStorage.setItem(RESULT_UNTIL_KEY, String(untilTs));
        } catch(_) {}
        startResultCountdown(text, type, untilTs);
      } catch(_) {}
    };
    const getActiveBoostInfo = ()=>{
      const now = Date.now();
      const pick = [];
      const rpsUntil = parseInt(localStorage.getItem('fjfeSlotRpsMultUntil') || '0', 10) || 0;
      const rpsVal = parseFloat(localStorage.getItem('fjfeSlotRpsMult') || '0') || 0;
      if (rpsUntil > now) {
        const type = rpsVal >= 10 ? 'super' : (rpsVal >= 1 ? 'good' : 'bad');
        const label = rpsVal < 1 ? 'RPS reduced' : `RPS x${rpsVal}`;
        pick.push({ until: rpsUntil, text: label + '!', type });
      }
      const pctUntil = parseInt(localStorage.getItem('fjfeSlotRpsPctMultUntil') || '0', 10) || 0;
      const pctVal = parseFloat(localStorage.getItem('fjfeSlotRpsPctMult') || '0') || 0;
      if (pctUntil > now && pctVal > 0) {
        const pct = Math.max(0, Math.round((pctVal - 1) * 100));
        pick.push({ until: pctUntil, text: `RPS +${pct}%!`, type: 'good' });
      }
      const clickUntil = parseInt(localStorage.getItem('fjfeSlotClickMultUntil') || '0', 10) || 0;
      const clickVal = parseFloat(localStorage.getItem('fjfeSlotClickMult') || '0') || 0;
      if (clickUntil > now && clickVal > 0) {
        const type = clickVal >= 1000 ? 'super' : 'good';
        pick.push({ until: clickUntil, text: `Click x${clickVal}!`, type });
      }
      if (!pick.length) return null;
      pick.sort((a, b) => b.until - a.until);
      return pick[0];
    };
    const ensureResultVisible = ()=>{
      if (!document.body.contains(wrap)) return;
      if (!isSlotUnlocked()) return;
      if (resultText.textContent) return;
      const fallback = getActiveBoostInfo();
      if (fallback) startResultCountdown(fallback.text, fallback.type, fallback.until);
    };
    const syncResultFromStorage = ()=>{
      try {
        if (!document.body.contains(wrap)) return;
        if (!isSlotUnlocked()) { clearResultUI(); return; }
        const text = localStorage.getItem(RESULT_TEXT_KEY) || '';
        const type = localStorage.getItem(RESULT_TYPE_KEY) || '';
        const until = parseInt(localStorage.getItem(RESULT_UNTIL_KEY) || '0', 10) || 0;
        if (text && until && until > Date.now()) {
          startResultCountdown(text, type, until);
          return;
        }
        const fallback = getActiveBoostInfo();
        if (fallback) {
          startResultCountdown(fallback.text, fallback.type, fallback.until);
          return;
        }
        clearResultUI();
      } catch(_) {}
    };
    const storageCb = (e)=>{
      if (!document.body.contains(wrap)) return;
      if (!e || !e.key) return;
      if (e.key === 'fjTweakerStoreUpgrade_slott1') {
        syncSlotUnlock();
        return;
      }
      if (e.key === 'fjTweakerStoreUpgrade_slott5' || e.key === FREE_SPIN_BANK_KEY) {
        syncFreeSpinBank();
        updateSpinVisual();
      }
      if (e.key === RESULT_TEXT_KEY || e.key === RESULT_TYPE_KEY || e.key === RESULT_UNTIL_KEY) {
        syncResultFromStorage();
      }
      if (e.key === FREE_SPIN_KEY || e.key === 'fjfeSlotRpsMultUntil' || e.key === 'fjfeSlotRpsPctMultUntil' || e.key === 'fjfeSlotClickMultUntil') {
        updateSpinVisual();
      }
    };
    const isBoostActive = ()=>{
      try {
        const now = Date.now();
        const keys = ['fjfeSlotRpsMultUntil', 'fjfeSlotRpsPctMultUntil', 'fjfeSlotClickMultUntil'];
        return keys.some(k => {
          const raw = localStorage.getItem(k);
          const n = parseInt(raw || '0', 10);
          return Number.isFinite(n) && n > now;
        });
      } catch(_) { return false; }
    };
    const getProducerCounts = ()=>{
      const ids = [
        { id: 'script', name: 'Script' },
        { id: 'groupChat', name: 'Group Chat' },
        { id: 'workshop', name: 'Workshop' },
        { id: 'studio', name: 'Studio' },
        { id: 'recyclingCenter', name: 'Recycling Center' },
        { id: 'digsite', name: 'Digsite' },
        { id: 'officeBuilding', name: 'Office Building' },
        { id: 'contentFarm', name: 'Content Farm' },
        { id: 'botnet', name: 'Botnet' },
        { id: 'spaceport', name: 'Spaceport' },
        { id: 'ritualCircle', name: 'Ritual Circle' },
        { id: 'memecatcher', name: 'Memecatcher' },
        { id: 'quantumHarmonizer', name: 'Quantum Harmonizer' },
        { id: 'timeForge', name: 'Time Forge' },
        { id: 'wormhole', name: 'Wormhole' },
        { id: 'pocketDimension', name: 'Pocket Dimension' },
        { id: 'agiShitposter', name: 'AGI Shitposter' },
        { id: 'realityShaper', name: 'Reality Shaper' },
        { id: 'dysonSphere', name: 'Dyson Sphere' },
        { id: 'multiverse', name: 'Multiverse' },
      ];
      return ids.map(p => {
        const raw = localStorage.getItem(`fjTweakerUpgradeNum_${p.id}`);
        const n = parseInt(raw, 10);
        return { id: p.id, name: p.name, count: Number.isFinite(n) ? n : 0 };
      });
    };
    const adjustGoodDuration = (seconds)=>{
      const base = Math.max(1, Math.floor(seconds || 0));
      if (!hasSlotLongerBoosts()) return base;
      return Math.max(1, Math.round(base * 1.1));
    };
    const adjustBadDuration = (seconds)=>{
      const base = Math.max(1, Math.floor(seconds || 0));
      if (!hasSlotShorterBad()) return base;
      return Math.max(1, Math.round(base * 0.9));
    };
    const applyResult = (result)=>{
      const tools = window.fjfeClickerNumbers;
      const fmt = tools && tools.formatCounter ? tools.formatCounter : (n=>String(Math.floor(n)));
      const rps = (window.fjfeRcProd && typeof window.fjfeRcProd.getTotalRps === 'function') ? window.fjfeRcProd.getTotalRps() : 0;
      const rpsVal = tools && tools.quantize ? tools.quantize(rps) : Number(rps || 0);

      if (result === 'good') {
        const roll = Math.random();
        if (roll < 0.50) {
          const cur = getMoney();
          const gainA = Math.floor(cur * 0.15);
          const gainB = Math.floor(rpsVal * 900);
          const gain = Math.max(0, Math.min(gainA, gainB));
          addThumbs(gain);
          showResult(`Front page! +${fmt(gain)} thumbs!`, 'good', 5);
          return;
        }
        if (roll < 0.75) {
          const dur = adjustGoodDuration(60);
          setTimedEffect('fjfeSlotRpsMult', 8, dur);
          try { if (typeof window.fjfeClickerV2Recompute === 'function') window.fjfeClickerV2Recompute(); } catch(_) {}
          showResult('#mod-help down! x8 RPS.', 'good', dur);
          return;
        }
        if (roll < 0.95) {
          const candidates = getProducerCounts().filter(p => p.count >= 10);
          if (!candidates.length) {
            const cur = getMoney();
            const gainA = Math.floor(cur * 0.15);
            const gainB = Math.floor(rpsVal * 900);
            const gain = Math.max(0, Math.min(gainA, gainB));
            addThumbs(gain);
            showResult(`Front page! +${fmt(gain)} thumbs!`, 'good', 5);
            return;
          }
          const picked = randPick(candidates);
          const pct = picked.count * 10;
          const mult = 1 + (pct / 100);
          const dur = adjustGoodDuration(30);
          setTimedEffect('fjfeSlotRpsPctMult', mult, dur);
          try { if (typeof window.fjfeClickerV2Recompute === 'function') window.fjfeClickerV2Recompute(); } catch(_) {}
          showResult(`Overflow! +${pct}% RPS.`, 'good', dur);
          return;
        }
        {
          const dur = adjustGoodDuration(15);
          setTimedEffect('fjfeSlotClickMult', 777, dur);
          showResult('Containment breach! x777 thumbs per click!', 'good', dur);
        }
        return;
      }

      if (result === 'bad') {
        if (Math.random() < 0.50) {
          const cur = getMoney();
          const lossA = Math.floor(cur * 0.05);
          const lossB = Math.floor(rpsVal * 600);
          const loss = Math.max(0, Math.min(lossA, lossB));
          addThumbs(-loss);
          showResult(`Moved to NSFW! -${fmt(loss)} thumbs!`, 'bad', 5);
          return;
        }
        const dur = adjustBadDuration(60);
        setTimedEffect('fjfeSlotRpsMult', 0.5, dur);
        try { if (typeof window.fjfeClickerV2Recompute === 'function') window.fjfeClickerV2Recompute(); } catch(_) {}
        showResult('Temporary ban! RPS halved!', 'bad', dur);
        return;
      }

      if (result === 'super') {
        if (Math.random() < 0.50) {
          const dur = adjustGoodDuration(60);
          setTimedEffect('fjfeSlotRpsMult', 15, dur);
          try { if (typeof window.fjfeClickerV2Recompute === 'function') window.fjfeClickerV2Recompute(); } catch(_) {}
          showResult('Jettom deployed! RPS x15!', 'super', dur);
          return;
        }
        {
          const dur = adjustGoodDuration(10);
          setTimedEffect('fjfeSlotClickMult', 1111, dur);
          showResult('DJ Admin Party! x1111 thumbs per click!', 'super', dur);
        }
        return;
      }

      showResult('No result.', 'none', 0);
    };

    const normalizeItems = (slotState)=>{
      while (slotState.items.length < 3) slotState.items.push(randPick(ALL_IMAGES));
      if (slotState.items.length > 3) slotState.items = slotState.items.slice(0, 3);
    };
    const renderSlot = (slotState)=>{
      normalizeItems(slotState);
      for (let i = 0; i < slotState.imgs.length; i++) {
        const img = slotState.imgs[i];
        const src = slotState.items[i] || randPick(ALL_IMAGES);
        img.src = toUrl(src);
      }
    };
    const primeSlots = ()=>{
      slotStates.forEach(state => {
        state.items = randPickDistinct(ALL_IMAGES, 3);
        renderSlot(state);
      });
    };
    const spinOnce = (slotState, nextItem, force, tokenOverride)=>{
      try {
        if (slotState.busy && !force) return;
        slotState.busy = true;
        const token = (typeof tokenOverride === 'number') ? tokenOverride : ++slotState.spinToken;
        slotState.inner.style.transition = 'transform 0.08s linear';
        slotState.inner.style.transform = `translateY(${OFFSET_Y + ITEM_HEIGHT}px)`;
        slotState.tickTimer = setTimeout(() => {
          if (slotState.spinToken !== token) { slotState.busy = false; return; }
          slotState.inner.style.transition = 'none';
          slotState.inner.style.transform = `translateY(${OFFSET_Y}px)`;
          normalizeItems(slotState);
          slotState.items.pop();
          slotState.items.unshift(nextItem || randPick(ALL_IMAGES));
          renderSlot(slotState);
          slotState.busy = false;
        }, 85);
        setTimeout(() => { slotState.busy = false; }, 140);
      } catch(_) { slotState.busy = false; }
    };
    const startSpin = ()=>{
      slotStates.forEach(state => {
        if (state.timer) clearInterval(state.timer);
        state.timer = setInterval(() => spinOnce(state), SPIN_INTERVAL_MS);
      });
    };
    const stopSlotAt = (slotState, target)=>{
      try {
        if (slotState.timer) {
          clearInterval(slotState.timer);
          slotState.timer = null;
        }
        if (slotState.tickTimer) {
          clearTimeout(slotState.tickTimer);
          slotState.tickTimer = null;
        }
        slotState.busy = false;
        normalizeItems(slotState);
        slotState.items = [target, randPick(ALL_IMAGES), randPick(ALL_IMAGES)];
        renderSlot(slotState);
        const token = ++slotState.spinToken;
        spinOnce(slotState, randPick(ALL_IMAGES), true, token);
        setTimeout(() => {
          if (slotState.spinToken !== token) return;
          slotState.inner.style.transition = 'none';
          slotState.inner.style.transform = `translateY(${OFFSET_Y}px)`;
          slotState.busy = false;
          slotState.spinToken++;
          playSfx(CLUNK_SFX);
        }, 95);
      } catch(_) {}
    };

    let spinning = false;
    const spendSpinCost = ()=>{
      try {
        const bank = getFreeSpinBank();
        if (bank <= 0) return false;
        const maxBank = getMaxFreeSpinBank();
        const nextBank = bank - 1;
        setFreeSpinBank(nextBank);
        if (bank >= maxBank) {
          setNextFreeSpinAt(Date.now() + getFreeSpinMs());
        } else if (!getNextFreeSpinAt() && nextBank < maxBank) {
          setNextFreeSpinAt(Date.now() + getFreeSpinMs());
        }
        try { if (window.fjfeRcMain && typeof window.fjfeRcMain.refresh === 'function') window.fjfeRcMain.refresh(); } catch(_) {}
        try { if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors(); } catch(_) {}
        try { if (typeof window.fjfeRefreshStoreAffordability === 'function') window.fjfeRefreshStoreAffordability(); } catch(_) {}
        return true;
      } catch(_) { return false; }
    };
    const pickResult = ()=>{
      let none = 60;
      let good = 39;
      let bad = 10;
      let sup = 1;
      if (hasSlotBetterGood()) { good += 5; none -= 5; }
      if (hasSlotMoreSuper()) { sup += 1; none -= 1; }
      if (none < 0) none = 0;
      const total = none + good + bad + sup;
      const r = Math.random() * total;
      if (r < none) return 'none';
      if (r < none + good) return 'good';
      if (r < none + good + bad) return 'bad';
      return 'super';
    };
    const pickDistinctCenters = ()=>{
      const pool = randPickDistinct(ALL_IMAGES, 3);
      if (pool[0] === pool[1] || pool[1] === pool[2] || pool[0] === pool[2]) {
        return randPickDistinct(ALL_IMAGES, 3);
      }
      return pool;
    };
    const chooseTargets = (result)=>{
      if (result === 'good') {
        const img = randPick(GOOD_IMAGES);
        return [img, img, img];
      }
      if (result === 'bad') {
        const img = randPick(BAD_IMAGES);
        return [img, img, img];
      }
      if (result === 'super') {
        return [SUPER_IMAGE, SUPER_IMAGE, SUPER_IMAGE];
      }
      if (Math.random() < 0.25) {
        const nearImg = (Math.random() < 0.5) ? randPick(GOOD_IMAGES) : SUPER_IMAGE;
        const badImg = randPick(BAD_IMAGES);
        return [nearImg, nearImg, badImg];
      }
      return pickDistinctCenters();
    };

    const updateSpinVisual = ()=>{
      if (!isSlotUnlocked()) {
        runBtn.style.opacity = '0.55';
        runBtn.style.cursor = 'not-allowed';
        runBtn.style.borderColor = RUN_BTN_DISABLED_BORDER;
        runBtn.style.background = RUN_BTN_DISABLED_BG;
        spinImg.style.opacity = '0.6';
        return false;
      }
      syncFreeSpinBank();
      const canSpin = !spinning && !isBoostActive() && hasFreeSpin();
      runBtn.style.opacity = canSpin ? '1' : '0.55';
      runBtn.style.cursor = canSpin ? 'pointer' : 'not-allowed';
      runBtn.style.borderColor = canSpin ? RUN_BTN_ENABLED_BORDER : RUN_BTN_DISABLED_BORDER;
      runBtn.style.background = canSpin ? RUN_BTN_ENABLED_BG : RUN_BTN_DISABLED_BG;
      spinImg.style.opacity = canSpin ? '1' : '0.6';
      return canSpin;
    };

    const updateTooltip = ()=>{
      updateSpinVisual();
      if (!window.fjfeRcInfo) return;
      const freeRemaining = getFreeSpinRemainingMs();
      const banked = getFreeSpinBank();
      const rollLabel = banked === 0 ? 'No rolls.' : (banked === 1 ? '1 roll banked.' : `${banked} rolls.`);
      const imageSrc = spinImg && spinImg.src ? spinImg.src : (chrome.runtime.getURL ? chrome.runtime.getURL('addons/clicker/icons/spin.png') : 'addons/clicker/icons/spin.png');
      window.fjfeRcInfo.show({
        imageSrc,
        name: 'Slot Machine',
        cost: rollLabel,
        costColor: '#ffffff',
        hideCostIcon: true,
        bodyTop: "Rolls regenerate over time.\nNext roll in: " + (banked >= getMaxFreeSpinBank() ? '0:00' : formatDuration(freeRemaining)) + ".",
        bodyTT: "Let's go gambling!"
      });
    };
    let tooltipInterval = null;
    runBtn.addEventListener('mouseenter', () => {
      try {
        if (tooltipInterval) clearInterval(tooltipInterval);
        updateTooltip();
        tooltipInterval = setInterval(updateTooltip, 1000);
      } catch(_) {}
    });
    runBtn.addEventListener('mouseleave', () => {
      try { if (tooltipInterval) { clearInterval(tooltipInterval); tooltipInterval = null; } } catch(_) {}
      try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch(_) {}
    });

    const finalizeResult = (result)=>{
      try { applyResult(result); }
      catch(_) { showResult('Slot error.', 'bad', 5); }
    };

    runBtn.addEventListener('click', () => {
      if (!updateSpinVisual()) return;
      if (spinning || isBoostActive()) return;
      if (!spendSpinCost()) return;
      spinning = true;
      updateSpinVisual();
      runBtn.style.transform = 'scale(0.92)';
      runBtn.style.boxShadow = 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.5)';
      setTimeout(() => {
        runBtn.style.transform = '';
        runBtn.style.boxShadow = 'inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.5)';
      }, 120);

      playSfx(SPIN_SFX);
      startSpin();

      const result = pickResult();
      const targets = chooseTargets(result);
      setTimeout(() => {
        stopSlotAt(slotStates[0], targets[0]);
        setTimeout(() => {
          stopSlotAt(slotStates[1], targets[1]);
          setTimeout(() => {
            stopSlotAt(slotStates[2], targets[2]);
            spinning = false;
            updateSpinVisual();
            finalizeResult(result);
          }, STOP_DELAY_MS);
        }, STOP_DELAY_MS);
      }, SPIN_DURATION_MS);
    });

    let slotWasUnlocked = false;
    function syncSlotUnlock(){
      const unlocked = isSlotUnlocked();
      wrap.style.display = unlocked ? 'flex' : 'none';
      if (unlocked && !slotWasUnlocked) {
        primeSlots();
        syncResultFromStorage();
        ensureResultVisible();
        updateSpinVisual();
      }
      slotWasUnlocked = unlocked;
    }
    syncSlotUnlock();
    try {
      if (uiUpdateInterval) clearInterval(uiUpdateInterval);
      uiUpdateInterval = setInterval(() => {
        if (!document.body.contains(wrap)) { clearInterval(uiUpdateInterval); uiUpdateInterval = null; return; }
        syncSlotUnlock();
        ensureResultVisible();
        updateSpinVisual();
      }, 1000);
    } catch(_) {}
    cancelSlotSpin = () => {
      try {
        slotStates.forEach(state => {
          if (state.timer) clearInterval(state.timer);
          if (state.tickTimer) clearTimeout(state.tickTimer);
          state.timer = null;
          state.tickTimer = null;
          state.busy = false;
        });
      } catch(_) {}
      spinning = false;
    };
    cancelSlotResultTimer = () => {
      try {
        clearResultUI();
      } catch(_) {}
      try {
        if (window.__fjfeSlotStorageListeners) {
          window.__fjfeSlotStorageListeners = window.__fjfeSlotStorageListeners.filter(fn => fn !== storageCb);
        }
      } catch(_) {}
    };
    try {
      if (!window.__fjfeSlotStorageListeners) window.__fjfeSlotStorageListeners = [];
      window.__fjfeSlotStorageListeners.push(storageCb);
      if (!window.__fjfeSlotStorageListenerAdded) {
        window.__fjfeSlotStorageListenerAdded = true;
        window.addEventListener('storage', (e) => {
          try {
            const list = window.__fjfeSlotStorageListeners || [];
            list.forEach(fn => { try { fn(e); } catch(_) {} });
          } catch(_) {}
        });
      }
    } catch(_) {}
    try {
      if (!window.__fjfeSlotBankTimer) {
        window.__fjfeSlotBankTimer = setInterval(() => {
          try {
            if (!isSlotUnlocked()) return;
            syncFreeSpinBank();
          } catch(_) {}
        }, 1000);
      }
    } catch(_) {}
  })();

  
    (function addMuteRow(){
      const row = document.createElement('label');
      Object.assign(row.style, { display:'flex', alignItems:'center', gap:'8px', color:'#fff', fontSize:'12px', padding:'4px 2px', userSelect:'none' });
      const cb = document.createElement('input'); cb.type = 'checkbox';
      try { cb.checked = !!(window.fjfeAudio && window.fjfeAudio.isMuted && window.fjfeAudio.isMuted()); } catch(_) {}
      cb.addEventListener('change', ()=>{
        try { if (window.fjfeAudio) window.fjfeAudio.setMuted(!!cb.checked); } catch(_) {}
      });
      const span = document.createElement('span'); span.textContent = 'Mute all clicker sounds';
      row.appendChild(cb); row.appendChild(span);
      list.appendChild(row);
    })();

    (function addRefreshAltsButton(){
      const btn = document.createElement('button');
      btn.textContent = 'Refresh alts';
      Object.assign(btn.style, {
        marginLeft: '2px',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: '700',
        color: '#fff',
        background: '#2a2a2a',
        border: '1px solid #444',
        borderRadius: '4px',
        cursor: 'pointer',
        userSelect: 'none',
      });
      btn.addEventListener('click', ()=>{
        try {
          if (window.fjfeRcStore && typeof window.fjfeRcStore.refreshAltState === 'function') {
            window.fjfeRcStore.refreshAltState();
          }
        } catch(_) {}
      });
      list.appendChild(btn);
    })();

    let banConfirmPending = false;
    const banEvade = buildIconButton('addons/clicker/icons/prestige.png', 'Ban Evade', {
      onClick: () => {
        if (!banConfirmPending) {
          banConfirmPending = true;
          try { if (banEvade._titleEl) banEvade._titleEl.textContent = 'Really?'; } catch(_) {}
        } else {
          
          banConfirmPending = false;
          try { if (banEvade._titleEl) banEvade._titleEl.textContent = 'Ban Evade'; } catch(_) {}
          try {
            
            let potprest = 0;
            try {
              if (window.fjfeStats && typeof window.fjfeStats.computePrestigeProgress === 'function') {
                const pr = window.fjfeStats.computePrestigeProgress();
                
                potprest = Math.max(0, Math.floor(pr.potprest || 0));
              }
            } catch(_) {}

            
            const timesPrest = parseInt(localStorage.getItem('fjfeStats_timesPrestiged')||'0',10) || 0;
            localStorage.setItem('fjfeStats_timesPrestiged', String(timesPrest + 1));

            
            if (potprest > 0) {
              const curBonus = parseInt(localStorage.getItem('fjfeStats_prestigeBonusPct')||'0',10) || 0;
              const nextBonus = Math.max(0, Math.floor(curBonus + potprest));
              try { if (window.fjfeStats && typeof window.fjfeStats.setPrestigeBonusPercent==='function') window.fjfeStats.setPrestigeBonusPercent(nextBonus); else localStorage.setItem('fjfeStats_prestigeBonusPct', String(nextBonus)); } catch(_) {}
            }

            
            try { if (window.fjfeStats && typeof window.fjfeStats.prestigeReset==='function') window.fjfeStats.prestigeReset(); } catch(_) {}
          } catch(_) {}
          try { if (window.fjfeAudio) window.fjfeAudio.play('prestige'); } catch(_) {}
          try { closeMenu(); } catch(_) {}
        }
      }
    });
    
    banEvade.addEventListener('mouseenter', () => {
      try {
        if (!window.fjfeRcInfo) return;
        const imgEl = banEvade.querySelector('img');
        const imageSrc = imgEl && imgEl.src ? imgEl.src : '';
        const tools = window.fjfeClickerNumbers;
        const fmt = (n)=> tools && tools.formatCounter ? tools.formatCounter(n) : String(n);
        let potprest = 0;
        let prest = 0;
        let remainStr = '';
        try {
          if (window.fjfeStats && typeof window.fjfeStats.computePrestigeProgress === 'function') {
            const pr = window.fjfeStats.computePrestigeProgress();
            potprest = Math.max(0, Math.floor(pr.potprest || 0));
            prest = Math.max(0, Math.floor((localStorage.getItem('fjfeStats_prestigeBonusPct')||'0')));
            remainStr = pr.prestremainStr || fmt(pr.prestremain || 0);
          }
        } catch(_) {}
        const line1 = `Current prestige bonus: +${prest}%`;
        const line2 = potprest>0 ? `Prestiging now would grant you a +${potprest}% bonus to your RPS.` : 'Prestiging now would grant you no bonus.';
        const line3 = `${remainStr} thumbs until next prestige.`;
        window.fjfeRcInfo.show({
          imageSrc,
          name: 'Ban Evade',
          hideCost: true,
          bodyMid: `${line1}\n${line2}\n${line3}`
        });
      } catch(_) {}
    });
    banEvade.addEventListener('mouseleave', () => { try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch(_) {} });
  list.appendChild(banEvade);

  
    let confirmPending = false;
    const resetBtn = buildIconButton('addons/clicker/icons/nuke.png', 'Full Reset', {
      onClick: () => {
        if (!confirmPending) {
          confirmPending = true;
          
          try { if (resetBtn._titleEl) resetBtn._titleEl.textContent = 'Really?'; } catch(_) {}
        } else {
          confirmPending = false;
          try { if (resetBtn._titleEl) resetBtn._titleEl.textContent = 'Full Reset'; } catch(_) {}
          try { if (window.fjfeRcDebug && typeof window.fjfeRcDebug.resetMoney === 'function') window.fjfeRcDebug.resetMoney(); } catch(_) {}
          try { if (window.fjfeStats && typeof window.fjfeStats.reset === 'function') window.fjfeStats.reset(); } catch(_) {}
          
          try { localStorage.setItem('fjfeDebugEnabled','0'); } catch(_) {}
          try { if (window.fjfeRcDebug && typeof window.fjfeRcDebug.cleanup === 'function') window.fjfeRcDebug.cleanup(); } catch(_) {}
          try { closeMenu(); } catch(_) {}
        }
      }
    });
    
    resetBtn.addEventListener('mouseenter', () => {
      try {
        if (!window.fjfeRcInfo) return;
        const imgEl = resetBtn.querySelector('img');
        const imageSrc = imgEl && imgEl.src ? imgEl.src : '';
        window.fjfeRcInfo.show({
          imageSrc,
          name: 'Full Reset',
          hideCost: true,
          bodyTop: 'A complete wipe. No prestige, no bonuses, this will start you from scratch.'
        });
      } catch(_) {}
    });
    resetBtn.addEventListener('mouseleave', () => { try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch(_) {} });
  list.appendChild(resetBtn);

    menu.appendChild(list);
    document.body.appendChild(menu);

    
    setTimeout(() => { menu.style.transform = 'translateY(0)'; menu.style.opacity = '1'; setTimeout(()=>{
      menu.style.transition = 'transform 0.22s cubic-bezier(.5,1.7,.5,1), opacity 0.18s cubic-bezier(.5,1.7,.5,1)';
    }, 220); }, 10);
    try { if (window.fjfeAudio) window.fjfeAudio.play('menu_open'); } catch(_) {}

    
  const resetConfirm = () => { try { if (resetBtn._titleEl) resetBtn._titleEl.textContent = 'Full Reset'; } catch(_) {} confirmPending=false; try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch(_) {} };
    const obs = new MutationObserver(() => {
      if (!document.body.contains(menu)) { try { obs.disconnect(); } catch(_) {}
        resetConfirm();
        
        try { if (banEvade && banEvade._titleEl) banEvade._titleEl.textContent = 'Ban Evade'; } catch(_) {}
        banConfirmPending = false;
        try { if (typeof cancelSlotSpin === 'function') cancelSlotSpin(); } catch(_) {}
        try { if (typeof cancelSlotResultTimer === 'function') cancelSlotResultTimer(); } catch(_) {}
        try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch(_) {}
      }
    });
    try { obs.observe(document.body, { childList:true, subtree:true }); } catch(_) {}

    state.openMenu = menu; state.allMenus.push(menu);
  }

  function toggleMenu(){
    if (state.openMenu) { closeMenu(); return; }
    try { if (window.fjfeAudio && window.fjfeAudio.suppressClose) window.fjfeAudio.suppressClose(300); } catch(_) {}
    try { if (window.fjfeRcProd) window.fjfeRcProd.closeMenu(); } catch(_) {}
    try { if (window.fjfeRcStats) window.fjfeRcStats.closeMenu(); } catch(_) {}
    actuallyOpenMenu();
  }

  function init(opts){ state.anchorEl = opts && opts.anchorEl ? opts.anchorEl : null; }

  function addSettingsButton(host){
    
    const btn = document.createElement('button');
    Object.assign(btn.style, {
      position: 'absolute',
  left: '8px',
  top: '28px',
      width: '22px',
      height: '22px',
      padding: '0',
      margin: '0',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      zIndex: 4,
    });
    const img = document.createElement('img');
  const path = 'addons/clicker/icons/settings.png';
    img.src = chrome.runtime.getURL ? chrome.runtime.getURL(path) : path;
  img.onerror = () => { const fb='addons/clicker/icons/settings.png'; img.src = chrome.runtime.getURL ? chrome.runtime.getURL(fb) : fb; };
    Object.assign(img.style, { width:'100%', height:'100%', objectFit:'contain', display:'block' });
    btn.appendChild(img);
    btn.addEventListener('click', (e)=>{ e.preventDefault(); try { if (window.fjfeRcSettings) { window.fjfeRcSettings.init({ anchorEl: host }); window.fjfeRcSettings.toggleMenu(); } } catch(_){} });
    return btn;
  }

  window.fjfeRcSettings = { init, toggleMenu, closeMenu, updatePosition, addSettingsButton, isOpen: function(){ return !!state.openMenu; } };

  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition);
})();
