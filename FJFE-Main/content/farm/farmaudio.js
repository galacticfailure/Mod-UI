(() => {
  const MODULE_KEY = 'farmaudio';

  // Resolve extension-relative paths so sounds work in dev and prod
  const resolve = (p) => (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p;

  const DEFAULT_VOLUME = 0.25; 
  const STORAGE_KEY = 'fjFarmMuted';

  // Central registry of effect keys mapped to audio metadata + asset path
  const SOUND_MAP = {
    harvest: 'icons/farm/sounds/harvest.mp3',
    place: 'icons/farm/sounds/place.mp3',
    sell: 'icons/farm/sounds/sell.mp3',
    till: 'icons/farm/sounds/till.mp3',
    dozer: 'icons/farm/sounds/dozer.mp3',
    bowl: 'icons/farm/sounds/bowl.mp3',
    stove: 'icons/farm/sounds/stove.mp3',
    oven: 'icons/farm/sounds/oven.mp3',
    watering: 'icons/farm/sounds/watering.mp3',
    weeding: 'icons/farm/sounds/weeding.mp3',
    expand: 'icons/farm/sounds/expand.mp3',
    deny: 'icons/farm/sounds/deny.mp3',
    menu_open: 'icons/farm/sounds/menu_open.mp3',
    menu_close: 'icons/farm/sounds/menu_close.mp3',
    plant: 'icons/farm/sounds/plant.mp3',
    tile: 'icons/farm/sounds/tile.mp3',
    
    click: 'icons/farm/sounds/tile.mp3',
  };

  
  const VOLUME_MAP = {
    click: 0.35, 
  };

  // Module-level mute cache so repeated toggles skip IO
  let isMuted = false;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v != null) isMuted = v === '1';
  } catch (_) {}

  // Lightweight wrapper around HTMLAudioElement with per-sound gain tweaks
  const play = (key) => {
    try {
      if (isMuted) return;
      const rel = SOUND_MAP[key] || SOUND_MAP.click;
      if (!rel) return;
      const src = resolve(rel);
  const a = new Audio(src);
  a.volume = (VOLUME_MAP[key] != null ? VOLUME_MAP[key] : DEFAULT_VOLUME);
      a.play().catch(() => {});
    } catch (_) {}
  };

  // Persist mute flag so panel + audio hooks stay in sync
  const setMuted = (muted) => {
    try { isMuted = !!muted; localStorage.setItem(STORAGE_KEY, isMuted ? '1' : '0'); } catch (_) {}
  };

  const getMuted = () => !!isMuted;

  
  window.fjTweakerModules = window.fjTweakerModules || {};
  window.fjTweakerModules[MODULE_KEY] = { play, setMuted, getMuted };

  window.fjFarm = window.fjFarm || {};
  window.fjFarm.audio = { play, setMuted, isMuted: getMuted };
})();
