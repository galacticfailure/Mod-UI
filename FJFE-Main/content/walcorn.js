(() => {
  const MODULE_KEY = 'walcorn';
  const SETTINGS_KEY = 'fjTweakerSettings';
  const DEFER_KEY = '__fj_walcorn_defer__';

  // Resolves extension-relative assets when running inside Chrome
  const resolveAssetUrl = (relativePath) => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
        return chrome.runtime.getURL(relativePath);
      }
    } catch (e) {}
    return relativePath;
  };

  let enabled = false;
  let audio = null;
  let audioPrimed = false;
  let gnomePrimaryUrl = null;
  let runescapePrimaryUrl = null;
  const activeOverlays = [];

  // Adds cache-busting query params so prank images refresh every run
  const buildBustedUrl = (relativePath) => {
    const base = resolveAssetUrl(relativePath);
    let ver = '';
    try {
      ver = (typeof chrome !== 'undefined' && chrome?.runtime?.getManifest?.().version) || '';
    }
 catch (e) {}
    const stamp = Date.now();
    const sep = base.includes('?') ? '&' : '?';
    return base + sep + 'v=' + encodeURIComponent(ver) + '&t=' + stamp;
  };

  const getFallbackGnome = () => resolveAssetUrl('icons/hehe.png');
  const getFallbackRunescape = () => resolveAssetUrl('icons/funnyjunk_2.png');

  // Lazily instantiates the global Audio element for the prank sound
  const ensureAudio = () => {
    if (audio) return audio;
    try {
      audio = new Audio(resolveAssetUrl('icons/gnome.mp3'));
      try {
        audio.preload = 'auto';
      }
 catch (e) {}
    } catch (e) {
      audio = null;
    }
    return audio;
  };

  // User-gesture hook so browsers allow autoplay later
  const primeAudioOnGesture = () => {
    if (audioPrimed) return;
    const onFirst = () => {
      audioPrimed = true;
      try {
        ensureAudio();
      }
 catch (e) {}
      try {
        document.removeEventListener('pointerdown', onFirst, true);
      }
 catch (e) {}
      try {
        document.removeEventListener('keydown', onFirst, true);
      }
 catch (e) {}
    };
    document.addEventListener('pointerdown', onFirst, true);
    document.addEventListener('keydown', onFirst, true);
  };

  // Creates a high-z-index <img> overlay with fallback detection; returns node
  const makeOverlay = (imgUrl, styles = {}, fallbackUrl) => {
    const el = document.createElement('img');
    el.src = imgUrl;
    el.dataset.fjWalcornOverlay = '1';
    if (fallbackUrl) {
      el.onerror = () => { try {
        el.onerror = null; el.src = fallbackUrl;
      }
 catch (e) {} };
      el.addEventListener('load', () => {
        try {
          if ((el.naturalWidth || 0) === 0 || (el.naturalHeight || 0) === 0) { el.src = fallbackUrl; }
        } catch (e) {}
      });
    }
    el.style.position = 'fixed';
  el.style.zIndex = '2147483647';
    el.style.pointerEvents = 'none';
    el.style.opacity = '0';
    el.style.transition = 'opacity 120ms linear';
    Object.assign(el.style, styles);
    document.body.appendChild(el);
    try {
      activeOverlays.push(el);
    }
 catch (e) {}
    if (fallbackUrl) {
      setTimeout(() => {
        try {
          if ((el.naturalWidth || 0) === 0 || (el.naturalHeight || 0) === 0) { el.src = fallbackUrl; }
        } catch (e) {}
      }, 200);
    }
    return el;
  };

  // Quick fade-in/fade-out prank centered on screen
  const showGnome = () => {
    const primary = gnomePrimaryUrl || buildBustedUrl('icons/gnome.png');
    const el = makeOverlay(primary, { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }, getFallbackGnome());
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; }, 400);
    setTimeout(() => { try {
      el.remove();
    }
 catch (e) {} }, 650);
  };

  // Launches the bouncing Runescape guy for a few seconds
  const showRunescape = () => {
    const primary = runescapePrimaryUrl || buildBustedUrl('icons/runescape.png');
    const el = makeOverlay(primary, { left: '0', top: '0', height: '400px', transform: 'translate3d(0,0,0)', willChange: 'transform' }, getFallbackRunescape());

    const startBounce = () => {
      try {
        const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        let w = 0, h = 0;
        try {
          const nh = el.naturalHeight || 0;
          const nw = el.naturalWidth || 0;
          if (nh > 0 && nw > 0) {
            h = 400; w = Math.max(40, Math.round(nw * (h / nh)));
            el.style.width = w + 'px';
          }
        } catch (e) {}
        if (!w || !h) {
          const r = el.getBoundingClientRect();
          w = r.width || 320; h = r.height || 400;
        }
        let x = Math.max(0, Math.random() * (vw - w));
        let y = Math.max(0, Math.random() * (vh - h));
        let angle = Math.random() * Math.PI * 2;
        let speed = 520; 
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        let running = true;
        let startTime = performance.now();
        let last = startTime;
        const tick = (now) => {
          if (!running) return;
          const dt = Math.max(0, (now - last) / 1000);
          last = now;
          x += vx * dt; y += vy * dt;
          if (x <= 0) {
            x = 0; vx = Math.abs(vx);
          }

          else if (x + w >= vw) {
            x = vw - w; vx = -Math.abs(vx);
          }

          if (y <= 0) {
            y = 0; vy = Math.abs(vy);
          }

          else if (y + h >= vh) {
            y = vh - h; vy = -Math.abs(vy);
          }

          el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          if (now - startTime >= 3000) {
            running = false; return;
          }

          requestAnimationFrame(tick);
        };
        requestAnimationFrame(() => { el.style.opacity = '1'; requestAnimationFrame(tick); });
        setTimeout(() => { el.style.opacity = '0'; }, 3000 - 160);
        setTimeout(() => { try {
          el.remove();
        }
 catch (e) {} }, 3200);
      } catch (e) {
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        setTimeout(() => { el.style.opacity = '0'; }, 3000 - 200);
        setTimeout(() => { try {
          el.remove();
        }
 catch (ee) {} }, 3200);
      }
    };

    const onLoadOrReady = () => { try {
      el.removeEventListener('load', onLoadOrReady);
    }
 catch (e) {} startBounce(); };
    if (el.complete && (el.naturalWidth || 0) > 0) { startBounce(); }
    else { try {
      el.addEventListener('load', onLoadOrReady);
    }
 catch (e) {
      startBounce();
    }
 }
  };

  
  // Plays the prank audio, retrying with fresh Audio objects if needed
  const playSound = () => {
    const a = ensureAudio();
    if (a) {
      try {
        a.volume = 1;
      }
 catch (_) {}
      try {
        a.currentTime = 0;
      }
 catch (_) {}
      try {
        a.play().catch(() => {
          try {
            const url = resolveAssetUrl('icons/gnome.mp3');
            const inst = new Audio(url);
            try {
              inst.volume = 1;
            }
 catch (e) {}
            inst.play().catch(() => {});
          } catch (_) {}
        });
      } catch (_) {}
      try {
        setTimeout(() => {
          try { if (a.paused) { a.currentTime = 0; a.play().catch(()=>{}); } } catch (_) {}
        }, 0);
      } catch (_) {}
      return;
    }
    try {
      const url = resolveAssetUrl('icons/gnome.mp3');
      const inst = new Audio(url);
      try {
        inst.volume = 1;
      }
 catch (e) {}
      inst.play().catch(() => {});
    } catch (_) {}
  };

  // Detects navigation clicks so we can defer the prank until next page
  const isSameTabNavigationClick = (e) => {
    try {
      if (!e || typeof e !== 'object') return false;
      if (e.defaultPrevented) return false; 
      if (e.button !== 0) return false; 
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false; 
      const a = e.target && (e.target.closest?.('a[href]'));
      if (!a) return false;
      if (a.target && a.target.toLowerCase() === '_blank') return false;
      if (a.hasAttribute('download')) return false;
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('javascript:')) return false;
      
      return true;
    } catch (_) {
      return false;
    }

  };

  // Randomly triggers either overlay (1% runescape, next 10% gnome)
  const handleAction = (e) => {
    if (!enabled) return;
    const r = Math.random();
    let effect = null;
    if (r < 0.01) effect = 'runescape';
    else if (r < 0.11) effect = 'gnome';
    if (!effect) return;

    
    if (isSameTabNavigationClick(e)) {
      try {
        sessionStorage.setItem(DEFER_KEY, JSON.stringify({ effect, ts: Date.now() }));
      } catch (_) {}
      return;
    }

    try {
      playSound();
      if (effect === 'runescape') showRunescape(); else showGnome();
    } catch (_) {}
  };

  // Toggles listeners based on fjTweaker setting events
  const handleSettingsChanged = (e) => {
    const s = (e && e.detail) ? e.detail : (window[SETTINGS_KEY] || {});
    const wants = Boolean(s && s.walcorn);
    if (wants === enabled) return;
    enabled = wants;
    if (enabled) {
      document.addEventListener('click', handleAction, true);
      primeAudioOnGesture();
      try {
        ensureAudio();
      }
 catch (ex) {}
    } else {
      try {
        document.removeEventListener('click', handleAction, true);
      }
 catch (ex) {}
    }
  };

  // Bootstraps asset preload, deferred pranks, and event listeners
  const init = () => {
    try {
      const s = window[SETTINGS_KEY] || {};
      enabled = Boolean(s.walcorn);
      
      try {
        const raw = sessionStorage.getItem(DEFER_KEY);
        if (raw) {
          sessionStorage.removeItem(DEFER_KEY);
          const obj = JSON.parse(raw);
          if (obj && obj.effect && Math.abs(Date.now() - (obj.ts || 0)) < 15000) {
            
            setTimeout(() => {
              try { if (enabled) { playSound(); obj.effect === 'runescape' ? showRunescape() : showGnome(); } } catch (_) {}
            }, 60);
          }
        }
      } catch (_) {}
      try {
        const testImg1 = new Image();
        const candidate1 = buildBustedUrl('icons/gnome.png');
        testImg1.onload = () => { try {
          if ((testImg1.naturalWidth || 0) > 0) gnomePrimaryUrl = candidate1; else gnomePrimaryUrl = getFallbackGnome();
        }
 catch (e) {
          gnomePrimaryUrl = getFallbackGnome();
        }
 };
        testImg1.onerror = () => { gnomePrimaryUrl = getFallbackGnome(); };
        testImg1.src = candidate1;
      } catch (e) {
        gnomePrimaryUrl = getFallbackGnome();
      }

      try {
        const testImg2 = new Image();
        const candidate2 = buildBustedUrl('icons/runescape.png');
        testImg2.onload = () => { try {
          if ((testImg2.naturalWidth || 0) > 0) runescapePrimaryUrl = candidate2; else runescapePrimaryUrl = getFallbackRunescape();
        }
 catch (e) {
          runescapePrimaryUrl = getFallbackRunescape();
        }
 };
        testImg2.onerror = () => { runescapePrimaryUrl = getFallbackRunescape(); };
        testImg2.src = candidate2;
      } catch (e) {
        runescapePrimaryUrl = getFallbackRunescape();
      }

      if (enabled) {
        document.addEventListener('click', handleAction, true);
        primeAudioOnGesture();
        try {
          ensureAudio();
        }
 catch (e) {}
      }
    } catch (e) {}
    document.addEventListener('fjTweakerSettingsChanged', handleSettingsChanged);
    
    try {
      window.addEventListener('beforeunload', () => {
        try { if (audio) { try {
          audio.pause();
        }
 catch (e) {} try {
          audio.currentTime = 0;
        }
 catch (e) {} } } catch (_) {}
        try { activeOverlays.forEach(el => { try {
          el.remove();
        }
 catch (e) {} }); } catch (_) {}
      });
    } catch (_) {}
  };

  if (!window.fjTweakerModules) window.fjTweakerModules = {};
  window.fjTweakerModules[MODULE_KEY] = { init };

})();
