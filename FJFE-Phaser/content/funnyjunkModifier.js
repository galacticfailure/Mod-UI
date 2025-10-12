
(function () {
  const targetHost = 'funnyjunk.com';
  if (window.location.hostname !== targetHost) {
    return;
  }

  
  
  function hasRequiredModSoLink() {
    try {
      const link = document.querySelector('a.modLinky[href="/mod-social/"]');
      if (!link) return false;
      const text = (link.textContent || '').trim();
      return text === 'ModSo';
    } catch (_) {
      return false;
    }
  }

  const HEHE_KEY = 'fjfe_hehe_overlay_shown';
  const heheImg = 'icons/hehe.png';
  const hiddenImg = 'icons/hidden.png';
  const vanishAudio = 'icons/vanish.mp3';

  function getResourceUrl(relPath) {
    return (typeof browser !== 'undefined' ? browser : chrome).runtime.getURL(relPath);
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
      const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
      if (storage) {
        storage.set({ [HEHE_KEY]: true });
      }
    });

    document.body.appendChild(img);
  }


  function checkAndShowHehe() {
    function onFirstInteraction() {
      const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.local;
      if (storage) {
        storage.get([HEHE_KEY], (result) => {
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

  const initModules = () => {
    if (!window.fjTweakerModules) {
      return;
    }
    const { sel, modjs, ratetrack, sccustom, userpop, nextMove, remtz, walcorn } = window.fjTweakerModules;
    if (sel && typeof sel.init === 'function') sel.init();
    if (modjs && typeof modjs.init === 'function') modjs.init();
    if (ratetrack && typeof ratetrack.init === 'function') ratetrack.init();
    if (sccustom && typeof sccustom.init === 'function') sccustom.init();
    if (userpop && typeof userpop.init === 'function') userpop.init();
    if (nextMove && typeof nextMove.init === 'function') nextMove.init();
    if (remtz && typeof remtz.init === 'function') remtz.init();
    if (walcorn && typeof walcorn.init === 'function') walcorn.init();
  };

  const run = () => {
    
    if (!hasRequiredModSoLink()) {
      return; 
    }
    checkAndShowHehe();
    initModules();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
