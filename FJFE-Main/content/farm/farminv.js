(() => {
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
		console.log(`Expanded inventory to ${inventorySlots.length} slots (${getCurrentRows()} rows)`);
		return true;
	};
	
	
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

	const removeFromSlot = (slotIndex, count = 1) => {
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
		saveInventoryData();
		return removedItem;
	};

	
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
		} catch (e) {
			console.error('Failed to save inventory:', e);
		}
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
		} catch (e) {
			console.error('Failed to load inventory:', e);
		}
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
		Object.assign(coinRow.style,{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'2px', marginBottom:'8px' });
		
		
		const coinPart=document.createElement('div');
		Object.assign(coinPart.style,{ display:'flex', alignItems:'center', gap:'2px' });
		const coinImg=document.createElement('img');
		coinImg.alt=''; coinImg.draggable=false; coinImg.decoding='async'; coinImg.loading='lazy';
		coinImg.src = resolve('icons/farm/coin.png');
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
		
		coinRow.append(coinPart, sellBtn);

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
					imagePath = `icons/farm/food/${slot.item}.png`;
				} else if (slot.type === 'object') {
					imagePath = `icons/farm/objects/${slot.item}.png`;
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
				
				
				btn.addEventListener('mouseenter', () => showInventoryTooltip(slot, btn));
				btn.addEventListener('mouseleave', hideInventoryTooltip);
			} else {
				
				btn.removeEventListener('mouseenter', btn._tooltipHandler);
				btn.removeEventListener('mouseleave', hideInventoryTooltip);
			}

			
			if (isSellMode) {
				btn.style.filter = 'brightness(0.75)';
				if (selectedForSale.has(index)) {
					btn.style.boxShadow = 'inset 0 0 0 2px #c33, 0 0 6px #c33';
				} else {
					btn.style.boxShadow = 'inset 0 0 0 1px #0008';
				}
			} else {
				btn.style.filter = '';
				btn.style.boxShadow = 'inset 0 0 0 1px #0008';
			}
		});
	};

	
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
				const pickedItem = removeFromSlot(slotIndex, pickupCount);
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
							`icons/farm/objects/${pickedItem.item}.png` : 
							`icons/farm/food/${pickedItem.item}.png`
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
			
			const interactModule = window.fjTweakerModules?.farminteract;
			if (interactModule?.hasSelection?.()) return;
			
			let tooltipData = {};
			
			if (slot.type === 'plant') {
				const seedsModule = window.fjTweakerModules?.farmseeds;
				let displayName = slot.item;
				let desc = '';
				try {
					const plantHarvest = seedsModule?.getPlantHarvest?.();
					if (plantHarvest && plantHarvest[slot.item]) {
						displayName = plantHarvest[slot.item].name || slot.item;
						desc = plantHarvest[slot.item].desc || '';
					}
				} catch(_) {}
				const price = window.fjFarm?.pricing?.getPriceForItem?.(slot.item, 'plant') || 0;
				tooltipData = {
					imageSrc: resolve(`icons/farm/food/${slot.item}.png`),
					name: displayName,
					bodyTop: `Quantity: ${slot.count}`,
					bodyTT: desc,
					cost: String(price),
					costIcon: 'icons/farm/coin.png',
				};
			} else if (slot.type === 'object') {
				const shopModule = window.fjTweakerModules?.farmshop;
				if (shopModule && shopModule.getObjectTips) {
					const objectTips = shopModule.getObjectTips();
					const objectInfo = objectTips[slot.item];
					if (objectInfo) {
						tooltipData = {
							imageSrc: resolve(`icons/farm/objects/${slot.item}.png`),
							name: objectInfo.name,
							bodyTop: `Quantity: ${slot.count}`,
							bodyTT: objectInfo.desc,
							cost: String(objectInfo.prc || 0),
							costIcon: 'icons/farm/coin.png',
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
						imageSrc: resolve(`icons/farm/food/${norm}.png`),
						name: ingEntry.name,
						bodyTop: `Quantity: ${slot.count}`,
						bodyTT: ingEntry.desc || '',
						cost: String(price),
						costIcon: 'icons/farm/coin.png',
					};
				} else {
					const recEntry = recs.find(e => String(e.name||'').trim().toLowerCase().replace(/\s+/g,'_') === norm);
					if (recEntry) {
						const toks = cook?.flattenTokens ? cook.flattenTokens(recEntry.ing) : (recEntry.ing || []);
						const price = window.fjFarm?.pricing?.getPriceForItem?.(recEntry.name, 'recipe', { tokens: toks }) || 0;
						tooltipData = {
							imageSrc: resolve(`icons/farm/food/${norm}.png`),
							name: recEntry.name,
							bodyTop: `Quantity: ${slot.count}`,
							bodyTT: recEntry.desc || '',
							cost: String(price),
							costIcon: 'icons/farm/coin.png',
						};
					}
				}
			}
			
			if (Object.keys(tooltipData).length > 0) {
				window.fjfeFarmTT?.show?.(tooltipData);
			}
		} catch (error) {
			console.error('Inventory tooltip error:', error);
		}
	};

	
	const hideInventoryTooltip = () => {
		try {
			const interactModule = window.fjTweakerModules?.farminteract;
			if (!interactModule?.hasSelection?.()) {
				window.fjfeFarmTT?.hide?.();
			}
		} catch (_) {}
	};

	
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
			return;
		}
		
		
		let totalValue = 0;
		selectedForSale.forEach((idx) => {
			const slot = inventorySlots[idx];
			if (slot && slot.count > 0) {
				let itemValue = 0;
				if (slot.type === 'plant') {
					const unit = window.fjFarm?.pricing?.getPriceForItem?.(slot.item, 'plant') || 0;
					itemValue = unit * slot.count;
				} else if (slot.type === 'object') {
					const shopModule = window.fjTweakerModules?.farmshop;
					if (shopModule && shopModule.getObjectTips) {
						const objectTips = shopModule.getObjectTips();
						const objectInfo = objectTips[slot.item];
						itemValue = (objectInfo?.prc || 0) * slot.count;
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
						itemValue = unit * slot.count;
					} else if (recEntry) {
						const toks = cook?.flattenTokens ? cook.flattenTokens(recEntry.ing) : (recEntry.ing || []);
						const unit = window.fjFarm?.pricing?.getPriceForItem?.(recEntry.name, 'recipe', { tokens: toks }) || 0;
						itemValue = unit * slot.count;
					} else {
						
						const unit = window.fjFarm?.pricing?.getPriceForItem?.(slot.item, 'plant') || 0;
						itemValue = unit * slot.count;
					}
				}
				totalValue += itemValue;
				inventorySlots[idx] = null; 
			}
		});
		
		if (totalValue > 0) {
			window.fjFarm?.coins?.add?.(totalValue);
			console.log(`Sold ${selectedForSale.size} selected slots for ${totalValue} coins`);
			try { window.fjFarm?.audio?.play?.('sell'); } catch(_) {}
		}
		
		
		isSellMode = false;
		selectedForSale.clear();
		applySellModeStyles(btn);
		
		pruneEmptyTrailingRows();
		refreshInventoryUI();
		saveInventoryData();
	};

	
	const toggleSlotForSale = (slotIndex) => {
		if (selectedForSale.has(slotIndex)) selectedForSale.delete(slotIndex);
		else selectedForSale.add(slotIndex);
	};

	
	const applySellModeStyles = (sellBtn) => {
		if (!sellBtn) return;
		if (isSellMode) {
			sellBtn.style.background = '#fff';
			sellBtn.style.color = '#c33';
			sellBtn.style.border = '1px solid #c33';
		} else {
			sellBtn.style.background = '#c33';
			sellBtn.style.color = '#fff';
			sellBtn.style.border = '1px solid #c33';
		}
	};

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
			
			console.log('Inventory reset: cleared slots and persisted state');
			return true;
		} catch (error) {
			console.error('Error resetting inventory:', error);
			return false;
		}
	};

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
