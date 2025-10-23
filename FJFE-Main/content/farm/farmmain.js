(() => {
  const MODULE_KEY = 'farm';

  
  const log = (..._args) => {  };

  let overlayEl = null;
  let panelEl = null;
  let repositionTimer = null;
  let initialized = false;
  let currentEnabled = false;
  let asideObserver = null;
  let tileStripEl = null;
  let topBarEl = null;
  let purchaseBtnEl = null;
  let menuHostEl = null;
  
  
  const resolveAssetUrl = (p) => (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p;
  
  
  let coins = 100;
  
  let tileTypes = Array(8).fill('dirt'); 
  let plantPositions = {}; 
  let objectPositions = {}; 
  let expansions = 0; 
  
  let inventorySlots = null; 
  
  let cookSlots = {};
  
  
  let cookUnlocks = { mb: false, st: false, ov: false };
  
  let seenItems = {};
  
  let craftedEntries = {};
  
  let toolUnlocks = {};
  
  
  const OBJECT_SIZES = {
    fountain: { width: 3, height: 3 },
    tool_shed: { width: 3, height: 3 },
    well: { width: 2, height: 2 },
    small_pond: { width: 3, height: 3 },
    arch: { width: 2, height: 2 },
    gazebo: { width: 3, height: 3 },
    
  };
  
  const getObjectSize = (objectName) => {
    return OBJECT_SIZES[objectName] || { width: 1, height: 1 };
  };

  const coinsApi = {
    get(){ return coins; },
    set(v){
      const nv = Math.max(0, Math.floor(Number(v)||0));
      if (nv === coins) return coins;
      coins = nv;
      saveFarmData(); 
      try {
        window.dispatchEvent(new CustomEvent('fjFarmCoinsChanged', { detail: { coins } }));
      } catch(_) {}
      return coins;
    },
    add(delta){ return this.set(coins + (Math.floor(Number(delta)||0))); }
  };

  
  const saveFarmData = () => {
    try {
      const farmData = {
        coins,
        tileTypes,
        plantPositions,
        objectPositions,
        expansions,
        inventorySlots,
        cookSlots,
        cookUnlocks,
        seenItems,
        craftedEntries,
        toolUnlocks,
        version: 1
      };
      localStorage.setItem('fjFarmData', JSON.stringify(farmData));
      console.log('Saved farm data:', farmData);
    } catch(e) {
      console.warn('Failed to save farm data:', e);
    }
  };

  const loadFarmData = () => {
    try {
      const stored = localStorage.getItem('fjFarmData');
      if (!stored) {
        console.log('No saved farm data found');
        return;
      }
      
      const farmData = JSON.parse(stored);
      if (!farmData || farmData.version !== 1) {
        console.warn('Invalid or outdated farm data');
        return;
      }
      
      console.log('Loading farm data:', farmData);
      
      
      if (typeof farmData.coins === 'number' && farmData.coins >= 0) {
        coins = farmData.coins;
      }
      
      
      if (Array.isArray(farmData.tileTypes) && farmData.tileTypes.length >= 8) {
        tileTypes = farmData.tileTypes;
        console.log(`Loaded ${tileTypes.length} tiles:`, tileTypes);
      }
      
      
      if (farmData.plantPositions && typeof farmData.plantPositions === 'object') {
        plantPositions = farmData.plantPositions;
        console.log('Loaded plants:', plantPositions);
      }
      
      
      if (farmData.objectPositions && typeof farmData.objectPositions === 'object') {
        objectPositions = farmData.objectPositions;
        console.log('Loaded objects:', objectPositions);
      }
      
      if (farmData.cookUnlocks && typeof farmData.cookUnlocks === 'object') {
        cookUnlocks = { mb: false, st: false, ov: false, ...farmData.cookUnlocks };
      }
      
      if (farmData.seenItems && typeof farmData.seenItems === 'object') {
        seenItems = { ...farmData.seenItems };
      }
      if (farmData.craftedEntries && typeof farmData.craftedEntries === 'object') {
        craftedEntries = { ...farmData.craftedEntries };
      }
      
      if (farmData.toolUnlocks && typeof farmData.toolUnlocks === 'object') {
        toolUnlocks = { ...farmData.toolUnlocks };
      }
      
      
      if (typeof farmData.expansions === 'number' && farmData.expansions >= 0) {
        expansions = farmData.expansions;
        console.log(`Loaded ${expansions} expansions`);
      }
      
      if (Array.isArray(farmData.inventorySlots)) {
        inventorySlots = farmData.inventorySlots;
        console.log(`Loaded inventory with ${inventorySlots.length} slots`);
      }
      
      if (farmData.cookSlots && typeof farmData.cookSlots === 'object') {
        cookSlots = farmData.cookSlots;
        console.log(`Loaded ${Object.keys(cookSlots).length} cooking slots`);
      }
      
      try { window.dispatchEvent(new CustomEvent('fjFarmDataLoaded', { detail: farmData })); } catch(_) {}
      
    } catch(e) {
      console.warn('Failed to load farm data:', e);
    }
  };

  
  const farmStateApi = {
    getTileType: (index) => tileTypes[index] || 'dirt',
    setTileType: (index, type) => {
      if (index >= 0 && index < tileTypes.length) {
        tileTypes[index] = type;
        saveFarmData();
        console.log(`Saved tile ${index} as ${type}`);
      }
    },
    getPlant: (index) => plantPositions[index] || null,
    setPlant: (index, plantData) => {
      if (plantData) {
        plantPositions[index] = plantData;
        console.log(`Saved plant ${plantData.seedName} at tile ${index}`);
      } else {
        delete plantPositions[index];
        console.log(`Removed plant from tile ${index}`);
      }
      saveFarmData();
    },
    getObject: (index) => objectPositions[index] || null,
    setObject: (index, objectData) => {
      if (objectData) {
        objectPositions[index] = objectData;
        console.log(`Saved object ${objectData.objectName} at tile ${index}`);
      } else {
        delete objectPositions[index];
        console.log(`Removed object from tile ${index}`);
      }
      saveFarmData();
    },
    getAllTileTypes: () => [...tileTypes],
    getAllPlants: () => ({...plantPositions}),
    getAllObjects: () => ({...objectPositions}),
    
    getInventory: () => inventorySlots,
    setInventory: (slots) => {
      try {
        if (Array.isArray(slots)) {
          inventorySlots = slots;
          saveFarmData();
          console.log(`Saved inventory with ${slots.length} slots`);
        }
      } catch (e) {
        console.warn('Failed to set inventory:', e);
      }
    },
    
    getCookSlots: () => ({ ...cookSlots }),
    setCookSlots: (map) => {
      try {
        if (map && typeof map === 'object') {
          cookSlots = { ...map };
          saveFarmData();
          console.log(`Saved ${Object.keys(cookSlots).length} cooking slots`);
        }
      } catch (e) {
        console.warn('Failed to set cooking slots:', e);
      }
    },
    
    getCookUnlocks: () => ({ ...cookUnlocks }),
    isCookSectionUnlocked: (key) => Boolean(cookUnlocks[String(key||'').toLowerCase()]),
    unlockCookSection: (key) => {
      try {
        const k = String(key||'').toLowerCase();
        if (!k) return false;
        if (!cookUnlocks[k]) {
          cookUnlocks[k] = true;
          saveFarmData();
        }
        return true;
      } catch(e) { console.warn('Failed to unlock cooking section:', e); return false; }
    },
    
    hasSeenItem: (name) => {
      const k = String(name||'').trim().toLowerCase().replace(/\s+/g,'_');
      return !!seenItems[k];
    },
    markSeenItem: (name) => {
      try {
        const k = String(name||'').trim().toLowerCase().replace(/\s+/g,'_');
        if (!k) return false;
        if (!seenItems[k]) { seenItems[k] = 1; saveFarmData(); }
        return true;
      } catch(e) { console.warn('Failed to mark seen item:', e); return false; }
    },
    getSeenItems: () => Object.keys(seenItems),
    hasCraftedEntry: (name) => {
      const k = String(name||'').trim().toLowerCase().replace(/\s+/g,'_');
      return !!craftedEntries[k];
    },
    markCraftedEntry: (name) => {
      try {
        const k = String(name||'').trim().toLowerCase().replace(/\s+/g,'_');
        if (!k) return false;
        if (!craftedEntries[k]) { craftedEntries[k] = 1; saveFarmData(); }
        return true;
      } catch(e) { console.warn('Failed to mark crafted entry:', e); return false; }
    }
    ,
    
    isToolUnlocked: (name) => {
      const k = String(name||'').trim().toLowerCase();
      return !!toolUnlocks[k];
    },
    unlockTool: (name) => {
      try {
        const k = String(name||'').trim().toLowerCase();
        if (!k) return false;
        if (!toolUnlocks[k]) { toolUnlocks[k] = true; saveFarmData(); }
        return true;
      } catch(e) { console.warn('Failed to unlock tool:', e); return false; }
    }
  };

  const qs = (sel) => document.querySelector(sel);

  const getUnionRect = () => {
    const a = qs('#tUploads');
    const b = qs('#nUploads');
    if (!a && !b) return null;
    const rects = [a, b].filter(Boolean).map(el => el.getBoundingClientRect());
    if (rects.length === 0) return null;
    const scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const r of rects) {
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }
    return {
      left: Math.max(0, Math.floor(left + scrollX)),
      top: Math.max(0, Math.floor(top + scrollY)),
      width: Math.max(0, Math.ceil(right - left)),
      height: Math.max(0, Math.ceil(bottom - top)),
      firstTop: Math.max(0, Math.floor(top + scrollY)),
      lastBottom: Math.max(0, Math.ceil(bottom + scrollY - 0)),
    };
  };

  const findCommonContainer = () => {
    const a = qs('#tUploads');
    const b = qs('#nUploads');
    if (!a || !b) return document.getElementById('mz') || a?.closest('#mz') || b?.closest('#mz') || null;
    
    const ancestors = new Set();
    let p = a;
    while (p) { ancestors.add(p); p = p.parentElement; }
    p = b;
    while (p) { if (ancestors.has(p)) return p; p = p.parentElement; }
    return document.getElementById('mz');
  };

  const computeBackgroundColor = (el) => {
    let node = el;
    while (node) {
      try {
        const cs = window.getComputedStyle(node);
        const bg = cs && cs.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      } catch (_) {}
      node = node.parentElement;
    }
    return '#111';
  };

  const ensureOverlay = () => {
    if (overlayEl && panelEl && document.body.contains(overlayEl)) return;
    overlayEl = document.getElementById('fj-farm-overlay');
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.id = 'fj-farm-overlay';
      Object.assign(overlayEl.style, {
        position: 'absolute',
        zIndex: '2147483000',
        left: '0px',
        top: '0px',
        width: '0px',
        height: '0px',
        pointerEvents: 'auto',
        overflow: 'hidden',
      });
    } else {
      overlayEl.textContent = '';
    }

    panelEl = document.createElement('div');
    panelEl.className = 'fj-farm-panel';
    Object.assign(panelEl.style, {
      position: 'absolute',
      inset: '0',
      background: '#111',
      color: '#f0f0f0',
      border: 'none',
      borderRadius: '0',
      boxShadow: 'none',
      font: "500 13px 'Segoe UI', sans-serif",
      overflow: 'hidden',
      transform: 'translateY(-14px)',
      opacity: '0',
      transition: 'transform 140ms cubic-bezier(.2,.9,.2,1), opacity 120ms ease',
    });

    
    
    topBarEl = document.createElement('div');
    topBarEl.id = 'fj-farm-topbar';
  const TOPBAR_H = 56; 
    Object.assign(topBarEl.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: TOPBAR_H + 'px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0',
      padding: '0',
      boxSizing: 'border-box',
      background: '#111', 
    });

    
    const makeIconButton = (iconRelPath) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      Object.assign(btn.style, {
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: '0',
        cursor: 'pointer',
        padding: '0',
        margin: '0',
      });
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.decoding = 'async';
      img.loading = 'lazy';
      const getURL = (p) => (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p;
      img.src = getURL(iconRelPath);
      img.onerror = function(){ this.src = getURL('icons/error.png'); };
      Object.assign(img.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      });
      btn.appendChild(img);
      return btn;
    };
    const iconList = [
      'icons/farm/garden.png',
      'icons/farm/seeds.png',
      'icons/farm/cook.png',
      'icons/farm/shop.png',
      'icons/farm/tile.png',
      'icons/farm/inventory.png',
      'icons/farm/settings.png'
    ];
    const topButtons = iconList.map(makeIconButton);
    topBarEl.append(...topButtons);

    
  const moduleOrder = ['farmtools','farmseeds','farmcook','farmshop','farmtile','farminv','farmset'];
  const getModule = (name) => (window.fjTweakerModules && window.fjTweakerModules[name]) || null;
    const closeAllMenus = () => {
      ['farmtools','farmseeds','farmcook','farmshop','farmtile','farminv','farmset'].forEach(n => {
        try { getModule(n)?.close?.(); } catch (_) {}
      });
      
      try { getModule('farminteract')?.onMenuChange?.(); } catch (_) {}
    };
    topButtons.forEach((btn, idx) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const key = moduleOrder[idx];
        const mod = getModule(key);
        if (!mod) return;

        const invMod = getModule('farminv');
        const cookMod = getModule('farmcook');

        
        if (key === 'farminv') {
          const invOpen = !!invMod?.isOpen?.();
          const cookOpen = !!cookMod?.isOpen?.();
            if (cookOpen) {
            
            
            try { cookMod.close?.({ preserveInventory: true }); } catch(_) {}
            
            try {
              if (!invOpen) invMod?.open?.(menuHostEl);
              const invRoot = document.getElementById('fj-farminv');
              if (invRoot) {
                Object.assign(invRoot.style, { left: '0px', top: '0px', position: 'absolute' });
              }
            } catch(_) {}
            
            lockMode = null;
            try { positionOverlay(); } catch(_) {}
            try { getModule('farminteract')?.onMenuChange?.(); } catch(_) {}
            try { window.fjFarm?.audio?.play?.('menu_close'); } catch(_) {}
            return;
          }
          
          if (invOpen) {
            try { invMod.close?.(); } catch(_) {}
            try { getModule('farminteract')?.onMenuChange?.(); } catch(_) {}
            try { window.fjFarm?.audio?.play?.('menu_close'); } catch(_) {}
            return;
          }
          
          try { closeAllMenus(); } catch(_) {}
          try { invMod?.open?.(menuHostEl); } catch(_) {}
          lockMode = null;
          try { positionOverlay(); } catch(_) {}
          try { getModule('farminteract')?.onMenuChange?.(); } catch(_) {}
          try { window.fjFarm?.audio?.play?.('menu_open'); } catch(_) {}
          return;
        }

        
        if (key === 'farmcook') {
          const invOpen = !!invMod?.isOpen?.();
          const cookOpen = !!cookMod?.isOpen?.();
          
          if (cookOpen) {
            try { cookMod?.close?.(); } catch(_) {}
            
            lockMode = null;
            try { positionOverlay(); } catch(_) {}
            try { getModule('farminteract')?.onMenuChange?.(); } catch(_) {}
            try { window.fjFarm?.audio?.play?.('menu_close'); } catch(_) {}
            return;
          }
          
          if (invOpen) {
            
            ['farmtools','farmseeds','farmshop','farmtile','farmset'].forEach(n => {
              try { getModule(n)?.close?.(); } catch(_) {}
            });
            
            try { cookMod?.open?.(menuHostEl); } catch(_) {}
            lockMode = 'overlay';
            try { positionOverlay(); } catch(_) {}
            try { getModule('farminteract')?.onMenuChange?.(); } catch(_) {}
            try { window.fjFarm?.audio?.play?.('menu_open'); } catch(_) {}
            return;
          }
        }

        
        const already = !!mod.isOpen?.();
        if (already) {
          try { mod.close?.(); } catch (_) {}
          try { window.fjFarm?.audio?.play?.('menu_close'); } catch(_) {}
        } else {
          closeAllMenus(); 
          try { mod.open?.(menuHostEl); } catch (_) {}
          try { positionOverlay(); } catch(_) {}
          
          try {
            if (key === 'farmcook' || key === 'farmset') {
              lockMode = 'overlay';
            } else {
              lockMode = null;
            }
          } catch(_) {}
          try { window.fjFarm?.audio?.play?.('menu_open'); } catch(_) {}
        }
        
        try { getModule('farminteract')?.onMenuChange?.(); } catch (_) {}
      });
    });

    tileStripEl = document.createElement('div');
    tileStripEl.id = 'fj-farm-tiles';
    Object.assign(tileStripEl.style, {
      position: 'absolute',
      left: '0',
  top: TOPBAR_H + 'px',
      width: '100%',
      
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 1fr)',
      gridAutoRows: '1fr',
      gap: '0',
      padding: '0',
      margin: '0',
      background: 'transparent',
      overflow: 'visible', 
    });



    const makeTile = (srcRel) => {
      
      const container = document.createElement('div');
      Object.assign(container.style, {
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'block',
        overflow: 'visible', 
      });
      
      const img = document.createElement('img');
      img.decoding = 'async';
      img.loading = 'lazy';
      img.draggable = false;
      img.alt = '';
      img.src = resolveAssetUrl(srcRel);
      img.onerror = function () {
        if (img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = '1';
        img.src = resolveAssetUrl('icons/farm/tiles/error.png');
      };
      Object.assign(img.style, {
        width: '100%',
        height: '100%',
        display: 'block',
        objectFit: 'cover',
        imageRendering: 'auto',
        margin: '0',
        padding: '0',
      });
      
      container.appendChild(img);
      return container;
    };

    
    
    const totalTiles = tileTypes.length;
    for (let i = 0; i < totalTiles; i++) {
      
      const tileType = tileTypes[i] || 'dirt';
      tileStripEl.appendChild(makeTile(`icons/farm/tiles/${tileType}.png`));
    }
    
    
    const currentRows = Math.ceil(totalTiles / 8);
    tileStripEl.style.gridTemplateColumns = 'repeat(8, 1fr)'; 
    tileStripEl.style.gridTemplateRows = `repeat(${currentRows}, 1fr)`;

    
    setTimeout(() => {
      try { 
        console.log('Initializing tile handlers...');
        window.fjTweakerModules?.farmtile?.initTileClickHandlers?.(); 
      } catch(e) {
        console.error('Failed to init tile handlers:', e);
      }
      
      
      setTimeout(() => {
        try { 
          console.log('Restoring plants and objects...');
          restorePlants(); 
          restoreObjects();
        } catch(e) {
          console.error('Failed to restore plants/objects:', e);
        }
      }, 100);
    }, 50);

  
    purchaseBtnEl = document.createElement('button');
    purchaseBtnEl.id = 'fj-farm-purchase';
    purchaseBtnEl.type = 'button';
    Object.assign(purchaseBtnEl.style, {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      
      width: 'auto',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    gap: '8px',
    padding: '0 8px',
    minWidth: '140px',
      whiteSpace: 'nowrap',
      font: "700 13px 'Segoe UI', sans-serif",
      color: '#111',
      background: '#9b6f38',
      border: '1px solid #9b6f38',
      borderRadius: '6px',
      cursor: 'pointer',
    });

  const iconL = document.createElement('img');
    iconL.alt = '';
    iconL.draggable = false;
    iconL.decoding = 'async';
    iconL.loading = 'lazy';
    const getURL = (p) => (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p;
    iconL.src = getURL('icons/farm/down_icon.png');
    iconL.onerror = function(){ this.src = getURL('icons/farm/tiles/error.png'); };
    Object.assign(iconL.style, { width: '16px', height: '16px' });

    const iconR = iconL.cloneNode(true);

    
    purchaseBtnEl.textContent = '';
    const labelSpan = document.createElement('span');
  labelSpan.textContent = 'Purchase Land';
    purchaseBtnEl.append(iconL, labelSpan, iconR);

    
    
    const showPurchaseTooltip = () => {
      try {
        const cost = Math.floor(50 * Math.pow(1.1, expansions));
        window.fjfeFarmTT?.show?.({
          imageSrc: getURL('icons/farm/down_icon.png'),
          name: 'Purchase Land',
          bodyTT: `Expand your farm by adding a new row of tiles below. Each expansion increases the cost for future expansions.`,
          cost: String(cost),
          costIcon: 'icons/farm/coin.png',
        });
      } catch (_) {}
    };
    
    const hidePurchaseTooltip = () => {
      try { window.fjfeFarmTT?.hide?.(); } catch(_) {}
    };
    
    purchaseBtnEl.addEventListener('mouseenter', showPurchaseTooltip);
    purchaseBtnEl.addEventListener('mouseleave', hidePurchaseTooltip);
    purchaseBtnEl.addEventListener('focus', showPurchaseTooltip);
    purchaseBtnEl.addEventListener('blur', hidePurchaseTooltip);
    
    purchaseBtnEl.addEventListener('click', (e) => {
		e.preventDefault(); e.stopPropagation();
		
		purchaseBtnEl.style.transform = 'translateX(-50%) scale(0.95)';
		purchaseBtnEl.style.transition = 'transform 0.1s ease';
		setTimeout(() => {
			purchaseBtnEl.style.transform = 'translateX(-50%) scale(1.02)';
			setTimeout(() => {
				purchaseBtnEl.style.transform = 'translateX(-50%) scale(1)';
			}, 60);
		}, 100);
		
    
		const cost = Math.floor(50 * Math.pow(1.1, expansions));
		const currentCoins = coinsApi.get();

    
    try {
      const overlayRect = overlayEl.getBoundingClientRect();
      const tileAreaWidth = overlayRect.width;
      const tileSize = Math.max(1, Math.floor(tileAreaWidth / 8));
      const totalTilesBefore = tileStripEl.children.length;
      const rowsBefore = Math.ceil(totalTilesBefore / 8);
      const rowsAfter = rowsBefore + 1;
      const TOPBAR_H = 56;
      const availableHeight = overlayRect.height - TOPBAR_H - 6;
      if ((rowsAfter * tileSize) > availableHeight + 0.5) {
        console.log('Cannot purchase more land: no space available');
        try { window.fjFarm?.audio?.play?.('deny'); } catch(_) {}
        return;
      }
    } catch(_) {}
		
    if (currentCoins >= cost) {
		  
		  coinsApi.add(-cost);
		  
		  
		  for (let i = 0; i < 8; i++) {
		    const newTile = makeTile('icons/farm/tiles/dirt.png');
		    tileStripEl.appendChild(newTile);
		  }
		  
		  
		  tileTypes.push(...Array(8).fill('dirt'));
		  
		  
		  expansions++;
		  saveFarmData();
		  
		  
		  const currentRows = Math.ceil(tileStripEl.children.length / 8);
		  tileStripEl.style.gridTemplateColumns = 'repeat(8, 1fr)'; 
		  tileStripEl.style.gridTemplateRows = `repeat(${currentRows}, 1fr)`;
		  
		  
		  positionOverlay();
		  
		  
		  try { window.fjTweakerModules?.farmtile?.initTileClickHandlers?.(); } catch(_) {}
		  
      console.log(`Purchased land expansion for ${cost} coins. Next expansion will cost ${Math.floor(50 * Math.pow(1.1, expansions))} coins.`);
      try { window.fjFarm?.audio?.play?.('expand'); } catch(_) {}
		} else {
      console.log(`Cannot afford land expansion. Need ${cost} coins, have ${currentCoins}.`);
      try { window.fjFarm?.audio?.play?.('deny'); } catch(_) {}
		}
	});

    
    menuHostEl = document.getElementById('fj-farm-menuhost');
    if (!menuHostEl) {
      menuHostEl = document.createElement('div');
      menuHostEl.id = 'fj-farm-menuhost';
      Object.assign(menuHostEl.style, {
        
        position: 'fixed',
        left: '0px',
        top: '0px',
        width: '320px',
        height: 'auto',
        pointerEvents: 'auto',
        overflow: 'visible',
      });
      document.body.appendChild(menuHostEl);
    }

    panelEl.append(topBarEl, tileStripEl, purchaseBtnEl);
    overlayEl.append(panelEl);
    document.body.appendChild(overlayEl);

    
    try { window.fjfeFarmTT?.init?.({ anchorMenuEl: menuHostEl }); } catch(_) {}
  };

  
  
  
  
  let menuScrollHandler = null;
  let lockMode = null;
  let menuLockedPos = { left: 0, top: 0 };

  const positionOverlay = () => {
    if (!overlayEl) return;
    const rect = getUnionRect();
    const container = findCommonContainer();
    if (!rect || rect.width < 10 || rect.height < 10 || !container) {
      overlayEl.style.display = 'none';
      return;
    }
    const cs = window.getComputedStyle(container);
    const bg = computeBackgroundColor(container);
    const crect = container.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const left = Math.floor(crect.left + scrollX);
    const width = Math.ceil(crect.width);
    const top = rect.firstTop; 
    const height = Math.max(0, Math.ceil((rect.lastBottom) - (rect.firstTop)));

    
    const dialogCandidates = Array.from(document.querySelectorAll('#pollzlatest, .chanListPop, [role="dialog"]'));
    let maxDialogZ = -Infinity;
    for (const el of dialogCandidates) {
      const zi = window.getComputedStyle(el).zIndex;
      const val = parseInt(zi, 10);
      if (!isNaN(val)) maxDialogZ = Math.max(maxDialogZ, val);
    }
    const baseZ = 1000;
    const overlayZ = (maxDialogZ !== -Infinity) ? Math.max(1, Math.min(baseZ, maxDialogZ - 1)) : baseZ;
    overlayEl.style.zIndex = String(overlayZ);

  overlayEl.style.display = 'block';
    overlayEl.style.left = left + 'px';
    overlayEl.style.top = top + 'px';
    overlayEl.style.width = width + 'px';
    overlayEl.style.height = height + 'px';
    panelEl.style.background = bg;
    if (topBarEl) topBarEl.style.background = bg;

    
    const tileSize = Math.max(1, Math.floor(width / 8));
    if (tileStripEl) {
      const totalTiles = tileStripEl.children.length;
      const rows = Math.ceil(totalTiles / 8);
      tileStripEl.style.height = (tileSize * rows) + 'px';
    }
    if (purchaseBtnEl && tileStripEl) {
      const TOPBAR_H = 56;
      
      const tileRect = tileStripEl.getBoundingClientRect();
      const tileStripHeight = tileRect.height || 0;
      purchaseBtnEl.style.top = (TOPBAR_H + tileStripHeight + 6) + 'px';

      
      const overlayRect = overlayEl.getBoundingClientRect();
      const availableHeight = overlayRect.height - TOPBAR_H - 6;
      if (tileStripHeight + 1 >= availableHeight) {
        purchaseBtnEl.style.display = 'none';
      } else {
        purchaseBtnEl.style.display = 'flex';
      }
    }
    
    if (menuHostEl) {
      const gap = 6;
      const orect = overlayEl.getBoundingClientRect();
      const sideLeft = Math.round(orect.right + gap);
      if (lockMode === 'viewport') {
        
        menuHostEl.style.left = sideLeft + 'px';
        menuHostEl.style.top = menuLockedPos.top + 'px';
      } else if (lockMode === 'overlay') {
        
        menuHostEl.style.left = sideLeft + 'px';
        menuHostEl.style.top = Math.round(orect.top) + 'px';
      } else {
        
        const alignTop = Math.round(orect.top);
        menuHostEl.style.left = sideLeft + 'px';
        menuHostEl.style.top = alignTop + 'px';
      }
      menuHostEl.style.zIndex = String((parseInt(overlayEl.style.zIndex || '1000', 10) || 1000) + 1);
    }

    
    
    if (lockMode !== 'viewport') {
      try { window.fjfeFarmTT?.updatePosition?.(); } catch(_) {}
    }
  };

  const showOverlay = () => {
    ensureOverlay();
    positionOverlay();
    requestAnimationFrame(() => {
      try {
        
        panelEl.style.transform = 'translateY(0)';
        panelEl.style.opacity = '1';
      } catch (_) {}
    });
    
    if (!menuScrollHandler) {
      const GAP = 6;
      const TIP_EST = 40; 
      const MARGIN = 100 + GAP + TIP_EST; 
      menuScrollHandler = () => {
        try {
          if (!overlayEl || !menuHostEl) return;
          const orect = overlayEl.getBoundingClientRect();
          const sideLeft = Math.round(orect.right + GAP);
          if (lockMode === 'viewport') {
            
            menuHostEl.style.left = menuLockedPos.left + 'px';
            menuHostEl.style.top = menuLockedPos.top + 'px';
            return; 
          }
          if (lockMode === 'overlay') {
            
            menuHostEl.style.left = sideLeft + 'px';
            menuHostEl.style.top = Math.round(orect.top) + 'px';
            try { window.fjfeFarmTT?.updatePosition?.(); } catch(_) {}
            return;
          }
          
          const desiredTop = Math.max(Math.round(orect.top), MARGIN);
          menuHostEl.style.left = sideLeft + 'px';
          menuHostEl.style.top = desiredTop + 'px';
          try { window.fjfeFarmTT?.updatePosition?.(); } catch(_) {}
        } catch(_) {}
      };
      window.addEventListener('scroll', menuScrollHandler, { passive: true });
      window.addEventListener('resize', menuScrollHandler, { passive: true });
      
      try { menuScrollHandler(); } catch(_) {}
    }
  };

  const hideOverlay = () => {
    if (!overlayEl || !panelEl) return;
    try {
      try { window.fjFarm?.audio?.play?.('menu_close'); } catch(_) {}
      
      try {
        if (window.fjTweakerModules) {
          ['farmtools','farmseeds','farmcook','farmshop','farmtile','farminv','farmset'].forEach(n => {
            try { window.fjTweakerModules[n]?.close?.(); } catch(_) {}
          });
          
          try { window.fjTweakerModules.farminteract?.deselectItem?.(); } catch(_) {}
        }
      } catch(_) {}
      try { window.fjfeFarmTT?.hide?.(); } catch(_) {}
      panelEl.style.transform = 'translateY(-14px)';
      panelEl.style.opacity = '0';
      setTimeout(() => {
        if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
        overlayEl = null;
        panelEl = null;
        
        try {
          if (menuScrollHandler) {
            window.removeEventListener('scroll', menuScrollHandler);
            window.removeEventListener('resize', menuScrollHandler);
          }
        } catch(_) {}
        menuScrollHandler = null;
        try { if (menuHostEl && menuHostEl.parentNode) { menuHostEl.parentNode.removeChild(menuHostEl); } } catch(_) {}
        menuHostEl = null;
      }, 180);
    } catch (_) {
      try { if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl); } catch(_) {}
      overlayEl = null; panelEl = null;
      try {
        if (menuScrollHandler) {
          window.removeEventListener('scroll', menuScrollHandler);
          window.removeEventListener('resize', menuScrollHandler);
        }
      } catch(_) {}
      menuScrollHandler = null;
      try { if (menuHostEl && menuHostEl.parentNode) { menuHostEl.parentNode.removeChild(menuHostEl); } } catch(_) {}
      menuHostEl = null;
    }
  };

  const containerVisible = () => {
    const container = findCommonContainer();
    if (!container) return false;
    if (container.offsetParent === null) return false; 
    const rect = container.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const syncWithContainer = () => {
    if (!currentEnabled) return;
    if (containerVisible()) {
      showOverlay();
    } else {
      hideOverlay();
    }
  };

  
  const addDebugCoinButton = () => {
    
    const existing = document.getElementById('fj-farm-debug-coins');
    if (existing) existing.remove();
    
    const debugBtn = document.createElement('button');
    debugBtn.id = 'fj-farm-debug-coins';
    debugBtn.type = 'button';
    debugBtn.textContent = '+100';
    Object.assign(debugBtn.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '50px',
      height: '30px',
      background: '#4a9eff',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '700',
      cursor: 'pointer',
      zIndex: '2147483640',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    });
    
    debugBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      debugBtn.style.transform = 'scale(0.9)';
      debugBtn.style.transition = 'transform 0.1s ease';
      setTimeout(() => {
        debugBtn.style.transform = 'scale(1.05)';
        setTimeout(() => {
          debugBtn.style.transform = 'scale(1)';
        }, 60);
      }, 100);
      
      
      coinsApi.add(100);
      console.log('Added 100 coins. Total:', coinsApi.get());
    });
    
    document.body.appendChild(debugBtn);
  };

  
  const addDebugGrowthButton = () => {
    
    const existing = document.getElementById('fj-farm-debug-growth');
    if (existing) existing.remove();
    
    const debugBtn = document.createElement('button');
    debugBtn.id = 'fj-farm-debug-growth';
    debugBtn.type = 'button';
    debugBtn.textContent = '+1 hr';
    Object.assign(debugBtn.style, {
      position: 'fixed',
      bottom: '60px', 
      right: '20px',
      width: '50px',
      height: '30px',
      background: '#ff9f4a',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '700',
      cursor: 'pointer',
      zIndex: '2147483640',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    });
    
    debugBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      debugBtn.style.transform = 'scale(0.9)';
      debugBtn.style.transition = 'transform 0.1s ease';
      setTimeout(() => {
        debugBtn.style.transform = 'scale(1.05)';
        setTimeout(() => {
          debugBtn.style.transform = 'scale(1)';
        }, 60);
      }, 100);
      
      
      const seedsModule = window.fjTweakerModules?.farmseeds;
      if (seedsModule && seedsModule.accelerateAllPlants) {
        seedsModule.accelerateAllPlants(1);
      }
    });
    
    document.body.appendChild(debugBtn);
  };

  
  let debugToggleEl = null;
  let debugVisible = false;

  const showDebugButtons = () => {
    if (debugVisible) return;
    debugVisible = true;
    try { addDebugCoinButton(); } catch(_) {}
    try { addDebugGrowthButton(); } catch(_) {}
  };

  const hideDebugButtons = () => {
    debugVisible = false;
    try { document.getElementById('fj-farm-debug-coins')?.remove(); } catch(_) {}
    try { document.getElementById('fj-farm-debug-growth')?.remove(); } catch(_) {}
  };

  const ensureDebugToggle = () => {
    if (debugToggleEl && document.body.contains(debugToggleEl)) return;
    debugToggleEl = document.createElement('button');
    debugToggleEl.id = 'fj-farm-debug-toggle';
    debugToggleEl.type = 'button';
    Object.assign(debugToggleEl.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '24px',
      height: '24px',
      opacity: '0',
      background: 'transparent',
      border: 'none',
      padding: '0',
      margin: '0',
      cursor: 'default',
      zIndex: '2147483640',
      pointerEvents: 'auto',
    });
    debugToggleEl.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (debugVisible) hideDebugButtons(); else showDebugButtons();
    });
    document.body.appendChild(debugToggleEl);
  };

  const removeDebugToggle = () => {
    try { debugToggleEl?.remove(); } catch(_) {}
    debugToggleEl = null;
  };

  
  const restorePlants = () => {
    if (!tileStripEl) {
      console.warn('No tile strip found for plant restoration');
      return;
    }
    
    const tiles = Array.from(tileStripEl.children);
    console.log(`Restoring plants on ${tiles.length} tiles, plant data:`, plantPositions);
    
    for (let i = 0; i < tiles.length; i++) {
      const container = tiles[i];
      
      
      if (plantPositions[i]) {
        const plant = plantPositions[i];
        console.log(`Restoring plant ${plant.seedName} on tile ${i}`);
        
        let plantImg = container.querySelector('.plant-overlay');
        if (!plantImg) {
          plantImg = document.createElement('img');
          plantImg.className = 'plant-overlay';
          plantImg.alt = `${plant.seedName} growing`;
          plantImg.draggable = false;
          plantImg.decoding = 'async';
          plantImg.loading = 'lazy';
          Object.assign(plantImg.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
            zIndex: '1'
          });
          container.appendChild(plantImg);
        }
        
        
        const seedsModule = window.fjTweakerModules?.farmseeds;
        let imageSuffix = '_growing';
        if (seedsModule && seedsModule.getSeedTips) {
          const seedTips = seedsModule.getSeedTips();
          const seedInfo = seedTips[plant.seedName];
          if (seedInfo && plant.plantedAt) {
            const growthTimeMs = seedInfo.growtime * 60 * 60 * 1000;
            const elapsedTime = Date.now() - plant.plantedAt;
            if (elapsedTime >= growthTimeMs) {
              imageSuffix = '_grown';
            }
          }
        }

        const plantSrc = resolveAssetUrl(`icons/farm/plants/${plant.seedName}${imageSuffix}.png`);
        console.log(`Setting plant image source to: ${plantSrc}`);
        plantImg.src = plantSrc;
        plantImg.onerror = function() {
          console.warn(`Failed to load plant image: ${plantSrc}`);
          this.src = resolveAssetUrl('icons/error.png');
        };
        plantImg.onload = function() {
          console.log(`Successfully loaded plant image: ${plantSrc}`);
        };
      }
    }
  };

  
  const restoreObjects = () => {
    if (!tileStripEl) {
      console.warn('No tile strip found for object restoration');
      return;
    }
    
    const tiles = Array.from(tileStripEl.children);
    console.log(`Restoring objects on ${tiles.length} tiles, object data:`, objectPositions);
    
    for (let i = 0; i < tiles.length; i++) {
      const container = tiles[i];
      
      
      if (objectPositions[i]) {
        const obj = objectPositions[i];
        console.log(`Restoring object ${obj.objectName} on tile ${i}`);
        
        const size = getObjectSize(obj.objectName);
        
        
        if (obj.isAnchor !== false) { 
          let objectImg = container.querySelector('.object-overlay');
          if (!objectImg) {
            objectImg = document.createElement('img');
            objectImg.className = 'object-overlay';
            objectImg.alt = `${obj.objectName}`;
            objectImg.draggable = false;
            objectImg.decoding = 'async';
            objectImg.loading = 'lazy';
            
            
            Object.assign(objectImg.style, {
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              zIndex: '2', 
              transformOrigin: 'top left',
              transform: `scale(${size.width}, ${size.height})`
            });
            container.appendChild(objectImg);
          }
          
          const objectSrc = resolveAssetUrl(`icons/farm/objects/${obj.objectName}.png`);
          console.log(`Setting object image source to: ${objectSrc}`);
          objectImg.src = objectSrc;
          objectImg.onerror = function() {
            console.warn(`Failed to load object image: ${objectSrc}`);
            this.src = resolveAssetUrl('icons/error.png');
          };
          objectImg.onload = function() {
            console.log(`Successfully loaded object image: ${objectSrc}`);
          };
        }
      }
    }
  };

  
  const onSettingsChanged = (e) => {
    try {
      const settings = e?.detail || window.fjTweakerSettings || {};
      const enabled = !!settings?.farm;
      if (enabled === currentEnabled) return;
      currentEnabled = enabled;
      if (enabled) {
        syncWithContainer();
        
        ensureDebugToggle();
      } else {
        hideOverlay();
        
        removeDebugToggle();
        hideDebugButtons();
      }
    } catch (_) {}
  };

  const init = () => {
    try {
      if (initialized) return;
      initialized = true;
      document.addEventListener('fjTweakerSettingsChanged', onSettingsChanged, { capture: false });
      
      
      try {
        ['farmaudio','farmtools', 'farmseeds', 'farmcook', 'farmshop', 'farmtile', 'farminv', 'farmset', 'farminteract'].forEach(n => {
          try { window.fjTweakerModules?.[n]?.init?.(); } catch(_) {}
        });
      } catch(_) {}
      
      
      loadFarmData();
      
      
      setTimeout(() => {
        const seedsModule = window.fjTweakerModules?.farmseeds;
        if (seedsModule && seedsModule.checkAndUpdatePlantGrowth) {
          seedsModule.checkAndUpdatePlantGrowth();
        }
        try { window.fjFarm?.pricing?.warmCache?.(); } catch(_) {}
      }, 100);
      
      
  
  ensureDebugToggle();
  hideDebugButtons();
      
      onSettingsChanged({ detail: window.fjTweakerSettings || {} });
      
      const aside = document.getElementById('mz');
      if (aside) {
        asideObserver = new MutationObserver(() => {
          try { syncWithContainer(); } catch(_) {}
        });
        asideObserver.observe(aside, { attributes: true, attributeFilter: ['class', 'style'], childList: false, subtree: false });
      }
      
      const container = findCommonContainer();
      if (container) {
        const mo = new MutationObserver(() => { try { positionOverlay(); } catch(_) {} });
        mo.observe(container, { childList: true, subtree: true });
      }
    } catch (_) {}
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }
  window.fjTweakerModules[MODULE_KEY] = { init };
  
  if (!window.fjFarm) window.fjFarm = {};
  window.fjFarm.coins = coinsApi;
  window.fjFarm.state = farmStateApi;
  window.fjFarm.getObjectSize = getObjectSize;
  
  (function(){
  const CACHE_KEY = 'fjFarmPriceCacheV4';
    let priceCache = null;
    const loadCache = () => {
      try { priceCache = JSON.parse(localStorage.getItem(CACHE_KEY)||'null') || { v:4, plants:{}, foods:{} }; } catch(_) { priceCache = { v:4, plants:{}, foods:{} }; }
      if (!priceCache.plants) priceCache.plants = {};
      if (!priceCache.foods) priceCache.foods = {};
    };
    const saveCache = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(priceCache)); } catch(_){} };
    const toKey = (n)=> String(n||'').trim().toLowerCase().replace(/\s+/g,'_');
    const specialSeedFor = (raw)=> ({ egg:'eggvine', meat:'meatbulb' })[raw] || raw;
    const getSeedPrice = (rawName) => {
      try {
        const seeds = window.fjTweakerModules?.farmseeds?.getSeedTips?.();
        if (!seeds) return 0;
        const key = toKey(specialSeedFor(toKey(rawName)));
        const meta = seeds[key];
        return (meta && typeof meta.prc==='number') ? meta.prc : 0;
      } catch(_) { return 0; }
    };
    const priceForPlant = (name) => {
      if (!priceCache) loadCache();
      const key = toKey(name);
      if (priceCache.plants[key] != null) return priceCache.plants[key];
      const seedP = getSeedPrice(key);
      const p = Math.ceil(seedP * 1.25);
      priceCache.plants[key] = p;
      saveCache();
      return p;
    };
    const parseIngToken = (t) => { const m = String(t||'').match(/^(.*?)(\d+)$/); return m ? { key: toKey(m[1]), count: parseInt(m[2],10)||1 } : { key: toKey(t), count: 1 }; };
    
    const isPlantName = (rawName) => {
      try {
        const seeds = window.fjTweakerModules?.farmseeds?.getSeedTips?.();
        if (!seeds) return false;
        const meta = seeds[toKey(rawName)];
        return !!meta;
      } catch(_) { return false; }
    };
    
    const getPriceForName = (rawName) => {
      const nameKey = toKey(rawName);
      if (isPlantName(nameKey)) {
        return priceForPlant(nameKey);
      }
      
      try {
        const cook = window.fjTweakerModules?.farmcook;
        const ings = cook?.INGREDIENTS?.() || [];
        const recs = cook?.RECIPES?.() || [];
        const ingEntry = ings.find(e => toKey(e.name) === nameKey);
        if (ingEntry) {
          const price = priceForComposite(ingEntry.ing || []);
          if (!priceCache) loadCache();
          priceCache.foods[nameKey] = price;
          saveCache();
          return price;
        }
        const recEntry = recs.find(e => toKey(e.name) === nameKey);
        if (recEntry) {
          const price = priceForComposite(recEntry.ing || []);
          if (!priceCache) loadCache();
          priceCache.foods[nameKey] = price;
          saveCache();
          return price;
        }
      } catch(_) {}
      return 0;
    };
    
    const priceForComposite = (tokens) => {
      if (!Array.isArray(tokens)) return 0;
      let sum = 0;
      for (const tok of tokens) {
        const parts = String(tok||'').split(',').map(s => s.trim()).filter(Boolean);
        for (const part of parts) {
          const { key, count } = parseIngToken(part);
          const unit = getPriceForName(key);
          sum += (unit * (count||1));
        }
      }
      
      return Math.ceil(sum * 1.25);
    };
    window.fjFarm.pricing = {
      getPriceForItem(name, kind='plant', opts={}){
        try {
          if (kind === 'plant') return priceForPlant(name);
          if (kind === 'ingredient' || kind === 'recipe') {
            if (Array.isArray(opts.tokens)) return priceForComposite(opts.tokens);
            const cook = window.fjTweakerModules?.farmcook;
            const list = (kind==='recipe' ? cook?.RECIPES?.() : cook?.INGREDIENTS?.()) || [];
            const entry = list.find(e => toKey(e.name) === toKey(name));
            if (entry) {
              const price = priceForComposite(entry.ing || []);
              if (!priceCache) loadCache();
              priceCache.foods[toKey(name)] = price;
              saveCache();
              return price;
            }
            return 0;
          }
        } catch(_) {}
        return 0;
      },
      warmCache(){
        try {
          if (!priceCache) loadCache();
          
          const seeds = window.fjTweakerModules?.farmseeds?.getSeedTips?.() || {};
          Object.keys(seeds).forEach(k => { try { priceForPlant(k); } catch(_) {} });
          
          const cook = window.fjTweakerModules?.farmcook;
          const ings = cook?.INGREDIENTS?.() || [];
          const recs = cook?.RECIPES?.() || [];
          ings.forEach(e => { try { getPriceForName(e.name); } catch(_) {} });
          recs.forEach(e => { try { getPriceForName(e.name); } catch(_) {} });
        } catch(_) {}
      },
  clearCache(){ priceCache = { v:4, plants:{}, foods:{} }; saveCache(); },
    };
  })();
  
  window.fjFarm.ui = window.fjFarm.ui || {};
  window.fjFarm.ui.lockSubmenuToOverlay = function() {
    lockMode = 'overlay';
  };
  window.fjFarm.ui.lockSubmenuToViewport = function() {
    try {
      if (!menuHostEl) return;
      const mrect = menuHostEl.getBoundingClientRect();
      menuLockedPos.left = Math.round(mrect.left);
      menuLockedPos.top = Math.round(mrect.top);
    } catch(_) {}
    lockMode = 'viewport';
  };
  window.fjFarm.ui.unlockSubmenu = function() {
    lockMode = null;
  };
  window.fjFarm.ui.getSubmenuLockMode = function() { return lockMode; };
  
  const resetFarm = () => {
    try {
      
      coins = 100;
      tileTypes = Array(8).fill('dirt');
      plantPositions = {};
      objectPositions = {};
      expansions = 0;
      inventorySlots = null;
      cookSlots = {};
      cookUnlocks = { mb: false, st: false, ov: false };
      seenItems = {};
      craftedEntries = {};
      toolUnlocks = {};
      
      
      localStorage.removeItem('fjFarmData');
      
  try { localStorage.removeItem('fjFarmPriceCacheV1'); } catch(_) {}
  try { localStorage.removeItem('fjFarmPriceCacheV2'); } catch(_) {}
  try { localStorage.removeItem('fjFarmPriceCacheV3'); } catch(_) {}
      
      
      try {
        const invModule = window.fjTweakerModules?.farminv;
        if (invModule && invModule.resetInventory) {
          invModule.resetInventory();
        }
      } catch (invError) {
        console.warn('Failed to reset inventory:', invError);
      }
      
      
      try {
        window.dispatchEvent(new CustomEvent('fjFarmCoinsChanged', { detail: { coins } }));
      } catch(_) {}
      
      
      if (overlayEl && currentEnabled) {
        hideOverlay();
        setTimeout(() => {
          showOverlay();
        }, 200);
      }
      
  console.log('Farm reset: coins=100, tiles=8 dirt, plants=none, expansions=0, inventory=empty');
      return true;
    } catch(e) {
      console.error('Reset farm failed:', e);
      return false;
    }
  };

  window.fjFarm.debug = {
    saveFarmData,
    loadFarmData,
    restorePlants,
    resetFarm,
    getTileTypes: () => tileTypes,
    getPlantPositions: () => plantPositions,
    getExpansions: () => expansions
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
