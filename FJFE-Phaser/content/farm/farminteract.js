(() => {
  const MODULE_KEY = 'farminteract';
  
  let cursorEl = null;
  let cursorBadgeEl = null; 
  let selectedItem = null;
  let selectedButton = null;
  let lastMousePos = { x: 0, y: 0 };
  
  const resolve = (p) => (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p;
  
  
  const createCursor = () => {
    if (cursorEl) return cursorEl;
    
    cursorEl = document.createElement('img');
    Object.assign(cursorEl.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483647',
      width: '32px',
      height: '32px',
      opacity: '0.8',
      display: 'none',
    });
    cursorEl.draggable = false;
    cursorEl.decoding = 'async';
    cursorEl.loading = 'eager';
    
    
    cursorBadgeEl = document.createElement('div');
    Object.assign(cursorBadgeEl.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483647',
      minWidth: '16px',
      height: '16px',
      padding: '0 3px',
      borderRadius: '8px',
      background: 'rgba(0,0,0,0.85)',
      color: '#fff',
      fontSize: '11px',
      fontWeight: '700',
      lineHeight: '16px',
      textAlign: 'center',
      display: 'none',
    });

    document.body.appendChild(cursorEl);
    document.body.appendChild(cursorBadgeEl);
    return cursorEl;
  };
  
  
  const updateCursorPosition = (e) => {
    if (!cursorEl || !selectedItem) return;
    
    const x = e.clientX + 8; 
    const y = e.clientY + 8;
    
    cursorEl.style.left = x + 'px';
    cursorEl.style.top = y + 'px';

    if (cursorBadgeEl && cursorBadgeEl.style.display !== 'none') {
      cursorBadgeEl.style.left = (x + 18) + 'px';
      cursorBadgeEl.style.top = (y + 18) + 'px';
    }
  };
  
  
  const selectItem = (itemData, buttonElement) => {
    if (selectedButton) {
      
      selectedButton.style.background = selectedButton.dataset.originalBg || '#1a1a1a';
      selectedButton.style.removeProperty('box-shadow');
    }
    
    selectedItem = itemData;
    selectedButton = buttonElement;
    
    
    if (selectedButton) {
      selectedButton.dataset.originalBg = selectedButton.style.background || '#1a1a1a';
      selectedButton.style.background = 'rgba(255, 255, 255, 0.3)';
      selectedButton.style.boxShadow = 'inset 0 0 0 2px rgba(255, 255, 255, 0.5)';
    }
    
    
    updateTooltipForSelection(itemData);
    
    
    const cursor = createCursor();
    cursor.src = resolve(itemData.icon);
    cursor.onerror = function() { this.src = resolve('icons/error.png'); };
    cursor.style.display = 'block';
    
    if (cursorBadgeEl) {
      const countVal = Number(itemData.count || 0);
      if ((itemData.type === 'inventory-item' || (itemData.type === 'object' && itemData.isInventoryObject)) && countVal > 1) {
        cursorBadgeEl.textContent = String(countVal);
        cursorBadgeEl.style.display = 'block';
      } else {
        cursorBadgeEl.style.display = 'none';
      }
    }
    
    
    document.addEventListener('mousemove', updateCursorPosition, { passive: true });
    
    try { updateCursorPosition({ clientX: lastMousePos.x, clientY: lastMousePos.y }); } catch(_) {}
  };

  
  const refreshCursorBadge = () => {
    if (!cursorBadgeEl) return;
    if (!selectedItem) { cursorBadgeEl.style.display = 'none'; return; }
    const countVal = Number(selectedItem.count || 0);
    if ((selectedItem.type === 'inventory-item' || (selectedItem.type === 'object' && selectedItem.isInventoryObject)) && countVal > 1) {
      cursorBadgeEl.textContent = String(countVal);
      cursorBadgeEl.style.display = 'block';
    } else {
      cursorBadgeEl.style.display = 'none';
    }
  };
  
  
  const deselectItem = () => {
    
    if (selectedItem && selectedItem.type === 'moved-object') {
      try {
        const invModule = window.fjTweakerModules?.farminv;
        if (invModule && invModule.addToInventory) {
          
          const itemName = selectedItem.key;
          const itemType = 'object';
          const itemCost = selectedItem.originalCost || 0;

          if (invModule.addToInventory(itemName, 1, itemType)) {
            console.log(`Returned ${selectedItem.key} to inventory`);
          } else {
            console.warn(`Failed to return ${selectedItem.key} to inventory - may be full`);
            
            const sellPrice = Math.ceil(itemCost * 0.5);
            window.fjFarm?.coins?.add?.(sellPrice);
            console.log(`Sold ${selectedItem.key} for ${sellPrice} coins (inventory full)`);
          }
        }
      } catch (error) {
        console.error('Error returning moved object to inventory:', error);
      }
    }

    
    if (selectedItem && selectedItem.type === 'inventory-item' && !selectedItem._skipReturn) {
      try {
        const invModule = window.fjTweakerModules?.farminv;
        if (invModule) {
          const { item, count, itemType, originSlotIndex } = selectedItem;
          let placedBack = false;
          if (typeof originSlotIndex === 'number') {
            placedBack = !!invModule.addToSlot?.(originSlotIndex, item, count, itemType);
          }
          if (!placedBack) {
            invModule.addToInventory?.(item, count, itemType);
          }
        }
      } catch (error) {
        console.error('Error returning inventory item to slot:', error);
      }
    }

    
    if (selectedItem && selectedItem.type === 'object' && selectedItem.isInventoryObject && !selectedItem._skipReturn) {
      try {
        const invModule = window.fjTweakerModules?.farminv;
        const cnt = Math.max(1, Number(selectedItem.count || 1));
        invModule?.addToInventory?.(selectedItem.key, cnt, 'object');
      } catch (error) {
        console.error('Error returning inventory object to inventory:', error);
      }
    }
    
    if (selectedButton) {
      selectedButton.style.background = selectedButton.dataset.originalBg || '#1a1a1a';
      selectedButton.style.removeProperty('box-shadow');
      selectedButton.removeAttribute('data-original-bg');
    }
    
    selectedItem = null;
    selectedButton = null;
    
    if (cursorEl) {
      cursorEl.style.display = 'none';
    }
    if (cursorBadgeEl) {
      cursorBadgeEl.style.display = 'none';
    }
    
    document.removeEventListener('mousemove', updateCursorPosition);
  };
  
  
  const addClickAnimation = (buttonElement) => {
    if (!buttonElement) return;
    
    
    buttonElement.style.transform = 'scale(0.9)';
    buttonElement.style.transition = 'transform 0.1s ease';
    
    setTimeout(() => {
      buttonElement.style.transform = 'scale(1.05)';
      setTimeout(() => {
        buttonElement.style.transform = 'scale(1)';
      }, 60);
    }, 100);
  };

  
  const executeBestTool = (toolKey) => {
    try {
      const tileModule = window.fjTweakerModules?.farmtile;
      if (!tileModule) return;

      switch (toolKey) {
        case 'hoebest':
          
          tileModule.tillAllSoil?.();
          break;
        case 'wcbest':
          
          tileModule.waterAllCrops?.();
          break;
        case 'weedbest':
          
          tileModule.weedAllCrops?.();
          break;
        case 'hvstbest':
          
          tileModule.harvestAllGrownCrops?.();
          break;
      }
    } catch (error) {
      console.error(`Error executing ${toolKey}:`, error);
    }
  };

  
  const handleButtonClick = (e, itemData, buttonElement) => {
    e.preventDefault();
    e.stopPropagation();
    
    
    addClickAnimation(buttonElement);
    
    
    if (itemData.type === 'tool' && itemData.key && itemData.key.includes('best')) {
      executeBestTool(itemData.key);
      return; 
    }
    
    if (selectedButton === buttonElement) {
      
      deselectItem();
    } else {
      
      selectItem(itemData, buttonElement);
      
      try {
        if (itemData.type === 'tool' && itemData.key === 'bulldoze') {
          window.fjFarm?.audio?.play?.('dozer');
        } else {
          
          window.fjFarm?.audio?.play?.('click');
        }
      } catch(_) {}
    }
  };
  
  
  const wireButton = (buttonElement, itemData) => {
    if (!buttonElement || !itemData) return buttonElement;
    
    
    
    const existingHandler = buttonElement._interactHandler;
    if (existingHandler) {
      buttonElement.removeEventListener('click', existingHandler);
    }
    
    
    const newHandler = (e) => {
      handleButtonClick(e, itemData, buttonElement);
    };
    buttonElement._interactHandler = newHandler;
    buttonElement.addEventListener('click', newHandler);
    
    return buttonElement;
  };
  
  
  const init = () => {
    
    document.addEventListener('mousemove', (e) => {
      lastMousePos.x = e.clientX || 0;
      lastMousePos.y = e.clientY || 0;
    }, { passive: true });
    
    document.addEventListener('click', (e) => {
      
      const farmElement = e.target.closest('[data-farmtool-key], [data-seed-key], [data-tile-key], [data-shop-key], .fj-farm-panel, #fj-farm-menuhost');
      if (!farmElement && selectedItem) {
        deselectItem();
      }
    });
    
    
    document.addEventListener('contextmenu', (e) => {
      if (selectedItem) {
        e.preventDefault();
        e.stopPropagation();
        const wasMovedObject = selectedItem?.type === 'moved-object';
        deselectItem();
        
        if (wasMovedObject) {
          selectItem({ key: 'glove', type: 'tool', icon: 'icons/farm/tools/glove.png' }, null);
        }
      }
    });
    
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && selectedItem) {
        const wasMovedObject = selectedItem?.type === 'moved-object';
        deselectItem();
        if (wasMovedObject) {
          selectItem({ key: 'glove', type: 'tool', icon: 'icons/farm/tools/glove.png' }, null);
        }
      }
    });
  };
  
  
  const updateTooltipForSelection = (itemData) => {
    if (!itemData || !window.fjfeFarmTT) return;
    
    try {
      let tooltipData = {};
      
      if (itemData.type === 'seed') {
        const seedsModule = window.fjTweakerModules?.farmseeds;
        if (seedsModule && seedsModule.getSeedTips) {
          const seedTips = seedsModule.getSeedTips();
          const seedInfo = seedTips[itemData.key];
          if (seedInfo) {
            tooltipData = {
              imageSrc: itemData.icon ? (itemData.icon.startsWith('icons/') ? 
                chrome.runtime?.getURL?.(itemData.icon) || itemData.icon : itemData.icon) : '',
              name: seedInfo.name,
              bodyTop: `Growth time: ${seedInfo.growtime} hrs.`,
              bodyTT: seedInfo.desc,
              cost: String(seedInfo.prc || 0),
              costIcon: 'icons/farm/coin.png',
            };
          }
        }
      } else if (itemData.type === 'tool') {
        const toolsModule = window.fjTweakerModules?.farmtools;
        if (toolsModule && toolsModule.getToolTips) {
          const toolTips = toolsModule.getToolTips();
          const toolInfo = toolTips[itemData.key];
          if (toolInfo) {
            tooltipData = {
              imageSrc: itemData.icon ? (itemData.icon.startsWith('icons/') ? 
                chrome.runtime?.getURL?.(itemData.icon) || itemData.icon : itemData.icon) : '',
              name: toolInfo.name,
              bodyTop: '',
              bodyTT: toolInfo.desc,
              
            };
          }
        }
      } else if (itemData.type === 'tile') {
        const tileModule = window.fjTweakerModules?.farmtile;
        if (tileModule && tileModule.getTileTips) {
          const tileTips = tileModule.getTileTips();
          const tileInfo = tileTips[itemData.key];
          if (tileInfo) {
            tooltipData = {
              imageSrc: itemData.icon ? (itemData.icon.startsWith('icons/') ? 
                chrome.runtime?.getURL?.(itemData.icon) || itemData.icon : itemData.icon) : '',
              name: tileInfo.name,
              bodyTop: '',
              bodyTT: tileInfo.desc,
              ...(tileInfo.prc > 0 ? { cost: String(tileInfo.prc), costIcon: 'icons/farm/coin.png' } : {}),
            };
          }
        }
      } else if (itemData.type === 'object') {
        const shopModule = window.fjTweakerModules?.farmshop;
        if (shopModule && shopModule.getObjectTips) {
          const objectTips = shopModule.getObjectTips();
          const objectInfo = objectTips[itemData.key];
          if (objectInfo) {
            tooltipData = {
              imageSrc: itemData.icon ? (itemData.icon.startsWith('icons/') ? 
                chrome.runtime?.getURL?.(itemData.icon) || itemData.icon : itemData.icon) : '',
              name: objectInfo.name,
              bodyTop: '',
              bodyTT: objectInfo.desc,
              ...(objectInfo.prc > 0 ? { cost: String(objectInfo.prc), costIcon: 'icons/farm/coin.png' } : {}),
            };
          }
        }
      } else if (itemData.type === 'moved-object') {
        const shopModule = window.fjTweakerModules?.farmshop;
        if (shopModule && shopModule.getObjectTips) {
          const objectTips = shopModule.getObjectTips();
          const objectInfo = objectTips[itemData.key];
          if (objectInfo) {
            tooltipData = {
              imageSrc: itemData.icon ? (itemData.icon.startsWith('icons/') ? 
                chrome.runtime?.getURL?.(itemData.icon) || itemData.icon : itemData.icon) : '',
              name: objectInfo.name,
              bodyTop: '',
              bodyTT: objectInfo.desc,
              
            };
          }
        }
      }
      
      if (Object.keys(tooltipData).length > 0) {
        window.fjfeFarmTT.show(tooltipData);
      }
    } catch (error) {
      console.error('Tooltip update error:', error);
    }
  };

  
  const getSelected = () => selectedItem;
  
  
  const hasSelection = () => !!selectedItem;
  
  
  const onMenuChange = () => {
    if (selectedItem) {
      deselectItem();
    }
  };

  
  window.fjTweakerModules = window.fjTweakerModules || {};
  window.fjTweakerModules[MODULE_KEY] = {
    init,
    wireButton,
    selectItem,
    deselectItem,
    refreshCursorBadge,
    getSelected,
    hasSelection,
    onMenuChange,
  };
  
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();