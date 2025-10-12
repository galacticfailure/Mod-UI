

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
    const UNIT_SYMBOLS = [
        'K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc','Ud','Dd','Td','Qd','Qn','Sxd','Sxd','Ocd','Nod','Vg','Uv','Dv','Tv','Tg','Qg','Qig','Sxg','Spg','Ocg','Nog','C'
    ];
    const UNIT_TABLE = UNIT_SYMBOLS.map((symbol, idx) => ({
        symbol,
        value: Math.pow(1000, idx + 1)
    }));
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
        const negative = val < 0 ? -1 : 1;
        let abs = Math.abs(val);
        if (abs === 0) return 0;
        if (isBeyondSupportedMagnitude(abs)) return 0;

        if (abs < 1) {
            const truncated = Math.floor(abs * 10) / 10;
            return negative * truncated;
        }

        if (abs < 1000) {
            if (Number.isInteger(abs)) return negative * Math.floor(abs);
            const truncatedSmall = Math.floor(abs * 10) / 10;
            return negative * truncatedSmall;
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
        const quantized = scaled * unit.value;
        return negative * quantized;
    }

    function formatCompact(n) {
        if (!Number.isFinite(n)) return 'Infinite';
        const negative = n < 0 ? '-' : '';
        let abs = Math.abs(n);
        if (abs === 0) return '0.0';
        if (isBeyondSupportedMagnitude(abs)) return negative + 'Infinite';

        if (abs < 1) {
            const truncated = Math.floor(abs * 10) / 10;
            return negative + truncated.toFixed(1);
        }

        if (abs < 1000) {
            if (Number.isInteger(abs)) return negative + Math.floor(abs).toString();
            const truncatedSmall = Math.floor(abs * 10) / 10;
            return negative + truncatedSmall.toFixed(1);
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
        return negative + text + unit.symbol;
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
        normalizeFunds: normalizeFundsValue
    };
    window.fjfeClickerNumbers = numberTools;
    function canAffordConsideringFormat(money, price) {
        if (numberTools.isInfinite(price)) return true;
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

    
    function passiveTickOnce() {
        if (!(window.fjTweakerSettings && window.fjTweakerSettings.clicker2)) return;
        try {
            const rawRps = (window.fjfeRcProd && typeof window.fjfeRcProd.getTotalRps === 'function') ? window.fjfeRcProd.getTotalRps() : 0;
            const rpsInt = numberTools.quantize(rawRps);
            const raw = localStorage.getItem('fjTweakerClickerCount');
            const curParsed = parseFloat(raw);
            const curRaw = Number.isFinite(curParsed) ? curParsed : 0;
            const cur = numberTools.normalizeFunds(curRaw);
            if (numberTools.isInfinite(cur)) {
                try { if (typeof window.fjfeClickerV2SetClickBonus === 'function') window.fjfeClickerV2SetClickBonus(cur); } catch(_) {}
                return;
            }
            const next = Math.min(MAX_SAFE, Math.max(0, cur + rpsInt));
            if (rpsInt > 0 && next !== cur) {
                localStorage.setItem('fjTweakerClickerCount', String(next));
                const disp = document.getElementById('fjfe-clicker-count-v2');
                if (disp) disp.textContent = formatCompact(next);
                try { updateMaxThumbs(next); } catch(_) {}
                try { if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors(); } catch(_) {}
            }
            
            try { if (typeof window.fjfeClickerV2SetClickBonus === 'function') window.fjfeClickerV2SetClickBonus(rawRps); } catch(_) {}
        } catch(_) {  }
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
            } catch (_) {}
        }
        function toggleMenu(color) {
            if (color !== 'red') return;
            try { if (window.fjfeRcProd) { window.fjfeRcProd.init({ anchorEl: win }); window.fjfeRcProd.toggleMenu(); } } catch(_) {}
        }

        
        function refreshOpenMenuFor(color) {
            try { if (color==='red' && window.fjfeRcProd) { window.fjfeRcProd.init({ anchorEl: win }); window.fjfeRcProd.toggleMenu(); window.fjfeRcProd.toggleMenu(); } } catch(_) {}
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
            height: '220px',
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
        background: '#D2B48C',
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
            const src = chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('icons/down_icon.png') : 'icons/down_icon.png';
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
        iconImg.src = chrome.runtime.getURL ? chrome.runtime.getURL('icons/repost.png') : 'icons/repost.png';
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
                const raw = localStorage.getItem(CLICKER_COUNT_KEY);
                if (!raw) return 0;
                                const parsed = parseFloat(raw);
                                return Number.isFinite(parsed) ? parsed : 0;
            } catch (e) {
              return 0;
            }

        }
        function persistClickCount(val) {
            try {
                            const num = Number(val);
                            if (!Number.isFinite(num) || numberTools.isInfinite(num)) {
                                localStorage.setItem(CLICKER_COUNT_KEY, 'Infinity');
                                return;
                            }
                            const bounded = Math.min(MAX_SAFE, Math.max(0, num || 0));
                            localStorage.setItem(CLICKER_COUNT_KEY, String(bounded));
            }
 catch (e) {}
        }

        let clickCount = loadClickCount();

        
    win.style.position = 'absolute';
    win.style.overflow = 'visible';

        
    win.appendChild(iconWrap);
    
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
        rpsLabel.textContent = '+0 RPS';
        dragHandle.appendChild(rpsLabel);

        
        window.fjfeClickerV2SetClickBonus = function(v) {
            try {
                const label = document.getElementById('fjfe-clicker-rps-label-v2');
                if (!label) return;
                const normalized = numberTools.quantize(v);
                const isInf = numberTools.isInfinite && numberTools.isInfinite(v);
                const displayValue = isInf ? Number.POSITIVE_INFINITY : normalized;
                label.textContent = '+' + formatCompact(displayValue) + ' RPS';
            } catch(_) {}
        };
        
        win.append(dragHandle);

        
        let currentClickValue = 1; 
        function recomputeBonusesAndApply() {
            
            currentClickValue = 1;
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
        let pendingClickDelta = 0;
        function _flushUiAndMaybePersist() {
            
                        const baseRaw = loadClickCount();
                        const base = numberTools.normalizeFunds(baseRaw);
                        if (numberTools.isInfinite(base)) {
                                pendingClickDelta = 0;
                                countDisplay.textContent = formatCompact(base);
                                try {
                                    if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors();
                                }
 catch(_) {}
                                _uiScheduled = false;
                                return;
                        }
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
            
            
            pendingClickDelta = safeAdd(pendingClickDelta, currentClickValue);
            
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
    countDisplay.id = 'fjfe-clicker-count-v2';
    countDisplay.textContent = formatCompact(clickCount);
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
                        try { if (window.fjfeRcProd) window.fjfeRcProd.updatePosition(); } catch(_) {}
                        try { if (window.fjfeRcInfo) window.fjfeRcInfo.updatePosition(); } catch(_) {}
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
            try { if (window.fjfeRcInfo) window.fjfeRcInfo.updatePosition(); } catch(_) {}
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
                
                                try {
                                    const evt = new Event('fjfeClickerV2Close'); win.dispatchEvent(evt);
                                } catch(_) {}
                                try { if (window.fjfeRcProd) window.fjfeRcProd.closeMenu(); } catch(_){}
                                try { if (window.fjfeRcInfo) window.fjfeRcInfo.hide(); } catch(_){}
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
