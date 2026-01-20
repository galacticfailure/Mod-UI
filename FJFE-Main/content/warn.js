(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'warn';
  const OVERLAY_ID = 'fjfe-warning-overlay';
  const BADGE_ID = 'fjfe-warning-badge';
  const AUDIO_ID = 'fjfe-warning-audio';
  const WARNING_AUDIO = 'icons/warning.mp3';
  const WARNING_ICON = 'icons/warning.png';
  const RATE_LOCK_ICON = 'icons/rate_lock.png';
  const RATE_FAILURE_MESSAGE = 'Rate upload failed. Retrying once in 5 seconds...';
  const RATE_LOCK_TOOLTIP = "You've been rate limited!";
  const RATE_FAILURE_PATTERNS = Array.from(new Set([
    'rate upload failed',
    RATE_FAILURE_MESSAGE.toLowerCase()
  ]));
  const RATE_FAILURE_METHODS = ['error', 'warn', 'log', 'info', 'debug'];
  const RATE_LIMIT_EVENT = 'fjfe:rateLimited';
  const RATE_LIMIT_MESSAGE_TYPE = 'fjfe-rate-limit-detected';
  const RATE_LIMIT_BRIDGE_ATTR = 'data-fjfe-rate-limit-hook';
  const RATE_LIMIT_BRIDGE_PATH = 'content/rate-limit-bridge.js';
  const RATE_LIMIT_BRIDGE_DATA_KEY = 'fjfeRateLimitConfig';
  const RATE_LIMIT_EVENT_ORIGIN_PAGE = 'page';
  const RATE_LIMIT_EVENT_ORIGIN_CONTENT = 'content';
  const POLITICS_SELECTOR = '#catControls span[data-id="2"], span.ctButton4[data-id="2"]';
  const SPICY_SELECTOR = '#catControls span[data-id="13"], span.ctButton4[data-id="13"]';
  const META_SELECTOR = '#catControls span[data-id="14"], span.ctButton4[data-id="14"]';
  const PC_LEVEL_2_ID = 'pcLevel2';
  const PC_LEVEL_3_ID = 'pcLevel3';
  const SKIN_LEVEL_3_ID = 'skinLevel3';
  const HEADER_ID = 'topUserbar';
  const OTHER_MEMES_SELECTOR = '#catControls span[data-id="6"], span.ctButton4[data-id="6"]';
  const CATEGORY_SELECTOR = '#catControls span[data-id], span.ctButton4[data-id]';
  const STYLE_ID = 'fjfe-warning-style';
  const BADGE_OFFSET_PX = 12;
  const BADGE_SIZE_PX = 32;
  const ALLOWED_MULTI_CATEGORY_IDS = new Set(['13', '14']);
  const MESSAGE_GAP = '          ';
  const MESSAGE_PARTS = [
    "WARNING: MISRATED CONTENT DETECTED. PLEASE RESOLVE RATE IMMEDIATELY. FAILURE TO DO SO WILL RESULT IN A GENTLE WARNING, SO THIS REALLY ISN'T NECESSARY I GUESS, BUT YOU WANT TO MAKE ADMIN PROUD, DON'T YOU? I MEAN, I KNOW I DO. MAYBE YOU'RE BUILT DIFFERENT. YOU STILL READING THIS? WOW, YOU'VE GOT MORE PATIENCE THAN I THOUGHT. WELL, THIS MESSAGE WILL REPEAT, BUT YOU REALLY BORED ENOUGH TO READ IT ALL AGAIN? OR MAYBE YOU MISSED SOMETHING? DON'T KNOW HOW, THIS THING'S SCROLLING BY KINDA SLOW, BUT MAYBE YOU'RE A SLOW READER. NOT JUDGING, I JUST CALL 'EM LIKE I SEE 'EM.",
    'THIS MESSAGE APPROVED BY SHISUI'
  ];
  const MESSAGE_TEXT = MESSAGE_PARTS.join(MESSAGE_GAP);

  let observer = null;
  let initialized = false;
  let overlayActive = false;
  let overlayElement = null;
  let warningBadge = null;
  let lastBadgeMessage = '';
  let audioContext = null;
  let audioSource = null;
  let audioGain = null;
  let marqueeState = null; 
  let currentConditionState = { politics: false, skin: false, spicyOther: false, multi: false, any: false };
  let rateLockActive = false;
  let rateLockEventDispatched = false;
  let badgeRepositionTimer = null;
  let badgeRepositionAttempts = 0;
  const USER_ACTIVATION_EVENTS = ['pointerdown', 'keydown', 'touchstart'];
  let audioUnlockHandler = null;
  let rateFailureConsolePatched = false;
  let rateLimitMessageListener = null;
  let rateLimitDomListener = null;
  let lastRateLimitSignalId = null;

  // Resolves extension-relative asset paths when running inside Chrome
  const getResourceUrl = (resourcePath) => {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
      return chrome.runtime.getURL(resourcePath);
    }
    return resourcePath;
  };

  
  // Module is disabled on explicit /nsfw/ sections so check first
  const isNsfwPath = () => {
    try {
      const p = (window.location?.pathname || '').toLowerCase();
      
      return p.includes('/nsfw/');
    } catch (_) {
      return false;
    }
  };

  // Handles both new and legacy category buttons when determining selection
  const isElementSelected = (element, selectedClass) => {
    if (!element) {
      return false;
    }
    if (selectedClass) {
      return element.classList.contains(selectedClass);
    }
    return element.classList.contains('selected');
  };

  const isPoliticsSelected = () => {
    const element = document.querySelector(POLITICS_SELECTOR);
    return isElementSelected(element);
  };

  const isPcLevelSelected = (id) => {
    const element = document.getElementById(id);
    if (!element) {
      return false;
    }
    return element.classList.contains('nsfwBg') || element.classList.contains('selected');
  };

  const isPcLevel2Selected = () => isPcLevelSelected(PC_LEVEL_2_ID);

  const isPcLevel3Selected = () => isPcLevelSelected(PC_LEVEL_3_ID);

  const isSkinLevel3Selected = () => {
    const element = document.getElementById(SKIN_LEVEL_3_ID);
    if (!element) {
      return false;
    }
    return element.classList.contains('nsfwBg') || element.classList.contains('selected');
  };

  const isSpicySelected = () => {
    const element = document.querySelector(SPICY_SELECTOR);
    return isElementSelected(element);
  };

  const isMetaSelected = () => {
    const element = document.querySelector(META_SELECTOR);
    return isElementSelected(element);
  };

  const isOtherMemesSelected = () => {
    const element = document.querySelector(OTHER_MEMES_SELECTOR);
    return isElementSelected(element);
  };

  // Collapses all misrate heuristics so overlay/badge logic can react uniformly
  const computeConditionState = () => {
    const politicsWithoutPcLevel = isPoliticsSelected() && !isPcLevel2Selected() && !isPcLevel3Selected();
    const skin3WithoutSpicy = isSkinLevel3Selected() && !isSpicySelected();
    const otherWithSpicyOrMeta = isOtherMemesSelected() && (isSpicySelected() || isMetaSelected());
  const multiViolation = hasMultiCategoryViolation();
    return {
      politics: politicsWithoutPcLevel,
      skin: skin3WithoutSpicy,
      spicyOther: otherWithSpicyOrMeta,
      multi: multiViolation,
      any: politicsWithoutPcLevel || skin3WithoutSpicy || otherWithSpicyOrMeta || multiViolation
    };
  };

  
  // If someone is currently rating we suppress the nag until they are done
  const hasRecentVoteElement = () => {
    return !!document.getElementById('whoIsRating');
  };

  // Searches for the REPOST banner text which still allows warnings during votes
  const hasRepostBanner = () => {
    
    try {
      const spans = document.querySelectorAll('span');
      for (const s of spans) {
        if (typeof s.textContent === 'string' && s.textContent.trim().toUpperCase() === 'REPOST:') {
          return true;
        }
      }
    } catch (_) {}
    return false;
  };

  // Checks active violations plus settings and voting state before screaming
  const canShowOverlayNow = () => {
    const settings = window.fjTweakerSettings || {};
    
    if (isNsfwPath()) return false;
    if (rateLockActive) return false;
    if (!settings.warnOnAll) return false;
    if (!currentConditionState.any) return false;
    if (hasRecentVoteElement() && !hasRepostBanner()) return false;
    return true;
  };

  // Flags category combos outside the spicy/meta whitelist
  const hasMultiCategoryViolation = () => {
    const selected = Array.from(document.querySelectorAll('span.ctButton4.selected[data-id]'))
      .map((element) => element.getAttribute('data-id'))
      .filter((id) => !!id);
    if (selected.length <= 1) {
      return false;
    }
    const disallowedSelections = selected.filter((id) => !ALLOWED_MULTI_CATEGORY_IDS.has(id));
    const uniqueDisallowed = new Set(disallowedSelections);
    return uniqueDisallowed.size > 1;
  };

  // Builds the big yellow marquee overlay that covers the header when active
  const createOverlay = () => {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlayElement = overlay;
      return overlay;
    }

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    Object.assign(overlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '0px',
      height: '0px',
      backgroundColor: '#ffe600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      zIndex: '2147483647',
      pointerEvents: 'none',
      touchAction: 'none',
      overflow: 'hidden',
      color: '#a10000',
      font: "600 16px 'Segoe UI', sans-serif",
      letterSpacing: '0.5px',
      textTransform: 'uppercase'
    });

    // Wrapper keeps the scrolling text clipped within the overlay bounds
    const wrapper = document.createElement('div');
    wrapper.className = 'fjfe-warning-marquee-wrapper';
    Object.assign(wrapper.style, {
      position: 'relative',
      display: 'block',
      width: '100%',
      height: '100%',
      overflow: 'hidden'
    });

    // Double up the text so the marquee can wrap seamlessly
    const scroller = document.createElement('div');
    scroller.className = 'fjfe-warning-text';
    scroller.textContent = MESSAGE_TEXT + MESSAGE_GAP + MESSAGE_TEXT; 
    Object.assign(scroller.style, {
      position: 'absolute',
      whiteSpace: 'nowrap',
      top: '50%',
      transform: 'translateY(-50%)',
      left: '0'
    });

    wrapper.append(scroller);
    overlay.append(wrapper);
    document.body.append(overlay);
    overlayElement = overlay;

    
    marqueeState = {
      el: scroller,
      container: wrapper,
      offset: 0,
      speed: 60, 
      lastTs: 0,
      gapPx: 64
    };
    return overlay;
  };

  // Creates/reuses the floating warning badge next to category controls
  const ensureWarningBadge = () => {
    if (warningBadge) {
      return warningBadge;
    }

    if (window.fjTweakerInfo?.ensureInfoStyles) {
      window.fjTweakerInfo.ensureInfoStyles();
    }

    const badge = window.fjTweakerInfo?.createInfoButton
      ? window.fjTweakerInfo.createInfoButton({ text: '', size: BADGE_SIZE_PX, placement: 'right' })
      : document.createElement('button');

    badge.id = BADGE_ID;
    badge.type = 'button';
    badge.setAttribute('aria-label', 'Warning');
    badge.tabIndex = -1;
    badge.textContent = '';
  
  try { badge.dataset.fjInfoTitle = 'Misrate Warning'; } catch (_) {}
    Object.assign(badge.style, {
      position: 'static',
      width: `${BADGE_SIZE_PX}px`,
      height: `${BADGE_SIZE_PX}px`,
      backgroundImage: `url('${getResourceUrl(WARNING_ICON)}')`,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '4px',
      padding: '0',
      margin: '0 0 0 6px',
      boxShadow: 'none',
      cursor: 'pointer',
      pointerEvents: 'auto',
      display: 'none',
      verticalAlign: 'middle'
    });

    if (!window.fjTweakerInfo?.createInfoButton) {
      badge.addEventListener('mouseenter', (event) => event.stopPropagation());
      badge.addEventListener('click', (event) => event.stopPropagation());
    }

    warningBadge = badge;
    return badge;
  };

  // Synchronizes tooltip/title text with the current violation summary
  const setBadgeTooltip = (badge, text) => {
    if (!badge) {
      return;
    }
    
    const resolved = (typeof text === 'string' && text.trim().length > 0)
      ? text
      : 'No misrate issues detected.';
    if (window.fjTweakerInfo?.updateTooltip) {
      window.fjTweakerInfo.updateTooltip(badge, resolved);
    }
    badge.dataset.fjInfoText = resolved;
    badge.title = resolved;
  };

  const setBadgeIcon = (badge, iconPath) => {
    if (!badge) {
      return;
    }
    const resolved = getResourceUrl(iconPath);
    badge.style.backgroundImage = `url('${resolved}')`;
  };

  // Human-friendly strings describing each violation type
  const getBadgeMessage = (state) => {
    if (!state?.any) {
      return '';
    }
    const messages = [];
    if (state.politics) {
      messages.push('Politics requires PC2 or Glow');
    }
    if (state.skin) {
      messages.push('Skin 3 is always Spicy');
    }
    if (state.spicyOther) {
      messages.push('Other/Memes cannot pair with Spicy or Meta');
    }
    if (state.multi) {
      messages.push('Multi-Category only allowed for Spicy and Meta');
    }
    return messages.join('\n');
  };

  // Attempts to dock the badge right after the currently visible category chip
  const positionWarningBadge = () => {
    if (!warningBadge || warningBadge.style.display === 'none') {
      return;
    }
    
    const isElementVisible = (el) => {
      if (!el || !el.isConnected) return false;
      try {
        const style = window.getComputedStyle(el);
        if (!style || style.display === 'none' || style.visibility === 'hidden') return false;
        const rects = el.getClientRects?.();
        if (rects && rects.length === 0) return false;
      } catch (_) {}
      return true;
    };

    const findVisible = (selector) => {
      const nodes = document.querySelectorAll(selector);
      for (const n of nodes) {
        if (isElementVisible(n)) return n;
      }
      return nodes[0] || null;
    };

    
    let target = findVisible(`${OTHER_MEMES_SELECTOR}, span[data-id="6"]`);
    if (!target) {
      target = findVisible(CATEGORY_SELECTOR);
    }

    
    let container = null;
    if (target && target.parentElement) {
      container = target.parentElement;
    } else {
      const catControls = document.getElementById('catControls') || document.querySelector('#catControls');
      container = isElementVisible(catControls) ? catControls : null;
    }

    if (!target && !container) {
      
      warningBadge.style.display = 'none';
      if (warningBadge.parentNode) {
        try { warningBadge.parentNode.removeChild(warningBadge); } catch (_) {}
      }
      return;
    }

    try {
      if (target && target.parentNode) {
        if (target.nextSibling !== warningBadge) {
          target.parentNode.insertBefore(warningBadge, target.nextSibling);
        }
      } else if (container) {
        if (warningBadge.parentNode !== container) {
          container.appendChild(warningBadge);
        }
      }
    } catch (_) {}

    warningBadge.style.position = 'static';
    warningBadge.style.top = '';
    warningBadge.style.left = '';
    warningBadge.style.display = 'inline-block';
  };

  // DOM thrash is common, so we schedule several reflows to keep placement sane
  const scheduleBadgeReposition = () => {
    if (!warningBadge || warningBadge.style.display === 'none') return;
    if (badgeRepositionTimer) {
      try { clearTimeout(badgeRepositionTimer); } catch (_) {}
      badgeRepositionTimer = null;
    }
    badgeRepositionAttempts = 0;
    const tick = () => {
      positionWarningBadge();
      badgeRepositionAttempts += 1;
      if (badgeRepositionAttempts < 6) {
        badgeRepositionTimer = setTimeout(tick, 100);
      } else {
        badgeRepositionTimer = null;
      }
    };
    
    tick();
  };

  // Enables/disables the badge based on settings + violation state
  const updateWarningBadge = (state) => {
    
    const settings = window.fjTweakerSettings || {};
    if (rateLockActive) {
      const badge = ensureWarningBadge();
      setBadgeIcon(badge, RATE_LOCK_ICON);
      if (lastBadgeMessage !== RATE_LOCK_TOOLTIP) {
        setBadgeTooltip(badge, RATE_LOCK_TOOLTIP);
        lastBadgeMessage = RATE_LOCK_TOOLTIP;
      }
      badge.style.display = 'inline-block';
      positionWarningBadge();
      return;
    }

    const allowBadge = !isNsfwPath() && !!settings.misrateWarning && !!state?.any;
    if (!allowBadge) {
      if (warningBadge) {
        warningBadge.style.display = 'none';
        
        if (warningBadge.parentNode) {
          try { warningBadge.parentNode.removeChild(warningBadge); } catch (_) {}
        }
      }
      lastBadgeMessage = '';
      return;
    }

    const badge = ensureWarningBadge();
    setBadgeIcon(badge, WARNING_ICON);
    const message = getBadgeMessage(state);
    const tooltip = message || '';
    if (tooltip !== lastBadgeMessage) {
      setBadgeTooltip(badge, tooltip);
      lastBadgeMessage = tooltip;
    }
    
    badge.style.display = 'inline-block';
    positionWarningBadge();
  };

  const announceRateLimit = () => {
    if (rateLockEventDispatched) {
      return;
    }
    rateLockEventDispatched = true;
    try {
      window.dispatchEvent(new CustomEvent(RATE_LIMIT_EVENT, {
        detail: { timestamp: Date.now(), origin: RATE_LIMIT_EVENT_ORIGIN_CONTENT }
      }));
    } catch (_) {}
  };

  const handleRateLimitDetected = (sourceLabel) => {
    if (rateLockActive) {
      announceRateLimit();
      return;
    }
    rateLockActive = true;
    announceRateLimit();
    hideWarning();
    updateWarningBadge(currentConditionState);
  };

  const containsRateFailureMessage = (values) => {
    if (!Array.isArray(values) || values.length === 0) {
      return false;
    }
    for (const raw of values) {
      let candidate = raw;
      if (typeof candidate !== 'string') {
        try {
          candidate = String(candidate ?? '');
        } catch (_) {
          continue;
        }
      }
      const lower = candidate.toLowerCase();
      for (const needle of RATE_FAILURE_PATTERNS) {
        if (needle && lower.includes(needle)) {
          return true;
        }
      }
    }
    return false;
  };

  const processExternalRateLimitSignal = (sourceLabel, signalId) => {
    if (signalId && lastRateLimitSignalId === signalId) {
      return;
    }
    if (signalId) {
      lastRateLimitSignalId = signalId;
    }
    handleRateLimitDetected(sourceLabel);
  };

  const handleRateLimitMessageEvent = (event) => {
    if (!event) {
      return;
    }
    const data = event.data;
    if (!data || data.type !== RATE_LIMIT_MESSAGE_TYPE) {
      return;
    }
    processExternalRateLimitSignal('page-message', data.signalId);
  };
  const handleRateLimitDomEvent = (event) => {
    const origin = event?.detail?.origin;
    if (origin !== RATE_LIMIT_EVENT_ORIGIN_PAGE) {
      return;
    }
    processExternalRateLimitSignal('page-dom', event?.detail?.signalId);
  };

  const ensureRateLimitDomEventListener = () => {
    if (rateLimitDomListener) {
      return;
    }
    rateLimitDomListener = (event) => {
      handleRateLimitDomEvent(event);
    };
    try {
      window.addEventListener(RATE_LIMIT_EVENT, rateLimitDomListener, false);
    } catch (_) {}
  };

  const ensureRateLimitMessageListener = () => {
    if (rateLimitMessageListener) {
      return;
    }
    rateLimitMessageListener = (event) => {
      handleRateLimitMessageEvent(event);
    };
    try {
      window.addEventListener('message', rateLimitMessageListener, false);
    } catch (_) {}
  };

  const injectPageRateLimitDetector = () => {
    const doc = document;
    if (!doc || !doc.documentElement) {
      window.addEventListener('DOMContentLoaded', injectPageRateLimitDetector, { once: true });
      return;
    }
    if (doc.documentElement.hasAttribute(RATE_LIMIT_BRIDGE_ATTR)) {
      return;
    }
    doc.documentElement.setAttribute(RATE_LIMIT_BRIDGE_ATTR, '1');
    const script = doc.createElement('script');
    script.type = 'text/javascript';
    script.src = getResourceUrl(RATE_LIMIT_BRIDGE_PATH);
    try {
      const config = {
        patterns: RATE_FAILURE_PATTERNS,
        methods: RATE_FAILURE_METHODS,
        messageType: RATE_LIMIT_MESSAGE_TYPE,
        domEventName: RATE_LIMIT_EVENT,
        domEventOrigin: RATE_LIMIT_EVENT_ORIGIN_PAGE
      };
      const encoded = encodeURIComponent(JSON.stringify(config));
      script.dataset[RATE_LIMIT_BRIDGE_DATA_KEY] = encoded;
    } catch (_) {}
    const target = doc.head || doc.documentElement || doc.body;
    (target || doc.documentElement).appendChild(script);
  };

  const patchConsoleInCurrentContext = () => {
    if (typeof console === 'undefined') {
      return;
    }
    RATE_FAILURE_METHODS.forEach((method) => {
      const original = console[method];
      if (typeof original !== 'function') {
        return;
      }
      if (original.__fjfeRateLimitPatched) {
        return;
      }
      const wrapped = function patchedRateLockConsole(...args) {
        if (containsRateFailureMessage(args)) {
          handleRateLimitDetected('content-console');
        }
        return original.apply(this, args);
      };
      try {
        wrapped.__fjfeRateLimitPatched = true;
        wrapped.__fjfeRateLimitOriginal = original;
      } catch (_) {}
      console[method] = wrapped;
    });
  };

  const attachRateFailureConsoleWatch = () => {
    if (rateFailureConsolePatched) {
      return;
    }
    rateFailureConsolePatched = true;
    patchConsoleInCurrentContext();
    ensureRateLimitMessageListener();
    ensureRateLimitDomEventListener();
    injectPageRateLimitDetector();
  };

  function cleanupAudioUnlock() {
    if (!audioUnlockHandler || !document?.removeEventListener) {
      return;
    }
    USER_ACTIVATION_EVENTS.forEach((evt) => {
      try { document.removeEventListener(evt, audioUnlockHandler, true); } catch (_) {}
    });
    audioUnlockHandler = null;
  }

  function resumeAudioPlayback() {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(handleAudioStartError);
    }
    const audio = document.getElementById(AUDIO_ID);
    if (audio && audio.paused) {
      const attempt = audio.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(handleAudioStartError);
      }
    }
  }

  function scheduleAudioUnlock() {
    if (audioUnlockHandler || !document?.addEventListener) {
      return;
    }
    audioUnlockHandler = () => {
      cleanupAudioUnlock();
      resumeAudioPlayback();
    };
    USER_ACTIVATION_EVENTS.forEach((evt) => {
      try { document.addEventListener(evt, audioUnlockHandler, true); } catch (_) {}
    });
  }

  function handleAudioStartError(error) {
    if (!error) {
      return;
    }
    const message = String(error.message || '').toLowerCase();
    if (error.name === 'NotAllowedError' || message.includes('user gesture') || message.includes('not allowed')) {
      scheduleAudioUnlock();
    }
  }

  // Lazily wires up the looping warning audio via AudioContext when possible
  const ensureAudio = () => {
    let audio = document.getElementById(AUDIO_ID);
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = AUDIO_ID;
      audio.src = getResourceUrl(WARNING_AUDIO);
      audio.loop = true;
      audio.preload = 'auto';
      audio.style.position = 'fixed';
      audio.style.left = '-9999px';
      audio.style.top = '-9999px';
      document.body.append(audio);

      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        try {
          audioContext = new Ctx();
          audioSource = audioContext.createMediaElementSource(audio);
          audioGain = audioContext.createGain();
          audioGain.gain.value = 0.2;
          audioSource.connect(audioGain);
          audioGain.connect(audioContext.destination);
        } catch (_) {
          audioContext = null;
          audioSource = null;
          audioGain = null;
        }
      }
    }
    audio.volume = 0.2;
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(handleAudioStartError);
    } else if (audioContext && audioContext.state === 'closed') {
      audioContext = null;
      audioSource = null;
      audioGain = null;
    }
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch(handleAudioStartError);
    }
    return audio;
  };

  // Injects resilient marquee CSS so site themes cannot break visibility
  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `#${OVERLAY_ID} .fjfe-warning-text { display:inline-block; }`;
    document.head.append(style);
  };

  // Currently we only track the top user bar, but abstraction keeps options open
  const getRelevantElements = () => {
    const header = document.getElementById(HEADER_ID);
    return header ? [header] : [];
  };

  // Recomputes overlay bounds to hug the header regardless of scroll position
  const updateOverlayPosition = () => {
    if (!overlayActive || !overlayElement) {
      return;
    }
    const elements = getRelevantElements();
    if (elements.length === 0) {
      hideWarning();
      return;
    }

    let top = Infinity;
    let left = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (!rect || Number.isNaN(rect.top)) {
        return;
      }
      top = Math.min(top, rect.top);
      left = Math.min(left, rect.left);
      right = Math.max(right, rect.right);
      bottom = Math.max(bottom, rect.bottom);
    });

    if (!Number.isFinite(top) || !Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(bottom)) {
      return;
    }

    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);
    const anchor = elements[0];
    const computedPosition = anchor ? window.getComputedStyle(anchor).position : '';
    const isFixed = computedPosition === 'fixed' || computedPosition === 'sticky';
    overlayElement.style.position = isFixed ? 'fixed' : 'absolute';

    const scrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const offsetX = isFixed ? 0 : scrollX;
    const offsetY = isFixed ? 0 : scrollY;

    overlayElement.style.top = `${top + offsetY}px`;
    overlayElement.style.left = `${left + offsetX}px`;
    overlayElement.style.width = `${width}px`;
    overlayElement.style.height = `${height}px`;
  };

  // Kicks off overlay/audio/marquee when a violation is active
  const showWarning = () => {
    if (overlayActive) {
      updateOverlayPosition();
      return;
    }
    if (!document.body) {
      return;
    }
    
    if (!canShowOverlayNow()) {
      return;
    }
    ensureStyles();
    createOverlay();
    ensureAudio();
    overlayActive = true;
    updateOverlayPosition();
    
    if (marqueeState) {
      marqueeState.offset = 0;
      marqueeState.lastTs = 0;
      requestAnimationFrame(tickMarquee);
    }
  };

  // Tears down overlay/audio/marquee to avoid leaks when violations clear
  const hideWarning = () => {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.remove();
    }
    const audio = document.getElementById(AUDIO_ID);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.remove();
    }
    if (audioSource && audioSource.mediaElement) {
      try {
        audioSource.disconnect();
      } catch (_) {}
    }
    if (audioGain) {
      try {
        audioGain.disconnect();
      } catch (_) {}
    }
    if (audioContext) {
      audioContext.close().catch(() => {});
    }
    audioContext = null;
    audioSource = null;
    audioGain = null;
    overlayElement = null;
    overlayActive = false;
    marqueeState = null;
    cleanupAudioUnlock();
    
    
  };

  // Central control loop: calculate violations, toggle overlay, refresh badge
  const evaluateState = () => {
    
    if (isNsfwPath()) {
      hideWarning();
      updateWarningBadge({ any: false });
      return;
    }
    currentConditionState = computeConditionState();
    const allowOverlay = canShowOverlayNow();
    if (allowOverlay) showWarning(); else hideWarning();
    if (overlayActive) {
      updateOverlayPosition();
    }
    updateWarningBadge(currentConditionState);
  };

  // Scopes MutationObserver work to only the DOM nodes we care about
  const matchesRelevantElement = (element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    if (element.id === HEADER_ID) {
      return true;
    }
    if (element.id === PC_LEVEL_2_ID || element.id === PC_LEVEL_3_ID || element.id === SKIN_LEVEL_3_ID) {
      return true;
    }
    if (element.matches?.(POLITICS_SELECTOR)) {
      return true;
    }
    if (element.matches?.(SPICY_SELECTOR)) {
      return true;
    }
    if (element.matches?.(META_SELECTOR)) {
      return true;
    }
    if (element.matches?.(CATEGORY_SELECTOR)) {
      return true;
    }
    return false;
  };

  // Mutation helper that spots voting widgets and REPOST labels
  const matchesVoteOrRepost = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.id === 'whoIsRating') return true;
    if (element.querySelector?.('#whoIsRating')) return true;
    const spans = element.matches?.('span') ? [element] : (element.querySelectorAll?.('span') || []);
    for (const s of spans) {
      if (typeof s.textContent === 'string' && s.textContent.trim().toUpperCase() === 'REPOST:') return true;
    }
    return false;
  };

  // MutationObserver callback: single detection triggers full evaluation
  const handleMutations = (mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && matchesRelevantElement(mutation.target)) {
        
        evaluateState();
        positionWarningBadge();
        scheduleBadgeReposition();
        return;
      }
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement && (matchesRelevantElement(node) || matchesVoteOrRepost(node) || node.querySelector?.(POLITICS_SELECTOR) || node.querySelector?.(SPICY_SELECTOR) || node.querySelector?.(META_SELECTOR) || node.querySelector?.(CATEGORY_SELECTOR) || node.querySelector?.(`#${PC_LEVEL_2_ID}`) || node.querySelector?.(`#${PC_LEVEL_3_ID}`) || node.querySelector?.(`#${SKIN_LEVEL_3_ID}`) || node.querySelector?.(`#${HEADER_ID}`))) {
            evaluateState();
            positionWarningBadge();
            scheduleBadgeReposition();
            return;
          }
        }
        for (const node of mutation.removedNodes) {
          if (node instanceof HTMLElement && (matchesRelevantElement(node) || matchesVoteOrRepost(node) || node.querySelector?.(POLITICS_SELECTOR) || node.querySelector?.(SPICY_SELECTOR) || node.querySelector?.(META_SELECTOR) || node.querySelector?.(CATEGORY_SELECTOR) || node.querySelector?.(`#${PC_LEVEL_2_ID}`) || node.querySelector?.(`#${PC_LEVEL_3_ID}`) || node.querySelector?.(`#${SKIN_LEVEL_3_ID}`) || node.querySelector?.(`#${HEADER_ID}`))) {
            evaluateState();
            positionWarningBadge();
            scheduleBadgeReposition();
            return;
          }
        }
      }
    }
  };

  // Arms the observer so SPA updates still trigger warnings
  const startObserver = () => {
    if (observer || !document.body) {
      return;
    }
    observer = new MutationObserver(handleMutations);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true
    });
  };

  // Cleanly disconnects observer hooks during teardown
  const stopObserver = () => {
    if (!observer) {
      return;
    }
    observer.disconnect();
    observer = null;
  };

  // Delays evaluation slightly so category DOM has time to update post-click
  const handleClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (
      matchesRelevantElement(target) ||
      target.closest?.(POLITICS_SELECTOR) ||
      target.closest?.(SPICY_SELECTOR) ||
      target.closest?.(META_SELECTOR) ||
      target.closest?.(CATEGORY_SELECTOR) ||
      target.closest?.(`#${PC_LEVEL_2_ID}`) ||
      target.closest?.(`#${PC_LEVEL_3_ID}`) ||
      target.closest?.(`#${SKIN_LEVEL_3_ID}`)
    ) {
      setTimeout(() => {
        evaluateState();
        positionWarningBadge();
        scheduleBadgeReposition();
      }, 50);
    }
  };

  // Scroll/resize can move the header, so recompute overlay + badge anchors
  const handleViewportChange = () => {
    if (overlayActive) {
      updateOverlayPosition();
    }
    positionWarningBadge();
  };

  
  // Simple requestAnimationFrame loop for the marquee text
  const tickMarquee = (ts) => {
    if (!marqueeState || !overlayActive || !overlayElement) {
      return;
    }
    if (!marqueeState.lastTs) marqueeState.lastTs = ts;
    const dt = (ts - marqueeState.lastTs) / 1000;
    marqueeState.lastTs = ts;
    const el = marqueeState.el;
    const container = marqueeState.container;
    if (!el || !container) return;
    
    const textWidth = el.scrollWidth;
    const viewWidth = container.clientWidth;
    if (!textWidth || !viewWidth) return;
    marqueeState.offset -= marqueeState.speed * dt;
    
    const resetAfter = textWidth / 2 + marqueeState.gapPx; 
    if (marqueeState.offset <= -resetAfter) {
      marqueeState.offset += resetAfter;
    }
    el.style.left = `${Math.floor(marqueeState.offset + viewWidth)}px`;
    requestAnimationFrame(tickMarquee);
  };

  // Bootstraps the module once per page load on the main funnyjunk domain
  const init = () => {
    if (initialized) {
      return;
    }
    if (window.location.hostname !== targetHost) {
      return;
    }
    
    if (isNsfwPath()) {
      return;
    }
    initialized = true;
    evaluateState();
    attachRateFailureConsoleWatch();
    startObserver();
    document.addEventListener('click', handleClick, true);
    document.addEventListener('fjTweakerSettingsChanged', () => {
      evaluateState();
    });
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('beforeunload', () => {
      hideWarning();
      stopObserver();
      rateLockEventDispatched = false;
      lastRateLimitSignalId = null;
      if (warningBadge) {
        warningBadge.remove();
        warningBadge = null;
        lastBadgeMessage = '';
      }
      if (rateLimitMessageListener) {
        try { window.removeEventListener('message', rateLimitMessageListener, false); } catch (_) {}
        rateLimitMessageListener = null;
      }
      if (rateLimitDomListener) {
        try { window.removeEventListener(RATE_LIMIT_EVENT, rateLimitDomListener, false); } catch (_) {}
        rateLimitDomListener = null;
      }
      if (badgeRepositionTimer) {
        try { clearTimeout(badgeRepositionTimer); } catch (_) {}
        badgeRepositionTimer = null;
      }
      cleanupAudioUnlock();
    });
  };

  if (!window.fjTweakerModules) {
    window.fjTweakerModules = {};
  }

  window.fjTweakerModules[MODULE_KEY] = { init };
})();
