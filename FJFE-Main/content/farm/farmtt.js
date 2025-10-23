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
      if (!current) { current = word; continue; }
      const candidate = current + ' ' + word;
      if (candidate.length <= limit) {
        current = candidate;
      } else {
        lines.push(current);
        if (word.length > limit) { lines.push(word); current = ''; }
        else { current = word; }
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
      
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: '220px',
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
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
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
      color: '#f3d266',
      marginLeft: '8px',
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '4px',
    });
    const costIcon = document.createElement('img');
    costIcon.setAttribute('data-role', 'costIcon');
    Object.assign(costIcon.style, { width: '12px', height: '12px', marginTop: '2px', filter: 'drop-shadow(0 0 1px #0008)'});
    const costText = document.createElement('span');
    costText.setAttribute('data-role', 'costText');
    cost.appendChild(costIcon);
    cost.appendChild(costText);

    header.appendChild(left);
    header.appendChild(cost);

    const body = document.createElement('div');
    body.setAttribute('data-role', 'body');
    Object.assign(body.style, { display: 'flex', flexDirection: 'column', gap: '6px' });

    const lineTop = document.createElement('div');
    lineTop.setAttribute('data-role', 'bodyTop');
    Object.assign(lineTop.style, { fontWeight: '700', fontSize: '13px', color: '#fff', lineHeight: '1.3', whiteSpace: 'pre-line' });
    const lineMid = document.createElement('div');
    lineMid.setAttribute('data-role', 'bodyMid');
    Object.assign(lineMid.style, { fontWeight: '700', fontSize: '13px', color: '#fff', lineHeight: '1.3', whiteSpace: 'pre-line' });
    const lineTT = document.createElement('div');
    lineTT.setAttribute('data-role', 'bodyTT');
    Object.assign(lineTT.style, { fontWeight: '500', fontSize: '12px', color: '#ddd', lineHeight: '1.3', whiteSpace: 'pre-line', fontStyle: 'italic' });

    const desc = document.createElement('div');
    desc.setAttribute('data-role', 'desc');
    Object.assign(desc.style, { fontWeight: '500', fontSize: '12px', color: '#ddd', lineHeight: '1.3', whiteSpace: 'pre-line', fontStyle: 'italic', display: 'none' });

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
  const menuWidth = Math.max(0, rect.right - rect.left);
    
  const tipWidth = Math.round(Math.max(220, Math.min(480, menuWidth * 0.65)));
    const gap = 6;

    tip.style.width = tipWidth + 'px';
    const tipHeight = tip.offsetHeight || 0;
    
  
  tip.style.top = (rect.top - gap - tipHeight) + 'px';
  tip.style.left = (rect.left) + 'px';
  }

  function setContent(data) {
    const tip = ensureEl();
    const img = tip.querySelector('[data-role="img"]');
    const name = tip.querySelector('[data-role="name"]');
    const costTextEl = tip.querySelector('[data-role="costText"]');
    const costIconEl = tip.querySelector('[data-role="costIcon"]');
    const costContainer = tip.querySelector('[data-role="cost"]');
    const desc = tip.querySelector('[data-role="desc"]');
    const lineTop = tip.querySelector('[data-role="bodyTop"]');
    const lineMid = tip.querySelector('[data-role="bodyMid"]');
    const lineTT = tip.querySelector('[data-role="bodyTT"]');

    const imageSrc = data && data.imageSrc ? data.imageSrc : '';
    const nameText = (data && data.name) ? String(data.name) : '???';
    const costText = (data && data.cost) ? String(data.cost) : '';
  const costIcon = (data && data.costIcon) ? String(data.costIcon) : '';
    const descText = (data && data.description) ? String(data.description) : '';
  const wrappedDesc = descText ? (wrapTooltipText(descText, 60) || descText) : '';
    const topText = (data && data.bodyTop) ? String(data.bodyTop) : '';
    const midText = (data && data.bodyMid) ? String(data.bodyMid) : '';
    const ttText = (data && data.bodyTT) ? String(data.bodyTT) : '';
    const hideCost = Boolean(data && data.hideCost) || (!costText && !costIcon);

    if (img) {
      try {
        const url = imageSrc || 'about:blank';
        img.src = url;
        img.onerror = () => {
          const fallback = (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL('icons/error.png') : 'icons/error.png';
          img.src = fallback;
        };
      } catch (_) {}
    }
    if (name) name.textContent = nameText;

    if (costContainer) costContainer.style.display = hideCost ? 'none' : 'flex';
    if (!hideCost) {
      if (costTextEl) costTextEl.textContent = costText || '';
      if (costIconEl) {
        let iconPath = costIcon;
        if (!iconPath && costText) {
          iconPath = 'icons/farm/coin.png';
        }
        if (iconPath) {
          try {
            const resolved = (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(iconPath) : iconPath;
            costIconEl.src = resolved;
          } catch (_) { costIconEl.src = ''; }
        } else {
          costIconEl.src = '';
        }
      }
    } else {
      if (costTextEl) costTextEl.textContent = '';
      if (costIconEl) costIconEl.src = '';
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

  window.fjfeFarmTT = { init, show, hide, updatePosition };
  
})();