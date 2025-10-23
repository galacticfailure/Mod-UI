(() => {
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

	
	
	const SHOP_TIPS = {
		fountain:     { name: 'Fountain',     desc: 'A large fountain, for large decoration.', prc: 10000 },
		sprinkler:    { name: 'Sprinkler',    desc: 'Keeps crops watered in a 5x5 area.', prc: 500 },
		compost_bin:  { name: 'Compost Bin',  desc: 'Normally this would produce rich fertilizer, but we have no need for that.', prc: 800 },
		rain_barrel:  { name: 'Rain Barrel',  desc: 'Collects rainwater for...well...decoration, I suppose.', prc: 1300 },
		chair:        { name: 'Chair',        desc: 'A nice chair to sit in.', prc: 400 },
		tool_shed:    { name: 'Tool Shed',    desc: 'What, were you just carrying all that stuff aruond?', prc: 7500 },
		scarecrow:    { name: 'Scarecrow',    desc: 'Keeps crops weeded in a 5x5 area. How? Best not to question it.', prc: 500 },
		beebox:       { name: 'Beebox',       desc: 'Honey? No. Big yellow box? Yeah.', prc: 900 },
		well:         { name: 'Well',         desc: 'Because water is important!', prc: 1200 },
		crate:        { name: 'Crate',        desc: 'What exactly is inside will remain a mystery.', prc: 650 },
		flowers:      { name: 'Flowers',      desc: 'A plant that keeps itself alive!', prc: 200 },
		lantern:      { name: 'Lantern',      desc: 'Lights up the cold, dark nights...if there were any.', prc: 200 },
		tree_stump:   { name: 'Tree Stump',   desc: 'A stump. Axe included!', prc: 350 },
		rock_pile:    { name: 'Rock Pile',    desc: 'Well, you had to put them somewhere.', prc: 150 },
		log:          { name: 'Log',          desc: 'Can be sat on!', prc: 150 },
		potted_plant: { name: 'Potted Plant', desc: 'A plant. But in a pot? Why?', prc: 100 },
		bird_bath:    { name: 'Bird Bath',    desc: 'If the birds stick around, the pests will not.', prc: 800 },
		small_pond:   { name: 'Small Pond',   desc: 'Fish not included.', prc: 5000 },
		herb_rack:    { name: 'Herb Rack',    desc: 'What herbs go on this? Thyme? Oregano?', prc: 1450 },
		table:        { name: 'Table',        desc: 'Made from imported Italian maple.', prc: 600 },
		bench:        { name: 'Bench',        desc: 'A bench. Where even are you?', prc: 700 },
		lamp_post:    { name: 'Lamp Post',    desc: 'Lamp...elevated.', prc: 1550 },
		arch:         { name: 'Arch',         desc: 'Oh, lovely!', prc: 2000 },
		gazebo:       { name: 'Gazebo',       desc: 'A good spot to confess your love to...someone.', prc: 12000 },
		tree:         { name: 'Tree',         desc: 'More air!', prc: 2500 },
	};

	const resolve=(p)=> (typeof chrome!=='undefined' && chrome.runtime?.getURL)? chrome.runtime.getURL(p):p;
	const iconFor=(file)=>`icons/farm/objects/${file}`;

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
						imageSrc: resolve(iconFor(file)),
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
			const img=document.createElement('img');
			img.alt=key; img.draggable=false; img.decoding='async'; img.loading='lazy';
			img.src=resolve(iconFor(file)); img.onerror=function(){ this.src=resolve('icons/error.png'); };
			Object.assign(img.style,{ width:'100%', height:'100%', objectFit:'cover' });
			btn.appendChild(img);
			return btn;
		};

		buttonsMeta=[];
		ITEMS.forEach((file,idx)=>{
			const btn=makeBtn(file,idx);
			const row=Math.floor(idx/COLS)+1; const col=(idx%COLS)+1;
			grid.appendChild(btn);
			const key = file.replace(/\.png$/i,'');
			const t = SHOP_TIPS[key] || { name: key, desc: 'TBD', prc: 0 };
			
			
			try {
				const interactModule = window.fjTweakerModules?.farminteract;
				if (interactModule && interactModule.wireButton) {
					const wiredBtn = interactModule.wireButton(btn, { key, icon: iconFor(file), type: 'object' });
					buttonsMeta.push({ key, icon:iconFor(file), el:wiredBtn, row, col, name: t.name, desc: t.desc, prc: t.prc });
				} else {
					buttonsMeta.push({ key, icon:iconFor(file), el:btn, row, col, name: t.name, desc: t.desc, prc: t.prc });
				}
			} catch (_) {
				buttonsMeta.push({ key, icon:iconFor(file), el:btn, row, col, name: t.name, desc: t.desc, prc: t.prc });
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

	
	const placeObject = (tileElement, tileIndex, objectName, objectCost) => {
		if (!tileElement || !objectName) return false;
		
		
		if (!canPlaceObject(tileIndex, objectName)) {
			return false;
		}
		
		
		const currentCoins = window.fjFarm?.coins?.get?.() || 0;
		if (currentCoins < objectCost) {
			return false; 
		}
		
		
		window.fjFarm?.coins?.add?.(-objectCost);
		
		
		const size = window.fjFarm?.getObjectSize?.(objectName) || { width: 1, height: 1 };
		const tileStrip = document.getElementById('fj-farm-tiles');
		if (!tileStrip) return false;
		
		const tiles = Array.from(tileStrip.children);
		const totalCols = 8;
		const startRow = Math.floor(tileIndex / totalCols);
		const startCol = tileIndex % totalCols;
		
		
		for (let row = startRow; row < startRow + size.height; row++) {
			for (let col = startCol; col < startCol + size.width; col++) {
				const saveIndex = row * totalCols + col;
				const isAnchor = (row === startRow && col === startCol); 
				
				const objectData = {
					objectName: objectName,
					placedAt: Date.now(),
					cost: objectCost,
					anchorIndex: tileIndex, 
					isAnchor: isAnchor,
					size: size
				};
				window.fjFarm?.state?.setObject?.(saveIndex, objectData);
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
			
			
			Object.assign(objectImg.style, {
				position: 'absolute',
				top: '0',
				left: '0',
				width: '100%',
				height: '100%',
				objectFit: 'cover',
				pointerEvents: 'none',
				zIndex: '10', 
				transformOrigin: 'top left',
				transform: `scale(${size.width}, ${size.height})`,
				overflow: 'visible' 
			});
			
			
			anchorContainer.style.overflow = 'visible';
			anchorContainer.appendChild(objectImg);
		}
		
		objectImg.src = resolve(`icons/farm/objects/${objectName}.png`);
		objectImg.onerror = function() {
			this.src = resolve('icons/error.png');
		};
		
		return true;
	};

	
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
