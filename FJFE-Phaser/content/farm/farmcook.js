(() => {
	const MODULE_KEY='farmcook';
	const DEBUG_REC=false; 
	const dlog=()=>{};
	let root=null,isOpen=false;
	let buttonsMeta=[]; 
	let cookSlotsCache = {}; 
	
	let recipePanelEl = null;
	let recipeTab = 'ingredients'; 
    
    let recipeReplacingInventory = false;
	
	let recipeScrollTops = { ingredients: 0, recipes: 0 };
	let recipeContentEl = null;

	
	const dumpRecipeDebugSnapshot = (_label='snapshot') => { return; };

	

	
	const ensureRecipePanelVisible = (why) => {
		if (!recipePanelEl || !root) return;
		try {
			const host = root?.parentNode || document.body;
			if (recipePanelEl.parentNode !== host) {
				host.appendChild(recipePanelEl);
			}
			const left = Math.round((root.getBoundingClientRect().width || 0) + 12);
			Object.assign(recipePanelEl.style, {
				position: 'absolute',
				left: left + 'px',
				top: '0px',
				width: BOX_WIDTH + 'px',
				display: 'block',
				minHeight: '260px',
				zIndex: 9999,
				overflow: 'hidden',
				pointerEvents: 'auto',
			});
			requestAnimationFrame(() => {
				try {
					const rr2 = recipePanelEl?.getBoundingClientRect?.();
					if (!rr2 || rr2.width < 20 || rr2.height < 20) {
						const h = Math.max(260, recipePanelEl.scrollHeight || 0);
						recipePanelEl.style.height = h + 'px';
					}
				} catch(e) { }
			});
		} catch(e) { }
	};

	
	
	// Ingredient blueprints that drive shop cards and pricing math
	const INGREDIENTS = [
		{ name: 'Flour', desc: 'Did you know this stuff can explode?', ing: ['wheat2'], cook: 'mb' },
		{ name: 'Sugar', desc: 'The most addictive substance on the planet, in your kitchen!', ing: ['sugarcane2'], cook: 'mb' },
		{ name: 'Butter', desc: 'I can never say this without thinking of that butter frog from CWACOM 2.', ing: ['milk2'], cook: 'mb' },
		{ name: 'Cheese', desc: 'Hard drugs, according to your brain.', ing: ['milk2,spices1'], cook: 'st' },
		{ name: 'Spices', desc: 'What spice is this? What spice is this NOT?', ing: ['pepper2'], cook: 'mb' },
		{ name: 'Cooking Oil', desc: 'Chug! Chug! Chug!', ing: ['olives2'], cook: 'mb' },
		{ name: 'Chocolate', desc: 'Back in the great depression, this stuff was more common than flour. Wild.', ing: ['cocoa2,sugar1'], cook: 'st' },
		{ name: 'Pumpkin Puree', desc: 'Well, it certainly smells like pumpkin.', ing: ['pumpkin2,sugar1'], cook: 'st' },
		{ name: 'Pineapple Glaze', desc: 'Very sweet, very fruity, very yellow.', ing: ['pineapple2,sugar1'], cook: 'st' },
		{ name: 'Jam', desc: 'Why not add fruit jam? Lazy.', ing: ['berries2,sugar1'], cook: 'st' },
		{ name: 'Dough', desc: 'Nearly destroyed New York City once.', ing: ['flour1,water1'], cook: 'mb' },
		{ name: 'Mashed Potato', desc: "You've ruined a perfectly good potato is what you've done.", ing: ['potato2,milk1'], cook: 'st' },
		{ name: 'Tomato Sauce', desc: 'A tomato you can drink!', ing: ['tomato2,onion1,spices1'], cook: 'st' },
		{ name: 'Ground Meat', desc: 'Looks kinda like a brain, huh?', ing: ['meat2'], cook: 'st' },
		{ name: 'Guacamole', desc: 'I saw someone make this using a grenade and poker chips once.', ing: ['avocado2,tomato1,onion1,pepper1'], cook: 'mb' },
		{ name: 'Pasta', desc: 'Break in case of Italian.', ing: ['dough2,water1'], cook: 'st' },
		{ name: 'Ice Cream', desc: 'How are you keeping this cold?', ing: ['milk2,sugar1'], cook: 'mb' },
		{ name: 'Bread', desc: "Best thing since sliced dough. I'm funny, shut up.", ing: ['dough1,butter1'], cook: 'ov' }
	];

	// Higher-tier recipes unlocked in the book, ordered roughly by complexity
	const RECIPES = [
		{ name: 'Pancakes', desc: 'Easy to make and easy to enjoy!', ing: ['flour2,milk1,egg1,sugar1'], cook: 'st' },
		{ name: 'Waffles', desc: 'Bumpy pancake. Or is a pancake just a flat waffle?', ing: ['dough2,egg1,butter1,sugar1'], cook: 'ov' },
		{ name: 'French Toast', desc: 'High-effort sugar toast.', ing: ['bread1,egg1,milk1,honey1'], cook: 'st' },
		{ name: 'Berry Muffins', desc: 'Regular muffins with occasional bursts of fruity flavor!', ing: ['flour2,butter1,berries1,sugar1'], cook: 'ov' },
		{ name: 'Chocolate Cake', desc: "And that's terrible.", ing: ['flour2,chocolate1,butter1,egg1'], cook: 'ov' },
		{ name: 'Pumpkin Pie', desc: 'It should not be as good as it is...and yet.', ing: ['pumpkin_puree2,dough1,milk1,sugar1'], cook: 'ov' },
		{ name: 'Sweet Roll', desc: 'Good chance this will be stolen.', ing: ['dough2,butter1,sugar1,honey1'], cook: 'ov' },
		{ name: 'Nut Bread', desc: 'Heh.', ing: ['dough2,nuts1,honey1,butter1'], cook: 'ov' },
		{ name: 'Omelette', desc: 'The most omelette an omelette can be.', ing: ['egg2,cheese1,milk1,spices1'], cook: 'st' },
		{ name: 'Steak and Eggs', desc: "Can't go wrong with a classic.", ing: ['meat2,egg2,spices1'], cook: 'st' },
		{ name: 'Burrito', desc: 'Fart cylinder.', ing: ['dough1,ground_meat2,cheese1,tomato_sauce1'], cook: 'st' },
		{ name: 'Stuffed Peppers', desc: 'Who came up with this? A madman.', ing: ['pepper2,ground_meat1,rice1,guacamole1'], cook: 'ov' },
		{ name: 'Fried Rice', desc: 'What if we take rice...and cook it again?', ing: ['rice2,egg1,cooking_oil1,spices1'], cook: 'st' },
		{ name: 'Tomato Soup', desc: 'Liquid tomato, now with even more liquid tomato.', ing: ['tomato_sauce2,milk1,onion1,spices1'], cook: 'st' },
		{ name: 'Mashed Potatoes', desc: "But...didn't you already...?", ing: ['mashed_potato2,butter1,spices1'], cook: 'st' },
		{ name: 'Potato Soup', desc: "Just pretend the potatoes are in chunks. I'm not redoing it.", ing: ['mashed_potato1,cheese1,spices1,milk1'], cook: 'st' },
		{ name: 'Avocado Toast', desc: 'Rich kid breakfast.', ing: ['bread1,avocado1,spices1'], cook: 'st' },
		{ name: 'Curry Bowl', desc: 'Do not eat with your hands. Please. I beg.', ing: ['rice2,meat1,spices1,tomato_sauce1'], cook: 'st' },
		{ name: 'Chocolate Pudding', desc: 'As opposed to regular pudding.', ing: ['chocolate1,milk2,sugar1,butter1'], cook: 'mb' },
		{ name: 'Pie', desc: 'What flavor?', ing: ['dough2,jam1,butter1,sugar1'], cook: 'ov' },
		{ name: 'Fruit Tart', desc: 'Now with more tart!', ing: ['dough2,pineapple_glaze1,fruit1,butter1'], cook: 'ov' },
		{ name: 'Pineapple Cake', desc: "This feels like a depression-era recipe. It's not, but it feels like it.", ing: ['pineapple_glaze1,flour2,butter1,egg1'], cook: 'ov' },
		{ name: 'Chocolate Bar', desc: 'Way too much effort for this thing.', ing: ['chocolate2,sugar1,butter1'], cook: 'mb' },
		{ name: 'Jelly Donut', desc: 'As seen on TV!', ing: ['dough2,jam1,butter1,sugar1'], cook: 'ov' },
		{ name: 'Fruit Salad', desc: 'This is high-effort fruit salad, this is.', ing: ['fruit2,pineapple_glaze1,honey1'], cook: 'mb' },
		{ name: 'Honey Cookies', desc: 'Surprisingly tasty!', ing: ['dough2,sugar1,honey1,butter1'], cook: 'ov' },
		{ name: 'Honey Cake', desc: 'Bees not included.', ing: ['flour2,butter1,honey1,egg1'], cook: 'ov' },
		{ name: 'Candied Pumpkin', desc: 'Not the whole pumpkin, of course. Unless...?', ing: ['pumpkin_puree2,sugar1,honey1'], cook: 'st' },
		{ name: 'Tacos', desc: 'Remember when it was raining these? I remember.', ing: ['dough1,ground_meat1,cheese1,spices1'], cook: 'st' },
		{ name: 'Spaghetti and Meatballs', desc: 'So easy to make, yet no restaurant can ever get them right.', ing: ['pasta1,tomato_sauce1,ground_meat1,onion1'], cook: 'st' },
		{ name: 'Ham and Cheese Sandwich', desc: 'Best after swimming.', ing: ['bread1,meat1,cheese1'], cook: 'mb' },
		{ name: 'Lasagna', desc: '[Garfield joke]', ing: ['pasta2,ground_meat1,tomato_sauce1,cheese1'], cook: 'ov' },
		{ name: 'Macaroni and Cheese', desc: 'Either a struggle meal or the best thing ever, or both.', ing: ['pasta2,cheese1,milk1,butter1'], cook: 'st' },
		{ name: 'Cheeseburger', desc: 'Can has.', ing: ['bread1,meat1,cheese1,tomato1'], cook: 'st' },
		{ name: 'Fruit Parfait', desc: 'You would think this uses ice cream, but no.', ing: ['milk1,berries1,fruit1,honey1'], cook: 'mb' },
		{ name: 'Watermelon Sorbet', desc: 'Watermelon, but sweeter, if possible.', ing: ['watermelon1,sugar1,ice_cream1'], cook: 'mb' },
		{ name: 'Honey Glazed Ham', desc: 'This or turkey. Which way, western man?', ing: ['meat3,honey1,spices1'], cook: 'ov' },
		{ name: 'Roast Turkey', desc: 'Merry Christmas! Wait, no. Thanksgiving. My bad.', ing: ['meat3,onion1,spices1'], cook: 'ov' },
		{ name: 'Spaghetti Alfredo', desc: "You add chicken to this? I don't, but to each their own.", ing: ['pasta2,milk1,butter1'], cook: 'st' },
		{ name: 'Ramen', desc: 'Include egg. Always.', ing: ['pasta1,egg1,meat1,spices1'], cook: 'st' },
		{ name: 'Cider', desc: 'Not hard cider. Just normal cider. For now.', ing: ['fruit2,sugar1'], cook: 'st' },
		{ name: 'Beef Stew', desc: 'Meat water.', ing: ['meat2,potato1,onion1,spices1'], cook: 'st' },
		{ name: 'Pizza', desc: 'You get pepperoni.', ing: ['dough1,tomato_sauce1,cheese1,meat1'], cook: 'ov' },
		{ name: 'Stuffed Potato', desc: 'Either this tastes incredibly amazing, or it tastes like a warm potato. No in-between.', ing: ['potato1,cheese1,butter1,meat1'], cook: 'ov' },
		{ name: 'Grilled Cheese', desc: 'Mmm, sammich.', ing: ['bread1,cheese1,butter1,spices1'], cook: 'st' }
	];

	const SECTIONS=['Mixing Bowl','Stovetop','Oven'];
	const COLS=3, BTN=60, GAP=10, PAD=10; 
	const BOX_WIDTH=(COLS*BTN)+((COLS-1)*GAP)+(PAD*2);
    
    const SECTION_COSTS = { mb: 100, st: 250, ov: 600 };

	const toKey = (name) => String(name).trim().toLowerCase().replace(/\s+/g, '_');
	const slotKey = (sectionName, position) => `${sectionName}|${position}`;

	const resolve = (p) => (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p;

	
	const toFoodKey = (name) => String(name||'').trim().toLowerCase().replace(/\s+/g,'_');

	
	const makeDivider = () => {
		const hr = document.createElement('div');
		Object.assign(hr.style, { height:'1px', background:'#2a2a2a', margin:'8px 0' });
		return hr;
	};

	
	// Normalize comma-delimited ingredient tokens into a flat array
	const flattenTokens = (arr) => {
		const out = [];
		if (!Array.isArray(arr)) return out;
		for (const tok of arr) {
			if (!tok) continue;
			const s = String(tok).trim();
			if (!s) continue;
			if (s.includes(',')) { s.split(',').forEach(p => { const v = p.trim(); if (v) out.push(v); }); }
			else out.push(s);
		}
		return out;
	};

	// Pull the saved slot contents so reopening the UI is seamless
	const loadCookSlots = () => {
		try {
			const map = window.fjFarm?.state?.getCookSlots?.();
			cookSlotsCache = (map && typeof map === 'object') ? map : {};
		} catch(_) { cookSlotsCache = {}; }
	};

	const saveCookSlots = () => {
		try { window.fjFarm?.state?.setCookSlots?.(cookSlotsCache); } catch(_) {}
	};

	// Slots show either an item stack or the placement crosshair
	const renderCookButton = (meta) => {
		if (!meta || !meta.el) return;
		const btn = meta.el;
		btn.innerHTML = '';
		const data = cookSlotsCache[meta.key];
		if (data && data.item && data.count > 0) {
			
			btn.style.backgroundImage = 'none';
			const img = document.createElement('img');
			img.alt = data.item;
			img.draggable = false;
			img.decoding = 'async';
			img.loading = 'lazy';
			img.src = resolve(`icons/farm/food/${data.item}.png`);
			img.onerror = function(){ this.src = resolve('icons/error.png'); };
			Object.assign(img.style, { width:'100%', height:'100%', objectFit:'cover', opacity:'1' });
			btn.appendChild(img);
			if (data.count > 1) {
				const countEl = document.createElement('div');
				countEl.textContent = String(data.count);
				Object.assign(countEl.style, {
					position:'absolute', bottom:'2px', right:'2px',
					background:'rgba(0,0,0,0.8)', color:'#fff', fontSize:'10px', fontWeight:'700',
					padding:'1px 3px', borderRadius:'2px', minWidth:'12px', textAlign:'center'
				});
				btn.appendChild(countEl);
			}
		} else {
			
			if (meta.position !== 'center') {
				btn.style.backgroundImage = 'linear-gradient(#333,#333), linear-gradient(#333,#333)';
				btn.style.backgroundRepeat = 'no-repeat,no-repeat';
				btn.style.backgroundPosition = 'center, center';
				btn.style.backgroundSize = '2px 60%, 60% 2px';
			} else {
				btn.style.backgroundImage = '';
			}
		}
	};

	// Handles left/right click behavior for moving stacks into and out of slots
	const handleCookSlotClick = (e, meta, isRightClick) => {
		e.preventDefault(); e.stopPropagation();
		
		if (meta?.position === 'center') return;
		const interact = window.fjTweakerModules?.farminteract;
		if (!interact) return;
		const hasSel = interact.hasSelection?.();
		const sel = interact.getSelected?.();
		const slot = cookSlotsCache[meta.key];

		
		const commit = () => {
			saveCookSlots();
			renderCookButton(meta);
			
			try { updateCraftPreviewForSection(meta.section); } catch(_) {}
		};

		if (slot && slot.item && slot.count > 0) {
			
			if (hasSel) {
				
				if (sel.type === 'inventory-item' && (sel.itemType === 'plant' || !sel.itemType)) {
					if (sel.item === slot.item) {
						const placeCount = (isRightClick && sel.count > 1) ? 1 : sel.count;
						slot.count += placeCount;
						sel.count -= placeCount;
						if (sel.count <= 0) { sel._skipReturn = true; interact.deselectItem?.(); }
						else { window.fjTweakerModules?.farminteract?.refreshCursorBadge?.(); }
						commit();
					}
				}
				
				return;
			}
			
			const takeCount = (isRightClick && slot.count > 1) ? Math.ceil(slot.count / 2) : slot.count;
			slot.count -= takeCount;
			const picked = { item: slot.item, count: takeCount, type: 'food' };
			
			if (slot.count <= 0) { delete cookSlotsCache[meta.key]; }
			commit();
			
			const selection = {
				key: picked.item,
				item: picked.item,
				count: picked.count,
				itemType: 'food',
				type: 'inventory-item',
				icon: `icons/farm/food/${picked.item}.png`
			};
			interact.selectItem?.(selection, null);
			return;
		}

		
		if (!hasSel) { return; }
		
		if (sel.type === 'inventory-item' && (sel.itemType === 'plant' || sel.itemType === 'food' || !sel.itemType)) {
			const placeCount = (isRightClick && sel.count > 1) ? 1 : sel.count;
			cookSlotsCache[meta.key] = { item: sel.item, count: placeCount, type: 'food' };
			sel.count -= placeCount;
			if (sel.count <= 0) { sel._skipReturn = true; interact.deselectItem?.(); }
			else { window.fjTweakerModules?.farminteract?.refreshCursorBadge?.(); }
			commit();
			return;
		}
		
		return;
	};

	
	const buildLockedSection = (sectionName) => {
		const wrap = document.createElement('div');
		const header = document.createElement('div');
		header.textContent = sectionName;
		Object.assign(header.style,{
			fontSize:'13px',fontWeight:'600',letterSpacing:'0.3px',color:'#e0e0e0',
			margin:'2px 0 8px 2px'
		});
		wrap.appendChild(header);

		const areaW = (COLS*BTN)+((COLS-1)*GAP);
		const areaH = (3*BTN)+((3-1)*GAP);
		const panel = document.createElement('div');
		Object.assign(panel.style,{
			position:'relative',
			width: areaW+'px',
			height: areaH+'px',
			border:'1px solid #a33',
			borderRadius:'8px',
			background:'linear-gradient(180deg, #3a0e0e, #2a0b0b)',
			boxShadow:'inset 0 0 0 1px #0008',
			display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'10px'
		});
		
		const lockImg = document.createElement('img');
		lockImg.alt = 'Locked'; lockImg.draggable=false; lockImg.decoding='async'; lockImg.loading='lazy';
		lockImg.src = resolve('icons/farm/locked.png');
		lockImg.onerror = function(){ this.src = resolve('icons/error.png'); };
		const sizePx = Math.floor(Math.min(areaW, areaH) * 0.25);
		Object.assign(lockImg.style, { width:sizePx+'px', height:sizePx+'px', objectFit:'contain', opacity:'0.95', filter:'drop-shadow(0 2px 2px #0008)' });

		
		const btn = document.createElement('button');
		btn.type='button';
		Object.assign(btn.style,{
			display:'inline-flex', alignItems:'center', gap:'6px', padding:'6px 10px',
			background:'#c33', color:'#fff', border:'1px solid #a22', borderRadius:'6px', cursor:'pointer', fontWeight:'700'
		});
		const coin = document.createElement('img');
		coin.alt=''; coin.draggable=false; coin.decoding='async'; coin.loading='lazy';
		coin.src = resolve('icons/farm/coin.png');
		coin.onerror=function(){ this.src=resolve('icons/error.png'); };
		Object.assign(coin.style,{ width:'16px', height:'16px' });
		const secKey = sectionCookKey(sectionName);
		const cost = SECTION_COSTS[secKey] || 0;
		const label = document.createElement('span');
		label.textContent = String(cost);
		Object.assign(label.style,{ color:'#f3d266' });
		btn.append(coin, label);
		btn.addEventListener('click', (e)=>{
			e.preventDefault(); e.stopPropagation();
			const have = window.fjFarm?.coins?.get?.() || 0;
			if (have < cost) {
				
				btn.style.transform='translateX(-3px)';
				btn.style.transition='transform 80ms ease';
				setTimeout(()=>{ btn.style.transform='translateX(3px)'; setTimeout(()=>{ btn.style.transform='translateX(0)'; },80); },80);
				return;
			}
			try { window.fjFarm?.coins?.add?.(-cost); } catch(_) {}
			try { window.fjFarm?.state?.unlockCookSection?.(secKey); } catch(_) {}
			
			try { buildUI(); } catch(_) {}
		});

		panel.append(lockImg, btn);
		wrap.appendChild(panel);
		return wrap;
	};

	const buildPlusGrid=(sectionName)=>{
		
		try {
			const secKey = sectionCookKey(sectionName);
			const unlocked = window.fjFarm?.state?.isCookSectionUnlocked?.(secKey);
			if (!unlocked) return buildLockedSection(sectionName);
		} catch(_) {}
		const wrap=document.createElement('div');
		const header=document.createElement('div');
		header.textContent=sectionName;
		Object.assign(header.style,{
			fontSize:'13px',fontWeight:'600',letterSpacing:'0.3px',color:'#e0e0e0',
			margin:'2px 0 8px 2px'
		});

		const grid=document.createElement('div');
		Object.assign(grid.style,{
			position:'relative',
			display:'grid',gridTemplateColumns:`repeat(${COLS}, ${BTN}px)`,
			gridTemplateRows:`repeat(3, ${BTN}px)`,gap:`${GAP}px`,
		});

		
		const bgImg = document.createElement('img');
		bgImg.alt = sectionName;
		bgImg.decoding = 'async';
		bgImg.loading = 'lazy';
		bgImg.src = (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(`icons/farm/${toKey(sectionName)}.png`) : `icons/farm/${toKey(sectionName)}.png`;
		bgImg.onerror = function(){ this.src = (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL('icons/error.png') : 'icons/error.png'; };
		Object.assign(bgImg.style,{
			position:'absolute',
			top:'50%', left:'50%', transform:'translate(-50%, -50%)',
			width:'100%', height:'100%', objectFit:'contain', opacity:'0.85',
			pointerEvents:'none', zIndex:'0'
		});
		grid.appendChild(bgImg);

		const makeBtn=(pos)=>{
			const btn=document.createElement('button');
			btn.type='button';
			btn.setAttribute('data-cook-pos',pos);
			Object.assign(btn.style,{
				width:BTN+'px',height:BTN+'px',display:'block',
				background:'rgba(0,0,0,0.5)',border:'1px solid #2a2a2a',borderRadius:'6px',cursor:'pointer',padding:'0',margin:'0',
				boxShadow:'inset 0 0 0 1px #0008',
				position:'relative',
			});
			btn.addEventListener('click',(e)=>{ 
				
				btn.style.transform = 'scale(0.9)';
				btn.style.transition = 'transform 0.1s ease';
				setTimeout(() => { btn.style.transform = 'scale(1.05)'; setTimeout(() => { btn.style.transform = 'scale(1)'; }, 60); }, 100);
				
				const meta = buttonsMeta.find(m => m.el === btn);
				if (!meta) return;
				if (meta.position === 'center') { handleCraftClick(meta.section); return; }
				handleCookSlotClick(e, meta, false);
			});
			btn.addEventListener('contextmenu', (e) => {
				
				e.preventDefault(); e.stopPropagation();
				const meta = buttonsMeta.find(m => m.el === btn);
				if (!meta) return;
				if (meta.position === 'center') { handleCraftClick(meta.section); return; }
				handleCookSlotClick(e, meta, true);
			});
			return btn;
		};

		
		const placements={
			top:[1,2], left:[2,1], center:[2,2], right:[2,3], bottom:[3,2]
		};
		Object.entries(placements).forEach(([pos,[r,c]])=>{
			const btn=makeBtn(pos);
			btn.style.gridRow=String(r);
			btn.style.gridColumn=String(c);
			const key = slotKey(sectionName, pos);
			
			if (pos !== 'center') {
				btn.style.backgroundImage = 'linear-gradient(#333,#333), linear-gradient(#333,#333)';
				btn.style.backgroundRepeat = 'no-repeat,no-repeat';
				btn.style.backgroundPosition = 'center, center';
				btn.style.backgroundSize = '2px 60%, 60% 2px';
			}
			grid.appendChild(btn);
			buttonsMeta.push({ section:sectionName, position:pos, key, el:btn });
		});

		wrap.appendChild(header);
		wrap.appendChild(grid);
		return wrap;
	};

	const buildUI=()=>{
		root.textContent='';
		const box=document.createElement('div');
		Object.assign(box.style,{
			position:'relative',background:'#151515',color:'#ddd',
			border:'1px solid #333',borderRadius:'8px',boxShadow:'0 8px 24px #0009',
			padding:PAD+'px',boxSizing:'border-box',width:BOX_WIDTH+'px'
		});
		root.style.width=BOX_WIDTH+'px';

		buttonsMeta=[];
		SECTIONS.forEach((name,idx)=>{
			const sect=buildPlusGrid(name);
			box.appendChild(sect);
			if(idx<SECTIONS.length-1){
				const hr=document.createElement('div');
				Object.assign(hr.style,{ height:'1px', background:'#2a2a2a', margin:'12px 0' });
				box.appendChild(hr);
			}
		});

		
		const recipeBtn = document.createElement('button');
		recipeBtn.type = 'button';
		recipeBtn.textContent = '';
		Object.assign(recipeBtn.style, {
			position: 'absolute',
			top: '6px',
			right: '6px',
			width: '28px',
			height: '28px',
			padding: '0',
			background: '#1a1a1a',
			border: '1px solid #2a2a2a',
			borderRadius: '6px',
			cursor: 'pointer',
			overflow: 'visible',
			zIndex: 2,
		});
		const rbIcon = document.createElement('img');
		rbIcon.alt = 'Recipe Book';
		rbIcon.draggable = false;
		rbIcon.decoding = 'async';
		rbIcon.loading = 'lazy';
		rbIcon.src = resolve('icons/farm/recipe_book.png');
		rbIcon.onerror = function(){ this.src = resolve('icons/error.png'); };
		Object.assign(rbIcon.style, {
			width: '100%',
			height: '100%',
			objectFit: 'contain',
			transform: 'scale(1.5)', 
			transformOrigin: '50% 50%'
		});
		recipeBtn.appendChild(rbIcon);
		recipeBtn.addEventListener('click', (e) => {
			e.preventDefault(); e.stopPropagation();
			recipeBtn.style.transform = 'scale(0.95)';
			recipeBtn.style.transition = 'transform 0.1s ease';
			setTimeout(() => { recipeBtn.style.transform = 'scale(1.02)'; setTimeout(() => { recipeBtn.style.transform = 'scale(1)'; }, 60); }, 100);
			try {
				
				const invMod = window.fjTweakerModules?.farminv;
				const host = root?.parentNode || document.body;
				if (recipeReplacingInventory) {
					
					closeRecipePanel();
					recipeReplacingInventory = false;
					
					try {
						invMod?.open?.(host);
						const invRoot = document.getElementById('fj-farminv');
						if (invRoot) {
							const GAP = 12;
							const cookW = Math.max(0, root.getBoundingClientRect().width || 0);
							Object.assign(invRoot.style, { position: 'absolute', left: (cookW + GAP) + 'px', top: '0px' });
							invRoot.dataset.pairedWithCooking = '1';
						}
					} catch(_) {}
					
					rbIcon.src = resolve('icons/farm/recipe_book.png');
				} else {
					
					try { document.getElementById('fj-farminv') && invMod?.close?.(); } catch(_) {}
					
					const cookRect = root.getBoundingClientRect();
					const desiredLeft = Math.round((cookRect.width || 0) + 12);
					const desiredTop = 0;

					
					try {
						openRecipePanel(null, { left: desiredLeft, top: desiredTop });
					} catch(errOpen) {
						
						ensureRecipePanelVisible('open-error fallback');
					}
					if (recipePanelEl) {
						let r = null;
						try { r = recipePanelEl.getBoundingClientRect(); } catch(_) {}
						if (!r || r.width < 20 || r.height < 20) {
							ensureRecipePanelVisible('post-open check');
						}
						recipeReplacingInventory = true;
						
						rbIcon.src = resolve('icons/farm/inventory.png');
					}
				}
			} catch(_) {}
		});
		box.appendChild(recipeBtn);

		root.appendChild(box);

		
		buttonsMeta.forEach(renderCookButton);
		SECTIONS.forEach(sec => updateCraftPreviewForSection(sec));
	};

	
	const getTooltipDataForTokenKey = (key) => {
		const norm = toFoodKey(key);
		
		const ingEntry = INGREDIENTS.find(e => toFoodKey(e.name) === norm);
		if (ingEntry) {
			const toks = flattenTokens(ingEntry.ing);
			const price = window.fjFarm?.pricing?.getPriceForItem?.(ingEntry.name, 'ingredient', { tokens: toks }) || 0;
			return {
				imageSrc: resolve(`icons/farm/food/${toFoodKey(ingEntry.name)}.png`),
				name: ingEntry.name,
				bodyTT: ingEntry.desc || '',
				cost: String(price),
				costIcon: 'icons/farm/coin.png',
			};
		}
		
		try {
			const plantHarvest = window.fjTweakerModules?.farmseeds?.getPlantHarvest?.();
			if (plantHarvest && plantHarvest[norm]) {
				const meta = plantHarvest[norm];
				const price = window.fjFarm?.pricing?.getPriceForItem?.(norm, 'plant') || 0;
				return {
					imageSrc: resolve(`icons/farm/food/${norm}.png`),
					name: meta.name || key,
					bodyTT: meta.desc || '',
					cost: String(price),
					costIcon: 'icons/farm/coin.png',
				};
			}
		} catch(_) {}
		
		const recEntry = RECIPES.find(e => toFoodKey(e.name) === norm);
		if (recEntry) {
			const toks = flattenTokens(recEntry.ing);
			const price = window.fjFarm?.pricing?.getPriceForItem?.(recEntry.name, 'recipe', { tokens: toks }) || 0;
			return {
				imageSrc: resolve(`icons/farm/food/${toFoodKey(recEntry.name)}.png`),
				name: recEntry.name,
				bodyTT: recEntry.desc || '',
				cost: String(price),
				costIcon: 'icons/farm/coin.png',
			};
		}
		
		return { imageSrc: resolve(`icons/farm/food/${norm}.png`), name: key };
	};

	
	const parseIngToken = (t) => {
		
		const s = String(t||'').trim();
		const m = s.match(/^(.*?)(?:\s*x)?(\d+)$/i);
		if (m) return { key: String(m[1]||'').trim(), count: parseInt(m[2],10) || 1 };
		return { key: s, count: 1 };
	};

	

	
	const sectionCookKey = (sectionName) => {
		switch (String(sectionName||'').toLowerCase()) {
			case 'mixing bowl': return 'mb';
			case 'stovetop': return 'st';
			case 'oven': return 'ov';
			default: return '';
		}
	};

	
	const getSectionCounts = (sectionName) => {
		const counts = {};
		buttonsMeta.forEach(m => {
			if (m.section === sectionName && m.position !== 'center') {
				const slot = cookSlotsCache[m.key];
				if (slot && slot.item && slot.count > 0) {
					counts[slot.item] = (counts[slot.item] || 0) + slot.count;
				}
			}
		});
		return counts;
	};

	const parseTokens = (arr) => {
		const toks = [];
		flattenTokens(arr).forEach(tok => { const { key, count } = parseIngToken(tok); toks.push({ key: toFoodKey(key), count: count||1 }); });
		return toks;
	};

	
	// Evaluate all craftable entries for the given station and choose the highest priority option
	const findCraftCandidate = (sectionName) => {
		const ck = sectionCookKey(sectionName);
		if (!ck) return null;
		const available = getSectionCounts(sectionName);
		const canMake = (entry) => {
			if (String(entry.cook||'').toLowerCase() !== ck) return null;
			const req = parseTokens(entry.ing || []);
			let crafts = Infinity;
			for (const r of req) {
				const have = available[r.key] || 0;
				if (have < r.count) return null;
				crafts = Math.min(crafts, Math.floor(have / r.count));
			}
			return { req, crafts: (crafts===Infinity?0:crafts) };
		};
		const candidates = [];
		const evaluateEntry = (entry, kind, index, typeRank) => {
			const res = canMake(entry);
			if (!res || res.crafts < 1) return;
			const counts = res.req.map(r => r.count || 1);
			const maxCount = counts.length ? Math.max(...counts) : 0;
			const totalCount = counts.reduce((sum, c) => sum + c, 0);
			candidates.push({
				kind,
				entry,
				req: res.req,
				crafts: res.crafts,
				priority: {
					maxCount,
					totalCount,
					crafts: res.crafts,
					typeRank,
					index,
				},
			});
		};
		INGREDIENTS.forEach((entry, idx) => evaluateEntry(entry, 'ingredient', idx, 0));
		RECIPES.forEach((entry, idx) => evaluateEntry(entry, 'recipe', idx, 1));
		if (!candidates.length) return null;
		const best = candidates.reduce((currentBest, candidate) => {
			if (!currentBest) return candidate;
			const a = candidate.priority;
			const b = currentBest.priority;
			if (a.maxCount !== b.maxCount) return (a.maxCount > b.maxCount) ? candidate : currentBest;
			if (a.totalCount !== b.totalCount) return (a.totalCount > b.totalCount) ? candidate : currentBest;
			if (a.crafts !== b.crafts) return (a.crafts > b.crafts) ? candidate : currentBest;
			if (a.typeRank !== b.typeRank) return (a.typeRank < b.typeRank) ? candidate : currentBest;
			return (a.index < b.index) ? candidate : currentBest;
		}, null);
		return best ? { kind: best.kind, entry: best.entry, req: best.req, crafts: best.crafts } : null;
	};

	
	const updateCraftPreviewForSection = (sectionName) => {
		const centerMeta = buttonsMeta.find(m => m.section === sectionName && m.position === 'center');
		if (!centerMeta) return;
		const btn = centerMeta.el;
		btn.innerHTML = '';
		const cand = findCraftCandidate(sectionName);
		centerMeta._craftCandidate = cand;
		if (!cand) return;
		const key = toFoodKey(cand.entry.name||'');
		const img = document.createElement('img');
		img.alt = key; img.draggable=false; img.decoding='async'; img.loading='lazy';
		img.src = resolve(`icons/farm/food/${key}.png`);
		img.onerror = function(){ this.src = resolve('icons/error.png'); };
		Object.assign(img.style, { width:'100%', height:'100%', objectFit:'cover', opacity:'0.5', pointerEvents:'none' });
		btn.appendChild(img);
	};

	
	// Remove the exact stacks used in the last craft so the UI stays in sync
	const consumeIngredientsFor = (sectionName, req) => {
		const need = {};
		req.forEach(r => { need[r.key] = (need[r.key]||0) + (r.count||1); });
		const touched = new Set();
		buttonsMeta.forEach(m => {
			if (m.section !== sectionName || m.position === 'center') return;
			const slot = cookSlotsCache[m.key];
			if (!slot) return;
			let remain = need[slot.item] || 0;
			if (remain <= 0) return;
			const take = Math.min(slot.count, remain);
			if (take > 0) {
				slot.count -= take;
				need[slot.item] -= take;
				touched.add(m.key);
				if (slot.count <= 0) delete cookSlotsCache[m.key];
			}
		});
		saveCookSlots();
		buttonsMeta.forEach(m => { if (touched.has(m.key)) renderCookButton(m); });
		updateCraftPreviewForSection(sectionName);
	};

	
	const handleCraftClick = (sectionName) => {
		const centerMeta = buttonsMeta.find(m => m.section === sectionName && m.position === 'center');
		if (!centerMeta || !centerMeta._craftCandidate) return;
		const cand = centerMeta._craftCandidate;
		const productKey = toFoodKey(cand.entry.name||'');
		const interact = window.fjTweakerModules?.farminteract;
		if (!interact) return;
		const hasSel = interact.hasSelection?.();
		const sel = interact.getSelected?.();
		if (hasSel) {
			if (sel && sel.type === 'inventory-item' && sel.item === productKey) {
				if (cand.crafts >= 1) {
					consumeIngredientsFor(sectionName, cand.req);
					sel.count += 1;
					window.fjTweakerModules?.farminteract?.refreshCursorBadge?.();
				}
			}
			return;
		}
		consumeIngredientsFor(sectionName, cand.req);
		
		try { window.fjFarm?.state?.markSeenItem?.(productKey); } catch(_) {}
		try { window.fjFarm?.state?.markCraftedEntry?.(productKey); } catch(_) {}
		
		try {
			const k = String(sectionName||'').toLowerCase();
			if (k.includes('mixing')) window.fjFarm?.audio?.play?.('bowl');
			else if (k.includes('stove')) window.fjFarm?.audio?.play?.('stove');
			else if (k.includes('oven')) window.fjFarm?.audio?.play?.('oven');
		} catch(_) {}
	const selection = { key: productKey, item: productKey, count: 1, itemType: 'food', type: 'inventory-item', icon: `icons/farm/food/${productKey}.png` };
		interact.selectItem?.(selection, null);
	};

	// Render one ingredient/recipe row inside the recipe book modal
	const buildListEntry = (entry, isRecipeEntry = false) => {
		const wrap = document.createElement('div');
		Object.assign(wrap.style, { padding:'2px 0', position:'relative' });
		
		const card = document.createElement('div');
		Object.assign(card.style, { position:'relative', borderRadius:'6px' });
		wrap.appendChild(card);
		
		const content = document.createElement('div');
		card.appendChild(content);
		
		const rowTop = document.createElement('div');
		Object.assign(rowTop.style, { display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'6px' });
		const titleImg = document.createElement('img');
		titleImg.alt = entry.name || '';
		titleImg.decoding='async'; titleImg.loading='lazy'; titleImg.draggable=false;
		const entryKey = toFoodKey(entry.name || '');
		const hasCrafted = !!window.fjFarm?.state?.hasCraftedEntry?.(entryKey);
		try { dlog('renderEntry', { name: entry.name, key: entryKey, isRecipeEntry, hasCrafted, maskTitle: (!hasCrafted) }); } catch(_) {}
		titleImg.src = hasCrafted ? resolve(`icons/farm/food/${entryKey}.png`) : resolve('icons/farm/unknown.png');
		titleImg.onerror=function(){ this.src = resolve('icons/error.png'); };
		Object.assign(titleImg.style, { width:'22px', height:'22px', objectFit:'contain' });
		const title = document.createElement('div');
		title.textContent = hasCrafted ? (entry.name || '') : '???';
		Object.assign(title.style, { fontWeight:'700', color:'#e0e0e0' });
		rowTop.append(titleImg, title);
		content.appendChild(rowTop);
		
		let hasSeenAll = true;
		if (Array.isArray(entry.ing) && entry.ing.length) {
			const row = document.createElement('div');
			Object.assign(row.style, { display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:'6px', marginTop:'4px', textAlign:'center', padding:'0 6px 6px 6px' });
			
			const toks=[];
			entry.ing.forEach(tok => {
				if (typeof tok === 'string' && tok.includes(',')) {
					tok.split(',').forEach(p=>{ const v=p.trim(); if (v) toks.push(v); });
				} else if (tok) {
					toks.push(String(tok).trim());
				}
			});
			toks.forEach(tok => {
				const { key, count } = parseIngToken(tok);
				const chip = document.createElement('div');
				Object.assign(chip.style, { display:'flex', alignItems:'center', gap:'4px' });
				const i = document.createElement('img');
				i.alt = key; i.decoding='async'; i.loading='lazy'; i.draggable=false;
				const keyNorm = toFoodKey(key);
				const seen = !!window.fjFarm?.state?.hasSeenItem?.(keyNorm);
				if (!seen) hasSeenAll = false;
				try { dlog('entry.ing', { entry: entryKey, token: keyNorm, seen }); } catch(_) {}
				i.src = seen ? resolve(`icons/farm/food/${keyNorm}.png`) : resolve('icons/farm/unknown.png');
				i.onerror=function(){ this.src = resolve('icons/error.png'); };
				Object.assign(i.style, { width:'22px', height:'22px', objectFit:'contain' });
				if (seen) {
					i.addEventListener('mouseenter', () => {
						const tip = getTooltipDataForTokenKey(key);
						try { window.fjfeFarmTT?.show?.(tip); } catch(_) {}
					});
					i.addEventListener('mouseleave', () => { try { window.fjfeFarmTT?.hide?.(); } catch(_) {} });
				}
				const c = document.createElement('span');
				c.textContent = `x${count}`;
				Object.assign(c.style, { color:'#bbb', fontWeight:'700', fontSize:'12px' });
				chip.append(i,c);
				row.appendChild(chip);
			});
			content.appendChild(row);
		}

		
		if (entry.cook) {
			const map = { mb: 'Mixing Bowl', st: 'Stovetop', ov: 'Oven' };
			const key = String(entry.cook).trim().toLowerCase();
			const label = map[key];
			if (label) {
				const hint = document.createElement('div');
				hint.textContent = label;
				Object.assign(hint.style, { textAlign:'center', marginTop:'4px', fontSize:'12px', color:'#cfcfcf', fontWeight:'600' });
				content.appendChild(hint);
			}
		}
		
		wrap.appendChild(makeDivider());
		
		const showEntryTooltip = () => {
			try {
				const kind = (recipeTab === 'recipes') ? 'recipe' : 'ingredient';
				const toks = flattenTokens(entry.ing);
				const price = window.fjFarm?.pricing?.getPriceForItem?.(entry.name, kind, { tokens: toks }) || 0;
				const data = {
					imageSrc: resolve(`icons/farm/food/${toFoodKey(entry.name||'')}.png`),
					name: entry.name || '',
					bodyTT: entry.desc || '',
					cost: String(price),
					costIcon: 'icons/farm/coin.png'
				};
				window.fjfeFarmTT?.show?.(data);
			} catch(_) {}
		};
		if (hasCrafted) {
			rowTop.addEventListener('mouseenter', showEntryTooltip);
			rowTop.addEventListener('mouseleave', () => { try { window.fjfeFarmTT?.hide?.(); } catch(_) {} });
		}
		
		if (!hasSeenAll) {
			Object.assign(card.style, { background:'#2a1111', border:'1px solid #a33' });
			Object.assign(content.style, { opacity:'0.5' });
			const overlay = document.createElement('img');
			overlay.alt='?'; overlay.decoding='async'; overlay.loading='lazy'; overlay.draggable=false;
			overlay.src = resolve('icons/farm/unknown.png');
			overlay.onerror=function(){ this.src = resolve('icons/error.png'); };
			Object.assign(overlay.style,{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', width:'40px', height:'40px', opacity:'1', pointerEvents:'none' });
			card.appendChild(overlay);
		}
		return wrap;
	};

	// Swap between ingredient and recipe tabs without rebuilding the book wrapper
	const renderRecipeList = (type, contentEl) => {
		contentEl.textContent = '';
		const list = type === 'recipes' ? RECIPES : INGREDIENTS;
		const isRecipe = type === 'recipes';
		try { dlog('renderRecipeList', { type, isRecipe, count: list.length }); } catch(_) {}
		list.forEach(entry => { contentEl.appendChild(buildListEntry(entry, isRecipe)); });
	};

	// Build the floating recipe book panel and keep scroll/tab state between opens
	const openRecipePanel = (buttonToReplace, pos) => {
		if (recipePanelEl) return;
		dumpRecipeDebugSnapshot('openRecipePanel');
	    
	    
		try {
			recipePanelEl = document.createElement('div');
			recipePanelEl.id = 'fj-farmrecipes';
			Object.assign(recipePanelEl.style, {
				position: 'absolute',
				width: BOX_WIDTH+'px',
				background: '#151515',
				border: '1px solid #333',
				borderRadius: '8px',
				boxShadow: '0 8px 24px #0009',
				overflow: 'hidden',
				display: 'block',
				minHeight: '120px',
				zIndex: 9999,
				pointerEvents: 'auto'
			});
		} catch(errInit) {}
		
		const host = root?.parentNode || document.body;
		host.appendChild(recipePanelEl);

		
		try {
			
			const top = document.createElement('div');
			Object.assign(top.style, { display:'flex', alignItems:'center', gap:'8px', padding:'6px', borderBottom:'1px solid #2a2a2a' });
			const btnIng = document.createElement('button');
			btnIng.type='button'; btnIng.textContent='Ingredients';
			const btnRec = document.createElement('button');
			btnRec.type='button'; btnRec.textContent='Recipes';
			const styleTab=(el,active)=>{
				Object.assign(el.style, { flex:'1', padding:'6px', background: active?'#202020':'#111', color:'#ddd', border:'1px solid #2a2a2a', borderRadius:'4px', cursor:'pointer', fontWeight: active?'700':'600' });
			};
			styleTab(btnIng,true); styleTab(btnRec,false);
			recipePanelEl.appendChild(top);
			top.appendChild(btnIng);
			top.appendChild(btnRec);
			
			const content = document.createElement('div');
			const maxH = (3*BTN) + (2*GAP) + 24; 
			Object.assign(content.style, { maxHeight: maxH+'px', overflowY:'auto', padding:'6px' });
			recipePanelEl.appendChild(content);
			recipeContentEl = content;
			
			const syncTabs = () => { styleTab(btnIng, recipeTab==='ingredients'); styleTab(btnRec, recipeTab==='recipes'); };
			syncTabs();
			try { renderRecipeList(recipeTab, content); } catch(errList) { content.textContent = 'Loading…'; }
			
			try { content.scrollTop = recipeScrollTops[recipeTab] || 0; } catch(_) {}
			
			btnIng.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); try{dlog('tab switch','ingredients');}catch(_){} recipeScrollTops[recipeTab] = content.scrollTop; recipeTab='ingredients'; syncTabs(); try { renderRecipeList('ingredients', content); } catch(_) {} try { content.scrollTop = recipeScrollTops['ingredients']||0; } catch(_) {} dumpRecipeDebugSnapshot('tab(ingredients)'); });
			btnRec.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); try{dlog('tab switch','recipes');}catch(_){} recipeScrollTops[recipeTab] = content.scrollTop; recipeTab='recipes'; syncTabs(); try { renderRecipeList('recipes', content); } catch(_) {} try { content.scrollTop = recipeScrollTops['recipes']||0; } catch(_) {} dumpRecipeDebugSnapshot('tab(recipes)'); });
		} catch(errBuild) {
			try {
				const fallback = document.createElement('div');
				Object.assign(fallback.style, { padding:'8px', color:'#ddd' });
				fallback.textContent = 'Recipe Book';
				recipePanelEl.appendChild(fallback);
				
				const mini = document.createElement('div');
				Object.assign(mini.style, { padding:'6px', color:'#bbb', fontSize:'12px' });
				const list = document.createElement('ul');
				Object.assign(list.style, { margin:'6px 0', paddingLeft:'16px' });
				try {
					(INGREDIENTS || []).slice(0, 8).forEach(e => { const li = document.createElement('li'); li.textContent = e?.name || ''; list.appendChild(li); });
				} catch(_) {}
				mini.appendChild(list);
				recipePanelEl.appendChild(mini);
			} catch(_) {}
		}
		
		try {
			if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
				recipePanelEl.style.left = pos.left + 'px';
				recipePanelEl.style.top = pos.top + 'px';
			} else {
				const cookRect = root.getBoundingClientRect();
				const left = Math.round((cookRect.width || 0) + 12);
				recipePanelEl.style.left = left + 'px';
				recipePanelEl.style.top = '0px';
			}
		} catch(_) {
		    
		    recipePanelEl.style.position = 'relative';
		    recipePanelEl.style.marginTop = '8px';
		    root.appendChild(recipePanelEl);
	    }
		
		try {
			const r = recipePanelEl.getBoundingClientRect();
			if (!r || r.width < 20 || r.height < 20) {
				const left = Math.round((root.getBoundingClientRect().width || 0) + 12);
				recipePanelEl.style.left = left + 'px';
				recipePanelEl.style.top = '0px';
				recipePanelEl.style.display = 'block';
				const contentH = Math.max(120, recipePanelEl.scrollHeight || 0);
				recipePanelEl.style.height = contentH + 'px';
			}
		} catch(err) { }

		
		try {
			requestAnimationFrame(() => {
				try {
					const rr = recipePanelEl?.getBoundingClientRect?.();
					if (!recipePanelEl) return;
					if (!rr || rr.width < 20 || rr.height < 20) {
						const left = Math.round((root.getBoundingClientRect().width || 0) + 12);
						recipePanelEl.style.left = left + 'px';
						recipePanelEl.style.top = '0px';
						recipePanelEl.style.display = 'block';
						const contentH2 = Math.max(120, recipePanelEl.scrollHeight || 0);
						recipePanelEl.style.height = contentH2 + 'px';
					}
				} catch(e) { }
			});
		} catch(_) {}
	};

	const closeRecipePanel = () => {
		try { if (recipePanelEl && recipeContentEl) { recipeScrollTops[recipeTab] = recipeContentEl.scrollTop; } } catch(_) {}
		if (recipePanelEl) { recipePanelEl.remove(); recipePanelEl = null; }
		
	};

	const open=(host)=>{
		if(isOpen||!host) return;
		dumpRecipeDebugSnapshot('page-load/open-cook');
		root=document.createElement('div'); root.id='fj-farmcook';
		Object.assign(root.style,{
			position:'absolute',left:'0',top:'0',height:'auto',background:'transparent',color:'#ddd',overflow:'visible',
			transform:'translateX(-12px)',opacity:'0',transition:'transform 160ms cubic-bezier(.2,.9,.2,1), opacity 140ms ease'
		});
		loadCookSlots();
		buildUI(); host.appendChild(root);
		
		try { window.fjFarm?.ui?.lockSubmenuToOverlay?.(); } catch(_) {}

		
		try {
			const inv = window.fjTweakerModules?.farminv;
			if (inv) {
				const wasOpen = !!inv.isOpen?.();
				if (!wasOpen) {
					inv.open?.(host);
				}
				const invRoot = document.getElementById('fj-farminv');
				if (invRoot) {
					const GAP = 12;
					const cookW = Math.max(0, root.getBoundingClientRect().width || 0);
					Object.assign(invRoot.style, {
						position: 'absolute',
						left: (cookW + GAP) + 'px',
						top: '0px'
					});
					
					if (!wasOpen) invRoot.dataset.pairedWithCooking = '1';
				}
			}
		} catch(_) {}
		requestAnimationFrame(()=>{ root.style.transform='translateX(0)'; root.style.opacity='1'; });
		isOpen=true;
	};

	const close=(opts)=>{
		const preserveInventory = !!(opts && opts.preserveInventory);
		if(!isOpen||!root) return;
		try{
			
			recipeTab = 'ingredients';
			recipeScrollTops = { ingredients: 0, recipes: 0 };
			
			if (recipeReplacingInventory) { try { closeRecipePanel(); } catch(_) {} recipeReplacingInventory = false; }
			root.style.transform='translateX(-12px)'; root.style.opacity='0';
			setTimeout(()=>{ root?.remove(); root=null; },180);
			
			if (!preserveInventory) {
				try {
					const inv = window.fjTweakerModules?.farminv;
					const invRoot = document.getElementById('fj-farminv');
					if (inv && invRoot) {
						inv.close?.();
						if (invRoot.dataset.pairedWithCooking) delete invRoot.dataset.pairedWithCooking;
					}
				} catch(_) {}
			} else {
				
				try {
					const invRoot = document.getElementById('fj-farminv');
					if (invRoot && invRoot.dataset.pairedWithCooking) delete invRoot.dataset.pairedWithCooking;
				} catch(_) {}
			}
		} finally { isOpen=false; }
		
		try { window.fjFarm?.ui?.unlockSubmenu?.(); } catch(_) {}
	};

	const init=()=>{};
	window.fjTweakerModules=window.fjTweakerModules||{};
	window.fjTweakerModules[MODULE_KEY]={ init, open, close, isOpen:()=>isOpen, getButtons:()=>buttonsMeta.slice(), INGREDIENTS: ()=> INGREDIENTS.slice(), RECIPES: ()=> RECIPES.slice() };
})();
