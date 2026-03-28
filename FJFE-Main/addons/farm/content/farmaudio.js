(() => {
  const MODULE_KEY = 'farmaudio';

  // Resolve extension-relative paths so sounds work in dev and prod
  const resolve = (p) => (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p;

  const DEFAULT_VOLUME = 0.25; 
  const STORAGE_KEY = 'fjFarmMuted';

  // Central registry of effect keys mapped to audio metadata + asset path
  const SOUND_MAP = {
    harvest: 'addons/farm/icons/sounds/harvest.mp3',
    place: 'addons/farm/icons/sounds/place.mp3',
    sell: 'addons/farm/icons/sounds/sell.mp3',
    till: 'addons/farm/icons/sounds/till.mp3',
    dozer: 'addons/farm/icons/sounds/dozer.mp3',
    bowl: 'addons/farm/icons/sounds/bowl.mp3',
    stove: 'addons/farm/icons/sounds/stove.mp3',
    oven: 'addons/farm/icons/sounds/oven.mp3',
    watering: 'addons/farm/icons/sounds/watering.mp3',
    weeding: 'addons/farm/icons/sounds/weeding.mp3',
    expand: 'addons/farm/icons/sounds/expand.mp3',
    deny: 'addons/farm/icons/sounds/deny.mp3',
    menu_open: 'addons/farm/icons/sounds/menu_open.mp3',
    menu_close: 'addons/farm/icons/sounds/menu_close.mp3',
    plant: 'addons/farm/icons/sounds/plant.mp3',
    tile: 'addons/farm/icons/sounds/tile.mp3',
    
    click: 'addons/farm/icons/sounds/tile.mp3',
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
