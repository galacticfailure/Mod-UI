(function() {
  const MAX_SAFE = Number.MAX_SAFE_INTEGER;

  function clampSafe(n) {
    if (!Number.isFinite(n) || isNaN(n)) return 0;
    if (n < 0) return 0;
    if (n > MAX_SAFE) return MAX_SAFE;
    return Math.floor(n);
  }

  function formatCompact(n) {
    const tools = window.fjfeClickerNumbers;
    if (tools && typeof tools.format === 'function') {
      return tools.format(n);
    }
    if (!Number.isFinite(n)) return 'Infinity';
    n = Math.floor(Math.max(0, n));
    if (n >= 1_000_000_000) {
      const v = Math.floor((n / 1_000_000_000) * 100) / 100;
      return v.toFixed(2) + 'B';
    } else if (n >= 1_000_000) {
      const v = Math.floor((n / 1_000_000) * 100) / 100;
      return v.toFixed(2) + 'M';
    } else if (n >= 1_000) {
      const v = Math.floor((n / 1_000) * 100) / 100;
      return v.toFixed(2) + 'K';
    }
    return String(n);
  }

  function canAffordConsideringFormat(money, price) {
    const tools = window.fjfeClickerNumbers;
    if (tools && typeof tools.quantize === 'function') {
      if (tools.isInfinite && tools.isInfinite(price)) return tools.isInfinite(money);
      const normalizedMoney = tools.quantize(Math.max(0, money));
      const normalizedPrice = tools.quantize(Math.max(0, price));
      return normalizedMoney >= normalizedPrice;
    }
    money = clampSafe(money);
    price = clampSafe(price);
    if (money >= price) return true;
    return formatCompact(money) === formatCompact(price);
  }

  function loadInt(key, d = 0) {
    try {
      const v = parseInt(localStorage.getItem(key), 10);
      return Number.isFinite(v) ? v : d;
    } catch (_) {
      return d;
    }
  }

  function setInt(key, v) {
    try {
      localStorage.setItem(key, String(clampSafe(v)));
    } catch (_) {}
  }

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
    } catch (_) { return 0; }
  }

  function setMoney(v) {
    try {
      const tools = window.fjfeClickerNumbers;
      const storage = window.fjfeNumbersStorage;
      const num = Number(v);
      if (!Number.isFinite(num) || (tools && tools.isInfinite && tools.isInfinite(num))) {
        if (storage) storage.writeRaw({ infinite:true, scaled:0n });
        else localStorage.setItem('fjTweakerClickerCount', 'Infinity');
        return;
      }
      const bounded = Math.max(0, num || 0);
      if (storage) {
        const scaled = BigInt(Math.floor(bounded * 10));
        storage.writeRaw({ infinite:false, scaled });
      } else {
        localStorage.setItem('fjTweakerClickerCount', String(Math.min(MAX_SAFE, Math.floor(bounded))));
      }
    } catch (_) {}
  }

  function getPriceDiscountFactorGlobal() {
    return 1.0;
  }

  function loadUpgradeLevelByIdGlobal(id) {
    try {
      const raw = localStorage.getItem(`fjTweakerUpgradeNum_${id}`);
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (_) {
      return 0;
    }
  }

  
  const MULTIPLIER = 1.15;
  const UPGRADE_LIST = [
    { id: 'script',            basePrice: 15,                         rpsAdd: 0.1,             name: 'Script',             tt: 'A simple script to repost your reposts.' },
    { id: 'groupChat',         basePrice: 100,                        rpsAdd: 1,               name: 'Group Chat',         tt: 'Produces fresh content to steal.' },
    { id: 'workshop',          basePrice: 1100,                       rpsAdd: 8,               name: 'Workshop',           tt: 'Carefully assembles memes from provided parts.' },
    { id: 'studio',            basePrice: 12000,                      rpsAdd: 47,              name: 'Studio',             tt: 'Films high-effort content for you to effortlessly steal.' },
    { id: 'recyclingCenter',   basePrice: 130000,                     rpsAdd: 260,             name: 'Recycling Center',   tt: 'Recycles old content into new content.' },
    { id: 'digsite',           basePrice: 1400000,                    rpsAdd: 1400,            name: 'Digsite',            tt: 'Digs up ancient memes from a better time.' },
    { id: 'officeBuilding',    basePrice: 20000000,                   rpsAdd: 7800,            name: 'Office Building',    tt: 'Analyzes market trends to produce relatable memes.' },
    { id: 'contentFarm',       basePrice: 300000000,                  rpsAdd: 44000,           name: 'Content Farm',       tt: 'Grows content using industrial farming techniques.' },
    { id: 'botnet',            basePrice: 5100000000,                 rpsAdd: 260000,          name: 'Botnet',             tt: 'Reposts at blinding speeds, changing IP every time.' },
    { id: 'spaceport',         basePrice: 75000000000,                rpsAdd: 1600000,         name: 'Spaceport',          tt: 'Imports content from alien worlds.' },
    { id: 'ritualCircle',      basePrice: 1000000000000,              rpsAdd: 10000000,        name: 'Ritual Circle',      tt: 'Uses unholy rituals to summon extradimensional content.' },
    { id: 'memecatcher',       basePrice: 14000000000000,             rpsAdd: 65000000,        name: 'Memecatcher',        tt: 'Harvests memes from dreams.' },
    { id: 'quantumHarmonizer', basePrice: 170000000000000,            rpsAdd: 430000000,       name: 'Quantum Harmonizer', tt: 'Finds content that may not exist and forces it to.' },
    { id: 'timeForge',         basePrice: 2100000000000000,           rpsAdd: 2900000000,      name: 'Time Forge',         tt: 'Forges memes from the fabric of time itself.' },
    { id: 'wormhole',          basePrice: 26000000000000000n,          rpsAdd: 21000000000,     name: 'Wormhole',           tt: 'Pulls content from who knows where, or when.' },
    { id: 'pocketDimension',   basePrice: 310000000000000000n,         rpsAdd: 150000000000,    name: 'Pocket Dimension',   tt: 'An entire dimension, dedicated to created memes. After all, their survival depends on it.' },
    { id: 'agiShitposter',     basePrice: 71000000000000000000n,       rpsAdd: 1100000000000,   name: 'AGI Shitposter',     tt: 'True artificial intelligence, purpose-built for stealing memes.' },
    { id: 'realityShaper',     basePrice: 1200000000000000000000n,     rpsAdd: 8300000000000,   name: 'Reality Shaper',     tt: 'Infinitely folds reality into content.' },
    { id: 'dysonSphere',       basePrice: 190000000000000000000000n,   rpsAdd: 64000000000000,  name: 'Dyson Sphere',       tt: 'Repurposes the energy of a star to generate endless memes.' },
    { id: 'multiverse',        basePrice: 54000000000000000000000000n, rpsAdd: 510000000000000, name: 'Multiverse',         tt: "Other versions of you have some pretty hefty meme folders...surely they won't notice if you partake?" }
  ];
  const DEF_BY_ID = Object.fromEntries(UPGRADE_LIST.map(u => [u.id, u]));
  function getUnlockedCount() {
    const total = UPGRADE_LIST.length;
    
    let unlocked = 1;
    for (let i = 0; i < UPGRADE_LIST.length - 1; i++) {
      if (i >= unlocked) break;
      const id = UPGRADE_LIST[i].id;
      const lvl = loadUpgradeLevelByIdGlobal(id);
      if (lvl >= 3) unlocked = Math.min(total, unlocked + 1);
    }
    return Math.min(total, unlocked);
  }

  const state = {
    anchorEl: null,
    allMenus: [],
    openMenu: null,
    openMenuColor: null,
  };

  function closeMenu(){
    const { allMenus } = state;
    const hadAny = allMenus && allMenus.length > 0;
    allMenus.forEach(menu => {
      if(!menu._closing){
        menu._closing=true; menu.style.transition='none'; void menu.offsetWidth;
        requestAnimationFrame(()=>{
          menu.style.transition='transform 0.22s cubic-bezier(.5,1.7,.5,1), opacity 0.18s cubic-bezier(.5,1.7,.5,1)';
          menu.style.transform='translateY(-100%)'; menu.style.opacity='0'; menu.style.zIndex=2147483642;
          setTimeout(()=>{ if(menu.parentNode) menu.parentNode.removeChild(menu); const idx=allMenus.indexOf(menu); if(idx!==-1) allMenus.splice(idx,1); },220);
        });
      } else {
        if(menu.parentNode) menu.parentNode.removeChild(menu); const idx=allMenus.indexOf(menu); if(idx!==-1) allMenus.splice(idx,1);
      }

    });
    state.openMenu=null; state.openMenuColor=null;
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

  function calcPriceFor(def, curNum) {
    
    let base;
    try {
      base = Number(def.basePrice);
    } catch(_) {
      base = NaN;
    }
    if (!Number.isFinite(base)) return Number.POSITIVE_INFINITY;
    const growth = Math.pow(MULTIPLIER, curNum);
    const baseRaw = base * growth;
    const groupFactor = getPriceDiscountFactorGlobal('red');
    const rawProduct = baseRaw * groupFactor;
    const rawPrice = Number.isFinite(rawProduct) ? Math.floor(rawProduct) : Number.POSITIVE_INFINITY;
    
    if (!Number.isFinite(rawPrice)) return Number.POSITIVE_INFINITY;
    return clampSafe(rawPrice);
  }

  function getTotalRps() {
    let sum = 0;
    const tools = window.fjfeClickerNumbers;
    for (const u of UPGRADE_LIST) {
      const lvl = loadUpgradeLevelByIdGlobal(u.id);
      if (lvl > 0) {
        let contribution = lvl * (u.rpsAdd || 0);
        
        
        try {
          const raw = localStorage.getItem(`fjTweakerStoreMultiplier_${u.id}`);
          const stored = parseFloat(raw);
          if (Number.isFinite(stored)) {
            
            
            let factor;
            if (stored <= 0) {
              factor = 1;
            } else if (stored > 10) {
              factor = 1 + (stored / 100);
            } else {
              factor = stored;
            }
            if (Number.isFinite(factor) && factor > 0) contribution = contribution * factor;
          }
        } catch (_) {}
        
        if (tools && typeof tools.quantize === 'function') {
          sum += tools.quantize(contribution);
        } else {
          sum += contribution;
        }
      }
    }
    
    try {
      const bonusPct = parseInt(localStorage.getItem('fjfeStats_prestigeBonusPct')||'0',10) || 0;
      if (Number.isFinite(bonusPct) && bonusPct > 0) {
        sum = sum * (1 + (bonusPct/100));
      }
    } catch(_) {}
    if (tools && typeof tools.quantize === 'function') {
      return tools.quantize(sum);
    }
    return clampSafe(sum);
  }

  function buildRow(id) {
  const def = DEF_BY_ID[id];

    const row = document.createElement('div');
    row.dataset.upgradeId = id;
    Object.assign(row.style, {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: '100%',
      height: '36px',
      boxSizing: 'border-box',
      border: '1px solid #333',
      borderRadius: '0',
      padding: '0',
      userSelect: 'none',
    });
    try { row.setAttribute('unselectable','on'); } catch(_) {}
    try { row.onselectstart = () => false; } catch(_) {}

    const upgrade = document.createElement('div');
    Object.assign(upgrade.style, {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      background: 'transparent',
      border: 'none',
      borderRadius: '0',
      width: 'auto',
      minWidth: '0',
      height: '100%',
      margin: '0',
      padding: '0',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'filter 0.12s, transform 0.08s',
      position: 'relative',
      gap: '0px',
      flex: '1 1 auto',
    });

    const imgWrap = document.createElement('div');
    Object.assign(imgWrap.style, {
      width: '36px',
      height: '36px',
      background: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 36px',
    });

    const img = document.createElement('img');
    img.className = 'fjfe-up-img';
    try { img.draggable = false; } catch(_) {}
  const defaultImgName = (def.name || id).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const imgPath = def && def.img ? def.img : `icons/clicker/production/${defaultImgName}.png`;
    img.src = chrome.runtime.getURL ? chrome.runtime.getURL(imgPath) : imgPath;
    img.onerror = () => {
      const fallback = 'icons/error.png';
      img.src = chrome.runtime.getURL ? chrome.runtime.getURL(fallback) : fallback;
    };
    Object.assign(img.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: '50% 50%',
      display: 'block',
    });
    imgWrap.appendChild(img);
    upgrade.appendChild(imgWrap);

    const textCol = document.createElement('div');
    Object.assign(textCol.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'center',
      minWidth: '0',
      flex: '1 1 auto',
      overflow: 'hidden',
    });

    const name = document.createElement('div');
    name.className = 'fjfe-up-name';
    const computeUnlocked = () => {
      const idx = UPGRADE_LIST.findIndex(u => u.id === id);
      const unlockedCount = getUnlockedCount();
      return idx > -1 && idx < unlockedCount;
    };
    name.textContent = computeUnlocked() ? (def.name || id) : '???';
    Object.assign(name.style, {
      maxWidth: '100%',
      textAlign: 'left',
      fontWeight: '800',
      fontSize: '13px',
      color: '#fff',
      padding: '0',
      margin: '0',
      lineHeight: '1',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
    textCol.appendChild(name);

    const priceWrap = document.createElement('div');
    Object.assign(priceWrap.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: '0px',
      marginTop: '0',
      lineHeight: '1',
      minWidth: '0',
      overflow: 'hidden',
    });

    const priceNum = document.createElement('span');
    priceNum.dataset.role = 'price';

    const numKey = `fjTweakerUpgradeNum_${id}`;
    const loadNum = () => {
      try {
        const r = localStorage.getItem(numKey);
        let p = parseInt(r, 10);
        if (!Number.isFinite(p) || p < 0) p = 0;
        if (id === 'increaseDpi') {
          const legacyRaw = localStorage.getItem('fjTweakerUpgradeNum');
          const legacy = parseInt(legacyRaw, 10);
          if (Number.isFinite(legacy) && legacy > p) {
            localStorage.setItem(numKey, String(legacy));
            try {
              localStorage.removeItem('fjTweakerUpgradeNum');
            } catch (_) {}
            return legacy;
          }
        }
        return p;
      } catch (_) {
        return 0;
      }
    };

    const persistNum = (v) => {
      try {
        localStorage.setItem(numKey, String(v));
      } catch (_) {}
    };

    let curNum = loadNum();
  const calcPrice = () => calcPriceFor(def, curNum);

  priceNum.textContent = computeUnlocked() ? ((window.fjfeClickerNumbers && window.fjfeClickerNumbers.formatAbbrev) ? window.fjfeClickerNumbers.formatAbbrev(calcPrice()) : formatCompact(calcPrice())) : '???';
    Object.assign(priceNum.style, {
      color: '#e33',
      fontWeight: '700',
      fontSize: '12px',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '100%',
    });

    const priceIcon = document.createElement('img');
    priceIcon.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/clicker/thumb_down.png') : 'icons/clicker/thumb_down.png';
    priceIcon.onerror = () => {
      const fb = chrome.runtime.getURL ? chrome.runtime.getURL('icons/error.png') : 'icons/error.png';
      priceIcon.src = fb;
    };
    Object.assign(priceIcon.style, {
      width: '12px',
      height: '12px',
      verticalAlign: 'middle',
      marginRight: '0px',
      filter: 'drop-shadow(0 0 1px #0008)',
      display: 'inline-block',
    });

  
  priceIcon.style.marginRight = '0px';
  priceWrap.appendChild(priceIcon);
  priceWrap.appendChild(priceNum);
    textCol.appendChild(priceWrap);
    upgrade.appendChild(textCol);

    upgrade._isClickableNow = function() {
      if (!computeUnlocked()) return false;
      return canAffordConsideringFormat(getMoney(), calcPrice());
    };

    const levelDiv = document.createElement('div');
    Object.assign(levelDiv.style, {
      marginLeft: 'auto',
      fontWeight: '800',
  color: '#61afff',
      fontSize: '30px',
      lineHeight: '1',
      textAlign: 'right',
      minWidth: '32px',
      userSelect: 'none',
      pointerEvents: 'none',
    });

    const updateNum = () => {
      levelDiv.textContent = String(curNum);
    };
    updateNum();

    function updateUnlockVisual() {
      const unlockedNow = computeUnlocked();
      if (unlockedNow) {
        name.textContent = def.name || id;
    const defaultImgName2 = (def.name || id).toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const imgPath2 = def.img ? def.img : `icons/clicker/production/${defaultImgName2}.png`;
    img.src = chrome.runtime.getURL ? chrome.runtime.getURL(imgPath2) : imgPath2;
    priceNum.textContent = (window.fjfeClickerNumbers && window.fjfeClickerNumbers.formatAbbrev) ? window.fjfeClickerNumbers.formatAbbrev(calcPrice()) : formatCompact(calcPrice());
        const clickable = upgrade._isClickableNow();
        row.style.cursor = clickable ? 'pointer' : 'not-allowed';
        row.style.opacity = clickable ? '1' : '0.6';
      } else {
        name.textContent = '???';
        const unk = 'icons/clicker/production/unknown.png';
        img.src = chrome.runtime.getURL ? chrome.runtime.getURL(unk) : unk;
        priceNum.textContent = '???';
        row.style.cursor = 'not-allowed';
        row.style.opacity = '0.6';
      }
    }

    row._updateUnlockState = updateUnlockVisual;
    row._syncFromStorage = function() {
      try {
        
        curNum = loadNum();
        updateNum();
        updateUnlockVisual();
      } catch (_) {}
    };

    row.onclick = function(e) {
      e.preventDefault();
      if (!computeUnlocked()) { try { if (window.fjfeAudio) window.fjfeAudio.play('deny'); } catch(_) {} return; }
  const unlockedBefore = getUnlockedCount();
  const price = calcPrice();
      const tools = window.fjfeClickerNumbers;
      const isInfiniteCost = !Number.isFinite(price) || (tools && tools.isInfinite && tools.isInfinite(price));
      const effectivePrice = isInfiniteCost ? 0 : price;
      const moneyRaw = getMoney();
  if (!canAffordConsideringFormat(moneyRaw, price)) { try { if (window.fjfeAudio) window.fjfeAudio.play('deny'); } catch(_) {} return; }
      const normalizedMoney = tools && typeof tools.normalizeFunds === 'function' ? tools.normalizeFunds(moneyRaw) : moneyRaw;
      const isInfiniteWallet = tools && tools.isInfinite && tools.isInfinite(normalizedMoney);
      let newMoney;
      if (isInfiniteWallet) {
        
        newMoney = isInfiniteCost ? 0 : normalizedMoney;
      } else {
        const canBuy = normalizedMoney >= effectivePrice;
        if (!canBuy) { try { if (window.fjfeAudio) window.fjfeAudio.play('deny'); } catch(_) {} return; }
        newMoney = normalizedMoney - effectivePrice;
      }
      setMoney(newMoney);
      try {
        const disp = document.getElementById('fjfe-clicker-count-v2');
        if (disp) {
          const tools = window.fjfeClickerNumbers;
          const txt = (tools && tools.formatCounter) ? tools.formatCounter(newMoney) : formatCompact(newMoney);
          disp.textContent = txt;
        }
        
        priceNum.textContent = (window.fjfeClickerNumbers && window.fjfeClickerNumbers.formatAbbrev) ? window.fjfeClickerNumbers.formatAbbrev(calcPrice()) : formatCompact(calcPrice());
        if (window.fjfeRcInfo && typeof window.fjfeRcInfo.show === 'function' && row.matches(':hover')) {
          const imgEl = img;
          const currentCost = priceNum.textContent || '???';
          const currentName = name.textContent || '???';
            const tools2 = window.fjfeClickerNumbers;
            
            let per2 = def && def.rpsAdd ? def.rpsAdd : 0;
            try {
              const raw = localStorage.getItem(`fjTweakerStoreMultiplier_${id}`);
              const stored = parseFloat(raw);
              if (Number.isFinite(stored)) {
                let factor;
                if (stored <= 0) factor = 1;
                else if (stored > 10) factor = 1 + (stored / 100);
                else factor = stored; 
                if (Number.isFinite(factor) && factor > 0) per2 = per2 * factor;
              }
            } catch(_) {}
            const lvl2 = loadUpgradeLevelByIdGlobal(id);
            const total2 = (lvl2 || 0) * (per2 || 0);
          const fmtSmall2 = tools2 && tools2.formatWordsSmallDecimals ? tools2.formatWordsSmallDecimals : (tools2 && tools2.formatWords ? tools2.formatWords : (x=>String(x)));
          const perText2 = fmtSmall2(per2);
          const totalText2 = fmtSmall2(total2);
          const topLine2 = `Each ${def && def.name ? def.name : id} generates ${perText2} thumbs.`;
          const midLine2 = `Generating ${totalText2} thumbs.`;
          const ttLine2 = def && def.tt ? def.tt : '';
          window.fjfeRcInfo.show({ imageSrc: imgEl && imgEl.src ? imgEl.src : '', name: currentName, cost: currentCost, bodyTop: topLine2, bodyMid: midLine2, bodyTT: ttLine2 });
        }
      } catch (_) {}
      curNum++;
      persistNum(curNum);
  priceNum.textContent = formatCompact(calcPrice());
      updateNum();
      try { if (window.fjfeAudio) window.fjfeAudio.play('production'); } catch(_) {}
      try {
        if (typeof window.fjfeClickerV2Recompute === 'function') window.fjfeClickerV2Recompute();
      } catch (_) {}
      try {
        if (window.fjfeRcStore && typeof window.fjfeRcStore.refresh === 'function') {
          window.fjfeRcStore.refresh();
        }
      } catch (_) {}
      const unlockedAfter = getUnlockedCount();
      if (unlockedAfter > unlockedBefore) {
        try {
          if (typeof window.updateOpenMenuUnlockStatesByIds === 'function') {
            const ids = UPGRADE_LIST.map(u => u.id);
            const newly = ids.slice(unlockedBefore, unlockedAfter);
            if (newly.length) window.updateOpenMenuUnlockStatesByIds(newly);
          }
        } catch (_) {}
      }
      try {
        if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors();
      } catch (_) {}
    };

    row.appendChild(upgrade);
    row.appendChild(levelDiv);
    updateUnlockVisual();
    row._isClickableNow = upgrade._isClickableNow;

    
    row.addEventListener('mouseenter', () => {
      try {
        if (!window.fjfeRcInfo) return;
        if (!computeUnlocked()) {
          window.fjfeRcInfo.hide();
          return;
        }
        const imgEl = img; 
        
        priceNum.textContent = (window.fjfeClickerNumbers && window.fjfeClickerNumbers.formatAbbrev) ? window.fjfeClickerNumbers.formatAbbrev(calcPrice()) : formatCompact(calcPrice());
        const currentCost = priceNum.textContent || '???';
        const currentName = name.textContent || '???';
        const tools = window.fjfeClickerNumbers;
        
        let per = def && def.rpsAdd ? def.rpsAdd : 0;
        try {
          const raw = localStorage.getItem(`fjTweakerStoreMultiplier_${id}`);
          const stored = parseFloat(raw);
          if (Number.isFinite(stored)) {
            let factor;
            if (stored <= 0) factor = 1;
            else if (stored > 10) factor = 1 + (stored / 100);
            else factor = stored;
            if (Number.isFinite(factor) && factor > 0) per = per * factor;
          }
        } catch(_) {}
        const lvl = loadUpgradeLevelByIdGlobal(id);
        const total = (lvl || 0) * (per || 0);
        const fmtSmall = tools && tools.formatWordsSmallDecimals ? tools.formatWordsSmallDecimals : (tools && tools.formatWords ? tools.formatWords : (x=>String(x)));
        const perText = fmtSmall(per);
        const totalText = fmtSmall(total);
        const topLine = `Each ${def && def.name ? def.name : id} generates ${perText} thumbs.`;
        const midLine = `Generating ${totalText} thumbs.`;
        const ttLine = def && def.tt ? def.tt : '';
        window.fjfeRcInfo.show({
          imageSrc: imgEl && imgEl.src ? imgEl.src : '',
          name: currentName,
          cost: currentCost,
          bodyTop: topLine,
          bodyMid: midLine,
          bodyTT: ttLine,
        });
      } catch (_) {}
    });
    row.addEventListener('mouseleave', () => {
      try {
        if (window.fjfeRcInfo) window.fjfeRcInfo.hide();
      }
 catch (_) {}
    });
    return row;
  }

  function actuallyOpenMenu() {
    const anchorEl = state.anchorEl;
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const vx = (window.scrollX || window.pageXOffset || 0);
    const vy = (window.scrollY || window.pageYOffset || 0);
    const menu = document.createElement('div');
    Object.assign(menu.style, {
      position: 'absolute',
      left: (rect.left + vx) + 'px',
      top: (rect.bottom + vy) + 'px',
      width: (rect.right - rect.left - 2) + 'px',
      minWidth: (rect.right - rect.left - 2) + 'px',
      height: '246px',
      background: '#181818',
      border: '1.5px solid #333',
      borderRadius: '0 0 10px 10px',
      boxSizing: 'border-box',
      boxShadow: '0 8px 24px #0007',
      zIndex: 2147483642,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      padding: '0',
      color: '#fff',
      pointerEvents: 'auto',
      overflow: 'hidden',
      transform: 'translateY(-12px)',
      opacity: 0,
      transition: 'transform 0.22s ease, opacity 0.18s ease',
    });

    const upgradeList = document.createElement('div');
    Object.assign(upgradeList.style, {
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      overflowX: 'hidden',
      gap: '0px',
      width: '100%',
      padding: '0',
      boxSizing: 'border-box',
      alignItems: 'stretch',
      height: '100%',
    });
    UPGRADE_LIST.forEach(u => {
      const el = buildRow(u.id);
      upgradeList.appendChild(el);
    });
    menu.appendChild(upgradeList);
    document.body.appendChild(menu);

    setTimeout(() => {
      menu.style.transform = 'translateY(0)';
      menu.style.opacity = '1';
      setTimeout(() => {
        menu.style.transition = 'transform 0.22s cubic-bezier(.5,1.7,.5,1), opacity 0.18s cubic-bezier(.5,1.7,.5,1)';
      }, 220);
    }, 10);
    try { if (window.fjfeAudio) window.fjfeAudio.play('menu_open'); } catch(_) {}

  state.openMenu = menu;
  state.openMenuColor = 'red';
  state.allMenus.push(menu);
    try {
      if (typeof window.updateOpenMenuUnlockStates === 'function') window.updateOpenMenuUnlockStates();
    } catch (_) {}

    
    window.updateOpenMenuUnlockStates = function() {
      try {
        if (!state.openMenu) return;
        const nodes = state.openMenu.querySelectorAll('*');
        nodes.forEach(n => {
          if (typeof n._syncFromStorage === 'function') n._syncFromStorage();
          else if (typeof n._updateUnlockState === 'function') n._updateUnlockState();
        });
      } catch (_) {}
    };
    window.updateOpenMenuUnlockStatesByIds = function(ids) {
      try {
        if (!state.openMenu || !Array.isArray(ids)) return;
        ids.forEach(id => {
          const el = state.openMenu.querySelector(`[data-upgrade-id="${id}"]`);
          if (el && typeof el._updateUnlockState === 'function') el._updateUnlockState();
        });
      } catch (_) {}
    };
    window.updateOpenMenuAffordabilityCursors = function() {
      try {
        if (!state.openMenu) return;
        const nodes = state.openMenu.querySelectorAll('*');
        nodes.forEach(n => {
          if (typeof n._isClickableNow === 'function') {
            const clickable = n._isClickableNow();
            n.style.cursor = clickable ? 'pointer' : 'not-allowed';
            try {
              
              if (n.matches && n.matches('[data-upgrade-id]')) {
                n.style.opacity = clickable ? '1' : '0.6';
              }
            } catch(_) {}
          }
        });
      } catch (_) {}
    };
  }

  function toggleMenu() {
    if (state.openMenu && state.openMenuColor === 'red') {
      closeMenu();
      return;
    }
    if (state.openMenu) {
      try { if (window.fjfeAudio && window.fjfeAudio.suppressClose) window.fjfeAudio.suppressClose(300); } catch(_) {}
      closeMenu();
      try { if (window.fjfeRcStats) window.fjfeRcStats.closeMenu(); } catch(_) {}
      try { if (window.fjfeRcSettings) window.fjfeRcSettings.closeMenu(); } catch(_) {}
      setTimeout(() => actuallyOpenMenu(), 0);
      return;
    }
    try { if (window.fjfeAudio && window.fjfeAudio.suppressClose) window.fjfeAudio.suppressClose(300); } catch(_) {}
    try { if (window.fjfeRcStats) window.fjfeRcStats.closeMenu(); } catch(_) {}
    try { if (window.fjfeRcSettings) window.fjfeRcSettings.closeMenu(); } catch(_) {}
    actuallyOpenMenu();
  }

  function init(opts) {
    state.anchorEl = opts && opts.anchorEl ? opts.anchorEl : null;
  }

  function refresh() {
    try {
      
      if (state.openMenu) {
        if (typeof window.updateOpenMenuUnlockStates === 'function') window.updateOpenMenuUnlockStates();
        if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors();
      }
    } catch (_) {}
  }

  window.fjfeRcProd = { init, toggleMenu, closeMenu, updatePosition, getTotalRps, refresh, isOpen: function(){ return !!state.openMenu; } };

  
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition);
})();
