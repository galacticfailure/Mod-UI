(() => {
	const MODULE_KEY='farmset';
	let root=null,isOpen=false;

	const resolve=(p)=> (typeof chrome!=='undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p;

	const buildUI=()=>{
		root.textContent='';
		const box=document.createElement('div');
		Object.assign(box.style,{
			position:'relative',background:'#151515',color:'#ddd',
			border:'1px solid #333',borderRadius:'8px',boxShadow:'0 8px 24px #0009',
			padding:'10px',boxSizing:'border-box'
		});
		
		const BTN=60, PAD=10, GAP=10; const width=(BTN)+(PAD*2);
		box.style.width=width+'px';
		root.style.width=width+'px';

		const row=document.createElement('div');
		Object.assign(row.style,{ display:'flex', flexDirection:'column', gap:'12px' });

		
		const nukeBtn=document.createElement('button');
		nukeBtn.type='button';
		Object.assign(nukeBtn.style,{
			width:BTN+'px',height:BTN+'px',display:'flex',alignItems:'center',justifyContent:'center',
			background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:'6px',cursor:'pointer',padding:'0',margin:'0',
			boxShadow:'inset 0 0 0 1px #0008',
		});
		nukeBtn.addEventListener('click', (e) => {
			e.preventDefault(); e.stopPropagation();
			
			nukeBtn.style.transform = 'scale(0.9)';
			nukeBtn.style.transition = 'transform 0.1s ease';
			setTimeout(() => {
				nukeBtn.style.transform = 'scale(1.05)';
				setTimeout(() => {
					nukeBtn.style.transform = 'scale(1)';
				}, 60);
			}, 100);
			
			
			try {
				if (window.fjFarm?.debug?.resetFarm) {
					window.fjFarm.debug.resetFarm();
				}
			} catch(_) {}
		});
		const img=document.createElement('img');
		img.alt='nuke'; img.draggable=false; img.decoding='async'; img.loading='lazy';
		img.src=resolve('icons/farm/nuke.png'); img.onerror=function(){ this.src=resolve('icons/error.png'); };
		Object.assign(img.style,{ width:'100%', height:'100%', objectFit:'cover' });
		nukeBtn.appendChild(img);

		
		const muteWrap=document.createElement('label');
		Object.assign(muteWrap.style,{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', userSelect:'none' });
		const muteCb=document.createElement('input');
		muteCb.type='checkbox'; muteCb.disabled=false;
		
		try { muteCb.checked = !!window.fjFarm?.audio?.isMuted?.(); } catch(_) {}
		muteCb.addEventListener('change', (e) => {
			
			muteWrap.style.transform = 'scale(0.95)';
			muteWrap.style.transition = 'transform 0.1s ease';
			setTimeout(() => {
				muteWrap.style.transform = 'scale(1.02)';
				setTimeout(() => {
					muteWrap.style.transform = 'scale(1)';
				}, 60);
			}, 100);
			
			try { window.fjFarm?.audio?.setMuted?.(!!muteCb.checked); } catch(_) {}
		});
		const muteText=document.createElement('span');
		muteText.textContent='Mute all sounds';

		muteWrap.append(muteCb, muteText);
		row.append(nukeBtn, muteWrap);
		box.appendChild(row);
		root.appendChild(box);
	};

	const open=(host)=>{
		if(isOpen||!host) return;
		root=document.createElement('div'); root.id='fj-farmset';
		Object.assign(root.style,{
			position:'absolute',left:'0',top:'0',height:'auto',background:'transparent',color:'#ddd',overflow:'visible',
			transform:'translateX(-12px)',opacity:'0',transition:'transform 160ms cubic-bezier(.2,.9,.2,1), opacity 140ms ease'
		});
		buildUI(); host.appendChild(root);
		
		try { window.fjFarm?.ui?.lockSubmenuToOverlay?.(); } catch(_) {}
		requestAnimationFrame(()=>{ root.style.transform='translateX(0)'; root.style.opacity='1'; });
		isOpen=true;
	};

	const close=()=>{
		if(!isOpen||!root) return;
		try{
			root.style.transform='translateX(-12px)'; root.style.opacity='0';
			setTimeout(()=>{ root?.remove(); root=null; },180);
		} finally { isOpen=false; }
		
		try { window.fjFarm?.ui?.unlockSubmenu?.(); } catch(_) {}
	};

	const init=()=>{};
	window.fjTweakerModules=window.fjTweakerModules||{};
	window.fjTweakerModules[MODULE_KEY]={ init, open, close, isOpen:()=>isOpen };
})();
