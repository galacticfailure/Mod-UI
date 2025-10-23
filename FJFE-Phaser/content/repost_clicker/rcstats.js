(function(){
  const state = { anchorEl: null, openMenu: null, allMenus: [] };
  let purchasedGridEl = null;

  
  const K = {
    TIMES_CLICKED: 'fjfeStats_timesClicked',
    THUMBS_PER_CLICK_LAST: 'fjfeStats_thumbsPerClickLast',
    THUMBS_FROM_CLICKING: 'fjfeStats_thumbsFromClicking',
    THUMBS_GENERATED_TOTAL: 'fjfeStats_thumbsGeneratedTotal',
    THUMBS_ALL_TIME: 'fjfeStats_thumbsAllTime',
    TIMES_PRESTIGED: 'fjfeStats_timesPrestiged',
    CLICK_BONUS_PCT: 'fjfeStats_clickBonusPct',
    PRESTIGE_BONUS_PCT: 'fjfeStats_prestigeBonusPct',
  };

  function loadInt(key, d=0) { try { const v = parseInt(localStorage.getItem(key), 10); return Number.isFinite(v) ? v : d; } catch(_) { return d; } }
  function setInt(key, v) { try { localStorage.setItem(key, String(Math.max(0, Math.floor(v||0)))); } catch(_) {} }

  
  function loadBigInt(key){
    try {
      const s = localStorage.getItem(key);
      if (!s) return 0n;
      if (s === 'Infinity') return 0n; 
      return BigInt(s);
    } catch(_) { return 0n; }
  }
  function setBigInt(key, bi){ try { localStorage.setItem(key, (bi < 0n ? 0n : bi).toString()); } catch(_) {} }

  
  function formatBigAbbrev(bi){
    try {
      if (typeof bi !== 'bigint') return formatCounter(Number(bi||0));
      const neg = bi < 0n ? '-' : '';
      let abs = bi < 0n ? -bi : bi;
      if (abs < 1000n) return neg + abs.toString();
      const units = [
        { power: 3, abb: 'K' },{ power: 6, abb: 'M' },{ power: 9, abb: 'B' },{ power: 12, abb: 'T' },
        { power: 15, abb: 'Qa' },{ power: 18, abb: 'Qi' },{ power: 21, abb: 'Sx' },{ power: 24, abb: 'Sp' },
        { power: 27, abb: 'Oc' },{ power: 30, abb: 'No' },{ power: 33, abb: 'De' },{ power: 36, abb: 'Ud' },
        { power: 39, abb: 'Dd' },{ power: 42, abb: 'Td' },{ power: 45, abb: 'Qd' },{ power: 48, abb: 'Qn' },
        { power: 51, abb: 'Sxd' },{ power: 54, abb: 'Spd' },{ power: 57, abb: 'Ocd' },{ power: 60, abb: 'Nod' },
        { power: 63, abb: 'Vg' },{ power: 66, abb: 'Uvg' },{ power: 69, abb: 'Dvg' },{ power: 72, abb: 'Trvg' },
        { power: 75, abb: 'Qavg' },{ power: 78, abb: 'Qivg' },{ power: 81, abb: 'Sxvg' },{ power: 84, abb: 'Spvg' },
        { power: 87, abb: 'Ocvg' },{ power: 90, abb: 'Novg' },{ power: 93, abb: 'Tg' },{ power: 96, abb: 'Utg' },
        { power: 99, abb: 'Dtg' },{ power: 102, abb: 'Ttrg' },{ power: 105, abb: 'Qtrg' },{ power: 108, abb: 'Qitg' },
        { power: 111, abb: 'Sxtg' },{ power: 114, abb: 'Sptg' },{ power: 117, abb: 'Octg' },{ power: 120, abb: 'Notg' },
        { power: 123, abb: 'Qg' },{ power: 126, abb: 'Uqg' },{ power: 129, abb: 'Dqg' },{ power: 132, abb: 'Tqg' },
        { power: 135, abb: 'Qaqg' },{ power: 138, abb: 'Qiqg' },{ power: 141, abb: 'Sxqg' },{ power: 144, abb: 'Spqg' },
        { power: 147, abb: 'Ocqg' },{ power: 150, abb: 'Noqg' },{ power: 153, abb: 'Qig' },{ power: 156, abb: 'Uqig' },
        { power: 159, abb: 'Dqig' },{ power: 162, abb: 'Tqig' },{ power: 165, abb: 'Qaqig' },{ power: 168, abb: 'Qiqig' },
        { power: 171, abb: 'Sxqig' },{ power: 174, abb: 'Spqig' },{ power: 177, abb: 'Ocqig' },{ power: 180, abb: 'Noqig' },
        { power: 183, abb: 'Sxg' },{ power: 186, abb: 'Usxg' },{ power: 189, abb: 'Dsxg' },{ power: 192, abb: 'Tsxg' },
        { power: 195, abb: 'Qsxg' },{ power: 198, abb: 'Qisxg' },{ power: 201, abb: 'Sxsxg' },{ power: 204, abb: 'Spsxg' },
        { power: 207, abb: 'Ocsxg' },{ power: 210, abb: 'Nosxg' },{ power: 213, abb: 'Spg' },{ power: 243, abb: 'Ocg' },
        { power: 273, abb: 'Nog' },{ power: 303, abb: 'C' }
      ];
      const s = abs.toString();
      const digits = s.length;
      let unit = units[0];
      for (let i = units.length - 1; i >= 0; i--) {
        if (digits > units[i].power) { unit = units[i]; break; }
      }
      const pow = BigInt(unit.power);
      
      let div = 1n; for (let i=0n;i<pow;i++) div *= 10n;
      const scaledTimesThousand = (abs * 1000n) / div;
      const intPart = scaledTimesThousand / 1000n;
      let frac = (scaledTimesThousand % 1000n).toString().padStart(3,'0');
      
      frac = frac.replace(/0+$/,'');
      const txt = frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
      return neg + txt + unit.abb;
    } catch(_) {
      try { return bi.toString(); } catch(__) { return '0'; }
    }
  }

  function formatCounter(n){ try { const t = window.fjfeClickerNumbers; return (t && t.formatCounter) ? t.formatCounter(n) : String(n); } catch(_) { return String(n); } }

  function closeMenu(){
    const hadAny = !!(state.allMenus && state.allMenus.length);
    state.allMenus.forEach(menu => {
      try {
        if(!menu._closing){ menu._closing=true; menu.style.transition='none'; void menu.offsetWidth; requestAnimationFrame(()=>{ menu.style.transition='transform 0.22s cubic-bezier(.5,1.7,.5,1), opacity 0.18s cubic-bezier(.5,1.7,.5,1)'; menu.style.transform='translateY(-100%)'; menu.style.opacity='0'; menu.style.zIndex=2147483642; setTimeout(()=>{ if(menu.parentNode) menu.parentNode.removeChild(menu); },220); }); }
        else { if(menu.parentNode) menu.parentNode.removeChild(menu); }
      } catch(_) {}
    });
    state.allMenus = []; state.openMenu = null;
    try {
      const now = Date.now();
      const until = window.__fjfe_suppressCloseUntil || 0;
      if (hadAny && !(now < until) && window.fjfeAudio) window.fjfeAudio.play('menu_close');
    } catch(_) {}
  }

  function updatePosition(){ const { anchorEl, allMenus } = state; if (!anchorEl || !allMenus.length) return; const rect = anchorEl.getBoundingClientRect(); const vx = (window.scrollX||window.pageXOffset||0); const vy=(window.scrollY||window.pageYOffset||0); allMenus.forEach(menu=>{ menu.style.left=(rect.left+vx)+'px'; menu.style.top=(rect.bottom+vy)+'px'; menu.style.width=(rect.right-rect.left-2)+'px'; menu.style.minWidth=(rect.right-rect.left-2)+'px'; }); }

  function statRow(label, value, opts={}){
    const row = document.createElement('div');
    Object.assign(row.style, { display:'flex', alignItems:'center', justifyContent:'flex-start', padding:'2px 6px', fontSize:'9.6px', color:'#ddd', gap:'6px', whiteSpace:'nowrap', userSelect:'none' });
    const name = document.createElement('div');
    name.textContent = label;
    Object.assign(name.style, { fontWeight:'800', color:'#fff' });
    const val = document.createElement('div');
    if (opts.thumb){
      const img = document.createElement('img');
      img.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/clicker/thumb.png') : 'icons/clicker/thumb.png';
  try { img.draggable = false; } catch(_) {}
  Object.assign(img.style, { width:'10px', height:'10px', verticalAlign:'middle', marginRight:'3px', filter:'drop-shadow(0 0 1px #0008)' });
      val.appendChild(img);
    }
    const span = document.createElement('span');
    span.textContent = value;
    val.appendChild(span);
    Object.assign(val.style, { fontWeight:'600', color:'#ddd', display:'flex', alignItems:'center' });
    row.appendChild(name); row.appendChild(val);
    return row;
  }

  function actuallyOpenMenu(){
    const anchorEl = state.anchorEl; if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const vx = (window.scrollX||window.pageXOffset||0);
    const vy = (window.scrollY||window.pageYOffset||0);
    const menu = document.createElement('div');
    Object.assign(menu.style, { position:'absolute', left:(rect.left+vx)+'px', top:(rect.bottom+vy)+'px', width:(rect.right-rect.left-2)+'px', minWidth:(rect.right-rect.left-2)+'px', height:'246px', background:'#181818', border:'1.5px solid #333', borderRadius:'0 0 10px 10px', boxSizing:'border-box', boxShadow:'0 8px 24px #0007', zIndex:2147483642, display:'flex', flexDirection:'column', alignItems:'stretch', justifyContent:'flex-start', padding:'0', color:'#fff', pointerEvents:'auto', overflow:'hidden', transform:'translateY(-12px)', opacity:0, transition:'transform 0.22s ease, opacity 0.18s ease' });

    const list = document.createElement('div');
    Object.assign(list.style, { display:'flex', flexDirection:'column', overflowY:'auto', gap:'6px', width:'100%', height:'100%', padding:'8px' });

    
    const timesClicked = loadInt(K.TIMES_CLICKED, 0);
    const thumbsPerClickLast = loadInt(K.THUMBS_PER_CLICK_LAST, 0);
    const thumbsFromClicking = loadInt(K.THUMBS_FROM_CLICKING, 0);
    const thumbsGenerated = loadInt(K.THUMBS_GENERATED_TOTAL, 0);
    const allTimeThumbs = loadInt(K.THUMBS_ALL_TIME, 0);
    const timesPrestiged = loadInt(K.TIMES_PRESTIGED, 0);
    const clickBonusPct = loadInt(K.CLICK_BONUS_PCT, 0);
    const prestigeBonusPct = loadInt(K.PRESTIGE_BONUS_PCT, 0);

    list.appendChild(statRow('Times Clicked:', String(timesClicked)));
    list.appendChild(statRow('Thumbs per Click:', formatCounter(thumbsPerClickLast), { thumb:true }));
    list.appendChild(statRow('Thumbs from Clicking:', formatCounter(thumbsFromClicking), { thumb:true }));
    list.appendChild(statRow('Thumbs Generated:', formatCounter(thumbsGenerated), { thumb:true }));
    list.appendChild(statRow('All-Time Thumbs Generated:', formatCounter(allTimeThumbs), { thumb:true }));
    list.appendChild(statRow('Times Prestiged:', String(timesPrestiged)));

    
    const sep = document.createElement('div'); sep.style.height='8px'; list.appendChild(sep);

    list.appendChild(statRow('Click Bonus:', String(clickBonusPct)+'%'));
    list.appendChild(statRow('Prestige Bonus:', String(prestigeBonusPct)+'%'));

  
  const gridWrap = document.createElement('div');
  Object.assign(gridWrap.style, { padding:'4px 8px 8px 8px', width:'100%', userSelect:'none' });
  const grid = document.createElement('div');
  purchasedGridEl = grid;
  Object.assign(grid.style, { display:'grid', gridTemplateColumns:'repeat(10, 1fr)', gap:'6px', width:'100%' });
  gridWrap.appendChild(grid);
  list.appendChild(gridWrap);

  menu.appendChild(list);
    document.body.appendChild(menu);

  setTimeout(()=>{ menu.style.transform='translateY(0)'; menu.style.opacity='1'; setTimeout(()=>{ menu.style.transition='transform 0.22s cubic-bezier(.5,1.7,.5,1), opacity 0.18s cubic-bezier(.5,1.7,.5,1)'; },220); },10);
  try { if (window.fjfeAudio) window.fjfeAudio.play('menu_open'); } catch(_) {}

    state.openMenu = menu; state.allMenus.push(menu);
    try { refreshPurchasedGrid(); } catch(_) {}
    
    try {
      if (state._liveTimer) clearInterval(state._liveTimer);
    } catch(_) {}
    state._liveTimer = setInterval(() => {
      try {
        if (!state.openMenu) { clearInterval(state._liveTimer); state._liveTimer = null; return; }
        
        const list = menu.firstChild;
        if (!list) return;
        const children = list.children;
        
        const timesClicked = loadInt(K.TIMES_CLICKED, 0);
        const thumbsPerClickLast = loadInt(K.THUMBS_PER_CLICK_LAST, 0);
        const thumbsFromClicking = loadInt(K.THUMBS_FROM_CLICKING, 0);
        const thumbsGenerated = loadInt(K.THUMBS_GENERATED_TOTAL, 0);
        const allTimeThumbs = loadInt(K.THUMBS_ALL_TIME, 0);
        const timesPrestiged = loadInt(K.TIMES_PRESTIGED, 0);
        const clickBonusPct = loadInt(K.CLICK_BONUS_PCT, 0);
        const prestigeBonusPct = loadInt(K.PRESTIGE_BONUS_PCT, 0);
        
        const updateRow = (rowIdx, text, withThumb)=>{
          const row = children[rowIdx]; if (!row) return;
          const val = row.querySelector('div:nth-child(2) span'); if (val) val.textContent = text;
        };
        updateRow(0, String(timesClicked));
        updateRow(1, formatCounter(thumbsPerClickLast));
        updateRow(2, formatCounter(thumbsFromClicking));
        updateRow(3, formatCounter(thumbsGenerated));
        updateRow(4, formatCounter(allTimeThumbs));
        updateRow(5, String(timesPrestiged));
        
        updateRow(7, String(clickBonusPct)+'%');
        updateRow(8, String(prestigeBonusPct)+'%');
        
        refreshPurchasedGrid();
      } catch(_) {}
    }, 1000);
  }

  function toggleMenu(){ if (state.openMenu) { closeMenu(); return; } try { if (window.fjfeAudio && window.fjfeAudio.suppressClose) window.fjfeAudio.suppressClose(300); } catch(_) {} try { if (window.fjfeRcProd) window.fjfeRcProd.closeMenu(); } catch(_) {} try { if (window.fjfeRcSettings) window.fjfeRcSettings.closeMenu(); } catch(_) {} actuallyOpenMenu(); }
  function init(opts){ state.anchorEl = opts && opts.anchorEl ? opts.anchorEl : null; }

  function addStatsButton(host){
    const btn = document.createElement('button');
    Object.assign(btn.style, { position:'absolute', right:'8px', top:'28px', width:'22px', height:'22px', padding:'0', margin:'0', border:'none', background:'transparent', cursor:'pointer', zIndex:4 });
    const img = document.createElement('img');
    const path = 'icons/clicker/clickerinfo.png';
    img.src = chrome.runtime.getURL ? chrome.runtime.getURL(path) : path;
    img.onerror = () => { const fb='icons/error.png'; img.src = chrome.runtime.getURL ? chrome.runtime.getURL(fb) : fb; };
    Object.assign(img.style, { width:'100%', height:'100%', objectFit:'contain', display:'block' });
    btn.appendChild(img);
    btn.addEventListener('click', (e)=>{ e.preventDefault(); try { if (window.fjfeRcStats) { window.fjfeRcStats.init({ anchorEl: host }); window.fjfeRcStats.toggleMenu(); } } catch(_){} });
    return btn;
  }

  
  function refreshPurchasedGrid(){
    try {
      if (!purchasedGridEl) return;
      purchasedGridEl.innerHTML = '';
      
      const defs = (window.fjfeRcStore && typeof window.fjfeRcStore.getAllUpgradeDefs === 'function')
        ? window.fjfeRcStore.getAllUpgradeDefs()
        : (window.fjfeStoreAllUpgradeDefs || []);
      const purchased = defs.filter(d => {
        try { return localStorage.getItem(`fjTweakerStoreUpgrade_${d.id}`) === '1'; } catch(_) { return false; }
      });
      purchased.forEach(def => {
        const cell = document.createElement('div');
        Object.assign(cell.style, { position:'relative', width:'100%', aspectRatio:'1 / 1' });
        const img = document.createElement('img');
        const name = def.name || def.id;
        const toURL = (p)=> (chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL(p) : p;
        
        let iconPath;
        if (/^clickt\d+$/.test(def.id)) iconPath = 'icons/clicker/upgrades/clickup.png';
        else {
          const m = def.id.match(/^(.+?)t(\d+)$/);
          const producerId = m ? m[1] : '';
          iconPath = producerId ? `icons/clicker/upgrades/${producerId}up.png` : 'icons/clicker/upgrades/clickup.png';
        }
        img.src = toURL(iconPath);
        img.onerror = () => {
          try {
            const fb = toURL('icons/error.png');
            if (img.src !== fb) { img.src = fb; return; }
            
            if (img.src !== 'icons/error.png') img.src = 'icons/error.png';
          } catch(_) { img.src = 'icons/error.png'; }
        };
        try { img.draggable = false; } catch(_) {}
        Object.assign(img.style, { position:'absolute', inset:'0', width:'100%', height:'100%', objectFit:'cover', display:'block', background:'#111', border:'0', borderRadius:'2px', cursor:'default' });

        
        const m2 = def.id.match(/^(.+?)t(\d+)$/) || def.id.match(/^clickt(\d+)$/);
        const tier = m2 ? parseInt(m2[2] || m2[1], 10) : 0;
        if (tier > 0) {
          const overlay = document.createElement('div');
          
          const romans = ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
          overlay.textContent = romans[Math.max(0, Math.min(15, tier))];
          Object.assign(overlay.style, { position:'absolute', inset:'0', display:'flex', alignItems:'center', justifyContent:'center', color:'#ff3333', fontWeight:'900', fontSize:'10px', lineHeight:'1', textShadow:'0 1px 2px rgba(0,0,0,0.7)', opacity:'0.85', pointerEvents:'none' });
          cell.appendChild(overlay);
        }
        cell.appendChild(img);
        img.addEventListener('mouseenter', () => {
          try {
            if (!window.fjfeRcInfo) return;
            const tools = window.fjfeClickerNumbers;
            const fmtPct = (inc)=>{
              if (!Number.isFinite(inc)) return '0%';
              const floored = Math.floor(inc * 100) / 100;
              let s = floored.toFixed(2);
              s = s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
              return s + '%';
            };
            
            let topLine = '';
            let midLine = '';
            if (def.id && /^clickt\d+$/.test(def.id)) {
              topLine = '+5% of RPS on click.';
            } else if (typeof def.inc === 'number') {
              const m = def.id.match(/^(.+?)t(\d+)$/);
              const producerId = m ? m[1] : '';
              const producerName = (window.fjfeRcStore && typeof window.fjfeRcStore.getProducerName === 'function') ? window.fjfeRcStore.getProducerName(producerId) : producerId;
              topLine = `Increases ${producerName} production by ${fmtPct(def.inc)}.`;
              if (producerId === 'script') midLine = 'x2 clicking efficiency.';
            }
            const ttLine = def.tt ? String(def.tt) : '';
            const imageSrc = img && img.src ? img.src : '';
            window.fjfeRcInfo.show({ imageSrc, name, hideCost:true, bodyTop: topLine, bodyMid: midLine || undefined, bodyTT: ttLine });
          } catch(_) {}
        });
        img.addEventListener('mouseleave', () => { try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch(_) {} });
        purchasedGridEl.appendChild(cell);
      });
    } catch(_) {}
  }

  window.fjfeRcStats = { init, toggleMenu, closeMenu, updatePosition, addStatsButton, refreshPurchasedGrid, isOpen: function(){ return !!state.openMenu; } };
  window.addEventListener('scroll', updatePosition, { passive:true });
  window.addEventListener('resize', updatePosition);

  
  window.fjfeStats = {
    addClick(deltaThumbs){
      try {
        const inc = Math.max(0, Math.floor(deltaThumbs||0));
        setInt(K.TIMES_CLICKED, loadInt(K.TIMES_CLICKED,0)+1);
        setInt(K.THUMBS_PER_CLICK_LAST, inc);
        setInt(K.THUMBS_FROM_CLICKING, loadInt(K.THUMBS_FROM_CLICKING,0)+inc);
        setInt(K.THUMBS_GENERATED_TOTAL, loadInt(K.THUMBS_GENERATED_TOTAL,0)+inc);
        
        const allBi = loadBigInt(K.THUMBS_ALL_TIME) + BigInt(inc);
        setBigInt(K.THUMBS_ALL_TIME, allBi);
      } catch(_) {}
    },
    addPassive(deltaThumbs){
      try {
        const inc = Math.max(0, Math.floor(deltaThumbs||0));
        setInt(K.THUMBS_GENERATED_TOTAL, loadInt(K.THUMBS_GENERATED_TOTAL,0)+inc);
        const allBi = loadBigInt(K.THUMBS_ALL_TIME) + BigInt(inc);
        setBigInt(K.THUMBS_ALL_TIME, allBi);
      } catch(_) {}
    },
    
    addPassiveScaledBig(deltaScaled){
      try {
        if (typeof deltaScaled !== 'bigint') return;
        if (deltaScaled <= 0n) return;
        const whole = deltaScaled / 10n;
        if (whole <= 0n) return;
        const allBi = loadBigInt(K.THUMBS_ALL_TIME) + whole;
        setBigInt(K.THUMBS_ALL_TIME, allBi);
      } catch(_) {}
    },
    setClickBonusPercent(pct){ try { setInt(K.CLICK_BONUS_PCT, Math.max(0, Math.floor(pct||0))); } catch(_) {} },
    setPrestigeBonusPercent(pct){ try { setInt(K.PRESTIGE_BONUS_PCT, Math.max(0, Math.floor(pct||0))); } catch(_) {} },
    reset(){ try { Object.values(K).forEach(k => { localStorage.removeItem(k); }); } catch(_) {} },
    prestigeReset(){
      try {
        
        const keepAllTime = loadInt(K.THUMBS_ALL_TIME, 0);
        const keepTimesClicked = loadInt(K.TIMES_CLICKED, 0);
        const keepTimesPrestiged = loadInt(K.TIMES_PRESTIGED, 0);
        const keepPrestigeBonus = loadInt(K.PRESTIGE_BONUS_PCT, 0);

        
        Object.values(K).forEach(k => { localStorage.removeItem(k); });

        
        setInt(K.THUMBS_ALL_TIME, keepAllTime);
        setInt(K.TIMES_CLICKED, keepTimesClicked);
        setInt(K.TIMES_PRESTIGED, keepTimesPrestiged);
        setInt(K.PRESTIGE_BONUS_PCT, keepPrestigeBonus);

        
        try {
          const storage = window.fjfeNumbersStorage;
          if (storage && typeof storage.writeRaw === 'function') {
            storage.writeRaw({ infinite:false, scaled: 0n });
          } else {
            localStorage.setItem('fjTweakerClickerCount', '0');
          }
        } catch(_) {}

        
        try {
          const keys = Object.keys(localStorage);
          keys.forEach(k => {
            if (k.startsWith('fjTweakerStoreUpgrade_')) localStorage.removeItem(k);
            if (k.startsWith('fjTweakerStoreMultiplier_')) localStorage.removeItem(k);
          });
        } catch(_) {}

        
        try {
          const keys = Object.keys(localStorage);
          keys.forEach(k => {
            if (k.startsWith('fjTweakerUpgradeNum_')) localStorage.removeItem(k);
          });
        } catch(_) {}

        
        try {
          const tools = window.fjfeClickerNumbers;
          const disp = document.getElementById('fjfe-clicker-count-v2');
          if (disp) {
            const txt = (tools && tools.formatCounter) ? tools.formatCounter(0) : '0';
            disp.textContent = txt;
          }
        } catch(_) {}
        try { if (typeof window.fjfeClickerV2Recompute === 'function') window.fjfeClickerV2Recompute(); } catch(_) {}
        try { if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors(); } catch(_) {}
        try { if (typeof window.fjfeRefreshStoreAffordability === 'function') window.fjfeRefreshStoreAffordability(); } catch(_) {}
      } catch(_) {}
    },
    computePrestigeProgress(){
      try {
        
        const readBig = (key) => {
          try {
            const s = localStorage.getItem(key);
            if (!s) return 0n;
            return BigInt(s);
          } catch(_) { return 0n; }
        };
        const allTime = readBig(K.THUMBS_ALL_TIME);
        let level = readBig(K.PRESTIGE_BONUS_PCT);
        if (level < 0n) level = 0n;

        const T = 1000000000000n; 

        
        const floorCbrt = (x) => {
          if (x <= 0n) return 0n;
          
          let lo = 0n, hi = 1n;
          while (hi*hi*hi <= x) hi <<= 1n;
          
          while (hi - lo > 1n) {
            const mid = (lo + hi) >> 1n;
            const m3 = mid*mid*mid;
            if (m3 <= x) lo = mid; else hi = mid;
          }
          return lo;
        };

  const s = floorCbrt(allTime / T);
  
  const pot = (s > level) ? (s - level) : 0n;

  const nextLevel = level + pot + 1n; 
        const threshold = nextLevel*nextLevel*nextLevel * T;
        const remain = (allTime >= threshold) ? 0n : (threshold - allTime);

        const toSafeNumber = (bi)=>{
          const max = BigInt(Number.MAX_SAFE_INTEGER);
          return bi <= max ? Number(bi) : null;
        };
        const formatBig = (bi)=>{ return formatBigAbbrev(bi); };

        const prest = toSafeNumber(level) ?? Number.MAX_SAFE_INTEGER;
        const potprest = toSafeNumber(pot) ?? Number.MAX_SAFE_INTEGER;
        const prestremain = toSafeNumber(remain);
        const prestremainStr = formatBig(remain);
        return { prest, potprest, prestremain: (prestremain ?? Infinity), prestremainStr };
      } catch(_) { return { prest:0, potprest:0, prestremain:0, prestremainStr: '0' }; }
    }
  };
})();
