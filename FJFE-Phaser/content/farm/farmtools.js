(() => {
  const MODULE_KEY = 'farmtools';
  let root = null;
  let isOpen = false;
  let buttonsMeta = [];
  let TICK_COUNT = 0;

  
  const dlog = () => {};

  // Palette definition used by the sidebar grid; order determines grouping visually.
  const TOOL_ICONS = [
    
    { key: 'hoebasic',   icon: 'icons/farm/tools/hoebasic.png' },
    { key: 'wcbasic',    icon: 'icons/farm/tools/wcbasic.png' },
    { key: 'weedbasic',  icon: 'icons/farm/tools/weedbasic.png' },
    { key: 'hvstbasic',  icon: 'icons/farm/tools/hvstbasic.png' },
    
    { key: 'hoebetter',  icon: 'icons/farm/tools/hoebetter.png' },
    { key: 'wcbetter',   icon: 'icons/farm/tools/wcbetter.png' },
    { key: 'weedbetter', icon: 'icons/farm/tools/weedbetter.png' },
    { key: 'hvstbetter', icon: 'icons/farm/tools/hvstbetter.png' },
    
    { key: 'hoebest',    icon: 'icons/farm/tools/hoebest.png' },
    { key: 'wcbest',     icon: 'icons/farm/tools/wcbest.png' },
    { key: 'weedbest',   icon: 'icons/farm/tools/weedbest.png' },
    { key: 'hvstbest',   icon: 'icons/farm/tools/hvstbest.png' },
    
    { key: 'glove',      icon: 'icons/farm/tools/glove.png' },
    { key: 'bulldoze',   icon: 'icons/farm/tools/bulldoze.png' },
  ];

  const TOOL_TIPS = {
    hoebasic:   { name: 'Basic Hoe',           desc: 'Tills one tile of soil.' },
    hoebetter:  { name: 'Large Hoe',           desc: 'Tills a 5x5 area of soil.' },
    hoebest:    { name: 'Giga Hoe',            desc: 'Tills all soil present.' },
    wcbasic:    { name: 'Basic Watering Can',  desc: 'Waters a plant.' },
    wcbetter:   { name: 'Big Watering Can',    desc: 'Waters a 5x5 area.' },
    wcbest:     { name: 'Mega Watering Can',   desc: 'Waters all crops.' },
    weedbasic:  { name: 'Small Trowel',        desc: 'Weeds one plant.' },
    weedbetter: { name: 'Regular Trowel',      desc: 'Weeds a 5x5 area.' },
    weedbest:   { name: 'Huge Trowel',         desc: 'Weeds all crops.' },
    hvstbasic:  { name: 'Hand-Pick',           desc: 'Harvest a plant and add to inventory.' },
    hvstbetter: { name: 'Handheld Scythe',     desc: 'Harvest a 5x5 area and add to inventory.' },
    hvstbest:   { name: 'Double Scythe',       desc: 'Harvest all grown crops and add to inventory.' },
    glove:      { name: 'Move Glove',          desc: 'Move objects around the farm. Objects can be repositioned for free.' },
  bulldoze:   { name: 'Bulldozer',           desc: 'Destroys objects and plants for 75% of their value.' },
  };

  const resolveAssetUrl = (p) => {
    try { return (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p; } catch (_) { return p; }
  };
  
  
  const resolve = resolveAssetUrl;

	const getSeedsModule = () => window.fjTweakerModules?.farmseeds;

  
  // Maintenance timers live here so watering/weeding decay keeps running off-screen.
  const tileTimers = new Map(); 
  let timersDirty = false;
  let lastPersistAt = 0;
  
  const getScale = () => {
    try {
      const s = Number(window.fjFarm?.debug?.timerScale);
      return isFinite(s) && s > 0 ? s : 1;
    } catch(_) { return 1; }
  };
  const WATERING_INTERVAL_BASE = 60 * 60 * 1000; 
  const WEEDING_INTERVAL_BASE = 2.5 * 60 * 60 * 1000; 
  const WATERING_INTERVAL = () => Math.floor(WATERING_INTERVAL_BASE * getScale());
  const WEEDING_INTERVAL = () => Math.floor(WEEDING_INTERVAL_BASE * getScale());
  const TIMER_CHECK_INTERVAL = 5000; 
  let timerCheckInterval = null;

  
  // Loads persisted timer info, skipping trees and resuming paused tiles intelligently.
  const bootstrapTimersFromFarm = () => {
    try {
      const now = Date.now();
      
      const persisted = window.fjFarm?.state?.getMaintenanceTimers?.() || {};

      const tileStrip = document.getElementById('fj-farm-tiles');
      const totalTiles = tileStrip ? tileStrip.children.length : 64;
      const seedsModule = window.fjTweakerModules?.farmseeds;
      for (let i = 0; i < totalTiles; i++) {
        const plantData = window.fjFarm?.state?.getPlant?.(i);
        if (plantData && seedsModule?.isTreeSeed?.(plantData.seedName)) {
          if (tileTimers.delete(i)) timersDirty = true;
          continue;
        }
        const persistedEntry = persisted?.[i] || persisted?.[String(i)] || null;
        const growthInfo = seedsModule?.getPlantGrowthInfo?.(i);
        const isActive = !!(plantData?.plantedAt) && !(growthInfo?.isGrown);
        if (isActive) {
          
          if (persistedEntry) {
            if (persistedEntry.paused) {
              const wRemain = Math.max(0, Number(persistedEntry.wateringMs)||0);
              const weRemain = Math.max(0, Number(persistedEntry.weedingMs)||0);
              tileTimers.set(i, { watering: wRemain, weeding: weRemain, lastCheck: now, paused: false });
            } else if (persistedEntry.wateringExpiresAt || persistedEntry.weedingExpiresAt) {
              const wRemain = Math.max(0, Math.floor((persistedEntry.wateringExpiresAt || (now + WATERING_INTERVAL())) - now));
              const weRemain = Math.max(0, Math.floor((persistedEntry.weedingExpiresAt || (now + WEEDING_INTERVAL())) - now));
              tileTimers.set(i, { watering: wRemain, weeding: weRemain, lastCheck: now, paused: false });
            }
          }
          if (!tileTimers.has(i)) {
            initializeTileTimer(i);
          }
          updateTileOverlays(i);
        } else {
          
          if (persistedEntry) {
            if (persistedEntry.paused) {
              const wRemain = Math.max(0, Number(persistedEntry.wateringMs)||0);
              const weRemain = Math.max(0, Number(persistedEntry.weedingMs)||0);
              tileTimers.set(i, { watering: wRemain, weeding: weRemain, lastCheck: now, paused: true });
            } else if (persistedEntry.wateringExpiresAt || persistedEntry.weedingExpiresAt) {
              const wRemain = Math.max(0, Math.floor((persistedEntry.wateringExpiresAt || (now + WATERING_INTERVAL())) - now));
              const weRemain = Math.max(0, Math.floor((persistedEntry.weedingExpiresAt || (now + WEEDING_INTERVAL())) - now));
              tileTimers.set(i, { watering: wRemain, weeding: weRemain, lastCheck: now, paused: true });
            }
          } else {
            const t = tileTimers.get(i);
            if (t) { t.paused = true; t.lastCheck = now; }
          }
        }
      }
    } catch (_) {}
  };

  
  // Writes current countdowns back into fjFarm state so reloads and tab switches are lossless.
  const persistTimersToState = (force = false) => {
    try {
      const now = Date.now();
      if (!force && (now - lastPersistAt < 30000)) return; 
      const out = {};
      tileTimers.forEach((t, idx) => {
        if (t?.paused) {
          out[idx] = {
            paused: true,
            wateringMs: Math.max(0, t.watering || 0),
            weedingMs: Math.max(0, t.weeding || 0)
          };
        } else {
          out[idx] = {
            paused: false,
            wateringExpiresAt: now + Math.max(0, t.watering || 0),
            weedingExpiresAt: now + Math.max(0, t.weeding || 0)
          };
        }
      });
      window.fjFarm?.state?.setMaintenanceTimers?.(out);
      lastPersistAt = now;
      timersDirty = false;
      dlog('persistTimers', { count: Object.keys(out).length });
    } catch (_) {}
  };

  
  // Ensures a timer entry exists for a newly tilled tile, respecting debug time scaling.
  const initializeTileTimer = (tileIndex) => {
    const plantData = window.fjFarm?.state?.getPlant?.(tileIndex);
    if (plantData && getSeedsModule()?.isTreeSeed?.(plantData.seedName)) {
      tileTimers.delete(tileIndex);
      return;
    }
    const now = Date.now();
    const exists = tileTimers.has(tileIndex);
    if (exists) {
      const t = tileTimers.get(tileIndex);
      
      t.paused = false;
      t.lastCheck = now;
    } else {
      tileTimers.set(tileIndex, {
        watering: WATERING_INTERVAL(),
        weeding: WEEDING_INTERVAL(),
        lastCheck: now,
        paused: false
      });
    }
    dlog('initializeTileTimer', { tileIndex, existed: exists, timers: tileTimers.size });
    timersDirty = true;
  };

  
  // Removes timer + overlays once a plant disappears (bulldozer, harvest, move, etc.).
  const removeTileTimer = (tileIndex) => {
    tileTimers.delete(tileIndex);
    dlog('removeTileTimer', { tileIndex, timers: tileTimers.size });
    updateTileOverlays(tileIndex);
    timersDirty = true;
    persistTimersToState(true);
  };

  
  // Dedicated helpers invoked by watering/weeding tools so overlays + persistence stay in sync.
  const resetWateringTimer = (tileIndex) => {
    const timer = tileTimers.get(tileIndex);
    if (timer) {
      timer.watering = WATERING_INTERVAL();
      updateTileOverlays(tileIndex);
      timersDirty = true;
      persistTimersToState(true);
    }
  };

  
  const resetWeedingTimer = (tileIndex) => {
    const timer = tileTimers.get(tileIndex);
    if (timer) {
      timer.weeding = WEEDING_INTERVAL();
      updateTileOverlays(tileIndex);
      timersDirty = true;
      persistTimersToState(true);
    }
  };

  
  // Paints the little watering/weed badges that float over needy crops.
  const updateTileOverlays = (tileIndex) => {
    try {
      
      const tileStrip = document.getElementById('fj-farm-tiles');
      if (!tileStrip) return;
      
      const tiles = Array.from(tileStrip.children);
      const tile = tiles[tileIndex];
      if (!tile) return;

      
      const existingOverlayContainer = tile.querySelector('.needs-overlays');
      if (existingOverlayContainer) existingOverlayContainer.remove();

      const timer = tileTimers.get(tileIndex);
      if (!timer) return;

      
      const plantData = window.fjFarm?.state?.getPlant?.(tileIndex);
      if (!plantData || !plantData.plantedAt) return;

  if (getSeedsModule()?.isTreeSeed?.(plantData.seedName)) return;

      const seedsModule = window.fjTweakerModules?.farmseeds;
      if (!seedsModule) return;

      const plantGrowthInfo = seedsModule.getPlantGrowthInfo(tileIndex);
      if (!plantGrowthInfo || plantGrowthInfo.isGrown) return; 

      const needsWatering = timer.watering <= 0;
      const needsWeeding = timer.weeding <= 0;

      if (!needsWatering && !needsWeeding) return;

      
      const overlayContainer = document.createElement('div');
      overlayContainer.className = 'needs-overlays';
      Object.assign(overlayContainer.style, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        pointerEvents: 'none',
        zIndex: '10'
      });

      if (needsWatering) {
        const wateringImg = document.createElement('img');
        wateringImg.className = 'watering-overlay';
        wateringImg.src = resolve('icons/farm/watering.png');
        wateringImg.alt = 'Needs Watering';
        wateringImg.onerror = function() {
          this.src = resolve('icons/error.png');
        };
        Object.assign(wateringImg.style, {
          width: '50%',
          height: '50%',
          opacity: '0.8',
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: '2px',
          padding: '2px'
        });
        overlayContainer.appendChild(wateringImg);
      }

      if (needsWeeding) {
        const weedingImg = document.createElement('img');
        weedingImg.className = 'weeding-overlay';
        weedingImg.src = resolve('icons/farm/weeding.png');
        weedingImg.alt = 'Needs Weeding';
        weedingImg.onerror = function() {
          this.src = resolve('icons/error.png');
        };
        Object.assign(weedingImg.style, {
          width: '50%',
          height: '50%',
          opacity: '0.8',
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: '2px',
          padding: '2px'
        });
        overlayContainer.appendChild(weedingImg);
      }

      tile.appendChild(overlayContainer);
      dlog('overlayShown', tileIndex, { needsWatering, needsWeeding });
    } catch (_) {}
  };

  
  // Heartbeat fired every TIMER_CHECK_INTERVAL ms to decay watering/weed timers + apply boosts.
  const checkAndUpdateTimers = () => {
    try {
      const currentTime = Date.now();
      TICK_COUNT++;

      
      try {
        const tileStrip = document.getElementById('fj-farm-tiles');
        const totalTiles = tileStrip ? tileStrip.children.length : 64;
        const seedsModule = window.fjTweakerModules?.farmseeds;
        for (let i = 0; i < totalTiles; i++) {
          const plantData = window.fjFarm?.state?.getPlant?.(i);
          if (plantData && seedsModule?.isTreeSeed?.(plantData.seedName)) {
            if (tileTimers.delete(i)) timersDirty = true;
            updateTileOverlays(i);
            continue;
          }
          const growthInfo = seedsModule?.getPlantGrowthInfo?.(i);
          const isActive = !!(plantData?.plantedAt) && !(growthInfo?.isGrown);
          if (isActive) {
            if (!tileTimers.has(i)) initializeTileTimer(i);
            const t = tileTimers.get(i);
            if (t && t.paused) { t.paused = false; t.lastCheck = currentTime; timersDirty = true; }
          } else {
            const t = tileTimers.get(i);
            if (t) {
              if (!t.paused) { t.paused = true; timersDirty = true; }
              t.lastCheck = currentTime;
              
              if (growthInfo?.isGrown && growthInfo?.seedName) {
                try {
                  const tileEl = tileStrip?.children?.[i];
                  const plantImg = tileEl?.querySelector?.('.plant-overlay');
                  const grownSrc = resolve(`icons/farm/plants/${growthInfo.seedName}_grown.png`);
                  if (plantImg && plantImg.src !== grownSrc) {
                    plantImg.src = grownSrc;
                    plantImg.onerror = function(){ this.src = resolve('icons/error.png'); };
                  }
                } catch(_) {}
              }
            }
          }
          updateTileOverlays(i);
        }
      } catch(_) {}

      
      const allObjects = window.fjFarm?.state?.getAllObjects?.() || {};
      const sprinklerAnchors = [];
      const scarecrowAnchors = [];
      const totalCols = 8;
      for (const [idxStr, obj] of Object.entries(allObjects)) {
        if (!obj || obj.isAnchor === false) continue;
        const idx = Number(idxStr);
        if (obj.objectName === 'sprinkler') sprinklerAnchors.push(idx);
        if (obj.objectName === 'scarecrow') scarecrowAnchors.push(idx);
      }
      const isInRadius = (tileIndex, anchors, radius) => {
        if (!anchors.length) return false;
        const tRow = Math.floor(tileIndex / totalCols);
        const tCol = tileIndex % totalCols;
        for (const a of anchors) {
          const aRow = Math.floor(a / totalCols);
          const aCol = a % totalCols;
          if (Math.abs(tRow - aRow) <= radius && Math.abs(tCol - aCol) <= radius) return true;
        }
        return false;
      };

      
      const seedsModuleForTimers = getSeedsModule();

      tileTimers.forEach((timer, tileIndex) => {
        const deltaTime = currentTime - timer.lastCheck;
        timer.lastCheck = currentTime;

        if (timer.paused) return; 

        const plantData = window.fjFarm?.state?.getPlant?.(tileIndex);
        if (plantData && seedsModuleForTimers?.isTreeSeed?.(plantData.seedName)) {
          tileTimers.delete(tileIndex);
          timersDirty = true;
          updateTileOverlays(tileIndex);
          return;
        }

        const growthInfo = seedsModuleForTimers?.getPlantGrowthInfo?.(tileIndex);
        const isActive = !!(plantData?.plantedAt) && !(growthInfo?.isGrown);
        if (!isActive) {
          timer.paused = true;
          timersDirty = true;
          updateTileOverlays(tileIndex);
          
          if (growthInfo?.isGrown && growthInfo?.seedName) {
            try {
              const tileStrip = document.getElementById('fj-farm-tiles');
              const tileEl = tileStrip ? tileStrip.children[tileIndex] : null;
              const plantImg = tileEl?.querySelector?.('.plant-overlay');
              const grownSrc = resolve(`icons/farm/plants/${growthInfo.seedName}_grown.png`);
              if (plantImg && plantImg.src !== grownSrc) {
                plantImg.src = grownSrc;
                plantImg.onerror = function(){ this.src = resolve('icons/error.png'); };
              }
            } catch(_) {}
          }
          return;
        }

        const beforeW = timer.watering, beforeWe = timer.weeding;
        timer.watering = Math.max(0, timer.watering - deltaTime);
        timer.weeding = Math.max(0, timer.weeding - deltaTime);
        if (timer.watering !== beforeW || timer.weeding !== beforeWe) timersDirty = true;

        if (isInRadius(tileIndex, sprinklerAnchors, 2)) {
          const newW = WATERING_INTERVAL();
          if (timer.watering !== newW) { timer.watering = newW; timersDirty = true; }
        }
        if (isInRadius(tileIndex, scarecrowAnchors, 2)) {
          const newWe = WEEDING_INTERVAL();
          if (timer.weeding !== newWe) { timer.weeding = newWe; timersDirty = true; }
        }

        updateTileOverlays(tileIndex);
      });

      if (timersDirty) persistTimersToState(false);
    } catch (_) {}
  };

  
  // Tiles grow slower when maintenance lapses; farmseeds consults this modifier.
  const getGrowthSpeedModifier = (tileIndex) => {
    const plantData = window.fjFarm?.state?.getPlant?.(tileIndex);
    if (plantData && getSeedsModule()?.isTreeSeed?.(plantData.seedName)) return 1.0;

    const timer = tileTimers.get(tileIndex);
    if (!timer) return 1.0;

    const needsWatering = timer.watering <= 0;
    const needsWeeding = timer.weeding <= 0;

    if (needsWatering && needsWeeding) {
      return 0.5; 
    } else if (needsWatering || needsWeeding) {
      return 0.75; 
    }

    return 1.0; 
  };

  
  // Tool activations fan out into single tile, 5x5, or "all" behavior depending on tier.
  const handleWateringTool = (toolKey, tileIndex, opts = {}) => {
    let tilesToWater = [];

    if (toolKey === 'wcbasic') {
      tilesToWater = [tileIndex];
    } else if (toolKey === 'wcbetter') {
      tilesToWater = getAreaTiles(tileIndex, 5);
    } else if (toolKey === 'wcbest') {
      
      const tileModule = window.fjTweakerModules?.farmtile;
      if (tileModule && tileModule.getAllPlantTiles) {
        tilesToWater = tileModule.getAllPlantTiles();
      }
    }

  let wateredCount = 0;
    for (const targetIndex of tilesToWater) {
      const plantData = window.fjFarm?.state?.getPlant?.(targetIndex);
      if (!plantData) continue;
      if (getSeedsModule()?.isTreeSeed?.(plantData.seedName)) continue;

      if (!tileTimers.has(targetIndex)) {
        initializeTileTimer(targetIndex);
      }
      if (tileTimers.has(targetIndex)) {
        resetWateringTimer(targetIndex);
        wateredCount++;
      }
    }

    const ok = wateredCount > 0;
    if (!opts?.silent) {
      try { if (ok) window.fjFarm?.audio?.play?.('watering'); } catch(_) {}
    }
    return ok;
  };

  
  const handleWeedingTool = (toolKey, tileIndex, opts = {}) => {
    let tilesToWeed = [];

    if (toolKey === 'weedbasic') {
      tilesToWeed = [tileIndex];
    } else if (toolKey === 'weedbetter') {
      tilesToWeed = getAreaTiles(tileIndex, 5);
    } else if (toolKey === 'weedbest') {
      
      const tileModule = window.fjTweakerModules?.farmtile;
      if (tileModule && tileModule.getAllPlantTiles) {
        tilesToWeed = tileModule.getAllPlantTiles();
      }
    }

  let weededCount = 0;
    for (const targetIndex of tilesToWeed) {
      const plantData = window.fjFarm?.state?.getPlant?.(targetIndex);
      if (!plantData) continue;
      if (getSeedsModule()?.isTreeSeed?.(plantData.seedName)) continue;

      if (!tileTimers.has(targetIndex)) {
        initializeTileTimer(targetIndex);
      }
      if (tileTimers.has(targetIndex)) {
        resetWeedingTimer(targetIndex);
        weededCount++;
      }
    }

    const ok = weededCount > 0;
    if (!opts?.silent) {
      try { if (ok) window.fjFarm?.audio?.play?.('weeding'); } catch(_) {}
    }
    return ok;
  };

  
  const getAreaTiles = (centerIndex, size) => {
    const tiles = [];
    const totalCols = 8; 
    const tileStrip = document.getElementById('fj-farm-tiles');
    const totalTiles = tileStrip ? tileStrip.children.length : 64;
    const totalRows = Math.ceil(totalTiles / totalCols);
    const centerRow = Math.floor(centerIndex / totalCols);
    const centerCol = centerIndex % totalCols;

    const halfSize = Math.floor(size / 2);

    for (let row = centerRow - halfSize; row <= centerRow + halfSize; row++) {
      for (let col = centerCol - halfSize; col <= centerCol + halfSize; col++) {
        if (row >= 0 && row < totalRows && col >= 0 && col < totalCols) {
          tiles.push(row * totalCols + col);
        }
      }
    }

    return tiles;
  };

  
  const getAllTilledTiles = () => {
    return Array.from(tileTimers.keys());
  };

  
  // Surfaces timer state in the debug tooltip so QA can sanity check countdown math.
  const getTimerDebugInfo = (tileIndex) => {
    
    const plantData = window.fjFarm?.state?.getPlant?.(tileIndex);
    if (!plantData) return '';
    
    let timer = tileTimers.get(tileIndex);
    if (!timer) {
      
      initializeTileTimer(tileIndex);
      timer = tileTimers.get(tileIndex);
    }
    
    if (!timer) return 'Timer initialization failed';

    const fmtHrs = (ms) => `${(Math.max(0, ms) / 3600000).toFixed(1)} hrs`;
    const speedModifier = getGrowthSpeedModifier(tileIndex);
    return `Watering: ${fmtHrs(timer.watering)}\nWeeding: ${fmtHrs(timer.weeding)}\nGrowth Speed: ${(speedModifier * 100).toFixed(0)}%`;
  };

  
  // Shared accelerator used by the debug panel's "+1h" button.
  const accelerateTimers = (hours = 1) => {
    const accelerationMs = hours * 60 * 60 * 1000;
    
    tileTimers.forEach((timer) => {
      timer.watering = Math.max(0, timer.watering - accelerationMs);
      timer.weeding = Math.max(0, timer.weeding - accelerationMs);
    });

    
    tileTimers.forEach((timer, tileIndex) => {
      updateTileOverlays(tileIndex);
    });

    
    try {
      window.fjTweakerModules?.farmtile?.accelerateBeeBoxes?.(hours);
    } catch (_) {}

    try {
      window.fjTweakerModules?.farmtile?.accelerateRainBarrels?.(hours);
    } catch (_) {}


  };

  
  const waterTile = (tileIndex) => {
    try {
      handleWateringTool('wcbasic', tileIndex);
    } catch (_) {}
  };

  
  const weedTile = (tileIndex) => {
    try {
      handleWeedingTool('weedbasic', tileIndex);
    } catch (_) {}
  };

  
  const startTimerMonitoring = () => {
    if (timerCheckInterval) return; 
    dlog('startTimerMonitoring');
    timerCheckInterval = setInterval(checkAndUpdateTimers, TIMER_CHECK_INTERVAL);
    checkAndUpdateTimers(); 
  };

  
  const stopTimerMonitoring = () => {
    if (timerCheckInterval) {
      clearInterval(timerCheckInterval);
      timerCheckInterval = null;
      dlog('stopTimerMonitoring');
      
      persistTimersToState(true);
    }
  };

  // Renders the tool palette (with lock overlays + upgrade buttons) inside the shared overlay rail.
  const buildUI = (host) => {
    
    root.textContent = '';

    
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'relative',
      background: '#151515',
      color: '#ddd',
      border: '1px solid #333',
      borderRadius: '8px',
      boxShadow: '0 8px 24px #0009',
      padding: '10px',
      boxSizing: 'border-box',
      width: '100%',
    });

    const grid = document.createElement('div');
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '10px',
    });
    
    const makeBtn = (item, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-farmtool-key', item.key);
      Object.assign(btn.style, {
        width: '60px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '6px',
        cursor: 'pointer',
        padding: '0',
        margin: '0 auto',
        boxShadow: 'inset 0 0 0 1px #0008',
        position: 'relative'
      });
      const isBasic = item.key.includes('basic') || item.key === 'glove' || item.key === 'bulldoze';
      const isBetter = item.key.includes('better');
      const isBest = item.key.includes('best');
      
      let locked = false;
      if (!isBasic) {
        try { locked = !window.fjFarm?.state?.isToolUnlocked?.(item.key); } catch(_) { locked = true; }
      }
      const showTip = () => {
        try {
          
          const interactModule = window.fjTweakerModules?.farminteract;
          if (interactModule?.hasSelection?.()) {
            return; 
          }
          
          const meta = TOOL_TIPS[item.key];
          if (!meta) return;
          const tipData = {
            imageSrc: resolveAssetUrl(item.icon),
            name: meta.name,
            bodyTT: meta.desc,
            hideCost: true,
          };
          
          window.fjfeFarmTT?.show?.(tipData);
        } catch (_) {}
      };
      const hideTip = () => { 
        try { 
          
          const interactModule = window.fjTweakerModules?.farminteract;
          if (interactModule?.hasSelection?.()) {
            return; 
          }
          window.fjfeFarmTT?.hide?.(); 
        } catch(_){} 
      };
      btn.addEventListener('mouseenter', showTip);
      btn.addEventListener('mouseleave', hideTip);
      btn.addEventListener('focus', showTip);
      btn.addEventListener('blur', hideTip);

      const img = document.createElement('img');
      img.alt = item.key;
      img.draggable = false;
      img.decoding = 'async';
      img.loading = 'lazy';
      img.src = resolveAssetUrl(item.icon);
      img.onerror = function(){ this.src = resolveAssetUrl('icons/error.png'); };
      Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', opacity: locked ? '0.5' : '1' });

      btn.appendChild(img);

      
      if (locked) {
        
        btn.style.background = 'linear-gradient(180deg,#3a0e0e,#2a0b0b)';
        btn.style.border = '1px solid #a33';
        
        const overlay = document.createElement('div');
        Object.assign(overlay.style, { position:'absolute', inset:'0', display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' });
        const lockImg = document.createElement('img');
        lockImg.alt='Locked'; lockImg.draggable=false; lockImg.decoding='async'; lockImg.loading='lazy';
        lockImg.src = resolveAssetUrl('icons/farm/locked.png');
        lockImg.onerror=function(){ this.src = resolveAssetUrl('icons/error.png'); };
        Object.assign(lockImg.style, { width:'28px', height:'28px', opacity:'1' });
        overlay.appendChild(lockImg);
        btn.appendChild(overlay);

        
  const buyBtn = document.createElement('button');
  buyBtn.type='button';
  Object.assign(buyBtn.style, { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', display:'none', padding:'2px 6px', background:'#c33', color:'#fff', border:'1px solid #a22', borderRadius:'4px', fontWeight:'700', fontSize:'12px', cursor:'pointer', pointerEvents:'auto' });
        const coin = document.createElement('img');
        coin.alt=''; coin.decoding='async'; coin.loading='lazy'; coin.draggable=false; coin.src = resolveAssetUrl('icons/farm/coin.png');
        Object.assign(coin.style, { width:'14px', height:'14px', verticalAlign:'middle', marginRight:'4px' });
        const cost = isBest ? 1500 : 500;
        const label = document.createElement('span'); label.textContent = String(cost);
        buyBtn.append(coin, label);
        btn.appendChild(buyBtn);

        btn.addEventListener('mouseenter', () => { lockImg.style.display='none'; buyBtn.style.display='inline-flex'; });
        btn.addEventListener('mouseleave', () => { lockImg.style.display='block'; buyBtn.style.display='none'; });
        buyBtn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          try {
            const have = window.fjFarm?.coins?.get?.() || 0;
            if (have < cost) {
              
              buyBtn.style.transform='translateX(-3px)'; buyBtn.style.transition='transform 80ms ease';
              setTimeout(()=>{ buyBtn.style.transform='translateX(3px)'; setTimeout(()=>{ buyBtn.style.transform='translateX(0)'; },80); },80);
              try { window.fjFarm?.audio?.play?.('deny'); } catch(_) {}
              return;
            }
            window.fjFarm?.coins?.add?.(-cost);
            window.fjFarm?.state?.unlockTool?.(item.key);
            
            btn.style.background = '#1a1a1a';
            btn.style.border = '1px solid #2a2a2a';
            img.style.opacity = '1';
            overlay.remove();
            buyBtn.remove();
            
            try {
              const interactModule = window.fjTweakerModules?.farminteract;
              if (interactModule && interactModule.wireButton) {
                interactModule.wireButton(btn, { key: item.key, icon: item.icon, type: 'tool' });
              }
            } catch(_) {}
          } catch(_) {}
        });
        
        btn.addEventListener('click', (ev) => {
          try {
            
            const unlockedNow = !!window.fjFarm?.state?.isToolUnlocked?.(item.key);
            if (!unlockedNow && ev.target !== buyBtn) {
              window.fjFarm?.audio?.play?.('deny');
            }
          } catch(_) {}
        });
      }
      return btn;
    };

    buttonsMeta = [];
    TOOL_ICONS.forEach((item, idx) => {
      const btn = makeBtn(item, idx);
      let row = Math.floor(idx / 4) + 1;
      let col = (idx % 4) + 1;
      
      if (item.key === 'glove') {
        row = Math.floor(12 / 4) + 1; 
        col = 2;
        btn.style.gridRow = String(row);
        btn.style.gridColumn = String(col);
      } else if (item.key === 'bulldoze') {
        row = Math.floor(12 / 4) + 1; 
        col = 3;
        btn.style.gridRow = String(row);
        btn.style.gridColumn = String(col);
      }
      grid.appendChild(btn);
      const tipMeta = TOOL_TIPS[item.key] || null;
      
      
      try {
        const interactModule = window.fjTweakerModules?.farminteract;
        const isBasic = item.key.includes('basic') || item.key === 'glove' || item.key === 'bulldoze';
        const unlocked = isBasic || !!window.fjFarm?.state?.isToolUnlocked?.(item.key);
        if (unlocked && interactModule && interactModule.wireButton) {
          const wiredBtn = interactModule.wireButton(btn, { key: item.key, icon: item.icon, type: 'tool' });
          buttonsMeta.push({ key: item.key, icon: item.icon, el: wiredBtn, row, col, name: tipMeta?.name, description: tipMeta?.desc });
        } else {
          buttonsMeta.push({ key: item.key, icon: item.icon, el: btn, row, col, name: tipMeta?.name, description: tipMeta?.desc });
        }
      } catch (_) {
        buttonsMeta.push({ key: item.key, icon: item.icon, el: btn, row, col, name: tipMeta?.name, description: tipMeta?.desc });
      }
    });

    box.appendChild(grid);
    root.appendChild(box);
  };

  const open = (host) => {
    if (isOpen || !host) return;
    root = document.createElement('div');
    root.id = 'fj-farmtools';
    Object.assign(root.style, {
      position: 'absolute', left: '0', top: '0', width: '320px', height: 'auto',
      background: 'transparent', color: '#ddd', overflow: 'visible',
      transform: 'translateX(-12px)', opacity: '0',
      transition: 'transform 160ms cubic-bezier(.2,.9,.2,1), opacity 140ms ease',
    });
    
    bootstrapTimersFromFarm();
    startTimerMonitoring();
    buildUI(host);
    host.appendChild(root);
    requestAnimationFrame(() => { root.style.transform = 'translateX(0)'; root.style.opacity = '1'; });
    isOpen = true;
  };

  const close = () => {
    if (!isOpen || !root) return;
    try {
  root.style.transform = 'translateX(-12px)';
      root.style.opacity = '0';
      setTimeout(() => { root?.remove(); root = null; }, 160);
    } finally { isOpen = false; }
  };

  
  // Bulldozer entry point figures out whether the target is an object or plant before selling it.
  const handleBulldozer = (tileElement, tileIndex) => {
    
    const objectData = window.fjFarm?.state?.getObject?.(tileIndex);
    if (objectData) {
      
      return handleBulldozerObject(tileElement, tileIndex, objectData);
    }
    
    
    const plantData = window.fjFarm?.state?.getPlant?.(tileIndex);
    if (plantData) {
      
      return handleBulldozerPlant(tileElement, tileIndex, plantData);
    }
    
    return false;
  };

  
  // Handles multi-tile props (fountains, sheds, etc.) and awards 75% of the purchase price.
  const handleBulldozerObject = (tileElement, tileIndex, objectData) => {
    
    
    
    let baseCost = 0;
    try { baseCost = Number(objectData?.cost) || 0; } catch(_) { baseCost = 0; }
    if (!isFinite(baseCost) || baseCost <= 0) {
      try {
        const shopModule = window.fjTweakerModules?.farmshop;
        const fallback = shopModule?.getObjectCost?.(objectData?.objectName);
        baseCost = (Number(fallback) || 0);
      } catch(_) { baseCost = 0; }
    }
  const sellPrice = Math.ceil(Math.max(0, baseCost) * 0.75);
    
    
    window.fjFarm?.coins?.add?.(sellPrice);
    
    
    const size = objectData.size || { width: 1, height: 1 };
    const anchorIndex = objectData.anchorIndex || tileIndex;
    
    const tileStrip = document.getElementById('fj-farm-tiles');
    if (tileStrip) {
      const tiles = Array.from(tileStrip.children);
      const totalCols = 8;
      const anchorRow = Math.floor(anchorIndex / totalCols);
      const anchorCol = anchorIndex % totalCols;
      
      
      for (let row = anchorRow; row < anchorRow + size.height; row++) {
        for (let col = anchorCol; col < anchorCol + size.width; col++) {
          const removeIndex = row * totalCols + col;
          if (removeIndex < tiles.length) {
            
            window.fjFarm?.state?.setObject?.(removeIndex, null);
            
            
            const tile = tiles[removeIndex];
            const objectOverlay = tile?.querySelector?.('.object-overlay');
            if (objectOverlay) {
              objectOverlay.remove();
            }
          }
        }
      }
    }
    
    
    try { window.fjFarm?.audio?.play?.('sell'); } catch(_) {}
    try { showSaleFloat(tileElement, sellPrice); } catch(_) {}
    return true;
  };

  
  // Similar payout logic for crops/trees plus timer cleanup + tile art reset.
  const handleBulldozerPlant = (tileElement, tileIndex, plantData) => {
    const seedsModule = getSeedsModule();
    const anchorEntry = seedsModule?.resolvePlantAnchor?.(tileIndex);
    const anchorIndex = anchorEntry?.index ?? tileIndex;
    const anchorData = anchorEntry?.data || plantData || null;

    let seedCost = 0;
    const seedName = anchorData?.seedName || plantData?.seedName;
    if (anchorData && typeof anchorData.cost !== 'undefined') {
      seedCost = Number(anchorData.cost) || 0;
    } else if (plantData && typeof plantData.cost !== 'undefined') {
      seedCost = Number(plantData.cost) || 0;
    }
    if (!isFinite(seedCost) || seedCost <= 0) {
      try {
        const seedTips = seedsModule?.getSeedTips?.() || {};
        const meta = seedName ? seedTips?.[seedName] : null;
        seedCost = Number(meta?.prc) || 0;
      } catch (_) {
        seedCost = 0;
      }
    }
    const sellPrice = Math.ceil(Math.max(0, seedCost) * 0.75);
    if (sellPrice) {
      window.fjFarm?.coins?.add?.(sellPrice);
    }

    const tileStrip = document.getElementById('fj-farm-tiles');
    const tiles = tileStrip ? Array.from(tileStrip.children) : [];
    const totalCols = 8;

    const indicesToClear = [];
    if (anchorData?.isTree) {
      const footprint = anchorData.size || seedsModule?.getSeedFootprint?.(seedName) || { width: 1, height: 1 };
      const width = Math.max(1, Number(footprint.width) || 1);
      const height = Math.max(1, Number(footprint.height) || 1);
      const anchorRow = Math.floor(anchorIndex / totalCols);
      const anchorCol = anchorIndex % totalCols;
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          const idx = (anchorRow + row) * totalCols + (anchorCol + col);
          if (idx >= 0 && idx < tiles.length) {
            indicesToClear.push(idx);
          }
        }
      }
    } else {
      indicesToClear.push(anchorIndex);
    }

    if (!indicesToClear.length) indicesToClear.push(tileIndex);

    let timersAdjusted = false;
    indicesToClear.forEach((idx) => {
      window.fjFarm?.state?.setPlant?.(idx, null);
      if (tileTimers.has(idx)) {
        tileTimers.delete(idx);
        timersAdjusted = true;
      }
      const targetTile = tiles[idx];
      if (targetTile) {
        const plantOverlay = targetTile.querySelector?.('.plant-overlay');
        if (plantOverlay) plantOverlay.remove();
        try {
          const currentType = window.fjFarm?.state?.getTileType?.(idx);
          if (currentType === 'tilled') {
            window.fjTweakerModules?.farmtile?.changeTile?.(targetTile, 'dirt');
          }
        } catch (_) {}
        updateTileOverlays(idx);
      }
    });

    if (timersAdjusted) {
      timersDirty = true;
      persistTimersToState(true);
    }

    try { window.fjFarm?.audio?.play?.('sell'); } catch (_) {}
    try { showSaleFloat(tileElement, sellPrice); } catch (_) {}
    return true;
  };

  
  // Little floating coin animation after selling something so the player notices the refund.
  const showSaleFloat = (tileElement, amount) => {
    try {
      if (!tileElement) return;
      let container = tileElement;
      if (tileElement.tagName === 'IMG') container = tileElement.parentNode;
      if (!container) return;
      const wrap = document.createElement('div');
      Object.assign(wrap.style, {
        position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '30',
      });
      const label = document.createElement('div');
      Object.assign(label.style, {
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, 0)',
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        color: '#f3d266', fontWeight: '900', textShadow: '0 1px 0 #000, 0 0 6px #0008',
        opacity: '1', transition: 'transform 700ms ease-out, opacity 700ms ease-out',
      });
      const coin = document.createElement('img');
      coin.alt=''; coin.decoding='async'; coin.loading='lazy'; coin.draggable=false;
      coin.src = resolveAssetUrl ? resolveAssetUrl('icons/farm/coin.png') : 'icons/farm/coin.png';
      coin.onerror = function(){ this.src = resolveAssetUrl ? resolveAssetUrl('icons/error.png') : 'icons/error.png'; };
      Object.assign(coin.style, { width:'14px', height:'14px', filter:'drop-shadow(0 0 1px #0008)' });
      const amt = document.createElement('span');
      amt.textContent = String(amount);
      label.append(coin, amt);
      wrap.appendChild(label);
      container.appendChild(wrap);
      
      requestAnimationFrame(() => {
        label.style.transform = 'translate(-50%, -28px)';
        label.style.opacity = '0';
      });
      setTimeout(() => { try { wrap.remove(); } catch(_){} }, 800);
    } catch(_) {}
  };

  let initialized = false;
  // Initializes timer tracking ASAP (even before the overlay opens) so crops never pause.
  const init = () => {
    if (initialized) return;
    initialized = true;
    
    bootstrapTimersFromFarm();
    startTimerMonitoring();

    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopTimerMonitoring();
      } else {
        startTimerMonitoring();
      }
    });

    
    window.addEventListener('beforeunload', () => {
      try { persistTimersToState(true); } catch(_) {}
    });
  };

  const getToolTips = () => TOOL_TIPS;

  window.fjTweakerModules = window.fjTweakerModules || {};
  window.fjTweakerModules[MODULE_KEY] = {
    init,
    open,
    close,
    isOpen: () => isOpen,
    getButtons: () => buttonsMeta.slice(),
    handleBulldozer,
    getToolTips,
    
    initializeTileTimer,
    removeTileTimer,
    handleWateringTool,
    handleWeedingTool,
    getGrowthSpeedModifier,
    accelerateTimers,
    getTimerDebugInfo,
    waterTile, 
    weedTile
  };

  
  if (typeof document !== 'undefined') {
    if (document.readyState !== 'loading') {
      setTimeout(() => { try { init(); } catch(_){} }, 0);
    } else {
      document.addEventListener('DOMContentLoaded', () => { try { init(); } catch(_){} }, { once: true });
    }
  }

  
  
})();
