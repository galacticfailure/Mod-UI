(() => {
  // Master controller for the farm overlay: persistence, focus locking, UI orchestration
  const MODULE_KEY = 'farm';

  
  const log = (..._args) => {  };

  const FARM_DATA_KEY = 'fjFarmData';
  const FARM_DATA_BACKUP_KEY = 'fjFarmDataBackup';
  const FARM_META_KEY = 'fjFarmDataMeta';
  const FARM_STORAGE_KEYS = [FARM_DATA_KEY, FARM_DATA_BACKUP_KEY, FARM_META_KEY];

  const simpleHashString = (input) => {
    if (typeof input !== 'string') return null;
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return `h${(hash >>> 0).toString(16).padStart(8, '0')}`;
  };

  const safeJsonParseQuiet = (raw) => {
    if (typeof raw !== 'string' || raw.length === 0) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  };

  const safeDeepClone = (value) => {
    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(value);
      }
    } catch (_) {}
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  };

  // Build a lightweight summary for logging/debug comparisons instead of diffing giant blobs
  const summarizeFarmDataSnapshot = (data) => {
    if (!data || typeof data !== 'object') return null;
    const tileArray = Array.isArray(data.tileTypes) ? data.tileTypes : [];
    const tileTypeCounts = {};
    const nonBaseSamples = [];
    for (let i = 0; i < tileArray.length; i += 1) {
      const value = tileArray[i];
      tileTypeCounts[value] = (tileTypeCounts[value] || 0) + 1;
      if (value && value !== 'dirt' && nonBaseSamples.length < 25) {
        nonBaseSamples.push({ index: i, value });
      }
    }
    const collectKeys = (obj) => (obj && typeof obj === 'object') ? Object.keys(obj) : [];
    const plantKeys = collectKeys(data.plantPositions).sort();
    const objectKeys = collectKeys(data.objectPositions).sort();
    return {
      coins: typeof data.coins === 'number' ? data.coins : null,
      expansions: typeof data.expansions === 'number' ? data.expansions : null,
      tileCount: tileArray.length,
      tilledCount: tileTypeCounts.tilled || 0,
      tileTypeCounts,
      nonBaseTileSamples: nonBaseSamples,
      plantCount: plantKeys.length,
      plantKeysSample: plantKeys.slice(0, 25),
      objectCount: objectKeys.length,
      objectKeysSample: objectKeys.slice(0, 25),
      inventorySlots: Array.isArray(data.inventorySlots) ? data.inventorySlots.length : (data.inventorySlots === null ? null : undefined),
      cookSlotCount: collectKeys(data.cookSlots).length,
      maintenanceTimerKeys: collectKeys(data.maintenanceTimers).sort(),
      seenItemsCount: collectKeys(data.seenItems).length,
      toolUnlockCount: collectKeys(data.toolUnlocks).length,
      craftedEntryCount: collectKeys(data.craftedEntries).length
    };
  };

  // Create the canonical payload we persist to storage/chrome sync
  const captureFarmDataForSerialization = () => {
    return {
      coins,
      tileTypes: safeDeepClone(tileTypes),
      plantPositions: safeDeepClone(plantPositions),
      objectPositions: safeDeepClone(objectPositions),
      expansions,
      inventorySlots: safeDeepClone(inventorySlots),
      cookSlots: safeDeepClone(cookSlots),
      cookUnlocks: safeDeepClone(cookUnlocks),
      seenItems: safeDeepClone(seenItems),
      craftedEntries: safeDeepClone(craftedEntries),
      toolUnlocks: safeDeepClone(toolUnlocks),
      maintenanceTimers: safeDeepClone(maintenanceTimers),
      version: 1
    };
  };

  const diffKeySets = (prev = [], next = []) => {
    const removed = prev.filter((k) => !next.includes(k));
    const added = next.filter((k) => !prev.includes(k));
    return { added, removed };
  };

  // Quick diff used for logging/debug instrumentation when saves happen close together
  const diffFarmDataSnapshots = (prev, next) => {
    if (!prev) return { previous: null, nextSummary: summarizeFarmDataSnapshot(next) };
    const prevTiles = Array.isArray(prev.tileTypes) ? prev.tileTypes : [];
    const nextTiles = Array.isArray(next.tileTypes) ? next.tileTypes : [];
    const maxLen = Math.max(prevTiles.length, nextTiles.length);
    let tileChanges = 0;
    const tileSamples = [];
    for (let i = 0; i < maxLen; i += 1) {
      const a = prevTiles[i];
      const b = nextTiles[i];
      if (a !== b) {
        tileChanges += 1;
        if (tileSamples.length < 25) tileSamples.push({ index: i, from: a, to: b });
      }
    }
    const prevPlantKeys = prev.plantPositions && typeof prev.plantPositions === 'object' ? Object.keys(prev.plantPositions).sort() : [];
    const nextPlantKeys = next.plantPositions && typeof next.plantPositions === 'object' ? Object.keys(next.plantPositions).sort() : [];
    const prevObjectKeys = prev.objectPositions && typeof prev.objectPositions === 'object' ? Object.keys(prev.objectPositions).sort() : [];
    const nextObjectKeys = next.objectPositions && typeof next.objectPositions === 'object' ? Object.keys(next.objectPositions).sort() : [];
    return {
      previousSummary: summarizeFarmDataSnapshot(prev),
      nextSummary: summarizeFarmDataSnapshot(next),
      tileChanges,
      tileChangeSamples: tileSamples,
      plantKeyDiff: diffKeySets(prevPlantKeys, nextPlantKeys),
      objectKeyDiff: diffKeySets(prevObjectKeys, nextObjectKeys)
    };
  };

  const logFarmStorageMutation = () => {};

  let lastSavedDataObject = null;
  let lastSavedSummary = null;
  let lastSavedHash = null;
  let lastSaveStamp = null;
  let lastSaveReason = null;
  let lastLoadedSummary = null;

  const logStorageInstrumentationGroup = (_title, cb) => {
    if (typeof cb === 'function') cb();
  };

  const STORAGE_TIMELINE_SESSION_KEY = 'fjFarmDebugTimeline';
  const STORAGE_TIMELINE_MAX = 400;
  let storageTimeline = [];
  let currentTabIdRef = null;

  const getTabIdForTimeline = () => currentTabIdRef;

  const sanitizeSnapshotForTimeline = (snapshot) => {
    if (!snapshot) return null;
    return {
      exists: snapshot.exists,
      bytes: snapshot.bytes,
      hash: snapshot.hash,
      summary: snapshot.summary,
      meta: snapshot.meta,
      preview: snapshot.preview
    };
  };

  const persistStorageTimeline = () => {
    try {
      if (typeof sessionStorage === 'undefined') return;
      sessionStorage.setItem(STORAGE_TIMELINE_SESSION_KEY, JSON.stringify(storageTimeline));
    } catch (_) {}
  };

  const clearStorageTimeline = () => {
    try {
      storageTimeline = [];
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(STORAGE_TIMELINE_SESSION_KEY);
      }
    } catch (_) {}
  };

  const recordStorageTimelineEvent = (event) => {
    try {
      const entry = {
        ...event,
        stamp: new Date().toISOString(),
        tabId: getTabIdForTimeline(),
        location: typeof window !== 'undefined' ? window.location?.href || null : null
      };
      storageTimeline.push(entry);
      if (storageTimeline.length > STORAGE_TIMELINE_MAX) {
        storageTimeline = storageTimeline.slice(storageTimeline.length - STORAGE_TIMELINE_MAX);
      }
      persistStorageTimeline();
    } catch (_) {}
  };

  const restoreStorageTimeline = () => {
    try {
      if (typeof sessionStorage === 'undefined') return;
      const raw = sessionStorage.getItem(STORAGE_TIMELINE_SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        storageTimeline = parsed;
      }
    } catch (_) {}
  };

  restoreStorageTimeline();

  const instrumentStorageGlobals = () => {};

  const installChromeStorageChangeMonitor = () => {};

  const startFarmStorageStateWatcher = () => {};

  instrumentStorageGlobals();
  installChromeStorageChangeMonitor();
  startFarmStorageStateWatcher();

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
  
  
  const TAB_SESSION_KEY = 'fjFarmTabId';
  let TAB_ID = null;
  try {
    TAB_ID = sessionStorage.getItem(TAB_SESSION_KEY);
    if (!TAB_ID) {
      TAB_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
      sessionStorage.setItem(TAB_SESSION_KEY, TAB_ID);
    }
  } catch(_) {
    TAB_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  }
  currentTabIdRef = TAB_ID;
  let isFocusLocked = false; 
  let focusOverlayEl = null; 
  let switchFocusBtnEl = null;
  const FOCUS_KEY = 'fjFarmFocusedTabId';
  
  const getFocusedTabId = () => {
    try { return localStorage.getItem(FOCUS_KEY) || ''; } catch(_) { return ''; }
  };
  const isFocusedTab = () => getFocusedTabId() === TAB_ID;
  const setFocusedTab = () => {
    try {
      localStorage.setItem(FOCUS_KEY, TAB_ID);
      
      try { if (typeof chrome !== 'undefined' && chrome.storage?.local) chrome.storage.local.set({ [FOCUS_KEY]: TAB_ID }); } catch(_) {}
    } catch(_) {}
    updateFocusUI(true);
  };
  const closeAllFarmMenus = () => {
    const getModule = (name) => (window.fjTweakerModules && window.fjTweakerModules[name]) || null;
    ['farmtools','farmseeds','farmcook','farmshop','farmtile','farminv','farmset'].forEach(n => {
      try { getModule(n)?.close?.(); } catch (_) {}
    });
    try { getModule('farminteract')?.onMenuChange?.(); } catch(_) {}
  };
  const ensureFocusOverlay = () => {
    if (!panelEl) return;
    if (!focusOverlayEl) {
      focusOverlayEl = document.createElement('div');
      focusOverlayEl.id = 'fj-farm-focus-lock';
      Object.assign(focusOverlayEl.style, {
        position: 'absolute', inset: '0',
        background: 'rgba(255,0,0,0.15)',
        display: 'none',
        pointerEvents: 'auto', 
        zIndex: '2147483646',
        alignItems: 'flex-start',
        justifyContent: 'center'
      });
      
      const btnWrap = document.createElement('div');
      Object.assign(btnWrap.style, {
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: '20px'
      });
      switchFocusBtnEl = document.createElement('button');
      switchFocusBtnEl.type = 'button';
      switchFocusBtnEl.textContent = 'Switch Focus';
      Object.assign(switchFocusBtnEl.style, {
        padding: '8px 14px', fontSize: '13px', fontWeight: '700',
        background: '#a11', color: '#fff', border: '1px solid #c33', borderRadius: '6px', cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)'
      });
      switchFocusBtnEl.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        
        setFocusedTab();
        
        try { loadFarmData(); } catch(_) {}
      });
      btnWrap.appendChild(switchFocusBtnEl);
      focusOverlayEl.appendChild(btnWrap);
      panelEl.appendChild(focusOverlayEl);
    }

    if (foundBeeBox) {
      try {
        window.fjTweakerModules?.farmtile?.ensureBeeBoxMonitor?.();
        window.fjTweakerModules?.farmtile?.refreshBeeBoxes?.();
      } catch (_) {}
    }
    if (foundRainBarrel) {
      try {
        window.fjTweakerModules?.farmtile?.ensureRainBarrelMonitor?.();
        window.fjTweakerModules?.farmtile?.refreshRainBarrels?.();
      } catch (_) {}
    }
  };
  // Focus lock prevents multiple tabs from mutating shared storage at once
  const lockUI = () => {
    isFocusLocked = true;
    try { ensureFocusOverlay(); } catch(_) {}
    if (focusOverlayEl) focusOverlayEl.style.display = 'flex';
    
    try { closeAllFarmMenus(); } catch(_) {}
  };
  const unlockUI = () => {
    isFocusLocked = false;
    if (focusOverlayEl) focusOverlayEl.style.display = 'none';
  };
  const updateFocusUI = (claimedHere = false) => {
    
    if (isFocusedTab()) {
      unlockUI();
      if (!claimedHere) { try { loadFarmData(); } catch(_) {} }
      
      try {
        if (currentEnabled) {
          if (overlayEl) {
            hideOverlay();
            
            setTimeout(() => {
              try { showOverlay(); } catch(_) {}
              try { window.fjTweakerModules?.farmseeds?.checkAndUpdatePlantGrowth?.(); } catch(_) {}
              try { window.fjTweakerModules?.farmtools?.checkAndUpdateTimers?.(); } catch(_) {}
            }, 240);
            
            setTimeout(() => {
              try {
                if (!overlayEl && currentEnabled) {
                  showOverlay();
                  try { window.fjTweakerModules?.farmseeds?.checkAndUpdatePlantGrowth?.(); } catch(_) {}
                  try { window.fjTweakerModules?.farmtools?.checkAndUpdateTimers?.(); } catch(_) {}
                }
              } catch(_) {}
            }, 500);
          } else {
            showOverlay();
            try { window.fjTweakerModules?.farmseeds?.checkAndUpdatePlantGrowth?.(); } catch(_) {}
            try { window.fjTweakerModules?.farmtools?.checkAndUpdateTimers?.(); } catch(_) {}
          }
        }
      } catch(_) {}
    } else {
      lockUI();
    }
  };
  
  
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
  
  
  
  let maintenanceTimers = {};
  let foundBeeBox = false;
  let foundRainBarrel = false;
  
  
  const OBJECT_SIZES = {
    fountain: { width: 3, height: 3 },
    tool_shed: { width: 3, height: 3 },
    well: { width: 2, height: 2 },
    small_pond: { width: 3, height: 3 },
    arch: { width: 2, height: 2 },
    gazebo: { width: 3, height: 3 },
    tree: { width: 3, height: 3 },
    lamp_post: { width: 1, height: 2 },
    
  };

  const COMPOST_BIN_KEY = 'compost_bin';
  const COMPOST_BIN_FULL_THRESHOLD = 300;
  const BEE_BOX_KEY = 'beebox';
  const BEE_BOX_ICON_EMPTY = 'bee_box_empty';
  const BEE_BOX_ICON_FULL = 'bee_box_full';
  const RAIN_BARREL_KEY = 'rain_barrel';
  const RAIN_BARREL_ICON_EMPTY = 'rain_barrel_empty';
  const RAIN_BARREL_ICON_FULL = 'rain_barrel_full';
  
  const getObjectSize = (objectName) => {
    return OBJECT_SIZES[objectName] || { width: 1, height: 1 };
  };

  const coinsApi = {
    get(){ return coins; },
    set(v){
      const nv = Math.max(0, Math.floor(Number(v)||0));
      if (nv === coins) return coins;
      coins = nv;
      saveFarmData('coins.set'); 
      try {
        window.dispatchEvent(new CustomEvent('fjFarmCoinsChanged', { detail: { coins } }));
      } catch(_) {}
      return coins;
    },
    add(delta){ return this.set(coins + (Math.floor(Number(delta)||0))); }
  };

  
  const captureCallSiteReason = (fallback) => {
    try {
      const err = new Error('capture reason');
      if (!err.stack) return fallback;
      const lines = String(err.stack).split(/\r?\n/);
      const interesting = [];
      for (const line of lines) {
        if (!line) continue;
        const norm = line.trim();
        if (!norm) continue;
        if (norm.includes('capture reason')) continue;
        if (norm.includes('captureCallSiteReason')) continue;
        if (norm.includes('saveFarmData')) continue;
        interesting.push(norm);
        return `${fallback} :: ${norm}`;
      }
      if (interesting.length === 0 && lines.length) {
        return fallback;
      }
    } catch (_) {}
    return fallback;
  };

  // Serialize farm state, guard against unfocused tabs, and mirror data into local + chrome storage
  const saveFarmData = (reasonInput = 'unspecified') => {
    const reason = reasonInput === 'unspecified' ? captureCallSiteReason(reasonInput) : reasonInput;
    const stamp = new Date().toISOString();
    let focusAllowed = true;
    try {
      try {
        if (!isFocusedTab()) {
          focusAllowed = false;
          let documentHasFocus = false;
          try {
            if (typeof document !== 'undefined' && typeof document.hasFocus === 'function') {
              documentHasFocus = Boolean(document.hasFocus());
            }
          } catch (_) {}

          if (documentHasFocus) {
            recordStorageTimelineEvent({
              source: 'saveFarmData',
              operation: 'focus-auto-claim',
              context: 'focus',
              reason,
              note: 'document.hasFocus true while focus key mismatched'
            });
            try {
              setFocusedTab();
              focusAllowed = true;
            } catch (_) {
              focusAllowed = true;
            }
          }

          if (!focusAllowed) {
            recordStorageTimelineEvent({
              source: 'saveFarmData',
              operation: 'focus-abort',
              context: 'focus',
              reason,
              note: 'focused tab id mismatch'
            });
            return;
          }
        }
      } catch (_) {}

      const farmData = captureFarmDataForSerialization();
      const farmSummary = summarizeFarmDataSnapshot(farmData);
      const diffFromPrevious = diffFarmDataSnapshots(lastSavedDataObject, farmData);
      const payload = JSON.stringify(farmData);
      const payloadHash = simpleHashString(payload);
      const sizeBytes = payload ? new Blob([payload]).size : 0;
      const meta = {
        stamp,
        reason,
        tabId: TAB_ID,
        isFocusedTab: focusAllowed,
        bytes: sizeBytes,
        stringLength: payload?.length ?? 0,
        payloadHash,
        summary: farmSummary,
        diffPreview: diffFromPrevious && typeof diffFromPrevious.tileChanges === 'number' ? {
          tileChanges: diffFromPrevious.tileChanges,
          tileChangeSamples: diffFromPrevious.tileChangeSamples,
          plantKeyDiff: diffFromPrevious.plantKeyDiff,
          objectKeyDiff: diffFromPrevious.objectKeyDiff
        } : null
      };

      try {
        localStorage.setItem('fjFarmData', payload);
      } catch (_) {}

      try {
        localStorage.setItem('fjFarmDataBackup', payload);
      } catch (_) {}

      try {
        localStorage.setItem(FARM_META_KEY, JSON.stringify(meta));
      } catch (_) {}

      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local?.set) {
          const chromePayload = safeDeepClone(farmData);
          const chromePayloadBackup = safeDeepClone(farmData);
          chrome.storage.local.set({ fjFarmData: chromePayload, fjFarmDataBackup: chromePayloadBackup, fjFarmDataMeta: meta }, () => {
            chrome.runtime?.lastError;
          });
        }
      } catch (_) {}

      lastSavedDataObject = safeDeepClone(farmData);
      lastSavedSummary = farmSummary;
      lastSavedHash = payloadHash;
      lastSaveStamp = stamp;
      lastSaveReason = reason;
    } catch(_) {}
  };

  // Hydrate in-memory state from localStorage (or chrome.storage fallback) and notify modules
  const loadFarmData = () => {
    try {
      const primaryRaw = localStorage.getItem('fjFarmData');
      const backupRaw = localStorage.getItem('fjFarmDataBackup');
      const storedStr = primaryRaw || backupRaw;
      if (!storedStr) {
        try {
          if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            chrome.storage.local.get(['fjFarmData','fjFarmDataBackup'], (res) => {
              try {
                const fromExt = res?.fjFarmData || res?.fjFarmDataBackup || null;
                if (fromExt && fromExt.version === 1) {
                  if (typeof fromExt.coins === 'number' && fromExt.coins >= 0) coins = fromExt.coins;
                  if (Array.isArray(fromExt.tileTypes) && fromExt.tileTypes.length >= 8) tileTypes = fromExt.tileTypes;
                  if (fromExt.plantPositions && typeof fromExt.plantPositions === 'object') plantPositions = fromExt.plantPositions;
                  if (fromExt.objectPositions && typeof fromExt.objectPositions === 'object') objectPositions = fromExt.objectPositions;
                  if (fromExt.cookUnlocks && typeof fromExt.cookUnlocks === 'object') cookUnlocks = { mb:false, st:false, ov:false, ...fromExt.cookUnlocks };
                  if (fromExt.seenItems && typeof fromExt.seenItems === 'object') seenItems = { ...fromExt.seenItems };
                  if (fromExt.craftedEntries && typeof fromExt.craftedEntries === 'object') craftedEntries = { ...fromExt.craftedEntries };
                  if (fromExt.toolUnlocks && typeof fromExt.toolUnlocks === 'object') toolUnlocks = { ...fromExt.toolUnlocks };
                  if (fromExt.maintenanceTimers && typeof fromExt.maintenanceTimers === 'object') maintenanceTimers = { ...fromExt.maintenanceTimers };
                  if (typeof fromExt.expansions === 'number' && fromExt.expansions >= 0) expansions = fromExt.expansions;
                  if (Array.isArray(fromExt.inventorySlots)) inventorySlots = fromExt.inventorySlots;
                  if (fromExt.cookSlots && typeof fromExt.cookSlots === 'object') cookSlots = fromExt.cookSlots;

                  try { window.dispatchEvent(new CustomEvent('fjFarmDataLoaded', { detail: fromExt })); } catch(_) {}
                }
              } catch(_) {}
            });
          }
        } catch(_) {}
        return;
      }
      
      const farmData = JSON.parse(storedStr);
      simpleHashString(storedStr);
      summarizeFarmDataSnapshot(farmData);
      if (!farmData || farmData.version !== 1) {
        return;
      }
      Array.isArray(farmData.tileTypes) ? farmData.tileTypes.filter((t) => t === 'tilled').length : null;
      diffFarmDataSnapshots(captureFarmDataForSerialization(), farmData);
      
      
      if (typeof farmData.coins === 'number' && farmData.coins >= 0) {
        coins = farmData.coins;
      }
      
      
      if (Array.isArray(farmData.tileTypes) && farmData.tileTypes.length >= 8) {
        tileTypes = farmData.tileTypes;
      }
      
      
      if (farmData.plantPositions && typeof farmData.plantPositions === 'object') {
        plantPositions = farmData.plantPositions;
      }
      
      
      if (farmData.objectPositions && typeof farmData.objectPositions === 'object') {
        objectPositions = farmData.objectPositions;
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

      
      if (farmData.maintenanceTimers && typeof farmData.maintenanceTimers === 'object') {
        maintenanceTimers = { ...farmData.maintenanceTimers };
      }
      
      
      if (typeof farmData.expansions === 'number' && farmData.expansions >= 0) {
        expansions = farmData.expansions;
      }
      
      if (Array.isArray(farmData.inventorySlots)) {
        inventorySlots = farmData.inventorySlots;
      }
      
      if (farmData.cookSlots && typeof farmData.cookSlots === 'object') {
        cookSlots = farmData.cookSlots;
      }
      
      try { window.dispatchEvent(new CustomEvent('fjFarmDataLoaded', { detail: farmData })); } catch(_) {}
      lastLoadedSummary = summarizeFarmDataSnapshot(captureFarmDataForSerialization());
      
    } catch(_) {}
  };

  
  const farmStateApi = {
    getTileType: (index) => tileTypes[index] || 'dirt',
    setTileType: (index, type) => {
      if (index >= 0 && index < tileTypes.length) {
        tileTypes[index] = type;
        saveFarmData('tileType.set');
      }
    },
    getPlant: (index) => plantPositions[index] || null,
    setPlant: (index, plantData) => {
      if (plantData) {
        plantPositions[index] = plantData;
        saveFarmData('plant.set');
      } else {
        delete plantPositions[index];
        saveFarmData('plant.clear');
      }
    },
    getObject: (index) => objectPositions[index] || null,
    setObject: (index, objectData) => {
      if (objectData) {
        objectPositions[index] = objectData;
        saveFarmData('object.set');
      } else {
        delete objectPositions[index];
        saveFarmData('object.clear');
      }
    },
    getAllTileTypes: () => [...tileTypes],
    getAllPlants: () => ({...plantPositions}),
    getAllObjects: () => ({...objectPositions}),
    
    
    getMaintenanceTimers: () => ({ ...maintenanceTimers }),
    setMaintenanceTimers: (map) => {
      try {
        if (map && typeof map === 'object') {
          maintenanceTimers = { ...map };
          saveFarmData('maintenanceTimers.set');
        }
      } catch (_) {}
    },
    
    getInventory: () => inventorySlots,
    setInventory: (slots) => {
      try {
        if (Array.isArray(slots)) {
          inventorySlots = slots;
          saveFarmData('inventory.set');
        }
      } catch (_) {}
    },
    
    getCookSlots: () => ({ ...cookSlots }),
    setCookSlots: (map) => {
      try {
        if (map && typeof map === 'object') {
          cookSlots = { ...map };
          saveFarmData('cookSlots.set');
        }
      } catch (_) {}
    },
    
    getCookUnlocks: () => ({ ...cookUnlocks }),
    isCookSectionUnlocked: (key) => Boolean(cookUnlocks[String(key||'').toLowerCase()]),
    unlockCookSection: (key) => {
      try {
        const k = String(key||'').toLowerCase();
        if (!k) return false;
        if (!cookUnlocks[k]) {
          cookUnlocks[k] = true;
          saveFarmData('cookUnlocks.unlock');
        }
        return true;
      } catch(_) { return false; }
    },
    
    hasSeenItem: (name) => {
      const k = String(name||'').trim().toLowerCase().replace(/\s+/g,'_');
      return !!seenItems[k];
    },
    markSeenItem: (name) => {
      try {
        const k = String(name||'').trim().toLowerCase().replace(/\s+/g,'_');
        if (!k) return false;
        if (!seenItems[k]) { seenItems[k] = 1; saveFarmData('seenItems.mark'); }
        return true;
      } catch(_) { return false; }
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
        if (!craftedEntries[k]) { craftedEntries[k] = 1; saveFarmData('craftedEntries.mark'); }
        return true;
      } catch(_) { return false; }
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
        if (!toolUnlocks[k]) { toolUnlocks[k] = true; saveFarmData('toolUnlocks.unlock'); }
        return true;
      } catch(_) { return false; }
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

  // Build the draggable overlay plus menu host the first time we need to render the farm
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
      'addons/farm/icons/garden.png',
      'addons/farm/icons/seeds.png',
      'addons/farm/icons/cook.png',
      'addons/farm/icons/shop.png',
      'addons/farm/icons/tile.png',
      'addons/farm/icons/inventory.png',
      'addons/farm/icons/settings.png'
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
        img.src = resolveAssetUrl('addons/farm/icons/tiles/error.png');
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
      tileStripEl.appendChild(makeTile(`addons/farm/icons/tiles/${tileType}.png`));
    }
    
    
    const currentRows = Math.ceil(totalTiles / 8);
    tileStripEl.style.gridTemplateColumns = 'repeat(8, 1fr)'; 
    tileStripEl.style.gridTemplateRows = `repeat(${currentRows}, 1fr)`;

    
    setTimeout(() => {
      try { 
        window.fjTweakerModules?.farmtile?.initTileClickHandlers?.(); 
      } catch(_) {}
      
      setTimeout(() => {
        try { 
          restorePlants(); 
          restoreObjects();
        } catch(_) {}
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
    iconL.src = getURL('addons/farm/icons/down_icon.png');
    iconL.onerror = function(){ this.src = getURL('addons/farm/icons/tiles/error.png'); };
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
          imageSrc: getURL('addons/farm/icons/down_icon.png'),
          name: 'Purchase Land',
          bodyTT: `Expand your farm by adding a new row of tiles below. Each expansion increases the cost for future expansions.`,
          cost: String(cost),
          costIcon: 'addons/farm/icons/coin.png',
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
        try { window.fjFarm?.audio?.play?.('deny'); } catch(_) {}
        return;
      }
    } catch(_) {}
		
    if (currentCoins >= cost) {
		  
		  coinsApi.add(-cost);
		  
		  
		  for (let i = 0; i < 8; i++) {
		    const newTile = makeTile('addons/farm/icons/tiles/dirt.png');
		    tileStripEl.appendChild(newTile);
		  }
		  
		  
		  tileTypes.push(...Array(8).fill('dirt'));
      
      
      expansions++;
      saveFarmData('expansion.purchase');
		  
		  
		  const currentRows = Math.ceil(tileStripEl.children.length / 8);
		  tileStripEl.style.gridTemplateColumns = 'repeat(8, 1fr)'; 
		  tileStripEl.style.gridTemplateRows = `repeat(${currentRows}, 1fr)`;
		  
		  
		  positionOverlay();
		  
		  
		  try { window.fjTweakerModules?.farmtile?.initTileClickHandlers?.(); } catch(_) {}
		  
      try { window.fjFarm?.audio?.play?.('expand'); } catch(_) {}
		} else {
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

    
    try {
      ensureFocusOverlay();
      if (isFocusLocked && focusOverlayEl) focusOverlayEl.style.display = 'flex';
    } catch(_) {}

    
    try { window.fjfeFarmTT?.init?.({ anchorMenuEl: menuHostEl }); } catch(_) {}
  };

  
  
  
  
  let menuScrollHandler = null;
  let lockMode = null;
  let menuLockedPos = { left: 0, top: 0 };

  // Snap the overlay to the uploads container and keep tooltips/menus aligned to it
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

    
    
    let tileSize = Math.max(1, Math.floor(width / 8));
    try {
      if (tileStripEl && tileStripEl.children && tileStripEl.children.length > 0) {
        const firstTile = tileStripEl.children[0];
        const tw = firstTile.getBoundingClientRect().width;
        if (tw && isFinite(tw) && tw > 0) tileSize = tw; 
      }
    } catch(_) {}
    if (tileStripEl) {
      const totalTiles = tileStripEl.children.length;
      const rows = Math.ceil(totalTiles / 8);
      const stripHeightPx = (tileSize * rows);
      tileStripEl.style.height = stripHeightPx + 'px';
    }
    if (purchaseBtnEl && tileStripEl) {
      const TOPBAR_H = 56;
      
      const totalTiles = tileStripEl.children.length;
      const rows = Math.ceil(totalTiles / 8);
      const tileStripHeight = tileSize * rows;
      const baseTop = (tileStripEl.offsetTop || TOPBAR_H); 
      purchaseBtnEl.style.top = (baseTop + tileStripHeight + 6) + 'px';

      
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
        
        const GAP = 6;
        const TIP_EST = 40; 
        const MARGIN = 100 + GAP + TIP_EST; 
        const desiredTop = Math.max(Math.round(orect.top), MARGIN);
        menuHostEl.style.left = sideLeft + 'px';
        menuHostEl.style.top = desiredTop + 'px';
      }
      menuHostEl.style.zIndex = String((parseInt(overlayEl.style.zIndex || '1000', 10) || 1000) + 1);
    }

    
    
    if (lockMode !== 'viewport') {
      try { window.fjfeFarmTT?.updatePosition?.(); } catch(_) {}
    }
  };

  // Animate the panel into view and bind scroll/resize listeners for menu positioning
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

  
  
  const cleanupLegacyFarmDebug = () => {
    try { document.getElementById('fj-farm-debug-coins')?.remove(); } catch(_) {}
    try { document.getElementById('fj-farm-debug-growth')?.remove(); } catch(_) {}
    try { document.getElementById('fj-farm-debug-toggle')?.remove(); } catch(_) {}
  };
  const ensureDebugToggle = () => { cleanupLegacyFarmDebug(); };
  const removeDebugToggle = () => { cleanupLegacyFarmDebug(); };
  const hideDebugButtons = () => { cleanupLegacyFarmDebug(); };

  
  // Recreate plant sprites/footprints from saved anchor data so the field matches state
  const restorePlants = () => {
    if (!tileStripEl) return;

    const seedsModule = window.fjTweakerModules?.farmseeds;
    if (!seedsModule) return;

    const tiles = Array.from(tileStripEl.children);

    for (let i = 0; i < tiles.length; i++) {
      const container = tiles[i];
      if (!container) continue;

      const anchorEntry = seedsModule.resolvePlantAnchor?.(i);
      const existingOverlay = container.querySelector('.plant-overlay');

      if (!anchorEntry) {
        if (existingOverlay) existingOverlay.remove();
        container.style.overflow = '';
        continue;
      }

      const { index: anchorIndex, data: anchorData } = anchorEntry;
      if (anchorIndex !== i) {
        if (existingOverlay) existingOverlay.remove();
        container.style.overflow = '';
        continue;
      }

      const isTree = !!anchorData.isTree;
      const footprint = isTree
        ? (anchorData.size ? { ...anchorData.size } : (seedsModule.getSeedFootprint?.(anchorData.seedName) || { width: 1, height: 1 }))
        : { width: 1, height: 1 };

      let plantImg = existingOverlay;
      if (!plantImg) {
        plantImg = document.createElement('img');
        plantImg.className = 'plant-overlay';
        plantImg.draggable = false;
        plantImg.decoding = 'async';
        plantImg.loading = 'lazy';
        Object.assign(plantImg.style, {
          position: 'absolute',
          top: '0',
          left: '0',
          pointerEvents: 'none',
          zIndex: '1',
          objectFit: 'cover'
        });
        container.appendChild(plantImg);
      }

      const growthInfo = seedsModule.getPlantGrowthInfo?.(anchorIndex);
      const isGrown = !!growthInfo?.isGrown;
      const stage = isGrown ? 'grown' : 'growing';
      const plantSrc = resolveAssetUrl(`addons/farm/icons/plants/${anchorData.seedName}_${stage}.png`);

      plantImg.alt = `${anchorData.seedName} ${stage}`;
      if (plantImg.src !== plantSrc) {
        plantImg.src = plantSrc;
        plantImg.onerror = function() {
          this.src = resolveAssetUrl('icons/error.png');
        };
      }

      if (isTree) {
        const widthMultiplier = Math.max(1, Number(footprint.width) || 1);
        const heightMultiplier = Math.max(1, Number(footprint.height) || 1);
        plantImg.style.width = `${widthMultiplier * 100}%`;
        plantImg.style.height = `${heightMultiplier * 100}%`;
        container.style.overflow = 'visible';
      } else {
        plantImg.style.width = '100%';
        plantImg.style.height = '100%';
        container.style.overflow = '';
      }
    }
  };

  
  // Rebuild placed objects (bee box, rain barrel, compost, etc.) including special states
  const restoreObjects = () => {
    if (!tileStripEl) return;
    
    const tiles = Array.from(tileStripEl.children);
    
    foundBeeBox = false;
    foundRainBarrel = false;
    for (let i = 0; i < tiles.length; i++) {
      const container = tiles[i];
      
      
      if (objectPositions[i]) {
        const obj = objectPositions[i];
        
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
            
            
            const commonStyle = {
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: '2',
              transformOrigin: 'top left'
            };
            if (obj.objectName === 'lamp_post') {
              Object.assign(objectImg.style, commonStyle, {
                left: '50%',
                width: 'auto',
                height: '200%',
                objectFit: 'unset',
                objectPosition: 'center center',
                transform: 'translateX(-50%)'
              });
            } else {
              Object.assign(objectImg.style, commonStyle, {
                objectFit: 'cover',
                transform: `scale(${size.width}, ${size.height})`
              });
            }
            container.appendChild(objectImg);
          }
          
            const objNameLower = String(obj.objectName || '').toLowerCase();
            if (objNameLower === BEE_BOX_KEY) {
              foundBeeBox = true;
            } else if (objNameLower === RAIN_BARREL_KEY) {
              foundRainBarrel = true;
            }
            const compostValue = objNameLower === COMPOST_BIN_KEY ? Math.max(0, Math.round(Number(obj.compostValue) || 0)) : 0;
            const beeBoxIconKey = objNameLower === BEE_BOX_KEY ? (obj.honeyReady ? BEE_BOX_ICON_FULL : BEE_BOX_ICON_EMPTY) : null;
            const rainWaterStored = objNameLower === RAIN_BARREL_KEY ? Math.max(0, Math.round(Number(obj.rainWaterStored) || 0)) : 0;
            const rainBarrelIconKey = objNameLower === RAIN_BARREL_KEY
              ? (rainWaterStored > 0 ? RAIN_BARREL_ICON_FULL : RAIN_BARREL_ICON_EMPTY)
              : null;
            const iconKey = objNameLower === COMPOST_BIN_KEY
              ? (compostValue >= COMPOST_BIN_FULL_THRESHOLD ? 'compost_bin_full' : 'compost_bin_empty')
              : objNameLower === BEE_BOX_KEY
                ? beeBoxIconKey
                : objNameLower === RAIN_BARREL_KEY
                  ? rainBarrelIconKey
                  : obj.objectName;
          const objectSrc = resolveAssetUrl(`addons/farm/icons/objects/${iconKey}.png`);
          objectImg.src = objectSrc;
          objectImg.onerror = function() {
            this.src = resolveAssetUrl('icons/error.png');
          };
        }
      }
    }

    if (foundBeeBox) {
      try {
        window.fjTweakerModules?.farmtile?.ensureBeeBoxMonitor?.();
        window.fjTweakerModules?.farmtile?.refreshBeeBoxes?.();
      } catch (_) {}
    }
    if (foundRainBarrel) {
      try {
        window.fjTweakerModules?.farmtile?.ensureRainBarrelMonitor?.();
        window.fjTweakerModules?.farmtile?.refreshRainBarrels?.();
      } catch (_) {}
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


  // Entry point: wire settings listener, init submodules, load save data, watch layout
  const init = () => {
    try {
      if (initialized) return;
      initialized = true;
      document.addEventListener('fjTweakerSettingsChanged', onSettingsChanged, { capture: false });
      
      
      window.addEventListener('storage', (e) => {
        try {
          if (e && e.key === FOCUS_KEY) updateFocusUI(false);
        } catch(_) {}
      });
      
      
      try {
        ['farmaudio','farmtools', 'farmseeds', 'farmcook', 'farmshop', 'farmtile', 'farminv', 'farmset', 'farminteract'].forEach(n => {
          try { window.fjTweakerModules?.[n]?.init?.(); } catch(_) {}
        });
      } catch(_) {}
      
      
      loadFarmData();
      
      try {
        const cur = getFocusedTabId();
        if (!cur) setFocusedTab(); else updateFocusUI(false);
      } catch(_) { updateFocusUI(false); }
      
      
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
      
      try {
        document.addEventListener('pointerdown', (e) => {
          try {
            if (!isFocusLocked) return;
            const t = e.target;
            if (!panelEl) return;
            if (!panelEl.contains(t)) return; 
            if (focusOverlayEl && focusOverlayEl.contains(t)) return; 
            e.preventDefault(); e.stopPropagation();
          } catch(_) {}
        }, { capture: true });
        
      } catch(_) {}
      

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
  // Pricing cache keeps UI responsive by memoizing derived coin values for plants/recipes
  const CACHE_VERSION = 6;
    const CACHE_KEY = `fjFarmPriceCacheV${CACHE_VERSION}`;
    const PRICE_STEP_MULTIPLIER = 1.1; 
    let priceCache = null;

    const defaultCache = () => ({ v: CACHE_VERSION, plants: {}, foods: {} });
    const normalizeCache = (candidate) => {
      if (!candidate || candidate.v !== CACHE_VERSION) return defaultCache();
      const plants = candidate.plants && typeof candidate.plants === 'object' ? candidate.plants : {};
      const foods = candidate.foods && typeof candidate.foods === 'object' ? candidate.foods : {};
      return { v: CACHE_VERSION, plants, foods };
    };
    const roundPrice = (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return 0;
      return Math.max(0, Math.round(numeric));
    };
    const toKey = (s) => String(s||'').trim().toLowerCase().replace(/\s+/g,'_');
    const SPECIAL_ITEM_PRICES = Object.freeze({
      water: 2,
      fertilizer: 32,
      honey: 14,
    });
    const lookupSpecialPrice = (rawName) => {
      const key = toKey(rawName);
      return Object.prototype.hasOwnProperty.call(SPECIAL_ITEM_PRICES, key) ? SPECIAL_ITEM_PRICES[key] : null;
    };
    const loadCache = () => {
      try { priceCache = normalizeCache(JSON.parse(localStorage.getItem(CACHE_KEY)||'null')); }
      catch(_) { priceCache = defaultCache(); }
    };
    const saveCache = () => {
      if (!priceCache) loadCache();
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(priceCache || defaultCache())); } catch(_) {}
    };

    const priceForPlant = (rawName) => {
      const key = toKey(rawName);
      if (!priceCache) loadCache();
      const cached = priceCache.plants && typeof priceCache.plants[key] === 'number' ? priceCache.plants[key] : null;
      if (cached !== null) return cached;

  const seedsModule = window.fjTweakerModules?.farmseeds;
  const seeds = seedsModule?.getSeedTips?.() || {};
  const sourceSeedKey = seedsModule?.resolveSeedForHarvest?.(key) || key;
  const meta = seeds[sourceSeedKey];
  if (!meta) return 0;
  const basePrice = Math.max(0, Number(meta?.prc) || 0);
  const perYieldPrice = (seedsModule?.isTreeSeed?.(sourceSeedKey))
    ? Math.max(0, Math.ceil(basePrice / 9))
    : basePrice;
      const computed = perYieldPrice > 0 ? roundPrice(perYieldPrice * PRICE_STEP_MULTIPLIER) : 0;
      priceCache.plants[key] = computed;
      saveCache();
      return computed;
    };
    const parseIngToken = (t) => { const m = String(t||'').match(/^(.*?)(\d+)$/); return m ? { key: toKey(m[1]), count: parseInt(m[2],10)||1 } : { key: toKey(t), count: 1 }; };
    
    const isPlantName = (rawName) => {
      try {
        const seedsModule = window.fjTweakerModules?.farmseeds;
        const seeds = seedsModule?.getSeedTips?.();
        if (!seeds) return false;
        const resolved = seedsModule?.resolveSeedForHarvest?.(rawName);
        return resolved ? !!seeds[resolved] : false;
      } catch(_) { return false; }
    };
    
    const getPriceForName = (rawName) => {
      const nameKey = toKey(rawName);
      if (typeof SPECIAL_ITEM_PRICES[nameKey] === 'number') return SPECIAL_ITEM_PRICES[nameKey];
      if (!priceCache) loadCache();
      if (isPlantName(nameKey)) {
        const plantCached = priceCache.plants && typeof priceCache.plants[nameKey] === 'number' ? priceCache.plants[nameKey] : null;
        if (plantCached !== null) return plantCached;
        return priceForPlant(nameKey);
      }

      const cachedFood = priceCache.foods && typeof priceCache.foods[nameKey] === 'number' ? priceCache.foods[nameKey] : null;
      if (cachedFood !== null) return cachedFood;
      
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
      const specialFallback = SPECIAL_ITEM_PRICES[nameKey];
      if (typeof specialFallback === 'number') return specialFallback;
      return 0;
    };
    
    const priceForComposite = (tokens) => {
      if (!Array.isArray(tokens) || tokens.length === 0) return 0;
      let sum = 0;
      for (const tok of tokens) {
        const parts = String(tok||'').split(',').map(s => s.trim()).filter(Boolean);
        for (const part of parts) {
          const { key, count } = parseIngToken(part);
          const qty = Math.max(1, count || 1);
          const unit = Math.max(0, getPriceForName(key));
          sum += (unit * PRICE_STEP_MULTIPLIER) * qty;
        }
      }
      
      return roundPrice(sum);
    };
    window.fjFarm.pricing = {
      getPriceForItem(name, kind='plant', opts={}){
        try {
          if (kind === 'plant') {
            const special = lookupSpecialPrice(name);
            if (special != null) return special;
            return priceForPlant(name);
          }
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
          if (kind === 'food' || kind === 'special') {
            const special = lookupSpecialPrice(name);
            if (special != null) return special;
            return getPriceForName(name);
          }
          const fallbackSpecial = lookupSpecialPrice(name);
          if (fallbackSpecial != null) return fallbackSpecial;
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
  clearCache(){ priceCache = defaultCache(); saveCache(); },
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
    // Nukes both state and caches so QA/debug can start fresh without reinstalling the extension
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
  try { localStorage.removeItem('fjFarmPriceCacheV4'); } catch(_) {}
      
      
      try {
        const invModule = window.fjTweakerModules?.farminv;
        if (invModule && invModule.resetInventory) {
          invModule.resetInventory();
        }
      } catch (_) {}
      
      
      try {
        window.dispatchEvent(new CustomEvent('fjFarmCoinsChanged', { detail: { coins } }));
      } catch(_) {}
      
      
      if (overlayEl && currentEnabled) {
        hideOverlay();
        setTimeout(() => {
          showOverlay();
        }, 200);
      }
      
      return true;
    } catch(e) {
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
    getExpansions: () => expansions,
    getStorageTimeline: () => {
      try {
        if (typeof sessionStorage !== 'undefined') {
          const raw = sessionStorage.getItem(STORAGE_TIMELINE_SESSION_KEY);
          if (raw) {
            return JSON.parse(raw);
          }
        }
      } catch (_) {}
      return storageTimeline.slice();
    },
    clearStorageTimeline
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
