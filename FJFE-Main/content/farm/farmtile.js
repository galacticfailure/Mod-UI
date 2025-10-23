(() => {
  const MODULE_KEY = 'farmtile';
  let root = null;
  let isOpen = false;
  let buttonsMeta = [];
  let coinListener = null;

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
  const iconFor = (name) => `icons/farm/tiles/${name}.png`;

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
  coinImg.src = resolve('icons/farm/coin.png');
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
            costIcon: 'icons/farm/coin.png',
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
        } catch(_){} 
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

  
  const handleTileClick = (tileElement, tileIndex) => {
    try {
      const interactModule = window.fjTweakerModules?.farminteract;
      if (!interactModule?.hasSelection?.()) return;
      
      const selected = interactModule.getSelected();
      if (!selected) return;
      
      if (selected.type === 'tool') {
        
        if (selected.key === 'bulldoze') {
          
          const toolsModule = window.fjTweakerModules?.farmtools;
          if (toolsModule && toolsModule.handleBulldozer) {
            if (toolsModule.handleBulldozer(tileElement, tileIndex)) {
              console.log('Successfully removed object with bulldozer');
            } else {
              console.log('Nothing to remove with bulldozer');
            }
          }
        } else if (selected.key === 'glove') {
          
          if (handleGlove(tileElement, tileIndex)) {
            console.log('Successfully moved object with glove');
          } else {
            console.log('Nothing to move with glove');
          }
        } else {
          
          const currentTileType = getTileType(tileElement);
          const newTileType = applyTool(selected.key, currentTileType, tileIndex);
          
          if (newTileType && newTileType !== currentTileType) {
            changeTile(tileElement, newTileType);
            try { if (newTileType === 'tilled') window.fjFarm?.audio?.play?.('till'); } catch(_) {}
          }
        }
      } else if (selected.type === 'seed') {
        
        const currentTileType = getTileType(tileElement);
        if (currentTileType === 'tilled' && !hasPlant(tileElement)) {
          
          const seedCost = getSeedCost(selected.key);
          
          if (plantSeed(tileElement, selected.key, seedCost)) {
            
            console.log(`Planted ${selected.key} for ${seedCost} coins`);
            try { window.fjFarm?.audio?.play?.('plant'); } catch(_) {}
          } else {
            console.log(`Failed to plant ${selected.key} - insufficient coins or tile already occupied`);
            try { window.fjFarm?.audio?.play?.('deny'); } catch(_) {}
          }
        }
      } else if (selected.type === 'object') {
        
        const shopModule = window.fjTweakerModules?.farmshop;
        if (shopModule) {
          let objectCost = selected.isInventoryObject ? 0 : shopModule.getObjectCost(selected.key);
          
          if (shopModule.placeObject(tileElement, tileIndex, selected.key, objectCost)) {
            
            console.log(`Placed ${selected.key} for ${objectCost} coins`);
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
            console.log(`Failed to place ${selected.key} - invalid placement or insufficient coins`);
            try { window.fjFarm?.audio?.play?.('deny'); } catch(_) {}
          }
        }
      } else if (selected.type === 'tile') {
        
        const tileCost = getTileCost(selected.key);
        
        if (buyTile(tileElement, tileIndex, selected.key, tileCost)) {
          console.log(`Placed ${selected.key} tile for ${tileCost} coins`);
          try { window.fjFarm?.audio?.play?.('tile'); } catch(_) {}
        } else {
          console.log(`Failed to place ${selected.key} tile - invalid placement or insufficient coins`);
          try { window.fjFarm?.audio?.play?.('deny'); } catch(_) {}
        }
      } else if (selected.type === 'moved-object') {
        
        const shopModule = window.fjTweakerModules?.farmshop;
        if (shopModule && shopModule.canPlaceObject && shopModule.placeObject) {
          if (shopModule.canPlaceObject(tileIndex, selected.key)) {
            
            if (shopModule.placeObject(tileElement, tileIndex, selected.key, 0)) {
              console.log(`Placed moved ${selected.key} for free`);
              try { window.fjFarm?.audio?.play?.('place'); } catch(_) {}
              const interactModule = window.fjTweakerModules?.farminteract;
              if (interactModule && interactModule.selectItem) {
                
                interactModule.selectItem({ key: 'glove', type: 'tool', icon: 'icons/farm/tools/glove.png' }, null);
              }
            }
          } else {
            console.log(`Cannot place ${selected.key} here - invalid location`);
          }
        }
      }
    } catch (e) {
      console.error('Tile click error:', e);
    }
  };

  
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
    
    const currentTileType = getTileType(tileElement);
    const hasPlantOnTile = hasPlant(tileElement);
    const hasObjectOnTile = !!window.fjFarm?.state?.getObject?.(tileIndex);
    
    
    if (newTileType === 'water' && (hasPlantOnTile || hasObjectOnTile)) {
      return false;
    }
    
    
    if (hasPlantOnTile && newTileType !== 'tilled') {
      return false;
    }
    
    
    if (newTileType === 'tilled') {
      return false;
    }
    
    return true;
  };

  
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
        
        window.fjfeFarmTT?.show?.({
          imageSrc: resolve(`icons/farm/plants/${plantGrowthInfo.seedName}${iconSuffix}.png`),
          name: plantGrowthInfo.seedInfo.name,
          bodyTop: growthText,
          bodyTT: plantGrowthInfo.seedInfo.desc,
          cost: String(plantGrowthInfo.cost),
          costIcon: 'icons/farm/coin.png',
        });
        return;
      }

      
      const objectData = window.fjFarm?.state?.getObject?.(tileIndex);
      if (objectData && objectData.isAnchor) { 
        const shopModule = window.fjTweakerModules?.farmshop;
        const objectTips = shopModule?.getObjectTips?.() || {};
        const objectInfo = objectTips[objectData.objectName];
        
        if (objectInfo) {
          window.fjfeFarmTT?.show?.({
            imageSrc: resolve(`icons/farm/objects/${objectData.objectName}.png`),
            name: objectInfo.name,
            bodyTop: '', 
            bodyTT: objectInfo.desc,
            cost: String(objectData.cost || objectInfo.prc),
            costIcon: 'icons/farm/coin.png',
          });
        }
        return;
      }
    } catch (error) {
      console.error('Tooltip error:', error);
    }
  };

  
  const hideTileTooltip = () => {
    try {
      window.fjfeFarmTT?.hide?.();
    } catch (_) {}
  };

  
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
      interactModule.selectItem({
        key: objectData.objectName,
        type: 'moved-object',
        icon: `icons/farm/objects/${objectData.objectName}.png`,
        originalCost: objectData.cost || 0,
        size: size
      }, null); 
    }
    
    console.log(`Picked up ${objectData.objectName} with glove`);
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
          console.log(`Applied watering with ${toolKey}`);
        }
        break;
        
      case 'weedbasic':
      case 'weedbetter':
      case 'weedbest':
        
        const toolsModule2 = window.fjTweakerModules?.farmtools;
        if (toolsModule2 && toolsModule2.handleWeedingTool) {
          toolsModule2.handleWeedingTool(toolKey, tileIndex);
          console.log(`Applied weeding with ${toolKey}`);
        }
        break;
    }
    return null; 
  };
  
  
  const checkForGrownPlants = (toolKey, tileIndex) => {
    let tilesToCheck = [];
    
    if (toolKey === 'hvstbasic') {
      tilesToCheck = [tileIndex];
    } else if (toolKey === 'hvstbetter') {
      tilesToCheck = getAreaTiles(tileIndex, 5);
    } else if (toolKey === 'hvstbest') {
      tilesToCheck = getAllGrownCropTiles();
      return tilesToCheck.length > 0; 
    }
    
    const seedsModule = window.fjTweakerModules?.farmseeds;
    if (!seedsModule) return false;
    
    for (const targetIndex of tilesToCheck) {
      const plantData = window.fjFarm?.state?.getPlant?.(targetIndex);
      if (plantData) {
        const plantGrowthInfo = seedsModule.getPlantGrowthInfo(targetIndex);
        if (plantGrowthInfo && plantGrowthInfo.isGrown) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  
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
    
    for (const targetIndex of tilesToHarvest) {
      
      const plantData = window.fjFarm?.state?.getPlant?.(targetIndex);
      if (!plantData) continue;
      
      
      const seedsModule = window.fjTweakerModules?.farmseeds;
      if (!seedsModule) continue;
      
      const plantGrowthInfo = seedsModule.getPlantGrowthInfo(targetIndex);
      if (!plantGrowthInfo || !plantGrowthInfo.isGrown) continue;
      
      
      let harvestItem = plantData.seedName; 
      if (plantData.seedName === 'eggvine') {
        harvestItem = 'egg';
      } else if (plantData.seedName === 'meatbulb') {
        harvestItem = 'meat';
      }
      
      
      if (invModule && invModule.addToInventory) {
        const success = invModule.addToInventory(harvestItem, 1, 'plant');
        if (success) {
          
          window.fjFarm?.state?.setPlant?.(targetIndex, null);
          
          
          const tileStrip = document.getElementById('fj-farm-tiles');
          if (tileStrip) {
            const tiles = Array.from(tileStrip.children);
            const tileElement = tiles[targetIndex];
            const plantOverlay = tileElement?.querySelector?.('.plant-overlay');
            if (plantOverlay) {
              plantOverlay.remove();
            }
          }
          
          harvestedCount++;
        } else {
          console.log(`Failed to harvest ${harvestItem} - inventory may be full`);
        }
      }
    }
    
    if (harvestedCount > 0) {
      console.log(`Harvested ${harvestedCount} plants with ${toolKey}`);
      try { window.fjFarm?.audio?.play?.('harvest'); } catch(_) {}
      return true;
    }
    
    return false;
  };
  
  
  const getAreaTiles = (centerIndex, size) => {
    const tiles = [];
    const totalCols = 8; 
    const totalRows = 8;
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
    const totalTiles = 64; 
    const seedsModule = window.fjTweakerModules?.farmseeds;
    
    if (!seedsModule) return tiles;
    
    for (let i = 0; i < totalTiles; i++) {
      const plantData = window.fjFarm?.state?.getPlant?.(i);
      if (plantData) {
        const plantGrowthInfo = seedsModule.getPlantGrowthInfo(i);
        if (plantGrowthInfo && plantGrowthInfo.isGrown) {
          tiles.push(i);
        }
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

  
  const plantSeed = (tileElement, seedKey, seedCost) => {
    if (!tileElement || !seedKey) return false;
    
    
    const tileStrip = document.getElementById('fj-farm-tiles');
    if (!tileStrip) return false;
    
    const tiles = Array.from(tileStrip.children);
    const tileIndex = tiles.indexOf(tileElement);
    if (tileIndex === -1) return false;
    
    
    const currentType = getTileType(tileElement);
    if (currentType !== 'tilled' || hasPlant(tileElement)) {
      return false;
    }
    
    
    const currentCoins = window.fjFarm?.coins?.get?.() || 0;
    if (currentCoins < seedCost) {
      return false; 
    }
    
    
    window.fjFarm?.coins?.add?.(-seedCost);
    
    
    const plantData = {
      seedName: seedKey,
      plantedAt: Date.now(),
      cost: seedCost,
      
      progressMs: 0,
      lastGrowCheck: Date.now(),
      isGrown: false
    };
    window.fjFarm?.state?.setPlant?.(tileIndex, plantData);

    
    try {
      const toolsModule = window.fjTweakerModules?.farmtools;
      if (toolsModule && toolsModule.initializeTileTimer) {
        toolsModule.initializeTileTimer(tileIndex);
      }
    } catch (_) {}
    
    
    const plantOverlay = document.createElement('img');
    plantOverlay.className = 'plant-overlay';
    plantOverlay.alt = `${seedKey} growing`;
    plantOverlay.draggable = false;
    plantOverlay.decoding = 'async';
    plantOverlay.loading = 'lazy';
    plantOverlay.src = resolve(`icons/farm/plants/${seedKey}_growing.png`);
    plantOverlay.onerror = function() {
      this.src = resolve('icons/error.png');
    };
    
    
    Object.assign(plantOverlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '1',
    });
    
    
    let container = tileElement;
    if (tileElement.tagName === 'IMG') {
      container = tileElement.parentNode;
    }
    
    if (!container) return false;
    
    container.appendChild(plantOverlay);
    return true;
  };
  
  
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
      this.src = resolve('icons/farm/tiles/error.png');
    };
  };


  
  
  const initTileClickHandlers = () => {
    const tileStrip = document.getElementById('fj-farm-tiles');
    if (!tileStrip) return;
    
    const tiles = tileStrip.children; 
    Array.from(tiles).forEach((tile, index) => {
      
      tile.removeEventListener('click', tile._farmTileHandler);
      
      
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleTileClick(tile, index);
      };
      
      tile._farmTileHandler = handler;
      tile.addEventListener('click', handler);
      
      
      tile.addEventListener('mouseenter', () => {
        const interactModule = window.fjTweakerModules?.farminteract;
        if (interactModule?.hasSelection?.()) {
          const selected = interactModule.getSelected();
          if (selected && selected.type === 'tool') {
            if (selected.key === 'bulldoze') {
              
              const objectData = window.fjFarm?.state?.getObject?.(index);
              const plantData = window.fjFarm?.state?.getPlant?.(index);
              if (objectData || plantData) {
                tile.style.cursor = 'pointer';
                tile.style.filter = 'brightness(1.2) saturate(1.1)';
              } else {
                tile.style.cursor = 'not-allowed';
                tile.style.filter = 'brightness(0.7)';
              }
            } else if (selected.key === 'glove') {
              
              const objectData = window.fjFarm?.state?.getObject?.(index);
              if (objectData) {
                tile.style.cursor = 'pointer';
                tile.style.filter = 'brightness(1.2) saturate(1.1)';
              } else {
                tile.style.cursor = 'not-allowed';
                tile.style.filter = 'brightness(0.7)';
              }
            } else {
              
              if (selected.key.startsWith('hvst')) {
                
                const hasGrownPlants = checkForGrownPlants(selected.key, index);
                if (hasGrownPlants) {
                  tile.style.cursor = 'pointer';
                  tile.style.filter = 'brightness(1.2) saturate(1.1)';
                } else {
                  tile.style.cursor = 'not-allowed';
                  tile.style.filter = 'brightness(0.7)';
                }
              } else if (selected.key && (selected.key === 'wcbasic' || selected.key === 'wcbetter' || selected.key === 'wcbest' || 
                         selected.key === 'weedbasic' || selected.key === 'weedbetter' || selected.key === 'weedbest')) {
                
                const hasPlants = hasPlant(tile);
                if (hasPlants) {
                  tile.style.cursor = 'pointer';
                  tile.style.filter = 'brightness(1.2) saturate(1.1)';
                } else {
                  tile.style.cursor = 'not-allowed';
                  tile.style.filter = 'brightness(0.7)';
                }
              } else {
                
                const currentType = getTileType(tile);
                const newType = applyToolPreview(selected.key, currentType);
                if (newType && newType !== currentType) {
                  tile.style.cursor = 'pointer';
                  tile.style.filter = 'brightness(1.2) saturate(1.1)';
                } else {
                  tile.style.cursor = 'not-allowed';
                  tile.style.filter = 'brightness(0.7)';
                }
              }
            }
          } else if (selected && selected.type === 'seed') {
            const currentType = getTileType(tile);
            if (currentType === 'tilled' && !hasPlant(tile)) {
              tile.style.cursor = 'pointer';
              tile.style.filter = 'brightness(1.2) saturate(1.1)';
            } else {
              tile.style.cursor = 'not-allowed';
              tile.style.filter = 'brightness(0.7)';
            }
          } else if (selected && selected.type === 'object') {
            
            const shopModule = window.fjTweakerModules?.farmshop;
            if (shopModule) {
              const canPlace = shopModule.canPlaceObject(index, selected.key);
              if (canPlace) {
                tile.style.cursor = 'pointer';
                
                shopModule.highlightObjectArea(index, selected.key, 'valid');
              } else {
                tile.style.cursor = 'not-allowed';
                
                shopModule.highlightObjectArea(index, selected.key, 'invalid');
              }
            }
          } else if (selected && selected.type === 'moved-object') {
            
            const shopModule = window.fjTweakerModules?.farmshop;
            if (shopModule) {
              const canPlace = shopModule.canPlaceObject(index, selected.key);
              if (canPlace) {
                tile.style.cursor = 'pointer';
                shopModule.highlightObjectArea(index, selected.key, 'valid');
              } else {
                tile.style.cursor = 'not-allowed';
                shopModule.highlightObjectArea(index, selected.key, 'invalid');
              }
            }
          } else if (selected && selected.type === 'tile') {
            
            const canPlace = canPlaceTile(tile, index, selected.key);
            if (canPlace) {
              tile.style.cursor = 'pointer';
              tile.style.filter = 'brightness(1.2) saturate(1.1)';
              tile.style.boxShadow = 'inset 0 0 0 2px rgba(0, 255, 0, 0.5)';
            } else {
              tile.style.cursor = 'not-allowed';
              tile.style.filter = 'brightness(0.7) saturate(1.5)';
              tile.style.boxShadow = 'inset 0 0 0 2px rgba(255, 0, 0, 0.7)';
            }
          } else {
            tile.style.cursor = 'default';
          }
        } else {
          tile.style.cursor = 'default';
          
          showTileTooltip(tile, index);
        }
      });
      
      tile.addEventListener('mouseleave', () => {
        tile.style.filter = '';
        tile.style.boxShadow = '';
        tile.style.cursor = 'default';
        
        const shopModule = window.fjTweakerModules?.farmshop;
        if (shopModule) {
          shopModule.clearObjectHighlights();
        }
        
        const interactModule = window.fjTweakerModules?.farminteract;
        if (!interactModule?.hasSelection?.()) {
          hideTileTooltip();
        }
      });
    });
  };

  const getTileTips = () => TILE_TIPS;

  
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
      
      console.log(`Tilled ${tilledCount} soil tiles`);
    } catch (error) {
      console.error('Error tilling all soil:', error);
    }
  };

  const waterAllCrops = () => {
    try {
      const allPlantTiles = getAllPlantTiles();
      const toolsModule = window.fjTweakerModules?.farmtools;
      
      if (!toolsModule) return;
      
      allPlantTiles.forEach(tileIndex => {
        toolsModule.waterTile?.(tileIndex);
      });
      
      console.log(`Watered ${allPlantTiles.length} crops`);
      try { if (allPlantTiles.length > 0) window.fjFarm?.audio?.play?.('watering'); } catch(_) {}
    } catch (error) {
      console.error('Error watering all crops:', error);
    }
  };

  const weedAllCrops = () => {
    try {
      const allPlantTiles = getAllPlantTiles();
      const toolsModule = window.fjTweakerModules?.farmtools;
      
      if (!toolsModule) return;
      
      allPlantTiles.forEach(tileIndex => {
        toolsModule.weedTile?.(tileIndex);
      });
      
      console.log(`Weeded ${allPlantTiles.length} crops`);
      try { if (allPlantTiles.length > 0) window.fjFarm?.audio?.play?.('weeding'); } catch(_) {}
    } catch (error) {
      console.error('Error weeding all crops:', error);
    }
  };

  const harvestAllGrownCrops = () => {
    try {
      const grownCropTiles = getAllGrownCropTiles();
      
      if (grownCropTiles.length === 0) {
        console.log('No grown crops to harvest');
        return;
      }

      
      if (handleHarvestTool('hvstbest', -1)) {
        console.log(`Harvested ${grownCropTiles.length} grown crops`);
      } else {
        console.log('Failed to harvest crops - inventory may be full');
      }
    } catch (error) {
      console.error('Error harvesting all grown crops:', error);
    }
  };

  
  const getAllPlantTiles = () => {
    const tiles = [];
    const totalTiles = 64; 
    for (let i = 0; i < totalTiles; i++) {
      const plantData = window.fjFarm?.state?.getPlant?.(i);
      if (plantData) tiles.push(i);
    }
    return tiles;
  };

  const init = () => {
    
    setTimeout(initTileClickHandlers, 100); 
  };

  window.fjTweakerModules = window.fjTweakerModules || {};
  window.fjTweakerModules[MODULE_KEY] = {
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
  };
})();