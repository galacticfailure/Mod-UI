(function() {
  
  const state = {
    anchorMenuEl: null,
    tipEl: null,
    data: null,
  };

  function wrapTooltipText(text, maxWidth) {
    if (!text) return '';
    const words = String(text).trim().split(/\s+/);
    if (!words.length) return '';
    const limit = Math.max(1, maxWidth | 0 || 50);
    const lines = [];
    let current = '';
    for (const word of words) {
      if (!word) continue;
      if (!current) {
        current = word;
        continue;
      }
      const candidate = current + ' ' + word;
      if (candidate.length <= limit) {
        current = candidate;
      } else {
        lines.push(current);
        if (word.length > limit) {
          lines.push(word);
          current = '';
        } else {
          current = word;
        }
      }
    }
    if (current) lines.push(current);
    return lines.join('\n');
  }

  function init(opts) {
    state.anchorMenuEl = opts && opts.anchorMenuEl ? opts.anchorMenuEl : null;
  }

  function hide() {
    try {
      if (state.tipEl && state.tipEl.parentNode) {
        state.tipEl.parentNode.removeChild(state.tipEl);
      }
    } catch (_) {}
    state.tipEl = null;
    state.data = null;
  }

  function ensureEl() {
    if (state.tipEl) return state.tipEl;
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: '200px',
      background: '#151515',
      color: '#fff',
      border: '1px solid #333',
      borderRadius: '6px',
      boxShadow: '0 8px 24px #0009',
      zIndex: 2147483643,
      pointerEvents: 'none',
      padding: '8px',
      boxSizing: 'border-box',
      display: 'block',
      height: 'auto',
    });

    const header = document.createElement('div');
    header.setAttribute('data-role', 'header');
    Object.assign(header.style, {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '8px',
      marginBottom: '6px',
    });

    const left = document.createElement('div');
    Object.assign(left.style, {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      minWidth: 0,
      flex: '1 1 auto',
    });

    const imgWrap = document.createElement('div');
    Object.assign(imgWrap.style, {
      width: '36px',
      height: '36px',
      flex: '0 0 36px',
      background: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    });
    const img = document.createElement('img');
    img.setAttribute('data-role', 'img');
    Object.assign(img.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    });
    imgWrap.appendChild(img);

    const name = document.createElement('div');
    name.setAttribute('data-role', 'name');
    Object.assign(name.style, {
      fontWeight: '800',
      fontSize: '14px',
      whiteSpace: 'normal',
      overflow: 'visible',
      textOverflow: 'clip',
      wordBreak: 'break-word',
      color: '#fff',
      maxWidth: '100%',
    });
    left.appendChild(imgWrap);
    left.appendChild(name);

    const cost = document.createElement('div');
    cost.setAttribute('data-role', 'cost');
    Object.assign(cost.style, {
      fontWeight: '800',
      fontSize: '13px',
      color: '#e33',
      marginLeft: '8px',
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0px',
    });

    const costIcon = document.createElement('img');
    costIcon.setAttribute('data-role', 'costIcon');
    Object.assign(costIcon.style, {
      width: '12px',
      height: '12px',
      marginTop: '2px',
      filter: 'drop-shadow(0 0 1px #0008)',
    });
    cost.appendChild(costIcon);
    const costText = document.createElement('span');
    costText.setAttribute('data-role', 'costText');
    cost.appendChild(costText);

    header.appendChild(left);
    header.appendChild(cost);

    
    const body = document.createElement('div');
    body.setAttribute('data-role', 'body');
    Object.assign(body.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    });

    const lineTop = document.createElement('div');
    lineTop.setAttribute('data-role', 'bodyTop');
    Object.assign(lineTop.style, {
      fontWeight: '700',
      fontSize: '13px', 
      color: '#fff',
      lineHeight: '1.3',
      whiteSpace: 'pre-line',
      fontStyle: 'normal',
    });

    const lineMid = document.createElement('div');
    lineMid.setAttribute('data-role', 'bodyMid');
    Object.assign(lineMid.style, {
      fontWeight: '700',
      fontSize: '13px', 
      color: '#fff',
      lineHeight: '1.3',
      whiteSpace: 'pre-line',
      fontStyle: 'normal',
    });

    const lineTT = document.createElement('div');
    lineTT.setAttribute('data-role', 'bodyTT');
    Object.assign(lineTT.style, {
      fontWeight: '500',
      fontSize: '12px', 
      color: '#ddd',
      lineHeight: '1.3',
      whiteSpace: 'pre-line',
      fontStyle: 'italic',
    });

    
    const desc = document.createElement('div');
    desc.setAttribute('data-role', 'desc');
    Object.assign(desc.style, {
      fontWeight: '500',
      fontSize: '12px',
      color: '#ddd',
      lineHeight: '1.3',
      whiteSpace: 'pre-line',
      fontStyle: 'italic',
      display: 'none',
    });

    body.appendChild(lineTop);
    body.appendChild(lineMid);
    body.appendChild(lineTT);

    el.appendChild(header);
    el.appendChild(body);
    el.appendChild(desc);
    document.body.appendChild(el);

    state.tipEl = el;
    return el;
  }

  function positionTip() {
    const tip = state.tipEl;
    const menu = state.anchorMenuEl;
    if (!tip || !menu) return;

    const rect = menu.getBoundingClientRect();
    const vx = (window.scrollX || window.pageXOffset || 0);
    const vy = (window.scrollY || window.pageYOffset || 0);
  const menuWidth = rect.right - rect.left;
  const tipWidth = Math.round(menuWidth * 1.5);
    const menuCenterX = rect.left + menuWidth / 2;
    const viewportCenterX = (window.innerWidth || document.documentElement.clientWidth || 0) / 2;
    const placeRight = (menuCenterX < viewportCenterX);
  const gap = 0;

    tip.style.width = tipWidth + 'px';
    tip.style.top = (rect.top + vy) + 'px';
    if (placeRight) {
      tip.style.left = (rect.right + vx + gap) + 'px';
    } else {
      tip.style.left = (rect.left + vx - gap - tipWidth) + 'px';
    }
  }

  function setContent(data) {
    const tip = ensureEl();
  const img = tip.querySelector('[data-role="img"]');
  const name = tip.querySelector('[data-role="name"]');
  const cost = tip.querySelector('[data-role="costText"]');
  const costIcon = tip.querySelector('[data-role="costIcon"]');
    const costContainer = tip.querySelector('[data-role="cost"]');
    const desc = tip.querySelector('[data-role="desc"]');
    const lineTop = tip.querySelector('[data-role="bodyTop"]');
    const lineMid = tip.querySelector('[data-role="bodyMid"]');
    const lineTT = tip.querySelector('[data-role="bodyTT"]');

    const imageSrc = data && data.imageSrc ? data.imageSrc : '';
    const nameText = (data && data.name) ? String(data.name) : '???';
  const costTextVal = (data && data.cost) ? String(data.cost) : '???';
  const descText = (data && data.description) ? String(data.description) : '';
  const wrappedDesc = descText ? (wrapTooltipText(descText, 50) || descText) : '';
  const topText = (data && data.bodyTop) ? String(data.bodyTop) : '';
  const midText = (data && data.bodyMid) ? String(data.bodyMid) : '';
  const ttText = (data && data.bodyTT) ? String(data.bodyTT) : '';

    if (img) {
      img.src = imageSrc || 'about:blank';
      img.onerror = () => {
        const fallback = chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('icons/error.png') : 'icons/error.png';
        img.src = fallback;
      };
    }
  if (name) name.textContent = nameText;
    const hideCost = Boolean(data && data.hideCost);
    if (costContainer) costContainer.style.display = hideCost ? 'none' : 'flex';
    if (!hideCost) {
      if (cost) {
        cost.textContent = costTextVal;
        if (data && data.costColor) cost.style.color = String(data.costColor);
        else cost.style.color = '';
      }
      if (costIcon) {
        try {
          const hideIcon = Boolean(data && data.hideCostIcon);
          costIcon.style.display = hideIcon ? 'none' : 'inline-block';
          const iconPath = (data && data.costIcon) ? String(data.costIcon) : 'addons/clicker/icons/thumb_down.png';
          const src = chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL(iconPath) : iconPath;
          costIcon.src = src;
        } catch (_) {}
      }
    } else {
      if (cost) cost.textContent = '';
      if (costIcon) { costIcon.src = ''; costIcon.style.display = 'none'; }
    }
    
    if (topText || midText || ttText) {
      if (lineTop) { lineTop.textContent = topText; lineTop.style.display = topText ? 'block' : 'none'; }
      if (lineMid) { lineMid.textContent = midText; lineMid.style.display = midText ? 'block' : 'none'; }
      if (lineTT) { lineTT.textContent = ttText; lineTT.style.display = ttText ? 'block' : 'none'; }
      if (desc) desc.style.display = 'none';
    } else {
      if (desc) { desc.textContent = wrappedDesc || '???'; desc.style.display = 'block'; }
      if (lineTop) lineTop.style.display = 'none';
      if (lineMid) lineMid.style.display = 'none';
      if (lineTT) lineTT.style.display = 'none';
    }
    if (state.tipEl) {
      state.tipEl.style.height = 'auto';
      state.tipEl.style.maxHeight = 'none';
    }
  }

  function show(data) {
    state.data = data || null;
    ensureEl();
    setContent(state.data || {});
    positionTip();
  }

  function updatePosition() {
    if (!state.tipEl) return;
    positionTip();
  }

  window.fjfeRcInfo = { init, show, hide, updatePosition };

  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition);
})();
