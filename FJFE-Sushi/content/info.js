(() => {
  /*
   * Shared tooltip/info button helper used throughout the suite.
   * Exposes fjTweakerInfo.createInfoButton/updateTooltip so every
   * module can surface inline help with consistent styling.
   */
  const STYLE_ID = 'fj-info-button-style';
  const DEFAULT_TOOLTIP = 'PLACEHOLDER: default tooltip';

  const resolveIconUrl = () => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
        return chrome.runtime.getURL('icons/fjinfo.png');
      }
    } catch (error) {
    }
    return '';
  };

  const ICON_URL = resolveIconUrl();
  const GAP_PX = 12;
  const VIEWPORT_MARGIN_PX = 6;

  // Inject button + tooltip CSS once per page.
  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .fj-info-button {
        position: relative;
        z-index: 2147483647;
        width: 20px;
        height: 20px;
        padding: 0;
        border: none;
        border-radius: 4px;
        background-color: transparent;
        background-position: center;
        background-repeat: no-repeat;
        background-size: 16px 16px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: #f8f8f8;
        box-shadow: none;
        overflow: visible;
      }

      .fj-info-button:focus {
        outline: 1px solid #9ac7ff;
        outline-offset: 1px;
      }

      .fj-info-tooltip {
        position: fixed;
        display: none;
        max-width: 50ch;
        padding: 6px 8px;
        background: rgba(12, 12, 12, 0.94);
        border: 1px solid #3a3a3a;
        border-radius: 4px;
        color: #f2f2f2;
        font: 500 12px 'Segoe UI', sans-serif;
        line-height: 1.35;
        text-align: left;
        white-space: normal;
        z-index: 2147483647;
        pointer-events: none;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
        visibility: hidden;
      }

      .fj-info-tooltip::before {
        content: '';
        position: absolute;
        top: 50%;
        width: 0;
        height: 0;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
        transform: translateY(-50%);
      }

      .fj-info-tooltip[data-placement="right"]::before {
        left: -6px;
        border-right: 6px solid rgba(12, 12, 12, 0.94);
      }

      .fj-info-tooltip[data-placement="left"]::before {
        right: -6px;
        border-left: 6px solid rgba(12, 12, 12, 0.94);
      }

      .fj-info-tooltip.fj-info-visible {
        display: block;
        visibility: visible;
      }

      .fj-info-popup {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: rgba(0, 0, 0, 0.55);
      }

      .fj-info-popup.fj-info-visible {
        display: flex;
      }

      .fj-info-popup-card {
        width: min(320px, 92vw);
        max-height: 80vh;
        overflow: auto;
        background: #141414;
        border: 1px solid #3a3a3a;
        border-radius: 10px;
        padding: 14px 14px 10px;
        box-shadow: 0 14px 32px rgba(0, 0, 0, 0.6);
      }

      .fj-info-popup-content {
        color: #f2f2f2;
        font: 500 13px 'Segoe UI', sans-serif;
        line-height: 1.4;
        white-space: pre-wrap;
      }

      .fj-info-popup-content img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
      }

      .fj-info-popup-close {
        margin-top: 12px;
        width: 100%;
        padding: 6px 10px;
        border: 1px solid #4a4a4a;
        border-radius: 6px;
        background: #222;
        color: #f2f2f2;
        font: 600 12px 'Segoe UI', sans-serif;
        cursor: pointer;
      }
    `;

    document.head?.append(style);
  };

  // Each button spawns its own popup node for mobile-friendly info.
  const createTooltipElement = () => {
    const tooltip = document.createElement('div');
    tooltip.className = 'fj-info-popup';
    tooltip.innerHTML = `
      <div class="fj-info-popup-card">
        <div class="fj-info-popup-content"></div>
        <button type="button" class="fj-info-popup-close">Close</button>
      </div>
    `;
    document.body.append(tooltip);
    return tooltip;
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  // Keep the tooltip on-screen regardless of viewport/placement.
  const positionTooltip = (button, tooltip) => {
    if (!button || !tooltip) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const placement = button.dataset.placement === 'left' ? 'left' : 'right';
    tooltip.dataset.placement = placement;

    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    const centerY = rect.top + rect.height / 2;
    let left = placement === 'left'
      ? rect.left - GAP_PX - tooltipWidth
      : rect.right + GAP_PX;
    let top = centerY - tooltipHeight / 2;

    const maxLeft = window.innerWidth - tooltipWidth - VIEWPORT_MARGIN_PX;
    const maxTop = window.innerHeight - tooltipHeight - VIEWPORT_MARGIN_PX;

    left = clamp(left, VIEWPORT_MARGIN_PX, Math.max(VIEWPORT_MARGIN_PX, maxLeft));
    top = clamp(top, VIEWPORT_MARGIN_PX, Math.max(VIEWPORT_MARGIN_PX, maxTop));

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  };

  const applyIcon = (button, size) => {
    if (size) {
      const pixelSize = Number.isFinite(size) ? `${size}px` : size;
      button.style.width = pixelSize;
      button.style.height = pixelSize;
    } else {
      button.style.width = '20px';
      button.style.height = '20px';
    }

    if (ICON_URL) {
      button.textContent = '';
      button.style.backgroundImage = `url('${ICON_URL}')`;
      const targetSize = typeof size === 'number' ? Math.max(12, Math.min(size - 4, size)) : 16;
      button.style.backgroundSize = `${targetSize}px ${targetSize}px`;
    } else {
      button.style.backgroundImage = 'none';
      button.textContent = 'i';
      Object.assign(button.style, {
        font: "600 12px 'Segoe UI', sans-serif",
        color: '#f8f8f8',
        background: 'rgba(40, 40, 40, 0.85)',
        borderRadius: '50%'
      });
    }
  };

  const showTooltip = (button) => {
    if (!button) {
      return;
    }

    const text = button.dataset.fjInfoText || DEFAULT_TOOLTIP;
    const imagePath = button.dataset.fjInfoImage;
    const tooltip = button._fjTooltip || (button._fjTooltip = createTooltipElement());
    const content = tooltip.querySelector('.fj-info-popup-content');
    if (content) {
      content.textContent = '';
      const existingImg = content.querySelector('img');
      if (existingImg) {
        existingImg.remove();
      }
      if (imagePath) {
        const img = document.createElement('img');
        img.src = imagePath;
        content.append(img);
      } else {
        content.textContent = text;
      }
    }

    tooltip._fjPopupOwner = button;
    if (!tooltip._fjPopupBound) {
      tooltip._fjPopupBound = true;
      tooltip.addEventListener('click', (event) => {
        const target = event.target;
        if (target === tooltip || target.closest('.fj-info-popup-close')) {
          hideTooltip(tooltip._fjPopupOwner);
        }
      });
    }

    tooltip.classList.add('fj-info-visible');
    button.classList.add('fj-info-open');
  };

  const hideTooltip = (button) => {
    if (!button) {
      return;
    }

    const tooltip = button._fjTooltip;
    if (tooltip) {
      tooltip.classList.remove('fj-info-visible');
      tooltip.style.display = 'none';
    }

    button.classList.remove('fj-info-open');
  };

  // Primary factory used by every other module to spawn its info buttons.
  const createInfoButton = ({ text = DEFAULT_TOOLTIP, size = 20, placement = 'right' } = {}) => {
    ensureStyles();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fj-info-button';
    button.dataset.placement = placement === 'left' ? 'left' : 'right';
    button.dataset.fjInfoText = typeof text === 'string' && text.length > 0 ? text : DEFAULT_TOOLTIP;

    applyIcon(button, size);

    const handleClick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button._fjTooltip && button._fjTooltip.classList.contains('fj-info-visible')) {
        hideTooltip(button);
      } else {
        showTooltip(button);
      }
    };
    button.addEventListener('click', handleClick);

    return button;
  };

  const updateTooltip = (button, text, imagePath) => {
    if (!button) {
      return;
    }

    const nextText = ((typeof text === 'string' && text.length > 0) || imagePath) ? text : DEFAULT_TOOLTIP;
    button.dataset.fjInfoText = nextText;

    if (imagePath) {
      button.dataset.fjInfoImage = imagePath;
    } else {
      delete button.dataset.fjInfoImage;
    }

    const tooltip = button._fjTooltip;
    if (tooltip && tooltip.classList.contains('fj-info-visible')) {
      const content = tooltip.querySelector('.fj-info-popup-content');
      if (content) {
        content.textContent = '';
        const existingImg = content.querySelector('img');
        if (existingImg) {
          existingImg.remove();
        }
        if (imagePath) {
          const img = document.createElement('img');
          img.src = imagePath;
          content.append(img);
        } else {
          content.textContent = nextText;
        }
      }
    }
  };

  const api = window.fjTweakerInfo || {};
  api.createInfoButton = createInfoButton;
  api.updateTooltip = updateTooltip;
  api.ensureInfoStyles = ensureStyles;

  window.fjTweakerInfo = api;
})();
