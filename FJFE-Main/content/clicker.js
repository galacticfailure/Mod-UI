

(function() {
    
    try {
        const link = document.querySelector('a.modLinky[href="/mod-social/"]');
        const ok = !!link && (link.textContent || '').trim() === 'ModSo';
        if (!ok) return;
    } catch (_) {
      return;
    }

    const CLICKER_POSITION_KEY = 'fjTweakerClickerPanelPosition';

    
    const MAX_SAFE = Number.MAX_SAFE_INTEGER;
    function clampSafe(n) {
        if (!Number.isFinite(n) || isNaN(n)) return 0;
        if (n < 0) return 0;
        if (n > MAX_SAFE) return MAX_SAFE;
        return Math.floor(n);
    }
    function safeAdd(a, b) {
        return clampSafe(Math.floor(a) + Math.floor(b));
    }
    function safeSub(a, b) {
        const v = Math.floor(a) - Math.floor(b);
        return v < 0 ? 0 : clampSafe(v);
    }
    function formatCompact(n) {
        n = Math.floor(Math.max(0, n));
        if (n >= 1_000_000_000) {
            const v = Math.floor((n / 1_000_000_000) * 100) / 100; 
            return v.toFixed(2) + 'B';
        } else if (n >= 1_000_000) {
            const v = Math.floor((n / 1_000_000) * 100) / 100;
            return v.toFixed(2) + 'M';
        } else if (n >= 1_000) {
            const v = Math.floor((n / 1_000) * 100) / 100;
            return v.toFixed(2) + 'K';
        }
        return String(n);
    }
    function canAffordConsideringFormat(money, price) {
        money = clampSafe(money); price = clampSafe(price);
        if (money >= price) return true;
        return formatCompact(money) === formatCompact(price);
    }

    
    function isBluePurchasedGlobal(id) {
        try { return localStorage.getItem(`fjTweakerPurchased_${id}`) === '1'; } catch(_) {
          return false;
        }

    }
    function countUniquePurchasedUpgradesGlobal() {
        
        let count = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k || k === 'fjTweakerUpgradeNum') continue;
                if (k.startsWith('fjTweakerUpgradeNum_')) {
                    const v = parseInt(localStorage.getItem(k), 10);
                    if (Number.isFinite(v) && v > 0) count++;
                }
            }
        } catch(_) {}
        return count;
    }
    function getBlueMultipliersGlobal() {
        let clickMult = 1.0;
        let rpsMult = 1.0;
        if (isBluePurchasedGlobal('lists')) clickMult *= 1.10;            
        if (isBluePurchasedGlobal('jumperCables')) rpsMult *= 1.15;      
        if (isBluePurchasedGlobal('hornybait')) { clickMult *= 1.10; rpsMult *= 1.10; } 
        if (isBluePurchasedGlobal('modCollusion')) clickMult *= 1.20;    
        if (isBluePurchasedGlobal('adminWhispering')) { clickMult *= 1.50; rpsMult *= 1.50; } 
        if (isBluePurchasedGlobal('repost401k')) {
            const uniqueCount = countUniquePurchasedUpgradesGlobal();
            const factor = 1 + 0.05 * uniqueCount; 
            clickMult *= factor;
            rpsMult *= factor;
        }
        return { clickMult, rpsMult };
    }
    function getPriceDiscountFactorGlobal(group) {
        
        let factor = 1.0;
        if (group === 'red' && isBluePurchasedGlobal('macro')) factor *= 0.95; 
        if (isBluePurchasedGlobal('commentsContent')) factor *= 0.95;          
        return factor;
    }

    
    function loadInt(key, d=0) { try {
      const v = parseInt(localStorage.getItem(key),10); return Number.isFinite(v)?v:d;
    }
 catch(_) {
      return d;
    }
 }
    function setInt(key, v) { try {
      localStorage.setItem(key, String(clampSafe(v)));
    }
 catch(_) {} }
    function setFlag(key) { try {
      localStorage.setItem(key, '1');
    }
 catch(_) {} }
    function getFlag(key) { try {
      return localStorage.getItem(key) === '1';
    }
 catch(_) {
      return false;
    }
 }

    function countBluePurchased() {
        let n=0; try { for (let i=0;i<localStorage.length;i++){ const k=localStorage.key(i)||''; if (k.startsWith('fjTweakerPurchased_') && localStorage.getItem(k)==='1') n++; } } catch(_) {}
        return n;
    }
    function countGreenUsed() {
        let n=0; try { for (let i=0;i<localStorage.length;i++){ const k=localStorage.key(i)||''; if (k.startsWith('fjTweakerGreen_used_') && localStorage.getItem(k)==='1') n++; } } catch(_) {}
        return n;
    }
    function getUnlockedCountForGroup(group, GROUP_IDS) {
        const total = GROUP_IDS[group]?.length || 0;
        
        try {
            const be = loadInt('fjTweakerBanEvadeCount', 0);
            if (be >= 1 && (group==='red' || group==='yellow' || group==='blue' || group==='green')) {
                return total;
            }
        } catch(_) {}
        if (group==='red' || group==='yellow') {
            
            
            const ids = GROUP_IDS[group]||[];
            let unlocked = 2;
            for (let i = 0; i < ids.length; i++) {
                if (i >= unlocked) break; 
                const id = ids[i];
                const lvl = loadUpgradeLevelByIdGlobal(id);
                if (lvl >= 10) unlocked = Math.min(total, unlocked + 1);
            }
            return Math.min(total, unlocked);
        } else if (group==='blue') {
            const base=3; const extra=countBluePurchased();
            return Math.min(total, base + extra);
        } else if (group==='green') {
            const base=1; const extra=countGreenUsed();
            return Math.min(total, base + extra);
        }
        
        return total;
    }
    function purpleIsUnlocked(id) {
        
        if (getFlag(`fjTweakerAchUnlocked_${id}`)) return true;
        
        const clicks = loadInt('fjTweakerClickerClicks',0);
        const rpsNow = (function(){ try { const base=computeYellowRpsBonusGlobal(); const { rpsMult: b } = getBlueMultipliersGlobal(); const { rpsMult: g } = getGreenMultipliersGlobalNow(); return clampSafe(Math.floor(base*b*g)); } catch(_) {
          return 0;
        }
 })();
        const maxThumbs = loadInt('fjTweakerClickerMax', 0);
        let ok=false;
        if (id==='carpalTunnel') ok = clicks >= 1000;
        else if (id==='scrollWheel') ok = clicks >= 10000;
        else if (id==='maybeMacro') ok = clicks >= 100000;
        else if (id==='idleHands') ok = rpsNow >= 10000;
        else if (id==='machineLearning') ok = rpsNow >= 1000000;
        else if (id==='internetForever') ok = rpsNow >= 1000000000;
        else if (id==='whitename') ok = maxThumbs >= 1000000;
        else if (id==='bluename') ok = maxThumbs >= 1000000000;
        else if (id==='pissname') ok = maxThumbs >= 100000000000;
        if (ok) setFlag(`fjTweakerAchUnlocked_${id}`);
        return ok;
    }
    function updateMaxThumbs(val) {
        const current = loadInt('fjTweakerClickerMax', 0);
        if (val > current) setInt('fjTweakerClickerMax', val);
    }
    function allRedYellowAtLeast10(GROUP_IDS) {
        const ids = [...(GROUP_IDS.red||[]), ...(GROUP_IDS.yellow||[])];
        return ids.length>0 && ids.every(id => loadUpgradeLevelByIdGlobal(id) >= 10);
    }

    
    const GREEN_CONFIG = {
        
        stealReposts:      { kind: 'click', factor: 2.0, duration: 30 },   
        supportPatreon:    { kind: 'click', factor: 4.0, duration: 30 },   
        hireMarlboros:     { kind: 'click', factor: 1.10, duration: 10 },  
        watermarks:        { kind: 'rps',   factor: 1.20, duration: 30 },  
        bribeBluename:     { kind: 'rps',   factor: 1.10, duration: 15 },  
        baitVectrohex:     { kind: 'rps',   factor: 2.50, duration: 120 }, 
        troll:             { kind: 'rps',   factor: 1.50, duration: 15 },  
        breachContainment: { kind: 'rps',   factor: 2.00, duration: 10 },  
        sabotageModHelp:   { kind: 'rps',   factor: 2.00, duration: 15 },  
        deployJettom:      { kind: 'rps',   factor: 11.0, duration: 10 },  
    };
    function greenKeys(id) {
        return {
            active: `fjTweakerGreen_active_${id}`,
            cooldown: `fjTweakerGreen_cd_${id}`,
        };
    }
    
    (function migrateGreenSpamRename(){
        try {
            const oldId = 'spam';
            const newId = 'hireMarlboros';
            const oldActive = `fjTweakerGreen_active_${oldId}`;
            const oldCd = `fjTweakerGreen_cd_${oldId}`;
            const oldUsed = `fjTweakerGreen_used_${oldId}`;
            const newActive = `fjTweakerGreen_active_${newId}`;
            const newCd = `fjTweakerGreen_cd_${newId}`;
            const newUsed = `fjTweakerGreen_used_${newId}`;
            const hadAny = localStorage.getItem(oldActive) || localStorage.getItem(oldCd) || localStorage.getItem(oldUsed);
            if (hadAny && !localStorage.getItem(newActive) && !localStorage.getItem(newCd) && !localStorage.getItem(newUsed)) {
                if (localStorage.getItem(oldActive)) localStorage.setItem(newActive, localStorage.getItem(oldActive));
                if (localStorage.getItem(oldCd)) localStorage.setItem(newCd, localStorage.getItem(oldCd));
                if (localStorage.getItem(oldUsed)) localStorage.setItem(newUsed, localStorage.getItem(oldUsed));
            }
        } catch(_) {}
    })();
    function greenGetStatus(id) {
        const ks = greenKeys(id);
        const now = Date.now();
        let activeUntil = 0, cooldownUntil = 0;
        try {
          activeUntil = parseInt(localStorage.getItem(ks.active), 10) || 0;
        }
 catch(_) {}
        try {
          cooldownUntil = parseInt(localStorage.getItem(ks.cooldown), 10) || 0;
        }
 catch(_) {}
        return {
            active: now < activeUntil,
            cooldown: now < cooldownUntil && now >= activeUntil,
            activeUntil,
            cooldownUntil,
        };
    }
    function greenIsAvailable(id) {
        const st = greenGetStatus(id);
        return !st.active && !st.cooldown;
    }
    function greenGetEffectiveDurationSeconds(baseSeconds) {
        
        return baseSeconds + (isBluePurchasedGlobal('sentientMemes') ? 10 : 0);
    }
    function greenActivate(id) {
        const cfg = GREEN_CONFIG[id]; if (!cfg) return false;
        const now = Date.now();
        const durSec = greenGetEffectiveDurationSeconds(cfg.duration);
        const activeUntil = now + durSec * 1000;
        const cooldownUntil = now + (durSec + (durSec * 10)) * 1000; 
        const ks = greenKeys(id);
        try {
            localStorage.setItem(ks.active, String(activeUntil));
            localStorage.setItem(ks.cooldown, String(cooldownUntil));
        } catch(_) {}
        return true;
    }
    function getGreenMultipliersGlobalNow() {
        const now = Date.now();
        let clickMult = 1.0, rpsMult = 1.0;
        for (const id in GREEN_CONFIG) {
            const cfg = GREEN_CONFIG[id];
            const ks = greenKeys(id);
            let activeUntil = 0; try {
              activeUntil = parseInt(localStorage.getItem(ks.active), 10) || 0;
            }
 catch(_) {}
            if (now < activeUntil) {
                if (cfg.kind === 'click') clickMult *= cfg.factor;
                else if (cfg.kind === 'rps') rpsMult *= cfg.factor;
            }
        }
        return { clickMult, rpsMult };
    }
    function getGreenActiveKindsNow() {
        const now = Date.now();
        let click = false, rps = false;
        for (const id in GREEN_CONFIG) {
            const cfg = GREEN_CONFIG[id];
            const ks = greenKeys(id);
            let activeUntil = 0; try {
              activeUntil = parseInt(localStorage.getItem(ks.active), 10) || 0;
            }
 catch(_) {}
            if (now < activeUntil) {
                if (cfg.kind === 'click') click = true;
                else if (cfg.kind === 'rps') rps = true;
            }
        }
        return { click, rps };
    }

    
    
    const YELLOW_RPS_ADD = {
        extraTab: 1,
        redditScraper: 5,
        autoScheduler: 20,
        discordScraper: 75,
        hireJeets: 250,
        botnet: 1000,
        sorosFunding: 4500,
        agiShitposter: 20000,
        russianCollusion: 90000,
        funnyjunk2: 500000,
    };
    function loadUpgradeLevelByIdGlobal(id) {
        try {
            const raw = localStorage.getItem(`fjTweakerUpgradeNum_${id}`);
            const n = parseInt(raw, 10);
            return Number.isFinite(n) && n > 0 ? n : 0;
        } catch(_) {
          return 0;
        }

    }
    function computeYellowRpsBonusGlobal() {
        let total = 0;
        for (const id in YELLOW_RPS_ADD) {
            let level = loadUpgradeLevelByIdGlobal(id);
            
            if (level > 0 && isBluePurchasedGlobal('mossadFunding')) level = clampSafe(level + 2);
            const add = YELLOW_RPS_ADD[id] || 0;
            total = clampSafe(total + clampSafe(level * add));
        }
        return total; 
    }

    
    function passiveTickOnce() {
        
        if (!(window.fjTweakerSettings && window.fjTweakerSettings.clicker)) return;
        try {
            const baseRps = computeYellowRpsBonusGlobal();
            const { rpsMult: blueRps } = getBlueMultipliersGlobal();
            const { rpsMult: greenRps } = getGreenMultipliersGlobalNow();
            const rps = clampSafe(Math.floor(baseRps * blueRps * greenRps));
            
            if (typeof window.fjfeClickerSetRpsBonus === 'function') {
                window.fjfeClickerSetRpsBonus(rps);
            }
            if (typeof window.fjfeClickerSetPulse === 'function') {
                window.fjfeClickerSetPulse(getGreenActiveKindsNow());
            }
            if (rps <= 0) return;
            const raw = localStorage.getItem('fjTweakerClickerCount');
            const cur = Number.isFinite(parseInt(raw,10)) ? parseInt(raw,10) : 0;
            const next = clampSafe(cur + rps);
            localStorage.setItem('fjTweakerClickerCount', String(next));
            
            const disp = document.getElementById('fjfe-clicker-count');
            if (disp) disp.textContent = formatCompact(next);
            try {
              updateMaxThumbs(next);
            }
 catch(_) {}
            
            try {
              if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors();
            }
 catch(_) {}
        } catch(_) {  }
    }
    function startPassiveEngine() {
        if (!window.fjfeClickerPassiveTimer) {
            window.fjfeClickerPassiveTimer = setInterval(passiveTickOnce, 1000);
        }
    }
    function stopPassiveEngine() {
        if (window.fjfeClickerPassiveTimer) {
            clearInterval(window.fjfeClickerPassiveTimer);
            window.fjfeClickerPassiveTimer = null;
        }
    }
    
    startPassiveEngine();

    function loadPanelPosition() {
        try {
            const raw = localStorage.getItem(CLICKER_POSITION_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            const left = Number(parsed.left);
            const top = Number(parsed.top);
            if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
            return { left, top };
        } catch (e) {
          return null;
        }

    }

    function persistPanelPosition(pos) {
        try {
            if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) {
                localStorage.setItem(CLICKER_POSITION_KEY, JSON.stringify(pos));
            } else {
                localStorage.removeItem(CLICKER_POSITION_KEY);
            }
        } catch (e) {}
    }
    
    function autoOpenIfEnabled() {
        try {
            if (window.fjTweakerSettings && window.fjTweakerSettings.clicker) {
                window.fjfeClickerOpen && window.fjfeClickerOpen();
            }
        } catch (e) {}
    }

    

    
    function createClickerWindow() {
    
    let allMenus = [];
        
        const UPGRADE_DEFS = {
            
            increaseDpi:       { basePrice: 25,         multiplier: 1.15, name: 'Increase DPI',        color: '#e33', tooltip: '+1 Click' },
            fasterWifi:        { basePrice: 180,        multiplier: 1.16, name: 'Faster Wi-Fi',        color: '#e33', tooltip: '+3 Clicks' },
            memeFolder:        { basePrice: 1200,       multiplier: 1.18, name: 'Meme Folder',         color: '#e33', tooltip: '+8 Clicks' },
            scheduledPost:     { basePrice: 8000,       multiplier: 1.20, name: 'Scheduled Post',      color: '#e33', tooltip: '+20 Clicks' },
            extraMonitor:      { basePrice: 60000,      multiplier: 1.22, name: 'Extra Monitor',       color: '#e33', tooltip: '+50 Clicks' },
            sponsoredMemes:    { basePrice: 480000,     multiplier: 1.25, name: 'Sponsored Memes',     color: '#e33', tooltip: '+125 Clicks' },
            intern:            { basePrice: 4000000,    multiplier: 1.27, name: 'Intern',              color: '#e33', tooltip: '+400 Clicks' },
            serverFarm:        { basePrice: 30000000,   multiplier: 1.30, name: 'Server Farm',         color: '#e33', tooltip: '+1,500 Clicks' },
            digitalClones:     { basePrice: 240000000,  multiplier: 1.33, name: 'Digital Clones',      color: '#e33', tooltip: '+6,000 Clicks' },
            neuralink:         { basePrice: 1800000000, multiplier: 1.35, name: 'Neuralink',           color: '#e33', tooltip: '+25,000 Clicks' },
            
            extraTab:          { basePrice: 80,          multiplier: 1.15, name: 'Extra Tab',          color: '#fc3', tooltip: '+1 RPS' },
            redditScraper:     { basePrice: 800,         multiplier: 1.17, name: 'Reddit Scraper',     color: '#fc3', tooltip: '+5 RPS' },
            autoScheduler:     { basePrice: 6000,        multiplier: 1.20, name: 'Auto-Scheduler',     color: '#fc3', tooltip: '+20 RPS' },
            discordScraper:    { basePrice: 40000,       multiplier: 1.22, name: 'Discord Scraper',    color: '#fc3', tooltip: '+75 RPS' },
            hireJeets:         { basePrice: 240000,      multiplier: 1.25, name: 'Hire Jeets',         color: '#fc3', tooltip: '+250 RPS' },
            botnet:            { basePrice: 1600000,     multiplier: 1.28, name: 'Botnet',             color: '#fc3', tooltip: '+1,000 RPS' },
            sorosFunding:      { basePrice: 12000000,    multiplier: 1.30, name: 'Soros Funding',      color: '#fc3', tooltip: '+4,500 RPS' },
            agiShitposter:     { basePrice: 90000000,    multiplier: 1.33, name: 'AGI Shitposter',     color: '#fc3', tooltip: '+20,000 RPS' },
            russianCollusion:  { basePrice: 700000000,   multiplier: 1.35, name: 'Russian Collusion',  color: '#fc3', tooltip: '+90,000 RPS' },
            funnyjunk2:        { basePrice: 5500000000,  multiplier: 1.38, name: 'FunnyJunk 2',        color: '#fc3', tooltip: '+500,000 RPS' },
            
            macro:             { basePrice: 25000,       multiplier: null, name: 'Macro',              color: '#39f', tooltip: 'RED upgrade costs -5%' },
            lists:             { basePrice: 120000,      multiplier: null, name: 'Lists',              color: '#39f', tooltip: '+10% reposts per click' },
            jumperCables:      { basePrice: 600000,      multiplier: null, name: 'Jumper Cables',      color: '#39f', tooltip: '+15% RPS' },
            commentsContent:   { basePrice: 2500000,     multiplier: null, name: 'Comments Content',   color: '#39f', tooltip: 'Reduce repeat-upgrade costs' },
            hornybait:         { basePrice: 12000000,    multiplier: null, name: 'Hornybait',          color: '#39f', tooltip: '+10% reposts globally' },
            modCollusion:      { basePrice: 60000000,    multiplier: null, name: 'Mod Collusion',      color: '#39f', tooltip: '+20% reposts per click' },
            repost401k:        { basePrice: 250000000,   multiplier: null, name: 'Repost 401k',        color: '#39f', tooltip: '+5% reposts globally per unique upgrade' },
            sentientMemes:     { basePrice: 1200000000,  multiplier: null, name: 'Sentient Memes',     color: '#39f', tooltip: '+10 seconds to temporary upgrades' },
            mossadFunding:     { basePrice: 6000000000,  multiplier: null, name: 'Mossad Funding',     color: '#39f', tooltip: 'adds 2 levels to all purchased upgrades' },
            adminWhispering:   { basePrice: 25000000000, multiplier: null, name: 'Admin Whispering',   color: '#39f', tooltip: '+50% reposts globally' },

            stealReposts:      { basePrice: 500000,      multiplier: null, name: 'Steal Reposts',      color: '#3e3', tooltip: 'Double clicks / 30s' },
            watermarks:        { basePrice: 5000000,     multiplier: null, name: 'Watermarks',         color: '#3e3', tooltip: '+20% RPS / 30s' },
            bribeBluename:     { basePrice: 2500000,     multiplier: null, name: 'Bribe Bluename',     color: '#3e3', tooltip: '+10% RPS / 15s' },
            supportPatreon:    { basePrice: 1200000,     multiplier: null, name: 'Support Patreon',    color: '#3e3', tooltip: 'Quad click / 30s' },
            baitVectrohex:     { basePrice: 3000000,     multiplier: null, name: 'Bait Vectrohex',     color: '#3e3', tooltip: '+150% RPS / 120s' },
            troll:             { basePrice: 8000000,     multiplier: null, name: 'Troll',              color: '#3e3', tooltip: '+50% RPS / 15s' },
            hireMarlboros:     { basePrice: 900000,      multiplier: null, name: 'Hire Marlboros',     color: '#3e3', tooltip: '+10% click / 10s' },
            breachContainment: { basePrice: 10000000,    multiplier: null, name: 'Breach Containment', color: '#3e3', tooltip: '+100% RPS / 10s' },
            sabotageModHelp:   { basePrice: 25000000,    multiplier: null, name: 'Sabotage mod-help',  color: '#3e3', tooltip: '+100% RPS / 15s' },
            deployJettom:      { basePrice: 2000000000,  multiplier: null, name: 'Deploy Jettom',      color: '#3e3', tooltip: '+1000% RPS / 10s' },

            carpalTunnel:      { basePrice: null,        multiplier: null, name: 'Carpal Tunnel',      color: '#93f', tooltip: 'Click 1,000 times.' },
            scrollWheel:       { basePrice: null,        multiplier: null, name: 'Scroll Wheel',       color: '#93f', tooltip: 'Click 10,000 times.' },
            maybeMacro:        { basePrice: null,        multiplier: null, name: 'Maybe Macro',        color: '#93f', tooltip: 'Click 100,000 times.' },
            idleHands:         { basePrice: null,        multiplier: null, name: 'Idle Hands',         color: '#93f', tooltip: 'Get to 10,000 RPS.' },
            machineLearning:   { basePrice: null,        multiplier: null, name: 'Machine Learning',   color: '#93f', tooltip: 'Get to 1,000,000 RPS.' },
            internetForever:   { basePrice: null,        multiplier: null, name: 'Internet Forever',   color: '#93f', tooltip: 'Get to 1,000,000,000 RPS.' },
            whitename:         { basePrice: null,        multiplier: null, name: 'Whitename',          color: '#93f', tooltip: 'Accumulate 1,000,000 thumbs.' },
            bluename:          { basePrice: null,        multiplier: null, name: 'Bluename',           color: '#93f', tooltip: 'Accumulate 1,000,000,000 thumbs.' },
            pissname:          { basePrice: null,        multiplier: null, name: 'Pissname',           color: '#93f', tooltip: 'Accumulate 100,000,000,000 thumbs.' }
        };
        
        const ALL_UPGRADES = [
            
            { id: 'increaseDpi', group: 'red' },
            { id: 'fasterWifi', group: 'red' },
            { id: 'memeFolder', group: 'red' },
            { id: 'scheduledPost', group: 'red' },
            { id: 'extraMonitor', group: 'red' },
            { id: 'sponsoredMemes', group: 'red' },
            { id: 'intern', group: 'red' },
            { id: 'serverFarm', group: 'red' },
            { id: 'digitalClones', group: 'red' },
            { id: 'neuralink', group: 'red' },
            
            { id: 'extraTab', group: 'yellow' },
            { id: 'redditScraper', group: 'yellow' },
            { id: 'autoScheduler', group: 'yellow' },
            { id: 'discordScraper', group: 'yellow' },
            { id: 'hireJeets', group: 'yellow' },
            { id: 'botnet', group: 'yellow' },
            { id: 'sorosFunding', group: 'yellow' },
            { id: 'agiShitposter', group: 'yellow' },
            { id: 'russianCollusion', group: 'yellow' },
            { id: 'funnyjunk2', group: 'yellow' },
            
            { id: 'macro', group: 'blue' },
            { id: 'lists', group: 'blue' },
            { id: 'jumperCables', group: 'blue' },
            { id: 'commentsContent', group: 'blue' },
            { id: 'hornybait', group: 'blue' },
            { id: 'modCollusion', group: 'blue' },
            { id: 'repost401k', group: 'blue' },
            { id: 'sentientMemes', group: 'blue' },
            { id: 'mossadFunding', group: 'blue' },
            { id: 'adminWhispering', group: 'blue' },
            
            { id: 'stealReposts', group: 'green' },
            { id: 'watermarks', group: 'green' },
            { id: 'bribeBluename', group: 'green' },
            { id: 'supportPatreon', group: 'green' },
            { id: 'baitVectrohex', group: 'green' },
            { id: 'troll', group: 'green' },
            { id: 'hireMarlboros', group: 'green' },
            { id: 'breachContainment', group: 'green' },
            { id: 'sabotageModHelp', group: 'green' },
            { id: 'deployJettom', group: 'green' },
            
            { id: 'carpalTunnel', group: 'purple' },
            { id: 'scrollWheel', group: 'purple' },
            { id: 'maybeMacro', group: 'purple' },
            { id: 'idleHands', group: 'purple' },
            { id: 'machineLearning', group: 'purple' },
            { id: 'internetForever', group: 'purple' },
            { id: 'whitename', group: 'purple' },
            { id: 'bluename', group: 'purple' },
            { id: 'pissname', group: 'purple' },
        ];
        const GROUP_IDS = ['red','yellow','blue','green','purple'].reduce((acc, g) => {
            
            acc[g] = ALL_UPGRADES.filter(u => u.group === g).map(u => u.id);
            return acc;
        }, {});
        
        let openMenu = null;
        let openMenuColor = null;
        function clearClickerTooltips() {
            try {
              document.querySelectorAll('.fjfe-tooltip').forEach(n => n.remove());
            }
 catch(_) {}
        }
        function closeMenu() {
            
            allMenus.forEach(menu => {
                if (!menu._closing) {
                    menu._closing = true;
                    menu.style.transition = 'none';
                    void menu.offsetWidth;
                    requestAnimationFrame(() => {
                        menu.style.transition = 'transform 0.22s cubic-bezier(.5,1.7,.5,1), opacity 0.18s cubic-bezier(.5,1.7,.5,1)';
                        menu.style.transform = 'translateY(-100%)';
                        menu.style.opacity = '0';
                        menu.style.zIndex = 2147483642;
                        setTimeout(() => {
                            if (menu.parentNode) menu.parentNode.removeChild(menu);
                            const idx = allMenus.indexOf(menu);
                            if (idx !== -1) allMenus.splice(idx, 1);
                        }, 220);
                    });
                } else {
                    if (menu.parentNode) menu.parentNode.removeChild(menu);
                    const idx = allMenus.indexOf(menu);
                    if (idx !== -1) allMenus.splice(idx, 1);
                }
            });
            clearClickerTooltips();
            openMenu = null;
            openMenuColor = null;
        }
        function toggleMenu(color) {
            if (openMenu && openMenuColor === color) {
                closeMenu();
                return;
            }
            
            if (openMenu) {
                const oldMenu = openMenu;
                oldMenu._closing = true;
                oldMenu.style.transition = 'transform 0.22s cubic-bezier(.5,1.7,.5,1), opacity 0.18s cubic-bezier(.5,1.7,.5,1)';
                oldMenu.style.transform = 'translateY(-100%)';
                oldMenu.style.opacity = '0';
                oldMenu.style.zIndex = 2147483642;
                setTimeout(() => {
                    if (oldMenu.parentNode) oldMenu.parentNode.removeChild(oldMenu);
                    const idx = allMenus.indexOf(oldMenu);
                    if (idx !== -1) allMenus.splice(idx, 1);
                }, 220);
                clearClickerTooltips();
                
                actuallyOpenMenu(color);
                return;
            }
            actuallyOpenMenu(color);
        }

        
        function refreshOpenMenuFor(color) {
            try {
                if (openMenu && openMenuColor === color) {
                    closeMenu();
                    
                    setTimeout(() => { actuallyOpenMenu(color); }, 0);
                }
            } catch(_) {}
        }

        function actuallyOpenMenu(color) {
            
            const rect = win.getBoundingClientRect();
            const menu = document.createElement('div');
            Object.assign(menu.style, {
                position: 'fixed',
                left: rect.left + 'px',
                top: rect.bottom + 'px',
                width: (rect.right - rect.left - 2) + 'px',
                minWidth: rect.width + 'px',
                height: '164px',
                background: '#181818',
                border: '1.5px solid #333',
                borderRadius: '0 0 10px 10px',
                boxSizing: 'border-box',
                boxShadow: '0 8px 24px #0007',
                zIndex: 2147483641,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 0 10px 0',
                font: "600 18px 'Segoe UI', sans-serif",
                color: '#fff',
                pointerEvents: 'auto',
                overflow: 'hidden',
                transform: 'translateY(-100%)',
                opacity: 1,
                transition: 'transform 0.22s ease, opacity 0.18s ease',
            });

            
            const createUpgradeBox = (thisId, thisDef) => {
                const upgrade = document.createElement('div');
                upgrade.dataset.upgradeId = thisId;
                const borderColor = thisDef.color || '#444';
                Object.assign(upgrade.style, {
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                    background: '#222', border: `2px solid ${borderColor}`, borderRadius: '14px',
                    width: '64px', minWidth: '64px', height: '90px', boxShadow: '0 2px 8px #0005', margin: '0', padding: '0', overflow: 'hidden',
                    cursor: thisDef.disabled ? 'not-allowed' : 'pointer', transition: 'filter 0.12s, transform 0.08s', opacity: thisDef.disabled ? '0.7' : '1',
                    position: 'relative'
                });
                const isBlue = (color === 'blue');
                const isGreen = (color === 'green');
                const purchasedKey = isBlue ? `fjTweakerPurchased_${thisId}` : null;
                const isPurchased = () => { if (!isBlue) return false; try {
                  return localStorage.getItem(purchasedKey) === '1';
                }
 catch(_) {
                  return false;
                }
 };
                const setPurchased = (v) => { if (!isBlue) return; try {
                  localStorage.setItem(purchasedKey, v ? '1' : '0');
                }
 catch(_) {} };
                const refreshPurchasedStyle = () => {
                    if (isBlue && isPurchased()) {
                        upgrade.style.cursor = 'not-allowed';
                        upgrade.style.opacity = '0.7';
                    } else if (isGreen) {
                        const st = greenGetStatus(thisId);
                        if (!greenIsAvailable(thisId)) {
                            upgrade.style.cursor = 'not-allowed';
                            upgrade.style.opacity = '0.7';
                        } else {
                            upgrade.style.cursor = 'pointer';
                            upgrade.style.opacity = '1';
                        }
                    }
                };
                refreshPurchasedStyle();
                if (!thisDef.disabled) {
                    upgrade.onmousedown = upgrade.ontouchstart = function() {
                        
                        if (typeof upgrade._isClickableNow === 'function' && upgrade._isClickableNow()) {
                            upgrade.style.transform = 'scale(0.88)';
                        }
                    };
                    upgrade.onmouseup = upgrade.onmouseleave = upgrade.ontouchend = function() { upgrade.style.transform = ''; };
                }
                
                if (thisDef.tooltip) {
                    let tooltip = null;
                    function showTooltip(e) {
                        if (!tooltip) {
                            tooltip = document.createElement('div');
                            tooltip.className = 'fjfe-tooltip';
                            const unlockedNow = (function(){
                                if (color==='purple') return purpleIsUnlocked(thisId);
                                if (color==='orange') return true;
                                const idx = (GROUP_IDS[color]||[]).indexOf(thisId);
                                return idx > -1 && idx < getUnlockedCountForGroup(color, GROUP_IDS);
                            })();
                            let tipText = '???';
                            if (unlockedNow) {
                                if (color === 'green') {
                                    const st = greenGetStatus(thisId);
                                    tipText = (st && st.cooldown) ? 'ON COOLDOWN' : (thisDef.tooltip || '');
                                } else {
                                    tipText = thisDef.tooltip || '';
                                }
                            }
                            tooltip.textContent = tipText;
                            Object.assign(tooltip.style, {
                                position: 'fixed', background: '#222', color: '#fff', border: `1.5px solid ${borderColor}`, borderRadius: '7px', padding: '6px 13px',
                                font: "600 14px 'Segoe UI', sans-serif", pointerEvents: 'none', zIndex: 2147483648, boxShadow: '0 2px 8px #0007', whiteSpace: thisDef.tooltip.includes('\n') ? 'pre-wrap' : 'nowrap', opacity: 0.97,
                                left: '0', top: '0', transition: 'none'
                            });
                            document.body.appendChild(tooltip);
                        }
                        moveTooltip(e);
                    }
                    function moveTooltip(e) { if (tooltip) {
                      tooltip.style.left = (e.clientX + 18) + 'px'; tooltip.style.top = (e.clientY + 8) + 'px';
                    }
 }
                    function hideTooltip() { if (tooltip && tooltip.parentNode) {
                      tooltip.parentNode.removeChild(tooltip); tooltip = null;
                    }
 }
                    upgrade.addEventListener('mouseenter', showTooltip);
                    upgrade.addEventListener('mousemove', moveTooltip);
                    upgrade.addEventListener('mouseleave', hideTooltip);
                }
                
                const imgWrap = document.createElement('div');
                Object.assign(imgWrap.style, { width: '100%', height: '48px', background: 'rgba(255,204,51,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${borderColor}` });
                const img = document.createElement('img');
                img.className = 'fjfe-up-img';
                const defaultImgName = (thisDef.name || thisId).toLowerCase().replace(/[^a-z0-9]+/g, '_');
                const imgPath = thisDef.img ? thisDef.img : `icons/${defaultImgName}.png`;
                img.src = chrome.runtime.getURL ? chrome.runtime.getURL(imgPath) : imgPath;
                
                img.onerror = () => {
                    let fallback = 'icons/upgrade.png';
                    if (color === 'red') fallback = 'icons/click.png';
                    else if (color === 'yellow') fallback = 'icons/bot.png';
                    else if (color === 'blue') fallback = 'icons/upgrade.png';
                    else if (color === 'green') fallback = 'icons/secret.png';
                    else if (color === 'purple') fallback = 'icons/award.png';
                    img.src = chrome.runtime.getURL ? chrome.runtime.getURL(fallback) : fallback;
                };
                Object.assign(img.style, { width: '80%', height: '80%', objectFit: 'contain', display: 'block' });
                imgWrap.appendChild(img);
                upgrade.appendChild(imgWrap);
                
                const name = document.createElement('div');
                name.className = 'fjfe-up-name';
                function computeUnlocked() {
                    if (color==='red' || color==='yellow' || color==='blue' || color==='green') {
                        const idx = (GROUP_IDS[color]||[]).indexOf(thisId);
                        const unlockedCount = getUnlockedCountForGroup(color, GROUP_IDS);
                        return idx > -1 && idx < unlockedCount;
                    } else if (color==='purple') {
                        return purpleIsUnlocked(thisId);
                    }
                    return true; 
                }
                name.textContent = computeUnlocked() ? (thisDef.name || thisId) : '???';
                Object.assign(name.style, { width: '100%', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#fff', background: 'rgba(255,204,51,0.13)', padding: '2px', borderTop: `1px solid ${borderColor}`, flex: '1 1 auto', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 48px)' });
                upgrade.appendChild(name);

                
                if (!thisDef.disabled && thisDef.basePrice != null) {
                    const numKey = `fjTweakerUpgradeNum_${thisId}`;
                    const loadNum = () => {
                        try {
                            const r = localStorage.getItem(numKey);
                            let p = parseInt(r,10);
                            if (!Number.isFinite(p) || p < 0) p = 0;
                            
                            if (thisId === 'increaseDpi') {
                                const legacyRaw = localStorage.getItem('fjTweakerUpgradeNum');
                                const legacy = parseInt(legacyRaw, 10);
                                if (Number.isFinite(legacy) && legacy > p) {
                                    localStorage.setItem(numKey, String(legacy));
                                    try {
                                      localStorage.removeItem('fjTweakerUpgradeNum');
                                    }
 catch(_) {}
                                    return legacy;
                                }
                            }
                            return p;
                        } catch(_) {
                          return 0;
                        }

                    };
                    const persistNum = (v) => { try {
                      localStorage.setItem(numKey, String(v));
                    }
 catch(_) {} };
                    let curNum = loadNum();
                    const calcPrice = () => {
                        const base = clampSafe(Math.round(thisDef.basePrice * Math.pow(thisDef.multiplier || 1, curNum)));
                        const groupFactor = getPriceDiscountFactorGlobal(color);
                        return clampSafe(Math.floor(base * groupFactor));
                    };

                    
                    let upgradeNumDiv = null;
                    if (color === 'yellow' || color === 'red') {
                        upgradeNumDiv = document.createElement('div');
                        Object.assign(upgradeNumDiv.style, {
                            position: 'absolute', right: '4px', top: '32px', fontSize: '13px', color: borderColor,
                            fontWeight: '700', pointerEvents: 'none', userSelect: 'none', zIndex: 3,
                            textShadow: '0 1px 2px #000a, 0 0 1px #000a'
                        });
                        const updateNum = () => { upgradeNumDiv.textContent = 'x' + curNum; };
                        updateNum();
                        upgrade._updateCount = updateNum;
                        upgrade.appendChild(upgradeNumDiv);
                    }

                    const getMoney = () => { try {
                      const raw = localStorage.getItem('fjTweakerClickerCount'); const p = parseInt(raw,10); return Number.isFinite(p)?p:0;
                    }
 catch(_) {
                      return 0;
                    }
 };
                    const setMoney = (v) => { try {
                      localStorage.setItem('fjTweakerClickerCount', String(clampSafe(v)));
                    }
 catch(_) {} };
                    const isAffordableNow = () => canAffordConsideringFormat(getMoney(), calcPrice());
                    
                    const upgradeCol = document.createElement('div');
                    Object.assign(upgradeCol.style, { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minWidth: '64px' });
                    const priceRow = document.createElement('div');
                    Object.assign(priceRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0px', marginTop: '4px' });
                    const priceNum = document.createElement('span'); priceNum.dataset.role = 'price';
                    priceNum.textContent = computeUnlocked() ? formatCompact(calcPrice()) : '???';
                    Object.assign(priceNum.style, { color: '#e33', fontWeight: '700', fontSize: '15px', userSelect: 'none' });
                    const priceIcon = document.createElement('img'); priceIcon.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/thumb_down.png') : 'icons/thumb_down.png';
                    Object.assign(priceIcon.style, { width: '18px', height: '18px', verticalAlign: 'middle', marginRight: '0px', filter: 'drop-shadow(0 0 1px #0008)', display: 'inline-block' });
                    priceRow.appendChild(priceIcon); priceRow.appendChild(priceNum);
                    
                    upgrade._isClickableNow = function() {
                        if (thisDef.disabled) return false;
                        if (!computeUnlocked()) return false;
                        if (isBlue && isPurchased()) return false;
                        if (isGreen && !greenIsAvailable(thisId)) return false;
                        return isAffordableNow();
                    };
                    
                    upgrade.onclick = function(e) {
                        e.preventDefault();
                        if (!computeUnlocked()) return;
                        if (isBlue && isPurchased()) return; 
                        if (isGreen && !greenIsAvailable(thisId)) return; 
                        const trackRefresh = (grp) => (grp==='red' || grp==='yellow' || grp==='blue' || grp==='green') ? getUnlockedCountForGroup(grp, GROUP_IDS) : 0;
                        const unlockedBefore = trackRefresh(color);
                        const price = calcPrice();
                        const money = getMoney();
                        if (!canAffordConsideringFormat(money, price)) return;
                        
                        const currentStored = getMoney();
                        const newMoney = currentStored >= price ? (currentStored - price) : 0;
                        setMoney(newMoney);
                        if (typeof clickCount !== 'undefined') { clickCount = newMoney; try {
                          persistClickCount(clickCount);
                        }
 catch(_) {} }
                        if (typeof countDisplay !== 'undefined' && countDisplay) {
                          countDisplay.textContent = formatCompact(newMoney);
                        }

                        if (isBlue) {
                            setPurchased(true);
                            refreshPurchasedStyle();
                            if (typeof window.fjfeClickerRecompute === 'function') window.fjfeClickerRecompute();
                            const unlockedAfter = trackRefresh('blue');
                            if (openMenuColor==='blue') {
                                const ids = GROUP_IDS['blue']||[];
                                const newly = ids.slice(unlockedBefore, unlockedAfter);
                                if (newly.length && typeof updateOpenMenuUnlockStatesByIds === 'function') updateOpenMenuUnlockStatesByIds(newly);
                            }
                        } else if (isGreen) {
                            
                            if (greenActivate(thisId)) {
                                try { localStorage.setItem(`fjTweakerGreen_used_${thisId}`, '1'); } catch(_) {}
                                refreshPurchasedStyle();
                                if (typeof window.fjfeClickerRecompute === 'function') window.fjfeClickerRecompute();
                                const unlockedAfter = trackRefresh('green');
                                if (openMenuColor==='green') {
                                    const ids = GROUP_IDS['green']||[];
                                    const newly = ids.slice(unlockedBefore, unlockedAfter);
                                    if (newly.length && typeof updateOpenMenuUnlockStatesByIds === 'function') updateOpenMenuUnlockStatesByIds(newly);
                                }
                            }
                        } else {
                            curNum++; persistNum(curNum);
                            priceNum.textContent = formatCompact(calcPrice());
                            if (typeof upgrade._updateCount === 'function') upgrade._updateCount();
                            
                            if ((color === 'red' || color === 'yellow') && typeof window.fjfeClickerRecompute === 'function') {
                                window.fjfeClickerRecompute();
                            }
                            
                            const unlockedAfter = (color==='red'||color==='yellow') ? trackRefresh(color) : 0;
                            if (openMenuColor===color && (color==='red'||color==='yellow')) {
                                const ids = GROUP_IDS[color]||[];
                                const newly = ids.slice(unlockedBefore, unlockedAfter);
                                if (newly.length && typeof updateOpenMenuUnlockStatesByIds === 'function') updateOpenMenuUnlockStatesByIds(newly);
                            }
                        }
                    };
                    upgradeCol.appendChild(upgrade);
                    upgradeCol.appendChild(priceRow);
                    
                    function updateUnlockVisual() {
                        const unlockedNow = computeUnlocked();
                        if (unlockedNow) {
                            name.textContent = thisDef.name || thisId;
                            const defaultImgName2 = (thisDef.name || thisId).toLowerCase().replace(/[^a-z0-9]+/g, '_');
                            const imgPath2 = thisDef.img ? thisDef.img : `icons/${defaultImgName2}.png`;
                            img.src = chrome.runtime.getURL ? chrome.runtime.getURL(imgPath2) : imgPath2;
                            priceNum.textContent = formatCompact(calcPrice());
                            
                            const clickable = upgrade._isClickableNow();
                            upgrade.style.cursor = clickable ? 'pointer' : 'not-allowed';
                            
                            if (isBlue && isPurchased()) {
                                upgrade.style.opacity = '0.7';
                            } else if (isGreen && !greenIsAvailable(thisId)) {
                                upgrade.style.opacity = '0.7';
                            } else {
                                upgrade.style.opacity = '1';
                            }
                            if (isGreen) refreshPurchasedStyle(); 
                        } else {
                            name.textContent = '???';
                            img.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/hidden.png') : 'icons/hidden.png';
                            priceNum.textContent = '???';
                            upgrade.style.cursor = 'not-allowed';
                            upgrade.style.opacity = '0.7';
                        }
                    }
                    
                    updateUnlockVisual();
                    upgrade._updateUnlockState = updateUnlockVisual;
                    return upgradeCol;
                } else {
                    
                    
                    if (color==='purple') {
                        function applyPurpleState() {
                            const unlocked = purpleIsUnlocked(thisId);
                            if (!unlocked) {
                                img.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/hidden.png') : 'icons/hidden.png';
                                name.textContent = '???';
                                upgrade.style.cursor = 'not-allowed';
                            } else {
                                name.textContent = thisDef.name || thisId;
                                const defaultImgName2 = (thisDef.name || thisId).toLowerCase().replace(/[^a-z0-9]+/g, '_');
                                const imgPath2 = thisDef.img ? thisDef.img : `icons/${defaultImgName2}.png`;
                                img.src = chrome.runtime.getURL ? chrome.runtime.getURL(imgPath2) : imgPath2;
                                upgrade.style.cursor = 'default';
                            }
                        }
                        applyPurpleState();
                        upgrade._updateUnlockState = applyPurpleState;
                    } else {
                        upgrade.style.cursor = 'default';
                    }
                    return upgrade;
                }
            };

            
            if (color === 'orange') {
                const list = document.createElement('div');
                Object.assign(list.style, {
                    display: 'flex', flexDirection: 'row', overflowX: 'auto', gap: '18px', width: '100%', padding: '0 12px', boxSizing: 'border-box', alignItems: 'flex-start', height: '138px'
                });
                
                const resetBox = document.createElement('div');
                Object.assign(resetBox.style, {
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                    background: '#222', border: '2px solid #f90', borderRadius: '14px', width: '64px', minWidth: '64px', height: '90px', boxShadow: '0 2px 8px #0005', position: 'relative', cursor: 'pointer'
                });
                const resetImgWrap = document.createElement('div');
                Object.assign(resetImgWrap.style, { width: '100%', height: '48px', background: 'rgba(255,153,0,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f90' });
                const resetImg = document.createElement('img');
                const resetPath = 'icons/settings.png';
                resetImg.src = chrome.runtime.getURL ? chrome.runtime.getURL(resetPath) : resetPath;
                resetImg.onerror = () => {
                    const fb = 'icons/settings.png';
                    resetImg.src = chrome.runtime.getURL ? chrome.runtime.getURL(fb) : fb;
                };
                Object.assign(resetImg.style, { width: '80%', height: '80%', objectFit: 'contain', display: 'block' });
                resetImgWrap.appendChild(resetImg); resetBox.appendChild(resetImgWrap);
                const resetName = document.createElement('div'); resetName.textContent = 'Full Reset';
                Object.assign(resetName.style, { width: '100%', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#fff', background: 'rgba(255,153,0,0.13)', padding: '2px', borderTop: '1px solid #f90', flex: '1 1 auto', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 48px)' });
                resetBox.appendChild(resetName);
                resetBox.onclick = function(e) {
                    e.preventDefault();
                    try {
                        
                        localStorage.setItem('fjTweakerClickerCount', '0');
                        if (typeof clickCount !== 'undefined') { clickCount = 0; try {
                          persistClickCount(0);
                        }
 catch(_) {} }
                        if (typeof pendingClickDelta !== 'undefined') {
                          pendingClickDelta = 0;
                        }

                        if (typeof countDisplay !== 'undefined' && countDisplay) {
                          countDisplay.textContent = formatCompact(0);
                        }

                        
                        Object.keys(localStorage).forEach(k => {
                            if (/^fjTweakerUpgradeNum_/.test(k)) localStorage.removeItem(k);
                            if (/^fjTweakerPurchased_/.test(k)) localStorage.removeItem(k);
                            if (/^fjTweakerGreen_active_/.test(k)) localStorage.removeItem(k);
                            if (/^fjTweakerGreen_cd_/.test(k)) localStorage.removeItem(k);
                        });
                        
                        try {
                          localStorage.removeItem('fjTweakerUpgradeNum');
                        }
 catch(_) {}
                        
                        if (typeof window.fjfeClickerRecompute === 'function') window.fjfeClickerRecompute();
                        
                        try {
                          if (typeof window.updateOpenMenuUnlockStates === 'function') window.updateOpenMenuUnlockStates();
                        }
 catch(_) {}
                    } catch(_) {}
                };
                list.appendChild(resetBox);

                
                const beBox = document.createElement('div');
                Object.assign(beBox.style, {
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                    background: '#222', border: '2px solid #f90', borderRadius: '14px', width: '64px', minWidth: '64px', height: '90px', boxShadow: '0 2px 8px #0005', position: 'relative', cursor: 'pointer'
                });
                
                let beTooltip = null;
                function showBETooltip(e) {
                    if (!beTooltip) {
                        beTooltip = document.createElement('div');
                        beTooltip.className = 'fjfe-tooltip';
                        beTooltip.textContent = 'Mods finally got you. Time to alt!\n+5% RPS on prestige.';
                        Object.assign(beTooltip.style, {
                            position: 'fixed', background: '#222', color: '#fff', border: '1.5px solid #f90', borderRadius: '7px', padding: '6px 13px', font: "600 14px 'Segoe UI', sans-serif", pointerEvents: 'none', zIndex: 2147483648, boxShadow: '0 2px 8px #0007', whiteSpace: 'pre-wrap', opacity: 0.97, left: '0', top: '0', transition: 'none'
                        });
                        document.body.appendChild(beTooltip);
                    }
                    moveBETooltip(e);
                }
                function moveBETooltip(e) { if (beTooltip) {
                  beTooltip.style.left = (e.clientX + 18) + 'px'; beTooltip.style.top = (e.clientY + 8) + 'px';
                }
 }
                function hideBETooltip() { if (beTooltip && beTooltip.parentNode) {
                  beTooltip.parentNode.removeChild(beTooltip); beTooltip = null;
                }
 }
                beBox.addEventListener('mouseenter', showBETooltip);
                beBox.addEventListener('mousemove', moveBETooltip);
                beBox.addEventListener('mouseleave', hideBETooltip);

                const beImgWrap = document.createElement('div');
                Object.assign(beImgWrap.style, { width: '100%', height: '48px', background: 'rgba(255,153,0,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f90' });
                const beImg = document.createElement('img');
                const beImgPath = 'icons/ban_evade.png';
                beImg.src = chrome.runtime.getURL ? chrome.runtime.getURL(beImgPath) : beImgPath;
                beImg.onerror = () => {
                    const fb = 'icons/settings.png';
                    beImg.src = chrome.runtime.getURL ? chrome.runtime.getURL(fb) : fb;
                };
                Object.assign(beImg.style, { width: '80%', height: '80%', objectFit: 'contain', display: 'block' });
                beImgWrap.appendChild(beImg);
                beBox.appendChild(beImgWrap);
                const beName = document.createElement('div'); beName.textContent = 'Ban Evade';
                Object.assign(beName.style, { width: '100%', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#fff', background: 'rgba(255,153,0,0.13)', padding: '2px', borderTop: '1px solid #f90', flex: '1 1 auto', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 48px)' });
                beBox.appendChild(beName);
                const beCountDiv = document.createElement('div');
                Object.assign(beCountDiv.style, { position: 'absolute', right: '4px', top: '32px', fontSize: '13px', color: '#f90', fontWeight: '700', pointerEvents: 'none', userSelect: 'none', zIndex: 2 });
                function loadBanEvadeCount() { try {
                  const raw = localStorage.getItem('fjTweakerBanEvadeCount'); const p = parseInt(raw,10); return Number.isFinite(p)?p:0;
                }
 catch(_) {
                  return 0;
                }
 }
                function setBanEvadeCount(v) { try {
                  localStorage.setItem('fjTweakerBanEvadeCount', String(clampSafe(v)));
                }
 catch(_) {} }
                let beCount = loadBanEvadeCount();
                beCountDiv.textContent = 'x' + beCount; beBox.appendChild(beCountDiv);
                function applyBeState() {
                    const unlockedNow = allRedYellowAtLeast10(GROUP_IDS);
                    if (!unlockedNow) {
                        beName.textContent = '???';
                        beBox.style.opacity = '0.6';
                        beBox.style.cursor = 'not-allowed';
                    } else {
                        beName.textContent = 'Ban Evade';
                        beBox.style.opacity = '1';
                        beBox.style.cursor = 'pointer';
                    }
                }
                applyBeState();
                beBox._updateUnlockState = applyBeState;
                
                beBox.addEventListener('mouseenter', function(e){
                    const unlockedNow = allRedYellowAtLeast10(GROUP_IDS);
                    if (beTooltip) beTooltip.textContent = unlockedNow ? 'Mods finally got you. Time to alt!\n+5% RPS on prestige.' : '???';
                });
                beBox.onclick = function(e) {
                    e.preventDefault();
                    if (!allRedYellowAtLeast10(GROUP_IDS)) return;
                    beCount = clampSafe(beCount + 1); setBanEvadeCount(beCount);
                    beCountDiv.textContent = 'x' + beCount;
                    
                    try {
                        if (typeof window.updateOpenMenuUnlockStates === 'function') window.updateOpenMenuUnlockStates();
                    } catch(_) {}
                };
                list.appendChild(beBox);
                menu.appendChild(list);
            } else {
                const upgradeList = document.createElement('div');
                Object.assign(upgradeList.style, {
                    display: 'flex', flexDirection: 'row', overflowX: 'auto', gap: '18px', width: '100%', padding: '0 12px', boxSizing: 'border-box', alignItems: 'flex-start', height: '138px'
                });
                const ids = GROUP_IDS[color] || [];
                ids.forEach(k => {
                    const def = UPGRADE_DEFS[k];
                    const el = createUpgradeBox(k, def);
                    upgradeList.appendChild(el);
                });
                menu.appendChild(upgradeList);
            }

            document.body.appendChild(menu);
            
            menu.style.opacity = '0';
            menu.style.transition = 'transform 0.22s ease, opacity 0.18s ease';
            setTimeout(() => {
                menu.style.transform = 'translateY(0)';
                menu.style.opacity = '1';
                
                setTimeout(() => {
                    menu.style.transition = 'transform 0.22s cubic-bezier(.5,1.7,.5,1), opacity 0.18s cubic-bezier(.5,1.7,.5,1)';
                }, 220);
            }, 10);
            openMenu = menu;
            openMenuColor = color;
            
            window.updateOpenMenuUnlockStates = function() {
                try {
                    if (!openMenu) return;
                    const nodes = openMenu.querySelectorAll('*');
                    nodes.forEach(n => { if (typeof n._updateUnlockState === 'function') n._updateUnlockState(); });
                } catch(_) {}
            };
            window.updateOpenMenuUnlockStatesByIds = function(ids) {
                try {
                    if (!openMenu || !Array.isArray(ids)) return;
                    ids.forEach(id => {
                        const el = openMenu.querySelector(`[data-upgrade-id="${id}"]`);
                        if (el && typeof el._updateUnlockState === 'function') el._updateUnlockState();
                    });
                } catch(_) {}
            };
            window.updateOpenMenuAffordabilityCursors = function() {
                try {
                    if (!openMenu) return;
                    const nodes = openMenu.querySelectorAll('*');
                    nodes.forEach(n => {
                        if (typeof n._isClickableNow === 'function') {
                            const clickable = n._isClickableNow();
                            n.style.cursor = clickable ? 'pointer' : 'not-allowed';
                        }
                    });
                } catch(_) {}
            };
            
            if (typeof window.updateOpenMenuUnlockStates === 'function') window.updateOpenMenuUnlockStates();
            allMenus.push(menu);
        }
        
        let win = document.getElementById('fjfe-clicker-window');
        if (win) {
            win.style.display = 'flex';
            win.style.opacity = '1';
            return;
        }
        win = document.createElement('div');
        win.id = 'fjfe-clicker-window';
        Object.assign(win.style, {
            position: 'fixed',
            bottom: '12px',
            top: 'auto',
            right: '12px',
            width: '180px',
            padding: '12px',
            background: '#0d0d0d',
            color: '#f6f6f6',
            border: '1px solid #333',
            borderRadius: '6px',
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
            font: "500 15px 'Segoe UI', sans-serif",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            zIndex: 2147483644,
            transition: 'opacity 0.2s',
            opacity: '0',
            pointerEvents: 'auto',
            overflow: 'hidden',
        });

        
        const buttonCol = document.createElement('div');
        Object.assign(buttonCol.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '8px',
            position: 'absolute',
            left: '8px',
            top: '38px',
            zIndex: 2,
        });
        
        const btnStyle = {
            width: '22px',
            height: '22px',
            border: 'none',
            borderRadius: '6px',
            margin: '0',
            padding: '0',
            cursor: 'pointer',
            boxShadow: '0 1px 4px #0003',
            outline: 'none',
            transition: 'filter 0.12s',
        };
        
        const btnRed = document.createElement('button');
        Object.assign(btnRed.style, btnStyle, { background: '#e33', position: 'relative', overflow: 'hidden' });
    
        
        const iconRed = document.createElement('img');
        iconRed.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/click.png') : 'icons/click.png';
        Object.assign(iconRed.style, {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            userSelect: 'none',
        });
        btnRed.appendChild(iconRed);
        btnRed.onmousedown = btnRed.ontouchstart = function() {
            btnRed.style.transform = 'scale(0.88)';
        };
        btnRed.onmouseup = btnRed.onmouseleave = btnRed.ontouchend = function() {
            btnRed.style.transform = '';
        };
        btnRed.onclick = function(e) {
            e.preventDefault();
            btnRed.style.transform = 'scale(0.88)';
            setTimeout(() => { btnRed.style.transform = ''; }, 56);
            toggleMenu('red');
        };
        
        const btnBlue = document.createElement('button');
        Object.assign(btnBlue.style, btnStyle, { background: '#39f', position: 'relative', overflow: 'hidden' });
    
        
        const iconBlue = document.createElement('img');
        iconBlue.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/upgrade.png') : 'icons/upgrade.png';
        Object.assign(iconBlue.style, {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            userSelect: 'none',
        });
        btnBlue.appendChild(iconBlue);
        btnBlue.onmousedown = btnBlue.ontouchstart = function() {
            btnBlue.style.transform = 'scale(0.88)';
        };
        btnBlue.onmouseup = btnBlue.onmouseleave = btnBlue.ontouchend = function() {
            btnBlue.style.transform = '';
        };
        btnBlue.onclick = function(e) {
            e.preventDefault();
            btnBlue.style.transform = 'scale(0.88)';
            setTimeout(() => { btnBlue.style.transform = ''; }, 56);
            toggleMenu('blue');
        };
        
        const btnYellow = document.createElement('button');
        Object.assign(btnYellow.style, btnStyle, { background: '#fc3', position: 'relative', overflow: 'hidden' });
    
        
        const iconYellow = document.createElement('img');
        iconYellow.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/bot.png') : 'icons/bot.png';
        Object.assign(iconYellow.style, {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            userSelect: 'none',
        });
        btnYellow.appendChild(iconYellow);
        btnYellow.onmousedown = btnYellow.ontouchstart = function() {
            btnYellow.style.transform = 'scale(0.88)';
        };
        btnYellow.onmouseup = btnYellow.onmouseleave = btnYellow.ontouchend = function() {
            btnYellow.style.transform = '';
        };
        btnYellow.onclick = function(e) {
            e.preventDefault();
            btnYellow.style.transform = 'scale(0.88)';
            setTimeout(() => { btnYellow.style.transform = ''; }, 56);
            toggleMenu('yellow');
        };
        buttonCol.appendChild(btnRed);
        buttonCol.appendChild(btnBlue);
        buttonCol.appendChild(btnYellow);
        win.appendChild(buttonCol);

        
        const buttonColRight = document.createElement('div');
        Object.assign(buttonColRight.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '8px',
            position: 'absolute',
            right: '8px',
            top: '38px',
            zIndex: 2,
        });
        
        const btnGreen = document.createElement('button');
        Object.assign(btnGreen.style, btnStyle, { background: '#3e3', position: 'relative', overflow: 'hidden' });
    
        
        const iconGreen = document.createElement('img');
        iconGreen.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/secret.png') : 'icons/secret.png';
        Object.assign(iconGreen.style, {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            userSelect: 'none',
        });
        btnGreen.appendChild(iconGreen);
        btnGreen.onmousedown = btnGreen.ontouchstart = function() {
            btnGreen.style.transform = 'scale(0.88)';
        };
        btnGreen.onmouseup = btnGreen.onmouseleave = btnGreen.ontouchend = function() {
            btnGreen.style.transform = '';
        };
        btnGreen.onclick = function(e) {
            e.preventDefault();
            btnGreen.style.transform = 'scale(0.88)';
            setTimeout(() => { btnGreen.style.transform = ''; }, 56);
            toggleMenu('green');
        };
        
        const btnPurple = document.createElement('button');
        Object.assign(btnPurple.style, btnStyle, { background: '#93f', position: 'relative', overflow: 'hidden' });
    
        
        const iconPurple = document.createElement('img');
        iconPurple.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/award.png') : 'icons/award.png';
        Object.assign(iconPurple.style, {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            userSelect: 'none',
        });
        btnPurple.appendChild(iconPurple);
        btnPurple.onmousedown = btnPurple.ontouchstart = function() {
            btnPurple.style.transform = 'scale(0.88)';
        };
        btnPurple.onmouseup = btnPurple.onmouseleave = btnPurple.ontouchend = function() {
            btnPurple.style.transform = '';
        };
        btnPurple.onclick = function(e) {
            e.preventDefault();
            btnPurple.style.transform = 'scale(0.88)';
            setTimeout(() => { btnPurple.style.transform = ''; }, 56);
            toggleMenu('purple');
        };
        
        const btnOrange = document.createElement('button');
        Object.assign(btnOrange.style, btnStyle, { background: '#f90', position: 'relative', overflow: 'hidden' });
    
        
        const iconOrange = document.createElement('img');
        iconOrange.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/settings.png') : 'icons/settings.png';
        Object.assign(iconOrange.style, {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            userSelect: 'none',
        });
        btnOrange.appendChild(iconOrange);
        btnOrange.onmousedown = btnOrange.ontouchstart = function() {
            btnOrange.style.transform = 'scale(0.88)';
        };
        btnOrange.onmouseup = btnOrange.onmouseleave = btnOrange.ontouchend = function() {
            btnOrange.style.transform = '';
        };
        btnOrange.onclick = function(e) {
            e.preventDefault();
            btnOrange.style.transform = 'scale(0.88)';
            setTimeout(() => { btnOrange.style.transform = ''; }, 56);
            toggleMenu('orange');
        };
        buttonColRight.appendChild(btnGreen);
        buttonColRight.appendChild(btnPurple);
        buttonColRight.appendChild(btnOrange);
        win.appendChild(buttonColRight);
        
        const iconWrap = document.createElement('div');
        Object.assign(iconWrap.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 0,
        });
        const iconImg = document.createElement('img');
        iconImg.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/repost.png') : 'icons/repost.png';
        Object.assign(iconImg.style, {
            width: '54px',
            height: '54px',
            opacity: 0.18,
            filter: 'drop-shadow(0 2px 8px #0008)',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
            willChange: 'transform',
            animation: 'fjfe-repost-spin 6s linear infinite',
        });
        iconWrap.appendChild(iconImg);

        
        if (!document.getElementById('fjfe-repost-spin-style')) {
            const style = document.createElement('style');
            style.id = 'fjfe-repost-spin-style';
            style.textContent = `@keyframes fjfe-repost-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes fjfe-rainbow { 0%{ color:#f33 } 16%{ color:#f93 } 33%{ color:#ff3 } 50%{ color:#3f3 } 66%{ color:#3cf } 83%{ color:#93f } 100%{ color:#f33 } }
.fjfe-pulse-rainbow { animation: fjfe-rainbow 1.2s linear infinite; text-shadow: 0 1px 2px #000a, 0 0 2px currentColor; }`;
            document.head.appendChild(style);
        }
        
        const CLICKER_COUNT_KEY = 'fjTweakerClickerCount';
        function loadClickCount() {
            try {
                const raw = localStorage.getItem(CLICKER_COUNT_KEY);
                if (!raw) return 0;
                const parsed = parseInt(raw, 10);
                return Number.isFinite(parsed) ? parsed : 0;
            } catch (e) {
              return 0;
            }

        }
        function persistClickCount(val) {
            try {
              localStorage.setItem(CLICKER_COUNT_KEY, String(clampSafe(val)));
            }
 catch (e) {}
        }

        let clickCount = loadClickCount();

        
        win.style.position = 'fixed';
        win.style.overflow = 'hidden';

        
        win.appendChild(iconWrap);

        
        const dragHandle = document.createElement('div');
        Object.assign(dragHandle.style, {
            alignSelf: 'stretch',
            cursor: 'move',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textAlign: 'center',
            textTransform: 'uppercase',
            color: '#a5a5a5',
            borderBottom: '1px solid #1f1f1f',
            padding: '4px 0',
            userSelect: 'none',
            position: 'relative',
            minHeight: '20px',
        });
        dragHandle.textContent = 'D R A G';
        
        const headerCounterStyle = {
            position: 'absolute',
            top: '50%',
            fontSize: '10px',
            color: '#9a9a9a',
            opacity: '0.85',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            lineHeight: '1',
        };
        const leftCounter = document.createElement('span');
        Object.assign(leftCounter.style, headerCounterStyle, { left: '0px', transform: 'translate(-12px, -50%)' });
        leftCounter.textContent = '+0 Clicks';
        const rightCounter = document.createElement('span');
        Object.assign(rightCounter.style, headerCounterStyle, { right: '0px', transform: 'translate(12px, -50%)' });
        rightCounter.textContent = '+0 RPS';
        dragHandle.appendChild(leftCounter);
        dragHandle.appendChild(rightCounter);
        
        window.fjfeClickerSetClickBonus = function(v) {
            try { leftCounter.textContent = `+${v} Clicks`; } catch(_) {}
        };
        window.fjfeClickerSetRpsBonus = function(v) {
            try { rightCounter.textContent = `+${v} RPS`; } catch(_) {}
        };
        window.fjfeClickerSetPulse = function(opts) {
            try {
                if (opts && opts.click) leftCounter.classList.add('fjfe-pulse-rainbow'); else leftCounter.classList.remove('fjfe-pulse-rainbow');
                if (opts && opts.rps) rightCounter.classList.add('fjfe-pulse-rainbow'); else rightCounter.classList.remove('fjfe-pulse-rainbow');
            } catch(_) {}
        };
        win.append(dragHandle);

        
        const RED_CLICK_ADD = {
            increaseDpi: 1,
            fasterWifi: 3,
            memeFolder: 8,
            scheduledPost: 20,
            extraMonitor: 50,
            sponsoredMemes: 125,
            intern: 400,
            serverFarm: 1500,
            digitalClones: 6000,
            neuralink: 25000,
        };
        function loadUpgradeLevelById(id) {
            try {
                const raw = localStorage.getItem(`fjTweakerUpgradeNum_${id}`);
                const n = parseInt(raw, 10);
                return Number.isFinite(n) && n > 0 ? n : 0;
            } catch(_) {
              return 0;
            }

        }
        function computeRedClickBonus() {
            let total = 0;
            for (const id in RED_CLICK_ADD) {
                let level = loadUpgradeLevelById(id);
                
                if (level > 0 && isBluePurchasedGlobal('mossadFunding')) level = clampSafe(level + 2);
                const add = RED_CLICK_ADD[id] || 0;
                
                total = clampSafe(total + clampSafe(level * add));
            }
            return total;
        }
        let currentClickValue = 1; 
        function recomputeBonusesAndApply() {
            const redBonus = computeRedClickBonus();
            
            const { clickMult, rpsMult } = getBlueMultipliersGlobal();
            const { clickMult: greenClick } = getGreenMultipliersGlobalNow();
            const effClick = clampSafe(Math.floor((1 + redBonus) * clickMult * greenClick));
            currentClickValue = effClick;
            if (typeof window.fjfeClickerSetClickBonus === 'function') window.fjfeClickerSetClickBonus(effClick - 1);
            
            const baseRps = (typeof computeYellowRpsBonusGlobal === 'function') ? computeYellowRpsBonusGlobal() : 0;
            const { rpsMult: greenRps } = getGreenMultipliersGlobalNow();
            const rps = clampSafe(Math.floor(baseRps * rpsMult * greenRps));
            if (typeof window.fjfeClickerSetRpsBonus === 'function') window.fjfeClickerSetRpsBonus(rps);
            
            const kinds = getGreenActiveKindsNow();
            if (typeof window.fjfeClickerSetPulse === 'function') window.fjfeClickerSetPulse(kinds);
        }
        
        window.fjfeClickerRecompute = recomputeBonusesAndApply;
        
        recomputeBonusesAndApply();

        
        const repostBtn = document.createElement('button');
        repostBtn.textContent = 'REPOST';
        Object.assign(repostBtn.style, {
            margin: '0',
            padding: '0',
            background: 'none',
            border: 'none',
            color: '#fff',
            font: "700 15px 'Segoe UI', sans-serif",
            letterSpacing: '0.12em',
            cursor: 'pointer',
            outline: 'none',
            transition: 'transform 0.056s cubic-bezier(.5,1.7,.5,1)',
            userSelect: 'none',
            boxShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
            height: '48px',
        });
        repostBtn.style.alignSelf = 'center';
        repostBtn.onmousedown = repostBtn.ontouchstart = function() {
            repostBtn.style.transform = 'scale(0.88)';
        };
        repostBtn.onmouseup = repostBtn.onmouseleave = repostBtn.ontouchend = function() {
            repostBtn.style.transform = '';
        };
        
        let _uiScheduled = false;
        let _lastPersistMs = 0;
        let pendingClickDelta = 0;
        function _flushUiAndMaybePersist() {
            
            const base = loadClickCount();
            const next = safeAdd(base, pendingClickDelta);
            clickCount = next; 
            countDisplay.textContent = formatCompact(next);
            const now = Date.now();
            if (now - _lastPersistMs > 120) {
                persistClickCount(next);
                
                try {
                  updateMaxThumbs(next);
                }
 catch(_) {}
                try {
                  setInt('fjTweakerClickerClicks', loadInt('fjTweakerClickerClicks',0) + pendingClickDelta);
                }
 catch(_) {}
                _lastPersistMs = now;
                pendingClickDelta = 0; 
            }
            _uiScheduled = false;
            
            try {
              if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors();
            }
 catch(_) {}
        }
        repostBtn.onclick = function() {
            repostBtn.style.transform = 'scale(0.88)';
            setTimeout(() => { repostBtn.style.transform = ''; }, 56);
            
            pendingClickDelta = safeAdd(pendingClickDelta, currentClickValue);
            
            if (!_uiScheduled) {
                _uiScheduled = true;
                (window.requestAnimationFrame ? requestAnimationFrame : setTimeout)(_flushUiAndMaybePersist);
            }
        };
        win.append(repostBtn);

        

        
        const countRow = document.createElement('div');
        Object.assign(countRow.style, {
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0px',
            fontSize: '18px',
            fontWeight: '700',
            letterSpacing: '0.04em',
            textAlign: 'center',
            opacity: 0.92,
            userSelect: 'none',
        });
        
        const thumbImg = document.createElement('img');
        thumbImg.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/thumb.png') : 'icons/thumb.png';
        Object.assign(thumbImg.style, {
            width: '1em',
            height: '1em',
            display: 'inline-block',
            verticalAlign: 'middle',
            filter: 'drop-shadow(0 1px 2px #0006)',
            flex: '0 0 auto',
            marginRight: '0px',
        });
        
        const countDisplay = document.createElement('span');
        Object.assign(countDisplay.style, {
            color: '#3f3',
            fontSize: '1em',
            fontWeight: '700',
            verticalAlign: 'middle',
            display: 'inline-block',
        });
    countDisplay.id = 'fjfe-clicker-count';
    countDisplay.textContent = formatCompact(clickCount);
        countRow.appendChild(thumbImg);
        countRow.appendChild(countDisplay);
        win.append(countRow);

        
        const pos = loadPanelPosition();
        if (pos) {
            win.style.left = pos.left + 'px';
            win.style.top = pos.top + 'px';
            win.style.bottom = '';
            win.style.right = '';
            win.style.position = 'absolute';
        }

        
        
        function updateMenusPosition() {
            if (!allMenus.length) return;
            const rect = win.getBoundingClientRect();
            allMenus.forEach(menu => {
                menu.style.left = rect.left + 'px';
                menu.style.top = rect.bottom + 'px';
                menu.style.width = (rect.right - rect.left - 2) + 'px';
            });
        }
        let dragState = null;
        const startDrag = (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            event.stopPropagation();
            event.preventDefault();
            const rect = win.getBoundingClientRect();
            const { left: scrollLeft, top: scrollTop } = { left: window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0, top: window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0 };
            dragState = {
                pointerId: event.pointerId,
                startPageX: event.pageX,
                startPageY: event.pageY,
                originLeft: rect.left + scrollLeft,
                originTop: rect.top + scrollTop
            };
            if (typeof win.setPointerCapture === 'function' && dragState.pointerId !== undefined) {
                try {
                  win.setPointerCapture(dragState.pointerId);
                }
 catch (e) {}
            }
            window.addEventListener('pointermove', handleDragMove);
            window.addEventListener('pointerup', finishDrag);
            window.addEventListener('pointercancel', finishDrag);
        };
        const handleDragMove = (event) => {
            if (!dragState || event.pointerId !== dragState.pointerId) return;
            event.stopPropagation();
            const nextLeft = dragState.originLeft + (event.pageX - dragState.startPageX);
            const nextTop = dragState.originTop + (event.pageY - dragState.startPageY);
            
            const width = win.offsetWidth || 180;
            const height = win.offsetHeight || 210;
            const margin = 12;
            const maxLeft = Math.max(margin, window.innerWidth - width - margin);
            const maxTop = Math.max(margin, window.innerHeight - height - margin);
            const clampedLeft = Math.min(Math.max(nextLeft, margin), maxLeft);
            const clampedTop = Math.min(Math.max(nextTop, margin), maxTop);
            win.style.left = clampedLeft + 'px';
            win.style.top = clampedTop + 'px';
            win.style.bottom = '';
            win.style.right = '';
            win.style.position = 'absolute';
            updateMenusPosition();
        };
        const finishDrag = (event) => {
            if (!dragState || (event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) return;
            event.stopPropagation();
            if (typeof win.releasePointerCapture === 'function' && dragState.pointerId !== undefined) {
                try {
                  win.releasePointerCapture(dragState.pointerId);
                }
 catch (e) {}
            }
            
            const rect = win.getBoundingClientRect();
            const { left: scrollLeft, top: scrollTop } = { left: window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0, top: window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0 };
            persistPanelPosition({ left: rect.left + scrollLeft, top: rect.top + scrollTop });
            dragState = null;
            window.removeEventListener('pointermove', handleDragMove);
            window.removeEventListener('pointerup', finishDrag);
            window.removeEventListener('pointercancel', finishDrag);
        };
        dragHandle.addEventListener('pointerdown', startDrag);

        
        ['pointerdown', 'mousedown', 'click'].forEach((eventName) => {
            win.addEventListener(eventName, (e) => e.stopPropagation());
        });

    document.body.appendChild(win);
    
    win.addEventListener('fjfeClickerClose', closeMenu);
    
    window.addEventListener('scroll', updateMenusPosition, { passive: true });
    window.addEventListener('resize', updateMenusPosition);
        setTimeout(() => { win.style.opacity = '1'; }, 10);
        
        if (window.fjfeSlickAnimateIn) window.fjfeSlickAnimateIn(win);
    }
    
    window.fjfeClickerOpen = function() {
        createClickerWindow();
    };
    window.fjfeClickerClose = function() {
        const win = document.getElementById('fjfe-clicker-window');
        if (win) {
            
            win.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease';
            win.style.willChange = 'transform, opacity';
            win.style.transform = 'translateY(-12px)';
            win.style.opacity = '0';
            setTimeout(() => {
                if (win.parentNode) win.parentNode.removeChild(win);
                
                try {
                  const evt = new Event('fjfeClickerClose'); win.dispatchEvent(evt);
                }
 catch(_) {}
                if (typeof closeMenu === 'function') closeMenu();
            }, 220);
        }
    };

    
    document.addEventListener('fjTweakerSettingsChanged', function(e) {
        const s = (e && e.detail) ? e.detail : window.fjTweakerSettings;
        if (s && typeof s.clicker !== 'undefined') {
            if (s.clicker) {
                window.fjfeClickerOpen && window.fjfeClickerOpen();
                startPassiveEngine();
            } else {
                
                window.fjfeClickerClose && window.fjfeClickerClose();
                if (typeof closeMenu === 'function') closeMenu();
                stopPassiveEngine();
            }
        }
    });

    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoOpenIfEnabled);
    } else {
        autoOpenIfEnabled();
    }
})();
