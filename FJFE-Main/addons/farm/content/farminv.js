(() => {
	// Inventory grid for plants/objects/food plus the sell-mode workflow
	const MODULE_KEY='farminv';
	let root=null,isOpen=false;
	let buttonsMeta=[];
	let isSellMode = false; 
	const selectedForSale = new Set(); 

	const BTN=60, GAP=10, PAD=10; 
	const COLS=5; 
	const INITIAL_ROWS = 1; 
	
	
	let inventorySlots = Array(COLS * INITIAL_ROWS).fill(null);
	
	
	const getBoxWidth = () => {
		return (COLS * BTN) + ((COLS - 1) * GAP) + (PAD * 2);
	};
	
	
	const getCurrentRows = () => {
		return Math.ceil(inventorySlots.length / COLS);
	};
	
	
	const expandInventory = () => {
		const newSlots = Array(COLS).fill(null);
		inventorySlots.push(...newSlots);
		return true;
	};
	
	
	// Auto-grow the grid when the bottom row fills up so players never run out of slots
	const checkAndExpandInventory = () => {
		const currentRows = getCurrentRows();
		const lastRowStart = (currentRows - 1) * COLS;
		
		
		let lastRowFull = true;
		for (let i = lastRowStart; i < lastRowStart + COLS && i < inventorySlots.length; i++) {
			if (!inventorySlots[i] || inventorySlots[i].count === 0) {
				lastRowFull = false;
				break;
			}
		}
		
		if (lastRowFull) {
			expandInventory();
			return true;
		}
		
		return false;
	};
	
	
	const resolve = (p) => {
		try { return (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p; } catch (_) { return p; }
	};

	const parseTags = (value) => {
		if (!value) return [];
		if (Array.isArray(value)) {
			return value
				.map((tag) => String(tag || '').trim())
				.filter(Boolean);
		}
		if (typeof value === 'string') {
			return value
				.split(/[|,]/)
				.map((tag) => String(tag || '').trim())
				.filter(Boolean);
		}
		return [];
	};

	const FERTILIZER_TAG = 'Fertilized';

	
	// Drop new items into existing stacks, fall back to empty slots, and expand if needed
	const addToInventory = (itemName, count = 1, itemType = 'plant') => {
		
		for (let i = 0; i < inventorySlots.length; i++) {
			const slot = inventorySlots[i];
			if (slot && slot.item === itemName && slot.type === itemType) {
				slot.count += count;
				checkAndExpandInventory(); 
				refreshInventoryUI();
				saveInventoryData();
				try { window.fjFarm?.state?.markSeenItem?.(itemName); } catch(_) {}
				return true;
			}
		}
		
		
		for (let i = 0; i < inventorySlots.length; i++) {
			if (!inventorySlots[i]) {
				inventorySlots[i] = { item: itemName, count: count, type: itemType };
				checkAndExpandInventory(); 
				refreshInventoryUI();
				saveInventoryData();
				try { window.fjFarm?.state?.markSeenItem?.(itemName); } catch(_) {}
				return true;
			}
		}
		
		
		expandInventory();
		return addToInventory(itemName, count, itemType); 
		
		
		return false;
	};

	
	const addToSlot = (slotIndex, itemName, count = 1, itemType = 'plant') => {
		if (slotIndex < 0 || slotIndex >= inventorySlots.length) return false;
		
		const slot = inventorySlots[slotIndex];
		if (slot && slot.item === itemName && slot.type === itemType) {
			
			slot.count += count;
		} else if (!slot) {
			
			inventorySlots[slotIndex] = { item: itemName, count: count, type: itemType };
		} else {
			
			return false;
		}
		
		checkAndExpandInventory();
		refreshInventoryUI();
		saveInventoryData();
		return true;
	};

	
	let suppressPrune = false; 

	// Return the removed stack so callers can hand it to farminteract for cursor selection
	const removeFromSlot = (slotIndex, count = 1, options = {}) => {
		const skipSave = !!options.skipSave;
		if (slotIndex < 0 || slotIndex >= inventorySlots.length || !inventorySlots[slotIndex]) return null;
		
		const slot = inventorySlots[slotIndex];
		const actualCount = Math.min(count, slot.count);
		
		const removedItem = {
			item: slot.item,
			count: actualCount,
			type: slot.type
		};
		
		slot.count -= actualCount;
		if (slot.count <= 0) {
			inventorySlots[slotIndex] = null; 
		}
		
		pruneEmptyTrailingRows();
		refreshInventoryUI();
		if (!skipSave) {
			saveInventoryData();
		}
		return removedItem;
	};

	
	// Collapse empty rows from the bottom to keep the UI compact once items are moved out
	const pruneEmptyTrailingRows = () => {
		try {
			
			if (suppressPrune) return;
			
			try {
				const interact = window.fjTweakerModules?.farminteract;
				if (interact && interact.hasSelection && interact.hasSelection()) {
					return;
				}
			} catch(_) {}
			let changed = false;
			while (getCurrentRows() > INITIAL_ROWS) {
				const rows = getCurrentRows();
				const lastRowStart = (rows - 1) * COLS;
				let allEmpty = true;
				for (let i = lastRowStart; i < lastRowStart + COLS && i < inventorySlots.length; i++) {
					if (inventorySlots[i]) { allEmpty = false; break; }
				}
				if (!allEmpty) break;
				
				inventorySlots.splice(lastRowStart, COLS);
				changed = true;
			}
			if (changed) {
				
				if (isOpen) buildUI();
			}
		} catch (_) {}
	};

	
	const saveInventoryData = () => {
		try {
			if (window.fjFarm && window.fjFarm.state && window.fjFarm.state.setInventory) {
				window.fjFarm.state.setInventory(inventorySlots);
			}
		} catch (_) {}
	};

	
	const loadInventoryData = () => {
		try {
			if (window.fjFarm && window.fjFarm.state && window.fjFarm.state.getInventory) {
				const saved = window.fjFarm.state.getInventory();
				if (saved && Array.isArray(saved)) {
					inventorySlots = saved;
					
					const minSize = COLS * INITIAL_ROWS;
					if (inventorySlots.length < minSize) {
						const neededSlots = minSize - inventorySlots.length;
						inventorySlots.push(...Array(neededSlots).fill(null));
					}
				}
			}
		} catch (_) {}
	};

	const buildUI=()=>{
		root.textContent='';
		const box=document.createElement('div');
		
		
		const currentRows = getCurrentRows();
		const currentBoxWidth = getBoxWidth();
		const boxHeight = (currentRows * BTN) + ((currentRows - 1) * GAP) + (PAD * 2);
		
		Object.assign(box.style,{
			position:'relative',background:'#151515',color:'#ddd',
			border:'1px solid #333',borderRadius:'8px',boxShadow:'0 8px 24px #0009',
			padding:PAD+'px',boxSizing:'border-box',width:currentBoxWidth+'px'
		});
		root.style.width=currentBoxWidth+'px';

		
		const coinRow=document.createElement('div');
		Object.assign(coinRow.style,{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px', marginBottom:'8px' });
		
		
		const coinPart=document.createElement('div');
		Object.assign(coinPart.style,{ display:'flex', alignItems:'center', gap:'2px' });
		const coinImg=document.createElement('img');
		coinImg.alt=''; coinImg.draggable=false; coinImg.decoding='async'; coinImg.loading='lazy';
		coinImg.src = resolve('addons/farm/icons/coin.png');
		coinImg.onerror=function(){ this.src = resolve('icons/error.png'); };
		Object.assign(coinImg.style,{ width:'16px', height:'16px' });
		const coinText=document.createElement('span');
		Object.assign(coinText.style,{ color:'#f3d266', fontWeight:'700' });
		const refreshCoins=()=>{ try{ const c=window.fjFarm?.coins?.get?.()||0; coinText.textContent=String(c); }catch(_){} };
		refreshCoins();
		
		const coinListener = () => refreshCoins();
		window.addEventListener('fjFarmCoinsChanged', coinListener);
		
		coinRow._coinListener = coinListener;
		coinPart.append(coinImg, coinText);
		
		
			const sellBtn=document.createElement('button');
		sellBtn.type='button';
		sellBtn.textContent='Sell';
		Object.assign(sellBtn.style,{
			padding:'4px 8px',fontSize:'12px',fontWeight:'700',color:'#fff',background:'#c33',
			border:'1px solid #c33',borderRadius:'4px',cursor:'pointer'
		});
		sellBtn.addEventListener('click', handleSellToggle);
    
			
			const livePart=document.createElement('div');
			livePart.setAttribute('data-role','live-sell');
			Object.assign(livePart.style,{ display:'none', alignItems:'center', gap:'4px' });
			const liveImg=document.createElement('img');
			liveImg.alt=''; liveImg.draggable=false; liveImg.decoding='async'; liveImg.loading='lazy';
			liveImg.src = resolve('addons/farm/icons/coin.png');
			liveImg.onerror=function(){ this.src = resolve('icons/error.png'); };
			Object.assign(liveImg.style,{ width:'16px', height:'16px' });
			const liveText=document.createElement('span');
			liveText.setAttribute('data-role','live-sell-text');
			Object.assign(liveText.style,{ color:'#f3d266', fontWeight:'700' });
			liveText.textContent='0';
			livePart.append(liveImg, liveText);
			
			coinRow._liveContainer = livePart;
			coinRow._liveText = liveText;

			const rightGroup = document.createElement('div');
			Object.assign(rightGroup.style, { display:'flex', alignItems:'center', gap:'8px' });
			
			rightGroup.append(livePart, sellBtn);

			coinRow.append(coinPart, rightGroup);

		const grid=document.createElement('div');
		Object.assign(grid.style,{
			display:'grid',gridTemplateColumns:`repeat(${COLS}, ${BTN}px)`,gridAutoRows:`${BTN}px`,gap:`${GAP}px`,
		});

		buttonsMeta=[];
		for(let i=0; i<inventorySlots.length; i++){
			const btn=document.createElement('button');
			btn.type='button';
			btn.setAttribute('data-inv-slot', i);
			Object.assign(btn.style,{
				width:BTN+'px',height:BTN+'px',display:'block',position:'relative',
				background:'#101010',border:'1px solid #2a2a2a',borderRadius:'6px',cursor:'pointer',padding:'0',margin:'0',
				boxShadow:'inset 0 0 0 1px #0008',
			});
			
			
			btn.addEventListener('click', (e) => handleSlotClick(e, i, false)); 
			btn.addEventListener('contextmenu', (e) => handleSlotClick(e, i, true)); 
			
			grid.appendChild(btn);
			buttonsMeta.push({ key:`slot${i}`, el:btn, slotIndex: i });
		}
		
		box.appendChild(grid);
		box.insertBefore(coinRow, grid);
		root.appendChild(box);
		
		
		loadInventoryData();
		refreshInventoryUI();
		applySellModeStyles(sellBtn);
	};

	
	const refreshInventoryUI = () => {
		if (!root) return;
		
		
		if (buttonsMeta.length !== inventorySlots.length) {
			buildUI();
			return;
		}
		
		buttonsMeta.forEach((meta, index) => {
			const btn = meta.el;
			const slot = inventorySlots[index];
			
			
			btn.innerHTML = '';
			
			if (slot && slot.item && slot.count > 0) {
				
				const img = document.createElement('img');
				img.alt = slot.item;
				img.draggable = false;
				img.decoding = 'async';
				img.loading = 'lazy';
				
				
				let imagePath;
				if (slot.type === 'plant' || slot.type === 'food') {
					imagePath = slot.item === 'fertilizer' ? 'addons/farm/icons/fertilizer.png' : `addons/farm/icons/food/${slot.item}.png`;
				} else if (slot.type === 'object') {
					imagePath = `addons/farm/icons/objects/${slot.item}.png`;
				} else {
					imagePath = 'icons/error.png';
				}
				
				img.src = resolve(imagePath);
				img.onerror = function() {
					this.src = resolve('icons/error.png');
				};
				
				Object.assign(img.style, {
					width: '100%',
					height: '100%',
					objectFit: 'cover'
				});
				
				btn.appendChild(img);
				
				
				if (slot.count > 1) {
					const countEl = document.createElement('div');
					countEl.textContent = String(slot.count);
					Object.assign(countEl.style, {
						position: 'absolute',
						bottom: '2px',
						right: '2px',
						background: 'rgba(0,0,0,0.8)',
						color: '#fff',
						fontSize: '10px',
						fontWeight: '700',
						padding: '1px 3px',
						borderRadius: '2px',
						minWidth: '12px',
						textAlign: 'center'
					});
					btn.appendChild(countEl);
				}
				
				
				if (btn._tooltipEnter) {
					btn.removeEventListener('mouseenter', btn._tooltipEnter);
				}
				const enterHandler = () => showInventoryTooltip(slot, btn);
				btn._tooltipEnter = enterHandler;
				btn.addEventListener('mouseenter', enterHandler);

				if (!btn._tooltipLeave) {
					btn._tooltipLeave = hideInventoryTooltip;
					btn.addEventListener('mouseleave', hideInventoryTooltip);
				}
			} else {
				
				if (btn._tooltipEnter) {
					btn.removeEventListener('mouseenter', btn._tooltipEnter);
					btn._tooltipEnter = null;
				}
				if (btn._tooltipLeave) {
					btn.removeEventListener('mouseleave', btn._tooltipLeave);
					btn._tooltipLeave = null;
				}
			}

			
			if (isSellMode) {
				btn.style.filter = 'brightness(0.75)';
				if (selectedForSale.has(index)) {
					btn.style.boxShadow = 'inset 0 0 0 2px #c33, 0 0 6px #c33';
				} else {
					btn.style.boxShadow = 'inset 0 0 0 1px #0008';
				}
						updateLiveSellTotal();
			} else {
				btn.style.filter = '';
				btn.style.boxShadow = 'inset 0 0 0 1px #0008';
			}
		});
	};

	
	// Single handler covers sell mode toggling, deposit, and pickup with half-stack right-click support
	const handleSlotClick = (e, slotIndex, isRightClick) => {
		e.preventDefault();
		e.stopPropagation();
		
		
		if (isSellMode) {
			toggleSlotForSale(slotIndex);
			try { window.fjFarm?.audio?.play?.('click'); } catch(_) {}
			refreshInventoryUI();
			return;
		}

		const interactModule = window.fjTweakerModules?.farminteract;
		if (!interactModule) return;
		
		const hasSelection = interactModule.hasSelection();
		const selected = interactModule.getSelected();
		
			if (hasSelection && (selected.type === 'moved-object' || selected.type === 'inventory-item' || (selected.type === 'object' && selected.isInventoryObject))) {
			
				if (selected.type === 'inventory-item') {
					
					const placeCount = (isRightClick && selected.count > 1) ? 1 : selected.count;
					const success = addToSlot(slotIndex, selected.item, placeCount, selected.itemType);
					if (success) {
						try { window.fjFarm?.audio?.play?.('click'); } catch(_) {}
						selected.count -= placeCount;
						if (selected.count <= 0) {
							
							selected._skipReturn = true;
							interactModule.deselectItem();
						} else {
							
							window.fjTweakerModules?.farminteract?.refreshCursorBadge?.();
						}
					}
				} else if (selected.type === 'moved-object') {
				
				const success = addToSlot(slotIndex, selected.key, 1, 'object');
				if (success) {
					try { window.fjFarm?.audio?.play?.('click'); } catch(_) {}
					interactModule.deselectItem();
				}
				} else if (selected.type === 'object' && selected.isInventoryObject) {
					
					const placeCount = (isRightClick && selected.count > 1) ? 1 : selected.count;
					const success = addToSlot(slotIndex, selected.key, placeCount, 'object');
					if (success) {
						try { window.fjFarm?.audio?.play?.('click'); } catch(_) {}
						selected.count -= placeCount;
						if (selected.count <= 0) {
							selected._skipReturn = true;
							interactModule.deselectItem();
						} else {
							window.fjTweakerModules?.farminteract?.refreshCursorBadge?.();
						}
					}
			}
		} else {
			
			const slot = inventorySlots[slotIndex];
			if (slot && slot.count > 0) {
				let pickupCount;
				if (isRightClick && slot.count > 1) {
					
					pickupCount = Math.ceil(slot.count / 2);
				} else {
					
					pickupCount = slot.count;
				}
				
				
				suppressPrune = true;
				// Do not persist removal until the cursor stack is committed back into inventory.
				const pickedItem = removeFromSlot(slotIndex, pickupCount, { skipSave: true });
				if (pickedItem) {
					try { window.fjFarm?.audio?.play?.('click'); } catch(_) {}
					
					const isObject = pickedItem.type === 'object';
					const selection = {
						key: pickedItem.item,
						item: pickedItem.item,
						count: pickedItem.count,
						itemType: pickedItem.type,
						originSlotIndex: slotIndex,
					
						type: isObject ? 'object' : 'inventory-item',
						isInventoryObject: isObject ? true : undefined,
						icon: isObject ? 
							`addons/farm/icons/objects/${pickedItem.item}.png` : 
							(pickedItem.item === 'fertilizer' ? 'addons/farm/icons/fertilizer.png' : `addons/farm/icons/food/${pickedItem.item}.png`)
					};
					interactModule.selectItem(selection, null);
					
					suppressPrune = false;
					setTimeout(() => {
						try {
							const hasSel = window.fjTweakerModules?.farminteract?.hasSelection?.();
							if (!hasSel) pruneEmptyTrailingRows();
						} catch(_) {}
					}, 0);
				}
			}
		}
	};

	
	const showInventoryTooltip = (slot, buttonEl) => {
		try {
			if (!slot) return;
			let tooltipData = {};
				
			
			if (slot.type === 'plant') {
				const seedsModule = window.fjTweakerModules?.farmseeds;
				let displayName = slot.item;
				let desc = '';
				let tags = [];
				try {
					const plantHarvest = seedsModule?.getPlantHarvest?.();
					if (plantHarvest && plantHarvest[slot.item]) {
						const meta = plantHarvest[slot.item];
						displayName = meta.name || slot.item;
						desc = meta.desc || '';
						tags = parseTags(meta.tag || meta.tags);
					}
				} catch(_) {}
				const price = window.fjFarm?.pricing?.getPriceForItem?.(slot.item, 'plant') || 0;
				tooltipData = {
					imageSrc: resolve(`addons/farm/icons/food/${slot.item}.png`),
					name: displayName,
					bodyTT: desc,
					cost: String(price),
					costIcon: 'addons/farm/icons/coin.png',
					tags,
				};
			} else if (slot.type === 'object') {
				const shopModule = window.fjTweakerModules?.farmshop;
				if (shopModule && shopModule.getObjectTips) {
					const objectTips = shopModule.getObjectTips();
					const objectInfo = objectTips[slot.item];
					if (objectInfo) {
						tooltipData = {
							imageSrc: resolve(`addons/farm/icons/objects/${slot.item}.png`),
							name: objectInfo.name,
							bodyTT: objectInfo.desc,
							cost: String(objectInfo.prc || 0),
							costIcon: 'addons/farm/icons/coin.png',
							tags: parseTags(objectInfo.tag),
						};
					}
				}
			} else if (slot.type === 'food') {
				const cook = window.fjTweakerModules?.farmcook;
				const ings = cook?.INGREDIENTS?.() || [];
				const recs = cook?.RECIPES?.() || [];
				const norm = String(slot.item||'').trim().toLowerCase().replace(/\s+/g,'_');
				const ingEntry = ings.find(e => String(e.name||'').trim().toLowerCase().replace(/\s+/g,'_') === norm);
				if (ingEntry) {
					const toks = cook?.flattenTokens ? cook.flattenTokens(ingEntry.ing) : (ingEntry.ing || []);
					const price = window.fjFarm?.pricing?.getPriceForItem?.(ingEntry.name, 'ingredient', { tokens: toks }) || 0;
					tooltipData = {
						imageSrc: resolve(`addons/farm/icons/food/${norm}.png`),
						name: ingEntry.name,
						bodyTT: ingEntry.desc || '',
						cost: String(price),
						costIcon: 'addons/farm/icons/coin.png',
						tags: parseTags(ingEntry.tag),
					};
				} else {
					const recEntry = recs.find(e => String(e.name||'').trim().toLowerCase().replace(/\s+/g,'_') === norm);
					if (recEntry) {
						const toks = cook?.flattenTokens ? cook.flattenTokens(recEntry.ing) : (recEntry.ing || []);
						const price = window.fjFarm?.pricing?.getPriceForItem?.(recEntry.name, 'recipe', { tokens: toks }) || 0;
						tooltipData = {
							imageSrc: resolve(`addons/farm/icons/food/${norm}.png`),
							name: recEntry.name,
							bodyTT: recEntry.desc || '',
							cost: String(price),
							costIcon: 'addons/farm/icons/coin.png',
							tags: parseTags(recEntry.tag),
						};
					}
				}
					if (Object.keys(tooltipData).length === 0 && slot.item === 'fertilizer') {
						tooltipData = {
							imageSrc: resolve('addons/farm/icons/fertilizer.png'),
							name: 'Fertilizer',
							bodyTT: 'Apply to crops to double their harvest!',
							cost: '32',
							costIcon: 'addons/farm/icons/coin.png',
							tags: [FERTILIZER_TAG],
						};
					} else if (Object.keys(tooltipData).length === 0 && slot.item === 'water') {
						tooltipData = {
							imageSrc: resolve('addons/farm/icons/food/water.png'),
							name: 'Water',
							bodyTT: "It's water.",
							cost: '2',
							costIcon: 'addons/farm/icons/coin.png',
							tags: ['Utility'],
						};
					} else if (Object.keys(tooltipData).length === 0 && slot.item === 'honey') {
						tooltipData = {
							imageSrc: resolve('addons/farm/icons/food/honey.png'),
							name: 'Honey',
							bodyTT: 'Pure, sweet honey harvested from your bee boxes.',
							cost: '14',
							costIcon: 'addons/farm/icons/coin.png',
							tags: ['Ingredient'],
						};
				}
			}
			
			if (Object.keys(tooltipData).length > 0) {
				window.fjfeFarmTT?.show?.(tooltipData);
			}
		} catch (_) {}
	};

	
	const hideInventoryTooltip = () => {
		try {
			window.fjfeFarmTT?.hide?.();
		} catch (_) {}
	};

	
	// First click enters selection mode, second performs the sale and pays out coins
	const handleSellToggle = (e) => {
		e.preventDefault();
		e.stopPropagation();
		
		
		const btn = e.target;
		btn.style.transform = 'scale(0.9)';
		btn.style.transition = 'transform 0.1s ease';
		setTimeout(() => {
			btn.style.transform = 'scale(1.05)';
			setTimeout(() => {
				btn.style.transform = 'scale(1)';
			}, 60);
		}, 100);
		
			if (!isSellMode) {
			
			isSellMode = true;
			applySellModeStyles(btn);
			refreshInventoryUI();
				updateLiveSellTotal();
			return;
		}
		
		
			const totalValue = computeSelectedSellValue(true);
			
			selectedForSale.forEach((idx) => { if (inventorySlots[idx]) inventorySlots[idx] = null; });
		
		if (totalValue > 0) {
			window.fjFarm?.coins?.add?.(totalValue);
			try { window.fjFarm?.audio?.play?.('sell'); } catch(_) {}
		}
		
		
		isSellMode = false;
		selectedForSale.clear();
		applySellModeStyles(btn);
		updateLiveSellTotal();
		
		pruneEmptyTrailingRows();
		refreshInventoryUI();
		saveInventoryData();
	};

	
	const toggleSlotForSale = (slotIndex) => {
		if (selectedForSale.has(slotIndex)) selectedForSale.delete(slotIndex);
		else selectedForSale.add(slotIndex);
			updateLiveSellTotal();
	};

	
			const applySellModeStyles = (sellBtn) => {
		if (!sellBtn) return;
		if (isSellMode) {
			sellBtn.style.background = '#fff';
			sellBtn.style.color = '#c33';
			sellBtn.style.border = '1px solid #c33';
					try { if (root) { const live = root.querySelector('[data-role="live-sell"]'); if (live) live.style.display='flex'; } } catch(_) {}
		} else {
			sellBtn.style.background = '#c33';
			sellBtn.style.color = '#fff';
			sellBtn.style.border = '1px solid #c33';
					try { if (root) { const live = root.querySelector('[data-role="live-sell"]'); if (live) live.style.display='none'; } } catch(_) {}
		}
	};

		
		// Sum the current selection using pricing helpers so the live total stays accurate
		const computeSelectedSellValue = (finalizeObjects75 = false) => {
			let total = 0;
			try {
				selectedForSale.forEach((idx) => {
					const slot = inventorySlots[idx];
					if (!slot || slot.count <= 0) return;
					if (slot.type === 'plant') {
						const unit = window.fjFarm?.pricing?.getPriceForItem?.(slot.item, 'plant') || 0;
						total += unit * slot.count;
					} else if (slot.type === 'object') {
						const shopModule = window.fjTweakerModules?.farmshop;
						if (shopModule && shopModule.getObjectTips) {
							const objectTips = shopModule.getObjectTips();
							const objectInfo = objectTips[slot.item];
							const base = objectInfo?.prc || 0;
							if (finalizeObjects75) {
								total += Math.ceil(base * 0.75) * slot.count;
							} else {
								total += Math.ceil(base * 0.75) * slot.count; 
							}
						}
					} else if (slot.type === 'food') {
						const cook = window.fjTweakerModules?.farmcook;
						const ings = cook?.INGREDIENTS?.() || [];
						const recs = cook?.RECIPES?.() || [];
						const norm = String(slot.item||'').trim().toLowerCase().replace(/\s+/g,'_');
						const ingEntry = ings.find(e => String(e.name||'').trim().toLowerCase().replace(/\s+/g,'_') === norm);
						const recEntry = recs.find(e => String(e.name||'').trim().toLowerCase().replace(/\s+/g,'_') === norm);
						if (ingEntry) {
							const toks = cook?.flattenTokens ? cook.flattenTokens(ingEntry.ing) : (ingEntry.ing || []);
							const unit = window.fjFarm?.pricing?.getPriceForItem?.(ingEntry.name, 'ingredient', { tokens: toks }) || 0;
							total += unit * slot.count;
						} else if (recEntry) {
							const toks = cook?.flattenTokens ? cook.flattenTokens(recEntry.ing) : (recEntry.ing || []);
							const unit = window.fjFarm?.pricing?.getPriceForItem?.(recEntry.name, 'recipe', { tokens: toks }) || 0;
							total += unit * slot.count;
						} else {
							const unit = window.fjFarm?.pricing?.getPriceForItem?.(slot.item, 'food')
								|| window.fjFarm?.pricing?.getPriceForItem?.(slot.item, 'plant')
								|| 0;
							total += unit * slot.count;
						}
					}
				});
			} catch(_) {}
			return total;
		};

		// Mirror the running coin value inside the Sell badge so players know the payout
		const updateLiveSellTotal = () => {
			try {
				if (!root) return;
				const live = root.querySelector('[data-role="live-sell-text"]');
				const cont = root.querySelector('[data-role="live-sell"]');
				if (!live || !cont) return;
				const total = computeSelectedSellValue(false);
				live.textContent = String(total);
				cont.style.display = isSellMode ? 'flex' : 'none';
			} catch(_) {}
		};

	// Slide the panel next to the calling menu and animate it in
	const open=(host)=>{
		if(isOpen||!host) return;
		root=document.createElement('div'); root.id='fj-farminv';
		Object.assign(root.style,{
			position:'absolute',left:'0',top:'0',height:'auto',background:'transparent',color:'#ddd',overflow:'visible',
			transform:'translateX(-12px)',opacity:'0',transition:'transform 160ms cubic-bezier(.2,.9,.2,1), opacity 140ms ease'
		});
		buildUI(); host.appendChild(root);
		requestAnimationFrame(()=>{ root.style.transform='translateX(0)'; root.style.opacity='1'; });
		isOpen=true;
	};

	const close=()=>{
		if(!isOpen||!root) return;
		try{
			root.style.transform='translateX(-12px)'; root.style.opacity='0';
			setTimeout(()=>{ root?.remove(); root=null; },180);
		} finally { isOpen=false; }
	};

	
	const resetInventory = () => {
		try {
			
			const minSize = COLS * INITIAL_ROWS;
			inventorySlots = Array(minSize).fill(null);
			
			
			saveInventoryData();
			
			
			if (isOpen) {
				buildUI();
			} else {
				
				
			}
			
			return true;
		} catch (_) {
			return false;
		}
	};

	// Reload saved state once farm data finishes booting
	const init=()=>{
		
		setTimeout(() => {
			loadInventoryData();
			if (isOpen) {
				refreshInventoryUI();
			}
		}, 100);

		
		window.addEventListener('fjFarmDataLoaded', () => {
			try {
				loadInventoryData();
				if (isOpen) refreshInventoryUI();
			} catch (_) {}
		});
	};
	
	window.fjTweakerModules=window.fjTweakerModules||{};
	window.fjTweakerModules[MODULE_KEY]={ 
		init, open, close, isOpen:()=>isOpen, getButtons:()=>buttonsMeta.slice(),
		addToInventory, addToSlot, removeFromSlot, refreshInventoryUI, resetInventory
	};
})();
