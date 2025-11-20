(() => {
	const MODULE_KEY = 'farmseeds';
	let root = null;
	let isOpen = false;
	let buttonsMeta = [];

	const PLANTS = [
		'Wheat','Potato','Tomato','Cocoa','Onion','Eggvine',
		'Rice','Olive','Pepper','Meatbulb','Sugarcane','Avocado',
		'Multiberry Bush','Watermelon','Pineapple','Nutleaf Tree','Pumpkin',
		'Beanpod','Milkbud','Fruit'
	];

	
	
	const SEED_TIPS = {
		wheat:   		 { name: 'Wheat',    	    desc: 'A basic crop, with one of the shortest growth times.', growtime: 1.5, prc: 12, tag: 'Crop' },
		potato:  		 { name: 'Potato',   	    desc: 'A tough, hardy crop.', growtime: 2.5, prc: 15, tag: 'Crop' },
		tomato:   		 { name: 'Tomato',   	    desc: 'Stick not included.', growtime: 2.0, prc: 16, tag: 'Crop' },
		onion:     		 { name: 'Onion',    	    desc: 'Technically a root!', growtime: 2.0, prc: 14, tag: 'Crop' },
		eggvine:   		 { name: 'Eggvine',   	    desc: 'The vine itself is more like an umbilical to the eggs, very small. This is...still a plant, right?', growtime: 2.0, prc: 30, tag: 'Crop' },
		rice:     		 { name: 'Rice',     	    desc: 'Normally this would be grown in water, but no pests here.', growtime: 1.0, prc: 22, tag: 'Crop' },
		milkbud:   		 { name: 'Milkbud',   	    desc: 'Plant milk. But...actual milk? Who knows.', growtime: 2.5, prc: 35, tag: 'Crop' },
		pepper:    		 { name: 'Pepper',          desc: 'The great and terrible omnipepper plant. Or something.', growtime: 3.0, prc: 28, tag: 'Crop' },
		meatbulb: 	     { name: 'Meatbulb',   	    desc: "It's not really growing meat, but it's close enough. Not vegan, though.", growtime: 4.0, prc: 45, tag: 'Crop' },
		sugarcane:       { name: 'Sugarcane', 	    desc: 'Hard to grow, but less hard to process.', growtime: 2.5, prc: 26, tag: 'Crop' },
		multiberry_bush: { name: 'Multiberry Bush', desc: "Grows all kinds of berries! Blue, rasp, straw, black, cran...", growtime: 4.5, prc: 35, tag: 'Crop' },
		watermelon:      { name: 'Watermelon',	    desc: 'You get the round ones.', growtime: 6.0, prc: 50, tag: 'Crop' },
		pineapple:       { name: 'Pineapple', 	    desc: 'Pineapple plants look stupid. It needed to be said.', growtime: 8.0, prc: 60, tag: 'Crop' },
		pumpkin:         { name: 'Pumpkin',    	    desc: 'Super versatile for exactly one quarter of the year.', growtime: 5.5, prc: 48, tag: 'Crop' },
		beanpod:         { name: 'Beanpod', 	    desc: 'Beans? Beans!', growtime: 5.5, prc: 48, tag: 'Crop' },
		cocoa:     		 { name: 'Cocoa',      	    desc: 'Can be turned into chocolate. Now with less slavery!', growtime: 14.5, prc: 432, tag: 'Tree' },
		olive:    	     { name: 'Olives',      	desc: "You're not allergic to these things, right?", growtime: 18, prc: 512, tag: 'Tree' },
		avocado:    	 { name: 'Avocado',    		desc: 'Unlike real ones, yours will never rot!', growtime: 24, prc: 719, tag: 'Tree' },
		nutleaf_tree:    { name: 'Nutleaf Tree',    desc: 'Grows every kind of nut. Except one. You know which one.', growtime: 13, prc: 311, tag: 'Tree' },
		fruit:      	 { name: 'Fruit',      		desc: 'What kind? All kinds!', growtime: 15.5, prc: 481, tag: 'Tree' }
	};

	const HARVEST_ITEM_MAP = {
		eggvine: 'egg',
		meatbulb: 'meat',
		milkbud: 'milk',
		cocoa: 'cocoa',
		avocado: 'avocado',
		fruit: 'fruit',
		nutleaf_tree: 'nuts',
		olive: 'olives',
		beanpod: 'beans',
		multiberry_bush: 'berries'
	};

	const HARVEST_ITEM_MAP_REVERSE = (() => {
		const rev = {};
		Object.entries(HARVEST_ITEM_MAP).forEach(([seedKey, harvestKey]) => { rev[harvestKey] = seedKey; });
		return rev;
	})();

	const TREE_TAG = 'tree';
	const TREE_FOOTPRINT = Object.freeze({ width: 3, height: 3 });

	const normalizeTags = (value) => parseTags(value).map(tag => tag.toLowerCase());

	const isTreeSeed = (seedKeyOrName) => {
		const key = toKey(seedKeyOrName);
		const seedInfo = SEED_TIPS[key];
		if (!seedInfo) return false;
		return normalizeTags(seedInfo.tag).includes(TREE_TAG);
	};

	const getSeedFootprint = (seedKeyOrName) => {
		return isTreeSeed(seedKeyOrName)
			? { ...TREE_FOOTPRINT }
			: { width: 1, height: 1 };
	};

	const getAnchorIndexForPlant = (tileIndex, plantData) => {
		if (!plantData) return tileIndex;
		if (plantData.isTree) {
			if (plantData.isAnchor) return tileIndex;
			if (typeof plantData.anchorIndex === 'number') return plantData.anchorIndex;
		}
		return tileIndex;
	};

	const getAnchorPlantEntry = (tileIndex) => {
		const raw = window.fjFarm?.state?.getPlant?.(tileIndex);
		if (!raw) return null;
		const anchorIndex = getAnchorIndexForPlant(tileIndex, raw);
		const anchorData = anchorIndex === tileIndex ? raw : window.fjFarm?.state?.getPlant?.(anchorIndex);
		if (!anchorData) return null;
		return { index: anchorIndex, data: anchorData };
	};

	const toKey = (name) => String(name).trim().toLowerCase().replace(/\s+/g, '_');
	const iconFor = (name) => `icons/farm/plants/${toKey(name)}_seed.png`;
	const resolveAssetUrl = (p) => {
		try { return (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p; } catch (_) { return p; }
	};
	const parseTags = (value) => {
		if (!value) return [];
		if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
		return String(value || '')
			.split(',')
			.map(v => v.trim())
			.filter(Boolean);
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
			const COLS = 4, BTN = 60, GAP = 10, PAD = 10; 
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
						tags: parseTags(meta.tag),
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
			const row = Math.floor(idx / COLS) + 1;
			const col = (idx % COLS) + 1;
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
				const entry = getAnchorPlantEntry(tileIndex);
				if (!entry) return;
				const { index: anchorIndex, data: plantData } = entry;
				if (anchorIndex !== tileIndex) return; 
				if (!plantData.plantedAt || !plantData.seedName) return;
				
				const seedInfo = SEED_TIPS[plantData.seedName];
				if (!seedInfo) return;
				
				const growthTimeMs = seedInfo.growtime * 60 * 60 * 1000;
				let progressMs = typeof plantData.progressMs === 'number' ? plantData.progressMs : null;
				let lastGrowCheck = plantData.lastGrowCheck || null;
				
				const toolsModule = window.fjTweakerModules?.farmtools;
				const speedModifier = (toolsModule && toolsModule.getGrowthSpeedModifier)
				  ? toolsModule.getGrowthSpeedModifier(anchorIndex)
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
				window.fjFarm?.state?.setPlant?.(anchorIndex, newData);
				
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

			try { window.fjTweakerModules?.farmtile?.refreshTooltipForHoveredTile?.(); } catch(_) {}
		} catch (_) {}
	};

	
	const getPlantGrowthPercentage = (tileIndex) => {
		try {
			const entry = getAnchorPlantEntry(tileIndex);
			if (!entry) return 0;
			const { index: anchorIndex, data: plantData } = entry;
			if (!plantData.plantedAt || !plantData.seedName) return 0;
			
			const seedInfo = SEED_TIPS[plantData.seedName];
			if (!seedInfo) return 0;
			
			const growthTimeMs = seedInfo.growtime * 60 * 60 * 1000;
			const toolsModule = window.fjTweakerModules?.farmtools;
			const speedModifier = (toolsModule && toolsModule.getGrowthSpeedModifier)
			  ? toolsModule.getGrowthSpeedModifier(anchorIndex)
			  : 1.0;
			
			if (typeof plantData.progressMs === 'number') {
				const last = plantData.lastGrowCheck || plantData.plantedAt || Date.now();
				const delta = Math.max(0, Date.now() - last);
				const extrapolated = Math.min(growthTimeMs, (plantData.progressMs || 0) + Math.floor(delta * speedModifier));
				return Math.min(100, Math.max(0, Math.floor((extrapolated / growthTimeMs) * 100)));
			}
			
			const elapsedTime = Date.now() - plantData.plantedAt;
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
			
		} catch (_) {}
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
		wheat:      { name: 'Wheat',      desc: 'Read to be made into flour!', sourceSeed: 'wheat' },
		potato:     { name: 'Potato',     desc: 'Watching you.', sourceSeed: 'potato' },
		tomato:     { name: 'Tomato',     desc: 'Very juicy, quite good with salt.', sourceSeed: 'tomato' },
		onion:      { name: 'Onion',      desc: 'Adds flavor to pretty much any dish.', sourceSeed: 'onion' },
		rice:       { name: 'Rice',       desc: 'One of the best side dishes out there!', sourceSeed: 'rice' },
		pepper:     { name: 'Pepper',     desc: 'Bell, chili, ghost, cayenne, whatever.', sourceSeed: 'pepper' },
		sugarcane:  { name: 'Sugarcane',  desc: 'Hard to grow, but less hard to process.', sourceSeed: 'sugarcane' },
		watermelon: { name: 'Watermelon', desc: 'This is not a berry. This is a fruit. I will die on this hill.', sourceSeed: 'watermelon' },
		pineapple:  { name: 'Pineapple',  desc: 'Used to be a show of wealth. Now just Psychs people out.', sourceSeed: 'pineapple' },
		pumpkin:    { name: 'Pumpkin',    desc: 'The pumpkin spice must flow.', sourceSeed: 'pumpkin' },
		avocado:    { name: 'Avocado',    desc: 'Comes with a toy! Always a wooden ball, though.', sourceSeed: 'avocado_tree' },
		fruit:      { name: 'Fruit',      desc: 'Perfect painting material.', sourceSeed: 'fruit_tree' },
		nuts:       { name: 'Nuts',       desc: 'What kind of nuts? All of them, obviously.', sourceSeed: 'nutleaf_tree' },
		olives:     { name: 'Olives',     desc: 'You either love these or you hate them. Zero in-between.', sourceSeed: 'olive_tree' },
		beans:      { name: 'Beans',      desc: 'Buncha beans.', sourceSeed: 'beanpod' },
		cocoa:      { name: 'Cocoa',      desc: 'Real chocolate? Well, not yet, but soon.', sourceSeed: 'cocoa_tree' },
		egg:        { name: 'Egg',        desc: 'Technically an egg.', sourceSeed: 'eggvine' },
		meat:       { name: 'Meat',       desc: "It's not really growing meat, but it's close enough. Not vegan, though.", sourceSeed: 'meatbulb' },
		milk:       { name: 'Milk',       desc: "Virtually indistinguishable from real milk! Of course, that's what they all say.", sourceSeed: 'milkbud' },
		berries:    { name: 'Berries',    desc: "Berries. Lots of them.", sourceSeed: 'multiberry_bush' }
	};

	const resolveHarvestItem = (seedName) => {
		const key = toKey(seedName);
		return HARVEST_ITEM_MAP[key] || key;
	};

	const resolveSeedForHarvest = (itemName) => {
		const key = toKey(itemName);
		if (SEED_TIPS[key]) return key;
		return HARVEST_ITEM_MAP_REVERSE[key] || null;
	};

	const resolvePlantAnchor = (tileIndex) => {
		const entry = getAnchorPlantEntry(tileIndex);
		return entry ? { ...entry } : null;
	};

	
	const getSeedTips = () => SEED_TIPS;

	
	const getPlantHarvest = () => PLANT_HARVEST;

	
	const getPlantGrowthInfo = (tileIndex) => {
		const entry = getAnchorPlantEntry(tileIndex);
		if (!entry) return null;
		const { index: anchorIndex, data: plantData } = entry;
		const seedInfo = SEED_TIPS[plantData.seedName];
		if (!seedInfo) return null;
		
		const growthPercentage = getPlantGrowthPercentage(anchorIndex);
		const isGrown = growthPercentage >= 100;
		
		let timerInfo = '';
		try {
			const toolsModule = window.fjTweakerModules?.farmtools;
			if (toolsModule && toolsModule.getTimerDebugInfo && !plantData.isTree) {
				timerInfo = toolsModule.getTimerDebugInfo(anchorIndex);
			}
		} catch (_) {}
		
		return {
			seedName: plantData.seedName,
			seedInfo,
			growthPercentage,
			isGrown,
			plantedAt: plantData.plantedAt,
			cost: plantData.cost || seedInfo.prc,
			timerInfo,
			isTree: !!plantData.isTree,
			anchorIndex,
			yieldCount: (plantData.isTree ? 9 : 1) * (plantData.isFertilized ? 2 : 1),
			isFertilized: !!plantData.isFertilized,
			footprint: plantData.isTree ? (plantData.size ? { ...plantData.size } : getSeedFootprint(plantData.seedName)) : { width: 1, height: 1 }
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
		isTreeSeed,
		getSeedFootprint,
		resolveHarvestItem,
		resolveSeedForHarvest,
		resolvePlantAnchor,
		getPlantGrowthInfo,
		accelerateAllPlants,
		checkAndUpdatePlantGrowth
	};
})();
