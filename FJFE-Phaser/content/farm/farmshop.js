(() => {
	// Object shop for decorative + functional placements (sprinklers, bins, etc.)
	const MODULE_KEY='farmshop';
	let root=null,isOpen=false;
	let buttonsMeta=[];

	const ITEMS=[
		'fountain.png','sprinkler.png','compost_bin.png','rain_barrel.png','chair.png',
		'tool_shed.png','scarecrow.png','beebox.png','well.png','crate.png',
		'flowers.png','lantern.png','tree_stump.png','rock_pile.png','log.png',
		'potted_plant.png','bird_bath.png','small_pond.png','herb_rack.png','table.png',
		'bench.png','lamp_post.png','arch.png','gazebo.png','tree.png',
	];

	
	
	// Tooltip + pricing metadata for the grid; drives farminteract + tooltips
	const SHOP_TIPS = {
		fountain:     { name: 'Fountain',     desc: 'A large fountain, for large decoration.', prc: 10000, tag: 'Object' },
		sprinkler:    { name: 'Sprinkler',    desc: 'Keeps crops watered in a 5x5 area.', prc: 500, tag: 'Object,Functional' },
		compost_bin:  { name: 'Compost Bin',  desc: 'Recycles crops to produce fertilizer! Makes a good amount.', prc: 800, tag: 'Object,Functional' },
		rain_barrel:  { name: 'Rain Barrel',  desc: 'Collects rainwater for cooking.', prc: 250, tag: 'Object,Functional' },
		chair:        { name: 'Chair',        desc: 'A nice chair to sit in.', prc: 400, tag: 'Object' },
		tool_shed:    { name: 'Tool Shed',    desc: 'Lets you click+drag with tools and seeds!', prc: 2000, tag: 'Object' },
		scarecrow:    { name: 'Scarecrow',    desc: 'Keeps crops weeded in a 5x5 area. How? Best not to question it.', prc: 500, tag: 'Object,Functional' },
		beebox:       { name: 'Bee Box',      desc: 'Produces honey! Production speed is based on the number of flowers directly around it.', prc: 500, tag: 'Object,Functional' },
		well:         { name: 'Well',         desc: 'Because water is important!', prc: 1200, tag: 'Object' },
		crate:        { name: 'Crate',        desc: 'What exactly is inside will remain a mystery.', prc: 650, tag: 'Object' },
		flowers:      { name: 'Flowers',      desc: 'A plant that keeps itself alive! Also used to help the Bee Box work.', prc: 200, tag: 'Object,Functional' },
		lantern:      { name: 'Lantern',      desc: 'Lights up the cold, dark nights...if there were any.', prc: 200, tag: 'Object' },
		tree_stump:   { name: 'Tree Stump',   desc: 'A stump. Axe included!', prc: 350, tag: 'Object' },
		rock_pile:    { name: 'Rock Pile',    desc: 'Well, you had to put them somewhere.', prc: 150, tag: 'Object' },
		log:          { name: 'Log',          desc: 'Can be sat on!', prc: 150, tag: 'Object' },
		potted_plant: { name: 'Potted Plant', desc: 'A plant. But in a pot? Why?', prc: 100 },
		bird_bath:    { name: 'Bird Bath',    desc: 'If the birds stick around, the pests will not.', prc: 800, tag: 'Object' },
		small_pond:   { name: 'Small Pond',   desc: 'Fish not included.', prc: 5000, tag: 'Object' },
		herb_rack:    { name: 'Herb Rack',    desc: 'What herbs go on this? Thyme? Oregano?', prc: 1450, tag: 'Object' },
		table:        { name: 'Table',        desc: 'Made from imported Italian maple.', prc: 600, tag: 'Object' },
		bench:        { name: 'Bench',        desc: 'A bench. Where even are you?', prc: 700, tag: 'Object' },
		lamp_post:    { name: 'Lamp Post',    desc: 'Lamp...elevated.', prc: 1550, tag: 'Object' },
		arch:         { name: 'Arch',         desc: 'Oh, lovely!', prc: 2000, tag: 'Object' },
		gazebo:       { name: 'Gazebo',       desc: 'A good spot to confess your love to...someone.', prc: 12000, tag: 'Object' },
		tree:         { name: 'Tree',         desc: 'More air!', prc: 2500, tag: 'Object' },
	};

	const COMPOST_BIN_KEY = 'compost_bin';
	const BEE_BOX_KEY = 'beebox';
	const RAIN_BARREL_KEY = 'rain_barrel';
	const BEE_BOX_ICON_EMPTY = 'bee_box_empty';
	const BEE_BOX_ICON_FULL = 'bee_box_full';
	const RAIN_BARREL_ICON_EMPTY = 'rain_barrel_empty';
	const RAIN_BARREL_ICON_FULL = 'rain_barrel_full';
	const RAIN_BARREL_MAX_STORAGE = 5;

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

	const resolve=(p)=> (typeof chrome!=='undefined' && chrome.runtime?.getURL)? chrome.runtime.getURL(p):p;
	const iconFor=(file)=>`icons/farm/objects/${file}`;

	// Render object catalog grid and hook each card into farminteract
	const buildUI=()=>{
		root.textContent='';
		const box=document.createElement('div');
		Object.assign(box.style,{
			position:'relative',background:'#151515',color:'#ddd',
			border:'1px solid #333',borderRadius:'8px',boxShadow:'0 8px 24px #0009',
			padding:'10px',boxSizing:'border-box',
		});
		const COLS=5, BTN=60, GAP=10, PAD=10;
		
		const coinRow=document.createElement('div');
		Object.assign(coinRow.style,{display:'flex',alignItems:'center',gap:'2px',marginBottom:'8px'});
		const coinImg=document.createElement('img');
		coinImg.alt=''; coinImg.draggable=false; coinImg.decoding='async'; coinImg.loading='lazy';
		coinImg.src=resolve('icons/farm/coin.png'); coinImg.onerror=function(){ this.src=resolve('icons/error.png'); };
		Object.assign(coinImg.style,{ width:'16px', height:'16px' });
		const coinText=document.createElement('span');
		Object.assign(coinText.style,{ color:'#f3d266', fontWeight:'700' });
		const refreshCoins = () => { try { const c = window.fjFarm?.coins?.get?.() || 0; coinText.textContent = String(c); } catch(_){} };
		refreshCoins();
		
		const coinListener = () => refreshCoins();
		window.addEventListener('fjFarmCoinsChanged', coinListener);
		
		coinRow._coinListener = coinListener;
		coinRow.append(coinImg, coinText);
		const grid=document.createElement('div');
		Object.assign(grid.style,{
			display:'grid',gridTemplateColumns:`repeat(${COLS}, ${BTN}px)`,gap:`${GAP}px`,
		});
		const boxWidth=(COLS*BTN)+((COLS-1)*GAP)+(PAD*2); 
		box.style.width=boxWidth+'px';
		root.style.width=boxWidth+'px';

		const makeBtn=(file,idx)=>{
			const btn=document.createElement('button');
			btn.type='button';
			const key=file.replace(/\.png$/i,'');
			const iconFile = key === COMPOST_BIN_KEY
				? 'compost_bin_empty.png'
				: key === BEE_BOX_KEY ? `${BEE_BOX_ICON_EMPTY}.png`
				: key === RAIN_BARREL_KEY ? `${RAIN_BARREL_ICON_EMPTY}.png`
				: file;
			btn.setAttribute('data-shop-key',key);
			Object.assign(btn.style,{
				width:'60px',height:'60px',display:'flex',alignItems:'center',justifyContent:'center',
				background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:'6px',cursor:'pointer',padding:'0',margin:'0',
				boxShadow:'inset 0 0 0 1px #0008',
			});
			const showTip = () => {
				try {
					
					const interactModule = window.fjTweakerModules?.farminteract;
					if (interactModule?.hasSelection?.()) {
						return; 
					}
					
					const meta = SHOP_TIPS[key];
					if (!meta) return;
					window.fjfeFarmTT?.show?.({
						imageSrc: resolve(iconFor(iconFile)),
						name: meta.name,
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
			const img=document.createElement('img');
			img.alt=key; img.draggable=false; img.decoding='async'; img.loading='lazy';
			img.src=resolve(iconFor(iconFile)); img.onerror=function(){ this.src=resolve('icons/error.png'); };
			Object.assign(img.style,{ width:'100%', height:'100%', objectFit:'cover' });
			btn.appendChild(img);
			return { btn, iconFile };
		};

		buttonsMeta=[];
		ITEMS.forEach((file,idx)=>{
			const { btn, iconFile } = makeBtn(file,idx);
			const row=Math.floor(idx/COLS)+1; const col=(idx%COLS)+1;
			grid.appendChild(btn);
			const key = file.replace(/\.png$/i,'');
			const t = SHOP_TIPS[key] || { name: key, desc: 'TBD', prc: 0 };
			
			
			try {
				const interactModule = window.fjTweakerModules?.farminteract;
				if (interactModule && interactModule.wireButton) {
					const wiredBtn = interactModule.wireButton(btn, { key, icon: iconFor(iconFile), type: 'object' });
					buttonsMeta.push({ key, icon:iconFor(iconFile), el:wiredBtn, row, col, name: t.name, desc: t.desc, prc: t.prc, tag: t.tag });
				} else {
					buttonsMeta.push({ key, icon:iconFor(iconFile), el:btn, row, col, name: t.name, desc: t.desc, prc: t.prc, tag: t.tag });
				}
			} catch (_) {
				buttonsMeta.push({ key, icon:iconFor(iconFile), el:btn, row, col, name: t.name, desc: t.desc, prc: t.prc, tag: t.tag });
			}
		});

		box.appendChild(coinRow);
		box.appendChild(grid);
		root.appendChild(box);
	};

	const open=(host)=>{
		if(isOpen||!host) return;
		root=document.createElement('div'); root.id='fj-farmshop';
		Object.assign(root.style,{
			position:'absolute', left:'0', top:'0', height:'auto', background:'transparent', color:'#ddd', overflow:'visible',
			transform:'translateX(-12px)', opacity:'0', transition:'transform 160ms cubic-bezier(.2,.9,.2,1), opacity 140ms ease',
		});
		buildUI(); host.appendChild(root);
		requestAnimationFrame(()=>{ root.style.transform='translateX(0)'; root.style.opacity='1'; });
		isOpen=true;
	};

	const close=()=>{
		if(!isOpen||!root) return;
		try{ root.style.transform='translateX(-12px)'; root.style.opacity='0'; setTimeout(()=>{ root?.remove(); root=null; },180); }
		finally{ isOpen=false; }
	};

	
	const getObjectCost = (objectKey) => {
		const objectData = buttonsMeta.find(b => b.key === objectKey);
		return objectData?.prc || 0;
	};

	
	// Ensure the footprint fits, avoids water, and doesn't overlap plants/objects
	const canPlaceObject = (tileIndex, objectName) => {
		const tileStrip = document.getElementById('fj-farm-tiles');
		if (!tileStrip) return false;
		
		const tiles = Array.from(tileStrip.children);
		const totalCols = 8;
		const totalRows = Math.ceil(tiles.length / totalCols);
		
		
		const size = window.fjFarm?.getObjectSize?.(objectName) || { width: 1, height: 1 };
		
		
		const startRow = Math.floor(tileIndex / totalCols);
		const startCol = tileIndex % totalCols;
		
		
		if (startCol + size.width > totalCols) return false;
		if (startRow + size.height > totalRows) return false;
		
		
		for (let row = startRow; row < startRow + size.height; row++) {
			for (let col = startCol; col < startCol + size.width; col++) {
				const checkIndex = row * totalCols + col;
				if (checkIndex >= tiles.length) return false;
				
				
				const tileType = window.fjFarm?.state?.getTileType?.(checkIndex) || 'dirt';
				if (tileType === 'water') return false;
				
				
				if (window.fjFarm?.state?.getPlant?.(checkIndex)) return false;
				if (window.fjFarm?.state?.getObject?.(checkIndex)) return false;
			}
		}
		
		return true;
	};

	
	// Handles payment, persistence, and sprite updates when dropping an object
	const placeObject = (tileElement, tileIndex, objectName, objectCost, extraData) => {
		if (!tileElement || !objectName) return false;
		
		
		if (!canPlaceObject(tileIndex, objectName)) {
			return false;
		}
		
		
		const currentCoins = window.fjFarm?.coins?.get?.() || 0;
		if (currentCoins < objectCost) {
			return false; 
		}
		
		
		if (objectCost > 0) {
			window.fjFarm?.coins?.add?.(-objectCost);
		}
		
		
		const size = window.fjFarm?.getObjectSize?.(objectName) || { width: 1, height: 1 };
		const tileStrip = document.getElementById('fj-farm-tiles');
		if (!tileStrip) return false;
		
		const tiles = Array.from(tileStrip.children);
		const totalCols = 8;
		const startRow = Math.floor(tileIndex / totalCols);
		const startCol = tileIndex % totalCols;
		const lowerName = String(objectName || '').toLowerCase();
		const isCompostBin = lowerName === 'compost_bin';
		const isBeeBox = lowerName === BEE_BOX_KEY;
		const isRainBarrel = lowerName === RAIN_BARREL_KEY;
		const initialCompost = isCompostBin ? Math.max(0, Math.round(Number(extraData?.compostValue) || 0)) : undefined;
		const placementTime = Date.now();
		const beeBoxState = isBeeBox ? {
			honeyCycleStart: Number.isFinite(Number(extraData?.honeyCycleStart)) ? Number(extraData.honeyCycleStart) : placementTime,
			honeyReady: Boolean(extraData?.honeyReady),
			honeyReadyAt: Number.isFinite(Number(extraData?.honeyReadyAt)) ? Number(extraData.honeyReadyAt) : undefined,
			honeyCollectedAt: Number.isFinite(Number(extraData?.honeyCollectedAt)) ? Number(extraData.honeyCollectedAt) : placementTime,
		} : null;
		const rainBarrelState = isRainBarrel ? {
			rainWaterStored: Math.max(0, Math.min(RAIN_BARREL_MAX_STORAGE, Math.round(Number(extraData?.rainWaterStored) || 0))),
			rainWaterCycleStart: Number.isFinite(Number(extraData?.rainWaterCycleStart)) ? Number(extraData.rainWaterCycleStart) : placementTime,
		} : null;
		let anchorPayload = null;
		
		
		for (let row = startRow; row < startRow + size.height; row++) {
			for (let col = startCol; col < startCol + size.width; col++) {
				const saveIndex = row * totalCols + col;
				const isAnchor = (row === startRow && col === startCol); 
				
				const objectData = {
					objectName: objectName,
					placedAt: placementTime,
					cost: objectCost,
					anchorIndex: tileIndex, 
					isAnchor: isAnchor,
					size: size
				};
				if (isCompostBin) {
					objectData.compostValue = initialCompost || 0;
				}
				if (isBeeBox) {
					objectData.honeyCycleStart = beeBoxState?.honeyCycleStart || placementTime;
					objectData.honeyReady = Boolean(beeBoxState?.honeyReady);
					if (beeBoxState?.honeyReadyAt != null) objectData.honeyReadyAt = beeBoxState.honeyReadyAt;
					objectData.honeyCollectedAt = beeBoxState?.honeyCollectedAt || objectData.honeyCycleStart;
				}
				if (isRainBarrel) {
					objectData.rainWaterStored = rainBarrelState?.rainWaterStored || 0;
					objectData.rainWaterCycleStart = rainBarrelState?.rainWaterCycleStart || placementTime;
				}
				window.fjFarm?.state?.setObject?.(saveIndex, objectData);
				if (isAnchor) {
					anchorPayload = { ...objectData };
				}
			}
		}
		
		
		const anchorContainer = tiles[tileIndex];
		if (!anchorContainer) return false;
		
				let objectImg = anchorContainer.querySelector('.object-overlay');
		if (!objectImg) {
			objectImg = document.createElement('img');
			objectImg.className = 'object-overlay';
			objectImg.alt = `${objectName}`;
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
						zIndex: '10',
						transformOrigin: 'top left',
						overflow: 'visible'
					};
								if (objectName === 'lamp_post') {
									
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
			
			
			anchorContainer.style.overflow = 'visible';
			anchorContainer.appendChild(objectImg);
		}
		
		const compostIcon = initialCompost >= 300 ? 'compost_bin_full' : 'compost_bin_empty';
		const desiredIconKey = isCompostBin
			? compostIcon
			: isBeeBox
				? ((anchorPayload && anchorPayload.honeyReady) ? BEE_BOX_ICON_FULL : BEE_BOX_ICON_EMPTY)
			: isRainBarrel
				? ((anchorPayload && Math.max(0, Math.round(Number(anchorPayload.rainWaterStored) || 0)) > 0) ? RAIN_BARREL_ICON_FULL : RAIN_BARREL_ICON_EMPTY)
				: objectName;
		objectImg.src = resolve(`icons/farm/objects/${desiredIconKey}.png`);
		objectImg.onerror = function() {
			this.src = resolve('icons/error.png');
		};
		if (isBeeBox) {
			try {
				window.fjTweakerModules?.farmtile?.ensureBeeBoxMonitor?.();
				window.fjTweakerModules?.farmtile?.refreshBeeBoxes?.();
			} catch (_) {}
		}
		if (isRainBarrel) {
			try {
				window.fjTweakerModules?.farmtile?.ensureRainBarrelMonitor?.();
				window.fjTweakerModules?.farmtile?.refreshRainBarrels?.();
			} catch (_) {}
		}
		
		return true;
	};

	
	// Show a translucent overlay mirroring the object's footprint while dragging
	const highlightObjectArea = (tileIndex, objectName, validity) => {
		const tileStrip = document.getElementById('fj-farm-tiles');
		if (!tileStrip) return;
		
		const tiles = Array.from(tileStrip.children);
		const totalCols = 8;
		const size = window.fjFarm?.getObjectSize?.(objectName) || { width: 1, height: 1 };
		
		const startRow = Math.floor(tileIndex / totalCols);
		const startCol = tileIndex % totalCols;
		
		
		clearObjectHighlights();
		
		
		for (let row = startRow; row < startRow + size.height; row++) {
			for (let col = startCol; col < startCol + size.width; col++) {
				
				if (col >= totalCols) break; 
				
				const checkIndex = row * totalCols + col;
				if (checkIndex < tiles.length && checkIndex >= 0) {
					const tile = tiles[checkIndex];
					
					
					const ov = document.createElement('div');
					ov.className = 'object-highlight-overlay';
					Object.assign(ov.style, {
						position: 'absolute',
						top: '0', left: '0', width: '100%', height: '100%',
						pointerEvents: 'none',
						boxSizing: 'border-box',
						zIndex: '15',
						background: validity === 'valid' ? 'rgba(0,255,0,0.08)' : 'rgba(255,0,0,0.08)',
						border: validity === 'valid' ? '2px solid rgba(0,255,0,0.5)' : '2px solid rgba(255,0,0,0.7)'
					});
					
					if (tile && tile.style && tile.style.position !== 'relative') {
						tile.style.position = 'relative';
					}
					tile.appendChild(ov);
					tile.classList.add('object-highlight');
				}
			}
		}
	};

	
	// Remove any footprint overlays leftover from hover previews
	const clearObjectHighlights = () => {
		const highlightedTiles = document.querySelectorAll('.object-highlight');
		highlightedTiles.forEach(tile => {
			
			const overlays = tile.querySelectorAll('.object-highlight-overlay');
			overlays.forEach(n => n.remove());
			tile.classList.remove('object-highlight');
		});
	};

	const getObjectTips = () => SHOP_TIPS;

	const init=()=>{};
	window.fjTweakerModules=window.fjTweakerModules||{};
	window.fjTweakerModules[MODULE_KEY]={ 
		init, open, close, isOpen:()=>isOpen, getButtons:()=>buttonsMeta.slice(),
		getObjectCost, canPlaceObject, placeObject, highlightObjectArea, clearObjectHighlights,
		getObjectTips
	};
})();
