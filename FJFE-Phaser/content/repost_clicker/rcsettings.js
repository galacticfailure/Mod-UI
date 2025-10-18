(function(){
  const state = {
    anchorEl: null,
    openMenu: null,
    allMenus: [],
  };

  function closeMenu(){
    const hadAny = !!(state.allMenus && state.allMenus.length);
    state.allMenus.forEach(menu => {
      try {
        if(!menu._closing){
          menu._closing=true; menu.style.transition='none'; void menu.offsetWidth;
          requestAnimationFrame(()=>{
            menu.style.transition='transform 0.22s cubic-bezier(.5,1.7,.5,1), opacity 0.18s cubic-bezier(.5,1.7,.5,1)';
            menu.style.transform='translateY(-100%)'; menu.style.opacity='0'; menu.style.zIndex=2147483642;
            setTimeout(()=>{ if(menu.parentNode) menu.parentNode.removeChild(menu); },220);
          });
        } else {
          if(menu.parentNode) menu.parentNode.removeChild(menu);
        }
      } catch(_) {}
    });
    state.allMenus = [];
    state.openMenu = null;
    try {
      const now = Date.now();
      const until = window.__fjfe_suppressCloseUntil || 0;
      if (hadAny && !(now < until) && window.fjfeAudio) window.fjfeAudio.play('menu_close');
    } catch(_) {}
  }

  function updatePosition() {
    const { anchorEl, allMenus } = state;
    if (!anchorEl || !allMenus.length) return;
    const rect = anchorEl.getBoundingClientRect();
    const vx = (window.scrollX || window.pageXOffset || 0);
    const vy = (window.scrollY || window.pageYOffset || 0);
    allMenus.forEach(menu => {
      menu.style.left = (rect.left + vx) + 'px';
      menu.style.top = (rect.bottom + vy) + 'px';
      menu.style.width = (rect.right - rect.left - 2) + 'px';
      menu.style.minWidth = (rect.right - rect.left - 2) + 'px';
    });
  }

  function buildIconButton(imgPath, label, opts = {}){
    const btn = document.createElement('div');
    Object.assign(btn.style, {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: '60%',
      height: '24px',
      gap: '6px',
      padding: '4px 6px',
      cursor: 'pointer',
      userSelect: 'none',
      color: '#fff',
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '4px',
    });

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL ? chrome.runtime.getURL(imgPath) : imgPath;
    img.onerror = () => { const fb = 'icons/error.png'; img.src = chrome.runtime.getURL ? chrome.runtime.getURL(fb) : fb; };
  Object.assign(img.style, { width:'20px', height:'20px', objectFit: 'contain', flex:'0 0 auto' });
    btn.appendChild(img);

    
    const textCol = document.createElement('div');
    Object.assign(textCol.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'center',
      gap: '0px',
      flex: '1 1 auto',
      minWidth: 0,
    });
    const title = document.createElement('div');
    title.textContent = label;
    Object.assign(title.style, { fontWeight:'800', fontSize:'12px', letterSpacing:'0.02em' });
    textCol.appendChild(title);
  
  btn._titleEl = title;
    btn.appendChild(textCol);

    if (typeof opts.onClick === 'function') btn.addEventListener('click', opts.onClick);

    return btn;
  }

  function actuallyOpenMenu(){
    const anchorEl = state.anchorEl; if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const vx = (window.scrollX || window.pageXOffset || 0);
    const vy = (window.scrollY || window.pageYOffset || 0);
    const menu = document.createElement('div');
    Object.assign(menu.style, {
      position: 'absolute', left: (rect.left + vx) + 'px', top: (rect.bottom + vy) + 'px',
      width: (rect.right - rect.left - 2) + 'px', minWidth: (rect.right - rect.left - 2) + 'px',
      height: '246px', background: '#181818', border: '1.5px solid #333', borderRadius: '0 0 10px 10px',
      boxSizing: 'border-box', boxShadow: '0 8px 24px #0007', zIndex: 2147483642, display: 'flex', flexDirection:'column',
      alignItems:'stretch', justifyContent: 'flex-start', padding: '0', color:'#fff', pointerEvents:'auto', overflow:'hidden',
      transform: 'translateY(-12px)', opacity: 0, transition: 'transform 0.22s ease, opacity 0.18s ease',
    });

  const list = document.createElement('div');
  Object.assign(list.style, { display:'flex', flexDirection:'column', overflowY:'auto', gap:'6px', width:'100%', height:'100%', padding:'8px', alignItems:'flex-start' });

  
  
  (function addMuteRow(){
    const row = document.createElement('label');
    Object.assign(row.style, { display:'flex', alignItems:'center', gap:'8px', color:'#fff', fontSize:'12px', padding:'4px 2px', userSelect:'none' });
    const cb = document.createElement('input'); cb.type = 'checkbox';
    try { cb.checked = !!(window.fjfeAudio && window.fjfeAudio.isMuted && window.fjfeAudio.isMuted()); } catch(_) {}
    cb.addEventListener('change', ()=>{
      try { if (window.fjfeAudio) window.fjfeAudio.setMuted(!!cb.checked); } catch(_) {}
    });
    const span = document.createElement('span'); span.textContent = 'Mute all clicker sounds';
    row.appendChild(cb); row.appendChild(span);
    list.appendChild(row);
  })();

  const spacer = document.createElement('div');
  spacer.style.flex = '1 1 auto';
  list.appendChild(spacer);

  
    let banConfirmPending = false;
    const banEvade = buildIconButton('icons/clicker/prestige.png', 'Ban Evade', {
      onClick: () => {
        if (!banConfirmPending) {
          banConfirmPending = true;
          try { if (banEvade._titleEl) banEvade._titleEl.textContent = 'Really?'; } catch(_) {}
        } else {
          
          banConfirmPending = false;
          try { if (banEvade._titleEl) banEvade._titleEl.textContent = 'Ban Evade'; } catch(_) {}
          try {
            
            let potprest = 0;
            try {
              if (window.fjfeStats && typeof window.fjfeStats.computePrestigeProgress === 'function') {
                const res = window.fjfeStats.computePrestigeProgress();
                potprest = (res && typeof res.potprest === 'number') ? res.potprest : 0;
              }
            } catch(_) {}
            const timesPrestiged = parseInt(localStorage.getItem('fjfeStats_timesPrestiged')||'0',10) || 0;
            const bonusPct = parseInt(localStorage.getItem('fjfeStats_prestigeBonusPct')||'0',10) || 0;
            
            const newTimes = (Number.isFinite(timesPrestiged) ? timesPrestiged : 0) + 1;
            localStorage.setItem('fjfeStats_timesPrestiged', String(newTimes));
            
            const newBonus = Math.max(0, (Number.isFinite(bonusPct)?bonusPct:0) + Math.max(0, Math.floor(potprest)));
            try { if (window.fjfeStats && typeof window.fjfeStats.setPrestigeBonusPercent==='function') window.fjfeStats.setPrestigeBonusPercent(newBonus); } catch(_) {}
            
            try { if (window.fjfeStats && typeof window.fjfeStats.prestigeReset==='function') window.fjfeStats.prestigeReset(); } catch(_) {}
          } catch(_) {}
          try { if (window.fjfeAudio) window.fjfeAudio.play('prestige'); } catch(_) {}
          try { closeMenu(); } catch(_) {}
        }
      }
    });
    
    banEvade.addEventListener('mouseenter', () => {
      try {
        if (!window.fjfeRcInfo) return;
        const imgEl = banEvade.querySelector('img');
        const imageSrc = imgEl && imgEl.src ? imgEl.src : '';
        const tools = window.fjfeClickerNumbers;
        const fmt = (n)=> tools && tools.formatCounter ? tools.formatCounter(n) : String(n);
        let potprest = 0;
        let prestremainStr = '0';
        try {
          if (window.fjfeStats && typeof window.fjfeStats.computePrestigeProgress === 'function') {
            const res = window.fjfeStats.computePrestigeProgress();
            potprest = (res && typeof res.potprest === 'number') ? res.potprest : 0;
            prestremainStr = (res && res.prestremainStr) ? String(res.prestremainStr) : String(res && res.prestremain ? res.prestremain : '0');
          }
        } catch(_) {}
        const bonusPct = parseInt(localStorage.getItem('fjfeStats_prestigeBonusPct')||'0',10) || 0;
        const line1 = `Current prestige bonus: +${Math.max(0, bonusPct)}%`;
        const line2 = potprest>0 ? `Prestiging now would grant you a +${potprest}% bonus to your RPS.` : 'Prestiging now would grant you no bonus.';
        const line3 = `${prestremainStr} thumbs until next prestige.`;
        window.fjfeRcInfo.show({
          imageSrc,
          name: 'Ban Evade',
          hideCost: true,
          bodyMid: `${line1}\n${line2}\n${line3}`
        });
      } catch(_) {}
    });
    banEvade.addEventListener('mouseleave', () => { try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch(_) {} });
  list.appendChild(banEvade);

  
    let confirmPending = false;
    const resetBtn = buildIconButton('icons/clicker/nuke.png', 'Full Reset', {
      onClick: () => {
        if (!confirmPending) {
          confirmPending = true;
          
          try { if (resetBtn._titleEl) resetBtn._titleEl.textContent = 'Really?'; } catch(_) {}
        } else {
          confirmPending = false;
          try { if (resetBtn._titleEl) resetBtn._titleEl.textContent = 'Full Reset'; } catch(_) {}
          try { if (window.fjfeRcDebug && typeof window.fjfeRcDebug.resetMoney === 'function') window.fjfeRcDebug.resetMoney(); } catch(_) {}
          try { if (window.fjfeStats && typeof window.fjfeStats.reset === 'function') window.fjfeStats.reset(); } catch(_) {}
          
          try { localStorage.setItem('fjfeDebugEnabled','0'); } catch(_) {}
          try { if (window.fjfeRcDebug && typeof window.fjfeRcDebug.cleanup === 'function') window.fjfeRcDebug.cleanup(); } catch(_) {}
          try { closeMenu(); } catch(_) {}
        }
      }
    });
    
    resetBtn.addEventListener('mouseenter', () => {
      try {
        if (!window.fjfeRcInfo) return;
        const imgEl = resetBtn.querySelector('img');
        const imageSrc = imgEl && imgEl.src ? imgEl.src : '';
        window.fjfeRcInfo.show({
          imageSrc,
          name: 'Full Reset',
          hideCost: true,
          bodyTop: 'A complete wipe. No prestige, no bonuses, this will start you from scratch.'
        });
      } catch(_) {}
    });
    resetBtn.addEventListener('mouseleave', () => { try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch(_) {} });
  list.appendChild(resetBtn);

    menu.appendChild(list);
    document.body.appendChild(menu);

    
    setTimeout(() => { menu.style.transform = 'translateY(0)'; menu.style.opacity = '1'; setTimeout(()=>{
      menu.style.transition = 'transform 0.22s cubic-bezier(.5,1.7,.5,1), opacity 0.18s cubic-bezier(.5,1.7,.5,1)';
    }, 220); }, 10);
    try { if (window.fjfeAudio) window.fjfeAudio.play('menu_open'); } catch(_) {}

    
  const resetConfirm = () => { try { if (resetBtn._titleEl) resetBtn._titleEl.textContent = 'Full Reset'; } catch(_) {} confirmPending=false; try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch(_) {} };
    const obs = new MutationObserver(() => {
      if (!document.body.contains(menu)) { try { obs.disconnect(); } catch(_) {}
        resetConfirm();
        
        try { if (banEvade && banEvade._titleEl) banEvade._titleEl.textContent = 'Ban Evade'; } catch(_) {}
        banConfirmPending = false;
        try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch(_) {}
      }
    });
    try { obs.observe(document.body, { childList:true, subtree:true }); } catch(_) {}

    state.openMenu = menu; state.allMenus.push(menu);
  }

  function toggleMenu(){
    if (state.openMenu) { closeMenu(); return; }
    try { if (window.fjfeAudio && window.fjfeAudio.suppressClose) window.fjfeAudio.suppressClose(300); } catch(_) {}
    try { if (window.fjfeRcProd) window.fjfeRcProd.closeMenu(); } catch(_) {}
    try { if (window.fjfeRcStats) window.fjfeRcStats.closeMenu(); } catch(_) {}
    actuallyOpenMenu();
  }

  function init(opts){ state.anchorEl = opts && opts.anchorEl ? opts.anchorEl : null; }

  function addSettingsButton(host){
    
    const btn = document.createElement('button');
    Object.assign(btn.style, {
      position: 'absolute',
  left: '8px',
  top: '28px',
      width: '22px',
      height: '22px',
      padding: '0',
      margin: '0',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      zIndex: 4,
    });
    const img = document.createElement('img');
  const path = 'icons/clicker/settings.png';
    img.src = chrome.runtime.getURL ? chrome.runtime.getURL(path) : path;
  img.onerror = () => { const fb='icons/clicker/settings.png'; img.src = chrome.runtime.getURL ? chrome.runtime.getURL(fb) : fb; };
    Object.assign(img.style, { width:'100%', height:'100%', objectFit:'contain', display:'block' });
    btn.appendChild(img);
    btn.addEventListener('click', (e)=>{ e.preventDefault(); try { if (window.fjfeRcSettings) { window.fjfeRcSettings.init({ anchorEl: host }); window.fjfeRcSettings.toggleMenu(); } } catch(_){} });
    return btn;
  }

  window.fjfeRcSettings = { init, toggleMenu, closeMenu, updatePosition, addSettingsButton, isOpen: function(){ return !!state.openMenu; } };

  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition);
})();
