
(function () {
  const targetHost = 'funnyjunk.com';
  if (window.location.hostname !== targetHost) {
    return;
  }
  
  

  const HEHE_KEY = 'fjfe_hehe_overlay_shown';
  const heheImg = 'icons/hehe.png';
  const hiddenImg = 'icons/hidden.png';
  const vanishAudio = 'icons/vanish.mp3';

  function getResourceUrl(relPath) {
    return chrome.runtime.getURL(relPath);
  }

  function showHeheOverlay() {
    const img = document.createElement('img');
    img.src = getResourceUrl(heheImg);
    img.alt = 'hehe';
    img.style.position = 'fixed';
    img.style.right = '2vw';
    img.style.bottom = '2vh';
    img.style.zIndex = '2147483647';
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.maxWidth = '50vw';
    img.style.maxHeight = '50vh';
    img.style.transform = 'scale(0.5)';
    img.style.transition = 'opacity 1s linear';
    img.style.cursor = 'pointer';
    img.style.pointerEvents = 'auto';
    img.id = 'fjfe-hehe-overlay';


    let audioUnlocked = false;
    function unlockAudio() {
      if (audioUnlocked) return;
      try {
        const ctx = window.AudioContext || window.webkitAudioContext;
        if (ctx) {
          const audioCtx = new ctx();
          const buffer = audioCtx.createBuffer(1, 1, 22050);
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          source.start(0);
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
        }
      } catch (e) {}
      audioUnlocked = true;
      window.removeEventListener('pointerdown', unlockAudio, true);
      window.removeEventListener('keydown', unlockAudio, true);
    }
    window.addEventListener('pointerdown', unlockAudio, true);
    window.addEventListener('keydown', unlockAudio, true);

    function playVanishAudio() {
      try {
        const ctx = window.AudioContext || window.webkitAudioContext;
        if (ctx) {
          const audioCtx = new ctx();
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
        }
      } catch (e) {}
      const audio = document.createElement('audio');
      audio.src = getResourceUrl(vanishAudio);
      audio.preload = 'auto';
      audio.volume = 0.5;
      audio.style.position = 'fixed';
      audio.style.left = '-9999px';
      document.body.appendChild(audio);
      audio.play().catch(() => {});
      audio.addEventListener('ended', () => {
        audio.remove();
      });
    }

    img.addEventListener('mouseenter', function handleMouseEnter() {
      img.removeEventListener('mouseenter', handleMouseEnter);
      img.src = getResourceUrl(hiddenImg);
      playVanishAudio();
      img.style.opacity = '0';
      setTimeout(() => {
        img.remove();
      }, 1000);
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [HEHE_KEY]: true });
      }
    });

    document.body.appendChild(img);
  }


  function checkAndShowHehe() {
    function onFirstInteraction() {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([HEHE_KEY], (result) => {
          if (!result[HEHE_KEY]) {
            showHeheOverlay();
          }
        });
      } else {
        showHeheOverlay();
      }
      window.removeEventListener('pointerdown', onFirstInteraction, true);
      window.removeEventListener('keydown', onFirstInteraction, true);
    }
    window.addEventListener('pointerdown', onFirstInteraction, true);
    window.addEventListener('keydown', onFirstInteraction, true);
  }

  let __fjfe_baselineInit = false;
  let __fjfe_limitedModulesInit = false;
  let __fjfe_proModulesInit = false;
  const initModules = () => {
    if (!window.fjTweakerModules) {
      return;
    }
    const { sel, modjs, ratetrack, sccustom, userpop, nextMove, remtz, walcorn, apichk, warn, hunt } = window.fjTweakerModules;
    
    if (!__fjfe_baselineInit) {
      if (sel && typeof sel.init === 'function') sel.init();
      if (apichk && typeof apichk.init === 'function') apichk.init();
      __fjfe_baselineInit = true;
    }
    
    const initLimitedModules = () => {
      if (__fjfe_limitedModulesInit) return;
      if (modjs && typeof modjs.init === 'function') modjs.init();
      if (ratetrack && typeof ratetrack.init === 'function') ratetrack.init();
      if (userpop && typeof userpop.init === 'function') userpop.init();
      if (warn && typeof warn.init === 'function') warn.init();
      __fjfe_limitedModulesInit = true;
    };

    const initProModules = () => {
      if (__fjfe_proModulesInit) return;
      if (hunt && typeof hunt.init === 'function') hunt.init();
      if (sccustom && typeof sccustom.init === 'function') sccustom.init();
      if (nextMove && typeof nextMove.init === 'function') nextMove.init();
      if (remtz && typeof remtz.init === 'function') remtz.init();
      if (walcorn && typeof walcorn.init === 'function') walcorn.init();
      __fjfe_proModulesInit = true;
    };

    const authorized = (window.fjApichk && typeof window.fjApichk.isAuthorized === 'function') ? window.fjApichk.isAuthorized() : true;
    if (!authorized) return;

    const restricted = (window.fjApichk && typeof window.fjApichk.isRestricted === 'function') ? window.fjApichk.isRestricted() : false;
    if (restricted) {
      initLimitedModules();
      return;
    }

    initLimitedModules();
    initProModules();
  };

  const run = () => {
    
    checkAndShowHehe();
    
    
    try {
      document.querySelectorAll("[data-role='fjfe-debug-toggle-hotzone'],[data-role='fjfe-farm-debug-toggle-hotzone']").forEach(el => el.remove());
    } catch(_) {}
    
    initModules();

    
    document.addEventListener('fjApichkStatus', () => {
      try { initModules(); } catch (_) {}
    }, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
