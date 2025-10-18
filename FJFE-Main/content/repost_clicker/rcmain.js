

(function() {

    const CLICKER_POSITION_KEY = 'fjTweakerClickerPanelPosition';

    
    const MAX_SAFE = Number.MAX_SAFE_INTEGER;
    
    const UNIT_TABLE = [
        { power: 3,   word: 'Thousand',           abbrev: 'K' },
        { power: 6,   word: 'Million',            abbrev: 'M' },
        { power: 9,   word: 'Billion',            abbrev: 'B' },
        { power: 12,  word: 'Trillion',           abbrev: 'T' },
        { power: 15,  word: 'Quadrillion',        abbrev: 'Qa' },
        { power: 18,  word: 'Quintillion',        abbrev: 'Qi' },
        { power: 21,  word: 'Sextillion',         abbrev: 'Sx' },
        { power: 24,  word: 'Septillion',         abbrev: 'Sp' },
        { power: 27,  word: 'Octillion',          abbrev: 'Oc' },
        { power: 30,  word: 'Nonillion',          abbrev: 'No' },
        { power: 33,  word: 'Decillion',          abbrev: 'De' },
        { power: 36,  word: 'Undecillion',        abbrev: 'Ud' },
        { power: 39,  word: 'Duodecillion',       abbrev: 'Dd' },
        { power: 42,  word: 'Tredecillion',       abbrev: 'Td' },
        { power: 45,  word: 'Quattuordecillion',  abbrev: 'Qd' },
        { power: 48,  word: 'Quindecillion',      abbrev: 'Qn' },
        { power: 51,  word: 'Sexdecillion',       abbrev: 'Sxd' },
        { power: 54,  word: 'Septendecillion',    abbrev: 'Spd' },
        { power: 57,  word: 'Octodecillion',      abbrev: 'Ocd' },
        { power: 60,  word: 'Novemdecillion',     abbrev: 'Nod' },
        { power: 63,  word: 'Vigintillion',       abbrev: 'Vg' },
        { power: 66,  word: 'Unvigintillion',     abbrev: 'Uvg' },
        { power: 69,  word: 'Duovigintillion',    abbrev: 'Dvg' },
        { power: 72,  word: 'Tresvigintillion',   abbrev: 'Trvg' },
        { power: 75,  word: 'Quattuorvigintillion',abbrev: 'Qavg' },
        { power: 78,  word: 'Quinvigintillion',   abbrev: 'Qivg' },
        { power: 81,  word: 'Sexvigintillion',    abbrev: 'Sxvg' },
        { power: 84,  word: 'Septenvigintillion', abbrev: 'Spvg' },
        { power: 87,  word: 'Octovigintillion',   abbrev: 'Ocvg' },
        { power: 90,  word: 'Novemvigintillion',  abbrev: 'Novg' },
        { power: 93,  word: 'Trigintillion',      abbrev: 'Tg' },
        { power: 96,  word: 'Untrigintillion',    abbrev: 'Utg' },
        { power: 99,  word: 'Duotrigintillion',   abbrev: 'Dtg' },
        { power: 102, word: 'Tretrigintillion',   abbrev: 'Ttrg' },
        { power: 105, word: 'Quattuortrigintillion',abbrev: 'Qtrg' },
        { power: 108, word: 'Quintrigintillion',  abbrev: 'Qitg' },
        { power: 111, word: 'Sextrigintillion',   abbrev: 'Sxtg' },
        { power: 114, word: 'Septentrigintillion',abbrev: 'Sptg' },
        { power: 117, word: 'Octotrigintillion',  abbrev: 'Octg' },
        { power: 120, word: 'Novemtrigintillion', abbrev: 'Notg' },
        { power: 123, word: 'Quadragintillion',   abbrev: 'Qg' },
        { power: 126, word: 'Unquadragintillion', abbrev: 'Uqg' },
        { power: 129, word: 'Duoquadragintillion',abbrev: 'Dqg' },
        { power: 132, word: 'Tresquadragintillion',abbrev: 'Tqg' },
        { power: 135, word: 'Quattuorquadragintillion',abbrev: 'Qaqg' },
        { power: 138, word: 'Quinquadragintillion',abbrev: 'Qiqg' },
        { power: 141, word: 'Sexquadragintillion',abbrev: 'Sxqg' },
        { power: 144, word: 'Septenquadragintillion',abbrev: 'Spqg' },
        { power: 147, word: 'Octoquadragintillion',abbrev: 'Ocqg' },
        { power: 150, word: 'Novemquadragintillion',abbrev: 'Noqg' },
        { power: 153, word: 'Quinquagintillion',  abbrev: 'Qig' },
        { power: 156, word: 'Unquinquagintillion',abbrev: 'Uqig' },
        { power: 159, word: 'Duoquinquagintillion',abbrev: 'Dqig' },
        { power: 162, word: 'Tresquinquagintillion',abbrev: 'Tqig' },
        { power: 165, word: 'Quattuorquinquagintillion',abbrev: 'Qaqig' },
        { power: 168, word: 'Quinquinquagintillion',abbrev: 'Qiqig' },
        { power: 171, word: 'Sexquinquagintillion',abbrev: 'Sxqig' },
        { power: 174, word: 'Septenquinquagintillion',abbrev: 'Spqig' },
        { power: 177, word: 'Octoquinquagintillion',abbrev: 'Ocqig' },
        { power: 180, word: 'Novemquinquagintillion',abbrev: 'Noqig' },
        { power: 183, word: 'Sexagintillion',     abbrev: 'Sxg' },
        { power: 186, word: 'Unsexagintillion',   abbrev: 'Usxg' },
        { power: 189, word: 'Duosexagintillion',  abbrev: 'Dsxg' },
        { power: 192, word: 'Tresexagintillion',  abbrev: 'Tsxg' },
        { power: 195, word: 'Quattuorsexagintillion',abbrev: 'Qsxg' },
        { power: 198, word: 'Quinsexagintillion', abbrev: 'Qisxg' },
        { power: 201, word: 'Sexsexagintillion',  abbrev: 'Sxsxg' },
        { power: 204, word: 'Septensexagintillion',abbrev: 'Spsxg' },
        { power: 207, word: 'Octosexagintillion', abbrev: 'Ocsxg' },
        { power: 210, word: 'Novemsexagintillion',abbrev: 'Nosxg' },
        { power: 213, word: 'Septuagintillion',   abbrev: 'Spg' },
        { power: 243, word: 'Octogintillion',     abbrev: 'Ocg' },
        { power: 273, word: 'Nonagintillion',     abbrev: 'Nog' },
        { power: 303, word: 'Centillion',         abbrev: 'C' },
    ].map(u => ({ ...u, value: Math.pow(10, u.power) }));
    const UNIT_THRESHOLD = UNIT_TABLE.length ? UNIT_TABLE[UNIT_TABLE.length - 1].value * 1000 : Number.MAX_VALUE;

    function isBeyondSupportedMagnitude(val) {
        if (!Number.isFinite(val)) return true;
        const abs = Math.abs(val);
        if (abs === 0) return false;
        if (abs >= UNIT_THRESHOLD) return true;
        if (abs >= MAX_SAFE) return true;
        return false;
    }

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
    function quantizeValueForCalc(val) {
        
        if (!Number.isFinite(val)) return 0;
        if (val <= 0) return 0;
        const abs = Math.abs(val);
        if (abs === 0) return 0;
        if (isBeyondSupportedMagnitude(abs)) return 0;
        
        return Math.floor(abs * 10) / 10;
    }

    function formatCompact(n) {
        if (!Number.isFinite(n)) return 'Infinity';
        const negative = n < 0 ? '-' : '';
        let abs = Math.abs(n);
        if (abs === 0) return '0';
        if (isBeyondSupportedMagnitude(abs)) return negative + 'Infinity';

        if (abs < 1000) {
            return negative + Math.floor(abs).toString();
        }

        let unit = null;
        for (let i = UNIT_TABLE.length - 1; i >= 0; i--) {
            const base = UNIT_TABLE[i].value;
            if (!Number.isFinite(base)) continue;
            if (abs >= base) {
                unit = UNIT_TABLE[i];
                break;
            }
        }
        if (!unit) unit = UNIT_TABLE[0];
        
        const scaledTimesThousand = Math.floor((abs / unit.value) * 1000);
        const scaled = scaledTimesThousand / 1000;
        const text = scaled.toFixed(3);
        return negative + text + unit.abbrev;
    }

    
    function formatCounterMasked(n) {
        if (!Number.isFinite(n)) return 'Infinity';
        const negative = n < 0 ? '-' : '';
        let abs = Math.abs(n);
        if (abs === 0) return '0';
        
        if (abs < 1000) {
            return negative + Math.floor(abs).toString();
        }
        
        let unit = null;
        for (let i = UNIT_TABLE.length - 1; i >= 0; i--) {
            const base = UNIT_TABLE[i].value;
            if (!Number.isFinite(base)) continue;
            if (abs >= base) { unit = UNIT_TABLE[i]; break; }
        }
        if (!unit) unit = UNIT_TABLE[0];
        const scaledTimesThousand = Math.floor((abs / unit.value) * 1000);
        const scaled = scaledTimesThousand / 1000;
        const text = scaled.toFixed(3);
        return negative + text + unit.abbrev;
    }

    
    function formatWithWords(n) {
        if (!Number.isFinite(n)) return 'Infinity';
        let abs = Math.abs(n);
        const negative = n < 0 ? '-' : '';
        if (abs < 1000) return negative + Math.floor(abs).toString();
        let unit = null;
        for (let i = UNIT_TABLE.length - 1; i >= 0; i--) {
            const base = UNIT_TABLE[i].value;
            if (!Number.isFinite(base)) continue;
            if (abs >= base) { unit = UNIT_TABLE[i]; break; }
        }
        if (!unit) unit = UNIT_TABLE[0];
        const scaled = Math.floor(abs / unit.value);
        return negative + scaled.toString() + ' ' + unit.word;
    }

    
    function formatWordsSmallDecimals(n) {
        if (!Number.isFinite(n)) return 'Infinity';
        const negative = n < 0 ? '-' : '';
        let abs = Math.abs(n);
        
        if (abs < 1000) {
            const scaledRaw = abs;
            if (scaledRaw < 10) {
                const floored = Math.floor(scaledRaw * 10) / 10;
                const text = (Math.floor(floored) === floored) ? String(Math.floor(floored)) : floored.toFixed(1);
                return negative + text;
            }
            return negative + String(Math.floor(scaledRaw));
        }
        
        let unit = null;
        for (let i = UNIT_TABLE.length - 1; i >= 0; i--) {
            const base = UNIT_TABLE[i].value;
            if (!Number.isFinite(base)) continue;
            if (abs >= base) { unit = UNIT_TABLE[i]; break; }
        }
        if (!unit) unit = UNIT_TABLE[0];
        const scaledRaw = abs / unit.value;
        let text;
        if (scaledRaw < 10) {
            const floored = Math.floor(scaledRaw * 10) / 10;
            text = (Math.floor(floored) === floored) ? String(Math.floor(floored)) : floored.toFixed(1);
        } else {
            text = String(Math.floor(scaledRaw));
        }
        return negative + text + ' ' + unit.word;
    }

    function isValueInfinite(val) {
        return isBeyondSupportedMagnitude(val);
    }

    function normalizeFundsValue(val) {
        if (!Number.isFinite(val)) return Number.POSITIVE_INFINITY;
        const abs = Math.abs(val);
        if (isBeyondSupportedMagnitude(abs)) return Number.POSITIVE_INFINITY;
        if (abs >= MAX_SAFE) return Number.POSITIVE_INFINITY;
        return quantizeValueForCalc(val);
    }

    const numberTools = {
        format: formatCompact,
        quantize: quantizeValueForCalc,
        isInfinite: isValueInfinite,
        normalizeFunds: normalizeFundsValue,
        formatCounter: formatCounterMasked,
        formatWords: formatWithWords,
        formatWordsSmallDecimals,
        formatAbbrev: formatCompact,
    };
    window.fjfeClickerNumbers = numberTools;
    
    
    (function setupAudio(){
        const KEY_MUTE = 'fjfeClickerMute';
        const sources = {
            menu_open: 'icons/clicker/menu_open.mp3',
            menu_close: 'icons/clicker/menu_close.mp3',
            click: 'icons/clicker/click.mp3',
            upgrade: 'icons/clicker/upgrade.mp3',
            deny: 'icons/clicker/deny.mp3',
            prestige: 'icons/clicker/prestige.mp3',
            production: 'icons/clicker/production.mp3',
        };
        const baseVolume = 0.2; 
    const cache = new Map();
        function toURL(p){ try { return (chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL(p) : p; } catch(_) { return p; } }
        function preload(){
            Object.keys(sources).forEach(name => {
                try {
                    const url = toURL(sources[name]);
                    const a = new Audio(url);
                    a.preload = 'auto';
                    cache.set(name, a);
                } catch(_) {}
            });
        }
        function isMuted(){ try { return localStorage.getItem(KEY_MUTE) === '1'; } catch(_) { return false; } }
        function setMuted(flag){ try { localStorage.setItem(KEY_MUTE, flag ? '1' : '0'); } catch(_) {} }
        function play(name, opts){
            try {
                if (isMuted()) return;
                const base = cache.get(name) || null;
                const src = base ? base.src : toURL(sources[name] || '');
                if (!src) return;
                const a = new Audio(src);
                const mult = (opts && typeof opts.multiplier === 'number') ? opts.multiplier : 1;
                const vol = Math.max(0, Math.min(1, (opts && typeof opts.volume === 'number') ? opts.volume : Math.min(1, baseVolume * mult)));
                a.volume = vol;
                a.currentTime = 0;
                a.play().catch(()=>{});
            } catch(_) {}
        }
        
        function suppressClose(ms){
            try { window.__fjfe_suppressCloseUntil = Date.now() + Math.max(0, ms||0); } catch(_) {}
        }
        preload();
        window.fjfeAudio = { play, isMuted, setMuted, suppressClose };
    })();
    
    (function setupFixedPointStorage(){
        const KEY = 'fjTweakerClickerCount';
        const SCALE = 10n;
        function readRaw() {
            try {
                const raw = localStorage.getItem(KEY);
                if (!raw) return { infinite: false, scaled: 0n };
                if (raw === 'Infinity') return { infinite: true, scaled: 0n };
                if (raw.startsWith && raw.startsWith('fp10:')) {
                    const body = raw.slice(5);
                    try { return { infinite: false, scaled: BigInt(body) }; } catch(_) { return { infinite: false, scaled: 0n }; }
                }
                
                const p = parseFloat(raw);
                if (!Number.isFinite(p) || p < 0) return { infinite: false, scaled: 0n };
                const q = Math.floor(p * 10);
                return { infinite: false, scaled: BigInt(q) };
            } catch(_) { return { infinite: false, scaled: 0n }; }
        }
        function writeRaw(state) {
            try {
                if (!state || state.infinite) { localStorage.setItem(KEY, 'Infinity'); return; }
                const s = state.scaled;
                const safe = (typeof s === 'bigint') ? s : 0n;
                const clamped = safe < 0n ? 0n : safe;
                localStorage.setItem(KEY, 'fp10:' + clamped.toString());
            } catch(_) {}
        }
        function addScaled(delta) {
            try {
                const cur = readRaw();
                if (cur.infinite) return;
                const d = (typeof delta === 'bigint') ? delta : 0n;
                let next = cur.scaled + d;
                if (next < 0n) next = 0n;
                writeRaw({ infinite: false, scaled: next });
            } catch(_) {}
        }
        function toDisplayNumber(state) {
            if (!state || state.infinite) return Number.POSITIVE_INFINITY;
            return Number(state.scaled) / 10;
        }
        window.fjfeNumbersStorage = { KEY, SCALE, readRaw, writeRaw, addScaled, toDisplayNumber };
    })();
    function canAffordConsideringFormat(money, price) {
        
        if (numberTools.isInfinite(price)) return numberTools.isInfinite(money);
        const normalizedMoney = numberTools.normalizeFunds(money);
        const normalizedPrice = numberTools.quantize(Math.max(0, price));
        return normalizedMoney >= normalizedPrice;
    }

    
    
    function getPriceDiscountFactorGlobal() { return 1.0; }

    
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

    
    function updateMaxThumbs(val) {
        const current = loadInt('fjTweakerClickerMax', 0);
        if (val > current) setInt('fjTweakerClickerMax', val);
    }
    

    
    

    
    
    function loadUpgradeLevelByIdGlobal(id) {
        try {
            const raw = localStorage.getItem(`fjTweakerUpgradeNum_${id}`);
            const n = parseInt(raw, 10);
            return Number.isFinite(n) && n > 0 ? n : 0;
        } catch(_) {
          return 0;
        }
        }

        
        const TAB_ID = (Math.random().toString(36).slice(2)) + '-' + Date.now();
        function tryBecomeLeader() {
            try {
                const now = Date.now();
                const raw = localStorage.getItem('fjfePassiveLeader');
                let leader = null;
                try { leader = raw ? JSON.parse(raw) : null; } catch(_) { leader = null; }
                if (!leader || !leader.id || (now - (leader.ts || 0)) > 2500) {
                    
                    localStorage.setItem('fjfePassiveLeader', JSON.stringify({ id: TAB_ID, ts: now }));
                    const verifyRaw = localStorage.getItem('fjfePassiveLeader');
                    let verify = null; try { verify = verifyRaw ? JSON.parse(verifyRaw) : null; } catch(_) { verify = null; }
                    return verify && verify.id === TAB_ID;
                }
                return leader.id === TAB_ID;
            } catch(_) { return true; }
        }
        function heartbeatIfLeader() {
            try {
                const raw = localStorage.getItem('fjfePassiveLeader');
                let leader = null; try { leader = raw ? JSON.parse(raw) : null; } catch(_) { leader = null; }
                if (leader && leader.id === TAB_ID) {
                    localStorage.setItem('fjfePassiveLeader', JSON.stringify({ id: TAB_ID, ts: Date.now() }));
                    return true;
                }
            } catch(_) {}
            return false;
        }

        function passiveTickOnce() {
            if (!(window.fjTweakerSettings && window.fjTweakerSettings.clicker2)) return;
            try {
                
                if (!tryBecomeLeader() && !heartbeatIfLeader()) {
                    return;
                }
                const rawRps = (window.fjfeRcProd && typeof window.fjfeRcProd.getTotalRps === 'function') ? window.fjfeRcProd.getTotalRps() : 0;
                const rpsInt = numberTools.quantize(rawRps);
                const storage = window.fjfeNumbersStorage;
                const curState = storage ? storage.readRaw() : { infinite: false, scaled: 0n };
                if (curState.infinite) {
                    try { if (typeof window.fjfeClickerV2SetClickBonus === 'function') window.fjfeClickerV2SetClickBonus(curState); } catch(_) {}
                    return;
                }
                const rpsScaled = BigInt(Math.floor(Math.max(0, rpsInt) * 10));
                if (rpsScaled > 0n) {
                    const nextScaled = curState.scaled + rpsScaled;
                    if (storage) storage.writeRaw({ infinite: false, scaled: nextScaled });
                    const disp = document.getElementById('fjfe-clicker-count-v2');
                    if (disp) {
                        const tools = window.fjfeClickerNumbers;
                        const val = storage ? storage.toDisplayNumber({ infinite:false, scaled: nextScaled }) : (Number(nextScaled)/10);
                        disp.textContent = (tools && tools.formatCounter) ? tools.formatCounter(val) : formatCompact(val);
                    }
                    try { if (window.fjfeRcDebug && typeof window.fjfeRcDebug.refreshRaw === 'function') window.fjfeRcDebug.refreshRaw(); } catch(_) {}
                    try { updateMaxThumbs(Number(storage ? storage.toDisplayNumber({ infinite:false, scaled: nextScaled }) : (Number(nextScaled)/10))); } catch(_) {}
                    try { if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors(); } catch(_) {}
                    try { if (typeof window.fjfeRefreshStoreAffordability === 'function') window.fjfeRefreshStoreAffordability(); } catch(_) {}
                    
                    try { if (window.fjfeStats) window.fjfeStats.addPassive(Number(rpsScaled)/10); } catch(_) {}
                }
                try { if (typeof window.fjfeClickerV2SetClickBonus === 'function') window.fjfeClickerV2SetClickBonus(rawRps); } catch(_) {}
            } catch(_) {}
        }
    function startPassiveEngine() {
        if (!window.fjfeClickerV2PassiveTimer) {
            window.fjfeClickerV2PassiveTimer = setInterval(passiveTickOnce, 1000);
        }
    }
    function stopPassiveEngine() {
        if (window.fjfeClickerV2PassiveTimer) {
            clearInterval(window.fjfeClickerV2PassiveTimer);
            window.fjfeClickerV2PassiveTimer = null;
        }
    }
    
    
    if (window.fjTweakerSettings && window.fjTweakerSettings.clicker2) {
        startPassiveEngine();
    }

    
    window.fjfeRcMain = {
        refresh: function() {
            try {
                const storage = window.fjfeNumbersStorage;
                const st = storage ? storage.readRaw() : { infinite:false, scaled:0n };
                const val = storage ? storage.toDisplayNumber(st) : 0;
                const disp = document.getElementById('fjfe-clicker-count-v2');
                if (disp) {
                    const tools = window.fjfeClickerNumbers;
                    const text = (tools && tools.formatCounter) ? tools.formatCounter(val) : formatCompact(val);
                    disp.textContent = text;
                }
                if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors();
                try { if (typeof window.fjfeRefreshStoreAffordability === 'function') window.fjfeRefreshStoreAffordability(); } catch(_) {}
            } catch (_) {}
        }
    };

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
            if (window.fjTweakerSettings && window.fjTweakerSettings.clicker2) {
                window.fjfeClickerV2Open && window.fjfeClickerV2Open();
            }
        } catch (e) {}
    }

    

    
    function createClickerWindow() {
        function closeMenu() {
            try {
                if (window.fjfeRcProd) window.fjfeRcProd.closeMenu();
                if (window.fjfeRcSettings) window.fjfeRcSettings.closeMenu();
                if (window.fjfeRcStats) window.fjfeRcStats.closeMenu();
            } catch (_) {}
        }
        function toggleMenu(color) {
            if (color !== 'red') return;
            const prodIsOpen = !!(window.fjfeRcProd && typeof window.fjfeRcProd.isOpen === 'function' && window.fjfeRcProd.isOpen());
            
            if (!prodIsOpen) {
                
                try { if (window.fjfeAudio && window.fjfeAudio.suppressClose) window.fjfeAudio.suppressClose(300); } catch(_) {}
            }
            try { if (window.fjfeRcSettings) window.fjfeRcSettings.closeMenu(); } catch(_) {}
            try { if (window.fjfeRcStats) window.fjfeRcStats.closeMenu(); } catch(_) {}
            try { if (window.fjfeRcProd) { window.fjfeRcProd.init({ anchorEl: win }); window.fjfeRcProd.toggleMenu(); } } catch(_) {}
        }

        
        function refreshOpenMenuFor(color) {
            try {
                if (color==='red' && window.fjfeRcProd) {
                    
                    if (window.fjfeAudio && window.fjfeAudio.suppressClose) window.fjfeAudio.suppressClose(300);
                    window.fjfeRcProd.init({ anchorEl: win });
                    window.fjfeRcProd.toggleMenu();
                    window.fjfeRcProd.toggleMenu();
                }
            } catch(_) {}
        }

        
        
    let win = document.getElementById('fjfe-clicker-window-v2');
        if (win) {
            win.style.display = 'flex';
            win.style.opacity = '1';
            return;
        }
    win = document.createElement('div');
    win.id = 'fjfe-clicker-window-v2';
        Object.assign(win.style, {
            position: 'absolute',
            bottom: 'auto',
            top: 'auto',
            right: 'auto',
            width: '180px',
            height: '240px',
            padding: '40px 12px 12px 12px',
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
            overflow: 'visible',
        });

        const bottomRow = document.createElement('div');
        Object.assign(bottomRow.style, {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            position: 'absolute',
            left: '8px',
            right: '8px',
            bottom: '8px',
            zIndex: 2,
        });
        
        const btnStyleBottom = {
            width: '48px',
            height: '48px',
            border: 'none',
            borderRadius: '8px',
            margin: '0',
            padding: '0',
            cursor: 'pointer',
            boxShadow: '0 2px 6px #0006',
            outline: 'none',
            transition: 'filter 0.12s, transform 0.08s',
        };
        
    const btnRed = document.createElement('button');
    Object.assign(btnRed.style, btnStyleBottom, {
        background: '#61afff',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0px',
        padding: '0 10px'
    });
    
        
        const makeArrowIcon = () => {
            const img = document.createElement('img');
            const src = chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('icons/clicker/down_icon.png') : 'icons/clicker/down_icon.png';
            img.src = src;
            Object.assign(img.style, {
                width: '28px',
                height: '28px',
                objectFit: 'contain',
                pointerEvents: 'none',
                userSelect: 'none',
                flex: '0 0 auto'
            });
            return img;
        };
        
        const arrowLeft = makeArrowIcon();
        const arrowRight = makeArrowIcon();
        
        const btnLabel = document.createElement('span');
        btnLabel.textContent = 'PRODUCTION';
        Object.assign(btnLabel.style, {
            fontWeight: '800',
            letterSpacing: '0.18em',
            fontSize: '11px',
            color: '#191919',
            pointerEvents: 'none',
            userSelect: 'none',
            flex: '1 1 auto',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
        
        btnRed.appendChild(arrowLeft);
        btnRed.appendChild(btnLabel);
        btnRed.appendChild(arrowRight);
        btnRed.onmousedown = btnRed.ontouchstart = function() {
            btnRed.style.transform = 'scale(0.96)';
        };
        btnRed.onmouseup = btnRed.onmouseleave = btnRed.ontouchend = function() {
            btnRed.style.transform = '';
        };
        btnRed.onclick = function(e) {
            e.preventDefault();
            toggleMenu('red');
        };
        
    bottomRow.appendChild(btnRed);
    win.appendChild(bottomRow);

        
        
        const btnStyleSmall = {
            width: '22px',
            height: '22px',
            border: 'none',
            borderRadius: '6px',
            margin: '0',
            padding: '0',
            cursor: 'pointer',
            boxShadow: '0 1px 4px #0003',
            outline: 'none',
            transition: 'filter 0.12s, transform 0.08s',
        };
        
        
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
        const iconAnchor = document.createElement('div');
        Object.assign(iconAnchor.style, {
            position: 'absolute',
            left: '50%',
            top: '98px',
            transform: 'translate(-50%, -50%)',
            width: '68px',
            height: '68px',
            pointerEvents: 'none',
            zIndex: 0,
        });
        const iconImg = document.createElement('img');
        iconImg.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/clicker/repost.png') : 'icons/clicker/repost.png';
        iconImg.onerror = () => {
            const fb = chrome.runtime.getURL ? chrome.runtime.getURL('icons/error.png') : 'icons/error.png';
            iconImg.src = fb;
        };
        Object.assign(iconImg.style, {
            width: '100%',
            height: '100%',
            opacity: 0.18,
            filter: 'drop-shadow(0 2px 8px #0008)',
            pointerEvents: 'none',
            userSelect: 'none',
            willChange: 'transform',
            animation: 'fjfe-repost-spin 6s linear infinite',
        });
        iconAnchor.appendChild(iconImg);
        iconWrap.appendChild(iconAnchor);

        
        if (!document.getElementById('fjfe-repost-spin-style')) {
            const style = document.createElement('style');
            style.id = 'fjfe-repost-spin-style';
            style.textContent = `@keyframes fjfe-repost-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }
        const CLICKER_COUNT_KEY = 'fjTweakerClickerCount';
        function loadClickCount() {
            try {
                const storage = window.fjfeNumbersStorage;
                const st = storage ? storage.readRaw() : { infinite:false, scaled:0n };
                return storage ? storage.toDisplayNumber(st) : 0;
            } catch (e) { return 0; }
        }
        function persistClickCount(val) {
            try {
                const storage = window.fjfeNumbersStorage;
                if (!storage) return;
                const num = Number(val);
                if (!Number.isFinite(num) || numberTools.isInfinite(num)) {
                    storage.writeRaw({ infinite: true, scaled: 0n });
                    return;
                }
                const scaled = BigInt(Math.floor(Math.max(0, num || 0) * 10));
                storage.writeRaw({ infinite: false, scaled });
            } catch (e) {}
        }

        let clickCount = loadClickCount();

        
    win.style.position = 'absolute';
    win.style.overflow = 'visible';

        
    win.appendChild(iconWrap);

        const storeSection = document.createElement('div');
        storeSection.setAttribute('data-role', 'fjfe-permanent-upgrades');
        Object.assign(storeSection.style, {
            position: 'absolute',
            left: '8px',
            right: '8px',
            bottom: '48px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '0',
            zIndex: 3,
        });

        try {
            if (window.fjfeRcStore && typeof window.fjfeRcStore.init === 'function') {
                window.fjfeRcStore.init({ host: storeSection });
            }
        } catch (_) {}

        try {
            win.insertBefore(storeSection, bottomRow);
        } catch (_) {}
    
    try { if (window.fjfeRcInfo) window.fjfeRcInfo.init({ anchorMenuEl: win }); } catch(_) {}

        
    const dragHandle = document.createElement('div');
        Object.assign(dragHandle.style, {
            alignSelf: 'stretch',
            cursor: 'move',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#a5a5a5',
            borderBottom: '1px solid #1f1f1f',
            padding: '3px 8px',
            userSelect: 'none',
            position: 'absolute',
            top: '0px',
            left: '0px',
            right: '0px',
            minHeight: '21px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            zIndex: 3,
        });
        dragHandle.textContent = 'D R A G';
        
        
        try {
            if (window.fjfeRcSettings && typeof window.fjfeRcSettings.addSettingsButton === 'function') {
                const sb = window.fjfeRcSettings.addSettingsButton(win);
                if (sb) {
                    win.appendChild(sb);
                }
            }
        } catch(_) {}

        
        try {
            if (window.fjfeRcStats && typeof window.fjfeRcStats.addStatsButton === 'function') {
                const stb = window.fjfeRcStats.addStatsButton(win);
                if (stb) {
                    win.appendChild(stb);
                }
            }
        } catch(_) {}

    
        const rpsLabel = document.createElement('span');
        rpsLabel.id = 'fjfe-clicker-rps-label-v2';
        Object.assign(rpsLabel.style, {
            marginLeft: 'auto',
            color: '#bbb',
            fontWeight: '700',
            fontSize: '11px',
            letterSpacing: '0.04em',
            userSelect: 'none'
        });
        rpsLabel.textContent = '+0.000 RPS';
        rpsLabel.title = '+0.000';
        dragHandle.appendChild(rpsLabel);

        
        
        function _formatFullWords(val) {
            try {
                const tools = window.fjfeClickerNumbers;
                if (tools && typeof tools.formatWordsSmallDecimals === 'function') {
                    return tools.formatWordsSmallDecimals(val);
                }
            } catch(_) {}
            return String(val);
        }

        window.fjfeClickerV2SetClickBonus = function(v) {
            try {
                const label = document.getElementById('fjfe-clicker-rps-label-v2');
                if (!label) return;
                const normalized = numberTools.quantize(v);
                const isInf = numberTools.isInfinite && numberTools.isInfinite(v);
                const displayValue = isInf ? Number.POSITIVE_INFINITY : normalized;
                const fmt = (numberTools && typeof numberTools.formatAbbrev === 'function') ? numberTools.formatAbbrev : (numberTools.format || formatCompact);
                const txt = fmt(displayValue);
                label.textContent = '+' + txt + ' RPS';
                
                const full = _formatFullWords(displayValue);
                label.title = '+' + full + ' per second';
            } catch(_) {}
        };

        
        rpsLabel.addEventListener('mouseenter', function(){
            try {
                const rawRps = (window.fjfeRcProd && typeof window.fjfeRcProd.getTotalRps === 'function') ? window.fjfeRcProd.getTotalRps() : 0;
                const normalized = numberTools.quantize(rawRps);
                const isInf = numberTools.isInfinite && numberTools.isInfinite(rawRps);
                const displayValue = isInf ? Number.POSITIVE_INFINITY : normalized;
                const full = _formatFullWords(displayValue);
                rpsLabel.title = '+' + full + ' per second';
            } catch(_) {}
        });
        
        win.append(dragHandle);

        
        function getPurchasedClickUpgradeCount() {
            try {
                let count = 0;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!key) continue;
                    if (key.startsWith('fjTweakerStoreUpgrade_clickt')) {
                        const v = localStorage.getItem(key);
                        if (v === '1') count++;
                    }
                }
                return count;
            } catch(_) { return 0; }
        }

        function recomputeBonusesAndApply() {
            const rawRps = (window.fjfeRcProd && typeof window.fjfeRcProd.getTotalRps === 'function') ? window.fjfeRcProd.getTotalRps() : 0;
            if (typeof window.fjfeClickerV2SetClickBonus === 'function') window.fjfeClickerV2SetClickBonus(rawRps);
        }
        
        window.fjfeClickerV2Recompute = recomputeBonusesAndApply;
        
        recomputeBonusesAndApply();
        
        setInterval(() => {
            try {
                const rawRps = (window.fjfeRcProd && typeof window.fjfeRcProd.getTotalRps === 'function') ? window.fjfeRcProd.getTotalRps() : 0;
                if (typeof window.fjfeClickerV2SetClickBonus === 'function') window.fjfeClickerV2SetClickBonus(rawRps);
            } catch(_) {}
        }, 1000);

        
        const repostBtn = document.createElement('button');
        repostBtn.textContent = 'REPOST';
        Object.assign(repostBtn.style, {
            margin: '0',
            padding: '10px 15px',
            background: 'none',
            border: 'none',
            color: '#fff',
            font: "800 19px 'Segoe UI', sans-serif",
            letterSpacing: '0.12em',
            cursor: 'pointer',
            outline: 'none',
            transition: 'transform 0.056s cubic-bezier(.5,1.7,.5,1)',
            userSelect: 'none',
            boxShadow: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            position: 'absolute',
            left: '50%',
            top: '98px',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
        });
        repostBtn.style.alignSelf = 'center';
        repostBtn.onmousedown = repostBtn.ontouchstart = function() {
            repostBtn.style.transform = 'translate(-50%, -50%) scale(0.88)';
        };
        repostBtn.onmouseup = repostBtn.onmouseleave = repostBtn.ontouchend = function() {
            repostBtn.style.transform = 'translate(-50%, -50%)';
        };
                let _uiScheduled = false;
                let _lastPersistMs = 0;
                let pendingClickDeltaScaled = 0n;
        function _flushUiAndMaybePersist() {
                    const storage = window.fjfeNumbersStorage;
                    const cur = storage ? storage.readRaw() : { infinite:false, scaled:0n };
                    if (cur.infinite) {
                        pendingClickDeltaScaled = 0n;
                        const tools = window.fjfeClickerNumbers;
                        const txt = (tools && tools.formatCounter) ? tools.formatCounter(Number.POSITIVE_INFINITY) : 'Infinity';
                        countDisplay.textContent = txt;
                        try { if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors(); } catch(_) {}
                        _uiScheduled = false;
                        return;
                    }
                    const nextScaled = (cur.scaled + pendingClickDeltaScaled) < 0n ? 0n : (cur.scaled + pendingClickDeltaScaled);
                    clickCount = storage ? storage.toDisplayNumber({ infinite:false, scaled: nextScaled }) : (Number(nextScaled)/10);
                    {
                        const tools = window.fjfeClickerNumbers;
                        const txt = (tools && tools.formatCounter) ? tools.formatCounter(clickCount) : String(Math.floor(clickCount));
                        countDisplay.textContent = txt;
                    }
            const now = Date.now();
            if (now - _lastPersistMs > 120) {
                            if (storage) storage.writeRaw({ infinite:false, scaled: nextScaled });
                            try { updateMaxThumbs(clickCount); } catch(_) {}
                            try { if (window.fjfeRcDebug && typeof window.fjfeRcDebug.refreshRaw === 'function') window.fjfeRcDebug.refreshRaw(); } catch(_) {}
                            try {
                                const inc = Number(nextScaled - cur.scaled) / 10;
                                setInt('fjTweakerClickerClicks', loadInt('fjTweakerClickerClicks',0) + Math.max(0, Math.floor(inc)));
                            } catch(_) {}
                            _lastPersistMs = now;
                            pendingClickDeltaScaled = 0n; 
            }
            _uiScheduled = false;
                        try { if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors(); } catch(_) {}
                        try { if (typeof window.fjfeRefreshStoreAffordability === 'function') window.fjfeRefreshStoreAffordability(); } catch(_) {}
        }
        function getPurchasedScriptUpgradeCount() {
            try {
                let count = 0;
                for (let i = 1; i <= 15; i++) {
                    const id = `fjTweakerStoreUpgrade_scriptt${i}`;
                    if (localStorage.getItem(id) === '1') count++;
                }
                return count;
            } catch(_) { return 0; }
        }

        repostBtn.onclick = function() {
            
            let add = 1;
            try {
                const tools = window.fjfeClickerNumbers;
                const rawRps = (window.fjfeRcProd && typeof window.fjfeRcProd.getTotalRps === 'function') ? window.fjfeRcProd.getTotalRps() : 0;
                const isInf = tools && tools.isInfinite && tools.isInfinite(rawRps);
                if (isInf) {
                    const storage = window.fjfeNumbersStorage;
                    if (storage) storage.writeRaw({ infinite:true, scaled:0n });
                    else localStorage.setItem('fjTweakerClickerCount', 'Infinity');
                } else {
                    const rpsInt = numberTools.quantize(rawRps);
                    const count = getPurchasedClickUpgradeCount();
                    const bonus = Math.floor(rpsInt * (count * 0.05));
                    add = add + Math.max(0, bonus);
                    
                    const scriptCount = getPurchasedScriptUpgradeCount();
                    if (scriptCount > 0) {
                        const factor = 1 << Math.min(scriptCount, 30); 
                        add = add * factor;
                    }
                }
            } catch(_) {}
            pendingClickDeltaScaled = pendingClickDeltaScaled + BigInt(add * 10);
            try { if (window.fjfeAudio && typeof window.fjfeAudio.play === 'function') window.fjfeAudio.play('click', { multiplier: 0.75 }); } catch(_) {}
            
            try { if (window.fjfeStats) window.fjfeStats.addClick(add); } catch(_) {}
            try { if (window.fjfeRcStore && typeof window.fjfeRcStore.refresh === 'function') window.fjfeRcStore.refresh(); } catch(_) {}
            if (!_uiScheduled) {
                _uiScheduled = true;
                (window.requestAnimationFrame ? requestAnimationFrame : setTimeout)(_flushUiAndMaybePersist);
            }
        };
        win.append(repostBtn);

        

        
        const countRow = document.createElement('div');
        Object.assign(countRow.style, {
            position: 'absolute',
            top: '36px',
            left: '8px',
            right: '8px',
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
            zIndex: 2,
        });
        
    const thumbImg = document.createElement('img');
    thumbImg.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/clicker/thumb.png') : 'icons/clicker/thumb.png';
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
    countDisplay.id = 'fjfe-clicker-count-v2';
    countDisplay.textContent = (window.fjfeClickerNumbers && window.fjfeClickerNumbers.formatCounter)
        ? window.fjfeClickerNumbers.formatCounter(clickCount)
        : formatCompact(clickCount);
        countRow.appendChild(thumbImg);
        countRow.appendChild(countDisplay);
        win.append(countRow);

        
        const pos = loadPanelPosition();
        if (pos) {
            
            win.style.left = pos.left + 'px';
            win.style.top = pos.top + 'px';
            win.style.position = 'absolute';
        } else {
            
            const margin = 12;
            const width = win.offsetWidth || 180;
            const height = win.offsetHeight || 200;
            const sLeft = window.scrollX || window.pageXOffset || 0;
            const sTop = window.scrollY || window.pageYOffset || 0;
            const left = sLeft + Math.max(margin, window.innerWidth - width - margin);
            const top = sTop + Math.max(margin, window.innerHeight - height - margin);
            win.style.left = left + 'px';
            win.style.top = top + 'px';
        }

        
        
                function updateMenusPosition() {
                        try {
                          if (window.fjfeRcProd) window.fjfeRcProd.updatePosition();
                        }
 catch(_) {}
                        try {
                          if (window.fjfeRcInfo) window.fjfeRcInfo.updatePosition();
                        }
 catch(_) {}
                                                try {
                                                    if (window.fjfeRcSettings) window.fjfeRcSettings.updatePosition();
                                                } catch(_) {}
                                                try {
                                                    if (window.fjfeRcStats) window.fjfeRcStats.updatePosition();
                                                } catch(_) {}
                }
        let dragState = null;
        const startDrag = (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            event.stopPropagation();
            event.preventDefault();
            const rect = win.getBoundingClientRect();
            const vx = (window.scrollX || window.pageXOffset || 0);
            const vy = (window.scrollY || window.pageYOffset || 0);
            dragState = {
                pointerId: event.pointerId,
                startPageX: event.pageX,
                startPageY: event.pageY,
                originLeft: rect.left + vx,
                originTop: rect.top + vy
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
            const sLeft = window.scrollX || window.pageXOffset || 0;
            const sTop = window.scrollY || window.pageYOffset || 0;
            const maxLeft = sLeft + Math.max(margin, window.innerWidth - width - margin);
            const maxTop = sTop + Math.max(margin, window.innerHeight - height - margin);
            const clampedLeft = Math.min(Math.max(nextLeft, sLeft + margin), maxLeft);
            const clampedTop = Math.min(Math.max(nextTop, sTop + margin), maxTop);
            win.style.left = clampedLeft + 'px';
            win.style.top = clampedTop + 'px';
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
            const vx = (window.scrollX || window.pageXOffset || 0);
            const vy = (window.scrollY || window.pageYOffset || 0);
            
            persistPanelPosition({ left: rect.left + vx, top: rect.top + vy });
            try {
              if (window.fjfeRcInfo) window.fjfeRcInfo.updatePosition();
            }
 catch(_) {}
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
    
    win.addEventListener('fjfeClickerV2Close', function(){ try {
      if (window.fjfeRcProd) window.fjfeRcProd.closeMenu();
            if (window.fjfeRcSettings) window.fjfeRcSettings.closeMenu();
    }
 catch(_){} });
    
    window.addEventListener('scroll', updateMenusPosition, { passive: true });
    window.addEventListener('resize', updateMenusPosition);
        setTimeout(() => { win.style.opacity = '1'; }, 10);
        
        if (window.fjfeSlickAnimateIn) window.fjfeSlickAnimateIn(win);
    }
    
    window.fjfeClickerV2Open = function() {
        createClickerWindow();
    };
    window.fjfeClickerV2Close = function() {
        const win = document.getElementById('fjfe-clicker-window-v2');
        if (win) {
            win.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease';
            win.style.willChange = 'transform, opacity';
            win.style.transform = 'translateY(-12px)';
            win.style.opacity = '0';
            setTimeout(() => {
                if (win.parentNode) win.parentNode.removeChild(win);
                try { const evt = new Event('fjfeClickerV2Close'); win.dispatchEvent(evt); } catch(_) {}
                try { if (window.fjfeRcProd) window.fjfeRcProd.closeMenu(); } catch(_){ }
                try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch(_){ }
            }, 220);
        }
    };

    
    document.addEventListener('fjTweakerSettingsChanged', function(e) {
        const s = (e && e.detail) ? e.detail : window.fjTweakerSettings;
        if (s && typeof s.clicker2 !== 'undefined') {
            if (s.clicker2) {
                window.fjfeClickerV2Open && window.fjfeClickerV2Open();
                startPassiveEngine();
            } else {
                window.fjfeClickerV2Close && window.fjfeClickerV2Close();
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
