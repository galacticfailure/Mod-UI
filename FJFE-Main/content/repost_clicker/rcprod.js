(function() {
  const MAX_SAFE = Number.MAX_SAFE_INTEGER;
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

  function hasStoreUpgrade(id) {
    try {
      return localStorage.getItem(`fjTweakerStoreUpgrade_${id}`) === '1';
    } catch(_) { return false; }
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

  
  function getMoneyScaledState() {
    try {
      const storage = window.fjfeNumbersStorage;
      if (storage) return storage.readRaw();
    } catch (_) {}
    return { infinite: false, scaled: 0n };
  }
  function priceToScaled(price) {
    try {
      if (typeof price === 'bigint') {
        if (price < 0n) return 0n;
        return price * 10n;
      }
      const num = Number(price);
      if (!Number.isFinite(num) || num <= 0) return 0n;
      return BigInt(Math.floor(num * 10));
    } catch(_) { return 0n; }
  }
  function canAffordPrice(price) {
    try {
      const m = getMoneyScaledState();
      if (m.infinite) return true;
      const priceScaled = priceToScaled(price);
      if (priceScaled <= 0n) return true;
      return m.scaled >= priceScaled;
    } catch(_) { return false; }
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
    try {
      return hasStoreUpgrade('met3') ? 0.99 : 1.0;
    } catch(_) { return 1.0; }
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

  function getProducerMultiplierFactor(id) {
    try {
      const raw = localStorage.getItem(`fjTweakerStoreMultiplier_${id}`);
      const stored = parseFloat(raw);
      let base = 1;
      if (Number.isFinite(stored) && stored > 0) {
        base = stored <= 10 ? stored : (stored / 100);
      }
      const alt = getProducerAltMultiplierFactor(id);
      const meta = hasStoreUpgrade('met2') ? 1.01 : 1;
      const combined = base * (Number.isFinite(alt) && alt > 0 ? alt : 1) * meta;
      return combined > 0 ? combined : 1;
    } catch (_) {
      return 1;
    }
  }

  function getProducerAltMultiplierFactor(id) {
    try {
      const raw = localStorage.getItem(`fjTweakerStoreAltMultiplier_${id}`);
      const stored = parseFloat(raw);
      if (!Number.isFinite(stored) || stored <= 0) return 1;
      if (stored <= 10) return stored;
      return stored / 100;
    } catch (_) {
      return 1;
    }
  }

  
  const MULTIPLIER = 1.15;
  const UPGRADE_LIST = [
    { id: 'script',            basePrice: 15,                          rpsAdd: 0.1,             name: 'Script',             tt: 'A simple script to repost your reposts.' },
    { id: 'groupChat',         basePrice: 100,                         rpsAdd: 1,               name: 'Group Chat',         tt: 'Produces fresh content to steal.' },
    { id: 'workshop',          basePrice: 1100,                        rpsAdd: 8,               name: 'Workshop',           tt: 'Carefully assembles memes from provided parts.' },
    { id: 'studio',            basePrice: 12000,                       rpsAdd: 47,              name: 'Studio',             tt: 'Films high-effort content for you to effortlessly steal.' },
    { id: 'recyclingCenter',   basePrice: 130000,                      rpsAdd: 260,             name: 'Recycling Center',   tt: 'Recycles old content into new content.' },
    { id: 'digsite',           basePrice: 1400000,                     rpsAdd: 1400,            name: 'Digsite',            tt: 'Digs up ancient memes from a better time.' },
    { id: 'officeBuilding',    basePrice: 20000000,                    rpsAdd: 7800,            name: 'Office Building',    tt: 'Analyzes market trends to produce relatable memes.' },
    { id: 'contentFarm',       basePrice: 300000000,                   rpsAdd: 44000,           name: 'Content Farm',       tt: 'Grows content using industrial farming techniques.' },
    { id: 'botnet',            basePrice: 5100000000,                  rpsAdd: 260000,          name: 'Botnet',             tt: 'Reposts at blinding speeds, changing IP every time.' },
    { id: 'spaceport',         basePrice: 75000000000,                 rpsAdd: 1600000,         name: 'Spaceport',          tt: 'Imports content from alien worlds.' },
    { id: 'ritualCircle',      basePrice: 1000000000000,               rpsAdd: 10000000,        name: 'Ritual Circle',      tt: 'Uses unholy rituals to summon extradimensional content.' },
    { id: 'memecatcher',       basePrice: 14000000000000,              rpsAdd: 65000000,        name: 'Memecatcher',        tt: 'Harvests memes from dreams.' },
    { id: 'quantumHarmonizer', basePrice: 170000000000000,             rpsAdd: 430000000,       name: 'Quantum Harmonizer', tt: 'Finds content that may not exist and forces it to.' },
    { id: 'timeForge',         basePrice: 2100000000000000,            rpsAdd: 2900000000,      name: 'Time Forge',         tt: 'Forges memes from the fabric of time itself.' },
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

  function toBigIntPrice(v) {
    try {
      if (typeof v === 'bigint') return v < 0n ? 0n : v;
      const num = Number(v);
      if (!Number.isFinite(num) || num <= 0) return 0n;
      return BigInt(Math.floor(num));
    } catch(_) { return 0n; }
  }

  function calcPriceFor(def, curNum) {
    
    
    
    const baseBI = toBigIntPrice(def && def.basePrice);
    if (baseBI <= 0n) return 0n;
    const S = 1000n; 
    
    let growthScaled = S;
    for (let i = 0; i < Math.max(0, Math.floor(curNum||0)); i++) {
      
      growthScaled = (growthScaled * 115n) / 100n;
      if (growthScaled <= 0n) { growthScaled = S; }
    }
    let gf = 1.0;
    try { gf = Number(getPriceDiscountFactorGlobal('red')) || 1.0; } catch(_) {}
    const gfScaled = BigInt(Math.floor(Math.max(0, gf) * Number(S)));
    
    let priceBI = (baseBI * growthScaled);
    priceBI = (priceBI * gfScaled) / (S * S);
    if (priceBI < 0n) priceBI = 0n;
    return priceBI;
  }

  function calcPriceForQty(def, curNum, qty) {
    try {
      const count = Math.max(1, Math.floor(qty || 1));
      const baseBI = toBigIntPrice(def && def.basePrice);
      if (baseBI <= 0n) return 0n;
      const S = 1000n;
      let growthScaled = S;
      for (let i = 0; i < Math.max(0, Math.floor(curNum || 0)); i++) {
        growthScaled = (growthScaled * 115n) / 100n;
        if (growthScaled <= 0n) { growthScaled = S; }
      }
      let gf = 1.0;
      try { gf = Number(getPriceDiscountFactorGlobal('red')) || 1.0; } catch(_) {}
      const gfScaled = BigInt(Math.floor(Math.max(0, gf) * Number(S)));
      let total = 0n;
      for (let i = 0; i < count; i++) {
        let priceBI = (baseBI * growthScaled);
        priceBI = (priceBI * gfScaled) / (S * S);
        if (priceBI < 0n) priceBI = 0n;
        total += priceBI;
        growthScaled = (growthScaled * 115n) / 100n;
        if (growthScaled <= 0n) { growthScaled = S; }
      }
      return total;
    } catch(_) { return 0n; }
  }

  const BUY_QTY_KEY_PREFIX = 'fjfeProdBuyQty_';
  function loadBuyQty(id) {
    try {
      const raw = localStorage.getItem(BUY_QTY_KEY_PREFIX + id);
      const v = parseInt(raw, 10);
      if (v === 10 || v === 100 || v === 1) return v;
      return 1;
    } catch(_) { return 1; }
  }
  function saveBuyQty(id, qty) {
    try {
      localStorage.setItem(BUY_QTY_KEY_PREFIX + id, String(qty));
    } catch(_) {}
  }

  function getTotalRps() {
    let sum = 0;
    const tools = window.fjfeClickerNumbers;
    for (const u of UPGRADE_LIST) {
      const lvl = loadUpgradeLevelByIdGlobal(u.id);
      if (lvl > 0) {
        let contribution = lvl * (u.rpsAdd || 0);
        
        const factor = getProducerMultiplierFactor(u.id);
        if (Number.isFinite(factor) && factor > 0) contribution = contribution * factor;
        
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
        sum = sum * (1 + (bonusPct / 100));
      }
    } catch(_) {}
    try {
      const metaPct = (hasStoreUpgrade('met1') ? 10 : 0) + (hasStoreUpgrade('met2') ? 5 : 0);
      if (Number.isFinite(metaPct) && metaPct > 0) {
        sum = sum * (1 + (metaPct / 100));
      }
    } catch(_) {}
    try {
      const getMemetypePct = (idx)=>{
        if (idx <= 4) return 1;
        if (idx <= 29) return 2;
        if (idx <= 35) return 3;
        if (idx <= 71) return 4;
        return 5;
      };
      let memetypeMult = 1;
      for (let i = 1; i <= 142; i++) {
        const key = `fjTweakerStoreUpgrade_mbt${i}`;
        if (localStorage.getItem(key) === '1') {
          const pct = getMemetypePct(i);
          if (pct > 0) memetypeMult *= (1 + (pct / 100));
        }
      }
      const extraSets = [
        { prefix: 'lct', count: 6, pct: 2 },
        { prefix: 'gat', count: 17, pct: 3 },
        { prefix: 'fbt', count: 9, pct: 3 },
        { prefix: 'tgt', count: 5, pct: 4 },
        { prefix: 'vgt', count: 7, pct: 4 },
        { prefix: 'fgt', count: 7, pct: 4 },
        { prefix: 'fjt', count: 9, pct: 5 },
        { prefix: 'spt', count: 2, pct: 10 },
      ];
      for (const set of extraSets) {
        for (let i = 1; i <= set.count; i++) {
          const key = `fjTweakerStoreUpgrade_${set.prefix}${i}`;
          if (localStorage.getItem(key) === '1') {
            memetypeMult *= (1 + (set.pct / 100));
          }
        }
      }
      if (Number.isFinite(memetypeMult) && memetypeMult > 1) {
        sum = sum * memetypeMult;
      }
    } catch(_) {}
    try {
      const readTimedMult = (key)=>{
        const untilRaw = localStorage.getItem(key + 'Until');
        const until = parseInt(untilRaw || '0', 10);
        if (Number.isFinite(until) && until > 0 && Date.now() > until) {
          localStorage.removeItem(key);
          localStorage.removeItem(key + 'Until');
          return 1;
        }
        const raw = localStorage.getItem(key);
        const v = parseFloat(raw);
        return (Number.isFinite(v) && v > 0) ? v : 1;
      };
      const mult = readTimedMult('fjfeSlotRpsMult');
      const pctMult = readTimedMult('fjfeSlotRpsPctMult');
      sum = sum * mult * pctMult;
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
      position: 'relative',
      overflow: 'visible',
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
  const formatBigAbbrev = (bi) => {
    try {
      if (typeof bi !== 'bigint') return (window.fjfeClickerNumbers && window.fjfeClickerNumbers.formatAbbrev)
        ? window.fjfeClickerNumbers.formatAbbrev(bi)
        : formatCompact(Number(bi||0));
      const neg = bi < 0n ? '-' : '';
      let abs = bi < 0n ? -bi : bi;
      if (abs < 1000n) return neg + abs.toString();
      const units = [
        { p:3n, a:'K' },{ p:6n, a:'M' },{ p:9n, a:'B' },{ p:12n, a:'T' },
        { p:15n, a:'Qa' },{ p:18n, a:'Qi' },{ p:21n, a:'Sx' },{ p:24n, a:'Sp' },
        { p:27n, a:'Oc' },{ p:30n, a:'No' },{ p:33n, a:'De' },{ p:36n, a:'Ud' },
        { p:39n, a:'Dd' },{ p:42n, a:'Td' },{ p:45n, a:'Qd' },{ p:48n, a:'Qn' },
        { p:51n, a:'Sxd' },{ p:54n, a:'Spd' },{ p:57n, a:'Ocd' },{ p:60n, a:'Nod' },
        { p:63n, a:'Vg' },{ p:66n, a:'Uvg' },{ p:69n, a:'Dvg' },{ p:72n, a:'Trvg' },
        { p:75n, a:'Qavg' },{ p:78n, a:'Qivg' },{ p:81n, a:'Sxvg' },{ p:84n, a:'Spvg' },
        { p:87n, a:'Ocvg' },{ p:90n, a:'Novg' },{ p:93n, a:'Tg' },{ p:96n, a:'Utg' },
        { p:99n, a:'Dtg' },{ p:102n, a:'Ttrg' },{ p:105n, a:'Qtrg' },{ p:108n, a:'Qitg' },
        { p:111n, a:'Sxtg' },{ p:114n, a:'Sptg' },{ p:117n, a:'Octg' },{ p:120n, a:'Notg' },
        { p:123n, a:'Qg' },{ p:126n, a:'Uqg' },{ p:129n, a:'Dqg' },{ p:132n, a:'Tqg' },
        { p:135n, a:'Qaqg' },{ p:138n, a:'Qiqg' },{ p:141n, a:'Sxqg' },{ p:144n, a:'Spqg' },
        { p:147n, a:'Ocqg' },{ p:150n, a:'Noqg' }
      ];
      const s = abs.toString();
      const digits = BigInt(s.length);
      let unit = units[0];
      for (let i = units.length - 1; i >= 0; i--) { if (digits > units[i].p) { unit = units[i]; break; } }
      let div = 1n; for (let i=0n;i<unit.p;i++) div *= 10n;
      const scaledTimesThousand = (abs * 1000n) / div;
      const intPart = scaledTimesThousand / 1000n;
      let frac = (scaledTimesThousand % 1000n).toString().padStart(3,'0');
      frac = frac.replace(/0+$/,'');
      const txt = frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
      return neg + txt + unit.a;
    } catch(_) { try { return bi.toString(); } catch(__) { return '0'; } }
  };
  const formatPriceAny = (val) => {
    if (typeof val === 'bigint') return formatBigAbbrev(val);
    const num = Number(val);
    if (!Number.isFinite(num)) return 'Infinity';
    const fmt = (window.fjfeClickerNumbers && window.fjfeClickerNumbers.formatAbbrev) ? window.fjfeClickerNumbers.formatAbbrev : formatCompact;
    return fmt(num);
  };
  let selectedQty = loadBuyQty(id);
  const calcPrice = () => calcPriceForQty(def, curNum, selectedQty);

  priceNum.textContent = computeUnlocked() ? formatPriceAny(calcPrice()) : '???';
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

    const qtyBtn = document.createElement('div');
    Object.assign(qtyBtn.style, {
      width: '28px',
      minWidth: '28px',
      height: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '9px',
      fontWeight: '800',
      color: '#fff',
      background: '#222',
      border: '1px solid #444',
      borderRadius: '3px',
      marginRight: '4px',
      cursor: 'pointer',
      userSelect: 'none',
      lineHeight: '1',
      padding: '0',
      boxSizing: 'border-box',
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
  priceWrap.appendChild(qtyBtn);
  priceWrap.appendChild(priceIcon);
  priceWrap.appendChild(priceNum);
    textCol.appendChild(priceWrap);
    upgrade.appendChild(textCol);

    upgrade._isClickableNow = function() {
      if (!computeUnlocked()) return false;
      return canAffordPrice(calcPrice());
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
  priceNum.textContent = formatPriceAny(calcPrice());
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
        selectedQty = loadBuyQty(id);
        updateQtyButtons();
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
    const isInfiniteCost = (typeof price !== 'bigint') && (!Number.isFinite(price) || (tools && tools.isInfinite && tools.isInfinite(price)));
    const effectivePrice = price;
      if (!canAffordPrice(price)) { try { if (window.fjfeAudio) window.fjfeAudio.play('deny'); } catch(_) {} return; }
      
      try {
        const storage = window.fjfeNumbersStorage;
        const money = getMoneyScaledState();
        const priceScaled = priceToScaled(effectivePrice);
        if (!money.infinite && storage && typeof storage.writeRaw === 'function') {
          let next = money.scaled - (priceScaled > 0n ? priceScaled : 0n);
          if (next < 0n) next = 0n;
          storage.writeRaw({ infinite:false, scaled: next });
        }
      } catch(_) {}
      try {
        const disp = document.getElementById('fjfe-clicker-count-v2');
        if (disp) {
          const tools = window.fjfeClickerNumbers;
          const storage = window.fjfeNumbersStorage;
          const st = storage ? storage.readRaw() : { infinite:false, scaled:0n };
          const newMoneyDisplay = storage ? storage.toDisplayNumber(st) : getMoney();
          const txt = (tools && tools.formatCounter) ? tools.formatCounter(newMoneyDisplay) : formatCompact(newMoneyDisplay);
          disp.textContent = txt;
        }
        priceNum.textContent = formatPriceAny(calcPrice());
        if (window.fjfeRcInfo && typeof window.fjfeRcInfo.show === 'function' && row.matches(':hover')) {
          const imgEl = img;
          const currentCost = priceNum.textContent || '???';
          const currentName = name.textContent || '???';
            const tools2 = window.fjfeClickerNumbers;
            
            let per2 = def && def.rpsAdd ? def.rpsAdd : 0;
            const factor2 = getProducerMultiplierFactor(id);
            if (Number.isFinite(factor2) && factor2 > 0) per2 = per2 * factor2;
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
    curNum += Math.max(1, Math.floor(selectedQty || 1));
      persistNum(curNum);
  priceNum.textContent = formatPriceAny(calcPrice());
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

    const setSelectedQty = (qty) => {
      selectedQty = qty;
      saveBuyQty(id, qty);
      updateQtyButtons();
      try {
        priceNum.textContent = formatPriceAny(calcPrice());
        const clickable = upgrade._isClickableNow();
        row.style.cursor = clickable ? 'pointer' : 'not-allowed';
        row.style.opacity = clickable ? '1' : '0.6';
      } catch(_) {}
    };
    const updateQtyButtons = () => {
      qtyBtn.textContent = `x${selectedQty}`;
      qtyBtn.style.background = '#222';
    };
    updateQtyButtons();

    const cycleQty = () => {
      const next = selectedQty === 1 ? 10 : (selectedQty === 10 ? 100 : 1);
      setSelectedQty(next);
    };
    qtyBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      cycleQty();
    });
    qtyBtn.addEventListener('mousedown', (ev) => ev.preventDefault());

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
        
  priceNum.textContent = formatPriceAny(calcPrice());
        const currentCost = priceNum.textContent || '???';
        const currentName = name.textContent || '???';
        const tools = window.fjfeClickerNumbers;
        
        let per = def && def.rpsAdd ? def.rpsAdd : 0;
        const factor = getProducerMultiplierFactor(id);
        if (Number.isFinite(factor) && factor > 0) per = per * factor;
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
    upgradeList.classList.add('fjfe-clicker-scroll');
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
        try {
          const nodes = state.openMenu.querySelectorAll('*');
          nodes.forEach(n => {
            if (typeof n._syncFromStorage === 'function') n._syncFromStorage();
          });
        } catch (_) {}
        if (typeof window.updateOpenMenuUnlockStates === 'function') window.updateOpenMenuUnlockStates();
        if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors();
      }
    } catch (_) {}
  }

  window.fjfeRcProd = { init, toggleMenu, closeMenu, updatePosition, getTotalRps, refresh, isOpen: function(){ return !!state.openMenu; } };

  
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition);
})();
