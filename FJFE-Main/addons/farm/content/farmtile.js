(() => {
  const MODULE_KEY = 'farmtile';
  let root = null;
  let isOpen = false;
  let buttonsMeta = [];
  let coinListener = null;
  
  
  let farmDebug = { container: null };
  let farmKeySeqAttached = false;

  const TILES = [
    'dirt','grass','path',
    'mud','sand','water',
    'pavement','wood','stones',
  ];

  
  const ADDITIONAL_TILES = [
    'tilled', 
  ];

  
  
  const TILE_TIPS = {
    dirt:     { name: 'Dirt',     desc: 'The most basic tile type. Free!', prc: 0 },
    grass:    { name: 'Grass',    desc: 'Nice, green grass to brighten up the area.', prc: 10 },
    path:     { name: 'Path',     desc: 'Smooth dirt path.', prc: 6 },
    mud:      { name: 'Mud',      desc: 'Slick, gross mud. Why?', prc: 3 },
    sand:     { name: 'Sand',     desc: 'Making a beach, are you?', prc: 5 },
    water:    { name: 'Water',    desc: 'Not very deep, but makes for a nice small pond.', prc: 20 },
    pavement: { name: 'Pavement', desc: 'Cemented natural beauty.', prc: 12 },
    wood:     { name: 'Wood',     desc: 'Lovely wood paneling. Built to weather the elements.', prc: 16 },
    stones:   { name: 'Stones',   desc: 'A nice cobblestone flooring.', prc: 14 },
    tilled:   { name: 'Tilled Soil', desc: 'Fresh tilled soil, ready for planting.', prc: 0 },
  };

  const resolve = (p) => (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p;
  const iconFor = (name) => `addons/farm/icons/tiles/${name}.png`;
  const parseTags = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map(entry => String(entry || '').trim())
        .filter(Boolean);
    }
    return String(value || '')
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean);
  };

  // Builds the tile selector palette (coin counter + tile buttons) and wires hover tooltips.
  const buildUI = () => {
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
    });

    const COLS = 3, BTN = 60, GAP = 10, PAD = 10;
  
  const coinRow = document.createElement('div');
  Object.assign(coinRow.style, { display:'flex', alignItems:'center', gap:'2px', marginBottom:'8px' });
  const coinImg = document.createElement('img');
  coinImg.alt=''; coinImg.draggable=false; coinImg.decoding='async'; coinImg.loading='lazy';
  coinImg.src = resolve('addons/farm/icons/coin.png');
  coinImg.onerror = function(){ this.src = resolve('icons/error.png'); };
  Object.assign(coinImg.style, { width:'16px', height:'16px' });
  const coinText = document.createElement('span');
  Object.assign(coinText.style, { color:'#f3d266', fontWeight:'700' });
  const refreshCoins = () => { try { const c = window.fjFarm?.coins?.get?.() || 0; coinText.textContent = String(c); } catch(_) {} };
  refreshCoins();
  
  const coinListener = () => refreshCoins();
  window.addEventListener('fjFarmCoinsChanged', coinListener);
  
  coinRow._coinListener = coinListener;
  coinRow.append(coinImg, coinText);

  const grid = document.createElement('div');
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: `repeat(${COLS}, ${BTN}px)`,
      gap: `${GAP}px`,
    });

    const boxWidth = (COLS * BTN) + ((COLS - 1) * GAP) + (PAD * 2);
    box.style.width = boxWidth + 'px';
    root.style.width = boxWidth + 'px';

    const makeBtn = (name, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-tile-key', name);
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
        margin: '0',
        boxShadow: 'inset 0 0 0 1px #0008',
      });

      const showTip = () => {
        try {
          const interactModule = window.fjTweakerModules?.farminteract;
          if (interactModule?.hasSelection?.()) {
            return;
          }
          const meta = TILE_TIPS[name];
          if (!meta) return;
          window.fjfeFarmTT?.show?.({
            imageSrc: resolve(iconFor(name)),
            name: meta.name,
            bodyTT: meta.desc,
            cost: String(meta.prc ?? ''),
            costIcon: 'addons/farm/icons/coin.png',
          });
        } catch (_) {}
      };
      const hideTip = () => {
        try {
          const interactModule = window.fjTweakerModules?.farminteract;
          if (interactModule?.hasSelection?.()) {
            return;
          }
          window.fjfeFarmTT?.hide?.();
        } catch (_) {}
      };
      btn.addEventListener('mouseenter', showTip);
      btn.addEventListener('mouseleave', hideTip);
      btn.addEventListener('focus', showTip);
      btn.addEventListener('blur', hideTip);

      const img = document.createElement('img');
      img.alt = name;
      img.draggable = false;
      img.decoding = 'async';
      img.loading = 'lazy';
      img.src = resolve(iconFor(name));
      img.onerror = function(){ this.src = resolve('icons/error.png'); };
      Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover' });

      btn.appendChild(img);
      return btn;
    };

    buttonsMeta = [];
    TILES.forEach((name, idx) => {
      const btn = makeBtn(name, idx);
      const row = Math.floor(idx / COLS) + 1;
      const col = (idx % COLS) + 1;
      grid.appendChild(btn);
      const t = TILE_TIPS[name] || { name, desc: 'TBD', prc: 0 };
      
      
      try {
        const interactModule = window.fjTweakerModules?.farminteract;
        if (interactModule && interactModule.wireButton) {
          const wiredBtn = interactModule.wireButton(btn, { key: name, icon: iconFor(name), type: 'tile' });
          buttonsMeta.push({ key: name, name: t.name, icon: iconFor(name), el: wiredBtn, row, col, desc: t.desc, prc: t.prc });
        } else {
          buttonsMeta.push({ key: name, name: t.name, icon: iconFor(name), el: btn, row, col, desc: t.desc, prc: t.prc });
        }
      } catch (_) {
        buttonsMeta.push({ key: name, name: t.name, icon: iconFor(name), el: btn, row, col, desc: t.desc, prc: t.prc });
      }
    });

    box.appendChild(coinRow);
    box.appendChild(grid);
    root.appendChild(box);
  };

  
  // Developer-only helper panel surfaced through a secret key combo for rapid testing.
  const buildFarmDebugPanel = () => {
    try {
      if (farmDebug.container) return farmDebug.container;
      const box = document.createElement('div');
      box.setAttribute('data-role','fjfe-farm-debug');
      Object.assign(box.style, {
        position:'fixed', bottom:'20px', left:'20px', zIndex:'2147483647',
        background:'#151515', color:'#ddd', border:'1px solid #333', borderRadius:'8px',
        boxShadow:'0 8px 24px #0009', padding:'10px', display:'flex', gap:'8px', alignItems:'center'
      });
      const label = document.createElement('div');
      label.textContent = 'Farm Debug';
      Object.assign(label.style, { fontWeight:'700', marginRight:'6px' });
      const mkBtn = (txt, onClick) => {
        const b = document.createElement('button');
        b.type='button'; b.textContent=txt;
        Object.assign(b.style, { padding:'4px 8px', background:'#2a2a2a', color:'#fff', border:'1px solid #444', borderRadius:'4px', cursor:'pointer' });
        b.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); try { onClick(); } catch(_){} });
        return b;
      };
      const accel = mkBtn('+1h', ()=>{
        try {
          
          if (window.fjTweakerModules?.farmseeds?.accelerateAllPlants) {
            window.fjTweakerModules.farmseeds.accelerateAllPlants(1);
          } else {
            
            window.fjTweakerModules?.farmtools?.accelerateTimers?.(1);
          }
        } catch(_){}
      });
      const add100 = mkBtn('+100 coins', ()=>{ 
        try { 
          window.fjFarm?.coins?.add?.(100);
        } catch(_) {}
        try { window.dispatchEvent(new Event('fjFarmCoinsChanged')); } catch(_) {}
      });
      const till = mkBtn('Till All', ()=>{ try { window.fjTweakerModules?.farmtile?.tillAllSoil?.(); } catch(_){} });
      const water = mkBtn('Water All', ()=>{ try { window.fjTweakerModules?.farmtile?.waterAllCrops?.(); } catch(_){} });
      const weed = mkBtn('Weed All', ()=>{ try { window.fjTweakerModules?.farmtile?.weedAllCrops?.(); } catch(_){} });
      const harvest = mkBtn('Harvest All', ()=>{ try { window.fjTweakerModules?.farmtile?.harvestAllGrownCrops?.(); } catch(_){} });
      const close = mkBtn('×', ()=>{ try { toggleFarmDebug(false); } catch(_){} });
      close.style.fontWeight='900'; close.style.padding='2px 8px';
      box.append(label, accel, add100, till, water, weed, harvest, close);
      document.body.appendChild(box);
      farmDebug.container = box;
      return box;
    } catch(_) { return null; }
  };

  // Shows/Hides the floating debug widget without touching the rest of the overlay layout.
  const toggleFarmDebug = (force) => {
    try {
      const want = (typeof force === 'boolean') ? force : !farmDebug.container;
      if (want) {
        if (!farmDebug.container) buildFarmDebugPanel();
      } else {
        if (farmDebug.container && farmDebug.container.parentNode) farmDebug.container.parentNode.removeChild(farmDebug.container);
        farmDebug.container = null;
      }
    } catch(_) {}
  };

  const open = (host) => {
    if (isOpen || !host) return;
    root = document.createElement('div');
    root.id = 'fj-farmtile';
    Object.assign(root.style, {
      position: 'absolute', left: '0', top: '0', height: 'auto',
      background: 'transparent', color: '#ddd', overflow: 'visible',
      transform: 'translateX(-12px)', opacity: '0',
      transition: 'transform 160ms cubic-bezier(.2,.9,.2,1), opacity 140ms ease',
    });

    buildUI();
    host.appendChild(root);
    requestAnimationFrame(() => { root.style.transform = 'translateX(0)'; root.style.opacity = '1'; });
    isOpen = true;
  };

  const close = () => {
    if (!isOpen || !root) return;
    try {
      root.style.transform = 'translateX(-12px)';
      root.style.opacity = '0';
      setTimeout(() => { root?.remove(); root = null; }, 180);
    } finally { isOpen = false; }
  };

  
  // Attaches a Konami-style key chord for revealing the debug controls outside of UI menus.
  const setupFarmDebugKeySequence = () => {
    if (farmKeySeqAttached) return;
    const seq = ['ArrowUp','ArrowDown','\\',']','['];
    let idx = 0; let timer = null;
    const reset = () => { idx = 0; if (timer) { clearTimeout(timer); timer = null; } };
    const isTyping = () => {
      const ae = document.activeElement;
      if (!ae) return false;
      const tag = (ae.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return true;
      if (ae.isContentEditable) return true;
      return false;
    };
    document.addEventListener('keydown', (e) => {
      try {
        if (isTyping()) return;
        const key = e.key;
        const expected = seq[idx];
        if (key === expected) {
          idx++;
          if (idx === seq.length) {
            
            toggleFarmDebug();
            reset();
          } else {
            if (timer) clearTimeout(timer);
            timer = setTimeout(reset, 4000);
          }
        } else {
          reset();
        }
      } catch(_) { reset(); }
    }, { capture: true });
    farmKeySeqAttached = true;
  };

  
  // Central module lookups used repeatedly throughout this file.
  const getSeedsModule = () => window.fjTweakerModules?.farmseeds;

  const TREE_ALLOWED_TILES = new Set(['tilled', 'dirt', 'soil', 'grass']);
  const buildOffsetKey = (row, col) => `${row}:${col}`;
  const isNonWaterTile = (tileType) => tileType !== 'water';
  // Object placement uses compatibility specs so that large props only inspect the tiles that matter.
  const buildTreeCompatibilityOffsets = (footprint) => {
    const width = Math.max(1, Number(footprint?.width) || 1);
    const height = Math.max(1, Number(footprint?.height) || 1);
    const bottomRow = height - 1;
    const middleCol = Math.floor(width / 2);
    return new Set([buildOffsetKey(bottomRow, middleCol)]);
  };
  const getObjectCompatibilitySpec = (objectName, size) => {
    const key = String(objectName || '').toLowerCase();
    const width = Math.max(1, Number(size?.width) || 1);
    const height = Math.max(1, Number(size?.height) || 1);
    const offsets = new Set();
    const fillLowerRows = (rows) => {
      const startRow = Math.max(0, height - rows);
      for (let row = startRow; row < height; row++) {
        for (let col = 0; col < width; col++) {
          offsets.add(buildOffsetKey(row, col));
        }
      }
    };
    const fillBottomRow = () => {
      const bottomRow = height - 1;
      for (let col = 0; col < width; col++) {
        offsets.add(buildOffsetKey(bottomRow, col));
      }
    };

    switch (key) {
      case 'tree': {
        const bottomRow = height - 1;
        const middleCol = Math.floor(width / 2);
        offsets.add(buildOffsetKey(bottomRow, middleCol));
        return { offsets, requireOnListedOnly: true, allowed: (tileType) => TREE_ALLOWED_TILES.has(tileType) };
      }
      case 'fountain':
      case 'tool_shed':
      case 'gazebo':
        fillLowerRows(2);
        return { offsets, requireOnListedOnly: true, allowed: (tileType) => isNonWaterTile(tileType) };
      case 'well':
      case 'arch':
        fillBottomRow();
        return { offsets, requireOnListedOnly: true, allowed: (tileType) => isNonWaterTile(tileType) };
      case 'lamp_post': {
        const bottomRow = height - 1;
        offsets.add(buildOffsetKey(bottomRow, 0));
        return { offsets, requireOnListedOnly: true, allowed: (tileType) => isNonWaterTile(tileType) };
      }
      case 'tree_stump':
      case 'flowers':
        return { offsets: new Set([buildOffsetKey(0, 0)]), requireOnListedOnly: false, allowed: (tileType) => TREE_ALLOWED_TILES.has(tileType) };
      default:
        return { offsets: new Set(), requireOnListedOnly: false, allowed: (tileType) => isNonWaterTile(tileType) };
    }
  };
  // Meta describing special interactive props and consumables.
  const COMPOST_BIN_KEY = 'compost_bin';
  const COMPOST_BIN_FULL_THRESHOLD = 300;
  const BEE_BOX_KEY = 'beebox';
  const RAIN_BARREL_KEY = 'rain_barrel';
  const FLOWER_OBJECT_KEY = 'flowers';
  const TOOL_SHED_OBJECT_KEY = 'tool_shed';
  const HONEY_ITEM_KEY = 'honey';
  const WATER_ITEM_KEY = 'water';
  const BEE_BOX_BASE_DURATION_MS = 9 * 60 * 60 * 1000;
  const BEE_BOX_SPEED_PER_FLOWER = 0.1;
  const BEE_BOX_ICON_EMPTY = 'bee_box_empty';
  const BEE_BOX_ICON_FULL = 'bee_box_full';
  const BEE_BOX_MONITOR_INTERVAL_MS = 60000;
  const RAIN_BARREL_ICON_EMPTY = 'rain_barrel_empty';
  const RAIN_BARREL_ICON_FULL = 'rain_barrel_full';
  const RAIN_BARREL_INTERVAL_MS = 2 * 60 * 60 * 1000;
  const RAIN_BARREL_MAX_STORAGE = 5;
  const FERTILIZER_ITEM_KEY = 'fertilizer';
  const FERTILIZED_TAG_LABEL = 'Fertilized';
  const normalizeItemKey = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, '_');
  const toPositiveInteger = (value) => {
    const parsed = Math.round(Number(value) || 0);
    return parsed > 0 ? parsed : 0;
  };
  const isFertilizerSelection = (selection) => {
    if (!selection || selection.type !== 'inventory-item') return false;
    const raw = selection.item || selection.key;
    if (!raw) return false;
    return normalizeItemKey(raw) === FERTILIZER_ITEM_KEY;
  };
  // --- Compost Bin helpers -------------------------------------------------
  const resolveCompostValue = (objectData) => toPositiveInteger(objectData?.compostValue);
  const resolveCompostBinIconKey = (value) => (value >= COMPOST_BIN_FULL_THRESHOLD ? 'compost_bin_full' : 'compost_bin_empty');
  const isCompostableSelection = (selection) => {
    if (!selection || selection.type !== 'inventory-item') return false;
    const kind = String(selection.itemType || '').toLowerCase();
    return kind === 'plant' || kind === 'food' || kind === 'ingredient' || kind === 'recipe' || kind === '';
  };
  const resolveCompostContributionValue = (selection) => {
    if (!selection) return 0;
    const pricing = window.fjFarm?.pricing;
    if (!pricing?.getPriceForItem) return 0;
    const rawName = selection.item || selection.key;
    if (!rawName) return 0;
    const kind = String(selection.itemType || '').toLowerCase() || 'plant';

    if (kind === 'plant') {
      return toPositiveInteger(pricing.getPriceForItem(rawName, 'plant'));
    }

    if (kind === 'ingredient' || kind === 'recipe' || kind === 'food') {
      try {
        const cook = window.fjTweakerModules?.farmcook;
        const ingredients = cook?.INGREDIENTS?.() || [];
        const recipes = cook?.RECIPES?.() || [];
        const norm = normalizeItemKey(rawName);
        const flatten = (cook && typeof cook.flattenTokens === 'function') ? cook.flattenTokens : null;

        if (kind !== 'recipe') {
          const ingredientEntry = ingredients.find(entry => normalizeItemKey(entry?.name) === norm);
          if (ingredientEntry) {
            const tokens = flatten ? flatten(ingredientEntry.ing) : (ingredientEntry.ing || []);
            return toPositiveInteger(pricing.getPriceForItem(ingredientEntry.name, 'ingredient', { tokens }) || 0);
          }
        }

        const recipeEntry = recipes.find(entry => normalizeItemKey(entry?.name) === norm);
        if (recipeEntry) {
          const tokens = flatten ? flatten(recipeEntry.ing) : (recipeEntry.ing || []);
          return toPositiveInteger(pricing.getPriceForItem(recipeEntry.name, 'recipe', { tokens }) || 0);
        }

        if (kind === 'ingredient' || kind === 'food') {
          return toPositiveInteger(pricing.getPriceForItem(rawName, 'ingredient'));
        }
        if (kind === 'recipe') {
          return toPositiveInteger(pricing.getPriceForItem(rawName, 'recipe'));
        }
      } catch (_) {
        return 0;
      }
    }

    return 0;
  };
  const getRelativeOffset = (anchorIndex, tileIndex) => {
    if (!Number.isInteger(anchorIndex) || !Number.isInteger(tileIndex)) return null;
    const totalCols = FARMTILE_COLS;
    const anchorRow = Math.floor(anchorIndex / totalCols);
    const anchorCol = anchorIndex % totalCols;
    const tileRow = Math.floor(tileIndex / totalCols);
    const tileCol = tileIndex % totalCols;
    return { row: tileRow - anchorRow, col: tileCol - anchorCol };
  };
  const FARMTILE_COLS = 8;
  const forEachObjectFootprintIndex = (anchorIndex, size, iteratee) => {
    if (!Number.isInteger(anchorIndex) || typeof iteratee !== 'function') return;
    const totalCols = FARMTILE_COLS;
    const startRow = Math.floor(anchorIndex / totalCols);
    const startCol = anchorIndex % totalCols;
    const width = Math.max(1, Number(size?.width) || 1);
    const height = Math.max(1, Number(size?.height) || 1);

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const idx = (startRow + row) * totalCols + (startCol + col);
        iteratee(idx, row, col);
      }
    }
  };
  const applyCompostValueToState = (anchorIndex, objectData, nextValue) => {
    if (!objectData || !Number.isInteger(anchorIndex)) return resolveCompostValue(objectData);
    const sanitized = toPositiveInteger(nextValue);
    const size = objectData.size || window.fjFarm?.getObjectSize?.(objectData.objectName) || { width: 1, height: 1 };

    forEachObjectFootprintIndex(anchorIndex, size, (idx) => {
      const isAnchor = idx === anchorIndex;
      const existing = window.fjFarm?.state?.getObject?.(idx);
      if (!existing && !isAnchor) return;

      const base = isAnchor ? objectData : (existing || {});
      const payload = {
        ...base,
        compostValue: sanitized,
        isAnchor,
        anchorIndex,
        objectName: objectData.objectName,
        size: objectData.size || existing?.size || size,
      };
      if (typeof payload.cost !== 'number') payload.cost = objectData.cost ?? existing?.cost ?? 0;
      if (typeof payload.placedAt !== 'number') payload.placedAt = objectData.placedAt ?? Date.now();

      window.fjFarm?.state?.setObject?.(idx, payload);
    });

    objectData.compostValue = sanitized;
    return sanitized;
  };

  // --- Bee Box lifecycle ---------------------------------------------------
  const resolveBeeBoxIconKey = (objectData, progressInfo) => {
    const ready = progressInfo ? Boolean(progressInfo.ready) : Boolean(objectData?.honeyReady);
    return ready ? BEE_BOX_ICON_FULL : BEE_BOX_ICON_EMPTY;
  };

  const commitBeeBoxState = (anchorIndex, objectData, overrides = {}) => {
    if (!objectData || !Number.isInteger(anchorIndex)) return objectData;
    const merged = { ...objectData, ...overrides };

    if (typeof merged.honeyCycleStart !== 'number' || !Number.isFinite(merged.honeyCycleStart)) {
      merged.honeyCycleStart = Date.now();
    }
    if (typeof merged.honeyCollectedAt !== 'number' || !Number.isFinite(merged.honeyCollectedAt)) {
      merged.honeyCollectedAt = merged.honeyCycleStart;
    }
    merged.honeyReady = Boolean(merged.honeyReady);
    if (!merged.honeyReady && 'honeyReadyAt' in merged) {
      delete merged.honeyReadyAt;
    } else if (merged.honeyReady && (typeof merged.honeyReadyAt !== 'number' || !Number.isFinite(merged.honeyReadyAt))) {
      merged.honeyReadyAt = Date.now();
    }

    const size = merged.size || window.fjFarm?.getObjectSize?.(merged.objectName) || { width: 1, height: 1 };

    forEachObjectFootprintIndex(anchorIndex, size, (idx) => {
      const isAnchor = idx === anchorIndex;
      const existing = window.fjFarm?.state?.getObject?.(idx) || {};
      const payload = {
        ...(isAnchor ? merged : existing),
        isAnchor,
        anchorIndex,
        objectName: merged.objectName,
        size: merged.size || existing.size || size,
      };
      payload.cost = merged.cost ?? existing.cost ?? 0;
      payload.placedAt = merged.placedAt ?? existing.placedAt ?? Date.now();
      payload.honeyCycleStart = merged.honeyCycleStart;
      payload.honeyCollectedAt = merged.honeyCollectedAt;
      payload.honeyReady = merged.honeyReady;
      if (merged.honeyReady && merged.honeyReadyAt != null) {
        payload.honeyReadyAt = merged.honeyReadyAt;
      } else if ('honeyReadyAt' in payload) {
        delete payload.honeyReadyAt;
      }
      window.fjFarm?.state?.setObject?.(idx, payload);
    });

    Object.assign(objectData, merged);
    return objectData;
  };

  const ensureBeeBoxState = (anchorIndex, objectData) => {
    if (!objectData) return null;
    const patch = {};
    let changed = false;

    if (typeof objectData.honeyCycleStart !== 'number' || !Number.isFinite(objectData.honeyCycleStart)) {
      patch.honeyCycleStart = Date.now();
      changed = true;
    }
    if (typeof objectData.honeyCollectedAt !== 'number' || !Number.isFinite(objectData.honeyCollectedAt)) {
      patch.honeyCollectedAt = patch.honeyCycleStart || Date.now();
      changed = true;
    }
    if (typeof objectData.honeyReady !== 'boolean') {
      patch.honeyReady = false;
      changed = true;
    }
    if (objectData.honeyReady === false && objectData.honeyReadyAt != null) {
      patch.honeyReadyAt = undefined;
      changed = true;
    }

    if (!changed) return objectData;
    if (patch.honeyReadyAt === undefined) delete patch.honeyReadyAt;
    return commitBeeBoxState(anchorIndex, objectData, patch);
  };

  const countAdjacentFlowers = (anchorIndex, objectData) => {
    const tileStrip = document.getElementById('fj-farm-tiles');
    if (!tileStrip || !Number.isInteger(anchorIndex)) return 0;
    const tiles = tileStrip.children;
    const totalTiles = tiles.length;
    const totalCols = FARMTILE_COLS;
    const totalRows = totalTiles ? Math.ceil(totalTiles / totalCols) : 0;
    const size = objectData?.size || window.fjFarm?.getObjectSize?.(objectData?.objectName) || { width: 1, height: 1 };
    const startRow = Math.floor(anchorIndex / totalCols);
    const startCol = anchorIndex % totalCols;
    const flowerAnchors = new Set();

    for (let row = startRow - 1; row <= startRow + size.height; row++) {
      for (let col = startCol - 1; col <= startCol + size.width; col++) {
        if (row < 0 || col < 0 || col >= totalCols || row >= totalRows) continue;
        if (row >= startRow && row < startRow + size.height && col >= startCol && col < startCol + size.width) continue;
        const idx = row * totalCols + col;
        if (idx < 0 || idx >= totalTiles) continue;
        const anchor = resolveObjectAnchor(idx);
        if (!anchor) continue;
        if (String(anchor.objectName || '').toLowerCase() !== FLOWER_OBJECT_KEY) continue;
        const anchorIdx = Number.isInteger(anchor.anchorIndex) ? anchor.anchorIndex : idx;
        flowerAnchors.add(anchorIdx);
      }
    }

    return flowerAnchors.size;
  };

  const resolveBeeBoxSpeedInfo = (anchorIndex, objectData) => {
    const normalized = ensureBeeBoxState(anchorIndex, objectData) || objectData;
    const flowers = countAdjacentFlowers(anchorIndex, normalized);
    const multiplier = 1 + (flowers * BEE_BOX_SPEED_PER_FLOWER);
    return {
      flowers,
      multiplier,
      bonusPercent: Math.max(0, Math.round((multiplier - 1) * 100)),
    };
  };

  const resolveBeeBoxProgress = (anchorIndex, objectData, options = {}) => {
    const { commitReady = true } = options;
    const normalized = ensureBeeBoxState(anchorIndex, objectData) || objectData;
    const speedInfo = resolveBeeBoxSpeedInfo(anchorIndex, normalized);
    if (!normalized) {
      return { progress: 0, ready: false, ...speedInfo };
    }

    if (normalized.honeyReady) {
      return { progress: 1, ready: true, ...speedInfo };
    }

    const now = Date.now();
    const start = typeof normalized.honeyCycleStart === 'number' ? normalized.honeyCycleStart : now;
    const duration = BEE_BOX_BASE_DURATION_MS / Math.max(0.1, speedInfo.multiplier || 1);
    const elapsed = Math.max(0, now - start);
    const progressRaw = duration > 0 ? elapsed / duration : 1;
    const progress = Math.max(0, Math.min(1, progressRaw));

    if (progress >= 1 && commitReady) {
      commitBeeBoxState(anchorIndex, normalized, { honeyReady: true, honeyReadyAt: now });
      return { progress: 1, ready: true, ...speedInfo };
    }

    return { progress, ready: progress >= 1, ...speedInfo };
  };

  const refreshBeeBoxOverlay = (anchorIndex, objectData, progressInfo) => {
    const tiles = getTileElements();
    if (!tiles.length || !Number.isInteger(anchorIndex)) return;
    const anchorTile = tiles[anchorIndex];
    if (!anchorTile) return;
    const overlay = anchorTile.querySelector?.('.object-overlay');
    if (!overlay) return;
    const iconKey = resolveBeeBoxIconKey(objectData, progressInfo);
    const desiredSrc = resolve(`addons/farm/icons/objects/${iconKey}.png`);
    if (overlay.src !== desiredSrc) {
      overlay.src = desiredSrc;
      overlay.onerror = function() {
        this.src = resolve('icons/error.png');
      };
    }
  };

  // --- Rain barrel lifecycle ----------------------------------------------
  const resolveRainBarrelIconKey = (objectData) => {
    const stored = Math.max(0, Math.round(Number(objectData?.rainWaterStored) || 0));
    return stored > 0 ? RAIN_BARREL_ICON_FULL : RAIN_BARREL_ICON_EMPTY;
  };

  const commitRainBarrelState = (anchorIndex, objectData, overrides = {}) => {
    if (!objectData || !Number.isInteger(anchorIndex)) return objectData;
    const merged = { ...objectData, ...overrides };

    const now = Date.now();
    if (typeof merged.rainWaterCycleStart !== 'number' || !Number.isFinite(merged.rainWaterCycleStart)) {
      merged.rainWaterCycleStart = now;
    }
    const stored = Math.min(
      RAIN_BARREL_MAX_STORAGE,
      Math.max(0, Math.round(Number(merged.rainWaterStored) || 0))
    );
    merged.rainWaterStored = stored;

    const size = merged.size || window.fjFarm?.getObjectSize?.(merged.objectName) || { width: 1, height: 1 };

    forEachObjectFootprintIndex(anchorIndex, size, (idx) => {
      const isAnchor = idx === anchorIndex;
      const existing = window.fjFarm?.state?.getObject?.(idx) || {};
      const payload = {
        ...(isAnchor ? merged : existing),
        isAnchor,
        anchorIndex,
        objectName: merged.objectName,
        size: merged.size || existing.size || size,
      };
      payload.cost = merged.cost ?? existing.cost ?? 0;
      payload.placedAt = merged.placedAt ?? existing.placedAt ?? now;
      payload.rainWaterStored = merged.rainWaterStored;
      payload.rainWaterCycleStart = merged.rainWaterCycleStart;
      window.fjFarm?.state?.setObject?.(idx, payload);
    });

    Object.assign(objectData, merged);
    return objectData;
  };

  const ensureRainBarrelState = (anchorIndex, objectData) => {
    if (!objectData) return null;
    const patch = {};
    let changed = false;

    if (typeof objectData.rainWaterCycleStart !== 'number' || !Number.isFinite(objectData.rainWaterCycleStart)) {
      patch.rainWaterCycleStart = Date.now();
      changed = true;
    }
    const stored = Math.min(
      RAIN_BARREL_MAX_STORAGE,
      Math.max(0, Math.round(Number(objectData.rainWaterStored) || 0))
    );
    if (stored !== objectData.rainWaterStored) {
      patch.rainWaterStored = stored;
      changed = true;
    }

    if (!changed) return objectData;
    return commitRainBarrelState(anchorIndex, objectData, patch);
  };

  const resolveRainBarrelProgress = (anchorIndex, objectData, options = {}) => {
    const { commitState = true } = options;
    const normalized = ensureRainBarrelState(anchorIndex, objectData) || objectData;
    if (!normalized) {
      return { progress: 0, stored: 0 };
    }

    let stored = Math.min(
      RAIN_BARREL_MAX_STORAGE,
      Math.max(0, Math.round(Number(normalized.rainWaterStored) || 0))
    );
    let cycleStart = typeof normalized.rainWaterCycleStart === 'number' && Number.isFinite(normalized.rainWaterCycleStart)
      ? normalized.rainWaterCycleStart
      : Date.now();
    const now = Date.now();
    let changed = false;

    if (stored < RAIN_BARREL_MAX_STORAGE) {
      const elapsed = Math.max(0, now - cycleStart);
      if (elapsed >= RAIN_BARREL_INTERVAL_MS) {
        const cycles = Math.floor(elapsed / RAIN_BARREL_INTERVAL_MS);
        if (cycles > 0) {
          const freeSpace = RAIN_BARREL_MAX_STORAGE - stored;
          const gained = Math.min(cycles, Math.max(0, freeSpace));
          if (gained > 0) {
            stored += gained;
            changed = true;
          }
          if (stored >= RAIN_BARREL_MAX_STORAGE) {
            cycleStart = now;
            changed = true;
          } else {
            const consumedCycles = gained;
            const remainder = Math.max(0, elapsed - (consumedCycles * RAIN_BARREL_INTERVAL_MS));
            cycleStart = now - remainder;
            changed = true;
          }
        }
      }
    } else {
      cycleStart = now;
    }

    const interval = RAIN_BARREL_INTERVAL_MS;
    const progress = stored >= RAIN_BARREL_MAX_STORAGE
      ? 1
      : Math.max(0, Math.min(1, (now - cycleStart) / interval));

    if (commitState && changed) {
      commitRainBarrelState(anchorIndex, normalized, {
        rainWaterStored: stored,
        rainWaterCycleStart: cycleStart,
      });
    }

    return { progress, stored };
  };

  const refreshRainBarrelOverlay = (anchorIndex, objectData, progressInfo) => {
    const tiles = getTileElements();
    if (!tiles.length || !Number.isInteger(anchorIndex)) return;
    const anchorTile = tiles[anchorIndex];
    if (!anchorTile) return;
    const overlay = anchorTile.querySelector?.('.object-overlay');
    if (!overlay) return;
    const iconKey = resolveRainBarrelIconKey(objectData, progressInfo);
    const desiredSrc = resolve(`addons/farm/icons/objects/${iconKey}.png`);
    if (overlay.src !== desiredSrc) {
      overlay.src = desiredSrc;
      overlay.onerror = function() {
        this.src = resolve('icons/error.png');
      };
    }
  };

  let beeBoxMonitorHandle = null;
  const refreshAllBeeBoxes = () => {
    try {
      const tileStrip = document.getElementById('fj-farm-tiles');
      if (!tileStrip) return;
      const tiles = tileStrip.children;
      const totalTiles = tiles.length;
      for (let i = 0; i < totalTiles; i++) {
        const objectData = window.fjFarm?.state?.getObject?.(i);
        if (!objectData || !objectData.isAnchor) continue;
        if (String(objectData.objectName || '').toLowerCase() !== BEE_BOX_KEY) continue;
        const progressInfo = resolveBeeBoxProgress(i, objectData, { commitReady: true });
        refreshBeeBoxOverlay(i, objectData, progressInfo);
      }
      try {
        window.fjTweakerModules?.farmtile?.refreshTooltipForHoveredTile?.();
      } catch (_) {}
    } catch (_) {}
  };

  const ensureBeeBoxMonitor = () => {
    if (beeBoxMonitorHandle) return;
    refreshAllBeeBoxes();
    beeBoxMonitorHandle = setInterval(refreshAllBeeBoxes, BEE_BOX_MONITOR_INTERVAL_MS);
    try { beeBoxMonitorHandle.unref?.(); } catch (_) {}
  };

  let rainBarrelMonitorHandle = null;
  const refreshAllRainBarrels = () => {
    try {
      const tileStrip = document.getElementById('fj-farm-tiles');
      if (!tileStrip) return;
      const tiles = tileStrip.children;
      const totalTiles = tiles.length;
      for (let i = 0; i < totalTiles; i++) {
        const objectData = window.fjFarm?.state?.getObject?.(i);
        if (!objectData || !objectData.isAnchor) continue;
        if (String(objectData.objectName || '').toLowerCase() !== RAIN_BARREL_KEY) continue;
        const progressInfo = resolveRainBarrelProgress(i, objectData, { commitState: true });
        refreshRainBarrelOverlay(i, objectData, progressInfo);
      }
      try {
        window.fjTweakerModules?.farmtile?.refreshTooltipForHoveredTile?.();
      } catch (_) {}
    } catch (_) {}
  };

  const ensureRainBarrelMonitor = () => {
    if (rainBarrelMonitorHandle) return;
    refreshAllRainBarrels();
    rainBarrelMonitorHandle = setInterval(refreshAllRainBarrels, BEE_BOX_MONITOR_INTERVAL_MS);
    try { rainBarrelMonitorHandle.unref?.(); } catch (_) {}
  };

  // Interaction entry points for special props so the generic tile click handler can stay readable.
  const handleBeeBoxInteraction = (tileElement, tileIndex, objectData, selected, interactModule) => {
    try {
      if (!objectData || String(objectData.objectName || '').toLowerCase() !== BEE_BOX_KEY) {
        return false;
      }

      if (selected && selected.type && selected.type !== 'inventory-item') {
        return false;
      }

      const anchorIndex = Number.isInteger(objectData.anchorIndex) ? objectData.anchorIndex : tileIndex;
      const progressInfo = resolveBeeBoxProgress(anchorIndex, objectData, { commitReady: true });
      refreshBeeBoxOverlay(anchorIndex, objectData, progressInfo);

      if (!progressInfo.ready) {
        if (selected && selected.type === 'inventory-item') {
          try { window.fjFarm?.audio?.play?.('deny'); } catch (_) {}
          return true;
        }
        if (!selected) {
          try { window.fjFarm?.audio?.play?.('deny'); } catch (_) {}
          refreshTooltipForHoveredTile();
          return true;
        }
        return false;
      }

      if (selected && selected.type === 'inventory-item') {
        try { window.fjFarm?.audio?.play?.('deny'); } catch (_) {}
        return true;
      }

      const invModule = window.fjTweakerModules?.farminv;
  const added = invModule?.addToInventory?.(HONEY_ITEM_KEY, 5, 'food');
      if (!added) {
        try { window.fjFarm?.audio?.play?.('deny'); } catch (_) {}
        return true;
      }

      commitBeeBoxState(anchorIndex, objectData, {
        honeyReady: false,
        honeyCycleStart: Date.now(),
        honeyCollectedAt: Date.now(),
      });
      refreshBeeBoxOverlay(anchorIndex, objectData, { ready: false });
      refreshTooltipForHoveredTile();
      ensureBeeBoxMonitor();
      try { window.fjFarm?.audio?.play?.('harvest'); } catch (_) {}
      return true;
    } catch (_) {
      return true;
    }
  };

  const handleRainBarrelInteraction = (tileElement, tileIndex, objectData, selected, interactModule) => {
    try {
      if (!objectData || String(objectData.objectName || '').toLowerCase() !== RAIN_BARREL_KEY) {
        return false;
      }

      if (selected && selected.type && selected.type !== 'inventory-item') {
        return false;
      }

      const anchorIndex = Number.isInteger(objectData.anchorIndex) ? objectData.anchorIndex : tileIndex;
      const progressInfo = resolveRainBarrelProgress(anchorIndex, objectData, { commitState: true });
      refreshRainBarrelOverlay(anchorIndex, objectData, progressInfo);

      const stored = Math.max(0, Math.round(progressInfo.stored || 0));
      if (stored <= 0) {
        try { window.fjFarm?.audio?.play?.('deny'); } catch (_) {}
        refreshTooltipForHoveredTile();
        return true;
      }

      if (selected && selected.type === 'inventory-item') {
        try { window.fjFarm?.audio?.play?.('deny'); } catch (_) {}
        return true;
      }

      const invModule = window.fjTweakerModules?.farminv;
      const added = invModule?.addToInventory?.(WATER_ITEM_KEY, stored, 'food');
      if (!added) {
        try { window.fjFarm?.audio?.play?.('deny'); } catch (_) {}
        return true;
      }

      commitRainBarrelState(anchorIndex, objectData, {
        rainWaterStored: 0,
        rainWaterCycleStart: Date.now(),
      });
      refreshRainBarrelOverlay(anchorIndex, objectData, { stored: 0, progress: 0 });
      ensureRainBarrelMonitor();
      refreshTooltipForHoveredTile();
      try { window.fjFarm?.audio?.play?.('watering'); } catch (_) {}
      return true;
    } catch (_) {
      return true;
    }
  };

  // Debug accelerators used both by the cheat panel and farmtools timers.
  const accelerateBeeBoxes = (hours = 1) => {
    const numericHours = Number(hours);
    if (!Number.isFinite(numericHours) || numericHours === 0) return 0;
    const accelerationMs = Math.round(numericHours * 60 * 60 * 1000);
    if (accelerationMs === 0) return 0;

    const tileStrip = document.getElementById('fj-farm-tiles');
    const tiles = tileStrip?.children;
    const totalTiles = tiles?.length || 0;
    if (!totalTiles) return 0;

    let advancedCount = 0;
    for (let i = 0; i < totalTiles; i++) {
      const objectData = window.fjFarm?.state?.getObject?.(i);
      if (!objectData || !objectData.isAnchor) continue;
      if (String(objectData.objectName || '').toLowerCase() !== BEE_BOX_KEY) continue;

      const normalized = ensureBeeBoxState(i, objectData) || objectData;
      if (!normalized || normalized.honeyReady) {
        ensureBeeBoxState(i, objectData);
        continue;
      }

      const newCycleStart = Math.max(0, (normalized.honeyCycleStart || Date.now()) - accelerationMs);
      const patch = { honeyCycleStart: newCycleStart };
      if (typeof normalized.honeyCollectedAt === 'number' && Number.isFinite(normalized.honeyCollectedAt)) {
        patch.honeyCollectedAt = Math.max(0, normalized.honeyCollectedAt - accelerationMs);
      }

      commitBeeBoxState(i, normalized, patch);
      const progressInfo = resolveBeeBoxProgress(i, normalized, { commitReady: true });
      refreshBeeBoxOverlay(i, normalized, progressInfo);
      advancedCount++;
    }

    if (advancedCount > 0) {
      ensureBeeBoxMonitor();
      try { refreshTooltipForHoveredTile(); } catch (_) {}
    }

    return advancedCount;
  };

  const accelerateRainBarrels = (hours = 1) => {
    const numericHours = Number(hours);
    if (!Number.isFinite(numericHours) || numericHours === 0) return 0;
    const accelerationMs = Math.round(numericHours * 60 * 60 * 1000);
    if (accelerationMs === 0) return 0;

    const tileStrip = document.getElementById('fj-farm-tiles');
    const tiles = tileStrip?.children;
    const totalTiles = tiles?.length || 0;
    if (!totalTiles) return 0;

    let advancedCount = 0;
    for (let i = 0; i < totalTiles; i++) {
      const objectData = window.fjFarm?.state?.getObject?.(i);
      if (!objectData || !objectData.isAnchor) continue;
      if (String(objectData.objectName || '').toLowerCase() !== RAIN_BARREL_KEY) continue;

      const normalized = ensureRainBarrelState(i, objectData) || objectData;
      if (!normalized) continue;

      const newCycleStart = Math.max(0, (normalized.rainWaterCycleStart || Date.now()) - accelerationMs);
      commitRainBarrelState(i, normalized, {
        rainWaterCycleStart: newCycleStart,
      });
      const progressInfo = resolveRainBarrelProgress(i, normalized, { commitState: true });
      refreshRainBarrelOverlay(i, normalized, progressInfo);
      advancedCount++;
    }

    if (advancedCount > 0) {
      ensureRainBarrelMonitor();
      try { refreshTooltipForHoveredTile(); } catch (_) {}
    }

    return advancedCount;
  };
  // Drag-to-paint placement state (unlocked by the tool shed object).
  const dragState = {
    active: false,
    pointerId: null,
    processed: new Set(),
  };
  const hasToolShedPlaced = () => {
    try {
      const allObjects = window.fjFarm?.state?.getAllObjects?.();
      if (!allObjects || typeof allObjects !== 'object') return false;
      const targetKey = normalizeItemKey(TOOL_SHED_OBJECT_KEY);
      return Object.values(allObjects).some((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        if (normalizeItemKey(entry.objectName) !== targetKey) return false;
        return entry.isAnchor !== false;
      });
    } catch (_) {
      return false;
    }
  };
  
  const canUseDragPlacement = () => hasToolShedPlaced();
  const canInitiatePointerAction = (event) => {
    if (!event) return false;
    if (event.pointerType === 'mouse') {
      return event.button === 0;
    }
    if (typeof event.button === 'number') {
      return event.button === 0;
    }
    return true;
  };
  const isPointerEngaged = (event) => {
    if (!event) return false;
    if (typeof event.buttons === 'number') {
      if (event.pointerType === 'mouse') {
        return (event.buttons & 1) === 1;
      }
      return event.buttons !== 0;
    }
    if (typeof event.pressure === 'number') {
      return event.pressure > 0;
    }
    return true;
  };
  const resetDragState = () => {
    dragState.active = false;
    dragState.pointerId = null;
    dragState.processed.clear();
  };
  const handleGlobalPointerEnd = (event) => {
    if (!dragState.active) return;
    if (dragState.pointerId != null && event && typeof event.pointerId === 'number' && dragState.pointerId !== event.pointerId) {
      return;
    }
    resetDragState();
  };
  let pointerEndListenersAttached = false;
  const ensurePointerEndListeners = () => {
    if (pointerEndListenersAttached) return;
    try {
      window.addEventListener('pointerup', handleGlobalPointerEnd);
      window.addEventListener('pointercancel', handleGlobalPointerEnd);
      pointerEndListenersAttached = true;
    } catch (_) {}
  };

  // Placement validators return both a boolean and per-tile diagnostics for highlighting.
  const evaluateSeedPlacementAt = (tileIndex, seedKey) => {
    const seedsModule = getSeedsModule();
    const fallback = {
      ok: false,
      reason: 'unavailable',
      tiles: [],
      isTree: false,
      footprint: { width: 1, height: 1 },
      originIndex: tileIndex,
      originElement: null,
    };
    if (!seedsModule) return fallback;

    const tileStrip = document.getElementById('fj-farm-tiles');
    if (!tileStrip) return fallback;

    const tiles = Array.from(tileStrip.children);
    if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= tiles.length) {
      return fallback;
    }

    const isTree = !!seedsModule.isTreeSeed?.(seedKey);
    const footprint = seedsModule.getSeedFootprint?.(seedKey) || { width: 1, height: 1 };
    const compatibilityOffsets = isTree ? buildTreeCompatibilityOffsets(footprint) : null;

    const totalCols = FARMTILE_COLS;
    const totalRows = Math.ceil(tiles.length / totalCols);
    const startRow = Math.floor(tileIndex / totalCols);
    const startCol = tileIndex % totalCols;

    let ok = true;
    let reason = null;
    const occupiedTiles = [];

    for (let row = 0; row < footprint.height; row++) {
      for (let col = 0; col < footprint.width; col++) {
        const targetRow = startRow + row;
        const targetCol = startCol + col;
        const idx = targetRow * totalCols + targetCol;
        const tileEntry = {
          index: idx,
          element: null,
          ok: true,
          reasons: [],
        };

        if (targetRow < 0 || targetCol < 0 || targetCol >= totalCols || targetRow >= totalRows || idx >= tiles.length) {
          tileEntry.ok = false;
          tileEntry.reasons.push('bounds');
          ok = false;
          reason = reason || 'bounds';
          occupiedTiles.push(tileEntry);
          continue;
        }

        tileEntry.element = tiles[idx];

        const tileTypeRaw = window.fjFarm?.state?.getTileType?.(idx);
        const tileType = typeof tileTypeRaw === 'string' ? tileTypeRaw.toLowerCase() : 'dirt';
        const plantOnTile = window.fjFarm?.state?.getPlant?.(idx);
        const objectOnTile = window.fjFarm?.state?.getObject?.(idx);

        if (plantOnTile || objectOnTile) {
          tileEntry.ok = false;
          tileEntry.reasons.push('occupied');
          ok = false;
          reason = reason || 'occupied';
        }

        const offsetKey = buildOffsetKey(row, col);
        const enforceTileType = !isTree || (compatibilityOffsets && compatibilityOffsets.has(offsetKey));

        if (tileEntry.ok && enforceTileType) {
          if (isTree) {
            if (!TREE_ALLOWED_TILES.has(tileType)) {
              tileEntry.ok = false;
              tileEntry.reasons.push('tile-type');
              ok = false;
              reason = reason || 'tile-type';
            }
          } else if (tileType !== 'tilled') {
            tileEntry.ok = false;
            tileEntry.reasons.push('tile-type');
            ok = false;
            reason = reason || 'tile-type';
          }
        }

        occupiedTiles.push(tileEntry);
      }
    }

    return {
      ok,
      reason,
      tiles: occupiedTiles,
      isTree,
      footprint: { ...footprint },
      originIndex: tileIndex,
      originElement: tiles[tileIndex] || null,
    };
  };

  const HIGHLIGHT_OVERLAY_CLASS = 'tile-highlight-overlay';
  const HIGHLIGHTED_TILE_CLASS = 'tile-highlighted';

  // Small DOM helpers for glowing the footprint when hovering with tools or seeds.
  const clearPlacementHighlights = () => {
    document.querySelectorAll(`.${HIGHLIGHT_OVERLAY_CLASS}`).forEach(node => node.remove());
    document.querySelectorAll(`.${HIGHLIGHTED_TILE_CLASS}`).forEach(tile => tile.classList.remove(HIGHLIGHTED_TILE_CLASS));
  };

  const applyPlacementHighlights = (entries) => {
    if (!entries || !entries.length) return;
    const seen = new Set();

    entries.forEach(({ element, state }) => {
      if (!element) return;
      if (seen.has(element)) return;
      seen.add(element);

      let container = element;
      if (container.tagName === 'IMG') container = container.parentNode;
      if (!container) return;

      if (container.style.position === '' || container.style.position === 'static') {
        container.style.position = 'relative';
      }

      const overlay = document.createElement('div');
      overlay.className = HIGHLIGHT_OVERLAY_CLASS;
      const stateKey = state === 'invalid' ? 'invalid' : 'valid';
      Object.assign(overlay.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        boxSizing: 'border-box',
        zIndex: '18',
        background: stateKey === 'invalid' ? 'rgba(255,0,0,0.08)' : 'rgba(0,255,0,0.08)',
        border: stateKey === 'invalid' ? '2px solid rgba(255,0,0,0.7)' : '2px solid rgba(0,255,0,0.5)'
      });

      container.appendChild(overlay);
      container.classList.add(HIGHLIGHTED_TILE_CLASS);
    });
  };

  // --- Compost Bin interaction flow ---------------------------------------
  const handleCompostBinInteraction = (tileElement, tileIndex, objectData, selected, interactModule) => {
    try {
      if (!objectData || String(objectData.objectName || '').toLowerCase() !== COMPOST_BIN_KEY) {
        return false;
      }

      const anchorIndex = Number.isInteger(objectData.anchorIndex) ? objectData.anchorIndex : tileIndex;
      const currentValue = resolveCompostValue(objectData);
      const readyForCollection = currentValue >= COMPOST_BIN_FULL_THRESHOLD;

      if (readyForCollection) {
        const invModule = window.fjTweakerModules?.farminv;
        const added = invModule?.addToInventory?.(FERTILIZER_ITEM_KEY, 10, 'food');
        if (!added) {
          return true;
        }

        const remainder = Math.max(0, currentValue - COMPOST_BIN_FULL_THRESHOLD);
        const nextValue = applyCompostValueToState(anchorIndex, objectData, remainder);
        refreshCompostBinOverlay(anchorIndex, nextValue);
        refreshTooltipForHoveredTile();
        try { window.fjFarm?.audio?.play?.('place'); } catch (_) {}
        return true;
      }

      if (!isCompostableSelection(selected)) {
        if (selected && selected.type === 'inventory-item') {
          try { window.fjFarm?.audio?.play?.('deny'); } catch (_) {}
          return true;
        }
        return false;
      }

      const currentCount = Math.max(0, Number(selected?.count || 0));
      if (currentCount <= 0) {
        try { window.fjFarm?.audio?.play?.('deny'); } catch (_) {}
        return true;
      }

      const contribution = resolveCompostContributionValue(selected);
      if (contribution <= 0) {
        try { window.fjFarm?.audio?.play?.('deny'); } catch (_) {}
        return true;
      }

      const nextValue = applyCompostValueToState(anchorIndex, objectData, currentValue + contribution);
      refreshCompostBinOverlay(anchorIndex, nextValue);
      refreshTooltipForHoveredTile();

      if (selected) {
        const remaining = Math.max(0, currentCount - 1);
        selected.count = remaining;
        if (remaining <= 0) {
          selected._skipReturn = true;
          interactModule?.deselectItem?.();
        } else {
          window.fjTweakerModules?.farminteract?.refreshCursorBadge?.();
        }
      }

      try { window.fjFarm?.audio?.play?.('click'); } catch (_) {}
      return true;
    } catch (_) {
      return true;
    }
  };

  // Consumes Fertilizer inventory items and tags the anchor plant for bonus yields.
  const applyFertilizerToPlant = (tileIndex, selected, interactModule) => {
    try {
      if (!isFertilizerSelection(selected)) return false;

      const seedsModule = getSeedsModule();
      const anchorEntry = seedsModule?.resolvePlantAnchor?.(tileIndex);
      if (!anchorEntry || !anchorEntry.data || !anchorEntry.data.seedName) {
        return false;
      }

      const { index: anchorIndex, data: plantData } = anchorEntry;
      if (plantData.isFertilized) {
        try { window.fjFarm?.audio?.play?.('deny'); } catch (_) {}
        refreshTooltipForHoveredTile();
        return true;
      }

      const remainingBefore = Math.max(0, Number(selected?.count || 0));
      if (remainingBefore <= 0) {
        return true;
      }

      const updatedData = {
        ...plantData,
        isFertilized: true,
        fertilizedAt: Date.now(),
      };

      window.fjFarm?.state?.setPlant?.(anchorIndex, updatedData);

      const remainingAfter = remainingBefore - 1;
      selected.count = remainingAfter;
      if (remainingAfter <= 0) {
        selected._skipReturn = true;
        interactModule?.deselectItem?.();
      } else {
        window.fjTweakerModules?.farminteract?.refreshCursorBadge?.();
      }

      refreshTooltipForHoveredTile();

      try { window.fjFarm?.audio?.play?.('click'); } catch (_) {}
      return true;
    } catch (_) {
      return true;
    }
  };

  const getTileElements = () => {
    const tileStrip = document.getElementById('fj-farm-tiles');
    return tileStrip ? Array.from(tileStrip.children) : [];
  };
  const refreshCompostBinOverlay = (anchorIndex, compostValue) => {
    const tiles = getTileElements();
    if (!tiles.length || !Number.isInteger(anchorIndex)) return;
    const anchorTile = tiles[anchorIndex];
    if (!anchorTile) return;
    const overlay = anchorTile.querySelector?.('.object-overlay');
    if (!overlay) return;
    const iconKey = resolveCompostBinIconKey(compostValue);
    const desiredSrc = resolve(`addons/farm/icons/objects/${iconKey}.png`);
    if (overlay.src !== desiredSrc) {
      overlay.src = desiredSrc;
      overlay.onerror = function() {
        this.src = resolve('icons/error.png');
      };
    }
  };

  const resolveObjectAnchor = (tileIndex) => {
    if (!Number.isInteger(tileIndex) || tileIndex < 0) return null;
    const raw = window.fjFarm?.state?.getObject?.(tileIndex);
    if (!raw) return null;
    if (raw.isAnchor || typeof raw.anchorIndex !== 'number') {
      return raw;
    }
    const anchor = window.fjFarm?.state?.getObject?.(raw.anchorIndex);
    return anchor || raw;
  };

  const collectFootprintEntries = (anchorIndex, size, stateResolver) => {
    const tiles = getTileElements();
    if (!tiles.length || typeof anchorIndex !== 'number') return [];
    const totalCols = FARMTILE_COLS;
    const startRow = Math.floor(anchorIndex / totalCols);
    const startCol = anchorIndex % totalCols;
    const width = Math.max(1, Number(size?.width) || 1);
    const height = Math.max(1, Number(size?.height) || 1);
    const entries = [];

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const idx = (startRow + row) * totalCols + (startCol + col);
        const element = tiles[idx] || null;
        if (!element) continue;
        const state = typeof stateResolver === 'function' ? stateResolver(idx, element) : 'valid';
        entries.push({ element, state });
      }
    }

    return entries;
  };

  const buildEntriesFromIndices = (indices, stateResolver) => {
    if (!Array.isArray(indices) || !indices.length) return [];
    const tiles = getTileElements();
    if (!tiles.length) return [];

    return indices
      .map(idx => {
        const element = tiles[idx] || null;
        if (!element) return null;
        const state = typeof stateResolver === 'function' ? stateResolver(idx, element) : 'valid';
        return { element, state };
      })
      .filter(Boolean);
  };

  const evaluateObjectPlacementAt = (tileIndex, objectKey) => {
    const tiles = getTileElements();
    const fallback = {
      ok: false,
      reason: 'unavailable',
      tiles: [],
      footprint: { width: 1, height: 1 },
      originIndex: tileIndex,
      originElement: tiles[tileIndex] || null,
    };

    if (!tiles.length || !Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= tiles.length) {
      return fallback;
    }

  const size = window.fjFarm?.getObjectSize?.(objectKey) || { width: 1, height: 1 };
  const compatibilitySpec = getObjectCompatibilitySpec(objectKey, size);
    const totalCols = FARMTILE_COLS;
    const totalRows = Math.ceil(tiles.length / totalCols);
    const startRow = Math.floor(tileIndex / totalCols);
    const startCol = tileIndex % totalCols;

    let ok = true;
    let reason = null;
    const placementTiles = [];

    for (let row = 0; row < size.height; row++) {
      for (let col = 0; col < size.width; col++) {
        const targetRow = startRow + row;
        const targetCol = startCol + col;
        const idx = targetRow * totalCols + targetCol;
        const tileEntry = {
          index: idx,
          element: null,
          ok: true,
          reasons: [],
        };

        if (targetRow < 0 || targetCol < 0 || targetCol >= totalCols || targetRow >= totalRows || idx >= tiles.length) {
          tileEntry.ok = false;
          tileEntry.reasons.push('bounds');
          ok = false;
          reason = reason || 'bounds';
          placementTiles.push(tileEntry);
          continue;
        }

        tileEntry.element = tiles[idx];

        const tileType = (window.fjFarm?.state?.getTileType?.(idx) || 'dirt').toLowerCase();
        const plantOnTile = window.fjFarm?.state?.getPlant?.(idx);
        const objectOnTile = window.fjFarm?.state?.getObject?.(idx);

        const offsetKey = buildOffsetKey(row, col);
        const enforceTileType = compatibilitySpec.requireOnListedOnly
          ? compatibilitySpec.offsets.has(offsetKey)
          : true;

        if (tileEntry.ok && enforceTileType) {
          if (!compatibilitySpec.allowed(tileType)) {
            tileEntry.ok = false;
            tileEntry.reasons.push('tile-type');
            ok = false;
            reason = reason || 'tile-type';
          }
        }

        if (plantOnTile || objectOnTile) {
          tileEntry.ok = false;
          tileEntry.reasons.push('occupied');
          ok = false;
          reason = reason || 'occupied';
        }

        placementTiles.push(tileEntry);
      }
    }

    return {
      ok,
      reason,
      tiles: placementTiles,
      footprint: { ...size },
      originIndex: tileIndex,
      originElement: tiles[tileIndex] || null,
    };
  };

  const buildSeedHoverData = (tileIndex, seedKey) => {
    const placement = evaluateSeedPlacementAt(tileIndex, seedKey);
    const entries = placement.tiles.length
      ? placement.tiles
          .filter(tile => tile && tile.element)
          .map(tile => ({ element: tile.element, state: tile.ok === false ? 'invalid' : 'valid' }))
      : (placement.originElement ? [{ element: placement.originElement, state: placement.ok ? 'valid' : 'invalid' }] : []);
    return { placement, entries, canPlace: placement.ok };
  };

  const buildObjectHoverData = (tileIndex, objectKey) => {
    const placement = evaluateObjectPlacementAt(tileIndex, objectKey);
    const entries = placement.tiles.length
      ? placement.tiles
          .filter(tile => tile && tile.element)
          .map(tile => ({ element: tile.element, state: tile.ok === false ? 'invalid' : 'valid' }))
      : (placement.originElement ? [{ element: placement.originElement, state: placement.ok ? 'valid' : 'invalid' }] : []);
    return { placement, entries, canPlace: placement.ok };
  };

  const buildBulldozerHoverData = (tileIndex) => {
    const tiles = getTileElements();
    if (!tiles.length) return { entries: [], canAct: false };

    const objectData = window.fjFarm?.state?.getObject?.(tileIndex);
    const seedsModule = getSeedsModule();

    if (objectData) {
      const anchorIndex = typeof objectData.anchorIndex === 'number' ? objectData.anchorIndex : tileIndex;
      const entries = collectFootprintEntries(anchorIndex, objectData.size || { width: 1, height: 1 });
      return { entries, canAct: entries.length > 0 };
    }

    const anchorEntry = seedsModule?.resolvePlantAnchor?.(tileIndex);
    if (anchorEntry) {
      const { index: anchorIndex, data: anchorData } = anchorEntry;
      const footprint = anchorData.isTree
        ? (anchorData.size ? { ...anchorData.size } : (seedsModule?.getSeedFootprint?.(anchorData.seedName) || { width: 1, height: 1 }))
        : { width: 1, height: 1 };
      const entries = collectFootprintEntries(anchorIndex, footprint);
      return { entries, canAct: entries.length > 0 };
    }

    const element = tiles[tileIndex];
    return {
      entries: element ? [{ element, state: 'invalid' }] : [],
      canAct: false
    };
  };

  const buildGloveHoverData = (tileIndex) => {
    const tiles = getTileElements();
    if (!tiles.length) return { entries: [], canAct: false };

    const objectData = window.fjFarm?.state?.getObject?.(tileIndex);
    if (!objectData) {
      const element = tiles[tileIndex];
      return {
        entries: element ? [{ element, state: 'invalid' }] : [],
        canAct: false
      };
    }

    const anchorIndex = typeof objectData.anchorIndex === 'number' ? objectData.anchorIndex : tileIndex;
    const entries = collectFootprintEntries(anchorIndex, objectData.size || { width: 1, height: 1 });
    return { entries, canAct: entries.length > 0 };
  };

  const buildHarvestHoverData = (toolKey, tileIndex) => {
    const tiles = getTileElements();
    const seedsModule = getSeedsModule();
    if (!tiles.length || !seedsModule) {
      const element = tiles[tileIndex];
      return {
        entries: element ? [{ element, state: 'invalid' }] : [],
        canAct: false
      };
    }

    const resolveState = (idx) => {
      const anchorEntry = seedsModule.resolvePlantAnchor?.(idx);
      if (!anchorEntry) return 'invalid';
      const growthInfo = seedsModule.getPlantGrowthInfo?.(anchorEntry.index);
      return growthInfo?.isGrown ? 'valid' : 'invalid';
    };

    if (toolKey === 'hvstbasic') {
      const entries = buildEntriesFromIndices([tileIndex], resolveState);
      return { entries, canAct: entries.some(entry => entry.state === 'valid') };
    }

    if (toolKey === 'hvstbetter') {
      const entries = buildEntriesFromIndices(getAreaTiles(tileIndex, 5), resolveState);
      return { entries, canAct: entries.some(entry => entry.state === 'valid') };
    }

    if (toolKey === 'hvstbest') {
      const grownEntries = buildEntriesFromIndices(getAllGrownCropTiles(), () => 'valid');
      if (grownEntries.length) {
        return { entries: grownEntries, canAct: true };
      }
      const element = tiles[tileIndex];
      return {
        entries: element ? [{ element, state: 'invalid' }] : [],
        canAct: false
      };
    }

    return { entries: [], canAct: false };
  };

  const buildMaintenanceHoverData = (tileIndex) => {
    const tiles = getTileElements();
    const element = tiles[tileIndex];
    if (!element) return { entries: [], canAct: false };

    const seedsModule = getSeedsModule();
    const anchorEntry = seedsModule?.resolvePlantAnchor?.(tileIndex);
    if (!anchorEntry || anchorEntry.data?.isTree) {
      return { entries: [{ element, state: 'invalid' }], canAct: false };
    }

    return { entries: [{ element, state: 'valid' }], canAct: true };
  };

  const buildHoeHoverData = (toolKey, tileElement, tileIndex) => {
    const element = tileElement;
    if (!element) return { entries: [], canAct: false };
    const currentTileType = getTileType(tileElement);
    const preview = applyToolPreview(toolKey, currentTileType);
    const isValid = !!preview && preview !== currentTileType;
    return {
      entries: [{ element, state: isValid ? 'valid' : 'invalid' }],
      canAct: isValid
    };
  };

  const buildTilePlacementHoverData = (tileElement, tileIndex, tileKey) => {
    if (!tileElement) return { entries: [], canAct: false };
    const canPlace = canPlaceTile(tileElement, tileIndex, tileKey);
    return {
      entries: [{ element: tileElement, state: canPlace ? 'valid' : 'invalid' }],
      canAct: canPlace
    };
  };

  const applyPlantOverlay = (tileElement, seedKey, isTree, footprint, isGrown) => {
    if (!tileElement) return null;
    let container = tileElement;
    if (tileElement.tagName === 'IMG') container = tileElement.parentNode;
    if (!container) return null;

    let plantOverlay = container.querySelector('.plant-overlay');
    if (!plantOverlay) {
      plantOverlay = document.createElement('img');
      plantOverlay.className = 'plant-overlay';
      plantOverlay.draggable = false;
      plantOverlay.decoding = 'async';
      plantOverlay.loading = 'lazy';
      container.appendChild(plantOverlay);
    }

    const stage = isGrown ? 'grown' : 'growing';
    const desiredSrc = resolve(`addons/farm/icons/plants/${seedKey}_${stage}.png`);
    if (plantOverlay.src !== desiredSrc) {
      plantOverlay.src = desiredSrc;
      plantOverlay.onerror = function() {
        this.src = resolve('icons/error.png');
      };
    }

    plantOverlay.alt = `${seedKey} ${stage}`;
    Object.assign(plantOverlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      pointerEvents: 'none',
      zIndex: '1',
      objectFit: 'cover'
    });

    if (isTree) {
      const width = Math.max(1, Number(footprint?.width) || 1);
      const height = Math.max(1, Number(footprint?.height) || 1);
      plantOverlay.style.width = `${width * 100}%`;
      plantOverlay.style.height = `${height * 100}%`;
      container.style.overflow = 'visible';
    } else {
      plantOverlay.style.width = '100%';
      plantOverlay.style.height = '100%';
      container.style.overflow = '';
    }

    return plantOverlay;
  };

  // Master click handler that branches into tools, seeds, objects, tile changes, etc.
  const handleTileClick = (tileElement, tileIndex) => {
    try {
      const interactModule = window.fjTweakerModules?.farminteract;
      const selected = interactModule?.getSelected?.() || null;

      const objectAnchor = resolveObjectAnchor(tileIndex);
      if (objectAnchor) {
        const objectKey = String(objectAnchor.objectName || '').toLowerCase();
        if (objectKey === COMPOST_BIN_KEY) {
          if (handleCompostBinInteraction(tileElement, tileIndex, objectAnchor, selected, interactModule)) {
            return;
          }
        }
        if (objectKey === BEE_BOX_KEY) {
          if (handleBeeBoxInteraction(tileElement, tileIndex, objectAnchor, selected, interactModule)) {
            return;
          }
        }
        if (objectKey === RAIN_BARREL_KEY) {
          if (handleRainBarrelInteraction(tileElement, tileIndex, objectAnchor, selected, interactModule)) {
            return;
          }
        }
      }

      if (!interactModule?.hasSelection?.()) return;
      if (!selected) return;

      if (applyFertilizerToPlant(tileIndex, selected, interactModule)) {
        clearPlacementHighlights();
        return;
      }
      
      if (selected.type === 'tool') {
        let acted = false;
        
        if (selected.key === 'bulldoze') {
          
          const toolsModule = window.fjTweakerModules?.farmtools;
          if (toolsModule && toolsModule.handleBulldozer) {
            if (toolsModule.handleBulldozer(tileElement, tileIndex)) {
              acted = true;
            }
          }
        } else if (selected.key === 'glove') {
          
          if (handleGlove(tileElement, tileIndex)) {
            acted = true;
          }
        } else {
          
          const currentTileType = getTileType(tileElement);
          const newTileType = applyTool(selected.key, currentTileType, tileIndex);
          
          if (newTileType && newTileType !== currentTileType) {
            changeTile(tileElement, newTileType);
            try { if (newTileType === 'tilled') window.fjFarm?.audio?.play?.('till'); } catch(_) {}
            acted = true;
          }
        }

        if (acted) {
          clearPlacementHighlights();
        }
      } else if (selected.type === 'seed') {
        const placement = evaluateSeedPlacementAt(tileIndex, selected.key);
        if (!placement.ok) {
          try { window.fjFarm?.audio?.play?.('deny'); } catch(_) {}
          return;
        }

        const seedCost = getSeedCost(selected.key);
        if (plantSeed(tileElement, selected.key, seedCost, placement)) {
          clearPlacementHighlights();
          try { window.fjFarm?.audio?.play?.('plant'); } catch(_) {}
        } else {
          try { window.fjFarm?.audio?.play?.('deny'); } catch(_) {}
        }
      } else if (selected.type === 'object') {
        
        const shopModule = window.fjTweakerModules?.farmshop;
        if (shopModule) {
          let objectCost = selected.isInventoryObject ? 0 : shopModule.getObjectCost(selected.key);
          
          if (shopModule.placeObject(tileElement, tileIndex, selected.key, objectCost, selected.carryData || null)) {
            try { window.fjFarm?.audio?.play?.('place'); } catch(_) {}
            
            if (selected.isInventoryObject) {
              const interactModule = window.fjTweakerModules?.farminteract;
              const curSel = interactModule?.getSelected?.();
              if (curSel) {
                curSel.count = Math.max(0, Number(curSel.count || 0) - 1);
                if (curSel.count <= 0) {
                  
                  curSel._skipReturn = true;
                  interactModule?.deselectItem?.();
                } else {
                  
                  window.fjTweakerModules?.farminteract?.refreshCursorBadge?.();
                }
              }
            }
          } else {
            try { window.fjFarm?.audio?.play?.('deny'); } catch(_) {}
          }
        }
      } else if (selected.type === 'tile') {
        
        const tileCost = getTileCost(selected.key);
        
        if (buyTile(tileElement, tileIndex, selected.key, tileCost)) {
          try { window.fjFarm?.audio?.play?.('tile'); } catch(_) {}
        } else {
          try { window.fjFarm?.audio?.play?.('deny'); } catch(_) {}
        }
      } else if (selected.type === 'moved-object') {
        
        const shopModule = window.fjTweakerModules?.farmshop;
        if (shopModule && shopModule.canPlaceObject && shopModule.placeObject) {
          if (shopModule.canPlaceObject(tileIndex, selected.key)) {
            
            if (shopModule.placeObject(tileElement, tileIndex, selected.key, 0, selected.carryData || null)) {
              try { window.fjFarm?.audio?.play?.('place'); } catch(_) {}
              const interactModule = window.fjTweakerModules?.farminteract;
              if (interactModule && interactModule.selectItem) {
                
                interactModule.selectItem({ key: 'glove', type: 'tool', icon: 'addons/farm/icons/tools/glove.png' }, null);
              }
            }
          }
        }
      }
    } catch (_) {}
  };

  
  // Cross-module pricing lookups (delegated to farmseeds/farmtile datasets).
  const getSeedCost = (seedKey) => {
    try {
      
      const seedsModule = window.fjTweakerModules?.farmseeds;
      if (seedsModule && seedsModule.getSeedTips) {
        const seedTips = seedsModule.getSeedTips();
        return seedTips[seedKey]?.prc || 0;
      }
      return 0;
    } catch (_) {
      return 0;
    }
  };

  
  const getTileCost = (tileKey) => {
    return TILE_TIPS[tileKey]?.prc || 0;
  };

  
  const canPlaceTile = (tileElement, tileIndex, newTileType) => {
    if (!tileElement || typeof newTileType !== 'string') return false;
    if (!Number.isInteger(tileIndex) || tileIndex < 0) return false;

    const targetType = newTileType.toLowerCase();
    if (targetType === 'tilled') {
      return false;
    }

    const seedsModule = getSeedsModule();
    const plantEntry = seedsModule?.resolvePlantAnchor?.(tileIndex) || null;
    if (plantEntry) {
      const anchorIndex = Number.isInteger(plantEntry.index) ? plantEntry.index : tileIndex;
      const plantData = plantEntry.data || null;
      const isTreeHere = !!plantData?.isTree;

      if (!isTreeHere) {
        return false;
      }

      const footprint = plantData?.size || seedsModule?.getSeedFootprint?.(plantData?.seedName) || { width: 1, height: 1 };
      const offsets = buildTreeCompatibilityOffsets(footprint);
      const relative = getRelativeOffset(anchorIndex, tileIndex);
      if (!relative) {
        return TREE_ALLOWED_TILES.has(targetType);
      }
      const key = buildOffsetKey(relative.row, relative.col);
      if (!offsets.has(key)) {
        return true;
      }
      return TREE_ALLOWED_TILES.has(targetType);
    }

    const objectData = resolveObjectAnchor(tileIndex);
    if (objectData) {
      const anchorIndex = Number.isInteger(objectData.anchorIndex) ? objectData.anchorIndex : tileIndex;
      const size = objectData.size || window.fjFarm?.getObjectSize?.(objectData.objectName) || { width: 1, height: 1 };
      const spec = getObjectCompatibilitySpec(objectData.objectName, size);
      const relative = getRelativeOffset(anchorIndex, tileIndex);
      const key = relative ? buildOffsetKey(relative.row, relative.col) : null;
      const enforceTileType = spec.requireOnListedOnly ? (key != null && spec.offsets.has(key)) : true;
      if (!enforceTileType) {
        return true;
      }
      return spec.allowed(targetType);
    }

    return true;
  };

  
  // Attempts a tile purchase, respecting placement rules, coin balance, and tile timers.
  const buyTile = (tileElement, tileIndex, tileKey, tileCost) => {
    if (!tileElement || !tileKey) return false;
    
    
    if (!canPlaceTile(tileElement, tileIndex, tileKey)) {
      return false;
    }
    
    const currentType = getTileType(tileElement);
    if (currentType === tileKey) {
      return false;
    }
    
    
    const currentCoins = window.fjFarm?.coins?.get?.() || 0;
    if (currentCoins < tileCost) {
      return false; 
    }
    
    
    if (tileCost > 0) {
      window.fjFarm?.coins?.add?.(-tileCost);
    }
    
    
    changeTile(tileElement, tileKey);
    
    return true;
  };

  
  // Tooltip plumbing that smartly reuses the shared farm tooltip widget for plants + props.
  const showTileTooltip = (tileElement, tileIndex) => {
    try {
      
      const plantGrowthInfo = window.fjTweakerModules?.farmseeds?.getPlantGrowthInfo?.(tileIndex);
      if (plantGrowthInfo) {
        const isGrown = plantGrowthInfo.isGrown;
        const iconSuffix = isGrown ? '_grown' : '_growing';
        let growthText = isGrown ? '100% grown.' : `${plantGrowthInfo.growthPercentage}% grown.`;
        
        
        if (plantGrowthInfo.timerInfo) {
          growthText += `\n${plantGrowthInfo.timerInfo}`;
        }

        const plantTags = parseTags(plantGrowthInfo.seedInfo?.tag);
        if (plantGrowthInfo.isFertilized) {
          plantTags.push(FERTILIZED_TAG_LABEL);
        }
        
        window.fjfeFarmTT?.show?.({
          imageSrc: resolve(`addons/farm/icons/plants/${plantGrowthInfo.seedName}${iconSuffix}.png`),
          name: plantGrowthInfo.seedInfo.name,
          bodyTop: growthText,
          bodyTT: plantGrowthInfo.seedInfo.desc,
          cost: String(plantGrowthInfo.cost),
          costIcon: 'addons/farm/icons/coin.png',
          tags: plantTags,
        });
        return;
      }

      
      const objectData = resolveObjectAnchor(tileIndex);
      if (objectData) { 
        const shopModule = window.fjTweakerModules?.farmshop;
        const objectTips = shopModule?.getObjectTips?.() || {};
        const objectInfo = objectTips[objectData.objectName];
        const objectKey = String(objectData.objectName || '').toLowerCase();

        if (objectKey === COMPOST_BIN_KEY) {
          const value = resolveCompostValue(objectData);
          const percent = Math.floor((value / COMPOST_BIN_FULL_THRESHOLD) * 100);
          const iconKey = resolveCompostBinIconKey(value);
          const desc = objectInfo?.desc || 'Convert produce into rich compost. Collect Fertilizer at 300 value.';

          window.fjfeFarmTT?.show?.({
            imageSrc: resolve(`addons/farm/icons/objects/${iconKey}.png`),
            name: objectInfo?.name || 'Compost Bin',
            bodyTop: `${percent}% full.`,
            bodyTT: desc,
            cost: String(objectData.cost || objectInfo?.prc || 0),
            costIcon: 'addons/farm/icons/coin.png',
            tags: parseTags(objectInfo?.tag),
          });
        } else if (objectKey === BEE_BOX_KEY) {
          const anchorIndex = Number.isInteger(objectData.anchorIndex) ? objectData.anchorIndex : tileIndex;
          const progressInfo = resolveBeeBoxProgress(anchorIndex, objectData, { commitReady: true });
          refreshBeeBoxOverlay(anchorIndex, objectData, progressInfo);
          const percent = Math.min(100, Math.round(progressInfo.progress * 100));
          const bonusLine = `${progressInfo.flowers} ${progressInfo.flowers === 1 ? 'flower' : 'flowers'}; +${progressInfo.bonusPercent}% speed`;
          const iconKey = resolveBeeBoxIconKey(objectData, progressInfo);
          const desc = objectInfo?.desc || 'Produces honey over time. Surround with flowers to speed production.';

          window.fjfeFarmTT?.show?.({
            imageSrc: resolve(`addons/farm/icons/objects/${iconKey}.png`),
            name: objectInfo?.name || 'Bee Box',
            bodyTop: `${percent}% full.`,
            bodyMid: bonusLine,
            bodyTT: desc,
            cost: String(objectData.cost || objectInfo?.prc || 0),
            costIcon: 'addons/farm/icons/coin.png',
            tags: parseTags(objectInfo?.tag),
          });
        } else if (objectKey === RAIN_BARREL_KEY) {
          const anchorIndex = Number.isInteger(objectData.anchorIndex) ? objectData.anchorIndex : tileIndex;
          const progressInfo = resolveRainBarrelProgress(anchorIndex, objectData, { commitState: true });
          refreshRainBarrelOverlay(anchorIndex, objectData, progressInfo);
          const percent = Math.min(100, Math.round(progressInfo.progress * 100));
          const stored = Math.max(0, Math.round(progressInfo.stored || 0));
          const iconKey = resolveRainBarrelIconKey(objectData, progressInfo);
          const desc = objectInfo?.desc || 'Collects rainwater over time for easy watering.';

          window.fjfeFarmTT?.show?.({
            imageSrc: resolve(`addons/farm/icons/objects/${iconKey}.png`),
            name: objectInfo?.name || 'Rain Barrel',
            bodyTop: `${percent}% rain collected.`,
            bodyMid: `${stored}/${RAIN_BARREL_MAX_STORAGE} water stored.`,
            bodyTT: desc,
            cost: String(objectData.cost || objectInfo?.prc || 0),
            costIcon: 'addons/farm/icons/coin.png',
            tags: parseTags(objectInfo?.tag),
          });
        } else if (objectInfo) {
          window.fjfeFarmTT?.show?.({
            imageSrc: resolve(`addons/farm/icons/objects/${objectData.objectName}.png`),
            name: objectInfo.name,
            bodyTop: '', 
            bodyTT: objectInfo.desc,
            cost: String(objectData.cost || objectInfo.prc),
            costIcon: 'addons/farm/icons/coin.png',
            tags: parseTags(objectInfo?.tag),
          });
        }
        return;
      }
    } catch (_) {}
  };

  
  const hideTileTooltip = () => {
    try {
      window.fjfeFarmTT?.hide?.();
    } catch (_) {}
  };
  
  
  let hoveredTileIndex = null;
  const refreshTooltipForHoveredTile = () => {
    try {
      if (hoveredTileIndex == null) return;
      const tileStrip = document.getElementById('fj-farm-tiles');
      if (!tileStrip) return;
      const tiles = Array.from(tileStrip.children);
      const tile = tiles[hoveredTileIndex];
      if (tile) {
        showTileTooltip(tile, hoveredTileIndex);
      }
    } catch (_) {}
  };

  
  // Glove tool converts the targeted object's footprint back into free tiles and gives user a carryable copy.
  const handleGlove = (tileElement, tileIndex) => {
    
    const objectData = window.fjFarm?.state?.getObject?.(tileIndex);
    if (!objectData || !objectData.isAnchor) return false; 
    
    
    const size = objectData.size || { width: 1, height: 1 };
    const anchorIndex = objectData.anchorIndex || tileIndex;
    
    const tileStrip = document.getElementById('fj-farm-tiles');
    if (!tileStrip) return false;
    
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
    
    
    const interactModule = window.fjTweakerModules?.farminteract;
    if (interactModule && interactModule.selectItem) {
      const objectKey = String(objectData.objectName || '').toLowerCase();
      const compostValue = objectKey === COMPOST_BIN_KEY ? resolveCompostValue(objectData) : 0;
        const beeBoxIconKey = objectKey === BEE_BOX_KEY ? resolveBeeBoxIconKey(objectData) : null;
        const rainBarrelIconKey = objectKey === RAIN_BARREL_KEY ? resolveRainBarrelIconKey(objectData) : null;
        const selectionIcon = objectKey === COMPOST_BIN_KEY
          ? `addons/farm/icons/objects/${resolveCompostBinIconKey(compostValue)}.png`
          : objectKey === BEE_BOX_KEY
            ? `addons/farm/icons/objects/${beeBoxIconKey}.png`
            : objectKey === RAIN_BARREL_KEY
              ? `addons/farm/icons/objects/${rainBarrelIconKey}.png`
            : `addons/farm/icons/objects/${objectData.objectName}.png`;
        const carryData = objectKey === COMPOST_BIN_KEY
          ? { compostValue }
          : objectKey === BEE_BOX_KEY
            ? {
                honeyCycleStart: objectData.honeyCycleStart,
                honeyReady: Boolean(objectData.honeyReady),
                honeyReadyAt: objectData.honeyReadyAt,
                honeyCollectedAt: objectData.honeyCollectedAt,
              }
            : objectKey === RAIN_BARREL_KEY
              ? {
                  rainWaterStored: Math.max(0, Math.round(Number(objectData.rainWaterStored) || 0)),
                  rainWaterCycleStart: objectData.rainWaterCycleStart,
                }
            : undefined;

      interactModule.selectItem({
        key: objectData.objectName,
        type: 'moved-object',
        icon: selectionIcon,
        originalCost: objectData.cost || 0,
        size: size,
          carryData
      }, null); 
    }
    
    return true;
  };




  
  
  const getTileType = (tileElement) => {
    if (!tileElement) return 'dirt';
    
    
    const tileStrip = document.getElementById('fj-farm-tiles');
    if (!tileStrip) return 'dirt';
    
    const tiles = Array.from(tileStrip.children);
    const tileIndex = tiles.indexOf(tileElement);
    
    if (tileIndex !== -1) {
      
      return window.fjFarm?.state?.getTileType?.(tileIndex) || 'dirt';
    }
    
    
    let img = tileElement;
    if (tileElement.tagName !== 'IMG') {
      img = tileElement.querySelector('img');
    }
    
    if (!img || !img.src) return 'dirt';
    const src = img.src;
    
    const match = src.match(/([^\/]+)\.png$/);
    if (match) return match[1];
    return 'dirt'; 
  };
  
  
  // Lightweight preview resolver so hover-highlights know whether an action would do anything.
  const applyToolPreview = (toolKey, currentTileType) => {
    switch (toolKey) {
      case 'hoebasic':
      case 'hoebetter':
        
        if (currentTileType === 'dirt' || currentTileType === 'grass') {
          return 'tilled';
        }
        break;
      case 'wcbasic':
      case 'wcbetter':
      case 'wcbest':
      case 'weedbasic':
      case 'weedbetter':
      case 'weedbest':
        
        if (currentTileType === 'tilled') {
          return currentTileType;
        }
        break;
    }
    return null; 
  };
  
  
  // Routes the currently equipped tool into watering/harvest/hoe/weeding logic.
  const applyTool = (toolKey, currentTileType, tileIndex) => {
    switch (toolKey) {
      case 'hoebasic':
      case 'hoebetter':
        
        if (currentTileType === 'dirt' || currentTileType === 'grass') {
          return 'tilled';
        }
        break;
      
      case 'hvstbasic':
      case 'hvstbetter': 
      case 'hvstbest':
        
        if (handleHarvestTool(toolKey, tileIndex)) {
          
          return currentTileType;
        }
        break;
      
      case 'wcbasic':
      case 'wcbetter':
      case 'wcbest':
        
        const toolsModule = window.fjTweakerModules?.farmtools;
        if (toolsModule && toolsModule.handleWateringTool) {
          toolsModule.handleWateringTool(toolKey, tileIndex);
        }
        break;
        
      case 'weedbasic':
      case 'weedbetter':
      case 'weedbest':
        
        const toolsModule2 = window.fjTweakerModules?.farmtools;
        if (toolsModule2 && toolsModule2.handleWeedingTool) {
          toolsModule2.handleWeedingTool(toolKey, tileIndex);
        }
        break;
    }
    return null; 
  };
  
  
  // Harvest tools have three radiuses; this consolidates the shared payout + state reset logic.
  const handleHarvestTool = (toolKey, tileIndex) => {
    
    let tilesToHarvest = [];
    
    if (toolKey === 'hvstbasic') {
      
      tilesToHarvest = [tileIndex];
    } else if (toolKey === 'hvstbetter') {
      
      tilesToHarvest = getAreaTiles(tileIndex, 5);
    } else if (toolKey === 'hvstbest') {
      
      tilesToHarvest = getAllGrownCropTiles();
    }
    
  let harvestedCount = 0;
  const invModule = window.fjTweakerModules?.farminv;
  const seedsModule = window.fjTweakerModules?.farmseeds;
  if (!seedsModule) return false;
    const processedTreeAnchors = new Set();

    for (const targetIndex of tilesToHarvest) {
      if (!seedsModule) break;

      const anchorEntry = seedsModule.resolvePlantAnchor?.(targetIndex);
      if (!anchorEntry) continue;
      const { index: anchorIndex, data: anchorData } = anchorEntry;

      if (anchorData.isTree && processedTreeAnchors.has(anchorIndex)) {
        continue;
      }

      const plantGrowthInfo = seedsModule.getPlantGrowthInfo(anchorIndex);
      if (!plantGrowthInfo || !plantGrowthInfo.isGrown) continue;

      const harvestItem = seedsModule.resolveHarvestItem(anchorData.seedName) || anchorData.seedName;
  const baseQuantity = anchorData.isTree ? 9 : 1;
  const quantity = (anchorData.isFertilized ? 2 : 1) * baseQuantity;

      if (!invModule || !invModule.addToInventory) continue;

      const success = invModule.addToInventory(harvestItem, quantity, 'plant');
      if (!success) {
        continue;
      }

      const tileStrip = document.getElementById('fj-farm-tiles');
      const tiles = tileStrip ? Array.from(tileStrip.children) : [];
      const anchorTile = tiles[anchorIndex];

      if (anchorData.isTree) {
        const resetNow = Date.now();
        const resetData = {
          ...anchorData,
          plantedAt: resetNow,
          progressMs: 0,
          lastGrowCheck: resetNow,
          isGrown: false,
          isFertilized: false
        };
        if ('fertilizedAt' in resetData) {
          delete resetData.fertilizedAt;
        }
        window.fjFarm?.state?.setPlant?.(anchorIndex, resetData);

        if (anchorTile) {
          const plantOverlay = anchorTile.querySelector?.('.plant-overlay');
          if (plantOverlay) {
            plantOverlay.src = resolve(`addons/farm/icons/plants/${anchorData.seedName}_growing.png`);
            plantOverlay.onerror = function(){ this.src = resolve('icons/error.png'); };
          }
          anchorTile.style.overflow = 'visible';
        }

        processedTreeAnchors.add(anchorIndex);
      } else {
        window.fjFarm?.state?.setPlant?.(anchorIndex, null);

        if (anchorTile) {
          const plantOverlay = anchorTile.querySelector?.('.plant-overlay');
          if (plantOverlay) {
            plantOverlay.remove();
          }

          try {
            const currentType = window.fjFarm?.state?.getTileType?.(anchorIndex);
            if (currentType === 'tilled') {
              changeTile(anchorTile, 'dirt');
            }
          } catch (_) {}
        }
      }

      harvestedCount++;
    }
    
    if (harvestedCount > 0) {
      try { window.fjFarm?.audio?.play?.('harvest'); } catch(_) {}
      return true;
    }
    
    return false;
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
  
  
  const getAllGrownCropTiles = () => {
    const tiles = [];
    const tileStrip = document.getElementById('fj-farm-tiles');
    const totalTiles = tileStrip ? tileStrip.children.length : 64; 
    const seedsModule = window.fjTweakerModules?.farmseeds;

    if (!seedsModule) return tiles;

    for (let i = 0; i < totalTiles; i++) {
      const anchorEntry = seedsModule.resolvePlantAnchor?.(i);
      if (!anchorEntry) continue;
      const { index: anchorIndex } = anchorEntry;
      if (anchorIndex !== i) continue;

      const plantGrowthInfo = seedsModule.getPlantGrowthInfo(anchorIndex);
      if (plantGrowthInfo && plantGrowthInfo.isGrown) {
        tiles.push(anchorIndex);
      }
    }
    
    return tiles;
  };

  
  const hasPlant = (tileElement) => {
    if (!tileElement) return false;
    
    
    const tileStrip = document.getElementById('fj-farm-tiles');
    if (!tileStrip) return false;
    
    const tiles = Array.from(tileStrip.children);
    const tileIndex = tiles.indexOf(tileElement);
    
    if (tileIndex !== -1) {
      
      return !!window.fjFarm?.state?.getPlant?.(tileIndex);
    }
    
    
    let container = tileElement;
    if (tileElement.tagName === 'IMG') {
      container = tileElement.parentNode;
    }
    
    if (!container) return false;
    return container.querySelector('.plant-overlay') !== null;
  };


  // Handles coin deduction, state writes, overlays, and timer wiring for a planted seed/tree.
  const plantSeed = (tileElement, seedKey, seedCost, precomputedPlacement) => {
    if (!tileElement || !seedKey) return false;

    const seedsModule = getSeedsModule();
    if (!seedsModule || !seedsModule.getSeedTips) return false;

    const seedTips = seedsModule.getSeedTips();
    const seedInfo = seedTips[seedKey];
    if (!seedInfo) return false;

    const tileStrip = document.getElementById('fj-farm-tiles');
    if (!tileStrip) return false;

    const tiles = Array.from(tileStrip.children);
    const tileIndex = tiles.indexOf(tileElement);
    if (tileIndex === -1) return false;

    const placement = (precomputedPlacement && precomputedPlacement.originIndex === tileIndex)
      ? precomputedPlacement
      : evaluateSeedPlacementAt(tileIndex, seedKey);

    if (!placement || !placement.ok) return false;

    const isTree = placement.isTree;
    const footprint = placement.footprint || { width: 1, height: 1 };

    const affectedTiles = placement.tiles.map(({ index, element }) => ({
      index,
      element: element || tiles[index] || null
    }));

    if (!affectedTiles.length) return false;

    const currentCoins = window.fjFarm?.coins?.get?.() || 0;
    if (currentCoins < seedCost) {
      return false;
    }

    window.fjFarm?.coins?.add?.(-seedCost);

    const now = Date.now();
    const anchorData = {
      seedName: seedKey,
      plantedAt: now,
      cost: seedCost,
      progressMs: 0,
      lastGrowCheck: now,
      isGrown: false
    };

    if (isTree) {
      anchorData.isTree = true;
      anchorData.isAnchor = true;
      anchorData.anchorIndex = tileIndex;
      anchorData.size = { ...footprint };
    }

    affectedTiles.forEach(({ index }) => {
      if (index === tileIndex) {
        window.fjFarm?.state?.setPlant?.(index, anchorData);
      } else if (isTree) {
        window.fjFarm?.state?.setPlant?.(index, {
          seedName: seedKey,
          isTree: true,
          isAnchor: false,
          anchorIndex: tileIndex
        });
      }
    });

    if (!isTree) {
      try {
        const toolsModule = window.fjTweakerModules?.farmtools;
        toolsModule?.initializeTileTimer?.(tileIndex);
      } catch (_) {}
    } else {
      try {
        const toolsModule = window.fjTweakerModules?.farmtools;
        if (toolsModule?.removeTileTimer) {
          affectedTiles.forEach(({ index }) => toolsModule.removeTileTimer(index));
        }
      } catch (_) {}
    }

    const anchorTileElement = affectedTiles.find(({ index }) => index === tileIndex)?.element || tiles[tileIndex];
    if (anchorTileElement) {
      applyPlantOverlay(anchorTileElement, seedKey, isTree, footprint, false);
    }

    if (isTree) {
      affectedTiles.forEach(({ index, element }) => {
        if (index === tileIndex) return;
        let container = element;
        if (container && container.tagName === 'IMG') container = container.parentNode;
        const existing = container?.querySelector?.('.plant-overlay');
        if (existing) existing.remove();
      });
    }

    return true;
  };

  
  
  // Swaps the base tile art, updates persistent state, and toggles timer tracking when appropriate.
  const changeTile = (tileElement, newTileType) => {
    if (!tileElement || !newTileType) return;
    
    
    const tileStrip = document.getElementById('fj-farm-tiles');
    let tileIndex = -1;
    if (tileStrip) {
      const tiles = Array.from(tileStrip.children);
      tileIndex = tiles.indexOf(tileElement);
      if (tileIndex !== -1) {
        const currentTileType = getTileType(tileElement);
        window.fjFarm?.state?.setTileType?.(tileIndex, newTileType);
        
        
        const toolsModule = window.fjTweakerModules?.farmtools;
        if (toolsModule) {
          if (newTileType === 'tilled') {
            
            toolsModule.initializeTileTimer(tileIndex);
          } else if (currentTileType === 'tilled') {
            
            toolsModule.removeTileTimer(tileIndex);
          }
        }
      }
    }
    
    
    let img = tileElement;
    if (tileElement.tagName !== 'IMG') {
      img = tileElement.querySelector('img');
    }
    
    if (!img) return;
    
    const newSrc = resolve(iconFor(newTileType));
    img.src = newSrc;
    img.onerror = function() {
      if (this.dataset.fallbackApplied) return;
      this.dataset.fallbackApplied = '1';
      this.src = resolve('addons/farm/icons/tiles/error.png');
    };
  };


  
  
  // Wires click + pointer drag handlers on every tile plus hover highlighting + tooltip behavior.
  const initTileClickHandlers = () => {
    const tileStrip = document.getElementById('fj-farm-tiles');
    if (!tileStrip) return;
    
    const tiles = tileStrip.children; 
    Array.from(tiles).forEach((tile, index) => {
      
      tile.removeEventListener('click', tile._farmTileHandler);
      
      
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (tile._skipNextClick) {
          tile._skipNextClick = false;
          return;
        }
        handleTileClick(tile, index);
      };
      
      tile._farmTileHandler = handler;
      tile.addEventListener('click', handler);

      if (tile._farmTilePointerDown) {
        tile.removeEventListener('pointerdown', tile._farmTilePointerDown);
      }
      if (tile._farmTilePointerEnter) {
        tile.removeEventListener('pointerenter', tile._farmTilePointerEnter);
      }

      const pointerDownHandler = (event) => {
        try {
          if (!canInitiatePointerAction(event)) return;
          const interactModule = window.fjTweakerModules?.farminteract;
          if (!interactModule?.hasSelection?.()) return;
          if (!canUseDragPlacement()) return;
          if (dragState.active && dragState.pointerId !== event.pointerId) return;

          event.stopPropagation();

          dragState.active = true;
          dragState.pointerId = event.pointerId;
          dragState.processed.clear();
          ensurePointerEndListeners();

          dragState.processed.add(index);
          tile._skipNextClick = true;
          handleTileClick(tile, index);
        } catch (_) {}
      };

      const pointerEnterHandler = (event) => {
        try {
          if (!dragState.active) return;
          if (dragState.pointerId != null && event.pointerId !== dragState.pointerId) return;
          if (!isPointerEngaged(event)) return;
          if (!canUseDragPlacement()) {
            resetDragState();
            return;
          }
          if (dragState.processed.has(index)) return;

          const interactModule = window.fjTweakerModules?.farminteract;
          if (!interactModule?.hasSelection?.()) {
            resetDragState();
            return;
          }

          dragState.processed.add(index);
          handleTileClick(tile, index);
        } catch (_) {}
      };

      tile._farmTilePointerDown = pointerDownHandler;
      tile._farmTilePointerEnter = pointerEnterHandler;
      tile.addEventListener('pointerdown', pointerDownHandler);
      tile.addEventListener('pointerenter', pointerEnterHandler);
      
      
      tile.addEventListener('mouseenter', () => {
        const interactModule = window.fjTweakerModules?.farminteract;
        clearPlacementHighlights();
        if (interactModule?.hasSelection?.()) {
          const selected = interactModule.getSelected();
          if (!selected) {
            tile.style.cursor = 'default';
            return;
          }

          if (selected.type === 'tool') {
            let entries = [];
            let canAct = false;
            const toolKey = selected.key || '';

            if (toolKey === 'bulldoze') {
              const hoverData = buildBulldozerHoverData(index);
              entries = hoverData.entries;
              canAct = hoverData.canAct;
            } else if (toolKey === 'glove') {
              const hoverData = buildGloveHoverData(index);
              entries = hoverData.entries;
              canAct = hoverData.canAct;
            } else if (toolKey.startsWith('hvst')) {
              const hoverData = buildHarvestHoverData(toolKey, index);
              entries = hoverData.entries;
              canAct = hoverData.canAct;
            } else if (toolKey === 'wcbasic' || toolKey === 'wcbetter' || toolKey === 'wcbest' ||
                       toolKey === 'weedbasic' || toolKey === 'weedbetter' || toolKey === 'weedbest') {
              const hoverData = buildMaintenanceHoverData(index);
              entries = hoverData.entries;
              canAct = hoverData.canAct;
            } else if (toolKey === 'hoebasic' || toolKey === 'hoebetter' || toolKey === 'hoebest') {
              const hoverData = buildHoeHoverData(toolKey, tile, index);
              entries = hoverData.entries;
              canAct = hoverData.canAct;
            } else {
              const hoverData = buildHoeHoverData(toolKey, tile, index);
              entries = hoverData.entries;
              canAct = hoverData.canAct;
            }

            if (entries.length) applyPlacementHighlights(entries);
            tile.style.cursor = canAct ? 'pointer' : 'not-allowed';
          } else if (selected.type === 'seed') {
            const hoverData = buildSeedHoverData(index, selected.key);
            if (hoverData.entries.length) applyPlacementHighlights(hoverData.entries);
            tile.style.cursor = hoverData.canPlace ? 'pointer' : 'not-allowed';
          } else if (selected.type === 'object' || selected.type === 'moved-object') {
            const hoverData = buildObjectHoverData(index, selected.key);
            if (hoverData.entries.length) applyPlacementHighlights(hoverData.entries);
            tile.style.cursor = hoverData.canPlace ? 'pointer' : 'not-allowed';
          } else if (selected.type === 'tile') {
            const hoverData = buildTilePlacementHoverData(tile, index, selected.key);
            if (hoverData.entries.length) applyPlacementHighlights(hoverData.entries);
            tile.style.cursor = hoverData.canAct ? 'pointer' : 'not-allowed';
          } else {
            tile.style.cursor = 'default';
          }
        } else {
          tile.style.cursor = 'default';
          showTileTooltip(tile, index);
        }
      });
      
      tile.addEventListener('mouseleave', () => {
        tile.style.cursor = 'default';
        clearPlacementHighlights();
        
        const shopModule = window.fjTweakerModules?.farmshop;
        shopModule?.clearObjectHighlights?.();
        
        const interactModule = window.fjTweakerModules?.farminteract;
        if (!interactModule?.hasSelection?.()) {
          hideTileTooltip();
        }
        hoveredTileIndex = null;
      });
      tile.addEventListener('mouseenter', () => { hoveredTileIndex = index; });
    });
  };

  // Public accessor so other modules (shop cursor) can reuse the tile metadata.
  const getTileTips = () => TILE_TIPS;

  
  // Debug helpers triggered via panel buttons to batch-manipulate the farm.
  const tillAllSoil = () => {
    try {
      const tileStrip = document.getElementById('fj-farm-tiles');
      if (!tileStrip) return;
      
      const tiles = Array.from(tileStrip.children);
      let tilledCount = 0;
      
      tiles.forEach((tile, tileIndex) => {
        
        const plantData = window.fjFarm?.state?.getPlant?.(tileIndex);
        const objectData = window.fjFarm?.state?.getObject?.(tileIndex);

        if (!plantData && !objectData) {
          
          changeTile(tile, 'tilled');
          tilledCount++;
        }
      });
      
    } catch (_) {}
  };

  const waterAllCrops = () => {
    try {
      const allPlantTiles = getAllPlantTiles();
      const toolsModule = window.fjTweakerModules?.farmtools;
      
      if (!toolsModule) return;
      
      allPlantTiles.forEach(tileIndex => {
        toolsModule.handleWateringTool?.('wcbasic', tileIndex, { silent: true });
      });
      
      try { if (allPlantTiles.length > 0) window.fjFarm?.audio?.play?.('watering'); } catch(_) {}
    } catch (_) {}
  };

  const weedAllCrops = () => {
    try {
      const allPlantTiles = getAllPlantTiles();
      const toolsModule = window.fjTweakerModules?.farmtools;
      
      if (!toolsModule) return;
      
      allPlantTiles.forEach(tileIndex => {
        toolsModule.handleWeedingTool?.('weedbasic', tileIndex, { silent: true });
      });
      
      try { if (allPlantTiles.length > 0) window.fjFarm?.audio?.play?.('weeding'); } catch(_) {}
    } catch (_) {}
  };

  const harvestAllGrownCrops = () => {
    try {
      const grownCropTiles = getAllGrownCropTiles();
      
      if (grownCropTiles.length === 0) {
        return;
      }

      handleHarvestTool('hvstbest', -1);
    } catch (_) {}
  };

  
  // Utility enumerators leveraged by the batch helpers and other modules.
  const getAllPlantTiles = () => {
    const tiles = [];
    const tileStrip = document.getElementById('fj-farm-tiles');
    const totalTiles = tileStrip ? tileStrip.children.length : 64; 
    for (let i = 0; i < totalTiles; i++) {
      const plantData = window.fjFarm?.state?.getPlant?.(i);
      if (!plantData) continue;
      if (plantData.isTree && plantData.isAnchor === false) continue;
      tiles.push(i);
    }
    return tiles;
  };

  // Entry point invoked by farmmain once the overlay is mounted.
  const init = () => {
    
    setTimeout(initTileClickHandlers, 100); 
    setupFarmDebugKeySequence();
    ensureBeeBoxMonitor();
    setTimeout(refreshAllBeeBoxes, 200);
    ensureRainBarrelMonitor();
    setTimeout(refreshAllRainBarrels, 200);
  };

  
  try { setupFarmDebugKeySequence(); } catch(_) {}

  window.fjTweakerModules = window.fjTweakerModules || {};
  window.fjTweakerModules[MODULE_KEY] = {
    refreshTooltipForHoveredTile,
    refreshBeeBoxes: refreshAllBeeBoxes,
    ensureBeeBoxMonitor,
    refreshRainBarrels: refreshAllRainBarrels,
    ensureRainBarrelMonitor,
    accelerateBeeBoxes,
    accelerateRainBarrels,
    init,
    getTileTips,
    open,
    close,
    isOpen: () => isOpen,
    getButtons: () => buttonsMeta.slice(),
    handleTileClick,
    initTileClickHandlers, 
    changeTile, 
    hasPlant, 
    plantSeed, 
    tillAllSoil, 
    waterAllCrops,
    weedAllCrops,
    harvestAllGrownCrops,
    getAllPlantTiles, 
    toggleFarmDebug,
  };
})();