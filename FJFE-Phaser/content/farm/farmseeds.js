(() => {
	const MODULE_KEY = 'farmseeds';
	let root = null;
	let isOpen = false;
	let buttonsMeta = [];

	const PLANTS = [
		'Wheat','Potato','Tomato','Onion','Eggvine',
		'Rice','Almond','Pepper','Meatbulb','Sugarcane',
		'Strawberry','Watermelon','Pineapple','Cocoa','Pumpkin',
	];

	
	
	const SEED_TIPS = {
		wheat:      { name: 'Wheat',      desc: 'A basic crop, with one of the shortest growth times.', growtime: 1.5, prc: 12 },
		potato:     { name: 'Potato',     desc: 'A tough, hardy crop.', growtime: 2.0, prc: 15 },
		tomato:     { name: 'Tomato',     desc: 'Very juicy, quite good with salt.', growtime: 2.0, prc: 16 },
		onion:      { name: 'Onion',      desc: 'Adds flavor to pretty much any dish.', growtime: 1.5, prc: 14 },
		eggvine:    { name: 'Eggvine',    desc: 'The vine itself is more like an umbilical to the eggs, very small. This is...still a plant, right?', growtime: 2.0, prc: 30 },
		rice:       { name: 'Rice',       desc: 'Normally this would be grown in water, but no pests here.', growtime: 3.0, prc: 22 },
		almond:     { name: 'Almond',     desc: 'Normal almonds grow on trees. These...do not.', growtime: 4.0, prc: 55 },
		pepper:     { name: 'Pepper',     desc: 'Bell, chili, ghost, cayenne, whatever.', growtime: 3.0, prc: 28 },
		meatbulb:   { name: 'Meatbulb',   desc: "It's not really growing meat, but it's close enough. Not vegan, though.", growtime: 3.0, prc: 45 },
		sugarcane:  { name: 'Sugarcane',  desc: 'Hard to grow, but less hard to process.', growtime: 3.0, prc: 26 },
		strawberry: { name: 'Strawberry', desc: "This is the only type of berry you're getting. Make it count.", growtime: 4.0, prc: 35 },
		watermelon: { name: 'Watermelon', desc: 'This is not a berry. This is a fruit. I will die on this hill.', growtime: 5.0, prc: 50 },
		pineapple:  { name: 'Pineapple',  desc: 'Used to be a show of wealth. Now just Psychs people out.', growtime: 6.0, prc: 60 },
		cocoa:      { name: 'Cocoa',      desc: 'Can be turned into chocolate. Now with less slavery! Also no trees.', growtime: 5.5, prc: 62 },
		pumpkin:    { name: 'Pumpkin',    desc: 'The pumpkin spice must flow.', growtime: 5.0, prc: 48 },
	};

	const toKey = (name) => String(name).trim().toLowerCase().replace(/\s+/g, '_');
	const iconFor = (name) => `icons/farm/plants/${toKey(name)}_seed.png`;
	const resolveAssetUrl = (p) => {
		try { return (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p; } catch (_) { return p; }
	};

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

			
			const coinRow = document.createElement('div');
			Object.assign(coinRow.style, { display:'flex', alignItems:'center', gap:'2px', marginBottom:'8px' });
			const coinImg = document.createElement('img');
			coinImg.alt=''; coinImg.draggable=false; coinImg.decoding='async'; coinImg.loading='lazy';
			coinImg.src = resolveAssetUrl('icons/farm/coin.png');
			coinImg.onerror = function(){ this.src = resolveAssetUrl('icons/error.png'); };
			Object.assign(coinImg.style, { width:'16px', height:'16px' });
			const coinText = document.createElement('span');
			Object.assign(coinText.style, { color:'#f3d266', fontWeight:'700' });
			const refreshCoins = () => { try { const c = window.fjFarm?.coins?.get?.() || 0; coinText.textContent = String(c); } catch(_){} };
			refreshCoins();
			
			const coinListener = () => refreshCoins();
			window.addEventListener('fjFarmCoinsChanged', coinListener);
			
			coinRow._coinListener = coinListener;
			coinRow.append(coinImg, coinText);

			const grid = document.createElement('div');
			const COLS = 3, BTN = 60, GAP = 10, PAD = 10; 
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
			const key = toKey(name);
			btn.setAttribute('data-seed-key', key);
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
					
					const meta = SEED_TIPS[key];
					if (!meta) return;
					window.fjfeFarmTT?.show?.({
						imageSrc: resolveAssetUrl(iconFor(name)),
						name: meta.name,
						bodyTop: `Growth time: ${meta.growtime} hrs.`,
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
			img.src = resolveAssetUrl(iconFor(name));
			img.onerror = function(){ this.src = resolveAssetUrl('icons/error.png'); };
			Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover' });

			btn.appendChild(img);
			return { btn, key };
		};

		buttonsMeta = [];
		PLANTS.forEach((name, idx) => {
			const { btn, key } = makeBtn(name, idx);
			const row = Math.floor(idx / 3) + 1;
			const col = (idx % 3) + 1;
			grid.appendChild(btn);
			const t = SEED_TIPS[key] || { name, desc: 'TBD', growtime: 1.0, prc: 0 };
			
			
			try {
				const interactModule = window.fjTweakerModules?.farminteract;
				if (interactModule && interactModule.wireButton) {
					const wiredBtn = interactModule.wireButton(btn, { key, icon: iconFor(name), type: 'seed' });
					buttonsMeta.push({ key, name, icon: iconFor(name), el: wiredBtn, row, col, desc: t.desc, growtime: t.growtime, prc: t.prc });
				} else {
					buttonsMeta.push({ key, name, icon: iconFor(name), el: btn, row, col, desc: t.desc, growtime: t.growtime, prc: t.prc });
				}
			} catch (_) {
				buttonsMeta.push({ key, name, icon: iconFor(name), el: btn, row, col, desc: t.desc, growtime: t.growtime, prc: t.prc });
			}
		});

		box.appendChild(coinRow);
		box.appendChild(grid);
		root.appendChild(box);
	};

	const open = (host) => {
		if (isOpen || !host) return;
		root = document.createElement('div');
		root.id = 'fj-farmseeds';
		Object.assign(root.style, {
			position: 'absolute', left: '0', top: '0', width: '320px', height: 'auto',
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

	
	let growthCheckInterval = null;
	const GROWTH_CHECK_INTERVAL = 5000; 

	
	const startGrowthMonitoring = () => {
		if (growthCheckInterval) return; 
		
		growthCheckInterval = setInterval(() => {
			checkAndUpdatePlantGrowth();
		}, GROWTH_CHECK_INTERVAL);
		
		
		checkAndUpdatePlantGrowth();
	};

	
	const stopGrowthMonitoring = () => {
		if (growthCheckInterval) {
			clearInterval(growthCheckInterval);
			growthCheckInterval = null;
		}
	};

	
	const checkAndUpdatePlantGrowth = () => {
		try {
			const tileStrip = document.getElementById('fj-farm-tiles');
			if (!tileStrip) return;
            
			const tiles = Array.from(tileStrip.children);
			const currentTime = Date.now();
            
			tiles.forEach((tile, tileIndex) => {
				const plantData = window.fjFarm?.state?.getPlant?.(tileIndex);
				if (!plantData || !plantData.plantedAt || !plantData.seedName) return;
                
				const seedInfo = SEED_TIPS[plantData.seedName];
				if (!seedInfo) return;
                
				const growthTimeMs = seedInfo.growtime * 60 * 60 * 1000;
                
				
				let progressMs = typeof plantData.progressMs === 'number' ? plantData.progressMs : null;
				let lastGrowCheck = plantData.lastGrowCheck || null;
                
				const toolsModule = window.fjTweakerModules?.farmtools;
				const speedModifier = (toolsModule && toolsModule.getGrowthSpeedModifier)
				  ? toolsModule.getGrowthSpeedModifier(tileIndex)
				  : 1.0;
                
				if (progressMs === null) {
					
					const elapsedSincePlant = currentTime - plantData.plantedAt;
					progressMs = Math.min(growthTimeMs, Math.max(0, Math.floor(elapsedSincePlant * speedModifier)));
					lastGrowCheck = currentTime;
				} else {
					const last = lastGrowCheck || currentTime;
					const delta = Math.max(0, currentTime - last);
					progressMs = Math.min(growthTimeMs, progressMs + Math.floor(delta * speedModifier));
					lastGrowCheck = currentTime;
				}
                
				const isFullyGrown = progressMs >= growthTimeMs;
                
				
				const newData = {
					...plantData,
					progressMs,
					lastGrowCheck,
					isGrown: isFullyGrown
				};
				window.fjFarm?.state?.setPlant?.(tileIndex, newData);
                
				const plantOverlay = tile.querySelector('.plant-overlay');
				if (plantOverlay) {
					const newSrc = isFullyGrown
						? resolveAssetUrl(`icons/farm/plants/${plantData.seedName}_grown.png`)
						: resolveAssetUrl(`icons/farm/plants/${plantData.seedName}_growing.png`);
					if (plantOverlay.src !== newSrc) {
						plantOverlay.src = newSrc;
						plantOverlay.onerror = function() {
							this.src = resolveAssetUrl('icons/error.png');
						};
					}
				}
			});
		} catch (error) {
			console.error('Growth check error:', error);
		}
	};

	
	const getPlantGrowthPercentage = (tileIndex) => {
		try {
			const plantData = window.fjFarm?.state?.getPlant?.(tileIndex);
			if (!plantData || !plantData.plantedAt || !plantData.seedName) return 0;
            
			const seedInfo = SEED_TIPS[plantData.seedName];
			if (!seedInfo) return 0;
            
			const growthTimeMs = seedInfo.growtime * 60 * 60 * 1000;
			
			if (typeof plantData.progressMs === 'number') {
				return Math.min(100, Math.max(0, Math.floor((plantData.progressMs / growthTimeMs) * 100)));
			}
            
			
			let elapsedTime = Date.now() - plantData.plantedAt;
			const toolsModule = window.fjTweakerModules?.farmtools;
			const speedModifier = (toolsModule && toolsModule.getGrowthSpeedModifier)
			  ? toolsModule.getGrowthSpeedModifier(tileIndex)
			  : 1.0;
			const approx = Math.min(100, Math.floor(((elapsedTime * speedModifier) / growthTimeMs) * 100));
			return Math.max(0, approx);
		} catch (_) {
			return 0;
		}
	};

	
	const accelerateAllPlants = (hours = 1) => {
		try {
			const tileStrip = document.getElementById('fj-farm-tiles');
			if (!tileStrip) return;
			
			const tiles = Array.from(tileStrip.children);
			const accelerationMs = hours * 60 * 60 * 1000; 
			let plantsAccelerated = 0;
			
			tiles.forEach((tile, tileIndex) => {
				const plantData = window.fjFarm?.state?.getPlant?.(tileIndex);
				if (plantData && plantData.plantedAt) {
					
					if (typeof plantData.progressMs === 'number') {
						const seedInfo = SEED_TIPS[plantData.seedName];
						const growthTimeMs = seedInfo ? (seedInfo.growtime * 60 * 60 * 1000) : Number.MAX_SAFE_INTEGER;
						const newProgress = Math.min(growthTimeMs, (plantData.progressMs || 0) + accelerationMs);
						window.fjFarm?.state?.setPlant?.(tileIndex, {
							...plantData,
							progressMs: newProgress,
							
						});
					} else {
						
						const newPlantedAt = plantData.plantedAt - accelerationMs;
						window.fjFarm?.state?.setPlant?.(tileIndex, {
							...plantData,
							plantedAt: newPlantedAt
						});
					}
					plantsAccelerated++;
				}
			});
			
			
			checkAndUpdatePlantGrowth();
			
			
			const toolsModule = window.fjTweakerModules?.farmtools;
			if (toolsModule && toolsModule.accelerateTimers) {
				toolsModule.accelerateTimers(hours);
			}
			
			console.log(`Accelerated ${plantsAccelerated} plants by ${hours} hour(s)`);
		} catch (error) {
			console.error('Plant acceleration error:', error);
		}
	};

	const init = () => {
		
		startGrowthMonitoring();
		
		
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				
				stopGrowthMonitoring();
			} else {
				
				startGrowthMonitoring();
			}
		});
	};

	
	const PLANT_HARVEST = {
		wheat:      { name: 'Wheat',      desc: 'A basic crop, with one of the shortest growth times.', value: 18 },
		potato:     { name: 'Potato',     desc: 'A tough, hardy crop.', value: 23 },
		tomato:     { name: 'Tomato',     desc: 'Very juicy, quite good with salt.', value: 24 },
		onion:      { name: 'Onion',      desc: 'Adds flavor to pretty much any dish.', value: 21 },
		eggvine:    { name: 'Egg',        desc: 'The vine itself is more like an umbilical to the eggs, very small. This is...still a plant, right?', value: 45 }, 
		rice:       { name: 'Rice',       desc: 'Normally this would be grown in water, but no pests here.', value: 33 },
		almond:     { name: 'Almond',     desc: 'Normal almonds grow on trees. These...do not.', value: 83 },
		pepper:     { name: 'Pepper',     desc: 'Bell, chili, ghost, cayenne, whatever.', value: 42 },
		meatbulb:   { name: 'Meat',       desc: "It's not really growing meat, but it's close enough. Not vegan, though.", value: 68 }, 
		sugarcane:  { name: 'Sugarcane',  desc: 'Hard to grow, but less hard to process.', value: 39 },
		strawberry: { name: 'Strawberry', desc: "This is the only type of berry you're getting. Make it count.", value: 53 },
		watermelon: { name: 'Watermelon', desc: 'This is not a berry. This is a fruit. I will die on this hill.', value: 75 },
		pineapple:  { name: 'Pineapple',  desc: 'Used to be a show of wealth. Now just Psychs people out.', value: 90 },
		cocoa:      { name: 'Cocoa',      desc: 'Can be turned into chocolate. Now with less slavery! Also no trees.', value: 93 },
		pumpkin:    { name: 'Pumpkin',    desc: 'The pumpkin spice must flow.', value: 72 },
		
		egg:        { name: 'Egg',        desc: 'Fresh from the eggvine. Organic and weird.', value: 45 },
		meat:       { name: 'Meat',       desc: 'Grown meat. Still technically vegetarian?', value: 68 },
	};

	
	const getSeedTips = () => SEED_TIPS;

	
	const getPlantHarvest = () => PLANT_HARVEST;

	
	const getPlantGrowthInfo = (tileIndex) => {
		const plantData = window.fjFarm?.state?.getPlant?.(tileIndex);
		if (!plantData) return null;
		
		const seedInfo = SEED_TIPS[plantData.seedName];
		if (!seedInfo) return null;
		
	const growthPercentage = getPlantGrowthPercentage(tileIndex);
	const isGrown = growthPercentage >= 100;
		
		
		let timerInfo = '';
		try {
			const toolsModule = window.fjTweakerModules?.farmtools;
			if (toolsModule && toolsModule.getTimerDebugInfo) {
				timerInfo = toolsModule.getTimerDebugInfo(tileIndex);
			}
		} catch (_) {}
		
		return {
			seedName: plantData.seedName,
			seedInfo: seedInfo,
			growthPercentage: growthPercentage,
			isGrown: isGrown,
			plantedAt: plantData.plantedAt,
			cost: plantData.cost || seedInfo.prc,
			timerInfo: timerInfo
		};
	};

	window.fjTweakerModules = window.fjTweakerModules || {};
	window.fjTweakerModules[MODULE_KEY] = {
		init,
		open,
		close,
		isOpen: () => isOpen,
		getButtons: () => buttonsMeta.slice(),
		getSeedTips,
		getPlantHarvest,
		getPlantGrowthInfo,
		accelerateAllPlants,
		checkAndUpdatePlantGrowth
	};
})();
