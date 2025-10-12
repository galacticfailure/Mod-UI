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
  if (!Number.isFinite(n)) return 'Infinite';
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
      if (tools.isInfinite && tools.isInfinite(price)) return true;
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
      const raw = localStorage.getItem('fjTweakerClickerCount');
      const p = parseFloat(raw);
      return Number.isFinite(p) ? p : 0;
    } catch (_) {
      return 0;
    }
  }

  function setMoney(v) {
    try {
      const num = Number(v);
      const tools = window.fjfeClickerNumbers;
      if (!Number.isFinite(num) || (tools && tools.isInfinite && tools.isInfinite(num))) {
        localStorage.setItem('fjTweakerClickerCount', 'Infinity');
        return;
      }
      const bounded = Math.min(MAX_SAFE, Math.max(0, num || 0));
      localStorage.setItem('fjTweakerClickerCount', String(bounded));
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
    { id: 'contentManager', basePrice: 15,                         rpsAdd: 0.1,             name: 'Content Manager', tt: 'An in-house reposting menu, now automated.' },
    { id: 'groupChat',      basePrice: 100,                        rpsAdd: 1,               name: 'Group Chat',      tt: 'A group chat from which to ' },
    { id: 'memeFolder',     basePrice: 1100,                       rpsAdd: 8,               name: 'Meme Folder',     tt: 'Placeholder tooltip for Meme Folder.' },
    { id: 'scheduledPost',  basePrice: 12000,                      rpsAdd: 47,              name: 'Scheduled Post',  tt: 'Placeholder tooltip for Scheduled Post.' },
    { id: 'extraMonitor',   basePrice: 130000,                     rpsAdd: 260,             name: 'Extra Monitor',   tt: 'Placeholder tooltip for Extra Monitor.' },
    { id: 'sponsoredMemes', basePrice: 1400000,                    rpsAdd: 1400,            name: 'Sponsored Memes', tt: 'Placeholder tooltip for Sponsored Memes.' },
    { id: 'intern',         basePrice: 20000000,                   rpsAdd: 7800,            name: 'Intern',          tt: 'Placeholder tooltip for Intern.' },
    { id: 'serverFarm',     basePrice: 300000000,                  rpsAdd: 44000,           name: 'Server Farm',     tt: 'Placeholder tooltip for Server Farm.' },
    { id: 'botnet',         basePrice: 5100000000,                 rpsAdd: 260000,          name: 'Botnet',          tt: '' },
    { id: 'funnyjunk2',     basePrice: 75000000000,                rpsAdd: 1600000,         name: 'FunnyJunk 2',     tt: 'A perfect duplicate of FunnyJunk to collect memes from.' },
    { id: 'temp1',          basePrice: 1000000000000,              rpsAdd: 10000000,        name: 'Temp 1',          tt: 'Placeholder tooltip for Temp 1.' },
    { id: 'temp2',          basePrice: 14000000000000,             rpsAdd: 65000000,        name: 'Temp 2',          tt: 'Placeholder tooltip for Temp 2.' },
    { id: 'temp3',          basePrice: 170000000000000,            rpsAdd: 430000000,       name: 'Temp 3',          tt: 'Placeholder tooltip for Temp 3.' },
    { id: 'temp4',          basePrice: 2100000000000000,           rpsAdd: 2900000000,      name: 'Temp 4',          tt: 'Placeholder tooltip for Temp 4.' },
    { id: 'temp5',          basePrice: 26000000000000000,          rpsAdd: 21000000000,     name: 'Temp 5',          tt: 'Placeholder tooltip for Temp 5.' },
    { id: 'temp6',          basePrice: 310000000000000000,         rpsAdd: 150000000000,    name: 'Temp 6',          tt: 'Placeholder tooltip for Temp 6.' },
    { id: 'agiShitposter',  basePrice: 71000000000000000000,       rpsAdd: 1100000000000,   name: 'AGI Shitposter',  tt: 'True artificial intelligence, purpose-built for stealing memes.' },
    { id: 'temp8',          basePrice: 1200000000000000000000,     rpsAdd: 8300000000000,   name: 'Temp 8',          tt: 'Placeholder tooltip for Temp 8.' },
    { id: 'temp9',          basePrice: 190000000000000000000000,   rpsAdd: 64000000000000,  name: 'Temp 9',          tt: 'Placeholder tooltip for Temp 9.' },
    { id: 'temp10',         basePrice: 54000000000000000000000000, rpsAdd: 510000000000000, name: 'Temp 10',         tt: 'Placeholder tooltip for Temp 10.' }
  ];
  const DEF_BY_ID = Object.fromEntries(UPGRADE_LIST.map(u => [u.id, u]));
  function getUnlockedCount() {
    const total = UPGRADE_LIST.length;
    let unlocked = 2;
    for (let i = 0; i < UPGRADE_LIST.length; i++) {
      if (i >= unlocked) break;
      const id = UPGRADE_LIST[i].id;
      const lvl = loadUpgradeLevelByIdGlobal(id);
      if (lvl >= 10) unlocked = Math.min(total, unlocked + 1);
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
    const baseRaw = def.basePrice * Math.pow(MULTIPLIER, curNum);
    const groupFactor = getPriceDiscountFactorGlobal('red');
    const rawProduct = baseRaw * groupFactor;
    const rawPrice = Number.isFinite(rawProduct) ? Math.floor(rawProduct) : Number.POSITIVE_INFINITY;
    const tools = window.fjfeClickerNumbers;
    if (tools && typeof tools.quantize === 'function') {
      if (tools.isInfinite && tools.isInfinite(rawPrice)) return Number.POSITIVE_INFINITY;
      const quantized = tools.quantize(rawPrice);
      return Math.max(0, quantized);
    }
    return clampSafe(rawPrice);
  }

  function getTotalRps() {
    let sum = 0;
    const tools = window.fjfeClickerNumbers;
    for (const u of UPGRADE_LIST) {
      const lvl = loadUpgradeLevelByIdGlobal(u.id);
      if (lvl > 0) {
        const contribution = lvl * (u.rpsAdd || 0);
        if (tools && typeof tools.quantize === 'function') {
          sum += tools.quantize(contribution);
        } else {
          sum += contribution;
        }
      }
    }
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
    });

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
  const defaultImgName = (def.name || id).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const imgPath = def && def.img ? def.img : `icons/${defaultImgName}.png`;
    img.src = chrome.runtime.getURL ? chrome.runtime.getURL(imgPath) : imgPath;
    img.onerror = () => {
      const fallback = 'icons/click.png';
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

  priceNum.textContent = computeUnlocked() ? formatCompact(calcPrice()) : '???';
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
    priceIcon.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/thumb_down.png') : 'icons/thumb_down.png';
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
  color: '#D2B48C',
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
        const imgPath2 = def.img ? def.img : `icons/${defaultImgName2}.png`;
        img.src = chrome.runtime.getURL ? chrome.runtime.getURL(imgPath2) : imgPath2;
  priceNum.textContent = formatCompact(calcPrice());
        const clickable = upgrade._isClickableNow();
        row.style.cursor = clickable ? 'pointer' : 'not-allowed';
        row.style.opacity = '1';
      } else {
        name.textContent = '???';
        img.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/hidden.png') : 'icons/hidden.png';
        priceNum.textContent = '???';
        row.style.cursor = 'not-allowed';
        row.style.opacity = '0.7';
      }
    }

    row._updateUnlockState = updateUnlockVisual;

    row.onclick = function(e) {
      e.preventDefault();
      if (!computeUnlocked()) return;
  const unlockedBefore = getUnlockedCount();
      const price = calcPrice();
      const tools = window.fjfeClickerNumbers;
      const isInfiniteCost = !Number.isFinite(price) || (tools && tools.isInfinite && tools.isInfinite(price));
      const effectivePrice = isInfiniteCost ? 0 : price;
      const moneyRaw = getMoney();
      if (!canAffordConsideringFormat(moneyRaw, price)) return;
      const normalizedMoney = tools && typeof tools.normalizeFunds === 'function' ? tools.normalizeFunds(moneyRaw) : moneyRaw;
      const isInfiniteWallet = tools && tools.isInfinite && tools.isInfinite(normalizedMoney);
      let newMoney;
      if (isInfiniteWallet) {
        newMoney = normalizedMoney;
        if (isInfiniteCost) {
          newMoney = 0;
        }
      } else {
        newMoney = normalizedMoney >= effectivePrice ? (normalizedMoney - effectivePrice) : 0;
      }
      setMoney(newMoney);
      try {
        const disp = document.getElementById('fjfe-clicker-count-v2');
        if (disp) disp.textContent = formatCompact(newMoney);
      } catch (_) {}
      curNum++;
      persistNum(curNum);
  priceNum.textContent = formatCompact(calcPrice());
      updateNum();
      try {
        if (typeof window.fjfeClickerV2Recompute === 'function') window.fjfeClickerV2Recompute();
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
        const currentCost = priceNum.textContent || '???';
        const currentName = name.textContent || '???';
  const descText = def && def.tt ? def.tt : '???';
        window.fjfeRcInfo.show({
          imageSrc: imgEl && imgEl.src ? imgEl.src : '',
          name: currentName,
          cost: currentCost,
          description: descText,
        });
      } catch (_) {}
    });
    row.addEventListener('mouseleave', () => {
      try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch (_) {}
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
        nodes.forEach(n => { if (typeof n._updateUnlockState === 'function') n._updateUnlockState(); });
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
      closeMenu();
      setTimeout(() => actuallyOpenMenu(), 0);
      return;
    }
    actuallyOpenMenu();
  }

  function init(opts) {
    state.anchorEl = opts && opts.anchorEl ? opts.anchorEl : null;
  }

  window.fjfeRcProd = { init, toggleMenu, closeMenu, updatePosition, getTotalRps };

  
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition);
})();
